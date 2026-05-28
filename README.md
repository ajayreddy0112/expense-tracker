# Spendline

A personal expense tracker: log spend under categories, browse and filter history, and see monthly rhythm at a glance. Multi-user with email/password auth — each signed-in user only sees their own data, enforced by Postgres RLS.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase** — Postgres + Auth (email/password) via `@supabase/ssr`
- **react-hook-form** + **zod** for forms and validation
- **Vercel Speed Insights** for production performance telemetry
- **Vitest** + **Testing Library** for unit/component tests, **Playwright** for E2E

No charting library — `AreaChart` and `DonutChart` are hand-rolled SVG components that consume the design tokens in `app/globals.css`.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — the bare project host, e.g. `https://xxxx.supabase.co`. **Do not** include `/rest/v1` or a trailing slash; the REST URL shown in parts of the Supabase UI will break auth with `PGRST125`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the project's anon/public key.
   - `DATABASE_URL` — the **Session pooler** URI from the Supabase Connect modal (port 5432, host like `aws-X-<region>.pooler.supabase.com`). Used only by the migration runner. URL-encode special characters in the password (`@` → `%40`).
3. Apply the schema:

   ```bash
   node --env-file=.env.local scripts/migrate.mjs
   ```

   This runs every `.sql` file in `supabase/migrations/` against `DATABASE_URL`. Each migration is idempotent, so re-runs are safe.

4. Email/password auth is enabled by default. New signups receive a confirmation email before they can sign in — `app/signup/page.tsx` detects this and renders a "check your email" view instead of redirecting.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`; use `/signup` to create an account.

## Scripts

| Command              | What it does                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server on port 3000                                    |
| `npm run build`      | Production build                                                             |
| `npm run start`      | Run the production build                                                     |
| `npm run lint`       | ESLint (eslint-config-next)                                                  |
| `npm test`           | Run Vitest unit + component tests once                                       |
| `npm run test:watch` | Vitest in watch mode                                                         |
| `npm run test:ui`    | Vitest UI                                                                    |
| `npm run test:e2e`   | Playwright E2E (run `npm run dev` separately — webServer isn't auto-started) |

E2E tests expect `PLAYWRIGHT_USER_EMAIL`, `PLAYWRIGHT_USER_PASSWORD`, `PLAYWRIGHT_USER2_EMAIL`, `PLAYWRIGHT_USER2_PASSWORD` to be set.

## Features

- **Dashboard** — monthly total, hero number, donut by category, area chart of daily rhythm, and recent expenses.
- **Expenses page** — full history with a category filter and a date-range segmented control (This month / Last month / Last 30d / This year / All / Custom).
- **Custom date range** — popover with validated boundaries; invalid, inverted, or garbage ranges downgrade safely to "This month".
- **Insights** — aggregated category and time-based breakdowns.
- **Profile** — edit display name and account info.
- **Mobile views** — separate `Mobile*` components for hero, list, sparkline, and a bottom tab bar; the mobile date chip filters locally on the already-fetched list rather than navigating.
- **Add / Edit / Delete modals** — unified provider (`components/ExpenseModals.tsx`), so any descendant can open them via `useExpenseModals()`.

## Project layout

```
app/
  layout.tsx                Root layout, fonts, Speed Insights
  page.tsx                  Redirect: signed-in → /dashboard, else → /login
  login/page.tsx            Sign-in form
  signup/page.tsx           Sign-up form (with email-confirmation flow)
  dashboard/
    layout.tsx              Single auth guard for /dashboard/*
    page.tsx                Dashboard (hero + charts + recent)
    actions.ts              Server actions: saveExpense, deleteExpense
    expenses/page.tsx       Full expense list + filters
    insights/page.tsx       Category and time-based insights
    profile/page.tsx        Profile edit
components/                 UI: charts, modals, filters, forms, mobile views
lib/
  supabase/
    client.ts               Browser Supabase factory (Client Components)
    server.ts               Server Supabase factory (Server Components / actions)
  schemas.ts                Zod schemas (login, signup, expense)
  categories.ts             Visual metadata for each category (color, icon)
  dates.ts                  Date math (no date-fns)
  rangeFilter.ts            parseRangeParams, rangeBounds, VALID_RANGES
  types.ts                  Shared types
middleware.ts               Refreshes Supabase session cookie on every request
supabase/migrations/        SQL migrations (init, seed categories, profiles)
scripts/migrate.mjs         One-shot migration runner
tests/                      Vitest (lib, components, integration) + Playwright (e2e)
```

The path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Architecture notes

### Auth: three clients, one cookie

Auth state lives in cookies and must stay synchronized across three execution contexts. Each has its own factory — do not mix them:

- **Client Components** use `createSupabaseBrowserClient()` from `lib/supabase/client.ts`.
- **Server Components, Route Handlers, server actions** use `createSupabaseServerClient()` from `lib/supabase/server.ts`.
- **`middleware.ts`** runs on every non-static request, calls `getUser()` to refresh the session cookie, and writes the updated cookies onto the response.

After any client-side auth mutation (`signIn`, `signUp`, `signOut`), call `router.push(...)` **then** `router.refresh()` so Server Components re-read the new session.

Server-side authorization always uses `getUser()` (verifies the JWT), never `getSession()` (cookie-only, unverified).

### Data layer

Reads happen in Server Components via the server Supabase client; the user's JWT comes along on the request so RLS does the filtering — no manual `.eq("user_id", ...)` needed. There is no separate API layer.

Writes go through server actions in `app/dashboard/actions.ts`. After a successful action they `revalidatePath("/dashboard")` and `revalidatePath("/dashboard/expenses")` so the next render re-fetches. Client forms call the action via `useTransition`, then `router.refresh()` to repaint the current view.

### Database

- `0001_init.sql` — `public.categories` and `public.expenses`, RLS enabled. Categories: read-only for `authenticated`. Expenses: four policies (`select/insert/update/delete`), all keyed to `auth.uid() = user_id`. Includes the `(user_id, spent_on desc)` index.
- `0002_seed_categories.sql` — idempotent insert of the seven canonical categories with emoji icons.
- `0003_profiles.sql` — `public.profiles` table for user display info.

`lib/categories.ts` carries the *visual* metadata (color, fallback icon) for each category, keyed by `name`. Names there must match the seeded names exactly or `metaFor()` falls back to "Other".

## Further reading

- [`CLAUDE.md`](./CLAUDE.md) — full architecture and conventions guide
- [`PLAN.md`](./PLAN.md) — original implementation spec (historical; everything in it has shipped)
