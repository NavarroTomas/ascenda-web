export default function QuickCreateModal({ open, onClose, onSelect }) {
  if (!open) return null
  const options = [
    { id:'task',icon:'✓',title:'Nueva tarea',copy:'Actividad concreta con subtareas, etiquetas y XP final.' },
    { id:'event',icon:'◷',title:'Nuevo evento',copy:'Bloque de agenda con horario y repetición.' },
    { id:'reminder',icon:'⏰',title:'Nuevo recordatorio',copy:'Aviso interno con sonido y opción de posponer.' },
    { id:'daily_note',icon:'✎',title:'Anotación de hoy',copy:'Entrada libre con guardado automático.' },
    { id:'note',icon:'▤',title:'Nueva nota',copy:'Información permanente, fijable y bloqueable con PIN.' },
    { id:'habit',icon:'◉',title:'Nuevo hábito',copy:'Acción repetible para sostener durante el tiempo.' },
    { id:'routine',icon:'↻',title:'Nueva rutina',copy:'Secuencia simple o estructurada con bonus final.' },
    { id:'goal',icon:'◇',title:'Nuevo objetivo',copy:'Meta personal con progreso e hitos opcionales.' },
  ]
  return <div className="modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><section className="quick-create-modal panel enter-up"><div className="modal-heading"><div><p className="eyebrow">ACCIÓN RÁPIDA</p><h2>¿Qué querés crear?</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div><div className="quick-create-grid">{options.map(option=><button type="button" onClick={()=>onSelect(option.id)} key={option.id}><span>{option.icon}</span><strong>{option.title}</strong><small>{option.copy}</small></button>)}</div></section></div>
}
