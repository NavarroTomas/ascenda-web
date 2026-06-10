import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getTodayISO } from '../lib/date.js'
import { buildProgressionMetrics, createMissionRows, enrichProgressionMetrics, getWeekStartISO, missionProgress } from '../lib/progression.js'
import '../styles/v8-progress.css'

export default function MissionDashboardCard({ userId, navigate }) {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const today = getTodayISO()
      const weekStart = getWeekStartISO()
      const [settingsResult, tasksResult, habitsResult, habitLogsResult, routinesResult, routineLogsResult, goalsResult, notesResult, dailyNotesResult, xpResult] = await Promise.all([
        supabase.from('user_settings').select('daily_mission_count').eq('user_id', userId).maybeSingle(),
        supabase.from('tasks').select('*'),
        supabase.from('habits').select('*'),
        supabase.from('habit_logs').select('*'),
        supabase.from('routines').select('*'),
        supabase.from('routine_logs').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('notes').select('*'),
        supabase.from('daily_notes').select('*'),
        supabase.from('xp_events').select('*'),
      ])
      const source = { tasks: tasksResult.data || [], habits: habitsResult.data || [], habitLogs: habitLogsResult.data || [], routines: routinesResult.data || [], routineLogs: routineLogsResult.data || [], goals: goalsResult.data || [], notes: notesResult.data || [], dailyNotes: dailyNotesResult.data || [], xpEvents: xpResult.data || [] }
      const metrics = enrichProgressionMetrics(buildProgressionMetrics({ ...source, today }), source.goals)
      await supabase.from('user_missions').upsert(createMissionRows({ userId, dailyCount: settingsResult.data?.daily_mission_count || 3, today, weekStart }), { onConflict: 'user_id,period_type,period_key,mission_code', ignoreDuplicates: true })
      const { data = [] } = await supabase.from('user_missions').select('*').eq('period_type', 'daily').eq('period_key', today).order('created_at')
      for (const mission of data) {
        const current_value = missionProgress(mission, metrics)
        const completed = current_value >= Number(mission.target_value)
        if (current_value !== mission.current_value || completed !== mission.completed) await supabase.from('user_missions').update({ current_value, completed, completed_at: completed ? (mission.completed_at || new Date().toISOString()) : null }).eq('id', mission.id)
      }
      const { data: refreshed = [] } = await supabase.from('user_missions').select('*').eq('period_type', 'daily').eq('period_key', today).order('created_at')
      if (!cancelled) { setMissions(refreshed); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  return <article className="content-panel panel v8-dashboard-missions"><div className="card-heading"><div><p className="eyebrow">MISIONES DIARIAS</p><h2>Tu próximo impulso</h2></div><button className="mini-action" type="button" onClick={() => navigate('perfil')}>Ver perfil</button></div>{loading ? <p className="muted-copy">Generando misiones…</p> : <div className="v8-dashboard-mission-list">{missions.slice(0, 3).map((mission) => <div className={mission.completed ? 'done' : ''} key={mission.id}><span>{mission.completed ? '✓' : '○'}</span><div><strong>{mission.title}</strong><small>{mission.current_value}/{mission.target_value} · +{mission.reward_xp} XP</small></div></div>)}</div>}</article>
}
