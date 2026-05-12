import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExpenseModals } from "@/components/ExpenseModals";
import { AddExpenseButton } from "@/components/AddExpenseButton";
import { FilterBar } from "@/components/FilterBar";
import { ExpenseList } from "@/components/ExpenseList";
import {
  endOfMonth,
  fmtISODate,
  formatINR,
  startOfMonth,
} from "@/lib/dates";
import type { Category, ExpenseLite } from "@/lib/types";

type Row = {
  id: string;
  amount: number | string;
  spent_on: string;
  note: string | null;
  category_id: string;
  categories: { name: string; icon: string | null } | null;
};

const VALID_RANGES = new Set([
  "thismonth",
  "lastmonth",
  "last30",
  "all",
] as const);
type Range = "thismonth" | "lastmonth" | "last30" | "all";

function rangeBounds(range: Range): { from?: string; to?: string } {
  const today = new Date();
  if (range === "thismonth") {
    return {
      from: fmtISODate(startOfMonth(today)),
      to: fmtISODate(endOfMonth(today)),
    };
  }
  if (range === "lastmonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: fmtISODate(start), to: fmtISODate(end) };
  }
  if (range === "last30") {
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    return { from: fmtISODate(start), to: fmtISODate(today) };
  }
  return {};
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; cat?: string }>;
}) {
  const params = await searchParams;
  const range: Range = VALID_RANGES.has(params.range as Range)
    ? (params.range as Range)
    : "thismonth";
  const categoryId = params.cat ?? null;

  const supabase = await createSupabaseServerClient();

  const [{ data: catRows }, expensesQuery] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    (() => {
      let q = supabase
        .from("expenses")
        .select(
          "id, amount, spent_on, note, category_id, categories ( name, icon )",
        )
        .order("spent_on", { ascending: false });

      const { from, to } = rangeBounds(range);
      if (from) q = q.gte("spent_on", from);
      if (to) q = q.lte("spent_on", to);
      if (categoryId) q = q.eq("category_id", categoryId);

      return q;
    })(),
  ]);

  const categories: Category[] = (catRows ?? []) as Category[];
  const { data, error } = expensesQuery;

  const expenses: ExpenseLite[] = ((data ?? []) as unknown as Row[]).map(
    (r) => ({
      id: r.id,
      amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
      spent_on: r.spent_on,
      note: r.note,
      category_id: r.category_id,
      category_name: r.categories?.name ?? "Other",
      category_icon: r.categories?.icon ?? null,
    }),
  );

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <ExpenseModals categories={categories}>
      <main className="content">
        <div className="page-head">
          <div>
            <div className="eyebrow">All expenses</div>
            <h1>Expenses</h1>
            <div className="sub">
              {expenses.length} {expenses.length === 1 ? "entry" : "entries"} · ₹
              {formatINR(total)} total
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost sm" disabled title="Coming soon">
              Export CSV
            </button>
            <AddExpenseButton />
          </div>
        </div>

        <section className="card card-flush">
          <FilterBar
            categories={categories}
            currentRange={range}
            currentCategoryId={categoryId}
          />

          {error ? (
            <div className="empty-card">
              <div className="empty-emoji">⚠️</div>
              <div className="display" style={{ fontSize: 24, marginBottom: 4 }}>
                Couldn&apos;t load expenses.
              </div>
              <p className="muted">{error.message}</p>
            </div>
          ) : (
            <ExpenseList
              expenses={expenses}
              empty={<EmptyState filtered={categoryId !== null || range !== "all"} />}
            />
          )}
        </section>
      </main>
    </ExpenseModals>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="empty-card">
        <div className="empty-emoji">🔎</div>
        <div className="display" style={{ fontSize: 26, marginBottom: 4 }}>
          Nothing matches.
        </div>
        <p className="muted">
          Try a different filter, or zoom out to <b>All time</b>.
        </p>
      </div>
    );
  }
  return (
    <div className="empty-card">
      <div className="empty-emoji">🧾</div>
      <div className="display" style={{ fontSize: 26, marginBottom: 4 }}>
        A clean slate.
      </div>
      <p className="muted">Add your first expense — it gets easier from there.</p>
    </div>
  );
}
