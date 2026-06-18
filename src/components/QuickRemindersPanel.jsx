const QUICK_OPTIONS = [
  { minutes: 10, label: 'En 10 minutos' },
  { minutes: 60, label: 'En 1 hora' },
  { minutes: 24 * 60, label: 'Mañana' },
]

export default function QuickRemindersPanel({ onCreateQuickReminder }) {
  return (
    <article className="content-panel panel quick-reminders-panel">
      <div className="card-heading">
        <div>
          <p className="eyebrow">RECORDATORIOS RÁPIDOS</p>
          <h2>Crear aviso sin configurar todo</h2>
        </div>
      </div>
      <div className="quick-reminder-grid">
        {QUICK_OPTIONS.map((option) => <button className="ghost-button" type="button" onClick={() => onCreateQuickReminder?.(option.minutes, option.label)} key={option.label}>{option.label}</button>)}
      </div>
    </article>
  )
}
