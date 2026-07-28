#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0097 (E41 : l'ACCÈS choisi à la création).
 *
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `crew_outing_create.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0097 s’applique sur un Postgres réel, telle quelle, PAR-DESSUS la lignée
 *     complète 0002 → 0096 (donc au-dessus de 0050, qui posait la modération).
 *  2. LA SIGNATURE : la version à 3 arguments a DISPARU (une seule fonction
 *     candidate, jamais deux comportements), la version à 4 existe, son 4e
 *     argument a un DÉFAUT, elle est SECURITY DEFINER, `search_path` figé,
 *     ouverte à `authenticated` et fermée à `anon` / `public`.
 *  3. RÉTROCOMPATIBILITÉ : un appel qui n'envoie PAS l'accès (le client d'hier)
 *     écrit exactement CREW_RECRUITMENT_DEFAULT — et cette valeur est prouvée
 *     égale, en même temps, à la constante de `game-rules.ts`, au littéral de la
 *     migration et au DÉFAUT de la colonne. Les trois ne peuvent pas diverger.
 *  4. CHAQUE statut de CREW_RECRUITMENT_AT_CREATION (LU dans `game-rules.ts`,
 *     jamais recopié) est accepté, écrit VERBATIM en base, et RENVOYÉ dans la
 *     charge utile — l'écran confirme ce qui a été écrit, pas ce qui a été tapé.
 *  5. `closed` est REFUSÉ (`bad_recruitment_status`) : il ne fait pas partie du
 *     sous-ensemble de création. Une valeur inconnue l'est aussi. Aucune n'est
 *     silencieusement repliée sur le défaut.
 *  6. LE REFUS PRÉCÈDE L'ÉCRITURE : après un refus d'accès, aucune ligne
 *     `crews` ni `crew_members` n'a été créée, et le joueur reste sans crew.
 *  7. LES GARDES DE 0050 SURVIVENT AU REMPLACEMENT : signed_out, bad_name (vide
 *     et 41 caractères), name_unavailable (modération), bad_color, bad_city,
 *     already_in_crew. Aucune n'a été perdue en recopiant le corps.
 *  8. Le créateur devient `founder` (spéc E41 : « le créateur devient chef »).
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue, pas un refus
 *    vécu par un tiers (`npm run verify:rls` le fait sur le vrai projet).
 *  · `auth.uid()` est un bouchon : on le REDÉFINIT pour incarner un acteur.
 *  · `extensions.gen_random_bytes` est un bouchon (PGlite n'a pas pgcrypto) :
 *    l'unicité du code crew n'est donc PAS éprouvée ici — 0036 la porte.
 *  · QUE L'ÉCRAN ENVOIE CE PARAMÈTRE. Le pré-vol est pur et testé en Deno
 *    (`packages/engine/src/crewJoin.test.ts`, `isCrewRecruitmentAtCreation`) ;
 *    son miroir mobile vit dans `apps/mobile/src/features/crew/real.ts`.
 *  · QUE `crew_join_intent` HONORE le statut : c'est 0083 qui l'écrit, et ce
 *    test ne le rejoue pas.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/create_crew_recruitment.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const ROOT = join(HERE, '..', '..');
const GAME_RULES = join(ROOT, 'packages', 'shared', 'src', 'game-rules.ts');

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

/** CREW_RECRUITMENT_AT_CREATION, extrait du tableau TypeScript. */
const AT_CREATION = (() => {
  const m = rules.match(/CREW_RECRUITMENT_AT_CREATION: readonly CrewRecruitmentStatus\[\] = \[([^\]]+)\]/);
  if (!m) throw new Error('CREW_RECRUITMENT_AT_CREATION introuvable dans game-rules.ts');
  const out = m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
  if (out.length !== 3) throw new Error(`extraction incomplète : ${JSON.stringify(out)}`);
  return out;
})();

const RECRUITMENT_DEFAULT = (() => {
  const m = rules.match(/CREW_RECRUITMENT_DEFAULT: CrewRecruitmentStatus = '([a-z_]+)'/);
  if (!m) throw new Error('CREW_RECRUITMENT_DEFAULT introuvable dans game-rules.ts');
  return m[1];
})();

const COLORS_COUNT = (() => {
  const m = rules.match(/export const CREW_COLORS_COUNT = (\d+)/);
  if (!m) throw new Error('CREW_COLORS_COUNT introuvable dans game-rules.ts');
  return Number(m[1]);
})();

const SQL_0097 = readFileSync(join(MIGRATIONS, '0097_create_crew_recruitment.sql'), 'utf8');

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
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) < 97)
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

console.log('create_crew — migration 0097 (E41, accès choisi à la création) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0096)\n`);

// ═══ 0. LE DÉFAUT DE LA COLONNE, AVANT 0097 ═════════════════════════════════
// Lu ici, sur la lignée SEULE : c'est la valeur historique que 0097 promet de
// ne pas changer.
const colDefaultBefore = (
  await db.query(`
    select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'crews'
      and column_name = 'recruitment_status'
  `)
).rows[0]?.column_default;

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(SQL_0097);
} catch (err) {
  migrationError = err;
}

await t('la migration 0097 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const A = '22222222-2222-2222-2222-222222222222';
const B = '33333333-3333-3333-3333-333333333333';
const C = '44444444-4444-4444-4444-444444444444';
const D = '55555555-5555-5555-5555-555555555555';
const E = '66666666-6666-6666-6666-666666666666';
const F = '77777777-7777-7777-7777-777777777777';
const PARIS = 'paris';

await db.query(
  // La boîte englobante est POSÉE PAR UN TRIGGER (0066) à partir de
  // `geojson -> 'coordinates'`, et ces colonnes sont NOT NULL : un polygone vide
  // ferait échouer l'insert. On donne donc un vrai carré (grossièrement Paris).
  `insert into public.city_zones (city_id, name, geojson)
   values ($1, 'Paris', '{"type":"Polygon","coordinates":[[[2.22,48.80],[2.48,48.80],[2.48,48.92],[2.22,48.92],[2.22,48.80]]]}'::jsonb)
   on conflict (city_id) do nothing`,
  [PARIS],
);

for (const [id, pseudo] of [
  [FOUNDER, 'founder'], [A, 'alpha'], [B, 'bravo'], [C, 'charlie'],
  [D, 'delta'], [E, 'echo'], [F, 'foxtrot'],
]) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(
    `insert into public.users (id, pseudo, city_id) values ($1, $2, $3)
     on conflict (id) do update set pseudo = excluded.pseudo`,
    [id, pseudo, PARIS],
  );
}

/** Incarne un acteur (ou personne). */
const as = async (uid) => {
  await db.exec(
    uid === null
      ? `create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`
      : `create or replace function auth.uid() returns uuid language sql stable as $$ select '${uid}'::uuid $$;`,
  );
};

/** Appel à 4 arguments (le client d'aujourd'hui). */
const create4 = async (uid, name, color, city, status) => {
  await as(uid);
  const r = await db.query(
    'select public.create_crew($1, $2::smallint, $3, $4) as out',
    [name, color, city, status],
  );
  return r.rows[0].out;
};

/** Appel à 3 arguments (le client d'HIER — le 4e argument prend son défaut). */
const create3 = async (uid, name, color, city) => {
  await as(uid);
  const r = await db.query('select public.create_crew($1, $2::smallint, $3) as out', [
    name, color, city,
  ]);
  return r.rows[0].out;
};

const crewCount = async () =>
  Number((await db.query('select count(*)::int as n from public.crews')).rows[0].n);

// ═══ 2. LA SIGNATURE ════════════════════════════════════════════════════════
await t('une SEULE fonction create_crew subsiste, à 4 arguments dont un par défaut', async () => {
  const r = await db.query(`
    select pg_get_function_identity_arguments(p.oid) as args,
           pronargdefaults as ndefaults,
           prosecdef       as secdef,
           p.proconfig     as config
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_crew'
    order by args
  `);
  eq(r.rows.length, 1, 'nombre de fonctions create_crew (la 3-arguments doit avoir disparu)');
  eq(
    r.rows[0].args,
    'p_name text, p_color smallint, p_city_id text, p_recruitment_status text',
    'signature',
  );
  eq(Number(r.rows[0].ndefaults), 1, 'nombre de paramètres à défaut');
  ok(r.rows[0].secdef === true, 'create_crew doit rester SECURITY DEFINER');
  ok(
    (r.rows[0].config ?? []).some((c) => c.startsWith('search_path=')),
    'search_path doit rester figé',
  );
});

await t('create_crew : EXECUTE pour authenticated, fermé à anon et public', async () => {
  const priv = async (role) =>
    (
      await db.query(
        `select has_function_privilege($1, 'public.create_crew(text, smallint, text, text)', 'EXECUTE') as p`,
        [role],
      )
    ).rows[0].p;
  eq(await priv('authenticated'), true, 'authenticated');
  eq(await priv('anon'), false, 'anon');
  const acl = (
    await db.query(`
      select coalesce(array_to_string(p.proacl, ','), '') as acl
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'create_crew'
    `)
  ).rows[0].acl;
  ok(!/(^|,)=X\//.test(acl), `PUBLIC ne doit pas garder EXECUTE (acl: ${acl})`);
});

// ═══ 3. RÉTROCOMPATIBILITÉ : le client d'hier obtient le comportement d'hier ═
await t('appel à 3 arguments → CREW_RECRUITMENT_DEFAULT, inchangé', async () => {
  const out = await create3(FOUNDER, 'Les Berges', 0, PARIS);
  eq(out.ok, true, 'création');
  eq(out.crew.recruitment_status, RECRUITMENT_DEFAULT, 'statut renvoyé');
  const row = (
    await db.query('select recruitment_status from public.crews where id = $1', [out.crew.id])
  ).rows[0];
  eq(row.recruitment_status, RECRUITMENT_DEFAULT, 'statut écrit en base');
});

await t('le défaut est le MÊME dans game-rules.ts, dans la colonne et dans 0097', () => {
  ok(
    typeof colDefaultBefore === 'string' && colDefaultBefore.includes(`'${RECRUITMENT_DEFAULT}'`),
    `défaut de colonne (${colDefaultBefore}) vs game-rules (${RECRUITMENT_DEFAULT})`,
  );
  ok(
    SQL_0097.includes(`coalesce(p_recruitment_status, '${RECRUITMENT_DEFAULT}')`),
    'le littéral de 0097 doit valoir CREW_RECRUITMENT_DEFAULT',
  );
});

await t('le créateur devient founder (spéc E41)', async () => {
  const r = await db.query(
    `select cm.role from public.crew_members cm where cm.user_id = $1 and cm.left_at is null`,
    [FOUNDER],
  );
  eq(r.rows.map((x) => x.role), ['founder'], 'rôle du créateur');
});

// ═══ 4. CHAQUE STATUT DE CREATION EST ACCEPTÉ, ÉCRIT ET RENVOYÉ ═════════════
const ACTORS = [A, B, C];
for (let i = 0; i < AT_CREATION.length; i += 1) {
  const status = AT_CREATION[i];
  await t(`accès « ${status} » : accepté, écrit VERBATIM, renvoyé`, async () => {
    const out = await create4(ACTORS[i], `Crew ${status}`, 1, PARIS, status);
    eq(out.ok, true, `création avec ${status}`);
    eq(out.crew.recruitment_status, status, 'statut renvoyé');
    const row = (
      await db.query('select recruitment_status from public.crews where id = $1', [out.crew.id])
    ).rows[0];
    eq(row.recruitment_status, status, 'statut écrit en base');
  });
}

await t('les 3 valeurs de la migration sont EXACTEMENT CREW_RECRUITMENT_AT_CREATION', () => {
  const m = SQL_0097.match(/p_recruitment_status not in \(([^)]+)\)/);
  ok(m !== null, 'liste blanche introuvable dans 0097');
  const inSql = m[1].split(',').map((s) => s.trim().replace(/'/g, '')).sort();
  eq(inSql, [...AT_CREATION].sort(), 'liste blanche SQL vs game-rules.ts');
});

// ═══ 5. CE QUI EST REFUSÉ L'EST EXPLICITEMENT, ET AVANT TOUTE ÉCRITURE ══════
await t('« closed » est refusé : un crew d’un membre ne se mure pas à la naissance', async () => {
  const before = await crewCount();
  const out = await create4(D, 'Le Bunker', 2, PARIS, 'closed');
  eq(out, { ok: false, reason: 'bad_recruitment_status' }, 'refus');
  eq(await crewCount(), before, 'aucune ligne crews écrite');
  const mem = await db.query(
    'select 1 from public.crew_members where user_id = $1 and left_at is null',
    [D],
  );
  eq(mem.rows.length, 0, 'aucune adhésion écrite');
});

await t('une valeur inconnue est refusée, jamais repliée en silence sur le défaut', async () => {
  const before = await crewCount();
  const out = await create4(D, 'Le Bunker', 2, PARIS, 'sur_invitation');
  eq(out, { ok: false, reason: 'bad_recruitment_status' }, 'refus');
  eq(await crewCount(), before, 'aucune ligne crews écrite');
});

await t('après un refus, le joueur peut créer normalement (rien n’a été verrouillé)', async () => {
  const out = await create4(D, 'Le Bunker', 2, PARIS, AT_CREATION[0]);
  eq(out.ok, true, 'création après refus');
  eq(out.crew.recruitment_status, AT_CREATION[0], 'statut écrit');
});

// ═══ 6. LES GARDES DE 0050 ONT SURVÉCU AU REMPLACEMENT DU CORPS ════════════
await t('signed_out : sans session, aucune création', async () => {
  const before = await crewCount();
  eq(await create4(null, 'Fantôme', 0, PARIS, 'open'), { ok: false, reason: 'signed_out' }, 'refus');
  eq(await crewCount(), before, 'aucune écriture');
});

await t('bad_name : nom vide et nom de 41 caractères', async () => {
  eq(await create4(E, '   ', 0, PARIS, 'open'), { ok: false, reason: 'bad_name' }, 'vide');
  eq(
    await create4(E, 'x'.repeat(41), 0, PARIS, 'open'),
    { ok: false, reason: 'bad_name' },
    '41 caractères',
  );
});

await t('name_unavailable : la modération de 0050 mord encore', async () => {
  const before = await crewCount();
  const banned = (
    await db.query('select term from public.blocked_name_terms limit 1')
  ).rows[0]?.term;
  ok(typeof banned === 'string' && banned.length > 0, 'aucun terme en base pour éprouver le filtre');
  const out = await create4(E, `Les ${banned} de Paris`, 0, PARIS, 'open');
  eq(out, { ok: false, reason: 'name_unavailable' }, 'refus modéré');
  eq(await crewCount(), before, 'aucune écriture');
});

await t('bad_color : hors 0..CREW_COLORS_COUNT-1', async () => {
  eq(await create4(E, 'Couleur', -1, PARIS, 'open'), { ok: false, reason: 'bad_color' }, '-1');
  eq(
    await create4(E, 'Couleur', COLORS_COUNT, PARIS, 'open'),
    { ok: false, reason: 'bad_color' },
    `${COLORS_COUNT}`,
  );
  eq(
    (await create4(E, 'Couleur limite', COLORS_COUNT - 1, PARIS, 'open')).ok,
    true,
    `${COLORS_COUNT - 1} doit passer`,
  );
});

await t('bad_city : une ville sans city_zones n’ouvre pas de crew', async () => {
  const before = await crewCount();
  eq(
    await create4(F, 'Les Nulle-Part', 0, 'atlantide', 'open'),
    { ok: false, reason: 'bad_city' },
    'refus',
  );
  eq(await crewCount(), before, 'aucune écriture');
});

await t('already_in_crew : on ne fonde pas un doublon', async () => {
  const before = await crewCount();
  eq(
    await create4(FOUNDER, 'Second Crew', 0, PARIS, 'open'),
    { ok: false, reason: 'already_in_crew' },
    'refus',
  );
  eq(await crewCount(), before, 'aucune écriture');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
  console.error(`${passed} ok, ${failures.length} ÉCHEC(S).`);
  for (const f of failures) console.error(`  - ${f.name}\n    ${f.err.stack ?? f.err.message}`);
  process.exit(1);
}
console.log(`${passed} vérifications passées.`);
process.exit(0);
