type Point = { date: Date; total: number };

export function MobileSparkline({
  daily,
  height = 56,
}: {
  daily: Point[];
  height?: number;
}) {
  if (!daily.length) {
    return <svg className="m-spark" viewBox={`0 0 320 ${height}`} width="100%" height={height} />;
  }

  const w = 320;
  const h = height;
  const max = Math.max(1, ...daily.map((d) => d.total));
  const pts = daily.map((d, i) => {
    const x = (i / Math.max(1, daily.length - 1)) * (w - 4) + 2;
    const y = h - 2 - (d.total / max) * (h - 6);
    return [x, y] as const;
  });
  const path = pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const fill = `${path} L ${last[0]} ${h} L ${first[0]} ${h} Z`;

  return (
    <svg className="m-spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden="true">
      <defs>
        <linearGradient id="m-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#m-spark-fill)" />
      <path
        d={path}
        stroke="white"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
