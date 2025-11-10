-- Speed up fuzzy search on profiles for dashboard Users table filters.
-- Uses pg_trgm so existing ilike queries benefit without changing API payloads.

create extension if not exists pg_trgm;

create index if not exists idx_profiles_name_trgm
  on public.profiles
  using gin (name gin_trgm_ops);

create index if not exists idx_profiles_email_trgm
  on public.profiles
  using gin (email gin_trgm_ops);

create index if not exists idx_profiles_phone_trgm
  on public.profiles
  using gin (phone gin_trgm_ops);
