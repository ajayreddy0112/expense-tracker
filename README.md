# Expense Tracker

A personal expense tracker web app: log expenses under categories, view/filter history, and see monthly spending summaries. Multi-user with email/password auth so each signed-in user only sees their own data.

See [`PLAN.md`](./PLAN.md) for the full feature roadmap and database schema.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind v4**
- **Supabase** — Postgres + Auth (email/password) via `@supabase/ssr`
- **react-hook-form** + **zod** for forms and validation

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — the bare project host, e.g. `https://xxxx.supabase.co`. **Do not** include `/rest/v1` or a trailing slash; the REST URL shown in some parts of the Supabase UI will break auth.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the project's anon/public key.
3. Email/password auth is enabled by default. New signups receive a confirmation email before they can sign in.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`; use `/signup` to create an account.

## Scripts

| Command         | What it does                  |
| --------------- | ----------------------------- |
| `npm run dev`   | Start the dev server          |
| `npm run build` | Production build              |
| `npm run start` | Run the production build      |
| `npm run lint` | ESLint (eslint-config-next)   |

## Project layout

```
app/
  layout.tsx          Root layout
  page.tsx            Redirects: signed-in → /dashboard, else → /login
  login/page.tsx      Sign-in form
  signup/page.tsx     Sign-up form (with email-confirmation flow)
  dashboard/page.tsx  Authed landing page
lib/
  supabase/
    client.ts         Browser Supabase client factory
    server.ts         Server Component / Route Handler client factory
  schemas.ts          Zod schemas for forms
middleware.ts         Refreshes the Supabase session cookie on every request
```

The path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Auth notes

Auth state lives in cookies. Three contexts must stay in sync:

- **Client Components** use `createSupabaseBrowserClient()` from `lib/supabase/client.ts`.
- **Server Components / Route Handlers** use `createSupabaseServerClient()` from `lib/supabase/server.ts`.
- **`middleware.ts`** runs on every non-static request, calls `getUser()` to refresh the session cookie, and writes the updated cookies onto the response.

After any client-side auth mutation (`signIn`, `signUp`, `signOut`), call `router.push(...)` then `router.refresh()` so Server Components re-read the new session.
