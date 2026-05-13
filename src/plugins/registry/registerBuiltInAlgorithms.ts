import { AlgorithmRegistry } from './AlgorithmRegistry';
import { DeltaPlugin } from '../built-in/delta/DeltaPlugin';
import { FullSyncPlugin } from '../built-in/full-sync/FullSyncPlugin';
import { LazyCheckpointPlugin } from '../built-in/lazy-checkpoint/LazyCheckpointPlugin';

export function registerBuiltInAlgorithms(registry: AlgorithmRegistry): AlgorithmRegistry {
  registry.registerMany([new DeltaPlugin(), new FullSyncPlugin(), new LazyCheckpointPlugin()]);
  return registry;
}
