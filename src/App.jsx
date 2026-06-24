import { useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import ResetPasswordScreen from './components/ResetPasswordScreen.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

function isPasswordRecoveryRoute() {
  return window.location.pathname === '/reset-password' || new URLSearchParams(window.location.search).get('mode') === 'reset-password'
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryRoute)

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <SetupScreen />
  if (passwordRecovery) return <ResetPasswordScreen />
  if (loading) return <main className="centered-screen"><p className="eyebrow">CARGANDO ASCENDA…</p></main>
  if (!session) return <AuthScreen />
  return <Dashboard session={session} />
}
