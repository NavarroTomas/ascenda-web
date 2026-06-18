import { useEffect, useMemo, useState } from 'react'

const PRESETS = [
  { label: '25 / 5', minutes: 25 },
  { label: '50 / 10', minutes: 50 },
  { label: 'Libre 15', minutes: 15 },
]

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export default function FocusTimerPanel({ focusSessions = [], onSaveFocusSession }) {
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [label, setLabel] = useState('Trabajo profundo')
  const [startedAt, setStartedAt] = useState(null)

  useEffect(() => {
    setRemaining(minutes * 60)
    setRunning(false)
  }, [minutes])

  useEffect(() => {
    if (!running) return undefined
    const timer = setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000)
    return () => clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (running && remaining === 0) setRunning(false)
  }, [remaining, running])

  const totalToday = useMemo(() => focusSessions.reduce((sum, session) => sum + Number(session.duration_minutes || 0), 0), [focusSessions])

  function start() {
    setStartedAt(new Date().toISOString())
    setRunning(true)
  }

  async function finish() {
    const spent = Math.max(1, Math.round((minutes * 60 - remaining) / 60))
    await onSaveFocusSession?.({
      title: label.trim() || 'Bloque Focus',
      duration_minutes: spent,
      started_at: startedAt || new Date().toISOString(),
      ended_at: new Date().toISOString(),
      notes: null,
    })
    setRunning(false)
    setRemaining(minutes * 60)
    setStartedAt(null)
  }

  return (
    <article className="content-panel panel focus-timer-panel">
      <div className="card-heading">
        <div>
          <p className="eyebrow">TEMPORIZADOR FOCUS</p>
          <h2>{formatSeconds(remaining)}</h2>
          <p>Registrá bloques reales de concentración.</p>
        </div>
        <span className="positive-pill">Hoy: {totalToday} min</span>
      </div>
      <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre del bloque" />
      <div className="focus-preset-row">
        {PRESETS.map((preset) => <button className={minutes === preset.minutes ? 'selected' : ''} type="button" onClick={() => setMinutes(preset.minutes)} key={preset.label}>{preset.label}</button>)}
      </div>
      <div className="row-actions">
        <button className="primary-button" type="button" onClick={running ? () => setRunning(false) : start}>{running ? 'Pausar' : 'Iniciar'}</button>
        <button className="ghost-button" type="button" onClick={() => { setRunning(false); setRemaining(minutes * 60) }}>Reiniciar</button>
        <button className="ghost-button" type="button" onClick={finish} disabled={remaining === minutes * 60}>Guardar bloque</button>
      </div>
    </article>
  )
}
