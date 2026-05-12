"use client";

import { useExpenseModals } from "./ExpenseModals";

export function AddExpenseButton({
  variant = "accent",
}: {
  variant?: "accent" | "ghost";
}) {
  const { openAdd } = useExpenseModals();
  return (
    <button
      type="button"
      className={`btn ${variant}`}
      onClick={openAdd}
    >
      <span aria-hidden>+</span> Add expense
    </button>
  );
}
