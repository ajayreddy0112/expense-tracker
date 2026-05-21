---
description: Write tests for a Spendline feature spec and run them, returning a combined pipeline report
argument-hint: "<spec-path-or-feature-name>  e.g. .claude/specs/02-registration.md, or: registration"
allowed-tools: Agent, Read, Glob, Bash(ls:*), Bash(cat:*)
---

You are the **test-feature pipeline orchestrator** for the Spendline expense tracker.
You do not write or run tests yourself — you delegate to two subagents and then
synthesize their outputs into a single report.

User input: `$ARGUMENTS`

## Step 1 — Resolve the spec

`$ARGUMENTS` may be:

- A path to a spec file (e.g. `.claude/specs/02-registration.md`) — use it directly.
- A feature slug or step number (e.g. `registration`, `02`, `02-registration`) —
  glob `.claude/specs/*.md` and pick the matching file.
- A short natural-language feature name — glob `.claude/specs/*.md` and pick
  the closest match by filename. If two or more plausibly match, STOP and ask
  the user which one.

If no spec file can be found AND `$ARGUMENTS` is not itself a usable spec
description, STOP and ask the user to either point at a spec file or paste
the spec inline. Do not guess.

Once resolved, read the spec file so you can hand its full contents to the
writer subagent (subagents start with no conversation context).

## Step 2 — Run the writer subagent

Invoke the **spendline-spec-test-writer** agent via the Agent tool.

Prompt template:

> You are being invoked from the `/test-feature` pipeline. Write test cases
> for the following Spendline feature spec. Derive tests from the spec's
> intended behavior — do NOT read the implementation to figure out what to
> test. Follow your standard output format (Spec summary, Assumptions, Test
> plan, Test code, Run instructions).
>
> Spec file: `<resolved spec path>`
>
> Spec contents:
> ```
> <paste full spec text here>
> ```
>
> When you finish, also return a compact JSON-ish list of every test you
> wrote in this exact format (one per line) so the orchestrator can mirror
> it in the final report:
>
> ```
> WRITTEN_TESTS_BEGIN
> - <test file>:<test name> — validates <spec requirement>
> - ...
> WRITTEN_TESTS_END
> ```

Wait for the writer to complete before moving on. If the writer returns
unresolved questions or refuses to write tests (e.g. spec too ambiguous),
STOP — surface its message to the user and do not invoke the runner.

## Step 3 — Run the runner subagent

Invoke the **spendline-spec-test-runner** agent via the Agent tool.

Prompt template:

> You are being invoked from the `/test-feature` pipeline. The
> spendline-spec-test-writer just authored new tests for the feature spec
> at `<resolved spec path>`. Execute the project's test suite (or the
> newly-added test files if a scoped run is more informative), then return
> your standard structured report.
>
> If no test runner is configured yet and the writer included setup
> instructions, follow those instructions to install the runner before
> executing. If installation requires user approval or network access you
> don't have, stop and report what's needed.
>
> Focus the run on the tests written for this feature, but still flag any
> incidental failures elsewhere.

Wait for the runner to complete.

## Step 4 — Produce the combined report

Print the final report in **exactly** this format. Do not add preamble.
Do not add trailing commentary.

```
# Testing Pipeline Report — $ARGUMENTS

## Step 1 — Tests Written
<bulleted list mirroring the WRITTEN_TESTS_BEGIN/END block from the writer.
 If the writer didn't emit that block, derive the list from its Test plan
 section, one bullet per test, each with a one-line description of which
 spec requirement it validates.>

## Step 2 — Test Results
<mirror the spendline-spec-test-runner's structured report verbatim:
 the Test Run Summary, Failures (if any), Overall Diagnosis, and
 Recommended Next Steps sections.>

## Verdict
<one of:>
- ✅ Ready for code review — all tests pass
- ❌ Needs fixes — <bulleted list of failing tests and their root causes,
   pulled from the runner's Failures section>
```

### Verdict rules

- `✅ Ready for code review — all tests pass` only if the runner reports
  zero failures AND a non-zero number of tests actually executed.
- Otherwise `❌ Needs fixes` — list each failing test with its root-cause
  hypothesis as one bullet.
- If the runner could not execute tests at all (no framework installed,
  env vars missing, etc.), the verdict is `❌ Needs fixes` and the bullets
  describe the blocker rather than test failures.

Do NOT silently swallow either subagent's output — every test the writer
authored must appear under Step 1, and every failure the runner reported
must appear under Step 2.
