"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { DeleteConfirm } from "./DeleteConfirm";
import type { Category, ExpenseLite } from "@/lib/types";

type Mode =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; expense: ExpenseLite }
  | { kind: "delete"; expense: ExpenseLite };

type Ctx = {
  openAdd: () => void;
  openEdit: (e: ExpenseLite) => void;
  openDelete: (e: ExpenseLite) => void;
};

const ExpenseModalsCtx = createContext<Ctx | null>(null);

export function useExpenseModals(): Ctx {
  const v = useContext(ExpenseModalsCtx);
  if (!v) throw new Error("useExpenseModals must be used inside <ExpenseModals>");
  return v;
}

export function ExpenseModals({
  categories,
  children,
}: {
  categories: Category[];
  children: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  const ctx: Ctx = {
    openAdd: () => setMode({ kind: "add" }),
    openEdit: (expense) => setMode({ kind: "edit", expense }),
    openDelete: (expense) => setMode({ kind: "delete", expense }),
  };

  const close = () => setMode({ kind: "closed" });

  return (
    <ExpenseModalsCtx.Provider value={ctx}>
      {children}
      {mode.kind === "add" && (
        <ExpenseForm categories={categories} onClose={close} />
      )}
      {mode.kind === "edit" && (
        <ExpenseForm
          categories={categories}
          initial={mode.expense}
          onClose={close}
          onRequestDelete={(e) => setMode({ kind: "delete", expense: e })}
        />
      )}
      {mode.kind === "delete" && (
        <DeleteConfirm expense={mode.expense} onClose={close} />
      )}
    </ExpenseModalsCtx.Provider>
  );
}
