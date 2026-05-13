import { KmNode } from './KmNode';
import { BusStatusBar } from './BusStatusBar';
import { VmCard } from './VmCard';
interface Props { state: any; onFailVm: (vmId: string) => void; onRecoverVm: (vmId: string) => void; }
export function ClusterTopology({ state, onFailVm, onRecoverVm }: Props) {
  return (
    <section className="panel topology-panel compact-panel">
      <div className="section-header section-header-compact">
        <div className="section-copy">
          <h3>Состояние кластера</h3>
          <p className="muted">По VM видно состояние, локальную очередь и степень заполнения буфера.</p>
        </div>
      </div>
      <div className="topology-grid">
        <div className="km-row"><KmNode id="KM-1" /><KmNode id="KM-2" /></div>
        <BusStatusBar queueLength={state?.busQueueLength ?? 0} queueBytes={state?.busQueueBytes ?? 0} />
        <div className="vm-grid">{(state?.vms ?? []).map((vm: any) => <VmCard key={vm.id} vm={vm} onFail={() => onFailVm(vm.id)} onRecover={() => onRecoverVm(vm.id)} />)}</div>
      </div>
    </section>
  );
}
