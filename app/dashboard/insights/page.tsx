import { createSupabaseServerClient } from "@/lib/supabase/server";
import { metaFor } from "@/lib/categories";
import {
  endOfMonth,
  fmtDay,
  fmtISODate,
  formatINR,
  monthLabel,
  parseISODate,
  startOfMonth,
} from "@/lib/dates";
import type { ExpenseLite } from "@/lib/types";

type Row = {
  id: string;
  amount: number | string;
  spent_on: string;
  note: string | null;
  category_id: string;
  categories: { name: string; icon: string | null } | null;
};

export default async function InsightsPage() {
  const supabase = await createSupabaseServerClient();

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, spent_on, note, category_id, categories ( name, icon )")
    .gte("spent_on", fmtISODate(monthStart))
    .lte("spent_on", fmtISODate(monthEnd))
    .order("spent_on", { ascending: false });

  if (error) {
    return (
      <main className="content">
        <div className="page-head">
          <div>
            <div className="eyebrow desktop-only">Insights</div>
            <h1>Insights</h1>
          </div>
        </div>
        <div className="card server-error" role="alert">
          {error.message}
        </div>
      </main>
    );
  }

  const monthExpenses: ExpenseLite[] = ((data ?? []) as unknown as Row[]).map(
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

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const byCatMap = new Map<
    string,
    { id: string; name: string; icon: string; total: number }
  >();
  for (const e of monthExpenses) {
    const existing = byCatMap.get(e.category_id);
    if (existing) existing.total += e.amount;
    else
      byCatMap.set(e.category_id, {
        id: e.category_id,
        name: e.category_name,
        icon: e.category_icon ?? metaFor(e.category_name).fallbackIcon,
        total: e.amount,
      });
  }
  const byCat = [...byCatMap.values()].sort((a, b) => b.total - a.total);

  const biggest = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
  const countByCat: Record<string, number> = {};
  for (const e of monthExpenses)
    countByCat[e.category_name] = (countByCat[e.category_name] ?? 0) + 1;
  const topByCount = Object.entries(countByCat).sort((a, b) => b[1] - a[1])[0];
  const avg = monthExpenses.length ? monthTotal / monthExpenses.length : 0;

  const top = byCat[0];
  const monthName = monthLabel(today).split(" ")[0];

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">{monthLabel(today)}</div>
          <h1>Insights</h1>
          <div className="sub desktop-only">
            What the numbers are quietly telling you.
          </div>
        </div>
      </div>

      {monthExpenses.length === 0 ? (
        <div className="card">
          <div className="empty-card">
            <div className="empty-emoji">🌱</div>
            <div className="display" style={{ fontSize: 26, marginBottom: 4 }}>
              Nothing to riff on yet.
            </div>
            <p className="muted">
              Add a few expenses this month and we&apos;ll have things to say.
            </p>
          </div>
        </div>
      ) : (
        <>
          {top && (
            <section className="card" style={{ marginBottom: 14 }}>
              <div className="eyebrow">Top category</div>
              <div
                className="display"
                style={{ fontSize: 36, margin: "8px 0 2px" }}
              >
                {top.icon} {top.name}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                ₹{formatINR(top.total)} ·{" "}
                {Math.round((top.total / monthTotal) * 100)}% of {monthName}
              </div>
            </section>
          )}

          <section className="card insights" style={{ marginBottom: 14 }}>
            <div className="eyebrow">Did you know?</div>

            {biggest && (
              <div className="insight">
                <div className="insight-emoji">🏆</div>
                <div>
                  <div className="insight-title">
                    Biggest splurge:{" "}
                    <b>{biggest.note?.trim() || biggest.category_name}</b>
                  </div>
                  <div className="dim sm">
                    ₹{formatINR(biggest.amount, { full: true })} on{" "}
                    {fmtDay(parseISODate(biggest.spent_on))}.
                  </div>
                </div>
              </div>
            )}

            {topByCount && (
              <div className="insight">
                <div className="insight-emoji">
                  {metaFor(topByCount[0]).fallbackIcon}
                </div>
                <div>
                  <div className="insight-title">
                    You logged <b>{topByCount[0]}</b> the most
                  </div>
                  <div className="dim sm">
                    {topByCount[1]} times this month. No shame in a routine.
                  </div>
                </div>
              </div>
            )}

            {avg > 0 && (
              <div className="insight">
                <div className="insight-emoji">🧮</div>
                <div>
                  <div className="insight-title">
                    ₹{formatINR(avg)} per expense on average
                  </div>
                  <div className="dim sm">
                    Across {monthExpenses.length} entries.
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="m-sec">
            <span className="title">Full breakdown</span>
          </div>
          <section className="card card-flush">
            {byCat.map((c) => {
              const color = metaFor(c.name).color;
              const pct = (c.total / monthTotal) * 100;
              return (
                <div key={c.id} className="m-cat-row">
                  <div
                    className="ic"
                    style={{
                      background: `color-mix(in oklch, ${color} 14%, var(--paper))`,
                      borderColor: `color-mix(in oklch, ${color} 20%, var(--hairline))`,
                    }}
                  >
                    {c.icon}
                  </div>
                  <div className="meta">
                    <div className="name">{c.name}</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                  <div className="amt">
                    ₹{formatINR(c.total)}
                    <span className="pct">{Math.round(pct)}%</span>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
