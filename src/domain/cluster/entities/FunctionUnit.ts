import { TrafficClass } from '../enums/TrafficClass';
import { Guard } from '../../shared/Guard';

export class FunctionUnit {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly trafficClass: TrafficClass,
    public readonly baseTrafficPps: number,
    public readonly contextSizeKb: number
  ) {
    Guard.againstEmpty(id, 'FunctionUnit.id');
    Guard.againstEmpty(name, 'FunctionUnit.name');
    Guard.againstNegative(baseTrafficPps, 'FunctionUnit.baseTrafficPps');
    Guard.againstNegative(contextSizeKb, 'FunctionUnit.contextSizeKb');
  }
}
