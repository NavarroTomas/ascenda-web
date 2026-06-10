import { useEffect, useState } from 'react'

function localInputValue(date = new Date(Date.now() + 3600000)) {
  const value = new Date(date)
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 16)
}
const EMPTY = { title: '', description: '', next_trigger_at: localInputValue(), recurrence_type: 'none', recurrence_interval: 1, priority: 'normal', sound_enabled: true, source_type: 'standalone', source_id: '' }
export default function ReminderModal({ open, reminder, tasks, events, routines, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setForm({ ...EMPTY, ...(reminder || {}), next_trigger_at: localInputValue(reminder?.next_trigger_at), source_id: reminder?.source_id || '' }) }, [open, reminder])
  if (!open) return null
  const update = (k,v) => setForm((c) => ({ ...c, [k]: v }))
  const sources = form.source_type === 'task' ? tasks : form.source_type === 'event' ? events : form.source_type === 'routine' ? routines : []
  async function submit(e) { e.preventDefault(); setSaving(true); if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); const ok = await onSave({ ...form, title: form.title.trim(), description: form.description.trim() || null, next_trigger_at: new Date(form.next_trigger_at).toISOString(), source_id: form.source_type === 'standalone' ? null : form.source_id || null, recurrence_interval: Number(form.recurrence_interval || 1), status: 'active' }, reminder?.id ? reminder : null); setSaving(false); if (ok) onClose() }
  return <div className="modal-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}><form className="editor-modal panel enter-up" onSubmit={submit}>
    <div className="modal-heading"><div><p className="eyebrow">RECORDATORIOS</p><h2>{reminder?.id ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
    <label><span>Título</span><input autoFocus required value={form.title} onChange={(e)=>update('title',e.target.value)} /></label>
    <label><span>Descripción</span><textarea rows="2" value={form.description || ''} onChange={(e)=>update('description',e.target.value)} /></label>
    <div className="form-grid two-columns">
      <label><span>Fecha y hora</span><input required type="datetime-local" value={form.next_trigger_at} onChange={(e)=>update('next_trigger_at',e.target.value)} /></label>
      <label><span>Importancia</span><select value={form.priority} onChange={(e)=>update('priority',e.target.value)}><option value="normal">Normal</option><option value="important">Importante</option><option value="alarm">Alarma</option></select></label>
      <label><span>Repetición</span><select value={form.recurrence_type} onChange={(e)=>update('recurrence_type',e.target.value)}><option value="none">No repetir</option><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label>
      <label><span>Cada</span><input min="1" type="number" value={form.recurrence_interval} onChange={(e)=>update('recurrence_interval',e.target.value)} /></label>
      <label><span>Vincular con</span><select value={form.source_type} onChange={(e)=>update('source_type',e.target.value)}><option value="standalone">Independiente</option><option value="task">Tarea</option><option value="event">Evento</option><option value="routine">Rutina</option></select></label>
      {form.source_type !== 'standalone' && <label><span>Elemento</span><select value={form.source_id} onChange={(e)=>update('source_id',e.target.value)}><option value="">Seleccionar…</option>{sources.map((item)=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label>}
    </div>
    <label className="setting-row"><span><strong>Sonido</strong><small>El navegador puede requerir permiso o una interacción previa.</small></span><input type="checkbox" checked={form.sound_enabled} onChange={(e)=>update('sound_enabled',e.target.checked)} /></label>
    <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar recordatorio'}</button></div>
  </form></div>
}
