-- Schedule the sync-events Edge Function daily at 00:05 UTC.
-- The function now runs both Eventbrite sync and OpenAI interest analysis.
--
-- Prerequisites (Supabase Dashboard → Database → Extensions):
--   - Enable: pg_cron, pg_net
--
-- Vault (Dashboard → Project Settings → Vault, or SQL):
--   Store secrets used below, e.g.:
--     select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--     select vault.create_secret('your-long-random-cron-secret', 'cron_secret');
--   The cron_secret value must match the Edge Function secret CRON_SECRET.
--
-- If the job already exists, unschedule first:
--   select cron.unschedule('invoke-sync-and-analyze-events-daily');

do $$
begin
  perform cron.unschedule('invoke-sync-events-daily');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('invoke-sync-and-analyze-events-daily');
exception when others then
  null;
end $$;

select
  cron.schedule(
    'invoke-sync-and-analyze-events-daily',
    '5 0 * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
          || '/functions/v1/sync-events',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
        ),
        body := '{"source":"pg_cron"}'::jsonb
      ) as request_id;
    $$
  );
