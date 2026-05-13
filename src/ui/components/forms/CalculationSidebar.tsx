import { useState } from 'react';

interface Props { config: any; }

function payloadPlusL2(config: any, payloadBytes: number) {
  return Math.min(config.bus.mtuBytes ?? payloadBytes, payloadBytes) + (config.bus.l2OverheadBytes ?? 0);
}

function ppsToMbps(pps: number, packetBytes: number) {
  return (pps * packetBytes * 8) / 1_000_000;
}

function estimateAlgorithmPps(config: any) {
  const algorithmConfig = config.algorithm?.config ?? {};
  if (config.algorithm?.algorithmId === 'bulk-replication') {
    return (algorithmConfig.syncIntervalMs ?? 0) > 0 ? (1000 / algorithmConfig.syncIntervalMs) * (algorithmConfig.replicationPacketsPerSync ?? 0) : 0;
  }
  if (config.algorithm?.algorithmId === 'lazy-checkpoint') {
    return algorithmConfig.heartbeatPps ?? 0;
  }
  return 0;
}

function estimateAlgorithmMbps(config: any) {
  const algorithmConfig = config.algorithm?.config ?? {};
  if (config.algorithm?.algorithmId === 'bulk-replication') {
    const pps = estimateAlgorithmPps(config);
    return ppsToMbps(pps, payloadPlusL2(config, algorithmConfig.replicationPacketPayloadBytes ?? 0));
  }
  if (config.algorithm?.algorithmId === 'lazy-checkpoint') {
    const pps = estimateAlgorithmPps(config);
    return ppsToMbps(pps, payloadPlusL2(config, algorithmConfig.heartbeatPayloadBytes ?? 0));
  }
  const fnCount = (config.vms ?? []).reduce((sum: number, vm: any) => sum + (vm.assignedFunctions ?? []).length, 0);
  const affectedFdaPps = (config.kms ?? []).reduce((sum: number, km: any) => sum + (km.enabled === false ? 0 : (km.fdaServiceRatePps ?? 0)), 0);
  const inlineGrowthBytes = ((algorithmConfig.extraHeaderBytesPerPacket ?? 0) + (algorithmConfig.deltaChunkBytes ?? 0)) * Math.min(Math.max(1, fnCount), algorithmConfig.maxDeltaPacketsPerEvent ?? 0);
  return ppsToMbps(affectedFdaPps, inlineGrowthBytes);
}

export function CalculationSidebar({ config }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const kmSummaries = (config.kms ?? []).map((km: any) => {
    const svPps = km.svFlows * km.svRatePerFlowPps;
    const goosePps = km.gooseRatePps;
    const fdaPps = km.fdaServiceRatePps;
    const svMbps = ppsToMbps(svPps, payloadPlusL2(config, config.trafficProfiles.SV.avgPayloadBytes));
    const gooseMbps = ppsToMbps(goosePps, payloadPlusL2(config, config.trafficProfiles.GOOSE.avgPayloadBytes));
    const fdaMbps = ppsToMbps(fdaPps, payloadPlusL2(config, config.trafficProfiles.FDA.avgPayloadBytes));
    return { id: km.id, totalPps: svPps + goosePps + fdaPps, totalMbps: svMbps + gooseMbps + fdaMbps };
  });

  const totalVmFunctionPps = (config.vms ?? []).reduce((sum: number, vm: any) => {
    return sum + (vm.assignedFunctions ?? []).reduce((inner: number, item: any) => {
      const fn = (config.functionCatalog ?? []).find((x: any) => x.id === item.templateId);
      return inner + (fn?.basePacketRatePps ?? 0);
    }, 0);
  }, 0);

  const totalVmFunctionMbps = (config.vms ?? []).reduce((sum: number, vm: any) => {
    return sum + (vm.assignedFunctions ?? []).reduce((inner: number, item: any) => {
      const fn = (config.functionCatalog ?? []).find((x: any) => x.id === item.templateId);
      return inner + ppsToMbps(fn?.basePacketRatePps ?? 0, payloadPlusL2(config, fn?.avgPayloadBytes ?? 0));
    }, 0);
  }, 0);

  const kmTotalPps = kmSummaries.reduce((sum: number, km: any) => sum + km.totalPps, 0);
  const kmTotalMbps = kmSummaries.reduce((sum: number, km: any) => sum + km.totalMbps, 0);
  const algorithmPps = estimateAlgorithmPps(config);
  const algorithmMbps = estimateAlgorithmMbps(config);
  const totalPps = kmTotalPps + totalVmFunctionPps + algorithmPps;
  const totalMbps = kmTotalMbps + totalVmFunctionMbps + algorithmMbps;
  const packetUtilPercent = config.bus.packetProcessingPps > 0 ? (totalPps / config.bus.packetProcessingPps) * 100 : 0;
  const bandwidthUtilPercent = config.bus.bandwidthMbps > 0 ? (totalMbps / config.bus.bandwidthMbps) * 100 : 0;
  const packetOverload = totalPps > (config.bus.packetProcessingPps ?? 0);

  const packetReference = [
    { key: 'SV', wire: payloadPlusL2(config, config.trafficProfiles.SV.avgPayloadBytes) },
    { key: 'GOOSE', wire: payloadPlusL2(config, config.trafficProfiles.GOOSE.avgPayloadBytes) },
    { key: 'FDA', wire: payloadPlusL2(config, config.trafficProfiles.FDA.avgPayloadBytes) },
    { key: 'SERVICE', wire: payloadPlusL2(config, config.trafficProfiles.SERVICE.avgPayloadBytes) },
    { key: 'REPLICATION', wire: payloadPlusL2(config, config.trafficProfiles.REPLICATION.avgPayloadBytes) },
  ];

  return (
    <aside className={collapsed ? 'calc-sidebar panel surface compact-panel collapsed' : 'calc-sidebar panel surface compact-panel'}>
      <div className="section-header section-header-compact calc-sidebar-header">
        <div className="section-copy">
          <h3>Расчётная сводка</h3>
          {!collapsed && <p className="muted">Всегда видна справа при настройке.</p>}
        </div>
        <div className="calc-sidebar-actions">
          <span className="section-badge small-badge">Σ</span>
          <button className="btn btn-small btn-ghost" type="button" onClick={() => setCollapsed(x => !x)}>
            {collapsed ? 'Развернуть' : 'Свернуть'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="calc-sidebar-group">
            <div className="subsection-title no-top-gap">Packet budget</div>
            <div className="sidebar-stat-list">
              <div className="sidebar-stat"><span>KM</span><strong>{kmTotalPps} pkt/s</strong></div>
              <div className="sidebar-stat"><span>VM functions</span><strong>{totalVmFunctionPps} pkt/s</strong></div>
              <div className="sidebar-stat"><span>Algorithm</span><strong>{algorithmPps.toFixed(0)} pkt/s</strong></div>
              <div className={packetOverload ? 'sidebar-stat danger' : 'sidebar-stat accent'}><span>Total</span><strong>{totalPps.toFixed(0)} pkt/s</strong></div>
              <div className={packetOverload ? 'sidebar-stat danger' : 'sidebar-stat'}><span>Packet load</span><strong>{packetUtilPercent.toFixed(1)}%</strong></div>
            </div>
          </div>

          <div className="calc-sidebar-group">
            <div className="subsection-title no-top-gap">Bandwidth budget</div>
            <div className="sidebar-stat-list">
              <div className="sidebar-stat"><span>KM</span><strong>{kmTotalMbps.toFixed(2)} Mbps</strong></div>
              <div className="sidebar-stat"><span>VM functions</span><strong>{totalVmFunctionMbps.toFixed(2)} Mbps</strong></div>
              <div className="sidebar-stat"><span>Algorithm</span><strong>{algorithmMbps.toFixed(2)} Mbps</strong></div>
              <div className="sidebar-stat accent"><span>Total</span><strong>{totalMbps.toFixed(2)} Mbps</strong></div>
              <div className={bandwidthUtilPercent > 100 ? 'sidebar-stat danger' : 'sidebar-stat'}><span>Bus load</span><strong>{bandwidthUtilPercent.toFixed(1)}%</strong></div>
            </div>
          </div>

          <div className="calc-sidebar-group">
            <div className="subsection-title no-top-gap">Пакеты на проводе</div>
            <div className="sidebar-stat-list">
              {packetReference.map((item) => (
                <div className="sidebar-stat" key={item.key}><span>{item.key}</span><strong>{item.wire} B</strong></div>
              ))}
            </div>
          </div>

          <div className="calc-sidebar-group">
            <div className="subsection-title no-top-gap">Очереди VM</div>
            <div className="sidebar-stat-list">
              {(config.vms ?? []).map((vm: any) => {
                const assigned = vm.assignedFunctions ?? [];
                const vmPps = assigned.reduce((sum: number, item: any) => {
                  const fn = (config.functionCatalog ?? []).find((x: any) => x.id === item.templateId);
                  return sum + (fn?.basePacketRatePps ?? 0);
                }, 0);
                const vmStepQueuePackets = Math.max(0, vmPps - (vm.serviceRatePps ?? 0)) * ((config.stepMs ?? 100) / 1000);
                const queuePercent = (vm.localBufferPackets ?? 0) > 0 ? Math.min(100, (vmStepQueuePackets / vm.localBufferPackets) * 100) : 0;
                return (
                  <div className="sidebar-vm-card" key={vm.id}>
                    <div className="sidebar-vm-head"><strong>{vm.id}</strong><span>{queuePercent.toFixed(1)}%</span></div>
                    <div className="mini-progress"><span style={{ width: `${queuePercent}%` }} /></div>
                    <div className="sidebar-vm-meta">{vmPps} / {vm.serviceRatePps} pkt/s · queue/step {vmStepQueuePackets.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
