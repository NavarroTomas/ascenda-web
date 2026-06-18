import { useMemo, useState } from 'react'

export default function NightReviewPanel({ today, reviews = [], onSave }) {
  const existing = useMemo(() => reviews.find((review) => review.review_date === today) || null, [reviews, today])
  const [form, setForm] = useState({
    rating: existing?.rating || 7,
    completed: existing?.completed || '',
    pending: existing?.pending || '',
    tomorrow_focus: existing?.tomorrow_focus || '',
    notes: existing?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    await onSave?.({ ...form, review_date: today, rating: Number(form.rating || 7) }, existing)
    setSaving(false)
  }
  return (
    <article className="content-panel panel night-review-panel">
      <div className="card-heading"><div><p className="eyebrow">CIERRE DEL DÍA</p><h2>Revisión nocturna</h2><p>Opcional. Sirve para bajar ruido mental y preparar mañana.</p></div></div>
      <form className="night-review-form" onSubmit={submit}>
        <label><span>¿Cómo cerraste el día?</span><input type="range" min="1" max="10" value={form.rating} onChange={(event) => update('rating', event.target.value)} /><b>{form.rating}/10</b></label>
        <label><span>Qué completaste</span><textarea rows="2" value={form.completed} onChange={(event) => update('completed', event.target.value)} /></label>
        <label><span>Qué quedó pendiente</span><textarea rows="2" value={form.pending} onChange={(event) => update('pending', event.target.value)} /></label>
        <label><span>Foco para mañana</span><input value={form.tomorrow_focus} onChange={(event) => update('tomorrow_focus', event.target.value)} /></label>
        <button className="ghost-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cierre'}</button>
      </form>
    </article>
  )
}
