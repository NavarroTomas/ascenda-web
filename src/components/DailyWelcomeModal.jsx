import { getGreeting } from '../lib/date.js'
import { getDailyDashboardSummary } from '../lib/v9Analytics.js'

function firstName(name) {
  return String(name || 'Usuario').trim().split(/\s+/)[0] || 'Usuario'
}

export default function DailyWelcomeModal({ open, displayName, today, settings, tasks, habits, habitLogs, routines, routineLogs, events, reminders, onClose }) {
  if (!open) return null
  const summary = getDailyDashboardSummary({ tasks, habits, habitLogs, routines, routineLogs, events, reminders, today })
  const name = firstName(displayName)
  const lines = [
    `${getGreeting()}, ${name}.`,
    '¿Cómo estás hoy?',
    summary.total ? `Tu día tiene ${summary.total} acciones principales y ya completaste ${summary.done}.` : 'Hoy todavía no tenés acciones principales cargadas.',
    summary.pendingHabits.length ? `Hábito pendiente: ${summary.pendingHabits[0].title}.` : 'Tus hábitos no tienen bloqueos urgentes.',
    summary.dueRoutines.length ? '¿Completaste tu rutina hoy?' : 'Podés crear una rutina para darle estructura al día.',
  ]

  return <div className="daily-welcome-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenida diaria">
    <section className={`daily-welcome-screen ${settings?.reduce_motion ? 'reduced-motion' : ''}`}>
      <button className="daily-welcome-skip" type="button" onClick={onClose}>Saltar</button>
      <div className="daily-welcome-copy">
        <p className="eyebrow">ASCENDA · INICIO DIARIO</p>
        {lines.map((line, index) => <h1 className="daily-welcome-line" style={{ '--delay': `${index * 0.65}s` }} key={line}>{line}</h1>)}
        <button className="primary-button" type="button" onClick={onClose}>Entrar a mi día</button>
      </div>
    </section>
  </div>
}
