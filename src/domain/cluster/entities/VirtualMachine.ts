import { VMState } from '../enums/VMState';
import { FunctionUnit } from './FunctionUnit';
import { Guard } from '../../shared/Guard';

export class VirtualMachine {
  public state: VMState = VMState.IDLE;
  public localQueueLength = 0;
  public functions: FunctionUnit[] = [];

  constructor(
    public readonly id: string,
    public readonly localQueueCapacity: number,
    public readonly serviceRatePps: number
  ) {
    Guard.againstEmpty(id, 'VirtualMachine.id');
    Guard.againstNegative(localQueueCapacity, 'VirtualMachine.localQueueCapacity');
    Guard.againstNegative(serviceRatePps, 'VirtualMachine.serviceRatePps');
  }

  assignFunction(fn: FunctionUnit): void {
    this.functions.push(fn);
    if (this.state === VMState.IDLE) this.state = VMState.ACTIVE;
  }

  fail(): void { this.state = VMState.FAILED; }
  startRecovery(): void {
    this.state = VMState.RECOVERING;
    this.localQueueLength = 0;
    this.functions = [];
  }
  activate(): void { this.state = VMState.ACTIVE; }
}
