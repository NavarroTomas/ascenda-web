export default function ReminderAlertModal({ reminder, onDismiss, onSnooze }) {
  if (!reminder) return null
  return <div className="modal-backdrop reminder-alert-backdrop"><section className={`reminder-alert panel enter-up priority-${reminder.priority}`}>
    <p className="eyebrow">{reminder.priority === 'alarm' ? 'ALARMA' : reminder.priority === 'important' ? 'RECORDATORIO IMPORTANTE' : 'RECORDATORIO'}</p>
    <h2>{reminder.title}</h2><p>{reminder.description || 'Tenés una actividad pendiente.'}</p>
    <div className="snooze-grid"><button type="button" onClick={()=>onSnooze(reminder,5)}>Posponer 5 min</button><button type="button" onClick={()=>onSnooze(reminder,10)}>10 min</button><button type="button" onClick={()=>onSnooze(reminder,30)}>30 min</button><button type="button" onClick={()=>onSnooze(reminder,60)}>1 hora</button></div>
    <button className="primary-button" type="button" onClick={()=>onDismiss(reminder)}>Marcar como visto</button>
  </section></div>
}
