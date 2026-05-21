"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { fmtISODate, startOfMonth } from "@/lib/dates";
import { MIN_ISO_DATE, customRangeSchema } from "@/lib/schemas";

export type ApplyPayload = { from: string; to: string };

export function CustomRangePopover({
  initialFrom,
  initialTo,
  containerRef,
  onApply,
  onClear,
  onClose,
}: {
  initialFrom: string | null;
  initialTo: string | null;
  containerRef: RefObject<HTMLElement | null>;
  onApply: (payload: ApplyPayload) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const today = useMemo(() => fmtISODate(new Date()), []);
  const monthStart = useMemo(
    () => fmtISODate(startOfMonth(new Date())),
    [],
  );

  const [from, setFrom] = useState<string>(initialFrom ?? monthStart);
  const [to, setTo] = useState<string>(initialTo ?? today);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const root = containerRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [containerRef, onClose]);

  const error: string | null = (() => {
    if (!from || !to) return "Pick both dates";
    const result = customRangeSchema.safeParse({ from, to });
    return result.success ? null : result.error.issues[0].message;
  })();

  function handleApply() {
    if (error) return;
    onApply({ from, to });
  }

  return (
    <div className="range-popover" role="dialog" aria-label="Custom date range">
      <div className="range-popover-grid">
        <label className="range-popover-field">
          <span className="label">From</span>
          <input
            type="date"
            className="input"
            value={from}
            min={MIN_ISO_DATE}
            max={today}
            onChange={(e) => setFrom(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </label>
        <label className="range-popover-field">
          <span className="label">To</span>
          <input
            type="date"
            className="input"
            value={to}
            min={MIN_ISO_DATE}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </label>
      </div>
      {error && <div className="field-error">{error}</div>}
      <div className="range-popover-actions">
        <button type="button" className="btn ghost sm" onClick={onClear}>
          Clear
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={handleApply}
          disabled={!!error}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
