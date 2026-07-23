#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0068 (`fr_communes` + `commune_norm` +
 * `search_communes`) sur PGlite.
 *
 * ═══ POURQUOI ═══════════════════════════════════════════════════════════════
 * 0068 pose le référentiel EXHAUSTIF des communes de France — la brique « toutes
 * les communes, même en campagne ». Une migration jamais exécutée est une
 * intention, pas un mécanisme, et celle-ci porte des pièges que seule l'exécution
 * révèle :
 *   1. le CHECK sur le code INSEE (`^[0-9][0-9AB][0-9]{3}$`) doit accepter les
 *      34 969 codes réels — un seul refus (Corse 2A/2B, zéro de tête) ferait
 *      échouer TOUTE la migration. On l'applique en vrai sur les 34 969 lignes ;
 *   2. la NORMALISATION de recherche : sans extension `unaccent` (absente en
 *      PGlite), « clémenciat » et « clemenciat » doivent trouver la même commune,
 *      et « abergement » doit trouver « L'Abergement-… » malgré l'apostrophe ;
 *   3. le PÉRIMÈTRE d'EXECUTE : la recherche est ouverte aux clients (lecture),
 *      mais l'écriture de `fr_communes` leur est révoquée.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *   · L'EFFET de la RLS : PGlite tourne en superutilisateur. On prouve que la
 *     policy de lecture existe et que les privilèges d'écriture sont révoqués
 *     (has_table_privilege), pas le comportement des politiques en prod.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/fr_communes.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 (un test non exécuté n'est jamais vert).
 */
import { readFileSync } from 'node:fs';
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
      `  cause : ${err.message}\n\n` +
      '  mkdir -p /tmp/pglite && cd /tmp/pglite\n' +
      '  echo \'{"name":"pglite-scratch","private":true}\' > package.json\n' +
      '  npm i --ignore-scripts @electric-sql/pglite\n' +
      '  cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \\\n' +
      '    node supabase/tests/fr_communes.pglite.test.mjs',
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

// Rôles Supabase (PGlite ne les a pas) — nécessaires aux grant/revoke de 0068.
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
`);

// Le VRAI SQL de la migration (34 969 communes réelles comprises).
await db.exec(readFileSync(join(MIGRATIONS, '0068_fr_communes_reference.sql'), 'utf8'));

console.log('fr_communes — migration 0068 sur PGlite\n');

await t('les 34 969 communes réelles sont chargées (le CHECK INSEE accepte tout)', async () => {
  const r = await db.query('select count(*)::int as n from public.fr_communes');
  eq(r.rows[0].n, 34969, 'nombre de communes');
});

await t('zéros de tête, Corse et DROM survivent (INSEE en texte, pas en integer)', async () => {
  const r = await db.query(
    `select insee, nom from public.fr_communes where insee in ('01001','2A004','2B033','75056','59350') order by insee`,
  );
  const byId = Object.fromEntries(r.rows.map((x) => [x.insee, x.nom]));
  ok(byId['01001'] === "L'Abergement-Clémenciat", `01001 = ${byId['01001']}`);
  ok(byId['2A004'] === 'Ajaccio', `2A004 = ${byId['2A004']}`);
  ok(byId['75056'] === 'Paris', `75056 = ${byId['75056']}`);
  ok(byId['59350'] === 'Lille', `59350 = ${byId['59350']}`);
  ok('2B033' in byId, 'Corse 2B présente');
});

await t('population INCONNUE → NULL, population RÉELLEMENT nulle → 0 (l’app ne ment pas)', async () => {
  // Les 6 territoires sans recensement (TAAF, Clipperton) n'ont PAS de population
  // connue → NULL, jamais un 0 fabriqué.
  const nulls = await db.query('select count(*)::int as n from public.fr_communes where population is null');
  eq(nulls.rows[0].n, 6, 'communes sans population connue');
  const taaf = await db.query(`select population from public.fr_communes where insee = '98411'`);
  ok(taaf.rows[0].population === null, 'Îles Saint-Paul : population inconnue = NULL');
  // À l'inverse, Fleury-devant-Douaumont (village détruit à Verdun, 0 habitant
  // permanent mais commune de plein droit) a une population RÉELLE de 0 : la
  // préserver est honnête, l'effacer serait le mensonge inverse.
  const fleury = await db.query(`select population from public.fr_communes where insee = '55189'`);
  eq(fleury.rows[0].population, 0, 'Fleury-devant-Douaumont : 0 réel préservé');
});

await t('la recherche ignore accents, casse et ponctuation (sans extension)', async () => {
  // « clemenciat » (sans accent) trouve « L'Abergement-Clémenciat » (avec accent).
  const a = await db.query(`select insee from public.search_communes('clemenciat', 25)`);
  ok(a.rows.some((x) => x.insee === '01001'), 'clemenciat → 01001');
  // « clémenciat » (avec accent) aussi.
  const b = await db.query(`select insee from public.search_communes('CLÉMENCIAT', 25)`);
  ok(b.rows.some((x) => x.insee === '01001'), 'CLÉMENCIAT → 01001');
  // « abergement » trouve malgré l'apostrophe et le trait d'union.
  const c = await db.query(`select insee from public.search_communes('abergement', 25)`);
  ok(c.rows.some((x) => x.insee === '01001'), 'abergement → 01001');
});

await t('une commune RURALE se trouve — c’est tout l’objet du chantier', async () => {
  // Saint-Bauzile (48137, Lozère, 585 hab.) : jamais dans cities15000.
  const r = await db.query(`select insee, population from public.search_communes('saint-bauzile', 25)`);
  ok(r.rows.some((x) => x.insee === '48137'), `Saint-Bauzile absent : ${JSON.stringify(r.rows)}`);
});

await t('le cap de recherche est CELUI PASSÉ (aucun nombre magique en SQL)', async () => {
  const r = await db.query(`select count(*)::int as n from public.search_communes('saint', 5)`);
  ok(r.rows[0].n <= 5, `cap non respecté : ${r.rows[0].n}`);
  const r2 = await db.query(`select count(*)::int as n from public.search_communes('saint', 40)`);
  ok(r2.rows[0].n > 5, `cap ne s’élargit pas : ${r2.rows[0].n}`);
});

await t('le préfixe passe avant le contient (Lille avant Villelongue…)', async () => {
  const r = await db.query(`select insee, nom from public.search_communes('lille', 25)`);
  ok(r.rows.length > 0, 'aucun résultat pour lille');
  eq(r.rows[0].insee, '59350', 'Lille (préfixe) doit sortir en tête');
});

await t('une requête vide ne rend RIEN (pas tout le référentiel)', async () => {
  const r = await db.query(`select count(*)::int as n from public.search_communes('', 25)`);
  eq(r.rows[0].n, 0, 'requête vide');
  const r2 = await db.query(`select count(*)::int as n from public.search_communes('   ', 25)`);
  eq(r2.rows[0].n, 0, 'requête blanche');
});

await t('EXECUTE : la recherche est ouverte aux clients, révoquée à PUBLIC', async () => {
  const anon = await db.query(
    `select has_function_privilege('anon', 'public.search_communes(text, integer)', 'EXECUTE') as v`,
  );
  const auth = await db.query(
    `select has_function_privilege('authenticated', 'public.search_communes(text, integer)', 'EXECUTE') as v`,
  );
  ok(anon.rows[0].v === true, 'anon doit pouvoir chercher');
  ok(auth.rows[0].v === true, 'authenticated doit pouvoir chercher');
});

await t('écriture de fr_communes révoquée aux rôles clients (seed = service-role)', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
      const r = await db.query(
        `select has_table_privilege($1, 'public.fr_communes', $2) as v`,
        [role, priv],
      );
      ok(r.rows[0].v === false, `${role} ne doit pas ${priv} fr_communes`);
    }
    const sel = await db.query(
      `select has_table_privilege($1, 'public.fr_communes', 'SELECT') as v`,
      [role],
    );
    ok(sel.rows[0].v === true, `${role} doit pouvoir lire fr_communes`);
  }
});

await t('RLS est activée + une policy de lecture existe', async () => {
  const rls = await db.query(
    `select relrowsecurity as on from pg_class where oid = 'public.fr_communes'::regclass`,
  );
  ok(rls.rows[0].on === true, 'RLS doit être activée');
  const pol = await db.query(
    `select count(*)::int as n from pg_policies where tablename = 'fr_communes' and cmd = 'SELECT'`,
  );
  ok(pol.rows[0].n >= 1, 'policy de lecture manquante');
});

console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
console.log(
  'RAPPEL : la RLS de fr_communes n’est PAS prouvée ici (PGlite = superutilisateur). ' +
    'Seuls le périmètre d’EXECUTE et les privilèges d’écriture le sont.',
);
process.exit(failures.length === 0 ? 0 : 1);
