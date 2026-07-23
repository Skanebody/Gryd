-- GRYD — 0066 : OUVRIR UNE VILLE (la voie serveur, idempotente).
--
-- ═══ POURQUOI ═══════════════════════════════════════════════════════════════
-- Demande fondateur : « dans la création de crew on doit pouvoir choisir
-- n'importe quelle ville ». Le référentiel réel (GeoNames, 7 870 villes
-- d'Europe) est embarqué depuis le lot fondation. Il manquait la VOIE : une
-- ville n'existe pour le jeu que si `city_zones` porte une ligne, et
-- l'écriture de `city_zones` est révoquée à `anon`/`authenticated`
-- (0003_rls.sql l.128). Sans cette voie, choisir Zurich revenait à choisir un
-- id qui n'existe nulle part — `create_crew` répondait `bad_city` (0042 l.72).
--
-- ⚠ LE PIÈGE QUE CETTE MIGRATION FERME VRAIMENT : insérer la zone NE SUFFIT
-- PAS. `claim_hexes` cherche la saison ACTIVE de la ville (0005 l.69-73) ; sans
-- saison, `v_season_id` reste NULL, `season_scores` n'est jamais incrémenté, et
-- le classement de cette ville ne se peuple JAMAIS. Le seed 0004 ne crée des
-- saisons que pour les zones seedées. Ouvrir une ville, c'est donc DEUX
-- écritures indissociables — c'est pourquoi elles vivent dans UNE fonction.
--
-- ═══ CE QUE CETTE MIGRATION N'EST PAS ═══════════════════════════════════════
-- Elle N'OUVRE AUCUNE VILLE. Elle pose la voie ; une ville se provisionne quand
-- quelqu'un la choisit vraiment. Provisionner 7 870 villes vides serait
-- exactement la faute qu'AMENDEMENT-35 §6 a fait rétracter : un monde peuplé de
-- lieux où personne ne court, présenté comme un monde de jeu.
--
-- ═══ HONNÊTETÉ DE LA DONNÉE ÉCRITE ══════════════════════════════════════════
-- · `status` est posé à 'wild' et JAMAIS choisi par l'appelant. 'wild' =
--   ABSENCE de densité (game-rules: ZONE_DENSITY_THRESHOLDS.wild = 0 coureur,
--   0 crew) — c'est la seule valeur VRAIE pour une ville où personne n'a encore
--   couru. Écrire 'active' (mode Guerre) sur une ville vide serait affirmer une
--   population qui n'existe pas.
-- · La géométrie n'est PAS fabriquée ici : elle est FOURNIE par l'appelant
--   serveur, qui la dérive du référentiel (disque de rayon
--   `CITY_DISC_RADIUS_M`, game-rules — approximation DÉCLARÉE d'aire de jeu).
--   Aucun rayon, aucune durée de saison n'est écrite en dur dans ce fichier :
--   `p_season_weeks` est PASSÉ (game-rules: SEASON_DURATION_WEEKS).
-- · `on conflict do nothing` sur `city_zones` : une ville déjà provisionnée
--   n'est JAMAIS réécrite. Paris et Lille gardent le contour réel importé de
--   geo.api.gouv.fr par 0033 — un disque ne les écrase pas.
--
-- ═══ GARDE-FOU D'OUVERTURE ══════════════════════════════════════════════════
-- Un compte ne peut pas ouvrir un nombre illimité de villes. Le plafond et sa
-- fenêtre sont des CONSTANTES DE JEU (game-rules : CITY_OPEN_LIMIT_PER_USER,
-- CITY_OPEN_LIMIT_WINDOW_H) et sont PASSÉS à la fonction — aucun nombre n'est
-- écrit en dur ici, exactement comme `p_season_weeks`. Ce que le plafond
-- protège n'est pas la vérité de la donnée (une ville ouverte naît vide et se
-- dit vide) mais le BRUIT : des centaines de villes provisionnées où personne
-- ne courra jamais. Il ne compte QUE les ouvertures réelles : rouvrir une ville
-- déjà ouverte n'écrit rien, donc ne consomme rien. Et il REFUSE en le disant
-- (`open_quota_reached`) — jamais un faux succès.
--
-- ═══ SÉCURITÉ ═══════════════════════════════════════════════════════════════
-- `security definer`, `revoke all ... from public, anon, authenticated` (PUBLIC
-- est hérité par tous les rôles : le révoquer explicitement est obligatoire),
-- `grant execute ... to service_role`. Le chemin d'appel réel est l'Edge
-- Function `open_city`, qui valide l'id contre le référentiel EMBARQUÉ avant
-- d'arriver ici — le client ne fournit ni nom, ni coordonnées, ni géométrie.
--
-- Rejouable sans effet de bord (toutes les écritures sont conditionnelles).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. BOÎTE ENGLOBANTE DES ZONES — la condition de SCALABILITÉ de l'ouverture
-- ════════════════════════════════════════════════════════════════════════════
-- `ingest_run.deriveCityId` rattachait la course à une ville en CHARGEANT
-- TOUTES les zones actives puis en faisant le point-in-polygon en TypeScript.
-- À deux villes c'est gratuit. Le jour où l'ouverture marche, c'est un scan
-- complet de `city_zones` (polygones de 65 sommets) À CHAQUE COURSE — la voie
-- d'ouverture se paierait en latence d'ingestion pour tout le monde.
--
-- On matérialise donc la boîte englobante de chaque zone en colonnes simples et
-- indexées : le serveur PRÉ-FILTRE en SQL (typiquement 0 ou 1 ligne) et ne fait
-- le test exact que sur les candidates. Le point-in-polygon EXACT reste dans le
-- moteur pur (`_shared/engine/hexing.ts`), déjà testé — on n'a pas déplacé de
-- règle de jeu en SQL, seulement un filtre grossier.
--
-- ⚠ LIMITE ASSUMÉE : une boîte englobante est fausse pour une zone à cheval sur
-- l'antiméridien (±180°). Le référentiel est borné à l'Europe (longitudes
-- -31°…+60°, cf. EU_CITIES_SOURCE.eastLimitDeg) : le cas ne se présente pas.
-- Si le référentiel s'étend un jour, ce pré-filtre devra être revu — c'est écrit
-- ici pour que la relecture le voie plutôt que de le découvrir en production.

alter table public.city_zones add column if not exists min_lat double precision;
alter table public.city_zones add column if not exists max_lat double precision;
alter table public.city_zones add column if not exists min_lng double precision;
alter table public.city_zones add column if not exists max_lng double precision;

comment on column public.city_zones.min_lat is
  'Boîte englobante DÉRIVÉE de geojson (trigger city_zones_bbox). Pré-filtre de rattachement uniquement — le test in/out exact reste le point-in-polygon du moteur.';

-- Extracteur de positions GeoJSON, quelle que soit la profondeur d'imbrication
-- (Polygon = 3 niveaux, MultiPolygon = 4). Récursif plutôt que spécialisé par
-- `type` : une géométrie mal typée mais bien formée reste mesurable, et une
-- géométrie vide rend simplement zéro ligne (la contrainte de non-dégénérescence
-- de `provision_city` la rejettera ensuite, plutôt qu'une boîte silencieusement
-- fausse).
create or replace function public.geojson_coord_points(p_coords jsonb)
returns table (lng double precision, lat double precision)
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  v_child jsonb;
begin
  if jsonb_typeof(p_coords) <> 'array' then
    return;
  end if;

  -- Feuille : une POSITION GeoJSON est [lng, lat] (une 3e valeur d'altitude est
  -- permise par la spec et volontairement ignorée).
  if jsonb_array_length(p_coords) >= 2
     and jsonb_typeof(p_coords -> 0) = 'number'
     and jsonb_typeof(p_coords -> 1) = 'number' then
    lng := (p_coords ->> 0)::double precision;
    lat := (p_coords ->> 1)::double precision;
    return next;
    return;
  end if;

  for v_child in select value from jsonb_array_elements(p_coords) loop
    return query select * from public.geojson_coord_points(v_child);
  end loop;
end;
$$;

comment on function public.geojson_coord_points(jsonb) is
  'Positions [lng, lat] d''un tableau de coordonnées GeoJSON, à toute profondeur. Helper de la boîte englobante des city_zones.';

create or replace function public.city_zones_sync_bbox()
returns trigger
language plpgsql
-- `security definer` : le trigger doit pouvoir appeler le helper quel que soit
-- le rôle qui écrit dans city_zones, sans accorder à ce rôle un EXECUTE direct
-- sur geojson_coord_points.
security definer
set search_path = public, pg_temp
as $$
begin
  select min(p.lat), max(p.lat), min(p.lng), max(p.lng)
    into new.min_lat, new.max_lat, new.min_lng, new.max_lng
  from public.geojson_coord_points(new.geojson -> 'coordinates') p;
  return new;
end;
$$;

drop trigger if exists city_zones_bbox on public.city_zones;
create trigger city_zones_bbox
  before insert or update on public.city_zones
  for each row execute function public.city_zones_sync_bbox();

-- Rattrapage des zones déjà en base (Paris + Lille, contours réels de 0033) :
-- l'UPDATE no-op déclenche le trigger et remplit leur boîte. Sans lui, elles
-- seraient INVISIBLES au pré-filtre — le rattachement s'arrêterait pour les deux
-- seules villes qui tournent aujourd'hui. Rejouable (idempotent).
update public.city_zones set geojson = geojson;

-- Après rattrapage, la boîte ne peut plus manquer : on le rend structurel. Une
-- colonne NULLable ici serait un piège — le pré-filtre `min_lat <= x` EXCLUT
-- silencieusement les lignes NULL, donc une zone sans boîte cesserait d'exister
-- pour le rattachement sans qu'aucune erreur ne soit levée.
alter table public.city_zones alter column min_lat set not null;
alter table public.city_zones alter column max_lat set not null;
alter table public.city_zones alter column min_lng set not null;
alter table public.city_zones alter column max_lng set not null;

create index if not exists city_zones_bbox_idx
  on public.city_zones (min_lat, max_lat, min_lng, max_lng);

-- ════════════════════════════════════════════════════════════════════════════
-- 1 bis. TRAÇABILITÉ DE L'OUVERTURE — la condition du garde-fou
-- ════════════════════════════════════════════════════════════════════════════
-- Sans savoir QUI a ouvert QUOI, aucun plafond n'est mesurable. Ces deux
-- colonnes ne portent AUCUNE donnée de jeu : ni score, ni appartenance, ni
-- « fondateur de la ville ». Elles ne sont pas non plus rendues à l'écran — les
-- exposer inventerait un statut que le jeu n'accorde pas.
--
-- Volontairement SANS clé étrangère vers `auth.users` : la suppression de compte
-- (Edge Function delete_account) ne doit pas buter sur une ville ouverte, et la
-- ville, elle, reste ouverte pour ceux qui y courent. Une valeur orpheline ici
-- ne fausse rien : elle ne sert qu'à compter une fenêtre glissante.
-- Les zones antérieures (Paris, Lille — seed 0004/0033) gardent NULL : personne
-- ne les a « ouvertes » par cette voie, et le prétendre serait faux.
alter table public.city_zones add column if not exists opened_by uuid;
alter table public.city_zones add column if not exists opened_at timestamptz;

comment on column public.city_zones.opened_by is
  'Compte ayant OUVERT cette ville via provision_city (NULL pour les zones seedées). Sert uniquement au plafond d''ouverture — aucun statut de jeu.';

-- ⚠ VISIBILITÉ, DITE PLUTÔT QUE SUPPOSÉE : `city_zones` est en lecture publique
-- (0003_rls.sql, policy `city_zones_select_all`). Ces deux colonnes le sont donc
-- aussi. C'est un `auth.uid()` opaque, du même ordre que le `user_id` déjà rendu
-- par la vue `player_leaderboard` — aucune donnée personnelle nouvelle n'est
-- exposée. Postgres ne permet pas de révoquer un privilège de COLONNE quand le
-- SELECT est accordé au niveau table : le cacher exigerait de refondre les
-- grants de `city_zones`, ce que ce lot ne fait pas. C'est écrit ici plutôt que
-- prétendu privé.

-- Index de la seule requête qui les lit : « combien ce compte a-t-il ouvert
-- depuis <date> ? ». Partiel : les zones seedées (opened_by NULL) n'y entrent pas.
create index if not exists city_zones_opened_by_idx
  on public.city_zones (opened_by, opened_at) where opened_by is not null;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. PROVISION D'UNE VILLE — zone + saison, indissociables, idempotent
-- ════════════════════════════════════════════════════════════════════════════
-- Filet pour une base de dev où une version antérieure de CE fichier (signature
-- à 4 arguments, sans plafond) aurait déjà été jouée : `create or replace` ne
-- remplace pas une signature différente, il en créerait une SECONDE — et un
-- appel non qualifié deviendrait ambigu. 0066 n'est pas appliquée en production,
-- ce `drop if exists` est donc un no-op là où ça compte.
drop function if exists public.provision_city(text, text, jsonb, integer);

create or replace function public.provision_city(
  p_city_id      text,
  p_name         text,
  p_geojson      jsonb,
  p_season_weeks integer,
  -- Compte à l'origine de l'ouverture (NULL = appel de service sans porteur :
  -- il ne consomme alors aucun quota et n'en est pas soumis).
  p_opened_by    uuid    default null,
  -- Plafond et fenêtre : game-rules (CITY_OPEN_LIMIT_PER_USER / _WINDOW_H).
  -- NULL ou <= 0 = pas de plafond appliqué, et c'est un choix de l'appelant,
  -- pas un défaut caché de ce fichier.
  p_open_limit   integer default null,
  p_window_hours integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_city_id        text;
  v_name           text;
  v_min_lat        double precision;
  v_max_lat        double precision;
  v_min_lng        double precision;
  v_max_lng        double precision;
  v_rows           integer;
  v_zone_created   boolean := false;
  v_season_created boolean := false;
  v_season_id      uuid;
  v_status         text;
  v_zone_name      text;
  v_already        boolean;
  v_opened_recent  integer;
begin
  -- ── Forme de l'identifiant ────────────────────────────────────────────────
  -- Deux espaces d'identifiants cohabitent par construction : les villes de
  -- démarrage ('paris', 'lille') et le `geonameid` GeoNames en chaîne. Le jeu de
  -- caractères est volontairement étroit : `city_id` est la CLÉ DE HACHAGE du
  -- tirage de la Zone du Jour (0052 l.62-66) et voyage dans des filtres
  -- PostgREST — un id exotique n'a rien à faire là.
  v_city_id := btrim(coalesce(p_city_id, ''));
  if v_city_id !~ '^[A-Za-z0-9_-]{1,64}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_city_id');
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;

  if p_season_weeks is null or p_season_weeks <= 0 then
    -- Aucune durée par défaut ici : la durée de saison est une CONSTANTE DE JEU
    -- (game-rules: SEASON_DURATION_WEEKS) et doit venir de son unique source.
    return jsonb_build_object('ok', false, 'reason', 'bad_season_weeks');
  end if;

  -- ── Forme de la géométrie ─────────────────────────────────────────────────
  if p_geojson is null
     or jsonb_typeof(p_geojson) <> 'object'
     or coalesce(p_geojson ->> 'type', '') not in ('Polygon', 'MultiPolygon')
     or jsonb_typeof(p_geojson -> 'coordinates') <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'bad_geometry');
  end if;

  select min(p.lat), max(p.lat), min(p.lng), max(p.lng)
    into v_min_lat, v_max_lat, v_min_lng, v_max_lng
  from public.geojson_coord_points(p_geojson -> 'coordinates') p;

  -- Une aire de jeu DÉGÉNÉRÉE (un point, une ligne, ou hors du globe) ne se
  -- rattache à rien : mieux vaut refuser que d'écrire une zone impossible.
  if v_min_lat is null
     or v_min_lat >= v_max_lat or v_min_lng >= v_max_lng
     or v_min_lat < -90 or v_max_lat > 90
     or v_min_lng < -180 or v_max_lng > 180 then
    return jsonb_build_object('ok', false, 'reason', 'bad_geometry');
  end if;

  -- ── Garde-fou d'ouverture ─────────────────────────────────────────────────
  -- Il ne s'applique QU'À UNE OUVERTURE RÉELLE : rouvrir une ville déjà ouverte
  -- n'écrit rien (on conflict do nothing), donc ne doit rien coûter — sinon un
  -- appel idempotent finirait par être refusé, ce qui serait un mensonge sur la
  -- raison du refus.
  select exists (select 1 from public.city_zones z where z.city_id = v_city_id)
    into v_already;

  if not v_already
     and p_opened_by is not null
     and p_open_limit is not null and p_open_limit > 0
     and p_window_hours is not null and p_window_hours > 0 then
    select count(*)::integer into v_opened_recent
    from public.city_zones z
    where z.opened_by = p_opened_by
      and z.opened_at is not null
      and z.opened_at > now() - make_interval(hours => p_window_hours);

    if v_opened_recent >= p_open_limit then
      -- Refus NOMMÉ, avec le plafond qui l'a produit : l'appelant peut le dire
      -- à l'utilisateur sans le deviner ni le retaper.
      return jsonb_build_object(
        'ok', false,
        'reason', 'open_quota_reached',
        'limit', p_open_limit,
        'windowHours', p_window_hours
      );
    end if;
  end if;

  -- ── Zone ──────────────────────────────────────────────────────────────────
  -- 'wild' n'est PAS un défaut paresseux : c'est la mesure vraie d'une ville où
  -- personne n'a encore couru (game-rules: ZONE_DENSITY_THRESHOLDS.wild). Le
  -- statut n'est pas paramétrable — un appelant ne décrète pas une densité.
  insert into public.city_zones (city_id, name, geojson, status, opened_by, opened_at)
  values (v_city_id, v_name, p_geojson, 'wild', p_opened_by, now())
  on conflict (city_id) do nothing;

  get diagnostics v_rows = row_count;
  v_zone_created := coalesce(v_rows, 0) > 0;

  -- Relecture : on rend ce qui est RÉELLEMENT en base, jamais ce qu'on croit
  -- avoir écrit (une ville déjà ouverte garde son nom et son contour d'origine).
  select z.status, z.name into v_status, v_zone_name
  from public.city_zones z where z.city_id = v_city_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'reason', 'zone_missing');
  end if;

  -- ── Saison ────────────────────────────────────────────────────────────────
  -- SANS ELLE, RIEN NE COMPTE. `claim_hexes` ne remplit `season_scores` que s'il
  -- trouve une saison active pour la ville (0005 l.69-73). L'index partiel
  -- `seasons_one_active_per_city` (0002 l.74-75) garantit l'unicité ; le
  -- `where not exists` évite l'erreur plutôt que de la rattraper.
  select s.id into v_season_id
  from public.seasons s
  where s.city_id = v_city_id and s.status = 'active'
  limit 1;

  if v_season_id is null then
    insert into public.seasons (city_id, starts_at, ends_at, status)
    values (
      v_city_id,
      now(),
      now() + make_interval(weeks => p_season_weeks), -- game-rules: SEASON_DURATION_WEEKS (passé, jamais écrit ici)
      'active'
    )
    on conflict do nothing
    returning id into v_season_id;
    v_season_created := v_season_id is not null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'cityId', v_city_id,
    'name', v_zone_name,
    'status', v_status,
    'zoneCreated', v_zone_created,
    'seasonCreated', v_season_created,
    'seasonId', v_season_id
  );
end;
$$;

comment on function public.provision_city(text, text, jsonb, integer, uuid, integer, integer) is
  'Ouvre UNE ville : city_zones (status wild) + saison active, idempotent. N''écrase jamais une zone existante. Plafond d''ouverture par compte PASSÉ (game-rules), jamais écrit ici. service_role uniquement.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PÉRIMÈTRE D'EXÉCUTION
-- ════════════════════════════════════════════════════════════════════════════
-- `public` d'abord : tout rôle en hérite, le révoquer après coup ne suffirait
-- pas. Aucun rôle client n'appelle ces fonctions — la voie d'appel est l'Edge
-- Function `open_city`, en service-role.
revoke all on function public.provision_city(text, text, jsonb, integer, uuid, integer, integer)
  from public, anon, authenticated;
revoke all on function public.geojson_coord_points(jsonb)  from public, anon, authenticated;
revoke all on function public.city_zones_sync_bbox()       from public, anon, authenticated;

grant execute on function public.provision_city(text, text, jsonb, integer, uuid, integer, integer)
  to service_role;
