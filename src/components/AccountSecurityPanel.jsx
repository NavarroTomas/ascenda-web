import { useState } from 'react'
import DeleteAccountModal from './DeleteAccountModal.jsx'
import {
  buildAccountExport, changeCurrentPassword, downloadJsonExport, signOutEverywhere,
} from '../lib/accountManagement.js'

const EMPTY_PASSWORDS = { current: '', next: '', repeated: '' }

export default function AccountSecurityPanel({ user, onToast }) {
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function updatePassword(field, value) { setPasswords((current) => ({ ...current, [field]: value })) }

  async function submitPassword(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    if (passwords.next.length < 6) return setFeedback({ type: 'error', message: 'La contraseña nueva debe tener al menos 6 caracteres.' })
    if (passwords.next !== passwords.repeated) return setFeedback({ type: 'error', message: 'Las contraseñas nuevas no coinciden.' })
    setChangingPassword(true)
    try {
      await changeCurrentPassword({ email: user.email, currentPassword: passwords.current, newPassword: passwords.next })
      setPasswords(EMPTY_PASSWORDS)
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'No se pudo actualizar la contraseña.' })
    } finally {
      setChangingPassword(false)
    }
  }

  async function exportData() {
    setExporting(true)
    try {
      const payload = await buildAccountExport(user)
      downloadJsonExport(payload)
      onToast?.(payload.warnings.length ? 'Datos exportados con advertencias incluidas en el archivo.' : 'Copia de datos descargada.')
    } catch (error) {
      onToast?.(error.message || 'No se pudieron exportar los datos.')
    } finally {
      setExporting(false)
    }
  }

  async function logoutEverywhere() {
    if (!window.confirm('¿Cerrar sesión en todos los dispositivos? Tendrás que volver a ingresar en cada navegador y PWA instalada.')) return
    setLoggingOut(true)
    try {
      await signOutEverywhere()
      window.location.replace('/')
    } catch (error) {
      onToast?.(error.message || 'No se pudieron cerrar las sesiones.')
      setLoggingOut(false)
    }
  }

  return <>
    <article className="content-panel panel settings-panel full-width security-panel">
      <div className="card-heading"><div><p className="eyebrow">SEGURIDAD</p><h3>Cambiar contraseña</h3><p>Validamos tu contraseña actual antes de guardar una nueva.</p></div></div>
      <form className="security-password-form" onSubmit={submitPassword}>
        <label><span>Contraseña actual</span><input required minLength="6" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => updatePassword('current', event.target.value)} /></label>
        <label><span>Nueva contraseña</span><input required minLength="6" type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => updatePassword('next', event.target.value)} /></label>
        <label><span>Repetir nueva contraseña</span><input required minLength="6" type="password" autoComplete="new-password" value={passwords.repeated} onChange={(event) => updatePassword('repeated', event.target.value)} /></label>
        <button className="primary-button" disabled={changingPassword} type="submit">{changingPassword ? 'Actualizando…' : 'Actualizar contraseña'}</button>
      </form>
      {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
    </article>

    <article className="content-panel panel settings-panel full-width">
      <div className="card-heading"><div><p className="eyebrow">CONTROL DE CUENTA</p><h3>Sesiones y copia de datos</h3><p>Descargá tu información o cerrá el acceso en todos los dispositivos vinculados.</p></div></div>
      <div className="account-action-grid">
        <button className="ghost-button" disabled={exporting} type="button" onClick={exportData}>{exporting ? 'Exportando…' : 'Descargar mis datos'}</button>
        <button className="ghost-button" disabled={loggingOut} type="button" onClick={logoutEverywhere}>{loggingOut ? 'Cerrando sesiones…' : 'Cerrar sesión en todos los dispositivos'}</button>
      </div>
    </article>

    <article className="content-panel panel settings-panel full-width danger-zone">
      <div className="card-heading"><div><p className="eyebrow danger-copy">ZONA DE PELIGRO</p><h3>Eliminar cuenta permanentemente</h3><p>La cuenta y todos sus datos personales serán eliminados. Esta operación no tiene papelera ni recuperación.</p></div><button className="danger-button" type="button" onClick={() => setDeleteOpen(true)}>Eliminar mi cuenta</button></div>
    </article>

    <DeleteAccountModal open={deleteOpen} email={user.email} onClose={() => setDeleteOpen(false)} />
  </>
}
