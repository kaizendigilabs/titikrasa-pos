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
