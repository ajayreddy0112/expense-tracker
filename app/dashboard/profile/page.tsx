import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { ageFromDOB, formatINR, parseISODate } from "@/lib/dates";
import type { Profile } from "@/lib/types";

function initialsOf(profile: Profile | null, email: string | undefined): string {
  const first = profile?.first_name?.trim() ?? "";
  const last = profile?.last_name?.trim() ?? "";
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "—";
}

function displayName(profile: Profile | null): string {
  const first = profile?.first_name?.trim() ?? "";
  const last = profile?.last_name?.trim() ?? "";
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "Complete your profile";
}

function genderLabel(gender: Profile["gender"] | undefined): string {
  if (!gender) return "—";
  switch (gender) {
    case "male":   return "Male";
    case "female": return "Female";
  }
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

  const [{ data: profileRow, error: profileError }, { data: expRows, error: expensesError }] =
    await Promise.all([
      user
        ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("expenses").select("amount, spent_on"),
    ]);

  const profile: Profile | null = (profileRow as Profile | null) ?? null;

  const initials = initialsOf(profile, email);
  const fullName = displayName(profile);

  const rows = (expRows ?? []) as { amount: number | string; spent_on: string }[];
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

  const age =
    profile?.date_of_birth
      ? ageFromDOB(parseISODate(profile.date_of_birth))
      : null;

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
          <div style={{ fontSize: 17, fontWeight: 500 }}>{fullName}</div>
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
          {profile && (
            <div className="dim sm" style={{ marginTop: 2 }}>
              {genderLabel(profile.gender)}
              {age !== null ? ` · ${age} years old` : ""}
            </div>
          )}
        </div>
      </section>

      {profileError && (
        <div className="server-error" role="alert" style={{ marginBottom: 14 }}>
          {profileError.message}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <ProfileEditForm initial={profile} />
      </div>

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

      {expensesError && (
        <div className="server-error" role="alert" style={{ marginBottom: 14 }}>
          {expensesError.message}
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
