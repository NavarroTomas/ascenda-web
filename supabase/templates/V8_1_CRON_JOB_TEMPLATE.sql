-- =============================================================================
-- ASCENDA WEB V8.1 · CRON SEGURO PARA SEND-REMINDERS
--
-- Antes de ejecutar:
-- 1. Activá Cron y pg_net desde Supabase Dashboard.
-- 2. En Supabase Vault creá estos secretos:
--      ascenda_project_url = https://TU_PROJECT_REF.supabase.co
--      ascenda_cron_secret = el mismo valor configurado como CRON_SECRET
-- 3. Ejecutá este archivo una vez desde SQL Editor.
--
-- El secreto no queda escrito en este archivo ni en el repositorio.
-- =============================================================================

select cron.schedule(
  'ascenda-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'ascenda_project_url'
      limit 1
    ) || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'ascenda_cron_secret'
        limit 1
      )
    ),
    body := jsonb_build_object(
      'source', 'supabase-cron',
      'triggered_at', now()
    )
  ) as request_id;
  $$
);
