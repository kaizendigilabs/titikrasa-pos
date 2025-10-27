create or replace view purchase_order_item_entries as
select
  po.id as purchase_order_id,
  po.status,
  po.issued_at,
  po.completed_at,
  po.created_by,
  (item->>'catalog_item_id')::uuid as catalog_item_id,
  (item->>'supplier_id')::uuid as supplier_id,
  (item->>'store_ingredient_id')::uuid as store_ingredient_id,
  coalesce((item->>'qty')::integer, 0) as qty,
  coalesce(item->>'base_uom', 'pcs') as base_uom,
  coalesce((item->>'price')::integer, 0) as price
from purchase_orders po
cross join lateral jsonb_array_elements(po.items) as item;
