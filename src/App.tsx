import { useState } from 'react';
import { useSimulation } from './ui/hooks/useSimulation';
import { ConfigurationScreen } from './ui/screens/ConfigurationScreen';
import { SimulationScreen } from './ui/screens/SimulationScreen';
import { ResultsScreen } from './ui/screens/ResultsScreen';
import { BatchExperimentsScreen } from './ui/screens/BatchExperimentsScreen';

export type ScreenKey = 'configuration' | 'simulation' | 'results' | 'batch';

const navItems: Array<{ key: ScreenKey; label: string }> = [
  { key: 'configuration', label: 'Конфигурация' },
  { key: 'simulation', label: 'Симуляция' },
  { key: 'results', label: 'Результаты' },
  { key: 'batch', label: 'Batch' },
];

export default function App() {
  const sim = useSimulation();
  const [screen, setScreen] = useState<ScreenKey>('configuration');
  return (
    <div className="app-shell compact-shell">
      <header className="app-header surface surface-hero compact-header">
        <div className="hero-copy compact-copy">
          <span className="eyebrow">KCPC Simulator V2</span>
          <h1>Светлый компактный интерфейс</h1>
          <p className="muted hero-text">Нормальная конфигурация КМ, пошаговая симуляция, журнал с прокруткой и более аккуратные графики.</p>
        </div>
        <div className="hero-side compact-side">
          <div className="status-chip">{sim.running ? 'Идёт расчёт' : 'Остановлено'}</div>
          <nav className="nav-tabs" aria-label="Навигация по разделам">
            {navItems.map((item) => (
              <button key={item.key} className={screen === item.key ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setScreen(item.key)}>{item.label}</button>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">
        {screen === 'configuration' && <ConfigurationScreen sim={sim} onNavigate={setScreen} />}
        {screen === 'simulation' && <SimulationScreen sim={sim} />}
        {screen === 'results' && <ResultsScreen sim={sim} />}
        {screen === 'batch' && <BatchExperimentsScreen sim={sim} />}
      </main>
    </div>
  );
}
