 Expense Tracker — Implementation Plan                                                                                                                   
                                                                                                                                                         
 Context

 The repo is currently empty (just a README). The user wants a personal expense tracker as a web app where they can record expenses under predefined
 categories, view/filter them, edit/delete entries, and see monthly summaries with charts. Data will live in a cloud database so it's accessible from
 any device. Auth is multi-user with email/password so each signed-in user only sees their own data.

 Outcome: a deployable Next.js + Supabase app where a user can sign up, log expenses, see their history, and visualize monthly spending by category.

 Tech Stack

 - Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS
 - Backend / DB / Auth: Supabase (Postgres + Supabase Auth, email/password)
 - Charts: Recharts (simple, React-friendly, works well with Next.js)
 - Forms: react-hook-form + zod for validation
 - Date handling: date-fns (lightweight, tree-shakeable)

 Database Schema (Supabase)

 categories (seed-only, read by all authenticated users)

 ┌────────┬───────────┬───────────────────────────────┐
 │ column │   type    │             notes             │
 ├────────┼───────────┼───────────────────────────────┤
 │ id     │ uuid (pk) │                               │
 ├────────┼───────────┼───────────────────────────────┤
 │ name   │ text      │ e.g. "Food", "Transport"      │
 ├────────┼───────────┼───────────────────────────────┤
 │ icon   │ text      │ emoji or icon name (optional) │
 └────────┴───────────┴───────────────────────────────┘

 Seeded with: Food, Transport, Bills, Entertainment, Shopping, Health, Other.

 expenses

 ┌─────────────┬────────────────────────┬─────────────────────────────┐
 │   column    │          type          │            notes            │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ id          │ uuid (pk)              │ default gen_random_uuid()   │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ user_id     │ uuid (fk → auth.users) │ not null                    │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ amount      │ numeric(12,2)          │ not null, > 0               │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ category_id │ uuid (fk → categories) │ not null                    │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ note        │ text                   │ optional                    │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ spent_on    │ date                   │ not null, defaults to today │
 ├─────────────┼────────────────────────┼─────────────────────────────┤
 │ created_at  │ timestamptz            │ default now()               │
 └─────────────┴────────────────────────┴─────────────────────────────┘

 Row Level Security (RLS): enable on expenses. Policies:
 - select: auth.uid() = user_id
 - insert: auth.uid() = user_id
 - update: auth.uid() = user_id
 - delete: auth.uid() = user_id

 categories table: RLS enabled, select policy allowing all authenticated users.

 Project Structure

 expense-tracker/
 ├── app/
 │   ├── layout.tsx                # Root layout, fonts, Tailwind
 │   ├── page.tsx                  # Redirects: signed-in → /dashboard, else → /login
 │   ├── login/page.tsx            # Sign in form
 │   ├── signup/page.tsx           # Sign up form
 │   ├── dashboard/
 │   │   ├── layout.tsx            # Auth guard + nav
 │   │   ├── page.tsx              # Summary cards + chart
 │   │   └── expenses/
 │   │       ├── page.tsx          # List + filters
 │   │       └── new/page.tsx      # Add expense form
 │   └── api/                      # (none needed; Supabase client-side is enough)
 ├── components/
 │   ├── ExpenseForm.tsx           # Used by new + edit (modal or inline)
 │   ├── ExpenseList.tsx           # Table with edit/delete
 │   ├── FilterBar.tsx             # Category + date-range filter
 │   ├── MonthlySummary.tsx        # Totals per category for current month
 │   └── CategoryPieChart.tsx      # Recharts pie chart
 ├── lib/
 │   ├── supabase/
 │   │   ├── client.ts             # Browser client
 │   │   └── server.ts             # Server-component client (cookies-based)
 │   ├── types.ts                  # Expense, Category types
 │   └── schemas.ts                # Zod schemas for forms
 ├── supabase/
 │   └── migrations/
 │       ├── 0001_init.sql         # Tables, RLS, policies
 │       └── 0002_seed_categories.sql
 ├── .env.local                    # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 ├── middleware.ts                 # Refresh Supabase session cookie
 └── package.json

 Implementation Steps

 1. Scaffold project
   - npx create-next-app@latest . --typescript --tailwind --app --eslint
   - Install deps: @supabase/supabase-js @supabase/ssr recharts react-hook-form zod @hookform/resolvers date-fns
 2. Supabase setup (user does this in Supabase dashboard)
   - Create a new Supabase project, copy URL + anon key into .env.local.
   - Run the two SQL migrations from supabase/migrations/ in the SQL editor.
   - Confirm email/password auth provider is enabled (it is by default).
 3. Supabase clients (lib/supabase/client.ts, lib/supabase/server.ts, middleware.ts)
   - Use @supabase/ssr for cookie-based session handling across Server Components and Route Handlers.
 4. Auth pages (app/login, app/signup)
   - Email + password forms calling supabase.auth.signInWithPassword / signUp.
   - On success, router.push('/dashboard').
 5. Dashboard layout (app/dashboard/layout.tsx)
   - Server component: read session via supabase.auth.getUser(). If no user, redirect('/login').
   - Render top nav (Dashboard / Expenses / Add / Sign out).
 6. Add expense (app/dashboard/expenses/new/page.tsx + components/ExpenseForm.tsx)
   - Fields: amount, category (select from categories), spent_on (date, default today), note.
   - Validate with Zod, submit via Supabase client insert.
 7. Expenses list + filters (app/dashboard/expenses/page.tsx, ExpenseList.tsx, FilterBar.tsx)
   - Server-component initial fetch; client component for filter interactions.
   - Filters: category dropdown, date-range (this month / last month / custom).
   - Each row has Edit (opens form modal pre-filled) and Delete (confirm dialog).
 8. Edit / delete (reuse ExpenseForm.tsx)
   - Edit performs update().eq('id', id); delete performs delete().eq('id', id). RLS ensures only the owner can touch a row.
 9. Monthly summary + chart (app/dashboard/page.tsx, MonthlySummary.tsx, CategoryPieChart.tsx)
   - Query current-month expenses, group by category in JS (or use a Postgres view later).
   - Show total for the month + a pie chart by category.
 10. Polish
   - Loading skeletons, empty states, error toasts.
   - Sign-out button calls supabase.auth.signOut() then router.push('/login').

 Critical Files to Create

 - supabase/migrations/0001_init.sql — schema + RLS policies (most important for correctness/security)
 - lib/supabase/server.ts + middleware.ts — correct session handling; getting this wrong breaks auth
 - app/dashboard/layout.tsx — the auth guard
 - components/ExpenseForm.tsx — shared between new + edit, so worth getting right once

 Verification
   - Loading skeletons, empty states, error toasts.
   - Sign-out button calls supabase.auth.signOut() then router.push('/login').

 Critical Files to Create

 - supabase/migrations/0001_init.sql — schema + RLS policies (most important for correctness/security)
 - lib/supabase/server.ts + middleware.ts — correct session handling; getting this wrong breaks auth
 - app/dashboard/layout.tsx — the auth guard
 - components/ExpenseForm.tsx — shared between new + edit, so worth getting right once

 Verification

 After implementation, verify end-to-end:

 1. npm run dev and open http://localhost:3000 → redirected to /login.
 2. Click "Sign up", create a test account with email + password → redirected to /dashboard (empty state).
 3. Add a few expenses across different categories and dates.
 4. Confirm they appear on /dashboard/expenses.
 5. Apply a category filter and a date-range filter → list narrows correctly.
 6. Edit one expense → change reflected immediately.
 7. Delete one → confirm dialog, then row gone.
 8. Go back to /dashboard → monthly total + pie chart reflect the current data.
 9. Security check: open the Supabase SQL editor and try select * from expenses as a different user → RLS should block it. Or, sign out and sign up as a
  second user → no expenses visible.
 10. Sign out → redirected to /login; visiting /dashboard redirects back to /login.

 Out of Scope (for v1)

 - Budgets per category, CSV import/export, recurring expenses, multi-currency, receipts/attachments, Google sign-in. These can be added later without
 touching the core schema.