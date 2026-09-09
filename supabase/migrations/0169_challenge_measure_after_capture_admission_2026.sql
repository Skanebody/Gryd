-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0169 : LA MESURE DU DÉFI SURVIT À LA RÉÉCRITURE DE 0155.
--
-- POURQUOI CE FICHIER EXISTE, ET POURQUOI IL PORTE CE NUMÉRO. Deux chantiers
-- ont touché `stage_game_activity_2026` le même jour :
--   · 0150 (défis) délègue la mesure « dans le secteur » à
--     `challenge_sector_metres_2026` : la trace validée que la boucle contient,
--     au lieu du seul bord de la face (cahier §6.2) ;
--   · 0155 (capture) DROP la signature à 9 arguments et en crée une à 11
--     (tolérance d'horloge, motif non vérifié) — en recopiant l'ancienne mesure
--     par `ST_Boundary`, écrite avant 0150.
-- Appliquées dans l'ordre, 0155 efface donc silencieusement 0150 : la fonction
-- de mesure resterait en base, plus personne ne l'appellerait. Ce fichier ne
-- réécrit AUCUNE migration — il s'empile après, comme le veut la règle, et
-- porte un numéro supérieur à tout ce qui existait au moment de son écriture.
--
-- CE QU'IL FAIT : reprendre le corps de 0155 tel quel — signature à 11
-- arguments, tolérance d'horloge, motif non vérifié, réévaluation — et
-- remplacer la seule intersection recopiée par l'appel à
-- `challenge_sector_metres_2026`. Aucune autre ligne ne change ; aucun droit ne
-- change ; `create or replace` conserve l'ACL de 0155.
--
-- GARDE-FOU DURABLE : `supabase/tests/crew_challenge_measure_2026.pglite.test.mjs`
-- relit TOUTE la lignée de migrations et exige que la DERNIÈRE définition de
-- `stage_game_activity_2026` délègue la mesure. Un lot qui recopierait de
-- nouveau `ST_Boundary` fera rougir le gate au lieu de passer inaperçu.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.stage_game_activity_2026(p_run_id uuid,p_faces jsonb,p_segments jsonb,p_masks jsonb,
  p_publish_after timestamptz,p_min_area_m2 double precision,p_receipt_max_hours double precision,
  p_source_verified boolean,p_review_required boolean,p_clock_tolerance_s double precision,
  p_unverified_reason text)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare run public.runs; face jsonb; c public.crew_challenges_2026; lengths jsonb; barrier boolean;
begin
  perform public.stage_capture_2026(p_run_id,p_faces,p_masks,p_publish_after,p_min_area_m2,
    p_receipt_max_hours,p_source_verified,p_review_required,p_clock_tolerance_s,p_unverified_reason);
  if p_source_verified is distinct from true or p_review_required is distinct from false then return; end if;
  select * into strict run from public.runs where id=p_run_id;
  for c in select ch.* from public.crew_challenges_2026 ch join public.challenge_roster_2026 r on r.challenge_id=ch.id
    where r.user_id=run.user_id and r.activity=run.activity and r.reserved and r.consent and r.consented_at<=run.started_at
    and ch.status in('scheduled','active','final') loop
    perform public.maintain_challenge_2026(c.id);
    for face in select value from jsonb_array_elements(p_faces) order by (value->>'closedAt')::timestamptz,value->>'key' loop
      -- Un envoi tardif peut sortir de la fenêtre de réception de la carte
      -- libre tout en restant admissible pour la synchronisation finale du
      -- match. La provenance et la revue ont été vérifiées plus haut.
      if not exists(select 1 from public.capture_events_2026 where run_id=run.id and face_key=face->>'key'
        and status<>'withdrawn' and coalesce(reason,'') not in('consent_withdrawn','source_deleted')) then continue; end if;
      if face ? 'closureConnector' then
        execute 'select exists(select 1 from public.no_capture_zones where ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326)))'
          into barrier using face->'closureConnector';
        if barrier then continue; end if;
      end if;
      -- §6.2 : la trace validée que la boucle contient, jamais le seul bord (0150).
      lengths:=public.challenge_sector_metres_2026(p_segments,face->'geometry',face->'closureConnector',c.sectors);
      perform public.assign_challenge_loop_2026(run.id,md5(run.id::text||':'||(face->>'key'))::uuid,(face->>'closedAt')::timestamptz,lengths);
    end loop;
    perform public.maintain_challenge_2026(c.id);
  end loop;
end $$;
revoke all on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text) from public,anon,authenticated;
grant execute on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text) to service_role;
