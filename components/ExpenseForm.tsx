"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "./Modal";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";
import { saveExpense } from "@/app/dashboard/actions";
import { fmtISODate } from "@/lib/dates";
import { metaFor } from "@/lib/categories";
import type { Category, ExpenseLite } from "@/lib/types";

type Props = {
  categories: Category[];
  initial?: ExpenseLite | null;
  onClose: () => void;
  onRequestDelete?: (expense: ExpenseLite) => void;
};

export function ExpenseForm({
  categories,
  initial,
  onClose,
  onRequestDelete,
}: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement | null>(null);

  const today = fmtISODate(new Date());
  const yesterday = fmtISODate(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1),
  );

  const defaultCategoryId = initial?.category_id ?? categories[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      id: initial?.id,
      amount: initial?.amount ?? undefined,
      categoryId: defaultCategoryId,
      note: initial?.note ?? "",
      spentOn: initial?.spent_on ?? today,
    },
  });

  // Register categoryId / spentOn manually because we drive them via buttons
  useEffect(() => {
    register("categoryId");
    register("spentOn");
    register("id");
  }, [register]);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const categoryId = watch("categoryId");
  const spentOn = watch("spentOn");

  function onSubmit(values: ExpenseInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveExpense(values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  const amountRegister = register("amount", { valueAsNumber: true });

  return (
    <Modal
      title={isEdit ? "Edit expense" : "Add expense"}
      onClose={onClose}
      footer={
        <>
          {isEdit && onRequestDelete && initial ? (
            <button
              type="button"
              className="btn ghost sm danger-link"
              onClick={() => onRequestDelete(initial)}
              disabled={pending}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="expense-form"
              className="btn accent"
              disabled={pending}
            >
              {pending
                ? isEdit
                  ? "Saving…"
                  : "Adding…"
                : isEdit
                  ? "Save changes"
                  : "Add to log"}
            </button>
          </div>
        </>
      }
    >
      <form
        id="expense-form"
        className="modal-body"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <label className="label" htmlFor="amount">
            Amount
          </label>
          <div className="amount-input">
            <span className="cur">₹</span>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              {...amountRegister}
              ref={(el) => {
                amountRegister.ref(el);
                amountRef.current = el;
              }}
            />
          </div>
          {errors.amount && (
            <p className="field-error">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label className="label">Category</label>
          <div className="cat-grid">
            {categories.map((c) => {
              const meta = metaFor(c.name);
              const selected = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`cat-pick${selected ? " selected" : ""}`}
                  style={
                    selected
                      ? {
                          borderColor: meta.color,
                          background: `color-mix(in oklch, ${meta.color} 12%, var(--paper))`,
                        }
                      : undefined
                  }
                  onClick={() =>
                    setValue("categoryId", c.id, { shouldValidate: true })
                  }
                  aria-pressed={selected}
                >
                  <span className="cat-pick-emoji">
                    {c.icon ?? meta.fallbackIcon}
                  </span>
                  <span className="cat-pick-name">{c.name}</span>
                </button>
              );
            })}
          </div>
          {errors.categoryId && (
            <p className="field-error">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="row-2">
          <div>
            <label className="label" htmlFor="spentOn">
              Date
            </label>
            <input
              id="spentOn"
              className="input"
              type="date"
              max={today}
              value={spentOn}
              onChange={(e) =>
                setValue("spentOn", e.target.value, { shouldValidate: true })
              }
            />
            {errors.spentOn && (
              <p className="field-error">{errors.spentOn.message}</p>
            )}
          </div>
          <div>
            <label className="label">Quick set</label>
            <div className="seg" role="group" aria-label="Quick date">
              <button
                type="button"
                className={spentOn === today ? "on" : ""}
                onClick={() =>
                  setValue("spentOn", today, { shouldValidate: true })
                }
              >
                Today
              </button>
              <button
                type="button"
                className={spentOn === yesterday ? "on" : ""}
                onClick={() =>
                  setValue("spentOn", yesterday, { shouldValidate: true })
                }
              >
                Yesterday
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">
            Note <span className="dim" style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="note"
            className="input"
            type="text"
            placeholder="What was it for?"
            maxLength={200}
            {...register("note")}
          />
          {errors.note && (
            <p className="field-error">{errors.note.message}</p>
          )}
        </div>

        {serverError && (
          <div className="server-error" role="alert">
            {serverError}
          </div>
        )}
      </form>
    </Modal>
  );
}
