import { QueueChart } from '../components/charts/QueueChart';
import { ThroughputChart } from '../components/charts/ThroughputChart';
import { LossChart } from '../components/charts/LossChart';
import { KpiCard } from '../components/metrics/KpiCard';

export function ResultsScreen({ sim }: { sim: any }) {
  const aggregate = sim.aggregate;
  const classMetrics = aggregate?.classMetrics ?? {};

  return (
    <div className="screen-grid single-column">
      <section className="panel surface">
        <div className="section-header">
          <div className="section-copy">
            <h2>Сводка результатов</h2>
            <p className="muted">Здесь собраны главные показатели сценария и итог после отказа и восстановления.</p>
          </div>
          <span className="section-badge">Σ</span>
        </div>
        <div className="panel-row four-columns">
          <KpiCard title="Total offered" value={aggregate?.totalArrivedPackets ?? 0} />
          <KpiCard title="Total served" value={aggregate?.totalServedPackets ?? 0} />
          <KpiCard title="Total dropped" value={aggregate?.totalDroppedPackets ?? 0} tone="danger" />
          <KpiCard title="Avg throughput Mbps" value={aggregate ? Number(aggregate.avgThroughputMbps.toFixed(2)) : 0} />
        </div>
        <div className="panel-row four-columns" style={{ marginTop: 18 }}>
          <KpiCard title="Packet util %" value={aggregate ? Number(aggregate.packetUtilizationPercent.toFixed(2)) : 0} />
          <KpiCard title="Bandwidth util %" value={aggregate ? Number(aggregate.bandwidthUtilizationPercent.toFixed(2)) : 0} />
          <KpiCard title="Effective RTO, ms" value={aggregate?.effectiveRtoMs ?? 0} />
          <KpiCard title="Effective RPO, ms" value={aggregate?.effectiveRpoMs ?? 0} />
        </div>
      </section>

      <div className="summary-grid">
        <section className="panel surface">
          <div className="section-header">
            <div className="section-copy">
              <h2>Графики</h2>
              <p className="muted">Очередь, пропускная способность и потери показывают эффект нагрузки и восстановления.</p>
            </div>
          </div>
          <div className="panel-row two-columns">
            <QueueChart snapshots={sim.snapshots} />
            <ThroughputChart snapshots={sim.snapshots} />
          </div>
          <div className="panel-row full-width" style={{ marginTop: 18 }}>
            <LossChart snapshots={sim.snapshots} />
          </div>
        </section>

        <section className="panel surface result-side">
          <div className="section-copy">
            <h2>По классам трафика</h2>
            <p className="muted">Быстрый просмотр того, где сильнее всего проявились потери и перегрузка.</p>
          </div>
          <div className="result-list">
            {Object.keys(classMetrics).length === 0 && <div className="result-row"><span>Нет данных</span><span>—</span></div>}
            {Object.entries(classMetrics).map(([key, value]: any) => (
              <div className="result-row" key={key}>
                <span>{key}</span>
                <span>loss {Number(value.lossPacketsPercent ?? 0).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
