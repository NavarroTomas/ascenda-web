import { useEffect, useMemo, useState } from 'react'
import { findCategory } from '../data/defaultCategories.js'

const WEEKDAYS = [
  { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
  { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 0, label: 'D' },
]

const EMPTY_STEP = () => ({ tempId: crypto.randomUUID(), title: '', duration_minutes: '', xp_reward: 5 })
const EMPTY_FORM = {
  title: '', description: '', category_key: 'default:Personal', routine_type: 'structured',
  scheduled_days: [], scheduled_time: '', duration_minutes: '', xp_bonus: 15, steps: [EMPTY_STEP()],
}

function normalizeRoutine(routine, steps, categories) {
  const category = categories.find((item) => item.id && item.id === routine?.category_id)
    || categories.find((item) => item.name === routine?.category)
    || categories[0]
  return {
    title: routine?.title || '',
    description: routine?.description || '',
    category_key: category?.key || 'default:Personal',
    routine_type: routine?.routine_type || 'structured',
    scheduled_days: routine?.scheduled_days || [],
    scheduled_time: routine?.scheduled_time?.slice(0, 5) || '',
    duration_minutes: routine?.duration_minutes || '',
    xp_bonus: routine?.xp_bonus ?? 15,
    steps: steps?.length ? steps.map((step) => ({ ...step, tempId: step.id })) : [EMPTY_STEP()],
  }
}

export default function RoutineModal({ open, onClose, onSave, routine, routineSteps, categories }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const editing = Boolean(routine)
  const totalXp = useMemo(() => Number(form.xp_bonus || 0) + form.steps.reduce((sum, step) => sum + Number(step.xp_reward || 0), 0), [form])

  useEffect(() => {
    if (!open) return undefined
    setForm(normalizeRoutine(routine, routineSteps, categories))
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, routine, routineSteps, categories, onClose])

  function updateField(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  function toggleDay(day) { setForm((current) => ({ ...current, scheduled_days: current.scheduled_days.includes(day) ? current.scheduled_days.filter((item) => item !== day) : [...current.scheduled_days, day] })) }
  function updateStep(tempId, field, value) { setForm((current) => ({ ...current, steps: current.steps.map((step) => step.tempId === tempId ? { ...step, [field]: value } : step) })) }
  function addStep() { setForm((current) => ({ ...current, steps: [...current.steps, EMPTY_STEP()] })) }
  function removeStep(tempId) { setForm((current) => ({ ...current, steps: current.steps.length > 1 ? current.steps.filter((step) => step.tempId !== tempId) : current.steps })) }
  function moveStep(index, offset) {
    const target = index + offset
    if (target < 0 || target >= form.steps.length) return
    setForm((current) => {
      const steps = [...current.steps]
      ;[steps[index], steps[target]] = [steps[target], steps[index]]
      return { ...current, steps }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    const category = findCategory(categories, form.category_key)
    const steps = form.routine_type === 'simple'
      ? [{ title: form.title.trim(), duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null, xp_reward: 10 }]
      : form.steps.filter((step) => step.title.trim()).map((step, position) => ({ title: step.title.trim(), duration_minutes: step.duration_minutes ? Number(step.duration_minutes) : null, xp_reward: Math.max(1, Number(step.xp_reward || 5)), position }))

    const saved = await onSave({
      title: form.title.trim(), description: form.description.trim() || null,
      category: category.name, category_id: category.id || null, routine_type: form.routine_type,
      scheduled_days: form.scheduled_days, scheduled_time: form.scheduled_time || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      xp_bonus: Math.max(0, Number(form.xp_bonus || 0)), steps,
    }, routine)
    setSaving(false)
    if (!saved) return
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="editor-modal wide-modal panel enter-up" onSubmit={handleSubmit}>
        <div className="modal-heading"><div><p className="eyebrow">SECUENCIAS PERSONALES</p><h2>{editing ? 'Editar rutina' : 'Nueva rutina'}</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
        <div className="form-grid two-columns">
          <label><span>Nombre</span><input required autoFocus value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Ej.: Rutina de mañana" /></label>
          <label><span>Tipo</span><select value={form.routine_type} onChange={(event) => updateField('routine_type', event.target.value)}><option value="structured">Estructurada con pasos</option><option value="simple">Simple</option></select></label>
          <label><span>Categoría</span><select value={form.category_key} onChange={(event) => updateField('category_key', event.target.value)}>{categories.map((category) => <option value={category.key} key={category.key}>{category.icon} {category.name}</option>)}</select></label>
          <label><span>Horario opcional</span><input type="time" value={form.scheduled_time} onChange={(event) => updateField('scheduled_time', event.target.value)} /></label>
          <label><span>Duración estimada opcional</span><input type="number" min="1" value={form.duration_minutes} onChange={(event) => updateField('duration_minutes', event.target.value)} placeholder="Minutos" /></label>
          <label><span>Bonus al completar rutina</span><input type="number" min="0" max="300" value={form.xp_bonus} onChange={(event) => updateField('xp_bonus', event.target.value)} /></label>
        </div>
        <label><span>Descripción opcional</span><textarea rows="2" value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label>
        <div><span className="field-label">Días programados opcionales</span><div className="weekday-picker">{WEEKDAYS.map((day) => <button className={form.scheduled_days.includes(day.id) ? 'selected' : ''} type="button" onClick={() => toggleDay(day.id)} key={day.id}>{day.label}</button>)}</div></div>

        {form.routine_type === 'structured' && <div className="steps-editor">
          <div className="card-heading"><div><p className="eyebrow">PASOS</p><h3>Secuencia de la rutina</h3></div><button className="ghost-button" type="button" onClick={addStep}>＋ Agregar paso</button></div>
          {form.steps.map((step, index) => <div className="step-editor-row" key={step.tempId}>
            <span className="step-index">{index + 1}</span>
            <input required value={step.title} onChange={(event) => updateStep(step.tempId, 'title', event.target.value)} placeholder="Nombre del paso" />
            <input type="number" min="1" value={step.duration_minutes} onChange={(event) => updateStep(step.tempId, 'duration_minutes', event.target.value)} placeholder="Min." />
            <input type="number" min="1" max="100" value={step.xp_reward} onChange={(event) => updateStep(step.tempId, 'xp_reward', event.target.value)} placeholder="XP" />
            <button className="mini-action" type="button" onClick={() => moveStep(index, -1)}>↑</button>
            <button className="mini-action" type="button" onClick={() => moveStep(index, 1)}>↓</button>
            <button className="delete-button" type="button" onClick={() => removeStep(step.tempId)}>×</button>
          </div>)}
        </div>}

        <div className="xp-preview horizontal"><span>XP máxima por ejecución</span><strong>+{totalXp} XP</strong></div>
        <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear rutina'}</button></div>
      </form>
    </div>
  )
}
