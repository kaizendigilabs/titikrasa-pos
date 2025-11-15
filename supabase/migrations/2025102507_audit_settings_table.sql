-- Audit Logs
create table if not exists audit_logs (
  id        uuid primary key default gen_random_uuid(),
  actor_id  uuid references profiles(user_id) on delete set null,
  action    text not null,     -- 'pos.void','users.updateRole','po.complete', ...
  entity    text not null,     -- 'orders','purchase_orders','users', ...
  entity_id uuid,
  before    jsonb,
  after     jsonb,
  at        timestamptz not null default now()
);
create index if not exists idx_audit_entity_at on audit_logs(entity, at desc);

-- Settings (key-value)
create table if not exists settings (
  id    uuid primary key default gen_random_uuid(),
  key   text not null unique,
  value jsonb not null default '{}'::jsonb
);

alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists "audit_logs_read" on public.audit_logs;
drop policy if exists "audit_logs_write_block" on public.audit_logs;

create policy "audit_logs_read"
on public.audit_logs
for select
to authenticated
using (public.has_role(auth.uid(),'admin'));

create policy "audit_logs_write_block"
on public.audit_logs
for all
to authenticated
using (false)
with check (false);

drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update_admin" on public.settings;

create policy "settings_select"
on public.settings
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "settings_update_admin"
on public.settings
for all
to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));
