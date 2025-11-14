alter table if exists purchase_orders
  add column if not exists supplier_id uuid references suppliers(id) on delete set null;

create index if not exists idx_po_supplier_id
  on purchase_orders(supplier_id);
