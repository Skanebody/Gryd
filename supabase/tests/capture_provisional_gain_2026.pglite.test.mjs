/**
 * GRYD — 0158 : le gain existe dès l'arrivée, étiqueté pour ce qu'il est.
 *
 * ÉTAPE 0 — le défaut est lu dans le fichier DÉPLOYÉ (0123) : ses quatre
 * surfaces ne viennent QUE des colonnes écrites par le rejeu de possession,
 * donc restent nulles jusqu'à la publication (30 min). Le test PostGIS de la
 * refonte le disait explicitement : « Pending acquisition fabricated » si un
 * `newTerrainM2` apparaissait avant publication.
 *
 * CE QUE PGlite NE PROUVE PAS : il n'a pas PostGIS. Aucune aire n'est calculée
 * ici. On prouve la structure de la décision (qui compte, quand, sous quel
 * drapeau), l'autorisation et les privilèges ; les surfaces appartiennent à
 * supabase/tests/refonte2026.postgis.test.mjs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
const read = (n) => readFileSync(new URL(`../migrations/${n}`, import.meta.url), 'utf8');
const M0123 = read('0123_refonte_2026_territory_read_model.sql');
const M0158 = read('0158_capture_provisional_gain_2026.sql');
const ids = [1, 2].map((n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);

try {
  await test('ÉTAPE 0 — 0123 ne sait lire que ce que le rejeu a déjà écrit', () => {
    const fn = M0123.slice(M0123.indexOf('create or replace function public.capture_result_2026'));
    assert.ok(fn.includes("'newTerrainM2',ST_Area(ST_UnaryUnion(ST_Collect(e.new_geometry))::geography)"),
      'la surface vient de la colonne du rejeu, nulle avant publication');
    assert.ok(!/provisional/i.test(fn), '0123 n’a aucune notion d’estimation');
    assert.ok(!/status='scheduled'/.test(fn), '0123 ne regarde jamais les faces encore programmées');
  });

  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create domain extensions.geometry as text; -- PGlite n'a pas PostGIS : nom du type seulement.
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    grant usage on schema auth,extensions to authenticated,service_role;
    create table public.runs(id uuid primary key, user_id uuid, activity text,
      game_status_2026 text, game_reason_2026 text);
    create table public.capture_events_2026(id uuid primary key, run_id uuid, status text, reason text,
      publish_after timestamptz, geometry extensions.geometry, new_geometry extensions.geometry,
      neutral_geometry extensions.geometry, taken_geometry extensions.geometry,
      already_owned_geometry extensions.geometry);
    create table public.ownership_2026(event_id uuid primary key, owner_id uuid, activity text,
      geometry extensions.geometry, controlled_since timestamptz);
  `);
  await test('0158 s’applique telle quelle et ne crée aucune donnée', async () => {
    await db.exec(M0158);
    assert.equal(await one('select count(*)::int from public.capture_events_2026'), 0);
  });

  await test('SEULES les faces encore publiables portent une estimation', () => {
    const branch = M0158.slice(M0158.indexOf('-- ESTIMATION §5.4'), M0158.indexOf('end if;\n  end if;'));
    assert.ok(branch.includes("where run_id=p_run_id and status='scheduled'"),
      'une face pending, rejected ou private ne prendra aucun terrain : elle n’a pas de gain à annoncer');
    for (const dead of ["status='pending'", "status='rejected'", "status='private'"])
      assert.ok(!branch.includes(dead), `${dead} ne doit pas nourrir une estimation`);
  });
  await test('l’estimation suit la formule du cahier §5.4, sur l’UNION des faces', () => {
    assert.ok(M0158.includes('ST_UnaryUnion(ST_Collect(geometry)) into staged'),
      'union d’abord : on ne somme pas des polygones qui se recouvrent');
    assert.ok(M0158.includes('new_m2:=ST_Area(ST_Difference(staged,mine)::geography)'), 'P moins O');
    assert.ok(M0158.includes('neutral_m2:=ST_Area(ST_Difference(staged,all_owned)::geography)'), 'neutre pris');
    assert.ok(M0158.includes('taken_m2:=ST_Area(ST_Difference(ST_Intersection(staged,all_owned),mine)::geography)'), 'repris à d’autres');
    assert.ok(M0158.includes('owned_m2:=ST_Area(ST_Intersection(staged,mine)::geography)'), 'déjà possédé');
  });
  await test('une estimation ne survit JAMAIS à la vérité du rejeu', () => {
    assert.ok(M0158.includes("'provisional',not settled and staged is not null"), '');
    for (const field of ['newTerrainM2', 'neutralTakenM2', 'takenFromOthersM2', 'alreadyOwnedM2'])
      assert.ok(new RegExp(`'${field}',case when settled then`).test(M0158),
        `${field} doit repasser aux chiffres du rejeu dès la publication`);
  });
  await test('une sortie sans face admissible ne déclenche AUCUNE géométrie', () => {
    const body = M0158.slice(M0158.indexOf('settled:=exists('));
    const guard = body.indexOf("elsif exists(select 1 from public.capture_events_2026 where run_id=p_run_id and status='scheduled')");
    const spatial = body.indexOf('ST_GeomFromText');
    assert.ok(guard > 0 && spatial > guard,
      'le test d’existence, non spatial, doit précéder la première opération PostGIS');
  });
  await test('le reçu d’un autre compte reste interdit, AVANT tout calcul', async () => {
    // Exécutable sous PGlite précisément parce que le refus précède la
    // géométrie. Le reste du reçu, lui, ne peut pas y tourner : PostGIS manque.
    await db.query("insert into public.runs values($1,$1,'run','no_loop','no_admissible_loop')", [ids[0]]);
    await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ids[1]]);
    await assert.rejects(() => db.query('select public.capture_result_2026($1)', [ids[0]]), /not_authorized/);
  });
  await test('la lecture du reçu reste hors de portée d’un anonyme', async () => {
    assert.equal(await one('select has_function_privilege($1,$2,$3)', ['anon', 'capture_result_2026(uuid)', 'EXECUTE']), false);
    assert.equal(await one('select has_function_privilege($1,$2,$3)', ['authenticated', 'capture_result_2026(uuid)', 'EXECUTE']), true);
  });
  await test('tout ce que 0123 garantissait est encore là', () => {
    for (const field of ['publishedAreaM2', 'remainingTerrainM2', 'asOf', 'publishAfter', 'loopAreaM2'])
      assert.ok(M0158.includes(`'${field}'`), `${field} a disparu du reçu`);
    assert.ok(M0158.includes("filter(where e.status=r.game_status_2026 or (r.game_status_2026='private' and e.status='withdrawn'))"),
      'le motif reste filtré par le statut de la sortie');
  });

  console.log(`\n${passed} vérifications PostgreSQL passées ; PostGIS NON exécuté (aucune aire calculée sous PGlite).`);
} finally { await db.close(); }
