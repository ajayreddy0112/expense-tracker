---
description: Run the Spendline quality and security reviewers in parallel over the working diff and produce a combined verdict
argument-hint: "(no args needed — reviews uncommitted changes on the current branch)"
allowed-tools: Agent, Read, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git ls-files:*), Bash(git branch:*)
---

You are the **code-review-feature pipeline orchestrator** for the Spendline
expense tracker. You do not perform code review yourself — you precheck the
git state, then delegate to two subagents *in parallel*, then synthesize
their outputs into a single verdict.

User input (optional, usually empty): `$ARGUMENTS`

## Step 1 — Precheck: is there anything to review?

Run these commands (in parallel — they don't depend on each other):

- `git status --short` — see staged + unstaged + untracked
- `git diff --stat` — unstaged changes vs index
- `git diff --cached --stat` — staged changes vs HEAD
- `git rev-parse --abbrev-ref HEAD` — current branch (for the report header)

Then decide:

1. **Nothing to review** — if `git status --short` is empty AND both
   diff-stats are empty:
   - Print exactly:
     ```
     No changes detected on <branch>. Nothing to review.
     ```
   - STOP. Do not invoke any subagents.

2. **Mixed staged + unstaged** — if there are both staged and unstaged
   tracked changes, or any untracked files, print a one-line note:
   ```
   Note: <N> staged file(s), <M> unstaged file(s), <K> untracked file(s) — reviewing the full working diff.
   ```
   Then continue. Do NOT block on this; the reviewers will look at the
   full working set (staged + unstaged), since both could end up in the
   eventual commit.

3. **All clean and staged** — if all changes are staged and there are no
   unstaged/untracked files, no note needed. Continue.

## Step 2 — Build the review payload

Capture the diff context once so both subagents see the same input. Run:

- `git diff HEAD --stat` — overall stat (staged + unstaged combined)
- `git diff HEAD` — full unified diff of staged + unstaged changes vs HEAD
- `git status --short` — file-level status flags
- `git log -1 --format='%h %s'` — current HEAD for reference

Quote the file list (from `--stat`) so you can pass it into the subagent
prompts. You do NOT need to paste the entire diff into the prompts —
both reviewers have `Read` and can re-run `git diff` themselves if they
need it. But you DO need to tell them precisely what scope to review,
so they don't drift into the rest of the codebase.

## Step 3 — Run both reviewers in parallel

This is the critical step: **issue both Agent tool calls in a single
message**, so they run concurrently. Do not await one before invoking
the other.

### Agent A — `spendline-quality-reviewer`

Prompt:

> You are being invoked from the `/code-review-feature` pipeline.
> Perform your standard quality review, scoped strictly to the
> uncommitted changes on the current branch (`<branch>`).
>
> Files in scope (from `git diff HEAD --stat`):
> ```
> <paste the --stat output>
> ```
>
> Use `git diff HEAD` and `Read` on the affected files to anchor your
> review. Do not review files outside this list unless a change in scope
> directly depends on understanding them.
>
> Return your standard output format (Summary, Blocking issues,
> Recommended improvements, Nits, What's good).

### Agent B — `spendline-security-reviewer`

Prompt:

> You are being invoked from the `/code-review-feature` pipeline.
> Perform your standard security review, scoped strictly to the
> uncommitted changes on the current branch (`<branch>`).
>
> Files in scope (from `git diff HEAD --stat`):
> ```
> <paste the --stat output>
> ```
>
> Use `git diff HEAD` and `Read` on the affected files to anchor your
> review. Do not review files outside this list unless a change in scope
> directly depends on understanding them.
>
> Return your standard output format (Security Review Summary, Scope
> Reviewed, Findings ordered Critical → Low, Positive Observations,
> Suggested Follow-ups).

Wait for both subagents to complete before continuing. If either returns
an error, surface it to the user and STOP — do not fabricate a verdict
from a half-completed review.

## Step 4 — Compute the verdict

Cross-reference both reviews:

- **Quality blocking issues** — count items under the quality reviewer's
  "Blocking issues" section.
- **Critical/High security findings** — count items severity Critical or
  High in the security reviewer's "Findings" section.
- **Recommended improvements / Medium / Low / Nits** — these are
  non-blocking; they feed the "with suggestions" path.

Verdict rules (apply in order — first match wins):

1. If there are any **quality blocking issues** OR any **Critical/High
   security findings** → `CHANGES REQUESTED`.
2. Else, if there are any non-empty "Recommended improvements", "Nits",
   Medium/Low security findings, or "Suggested Follow-ups" → `APPROVED
   WITH SUGGESTIONS`.
3. Else (truly nothing to address) → `APPROVED`.

## Step 5 — Print the combined report

Print exactly this structure. No preamble before, no commentary after.

```
# Code Review Report — <branch> @ <short HEAD>

<repeat the Step-1 precheck note here if one was emitted>

## Quality Review
<mirror the spendline-quality-reviewer's output verbatim:
 Summary, Blocking issues, Recommended improvements, Nits, What's good>

## Security Review
<mirror the spendline-security-reviewer's output verbatim:
 Security Review Summary, Scope Reviewed, Findings, Positive
 Observations, Suggested Follow-ups>

## Action Plan
<only include this section if the verdict is CHANGES REQUESTED or
 APPROVED WITH SUGGESTIONS. Otherwise omit it entirely.>

For CHANGES REQUESTED — list each blocking item as a numbered
must-fix, in the form:
  1. <file:line> — <issue> — <fix>

For APPROVED WITH SUGGESTIONS — list each non-blocking item as a
numbered suggestion, in the form:
  1. <file:line> — <issue> — <suggested improvement>

## Overall Verdict
<exactly one of the following lines, no extra text:>
- ✅ APPROVED — ready to commit
- 🟡 APPROVED WITH SUGGESTIONS — can commit, address suggestions in future steps
- ❌ CHANGES REQUESTED — must fix before committing, see action plan above
```

### Verdict guardrails

- Pick the verdict by the rules in Step 4, not by the reviewers' own
  prose summaries. If a reviewer's summary disagrees with their findings
  list, trust the findings.
- If the security reviewer reports a Critical finding but the quality
  reviewer is clean, the verdict is still `CHANGES REQUESTED`.
- Never silently drop findings from either review. Every Blocking issue
  and every Critical/High security finding must appear in the Action Plan.
- Do NOT commit, stage, push, or otherwise mutate git state. This command
  is read-only; the user decides what to do with the verdict.
