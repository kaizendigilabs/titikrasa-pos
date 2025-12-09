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


-- 3. Trigger to add inventory when purchase_order status changes to 'complete'
-- Function untuk handle inventory update (shared by INSERT and UPDATE triggers)
create or replace function public.apply_po_completion_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb;
  v_uom base_uom;
  v_ingredient_id uuid;
  v_qty int;
  v_price int;
  v_catalog_id uuid;
  v_current_stock int;
  v_current_avg int;
  v_new_avg int;
begin
  -- Log untuk debugging
  raise notice 'PO Completion Trigger: PO ID %, Items count: %', NEW.id, jsonb_array_length(NEW.items);
  
  -- Iterasi items dan tulis ke stock_ledger
  for rec in select jsonb_array_elements(NEW.items) loop
    v_ingredient_id := (rec->>'store_ingredient_id')::uuid;
    v_qty := (rec->>'qty')::int;
    v_price := (rec->>'price')::int;
    v_catalog_id := (rec->>'catalog_item_id')::uuid;
    
    raise notice 'Processing item: ingredient_id=%, qty=%, price=%', v_ingredient_id, v_qty, v_price;
    
    -- Skip jika tidak ada ingredient_id atau qty <= 0
    if v_ingredient_id is null or v_qty <= 0 then
      raise notice 'Skipping item: ingredient_id is null or qty <= 0';
      continue;
    end if;
    
    -- Ambil base_uom dan current stock dari ingredient
    select si.base_uom, si.current_stock, si.avg_cost 
    into v_uom, v_current_stock, v_current_avg
    from public.store_ingredients si 
    where si.id = v_ingredient_id;
    
    raise notice 'Ingredient found: uom=%, current_stock=%, avg_cost=%', v_uom, v_current_stock, v_current_avg;
    
    -- Insert ke stock_ledger (positive delta untuk purchase)
    -- Trigger sync_ingredient_stock akan otomatis update current_stock
    insert into public.stock_ledger
      (ingredient_id, delta_qty, uom, reason, ref_type, ref_id, at)
    values
      (v_ingredient_id,
       v_qty,
       coalesce(v_uom, 'pcs'::base_uom),
       'po',
       'purchase_orders',
       NEW.id,
       now());
       
    raise notice 'Stock ledger entry created';
       
    -- Update avg_cost di store_ingredients (weighted average)
    v_new_avg := case 
      when v_current_stock + v_qty = 0 then v_current_avg
      else round(
        (v_current_stock * v_current_avg + v_qty * v_price) / 
        (v_current_stock + v_qty)
      )
    end;
    
    update public.store_ingredients
    set avg_cost = v_new_avg
    where id = v_ingredient_id;
    
    raise notice 'Avg cost updated to %', v_new_avg;
    
    -- Update ingredient_supplier_links (last purchase info)
    if v_catalog_id is not null then
      update public.ingredient_supplier_links
      set 
        last_purchase_price = v_price,
        last_purchased_at = now()
      where store_ingredient_id = v_ingredient_id
        and catalog_item_id = v_catalog_id;
      raise notice 'Supplier link updated';
    end if;
  end loop;
  
  raise notice 'PO Completion Trigger: Finished processing PO %', NEW.id;
  
  return NEW;
end;
$$;

-- Function untuk REVERSAL - membalikkan stok ketika status berubah dari complete ke draft/pending
create or replace function public.reverse_po_completion_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb;
  v_uom base_uom;
  v_ingredient_id uuid;
  v_qty int;
  v_catalog_id uuid;
begin
  -- Log untuk debugging
  raise notice 'PO Reversal Trigger: PO ID %, Items count: %', NEW.id, jsonb_array_length(NEW.items);
  
  -- Iterasi items dan tulis ke stock_ledger dengan delta NEGATIF (reversal)
  for rec in select jsonb_array_elements(NEW.items) loop
    v_ingredient_id := (rec->>'store_ingredient_id')::uuid;
    v_qty := (rec->>'qty')::int;
    v_catalog_id := (rec->>'catalog_item_id')::uuid;
    
    raise notice 'Reversing item: ingredient_id=%, qty=%', v_ingredient_id, v_qty;
    
    -- Skip jika tidak ada ingredient_id atau qty <= 0
    if v_ingredient_id is null or v_qty <= 0 then
      raise notice 'Skipping reversal: ingredient_id is null or qty <= 0';
      continue;
    end if;
    
    -- Ambil base_uom dari ingredient
    select si.base_uom 
    into v_uom
    from public.store_ingredients si 
    where si.id = v_ingredient_id;
    
    -- Insert ke stock_ledger dengan delta NEGATIF untuk reverse
    -- Trigger sync_ingredient_stock akan otomatis update current_stock
    insert into public.stock_ledger
      (ingredient_id, delta_qty, uom, reason, ref_type, ref_id, at)
    values
      (v_ingredient_id,
       -v_qty,  -- NEGATIF untuk reversal
       coalesce(v_uom, 'pcs'::base_uom),
       'po',
       'purchase_orders',
       NEW.id,
       now());
       
    raise notice 'Stock reversal entry created (qty: -%)', v_qty;
  end loop;
  
  -- Clear completed_at since PO is no longer complete
  NEW.completed_at := null;
  
  raise notice 'PO Reversal Trigger: Finished processing PO %', NEW.id;
  
  return NEW;
end;
$$;

-- Trigger untuk INSERT dengan status langsung complete
drop trigger if exists trg_po_complete_on_insert on public.purchase_orders;

create trigger trg_po_complete_on_insert
after insert on public.purchase_orders
for each row
when (NEW.status = 'complete')
execute function public.apply_po_completion_inventory();

-- Trigger untuk UPDATE dari status lain ke complete
drop trigger if exists trg_apply_po_completion on public.purchase_orders;

create trigger trg_apply_po_completion
after update on public.purchase_orders
for each row
when (OLD.status is distinct from 'complete' and NEW.status = 'complete')
execute function public.apply_po_completion_inventory();

-- Trigger untuk REVERSAL: dari complete ke draft/pending
drop trigger if exists trg_reverse_po_completion on public.purchase_orders;

create trigger trg_reverse_po_completion
before update on public.purchase_orders
for each row
when (OLD.status = 'complete' and NEW.status in ('draft', 'pending'))
execute function public.reverse_po_completion_inventory();
