import { useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <SetupScreen />
  if (loading) return <main className="centered-screen"><p className="eyebrow">CARGANDO ASCENDA…</p></main>
  if (!session) return <AuthScreen />
  return <Dashboard session={session} />
}
