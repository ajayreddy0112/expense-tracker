"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { deleteExpense } from "@/app/dashboard/actions";
import { metaFor } from "@/lib/categories";
import { fmtDay, formatINR, parseISODate } from "@/lib/dates";
import type { ExpenseLite } from "@/lib/types";

type Props = {
  expense: ExpenseLite;
  onClose: () => void;
};

export function DeleteConfirm({ expense, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const meta = metaFor(expense.category_name);
  const icon = expense.category_icon ?? meta.fallbackIcon;

  function confirm() {
    setErr(null);
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal
      title="Delete this expense?"
      onClose={onClose}
      variant="sheet"
      footer={
        <>
          <span />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
              disabled={pending}
            >
              Keep it
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </>
      }
    >
      <div className="modal-body">
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          We&apos;ll quietly remove this one. There&apos;s no undo, but you can always add it back.
        </p>
        <div className="delete-card">
          <span
            className="delete-card-icon"
            style={{
              background: `color-mix(in oklch, ${meta.color} 14%, var(--paper))`,
              borderColor: `color-mix(in oklch, ${meta.color} 22%, var(--hairline))`,
            }}
          >
            {icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>
              {expense.note?.trim() || expense.category_name}
            </div>
            <div className="dim sm">
              {expense.category_name} · {fmtDay(parseISODate(expense.spent_on))}
            </div>
          </div>
          <div className="num" style={{ fontWeight: 500 }}>
            ₹{formatINR(expense.amount, { full: true })}
          </div>
        </div>
        {err && (
          <div className="server-error" role="alert">
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
