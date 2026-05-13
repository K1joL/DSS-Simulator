export interface BatchCaseInput { seed: number; algorithmId: string; overrides: Record<string, unknown>; }
export interface BatchRunResultDto {
  algorithmId: string; seed: number; overrides: Record<string, unknown>;
  totalArrivedPackets: number; totalServedPackets: number; totalDroppedPackets: number;
  avgThroughputPps: number; avgBusQueue: number; score: number;
}
export interface RankedAlgorithmDto {
  algorithmId: string; meanScore: number; meanThroughputPps: number; meanDroppedPackets: number; meanBusQueue: number; runs: number;
}
export interface BatchExperimentResultDto { runs: BatchRunResultDto[]; ranking: RankedAlgorithmDto[]; }
