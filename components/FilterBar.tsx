"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { metaFor } from "@/lib/categories";
import type { Category } from "@/lib/types";

const RANGES = [
  { value: "thismonth", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "last30",    label: "Last 30 days" },
  { value: "all",       label: "All time" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

export function FilterBar({
  categories,
  currentRange,
  currentCategoryId,
}: {
  categories: Category[];
  currentRange: RangeValue;
  currentCategoryId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (value === null) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="bar">
      <div className="bar-chips" role="group" aria-label="Categories">
        <button
          className={`chip${currentCategoryId === null ? " active" : ""}`}
          onClick={() => setParam("cat", null)}
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
              onClick={() => setParam("cat", active ? null : c.id)}
            >
              <span className="dot" style={{ background: meta.color }} />
              {c.icon ?? meta.fallbackIcon} {c.name}
            </button>
          );
        })}
      </div>
      <div className="bar-spacer" />
      <div className="seg" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.value}
            className={currentRange === r.value ? "on" : ""}
            onClick={() =>
              setParam("range", r.value === "thismonth" ? null : r.value)
            }
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
