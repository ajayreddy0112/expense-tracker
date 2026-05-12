"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, error: first };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { id, amount, categoryId, note, spentOn } = parsed.data;

  const row = {
    user_id: user.id,
    amount,
    category_id: categoryId,
    note: note ?? null,
    spent_on: spentOn,
  };

  const { error } = id
    ? await supabase.from("expenses").update(row).eq("id", id)
    : await supabase.from("expenses").insert(row);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing id" };

  const supabase = await createSupabaseServerClient();
  // RLS enforces ownership; no need to re-check here.
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  return { ok: true };
}
