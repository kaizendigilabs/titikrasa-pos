-- Suppliers
create table if not exists suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_suppliers_active on suppliers(is_active);

-- Supplier Catalog
create table if not exists supplier_catalog_items (
  id                  uuid primary key default gen_random_uuid(),
  supplier_id         uuid not null references suppliers(id) on delete cascade,
  name                text not null,
  base_uom            base_uom not null,
  purchase_price      integer not null,              -- per base uom (ex-PPN)
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);
create index if not exists idx_catalog_supplier on supplier_catalog_items(supplier_id);

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

-- Purchase Orders (PO-first; receiving implicit saat complete)
create table if not exists purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  status        po_status not null default 'draft',
  items         jsonb not null default '[]'::jsonb,
  totals        jsonb not null default '{}'::jsonb,
  issued_at     timestamptz default now(),
  completed_at  timestamptz,
  created_by    uuid references profiles(user_id) on delete set null
  -- items: [{catalog_item_id, store_ingredient_id, qty_pack, pack_uom, qty_base, price}]
);
create index if not exists idx_po_status on purchase_orders(status);
create index if not exists idx_po_completed_at on purchase_orders(completed_at);
