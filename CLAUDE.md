# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (eslint-config-next)

No test runner is configured.

## Environment

Copy `.env.local.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL` — **bare project host only** (e.g. `https://xxxx.supabase.co`). Do not include `/rest/v1` or a trailing slash; Supabase's UI sometimes shows the REST URL and that breaks auth with `PGRST125`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both are read directly via `process.env` in the three Supabase client factories below.

## Architecture

Next.js 15 App Router + TypeScript + Tailwind v4 + Supabase (Postgres, Auth). Path alias `@/*` maps to the repo root (see `tsconfig.json`).

### Supabase auth: three clients, one cookie

Auth state lives in cookies and must stay synchronized across three execution contexts. Each has its own factory — do not mix them:

- `lib/supabase/client.ts` → `createSupabaseBrowserClient()` for Client Components (`"use client"`). Used by login/signup forms that call `supabase.auth.signInWithPassword` / `signUp`.
- `lib/supabase/server.ts` → `createSupabaseServerClient()` for Server Components / Route Handlers. Reads/writes cookies via `next/headers`. The `setAll` swallows errors because Server Components cannot mutate cookies; the middleware compensates.
- `middleware.ts` → runs on every non-static request, calls `supabase.auth.getUser()` to refresh the session cookie, and writes the updated cookies onto the response. This is what keeps server-rendered pages seeing a fresh session. The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and common image extensions.

After client-side auth mutations (`signIn`, `signUp`, `signOut`), call `router.push(...)` **then** `router.refresh()` so Server Components re-read the new session.

### Auth gating

There is no shared dashboard layout guard yet. Server pages that require auth call `supabase.auth.getUser()` themselves and `redirect("/login")` if absent (see `app/page.tsx`, `app/dashboard/page.tsx`). When adding new authed routes, follow the same pattern or introduce `app/dashboard/layout.tsx` as the single guard.

### Forms

react-hook-form + Zod via `@hookform/resolvers/zod`. Shared schemas live in `lib/schemas.ts` (`loginSchema`, `signupSchema`). Surface Supabase errors via a local `serverError` state alongside RHF's `errors` — the existing login/signup pages are the pattern.

### Signup confirmation flow

`supabase.auth.signUp` returns `data.session = null` when email confirmation is required. `app/signup/page.tsx` detects this and renders a "check your email" view instead of redirecting — preserve that branch if you change the signup flow.

## Project scope (PLAN.md)

`PLAN.md` is the source of truth for unbuilt scope: expenses CRUD, filters, monthly summary + Recharts pie chart, and the Supabase schema (`categories`, `expenses` with RLS `auth.uid() = user_id` on all four CRUD policies). The `supabase/migrations/` directory and `components/` directory referenced there do not exist yet — create them when implementing those features. Recharts and date-fns are listed in the plan but not yet installed.
