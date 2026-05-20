-- Spendline: profiles table mirroring auth.users.
-- Populated via trigger when a new auth.users row is inserted.
-- Idempotent: safe to re-apply.

-- ── table ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text not null default '' check (length(first_name) <= 60),
  last_name     text not null default '' check (length(last_name)  <= 60),
  gender        text not null default 'male'
                check (gender in ('male','female')),
  date_of_birth date not null default current_date
                check (date_of_birth between date '1900-01-01' and current_date),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── narrow gender values (re-applying this migration after the original
--    deployment that allowed 'non-binary' / 'prefer-not-to-say') ────────
-- Migrate any rows holding the now-removed values to 'male' (arbitrary placeholder
-- since we have no signal which the user prefers). The user can correct via
-- /dashboard/profile.
update public.profiles set gender = 'male'
  where gender not in ('male','female');

-- Reset the default to 'male' if a previous deployment set it differently.
alter table public.profiles alter column gender set default 'male';

-- Drop + re-add the CHECK constraint so the allowed-values list is current.
-- profiles_gender_check is the auto-generated name from the inline CHECK.
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check check (gender in ('male','female'));

alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── insert via trigger on auth.users ────────────────────────
-- security definer so Supabase Auth (running as supabase_auth_admin)
-- can write to public.profiles regardless of RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, gender, date_of_birth)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name',  ''),
    coalesce(new.raw_user_meta_data->>'gender',     'male'),
    coalesce((new.raw_user_meta_data->>'date_of_birth')::date, current_date)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── auto-maintain updated_at on updates ─────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── backfill existing users ─────────────────────────────────
-- Any pre-existing auth.users row gets a placeholder profile.
insert into public.profiles (id, first_name, last_name, gender, date_of_birth)
  select u.id, '', '', 'male', current_date
  from auth.users u
  on conflict (id) do nothing;
