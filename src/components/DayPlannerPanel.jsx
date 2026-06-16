import { useEffect, useMemo, useState } from 'react'
import { normalizePlanLines } from '../lib/v9Analytics.js'

function joinLines(value) {
  return normalizePlanLines(value).join('\n')
}

export default function DayPlannerPanel({ plan, today, summary, onSave }) {
  const initial = useMemo(() => ({
    main_focus: plan?.main_focus || '',
    morning_items: joinLines(plan?.morning_items),
    afternoon_items: joinLines(plan?.afternoon_items),
    evening_items: joinLines(plan?.evening_items),
  }), [plan])
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(!plan)

  useEffect(() => {
    setForm(initial)
    setEditing(!plan)
  }, [initial, plan])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const ok = await onSave({
      plan_date: today,
      main_focus: form.main_focus.trim() || null,
      morning_items: normalizePlanLines(form.morning_items),
      afternoon_items: normalizePlanLines(form.afternoon_items),
      evening_items: normalizePlanLines(form.evening_items),
    }, plan)
    setSaving(false)
    if (ok) setEditing(false)
  }

  const blocks = [
    ['morning_items', 'Mañana'],
    ['afternoon_items', 'Tarde'],
    ['evening_items', 'Noche'],
  ]

  return <article className="content-panel panel day-planner-panel">
    <div className="card-heading"><div><p className="eyebrow">PLAN DEL DÍA</p><h2>Organizá mañana, tarde y noche</h2><p>{summary.pendingHabits.length ? `Sugerencia: incluí “${summary.pendingHabits[0].title}”.` : 'Usá bloques simples para decidir antes de actuar.'}</p></div><button className="mini-action" type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Cerrar' : 'Editar plan'}</button></div>
    {editing ? <div className="planner-editor">
      <label><span>Objetivo principal del día</span><input value={form.main_focus} onChange={(event) => update('main_focus', event.target.value)} placeholder="Ej.: terminar presupuesto del cliente" /></label>
      <div className="planner-block-grid">{blocks.map(([field, label]) => <label key={field}><span>{label}</span><textarea rows="4" value={form[field]} onChange={(event) => update(field, event.target.value)} placeholder="Una acción por línea" /></label>)}</div>
      <div className="row-actions end"><button className="primary-button" type="button" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar plan'}</button></div>
    </div> : <div className="planner-preview">
      <div className="planner-focus"><span>Prioridad</span><strong>{plan?.main_focus || 'Sin prioridad definida'}</strong></div>
      <div className="planner-block-grid">{blocks.map(([field, label]) => <div className="planner-preview-block" key={field}><span>{label}</span>{normalizePlanLines(plan?.[field]).length ? normalizePlanLines(plan?.[field]).map((item) => <p key={item}>• {item}</p>) : <small>Sin acciones.</small>}</div>)}</div>
    </div>}
  </article>
}
