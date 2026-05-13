import { ScreenKey } from '../../App';
import { ExperimentForm } from '../components/forms/ExperimentForm';
import { VmAssignmentEditor } from '../components/forms/VmAssignmentEditor';
import { ConfigImportExportPanel } from '../components/forms/ConfigImportExportPanel';
import { CalculationSidebar } from '../components/forms/CalculationSidebar';

interface Props { sim: any; onNavigate: (screen: ScreenKey) => void; }

export function ConfigurationScreen({ sim, onNavigate }: Props) {
  return (
    <div className="screen-grid single-column config-screen-with-fab">
      <div className="floating-save-bar">
        <button className="btn btn-primary btn-small floating-save-btn" onClick={() => { sim.initialize(); onNavigate('simulation'); }}>
          Сохранить
        </button>
      </div>

      <div className="config-layout-with-sidebar">
        <div className="config-main-column">
          <section className="panel surface compact-panel">
            <div className="section-header">
              <div className="section-copy">
                <h2>Общие настройки сценария</h2>
                <p className="muted">Слева только редактирование, справа — расчётная инженерная сводка.</p>
              </div>
              <span className="section-badge">01</span>
            </div>
            <ExperimentForm config={sim.config} setConfig={sim.setConfig} />
          </section>

          <VmAssignmentEditor config={sim.config} setConfig={sim.setConfig} />

          <section className="panel surface compact-panel">
            <div className="section-header">
              <div className="section-copy">
                <h2>Импорт и экспорт</h2>
                <p className="muted">Работа с конфигурацией вынесена в отдельный небольшой блок.</p>
              </div>
              <span className="section-badge">03</span>
            </div>
            <ConfigImportExportPanel config={sim.config} setConfig={sim.setConfig} />
          </section>
        </div>

        <CalculationSidebar config={sim.config} />
      </div>
    </div>
  );
}
