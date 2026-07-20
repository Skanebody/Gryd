-- 0041_co_captures.sql
-- GRYD — AMENDEMENT-41 (LE RELAIS), chantier 1 : persistance + paiement.
--
-- « Une zone ne se prend qu'une fois — mais tous ceux qui l'ont courue sont
-- payés : part = 1/rang. » Deux objets :
--
-- 1) TABLE `hex_co_captures` — le registre des relais. Une ligne = un coureur
--    crédité d'une part sur un hex fraîchement capturé par un AUTRE. Sert à :
--    (a) calculer le RANG du prochain relayeur (nb de coureurs distincts déjà
--        crédités depuis la capture observée) ;
--    (b) le COOLDOWN 24 h par (hex, user) — anti-farm ;
--    (c) le CAP quotidien (somme des points du jour) ;
--    (d) plus tard (chantier 2) : la liste nommée des contributeurs d'une zone.
--
-- 2) RPC `claim_hexes` v0041 — ajoute l'outcome 'support' : crédite les points
--    par le chemin ÉPROUVÉ (season_scores + Foulées + XP) SANS AUCUNE écriture
--    dans hex_claims. L'invariant « un relais ne touche jamais owner/lock/decay »
--    devient STRUCTUREL : la branche `continue` avant toute instruction
--    hex_claims rend la violation physiquement impossible.
--
-- Fidèle à 0031 (garde TOCTOU, GET DIAGNOSTICS, crédit conditionnel) pour tout
-- le reste — se référer à 0031/0018/0017/0005 comme lignée.

-- ─── 1. Registre des relais ──────────────────────────────────────────────────

create table public.hex_co_captures (
  id                  uuid primary key default gen_random_uuid(),
  h3index             bigint not null,
  user_id             uuid not null references public.users (id) on delete cascade,
  run_id              uuid references public.runs (id) on delete set null,
  -- Contexte d'AFFICHAGE uniquement (couleur/attribution sociale) — jamais de
  -- propriété : le crew ne possède rien (SPEC §3.5, A-41 §1).
  crew_id             uuid references public.crews (id) on delete set null,
  -- Trace d'audit : le propriétaire au moment du relais.
  owner_user_id       uuid not null,
  -- Borne de fenêtre : le claimed_at OBSERVÉ de la capture relayée. Une
  -- re-capture ultérieure rouvre une nouvelle fenêtre (rangs repartent à 2).
  capture_claimed_at  timestamptz not null,
  -- Part harmonique appliquée (1/rang) — traçabilité/explicabilité.
  share               numeric(6, 5) not null check (share > 0 and share <= 1),
  -- Points réellement crédités (après cap quotidien / multiplicateurs répartis).
  points              integer not null default 0 check (points >= 0),
  credited_at         timestamptz not null default now()
);

-- Rang du prochain relayeur : relais d'une fenêtre de capture donnée.
create index hex_co_captures_window_idx
  on public.hex_co_captures (h3index, capture_claimed_at, credited_at);
-- Cooldown 24 h par (hex, user).
create index hex_co_captures_user_hex_idx
  on public.hex_co_captures (h3index, user_id, credited_at desc);
-- Cap quotidien par user.
create index hex_co_captures_user_day_idx
  on public.hex_co_captures (user_id, credited_at desc);

alter table public.hex_co_captures enable row level security;
-- Écriture service-role UNIQUEMENT (comme contested_group_runs, 0011).
revoke insert, update, delete on public.hex_co_captures from anon, authenticated;
-- Lecture : ses propres relais (l'explicabilité « ta part » du résultat).
create policy hex_co_captures_select_own on public.hex_co_captures
  for select using (auth.uid() = user_id);

-- ─── 2. claim_hexes v0041 : + outcome 'support' (paiement sans écriture) ─────

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

    if v_outcome not in ('neutral', 'steal', 'defend', 'pioneer', 'support') then
      raise exception 'claim_hexes: unknown outcome % for hex %', v_outcome, v_h3;
    end if;

    -- A-41 LE RELAIS : 'support' crédite les points et RIEN d'autre. Le
    -- `continue` AVANT toute instruction hex_claims rend structurellement
    -- impossible qu'un relais touche owner/lock/decay/claimed_at.
    if v_outcome = 'support' then
      v_total_points := v_total_points + v_points;
      v_applied      := v_applied + 1;
      continue;
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
