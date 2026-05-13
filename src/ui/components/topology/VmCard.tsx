interface Props { vm: any; onFail: () => void; onRecover: () => void; }

export function VmCard({ vm, onFail, onRecover }: Props) {
  const failed = vm.state === 'FAILED';
  const recovering = vm.state === 'RECOVERING';
  const queuePercent = Math.min(100, Math.round(vm.localQueuePercent ?? 0));
  return (
    <div className={failed ? 'node vm-node failed' : recovering ? 'node vm-node recovering' : 'node vm-node'}>
      <div className="node-title">{vm.id}</div>
      <div className="node-subtitle">{vm.state}</div>
      <div className="node-meta">Functions: {vm.functionCount}</div>
      <div className="node-meta">Queue: {vm.localQueueLength ?? 0} / {vm.localBufferPackets ?? 0} pkts</div>
      <div className="node-meta">Load: {vm.estimatedLoadPps ?? 0} / {vm.serviceRatePps ?? 0} pkt/s</div>
      <div className="mini-progress"><span style={{ width: `${queuePercent}%` }} /></div>
      <div className="node-meta">Заполненность очереди: {queuePercent}%</div>
      <div className="node-actions"><button className="btn btn-small btn-danger" onClick={onFail} disabled={failed}>Fail</button><button className="btn btn-small" onClick={onRecover} disabled={!failed}>Recover</button></div>
    </div>
  );
}
