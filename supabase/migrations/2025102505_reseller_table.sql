create table if not exists resellers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    jsonb not null default '{}'::jsonb,
  terms      jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_resellers_active on resellers(is_active);

-- Trigram indexes for fuzzy search
create index if not exists idx_resellers_name_trgm
  on public.resellers using gin (name gin_trgm_ops);

create index if not exists idx_resellers_contact_email_trgm
  on public.resellers using gin ((contact->> 'email') gin_trgm_ops);

create index if not exists idx_resellers_contact_phone_trgm
  on public.resellers using gin ((contact->> 'phone') gin_trgm_ops);

alter table public.resellers enable row level security;

drop policy if exists "resellers_select_staff" on public.resellers;
drop policy if exists "resellers_write_admin_mgr" on public.resellers;
drop policy if exists "resellers_update_admin_mgr" on public.resellers;
drop policy if exists "resellers_delete_admin" on public.resellers;

create policy "resellers_select_staff"
on public.resellers
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "resellers_write_admin_mgr"
on public.resellers
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "resellers_update_admin_mgr"
on public.resellers
for update
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
)
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "resellers_delete_admin"
on public.resellers
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));
