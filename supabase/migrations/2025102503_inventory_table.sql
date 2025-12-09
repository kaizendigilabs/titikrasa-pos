-- Store Ingredients (PO-first)
create table if not exists store_ingredients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  base_uom       base_uom not null,           -- gr/ml/pcs
  sku            text,
  min_stock      integer not null default 0,  -- base uom
  current_stock  integer not null default 0,  -- base uom
  avg_cost       integer not null default 0,  -- IDR per base uom
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz default null     -- Soft delete
);
create index if not exists idx_si_name on store_ingredients(name);
alter table public.store_ingredients enable row level security;

drop policy if exists "store_ingredients_select" on public.store_ingredients;
drop policy if exists "store_ingredients_write" on public.store_ingredients;
drop policy if exists "store_ingredients_update" on public.store_ingredients;
drop policy if exists "store_ingredients_delete" on public.store_ingredients;

create policy "store_ingredients_select" on public.store_ingredients for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "store_ingredients_write" on public.store_ingredients for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);

create policy "store_ingredients_update" on public.store_ingredients for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
) with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);

create policy "store_ingredients_delete" on public.store_ingredients for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Stock Ledger (sale, po, adjust, waste)
create table if not exists stock_ledger (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid not null references store_ingredients(id) on delete cascade,
  delta_qty      integer not null,            -- +in / -out (base uom)
  uom            base_uom not null,
  reason         text not null check (reason in ('sale','po','adjust','waste')),
  ref_type       text,                        -- 'order','purchase_order','opname',...
  ref_id         uuid,
  at             timestamptz not null default now()
);
create index if not exists idx_ledger_ing_at on stock_ledger(ingredient_id, at desc);
alter table public.stock_ledger enable row level security;

drop policy if exists "stock_ledger_read" on public.stock_ledger;
drop policy if exists "stock_ledger_write_block" on public.stock_ledger;
create policy "stock_ledger_read" on public.stock_ledger for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);
create policy "stock_ledger_write_block" on public.stock_ledger for all to authenticated using (false) with check (false);

-- Stock Adjustments (stock opname)
create table if not exists public.stock_adjustments (
  id          uuid primary key default gen_random_uuid(),
  status      text not null check (status in ('draft','approved')),
  notes       text not null default '',
  items       jsonb not null, -- [{ingredient_id:uuid, delta_qty:int, reason:'opname'}]
  created_by  uuid references public.profiles(user_id) on delete set null,
  approved_by uuid references public.profiles(user_id) on delete set null,
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.stock_adjustments enable row level security;

drop policy if exists "stock_adjust_select" on public.stock_adjustments;
drop policy if exists "stock_adjust_write" on public.stock_adjustments;
drop policy if exists "stock_adjust_update" on public.stock_adjustments;
drop policy if exists "stock_adjust_delete" on public.stock_adjustments;

create policy "stock_adjust_select" on public.stock_adjustments for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "stock_adjust_write" on public.stock_adjustments for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);

create policy "stock_adjust_update" on public.stock_adjustments for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
) with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);

create policy "stock_adjust_delete" on public.stock_adjustments for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Committer: memindahkan items ke stock_ledger saat status berubah ke approved
create or replace function public.apply_stock_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb;
  v_uom base_uom;
begin
  if NEW.status = 'approved' and (OLD.status is distinct from 'approved') then
    NEW.approved_at := now();

    -- Iterasi items dan tulis ke stock_ledger
    for rec in select jsonb_array_elements(NEW.items) loop
      -- Ambil base_uom dari ingredient agar konsisten
      select si.base_uom into v_uom from public.store_ingredients si where si.id = (rec->>'ingredient_id')::uuid;

      insert into public.stock_ledger
        (ingredient_id, delta_qty, uom, reason, ref_type, ref_id, at)
      values
        ((rec->>'ingredient_id')::uuid,
         (rec->>'delta_qty')::int,
         coalesce(v_uom, 'pcs'::base_uom),
         'adjust',
         'stock_adjustments',
         NEW.id,
         now());
    end loop;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_apply_stock_adjustment on public.stock_adjustments;

create trigger trg_apply_stock_adjustment
after update on public.stock_adjustments
for each row
when (OLD.status is distinct from NEW.status)
execute function public.apply_stock_adjustment();
