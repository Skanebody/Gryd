-- 0049_crew_mission_inputs.sql
-- GRYD — « je cours pour l'AIDER » : les FAITS qui portent la mission prioritaire
-- du crew (AMENDEMENT-43 §0, maillon 3 ; LOT 3 de la doctrine).
--
-- Cette RPC ne CHOISIT pas la mission. Elle expose l'état RÉEL du crew ; le choix
-- est fait par la dérivation PURE `chooseCrewMission`
-- (packages/engine/src/crewMission.ts, 29 tests Deno). Séparation volontaire :
-- l'arbitrage est testable hors base, et un changement de priorité ne demande
-- aucune migration.
--
-- ═══ CE QUI EST LU, ET POURQUOI C'EST RÉEL ═══════════════════════════════════
--   · zones tenues + échéances    → hex_claims (decay_at posé à la capture) ;
--   · zones qui expirent bientôt  → même table, fenêtre PASSÉE EN PARAMÈTRE ;
--   · zones perdues récemment     → contested_group_runs (prev_owner_crew_id =
--                                   nous, winner_crew_id = un AUTRE crew) ;
--   · zones libres d'un secteur   → sectors.total_hexes − claims vivants ;
--   · boucles ouvertes            → partial_boundaries (missing_m serveur).
-- Aucune de ces valeurs n'est estimée, arrondie « au mieux » ni complétée par un
-- défaut sympathique. Ce qui n'est pas connu sort en `null` (jamais en `0`) —
-- cf. `freeHexes` ci-dessous : « inconnu » et « plus rien de libre » ne se
-- confondent pas, sous peine de proposer une conquête inexistante.
--
-- ═══ POURQUOI LES FENÊTRES SONT DES PARAMÈTRES ═══════════════════════════════
-- « à défendre = 48 h avant l'échéance » et « perte reprenable = 7 j » sont des
-- RÈGLES DE JEU. Leur seule source légitime est packages/shared/src/game-rules.ts
-- (ZONE_DEFEND_WINDOW_HOURS, CREW_MISSION_RECLAIM_WINDOW_H). Les écrire en dur
-- ici en ferait une deuxième vérité, qui dériverait au premier réglage. L'appelant
-- les passe donc ; la fonction refuse une fenêtre absente ou négative plutôt que
-- de lui substituer un défaut inventé.
-- Ce n'est pas une brèche « le client décide » : la fonction est en LECTURE SEULE,
-- strictement bornée à auth.uid(). Aucun claim, aucun score, aucune écriture.
--
-- ═══ CE QUI N'EST DÉLIBÉRÉMENT PAS RENVOYÉ ═══════════════════════════════════
--   · aucune GÉOMÉTRIE de boucle (0015 : segments / opener_ring / missing_segment
--     sont serveur only — les exposer révélerait des tracés privés) ;
--   · aucun h3index (le client n'a pas à savoir QUELLE zone : il court, le serveur
--     tranche — « tout claim est décidé serveur ») ;
--   · aucune identité de rival, aucun nom de crew adverse : la doctrine bannit
--     les rivaux fabriqués, et nommer un vrai crew adverse dans une mission
--     ouvrirait un vecteur de harcèlement non modéré ;
--   · aucune aire en m² (même raison qu'en 0044 : aucune aire réelle en base) ;
--   · aucune lecture de public.crew_leaderboard (vue matérialisée MORTE, jamais
--     rafraîchie — cf. l'exposé complet en tête de 0044).

-- ═══ 1. crew_mission_inputs() ════════════════════════════════════════════════
create or replace function public.crew_mission_inputs(
  p_defend_window_h  integer,
  p_reclaim_window_h integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_defend  interval;
  v_reclaim interval;
  v_sectors jsonb;
  v_loops   jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Fenêtres invalides : on REFUSE. Substituer un défaut ferait afficher une
  -- urgence calculée sur un seuil que personne n'a décidé.
  if p_defend_window_h is null or p_defend_window_h < 0
     or p_reclaim_window_h is null or p_reclaim_window_h < 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_window');
  end if;
  v_defend  := make_interval(hours => p_defend_window_h);
  v_reclaim := make_interval(hours => p_reclaim_window_h);

  -- Adhésion ACTIVE unique (index partiel crew_members_one_active_per_user,
  -- 0002:62) : un seul crew possible, aucune ambiguïté à arbitrer.
  select cm.crew_id into v_crew_id
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- ─── Agrégats par SECTEUR ────────────────────────────────────────────────
  with active as (
    select cm.user_id
    from public.crew_members cm
    where cm.crew_id = v_crew_id and cm.left_at is null
  ),
  -- Zones VIVANTES tenues par les membres actifs. Même prédicat de détention
  -- qu'en 0044 (decay_at null = protégé, sinon échéance future), évalué
  -- MAINTENANT. owner_user_id est nullable depuis 0006:57 : la jointure l'écarte.
  held as (
    select
      hc.sector_id,
      count(*)::integer as held_total,
      count(*) filter (
        where hc.decay_at is not null and hc.decay_at <= now() + v_defend
      )::integer as expiring_soon,
      min(hc.decay_at) as earliest_decay_at   -- min() ignore les NULL : zones protégées exclues
    from public.hex_claims hc
    join active a on a.user_id = hc.owner_user_id
    where hc.decay_at is null or hc.decay_at > now()
    group by hc.sector_id
  ),
  -- Zones perdues au profit d'un AUTRE crew, dans la fenêtre, et PAS ENCORE
  -- REPRISES. Trois précautions, chacune contre un mensonge d'écran :
  --   · count(distinct h3index) : un même hex peut avoir plusieurs lignes de
  --     contestation ; les compter toutes gonflerait artificiellement la perte ;
  --   · winner_crew_id is not null and <> nous : une contestation neutralisée ou
  --     défendue n'est PAS une perte ;
  --   · `not exists` : si un membre a déjà repris la zone depuis, la demander
  --     serait envoyer le crew courir pour rien.
  -- Le secteur vient de hex_claims (la ligne existe toujours, détenue par le
  -- vainqueur) : contested_group_runs ne porte pas de sector_id. `null` si l'hex
  -- n'est plus claimé du tout — le secteur reste alors inconnu, pas inventé.
  lost as (
    select
      hc.sector_id,
      count(distinct cg.h3index)::integer as lost_recently,
      max(cg.created_at) as last_lost_at
    from public.contested_group_runs cg
    left join public.hex_claims hc on hc.h3index = cg.h3index
    where cg.prev_owner_crew_id = v_crew_id
      and cg.winner_crew_id is not null
      and cg.winner_crew_id <> v_crew_id
      and cg.created_at >= now() - v_reclaim
      and not exists (
        select 1
        from public.hex_claims hc2
        join active a2 on a2.user_id = hc2.owner_user_id
        where hc2.h3index = cg.h3index
          and (hc2.decay_at is null or hc2.decay_at > now())
      )
    group by hc.sector_id
  ),
  -- Zones libres d'un secteur = total RÉEL du secteur − claims vivants qui y sont
  -- rattachés. `sectors.total_hexes` est posé par discover_sectors (7^3 enfants
  -- res-10 d'un res-7, propriété fixe de H3), pas estimé. greatest(...,0) : un
  -- rattachement en retard ne doit jamais produire un négatif.
  claims_per_sector as (
    select hc.sector_id, count(*)::integer as n
    from public.hex_claims hc
    where hc.sector_id is not null
      and (hc.decay_at is null or hc.decay_at > now())
    group by hc.sector_id
  ),
  free as (
    select s.id as sector_id,
           greatest(0, s.total_hexes - coalesce(c.n, 0))::integer as free_hexes
    from public.sectors s
    left join claims_per_sector c on c.sector_id = s.id
  ),
  -- `union` (et non `union all`) dédoublonne, et traite NULL = NULL — exactement
  -- ce qu'il faut : le « secteur inconnu » est UNE ligne, pas deux.
  keys as (
    select sector_id from held
    union
    select sector_id from lost
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sectorId',        k.sector_id,
        -- Nom RÉEL (reverse-geocode Nominatim, discover_sectors) ou null tant que
        -- le secteur n'est pas créé. Jamais de nom de repli inventé ici.
        'sectorName',      s.name,
        'heldTotal',       coalesce(h.held_total, 0),
        'expiringSoon',    coalesce(h.expiring_soon, 0),
        'earliestDecayAt', h.earliest_decay_at,
        'lostRecently',    coalesce(l.lost_recently, 0),
        'lastLostAt',      l.last_lost_at,
        -- null ASSUMÉ quand le secteur est inconnu : « je ne sais pas combien il
        -- reste de libre » ≠ « il ne reste rien ». Le moteur écarte ces secteurs.
        'freeHexes',       f.free_hexes
      )
      -- Ordre stable (le moteur re-trie, mais une charge utile déterministe rend
      -- les diffs et les captures d'écran de support lisibles).
      order by s.name asc nulls last, k.sector_id asc nulls last
    ),
    '[]'::jsonb
  )
  into v_sectors
  from keys k
  left join held h on h.sector_id is not distinct from k.sector_id
  left join lost l on l.sector_id is not distinct from k.sector_id
  left join public.sectors s on s.id = k.sector_id
  left join free f on f.sector_id = k.sector_id;

  -- ─── Boucles OUVERTES du crew ────────────────────────────────────────────
  -- AUCUNE géométrie (0015). missing_m est un numeric : ::float8 pour un nombre
  -- JSON (sinon jsonb sérialise une chaîne et le client aurait à la parser).
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',        pb.id,
        'name',      pb.name,
        'missingM',  pb.missing_m::float8,
        'expiresAt', pb.expires_at
      )
      order by pb.missing_m asc, pb.expires_at asc, pb.id asc
    ),
    '[]'::jsonb
  )
  into v_loops
  from public.partial_boundaries pb
  where pb.crew_id = v_crew_id
    and pb.status = 'open'
    and pb.expires_at > now();

  return jsonb_build_object(
    'ok',      true,
    'sectors', coalesce(v_sectors, '[]'::jsonb),
    'loops',   coalesce(v_loops,   '[]'::jsonb)
  );
end;
$$;

-- ═══ 2. Grants ═══════════════════════════════════════════════════════════════
-- `from public, anon` et PAS `from anon` seul : Postgres accorde d'office EXECUTE
-- à PUBLIC à la création de toute fonction, et anon est membre de PUBLIC —
-- révoquer sur anon seul laisserait le droit HÉRITÉ intact
-- (has_function_privilege('anon', …) resterait TRUE, ce que information_schema
-- ne montre pas). Patron de 0044:§2 / 0042:277-280 / 0010:184.
revoke all on function public.crew_mission_inputs(integer, integer) from public, anon;
grant execute on function public.crew_mission_inputs(integer, integer) to authenticated;

comment on function public.crew_mission_inputs(integer, integer) is
  'AMENDEMENT-43 §0 maillon 3 — FAITS de la mission prioritaire du crew de '
  'auth.uid() : agrégats par secteur (tenu / expire bientôt / perdu récemment / '
  'libre) + boucles ouvertes. LECTURE SEULE. Ne choisit PAS la mission : la '
  'dérivation pure est engine/crewMission.ts `chooseCrewMission`. Les deux '
  'fenêtres (heures) sont des PARAMÈTRES parce que leur source unique est '
  'game-rules.ts (ZONE_DEFEND_WINDOW_HOURS, CREW_MISSION_RECLAIM_WINDOW_H) ; '
  'une fenêtre nulle ou négative est refusée, jamais remplacée par un défaut. '
  'freeHexes null = INCONNU (secteur pas encore créé), surtout pas 0. Aucune '
  'géométrie, aucun h3index, aucune identité de crew adverse n''est exposée.';
