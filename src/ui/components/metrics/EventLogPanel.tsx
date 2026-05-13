interface Props { logs: Array<{ timeMs: number; message: string }>; }

export function EventLogPanel({ logs }: Props) {
  return (
    <section className="panel event-log-panel compact-panel">
      <div className="section-header section-header-compact">
        <div className="section-copy">
          <h3>Журнал</h3>
          <p className="muted">Сообщения накапливаются внутри окна журнала.</p>
        </div>
        <span className="section-badge small-badge">{logs.length}</span>
      </div>
      <div className="event-log">
        {logs.length === 0 && <div className="muted">Событий пока нет</div>}
        {logs.map((log, idx) => (
          <div className="event-item" key={`${log.timeMs}-${idx}`}>
            <span className="event-time">{log.timeMs} ms</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
