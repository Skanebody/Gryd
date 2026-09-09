/**
 * GRYD — 0157 : lire la carte a un budget, et ce qui manque se dit.
 *
 * ÉTAPE 0 — le défaut est lu dans le fichier DÉPLOYÉ (0126) : sa lecture de
 * possession n'a ni `LIMIT`, ni simplification, ni le moindre mot sur ce
 * qu'elle a laissé de côté. Au zoom 3,9 le client demande la France entière.
 *
 * CE QUE PGlite PROUVE : les gardes qui s'exécutent AVANT tout travail spatial
 * (fenêtre, discipline, zoom, authentification), les privilèges, la
 * compatibilité d'appel (deux signatures), et l'absence de dérive entre les
 * littéraux SQL et `MAP_READ_RULES_2026`.
 * CE QU'IL NE PROUVE PAS : PGlite n'a pas PostGIS — aucune zone n'est lue,
 * aucune simplification n'est calculée, aucune troncature n'est mesurée ici.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { MAP_READ_RULES_2026 } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
const read = (n) => readFileSync(new URL(`../migrations/${n}`, import.meta.url), 'utf8');
const M0126 = read('0126_refonte_2026_territory_owner_identity.sql');
const M0157 = read('0157_ownership_read_budget_2026.sql');
const USER = '00000000-0000-4000-8000-000000000001';
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const reject = (sql, args = []) => assert.rejects(() => db.query(sql, args), /invalid_viewport/);

try {
  await test('ÉTAPE 0 — 0126 lit sans borne, sans simplification et sans le dire', () => {
    const fn = M0126.slice(M0126.indexOf('create or replace function public.get_ownership_2026'));
    assert.ok(!/\blimit\b/i.test(fn), '0126 n’a aucun plafond de zones');
    assert.ok(!/ST_Simplify/i.test(fn), '0126 sert toujours la géométrie métier complète');
    assert.ok(!/truncated/i.test(fn), '0126 ne dit jamais ce qu’il a laissé de côté');
    assert.ok(!/p_zoom/.test(fn), '0126 ignore le zoom demandé');
  });

  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create domain extensions.geometry as text; -- PGlite n'a pas PostGIS : nom du type seulement.
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,extensions to authenticated,service_role;
    create table public.users(id uuid primary key, deletion_requested_at timestamptz);
    create table public.user_profiles(user_id uuid primary key, map_sharing text);
    create table public.crews(id uuid primary key, name text);
    create table public.crew_members(crew_id uuid, user_id uuid, left_at timestamptz);
    create table public.friendships(requester_id uuid, addressee_id uuid, status text);
    create table public.capture_events_2026(id uuid primary key, status text, geometry extensions.geometry);
    create table public.ownership_2026(event_id uuid primary key, owner_id uuid, activity text,
      geometry extensions.geometry, controlled_since timestamptz);
    create function public.territory_role_2026(uuid,uuid) returns text language sql stable as $$ select 'others' $$;
    create function public.territory_owner_identity_2026(uuid,uuid) returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create function public.challenge_pair_blocked_2026(uuid,uuid) returns boolean language sql stable as $$ select false $$;
  `);
  await test('0157 s’applique telle quelle et ne crée aucune donnée', async () => {
    await db.exec(M0157);
    assert.equal(await one('select count(*)::int from public.ownership_2026'), 0);
  });

  await test('la compatibilité d’appel est préservée : deux signatures, une seule règle', async () => {
    assert.equal(await one(`select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='get_ownership_2026'`), 2);
    const wrapper = M0157.slice(M0157.indexOf('create or replace function public.get_ownership_2026(p_activity text,p_west float8,p_south float8,p_east float8,p_north float8)'));
    assert.ok(wrapper.includes('null::float8'), 'sans zoom, aucune simplification');
    assert.ok(wrapper.includes('public.get_ownership_2026(p_activity,p_west,p_south,p_east,p_north,'),
      'l’enveloppe délègue, elle ne duplique pas la règle');
  });
  await test('le contrat NE change PAS de nom : la liste blanche du client refuse l’inconnu', () => {
    assert.ok(M0157.includes("'contract','ownership.2026.3'"),
      'renommer le contrat viderait la carte de tous les téléphones déjà déployés');
  });
  await test('la fenêtre est vérifiée AVANT tout travail spatial', async () => {
    await as(null, () => reject("select get_ownership_2026('run',2,48,3,49)"));
    for (const args of [[null, 2, 48, 3, 49], ['run', null, 48, 3, 49], ['run', 2, null, 3, 49], ['run', 2, 48, null, 49], ['run', 2, 48, 3, null]])
      await as(USER, () => reject('select get_ownership_2026($1,$2,$3,$4,$5)', args));
    for (const args of [['swim', 2, 48, 3, 49], ['run', 3, 48, 2, 49], ['run', 2, 49, 3, 48], ['run', -181, 48, 3, 49],
      ['run', 2, 48, 181, 49], ['run', 2, 48, 3, 91], ['run', 'NaN', 48, 3, 49], ['run', 2, 48, 'Infinity', 49]])
      await as(USER, () => reject('select get_ownership_2026($1,$2,$3,$4,$5)', args));
  });
  await test('un zoom hors du monde échoue fermé, il n’est pas deviné', async () => {
    for (const zoom of [-1, 23, 'NaN', 'Infinity'])
      await as(USER, () => reject("select get_ownership_2026('run',2,48,3,49,$1)", [zoom]));
  });
  await test('les trois budgets valent EXACTEMENT ceux de game-rules.ts', () => {
    const grab = (name) => {
      const m = new RegExp(`${name} constant (?:integer|float8):=([0-9.]+);`).exec(M0157);
      assert.ok(m, `${name} introuvable dans 0157`);
      return Number(m[1]);
    };
    assert.equal(grab('max_features'), MAP_READ_RULES_2026.maxFeaturesPerViewport,
      'dérive : MAP_READ_RULES_2026.maxFeaturesPerViewport');
    assert.equal(grab('screen_pixels'), MAP_READ_RULES_2026.simplifyScreenPixels,
      'dérive : MAP_READ_RULES_2026.simplifyScreenPixels');
    assert.equal(grab('full_detail_min_zoom'), MAP_READ_RULES_2026.fullDetailMinZoom,
      'dérive : MAP_READ_RULES_2026.fullDetailMinZoom');
  });
  await test('la tolérance est un pixel d’écran, dérivé du zoom et de rien d’autre', () => {
    assert.ok(M0157.includes('screen_pixels*360.0/(256.0*power(2.0,p_zoom))'),
      'le monde fait 256·2^zoom pixels pour 360° : la formule doit rester lisible');
    assert.ok(M0157.includes('p_zoom>=full_detail_min_zoom'), 'au-delà du seuil, aucune simplification');
  });
  await test('la surface annoncée reste celle de la géométrie MÉTIER (§5.5 règle 7)', () => {
    assert.ok(M0157.includes("'areaM2',ST_Area(k.geometry::geography)"),
      'l’aire ne doit jamais être mesurée sur le trait simplifié');
    assert.ok(M0157.includes("'capturedAreaM2',ST_Area(k.captured::geography)"), '');
    const simplify = M0157.indexOf('ST_SimplifyPreserveTopology');
    const area = M0157.indexOf("'areaM2',ST_Area");
    assert.ok(simplify > 0 && area > simplify, 'la simplification ne s’applique qu’à la géométrie envoyée');
  });
  await test('ce qui manque se DIT, au lieu de laisser croire que le terrain n’existe pas', () => {
    assert.ok(M0157.includes("'truncated',coalesce(max(k.available),0)>count(k.event_id)"), '');
    assert.ok(M0157.includes("'availableFeatures',coalesce(max(k.available),0)"), '');
    assert.ok(/order by c\.planar desc,c\.event_id limit max_features/.test(M0157),
      'les plus grandes zones d’abord, et un ordre stable pour départager');
  });
  await test('la lecture reste authentifiée, jamais anonyme', async () => {
    for (const s of ['get_ownership_2026(text,float8,float8,float8,float8)',
      'get_ownership_2026(text,float8,float8,float8,float8,float8)']) {
      assert.equal(await one('select has_function_privilege($1,$2,$3)', ['anon', s, 'EXECUTE']), false, s);
      assert.equal(await one('select has_function_privilege($1,$2,$3)', ['authenticated', s, 'EXECUTE']), true, s);
    }
  });
  await test('la publication est indexée : une fenêtre dense ne relit pas chaque événement', async () => {
    assert.equal(await one(`select count(*)::int from pg_indexes where schemaname='public'
      and indexname='capture_events_2026_published'`), 1);
    const def = await one("select indexdef from pg_indexes where indexname='capture_events_2026_published'");
    assert.ok(/WHERE \(status = 'published'/i.test(def) || /where status='published'/i.test(def),
      `index PARTIEL attendu, obtenu : ${def}`);
  });

  console.log(`\n${passed} vérifications PostgreSQL passées ; PostGIS NON exécuté sous PGlite (aucune zone lue, aucune troncature mesurée).`);
} finally { await db.close(); }
