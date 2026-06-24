export default function SimpleHomeView({ displayName, summary, todayPlan, tasks = [], habits = [], habitLogs = [], today, openCreate, toggleTask, toggleHabit, navigate }) {
  const essentialTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada').slice(0, 6)
  const pendingHabits = habits.filter((habit) => !habitLogs.some((log) => log.habit_id === habit.id && log.log_date === today)).slice(0, 4)
  const reminderCount = Number(summary?.remindersToday?.length || 0)
  const eventCount = Number(summary?.eventsToday?.length || 0)
  const total = essentialTasks.length + pendingHabits.length + reminderCount + eventCount
  const firstName = displayName?.split(' ')[0] || 'Usuario'

  return (
    <section className="simple-home-view simple-home-compact">
      <article className="simple-today-hero panel">
        <div className="simple-hero-copy">
          <p className="eyebrow">HOY</p>
          <h1>Hola, {firstName}.</h1>
          <p>
            {total
              ? `Tenés ${total} cosa${total === 1 ? '' : 's'} importante${total === 1 ? '' : 's'} para hoy.`
              : 'Hoy no hay pendientes importantes.'}
          </p>
        </div>
        <button className="simple-primary-action" type="button" onClick={() => openCreate?.('task')}>
          + Agregar algo
        </button>
      </article>

      <section className="simple-list-panel panel">
        <div className="card-heading simple-card-heading">
          <div>
            <p className="eyebrow">PENDIENTES</p>
            <h2>Lo importante</h2>
          </div>
        </div>
        <div className="simple-action-list compact-list">
          {essentialTasks.map((task) => (
            <button type="button" onClick={() => toggleTask?.(task)} key={task.id}>
              <span>○</span>
              <strong>{task.title}</strong>
            </button>
          ))}
          {pendingHabits.map((habit) => (
            <button type="button" onClick={() => toggleHabit?.(habit)} key={habit.id}>
              <span>○</span>
              <strong>{habit.title}</strong>
            </button>
          ))}
          {!essentialTasks.length && !pendingHabits.length && <p className="muted-copy">No hay tareas ni hábitos urgentes.</p>}
        </div>
      </section>

      <aside className="simple-side-stack">
        <article className="simple-compact-card panel">
          <span>Objetivo de hoy</span>
          <strong>{todayPlan?.main_focus || 'Definí una prioridad para hoy.'}</strong>
          {!todayPlan?.main_focus && (
            <button className="simple-link-button" type="button" onClick={() => navigate?.('inicio')}>
              Planificar mi día
            </button>
          )}
        </article>

        <article className="simple-compact-card panel simple-summary-card">
          <span>Resumen rápido</span>
          <div className="simple-summary-line"><b>{essentialTasks.length}</b><small>Tareas</small></div>
          <div className="simple-summary-line"><b>{pendingHabits.length}</b><small>Hábitos</small></div>
          <div className="simple-summary-line"><b>{reminderCount}</b><small>Recordatorios</small></div>
          <div className="simple-summary-line"><b>{eventCount}</b><small>Eventos</small></div>
        </article>

        <section className="simple-shortcuts panel">
          <button type="button" onClick={() => navigate?.('agenda')}>Agenda</button>
          <button type="button" onClick={() => navigate?.('recordatorios')}>Recordatorios</button>
          <button type="button" onClick={() => navigate?.('habitos')}>Hábitos</button>
          <button type="button" onClick={() => navigate?.('finanzas')}>Finanzas</button>
        </section>
      </aside>
    </section>
  )
}
