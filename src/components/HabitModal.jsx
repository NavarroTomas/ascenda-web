import { useEffect, useState } from 'react'
import { findCategory } from '../data/defaultCategories.js'
import { useFormDraft } from '../lib/formDrafts.js'
import DraftRecoveryNotice from './DraftRecoveryNotice.jsx'

const DAY_OPTIONS = [
  { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'X' },
  { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' }, { value: 0, label: 'D' },
]
const EMPTY_FORM = { title: '', description: '', category_key: 'default:Personal', target: 1, unit: 'veces', habit_type: 'binary', frequency_type: 'daily', weekly_target: 2, active_days: [0,1,2,3,4,5,6], xp_reward: 8 }

export default function HabitModal({ open, onClose, onSave, categories }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const draft = useFormDraft({ open, type: 'habit', form, setForm, getInitialForm: () => EMPTY_FORM })

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function updateField(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      active_days: current.active_days.includes(day) ? current.active_days.filter((item) => item !== day) : [...current.active_days, day].sort(),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true)
    const category = findCategory(categories, form.category_key)
    const saved = await onSave({
      title: form.title.trim(), description: form.description.trim() || null, category: category.name, category_id: category.id || null,
      target: Math.max(1, Number(form.target)), unit: form.unit.trim() || 'veces', habit_type: form.habit_type,
      frequency_type: form.frequency_type, weekly_target: Math.max(1, Number(form.weekly_target || 1)),
      active_days: form.frequency_type === 'specific_days' ? form.active_days : [0,1,2,3,4,5,6],
      xp_reward: Math.max(1, Number(form.xp_reward)),
    })
    setSaving(false)
    if (!saved) return
    draft.clearDraft(); onClose()
  }

  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="editor-modal panel enter-up" onSubmit={handleSubmit}>
    <div className="modal-heading"><div><p className="eyebrow">CONSTANCIA</p><h2>Nuevo hábito</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
    <DraftRecoveryNotice draft={draft.recoveredDraft} onDiscard={draft.discardDraft} />
    <label><span>Nombre del hábito</span><input autoFocus required value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Ej.: Ir al gimnasio" /></label>
    <label><span>Descripción opcional</span><textarea rows="2" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Definí qué querés sostener." /></label>
    <div className="form-grid two-columns">
      <label><span>Categoría</span><select value={form.category_key} onChange={(event) => updateField('category_key', event.target.value)}>{categories.map((category) => <option value={category.key} key={category.key}>{category.icon} {category.name}</option>)}</select></label>
      <label><span>Tipo</span><select value={form.habit_type} onChange={(event) => updateField('habit_type', event.target.value)}><option value="binary">Cumplimiento simple</option><option value="quantitative">Cuantitativo</option><option value="negative">Evitar una acción</option></select></label>
      <label><span>Frecuencia</span><select value={form.frequency_type} onChange={(event) => updateField('frequency_type', event.target.value)}><option value="daily">Todos los días</option><option value="specific_days">Días específicos</option><option value="weekly_target">Cantidad de veces por semana</option></select></label>
      {form.frequency_type === 'weekly_target' ? <label><span>Objetivo semanal</span><input type="number" min="1" max="21" value={form.weekly_target} onChange={(event) => updateField('weekly_target', event.target.value)} /></label> : <label><span>Meta por registro</span><input type="number" min="1" value={form.target} onChange={(event) => updateField('target', event.target.value)} /></label>}
      <label><span>Unidad</span><input value={form.unit} onChange={(event) => updateField('unit', event.target.value)} placeholder="veces, vasos, minutos…" /></label>
      <label><span>XP base por registro</span><input type="number" min="1" max="100" value={form.xp_reward} onChange={(event) => updateField('xp_reward', event.target.value)} /></label>
    </div>
    {form.frequency_type === 'specific_days' && <div className="habit-day-selector"><span>Días activos</span><div>{DAY_OPTIONS.map((day) => <button className={form.active_days.includes(day.value) ? 'selected' : ''} type="button" onClick={() => toggleDay(day.value)} key={day.value}>{day.label}</button>)}</div></div>}
    {form.frequency_type === 'weekly_target' && <p className="muted-copy compact">Podés registrar las sesiones en cualquier día. El contador se reinicia cada lunes y conserva el historial anterior.</p>}
    <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Crear hábito'}</button></div>
  </form></div>
}
