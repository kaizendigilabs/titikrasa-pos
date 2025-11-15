-- Categories
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  icon_url   text,
  created_at timestamptz not null default now()
);
create index if not exists idx_categories_active on categories(is_active);
alter table public.categories enable row level security;

drop policy if exists "categories_select_staff" on public.categories;
drop policy if exists "categories_insert_admin_mgr" on public.categories;
drop policy if exists "categories_update_admin_mgr" on public.categories;
drop policy if exists "categories_delete_admin" on public.categories;

create policy "categories_select_staff"
on public.categories
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "categories_insert_admin_mgr"
on public.categories
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "categories_update_admin_mgr"
on public.categories
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

create policy "categories_delete_admin"
on public.categories
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));

-- Menus (menu-centric; harga ex-PPN)
create table if not exists menus (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  sku           text,
  category_id   uuid references categories(id) on delete set null,
  price         integer,                -- untuk simple menu (retail)
  reseller_price integer,               -- untuk simple menu (reseller)
  is_active     boolean not null default true,
  thumbnail_url text,
  variants      jsonb,                  -- null = simple; object = matrix size×temperature + default + harga per channel
  created_at    timestamptz not null default now()
);
create index if not exists idx_menus_category on menus(category_id);
create index if not exists idx_menus_active on menus(is_active);
create index if not exists idx_menus_name_trgm on menus using gin (name gin_trgm_ops);
alter table public.menus enable row level security;

drop policy if exists "menus_select_staff" on public.menus;
drop policy if exists "menus_write_admin_mgr" on public.menus;
drop policy if exists "menus_update_admin_mgr" on public.menus;
drop policy if exists "menus_delete_admin" on public.menus;

create policy "menus_select_staff"
on public.menus
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "menus_write_admin_mgr"
on public.menus
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "menus_update_admin_mgr"
on public.menus
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

create policy "menus_delete_admin"
on public.menus
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));

-- Recipes (base + variant overrides)
create table if not exists recipes (
  id               uuid primary key default gen_random_uuid(),
  menu_id          uuid not null references menus(id) on delete cascade,
  version          int  not null default 1,
  effective_from   timestamptz not null default now(),
  items            jsonb not null,                     -- [{ingredient_id, qty, uom}]
  thumbnail_url    text,
  method_steps     jsonb not null default '[]'::jsonb, -- [{step_no, instruction}]
  method_overrides jsonb not null default '{}'::jsonb, -- {"s_hot":[{...}], ...}
  created_at       timestamptz not null default now()
);
create index if not exists idx_recipes_menu on recipes(menu_id);
alter table public.recipes enable row level security;

drop policy if exists "recipes_select_staff" on public.recipes;
drop policy if exists "recipes_write_admin_mgr" on public.recipes;
drop policy if exists "recipes_update_admin_mgr" on public.recipes;
drop policy if exists "recipes_delete_admin" on public.recipes;

create policy "recipes_select_staff"
on public.recipes
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "recipes_write_admin_mgr"
on public.recipes
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "recipes_update_admin_mgr"
on public.recipes
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

create policy "recipes_delete_admin"
on public.recipes
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));

create table if not exists recipe_variant_overrides (
  id             uuid primary key default gen_random_uuid(),
  menu_id        uuid not null references menus(id) on delete cascade,
  size           text not null check (size in ('s','m','l')),
  temperature    text not null check (temperature in ('hot','ice')),
  version        int  not null default 1,
  effective_from timestamptz not null default now(),
  items          jsonb not null,   -- [{ingredient_id, qty, uom}]
  created_at     timestamptz not null default now(),
  unique (menu_id, size, temperature, version)
);
alter table public.recipe_variant_overrides enable row level security;

drop policy if exists "recipe_variant_select_staff" on public.recipe_variant_overrides;
drop policy if exists "recipe_variant_write_admin_mgr" on public.recipe_variant_overrides;
drop policy if exists "recipe_variant_update_admin_mgr" on public.recipe_variant_overrides;
drop policy if exists "recipe_variant_delete_admin" on public.recipe_variant_overrides;

create policy "recipe_variant_select_staff"
on public.recipe_variant_overrides
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'staff')
);

create policy "recipe_variant_write_admin_mgr"
on public.recipe_variant_overrides
for insert
to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "recipe_variant_update_admin_mgr"
on public.recipe_variant_overrides
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

create policy "recipe_variant_delete_admin"
on public.recipe_variant_overrides
for delete
to authenticated
using (public.has_role(auth.uid(),'admin'));
