-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0188 — ENTRER DANS UN CREW : une exigence mesurée, une charte acceptée,  ║
-- ║        et un message de candidature qui s'écrit enfin.                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Spécification : docs/product/GRYD_GESTION_CREW_2026_09.md (11/09/2026), §2.2,
-- §2.3, §2.5, §3.1, §3.2. Cahier de septembre (rang 0) §13.1, §13.3, §14.
--
-- ═══ LES TROIS TROUS QUE CE FICHIER BOUCHE, VÉRIFIÉS PAR LECTURE ═══════════
--  ① `crew_applications.message` (0011) EST LU par `crew_join_requests`
--     (0083:616) et n'est ÉCRIT PAR PERSONNE. `crew_join_intent` version 0083
--     insérait `(crew_id, user_id)` et rien d'autre ; la version 0093 qui l'a
--     remplacée n'insère même plus : elle ne fait que DIRE ce qu'on pourrait
--     faire. Résultat : le capitaine décide d'une entrée sur un identifiant
--     machine et un `null`. `crew_apply_2026` écrit le message.
--  ② AUCUNE EXIGENCE D'ENTRÉE MESURÉE. `crews.recruitment_status` dit COMMENT
--     on frappe (open / on_request / invite_only / closed) et rien sur QUI peut
--     entrer. Il n'existe aucun équivalent des « trophées requis » de Clash.
--  ③ AUCUNE CHARTE. `crews.description` (0084) porte les règles d'un crew, et
--     RIEN NE LES APPLIQUE ni ne prouve qu'elles ont été lues. C'est le trou de
--     Clash lui-même (spec §1.3 ③), et ce que le fondateur demande de combler.
--
-- ═══ LES CINQ DÉCISIONS DU FONDATEUR (11/09/2026), CONSIGNÉES ICI ══════════
--  1. LE RETRAIT AUTOMATIQUE EXISTE, ÉTEINT PAR DÉFAUT, avec ses trois
--     garde-fous : ① `auto_remove_after_days > 0` exige
--     `max_inactivity_days > 0` — un retrait sans avertissement préalable
--     n'existe pas ; ② il ne vise jamais un `founder` ni un `co_captain` ;
--     ③ un avertissement se LÈVE dès que le fait cesse et l'horloge repart de
--     zéro. Le garde-fou ① est appliqué ICI (`crew_rules_set_2026`, `bad_rules`),
--     les deux autres en 0190.
--  2. LE CAPITAINE VOIT LES KILOMÈTRES D'UN PROFIL FERMÉ, mais UNIQUEMENT pour
--     les mesures qu'une règle ACTIVE utilise, et seulement parce que la fiche
--     publique affiche règles et exigences AVANT l'entrée et que la charte est
--     acceptée à l'entrée. Sinon la cellule vaut `'not_shared'` — jamais `0`
--     (0189).
--  3. RE-ADHÉSION : 30 jours AU MÊME CREW après une exclusion, et RIEN ailleurs
--     (`CREW_REJOIN_AFTER_KICK_DAYS`). Écart assumé avec 0093, dont la doctrine
--     — « l'exclusion ne doit pas être une arme de blocage » — est conservée :
--     l'exclu peut rejoindre n'importe quel AUTRE crew le jour même.
--  4. UN AVERTISSEMENT EST TRANSACTIONNEL : il concerne l'appartenance, pas la
--     rétention, donc il sort du budget de §14.1 et arrive toujours. In-app
--     uniquement, JAMAIS en push (entitlement APNs retiré, ADR-013 tension 1).
--     Et parce qu'un message parti n'est pas un message lu, le retrait exige EN
--     PLUS que l'avertissement soit acquitté ou vieux de
--     `CREW_WARNING_GRACE_DAYS` (0190).
--  5. L'ENTRAIDE SE MESURE par DEUX compteurs seulement — sorties rejointes et
--     sorties proposées — affichés au capitaine, JAMAIS classés (0189). Les
--     réactions et les encouragements sont écartés : ils ne coûtent rien, donc
--     leur compteur mesure la disponibilité du pouce.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Aucune table, aucune donnée existante n'est réécrite. Trois ajouts touchent
-- des objets existants, tous par ÉLARGISSEMENT :
--   · `crew_applications` reçoit `charter_version integer` NULLABLE — tout
--     l'historique vaut `null`, qui veut dire « aucune charte à l'époque » ;
--   · `notifications.type` (0006) accepte une valeur de plus, `'crew'` ; les
--     sept valeurs existantes restent valides ;
--   · `notifications` reçoit `event_id text` NULLABLE + une unique PARTIELLE
--     `(user_id, event_id)` : c'est la déduplication de §14.3 appliquée à la
--     boîte de réception, exactement comme `notification_log_2026` (0141) la
--     porte pour le budget d'envoi.
-- Rollback : `drop` des cinq RPC et des trois tables neuves, puis remettre la
-- contrainte `notifications_type_check` de 0006.
--
-- ═══ ANTI PAY-TO-WIN (règle 10) ═════════════════════════════════════════════
-- Une exigence FILTRE une candidature. Elle n'octroie ni mètre carré, ni point,
-- ni protection, et aucun SKU d'`IAP_SKUS` ne la contourne. La SÉRIE est
-- explicitement REFUSÉE comme critère d'entrée : elle multiplie les points de
-- territoire (`STREAK_MULTIPLIER_CAP`), donc l'exiger reviendrait à filtrer sur
-- un multiplicateur de jeu.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LES CONSTANTES DE JEU, CHACUNE DANS UNE FONCTION QUI PORTE SON NOM
--    Patron de 0096 §2 et de 0182 §0 : une constante de jeu ne s'écrit pas dans
--    un `where`. SQL ne peut pas importer TypeScript ; le dépôt règle la
--    duplication par un test de DÉRIVE, jamais par une promesse — ici
--    `supabase/tests/crew_rules_2026.pglite.test.mjs`, qui lit game-rules.ts.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_charter_max_chars()
returns integer language sql immutable as $$ select 600 $$;      -- game-rules: CREW_CHARTER_MAX_CHARS

create or replace function public.crew_application_message_max()
returns integer language sql immutable as $$ select 280 $$;      -- game-rules: CREW_APPLICATION_MESSAGE_MAX

create or replace function public.crew_kick_note_max()
returns integer language sql immutable as $$ select 200 $$;      -- game-rules: CREW_KICK_NOTE_MAX

create or replace function public.crew_requirement_window_days()
returns integer language sql immutable as $$ select 28 $$;       -- game-rules: CREW_REQUIREMENT_WINDOW_DAYS

create or replace function public.crew_rejoin_after_kick_days()
returns integer language sql immutable as $$ select 30 $$;       -- game-rules: CREW_REJOIN_AFTER_KICK_DAYS

create or replace function public.crew_join_requests_per_day_max()
returns integer language sql immutable as $$ select 5 $$;        -- game-rules: CREW_JOIN_REQUESTS_PER_DAY_MAX

create or replace function public.crew_warning_grace_days()
returns integer language sql immutable as $$ select 3 $$;        -- game-rules: CREW_WARNING_GRACE_DAYS

create or replace function public.crew_min_challenge_days_max()
returns integer language sql immutable as $$ select 7 $$;        -- game-rules: CREW_MIN_CHALLENGE_DAYS_MAX

create or replace function public.crew_name_hold_after_archive_days()
returns integer language sql immutable as $$ select 30 $$;       -- game-rules: CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS

revoke all on function public.crew_charter_max_chars(), public.crew_application_message_max(),
  public.crew_kick_note_max(), public.crew_requirement_window_days(),
  public.crew_rejoin_after_kick_days(), public.crew_join_requests_per_day_max(),
  public.crew_warning_grace_days(), public.crew_min_challenge_days_max(),
  public.crew_name_hold_after_archive_days()
  from public, anon, authenticated;
grant execute on function public.crew_charter_max_chars(), public.crew_application_message_max(),
  public.crew_kick_note_max(), public.crew_requirement_window_days(),
  public.crew_rejoin_after_kick_days(), public.crew_join_requests_per_day_max(),
  public.crew_warning_grace_days(), public.crew_min_challenge_days_max(),
  public.crew_name_hold_after_archive_days()
  to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LE NIVEAU PERMANENT, EN SQL — miroir EXACT de `levelForXp2026`
--
-- POURQUOI IL FALLAIT L'ÉCRIRE : `min_level` est une exigence d'entrée, donc
-- elle est TRANCHÉE SERVEUR. Or le niveau n'existait qu'en TypeScript
-- (`packages/shared/src/progression2026.ts`) : `users.level` (0002) est une
-- colonne HÉRITÉE du barème d'avant la refonte, et s'y fier ferait juger une
-- candidature sur un chiffre que le règlement 2026 n'écrit plus.
--
-- La source unique reste le REGISTRE (`progress_accounts_2026.ledger.totalXp`,
-- 0119) : le même nombre que l'écran de progression affiche. Aucun compte de
-- progression ⇒ 0 XP ⇒ niveau 1, ce qui est la vérité et non un repli.
--
-- Formule fermée identique au TypeScript, avec ses DEUX corrections de bord :
-- sans elles, un compte pile sur un seuil (100, 220, 360 XP…) tomberait d'un
-- niveau selon l'arrondi flottant, et se verrait refuser une entrée méritée.
-- La dérive est testée : le test PGlite compare cette fonction à
-- `levelForXp2026` sur toute une plage.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.progress_xp_for_level_2026(p_level integer)
returns bigint language sql immutable set search_path = public, pg_temp as $$
  -- game-rules: PROGRESSION_RULES_2026.levelLinearXp / levelQuadraticXp
  select case when p_level is null or p_level < 1 then null
              else 100::bigint * (p_level - 1) + 10::bigint * (p_level - 1) * (p_level - 2) end;
$$;

create or replace function public.progress_level_for_xp_2026(p_xp bigint)
returns integer language plpgsql immutable set search_path = public, pg_temp as $$
declare v_level integer;
begin
  if p_xp is null or p_xp <= 0 then return 1; end if;
  -- a = levelQuadraticXp (10), b = levelLinearXp - a (90).
  v_level := floor((sqrt(90::numeric * 90 + 4 * 10 * p_xp) - 90) / 20)::integer + 1;
  if public.progress_xp_for_level_2026(v_level + 1) <= p_xp then v_level := v_level + 1; end if;
  if public.progress_xp_for_level_2026(v_level) > p_xp then v_level := v_level - 1; end if;
  return greatest(v_level, 1);
end $$;

comment on function public.progress_level_for_xp_2026(bigint) is
  'Niveau permanent 2026 à partir des XP confirmés du registre — miroir EXACT '
  'de levelForXp2026 (packages/shared/src/progression2026.ts), dérive testée en '
  'PGlite. NE LIT PAS users.level, colonne héritée du barème d''avant la refonte.';

revoke all on function public.progress_xp_for_level_2026(integer),
  public.progress_level_for_xp_2026(bigint) from public, anon, authenticated;
grant execute on function public.progress_xp_for_level_2026(integer),
  public.progress_level_for_xp_2026(bigint) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LA BOÎTE DE RÉCEPTION ACCEPTE LES FAITS DE CREW
--
-- ═══ POURQUOI `public.notifications` (0006) ET PAS UNE TABLE NEUVE ══════════
-- Elle EST déjà la boîte de réception in-app : RLS propriétaire seul en
-- lecture, `grant update (read_at)` au seul concerné, insertion réservée aux
-- jobs, index de non-lus, et publication temps réel (0020). En créer une
-- seconde aurait donné deux inbox à réconcilier — exactement le doublon que
-- la spec refuse pour `crew_requests` (§3.1).
--
-- ═══ POURQUOI LA LIGNE EST TOUJOURS ÉCRITE, MÊME SI LE BUDGET EST ÉPUISÉ ════
-- `claim_notification_2026` (0141) arbitre les SOLLICITATIONS : un push, un
-- e-mail — quelque chose qui va CHERCHER quelqu'un. Une ligne de boîte de
-- réception ne va chercher personne : c'est l'état de l'application, que le
-- joueur consulte quand il ouvre l'app. La soumettre au budget hebdomadaire
-- reviendrait à ce qu'un membre soit exclu sans que l'app ait jamais gardé la
-- trace de son avertissement — le mensonge exact que L8 interdit, et le risque
-- que la décision 4 nomme. `notification_log_2026` n'est donc PAS touchée par
-- ce lot : aucun canal distant n'existe (entitlement APNs retiré), et consommer
-- un budget pour un message que rien n'emporte ferait taire de vraies
-- sollicitations plus tard.
--
-- La DÉDUPLICATION de §14.3, elle, s'applique : `event_id` + unique partielle.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.notifications
  add column if not exists event_id text;

comment on column public.notifications.event_id is
  'Identifiant d''événement §14.3, NULLABLE (tout l''historique vaut null). '
  'unique(user_id, event_id) partielle = la déduplication de la boîte de '
  'réception : deux passages du même job n''écrivent jamais deux fois le même '
  'fait. Écrit par crew_notify_2026 (0188).';

create unique index if not exists notifications_user_event_unique
  on public.notifications (user_id, event_id) where event_id is not null;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('steal', 'decay_warning', 'streak', 'digest', 'reward', 'season', 'system', 'crew'));

-- Le catalogue FERMÉ de §3.4, miroir de CREW_NOTIFICATION_EVENTS_2026.
-- Un événement inconnu LÈVE : une notification de crew hors catalogue serait
-- une catégorie de message que personne n'a réglée dans ses préférences.
create or replace function public.crew_notification_event_2026(p_event text)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  -- game-rules: CREW_NOTIFICATION_EVENTS_2026 (catégorie `crew` = §14.1)
  select case p_event
    when 'application_received' then jsonb_build_object('transactional', false, 'priority', 3, 'prefix', 'crew_application_received:')
    when 'invited'              then jsonb_build_object('transactional', false, 'priority', 2, 'prefix', 'crew_invited:')
    when 'charter_updated'      then jsonb_build_object('transactional', false, 'priority', 4, 'prefix', 'crew_charter_updated:')
    when 'warning_issued'       then jsonb_build_object('transactional', true,  'priority', 2, 'prefix', 'crew_warning_issued:')
    when 'removal_imminent'     then jsonb_build_object('transactional', true,  'priority', 1, 'prefix', 'crew_removal_imminent:')
    when 'removed'              then jsonb_build_object('transactional', true,  'priority', 1, 'prefix', 'crew_removed:')
    when 'dissolved'            then jsonb_build_object('transactional', true,  'priority', 1, 'prefix', 'crew_dissolved:')
    else null
  end;
$$;

/**
 * Écrit UN fait de crew dans la boîte de réception du destinataire.
 *
 * AUCUNE PHRASE N'EST ÉCRITE EN BASE, et c'est la décision de forme la plus
 * importante du fichier : le serveur écrit un ÉVÉNEMENT et ses paramètres
 * (`crewId`, `crewName`, `reason`, `deadline`), la copie vit dans le catalogue
 * typé du mobile où `Entry = Record<Locale, string>` impose les cinq langues
 * (lot Q3). Écrire du français ici l'aurait figé en une seule langue (L18).
 *
 * Rend `true` si la ligne a été écrite, `false` si le fait était déjà là
 * (déduplication §14.3). Ne lève JAMAIS pour un destinataire inconnu : un
 * compte supprimé entre-temps ne doit pas faire échouer une exclusion.
 */
create or replace function public.crew_notify_2026(
  p_user_id   uuid,
  p_event     text,
  p_crew_id   uuid,
  p_event_key text,
  p_payload   jsonb default '{}'::jsonb,
  p_at        timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_def   jsonb := public.crew_notification_event_2026(p_event);
  v_name  text;
  v_rows  integer;
begin
  if v_def is null then
    raise exception 'crew_notify_2026: événement hors catalogue (%)', p_event;
  end if;
  if p_user_id is null then return false; end if;
  if not exists (select 1 from public.users u where u.id = p_user_id) then return false; end if;

  select c.name into v_name from public.crews c where c.id = p_crew_id;

  insert into public.notifications (user_id, type, priority, payload, created_at, event_id)
  values (
    p_user_id,
    'crew',
    (v_def->>'priority')::smallint,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'event', p_event, 'crewId', p_crew_id, 'crewName', v_name,
      'transactional', (v_def->>'transactional')::boolean),
    p_at,
    (v_def->>'prefix') || coalesce(p_event_key, p_crew_id::text)
  )
  on conflict (user_id, event_id) where event_id is not null do nothing;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

comment on function public.crew_notify_2026(uuid, text, uuid, text, jsonb, timestamptz) is
  'Écrit UN fait de crew dans la boîte de réception (public.notifications, '
  'type ''crew''). Catalogue FERMÉ (CREW_NOTIFICATION_EVENTS_2026), dédupliqué '
  'par event_id. N''écrit AUCUNE phrase : la copie 5 langues vit dans le '
  'catalogue typé du mobile. Ne consomme PAS le budget §14.1 — une boîte de '
  'réception n''est pas une sollicitation, et un membre ne doit jamais être '
  'retiré sans que l''app ait gardé trace de son avertissement.';

revoke all on function public.crew_notification_event_2026(text),
  public.crew_notify_2026(uuid, text, uuid, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.crew_notification_event_2026(text),
  public.crew_notify_2026(uuid, text, uuid, text, jsonb, timestamptz) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. LE JOURNAL DES DÉCISIONS — append-only
--
-- 0093 le disait en toutes lettres dans son « ce qui reste en suspens » :
-- « AUCUN JOURNAL. Qui a promu qui, et quand, n'est pas conservé au-delà de
-- role_since et removed_by. Un véritable audit de modération de crew reste à
-- écrire. » Le voici, borné à ce que ce lot décide vraiment.
--
-- APPEND-ONLY : aucune RPC n'expose de suppression ni de mise à jour. Un
-- journal qu'on peut réécrire ne prouve rien, et c'est LUI qui garde le nom de
-- qui a décidé — nom que la notification de l'exclu ne porte JAMAIS (§2.5).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.crew_decisions_2026 (
  id         bigint generated always as identity primary key,
  crew_id    uuid not null references public.crews (id) on delete cascade,
  kind       text not null check (kind in
               ('charter', 'rules', 'application', 'warning', 'removal', 'dissolution')),
  -- `null` = LE SERVEUR a décidé (job d'inactivité). Ce n'est pas un trou :
  -- c'est la seule façon honnête d'écrire « automatique » dans un journal.
  actor_id   uuid references public.users (id) on delete set null,
  target_id  uuid references public.users (id) on delete set null,
  reason     text,
  detail     jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now()
);
create index if not exists crew_decisions_2026_crew_idx
  on public.crew_decisions_2026 (crew_id, decided_at desc);

comment on table public.crew_decisions_2026 is
  'Journal APPEND-ONLY des décisions de crew (charte, règles, candidatures, '
  'avertissements, exclusions, dissolution). actor_id NULL = le serveur (job). '
  'Lu par crew_decisions_log_2026 (0189), réservé aux rôles CREW_PERMISSIONS.kick.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. LES RÈGLES ET LA CHARTE D'UN CREW
--
-- DEUX OBJETS, PAS UN, et c'est la décision centrale de la spec (§2.3) :
--   · LA CHARTE se LIT. Le serveur ne l'applique pas, il prouve qu'elle a été
--     lue et acceptée, avec sa VERSION. Un membre qui refuse une nouvelle
--     version RESTE MEMBRE : transformer un refus en exclusion serait une
--     pression punitive automatique, et la charte n'est pas un contrat.
--   · LES RÈGLES s'APPLIQUENT. Quatre réglages, tous à zéro par défaut, tous
--     appliqués par le job quotidien (0190). Zéro veut dire « règle éteinte »,
--     jamais « seuil de zéro ».
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.crew_rules_2026 (
  crew_id         uuid primary key references public.crews (id) on delete cascade,
  -- NULL = aucune charte. JAMAIS la chaîne vide : un seul encodage du vide,
  -- même doctrine que `crews.description` (0084).
  charter         text check (charter is null or char_length(charter) between 1 and 600),
  charter_version integer not null default 1 check (charter_version >= 1),
  -- NULL = AUCUNE charte n'a JAMAIS été écrite sur ce crew. C'est ce qui permet
  -- à la PREMIÈRE charte d'être la version 1 : sans cette colonne, un capitaine
  -- qui règle d'abord ses seuils (donc crée la ligne) verrait sa première
  -- charte naître en version 2, et « version 2 » raconterait une modification
  -- qui n'a jamais eu lieu. Elle sert aussi au cas inverse : une charte
  -- retirée puis réécrite DOIT changer de version, sans quoi les acceptations
  -- de l'ancien texte vaudraient pour le nouveau.
  charter_set_at  timestamptz,
  -- game-rules: CREW_REQUIREMENT_DEFAULTS — `{}` VAUT « aucune exigence ».
  requirements    jsonb not null default '{}'::jsonb,
  -- game-rules: CREW_ENFORCEMENT_DEFAULTS — `{}` VAUT « toutes règles éteintes ».
  enforcement     jsonb not null default '{}'::jsonb,
  updated_by      uuid references public.users (id) on delete set null,
  updated_at      timestamptz not null default now()
);

comment on table public.crew_rules_2026 is
  'Charte (texte VERSIONNÉ, lu, jamais appliqué) + exigences d''entrée (mesurées '
  'serveur) + règles appliquées par le job quotidien. Absence de ligne = crew '
  'sans charte ni exigence ni règle : l''état par défaut de TOUS les crews '
  'existants, et il n''est pas rétro-fitté.';

create table if not exists public.crew_rule_acceptances_2026 (
  crew_id         uuid not null references public.crews (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  charter_version integer not null check (charter_version >= 1),
  accepted_at     timestamptz not null default now(),
  primary key (crew_id, user_id, charter_version)
);

comment on table public.crew_rule_acceptances_2026 is
  'Preuve HORODATÉE qu''une version précise de la charte a été acceptée. La clé '
  'porte la version : accepter la v3 n''efface pas la trace de la v1.';

-- `crew_applications` porte enfin la version de charte acceptée à la
-- candidature. NULLABLE : tout l'historique vaut `null` = « aucune charte à
-- l'époque », ce qui est vrai et ne se devine pas.
alter table public.crew_applications
  add column if not exists charter_version integer;

comment on column public.crew_applications.charter_version is
  'Version de la charte acceptée AU MOMENT de la candidature (0188). NULL = le '
  'crew n''avait pas de charte, ou la candidature précède 0188.';

-- ═══ QUI A MIS FIN À UNE ADHÉSION, QUAND CE N'EST PERSONNE ════════════════
-- `crew_members.removed_by` (0093) répond « qui a exclu », et `null` y veut dire
-- « départ VOLONTAIRE » — c'est ce `null` que `join_crew_by_code`,
-- `crew_join_intent` et `crew_apply_2026` lisent pour n'appliquer le cooldown de
-- changement de crew qu'à celui qui saute de crew en crew.
--
-- LE RETRAIT AUTOMATIQUE (0190) N'A PAS D'AUTEUR : le job n'est pas une
-- personne, et lui inventer un compte système écrirait un humain qui n'existe
-- pas. Laisser `removed_by` à `null` aurait fait passer un membre RETIRÉ pour un
-- membre PARTI — donc lui aurait infligé le cooldown de 7 jours que 0093 refuse
-- justement d'infliger à quelqu'un qu'on met dehors, et aurait annulé son délai
-- de re-adhésion. Un booléen sépare les deux cas sans mentir sur aucun.
alter table public.crew_members
  add column if not exists removed_by_server boolean not null default false;

comment on column public.crew_members.removed_by_server is
  'true = adhésion close PAR LE SERVEUR (retrait automatique du job '
  'd''inactivité, 0190). removed_by reste NULL parce qu''aucune personne n''a '
  'décidé. Un départ est VOLONTAIRE si et seulement si removed_by is null ET '
  'removed_by_server est false.';

-- ═══ RLS — refus par DÉFAUT, ouvertures par RPC uniquement ═════════════════
-- Doctrine de 0090 §2 et 0141 : RLS activée SANS policy permissive, plus la
-- révocation des privilèges. Les deux mécanismes échouent différemment — un
-- grant posé par erreur ne rouvre rien sans policy, et l'inverse. Tout passe
-- par les RPC SECURITY DEFINER, qui arbitrent.
--
-- ⚠ PGlite ne PROUVE PAS cet effet (superutilisateur) : le test vérifie les
-- privilèges au catalogue. La preuve réelle est `npm run verify:rls` après push.
alter table public.crew_decisions_2026        enable row level security;
alter table public.crew_rules_2026            enable row level security;
alter table public.crew_rule_acceptances_2026 enable row level security;
revoke all on public.crew_decisions_2026, public.crew_rules_2026,
  public.crew_rule_acceptances_2026 from public, anon, authenticated;
grant all on public.crew_decisions_2026, public.crew_rules_2026,
  public.crew_rule_acceptances_2026 to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. LES MESURES D'UNE PERSONNE — cinq faits, aucun classement
--
-- Fonction INTERNE : elle rend les mesures de N'IMPORTE QUEL compte, donc elle
-- n'est appelable par aucun client. Les deux RPC qui l'utilisent l'appellent
-- toujours SUR L'APPELANT LUI-MÊME (`crew_eligibility_2026`, `crew_apply_2026`)
-- ou sur un membre du crew de l'appelant, sous la règle de vie privée de 0189.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_member_measures_2026(
  p_user_id uuid,
  p_at      timestamptz default now()
) returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with win as (
    select p_at - make_interval(days => public.crew_requirement_window_days()) as since
  ),
  r as (
    select rr.distance_m, rr.started_at, rr.activity
    from public.runs rr, win w
    where rr.user_id = p_user_id
      and rr.started_at >= w.since
      -- Une sortie REJETÉE ou SIGNALÉE ne compte pour aucune exigence : elle
      -- n'a pas produit de territoire non plus.
      and rr.status in ('valid', 'partial')
  )
  select jsonb_build_object(
    -- game-rules: PROGRESSION_RULES_2026 — le registre 2026, pas users.level.
    'level', public.progress_level_for_xp_2026(coalesce(
      (select (pa.ledger->>'totalXp')::bigint from public.progress_accounts_2026 pa
        where pa.user_id = p_user_id), 0)),
    'distanceKm28d', round((coalesce((select sum(r.distance_m) from r), 0) / 1000.0)::numeric, 2),
    'activeDays28d', (
      -- Journées DISTINCTES à Paris : deux sorties le même jour font un jour.
      select count(distinct (r.started_at at time zone 'Europe/Paris')::date)::integer from r),
    'cityId', (select u.city_id from public.users u where u.id = p_user_id),
    -- Discipline PRATIQUÉE : la spec §2.2 la lit sur les boucles PUBLIÉES —
    -- c'est le seul fait qui dit « cette personne joue à ce sport ici ».
    'activities', coalesce((
      select jsonb_agg(distinct e.activity)
      from public.capture_events_2026 e, win w
      where e.owner_id = p_user_id and e.status = 'published' and e.closed_at >= w.since
    ), '[]'::jsonb),
    'lastRunAt', (select max(rr.started_at) from public.runs rr
                  where rr.user_id = p_user_id and rr.status in ('valid', 'partial'))
  );
$$;

comment on function public.crew_member_measures_2026(uuid, timestamptz) is
  'Les CINQ faits que les exigences d''entrée mesurent (§2.2), sur '
  'CREW_REQUIREMENT_WINDOW_DAYS jours glissants. Aucun rang, aucune allure, '
  'aucun chrono, aucune surface : le cahier les exclut de toute comparaison, et '
  '0126 pose que le titre territorial est individuel. INTERNE.';

revoke all on function public.crew_member_measures_2026(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.crew_member_measures_2026(uuid, timestamptz) to service_role;

-- Ce qui MANQUE à une personne face aux exigences d'un crew, en clair.
-- Rend un tableau `[{key, need, have, unit}]`, VIDE quand tout est satisfait.
-- L'écran en tire « il te manque 2 km cette semaine » : jamais « tu n'es pas
-- éligible » tout seul, qui ne dit ni quoi ni de combien (§4.2 H).
create or replace function public.crew_missing_requirements_2026(
  p_requirements jsonb,
  p_measures     jsonb
) returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(m.row order by m.ord), '[]'::jsonb)
  from (
    select 1 as ord, jsonb_build_object(
      'key', 'min_level', 'need', (p_requirements->>'min_level')::numeric,
      'have', (p_measures->>'level')::numeric, 'unit', 'level') as row
    where coalesce((p_requirements->>'min_level')::numeric, 0) > 0
      and coalesce((p_measures->>'level')::numeric, 1) < (p_requirements->>'min_level')::numeric
    union all
    select 2, jsonb_build_object(
      'key', 'min_distance_km_28d', 'need', (p_requirements->>'min_distance_km_28d')::numeric,
      'have', (p_measures->>'distanceKm28d')::numeric, 'unit', 'km')
    where coalesce((p_requirements->>'min_distance_km_28d')::numeric, 0) > 0
      and coalesce((p_measures->>'distanceKm28d')::numeric, 0) < (p_requirements->>'min_distance_km_28d')::numeric
    union all
    select 3, jsonb_build_object(
      'key', 'min_active_days_28d', 'need', (p_requirements->>'min_active_days_28d')::numeric,
      'have', (p_measures->>'activeDays28d')::numeric, 'unit', 'days')
    where coalesce((p_requirements->>'min_active_days_28d')::numeric, 0) > 0
      and coalesce((p_measures->>'activeDays28d')::numeric, 0) < (p_requirements->>'min_active_days_28d')::numeric
    union all
    select 4, jsonb_build_object(
      'key', 'city_id', 'need', to_jsonb(p_requirements->>'city_id'),
      'have', to_jsonb(p_measures->>'cityId'), 'unit', 'city')
    where nullif(p_requirements->>'city_id', '') is not null
      and coalesce(p_measures->>'cityId', '') <> (p_requirements->>'city_id')
    union all
    select 5, jsonb_build_object(
      'key', 'activity', 'need', to_jsonb(p_requirements->>'activity'),
      'have', coalesce(p_measures->'activities', '[]'::jsonb), 'unit', 'activity')
    where nullif(p_requirements->>'activity', '') is not null
      and not (coalesce(p_measures->'activities', '[]'::jsonb) ? (p_requirements->>'activity'))
  ) m;
$$;

revoke all on function public.crew_missing_requirements_2026(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.crew_missing_requirements_2026(jsonb, jsonb) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. `crew_rules_get_2026` — CE QUE CE CREW DEMANDE, LU AVANT D'ENTRER
--
-- OUVERTE À TOUT COMPTE CONNECTÉ, membre ou non, et ce n'est pas une largesse :
-- la résolution de vie privée du §2.4 ne tient QUE SI la fiche publique affiche
-- exigences ET règles AVANT l'entrée (spec §5.3, risque 3). Un capitaine ne
-- peut pas voir les kilomètres d'un profil fermé au motif d'une règle que le
-- candidat n'aurait pas pu lire.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_rules_get_2026(p_crew_id uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_row  public.crew_rules_2026%rowtype;
  v_mine integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_crew_id is null or not exists (select 1 from public.crews c where c.id = p_crew_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_row from public.crew_rules_2026 r where r.crew_id = p_crew_id;

  select max(a.charter_version) into v_mine
  from public.crew_rule_acceptances_2026 a
  where a.crew_id = p_crew_id and a.user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    -- AUCUNE ligne = aucune charte, aucune exigence, aucune règle. C'est l'état
    -- de tous les crews existants, et il se dit tel quel : `null` et `{}`,
    -- jamais une charte vide inventée pour remplir la forme.
    'charter',           v_row.charter,
    'charterVersion',    coalesce(v_row.charter_version, 1),
    'requirements',      coalesce(v_row.requirements, '{}'::jsonb),
    'enforcement',       coalesce(v_row.enforcement, '{}'::jsonb),
    'updatedAt',         v_row.updated_at,
    'myAcceptedVersion', v_mine
  );
end;
$$;

comment on function public.crew_rules_get_2026(uuid) is
  'Charte, exigences et règles d''un crew, plus la version de charte que '
  'l''appelant a acceptée. Ouverte à tout compte connecté : la fiche publique '
  'DOIT les montrer avant l''entrée (§2.8), sinon l''acceptation de charte '
  'serait un consentement fictif.';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. `crew_rules_set_2026` — LE FONDATEUR ARME, ET VOIT CE QU'IL ARME
--
-- game-rules: CREW_PERMISSIONS.changeSettings === ['founder'].
--
-- LA VERSION DE CHARTE NE MONTE QUE SI LE TEXTE CHANGE. Jamais pour un
-- changement de seuil : sans cette règle, régler « inactivité maximale » de 20
-- à 21 jours redemanderait à cinquante personnes d'accepter un texte identique,
-- et l'acceptation ne voudrait plus rien dire.
--
-- LES SIX REFUS `bad_rules`, avec leur `detail` pour que l'écran dise LEQUEL :
--   a. charte de plus de `crew_charter_max_chars()` ;
--   b. clé inconnue dans `requirements` ou `enforcement` — un catalogue fermé
--      qui accepterait n'importe quelle clé serait un champ libre déguisé ;
--   c. exigence ou réglage NÉGATIF ;
--   d. `min_challenge_days` supérieur à la durée d'un défi ;
--   e. commune inconnue de `city_zones` ;
--   f. GARDE-FOU ① DE LA DÉCISION 1 : `auto_remove_after_days > 0` avec
--      `max_inactivity_days = 0`. Un retrait sans avertissement préalable
--      n'existe pas, et ce n'est pas à l'écran de l'empêcher.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_rules_set_2026(
  p_charter      text default null,
  p_requirements jsonb default null,
  p_enforcement  jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_charter  text := nullif(btrim(coalesce(p_charter, '')), '');
  v_req      jsonb := coalesce(p_requirements, '{}'::jsonb);
  v_enf      jsonb := coalesce(p_enforcement, '{}'::jsonb);
  v_old      public.crew_rules_2026%rowtype;
  v_version  integer;
  v_bumped   boolean := false;
  v_key      text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.changeSettings
  if v_role is distinct from 'founder' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- (a) charte
  if v_charter is not null and char_length(v_charter) > public.crew_charter_max_chars() then
    return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'charter_too_long');
  end if;

  -- (b) catalogues FERMÉS. game-rules: CREW_REQUIREMENT_KEYS / CREW_ENFORCEMENT_KEYS
  if jsonb_typeof(v_req) <> 'object' or jsonb_typeof(v_enf) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'not_an_object');
  end if;
  for v_key in select jsonb_object_keys(v_req) loop
    if v_key not in ('min_level', 'min_distance_km_28d', 'min_active_days_28d', 'city_id', 'activity') then
      return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'unknown_requirement', 'key', v_key);
    end if;
  end loop;
  for v_key in select jsonb_object_keys(v_enf) loop
    if v_key not in ('min_weekly_outings', 'min_challenge_days', 'max_inactivity_days', 'auto_remove_after_days') then
      return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'unknown_enforcement', 'key', v_key);
    end if;
  end loop;

  -- (c) rien de négatif, rien de non numérique.
  for v_key in select unnest(array['min_level', 'min_distance_km_28d', 'min_active_days_28d']) loop
    if v_req ? v_key then
      if jsonb_typeof(v_req->v_key) <> 'number' or (v_req->>v_key)::numeric < 0 then
        return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'negative_requirement', 'key', v_key);
      end if;
    end if;
  end loop;
  for v_key in select unnest(array['min_weekly_outings', 'min_challenge_days',
                                   'max_inactivity_days', 'auto_remove_after_days']) loop
    if v_enf ? v_key then
      if jsonb_typeof(v_enf->v_key) <> 'number' or (v_enf->>v_key)::numeric < 0 then
        return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'negative_enforcement', 'key', v_key);
      end if;
    end if;
  end loop;

  -- (d) un défi dure CHALLENGE_RULES_2026.durationDays jours ; on ne peut pas
  --     en exiger plus que ce qu'il contient.
  if coalesce((v_enf->>'min_challenge_days')::numeric, 0) > public.crew_min_challenge_days_max() then
    return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'challenge_days_over_max');
  end if;

  -- (e) commune RÉELLE. Zéro donnée inventée : une exigence de commune qui ne
  --     désigne aucune ligne de `city_zones` filtrerait sur un fantôme.
  if nullif(v_req->>'city_id', '') is not null
     and not exists (select 1 from public.city_zones z where z.city_id = v_req->>'city_id') then
    return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'unknown_city');
  end if;
  if nullif(v_req->>'activity', '') is not null
     and (v_req->>'activity') not in ('run', 'bike') then   -- game-rules: ACTIVITIES
    return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'unknown_activity');
  end if;

  -- (f) GARDE-FOU ① : jamais de retrait sans avertissement préalable.
  if coalesce((v_enf->>'auto_remove_after_days')::numeric, 0) > 0
     and coalesce((v_enf->>'max_inactivity_days')::numeric, 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_rules', 'detail', 'removal_without_warning');
  end if;

  select * into v_old from public.crew_rules_2026 r where r.crew_id = v_crew_id for update;

  v_version := coalesce(v_old.charter_version, 1);
  -- `is distinct from` : `null → texte` et `texte → null` sont des changements,
  -- `null → null` n'en est pas un.
  if v_charter is distinct from v_old.charter then
    -- La toute PREMIÈRE charte est la version 1, pas la version 2 : incrémenter
    -- ferait croire à une modification qui n'a jamais eu lieu. `charter_set_at`
    -- est le SEUL témoin fiable de « une charte a déjà existé ici » — la
    -- présence de la ligne ne l'est pas, puisqu'un réglage de seuil la crée.
    if v_old.charter_set_at is not null then v_version := v_version + 1; end if;
    v_bumped := true;
  end if;

  insert into public.crew_rules_2026 (crew_id, charter, charter_version, charter_set_at,
                                      requirements, enforcement, updated_by, updated_at)
  values (v_crew_id, v_charter, v_version,
          case when v_charter is not null then now() else v_old.charter_set_at end,
          v_req, v_enf, v_uid, now())
  on conflict (crew_id) do update
    set charter = excluded.charter, charter_version = excluded.charter_version,
        charter_set_at = excluded.charter_set_at,
        requirements = excluded.requirements, enforcement = excluded.enforcement,
        updated_by = excluded.updated_by, updated_at = excluded.updated_at;

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, reason, detail)
  values (v_crew_id, case when v_bumped then 'charter' else 'rules' end, v_uid, null,
          jsonb_build_object('charterVersion', v_version, 'requirements', v_req, 'enforcement', v_enf));

  -- Le fondateur qui écrit la charte l'a lue : son acceptation est écrite dans
  -- la même transaction. Sans cela, le seul membre certain de connaître le
  -- texte serait le seul à figurer comme ne l'ayant pas accepté.
  if v_charter is not null then
    insert into public.crew_rule_acceptances_2026 (crew_id, user_id, charter_version)
    values (v_crew_id, v_uid, v_version)
    on conflict do nothing;
  end if;

  -- §3.4 `charter_updated` — aux MEMBRES, non transactionnel, une fois par
  -- version (l'`event_id` porte la version : rejouer n'écrit rien).
  if v_bumped and v_charter is not null then
    perform public.crew_notify_2026(cm.user_id, 'charter_updated', v_crew_id,
      v_crew_id::text || ':' || v_version::text,
      jsonb_build_object('charterVersion', v_version))
    from public.crew_members cm
    where cm.crew_id = v_crew_id and cm.left_at is null and cm.user_id <> v_uid;
  end if;

  return jsonb_build_object('ok', true, 'charterVersion', v_version, 'bumped', v_bumped);
end;
$$;

comment on function public.crew_rules_set_2026(text, jsonb, jsonb) is
  'Écrit charte, exigences et règles. Founder SEUL '
  '(CREW_PERMISSIONS.changeSettings). Incrémente charter_version SI ET '
  'SEULEMENT SI le texte change — jamais pour un seuil. Refus bad_rules avec '
  'son `detail` : charte trop longue, clé hors catalogue, valeur négative, '
  'min_challenge_days au-dessus de la durée d''un défi, commune ou discipline '
  'inconnue, et retrait automatique sans avertissement préalable.';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. `crew_eligibility_2026` — CE QUI ME MANQUE, À MOI SEUL
--
-- LE DÉTAIL NE SORT JAMAIS VERS LE CAPITAINE. C'est la doctrine déjà écrite
-- dans 0083 §6 (« on décide d'une entrée, on n'audite pas une personne ») : le
-- capitaine apprend qu'une candidature est recevable, jamais combien de
-- kilomètres il manquait à quelqu'un.
--
-- LA PORTE HUMAINE : `invitesBypass` dit en clair que les exigences ne valent
-- QUE pour une candidature spontanée. Une invitation à jeton (0090) et un ajout
-- direct par un officier les OUTREPASSENT — sans cette porte, le seuil devient
-- un mur (leçon ② de Clash, spec §1.3).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_eligibility_2026(p_crew_id uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_rules    public.crew_rules_2026%rowtype;
  v_measures jsonb;
  v_missing  jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_crew_id is null or not exists (select 1 from public.crews c where c.id = p_crew_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_rules from public.crew_rules_2026 r where r.crew_id = p_crew_id;
  v_measures := public.crew_member_measures_2026(v_uid, now());
  v_missing := public.crew_missing_requirements_2026(coalesce(v_rules.requirements, '{}'::jsonb), v_measures);

  return jsonb_build_object(
    'ok', true,
    'eligible', jsonb_array_length(v_missing) = 0,
    'missing', v_missing,
    'charterVersion', coalesce(v_rules.charter_version, 1),
    'charterRequired', v_rules.charter is not null,
    -- La porte humaine, DITE : l'écran l'écrit sous la liste des conditions.
    'invitesBypass', true
  );
end;
$$;

comment on function public.crew_eligibility_2026(uuid) is
  'Ce qu''il MANQUE à l''APPELANT pour candidater, critère par critère '
  '({key,need,have,unit}) — jamais un « non éligible » nu. Ne rend QUE ses '
  'propres mesures : le capitaine n''en reçoit aucun détail (doctrine 0083 §6). '
  'invitesBypass=true : une invitation OUTREPASSE toujours ces exigences.';

-- ════════════════════════════════════════════════════════════════════════════
-- 10. `crew_apply_2026` — LE MESSAGE S'ÉCRIT ENFIN
--
-- ONZE PORTES, DANS CET ORDRE, chacune avec son refus NOMMÉ. L'ordre n'est pas
-- décoratif : les exigences et la charte d'un crew ne sont évaluées qu'APRÈS
-- son mode d'accueil, pour qu'un crew `invite_only` ne réponde jamais autre
-- chose que « sur invitation ».
--   1 signé · 2 crew existant · 3 crew vivant · 4 déjà membre / membre ailleurs
--   5 accueil · 6 délai global · 7 délai de re-adhésion À CE CREW · 8 déjà en
--   attente · 9 plafond quotidien · 10 crew plein · 11 exigences · 12 charte.
--
-- LE DÉLAI DE RE-ADHÉSION SE LIT SUR `crew_members`, PAS SUR `crew_kicks_2026`
-- (0189), ET C'EST DÉLIBÉRÉ : `removed_by` existe depuis 0093, donc la règle
-- vaut AUSSI pour les exclusions prononcées avant que ce lot n'existe. La ligne
-- de `crew_kicks_2026` est le JOURNAL du geste, elle n'en est pas l'autorité.
-- `removed_by_server` (ci-dessus) complète la lecture pour le retrait
-- automatique, qui n'a pas d'auteur humain.
--
-- `recruitment_status = 'open'` ⇒ entrée IMMÉDIATE, et l'acceptation de charte
-- est écrite dans la MÊME transaction : on ne peut pas être membre d'un crew
-- dont on n'a pas accepté la charte.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_apply_2026(
  p_crew_id         uuid,
  p_message         text default null,
  p_charter_version integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_crew         public.crews%rowtype;
  v_rules        public.crew_rules_2026%rowtype;
  v_msg          text := nullif(btrim(coalesce(p_message, '')), '');
  v_active_count integer;
  v_last_left    timestamptz;
  v_days_left    integer;
  v_kick_at      timestamptz;
  v_today        integer;
  v_measures     jsonb;
  v_missing      jsonb;
  v_version      integer;
begin
  -- 1. Session.
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- 2. Le crew existe.
  select * into v_crew from public.crews c where c.id = p_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Message trop long : refusé AVANT tout le reste, sinon on ferait payer au
  -- candidat un aller-retour de vérification pour rien.
  if v_msg is not null and char_length(v_msg) > public.crew_application_message_max() then
    return jsonb_build_object('ok', false, 'reason', 'bad_message',
      'max', public.crew_application_message_max());
  end if;

  -- 4a. Déjà membre de CE crew : le geste a abouti (idempotence).
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = p_crew_id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'effect', 'joined');
  end if;

  -- 3. Crew VIVANT. Aucun membre actif ⇒ aucun chef ⇒ personne pour trancher
  --    la candidature. Même motif que `join_crew_by_code` (0093 §7).
  perform 1 from public.crews c where c.id = p_crew_id for update;
  select count(*) into v_active_count
  from public.crew_members cm where cm.crew_id = p_crew_id and cm.left_at is null;
  if v_active_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'dead_crew');
  end if;

  -- 4b. Membre d'un AUTRE crew : on refuse au lieu de déplacer en silence.
  if exists (
    select 1 from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  -- 5. Accueil. `closed` et `invite_only` : aucun chemin depuis la découverte.
  if v_crew.recruitment_status in ('closed', 'invite_only') then
    return jsonb_build_object('ok', false, 'reason', 'closed',
      'recruitmentStatus', v_crew.recruitment_status);
  end if;

  -- 6. Délai global — départs VOLONTAIRES seulement (0093 : une exclusion
  --    n'arme pas le cooldown, qui vise le nomadisme et non la personne).
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null
    and cm.removed_by is null and cm.removed_by_server = false;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- 7. Délai de re-adhésion À CE CREW après exclusion (décision 3).
  select max(cm.left_at) into v_kick_at
  from public.crew_members cm
  where cm.user_id = v_uid and cm.crew_id = p_crew_id
    and (cm.removed_by is not null or cm.removed_by_server);
  if v_kick_at is not null
     and v_kick_at > now() - make_interval(days => public.crew_rejoin_after_kick_days()) then
    return jsonb_build_object(
      'ok', false, 'reason', 'cooldown',
      'rejoinAllowedAt', v_kick_at + make_interval(days => public.crew_rejoin_after_kick_days()),
      'daysLeft', ceil(extract(epoch from (
        v_kick_at + make_interval(days => public.crew_rejoin_after_kick_days()) - now())) / 86400.0));
  end if;

  -- 8. Déjà en attente : le même état, pas une erreur.
  if exists (
    select 1 from public.crew_applications ca
    where ca.crew_id = p_crew_id and ca.user_id = v_uid and ca.status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'pending');
  end if;

  -- 9. Plafond quotidien de candidatures, par personne (anti-rafale §2.9).
  select count(*)::integer into v_today
  from public.crew_applications ca
  where ca.user_id = v_uid and ca.created_at > now() - interval '1 day';
  if v_today >= public.crew_join_requests_per_day_max() then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited',
      'max', public.crew_join_requests_per_day_max());
  end if;

  -- 10. Plafond d'effectif.
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  select * into v_rules from public.crew_rules_2026 r where r.crew_id = p_crew_id;
  v_version := coalesce(v_rules.charter_version, 1);

  -- 11. Exigences. `missing` est rendue AU CANDIDAT (c'est lui l'appelant), et
  --     à personne d'autre.
  v_measures := public.crew_member_measures_2026(v_uid, now());
  v_missing := public.crew_missing_requirements_2026(coalesce(v_rules.requirements, '{}'::jsonb), v_measures);
  if jsonb_array_length(v_missing) > 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_eligible', 'missing', v_missing);
  end if;

  -- 12. Charte à jour. Exigée SEULEMENT si le crew en a une : un crew sans
  --     charte n'a rien à faire accepter.
  if v_rules.charter is not null
     and coalesce(p_charter_version, -1) <> v_version then
    return jsonb_build_object('ok', false, 'reason', 'charter_stale', 'charterVersion', v_version);
  end if;

  if v_crew.recruitment_status = 'open' then
    insert into public.crew_members (crew_id, user_id, role)
    values (p_crew_id, v_uid, 'rookie');   -- game-rules: CREW_ENTRY_ROLE
    if v_rules.charter is not null then
      insert into public.crew_rule_acceptances_2026 (crew_id, user_id, charter_version)
      values (p_crew_id, v_uid, v_version) on conflict do nothing;
    end if;
    insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
    values (p_crew_id, 'application', v_uid, v_uid, 'open',
            jsonb_build_object('effect', 'joined', 'charterVersion',
                               case when v_rules.charter is null then null else v_version end));
    return jsonb_build_object('ok', true, 'effect', 'joined');
  end if;

  -- 'on_request' → candidature AVEC SON MESSAGE. Le trou ① est bouché ici.
  insert into public.crew_applications (crew_id, user_id, message, charter_version)
  values (p_crew_id, v_uid, v_msg,
          case when v_rules.charter is null then null else v_version end);

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
  values (p_crew_id, 'application', v_uid, v_uid, 'on_request',
          jsonb_build_object('effect', 'applied', 'hasMessage', v_msg is not null));

  -- §3.4 `application_received` — aux OFFICIERS seulement.
  -- game-rules: CREW_PERMISSIONS.acceptApplications
  perform public.crew_notify_2026(cm.user_id, 'application_received', p_crew_id,
    p_crew_id::text || ':' || v_uid::text || ':' || to_char(now(), 'YYYY-MM-DD'),
    '{}'::jsonb)
  from public.crew_members cm
  where cm.crew_id = p_crew_id and cm.left_at is null
    and cm.role in ('co_captain', 'founder');

  return jsonb_build_object('ok', true, 'effect', 'applied');
end;
$$;

comment on function public.crew_apply_2026(uuid, text, integer) is
  'Candidater à un crew AVEC UN MESSAGE — l''écriture qui manquait depuis 0011 '
  '(crew_applications.message était LU par crew_join_requests et écrit par '
  'personne). Refus nommés dans l''ordre : not_found · dead_crew · '
  'already_in_crew · closed · cooldown (départ volontaire) · cooldown '
  '(re-adhésion au même crew, décision 3) · pending · rate_limited · full · '
  'not_eligible (+missing) · charter_stale. recruitment_status=open ⇒ entrée '
  'immédiate, charte acceptée dans la MÊME transaction.';

-- ════════════════════════════════════════════════════════════════════════════
-- 11. `crew_accept_charter_2026` — ACCEPTER LA NOUVELLE VERSION
--
-- UN REFUS N'EXCLUT PERSONNE, et il n'y a donc aucune RPC de refus : ne pas
-- appeler celle-ci EST le refus, et il n'a aucune conséquence. La charte n'est
-- pas un contrat opposable ; en faire une condition de maintien serait la
-- pression punitive automatique que §2.10 ① refuse.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_accept_charter_2026(p_charter_version integer) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_rules   public.crew_rules_2026%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id into v_crew_id
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select * into v_rules from public.crew_rules_2026 r where r.crew_id = v_crew_id;
  if not found or v_rules.charter is null then
    -- Rien à accepter : ce n'est pas une erreur, c'est un crew sans charte.
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  -- Accepter une version périmée n'acquitte RIEN : sinon un écran en retard
  -- d'un rafraîchissement enregistrerait un consentement à un texte remplacé.
  if coalesce(p_charter_version, -1) <> v_rules.charter_version then
    return jsonb_build_object('ok', false, 'reason', 'charter_stale',
      'charterVersion', v_rules.charter_version);
  end if;

  insert into public.crew_rule_acceptances_2026 (crew_id, user_id, charter_version)
  values (v_crew_id, v_uid, v_rules.charter_version)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'charterVersion', v_rules.charter_version);
end;
$$;

comment on function public.crew_accept_charter_2026(integer) is
  'Acceptation HORODATÉE d''une version PRÉCISE de la charte. Refuse '
  'charter_stale sur une version périmée. Il n''existe AUCUNE RPC de refus : ne '
  'pas appeler celle-ci est le refus, et un refus n''exclut personne (§2.3 ①).';

-- ════════════════════════════════════════════════════════════════════════════
-- 12. PRIVILÈGES
--
-- ⚠ `revoke … from public` D'ABORD (doctrine 0083 §7) : Postgres accorde
-- EXECUTE au pseudo-rôle `public` sur toute fonction nouvellement créée, et
-- `anon` en hérite. Un `revoke … from anon` seul ne retirerait RIEN. Le test
-- PGlite l'a attrapé en vrai sur 0083.
-- ════════════════════════════════════════════════════════════════════════════
revoke all on function public.crew_rules_get_2026(uuid)                     from public, anon;
revoke all on function public.crew_rules_set_2026(text, jsonb, jsonb)       from public, anon;
revoke all on function public.crew_eligibility_2026(uuid)                   from public, anon;
revoke all on function public.crew_apply_2026(uuid, text, integer)          from public, anon;
revoke all on function public.crew_accept_charter_2026(integer)             from public, anon;

grant execute on function public.crew_rules_get_2026(uuid)                  to authenticated;
grant execute on function public.crew_rules_set_2026(text, jsonb, jsonb)    to authenticated;
grant execute on function public.crew_eligibility_2026(uuid)                to authenticated;
grant execute on function public.crew_apply_2026(uuid, text, integer)       to authenticated;
grant execute on function public.crew_accept_charter_2026(integer)          to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS (dit ici plutôt que laissé croire)
--
-- · `crew_join_intent` (0093) N'EST PAS REMPLACÉE. Elle continue de DIRE ce
--   qu'on peut faire face à un crew ; elle ne connaît ni les exigences, ni la
--   charte, ni le délai de re-adhésion. L'écran doit donc appeler
--   `crew_eligibility_2026` avant de peindre le bouton (§4.2 H), sinon il
--   peindrait « Demander à rejoindre » actif puis se ferait refuser.
-- · `crew_decide_join_request` (0083) N'EST PAS REMPLACÉE : elle n'écrit
--   toujours aucune notification d'acceptation ni de refus, et elle ne
--   revérifie pas les exigences au moment de la décision. C'est volontaire pour
--   ce lot — un officier qui accepte quelqu'un OUTREPASSE les exigences, comme
--   une invitation (leçon ②). Les événements `application_accepted` /
--   `application_declined` ne sont donc PAS déclarés dans
--   CREW_NOTIFICATION_EVENTS_2026 : un catalogue ne promet pas au-delà du code.
-- · AUCUN RÉTRO-FIT. Les crews existants n'ont ni ligne `crew_rules_2026`, ni
--   charte, ni exigence : l'absence de ligne EST l'état par défaut, et en
--   fabriquer une à l'application de cette migration inventerait une décision
--   que personne n'a prise.
-- · LA VÉRIFICATION D'ÉLIGIBILITÉ N'EST PAS REJOUÉE À L'ACCEPTATION. Quelqu'un
--   qui candidate en étant éligible puis cesse de courir sera accepté. C'est le
--   choix de la porte humaine : le capitaine décide, la mesure ne décide pas.
-- ════════════════════════════════════════════════════════════════════════════
