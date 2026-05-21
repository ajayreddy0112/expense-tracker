---
name: spendline-ui
description: >
  Design system and UI implementation guide for the Spendline expense tracker
  (Next.js 15 + Tailwind v4 + TypeScript). Use this skill for ANY task involving
  UI in this project: building new components or pages, restyling, layout fixes,
  adding interactions, chart work, form design, mobile responsiveness, or any
  time the words "design", "UI", "component", "layout", "style", or "screen"
  appear. Also triggers for: dashboard, hero number, expense list, modals,
  add/edit form, auth pages, category chips, and chart changes. Never freestyle
  UI without reading this skill first — it encodes the full Spendline design
  language so every new piece reads as part of the same product.
---

# Spendline UI Design Skill

**Aesthetic:** Calm-fintech. Cool ink + slate paper, single cobalt accent.
Geist for UI text. Instrument Serif italic for hero numbers and page headings.
Playful empty states and toasts. Currency is **₹ INR** throughout.

---

## 1. Design Tokens

All tokens live in `app/globals.css` at `:root`. Never hardcode colors or
shadows — always use these variables:

```css
/* Surfaces */
--paper        /* page background */
--paper-2      /* card tint, input bg, hover state */
--paper-3      /* deeper tint */
--hairline     /* subtle borders */
--hairline-2   /* emphasized borders, input outlines */

/* Text */
--ink-900      /* primary text */
--ink-800
--ink-700      /* secondary labels */
--ink-500      /* muted / meta text */
--ink-400      /* placeholder, dim icons */
--ink-300      /* placeholder inside serif inputs */

/* Accent — cobalt */
--accent       /* primary interactive, links, FAB */
--accent-2     /* hover */
--accent-soft  /* accent tint backgrounds */
--accent-ink   /* dark text on accent-soft */

/* Semantic */
--positive     /* green: savings, decreases */
--positive-soft
--warn         /* amber */
--danger       /* red: overspend, delete */
--danger-soft

/* Category colors */
--cat-food     --cat-transport  --cat-bills
--cat-fun      --cat-shopping   --cat-health    --cat-other

/* Shape */
--r-sm: 6px    --r-md: 10px   --r-lg: 14px
--r-xl: 20px   --r-2xl: 26px

/* Shadows */
--shadow-1   /* card resting */
--shadow-2   /* elevated: modal, popover */
--shadow-3   /* floating: modal, full-sheet */
```

**Palette variants** (controlled by class on root element):
- `.theme-warm` — terracotta accent instead of cobalt
- `.theme-mono` — graphite; Geist Mono replaces Geist

---

## 2. Typography

```css
--ui-font:      "Geist", system-ui, sans-serif
--display-font: "Instrument Serif", serif   /* always italic, weight 400 */
--mono-font:    "Geist Mono", monospace
```

| Use case | Rules |
|---|---|
| Hero amounts (dashboard total) | `font-family: var(--display-font); font-style: italic; font-size: 104px (desktop) / 64px (mobile)` |
| Page headings (`<h1>`) | display font, italic, ~36px desktop / ~30px mobile |
| Section headings | display font, italic, ~22px |
| Modal titles | display font, italic, ~26px |
| Body / labels | Geist 14px, `letter-spacing: -0.005em` |
| Eyebrows | 11px, weight 500, `letter-spacing: 0.08em`, uppercase, `--ink-500` |
| Money in lists | Geist, `font-variant-numeric: tabular-nums`, weight 500, 15px |
| Currency symbol beside hero | display font, italic, 48px (desktop) / 30px (mobile), `--ink-700` |

---

## 3. Component Patterns

Read `references/components.md` for full per-component specs.

Quick reference for common elements:

### Buttons
```
.btn              → filled ink-900, pill shape, 13.5px Geist 500
.btn.ghost        → transparent + hairline-2 border
.btn.accent       → cobalt fill
.btn.danger       → red fill
.btn.sm           → smaller padding
.btn.icon         → 32×32 square, centered icon
```

### Cards
```
.card             → paper bg, hairline border, r-lg, shadow-1, 22px padding
.card-flush       → no padding, overflow hidden (for lists inside cards)
```

### Inputs
All inputs: `border: 0.5px solid var(--hairline-2)`, `border-radius: var(--r-md)`, focus ring = `box-shadow: 0 0 0 3px var(--accent-soft)` + `border-color: var(--ink-900)`.

Amount input (modal / sheet): borderless, display font italic, 56px desktop / 52px mobile, with ₹ symbol at 32px/30px in `--ink-500`.

### Chips / Pills
```
.chip             → paper-2 bg, hairline border, 12px, cursor pointer
.chip.active      → ink-900 bg, paper text
.chip .dot        → 8px circle in currentColor
```

### Modal (desktop)
Width 480px, `border-radius: var(--r-2xl)`, `box-shadow: var(--shadow-3)`, `border: 0.5px solid var(--hairline)`. Backdrop: `background: rgba(15,22,36,.30); backdrop-filter: blur(4px)`. Animation: `pop-in` (translateY 10px + scale .97 → 1).

### Bottom Sheet (mobile)
`border-radius: 28px 28px 0 0`. Grab handle: 38×4px, `--hairline-2`, centered. Animation: `sheet-up` (translateY 100% → 0).

---

## 4. Page Layouts

### Desktop shell
```
.shell → CSS grid: 232px sidebar | 1fr content
.content → padding: 32px 40px 80px; max-width: 1180px
```

Sidebar: `--paper` bg, `border-right: 0.5px solid var(--hairline)`, 22px 16px padding.

Nav items: 13.5px Geist 500, active = `ink-900` bg + `paper` text, hover = `paper-2` bg.

### Mobile shell
`padding-top: 54px` (status bar), `padding-bottom: 120px` (tab bar + home indicator).

Bottom tab bar: frosted glass (`backdrop-filter: blur(20px) saturate(160%)`), `border-radius: 22px`, positioned 16px from bottom with 12px sides. Grid: `1fr 1fr 64px 1fr 1fr` (center = FAB slot).

FAB: 50×50px cobalt circle, `box-shadow` with `color-mix(in oklch, var(--accent) 60%, transparent)`.

### Auth page (desktop)
Split: `1.05fr | 1fr`. Left pane = form on `--paper`; right pane = dark `--ink-900` with radial cobalt glow at top-right.

---

## 5. Dashboard Hero

```
.hero-total → flex column, gap 10px
  .amount-row → flex, align flex-end, gap 8px
    .currency → display italic 48px, --ink-700, mb 6px
    .amount   → display italic 104px, letter-spacing -0.035em, lh 0.9
  .delta → 12.5px --ink-500; .up → --danger; .down → --positive
```

Mobile hero card: dark `--ink-900` card with cobalt radial glow (opacity 0.32), `border-radius: 22px`. Amount: display italic 64px.

---

## 6. Expense List

```
.list → flex column
  .row → grid: 38px | 1fr | auto | auto; 14px 22px padding; hairline bottom border
    .icon → 36×36 r-10 paper-2 bg + hairline border, emoji 17px
    .meta .title → Geist 500 14px ink-900, ellipsis
    .meta .sub → 12px ink-500, flex row gap-8
    .when → 12.5px ink-500 tabular
    .amt → Geist 500 15px tabular, text-align right
```

Density variants: `.density-compact` (9px padding, 28px icon), `.density-airy` (18px padding).

Grouped view: `.day-head` with display italic 18px date + `--ink-500` meta. Linear gradient bg from `paper-2` → `paper`.

Mobile rows: `.m-row` — 42px icon, `border-radius: 12px`, title max-width 180px.

---

## 7. Charts

Charts are **custom SVG** — no external chart library. They consume design tokens directly (e.g. `var(--accent)`, category vars).

- `components/AreaChart.tsx` — smooth daily-rhythm area fill, **Server Component**
- `components/DonutChart.tsx` — hover-aware donut, **Client Component**

When adding a new chart variant, match this pattern: SVG with `viewBox`, use `oklch()` color values from tokens, tooltip via `.tip` class (dark pill, arrow via `::after`).

Category bar: horizontal stacked bar using `--cat-*` colors, `border-radius: 999px`, height 8px.

---

## 8. Category System

Seven canonical categories — names must exactly match `0002_seed_categories.sql`:

| Name | Emoji | CSS token |
|---|---|---|
| Food | 🍔 | `--cat-food` |
| Transport | 🚌 | `--cat-transport` |
| Bills | ⚡ | `--cat-bills` |
| Fun | 🎉 | `--cat-fun` |
| Shopping | 🛍️ | `--cat-shopping` |
| Health | 💊 | `--cat-health` |
| Other | 📦 | `--cat-other` |

Visual metadata (color, icon fallback) lives in `lib/categories.ts` — `metaFor(name)`.

Category grid in Add modal: 4 columns, `border-radius: 14px`, 12px padding, flex column emoji + label. Selected state: `border-color: --ink-900`, `bg: --paper-2`.

---

## 9. Interaction & Motion

```css
/* Standard transitions */
transition: background .12s, border-color .12s, color .12s

/* Button press */
.btn:active { transform: translateY(0.5px); }

/* Modal entrance */
@keyframes pop-in {
  from { opacity: 0; transform: translateY(10px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Sheet entrance */
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* Toast */
@keyframes rise {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

/* Delight: bar/number growth */
transition: width .5s cubic-bezier(.2,.7,.3,1)
```

---

## 10. Tailwind v4 Notes

This project uses **Tailwind v4** (CSS-first config). Tokens above are native CSS variables exposed via `app/globals.css`. Use Tailwind utilities for spacing/flex/grid; use `var(--token)` directly for colors, shadows, and radii that aren't mapped to Tailwind.

Prefer: `className="flex items-center gap-3"` for layout.
Prefer: `style={{ color: 'var(--ink-700)' }}` or CSS modules for color/shadow tokens not in Tailwind's palette.

---

## 11. Responsive Strategy

Desktop-first. Key breakpoints:
- Sidebar collapses: `< 768px` → bottom tab bar
- Content padding reduces: `< 1024px` → 24px 20px
- Dashboard grid: 2-col → 1-col at `< 900px`
- Auth split: stacked at `< 640px`

Mobile layout implemented as a separate component tree rooted in the iOS frame for the prototype; in production, use Tailwind responsive prefixes (`md:`, `lg:`).

---

## 12. Playful Details

When `personality` mode is on (default):
- Empty states: full emoji + display-italic headline + muted sub ("No expenses yet — your wallet's looking great 🎉")
- First-add: confetti burst (`.confetti .piece` keyframe animation)
- Toasts: positive check circle in `--positive` green, brief message
- Insights card: "Did you know…" callout with light `--accent-soft` bg

---

## Reference files

- `references/components.md` — full component spec with HTML/JSX patterns for each element (button, card, input, chip, modal, list row, hero, chart, mobile sheet)