-- 0074_territories_polygon.sql
-- GRYD — LE TERRITOIRE DEVIENT UN POLYGONE (spec produit §1.4, §19.2).
-- LOT 1, ÉTAPE 1 sur 4 : ON POSE LA TABLE. PERSONNE N'ÉCRIT ENCORE DEDANS.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS ═════════════════
-- FAIT   : crée `public.territories` — la forme RÉELLE d'un territoire, une
--          géométrie GeoJSON, avec ses états, sa fortification, sa date de
--          publication différée, et une RLS qui ne révèle rien avant elle.
-- NE FAIT PAS : aucune écriture, aucun backfill, aucune lecture branchée.
--          `hex_claims` est INTACTE — pas une colonne touchée, pas une ligne
--          lue. Tant que l'étape 3 (double écriture) n'a pas eu lieu, cette
--          table est VIDE, et une table vide ne ment à personne : les lecteurs
--          continuent de voir la propriété hexagonale, telle qu'elle est.
--          Rollback de cette migration = `drop table public.territories`, et il
--          ne détruit rien d'acquis, par construction.
--
-- ═══ POURQUOI DU GeoJSON `jsonb` ET PAS PostGIS ═════════════════════════════
-- (ARBITRAGES_SPEC_2026.md A1 + A1-bis, tranché le 27/07/2026 — ne pas rouvrir)
--   1. PostGIS est bien installé (0001) mais n'a AUCUNE colonne `geometry`/
--      `geography` dans les 73 migrations précédentes. TOUTE la géo persistée du
--      dépôt est déjà du GeoJSON `jsonb` — `city_zones.geojson` (0002:13),
--      `no_capture_zones.geojson` (0002:235), `sectors.geojson` (0002:87) —
--      évaluée en TypeScript. Introduire un type PostGIS serait un AJOUT de
--      paradigme, pas une reprise de l'existant.
--   2. Et surtout : ON NE POURRAIT PAS L'EXÉCUTER. Docker est indisponible ici
--      (donc pas de `npx supabase start`) et PGlite — le seul harnais SQL du
--      dépôt — ne supporte pas PostGIS. Une migration PostGIS serait du SQL
--      JAMAIS EXÉCUTÉ, exactement la faute que le dépôt s'interdit : « une
--      migration jamais exécutée est une intention, pas un mécanisme »
--      (supabase/tests/fr_communes.pglite.test.mjs).
-- L'exigence de la spec est « polygones issus des traces réelles » (§1.4), PAS
-- « PostGIS ». Le contrat est tenu, et il est vérifiable ici.
--
-- ═══ LA BASE STOCKE, ELLE NE CALCULE PAS ════════════════════════════════════
-- Aucune opération géométrique n'est faite en SQL — ni aire, ni intersection,
-- ni union, ni simplification. Tout cela vit dans le MOTEUR PUR
-- (`packages/engine`), testé en Deno, et le résultat arrive ici déjà calculé.
-- Les CHECK ci-dessous ne vérifient donc QUE des formes (« est-ce bien un objet
-- GeoJSON de type Polygon ? ») et des cohérences d'état — jamais une géométrie.
-- Conséquence assumée : la base ne peut PAS garantir qu'un anneau est fermé, ni
-- que `area_m2` correspond à `geometry`. C'est au moteur, et c'est dit en fin de
-- fichier plutôt que laissé croire.
--
-- ═══ AUCUN NOMBRE MAGIQUE ═══════════════════════════════════════════════════
-- Le délai de publication de 60 min (§1.5) n'apparaît NULLE PART ici : la
-- colonne stocke un INSTANT déjà décidé par l'appelant à partir de
-- `packages/shared/src/game-rules.ts`. Une valeur par défaut du type
-- `now() + interval '60 minutes'` aurait enterré une constante de jeu dans le
-- schéma — interdit (CLAUDE.md). `publish_after` est donc `not null` SANS
-- défaut : l'écrivain DOIT décider, il ne peut pas oublier.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA TABLE
-- ════════════════════════════════════════════════════════════════════════════
create table public.territories (
  id uuid primary key default gen_random_uuid(),

  -- DISCIPLINE. Mêmes valeurs EXACTES que `hex_claims.activity` / `runs.activity`
  -- (0070) : 'run' | 'bike' en minuscules. La spec §19.2 écrit `mode: 'RUN'|'BIKE'` ;
  -- s'aligner sur la casse de la spec aurait créé DEUX vocabulaires pour la même
  -- chose dans la même base, et donc un jour une jointure qui ne matche pas.
  -- Le nom de colonne est `activity` pour la même raison.
  activity text not null default 'run' -- game-rules: DEFAULT_ACTIVITY
    constraint territories_activity_check check (activity in ('run', 'bike')), -- game-rules: ACTIVITIES

  -- PROPRIÉTAIRE POLYMORPHE (§19.2 `ownerType`/`ownerId`) : un territoire
  -- appartient à un JOUEUR ou à un CREW. Deux tables cibles ⇒ aucune clé
  -- étrangère possible (Postgres ne fait pas de FK conditionnelle). Le trou
  -- d'intégrité qui en résulte est RÉEL et il est inscrit en suspens en fin de
  -- fichier ; il n'est pas maquillé par une contrainte qui ne contraindrait rien.
  --
  -- NULLABLES, et c'est un choix d'honnêteté : l'état `unowned` de §5.3 décrit un
  -- polygone CONNU que personne ne tient. Lui inventer un propriétaire pour
  -- satisfaire un `not null` serait fabriquer de la donnée. La cohérence des deux
  -- cas est imposée plus bas par `territories_owner_coherent`.
  owner_type text
    constraint territories_owner_type_check check (owner_type in ('user', 'crew')),
  owner_id uuid,

  -- LA GÉOMÉTRIE AUTORITAIRE — GeoJSON `Polygon` : { "type": "Polygon",
  -- "coordinates": [ anneau_extérieur, trous… ] }, coordonnées [lng, lat] en
  -- WGS84, comme le reste de la géo du dépôt.
  -- Le CHECK ne valide QUE la forme de l'enveloppe : c'est ce qu'une base peut
  -- honnêtement vérifier sans calculer. Il n'appelle aucune fonction capable de
  -- lever sur une entrée exotique (`jsonb_array_length` en aurait été une) : un
  -- scalaire JSON échoue proprement le CHECK au lieu de faire tomber l'insert
  -- avec une erreur incompréhensible.
  --
  -- ⚠️ LES `coalesce` NE SONT PAS COSMÉTIQUES — c'est le piège classique du
  -- CHECK en SQL, et le test de cette migration l'a attrapé en vrai : un CHECK
  -- qui vaut NULL est CONSIDÉRÉ COMME SATISFAIT. Sans eux, `{"type":"Polygon"}`
  -- (sans coordonnées) et `{"coordinates":[]}` (sans type) passaient, parce que
  -- `-> 'clef_absente'` rend NULL, donc `jsonb_typeof(NULL)` rend NULL, donc la
  -- conjonction entière rend NULL. Une clé MANQUANTE devenait ainsi plus
  -- permissive qu'une clé FAUSSE.
  geometry jsonb not null
    constraint territories_geometry_is_polygon check (
      jsonb_typeof(geometry) = 'object'
      and coalesce(geometry ->> 'type', '') = 'Polygon'
      and coalesce(jsonb_typeof(geometry -> 'coordinates'), '') = 'array'
    ),

  -- RENDU PUBLIC (§12.3) : « un territoire public est une géométrie DÉRIVÉE. Il
  -- ne doit pas permettre de reconstruire le trajet privé exact. » C'est la
  -- version simplifiée, la SEULE qui a vocation à sortir de la base vers un
  -- client. NULLABLE : tant qu'elle n'est pas calculée, elle est ABSENTE — on ne
  -- recopie surtout pas `geometry` dedans en attendant, ce serait servir la
  -- géométrie fine sous un nom qui promet le contraire.
  geometry_generalized jsonb
    constraint territories_generalized_is_polygon check (
      geometry_generalized is null
      or (
        jsonb_typeof(geometry_generalized) = 'object'
        and coalesce(geometry_generalized ->> 'type', '') = 'Polygon'
        and coalesce(jsonb_typeof(geometry_generalized -> 'coordinates'), '') = 'array'
      )
    ),

  -- AIRE GÉODÉSIQUE en m², calculée par le moteur (jamais en SQL). `not null` :
  -- le moteur la produit déjà avec le polygone (`DetectedLoop.areaM2`), et un
  -- territoire dont on ignorerait la surface ne serait classable ni comparable.
  area_m2 double precision not null
    constraint territories_area_positive check (area_m2 > 0),

  -- Ville de rattachement. NULLABLE comme `hex_claims.city_id` (AMENDEMENT-02
  -- §2 puis AMENDEMENT-35) : l'Europe entière est capturable, un territoire de
  -- campagne n'appartient à aucune `city_zone` et ce n'est pas une anomalie.
  city_id text references public.city_zones (city_id) on delete set null,

  -- LES 9 ÉTATS DE §5.3, dans l'ordre de la spec. Minuscules, comme tous les
  -- énumérés du dépôt (`hex_claims.claim_type`, `runs.status`, `seasons.status`).
  state text not null
    constraint territories_state_check check (state in (
      'unowned',
      'owned_personal',
      'owned_crew',
      'contested',
      'defended',
      'transfer_pending',
      'protected_by_privacy',
      'expired',
      'invalidated'
    )),

  -- FORTIFICATION §9.2 : niveaux DISCRETS 0-3. Les durées associées
  -- (18/24/30/36 h) ne sont PAS ici — ce sont des constantes de jeu, elles
  -- vivent dans game-rules.ts. La base ne connaît que le niveau.
  -- « Il n'est jamais achetable » (§9.2) : rien dans ce schéma ne permet de
  -- l'écrire depuis un client (aucune policy d'écriture, privilèges révoqués).
  defense_level smallint not null default 0
    constraint territories_defense_level_check check (defense_level between 0 and 3),

  -- Depuis QUAND le propriétaire actuel tient ce territoire. NULL pour un
  -- polygone `unowned` : personne ne le contrôle, il n'y a pas de « depuis ».
  controlled_since timestamptz,

  -- ── LA COLONNE QUI MANQUAIT (§1.5) ────────────────────────────────────────
  -- « La publication d'un nouveau territoire est différée de 60 minutes par
  -- défaut. » Aujourd'hui rien dans la base ne porte cette promesse :
  -- `hex_claims_select_all` (0003:114) sert TOUTE ligne à TOUT client
  -- authentifié, dès l'instant de l'écriture — un rival peut donc voir où
  -- quelqu'un vient de courir, en direct. C'est le point de vie privée le plus
  -- sérieux du backend (AUDIT R3), et c'est cette colonne + la policy du §3 qui
  -- le referment pour les territoires polygonaux.
  -- `not null` SANS DÉFAUT : voir l'en-tête — l'instant est décidé par
  -- l'appelant depuis game-rules, jamais par le schéma.
  publish_after timestamptz not null,

  -- Version de l'algorithme qui a produit CE polygone (§19.2). Un territoire
  -- dérivé par une version donnée doit rester interprétable après qu'elle a
  -- changé : sans cette colonne, un recalcul futur ne saurait pas distinguer ce
  -- qu'il a produit de ce qu'il a hérité.
  algorithm_version text not null
    constraint territories_algorithm_version_check check (algorithm_version <> ''),

  -- La sortie qui a créé ce territoire. `on delete set null` : si la course est
  -- purgée (rétention §7), le TERRITOIRE SURVIT — il a été gagné, il ne
  -- disparaît pas avec sa trace. L'inverse (`cascade`) réécrirait l'histoire.
  source_run_id uuid references public.runs (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ── COHÉRENCE PROPRIÉTAIRE / ÉTAT ─────────────────────────────────────────
  -- (a) `unowned` ⇒ aucun propriétaire, et réciproquement. Un territoire sans
  --     état de propriété qui porterait un `owner_id` serait une donnée qui se
  --     contredit elle-même ; l'app ne ment jamais, la base non plus.
  --     Les états `expired` / `invalidated` CONSERVENT leur propriétaire : c'est
  --     l'historique (« historique préservé », §9.4), pas une propriété active.
  constraint territories_owner_coherent check (
    (state = 'unowned' and owner_type is null and owner_id is null)
    or (state <> 'unowned' and owner_type is not null and owner_id is not null)
  ),
  -- (b) Les deux états qui NOMMENT le type de propriétaire doivent s'accorder
  --     avec lui. `owned_personal` est par définition un joueur, `owned_crew`
  --     un crew. Les autres états (contested, defended, transfer_pending…)
  --     n'imposent rien : ils valent pour les deux.
  constraint territories_state_owner_type check (
    (state <> 'owned_personal' or owner_type = 'user')
    and (state <> 'owned_crew' or owner_type = 'crew')
  )
);

comment on table public.territories is
  'Territoire POLYGONAL (spec §1.4 : « aucun hexagone »). Géométrie GeoJSON en jsonb — jamais PostGIS (ARBITRAGES A1-bis : ni Docker ni PGlite ne peuvent exécuter du PostGIS ici, et toute la géo du dépôt est déjà du jsonb). LOT 1 ÉTAPE 1 : la table existe, PERSONNE n''écrit dedans, hex_claims reste la propriété effective.';
comment on column public.territories.geometry is
  'GeoJSON Polygon AUTORITAIRE, coordonnées [lng, lat] WGS84, produit par le moteur pur à partir de la trace réelle. La base ne le calcule ni ne le valide géométriquement : elle vérifie la forme de l''enveloppe, rien de plus.';
comment on column public.territories.geometry_generalized is
  'Géométrie DÉRIVÉE servie au public (§12.3) : elle ne doit pas permettre de reconstruire le trajet exact. NULL = pas encore calculée, jamais une copie de `geometry`.';
comment on column public.territories.publish_after is
  'Instant à partir duquel le territoire devient public (§1.5, publication différée). Décidé par l''appelant depuis game-rules — aucun délai n''est écrit dans ce schéma. Avant lui, seul le propriétaire voit la ligne (policy territories_select_published).';
comment on column public.territories.defense_level is
  'Fortification §9.2, niveaux discrets 0-3. Les durées (18/24/30/36 h) sont des constantes de jeu, pas des données. Jamais achetable : aucune écriture client n''existe sur cette table.';
comment on column public.territories.owner_id is
  'Joueur (users.id) ou crew (crews.id) selon owner_type. AUCUNE clé étrangère : Postgres ne sait pas cibler deux tables. L''intégrité est donc à la charge de l''écrivain — inscrit en suspens en fin de fichier.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. INDEX
-- ════════════════════════════════════════════════════════════════════════════
-- « Mes territoires » / « les territoires de mon crew » : la lecture de profil
-- et de crew. Partiel sur `owner_id is not null` — les lignes `unowned` n'ont
-- pas de propriétaire à chercher et n'ont rien à faire dans cet index.
create index territories_owner_idx
  on public.territories (owner_type, owner_id)
  where owner_id is not null;

-- Lecture de carte par ville, DANS UN MONDE (E14 : Run et Bike ne se mélangent
-- jamais). `activity` en tête : c'est le filtre systématique, il n'est jamais
-- omis. Partiel comme `hex_claims_city_idx` (0070:127) — et avec le même défaut
-- assumé : les territoires RURAUX (city_id null) n'y sont pas. Leur lecture
-- passera par une clé géographique, pas par la ville, quand elle existera.
create index territories_activity_city_idx
  on public.territories (activity, city_id)
  where city_id is not null;

-- L'ÉCHÉANCE DE PUBLICATION. Deux lecteurs : la policy du §3 (qui filtre
-- `publish_after <= now()` sur CHAQUE lecture) et le futur job qui bascule les
-- territoires en public. Index NON partiel : un `where publish_after > now()`
-- serait refusé (`now()` n'est pas immutable) et, surtout, faux dès la seconde
-- suivante.
create index territories_publish_after_idx
  on public.territories (publish_after);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RLS — CE QUI NE DOIT SURTOUT PAS FUIR
-- ════════════════════════════════════════════════════════════════════════════
-- Le patron de 0003 : RLS activée, ZÉRO policy d'écriture (seules les Edge
-- Functions en service_role écrivent, elles contournent la RLS par nature), et
-- révocation en profondeur des privilèges que Supabase accorde par défaut aux
-- rôles clients — sans ce `revoke`, la RLS serait la SEULE ligne de défense.
alter table public.territories enable row level security;

revoke all on public.territories from anon, authenticated;
grant select on public.territories to authenticated;

-- LA POLICY DE LECTURE. Trois cas, et rien d'autre :
--   (a) le territoire est PUBLIÉ (`publish_after` passé) — visible de tous ;
--   (b) il est à MOI et je suis ce joueur — je vois ma propre conquête tout de
--       suite. Le délai de §1.5 protège le joueur des RIVAUX, il ne lui cache
--       pas ce qu'il vient de faire ;
--   (c) il est à MON CREW et j'en suis membre ACTIF — le crew EST le
--       propriétaire, pas un tiers.
-- Tout le reste — un rival, un curieux, un compte fraîchement créé — ne voit
-- RIEN avant `publish_after`. Pas une géométrie floutée, pas un contour, pas une
-- ligne : la RLS filtre la LIGNE ENTIÈRE, donc aucune colonne ne fuit, pas même
-- `city_id` ou `created_at` (dont l'horodatage dirait à la minute près quand
-- quelqu'un a couru là).
--
-- `(select auth.uid())` plutôt que `auth.uid()` : initplan évalué une fois par
-- requête au lieu d'une fois par ligne (même raison qu'en 0003:11).
create policy territories_select_published on public.territories
  for select to authenticated
  using (
    publish_after <= now()
    or (owner_type = 'user' and owner_id = (select auth.uid()))
    or (
      owner_type = 'crew'
      and exists (
        select 1
        from public.crew_members cm
        where cm.crew_id = territories.owner_id
          and cm.user_id = (select auth.uid())
          and cm.left_at is null
      )
    )
  );

comment on policy territories_select_published on public.territories is
  'Publication différée §1.5 : avant `publish_after`, un territoire n''est visible QUE de son propriétaire (joueur, ou membre actif du crew propriétaire). La ligne entière est filtrée — aucune colonne ne fuit, pas même l''horodatage. Remplace, pour les territoires polygonaux, le `hex_claims_select_all` de 0003 qui servait tout à tout le monde immédiatement (AUDIT R3).';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. `updated_at` NE MENT PAS
-- ════════════════════════════════════════════════════════════════════════════
-- Une colonne `updated_at` qui ne bouge pas est pire que pas de colonne : elle
-- AFFIRME une fraîcheur fausse. Le dépôt la tenait jusqu'ici à la main dans
-- chaque RPC (0054:186, 0054:214) ; ici l'invariant est mis DANS LA BASE, même
-- esprit que `hex_claims_guard_decay_trg` (0070:181) : il ne dépend d'aucune
-- discipline d'appelant, et aucun futur écrivain ne peut l'oublier.
create or replace function public.territories_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger territories_touch_updated_at_trg
  before update on public.territories
  for each row
  execute function public.territories_touch_updated_at();

comment on function public.territories_touch_updated_at() is
  'Tient `territories.updated_at` à jour quoi que fasse l''écrivain. Une date de mise à jour figée serait une affirmation fausse sur la fraîcheur de la donnée.';

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/territories.pglite.test.mjs` exécute le VRAI SQL de ce fichier
-- sur un Postgres réel (PGlite, WASM) : application de la migration, refus des
-- CHECK (état inconnu, `defense_level = 4`, `owner_type` inconnu, discipline
-- inconnue, GeoJSON qui n'est pas un Polygon, propriétaire incohérent, aire
-- nulle), aller-retour d'une géométrie à trou sans perte, existence des trois
-- index, RLS activée, texte de la policy, privilèges clients, trigger
-- `updated_at` et survie du territoire à la purge de sa course.
--
-- CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire : l'EFFET de la RLS.
-- PGlite tourne en SUPERUTILISATEUR — les policies ne s'y appliquent pas et
-- `auth.uid()` y est un bouchon qui rend NULL. Ce qui est vérifié, c'est que la
-- policy EXISTE, que son expression porte bien `publish_after`, et que les
-- privilèges d'écriture sont révoqués. Qu'un rival soit RÉELLEMENT aveugle avant
-- `publish_after` ne pourra être prouvé que sur un vrai Supabase.
--
-- POUR LE REJOUER, sans toucher aux dépendances du dépôt :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/territories.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- (un point refermé se RETIRE d'ici ; il ne se laisse pas traîner comme ouvert)
-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA TABLE EST VIDE, ET RIEN NE LA REMPLIT. C'est l'étape 1 sur 4. Les
--    étapes 2 (backfill depuis les cellules existantes), 3 (double écriture
--    dans `ingest_run`) et 4 (bascule des lectures) ne sont PAS faites. Tant
--    qu'elles ne le sont pas, LA PROPRIÉTÉ RESTE HEXAGONALE et les bords
--    hexagonaux restent visibles à l'écran. Cette migration ne change rien à ce
--    que voit un joueur — et prétendre l'inverse serait une doc qui promet
--    au-delà du code.
-- 2. `owner_id` N'A AUCUNE CLÉ ÉTRANGÈRE (propriétaire polymorphe : `users` ou
--    `crews` selon `owner_type`). Rien dans la base n'empêche donc un `owner_id`
--    qui ne désigne personne, ni la survie d'un territoire dont le crew a été
--    dissous. La parade sera un déclencheur de validation ou une purge à la
--    suppression — à poser avec le PREMIER écrivain (étape 3), pas avant : un
--    garde-fou sur une table que personne n'alimente ne garde rien.
-- 3. LA GÉOMÉTRIE N'EST PAS VALIDÉE GÉOMÉTRIQUEMENT. Le CHECK vérifie
--    « objet GeoJSON de type Polygon avec un tableau de coordonnées » et RIEN de
--    plus : ni anneau fermé, ni absence d'auto-intersection, ni cohérence entre
--    `area_m2` et `geometry`, ni surface minimale (`MIN_POLYGON_AREA`). Tout
--    cela appartient au moteur pur et à ses tests Deno — la base ne calcule pas.
-- 4. `hex_claims` N'EST PAS DÉPRÉCIÉE, et `hex_claims_select_all` (0003:114)
--    sert toujours toute ligne à tout client authentifié, sans délai. La
--    publication différée n'est donc effective QUE pour les territoires
--    polygonaux — c'est-à-dire, aujourd'hui, pour personne. La fermeture réelle
--    de R3 est à l'étape 4, quand les lectures basculeront.
-- 5. AUCUNE CONTRAINTE D'UNICITÉ ni de non-recouvrement entre territoires : deux
--    polygones peuvent se superposer dans le même monde. C'est volontaire à ce
--    stade — l'arbitrage du recouvrement appartient au modèle de contestation
--    (§9, lot 3), pas au schéma.
-- 6. `state`, `defense_level` et `controlled_since` N'ONT AUCUNE MACHINE À ÉTATS
--    en base : rien n'interdit de passer de `expired` à `defended` sans
--    contestation. Les transitions §5.3/§9 vivront dans le moteur et dans la RPC
--    d'écriture ; les CHECK d'ici ne garantissent que la COHÉRENCE d'une ligne
--    prise seule, jamais la légitimité d'un changement.
