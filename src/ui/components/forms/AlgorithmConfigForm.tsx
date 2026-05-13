interface Props { config: any; setConfig: (updater: any) => void; }

export function AlgorithmConfigForm({ config, setConfig }: Props) {
  const update = (key: string, value: number | string) => setConfig((prev: any) => ({ ...prev, algorithm: { ...prev.algorithm, config: { ...prev.algorithm.config, [key]: value } } }));
  const a = config.algorithm.config;
  return (
    <section className="panel compact-panel">
      <h3>Параметры алгоритма</h3>
      <div className="form-grid compact-grid">
        {'syncTrigger' in a && <label><span>Sync trigger</span><input type="text" value={a.syncTrigger ?? ''} onChange={(e) => update('syncTrigger', e.target.value)} /></label>}
        {'extraHeaderBytesPerPacket' in a && <label><span>Extra header bytes / packet</span><input type="number" value={a.extraHeaderBytesPerPacket ?? 0} onChange={(e) => update('extraHeaderBytesPerPacket', Number(e.target.value))} /></label>}
        {'deltaChunkBytes' in a && <label><span>Delta chunk bytes</span><input type="number" value={a.deltaChunkBytes ?? 0} onChange={(e) => update('deltaChunkBytes', Number(e.target.value))} /></label>}
        {'maxDeltaPacketsPerEvent' in a && <label><span>Max delta packets / event</span><input type="number" value={a.maxDeltaPacketsPerEvent ?? 0} onChange={(e) => update('maxDeltaPacketsPerEvent', Number(e.target.value))} /></label>}
        {'syncIntervalMs' in a && <label><span>Sync interval, ms</span><input type="number" value={a.syncIntervalMs ?? 0} onChange={(e) => update('syncIntervalMs', Number(e.target.value))} /></label>}
        {'replicationPacketPayloadBytes' in a && <label><span>Replication payload bytes</span><input type="number" value={a.replicationPacketPayloadBytes ?? 0} onChange={(e) => update('replicationPacketPayloadBytes', Number(e.target.value))} /></label>}
        {'replicationPacketsPerSync' in a && <label><span>Replication packets / sync</span><input type="number" value={a.replicationPacketsPerSync ?? 0} onChange={(e) => update('replicationPacketsPerSync', Number(e.target.value))} /></label>}
        {'heartbeatPps' in a && <label><span>Heartbeat pps</span><input type="number" value={a.heartbeatPps ?? 0} onChange={(e) => update('heartbeatPps', Number(e.target.value))} /></label>}
        {'heartbeatPayloadBytes' in a && <label><span>Heartbeat payload bytes</span><input type="number" value={a.heartbeatPayloadBytes ?? 0} onChange={(e) => update('heartbeatPayloadBytes', Number(e.target.value))} /></label>}
        {'checkpointPayloadBytesOnFailure' in a && <label><span>Checkpoint payload bytes on failure</span><input type="number" value={a.checkpointPayloadBytesOnFailure ?? 0} onChange={(e) => update('checkpointPayloadBytesOnFailure', Number(e.target.value))} /></label>}
        {'checkpointPacketPayloadBytes' in a && <label><span>Checkpoint packet payload bytes</span><input type="number" value={a.checkpointPacketPayloadBytes ?? 0} onChange={(e) => update('checkpointPacketPayloadBytes', Number(e.target.value))} /></label>}
      </div>
      <p className="muted compact-note">RTO и RPO не задаются вручную в интерфейсе; они выводятся из поведения алгоритма и сценария отказа.</p>
    </section>
  );
}
