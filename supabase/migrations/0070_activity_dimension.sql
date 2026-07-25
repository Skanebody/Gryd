-- 0070_activity_dimension.sql
-- GRYD — E14 « DEUX DISCIPLINES, DEUX UNIVERS » (planche docs/design/vague-1/
-- PLANCHES.md §E14, décision fondateur 24/07/2026 : « on a mis en place une
-- version bike et une version running »). ÉTAPE 3 : LE SCHÉMA.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET POURQUOI ═══════════════════════════════
-- L'étape 2 a donné au moteur des BORNES par discipline (ACTIVITY_RULES dans
-- packages/shared/src/game-rules.ts) : un cycliste à 28 km/h n'est plus traité
-- en tricheur. Mais le schéma, lui, ne connaissait qu'UN monde :
--
--   · `hex_claims.h3index` était PRIMARY KEY À LUI SEUL. Un hexagone = un
--     propriétaire, point. Un cycliste qui passait sur la zone d'un coureur la
--     lui VOLAIT — exactement ce que E14 interdit (« les territoires Run
--     disparaissent en fondu, JAMAIS SUPERPOSÉS »).
--   · `season_scores` avait pour clé `(season_id, user_id)`. Les points Run et
--     Bike d'un même joueur s'ADDITIONNAIENT dans la même ligne — le « JAMAIS
--     SOMMÉES » de E14 et les « rangs SÉPARÉS » de E12, tous deux violés.
--
-- On ajoute donc UNE colonne `activity` là où deux mondes doivent coexister, et
-- on rend les clés d'unicité COMPOSITES. Le même hexagone peut désormais être
-- tenu SIMULTANÉMENT par un coureur et par un cycliste, dans deux univers qui
-- ne se voient pas et ne se volent rien.
--
-- ═══ POURQUOI « COLONNE + CLÉ COMPOSITE » ET PAS AUTRE CHOSE ════════════════
-- · Une TABLE SÉPARÉE (`bike_hex_claims`) dupliquerait tout l'aval — claim_hexes,
--   decay, clôture de saison, digest, agrégats de secteur. Chaque correctif
--   futur serait à appliquer deux fois, et la divergence silencieuse entre les
--   deux copies deviendrait le bug structurel du projet.
-- · Une PARTITION LIST(activity) exigerait de toute façon la clé composite
--   (Postgres impose que la clé de partition entre dans chaque contrainte
--   unique) PLUS une réécriture de table : une table simple ne se convertit pas
--   en table partitionnée sur place, il faudrait DÉPLACER les lignes. C'est
--   littéralement « réécrire les données existantes », ce que la loi du projet
--   interdit.
--
-- ═══ L'HISTOIRE N'EST PAS RÉÉCRITE ══════════════════════════════════════════
-- `default 'run' not null` rétro-remplit chaque ligne existante avec sa VRAIE
-- valeur : tout ce qui est déjà en base EST de la course à pied (le vélo n'a
-- jamais pu être ingéré — `flags.bike` est fermé et `runs` n'avait aucune
-- colonne de discipline). Ce n'est pas un repli par défaut, c'est un fait.
-- Aucun run, aucun claim acquis ne change de sens ni ne disparaît. Aucune
-- valeur existante n'est modifiée : la migration est purement ADDITIVE.
--
-- Le swap de clé primaire ne PEUT pas échouer : après rétro-remplissage,
-- `(h3index, 'run')` est unique par construction puisque `h3index` l'était.
-- Et AUCUNE clé étrangère ne référence `hex_claims` (vérifié : `grep "references
-- public.hex_claims"` ne rend rien) — donc zéro cascade à réécrire.
--
-- ═══ CE QUE CETTE MIGRATION NE FAIT PAS (à ne pas croire acquis) ════════════
-- Le bloc « CE QUI RESTE EN SUSPENS » en fin de fichier fait foi, et il est
-- DATÉ : ce résumé-ci vaut au 25/07/2026 et rien de plus.
-- NE SONT PAS DISCIPLINÉS : les compteurs vie-entière (`user_stats`) et la vue
-- `specialty_leaderboard` qui les classe, l'XP, les Foulées, les badges, les
-- agrégats de secteur (`sector_snapshot`), deux jobs (`decay_job`,
-- `digest_job`) et les RPC listées en §5.
-- SONT DISCIPLINÉS DEPUIS (correctifs du 25/07/2026, hors de cette migration) :
-- `season_close` (classement ET départages §13), `steal_push_job`, et trois des
-- quatre lecteurs mobiles (`useRealMissionCore`, `leagueBoard`, `economy`).
-- IL RESTE UN LECTEUR NON FILTRÉ, ET UN SEUL : `features/map/hexClaims.ts`
-- (:129-130). Il ne fait PLUS tomber le rendu — `territoryBuild.ts` dédoublonne
-- les cellules avant `cellsToMultiPolygon` depuis le 25/07/2026 (commit
-- 2b88711) — mais il MÉLANGE en silence : les zones vélo d'un joueur hybride
-- seraient peintes comme ses zones de course. Un mélange muet, pas un crash.
-- Son filtre est un suspens ORDONNÉ, pas un oubli : il ne peut pas être posé
-- avant que la colonne existe en base (§1 bis, qui donne l'ordre exact).
-- Rien de tout cela n'a d'effet tant qu'aucune ligne `bike` n'existe — et c'est
-- exactement ce qui rend la situation tenable aujourd'hui. ATTENTION, ce n'est
-- PLUS `flags.bike` qui le garantit : ce drapeau est OUVERT depuis le 25/07/2026
-- (décision fondateur), mais il n'ouvre qu'une LENTILLE D'AFFICHAGE. Ce qui
-- garantit l'absence de ligne `bike`, c'est que la discipline d'une sortie est
-- désormais DÉCLARÉE par le chemin qui lance la course
-- (`features/run/gps/runActivity.ts` → `DECLARED_START_ACTIVITY = 'run'`), et
-- que tous les chemins déclarent aujourd'hui la course à pied.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. `runs` — la discipline d'une sortie
-- ════════════════════════════════════════════════════════════════════════════
-- `source` (gps|healthkit|strava|gpx) dit d'OÙ vient la trace, jamais ce qu'on
-- faisait. `activity` dit CE QU'ON FAISAIT. Les deux sont orthogonaux : on
-- importe un GPX de vélo comme on enregistre une course en GPS live.
--
-- Ajouter une colonne avec un DEFAULT non volatil ne réécrit PAS la table
-- depuis PG 11 (la valeur est servie depuis le catalogue) : la migration est
-- instantanée quel que soit le volume de `runs`.
alter table public.runs
  add column activity text not null default 'run' -- game-rules: DEFAULT_ACTIVITY
    constraint runs_activity_check check (activity in ('run', 'bike')); -- game-rules: ACTIVITIES

comment on column public.runs.activity is
  'Discipline de la sortie (E14). « run » = valeur historique de TOUT l''existant, pas un repli. Décide les bornes §3.2 appliquées (ACTIVITY_RULES) et l''univers de territoire visé.';

-- Historique par discipline (écran Historique filtré, agrégats futurs). L'index
-- existant `runs_user_started_idx (user_id, started_at desc)` reste : il sert
-- les lectures TOUTES disciplines confondues (série, dédup, streak), qui restent
-- volontairement communes.
create index runs_user_activity_started_idx
  on public.runs (user_id, activity, started_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. `hex_claims` — DEUX TERRITOIRES SUR LA MÊME GRILLE
-- ════════════════════════════════════════════════════════════════════════════
alter table public.hex_claims
  add column activity text not null default 'run' -- game-rules: DEFAULT_ACTIVITY
    constraint hex_claims_activity_check check (activity in ('run', 'bike')); -- game-rules: ACTIVITIES

comment on column public.hex_claims.activity is
  'Univers de territoire (E14). Un hexagone peut être tenu SIMULTANÉMENT par un coureur et par un cycliste : ce sont deux lignes, deux propriétaires, aucun vol possible entre les deux.';

-- CONSÉQUENCE ASSUMÉE, à dire plutôt qu'à découvrir : la mémoire « déjà
-- possédé » qui gouverne le bonus PIONNIER est portée par la LIGNE, donc par le
-- monde. Un hexagone déjà couru peut être « pionnier » à vélo — parce que
-- personne ne l'a jamais roulé. C'est la définition même de deux univers
-- parallèles, pas une faille : chaque bonus demande une sortie RÉELLE et valide
-- dans sa discipline, rien ne s'achète et rien ne se duplique sans effort.

-- LE SWAP DE CLÉ. C'est la seule chose qui imposait « un hexagone = un
-- propriétaire » ; rien d'autre dans le schéma ne le disait.
alter table public.hex_claims drop constraint hex_claims_pkey;
alter table public.hex_claims add constraint hex_claims_pkey primary key (h3index, activity);

-- Index recréés AVEC la discipline : sans elle, toute lecture par ville, par
-- secteur ou par propriétaire mélangerait les deux mondes — et la lecture
-- publique (`hex_claims_select_all`, 0003) sert ces lignes à tout client.
drop index if exists public.hex_claims_city_idx;
drop index if exists public.hex_claims_sector_idx;
drop index if exists public.hex_claims_owner_idx;
create index hex_claims_city_idx   on public.hex_claims (city_id, activity) where city_id is not null;
create index hex_claims_sector_idx on public.hex_claims (sector_id, activity) where sector_id is not null;
create index hex_claims_owner_idx  on public.hex_claims (owner_user_id, activity);

-- `hex_claims_decay_idx (decay_at)` reste INCHANGÉ, volontairement : le job de
-- decay balaie les échéances TOUTES disciplines confondues (une zone échue est
-- échue, quel que soit le monde). Le discriminer ralentirait un balayage qui n'a
-- aucune raison de l'être.

-- ── GARDE-FOU DE DECAY (le danger silencieux de la clé composite) ────────────
-- `supabase/functions/decay_job/index.ts` DÉCIDE ligne par ligne (il lit chaque
-- ligne avec son propre `decay_at`) mais ÉCRIT par `.in('h3index', batch)` —
-- sans discipline. Tant que `h3index` était unique, c'était équivalent. Avec la
-- clé composite, ce même UPDATE frappe DEUX lignes : neutraliser la zone échue
-- d'un coureur effacerait la zone ENCORE VIVANTE du cycliste sur le même
-- hexagone. Aucun compilateur, aucun typecheck ne le signalerait.
--
-- Ce déclencheur rend la faute STRUCTURELLEMENT impossible, sans rien attendre
-- d'un appelant — même esprit que le `continue` avant toute écriture pour
-- l'outcome 'support' dans claim_hexes (0041) : l'invariant est dans la base,
-- pas dans la discipline de celui qui appelle.
--
-- L'INVARIANT ÉNONCÉ EST VRAI EN SOI, indépendamment du vélo : « on ne
-- neutralise jamais une zone dont l'échéance n'est pas passée », « on ne marque
-- pas prévenue une zone qui n'a pas d'échéance ». Il ne bloque donc AUCUNE
-- écriture légitime — decay_job ne sélectionne que des lignes `decay_at` non nul
-- et échu, claim_hexes ne met jamais `owner_user_id` à null.
--
-- `return null` dans un BEFORE UPDATE FOR EACH ROW ANNULE la mise à jour de
-- CETTE ligne-là seulement : les autres lignes du même UPDATE passent.
create or replace function public.hex_claims_guard_decay()
returns trigger
language plpgsql
as $$
begin
  -- (a) Neutralisation (owner → null) : réservée aux lignes RÉELLEMENT échues.
  if old.owner_user_id is not null
     and new.owner_user_id is null
     and (old.decay_at is null or old.decay_at > now()) then
    return null;
  end if;

  -- (b) Marquage anti-double-avertissement : impossible sans échéance à
  --     annoncer. Une ligne sans `decay_at` ne peut pas être « prévenue ».
  if new.decay_warned_at is distinct from old.decay_warned_at
     and new.decay_warned_at is not null
     and old.decay_at is null then
    return null;
  end if;

  return new;
end;
$$;

create trigger hex_claims_guard_decay_trg
  before update on public.hex_claims
  for each row
  execute function public.hex_claims_guard_decay();

comment on function public.hex_claims_guard_decay() is
  'Garde-fou de la clé composite (h3index, activity) : un UPDATE de decay écrit par h3index seul frappe les DEUX disciplines. Refuse de neutraliser une zone non échue et de marquer prévenue une zone sans échéance. Ne bloque aucune écriture légitime.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. `season_scores` — DEUX CLASSEMENTS, JAMAIS UNE SOMME
-- ════════════════════════════════════════════════════════════════════════════
-- E14 : « crews hybrides = deux métriques côte à côte, JAMAIS SOMMÉES ».
-- E12 : « Run et Bike ont des rangs SÉPARÉS ».
-- Sans cette colonne, `claim_hexes` faisait `points = points + excluded.points`
-- sur une clé `(season_id, user_id)` : les points d'un cycliste gonflaient le
-- classement des coureurs. Deux lignes = deux tableaux, structurellement.
alter table public.season_scores
  add column activity text not null default 'run' -- game-rules: DEFAULT_ACTIVITY
    constraint season_scores_activity_check check (activity in ('run', 'bike')); -- game-rules: ACTIVITIES

comment on column public.season_scores.activity is
  'Discipline du classement (E12/E14 : rangs SÉPARÉS, métriques JAMAIS sommées). Une ligne par (saison, joueur, discipline).';

alter table public.season_scores drop constraint season_scores_pkey;
alter table public.season_scores add constraint season_scores_pkey
  primary key (season_id, user_id, activity);

-- ── LES DEUX INDEX, ET LA VRAIE RAISON DE CHACUN (révisée le 25/07/2026) ────
-- L'INDEX DE SERVICE, c'est le nouveau. Le classement de ligue est la lecture
-- la plus chaude du jeu, et depuis le correctif de discipline il a EXACTEMENT
-- cette forme : apps/mobile/src/features/social/leagueBoard.ts:190-197 lit la
-- vue `player_leaderboard` en `.eq('season_id').eq('activity').order('points',
-- desc).limit(…)`. Les trois colonnes, dans cet ordre.
create index season_scores_activity_points_idx
  on public.season_scores (season_id, activity, points desc);

-- L'ANCIEN — `season_scores_points_idx (season_id, points desc)` de 0002 — est
-- CONSERVÉ, mais il faut dire pourquoi HONNÊTEMENT, parce que la raison a changé
-- sous nos pieds. Cette migration a d'abord été écrite en supposant que le
-- classement continuerait de filtrer `season_id` SEUL : dans ce monde-là,
-- l'ancien index était le seul capable de rendre l'ordre (Postgres n'a pas de
-- skip-scan) et le remplacer aurait fait retomber la requête en Seq Scan + Sort.
-- CETTE JUSTIFICATION EST CADUQUE. Grep exhaustif de `season_scores` et
-- `player_leaderboard` sur apps/mobile/src, supabase/functions et
-- supabase/migrations : PLUS AUCUN lecteur ne fait « `season_id` seul puis
-- `order by points desc` ».
--   · leagueBoard.ts:190-197      → season_id + activity + points desc → NOUVEL index
--   · economy.ts:142-148          → user_id + season_id + activity, une ligne, sans tri
--   · season_close/index.ts:222   → season_id seul mais SANS order by (il lit toute
--     la saison pour la trier en mémoire par discipline) ; le nouvel index a la
--     même colonne de tête, il sert ce prédicat aussi bien que l'ancien
--   · crew_leaderboard (§6b)      → jointure par user_id, pas par (season_id, points)
--   · export_account/index.ts:41  → par user_id
-- L'ancien index n'est donc plus servi par PERSONNE : il ne coûte plus que de
-- l'écriture (une ligne par capture) et de l'espace.
--
-- ON LE GARDE QUAND MÊME, et c'est de la PRUDENCE, pas de la performance : il
-- appartient à 0002, cette migration-ci se veut purement ADDITIVE, et un
-- rollback de 0070 (drop de `activity` → drop de l'index discipliné) doit
-- rendre une base identique à l'avant. Le supprimer ici rendrait ce retour en
-- arrière destructeur. Sa suppression, si elle a lieu, sera une migration à
-- elle seule — après que le vélo aura réellement tourné.

comment on index public.season_scores_points_idx is
  'GRYD 0002, CONSERVÉ TEL QUEL par 0070. État au 25/07/2026 : PLUS AUCUN lecteur ne s''en sert — depuis que le classement de ligue filtre la discipline, aucune requête du dépôt ne fait « season_id seul + order by points desc ». Gardé par prudence de rollback (0070 est additive et ne détruit rien de 0002), pas pour une performance. Le supprimer sera une migration à part.';
comment on index public.season_scores_activity_points_idx is
  'GRYD 0070 — index de SERVICE du classement d''UNE discipline (E12 : rangs SÉPARÉS). Sert apps/mobile/src/features/social/leagueBoard.ts (season_id + activity + points desc) et, par sa colonne de tête, toute lecture filtrée sur season_id seul.';

-- La table `seasons` n'est PAS disciplinée, volontairement : une saison est une
-- FENÊTRE DE TEMPS pour une ville, la même pour les deux disciplines. Doubler
-- les lignes de `seasons` casserait tout lecteur qui fait
-- `.eq('status','active').maybeSingle()` (rc_webhook/index.ts:174) — un dégât
-- IMMÉDIAT, là où la discipline portée par le score ne coûte rien à personne.

-- ════════════════════════════════════════════════════════════════════════════
-- 4. SATELLITES — l'ombre du territoire
-- ════════════════════════════════════════════════════════════════════════════
-- Toutes ces tables sont clées (ou filtrées) par `h3index` et alimentent des
-- décisions de jeu. Sans discipline, elles FUITENT d'un monde à l'autre : un
-- relais de cycliste ferait monter le rang d'un relais de coureur, une frontière
-- crew ouverte à pied se refermerait à vélo, etc.

-- LE RELAIS (A-41) — rang du relayeur, cooldown 24 h par (hex, user) : tout se
-- calcule PAR FENÊTRE DE CAPTURE, et une capture appartient à un seul monde.
alter table public.hex_co_captures
  add column activity text not null default 'run'
    constraint hex_co_captures_activity_check check (activity in ('run', 'bike'));
drop index if exists public.hex_co_captures_window_idx;
drop index if exists public.hex_co_captures_user_hex_idx;
create index hex_co_captures_window_idx
  on public.hex_co_captures (h3index, activity, capture_claimed_at, credited_at);
create index hex_co_captures_user_hex_idx
  on public.hex_co_captures (h3index, activity, user_id, credited_at desc);
-- `hex_co_captures_user_day_idx (user_id, credited_at desc)` reste INCHANGÉ :
-- le cap quotidien de points de relais est PAR COMPTE, pas par discipline —
-- même statu quo que MAX_CLAIMS_PER_DAY (arbitrage fondateur non tranché).

-- FRONTIÈRES CREW PARTIELLES (0015) — une frontière ouverte en courant ne peut
-- pas être refermée à vélo : ce serait mélanger deux lectures compétitives, et
-- l'intérieur capturé atterrirait dans le mauvais monde.
alter table public.partial_boundaries
  add column activity text not null default 'run'
    constraint partial_boundaries_activity_check check (activity in ('run', 'bike'));
drop index if exists public.partial_boundaries_crew_status_idx;
create index partial_boundaries_crew_status_idx
  on public.partial_boundaries (crew_id, activity, status, expires_at);

-- FILE DE PUSH « on t'a pris ta zone » (0056) — le dépossédé doit savoir DANS
-- QUEL MONDE il a perdu : sans ça, un coureur reçoit « reprends ta zone » pour
-- un hexagone qu'il tient toujours en courant.
alter table public.steal_push_queue
  add column activity text not null default 'run'
    constraint steal_push_queue_activity_check check (activity in ('run', 'bike'));

-- ── UNE COLONNE QUE PERSONNE NE LIT NE PRÉVIENT DE RIEN ─────────────────────
-- `claim_steal_push_batch` (0058) déclare ses colonnes de sortie EN DUR dans un
-- `returns table (…)`. Ajouter la colonne à la TABLE ne l'ajoute donc PAS au
-- contrat de la RPC : sans cette redéfinition, `steal_push_queue.activity`
-- serait une colonne EN ÉCRITURE SEULE, et la faute annoncée trois lignes plus
-- haut (« un coureur reçoit "reprends ta zone" pour un hexagone qu'il tient
-- toujours en courant ») se produirait quand même. On expose la discipline
-- jusqu'au drain, seul endroit d'où le message part.
--
-- POURQUOI UN `drop` ET PAS UN `create or replace` : Postgres refuse de changer
-- le TYPE DE RETOUR d'une fonction existante (« cannot change return type of
-- existing function ») — et le type de retour d'un `returns table` inclut la
-- liste des colonnes. Le drop est sans risque ici : la signature d'ARGUMENTS
-- (integer, timestamptz, integer) est identique, donc aucun appelant ne change,
-- et aucune surcharge ne survit (pas d'ambiguïté PostgREST `PGRST203`).
--
-- Le CORPS est celui de 0058, inchangé mot pour mot sauf aux DEUX endroits où
-- la discipline doit remonter : le `returning` de la CTE `reserved` et le
-- `select` final (plus le commentaire du `#variable_conflict`, qui cite
-- désormais `activity` — c'est un OUT param de plus, donc un homonyme de plus).
-- Aucun prédicat, aucun filtre, aucun regroupement n'est touché
-- — l'unité de travail reste la VICTIME, pas la (victime, discipline) : une
-- victime dépossédée dans les deux mondes reçoit UN message qui les couvre tous
-- les deux, et c'est au consommateur de rendre chaque ligne dans son monde.
-- Grouper par discipline doublerait les notifications ; ce serait un choix
-- PRODUIT, pas une correction de schéma, et il n'a pas été tranché.
drop function if exists public.claim_steal_push_batch(integer, timestamptz, integer);

create function public.claim_steal_push_batch(
  p_max_victims  integer,
  p_now          timestamptz,
  p_grace_minutes integer
)
returns table (
  id             bigint,
  victim_user_id uuid,
  thief_user_id  uuid,
  h3index        bigint,
  -- DANS QUEL MONDE la zone a été perdue (0070). Sans elle, le consommateur ne
  -- peut pas dire « ta zone à vélo » plutôt que « ta zone », ni s'abstenir quand
  -- la victime tient toujours l'hexagone dans l'autre discipline.
  activity       text,
  stolen_at      timestamptz,
  -- Dernière fois qu'un push de vol a été DÉCIDÉ pour cette victime (identique
  -- sur toutes ses lignes). Lu ici, et non dans une requête séparée, pour que
  -- l'horloge du cooldown vienne du MÊME instantané que la réservation.
  last_pushed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
-- Les OUT params de `returns table` sont des variables plpgsql homonymes de
-- colonnes réelles (`id`, `stolen_at`, et désormais `activity`). Sans cette
-- directive, une référence non qualifiée résoudrait vers la VARIABLE,
-- silencieusement.
#variable_conflict use_column
declare
  -- Clé arbitraire mais STABLE du verrou de drain (une seule dans le repo).
  v_lock_key constant bigint := 570056;
begin
  -- (a) Une seule RÉSERVATION à la fois. Refusé = une réservation est en cours :
  -- on sort à vide. Zéro ligne n'est pas un échec — le drain suivant reprendra.
  if not pg_try_advisory_xact_lock(v_lock_key) then
    return;
  end if;

  -- RÉAPEUR — réservations jamais finalisées (isolate mort entre la réservation
  -- et la fin). On ne les REMET PAS en file : « au plus une fois ». On les
  -- consomme en le DISANT, pour que la perte se compte au lieu de se taire.
  -- Il tourne AVANT la sélection : c'est lui qui borne l'attente imposée par (b).
  update public.steal_push_queue q
     set processed_at = p_now,
         outcome      = 'abandoned'
   where q.processed_at is null
     and q.reserved_at is not null
     and q.reserved_at < p_now - make_interval(mins => p_grace_minutes);

  return query
  with due_victims as (
    -- QUI traiter : victimes ayant au moins une ligne DUE maintenant, ET aucune
    -- ligne encore réservée (b). Ordre = ancienneté du plus vieux vol non
    -- annoncé. Aucun critère de statut, de paiement ni de niveau (§22).
    select q.victim_user_id as vid
      from public.steal_push_queue q
     where q.processed_at is null
       and q.reserved_at is null
       and coalesce(q.next_attempt_at, '-infinity'::timestamptz) <= p_now
       and not exists (
         select 1
           from public.steal_push_queue h
          where h.victim_user_id = q.victim_user_id
            and h.processed_at is null
            and h.reserved_at is not null
       )
     group by q.victim_user_id
     order by min(q.stolen_at) asc
     limit p_max_victims
  ),
  picked as (
    -- QUOI prendre : TOUTES les lignes en attente de ces victimes, reportées
    -- comprises. Un agrégat partiel annoncerait un nombre faux.
    select q.id as qid
      from public.steal_push_queue q
      join due_victims v on v.vid = q.victim_user_id
     where q.processed_at is null
     order by q.id
       for update of q                       -- (c) attendre plutôt que tronquer
  ),
  reserved as (
    update public.steal_push_queue q
       set reserved_at     = p_now,          -- (d) marque qui survit au COMMIT
           attempts        = q.attempts + 1,
           next_attempt_at = null            -- le report est consommé par la prise
      from picked p
     where q.id = p.qid
    returning q.id, q.victim_user_id, q.thief_user_id, q.h3index, q.activity, q.stolen_at
  )
  select r.id,
         r.victim_user_id,
         r.thief_user_id,
         r.h3index,
         r.activity,
         r.stolen_at,
         -- Horloge du cooldown (défaut 3). Lue sur les CONSOMMATIONS `pushed`,
         -- pas sur push_log : elle est ainsi armée par la décision d'envoyer.
         -- Les lignes en cours de réservation ont `outcome is null` et ne
         -- peuvent donc pas s'auto-compter.
         (select max(l.processed_at)
            from public.steal_push_queue l
           where l.victim_user_id = r.victim_user_id
             and l.outcome = 'pushed') as last_pushed_at
    from reserved r;
end;
$$;

-- Privilèges : une fonction RECRÉÉE les a perdus, et PUBLIC hérite d'EXECUTE à
-- la création. Révoquer d'`anon` seul ne suffirait PAS (piège prouvé du repo) —
-- il FAUT révoquer `from public`. Seul le service_role (Edge Function) appelle
-- cette RPC ; il contourne le RLS par nature et n'a besoin d'aucun grant.
revoke all on function public.claim_steal_push_batch(integer, timestamptz, integer)
  from public, anon, authenticated;

comment on function public.claim_steal_push_batch(integer, timestamptz, integer) is
  'GRYD 0058, redéfinie par 0070 — réserve un lot de vols à annoncer, PAR VICTIME. '
  'Rend désormais `activity` : sans elle, la colonne ajoutée à steal_push_queue '
  'serait en écriture seule et un coureur recevrait « reprends ta zone » pour un '
  'hexagone qu''il tient toujours en courant. Une victime dont une ligne est déjà '
  'réservée est écartée ENTIÈRE : un agrégat tronqué annoncerait un nombre faux, '
  'attendre non. Le verrou consultatif ne couvre que la transaction de cette '
  'fonction (pas la durée du drain) ; c''est cette exclusion, plus `reserved_at` '
  'persistant, qui empêche le doublon et le compte partiel. Renvoie aussi '
  '`last_pushed_at` — l''horloge du cooldown de vol, lue sur les consommations '
  '`pushed`, donc armée par la DÉCISION d''envoyer et non par une preuve de '
  'livraison. L''unité reste la VICTIME, pas la (victime, discipline) : le lot '
  'peut mêler les deux mondes, à charge du consommateur de rendre chaque ligne '
  'dans le sien.';

-- HISTORIQUE DES HEXES CONTESTÉS (0011) — nourrit l'anti-collusion (alternances
-- entre crews sur un même hex). Deux disciplines sur le même hexagone ne sont
-- PAS des alternances : sans discipline, la pénalité se déclencherait sur une
-- coïncidence géographique.
alter table public.contested_group_runs
  add column activity text not null default 'run'
    constraint contested_group_runs_activity_check check (activity in ('run', 'bike'));
drop index if exists public.contested_group_runs_hex_idx;
create index contested_group_runs_hex_idx
  on public.contested_group_runs (h3index, activity, created_at);

-- AVANT-POSTES ET ROUTES (0002 / 0008) — structures de joueur nées d'une densité
-- de territoire. Elles se comptent dans le monde où elles ont été gagnées.
alter table public.outposts
  add column activity text not null default 'run'
    constraint outposts_activity_check check (activity in ('run', 'bike'));
alter table public.routes
  add column activity text not null default 'run'
    constraint routes_activity_check check (activity in ('run', 'bike'));

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `claim_hexes` v0070 — LE CLAIM ÉCRIT DANS LE BON UNIVERS
-- ════════════════════════════════════════════════════════════════════════════
-- Lignée : 0005 → 0017 (last_defended_at) → 0018 (XP D18) → 0031 (garde TOCTOU)
-- → 0041 (outcome 'support') → 0070 (discipline). Le corps est celui de 0041,
-- inchangé sauf aux TROIS endroits où le monde se décide :
--   (a) `on conflict (h3index, activity)` — sans ça, un cycliste ÉCRASERAIT la
--       ligne d'un coureur : le vol exact que E14 interdit ;
--   (b) la branche `defend` — sans ça, on défendrait la ligne du mauvais monde ;
--   (c) l'upsert `season_scores` — sans ça, les points seraient SOMMÉS.
--
-- `p_activity` a une valeur par DÉFAUT : un appelant qui l'ignore (ancien
-- client, appel 4-args de completeBoundaries) obtient EXACTEMENT le comportement
-- d'avant. La rétro-compatibilité n'est pas une intention, elle est dans la
-- signature.
--
-- ⚠ AMBIGUÏTÉ POSTGREST : ajouter un paramètre crée une SURCHARGE. Deux
-- surcharges vivantes = `PGRST203` sur tout appel qui ne les départage pas.
-- On DROP l'ancienne, comme 0032 l'a fait pour la signature 4-args périmée.
drop function if exists public.claim_hexes(uuid, uuid, text, jsonb, integer);

create or replace function public.claim_hexes(
  p_run_id   uuid,
  p_user_id  uuid,
  p_city_id  text,
  p_claims   jsonb,
  p_xp       integer default null,  -- score.xp (D18, sans streak/perf) ; null = rétro-compat
  p_activity text    default 'run'  -- game-rules: DEFAULT_ACTIVITY — absent ⇒ course à pied
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim          jsonb;
  v_h3             bigint;
  v_outcome        text;
  v_points         integer;
  v_sector_id      uuid;
  v_expected_owner uuid;      -- owner observé par le moteur (garde optimiste)
  v_claim_type     text;
  v_rowcount       integer;   -- lignes réellement écrites par la dernière instruction
  v_total_points   integer  := 0;
  v_applied        integer  := 0;
  v_skipped        integer  := 0;   -- claims non appliqués (conflit de concurrence)
  v_color          smallint;
  v_season_id      uuid;
  v_is_club        boolean;
  v_foulees        integer;
  v_xp             integer  := 0;
begin
  if not exists (
    select 1 from public.runs r
    where r.id = p_run_id and r.user_id = p_user_id
  ) then
    raise exception 'claim_hexes: run % does not exist or does not belong to user %',
      p_run_id, p_user_id;
  end if;

  if p_claims is null or jsonb_typeof(p_claims) <> 'array' then
    raise exception 'claim_hexes: p_claims must be a jsonb array';
  end if;

  -- Une discipline inconnue n'est pas repliée en silence sur la course : elle
  -- lève. Écrire un monde qu'on n'a pas compris serait fabriquer de la donnée.
  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    raise exception 'claim_hexes: unknown activity %', p_activity;
  end if;

  select c.color into v_color
  from public.crew_members cm
  join public.crews c on c.id = cm.crew_id
  where cm.user_id = p_user_id and cm.left_at is null
  limit 1;

  if p_city_id is not null then
    select s.id into v_season_id
    from public.seasons s
    where s.city_id = p_city_id and s.status = 'active'
    order by s.starts_at desc
    limit 1;
  end if;

  for v_claim in select * from jsonb_array_elements(p_claims) loop
    v_h3             := (v_claim ->> 'h3index')::bigint;
    v_outcome        := v_claim ->> 'outcome';
    v_points         := coalesce((v_claim ->> 'points')::integer, 0);
    v_sector_id      := nullif(v_claim ->> 'sector_id', '')::uuid;
    v_expected_owner := nullif(v_claim ->> 'expected_owner', '')::uuid;

    if v_outcome not in ('neutral', 'steal', 'defend', 'pioneer', 'support') then
      raise exception 'claim_hexes: unknown outcome % for hex %', v_outcome, v_h3;
    end if;

    -- A-41 LE RELAIS : 'support' crédite les points et RIEN d'autre. Le
    -- `continue` AVANT toute instruction hex_claims rend structurellement
    -- impossible qu'un relais touche owner/lock/decay/claimed_at.
    if v_outcome = 'support' then
      v_total_points := v_total_points + v_points;
      v_applied      := v_applied + 1;
      continue;
    end if;

    v_claim_type := case v_outcome
      when 'steal'  then 'stolen'
      when 'defend' then 'defended'
      else v_outcome
    end;

    if v_outcome = 'defend' then
      update public.hex_claims
      set decay_at         = nullif(v_claim ->> 'decay_at', '')::timestamptz,
          last_defended_at = now(),
          run_id           = p_run_id,
          crew_color_cache = v_color,
          claim_type       = v_claim_type,
          sector_id        = coalesce(v_sector_id, sector_id)
      where h3index = v_h3
        -- (b) On ne défend QUE sa zone, DANS SON MONDE.
        and activity = p_activity
        and owner_user_id = p_user_id;
      get diagnostics v_rowcount = row_count;
    else
      insert into public.hex_claims
        (h3index, activity, city_id, sector_id, owner_user_id, crew_color_cache,
         claim_type, claimed_at, run_id, locked_until, shielded_until, decay_at,
         last_defended_at)
      values
        (v_h3, p_activity, p_city_id, v_sector_id, p_user_id, v_color,
         v_claim_type, now(), p_run_id,
         nullif(v_claim ->> 'locked_until', '')::timestamptz,
         null,
         nullif(v_claim ->> 'decay_at', '')::timestamptz,
         now())
      -- (a) LE POINT CRITIQUE : le conflit se juge sur (hexagone, discipline).
      -- Un cycliste qui passe sur la zone d'un coureur INSÈRE sa propre ligne ;
      -- il ne peut plus écraser celle du coureur.
      on conflict (h3index, activity) do update set
        city_id          = excluded.city_id,
        sector_id        = excluded.sector_id,
        owner_user_id    = excluded.owner_user_id,
        crew_color_cache = excluded.crew_color_cache,
        claim_type       = excluded.claim_type,
        claimed_at       = excluded.claimed_at,
        run_id           = excluded.run_id,
        locked_until     = excluded.locked_until,
        shielded_until   = excluded.shielded_until,
        decay_at         = excluded.decay_at,
        last_defended_at = excluded.last_defended_at
      -- Garde optimiste : n'applique que si l'état DB est TOUJOURS celui décidé par le
      -- moteur (owner inchangé), OU si l'hex a décru (libre malgré un owner périmé).
      -- L'`expected_owner` vient du monde de `p_activity` (ingest_run ne lit que
      -- celui-là) : la garde compare bien ce qui est comparable.
      where hex_claims.owner_user_id is not distinct from v_expected_owner
         or (hex_claims.decay_at is not null and hex_claims.decay_at <= now());
      get diagnostics v_rowcount = row_count;
    end if;

    -- Crédit UNIQUEMENT si une ligne a réellement changé (sinon = conflit de concurrence :
    -- un autre coureur a pris/défendu l'hex depuis la lecture du moteur → on n'attribue rien).
    if v_rowcount > 0 then
      v_total_points := v_total_points + v_points;
      v_applied      := v_applied + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  if v_season_id is not null and v_total_points > 0 then
    -- (c) Deux tableaux, jamais une somme (E12 « rangs SÉPARÉS », E14 « JAMAIS
    -- SOMMÉES ») : la ligne de score porte la discipline.
    insert into public.season_scores (season_id, user_id, activity, points)
    values (v_season_id, p_user_id, p_activity, v_total_points)
    on conflict (season_id, user_id, activity) do update
      set points = season_scores.points + excluded.points;
  end if;

  select u.is_club into v_is_club from public.users u where u.id = p_user_id;

  v_foulees := floor(
    v_total_points
    * 0.1                                        -- game-rules: FOULEES_RATE_OF_POINTS
    * case when coalesce(v_is_club, false)
        then 1.5                                 -- game-rules: CLUB_FOULEES_MULTIPLIER
        else 1.0
      end
  )::integer;

  -- XP joueur permanent (D18) : SANS streak/perf. Vaut `p_xp` (= score.xp du moteur)
  -- quand fourni par ingest_run ; `v_total_points` seulement en rétro-compat (appel
  -- boundary 4-args).
  --
  -- ⚠ MONO-POT ASSUMÉ : Foulées et XP restent COMMUNS aux deux disciplines. Ce
  -- sont des progressions PERSONNELLES, pas des classements comparatifs — E12 ne
  -- parle que de rangs. Inscrit en suspens en fin de fichier, pas dissimulé.
  v_xp := coalesce(p_xp, v_total_points * 1); -- game-rules: XP_RATE_OF_POINTS

  if v_foulees > 0 or v_xp > 0 then
    update public.users
    set foulees = foulees + coalesce(v_foulees, 0),
        xp      = xp + v_xp
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'applied',         v_applied,
    'skipped',         v_skipped,
    'points_total',    v_total_points,
    'foulees_awarded', coalesce(v_foulees, 0),
    'xp_awarded',      v_xp,
    'season_id',       v_season_id,
    'activity',        p_activity
  );
end;
$$;

revoke all on function public.claim_hexes(uuid, uuid, text, jsonb, integer, text) from public;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb, integer, text) from anon;
revoke all on function public.claim_hexes(uuid, uuid, text, jsonb, integer, text) from authenticated;
grant execute on function public.claim_hexes(uuid, uuid, text, jsonb, integer, text) to service_role;

comment on function public.claim_hexes(uuid, uuid, text, jsonb, integer, text) is
  'Applique les claims d''une course dans l''univers de p_activity (E14). p_activity absent ⇒ « run » : comportement d''avant le vélo, à l''identique. service_role uniquement.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. AGRÉGATS — ne jamais rendre une somme de deux mondes
-- ════════════════════════════════════════════════════════════════════════════

-- 6a. `player_leaderboard` (0002 → redéfinie 0046) : la vue EXPOSE désormais la
-- discipline. Elle ne filtre pas à sa place — c'est au lecteur de choisir son
-- monde, comme le commutateur de E14 le fait à l'écran. Sans la colonne, ce
-- choix serait impossible côté client.
drop view if exists public.player_leaderboard;
create view public.player_leaderboard as
select
  ss.season_id,
  s.city_id,
  ss.activity,
  ss.user_id,
  u.pseudo,
  ss.points,
  ss.rank_cache
from public.season_scores ss
join public.seasons s on s.id = ss.season_id
join public.users u on u.id = ss.user_id
where u.deletion_requested_at is null;

revoke all on public.player_leaderboard from public, anon;
grant select on public.player_leaderboard to authenticated;

-- 6b. `crew_leaderboard` (0002 → redéfinie 0046) : UNE LIGNE PAR (CREW,
-- DISCIPLINE). E14 : « crews hybrides = deux métriques côte à côte, JAMAIS
-- SOMMÉES » — c'est exactement cette forme. Le produit ne lit pas cette matview
-- aujourd'hui (apps/mobile/src/features/crew/real.ts:65 dit explicitement de ne
-- jamais la lire, elle est rafraîchie par job) : le changement de cardinalité ne
-- casse aucun écran, et il rend le futur lecteur OBLIGÉ de choisir un monde.
drop materialized view if exists public.crew_leaderboard;
create materialized view public.crew_leaderboard as
with activities as (
  select unnest(array['run', 'bike']) as activity -- game-rules: ACTIVITIES
),
active_members as (
  select cm.crew_id, cm.user_id
  from public.crew_members cm
  join public.users u on u.id = cm.user_id
  where cm.left_at is null
    and u.deletion_requested_at is null
),
hexes as (
  select am.crew_id, hc.city_id, hc.activity, count(*)::integer as hexes_held
  from active_members am
  join public.hex_claims hc on hc.owner_user_id = am.user_id
  where hc.decay_at is null or hc.decay_at > now()
  group by am.crew_id, hc.city_id, hc.activity
),
points as (
  select am.crew_id, s.city_id, ss.activity, sum(ss.points)::integer as points_total
  from active_members am
  join public.season_scores ss on ss.user_id = am.user_id
  join public.seasons s on s.id = ss.season_id and s.status = 'active'
  group by am.crew_id, s.city_id, ss.activity
)
select
  c.id as crew_id,
  a.activity,
  c.city_id,
  c.name,
  c.color,
  coalesce(h.hexes_held, 0)   as hexes_held,
  coalesce(p.points_total, 0) as points_total
from public.crews c
cross join activities a
left join hexes  h on h.crew_id = c.id and h.city_id = c.city_id and h.activity = a.activity
left join points p on p.crew_id = c.id and p.city_id = c.city_id and p.activity = a.activity;

-- Index unique requis pour `refresh materialized view concurrently` — il porte
-- la discipline, sinon le rafraîchissement concurrent échouerait sur doublon.
create unique index crew_leaderboard_crew_idx on public.crew_leaderboard (crew_id, activity);
create index crew_leaderboard_city_idx on public.crew_leaderboard (city_id, activity, points_total desc);

revoke all on public.crew_leaderboard from public, anon;
grant select on public.crew_leaderboard to authenticated;

-- 6c. `sector_control` (0002) : le contrôle de secteur se compte PAR MONDE. Un
-- secteur peut être dominé SIMULTANÉMENT par un crew Run et un crew Bike —
-- c'est l'intention de E14, pas un défaut. `sectors.total_hexes` reste le
-- dénominateur COMMUN : la surface au sol ne dépend pas de la discipline.
-- Aucune ligne n'apparaît pour une discipline sans hexagone détenu : tant
-- qu'aucun vélo ne joue, cette matview a EXACTEMENT le contenu d'aujourd'hui.
drop materialized view if exists public.sector_control;
create materialized view public.sector_control as
with active_members as (
  select cm.crew_id, cm.user_id
  from public.crew_members cm
  where cm.left_at is null
),
owned as (
  select hc.sector_id, am.crew_id, hc.activity, count(*)::integer as owned_hexes
  from public.hex_claims hc
  join active_members am on am.user_id = hc.owner_user_id
  where hc.sector_id is not null
    and (hc.decay_at is null or hc.decay_at > now())
  group by hc.sector_id, am.crew_id, hc.activity
)
select
  o.sector_id,
  o.crew_id,
  o.activity,
  o.owned_hexes,
  round(o.owned_hexes / nullif(s.total_hexes, 0)::numeric, 4) as control_percent,
  case -- game-rules: SECTOR_CONTROL_THRESHOLDS (bornes basses 0.1 / 0.3 / 0.5 / 0.7)
    when o.owned_hexes >= s.total_hexes * 0.7 then 'dominated'
    when o.owned_hexes >= s.total_hexes * 0.5 then 'controlled'
    when o.owned_hexes >= s.total_hexes * 0.3 then 'contested'
    when o.owned_hexes >= s.total_hexes * 0.1 then 'implantation'
    else 'presence'
  end as status
from owned o
join public.sectors s on s.id = o.sector_id;

create unique index sector_control_sector_crew_idx
  on public.sector_control (sector_id, crew_id, activity);
create index sector_control_crew_idx on public.sector_control (crew_id, activity);

revoke all on public.sector_control from public, anon;
grant select on public.sector_control to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- LES PREUVES SQL DE CETTE MIGRATION, ET CE QU'ELLES VALENT ICI (25/07/2026)
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/activity_dimension.pglite.test.mjs` exécute le VRAI SQL de ce
-- fichier sur un Postgres réel (PGlite, WASM) et vérifie 14 invariants : clé
-- primaire composite, `on conflict (h3index, activity)`, upsert `season_scores`
-- par discipline, garde-fou de decay, garde TOCTOU de 0031, agrégats, drop de
-- la signature 5-args, RPC de drain, plans d'index.
--
-- CE QU'IL VAUT DANS CE DÉPÔT, DIT PLUTÔT QUE LAISSÉ CROIRE : rien, tant que
-- personne ne l'a lancé ailleurs. `node supabase/tests/activity_dimension.
-- pglite.test.mjs` SORT 2 et imprime « NON EXÉCUTÉ — PGlite est introuvable » :
-- `@electric-sql/pglite` n'est ni dans `node_modules` ni dans le cache npm, et
-- la loi du projet interdit de l'installer. Aucun de ces 14 invariants n'a donc
-- été rejoué ici — ils sont RAISONNÉS, pas mesurés. Les suites Deno du dépôt ne
-- touchent pas une ligne de plpgsql : elles ne les remplacent pas.
-- Que le test sorte 2 plutôt que 0 est délibéré : un harnais absent ne doit
-- jamais ressembler à un test vert.
--
-- POUR LE REJOUER, sans toucher aux dépendances du dépôt :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/activity_dimension.pglite.test.mjs
--
-- ⚠️ SES INVARIANTS 13 ET 14 (plans d'index, et les chiffres « 0,2 ms → 36 ms »
-- qui vont avec) ont été écrits AVANT que le classement de ligue filtre la
-- discipline. Ils mesurent un prédicat — `season_id` seul, trié `points desc` —
-- qu'AUCUN lecteur du dépôt n'émet plus. C'est le §3 ci-dessus qui fait foi sur
-- l'état du code, pas eux ; le test reste à recaler quand il redeviendra
-- exécutable.

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 25/07/2026
-- (à ne pas promettre, à ne pas oublier, et à ne pas laisser vieillir : un
--  point refermé se RETIRE d'ici, il ne se laisse pas traîner comme ouvert)
-- ════════════════════════════════════════════════════════════════════════════
-- Cette migration sépare les TERRITOIRES et les CLASSEMENTS DE SAISON. Elle ne
-- sépare PAS ce qui suit. Aucun de ces points n'a d'effet tant qu'aucune sortie
-- vélo n'existe en base — ce qui est le cas aujourd'hui, garanti non par
-- `flags.bike` (OUVERT depuis le 25/07/2026, mais simple lentille d'affichage)
-- mais par la DÉCLARATION de discipline au départ : tous les chemins de départ
-- déclarent 'run' (`features/run/gps/runActivity.ts`).
--
-- 0. L'ORDRE D'EXÉCUTION, QUI N'EST PAS NÉGOCIABLE. Cette migration N'EST PAS
--    APPLIQUÉE. Tant qu'elle ne l'est pas, la colonne `activity` n'existe pas en
--    base et tout `.eq('activity', …)` fait ÉCHOUER la requête (colonne inconnue
--    côté PostgREST). L'ordre est donc :
--      ① appliquer 0070 → ② déployer les Edge Functions → ③ filtrer les lecteurs
--      clients encore non filtrés (§1 bis) → ④ (plus tard) ouvrir un vrai
--      univers vélo, quand un moteur existera.
--
--    ⚠️ LE POINT LE PLUS DANGEREUX DE CETTE LISTE, ET IL A FAILLI N'Y PAS FIGURER :
--    `ingest_run` DÉPEND DÉJÀ DE CETTE MIGRATION. Il émet `.eq('activity', …)`
--    (index.ts:372, 778, 814, 883, 1686, 1856, 1969, 2156, 3138) et appelle
--    `claim_hexes` avec `p_activity` (index.ts:2070, 3059) — une signature à
--    6 arguments qui n'existe QU'APRÈS 0070, puisque cette migration DROPe la
--    version à 5 arguments. Déployer la fonction AVANT d'appliquer la migration
--    casse donc l'ingestion de TOUTES les courses, pas seulement les vélos.
--    D'où ① STRICTEMENT avant ②. Cette dépendance était absente de la présente
--    liste : une migration qui tait ce qui casse en la déployant de travers
--    promet au-delà de son code.
--
--    Les lecteurs CLIENTS déjà filtrés assument leur dépendance à découvert et
--    le disent chacun dans leur en-tête : sans la colonne, ils retombent sur un
--    état honnête et LOCAL (`unavailable`, `failed`, mission absente) sur UN
--    écran. C'est tenable. `hexClaims.ts` ne l'est pas — son échec efface la
--    couche territoire des sept surfaces qui l'affichent —, donc son filtre part
--    AVEC ③, jamais avant.
--
-- 1. JOBS ÉCRIVANT (OU LISANT) PAR `h3index` / `user_id` SEUL, hors périmètre :
--    · supabase/functions/decay_job/index.ts:199 et :236 — neutralisation et
--      marquage. Protégés ICI par `hex_claims_guard_decay_trg` (§2), mais le
--      job devrait FILTRER sur `activity` plutôt que compter sur le garde-fou.
--      Résidu non couvert : une zone vélo dont l'échéance est LOINTAINE peut
--      être marquée « prévenue » par une passe course sur le même hexagone —
--      elle perdrait son propre avertissement (notification manquée, jamais un
--      territoire perdu).
--    · supabase/functions/digest_job/index.ts:280/:457/:526 — digest quotidien.
--    · le job `recompute_sectors` → `sector_snapshot` (0037), dont la clé
--      primaire est `sector_id` SEUL : le monde Bike écraserait le snapshot Run.
--      Cette table est lue par la carte (apps/mobile/src/features/map/) —
--      chantier tenu par un autre workflow, à traiter avec lui.
--    REFERMÉS LE 25/07/2026, à ne plus chercher ici : `season_close` lit et
--    écrit désormais PAR DISCIPLINE — le gel de `rank_cache` porte `.eq(
--    'activity')` (index.ts:124-135) et les DÉPARTAGES §13 remontent `activity`
--    sur `season_scores`, `runs` et `hex_claims` (index.ts:222-265) ;
--    `steal_push_job` lit la discipline rendue par la RPC et la porte jusqu'au
--    message (index.ts:284, :347, :660 — clé de dédup incluse).
-- 1 bis. LECTEURS CLIENTS — IL N'EN RESTE QU'UN, ET IL NE CRASHE PLUS : IL MENT.
--    · apps/mobile/src/features/map/hexClaims.ts:129-130 lit `hex_claims` SANS
--      `.eq('activity', …)`. Ce que ça produit EXACTEMENT, aujourd'hui :
--      — plus de CASSAGE. `territoryBuild.ts` range les cellules d'un même
--        groupe dans un `Set` avant `cellsToMultiPolygon` (commit 2b88711,
--        25/07/2026), donc « Duplicate input » ne peut plus lever et la couche
--        territoire ne tombe plus. La version précédente de ce bloc annonçait ce
--        crash : elle décrivait un défaut disparu.
--      — mais un MÉLANGE SILENCIEUX. Les deux lignes d'un même hexagone tombent
--        dans le même groupe, et les zones tenues UNIQUEMENT à vélo sont peintes
--        comme des zones de course : le joueur hybride verrait un territoire de
--        course qu'il n'a jamais couru, sur `useRealTerritories` — 8 appels,
--        7 surfaces distinctes (MapScreen natif + web, RoutePlannerMap,
--        TerritoryFranceMap, TerritoryWidgetCard, app/territoire,
--        app/performance, app/(tabs)/profil). Muet, donc plus difficile à
--        repérer qu'un écran cassé, et c'est exactement ce que la constitution
--        interdit : l'app ne ment jamais.
--      Ce n'est PAS un oubli, c'est un suspens ORDONNÉ (§0) : le filtre ne peut
--      pas être posé avant que la colonne existe, il part avec l'application de
--      cette migration. `features/map/` est tenu par un autre workflow, à qui
--      c'est signalé.
--    REFERMÉS LE 25/07/2026 : `useRealMissionCore.ts:115-120`,
--    `leagueBoard.ts:190-197` (vue `player_leaderboard`) et
--    `economy.ts:142-148` filtrent tous les trois la discipline.
-- 2. COMPTEURS VIE-ENTIÈRE `user_stats` (~60 colonnes « run-shaped »), et la
--    vue `specialty_leaderboard` (0069) qui les classe entre joueurs : une
--    sortie vélo y serait comptée comme une course. Mono-pot, non disciplinés.
-- 3. XP, FOULÉES, SÉRIES, BADGES, XP DE CREW : mono-pot assumé (progressions
--    personnelles, pas des rangs comparatifs). `packages/engine/src/badges.ts`
--    réutilise les bornes d'allure de la course : le badge « smart run » ne se
--    déclenchera jamais à vélo (défaut SÛR — rien n'est attribué à tort).
-- 4. PLAFONDS PARTAGÉS : `MAX_CLAIMS_PER_DAY` (1 200 zones/jour/compte) et
--    `INGEST_MAX_RUNS_PER_HOUR` (30) restent PAR COMPTE — un cycliste consomme
--    le quota du coureur. Idem pour le cap quotidien de points de relais
--    (`hex_co_captures_user_day_idx`). ARBITRAGE FONDATEUR non tranché ici,
--    volontairement : le statu quo est la seule position honnête tant que la
--    question n'est pas posée.
-- 5. RPC non disciplinées qui lisent `hex_claims` : `crew_overview` (0044/0046),
--    `crew_mission_inputs` (0049), `daily_zone_inputs` (0052/0053),
--    `crew_pings_feed`/`crew_ping_zone` (0051), `welcome_challenge_facts`
--    (0052), `habits_inputs` (0055 — une habitude vélo suggérerait un parcours
--    de course), vues `sector_holdings` (0061) et `sector_activity` (0040).
-- 6. OFFENSIVES DE CREW (0064) : une offensive n'a pas de discipline. Le
--    coefficient de contexte `crew_mission` s'appliquerait donc à une sortie
--    vélo dans une zone d'offensive pensée pour la course. Sans effet tant
--    qu'aucun vélo ne joue ; à trancher avec le produit, pas ici.
