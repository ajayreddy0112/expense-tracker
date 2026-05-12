import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AreaChart } from "@/components/AreaChart";
import { DonutChart, type DonutSlice } from "@/components/DonutChart";
import { ExpenseModals } from "@/components/ExpenseModals";
import { AddExpenseButton } from "@/components/AddExpenseButton";
import { ExpenseList } from "@/components/ExpenseList";
import { metaFor } from "@/lib/categories";
import {
  daysInMonth,
  fmtDay,
  fmtISODate,
  formatINR,
  monthLabel,
  parseISODate,
  shortMonth,
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

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  const monthStart = startOfMonth(today);
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevEndSameDay = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate(),
  );

  const [catsRes, expRes] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase
      .from("expenses")
      .select("id, amount, spent_on, note, category_id, categories ( name, icon )")
      .gte("spent_on", fmtISODate(prevStart))
      .lte("spent_on", fmtISODate(today))
      .order("spent_on", { ascending: false }),
  ]);

  const categories: Category[] = (catsRes.data ?? []) as Category[];
  const { data, error } = expRes;

  if (error) {
    return (
      <main className="content">
        <div className="page-head">
          <div>
            <div className="eyebrow">Something went sideways</div>
            <h1>Dashboard</h1>
            <div className="sub">
              We couldn&apos;t load your expenses just now.
            </div>
          </div>
        </div>
        <div className="card server-error" role="alert">
          {error.message}
        </div>
      </main>
    );
  }

  const all: ExpenseLite[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
    spent_on: r.spent_on,
    note: r.note,
    category_id: r.category_id,
    category_name: r.categories?.name ?? "Other",
    category_icon: r.categories?.icon ?? null,
  }));

  const monthStartISO = fmtISODate(monthStart);
  const prevEndSameDayISO = fmtISODate(prevEndSameDay);

  const monthExpenses = all.filter((e) => e.spent_on >= monthStartISO);
  const prevExpenses = all.filter(
    (e) => e.spent_on < monthStartISO && e.spent_on <= prevEndSameDayISO,
  );

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
  const delta = monthTotal - prevTotal;
  const deltaPct = prevTotal > 0 ? Math.round((delta / prevTotal) * 100) : 0;

  // By-category aggregation
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
  const donutData: DonutSlice[] = byCat.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: metaFor(c.name).color,
    total: c.total,
  }));

  // Daily totals (this month, days 1..today)
  const dim = daysInMonth(today);
  const lastDay = Math.min(today.getDate(), dim);
  const daily: { date: Date; total: number }[] = [];
  for (let day = 1; day <= lastDay; day++) {
    daily.push({
      date: new Date(today.getFullYear(), today.getMonth(), day),
      total: 0,
    });
  }
  for (const e of monthExpenses) {
    const d = parseISODate(e.spent_on);
    const idx = d.getDate() - 1;
    if (idx >= 0 && idx < daily.length) daily[idx].total += e.amount;
  }

  const recent = monthExpenses.slice(0, 5);
  const activeDays = daily.filter((d) => d.total > 0).length;
  const highestDay = daily.reduce((m, d) => Math.max(m, d.total), 0);

  const dayOfMonth = today.getDate();
  const pace = monthTotal / Math.max(1, dayOfMonth);
  const projection = pace * dim;
  const monthProgress = (dayOfMonth / dim) * 100;

  const biggest = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
  const countByCat: Record<string, number> = {};
  for (const e of monthExpenses)
    countByCat[e.category_name] = (countByCat[e.category_name] ?? 0) + 1;
  const topByCount = Object.entries(countByCat).sort((a, b) => b[1] - a[1])[0];
  const avgPerExpense = monthExpenses.length
    ? monthTotal / monthExpenses.length
    : 0;

  const hasData = monthExpenses.length > 0;
  const monthName = shortMonth(today);
  const greetName = user?.email?.split("@")[0] ?? "there";

  return (
    <ExpenseModals categories={categories}>
      <main className="content">
        <div className="page-head">
          <div>
            <div className="eyebrow">{monthLabel(today)} · so far</div>
            <h1>Dashboard</h1>
            <div className="sub">
              Hi {greetName} — quietly tallying your rupees.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost sm" disabled title="Coming soon">
              Export CSV
            </button>
            <AddExpenseButton />
          </div>
        </div>

        <div className="grid dash" style={{ marginBottom: 16 }}>
          <section className="card hero-card">
            <div className="eyebrow">Spent this month</div>
            <div className="hero-total">
              <div className="amount-row">
                <span className="currency">₹</span>
                <span className="amount">{formatINR(monthTotal)}</span>
              </div>
              {prevTotal > 0 ? (
                <span className={`delta ${delta >= 0 ? "up" : "down"}`}>
                  <span aria-hidden>{delta >= 0 ? "▲" : "▼"}</span>
                  <span className="num">₹{formatINR(Math.abs(delta))}</span>
                  <span className="dim">
                    vs same time last month ({delta >= 0 ? "+" : ""}
                    {deltaPct}%)
                  </span>
                </span>
              ) : (
                <span className="delta">
                  <span className="dim">
                    No comparable spending last month.
                  </span>
                </span>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Daily rhythm
              </div>
              <AreaChart daily={daily} />
              <div className="dim chart-meta">
                {activeDays} active days of {daily.length}
                {highestDay > 0 ? (
                  <> · highest day ₹{formatINR(highestDay)}</>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="eyebrow">By category</div>
            <div
              className="display"
              style={{ fontSize: 26, marginTop: 4, marginBottom: 18 }}
            >
              Where it went
            </div>

            {byCat.length === 0 ? (
              <div className="empty-mini">
                <div className="empty-mini-emoji">🪺</div>
                <div className="muted">
                  No spending yet — your wallet is having a quiet month.
                </div>
              </div>
            ) : (
              <>
                <div className="donut-host">
                  <DonutChart data={donutData} />
                </div>
                <hr className="hr" />
                <div className="cat-list" style={{ marginTop: 14 }}>
                  {byCat.slice(0, 4).map((c) => {
                    const pct =
                      monthTotal > 0 ? (c.total / monthTotal) * 100 : 0;
                    const color = metaFor(c.name).color;
                    return (
                      <div key={c.id} className="cat-row-compact">
                        <span
                          className="cat-swatch"
                          style={{ background: color }}
                        />
                        <span className="cat-name">
                          {c.icon} {c.name}
                        </span>
                        <span className="pct num">{Math.round(pct)}%</span>
                        <span className="cat-amount num">
                          ₹{formatINR(c.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        <div className="grid dash">
          <section className="card card-flush">
            <div className="card-head">
              <div className="display" style={{ fontSize: 22 }}>
                Recent
              </div>
              <span className="dim sm">{monthExpenses.length} this month</span>
            </div>
            <hr className="hr" />
            <ExpenseList
              expenses={recent}
              empty={
                <div className="empty-card">
                  <div className="empty-emoji">🧾</div>
                  <div
                    className="display"
                    style={{ fontSize: 26, marginBottom: 4 }}
                  >
                    A clean slate.
                  </div>
                  <p className="muted">
                    Add your first expense — it gets easier from there.
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <AddExpenseButton />
                  </div>
                </div>
              }
            />
          </section>

          <div className="dash-side">
            <section className="card">
              <div className="eyebrow">Pace</div>
              <div className="display" style={{ fontSize: 30, marginTop: 6 }}>
                ₹{formatINR(projection)}
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                if you keep going like this through {monthName}.
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="bar-track" style={{ height: 6 }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${monthProgress}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
                <div
                  className="dim chart-meta"
                  style={{
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    Day {dayOfMonth} of {dim}
                  </span>
                  <span>{Math.round(monthProgress)}% through the month</span>
                </div>
              </div>
            </section>

            <section className="card insights">
              <div className="eyebrow">Did you know?</div>

              {biggest ? (
                <div className="insight">
                  <div className="insight-emoji">🏆</div>
                  <div>
                    <div className="insight-title">
                      Your biggest splurge was{" "}
                      <b>{biggest.note?.trim() || biggest.category_name}</b>
                    </div>
                    <div className="dim sm">
                      ₹{formatINR(biggest.amount, { full: true })} on{" "}
                      {fmtDay(parseISODate(biggest.spent_on))}.
                    </div>
                  </div>
                </div>
              ) : null}

              {topByCount ? (
                <div className="insight">
                  <div className="insight-emoji">
                    {metaFor(topByCount[0]).fallbackIcon}
                  </div>
                  <div>
                    <div className="insight-title">
                      You logged <b>{topByCount[0]}</b> the most this month
                    </div>
                    <div className="dim sm">
                      {topByCount[1]} times. No shame in a routine.
                    </div>
                  </div>
                </div>
              ) : null}

              {avgPerExpense > 0 ? (
                <div className="insight">
                  <div className="insight-emoji">🧮</div>
                  <div>
                    <div className="insight-title">
                      That&apos;s <b>₹{formatINR(avgPerExpense)}</b> per logged
                      expense, on average
                    </div>
                    <div className="dim sm">
                      Across {monthExpenses.length} entries.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="insight">
                  <div className="insight-emoji">🌱</div>
                  <div>
                    <div className="insight-title">Nothing to riff on yet.</div>
                    <div className="dim sm">
                      Add a few expenses and we&apos;ll have things to say.
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {hasData ? null : null /* keep server tree stable */}
      </main>
    </ExpenseModals>
  );
}
