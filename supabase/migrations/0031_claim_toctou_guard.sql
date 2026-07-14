-- 0031_claim_toctou_guard.sql
-- GRYD — Garde de concurrence (TOCTOU) sur claim_hexes (audit de mise en prod : P0 intégrité).
--
-- BUG (relevé par le contre-audit) : l'outcome (steal/pioneer/neutral + points) est décidé par
-- le MOTEUR (decideClaims) contre un état hex_claims lu AVANT la RPC. La branche non-'defend'
-- appliquait ensuite `on conflict (h3index) do update set owner_user_id = excluded...`
-- INCONDITIONNELLEMENT. Deux courses capturant le même hex contesté quasi-simultanément →
-- last-write-wins : le second écrase le premier alors que sa décision reposait sur un état
-- périmé → DOUBLE-ATTRIBUTION de territoire + points incohérents. Viole la règle non
-- négociable « tout claim est décidé serveur ». De plus, 'defend' était déjà gardé
-- (where owner_user_id = p_user_id) mais créditait les points MÊME quand la ligne matchait
-- 0 ligne (hex volé entre-temps) → sur-crédit.
--
-- FIX (concurrence optimiste, PAS de SELECT ... FOR UPDATE qui sérialiserait les hex
-- contestés) : ingest_run passe désormais `expected_owner` = le propriétaire OBSERVÉ par le
-- moteur au moment de la décision. Chaque écriture n'est appliquée que si l'état DB courant
-- est TOUJOURS cohérent avec cette décision :
--   • non-'defend' : on conflict do update ... WHERE owner courant = expected_owner
--                    OU l'hex a décru (decay_at <= now(), donc libre quel que soit l'owner
--                    périmé tant que le cron decay_job n'est pas passé).
--   • 'defend'     : where owner_user_id = p_user_id (inchangé — défendre = c'est déjà à moi).
-- `insert ... on conflict do update ... where` est ATOMIQUE au niveau ligne : deux upserts
-- concurrents sur le même h3index se sérialisent, le second évalue son WHERE contre l'état
-- COMMITTÉ du premier → il détecte le conflit et n'écrit pas (0 ligne).
--
-- Les points/Foulées/applied ne sont crédités QUE si une ligne a réellement changé
-- (GET DIAGNOSTICS ROW_COUNT) → plus de double-crédit ni de points fantômes. `skipped`
-- (nouveau champ de retour, ignoré par l'appelant) rend les conflits observables.
-- Limite connue : p_xp (score.xp) reste un forfait moteur non re-réparti par hex ; en cas de
-- conflit rare, l'XP lifetime peut être très légèrement sur-créditée (n'affecte NI l'intégrité
-- territoriale NI season_scores/Foulées, désormais exacts). Acceptable pour un cas concurrent rare.
--
-- FIDÈLE à 0018 hors ces changements (garde WHERE, GET DIAGNOSTICS, crédit conditionnel,
-- champ 'skipped'). Se référer à 0018/0017/0005 comme source pour le reste.

drop function if exists public.claim_hexes(uuid, uuid, text, jsonb, integer);

create or replace function public.claim_hexes(
  p_run_id  uuid,
  p_user_id uuid,
  p_city_id text,
  p_claims  jsonb,
  p_xp      integer default null   -- score.xp (D18, sans streak/perf) ; null = rétro-compat
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim          jsonb;
  v_h3             bigint;
  v_outcome        text;
  v_points         integer;
  v_sector_id      uuid;
  v_expected_owner uuid;      -- owner observé par le moteur (garde optimiste)
  v_claim_type     text;
  v_rowcount       integer;   -- lignes réellement écrites par la dernière instruction
  v_total_points   integer  := 0;
  v_applied        integer  := 0;
  v_skipped        integer  := 0;   -- claims non appliqués (conflit de concurrence)
  v_color          smallint;
  v_season_id      uuid;
  v_is_club        boolean;
  v_foulees        integer;
  v_xp             integer  := 0;
begin
  if not exists (
    select 1 from public.runs r
    where r.id = p_run_id and r.user_id = p_user_id
  ) then
    raise exception 'claim_hexes: run % does not exist or does not belong to user %',
      p_run_id, p_user_id;
  end if;

  if p_claims is null or jsonb_typeof(p_claims) <> 'array' then
    raise exception 'claim_hexes: p_claims must be a jsonb array';
  end if;

  select c.color into v_color
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = p_user_id and cm.left_at is null
  limit 1;

  if p_city_id is not null then
    select s.id into v_season_id
    from public.seasons s
    where s.city_id = p_city_id and s.status = 'active'
    order by s.starts_at desc
    limit 1;
  end if;

  for v_claim in select * from jsonb_array_elements(p_claims) loop
    v_h3             := (v_claim ->> 'h3index')::bigint;
    v_outcome        := v_claim ->> 'outcome';
    v_points         := coalesce((v_claim ->> 'points')::integer, 0);
    v_sector_id      := nullif(v_claim ->> 'sector_id', '')::uuid;
    v_expected_owner := nullif(v_claim ->> 'expected_owner', '')::uuid;

    if v_outcome not in ('neutral', 'steal', 'defend', 'pioneer') then
      raise exception 'claim_hexes: unknown outcome % for hex %', v_outcome, v_h3;
    end if;

    v_claim_type := case v_outcome
      when 'steal'  then 'stolen'
      when 'defend' then 'defended'
      else v_outcome
    end;

    if v_outcome = 'defend' then
      update public.hex_claims
      set decay_at         = nullif(v_claim ->> 'decay_at', '')::timestamptz,
          last_defended_at = now(),
          run_id           = p_run_id,
          crew_color_cache = v_color,
          claim_type       = v_claim_type,
          sector_id        = coalesce(v_sector_id, sector_id)
      where h3index = v_h3
        and owner_user_id = p_user_id;
      get diagnostics v_rowcount = row_count;
    else
      insert into public.hex_claims
        (h3index, city_id, sector_id, owner_user_id, crew_color_cache,
         claim_type, claimed_at, run_id, locked_until, shielded_until, decay_at,
         last_defended_at)
      values
        (v_h3, p_city_id, v_sector_id, p_user_id, v_color,
         v_claim_type, now(), p_run_id,
         nullif(v_claim ->> 'locked_until', '')::timestamptz,
         null,
         nullif(v_claim ->> 'decay_at', '')::timestamptz,
         now())
      on conflict (h3index) do update set
        city_id          = excluded.city_id,
        sector_id        = excluded.sector_id,
        owner_user_id    = excluded.owner_user_id,
        crew_color_cache = excluded.crew_color_cache,
        claim_type       = excluded.claim_type,
        claimed_at       = excluded.claimed_at,
        run_id           = excluded.run_id,
        locked_until     = excluded.locked_until,
        shielded_until   = excluded.shielded_until,
        decay_at         = excluded.decay_at,
        last_defended_at = excluded.last_defended_at
      -- Garde optimiste : n'applique que si l'état DB est TOUJOURS celui décidé par le
      -- moteur (owner inchangé), OU si l'hex a décru (libre malgré un owner périmé).
      where hex_claims.owner_user_id is not distinct from v_expected_owner
         or (hex_claims.decay_at is not null and hex_claims.decay_at <= now());
      get diagnostics v_rowcount = row_count;
    end if;

    -- Crédit UNIQUEMENT si une ligne a réellement changé (sinon = conflit de concurrence :
    -- un autre coureur a pris/défendu l'hex depuis la lecture du moteur → on n'attribue rien).
    if v_rowcount > 0 then
      v_total_points := v_total_points + v_points;
      v_applied      := v_applied + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  if v_season_id is not null and v_total_points > 0 then
    insert into public.season_scores (season_id, user_id, points)
    values (v_season_id, p_user_id, v_total_points)
    on conflict (season_id, user_id) do update
      set points = season_scores.points + excluded.points;
  end if;

  select u.is_club into v_is_club from public.users u where u.id = p_user_id;

  v_foulees := floor(
    v_total_points
    * 0.1                                        -- game-rules: FOULEES_RATE_OF_POINTS
    * case when coalesce(v_is_club, false)
        then 1.5                                 -- game-rules: CLUB_FOULEES_MULTIPLIER
        else 1.0
      end
  )::integer;

  -- XP joueur permanent (D18) : SANS streak/perf. Vaut `p_xp` (= score.xp du moteur)
  -- quand fourni par ingest_run ; `v_total_points` seulement en rétro-compat (appel
  -- boundary 4-args). Corrige la divergence historique (XP boosté par streak/perf).
  v_xp := coalesce(p_xp, v_total_points * 1); -- game-rules: XP_RATE_OF_POINTS

  if v_foulees > 0 or v_xp > 0 then
    update public.users
    set foulees = foulees + coalesce(v_foulees, 0),
        xp      = xp + v_xp
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'applied',         v_applied,
    'skipped',         v_skipped,
    'points_total',    v_total_points,
    'foulees_awarded', coalesce(v_foulees, 0),
    'xp_awarded',      v_xp,
    'season_id',       v_season_id
  );
end;
$$;

revoke all on function public.claim_hexes(uuid, uuid, text, jsonb, integer) from public;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb, integer) from anon;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb, integer) from authenticated;
grant execute on function public.claim_hexes(uuid, uuid, text, jsonb, integer) to service_role;
