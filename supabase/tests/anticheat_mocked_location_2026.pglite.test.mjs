#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0174 (`runs.mocked_location_2026`).
 * Lot anti-triche 2026, cahier de septembre §18.4.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL EST MESURÉ ICI ═════════════════════
 * La lignée 0002 → 0173 est rejouée D'ABORD, et le test constate que la colonne
 * n'existe PAS. Sans cette étape, rien ne distinguerait cette migration d'un
 * no-op : un `add column if not exists` sur une colonne déjà présente
 * s'applique sans bruit et laisse un test vert qui ne prouve rien.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. Avant 0174, `runs.mocked_location_2026` n'existe pas.
 *  2. 0174 s'applique sur un Postgres réel, telle quelle, par-dessus la lignée
 *     complète — pas sur une maquette de schéma.
 *  3. La colonne est `boolean`, NULLABLE, et SANS valeur par défaut. C'est la
 *     propriété centrale : un `default false` ferait dire à toutes les courses
 *     iOS et à tout l'historique « aucune simulation détectée » alors que
 *     personne n'a regardé. Le moteur lit exactement cette différence (absent ⇒
 *     signal indisponible, il sort du dénominateur).
 *  4. L'historique existant reste à NULL après migration — la valeur n'est pas
 *     rétro-remplie.
 *  5. Les TROIS états sont réellement stockables et relisibles.
 *  6. La colonne porte un COMMENT (elle sera lue par quelqu'un qui n'aura pas
 *     ce fichier sous les yeux).
 *  7. Elle n'entre dans AUCUNE vue publique : une suspicion est une donnée
 *     sensible (0081), elle ne suit jamais un profil ni un classement.
 *  8. `runs` conserve sa RLS activée (la migration ne la touche pas).
 *
 * ═══ CE QU'IL NE PROUVE PAS ═════════════════════════════════════════════════
 * PGlite tourne en SUPERUTILISATEUR : les policies ne s'y appliquent pas. On
 * vérifie que la RLS est ACTIVÉE et qu'aucune vue publique n'expose la colonne,
 * jamais qu'un tiers se fasse réellement refuser. Et il ne prouve évidemment pas
 * qu'un appareil dise la vérité : ce drapeau vient du client.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   npm run test:sql   (ou, isolément :)
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/anticheat_mocked_location_2026.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
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
  -- PGlite n'a pas PostGIS. Ce DOMAINE porte seulement le NOM du type pour que
  -- plpgsql accepte les déclarations des migrations géométriques ; aucune
  -- opération spatiale n'est exécutée ici, et aucun vert de ce fichier n'en
  -- prouve une (même stub que capture_admission_2026.pglite.test.mjs).
  create domain extensions.geometry as text;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

// Mêmes exclusions que les autres tests PGlite du dépôt, et pour la même
// raison : PGlite n'embarque ni pgcrypto, ni pg_cron, ni la publication
// Realtime. Aucun fichier sauté ne touche `runs`.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
const TARGET = '0174_anticheat_mocked_location_2026.sql';
// Borne HAUTE explicite : d'autres lots déposeront 0175 et suivantes ; ce test
// répond de la lignée jusqu'à 0173 et ne doit pas rougir pour leur travail.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 173)
  .sort()
  .filter((f) => !SKIP.has(f));

const PGLITE_UNSUPPORTED = [];
for (const file of LINEAGE) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const at = raw.indexOf(CRON);
  try {
    await db.exec(at === -1 ? raw : raw.slice(0, at));
  } catch (err) {
    // PostGIS n'existe pas sous PGlite : les migrations géométriques ne peuvent
    // pas s'y appliquer. On les NOMME plutôt que de les taire — et le test
    // s'arrête si `runs` n'a pas survécu (vérifié juste après la boucle).
    PGLITE_UNSUPPORTED.push(`${file} — ${err.message.split('\n')[0]}`);
  }
}

const runsExists = await db.query(
  `select 1 from information_schema.tables where table_schema='public' and table_name='runs'`,
);
if (runsExists.rows.length === 0) {
  console.error('\nSOCLE CASSÉ : `public.runs` n’existe pas après la lignée — le test ne peut rien prouver.');
  process.exit(1);
}

console.log('anticheat_mocked_location_2026 — migration 0174 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0173)`);
if (PGLITE_UNSUPPORTED.length > 0) {
  console.log(`  (${PGLITE_UNSUPPORTED.length} migration(s) hors de portée de PGlite, nommées ci-dessous)`);
  for (const line of PGLITE_UNSUPPORTED) console.log(`     · ${line}`);
}
console.log('');

const columnRow = async () =>
  (await db.query(
    `select data_type, is_nullable, column_default
       from information_schema.columns
      where table_schema='public' and table_name='runs' and column_name='mocked_location_2026'`,
  )).rows[0] ?? null;

// ═══ 0. LE DÉFAUT EXISTAIT ══════════════════════════════════════════════════
const before = await columnRow();
await t('ÉTAPE 0 — avant 0174, `runs.mocked_location_2026` n’existe pas', () => {
  eq(before, null, 'la colonne était déjà là : 0174 serait un no-op et ce test un faux positif');
});

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, TARGET), 'utf8'));
} catch (err) {
  migrationError = err;
}
await t('0174 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
  process.exit(1);
}

// ═══ 2. LA FORME DE LA COLONNE EST LA PROMESSE ══════════════════════════════
await t('la colonne est booléenne, NULLABLE et SANS défaut (trois états, pas deux)', async () => {
  const row = await columnRow();
  ok(row !== null, 'la colonne doit exister après 0174');
  eq(row.data_type, 'boolean', 'type');
  eq(row.is_nullable, 'YES', 'un NULL doit rester possible : « la plateforme n’a rien dit »');
  eq(
    row.column_default,
    null,
    'un défaut ferait affirmer « aucune simulation détectée » là où personne n’a regardé',
  );
});

// ═══ 3. L'HISTORIQUE N'EST PAS RÉ-ÉCRIT ═════════════════════════════════════
/**
 * Un joueur RÉEL de la lignée. Deux pièges de la vraie base, pas de la fixture :
 * `public.users` exige un pseudo, et 0154 PROVISIONNE déjà la ligne par trigger
 * dès l'insertion dans `auth.users` — d'où le `on conflict do update` plutôt
 * qu'un `insert` nu, qui se cassait sur `users_pkey`.
 */
const nouveauJoueur = async (pseudo) => {
  const id = (await db.query(`select gen_random_uuid() as id`)).rows[0].id;
  await db.query(`insert into auth.users (id) values ($1) on conflict do nothing`, [id]);
  await db.query(
    `insert into public.users (id, pseudo) values ($1, $2)
       on conflict (id) do update set pseudo = excluded.pseudo`,
    [id, pseudo],
  );
  return id;
};

await t('une course écrite AVANT la migration reste à NULL (aucun rétro-remplissage)', async () => {
  const user = await nouveauJoueur('avant');
  const run = (await db.query(
    `insert into public.runs (user_id, client_run_id, source, started_at, distance_m, duration_s, status)
     values ($1, gen_random_uuid(), 'gps', now(), 1000, 300, 'valid') returning id`,
    [user],
  )).rows[0].id;
  const value = (await db.query(
    `select mocked_location_2026 from public.runs where id = $1`,
    [run],
  )).rows[0].mocked_location_2026;
  eq(value, null, 'une course dont personne n’a lu le drapeau doit rester muette');
});

// ═══ 4. LES TROIS ÉTATS SONT RÉELLEMENT STOCKABLES ══════════════════════════
await t('NULL, false et true se stockent et se relisent distinctement', async () => {
  const user = await nouveauJoueur('trois-etats');
  const ids = [];
  for (const value of [null, false, true]) {
    ids.push((await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at, distance_m, duration_s, status, mocked_location_2026)
       values ($1, gen_random_uuid(), 'gps', now(), 1000, 300, 'valid', $2) returning id`,
      [user, value],
    )).rows[0].id);
  }
  const read = [];
  for (const id of ids) {
    read.push((await db.query(
      `select mocked_location_2026 from public.runs where id = $1`,
      [id],
    )).rows[0].mocked_location_2026);
  }
  eq(read, [null, false, true], 'les trois états doivent survivre à l’aller-retour');
});

// ═══ 5. ELLE EST DOCUMENTÉE DANS LA BASE ════════════════════════════════════
await t('la colonne porte un COMMENT qui dit les trois états et ce qu’elle n’est pas', async () => {
  const comment = (await db.query(
    `select col_description('public.runs'::regclass,
       (select ordinal_position from information_schema.columns
         where table_schema='public' and table_name='runs' and column_name='mocked_location_2026')) as c`,
  )).rows[0].c;
  ok(typeof comment === 'string' && comment.length > 80, 'un commentaire réel est attendu');
  ok(/NULL/.test(comment), 'le commentaire doit nommer l’état NULL');
  ok(/Android/i.test(comment), 'le commentaire doit dire que seul Android le fournit');
  ok(/attestation/i.test(comment), 'le commentaire doit dire que ce n’est PAS une attestation d’appareil');
});

// ═══ 6. VIE PRIVÉE — AUCUNE VUE PUBLIQUE NE L'EXPOSE ════════════════════════
await t('aucune vue ni matview ne publie le drapeau (une suspicion est sensible, 0081)', async () => {
  const leaks = await db.query(
    `select table_name from information_schema.views
      where table_schema='public' and view_definition ilike '%mocked_location_2026%'`,
  );
  eq(leaks.rows.map((r) => r.table_name), [], 'aucune vue ne doit reprendre cette colonne');
  const mat = await db.query(
    `select matviewname from pg_matviews
      where schemaname='public' and definition ilike '%mocked_location_2026%'`,
  );
  eq(mat.rows.map((r) => r.matviewname), [], 'aucune vue matérialisée ne doit la reprendre');
});

// ═══ 7. LA RLS DE `runs` N'A PAS BOUGÉ ══════════════════════════════════════
await t('`runs` garde sa RLS activée (la migration n’y touche pas)', async () => {
  const rls = (await db.query(
    `select relrowsecurity from pg_class where oid = 'public.runs'::regclass`,
  )).rows[0].relrowsecurity;
  eq(rls, true, 'ajouter une colonne ne doit jamais désarmer la sécurité de la table');
});

console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
