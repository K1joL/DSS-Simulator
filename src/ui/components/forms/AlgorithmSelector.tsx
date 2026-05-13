interface Props { config: any; setConfig: (updater: any) => void; }
const configs: Record<string, any> = {
  'delta-inline': {
    mode: 'INCREASE_EXISTING_PAYLOAD',
    config: { extraHeaderBytesPerPacket: 24, deltaChunkBytes: 96, maxDeltaPacketsPerEvent: 4, assumedRpoMs: 200 },
  },
  'bulk-replication': {
    mode: 'NEW_PACKETS',
    config: { syncIntervalMs: 1000, replicationPacketPayloadBytes: 1200, replicationPacketsPerSync: 32, assumedRpoMs: 120 },
  },
  'lazy-checkpoint': {
    mode: 'NEW_PACKETS',
    config: { heartbeatPps: 2, heartbeatPayloadBytes: 96, checkpointPayloadBytesOnFailure: 262144, checkpointPacketPayloadBytes: 1200, assumedRpoMs: 900 },
  },
};
export function AlgorithmSelector({ config, setConfig }: Props) {
  return <section className="panel"><h2>Алгоритм резервирования V2</h2><div className="form-grid"><label><span>Algorithm</span><select value={config.algorithm.algorithmId} onChange={e => setConfig((prev: any) => ({ ...prev, algorithm: { algorithmId: e.target.value, mode: configs[e.target.value].mode, config: structuredClone(configs[e.target.value].config) } }))}>{Object.keys(configs).map(id => <option key={id} value={id}>{id}</option>)}</select></label></div></section>;
}
