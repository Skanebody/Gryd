-- 0091_city_player_surface_board.sql
-- GRYD — E53 : LE CLASSEMENT JOUEURS BASCULE SUR LA SURFACE (spec §10.1).
--
-- ═══ LE CONSTAT QUE CETTE MIGRATION REFERME ═════════════════════════════════
-- 0082 a posé le socle serveur de l'axe SURFACE puis a écrit, dans ses suspens,
-- exactement ce qui restait faux à l'écran :
--   « 2. L'ÉCRAN LIT TOUJOURS LES POINTS. apps/mobile/app/(tabs)/classement.tsx
--     et features/social/leagueBoard.ts interrogent `player_leaderboard`
--     (season_scores.points). »
-- §10.1 dit « surface contrôlée validée », pas « points ». Un classement en
-- points est un axe OPAQUE : le joueur ne peut pas relier son rang à ce qu'il
-- voit sur la carte. Cette migration donne au client la seule chose qui lui
-- manquait pour lire le bon axe — une source de MESURES de surface, bornée à
-- une ville et à une discipline.
--
-- ═══ POURQUOI PAS LES SNAPSHOTS DE 0082 ═════════════════════════════════════
-- `leaderboard_snapshots` / `leaderboard_entries` sont la cible de §10.3, et
-- elles restent la cible. Mais PERSONNE NE PREND DE SNAPSHOT (suspens 1 de
-- 0082) : brancher l'écran dessus aujourd'hui afficherait « personne n'a encore
-- couru » à des joueurs qui tiennent du terrain — un mensonge de plus, pas de
-- moins. Tant que le preneur n'existe pas, la lecture honnête est la mesure
-- LIVE, calculée SERVEUR (c'est bien ce que §10.3 exige : « les classements ne
-- sont pas recalculés entièrement dans le CLIENT » — ici le client ne recalcule
-- rien, il reçoit des mesures serveur et n'applique que le départage).
-- Cette fonction est donc un RELAIS DATÉ, pas un second axe : quand le preneur
-- de snapshot arrivera, l'écran lira `leaderboard_entries` et cette fonction se
-- retirera. Elle ne duplique aucune règle : la définition de « surface
-- contrôlée validée » reste `territory_state_is_controlled()` de 0082, appelée
-- ici et jamais recopiée.
--
-- ═══ CE QU'ELLE NE FAIT PAS ═════════════════════════════════════════════════
--  · AUCUN RANG. Pas un `rank`, pas un `row_number()`. Les quatre départages de
--    §10.2 vivent dans le moteur pur (packages/engine/src/leaderboard.ts, testé
--    en Deno) et, côté app, dans `features/social/surfaceBoard.ts` (testé en
--    Deno lui aussi). Le seul `order by` de ce fichier sert à BORNER la lecture
--    (`p_limit`), pas à décider d'une place — c'est dit à son emplacement.
--  · AUCUNE ÉCRITURE, aucune table, aucune colonne, aucune policy modifiée.
--    Additive au sens strict : la base de production (migrations 0001-0090)
--    n'est pas touchée, `season_scores` et `player_leaderboard` restent intacts
--    et continuent de servir la PROGRESSION (§10.5).
--  · AUCUN SEUIL DE JEU. Ni taille de classement, ni fenêtre : `p_limit` et les
--    bornes de période sont décidés par l'appelant. Aucun `default` n'enterre
--    une règle dans le schéma (CLAUDE.md, aucun nombre magique).
-- Rollback = `drop function` : rien d'acquis n'est détruit, par construction.
--
-- ═══ ANTI-PAY-TO-WIN (constitution §3) ══════════════════════════════════════
-- Cette fonction ne lit QUE `territories` (surface réellement bouclée),
-- `territory_contests` (défenses réellement gagnées) et `users` (le pseudo).
-- Elle ne joint NI `purchases`, NI `entitlements`, NI `subscriptions`, NI
-- `user_items` : aucun achat ne peut déplacer une ligne, ni en ajouter une, ni
-- en mettre une en avant. Il n'existe pas non plus de paramètre de « mise en
-- avant » — un classement dont l'ordre serait négociable ne serait pas un
-- classement. C'est vérifié par le test PGlite (« aucune table d'achat »).

-- ════════════════════════════════════════════════════════════════════════════
-- LES MESURES §10.2 D'UNE VILLE, POUR LES JOUEURS D'UNE DISCIPLINE
-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER, et il faut dire précisément pourquoi : `territories` porte
-- la publication différée de §1.5 (policy `territories_select_published` de
-- 0074), qui masque à un tiers la LIGNE ENTIÈRE d'un territoire frais. Un
-- `security invoker` rendrait donc à chaque joueur un classement calculé sur ce
-- que LUI voit — c'est-à-dire un classement différent par lecteur, et faux pour
-- tout le monde. La fonction s'exécute donc avec les droits du propriétaire ET
-- REPOSE elle-même le filtre de publication (`publish_after <= now()`), pour
-- que le contournement soit impossible dans les deux sens :
--   · un rival ne peut PAS suivre à la minute la capture d'un autre joueur,
--     puisque la surface fraîche n'entre pas encore dans le total ;
--   · un joueur ne voit pas non plus SA propre surface fraîche gonfler son rang
--     avant publication — le classement dit la même chose à tout le monde.
--
-- CE QU'ELLE EXPOSE, ET POURQUOI CE N'EST PAS UNE FUITE : un pseudo et un TOTAL
-- en m². Un total ne dit ni OÙ ni QUAND (0082 le tranchait déjà pour
-- `protected_by_privacy`, dont la surface reste comptée : retirer sa surface
-- ferait payer un rang au joueur qui protège son domicile). Aucune géométrie,
-- aucun horodatage de capture, aucun `city_id` d'autrui ne sort d'ici. Le
-- réglage `map_sharing` (0087/0089) porte sur la GÉOMÉTRIE affichée sur la
-- carte ; il n'a jamais eu pour objet de retirer un joueur du classement de sa
-- ville, et l'y brancher rendrait le rang dépendant d'un réglage de carte.
-- Le mode discret §10.3 (« je n'apparais pas dans un leaderboard ») reste, lui,
-- une préférence LOCALE appliquée à l'affichage par l'écran.
create or replace function public.city_player_surface_board(
  p_city_id text,
  p_activity text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_limit integer
)
returns table (
  user_id uuid,
  pseudo text,
  controlled_area_m2 double precision,
  successful_defenses integer,
  conquered_area_m2 double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with published as (
    -- LA BASE COMMUNE : les territoires de CETTE ville, de CETTE discipline,
    -- tenus par un JOUEUR (E53 ; les crews sont E54 — un territoire de crew
    -- n'est la surface d'aucun joueur), effectivement contrôlés au sens unique
    -- de 0082, et PUBLIÉS.
    select t.id, t.owner_id, t.area_m2, t.controlled_since
    from public.territories t
    where t.city_id = p_city_id
      and t.activity = p_activity
      and t.owner_type = 'user'
      and t.owner_id is not null
      and public.territory_state_is_controlled(t.state)
      and t.publish_after <= now()
  ),
  -- §10.2 critère 1 — LA MÉTRIQUE PRINCIPALE : surface tenue MAINTENANT.
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
  ),
  -- L'UNION DES TROIS, comme `leaderboard_source_metrics` : un joueur qui a
  -- défendu ou conquis pendant la période sans plus rien tenir EXISTE dans ce
  -- classement, à 0 m². L'en retirer effacerait une semaine de jeu réelle.
  subjects as (
    select owner_id from held
    union
    select owner_id from conquered
    union
    select owner_id from defended
  )
  select
    s.owner_id,
    u.pseudo,
    coalesce(h.area, 0)::double precision,
    coalesce(d.defenses, 0)::integer,
    coalesce(q.area, 0)::double precision
  from subjects s
  -- `join` et non `left join` : un `owner_id` qui ne désigne aucun compte est
  -- une ligne sans joueur (0074 n'a pas de clé étrangère sur `owner_id`, son
  -- suspens 3). On ne la rend pas plutôt que de la rendre sans nom.
  join public.users u on u.id = s.owner_id
  left join held h on h.owner_id = s.owner_id
  left join conquered q on q.owner_id = s.owner_id
  left join defended d on d.owner_id = s.owner_id
  -- Même exclusion qu'en 0046 : un compte en cours de suppression ne figure
  -- plus dans un classement.
  where u.deletion_requested_at is null
  -- ⚠️ CET `order by` NE DÉCIDE AUCUN RANG. Il n'existe QUE pour que `p_limit`
  -- coupe par le haut plutôt qu'au hasard : sans lui, « les 50 premières lignes
  -- que Postgres veut bien rendre » serait une liste arbitraire. Les quatre
  -- départages de §10.2 sont appliqués APRÈS, par le moteur pur — et deux
  -- joueurs à surface égale sortent d'ici dans un ordre indifférent, c'est
  -- précisément le moteur qui les départage.
  order by coalesce(h.area, 0) desc
  limit p_limit;
$$;

comment on function public.city_player_surface_board(text, text, timestamptz, timestamptz, integer) is
  'E53 §10.1 — MESURES de surface des JOUEURS d''une ville, pour UNE discipline et UNE période [début, fin[. Rend surface tenue (m², dérivée de territories.area_m2 — jamais de hex_claims, §1.4 « aucun hexagone »), défenses réussies et surface conquise. N''attribue AUCUN rang : les départages de §10.2 vivent dans le moteur pur. SECURITY DEFINER pour que le classement soit le MÊME pour tous, tout en reposant lui-même le filtre de publication différée (§1.5) — la surface fraîche n''entre dans aucun total, pas même celui de son propriétaire. Ne lit aucune table d''achat : anti-pay-to-win par construction. Relais daté en attendant le preneur de snapshots de §10.3 (suspens 1 de 0082).';

-- ── PRIVILÈGES ──────────────────────────────────────────────────────────────
-- `security definer` + `grant execute` à `public` serait une porte ouverte :
-- Postgres accorde EXECUTE à PUBLIC par défaut sur toute fonction créée. On
-- révoque d'abord, on accorde ensuite — dans cet ordre, sinon la révocation
-- emporterait le grant.
revoke all on function public.city_player_surface_board(text, text, timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.city_player_surface_board(text, text, timestamptz, timestamptz, integer)
  to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/city_player_surface_board.pglite.test.mjs` rejoue la lignée
-- complète sur un Postgres réel (PGlite) et vérifie : la surface vient de
-- `territories`, les crews n'y sont pas, Run et Bike ne se rencontrent jamais,
-- une autre ville n'y entre pas, un territoire NON PUBLIÉ n'y entre pas (pas
-- même pour son propriétaire), les états d'historique n'y entrent pas, un
-- compte en suppression est exclu, défenses et conquêtes sont bornées par la
-- période, un joueur sans surface mais actif sort à 0 m², `p_limit` coupe par
-- le haut, et les privilèges d'exécution sont bien fermés à `anon`.
--
-- CE QU'IL NE PROUVE PAS : l'EFFET de la RLS (PGlite tourne en superutilisateur
-- et n'a ni PostGIS ni rôles applicatifs) — `npm run verify:rls` s'en charge,
-- hors du gate.
--
-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 28/07/2026
-- ════════════════════════════════════════════════════════════════════════════
-- 1. LE 4ᵉ DÉPARTAGE DE §10.2 (« timestamp du snapshot précédent ») NE
--    DÉPARTAGE RIEN, puisque aucun snapshot n'est pris. Deux joueurs égaux sur
--    les trois premiers critères restent EX ÆQUO — l'écran le dit en toutes
--    lettres plutôt que d'inventer un ordre.
-- 2. AUCUNE VARIATION « ▲2 / ▼1 ». E53 la demande ; elle exige le rang du
--    snapshot précédent, donc le preneur de snapshots. Elle est ABSENTE de
--    l'écran, pas simulée.
-- 3. PAS DE PÉRIODE « SEMAINE » À L'ÉCRAN. Les bornes existent ici, mais elles
--    ne bornent que les critères 2 et 3 (départages) : la métrique principale
--    est la surface tenue MAINTENANT. Un sélecteur « Semaine / Saison » qui ne
--    changerait que des départages invisibles serait un contrôle qui ment ;
--    l'écran passe donc les bornes de la SAISON active et n'affiche pas de
--    sélecteur tant qu'une vraie agrégation hebdomadaire n'existe pas.
-- 4. SCOPES `local` / `quartier` / `amis` ABSENTS. Cette fonction ne connaît que
--    la VILLE. Les mailles ne sont toujours pas décidées (suspens 5 de 0082) et
--    inventer un découpage le figerait en douce.
-- 5. APPROXIMATION HÉRITÉE DE 0082 : défenses et conquêtes sont rattachées au
--    propriétaire ACTUEL du territoire, faute de table d'historique de
--    propriété. Une défense réussie puis un territoire perdu dans la même
--    période créditent le nouveau propriétaire.
