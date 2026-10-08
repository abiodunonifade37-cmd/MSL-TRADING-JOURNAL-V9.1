-- MSL Trading Journal V9.1
-- Run this entire script in Supabase SQL Editor.
-- Authentication: EMAIL + PASSWORD ONLY.
-- Do not put your service_role/secret key in the PWA.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  default_market text default 'Forex',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date timestamptz not null default now(),
  pair text not null,
  direction text not null default 'Long',
  setup text not null default 'Reversal',
  session text default 'London',
  liquidity text default '',
  sweep text default '',
  zone text default '',
  entry_model text default '',
  confirmation text default '',
  risk_r numeric default 1,
  result text default 'BE',
  r_multiple numeric default 0,
  model_version text default '',
  seen text default '',
  review text default '',
  mistake text default '',
  image_url text default '',
  checks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text default 'Both',
  version text default '1.0',
  market text default 'Forex',
  liquidity text default '',
  confirmation text default '',
  execution text default '',
  risk text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at before update on public.trades
for each row execute function public.set_updated_at();

drop trigger if exists models_updated_at on public.models;
create trigger models_updated_at before update on public.models
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id) values(new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.models enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
for all using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists "trades own rows" on public.trades;
create policy "trades own rows" on public.trades
for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists "models own rows" on public.models;
create policy "models own rows" on public.models
for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Optional screenshot storage bucket.
insert into storage.buckets (id,name,public) values ('trade-screenshots','trade-screenshots',false)
on conflict (id) do nothing;

drop policy if exists "users upload own trade screenshots" on storage.objects;
create policy "users upload own trade screenshots" on storage.objects
for insert to authenticated
with check (bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "users read own trade screenshots" on storage.objects;
create policy "users read own trade screenshots" on storage.objects
for select to authenticated
using (bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "users delete own trade screenshots" on storage.objects;
create policy "users delete own trade screenshots" on storage.objects
for delete to authenticated
using (bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);
