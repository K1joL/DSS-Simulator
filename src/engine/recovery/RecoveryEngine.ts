import { Cluster } from '../../domain/cluster/entities/Cluster';
import { VMState } from '../../domain/cluster/enums/VMState';

export interface VmRecoveryEvent { timeMs: number; vmId: string; }
export interface ContextRestoreResult { vmId: string; restoredFunctionCount: number; state: VMState; }

export class RecoveryEngine {
  constructor(private readonly cluster: Cluster) {}
  recoverVm(vmId: string, timeMs: number): VmRecoveryEvent {
    const vm = this.cluster.getVm(vmId);
    vm.startRecovery();
    vm.state = VMState.IDLE;
    return { timeMs, vmId };
  }
  restoreEmptyContext(vmId: string): ContextRestoreResult {
    const vm = this.cluster.getVm(vmId);
    vm.functions = [];
    vm.localQueueLength = 0;
    vm.state = VMState.IDLE;
    return { vmId, restoredFunctionCount: 0, state: vm.state };
  }
}
