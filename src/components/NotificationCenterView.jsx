import { formatShortDate } from '../lib/date.js'

export default function NotificationCenterView({ notifications = [], onMarkRead, navigate }) {
  return (
    <section className="view-stack enter-up notification-center-view">
      <header className="section-heading"><div><p className="eyebrow">CENTRO INTERNO</p><h2>Avisos</h2><p>Historial de recordatorios, prioridades, novedades y alertas internas de Ascenda.</p></div></header>
      <article className="content-panel panel">
        <div className="notification-center-list">
          {notifications.length ? notifications.map((item) => <div className={`internal-notification ${item.read_at ? 'read' : ''} ${item.tone || 'info'}`} key={item.id}>
            <span>{item.read_at ? '✓' : '•'}</span>
            <div><strong>{item.title}</strong><p>{item.body || item.message || 'Aviso interno.'}</p><small>{item.created_at ? formatShortDate(item.created_at.slice(0, 10)) : 'Hoy'}</small></div>
            <div className="row-actions end">
              {item.metadata?.section && <button className="mini-action" type="button" onClick={() => navigate?.(item.metadata.section)}>Abrir</button>}
              {!item.read_at && !String(item.id).startsWith('auto-') && !String(item.id).startsWith('push-') && <button className="mini-action" type="button" onClick={() => onMarkRead?.(item)}>Visto</button>}
            </div>
          </div>) : <div className="empty-state"><p>No hay avisos internos todavía.</p></div>}
        </div>
      </article>
    </section>
  )
}
