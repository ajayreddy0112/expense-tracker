# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (eslint-config-next; currently prompts for interactive setup on first run)
- `npm run test` — Vitest unit + component tests (jsdom, single run)
- `npm run test:watch` / `npm run test:ui` — Vitest watch / UI mode
- `npm run test:e2e` — Playwright E2E. The webServer is **not** auto-started; run `npm run dev` in another terminal first.
- `node --env-file=.env.local scripts/migrate.mjs` — apply every `.sql` file in `supabase/migrations/` against the project pointed at by `DATABASE_URL`. Each file runs in its own transaction; migrations are idempotent.

### Test layout

- `vitest.config.ts` — jsdom env, `@vitejs/plugin-react`, `@/*` alias, setup file `tests/setup.ts` (registers `@testing-library/jest-dom`).
- `tests/lib/` — pure-function unit tests (e.g. `rangeFilter.test.ts`).
- `tests/components/` — React component tests via `@testing-library/react` + `user-event`. Most need `next/navigation` mocked (`useRouter` / `usePathname` / `useSearchParams`); `MobileExpenses` also needs `@/components/ExpenseModals` mocked.
- `tests/integration/` — Server-side render tests (e.g. `expensesPage.test.ts`).
- `tests/e2e/` — Playwright specs. Requires `PLAYWRIGHT_USER_EMAIL` / `PLAYWRIGHT_USER_PASSWORD` (and `*_USER2_*` for multi-user cases) in the env.

## Environment

Copy `.env.local.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` — **bare project host only** (e.g. `https://xxxx.supabase.co`). Do not include `/rest/v1` or a trailing slash; Supabase's UI sometimes shows the REST URL and that breaks auth with `PGRST125`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key. Used by all three Supabase client factories.
- `DATABASE_URL` — Postgres connection string used **only** by `scripts/migrate.mjs`. Must be the **Session pooler** URI from the Supabase Connect modal (port 5432, host like `aws-X-<region>.pooler.supabase.com`). The direct-connection host (`db.<ref>.supabase.co`) is IPv6-only on the free plan and will fail with `ENOTFOUND` on most networks. Special characters in the password must be URL-encoded (`@` → `%40`, etc.).

`DATABASE_URL` has no `NEXT_PUBLIC_` prefix so Next.js keeps it server-side; it must never leak to client bundles.

## Architecture

Next.js 15 App Router + TypeScript + Tailwind v4 + Supabase (Postgres + Auth). Path alias `@/*` maps to the repo root (see `tsconfig.json`). Geist + Instrument Serif loaded via `next/font/google` and exposed as CSS variables in `app/layout.tsx`; design tokens live at `:root` in `app/globals.css`. `@vercel/speed-insights` is mounted once in the root layout — keep `<SpeedInsights />` at the end of `<body>`.

### Routes

- `/` — redirects signed-in users to `/dashboard`, else `/login`.
- `/login`, `/signup` — auth pages (split layout with `components/AuthMarketingRail.tsx`).
- `/dashboard` — hero number + chart + recent expenses (desktop) / mobile hero + sparkline + list.
- `/dashboard/expenses` — filterable list (category + date range).
- `/dashboard/insights` — category breakdown / donut + extras.
- `/dashboard/profile` — profile edit form; writes go through `app/dashboard/profile/actions.ts`.

### Supabase auth: three clients, one cookie

Auth state lives in cookies and must stay synchronized across three execution contexts. Each has its own factory — do not mix them:

- `lib/supabase/client.ts` → `createSupabaseBrowserClient()` for Client Components (`"use client"`). Used by login/signup forms that call `supabase.auth.signInWithPassword` / `signUp` and by the sign-out button.
- `lib/supabase/server.ts` → `createSupabaseServerClient()` for Server Components, Route Handlers, and server actions. Reads/writes cookies via `next/headers`. The `setAll` swallows errors because Server Components cannot mutate cookies; the middleware compensates.
- `middleware.ts` → runs on every non-static request, calls `supabase.auth.getUser()` to refresh the session cookie, and writes the updated cookies onto the response. The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and common image extensions.

After client-side auth mutations (`signIn`, `signUp`, `signOut`), call `router.push(...)` **then** `router.refresh()` so Server Components re-read the new session.

### Auth gating

`app/dashboard/layout.tsx` is the single auth guard for everything under `/dashboard/*` — it calls `supabase.auth.getUser()` and `redirect("/login")` if absent. `app/page.tsx` does the same for the root route (signed-in → `/dashboard`, else → `/login`). Server-side authorization elsewhere always uses `getUser()` (verifies the JWT), never `getSession()` (cookie-only, unverified).

### Data layer: Server Components + server actions

Reads happen in Server Components via `createSupabaseServerClient()`; the user's JWT comes along on the request so RLS does the filtering. There is no separate API layer.

Writes go through server actions in `app/dashboard/actions.ts` (`saveExpense`, `deleteExpense`). After a successful action, they call `revalidatePath("/dashboard")` and `revalidatePath("/dashboard/expenses")` so the next render re-fetches. Client forms call the action via `useTransition`, then `router.refresh()` to repaint the current view.

### Modal pattern

`components/ExpenseModals.tsx` is a Client Component context provider that hosts the Add / Edit / Delete modals. Wrap any page that needs to open them once at the top (the dashboard page and the expenses list page do this), then call `useExpenseModals()` from any descendant button. The Edit modal's Delete button transitions the same provider into the Delete state — no double-portal flicker.

### Forms

react-hook-form + Zod via `@hookform/resolvers/zod`. Shared schemas live in `lib/schemas.ts` (`loginSchema`, `signupSchema`, `expenseSchema`). Surface Supabase errors via a local `serverError` state alongside RHF's `errors` — every form in the app uses this pattern.

### Signup confirmation flow

`supabase.auth.signUp` returns `data.session = null` when email confirmation is required. `app/signup/page.tsx` detects this and renders a "check your email" view instead of redirecting — preserve that branch if you change the signup flow.

### Charts

Custom SVG, no Recharts dep. `components/AreaChart.tsx` (smooth daily-rhythm fill) is a Server Component; `components/DonutChart.tsx` (hover-aware) is a Client Component. Both consume design tokens (`var(--accent)`, etc.) so they re-theme automatically. Date math uses `lib/dates.ts` — no `date-fns` dep.

### Date-range filter (`/dashboard/expenses`)

`lib/rangeFilter.ts` is the single source of truth for the range param. `parseRangeParams({ range, from, to })` validates URL state and **always downgrades to `thismonth`** on bad input (unknown range, missing/malformed `from`/`to` on `range=custom`, `from > to`, dates before `1900-01-01`). `rangeBounds(range, customFrom, customTo)` returns the Postgres `gte`/`lte` window; for `range=all` it returns `{}` so the dashboard query skips both bounds.

UI is split:

- Desktop — `components/FilterBar.tsx` is a segmented control. Switching presets must update the URL in a **single** `router.push` (use `setParams(record)`) so `from`/`to`/`range` flip atomically. `components/CustomRangePopover.tsx` is the date-picker dialog and exports `ApplyPayload`.
- Mobile — `components/MobileExpenses.tsx` filters the already-fetched expenses array in-memory; the chip does **not** call `router.push`. This is intentional — keep mobile URL-agnostic.

A query is "filtered" when `categoryId !== null || range !== "all"` — `thismonth` counts as filtered, which is what swaps the empty state from "A clean slate" to "Nothing matches."

### RLS contract

Server queries should **not** add `.eq("user_id", auth.uid())` manually — the server client carries the user's JWT and RLS does the filtering. Manual `user_id` filters are redundant and tested against (`expensesPage.test.ts` asserts no such `.eq` is issued).

## Database

Schema lives in `supabase/migrations/`:

- `0001_init.sql` — creates `public.categories` and `public.expenses`, enables RLS on both. Categories: read-only for `authenticated`. Expenses: four policies (`select / insert / update / delete`), all keyed to `auth.uid() = user_id`. Includes the `(user_id, spent_on desc)` index that backs the dashboard's primary query.
- `0002_seed_categories.sql` — idempotent insert of the seven canonical categories with emoji icons.
- `0003_profiles.sql` — `public.profiles` (1:1 with `auth.users`) holding `first_name`, `last_name`, `gender` (`'male' | 'female'`), `date_of_birth`. RLS lets a user select/update only their own row. New auth users are populated via the `on_auth_user_created` trigger (security-definer `handle_new_user`) which reads `raw_user_meta_data`; the signup form must pass these fields. The migration is idempotent and re-narrows `gender` (an earlier deployment briefly allowed `non-binary` / `prefer-not-to-say`; any such rows are coerced to `male`). `updated_at` is maintained by the `profiles_set_updated_at` trigger.

To apply against a fresh project: set `DATABASE_URL` in `.env.local` (Session pooler URI, see Environment), then `node --env-file=.env.local scripts/migrate.mjs`. The runner is one-shot: it has no migration history table, so re-running is safe (every migration is idempotent) but you can't roll forward selectively. For multi-developer projects, switch to `supabase migration new` + `supabase db push`.

`lib/categories.ts` carries the *visual* metadata (color, fallback icon) for each category, keyed by `name`. Names there must match the seeded names in `0002_seed_categories.sql` exactly or `metaFor()` falls back to "Other".

## Project history

`PLAN.md` was the original implementation spec — at time of writing, everything in it has shipped. Treat it as a historical design doc, not as live scope.

Since then: mobile-responsive pass (`components/Mobile*.tsx`, `SidebarNav.tsx`), date-range filter (`lib/rangeFilter.ts` + `FilterBar` + `CustomRangePopover`), profile management (`0003_profiles.sql` + `/dashboard/profile`), Vercel Speed Insights, and a Vitest + Playwright test stack have all landed.

Still-deferred follow-ups: Export CSV button (currently disabled), Tweaks panel from the design prototype, alternate chart variants (bars / treemap), and migrating from the legacy `anon` key to Supabase's new publishable-key model.
