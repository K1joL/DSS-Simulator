import { VMState } from '../../domain/cluster/enums/VMState';
import { MetricsSnapshot } from '../../engine/metrics/MetricsCollector';

export interface VmStateDto { id: string; state: VMState; localQueueLength: number; functionCount: number; }
export interface SimulationStateDto { nowMs: number; busQueueLength: number; latestMetrics: MetricsSnapshot | null; vms: VmStateDto[]; }
