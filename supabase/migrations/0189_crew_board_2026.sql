-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0189 — TENIR UN CREW : un tableau de suivi, un avertissement, une        ║
-- ║        exclusion qui dit son motif, et un journal qui garde qui a décidé.║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Spécification : docs/product/GRYD_GESTION_CREW_2026_09.md §2.4, §2.5, §2.6,
-- §3.1, §3.2. Décisions du fondateur consignées en tête de 0188.
--
-- ═══ LES DEUX TROUS QUE CE FICHIER BOUCHE ══════════════════════════════════
--  ④ AUCUNE MESURE PAR MEMBRE. `crew_overview` (0152, étendue par 0182) rend le
--     roster avec les rôles et un booléen « tient du terrain », et RIEN d'autre :
--     ni dernière sortie, ni distance, ni ancienneté, ni contribution. Un
--     capitaine ne peut donc rien suivre, et le fondateur demande précisément
--     « un tableau de suivi de ses équipes ».
--  ⑤ L'EXCLUSION N'A AUCUN MOTIF ET N'ÉCRIT AUCUNE TRACE LISIBLE.
--     `crew_remove_member` (0093) pose `left_at` et `removed_by` — l'exclu
--     n'apprend jamais pourquoi, et 0093 l'écrit lui-même dans son « ce qui
--     reste en suspens » : « AUCUN JOURNAL […] un véritable audit de modération
--     de crew reste à écrire ». C'est la blessure du modèle Clash (spec §1.3 ⑤).
--
-- ═══ « TERRAIN APPORTÉ AU CREW » EST REFUSÉ, ET C'EST IMPORTANT ════════════
-- 0118 gèle `hex_claims`, 0126 pose que le titre de capture est INDIVIDUEL, et
-- 0152 a retiré `hexesHeld` / `cityRank` / `contributionPct` de `crew_overview`
-- pour cette raison. Additionner les possessions des membres fabriquerait le
-- titre collectif que ces trois migrations refusent. Le tableau dit donc combien
-- de BOUCLES un membre a fermées, jamais combien de mètres carrés il « apporte ».
--
-- ═══ LA VIE PRIVÉE CONTRE LE TABLEAU DE SUIVI — la vraie tension du lot ════
-- DÉCISION 2 du fondateur, appliquée MESURE PAR MESURE :
--   ① `profile_visibility` vaut `crew` ou `public` ⇒ les mesures sont rendues ;
--   ② sinon, une mesure n'est rendue QUE si une règle ACTIVE du crew l'utilise
--      — accepter la charte d'un crew dont les règles sont affichées vaut
--      consentement à ce que CES règles-là soient vérifiables, et la fiche
--      publique les écrit avant l'entrée (0188 §7) ;
--   ③ sinon la cellule vaut le littéral `'not_shared'`. JAMAIS `null`, JAMAIS
--      `0` : un zéro affirmerait que la personne n'a pas couru, ce qui est le
--      mensonge exact que L8 interdit.
-- Trois mesures seulement peuvent être déverrouillées par une règle, parce que
-- trois règles seulement mesurent quelque chose d'une personne :
--   `max_inactivity_days` → dernière sortie · `min_weekly_outings` → sorties de
--   la semaine · `min_challenge_days` → journées de défi. La DISTANCE n'est
--   déverrouillée par AUCUNE règle : aucun des quatre réglages ne la lit.
--
-- ⚠ LE TRI FUIT, SI ON N'Y PREND PAS GARDE. Trier cinquante lignes par distance
-- en laissant les lignes masquées à leur vraie place apprendrait au capitaine le
-- rang de chacune — donc sa mesure, à l'intervalle près. Les lignes masquées
-- sont donc TOUJOURS reléguées en fin de tri, dans un ordre alphabétique stable.
--
-- ═══ PAS DE VUE MATÉRIALISÉE, ET C'EST UN PIÈGE DÉJÀ PAYÉ ══════════════════
-- `crew_leaderboard` (0002) est une matview qu'AUCUN `refresh materialized
-- view` ne rafraîchit nulle part (constat écrit dans 0044:20), au point que
-- `stats.ts` a dû inventer un état `never_refreshed` pour ne pas mentir.
-- `crew_member_activity_2026` est donc une VUE SIMPLE, calculée à la lecture :
-- au plus `CREW_MAX_MEMBERS` lignes, 28 jours de `runs`, index existants. Pas
-- de matview, donc pas de job, donc pas de mensonge.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Deux tables et une vue neuves. Aucune table, colonne, contrainte ni donnée
-- existante n'est modifiée. `crew_remove_member` (0093) et `crew_overview`
-- (0182) ne sont PAS remplacées. Rollback : `drop` des cinq RPC, de la vue et
-- des deux tables.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LE DEVOIR D'UN RÔLE — miroir SQL de `CREW_ROLE_DUTY` (cahier §13.3)
--    Le cahier ne décrit pas sept rôles, il en décrit QUATRE, par leur UTILITÉ.
--    La traduction existe en TypeScript ; le tableau de suivi l'affiche, donc
--    elle doit exister côté serveur aussi. Dérive testée en PGlite.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_role_duty(p_role text)
returns text language sql immutable set search_path = public, pg_temp as $$
  -- game-rules: CREW_ROLE_DUTY
  select case p_role
    when 'founder'    then 'captain'
    when 'co_captain' then 'moderator'
    when 'captain'    then 'organizer'
    when 'strategist' then 'member'
    when 'scout'      then 'member'
    when 'runner'     then 'member'
    when 'rookie'     then 'member'
    else null
  end;
$$;

revoke all on function public.crew_role_duty(text) from public, anon, authenticated;
grant execute on function public.crew_role_duty(text) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LES AVERTISSEMENTS
--
-- ⚠ L'UNIQUE PARTIELLE EST CE QUI REND LE JOB IDEMPOTENT (spec §3.1, §5.3
-- risque 4). Rejoué dix fois dans la même semaine, `sweep_crew_inactivity_2026`
-- (0190) écrit UN SEUL avertissement par membre et par règle. Si quelqu'un la
-- retire, le risque revient intact — et le fuseau UTC de pg_cron avec lui.
--
-- `week_key` porte ce qui fait qu'un avertissement est « le même » :
--   · `inactivity`     → '' — UN seul avertissement d'inactivité ouvert à la
--                        fois, jamais un par semaine : l'horloge du retrait
--                        court depuis `issued_at`, la redémarrer chaque lundi
--                        rendrait le retrait automatique inatteignable ;
--   · `weekly_outings` → le lundi de la semaine ÉVALUÉE (une par semaine) ;
--   · `challenge`      → l'identifiant du défi (un par défi) ;
--   · `manual`         → le jour de l'émission : un officier ne peut pas
--                        avertir la même personne dix fois dans la journée.
--
-- `acknowledged_at` sert la DÉCISION 4 : un membre n'est jamais retiré sans que
-- son avertissement ait été VU (acquitté par `crew_my_standing_2026`) ou qu'il
-- ait au moins `crew_warning_grace_days()`. Un message parti n'est pas un
-- message lu.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.crew_warnings_2026 (
  id              uuid primary key default gen_random_uuid(),
  crew_id         uuid not null references public.crews (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  kind            text not null check (kind in ('inactivity', 'weekly_outings', 'challenge', 'manual')),
  note            text check (note is null or char_length(note) between 1 and 200),
  -- `null` = LE SERVEUR. Un officier renseigne son identifiant ; le job ne peut
  -- pas en inventer un, et écrire un compte système serait une personne fictive.
  issued_by       uuid references public.users (id) on delete set null,
  issued_at       timestamptz not null default now(),
  resolved_at     timestamptz,
  acknowledged_at timestamptz,
  week_key        text not null default ''
);

create unique index if not exists crew_warnings_2026_open_unique
  on public.crew_warnings_2026 (crew_id, user_id, kind, week_key)
  where resolved_at is null;
create index if not exists crew_warnings_2026_member_idx
  on public.crew_warnings_2026 (crew_id, user_id, issued_at desc);

comment on table public.crew_warnings_2026 is
  'Avertissements de crew (§2.3). issued_by NULL = le serveur (job). '
  'L''unique PARTIELLE (crew_id,user_id,kind,week_key) where resolved_at is null '
  'EST l''idempotence du job d''inactivité : la retirer ramène le risque de '
  'doublon que le fuseau UTC de pg_cron rend certain.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LES EXCLUSIONS — le motif, la note, et la date de re-adhésion
--
-- `rejoin_allowed_at` est le JOURNAL de la décision 3, pas son AUTORITÉ :
-- `crew_apply_2026` (0188 §10) calcule le délai sur `crew_members.removed_by`,
-- qui existe depuis 0093 — donc la règle vaut aussi pour les exclusions
-- prononcées avant ce lot. Écrire la date ici sert à la DIRE à l'officier et à
-- l'exclu, jamais à la faire appliquer par deux endroits différents.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.crew_kicks_2026 (
  id                uuid primary key default gen_random_uuid(),
  crew_id           uuid not null references public.crews (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  -- game-rules: CREW_KICK_REASONS — catalogue FERMÉ. L'exclusion sans motif
  -- n'existe pas chez GRYD : c'est le refus explicite de la blessure de Clash.
  reason            text not null check (reason in
                      ('inactivity', 'rules', 'challenge', 'behaviour', 'fit', 'other')),
  note              text check (note is null or char_length(note) between 1 and 200),
  decided_by        uuid references public.users (id) on delete set null,
  decided_at        timestamptz not null default now(),
  rejoin_allowed_at timestamptz not null
);
create index if not exists crew_kicks_2026_crew_idx
  on public.crew_kicks_2026 (crew_id, decided_at desc);
create index if not exists crew_kicks_2026_user_idx
  on public.crew_kicks_2026 (user_id, decided_at desc);

comment on table public.crew_kicks_2026 is
  'Exclusions AVEC MOTIF (catalogue fermé CREW_KICK_REASONS, note obligatoire '
  'pour ''other''). decided_by NULL = le serveur (retrait automatique). '
  'rejoin_allowed_at est le JOURNAL du délai de re-adhésion — son autorité est '
  'crew_members.removed_by, lu par crew_apply_2026.';

alter table public.crew_warnings_2026 enable row level security;
alter table public.crew_kicks_2026    enable row level security;
revoke all on public.crew_warnings_2026, public.crew_kicks_2026 from public, anon, authenticated;
grant all on public.crew_warnings_2026, public.crew_kicks_2026 to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. LA VUE D'ACTIVITÉ — une ligne par membre ACTIF, mesures BRUTES
--
-- Elle ne connaît NI la vie privée NI les règles du crew : le masquage est
-- décidé par `crew_member_board_2026`, qui seul sait quelles règles sont
-- actives. Une vue qui masquerait elle-même devrait recevoir l'enforcement en
-- paramètre — donc ne serait plus une vue.
-- ════════════════════════════════════════════════════════════════════════════
create or replace view public.crew_member_activity_2026 as
select
  cm.crew_id,
  cm.user_id,
  u.pseudo,
  cm.role,
  cm.joined_at,
  -- Vie privée du membre. Aucune ligne `user_profiles` ⇒ le DÉFAUT DE COLONNE
  -- (0011 : 'crew'), qui est ce que le compte aurait s'il était provisionné —
  -- jamais 'public', qui ouvrirait plus que le réglage réel.
  coalesce(up.profile_visibility, 'crew') as profile_visibility,
  m.last_run_at,
  m.runs_7d,
  m.runs_28d,
  m.distance_m_7d,
  m.distance_m_28d,
  m.loops_28d,
  ch.challenge_days,
  ai.outings_joined_28d,
  ai.outings_created_28d
from public.crew_members cm
join public.users u on u.id = cm.user_id and u.deletion_requested_at is null
left join public.user_profiles up on up.user_id = cm.user_id
cross join lateral (
  select
    (select max(r.started_at) from public.runs r
      where r.user_id = cm.user_id and r.status in ('valid', 'partial')) as last_run_at,
    (select count(*)::integer from public.runs r
      where r.user_id = cm.user_id and r.status in ('valid', 'partial')
        and r.started_at >= now() - interval '7 days') as runs_7d,
    (select count(*)::integer from public.runs r
      where r.user_id = cm.user_id and r.status in ('valid', 'partial')
        and r.started_at >= now() - interval '28 days') as runs_28d,   -- game-rules: CREW_REQUIREMENT_WINDOW_DAYS
    (select coalesce(sum(r.distance_m), 0)::bigint from public.runs r
      where r.user_id = cm.user_id and r.status in ('valid', 'partial')
        and r.started_at >= now() - interval '7 days') as distance_m_7d,
    (select coalesce(sum(r.distance_m), 0)::bigint from public.runs r
      where r.user_id = cm.user_id and r.status in ('valid', 'partial')
        and r.started_at >= now() - interval '28 days') as distance_m_28d,
    -- Des BOUCLES fermées, jamais des mètres carrés (voir le docblock).
    (select count(*)::integer from public.capture_events_2026 e
      where e.owner_id = cm.user_id and e.status = 'published'
        and e.closed_at >= now() - interval '28 days') as loops_28d
) m
cross join lateral (
  -- Journées contribuées au défi EN COURS de CE crew, retraits exclus (0148 :
  -- une journée retirée ne compte plus, et l'annoncer serait faux).
  select coalesce((
    select count(distinct cc.day)::integer
    from public.challenge_contributions_2026 cc
    join public.challenge_teams_2026 ct
      on ct.challenge_id = cc.challenge_id and ct.crew_id = cm.crew_id
    join public.crew_challenges_2026 c2 on c2.id = cc.challenge_id
    where cc.player_id = cm.user_id and cc.crew_id = cm.crew_id and cc.withdrawn = false
      and c2.status not in ('cancelled', 'final')
      and now() < c2.ends_at
  ), 0) as challenge_days
) ch
cross join lateral (
  -- §2.6 — L'ENTRAIDE, décision 5 : VENIR et ORGANISER. Deux faits qui coûtent
  -- du temps réel, et qui ne transfèrent aucun avantage (règle 10).
  select
    (select count(*)::integer
      from public.crew_event_rsvps rv
      join public.crew_events ev on ev.id = rv.event_id
      where rv.user_id = cm.user_id and rv.choice = 'coming'
        and ev.crew_id = cm.crew_id and ev.cancelled_at_2026 is null
        and coalesce(ev.starts_at, ev.created_at) >= now() - interval '28 days'
        and coalesce(ev.starts_at, ev.created_at) <= now()) as outings_joined_28d,
    (select count(*)::integer
      from public.crew_events ev
      where ev.created_by = cm.user_id and ev.crew_id = cm.crew_id
        and ev.cancelled_at_2026 is null
        and ev.created_at >= now() - interval '28 days'
        and exists (select 1 from public.crew_event_rsvps rv2
                    where rv2.event_id = ev.id and rv2.choice = 'coming')) as outings_created_28d
) ai
where cm.left_at is null;

comment on view public.crew_member_activity_2026 is
  'Une ligne par membre ACTIF : mesures BRUTES, sans masquage. VUE SIMPLE et '
  'non matérialisée — le dépôt a déjà payé le piège de crew_leaderboard (0002), '
  'matview qu''aucun refresh ne rafraîchit nulle part (0044:20). Le masquage de '
  'vie privée est appliqué par crew_member_board_2026, seul à connaître les '
  'règles actives du crew.';

revoke all on public.crew_member_activity_2026 from public, anon, authenticated;
grant select on public.crew_member_activity_2026 to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `crew_member_board_2026` — LE TABLEAU DE SUIVI
--    game-rules: CREW_PERMISSIONS.kick === ['co_captain', 'founder']
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_member_board_2026(
  p_sort   text default 'last_run',
  p_filter text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_enf      jsonb;
  v_sort     text := coalesce(nullif(btrim(coalesce(p_sort, '')), ''), 'last_run');
  v_filter   text := nullif(btrim(coalesce(p_filter, '')), '');
  v_auto     boolean;
  v_rows     jsonb;
  v_active   jsonb;
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
  -- game-rules: CREW_PERMISSIONS.kick — un membre simple n'audite personne.
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- game-rules: CREW_BOARD_SORTS / CREW_BOARD_FILTERS — catalogues FERMÉS.
  if v_sort not in ('last_run', 'distance_28d', 'seniority', 'role') then
    return jsonb_build_object('ok', false, 'reason', 'bad_sort');
  end if;
  if v_filter is not null and v_filter not in ('at_risk', 'warned', 'never_ran', 'officers') then
    return jsonb_build_object('ok', false, 'reason', 'bad_filter');
  end if;

  select coalesce(r.enforcement, '{}'::jsonb) into v_enf
  from public.crew_rules_2026 r where r.crew_id = v_crew_id;
  v_enf := coalesce(v_enf, '{}'::jsonb);
  v_auto := coalesce((v_enf->>'auto_remove_after_days')::numeric, 0) > 0;

  -- Les règles ACTIVES, rendues telles quelles : l'écran doit pouvoir écrire
  -- « ce crew demande 1 sortie par semaine » avant d'afficher un état.
  v_active := (
    select coalesce(jsonb_object_agg(k.key, (v_enf->>k.key)::numeric), '{}'::jsonb)
    from (select unnest(array['min_weekly_outings', 'min_challenge_days',
                             'max_inactivity_days', 'auto_remove_after_days']) as key) k
    where coalesce((v_enf->>k.key)::numeric, 0) > 0
  );

  with base as (
    select
      a.*,
      -- ① profil ouvert au crew, ② une règle ACTIVE utilise la mesure, ③ sinon
      -- 'not_shared'. Décision 2, appliquée mesure par mesure.
      (a.profile_visibility in ('crew', 'public'))                        as open_profile,
      coalesce((v_enf->>'max_inactivity_days')::numeric, 0) > 0           as rule_last_run,
      coalesce((v_enf->>'min_weekly_outings')::numeric, 0) > 0            as rule_weekly,
      coalesce((v_enf->>'min_challenge_days')::numeric, 0) > 0            as rule_challenge
    from public.crew_member_activity_2026 a
    where a.crew_id = v_crew_id
  ),
  warned as (
    select w.user_id,
      jsonb_agg(jsonb_build_object(
        'id', w.id, 'kind', w.kind, 'issuedAt', w.issued_at,
        -- QUI a averti n'est jamais un pseudo dans cette réponse : « serveur »
        -- ou « officier ». Le nom vit dans le journal (crew_decisions_2026).
        'issuedBy', case when w.issued_by is null then 'server' else 'officer' end,
        'note', w.note, 'acknowledgedAt', w.acknowledged_at)
        order by w.issued_at desc) as rows,
      max(case when w.kind = 'inactivity' then w.issued_at end) as inactivity_since
    from public.crew_warnings_2026 w
    where w.crew_id = v_crew_id and w.resolved_at is null
    group by w.user_id
  ),
  shaped as (
    select
      b.user_id, b.pseudo, b.role, b.joined_at,
      b.open_profile, b.last_run_at, b.distance_m_28d,
      (b.open_profile or b.rule_last_run)  as see_last_run,
      (b.open_profile or b.rule_weekly)    as see_weekly,
      (b.open_profile or b.rule_challenge) as see_challenge,
      w.rows as warnings, w.inactivity_since,
      -- game-rules: CREW_STANDING_STATES
      case
        when v_active = '{}'::jsonb then 'rule_off'
        when w.inactivity_since is not null and v_auto then 'at_risk'
        when w.rows is not null then 'warned'
        else 'compliant'
      end as standing,
      case when w.inactivity_since is not null and v_auto
           then w.inactivity_since + make_interval(days => (v_enf->>'auto_remove_after_days')::integer)
      end as removal_at,
      b.runs_7d, b.runs_28d, b.distance_m_7d, b.loops_28d, b.challenge_days,
      b.outings_joined_28d, b.outings_created_28d
    from base b
    left join warned w on w.user_id = b.user_id
    where v_filter is null
      -- Les filtres portent sur ce que l'officier peut VOIR. `never_ran` exclut
      -- les lignes masquées : le contraire ferait de l'absence d'une ligne une
      -- information sur une mesure qui n'a pas été partagée.
      or (v_filter = 'warned'    and w.rows is not null)
      or (v_filter = 'at_risk'   and w.inactivity_since is not null and v_auto)
      or (v_filter = 'never_ran' and b.last_run_at is null and (b.open_profile or b.rule_last_run))
      or (v_filter = 'officers'  and b.role in ('captain', 'co_captain', 'founder'))
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'userId',           s.user_id,
      'pseudo',           s.pseudo,
      'role',             s.role,
      'duty',             public.crew_role_duty(s.role),
      'joinedAt',         s.joined_at,
      'seniorityDays',    greatest(0, floor(extract(epoch from (now() - s.joined_at)) / 86400.0)::integer),
      -- game-rules: CREW_MEASURE_NOT_SHARED — jamais null, jamais 0.
      'lastRunAt',        case when s.see_last_run then to_jsonb(s.last_run_at) else to_jsonb('not_shared'::text) end,
      'runs7d',           case when s.see_weekly then to_jsonb(s.runs_7d) else to_jsonb('not_shared'::text) end,
      'challengeDays',    case when s.see_challenge then to_jsonb(s.challenge_days) else to_jsonb('not_shared'::text) end,
      -- La DISTANCE et les BOUCLES ne sont déverrouillées par AUCUNE règle :
      -- aucun des quatre réglages ne les lit. Profil fermé ⇒ 'not_shared'.
      'distance7dKm',     case when s.open_profile then to_jsonb(round((s.distance_m_7d / 1000.0)::numeric, 1)) else to_jsonb('not_shared'::text) end,
      'distance28dKm',    case when s.open_profile then to_jsonb(round((s.distance_m_28d / 1000.0)::numeric, 1)) else to_jsonb('not_shared'::text) end,
      'runs28d',          case when s.open_profile then to_jsonb(s.runs_28d) else to_jsonb('not_shared'::text) end,
      'loops28d',         case when s.open_profile then to_jsonb(s.loops_28d) else to_jsonb('not_shared'::text) end,
      'outingsJoined28d', case when s.open_profile then to_jsonb(s.outings_joined_28d) else to_jsonb('not_shared'::text) end,
      'outingsCreated28d',case when s.open_profile then to_jsonb(s.outings_created_28d) else to_jsonb('not_shared'::text) end,
      'warnings',         coalesce(s.warnings, '[]'::jsonb),
      'standing',         s.standing,
      'removalAt',        s.removal_at
    )
    order by
      -- ⚠ LES LIGNES MASQUÉES PASSENT TOUJOURS EN DERNIER : sans cela, leur
      -- RANG dans un tri par distance rendrait la mesure qu'on vient de masquer.
      case when v_sort = 'last_run'     and not s.see_last_run then 1
           when v_sort = 'distance_28d' and not s.open_profile then 1
           else 0 end asc,
      case when v_sort = 'last_run'     and s.see_last_run  then s.last_run_at end desc nulls last,
      case when v_sort = 'distance_28d' and s.open_profile  then s.distance_m_28d end desc nulls last,
      case when v_sort = 'seniority'    then s.joined_at end asc,
      case when v_sort = 'role'         then public.crew_role_rank(s.role) end desc,
      s.pseudo asc
  ), '[]'::jsonb)
  into v_rows
  from shaped s;

  return jsonb_build_object(
    'ok', true,
    'rows', v_rows,
    'rulesActive', v_active,
    'sort', v_sort,
    'filter', v_filter,
    'generatedAt', now()
  );
end;
$$;

comment on function public.crew_member_board_2026(text, text) is
  'Tableau de suivi du capitaine : une ligne par membre ACTIF, au plus '
  'CREW_MAX_MEMBERS. Rôle-gaté sur CREW_PERMISSIONS.kick. Chaque mesure vaut '
  'soit une valeur, soit le littéral ''not_shared'' — jamais null, jamais 0 '
  '(L8). Les lignes masquées sont reléguées en fin de tri : leur rang '
  'trahirait la mesure. AUCUNE surface de territoire (0126). AUCUN export.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. `crew_my_standing_2026` — MA SITUATION, ET L'ACQUITTEMENT
--
-- ⚠ CETTE LECTURE ÉCRIT, et c'est délibéré : elle pose `acknowledged_at` sur
-- les avertissements ouverts de l'appelant. C'est ce qui rend vraie la DÉCISION
-- 4 — « un membre n'est jamais retiré sans avertissement lu ou vieux de N
-- jours ». Sans acquittement, « lu » n'aurait aucune trace, et la garantie
-- serait une phrase de documentation.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_my_standing_2026() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_enf      jsonb;
  v_auto     boolean;
  v_act      record;
  v_warnings jsonb;
  v_inact    timestamptz;
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

  select coalesce(r.enforcement, '{}'::jsonb) into v_enf
  from public.crew_rules_2026 r where r.crew_id = v_crew_id;
  v_enf := coalesce(v_enf, '{}'::jsonb);
  v_auto := coalesce((v_enf->>'auto_remove_after_days')::numeric, 0) > 0;

  -- L'ACQUITTEMENT, avant la lecture : la personne a ouvert l'écran.
  update public.crew_warnings_2026 w
  set acknowledged_at = now()
  where w.crew_id = v_crew_id and w.user_id = v_uid
    and w.resolved_at is null and w.acknowledged_at is null;

  select * into v_act from public.crew_member_activity_2026 a
  where a.crew_id = v_crew_id and a.user_id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', w.id, 'kind', w.kind, 'issuedAt', w.issued_at, 'note', w.note,
      'issuedBy', case when w.issued_by is null then 'server' else 'officer' end,
      'resolvedAt', w.resolved_at) order by w.issued_at desc), '[]'::jsonb),
    max(case when w.kind = 'inactivity' and w.resolved_at is null then w.issued_at end)
  into v_warnings, v_inact
  from public.crew_warnings_2026 w
  where w.crew_id = v_crew_id and w.user_id = v_uid
    and w.issued_at >= now() - interval '90 days';

  return jsonb_build_object(
    'ok', true,
    'crewId', v_crew_id,
    'role', v_role,
    'duty', public.crew_role_duty(v_role),
    -- Les règles TELLES QU'ELLES SONT : `{}` veut dire « ce crew n'en a
    -- aucune », et l'écran n'affiche alors aucun bloc de conformité.
    'rules', v_enf,
    -- MES mesures, à MOI : aucune vie privée à opposer à soi-même.
    'my', jsonb_build_object(
      'lastRunAt',     v_act.last_run_at,
      'runs7d',        coalesce(v_act.runs_7d, 0),
      'runs28d',       coalesce(v_act.runs_28d, 0),
      'distance28dKm', round((coalesce(v_act.distance_m_28d, 0) / 1000.0)::numeric, 1),
      'loops28d',      coalesce(v_act.loops_28d, 0),
      'challengeDays', coalesce(v_act.challenge_days, 0)),
    'warnings', v_warnings,
    -- « À risque » N'EXISTE QUE SI le retrait automatique est armé : sans lui il
    -- n'y a pas de retrait, donc pas de risque, donc rien à dire (§4.2 I).
    'atRisk', v_inact is not null and v_auto,
    'removalAt', case when v_inact is not null and v_auto
                      then v_inact + make_interval(days => (v_enf->>'auto_remove_after_days')::integer) end
  );
end;
$$;

comment on function public.crew_my_standing_2026() is
  'Ma situation dans MON crew : règles du crew, mes mesures, mes '
  'avertissements, et le retrait éventuel avec sa date. ACQUITTE les '
  'avertissements ouverts (acknowledged_at) — c''est ce qui rend vraie la '
  'garantie « jamais retiré sans avertissement lu ou vieux de N jours ». Ton '
  'neutre : aucune injonction à courir (§14.2).';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. `crew_warn_member_2026` — AVERTIR À LA MAIN
--
-- MÊMES BORNES QUE L'EXCLUSION, et ce n'est pas de la prudence excessive : un
-- avertissement est visible du membre visé et entre dans son dossier. Le donner
-- serait un pouvoir plus large que celui d'exclure si ses bornes étaient plus
-- lâches. Il ne déclenche JAMAIS un retrait automatique : seul l'avertissement
-- d'inactivité le fait, et seulement si la règle est armée (§2.5).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_warn_member_2026(
  p_user_id uuid,
  p_note    text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_crew_id     uuid;
  v_actor_role  text;
  v_target_role text;
  v_note        text := nullif(btrim(coalesce(p_note, '')), '');
  v_id          uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_actor_role
  from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.kick
  if v_actor_role is null or v_actor_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if p_user_id = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  if v_note is not null and char_length(v_note) > public.crew_kick_note_max() then
    return jsonb_build_object('ok', false, 'reason', 'bad_note', 'max', public.crew_kick_note_max());
  end if;

  select cm.role into v_target_role
  from public.crew_members cm
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;
  if v_target_role = 'founder' then
    return jsonb_build_object('ok', false, 'reason', 'cannot_target_lead');
  end if;
  if public.crew_role_rank(v_target_role) >= public.crew_role_rank(v_actor_role) then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;
  -- game-rules: CO_CAPTAIN_KICKABLE_ROLES
  if v_actor_role = 'co_captain' and v_target_role not in ('rookie', 'runner', 'scout') then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;

  -- `week_key` = le JOUR : un officier n'avertit pas la même personne dix fois
  -- dans la journée. Un second appel le même jour rend l'avertissement existant.
  insert into public.crew_warnings_2026 (crew_id, user_id, kind, note, issued_by, week_key)
  values (v_crew_id, p_user_id, 'manual', v_note, v_uid, to_char(now(), 'YYYY-MM-DD'))
  on conflict (crew_id, user_id, kind, week_key) where resolved_at is null do nothing
  returning id into v_id;

  if v_id is null then
    select w.id into v_id from public.crew_warnings_2026 w
    where w.crew_id = v_crew_id and w.user_id = p_user_id and w.kind = 'manual'
      and w.week_key = to_char(now(), 'YYYY-MM-DD') and w.resolved_at is null;
    return jsonb_build_object('ok', true, 'effect', 'unchanged', 'warningId', v_id);
  end if;

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
  values (v_crew_id, 'warning', v_uid, p_user_id, 'manual',
          jsonb_build_object('warningId', v_id, 'hasNote', v_note is not null));

  -- §3.4 `warning_issued` — TRANSACTIONNEL (décision 4), au membre visé SEUL.
  perform public.crew_notify_2026(p_user_id, 'warning_issued', v_crew_id, v_id::text,
    jsonb_build_object('kind', 'manual', 'note', v_note));

  return jsonb_build_object('ok', true, 'effect', 'warned', 'warningId', v_id);
end;
$$;

comment on function public.crew_warn_member_2026(uuid, text) is
  'Avertissement MANUEL (kind=''manual'', issued_by renseigné). Mêmes bornes que '
  'l''exclusion : CREW_PERMISSIONS.kick, jamais soi-même, jamais le founder, '
  'périmètre CO_CAPTAIN_KICKABLE_ROLES. Un par membre et par jour. Ne déclenche '
  'JAMAIS un retrait automatique.';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. `crew_remove_member_2026` — EXCLURE AVEC UN MOTIF
--
-- Reprise BORNE POUR BORNE de `crew_remove_member` (0093 §4), avec ce qui
-- manquait : le motif obligatoire dans un catalogue fermé, la note (obligatoire
-- pour `other`), la ligne de journal, la ligne de `crew_kicks_2026`, la
-- résolution des avertissements ouverts, et la notification à l'exclu.
--
-- LE MESSAGE REÇU PAR L'EXCLU EST NEUTRE ET FACTUEL : le motif, jamais un
-- jugement, jamais un score, JAMAIS le nom de qui a décidé. Le journal interne,
-- lui, le garde — c'est exactement pourquoi les deux existent.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_remove_member_2026(
  p_user_id uuid,
  p_reason  text,
  p_note    text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_crew_id     uuid;
  v_actor_role  text;
  v_target_role text;
  v_reason      text := btrim(coalesce(p_reason, ''));
  v_note        text := nullif(btrim(coalesce(p_note, '')), '');
  v_rejoin      timestamptz;
  v_kick_id     uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_actor_role
  from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.kick
  if v_actor_role is null or v_actor_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if p_user_id = v_uid then
    -- `leave_crew` existe pour ça, et elle porte la règle du dernier chef.
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;

  -- game-rules: CREW_KICK_REASONS — catalogue FERMÉ, note obligatoire sur 'other'.
  if v_reason not in ('inactivity', 'rules', 'challenge', 'behaviour', 'fit', 'other') then
    return jsonb_build_object('ok', false, 'reason', 'bad_reason');
  end if;
  if v_reason = 'other' and v_note is null then
    return jsonb_build_object('ok', false, 'reason', 'note_required');
  end if;
  if v_note is not null and char_length(v_note) > public.crew_kick_note_max() then
    return jsonb_build_object('ok', false, 'reason', 'bad_note', 'max', public.crew_kick_note_max());
  end if;

  select cm.role into v_target_role
  from public.crew_members cm
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null
  for update;
  if not found then
    if exists (select 1 from public.crew_members cm
               where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is not null) then
      return jsonb_build_object('ok', true, 'effect', 'already_removed');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  if v_target_role = 'founder' then
    return jsonb_build_object('ok', false, 'reason', 'cannot_target_lead');
  end if;
  if public.crew_role_rank(v_target_role) >= public.crew_role_rank(v_actor_role) then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;
  -- game-rules: CO_CAPTAIN_KICKABLE_ROLES — plus étroit que le plafond de
  -- promotion : nommer se défait, exclure ne se défait pas (0093 §4).
  if v_actor_role = 'co_captain' and v_target_role not in ('rookie', 'runner', 'scout') then
    return jsonb_build_object('ok', false, 'reason', 'out_of_scope');
  end if;

  v_rejoin := now() + make_interval(days => public.crew_rejoin_after_kick_days());

  update public.crew_members cm
  set left_at = now(), removed_by = v_uid
  where cm.user_id = p_user_id and cm.crew_id = v_crew_id and cm.left_at is null;

  -- Les avertissements ouverts sont RÉSOLUS : ils portaient sur une
  -- appartenance qui n'existe plus, et les laisser ouverts ferait rester
  -- quelqu'un « averti » d'un crew qu'il a quitté.
  update public.crew_warnings_2026 w
  set resolved_at = now()
  where w.crew_id = v_crew_id and w.user_id = p_user_id and w.resolved_at is null;

  insert into public.crew_kicks_2026 (crew_id, user_id, reason, note, decided_by, rejoin_allowed_at)
  values (v_crew_id, p_user_id, v_reason, v_note, v_uid, v_rejoin)
  returning id into v_kick_id;

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
  values (v_crew_id, 'removal', v_uid, p_user_id, v_reason,
          jsonb_build_object('kickId', v_kick_id, 'previousRole', v_target_role,
                             'rejoinAllowedAt', v_rejoin, 'hasNote', v_note is not null));

  -- §3.4 `removed` — TRANSACTIONNEL. Le motif, JAMAIS le nom du décideur.
  perform public.crew_notify_2026(p_user_id, 'removed', v_crew_id, v_kick_id::text,
    jsonb_build_object('reason', v_reason, 'note', v_note, 'rejoinAllowedAt', v_rejoin));

  return jsonb_build_object(
    'ok', true, 'effect', 'removed', 'previousRole', v_target_role,
    'reason', v_reason, 'rejoinAllowedAt', v_rejoin);
end;
$$;

comment on function public.crew_remove_member_2026(uuid, text, text) is
  'Exclure AVEC UN MOTIF (CREW_KICK_REASONS, note obligatoire pour ''other''). '
  'Bornes de 0093 §4 : CREW_PERMISSIONS.kick, périmètre CO_CAPTAIN_KICKABLE_ROLES, '
  'jamais le founder, jamais soi-même. Résout les avertissements ouverts, '
  'journalise, et notifie l''exclu — le motif, jamais le nom du décideur. '
  'ANTI-P2W : exclure ne transfère AUCUN territoire.';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. `crew_decisions_log_2026` — QUI A DÉCIDÉ QUOI
--
-- Le journal REND LES PSEUDOS, et c'est la différence avec la notification :
-- l'exclu n'apprend jamais qui a tranché, les officiers si. Sans cela, une
-- décision de groupe n'aurait aucun responsable, et c'est précisément ce que
-- 0093 signalait comme manquant.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_decisions_log_2026(p_limit integer default 50) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_limit   integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_rows    jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.kick
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  with entries as (
    select d.decided_at as at, d.kind, d.actor_id, d.target_id, d.reason, d.detail
    from public.crew_decisions_2026 d
    where d.crew_id = v_crew_id
    union all
    -- Les ARRIVÉES et les DÉPARTS VOLONTAIRES ne passent par aucune RPC de ce
    -- lot : ils sont lus là où ils ont toujours été écrits (0002).
    select cm.joined_at, 'joined', cm.user_id, cm.user_id, null, '{}'::jsonb
    from public.crew_members cm where cm.crew_id = v_crew_id
    union all
    select cm.left_at, 'left', cm.user_id, cm.user_id, null, '{}'::jsonb
    from public.crew_members cm
    where cm.crew_id = v_crew_id and cm.left_at is not null and cm.removed_by is null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'at',     e.at,
      'kind',   e.kind,
      -- « automatique » quand c'est le job : un journal qui laisserait une
      -- case vide ferait chercher un responsable qui n'existe pas.
      'actor',  case when e.actor_id is null then null else (select u.pseudo from public.users u where u.id = e.actor_id) end,
      'automatic', e.actor_id is null,
      'target', case when e.target_id is null then null else (select u.pseudo from public.users u where u.id = e.target_id) end,
      'reason', e.reason,
      'detail', e.detail)
      order by e.at desc), '[]'::jsonb)
  into v_rows
  from (select * from entries order by at desc limit v_limit) e;

  return jsonb_build_object('ok', true, 'entries', v_rows);
end;
$$;

comment on function public.crew_decisions_log_2026(integer) is
  'Journal antéchronologique des décisions d''un crew : charte, règles, '
  'candidatures, avertissements, exclusions, dissolution, plus les arrivées et '
  'les départs volontaires lus sur crew_members. Rôle-gaté '
  'CREW_PERMISSIONS.kick. `automatic` vaut true quand c''est le job qui a '
  'décidé — un journal ne laisse jamais une case vide à la place d''un nom.';

-- ════════════════════════════════════════════════════════════════════════════
-- 10. PRIVILÈGES — `revoke … from public` D'ABORD (doctrine 0083 §7)
-- ════════════════════════════════════════════════════════════════════════════
revoke all on function public.crew_member_board_2026(text, text)            from public, anon;
revoke all on function public.crew_my_standing_2026()                       from public, anon;
revoke all on function public.crew_warn_member_2026(uuid, text)             from public, anon;
revoke all on function public.crew_remove_member_2026(uuid, text, text)     from public, anon;
revoke all on function public.crew_decisions_log_2026(integer)              from public, anon;

grant execute on function public.crew_member_board_2026(text, text)         to authenticated;
grant execute on function public.crew_my_standing_2026()                    to authenticated;
grant execute on function public.crew_warn_member_2026(uuid, text)          to authenticated;
grant execute on function public.crew_remove_member_2026(uuid, text, text)  to authenticated;
grant execute on function public.crew_decisions_log_2026(integer)           to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS (dit ici plutôt que laissé croire)
--
-- · `crew_remove_member(uuid)` (0093) EXISTE TOUJOURS et n'exige toujours aucun
--   motif : la remplacer par un refus casserait le bouton d'exclusion du client
--   actuel, qui ne connaît pas encore la version 2026. Tant que le lot Q3 n'a
--   pas basculé l'appel, DEUX chemins d'exclusion coexistent, dont un qui
--   n'écrit ni motif, ni journal, ni notification. C'est le seul endroit du lot
--   où la garantie « toute exclusion dit son motif » n'est pas encore tenue.
-- · AUCUN EXPORT. Un fichier de mesures nominatives quitte l'application et
--   échappe à `profile_visibility` ; il n'existe pas de moyen honnête de le
--   reprendre. Refusé par la spec §2.4, et aucune RPC ne le sert.
-- · `crew_stats()` (0086) RESTE FIGÉE : elle agrège des tables gelées par 0118,
--   comme `crew_overview` l'était avant 0152. Ce lot ne la répare pas et ne la
--   lit pas. Ne pas y brancher un écran de Q3 par réflexe.
-- · LA CONTRIBUTION AU DÉFI N'EST PAS RENDUE AU FIL. Elle va au capitaine et au
--   joueur lui-même, jamais au fil public (§13.4, §14.2).
-- ════════════════════════════════════════════════════════════════════════════
