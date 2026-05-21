import { endOfMonth, fmtISODate, startOfMonth } from "./dates";

export type Range = "thismonth" | "lastmonth" | "last30" | "all" | "custom";

export const VALID_RANGES: ReadonlySet<Range> = new Set<Range>([
  "thismonth",
  "lastmonth",
  "last30",
  "all",
  "custom",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "1900-01-01";

export type ParsedRange = {
  range: Range;
  from: string | null;
  to: string | null;
};

export function parseRangeParams(p: {
  range?: string;
  from?: string;
  to?: string;
}): ParsedRange {
  const rawRange = p.range ?? "thismonth";
  if (!VALID_RANGES.has(rawRange as Range)) {
    return { range: "thismonth", from: null, to: null };
  }
  const range = rawRange as Range;
  if (range !== "custom") {
    return { range, from: null, to: null };
  }
  const from = p.from ?? "";
  const to = p.to ?? "";
  const validShape =
    ISO_DATE.test(from) &&
    ISO_DATE.test(to) &&
    from >= MIN_DATE &&
    to >= MIN_DATE &&
    from <= to;
  if (!validShape) {
    return { range: "thismonth", from: null, to: null };
  }
  return { range: "custom", from, to };
}

export function rangeBounds(
  range: Range,
  customFrom: string | null,
  customTo: string | null,
): { from?: string; to?: string } {
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
  if (range === "custom" && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  return {};
}
