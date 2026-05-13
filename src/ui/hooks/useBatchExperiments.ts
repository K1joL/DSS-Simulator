import { useMemo, useState } from 'react';
import { BatchExperimentService, BatchExperimentInput } from '../../app/services/BatchExperimentService';
import { ExperimentService } from '../../app/services/ExperimentService';
import { AlgorithmRegistry } from '../../plugins/registry/AlgorithmRegistry';
import { registerBuiltInAlgorithms } from '../../plugins/registry/registerBuiltInAlgorithms';
import { CsvResultsExporter } from '../../infrastructure/serialization/CsvResultsExporter';
import { JsonConfigSerializer } from '../../infrastructure/serialization/JsonConfigSerializer';

export function useBatchExperiments(baseConfig: any) {
  const registry = useMemo(() => registerBuiltInAlgorithms(new AlgorithmRegistry()), []);
  const experimentService = useMemo(() => new ExperimentService(registry), [registry]);
  const batchService = useMemo(() => new BatchExperimentService(experimentService), [experimentService]);
  const csvExporter = useMemo(() => new CsvResultsExporter(), []);
  const jsonSerializer = useMemo(() => new JsonConfigSerializer(), []);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [batchConfig, setBatchConfig] = useState<BatchExperimentInput>({
    baseConfig,
    algorithms: ['delta', 'full-sync', 'lazy-checkpoint'],
    seeds: [1001, 1002, 1003],
    sweeps: [
      { field: 'bus.capacityPackets', values: [800, 1000, 1400] },
      { field: 'algorithmConfig.syncIntervalMs', values: [250, 500, 1000] },
    ],
    weights: { throughput: 1, drops: 1, queue: 0.5 },
  });
  const run = async () => { setRunning(true); try { setResult(batchService.runBatch(batchConfig)); } finally { setRunning(false); } };
  const exportRunsCsv = () => { if (result?.runs?.length) csvExporter.download('batch-runs.csv', result.runs); };
  const exportRankingCsv = () => { if (result?.ranking?.length) csvExporter.download('batch-ranking.csv', result.ranking); };
  const exportBatchJson = () => { jsonSerializer.download('batch-result.json', { config: batchConfig, result }); };
  return { batchConfig, setBatchConfig, result, running, run, exportRunsCsv, exportRankingCsv, exportBatchJson };
}
