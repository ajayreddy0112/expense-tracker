export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function monthLabel(d: Date): string {
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function shortMonth(d: Date): string {
  return d.toLocaleString("en-IN", { month: "short" });
}

export function fmtISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a 'YYYY-MM-DD' string (as returned by Postgres `date`) as a local date.
// Using `new Date(string)` would interpret it as UTC and shift on negative offsets.
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDay(d: Date): string {
  return d.toLocaleString("en-IN", { day: "numeric", month: "short" });
}

export function ageFromDOB(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function formatINR(n: number, opts?: { full?: boolean }): string {
  if (opts?.full) {
    return n.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }
  return Math.round(n).toLocaleString("en-IN");
}
