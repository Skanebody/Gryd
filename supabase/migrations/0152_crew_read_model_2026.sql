-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0152 — LE CREW LIT ENFIN LE MONDE DE 2026 (et cesse d'afficher un gel)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ═══ LE CONSTAT, DATÉ ET VÉRIFIABLE ═════════════════════════════════════════
-- `crew_live_footprint` (0083:190-227) agrège `public.hex_claims`. Depuis
-- `0118:32` (`prevent_legacy_hex_capture_2026`), AUCUNE activité de règlement
-- 2026 ne peut plus écrire une ligne dans cette table : le trigger lève
-- `legacy_capture_forbidden_for_2026_activity`. La table est donc FIGÉE pour
-- toujours sur l'existant hérité — c'est-à-dire, en production (base à 0128,
-- 3 comptes, 0 donnée de jeu), sur RIEN.
--
-- Conséquence exacte, écran par écran :
--   · `app/crew-discovery.tsx:350` → « Aucune zone tenue » pour TOUS les crews,
--     à vie, quelle que soit leur activité réelle ;
--   · `app/crew-public.tsx:243` → idem, plus « Pas encore classé » ;
--   · `features/crew/discovery.ts:349-355` → le critère « activité récente »
--     trie sur un `lastCaptureAtMs` toujours `null` : il ne départage rien ;
--   · `crew_overview()` (0044/0071/0108) → `hexesHeld` = 0, `cityRank` calculé
--     sur ce 0, `contributionPct` = 0 pour tout le monde.
-- Une donnée gelée qui s'affiche comme une mesure est un mensonge de l'app.
--
-- ═══ CE QUI REMPLACE, ET CE QUI DISPARAÎT — L'ARBITRAGE ════════════════════
-- On ne remplace PAS « hexagones du crew » par « surface du crew ». 0126 est
-- explicite : « Capture title remains INDIVIDUAL; current crew membership is
-- separate metadata, not historical contribution or joint title. » Additionner
-- les possessions des membres pour en faire une emprise de crew fabriquerait
-- précisément le SECOND TITRE que 0118/0126 refusent — et un classement de
-- crews sur cette somme serait un palmarès sur une propriété qui n'existe pas.
--
-- Ce qui reste VRAI d'un crew, et que la base sait dire :
--   · son effectif actif ;
--   · combien de ses membres tiennent RÉELLEMENT du terrain publié en 2026 ;
--   · dans quelles disciplines (deux booléens, jamais une somme run+bike) ;
--   · l'instant de la dernière prise de contrôle d'un de ses membres ;
--   · ses SORTIES À VENIR et QUAND (§13.1 du cahier : « La découverte doit
--     montrer son accueil, ses horaires et ses sorties, avant son classement »).
-- Sont RETIRÉS, pas remplacés : `hexesHeld` / `hexesRun` / `hexesBike`,
-- `cityRank` / `crewsRanked` / `crewsInCity`, `contributionPct`. Aucun écran ne
-- doit pouvoir peindre un chiffre que le règlement 2026 ne produit plus.
--
-- ═══ L'AUDIENCE EST CELLE DE LA CARTE, PAS UNE NOUVELLE ════════════════════
-- Le prédicat de visibilité territoriale est repris MOT POUR MOT de
-- `get_ownership_2026` (0126) : l'événement doit être `published`, le
-- propriétaire doit avoir un profil dont `map_sharing <> 'none'`, et son compte
-- ne doit pas être en cours de suppression. Un membre qui a coupé le partage de
-- carte ne contribue donc à AUCUN fait de crew — pas même à un booléen.
-- Aucune identité n'est rendue par ces agrégats (§12 : on ne voit pas les
-- membres avant d'entrer) : on compte des personnes, on n'en nomme aucune.
--
-- ═══ AUCUNE GÉOMÉTRIE N'EST LUE ICI, ET C'EST DÉLIBÉRÉ ═════════════════════
-- Pas un `ST_Area`, pas un `&&`. Ces fonctions répondent à « qui est actif ? »,
-- pas à « où ? » — et cela les rend rejouables par le seul Postgres du dépôt
-- (PGlite, sans PostGIS, CLAUDE.md). La géométrie reste l'affaire de
-- `get_ownership_2026`, qui la sert avec son viewport et ses gardes.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Aucune table, colonne, contrainte, index ni donnée n'est touchée. Une seule
-- fonction est SUPPRIMÉE (`crew_live_footprint`, 0083) : plus aucun appelant
-- après ce fichier, et la laisser vivre laisserait une porte ouverte sur la
-- table gelée. Rollback = réappliquer 0083 §2/§3/§4, 0108 et 0099.
-- ════════════════════════════════════════════════════════════════════════════

-- ═══ 1. LES FAITS D'UN CREW, EN 2026 ════════════════════════════════════════
create or replace function public.crew_facts_2026(p_crew_ids uuid[])
returns table (
  crew_id          uuid,
  member_count     integer,
  members_holding  integer,
  holds_run        boolean,
  holds_bike       boolean,
  last_capture     timestamptz,
  upcoming_outings integer,
  next_outing_at   timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active as (
    select cm.crew_id, cm.user_id
    from public.crew_members cm
    join public.users u on u.id = cm.user_id
    where cm.crew_id = any(p_crew_ids)
      and cm.left_at is null
      -- 0046 : un compte en cours de suppression est invisible immédiatement.
      and u.deletion_requested_at is null
  ),
  held as (
    -- MÊME AUDIENCE que `get_ownership_2026` (0126) : publié, partagé, vivant.
    select a.crew_id, a.user_id, o.activity, o.controlled_since
    from active a
    join public.ownership_2026 o on o.owner_id = a.user_id
    join public.capture_events_2026 e on e.id = o.event_id and e.status = 'published'
    where exists (
      select 1 from public.user_profiles up
      where up.user_id = o.owner_id and up.map_sharing <> 'none'
    )
  ),
  -- Sorties : à venir, non annulées, sur l'horloge SERVEUR (0085 : une horloge
  -- de téléphone en arrière ferait remonter des rendez-vous passés).
  outings as (
    select e.crew_id, count(*)::integer as n, min(e.starts_at) as next_at
    from public.crew_events e
    where e.crew_id = any(p_crew_ids)
      and e.starts_at is not null
      and e.starts_at > now()
      and e.cancelled_at_2026 is null
    group by e.crew_id
  )
  select
    c.id,
    (select count(*) from active a where a.crew_id = c.id)::integer,
    -- Des PERSONNES, jamais des possessions : « 3 membres tiennent du terrain »
    -- est un fait ; « 47 zones » serait un titre collectif inexistant (0126).
    (select count(distinct h.user_id) from held h where h.crew_id = c.id)::integer,
    exists (select 1 from held h where h.crew_id = c.id and h.activity = 'run'),
    exists (select 1 from held h where h.crew_id = c.id and h.activity = 'bike'),
    (select max(h.controlled_since) from held h where h.crew_id = c.id),
    coalesce((select o.n from outings o where o.crew_id = c.id), 0),
    (select o.next_at from outings o where o.crew_id = c.id)
  from unnest(p_crew_ids) as c(id);
$$;

comment on function public.crew_facts_2026(uuid[]) is
  'Faits VIVANTS d''un crew sous le règlement 2026 : effectif actif, nombre de '
  'membres tenant du terrain PUBLIÉ (audience de get_ownership_2026), '
  'disciplines pratiquées, dernière prise de contrôle, sorties à venir (§13.1). '
  'Remplace crew_live_footprint (0083), qui lisait hex_claims — table gelée '
  'pour toute activité 2026 par 0118. Ne rend AUCUNE surface et AUCUN rang : le '
  'titre territorial est individuel (0126), un crew n''en possède pas.';

revoke all on function public.crew_facts_2026(uuid[]) from public, anon, authenticated;
grant execute on function public.crew_facts_2026(uuid[]) to service_role;

-- ═══ 2. DÉCOUVERTE — accueil, horaires, sorties AVANT le reste (§13.1) ══════
create or replace function public.crew_discovery(
  p_city_id text default null,
  p_query   text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_city    text;
  v_q       text;
  v_in_crew boolean;
  v_rows    jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_city := nullif(btrim(coalesce(p_city_id, '')), '');
  if v_city is null then
    select u.city_id into v_city from public.users u where u.id = v_uid;
  end if;
  if v_city is null then
    return jsonb_build_object('ok', false, 'reason', 'no_city');
  end if;

  v_q := nullif(btrim(coalesce(p_query, '')), '');

  select exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.left_at is null
  ) into v_in_crew;

  with matched as (
    select c.id, c.name, c.tag, c.color, c.city_id, c.recruitment_status, c.created_at
    from public.crews c
    where c.city_id = v_city
      and (
        v_q is null
        or c.name ilike '%' || v_q || '%'
        or coalesce(c.tag, '') ilike '%' || v_q || '%'
      )
    -- Ordre TECHNIQUE (déterministe) uniquement : la pertinence §13.1 se
    -- calcule côté client, sur les faits ci-dessous.
    order by c.created_at asc, c.id asc
    limit 200
  ),
  fp as (
    select * from public.crew_facts_2026(array(select m.id from matched m))
  ),
  friends as (
    select cm.crew_id, count(distinct cm.user_id)::integer as n
    from public.crew_members cm
    join public.friendships f
      on f.status = 'accepted'
     and ((f.requester_id = v_uid and f.addressee_id = cm.user_id)
       or (f.addressee_id = v_uid and f.requester_id = cm.user_id))
    where cm.left_at is null
    group by cm.crew_id
  ),
  mine as (
    select ca.crew_id, ca.status
    from public.crew_applications ca
    where ca.user_id = v_uid and ca.status = 'pending'
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',                 m.id,
      'name',               m.name,
      'tag',                m.tag,
      'color',              m.color,
      'cityId',             m.city_id,
      -- ACCUEIL (§13.1) : comment ce crew reçoit, et combien il reste de place.
      'recruitmentStatus',  m.recruitment_status,
      'memberCount',        fp.member_count,
      -- SORTIES (§13.1) : le rendez-vous à venir, sans son lieu — un point de
      -- rendez-vous est une information de MEMBRE (0085 : garde de vie privée
      -- sur le libellé de lieu), la DATE ne l'est pas.
      'upcomingOutings',    fp.upcoming_outings,
      'nextOutingAt',       fp.next_outing_at,
      -- ACTIVITÉ RÉELLE, règlement 2026. Aucune surface, aucun rang.
      'membersHolding',     fp.members_holding,
      'holdsRun',           fp.holds_run,
      'holdsBike',          fp.holds_bike,
      'lastCaptureAt',      fp.last_capture,
      'friendsInside',      coalesce(fr.n, 0),
      'myRequestPending',   (mine.crew_id is not null)
    )
    order by m.created_at asc, m.id asc
  ), '[]'::jsonb)
  into v_rows
  from matched m
  join fp on fp.crew_id = m.id
  left join friends fr on fr.crew_id = m.id
  left join mine on mine.crew_id = m.id;

  return jsonb_build_object(
    'ok', true,
    'cityId', v_city,
    'cityName', (select z.name from public.city_zones z where z.city_id = v_city),
    'viewerInCrew', v_in_crew,
    'crews', v_rows
  );
end;
$$;

-- Grants re-posés à l'identique de 0083 §3 : `create or replace` conserve les
-- ACL en place, mais un fichier qui ne les redit pas devient faux dès qu'on le
-- rejoue sur une base neuve (piège attrapé en vrai sur 0083 : `from public` et
-- pas `from anon` seul — anon hérite de PUBLIC).
revoke all on function public.crew_discovery(text, text) from public, anon;
grant execute on function public.crew_discovery(text, text) to authenticated;

comment on function public.crew_discovery(text, text) is
  'Découverte RÉELLE, bornée à UNE ville. Depuis 0152 : accueil, sorties à '
  'venir et activité 2026 (crew_facts_2026) — plus aucun compte d''hexagones '
  '(hex_claims est gelée par 0118) ni rang de crew. N''expose ni code de crew '
  '(0036), ni identité de membre (§12), ni lieu de rendez-vous (0085).';

-- ═══ 3. FICHE PUBLIQUE — les mêmes faits, plus mon rapport au crew ══════════
create or replace function public.crew_public_profile(p_crew_id uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew    public.crews%rowtype;
  v_fp      record;
  v_friends integer;
  v_pending boolean;
  v_member  boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_crew_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_crew from public.crews c where c.id = p_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_fp from public.crew_facts_2026(array[p_crew_id]);

  select count(distinct cm.user_id)::integer into v_friends
  from public.crew_members cm
  join public.friendships f
    on f.status = 'accepted'
   and ((f.requester_id = v_uid and f.addressee_id = cm.user_id)
     or (f.addressee_id = v_uid and f.requester_id = cm.user_id))
  where cm.crew_id = p_crew_id and cm.left_at is null;

  select exists (
    select 1 from public.crew_applications ca
    where ca.crew_id = p_crew_id and ca.user_id = v_uid and ca.status = 'pending'
  ) into v_pending;

  select exists (
    select 1 from public.crew_members cm
    where cm.crew_id = p_crew_id and cm.user_id = v_uid and cm.left_at is null
  ) into v_member;

  return jsonb_build_object(
    'ok', true,
    'crew', jsonb_build_object(
      'id',                v_crew.id,
      'name',              v_crew.name,
      'tag',               v_crew.tag,
      'color',             v_crew.color,
      'cityId',            v_crew.city_id,
      'cityName',          (select z.name from public.city_zones z where z.city_id = v_crew.city_id),
      'recruitmentStatus', v_crew.recruitment_status,
      'createdAt',         v_crew.created_at,
      'memberCount',       v_fp.member_count,
      'upcomingOutings',   v_fp.upcoming_outings,
      'nextOutingAt',      v_fp.next_outing_at,
      'membersHolding',    v_fp.members_holding,
      'holdsRun',          v_fp.holds_run,
      'holdsBike',         v_fp.holds_bike,
      'lastCaptureAt',     v_fp.last_capture,
      'friendsInside',     coalesce(v_friends, 0),
      'myRequestPending',  v_pending,
      'iAmMember',         v_member
    )
  );
end;
$$;

revoke all on function public.crew_public_profile(uuid) from public, anon;
grant execute on function public.crew_public_profile(uuid) to authenticated;

comment on function public.crew_public_profile(uuid) is
  'Fiche PUBLIQUE d''un crew : accueil, sorties à venir, activité 2026. Depuis '
  '0152, plus aucun rang de ville : il était calculé sur hex_claims, gelée par '
  '0118, et le titre territorial est individuel (0126) — un crew ne peut donc '
  'pas être classé sur une propriété qu''il n''a pas. AUCUNE identité de membre.';

-- ═══ 4. LE QG DU CREW — même bascule, même retrait ═════════════════════════
create or replace function public.crew_overview() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew    public.crews%rowtype;
  v_role    text;
  v_fp      record;
  v_members jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

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

  select * into v_fp from public.crew_facts_2026(array[v_crew.id]);

  -- Le roster porte les RÔLES (dont dépendent la modération et les actions de
  -- membre) et un booléen d'activité. Aucune part de territoire : additionner
  -- les possessions individuelles pour en tirer un pourcentage de crew
  -- fabriquerait le titre collectif que 0126 refuse.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId',         a.user_id,
        'pseudo',         u.pseudo,
        'role',           a.role,
        'holdsTerritory', exists (
          select 1
          from public.ownership_2026 o
          join public.capture_events_2026 e on e.id = o.event_id and e.status = 'published'
          where o.owner_id = a.user_id
            and exists (
              select 1 from public.user_profiles up
              where up.user_id = o.owner_id and up.map_sharing <> 'none'
            )
        )
      )
      order by u.pseudo asc
    ),
    '[]'::jsonb
  )
  into v_members
  from (
    select cm.user_id, cm.role
    from public.crew_members cm
    join public.users u2 on u2.id = cm.user_id
    where cm.crew_id = v_crew.id and cm.left_at is null and u2.deletion_requested_at is null
  ) a
  join public.users u on u.id = a.user_id;

  return jsonb_build_object(
    'ok', true,
    -- `code` ABSENT volontairement (0036).
    'crew', jsonb_build_object(
      'id',      v_crew.id,
      'name',    v_crew.name,
      'color',   v_crew.color,
      'city_id', v_crew.city_id
    ),
    'level',       v_crew.level,
    'xp',          v_crew.xp,
    'memberCount', v_fp.member_count,
    'role',        v_role,
    'territory', jsonb_build_object(
      'ruleset',        '2026.1',
      -- Des membres actifs, pas une emprise : le seul agrégat honnête.
      'membersHolding', v_fp.members_holding,
      'holdsRun',       v_fp.holds_run,
      'holdsBike',      v_fp.holds_bike,
      'lastCaptureAt',  v_fp.last_capture
    ),
    'outings', jsonb_build_object(
      'upcoming', v_fp.upcoming_outings,
      'nextAt',   v_fp.next_outing_at
    ),
    'members', coalesce(v_members, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.crew_overview() from public, anon;
grant execute on function public.crew_overview() to authenticated;

comment on function public.crew_overview() is
  'QG du crew. Depuis 0152 : territoire lu sur ownership_2026 (publié, partagé) '
  'et exprimé en MEMBRES ACTIFS, jamais en hexagones ni en rang — hex_claims est '
  'gelée par 0118 et le titre est individuel (0126). Le roster garde les rôles, '
  'qui décident des actions de modération, et perd contributionPct.';

-- ═══ 5. LE FIL DU CREW — la section « conquête » cesse d'être vide à vie ════
-- 0096 §5 / 0099 lisaient `crew_feed_events` sur `boundary_completed` et
-- `contested`. Ces deux faits ne sont écrits que par le chemin hérité
-- (`ingest_run`, écriture dans `hex_claims`/`territories`), interdit aux
-- activités 2026 par 0118 : la section était vide POUR TOUJOURS sur
-- `/crew-activite`. Elle lit maintenant les captures 2026 PUBLIÉES des membres.
--
-- La garde de 0099 reste vraie par construction : l'acteur d'une ligne est un
-- membre (ou ancien membre) du crew qui lit — `capture_events_2026.owner_id`
-- est le propriétaire, jamais un attaquant tiers. Aucun fait « on t'a pris du
-- terrain » n'est rendu : il nommerait un rival et l'heure de sa sortie.
create or replace function public.crew_conquests_2026(p_crew_id uuid) returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.row order by x.closed_at desc), '[]'::jsonb)
  from (
    select
      jsonb_build_object(
        'id',   e.id,
        'kind', 'capture_2026',
        'activity', e.activity,
        -- game-rules: PUBLIC_TIMESTAMP_TRUNC — jamais la minute exacte.
        'createdAt', date_trunc('hour', e.closed_at),
        -- Le pseudo d'un membre (ou ancien membre) de CE crew, jamais d'un tiers.
        'actorPseudo', pp.pseudo
      ) as row,
      e.closed_at
    from public.capture_events_2026 e
    left join public.public_profiles pp on pp.id = e.owner_id
    -- `exists` et non `join` : un membre qui revient a deux lignes d'adhésion,
    -- et une capture ne doit pas s'afficher deux fois pour autant.
    where exists (
        select 1 from public.crew_members cm
        where cm.user_id = e.owner_id and cm.crew_id = p_crew_id
          -- 0099 : l'appartenance se lit SANS `left_at is null` — un fait
          -- accompli AVEC le crew reste l'histoire de ses coéquipiers. Mais
          -- seulement celui-là : ce qu'on capture APRÈS être parti n'appartient
          -- plus à eux, et l'afficher dirait où court quelqu'un qui a quitté.
          and (cm.left_at is null or e.closed_at <= cm.left_at)
      )
      and e.status = 'published'
      and exists (
        select 1 from public.user_profiles up
        where up.user_id = e.owner_id and up.map_sharing <> 'none'
      )
      and exists (
        select 1 from public.users u
        where u.id = e.owner_id and u.deletion_requested_at is null
      )
      -- La publication DIFFÉRÉE de 2026 est déjà inscrite sur la ligne :
      -- `stage_capture_2026` (0118) reçoit `p_publish_after` des constantes
      -- partagées. On relit l'instant écrit, on ne recalcule pas un délai.
      and e.publish_after <= now()
      -- game-rules: CREW_ACTIVITY_WINDOW_DAYS — fenêtre d'affichage.
      and e.closed_at >= now() - make_interval(days => public.crew_activity_window_days())
    order by e.closed_at desc
    -- game-rules: CREW_ACTIVITY_CONQUEST_MAX — plafond de LECTURE.
    limit public.crew_activity_conquest_max()
  ) x;
$$;

comment on function public.crew_conquests_2026(uuid) is
  'Captures 2026 PUBLIÉES des membres d''un crew, pour le fil E48. Remplace la '
  'lecture de crew_feed_events (boundary_completed / contested), que 0118 a '
  'rendue vide à vie pour toute activité 2026. Aucune surface, aucun lieu, '
  'aucun rival nommé : un fait, son auteur (du crew), son heure tronquée.';

revoke all on function public.crew_conquests_2026(uuid) from public, anon, authenticated;
grant execute on function public.crew_conquests_2026(uuid) to service_role;

create or replace function public.crew_activity_feed()
returns jsonb language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_crew_id   uuid;
  v_role      text;
  v_announce  jsonb;
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

  select coalesce(jsonb_agg(public.crew_announcement_row(a.id) order by a.created_at desc), '[]'::jsonb)
  into v_announce
  from public.crew_announcements a
  where a.crew_id = v_crew_id and a.removed_at is null;

  return jsonb_build_object(
    'ok',               true,
    'role',             v_role,
    -- game-rules: CREW_PERMISSIONS.pinMessage — tranché SERVEUR.
    'canPost',          v_role in ('co_captain', 'founder'),
    'announcements',    coalesce(v_announce, '[]'::jsonb),
    'conquests',        public.crew_conquests_2026(v_crew_id),
    'maxAnnouncements', public.crew_announcement_max_active(),
    'bodyMax',          public.crew_announcement_body_max()
  );
end;
$$;

comment on function public.crew_activity_feed() is
  'Fil E48 : annonces épinglées + captures 2026 publiées des membres (0152). '
  'La garde de 0099 tient par construction — capture_events_2026.owner_id est '
  'le propriétaire, jamais un attaquant : le fil d''un crew ne peut plus nommer '
  'quelqu''un d''un autre crew, ni dire à un crew ce qu''on lui a repris.';

revoke all on function public.crew_activity_feed() from public, anon;
grant execute on function public.crew_activity_feed() to authenticated;

-- ═══ 6. LA PORTE SUR LA TABLE GELÉE EST FERMÉE ═════════════════════════════
-- Plus aucun appelant après ce fichier. La laisser en place inviterait un futur
-- écran à réafficher un compte d'hexagones qui ne bougera plus jamais.
drop function if exists public.crew_live_footprint(uuid[]);
