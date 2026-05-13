import { Bus } from './Bus';
import { CommunicationModule } from './CommunicationModule';
import { VirtualMachine } from './VirtualMachine';

export class Cluster {
  constructor(
    public readonly id: string,
    public readonly bus: Bus,
    public readonly kms: CommunicationModule[],
    public readonly vms: VirtualMachine[]
  ) {}

  getVm(vmId: string): VirtualMachine {
    const vm = this.vms.find(v => v.id === vmId);
    if (!vm) throw new Error(`VM not found: ${vmId}`);
    return vm;
  }
}
