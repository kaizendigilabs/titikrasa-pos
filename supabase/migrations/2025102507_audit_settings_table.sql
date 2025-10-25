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
