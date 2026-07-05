-- GRYD — 0017 Défense graduée + statuts de zone + decay 14 j (AMENDEMENT-23 §D,
-- doc §16/§17/§24/§25, 05/07/2026).
--
-- Le fondateur a tranché : IMPLÉMENTER pour de vrai la défense graduée, les
-- statuts de zone et le decay 14 j (remplace le decay binaire 21 j). Source de
-- vérité des constantes : packages/shared/src/game-rules.ts
--   (ZONE_DECAY_DAYS=14, DEFENSE_HOURS_TRAVERSE/LONGE/COVER=24/48/72,
--    DEFENSE_COVER_LONGE_MIN/FULL_MIN, FRONTIER_COVERAGE_BUFFER_M,
--    ZONE_STABLE_MAX_DAYS/ZONE_FRAGILE_MAX_DAYS/ZONE_DEFEND_WINDOW_HOURS).
-- Le moteur PUR (engine/coverage.ts + engine/zone.ts) calcule la couverture de
-- frontière, le niveau de défense (traverser/longer/couvrir), les heures de
-- stabilité gagnées et le statut nommé. La DB ne persiste QUE ce qui ne se
-- dérive pas au read.
--
-- MODÈLE DE PERSISTANCE (minimal, sans drift) :
--   * `hex_claims.decay_at` RESTE l'échéance de decay (= « stable_until ») —
--     posée à la capture à now + 14 j, REPOUSSÉE par une défense de
--     +24/48/72 h selon la couverture (ingest_run calcule la nouvelle valeur
--     via engine/zone.extendDecay et la passe à claim_hexes). Aucune colonne
--     stable_until redondante : decay_at JOUE ce rôle depuis toujours.
--   * NOUVELLE colonne `hex_claims.last_defended_at` : l'instant EXACT de la
--     dernière capture/défense. Remplace la reverse-computation fragile
--     (decay_at − DECAY_DAYS) qui devient fausse dès que la défense étend le
--     decay de manière graduée. Sert au cooldown de défense (§3.4) et à la
--     dérivation stable/fragile du statut (engine/zone.zoneStatus).
--
-- Les statuts nommés (stable/fragile/a_defendre/contestee/protegee/en_decay)
-- sont DÉRIVÉS au read par engine/zone.ts — pas de colonne (préférence §D).
--
-- RLS : aucune nouvelle table ; hex_claims garde sa RLS 0003 (lecture publique
-- des colonnes non sensibles via la vue publique, écriture service_role only
-- par la RPC claim_hexes SECURITY DEFINER). last_defended_at n'est écrit que
-- par la RPC — jamais par le client.

-- ═══ 1. Colonne last_defended_at + backfill ══════════════════════════════════
alter table public.hex_claims
  add column if not exists last_defended_at timestamptz;

comment on column public.hex_claims.last_defended_at is
  'Instant exact de la dernière capture/défense (AMENDEMENT-23 §D). Sert au '
  'cooldown de défense (DEFEND_COOLDOWN_HOURS) et au statut stable/fragile '
  '(engine/zone). Écrit uniquement par la RPC claim_hexes. Remplace la '
  'reverse-computation decay_at − DECAY_DAYS, fausse depuis la défense graduée.';

-- Backfill : les lignes existantes n'ont pas d'historique fin. Meilleur proxy
-- disponible = claimed_at (borne basse : au pire la zone est réputée « défendue
-- à sa capture », ce qui n'accorde jamais une défense indue et ne casse aucun
-- cooldown). Idempotent (ne touche que les NULL).
update public.hex_claims
set last_defended_at = claimed_at
where last_defended_at is null;

-- decay_at : re-documentation (14 j désormais). L'échéance des lignes déjà en
-- base n'est PAS réécrite (une zone posée à +21 j vivra sa fin de vie actuelle ;
-- toute nouvelle capture/défense applique le modèle 14 j + graduation). C'est
-- volontaire : pas de reset de masse du territoire existant.
comment on column public.hex_claims.decay_at is
  'Échéance de decay (= stable_until) : posée à la capture à now + '
  'ZONE_DECAY_DAYS (14 j), REPOUSSÉE par une défense de +24/48/72 h selon la '
  'couverture de frontière (défense graduée, engine/zone.extendDecay). '
  'null = territoire protégé nouveau joueur (< 14 j) → jamais de decay.';

-- Index : le cooldown/statut lit last_defended_at par hex (déjà couvert par la
-- PK sur h3index) ; pas d'index dédié nécessaire au MVP (accès par clé).

-- ═══ 2. RPC claim_hexes : persiste last_defended_at ══════════════════════════
-- CREATE OR REPLACE FIDÈLE à 0005 (même signature, mêmes gardes, MÊME logique
-- Foulées/XP/season_scores/return) — SEULE différence : on écrit
-- last_defended_at = now() sur DÉFENSE et sur CAPTURE (neutral/steal/pioneer).
-- decay_at continue d'être pris tel quel depuis le payload : ingest_run y met
-- déjà la valeur ÉTENDUE par la défense graduée (défenses) ou now + 14 j
-- (captures, engine/claims). Toute divergence avec 0005 hors ces 2 lignes
-- serait un bug — se référer à 0005 comme source.
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
      -- Défense : l'hex reste au joueur, le decay est REPOUSSÉ (défense graduée,
      -- valeur calculée par ingest_run via engine/zone.extendDecay) et
      -- last_defended_at = now() (AMENDEMENT-23 §D, remplace la reverse-calc).
      update public.hex_claims
      set decay_at         = nullif(v_claim ->> 'decay_at', '')::timestamptz,
          last_defended_at = now(),
          run_id           = p_run_id,
          crew_color_cache = v_color,
          claim_type       = v_claim_type,
          sector_id        = coalesce(v_sector_id, sector_id)
      where h3index = v_h3
        and owner_user_id = p_user_id;
    else
      -- neutral / steal / pioneer : le joueur (re)prend l'hex. last_defended_at
      -- = now() (la capture EST une défense fraîche pour le cycle stable/fragile).
      insert into public.hex_claims
        (h3index, city_id, sector_id, owner_user_id, crew_color_cache,
         claim_type, claimed_at, run_id, locked_until, shielded_until, decay_at,
         last_defended_at)
      values
        (v_h3, p_city_id, v_sector_id, p_user_id, v_color,
         v_claim_type, now(), p_run_id,
         nullif(v_claim ->> 'locked_until', '')::timestamptz,
         null, -- un bouclier ne suit jamais l'hex chez son nouveau propriétaire
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
        last_defended_at = excluded.last_defended_at;
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

-- Re-grant (CREATE OR REPLACE conserve les grants, mais on réaffirme le contrat
-- 0005 : service_role UNIQUEMENT).
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb) from public;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb) from anon;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.claim_hexes(uuid, uuid, text, jsonb) to service_role;
