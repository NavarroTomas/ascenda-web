import { useEffect, useState } from 'react'

const EMPTY_FORM = { name: '', color: '#38d9c6', icon: '◇' }
const ICONS = ['◇', '▣', '◈', '✚', '$', '☼', '◎', '✦', '⚑', '♜', '★', '⚙']

export default function CategoryModal({ open, onClose, onSave, category }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(category ? { name: category.name, color: category.color, icon: category.icon } : EMPTY_FORM)
  }, [open, category])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    const saved = await onSave({ name: form.name.trim(), color: form.color, icon: form.icon }, category)
    setSaving(false)
    if (saved) onClose()
  }

  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="editor-modal compact-modal panel enter-up" onSubmit={handleSubmit}>
      <div className="modal-heading"><div><p className="eyebrow">PERSONALIZACIÓN</p><h2>{category ? 'Editar categoría' : 'Nueva categoría'}</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
      <label><span>Nombre</span><input autoFocus required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej.: Emprendimiento" /></label>
      <label><span>Color</span><input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} /></label>
      <div><span className="field-label">Ícono</span><div className="icon-picker">{ICONS.map((icon) => <button className={form.icon === icon ? 'selected' : ''} type="button" onClick={() => setForm((current) => ({ ...current, icon }))} key={icon}>{icon}</button>)}</div></div>
      <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar categoría'}</button></div>
    </form>
  </div>
}
