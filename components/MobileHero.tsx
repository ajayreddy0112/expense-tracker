import { metaFor } from "@/lib/categories";
import { formatINR, shortMonth } from "@/lib/dates";
import { MobileSparkline } from "./MobileSparkline";

type ByCat = { id: string; name: string; icon: string; total: number };

export function MobileHero({
  monthDate,
  monthTotal,
  delta,
  deltaPct,
  prevTotal,
  byCat,
  daily,
  dayOfMonth,
  daysInMonth,
}: {
  monthDate: Date;
  monthTotal: number;
  delta: number;
  deltaPct: number;
  prevTotal: number;
  byCat: ByCat[];
  daily: { date: Date; total: number }[];
  dayOfMonth: number;
  daysInMonth: number;
}) {
  const monthName = shortMonth(monthDate);
  const top = byCat.slice(0, 5);
  const totalForBar = top.reduce((s, c) => s + c.total, 0) || 1;
  const projection = (monthTotal / Math.max(1, dayOfMonth)) * daysInMonth;
  const progressPct = (dayOfMonth / daysInMonth) * 100;

  return (
    <section className="m-hero">
      <div className="eyebrow">Spent in {monthName}</div>
      <div className="amount-row">
        <span className="cur">₹</span>
        <span className="amt">{formatINR(monthTotal)}</span>
      </div>

      {prevTotal > 0 ? (
        <div className="delta">
          <span aria-hidden>{delta >= 0 ? "↑" : "↓"}</span>
          <b>₹{formatINR(Math.abs(delta))}</b>
          <span>
            vs same time last month ({delta >= 0 ? "+" : ""}
            {deltaPct}%)
          </span>
        </div>
      ) : (
        <div className="delta">
          <span>No comparable spending last month.</span>
        </div>
      )}

      {top.length > 0 && (
        <>
          <div className="m-hero-cats" aria-hidden="true">
            {top.map((c) => (
              <i
                key={c.id}
                style={{
                  background: metaFor(c.name).color,
                  flex: c.total / totalForBar,
                }}
              />
            ))}
          </div>
          <div className="m-hero-legend">
            {top.slice(0, 4).map((c) => (
              <span key={c.id} className="item">
                <span className="dot" style={{ background: metaFor(c.name).color }} />
                {c.icon} {c.name}
              </span>
            ))}
          </div>
        </>
      )}

      <MobileSparkline daily={daily} />

      <div className="m-progress">
        <div style={{ width: `${progressPct}%` }} />
      </div>
      <div className="m-progress-meta">
        <span>
          Day {dayOfMonth} of {daysInMonth}
        </span>
        {monthTotal > 0 && (
          <span>On pace for ₹{formatINR(projection)}</span>
        )}
      </div>
    </section>
  );
}
