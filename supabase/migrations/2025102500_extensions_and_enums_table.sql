-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Enum Types
do $$ begin create type channel as enum ('pos','reseller'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('cash','transfer'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('paid','unpaid','void'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('open','paid','void','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type kds_item_status as enum ('queue','making','ready','served'); exception when duplicate_object then null; end $$;
do $$ begin create type po_status as enum ('draft','pending','complete'); exception when duplicate_object then null; end $$;
do $$ begin create type base_uom as enum ('gr','ml','pcs'); exception when duplicate_object then null; end $$;
