-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0151 : UNE ARÈNE SE DÉRIVE D'UNE VRAIE GÉOGRAPHIE, OU N'EXISTE PAS.
--
-- LE DÉFAUT CORRIGÉ. `challenge_arenas_2026` est VIDE en production (vérifié le
-- 10/09/2026 : 0 ligne, 0 défi). L'écran des défis affiche donc pour toujours
-- « Aucune arène publiée », et la tuile « Défis de crew » est un cul-de-sac.
-- La seule voie de publication, `configure_challenge_arena_2026` (0122:112),
-- attend TROIS polygones GeoJSON déjà écrits à la main : personne, y compris le
-- fondateur, n'a de quoi les produire. Un moteur complet, en prod, inerte.
--
-- CE QUE CETTE MIGRATION N'EST PAS. Elle N'OUVRE AUCUNE ARÈNE et n'insère
-- AUCUNE géométrie — même règle qu'`open_city` (0066) : on pose la VOIE, une
-- arène se publie quand quelqu'un décide vraiment de la publier. Un catalogue
-- vide reste une indisponibilité réelle ; jamais des carrés fictifs.
--
-- ─── D'OÙ VIENT LA GÉOGRAPHIE, ET DE NULLE PART AILLEURS ───────────────────
-- Deux sources, dans cet ordre, toutes deux RÉELLES et déclarées dans la
-- réponse (`source`) :
--   1. `ownership_clusters` — les possessions RÉELLEMENT capturées
--      (`ownership_2026`) dans la commune, groupées en trois par
--      `ST_ClusterKMeans`. Les limites sont l'enveloppe convexe de ce que des
--      gens ont vraiment couru, élargie du seuil de trace du cahier pour
--      laisser de la place, puis découpée sur l'emprise communale. C'est la
--      source à privilégier : les trois secteurs sont là où l'on court déjà,
--      donc « comparablement accessibles » (§6.5) a une chance d'être vrai.
--   2. `city_zone_split` — à défaut de présence, le contour ADMINISTRATIF réel
--      de la commune (`city_zones`, importé de geo.api.gouv.fr par 0033),
--      coupé en trois bandes d'ouest en est. Les limites extérieures sont donc
--      réelles ; les deux coupes intérieures sont un choix d'exploitation, et
--      la réponse le dit (`warnings`).
-- Aucune troisième source. `fr_communes` ne porte qu'un CENTRE (lat/lng) :
-- dessiner un disque autour d'un point et l'appeler « secteur » serait
-- exactement le carré fictif que le contrat interdit. Sans possession et sans
-- contour, la fonction REFUSE (`no_real_geography`) — un refus qui se dit vaut
-- mieux qu'une arène inventée.
--
-- ─── CE QUI EST MESURÉ EST CE QUI COMPTE ───────────────────────────────────
-- Un secteur n'est pas jugé sur son aire brute mais sur sa part JOUABLE :
-- `challenge_sector_metres_2026` (0150) soustrait `no_capture_zones` de la
-- trace avant de la couper au secteur, donc un mètre couru dans une zone
-- interdite ne rapporte rien. La portée minimale du cahier et le rapport
-- d'aires sont donc calculés sur `secteur − zones interdites` (constat réel :
-- 26 zones interdites en production, et un secteur de 3,7 km² essayé à Rouen en
-- avait 25 % à l'intérieur). Sans cela, on publierait une arène dont un secteur
-- est en grande partie inerte, sans que personne le voie.
--
-- ─── CE QUE LA MACHINE NE DÉCIDE PAS ───────────────────────────────────────
-- Elle ne décide NI l'accessibilité (§6.2 : « trois secteurs accessibles »), NI
-- les noms. `publish_challenge_arena_2026` exige donc, de la main d'un humain :
-- le fuseau, le titre, TROIS titres de secteurs réels, la source de la revue
-- d'accès et sa date. Sans titres, elle refuse (`sector_titles_required`) : un
-- « Secteur 1 » fabriqué serait un nom de lieu inventé. La géométrie proposée
-- passe ensuite par `configure_challenge_arena_2026`, qui revalide tout.
--
-- ─── JOURNAL ────────────────────────────────────────────────────────────────
-- `challenge_arena_publications_2026` garde, pour chaque arène publiée : la
-- commune, la source géographique, la proposition COMPLÈTE (aires, portées,
-- possessions comptées, chevauchements interdits, avertissements) et l'opérateur
-- déclaré. Une arène est immuable ; son retrait (`retire_challenge_arena_2026`)
-- est journalisé aussi. Sans ce journal, personne ne pourrait dire six mois
-- plus tard POURQUOI ces trois secteurs-là.
--
-- ⚠️ PGlite n'a pas PostGIS : le test du gate prouve les refus non spatiaux,
-- les droits, le journal, le retrait, et surtout qu'AUCUNE arène n'est créée
-- par cette migration. Le découpage lui-même n'est pas exécuté sur ce poste.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.challenge_arena_publications_2026 (
  id bigint generated always as identity primary key,
  arena_id text not null references public.challenge_arenas_2026(id),
  -- Nuls pour un RETRAIT dont la publication n'est pas passée par cette voie :
  -- « unknown » écrit dans une colonne serait une donnée inventée.
  commune_insee text,
  source text check(source is null or source in('ownership_clusters','city_zone_split')),
  activity text not null check(activity in('run','bike')),
  proposal jsonb not null,
  operator text not null check(length(btrim(operator))>0),
  action text not null check(action in('published','retired')),
  recorded_at timestamptz not null default now(),
  check(action<>'published' or (commune_insee is not null and source is not null))
);
create index challenge_arena_publications_arena_2026 on public.challenge_arena_publications_2026(arena_id,recorded_at desc);
alter table public.challenge_arena_publications_2026 enable row level security;
revoke all on public.challenge_arena_publications_2026 from public,anon,authenticated;
grant all on public.challenge_arena_publications_2026 to service_role;

-- Trois secteurs candidats, dérivés d'une géographie réelle. Aucune écriture :
-- appelable à blanc autant de fois qu'on veut avant de décider quoi que ce soit.
create function public.propose_challenge_arenas_2026(p_arena_id text,p_commune_insee text,p_activity text,
  p_search_radius_m double precision,p_pad_m double precision,p_min_span_m double precision,p_min_possessions integer)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare r public.challenge_rules_2026; commune_name text; centre_lat double precision; centre_lng double precision;
  footprint jsonb; footprint_id text; footprint_name text; footprint_communes integer; source text; candidates jsonb; candidate jsonb;
  emitted jsonb; shape jsonb; surface double precision; countable double precision; span double precision; barred double precision;
  owned integer; sectors jsonb:='[]'; warnings jsonb:='[]'; surfaces double precision[]:='{}'; position_key text;
begin
  select * into strict r from public.challenge_rules_2026;
  if nullif(btrim(coalesce(p_arena_id,'')),'') is null or p_activity not in('run','bike') then raise exception 'invalid_arena_request'; end if;
  if p_search_radius_m is null or p_search_radius_m<=0 or p_pad_m is null or p_pad_m<=0
    or p_min_span_m is null or p_min_span_m<=0 or p_min_possessions is null or p_min_possessions<r.sectors then raise exception 'invalid_parameters'; end if;
  select nom,lat,lng into commune_name,centre_lat,centre_lng from public.fr_communes where insee=p_commune_insee;
  if commune_name is null then raise exception 'unknown_commune'; end if;

  -- Emprise : le contour administratif RÉEL s'il existe, sinon rien. Le rayon
  -- ne sert qu'à borner la RECHERCHE de possessions, jamais à dessiner : quand
  -- il n'y a pas de contour, aucun secteur n'est coupé sur le disque.
  execute $q$ select ST_AsGeoJSON(z.g)::jsonb,z.city_id,z.name from
    (select ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326) g,city_id,name from public.city_zones) z
    where ST_IsValid(z.g) and ST_Contains(z.g,ST_SetSRID(ST_MakePoint($1,$2),4326)) order by ST_Area(z.g) limit 1 $q$
    into footprint,footprint_id,footprint_name using centre_lng,centre_lat;

  execute $q$ with area as (select case when $1::jsonb is null
      then ST_Buffer(ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,$4)::geometry
      else ST_SetSRID(ST_GeomFromGeoJSON($1),4326) end g)
    select count(*)::integer from public.ownership_2026 o,area where o.activity=$5 and ST_Intersects(o.geometry,area.g) $q$
    into owned using footprint,centre_lng,centre_lat,p_search_radius_m,p_activity;

  if owned>=p_min_possessions then
    source:='ownership_clusters';
    -- Trois groupes de possessions réelles, ordonnés d'ouest en est : cet ordre
    -- EST l'ordre de repli annoncé avant inscription (§6.2). Le nombre de
    -- groupes est écrit dans la requête parce que ST_ClusterKMeans le lit comme
    -- une constante de fenêtre — il vient de challenge_rules_2026, pas du client.
    execute format($q$ with area as (select case when $1::jsonb is null
        then ST_Buffer(ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,$4)::geometry
        else ST_SetSRID(ST_GeomFromGeoJSON($1),4326) end g),
      owned as (select o.geometry g from public.ownership_2026 o,area where o.activity=$5 and ST_Intersects(o.geometry,area.g)),
      clustered as (select g,ST_ClusterKMeans(ST_Centroid(g),%s) over () k from owned),
      hulls as (select k,count(*)::integer n,ST_ConvexHull(ST_Collect(g)) g from clustered group by k),
      -- Le découpage sur l'emprise n'a lieu QUE si l'emprise est réelle. Sans
      -- contour administratif, `area` est un disque de rayon de recherche
      -- autour du centre communal : y couper les secteurs donnerait à chacun un
      -- bord en ARC DE CERCLE inventé. Le contour du secteur reste alors
      -- entièrement dérivé de ce que des gens ont couru — enveloppe convexe
      -- des possessions, élargie du seuil de trace — et rien d'autre.
      grown as (select h.n,ST_Multi(ST_CollectionExtract(ST_MakeValid(
          case when $1::jsonb is null then ST_Buffer(h.g::geography,$6)::geometry
            else ST_Intersection(ST_Buffer(h.g::geography,$6)::geometry,area.g) end),3)) g
        from hulls h,area)
      select jsonb_agg(jsonb_build_object('possessions',n,'geometry',ST_AsGeoJSON(g)::jsonb) order by ST_XMin(g),ST_YMin(g))
      from grown where not ST_IsEmpty(g) $q$,r.sectors::integer)
      into candidates using footprint,centre_lng,centre_lat,p_search_radius_m,p_activity,p_pad_m;
  elsif footprint is not null then
    source:='city_zone_split';
    -- Trois bandes d'un contour administratif réel : les limites extérieures
    -- sont celles de la commune, les deux coupes sont un choix d'exploitation.
    execute format($q$ with area as (select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) g),
      bands as (select n,ST_MakeEnvelope(ST_XMin(area.g)+(ST_XMax(area.g)-ST_XMin(area.g))*(n-1)::float8/%1$s::float8,ST_YMin(area.g),
          ST_XMin(area.g)+(ST_XMax(area.g)-ST_XMin(area.g))*n::float8/%1$s::float8,ST_YMax(area.g),4326) g
        from area,generate_series(1,%1$s) n),
      cut as (select b.n,ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Intersection(area.g,b.g)),3)) g from bands b,area)
      select jsonb_agg(jsonb_build_object('possessions',0,'geometry',ST_AsGeoJSON(g)::jsonb) order by n)
      from cut where not ST_IsEmpty(g) $q$,r.sectors::integer)
      into candidates using footprint;
    -- `city_zones` ne contient PAS un contour par commune : en production, les
    -- deux emprises ouvertes sont des MÉTROPOLES (Paris 763 km², Lille 674 km²,
    -- constat du 10/09/2026 en lecture seule). Découper « la commune » de
    -- Roubaix rendrait donc trois bandes de toute la métropole lilloise. Le
    -- nombre de communes du référentiel dont le centre tombe dans l'emprise est
    -- COMPTÉ et rapporté : l'opérateur voit qu'il nomme un territoire plus
    -- large que la commune demandée, au lieu de le découvrir sur la carte.
    execute $q$ select count(*)::integer from public.fr_communes f
      where ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),ST_SetSRID(ST_MakePoint(f.lng,f.lat),4326)) $q$
      into footprint_communes using footprint;
    if coalesce(footprint_communes,0)>1 then warnings:=warnings||jsonb_build_array('footprint_wider_than_commune:'||footprint_communes); end if;
  else
    -- Ni possession réelle, ni contour réel : il n'y a rien à découper, et un
    -- disque autour d'un centre communal serait exactement le carré fictif
    -- que le contrat interdit.
    raise exception 'no_real_geography';
  end if;

  if candidates is null or jsonb_array_length(candidates)<>r.sectors then raise exception 'no_real_geography'; end if;

  for candidate in select value from jsonb_array_elements(candidates) loop
    -- Secteurs DISJOINTS : ce qui a déjà été attribué est retiré du suivant.
    execute $q$ with raw as (select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) g),
      kept as (select case when $2::jsonb is null then raw.g
        else ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Difference(raw.g,ST_SetSRID(ST_GeomFromGeoJSON($2),4326))),3)) end g from raw),
      barred as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326))) g from public.no_capture_zones),
      -- CE QUI COMPTE VRAIMENT. `challenge_sector_metres_2026` (0150) soustrait
      -- `no_capture_zones` de la trace AVANT de la couper au secteur : un mètre
      -- couru dans une zone interdite ne rapporte rien. La portion interdite
      -- d'un secteur n'est donc pas du terrain de jeu, et la portée minimale du
      -- cahier doit être mesurée sur ce qui reste — sinon on publierait une
      -- arène dont un secteur est majoritairement inerte, sans que personne le
      -- voie. Mesurer ici comme 0150 mesure là-bas : une seule définition.
      countable as (select case when barred.g is null then kept.g
        else ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Difference(kept.g,barred.g)),3)) end g from kept,barred)
      select ST_AsGeoJSON(kept.g)::jsonb,ST_Area(kept.g::geography),ST_Area(countable.g::geography),
        ST_Distance(ST_SetSRID(ST_MakePoint(ST_XMin(countable.g),ST_YMin(countable.g)),4326)::geography,
                    ST_SetSRID(ST_MakePoint(ST_XMax(countable.g),ST_YMax(countable.g)),4326)::geography),
        coalesce(ST_Area(ST_Intersection(kept.g,barred.g)::geography),0)
      from kept,countable,barred $q$
      into shape,surface,countable,span,barred using candidate->'geometry',emitted;
    if shape is null or surface is null or surface<=0 then raise exception 'empty_sector'; end if;
    -- Un secteur entièrement interdit n'a plus de portée mesurable (`span` nul).
    if countable is null or countable<=0 or span is null then raise exception 'empty_sector'; end if;
    -- Un secteur trop petit pour contenir la trace exigée par le cahier rendrait
    -- le défi impossible : mieux vaut refuser la proposition que la publier.
    if span<p_min_span_m then raise exception 'sectors_too_small'; end if;
    position_key:=(array['west','centre','east'])[jsonb_array_length(sectors)+1];
    sectors:=sectors||jsonb_build_array(jsonb_build_object(
      'id',p_arena_id||'-'||position_key,'positionKey',position_key,'geometry',shape,
      'areaM2',round(surface::numeric,1),'countableAreaM2',round(countable::numeric,1),'spanM',round(span::numeric,1),
      'possessions',candidate->'possessions','forbiddenOverlapM2',round(barred::numeric,1)));
    surfaces:=surfaces||countable;
    if barred>0 then warnings:=warnings||jsonb_build_array('forbidden_zone_overlap:'||position_key); end if;
    execute 'select ST_AsGeoJSON(case when $1::jsonb is null then ST_SetSRID(ST_GeomFromGeoJSON($2),4326) else ST_Union(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),ST_SetSRID(ST_GeomFromGeoJSON($2),4326)) end)::jsonb'
      into emitted using emitted,shape;
  end loop;

  -- « Accès comparable » (§6.5) ne se calcule pas depuis des kilomètres : le
  -- rapport des aires JOUABLES est RAPPORTÉ, jamais transformé en verdict
  -- automatique. Comparer les aires brutes masquerait un secteur amputé.
  if source='city_zone_split' then warnings:=warnings||jsonb_build_array('no_real_presence_yet'); end if;
  if footprint is null then warnings:=warnings||jsonb_build_array('no_administrative_footprint'); end if;
  return jsonb_build_object('arenaId',p_arena_id,'communeInsee',p_commune_insee,'communeName',commune_name,
    'activity',p_activity,'source',source,'footprintCityId',footprint_id,'footprintName',footprint_name,
    'footprintCommunes',footprint_communes,'possessionsFound',owned,
    'searchRadiusM',p_search_radius_m,'padM',p_pad_m,'minSpanM',p_min_span_m,
    'areaRatio',round(((select max(a) from unnest(surfaces) a)/(select min(a) from unnest(surfaces) a))::numeric,2),
    'sectors',sectors,'warnings',warnings);
end $$;

-- Publier : la géométrie vient de la proposition, les noms et la revue d'accès
-- viennent d'un humain. Une seule transaction, un journal.
create function public.publish_challenge_arena_2026(p_arena_id text,p_commune_insee text,p_activity text,p_time_zone text,
  p_title text,p_sector_titles text[],p_access_source text,p_reviewed_at timestamptz,p_operator text,
  p_search_radius_m double precision,p_pad_m double precision,p_min_span_m double precision,p_min_possessions integer)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare r public.challenge_rules_2026; proposal jsonb; sectors jsonb:='[]'; sector jsonb; slot integer:=0; journal bigint;
begin
  select * into strict r from public.challenge_rules_2026;
  if nullif(btrim(coalesce(p_operator,'')),'') is null then raise exception 'operator_required'; end if;
  -- Les vérifications HUMAINES d'abord : refuser une arène sans nom réel ne
  -- demande aucun calcul géographique. Un « Secteur 1 » fabriqué serait un nom
  -- de lieu inventé ; trois noms distincts sont exigés.
  if p_sector_titles is null or array_length(p_sector_titles,1) is distinct from r.sectors
    or exists(select 1 from unnest(p_sector_titles) t where nullif(btrim(coalesce(t,'')),'') is null)
    or (select count(distinct btrim(t)) from unnest(p_sector_titles) t)<>r.sectors then raise exception 'sector_titles_required'; end if;
  proposal:=public.propose_challenge_arenas_2026(p_arena_id,p_commune_insee,p_activity,p_search_radius_m,p_pad_m,p_min_span_m,p_min_possessions);
  for sector in select value from jsonb_array_elements(proposal->'sectors') loop
    slot:=slot+1;
    sectors:=sectors||jsonb_build_array(jsonb_build_object('id',sector->>'id','title',btrim(p_sector_titles[slot]),'geometry',sector->'geometry'));
  end loop;
  -- Revalidation complète, immuabilité et refus des géométries invalides : 0122.
  perform public.configure_challenge_arena_2026(p_arena_id,p_title,p_activity,p_time_zone,sectors,p_access_source,p_reviewed_at);
  insert into public.challenge_arena_publications_2026(arena_id,commune_insee,source,activity,proposal,operator,action)
    values(p_arena_id,p_commune_insee,proposal->>'source',p_activity,proposal,btrim(p_operator),'published') returning id into journal;
  return jsonb_build_object('arenaId',p_arena_id,'journalId',journal,'source',proposal->>'source',
    'sectors',sectors,'warnings',proposal->'warnings');
end $$;

-- Retirer : une arène publiée n'est jamais modifiée (0122), elle se retire.
create function public.retire_challenge_arena_2026(p_arena_id text,p_operator text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare arena public.challenge_arenas_2026; journal bigint;
begin
  if nullif(btrim(coalesce(p_operator,'')),'') is null or nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'operator_required'; end if;
  select * into arena from public.challenge_arenas_2026 where id=p_arena_id and retired_at is null;
  if arena.id is null then raise exception 'arena_unavailable'; end if;
  update public.challenge_arenas_2026 set retired_at=now() where id=p_arena_id;
  insert into public.challenge_arena_publications_2026(arena_id,commune_insee,source,activity,proposal,operator,action)
    values(p_arena_id,
      (select commune_insee from public.challenge_arena_publications_2026 where arena_id=p_arena_id and action='published' order by recorded_at desc limit 1),
      (select source from public.challenge_arena_publications_2026 where arena_id=p_arena_id and action='published' order by recorded_at desc limit 1),
      arena.activity,jsonb_build_object('reason',btrim(p_reason)),btrim(p_operator),'retired') returning id into journal;
  -- Les défis déjà programmés gardent leur copie figée des secteurs (0122) :
  -- retirer une arène n'annule aucun match en cours, elle ferme les prochains.
  return jsonb_build_object('arenaId',p_arena_id,'journalId',journal,'retired',true);
end $$;

revoke all on function public.propose_challenge_arenas_2026(text,text,text,float8,float8,float8,integer),
  public.publish_challenge_arena_2026(text,text,text,text,text,text[],text,timestamptz,text,float8,float8,float8,integer),
  public.retire_challenge_arena_2026(text,text,text) from public,anon,authenticated;
grant execute on function public.propose_challenge_arenas_2026(text,text,text,float8,float8,float8,integer),
  public.publish_challenge_arena_2026(text,text,text,text,text,text[],text,timestamptz,text,float8,float8,float8,integer),
  public.retire_challenge_arena_2026(text,text,text) to service_role;
