import { useState } from 'react'
import { sendPasswordResetEmail } from '../lib/accountManagement.js'

export default function ForgotPasswordModal({ open, initialEmail = '', onClose }) {
  const [email, setEmail] = useState(initialEmail)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [sending, setSending] = useState(false)

  if (!open) return null

  async function submit(event) {
    event.preventDefault()
    setSending(true)
    setFeedback({ type: '', message: '' })
    try {
      await sendPasswordResetEmail(email)
      setFeedback({ type: 'success', message: 'Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'No se pudo enviar el enlace de recuperación.' })
    } finally {
      setSending(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="editor-modal compact-modal panel enter-up" onSubmit={submit}>
      <div className="modal-heading"><div><p className="eyebrow">RECUPERACIÓN DE ACCESO</p><h2>Restablecer contraseña</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
      <p className="muted-copy">Ingresá tu correo. Te enviaremos un enlace para definir una contraseña nueva.</p>
      <label><span>Correo electrónico</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
      {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
      <div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={sending}>{sending ? 'Enviando…' : 'Enviar enlace'}</button></div>
    </form>
  </div>
}
