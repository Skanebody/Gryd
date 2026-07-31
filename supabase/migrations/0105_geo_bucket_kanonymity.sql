-- 0105_geo_bucket_kanonymity.sql
-- GRYD — Le k-anonymat passe de la COMMUNE à une GRILLE UNIVERSELLE.
--
-- ═══ CE QUE `0104` A RÉSOLU, ET CE QU'IL A LAISSÉ ═══════════════════════════
-- `0104` a posé la bonne règle — un territoire ne se publie qu'avec 3
-- propriétaires distincts autour — mais il l'a indexée sur `city_id`, donc sur
-- le référentiel européen des communes. Conséquence : hors d'Europe, `city_id`
-- est nul, le seuil n'est jamais atteignable, et RIEN ne se publie JAMAIS.
--
-- C'était sûr, et c'était définitif. Un club de coureurs à Dakar ou à Montréal
-- pouvait devenir aussi dense qu'un arrondissement parisien sans jamais voir la
-- carte s'animer — non parce qu'ils sont trop peu, mais parce qu'aucune commune
-- ne les nomme. La protection devenait une frontière.
--
-- ═══ LA GRILLE ═════════════════════════════════════════════════════════════
-- On remplace la maille ADMINISTRATIVE par une maille GÉOGRAPHIQUE : un carreau
-- de 0,1° (~11 km en latitude), calculé sur le centroïde du territoire. Elle
-- fonctionne partout, sans référentiel, sans import, sans exception.
--
-- ⚠️ LE CARREAU SE RESSERRE VERS LES PÔLES (0,1° de longitude vaut ~11 km à
-- l'équateur, ~5 km à 60°). C'est ACCEPTABLE, et même souhaitable : un carreau
-- plus petit exige la même densité sur moins de surface, donc le k-anonymat y
-- devient plus STRICT, jamais plus lâche. L'erreur irait dans le mauvais sens si
-- c'était l'inverse.
--
-- ⚠️ LE CENTROÏDE EST UNE MOYENNE DES SOMMETS, pas le centre de masse exact.
-- Sans PostGIS, c'est l'approximation honnête et suffisante : on cherche à
-- ranger un territoire dans un carreau de 11 km, pas à le mesurer. Un polygone
-- de course fait quelques centaines de mètres — l'écart entre les deux
-- définitions est de plusieurs ordres de grandeur sous la maille.
--
-- ═══ CE QUI NE CHANGE PAS ══════════════════════════════════════════════════
-- Le seuil (3 propriétaires distincts, même discipline), la publication
-- différée, le réglage de partage du propriétaire : identiques. Seule la
-- définition du « autour » change — et elle cesse d'exclure le monde.
--
-- ADDITIVE. Rollback = restaurer la vue de 0104.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Le carreau, déduit de la géométrie (aucune donnée ajoutée)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.gryd_geo_bucket(p_geom jsonb)
returns text
language sql
immutable
parallel safe
as $$
  -- GeoJSON Polygon : `coordinates[0]` est l'anneau extérieur, chaque point
  -- étant [lng, lat] — l'ordre GeoJSON, pas l'ordre humain. S'y tromper
  -- rangerait Paris quelque part en Somalie.
  select case
    when p_geom is null or p_geom->'coordinates'->0 is null then null
    else (
      select floor(avg((pt->>1)::double precision) / 0.1)::text
             || ':' ||
             floor(avg((pt->>0)::double precision) / 0.1)::text
      from jsonb_array_elements(p_geom->'coordinates'->0) pt
    )
  end
$$;

comment on function public.gryd_geo_bucket(jsonb) is
  'Carreau de 0,1° (~11 km) contenant le centroïde d un polygone GeoJSON. Maille du k-anonymat de publication : universelle, sans référentiel. Le carreau se resserre vers les pôles, ce qui rend le seuil PLUS strict — jamais plus lâche.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. La vue publique, meme regle, maille universelle
-- ════════════════════════════════════════════════════════════════════════════
create or replace view public.public_territories as
select
  t.id,
  t.activity,
  t.owner_type,
  t.owner_id,
  t.city_id,
  t.state,
  t.defense_level,
  t.area_m2,
  t.geometry_generalized,
  date_trunc('hour'::text, t.controlled_since) as controlled_since_hour
from public.territories t
where t.publish_after <= now()
  and t.geometry_generalized is not null
  and public.territory_owner_shares_map(t.owner_type, t.owner_id)
  -- k-ANONYMAT UNIVERSEL : au moins 3 propriétaires DISTINCTS dans le même
  -- carreau de ~11 km et la même discipline. Fonctionne à Dakar comme à Lille.
  and (
    select count(distinct o.owner_id)
    from public.territories o
    where o.activity = t.activity
      and o.geometry_generalized is not null
      and o.publish_after <= now()
      and public.gryd_geo_bucket(o.geometry_generalized)
          = public.gryd_geo_bucket(t.geometry_generalized)
  ) >= 3;

comment on view public.public_territories is
  'Territoires visibles par AUTRUI. Trois conditions cumulées : publication différée, réglage de partage du propriétaire, et k-anonymat — au moins 3 propriétaires distincts dans le même carreau de ~11 km, même discipline (TERRITORY_PUBLISH_MIN_DISTINCT_OWNERS, game-rules.ts). Leçon Strava 2018 : à faible densité, une zone NOMMÉE révèle une personne et un lieu. Ne bloque AUCUNE capture — le monde entier est jouable, seule la visibilité par les autres attend la densité. Depuis 0105 la maille est géographique et non administrative : le monde peut se publier quand il se peuple.';
