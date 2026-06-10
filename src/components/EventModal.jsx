import { useState } from 'react'
import { getTodayISO } from '../lib/date.js'
import { useFormDraft } from '../lib/formDrafts.js'
import DraftRecoveryNotice from './DraftRecoveryNotice.jsx'

const EMPTY = { title: '', description: '', event_date: getTodayISO(), start_time: '', end_time: '', all_day: false, color: '#38d9c6', location: '', link_url: '', guests_text: '', notes: '', status: 'confirmed', recurrence_type: 'none', recurrence_until: '' }
function normalizeEvent(event, defaultDate) { return { ...EMPTY, ...(defaultDate ? { event_date: defaultDate } : {}), ...(event || {}), start_time: event?.start_time?.slice(0,5) || '', end_time: event?.end_time?.slice(0,5) || '', recurrence_until: event?.recurrence_until || '' } }

export default function EventModal({ open, event, defaultDate, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const draft = useFormDraft({ open, type: 'event', entityId: event?.id || 'new', form, setForm, getInitialForm: () => normalizeEvent(event, defaultDate) })
  if (!open) return null
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  async function submit(e) { e.preventDefault(); setSaving(true); const ok = await onSave({ ...form, title: form.title.trim(), description: form.description.trim() || null, start_time: form.all_day ? null : form.start_time || null, end_time: form.all_day ? null : form.end_time || null, location: form.location.trim() || null, link_url: form.link_url.trim() || null, guests_text: form.guests_text.trim() || null, notes: form.notes.trim() || null, recurrence_until: form.recurrence_type === 'none' ? null : form.recurrence_until || null }, event); setSaving(false); if (ok) { draft.clearDraft(); onClose() } }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="editor-modal panel enter-up" onSubmit={submit}>
    <div className="modal-heading"><div><p className="eyebrow">AGENDA</p><h2>{event ? 'Editar evento' : 'Nuevo evento'}</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
    <DraftRecoveryNotice draft={draft.recoveredDraft} onDiscard={draft.discardDraft} />
    <label><span>Título</span><input required autoFocus value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Ej.: Reunión con cliente" /></label>
    <label><span>Descripción opcional</span><textarea rows="2" value={form.description || ''} onChange={(e) => update('description', e.target.value)} /></label>
    <div className="form-grid two-columns"><label><span>Fecha</span><input type="date" required value={form.event_date} onChange={(e) => update('event_date', e.target.value)} /></label><label className="setting-row compact-setting"><span><strong>Todo el día</strong></span><input type="checkbox" checked={form.all_day} onChange={(e) => update('all_day', e.target.checked)} /></label>{!form.all_day && <><label><span>Inicio</span><input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} /></label><label><span>Fin</span><input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} /></label></>}<label><span>Repetición</span><select value={form.recurrence_type} onChange={(e) => update('recurrence_type', e.target.value)}><option value="none">No repetir</option><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label>{form.recurrence_type !== 'none' && <label><span>Repetir hasta</span><input type="date" value={form.recurrence_until || ''} onChange={(e) => update('recurrence_until', e.target.value)} /></label>}<label><span>Estado</span><select value={form.status} onChange={(e) => update('status', e.target.value)}><option value="confirmed">Confirmado</option><option value="tentative">Tentativo</option><option value="cancelled">Cancelado</option></select></label><label><span>Color</span><input type="color" value={form.color} onChange={(e) => update('color', e.target.value)} /></label><label><span>Ubicación</span><input value={form.location || ''} onChange={(e) => update('location', e.target.value)} /></label><label><span>Enlace</span><input value={form.link_url || ''} onChange={(e) => update('link_url', e.target.value)} placeholder="https://…" /></label></div>
    <label><span>Invitados como texto</span><input value={form.guests_text || ''} onChange={(e) => update('guests_text', e.target.value)} placeholder="Nombres o correos separados por coma" /></label>
    <label><span>Notas</span><textarea rows="2" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} /></label>
    <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar evento'}</button></div>
  </form></div>
}
