-- 0103_dept_player_surface_board.sql
-- GRYD — Le classement par SURFACE existe aussi a l'echelle du DEPARTEMENT.
--
-- ═══ POURQUOI ═══════════════════════════════════════════════════════════════
-- `0091` a pose le classement joueurs par surface, mais UNIQUEMENT par ville
-- (`p_city_id`). Pour un joueur seul dans sa commune, un classement ville est
-- un podium a une place : il ne donne aucun adversaire, donc aucune raison de
-- revenir. `LEADERBOARD_LEVELS` (game-rules) declare pourtant huit portees
-- dont `region` depuis le debut — aucune n'etait servie au-dessus de la ville.
--
-- ═══ POURQUOI LE DEPARTEMENT, ET PAS LA REGION ══════════════════════════════
-- Le departement se DEDUIT du code INSEE de la commune : aucune donnee nouvelle,
-- aucun referentiel a importer, donc aucun risque d'inventer une appartenance.
-- La REGION, elle, exigerait une table departement -> region (101 vers 18) qui
-- n'existe nulle part dans le depot : ce serait une donnee AJOUTEE, et elle
-- merite sa propre decision. Elle n'est pas ici, et `region` reste donc une
-- portee declaree mais non servie — dit plutot que masque.
-- Le departement est aussi la bonne MAILLE pour ce jeu : une region comme
-- l'Ile-de-France compte 12 millions d'habitants, un departement ~1 million.
--
-- ═══ AUCUNE DUPLICATION DE REGLE ════════════════════════════════════════════
-- Le corps de la fonction est la TRANSFORMATION EXACTE de
-- `city_player_surface_board` (lue en base, une seule ligne de filtre changee).
-- Toutes ses garanties suivent sans etre reecrites : publication differee, mode
-- discret exclu (0092), union des trois sous-ensembles pour ne pas effacer une
-- semaine de jeu reelle, `join users` pour ne jamais rendre une ligne sans nom,
-- separation stricte Run / Bike par `p_activity`.
-- ⚠️ Si `0091` evolue, CETTE fonction doit evoluer avec — elles sont jumelles.
--
-- ADDITIVE. Rollback = drop des deux fonctions.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Le departement, DEDUIT du code INSEE (aucune table, aucune donnee ajoutee)
-- ════════════════════════════════════════════════════════════════════════════
-- Regle INSEE : 2 caracteres, SAUF outre-mer (97x / 98x) qui en prend 3.
-- La Corse (2A / 2B) tient en 2 caracteres et n'a donc pas d'exception.
create or replace function public.gryd_dept_of_insee(p_insee text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when p_insee is null or length(p_insee) < 2 then null
    when left(p_insee, 2) in ('97', '98') then left(p_insee, 3)
    else left(p_insee, 2)
  end
$$;

comment on function public.gryd_dept_of_insee(text) is
  'Departement deduit du code INSEE d une commune (3 caracteres outre-mer, 2 sinon). Aucune donnee ajoutee : la maille est DANS le code.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Le classement, meme corps que 0091 a une ligne de filtre pres
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.dept_player_surface_board(p_dept text, p_activity text, p_period_start timestamp with time zone, p_period_end timestamp with time zone, p_limit integer)
 RETURNS TABLE(user_id uuid, pseudo text, controlled_area_m2 double precision, successful_defenses integer, conquered_area_m2 double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with published as (
    -- LA BASE COMMUNE : les territoires de CETTE ville, de CETTE discipline,
    -- tenus par un JOUEUR (E53 ; les crews sont E54 — un territoire de crew
    -- n'est la surface d'aucun joueur), effectivement contrôlés au sens unique
    -- de 0082, et PUBLIÉS.
    select t.id, t.owner_id, t.area_m2, t.controlled_since
    from public.territories t
    where public.gryd_dept_of_insee(t.city_id) = p_dept
      and t.activity = p_activity
      and t.owner_type = 'user'
      and t.owner_id is not null
      and public.territory_state_is_controlled(t.state)
      and t.publish_after <= now()
  ),
  -- §10.2 critère 1 — LA MÉTRIQUE PRINCIPALE : surface tenue MAINTENANT.
  -- C'est AUSSI, et sans détour, la liste des joueurs classés : un joueur ne
  -- figure au tableau que s'il tient au moins un territoire publié. Voir le
  -- point 1 de l'en-tête : l'union de 0091 ne pouvait rien ajouter, puisque les
  -- deux autres mesures se calculent elles-mêmes sur `published`.
  held as (
    select p.owner_id, sum(p.area_m2) as area
    from published p
    group by p.owner_id
  ),
  -- §10.2 critère 3 — surface CONQUISE sur la période. Bornes [début, fin[ :
  -- deux périodes consécutives ne comptent jamais la même conquête deux fois.
  conquered as (
    select p.owner_id, sum(p.area_m2) as area
    from published p
    where p.controlled_since >= p_period_start
      and p.controlled_since < p_period_end
    group by p.owner_id
  ),
  -- §10.2 critère 2 — défenses RÉUSSIES : contestations closes en `defended`
  -- (§9.3). `cancelled` / `transferred` n'en sont pas, `active` n'a rien prouvé.
  -- MÊME APPROXIMATION QU'EN 0082, redite plutôt que masquée : faute
  -- d'historique de propriété, une défense est rattachée au propriétaire ACTUEL
  -- du territoire.
  defended as (
    select p.owner_id, count(*)::integer as defenses
    from public.territory_contests c
    join published p on p.id = c.territory_id
    where c.status = 'defended'
      and c.resolved_at >= p_period_start
      and c.resolved_at < p_period_end
    group by p.owner_id
  )
  select
    h.owner_id,
    u.pseudo,
    h.area::double precision,
    coalesce(d.defenses, 0)::integer,
    coalesce(q.area, 0)::double precision
  from held h
  -- `join` et non `left join` : un `owner_id` qui ne désigne aucun compte est
  -- une ligne sans joueur (0074 n'a pas de clé étrangère sur `owner_id`, son
  -- suspens 3). On ne la rend pas plutôt que de la rendre sans nom.
  join public.users u on u.id = h.owner_id
  -- MODE DISCRET §10.3, TENU PAR LE SERVEUR (point 2 de l'en-tête). `left join`
  -- et `coalesce` : un joueur SANS ligne `user_profiles` n'est pas discret — le
  -- défaut de la colonne (0011) est `false`, et l'absence de profil ne doit pas
  -- se lire comme un retrait qu'il n'a pas demandé.
  left join public.user_profiles up on up.user_id = h.owner_id
  left join conquered q on q.owner_id = h.owner_id
  left join defended d on d.owner_id = h.owner_id
  -- Même exclusion qu'en 0046 : un compte en cours de suppression ne figure
  -- plus dans un classement.
  where u.deletion_requested_at is null
    and coalesce(up.discreet_mode, false) = false
  -- ⚠️ CET `order by` NE DÉCIDE AUCUN RANG. Il n'existe QUE pour que `p_limit`
  -- coupe par le haut plutôt qu'au hasard : sans lui, « les 50 premières lignes
  -- que Postgres veut bien rendre » serait une liste arbitraire. Les quatre
  -- départages de §10.2 sont appliqués APRÈS, par le moteur pur — et deux
  -- joueurs à surface égale sortent d'ici dans un ordre indifférent, c'est
  -- précisément le moteur qui les départage.
  order by h.area desc
  limit p_limit;
$function$
;


comment on function public.dept_player_surface_board(text, text, timestamptz, timestamptz, integer) is
  'Classement joueurs par surface a l echelle du DEPARTEMENT, separe Run / Bike. Jumelle de city_player_surface_board (0091) : meme corps, filtre de portee different. Toute evolution de l une doit etre repercutee sur l autre.';
