import { useMemo, useState } from 'react'
import AccountSecurityPanel from './AccountSecurityPanel.jsx'
import CategoryModal from './CategoryModal.jsx'
import { DEFAULT_CATEGORIES } from '../data/defaultCategories.js'
import { THEME_PRESETS } from '../data/themePresets.js'

const MODE_OPTIONS = [
  { id: 'simple', title: 'Simple', description: 'Interfaz directa, tipografía más grande y navegación reducida.', icon: '○' },
  { id: 'standard', title: 'Estándar', description: 'Equilibrio entre organización, estadísticas y gamificación.', icon: '◈' },
  { id: 'rpg', title: 'RPG', description: 'Experiencia visual intensa con progreso, rangos y celebraciones.', icon: '✦' },
]

export default function SettingsView({ user, profile, settings, customCategories, onSaveSettings, onSaveProfile, onSaveCategory, onDeleteCategory, onToggleSidebar, onToast }) {
  const [form, setForm] = useState({ ...settings, display_name: profile?.display_name || '' })
  const [saving, setSaving] = useState(false)
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null })
  const hasChanges = useMemo(() => JSON.stringify({ ...settings, display_name: profile?.display_name || '' }) !== JSON.stringify(form), [settings, profile, form])

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }

  async function save() {
    setSaving(true)
    await Promise.all([
      onSaveProfile({ display_name: form.display_name.trim() || 'Usuario' }),
      onSaveSettings({
        experience_mode: form.experience_mode,
        theme: form.theme,
        visual_theme: form.visual_theme,
        reduce_motion: Boolean(form.reduce_motion),
        intense_effects_enabled: Boolean(form.intense_effects_enabled),
        sounds_enabled: Boolean(form.sounds_enabled),
        high_contrast: Boolean(form.high_contrast),
        color_vision_mode: form.color_vision_mode,
        penalties_enabled: Boolean(form.penalties_enabled),
        custom_quote: form.custom_quote?.trim() || null,
        sidebar_collapsed: Boolean(form.sidebar_collapsed),
        daily_welcome_enabled: Boolean(form.daily_welcome_enabled),
        weekly_review_enabled: Boolean(form.weekly_review_enabled),
      }),
    ])
    setSaving(false)
  }

  async function toggleSidebar() {
    const nextValue = !form.sidebar_collapsed
    update('sidebar_collapsed', nextValue)
    await onToggleSidebar(nextValue)
  }

  return <section className="view-stack enter-up">
    <header className="section-heading"><div><p className="eyebrow">PREFERENCIAS PERSONALES</p><h2>Configuración</h2><p>Ajustá identidad, efectos y accesibilidad. Los cambios quedan sincronizados con tu cuenta.</p></div>{hasChanges && <button className="primary-button" type="button" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>}</header>

    <section className="settings-grid">
      <article className="content-panel panel settings-panel">
        <div className="card-heading"><div><p className="eyebrow">IDENTIDAD</p><h3>Perfil</h3></div></div>
        <label><span>Nombre visible</span><input value={form.display_name} onChange={(event) => update('display_name', event.target.value)} /></label>
        <label><span>Frase motivacional personalizada</span><textarea rows="3" value={form.custom_quote || ''} onChange={(event) => update('custom_quote', event.target.value)} placeholder="Dejá el campo vacío para utilizar las frases rotativas incluidas en el código." /></label>
      </article>

      <article className="content-panel panel settings-panel">
        <div className="card-heading"><div><p className="eyebrow">INTERFAZ</p><h3>Modo de experiencia</h3></div></div>
        <div className="mode-selector">{MODE_OPTIONS.map((mode) => <button className={form.experience_mode === mode.id ? 'selected' : ''} type="button" onClick={() => update('experience_mode', mode.id)} key={mode.id}><span>{mode.icon}</span><strong>{mode.title}</strong><small>{mode.description}</small></button>)}</div>
      </article>

      <article className="content-panel panel settings-panel full-width">
        <div className="card-heading"><div><p className="eyebrow">PERSONALIZACIÓN VISUAL</p><h3>Estilo del sistema</h3><p>Los estilos son universos visuales originales. Guerrero Astral queda disponible gratuitamente.</p></div></div>
        <div className="theme-selector">{THEME_PRESETS.map((theme) => <button className={form.visual_theme === theme.id ? 'selected' : ''} type="button" onClick={() => update('visual_theme', theme.id)} key={theme.id}><span>{theme.icon}</span><div><strong>{theme.title}</strong><small>{theme.description}</small></div></button>)}</div>
      </article>

      <article className="content-panel panel settings-panel">
        <div className="card-heading"><div><p className="eyebrow">EFECTOS</p><h3>Animaciones y sonidos</h3></div></div>
        <div className="setting-list">
          <label className="setting-row"><span><strong>Sonidos de recompensa</strong><small>Reproduce tonos originales al completar acciones, subir de nivel o ascender de rango.</small></span><input type="checkbox" checked={form.sounds_enabled} onChange={(event) => update('sounds_enabled', event.target.checked)} /></label>
          <label className="setting-row"><span><strong>Efectos intensos</strong><small>Activa celebraciones ampliadas y partículas temporales en los estilos RPG.</small></span><input type="checkbox" checked={form.intense_effects_enabled} onChange={(event) => update('intense_effects_enabled', event.target.checked)} /></label>
          <label className="setting-row"><span><strong>Reducir animaciones</strong><small>Desactiva transiciones y movimientos decorativos.</small></span><input type="checkbox" checked={form.reduce_motion} onChange={(event) => update('reduce_motion', event.target.checked)} /></label>
          <label className="setting-row"><span><strong>Bienvenida diaria</strong><small>Muestra una pantalla animada una vez por día al abrir Ascenda.</small></span><input type="checkbox" checked={form.daily_welcome_enabled !== false} onChange={(event) => update('daily_welcome_enabled', event.target.checked)} /></label>
          <label className="setting-row"><span><strong>Revisión semanal</strong><small>Activa el bloque guiado para cerrar la semana y guardar aprendizajes.</small></span><input type="checkbox" checked={form.weekly_review_enabled !== false} onChange={(event) => update('weekly_review_enabled', event.target.checked)} /></label>
        </div>
      </article>

      <article className="content-panel panel settings-panel">
        <div className="card-heading"><div><p className="eyebrow">VISUAL</p><h3>Tema y accesibilidad</h3></div></div>
        <div className="setting-list">
          <label className="setting-row"><span><strong>Tema claro</strong><small>Usar una interfaz luminosa en lugar del modo oscuro.</small></span><input type="checkbox" checked={form.theme === 'light'} onChange={(event) => update('theme', event.target.checked ? 'light' : 'dark')} /></label>
          <label className="setting-row"><span><strong>Alto contraste</strong><small>Refuerza bordes, textos y estados visuales.</small></span><input type="checkbox" checked={form.high_contrast} onChange={(event) => update('high_contrast', event.target.checked)} /></label>
          <label className="setting-row"><span><strong>Penalizaciones por demora</strong><small>Preferencia preparada para la lógica de tareas atrasadas.</small></span><input type="checkbox" checked={form.penalties_enabled} onChange={(event) => update('penalties_enabled', event.target.checked)} /></label>
          <label><span>Adaptación de color</span><select value={form.color_vision_mode} onChange={(event) => update('color_vision_mode', event.target.value)}><option value="default">Predeterminada</option><option value="tritanopia">Tritanopia</option><option value="protanopia">Protanopia</option><option value="deuteranopia">Deuteranopia</option></select></label>
          <button className="ghost-button align-left" type="button" onClick={toggleSidebar}>{form.sidebar_collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}</button>
        </div>
      </article>

      <article className="content-panel panel settings-panel full-width">
        <div className="card-heading"><div><p className="eyebrow">ORGANIZACIÓN</p><h3>Categorías</h3><p>Las categorías predeterminadas permanecen disponibles. Podés crear otras para adaptar la aplicación.</p></div><button className="ghost-button" type="button" onClick={() => setCategoryModal({ open: true, category: null })}>＋ Nueva categoría</button></div>
        <div className="category-grid">
          {DEFAULT_CATEGORIES.map((category) => <div className="category-chip locked" key={category.name}><i style={{ background: category.color }} /><span>{category.icon}</span><strong>{category.name}</strong><small>Predeterminada</small></div>)}
          {customCategories.map((category) => <div className="category-chip" key={category.id}><i style={{ background: category.color }} /><span>{category.icon}</span><strong>{category.name}</strong><div className="row-actions"><button className="mini-action" type="button" onClick={() => setCategoryModal({ open: true, category })}>Editar</button><button className="delete-button" type="button" onClick={() => onDeleteCategory(category.id)}>×</button></div></div>)}
        </div>
      </article>
      <AccountSecurityPanel user={user} onToast={onToast} />
    </section>

    <CategoryModal open={categoryModal.open} category={categoryModal.category} onClose={() => setCategoryModal({ open: false, category: null })} onSave={onSaveCategory} />
  </section>
}
