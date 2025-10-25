-- Orders (unified pos/reseller)
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
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
