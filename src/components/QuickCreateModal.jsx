const OPTIONS = [
  { id:'task',icon:'✓',title:'Tarea',copy:'Algo concreto para hacer.' },
  { id:'reminder',icon:'⚑',title:'Recordatorio',copy:'Un aviso para no olvidarte.' },
  { id:'habit',icon:'◉',title:'Hábito',copy:'Algo que querés repetir.' },
  { id:'daily_note',icon:'✎',title:'Anotación de hoy',copy:'Una idea rápida para guardar.' },
  { id:'event',icon:'◷',title:'Evento',copy:'Algo con fecha u horario.' },
  { id:'note',icon:'▤',title:'Nota',copy:'Información permanente.' },
  { id:'routine',icon:'↻',title:'Rutina',copy:'Una secuencia de pasos.' },
  { id:'goal',icon:'◇',title:'Objetivo',copy:'Una meta más grande.' },
]

export default function QuickCreateModal({ open, onClose, onSelect, assistedMode = false, onQuickReminder }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}>
      <section className={`quick-create-modal panel enter-up ${assistedMode ? 'assisted-create-modal' : ''}`}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{assistedMode ? 'MODO ASISTIDO' : 'ACCIÓN RÁPIDA'}</p>
            <h2>{assistedMode ? '¿Qué necesitás hacer?' : '¿Qué querés crear?'}</h2>
            {assistedMode && <p>Elegí una opción simple. Ascenda abre el formulario correcto sin mostrarte todo de golpe.</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {assistedMode && <div className="assisted-shortcuts">
          <button type="button" onClick={() => onQuickReminder?.(10, 'En 10 minutos')}><strong>Recordame en 10 minutos</strong><small>Para algo inmediato.</small></button>
          <button type="button" onClick={() => onQuickReminder?.(60, 'En 1 hora')}><strong>Recordame en 1 hora</strong><small>Para volver después.</small></button>
          <button type="button" onClick={() => onQuickReminder?.(1440, 'Mañana')}><strong>Recordame mañana</strong><small>Para no cargar fecha manual.</small></button>
        </div>}
        <div className="quick-create-grid">
          {OPTIONS.map(option => <button type="button" onClick={()=>onSelect(option.id)} key={option.id}><span>{option.icon}</span><strong>{option.title}</strong><small>{option.copy}</small></button>)}
        </div>
      </section>
    </div>
  )
}
