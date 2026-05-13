export interface LazyCheckpointConfig {
  heartbeatPacketsPerStep: number;
  checkpointPacketsOnFailure: number;
  baseRtoMs: number;
  assumedRpoMs: number;
}
