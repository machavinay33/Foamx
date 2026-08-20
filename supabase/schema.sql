-- FOAMX Supabase schema
-- Run in Supabase SQL Editor. Create the first admin user in Auth, then set its role in public.profiles.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  gallery text[] not null default '{}',
  video_url text,
  status text not null default 'active' check (status in ('active','inactive')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  banner_image text,
  start_date date,
  end_date date,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null,
  email text,
  address text not null,
  city text,
  state text,
  pincode text,
  notes text,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(10,2) generated always as (price * quantity) stored
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "public can read active products" on public.products for select using (status = 'active' or public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "public can read active offers" on public.offers for select using (active = true or public.is_admin());
create policy "admins manage offers" on public.offers for all using (public.is_admin()) with check (public.is_admin());
create policy "anyone can submit orders" on public.orders for insert with check (true);
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "anyone can submit order items" on public.order_items for insert with check (true);
create policy "admins read order items" on public.order_items for select using (public.is_admin());
create policy "users read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());

insert into public.products (name, slug, description, price, image_url, featured, sort_order)
values
  ('Ceramic Wash', 'ceramic-wash', 'A high-lubricity ceramic wash that lifts grime and leaves a slick, reflective finish.', 399, '/manus-storage/foamx-logo_a3478e2a.heic', true, 1),
  ('Foam Shampoo', 'foam-shampoo', 'Thick, pH-balanced snow foam engineered for a deep clean without compromising protection.', 349, '/manus-storage/foamx-logo_a3478e2a.heic', true, 2)
on conflict (slug) do nothing;
