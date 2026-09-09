-- 0162 — « Ta commune, cette semaine » : LE PRENEUR DE SNAPSHOT.
-- ADR-013 §2.1, lot L. ADDITIVE. Aucune ligne créée par la migration elle-même.
--
-- ═══ CE QUI MANQUAIT DEPUIS LE 28/07/2026 ══════════════════════════════════
-- 0082 a créé `leaderboard_snapshots` / `leaderboard_entries` et n'a jamais
-- écrit dedans : « aucun écrivain hors tests ». Les deux tables sont vides en
-- production (vérifié le 09/09/2026). Voici l'écrivain — et il n'écrit que ce
-- qu'il a mesuré.
--
-- ═══ LE RANG VIENT DU MOTEUR PUR, PAS D'UN `order by` INVENTÉ ICI ══════════
-- `packages/engine/src/leaderboard.ts` est la source de vérité des départages
-- (§10.2, quatre critères, rang de COMPÉTITION où les ex æquo partagent le rang
-- et le suivant saute). Le `rank() over` ci-dessous en est la TRANSCRIPTION,
-- pas une seconde opinion :
--   · critère 1 (la mesure qui classe) = terrain NOUVEAU de la semaine ;
--   · critères 2 et 3 = néant pour ce classement — il n'a qu'une mesure, et y
--     recopier la même valeur ferait croire que deux mesures concordent ;
--   · critère 4 = ancienneté dans CE classement (`previous_snapshot_at`), le
--     plus ancien devant, « jamais classé ici » en dernier.
-- `supabase/tests/leaderboard_2026.pglite.test.mjs` fait tourner les DEUX sur
-- le même jeu de mesures et compare rang par rang : si la transcription
-- divergeait un jour du moteur, ce test tomberait avant l'écran.
--
-- ═══ LE SENS DES COLONNES DE 0082, TENU MOT POUR MOT ═══════════════════════
--   · `controlled_area_m2` = « surface contrôlée validée » → le terrain TENU ;
--   · `conquered_area_m2`  = « surface conquise sur la période » → le terrain
--     NOUVEAU de la semaine, c'est-à-dire la mesure qui a classé ;
--   · `snapshots.metric` (0160) dit laquelle des deux a fait le rang, pour
--     qu'un lecteur de la table n'ait jamais à le deviner.
-- Le classement ordonne donc sur la colonne 3 et affiche la colonne 1 comme un
-- état. C'est le contraire des sept classements de 0082, et c'est le cœur
-- d'ADR-013 : un FLUX ne se laisse pas confisquer par celui qui a commencé le
-- premier.
--
-- ⚠️ CE PRENEUR NE DÉCLENCHE JAMAIS `rebuild_ownership_2026`. Interdit posé par
-- ADR-013 §4 : le rebuild efface et rejoue une discipline entière. Un tableau
-- de bord ne commande pas un recalcul de production. Le test le vérifie sur le
-- TEXTE de la fonction, pas sur une promesse de docblock.

create or replace function public.take_leaderboard_snapshot_2026(
  p_activity text,
  p_scope text,
  p_scope_ref text,
  -- L'instant de la prise. Paramètre plutôt qu'un `now()` enterré : c'est ce
  -- qui rend la fenêtre hebdomadaire TESTABLE (une semaine s'épingle) sans
  -- ajouter un « mode accéléré » qui n'existerait que pour les tests. Réservé
  -- au service_role, comme toute la fonction.
  p_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_previous uuid;
  v_snapshot uuid;
  v_taken timestamptz := coalesce(p_at, now());
begin
  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    raise exception 'invalid_activity';
  end if;
  if p_scope is null or not (public.leaderboard_rules_2026() -> 'scopes' ? p_scope) then
    raise exception 'invalid_scope';
  end if;
  -- Une portée qui ne résout AUCUNE commune réelle n'est pas un lieu : on ne
  -- prend pas de snapshot d'un endroit qui n'existe pas dans le référentiel.
  if not exists (select 1 from public.board_scope_communes_2026(p_scope, p_scope_ref)) then
    raise exception 'unknown_scope_ref';
  end if;

  select b.week_start, b.week_end into v_start, v_end
  from public.leaderboard_week_bounds_2026(v_taken) b;

  select s.id into v_previous
  from public.leaderboard_snapshots s
  where s.period = 'weekly'
    and s.scope = p_scope
    and s.scope_ref = p_scope_ref
    and s.subject_type = 'user' -- game-rules: LEADERBOARD_RULES_2026.subject
    and s.activity = p_activity
    and s.taken_at < v_taken
  order by s.taken_at desc
  limit 1;

  insert into public.leaderboard_snapshots (
    period, scope, scope_ref, audience_user_id, activity, subject_type,
    period_start, period_end, taken_at, previous_snapshot_id, city_id, metric, subjects_count
  ) values (
    'weekly', p_scope, p_scope_ref, null, p_activity, 'user',
    v_start, v_end, v_taken, v_previous,
    case when p_scope = 'commune' then p_scope_ref else null end,
    'weekly_new_terrain_m2', -- game-rules: LEADERBOARD_RULES_2026.metric
    0
  )
  returning id into v_snapshot;

  insert into public.leaderboard_entries (
    snapshot_id, subject_type, subject_id, rank, tied_count,
    controlled_area_m2, successful_defenses, conquered_area_m2, previous_snapshot_at
  )
  with measures as (
    select * from public.board_source_metrics_2026(p_activity, p_scope, p_scope_ref, v_start, v_end)
  ),
  seniority as (
    -- « Depuis quand ce sujet est-il classé ICI » : le `taken_at` du dernier
    -- snapshot de CE tableau où il figurait. `max` et non `min` : c'est la
    -- dernière fois qu'il y était, donc la présence continue, jamais une
    -- ancienneté inventée pour un revenant.
    select e.subject_id, max(s.taken_at) as previous_at
    from public.leaderboard_snapshots s
    join public.leaderboard_entries e on e.snapshot_id = s.id and e.subject_type = 'user'
    where s.period = 'weekly'
      and s.scope = p_scope
      and s.scope_ref = p_scope_ref
      and s.subject_type = 'user'
      and s.activity = p_activity
      and s.taken_at < v_taken
    group by e.subject_id
  ),
  ranked as (
    select
      m.subject_id,
      m.new_terrain_m2,
      m.held_area_m2,
      sn.previous_at,
      rank() over (order by m.new_terrain_m2 desc, sn.previous_at asc nulls last) as position,
      count(*) over (partition by m.new_terrain_m2, sn.previous_at) as tied
    from measures m
    left join seniority sn on sn.subject_id = m.subject_id
  )
  select v_snapshot, 'user', r.subject_id, r.position, r.tied,
         r.held_area_m2, 0, r.new_terrain_m2, r.previous_at
  from ranked r;

  -- Le compte est DÉRIVÉ des lignes écrites, jamais compté à part : deux
  -- comptes indépendants finiraient par diverger, et c'est ce compte qui décide
  -- si un classement s'affiche.
  update public.leaderboard_snapshots
  set subjects_count = (select count(*) from public.leaderboard_entries e where e.snapshot_id = v_snapshot)
  where id = v_snapshot;

  return v_snapshot;
end $$;

comment on function public.take_leaderboard_snapshot_2026(text, text, text, timestamptz) is
  'Prend le snapshot hebdomadaire d''un classement (ADR-013 §2.1) : mesure, classe (transcription du moteur pur packages/engine/src/leaderboard.ts), écrit dans les tables de 0082. Ne déclenche JAMAIS rebuild_ownership_2026.';

revoke all on function public.take_leaderboard_snapshot_2026(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.take_leaderboard_snapshot_2026(text, text, text, timestamptz)
  to service_role;
