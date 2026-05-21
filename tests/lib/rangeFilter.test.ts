/**
 * Unit tests for lib/rangeFilter.ts
 *
 * Every test case derives from the spec's stated contract for parseRangeParams
 * and rangeBounds — NOT from reading the implementation internals.
 *
 * Spec source: .claude/specs/03-date-filter-expenses.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseRangeParams,
  rangeBounds,
  VALID_RANGES,
  type Range,
} from "@/lib/rangeFilter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Produce a deterministic "today" for tests that pin to a fixed date. */
function pinDate(isoDate: string) {
  const fixed = new Date(isoDate + "T12:00:00");
  vi.useFakeTimers();
  vi.setSystemTime(fixed);
}

function restoreDate() {
  vi.useRealTimers();
}

// ---------------------------------------------------------------------------
// VALID_RANGES
// ---------------------------------------------------------------------------

describe("VALID_RANGES", () => {
  it("contains exactly the five documented range values", () => {
    const expected: Range[] = ["thismonth", "lastmonth", "last30", "all", "custom"];
    expect(VALID_RANGES.size).toBe(5);
    for (const r of expected) {
      expect(VALID_RANGES.has(r)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// parseRangeParams — happy paths
// ---------------------------------------------------------------------------

describe("parseRangeParams — preset ranges", () => {
  it("returns thismonth with null from/to when range param is omitted", () => {
    const result = parseRangeParams({});
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("returns thismonth when range=thismonth is explicit", () => {
    const result = parseRangeParams({ range: "thismonth" });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("returns lastmonth with null from/to regardless of from/to params", () => {
    const result = parseRangeParams({
      range: "lastmonth",
      from: "2025-01-01",
      to: "2025-01-31",
    });
    expect(result).toEqual({ range: "lastmonth", from: null, to: null });
  });

  it("returns last30 with null from/to regardless of from/to params", () => {
    const result = parseRangeParams({
      range: "last30",
      from: "2025-01-01",
      to: "2025-01-31",
    });
    expect(result).toEqual({ range: "last30", from: null, to: null });
  });

  it("returns all with null from/to regardless of from/to params", () => {
    const result = parseRangeParams({
      range: "all",
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(result).toEqual({ range: "all", from: null, to: null });
  });

  it("returns custom range with valid from and to when both are valid ISO dates and from <= to", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "2025-03-01",
      to: "2025-03-15",
    });
    expect(result).toEqual({ range: "custom", from: "2025-03-01", to: "2025-03-15" });
  });

  it("returns custom range when from equals to (single-day window is valid)", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "2025-06-10",
      to: "2025-06-10",
    });
    expect(result).toEqual({ range: "custom", from: "2025-06-10", to: "2025-06-10" });
  });

  it("returns custom range when from is exactly 1900-01-01 (lower boundary)", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "1900-01-01",
      to: "1900-01-31",
    });
    expect(result).toEqual({ range: "custom", from: "1900-01-01", to: "1900-01-31" });
  });
});

// ---------------------------------------------------------------------------
// parseRangeParams — downgrade behaviors
// ---------------------------------------------------------------------------

describe("parseRangeParams — downgrade to thismonth on invalid input", () => {
  it("downgrades to thismonth when range is an unknown string (garbage range)", () => {
    const result = parseRangeParams({ range: "foo" });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when range is an empty string", () => {
    const result = parseRangeParams({ range: "" });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when range=custom but from is missing", () => {
    const result = parseRangeParams({ range: "custom", to: "2025-03-15" });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when range=custom but to is missing", () => {
    const result = parseRangeParams({ range: "custom", from: "2025-03-01" });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when range=custom and both from and to are missing", () => {
    const result = parseRangeParams({ range: "custom" });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when from does not match ISO YYYY-MM-DD format", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "03/01/2025",
      to: "2025-03-15",
    });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when to does not match ISO YYYY-MM-DD format", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "2025-03-01",
      to: "March 15 2025",
    });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when from is a partial ISO string (missing day)", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "2025-03",
      to: "2025-03-15",
    });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when from > to (inverted range)", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "2025-03-15",
      to: "2025-03-01",
    });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when from is before 1900-01-01 (below minimum)", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "1899-12-31",
      to: "1900-01-31",
    });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("downgrades to thismonth when to is before 1900-01-01", () => {
    const result = parseRangeParams({
      range: "custom",
      from: "1900-01-01",
      to: "1899-06-01",
    });
    expect(result).toEqual({ range: "thismonth", from: null, to: null });
  });

  it("strips from/to and returns range:thismonth when preset has incoming from/to but range is valid preset", () => {
    // The spec: valid preset → from: null, to: null regardless of incoming from/to
    const result = parseRangeParams({
      range: "thismonth",
      from: "2025-01-01",
      to: "2025-01-31",
    });
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
    expect(result.range).toBe("thismonth");
  });
});

// ---------------------------------------------------------------------------
// rangeBounds — happy paths
// ---------------------------------------------------------------------------

describe("rangeBounds — thismonth", () => {
  beforeEach(() => pinDate("2025-05-15"));
  afterEach(restoreDate);

  it("returns the first and last day of the current month", () => {
    const bounds = rangeBounds("thismonth", null, null);
    expect(bounds.from).toBe("2025-05-01");
    expect(bounds.to).toBe("2025-05-31");
  });

  it("always returns a from and to (both defined)", () => {
    const bounds = rangeBounds("thismonth", null, null);
    expect(bounds.from).toBeDefined();
    expect(bounds.to).toBeDefined();
  });
});

describe("rangeBounds — thismonth at month boundaries", () => {
  it("returns 2025-02-01 to 2025-02-28 for February of a non-leap year", () => {
    pinDate("2025-02-14");
    const bounds = rangeBounds("thismonth", null, null);
    restoreDate();
    expect(bounds.from).toBe("2025-02-01");
    expect(bounds.to).toBe("2025-02-28");
  });

  it("returns 2024-02-01 to 2024-02-29 for February of a leap year", () => {
    pinDate("2024-02-14");
    const bounds = rangeBounds("thismonth", null, null);
    restoreDate();
    expect(bounds.from).toBe("2024-02-01");
    expect(bounds.to).toBe("2024-02-29");
  });
});

describe("rangeBounds — lastmonth", () => {
  afterEach(restoreDate);

  it("returns the first and last day of the previous calendar month", () => {
    pinDate("2025-05-15");
    const bounds = rangeBounds("lastmonth", null, null);
    expect(bounds.from).toBe("2025-04-01");
    expect(bounds.to).toBe("2025-04-30");
  });

  it("correctly handles year-crossing (January → December of previous year)", () => {
    pinDate("2025-01-10");
    const bounds = rangeBounds("lastmonth", null, null);
    expect(bounds.from).toBe("2024-12-01");
    expect(bounds.to).toBe("2024-12-31");
  });

  it("returns Feb 1–28 when today is in March of a non-leap year", () => {
    pinDate("2025-03-15");
    const bounds = rangeBounds("lastmonth", null, null);
    expect(bounds.from).toBe("2025-02-01");
    expect(bounds.to).toBe("2025-02-28");
  });
});

describe("rangeBounds — last30", () => {
  afterEach(restoreDate);

  it("returns a from exactly 30 days before today and to equal to today", () => {
    pinDate("2025-05-21");
    const bounds = rangeBounds("last30", null, null);
    expect(bounds.from).toBe("2025-04-21");
    expect(bounds.to).toBe("2025-05-21");
  });

  it("crosses a year boundary correctly", () => {
    pinDate("2025-01-15");
    const bounds = rangeBounds("last30", null, null);
    expect(bounds.from).toBe("2024-12-16");
    expect(bounds.to).toBe("2025-01-15");
  });
});

describe("rangeBounds — all", () => {
  it("returns an empty object (no from, no to)", () => {
    const bounds = rangeBounds("all", null, null);
    expect(bounds).toEqual({});
    expect(bounds.from).toBeUndefined();
    expect(bounds.to).toBeUndefined();
  });

  it("ignores any customFrom/customTo passed when range is all", () => {
    const bounds = rangeBounds("all", "2025-01-01", "2025-12-31");
    expect(bounds.from).toBeUndefined();
    expect(bounds.to).toBeUndefined();
  });
});

describe("rangeBounds — custom", () => {
  it("returns exactly the provided customFrom and customTo when both are supplied", () => {
    const bounds = rangeBounds("custom", "2025-03-01", "2025-03-15");
    expect(bounds.from).toBe("2025-03-01");
    expect(bounds.to).toBe("2025-03-15");
  });

  it("returns an empty object when customFrom is null", () => {
    const bounds = rangeBounds("custom", null, "2025-03-15");
    expect(bounds).toEqual({});
  });

  it("returns an empty object when customTo is null", () => {
    const bounds = rangeBounds("custom", "2025-03-01", null);
    expect(bounds).toEqual({});
  });

  it("returns an empty object when both customFrom and customTo are null", () => {
    const bounds = rangeBounds("custom", null, null);
    expect(bounds).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseRangeParams + rangeBounds integration: shareable URL round-trip
// ---------------------------------------------------------------------------

describe("parseRangeParams + rangeBounds — shareable URL round-trip", () => {
  it("a user pasting ?range=custom&from=2025-03-01&to=2025-03-15 gets the same bounds", () => {
    const parsed = parseRangeParams({
      range: "custom",
      from: "2025-03-01",
      to: "2025-03-15",
    });
    expect(parsed.range).toBe("custom");
    const bounds = rangeBounds(parsed.range, parsed.from, parsed.to);
    expect(bounds.from).toBe("2025-03-01");
    expect(bounds.to).toBe("2025-03-15");
  });

  it("a URL with a malformed custom range falls back to thismonth bounds", () => {
    pinDate("2025-05-21");
    const parsed = parseRangeParams({
      range: "custom",
      from: "bad-date",
      to: "2025-03-15",
    });
    expect(parsed.range).toBe("thismonth");
    const bounds = rangeBounds(parsed.range, parsed.from, parsed.to);
    // thismonth bounds should be returned (not empty)
    expect(bounds.from).toBe("2025-05-01");
    expect(bounds.to).toBe("2025-05-31");
    restoreDate();
  });
});
