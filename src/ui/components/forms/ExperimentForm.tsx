interface Props { config: any; setConfig: (updater: any) => void; }

const algorithmPresets: Record<string, any> = {
  'delta-inline': { mode: 'INCREASE_EXISTING_PAYLOAD', config: { extraHeaderBytesPerPacket: 24, deltaChunkBytes: 96, maxDeltaPacketsPerEvent: 4, assumedRpoMs: 200 } },
  'bulk-replication': { mode: 'NEW_PACKETS', config: { syncIntervalMs: 1000, replicationPacketPayloadBytes: 1200, replicationPacketsPerSync: 32, assumedRpoMs: 120 } },
  'lazy-checkpoint': { mode: 'NEW_PACKETS', config: { heartbeatPps: 2, heartbeatPayloadBytes: 96, checkpointPayloadBytesOnFailure: 262144, checkpointPacketPayloadBytes: 1200, assumedRpoMs: 900 } },
};

export function ExperimentForm({ config, setConfig }: Props) {
  const update = (path: string, value: number | string | boolean) => setConfig((prev: any) => {
    const next = structuredClone(prev);
    const parts = path.split('.');
    let ref = next as any;
    for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
    ref[parts[parts.length - 1]] = value;
    return next;
  });
  const updateAlgorithm = (algorithmId: string) => setConfig((prev: any) => {
    const preset = algorithmPresets[algorithmId];
    return { ...prev, algorithm: { algorithmId, mode: preset.mode, config: structuredClone(preset.config) } };
  });
  const updateAlgorithmField = (key: string, value: number | string) => setConfig((prev: any) => ({ ...prev, algorithm: { ...prev.algorithm, config: { ...prev.algorithm.config, [key]: value } } }));
  const algorithmConfig = config.algorithm.config;
  const kmSummaries = (config.kms ?? []).map((km: any) => ({ id: km.id, totalPps: (km.svFlows * km.svRatePerFlowPps) + km.gooseRatePps + km.fdaServiceRatePps }));

  return (
    <section className="panel compact-panel no-inner-panel">
      <h3>Сценарий и КЦПС</h3>
      <div className="form-grid compact-grid three-columns-form">
        <label><span>Seed</span><input type="number" value={config.seed} onChange={(e) => update('seed', Number(e.target.value))} /></label>
        <label><span>Duration, ms</span><input type="number" value={config.durationMs} onChange={(e) => update('durationMs', Number(e.target.value))} /></label>
        <label><span>Step, ms</span><input type="number" value={config.stepMs} onChange={(e) => update('stepMs', Number(e.target.value))} /></label>
        <label><span>Failure mode</span><select value={config.failureModel.mode} onChange={(e) => update('failureModel.mode', e.target.value)}><option value="MANUAL">MANUAL</option><option value="AUTO">AUTO</option><option value="MIXED">MIXED</option></select></label>
        <label><span>Auto failure p(step)</span><input type="number" step="0.001" value={config.failureModel.autoFailureProbabilityPerStep} onChange={(e) => update('failureModel.autoFailureProbabilityPerStep', Number(e.target.value))} /></label>
        <label><span>FDA failover, ms</span><input type="number" value={config.failureModel.recoveryModel.fdaFailoverTimeMs} onChange={(e) => update('failureModel.recoveryModel.fdaFailoverTimeMs', Number(e.target.value))} /></label>
        <label><span>Bandwidth, Mbps</span><input type="number" value={config.bus.bandwidthMbps} onChange={(e) => update('bus.bandwidthMbps', Number(e.target.value))} /></label>
        <label><span>Packet processing, pps</span><input type="number" value={config.bus.packetProcessingPps} onChange={(e) => update('bus.packetProcessingPps', Number(e.target.value))} /></label>
        <label><span>Bus buffer packets</span><input type="number" value={config.bus.bufferPackets} onChange={(e) => update('bus.bufferPackets', Number(e.target.value))} /></label>
      </div>

      <div className="subsection-title">КМ</div>
      <div className="km-settings-grid compact-km-grid">
        {kmSummaries.map((km: any, index: number) => (
          <div className="km-card compact-card" key={km.id}>
            <div className="function-card-head">
              <div className="km-card-title">{km.id}</div>
              <span className="mini-chip">{km.totalPps} pkt/s</span>
            </div>
            <div className="form-grid compact-grid two-columns-form">
              <label><span>SV flows</span><input type="number" value={config.kms[index].svFlows} onChange={(e) => update(`kms.${index}.svFlows`, Number(e.target.value))} /></label>
              <label><span>SV pps / flow</span><input type="number" value={config.kms[index].svRatePerFlowPps} onChange={(e) => update(`kms.${index}.svRatePerFlowPps`, Number(e.target.value))} /></label>
              <label><span>GOOSE pps</span><input type="number" value={config.kms[index].gooseRatePps} onChange={(e) => update(`kms.${index}.gooseRatePps`, Number(e.target.value))} /></label>
              <label><span>FDA pps</span><input type="number" value={config.kms[index].fdaServiceRatePps} onChange={(e) => update(`kms.${index}.fdaServiceRatePps`, Number(e.target.value))} /></label>
            </div>
          </div>
        ))}
      </div>

      <div className="algorithm-block">
        <div className="algorithm-block-top">
          <div>
            <div className="subsection-title no-top-gap">Алгоритм резервирования</div>
            <p className="muted compact-note">Только выбор алгоритма и его рабочие параметры.</p>
          </div>
          <label className="algorithm-picker">
            <span>Algorithm</span>
            <select value={config.algorithm.algorithmId} onChange={(e) => updateAlgorithm(e.target.value)}>
              <option value="delta-inline">delta-inline</option>
              <option value="bulk-replication">bulk-replication</option>
              <option value="lazy-checkpoint">lazy-checkpoint</option>
            </select>
          </label>
        </div>
        <div className="algorithm-divider" />
        <div className="inline-algorithm-grid">
          {'extraHeaderBytesPerPacket' in algorithmConfig && <label><span>Header bytes</span><input type="number" value={algorithmConfig.extraHeaderBytesPerPacket ?? 0} onChange={(e) => updateAlgorithmField('extraHeaderBytesPerPacket', Number(e.target.value))} /></label>}
          {'deltaChunkBytes' in algorithmConfig && <label><span>Delta chunk</span><input type="number" value={algorithmConfig.deltaChunkBytes ?? 0} onChange={(e) => updateAlgorithmField('deltaChunkBytes', Number(e.target.value))} /></label>}
          {'maxDeltaPacketsPerEvent' in algorithmConfig && <label><span>Delta packets / event</span><input type="number" value={algorithmConfig.maxDeltaPacketsPerEvent ?? 0} onChange={(e) => updateAlgorithmField('maxDeltaPacketsPerEvent', Number(e.target.value))} /></label>}
          {'syncIntervalMs' in algorithmConfig && <label><span>Sync interval, ms</span><input type="number" value={algorithmConfig.syncIntervalMs ?? 0} onChange={(e) => updateAlgorithmField('syncIntervalMs', Number(e.target.value))} /></label>}
          {'replicationPacketPayloadBytes' in algorithmConfig && <label><span>Replication payload</span><input type="number" value={algorithmConfig.replicationPacketPayloadBytes ?? 0} onChange={(e) => updateAlgorithmField('replicationPacketPayloadBytes', Number(e.target.value))} /></label>}
          {'replicationPacketsPerSync' in algorithmConfig && <label><span>Packets / sync</span><input type="number" value={algorithmConfig.replicationPacketsPerSync ?? 0} onChange={(e) => updateAlgorithmField('replicationPacketsPerSync', Number(e.target.value))} /></label>}
          {'heartbeatPps' in algorithmConfig && <label><span>Heartbeat pps</span><input type="number" value={algorithmConfig.heartbeatPps ?? 0} onChange={(e) => updateAlgorithmField('heartbeatPps', Number(e.target.value))} /></label>}
          {'heartbeatPayloadBytes' in algorithmConfig && <label><span>Heartbeat bytes</span><input type="number" value={algorithmConfig.heartbeatPayloadBytes ?? 0} onChange={(e) => updateAlgorithmField('heartbeatPayloadBytes', Number(e.target.value))} /></label>}
          {'checkpointPayloadBytesOnFailure' in algorithmConfig && <label><span>Checkpoint on failure</span><input type="number" value={algorithmConfig.checkpointPayloadBytesOnFailure ?? 0} onChange={(e) => updateAlgorithmField('checkpointPayloadBytesOnFailure', Number(e.target.value))} /></label>}
          {'checkpointPacketPayloadBytes' in algorithmConfig && <label><span>Checkpoint packet bytes</span><input type="number" value={algorithmConfig.checkpointPacketPayloadBytes ?? 0} onChange={(e) => updateAlgorithmField('checkpointPacketPayloadBytes', Number(e.target.value))} /></label>}
        </div>
      </div>
    </section>
  );
}
