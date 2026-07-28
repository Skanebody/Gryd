#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0099
 * (`crew_activity_feed_no_rival_actor`).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * `ingest_run` insère le fait 'contested' DANS LES DEUX FLUX — celui du crew
 * attaquant ET celui du crew victime — avec, dans les deux cas, l'id de
 * L'ATTAQUANT (supabase/functions/ingest_run/index.ts:1915-1918). Le `select` de
 * `crew_activity_feed` (0096:381) joignait `public_profiles` sur `actor_id` sans
 * regarder de quel crew venait cette personne : le fil du crew VICTIME nommait
 * donc un joueur du crew RIVAL, avec l'heure (tronquée) de sa sortie.
 *
 * C'est une divulgation croisée que le dépôt refuse partout ailleurs sur les
 * surfaces inter-joueurs (0087:85, 0089). L'en-tête de 0096 affirmait par-dessus
 * que la ligne 'contested' était neutre — « rien dedans ne dit de quel côté on
 * est » : vrai du `payload`, faux du `select`, qui y ajoutait un NOM.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. LA FUITE EXISTAIT. Avant d'appliquer 0099, avec 0096 seule, il LIT le fil
 *     de la victime et constate qu'il rend le pseudo du rival. Sans cette
 *     étape, rien ne distinguerait 0099 d'un no-op.
 *  1. 0099 s'applique par-dessus 0096 sur un Postgres réel.
 *  2. APRÈS : le fil de la VICTIME rend le fait 'contested' — il ne le supprime
 *     pas — avec `actorPseudo = null`. Le fait reste, la personne disparaît.
 *  3. Le fil de L'ATTAQUANT garde son propre coéquipier nommé : la garde ne
 *     rend pas le fil anonyme, elle le rend interne au crew.
 *  4. 'boundary_completed' garde son auteur, et son `name` réel.
 *  5. UN EX-MEMBRE reste nommé pour son ancien crew : masquer l'auteur d'une
 *     boucle qu'ils ont fermée ensemble réécrirait leur propre histoire.
 *  6. Les gardes de 0096 survivent à la réécriture : différé de publication,
 *     troncature horaire, fenêtre, et `payload` jamais rendu en bloc (ni `h3`,
 *     ni les `contributions`).
 *  7. PRIVILÈGES : `anon` n'exécute pas la RPC, `authenticated` si.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EFFET RÉEL DE LA RLS (PGlite tourne en SUPERUTILISATEUR).
 *  · QUE `ingest_run` CESSE D'ÉCRIRE l'id de l'attaquant dans le flux de la
 *    victime. Il continue : la ligne reste en base, et seule la LECTURE est
 *    gardée. La correction côté écriture est inscrite en suspens dans 0099.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   npm run test:sql            (ou, isolément :)
 *   node supabase/tests/crew_activity_feed_actor_privacy.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
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
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 92)
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
await db.exec(readFileSync(join(MIGRATIONS, '0096_crew_announcements.sql'), 'utf8'));

console.log('crew_activity_feed — vie privée de l’acteur (migration 0099) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0092, puis 0096)\n`);

// ─── Acteurs : deux crews, un attaquant, une victime, un partant ────────────
const ATTACKER = '11111111-1111-1111-1111-111111111111';
const VICTIM_LEAD = '22222222-2222-2222-2222-222222222222';
const EX_MEMBER = '33333333-3333-3333-3333-333333333333';
const ACTORS = [ATTACKER, VICTIM_LEAD, EX_MEMBER];

const RIVALS = 'aaaaaaaa-0000-0000-0000-000000000001'; // crew de l'attaquant
const VICTIMS = 'aaaaaaaa-0000-0000-0000-000000000002'; // crew attaqué

await db.exec(`
  insert into auth.users (id) values ${ACTORS.map((a) => `('${a}')`).join(',')};
  insert into public.users (id, pseudo) values
    ('${ATTACKER}','KORO'), ('${VICTIM_LEAD}','MAYA'), ('${EX_MEMBER}','NILS')
  on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by) values
    ('${RIVALS}','Rivaux',3,'paris','RIV001','${ATTACKER}'),
    ('${VICTIMS}','Attaqués',5,'paris','VIC001','${VICTIM_LEAD}');
  insert into public.crew_members (crew_id, user_id, role) values
    ('${RIVALS}','${ATTACKER}','founder'),
    ('${VICTIMS}','${VICTIM_LEAD}','founder');
  -- NILS a fermé une boucle avec les Attaqués, puis il est parti.
  insert into public.crew_members (crew_id, user_id, role, joined_at, left_at) values
    ('${VICTIMS}','${EX_MEMBER}','runner', now() - interval '30 days', now() - interval '2 days');

  -- LE FAIT LITIGIEUX, écrit exactement comme ingest_run:1915-1918 l'écrit :
  -- DEUX lignes, MÊME payload, MÊME actor_id (l'attaquant).
  insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at) values
    ('${RIVALS}',  '${ATTACKER}', 'contested',
     '{"h3":"871fb4662ffffff","status":"contested","body":"Hex contesté"}'::jsonb,
     now() - interval '3 hours'),
    ('${VICTIMS}', '${ATTACKER}', 'contested',
     '{"h3":"871fb4662ffffff","status":"contested","body":"Hex contesté"}'::jsonb,
     now() - interval '3 hours');

  -- Une boucle fermée par l'EX-membre, dans le crew qu'il a quitté depuis.
  insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at) values
    ('${VICTIMS}', '${EX_MEMBER}', 'boundary_completed',
     '{"name":"Boucle du Canal","contributions":[{"user":"${EX_MEMBER}","share":100}],"crewPoints":40}'::jsonb,
     now() - interval '5 hours');

  -- Un fait ENCORE SOUS EMBARGO (moins de 60 min) : il ne doit jamais sortir.
  insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at) values
    ('${VICTIMS}', '${VICTIM_LEAD}', 'boundary_completed',
     '{"name":"Trop frais"}'::jsonb, now() - interval '5 minutes');
`);

const as = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );
};
const feed = async (uid) => {
  await as(uid);
  const res = await db.query('select public.crew_activity_feed() as r');
  return res.rows[0].r;
};
/** Le fait 'contested' tel que le fil de `uid` le rend, ou null. */
const contestedOf = async (uid) => {
  const f = await feed(uid);
  return (f.conquests ?? []).find((c) => c.kind === 'contested') ?? null;
};

// ═══ 0. LA FUITE, CONSTATÉE AVANT LE CORRECTIF ══════════════════════════════
await t('AVANT 0099 : le fil de la VICTIME nommait le joueur du crew RIVAL', async () => {
  const c = await contestedOf(VICTIM_LEAD);
  ok(c !== null, 'le fait contesté est bien rendu à la victime');
  eq(c.actorPseudo, 'KORO', 'c’est le pseudo de l’attaquant, dans le fil de l’attaqué');
});

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(
    readFileSync(join(MIGRATIONS, '0099_crew_activity_feed_no_rival_actor.sql'), 'utf8'),
  );
} catch (err) {
  migrationError = err;
}
await t('la migration 0099 s’applique par-dessus 0096, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ═══ 2. LE FAIT RESTE, LA PERSONNE DISPARAÎT ════════════════════════════════
await t('APRÈS : la victime voit toujours le fait, mais sans le nom du rival', async () => {
  const c = await contestedOf(VICTIM_LEAD);
  ok(c !== null, 'le fait n’est PAS supprimé — un fil amputé mentirait par omission');
  eq(c.kind, 'contested', 'le type est intact');
  eq(c.actorPseudo, null, 'aucun nom d’un autre crew');
  eq(c.name, null, '`name` reste null pour ce type (liste blanche 0096)');
});

await t('l’attaquant, lui, voit son propre coéquipier nommé', async () => {
  const c = await contestedOf(ATTACKER);
  ok(c !== null, 'le même fait est dans son fil');
  eq(c.actorPseudo, 'KORO', 'la garde rend le fil INTERNE au crew, pas anonyme');
});

// ═══ 3. CE QUI DOIT RESTER NOMMÉ LE RESTE ═══════════════════════════════════
await t('une boucle fermée par un EX-membre reste attribuée à son auteur', async () => {
  const f = await feed(VICTIM_LEAD);
  const b = f.conquests.find((c) => c.kind === 'boundary_completed');
  ok(b !== undefined, 'la boucle est dans le fil');
  eq(b.actorPseudo, 'NILS', 'il a couru AVEC eux : masquer son nom réécrirait leur histoire');
  eq(b.name, 'Boucle du Canal', 'le nom RÉEL de la frontière, jamais un repli');
});

// ═══ 4. LES GARDES DE 0096 SURVIVENT À LA RÉÉCRITURE ═══════════════════════
await t('le différé de publication tient toujours (rien de frais ne sort)', async () => {
  const f = await feed(VICTIM_LEAD);
  ok(
    !f.conquests.some((c) => c.name === 'Trop frais'),
    'un fait de moins de 60 min dirait où quelqu’un court EN CE MOMENT',
  );
});

await t('l’horodatage reste tronqué à l’heure (§12.1)', async () => {
  const f = await feed(VICTIM_LEAD);
  for (const c of f.conquests) {
    ok(
      /T\d{2}:00:00/.test(String(c.createdAt)),
      `minute exacte exposée : ${c.createdAt}`,
    );
  }
});

await t('le payload n’est JAMAIS rendu en bloc : ni h3, ni contributions', async () => {
  const f = await feed(VICTIM_LEAD);
  const raw = JSON.stringify(f.conquests);
  ok(!raw.includes('871fb4662ffffff'), 'une position h3 a fuité');
  ok(!raw.includes('contributions'), 'les contributeurs ont fuité');
  ok(!raw.includes('crewPoints'), 'un champ hors liste blanche a fuité');
  for (const c of f.conquests) {
    eq(
      Object.keys(c).sort(),
      ['actorPseudo', 'createdAt', 'id', 'kind', 'name'],
      'la forme rendue est EXACTEMENT la liste blanche',
    );
  }
});

await t('sans session, la RPC refuse ; sans crew, elle le dit', async () => {
  eq(await feed(null), { ok: false, reason: 'signed_out' }, 'pas connecté');
  await db.exec(`insert into auth.users (id) values ('44444444-4444-4444-4444-444444444444');
    insert into public.users (id, pseudo) values ('44444444-4444-4444-4444-444444444444','SOLO')
    on conflict (id) do nothing;`);
  eq(
    await feed('44444444-4444-4444-4444-444444444444'),
    { ok: false, reason: 'no_crew' },
    'connecté mais sans crew — une RÉPONSE, pas une panne',
  );
});

// ═══ 5. PRIVILÈGES ═════════════════════════════════════════════════════════
await t('anon n’exécute pas crew_activity_feed, authenticated si', async () => {
  const can = async (role) => {
    const r = await db.query(
      `select has_function_privilege($1, 'public.crew_activity_feed()', 'execute') as c`,
      [role],
    );
    return r.rows[0].c;
  };
  eq(await can('anon'), false, 'anon');
  eq(await can('authenticated'), true, 'authenticated');
});

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} échec(s) sur ${passed + failures.length} :`);
  for (const f of failures) console.error(`  · ${f.name}\n    ${f.err.message}`);
  process.exit(1);
}
console.log(`${passed} assertions vertes — le fil d’un crew ne nomme que les gens de ce crew.`);
