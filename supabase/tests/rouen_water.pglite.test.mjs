#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0112 (la Seine cesse d'être capturable).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. LE TROU EXISTAIT : sur la lignée 0002 → 0111, `no_capture_zones` est VIDE,
 *     donc un point au milieu de la Seine n'est dans aucune zone interdite.
 *     Sans cette étape, rien ne distinguerait 0112 d'un no-op.
 *  1. Après 0112, un point au milieu du fleuve EST couvert.
 *  2. Un point sur la BERGE ne l'est pas — sinon on retirerait au joueur des
 *     rues qu'il a réellement courues.
 *  3. La géométrie est SAINE : anneaux fermés, ≥ 4 sommets, coordonnées dans la
 *     boîte de Rouen. Un polygone ouvert ou inversé ferait mentir le
 *     point-in-polygon sans jamais lever d'erreur.
 *  4. La migration est IDEMPOTENTE (le cron d'un déploiement peut la rejouer)
 *     et ne touche QUE la famille `water:`.
 *  5. La SOURCE est tracée dans `reason` : une donnée importée dont on ne peut
 *     plus dire d'où elle vient est une donnée qu'on ne peut plus corriger.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EXACTITUDE CARTOGRAPHIQUE. Le test vérifie qu'un point notoirement dans
 *    le fleuve est couvert et qu'un point notoirement à terre ne l'est pas ; il
 *    ne rejoue pas OpenStreetMap. Une erreur d'OSM serait reproduite ici.
 *  · Le comportement d'`ingest_run` : il est couvert côté moteur
 *    (`blocked_no_capture_zone` dans `claims.ts`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite est introuvable. Ce test n’a rien vérifié ;\n' +
      'ne le comptez pas comme vert (sortie 2, jamais 0).\n' +
      `  cause : ${err.message}`,
  );
  process.exit(2);
}

let passed = 0;
const failures = [];
const t = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};
const ok = (cond, what) => {
  if (!cond) throw new Error(what);
};

const db = new PGlite();

await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema extensions;
  create function extensions.gen_random_bytes(n int) returns bytea
    language sql as $$
      select substring(
        decode(md5(random()::text) || md5(random()::text) || md5(random()::text), 'hex')
        from 1 for n)
    $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
const UNSCHEDULE = 'select cron.unschedule(';
const all = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f))
  .sort()
  .filter((f) => !SKIP.has(f));
const LINEAGE = all.filter((f) => Number(f.slice(0, 4)) <= 111);
const CIBLE = all.find((f) => f.startsWith('0112_'));
if (!CIBLE) {
  console.error('La migration 0112 est introuvable — ce test ne vérifie rien.');
  process.exit(1);
}

const apply = async (file) => {
  let sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  for (const marker of [CRON, UNSCHEDULE]) {
    const at = sql.indexOf(marker);
    if (at !== -1) sql = sql.slice(0, at);
  }
  await db.exec(sql);
};

for (const file of LINEAGE) {
  try {
    await apply(file);
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : la migration ${file} n’a pas pu s’appliquer.\n  ${err.message}`);
    process.exit(1);
  }
}

console.log('rouen_water — migration 0112 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0111)\n`);

/**
 * Point-in-polygon (ray casting) en SQL — MÊME algorithme que le moteur
 * (`pointInGeoJson`). On ne teste pas le moteur ici, on teste la DONNÉE : est-ce
 * qu'un point du fleuve tombe dans l'un de ces polygones ?
 */
await db.exec(`
  create function pg_temp.dans_leau(p_lat double precision, p_lng double precision)
  returns boolean language plpgsql immutable as $$
  declare
    z record; ring jsonb; n int; i int;
    -- PAS de variable nommee « by » : plpgsql le reserve pour la boucle
    -- FOR ... BY, et l'erreur qu'il rend (syntax error at or near "by") ne dit
    -- PAS lequel des noms fautifs il vise. (Aucun accent grave dans ce bloc :
    -- il est DANS un template literal JS, et le terminerait.)
    x1 double precision; y1 double precision;
    x2 double precision; y2 double precision; dedans boolean;
  begin
    for z in select geojson from public.no_capture_zones where reason like 'water:%' loop
      ring := z.geojson->'coordinates'->0;
      n := jsonb_array_length(ring);
      dedans := false;
      for i in 0 .. n-1 loop
        x1 := (ring->i->>0)::double precision; y1 := (ring->i->>1)::double precision;
        x2 := (ring->((i+1)%n)->>0)::double precision; y2 := (ring->((i+1)%n)->>1)::double precision;
        if ((y1 > p_lat) <> (y2 > p_lat))
           and (p_lng < (x2-x1) * (p_lat-y1) / nullif(y2-y1,0) + x1) then
          dedans := not dedans;
        end if;
      end loop;
      if dedans then return true; end if;
    end loop;
    return false;
  end $$;
`);

/**
 * Points de contrôle DÉRIVÉS DE LA DONNÉE, pas de mémoire.
 *
 * Première version de ce test : deux coordonnées « de tête » censées être dans
 * le fleuve. L'une n'y était pas — et le test rougissait en accusant la
 * migration alors que c'était l'assertion qui se trompait. Un test dont les
 * repères sont approximatifs ne prouve rien : il déplace juste l'erreur.
 *
 * Ceux-ci sont des points INTÉRIEURS calculés sur les anneaux réellement
 * insérés (balayage autour du centroïde jusqu'à tomber dedans), donc vrais par
 * construction. Les points « à terre », eux, sont deux lieux dont l'absence
 * d'eau ne fait aucun doute — et dont on a vérifié qu'aucun anneau ne les
 * couvre.
 */
const DANS_LA_SEINE = [
  { lat: 49.342, lng: 1.113, ou: 'Seine, grande boucle aval (rel/13819)' },
  { lat: 49.422, lng: 1.0213, ou: 'Seine, bras amont (rel/13820)' },
  { lat: 49.4459, lng: 1.054, ou: 'Seine au droit du pont Flaubert (rel/15262023)' },
  { lat: 49.4375, lng: 1.0478, ou: 'Bassin de Rouen-Quevilly (way/202393333)' },
];
const A_TERRE = [
  { lat: 49.4431, lng: 1.0993, ou: 'centre-ville de Rouen (référentiel villes)' },
  { lat: 49.4469, lng: 1.0912, ou: 'cathédrale' },
];

// ═══ ÉTAPE 0 — LE TROU EXISTAIT ═══════════════════════════════════════════
await t('AVANT 0112 : aucune zone d’eau, la Seine est capturable', async () => {
  const n = Number(
    (await db.query(`select count(*)::int as n from public.no_capture_zones`)).rows[0].n,
  );
  eq(n, 0, 'la table doit être vide sur la lignée 0002 → 0111');
  for (const p of DANS_LA_SEINE) {
    const r = await db.query(`select pg_temp.dans_leau(${p.lat}, ${p.lng}) as x`);
    eq(r.rows[0].x, false, `${p.ou} : rien ne le protège encore`);
  }
});

await t('0112 s’applique par-dessus la lignée 0002 → 0111', async () => {
  await apply(CIBLE);
});

// ═══ LA SEINE EST COUVERTE, LA BERGE NE L'EST PAS ═════════════════════════
await t('un point au milieu du fleuve est DANS une zone interdite', async () => {
  for (const p of DANS_LA_SEINE) {
    const r = await db.query(`select pg_temp.dans_leau(${p.lat}, ${p.lng}) as x`);
    eq(r.rows[0].x, true, `${p.ou} (${p.lat}, ${p.lng}) devrait être couvert`);
  }
});

await t('un point À TERRE ne l’est PAS — on ne retire aucune rue au joueur', async () => {
  for (const p of A_TERRE) {
    const r = await db.query(`select pg_temp.dans_leau(${p.lat}, ${p.lng}) as x`);
    eq(r.rows[0].x, false, `${p.ou} : une rue courue doit rester capturable`);
  }
});

// ═══ LA GÉOMÉTRIE EST SAINE ═══════════════════════════════════════════════
await t('tous les polygones sont FERMÉS et bien formés', async () => {
  const zones = (
    await db.query(`select name, geojson from public.no_capture_zones where reason like 'water:%'`)
  ).rows;
  ok(zones.length > 0, 'aucune zone insérée');
  for (const z of zones) {
    const g = z.geojson;
    eq(g.type, 'Polygon', `${z.name} : type`);
    const ring = g.coordinates[0];
    ok(ring.length >= 4, `${z.name} : ${ring.length} sommets — un anneau en exige 4`);
    // Fermé : un anneau ouvert fait mentir le ray casting SANS jamais lever.
    eq(ring[0], ring[ring.length - 1], `${z.name} : anneau NON fermé`);
    for (const [lng, lat] of ring) {
      ok(
        lat > 49.3 && lat < 49.6 && lng > 0.9 && lng < 1.3,
        `${z.name} : sommet (${lat}, ${lng}) hors de la boîte de Rouen`,
      );
    }
  }
});

await t('la SOURCE de chaque zone est tracée', async () => {
  // Une donnée importée dont on ne peut plus dire d'où elle vient est une
  // donnée qu'on ne peut plus corriger quand OSM se corrige.
  const r = await db.query(
    `select count(*)::int as n from public.no_capture_zones
      where reason like 'water:%' and reason ~ '(way|rel)/[0-9]+'`,
  );
  const total = Number(
    (await db.query(`select count(*)::int as n from public.no_capture_zones`)).rows[0].n,
  );
  eq(Number(r.rows[0].n), total, 'chaque zone doit porter son identifiant OSM');
});

// ═══ IDEMPOTENCE ══════════════════════════════════════════════════════════
await t('rejouer la migration ne duplique rien', async () => {
  const avant = Number(
    (await db.query(`select count(*)::int as n from public.no_capture_zones`)).rows[0].n,
  );
  await apply(CIBLE);
  const apres = Number(
    (await db.query(`select count(*)::int as n from public.no_capture_zones`)).rows[0].n,
  );
  eq(apres, avant, 'un déploiement rejoué doublerait les zones');
});

await t('la purge ne touche QUE la famille water:', async () => {
  await db.exec(`
    insert into public.no_capture_zones (name, geojson, reason)
    values ('Base militaire', '{"type":"Polygon","coordinates":[[[1,49],[1.1,49],[1.1,49.1],[1,49]]]}'::jsonb, 'military');
  `);
  await apply(CIBLE);
  const r = await db.query(
    `select count(*)::int as n from public.no_capture_zones where reason = 'military'`,
  );
  eq(Number(r.rows[0].n), 1, 'une zone d’une autre famille ne doit pas être emportée');
});

// ═══ PRIVILÈGES (référentiel : lisible par tous, écrit par personne) ══════
await t('aucun client ne peut écrire le référentiel', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
      const r = await db.query(
        `select has_table_privilege('${role}', 'public.no_capture_zones', '${priv}') as can`,
      );
      eq(r.rows[0].can, false, `${role} ne doit pas pouvoir ${priv}`);
    }
  }
});

console.log(`\n${passed} assertions vertes, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
