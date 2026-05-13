interface Props { title: string; value: string | number; tone?: 'default' | 'danger'; }
export function KpiCard({ title, value, tone = 'default' }: Props) {
  return <div className={tone === 'danger' ? 'kpi-card kpi-danger' : 'kpi-card'}><div className="kpi-title">{title}</div><div className="kpi-value">{value}</div></div>;
}
