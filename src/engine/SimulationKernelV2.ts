import {
  AggregateStats,
  DiagnosticsV2,
  FailureEventV2,
  FunctionTemplate,
  SimulationConfigV2,
  SimulationResultV2,
  TrafficClass,
  TrafficClassMetrics,
  TrafficDemand,
} from '../config/typesV2';
import { buildAlgorithmTraffic, estimateAlgorithmRpoMs } from './AlgorithmTrafficModelV2';

interface PlannedFailureWindow {
  vmId: string;
  failTimeMs: number;
  recoverTimeMs: number;
}

function createSeededRandom(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createEmptyClassMetrics(): Record<TrafficClass, TrafficClassMetrics> {
  const empty = (): TrafficClassMetrics => ({
    offeredPackets: 0,
    offeredBytes: 0,
    servedPackets: 0,
    servedBytes: 0,
    droppedPackets: 0,
    droppedBytes: 0,
    lossPacketsPercent: 0,
    lossBytesPercent: 0,
  });
  return { SV: empty(), GOOSE: empty(), FDA: empty(), SERVICE: empty(), REPLICATION: empty() };
}

function aggregateStats(values: number[]): AggregateStats {
  const safe = values.length ? values : [0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const avg = safe.reduce((a, b) => a + b, 0) / safe.length;
  return { min, avg, max };
}

function payloadPlusL2(config: SimulationConfigV2, payloadBytes: number): number {
  return Math.min(config.bus.mtuBytes, payloadBytes) + config.bus.l2OverheadBytes;
}

function resolveFunction(config: SimulationConfigV2, templateId: string): FunctionTemplate | undefined {
  return config.functionCatalog.find((f) => f.id === templateId);
}

function planFailureWindow(config: SimulationConfigV2): PlannedFailureWindow | null {
  const recoverDelayMs = Math.max(config.stepMs, config.failureModel?.recoveryModel?.fdaFailoverTimeMs ?? 0);
  const manualVmId = config.failureModel?.manualFailureVmId;
  const manualTime = config.failureModel?.manualFailureTimeMs;
  if (manualVmId && manualTime !== null && manualTime !== undefined) {
    return {
      vmId: manualVmId,
      failTimeMs: Math.max(config.stepMs, Math.min(config.durationMs - config.stepMs, manualTime)),
      recoverTimeMs: Math.max(config.stepMs, Math.min(config.durationMs, manualTime + recoverDelayMs)),
    };
  }

  const mode = config.failureModel?.mode;
  const p = Number(config.failureModel?.autoFailureProbabilityPerStep ?? 0);
  if (!(mode === 'AUTO' || mode === 'MIXED') || p <= 0) return null;

  const activeVms = (config.vms ?? []).filter((vm) => vm.enabled !== false);
  if (!activeVms.length) return null;

  const rng = createSeededRandom(config.seed + config.durationMs + config.stepMs + activeVms.length);
  const steps = Math.max(1, Math.floor(config.durationMs / Math.max(1, config.stepMs)));
  let failStep = -1;
  for (let step = 1; step <= steps; step++) {
    if (rng() < p) {
      failStep = step;
      break;
    }
  }
  if (failStep < 0) return null;

  const selectedVm = activeVms[Math.floor(rng() * activeVms.length)];
  const failTimeMs = failStep * config.stepMs;
  return {
    vmId: selectedVm.id,
    failTimeMs,
    recoverTimeMs: Math.max(config.stepMs, Math.min(config.durationMs, failTimeMs + recoverDelayMs)),
  };
}

function vmLoadScore(config: SimulationConfigV2, vmId: string): number {
  const vm = config.vms.find((item) => item.id === vmId);
  if (!vm) return Number.POSITIVE_INFINITY;
  return (vm.assignedFunctions ?? []).reduce((sum, assigned) => {
    const tpl = resolveFunction(config, assigned.templateId);
    return sum + (tpl?.basePacketRatePps ?? 0);
  }, 0);
}

function chooseMigrationTarget(config: SimulationConfigV2, failedVmId: string): string | null {
  if (!config.failureModel?.recoveryModel?.allowPlacementOnActiveVm) return null;
  const candidates = (config.vms ?? []).filter((vm) => vm.enabled !== false && vm.id !== failedVmId);
  if (!candidates.length) return null;

  if (config.algorithm.algorithmId === 'bulk-replication') {
    return [...candidates].sort((a, b) => b.serviceRatePps - a.serviceRatePps || a.id.localeCompare(b.id))[0]?.id ?? null;
  }

  if (config.algorithm.algorithmId === 'lazy-checkpoint') {
    return [...candidates].sort((a, b) => a.id.localeCompare(b.id))[0]?.id ?? null;
  }

  return [...candidates].sort((a, b) => vmLoadScore(config, a.id) - vmLoadScore(config, b.id) || b.serviceRatePps - a.serviceRatePps || a.id.localeCompare(b.id))[0]?.id ?? null;
}

function isDuringFailure(timeMs: number, failureWindow: PlannedFailureWindow | null, vmId: string): boolean {
  if (!failureWindow || failureWindow.vmId !== vmId) return false;
  return timeMs >= failureWindow.failTimeMs && timeMs < failureWindow.recoverTimeMs;
}

function buildBaseDemandsForTime(config: SimulationConfigV2, timeMs: number, failureWindow: PlannedFailureWindow | null, migrationTargetVmId: string | null): TrafficDemand[] {
  const demands: TrafficDemand[] = [];
  const failedVm = failureWindow ? config.vms.find((vm) => vm.id === failureWindow.vmId) : null;

  for (const km of config.kms) {
    if (!km.enabled) continue;
    if (km.svFlows > 0 && km.svRatePerFlowPps > 0) {
      demands.push({ trafficClass: 'SV', packetRatePps: km.svFlows * km.svRatePerFlowPps, avgPayloadBytes: config.trafficProfiles.SV.avgPayloadBytes, sourceId: km.id, dropEligible: config.trafficProfiles.SV.dropEligible, priority: config.trafficProfiles.SV.priority });
    }
    if (km.gooseRatePps > 0) {
      demands.push({ trafficClass: 'GOOSE', packetRatePps: km.gooseRatePps, avgPayloadBytes: config.trafficProfiles.GOOSE.avgPayloadBytes, sourceId: km.id, dropEligible: config.trafficProfiles.GOOSE.dropEligible, priority: config.trafficProfiles.GOOSE.priority });
    }
    if (km.fdaServiceRatePps > 0) {
      demands.push({ trafficClass: 'FDA', packetRatePps: km.fdaServiceRatePps, avgPayloadBytes: config.trafficProfiles.FDA.avgPayloadBytes, sourceId: km.id, dropEligible: config.trafficProfiles.FDA.dropEligible, priority: config.trafficProfiles.FDA.priority });
    }
  }

  for (const vm of config.vms) {
    if (vm.enabled === false) continue;
    if (isDuringFailure(timeMs, failureWindow, vm.id)) continue;

    for (const assigned of vm.assignedFunctions) {
      const tpl = resolveFunction(config, assigned.templateId);
      if (!tpl) continue;
      demands.push({ trafficClass: 'SERVICE', packetRatePps: tpl.basePacketRatePps, avgPayloadBytes: tpl.avgPayloadBytes, sourceId: `${vm.id}:${assigned.instanceId}`, dropEligible: config.trafficProfiles.SERVICE.dropEligible, priority: config.trafficProfiles.SERVICE.priority });
    }
  }

  if (failedVm && migrationTargetVmId && failureWindow && timeMs >= failureWindow.recoverTimeMs) {
    for (const assigned of failedVm.assignedFunctions ?? []) {
      const tpl = resolveFunction(config, assigned.templateId);
      if (!tpl) continue;
      demands.push({ trafficClass: 'SERVICE', packetRatePps: tpl.basePacketRatePps, avgPayloadBytes: tpl.avgPayloadBytes, sourceId: `${migrationTargetVmId}:${assigned.instanceId}:migrated`, dropEligible: config.trafficProfiles.SERVICE.dropEligible, priority: config.trafficProfiles.SERVICE.priority });
    }
  }

  return demands;
}

function applyInlinePayloadGrowth(config: SimulationConfigV2, demands: TrafficDemand[], inlineGrowthBytes: number): TrafficDemand[] {
  if (!inlineGrowthBytes) return demands;
  return demands.map((d) => d.trafficClass === 'FDA' ? { ...d, avgPayloadBytes: Math.min(config.bus.mtuBytes, d.avgPayloadBytes + inlineGrowthBytes) } : d);
}

function computeDiagnosticsFromDemands(config: SimulationConfigV2, demands: TrafficDemand[]): DiagnosticsV2 {
  const offeredPacketRatePps = demands.reduce((sum, d) => sum + d.packetRatePps, 0);
  const offeredBandwidthBps = demands.reduce((sum, d) => sum + d.packetRatePps * payloadPlusL2(config, d.avgPayloadBytes) * 8, 0);
  const bandwidthBps = config.bus.bandwidthMbps * 1_000_000;
  const packetUtilization = config.bus.packetProcessingPps > 0 ? offeredPacketRatePps / config.bus.packetProcessingPps : 0;
  const bandwidthUtilization = bandwidthBps > 0 ? offeredBandwidthBps / bandwidthBps : 0;
  const maxUtil = Math.max(packetUtilization, bandwidthUtilization);
  const predictedRisk = maxUtil > 5 ? 'critical' : maxUtil > 1 ? 'warning' : 'normal';
  return { offeredPacketRatePps, offeredBandwidthMbps: offeredBandwidthBps / 1_000_000, packetUtilization, bandwidthUtilization, predictedRisk };
}

export function computeDiagnosticsV2(config: SimulationConfigV2): DiagnosticsV2 {
  const failureWindow = planFailureWindow(config);
  const migrationTargetVmId = failureWindow ? chooseMigrationTarget(config, failureWindow.vmId) : null;
  const base = buildBaseDemandsForTime(config, 0, failureWindow, migrationTargetVmId);
  const alg = buildAlgorithmTraffic(config);
  const merged = applyInlinePayloadGrowth(config, [...base, ...alg.background], alg.inlinePayloadGrowthBytes);
  return computeDiagnosticsFromDemands(config, merged);
}

export function runSimulationV2(config: SimulationConfigV2): SimulationResultV2 {
  const classMetrics = createEmptyClassMetrics();
  const queuePacketsTimeline: number[] = [];
  const queueBytesTimeline: number[] = [];
  const timeline: SimulationResultV2['timeline'] = [];
  const steps = Math.max(1, Math.floor(config.durationMs / config.stepMs));
  const alg = buildAlgorithmTraffic(config);
  const failureWindow = planFailureWindow(config);
  const migrationTargetVmId = failureWindow ? chooseMigrationTarget(config, failureWindow.vmId) : null;
  const events: FailureEventV2[] = [];

  if (failureWindow) {
    events.push({ type: 'VM_FAILED', vmId: failureWindow.vmId, timeMs: failureWindow.failTimeMs });
    if (migrationTargetVmId) {
      const migratedCount = (config.vms.find((vm) => vm.id === failureWindow.vmId)?.assignedFunctions ?? []).length;
      events.push({ type: 'CONTEXT_MIGRATED', vmId: failureWindow.vmId, targetVmId: migrationTargetVmId, functionCount: migratedCount, timeMs: failureWindow.recoverTimeMs });
    }
    if (failureWindow.recoverTimeMs <= config.durationMs) {
      events.push({ type: 'VM_RECOVERED', vmId: failureWindow.vmId, timeMs: failureWindow.recoverTimeMs });
    }
  }

  const diagnosticsBase = buildBaseDemandsForTime(config, 0, failureWindow, migrationTargetVmId);
  const diagnostics = computeDiagnosticsFromDemands(config, applyInlinePayloadGrowth(config, [...diagnosticsBase, ...alg.background], alg.inlinePayloadGrowthBytes));

  let queuePackets = 0;
  let queueBytes = 0;

  for (let step = 0; step < steps; step++) {
    const timeMs = step * config.stepMs;
    const capacityPacketsStep = config.bus.packetProcessingPps * (config.stepMs / 1000);
    const capacityBitsStep = config.bus.bandwidthMbps * 1_000_000 * (config.stepMs / 1000);
    const baseDemands = buildBaseDemandsForTime(config, timeMs, failureWindow, migrationTargetVmId);
    const demands = applyInlinePayloadGrowth(config, [...baseDemands, ...alg.background], alg.inlinePayloadGrowthBytes);

    let offeredPacketsStep = 0;
    let offeredBytesStep = 0;
    for (const demand of demands) {
      const packets = demand.packetRatePps * (config.stepMs / 1000);
      const bytes = packets * payloadPlusL2(config, demand.avgPayloadBytes);
      offeredPacketsStep += packets;
      offeredBytesStep += bytes;
      classMetrics[demand.trafficClass].offeredPackets += packets;
      classMetrics[demand.trafficClass].offeredBytes += bytes;
    }

    const backlogPackets = queuePackets + offeredPacketsStep;
    const backlogBytes = queueBytes + offeredBytesStep;
    const packetRatio = backlogPackets > 0 ? Math.min(1, capacityPacketsStep / backlogPackets) : 1;
    const byteRatio = backlogBytes > 0 ? Math.min(1, capacityBitsStep / (backlogBytes * 8)) : 1;
    const serveRatio = Math.min(packetRatio, byteRatio);
    const servedPacketsStep = backlogPackets * serveRatio;
    const servedBytesStep = backlogBytes * serveRatio;

    let nextQueuePackets = Math.max(0, backlogPackets - servedPacketsStep);
    let nextQueueBytes = Math.max(0, backlogBytes - servedBytesStep);
    const overflowPackets = Math.max(0, nextQueuePackets - config.bus.bufferPackets);
    const overflowBytes = Math.max(0, nextQueueBytes - config.bus.bufferBytes);
    const dropPacketRatio = nextQueuePackets > 0 ? Math.max(overflowPackets / nextQueuePackets, overflowBytes / Math.max(1, nextQueueBytes)) : 0;

    let droppedPacketsStep = 0;
    let droppedBytesStep = 0;

    for (const demand of demands) {
      const packets = demand.packetRatePps * (config.stepMs / 1000);
      const bytes = packets * payloadPlusL2(config, demand.avgPayloadBytes);
      const servedPackets = packets * serveRatio;
      const servedBytes = bytes * serveRatio;
      const queuedPackets = Math.max(0, packets - servedPackets);
      const queuedBytes = Math.max(0, bytes - servedBytes);
      const droppedPackets = queuedPackets * dropPacketRatio;
      const droppedBytes = queuedBytes * dropPacketRatio;
      classMetrics[demand.trafficClass].servedPackets += servedPackets;
      classMetrics[demand.trafficClass].servedBytes += servedBytes;
      classMetrics[demand.trafficClass].droppedPackets += droppedPackets;
      classMetrics[demand.trafficClass].droppedBytes += droppedBytes;
      droppedPacketsStep += droppedPackets;
      droppedBytesStep += droppedBytes;
    }

    nextQueuePackets = Math.max(0, nextQueuePackets - overflowPackets);
    nextQueueBytes = Math.max(0, nextQueueBytes - overflowBytes);
    queuePackets = nextQueuePackets;
    queueBytes = nextQueueBytes;
    queuePacketsTimeline.push(queuePackets);
    queueBytesTimeline.push(queueBytes);

    const activeVmCount = (config.vms ?? []).filter((vm) => vm.enabled !== false && !isDuringFailure(timeMs, failureWindow, vm.id)).length;
    timeline.push({ step, timeMs, queuePackets, queueBytes, servedPackets: servedPacketsStep, servedBytes: servedBytesStep, droppedPackets: droppedPacketsStep, droppedBytes: droppedBytesStep, activeVmCount });
  }

  for (const cls of Object.values(classMetrics)) {
    cls.lossPacketsPercent = cls.offeredPackets > 0 ? (cls.droppedPackets / cls.offeredPackets) * 100 : 0;
    cls.lossBytesPercent = cls.offeredBytes > 0 ? (cls.droppedBytes / cls.offeredBytes) * 100 : 0;
  }

  const effectiveRpoMs = failureWindow ? estimateAlgorithmRpoMs(config.algorithm) : 0;
  const effectiveRtoMs = failureWindow ? (config.failureModel.recoveryModel.fdaFailoverTimeMs + effectiveRpoMs) : 0;
  const migratedFunctions = (failureWindow ? (config.vms.find((vm) => vm.id === failureWindow.vmId)?.assignedFunctions ?? []) : []);
  const finalVmStates = (config.vms ?? []).map((vm) => {
    const migratedInCount = vm.id === migrationTargetVmId ? migratedFunctions.length : 0;
    if (failureWindow?.vmId === vm.id) {
      const state = failureWindow.recoverTimeMs <= config.durationMs ? 'RECOVERED' as const : 'FAILED' as const;
      const functionCount = config.failureModel.recoveryModel.recoverVmWithEmptyContext || migrationTargetVmId ? 0 : (vm.assignedFunctions ?? []).length;
      return { id: vm.id, enabled: state !== 'FAILED', state, functionCount, migratedInCount };
    }
    return { id: vm.id, enabled: vm.enabled !== false, state: vm.enabled === false ? 'FAILED' as const : 'RUNNING' as const, functionCount: (vm.assignedFunctions ?? []).length + migratedInCount, migratedInCount };
  });

  return {
    config,
    metrics: {
      diagnostics,
      classMetrics,
      queuePackets: aggregateStats(queuePacketsTimeline),
      queueBytes: aggregateStats(queueBytesTimeline),
      algorithmAddedPackets: alg.algorithmAddedPackets,
      algorithmAddedBytes: alg.algorithmAddedBytes,
      effectiveRpoMs,
      effectiveRtoMs,
    },
    events,
    finalVmStates,
    timeline,
  };
}
