import { Guard } from '../../shared/Guard';

export class CommunicationModule {
  constructor(
    public readonly id: string,
    public readonly svFlows: number,
    public readonly svRatePerFlowPps: number,
    public enabled: boolean = true
  ) {
    Guard.againstEmpty(id, 'CommunicationModule.id');
    Guard.againstNegative(svFlows, 'CommunicationModule.svFlows');
    Guard.againstNegative(svRatePerFlowPps, 'CommunicationModule.svRatePerFlowPps');
  }
}
