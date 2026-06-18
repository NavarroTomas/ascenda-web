import FocusTimerPanel from './FocusTimerPanel.jsx'

export default function FocusDashboardPanel({ todayPlan, nonNegotiables = [], focusSessions = [], onSaveNonNegotiable, onDeleteNonNegotiable, onSaveFocusSession }) {
  async function addNonNegotiable(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    if (!title) return
    await onSaveNonNegotiable?.({ title, source_type: 'manual', active: true })
    event.currentTarget.reset()
  }

  return (
    <section className="focus-mode-grid">
      <article className="focus-deep-panel panel">
        <p className="eyebrow">MODO FOCUS</p>
        <h2>Hoy no se negocia.</h2>
        <p>Objetivo principal: <strong>{todayPlan?.main_focus || 'Definí tu objetivo principal del día.'}</strong></p>
        <div className="non-negotiable-list">
          {nonNegotiables.filter((item) => item.active !== false).slice(0, 6).map((item) => (
            <div className="non-negotiable-item" key={item.id}>
              <span>◆</span><strong>{item.title}</strong>
              <button className="delete-button" type="button" onClick={() => onDeleteNonNegotiable?.(item.id)}>×</button>
            </div>
          ))}
        </div>
        <form className="non-negotiable-form" onSubmit={addNonNegotiable}>
          <input name="title" placeholder="Nuevo no negociable: Gimnasio, estudiar, dormir bien..." />
          <button className="mini-action" type="submit">Agregar</button>
        </form>
      </article>
      <FocusTimerPanel focusSessions={focusSessions} onSaveFocusSession={onSaveFocusSession} />
    </section>
  )
}
