// Applies the existing 0002–0099 lineage, then the real social cutover. The
// storage schema and 0107's scalar runs.ruleset_version column are fixtures;
// no HTTP gateway or execution of the PostGIS 0107 migration is claimed here.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();const dir=new URL('../migrations/',import.meta.url);
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema extensions;create function extensions.gen_random_bytes(int) returns bytea language sql as $$select decode(md5(random()::text),'hex')$$;
 alter default privileges in schema public grant all on tables to anon,authenticated;`);
 const skip=new Set(['0001_extensions.sql','0020_crew_realtime.sql','0038_sector_cron.sql','0039_core_crons.sql','0064_offensive_lifecycle.sql']);
 const files=readdirSync(dir).filter(name=>/^\d{4}_.*\.sql$/.test(name)&&Number(name.slice(0,4))<=99&&!skip.has(name)).sort();
 for(const file of files){const raw=readFileSync(new URL(file,dir),'utf8');const cron=raw.indexOf('select cron.schedule(');await db.exec(cron<0?raw:raw.slice(0,cron));}
 await db.exec(`alter table runs add column ruleset_version text not null default 'legacy';create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;`);
 await db.exec(readFileSync(new URL('0113_refonte_2026_social.sql',dir),'utf8'));
 for(const signature of ['public.crew_outing_context()','public.crew_outing_create(text,timestamp with time zone,text,text,text,text,integer)']){
  const value=(await db.query('select pg_get_functiondef($1::regprocedure) as definition',[signature])).rows[0].definition;
  assert.match(value,/e\.cancelled_at_2026 is null/);
 }
 assert.equal((await db.query("select public.my_social_profile_2026() as profile")).rows[0].profile,null);
 console.log(`ok - actual 0113 applies after ${files.length} existing migrations; old outing APIs exclude cancelled events`);
}finally{await db.close()}
