-- Improve search performance for resellers (name/email/phone) using trigram indexes.
create extension if not exists pg_trgm;

create index if not exists idx_resellers_name_trgm
  on public.resellers using gin (name gin_trgm_ops);

create index if not exists idx_resellers_contact_email_trgm
  on public.resellers using gin ((contact->> 'email') gin_trgm_ops);

create index if not exists idx_resellers_contact_phone_trgm
  on public.resellers using gin ((contact->> 'phone') gin_trgm_ops);
