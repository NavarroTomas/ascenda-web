export default function AutomaticPriorityPanel({ alerts = [], navigate }) {
  if (!alerts.length) return null
  return (
    <article className="content-panel panel automatic-priority-panel">
      <div className="card-heading"><div><p className="eyebrow">PRIORIDADES AUTOMÁTICAS</p><h2>Atención recomendada</h2></div></div>
      <div className="priority-alert-list">
        {alerts.map((alert) => <button className={`priority-alert ${alert.tone}`} type="button" onClick={() => alert.section && navigate?.(alert.section)} key={alert.id}><span>!</span><div><strong>{alert.title}</strong><small>{alert.detail}</small></div><b>{alert.action}</b></button>)}
      </div>
    </article>
  )
}
