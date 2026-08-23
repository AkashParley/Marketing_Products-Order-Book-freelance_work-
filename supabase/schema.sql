-- Personal Marketing Order Management — Supabase schema
-- Run this in the Supabase SQL editor. No auth / RLS is needed since this
-- is a single-user personal tool, but RLS is enabled with a permissive
-- policy so the anon key can be used safely if you ever add auth later.

create extension if not exists "pgcrypto";

-- ── Products ──────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'PELLET' check (type in ('PELLET','MASH')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A product can be sold in more than one bag size (25 / 40 / 50 kg),
-- each with its own rate. Selecting a pack size on an order line
-- auto-fills the rate from here.
create table if not exists product_packs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size int not null check (size in (25, 40, 50)),
  rate numeric(12,2) not null default 0,
  unique (product_id, size)
);

-- ── Parties ───────────────────────────────────────────────────────────
create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  city text,
  notes text,
  created_at timestamptz not null default now()
);

-- ── Orders ────────────────────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  order_date date not null,
  party_id uuid references parties(id) on delete set null,
  party_name_snapshot text not null,
  party_contact_snapshot text,
  difference numeric(12,2) not null default 0,
  freight numeric(12,2) not null default 0,
  -- C.D. is stored as a percentage of the order's Gross Amount, not a flat rupee value.
  cd_percent numeric(6,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Loadings ──────────────────────────────────────────────────────────
create table if not exists loadings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  loading_type text not null default 'Other',
  loading_party text not null default '',
  location text default '',
  contact text default '',
  sort_order int not null default 0
);

-- ── Order items (historical rate snapshot lives here) ───────────────────
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  loading_id uuid not null references loadings(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name_snapshot text not null,
  pack_size int not null default 50 check (pack_size in (25, 40, 50)),
  rate_snapshot numeric(12,2) not null,
  quantity numeric(12,2) not null,
  pricing_type text not null default 'NORMAL' check (pricing_type in ('NORMAL','FREE')),
  sort_order int not null default 0
);

-- order_adjustments is kept as a dedicated table per the spec, mirrored
-- 1:1 onto orders.difference/freight/cd_percent for simple reads. Both
-- representations are written together so they always agree.
create table if not exists order_adjustments (
  order_id uuid primary key references orders(id) on delete cascade,
  difference numeric(12,2) not null default 0,
  freight numeric(12,2) not null default 0,
  cd_percent numeric(6,3) not null default 0
);

create index if not exists idx_product_packs_product on product_packs(product_id);
create index if not exists idx_loadings_order on loadings(order_id);
create index if not exists idx_items_loading on order_items(loading_id);
create index if not exists idx_orders_date on orders(order_date);
create index if not exists idx_orders_party on orders(party_id);

-- Row level security: enabled with an open policy (no auth in this app).
alter table products enable row level security;
alter table product_packs enable row level security;
alter table parties enable row level security;
alter table orders enable row level security;
alter table loadings enable row level security;
alter table order_items enable row level security;
alter table order_adjustments enable row level security;

create policy "public read/write products" on products for all using (true) with check (true);
create policy "public read/write product_packs" on product_packs for all using (true) with check (true);
create policy "public read/write parties" on parties for all using (true) with check (true);
create policy "public read/write orders" on orders for all using (true) with check (true);
create policy "public read/write loadings" on loadings for all using (true) with check (true);
create policy "public read/write order_items" on order_items for all using (true) with check (true);
create policy "public read/write order_adjustments" on order_adjustments for all using (true) with check (true);

-- Seed product master (full price list)
insert into products (name, type) values
  ('Calf Starter', 'PELLET'),
  ('Heifer Pellet', 'PELLET'),
  ('Runner Dry Feed', 'PELLET'),
  ('Transition', 'PELLET'),
  ('Transition', 'MASH'),
  ('Buff Special', 'MASH'),
  ('Cow Special', 'MASH'),
  ('Energy Booster', 'PELLET'),
  ('Pioneer', 'PELLET'),
  ('Winner', 'PELLET'),
  ('Fighter', 'PELLET'),
  ('Bullet/Speed 007', 'PELLET'),
  ('Challanger', 'PELLET'),
  ('8000', 'PELLET'),
  ('6000', 'PELLET'),
  ('9000', 'MASH'),
  ('Fighter', 'MASH'),
  ('Bullet/Speed 007', 'MASH'),
  ('8000', 'MASH'),
  ('6000', 'MASH')
on conflict do nothing;

-- Seed pack sizes/rates — run once, right after the insert above, while
-- each name+type pair is still unique in the table.
insert into product_packs (product_id, size, rate)
select id, 25, 1110 from products where name = 'Calf Starter' and type = 'PELLET'
union all select id, 50, 1730 from products where name = 'Heifer Pellet' and type = 'PELLET'
union all select id, 50, 1530 from products where name = 'Runner Dry Feed' and type = 'PELLET'
union all select id, 50, 2245 from products where name = 'Transition' and type = 'PELLET'
union all select id, 50, 2215 from products where name = 'Transition' and type = 'MASH'
union all select id, 50, 1805 from products where name = 'Buff Special' and type = 'MASH'
union all select id, 50, 1805 from products where name = 'Cow Special' and type = 'MASH'
union all select id, 25, 1040 from products where name = 'Energy Booster' and type = 'PELLET'
union all select id, 50, 1865 from products where name = 'Pioneer' and type = 'PELLET'
union all select id, 50, 1680 from products where name = 'Winner' and type = 'PELLET'
union all select id, 50, 1565 from products where name = 'Fighter' and type = 'PELLET'
union all select id, 50, 1515 from products where name = 'Bullet/Speed 007' and type = 'PELLET'
union all select id, 50, 1465 from products where name = 'Challanger' and type = 'PELLET'
union all select id, 50, 1465 from products where name = '8000' and type = 'PELLET'
union all select id, 50, 1380 from products where name = '6000' and type = 'PELLET'
union all select id, 50, 1680 from products where name = '9000' and type = 'MASH'
union all select id, 50, 1565 from products where name = 'Fighter' and type = 'MASH'
union all select id, 50, 1515 from products where name = 'Bullet/Speed 007' and type = 'MASH'
union all select id, 50, 1465 from products where name = '8000' and type = 'MASH'
union all select id, 50, 1380 from products where name = '6000' and type = 'MASH'
on conflict do nothing;
