import { Cluster } from '../../domain/cluster/entities/Cluster';
import { MetricsSnapshot } from '../metrics/MetricsCollector';
import { SimulationKernel } from './SimulationKernel';
import { RecoveryEngine } from '../recovery/RecoveryEngine';
import { FailureEngine } from '../failures/FailureEngine';
import { SimulationStateDto } from '../../app/dto/SimulationStateDto';

export class SimulationOrchestrator {
  private initialized = false;
  constructor(
    private readonly cluster: Cluster,
    private readonly kernel: SimulationKernel,
    private readonly failureEngine: FailureEngine,
    private readonly recoveryEngine: RecoveryEngine
  ) {}
  initialize(): void { if (!this.initialized) { this.kernel.initialize(); this.initialized = true; } }
  step(): MetricsSnapshot { this.ensureInitialized(); return this.kernel.step().snapshot; }
  runToEnd(): MetricsSnapshot[] { this.ensureInitialized(); return this.kernel.runToEnd(); }
  injectManualFailure(vmId: string): void { this.ensureInitialized(); this.failureEngine.injectManualFailure(vmId, this.kernel.getNowMs()); }
  recoverVm(vmId: string): void { this.ensureInitialized(); this.recoveryEngine.recoverVm(vmId, this.kernel.getNowMs()); this.recoveryEngine.restoreEmptyContext(vmId); }
  getState(): SimulationStateDto {
    return {
      nowMs: this.kernel.getNowMs(),
      busQueueLength: this.cluster.bus.queueLength,
      latestMetrics: this.kernel.getMetricsCollector().getLatest(),
      vms: this.cluster.vms.map(vm => ({ id: vm.id, state: vm.state, localQueueLength: vm.localQueueLength, functionCount: vm.functions.length })),
    };
  }
  getAggregateMetrics() { return this.kernel.getMetricsCollector().getAggregate(); }
  private ensureInitialized(): void { if (!this.initialized) throw new Error('SimulationOrchestrator is not initialized'); }
}
