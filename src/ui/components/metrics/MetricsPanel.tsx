import { KpiCard } from './KpiCard';
interface Props { latest: any; aggregate: any; }
export function MetricsPanel({ latest, aggregate }: Props) {
  return (
    <div className="panel-row four-columns compact-metrics">
      <KpiCard title="Bus queue pkts" value={latest?.busQueueLength ?? 0} />
      <KpiCard title="Bus queue bytes" value={latest?.busQueueBytes ?? 0} />
      <KpiCard title="Throughput Mbps" value={latest ? Number((latest.throughputMbps ?? 0).toFixed(2)) : 0} />
      <KpiCard title="Loss %" value={latest ? latest.lossPercent.toFixed(2) : '0.00'} tone={(latest?.lossPercent ?? 0) > 0 ? 'danger' : 'default'} />
    </div>
  );
}
