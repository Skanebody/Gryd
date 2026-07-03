-- GRYD — 0005 RPC claim_hexes : bras armé transactionnel d'ingest_run.
--
-- Contrat (D13/D14, SPEC §6.3, AMENDEMENT-02 §2/§6) :
--   * TOUTE la logique de DÉCISION (validité §3.2, locks, boucliers, protections,
--     multiplicateurs, plafond MAX_CLAIMS_PER_DAY, rattachement secteur) vit dans
--     l'Edge Function. Cette fonction ne fait qu'APPLIQUER atomiquement le résultat.
--   * p_claims : tableau jsonb de
--       { "h3index": "630948932073295871",   -- h3 res 10 en BIGINT, string ok (D13)
--         "outcome": "neutral"|"steal"|"defend"|"pioneer",
--         "points": 10,                      -- points finaux décidés par l'Edge Function
--         "sector_id": "<uuid>" | null,      -- secteur H3 res 7 (AMENDEMENT-02 §2)
--         "locked_until": "2026-07-04T10:00:00Z" | null,
--         "decay_at": "2026-07-24T10:00:00Z" | null }
--   * p_city_id NULLABLE (AMENDEMENT-02 §2) : la France entière est capturable.
--     Null = course hors zone dense → pas de saison de ville, points de saison ignorés.
--   * XP joueur (AMENDEMENT-02 §6, D18) : xp = points territoire × 1
--     (game-rules: XP_RATE_OF_POINTS), crédité atomiquement sur users.xp.
--     Le niveau (users.level) est recalculé par l'Edge Function (courbe hors DB).
--   * security definer + revoke : exécutable par service_role UNIQUEMENT.
--
-- Une fonction plpgsql s'exécute dans une transaction unique : tout passe ou rien.

create or replace function public.claim_hexes(
  p_run_id  uuid,
  p_user_id uuid,
  p_city_id text,
  p_claims  jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim        jsonb;
  v_h3           bigint;
  v_outcome      text;
  v_points       integer;
  v_sector_id    uuid;
  v_claim_type   text;
  v_total_points integer  := 0;
  v_applied      integer  := 0;
  v_color        smallint;
  v_season_id    uuid;
  v_is_club      boolean;
  v_foulees      integer;
  v_xp           integer  := 0;
begin
  -- Garde-fous d'application (pas de décision) : cohérence run/joueur.
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

  -- Couleur du crew actif du joueur (cache dénormalisé sur hex_claims).
  select c.color into v_color
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = p_user_id and cm.left_at is null
  limit 1;

  -- Saison active de la ville (les points de saison n'existent que si une saison
  -- court). p_city_id null (course hors zone dense) → pas de saison.
  if p_city_id is not null then
    select s.id into v_season_id
    from public.seasons s
    where s.city_id = p_city_id and s.status = 'active'
    order by s.starts_at desc
    limit 1;
  end if;

  -- ─── Application des claims ────────────────────────────────────────────────
  for v_claim in select * from jsonb_array_elements(p_claims) loop
    v_h3        := (v_claim ->> 'h3index')::bigint;
    v_outcome   := v_claim ->> 'outcome';
    v_points    := coalesce((v_claim ->> 'points')::integer, 0);
    v_sector_id := nullif(v_claim ->> 'sector_id', '')::uuid;

    if v_outcome not in ('neutral', 'steal', 'defend', 'pioneer') then
      raise exception 'claim_hexes: unknown outcome % for hex %', v_outcome, v_h3;
    end if;

    -- outcome (verbe côté ingestion) → claim_type (état persisté, doc §18.1).
    v_claim_type := case v_outcome
      when 'steal'  then 'stolen'
      when 'defend' then 'defended'
      else v_outcome -- neutral / pioneer
    end;

    if v_outcome = 'defend' then
      -- Défense : l'hex reste au joueur, seul le decay est repoussé (§3.3).
      update public.hex_claims
      set decay_at         = nullif(v_claim ->> 'decay_at', '')::timestamptz,
          run_id           = p_run_id,
          crew_color_cache = v_color,
          claim_type       = v_claim_type,
          sector_id        = coalesce(v_sector_id, sector_id)
      where h3index = v_h3
        and owner_user_id = p_user_id;
    else
      -- neutral / steal / pioneer : le joueur (re)prend l'hex.
      insert into public.hex_claims
        (h3index, city_id, sector_id, owner_user_id, crew_color_cache,
         claim_type, claimed_at, run_id, locked_until, shielded_until, decay_at)
      values
        (v_h3, p_city_id, v_sector_id, p_user_id, v_color,
         v_claim_type, now(), p_run_id,
         nullif(v_claim ->> 'locked_until', '')::timestamptz,
         null, -- un bouclier ne suit jamais l'hex chez son nouveau propriétaire
         nullif(v_claim ->> 'decay_at', '')::timestamptz)
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
        decay_at         = excluded.decay_at;
    end if;

    v_total_points := v_total_points + v_points;
    v_applied      := v_applied + 1;
  end loop;

  -- ─── Points de saison ──────────────────────────────────────────────────────
  if v_season_id is not null and v_total_points > 0 then
    insert into public.season_scores (season_id, user_id, points)
    values (v_season_id, p_user_id, v_total_points)
    on conflict (season_id, user_id) do update
      set points = season_scores.points + excluded.points;
  end if;

  -- ─── Foulées : formule gelée §3.4, appliquée (pas décidée) ici ─────────────
  select u.is_club into v_is_club from public.users u where u.id = p_user_id;

  v_foulees := floor(
    v_total_points
    * 0.1                                        -- game-rules: FOULEES_RATE_OF_POINTS
    * case when coalesce(v_is_club, false)
        then 1.5                                 -- game-rules: CLUB_FOULEES_MULTIPLIER
        else 1.0
      end
  )::integer;

  -- ─── XP joueur : permanent, 1:1 avec les points territoire (D18) ───────────
  v_xp := v_total_points * 1; -- game-rules: XP_RATE_OF_POINTS

  if v_foulees > 0 or v_xp > 0 then
    update public.users
    set foulees = foulees + coalesce(v_foulees, 0),
        xp      = xp + v_xp
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'applied',         v_applied,
    'points_total',    v_total_points,
    'foulees_awarded', coalesce(v_foulees, 0),
    'xp_awarded',      v_xp,
    'season_id',       v_season_id
  );
end;
$$;

-- Exécutable par service_role UNIQUEMENT (les Edge Functions).
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb) from public;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb) from anon;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.claim_hexes(uuid, uuid, text, jsonb) to service_role;
