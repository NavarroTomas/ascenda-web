import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { setRecoveredPassword } from '../lib/accountManagement.js'

export default function ResetPasswordScreen() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [repeated, setRepeated] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    let invalidTimer = null

    function handleSession(session) {
      if (!active) return
      if (session) {
        if (invalidTimer) window.clearTimeout(invalidTimer)
        setReady(true)
        setFeedback({ type: '', message: '' })
        return
      }

      if (invalidTimer) window.clearTimeout(invalidTimer)
      invalidTimer = window.setTimeout(() => {
        if (!active) return
        setReady(false)
        setFeedback({ type: 'error', message: 'El enlace de recuperación no es válido o ya venció. Solicitá uno nuevo desde el ingreso.' })
      }, 1200)
    }

    supabase.auth.getSession().then(({ data }) => handleSession(data.session))
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session))

    return () => {
      active = false
      if (invalidTimer) window.clearTimeout(invalidTimer)
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    if (password.length < 6) return setFeedback({ type: 'error', message: 'La contraseña nueva debe tener al menos 6 caracteres.' })
    if (password !== repeated) return setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' })
    setSaving(true)
    try {
      await setRecoveredPassword(password)
      setFeedback({ type: 'success', message: 'Contraseña actualizada. Ya podés volver al ingreso.' })
      window.setTimeout(async () => {
        await supabase.auth.signOut({ scope: 'local' })
        window.location.replace('/')
      }, 1400)
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'No se pudo guardar la contraseña.' })
      setSaving(false)
    }
  }

  return <main className="centered-screen auth-background">
    <form className="reset-password-card panel enter-up" onSubmit={submit}>
      <div className="brand large-brand"><div className="brand-mark">A</div><div><strong>ASCENDA</strong><span>Recuperación de acceso</span></div></div>
      <div><p className="eyebrow">SEGURIDAD</p><h1>Creá una contraseña nueva</h1><p className="muted-copy">Usá al menos seis caracteres y no reutilices una contraseña expuesta en otros servicios.</p></div>
      <label><span>Nueva contraseña</span><input required minLength="6" disabled={!ready || saving} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label><span>Repetir nueva contraseña</span><input required minLength="6" disabled={!ready || saving} type="password" autoComplete="new-password" value={repeated} onChange={(event) => setRepeated(event.target.value)} /></label>
      {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
      <button className="primary-button wide" disabled={!ready || saving} type="submit">{saving ? 'Actualizando…' : 'Guardar contraseña nueva'}</button>
      <button className="ghost-button" type="button" onClick={() => window.location.replace('/')}>Volver al ingreso</button>
    </form>
  </main>
}
