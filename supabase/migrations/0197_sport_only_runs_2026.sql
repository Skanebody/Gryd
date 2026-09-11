-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0197 — UNE SORTIE PEUT NE COMPTER QUE POUR LE SPORT.                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Décision fondateur du 12/09/2026, mot pour mot : « à la fin, si la personne
-- s'est trompée, on lui met le message comme quoi il y a un problème avec sa
-- course ; s'il ne veut pas basculer, on ne comptabilise pas pour certaines
-- choses ». Ce fichier pose « certaines choses ».
--
-- ═══ CE QUI EXISTAIT, ET POURQUOI ÇA NE SUFFISAIT PAS ══════════════════════
-- Le schéma savait déjà refuser une capture pour six motifs (0155), et le
-- moteur savait déjà repérer un vélo déclaré « course » (`discipline_mismatch`,
-- 0187). Mais les deux ne se rencontraient que d'une seule façon : le SOUPÇON.
-- La sortie était GELÉE et une revue humaine convoquée, pour ce qui est, dans
-- l'immense majorité des cas, une erreur de bouton au départ. Rien ne permettait
-- de dire « tu gardes ta sortie, elle ne prend juste pas de terrain ».
--
-- ═══ CE QUE LA COLONNE DIT, ET CE QU'ELLE NE DIT PAS ═══════════════════════
-- Elle ne dit PAS « cette sortie est suspecte ». Elle dit « son propriétaire a
-- vu les chiffres à l'arrivée et a choisi de garder sa discipline ». La sortie
-- reste `status='valid'` : elle compte pour le journal, les kilomètres, les
-- jours actifs et l'XP de progression. Elle ne compte pour rien de ce qui se
-- gagne contre les autres.
--
-- ═══ OÙ LA GARDE EST POSÉE, ET POURQUOI À CES TROIS ENDROITS ═══════════════
-- §3 `stage_capture_2026` est le producteur UNIQUE de `capture_events_2026`.
--    Un refus prononcé là fait tomber en cascade : le terrain, les classements
--    (`board_eligible_events_2026` exige `status='published'`), les faits de
--    quête (`note_weekly_quest_faces_2026` joint l'événement), la garde de face
--    des défis, et `runs.game_status_2026`.
-- §4 `stage_game_activity_2026` — parce que la garde de face des défis (0169)
--    n'exclut que `withdrawn`, `consent_withdrawn` et `source_deleted` : un
--    événement `rejected` la traverse. Sans ce §4, un défi de crew aurait
--    continué de compter les mètres d'une sortie sans terrain.
-- §5 `weekly_quest_satisfied_2026`, branche `validated_group_outing` — la seule
--    condition de quête qui lise `runs` DIRECTEMENT, donc la seule que le
--    verrou de capture ne couvre pas.
--
-- ═══ CE QUI RESTE COMPTÉ, ET C'EST VOULU ═══════════════════════════════════
-- Trois lectures de `runs` ne sont PAS gardées, parce qu'elles mesurent du
-- SPORT et que le fondateur a dit que le sport compte :
--   · `weekly_quest_active_days_2026` (0167) lit le REGISTRE DE PROGRESSION,
--     pas `runs`. Une quête « deux journées actives » reste donc satisfaite par
--     une sortie « sport seulement ». Ce n'est pas une fuite : retirer ce jour
--     reviendrait à retirer l'XP, c'est-à-dire à contredire la règle d'à côté ;
--   · `crew_member_measures_2026` (0188), `crew_member_activity_2026` (0189) et
--     `sweep_crew_inactivity_2026` (0190) comptent des kilomètres et des jours
--     de présence. Exclure la sortie y ferait passer quelqu'un pour inactif
--     alors qu'il a couru — une punition, pas une règle de jeu ;
--   · `referral_qualifying_run_2026` (0186) atteste qu'un filleul a VRAIMENT
--     fait une sortie. C'est un fait sportif, pas un gain sur les autres.
--
-- ═══ CE QUE CE FICHIER NE FAIT PAS ═════════════════════════════════════════
-- Il ne juge RIEN. Le contrôle de discipline vit dans le moteur PUR
-- (`packages/engine/src/disciplineCheck2026.ts`) et la réponse vient du joueur,
-- à l'arrivée. La base ne fait qu'enregistrer ce qu'il a répondu et en tirer
-- les conséquences. Une sortie sur laquelle personne n'a été interrogé n'a
-- jamais cette colonne.
--
-- ADDITIVE : une colonne neuve (NULL par défaut, donc aucune sortie existante
-- ne change de sens), quatre fonctions remplacées à signature IDENTIQUE (les
-- ACL de 0155/0167/0169/0192 sont conservées par `create or replace`), un
-- déclencheur neuf. Rollback : réappliquer §7 de 0155, §4 de 0167, 0169 et §2
-- de 0192, puis `drop trigger notify_run_sport_only_2026 on public.runs` et
-- `alter table public.runs drop column sport_only_reason_2026`.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. LA COLONNE ──────────────────────────────────────────────────────────
-- `text` et non `boolean` : le jour où une autre raison de « sport seulement »
-- apparaîtra, la lecture dira LAQUELLE. Un booléen aurait forcé à deviner, et
-- un écran ne peut pas expliquer un état dont il ne connaît pas la cause.
-- game-rules: SPORT_ONLY_REASONS_2026
alter table public.runs add column if not exists sport_only_reason_2026 text;
alter table public.runs drop constraint if exists runs_sport_only_reason_2026_check;
alter table public.runs add constraint runs_sport_only_reason_2026_check
  check (sport_only_reason_2026 is null or sport_only_reason_2026 in ('discipline_mismatch_kept'));

-- Index PARTIEL : la colonne est nulle sur la quasi-totalité des lignes, et les
-- seules lectures qui la filtrent cherchent les lignes NON nulles.
create index if not exists runs_sport_only_2026_idx
  on public.runs(user_id) where sport_only_reason_2026 is not null;

comment on column public.runs.sport_only_reason_2026 is
  'Non nul : la sortie compte pour le sport (journal, kilomètres, jours actifs, XP) et pour RIEN du jeu (terrain, classements, défis, quêtes). Écrit par ingest_run quand le joueur, à l''arrivée, a vu que sa trace racontait une autre discipline et a choisi de garder la sienne. Jamais un soupçon : le soupçon, c''est anticheat_reviews.';

-- ── 2. LE MOTIF CHOISIT SON CAMP ───────────────────────────────────────────
-- 0155 §3 le demandait explicitement : « tout motif ajouté plus tard doit
-- choisir son camp ICI, sinon il retombe sur `pending` et ressusciterait le
-- purgatoire de 0118 ». `discipline_mismatch_kept` est TERMINAL : l'évidence ne
-- changera plus (la trace et le podomètre sont figés) et, surtout, la réponse a
-- été donnée. Laisser cette sortie « en attente » ferait espérer un terrain qui
-- ne viendra jamais.
create or replace function public.capture_state_for_reason_2026(p_reason text)
returns text language sql immutable set search_path=pg_temp as $$
  select case when p_reason in (
    -- L'évidence ne changera plus : l'horloge de l'appareil, la fenêtre de
    -- réception et le raccord de fermeture sont figés avec la trace.
    'clock_drift_too_large','receipt_window_expired','closure_crosses_known_barrier',
    -- 0197 — et celui-ci ne changera plus parce que quelqu'un a répondu.
    'discipline_mismatch_kept'
  ) then 'rejected' else 'pending' end;
$$;

-- ── 3. L'ADMISSION : LE VERROU UNIQUE DU JEU ───────────────────────────────
-- Corps de 0155 §7, repris TEL QUEL (y compris la réévaluation de 0155 et la
-- mesure de face), avec UNE seule addition : la branche « sport seulement », qui
-- enveloppe et remplace la chaîne de refus d'origine.
create or replace function public.stage_capture_2026(p_run_id uuid,p_faces jsonb,p_masks jsonb,
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
    -- ══ SPORT SEULEMENT : LE JOUEUR A VU, ET IL A CHOISI (0197) ════════════
    -- Ce refus passe AVANT tous les autres et les remplace. Il n'est pas une
    -- panne, pas une revue, pas une confidentialité : c'est une réponse donnée
    -- à l'arrivée, les chiffres sous les yeux. Le motif est donc le sien, et
    -- l'admission n'est même pas consultée — la consulter pourrait rendre
    -- « à confirmer » une chose qui est déjà tranchée.
    if r.sport_only_reason_2026 is not null then
      state:=public.capture_state_for_reason_2026(r.sport_only_reason_2026);
      why:=r.sport_only_reason_2026;
    else
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

-- ── 4. LES DÉFIS DE CREW NE MESURENT PLUS CETTE SORTIE ─────────────────────
-- Corps de 0169, repris TEL QUEL (la mesure reste déléguée à
-- `challenge_sector_metres_2026`, ce que le gate vérifie), avec UNE addition.
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
  -- ══ SPORT SEULEMENT : AUCUN DÉFI NE SE MESURE SUR CETTE SORTIE (0197) ════
  -- La garde de face plus bas ne suffirait PAS : `stage_capture_2026` a bien
  -- écrit un événement, en `rejected` avec ce motif, et cette garde n'exclut
  -- que `withdrawn`, `consent_withdrawn` et `source_deleted`. Un défi de crew
  -- aurait donc continué de compter les mètres d'une sortie qui ne prend aucun
  -- terrain. Le refus se dit ICI, une fois, avant la première boucle.
  if run.sport_only_reason_2026 is not null then return; end if;
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

-- ── 5. LES QUÊTES DE LA SEMAINE ────────────────────────────────────────────
-- Corps de 0167 §4, repris TEL QUEL, avec UNE addition sur la seule branche qui
-- lise `runs` directement (`validated_group_outing`). Les branches « jours
-- actifs » lisent le registre de PROGRESSION et restent intouchées : voir
-- l'en-tête, « ce qui reste compté, et c'est voulu ».
create or replace function public.weekly_quest_satisfied_2026(p_user_id uuid,p_activity text,p_week_start date,p_quest_id text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare q public.weekly_quests_2026; rule public.weekly_quest_rules_2026;
  ws timestamptz; we timestamptz; wx timestamptz;
begin
  select * into q from public.weekly_quests_2026 where quest_id=p_quest_id;
  if not found then return false; end if;
  select * into strict rule from public.weekly_quest_rules_2026;
  select b.starts_at,b.ends_at,b.expires_at into ws,we,wx from public.weekly_quest_week_bounds_2026(p_week_start) b;
  case q.condition
    -- « Une boucle dans un secteur où tu n'en avais jamais fermé. » L'histoire
    -- est lue TOUTES disciplines confondues : un endroit où l'on est déjà passé
    -- reste un endroit où l'on est déjà passé. Seuls les événements PUBLIÉS
    -- comptent — une sortie privée ne se trahit pas par un défi.
    when 'new_locality' then
      return exists(
        select 1 from public.weekly_quest_faces_2026 f
        join public.capture_events_2026 e on e.id=f.event_id and e.status='published'
        where f.owner_id=p_user_id and f.activity=p_activity
          and f.closed_at>=ws and f.closed_at<we
          and not exists(
            select 1 from public.weekly_quest_faces_2026 old
            join public.capture_events_2026 oe on oe.id=old.event_id and oe.status='published'
            where old.owner_id=p_user_id and old.locality=f.locality and old.closed_at<ws));
    -- « Deux boucles distinctes cette semaine », au sens de la déduplication
    -- du §7.4 : refaire deux fois la même boucle ne compte que pour une.
    when 'distinct_loops' then
      return (select count(distinct f.signature) from public.weekly_quest_faces_2026 f
        join public.capture_events_2026 e on e.id=f.event_id and e.status='published'
        where f.owner_id=p_user_id and f.activity=p_activity
          and f.closed_at>=ws and f.closed_at<we)>=q.threshold;
    -- « Une sortie de groupe consentie et validée. » Consentie : j'ai répondu
    -- « je viens » AVANT le départ, de ma propre main. Validée : le rendez-vous
    -- a réellement commencé, il n'a pas été annulé, au moins deux membres du
    -- crew y allaient dont un autre que l'organisateur, et j'ai enregistré une
    -- activité de la bonne discipline autour de l'heure annoncée.
    when 'validated_group_outing' then
      return exists(
        select 1 from public.crew_events ev
        join public.crew_event_rsvps mine on mine.event_id=ev.id and mine.user_id=p_user_id and mine.choice='coming'
        where ev.activity=p_activity and ev.cancelled_at_2026 is null and ev.starts_at is not null
          and ev.starts_at>=ws and ev.starts_at<we and ev.starts_at<=now() and mine.updated_at<=ev.starts_at
          and (select count(distinct r.user_id) from public.crew_event_rsvps r
               join public.crew_members m on m.user_id=r.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where r.event_id=ev.id and r.choice='coming')>=rule.group_outing_minimum_participants
          and exists(select 1 from public.crew_event_rsvps other
               join public.crew_members m on m.user_id=other.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where other.event_id=ev.id and other.choice='coming' and other.user_id is distinct from ev.created_by)
          -- 0197 — une sortie « sport seulement » ne valide AUCUNE quête : son
          -- propriétaire a choisi de la garder dans une discipline que la
          -- mesure contredisait, et ce choix vaut pour tout ce qui récompense.
          and exists(select 1 from public.runs r2 where r2.user_id=p_user_id and r2.ruleset_version='2026.1'
               and r2.sport_only_reason_2026 is null
               and r2.activity=p_activity and r2.started_at is not null
               and r2.started_at>=ev.starts_at-make_interval(hours=>rule.group_outing_proximity_hours)
               and r2.started_at<=ev.starts_at+make_interval(hours=>rule.group_outing_proximity_hours)));
    -- « Une journée course ET une journée vélo » : deux journées DIFFÉRENTES,
    -- comme le dit la famille Double pratique du §7.4.
    when 'run_day_and_bike_day' then
      return exists(select 1 from public.weekly_quest_active_days_2026(p_user_id,p_week_start) a
                    where a.has_run)
         and exists(select 1 from public.weekly_quest_active_days_2026(p_user_id,p_week_start) b
                    where b.has_bike)
         and (select count(distinct d.day) from public.weekly_quest_active_days_2026(p_user_id,p_week_start) d
              where d.has_run or d.has_bike)>=2;
    -- « Deux journées actives », jamais trois : le plafond XP est déjà à 3
    -- (§7.1), et 0165 refuse structurellement un seuil qui l'atteindrait.
    when 'active_days' then
      return (select count(*) from public.weekly_quest_active_days_2026(p_user_id,p_week_start))>=q.threshold;
    -- « Proposer une sortie ouverte à ton crew » — avec de VRAIS participants
    -- (§7.4 : « avec validation et antispam »). Créer dix rendez-vous vides ne
    -- valide rien.
    when 'hosted_open_outing' then
      return exists(
        select 1 from public.crew_events ev
        where ev.created_by=p_user_id and ev.activity=p_activity and ev.cancelled_at_2026 is null
          and ev.starts_at is not null and ev.starts_at>=ws and ev.starts_at<we and ev.starts_at<=now()
          and (select count(distinct r.user_id) from public.crew_event_rsvps r
               join public.crew_members m on m.user_id=r.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where r.event_id=ev.id and r.choice='coming')>=rule.group_outing_minimum_participants
          and exists(select 1 from public.crew_event_rsvps other
               join public.crew_members m on m.user_id=other.user_id and m.crew_id=ev.crew_id and m.left_at is null
               where other.event_id=ev.id and other.choice='coming' and other.user_id is distinct from ev.created_by));
    else return false;
  end case;
end $$;
revoke all on function public.weekly_quest_satisfied_2026(uuid,text,date,text) from public,anon,authenticated;
grant execute on function public.weekly_quest_satisfied_2026(uuid,text,date,text) to service_role;

-- ── 6. LE FAIT, DANS LA BOÎTE DE RÉCEPTION ─────────────────────────────────
-- Catalogue de 0192 §2, repris TEL QUEL, avec une ligne de plus. Le test PGlite
-- de 0192 relit la source TypeScript et compare : `NOTIFICATION_EVENTS_2026`
-- doit porter le même fait, avec le même emoji et la même priorité.
--
-- TRANSACTIONNEL, et priorité 2 : c'est l'état d'une chose que le joueur vient
-- de faire, pas une relance. Sans ce message, quelqu'un qui a répondu « garder »
-- sur un écran, en sueur, ne reverrait la conséquence qu'en ouvrant le journal
-- par hasard. L'emoji ⚠️ est celui de l'avertissement du catalogue de crew : il
-- ne prétend pas être neuf, il dit la même chose — « regarde ça ».
create or replace function public.notification_kinds_2026()
returns table(
  kind text, category text, transactional boolean, priority smallint,
  emoji text, family text, event_id_prefix text, deep_link text)
language sql immutable set search_path = public, pg_temp as $$
  select *
  from (values
    ('capture_published','sport',false,3,'🏁','capture','capture_published:','/course/{runId}'),
    ('result_pending','results',true,2,'⏳','result','result_pending:','/course/{runId}'),
    ('result_ready','results',true,1,'✅','result','result_ready:','/course/{runId}'),
    ('result_refused','results',true,1,'⛔','result','result_refused:','/course/{runId}'),
    ('run_sport_only','results',true,2,'⚠️','result','run_sport_only:','/course/{runId}'),
    ('weekly_quest_done','sport',false,3,'🎯','reward','weekly_quest_done:','/defis-semaine'),
    ('level_reward','results',false,3,'🏅','reward','level_reward:','/season'),
    ('referral_completed','results',false,3,'🎁','reward','referral_completed:','/parrainage'),
    ('crew_joined','crew',false,2,'👋','crew','crew_joined:','/crew'),
    ('crew_member_joined','crew',false,3,'👥','crew','crew_member_joined:','/crew'),
    ('crew_announcement','crew',false,3,'📣','crew','crew_announcement:','/crew-feed'),
    ('crew_challenge_started','crew',false,3,'⚔️','crew','crew_challenge_started:','/crew-challenges'),
    ('crew_challenge_ended','crew',false,2,'🏆','crew','crew_challenge_ended:','/crew-challenges'),
    ('crew_outing_proposed','events',false,3,'📅','event','crew_outing_proposed:','/crew-sortie'),
    ('crew_outing_changed','events',true,2,'🔁','event','crew_outing_changed:','/crew-sortie'),
    ('crew_outing_cancelled','events',true,1,'🚫','event','crew_outing_cancelled:','/crew-sortie'),
    ('application_received','crew',false,3,'📥','crew','crew_application_received:','/crew-gestion'),
    ('invited','crew',false,2,'✉️','crew','crew_invited:','/crew-rejoindre'),
    ('charter_updated','crew',false,4,'📜','crew','crew_charter_updated:','/crew-regles'),
    ('warning_issued','crew',true,2,'⚠️','crew','crew_warning_issued:','/crew-ma-situation'),
    ('removed','crew',true,1,'🚪','crew','crew_removed:',null),
    ('dissolved','crew',true,1,'📕','crew','crew_dissolved:',null)
  ) as c(kind, category, transactional, priority, emoji, family, event_id_prefix, deep_link)
$$;

-- ── 7. LE PRODUCTEUR ───────────────────────────────────────────────────────
-- Sur `runs` et non sur `capture_events_2026` : le trigger de 0193 §2 ne réagit
-- à un INSERT que lorsque le statut vaut `pending`, donc il reste MUET pour une
-- sortie « sport seulement » (insérée directement en `rejected`). C'est voulu :
-- lui faire dire `result_refused` annoncerait un REFUS là où il y a eu un choix.
--
-- BEST EFFORT, comme tous les producteurs de 0193 : une boîte indisponible ne
-- doit jamais faire échouer l'ingestion d'une sortie déjà enregistrée.
create function public.notify_run_sport_only_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.sport_only_reason_2026 is null or new.user_id is null then return null; end if;
  -- Un UPDATE qui ne CHANGE pas le motif ne réannonce rien. L'unicité de
  -- `event_id` le garantirait déjà ; le dire ici évite un aller-retour inutile.
  if tg_op = 'UPDATE' and old.sport_only_reason_2026 is not distinct from new.sport_only_reason_2026 then
    return null;
  end if;
  begin
    perform public.notification_inbox_write_2026(new.user_id, 'run_sport_only', new.id::text,
      jsonb_build_object('runId', new.id, 'activity', new.activity), now());
  exception when others then
    raise warning 'notify_run_sport_only_2026: boîte indisponible (%)', new.id;
  end;
  return null;
end $$;
revoke all on function public.notify_run_sport_only_2026() from public,anon,authenticated;

create trigger notify_run_sport_only_2026
  after insert or update of sport_only_reason_2026 on public.runs
  for each row when (new.sport_only_reason_2026 is not null)
  execute function public.notify_run_sport_only_2026();

comment on function public.notify_run_sport_only_2026() is
  'Annonce « Sortie gardée · elle compte pour toi, pas pour le terrain » quand runs.sport_only_reason_2026 devient non nul (0197). Best effort : une boîte indisponible n''échoue jamais une ingestion.';
