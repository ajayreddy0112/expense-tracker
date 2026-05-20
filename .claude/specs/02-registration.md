# Spec: Registration

## Overview
The current signup at `app/signup/page.tsx` captures only email + password; everything else about the user is unknown until they manually visit a profile editor that doesn't exist yet. This spec extends registration to collect **first name, last name, gender, and date of birth** at sign-up time and persists them to a new `public.profiles` table that mirrors `auth.users`. The dashboard greeting and the profile page can then show a real name (today the dashboard greets `email.split("@")[0]`, which is ugly), and downstream features (notifications, insights copy, age-based defaults) get a real source of truth.

## Depends on
None. The existing signup flow stays — this spec extends it.

## Routes (App Router)
No new routes. All changes are to `app/signup/page.tsx` (existing) and `app/dashboard/profile/page.tsx` (existing — now reads from `profiles` instead of deriving from email).

## Server actions
New file: `app/dashboard/profile/actions.ts`
- `updateProfile(input: ProfileInput)` — updates the caller's row in `public.profiles`. Validated by `profileSchema` (new entry in `lib/schemas.ts`). On success calls `revalidatePath("/dashboard/profile")` and `revalidatePath("/dashboard")` (the dashboard greets by first name). Returns `{ ok: true } | { ok: false, error: string }` matching the existing actions' contract.

The signup itself does **not** need a server action — it stays client-side via `supabase.auth.signUp({ options: { data: {...} } })`. The trigger handles the profile row insert.

## Database changes
New migration: `supabase/migrations/0003_profiles.sql` (idempotent).

```sql
-- public.profiles — 1:1 with auth.users, populated via trigger.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text not null check (length(first_name) between 1 and 60),
  last_name     text not null check (length(last_name)  between 1 and 60),
  gender        text not null check (gender in ('male','female','non-binary','prefer-not-to-say')),
  date_of_birth date not null check (date_of_birth between '1900-01-01' and current_date),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

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

-- Insert via trigger on auth.users, reading raw_user_meta_data.
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
    coalesce(new.raw_user_meta_data->>'gender',      'prefer-not-to-say'),
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
```

Notes:
- No FK from `expenses` to `profiles` — `expenses.user_id` still references `auth.users(id)`. Profiles are auxiliary.
- The trigger is `security definer` so it can write to `public.profiles` regardless of the inserting role (Supabase Auth inserts run as `supabase_auth_admin`, which doesn't satisfy RLS).
- `on conflict (id) do nothing` makes the trigger idempotent if Supabase ever retries.
- The CHECK constraints provide defense in depth alongside the Zod schema.

## Pages and components

### Create
- `app/dashboard/profile/actions.ts` — `updateProfile` server action.
- `components/ProfileEditForm.tsx` (Client) — RHF + Zod form for editing the four profile fields on `/dashboard/profile`. Mirrors `ExpenseForm`'s pattern: local `serverError` state, `useTransition` for the action, `router.refresh()` on success.

### Modify
- `app/signup/page.tsx` — add four fields (first name, last name, gender, DOB) to the form; pass them via `options.data` to `supabase.auth.signUp`. Layout: two-column grid for first/last name and gender/DOB on desktop; single column on mobile (existing CSS handles the `.row-2` breakdown at 520 px — reuse it).
- `lib/schemas.ts` — extend `signupSchema` with `firstName`, `lastName`, `gender`, `dateOfBirth`. Add a new `profileSchema` covering the same four fields (without password) for `updateProfile`. Both share the same `nameField`, `genderEnum`, `dobField` building blocks defined at the top of the file.
- `lib/types.ts` — add `Profile` type matching the DB row.
- `app/dashboard/profile/page.tsx` — replace the `nameOf(email)` / `initialsOf(email)` derivation with a query against `public.profiles` (RLS handles filtering to the caller). Render `<ProfileEditForm initial={profile} />` instead of the static settings rows for first/last/gender/DOB. Existing settings rows (Notifications, Currency, etc.) stay.
- `app/dashboard/page.tsx` — change the dashboard greeting from `user?.email?.split("@")[0]` to `profile?.first_name ?? "there"`. Fetch the profile alongside expenses (parallel query). The mobile hero header's avatar initials should also come from `first_name + last_name`, not the email local-part. Same applies to `app/dashboard/layout.tsx` for the desktop sidebar avatar.

## Files to change
- `app/signup/page.tsx`
- `lib/schemas.ts`
- `lib/types.ts`
- `app/dashboard/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/profile/page.tsx`

## Files to create
- `supabase/migrations/0003_profiles.sql`
- `app/dashboard/profile/actions.ts`
- `components/ProfileEditForm.tsx`

## New dependencies
No new dependencies. The form uses the existing `react-hook-form` + `@hookform/resolvers/zod` + `zod` stack; the DOB picker is a plain `<input type="date">` styled with the existing `.input` class.

## Rules for implementation

Standard project rules (from CLAUDE.md):
- Three Supabase client factories — browser (`lib/supabase/client.ts`), server (`lib/supabase/server.ts`), middleware. Signup remains a Client Component call via the browser client. Profile reads go through `createSupabaseServerClient()`.
- Authorize on the server with `supabase.auth.getUser()`, never `getSession()`.
- After client-side `signIn`/`signUp`/`signOut`, `router.push(...)` THEN `router.refresh()`. Preserve this on signup; the email-confirmation branch still applies if `data.session === null`.
- Reads in Server Components; writes in server actions followed by `revalidatePath`.
- Forms use react-hook-form + Zod via `@hookform/resolvers/zod`. Schemas in `lib/schemas.ts`. Server errors surface via a local `serverError` state alongside RHF's `errors`.
- Styling: use `--ink-*`, `--paper-*`, `--accent`, `--hairline`, the existing `.input`, `.label`, `.field-error`, `.btn`, `.seg`. No hex literals.
- TypeScript strict; no `any` without a written reason.
- Migrations: one numbered `.sql`, idempotent. Apply with `node --env-file=.env.local scripts/migrate.mjs`.

Feature-specific:
- **Gender**: render as a `.seg` segmented control with the four allowed values: `Male`, `Female`, `Non-binary`, `Prefer not to say`. Stored as the lowercase kebab-case value. The Zod schema is `z.enum(['male','female','non-binary','prefer-not-to-say'])`.
- **DOB**: `<input type="date" max={todayISO} min="1900-01-01">`. The schema validates with `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` plus a `.refine` that the date isn't in the future and the user is at least 13 (COPPA floor — Supabase emails will bounce otherwise). Reuse `parseISODate` from `lib/dates.ts` for the check.
- **Age display** is computed from DOB, never stored. Add an `ageFromDOB(dob: Date): number` helper to `lib/dates.ts`. Display on the profile page only.
- **Name capitalisation**: store as the user typed it. Don't title-case on save — `Mary-Jane` and `de la Cruz` exist. The current `nameOf(email)` helper in `app/dashboard/profile/page.tsx` is replaced and can be deleted.
- **Trigger ordering**: the migration creates the `profiles` table BEFORE the function/trigger. Don't split into two migrations.
- **Backfill existing users**: there are already users (the developer's account at minimum) with no `profiles` row. The migration must include a one-time backfill: `insert into public.profiles (...) select id, '', '', 'prefer-not-to-say', current_date from auth.users on conflict (id) do nothing;` — then surface a "complete your profile" banner on `/dashboard` if any of the four fields is blank/default. Banner is out of scope for this spec; just keep the backfill row idempotent.
- **Avatar initials**: build from `first_name[0] + last_name[0]` upper-cased. Fallback to first two letters of `first_name` if `last_name` is empty; fallback to `—` if both are empty.

## Definition of done

- [ ] `node --env-file=.env.local scripts/migrate.mjs` applies `0003_profiles.sql` cleanly. Re-running is a no-op.
- [ ] `public.profiles` exists in the Supabase dashboard with the four columns, RLS enabled, and the two policies listed above.
- [ ] The trigger `on_auth_user_created` is visible in `pg_trigger` and fires on `auth.users` insert.
- [ ] `npm run dev` boots; visiting `/signup` shows the new four fields below email/password.
- [ ] Submitting the form with valid input either redirects to `/dashboard` (if Supabase auto-confirms) or shows the existing "check your email" screen. Either path results in a populated `public.profiles` row for the new user.
- [ ] Field-level Zod errors appear inline; server errors from Supabase appear in the existing `.server-error` block.
- [ ] DOB more than today, DOB before 1900-01-01, or DOB making the user under 13 is rejected with a Zod error.
- [ ] `/dashboard` greets the user by their first name (not by email local-part).
- [ ] `/dashboard/profile` shows the user's name, gender, DOB, and computed age. The edit form persists changes via `updateProfile` and the page reflects them after `router.refresh()`.
- [ ] RLS: log in as a second user and confirm you cannot SELECT or UPDATE the first user's `profiles` row via the Supabase SQL editor.
- [ ] Backfill: any pre-existing user has a `profiles` row after the migration (verify by counting `auth.users` vs `public.profiles`).
- [ ] `npm run build` succeeds (the pre-existing `tsc` strict errors in `lib/supabase/server.ts` / `middleware.ts` are out of scope — but no new errors should be introduced).
