-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0196 — L'HORLOGE DES TRACÉS OBÉIT AU JOUEUR, PLUS À UNE CONSTANTE.       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- 0195 a posé la préférence, l'effacement à la demande et le journal. Ce
-- fichier pose ce qui l'applique dans le temps — et RETIRE ce qui l'appliquait
-- à la place du joueur.
--
-- ═══ LA RUPTURE, EN UNE LIGNE ══════════════════════════════════════════════
-- `select cron.unschedule('gryd_purge_polylines')` (§3). Depuis 0102, ce job
-- effaçait `polyline_masked` au-delà de 90 jours POUR TOUT LE MONDE. Le laisser
-- tourner à côté de la nouvelle purge aurait produit exactement le mensonge
-- qu'on corrige : un écran qui annonce « Tout est conservé » pendant qu'un cron
-- efface la moitié de la trace chaque nuit. Les deux ne peuvent pas coexister ;
-- c'est le job de 0102 qui part, parce que c'est lui qui décidait sans demander.
--
-- `purge_expired_polylines(integer)` (0101) N'EST PAS SUPPRIMÉE : une migration
-- ne se réécrit jamais, et la fonction reste appelable par le service-role pour
-- une purge exceptionnelle décidée à la main. Seul son commentaire est repris
-- pour dire qu'elle n'est plus ordonnancée — une fonction dont le commentaire
-- promet un job qui n'existe plus est une doc qui ment.
--
-- ═══ LA VUE DE DIAGNOSTIC DE 0101 DEVIENT FAUSSE, DONC ELLE PART ═══════════
-- `polyline_retention_health.traces_overdue` comptait « les traces de plus de
-- 90 jours encore stockées ». Avec `keep` par défaut, ce compteur monterait
-- indéfiniment en signalant une panne qui n'existe pas — un diagnostic qui crie
-- au loup finit par être ignoré le jour où il a raison. Elle est remplacée par
-- `trace_retention_health_2026`, qui ne compte comme EN RETARD que ce qu'une
-- préférence RÉELLE aurait dû faire effacer.
--
-- ═══ CE QUE LE JOB NE FAIT PAS ═════════════════════════════════════════════
-- Il ne touche AUCUN compte réglé sur `keep` — c'est-à-dire, au jour de ce
-- déploiement, absolument tout le monde. Il ne supprime aucune sortie, aucune
-- statistique, aucune capture, aucun mètre carré de territoire.
--
-- ADDITIVE : une fonction neuve, une vue neuve, une planification retirée, une
-- vue retirée. Rollback : `select cron.unschedule('trace-retention-purge-2026')`
-- puis réappliquer 0101 §2 et 0102.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA PURGE QUI RESPECTE LA PRÉFÉRENCE
--
-- `p_at timestamptz default now()` EST LE MODE ACCÉLÉRÉ des tests : ils
-- avancent l'horloge en paramètre au lieu d'attendre 400 jours. Aucune variable
-- d'environnement, aucun drapeau caché — un mode de test qui ne se lit pas dans
-- la signature finit par diverger du mode réel (patron 0190 §8).
--
-- ⚠️ LES DEUX NOMBRES SONT UN MIROIR, PAS UNE SOURCE. `TRACE_RETENTION_DAYS_2026`
-- vit dans `packages/shared/src/game-rules.ts` et fait foi. Le SQL ne peut pas
-- lire un module TypeScript ; les valeurs sont donc recopiées ici, comme 0102
-- recopiait `RAW_POLYLINE_RETENTION_DAYS` et comme 0093 recopie les bornes de
-- rôle. Si elles changent là-bas, une migration SUIVANTE doit les reprendre —
-- une migration ne se réécrit jamais. Le test PGlite du lot confronte les deux
-- fichiers, pour que la divergence soit rouge et non silencieuse.
--
-- IDEMPOTENTE : le `where` exige `trace_points_2026 is not null or
-- polyline_masked is not null`. Un second passage ne touche aucune ligne, et
-- son journal le dira honnêtement (0 purgé), au lieu de recompter les mêmes.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.purge_traces_by_retention_2026(
  p_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_purged integer := 0;
  v_held   integer := 0;
begin
  -- LE PLANCHER ANTI-TRICHE, ÉCRIT UNE FOIS ET COMPTÉ AVANT D'EFFACER : les
  -- sorties qui SERAIENT dues mais qu'une revue ou un recours ouvert retient.
  -- Sans ce décompte, un plancher qui retient dix dossiers et un job sans
  -- travail écriraient exactement la même ligne de journal.
  with due as (
    select r.id
      from public.runs r
      join public.user_profiles p on p.user_id = r.user_id
     where p.trace_retention_2026 <> 'keep'
       and (r.trace_points_2026 is not null or r.polyline_masked is not null)
       and r.started_at < p_at - make_interval(days => case p.trace_retention_2026
             when 'days_90'  then 90
             when 'days_365' then 365
           end)
  )
  select count(*)::integer into v_held
    from due
   where exists (
     select 1 from public.anticheat_reviews rev
      where rev.run_id = due.id and rev.status <> 'closed'
   ) or exists (
     select 1 from public.anticheat_appeals ap
       join public.anticheat_reviews rev on rev.id = ap.review_id
      where rev.run_id = due.id and ap.status <> 'closed'
   );

  -- L'EFFACEMENT. Les DEUX colonnes ensemble : n'en effacer qu'une laisserait
  -- le joueur croire que sa trace est partie alors que l'autre la porte encore.
  -- Rien d'autre n'est touché — la sortie, ses chiffres et son territoire sont
  -- des faits GAGNÉS (doctrine de 0101, conservée mot pour mot).
  update public.runs r
     set trace_points_2026 = null,
         polyline_masked = null
    from public.user_profiles p
   where p.user_id = r.user_id
     and p.trace_retention_2026 <> 'keep'
     and (r.trace_points_2026 is not null or r.polyline_masked is not null)
     and r.started_at < p_at - make_interval(days => case p.trace_retention_2026
           when 'days_90'  then 90
           when 'days_365' then 365
         end)
     and not exists (
       select 1 from public.anticheat_reviews rev
        where rev.run_id = r.id and rev.status <> 'closed'
     )
     and not exists (
       select 1 from public.anticheat_appeals ap
         join public.anticheat_reviews rev on rev.id = ap.review_id
        where rev.run_id = r.id and ap.status <> 'closed'
     );
  get diagnostics v_purged = row_count;

  -- UNE LIGNE PAR PASSAGE, MÊME À VIDE. C'est la seule façon de distinguer
  -- « le job n'a rien trouvé » de « le job ne tourne plus » (0190 §8).
  insert into public.trace_purge_log_2026
    (source, measured_at, runs_purged, runs_held_for_review)
  values ('retention_job', p_at, v_purged, v_held);

  return jsonb_build_object(
    'measuredAt', p_at,
    'purged', v_purged,
    'heldForReview', v_held);
end $$;

revoke all on function public.purge_traces_by_retention_2026(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_traces_by_retention_2026(timestamptz) to service_role;

comment on function public.purge_traces_by_retention_2026(timestamptz) is
  'Efface les DEUX formes de trace (trace_points_2026 ET polyline_masked) des '
  'sorties dont le propriétaire a CHOISI une durée (days_90 / days_365). '
  'N''effleure JAMAIS un compte réglé sur keep — le défaut — ni un compte sans '
  'ligne user_profiles. Plancher anti-triche : une sortie dont la revue (0081) '
  'ou le recours est ouvert n''est jamais purgée, et le journal compte ces '
  'retenues. Ne supprime ni la sortie, ni ses statistiques, ni sa capture : '
  'capture_events_2026 porte sa propre géométrie. Idempotente. Réservée au '
  'service-role : un joueur qui pourrait déclencher la purge globale choisirait '
  'le moment d''effacer les traces des autres.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LE DIAGNOSTIC — « LA PRÉFÉRENCE EST-ELLE RÉELLEMENT TENUE ? »
--
-- La vue de 0101 comptait « traces de plus de 90 jours » : sous le nouveau
-- défaut, ce nombre monte pour toujours sans qu'une seule ligne soit en retard.
-- Celle-ci ne compte comme EN RETARD que ce qu'une préférence RÉELLE aurait dû
-- faire effacer, et sépare ce que le plancher anti-triche retient légitimement.
-- ════════════════════════════════════════════════════════════════════════════
drop view if exists public.polyline_retention_health;

create or replace view public.trace_retention_health_2026 as
with scored as (
  select
    p.trace_retention_2026 as choice,
    (r.trace_points_2026 is not null or r.polyline_masked is not null) as has_trace,
    p.trace_retention_2026 <> 'keep'
      and (r.trace_points_2026 is not null or r.polyline_masked is not null)
      and r.started_at < now() - make_interval(days => case p.trace_retention_2026
            when 'days_90'  then 90
            when 'days_365' then 365
            else null
          end) as due,
    exists (
      select 1 from public.anticheat_reviews rev
       where rev.run_id = r.id and rev.status <> 'closed'
    ) or exists (
      select 1 from public.anticheat_appeals ap
        join public.anticheat_reviews rev on rev.id = ap.review_id
       where rev.run_id = r.id and ap.status <> 'closed'
    ) as under_review
  from public.runs r
  join public.user_profiles p on p.user_id = r.user_id
)
select
  count(*) filter (where has_trace)                              as traces_stored,
  count(*) filter (where has_trace and choice = 'keep')           as traces_kept_by_choice,
  count(*) filter (where due and not under_review)                as traces_overdue,
  count(*) filter (where due and under_review)                    as traces_held_for_review,
  (select max(ran_at) from public.trace_purge_log_2026
    where source = 'retention_job')                               as last_job_at
from scored;

revoke all on public.trace_retention_health_2026 from public, anon, authenticated;

comment on view public.trace_retention_health_2026 is
  'DIAGNOSTIC service-role. traces_overdue > 0 signifie que le job de purge ne '
  'tourne pas (ou plus) POUR DES COMPTES QUI ONT CHOISI UNE DURÉE — un tracé '
  'gardé sur le choix keep n''est jamais « en retard ». traces_held_for_review '
  'isole ce que le plancher anti-triche retient légitimement. last_job_at à '
  'NULL, ou vieux, dit un ordonnanceur muet. JAMAIS servie aux clients. '
  'Remplace polyline_retention_health (0101), dont le seuil uniforme de 90 '
  'jours ne veut plus rien dire depuis que la conservation est un choix.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. L'HORLOGE — patron 0163/0168/0190, conditionnel au schéma `cron`
--
-- `pg_cron` 1.6.4 est INSTALLÉ en production (vérifié le 09/09/2026, 0163). Le
-- `do $$ … $$` conditionnel garde ce fichier REJOUABLE sur une base de test où
-- le schéma `cron` n'existe pas — PGlite, notamment.
--
-- 04:20 UTC : APRÈS la purge des comptes de 0046 (03:40) — un compte purgé
-- emporte ses sorties en cascade, il est inutile d'effacer d'abord des tracés
-- qui vont disparaître avec leur ligne — et à la place qu'occupait l'ancien
-- `gryd_purge_polylines` (04:00), c'est-à-dire en dernier : ce job ne produit
-- rien dont un autre dépendrait, donc son échec ne casse aucune chaîne.
--
-- Le fuseau est SANS EFFET parce que le job est IDEMPOTENT et que sa borne est
-- une durée en jours depuis `started_at`, pas un mur de minuit.
-- ════════════════════════════════════════════════════════════════════════════
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    -- ① On RETIRE la purge uniforme de 0102. C'est elle qui effaçait
    --    `polyline_masked` à 90 jours sans demander l'avis de personne ; la
    --    laisser tourner contredirait le choix `keep` chaque nuit.
    perform cron.unschedule('gryd_purge_polylines')
      where exists (select 1 from cron.job where jobname = 'gryd_purge_polylines');

    -- ② On pose celle qui obéit à la préférence. `cron.schedule` sur un nom
    --    existant REMPLACE la planification : réappliquer ne double rien.
    perform cron.schedule(
      'trace-retention-purge-2026',
      '20 4 * * *',
      'select public.purge_traces_by_retention_2026()'
    );
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. LA FONCTION DE 0101 RESTE, SON COMMENTAIRE DIT LA VÉRITÉ
-- ════════════════════════════════════════════════════════════════════════════
comment on function public.purge_expired_polylines(integer) is
  'Vague 10 — N''EST PLUS ORDONNANCÉE depuis 0196. Elle effaçait polyline_masked '
  'au-delà d''une rétention uniforme, pour tout le monde ; la conservation est '
  'désormais un CHOIX du joueur (user_profiles.trace_retention_2026, 0195) et '
  'c''est purge_traces_by_retention_2026 qui l''applique, sur les DEUX formes de '
  'trace. Conservée et toujours exécutable par le service-role pour une purge '
  'exceptionnelle décidée à la main — une migration ne se réécrit jamais. '
  'Attention : elle IGNORE la préférence et le plancher anti-triche.';
