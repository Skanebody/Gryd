-- 0082_leaderboard_surface.sql
-- GRYD — LE CLASSEMENT SE MESURE EN SURFACE (spec produit §10.1 → §10.3).
-- LOT 8, ÉTAPE 1 : LE SOCLE SERVEUR. AUCUN ÉCRAN N'EST BRANCHÉ.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS ═════════════════
-- FAIT   : (1) `territory_state_is_controlled()` — la définition UNIQUE de
--          « surface contrôlée validée » (§10.1), pour que la vue et la
--          fonction de mesure ne puissent pas diverger ;
--          (2) `territory_surface_by_owner` — LA SURFACE, dérivée de
--          `territories.area_m2` (géométrie serveur), JAMAIS de `hex_claims` ;
--          (3) `leaderboard_source_metrics()` — les QUATRE mesures de §10.2
--          pour une discipline et une période ;
--          (4) `leaderboard_snapshots` + `leaderboard_entries` — les SNAPSHOTS
--          de §10.3 (hebdo/saison × local/quartier/ville/amis × joueurs/crews),
--          parce que « les classements ne sont pas recalculés entièrement dans
--          le client ».
-- NE FAIT PAS : aucune écriture, aucun cron de prise de snapshot, aucune
--          bascule d'écran. `apps/mobile/app/(tabs)/classement.tsx` lit
--          TOUJOURS les points via `player_leaderboard` (0046) — À L'ÉCRAN, LE
--          CLASSEMENT RESTE EN POINTS. Ces deux tables sont VIDES, et une table
--          vide ne ment à personne. Le dire ici plutôt que laisser croire que
--          poser le socle a changé ce que voit un joueur.
-- Rollback = drop des deux tables, de la vue et des deux fonctions : rien
-- d'acquis n'est détruit, par construction.
--
-- ═══ LES DEUX AXES COEXISTENT — RIEN N'EST RETIRÉ ═══════════════════════════
-- (arbitrage AUDIT_GRYD.md §3.3, tranché — ne pas le rouvrir ici)
--   · SURFACE (ce fichier) = LE CLASSEMENT. m² dérivés de la géométrie serveur.
--   · POINTS / XP (`season_scores`, 0002 + 0070) = LA PROGRESSION et les
--     récompenses. §10.5 : l'XP « ne modifie jamais la puissance territoriale ».
-- `season_scores` n'est PAS touchée par cette migration : pas une colonne, pas
-- une policy, pas un index. `claim_hexes` continue de l'incrémenter exactement
-- comme avant. Cette migration AJOUTE un axe, elle n'en remplace aucun.
--
-- ═══ POURQUOI LA SURFACE VIENT DE `territories`, JAMAIS DE `hex_claims` ═════
-- §1.4 : « aucun hexagone ». Compter des cellules H3 et les multiplier par une
-- aire nominale rendrait une surface FABRIQUÉE — vraie pour une grille, fausse
-- pour le terrain, et impossible à réconcilier avec le polygone affiché au
-- joueur. `territories.area_m2` est l'aire géodésique du polygone réellement
-- bouclé, produite par le moteur pur (`polygon.ts`) : c'est la seule mesure que
-- l'app puisse montrer sans mentir. `hex_claims` reste la propriété
-- OPÉRATIONNELLE pendant la transition (0079) ; elle n'entre pas dans le
-- classement de surface.
--
-- ═══ LA BASE MESURE, LE MOTEUR CLASSE ═══════════════════════════════════════
-- AUCUN `order by` de ce fichier n'attribue un rang, et c'est délibéré. Les
-- quatre départages de §10.2 (surface → défenses → conquête → ancienneté), le
-- rang de compétition et le traitement de l'égalité parfaite vivent DANS LE
-- MOTEUR PUR — `packages/engine/src/leaderboard.ts`, testé en Deno. Réécrire
-- cet ordre en SQL créerait une SECONDE source de vérité qui dériverait au
-- premier changement de règle. La base fournit les MESURES ; `rank` arrive ici
-- déjà décidé, et la colonne dit d'où il vient.
--
-- ═══ AUCUN NOMBRE MAGIQUE ═══════════════════════════════════════════════════
-- Aucun seuil de jeu n'apparaît dans ce fichier : ni durée de fenêtre, ni
-- cadence de snapshot, ni taille de classement. Les bornes de période
-- (`period_start`/`period_end`) et l'instant `taken_at` sont des valeurs DÉJÀ
-- décidées par l'appelant ; aucun `default now() + interval '7 days'` n'enterre
-- une cadence dans le schéma.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. « SURFACE CONTRÔLÉE VALIDÉE » — UNE SEULE DÉFINITION
-- ════════════════════════════════════════════════════════════════════════════
-- §10.1 dit « surface contrôlée VALIDÉE ». Il fallait donc trancher quels états
-- de §5.3 comptent, et surtout l'écrire UNE FOIS : la vue du §2 et la fonction
-- du §3 ont toutes deux besoin de ce filtre, et deux listes recopiées sont deux
-- listes qui divergeront.
--
-- COMPTENT (le propriétaire tient effectivement le terrain) :
--   · owned_personal / owned_crew  — la propriété nominale ;
--   · contested                    — contesté n'est PAS perdu (§9) : le
--     transfert n'a lieu qu'à l'échéance, faute de défense. Le retirer du
--     classement dès l'ouverture d'une contestation ferait chuter un joueur
--     pour une attaque qu'il n'a pas encore perdue ;
--   · defended                     — il vient précisément de le garder ;
--   · transfer_pending             — le transfert n'est pas consommé ;
--   · protected_by_privacy         — LE POINT DÉLICAT, tranché franchement : la
--     surface reste comptée. La retirer ferait PAYER un rang au joueur qui
--     protège son domicile, c'est-à-dire transformerait un réglage de vie
--     privée en handicap compétitif. Un total en m² ne dit ni où ni quand ;
--     c'est la GÉOMÉTRIE qui est protégée (RLS de 0074), pas l'existence d'une
--     surface.
-- NE COMPTENT PAS :
--   · unowned                      — personne ne le tient (et la contrainte
--     `territories_owner_coherent` lui interdit d'avoir un propriétaire) ;
--   · expired / invalidated        — de l'HISTORIQUE conservé (§9.4). Le
--     propriétaire y est gardé pour la mémoire, pas pour le classement ; les
--     compter ferait grossir un joueur en perdant du terrain.
create or replace function public.territory_state_is_controlled(p_state text)
returns boolean
language sql
immutable
as $$
  select p_state in (
    'owned_personal',
    'owned_crew',
    'contested',
    'defended',
    'transfer_pending',
    'protected_by_privacy'
  );
$$;

comment on function public.territory_state_is_controlled(text) is
  'DÉFINITION UNIQUE de « surface contrôlée validée » (§10.1) sur les 9 états de §5.3. `contested`/`transfer_pending` comptent (le transfert n''a lieu qu''à l''échéance, §9) ; `protected_by_privacy` compte aussi — retirer sa surface ferait payer un rang au joueur qui protège son domicile. `expired`/`invalidated` sont de l''historique (§9.4) et ne comptent pas. Écrite une seule fois pour que la vue et la fonction de mesure ne puissent pas diverger.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LA SURFACE — LA MÉTRIQUE PRINCIPALE (§10.1)
-- ════════════════════════════════════════════════════════════════════════════
-- La requête que le chantier demandait : la surface d'un sujet se calcule
-- depuis `territories` (propriétaire + discipline + état possédé), jamais
-- depuis `hex_claims`.
--
-- POLYMORPHE COMME `territories.owner_*` : un seul agrégat sert les joueurs ET
-- les crews (§10.3 liste « crews » au même rang que les classements de
-- joueurs). Dupliquer la vue par type de sujet aurait dupliqué la définition de
-- la surface.
--
-- DISCIPLINE DANS LE `group by`, JAMAIS SOMMÉE (§1.2 : « une surface Run ne
-- s'additionne pas à une surface Bike »). Il n'existe aucune ligne de cette vue
-- où les deux mondes se rencontrent : la structure l'interdit, ce n'est pas une
-- consigne d'appelant.
--
-- ⚠️ PAS DE FILTRE `publish_after` ICI, et c'est un choix nommé : cette vue est
-- un agrégat SERVEUR, jamais servi à un client (privilèges du §5). Le délai de
-- publication de §1.5 protège la GÉOMÉTRIE d'un territoire frais — il n'a pas
-- de sens sur un total en m² que personne ne lit en direct. Ce que le joueur
-- lira, ce sont les SNAPSHOTS du §4, pris à une cadence décidée ailleurs.
create view public.territory_surface_by_owner as
select
  t.owner_type,
  t.owner_id,
  t.activity,
  sum(t.area_m2) as controlled_area_m2,
  count(*)::integer as territory_count,
  -- Depuis quand le sujet tient son territoire le plus ANCIEN. Ce n'est PAS le
  -- critère 4 de §10.2 (qui porte sur le snapshot précédent) : c'est une donnée
  -- d'affichage honnête (« installé ici depuis… »), et elle est nommée pour
  -- qu'on ne la confonde pas avec un départage.
  min(t.controlled_since) as controlled_since_oldest
from public.territories t
where t.owner_id is not null
  and public.territory_state_is_controlled(t.state)
group by t.owner_type, t.owner_id, t.activity;

comment on view public.territory_surface_by_owner is
  'LA MÉTRIQUE §10.1 : surface contrôlée validée, en m², par (propriétaire, discipline). Dérivée de `territories.area_m2` — l''aire géodésique du polygone réel produite par le moteur — et JAMAIS de `hex_claims` (§1.4 : « aucun hexagone » ; compter des cellules rendrait une surface fabriquée). Run et Bike sont dans le `group by`, jamais sommés (§1.2). Agrégat SERVEUR : aucun rôle client n''a le droit de la lire.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LES QUATRE MESURES DE §10.2, POUR UNE DISCIPLINE ET UNE PÉRIODE
-- ════════════════════════════════════════════════════════════════════════════
-- Une FONCTION et non une vue : trois des quatre mesures sont bornées par une
-- PÉRIODE (§10.3 : hebdo, saison), et une vue ne prend pas de paramètre. La
-- solution alternative — une vue « depuis toujours » plus un filtre côté
-- appelant — aurait obligé chaque appelant à réécrire les bornes, donc à les
-- écrire différemment un jour.
--
-- LA BASE DE LA LISTE EST L'UNION DES TROIS SOURCES, pas la seule surface
-- tenue : un sujet qui a défendu ou conquis pendant la période mais ne tient
-- plus rien à l'instant du snapshot EXISTE dans ce classement, à 0 m². Le
-- retirer effacerait une semaine de jeu réelle ; le moteur le classe dernier,
-- ce qui est la vérité, et c'est testé côté Deno (« surface ZÉRO »).
--
-- ⚠️ CE QUE CETTE FONCTION APPROXIME, dit ici plutôt que laissé croire :
-- `successful_defenses` et `conquered_area_m2` sont rattachées au propriétaire
-- ACTUEL du territoire, faute d'historique de propriété en base (aucune table
-- n'enregistre « qui possédait quoi à telle date »). Conséquence exacte : si un
-- territoire défendu en début de période a été perdu ensuite, la défense est
-- comptée au NOUVEAU propriétaire. Le cas est rare (défendre puis perdre le
-- même territoire dans la même période) mais il est RÉEL, et il ne se refermera
-- que par une table d'historique — inscrite en suspens en fin de fichier.
create or replace function public.leaderboard_source_metrics(
  p_activity text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (
  owner_type text,
  owner_id uuid,
  controlled_area_m2 double precision,
  successful_defenses integer,
  conquered_area_m2 double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with held as (
    select s.owner_type, s.owner_id, s.controlled_area_m2
    from public.territory_surface_by_owner s
    where s.activity = p_activity
  ),
  -- §10.2 critère 3 — surface CONQUISE sur la période. `controlled_since` est
  -- l'instant où le propriétaire actuel a pris ce territoire (0074) : dans la
  -- fenêtre ⇒ conquis dans la fenêtre. Borne basse INCLUSE, borne haute EXCLUE,
  -- pour que deux périodes consécutives ne comptent jamais la même conquête
  -- deux fois.
  conquered as (
    select t.owner_type, t.owner_id, sum(t.area_m2) as area
    from public.territories t
    where t.activity = p_activity
      and t.owner_id is not null
      and public.territory_state_is_controlled(t.state)
      and t.controlled_since >= p_period_start
      and t.controlled_since < p_period_end
    group by t.owner_type, t.owner_id
  ),
  -- §10.2 critère 2 — défenses RÉUSSIES : les contestations closes en
  -- `defended` (§9.3). Une contestation `cancelled` ou `transferred` n'est pas
  -- une défense, et une contestation `active` n'a rien prouvé encore.
  defended as (
    select t.owner_type, t.owner_id, count(*)::integer as defenses
    from public.territory_contests c
    join public.territories t on t.id = c.territory_id
    where c.status = 'defended'
      and c.resolved_at >= p_period_start
      and c.resolved_at < p_period_end
      and t.activity = p_activity
      and t.owner_id is not null
    group by t.owner_type, t.owner_id
  ),
  subjects as (
    select owner_type, owner_id from held
    union
    select owner_type, owner_id from conquered
    union
    select owner_type, owner_id from defended
  )
  select
    s.owner_type,
    s.owner_id,
    coalesce(h.controlled_area_m2, 0)::double precision,
    coalesce(d.defenses, 0)::integer,
    coalesce(q.area, 0)::double precision
  from subjects s
  left join held h on h.owner_type = s.owner_type and h.owner_id = s.owner_id
  left join conquered q on q.owner_type = s.owner_type and q.owner_id = s.owner_id
  left join defended d on d.owner_type = s.owner_type and d.owner_id = s.owner_id;
$$;

comment on function public.leaderboard_source_metrics(text, timestamptz, timestamptz) is
  'Les MESURES de §10.2 (surface tenue, défenses réussies, conquête de la période) pour UNE discipline et UNE période [début, fin[. N''attribue AUCUN rang : les départages et l''égalité vivent dans packages/engine/src/leaderboard.ts (moteur pur, testé en Deno). Le 4ᵉ critère (snapshot précédent) vient du snapshot antérieur, pas d''ici. Approximation assumée : défenses et conquêtes sont rattachées au propriétaire ACTUEL, faute d''historique de propriété — voir les suspens de la migration.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. LES SNAPSHOTS (§10.3)
-- ════════════════════════════════════════════════════════════════════════════
-- « Les classements ne sont pas recalculés entièrement dans le client. » Le
-- dépôt ne servait jusqu'ici que des VUES LIVE (`player_leaderboard` 0046,
-- `specialty_leaderboard` 0069) : chaque ouverture d'écran retriait toute la
-- table, et rien ne permettait de dire « ton rang de la semaine dernière »
-- — donc rien ne permettait non plus le 4ᵉ départage de §10.2, qui exige
-- l'horodatage du snapshot PRÉCÉDENT.
--
-- ═══ LES SEPT CLASSEMENTS DE §10.3, EN TROIS DIMENSIONS ════════════════════
-- La liste de §10.3 mélange trois natures ; les empiler dans un seul énuméré
-- aurait produit des combinaisons impossibles à distinguer (« hebdo » ET
-- « ville » sont-ils deux classements ou un seul ?). Elles sont donc séparées :
--   · `period`       hebdomadaire | saison            ← QUAND
--   · `scope`        local | quartier | ville | amis  ← OÙ / POUR QUI
--   · `subject_type` joueur | crew                    ← QUI est classé
-- « crews » de §10.3 = `subject_type = 'crew'`. Les sept items sont couverts,
-- et RIEN n'a été ajouté : il n'existe volontairement pas de scope « global »
-- ou « pays » — la spec n'en nomme pas, et inventer un classement est aussi
-- fabriqué qu'inventer une donnée.
create table public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),

  period text not null
    constraint leaderboard_snapshots_period_check check (period in ('weekly', 'season')),

  scope text not null
    constraint leaderboard_snapshots_scope_check check (
      scope in ('local', 'neighborhood', 'city', 'friends')
    ),

  -- LA CLÉ DU CONTEXTE, interprétée PAR `scope` : `city_zones.city_id` pour
  -- 'city', `sectors.id` pour 'neighborhood', l'index spatial de la maille pour
  -- 'local'. `text` et sans clé étrangère — trois tables cibles, Postgres ne
  -- fait pas de FK conditionnelle ; même trou d'intégrité qu'en 0074, nommé en
  -- suspens plutôt que maquillé.
  -- NULL pour 'friends' : un classement d'amis n'a pas de lieu, il a un public.
  scope_ref text,

  -- LE PUBLIC d'un classement d'amis (§10.3 « amis ») : un classement d'amis
  -- est RELATIF À QUELQU'UN — il n'existe pas « le » classement des amis. Cette
  -- colonne dit de qui, et la RLS du §5 s'en sert pour que personne d'autre ne
  -- le lise. `on delete cascade` : le classement d'amis d'un compte supprimé
  -- n'a plus de public, il disparaît avec lui.
  audience_user_id uuid references public.users (id) on delete cascade,

  -- DISCIPLINE (§1.2) : un snapshot appartient à UN monde. Deux lignes = deux
  -- tableaux, structurellement — comme `season_scores.activity` (0070).
  activity text not null default 'run' -- game-rules: DEFAULT_ACTIVITY
    constraint leaderboard_snapshots_activity_check check (activity in ('run', 'bike')), -- game-rules: ACTIVITIES

  subject_type text not null
    constraint leaderboard_snapshots_subject_type_check check (subject_type in ('user', 'crew')),

  -- LA FENÊTRE MESURÉE, [début, fin[. `not null` sans défaut : aucune cadence
  -- n'est enterrée dans le schéma (voir l'en-tête).
  period_start timestamptz not null,
  period_end timestamptz not null,

  -- L'INSTANT DE LA PRISE. C'est LUI que le 4ᵉ départage de §10.2 compare d'un
  -- snapshot à l'autre — d'où sa présence dans l'identité du snapshot (§4b).
  taken_at timestamptz not null,

  -- Le snapshot PRÉCÉDENT du même classement, quand il existe. `set null` à la
  -- suppression : la chaîne se coupe, elle ne ment pas en pointant ailleurs.
  previous_snapshot_id uuid references public.leaderboard_snapshots (id) on delete set null,

  -- Rattachements FACULTATIFS, pour les lectures et les purges. `season_id` est
  -- attendu (mais non exigé) sur `period = 'season'` : une ville peut n'avoir
  -- aucune saison ouverte (0066), et exiger la colonne empêcherait alors toute
  -- prise de snapshot.
  season_id uuid references public.seasons (id) on delete cascade,
  city_id text references public.city_zones (city_id) on delete set null,

  created_at timestamptz not null default now(),

  constraint leaderboard_snapshots_period_window check (period_end > period_start),

  -- COHÉRENCE DU CONTEXTE — un snapshot ne se contredit pas lui-même :
  --   · 'friends' ⇒ un public, pas de lieu ;
  --   · les trois scopes géographiques ⇒ un lieu, pas de public.
  constraint leaderboard_snapshots_scope_coherent check (
    (scope = 'friends' and audience_user_id is not null and scope_ref is null)
    or (scope <> 'friends' and audience_user_id is null and scope_ref is not null)
  )
);

comment on table public.leaderboard_snapshots is
  'SNAPSHOT de classement (§10.3 : « les classements ne sont pas recalculés entièrement dans le client »). Trois dimensions séparées — period (hebdo/saison) × scope (local/quartier/ville/amis) × subject_type (joueur/crew) — qui couvrent les sept items de §10.3 sans en inventer un huitième. Un snapshot est un FAIT DATÉ : il n''est jamais réécrit, seulement suivi par le suivant (previous_snapshot_id).';
comment on column public.leaderboard_snapshots.scope_ref is
  'Clé du contexte, interprétée PAR `scope` : city_zones.city_id (city), sectors.id (neighborhood), maille spatiale (local). Aucune clé étrangère — trois tables cibles. NULL pour ''friends'', qui a un public et non un lieu.';
comment on column public.leaderboard_snapshots.taken_at is
  'Instant de la prise. C''est la valeur que le 4ᵉ départage de §10.2 (« timestamp du snapshot précédent ») compare — reportée dans leaderboard_entries.previous_snapshot_at au snapshot suivant.';

-- ── 4b. L'IDENTITÉ D'UN SNAPSHOT ────────────────────────────────────────────
-- Deux prises du MÊME classement au MÊME instant seraient deux vérités
-- concurrentes : la seconde lecture tomberait sur l'une ou l'autre, au hasard.
-- `coalesce(...)` plutôt que `nulls not distinct` : en SQL, deux NULL ne sont
-- pas égaux, donc un index unique nu laisserait passer autant de doublons
-- qu'on veut sur les colonnes nullables — exactement le cas 'friends'
-- (scope_ref NULL) et les scopes géographiques (audience NULL).
create unique index leaderboard_snapshots_identity_idx
  on public.leaderboard_snapshots (
    period,
    scope,
    subject_type,
    activity,
    taken_at,
    coalesce(scope_ref, ''),
    coalesce(audience_user_id::text, '')
  );

-- LA LECTURE CHAUDE : « le dernier classement de CE contexte ». `taken_at desc`
-- en queue — c'est le tri, il n'est jamais omis.
create index leaderboard_snapshots_latest_idx
  on public.leaderboard_snapshots (period, scope, scope_ref, subject_type, activity, taken_at desc);

-- Le classement d'amis d'UN joueur. Partiel : les autres scopes n'ont pas de
-- public et n'ont rien à faire dans cet index.
create index leaderboard_snapshots_audience_idx
  on public.leaderboard_snapshots (audience_user_id, taken_at desc)
  where audience_user_id is not null;

-- ── 4c. LES LIGNES DU SNAPSHOT ──────────────────────────────────────────────
create table public.leaderboard_entries (
  snapshot_id uuid not null
    references public.leaderboard_snapshots (id) on delete cascade,

  -- LE SUJET, polymorphe comme partout ailleurs (`territories.owner_*`). Aucune
  -- clé étrangère : deux tables cibles. Même suspens qu'en 0074.
  subject_type text not null
    constraint leaderboard_entries_subject_type_check check (subject_type in ('user', 'crew')),
  subject_id uuid not null,

  -- LE RANG, DÉCIDÉ PAR LE MOTEUR (packages/engine/src/leaderboard.ts), jamais
  -- par un `order by` de ce fichier. Rang de COMPÉTITION : deux ex aequo
  -- portent le MÊME rang et le suivant saute — d'où l'absence de contrainte
  -- d'unicité sur (snapshot_id, rank), qui interdirait précisément l'égalité
  -- que §10.2 prévoit.
  rank integer not null
    constraint leaderboard_entries_rank_positive check (rank >= 1),

  -- Combien de sujets partagent ce rang (1 = personne d'autre). Stocké et non
  -- recalculé : sans lui, un client qui voit deux fois « 2ᵉ » ne saurait pas si
  -- c'est une égalité ou une erreur de sa pagination.
  tied_count integer not null default 1
    constraint leaderboard_entries_tied_positive check (tied_count >= 1),

  -- LES QUATRE MESURES DE §10.2, gelées telles qu'elles ont servi à classer.
  -- Les regeler ici plutôt que de les rejouer, c'est ce qui rend un snapshot
  -- VÉRIFIABLE : on peut relire pourquoi ce rang a été attribué.
  controlled_area_m2 double precision not null
    constraint leaderboard_entries_area_positive check (controlled_area_m2 >= 0),
  successful_defenses integer not null default 0
    constraint leaderboard_entries_defenses_positive check (successful_defenses >= 0),
  conquered_area_m2 double precision not null default 0
    constraint leaderboard_entries_conquered_positive check (conquered_area_m2 >= 0),

  -- §10.2 critère 4, tel qu'il a été utilisé. NULL = ce sujet n'avait jamais été
  -- classé dans ce contexte. Le moteur le classe alors DERRIÈRE les ex aequo
  -- déjà installés (jamais au hasard, jamais avec une ancienneté inventée).
  previous_snapshot_at timestamptz,

  created_at timestamptz not null default now(),

  primary key (snapshot_id, subject_type, subject_id)
);

comment on table public.leaderboard_entries is
  'Lignes d''un snapshot de classement (§10.2). Les quatre mesures sont GELÉES telles qu''elles ont servi à classer — un snapshot doit rester vérifiable. `rank` vient du moteur pur (packages/engine/src/leaderboard.ts) et non d''un `order by` SQL : une seule source de vérité pour les départages. AUCUN pseudo n''est recopié ici, pour qu''une suppression de compte se propage par jointure au lieu d''être figée dans l''historique.';
comment on column public.leaderboard_entries.rank is
  'Rang de COMPÉTITION (« 1224 ») : les ex aequo partagent le rang, le suivant saute. Pas d''unicité sur (snapshot_id, rank) — elle interdirait l''égalité que §10.2 prévoit explicitement.';
comment on column public.leaderboard_entries.previous_snapshot_at is
  '4ᵉ départage de §10.2 : `taken_at` du snapshot précédent où ce sujet figurait. NULL = jamais classé ici — le moteur le place alors derrière les ex aequo installés, sans lui inventer d''ancienneté.';

-- LA LECTURE D'UN CLASSEMENT : un snapshot, dans l'ordre des rangs.
create index leaderboard_entries_rank_idx
  on public.leaderboard_entries (snapshot_id, rank);

-- « Où en suis-je / où en est mon crew », et la recherche du snapshot précédent
-- d'un sujet donné.
create index leaderboard_entries_subject_idx
  on public.leaderboard_entries (subject_type, subject_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. RLS ET PRIVILÈGES — CE QUI SE LIT, ET PAR QUI
-- ════════════════════════════════════════════════════════════════════════════
-- Le patron de 0003 : RLS activée, ZÉRO policy d'écriture (seules les Edge
-- Functions en service_role écrivent, elles contournent la RLS par nature), et
-- révocation en profondeur des privilèges que Supabase accorde par défaut aux
-- rôles clients — sans ce `revoke`, la RLS serait la SEULE ligne de défense.

-- ── 5a. La vue et la fonction de mesure : SERVEUR UNIQUEMENT ────────────────
-- Elles agrègent `territories` en contournant sa RLS (une vue s'exécute avec
-- les droits de son propriétaire). Les ouvrir aux clients rendrait la policy de
-- publication différée de 0074 inopérante par la bande — un rival pourrait
-- suivre la surface d'un joueur à la minute. §10.3 dit d'ailleurs l'inverse :
-- le client lit des SNAPSHOTS, il ne recalcule pas.
revoke all on public.territory_surface_by_owner from public, anon, authenticated;
grant select on public.territory_surface_by_owner to service_role;

revoke all on function public.leaderboard_source_metrics(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.leaderboard_source_metrics(text, timestamptz, timestamptz)
  to service_role;

-- `territory_state_is_controlled` reste exécutable par tous : elle ne lit
-- AUCUNE donnée (immutable, un `in` sur son argument). La révoquer n'aurait
-- rien protégé et aurait cassé les vues qui l'appellent.

-- ── 5b. Les snapshots : lisibles, jamais écrivables ─────────────────────────
alter table public.leaderboard_snapshots enable row level security;
alter table public.leaderboard_entries enable row level security;

revoke all on public.leaderboard_snapshots from anon, authenticated;
revoke all on public.leaderboard_entries from anon, authenticated;
grant select on public.leaderboard_snapshots to authenticated;
grant select on public.leaderboard_entries to authenticated;

-- UN CLASSEMENT D'AMIS N'APPARTIENT QU'À SON PUBLIC. Les autres scopes
-- (local/quartier/ville) sont publics par nature — c'est le principe même d'un
-- classement. `(select auth.uid())` plutôt que `auth.uid()` : initplan évalué
-- une fois par requête au lieu d'une fois par ligne (même raison qu'en 0003:11).
create policy leaderboard_snapshots_select_visible on public.leaderboard_snapshots
  for select to authenticated
  using (
    scope <> 'friends'
    or audience_user_id = (select auth.uid())
  );

-- Les lignes SUIVENT la visibilité de leur snapshot. Sans cette policy, le
-- classement d'amis serait protégé sur son en-tête et grand ouvert sur son
-- contenu — c'est-à-dire pas protégé du tout.
create policy leaderboard_entries_select_visible on public.leaderboard_entries
  for select to authenticated
  using (
    exists (
      select 1
      from public.leaderboard_snapshots s
      where s.id = leaderboard_entries.snapshot_id
        and (s.scope <> 'friends' or s.audience_user_id = (select auth.uid()))
    )
  );

comment on policy leaderboard_snapshots_select_visible on public.leaderboard_snapshots is
  'Un classement d''amis (§10.3) est RELATIF à quelqu''un : seul son public le lit. Les scopes local/quartier/ville sont publics — c''est le principe d''un classement.';
comment on policy leaderboard_entries_select_visible on public.leaderboard_entries is
  'Les lignes suivent la visibilité de leur snapshot. Sans elle, un classement d''amis serait protégé sur son en-tête et ouvert sur son contenu.';

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/leaderboard_surface.pglite.test.mjs` exécute le VRAI SQL de ce
-- fichier sur un Postgres réel (PGlite, WASM), par-dessus la lignée complète :
-- la surface vient bien de `territories` et pas de `hex_claims`, les états
-- historiques n'y entrent pas, Run et Bike ne se rencontrent jamais, les
-- défenses et conquêtes sont bornées par la période, les CHECK refusent ce
-- qu'ils annoncent, l'identité d'un snapshot tient malgré les NULL, l'égalité
-- de rang est autorisée, la cascade et la RLS sont en place.
--
-- CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire : l'EFFET de la RLS.
-- PGlite tourne en SUPERUTILISATEUR — les policies ne s'y appliquent pas et
-- `auth.uid()` y est un bouchon qui rend NULL. Ce qui est vérifié, c'est que les
-- policies EXISTENT, ce qu'elles NOMMENT, et que les privilèges sont absents du
-- catalogue.
--
-- POUR LE REJOUER :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/leaderboard_surface.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- (un point refermé se RETIRE d'ici ; il ne se laisse pas traîner comme ouvert)
-- ════════════════════════════════════════════════════════════════════════════
-- 1. PERSONNE NE PREND DE SNAPSHOT. Les deux tables sont VIDES et le resteront
--    tant qu'une Edge Function (ou un cron) n'appellera pas
--    `leaderboard_source_metrics` puis `rankLeaderboard` du moteur pour écrire
--    les lignes. Sans ce preneur, `previous_snapshot_at` reste toujours NULL et
--    le 4ᵉ départage de §10.2 ne départage rien.
-- 2. L'ÉCRAN LIT TOUJOURS LES POINTS. `apps/mobile/app/(tabs)/classement.tsx` et
--    `features/social/leagueBoard.ts` interrogent `player_leaderboard`
--    (`season_scores.points`). La bascule vers la surface est un chantier à
--    part, volontairement : brancher un écran sur des tables vides afficherait
--    « aucun classement » à des joueurs qui en ont un.
-- 3. AUCUN HISTORIQUE DE PROPRIÉTÉ. Aucune table ne dit « qui possédait quoi à
--    telle date ». `successful_defenses` et `conquered_area_m2` sont donc
--    rattachées au propriétaire ACTUEL du territoire : une défense réussie puis
--    un territoire perdu dans la même période créditent le nouveau propriétaire.
--    La parade est une table d'événements de propriété — à poser avec le
--    preneur de snapshot, pas avant.
-- 4. `scope_ref` ET `subject_id` N'ONT AUCUNE CLÉ ÉTRANGÈRE (cibles multiples :
--    city_zones / sectors / maille, users / crews). Rien n'empêche une clé qui
--    ne désigne personne. Même trou qu'en 0074, même parade à venir : une
--    validation par déclencheur, posée avec le premier écrivain.
-- 5. `local` ET `neighborhood` N'ONT PAS DE MAILLE DÉFINIE. La spec les nomme
--    (§10.3) sans dire ce qu'ils recouvrent ; le schéma les accepte et laisse
--    `scope_ref` porter la clé. Décider de la maille (secteur H3 res7 existant ?
--    quartier administratif ?) est un arbitrage produit, pas un choix de schéma
--    — et l'inventer ici l'aurait figé en douce.
-- 6. AUCUNE RÉTENTION. Rien ne purge les vieux snapshots ; ils s'accumulent.
--    À câbler avec la cadence de prise, qui n'existe pas encore (voir 1).
-- 7. `season_scores` EST INTACTE ET LE RESTE. Les points continuent d'être
--    écrits par `claim_hexes` et lus par l'écran. Aucun des deux axes n'est
--    déprécié par cette migration — et tant que le preneur de snapshot n'existe
--    pas, l'axe SURFACE n'est encore qu'un socle.
