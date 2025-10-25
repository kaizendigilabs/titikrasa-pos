create table if not exists resellers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    jsonb not null default '{}'::jsonb,
  terms      jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_resellers_active on resellers(is_active);
