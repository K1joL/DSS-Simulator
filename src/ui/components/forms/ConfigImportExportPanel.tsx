import { useConfigImportExport } from '../../hooks/useConfigImportExport';
interface Props { config: unknown; setConfig: (updater: any) => void; }
export function ConfigImportExportPanel({ config, setConfig }: Props) {
  const io = useConfigImportExport(config, setConfig);
  return <section className="panel"><h2>Импорт / экспорт</h2><p className="muted">Экспортируй конфигурацию сценария в JSON и загружай её обратно для воспроизводимых экспериментов.</p><div className="toolbar-group" style={{ marginTop: 12 }}><button className="btn" onClick={io.exportConfig}>Export JSON</button><button className="btn btn-primary" onClick={io.openImportDialog}>Import JSON</button></div><input ref={io.inputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={e => io.onFileSelected(e.target.files?.[0] ?? null)} />{io.status && <p className="muted" style={{ marginTop: 12 }}>{io.status}</p>}</section>;
}
