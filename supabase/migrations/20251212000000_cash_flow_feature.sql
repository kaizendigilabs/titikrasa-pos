-- Create enum for cash flow type
create type cash_flow_type as enum ('in', 'out');

-- Create cash_flow_categories table
create table public.cash_flow_categories (
    id uuid not null default gen_random_uuid(),
    name text not null,
    type cash_flow_type not null,
    is_system boolean not null default false,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint cash_flow_categories_pkey primary key (id)
);

-- Create cash_flows table
create table public.cash_flows (
    id uuid not null default gen_random_uuid(),
    date timestamp with time zone not null default now(),
    amount numeric not null check (amount >= 0),
    category_id uuid not null,
    description text,
    order_id uuid, -- Reference to sales orders
    purchase_order_id uuid, -- Reference to purchase orders
    created_by uuid references auth.users(id),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint cash_flows_pkey primary key (id),
    constraint cash_flows_category_id_fkey foreign key (category_id) references public.cash_flow_categories(id) on delete restrict,
    constraint cash_flows_order_id_fkey foreign key (order_id) references public.orders(id) on delete set null,
    constraint cash_flows_purchase_order_id_fkey foreign key (purchase_order_id) references public.purchase_orders(id) on delete set null
);

-- Enable RLS
alter table public.cash_flow_categories enable row level security;
alter table public.cash_flows enable row level security;

-- Policies for cash_flow_categories
create policy "Allow read access for authenticated users on categories"
    on public.cash_flow_categories for select
    to authenticated
    using (true);

create policy "Allow insert access for authenticated users on categories"
    on public.cash_flow_categories for insert
    to authenticated
    with check (true);

create policy "Allow update access for authenticated users on categories"
    on public.cash_flow_categories for update
    to authenticated
    using (true);

create policy "Allow delete access for authenticated users on categories"
    on public.cash_flow_categories for delete
    to authenticated
    using (is_system = false); -- Prevent deleting system categories

-- Policies for cash_flows
create policy "Allow read access for authenticated users on cash_flows"
    on public.cash_flows for select
    to authenticated
    using (true);

create policy "Allow insert access for authenticated users on cash_flows"
    on public.cash_flows for insert
    to authenticated
    with check (true);

create policy "Allow update access for authenticated users on cash_flows"
    on public.cash_flows for update
    to authenticated
    using (true);

create policy "Allow delete access for authenticated users on cash_flows"
    on public.cash_flows for delete
    to authenticated
    using (true);

-- Seed System Categories
insert into public.cash_flow_categories (name, type, is_system) values
    ('Penjualan', 'in', true),
    ('Belanja Barang', 'out', true),
    ('Operasional', 'out', false),
    ('Gaji Karyawan', 'out', false),
    ('Modal', 'in', false),
    ('Prive', 'out', false),
    ('Lain-lain (Masuk)', 'in', false),
    ('Lain-lain (Keluar)', 'out', false);

-- Helper function to get category id by name
create or replace function get_sys_category_id(cat_name text)
returns uuid as $$
declare
    cat_id uuid;
begin
    select id into cat_id from public.cash_flow_categories where name = cat_name limit 1;
    return cat_id;
end;
$$ language plpgsql;

-- Trigger Function: Auto-insert Cash Flow on Order Completion
create or replace function public.handle_new_cash_flow_from_order()
returns trigger as $$
declare
    sales_cat_id uuid;
begin
    -- Only trigger when status changes to 'completed'
    if (new.status = 'completed' and (old.status is null or old.status != 'completed')) then
        sales_cat_id := get_sys_category_id('Penjualan');
        
        insert into public.cash_flows (
            date,
            amount,
            category_id,
            description,
            order_id,
            created_by
        ) values (
            now(),
            coalesce((new.totals->>'grand')::numeric, (new.totals->>'grandTotal')::numeric, 0),
            sales_cat_id,
            'Order #' || new.number,
            new.id,
            auth.uid() -- Might be null if triggered by system, but usually updated by user
        );
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger Function: Auto-insert Cash Flow on Purchase Order Completion
create or replace function public.handle_new_cash_flow_from_po()
returns trigger as $$
declare
    po_cat_id uuid;
begin
    -- Only trigger when status changes to 'completed'
    if (new.status = 'completed' and (old.status is null or old.status != 'completed')) then
        po_cat_id := get_sys_category_id('Belanja Barang');
        
        insert into public.cash_flows (
            date,
            amount,
            category_id,
            description,
            purchase_order_id,
            created_by
        ) values (
            now(),
            coalesce((new.totals->>'grand_total')::numeric, (new.totals->>'grandTotal')::numeric, (new.totals->>'grand')::numeric, 0),
            po_cat_id,
            'PO ' || substring(new.id::text, 1, 8),
            new.id,
            auth.uid()
        );
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Attach Triggers
create trigger on_order_completed_add_cash_flow
    after update on public.orders
    for each row
    execute function public.handle_new_cash_flow_from_order();

create trigger on_po_completed_add_cash_flow
    after update on public.purchase_orders
    for each row
    execute function public.handle_new_cash_flow_from_po();
