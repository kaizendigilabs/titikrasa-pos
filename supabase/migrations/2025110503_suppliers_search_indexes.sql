-- Improve suppliers search performance for ilike queries
create extension if not exists pg_trgm with schema public;

create index if not exists suppliers_name_trgm_idx
  on public.suppliers
  using gin (name gin_trgm_ops);

create index if not exists suppliers_contact_email_trgm_idx
  on public.suppliers
  using gin ((contact ->> 'email') gin_trgm_ops);

create index if not exists suppliers_contact_phone_trgm_idx
  on public.suppliers
  using gin ((contact ->> 'phone') gin_trgm_ops);
