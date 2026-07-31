-- 0102_schedule_polyline_purge.sql
-- GRYD — La purge des traces cesse d'être une fonction que personne n'appelle.
--
-- ═══ POURQUOI CETTE MIGRATION EXISTE ════════════════════════════════════════
-- `0101` a posé `purge_expired_polylines()`, l'a testée et l'a réservée au
-- service-role — mais RIEN NE LA DÉCLENCHAIT. Une purge qu'aucun ordonnanceur
-- n'appelle est exactement la situation d'avant : une rétention annoncée dans un
-- commentaire, jamais appliquée. La vue `polyline_retention_health` était faite
-- pour le dire ; cette migration fait qu'elle n'aura plus rien à signaler.
--
-- ═══ APPEL SQL DIRECT, PAS UNE FONCTION EDGE ════════════════════════════════
-- Même raisonnement que `0046` pour la purge des comptes (« aucune dépendance
-- réseau/secret pour une obligation légale ») : une rétention de données de
-- localisation ne doit pas dépendre d'un secret d'environnement, d'un
-- déploiement de fonction edge ou de la disponibilité d'un service HTTP. Si la
-- base tourne, la purge tourne.
--
-- ═══ ORDONNANCEMENT ═════════════════════════════════════════════════════════
-- 04:00 UTC, APRÈS les trois jobs existants — decay (03:00) et season_close
-- (03:20) de `0039`, purge des comptes (03:40) de `0046`. Placée en dernier
-- parce qu'elle est la seule à ne rien produire dont un autre job dépendrait :
-- si elle échoue, aucune chaîne ne casse derrière elle.
--
-- ⚠️ LE 90 EST UN MIROIR, PAS UNE SOURCE. `RAW_POLYLINE_RETENTION_DAYS` vit dans
-- `packages/shared/src/game-rules.ts:768` et fait foi. Le SQL ne peut pas lire un
-- module TypeScript ; la valeur est donc recopiée ici, comme `0093` recopie les
-- bornes de rôle. Si elle change là-bas, cette planification doit être reprise
-- par une migration SUIVANTE — une migration ne se réécrit jamais.
--
-- ADDITIVE : aucune table, aucune colonne, aucune donnée touchée.
-- Rollback = select cron.unschedule('gryd_purge_polylines');

-- Idempotence : `cron.schedule` sur un nom existant remplace la planification,
-- mais on retire d'abord pour que rejouer la migration ne dépende pas de ce
-- comportement (il a changé entre versions de pg_cron).
select cron.unschedule('gryd_purge_polylines')
where exists (select 1 from cron.job where jobname = 'gryd_purge_polylines');

select cron.schedule(
  'gryd_purge_polylines',
  '0 4 * * *',
  $job$ select public.purge_expired_polylines(90); $job$
);
