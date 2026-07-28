-- 0092_city_board_discreet_and_dead_union.sql
-- GRYD — LE CLASSEMENT DE VILLE : DEUX CORRECTIONS D'HONNÊTETÉ SUR 0091.
--
-- ═══ CE QUE CETTE MIGRATION CORRIGE, ET RIEN D'AUTRE ════════════════════════
-- Un audit du 28/07/2026 a relevé deux écarts dans `city_player_surface_board`
-- (0091). Aucun des deux n'est une faute de calcul : ce sont deux endroits où
-- le code AFFIRMAIT plus que ce qu'il tenait. On les referme ici, ensemble,
-- parce qu'ils portent sur la même fonction — deux `create or replace`
-- successifs ne prouveraient rien de plus et brouilleraient la lignée.
--
-- ── 1. UNE UNION QUI NE POUVAIT RIEN UNIR (code MORT + commentaire FAUX) ────
-- 0091 construisait :
--     subjects as (select owner_id from held
--                  union select owner_id from conquered
--                  union select owner_id from defended)
-- et écrivait au-dessus : « un joueur qui a défendu ou conquis pendant la
-- période sans plus rien tenir EXISTE dans ce classement, à 0 m². L'en retirer
-- effacerait une semaine de jeu réelle. »
-- C'ÉTAIT FAUX PAR CONSTRUCTION. `conquered` et `defended` sont tous les deux
-- bâtis SUR `published`, c'est-à-dire sur les territoires contrôlés MAINTENANT.
-- Leurs `owner_id` sont donc un sous-ensemble strict de ceux de `held`, et
-- `subjects` valait exactement `held`. L'union était du code mort, et le cas
-- « 0 m² » qu'elle prétendait produire était INATTEIGNABLE : un joueur qui a
-- gagné des défenses puis perdu le territoire disparaît entièrement du
-- classement — précisément l'effacement que le commentaire déclarait interdire.
-- On ne peut PAS corriger le comportement : rattacher une défense à son
-- défenseur d'alors exigerait un historique de propriété qui n'existe pas
-- (c'est déjà le suspens 5 de 0091, hérité de 0082). On retire donc le code
-- mort et on écrit ce que la fonction FAIT, en inscrivant la conséquence en
-- suspens. Le comportement est rigoureusement inchangé.
--
-- ── 2. LE MODE DISCRET N'ÉTAIT TENU QUE PAR L'ÉCRAN DU JOUEUR LUI-MÊME ─────
-- `app/(tabs)/classement.tsx` écrivait « Mode discret §10.3 : je n'apparais
-- JAMAIS dans un leaderboard global », et l'app promet au joueur, dans les cinq
-- langues (`i18n/catalog/motivation.ts`, `flagged.ts`) : « Hors des classements
-- globaux » / « Ton rang n'apparaît pas dans les classements publics ».
-- Le seul filtre existant était pourtant CLIENT, sur SON PROPRE écran :
--     const rows = discreet ? rankedRows.filter((r) => r.me !== true) : rankedRows;
-- La ligne (user_id, pseudo, surface, défenses) d'un joueur discret continuait
-- d'être renvoyée à TOUS les autres clients authentifiés. Une protection que
-- seul le protégé ne voit pas n'est pas une protection.
-- `user_profiles.discreet_mode` EXISTE depuis 0011 et est déjà lue côté client
-- (`features/arsenal/signals.ts`). La fonction la lit désormais et exclut la
-- ligne, pour tout le monde — le protégé compris, ce qui est cohérent : il ne
-- se voyait déjà plus, il ne se verra pas davantage.
-- CE QUE ÇA NE FAIT PAS : ça ne retire aucune surface du jeu, ça retire une
-- LIGNE d'un tableau. Les rangs des autres se resserrent, exactement comme si
-- le joueur n'avait pas demandé de classement — c'est le sens du réglage.
-- CE QUE ÇA SUPPOSE, ET QUI EST FAIT DANS LE MÊME LOT : que le réglage arrive
-- jusqu'à cette colonne. Il ne le faisait pas — la préférence ne vivait qu'en
-- AsyncStorage. `features/motivation/discreetSync.ts` l'y écrit désormais, et
-- l'écran de réglages DIT quand l'écriture n'a pas abouti au lieu de laisser
-- croire à une protection serveur qui n'existerait pas.
--
-- ═══ ADDITIVE, ET DESTRUCTRICE DE RIEN ══════════════════════════════════════
-- `create or replace function` sur une fonction de LECTURE. Aucune table,
-- aucune colonne, aucune policy, aucune donnée touchée. La base de production
-- (0001-0091) survit telle quelle ; le rollback est le corps de 0091.
-- Aucun nombre de jeu n'apparaît ici (CLAUDE.md : aucun nombre magique).

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
$$;

comment on function public.city_player_surface_board(text, text, timestamptz, timestamptz, integer) is
  'E53 §10.1 — MESURES de surface des JOUEURS d''une ville, pour UNE discipline et UNE période [début, fin[. Rend surface tenue (m², dérivée de territories.area_m2 — jamais de hex_claims, §1.4 « aucun hexagone »), défenses réussies et surface conquise. N''attribue AUCUN rang : les départages de §10.2 vivent dans le moteur pur. SECURITY DEFINER pour que le classement soit le MÊME pour tous, tout en reposant lui-même le filtre de publication différée (§1.5). Depuis 0092 : le MODE DISCRET (user_profiles.discreet_mode, §10.3) retire la ligne pour TOUS les lecteurs, pas seulement sur l''écran du joueur ; et ne sont classés que les joueurs qui TIENNENT un territoire publié — 0091 prétendait classer aussi un joueur actif sans surface, c''était inatteignable (voir suspens 1). Ne lit aucune table d''achat : anti-pay-to-win par construction.';

-- Les privilèges de 0091 survivent à un `create or replace` (le propriétaire et
-- les grants ne sont pas réinitialisés). On les REPOSE tout de même, dans le
-- même ordre : révoquer d'abord, accorder ensuite. Une migration qui suppose un
-- état antérieur non vérifié est une migration qui fait confiance à sa mémoire.
revoke all on function public.city_player_surface_board(text, text, timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.city_player_surface_board(text, text, timestamptz, timestamptz, integer)
  to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 28/07/2026
-- ════════════════════════════════════════════════════════════════════════════
-- 1. UN JOUEUR QUI A DÉFENDU OU CONQUIS PUIS TOUT PERDU N'EST PLUS CLASSÉ.
--    C'est le comportement RÉEL, depuis 0091 comme depuis ici — l'union de 0091
--    ne le corrigeait pas, elle le décrivait à tort comme corrigé. Le corriger
--    vraiment exige un historique de propriété (`territory_ownership_events` ou
--    équivalent) qui n'existe pas ; sans lui, on ne SAIT pas qui défendait.
--    Écrit ici plutôt que laissé à un commentaire optimiste.
-- 2. LE MODE DISCRET NE PROTÈGE QUE CE CLASSEMENT-CI. `public_territories`
--    (0087) et `public_hex_claims` (0089) ne lisent toujours pas
--    `discreet_mode` — elles lisent `map_sharing`, qui est un autre réglage.
--    Leurs en-têtes l'inscrivaient déjà ; ce point ne se referme pas ici, il
--    reste ouvert et nommé.
-- 3. `activity_sharing` (0011) n'est lu par AUCUNE de ces trois surfaces.
-- 4. Les suspens 1 à 5 de 0091 restent valables (pas de snapshot, pas de
--    variation ▲▼, pas de période « semaine », pas de scope local/quartier/amis,
--    défenses rattachées au propriétaire actuel).
