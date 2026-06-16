import { useEffect, useMemo, useState } from 'react'
import { getGreeting } from '../lib/date.js'
import { getDailyDashboardSummary } from '../lib/v9Analytics.js'

function firstName(name) {
  return String(name || 'Usuario').trim().split(/\s+/)[0] || 'Usuario'
}

function buildSlides({ displayName, summary, routines, reminders, events }) {
  const name = firstName(displayName)
  const pendingTasks = Math.max((summary?.total || 0) - (summary?.done || 0), 0)
  const pendingHabit = summary?.pendingHabits?.[0]?.title
  const hasRoutineToday = Array.isArray(summary?.dueRoutines) ? summary.dueRoutines.length > 0 : Array.isArray(routines) && routines.length > 0
  const upcomingCount = (Array.isArray(reminders) ? reminders.length : 0) + (Array.isArray(events) ? events.length : 0)

  const slides = [
    {
      eyebrow: 'ASCENDA',
      text: `${getGreeting()}, ${name}.`,
      subtext: 'Antes de entrar, ordenemos tu día.',
    },
    {
      eyebrow: 'Chequeo rápido',
      text: '¿Cómo estás hoy?',
      subtext: 'No hace falta responder perfecto. Solo empezar con claridad.',
    },
    hasRoutineToday
      ? {
          eyebrow: 'Rutina',
          text: '¿Completaste tu rutina hoy?',
          subtext: 'Un paso chico mantiene viva la racha.',
        }
      : {
          eyebrow: 'Rutina',
          text: 'Hoy podés elegir una rutina simple.',
          subtext: 'Mañana, tarde o noche. Lo importante es repetir.',
        },
    pendingHabit
      ? {
          eyebrow: 'Hábito clave',
          text: `Tu hábito pendiente es: ${pendingHabit}.`,
          subtext: 'Marcá una sesión cuando lo completes.',
        }
      : {
          eyebrow: 'Hábitos',
          text: 'Tus hábitos no tienen bloqueos urgentes.',
          subtext: 'Buen momento para sostener el ritmo.',
        },
    pendingTasks
      ? {
          eyebrow: 'Prioridad',
          text: `Tenés ${pendingTasks} acciones pendientes.`,
          subtext: 'Elegí una prioridad y avanzá de a una.',
        }
      : {
          eyebrow: 'Prioridad',
          text: 'No tenés acciones urgentes cargadas.',
          subtext: 'Podés planificar algo simple para hoy.',
        },
    upcomingCount
      ? {
          eyebrow: 'Agenda',
          text: `Hay ${upcomingCount} aviso${upcomingCount === 1 ? '' : 's'} para revisar.`,
          subtext: 'Entrá a Mi día para ver el detalle.',
        }
      : {
          eyebrow: 'Agenda',
          text: 'Tu agenda está tranquila por ahora.',
          subtext: 'Usá este espacio para decidir el foco del día.',
        },
    {
      eyebrow: 'Listo',
      text: 'Entramos a tu día.',
      subtext: 'Planificá, completá y seguí sumando progreso.',
      final: true,
    },
  ]

  return slides
}

export default function DailyWelcomeModal({
  open,
  displayName,
  today,
  settings,
  tasks,
  habits,
  habitLogs,
  routines,
  routineLogs,
  events,
  reminders,
  onClose,
}) {
  const [step, setStep] = useState(0)
  const reducedMotion = Boolean(settings?.reduce_motion)

  const summary = useMemo(
    () => getDailyDashboardSummary({ tasks, habits, habitLogs, routines, routineLogs, events, reminders, today }),
    [tasks, habits, habitLogs, routines, routineLogs, events, reminders, today]
  )

  const slides = useMemo(
    () => buildSlides({ displayName, summary, routines, reminders, events }),
    [displayName, summary, routines, reminders, events]
  )

  const current = slides[Math.min(step, slides.length - 1)]

  useEffect(() => {
    if (!open) {
      setStep(0)
      return undefined
    }

    if (reducedMotion) return undefined

    const textLength = current?.text?.length || 20
    const duration = Math.min(Math.max(textLength * 44 + 1650, 2600), 5200)

    if (current?.final) return undefined

    const timeout = window.setTimeout(() => {
      setStep((value) => Math.min(value + 1, slides.length - 1))
    }, duration)

    return () => window.clearTimeout(timeout)
  }, [open, step, current, slides.length, reducedMotion])

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  if (!open) return null

  const goNext = () => {
    if (step >= slides.length - 1) {
      onClose?.()
      return
    }
    setStep((value) => Math.min(value + 1, slides.length - 1))
  }

  return (
    <div className="daily-welcome-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenida diaria">
      <section className={`daily-welcome-screen cinematic ${reducedMotion ? 'reduced-motion' : ''}`}>
        <button className="daily-welcome-skip" type="button" onClick={onClose}>
          Saltar
        </button>

        <div className="daily-welcome-stage" key={`${step}-${current.text}`}>
          <p className="daily-welcome-eyebrow">{current.eyebrow}</p>
          <h1 className="daily-welcome-typeline" aria-label={current.text}>
            {current.text.split('').map((letter, index) => (
              <span
                className={letter === ' ' ? 'space' : undefined}
                style={{ '--letter-delay': `${index * 0.035}s` }}
                aria-hidden="true"
                key={`${letter}-${index}`}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            ))}
          </h1>
          <p className="daily-welcome-subtext">{current.subtext}</p>
        </div>

        <div className="daily-welcome-footer">
          <div className="daily-welcome-dots" aria-label={`Paso ${step + 1} de ${slides.length}`}>
            {slides.map((slide, index) => (
              <button
                type="button"
                className={index === step ? 'active' : ''}
                aria-label={`Ir al mensaje ${index + 1}`}
                onClick={() => setStep(index)}
                key={`${slide.eyebrow}-${index}`}
              />
            ))}
          </div>
          <button className="daily-welcome-next" type="button" onClick={goNext}>
            {current.final ? 'Entrar a mi día' : 'Continuar'}
          </button>
        </div>
      </section>
    </div>
  )
}
