export interface ScenarioPreset { id: string; name: string; description: string; config: Record<string, unknown>; }
export class ScenarioCatalog {
  private readonly presets: ScenarioPreset[] = [
    { id: 'dense-sv-baseline', name: 'Dense SV Baseline', description: 'Высокая нагрузка на общую шину с умеренным резервированием.', config: { bus: { capacityPackets: 1000, serviceRatePps: 3000 }, algorithmId: 'delta' } },
    { id: 'small-buffer-stress', name: 'Small Buffer Stress', description: 'Стресс-сценарий с уменьшенным буфером и высоким риском потерь.', config: { bus: { capacityPackets: 500, serviceRatePps: 3000 }, algorithmId: 'lazy-checkpoint' } },
    { id: 'low-rpo-mode', name: 'Low RPO Mode', description: 'Режим с приоритетом восстановления данных и повышенным служебным трафиком.', config: { algorithmId: 'full-sync' } },
  ];
  list(): ScenarioPreset[] { return this.presets; }
  getById(id: string): ScenarioPreset { const preset = this.presets.find(x => x.id === id); if (!preset) throw new Error(`Preset not found: ${id}`); return preset; }
}
