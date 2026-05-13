import { ExperimentService, ExperimentConfigInput } from './ExperimentService';
import { BatchCaseInput, BatchExperimentResultDto, BatchRunResultDto, RankedAlgorithmDto } from '../dto/BatchResultDto';

export interface BatchSweepDefinition { field: string; values: Array<string | number | boolean>; }
export interface BatchExperimentInput {
  baseConfig: ExperimentConfigInput;
  algorithms: string[];
  seeds: number[];
  sweeps: BatchSweepDefinition[];
  weights?: { throughput?: number; drops?: number; queue?: number; };
}

export class BatchExperimentService {
  constructor(private readonly experimentService: ExperimentService) {}
  runBatch(input: BatchExperimentInput): BatchExperimentResultDto {
    const cases = this.expandCases(input.algorithms, input.seeds, input.sweeps);
    const runs: BatchRunResultDto[] = [];
    for (const batchCase of cases) {
      const config = this.buildConfig(input.baseConfig, batchCase);
      const orchestrator = this.experimentService.createOrchestrator(config);
      orchestrator.initialize();
      orchestrator.runToEnd();
      const aggregate = orchestrator.getAggregateMetrics();
      runs.push({ algorithmId: batchCase.algorithmId, seed: batchCase.seed, overrides: batchCase.overrides, totalArrivedPackets: aggregate.totalArrivedPackets, totalServedPackets: aggregate.totalServedPackets, totalDroppedPackets: aggregate.totalDroppedPackets, avgThroughputPps: aggregate.avgThroughputPps, avgBusQueue: aggregate.avgBusQueue, score: 0 });
    }
    this.applyScores(runs, input.weights);
    return { runs, ranking: this.rankAlgorithms(runs) };
  }
  rankAlgorithms(runs: BatchRunResultDto[]): RankedAlgorithmDto[] {
    const grouped = new Map<string, BatchRunResultDto[]>();
    runs.forEach(run => { const arr = grouped.get(run.algorithmId) ?? []; arr.push(run); grouped.set(run.algorithmId, arr); });
    return Array.from(grouped.entries()).map(([algorithmId, items]) => ({ algorithmId, meanScore: avg(items.map(x => x.score)), meanThroughputPps: avg(items.map(x => x.avgThroughputPps)), meanDroppedPackets: avg(items.map(x => x.totalDroppedPackets)), meanBusQueue: avg(items.map(x => x.avgBusQueue)), runs: items.length })).sort((a, b) => b.meanScore - a.meanScore);
  }
  private applyScores(runs: BatchRunResultDto[], weights?: { throughput?: number; drops?: number; queue?: number }): void {
    const w = { throughput: weights?.throughput ?? 1, drops: weights?.drops ?? 1, queue: weights?.queue ?? 0.5 };
    const maxThroughput = Math.max(...runs.map(r => r.avgThroughputPps), 1);
    const maxDrops = Math.max(...runs.map(r => r.totalDroppedPackets), 1);
    const maxQueue = Math.max(...runs.map(r => r.avgBusQueue), 1);
    for (const run of runs) {
      const throughputPart = (run.avgThroughputPps / maxThroughput) * w.throughput;
      const dropsPenalty = (run.totalDroppedPackets / maxDrops) * w.drops;
      const queuePenalty = (run.avgBusQueue / maxQueue) * w.queue;
      run.score = throughputPart - dropsPenalty - queuePenalty;
    }
  }
  private expandCases(algorithms: string[], seeds: number[], sweeps: BatchSweepDefinition[]): BatchCaseInput[] {
    const sweepOverrides = this.cartesianSweeps(sweeps);
    const cases: BatchCaseInput[] = [];
    for (const algorithmId of algorithms) for (const seed of seeds) for (const overrides of sweepOverrides) cases.push({ algorithmId, seed, overrides });
    return cases;
  }
  private cartesianSweeps(sweeps: BatchSweepDefinition[]): Record<string, unknown>[] {
    if (!sweeps.length) return [{}];
    return sweeps.reduce<Record<string, unknown>[]>((acc, sweep) => {
      const next: Record<string, unknown>[] = [];
      for (const current of acc) for (const value of sweep.values) next.push({ ...current, [sweep.field]: value });
      return next;
    }, [{}]);
  }
  private buildConfig(baseConfig: ExperimentConfigInput, batchCase: BatchCaseInput): ExperimentConfigInput {
    const next = structuredClone(baseConfig);
    next.seed = batchCase.seed;
    next.algorithmId = batchCase.algorithmId;
    for (const [path, value] of Object.entries(batchCase.overrides)) this.setByPath(next as Record<string, unknown>, path, value);
    return next;
  }
  private setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let ref: any = target;
    for (let i = 0; i < parts.length - 1; i++) { ref = ref[parts[i]]; if (ref == null) throw new Error(`Invalid override path: ${path}`); }
    ref[parts[parts.length - 1]] = value;
  }
}
function avg(values: number[]): number { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
