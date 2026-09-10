-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0182 — ÊTRE DANS UN CREW CHANGE QUELQUE CHOSE : les faits qui manquaient  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ═══ LA QUESTION, MOT POUR MOT (fondateur, 11/09/2026) ══════════════════════
-- « Une fois que l'on est dans un crew, qu'est-ce qu'il se passe ? Est-ce qu'il
--   y a des modifications qui se font sur l'application ? »
--
-- L'audit `docs/product/GRYD_VIE_DE_CREW_2026_09.md` répond par trois FAITS de
-- dépôt, tous vérifiables, tous corrigés ici — et par rien d'autre : aucune
-- mécanique n'est inventée dans ce fichier, aucune table n'est créée.
--
--  1. `crew_overview()` (0152) ne rend NI la ville NI le mode d'accès du crew.
--     G15 demande « nom, ville, ambiance » et §13.1 « la découverte doit montrer
--     son accueil ». Un joueur DÉCOUVRE ces deux faits avant d'entrer
--     (`crew_public_profile`, 0152 §3, les rend) et les PERD en entrant : la
--     page de son propre crew en dit moins que la fiche publique du voisin.
--     `crews.city_id` et `crews.recruitment_status` sont pourtant sur la ligne
--     déjà chargée par la fonction. Deux clés manquaient, pas une donnée.
--
--  2. `crew_activity_feed()` (0152 §5) ne rend AUCUNE adhésion. §14.2 fait de
--     « Demande d'adhésion acceptée » un des événements de crew du cahier, et
--     ADR-013 §5 tranche que le canal principal est le centre d'activité DANS
--     l'app. Aujourd'hui personne, dans un crew, n'apprend nulle part qu'un
--     nouveau membre est arrivé : ni notification (aucun appelant de
--     `claim_notification_2026`, 0141 — constat de l'audit), ni fil. Le fait
--     existe pourtant depuis 0002 : `crew_members.joined_at`.
--
--  3. Le RÉSULTAT d'une sortie ne dit rien du crew. §13.4 : « Après une première
--     contribution : "Ta sortie compte dans celle du crew." » L'écran ne pouvait
--     pas le dire : aucune lecture ne reliait UNE sortie à un crew, à un partage
--     et à un défi en cours. Les trois faits sont en base (`crew_members`,
--     `social_posts_2026.run_id`, `challenge_contributions_2026.run_id`) et
--     aucune fonction ne les réunissait.
--
-- ═══ CE QUE CE FICHIER NE FAIT PAS, ET POURQUOI ═════════════════════════════
--  · AUCUNE SURFACE, AUCUN RANG DE CREW. 0118 gèle `hex_claims`/`territories`,
--    0126 pose que le titre territorial est INDIVIDUEL et 0152 a retiré
--    `hexesHeld`/`cityRank`/`contributionPct` pour cette raison. Additionner les
--    possessions des membres fabriquerait le second titre que ces trois
--    migrations refusent. Ce fichier ne rend donc, comme 0152, que des PERSONNES
--    et des BOOLÉENS.
--  · AUCUNE NOTIFICATION N'EST ENVOYÉE. `can_notify_2026` / `claim_notification_2026`
--    (0141) n'ont, au 11/09/2026, aucun appelant dans tout le dépôt, et le push
--    distant reste impossible (entitlement retiré, ADR-013 tension n° 1 : APNs
--    non tranchés). Écrire ici un producteur sans destinataire donnerait un
--    envoi qui n'arrive nulle part. Le canal qui EXISTE est le fil in-app :
--    c'est celui qu'on alimente.
--  · AUCUNE GÉOMÉTRIE N'EST LUE. Même choix que 0152 : ces fonctions restent
--    rejouables par le seul Postgres du dépôt (PGlite, sans PostGIS). La surface
--    d'une capture reste l'affaire de `capture_result_2026`, qui la sert déjà à
--    l'écran de résultat.
--
-- ═══ L'AUDIENCE EST CELLE DE 0152, MOT POUR MOT ═════════════════════════════
-- Un membre est ACTIF (`left_at is null`) et son compte n'est pas en cours de
-- suppression (0046). Un fait territorial n'existe que si l'événement est
-- `published` et si son propriétaire n'a pas coupé le partage de carte
-- (`map_sharing <> 'none'`). Aucune identité HORS du crew n'est rendue.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Aucune table, colonne, contrainte, index ni donnée n'est touchée. Deux
-- fonctions sont remplacées par `create or replace` en conservant leur
-- signature ET leurs grants ; une seule est nouvelle. Rollback = réappliquer
-- 0152 §4 et §5, puis `drop function crew_run_impact_2026(uuid)`.
-- ════════════════════════════════════════════════════════════════════════════

-- ═══ 0. LE PLAFOND DE LECTURE DES ADHÉSIONS ════════════════════════════════
-- Même patron que 0096 §2 : une constante de jeu ne s'écrit pas dans un `where`,
-- elle a une fonction qui porte son nom et le commentaire qui la relie à
-- `packages/shared/src/game-rules.ts`.
create or replace function public.crew_activity_join_max()
returns integer language sql immutable as
  $$ select 5 $$;              -- game-rules: CREW_ACTIVITY_JOIN_MAX

revoke all on function public.crew_activity_join_max() from public, anon, authenticated;
grant execute on function public.crew_activity_join_max() to service_role;

-- ═══ 1. LE QG DIT ENFIN OÙ IL EST ET COMMENT IL ACCUEILLE ══════════════════
-- Copie CONFORME de 0152 §4, à deux clés près (`cityName`, `access`). Recopier
-- la fonction entière plutôt que la « patcher » est délibéré : `create or
-- replace` remplace le corps en bloc, et un fichier qui ne dit pas TOUT ce que
-- la fonction fait devient illisible dès la migration suivante.
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
      'city_id', v_crew.city_id,
      -- LE NOM DE LA VILLE, tel que `city_zones` le porte. `null` quand la
      -- ville du crew n'est pas une ville connue de cette base : l'écran
      -- affiche alors l'identifiant ou rien, jamais un nom de repli.
      'city_name', (select z.name from public.city_zones z where z.city_id = v_crew.city_id),
      -- L'ACCUEIL (§13.1). Le même vocabulaire fermé que `crew_public_profile`
      -- (0152 §3) et que `crew_edit` (0084) : open · on_request · invite_only.
      'access',  v_crew.recruitment_status
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
  'et exprimé en MEMBRES ACTIFS, jamais en hexagones ni en rang. Depuis 0182 : '
  'la ville (city_name) et l''accueil (access) accompagnent le nom — G15 les '
  'demande, et la fiche PUBLIQUE d''un crew les rendait déjà à qui n''y est pas '
  'encore entré.';

-- ═══ 2. LES ARRIVÉES ENTRENT DANS LE FIL DU CREW ═══════════════════════════
-- §14.2 « Demande d'adhésion acceptée » et §13.4 « les mises en avant tournent
-- entre nouveaux membres, organisateurs, réguliers ». Le fait est
-- `crew_members.joined_at` ; il n'était lu par aucune surface.
--
-- CE QUI EST RENDU, ET CE QUI NE L'EST PAS :
--  · le PSEUDO d'un membre ACTIF du crew — les membres du crew se voient déjà
--    nommés dans `crew_overview`, cette fonction n'expose donc rien de neuf ;
--  · l'instant TRONQUÉ À L'HEURE (`PUBLIC_TIMESTAMP_TRUNC`), comme les captures
--    de `crew_conquests_2026` : la minute d'arrivée de quelqu'un n'apprend rien
--    et se combine trop bien avec le reste ;
--  · JAMAIS un départ. Afficher « Untel a quitté le crew » serait une mise en
--    cause publique, jamais une nouvelle utile — et §13.5 demande l'inverse.
--  · JAMAIS une RE-adhésion silencieuse : `crew_members` porte une ligne par
--    passage (clé `crew_id,user_id,joined_at`), on lit la ligne ACTIVE, donc le
--    dernier retour, une seule fois.
create or replace function public.crew_joins_2026(p_crew_id uuid) returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.row order by x.joined_at desc), '[]'::jsonb)
  from (
    select
      jsonb_build_object(
        'userId',   cm.user_id,
        'pseudo',   pp.pseudo,
        -- game-rules: PUBLIC_TIMESTAMP_TRUNC — jamais la minute exacte.
        'joinedAt', date_trunc('hour', cm.joined_at)
      ) as row,
      cm.joined_at
    from public.crew_members cm
    join public.public_profiles pp on pp.id = cm.user_id
    where cm.crew_id = p_crew_id
      and cm.left_at is null
      -- game-rules: CREW_ACTIVITY_WINDOW_DAYS — même fenêtre que les captures.
      and cm.joined_at >= now() - make_interval(days => public.crew_activity_window_days())
    order by cm.joined_at desc
    -- game-rules: CREW_ACTIVITY_JOIN_MAX — plafond de LECTURE.
    limit public.crew_activity_join_max()
  ) x;
$$;

comment on function public.crew_joins_2026(uuid) is
  'Arrivées RÉCENTES dans un crew, pour le fil E48 (§14.2 « Demande d''adhésion '
  'acceptée »). Pseudo d''un membre ACTIF et heure tronquée. Aucun DÉPART n''est '
  'rendu : ce serait une mise en cause, pas une nouvelle.';

revoke all on function public.crew_joins_2026(uuid) from public, anon, authenticated;
grant execute on function public.crew_joins_2026(uuid) to service_role;

-- ═══ 3. LE FIL — mêmes sections, plus les arrivées ═════════════════════════
-- Copie conforme de 0152 §5, à une clé près (`joins`).
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
    'joins',            public.crew_joins_2026(v_crew_id),
    'maxAnnouncements', public.crew_announcement_max_active(),
    'bodyMax',          public.crew_announcement_body_max()
  );
end;
$$;

comment on function public.crew_activity_feed() is
  'Fil E48 : annonces épinglées + captures 2026 publiées des membres (0152) + '
  'arrivées récentes (0182). Un membre d''un crew apprend enfin, DANS l''app, '
  'qu''on vient de le rejoindre : c''est le seul canal qui existe (aucun '
  'appelant de claim_notification_2026 au 11/09/2026).';

revoke all on function public.crew_activity_feed() from public, anon;
grant execute on function public.crew_activity_feed() to authenticated;

-- ═══ 4. CE QU'UNE SORTIE A APPORTÉ AU CREW ═════════════════════════════════
-- §13.4 : « Après une première contribution : "Ta sortie compte dans celle du
-- crew." » L'écran de résultat ne pouvait pas le dire — rien ne reliait UNE
-- sortie à un crew. Cette fonction réunit TROIS faits déjà écrits, et n'en
-- calcule aucun quatrième :
--   · le crew ACTUEL de l'auteur de la sortie (`crew_members`) ;
--   · la sortie a-t-elle été PARTAGÉE avec ce crew (`social_posts_2026.run_id`,
--     0124 — un geste volontaire, jamais automatique) ;
--   · la sortie a-t-elle COMPTÉ dans un défi de crew en cours
--     (`challenge_contributions_2026.run_id`, 0122/0150), avec le secteur.
--
-- ⚠️ AUCUNE SURFACE N'EST RENDUE ICI, ET CE N'EST PAS UN OUBLI. Le terrain
-- gagné par cette sortie est déjà servi par `capture_result_2026` (0158), que
-- l'écran de résultat lit dans le même rendu. Le redire ici produirait DEUX
-- chiffres pour la même chose, qui divergeraient au premier correctif appliqué
-- d'un seul côté (la faute que 0086 §5 documente déjà pour `crew_stats`).
-- Ce que ce bloc dit du terrain est donc un FAIT DE STATUT, pas une mesure.
--
-- ⚠️ ET SURTOUT : un crew NE POSSÈDE PAS ce terrain. 0126 le pose, 0152 l'a
-- appliqué. La phrase juste est « ta capture compte parmi les membres de ton
-- crew qui tiennent du terrain », pas « +0,18 km² pour ton crew ».
create or replace function public.crew_run_impact_2026(p_run_id uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_owner     uuid;
  v_crew      public.crews%rowtype;
  v_published boolean;
  v_shared    boolean;
  v_challenge jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select r.user_id into v_owner from public.runs r where r.id = p_run_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  -- Le reçu d'une sortie n'appartient qu'à son auteur. Même garde que
  -- `capture_result_2026` (0118 §248), sans le laissez-passer service_role :
  -- aucun job n'a besoin de cette lecture, c'est une lecture d'ÉCRAN.
  if v_owner <> v_uid then
    return jsonb_build_object('ok', false, 'reason', 'not_authorized');
  end if;

  select c.* into v_crew
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = v_uid and cm.left_at is null;

  if not found then
    -- « Pas de crew » est une RÉPONSE, pas une panne : l'écran n'affiche alors
    -- aucun bloc crew, et surtout pas un bloc vide qui inviterait à en fonder un
    -- au milieu d'un résultat de course.
    return jsonb_build_object('ok', true, 'crew', null);
  end if;

  select exists (
    select 1 from public.capture_events_2026 e
    where e.run_id = p_run_id and e.status = 'published'
  ) into v_published;

  -- Partagée AVEC CE CREW, pas « partagée quelque part » : `social_posts_2026`
  -- porte le crew destinataire (0124), et quelqu'un qui a changé de crew depuis
  -- ne doit pas lire « déjà partagée » à propos d'un autre groupe.
  select exists (
    select 1 from public.social_posts_2026 p
    where p.run_id = p_run_id and p.author_id = v_uid
      and p.crew_id = v_crew.id and p.removed_at is null
  ) into v_shared;

  -- LA CONTRIBUTION À UN DÉFI. `withdrawn` est lu : une journée retirée ne
  -- compte plus (0148), et l'annoncer serait faux. Le titre du secteur vient
  -- des secteurs PUBLIÉS du défi (`crew_challenges_2026.sectors`, figés à la
  -- création par 0122) et non de l'arène : une arène retirée ou renommée ne
  -- doit pas réécrire après coup ce qu'un joueur a couru.
  select jsonb_build_object(
      'challengeId', ch.id,
      'title',       ch.title,
      'sectorTitle', (
        select s.value->>'title'
        from jsonb_array_elements(ch.sectors) as s(value)
        where s.value->>'id' = cc.sector_id
        limit 1
      ),
      'day',         cc.day
    )
  into v_challenge
  from public.challenge_contributions_2026 cc
  join public.crew_challenges_2026 ch on ch.id = cc.challenge_id
  where cc.run_id = p_run_id
    and cc.player_id = v_uid
    and cc.crew_id = v_crew.id
    and cc.withdrawn = false
  order by cc.validated_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'crew', jsonb_build_object(
      'id',    v_crew.id,
      'name',  v_crew.name,
      'color', v_crew.color
    ),
    -- Un FAIT de statut, jamais une surface (voir le docblock).
    'capturePublished', coalesce(v_published, false),
    -- Le partage est un GESTE : l'écran propose de le faire, il ne le fait pas.
    'sharedWithCrew',   coalesce(v_shared, false),
    'challenge',        v_challenge
  );
end;
$$;

comment on function public.crew_run_impact_2026(uuid) is
  'Ce qu''UNE sortie a apporté au crew de son auteur : crew actuel, capture '
  'publiée (fait de statut, la surface reste à capture_result_2026), partage '
  'volontaire avec le crew, contribution NON retirée à un défi en cours avec '
  'son secteur. Réservée à l''auteur de la sortie. Aucune surface de crew : le '
  'titre territorial est individuel (0126).';

revoke all on function public.crew_run_impact_2026(uuid) from public, anon;
grant execute on function public.crew_run_impact_2026(uuid) to authenticated;
