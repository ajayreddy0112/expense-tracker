---
description: Create a spec file and feature branch for the next Spendline step
argument-hint: "<step-number> <feature-name>  e.g. 2 registration"
allowed-tools: Read, Write, Glob, Bash(git:*)
---

You are a senior developer spinning up a new feature for the
**Spendline** expense tracker. Always follow the rules in CLAUDE.md.

User input: $ARGUMENTS

## Step 1 — Working directory must be clean
Run `git status --short`. If any line is printed (uncommitted,
unstaged, or untracked files), STOP and tell the user to commit
or stash before re-running. Do not continue.

## Step 2 — Parse the arguments
From `$ARGUMENTS` extract:

1. `step_number` — zero-padded to 2 digits: `2` → `02`, `11` → `11`
2. `feature_title` — human-readable Title Case (e.g. "Registration",
   "Login and Logout")
3. `feature_slug` — kebab-case, `[a-z0-9-]` only, max 40 chars
   (e.g. `registration`, `login-logout`)
4. `branch_name` — `feature/<feature_slug>`

If any of these can't be inferred, ask the user to clarify before
proceeding.

## Step 3 — Branch name must be unique
Run `git branch --list` AND `git branch -r --list` to check locally
and on `origin`. If `<branch_name>` already exists in either,
append `-01`, `-02`, … until unique.

## Step 4 — Switch to main and update
Run:
```
git checkout main
git pull --ff-only origin main
```
If `pull` fails (no upstream, network, or non-fast-forward), STOP
and surface the error to the user.

## Step 5 — Create and switch to the feature branch
```
git checkout -b <branch_name>
```

## Step 6 — Research the codebase
Read these before writing the spec:

- `CLAUDE.md` — conventions, env, auth model, data layer, modal
  pattern, forms, charts, db migrations, deferred follow-ups
- `app/layout.tsx` and `app/dashboard/layout.tsx` — root + auth-gated
  layouts; new pages render under one of these
- `app/dashboard/actions.ts` — existing server actions; mimic this
  shape for any new write paths
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
  — the three auth surfaces; do **not** invent a fourth client
- `lib/schemas.ts`, `lib/types.ts`, `lib/dates.ts`, `lib/categories.ts`
  — reuse existing helpers; do not duplicate
- `supabase/migrations/*.sql` — existing schema + RLS policies
- All files under `.claude/specs/` (use Glob `.claude/specs/*.md`)
  — avoid duplicating an already-specced feature; if the directory
  is empty or missing, that's fine

Check the **Project history** section of CLAUDE.md to confirm the
requested step is not already shipped. If it is, warn the user and
stop without writing a spec or branching.

## Step 7 — Write the spec

Use exactly this structure:

```markdown
# Spec: <feature_title>

## Overview
One paragraph: what this feature does and why it belongs at this
stage of the Spendline roadmap.

## Depends on
Which previous specs/features must be in place. If none, say "None".

## Routes (App Router)
Every new page or route handler:
- `app/<segment>/page.tsx` — description — auth-gated? (yes via
  `app/dashboard/layout.tsx`, or no)
- `app/api/<segment>/route.ts` — only if a route handler is genuinely
  required (most reads belong in Server Components; most writes in
  server actions)
If none: "No new routes".

## Server actions
New entries in `app/dashboard/actions.ts` (or a new `actions.ts`
co-located with the route). For each:
- name, input shape (refer to a Zod schema in `lib/schemas.ts`),
  what it writes, which `revalidatePath` calls follow.
If none: "No new server actions".

## Database changes
New tables, columns, indexes, RLS policies. Always cross-check
`supabase/migrations/*.sql` first. If changes are needed:
- New migration file: `supabase/migrations/<NNNN>_<slug>.sql`
- Must be idempotent (CREATE … IF NOT EXISTS, etc.) per CLAUDE.md
- RLS: enable on every new table; policies keyed to
  `auth.uid() = user_id`
If none: "No database changes".

## Pages and components
- **Create:** list new files under `app/` and `components/` with
  one-line purpose and Server vs Client Component
- **Modify:** list existing files and what changes

## Files to change
Every file that will be edited.

## Files to create
Every new file that will be added.

## New dependencies
Any new npm packages, with the reason. If none: "No new dependencies".

## Rules for implementation
Specific constraints. Always include the following from CLAUDE.md:
- Three Supabase client factories: browser (`lib/supabase/client.ts`),
  server (`lib/supabase/server.ts`), and middleware. Do not mix.
- Authorize on the server with `supabase.auth.getUser()`, never
  `getSession()`.
- After client-side `signIn`/`signUp`/`signOut`, `router.push(...)`
  THEN `router.refresh()`.
- Reads: Server Components via `createSupabaseServerClient()` —
  RLS does the filtering automatically.
- Writes: server actions in `app/dashboard/actions.ts` (or
  co-located), followed by `revalidatePath` for any affected route.
- Forms: react-hook-form + Zod via `@hookform/resolvers/zod`.
  Schemas live in `lib/schemas.ts`. Surface Supabase errors via a
  local `serverError` state alongside RHF's `errors`.
- Modals: use the existing `ExpenseModals` context provider (or
  follow the same pattern) — don't open dialogs ad hoc.
- Styling: use design tokens from `app/globals.css`
  (`--ink-*`, `--paper-*`, `--accent`, `--hairline`, etc.).
  Never hardcode hex values. Use the existing `.btn`, `.input`,
  `.card`, `.modal`, `.chip`, `.seg` classes where they fit.
- Categories: visual metadata via `metaFor()` from `lib/categories.ts`.
  Names must match the seeded categories exactly.
- Dates and currency: helpers in `lib/dates.ts` (`formatINR`,
  `fmtDay`, `fmtISODate`, `parseISODate`, `startOfMonth`, etc.).
  No `date-fns` dependency.
- TypeScript strict mode. No `any` without a written reason.
- Migrations: one `.sql` file per change, numbered sequentially,
  idempotent. Apply with `node --env-file=.env.local scripts/migrate.mjs`.

Add feature-specific rules below this list as needed.

## Definition of done
A specific testable checklist. Each item must be verifiable by
running the app locally. Examples:
- [ ] `npm run dev` boots; visiting `<route>` renders without
      console errors.
- [ ] Logged-out user hitting `<route>` is redirected to `/login`.
- [ ] Submitting the form persists to `<table>` and the row is
      visible after a refresh.
- [ ] RLS: a second user cannot read or modify the first user's rows
      (verify via Supabase SQL editor or a second browser session).
- [ ] `npm run build` succeeds.
```

## Step 8 — Save the spec
Save to: `.claude/specs/<step_number>-<feature_slug>.md`
(create the directory if it doesn't exist).

## Step 9 — Report to the user
Print exactly:
```
Branch:    <branch_name>
Spec file: .claude/specs/<step_number>-<feature_slug>.md
Title:     <feature_title>
```

Then tell the user:
> Review the spec at `.claude/specs/<step_number>-<feature_slug>.md`,
> then enter Plan Mode with Shift+Tab twice to begin implementation.

Do NOT print the full spec in chat unless explicitly asked.
