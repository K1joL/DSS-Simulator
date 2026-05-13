import { TrafficEmission } from './TrafficEmission';
import { ContextMigrationPlan } from './ContextMigrationPlan';

export interface AlgorithmReaction {
  extraTraffic: TrafficEmission[];
  migrations: ContextMigrationPlan[];
}
