-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0195 — LA CONSERVATION D'UN TRACÉ DEVIENT UNE OPTION DU JOUEUR.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- DÉCISION DU FONDATEUR, 11/09/2026 au soir, mot pour mot : « Trace GPS : ce
-- qui est le plus adapté, ou mettre dans les réglages l'option, mais ne pas
-- purger directement. »
--
-- ═══ LA CONTRADICTION QUE CE FICHIER FERME ═════════════════════════════════
-- Le serveur garde DEUX formes de la même trace, avec deux durées de vie
-- opposées, et le joueur n'avait son mot à dire sur aucune :
--   · `runs.polyline_masked` — trace expurgée (extrémités coupées, zones
--     privées retirées), écrite par `ingest_run/index.ts`. PURGÉE À 90 JOURS
--     POUR TOUT LE MONDE par `purge_expired_polylines` (0101), déclenchée par
--     le job `gryd_purge_polylines` (0102) ;
--   · `runs.trace_points_2026` — les points COMPLETS et horodatés (0118),
--     écrits par `ingest_run/refonte2026.ts`. JAMAIS purgée, par rien.
-- La forme la plus détaillée survivait donc indéfiniment pendant que la forme
-- la plus protégée disparaissait. C'est l'inverse exact de ce qu'une purge de
-- vie privée devrait produire.
--
-- ═══ RUPTURE ASSUMÉE AVEC 0101/0102, ET POURQUOI ELLE VA DANS LE BON SENS ══
-- ⚠️ À PARTIR DE CE LOT, LA PURGE AUTOMATIQUE À 90 JOURS DE `polyline_masked`
-- N'EXISTE PLUS POUR QUI N'A RIEN DEMANDÉ. 0196 retire la planification
-- `gryd_purge_polylines` et la remplace par une purge qui RESPECTE la
-- préférence. Trois raisons, et aucune n'est un renoncement :
--
--  ① LE RANG 0 DIT DÉJÀ L'INVERSE DE 0101. Le cahier de septembre
--    (`docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md` §18.5) écrit : « trace
--    canonique conservée TANT QUE L'ACTIVITÉ EST CONSERVÉE ». La purge
--    uniforme à 90 jours était donc un écart au cahier, pas son application.
--
--  ② UNE PURGE PAR DÉFAUT AURAIT ÉTÉ UNE PURGE DE MASSE. Poser la préférence
--    avec un défaut à `days_90` aurait effacé, la nuit du déploiement, les
--    tracés de tous les comptes existants — sans que personne l'ait demandé.
--    Un défaut qui détruit est un défaut qu'on n'a pas le droit de choisir à
--    la place des gens.
--
--  ③ LE VRAI DÉFAUT DE 0101 N'ÉTAIT PAS SA DURÉE, C'ÉTAIT SON SILENCE. Elle
--    effaçait une donnée que le joueur croyait garder, sans écran pour le lui
--    dire ni bouton pour l'accélérer. Ce lot rend LES DEUX : un choix, et un
--    effacement immédiat à la demande.
--
-- CE QUI EST CONSERVÉ DE 0101 : sa doctrine, mot pour mot. « Elle met la
-- colonne à NULL. Elle NE SUPPRIME PAS la course. La distance, la durée,
-- l'allure et le territoire capturé sont des faits que le joueur a GAGNÉS. »
-- Toute purge de ce lot met à NULL les DEUX colonnes de trace, et rien d'autre.
-- `purge_expired_polylines(integer)` n'est PAS supprimée : une migration ne se
-- réécrit jamais, et la fonction reste appelable par le service-role. Elle
-- n'est simplement plus planifiée (0196).
--
-- ═══ CE QU'UNE PURGE NE TOUCHE JAMAIS — VÉRIFIÉ, PAS SUPPOSÉ ═══════════════
-- Le TERRITOIRE ne dépend pas de la trace : `capture_events_2026` (0118) porte
-- sa PROPRE géométrie (`extensions.geometry(MultiPolygon,4326)`, colonne
-- `geometry` + les quatre dérivées), et `ownership_2026` la sienne. Effacer
-- `trace_points_2026` ne retire donc pas un mètre carré à personne, ne change
-- aucun compteur et ne rejoue aucune possession. Les statistiques
-- (`distance_m`, `duration_s`, `avg_pace_s_km`, `points_awarded`,
-- `xp_awarded`, `celebration`) vivent sur `runs` et ne sont pas touchées.
--
-- ADDITIVE : une colonne sur `user_profiles` (avec son défaut, donc aucune
-- ligne réécrite au sens du joueur), une table de journal, une fonction
-- REMPLACÉE à signature identique (`my_privacy_settings_2026`), deux fonctions
-- neuves. Aucune donnée existante n'est effacée par ce fichier.
-- Rollback : `drop` des deux fonctions neuves et de la table, `alter table
-- user_profiles drop column trace_retention_2026`, et réappliquer 0135 §1.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA PRÉFÉRENCE — SUR LA TABLE QUI PORTE DÉJÀ LES AUTRES
--
-- `user_profiles` EST la table de préférences de confidentialité côté serveur :
-- `profile_visibility`, `map_sharing` et `discreet_mode` y vivent depuis 0011,
-- 0126 les lit pour décider ce que les autres voient, et 0135 les expose. Une
-- table dédiée aurait créé une SECONDE source de vérité à joindre partout —
-- exactement le défaut que 0135 a corrigé pour `profileVisibility`.
--
-- LE DÉFAUT DE COLONNE EST `'keep'`, ET C'EST LA DÉCISION DU FONDATEUR ÉCRITE
-- DANS LE SCHÉMA : une ligne qui n'a jamais été touchée ne fait purger rien.
-- Conséquence voulue : un compte SANS ligne `user_profiles` (ligne supprimée à
-- la main, trigger 0154 qui n'a pas tourné) n'a aucune préférence — le job ne
-- le voit donc pas, et ne purge rien pour lui. Le mode de défaillance d'une
-- fonction DESTRUCTIVE doit être « ne rien détruire ».
-- ════════════════════════════════════════════════════════════════════════════
alter table public.user_profiles
  add column if not exists trace_retention_2026 text not null default 'keep';

-- Le domaine est posé à part de la colonne pour rester rejouable : `add column
-- if not exists` ne repose pas la contrainte si la colonne existe déjà.
do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'user_profiles_trace_retention_2026_check'
       and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_trace_retention_2026_check
      check (trace_retention_2026 in ('keep', 'days_90', 'days_365'));
  end if;
end $$;

comment on column public.user_profiles.trace_retention_2026 is
  'Conservation des DEUX formes de trace d''une sortie (runs.trace_points_2026 '
  'et runs.polyline_masked). ''keep'' (DÉFAUT) = rien n''est jamais effacé ; '
  '''days_90'' / ''days_365'' = les deux formes s''effacent après ce délai, '
  'compté depuis runs.started_at. Miroir de TRACE_RETENTION_CHOICES_2026 '
  '(packages/shared/src/game-rules.ts). Ne touche NI la sortie, NI ses '
  'statistiques, NI le territoire : capture_events_2026 porte sa propre '
  'géométrie.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LE JOURNAL — « QUAND UN TRACÉ A-T-IL ÉTÉ EFFACÉ, ET POURQUOI ? »
--
-- Une table, deux formes, et c'est délibéré : la question qu'on pose à ce
-- journal est UNE question (« qu'est-ce qui a effacé un tracé, et quand ? »).
-- La scinder en deux tables obligerait à les réunir à chaque lecture.
--   · `retention_job` — UNE ligne PAR PASSAGE, même à vide. C'est la seule
--     façon de distinguer « le job n'a rien trouvé » de « le job ne tourne
--     plus » (doctrine de `crew_sweep_log_2026`, 0190 §8) ;
--   · `on_demand`     — UNE ligne PAR TRACÉ effacé sur geste du propriétaire.
--     C'est la preuve d'exécution du droit à l'effacement (RGPD art. 17), et
--     elle part dans l'export RGPD du demandeur.
--
-- ⚠️ POURQUOI LE JOB N'ÉCRIT PAS UNE LIGNE PAR SORTIE PURGÉE. Ce serait
-- reconstruire, au moment même où l'on efface, un index durable de « cette
-- personne a couru ce jour-là » — la donnée que la purge est censée retirer.
-- Le joueur connaît sa préférence, l'écran de détail dit honnêtement « Tracé
-- non disponible », et l'agrégat suffit à prouver que le job tourne. Un journal
-- plus bavard aurait été une régression de vie privée déguisée en traçabilité.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.trace_purge_log_2026 (
  id          bigint generated always as identity primary key,
  ran_at      timestamptz not null default now(),
  source      text not null check (source in ('retention_job', 'on_demand')),
  -- Passage de job : l'instant de MESURE (les tests avancent l'horloge) et le
  -- décompte. `held_for_review` n'est pas un détail : sans lui, un plancher
  -- anti-triche qui retient dix dossiers ressemblerait à un job sans travail.
  measured_at          timestamptz,
  runs_purged          integer not null default 0,
  runs_held_for_review integer not null default 0,
  -- Effacement à la demande : qui, et sur quelle sortie. `on delete set null`
  -- des deux côtés — la preuve que l'effacement a eu lieu survit à la
  -- suppression de la sortie comme à celle du compte.
  user_id uuid references public.users (id) on delete set null,
  run_id  uuid references public.runs (id) on delete set null,
  -- Les deux formes ne se mélangent pas : une ligne de job sans instant de
  -- mesure, ou une ligne à la demande sans sortie, ne s'interprète pas.
  constraint trace_purge_log_2026_shape check (
    (source = 'retention_job' and measured_at is not null and run_id is null)
    or
    (source = 'on_demand' and measured_at is null and run_id is not null)
  )
);

create index if not exists trace_purge_log_2026_user_idx
  on public.trace_purge_log_2026 (user_id, ran_at desc)
  where user_id is not null;

alter table public.trace_purge_log_2026 enable row level security;
revoke all on public.trace_purge_log_2026 from public, anon, authenticated;
grant all on public.trace_purge_log_2026 to service_role;

comment on table public.trace_purge_log_2026 is
  'Le journal des effacements de tracé. `retention_job` : une ligne par passage '
  'de purge_traces_by_retention_2026, MÊME À VIDE (sinon un job mort et un job '
  'sans travail se ressemblent). `on_demand` : une ligne par tracé effacé sur '
  'geste du propriétaire (preuve RGPD art. 17, servie dans son export). Le job '
  'n''écrit VOLONTAIREMENT aucune ligne par sortie : ce serait recréer un index '
  'de « qui a couru quel jour » au moment même où l''on efface la trace.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LA LECTURE — LA MÊME RPC QUE LES TROIS AUTRES RÉGLAGES
--
-- `create or replace` à SIGNATURE IDENTIQUE : l'OID est conservé, donc les
-- grants de 0135 (authenticated, service_role) survivent. On les repose quand
-- même en fin de fichier, patron de 0136 : un `replace` qui changerait un jour
-- de propriétaire laisserait un EXECUTE hérité par PUBLIC.
--
-- Le client (`features/privacy/audience.ts`) est STRICT sur les valeurs mais
-- TOLÉRANT sur l'absence : une clé `traceRetention` manquante (serveur plus
-- ancien que l'app) rend `null`, que l'écran affiche comme « on n'a pas pu lire
-- ta préférence » — jamais comme « tout est conservé ». Dire « conservé » sans
-- que le serveur l'ait dit serait exactement le repli inventé que L19 interdit.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_privacy_settings_2026()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select case when auth.uid() is null then null else coalesce(
    (select jsonb_build_object(
       'hasProfile',true,
       'profileVisibility',p.profile_visibility,
       'mapSharing',p.map_sharing,
       'discreetMode',p.discreet_mode,
       'traceRetention',p.trace_retention_2026,
       'updatedAt',p.updated_at)
     from public.user_profiles p where p.user_id=auth.uid()),
    -- Pas de profil : on ne fabrique aucune valeur « choisie ». On rend les
    -- DÉFAUTS de colonne (0011 pour les trois premiers, 0195 pour le tracé)
    -- tels qu'ils s'appliqueraient, avec le drapeau qui dit que rien n'a été
    -- choisi. `keep` y est le fait exact : sans ligne de profil, le job de
    -- rétention ne voit rien et n'efface rien.
    jsonb_build_object(
      'hasProfile',false,
      'profileVisibility','crew',
      'mapSharing','simplified',
      'discreetMode',false,
      'traceRetention','keep',
      'updatedAt',null)) end
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. L'ÉCRITURE — UNE RPC À ELLE, PAS UN QUATRIÈME PARAMÈTRE DE 0135
--
-- `save_privacy_settings_2026(text,text,boolean)` garde SA signature. En
-- ajouter un quatrième paramètre aurait cassé tous les appels déjà déployés
-- (l'app en vol, les Edge Functions) : PostgREST résout par nom d'argument, un
-- appel à trois arguments ne trouverait plus la fonction. Et surtout : les
-- trois réglages de 0135 gouvernent CE QUE LES AUTRES VOIENT, celui-ci
-- gouverne CE QUE TOI TU GARDES. Deux décisions différentes, deux portes.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.set_trace_retention_2026(p_choice text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  -- Le même domaine que le `check` de la colonne : un refus NOMMÉ vaut mieux
  -- qu'une violation de contrainte que le client ne saurait pas traduire.
  if p_choice is null or p_choice not in ('keep', 'days_90', 'days_365') then
    raise exception 'invalid_trace_retention';
  end if;
  update public.user_profiles
     set trace_retention_2026 = p_choice,
         updated_at = now()
   where user_id = v_uid;
  -- Même doctrine que 0135 : `user_profiles.handle` est `not null unique`, on
  -- n'invente pas une identité publique pour poser un réglage. L'écran conduit
  -- à la création du profil au lieu de peindre un interrupteur qui échouerait.
  if not found then raise exception 'profile_required'; end if;
  return public.my_privacy_settings_2026();
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. L'EFFACEMENT À LA DEMANDE — IMMÉDIAT, PROPRIÉTAIRE, JOURNALISÉ
--
-- Une préférence de conservation regarde l'AVENIR. Elle ne répond pas à « je
-- veux que CETTE sortie-là n'ait plus de tracé, maintenant ». C'est cette RPC.
--
-- MÊMES COLONNES QUE LA PURGE, ET C'EST LE POINT : les deux formes partent
-- ensemble. La sortie, ses statistiques, sa capture et le territoire restent
-- intacts — `capture_events_2026` porte sa propre géométrie.
--
-- ═══ LE PLANCHER, ET POURQUOI IL PROTÈGE AUSSI CELUI QUI EFFACE ════════════
-- Tant qu'une revue anti-triche (`anticheat_reviews`, 0081) ou un recours
-- (`anticheat_appeals`) est OUVERT sur cette sortie, le tracé n'est effacé par
-- rien. Le refus est NOMMÉ (`review_open`) et l'écran le dit : « son tracé est
-- la preuve de ton recours ». Ce n'est pas une confiscation du droit à
-- l'effacement, c'est sa suspension pendant l'instruction d'une réclamation —
-- le cas que l'art. 17(3)(e) du RGPD prévoit — et elle vaut dans les deux sens :
-- sans elle, effacer la preuve serait le premier geste de qui vient d'être
-- signalé, et le joueur honnête perdrait le dossier de son propre appel.
--
-- IDEMPOTENTE : une sortie déjà sans tracé rend `already_empty`. Le journal ne
-- reçoit alors AUCUNE ligne — journaliser un effacement qui n'a rien effacé
-- gonflerait la preuve RGPD de faits qui n'ont pas eu lieu.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.delete_run_trace_2026(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_run public.runs;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  -- `for update` : deux taps rapides ne doivent pas produire deux lignes de
  -- journal pour un seul effacement.
  select * into v_run from public.runs
   where id = p_run_id and user_id = v_uid
   for update;
  -- « pas à moi » et « n'existe pas » sont le MÊME refus, et c'est voulu :
  -- les distinguer dirait à qui forge un identifiant « cette sortie existe,
  -- mais elle est à quelqu'un d'autre » — un oracle d'existence (§12).
  if not found then raise exception 'not_found'; end if;

  if exists (
    select 1 from public.anticheat_reviews r
     where r.run_id = v_run.id and r.status <> 'closed'
  ) or exists (
    select 1 from public.anticheat_appeals a
      join public.anticheat_reviews r on r.id = a.review_id
     where r.run_id = v_run.id and a.status <> 'closed'
  ) then
    raise exception 'review_open';
  end if;

  if v_run.trace_points_2026 is null and v_run.polyline_masked is null then
    return jsonb_build_object('deleted', false, 'reason', 'already_empty');
  end if;

  update public.runs
     set trace_points_2026 = null,
         polyline_masked = null
   where id = v_run.id;

  insert into public.trace_purge_log_2026 (source, user_id, run_id)
    values ('on_demand', v_uid, v_run.id);

  return jsonb_build_object('deleted', true, 'runId', v_run.id);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. PRIVILÈGES — reposés explicitement (patron 0136)
-- ════════════════════════════════════════════════════════════════════════════
revoke all on function public.my_privacy_settings_2026() from public, anon;
revoke all on function public.set_trace_retention_2026(text) from public, anon;
revoke all on function public.delete_run_trace_2026(uuid) from public, anon;
grant execute on function public.my_privacy_settings_2026() to authenticated, service_role;
grant execute on function public.set_trace_retention_2026(text) to authenticated, service_role;
grant execute on function public.delete_run_trace_2026(uuid) to authenticated, service_role;

comment on function public.my_privacy_settings_2026() is
  'Réglages de confidentialité RÉELLEMENT opposables. profile_visibility et '
  'discreet_mode gouvernent l''identité du propriétaire sur la carte (0126), '
  'map_sharing gouverne la publication du territoire (get_ownership_2026), et '
  'depuis 0195 trace_retention_2026 gouverne la conservation des DEUX formes de '
  'trace. NULL hors session. hasProfile=false quand aucune ligne user_profiles '
  'n''existe : rien n''est alors exposé et rien n''est purgé, et les valeurs '
  'rendues sont les défauts de colonne, pas un choix du joueur.';

comment on function public.set_trace_retention_2026(text) is
  'Écrit la conservation des tracés du compte appelant : keep (défaut, rien '
  'n''est jamais effacé), days_90 ou days_365. La durée s''applique aux DEUX '
  'formes (trace_points_2026 ET polyline_masked) : n''en couvrir qu''une '
  'laisserait croire à un effacement qui n''a pas eu lieu. '
  'authentication_required hors session, invalid_trace_retention hors domaine, '
  'profile_required tant qu''aucun profil n''existe.';

comment on function public.delete_run_trace_2026(uuid) is
  'Efface IMMÉDIATEMENT les deux formes de trace d''UNE sortie du compte '
  'appelant, et journalise le geste (trace_purge_log_2026, source on_demand). '
  'Ne supprime NI la sortie, NI ses statistiques, NI sa capture : '
  'capture_events_2026 porte sa propre géométrie, le territoire ne bouge pas. '
  'Refus nommés : not_found (identifiant inconnu OU sortie d''autrui — les '
  'distinguer serait un oracle d''existence), review_open (une revue ou un '
  'recours anti-triche est ouvert : le tracé est la preuve du dossier). '
  'Idempotente : une sortie déjà sans tracé rend deleted=false/already_empty '
  'sans écrire au journal.';
