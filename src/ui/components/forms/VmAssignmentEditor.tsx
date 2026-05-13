interface Props { config: any; setConfig?: (updater: any) => void; }

const fnMeta: Record<string, { tone: string; label: string }> = {
  light: { tone: 'fn-light', label: 'Light' },
  medium: { tone: 'fn-medium', label: 'Medium' },
  heavy: { tone: 'fn-heavy', label: 'Heavy' },
};

function formatMbps(pps: number, payloadBytes: number) {
  return ((pps * payloadBytes * 8) / 1_000_000).toFixed(2);
}

export function VmAssignmentEditor({ config, setConfig }: Props) {
  const addFunctionToVm = (vmIndex: number, templateId: string) => {
    if (!setConfig) return;
    setConfig((prev: any) => {
      const next = structuredClone(prev);
      next.vms[vmIndex].assignedFunctions.push({ instanceId: `${templateId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, templateId });
      return next;
    });
  };
  const removeFunctionFromVm = (vmIndex: number, fnIndex: number) => {
    if (!setConfig) return;
    setConfig((prev: any) => {
      const next = structuredClone(prev);
      next.vms[vmIndex].assignedFunctions.splice(fnIndex, 1);
      return next;
    });
  };
  const updateFunctionType = (index: number, field: string, value: number) => {
    if (!setConfig) return;
    setConfig((prev: any) => {
      const next = structuredClone(prev);
      next.functionCatalog[index][field] = value;
      return next;
    });
  };
  const updateVmField = (index: number, field: string, value: number | boolean) => {
    if (!setConfig) return;
    setConfig((prev: any) => {
      const next = structuredClone(prev);
      next.vms[index][field] = value;
      return next;
    });
  };

  const functionMap = new Map((config.functionCatalog ?? []).map((fn: any) => [fn.id, fn]));
  const globalAssigned = (config.vms ?? []).flatMap((vm: any) => vm.assignedFunctions ?? []);
  const totalPps = globalAssigned.reduce((sum: number, item: any) => sum + (functionMap.get(item.templateId)?.basePacketRatePps ?? 0), 0);

  return (
    <section className="panel surface compact-panel">
      <div className="section-header">
        <div className="section-copy">
          <h2>Типы функций и размещение по VM</h2>
          <p className="muted">Настрой типы функций и смотри прогноз загрузки и заполнения очереди у каждой VM.</p>
        </div>
        <span className="section-badge">02</span>
      </div>

      <div className="qol-summary-row vm-global-summary wide-summary four-mini-stats">
        <div className="mini-stat"><span className="mini-stat-label">Всего функций</span><strong>{globalAssigned.length}</strong></div>
        <div className="mini-stat"><span className="mini-stat-label">Σ pkt/s</span><strong>{totalPps}</strong></div>
        <div className="mini-stat"><span className="mini-stat-label">VM count</span><strong>{(config.vms ?? []).length}</strong></div>
        <div className="mini-stat accent-stat"><span className="mini-stat-label">Шаг расчёта</span><strong>{config.stepMs} ms</strong></div>
      </div>

      <div className="function-types-grid">
        {(config.functionCatalog ?? []).map((fn: any, index: number) => {
          const tone = fnMeta[fn.id]?.tone ?? '';
          return (
            <div className={`km-card compact-card function-card ${tone}`} key={fn.id}>
              <div className="function-card-head">
                <div className="km-card-title">{fn.name}</div>
                <span className={`function-pill ${tone}`}>{fnMeta[fn.id]?.label ?? fn.id}</span>
              </div>
              <div className="form-grid compact-grid two-columns-form">
                <label><span>Base pkt/s</span><input type="number" value={fn.basePacketRatePps} onChange={(e) => updateFunctionType(index, 'basePacketRatePps', Number(e.target.value))} /></label>
                <label><span>Payload bytes</span><input type="number" value={fn.avgPayloadBytes} onChange={(e) => updateFunctionType(index, 'avgPayloadBytes', Number(e.target.value))} /></label>
                <label><span>Context bytes</span><input type="number" value={fn.contextSizeBytes} onChange={(e) => updateFunctionType(index, 'contextSizeBytes', Number(e.target.value))} /></label>
                <label><span>State changes / sec</span><input type="number" value={fn.stateChangeRatePerSec} onChange={(e) => updateFunctionType(index, 'stateChangeRatePerSec', Number(e.target.value))} /></label>
              </div>
              <div className="function-inline-metrics">
                <span className="mini-chip">{fn.basePacketRatePps} pkt/s</span>
                <span className="mini-chip">{formatMbps(fn.basePacketRatePps, fn.avgPayloadBytes)} Mbps</span>
                <span className="mini-chip">{fn.contextSizeBytes} B context</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="vm-list compact-vm-list" style={{ marginTop: 12 }}>
        {config.vms.map((vm: any, vmIndex: number) => {
          const assigned = vm.assignedFunctions ?? [];
          const counts = assigned.reduce((acc: any, item: any) => {
            acc[item.templateId] = (acc[item.templateId] ?? 0) + 1;
            return acc;
          }, { light: 0, medium: 0, heavy: 0 });
          const vmPps = assigned.reduce((sum: number, item: any) => sum + (functionMap.get(item.templateId)?.basePacketRatePps ?? 0), 0);
          const vmStepQueuePackets = Math.max(0, vmPps - (vm.serviceRatePps ?? 0)) * ((config.stepMs ?? 100) / 1000);
          const queuePercent = (vm.localBufferPackets ?? 0) > 0 ? Math.min(100, (vmStepQueuePackets / vm.localBufferPackets) * 100) : 0;
          return (
            <div className="vm-editor-card compact-card vm-qol-card" key={vm.id}>
              <div className="vm-card-head">
                <div className="vm-editor-title">{vm.id}</div>
                <span className="mini-chip">limit {vm.serviceRatePps} pkt/s</span>
              </div>
              <div className="form-grid compact-grid two-columns-form" style={{ marginBottom: 10 }}>
                <label><span>Service pkt/s</span><input type="number" value={vm.serviceRatePps} onChange={(e) => updateVmField(vmIndex, 'serviceRatePps', Number(e.target.value))} /></label>
                <label><span>Queue buffer pkts</span><input type="number" value={vm.localBufferPackets} onChange={(e) => updateVmField(vmIndex, 'localBufferPackets', Number(e.target.value))} /></label>
              </div>
              <div className="vm-stat-grid">
                <div className="mini-stat compact"><span className="mini-stat-label">Functions</span><strong>{assigned.length}</strong></div>
                <div className="mini-stat compact"><span className="mini-stat-label">Load pkt/s</span><strong>{vmPps}</strong></div>
                <div className="mini-stat compact"><span className="mini-stat-label">Queue / step</span><strong>{vmStepQueuePackets.toFixed(1)}</strong></div>
                <div className="mini-stat compact"><span className="mini-stat-label">Fill</span><strong>{queuePercent.toFixed(1)}%</strong></div>
              </div>
              <div className="mini-progress"><span style={{ width: `${queuePercent}%` }} /></div>
              <div className="function-inline-metrics" style={{ marginBottom: 10 }}>
                <span className="function-pill fn-light">Light × {counts.light ?? 0}</span>
                <span className="function-pill fn-medium">Medium × {counts.medium ?? 0}</span>
                <span className="function-pill fn-heavy">Heavy × {counts.heavy ?? 0}</span>
              </div>
              <div className="toolbar-group compact-toolbar" style={{ marginBottom: 10 }}>
                {(config.functionCatalog ?? []).map((fn: any) => (
                  <button key={fn.id} className={`btn btn-ghost btn-small add-fn-btn ${fnMeta[fn.id]?.tone ?? ''}`} type="button" onClick={() => addFunctionToVm(vmIndex, fn.id)}>
                    + {fn.name}
                  </button>
                ))}
              </div>
              <div className="tag-row">
                {assigned.length === 0 && <span className="muted">Функции пока не назначены.</span>}
                {assigned.map((fn: any, fnIndex: number) => (
                  <span className={`tag ${fnMeta[fn.templateId]?.tone ?? ''}`} key={fn.instanceId}>
                    {fn.templateId}
                    <button type="button" onClick={() => removeFunctionFromVm(vmIndex, fnIndex)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
