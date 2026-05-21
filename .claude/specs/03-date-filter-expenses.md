# Spec: Date Filter for Expenses Page

## Overview
The `/dashboard/expenses` page today filters by **preset** date ranges only — `This month`, `Last month`, `Last 30 days`, `All time` — driven by a single `?range=` query param. The presets are useful but break down the moment a user wants to look at, say, "March 1–March 15" or "every expense in 2025 Q1." This spec adds a **custom from/to date filter** alongside the existing presets, on both the desktop and the mobile expenses views, with the chosen window reflected in the URL so it survives refresh and is shareable. It also extends the existing `FilterBar` segmented control with a new `Custom` segment that reveals two `<input type="date">` controls; the existing preset logic stays so nothing today breaks.

## Depends on
None. Builds on the existing expenses page at `app/dashboard/expenses/page.tsx` and the existing `FilterBar` (`components/FilterBar.tsx`).

## Routes (App Router)
No new routes. The existing `app/dashboard/expenses/page.tsx` learns two more search params: `from` and `to`.

## Server actions
No new server actions. Filtering is read-only and happens in the Server Component via Supabase's `gte` / `lte` on `spent_on`.

## Database changes
No database changes. The existing `(user_id, spent_on desc)` index on `public.expenses` (from `0001_init.sql`) already covers the lookup pattern; RLS already restricts rows to the caller.

## Pages and components

### Create
- `components/CustomRangePopover.tsx` (Client) — small popover with two `<input type="date">` controls (`From` + `To`) plus an `Apply` and a `Clear` button. Mounted inside `FilterBar` when the `Custom` segment is the active range. Pushes `?from=YYYY-MM-DD&to=YYYY-MM-DD&range=custom` on Apply via `router.push`, clears both on Clear.
- `lib/rangeFilter.ts` — shared helper module exporting:
  - `type Range = "thismonth" | "lastmonth" | "last30" | "all" | "custom"`
  - `VALID_RANGES: ReadonlySet<Range>`
  - `parseRangeParams(params): { range: Range; from: string | null; to: string | null }` — single source of truth for normalising `?range=`, `?from=`, `?to=` from the URL. Falls back to `thismonth` on garbage. If `range === "custom"` but `from`/`to` are missing or malformed, downgrades to `thismonth`.
  - `rangeBounds(range, customFrom, customTo): { from?: string; to?: string }` — same shape as the existing helper in `app/dashboard/expenses/page.tsx`, plus the `custom` case. Imported by both the page (server) and `FilterBar` (client).

### Modify
- `app/dashboard/expenses/page.tsx` — read `from` and `to` off `searchParams`, delegate to `parseRangeParams` and `rangeBounds` (imported from `lib/rangeFilter.ts`). Remove the local `VALID_RANGES` / `rangeBounds` definitions. Pass `customFrom` and `customTo` down to `FilterBar` so the popover can render them. Update the "filtered" detection inside `EmptyState` so a custom range counts as filtered too.
- `components/FilterBar.tsx` — add `Custom` to the `RANGES` list. Accept new props `customFrom: string | null`, `customTo: string | null`. When `currentRange === "custom"`, render `<CustomRangePopover />` anchored to the segment. When switching to a non-custom preset, strip `?from` and `?to` from the URL alongside setting `?range`. Tighten `setParam` to handle multi-key updates (or add a second helper `setParams(record)`) so we can write `range` + `from` + `to` in a single `router.push` rather than three.
- `components/MobileExpenses.tsx` — add a `Date` chip that opens a small inline date-range row (two `<input type="date">` + Apply/Clear). State stays **local** to the component (matching the existing mobile pattern — search + category are already client-only there), and filters the already-fetched `expenses` array by `spent_on >= from && spent_on <= to`. The mobile view does **not** push to the URL — the server already returned the full set (typically `thismonth` because that's the URL default), so the mobile date chip filters that returned set. (Trade-off acknowledged: a user landing on the mobile expenses URL today gets `thismonth` rows, so the local picker can only narrow within that. If they want a wider window, they switch the preset via the URL. See Rules.)
- `lib/dates.ts` — add `clampISODate(s, min, max)` if it makes the popover validation cleaner. Skip if a plain Zod-on-the-client suffices. (Mark optional; do not add until you have a concrete need.)

## Files to change
- `app/dashboard/expenses/page.tsx`
- `components/FilterBar.tsx`
- `components/MobileExpenses.tsx`

## Files to create
- `lib/rangeFilter.ts`
- `components/CustomRangePopover.tsx`

## New dependencies
No new dependencies. Native `<input type="date">` for the picker; existing Zod for the lightweight client-side validation (`from <= to`, both within `[1900-01-01, today]`).

## Rules for implementation

Standard project rules (from CLAUDE.md):
- Three Supabase client factories — browser (`lib/supabase/client.ts`), server (`lib/supabase/server.ts`), middleware. Don't add a fourth.
- Authorize on the server with `supabase.auth.getUser()`, never `getSession()`. (No new server reads here — the existing expenses page already does this via the dashboard layout guard plus RLS on `expenses`.)
- Reads happen in Server Components via `createSupabaseServerClient()`; RLS does the filtering. Date filtering goes through `.gte("spent_on", from)` / `.lte("spent_on", to)`, never client-side after the fact on the desktop view.
- Forms / inputs: even though this is not a RHF form, **all** Zod schemas live in `lib/schemas.ts` — if you add validation, add a `customRangeSchema` there rather than inlining a `z.object` in the component.
- Styling: reuse `.seg`, `.chip`, `.bar`, `.input`, `.btn`, the existing `.modal`-family classes if a popover needs a backdrop, and design tokens (`--ink-*`, `--paper-*`, `--hairline`, `--accent`). No hex literals.
- Dates: `lib/dates.ts` only — `fmtISODate`, `parseISODate`, `startOfMonth`, `endOfMonth`. Do not add `date-fns`.
- TypeScript strict; no `any`. The Supabase row shape stays as the existing `Row` type in `app/dashboard/expenses/page.tsx`.
- Migrations: not applicable (no DB changes).

Feature-specific:
- **URL is the source of truth on desktop.** The page reads `?range`, `?from`, `?to` and treats them as the authoritative filter state. The popover writes back via `router.push` (no `router.refresh()` — Server Component re-renders on the URL change).
- **`Custom` segment behavior**: clicking `Custom` when no `from`/`to` are set must default the picker to `{ from: startOfMonth(today), to: today }` so the popover doesn't open empty. The URL only updates on `Apply`, not on every keystroke — `from`/`to` get committed together to avoid intermediate invalid states (e.g. `to` before `from`).
- **Validation**: on the popover, disable `Apply` unless both inputs are filled, both are valid ISO dates within `[1900-01-01, today]`, and `from <= to`. Surface a single inline error line (use the existing `.field-error` class) above the Apply row when invalid. No server-side validation needed beyond what Supabase already enforces — invalid dates simply return zero rows.
- **`Clear` behavior**: removes `from`, `to`, and `range=custom` from the URL, falling back to `thismonth` (the default). Equivalent to clicking `This month`.
- **Preset → preset transition**: switching from `Custom` to any preset must strip `from` and `to` from the URL in the **same** `router.push` (so the URL is clean and there's no flash where `?range=lastmonth&from=...&to=...` exists and the page tries to honour both).
- **Page header subhead** ("N entries · ₹X total") already adapts to the filtered count and stays unchanged. Consider also showing a "Showing `Mar 1 – Mar 15`" line beneath the `Custom` segment when active, so the user knows what window they're on without re-opening the popover. Reuse `fmtDay` from `lib/dates.ts` for the label.
- **Empty state copy**: the existing `EmptyState filtered={...}` branch already covers "Nothing matches" when filters yield zero rows. Make sure `filtered` returns `true` when `range === "custom"` (it currently only checks `categoryId !== null || range !== "all"`, which would still cover custom because `"custom" !== "all"`, but verify explicitly in the new code so future range additions don't silently break this).
- **Mobile**: keep the existing local-state filter pattern. The new `Date` chip opens an inline two-input row (no popover, no modal — same visual style as the existing search/chip strip). When a custom range is active, render a small dismissable pill ("Mar 1 – Mar 15 ✕") in the chip strip so it's obvious the filter is on. The chip's existence does **not** push to the URL — explicitly call this out in a `// Why:` comment in the component so a future reader doesn't "fix" it (the mobile view doesn't re-fetch the server data when state changes; this is intentional).
- **Sharing**: a user copying the URL with `?range=custom&from=...&to=...` and pasting it into a second tab (or sending it to themselves) must land on the same filtered view. This falls out of "URL is the source of truth" but call it out in the DoD.
- **Performance**: don't add an extra round-trip — the existing single query gets the new bounds. Don't paginate; the existing list virtualisation (or lack of it) is out of scope.

## Definition of done
- [ ] `npm run dev` boots; visiting `/dashboard/expenses` renders without console errors.
- [ ] The segmented control shows a fifth `Custom` segment to the right of `All time`.
- [ ] Clicking `Custom` opens the popover pre-filled with the current month's start and today; clicking outside dismisses it without applying.
- [ ] Filling valid `from` and `to`, clicking Apply: URL updates to `?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`, the expense list shows only rows in that window, and the page header subhead reflects the new count + total.
- [ ] `from > to` disables Apply and shows an inline error.
- [ ] `from` or `to` before `1900-01-01` or after today disables Apply with an inline error.
- [ ] Clicking `Clear` in the popover removes `from`/`to` from the URL and returns the view to `This month`.
- [ ] Switching from `Custom` back to a preset removes `from`/`to` from the URL in a single navigation (no intermediate URL state).
- [ ] Reloading a URL with `?range=custom&from=...&to=...` lands on the same filtered view (URL is the source of truth).
- [ ] On mobile (≤ 520 px viewport), a new `Date` chip is visible in the chip strip. Tapping it reveals two date inputs + Apply/Clear; the list re-filters locally on Apply and a dismissable pill appears summarising the window.
- [ ] Empty state: when the filter yields zero rows (any combination of category + custom range), the existing "Nothing matches" copy renders.
- [ ] Logged-out user hitting `/dashboard/expenses?range=custom&from=...&to=...` is redirected to `/login` (existing guard still works).
- [ ] RLS: a second user's expenses never appear regardless of the date window (verify by signing in as a second user with overlapping dates).
- [ ] `npm run build` succeeds with no new TypeScript errors introduced by this change.
