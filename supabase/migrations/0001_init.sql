-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Filters table
create table if not exists public.filters (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  series text,
  nominal_w int not null,
  nominal_h int not null,
  thickness int not null,
  merv int,
  sku text not null,
  upc text,
  product_name text not null,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists filters_size_idx on public.filters (nominal_w, nominal_h, thickness);
create index if not exists filters_sku_idx on public.filters (sku);
create index if not exists filters_upc_idx on public.filters (upc);
create index if not exists filters_merv_idx on public.filters (merv);

-- Aliases table
create table if not exists public.aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  filter_id uuid not null references public.filters(id) on delete cascade
);

create unique index if not exists aliases_alias_idx on public.aliases (alias);
create index if not exists aliases_filter_idx on public.aliases (filter_id);

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Admin check helper
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  );
$$;

grant execute on function public.is_admin() to public;

-- Row Level Security
alter table public.filters enable row level security;
alter table public.aliases enable row level security;
alter table public.profiles enable row level security;

-- Filters policies
create policy "Public read filters"
  on public.filters
  for select
  using (true);

create policy "Admin insert filters"
  on public.filters
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admin update filters"
  on public.filters
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin delete filters"
  on public.filters
  for delete
  to authenticated
  using (public.is_admin());

-- Aliases policies
create policy "Public read aliases"
  on public.aliases
  for select
  using (true);

create policy "Admin insert aliases"
  on public.aliases
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admin update aliases"
  on public.aliases
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin delete aliases"
  on public.aliases
  for delete
  to authenticated
  using (public.is_admin());

-- Profiles policies
create policy "Profiles select own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "Profiles insert own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid() and is_admin = false);

create policy "Admins update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
