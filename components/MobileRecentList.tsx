"use client";

import { useExpenseModals } from "./ExpenseModals";
import { metaFor } from "@/lib/categories";
import { fmtDay, formatINR, parseISODate } from "@/lib/dates";
import type { ExpenseLite } from "@/lib/types";

export function MobileRecentList({ expenses }: { expenses: ExpenseLite[] }) {
  const { openEdit } = useExpenseModals();

  return (
    <>
      {expenses.map((e) => {
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
              <div className="ttl">{e.note?.trim() || e.category_name}</div>
              <div className="sub">
                {e.category_name} · {fmtDay(parseISODate(e.spent_on))}
              </div>
            </div>
            <div className="amt">₹{formatINR(e.amount)}</div>
          </button>
        );
      })}
    </>
  );
}
