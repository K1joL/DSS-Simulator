export interface ContextMigrationPlan {
  sourceVmId: string;
  targetVmId: string;
  functionIds: string[];
  trafficPackets: number;
  estimatedRtoMs: number;
  estimatedRpoMs: number;
}
