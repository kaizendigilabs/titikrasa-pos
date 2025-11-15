-- Orders (unified pos/reseller)
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  client_ref      text,
  channel         channel not null,
  reseller_id     uuid references resellers(id) on delete set null,
  payment_method  payment_method not null,
  payment_status  payment_status not null default 'paid',
  due_date        date,
  customer_note   text,
  status          order_status not null default 'open',
  totals          jsonb not null default '{}'::jsonb, -- {subtotal, discount, tax, grand}
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid references profiles(user_id) on delete set null,
  check ( (channel = 'reseller' and (payment_status in ('paid','unpaid','void')))
        or (channel = 'pos' and (payment_status in ('paid','unpaid','void'))) )
);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_channel on orders(channel);
create index if not exists idx_orders_payment_status on orders(payment_status);
create unique index if not exists idx_orders_client_ref_not_null
  on orders(client_ref)
  where client_ref is not null;

-- Order Items
create table if not exists order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders(id) on delete cascade,
  menu_id   uuid not null references menus(id) on delete restrict,
  variant   text,                 -- "m|ice" atau null
  qty       integer not null check (qty > 0),
  price     integer not null,     -- ex-PPN (per unit)
  discount  integer not null default 0,
  tax       integer not null default 0
);
create index if not exists idx_order_items_order on order_items(order_id);

alter table order_items
  add constraint chk_price_positive check (price >= 0);

-- Pricing guard: memastikan harga varian untuk channel aktif tersedia
create or replace function public.validate_channel_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price int;
  v_size text;
  v_temp text;
  v_channel text;
begin
  -- Ambil harga dari matrix variants berdasarkan variant ("size|temperature")
  -- Format yang diharapkan pada menus.variants:
  -- {
  --   allowed_sizes: ["s","m","l"],
  --   allowed_temperatures: ["hot","ice"],
  --   default_size: "m",
  --   default_temperature: "ice",
  --   prices: {
  --     retail: { s: { hot: 25000, ice: 26000 }, m: { hot: 28000, ice: 29000 }, l: { hot: 32000, ice: 33000 } },
  --     reseller: { ... }
  --   }
  -- }
  v_size := split_part(coalesce(NEW.variant, ''), '|', 1);
  v_temp := split_part(coalesce(NEW.variant, ''), '|', 2);

  -- Ambil channel dari orders
  select o.channel into v_channel from public.orders o where o.id = NEW.order_id;

  select
    case
      when m.variants is null then
        case v_channel
          when 'pos' then m.price
          when 'reseller' then m.reseller_price
        end
      else
        case v_channel
          when 'pos' then (m.variants->'prices'->'retail'->v_size->>v_temp)::int
          when 'reseller' then (m.variants->'prices'->'reseller'->v_size->>v_temp)::int
        end
    end
  into v_price
  from public.menus m
  where m.id = NEW.menu_id;

  if v_price is null or v_price <= 0 then
    raise exception 'Harga untuk channel "%" dan varian "%" tidak tersedia', v_channel, coalesce(NEW.variant, 'simple')
      using errcode = '23514';
  end if;

  -- Samakan NEW.price dengan matrix agar tak bisa override manual
  NEW.price := v_price;

  return NEW;
end;
$$;

drop trigger if exists trg_order_items_validate_channel_price on public.order_items;

create trigger trg_order_items_validate_channel_price
before insert or update on public.order_items
for each row
execute function public.validate_channel_price();

-- KDS Tickets (tanpa station/timer)
create table if not exists kds_tickets (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  -- items: [{ order_item_id, status, updated_by, updated_at }]
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_kds_order on kds_tickets(order_id);

-- Guard due_date (hanya bermakna untuk reseller+unpaid)
create or replace function trg_orders_due_date_guard()
returns trigger language plpgsql as $$
begin
  if new.channel = 'reseller' and new.payment_status = 'unpaid' then
    return new; -- boleh null/diisi (default +7 di service)
  end if;
  if new.due_date is not null then
    raise exception 'due_date hanya untuk reseller-unpaid';
  end if;
  return new;
end $$;

drop trigger if exists orders_due_date_guard on orders;
create trigger orders_due_date_guard
before insert or update on orders
for each row execute function trg_orders_due_date_guard();

-- KDS items status check (ringan)
create or replace function kds_items_check(items jsonb)
returns boolean language sql immutable as $$
  select coalesce(
    (select bool_and( (i->>'status') in ('queue','making','ready','served') )
      from jsonb_array_elements(items) i),
    true
  )
$$;

alter table kds_tickets
  add constraint kds_items_status_check check (kds_items_check(items));

-- POS checkout helper (inserts order + line items + optional KDS ticket)
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
  v_client_ref text := payload->>'client_ref';
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
    created_by,
    client_ref
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
    v_created_by,
    v_client_ref
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

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.kds_tickets enable row level security;

drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;
drop policy if exists "orders_delete" on public.orders;

create policy "orders_select"
on public.orders
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "orders_insert"
on public.orders
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "orders_update"
on public.orders
for update
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
)
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "orders_delete"
on public.orders
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));

drop policy if exists "order_items_select" on public.order_items;
drop policy if exists "order_items_insert" on public.order_items;
drop policy if exists "order_items_update" on public.order_items;
drop policy if exists "order_items_delete" on public.order_items;

create policy "order_items_select"
on public.order_items
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "order_items_insert"
on public.order_items
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "order_items_update"
on public.order_items
for update
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
)
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "order_items_delete"
on public.order_items
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));

drop policy if exists "kds_tickets_select" on public.kds_tickets;
drop policy if exists "kds_tickets_insert" on public.kds_tickets;
drop policy if exists "kds_tickets_update" on public.kds_tickets;
drop policy if exists "kds_tickets_delete" on public.kds_tickets;

create policy "kds_tickets_select"
on public.kds_tickets
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "kds_tickets_insert"
on public.kds_tickets
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "kds_tickets_update"
on public.kds_tickets
for update
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
)
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "kds_tickets_delete"
on public.kds_tickets
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));
