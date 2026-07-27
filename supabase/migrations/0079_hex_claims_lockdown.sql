-- 0079_hex_claims_lockdown.sql
-- GRYD — FERMETURE DE `hex_claims` (AUDIT R3 : le point de vie privée le plus
-- sérieux du backend). Spec produit §12.1, §12.3, §1.5.
--
-- ═══ LE DÉFAUT, TEL QU'IL EXISTE AVANT CETTE MIGRATION ══════════════════════
-- `0003_rls.sql:114` :
--     create policy hex_claims_select_all on public.hex_claims
--       for select to authenticated using (true);
--
-- Tout joueur connecté lit donc la table ENTIÈRE, colonnes comprises :
--   · `owner_user_id` + `h3index` — QUI tient QUOI, à la cellule H3 res 10 près ;
--   · `claimed_at` — QUAND, à la microseconde, SANS aucun délai ;
--   · `run_id` — la course qui a produit la cellule : toutes les cellules d'une
--     même sortie se regroupent par cette clé, ce qui redessine le PARCOURS ;
--   · `decay_at` — qui vaut `claimed_at + DECAY_DAYS` : publier l'un publie
--     l'autre. Cacher `claimed_at` en laissant `decay_at` exact serait du décor ;
--   · `locked_until` / `shielded_until` — deux horloges de plus, mêmes fuites.
--
-- Conséquence concrète : `select claimed_at from hex_claims where owner_user_id
-- = '<rival>'` rend l'emploi du temps de sortie de n'importe qui — « il part à
-- 7 h 12 tous les mardis, par là ». C'est exactement ce que §12.3 interdit (« un
-- territoire public est une géométrie DÉRIVÉE, il ne doit pas permettre de
-- reconstruire le trajet privé exact ») et ce que §1.5 (publication différée)
-- prétend protéger.
--
-- ═══ POURQUOI C'EST FERMABLE MAINTENANT, ET PAS EN 0077 ═════════════════════
-- 0077 §3 avait NOMMÉ l'ordre obligatoire : « (a) les lectures client basculent
-- sur une surface publique ; (b) SEULEMENT ENSUITE la policy est restreinte.
-- Inverser les deux casse la carte. » Cette migration fait (b) ET fournit la
-- surface de (a) — la vue `public_hex_claims` ci-dessous — parce que la seule
-- lecture client qui avait besoin des cellules D'AUTRUI est
-- `apps/mobile/src/features/map/hexClaims.ts`, rebranchée dans le même lot.
--
-- ═══ QUI LIT `hex_claims`, ET CE QUE CETTE MIGRATION LEUR FAIT ══════════════
-- Relevé exhaustif (grep `from('hex_claims')` + fonctions/vues SQL), 27/07/2026 :
--
--  A. CLIENTS (clé anon → rôle `authenticated`, donc SOUMIS à la RLS) — 2 seuls :
--     1. `apps/mobile/src/features/map/hexClaims.ts` (2 lectures) — peignait
--        TOUTES les cellules, les siennes ET celles d'autrui. C'est LE
--        consommateur que la fermeture aurait cassé. Il est rebranché : ses
--        cellules viennent de la table (précision réelle), celles des autres de
--        `public_hex_claims`.
--     2. `apps/mobile/src/features/mission/useRealMissionCore.ts` — déjà borné
--        à `.eq('owner_user_id', session.user.id)`. La nouvelle policy est
--        exactement son besoin : RIEN à changer, et c'est vérifiable en une
--        ligne de grep.
--
--  B. ÉCRIVAINS / JOBS (clé service_role → BYPASSRLS) — INTOUCHÉS :
--     `ingest_run`, `decay_job`, `digest_job`, `season_close`,
--     `discover_sectors`, `steal_push_job`. La RLS ne s'applique pas au
--     service_role ; leur SELECT reste entier, timestamps exacts compris.
--
--  C. RPC `security definer` — INTOUCHÉES (elles s'exécutent avec les droits du
--     propriétaire, pas de l'appelant) : `claim_hexes` (0005→0070),
--     `crew_overview` (0044/0046/0071), `crew_mission_inputs` (0049),
--     `daily_zone_inputs` (0052/0053), `crew_ping_zone` (0051),
--     `activate_arsenal_item` (0022/0024/0025), `purge_due_accounts` (0046).
--     C'est par elles que passent le crew et la zone du jour : fermer la table
--     ne leur retire rien.
--
--  D. VUES ET MATVIEWS — INTOUCHÉES : `sector_activity` (0040),
--     `sector_holdings` (0061), `crew_leaderboard` et `sector_control`
--     (matviews, 0002/0046/0070). Aucune n'est `security_invoker` : elles
--     s'évaluent avec les droits de leur propriétaire (`postgres`, propriétaire
--     des tables, exempt de RLS), et une matview est de toute façon peuplée au
--     `refresh`. Elles continuent de servir des AGRÉGATS — jamais une ligne
--     nominative horodatée.
--
-- Autrement dit : la fermeture ne coûte une lecture qu'à UN fichier client, et
-- ce fichier est rebranché dans le même lot. Rien d'autre ne bouge.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA POLICY : SES PROPRES CELLULES, ET RIEN D'AUTRE
-- ════════════════════════════════════════════════════════════════════════════
-- `drop policy if exists` plutôt que `alter policy` : 0003 est appliquée depuis
-- longtemps, mais un environnement neuf rejouerait tout — l'idempotence est la
-- règle du dépôt (les migrations ne sont jamais réécrites, elles s'empilent).
drop policy if exists hex_claims_select_all on public.hex_claims;

-- `(select auth.uid())` plutôt que `auth.uid()` : initplan évalué UNE fois par
-- requête et non une fois par ligne (même raison qu'en 0003:11 et 0074:270).
-- La table est lue en entier par la carte : sur 200 k cellules, la différence
-- n'est pas cosmétique.
create policy hex_claims_select_own on public.hex_claims
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

comment on policy hex_claims_select_own on public.hex_claims is
  'AUDIT R3 — un joueur ne lit QUE ses propres cellules, avec leurs horodatages exacts (c''est sa donnée). Les cellules d''autrui ne sortent plus que par la vue public_hex_claims : sans run_id, sans horodatage à la minute, et jamais avant la publication du territoire correspondant (§1.5). Remplace hex_claims_select_all (0003:114), qui rendait la table entière à tout compte connecté — donc les horaires de sortie de n''importe qui.';

-- Le `revoke insert, update, delete` de 0003:112 tient toujours (une policy ne
-- donne jamais un privilège) ; on le RÉPÈTE pour que cette migration soit
-- lisible seule et pour qu'un test puisse le constater ici. `anon` perd en plus
-- le SELECT : il n'avait aucune policy donc ne lisait déjà rien, mais un
-- privilège inutile est une porte qu'une policy future pourrait rouvrir par
-- accident. Deux verrous valent mieux qu'un.
revoke insert, update, delete on public.hex_claims from anon, authenticated;
revoke select on public.hex_claims from anon;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LA SURFACE PUBLIQUE : `public_hex_claims`
-- ════════════════════════════════════════════════════════════════════════════
-- Ce que la carte a LÉGITIMEMENT besoin de savoir d'un rival : qu'une cellule
-- est tenue, et par qui (rôle §C : moi / mon crew / rival). Ce qu'elle n'a
-- jamais eu besoin de savoir : à quelle minute, au cours de quelle sortie.
--
-- ─── CE QUI N'EN SORT PAS, ET POURQUOI ──────────────────────────────────────
--  · `run_id` — la clé qui regroupe les cellules d'une même course. C'est LUI
--    qui transforme un nuage de cellules en TRAJET. §12.3 l'interdit.
--  · `claimed_at` / `decay_at` exacts — remplacés par leur troncature à l'heure
--    (voir plus bas). `decay_at` est tronqué AUSSI : il vaut `claimed_at +
--    DECAY_DAYS`, donc le publier exact republierait l'heure de capture à la
--    microseconde. Un seul des deux oublié, et toute la migration est du décor.
--  · `locked_until`, `shielded_until` — deux horloges dérivées de la capture
--    (HEX_LOCK_HOURS, SHIELD_DURATION_HOURS) : mêmes fuites par soustraction.
--    Le lock et le bouclier sont arbitrés SERVEUR (claim_hexes) ; aucun écran
--    ne les lit, et les rendre publics ne servirait qu'à re-dériver l'heure.
--  · `city_id`, `sector_id`, `crew_color_cache` — inutiles au rendu (les
--    couleurs vont par RÔLE, jamais par identité de crew : GRYD_REGLES §C).
--    Une colonne qu'aucun écran ne lit n'a rien à faire dans une surface
--    publique.
--
-- ─── LES CELLULES DU LECTEUR EN SONT ABSENTES, ET C'EST VOULU ───────────────
-- La vue ne rend QUE les cellules d'AUTRUI. Le joueur lit les siennes
-- directement dans `hex_claims` (policy §1), à leur précision réelle. Deux
-- raisons, et la seconde est la plus importante :
--   1. AUCUN DOUBLON À DÉDUPLIQUER côté client : les deux sources sont
--      disjointes par construction, la fusion est une concaténation.
--   2. LE DÉLAI DE PUBLICATION NE DOIT PAS S'APPLIQUER À SOI-MÊME. §1.5 protège
--      le joueur des RIVAUX ; lui cacher sa propre capture pendant une heure
--      serait une panne, pas une protection (c'est exactement l'arbitrage de
--      `territories_select_published`, 0074:271, clause « or owner_id = uid »).
--      En sortant le lecteur de la vue, le `where` de publication ne peut PAS
--      l'atteindre, quelle que soit son évolution future.
--
-- ─── `security_invoker` : LE CHOIX INVERSE DE 0077, DÉLIBÉRÉ ────────────────
-- 0077 a posé `security_invoker = true` sur `public_territories` : une vue
-- servie aux clients ne doit jamais valoir plus que son lecteur. ICI C'EST
-- L'INVERSE, et il faut le dire net : cette vue s'évalue avec les droits de son
-- PROPRIÉTAIRE, donc au-dessus de `hex_claims_select_own`. C'est le MÉCANISME,
-- pas un oubli — une table fermée plus une ouverture étroite et documentée.
--   · En `security_invoker = true`, la vue ne rendrait que les lignes que le
--     lecteur voit déjà (les siennes), donc RIEN (elle les exclut) : une vue
--     vide, et une carte sans rivaux.
--   · Le prix : chaque colonne ajoutée ici demain fuit sans qu'aucune RLS ne
--     l'arrête. La liste de colonnes ci-dessous EST la frontière de sécurité —
--     elle ne s'élargit pas sans repasser par ce raisonnement.
-- `security_barrier = true` : sans lui, Postgres peut remonter une fonction
-- fournie par l'appelant AVANT le `where` de la vue, et cette fonction verrait
-- les lignes non publiées. La barrière est faite pour les vues dont le `where`
-- EST la protection.
create view public.public_hex_claims
  with (security_barrier = true)
as
select
  hc.h3index,
  hc.activity,

  -- QUI tient la cellule. C'est la donnée de jeu : sans elle, aucun rôle (moi /
  -- mon crew / rival) ne peut être peint, et la carte redevient un aplat. C'est
  -- déjà ce que `public_territories` publie (`owner_id`), au même titre.
  hc.owner_user_id,

  -- 'neutral' | 'stolen' | 'defended' | 'pioneer'. Dit COMMENT la cellule a été
  -- prise, jamais QUAND : aucune horloge ne s'en déduit.
  hc.claim_type,

  -- game-rules: PUBLIC_TIMESTAMP_TRUNC (§12.1 « supprimer les timestamps
  -- détaillés »). Même granularité et même constante que `public_territories`.
  -- Les noms de colonnes portent le suffixe `_hour` : appeler ça `claimed_at`
  -- laisserait croire à un instant exact, et un nom qui laisse croire est déjà
  -- un mensonge (même règle que `geometry_generalized` en 0077).
  -- NULL reste NULL : `decay_at` est nul pour un compte protégé (< 14 j), et lui
  -- inventer une échéance serait fabriquer de la donnée.
  date_trunc('hour', hc.claimed_at) as claimed_at_hour,
  date_trunc('hour', hc.decay_at)   as decay_at_hour

from public.hex_claims hc

-- §1.5 — LA PUBLICATION DIFFÉRÉE, SANS RÉÉCRIRE LE DÉLAI. L'instant de
-- publication n'est PAS recalculé ici : il a été DÉCIDÉ par l'écrivain depuis
-- `TERRITORY_PUBLISH_DELAY_MINUTES` et STOCKÉ dans `territories.publish_after`
-- (0074). On le lit, on ne l'invente pas — écrire `interval '60 minutes'` ici
-- en ferait une seconde source de vérité, et un jour les deux divergeraient
-- (c'est le raisonnement de 0077, appliqué à la lettre).
-- Le rattachement se fait par la course : `territories.source_run_id` est
-- UNIQUE (0075), donc cette jointure ne peut pas dupliquer une cellule.
left join public.territories tr
  on tr.source_run_id = hc.run_id
 and tr.activity      = hc.activity

where
  -- Le lecteur ne se voit pas ici : il lit ses cellules dans la table.
  -- `is distinct from` et non `<>` : avec `auth.uid()` NULL (service_role), `<>`
  -- rendrait NULL donc filtrerait TOUT, et la vue paraîtrait vide à tort.
  hc.owner_user_id is distinct from (select auth.uid())

  -- Cellule dont la course a produit un territoire : elle attend la publication
  -- de CE territoire. Cellule sans territoire connu (capture antérieure au lot
  -- polygonal, backfill non passé, course purgée → run_id NULL) : `coalesce`
  -- retombe sur l'instant de capture, donc visible — c'est le comportement
  -- D'AVANT cette migration, inchangé. On ne fait pas disparaître du territoire
  -- réel pour faire respecter un délai qui n'a jamais existé pour ces lignes ;
  -- on le dit en §4 plutôt que de le laisser découvrir.
  and coalesce(tr.publish_after, hc.claimed_at) <= now();

comment on view public.public_hex_claims is
  'AUDIT R3 — surface PUBLIQUE des cellules D''AUTRUI (§12.1/§12.3/§1.5). Ne contient QUE ce qu''un rival a le droit de savoir : quelle cellule, tenue par qui, prise comment, et depuis quand À L''HEURE PRÈS (game-rules PUBLIC_TIMESTAMP_TRUNC). Jamais run_id (il regrouperait les cellules en TRAJET), jamais un horodatage à la minute, jamais locked_until/shielded_until. Les cellules du lecteur en sont ABSENTES : il les lit dans public.hex_claims, à leur précision réelle (policy hex_claims_select_own). Vue NON security_invoker À DESSEIN : c''est l''ouverture étroite au-dessus d''une table fermée — sa liste de colonnes est la frontière de sécurité.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PRIVILÈGES
-- ════════════════════════════════════════════════════════════════════════════
-- `revoke ... from public` n'est pas décoratif : Supabase pose des DEFAULT
-- PRIVILEGES sur le schéma `public`, et sans ce revoke la vue serait lisible par
-- `anon` — donc par un visiteur non connecté, ce qui rendrait la fermeture
-- ci-dessus absurde. On repart de zéro, puis on n'accorde que `select`, et qu'à
-- `authenticated`. (Même patron qu'en 0077 §2.)
revoke all on public.public_hex_claims from public, anon, authenticated;
grant select on public.public_hex_claims to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. CE QUI RESTE EN SUSPENS — À LIRE AVANT D'AFFIRMER QUE R3 EST CLOS
-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA CELLULE RESTE UNE INFORMATION SPATIALE FINE. Une cellule H3 res 10 fait
--    ~15 000 m² ; l'ensemble de celles d'un joueur dessine encore, grossièrement,
--    OÙ il court. Cette migration retire le QUAND (horodatage) et le REGROUPEMENT
--    PAR SORTIE (`run_id`) — c'est-à-dire l'habitude — pas la carte de présence.
--    La vraie fin de §12.3 est la bascule complète au POLYGONE GÉNÉRALISÉ
--    (`public_territories`, 0077) : le jour où plus aucune cellule d'autrui n'est
--    peinte, cette vue peut disparaître. Elle est une ÉTAPE, pas la destination.
-- 2. LE DÉLAI NE COUVRE QUE LES CELLULES ADOSSÉES À UN TERRITOIRE. Tant que le
--    backfill de `territories` n'est pas complet, `coalesce(...)` publie
--    immédiatement les cellules sans territoire connu. Ce n'est pas une
--    régression (c'était l'état d'avant pour TOUTES les cellules), mais ce n'est
--    pas encore la garantie §1.5 pour toutes. Elle le deviendra à mesure que le
--    backfill avance — sans nouvelle migration.
-- 3. `apps/mobile/src/features/map/hexClaims.ts` DOIT être déployé avec cette
--    migration. Appliquée seule, elle fait disparaître les rivaux de la carte
--    (le client lirait encore la table et n'y verrait que ses cellules) ; le
--    client seul, sans elle, échoue sur une vue inexistante et la carte passe en
--    `failed` — un état honnête, mais un écran mort. Les deux vont ensemble.
-- 4. LES AUTRES TABLES HORODATÉES NE SONT PAS TRAITÉES ICI. `shields`
--    (`shields_select_all`, 0003:120, `activated_at` exact) porte la même
--    faiblesse en plus petit : un bouclier est posé au moment d'une sortie. Hors
--    périmètre de ce lot, à ouvrir séparément — le dire vaut mieux que laisser
--    croire que « les horodatages » sont réglés.
-- 5. PGlite NE PROUVE PAS L'EFFET DE LA RLS. Il tourne en SUPERUTILISATEUR : les
--    policies ne s'y appliquent pas et `auth.uid()` y est un bouchon. Le test
--    associé prouve ce qui est indépendant du rôle — que la policy EXISTE avec
--    la bonne expression, que la vue N'EXPOSE PAS les colonnes interdites, que
--    son `where` filtre, que les troncatures agissent, et que les privilèges
--    sont ceux annoncés. Qu'un rival soit RÉELLEMENT aveugle ne pourra être
--    constaté que sur un vrai Supabase.
