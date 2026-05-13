export type TrafficClass = 'SV' | 'GOOSE' | 'FDA' | 'SERVICE' | 'REPLICATION';
export type TrafficMode = 'NEW_PACKETS' | 'INCREASE_EXISTING_PAYLOAD';
export type FailureMode = 'MANUAL' | 'AUTO' | 'MIXED';

export interface TrafficProfile {
  trafficClass: TrafficClass;
  avgPayloadBytes: number;
  burstFactor: number;
  priority: number;
  dropEligible: boolean;
}

export interface BusConfigV2 {
  bandwidthMbps: number;
  packetProcessingPps: number;
  bufferPackets: number;
  bufferBytes: number;
  mtuBytes: number;
  l2OverheadBytes: number;
}

export interface FunctionTemplate {
  id: 'light' | 'medium' | 'heavy';
  name: string;
  trafficClass: 'SERVICE';
  basePacketRatePps: number;
  avgPayloadBytes: number;
  contextSizeBytes: number;
  stateChangeRatePerSec: number;
}

export interface AssignedFunction {
  instanceId: string;
  templateId: 'light' | 'medium' | 'heavy';
}

export interface KmConfigV2 {
  id: string;
  enabled: boolean;
  svFlows: number;
  svRatePerFlowPps: number;
  gooseRatePps: number;
  fdaServiceRatePps: number;
}

export interface VmConfigV2 {
  id: string;
  enabled: boolean;
  localBufferPackets: number;
  localBufferBytes: number;
  serviceRatePps: number;
  assignedFunctions: AssignedFunction[];
}

export interface DeltaInlineConfig {
  extraHeaderBytesPerPacket: number;
  deltaChunkBytes: number;
  maxDeltaPacketsPerEvent: number;
  assumedRpoMs: number;
}

export interface BulkReplicationConfig {
  syncIntervalMs: number;
  replicationPacketPayloadBytes: number;
  replicationPacketsPerSync: number;
  assumedRpoMs: number;
}

export interface LazyCheckpointConfigV2 {
  heartbeatPps: number;
  heartbeatPayloadBytes: number;
  checkpointPayloadBytesOnFailure: number;
  checkpointPacketPayloadBytes: number;
  assumedRpoMs: number;
}

export interface AlgorithmScenarioConfigV2 {
  algorithmId: 'delta-inline' | 'bulk-replication' | 'lazy-checkpoint';
  mode: TrafficMode;
  config: DeltaInlineConfig | BulkReplicationConfig | LazyCheckpointConfigV2;
}

export interface RecoveryModelConfig {
  fdaFailoverTimeMs: number;
  recoverVmWithEmptyContext: boolean;
  allowPlacementOnActiveVm: boolean;
}

export interface FailureModelConfigV2 {
  mode: FailureMode;
  autoFailureProbabilityPerStep: number;
  recoveryModel: RecoveryModelConfig;
  manualFailureVmId?: string | null;
  manualFailureTimeMs?: number | null;
}

export interface MetricsConfigV2 {
  collectPerTrafficClass: boolean;
  collectQueueBytes: boolean;
  collectQueuePackets: boolean;
  collectEffectiveRpo: boolean;
  collectEffectiveRto: boolean;
}

export interface SimulationConfigV2 {
  version: 2;
  seed: number;
  durationMs: number;
  stepMs: number;
  bus: BusConfigV2;
  trafficProfiles: Record<TrafficClass, TrafficProfile>;
  functionCatalog: FunctionTemplate[];
  kms: KmConfigV2[];
  vms: VmConfigV2[];
  algorithm: AlgorithmScenarioConfigV2;
  failureModel: FailureModelConfigV2;
  metricsConfig: MetricsConfigV2;
}

export interface TrafficDemand {
  trafficClass: TrafficClass;
  packetRatePps: number;
  avgPayloadBytes: number;
  sourceId: string;
  dropEligible?: boolean;
  priority?: number;
}

export interface TrafficClassMetrics {
  offeredPackets: number;
  offeredBytes: number;
  servedPackets: number;
  servedBytes: number;
  droppedPackets: number;
  droppedBytes: number;
  lossPacketsPercent: number;
  lossBytesPercent: number;
}

export interface AggregateStats {
  min: number;
  avg: number;
  max: number;
}

export interface DiagnosticsV2 {
  offeredPacketRatePps: number;
  offeredBandwidthMbps: number;
  packetUtilization: number;
  bandwidthUtilization: number;
  predictedRisk: 'normal' | 'warning' | 'critical';
}

export interface FailureEventV2 {
  type: 'VM_FAILED' | 'VM_RECOVERED' | 'CONTEXT_MIGRATED';
  vmId: string;
  timeMs: number;
  targetVmId?: string;
  functionCount?: number;
}

export interface SimulationMetricsV2 {
  diagnostics: DiagnosticsV2;
  classMetrics: Record<TrafficClass, TrafficClassMetrics>;
  queuePackets: AggregateStats;
  queueBytes: AggregateStats;
  algorithmAddedPackets: number;
  algorithmAddedBytes: number;
  effectiveRpoMs: number;
  effectiveRtoMs: number;
}

export interface SimulationResultV2 {
  config: SimulationConfigV2;
  metrics: SimulationMetricsV2;
  events: FailureEventV2[];
  finalVmStates: Array<{
    id: string;
    enabled: boolean;
    state: 'RUNNING' | 'FAILED' | 'RECOVERED';
    functionCount: number;
    migratedInCount: number;
  }>;
  timeline: Array<{
    step: number;
    timeMs: number;
    queuePackets: number;
    queueBytes: number;
    servedPackets: number;
    servedBytes: number;
    droppedPackets: number;
    droppedBytes: number;
    activeVmCount: number;
  }>;
}
