-- Défis de la semaine, 2/5 — LE FAIT GÉOGRAPHIQUE D'UNE BOUCLE, sans PostGIS.
-- Requiert 0118 (autorité polygonale) et 0165 (règles).
--
-- ─── LE PROBLÈME, ET POURQUOI IL SE RÉSOUT ICI ──────────────────────────────
-- Deux défis d'Exploration ont besoin de savoir OÙ une boucle a été fermée et
-- si deux boucles sont « presque identiques » (§7.4). La géométrie vit dans
-- `capture_events_2026.geometry`, en `extensions.geometry` : la lire demande
-- PostGIS, que le seul PostgreSQL du poste (PGlite) n'a pas. Une règle de jeu
-- dont personne ne peut rejouer la preuve n'est pas une règle de jeu.
--
-- La sortie est que le GeoJSON de chaque face existe DÉJÀ, en amont, tel que le
-- moteur pur l'a produit (`PhysicalFace2026.geometry`, `areaM2`) et tel que
-- `stage_capture_2026` le reçoit. On l'enregistre au moment de l'ingestion,
-- par arithmétique SQL ordinaire — même technique et mêmes limites que
-- `gryd_geo_bucket` (0105), à une maille plus fine. Aucune fonction spatiale
-- n'entre dans ce fichier, ni dans les trois suivants.
--
-- ─── CE QUE CETTE TABLE N'EST PAS ───────────────────────────────────────────
-- Ce n'est PAS une trace : deux nombres arrondis à ~1 km et ~220 m, et une
-- classe de taille. La trace brute reste illisible pour tout le monde sauf son
-- propriétaire, et cette table ne l'expose ni ne la reconstitue. Elle n'est
-- lisible par personne d'autre que le service : aucune lecture client n'y mène.
--
-- ─── LA PUBLICATION RESTE LE SEUL JUGE ──────────────────────────────────────
-- Une ligne est écrite pour toute face STAGÉE, quel que soit son statut. Elle
-- ne devient un fait de jeu que par jointure avec un `capture_events_2026` au
-- statut `published` (garde-fou 4 d'ADR-013 : « lecture des seuls événements
-- publiés »). Une sortie privée, en attente ou retirée ne compte pour aucun
-- défi — la vie privée ne fuit pas par un compteur de défi.

create table public.weekly_quest_faces_2026 (
  -- Même identifiant déterministe que `stage_capture_2026` :
  -- md5(run_id || ':' || face.key). La face et son événement sont la même chose.
  event_id uuid primary key references public.capture_events_2026(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  activity text not null check(activity in('run','bike')),
  closed_at timestamptz not null,
  -- Carreau ~1,1 km : le « secteur » d'exploration. Jamais nommé « quartier ».
  locality text not null,
  -- Carreau fin + classe de taille : la déduplication du §7.4.
  signature text not null,
  area_m2 double precision not null check(area_m2>=0),
  recorded_at timestamptz not null default now()
);
create index weekly_quest_faces_owner_2026 on public.weekly_quest_faces_2026(owner_id,activity,closed_at);
create index weekly_quest_faces_locality_2026 on public.weekly_quest_faces_2026(owner_id,locality,closed_at);

alter table public.weekly_quest_faces_2026 enable row level security;
revoke all on public.weekly_quest_faces_2026 from public,anon,authenticated;
grant all on public.weekly_quest_faces_2026 to service_role;
-- Plancher explicite : même si un `grant` était ajouté un jour, une ligne ne
-- serait visible que de son propriétaire.
create policy weekly_quest_faces_own_2026 on public.weekly_quest_faces_2026
  for select to authenticated using(owner_id=auth.uid());

-- ── Le carreau, arithmétique pure sur un anneau GeoJSON ─────────────────────
-- `coordinates[0]` est l'anneau extérieur, chaque point étant [lng, lat] —
-- l'ordre GeoJSON, pas l'ordre humain. S'y tromper rangerait Rouen en Somalie.
-- L'anneau fermé répète son premier sommet : la moyenne est donc très
-- légèrement tirée vers lui. À l'échelle d'un carreau de 1,1 km pour une boucle
-- de quelques centaines de mètres, l'écart est de plusieurs ordres de grandeur
-- sous la maille — c'est l'approximation honnête déjà retenue par 0105.
create function public.weekly_quest_tile_2026(p_geometry jsonb,p_degrees double precision)
returns text language sql immutable parallel safe set search_path=public,pg_temp as $$
  select case
    when p_geometry is null or p_geometry->'coordinates'->0 is null
      or p_degrees is null or p_degrees<=0 then null
    else (
      select floor(avg((pt->>1)::double precision)/p_degrees)::text
             ||':'||
             floor(avg((pt->>0)::double precision)/p_degrees)::text
      from jsonb_array_elements(p_geometry->'coordinates'->0) pt)
  end;
$$;

-- ── La signature de déduplication (§7.4 « traces presque identiques ») ──────
-- Deux boucles comptent pour une seule quand elles partagent le même carreau
-- fin ET la même classe de taille. Ce n'est pas une comparaison de formes : ça
-- ne sépare pas deux boucles imbriquées de taille voisine. Ce que ça garantit,
-- et qui est le but, c'est qu'on ne compte pas deux fois la MÊME boucle refaite.
create function public.weekly_quest_signature_2026(p_geometry jsonb,p_area_m2 double precision)
returns text language sql stable set search_path=public,pg_temp as $$
  select public.weekly_quest_tile_2026(p_geometry,r.distinct_loop_tile_degrees)
         ||'#'||floor(greatest(coalesce(p_area_m2,0),0)/r.distinct_loop_area_bucket_m2)::text
    from public.weekly_quest_rules_2026 r;
$$;

-- ── L'écriture, appelée par l'ingestion après la mise en scène des faces ────
-- Idempotente : un rejeu d'upload n'ajoute rien. Elle n'écrit QUE pour les
-- faces qui ont réellement produit un événement de capture — une boucle
-- refusée pour surface insuffisante ou zone interdite n'a pas d'existence ici.
-- Elle ne juge rien, ne récompense rien, ne publie rien : elle range un fait.
create function public.note_weekly_quest_faces_2026(p_run_id uuid,p_faces jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.runs; face jsonb; rule public.weekly_quest_rules_2026; added integer:=0; n integer;
begin
  if p_faces is null or jsonb_typeof(p_faces) is distinct from 'array' then return 0; end if;
  select * into strict r from public.runs where id=p_run_id;
  if r.ruleset_version<>'2026.1' or r.user_id is null then return 0; end if;
  select * into strict rule from public.weekly_quest_rules_2026;
  for face in select value from jsonb_array_elements(p_faces) loop
    if face->>'key' is null or face->'geometry' is null or face->>'closedAt' is null then continue; end if;
    insert into public.weekly_quest_faces_2026(event_id,run_id,owner_id,activity,closed_at,locality,signature,area_m2)
      select e.id,r.id,r.user_id,r.activity,(face->>'closedAt')::timestamptz,
        public.weekly_quest_tile_2026(face->'geometry',rule.locality_tile_degrees),
        public.weekly_quest_signature_2026(face->'geometry',(face->>'areaM2')::double precision),
        greatest(coalesce((face->>'areaM2')::double precision,0),0)
      from public.capture_events_2026 e
      where e.id=md5(r.id::text||':'||(face->>'key'))::uuid
        and public.weekly_quest_tile_2026(face->'geometry',rule.locality_tile_degrees) is not null
      on conflict(event_id) do nothing;
    get diagnostics n=row_count; added:=added+n;
  end loop;
  return added;
end $$;

revoke all on function public.weekly_quest_tile_2026(jsonb,double precision),
  public.weekly_quest_signature_2026(jsonb,double precision),
  public.note_weekly_quest_faces_2026(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.weekly_quest_tile_2026(jsonb,double precision),
  public.weekly_quest_signature_2026(jsonb,double precision),
  public.note_weekly_quest_faces_2026(uuid,jsonb) to service_role;
