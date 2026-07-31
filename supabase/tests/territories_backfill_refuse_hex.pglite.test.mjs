/**
 * GRYD — Vague 10.1 : le trigger refuse un backfill hexagonal.
 * PGlite isolé (ne rejoue pas toute la lignée) — prouve la RÈGLE, pas la RLS.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const SQL_PATH = join(MIGRATIONS, '0100_territories_backfill_refuse_hex.sql');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    process.exit(1);
  }
  console.log(`ok  ${msg}`);
}

console.log('territories — 0100 refuse hex backfill (PGlite)\n');
assert(existsSync(SQL_PATH), '0100_territories_backfill_refuse_hex.sql présent');

const db = new PGlite();
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.territories (
      id uuid primary key default gen_random_uuid(),
      algorithm_version text not null,
      geometry jsonb not null default '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}'::jsonb
    );
    create table public.runs (
      id uuid primary key,
      polyline_masked text
    );
    create view public.territories_backfill_gap as
      select
        null::uuid as run_id,
        'run'::text as activity,
        null::uuid as owner_user_id,
        null::text as city_id,
        0::bigint as cell_count,
        now() as first_claimed_at,
        now() as last_claimed_at,
        false as attributable_to_run
      where false;
  `);

  await db.exec(readFileSync(SQL_PATH, 'utf8'));
  assert(true, 'migration 0100 s’applique');

  await db.query(`insert into public.territories (algorithm_version) values ('ingest-loop@1')`);
  assert(true, 'algorithm_version légitime accepté');

  let refused = false;
  try {
    await db.query(`insert into public.territories (algorithm_version) values ('backfill-hex@1')`);
  } catch (e) {
    refused = /refuse|hex|H3|constitution/i.test(String(e.message ?? e));
  }
  assert(refused, 'backfill-hex@1 refusé');

  refused = false;
  try {
    await db.query(`insert into public.territories (algorithm_version) values ('h3-union@1')`);
  } catch {
    refused = true;
  }
  assert(refused, 'h3-union@1 refusé');

  const ready = await db.query(`select count(*)::int as n from public.territories_backfill_trace_ready`);
  assert(ready.rows[0].n === 0, 'vue trace_ready vide sans polyline');

  console.log('\nPASS 0100');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await db.close();
}
