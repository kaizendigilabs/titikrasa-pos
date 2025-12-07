-- 1. Trigger to keep store_ingredients.current_stock in sync with stock_ledger
create or replace function public.sync_ingredient_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.store_ingredients
  set current_stock = current_stock + NEW.delta_qty
  where id = NEW.ingredient_id;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_ingredient_stock on public.stock_ledger;
create trigger trg_sync_ingredient_stock
after insert on public.stock_ledger
for each row
execute function public.sync_ingredient_stock();


-- 2. Trigger to deduct inventory when order_items are inserted (Sale)
create or replace function public.deduct_inventory_on_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_menu_id uuid := NEW.menu_id;
  v_qty int := NEW.qty;
  v_variant text := NEW.variant; -- "size|temp"
  v_size text;
  v_temp text;
  v_recipe_items jsonb;
  rec jsonb;
  v_ing_id uuid;
  v_ing_qty int;
  v_ing_uom text;
begin
  -- Parse variant if exists
  if v_variant is not null and v_variant <> '' then
    v_size := split_part(v_variant, '|', 1);
    v_temp := split_part(v_variant, '|', 2);
  end if;

  -- Try to find override recipe first
  if v_size is not null then
    select items into v_recipe_items
    from public.recipe_variant_overrides
    where menu_id = v_menu_id
      and size = v_size
      and temperature = v_temp
    order by version desc
    limit 1;
  end if;

  -- If no override, fallback to base recipe
  if v_recipe_items is null then
    select items into v_recipe_items
    from public.recipes
    where menu_id = v_menu_id
    order by version desc
    limit 1;
  end if;

  -- If still null, no recipe exists for this menu -> skip
  if v_recipe_items is null then
    return NEW;
  end if;

  -- Iterate through recipe items and deduct stock
  -- Recipe item structure: { "ingredient_id": "uuid", "qty": 123, "uom": "gr" }
  for rec in select * from jsonb_array_elements(v_recipe_items) loop
    v_ing_id := (rec->>'ingredient_id')::uuid;
    v_ing_qty := (rec->>'qty')::int;
    v_ing_uom := rec->>'uom';

    if v_ing_id is not null and v_ing_qty > 0 then
      -- Insert into stock_ledger (negative delta for sale)
      -- This will trigger sync_ingredient_stock to update current_stock
      insert into public.stock_ledger (
        ingredient_id,
        delta_qty,
        uom,
        reason,
        ref_type,
        ref_id,
        at
      ) values (
        v_ing_id,
        0 - (v_ing_qty * v_qty), -- Negative deduction
        coalesce(v_ing_uom, 'pcs')::base_uom, -- Cast to enum
        'sale',
        'order_items',
        NEW.id,
        now()
      );
    end if;
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_deduct_inventory_on_sale on public.order_items;
create trigger trg_deduct_inventory_on_sale
after insert on public.order_items
for each row
execute function public.deduct_inventory_on_sale();
