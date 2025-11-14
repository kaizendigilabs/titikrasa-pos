-- Dev data seeder for Supabase SQL editor.
-- Jalankan file ini sekali di SQL Editor Supabase untuk mengisi data contoh.
set search_path = public;

do $$
declare
  v_actor uuid;
  v_admin uuid;
  v_manager uuid;
  v_cashier uuid;

  v_category_coffee uuid;
  v_category_tea uuid;
  v_category_snack uuid;

  v_ing_beans uuid;
  v_ing_milk uuid;
  v_ing_matcha uuid;
  v_ing_cup uuid;
  v_ing_water uuid;

  v_supplier_kopi uuid;
  v_supplier_dairy uuid;
  v_catalog_beans uuid;
  v_catalog_milk uuid;

  v_menu_americano uuid;
  v_menu_latte uuid;
  v_menu_matcha uuid;

  v_recipe_americano uuid;
  v_recipe_latte uuid;
  v_recipe_matcha uuid;

  v_reseller uuid;
  v_purchase_order uuid;

  v_order_pos uuid;
  v_order_reseller uuid;
  v_item_pos_americano uuid;
  v_item_pos_latte uuid;
  v_item_reseller_matcha uuid;
  v_kds_ticket uuid;

  v_stock_adjustment uuid;

  latte_variants jsonb := $json${
    "allowed_sizes":["s","m","l"],
    "allowed_temperatures":["hot","ice"],
    "default_size":"m",
    "default_temperature":"hot",
    "prices":{
      "retail":{
        "s":{"hot":28000,"ice":29000},
        "m":{"hot":32000,"ice":33000},
        "l":{"hot":36000,"ice":37000}
      },
      "reseller":{
        "s":{"hot":24000,"ice":25000},
        "m":{"hot":28000,"ice":29000},
        "l":{"hot":32000,"ice":33000}
      }
    }
  }$json$::jsonb;

  matcha_variants jsonb := $json${
    "allowed_sizes":["m","l"],
    "allowed_temperatures":["hot","ice"],
    "default_size":"m",
    "default_temperature":"ice",
    "prices":{
      "retail":{
        "m":{"hot":34000,"ice":35000},
        "l":{"hot":38000,"ice":39000}
      },
      "reseller":{
        "m":{"hot":30000,"ice":31000},
        "l":{"hot":34000,"ice":35000}
      }
    },
    "metadata":{
      "note":"Best seller for reseller channel"
    }
  }$json$::jsonb;
begin
  select p.user_id
  into v_actor
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_actor is null then
    raise exception 'Seeder membutuhkan minimal 1 profil pada public.profiles';
  end if;

  -- ===== Roles & RBAC =====
  insert into public.roles(name) values ('admin')
    on conflict (name) do update set name = excluded.name
    returning id into v_admin;
  if v_admin is null then
    select id into v_admin from public.roles where name = 'admin';
  end if;

  insert into public.roles(name) values ('manager')
    on conflict (name) do update set name = excluded.name
    returning id into v_manager;
  if v_manager is null then
    select id into v_manager from public.roles where name = 'manager';
  end if;

  insert into public.roles(name) values ('cashier')
    on conflict (name) do update set name = excluded.name
    returning id into v_cashier;
  if v_cashier is null then
    select id into v_cashier from public.roles where name = 'cashier';
  end if;

  insert into public.user_roles(user_id, role_id)
  values (v_actor, v_admin)
  on conflict (user_id) do update set role_id = excluded.role_id;

  -- ===== Categories =====
  insert into public.categories (name, slug, sort_order, is_active, icon_url)
  values ('Coffee', 'coffee', 1, true, 'https://dummyimage.com/48x48/coffee/ffffff&text=C')
  on conflict (slug) do update
    set name = excluded.name,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        icon_url = excluded.icon_url
  returning id into v_category_coffee;
  if v_category_coffee is null then
    select id into v_category_coffee from public.categories where slug = 'coffee';
  end if;

  insert into public.categories (name, slug, sort_order, is_active, icon_url)
  values ('Tea & Frappe', 'tea', 2, true, 'https://dummyimage.com/48x48/8bc34a/ffffff&text=T')
  on conflict (slug) do update
    set name = excluded.name,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        icon_url = excluded.icon_url
  returning id into v_category_tea;
  if v_category_tea is null then
    select id into v_category_tea from public.categories where slug = 'tea';
  end if;

  insert into public.categories (name, slug, sort_order, is_active, icon_url)
  values ('Snacks', 'snacks', 3, true, 'https://dummyimage.com/48x48/ffc107/ffffff&text=S')
  on conflict (slug) do update
    set name = excluded.name,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        icon_url = excluded.icon_url
  returning id into v_category_snack;
  if v_category_snack is null then
    select id into v_category_snack from public.categories where slug = 'snacks';
  end if;

  -- ===== Store Ingredients =====
  select id into v_ing_beans from public.store_ingredients where name = 'House Espresso Beans' limit 1;
  if v_ing_beans is null then
    insert into public.store_ingredients (name, base_uom, sku, min_stock, current_stock, avg_cost)
    values ('House Espresso Beans', 'gr', 'ING-BEANS', 2000, 8000, 180)
    returning id into v_ing_beans;
  end if;

  select id into v_ing_milk from public.store_ingredients where name = 'Fresh Milk 1L' limit 1;
  if v_ing_milk is null then
    insert into public.store_ingredients (name, base_uom, sku, min_stock, current_stock, avg_cost)
    values ('Fresh Milk 1L', 'ml', 'ING-MILK', 5000, 12000, 12)
    returning id into v_ing_milk;
  end if;

  select id into v_ing_matcha from public.store_ingredients where name = 'Matcha Syrup' limit 1;
  if v_ing_matcha is null then
    insert into public.store_ingredients (name, base_uom, sku, min_stock, current_stock, avg_cost)
    values ('Matcha Syrup', 'ml', 'ING-MATCHA', 1000, 3000, 25)
    returning id into v_ing_matcha;
  end if;

  select id into v_ing_cup from public.store_ingredients where name = 'Paper Cup 12oz' limit 1;
  if v_ing_cup is null then
    insert into public.store_ingredients (name, base_uom, sku, min_stock, current_stock, avg_cost)
    values ('Paper Cup 12oz', 'pcs', 'ING-CUP', 200, 800, 1500)
    returning id into v_ing_cup;
  end if;

  select id into v_ing_water from public.store_ingredients where name = 'Filtered Water' limit 1;
  if v_ing_water is null then
    insert into public.store_ingredients (name, base_uom, sku, min_stock, current_stock, avg_cost)
    values ('Filtered Water', 'ml', 'ING-WATER', 10000, 50000, 1)
    returning id into v_ing_water;
  end if;

  -- ===== Suppliers & Catalog =====
  select id into v_supplier_kopi from public.suppliers where name = 'PT Sumber Kopi Sejahtera' limit 1;
  if v_supplier_kopi is null then
    insert into public.suppliers (name, contact)
    values ('PT Sumber Kopi Sejahtera', jsonb_build_object('phone', '+62-812-8888-1111', 'address', 'Bandung'))
    returning id into v_supplier_kopi;
  else
    update public.suppliers
      set contact = jsonb_build_object('phone', '+62-812-8888-1111', 'address', 'Bandung')
      where id = v_supplier_kopi;
  end if;

  select id into v_supplier_dairy from public.suppliers where name = 'CV Dairy Nusantara' limit 1;
  if v_supplier_dairy is null then
    insert into public.suppliers (name, contact)
    values ('CV Dairy Nusantara', jsonb_build_object('phone', '+62-812-5555-1212', 'address', 'Bogor'))
    returning id into v_supplier_dairy;
  else
    update public.suppliers
      set contact = jsonb_build_object('phone', '+62-812-5555-1212', 'address', 'Bogor')
      where id = v_supplier_dairy;
  end if;

  select id into v_catalog_beans
  from public.supplier_catalog_items
  where supplier_id = v_supplier_kopi and name = 'Premium Arabica Beans'
  limit 1;
  if v_catalog_beans is null then
    insert into public.supplier_catalog_items (supplier_id, name, base_uom, purchase_price)
    values (v_supplier_kopi, 'Premium Arabica Beans', 'gr', 185000)
    returning id into v_catalog_beans;
  end if;

  select id into v_catalog_milk
  from public.supplier_catalog_items
  where supplier_id = v_supplier_dairy and name = 'UHT Milk 1L'
  limit 1;
  if v_catalog_milk is null then
    insert into public.supplier_catalog_items (supplier_id, name, base_uom, purchase_price)
    values (v_supplier_dairy, 'UHT Milk 1L', 'ml', 11000)
    returning id into v_catalog_milk;
  end if;

  insert into public.ingredient_supplier_links (store_ingredient_id, catalog_item_id, preferred, last_purchase_price, last_purchased_at)
  values
    (v_ing_beans, v_catalog_beans, true, 185000, now() - interval '14 days'),
    (v_ing_milk, v_catalog_milk, true, 11000, now() - interval '10 days')
  on conflict (store_ingredient_id, catalog_item_id) do update
    set preferred = excluded.preferred,
        last_purchase_price = excluded.last_purchase_price,
        last_purchased_at = excluded.last_purchased_at;

  -- ===== Menus =====
  select id into v_menu_americano from public.menus where sku = 'MENU-AMER' limit 1;
  if v_menu_americano is null then
    insert into public.menus (name, sku, category_id, price, reseller_price, thumbnail_url, is_active)
    values ('Classic Americano', 'MENU-AMER', v_category_coffee, 25000, 22000, 'https://dummyimage.com/600x600/coffee/ffffff&text=AMR', true)
    returning id into v_menu_americano;
  else
    update public.menus
      set category_id = v_category_coffee,
          price = 25000,
          reseller_price = 22000,
          is_active = true
      where id = v_menu_americano;
  end if;

  select id into v_menu_latte from public.menus where sku = 'MENU-LATT' limit 1;
  if v_menu_latte is null then
    insert into public.menus (name, sku, category_id, price, reseller_price, thumbnail_url, variants)
    values ('Creamy Latte', 'MENU-LATT', v_category_coffee, null, null, 'https://dummyimage.com/600x600/f5f5f5/333333&text=LAT', latte_variants)
    returning id into v_menu_latte;
  else
    update public.menus
      set category_id = v_category_coffee,
          variants = latte_variants,
          price = null,
          reseller_price = null,
          is_active = true
      where id = v_menu_latte;
  end if;

  select id into v_menu_matcha from public.menus where sku = 'MENU-MATCH' limit 1;
  if v_menu_matcha is null then
    insert into public.menus (name, sku, category_id, price, reseller_price, thumbnail_url, variants)
    values ('Matcha Latte', 'MENU-MATCH', v_category_tea, null, null, 'https://dummyimage.com/600x600/a5d6a7/2e7d32&text=MAT', matcha_variants)
    returning id into v_menu_matcha;
  else
    update public.menus
      set category_id = v_category_tea,
          variants = matcha_variants,
          price = null,
          reseller_price = null,
          is_active = true
      where id = v_menu_matcha;
  end if;

  -- ===== Recipes =====
  select id into v_recipe_americano from public.recipes where menu_id = v_menu_americano limit 1;
  if v_recipe_americano is null then
    insert into public.recipes (menu_id, version, items, method_steps)
    values (
      v_menu_americano,
      1,
      jsonb_build_array(
        jsonb_build_object('ingredient_id', v_ing_beans, 'qty', 18, 'uom', 'gr'),
        jsonb_build_object('ingredient_id', v_ing_water, 'qty', 220, 'uom', 'ml'),
        jsonb_build_object('ingredient_id', v_ing_cup, 'qty', 1, 'uom', 'pcs')
      ),
      jsonb_build_array(
        jsonb_build_object('step_no', 1, 'instruction', 'Extract espresso shot'),
        jsonb_build_object('step_no', 2, 'instruction', 'Add hot water and serve')
      )
    )
    returning id into v_recipe_americano;
  end if;

  select id into v_recipe_latte from public.recipes where menu_id = v_menu_latte limit 1;
  if v_recipe_latte is null then
    insert into public.recipes (menu_id, version, items, method_steps)
    values (
      v_menu_latte,
      1,
      jsonb_build_array(
        jsonb_build_object('ingredient_id', v_ing_beans, 'qty', 18, 'uom', 'gr'),
        jsonb_build_object('ingredient_id', v_ing_milk, 'qty', 180, 'uom', 'ml'),
        jsonb_build_object('ingredient_id', v_ing_cup, 'qty', 1, 'uom', 'pcs')
      ),
      jsonb_build_array(
        jsonb_build_object('step_no', 1, 'instruction', 'Extract espresso'),
        jsonb_build_object('step_no', 2, 'instruction', 'Steam milk and pour')
      )
    )
    returning id into v_recipe_latte;
  end if;

  select id into v_recipe_matcha from public.recipes where menu_id = v_menu_matcha limit 1;
  if v_recipe_matcha is null then
    insert into public.recipes (menu_id, version, items, method_steps)
    values (
      v_menu_matcha,
      1,
      jsonb_build_array(
        jsonb_build_object('ingredient_id', v_ing_matcha, 'qty', 30, 'uom', 'ml'),
        jsonb_build_object('ingredient_id', v_ing_milk, 'qty', 200, 'uom', 'ml'),
        jsonb_build_object('ingredient_id', v_ing_cup, 'qty', 1, 'uom', 'pcs')
      ),
      jsonb_build_array(
        jsonb_build_object('step_no', 1, 'instruction', 'Mix matcha syrup with a bit of hot water'),
        jsonb_build_object('step_no', 2, 'instruction', 'Add milk and stir well')
      )
    )
    returning id into v_recipe_matcha;
  end if;

  -- Variant override for iced large latte
  insert into public.recipe_variant_overrides (menu_id, size, temperature, items)
  values (
    v_menu_latte,
    'l',
    'ice',
    jsonb_build_array(
      jsonb_build_object('ingredient_id', v_ing_beans, 'qty', 20, 'uom', 'gr'),
      jsonb_build_object('ingredient_id', v_ing_milk, 'qty', 220, 'uom', 'ml'),
      jsonb_build_object('ingredient_id', v_ing_water, 'qty', 60, 'uom', 'ml')
    )
  )
  on conflict (menu_id, size, temperature, version) do update
    set items = excluded.items;

  -- ===== Reseller =====
  select id into v_reseller from public.resellers where name = 'Kedai Mitra Nusantara' limit 1;
  if v_reseller is null then
    insert into public.resellers (name, contact, terms)
    values (
      'Kedai Mitra Nusantara',
      jsonb_build_object('pic', 'Bu Rina', 'phone', '+62-812-7000-9000'),
      jsonb_build_object('payment_due_days', 7, 'discount_rate', 0.05, 'channel', 'consignment')
    )
    returning id into v_reseller;
  end if;

  -- ===== Purchase Order =====
  select id into v_purchase_order
  from public.purchase_orders
  where totals->>'reference' = 'PO-SEED-001'
  limit 1;
  if v_purchase_order is null then
    insert into public.purchase_orders (status, supplier_id, items, totals, issued_at, completed_at, created_by)
    values (
      'complete',
      v_supplier_kopi,
      jsonb_build_array(
        jsonb_build_object(
          'catalog_item_id', v_catalog_beans,
          'store_ingredient_id', v_ing_beans,
          'qty_base', 5000,
          'price', 185000
        ),
        jsonb_build_object(
          'catalog_item_id', v_catalog_milk,
          'store_ingredient_id', v_ing_milk,
          'qty_base', 3000,
          'price', 11000
        )
      ),
      jsonb_build_object('reference', 'PO-SEED-001', 'subtotal', 185000 + 11000, 'tax', 19600, 'grand', 215600),
      now() - interval '10 days',
      now() - interval '8 days',
      v_actor
    )
    returning id into v_purchase_order;
  end if;

  -- ===== Stock Adjustment (auto writes ledger via trigger) =====
  select id into v_stock_adjustment from public.stock_adjustments where notes = 'Opname awal - seed' limit 1;
  if v_stock_adjustment is null then
    insert into public.stock_adjustments (status, notes, items, created_by)
    values (
      'draft',
      'Opname awal - seed',
      jsonb_build_array(
        jsonb_build_object('ingredient_id', v_ing_beans, 'delta_qty', 200, 'reason', 'opname'),
        jsonb_build_object('ingredient_id', v_ing_milk, 'delta_qty', -150, 'reason', 'opname')
      ),
      v_actor
    )
    returning id into v_stock_adjustment;

    update public.stock_adjustments
      set status = 'approved', approved_by = v_actor, approved_at = now()
      where id = v_stock_adjustment;
  end if;

  -- ===== Orders (POS) =====
  select id into v_order_pos from public.orders where number = 'POS-0001-SEED' limit 1;
  if v_order_pos is null then
    insert into public.orders (
      number, channel, reseller_id, payment_method, payment_status,
      customer_note, totals, paid_at, created_at, created_by, status
    )
    values (
      'POS-0001-SEED',
      'pos',
      null,
      'cash',
      'paid',
      'Walk-in customer',
      jsonb_build_object('subtotal', 58000, 'discount', 0, 'tax', 5800, 'grand', 63800),
      now() - interval '1 day',
      now() - interval '1 day',
      v_actor,
      'paid'
    )
    returning id into v_order_pos;
  end if;

  if v_order_pos is not null then
    select id into v_item_pos_americano
    from public.order_items
    where order_id = v_order_pos and menu_id = v_menu_americano
    limit 1;
    if v_item_pos_americano is null then
      insert into public.order_items (order_id, menu_id, variant, qty, price, discount, tax)
      values (v_order_pos, v_menu_americano, null, 1, 25000, 0, 0)
      returning id into v_item_pos_americano;
    end if;

    select id into v_item_pos_latte
    from public.order_items
    where order_id = v_order_pos and menu_id = v_menu_latte
    limit 1;
    if v_item_pos_latte is null then
      insert into public.order_items (order_id, menu_id, variant, qty, price, discount, tax)
      values (v_order_pos, v_menu_latte, 'm|hot', 1, 32000, 0, 0)
      returning id into v_item_pos_latte;
    end if;

    select id into v_kds_ticket from public.kds_tickets where order_id = v_order_pos limit 1;
    if v_kds_ticket is null then
      insert into public.kds_tickets (order_id, items)
      values (
        v_order_pos,
        jsonb_build_array(
          jsonb_build_object('order_item_id', v_item_pos_americano, 'status', 'ready', 'updated_by', v_actor, 'updated_at', now()),
          jsonb_build_object('order_item_id', v_item_pos_latte, 'status', 'making', 'updated_by', v_actor, 'updated_at', now())
        )
      )
      returning id into v_kds_ticket;
    end if;
  end if;

  -- ===== Orders (Reseller) =====
  select id into v_order_reseller from public.orders where number = 'RES-0001-SEED' limit 1;
  if v_order_reseller is null then
    insert into public.orders (
      number, channel, reseller_id, payment_method, payment_status,
      due_date, customer_note, totals, created_at, created_by, status
    )
    values (
      'RES-0001-SEED',
      'reseller',
      v_reseller,
      'transfer',
      'unpaid',
      (now() + interval '7 days')::date,
      'Urgent delivery for reseller',
      jsonb_build_object('subtotal', 140000, 'discount', 7000, 'tax', 13300, 'grand', 146300),
      now() - interval '2 days',
      v_actor,
      'open'
    )
    returning id into v_order_reseller;
  end if;

  if v_order_reseller is not null then
    select id into v_item_reseller_matcha
    from public.order_items
    where order_id = v_order_reseller and menu_id = v_menu_matcha
    limit 1;
    if v_item_reseller_matcha is null then
      insert into public.order_items (order_id, menu_id, variant, qty, price, discount, tax)
      values (v_order_reseller, v_menu_matcha, 'l|ice', 4, 35000, 0, 0)
      returning id into v_item_reseller_matcha;
    end if;
  end if;

  -- ===== Settings =====
  insert into public.settings (key, value)
  values
    ('pos.tax_rate', jsonb_build_object('value', 0.1, 'label', 'PPN 10%')),
    ('pos.next_order_number', jsonb_build_object('pos', 120, 'reseller', 48))
  on conflict (key) do update set value = excluded.value;

  -- ===== Audit Logs =====
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
  select
    v_actor,
    'pos.checkout',
    'orders',
    v_order_pos,
    null,
    (select row_to_json(o) from (select number, totals from public.orders where id = v_order_pos) o)::jsonb
  where v_order_pos is not null
    and not exists (
      select 1 from public.audit_logs al
      where al.entity_id = v_order_pos and al.action = 'pos.checkout'
    );

  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
  select
    v_actor,
    'procurement.complete_po',
    'purchase_orders',
    v_purchase_order,
    null,
    (select row_to_json(po) from (select totals from public.purchase_orders where id = v_purchase_order) po)::jsonb
  where v_purchase_order is not null
    and not exists (
      select 1 from public.audit_logs al
      where al.entity_id = v_purchase_order and al.action = 'procurement.complete_po'
    );
end $$;
