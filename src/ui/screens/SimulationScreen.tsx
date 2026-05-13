
import { ClusterTopology } from '../components/topology/ClusterTopology';
import { MetricsPanel } from '../components/metrics/MetricsPanel';
import { EventLogPanel } from '../components/metrics/EventLogPanel';
import { QueueChart } from '../components/charts/QueueChart';
import { ThroughputChart } from '../components/charts/ThroughputChart';
import { LossChart } from '../components/charts/LossChart';
import { RtoRpoChart } from '../components/charts/RtoRpoChart';

export function SimulationScreen({ sim }: { sim: any }) {
  const latest = sim.state?.latestMetrics;
  const vms = sim.state?.vms ?? [];
  return (
    <div className="screen-grid single-column">
      <section className="toolbar panel surface">
        <div>
          <h2>Управление прогоном</h2>
          <p className="muted">Запускай расчёт, шагай вручную и проверяй реакцию модели на отказ и миграцию.</p>
        </div>
        <div className="toolbar-group">
          <button className="btn btn-primary" onClick={sim.start}>Старт</button>
          <button className="btn btn-ghost" onClick={sim.pause}>Пауза</button>
          <button className="btn btn-ghost" onClick={sim.step}>Шаг</button>
          <button className="btn btn-ghost" onClick={sim.runToEnd}>До конца</button>
          <button className="btn btn-danger" onClick={sim.reset}>Сброс</button>
        </div>
      </section>

      <section className="panel surface compact-panel">
        <div className="section-header section-header-compact">
          <div className="section-copy">
            <h3>Текущий шаг</h3>
            <p className="muted">Быстрый статус такта и заполненность очередей по каждой VM.</p>
          </div>
        </div>
        <div className="qol-summary-row five-mini-stats">
          <div className="mini-stat"><span className="mini-stat-label">Step</span><strong>{sim.state?.stepIndex ?? 0}</strong></div>
          <div className="mini-stat"><span className="mini-stat-label">Time</span><strong>{sim.state?.nowMs ?? 0} ms</strong></div>
          <div className="mini-stat"><span className="mini-stat-label">Bus queue</span><strong>{latest?.busQueueLength ?? 0}</strong></div>
          <div className="mini-stat"><span className="mini-stat-label">Loss</span><strong>{latest?.lossPercent?.toFixed?.(2) ?? '0.00'} %</strong></div>
          <div className="mini-stat"><span className="mini-stat-label">Throughput</span><strong>{latest?.throughputMbps ?? 0} Mbps</strong></div>
        </div>
        <div className="vm-queue-panel">
          {vms.map((vm: any) => (
            <div className="vm-queue-row" key={vm.id}>
              <div className="vm-queue-head"><span>{vm.id}</span><span>{vm.localQueueLength ?? 0} / {vm.localBufferPackets ?? 0} pkts</span></div>
              <div className="mini-progress"><span style={{ width: `${Math.min(100, Math.round(vm.localQueuePercent ?? 0))}%` }} /></div>
              <div className="vm-queue-meta muted">load {vm.estimatedLoadPps ?? 0} / {vm.serviceRatePps ?? 0} pkt/s · fill {Math.min(100, Math.round(vm.localQueuePercent ?? 0))}% · buffer {vm.localBufferBytes ?? 0} B</div>
            </div>
          ))}
        </div>
      </section>

      <MetricsPanel latest={latest} aggregate={sim.aggregate} />

      <div className="summary-grid">
        <ClusterTopology state={sim.state} onFailVm={sim.failVm} onRecoverVm={sim.recoverVm} />
        <EventLogPanel logs={sim.logs} />
      </div>

      <div className="panel-row two-columns">
        <QueueChart snapshots={sim.snapshots} />
        <ThroughputChart snapshots={sim.snapshots} />
      </div>
      <div className="panel-row two-columns">
        <LossChart snapshots={sim.snapshots} />
        <RtoRpoChart snapshots={sim.snapshots} />
      </div>
    </div>
  );
}
