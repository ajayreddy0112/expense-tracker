-- Spendline schema: categories + expenses with per-user RLS.
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ── categories ──────────────────────────────────────────────
create table if not exists public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text
);

alter table public.categories enable row level security;

drop policy if exists "categories readable by authenticated" on public.categories;
create policy "categories readable by authenticated"
  on public.categories for select
  to authenticated
  using (true);

-- ── expenses ────────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  category_id uuid not null references public.categories(id),
  note        text,
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists expenses_user_spent_on_idx
  on public.expenses (user_id, spent_on desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses select own" on public.expenses;
create policy "expenses select own"
  on public.expenses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "expenses insert own" on public.expenses;
create policy "expenses insert own"
  on public.expenses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "expenses update own" on public.expenses;
create policy "expenses update own"
  on public.expenses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "expenses delete own" on public.expenses;
create policy "expenses delete own"
  on public.expenses for delete
  to authenticated
  using (auth.uid() = user_id);
