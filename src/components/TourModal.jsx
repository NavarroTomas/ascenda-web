const STEPS = [
  { title: 'Tu día, sin ruido', body: 'En Modo Simple vas a ver solo lo importante: pendientes, hábitos y recordatorios claros.' },
  { title: 'Modo Asistido', body: 'Cuando esté activo, Ascenda te guía con acciones rápidas en lugar de formularios largos.' },
  { title: 'Focus', body: 'Definí no negociables, usá el temporizador y registrá bloques de concentración.' },
  { title: 'Finanzas claras', body: 'Revisá ingresos, gastos, límites y alertas sin convertir la app en un sistema contable.' },
]

export default function TourModal({ open, step, onNext, onClose }) {
  if (!open) return null
  const current = STEPS[Math.min(step, STEPS.length - 1)]
  const last = step >= STEPS.length - 1
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="tour-modal panel enter-up">
        <p className="eyebrow">PRIMER RECORRIDO</p>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="tour-dots">{STEPS.map((_, index) => <i className={index === step ? 'active' : ''} key={index} />)}</div>
        <div className="row-actions end">
          <button className="ghost-button" type="button" onClick={onClose}>Saltar</button>
          <button className="primary-button" type="button" onClick={last ? onClose : onNext}>{last ? 'Empezar' : 'Siguiente'}</button>
        </div>
      </section>
    </div>
  )
}
