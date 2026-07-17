-- 0038_sector_cron.sql
-- GRYD — planification du pipeline SECTEURS (AMENDEMENT-41 §1/§2) via pg_cron + pg_net.
--
-- Les jobs `discover_sectors` (rattache + nomme les secteurs) et `recompute_sectors`
-- (snapshot §C) étaient DÉPLOYÉS mais ordonnancés par RIEN. On les rend AUTONOMES :
-- pg_cron POST vers l'Edge Function toutes les 15 min, avec le secret cron lu depuis
-- Vault (jamais dans le repo — seeded hors migration : `gryd_cron_secret`).
--
-- PORTÉE VOLONTAIREMENT BORNÉE : SEULS ces 2 jobs (secteurs, idempotents, tables
-- vides tant qu'aucune capture réelle). decay_job / season_close / digest_job restent
-- NON planifiés ici — leur cadence a des implications de jeu (fin de saison, decay)
-- qui relèvent d'une décision fondateur, pas d'un effet de bord de ce chantier.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- discover_sectors : rattache les captures + crée/nomme les secteurs wild (toutes les 15 min).
select cron.schedule(
  'gryd_discover_sectors',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://sydwxwwirinjoheeodcg.supabase.co/functions/v1/discover_sectors',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gryd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- recompute_sectors : snapshot §C (owner/rival + pression + statut), 5 min APRÈS discover
-- pour lui laisser rattacher (aux minutes 5/20/35/50).
select cron.schedule(
  'gryd_recompute_sectors',
  '5-59/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://sydwxwwirinjoheeodcg.supabase.co/functions/v1/recompute_sectors',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gryd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
