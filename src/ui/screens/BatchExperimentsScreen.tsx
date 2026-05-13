import { useBatchExperiments } from '../hooks/useBatchExperiments';

export function BatchExperimentsScreen({ sim }: { sim?: any }) {
  const baseConfig = sim?.config;
  const batch = useBatchExperiments(baseConfig);

  const updateSeeds = (value: string) => {
    batch.setBatchConfig((prev: any) => ({
      ...prev,
      baseConfig,
      seeds: value.split(',').map((x) => Number(x.trim())).filter(Number.isFinite),
    }));
  };

  const updateAlgorithms = (value: string) => {
    batch.setBatchConfig((prev: any) => ({
      ...prev,
      baseConfig,
      algorithms: value.split(',').map((x) => x.trim()).filter(Boolean),
    }));
  };

  const updateSweepValues = (value: string) => {
    batch.setBatchConfig((prev: any) => ({
      ...prev,
      baseConfig,
      sweeps: [
        {
          field: prev.sweeps?.[0]?.field ?? 'bus.capacityPackets',
          values: value.split(',').map((x) => Number(x.trim())).filter(Number.isFinite),
        },
        ...(prev.sweeps?.slice(1) ?? []),
      ],
    }));
  };

  return (
    <div className="screen-grid single-column">
      <div className="panel-row two-columns">
        <section className="panel">
          <h2>Batch-конфигурация</h2>
          <div className="form-grid">
            <label>
              <span>Seeds</span>
              <input value={batch.batchConfig.seeds.join(',')} onChange={(e) => updateSeeds(e.target.value)} />
            </label>
            <label>
              <span>Algorithms</span>
              <input value={batch.batchConfig.algorithms.join(',')} onChange={(e) => updateAlgorithms(e.target.value)} />
            </label>
            <label>
              <span>Sweep values</span>
              <input value={(batch.batchConfig.sweeps?.[0]?.values ?? []).join(',')} onChange={(e) => updateSweepValues(e.target.value)} />
            </label>
          </div>
          <div className="toolbar-group" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={batch.run} disabled={batch.running || !baseConfig}>Run batch</button>
            <button className="btn" onClick={batch.exportRunsCsv} disabled={!batch.result?.runs?.length}>Runs CSV</button>
            <button className="btn" onClick={batch.exportRankingCsv} disabled={!batch.result?.ranking?.length}>Ranking CSV</button>
          </div>
          {!baseConfig && <p className="muted" style={{ marginTop: 12 }}>Сначала настрой конфигурацию симуляции на вкладке конфигурации.</p>}
        </section>

        <section className="panel">
          <h2>Batch-результаты</h2>
          {!batch.result && <p className="muted">Нет результатов. Запусти batch-прогон.</p>}
          {batch.result && (
            <div className="log-list">
              {batch.result.ranking.map((item: any) => (
                <div className="log-item" key={item.algorithmId}>
                  <span>{item.algorithmId}</span>
                  <span>score {Number(item.meanScore).toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
