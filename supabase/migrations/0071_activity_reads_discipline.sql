-- 0071_activity_reads_discipline.sql
-- GRYD — LES LECTURES QUI SOMMAIENT ENCORE LES DEUX MONDES (26/07/2026).
--
-- 0070 a discipliné le SCHÉMA du territoire : `hex_claims` a la clé composite
-- `(h3index, activity)`, un cycliste ne peut plus voler la zone d'un coureur.
-- Elle n'a PAS discipliné tout ce qui LIT ce territoire. Deux lecteurs
-- comptaient encore des lignes sans regarder leur monde :
--
--   1. `crew_overview()` (0044, repatchée 0046) — `count(hc.h3index)` sur une
--      jointure `owner_user_id` SEUL. Un joueur qui tient le MÊME hexagone à
--      pied ET à vélo y compte DEUX fois : son `hexesHeld`, le total du crew et
--      le rang de ville sont gonflés. La carte Crew affiche donc une emprise
--      que la carte ne montre pas.
--   2. `active_bonuses` (0016) — la table n'a aucune colonne de discipline.
--      `digest_job` ouvrait donc une fenêtre « Défense critique » pour un crew
--      parce qu'une zone VÉLO s'efface, et n'importe quelle course pouvait y
--      répondre. Même faute pour « Finisher », dont la frontière source PORTE
--      pourtant sa discipline depuis 0070 (`partial_boundaries.activity`).
--
-- Référence : planche E14 (« jamais Run + Bike dans une même lecture
-- compétitive… JAMAIS sommées ») et `ACTIVITY_SCOPE.territory = 'per_activity'`
-- (packages/shared/src/game-rules.ts), écrit par ce même chantier.
--
-- ═══ CE QUE CETTE MIGRATION NE FAIT PAS (à ne pas croire acquis) ════════════
--
-- · Elle ne touche PAS `0070` : une migration appliquée n'est jamais réécrite.
-- · Elle ne touche PAS `sector_snapshot`, dont la clé primaire est `sector_id`
--   SEUL. La discipliner y ajouterait une seconde ligne par secteur, et le
--   lecteur mobile (`apps/mobile/src/features/map/useSectorSnapshots.ts`) en
--   recevrait deux pour une : c'est un chantier CONJOINT schéma + carte, hors
--   de ce lot. Le secteur reste donc une lecture MÊLÉE — connue, écrite, pas
--   corrigée ici.
-- · Elle ne change PAS `ingest_run`, qui RÉCOMPENSE les fenêtres de bonus
--   (`active_bonuses`) sans encore filtrer sur `activity` : la colonne posée
--   ici est écrite par `digest_job` et LUE par personne tant que ce lot-là
--   n'est pas fait. Une fenêtre vélo peut donc encore être réclamée par une
--   course. C'est un progrès partiel, dit comme tel : la discipline est
--   ENREGISTRÉE (elle ne l'était pas), elle n'est pas encore OPPOSÉE.
-- · Elle ne scinde PAS `crew_overview()` par discipline. `hexesHeld` reste UNE
--   emprise (« combien d'hexagones le crew occupe »), pas la somme de deux
--   scores — et la lecture disciplinée est fournie À CÔTÉ (`hexesByActivity`),
--   prête pour le jour où la carte Crew saura choisir un monde.

-- ═══ 1. active_bonuses : une fenêtre appartient (ou non) à un monde ══════════
--
-- NULLABLE, et ce n'est pas une facilité : certaines fenêtres n'ONT pas de
-- discipline. Le « Coffre Crew » se déclenche sur la progression hebdo du
-- coffre, qui n'appartient à aucun monde — lui coller 'run' par défaut serait
-- inventer une information. NULL veut dire « cette fenêtre n'est pas
-- disciplinée », jamais « on ne sait pas ».
--
-- Les lignes ANTÉRIEURES à cette migration restent NULL elles aussi, faute de
-- monde enregistré à l'époque. L'ambiguïté se purge d'elle-même : une fenêtre
-- vit au plus quelques heures (BONUS_DURATION_H) et `digest_job` les expire à
-- chaque passage — sous 24 h, tout NULL restant signifie bien « sans monde ».
alter table public.active_bonuses
  add column if not exists activity text
    constraint active_bonuses_activity_check
      check (activity is null or activity in ('run', 'bike'));

comment on column public.active_bonuses.activity is
  'Discipline de la fenêtre (0071). NULL = fenêtre SANS discipline (coffre '
  'crew : sa progression n''appartient à aucun monde), pas « inconnue ». '
  '« Défense critique » et « Finisher » la portent : leur déclencheur est un '
  'territoire, et un territoire vit dans UN monde (E14). Écrite par '
  'digest_job ; ingest_run ne la lit PAS ENCORE (cf. en-tête 0071).';

-- L'index (subject_id, status, expires_at) de 0016 sert toujours la recherche
-- anti-doublon : la discipline y est un filtre RÉSIDUEL sur quelques lignes.
-- Aucun index de plus tant que la table reste ce qu'elle est — courte et
-- balayée par sujet.

-- ═══ 2. crew_overview() : un hexagone tenu dans deux mondes reste UN hexagone ═
--
-- Redéfinition de la fonction de 0044 (repatchée 0046), identique À TROIS
-- CHANGEMENTS PRÈS, tous marqués « 0071 » dans le corps :
--   a. `count(distinct hc.h3index)` au lieu de `count(hc.h3index)` — l'unité
--      devient le couple (membre, hexagone), et non plus la LIGNE de claim ;
--   b. le rang de ville compte la même unité (`select distinct` explicite),
--      sinon un crew serait classé sur une règle et affiché sur une autre ;
--   c. `territory.hexesByActivity` — la lecture DISCIPLINÉE, additive, que
--      l'app pourra afficher sans que ce lot ait à toucher l'écran.
--
-- CONTRAT DE RETOUR PRÉSERVÉ : mêmes clés, mêmes types, une clé EN PLUS.
-- `apps/mobile/src/features/crew/real.ts` lit défensivement clé par clé — un
-- champ supplémentaire est ignoré, aucun écran ne casse.
--
-- POURQUOI PAS UNE SOMME `run + bike` : parce qu'elle serait fausse dans les
-- deux sens. Elle compterait deux fois l'hexagone tenu dans les deux mondes, et
-- elle prétendrait qu'un territoire à pied et un territoire à vélo se cumulent
-- — exactement ce que E14 interdit. `hexesHeld` répond donc à UNE question
-- précise : combien d'hexagones distincts les membres actifs occupent-ils.
-- `hexesByActivity` répond à l'autre : combien dans chaque monde. La somme des
-- deux mondes est TOUJOURS ≥ hexesHeld ; l'écart, ce sont les joueurs complets.

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

-- ═══ 3. Grants (inchangés, ré-affirmés) ══════════════════════════════════════
-- `create or replace` conserve les privilèges ; on les réécrit quand même pour
-- qu'une base reconstruite depuis zéro n'ait pas à dépendre de l'ordre des
-- fichiers. Lecture strictement personnelle (auth.uid()) : rien pour anon, et
-- `from public, anon` (pas `from anon` seul) car anon hérite de PUBLIC.
revoke all on function public.crew_overview() from public, anon;
grant execute on function public.crew_overview() to authenticated;
