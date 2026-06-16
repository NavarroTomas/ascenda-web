import { formatShortDate } from '../lib/date.js'
import { getWeeklySummary } from '../lib/v9Analytics.js'

function MetricCard({ eyebrow, value, detail }) {
  return <article className="metric-card panel"><p className="eyebrow">{eyebrow}</p><h2>{value}</h2><span>{detail}</span></article>
}

function WeeklyChart({ week }) {
  return <div className="chart-bars">{week.map((day) => <div className="bar-column" key={day.iso}><span className="bar-value">{day.value}</span><div className="chart-bar"><i style={{ height: `${day.percentage}%` }} /></div><small>{day.weekday}</small></div>)}</div>
}

export default function ProgressDashboard({ metrics, seasonMetrics, xpEvents = [], tasks = [], habits = [], habitLogs = [], routines = [], routineLogs = [], goals = [], weeklyReviews = [] }) {
  const summary = getWeeklySummary({ tasks, habits, habitLogs, routines, routineLogs, goals, xpEvents })
  const lastReview = weeklyReviews[0]
  const completedTasksTotal = tasks.filter((task) => task.completed).length
  const completedGoalsTotal = goals.filter((goal) => goal.status === 'completed').length

  return <section className="view-stack enter-up"><header className="section-heading"><div><p className="eyebrow">ANÁLISIS PERSONAL</p><h2>Progreso</h2><p>Resumen sincronizado de XP, constancia, semana actual y revisiones personales.</p></div></header>
    <section className="metrics-grid">
      <MetricCard eyebrow="EXPERIENCIA TOTAL" value={`${metrics.totalXp} XP`} detail={`Nivel ${metrics.level} · ${metrics.title}`} />
      <MetricCard eyebrow="RANGO DE TEMPORADA" value={seasonMetrics.rank.displayName} detail={`${seasonMetrics.points} PT · ${seasonMetrics.rank.next ? `${seasonMetrics.rank.pointsToNext} PT para ascender` : 'rango máximo'}`} />
      <MetricCard eyebrow="RACHA ACTUAL" value={`${metrics.streak} días`} detail={`Bonus actual: +${metrics.streakBonus}% XP`} />
      <MetricCard eyebrow="SISTEMA ACTIVO" value={habits.length + routines.length + goals.length} detail={`${completedTasksTotal} tareas · ${completedGoalsTotal} objetivos cerrados`} />
    </section>

    <section className="dashboard-grid">
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">SEMANA ACTUAL</p><h2>Resumen automático</h2></div><span className="positive-pill">{summary.xpTotal} XP</span></div><div className="weekly-summary-strip"><span><strong>{summary.tasksCompleted}</strong><small>tareas</small></span><span><strong>{summary.habitSessions}</strong><small>hábitos</small></span><span><strong>{summary.routinesCompleted}</strong><small>rutinas</small></span><span><strong>{summary.activeGoals}</strong><small>objetivos activos</small></span></div><p className="muted-copy compact">{summary.bestHabit?.habit ? `Mejor hábito: ${summary.bestHabit.habit.title} (${summary.bestHabit.percent}%).` : 'Aún no hay hábito dominante esta semana.'}</p><p className="muted-copy compact">{summary.recommendation}</p></article>
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">ÚLTIMOS SIETE DÍAS</p><h2>XP obtenida</h2></div></div><WeeklyChart week={metrics.week} /></article>
    </section>

    <section className="dashboard-grid">
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">REVISIÓN MÁS RECIENTE</p><h2>{lastReview ? `${lastReview.rating}/10` : 'Sin revisión'}</h2></div></div>{lastReview ? <div className="review-readonly"><p><strong>Semana:</strong> {formatShortDate(lastReview.week_start)}</p><p><strong>Lo mejor:</strong> {lastReview.wins || 'Sin respuesta.'}</p><p><strong>Próximo foco:</strong> {lastReview.next_focus || 'Sin definir.'}</p></div> : <p className="muted-copy compact">Completá la revisión semanal desde Inicio para construir historial.</p>}</article>
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">HISTORIAL RECIENTE</p><h2>Recompensas permanentes</h2></div></div><div className="xp-event-list">{xpEvents.slice(0, 14).map((event) => <div className="xp-event" key={event.id}><span>✦</span><div><strong>{event.reason}</strong><small>{formatShortDate(event.occurred_on)} · multiplicador ×{event.multiplier}</small></div><b>+{event.amount} XP</b></div>)}</div></article>
    </section>
  </section>
}
