import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddExpenseButton } from "@/components/AddExpenseButton";
import { FilterBar } from "@/components/FilterBar";
import { ExpenseList } from "@/components/ExpenseList";
import { MobileExpenses } from "@/components/MobileExpenses";
import { formatINR } from "@/lib/dates";
import { parseRangeParams, rangeBounds } from "@/lib/rangeFilter";
import type { Category, ExpenseLite } from "@/lib/types";

type Row = {
  id: string;
  amount: number | string;
  spent_on: string;
  note: string | null;
  category_id: string;
  categories: { name: string; icon: string | null } | null;
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    cat?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    range,
    from: customFrom,
    to: customTo,
  } = parseRangeParams({
    range: params.range,
    from: params.from,
    to: params.to,
  });
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

      const { from, to } = rangeBounds(range, customFrom, customTo);
      if (from) q = q.gte("spent_on", from);
      if (to) q = q.lte("spent_on", to);
      if (categoryId) q = q.eq("category_id", categoryId);

      return q;
    })(),
  ]);

  const categories: Category[] = (catRows ?? []) as Category[];
  const { data, error } = expensesQuery;
  if (error) {
    console.error("[expenses] Supabase query failed:", error);
  }

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
  const isFiltered = categoryId !== null || range !== "all";

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow desktop-only">All expenses</div>
          <h1>Expenses</h1>
          <div className="sub">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"} · ₹
            {formatINR(total)} total
          </div>
        </div>
        <div className="desktop-only" style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost sm" disabled title="Coming soon">
            Export CSV
          </button>
          <AddExpenseButton />
        </div>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────── */}
      <section className="card card-flush desktop-only">
        <FilterBar
          categories={categories}
          currentRange={range}
          currentCategoryId={categoryId}
          customFrom={customFrom}
          customTo={customTo}
        />

        {error ? (
          <div className="empty-card">
            <div className="empty-emoji">⚠️</div>
            <div className="display" style={{ fontSize: 24, marginBottom: 4 }}>
              Couldn&apos;t load expenses.
            </div>
            <p className="muted">
              Something went wrong. Please refresh and try again.
            </p>
          </div>
        ) : (
          <ExpenseList
            expenses={expenses}
            empty={<EmptyState filtered={isFiltered} />}
          />
        )}
      </section>

      {/* ── Mobile layout ──────────────────────────────────────── */}
      <div className="mobile-only">
        {error ? (
          <div className="m-card">
            <div className="m-empty">
              <div className="emoji">⚠️</div>
              <div className="ttl">Couldn&apos;t load expenses.</div>
              <div className="sub">
                Something went wrong. Please refresh and try again.
              </div>
            </div>
          </div>
        ) : (
          <MobileExpenses expenses={expenses} categories={categories} />
        )}
      </div>
    </main>
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
