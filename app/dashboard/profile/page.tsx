import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { formatINR } from "@/lib/dates";

function initialsOf(email: string | undefined): string {
  if (!email) return "—";
  const local = email.split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase() || "—";
}

function nameOf(email: string | undefined): string {
  if (!email) return "Tracker";
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

const SETTINGS = [
  { ic: "🔔", name: "Notifications", sub: "Weekly digest, large expenses" },
  { ic: "💱", name: "Currency",      sub: "INR ₹" },
  { ic: "🗂️", name: "Categories",   sub: "Customize, reorder, hide" },
  { ic: "📤", name: "Export data",   sub: "CSV · download all" },
];

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? undefined;
  const displayName = nameOf(email);
  const initials = initialsOf(email);

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, spent_on");

  const rows = (data ?? []) as { amount: number | string; spent_on: string }[];
  const total = rows.reduce(
    (s, r) => s + (typeof r.amount === "string" ? parseFloat(r.amount) : r.amount),
    0,
  );
  const count = rows.length;
  const firstSpentOn = rows.reduce<string | null>(
    (min, r) => (min === null || r.spent_on < min ? r.spent_on : min),
    null,
  );
  const memberSince = firstSpentOn
    ? new Date(firstSpentOn).toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : user?.created_at
      ? new Date(user.created_at).toLocaleString("en-IN", {
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Profile</h1>
        </div>
      </div>

      <section
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div className="m-avatar-lg">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>{displayName}</div>
          <div
            className="dim"
            style={{
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email ?? "—"}
          </div>
        </div>
      </section>

      <section className="card card-flush" style={{ marginBottom: 14 }}>
        <div className="m-cat-row">
          <div className="ic">📒</div>
          <div className="meta">
            <div className="name">Total logged</div>
          </div>
          <div className="amt">{count}</div>
        </div>
        <div className="m-cat-row">
          <div className="ic">💸</div>
          <div className="meta">
            <div className="name">All-time spend</div>
          </div>
          <div className="amt">₹{formatINR(total)}</div>
        </div>
        <div className="m-cat-row">
          <div className="ic">📅</div>
          <div className="meta">
            <div className="name">Member since</div>
          </div>
          <div
            className="amt"
            style={{
              fontWeight: 400,
              fontSize: 13.5,
              color: "var(--ink-700)",
            }}
          >
            {memberSince}
          </div>
        </div>
      </section>

      {error && (
        <div className="server-error" role="alert" style={{ marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <div className="m-sec">
        <span className="title">Settings</span>
      </div>
      <section className="card card-flush" style={{ marginBottom: 20 }}>
        {SETTINGS.map((r) => (
          <div key={r.name} className="m-row" style={{ cursor: "default" }}>
            <div
              className="ic"
              style={{ background: "var(--paper-2)", fontSize: 17 }}
            >
              {r.ic}
            </div>
            <div className="meta">
              <div className="ttl">{r.name}</div>
              <div className="sub">{r.sub}</div>
            </div>
            <div
              className="amt"
              style={{ color: "var(--ink-400)", fontWeight: 400 }}
              aria-hidden="true"
            >
              ›
            </div>
          </div>
        ))}
      </section>

      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>Sign out</div>
          <div className="dim sm">You can come back any time.</div>
        </div>
        <SignOutButton />
      </div>
    </main>
  );
}
