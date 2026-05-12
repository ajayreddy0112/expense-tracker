"use client";

import { metaFor } from "@/lib/categories";
import { fmtDay, formatINR, parseISODate } from "@/lib/dates";
import { useExpenseModals } from "./ExpenseModals";
import type { ExpenseLite } from "@/lib/types";

export function ExpenseList({
  expenses,
  empty,
}: {
  expenses: ExpenseLite[];
  empty?: React.ReactNode;
}) {
  const { openEdit } = useExpenseModals();

  if (!expenses.length) {
    return <>{empty}</>;
  }

  return (
    <ul className="list">
      {expenses.map((e) => {
        const meta = metaFor(e.category_name);
        const color = meta.color;
        const icon = e.category_icon ?? meta.fallbackIcon;
        return (
          <li key={e.id}>
            <button
              type="button"
              className="row row-button"
              onClick={() => openEdit(e)}
              aria-label={`Edit ${e.note ?? e.category_name}`}
            >
              <span
                className="icon"
                style={{
                  background: `color-mix(in oklch, ${color} 14%, var(--paper))`,
                  borderColor: `color-mix(in oklch, ${color} 22%, var(--hairline))`,
                }}
              >
                {icon}
              </span>
              <span className="meta">
                <span className="title">
                  {e.note?.trim() || e.category_name}
                </span>
                <span className="sub">
                  <span className="cat-dot" style={{ background: color }} />
                  {e.category_name}
                </span>
              </span>
              <span className="when">{fmtDay(parseISODate(e.spent_on))}</span>
              <span className="amt">₹{formatINR(e.amount)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
