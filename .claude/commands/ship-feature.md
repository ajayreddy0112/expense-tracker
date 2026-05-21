---
description: Commit, push, create PR, merge, and clean up after a Spendline feature is complete
allowed-tools: Read, Glob, Bash, mcp__github__create_pull_request, mcp__github__merge_pull_request
---

You are the **ship-feature** command for the **Spendline** expense tracker
(Next.js 15 + TypeScript + Tailwind v4 + Supabase). Always follow the rules
in `CLAUDE.md`.

## Step 0 — Pre-flight checks
Run, in order, and STOP at the first failure:

```bash
git branch --show-current
git status --short
```

- If the current branch is `main`, STOP and tell the user
  "ship-feature must run from a feature branch, not main."
- If `git status --short` prints nothing, STOP and tell the user
  "no changes to ship — commit something or switch branches first."
- If the GitHub MCP tools (`mcp__github__create_pull_request`,
  `mcp__github__merge_pull_request`) are not connected, STOP and say
  "GitHub MCP is not connected. Run /mcp to check connection."

Store the branch name as `CURRENT_BRANCH`.

## Step 1 — Resolve the spec for this feature
Glob `.claude/specs/*.md` and pick the spec that matches
`CURRENT_BRANCH` (the branch is `feature/<feature_slug>`; the spec
filename is `<NN>-<feature_slug>.md`). Read it — its **Overview** and
**Definition of done** sections feed the PR description.

If no spec matches, ask the user which spec applies before continuing.
Do not guess.

## Step 2 — Local verification (best-effort, non-blocking)
Run quick sanity checks so the PR isn't obviously broken:

```bash
npm run build
npm test
```

Surface any failures to the user and ask whether to continue. If the user
says continue, proceed; otherwise stop so they can fix.

(Skip `npm run test:e2e` — it needs a running dev server and Playwright
env vars; the user runs that manually when it matters.)

## Step 3 — Generate commit message
Run:
```bash
git diff --staged
git diff
git log main..HEAD --oneline
```

Generate a Conventional Commit message:
- `feat:` new user-facing capability
- `fix:` bug fix
- `chore:` config, tooling, deps
- `docs:` documentation only
- `test:` tests-only change
- `refactor:` no behavior change

Rules:
- Lowercase
- No period at the end
- Under 72 characters
- Describes what the user can now do, not what the code does

Good: `feat: filter expenses by custom date range`
Bad:  `feat: add CustomRangePopover component and rangeBounds helper`

## Step 4 — Commit
Stage explicit files (never `git add -A` blindly — never commit `.env*`,
credentials, or unrelated debris):

```bash
git add <specific files from the diff above>
git commit -m "<generated-message>"
```

Report: `✓ Committed — <message>`

## Step 5 — Push the feature branch
```bash
git push -u origin <CURRENT_BRANCH>
```
Report: `✓ Pushed — <CURRENT_BRANCH>`

## Step 6 — Create PR via GitHub MCP
Use `mcp__github__create_pull_request` to open a PR from
`CURRENT_BRANCH` into `main` on `ajayreddy0112/expense-tracker`.

- **Title:** plain-English feature name, no Conventional Commit prefix
  Example: `Filter expenses by custom date range`
- **Body:** use this template, filled from the spec:

```markdown
## What this PR does
<one paragraph adapted from the spec's Overview>

## Changes
<bullet list of every file touched with a one-line description each>

## Definition of done
<copy the spec's Definition of done checklist; mark every item [x] that
this PR delivers. Leave unchecked any item that's intentionally out of
scope and note why.>

## How to test
1. `npm run dev` and open http://localhost:3000
2. Sign in (or sign up) — Spendline uses Supabase auth; there are no
   shared demo credentials, so use your own account
3. <specific steps from the spec to verify this feature works>

## Notes
- Migrations (if any): `node --env-file=.env.local scripts/migrate.mjs`
- Tests: `npm test` (unit), `npm run test:e2e` (Playwright — needs the
  `PLAYWRIGHT_USER_*` env vars and `npm run dev` running)
```

Report: `✓ PR created — <PR URL>`

If PR creation fails, STOP — do not merge.

## Step 7 — Merge the PR via GitHub MCP
Use `mcp__github__merge_pull_request` with **squash** merge.
Report: `✓ PR merged to main (squash)`

## Step 8 — Switch to main and pull
```bash
git checkout main
git pull --ff-only origin main
```
Report: `✓ Switched to main — up to date`

## Step 9 — Delete the local feature branch
The remote branch is deleted automatically by GitHub's "delete branch
on merge" setting if enabled; otherwise the user will tidy it from the
PR page. We only delete locally:

```bash
git branch -d <CURRENT_BRANCH>
```

Use `-d` (safe), not `-D` (force). If `-d` refuses because the branch
isn't merged locally, surface the error — don't force-delete.

Report: `✓ Local branch deleted`

## Final summary
Print exactly:
```
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
/ship-feature complete
✓ Committed — <message>
✓ Pushed — <branch>
✓ PR created and merged (squash)
✓ Switched to main
✓ Local branch deleted
Next: run /create-spec for the next feature
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
```

## Rules
- Never commit directly to `main`.
- Never run from `main` — must be on a feature branch.
- Never `git add -A` / `git add .` without inspecting the diff first;
  Spendline's `.env.local` and Supabase keys must never be committed.
- Always use **squash** merge.
- Never skip git hooks (`--no-verify`) unless the user explicitly asks.
- If GitHub MCP is not connected, stop and say:
  "GitHub MCP is not connected. Run /mcp to check connection."
- If push fails due to no upstream, retry once with
  `git push -u origin <CURRENT_BRANCH>`.
- Never proceed to merge if PR creation fails.
- Never run `/code-review-feature` or `/test-feature` here — those are
  separate steps the user runs before shipping.
