interface Props { title: string; values: number[]; color?: string; suffix?: string; }

function buildPath(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  return values.map((v, i) => {
    const x = padding + (i / Math.max(1, values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

export function SparklineChart({ title, values, color = '#2f6fed', suffix = '' }: Props) {
  const width = 420;
  const height = 170;
  const padding = 14;
  const padded = values.length > 1 ? values : [0, values[0] ?? 0];
  const max = Math.max(...padded, 1);
  const min = Math.min(...padded, 0);
  const path = buildPath(padded, width, height, padding);
  const last = padded[padded.length - 1] ?? 0;
  return (
    <section className="panel compact-panel chart-panel">
      <div className="section-header section-header-compact">
        <div className="section-copy">
          <h3>{title}</h3>
          <p className="muted">min {min.toFixed(2)}{suffix} · max {max.toFixed(2)}{suffix}</p>
        </div>
        <span className="chart-last">{last.toFixed(2)}{suffix}</span>
      </div>
      <div className="chart-shell">
        <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" role="img" aria-label={title}>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d9e2f0" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d9e2f0" strokeWidth="1" />
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" shapeRendering="geometricPrecision" />
        </svg>
      </div>
    </section>
  );
}
