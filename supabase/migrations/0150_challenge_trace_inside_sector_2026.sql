-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0150 : LE SECTEUR SE MESURE SUR LA TRACE VALIDÉE, PAS SUR LE BORD.
--
-- LE DÉFAUT CORRIGÉ (0122:464-472). Le calcul de « longueur dans le secteur »
-- intersectait la trace avec `ST_Boundary(face)` — le bord de la boucle — puis
-- avec le secteur. Le cahier §6.2 dit autre chose, et c'est lui qui tranche :
--     « Une boucle admissible doit contenir une portion de trace validée à
--       l'intérieur du secteur : 400 m à pied ou 1 km à vélo. […] Englober un
--       secteur distant sans y passer ne suffit pas. »
-- Ce qui doit être mesuré est donc de la TRACE, à l'intérieur du SECTEUR. Le
-- moteur partagé le dit déjà dans son contrat : `ChallengeLoop2026` porte
-- `sectorTraceMetres` (packages/shared/src/challenges2026.ts), pas des mètres
-- de frontière. Le SQL était le seul à mesurer autre chose que la trace.
--
-- CE QUI CHANGE EXACTEMENT :
--     avant  trace ∩ ST_Boundary(face)  −  interdits  −  raccord  ∩ secteur
--     après  trace ∩ face               −  raccord   −  interdits ∩ secteur
-- `face` est le polygone FERMÉ : son intérieur ET son bord. La mesure reste
-- donc attachée à LA boucle admissible du jour (« la boucle doit contenir »),
-- mais une portion de trace qui traverse le secteur À L'INTÉRIEUR de la boucle
-- — un huit, un aller-retour, une diagonale — cesse d'être invisible.
--
-- CE QUI NE CHANGE PAS, ET POURQUOI CE N'EST PAS UN RELÂCHEMENT :
--   · l'ensemble mesuré est un SUR-ENSEMBLE de l'ancien (bord ⊂ polygone
--     fermé) : aucune contribution déjà acquise ne disparaît ;
--   · englober un secteur distant sans y passer donne toujours 0 — il n'y a
--     alors aucune trace à l'intérieur de ce secteur ;
--   · le raccord synthétique de fermeture (`closureConnector`, segment inventé
--     par le moteur entre deux extrémités) est toujours retiré, et les zones
--     interdites (`no_capture_zones`) toujours soustraites ;
--   · le seuil reste 400 m à pied / 1 000 m à vélo, lu dans
--     `challenge_rules_2026`, et l'admissibilité de la boucle reste décidée par
--     `capture_events_2026` (provenance, revue, consentement) ;
--   · les masques personnels ne sont toujours PAS soustraits de cette mesure —
--     ils protègent la carte publique, pas la participation à un secteur ; les
--     masquer ici ferait perdre des points pour cause de vie privée.
--
-- LA MESURE DEVIENT UNE FONCTION NOMMÉE. `challenge_sector_metres_2026` sort
-- l'intersection du corps de `stage_game_activity_2026` : une règle qu'on peut
-- relire, tester et remplacer seule. Elle reste réservée au service.
-- `ST_CollectionExtract(...,2)` est appliqué dès l'intersection : une trace qui
-- ne TOUCHE le polygone qu'en un point produisait une GeometryCollection, sur
-- laquelle les différences suivantes peuvent échouer. Un point n'a de toute
-- façon aucune longueur.
--
-- ⚠️ PGlite n'a pas PostGIS : le test SQL du gate prouve la STRUCTURE (la
-- fonction existe, ses droits, et `stage_game_activity_2026` ne mesure plus sur
-- `ST_Boundary`), jamais la géométrie. Les assertions spatiales vivent dans
-- `supabase/tests/crew_challenge_measure_2026.postgis.test.mjs`, qui exige une
-- base PostgreSQL/PostGIS locale et n'a PAS été exécuté sur ce poste.
-- ═══════════════════════════════════════════════════════════════════════════

create function public.challenge_sector_metres_2026(p_segments jsonb,p_face jsonb,p_closure_connector jsonb,p_sectors jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare lengths jsonb;
begin
  execute $spatial$
    with trace as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(s),4326))) g from jsonb_array_elements($1) s),
    face as (select ST_SetSRID(ST_GeomFromGeoJSON($2),4326) g),
    forbidden as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326))) g from public.no_capture_zones),
    -- §6.2 : la portion de trace validée que la boucle admissible contient.
    inside as (select ST_CollectionExtract(ST_Intersection(trace.g,face.g),2) g from trace,face),
    -- Un raccord de fermeture n'a jamais été parcouru : il ne se mesure pas.
    ridden as (select case when $3::jsonb is null then inside.g else ST_Difference(inside.g,ST_SetSRID(ST_GeomFromGeoJSON($3),4326)) end g from inside),
    allowed as (select case when forbidden.g is null then ridden.g else ST_Difference(ridden.g,forbidden.g) end g from ridden,forbidden)
    select jsonb_object_agg(s->>'id',ST_Length(ST_CollectionExtract(ST_Intersection(allowed.g,ST_SetSRID(ST_GeomFromGeoJSON(s->'geometry'),4326)),2)::geography))
      from allowed,jsonb_array_elements($4) s
  $spatial$ into lengths using p_segments,p_face,p_closure_connector,p_sectors;
  return coalesce(lengths,'{}'::jsonb);
end $$;
revoke all on function public.challenge_sector_metres_2026(jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.challenge_sector_metres_2026(jsonb,jsonb,jsonb,jsonb) to service_role;

-- Corps identique à 0122:440-477, à la mesure près : elle est déléguée.
create or replace function public.stage_game_activity_2026(p_run_id uuid,p_faces jsonb,p_segments jsonb,p_masks jsonb,
  p_publish_after timestamptz,p_min_area_m2 double precision,p_receipt_max_hours double precision,
  p_source_verified boolean,p_review_required boolean)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare run public.runs; face jsonb; c public.crew_challenges_2026; lengths jsonb; barrier boolean;
begin
  perform public.stage_capture_2026(p_run_id,p_faces,p_masks,p_publish_after,p_min_area_m2,p_receipt_max_hours,p_source_verified,p_review_required);
  if p_source_verified is distinct from true or p_review_required is distinct from false then return; end if;
  select * into strict run from public.runs where id=p_run_id;
  for c in select ch.* from public.crew_challenges_2026 ch join public.challenge_roster_2026 r on r.challenge_id=ch.id
    where r.user_id=run.user_id and r.activity=run.activity and r.reserved and r.consent and r.consented_at<=run.started_at
    and ch.status in('scheduled','active','final') loop
    perform public.maintain_challenge_2026(c.id);
    for face in select value from jsonb_array_elements(p_faces) order by (value->>'closedAt')::timestamptz,value->>'key' loop
      -- A late upload may be outside the free-map receipt window while still
      -- eligible for this match's explicit final synchronization deadline.
      -- Provenance/review were checked above, independently of map audience.
      if not exists(select 1 from public.capture_events_2026 where run_id=run.id and face_key=face->>'key'
        and status<>'withdrawn' and coalesce(reason,'') not in('consent_withdrawn','source_deleted')) then continue; end if;
      if face ? 'closureConnector' then
        execute 'select exists(select 1 from public.no_capture_zones where ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326)))'
          into barrier using face->'closureConnector';
        if barrier then continue; end if;
      end if;
      lengths:=public.challenge_sector_metres_2026(p_segments,face->'geometry',face->'closureConnector',c.sectors);
      perform public.assign_challenge_loop_2026(run.id,md5(run.id::text||':'||(face->>'key'))::uuid,(face->>'closedAt')::timestamptz,lengths);
    end loop;
    perform public.maintain_challenge_2026(c.id);
  end loop;
end $$;
revoke all on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) from public,anon,authenticated;
grant execute on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) to service_role;
