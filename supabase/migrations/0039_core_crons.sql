-- 0039_core_crons.sql
-- GRYD — planification des jobs de jeu dormants (decay + season_close) via pg_cron.
--
-- Ces Edge Functions étaient DÉPLOYÉES mais ordonnancées par RIEN (« crons jamais
-- planifiés » — audit mise en prod). On réutilise l'infra de 0038 (pg_cron + pg_net
-- + secret cron dans Vault `gryd_cron_secret`) pour les rendre autonomes.
--
-- SÛRETÉ vérifiée avant de planifier :
--   • decay_job : neutralise UNIQUEMENT les hex_claims dont decay_at est échu
--     (SPEC §3.3, 21 j). Sur 0 claim → no-op. Quotidien, heure creuse.
--   • season_close : ne clôt QUE les saisons `status='active' AND ends_at < now`
--     (index.ts:64-65 + garde-fou l.154). Les saisons actives finissent le
--     2026-08-28 → un cron quotidien N'Y TOUCHE PAS avant leur vraie fin. Sûr.
-- digest_job (notifications) reste NON planifié ici — cadence/soir + quiet hours à
-- caler côté produit ; on ne déclenche pas de push automatiques sans décision.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- decay_job — quotidien 03:00 UTC (heure creuse ; warn J-3 + neutralisation J).
select cron.schedule(
  'gryd_decay_job',
  '0 3 * * *',
  $job$
  select net.http_post(
    url := 'https://sydwxwwirinjoheeodcg.supabase.co/functions/v1/decay_job',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gryd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- season_close — quotidien 03:20 UTC (après decay). N'agit que sur une saison ÉCHUE.
select cron.schedule(
  'gryd_season_close',
  '20 3 * * *',
  $job$
  select net.http_post(
    url := 'https://sydwxwwirinjoheeodcg.supabase.co/functions/v1/season_close',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gryd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
