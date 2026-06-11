import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseUrl = requireEnv('SUPABASE_URL')
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('authorization') || ''
  const accessToken = authorization.replace(/^Bearer\s+/i, '')
  if (!accessToken) return json({ error: 'Missing authorization token' }, 401)

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
  if (authError || !authData.user) return json({ error: 'Invalid or expired session' }, 401)

  const body = await request.json().catch(() => ({}))
  if (body.confirmation !== 'ELIMINAR MI CUENTA') return json({ error: 'Invalid confirmation phrase' }, 400)

  const userId = authData.user.id
  const storageWarnings = await removeAvatarObjects(userId)
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId, false)

  if (deleteError) {
    return json({ error: deleteError.message, storage_warnings: storageWarnings }, 500)
  }

  return json({ ok: true, deleted_user_id: userId, storage_warnings: storageWarnings })
})

async function removeAvatarObjects(userId: string) {
  const warnings: string[] = []
  try {
    const { data, error } = await admin.storage.from('avatars').list(userId, { limit: 1000 })
    if (error) {
      if (!error.message.toLowerCase().includes('not found')) warnings.push(error.message)
      return warnings
    }
    const paths = (data || []).filter((item) => item.name).map((item) => `${userId}/${item.name}`)
    if (!paths.length) return warnings
    const { error: removeError } = await admin.storage.from('avatars').remove(paths)
    if (removeError) warnings.push(removeError.message)
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error))
  }
  return warnings
}

function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: corsHeaders })
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
