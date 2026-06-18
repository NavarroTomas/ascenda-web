export default function SimpleHomeView({ displayName, summary, todayPlan, tasks = [], habits = [], habitLogs = [], today, openCreate, toggleTask, toggleHabit, navigate }) {
  const essentialTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada').slice(0, 4)
  const pendingHabits = habits.filter((habit) => !habitLogs.some((log) => log.habit_id === habit.id && log.log_date === today)).slice(0, 4)
  const total = essentialTasks.length + pendingHabits.length + Number(summary?.remindersToday?.length || 0)
  return (
    <section className="simple-home-view">
      <article className="simple-today-hero panel">
        <p className="eyebrow">HOY</p>
        <h1>Hola, {displayName?.split(' ')[0] || 'Usuario'}.</h1>
        <p>{total ? `Tenés ${total} cosa${total === 1 ? '' : 's'} importante${total === 1 ? '' : 's'} para hoy.` : 'Hoy no hay pendientes importantes.'}</p>
        <button className="simple-primary-action" type="button" onClick={() => openCreate?.('task')}>+ Agregar algo</button>
      </article>

      {todayPlan?.main_focus && <article className="simple-focus-card panel"><span>Objetivo de hoy</span><strong>{todayPlan.main_focus}</strong></article>}

      <section className="simple-list-panel panel">
        <div className="card-heading"><div><p className="eyebrow">PENDIENTES</p><h2>Lo importante</h2></div></div>
        <div className="simple-action-list">
          {essentialTasks.map((task) => <button type="button" onClick={() => toggleTask?.(task)} key={task.id}><span>○</span><strong>{task.title}</strong></button>)}
          {pendingHabits.map((habit) => <button type="button" onClick={() => toggleHabit?.(habit)} key={habit.id}><span>○</span><strong>{habit.title}</strong></button>)}
          {!essentialTasks.length && !pendingHabits.length && <p className="muted-copy">No hay tareas ni hábitos urgentes.</p>}
        </div>
      </section>

      <section className="simple-shortcuts">
        <button type="button" onClick={() => navigate?.('recordatorios')}>Recordatorios</button>
        <button type="button" onClick={() => navigate?.('habitos')}>Hábitos</button>
        <button type="button" onClick={() => navigate?.('finanzas')}>Finanzas</button>
      </section>
    </section>
  )
}
