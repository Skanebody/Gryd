-- 0164 — « Ta commune, cette semaine » : LA LECTURE. ADR-013 §2.1, lot L.
-- ADDITIVE. Deux RPC de lecture, aucune écriture, aucune donnée.
--
-- ═══ CE QUE CETTE RPC REFUSE DE FAIRE, ET QUI EST TOUT LE SUJET ════════════
-- Elle ne rend JAMAIS un tableau vide présenté comme un classement. Les quatre
-- états de CLAUDE.md sont portés par le SERVEUR, pas devinés par l'écran :
--   · `ranked`             — il y a assez de monde, voici le classement ;
--   · `not_enough_people`  — la mesure existe, elle compte moins de sujets que
--                            `minRankedSubjects` : AUCUNE ligne n'est servie.
--                            Un podium à trois est une donnée factice même si
--                            les trois lignes sont vraies (ADR-013, garde-fou 1) ;
--   · `unavailable`        — il n'y a pas de mesure pour cette semaine, ou la
--                            portée n'existe pas dans le référentiel. On le
--                            DIT ; on ne sert pas du vide horodaté.
-- Le quatrième état (« en cours ») appartient au client : c'est le temps de
-- l'appel, et le serveur n'a rien à en dire.
--
-- ═══ LA FRAÎCHEUR EST UNE DONNÉE, PAS UNE HYPOTHÈSE ════════════════════════
-- `measuredAt` est le `taken_at` du snapshot servi, et `stale` dit si ce
-- snapshot a dépassé `snapshotMaxAgeMinutes`. Le piège déjà payé dans ce dépôt
-- (une matview sans job, un snapshot sans horodatage visible) est un mensonge
-- d'écran : ici, l'écran ne PEUT pas afficher un classement sans afficher sa
-- date, parce qu'elle arrive dans le même objet.
--
-- ═══ QUI PEUT ÊTRE NOMMÉ ═══════════════════════════════════════════════════
-- Un rang est une phrase publique sur une personne. L'autorité d'identité reste
-- `territory_owner_identity_2026` (0126) — la MÊME que la carte : discrétion,
-- visibilité de profil, appartenance de crew. Une personne dont l'identité
-- n'est pas visible garde sa LIGNE et son rang (retirer la ligne fausserait le
-- classement de tout le monde) mais n'a pas de nom. Un blocage, dans un sens ou
-- dans l'autre, retire aussi le nom sans retirer la ligne.
-- Aucun `subject_id` brut ne sort d'ici, sauf le vôtre.

create or replace function public.read_leaderboard_2026(
  p_activity text,
  p_scope text,
  p_scope_ref text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rules jsonb := public.leaderboard_rules_2026();
  v_min integer := (v_rules ->> 'minRankedSubjects')::integer;
  v_max integer := (v_rules ->> 'maxRows')::integer;
  v_viewer uuid := auth.uid();
  v_snapshot public.leaderboard_snapshots;
  v_start timestamptz;
  v_end timestamptz;
  v_label text;
  v_status text;
  v_entries jsonb := '[]'::jsonb;
  v_me jsonb := null;
  v_reason text := null;
begin
  if v_viewer is null then raise exception 'authentication_required'; end if;
  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    raise exception 'invalid_activity';
  end if;
  if p_scope is null or not (v_rules -> 'scopes' ? p_scope) then
    raise exception 'invalid_scope';
  end if;

  select b.week_start, b.week_end into v_start, v_end
  from public.leaderboard_week_bounds_2026(now()) b;

  -- Le nom d'une commune est une DONNÉE (city_zones.name, contour réel) ; celui
  -- d'un département ou du pays n'existe dans aucune table de ce dépôt, donc
  -- rien n'est rendu et c'est le catalogue de l'app qui formule « Département
  -- 76 » dans les cinq langues. Inventer un nom ici serait à la fois une donnée
  -- fabriquée et un texte en dur côté serveur (L18).
  select c.name into v_label
  from public.board_scope_communes_2026(p_scope, p_scope_ref) c
  where p_scope = 'commune'
  limit 1;

  if not exists (select 1 from public.board_scope_communes_2026(p_scope, p_scope_ref)) then
    return jsonb_build_object(
      'contract', 'leaderboard.2026.1', 'status', 'unavailable', 'reason', 'unknown_scope',
      'activity', p_activity, 'scope', p_scope, 'scopeRef', p_scope_ref, 'scopeLabel', null,
      'measuredAt', null, 'stale', false,
      'window', jsonb_build_object('start', v_start, 'end', v_end, 'timeZone', v_rules ->> 'timeZone'),
      'entries', '[]'::jsonb, 'me', null, 'subjectsCount', null,
      'minRankedSubjects', v_min
    );
  end if;

  select * into v_snapshot
  from public.leaderboard_snapshots s
  where s.period = 'weekly'
    and s.scope = p_scope
    and s.scope_ref = p_scope_ref
    and s.subject_type = 'user'
    and s.activity = p_activity
    and s.period_start = v_start
  order by s.taken_at desc
  limit 1;

  if v_snapshot.id is null then
    -- Aucune mesure cette semaine. On ne dit PAS « personne n'a couru » : on
    -- dit qu'il n'y a pas de mesure. Les deux se ressemblent et ne sont pas la
    -- même affirmation — et seule la seconde est vérifiée.
    return jsonb_build_object(
      'contract', 'leaderboard.2026.1', 'status', 'unavailable', 'reason', 'not_measured_yet',
      'activity', p_activity, 'scope', p_scope, 'scopeRef', p_scope_ref, 'scopeLabel', v_label,
      'measuredAt', null, 'stale', false,
      'window', jsonb_build_object('start', v_start, 'end', v_end, 'timeZone', v_rules ->> 'timeZone'),
      'entries', '[]'::jsonb, 'me', null, 'subjectsCount', null,
      'minRankedSubjects', v_min
    );
  end if;

  v_status := case when coalesce(v_snapshot.subjects_count, 0) >= v_min then 'ranked' else 'not_enough_people' end;
  if v_status = 'not_enough_people' then v_reason := 'below_threshold'; end if;

  if v_status = 'ranked' then
    select coalesce(jsonb_agg(row order by row ->> 'rank'), '[]'::jsonb) into v_entries
    from (
      select jsonb_build_object(
        'rank', e.rank,
        'tiedCount', e.tied_count,
        -- Pseudonyme SCOPÉ au lecteur (0126) : comparable d'une ligne à l'autre
        -- dans CE tableau, inutilisable pour recoller deux lectures.
        'key', identity ->> 'key',
        'label', case when blocked then null else identity ->> 'label' end,
        'crew', case when blocked then null else identity -> 'crew' end,
        'isMe', e.subject_id = v_viewer,
        'subjectId', case when e.subject_id = v_viewer then e.subject_id else null end,
        'newTerrainM2', e.conquered_area_m2,
        'heldM2', e.controlled_area_m2
      ) as row
      from public.leaderboard_entries e
      cross join lateral (
        select public.territory_owner_identity_2026(e.subject_id, v_viewer) as identity
      ) i
      cross join lateral (
        select (
          public.challenge_pair_blocked_2026(v_viewer, e.subject_id)
          or exists (
            select 1 from public.friendships fr
            where fr.status = 'blocked'
              and least(fr.requester_id, fr.addressee_id) = least(v_viewer, e.subject_id)
              and greatest(fr.requester_id, fr.addressee_id) = greatest(v_viewer, e.subject_id)
          )
        ) as blocked
      ) b
      where e.snapshot_id = v_snapshot.id
        and e.subject_type = 'user'
      order by e.rank, e.subject_id
      limit v_max -- game-rules: LEADERBOARD_ROWS_LIMIT
    ) rows;
  end if;

  -- « Où j'en suis dans ce tableau » est servi DANS TOUS LES CAS où une mesure
  -- existe, y compris sous le seuil : ma propre mesure n'est pas une
  -- comparaison, c'est un fait me concernant. Absent du snapshot = mesuré, et
  -- je n'ai rien pris ici cette semaine : aucun chiffre n'est rendu, pour que
  -- l'écran écrive une phrase plutôt qu'un « 0 » nu.
  select jsonb_build_object(
    'rank', e.rank, 'tiedCount', e.tied_count, 'ranked', true,
    'newTerrainM2', e.conquered_area_m2, 'heldM2', e.controlled_area_m2
  ) into v_me
  from public.leaderboard_entries e
  where e.snapshot_id = v_snapshot.id and e.subject_type = 'user' and e.subject_id = v_viewer;

  if v_me is null then
    v_me := jsonb_build_object(
      'rank', null, 'tiedCount', null, 'ranked', false,
      'newTerrainM2', null, 'heldM2', null
    );
  end if;

  return jsonb_build_object(
    'contract', 'leaderboard.2026.1',
    'status', v_status,
    'reason', v_reason,
    'activity', p_activity,
    'scope', p_scope,
    'scopeRef', p_scope_ref,
    'scopeLabel', v_label,
    'measuredAt', v_snapshot.taken_at,
    'stale', v_snapshot.taken_at < now() - make_interval(mins => (v_rules ->> 'snapshotMaxAgeMinutes')::int),
    'window', jsonb_build_object('start', v_snapshot.period_start, 'end', v_snapshot.period_end, 'timeZone', v_rules ->> 'timeZone'),
    'entries', v_entries,
    'me', v_me,
    'subjectsCount', coalesce(v_snapshot.subjects_count, 0),
    'minRankedSubjects', v_min
  );
end $$;

comment on function public.read_leaderboard_2026(text, text, text) is
  'Lecture du classement hebdomadaire (ADR-013 §2.1). Rend ranked / not_enough_people / unavailable, jamais un tableau vide présenté comme un classement. Sous le seuil, AUCUNE ligne n''est servie. L''identité passe par territory_owner_identity_2026 (0126) : une ligne peut être anonyme, elle n''est jamais retirée.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. QUELLES PORTÉES SONT OUVERTES POUR MOI — L'OUVERTURE PAR PRÉSENCE
-- ════════════════════════════════════════════════════════════════════════════
-- Une portée n'apparaît dans l'app que si elle est OUVERTE, c'est-à-dire si sa
-- dernière mesure de la semaine compte au moins `minRankedSubjects` sujets.
-- L'app ne peint donc jamais un sélecteur à trois onglets dont deux seraient
-- gris : « aucun bouton mort » (CLAUDE.md), et l'affichage se dérive de la
-- capacité RÉELLE — ici, de la présence réelle de gens.
--
-- « Ma commune » est déduite, dans cet ordre :
--   1. la dernière commune où j'ai été CLASSÉ (fait mesuré, non déclaré) ;
--   2. à défaut, la ville de mon compte si c'est une commune réelle.
-- Aucune résolution GPS ici : cette RPC ne doit pas pouvoir servir à localiser
-- qui que ce soit, et surtout pas à mon insu. Si les deux sources sont muettes,
-- `commune` est `null` et l'écran le dit.
create or replace function public.my_leaderboard_scopes_2026(p_activity text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rules jsonb := public.leaderboard_rules_2026();
  v_min integer := (v_rules ->> 'minRankedSubjects')::integer;
  v_viewer uuid := auth.uid();
  v_start timestamptz;
  v_end timestamptz;
  v_commune text;
  v_scopes jsonb := '[]'::jsonb;
begin
  if v_viewer is null then raise exception 'authentication_required'; end if;
  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    raise exception 'invalid_activity';
  end if;

  select b.week_start, b.week_end into v_start, v_end
  from public.leaderboard_week_bounds_2026(now()) b;

  select s.scope_ref into v_commune
  from public.leaderboard_entries e
  join public.leaderboard_snapshots s on s.id = e.snapshot_id
  where e.subject_type = 'user' and e.subject_id = v_viewer
    and s.scope = 'commune' and s.activity = p_activity and s.period = 'weekly'
  order by s.taken_at desc
  limit 1;

  if v_commune is null then
    select u.city_id into v_commune
    from public.users u
    join public.city_zones z on z.city_id = u.city_id and z.city_id like 'insee-%'
    where u.id = v_viewer;
  end if;

  if v_commune is not null then
    select coalesce(jsonb_agg(scope_row order by ord), '[]'::jsonb) into v_scopes
    from (
      select 1 as ord, 'commune' as scope, v_commune as ref
      union all
      select 2, 'department', public.gryd_dept_of_insee(right(v_commune, -6))
      union all
      select 3, 'country', 'FR'
    ) candidate
    -- `left join lateral … on true` et non `cross join lateral` : une portée
    -- JAMAIS MESUREE ne rend aucune ligne, et un `cross join` la ferait
    -- disparaître de la liste. Elle doit apparaître FERMÉE, pas absente —
    -- sinon l'app ne saurait pas distinguer « pas assez de monde » de « je
    -- n'ai rien demandé ».
    left join lateral (
      select s.subjects_count, s.taken_at
      from public.leaderboard_snapshots s
      where s.period = 'weekly' and s.subject_type = 'user'
        and s.activity = p_activity and s.scope = candidate.scope and s.scope_ref = candidate.ref
        and s.period_start = v_start
      order by s.taken_at desc
      limit 1
    ) latest on true
    cross join lateral (
      select jsonb_build_object(
        'scope', candidate.scope,
        'ref', candidate.ref,
        'label', (select c.name from public.board_scope_communes_2026('commune', candidate.ref) c where candidate.scope = 'commune'),
        'subjectsCount', latest.subjects_count,
        'measuredAt', latest.taken_at,
        'open', coalesce(latest.subjects_count, 0) >= v_min
      ) as scope_row
    ) built;
  end if;

  return jsonb_build_object(
    'contract', 'leaderboard.scopes.2026.1',
    'activity', p_activity,
    'commune', v_commune,
    'window', jsonb_build_object('start', v_start, 'end', v_end, 'timeZone', v_rules ->> 'timeZone'),
    'scopes', v_scopes,
    -- Nommées ici pour que le dépôt sache qu'elles ne sont pas oubliées ; jamais
    -- peintes par l'app, parce qu'un onglet gris est un bouton mort.
    'declaredNotServed', v_rules -> 'declaredNotServed',
    'minRankedSubjects', v_min
  );
end $$;

comment on function public.my_leaderboard_scopes_2026(text) is
  'Les portées OUVERTES pour le lecteur (ouverture par présence, ADR-013 §2.1). « Ma commune » est déduite de mes classements passés, à défaut de la ville de mon compte — jamais d''une résolution GPS. Région et Europe sont déclarées et non servies.';

-- ── Privilèges : lecture par un compte, jamais par le public ───────────────
-- `anon` est explicitement révoqué : un classement nomme des personnes dans un
-- lieu. L'ouvrir à la clé publique reviendrait à publier, pour qui la possède,
-- la liste des gens qui courent dans une commune donnée cette semaine. Tout le
-- socle 2026 lit de la même façon (`get_ownership_2026`, 0118).
revoke all on function public.read_leaderboard_2026(text, text, text) from public, anon;
grant execute on function public.read_leaderboard_2026(text, text, text) to authenticated, service_role;

revoke all on function public.my_leaderboard_scopes_2026(text) from public, anon;
grant execute on function public.my_leaderboard_scopes_2026(text) to authenticated, service_role;
