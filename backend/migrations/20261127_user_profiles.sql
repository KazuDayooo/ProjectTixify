-- Run once in Supabase SQL Editor to persist signup profile fields.
-- Passwords remain managed and hashed by Supabase Auth in auth.users.encrypted_password.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  auth_email text unique,
  nickname text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists auth_email text;

-- Preserve the existing Supabase Auth address separately from the identifier shown to users.
update public.profiles p
set auth_email = u.email
from auth.users u
where p.user_id = u.id and p.auth_email is null;

alter table public.profiles enable row level security;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, auth_email, nickname, phone)
  values (
    new.id,
    nullif(lower(trim(new.raw_user_meta_data ->> 'login_email')), ''),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Pengguna'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    auth_email = excluded.auth_email,
    nickname = excluded.nickname,
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists sync_auth_user_profile on auth.users;
create trigger sync_auth_user_profile
after insert or update on auth.users
for each row execute function public.sync_auth_user_profile();

revoke all on function public.sync_auth_user_profile() from public, anon, authenticated;

-- Backfill existing accounts from Supabase Auth metadata.
insert into public.profiles (user_id, email, auth_email, nickname, phone)
select
  u.id,
  coalesce(nullif(lower(trim(u.raw_user_meta_data ->> 'login_email')), ''), p.email),
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'nickname', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Pengguna'
  ),
  nullif(u.raw_user_meta_data ->> 'phone', '')
from auth.users u
left join public.profiles p on p.user_id = u.id
on conflict (user_id) do update set
  email = coalesce(excluded.email, public.profiles.email),
  auth_email = excluded.auth_email,
  nickname = excluded.nickname,
  phone = coalesce(excluded.phone, public.profiles.phone),
  updated_at = now();

create unique index if not exists profiles_phone_unique_idx
  on public.profiles(phone) where phone is not null;
