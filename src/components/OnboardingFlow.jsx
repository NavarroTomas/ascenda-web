import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  ONBOARDING_EXPERIENCE_MODES,
  ONBOARDING_FOCUS_AREAS,
  ONBOARDING_MOTIVATION_STYLES,
  ONBOARDING_OBSTACLES,
  ONBOARDING_PACES,
  ONBOARDING_REMINDER_LEVELS,
  ONBOARDING_VISUAL_THEMES,
  createInitialOnboardingAnswers,
} from '../data/onboardingSteps.js'
import '../styles/onboarding.css'

const STEP_IDS = [
  'intro',
  'focus',
  'obstacles',
  'motivation',
  'experience',
  'visual',
  'pace',
  'reminders',
  'identity',
  'result',
  'register',
]

function ChoiceCard({ item, selected, onClick, compact = false }) {
  return <button
    className={`onboarding-choice ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
    type="button"
    onClick={onClick}
  >
    <span className="onboarding-choice-icon">{item.icon}</span>
    <span className="onboarding-choice-content">
      <strong>{item.label}</strong>
      {item.copy && <small>{item.copy}</small>}
    </span>
    <span className="onboarding-choice-check">✓</span>
  </button>
}

function Progress({ currentStep }) {
  const meaningfulSteps = STEP_IDS.slice(1, -1)
  const activeIndex = Math.max(0, meaningfulSteps.indexOf(currentStep))
  const progress = currentStep === 'intro' ? 0 : Math.round(((activeIndex + 1) / meaningfulSteps.length) * 100)

  return <div className="onboarding-progress-wrap" aria-label={`Progreso del onboarding: ${progress}%`}>
    <div className="onboarding-progress-track"><span style={{ width: `${progress}%` }} /></div>
    <span>{progress}%</span>
  </div>
}

export default function OnboardingFlow({ onCancel }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState(createInitialOnboardingAnswers)
  const [transitioning, setTransitioning] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationCompleted, setRegistrationCompleted] = useState(false)

  const step = STEP_IDS[stepIndex]
  const chosenFocusLabels = useMemo(() => ONBOARDING_FOCUS_AREAS
    .filter((item) => answers.focus_areas.includes(item.id))
    .map((item) => item.label), [answers.focus_areas])
  const chosenMode = ONBOARDING_EXPERIENCE_MODES.find((item) => item.id === answers.experience_mode)
  const chosenTheme = ONBOARDING_VISUAL_THEMES.find((item) => item.id === answers.visual_theme)

  function updateAnswer(key, value) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function toggleMultiple(key, value, maxItems = 3) {
    setAnswers((current) => {
      const values = current[key]
      if (values.includes(value)) return { ...current, [key]: values.filter((item) => item !== value) }
      if (values.length >= maxItems) return current
      return { ...current, [key]: [...values, value] }
    })
  }

  function goTo(nextIndex) {
    if (transitioning) return
    setFeedback('')
    setTransitioning(true)
    window.setTimeout(() => {
      setStepIndex(Math.max(0, Math.min(STEP_IDS.length - 1, nextIndex)))
      window.setTimeout(() => setTransitioning(false), 40)
    }, 260)
  }

  function next() {
    if (step === 'focus' && answers.focus_areas.length === 0) return setFeedback('Elegí al menos un área para personalizar tu sistema.')
    if (step === 'obstacles' && answers.obstacles.length === 0) return setFeedback('Elegí al menos una dificultad habitual.')
    if (step === 'identity' && answers.display_name.trim().length < 2) return setFeedback('Ingresá el nombre con el que querés que te llamemos.')
    goTo(stepIndex + 1)
  }

  function previous() {
    if (stepIndex === 0) return onCancel?.()
    goTo(stepIndex - 1)
  }

  async function register(event) {
    event.preventDefault()
    setFeedback('')
    setSubmitting(true)

    try {
      const displayName = answers.display_name.trim()
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName,
            experience_mode: answers.experience_mode,
            visual_theme: answers.visual_theme,
            onboarding_completed: true,
            onboarding_answers: answers,
          },
        },
      })

      if (error) throw error

      if (data.session) return
      setRegistrationCompleted(true)
    } catch (error) {
      setFeedback(error.message || 'No se pudo crear la cuenta. Revisá los datos e intentá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (registrationCompleted) {
    return <main className="onboarding-screen">
      <section className="onboarding-shell onboarding-success enter-up">
        <div className="onboarding-success-mark">✓</div>
        <p className="eyebrow">CUENTA CREADA</p>
        <h1>Tu sistema está listo, {answers.display_name.trim()}.</h1>
        <p>Tu cuenta fue creada correctamente. Volvé al ingreso para acceder con tu configuración inicial aplicada.</p>
        <button className="primary-button" type="button" onClick={onCancel}>Volver al ingreso</button>
      </section>
    </main>
  }

  return <main className="onboarding-screen">
    <div className="onboarding-atmosphere" aria-hidden="true"><span /><span /><span /></div>
    <section className="onboarding-shell">
      <header className="onboarding-topbar">
        <button className="onboarding-back" type="button" onClick={previous}>{stepIndex === 0 ? 'Cerrar' : '← Volver'}</button>
        <div className="brand onboarding-brand"><div className="brand-mark">A</div><div><strong>ASCENDA</strong><span>Configuración inicial</span></div></div>
        <Progress currentStep={step} />
      </header>

      <div className={`onboarding-stage ${transitioning ? 'is-leaving' : 'is-visible'}`}>
        {step === 'intro' && <div className="onboarding-copy onboarding-copy-centered">
          <p className="eyebrow">TU SISTEMA PERSONAL</p>
          <h1>No necesitás cambiar toda tu vida hoy.</h1>
          <p className="onboarding-lead">Necesitás un sistema que te ayude a avanzar incluso cuando la motivación baja.</p>
          <div className="onboarding-promise"><span>✓</span><div><strong>Las funciones esenciales son gratuitas.</strong><small>Vamos a adaptar la experiencia a tu forma de progresar. Sin paywall sorpresa.</small></div></div>
          <button className="primary-button onboarding-main-action" type="button" onClick={next}>Diseñar mi sistema <span>→</span></button>
        </div>}

        {step === 'focus' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 1 · DIRECCIÓN</p>
          <h1>¿Qué querés mejorar primero?</h1>
          <p className="onboarding-lead">Elegí hasta tres áreas. Esto no limita lo que vas a poder usar después.</p>
          <div className="onboarding-grid two-columns">{ONBOARDING_FOCUS_AREAS.map((item) => <ChoiceCard key={item.id} item={item} selected={answers.focus_areas.includes(item.id)} onClick={() => toggleMultiple('focus_areas', item.id)} />)}</div>
        </div>}

        {step === 'obstacles' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 2 · FRICCIÓN</p>
          <h1>¿Qué suele frenarte?</h1>
          <p className="onboarding-lead">Elegí hasta tres opciones. El sistema va a priorizar herramientas útiles para esos momentos.</p>
          <div className="onboarding-grid two-columns">{ONBOARDING_OBSTACLES.map((item) => <ChoiceCard compact key={item.id} item={item} selected={answers.obstacles.includes(item.id)} onClick={() => toggleMultiple('obstacles', item.id)} />)}</div>
        </div>}

        {step === 'motivation' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 3 · IMPULSO</p>
          <h1>¿Qué tipo de impulso te ayuda a seguir?</h1>
          <p className="onboarding-lead">No todos necesitan la misma experiencia para mantener el ritmo.</p>
          <div className="onboarding-grid three-columns">{ONBOARDING_MOTIVATION_STYLES.map((item) => <ChoiceCard key={item.id} item={item} selected={answers.motivation_style === item.id} onClick={() => updateAnswer('motivation_style', item.id)} />)}</div>
        </div>}

        {step === 'experience' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 4 · EXPERIENCIA</p>
          <h1>Elegí cómo querés vivir el progreso.</h1>
          <p className="onboarding-lead">Podés cambiar este modo cuando quieras desde Configuración.</p>
          <div className="onboarding-grid three-columns">{ONBOARDING_EXPERIENCE_MODES.map((item) => <ChoiceCard key={item.id} item={item} selected={answers.experience_mode === item.id} onClick={() => updateAnswer('experience_mode', item.id)} />)}</div>
        </div>}

        {step === 'visual' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 5 · IDENTIDAD VISUAL</p>
          <h1>¿Qué universo querés abrir cada día?</h1>
          <p className="onboarding-lead">Todos los estilos son originales. Guerrero Astral está disponible gratis desde el inicio.</p>
          <div className="onboarding-grid three-columns">{ONBOARDING_VISUAL_THEMES.map((item) => <ChoiceCard key={item.id} item={item} selected={answers.visual_theme === item.id} onClick={() => updateAnswer('visual_theme', item.id)} />)}</div>
        </div>}

        {step === 'pace' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 6 · RITMO</p>
          <h1>¿Con qué intensidad querés comenzar?</h1>
          <p className="onboarding-lead">La mejor exigencia es la que podés sostener. Esto también se puede ajustar más adelante.</p>
          <div className="onboarding-grid three-columns">{ONBOARDING_PACES.map((item) => <ChoiceCard key={item.id} item={item} selected={answers.pace === item.id} onClick={() => updateAnswer('pace', item.id)} />)}</div>
        </div>}

        {step === 'reminders' && <div className="onboarding-copy">
          <p className="eyebrow">ETAPA 7 · ACOMPAÑAMIENTO</p>
          <h1>¿Cuánto querés que Ascenda te recuerde avanzar?</h1>
          <p className="onboarding-lead">Los avisos se podrán personalizar individualmente desde la aplicación.</p>
          <div className="onboarding-grid three-columns">{ONBOARDING_REMINDER_LEVELS.map((item) => <ChoiceCard key={item.id} item={item} selected={answers.reminder_level === item.id} onClick={() => updateAnswer('reminder_level', item.id)} />)}</div>
        </div>}

        {step === 'identity' && <form className="onboarding-copy onboarding-copy-narrow" onSubmit={(event) => { event.preventDefault(); next() }}>
          <p className="eyebrow">ETAPA 8 · IDENTIDAD</p>
          <h1>¿Cómo querés que te llamemos?</h1>
          <p className="onboarding-lead">Este nombre va a aparecer en tu panel, tu progreso y tus celebraciones.</p>
          <label className="onboarding-name-field"><span>Nombre visible</span><input autoFocus value={answers.display_name} onChange={(event) => updateAnswer('display_name', event.target.value)} placeholder="Escribí tu nombre" autoComplete="name" /></label>
          <button className="primary-button onboarding-main-action" type="submit">Ver mi perfil inicial <span>→</span></button>
        </form>}

        {step === 'result' && <div className="onboarding-copy onboarding-result">
          <p className="eyebrow">PERFIL INICIAL GENERADO</p>
          <h1>{answers.display_name.trim()}, tu sistema ya tiene una dirección.</h1>
          <p className="onboarding-lead">No necesitás completar todo desde el primer día. La aplicación va a ayudarte a convertir intención en progreso medible.</p>
          <div className="onboarding-result-grid">
            <article><span>Áreas prioritarias</span><strong>{chosenFocusLabels.length ? chosenFocusLabels.join(' · ') : 'A definir desde tu panel'}</strong></article>
            <article><span>Experiencia</span><strong>{chosenMode?.label}</strong></article>
            <article><span>Estilo visual</span><strong>{chosenTheme?.label}</strong></article>
            <article><span>Primer enfoque</span><strong>Pequeños pasos sostenibles</strong></article>
          </div>
          <div className="onboarding-free-banner"><strong>Tu acceso comienza gratis.</strong><span>Agenda, tareas, hábitos, rutinas, objetivos y progreso básico estarán disponibles sin suscripción.</span></div>
          <button className="primary-button onboarding-main-action" type="button" onClick={next}>Crear mi cuenta gratuita <span>→</span></button>
        </div>}

        {step === 'register' && <form className="onboarding-copy onboarding-copy-narrow" onSubmit={register}>
          <p className="eyebrow">ÚLTIMO PASO</p>
          <h1>Guardá tu sistema personal.</h1>
          <p className="onboarding-lead">Creá tu cuenta gratuita para conservar la configuración y sincronizar tu progreso.</p>
          <label className="onboarding-name-field"><span>Correo electrónico</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" autoComplete="email" /></label>
          <label className="onboarding-name-field"><span>Contraseña</span><input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" /></label>
          <div className="onboarding-free-mini"><span>✓</span><p><strong>Sin tarjeta.</strong> Las herramientas esenciales permanecerán gratuitas.</p></div>
          <button className="primary-button onboarding-main-action" disabled={submitting} type="submit">{submitting ? 'Creando cuenta…' : 'Entrar a Ascenda'} <span>→</span></button>
        </form>}
      </div>

      {feedback && <p className="onboarding-feedback">{feedback}</p>}

      {stepIndex > 0 && stepIndex < STEP_IDS.length - 3 && <footer className="onboarding-footer">
        <button className="onboarding-skip" type="button" onClick={() => goTo(STEP_IDS.indexOf('identity'))}>Configurar lo esencial después</button>
        <button className="primary-button" type="button" onClick={next}>Continuar <span>→</span></button>
      </footer>}
    </section>
  </main>
}
