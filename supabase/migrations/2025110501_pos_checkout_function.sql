create or replace function public.pos_checkout(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := coalesce((payload->>'order_id')::uuid, gen_random_uuid());
  v_number text := payload->>'number';
  v_channel channel := (payload->>'channel')::channel;
  v_reseller_id uuid := (payload->>'reseller_id')::uuid;
  v_payment_method payment_method := (payload->>'payment_method')::payment_method;
  v_payment_status payment_status := (payload->>'payment_status')::payment_status;
  v_status order_status := (payload->>'status')::order_status;
  v_due_date date := (payload->>'due_date')::date;
  v_customer_note text := payload->>'customer_note';
  v_totals jsonb := coalesce(payload->'totals', '{}'::jsonb);
  v_paid_at timestamptz := (payload->>'paid_at')::timestamptz;
  v_created_by uuid := (payload->>'created_by')::uuid;
  v_ticket_items jsonb := payload->'ticket_items';
begin
  if v_number is null then
    raise exception 'Order number is required';
  end if;

  insert into public.orders (
    id,
    number,
    channel,
    reseller_id,
    payment_method,
    payment_status,
    due_date,
    customer_note,
    status,
    totals,
    paid_at,
    created_by
  )
  values (
    v_order_id,
    v_number,
    v_channel,
    v_reseller_id,
    v_payment_method,
    v_payment_status,
    v_due_date,
    v_customer_note,
    v_status,
    v_totals,
    v_paid_at,
    v_created_by
  );

  insert into public.order_items (
    id,
    order_id,
    menu_id,
    qty,
    price,
    discount,
    tax,
    variant
  )
  select
    coalesce((item->>'id')::uuid, gen_random_uuid()),
    v_order_id,
    (item->>'menu_id')::uuid,
    coalesce((item->>'qty')::int, 0),
    coalesce((item->>'price')::int, 0),
    coalesce((item->>'discount')::int, 0),
    coalesce((item->>'tax')::int, 0),
    item->>'variant'
  from jsonb_array_elements(coalesce(payload->'items', '[]'::jsonb)) as item;

  if v_ticket_items is not null then
    insert into public.kds_tickets (order_id, items)
    values (v_order_id, v_ticket_items);
  end if;

  return v_order_id;
end;
$$;
