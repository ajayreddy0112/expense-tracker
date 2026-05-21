"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { metaFor } from "@/lib/categories";
import type { Category } from "@/lib/types";
import type { Range } from "@/lib/rangeFilter";
import { CustomRangePopover } from "./CustomRangePopover";
import { fmtDay, parseISODate } from "@/lib/dates";

const RANGES: { value: Range; label: string }[] = [
  { value: "thismonth", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "last30", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function FilterBar({
  categories,
  currentRange,
  currentCategoryId,
  customFrom,
  customTo,
}: {
  categories: Category[];
  currentRange: Range;
  currentCategoryId: string | null;
  customFrom: string | null;
  customTo: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  function handleRangeClick(value: Range) {
    if (value === "custom") {
      setPopoverOpen((open) => !open);
      return;
    }
    setParams({
      range: value === "thismonth" ? null : value,
      from: null,
      to: null,
    });
  }

  return (
    <div className="bar">
      <div className="bar-chips" role="group" aria-label="Categories">
        <button
          className={`chip${currentCategoryId === null ? " active" : ""}`}
          onClick={() => setParams({ cat: null })}
        >
          All
        </button>
        {categories.map((c) => {
          const meta = metaFor(c.name);
          const active = currentCategoryId === c.id;
          return (
            <button
              key={c.id}
              className={`chip${active ? " active" : ""}`}
              onClick={() => setParams({ cat: active ? null : c.id })}
            >
              <span className="dot" style={{ background: meta.color }} />
              {c.icon ?? meta.fallbackIcon} {c.name}
            </button>
          );
        })}
      </div>
      <div className="bar-spacer" />
      <div className="bar-range" ref={rangeRef}>
        <div className="seg" role="group" aria-label="Date range">
          {RANGES.map((r) => {
            const isCustom = r.value === "custom";
            const on = currentRange === r.value;
            return (
              <button
                key={r.value}
                className={on ? "on" : ""}
                onClick={() => handleRangeClick(r.value)}
                aria-expanded={isCustom ? popoverOpen : undefined}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {popoverOpen && (
          <CustomRangePopover
            initialFrom={customFrom}
            initialTo={customTo}
            containerRef={rangeRef}
            onApply={({ from, to }) => {
              setParams({ range: "custom", from, to });
              setPopoverOpen(false);
            }}
            onClear={() => {
              setParams({ range: null, from: null, to: null });
              setPopoverOpen(false);
            }}
            onClose={() => setPopoverOpen(false)}
          />
        )}
        {!popoverOpen && currentRange === "custom" && customFrom && customTo && (
          <div className="bar-range-caption muted">
            Showing {fmtDay(parseISODate(customFrom))} –{" "}
            {fmtDay(parseISODate(customTo))}
          </div>
        )}
      </div>
    </div>
  );
}
