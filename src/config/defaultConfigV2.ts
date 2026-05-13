import { SimulationConfigV2 } from './typesV2';

export const defaultConfigV2: SimulationConfigV2 = {
  version: 2,
  seed: 12345,
  durationMs: 10_000,
  stepMs: 100,
  bus: {
    bandwidthMbps: 100,
    packetProcessingPps: 120_000,
    bufferPackets: 5_000,
    bufferBytes: 8_000_000,
    mtuBytes: 1500,
    l2OverheadBytes: 20,
  },
  trafficProfiles: {
    SV: { trafficClass: 'SV', avgPayloadBytes: 180, burstFactor: 1.0, priority: 4, dropEligible: false },
    GOOSE: { trafficClass: 'GOOSE', avgPayloadBytes: 160, burstFactor: 1.2, priority: 5, dropEligible: false },
    FDA: { trafficClass: 'FDA', avgPayloadBytes: 220, burstFactor: 1.1, priority: 4, dropEligible: false },
    SERVICE: { trafficClass: 'SERVICE', avgPayloadBytes: 256, burstFactor: 1.0, priority: 3, dropEligible: true },
    REPLICATION: { trafficClass: 'REPLICATION', avgPayloadBytes: 1200, burstFactor: 1.5, priority: 1, dropEligible: true },
  },
  functionCatalog: [
    { id: 'light', name: 'Light', trafficClass: 'SERVICE', basePacketRatePps: 40, avgPayloadBytes: 180, contextSizeBytes: 65_536, stateChangeRatePerSec: 4 },
    { id: 'medium', name: 'Medium', trafficClass: 'SERVICE', basePacketRatePps: 100, avgPayloadBytes: 300, contextSizeBytes: 131_072, stateChangeRatePerSec: 10 },
    { id: 'heavy', name: 'Heavy', trafficClass: 'SERVICE', basePacketRatePps: 180, avgPayloadBytes: 700, contextSizeBytes: 262_144, stateChangeRatePerSec: 25 },
  ],
  kms: [
    { id: 'km-1', enabled: true, svFlows: 8, svRatePerFlowPps: 4000, gooseRatePps: 200, fdaServiceRatePps: 100 },
    { id: 'km-2', enabled: true, svFlows: 8, svRatePerFlowPps: 4000, gooseRatePps: 200, fdaServiceRatePps: 100 },
  ],
  vms: [
    { id: 'vm-1', enabled: true, localBufferPackets: 1000, localBufferBytes: 1_000_000, serviceRatePps: 5000, assignedFunctions: [] },
    { id: 'vm-2', enabled: true, localBufferPackets: 1000, localBufferBytes: 1_000_000, serviceRatePps: 5000, assignedFunctions: [] },
    { id: 'vm-3', enabled: true, localBufferPackets: 1000, localBufferBytes: 1_000_000, serviceRatePps: 5000, assignedFunctions: [] },
  ],
  algorithm: {
    algorithmId: 'delta-inline',
    mode: 'INCREASE_EXISTING_PAYLOAD',
    config: {
      extraHeaderBytesPerPacket: 24,
      deltaChunkBytes: 96,
      maxDeltaPacketsPerEvent: 4,
      assumedRpoMs: 200,
    },
  },
  failureModel: {
    mode: 'AUTO',
    autoFailureProbabilityPerStep: 0.01,
    recoveryModel: {
      fdaFailoverTimeMs: 150,
      recoverVmWithEmptyContext: true,
      allowPlacementOnActiveVm: true,
    },
    manualFailureVmId: null,
    manualFailureTimeMs: null,
  },
  metricsConfig: {
    collectPerTrafficClass: true,
    collectQueueBytes: true,
    collectQueuePackets: true,
    collectEffectiveRpo: true,
    collectEffectiveRto: true,
  },
};
