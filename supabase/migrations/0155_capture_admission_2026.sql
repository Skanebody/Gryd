-- 0155_capture_admission_2026.sql
-- GRYD — L'ADMISSION D'UNE CAPTURE DEVIENT UNE RÈGLE NOMMÉE, TOLÉRANTE ET FINIE.
--
-- ═══ TROIS DÉFAUTS DE 0118 QUE CETTE MIGRATION CORRIGE ══════════════════════
--
-- 1. AUCUNE TOLÉRANCE D'HORLOGE (0118:139). `closure > r.created_at` comparait
--    l'horloge de l'appareil à celle du serveur au ratio près de la seconde :
--    deux secondes de dérive NTP — une banalité sur un téléphone — suspendaient
--    TOUT le territoire d'une sortie, sans un mot au joueur. La dérive admise
--    est désormais un paramètre injecté (`TERRITORY_RULES_2026.clockToleranceSeconds`),
--    et au-delà le refus porte son motif : `clock_drift_too_large`.
--
-- 2. « EN ATTENTE » ÉTAIT DÉFINITIF (0118:212). `publish_capture_events_2026`
--    ne promeut que `scheduled` ; RIEN ne faisait jamais sortir un `pending`.
--    Le client lisait « Origine ou horaire à confirmer » pour un état qui ne
--    serait jamais confirmé. On sépare donc les motifs en deux familles :
--      · RÉSOLUBLES  → `pending` (une revue, ou un renvoi de la sortie) ;
--      · TERMINAUX   → `rejected` (l'évidence ne changera plus).
--    `rejected` est un état HONNÊTE, pas un purgatoire. La sortie de `pending`
--    par expiration est posée par 0156.
--
-- 3. AUCUN RATTRAPAGE POUR UN DÉPART SANS SESSION. `begin_recording_2026` est
--    appelée en « fire and forget » par le client : réseau coupé au départ =
--    aucune session = `source_or_clock_unconfirmed` définitif, alors que le
--    cahier §5.5 ADMET le hors-ligne sous 24 h. `adopt_recording_session_2026`
--    crée la session A POSTERIORI quand la trace est cohérente, en ne lisant
--    QUE `runs.trace_points_2026` (l'évidence déjà persistée) : le client
--    n'apporte aucune borne temporelle et ne peut donc pas mentir.
--    La session adoptée est MARQUÉE (`adopted_at`) : elle n'a pas la même
--    valeur de preuve qu'un départ observé en direct, et l'audit doit le voir.
--
-- ═══ CE QUI NE CHANGE PAS ══════════════════════════════════════════════════
-- La confidentialité passe TOUJOURS avant l'admission : une face masquée ou
-- sans consentement reste `private`, quelle que soit l'horloge. Aucune
-- géométrie n'est réparée, aucune surface n'est inventée, et une réévaluation
-- ne rejoue JAMAIS la géométrie : elle ne touche que le statut d'événements
-- déjà `pending`, jamais un événement publié, retiré ou privé.
--
-- Tests : supabase/tests/capture_admission_2026.pglite.test.mjs (logique pure,
-- sans PostGIS) et supabase/tests/refonte2026.postgis.test.mjs (géométrie).

-- ─── 1. `rejected` rejoint le vocabulaire des états ────────────────────────
do $$ declare c text; begin
  select conname into c from pg_constraint
    where conrelid='public.capture_events_2026'::regclass and contype='c'
      and pg_get_constraintdef(oid) ilike '%status%';
  if c is not null then execute format('alter table public.capture_events_2026 drop constraint %I',c); end if;
end $$;
alter table public.capture_events_2026 add constraint capture_events_2026_status_check
  check(status in ('private','pending','scheduled','published','withdrawn','rejected'));
create index if not exists capture_events_2026_pending on public.capture_events_2026(closed_at) where status='pending';

-- ─── 2. Une session peut être ADOPTÉE, et ça se voit ───────────────────────
alter table public.recording_sessions_2026 add column if not exists adopted_at timestamptz;
comment on column public.recording_sessions_2026.adopted_at is
  'Non nul : la session a été reconstituée à la réception (cahier §5.5, hors ligne sous 24 h) au lieu d''être observée au départ. Preuve plus faible — la borne serveur est la fenêtre de réception, pas le top départ.';

-- ─── 3. La famille d'un motif : résoluble ou terminal ──────────────────────
-- Un état terminal se dit `rejected`. Il n'y a pas de troisième famille : tout
-- motif ajouté plus tard doit choisir son camp ICI, sinon il retombe sur
-- `pending` et ressusciterait le purgatoire de 0118.
create function public.capture_state_for_reason_2026(p_reason text)
returns text language sql immutable set search_path=pg_temp as $$
  select case when p_reason in (
    -- L'évidence ne changera plus : l'horloge de l'appareil, la fenêtre de
    -- réception et le raccord de fermeture sont figés avec la trace.
    'clock_drift_too_large','receipt_window_expired','closure_crosses_known_barrier'
  ) then 'rejected' else 'pending' end;
$$;
revoke all on function public.capture_state_for_reason_2026(text) from public,anon,authenticated;
grant execute on function public.capture_state_for_reason_2026(text) to service_role;

-- ─── 4. L'admission d'UNE face, sans géométrie ─────────────────────────────
-- Volontairement scalaire : c'est la seule façon de la prouver là où PostGIS
-- n'existe pas (PGlite), et de la relire sans dérouler une migration entière.
-- Tous les paramètres de jeu sont INJECTÉS (ADR-003) : aucune constante ici.
create function public.capture_admission_2026(
  p_source_verified boolean, p_review_required boolean,
  p_closed_at timestamptz, p_received_at timestamptz,
  p_clock_tolerance_s double precision, p_receipt_max_hours double precision,
  p_unverified_reason text default null)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare tolerance interval; reason text;
begin
  if p_closed_at is null or p_received_at is null or p_clock_tolerance_s is null
     or p_receipt_max_hours is null then raise exception 'invalid_admission_input'; end if;
  tolerance:=make_interval(secs=>greatest(p_clock_tolerance_s,0));
  -- Fermeture DANS LE FUTUR au-delà de la tolérance : l'appareil s'est déclaré
  -- en avance sur le serveur. Rien ne le corrigera, et avaler l'écart
  -- reviendrait à laisser antidater une prise de terrain.
  if p_closed_at > p_received_at + tolerance then
    return jsonb_build_object('state','rejected','reason','clock_drift_too_large',
      'driftS',extract(epoch from (p_closed_at-p_received_at)));
  end if;
  -- §5.5 : « Réception pour capture courante : dans les 24 h suivant la
  -- fermeture physique. » Passé ce délai, ce n'est pas « à confirmer », c'est non.
  if p_received_at - p_closed_at > make_interval(secs=>greatest(p_receipt_max_hours,0)*3600) then
    return jsonb_build_object('state','rejected','reason','receipt_window_expired',
      'lateBySeconds',extract(epoch from ((p_received_at-p_closed_at)-make_interval(secs=>p_receipt_max_hours*3600))));
  end if;
  if p_review_required is true then
    return jsonb_build_object('state',public.capture_state_for_reason_2026('verification_required'),
      'reason','verification_required');
  end if;
  if p_source_verified is distinct from true then
    reason:=coalesce(nullif(p_unverified_reason,''),'source_or_clock_unconfirmed');
    return jsonb_build_object('state',public.capture_state_for_reason_2026(reason),'reason',reason);
  end if;
  return jsonb_build_object('state','scheduled');
end $$;
revoke all on function public.capture_admission_2026(boolean,boolean,timestamptz,timestamptz,float8,float8,text) from public,anon,authenticated;
grant execute on function public.capture_admission_2026(boolean,boolean,timestamptz,timestamptz,float8,float8,text) to service_role;

-- ─── 5. Le statut d'une SORTIE, dérivé de ses faces ────────────────────────
-- Un seul endroit décide, sinon deux lectures du même terrain se contrediraient.
-- Ordre : ce qui est acquis passe avant ce qui attend, qui passe avant ce qui
-- est refusé, qui passe avant ce qui est privé.
create function public.run_capture_status_2026(p_run_id uuid)
returns text language sql stable set search_path=public,pg_temp as $$
  select coalesce((select case
    when bool_or(status='published') then 'published'
    when bool_or(status='scheduled') then 'scheduled'
    when bool_or(status='pending') then 'pending'
    when bool_or(status='rejected') then 'rejected'
    else 'private' end
    from public.capture_events_2026 where run_id=p_run_id having count(*)>0),'no_loop');
$$;
revoke all on function public.run_capture_status_2026(uuid) from public,anon,authenticated;
grant execute on function public.run_capture_status_2026(uuid) to service_role;

-- ─── 6. La session reconstituée après coup ─────────────────────────────────
create function public.adopt_recording_session_2026(
  p_run_id uuid, p_clock_tolerance_s double precision, p_receipt_max_hours double precision)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.runs; s public.recording_sessions_2026; first_at timestamptz; last_at timestamptz; adopted uuid;
begin
  select * into strict r from public.runs where id=p_run_id for update;
  if r.ruleset_version<>'2026.1' then raise exception 'wrong_ruleset'; end if;
  if r.recording_session_id_2026 is not null then
    select * into s from public.recording_sessions_2026 where id=r.recording_session_id_2026 and user_id=r.user_id;
    if s.id is null then return jsonb_build_object('reason','source_or_clock_unconfirmed'); end if;
    return jsonb_build_object('id',s.id,'startedAt',s.started_at,'adopted',s.adopted_at is not null);
  end if;
  -- Un départ RÉELLEMENT enregistré dont le client a perdu l'identifiant est
  -- RETROUVÉ, jamais dupliqué : la contrainte (user_id, client_run_id) est le lien.
  select * into s from public.recording_sessions_2026 where user_id=r.user_id and client_run_id=r.client_run_id;
  if s.id is not null then
    if s.activity is distinct from r.activity then return jsonb_build_object('reason','source_or_clock_unconfirmed'); end if;
    update public.runs set recording_session_id_2026=s.id where id=r.id;
    return jsonb_build_object('id',s.id,'startedAt',s.started_at,'adopted',s.adopted_at is not null);
  end if;
  if r.source is distinct from 'gps' then return jsonb_build_object('reason','source_or_clock_unconfirmed'); end if;
  -- Les bornes viennent de l'ÉVIDENCE PERSISTÉE, jamais d'un champ de requête :
  -- une session adoptée ne doit pas pouvoir être fabriquée par le client.
  select to_timestamp(min((p->>'t')::float8)/1000), to_timestamp(max((p->>'t')::float8)/1000)
    into first_at,last_at from jsonb_array_elements(coalesce(r.trace_points_2026,'[]'::jsonb)) p;
  if first_at is null or last_at is null or last_at < first_at then
    return jsonb_build_object('reason','source_or_clock_unconfirmed'); end if;
  if last_at > r.created_at + make_interval(secs=>greatest(p_clock_tolerance_s,0)) then
    return jsonb_build_object('reason','clock_drift_too_large',
      'driftS',extract(epoch from (last_at-r.created_at))); end if;
  if r.created_at - last_at > make_interval(secs=>greatest(p_receipt_max_hours,0)*3600) then
    return jsonb_build_object('reason','receipt_window_expired'); end if;
  insert into public.recording_sessions_2026(user_id,client_run_id,activity,started_at,adopted_at)
    values(r.user_id,r.client_run_id,r.activity,first_at,now()) returning id into adopted;
  update public.runs set recording_session_id_2026=adopted where id=r.id;
  return jsonb_build_object('id',adopted,'startedAt',first_at,'adopted',true);
end $$;
revoke all on function public.adopt_recording_session_2026(uuid,float8,float8) from public,anon,authenticated;
grant execute on function public.adopt_recording_session_2026(uuid,float8,float8) to service_role;

-- ─── 7. La mise en scène des faces, avec tolérance et réévaluation ─────────
-- La SIGNATURE change (deux paramètres injectés de plus) : l'ancienne est
-- SUPPRIMÉE plutôt que doublée, pour qu'aucun appel ne puisse retomber en
-- silence sur une version sans tolérance. Migration et redéploiement
-- d'`ingest_run` vont donc ensemble.
drop function if exists public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean);
drop function if exists public.stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean);

create function public.stage_capture_2026(p_run_id uuid,p_faces jsonb,p_masks jsonb,
  p_publish_after timestamptz,p_min_area_m2 double precision,p_receipt_max_hours double precision,
  p_source_verified boolean,p_review_required boolean,p_clock_tolerance_s double precision,
  p_unverified_reason text)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare r public.runs; f jsonb; m jsonb; g geometry; mask geometry;
  exclusions geometry; state text; why text; closure timestamptz; admission jsonb; e public.capture_events_2026;
begin
  select * into strict r from public.runs where id=p_run_id for update;
  if r.ruleset_version<>'2026.1' then raise exception 'wrong_ruleset'; end if;
  if exists(select 1 from public.capture_events_2026 where run_id=r.id) then
    -- RÉÉVALUATION (et non re-mise en scène) : la géométrie reste celle du
    -- premier traitement. Seul un événement encore `pending` peut changer
    -- d'avis ; publié, retiré ou privé, il est intouchable.
    for e in select * from public.capture_events_2026 where run_id=r.id and status='pending' loop
      if e.reason='closure_crosses_known_barrier' then
        -- La géométrie n'a pas bougé : le motif reste le sien, mais il devient
        -- l'état terminal qu'il aurait dû être depuis 0118.
        admission:=jsonb_build_object('state',public.capture_state_for_reason_2026(e.reason),'reason',e.reason);
      else
        admission:=public.capture_admission_2026(p_source_verified,p_review_required,e.closed_at,
          e.received_at,p_clock_tolerance_s,p_receipt_max_hours,p_unverified_reason);
      end if;
      update public.capture_events_2026 set status=admission->>'state',
        reason=nullif(admission->>'reason','') where id=e.id;
    end loop;
    update public.runs set game_status_2026=public.run_capture_status_2026(r.id) where id=r.id;
    return;
  end if;
  select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326)))
    into exclusions from public.no_capture_zones;
  for f in select value from jsonb_array_elements(p_faces) loop
    g:=ST_SetSRID(ST_GeomFromGeoJSON(f->'geometry'),4326);
    -- Un anneau invalide n'est JAMAIS réparé en capture inventée.
    if not ST_IsValid(g) then raise exception 'invalid_capture_geometry'; end if;
    closure:=(f->>'closedAt')::timestamptz;
    state:='scheduled'; why:=null;
    -- La confidentialité passe avant tout le reste et n'est jamais rattrapable.
    if not r.shared_map_consent_2026 or not exists(select 1 from public.user_profiles where user_id=r.user_id and map_sharing<>'none') then state:='private'; why:='shared_map_not_authorized'; end if;
    for m in select value from jsonb_array_elements(p_masks) loop
      mask:=ST_Buffer(ST_SetSRID(ST_MakePoint((m->>'lng')::float8,(m->>'lat')::float8),4326)::geography,(m->>'radiusM')::float8)::geometry;
      -- Une face entière reste privée. Aucun trou identifiant n'est publié.
      if ST_Intersects(g,mask) then state:='private'; why:='protected_place'; end if;
    end loop;
    if state<>'private' then
      admission:=public.capture_admission_2026(p_source_verified,p_review_required,closure,
        r.created_at,p_clock_tolerance_s,p_receipt_max_hours,p_unverified_reason);
      state:=admission->>'state'; why:=nullif(admission->>'reason','');
    end if;
    if state<>'private' and exclusions is not null and f ? 'closureConnector' and
       ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON(f->'closureConnector'),4326),exclusions) then
      state:=public.capture_state_for_reason_2026('closure_crosses_known_barrier');
      why:='closure_crosses_known_barrier';
    end if;
    if exclusions is not null then g:=ST_Difference(g,exclusions); end if;
    g:=ST_Multi(ST_CollectionExtract(g,3));
    if ST_IsEmpty(g) or ST_Area(g::geography)<p_min_area_m2 then continue; end if;
    insert into public.capture_events_2026(id,run_id,owner_id,activity,face_key,closed_at,received_at,publish_after,geometry,status,reason)
      values(md5(r.id::text||':'||(f->>'key'))::uuid,r.id,r.user_id,r.activity,f->>'key',closure,r.created_at,p_publish_after,g,state,why);
  end loop;
  update public.runs set game_status_2026=public.run_capture_status_2026(r.id) where id=r.id;
end $$;
revoke all on function public.stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text) from public,anon,authenticated;
grant execute on function public.stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text) to service_role;

-- ─── 8. Capture et défi partagent toujours UNE transaction (0122) ──────────
create function public.stage_game_activity_2026(p_run_id uuid,p_faces jsonb,p_segments jsonb,p_masks jsonb,
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
      execute $spatial$
        with trace as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(s),4326))) g from jsonb_array_elements($1) s),
        forbidden as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326))) g from public.no_capture_zones),
        boundary as (select ST_Intersection(trace.g,ST_Boundary(ST_SetSRID(ST_GeomFromGeoJSON($2),4326))) g from trace),
        allowed as (select case when forbidden.g is null then boundary.g else ST_Difference(boundary.g,forbidden.g) end g from boundary,forbidden),
        measured as (select case when $3::jsonb is null then allowed.g else ST_Difference(allowed.g,ST_SetSRID(ST_GeomFromGeoJSON($3),4326)) end g from allowed)
        select jsonb_object_agg(s->>'id',ST_Length(ST_CollectionExtract(ST_Intersection(measured.g,ST_SetSRID(ST_GeomFromGeoJSON(s->'geometry'),4326)),2)::geography))
          from measured,jsonb_array_elements($4) s
      $spatial$ into lengths using p_segments,face->'geometry',face->'closureConnector',c.sectors;
      perform public.assign_challenge_loop_2026(run.id,md5(run.id::text||':'||(face->>'key'))::uuid,(face->>'closedAt')::timestamptz,lengths);
    end loop;
    perform public.maintain_challenge_2026(c.id);
  end loop;
end $$;
revoke all on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text) from public,anon,authenticated;
grant execute on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text) to service_role;
