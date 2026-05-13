import { Cluster } from '../../domain/cluster/entities/Cluster';
import { VMState } from '../../domain/cluster/enums/VMState';
import { RandomProvider } from '../rng/RandomProvider';

export interface VmFailureEvent {
  timeMs: number;
  vmId: string;
  reason: 'MANUAL' | 'AUTO';
}

export class FailureEngine {
  constructor(
    private readonly cluster: Cluster,
    private readonly rng: RandomProvider,
    private readonly autoFailureProbabilityPerStep: number
  ) {}

  evaluate(nowMs: number): VmFailureEvent[] {
    const active = this.cluster.vms.filter(vm => vm.state === VMState.ACTIVE);
    if (!active.length) return [];
    if (!this.rng.chance(this.autoFailureProbabilityPerStep)) return [];
    const target = this.rng.pick(active);
    target.fail();
    return [{ timeMs: nowMs, vmId: target.id, reason: 'AUTO' }];
  }

  injectManualFailure(vmId: string, nowMs: number): VmFailureEvent {
    const vm = this.cluster.getVm(vmId);
    vm.fail();
    return { timeMs: nowMs, vmId, reason: 'MANUAL' };
  }
}
