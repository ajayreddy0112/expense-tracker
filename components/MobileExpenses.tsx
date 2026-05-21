"use client";

import { useMemo, useState } from "react";
import { useExpenseModals } from "./ExpenseModals";
import { metaFor } from "@/lib/categories";
import { fmtDay, fmtISODate, formatINR, parseISODate } from "@/lib/dates";
import { MIN_ISO_DATE, customRangeSchema } from "@/lib/schemas";
import type { Category, ExpenseLite } from "@/lib/types";

type Group = { dateISO: string; date: Date; items: ExpenseLite[] };

function groupByDay(items: ExpenseLite[]): Group[] {
  const byDay = new Map<string, ExpenseLite[]>();
  for (const e of items) {
    const list = byDay.get(e.spent_on);
    if (list) list.push(e);
    else byDay.set(e.spent_on, [e]);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateISO, items]) => ({
      dateISO,
      date: parseISODate(dateISO),
      items,
    }));
}

export function MobileExpenses({
  expenses,
  categories,
}: {
  expenses: ExpenseLite[];
  categories: Category[];
}) {
  const { openEdit } = useExpenseModals();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  // Why: mobile filters stay local — the server already returned the URL-default
  // window, so the date chip narrows within that without re-fetching.
  const [dateOpen, setDateOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);

  const todayISO = useMemo(() => fmtISODate(new Date()), []);

  const filtered = useMemo(() => {
    let r = expenses;
    if (cat) r = r.filter((e) => e.category_id === cat);
    if (appliedFrom && appliedTo) {
      r = r.filter(
        (e) => e.spent_on >= appliedFrom && e.spent_on <= appliedTo,
      );
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      r = r.filter(
        (e) =>
          (e.note ?? "").toLowerCase().includes(needle) ||
          e.category_name.toLowerCase().includes(needle),
      );
    }
    return r;
  }, [expenses, q, cat, appliedFrom, appliedTo]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const today = fmtISODate(new Date());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return fmtISODate(d);
  })();

  const dateError: string | null = (() => {
    if (!dateFrom || !dateTo) return null;
    const result = customRangeSchema.safeParse({
      from: dateFrom,
      to: dateTo,
    });
    return result.success ? null : result.error.issues[0].message;
  })();
  const dateApplyDisabled = !dateFrom || !dateTo || dateError !== null;

  function applyDate() {
    if (dateApplyDisabled) return;
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setDateOpen(false);
  }

  function clearDate() {
    setAppliedFrom(null);
    setAppliedTo(null);
    setDateFrom("");
    setDateTo("");
    setDateOpen(false);
  }

  return (
    <>
      <div className="m-search">
        <SearchIcon />
        <input
          placeholder="Search expenses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search expenses"
        />
        {q && (
          <button
            type="button"
            className="m-search-clear"
            onClick={() => setQ("")}
            aria-label="Clear search"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="m-chips" role="tablist" aria-label="Filter by category">
        <button
          type="button"
          className={`chip${cat === null ? " active" : ""}`}
          onClick={() => setCat(null)}
        >
          All
        </button>
        <button
          type="button"
          className={`chip${dateOpen || appliedFrom ? " active" : ""}`}
          onClick={() => setDateOpen((open) => !open)}
          aria-expanded={dateOpen}
        >
          <span aria-hidden>📅</span>
          <span>Date</span>
        </button>
        {appliedFrom && appliedTo && (
          <button
            type="button"
            className="chip chip-dismiss"
            onClick={clearDate}
            aria-label="Clear date filter"
          >
            <span>
              {fmtDay(parseISODate(appliedFrom))} –{" "}
              {fmtDay(parseISODate(appliedTo))}
            </span>
            <span aria-hidden>✕</span>
          </button>
        )}
        {categories.map((c) => {
          const meta = metaFor(c.name);
          return (
            <button
              key={c.id}
              type="button"
              className={`chip${cat === c.id ? " active" : ""}`}
              onClick={() => setCat(cat === c.id ? null : c.id)}
            >
              <span aria-hidden>{c.icon ?? meta.fallbackIcon}</span>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {dateOpen && (
        <div className="m-date-row">
          <div className="m-date-inputs">
            <label className="m-date-field">
              <span className="label">From</span>
              <input
                type="date"
                className="input"
                value={dateFrom}
                min={MIN_ISO_DATE}
                max={todayISO}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-invalid={dateError ? true : undefined}
              />
            </label>
            <label className="m-date-field">
              <span className="label">To</span>
              <input
                type="date"
                className="input"
                value={dateTo}
                min={MIN_ISO_DATE}
                max={todayISO}
                onChange={(e) => setDateTo(e.target.value)}
                aria-invalid={dateError ? true : undefined}
              />
            </label>
          </div>
          {dateError && <div className="field-error">{dateError}</div>}
          <div className="m-date-actions">
            <button type="button" className="btn ghost sm" onClick={clearDate}>
              Clear
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={applyDate}
              disabled={dateApplyDisabled}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="m-card">
          <div className="m-empty">
            <div className="emoji">🔎</div>
            <div className="ttl">Nothing matches.</div>
            <div className="sub">Clear the filter, or log something new.</div>
          </div>
        </div>
      ) : (
        groups.map((g) => {
          const dayTotal = g.items.reduce((s, e) => s + e.amount, 0);
          const label =
            g.dateISO === today
              ? "Today"
              : g.dateISO === yesterday
                ? "Yesterday"
                : fmtDay(g.date);
          return (
            <div key={g.dateISO}>
              <div className="m-day">
                <div className="date">{label}</div>
                <div className="meta">
                  {g.items.length} {g.items.length === 1 ? "item" : "items"} · ₹
                  {formatINR(dayTotal)}
                </div>
              </div>
              <div className="m-card">
                {g.items.map((e) => {
                  const meta = metaFor(e.category_name);
                  const color = meta.color;
                  const icon = e.category_icon ?? meta.fallbackIcon;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className="m-row"
                      onClick={() => openEdit(e)}
                    >
                      <div
                        className="ic"
                        style={{
                          background: `color-mix(in oklch, ${color} 14%, var(--paper))`,
                          borderColor: `color-mix(in oklch, ${color} 22%, var(--hairline))`,
                        }}
                      >
                        {icon}
                      </div>
                      <div className="meta">
                        <div className="ttl">
                          {e.note?.trim() || e.category_name}
                        </div>
                        <div className="sub">{e.category_name}</div>
                      </div>
                      <div className="amt">₹{formatINR(e.amount)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m10.5 10.5 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="m4 4 8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
