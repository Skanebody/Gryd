#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0084 (`crew_edit_rpc`).
 * L'ÉDITION DE CREW DEVIENT POSSIBLE — et le serveur reste seul juge.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0084 ne contient AUCUN TypeScript : une colonne, trois fonctions PL/pgSQL,
 * des grants, une révocation. Les tests Deno du dépôt n'en touchent pas une
 * ligne. Sans ce fichier, « un membre simple ne peut pas renommer le crew » et
 * « rejouer l'édition ne débite pas deux fois » resteraient des phrases dans un
 * commentaire — c'est-à-dire une doc qui promet au-delà du code.
 *
 * Et c'est bien là qu'on se trompe sans le voir. Six fautes ne se lisent pas :
 *   · une garde de rôle recopiée à la main qui DÉRIVE de `CREW_PERMISSIONS` —
 *     l'édition s'ouvrirait au co-capitaine sans que personne ne l'ait décidé ;
 *   · un renommage facturé à chaque `update`, y compris quand le nom ne change
 *     pas : un fondateur qui corrige sa description paierait 300 foulées ;
 *   · un débit qui part AVANT la modération : un nom refusé coûterait quand même ;
 *   · un `coalesce` sur la description, qui rendrait l'effacement IMPOSSIBLE
 *     (« vide » se confondrait avec « ne touche pas ») ;
 *   · des tags comparés dans l'ordre reçu, donc une édition « idempotente » qui
 *     réécrit à chaque envoi ;
 *   · le grant `update (color)` de 0003 laissé ouvert : la RPC serait la porte
 *     d'entrée officielle… à côté d'une porte dérobée toujours déverrouillée.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `crew_discovery.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0084 s'applique sur un Postgres réel, telle quelle, PAR-DESSUS la lignée
 *     complète 0002 → 0083 — pas sur une maquette de schéma.
 *  2. `crews.description` existe, est NULLABLE, et sa borne 280 est celle que
 *     le client recopie (`features/crew/crewEdit.ts` est RELU ici).
 *  3. LE RÔLE DÉCIDE, ET C'EST LA MATRICE QUI LE DIT : un fondateur édite ;
 *     un CO-CAPITAINE, un capitaine, un runner et un rookie sont REFUSÉS ; un
 *     non-membre n'a même pas de crew. Le co-capitaine est refusé PARCE QUE la
 *     matrice dit ['founder'] — pas parce qu'on l'a décidé ici (§8).
 *  4. LA VALIDATION REJETTE CE QU'ELLE ANNONCE : nom vide, nom > 40, description
 *     > 280, statut de recrutement inconnu, tag hors catalogue.
 *  5. LA MODÉRATION S'APPLIQUE AUX DEUX TEXTES, et le motif reste OPAQUE.
 *  6. LE RENOMMAGE EST PAYANT (CREW_RENAME_FOULEES) — et SEULEMENT quand le nom
 *     change vraiment. Solde insuffisant → refus AVEC le prix et le solde, et
 *     AUCUNE écriture. Nom refusé par la modération → AUCUN débit.
 *  7. IDEMPOTENCE : rejouer exactement la même édition ne débite pas deux fois,
 *     ne change rien, et rend le même crew. Y compris pour des tags envoyés
 *     dans un autre ordre, ou un nom entouré d'espaces.
 *  8. LA DÉRIVE DES CONSTANTES EST TESTÉE contre `game-rules.ts` : les trois
 *     gardes de rôle, le coût du renommage, les 4 statuts, les 9 tags.
 *  9. L'ÉCRITURE DIRECTE SUR `crews` EST FERMÉE : plus aucun privilège UPDATE
 *     (ni global, ni par colonne) pour `authenticated`/`anon`, et la policy
 *     `crews_update_creator` a disparu.
 * 10. Les deux RPC clientes sont SECURITY DEFINER, search_path figé, ouvertes à
 *     `authenticated` et fermées à `anon` ; `crew_description_refusal` est
 *     fermée à TOUT LE MONDE (sinon elle serait un oracle mot-à-mot).
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne
 *    s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue, pas un refus
 *    vécu par un tiers.
 *  · `auth.uid()` est un bouchon : on le REDÉFINIT pour incarner un acteur. Ce
 *    n'est pas une session Supabase, c'est une simulation fidèle de son effet.
 *  · LE VERROU `for update` NE PEUT PAS ÊTRE ÉPROUVÉ ICI : PGlite est
 *    mono-connexion, donc deux renommages VRAIMENT concurrents ne sont pas
 *    simulables. Ce que ce test prouve, c'est l'idempotence SÉQUENTIELLE (le
 *    rejeu ne débite pas) ; la sérialisation concurrente repose sur le `for
 *    update` de la migration, relu mais non exécuté sous contention.
 *  · QUE L'ÉCRAN APPELLE CES FONCTIONS. Les décisions de formulaire sont pures
 *    et testées en Deno (`features/crew/crewEdit.test.ts`).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/crew_edit_rpc.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const ROOT = join(HERE, '..', '..');
const GAME_RULES = join(ROOT, 'packages', 'shared', 'src', 'game-rules.ts');
const CREW_EDIT_TS = join(ROOT, 'apps', 'mobile', 'src', 'features', 'crew', 'crewEdit.ts');

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
      '    node supabase/tests/crew_edit_rpc.pglite.test.mjs',
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

// Même liste de sauts que les tests voisins, et pour la même raison : PGlite
// n'embarque ni pgcrypto, ni pg_cron, ni la publication realtime.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 83)
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

console.log('crew_edit_rpc — migration 0084 (édition de crew) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0083)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0084_crew_edit_rpc.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0084 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const CHIEF = '11111111-1111-1111-1111-111111111111'; // fondateur, riche
const OFFICER = '22222222-2222-2222-2222-222222222222'; // co_captain (« officier »)
const CAPTAIN = '33333333-3333-3333-3333-333333333333'; // captain
const RUNNER = '44444444-4444-4444-4444-444444444444'; // membre simple
const ROOKIE = '55555555-5555-5555-5555-555555555555'; // en période d'essai
const OUTSIDER = '66666666-6666-6666-6666-666666666666'; // AUCUN crew
const EXMEMBER = '77777777-7777-7777-7777-777777777777'; // a QUITTÉ le crew
const PAUPER = '88888888-8888-8888-8888-888888888888'; // fondateur SANS foulées

const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const CREW_POOR = 'aaaaaaaa-0000-0000-0000-000000000002';
const PARIS = 'paris';

const people = [
  [CHIEF, 'chief', 10_000],
  [OFFICER, 'officer', 10_000],
  [CAPTAIN, 'captain', 10_000],
  [RUNNER, 'runner', 10_000],
  [ROOKIE, 'rookie', 10_000],
  [OUTSIDER, 'outsider', 10_000],
  [EXMEMBER, 'exmember', 10_000],
  [PAUPER, 'pauper', 120], // < CREW_RENAME_FOULEES : ne peut PAS renommer
];
for (const [id, pseudo, foulees] of people) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(
    `insert into public.users (id, pseudo, city_id, foulees) values ($1, $2, $3, $4)
     on conflict (id) do update
       set pseudo = excluded.pseudo, city_id = excluded.city_id, foulees = excluded.foulees`,
    [id, pseudo, PARIS, foulees],
  );
}

for (const [id, name, code, owner] of [
  [CREW, 'Les Berges', 'AAAAA1', CHIEF],
  [CREW_POOR, 'Sans Le Sou', 'AAAAA2', PAUPER],
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
await member(CREW, RUNNER, 'runner');
await member(CREW, ROOKIE, 'rookie');
await member(CREW, EXMEMBER, 'runner', new Date(Date.now() - 5 * 864e5).toISOString());
await member(CREW_POOR, PAUPER, 'founder');

// Incarner un acteur : `auth.uid()` est un bouchon, on le redéfinit.
const be = (uid) =>
  db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );

/** Appelle `crew_edit` avec des paramètres NOMMÉS (comme le fait supabase-js). */
const edit = async ({ name = null, description = null, status = null, tags = null } = {}) =>
  (
    await db.query(
      `select public.crew_edit(
         p_name => $1, p_description => $2,
         p_recruitment_status => $3, p_tags => $4) as r`,
      [name, description, status, tags],
    )
  ).rows[0].r;

const context = async () =>
  (await db.query('select public.crew_edit_context() as r')).rows[0].r;

const fouleesOf = async (uid) =>
  (await db.query('select foulees from public.users where id = $1', [uid])).rows[0].foulees;

const crewRow = async (id) =>
  (await db.query('select * from public.crews where id = $1', [id])).rows[0];

// ═══ 2. LA COLONNE MANQUANTE EXISTE, ET SA BORNE NE DÉRIVE PAS ══════════════
await t('crews.description existe, est NULLABLE, et est du texte', async () => {
  const { rows } = await db.query(`
    select is_nullable, data_type from information_schema.columns
    where table_schema='public' and table_name='crews' and column_name='description'`);
  eq(rows.length, 1, 'colonne description');
  eq(rows[0].is_nullable, 'YES', 'nullabilité (NULL = aucune description)');
  eq(rows[0].data_type, 'text', 'type');
});

await t('la borne 280 vit dans le CHECK et refuse 281 caractères', async () => {
  const { rows } = await db.query(`
    select pg_get_constraintdef(c.oid) as def
    from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname='crews' and c.conname='crews_description_check'`);
  eq(rows.length, 1, 'contrainte crews_description_check');
  ok(rows[0].def.includes('280'), `la borne n’est pas 280 : ${rows[0].def}`);
  let raised = false;
  try {
    await db.query('update public.crews set description = $1 where id = $2', [
      'x'.repeat(281),
      CREW,
    ]);
  } catch {
    raised = true;
  }
  ok(raised, 'le CHECK a laissé passer 281 caractères');
});

await t('la borne du client (crewEdit.ts) == la borne du schéma', () => {
  const src = readFileSync(CREW_EDIT_TS, 'utf8');
  const m = src.match(/export const DESCRIPTION_MAX = (\d+)/);
  ok(m, 'DESCRIPTION_MAX introuvable dans features/crew/crewEdit.ts');
  eq(Number(m[1]), 280, 'DESCRIPTION_MAX a DÉRIVÉ de crews_description_check');
  const n = src.match(/export const NAME_MAX = (\d+)/);
  ok(n, 'NAME_MAX introuvable dans features/crew/crewEdit.ts');
  eq(Number(n[1]), 40, 'NAME_MAX a DÉRIVÉ de la borne DDL du nom (0002)');
});

// ═══ 3. QUATRE ÉTATS DE LECTURE, JAMAIS CONFONDUS ═══════════════════════════
await t('déconnecté : crew_edit_context dit signed_out (et n’invente rien)', async () => {
  await be(null);
  const r = await context();
  eq(r.ok, false, 'ok');
  eq(r.reason, 'signed_out', 'motif');
});

await t('sans crew : no_crew — une RÉPONSE, pas une panne', async () => {
  await be(OUTSIDER);
  const r = await context();
  eq(r.ok, false, 'ok');
  eq(r.reason, 'no_crew', 'motif');
});

await t('un ancien membre (left_at) n’est plus dans son crew : no_crew', async () => {
  await be(EXMEMBER);
  const r = await context();
  eq(r.reason, 'no_crew', 'un membre parti garde un droit d’édition');
});

await t('le fondateur lit son crew, ses droits, le coût et son solde', async () => {
  await be(CHIEF);
  const r = await context();
  eq(r.ok, true, 'ok');
  eq(r.role, 'founder', 'rôle');
  eq(r.crew.name, 'Les Berges', 'nom');
  eq(r.crew.description, null, 'description initiale (aucune, pas la chaîne vide)');
  eq(r.crew.recruitmentStatus, 'on_request', 'statut');
  eq(r.crew.tags, [], 'tags');
  eq(r.can, { name: true, description: true, recruitment: true }, 'droits');
  eq(r.renameCostFoulees, 300, 'coût du renommage');
  eq(r.myFoulees, 10_000, 'solde');
  eq(r.descriptionMax, 280, 'borne de description annoncée');
});

await t('le contexte ne divulgue NI le code secret NI la couleur non rendue', async () => {
  await be(CHIEF);
  const r = await context();
  const keys = Object.keys(r.crew);
  ok(!keys.includes('code'), 'crews.code (secret 0036) est sorti du serveur');
  ok(!keys.includes('color'), 'crews.color est proposé alors qu’aucune surface ne la rend');
  ok(!JSON.stringify(r).includes('AAAAA1'), 'le code d’invitation fuit dans la charge utile');
});

await t('un membre simple LIT le contexte mais ses droits sont TOUS faux', async () => {
  await be(RUNNER);
  const r = await context();
  eq(r.ok, true, 'la lecture est permise (il est bien dans le crew)');
  eq(r.can, { name: false, description: false, recruitment: false }, 'droits du runner');
});

await t('le CO-CAPITAINE n’a aucun droit d’édition — la matrice dit founder', async () => {
  await be(OFFICER);
  const r = await context();
  eq(r.role, 'co_captain', 'rôle');
  eq(r.can, { name: false, description: false, recruitment: false }, 'droits du co_captain');
});

// ═══ 4. LE RÔLE DÉCIDE — L'ÉCRITURE ════════════════════════════════════════
for (const [uid, role] of [
  [OFFICER, 'co_captain'],
  [CAPTAIN, 'captain'],
  [RUNNER, 'runner'],
  [ROOKIE, 'rookie'],
]) {
  await t(`${role} est REFUSÉ sur le nom, la description ET le recrutement`, async () => {
    await be(uid);
    const before = await crewRow(CREW);

    const a = await edit({ name: 'Coup d’État' });
    eq(a.ok, false, 'nom');
    eq(a.reason, 'forbidden', 'motif nom');
    eq(a.field, 'name', 'champ nom');

    const b = await edit({ description: 'je décide' });
    eq(b.reason, 'forbidden', 'motif description');
    eq(b.field, 'description', 'champ description');

    const c = await edit({ status: 'open' });
    eq(c.reason, 'forbidden', 'motif recrutement');
    eq(c.field, 'recruitment', 'champ recrutement');

    const d = await edit({ tags: ['casual'] });
    eq(d.reason, 'forbidden', 'motif tags');

    const after = await crewRow(CREW);
    eq(after.name, before.name, 'le nom a bougé malgré le refus');
    eq(after.description, before.description, 'la description a bougé malgré le refus');
    eq(after.recruitment_status, before.recruitment_status, 'le statut a bougé malgré le refus');
    eq(after.tags, before.tags, 'les tags ont bougé malgré le refus');
  });
}

await t('un appel SANS AUCUN champ n’écrit rien, même pour un membre sans droit', async () => {
  await be(RUNNER);
  const before = await crewRow(CREW);
  const r = await edit({});
  eq(r.ok, true, 'ok');
  eq(r.renamed, false, 'renamed');
  eq(r.fouleesSpent, 0, 'montant');
  const after = await crewRow(CREW);
  eq(after.name, before.name, 'le nom a bougé');
  eq(after.description, before.description, 'la description a bougé');
  eq(after.tags, before.tags, 'les tags ont bougé');
});

await t('un NON-MEMBRE ne trouve aucun crew à éditer (no_crew, jamais forbidden)', async () => {
  await be(OUTSIDER);
  const r = await edit({ name: 'Le Crew Des Autres' });
  eq(r.ok, false, 'ok');
  eq(r.reason, 'no_crew', 'motif');
});

await t('un ancien membre ne peut plus rien éditer', async () => {
  await be(EXMEMBER);
  eq((await edit({ description: 'revenge' })).reason, 'no_crew', 'motif');
});

await t('déconnecté : aucune écriture possible', async () => {
  await be(null);
  eq((await edit({ name: 'Anonyme' })).reason, 'signed_out', 'motif');
});

// ═══ 5. LA VALIDATION REJETTE CE QU'ELLE ANNONCE ════════════════════════════
await t('nom vide ou blanc → bad_name, sans écriture', async () => {
  await be(CHIEF);
  eq((await edit({ name: '' })).reason, 'bad_name', 'nom vide');
  eq((await edit({ name: '    ' })).reason, 'bad_name', 'nom d’espaces');
  eq((await crewRow(CREW)).name, 'Les Berges', 'le nom a été écrit malgré le refus');
});

await t('nom > 40 → bad_name ; exactement 40 passe', async () => {
  await be(CHIEF);
  eq((await edit({ name: 'x'.repeat(41) })).reason, 'bad_name', '41 caractères');
  const before = await fouleesOf(CHIEF);
  const r = await edit({ name: 'y'.repeat(40) });
  eq(r.ok, true, '40 caractères');
  eq(await fouleesOf(CHIEF), before - 300, 'le renommage n’a pas été facturé');
  // On remet le nom d'origine pour la suite (et ça recoûte : c'est la règle).
  await edit({ name: 'Les Berges' });
});

await t('description > 280 → bad_description ; 280 passe', async () => {
  await be(CHIEF);
  eq(
    (await edit({ description: 'x'.repeat(281) })).reason,
    'bad_description',
    '281 caractères',
  );
  const r = await edit({ description: 'z'.repeat(280) });
  eq(r.ok, true, '280 caractères');
  eq(r.crew.description.length, 280, 'longueur écrite');
});

await t('statut de recrutement inconnu → bad_recruitment_status', async () => {
  await be(CHIEF);
  eq((await edit({ status: 'secret' })).reason, 'bad_recruitment_status', 'statut inventé');
  eq((await edit({ status: 'OPEN' })).reason, 'bad_recruitment_status', 'casse différente');
  eq((await crewRow(CREW)).recruitment_status, 'on_request', 'le statut a bougé');
});

await t('les 4 statuts du catalogue sont TOUS acceptés', async () => {
  await be(CHIEF);
  for (const s of ['open', 'invite_only', 'closed', 'on_request']) {
    const r = await edit({ status: s });
    eq(r.ok, true, `statut ${s}`);
    eq(r.crew.recruitmentStatus, s, `statut écrit ${s}`);
  }
});

await t('tag hors catalogue → bad_tags, aucun tag écrit', async () => {
  await be(CHIEF);
  eq((await edit({ tags: ['casual', 'ultra_elite'] })).reason, 'bad_tags', 'tag inventé');
  eq((await crewRow(CREW)).tags, [], 'des tags ont été écrits malgré le refus');
});

await t('les tags sont DÉDOUBLONNÉS et TRIÉS par le serveur', async () => {
  await be(CHIEF);
  const r = await edit({ tags: ['raid', 'casual', 'raid'] });
  eq(r.ok, true, 'ok');
  eq(r.crew.tags, ['casual', 'raid'], 'normalisation serveur');
});

await t('un tableau de tags VIDE efface les tags (≠ null qui ne touche à rien)', async () => {
  await be(CHIEF);
  await edit({ tags: ['casual', 'raid'] });
  const r = await edit({ tags: [] });
  eq(r.crew.tags, [], 'les tags n’ont pas été effacés');
  const s = await edit({ description: 'inchangé côté tags' });
  eq(s.crew.tags, [], 'null sur les tags a modifié les tags');
});

// ═══ 6. MODÉRATION — les deux textes, un motif OPAQUE ═══════════════════════
await t('un nom insultant est refusé, avec un motif qui n’enseigne rien', async () => {
  await be(CHIEF);
  const before = await fouleesOf(CHIEF);
  const r = await edit({ name: 'Les Connards du 18e' });
  eq(r.ok, false, 'ok');
  eq(r.reason, 'name_unavailable', 'motif');
  ok(!('field' in r) || r.field !== 'blocked_term', 'le motif interne a fuité');
  eq(await fouleesOf(CHIEF), before, 'un nom REFUSÉ a quand même été facturé');
});

await t('une marque dans le NOM reste refusée (doctrine 0050 inchangée)', async () => {
  await be(CHIEF);
  eq((await edit({ name: 'Adidas Runners' })).reason, 'name_unavailable', 'marque en nom');
});

await t('une insulte dans la DESCRIPTION est refusée, MOT ENTIER', async () => {
  await be(CHIEF);
  const r = await edit({ description: 'ici on accueille tout le monde sauf un connard' });
  eq(r.reason, 'description_unavailable', 'motif');
});

await t('une insulte AU PLURIEL est refusée (flexion, mode squash → début de mot)', async () => {
  await be(CHIEF);
  // Le cas qui a fait tomber la première version du filtre : « connards » n'est
  // pas un contournement, c'est la façon normale d'écrire une phrase.
  const r = await edit({ description: 'ici on accueille tout le monde sauf les connards' });
  eq(r.reason, 'description_unavailable', 'motif');
  eq((await edit({ description: 'no fucking way' })).reason,
    'description_unavailable', 'flexion anglaise');
});

await t('citer une marque dans une DESCRIPTION reste permis (pas d’usurpation)', async () => {
  await be(CHIEF);
  const r = await edit({ description: 'RDV devant le Decathlon, on court en Adidas.' });
  eq(r.ok, true, 'une description légitime a été refusée comme un nom de crew');
});

await t('les faux positifs classiques de 0050 restent ÉPARGNÉS en mode word', async () => {
  await be(CHIEF);
  for (const text of [
    'On part de Scunthorpe puis Essex, allure libre.',   // cunt / sex
    'Maillot violet, ambiance sans violence.',            // viol
    'Un fagot de bois au point de rendez-vous.',          // fag
    'Culture running et bousculade évitée.',              // cul
  ]) {
    const r = await edit({ description: text });
    eq(r.ok, true, `faux positif sur : ${text}`);
  }
});

await t('LIMITE ASSUMÉE : le fractionnement par séparateurs PASSE en description', async () => {
  // Le filtre des NOMS l'attrape (squash intégral) ; celui des descriptions non,
  // parce que recoller 280 caractères inventerait des mots. Le test VERROUILLE
  // ce compromis au lieu de le laisser découvrir : si quelqu'un active un jour
  // le squash intégral, il devra d'abord assumer les faux positifs ici.
  await be(CHIEF);
  const r = await edit({ description: 'salut les c-o-n-n-a-r-d-s' });
  eq(r.ok, true, 'le fractionnement est désormais attrapé — vérifier les faux positifs');
  eq((await edit({ name: 'Les C.O.N.N.A.R.D.S' })).reason,
    'name_unavailable', 'le filtre des NOMS a cessé d’attraper le fractionnement');
});

await t('une description invisible (zero-width) est refusée', async () => {
  await be(CHIEF);
  const zwsp = String.fromCharCode(0x200b);
  const r = await edit({ description: `Crew${zwsp} sympa` });
  eq(r.reason, 'description_unavailable', 'motif');
});

// ═══ 7. LE RENOMMAGE EST PAYANT — ET SEULEMENT S'IL RENOMME ════════════════
await t('renommer débite CREW_RENAME_FOULEES et le dit', async () => {
  await be(CHIEF);
  await edit({ name: 'Les Berges' }); // état connu
  const before = await fouleesOf(CHIEF);
  const r = await edit({ name: 'Berges Nord' });
  eq(r.ok, true, 'ok');
  eq(r.renamed, true, 'renamed');
  eq(r.fouleesSpent, 300, 'montant débité annoncé');
  eq(r.fouleesLeft, before - 300, 'solde restant annoncé');
  eq(await fouleesOf(CHIEF), before - 300, 'solde réel');
  eq((await crewRow(CREW)).name, 'Berges Nord', 'nom écrit');
});

await t('renvoyer LE MÊME nom ne débite RIEN (idempotence)', async () => {
  await be(CHIEF);
  const before = await fouleesOf(CHIEF);
  const r = await edit({ name: 'Berges Nord' });
  eq(r.ok, true, 'ok');
  eq(r.renamed, false, 'renamed');
  eq(r.fouleesSpent, 0, 'montant');
  eq(await fouleesOf(CHIEF), before, 'un renommage à vide a été facturé');
});

await t('le même nom entouré d’espaces n’est pas un renommage', async () => {
  await be(CHIEF);
  const before = await fouleesOf(CHIEF);
  const r = await edit({ name: '   Berges Nord   ' });
  eq(r.renamed, false, 'renamed');
  eq(await fouleesOf(CHIEF), before, 'une espace en trop a coûté 300 foulées');
});

await t('éditer la description ne facture JAMAIS un renommage', async () => {
  await be(CHIEF);
  const before = await fouleesOf(CHIEF);
  const r = await edit({ description: 'Sorties le mardi et le jeudi, 19 h, allure libre.' });
  eq(r.ok, true, 'ok');
  eq(r.renamed, false, 'renamed');
  eq(await fouleesOf(CHIEF), before, 'une édition sans renommage a débité');
  eq(r.crew.name, 'Berges Nord', 'le nom a changé alors qu’on ne l’envoyait pas');
});

await t('rejouer une édition COMPLÈTE à l’identique ne débite pas deux fois', async () => {
  await be(CHIEF);
  const payload = {
    name: 'Berges Sud',
    description: 'Un crew, un quartier.',
    status: 'open',
    tags: ['casual', 'exploration'],
  };
  const start = await fouleesOf(CHIEF);
  const first = await edit(payload);
  eq(first.ok, true, '1er envoi');
  eq(first.renamed, true, '1er envoi renomme');
  eq(await fouleesOf(CHIEF), start - 300, 'débit du 1er envoi');

  const second = await edit(payload);
  eq(second.ok, true, '2e envoi');
  eq(second.renamed, false, 'le rejeu a re-facturé un renommage');
  eq(await fouleesOf(CHIEF), start - 300, 'le rejeu a débité une seconde fois');
  eq(second.crew, first.crew, 'le rejeu a produit un crew différent');
});

await t('des tags renvoyés dans un AUTRE ORDRE ne changent rien', async () => {
  await be(CHIEF);
  const r = await edit({ tags: ['exploration', 'casual'] });
  eq(r.crew.tags, ['casual', 'exploration'], 'ordre normalisé');
});

await t('solde insuffisant → refus AVEC le prix et le solde, et AUCUNE écriture', async () => {
  await be(PAUPER);
  const before = await crewRow(CREW_POOR);
  const r = await edit({ name: 'Toujours Sans Le Sou' });
  eq(r.ok, false, 'ok');
  eq(r.reason, 'not_enough_foulees', 'motif');
  eq(r.need, 300, 'prix annoncé');
  eq(r.have, 120, 'solde annoncé');
  eq((await crewRow(CREW_POOR)).name, before.name, 'le nom a été écrit sans être payé');
  eq(await fouleesOf(PAUPER), 120, 'le solde a bougé');
});

await t('sans le sou, le fondateur édite quand même le RESTE', async () => {
  await be(PAUPER);
  const r = await edit({ description: 'On court, c’est gratuit.', status: 'open' });
  eq(r.ok, true, 'une édition sans renommage a été bloquée par le solde');
  eq(r.fouleesSpent, 0, 'montant');
  eq(await fouleesOf(PAUPER), 120, 'solde');
});

await t('le solde ne peut jamais devenir négatif (CHECK foulees >= 0)', async () => {
  const { rows } = await db.query('select foulees from public.users where foulees < 0');
  eq(rows.length, 0, 'un solde négatif existe en base');
});

// ═══ 8. LA DESCRIPTION S'EFFACE — ET NE VAUT JAMAIS '' ═════════════════════
await t('la chaîne vide EFFACE la description (et rend NULL, pas \'\')', async () => {
  await be(CHIEF);
  await edit({ description: 'quelque chose' });
  const r = await edit({ description: '' });
  eq(r.ok, true, 'ok');
  eq(r.crew.description, null, 'description après effacement');
  eq((await crewRow(CREW)).description, null, 'valeur en base');
});

await t('des espaces seuls effacent aussi (un seul encodage du vide)', async () => {
  await be(CHIEF);
  await edit({ description: 'du texte' });
  const r = await edit({ description: '   ' });
  eq(r.crew.description, null, 'description');
});

await t('null sur la description NE L’EFFACE PAS (« ne touche pas »)', async () => {
  await be(CHIEF);
  await edit({ description: 'à conserver' });
  const r = await edit({ status: 'closed' });
  eq(r.crew.description, 'à conserver', 'la description a été effacée par un null');
});

// ═══ 9. DÉRIVE DES CONSTANTES CONTRE game-rules.ts ═════════════════════════
const RULES_SRC = readFileSync(GAME_RULES, 'utf8');
const listFromRules = (key) => {
  const m = RULES_SRC.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  ok(m, `${key} introuvable dans game-rules.ts`);
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort();
};

const defOf = async (name) =>
  (
    await db.query(
      `select pg_get_functiondef(p.oid) as def
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname=$1`,
      [name],
    )
  ).rows[0].def;

await t('les 3 gardes de rôle du SQL == les 3 entrées de CREW_PERMISSIONS', async () => {
  const def = await defOf('crew_edit');
  const pairs = [
    ['v_can_name', 'changeNameEmblem'],
    ['v_can_settings', 'changeSettings'],
    ['v_can_recruitment', 'manageRecruitment'],
  ];
  for (const [variable, action] of pairs) {
    const m = def.match(new RegExp(`${variable}\\s*:=\\s*v_role in \\(([^)]*)\\)`));
    ok(m, `garde ${variable} introuvable dans crew_edit`);
    const fromSql = m[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort();
    eq(fromSql, listFromRules(action), `${variable} a DÉRIVÉ de CREW_PERMISSIONS.${action}`);
  }
});

await t('les mêmes 3 gardes sont répliquées à l’identique dans crew_edit_context', async () => {
  const def = await defOf('crew_edit_context');
  for (const [key, action] of [
    ["'name'", 'changeNameEmblem'],
    ["'description'", 'changeSettings'],
    ["'recruitment'", 'manageRecruitment'],
  ]) {
    const m = def.match(new RegExp(`${key},\\s*v_role in \\(([^)]*)\\)`));
    ok(m, `droit ${key} introuvable dans crew_edit_context`);
    const fromSql = m[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort();
    eq(fromSql, listFromRules(action), `can.${key} a DÉRIVÉ de CREW_PERMISSIONS.${action}`);
  }
});

await t('le coût du renommage du SQL == CREW_RENAME_FOULEES', async () => {
  const m = RULES_SRC.match(/export const CREW_RENAME_FOULEES = (\d+)/);
  ok(m, 'CREW_RENAME_FOULEES introuvable dans game-rules.ts');
  const cost = Number(m[1]);
  const edit_ = await defOf('crew_edit');
  const ctx = await defOf('crew_edit_context');
  // Toute occurrence marquée `-- game-rules: CREW_RENAME_FOULEES` doit valoir le barème.
  for (const [what, def] of [['crew_edit', edit_], ['crew_edit_context', ctx]]) {
    const marks = [...def.matchAll(/(\d+)[^\n]*-- game-rules: CREW_RENAME_FOULEES/g)];
    ok(marks.length > 0, `aucune occurrence marquée dans ${what}`);
    for (const mk of marks) {
      eq(Number(mk[1]), cost, `${what} a DÉRIVÉ de CREW_RENAME_FOULEES`);
    }
  }
});

await t('les 4 statuts du SQL == CREW_RECRUITMENT_STATUSES', async () => {
  const m = RULES_SRC.match(/CREW_RECRUITMENT_STATUSES[^=]*=\s*\[([^\]]*)\]/);
  ok(m, 'CREW_RECRUITMENT_STATUSES introuvable');
  const fromRules = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort();
  const def = await defOf('crew_edit');
  const g = def.match(/v_new_status not in \(([^)]*)\)/);
  ok(g, 'garde de statut introuvable');
  const fromSql = g[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .sort();
  eq(fromSql, fromRules, 'crew_edit a DÉRIVÉ de CREW_RECRUITMENT_STATUSES');
});

await t('les 9 tags du SQL == CREW_TAGS (et == le CHECK de 0013)', async () => {
  const block = RULES_SRC.match(/export const CREW_TAGS = \{([\s\S]*?)\n\} as const;/);
  ok(block, 'CREW_TAGS introuvable');
  const fromRules = [...block[1].matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]).sort();
  eq(fromRules.length, 9, 'nombre de tags dans game-rules');

  const def = await defOf('crew_edit');
  const g = def.match(/v_new_tags <@ array\[([\s\S]*?)\]::text\[\]/);
  ok(g, 'garde de tags introuvable');
  const fromSql = [...g[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  eq(fromSql, fromRules, 'crew_edit a DÉRIVÉ de CREW_TAGS');

  const { rows } = await db.query(`
    select pg_get_constraintdef(c.oid) as def
    from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname='crews' and c.conname='crews_tags_check'`);
  eq(rows.length, 1, 'crews_tags_check (0013)');
  const fromCheck = [...rows[0].def.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  eq(fromCheck, fromRules, 'le CHECK de 0013 a DÉRIVÉ de CREW_TAGS');
});

// ═══ 10. L'ÉCRITURE DIRECTE SUR crews EST FERMÉE ═══════════════════════════
await t('aucun privilège UPDATE global sur crews pour authenticated/anon', async () => {
  const { rows } = await db.query(`
    select has_table_privilege('authenticated', 'public.crews', 'update') as a,
           has_table_privilege('anon',          'public.crews', 'update') as b,
           has_table_privilege('authenticated', 'public.crews', 'insert') as c,
           has_table_privilege('authenticated', 'public.crews', 'select') as d`);
  eq(rows[0].a, false, 'authenticated peut encore UPDATE crews');
  eq(rows[0].b, false, 'anon peut UPDATE crews');
  eq(rows[0].c, false, 'authenticated peut INSERT crews (0042 devait le fermer)');
  eq(rows[0].d, false, 'authenticated peut SELECT crews (0036 devait le fermer)');
});

await t('aucun privilège UPDATE PAR COLONNE ne survit (le trou de 0003)', async () => {
  const { rows } = await db.query(`
    select column_name from information_schema.column_privileges
    where table_schema='public' and table_name='crews'
      and privilege_type='UPDATE' and grantee in ('authenticated','anon')`);
  eq(rows.map((r) => r.column_name), [], 'des colonnes restent écrivables directement');
});

await t('la policy crews_update_creator a disparu', async () => {
  const { rows } = await db.query(`
    select polname from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relname='crews'`);
  const names = rows.map((r) => r.polname).sort();
  ok(!names.includes('crews_update_creator'), `policy encore présente : ${names.join(', ')}`);
});

// ═══ 11. PRIVILÈGES ET DURCISSEMENT DES FONCTIONS ══════════════════════════
await t('les 2 RPC clientes sont ouvertes à authenticated, fermées à anon', async () => {
  const { rows } = await db.query(`
    select p.proname,
           has_function_privilege('authenticated', p.oid, 'execute') as a,
           has_function_privilege('anon',          p.oid, 'execute') as b
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname in ('crew_edit', 'crew_edit_context')`);
  eq(rows.length, 2, 'les deux RPC existent');
  for (const r of rows) {
    eq(r.a, true, `${r.proname} inaccessible à authenticated`);
    eq(r.b, false, `${r.proname} accessible à anon`);
  }
});

await t('crew_description_refusal est fermée à TOUT LE MONDE (aucun oracle)', async () => {
  const { rows } = await db.query(`
    select has_function_privilege('authenticated', p.oid, 'execute') as a,
           has_function_privilege('anon',          p.oid, 'execute') as b,
           has_function_privilege('public',        p.oid, 'execute') as c
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='crew_description_refusal'`);
  eq(rows[0].a, false, 'authenticated peut tester la liste mot par mot');
  eq(rows[0].b, false, 'anon peut tester la liste mot par mot');
  eq(rows[0].c, false, 'PUBLIC peut tester la liste mot par mot');
});

await t('les 3 fonctions sont SECURITY DEFINER avec search_path figé', async () => {
  const { rows } = await db.query(`
    select p.proname, p.prosecdef, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public'
      and p.proname in ('crew_edit', 'crew_edit_context', 'crew_description_refusal')`);
  eq(rows.length, 3, 'les trois fonctions');
  for (const r of rows) {
    eq(r.prosecdef, true, `${r.proname} n’est pas SECURITY DEFINER`);
    ok(
      (r.proconfig || []).some((c) => c.startsWith('search_path=')),
      `${r.proname} n’épingle pas son search_path`,
    );
  }
});

await t('crew_description_refusal RÉUTILISE la table et le fold de 0050', async () => {
  const def = await defOf('crew_description_refusal');
  ok(def.includes('blocked_name_terms'), 'elle n’utilise pas la table de 0050');
  ok(def.includes('moderation_fold'), 'elle n’utilise pas la normalisation de 0050');
  ok(!def.includes('moderation_squash'), 'elle utilise squash — faux positifs sur de la prose');
  ok(!def.includes('reserved_handles'), 'elle applique la liste des marques à de la prose');
});

// ═══ 12. LE VERROU EST BIEN POSÉ (relu, pas exécuté sous contention) ═══════
await t('crew_edit verrouille la ligne crew avant de facturer (for update)', async () => {
  const def = await defOf('crew_edit');
  ok(/from public\.crews c where c\.id = v_crew_id\s+for update/.test(def),
    'aucun `for update` sur la ligne crew : deux renommages concurrents factureraient deux fois');
  const debitAt = def.indexOf('u.foulees >= 300');
  const moderationAt = def.indexOf('crew_name_refusal');
  ok(moderationAt !== -1 && debitAt !== -1, 'modération ou débit introuvable');
  ok(moderationAt < debitAt, 'le débit passe AVANT la modération : un nom refusé coûterait');
});

// ─── Bilan ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} vert(s), ${failures.length} rouge(s).`);
if (failures.length > 0) {
  console.log('\nÉchecs :');
  for (const f of failures) console.log(`  · ${f.name}\n    ${f.err.message}`);
  process.exit(1);
}
