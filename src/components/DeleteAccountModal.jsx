import { useState } from 'react'
import { permanentlyDeleteAccount } from '../lib/accountManagement.js'

const REQUIRED_PHRASE = 'ELIMINAR MI CUENTA'

export default function DeleteAccountModal({ open, email, onClose }) {
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [feedback, setFeedback] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (!open) return null
  const canDelete = password.length >= 6 && phrase === REQUIRED_PHRASE && !deleting

  async function submit(event) {
    event.preventDefault()
    if (!canDelete) return
    setDeleting(true)
    setFeedback('')
    try {
      await permanentlyDeleteAccount({ email, password })
      window.location.replace('/')
    } catch (error) {
      setFeedback(error.message || 'No se pudo eliminar la cuenta.')
      setDeleting(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !deleting && onClose()}>
    <form className="editor-modal compact-modal panel enter-up danger-modal" onSubmit={submit}>
      <div className="modal-heading"><div><p className="eyebrow danger-copy">ACCIÓN IRREVERSIBLE</p><h2>Eliminar cuenta permanentemente</h2></div><button className="icon-button" type="button" disabled={deleting} onClick={onClose}>×</button></div>
      <p className="muted-copy">Se eliminarán tu cuenta, progreso, tareas, hábitos, notas, recordatorios y suscripciones push. No habrá recuperación posterior.</p>
      <label><span>Contraseña actual</span><input required minLength="6" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label><span>Escribí exactamente: <b>{REQUIRED_PHRASE}</b></span><input required value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder={REQUIRED_PHRASE} /></label>
      {feedback && <p className="form-feedback error">{feedback}</p>}
      <div className="modal-actions"><button className="ghost-button" type="button" disabled={deleting} onClick={onClose}>Cancelar</button><button className="danger-button" disabled={!canDelete} type="submit">{deleting ? 'Eliminando cuenta…' : 'Eliminar definitivamente'}</button></div>
    </form>
  </div>
}
