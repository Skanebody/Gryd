-- 0108_crew_overview_progress.sql
-- GRYD — Le crew peut enfin voir SA TRAJECTOIRE.
--
-- ═══ POURQUOI CETTE MIGRATION EXISTE ════════════════════════════════════════
-- `crews.xp` et `crews.level` sont écrits depuis `0010`, et RIEN ne les affiche.
-- Le client ne peut pas aller les chercher lui-même : `0036` a révoqué
-- `select on public.crews` à `anon` et `authenticated` pour protéger
-- `crews.code` (le code d'invitation est un secret). Le seul chemin honnête est
-- donc la RPC qui sert déjà le HQ crew.
--
-- ═══ CE QUE ÇA REND POSSIBLE, ET QUI EST GRATUIT ═══════════════════════════
-- La TRAJECTOIRE d'un crew — d'où il vient, où il en est, quelle est la marche
-- suivante — est le vrai produit collectif, et elle ne coûte rien (A-48 §8 :
-- « le payant, c'est comment le crew le RACONTE, jamais sa progression »).
-- Elle se gagne uniquement en courant.
--
-- ═══ POURQUOI `memberCount` N'EST PAS DÉCORATIF ════════════════════════════
-- Depuis `0107`, le barème de niveau est NORMALISÉ par la taille du crew. Sans
-- le nombre de membres, le client ne peut pas calculer le palier suivant : une
-- jauge tracée sur le barème BRUT se remplirait plus vite que le niveau
-- n'arrive, et promettrait une marche qui ne tombe pas. C'est exactement la
-- forme de mensonge que ce dépôt refuse — une promesse au-delà du code.
--
-- ═══ CE QUI NE CHANGE PAS ══════════════════════════════════════════════════
-- Le corps de la fonction est repris À L'IDENTIQUE de `0071` (dernière version),
-- par extraction et non par recopie : trois clés sont AJOUTÉES au payload, rien
-- n'est retiré ni réécrit. `code` reste ABSENT (0036), la lecture reste
-- strictement personnelle (`auth.uid()`), les grants sont inchangés.
--
-- ADDITIVE : aucune table, aucune colonne, aucune donnée touchée.
-- Rollback = restaurer la définition de 0071.

create or replace function public.crew_overview() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid           uuid := auth.uid();
  v_crew          public.crews%rowtype;
  v_role          text;
  v_hexes_held    integer;
  v_hexes_run     integer;   -- 0071 : lecture disciplinée, jamais sommée
  v_hexes_bike    integer;   -- 0071
  v_last_capture  timestamptz;
  v_city_rank     integer;
  v_crews_in_city integer;
  v_members       jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Adhésion ACTIVE unique (index partiel crew_members_one_active_per_user,
  -- 0002:62) → un seul crew possible, pas d'ambiguïté à arbitrer.
  select c.* into v_crew
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = v_uid and cm.left_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select cm.role into v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null;

  -- ─── Membres + contributions ───────────────────────────────────────────────
  -- Prédicat de détention repris de crew_leaderboard : membre ACTIF
  -- (left_at is null) et hex NON EXPIRÉ (decay_at is null → protégé compte
  -- neuf, ou decay_at dans le futur), évalué MAINTENANT.
  --
  -- LEFT JOIN volontaire : un membre qui n'a rien capturé apparaît avec 0.
  with active as (
    select cm.user_id, cm.role
    from public.crew_members cm
    join public.users u on u.id = cm.user_id
    where cm.crew_id = v_crew.id
      and cm.left_at is null
      -- 0046 : un compte en cours de suppression est INVISIBLE immédiatement.
      and u.deletion_requested_at is null
  ),
  held as (
    select
      a.user_id,
      a.role,
      -- 0071 : DISTINCT. Depuis 0070 un membre peut avoir DEUX lignes sur le
      -- même hexagone (une par discipline) ; `count(hc.h3index)` en faisait
      -- deux territoires. Sur la carte, c'est un seul hexagone.
      count(distinct hc.h3index)::integer as hexes_held,
      -- 0071 : et le détail par monde, qui lui ne mélange rien. Le `distinct`
      -- y est redondant (la clé primaire (h3index, activity) l'assure déjà) et
      -- volontairement gardé : il dit l'unité comptée au prochain lecteur.
      (count(distinct hc.h3index) filter (where hc.activity = 'run'))::integer  as hexes_run,
      (count(distinct hc.h3index) filter (where hc.activity = 'bike'))::integer as hexes_bike,
      max(hc.claimed_at) as last_capture
    from active a
    left join public.hex_claims hc
      on hc.owner_user_id = a.user_id
     and (hc.decay_at is null or hc.decay_at > now())
    group by a.user_id, a.role
  ),
  totals as (
    select coalesce(sum(h.hexes_held), 0)::integer as total,
           coalesce(sum(h.hexes_run),  0)::integer as total_run,
           coalesce(sum(h.hexes_bike), 0)::integer as total_bike,
           max(h.last_capture)                     as last_capture
    from held h
  )
  select
    t.total,
    t.total_run,
    t.total_bike,
    t.last_capture,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'userId',          h.user_id,
          'pseudo',          u.pseudo,
          'role',            h.role,
          'hexesHeld',       h.hexes_held,
          -- Part entière du membre. Deux gardes :
          --  · nullif(t.total, 0) → crew sans aucune capture ⇒ NULL ⇒ coalesce 0.
          --  · floor (et non round) → la somme des parts ne dépasse jamais 100.
          -- Le dénominateur est la SOMME des emprises membre par membre : les
          -- parts restent donc entre elles cohérentes, même si deux membres
          -- occupent le même hexagone dans deux mondes différents.
          'contributionPct',
            coalesce(floor(h.hexes_held * 100.0 / nullif(t.total, 0)), 0)::integer
        )
        order by h.hexes_held desc, u.pseudo asc
      ),
      '[]'::jsonb
    )
  into v_hexes_held, v_hexes_run, v_hexes_bike, v_last_capture, v_members
  from held h
  join public.users u on u.id = h.user_id
  cross join totals t
  group by t.total, t.total_run, t.total_bike, t.last_capture;

  -- Crew existant mais sans aucune adhésion active lisible : on ne fabrique rien.
  v_hexes_held := coalesce(v_hexes_held, 0);
  v_hexes_run  := coalesce(v_hexes_run, 0);
  v_hexes_bike := coalesce(v_hexes_bike, 0);
  v_members    := coalesce(v_members, '[]'::jsonb);

  -- ─── Rang dans la ville (frais, cf. 0044 choix n°2) ────────────────────────
  -- 0071 : le rang compte EXACTEMENT la même unité que `hexesHeld` — le couple
  -- (membre, hexagone). Un `select distinct` explicite plutôt qu'un
  -- `count(distinct (a, b))` : la ligne comptée doit se lire, pas se deviner.
  select t.rk, t.n_crews
    into v_city_rank, v_crews_in_city
  from (
    select
      c2.id,
      rank()  over (order by coalesce(h.n, 0) desc) as rk,
      count(*) over ()                              as n_crews
    from public.crews c2
    left join (
      select d.crew_id, count(*)::integer as n
      from (
        select distinct cm.crew_id, cm.user_id, hc.h3index
        from public.crew_members cm
        join public.users u on u.id = cm.user_id
        join public.hex_claims hc
          on hc.owner_user_id = cm.user_id
         and (hc.decay_at is null or hc.decay_at > now())
        where cm.left_at is null
          and u.deletion_requested_at is null   -- 0046 : invisibilité immédiate
      ) d
      group by d.crew_id
    ) h on h.crew_id = c2.id
    where c2.city_id = v_crew.city_id
  ) t
  where t.id = v_crew.id;

  return jsonb_build_object(
    'ok', true,
    -- `code` ABSENT volontairement (0036). Ne pas l'ajouter : cf. 0044 choix n°4.
    'crew', jsonb_build_object(
      'id',      v_crew.id,
      'name',    v_crew.name,
      'color',   v_crew.color,
      'city_id', v_crew.city_id
    ),
    -- ─── TRAJECTOIRE DU CREW (migration 0108) ────────────────────────────
    -- `v_crew` vient d'un `select c.*` : xp et level y sont déjà, aucune
    -- lecture supplémentaire. Ils sont exposés ICI parce que le client ne peut
    -- PAS lire `crews` (revoke de 0036, qui protège `crews.code`) — sans cette
    -- clé, l'écran de crew ne pourrait pas montrer sa propre progression.
    --
    -- `memberCount` compte les membres ACTIFS. Il n'est pas décoratif : depuis
    -- 0107 le barème de niveau est NORMALISÉ par la taille du crew, donc sans
    -- lui le client ne peut pas calculer le palier suivant, et une jauge
    -- calculée sur le barème brut se remplirait plus vite que le niveau
    -- n'arrive — elle promettrait une marche qui ne tombe pas.
    'level',       v_crew.level,
    'xp',          v_crew.xp,
    'memberCount', (
      select count(*) from public.crew_members cm2
      where cm2.crew_id = v_crew.id and cm2.left_at is null
    ),
    'role', v_role,
    'territory', jsonb_build_object(
      -- Pas de clé `areaM2` : aucune aire réelle en base (0044 choix n°1).
      'hexesHeld',     v_hexes_held,
      -- 0071 : le détail par monde. `run + bike` n'est PAS `hexesHeld` (un
      -- hexagone tenu dans les deux mondes n'y figure qu'une fois) — ces trois
      -- nombres ne s'additionnent jamais entre eux.
      'hexesByActivity', jsonb_build_object('run', v_hexes_run, 'bike', v_hexes_bike),
      'lastCaptureAt', v_last_capture,   -- null si le crew n'a jamais rien pris
      'cityRank',      v_city_rank,
      'crewsInCity',   v_crews_in_city
    ),
    'members', v_members
  );
end;
$$;