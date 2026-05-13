import { RandomProvider } from '../../engine/rng/RandomProvider';

export interface ClusterSnapshot {
  nowMs: number;
  busQueueLength: number;
  failedVmIds: string[];
}

export interface PluginContext<TConfig = unknown> {
  nowMs: number;
  config: TConfig;
  cluster: ClusterSnapshot;
  rng: RandomProvider;
}
