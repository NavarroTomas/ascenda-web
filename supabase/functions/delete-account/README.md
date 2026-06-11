# delete-account

Edge Function protegida para eliminar definitivamente la cuenta autenticada.

Despliegue:

```powershell
npx supabase functions deploy delete-account
```

No requiere secretos adicionales: utiliza `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, disponibles en las Edge Functions alojadas.
