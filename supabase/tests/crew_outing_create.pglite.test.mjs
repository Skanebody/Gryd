#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0085 (`crew_outing_create`).
 * E49 — CRÉER UNE SORTIE CREW DEVIENT POSSIBLE, et le serveur reste seul juge.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0085 ne contient AUCUN TypeScript : trois colonnes, deux contraintes, un
 * index unique partiel, cinq fonctions PL/pgSQL, des grants. Les tests Deno du
 * dépôt n'en touchent pas une ligne. Sans ce fichier, « un runner ne peut pas
 * publier de sortie », « une adresse numérotée est refusée » et « un double-tap
 * ne crée pas deux rendez-vous » resteraient des phrases dans un commentaire —
 * c'est-à-dire une doc qui promet au-delà du code.
 *
 * Et c'est là qu'on se trompe sans le voir. Six fautes ne se lisent pas :
 *   · une garde de rôle recopiée à la main qui DÉRIVE de `CREW_PERMISSIONS` —
 *     la création s'ouvrirait au stratège sans que personne ne l'ait décidé ;
 *   · un `when_label` laissé NOT NULL, qui ferait échouer TOUTE insertion du
 *     nouveau chemin (la fonction n'écrit plus cette colonne) ;
 *   · une détection d'adresse qui dit OUI côté écran et NON côté serveur : le
 *     CTA serait peint valide puis refusé — le bouton mort exact que la
 *     constitution interdit. Les DEUX implémentations sont donc comparées sur
 *     la MÊME liste de cas, extraite du module client ;
 *   · un plafond anti-inondation reçu du CLIENT (la faute corrigée dans 0051) ;
 *   · une horloge CLIENT qui déciderait du « à venir » : un téléphone en
 *     retard republierait des rendez-vous passés en tête de liste ;
 *   · un double-tap qui publie deux fois — sans écran pour supprimer l'un des
 *     deux, le mur du crew garde le doublon pour toujours.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `crew_edit_rpc.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0085 s'applique sur un Postgres réel, telle quelle, PAR-DESSUS la lignée
 *     complète 0002 → 0084.
 *  2. Les trois colonnes existent, sont NULLABLES, et leurs CHECK portent les
 *     bornes de `game-rules.ts` (le fichier est RELU ici).
 *  3. `when_label` et `zone_label` ne sont plus NOT NULL, et une ligne SANS
 *     aucune heure reste impossible (`crew_events_when_present_check`).
 *  4. LE RÔLE DÉCIDE, ET C'EST LA MATRICE QUI LE DIT : founder, co_captain et
 *     captain publient ; strategist, scout, runner et rookie sont REFUSÉS ; un
 *     non-membre n'a même pas de crew ; déconnecté = `signed_out`.
 *  5. LA VALIDATION REJETTE CE QU'ELLE ANNONCE : titre vide / 81, lieu vide /
 *     81, zone 81, activité inconnue, objectif inconnu, capacité 0 / 1 / 51 /
 *     négative, instant absent / passé / au-delà de l'horizon.
 *  6. LA VIE PRIVÉE : `crew_outing_place_refusal` rend EXACTEMENT le même
 *     verdict que le module pur `features/crew/crewOuting.ts` sur ses 25 cas de
 *     référence, et `crew_outing_create` refuse le libellé AVANT d'écrire.
 *  7. IDEMPOTENCE : republier la même sortie (même auteur, même instant, même
 *     titre à la casse/espaces près) rend la ligne EXISTANTE avec
 *     `duplicate: true` et ne crée AUCUN doublon.
 *  8. LE PLAFOND EST SERVEUR : au-delà de CREW_OUTING_MAX_UPCOMING_PER_CREW
 *     sorties à venir, la création est refusée — et les sorties PASSÉES ne
 *     comptent pas dans le plafond.
 *  9. `crew_outing_context` ne rend que les sorties À VENIR du crew DU JOUEUR,
 *     triées, avec `canCreate` tranché serveur.
 * 10. L'ÉCRITURE DIRECTE RESTE FERMÉE : aucun privilège insert/update/delete
 *     sur `crew_events` pour `authenticated`/`anon`. Les deux RPC clientes sont
 *     SECURITY DEFINER, search_path figé, ouvertes à `authenticated` et fermées
 *     à `anon` ; les fonctions internes sont fermées à tout le monde.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue, pas un
 *    refus vécu par un tiers. La garantie « seuls les membres actifs lisent le
 *    lieu » repose donc sur `crew_events_select_member` (0019), relue et non
 *    exécutée sous un vrai rôle.
 *  · `auth.uid()` est un bouchon : on le REDÉFINIT pour incarner un acteur.
 *  · LA CONCURRENCE : PGlite est mono-connexion. Ce test prouve l'idempotence
 *    SÉQUENTIELLE ; la sérialisation de deux publications VRAIMENT simultanées
 *    repose sur l'index unique partiel, relu mais non éprouvé sous contention.
 *  · QUE L'ÉCRAN APPELLE CES FONCTIONS. Les décisions de formulaire sont pures
 *    et testées en Deno (`features/crew/crewOuting.test.ts`).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/crew_outing_create.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const ROOT = join(HERE, '..', '..');
const GAME_RULES = join(ROOT, 'packages', 'shared', 'src', 'game-rules.ts');
const CREW_OUTING_TS = join(ROOT, 'apps', 'mobile', 'src', 'features', 'crew', 'crewOuting.ts');

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

// ─── Micro-harnais (aucune dépendance de test) ───────────────────────────────
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

// ─── Les constantes du dépôt, RELUES (jamais recopiées) ─────────────────────
const rules = readFileSync(GAME_RULES, 'utf8');
const num = (name) => {
  const m = rules.match(new RegExp(`export const ${name} = (\\d+)`));
  if (!m) throw new Error(`constante ${name} introuvable dans game-rules.ts`);
  return Number(m[1]);
};
const TITLE_MAX = num('CREW_OUTING_TITLE_MAX');
const PLACE_MAX = num('CREW_OUTING_PLACE_LABEL_MAX');
const ZONE_MAX = num('CREW_OUTING_ZONE_LABEL_MAX');
const CAPACITY_MIN = num('CREW_OUTING_CAPACITY_MIN');
const CAPACITY_MAX = num('CREW_MAX_MEMBERS'); // CREW_OUTING_CAPACITY_MAX = CREW_MAX_MEMBERS
const HORIZON_DAYS = num('CREW_OUTING_HORIZON_DAYS');
const MAX_UPCOMING = num('CREW_OUTING_MAX_UPCOMING_PER_CREW');

/** Les rôles autorisés par CREW_PERMISSIONS.createOuting, LUS dans la matrice. */
const CREATE_ROLES = (() => {
  const m = rules.match(/createOuting: \[([^\]]+)\]/);
  if (!m) throw new Error('CREW_PERMISSIONS.createOuting introuvable');
  return m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean).sort();
})();

/**
 * Les cas de référence du point de rendez-vous, EXTRAITS du module client.
 * Une liste recopiée ici dériverait au premier cas ajouté d'un seul côté — et
 * la divergence est précisément ce que ce test doit rendre impossible.
 */
const FIXTURES = (() => {
  const src = readFileSync(CREW_OUTING_TS, 'utf8');
  const start = src.indexOf('export const MEETING_POINT_FIXTURES');
  if (start === -1) throw new Error('MEETING_POINT_FIXTURES introuvable dans crewOuting.ts');
  const body = src.slice(start, src.indexOf('\n];', start));
  const out = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\['(.*)', (null|'street_address'|'door_detail')\],\s*$/);
    if (m) out.push([m[1].replace(/\\'/g, "'"), m[2] === 'null' ? null : m[2].replace(/'/g, '')]);
  }
  if (out.length < 20) throw new Error(`extraction des fixtures incomplète (${out.length})`);
  return out;
})();

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
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 84)
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

console.log('crew_outing_create — migration 0085 (E49, sortie crew) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0084)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0085_crew_outing_create.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0085 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const CHIEF = '11111111-1111-1111-1111-111111111111';
const OFFICER = '22222222-2222-2222-2222-222222222222'; // co_captain
const CAPTAIN = '33333333-3333-3333-3333-333333333333';
const STRATEGIST = '99999999-9999-9999-9999-999999999999';
const RUNNER = '44444444-4444-4444-4444-444444444444';
const ROOKIE = '55555555-5555-5555-5555-555555555555';
const OUTSIDER = '66666666-6666-6666-6666-666666666666'; // AUCUN crew
const EXMEMBER = '77777777-7777-7777-7777-777777777777'; // a QUITTÉ
const OTHERCHIEF = '88888888-8888-8888-8888-888888888888'; // fondateur d'un AUTRE crew

const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const CREW2 = 'aaaaaaaa-0000-0000-0000-000000000002';
const PARIS = 'paris';

for (const [id, pseudo] of [
  [CHIEF, 'chief'], [OFFICER, 'officer'], [CAPTAIN, 'captain'], [STRATEGIST, 'strategist'],
  [RUNNER, 'runner'], [ROOKIE, 'rookie'], [OUTSIDER, 'outsider'], [EXMEMBER, 'exmember'],
  [OTHERCHIEF, 'otherchief'],
]) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(
    `insert into public.users (id, pseudo, city_id, foulees) values ($1, $2, $3, 1000)
     on conflict (id) do update set pseudo = excluded.pseudo`,
    [id, pseudo, PARIS],
  );
}

for (const [id, name, code, owner] of [
  [CREW, 'Les Berges', 'BBBBB1', CHIEF],
  [CREW2, 'Les Autres', 'BBBBB2', OTHERCHIEF],
]) {
  await db.query(
    `insert into public.crews (id, name, color, city_id, code, recruitment_status, created_by)
     values ($1, $2, 1, $3, $4, 'on_request', $5)`,
    [id, name, PARIS, code, owner],
  );
}

const member = (crew, user, role, leftAt = null) =>
  db.query(
    `insert into public.crew_members (crew_id, user_id, role, joined_at, left_at)
     values ($1, $2, $3, now() - interval '30 days', $4)`,
    [crew, user, role, leftAt],
  );

await member(CREW, CHIEF, 'founder');
await member(CREW, OFFICER, 'co_captain');
await member(CREW, CAPTAIN, 'captain');
await member(CREW, STRATEGIST, 'strategist');
await member(CREW, RUNNER, 'runner');
await member(CREW, ROOKIE, 'rookie');
await member(CREW, EXMEMBER, 'runner', new Date(Date.now() - 5 * 864e5).toISOString());
await member(CREW2, OTHERCHIEF, 'founder');

const be = (uid) =>
  db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );

/** `crew_outing_create` avec des paramètres NOMMÉS (comme le fait supabase-js). */
const create = async ({
  title = 'Sortie du soir',
  startsAt = null,
  activity = 'run',
  objective = 'defense',
  place = 'Place de la République',
  zone = null,
  capacity = null,
} = {}) =>
  (
    await db.query(
      `select public.crew_outing_create(
         p_title => $1, p_starts_at => $2, p_activity => $3, p_objective => $4,
         p_place_label => $5, p_zone_label => $6, p_capacity => $7) as r`,
      [title, startsAt ?? inHours(24), activity, objective, place, zone, capacity],
    )
  ).rows[0].r;

const context = async () => (await db.query('select public.crew_outing_context() as r')).rows[0].r;

function inHours(h) {
  return new Date(Date.now() + h * 3600_000).toISOString();
}
const countEvents = async (crew) =>
  Number(
    (await db.query('select count(*)::int as n from public.crew_events where crew_id = $1', [crew]))
      .rows[0].n,
  );

// ═══ 2. LES COLONNES, ET LEURS BORNES ═══════════════════════════════════════
await t('starts_at / activity / capacity existent et sont NULLABLES', async () => {
  const { rows } = await db.query(`
    select column_name, is_nullable, data_type from information_schema.columns
    where table_schema='public' and table_name='crew_events'
      and column_name in ('starts_at','activity','capacity')
    order by column_name`);
  eq(rows.map((r) => r.column_name), ['activity', 'capacity', 'starts_at'], 'colonnes');
  for (const r of rows) eq(r.is_nullable, 'YES', `${r.column_name} doit rester NULLABLE`);
  eq(rows[2].data_type, 'timestamp with time zone', 'starts_at est un instant, pas du texte');
});

await t('when_label et zone_label ne sont plus NOT NULL', async () => {
  const { rows } = await db.query(`
    select column_name, is_nullable from information_schema.columns
    where table_schema='public' and table_name='crew_events'
      and column_name in ('when_label','zone_label') order by column_name`);
  for (const r of rows) eq(r.is_nullable, 'YES', `${r.column_name}`);
});

await t('une ligne SANS aucune heure reste impossible', async () => {
  let raised = false;
  try {
    await db.query(
      `insert into public.crew_events (crew_id, title, place_label, objective, created_by)
       values ($1, 'x', 'y', 'defense', $2)`,
      [CREW, CHIEF],
    );
  } catch {
    raised = true;
  }
  ok(raised, 'crew_events_when_present_check n’a pas mordu');
});

await t('les CHECK portent les bornes de game-rules (capacité, activité)', async () => {
  const { rows } = await db.query(`
    select conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname='crew_events' and conname in
      ('crew_events_capacity_check','crew_events_activity_check')
    order by conname`);
  eq(rows.length, 2, 'les deux contraintes existent');
  const cap = rows.find((r) => r.conname === 'crew_events_capacity_check').def;
  ok(cap.includes(String(CAPACITY_MIN)), `borne min ${CAPACITY_MIN} absente : ${cap}`);
  ok(cap.includes(String(CAPACITY_MAX)), `borne max ${CAPACITY_MAX} absente : ${cap}`);
  const act = rows.find((r) => r.conname === 'crew_events_activity_check').def;
  for (const a of ['run', 'bike']) ok(act.includes(a), `activité ${a} absente : ${act}`);
});

await t('l’horizon et le plafond SERVEUR ne dérivent pas de game-rules', async () => {
  const h = (await db.query('select public.crew_outing_horizon_days() as n')).rows[0].n;
  const m = (await db.query('select public.crew_outing_max_upcoming() as n')).rows[0].n;
  eq(Number(h), HORIZON_DAYS, 'CREW_OUTING_HORIZON_DAYS');
  eq(Number(m), MAX_UPCOMING, 'CREW_OUTING_MAX_UPCOMING_PER_CREW');
});

// ═══ 3. LE RÔLE DÉCIDE, ET C'EST LA MATRICE QUI LE DIT ══════════════════════
await t('déconnecté : signed_out (et rien n’est écrit)', async () => {
  await be(null);
  const before = await countEvents(CREW);
  const r = await create();
  eq(r.reason, 'signed_out', 'motif');
  eq(await countEvents(CREW), before, 'aucune écriture');
});

await t('sans crew : no_crew — jamais « forbidden » (ce n’est pas un rôle)', async () => {
  await be(OUTSIDER);
  eq((await create()).reason, 'no_crew', 'motif');
});

await t('un ex-membre n’a plus de crew : no_crew', async () => {
  await be(EXMEMBER);
  eq((await create()).reason, 'no_crew', 'motif');
});

for (const [uid, role] of [[RUNNER, 'runner'], [ROOKIE, 'rookie'], [STRATEGIST, 'strategist']]) {
  await t(`${role} est REFUSÉ (la matrice dit ${CREATE_ROLES.join('/')})`, async () => {
    ok(!CREATE_ROLES.includes(role), `${role} figure dans CREW_PERMISSIONS.createOuting !`);
    await be(uid);
    const before = await countEvents(CREW);
    eq((await create()).reason, 'forbidden', 'motif');
    eq(await countEvents(CREW), before, 'aucune écriture');
  });
}

for (const [uid, role, pseudo] of [
  [CHIEF, 'founder', 'chief'],
  [OFFICER, 'co_captain', 'officer'],
  [CAPTAIN, 'captain', 'captain'],
]) {
  await t(`${role} PUBLIE (la matrice l’autorise)`, async () => {
    ok(CREATE_ROLES.includes(role), `${role} manque à CREW_PERMISSIONS.createOuting`);
    await be(uid);
    const r = await create({ title: `Sortie de ${role}`, startsAt: inHours(30) });
    eq(r.ok, true, `refusé : ${JSON.stringify(r)}`);
    eq(r.outing.title, `Sortie de ${role}`, 'titre rendu');
    // Le pseudo vient de `public_profiles` (vue modérée), jamais d'une phrase
    // composée en SQL : c'est l'écran qui écrira « Sortie de X ».
    eq(r.outing.hostPseudo, pseudo, 'pseudo de l’hôte');
  });
}

await t('la sortie écrite ne porte AUCUN when_label (starts_at est la seule heure)', async () => {
  const { rows } = await db.query(
    `select when_label, starts_at, activity from public.crew_events
     where crew_id = $1 and title = 'Sortie de founder'`,
    [CREW],
  );
  eq(rows.length, 1, 'une ligne');
  eq(rows[0].when_label, null, 'when_label doit rester NULL');
  ok(rows[0].starts_at !== null, 'starts_at doit être écrit');
  eq(rows[0].activity, 'run', 'activité déclarée');
});

// ═══ 4. LA VALIDATION REJETTE CE QU'ELLE ANNONCE ════════════════════════════
await be(CHIEF);
const REJECTS = [
  ['titre vide', { title: '   ' }, 'bad_title'],
  [`titre ${TITLE_MAX + 1}`, { title: 'x'.repeat(TITLE_MAX + 1) }, 'bad_title'],
  ['lieu vide', { place: '' }, 'bad_place'],
  [`lieu ${PLACE_MAX + 1}`, { place: 'x'.repeat(PLACE_MAX + 1) }, 'bad_place'],
  [`zone ${ZONE_MAX + 1}`, { zone: 'x'.repeat(ZONE_MAX + 1) }, 'bad_zone'],
  ['activité inconnue', { activity: 'swim' }, 'bad_activity'],
  ['activité absente', { activity: null }, 'bad_activity'],
  ['objectif inconnu', { objective: 'raid' }, 'bad_objective'],
  ['capacité 0', { capacity: 0 }, 'bad_capacity'],
  ['capacité 1 (une sortie n’est pas une course solo)', { capacity: 1 }, 'bad_capacity'],
  ['capacité NÉGATIVE', { capacity: -3 }, 'bad_capacity'],
  [`capacité ${CAPACITY_MAX + 1}`, { capacity: CAPACITY_MAX + 1 }, 'bad_capacity'],
  ['instant absent', { startsAt: null, forceNull: true }, 'bad_starts_at'],
  ['instant PASSÉ', { startsAt: inHours(-1) }, 'starts_at_past'],
  ['au-delà de l’horizon', { startsAt: inHours(24 * (HORIZON_DAYS + 1)) }, 'starts_at_too_far'],
];
for (const [label, args, reason] of REJECTS) {
  await t(`refus : ${label} → ${reason}`, async () => {
    const before = await countEvents(CREW);
    const r = args.forceNull
      ? (
          await db.query(
            `select public.crew_outing_create('T', null, 'run', 'defense', 'Place X') as r`,
          )
        ).rows[0].r
      : await create(args);
    eq(r.ok, false, `aurait dû être refusé : ${JSON.stringify(r)}`);
    eq(r.reason, reason, 'motif');
    eq(await countEvents(CREW), before, 'aucune écriture');
  });
}

await t('la capacité MIN et MAX passent (les bornes sont inclusives)', async () => {
  for (const [i, cap] of [CAPACITY_MIN, CAPACITY_MAX].entries()) {
    const r = await create({ title: `Cap ${cap}`, capacity: cap, startsAt: inHours(40 + i) });
    eq(r.ok, true, `capacité ${cap} refusée : ${JSON.stringify(r)}`);
    eq(r.outing.capacity, cap, 'capacité rendue');
  }
});

await t('la zone est FACULTATIVE : absente, elle vaut null, pas une chaîne vide', async () => {
  const r = await create({ title: 'Sans zone', zone: '   ', startsAt: inHours(41.5) });
  eq(r.ok, true, `refusé : ${JSON.stringify(r)}`);
  eq(r.outing.zoneLabel, null, 'un seul encodage du vide');
});

// ═══ 5. VIE PRIVÉE — LE SERVEUR ET L'ÉCRAN DISENT LA MÊME CHOSE ═════════════
await t(`les ${FIXTURES.length} cas de référence du client donnent le MÊME verdict en SQL`, async () => {
  const wrong = [];
  for (const [label, expected] of FIXTURES) {
    const got = (
      await db.query('select public.crew_outing_place_refusal($1) as r', [label])
    ).rows[0].r;
    if ((got ?? null) !== expected) wrong.push(`« ${label} » : SQL=${got}, client=${expected}`);
  }
  eq(wrong, [], 'divergence écran/serveur sur le refus d’adresse');
});

await t('une adresse numérotée est refusée AVANT toute écriture, avec son sous-motif', async () => {
  const before = await countEvents(CREW);
  const r = await create({ place: '12 rue de la Paix', startsAt: inHours(42) });
  eq(r.ok, false, 'aurait dû être refusé');
  eq(r.reason, 'place_looks_like_address', 'motif');
  eq(r.kind, 'street_address', 'sous-motif (pour la bonne phrase à l’écran)');
  eq(await countEvents(CREW), before, 'aucune écriture');
});

await t('un détail de PORTE est refusé (digicode) — le pire des cas', async () => {
  const r = await create({ place: 'Chez moi, digicode 45A12', startsAt: inHours(43) });
  eq(r.reason, 'place_looks_like_address', 'motif');
  eq(r.kind, 'door_detail', 'sous-motif');
});

await t('un lieu public passe (c’est le geste qu’on recommande)', async () => {
  const r = await create({ title: 'RDV public', place: 'Métro République, sortie Magenta', startsAt: inHours(44) });
  eq(r.ok, true, `refusé à tort : ${JSON.stringify(r)}`);
});

await t('AUCUNE colonne de coordonnées n’a été ajoutée (donnée non collectée)', async () => {
  const { rows } = await db.query(`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='crew_events'
      and (column_name like '%lat%' or column_name like '%lng%'
        or column_name like '%lon%' or column_name like '%geo%'
        or column_name like '%h3%')`);
  eq(rows.map((r) => r.column_name), [], 'une coordonnée a été introduite');
});

// ═══ 6. IDEMPOTENCE ═════════════════════════════════════════════════════════
await t('republier la même sortie ne crée PAS de doublon', async () => {
  const at = inHours(50);
  const first = await create({ title: 'Rappel du mardi', startsAt: at });
  eq(first.ok, true, `première publication refusée : ${JSON.stringify(first)}`);
  eq(first.duplicate, false, 'la première n’est pas un doublon');

  const before = await countEvents(CREW);
  // Même instant, même titre à la CASSE et aux ESPACES près : c'est la même.
  const again = await create({ title: '  rappel DU mardi  ', startsAt: at });
  eq(again.ok, true, 'le rejeu doit réussir, pas échouer');
  eq(again.duplicate, true, 'le rejeu doit être signalé comme doublon');
  eq(again.outing.id, first.outing.id, 'la ligne EXISTANTE est rendue');
  eq(await countEvents(CREW), before, 'aucune ligne créée par le rejeu');
});

await t('deux AUTEURS peuvent publier le même titre au même moment', async () => {
  const at = inHours(51);
  await be(CHIEF);
  const a = await create({ title: 'Footing', startsAt: at });
  await be(CAPTAIN);
  const b = await create({ title: 'Footing', startsAt: at });
  eq(a.ok && b.ok, true, 'les deux doivent passer');
  ok(a.outing.id !== b.outing.id, 'ce sont deux sorties distinctes');
});

// ═══ 7. LE PLAFOND EST SERVEUR, ET LE PASSÉ NE COMPTE PAS ═══════════════════
await t(`au-delà de ${MAX_UPCOMING} sorties à venir, la création est refusée`, async () => {
  await be(OTHERCHIEF); // crew VIERGE : le compte part de zéro
  for (let i = 0; i < MAX_UPCOMING; i += 1) {
    const r = await create({ title: `Sortie ${i}`, startsAt: inHours(100 + i) });
    eq(r.ok, true, `la sortie ${i} aurait dû passer : ${JSON.stringify(r)}`);
  }
  const over = await create({ title: 'Une de trop', startsAt: inHours(200) });
  eq(over.ok, false, 'le plafond n’a pas mordu');
  eq(over.reason, 'too_many_upcoming', 'motif');
  eq(Number(over.max), MAX_UPCOMING, 'le plafond est DIT au client');
});

await t('les sorties PASSÉES ne comptent pas dans le plafond', async () => {
  // On fait passer la plus proche dans le passé : une place se libère.
  await db.query(
    `update public.crew_events set starts_at = now() - interval '2 hours'
     where crew_id = $1 and title = 'Sortie 0'`,
    [CREW2],
  );
  const r = await create({ title: 'Après la purge', startsAt: inHours(201) });
  eq(r.ok, true, `refusé alors qu’une place s’est libérée : ${JSON.stringify(r)}`);
});

// ═══ 8. LE CONTEXTE ═════════════════════════════════════════════════════════
await t('crew_outing_context : canCreate suit la matrice, jamais le client', async () => {
  for (const [uid, role] of [
    [CHIEF, 'founder'], [OFFICER, 'co_captain'], [CAPTAIN, 'captain'],
    [STRATEGIST, 'strategist'], [RUNNER, 'runner'], [ROOKIE, 'rookie'],
  ]) {
    await be(uid);
    const c = await context();
    eq(c.ok, true, `contexte illisible pour ${role}`);
    eq(c.role, role, 'rôle rendu');
    eq(c.canCreate, CREATE_ROLES.includes(role), `canCreate pour ${role}`);
    eq(Number(c.maxUpcoming), MAX_UPCOMING, 'plafond dit à l’écran');
  }
});

await t('le contexte ne rend QUE les sorties à venir DU crew du joueur, triées', async () => {
  await be(CHIEF);
  // Une sortie PASSÉE du même crew : elle ne doit pas apparaître.
  await db.query(
    `insert into public.crew_events
       (crew_id, title, place_label, objective, starts_at, activity, created_by)
     values ($1, 'Sortie d’hier', 'Parc', 'defense', now() - interval '1 day', 'run', $2)`,
    [CREW, CHIEF],
  );
  const c = await context();
  const titles = c.upcoming.map((o) => o.title);
  ok(!titles.includes('Sortie d’hier'), 'une sortie passée est rendue comme « à venir »');
  ok(!titles.includes('Sortie 0'), 'une sortie d’un AUTRE crew fuit dans le contexte');
  const stamps = c.upcoming.map((o) => new Date(o.startsAt).getTime());
  eq(stamps, [...stamps].sort((a, b) => a - b), 'tri par instant croissant');
  ok(c.upcoming.length > 0, 'le crew a bien des sorties à venir');
});

await t('déconnecté / sans crew : le contexte REFUSE, il ne rend pas une liste vide', async () => {
  await be(null);
  eq((await context()).reason, 'signed_out', 'motif déconnecté');
  await be(OUTSIDER);
  eq((await context()).reason, 'no_crew', 'motif sans crew');
});

// ═══ 9. PRIVILÈGES ══════════════════════════════════════════════════════════
await t('aucune écriture directe sur crew_events pour authenticated/anon', async () => {
  const { rows } = await db.query(`
    select grantee, privilege_type from information_schema.role_table_grants
    where table_schema='public' and table_name='crew_events'
      and grantee in ('anon','authenticated')
      and privilege_type in ('INSERT','UPDATE','DELETE')`);
  eq(rows, [], 'un privilège d’écriture directe subsiste');
});

await t('les deux RPC clientes : SECURITY DEFINER, search_path figé, anon fermé', async () => {
  for (const fn of ['crew_outing_context', 'crew_outing_create']) {
    const { rows } = await db.query(
      `select p.prosecdef, p.proconfig from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname=$1`,
      [fn],
    );
    eq(rows.length, 1, `${fn} existe`);
    eq(rows[0].prosecdef, true, `${fn} doit être SECURITY DEFINER`);
    ok(
      (rows[0].proconfig || []).some((c) => c.startsWith('search_path=')),
      `${fn} sans search_path épinglé`,
    );
    const g = await db.query(
      `select has_function_privilege($1, p.oid, 'execute') as can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname=$2`,
      ['authenticated', fn],
    );
    eq(g.rows[0].can, true, `${fn} doit être exécutable par authenticated`);
    const a = await db.query(
      `select has_function_privilege($1, p.oid, 'execute') as can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname=$2`,
      ['anon', fn],
    );
    eq(a.rows[0].can, false, `${fn} doit être FERMÉE à anon`);
  }
});

await t('les fonctions INTERNES sont fermées à tout le monde', async () => {
  for (const fn of [
    'crew_outing_place_refusal', 'crew_outing_place_fold',
    'crew_outing_row', 'crew_outing_horizon_days', 'crew_outing_max_upcoming',
  ]) {
    for (const role of ['anon', 'authenticated']) {
      const { rows } = await db.query(
        `select has_function_privilege($1, p.oid, 'execute') as can
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname='public' and p.proname=$2`,
        [role, fn],
      );
      eq(rows[0].can, false, `${fn} est exécutable par ${role}`);
    }
  }
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} échec(s)`);
if (failures.length > 0) {
  for (const f of failures) console.error(`\n✗ ${f.name}\n  ${f.err.stack || f.err.message}`);
  process.exit(1);
}
