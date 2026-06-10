import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import OnboardingFlow from './OnboardingFlow.jsx'

export default function AuthScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback({ type: '', message: '' })

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'No se pudo iniciar sesión.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (showOnboarding) return <OnboardingFlow onCancel={() => setShowOnboarding(false)} />

  return <main className="centered-screen auth-background">
    <section className="auth-shell panel enter-up">
      <div className="auth-intro">
        <div className="brand large-brand"><div className="brand-mark">A</div><div><strong>ASCENDA</strong><span>Personal System</span></div></div>
        <p className="eyebrow">DESARROLLO PERSONAL</p>
        <h1>Convertí tus objetivos en progreso visible.</h1>
        <p>Organizá tu vida con una herramienta gratuita, flexible y adaptable a tu forma de avanzar.</p>
        <div className="auth-feature-list">
          <span>✓ Acceso gratuito a funciones esenciales</span>
          <span>✓ Modos simple, estándar y RPG</span>
          <span>✓ Datos privados por usuario</span>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleLogin}>
        <div><p className="eyebrow">BIENVENIDO DE NUEVO</p><h2>Ingresá a tu sistema</h2></div>
        <label><span>Correo electrónico</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" autoComplete="email" /></label>
        <label><span>Contraseña</span><input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="current-password" /></label>
        {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
        <button className="primary-button wide" type="submit" disabled={submitting}>{submitting ? 'Ingresando…' : 'Ingresar'}</button>
        <div className="auth-register-callout">
          <span>¿Todavía no tenés una cuenta?</span>
          <button type="button" onClick={() => setShowOnboarding(true)}>Comenzar gratis <b>→</b></button>
        </div>
      </form>
    </section>
  </main>
}
