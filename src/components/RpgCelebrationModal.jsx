import { useEffect } from 'react'

const PARTICLES = Array.from({ length: 24 }, (_, index) => index)

const CONTENT = {
  task: { eyebrow: 'MISIÓN COMPLETADA', button: 'Continuar aventura' },
  routine: { eyebrow: 'RUTINA DOMINADA', button: 'Reclamar recompensa' },
  milestone: { eyebrow: 'HITO DESBLOQUEADO', button: 'Seguir avanzando' },
  level: { eyebrow: 'ASCENSO DE NIVEL', button: 'Aceptar ascenso' },
  title: { eyebrow: 'NUEVO TÍTULO', button: 'Equipar título' },
  rank: { eyebrow: 'ASCENSO DE TEMPORADA', button: 'Aceptar rango' },
}

function getAssets(visualTheme, type) {
  if (visualTheme === 'astral') {
    return {
      frame: '/astral/astral-frame.svg',
      image: type === 'task' ? '/astral/astral-complete.svg' : '/astral/astral-crest.svg',
    }
  }
  return {
    frame: '/rpg/level-frame.svg',
    image: type === 'task' ? '/rpg/task-complete.svg' : '/rpg/rune-crest.svg',
  }
}

export default function RpgCelebrationModal({ celebration, onClose, visualTheme = 'medieval', intenseEffects = true }) {
  useEffect(() => {
    if (!celebration || ['level', 'title', 'rank'].includes(celebration.type)) return undefined
    const timer = window.setTimeout(onClose, 4300)
    return () => window.clearTimeout(timer)
  }, [celebration, onClose])

  if (!celebration) return null
  const config = CONTENT[celebration.type] || CONTENT.task
  const assets = getAssets(visualTheme, celebration.type)
  const elevated = ['level', 'title', 'rank'].includes(celebration.type)

  return <div className={`rpg-celebration-backdrop ${visualTheme === 'astral' ? 'astral-celebration' : ''}`} role="presentation" onMouseDown={onClose}>
    <section className={`rpg-celebration-modal ${elevated ? 'level-up' : ''} ${celebration.type === 'rank' ? 'rank-up' : ''}`} role="dialog" aria-modal="true" aria-label={config.eyebrow} onMouseDown={(event) => event.stopPropagation()}>
      <img className="rpg-celebration-frame" src={assets.frame} alt="" aria-hidden="true" />
      {intenseEffects && <div className="rpg-particles" aria-hidden="true">{PARTICLES.map((particle) => <i style={{ '--particle-index': particle }} key={particle} />)}</div>}
      <img className="rpg-celebration-image" src={assets.image} alt="" aria-hidden="true" />
      <p className="eyebrow">{config.eyebrow}</p>
      {celebration.type === 'level' && <strong className="rpg-level-number">NIVEL {celebration.level}</strong>}
      {celebration.type === 'rank' && <strong className="rpg-level-number">{celebration.rank}</strong>}
      {celebration.type === 'title' && <strong className="rpg-level-number">{celebration.unlockedTitle}</strong>}
      <h2>{celebration.title}</h2>
      <p>{celebration.subtitle}</p>
      <div className="rpg-reward-row">
        {Number.isFinite(celebration.xp) && <span className="rpg-xp-reward">+{celebration.xp} XP</span>}
        {Number.isFinite(celebration.seasonPoints) && celebration.seasonPoints > 0 && <span className="rpg-xp-reward season-reward">+{celebration.seasonPoints} PT</span>}
      </div>
      <button className="rpg-claim-button" type="button" onClick={onClose}>{config.button}</button>
    </section>
  </div>
}
