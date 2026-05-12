type Point = { date: Date; total: number };

export function AreaChart({
  daily,
  height = 140,
}: {
  daily: Point[];
  height?: number;
}) {
  if (!daily.length) {
    return (
      <div
        className="placeholder-stripes"
        style={{ height, borderRadius: "var(--r-md)" }}
      />
    );
  }

  const W = 600;
  const PAD_TOP = 6;
  const PAD_BOTTOM = 4;
  const usable = height - PAD_TOP - PAD_BOTTOM;
  const max = Math.max(1, ...daily.map((d) => d.total));
  const step = daily.length > 1 ? W / (daily.length - 1) : 0;

  const points = daily.map((d, i) => ({
    x: daily.length > 1 ? i * step : W / 2,
    y: height - PAD_BOTTOM - (d.total / max) * usable,
  }));

  // Smooth path using midpoint-anchored cubic Béziers
  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label="Daily spending rhythm"
    >
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#area-grad)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((p, i) =>
        daily[i].total > 0 ? (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill="var(--accent)"
            vectorEffect="non-scaling-stroke"
          />
        ) : null,
      )}
    </svg>
  );
}
