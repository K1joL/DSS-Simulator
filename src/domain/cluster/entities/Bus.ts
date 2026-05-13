import { Guard } from '../../shared/Guard';

export class Bus {
  public queueLength = 0;

  constructor(
    public readonly capacityPackets: number,
    public readonly serviceRatePps: number
  ) {
    Guard.againstNegative(capacityPackets, 'Bus.capacityPackets');
    Guard.againstNegative(serviceRatePps, 'Bus.serviceRatePps');
  }
}
