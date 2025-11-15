/** *
 * SCHEMA PROTOTYPE — DEVELOPMENT ONLY
 *
 * Notes:
 * This file uses simplified RLS/policies for the development phase.
 * When moving to STAGING/PRODUCTION, apply the following HARDENING steps:
 *
 * HARDENING CHECKLIST (PRODUCTION)
 * 1) RLS/Policies
 *    - Replace dev policies:
 *      - user_roles: allow INSERT/UPDATE for manager → restrict to non-admin only
 *        (already enforced via is_role_admin_id), then enable UPDATE for manager
 *        (non-admin only) if needed.
 *      - roles: change SELECT from “using (true)” → admin only (or admin+manager
 *        if the UI requires it).
 *    - Add granular permissions if needed (users.read_all, users.manage, etc.)
 *      and helper functions using SECURITY DEFINER.
 *    - Ensure all policy functions use: SECURITY DEFINER + set search_path=public + STABLE.
 *
 * 2) Grants & Access
 *    - Revoke defaults: REVOKE ALL ON SCHEMA public FROM PUBLIC; apply GRANTs per role
 *      (authenticated, anon) as needed.
 *    - GRANT EXECUTE only on functions that are required; do not expose admin functions
 *      to authenticated/anon roles.
 *
 * 3) Auth Flow
 *    - User creation must happen on the server (Service Role Key). Protect endpoints with
 *      auth middleware and rate limiting.
 *    - Password reset via official email; ensure redirect URLs are limited to production domains.
 *
 * 4) Audit & Security
 *    - Enable auditing (log table or Supabase Audit Extension) for changes to
 *      user_roles/roles/profiles.
 *    - Add relevant constraints and indexes; set a reasonable statement_timeout on public connections.
 *    - Ensure the “last admin” guard trigger is active and tested (delete/demotion).
 *
 * 5) Operations
 *    - Prepare backups & PITR. Test the restore procedure.
 *    - Rotate SUPABASE_SERVICE_ROLE_KEY before go-live; store it in a secret manager.
 *    - Lock down CORS & Allowed Redirects in Auth Settings.
 *
 * 6) Code Review
 *    - Ensure client queries don’t rely on UI-side filtering—RLS must be sufficiently strict
 *      without the UI.
 *    - Remove/rename any *_dev policies so they don’t ship to production.
 *
 * Summary: enable strict RLS, minimize SELECT access to control tables (roles), use
 * SECURITY DEFINER functions for validation, and move all sensitive operations to the server side.
 */

-- =========
-- EXTENSIONS
-- =========
create extension if not exists pgcrypto;

-- =========
-- PROFILES
-- =========
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  phone      text,
  avatar     text,
  is_active  boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce unique email if present
create unique index if not exists idx_profiles_email_unique
  on public.profiles((lower(email)))
  where email is not null and email <> '';

-- Accelerate fuzzy search for Users table filters
create index if not exists idx_profiles_name_trgm
  on public.profiles
  using gin (name gin_trgm_ops);

create index if not exists idx_profiles_email_trgm
  on public.profiles
  using gin (email gin_trgm_ops);

create index if not exists idx_profiles_phone_trgm
  on public.profiles
  using gin (phone gin_trgm_ops);

create or replace function public.tg_profiles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.tg_profiles_set_updated_at();

-- Auto-create profile
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_avatar text; v_name text;
begin
  if new.raw_user_meta_data ? 'avatar' then v_avatar := new.raw_user_meta_data->>'avatar'; end if;
  if new.raw_user_meta_data ? 'full_name' then v_name := new.raw_user_meta_data->>'full_name'; end if;

  insert into public.profiles (user_id, name, email, avatar, is_active)
  values (new.id, v_name, new.email, v_avatar, true)
  on conflict (user_id) do nothing;

  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Sync email updates
create or replace function public.sync_profile_email()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
    set email = new.email, updated_at = now()
    where user_id = new.id;
  return new;
end$$;

drop trigger if exists on_auth_user_updated_email on auth.users;
create trigger on_auth_user_updated_email
after update of email on auth.users
for each row execute function public.sync_profile_email();

-- =========
-- ROLES & USER_ROLES (RBAC)
-- =========
create table if not exists public.roles (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);
create index if not exists idx_roles_name on public.roles(name);

-- =========
-- Helper: role checks
-- =========
create or replace function public.has_role(uid uuid, role_name text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = uid
      and r.name = role_name
  );
end;
$$;

create or replace function public.is_user_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return public.has_role(p_user_id, 'admin');
end;
$$;

create or replace function public.is_role_admin_id(p_role_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare v_is_admin boolean;
begin
  select (r.name = 'admin') into v_is_admin
  from public.roles r
  where r.id = p_role_id;
  return coalesce(v_is_admin, false);
end;
$$;

-- Guard: prevent deleting/demoting last admin user
create or replace function public.is_last_admin_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare c int;
begin
  select count(*)::int
    into c
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
  where r.name = 'admin';
  return c = 1 and public.is_user_admin(p_user_id);
end;
$$;

create or replace function public.tg_guard_last_admin()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_admin_role uuid; v_is_last boolean;
begin
  select id into v_admin_role from public.roles where name='admin' limit 1;

  if tg_op='DELETE' then
    if old.role_id = v_admin_role then
      v_is_last := public.is_last_admin_user(old.user_id);
      if v_is_last then
        raise exception 'Tidak bisa menghapus admin terakhir.';
      end if;
    end if;
    return old;
  end if;

  if tg_op='UPDATE' then
    if old.role_id = v_admin_role and new.role_id <> v_admin_role then
      v_is_last := public.is_last_admin_user(old.user_id);
      if v_is_last then
        raise exception 'Tidak bisa menurunkan role: ini admin terakhir.';
      end if;
    end if;
    return new;
  end if;

  return null;
end$$;

drop trigger if exists trg_guard_last_admin on public.user_roles;
create trigger trg_guard_last_admin
before delete or update of role_id on public.user_roles
for each row execute function public.tg_guard_last_admin();

-- =========
-- SEED ROLE
-- =========
insert into public.roles (name) values ('admin'), ('manager'), ('staff')
on conflict (name) do nothing;

grant execute on function public.has_role(uuid, text) to authenticated;
grant execute on function public.is_user_admin(uuid) to authenticated;
grant execute on function public.is_role_admin_id(uuid) to authenticated;
grant execute on function public.is_last_admin_user(uuid) to authenticated;

-- =========
-- RLS POLICIES
-- =========
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read_dev"
on public.profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update_dev"
on public.profiles
for update
to authenticated
using (
  auth.uid() = user_id
  or public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
)
with check (
  auth.uid() = user_id
  or public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

-- Prevent inserts via client
drop policy if exists "profiles_insert_block" on public.profiles;
create policy "profiles_insert_block_dev"
on public.profiles
for insert
to authenticated
with check (false);

drop policy if exists "profiles_delete_block" on public.profiles;
create policy "profiles_delete_block_dev"
on public.profiles
for delete
to authenticated
using (false);

-- ---------- ROLES ----------
drop policy if exists "roles_select_dev" on public.roles;
drop policy if exists "roles_admin_only_select" on public.roles;
create policy "roles_select_dev"
on public.roles
for select
to authenticated
using (true);

-- Write (insert/update/delete) only admin
drop policy if exists "roles_write_admin_dev" on public.roles;
drop policy if exists "roles_admin_only_all" on public.roles;
create policy "roles_write_admin_dev"
on public.roles
for all
to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

-- ---------- USER_ROLES ----------
drop policy if exists "user_roles_read_dev" on public.user_roles;
drop policy if exists "user_roles_read" on public.user_roles;
create policy "user_roles_read_dev"
on public.user_roles
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or user_id = auth.uid()
);

drop policy if exists "user_roles_insert_admin_dev" on public.user_roles;
drop policy if exists "user_roles_insert" on public.user_roles;
create policy "user_roles_insert_mgr_dev"
on public.user_roles
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or (public.has_role(auth.uid(),'manager') and not public.is_role_admin_id(role_id))
);

drop policy if exists "user_roles_update_admin_dev" on public.user_roles;
drop policy if exists "user_roles_update" on public.user_roles;
create policy "user_roles_update_admin_dev"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "user_roles_delete_admin_dev" on public.user_roles;
drop policy if exists "user_roles_delete" on public.user_roles;
create policy "user_roles_delete_admin_dev"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));
