#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0089 (`public_hex_claims` respecte
 * `user_profiles.map_sharing` — constitution §7, spec §12.1).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0087 avait fermé la vue POLYGONALE, et son §3 affirmait que la grille restait
 * ouverte « parce que `hex_claims_select_all` reste `using (true)` ». C'était
 * faux (0079 l'avait remplacée), et cette phrase fausse en cachait une vraie :
 * la surface publique de la grille n'est plus la table, c'est la vue
 * `public.public_hex_claims` (0079:152) — et elle ne consultait pas
 * `map_sharing`. Un joueur en refus disparaissait d'un chemin et restait
 * lisible par l'autre, à la maille inférieure. 0089 referme celui-là.
 *
 * Docker est indisponible ; PGlite exécute le VRAI SQL des migrations dans
 * Node. Même harnais que les autres tests SQL du dépôt.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0089 s'applique sur un Postgres réel, PAR-DESSUS la lignée 0002 → 0088.
 *  2. Une cellule dont le propriétaire a `map_sharing = 'none'` est ABSENTE de
 *     la vue — alors qu'elle est présente dans `hex_claims` et publiable (donc
 *     écartée par le SEUL nouveau critère).
 *  3. La même cellule revient dès que le réglage change : c'est le RÉGLAGE qui
 *     décide, pas un effet de bord.
 *  4. Les trois autres valeurs du domaine laissent passer.
 *  5. Un propriétaire SANS ligne de profil est masqué (repli prudent annoncé
 *     par 0087 et redit par 0089).
 *  6. Les filtres de 0079 SURVIVENT au `create or replace` : la publication
 *     différée mord toujours, et le lecteur ne se voit toujours pas.
 *  7. Les COLONNES sont inchangées — ni ajout, ni retrait, ni réordonnancement
 *     (une vue publique qui gagne une colonne en silence est une fuite).
 *  8. La vue garde `security_barrier` et n'est PAS `security_invoker`.
 *  9. Les privilèges survivent : `select` pour `authenticated`, rien pour `anon`.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *  · L'EFFET de la RLS : PGlite tourne en SUPERUTILISATEUR, où les policies ne
 *    s'appliquent pas. Ce qui est prouvé ici est role-INDÉPENDANT — un `where`
 *    de vue filtre pour tout le monde, superutilisateur compris. C'est justement
 *    ce qui fait la valeur du déplacement client → serveur.
 *  · Que la carte de l'app lise cette vue : elle ne la lit pas encore (0089 §3).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   npm run test:sql   (tous les tests SQL — inclus dans `npm run gate`)
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

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
  create function extensions.gen_random_bytes(int) returns bytea
    language sql as $$ select decode(md5(random()::text), 'hex') $$;
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
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 88)
  .sort()
  .filter((f) => !SKIP.has(f));

for (const file of LINEAGE) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const at = raw.indexOf(CRON);
  try {
    await db.exec(at === -1 ? raw : raw.slice(0, at));
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : la migration ${file} n’a pas pu s’appliquer.\n  ${err.message}`);
    process.exit(1);
  }
}

console.log('public_hex_claims × map_sharing — migration 0089 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0088)\n`);

// ─── L'ÉTAT D'AVANT, CONSTATÉ PLUTÔT QUE SUPPOSÉ ────────────────────────────
// Sans cette mesure, un test vert après 0089 ne dirait pas s'il y avait
// vraiment quelque chose à réparer.
const REFUSER = '11111111-1111-1111-1111-111111111111';
const SHARER = '22222222-2222-2222-2222-222222222222';
const NOPROFILE = '33333333-3333-3333-3333-333333333333';

await db.exec(`
  insert into auth.users (id) values ('${REFUSER}'), ('${SHARER}'), ('${NOPROFILE}');
  -- Aucune ville : city_id est nullable partout ici, et une ligne city_zones
  -- complète (bornes, statut…) n'apprendrait rien sur map_sharing.
  -- on conflict : la lignée pose un trigger qui crée la ligne publique à
  -- l'insertion dans auth.users. On complète plutôt que de dupliquer — et le
  -- test reste juste si ce trigger disparaît un jour.
  insert into public.users (id, pseudo) values
    ('${REFUSER}',   'refuse'),
    ('${SHARER}',    'partage'),
    ('${NOPROFILE}', 'sansprofil')
  on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.user_profiles (user_id, handle, map_sharing) values
    ('${REFUSER}', 'refuse',  'none'),
    ('${SHARER}',  'partage', 'precise')
  on conflict (user_id) do update set handle = excluded.handle, map_sharing = excluded.map_sharing;
  insert into public.hex_claims (h3index, owner_user_id, claim_type, claimed_at) values
    (1, '${REFUSER}',   'neutral', now() - interval '2 hours'),
    (2, '${SHARER}',    'neutral', now() - interval '2 hours'),
    (3, '${NOPROFILE}', 'neutral', now() - interval '2 hours'),
    -- Publication différée : la course de cette cellule produira, plus bas, un
    -- territoire dont publish_after est dans le futur.
    (4, '${SHARER}',    'neutral', now() - interval '2 hours');
`);

const cells = async () => {
  const { rows } = await db.query('select h3index from public.public_hex_claims order by h3index');
  return rows.map((r) => Number(r.h3index));
};

const before = await cells();
await t('AVANT 0089 : la cellule d’un joueur en refus était LISIBLE (le trou existait)', () => {
  ok(before.includes(1), `la cellule du joueur « none » devrait être visible avant 0089 (${before})`);
});

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(
    readFileSync(join(MIGRATIONS, '0089_public_hex_claims_respects_map_sharing.sql'), 'utf8'),
  );
} catch (err) {
  migrationError = err;
}
await t('la migration 0089 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ═══ 2. LE REFUS EST OPPOSABLE ══════════════════════════════════════════════
await t('map_sharing = none : la cellule DISPARAÎT de la surface publique', async () => {
  const after = await cells();
  ok(!after.includes(1), `la cellule du joueur « none » ne doit plus sortir (${after})`);
  ok(after.includes(2), `celle d’un joueur qui partage doit rester (${after})`);
  // Et elle est TOUJOURS dans la table : on a filtré une surface, pas détruit
  // une donnée de jeu.
  const { rows } = await db.query('select count(*)::int as n from public.hex_claims where h3index = 1');
  eq(rows[0].n, 1, 'la cellule existe toujours dans hex_claims');
});

await t('c’est le RÉGLAGE qui décide : le changer fait revenir la cellule', async () => {
  await db.exec(`update public.user_profiles set map_sharing = 'territory_only' where user_id = '${REFUSER}'`);
  ok((await cells()).includes(1), 'après passage en territory_only, la cellule revient');
  await db.exec(`update public.user_profiles set map_sharing = 'none' where user_id = '${REFUSER}'`);
  ok(!(await cells()).includes(1), 'et repart dès qu’on revient à none');
});

await t('les trois autres valeurs du domaine laissent passer', async () => {
  for (const value of ['precise', 'simplified', 'territory_only']) {
    await db.exec(`update public.user_profiles set map_sharing = '${value}' where user_id = '${REFUSER}'`);
    ok((await cells()).includes(1), `${value} doit laisser passer`);
  }
  await db.exec(`update public.user_profiles set map_sharing = 'none' where user_id = '${REFUSER}'`);
});

await t('aucun profil = masqué (repli prudent, annoncé par 0087 et redit par 0089)', async () => {
  ok(!(await cells()).includes(3), 'un compte sans ligne de profil ne sort pas');
});

// ═══ 3. LES FILTRES DE 0079 SURVIVENT AU create or replace ══════════════════
const GEOM = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[2.35, 48.85], [2.352, 48.85], [2.352, 48.851], [2.35, 48.851], [2.35, 48.85]]],
});

await t('la publication différée (§1.5) mord TOUJOURS après le remplacement', async () => {
  const run = (
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status)
       values ($1, gen_random_uuid(), 'gps', now() - interval '2 hours', 5000, 1800, 'valid')
       returning id`,
      [SHARER],
    )
  ).rows[0].id;
  await db.query('update public.hex_claims set run_id = $1 where h3index = 4', [run]);
  await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, city_id, state, source_run_id,
        geometry, geometry_generalized, area_m2, controlled_since, publish_after,
        algorithm_version)
     values ('run', 'user', $1, null, 'owned_personal', $2,
             $3::jsonb, $3::jsonb, 12345, now() - interval '2 hours', now() + interval '1 hour',
             'test')`,
    [SHARER, run, GEOM],
  );
  ok(!(await cells()).includes(4), 'une cellule dont le territoire n’est pas publié reste cachée');
});

await t('le lecteur ne se voit pas dans la vue (0079, inchangé)', async () => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select '${SHARER}'::uuid $$`,
  );
  ok(!(await cells()).includes(2), 'ses propres cellules sont absentes de la surface publique');
  await db.exec('create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$');
});

// ═══ 4. LA FORME DE LA VUE N'A PAS BOUGÉ ════════════════════════════════════
await t('les colonnes sont EXACTEMENT celles de 0079 — ni ajout, ni retrait', async () => {
  const { rows } = await db.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'public_hex_claims'
    order by ordinal_position
  `);
  eq(
    rows.map((r) => r.column_name),
    ['h3index', 'activity', 'owner_user_id', 'claim_type', 'claimed_at_hour', 'decay_at_hour'],
    'liste et ORDRE des colonnes',
  );
});

await t('security_barrier conservé, security_invoker toujours absent (À DESSEIN)', async () => {
  const { rows } = await db.query(`
    select coalesce(array_to_string(c.reloptions, ','), '') as opts
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'public_hex_claims'
  `);
  const opts = rows[0].opts;
  ok(/security_barrier=(true|on)/.test(opts), `security_barrier attendu (${opts})`);
  ok(!/security_invoker=(true|on)/.test(opts), `security_invoker NE doit PAS être posé (${opts})`);
});

await t('les privilèges survivent : select pour authenticated, rien pour anon', async () => {
  const grant = async (role) => {
    const { rows } = await db.query(
      `select has_table_privilege($1, 'public.public_hex_claims', 'select') as g`,
      [role],
    );
    return rows[0].g;
  };
  eq(await grant('authenticated'), true, 'authenticated lit la vue');
  eq(await grant('anon'), false, 'anon ne lit rien');
});

console.log(`\n${passed} vert(s), ${failures.length} rouge(s)`);
if (failures.length > 0) {
  console.error('\nÉCHECS :');
  for (const f of failures) console.error(`  · ${f.name}\n    ${f.err.stack ?? f.err.message}`);
  process.exit(1);
}
console.log('OK — le refus de partage de carte est opposable AUSSI par le chemin grille.');
