
import { useRef, useState } from 'react';
import { defaultConfigV2 } from '../../config/defaultConfigV2';
import { computeDiagnosticsV2, runSimulationV2 } from '../../engine/SimulationKernelV2';

export interface SimulationLogEntry { timeMs: number; message: string; }

function clone<T>(value: T): T {
  return structuredClone(value);
}

function computeVmLoad(config: any, vm: any) {
  const catalog = new Map((config.functionCatalog ?? []).map((fn: any) => [fn.id, fn]));
  const assigned = vm.assignedFunctions ?? [];
  return assigned.reduce((sum: number, item: any) => sum + (catalog.get(item.templateId)?.basePacketRatePps ?? 0), 0);
}

function buildVmState(config: any, timeRatio = 0, result: any = null, nowMs = 0) {
  const vms = (config.vms ?? []).map((vm: any) => {
    const estimatedLoadPps = computeVmLoad(config, vm);
    const overload = Math.max(0, estimatedLoadPps - (vm.serviceRatePps ?? 0));
    const queueRise = overload > 0 ? Math.round(overload * Math.max(0.15, timeRatio) * ((config.stepMs ?? 100) / 100)) : 0;
    const localBufferPackets = vm.localBufferPackets ?? 0;
    const localQueueLength = Math.min(localBufferPackets, queueRise);
    return {
      id: vm.id,
      enabled: vm.enabled,
      state: vm.enabled === false ? 'FAILED' : 'RUNNING',
      localQueueLength,
      localQueuePercent: localBufferPackets > 0 ? (localQueueLength / localBufferPackets) * 100 : 0,
      localBufferPackets,
      localBufferBytes: vm.localBufferBytes ?? 0,
      serviceRatePps: vm.serviceRatePps ?? 0,
      estimatedLoadPps,
      functionCount: (vm.assignedFunctions ?? []).length,
      migratedInCount: 0,
      assignedFunctions: vm.assignedFunctions ?? [],
    };
  });
  const index = new Map(vms.map((vm: any, i: number) => [vm.id, i]));
  for (const event of result?.events ?? []) {
    if (event.timeMs > nowMs) continue;
    if (event.type === 'VM_FAILED') {
      const i = index.get(event.vmId);
      if (i !== undefined) {
        vms[i].state = 'FAILED';
        vms[i].enabled = false;
        vms[i].localQueueLength = 0;
        vms[i].localQueuePercent = 0;
      }
    }
    if (event.type === 'CONTEXT_MIGRATED') {
      const source = index.get(event.vmId);
      const target = index.get(event.targetVmId ?? '');
      if (source !== undefined) vms[source].functionCount = 0;
      if (target !== undefined) {
        vms[target].migratedInCount += event.functionCount ?? 0;
        vms[target].functionCount += event.functionCount ?? 0;
      }
    }
    if (event.type === 'VM_RECOVERED') {
      const i = index.get(event.vmId);
      if (i !== undefined) {
        vms[i].state = 'RECOVERED';
        vms[i].enabled = true;
      }
    }
  }
  return vms;
}

function buildInitialState(config: any, diagnostics?: any) {
  return {
    stepIndex: 0,
    nowMs: 0,
    busQueueLength: 0,
    busQueueBytes: 0,
    latestMetrics: diagnostics ? {
      busQueueLength: 0,
      busQueueBytes: 0,
      throughputPps: Math.round(diagnostics.offeredPacketRatePps),
      throughputMbps: Number(diagnostics.offeredBandwidthMbps.toFixed(2)),
      lossPercent: 0,
      bandwidthUtilizationPercent: Number((diagnostics.bandwidthUtilization * 100).toFixed(2)),
      packetUtilizationPercent: Number((diagnostics.packetUtilization * 100).toFixed(2)),
      risk: diagnostics.predictedRisk,
      rtoMs: 0,
      rpoMs: 0,
    } : null,
    vms: buildVmState(config, 0, null, 0),
  };
}

function buildSnapshots(result: any) {
  return (result.timeline ?? []).map((item: any) => ({
    stepIndex: item.step,
    timeMs: item.timeMs,
    busQueueLength: Math.round(item.queuePackets),
    busQueueBytes: Math.round(item.queueBytes),
    throughputPps: Math.round(result.metrics.diagnostics.offeredPacketRatePps),
    throughputMbps: Number(result.metrics.diagnostics.offeredBandwidthMbps.toFixed(2)),
    lossPercent: Number(((item.droppedPackets / Math.max(1, item.droppedPackets + item.servedPackets)) * 100).toFixed(2)),
    rtoMs: result.metrics.effectiveRtoMs,
    rpoMs: result.metrics.effectiveRpoMs,
  }));
}

function buildAggregate(result: any) {
  const classMetrics = result.metrics.classMetrics;
  const totalArrivedPackets = Object.values(classMetrics).reduce((sum: number, x: any) => sum + x.offeredPackets, 0);
  const totalServedPackets = Object.values(classMetrics).reduce((sum: number, x: any) => sum + x.servedPackets, 0);
  const totalDroppedPackets = Object.values(classMetrics).reduce((sum: number, x: any) => sum + x.droppedPackets, 0);
  const totalDroppedBytes = Object.values(classMetrics).reduce((sum: number, x: any) => sum + x.droppedBytes, 0);
  return {
    totalArrivedPackets: Math.round(totalArrivedPackets),
    totalServedPackets: Math.round(totalServedPackets),
    totalDroppedPackets: Math.round(totalDroppedPackets),
    totalDroppedBytes: Math.round(totalDroppedBytes),
    avgThroughputPps: result.metrics.diagnostics.offeredPacketRatePps,
    avgThroughputMbps: result.metrics.diagnostics.offeredBandwidthMbps,
    avgBusQueue: result.metrics.queuePackets.avg,
    avgBusQueueBytes: result.metrics.queueBytes.avg,
    packetUtilizationPercent: result.metrics.diagnostics.packetUtilization * 100,
    bandwidthUtilizationPercent: result.metrics.diagnostics.bandwidthUtilization * 100,
    predictedRisk: result.metrics.diagnostics.predictedRisk,
    effectiveRtoMs: result.metrics.effectiveRtoMs,
    effectiveRpoMs: result.metrics.effectiveRpoMs,
    classMetrics,
    algorithmAddedPackets: result.metrics.algorithmAddedPackets,
    algorithmAddedBytes: result.metrics.algorithmAddedBytes,
  };
}

export function useSimulation() {
  const intervalRef = useRef<number | null>(null);
  const preparedResultRef = useRef<any>(null);
  const preparedSnapshotsRef = useRef<any[]>([]);
  const preparedAggregateRef = useRef<any>(null);
  const cursorRef = useRef(0);
  const resumeCursorRef = useRef<number | null>(null);
  const emittedEventsRef = useRef<Set<string>>(new Set());

  const [configState, setConfigState] = useState<any>(clone(defaultConfigV2));
  const [state, setState] = useState<any>(buildInitialState(defaultConfigV2, computeDiagnosticsV2(defaultConfigV2)));
  const [aggregate, setAggregate] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [logs, setLogs] = useState<SimulationLogEntry[]>([]);
  const [running, setRunning] = useState(false);

  const appendLog = (message: string, timeMs = 0) => setLogs((prev) => [{ timeMs, message }, ...prev].slice(0, 200));
  const stopLoop = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  };
  const clearPrepared = () => {
    preparedResultRef.current = null;
    preparedSnapshotsRef.current = [];
    preparedAggregateRef.current = null;
    cursorRef.current = 0;
    emittedEventsRef.current = new Set();
  };
  const setConfig = (updater: any) => {
    setConfigState((prev: any) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      clearPrepared();
      return next;
    });
  };
  const initialize = () => {
    stopLoop();
    clearPrepared();
    const diagnostics = computeDiagnosticsV2(configState);
    setState(buildInitialState(configState, diagnostics));
    setAggregate(null);
    setSnapshots([]);
    setLogs([]);
    appendLog('Симуляция инициализирована');
  };
  const prepare = () => {
    if (preparedResultRef.current) return;
    const result = runSimulationV2(configState);
    preparedResultRef.current = result;
    preparedSnapshotsRef.current = buildSnapshots(result);
    preparedAggregateRef.current = buildAggregate(result);
    const maxCursor = Math.max(0, preparedSnapshotsRef.current.length - 1);
    cursorRef.current = Math.min(resumeCursorRef.current ?? 0, maxCursor);
    resumeCursorRef.current = null;
    emittedEventsRef.current = new Set();
  };
  const emitEventsUntil = (timeMs: number) => {
    const result = preparedResultRef.current;
    for (const event of result?.events ?? []) {
      const key = `${event.type}-${event.vmId}-${event.timeMs}-${event.targetVmId ?? ''}`;
      if (event.timeMs <= timeMs && !emittedEventsRef.current.has(key)) {
        emittedEventsRef.current.add(key);
        if (event.type === 'VM_FAILED') appendLog(`Событие отказа ${event.vmId}`, event.timeMs);
        if (event.type === 'VM_RECOVERED') appendLog(`Событие восстановления ${event.vmId}`, event.timeMs);
        if (event.type === 'CONTEXT_MIGRATED') appendLog(`Миграция контекста ${event.vmId} -> ${event.targetVmId}, функций=${event.functionCount ?? 0}`, event.timeMs);
      }
    }
  };
  const applyCursor = (cursor: number) => {
    const result = preparedResultRef.current;
    const allSnapshots = preparedSnapshotsRef.current;
    const visible = allSnapshots.slice(0, cursor + 1);
    const latest = visible[visible.length - 1] ?? buildInitialState(configState).latestMetrics;
    const nowMs = latest?.timeMs ?? 0;
    const totalSteps = Math.max(1, allSnapshots.length - 1);
    emitEventsUntil(nowMs);
    setSnapshots(visible);
    setState({
      stepIndex: latest?.stepIndex ?? cursor,
      nowMs,
      busQueueLength: latest?.busQueueLength ?? 0,
      busQueueBytes: latest?.busQueueBytes ?? 0,
      latestMetrics: latest,
      vms: buildVmState(configState, cursor / totalSteps, result, nowMs),
    });
    if (cursor >= allSnapshots.length - 1) {
      setAggregate(preparedAggregateRef.current);
      appendLog(`Итоговый RTO=${result.metrics.effectiveRtoMs} ms, RPO=${result.metrics.effectiveRpoMs} ms`, nowMs);
      stopLoop();
    }
  };
  const step = () => {
    prepare();
    const allSnapshots = preparedSnapshotsRef.current;
    if (!allSnapshots.length) return;
    const nextCursor = Math.min(cursorRef.current, allSnapshots.length - 1);
    applyCursor(nextCursor);
    cursorRef.current = Math.min(nextCursor + 1, allSnapshots.length - 1);
  };
  const start = () => {
    prepare();
    if (intervalRef.current !== null) return;
    setRunning(true);
    appendLog('Запуск симуляции', state?.nowMs ?? 0);
    intervalRef.current = window.setInterval(() => {
      const total = preparedSnapshotsRef.current.length;
      if (!total) return;
      const cursor = Math.min(cursorRef.current, total - 1);
      applyCursor(cursor);
      if (cursor >= total - 1) return;
      cursorRef.current = cursor + 1;
    }, 120);
  };
  const pause = () => {
    stopLoop();
    appendLog('Пауза', state?.nowMs ?? 0);
  };
  const runToEnd = () => {
    prepare();
    const total = preparedSnapshotsRef.current.length;
    if (!total) return;
    cursorRef.current = total - 1;
    applyCursor(total - 1);
  };
  const reset = () => {
    stopLoop();
    clearPrepared();
    const diagnostics = computeDiagnosticsV2(configState);
    setState(buildInitialState(configState, diagnostics));
    setAggregate(null);
    setSnapshots([]);
    setLogs([]);
    appendLog('Стенд сброшен');
  };
  const updateScenarioWithResume = (updater: any, logMessage: string) => {
    const resumeCursor = Math.max(0, state?.stepIndex ?? cursorRef.current ?? 0);
    stopLoop();
    clearPrepared();
    resumeCursorRef.current = resumeCursor;
    setConfigState((prev: any) => (typeof updater === 'function' ? updater(prev) : updater));
    appendLog(logMessage, state?.nowMs ?? 0);
  };
  const failVm = (vmId: string) => {
    const scheduledTime = state?.nowMs && state.nowMs < configState.durationMs ? state.nowMs : Math.max(configState.stepMs, Math.floor(configState.durationMs / 2));
    updateScenarioWithResume((prev: any) => {
      const next = clone(prev);
      next.failureModel.manualFailureVmId = vmId;
      next.failureModel.manualFailureTimeMs = scheduledTime;
      return next;
    }, `Запланирован отказ ${vmId} на ${scheduledTime} ms`);
  };
  const recoverVm = (vmId: string) => {
    updateScenarioWithResume((prev: any) => {
      const next = clone(prev);
      if (next.failureModel.manualFailureVmId === vmId) {
        next.failureModel.manualFailureVmId = null;
        next.failureModel.manualFailureTimeMs = null;
      }
      const vm = (next.vms ?? []).find((item: any) => item.id === vmId);
      if (vm) vm.enabled = true;
      return next;
    }, `Сценарий отказа для ${vmId} снят`);
  };
  return { config: configState, setConfig, state, aggregate, snapshots, logs, running, initialize, start, pause, step, reset, runToEnd, failVm, recoverVm };
}
