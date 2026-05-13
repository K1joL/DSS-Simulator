import {
  AlgorithmScenarioConfigV2,
  BulkReplicationConfig,
  DeltaInlineConfig,
  LazyCheckpointConfigV2,
  SimulationConfigV2,
  TrafficDemand,
} from '../config/types';

function countAssignedFunctions(config: SimulationConfigV2): number {
  return config.vms.reduce((sum, vm) => sum + vm.assignedFunctions.length, 0);
}

export function estimateAlgorithmRpoMs(algorithm: AlgorithmScenarioConfigV2): number {
  const cfg = algorithm.config as DeltaInlineConfig | BulkReplicationConfig | LazyCheckpointConfigV2;
  return 'assumedRpoMs' in cfg ? cfg.assumedRpoMs : 0;
}

export function buildAlgorithmTraffic(config: SimulationConfigV2): {
  background: TrafficDemand[];
  algorithmAddedPackets: number;
  algorithmAddedBytes: number;
  inlinePayloadGrowthBytes: number;
} {
  const fnCount = Math.max(1, countAssignedFunctions(config));
  const a = config.algorithm;

  if (a.algorithmId === 'bulk-replication') {
    const cfg = a.config as BulkReplicationConfig;
    const packetRatePps = cfg.syncIntervalMs > 0
      ? (1000 / cfg.syncIntervalMs) * cfg.replicationPacketsPerSync
      : 0;
    const avgPayloadBytes = cfg.replicationPacketPayloadBytes;
    return {
      background: [{
        trafficClass: 'REPLICATION',
        packetRatePps,
        avgPayloadBytes,
        sourceId: 'algorithm:bulk-replication',
        dropEligible: true,
        priority: 1,
      }],
      algorithmAddedPackets: packetRatePps,
      algorithmAddedBytes: packetRatePps * avgPayloadBytes,
      inlinePayloadGrowthBytes: 0,
    };
  }

  if (a.algorithmId === 'lazy-checkpoint') {
    const cfg = a.config as LazyCheckpointConfigV2;
    const packetRatePps = cfg.heartbeatPps;
    const avgPayloadBytes = cfg.heartbeatPayloadBytes;
    return {
      background: [{
        trafficClass: 'REPLICATION',
        packetRatePps,
        avgPayloadBytes,
        sourceId: 'algorithm:lazy-checkpoint',
        dropEligible: true,
        priority: 1,
      }],
      algorithmAddedPackets: packetRatePps,
      algorithmAddedBytes: packetRatePps * avgPayloadBytes,
      inlinePayloadGrowthBytes: 0,
    };
  }

  const cfg = a.config as DeltaInlineConfig;
  const affectedFdaPps = config.kms.reduce((sum, km) => sum + (km.enabled ? km.fdaServiceRatePps : 0), 0);
  const inlinePayloadGrowthBytes = (cfg.extraHeaderBytesPerPacket + cfg.deltaChunkBytes) * Math.min(fnCount, cfg.maxDeltaPacketsPerEvent);
  return {
    background: [],
    algorithmAddedPackets: 0,
    algorithmAddedBytes: affectedFdaPps * inlinePayloadGrowthBytes,
    inlinePayloadGrowthBytes,
  };
}
