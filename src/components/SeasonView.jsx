import { formatShortDate } from '../lib/date.js'
import { getRankDisplay, SEASON_RANK_DIVISIONS } from '../data/seasonRanks.js'

function daysUntil(dateValue) {
  if (!dateValue) return 0
  const end = new Date(`${dateValue}T23:59:59`)
  const diff = end.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function SeasonView({ activeSeason, seasonMetrics, seasonHistory, settings }) {
  const visualTheme = settings.visual_theme || 'standard'
  const currentRank = seasonMetrics.rank
  const history = seasonHistory || []

  return <section className="view-stack enter-up">
    <header className="section-heading">
      <div>
        <p className="eyebrow">PROGRESIÓN COMPETITIVA</p>
        <h2>Temporada</h2>
        <p>Los puntos se reinician al cerrar cada ciclo de doce semanas. Tu nivel general y tus títulos permanentes se conservan.</p>
      </div>
    </header>

    <section className="season-hero panel">
      <div className="season-hero-copy">
        <p className="eyebrow">{activeSeason?.name?.toUpperCase() || 'TEMPORADA ACTIVA'}</p>
        <h2>{currentRank.displayName}</h2>
        <p>{seasonMetrics.points} puntos de temporada. Cada acción suma progreso, incluso los pasos pequeños.</p>
        <div className="progress-track season-progress-track"><i style={{ width: `${currentRank.progress}%` }} /></div>
        <small>{currentRank.next ? `${currentRank.pointsToNext} puntos para ${getRankDisplay(currentRank.next, visualTheme)}` : 'Alcanzaste la división máxima disponible.'}</small>
      </div>
      <div className="season-hero-stats">
        <div><span>CIERRE</span><strong>{activeSeason?.ends_on ? formatShortDate(activeSeason.ends_on) : '—'}</strong></div>
        <div><span>DÍAS RESTANTES</span><strong>{daysUntil(activeSeason?.ends_on)}</strong></div>
        <div><span>MEJOR RANGO</span><strong>{seasonMetrics.bestRankLabel}</strong></div>
      </div>
    </section>

    <article className="content-panel panel">
      <div className="card-heading"><div><p className="eyebrow">ESCALERA DE RANGOS</p><h2>24 divisiones</h2><p>Ocho rangos con tres subdivisiones cada uno para sostener avances frecuentes.</p></div></div>
      <div className="rank-ladder">
        {SEASON_RANK_DIVISIONS.map((rank) => {
          const completed = currentRank.order > rank.order
          const active = currentRank.order === rank.order
          return <div className={`rank-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}`} key={`${rank.key}-${rank.division}`}>
            <i style={{ background: rank.color }} />
            <div><strong>{getRankDisplay(rank, visualTheme)}</strong><small>{rank.minPoints} puntos</small></div>
            <span>{completed ? '✓' : active ? 'ACTUAL' : '○'}</span>
          </div>
        })}
      </div>
    </article>

    <article className="content-panel panel">
      <div className="card-heading"><div><p className="eyebrow">HISTORIAL</p><h2>Temporadas anteriores</h2></div></div>
      {history.length ? <div className="season-history-list">{history.map((item) => <div className="season-history-row" key={item.id}><div><strong>{item.season_name}</strong><small>{formatShortDate(item.starts_on)} — {formatShortDate(item.ends_on)}</small></div><div><span>{item.final_points} puntos</span><b>{item.final_rank_label}</b></div></div>)}</div> : <p className="muted-copy">Todavía no finalizaste ninguna temporada.</p>}
    </article>
  </section>
}
