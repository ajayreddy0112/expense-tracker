"use client";

import { useState } from "react";
import { formatINR } from "@/lib/dates";

export type DonutSlice = {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
};

type Props = {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
};

export function DonutChart({
  data,
  size = 232,
  thickness = 26,
  centerLabel = "Top category",
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.total, 0) || 1;
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const gapRad = 0.018;

  let offset = -Math.PI / 2;
  const arcs = data.map((d) => {
    const frac = d.total / total;
    const arcRad = Math.max(0, frac * 2 * Math.PI - gapRad);
    const startA = offset;
    offset += frac * 2 * Math.PI;
    const len = (arcRad / (2 * Math.PI)) * C;
    const dash = `${len} ${C}`;
    const rot = (startA + Math.PI / 2) * (180 / Math.PI);
    return { d, dash, rot };
  });

  const top = data[0];
  const showHover = hovered != null && arcs[hovered];

  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--paper-3)"
          strokeWidth={thickness}
        />
        {arcs.map((a, i) => (
          <circle
            key={a.d.id}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.d.color}
            strokeWidth={thickness}
            strokeDasharray={a.dash}
            strokeLinecap="butt"
            transform={`rotate(${a.rot} ${cx} ${cy})`}
            style={{
              opacity: hovered == null || hovered === i ? 1 : 0.35,
              transition: "opacity .15s",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="donut-center">
        {showHover ? (
          <>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {arcs[hovered].d.icon} {arcs[hovered].d.name}
            </div>
            <div className="display" style={{ fontSize: 30 }}>
              ₹{formatINR(arcs[hovered].d.total)}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {Math.round((arcs[hovered].d.total / total) * 100)}% of total
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {centerLabel}
            </div>
            <div className="display" style={{ fontSize: 30 }}>
              {top ? (
                <>
                  {top.icon} {top.name}
                </>
              ) : (
                "—"
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
