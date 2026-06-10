export default function SetupScreen() {
  return (
    <main className="centered-screen auth-background">
      <section className="setup-card panel enter-up">
        <div className="brand large-brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>ASCENDA</strong>
            <span>Personal System</span>
          </div>
        </div>
        <p className="eyebrow">CONFIGURACIÓN PENDIENTE</p>
        <h1>Conectá tu proyecto de Supabase</h1>
        <p className="muted-copy">
          El frontend ya está preparado. Copiá <code>.env.example</code> como <code>.env.local</code> y reemplazá los dos valores de ejemplo.
        </p>
        <pre>{`VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE`}</pre>
        <p className="small-note">Después reiniciá el servidor con <strong>npm run dev</strong>.</p>
      </section>
    </main>
  )
}
