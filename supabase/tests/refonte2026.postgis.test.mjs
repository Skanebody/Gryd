/** Real PostgreSQL + PostGIS only. Never treats an unavailable database as green.
 * GRYD_TEST_DATABASE_URL must point at an EMPTY disposable loopback database.
 * All fixtures, migrations and assertions roll back together. No hosted target.
 */
import { TERRITORY_RULES_2026 } from '../functions/_shared/game-rules.ts';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const target=process.env.GRYD_TEST_DATABASE_URL;
if(!target || !['localhost','127.0.0.1','[::1]'].includes(new URL(target).hostname)) {
  console.error('NON EXÉCUTÉ : fournir GRYD_TEST_DATABASE_URL vers une base PostgreSQL/PostGIS locale vide.');
  process.exit(2);
}
const bootstrap=`
begin;
do $$ begin if to_regclass('public.runs') is not null then raise exception 'Disposable EMPTY database required'; end if; end $$;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists auth;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
grant usage on schema auth,public to anon,authenticated,service_role;
create table public.users(id uuid primary key,pseudo text unique,created_at timestamptz default now(),deletion_requested_at timestamptz);
create table public.crews(id uuid primary key,name text);
create table public.crew_members(crew_id uuid references public.crews(id),user_id uuid references public.users(id),role text,joined_at timestamptz default '2025-01-01',left_at timestamptz);
create table public.user_blocks(blocker_id uuid references public.users(id),blocked_pseudo text);
create table public.user_profiles(user_id uuid primary key references public.users(id),map_sharing text);
create table public.friendships(requester_id uuid,addressee_id uuid,status text);
create table public.runs(id uuid primary key,user_id uuid references public.users(id),client_run_id uuid,
  activity text,source text,started_at timestamptz,created_at timestamptz default now(),status text,xp_awarded integer not null default 0);
create table public.hex_claims(run_id uuid);
create table public.territories(source_run_id uuid);
create table public.no_capture_zones(geojson jsonb);
create table public.privacy_zones(user_id uuid,center_h3_res8 bigint,radius_m integer);
create function public.crew_stats(text,integer) returns jsonb language sql as $$ select '{}'::jsonb from public.runs r where r.status in ('valid', 'partial') $$;
`;
const assertions=`
select set_config('request.jwt.claim.role','service_role',true);
insert into public.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.user_profiles values('00000000-0000-4000-8000-000000000001','simplified'),('00000000-0000-4000-8000-000000000002','simplified');
insert into public.runs(id,user_id,client_run_id,activity,source,started_at,status,ruleset_version,shared_map_consent_2026)
select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  ('00000000-0000-4000-8000-'||lpad((case when n=1 then 1 else 2 end)::text,12,'0'))::uuid,
  gen_random_uuid(),case when n=4 then 'bike' else 'run' end,'gps',now()-interval '2 hours','valid','2026.1',n<>3
from generate_series(1,5) n;
create function pg_temp.face(k text,x float8,closed timestamptz) returns jsonb language sql as $$
select jsonb_build_array(jsonb_build_object('key',k,'closedAt',closed,'geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(x,48,x+0.01,48.01,4326))::jsonb)) $$;
-- A owns a square. B's delayed overlapping square causes no loss before publication.
select public.stage_capture_2026('10000000-0000-4000-8000-000000000001',pg_temp.face('0',2,now()-interval '110 minutes'),'[]',now()-interval '1 minute',0,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
select public.publish_capture_events_2026();
create temp table initial as select owner_id,extensions.ST_Area(geometry::extensions.geography) area from public.ownership_2026;
select public.stage_capture_2026('10000000-0000-4000-8000-000000000002',pg_temp.face('0',2.005,now()-interval '100 minutes'),'[]',now()+interval '30 minutes',0,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
do $$ begin
 if (select count(*) from public.ownership_2026)<>1 then raise exception 'Delayed loss leaked'; end if;
 if (public.capture_result_2026('10000000-0000-4000-8000-000000000002')->'newTerrainM2')<>'null'::jsonb then raise exception 'Pending acquisition fabricated'; end if;
end $$;
-- Private capture is inert; same shape in Bike never transfers Run ownership.
select public.stage_capture_2026('10000000-0000-4000-8000-000000000003',pg_temp.face('0',2,now()-interval '90 minutes'),'[]',now()-interval '1 minute',0,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
select public.stage_capture_2026('10000000-0000-4000-8000-000000000004',pg_temp.face('0',2,now()-interval '90 minutes'),'[]',now()-interval '1 minute',0,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
select public.publish_capture_events_2026();
do $$ begin
 if (select count(*) from public.ownership_2026 where activity='run')<>1 then raise exception 'Private or Bike altered Run'; end if;
end $$;
update public.capture_events_2026 set publish_after=now()-interval '1 minute' where run_id='10000000-0000-4000-8000-000000000002';
select public.publish_capture_events_2026();
do $$ declare result jsonb; begin
 if exists(select 1 from public.ownership_2026 a join public.ownership_2026 b on a.event_id<b.event_id and a.activity=b.activity
   where extensions.ST_Area(extensions.ST_Intersection(a.geometry,b.geometry)::extensions.geography)>0.01) then raise exception 'Exclusive overlap'; end if;
 if not exists(select 1 from public.ownership_2026 o join initial i using(owner_id) where o.activity='run' and extensions.ST_Area(o.geometry::extensions.geography)<i.area and extensions.ST_Area(o.geometry::extensions.geography)>0) then raise exception 'Partial remainder lost'; end if;
 result:=public.capture_result_2026('10000000-0000-4000-8000-000000000002');
 if abs((result->>'newTerrainM2')::float8-(result->>'neutralTakenM2')::float8-(result->>'takenFromOthersM2')::float8)>0.1 then raise exception 'Net geographic accounting'; end if;
end $$;
-- Receipt distinguishes original capture from the remainder after a partial reclaim.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ declare r jsonb; m jsonb; begin
 r:=public.capture_result_2026('10000000-0000-4000-8000-000000000001');
 if not ((r->>'remainingTerrainM2')::float8>0 and (r->>'remainingTerrainM2')::float8<(r->>'publishedAreaM2')::float8) then raise exception 'Capture remainder must retain partial ownership'; end if;
 m:=public.get_ownership_2026('run',1.9,47.9,2.1,48.1);
 if m->>'contract'<>'ownership.2026.2' or m->>'activity'<>'run' or jsonb_array_length(m->'features')<>2 then raise exception 'Ownership contract or sport mismatch'; end if;
 if exists(select 1 from jsonb_array_elements(m->'features') f where f->'properties'->>'activity'<>'run' or
   (f->'properties'->>'role'='others' and f->'properties'->'ownerId'<>'null'::jsonb)) then raise exception 'Foreign owner identity exposed or sport contaminated'; end if;
 if not exists(select 1 from jsonb_array_elements(m->'features') f where f->'properties'->>'role'='mine' and
   (f->'properties'->>'areaM2')::float8<(f->'properties'->>'capturedAreaM2')::float8) then raise exception 'Map lost original vs remaining geometry'; end if;
end $$;
insert into public.crews values('40000000-0000-4000-8000-000000000003','Current grouping fixture');
insert into public.crew_members(crew_id,user_id,role)
select '40000000-0000-4000-8000-000000000003',id,'runner' from public.users;
do $$ declare m jsonb; begin
 m:=public.get_ownership_2026('run',1.9,47.9,2.1,48.1);
 if m->'crew'->>'name'<>'Current grouping fixture' or not exists(select 1 from jsonb_array_elements(m->'features') f where f->'properties'->>'role'='crew') then raise exception 'Real current membership was not grouped'; end if;
end $$;
insert into public.friendships values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','blocked');
do $$ declare m jsonb; begin
 m:=public.get_ownership_2026('run',1.9,47.9,2.1,48.1);
 if jsonb_array_length(m->'features')<>1 or m->'features'->0->'properties'->>'role'<>'mine' then raise exception 'Blocked member public terrain leaked'; end if;
end $$;
delete from public.friendships;
update public.crew_members set left_at=now() where user_id='00000000-0000-4000-8000-000000000002';
-- An older upload, arriving last, has no priority over the physically later B.
create temp table before_late as select event_id,extensions.ST_AsEWKB(geometry) geometry from public.ownership_2026;
select public.stage_capture_2026('10000000-0000-4000-8000-000000000005',pg_temp.face('0',2,now()-interval '115 minutes'),'[]',now()-interval '1 minute',0,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
select public.publish_capture_events_2026();
do $$ begin
 if exists((select event_id,extensions.ST_AsEWKB(geometry) from public.ownership_2026 except select * from before_late)
   union all (select * from before_late except select event_id,extensions.ST_AsEWKB(geometry) from public.ownership_2026)) then raise exception 'Upload order changed possession'; end if;
end $$;
-- Withdrawal preserves A's remainder and does not revive the overlapped portion.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.withdraw_capture_2026('10000000-0000-4000-8000-000000000002');
select public.rebuild_ownership_2026('run');
do $$ begin
 if (public.capture_result_2026('10000000-0000-4000-8000-000000000002')->>'remainingTerrainM2')::float8<>0 then raise exception 'Withdrawal remainder is not zero'; end if;
 if exists(select 1 from public.ownership_2026 where activity='run' and extensions.ST_Contains(geometry,extensions.ST_SetSRID(extensions.ST_MakePoint(2.007,48.005),4326))) then raise exception 'Withdrawn terrain resurrected'; end if;
 begin insert into public.hex_claims values('10000000-0000-4000-8000-000000000001'); raise exception 'Legacy engine accepted activity'; exception when raise_exception then if SQLERRM<>'legacy_capture_forbidden_for_2026_activity' then raise; end if; end;
end $$;
-- Automatic endpoint masks are media-only (helper unit test). Empty personal masks
-- allow a normal closed face; one explicit sensitive zone blocks the WHOLE face.
insert into public.runs(id,user_id,client_run_id,activity,source,started_at,status,ruleset_version,shared_map_consent_2026)
select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-4000-8000-000000000001',gen_random_uuid(),'run','gps',now()-interval '2 hours','valid','2026.1',true from generate_series(6,7) n;
select public.stage_capture_2026('10000000-0000-4000-8000-000000000006',pg_temp.face('0',2.04,now()-interval '80 minutes'),'[]',now()+interval '30 minutes',5000,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
select public.stage_capture_2026('10000000-0000-4000-8000-000000000007',pg_temp.face('0',2.04,now()-interval '70 minutes'),'[{"lat":48,"lng":2.04,"radiusM":250}]',now()+interval '30 minutes',5000,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
do $$ begin
 if (select status from public.capture_events_2026 where run_id='10000000-0000-4000-8000-000000000006')<>'scheduled' then raise exception 'Normal loop incorrectly blocked by media endpoints'; end if;
 if not exists(select 1 from public.capture_events_2026 where run_id='10000000-0000-4000-8000-000000000007' and status='private' and reason='protected_place' and extensions.ST_NumInteriorRings(extensions.ST_GeometryN(geometry,1))=0) then raise exception 'Sensitive face not wholly private'; end if;
end $$;
-- Recapturing one's own remaining footprint keeps the old outing's spatial
-- remainder even though canonical ownership is now attributed to a newer event.
create temp table remaining_before_self as select public.capture_result_2026('10000000-0000-4000-8000-000000000001') receipt;
insert into public.runs(id,user_id,client_run_id,activity,source,started_at,status,ruleset_version,shared_map_consent_2026)
values('10000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000001',gen_random_uuid(),'run','gps',now()-interval '1 hour','valid','2026.1',true);
select public.stage_capture_2026('10000000-0000-4000-8000-000000000008',
  (select jsonb_build_array(jsonb_build_object('key','self','closedAt',now()-interval '40 minutes','geometry',extensions.ST_AsGeoJSON(geometry)::jsonb))
   from public.ownership_2026 where owner_id='00000000-0000-4000-8000-000000000001' and activity='run'),
  '[]',now()-interval '1 minute',0,24,true,false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
select public.publish_capture_events_2026();
do $$ declare r jsonb; begin
 r:=public.capture_result_2026('10000000-0000-4000-8000-000000000001');
 if abs((r->>'remainingTerrainM2')::float8-(select (receipt->>'remainingTerrainM2')::float8 from remaining_before_self))>0.1 then raise exception 'Self recapture incorrectly erased historical remaining area'; end if;
 if (public.capture_result_2026('10000000-0000-4000-8000-000000000008')->>'newTerrainM2')::float8>0.1 then raise exception 'Self recapture invented a new gain'; end if;
end $$;
-- Independent XP CAS: retries do not credit again or overwrite a newer version.
select public.record_progress_evidence_2026('10000000-0000-4000-8000-000000000001','{"canonicalId":"one"}');
do $$ declare v bigint; a jsonb; begin
 select version into v from public.progress_accounts_2026 where user_id='00000000-0000-4000-8000-000000000001';
 a:=public.commit_progress_2026('00000000-0000-4000-8000-000000000001',v,'{"totalXp":100,"days":[],"collections":[]}','10000000-0000-4000-8000-000000000001');
 if a->>'xpDelta'<>'100' then raise exception 'First XP'; end if;
 a:=public.commit_progress_2026('00000000-0000-4000-8000-000000000001',v,'{"totalXp":100,"days":[],"collections":[]}','10000000-0000-4000-8000-000000000001');
 if a->>'xpDelta'<>'0' then raise exception 'Duplicate XP'; end if;
 if a->>'runXpAwarded'<>'100' then raise exception 'Retry overwrote activity XP receipt'; end if;
 a:=public.commit_progress_2026('00000000-0000-4000-8000-000000000001',v-1,'{"totalXp":200}');
 if (a->>'committed')::boolean then raise exception 'Stale overwrite'; end if;
end $$;
set local role authenticated;
select public.get_ownership_2026('run',1.9,47.9,2.1,48.1);
do $$ begin
 begin perform * from public.capture_events_2026; raise exception 'Private event readable'; exception when insufficient_privilege then null; end;
 begin insert into public.ownership_2026 default values; raise exception 'Client ownership writable'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
`;
const challengeAssertions=`
-- A locally reviewed fixture, never inserted in the user's real database.
insert into public.users(id,pseudo,created_at)
select ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'fixture_challenge_'||n,'2025-01-01' from generate_series(1,10) n;
insert into public.crews values('40000000-0000-4000-8000-000000000001','Fixture A'),('40000000-0000-4000-8000-000000000002','Fixture B');
insert into public.crew_members(crew_id,user_id,role)
select ('40000000-0000-4000-8000-'||lpad((case when n<=5 then 1 else 2 end)::text,12,'0'))::uuid,
  ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,case when n in(1,6) then 'founder' else 'runner' end from generate_series(1,10) n;
create temp table fixture_arena as select jsonb_build_array(
  jsonb_build_object('id','inside','title','Enclosed without trace','geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(2.004,48.004,2.006,48.006,4326))::jsonb),
  jsonb_build_object('id','edge','title','Real bottom edge','geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(1.9999,47.9999,2.0101,48.0001,4326))::jsonb),
  jsonb_build_object('id','outside','title','Outside','geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(2.02,48.02,2.03,48.03,4326))::jsonb)
) sectors;
select public.configure_challenge_arena_2026('fixture_run','Fixture Run','run','Europe/Paris',sectors,'Local test review',now()) from fixture_arena;
select public.configure_challenge_arena_2026('fixture_bike','Fixture Bike','bike','Europe/Paris',sectors,'Local test review',now()) from fixture_arena;
insert into public.crew_challenges_2026(id,client_id,created_by,arena_id,title,activity,time_zone,starts_at,ends_at,ranked_week,sectors,status)
select ('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,gen_random_uuid(),'20000000-0000-4000-8000-000000000001',
  case when n=1 then 'fixture_run' else 'fixture_bike' end,'Spatial fixture',case when n=1 then 'run' else 'bike' end,'Europe/Paris',
  (date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks') at time zone 'Europe/Paris',
  (date_trunc('week',now() at time zone 'Europe/Paris')-interval '1 week') at time zone 'Europe/Paris',
  (date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks')::date,sectors,'active'
from generate_series(1,2) n,fixture_arena;
insert into public.challenge_teams_2026
select ch.id,c.id,case when c.name='Fixture A' then 0 else 1 end,ch.starts_at-interval '1 day',ch.starts_at-interval '1 day',ch.starts_at-interval '1 day'
from public.crew_challenges_2026 ch cross join public.crews c;
insert into public.challenge_roster_2026(challenge_id,crew_id,player_id,user_id,activity,ranked_week,consent,consented_at)
select ch.id,m.crew_id,m.user_id,m.user_id,ch.activity,ch.ranked_week,m.user_id<>'20000000-0000-4000-8000-000000000002',ch.starts_at-interval '1 day'
from public.crew_challenges_2026 ch cross join public.crew_members m;
insert into public.runs(id,user_id,client_run_id,activity,source,started_at,ended_at_2026,created_at,status,ruleset_version,shared_map_consent_2026)
select ('60000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  gen_random_uuid(),case when n=6 then 'bike' else 'run' end,'gps',ch.starts_at+interval '12 hours',ch.starts_at+interval '12 hours 20 minutes',
  case when n=7 then ch.ends_at+interval '18 hours' when n=8 then ch.ends_at+interval '24 hours 1 second' else ch.starts_at+interval '12 hours 30 minutes' end,
  'valid','2026.1',false from generate_series(1,8) n join public.crew_challenges_2026 ch on ch.activity=case when n=6 then 'bike' else 'run' end;
do $$ declare r public.runs; segments jsonb; before_count integer; begin
  for r in select * from public.runs where id::text like '60000000-%' order by id loop
    segments:=case when r.id='60000000-0000-4000-8000-000000000004' then
      '[{"type":"LineString","coordinates":[[2.004,48.004],[2.006,48.006]]}]'::jsonb
      when r.id='60000000-0000-4000-8000-000000000005' then
      '[{"type":"LineString","coordinates":[[1.99,48],[1.999,48]]},{"type":"LineString","coordinates":[[2.011,48],[2.02,48]]}]'::jsonb
      else '[{"type":"LineString","coordinates":[[2,48],[2.01,48],[2.01,48.01],[2,48.01],[2,48]]}]'::jsonb end;
    perform public.stage_game_activity_2026(r.id,pg_temp.face('0',2,r.started_at+interval '15 minutes'),segments,'[]',now()+interval '30 minutes',0,24,
      r.id<>'60000000-0000-4000-8000-000000000003',false,${TERRITORY_RULES_2026.clockToleranceSeconds},null);
  end loop;
  if (select count(*) from public.challenge_contributions_2026)<>2 then raise exception 'Only verified local Run and admissible late Run should contribute'; end if;
  if exists(select 1 from public.challenge_contributions_2026 where sector_id<>'edge') then raise exception 'Enclosing a remote sector produced points'; end if;
  if exists(select 1 from public.challenge_contributions_2026 where activity_key in(
    '60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000006','60000000-0000-4000-8000-000000000008')) then
    raise exception 'Consent, provenance, actual boundary, GPS break, Bike threshold or sync window bypassed'; end if;
  if exists(select 1 from public.ownership_2026 where owner_id::text like '20000000-%') then raise exception 'Private challenge participation leaked a public polygon'; end if;
  if exists(select 1 from public.capture_events_2026 where owner_id::text like '20000000-%' and status<>'private') then raise exception 'Private audience changed'; end if;
end $$;
`;
const dir=mkdtempSync(join(tmpdir(),'gryd-postgis-2026-'));
try {
  const sql=join(dir,'verify.sql');
  writeFileSync(sql,bootstrap+readFileSync(new URL('../migrations/0118_refonte_2026_polygon_authority.sql',import.meta.url),'utf8')+
    readFileSync(new URL('../migrations/0119_refonte_2026_progress_ledger.sql',import.meta.url),'utf8')+
    readFileSync(new URL('../migrations/0122_refonte_2026_crew_challenges.sql',import.meta.url),'utf8')+
    readFileSync(new URL('../migrations/0123_refonte_2026_territory_read_model.sql',import.meta.url),'utf8')+
    readFileSync(new URL('../migrations/0155_capture_admission_2026.sql',import.meta.url),'utf8')+
    assertions.replace('\nrollback;',challengeAssertions+'\nrollback;'));
  const result=spawnSync('psql',[target,'-X','-v','ON_ERROR_STOP=1','-f',sql],{stdio:'inherit'});
  if(result.error) { console.error(`NON EXÉCUTÉ : ${result.error.message}`); process.exitCode=2; }
  else process.exitCode=result.status??1;
} finally { rmSync(dir,{recursive:true,force:true}); }
