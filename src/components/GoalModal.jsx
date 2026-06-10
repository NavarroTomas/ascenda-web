import { useEffect, useMemo, useState } from 'react'
import { findCategory } from '../data/defaultCategories.js'

const EMPTY_MILESTONE = () => ({ tempId: crypto.randomUUID(), title: '', description: '', due_date: '', xp_reward: 20 })
const EMPTY_FORM = {
  title: '', description: '', category_key: 'default:Personal', goal_type: 'manual',
  target_value: '', current_value: 0, unit: '', progress_percent: 0, due_date: '', visibility: 'private',
  xp_reward: 60, milestones: [],
}

function normalizeGoal(goal, milestones, categories) {
  const category = categories.find((item) => item.id && item.id === goal?.category_id)
    || categories.find((item) => item.name === goal?.category)
    || categories[0]
  return {
    title: goal?.title || '', description: goal?.description || '', category_key: category?.key || 'default:Personal',
    goal_type: goal?.goal_type || 'manual', target_value: goal?.target_value ?? '', current_value: goal?.current_value ?? 0,
    unit: goal?.unit || '', progress_percent: goal?.progress_percent ?? 0, due_date: goal?.due_date || '',
    visibility: goal?.visibility || 'private', xp_reward: goal?.xp_reward ?? 60,
    milestones: (milestones || []).map((item) => ({ ...item, tempId: item.id })),
  }
}

export default function GoalModal({ open, onClose, onSave, goal, milestones, categories }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const editing = Boolean(goal)
  const projectedProgress = useMemo(() => {
    if (form.goal_type === 'quantitative' && Number(form.target_value) > 0) return Math.min(100, Math.round((Number(form.current_value || 0) / Number(form.target_value)) * 100))
    return Math.min(100, Math.max(0, Number(form.progress_percent || 0)))
  }, [form])

  useEffect(() => {
    if (!open) return undefined
    setForm(normalizeGoal(goal, milestones, categories))
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, goal, milestones, categories, onClose])

  function updateField(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  function addMilestone() { setForm((current) => ({ ...current, milestones: [...current.milestones, EMPTY_MILESTONE()] })) }
  function updateMilestone(tempId, field, value) { setForm((current) => ({ ...current, milestones: current.milestones.map((item) => item.tempId === tempId ? { ...item, [field]: value } : item) })) }
  function removeMilestone(tempId) { setForm((current) => ({ ...current, milestones: current.milestones.filter((item) => item.tempId !== tempId) })) }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    const category = findCategory(categories, form.category_key)
    const saved = await onSave({
      title: form.title.trim(), description: form.description.trim() || null,
      category: category.name, category_id: category.id || null, goal_type: form.goal_type,
      target_value: form.goal_type === 'quantitative' && form.target_value !== '' ? Number(form.target_value) : null,
      current_value: form.goal_type === 'quantitative' ? Number(form.current_value || 0) : 0,
      unit: form.unit.trim() || null, progress_percent: projectedProgress, due_date: form.due_date || null,
      visibility: form.visibility, xp_reward: Math.max(0, Number(form.xp_reward || 0)),
      milestones: form.milestones.filter((item) => item.title.trim()).map((item, position) => ({
        ...(item.id ? { id: item.id } : {}), title: item.title.trim(), description: item.description?.trim() || null,
        due_date: item.due_date || null, xp_reward: Math.max(1, Number(item.xp_reward || 20)), position,
        completed: Boolean(item.completed), completed_at: item.completed_at || null,
      })),
    }, goal)
    setSaving(false)
    if (!saved) return
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="editor-modal wide-modal panel enter-up" onSubmit={handleSubmit}>
        <div className="modal-heading"><div><p className="eyebrow">METAS PERSONALES</p><h2>{editing ? 'Editar objetivo' : 'Nuevo objetivo'}</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
        <div className="form-grid two-columns">
          <label><span>Título</span><input required autoFocus value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Ej.: Ahorrar para renovar mi computadora" /></label>
          <label><span>Categoría</span><select value={form.category_key} onChange={(event) => updateField('category_key', event.target.value)}>{categories.map((category) => <option value={category.key} key={category.key}>{category.icon} {category.name}</option>)}</select></label>
          <label><span>Tipo de progreso</span><select value={form.goal_type} onChange={(event) => updateField('goal_type', event.target.value)}><option value="manual">Porcentaje manual</option><option value="quantitative">Valor cuantitativo</option></select></label>
          <label><span>Fecha límite opcional</span><input type="date" value={form.due_date} onChange={(event) => updateField('due_date', event.target.value)} /></label>
          {form.goal_type === 'quantitative' ? <>
            <label><span>Valor actual</span><input type="number" min="0" value={form.current_value} onChange={(event) => updateField('current_value', event.target.value)} /></label>
            <label><span>Meta final</span><input required type="number" min="1" value={form.target_value} onChange={(event) => updateField('target_value', event.target.value)} /></label>
            <label><span>Unidad</span><input value={form.unit} onChange={(event) => updateField('unit', event.target.value)} placeholder="$, km, libros, clientes…" /></label>
          </> : <label><span>Progreso actual</span><input type="number" min="0" max="100" value={form.progress_percent} onChange={(event) => updateField('progress_percent', event.target.value)} /></label>}
          <label><span>Visibilidad futura</span><select value={form.visibility} onChange={(event) => updateField('visibility', event.target.value)}><option value="private">Privado</option><option value="shared">Compartido</option><option value="public">Público</option></select></label>
          <label><span>XP al completar objetivo</span><input type="number" min="0" value={form.xp_reward} onChange={(event) => updateField('xp_reward', event.target.value)} /></label>
        </div>
        <label><span>Descripción opcional</span><textarea rows="2" value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label>
        <div className="xp-preview horizontal"><span>Progreso proyectado</span><strong>{projectedProgress}%</strong></div>
        <div className="steps-editor">
          <div className="card-heading"><div><p className="eyebrow">HITOS OPCIONALES</p><h3>Etapas intermedias</h3></div><button className="ghost-button" type="button" onClick={addMilestone}>＋ Agregar hito</button></div>
          {!form.milestones.length && <p className="muted-copy compact">Podés guardar el objetivo sin hitos o dividirlo en etapas medibles.</p>}
          {form.milestones.map((item, index) => <div className="milestone-editor-row" key={item.tempId}>
            <span className="step-index">{index + 1}</span>
            <input required value={item.title} onChange={(event) => updateMilestone(item.tempId, 'title', event.target.value)} placeholder="Nombre del hito" />
            <input type="date" value={item.due_date || ''} onChange={(event) => updateMilestone(item.tempId, 'due_date', event.target.value)} />
            <input type="number" min="1" max="300" value={item.xp_reward} onChange={(event) => updateMilestone(item.tempId, 'xp_reward', event.target.value)} placeholder="XP" />
            <button className="delete-button" type="button" onClick={() => removeMilestone(item.tempId)}>×</button>
          </div>)}
        </div>
        <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear objetivo'}</button></div>
      </form>
    </div>
  )
}
