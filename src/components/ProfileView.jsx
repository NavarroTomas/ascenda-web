import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { calculateLevel } from '../lib/xp.js'
import { getTodayISO } from '../lib/date.js'
import {
  ACHIEVEMENT_CATALOG,
  ATTRIBUTE_CATALOG,
  COSMETIC_CATALOG,
  DAILY_MISSION_TEMPLATES,
  DEFAULT_AVATARS,
} from '../data/progressionCatalog.js'
import {
  achievementProgress,
  attributeLevelFromXp,
  buildInitialPlan,
  buildProgressionMetrics,
  calculateAttributeTotals,
  createMissionRows,
  enrichProgressionMetrics,
  getWeekStartISO,
  missionProgress,
} from '../lib/progression.js'
import '../styles/v8-progress.css'

function formatError(error) {
  return [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(' · ') || 'Error desconocido.'
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value || 0))) }

function ProgressBar({ value = 0 }) {
  return <div className="v8-progress-track"><i style={{ width: `${clamp(value, 0, 100)}%` }} /></div>
}

function Avatar({ src, label, frame = 'frame-default', size = 'large' }) {
  return <span className={`v8-avatar ${size} ${frame}`}><img src={src || '/avatars/avatar-focus.svg'} alt={label || 'Avatar del usuario'} /></span>
}

function MissionCard({ mission, onClaim, onReplace }) {
  const progress = clamp(mission.current_value, 0, mission.target_value)
  const percentage = Math.round((progress / Math.max(1, mission.target_value)) * 100)
  return <article className={`v8-mission-card ${mission.completed ? 'completed' : ''}`}>
    <div className="v8-card-heading"><div><p className="eyebrow">{mission.period_type === 'daily' ? 'MISIÓN DIARIA' : 'MISIÓN SEMANAL'}</p><h3>{mission.title}</h3></div><span>{mission.completed ? '✓' : `${progress}/${mission.target_value}`}</span></div>
    <p>{mission.description}</p>
    <ProgressBar value={percentage} />
    <footer><small>+{mission.reward_xp} XP · +{mission.reward_pt} PT</small>{mission.completed && !mission.claimed ? <button className="mini-action" type="button" onClick={() => onClaim(mission)}>Reclamar</button> : mission.period_type === 'daily' && !mission.completed && mission.replaced_count < 1 ? <button className="mini-action" type="button" onClick={() => onReplace(mission)}>Cambiar</button> : <span className="v8-claimed">{mission.claimed ? 'Reclamada' : ''}</span>}</footer>
  </article>
}

export default function ProfileView({ session, settings: dashboardSettings, onProfileChanged }) {
  const user = session.user
  const today = getTodayISO()
  const weekStart = getWeekStartISO()
  const [tab, setTab] = useState('perfil')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [profile, setProfile] = useState({ display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuario', avatar_url: '/avatars/avatar-focus.svg', equipped_frame: 'frame-default' })
  const [settings, setSettings] = useState({ daily_mission_count: 3, ...dashboardSettings })
  const [source, setSource] = useState({ tasks: [], habits: [], habitLogs: [], routines: [], routineLogs: [], goals: [], dailyNotes: [], notes: [], xpEvents: [] })
  const [attributes, setAttributes] = useState([])
  const [missions, setMissions] = useState([])
  const [achievements, setAchievements] = useState([])
  const [cosmetics, setCosmetics] = useState([{ cosmetic_code: 'frame-default' }])
  const [onboarding, setOnboarding] = useState({ answers: {} })
  const [initialPlan, setInitialPlan] = useState(null)
  const [uploading, setUploading] = useState(false)
  const initialSyncDone = useRef(false)

  const metrics = useMemo(() => enrichProgressionMetrics(buildProgressionMetrics({ ...source, today }), source.goals), [source, today])
  const totalXp = useMemo(() => source.xpEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0), [source.xpEvents])
  const levelInfo = useMemo(() => calculateLevel(totalXp), [totalXp])
  const unlockedCodes = useMemo(() => new Set(achievements.filter((item) => item.unlocked).map((item) => item.achievement_code)), [achievements])
  const cosmeticCodes = useMemo(() => new Set(['frame-default', ...cosmetics.map((item) => item.cosmetic_code)]), [cosmetics])
  const plan = useMemo(() => buildInitialPlan(onboarding?.answers || {}), [onboarding])

  const loadData = useCallback(async () => {
    setLoading(true)
    const results = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('tasks').select('*'),
      supabase.from('habits').select('*'),
      supabase.from('habit_logs').select('*'),
      supabase.from('routines').select('*'),
      supabase.from('routine_logs').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('daily_notes').select('*'),
      supabase.from('notes').select('*'),
      supabase.from('xp_events').select('*'),
      supabase.from('user_attributes').select('*'),
      supabase.from('user_missions').select('*').gte('period_key', weekStart).order('period_type').order('created_at'),
      supabase.from('user_achievements').select('*'),
      supabase.from('user_cosmetics').select('*'),
      supabase.from('user_onboarding').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_initial_plans').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    const firstError = results.find((result) => result.error)?.error
    if (firstError) setFeedback(`Ejecutá la migración V8: ${formatError(firstError)}`)
    setProfile((current) => ({ ...current, ...(results[0].data || {}) }))
    setSettings((current) => ({ ...current, ...(results[1].data || {}) }))
    setSource({ tasks: results[2].data || [], habits: results[3].data || [], habitLogs: results[4].data || [], routines: results[5].data || [], routineLogs: results[6].data || [], goals: results[7].data || [], dailyNotes: results[8].data || [], notes: results[9].data || [], xpEvents: results[10].data || [] })
    setAttributes(results[11].data || [])
    setMissions(results[12].data || [])
    setAchievements(results[13].data || [])
    setCosmetics([{ cosmetic_code: 'frame-default' }, ...(results[14].data || [])])
    setOnboarding(results[15].data || { answers: {} })
    setInitialPlan(results[16].data || null)
    setLoading(false)
  }, [user.id, weekStart])

  useEffect(() => { loadData() }, [loadData])

  const syncProgression = useCallback(async () => {
    if (loading) return
    const totals = calculateAttributeTotals(source)
    const attributeRows = Object.entries(totals).map(([attribute_code, xp]) => ({ user_id: user.id, attribute_code, xp }))
    await supabase.from('user_attributes').upsert(attributeRows, { onConflict: 'user_id,attribute_code' })

    const missionRows = createMissionRows({ userId: user.id, dailyCount: settings.daily_mission_count, today, weekStart })
    await supabase.from('user_missions').upsert(missionRows, { onConflict: 'user_id,period_type,period_key,mission_code', ignoreDuplicates: true })
    const { data: currentMissions = [] } = await supabase.from('user_missions').select('*').gte('period_key', weekStart).order('period_type').order('created_at')
    for (const mission of currentMissions) {
      const current_value = missionProgress(mission, metrics)
      const completed = current_value >= Number(mission.target_value)
      await supabase.from('user_missions').update({ current_value, completed, completed_at: completed ? (mission.completed_at || new Date().toISOString()) : null }).eq('id', mission.id)
    }

    const achievementRows = []
    for (const achievement of ACHIEVEMENT_CATALOG) {
      const progress = achievementProgress(achievement, metrics)
      const unlocked = progress >= achievement.target
      achievementRows.push({ user_id: user.id, achievement_code: achievement.id, progress, unlocked, unlocked_at: unlocked ? new Date().toISOString() : null })
      if (unlocked) {
        await supabase.from('xp_events').upsert({ user_id: user.id, source_type: 'achievement', source_key: achievement.id, reason: `Logro desbloqueado: ${achievement.label}`, base_amount: achievement.rewardXp, multiplier: 1, amount: achievement.rewardXp, occurred_on: today }, { onConflict: 'user_id,source_type,source_key', ignoreDuplicates: true })
        if (achievement.cosmeticId) await supabase.from('user_cosmetics').upsert({ user_id: user.id, cosmetic_code: achievement.cosmeticId, source: `achievement:${achievement.id}` }, { onConflict: 'user_id,cosmetic_code', ignoreDuplicates: true })
      }
    }
    await supabase.from('user_achievements').upsert(achievementRows, { onConflict: 'user_id,achievement_code' })
    await loadData()
  }, [loading, loadData, metrics, settings.daily_mission_count, source, today, user.id, weekStart])

  useEffect(() => {
    if (loading || initialSyncDone.current) return undefined
    initialSyncDone.current = true
    const timer = window.setTimeout(() => { syncProgression() }, 250)
    return () => window.clearTimeout(timer)
  }, [loading, syncProgression])

  async function updateProfile(patch) {
    const { data, error } = await supabase.from('profiles').upsert({ ...profile, ...patch, id: user.id }, { onConflict: 'id' }).select().single()
    if (error) return setFeedback(formatError(error))
    setProfile(data)
    onProfileChanged?.(data)
  }

  async function chooseAvatar(src) { await updateProfile({ avatar_url: src }) }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setFeedback('Seleccioná una imagen válida.')
    if (file.size > 3 * 1024 * 1024) return setFeedback('La imagen debe pesar menos de 3 MB.')
    setUploading(true)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${user.id}/avatar-${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setUploading(false); return setFeedback(formatError(error)) }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfile({ avatar_url: data.publicUrl })
    setUploading(false)
    setFeedback('Avatar actualizado.')
  }

  async function equipFrame(frameId) {
    if (!cosmeticCodes.has(frameId)) return
    await updateProfile({ equipped_frame: frameId })
  }

  async function changeMissionCount(event) {
    const daily_mission_count = Number(event.target.value)
    const { data, error } = await supabase.from('user_settings').upsert({ ...settings, user_id: user.id, daily_mission_count }, { onConflict: 'user_id' }).select().single()
    if (error) return setFeedback(formatError(error))
    setSettings(data)
    setFeedback('Cantidad diaria actualizada. El ajuste se aplica al generar el siguiente conjunto de misiones.')
  }

  async function claimMission(mission) {
    if (!mission.completed || mission.claimed) return
    await supabase.from('xp_events').upsert({ user_id: user.id, source_type: 'mission', source_key: mission.id, reason: `Misión completada: ${mission.title}`, base_amount: mission.reward_xp, multiplier: 1, amount: mission.reward_xp, occurred_on: today }, { onConflict: 'user_id,source_type,source_key', ignoreDuplicates: true })
    const { data: season } = await supabase.from('seasons').select('*').eq('active', true).maybeSingle()
    if (season) {
      await supabase.from('season_point_events').upsert({ user_id: user.id, season_id: season.id, source_type: 'mission', source_key: mission.id, reason: `Misión completada: ${mission.title}`, amount: mission.reward_pt }, { onConflict: 'user_id,season_id,source_type,source_key', ignoreDuplicates: true })
      await supabase.rpc('sync_active_season_progress')
    }
    await supabase.from('user_missions').update({ claimed: true, claimed_at: new Date().toISOString() }).eq('id', mission.id)
    setFeedback(`Misión reclamada: +${mission.reward_xp} XP · +${mission.reward_pt} PT`)
    await loadData()
  }

  async function replaceMission(mission) {
    const activeCodes = new Set(missions.filter((item) => item.period_type === 'daily' && item.period_key === today).map((item) => item.mission_code))
    const replacement = DAILY_MISSION_TEMPLATES.find((item) => !activeCodes.has(item.id))
    if (!replacement) return setFeedback('No quedan misiones alternativas disponibles hoy.')
    await supabase.from('user_missions').delete().eq('id', mission.id)
    await supabase.from('user_missions').insert({ user_id: user.id, mission_code: replacement.id, period_type: 'daily', period_key: today, title: replacement.label, description: replacement.copy, metric_key: replacement.metric, target_value: replacement.target, reward_xp: replacement.rewardXp, reward_pt: replacement.rewardPt, replaced_count: 1 })
    setFeedback('Misión diaria reemplazada.')
    await loadData()
  }

  async function activateInitialPlan() {
    if (initialPlan?.activated) return
    const { data: habits = [], error: habitsError } = await supabase.from('habits').insert(plan.habits.map((habit) => ({ ...habit, user_id: user.id, habit_type: 'binary', active_days: [0,1,2,3,4,5,6], active: true }))).select()
    if (habitsError) return setFeedback(formatError(habitsError))
    const { data: routine, error: routineError } = await supabase.from('routines').insert({ user_id: user.id, title: plan.routine.title, category: plan.routine.category, routine_type: 'structured', scheduled_days: [1,2,3,4,5], xp_bonus: plan.routine.xp_bonus, active: true }).select().single()
    if (routineError) return setFeedback(formatError(routineError))
    await supabase.from('routine_steps').insert(plan.routine.steps.map((step, position) => ({ ...step, position, routine_id: routine.id, user_id: user.id })))
    const { data } = await supabase.from('user_initial_plans').upsert({ user_id: user.id, generated_payload: plan, activated: true, activated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single()
    setInitialPlan(data)
    setFeedback(`Plan activado: ${habits.length} hábitos y una rutina inicial.`)
  }

  if (loading) return <section className="view-stack enter-up"><article className="content-panel panel"><p className="eyebrow">CARGANDO PERFIL…</p></article></section>

  const dailyMissions = missions.filter((mission) => mission.period_type === 'daily' && mission.period_key === today)
  const weeklyMissions = missions.filter((mission) => mission.period_type === 'weekly' && mission.period_key === weekStart)

  return <section className="view-stack enter-up v8-profile-view">
    <header className="section-heading"><div><p className="eyebrow">IDENTIDAD Y PROGRESIÓN</p><h2>Perfil</h2><p>Tu avance permanente, tus atributos, tus misiones y los cosméticos que desbloqueaste.</p></div></header>
    {feedback && <p className="form-feedback">{feedback}</p>}
    <nav className="v8-tabs">{[['perfil','Perfil'],['misiones','Misiones'],['logros','Logros'],['plan','Plan inicial']].map(([id,label]) => <button className={tab === id ? 'active' : ''} type="button" onClick={() => setTab(id)} key={id}>{label}</button>)}</nav>

    {tab === 'perfil' && <>
      <article className="v8-profile-hero panel">
        <Avatar src={profile.avatar_url} label={profile.display_name} frame={profile.equipped_frame} />
        <div><p className="eyebrow">PERFIL PERSONAL</p><h2>{profile.display_name}</h2><strong>Nivel {levelInfo.level} · {levelInfo.title}</strong><p>{totalXp} XP acumulada · Racha actual: {metrics.streak} días.</p><ProgressBar value={levelInfo.levelPercentage} /></div>
      </article>
      <section className="v8-profile-grid">
        <article className="content-panel panel"><div className="v8-card-heading"><div><p className="eyebrow">AVATAR</p><h3>Identidad visual</h3></div></div><div className="v8-avatar-grid">{DEFAULT_AVATARS.map((avatar) => <button type="button" className={profile.avatar_url === avatar.src ? 'selected' : ''} onClick={() => chooseAvatar(avatar.src)} key={avatar.id}><Avatar src={avatar.src} label={avatar.label} frame="frame-default" size="small" /><span>{avatar.label}</span></button>)}</div><label className="ghost-button v8-upload"><input type="file" accept="image/*" onChange={uploadAvatar} />{uploading ? 'Subiendo…' : 'Subir imagen propia'}</label></article>
        <article className="content-panel panel"><div className="v8-card-heading"><div><p className="eyebrow">MARCOS</p><h3>Cosméticos desbloqueados</h3></div></div><div className="v8-frame-list">{COSMETIC_CATALOG.filter((item) => item.type === 'frame').map((item) => <button type="button" disabled={!cosmeticCodes.has(item.id)} className={profile.equipped_frame === item.id ? 'selected' : ''} onClick={() => equipFrame(item.id)} key={item.id}><span className={`v8-frame-preview ${item.className}`}>A</span><strong>{item.label}</strong><small>{cosmeticCodes.has(item.id) ? 'Disponible' : 'Bloqueado'}</small></button>)}</div></article>
      </section>
      <article className="content-panel panel"><div className="v8-card-heading"><div><p className="eyebrow">ATRIBUTOS</p><h3>Áreas de desarrollo</h3></div></div><div className="v8-attributes-grid">{ATTRIBUTE_CATALOG.map((item) => { const row = attributes.find((attribute) => attribute.attribute_code === item.id); const info = attributeLevelFromXp(row?.xp || 0); return <article key={item.id}><span>{item.icon}</span><div><strong>{item.label}</strong><small>Nivel {info.level} · {info.xp} XP</small><ProgressBar value={info.progress} /></div></article> })}</div></article>
    </>}

    {tab === 'misiones' && <>
      <article className="content-panel panel"><div className="v8-card-heading"><div><p className="eyebrow">CONFIGURACIÓN</p><h3>Misiones diarias</h3></div><label className="v8-select-label"><span>Cantidad</span><select value={settings.daily_mission_count || 3} onChange={changeMissionCount}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label></div><p>Las misiones se generan a partir de acciones reales. Podés reemplazar una misión diaria que no encaje con tu jornada.</p></article>
      <div className="v8-mission-grid">{dailyMissions.map((mission) => <MissionCard mission={mission} onClaim={claimMission} onReplace={replaceMission} key={mission.id} />)}</div>
      <h3 className="v8-subtitle">Misiones semanales</h3>
      <div className="v8-mission-grid">{weeklyMissions.map((mission) => <MissionCard mission={mission} onClaim={claimMission} onReplace={replaceMission} key={mission.id} />)}</div>
    </>}

    {tab === 'logros' && <article className="content-panel panel"><div className="v8-card-heading"><div><p className="eyebrow">HISTORIAL PERMANENTE</p><h3>Logros</h3></div></div><div className="v8-achievement-grid">{ACHIEVEMENT_CATALOG.map((item) => { const record = achievements.find((achievement) => achievement.achievement_code === item.id); const unlocked = Boolean(record?.unlocked); const progress = achievementProgress(item, metrics); if (item.hidden && !unlocked) return <article className="v8-achievement hidden" key={item.id}><span>?</span><div><strong>Logro oculto</strong><small>Descubrí una acción especial para revelarlo.</small></div></article>; return <article className={`v8-achievement ${unlocked ? 'unlocked' : ''}`} key={item.id}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.copy}</small><ProgressBar value={(progress / item.target) * 100} /><em>{progress}/{item.target} · {item.rarity} · +{item.rewardXp} XP</em></div></article> })}</div></article>}

    {tab === 'plan' && <article className="content-panel panel"><div className="v8-card-heading"><div><p className="eyebrow">DESPUÉS DEL ONBOARDING</p><h3>Tu plan inicial sugerido</h3></div>{initialPlan?.activated && <span className="positive-pill">Activado</span>}</div><p>La selección se genera desde tus respuestas iniciales. Podés editar o eliminar cada elemento después de activarlo.</p><div className="v8-plan-grid"><div><strong>Hábitos sugeridos</strong>{plan.habits.map((habit) => <span key={habit.title}>○ {habit.title}</span>)}</div><div><strong>{plan.routine.title}</strong>{plan.routine.steps.map((step) => <span key={step.title}>○ {step.title}</span>)}</div></div><button className="primary-button" type="button" disabled={initialPlan?.activated} onClick={activateInitialPlan}>{initialPlan?.activated ? 'Plan ya activado' : 'Activar mi sistema inicial'}</button></article>}
  </section>
}
