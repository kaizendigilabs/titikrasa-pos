-- Suppliers
create table if not exists suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_suppliers_active on suppliers(is_active);

-- Trigram indexes for dashboard search
create index if not exists suppliers_name_trgm_idx
  on public.suppliers
  using gin (name gin_trgm_ops);

create index if not exists suppliers_contact_email_trgm_idx
  on public.suppliers
  using gin ((contact ->> 'email') gin_trgm_ops);

create index if not exists suppliers_contact_phone_trgm_idx
  on public.suppliers
  using gin ((contact ->> 'phone') gin_trgm_ops);
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_select_staff" on public.suppliers;
drop policy if exists "suppliers_write_admin_mgr" on public.suppliers;
drop policy if exists "suppliers_update_admin_mgr" on public.suppliers;
drop policy if exists "suppliers_delete_admin" on public.suppliers;

create policy "suppliers_select_staff" on public.suppliers for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);
create policy "suppliers_write_admin_mgr" on public.suppliers for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "suppliers_update_admin_mgr" on public.suppliers for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
) with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "suppliers_delete_admin" on public.suppliers for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Supplier Catalog
create table if not exists supplier_catalog_items (
  id                  uuid primary key default gen_random_uuid(),
  supplier_id         uuid not null references suppliers(id) on delete cascade,
  name                text not null,
  base_uom            base_uom not null,
  purchase_price      integer not null,              -- per base uom (ex-PPN)
  unit_label          text,                          -- e.g., 'Pack', 'Box', 'Kg', 'Bottle'
  conversion_rate     numeric not null default 1,    -- Multiplier to convert buying unit to base_uom
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);
create index if not exists idx_catalog_supplier on supplier_catalog_items(supplier_id);

comment on column public.supplier_catalog_items.unit_label is 'Display label for the buying unit (e.g. Pack, Bottle)';
comment on column public.supplier_catalog_items.conversion_rate is 'Multiplier to convert buying unit to base_uom (e.g. 1000 for 1kg -> gr)';

alter table public.supplier_catalog_items enable row level security;

drop policy if exists "supplier_catalog_select_staff" on public.supplier_catalog_items;
drop policy if exists "supplier_catalog_write_admin_mgr" on public.supplier_catalog_items;
drop policy if exists "supplier_catalog_update_admin_mgr" on public.supplier_catalog_items;
drop policy if exists "supplier_catalog_delete_admin" on public.supplier_catalog_items;

create policy "supplier_catalog_select_staff" on public.supplier_catalog_items for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'staff')
);
create policy "supplier_catalog_write_admin_mgr" on public.supplier_catalog_items for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "supplier_catalog_update_admin_mgr" on public.supplier_catalog_items for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
) with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "supplier_catalog_delete_admin" on public.supplier_catalog_items for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Link catalog ↔ store ingredient (metadata pembelian terakhir)
create table if not exists ingredient_supplier_links (
  id                  uuid primary key default gen_random_uuid(),
  store_ingredient_id uuid not null references store_ingredients(id) on delete cascade,
  catalog_item_id     uuid not null references supplier_catalog_items(id) on delete cascade,
  preferred           boolean not null default false,
  last_purchase_price integer,
  last_purchased_at   timestamptz,
  unique (store_ingredient_id, catalog_item_id)
);
create index if not exists idx_ing_supplier_link_ing on ingredient_supplier_links(store_ingredient_id);
alter table public.ingredient_supplier_links enable row level security;

drop policy if exists "ingredient_links_select" on public.ingredient_supplier_links;
drop policy if exists "ingredient_links_write" on public.ingredient_supplier_links;
create policy "ingredient_links_select" on public.ingredient_supplier_links for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "ingredient_links_write" on public.ingredient_supplier_links for all to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
) with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);

-- Purchase Orders (PO-first; receiving implicit saat complete)
create table if not exists purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  status        po_status not null default 'draft',
  supplier_id   uuid references suppliers(id) on delete set null,
  items         jsonb not null default '[]'::jsonb,
  totals        jsonb not null default '{}'::jsonb,
  issued_at     timestamptz default now(),
  completed_at  timestamptz,
  created_by    uuid references profiles(user_id) on delete set null
  -- items: [{catalog_item_id, store_ingredient_id, qty_pack, pack_uom, qty_base, price}]
);
create index if not exists idx_po_status on purchase_orders(status);
create index if not exists idx_po_completed_at on purchase_orders(completed_at);
create index if not exists idx_po_supplier_id on purchase_orders(supplier_id);
alter table public.purchase_orders enable row level security;

drop policy if exists "purchase_orders_select" on public.purchase_orders;
drop policy if exists "purchase_orders_write" on public.purchase_orders;
drop policy if exists "purchase_orders_update" on public.purchase_orders;
drop policy if exists "purchase_orders_delete" on public.purchase_orders;

create policy "purchase_orders_select" on public.purchase_orders for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'staff')
);
create policy "purchase_orders_write" on public.purchase_orders for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "purchase_orders_update" on public.purchase_orders for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
) with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "purchase_orders_delete" on public.purchase_orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));
