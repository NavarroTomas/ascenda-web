import { useEffect, useState } from 'react'
import { getWeekStartISO, getWeeklySummary } from '../lib/v9Analytics.js'

export default function WeeklyReviewPanel({ reviews = [], tasks = [], habits = [], habitLogs = [], routines = [], routineLogs = [], goals = [], xpEvents = [], settings, onSave }) {
  const weekStart = getWeekStartISO()
  const currentReview = reviews.find((review) => review.week_start === weekStart) || null
  const summary = getWeeklySummary({ tasks, habits, habitLogs, routines, routineLogs, goals, xpEvents, weekStart })
  const [form, setForm] = useState({ rating: 7, wins: '', blockers: '', next_focus: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(!currentReview)

  useEffect(() => {
    setOpen(!currentReview)
    setForm({ rating: currentReview?.rating || 7, wins: currentReview?.wins || '', blockers: currentReview?.blockers || '', next_focus: currentReview?.next_focus || '', notes: currentReview?.notes || '' })
  }, [currentReview])

  if (settings?.weekly_review_enabled === false) return null

  async function save() {
    setSaving(true)
    const ok = await onSave({ week_start: weekStart, ...form, rating: Number(form.rating || 7) }, currentReview)
    setSaving(false)
    if (ok) setOpen(false)
  }

  return <article className="content-panel panel weekly-review-panel">
    <div className="card-heading"><div><p className="eyebrow">REVISIÓN SEMANAL</p><h2>{currentReview ? 'Tu revisión de esta semana' : 'Cerrá la semana con intención'}</h2><p>{summary.recommendation}</p></div><button className="mini-action" type="button" onClick={() => setOpen((value) => !value)}>{open ? 'Ocultar' : currentReview ? 'Editar' : 'Responder'}</button></div>
    <div className="weekly-summary-strip">
      <span><strong>{summary.tasksCompleted}</strong><small>tareas</small></span>
      <span><strong>{summary.habitSessions}</strong><small>sesiones</small></span>
      <span><strong>{summary.routinesCompleted}</strong><small>rutinas</small></span>
      <span><strong>{summary.xpTotal}</strong><small>XP</small></span>
    </div>
    {currentReview && !open && <div className="review-readonly"><p><strong>Calificación:</strong> {currentReview.rating}/10</p><p><strong>Lo mejor:</strong> {currentReview.wins || 'Sin respuesta.'}</p><p><strong>Próximo foco:</strong> {currentReview.next_focus || 'Sin definir.'}</p></div>}
    {open && <div className="review-form">
      <label><span>¿Cómo calificás tu semana?</span><input type="number" min="1" max="10" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} /></label>
      <label><span>¿Qué fue lo mejor?</span><textarea rows="2" value={form.wins} onChange={(event) => setForm((current) => ({ ...current, wins: event.target.value }))} /></label>
      <label><span>¿Qué te costó más?</span><textarea rows="2" value={form.blockers} onChange={(event) => setForm((current) => ({ ...current, blockers: event.target.value }))} /></label>
      <label><span>¿Qué querés priorizar?</span><input value={form.next_focus} onChange={(event) => setForm((current) => ({ ...current, next_focus: event.target.value }))} /></label>
      <div className="row-actions end"><button className="primary-button" type="button" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar revisión'}</button></div>
    </div>}
  </article>
}
