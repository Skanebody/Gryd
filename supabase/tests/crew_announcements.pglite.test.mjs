#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0096 (`crew_announcements`, E48).
 * UNE ANNONCE EST DU TEXTE ÉCRIT PAR UN HUMAIN ET LU PAR VINGT — ça se prouve.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0096 ne contient AUCUN TypeScript : une table, huit fonctions PL/pgSQL, des
 * grants. Aucun test Deno n'en touche une ligne. Sans lui, « le fil ne publie
 * jamais de position », « le corps est gardé contre l'adresse » et « seule la
 * direction épingle » seraient des phrases dans un commentaire — c'est-à-dire
 * une doc qui promet au-delà du code, la faute que la constitution nomme.
 *
 * SEPT fautes de cette migration ne se LISENT pas :
 *   · un `select payload` (ou un `payload->>'h3'` oublié) qui publierait la
 *     CELLULE EXACTE d'une capture — `ingest_run:1917` écrit `h3` dedans ;
 *   · un différé comparé dans le mauvais sens, et le fil dit où quelqu'un court
 *     EN CE MOMENT ;
 *   · un `date_trunc` retiré, et la minute exacte d'une course devient publique ;
 *   · un plafond compté sur TOUTES les lignes au lieu des vivantes : retirer une
 *     annonce ne libèrerait plus de place, et le crew resterait bloqué ;
 *   · un index d'idempotence sans `where removed_at is null` : republier après
 *     retrait deviendrait impossible pour toujours ;
 *   · une matrice de rôles recopiée de travers (un capitaine qui épingle) ;
 *   · un `revoke ... from anon` sans `public`, qui laisse le droit HÉRITÉ.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `crew_invite_tokens.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0096 s'applique sur un Postgres réel, telle quelle, PAR-DESSUS la lignée
 *     0002 → 0092 — pas sur une maquette de schéma.
 *  2. LA TABLE EST FERMÉE AUX CLIENTS : RLS activée, une seule policy (select,
 *     membres actifs, vivantes), zéro privilège d'écriture pour anon et
 *     authenticated, et les cinq fonctions de bornes fermées à tout le monde.
 *  3. AUCUNE DÉRIVE DE CONSTANTE : les cinq valeurs écrites dans le SQL sont
 *     comparées à `packages/shared/src/game-rules.ts`.
 *  4. LA GARDE DE VIE PRIVÉE DIT LA MÊME CHOSE QUE LE CLIENT :
 *     `ANNOUNCEMENT_PRIVACY_FIXTURES` est RELUE dans
 *     `apps/mobile/src/features/crew/crewActivity.ts` et passée dans
 *     `crew_announcement_refusal`. Même verdict, cas par cas.
 *  5. LA MATRICE DÉCIDE QUI ÉPINGLE : `CREW_PERMISSIONS.pinMessage` est RELUE
 *     dans game-rules — fondateur et co-capitaine publient ; capitaine, runner
 *     et rookie sont `forbidden` ; non-membre `no_crew` ; déconnecté
 *     `signed_out`.
 *  6. LES BORNES SONT REFUSÉES, PAS ROGNÉES (`bad_body`), espaces de bord
 *     compris.
 *  7. LA MODÉRATION EST APPLIQUÉE ET OPAQUE : un terme de `blocked_name_terms`
 *     rend `body_unavailable`, sans dire lequel.
 *  8. LE PLAFOND EST CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW, par CREW — et un
 *     RETRAIT libère une place.
 *  9. LA PUBLICATION EST IDEMPOTENTE : republier le même corps rend la ligne
 *     existante avec `duplicate: true`, sans créer de doublon.
 * 10. LE RETRAIT EXISTE (Apple 1.2), il est plus permissif que la publication
 *     (l'auteur RÉTROGRADÉ referme sa porte), il ne laisse pas un membre
 *     quelconque retirer le texte d'un autre, il rend `not_found` — jamais
 *     `forbidden` — sur l'annonce d'un AUTRE crew, et il est idempotent SANS
 *     déplacer `removed_at`.
 * 11. LE FIL NE FUIT RIEN : `h3` n'apparaît dans AUCUNE sortie, les `user_id`
 *     des contributeurs non plus, l'horodatage est tronqué à l'heure, et seuls
 *     les deux `event_type` RÉELLEMENT écrits par `ingest_run` sortent.
 * 12. LE FIL EST DIFFÉRÉ : un fait de moins de TERRITORY_PUBLISH_DELAY_MINUTES
 *     est ABSENT ; un fait plus vieux que CREW_ACTIVITY_WINDOW_DAYS aussi.
 * 13. ADDITIVITÉ : la lignée survit — `crew_outing_create` (0085) et
 *     `crew_ping_zone` (0051) fonctionnent toujours après 0096.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue et la
 *    PRÉSENCE de la policy, pas un refus vécu par un tiers
 *    (`npm run verify:rls`).
 *  · `auth.uid()` est un bouchon REDÉFINI pour incarner un acteur.
 *  · QUE L'ÉCRAN APPELLE CES FONCTIONS. Les décisions clientes sont pures et
 *    testées en Deno (`features/crew/crewActivity.test.ts`).
 *  · QUE LA MODÉRATION SUFFISE. Elle attrape un vocabulaire, pas une intention.
 *    C'est exactement pourquoi le retrait et le signalement existent.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   npm run test:sql          (ou, isolé :)
 *   node supabase/tests/crew_announcements.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const ROOT = join(HERE, '..', '..');
const GAME_RULES = join(ROOT, 'packages', 'shared', 'src', 'game-rules.ts');
const CREW_ACTIVITY_TS = join(
  ROOT, 'apps', 'mobile', 'src', 'features', 'crew', 'crewActivity.ts');

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

/**
 * ⚠️ LA LIGNÉE S'ARRÊTE À 0092, PAS À 0095, ET CE N'EST PAS UN RACCOURCI.
 *
 * Trois agents de la même vague ont écrit un `0093_*` en parallèle
 * (`audit-migrations.mjs` attrape la collision). Rejouer ici le travail
 * INACHEVÉ de deux autres chantiers rendrait le verdict de CE test dépendant
 * du leur : un rouge ne dirait plus si 0096 est fautive. 0096 ne dépend
 * d'AUCUNE des deux — elle ne touche que `crew_announcements` (neuve),
 * `crew_feed_events` (0011), `crew_members` (0002), `public_profiles` et deux
 * fonctions de 0084/0085. La lignée réelle en production les appliquera avant
 * elle, sans conséquence : toutes sont additives.
 */
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

// La migration SOUS TEST, appliquée par-dessus la lignée — telle quelle.
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0096_crew_announcements.sql'), 'utf8'));
} catch (err) {
  console.error(`\n0096 NE S’APPLIQUE PAS sur la lignée 0002→0092.\n  ${err.message}`);
  process.exit(1);
}

console.log('crew_announcements — migration 0096 (E48 · annonces + fil crew) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0092, puis 0096)\n`);

// ─── Acteurs ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const COCAP = '22222222-2222-2222-2222-222222222222';
const CAPTAIN = '33333333-3333-3333-3333-333333333333';
const ROOKIE = '44444444-4444-4444-4444-444444444444';
const OUTSIDER = '55555555-5555-5555-5555-555555555555';
const OTHER_FOUNDER = '66666666-6666-6666-6666-666666666666';
const ACTORS = [FOUNDER, COCAP, CAPTAIN, ROOKIE, OUTSIDER, OTHER_FOUNDER];

const as = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );
};

const rpc = async (sql, params = []) => {
  const res = await db.query(sql, params);
  return res.rows[0] ? Object.values(res.rows[0])[0] : null;
};

// ─── Socle de données ───────────────────────────────────────────────────────
const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_CREW = 'aaaaaaaa-0000-0000-0000-000000000002';

await db.exec(`
  insert into auth.users (id) values
    ${ACTORS.map((a) => `('${a}')`).join(',')};
  insert into public.users (id, pseudo) values
    ('${FOUNDER}', 'founder'), ('${COCAP}', 'cocap'), ('${CAPTAIN}', 'captain'),
    ('${ROOKIE}', 'rookie'), ('${OUTSIDER}', 'outsider'), ('${OTHER_FOUNDER}', 'otherf')
  on conflict (id) do update set pseudo = excluded.pseudo;
  -- 0066 pose un trigger qui dérive la bbox NOT NULL du geojson : un '{}'
  -- donnerait des NULL et un refus (patron crew_invite_tokens).
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, code, color, city_id, created_by) values
    ('${CREW}', 'Alpha', 'AAAAAA', 1, 'paris', '${FOUNDER}'),
    ('${OTHER_CREW}', 'Beta', 'BBBBBB', 2, 'paris', '${OTHER_FOUNDER}');
  insert into public.crew_members (crew_id, user_id, role) values
    ('${CREW}', '${FOUNDER}', 'founder'),
    ('${CREW}', '${COCAP}', 'co_captain'),
    ('${CREW}', '${CAPTAIN}', 'captain'),
    ('${CREW}', '${ROOKIE}', 'rookie'),
    ('${OTHER_CREW}', '${OTHER_FOUNDER}', 'founder');
`).catch((err) => {
  console.error(`SOCLE DE DONNÉES : ${err.message}`);
  process.exit(1);
});

// ═══ 1. Fermeture de la table ═══════════════════════════════════════════════

await t('la table existe, RLS activée, une SEULE policy (select)', async () => {
  const r = await db.query(`
    select c.relrowsecurity as rls,
           (select count(*) from pg_policy p where p.polrelid = c.oid) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'crew_announcements'`);
  eq(r.rows[0]?.rls, true, 'RLS');
  eq(Number(r.rows[0]?.policies), 1, 'nombre de policies');
  const p = await db.query(`
    select p.polname, p.polcmd from pg_policy p
    join pg_class c on c.oid = p.polrelid where c.relname = 'crew_announcements'`);
  eq(p.rows[0]?.polcmd, 'r', 'la policy est en LECTURE seule (r = select)');
});

await t('aucune écriture cliente : anon et authenticated n’ont que le select', async () => {
  const r = await db.query(`
    select grantee, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'crew_announcements'
      and grantee in ('anon', 'authenticated')
    order by grantee, privilege_type`);
  eq(
    r.rows.map((x) => `${x.grantee}:${x.privilege_type}`),
    ['authenticated:SELECT'],
    'privilèges de table',
  );
});

await t('les fonctions de bornes sont fermées à tout le monde', async () => {
  for (const fn of [
    'crew_announcement_max_active',
    'crew_announcement_body_max',
    'crew_activity_conquest_max',
    'crew_activity_window_days',
    'crew_activity_publish_delay_min',
  ]) {
    const r = await db.query(
      `select has_function_privilege('authenticated', p.oid, 'execute') as can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname = $1`,
      [fn],
    );
    eq(r.rows[0]?.can, false, `${fn} ne doit PAS être appelable par authenticated`);
  }
  // … et les trois RPC de l'écran le SONT.
  for (const fn of ['crew_activity_feed', 'crew_announcement_post', 'crew_announcement_remove']) {
    const r = await db.query(
      `select has_function_privilege('authenticated', p.oid, 'execute') as can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname = $1`,
      [fn],
    );
    eq(r.rows[0]?.can, true, `${fn} doit être appelable par authenticated`);
    const anonR = await db.query(
      `select has_function_privilege('anon', p.oid, 'execute') as can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname = $1`,
      [fn],
    );
    eq(anonR.rows[0]?.can, false, `${fn} ne doit PAS être appelable par anon`);
  }
});

// ═══ 2. Aucune dérive de constante ══════════════════════════════════════════

const rules = readFileSync(GAME_RULES, 'utf8');
const constOf = (name) => {
  const m = rules.match(new RegExp(`export const ${name}\\s*(?::[^=]+)?=\\s*(-?\\d+)`));
  if (!m) throw new Error(`game-rules.ts : ${name} introuvable`);
  return Number(m[1]);
};

await t('les cinq bornes SQL valent exactement celles de game-rules.ts', async () => {
  const pairs = [
    ['crew_announcement_max_active', 'CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW'],
    ['crew_announcement_body_max', 'CREW_ANNOUNCEMENT_BODY_MAX'],
    ['crew_activity_conquest_max', 'CREW_ACTIVITY_CONQUEST_MAX'],
    ['crew_activity_window_days', 'CREW_ACTIVITY_WINDOW_DAYS'],
    ['crew_activity_publish_delay_min', 'TERRITORY_PUBLISH_DELAY_MINUTES'],
  ];
  for (const [fn, konst] of pairs) {
    const v = await rpc(`select public.${fn}()`);
    eq(Number(v), constOf(konst), `${fn}() vs ${konst}`);
  }
});

// ═══ 3. La garde de vie privée dit la même chose que le client ══════════════

await t('ANNOUNCEMENT_PRIVACY_FIXTURES : le SQL rend le même verdict que le TS', async () => {
  const src = readFileSync(CREW_ACTIVITY_TS, 'utf8');
  const start = src.indexOf('ANNOUNCEMENT_PRIVACY_FIXTURES');
  ok(start !== -1, 'liste de cas introuvable dans crewActivity.ts');
  const open = src.indexOf('[', src.indexOf('=', start));
  const close = src.indexOf('\n];', open);
  const block = src.slice(open, close);
  const cases = [...block.matchAll(/\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*(null|'[a-z_]+')/g)].map(
    (m) => [m[2].replace(/\\'/g, "'"), m[3] === 'null' ? null : m[3].slice(1, -1)],
  );
  ok(cases.length >= 12, `attendu ≥12 cas partagés, trouvé ${cases.length}`);
  for (const [body, expected] of cases) {
    const v = await rpc('select public.crew_announcement_refusal($1)', [body]);
    eq(v, expected, `« ${body} »`);
  }
});

// ═══ 4. La matrice décide qui épingle ═══════════════════════════════════════

const post = async (uid, body) => {
  await as(uid);
  return rpc('select public.crew_announcement_post($1)', [body]);
};

await t('CREW_PERMISSIONS.pinMessage : fondateur et co-capitaine publient, les autres non', async () => {
  const m = rules.match(/pinMessage:\s*\[([^\]]+)\]/);
  ok(m, 'CREW_PERMISSIONS.pinMessage introuvable dans game-rules.ts');
  const allowed = m[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean).sort();
  eq(allowed, ['co_captain', 'founder'], 'matrice pinMessage relue de game-rules');

  eq((await post(FOUNDER, 'Objectif du week-end')).ok, true, 'fondateur');
  eq((await post(COCAP, 'Rendez-vous au parc')).ok, true, 'co-capitaine');
  eq((await post(CAPTAIN, 'Je veux epingler')).reason, 'forbidden', 'capitaine');
  eq((await post(ROOKIE, 'Moi aussi')).reason, 'forbidden', 'rookie');
  eq((await post(OUTSIDER, 'Coucou')).reason, 'no_crew', 'non-membre');

  await as(null);
  eq((await rpc('select public.crew_announcement_post($1)', ['x'])).reason, 'signed_out', 'déconnecté');
});

// ═══ 5. Bornes, vie privée, modération ══════════════════════════════════════

await t('les bornes sont REFUSÉES, pas rognées — espaces de bord compris', async () => {
  const max = constOf('CREW_ANNOUNCEMENT_BODY_MAX');
  eq((await post(FOUNDER, '')).reason, 'bad_body', 'vide');
  eq((await post(FOUNDER, '     ')).reason, 'bad_body', 'espaces seuls');
  eq((await post(FOUNDER, 'x'.repeat(max + 1))).reason, 'bad_body', 'trop long');
  // Le refus DIT la borne, pour que l'écran n'ait pas à la deviner.
  eq(Number((await post(FOUNDER, 'x'.repeat(max + 1))).max), max, 'la borne est rendue');
  // Exactement à la borne, entouré d'espaces : ACCEPTÉ (le CHECK porte sur btrim).
  const r = await post(FOUNDER, `  ${'y'.repeat(max)}  `);
  eq(r.ok, true, 'pile à la borne, espaces de bord détourés');
  await db.exec(`delete from public.crew_announcements where body = '${'y'.repeat(max)}'`);
});

await t('une position exacte est refusée AVEC son motif (le joueur doit pouvoir corriger)', async () => {
  const r = await post(FOUNDER, 'Depart 48.8566, 2.3522 dimanche');
  eq(r.reason, 'body_looks_like_place', 'motif');
  eq(r.kind, 'coordinates', 'sous-motif rendu à l’écran');
  const a = await post(FOUNDER, 'On part du 12 rue de la Paix');
  eq(a.kind, 'street_address', 'l’adresse est déléguée à 0085 et remonte');
});

await t('la modération est appliquée et OPAQUE (aucun terme n’est rendu)', async () => {
  // Le terme est LU de la table de 0050, jamais écrit ici : ce fichier n'a pas
  // à contenir d'insulte pour prouver que le filtre en attrape une.
  const term = await rpc(
    `select t.term from public.blocked_name_terms t where t.match_mode = 'squash' limit 1`);
  ok(typeof term === 'string' && term.length > 0, 'blocked_name_terms est vide — 0050 non appliquée ?');
  const r = await post(FOUNDER, `Bravo a tous les ${term}s du crew`);
  eq(r.reason, 'body_unavailable', 'motif opaque');
  eq(r.kind, undefined, 'aucun sous-motif : on ne donne pas le mode d’emploi');
});

// ═══ 6. Plafond, idempotence ════════════════════════════════════════════════

await t('le plafond est CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW, par CREW', async () => {
  await db.exec(`delete from public.crew_announcements`);
  const max = constOf('CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW');
  for (let i = 0; i < max; i += 1) {
    eq((await post(FOUNDER, `annonce numero ${i}`)).ok, true, `annonce ${i}`);
  }
  // Le plafond est par CREW : un AUTRE membre de la direction est bloqué aussi.
  const r = await post(COCAP, 'la mienne');
  eq(r.reason, 'too_many_active', 'plafond atteint');
  eq(Number(r.max), max, 'la borne est rendue');
});

await t('un RETRAIT libère une place (le plafond ne compte que les vivantes)', async () => {
  await as(FOUNDER);
  const id = (await db.query(
    `select id from public.crew_announcements where crew_id = $1 and removed_at is null limit 1`,
    [CREW])).rows[0].id;
  eq((await rpc('select public.crew_announcement_remove($1)', [id])).ok, true, 'retrait');
  eq((await post(COCAP, 'la mienne')).ok, true, 'une place s’est libérée');
});

await t('publier deux fois le même corps ne crée PAS de doublon', async () => {
  await db.exec(`delete from public.crew_announcements`);
  const a = await post(FOUNDER, 'Sortie longue dimanche');
  eq(a.ok, true, '1er envoi');
  eq(a.duplicate, false, 'le 1er n’est pas un doublon');
  // Casse et espaces de bord différents : c'est le MÊME corps normalisé.
  const b = await post(FOUNDER, '  SORTIE LONGUE DIMANCHE  ');
  eq(b.ok, true, 'rejeu');
  eq(b.duplicate, true, 'reconnu comme rejeu');
  eq(b.announcement.id, a.announcement.id, 'la ligne EXISTANTE est rendue');
  const n = await db.query(`select count(*)::int as n from public.crew_announcements`);
  eq(n.rows[0].n, 1, 'une seule ligne écrite');
});

await t('une annonce RETIRÉE peut être republiée (l’index d’unicité est partiel)', async () => {
  await as(FOUNDER);
  const id = (await db.query(`select id from public.crew_announcements limit 1`)).rows[0].id;
  await rpc('select public.crew_announcement_remove($1)', [id]);
  const again = await post(FOUNDER, 'Sortie longue dimanche');
  eq(again.ok, true, 'republication après retrait');
  eq(again.duplicate, false, 'nouvelle ligne, pas un rejeu');
});

// ═══ 7. Le retrait (Apple 1.2) ══════════════════════════════════════════════

await t('retirer est PLUS PERMISSIF que publier : l’auteur rétrogradé referme sa porte', async () => {
  await db.exec(`delete from public.crew_announcements`);
  const a = await post(COCAP, 'Message du co-capitaine');
  const id = a.announcement.id;
  // Rétrogradation : il ne peut plus PUBLIER…
  await db.exec(`update public.crew_members set role='runner' where user_id='${COCAP}'`);
  eq((await post(COCAP, 'une autre')).reason, 'forbidden', 'ne publie plus');
  // … mais il retire ce qu'il a écrit.
  await as(COCAP);
  eq((await rpc('select public.crew_announcement_remove($1)', [id])).ok, true, 'retire la sienne');
  await db.exec(`update public.crew_members set role='co_captain' where user_id='${COCAP}'`);
});

await t('un membre quelconque ne retire pas le texte d’un autre', async () => {
  await db.exec(`delete from public.crew_announcements`);
  const id = (await post(FOUNDER, 'Annonce du fondateur')).announcement.id;
  await as(ROOKIE);
  eq((await rpc('select public.crew_announcement_remove($1)', [id])).reason, 'forbidden', 'rookie');
  await as(COCAP);
  eq((await rpc('select public.crew_announcement_remove($1)', [id])).ok, true, 'la direction, oui');
});

await t('l’annonce d’un AUTRE crew rend not_found — jamais un oracle d’existence', async () => {
  await db.exec(`delete from public.crew_announcements`);
  const mine = (await post(FOUNDER, 'Chez nous')).announcement.id;
  await as(OTHER_FOUNDER);
  eq((await rpc('select public.crew_announcement_remove($1)', [mine])).reason, 'not_found', 'autre crew');
  // Un identifiant qui n'existe nulle part rend EXACTEMENT la même chose.
  eq(
    (await rpc('select public.crew_announcement_remove($1)', ['99999999-9999-9999-9999-999999999999']))
      .reason,
    'not_found',
    'identifiant inexistant',
  );
});

await t('le retrait est idempotent et ne DÉPLACE pas removed_at', async () => {
  await db.exec(`delete from public.crew_announcements`);
  const id = (await post(FOUNDER, 'A retirer')).announcement.id;
  await as(FOUNDER);
  const first = await rpc('select public.crew_announcement_remove($1)', [id]);
  eq(first.alreadyRemoved, false, '1er retrait');
  const at1 = (await db.query(`select removed_at from public.crew_announcements where id=$1`, [id]))
    .rows[0].removed_at;
  const second = await rpc('select public.crew_announcement_remove($1)', [id]);
  eq(second.ok, true, '2e retrait : succès');
  eq(second.alreadyRemoved, true, '… et il le dit');
  const at2 = (await db.query(`select removed_at from public.crew_announcements where id=$1`, [id]))
    .rows[0].removed_at;
  eq(String(at1), String(at2), 'la trace de modération n’a pas bougé');
});

// ═══ 8. Le fil : rien ne fuit, et rien n’est prématuré ══════════════════════

await t('le fil ne rend QUE les annonces vivantes, plus récentes d’abord', async () => {
  await db.exec(`delete from public.crew_announcements`);
  await post(FOUNDER, 'la premiere');
  await db.exec(`update public.crew_announcements set created_at = now() - interval '2 hours'`);
  const b = await post(FOUNDER, 'la seconde');
  const c = await post(FOUNDER, 'la retiree');
  await as(FOUNDER);
  await rpc('select public.crew_announcement_remove($1)', [c.announcement.id]);
  const feed = await rpc('select public.crew_activity_feed()');
  eq(feed.ok, true, 'lecture');
  eq(feed.role, 'founder', 'rôle');
  eq(feed.canPost, true, 'droit d’épingler tranché serveur');
  eq(feed.announcements.length, 2, 'la retirée est absente');
  eq(feed.announcements[0].id, b.announcement.id, 'la plus récente en tête');
  eq(Number(feed.maxAnnouncements), constOf('CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW'), 'plafond rendu');
  eq(Number(feed.bodyMax), constOf('CREW_ANNOUNCEMENT_BODY_MAX'), 'borne de corps rendue');
});

await t('un membre SANS le droit d’épingler lit le fil, mais canPost est faux', async () => {
  await as(ROOKIE);
  const feed = await rpc('select public.crew_activity_feed()');
  eq(feed.ok, true, 'il lit');
  eq(feed.canPost, false, 'il ne peut pas épingler');
  await as(OUTSIDER);
  eq((await rpc('select public.crew_activity_feed()')).reason, 'no_crew', 'non-membre');
  await as(null);
  eq((await rpc('select public.crew_activity_feed()')).reason, 'signed_out', 'déconnecté');
});

await t('LE FIL NE PUBLIE JAMAIS h3, ni les user_id des contributeurs', async () => {
  await db.exec(`
    insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at) values
      ('${CREW}', '${FOUNDER}', 'contested',
       '{"h3": 613196570331971583, "status": "stats_only", "body": "Hex conteste"}'::jsonb,
       now() - interval '3 hours'),
      ('${CREW}', '${FOUNDER}', 'boundary_completed',
       '{"name": "Republique", "contributions": [{"user": "${FOUNDER}", "share": 1}], "crewPoints": 12}'::jsonb,
       now() - interval '4 hours');`);
  await as(FOUNDER);
  const feed = await rpc('select public.crew_activity_feed()');
  // On inspecte les FAITS et eux seuls. `authorId` sort légitimement sur une
  // ANNONCE (l'écran en a besoin pour « est-ce la mienne ? » et pour masquer un
  // auteur bloqué) : mélanger les deux rendrait l'assertion fausse pour une
  // bonne raison, donc inutile.
  const raw = JSON.stringify(feed.conquests);
  ok(!raw.includes('613196570331971583'), 'h3 NE DOIT PAS apparaître dans la sortie');
  ok(!raw.includes('"h3"'), 'la clé h3 non plus');
  ok(!raw.includes('contributions'), 'les contributions (user_id) non plus');
  ok(!raw.includes('crewPoints'), 'aucun champ de payload hors liste blanche');
  ok(!raw.includes(FOUNDER), 'aucun user_id d’acteur dans une ligne de fait');
  ok(!raw.includes('Hex conteste'), 'payload.body (phrase FR composée serveur) reste au serveur');
  eq(feed.conquests.length, 2, 'les deux faits sortent');
  const byKind = Object.fromEntries(feed.conquests.map((c) => [c.kind, c]));
  eq(byKind.boundary_completed.name, 'Republique', 'le nom de la frontière, lui, est réel');
  eq(byKind.contested.name, null, '« contesté » n’a pas de nom, et on n’en invente pas');
  // Le PSEUDO sort (public_profiles), l'IDENTIFIANT non : c'est exactement la
  // frontière — on nomme qui a agi, on ne donne pas de clé de recoupement.
  eq(byKind.contested.actorPseudo, 'founder', 'le pseudo de l’acteur, lui, est rendu');
});

await t('l’horodatage d’un fait est TRONQUÉ à l’heure (PUBLIC_TIMESTAMP_TRUNC)', async () => {
  await as(FOUNDER);
  const feed = await rpc('select public.crew_activity_feed()');
  for (const c of feed.conquests) {
    const d = new Date(c.createdAt);
    eq([d.getUTCMinutes(), d.getUTCSeconds()], [0, 0], `minute/seconde de ${c.id}`);
  }
  // … alors que l'annonce, elle, garde sa précision : elle ne mesure aucune course.
  ok(feed.announcements.length > 0, 'au moins une annonce pour comparer');
});

await t('LE FIL EST DIFFÉRÉ : un fait trop frais est ABSENT', async () => {
  await db.exec(`delete from public.crew_feed_events`);
  await db.exec(`
    insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at) values
      ('${CREW}', '${FOUNDER}', 'boundary_completed', '{"name": "Trop frais"}'::jsonb,
       now() - interval '10 minutes');`);
  await as(FOUNDER);
  eq((await rpc('select public.crew_activity_feed()')).conquests.length, 0,
     'sous le différé : rien (sinon le fil dirait où quelqu’un court MAINTENANT)');
  // Passé le différé, il apparaît.
  await db.exec(`update public.crew_feed_events set created_at = now() - interval '2 hours'`);
  eq((await rpc('select public.crew_activity_feed()')).conquests.length, 1, 'après le différé');
});

await t('la fenêtre CREW_ACTIVITY_WINDOW_DAYS écarte l’historique ancien', async () => {
  const days = constOf('CREW_ACTIVITY_WINDOW_DAYS');
  await db.exec(
    `update public.crew_feed_events set created_at = now() - interval '${days + 1} days'`);
  await as(FOUNDER);
  eq((await rpc('select public.crew_activity_feed()')).conquests.length, 0, 'hors fenêtre');
});

await t('seuls les deux event_type RÉELLEMENT écrits par ingest_run sortent', async () => {
  await db.exec(`delete from public.crew_feed_events`);
  await db.exec(`
    insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at)
    select '${CREW}', '${FOUNDER}', k, '{}'::jsonb, now() - interval '3 hours'
    from unnest(array['capture','defense','badge','rank_up','chest','group_run','join',
                      'offensive','contested','boundary_completed']) as k;`);
  await as(FOUNDER);
  const kinds = (await rpc('select public.crew_activity_feed()')).conquests
    .map((c) => c.kind).sort();
  eq(kinds, ['boundary_completed', 'contested'],
     'les huit types que RIEN n’écrit ne produisent pas de ligne muette');
});

await t('le plafond de lecture des faits est CREW_ACTIVITY_CONQUEST_MAX', async () => {
  await db.exec(`delete from public.crew_feed_events`);
  const max = constOf('CREW_ACTIVITY_CONQUEST_MAX');
  await db.exec(`
    insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at)
    select '${CREW}', '${FOUNDER}', 'boundary_completed',
           jsonb_build_object('name', 'B' || i), now() - interval '3 hours' - (i || ' minutes')::interval
    from generate_series(1, ${max + 5}) as i;`);
  await as(FOUNDER);
  eq((await rpc('select public.crew_activity_feed()')).conquests.length, max, 'plafond appliqué');
});

await t('un fait d’un AUTRE crew n’entre jamais dans mon fil', async () => {
  await db.exec(`delete from public.crew_feed_events`);
  await db.exec(`
    insert into public.crew_feed_events (crew_id, actor_id, event_type, payload, created_at) values
      ('${OTHER_CREW}', '${OTHER_FOUNDER}', 'boundary_completed', '{"name":"Ailleurs"}'::jsonb,
       now() - interval '3 hours');`);
  await as(FOUNDER);
  eq((await rpc('select public.crew_activity_feed()')).conquests.length, 0, 'cloisonnement par crew');
});

// ═══ 9. Additivité ══════════════════════════════════════════════════════════

await t('la lignée survit : 0085 et 0051 fonctionnent toujours après 0096', async () => {
  await as(FOUNDER);
  const outing = await rpc(
    `select public.crew_outing_create($1, $2, $3, $4, $5)`,
    ['Sortie test', new Date(Date.now() + 86_400_000).toISOString(), 'run', 'conquete',
     'Place de la Republique'],
  );
  eq(outing.ok, true, 'crew_outing_create (0085)');
  const ctx = await rpc('select public.crew_outing_context()');
  eq(ctx.ok, true, 'crew_outing_context (0085)');
  eq(ctx.upcoming.length, 1, 'la sortie est lisible');
  const pings = await rpc('select public.crew_pings_feed($1)', [8]);
  ok(pings !== null, 'crew_pings_feed (0051) répond toujours');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} échec(s) sur ${passed + failures.length}.`);
  process.exit(1);
}
console.log(`${passed} tests OK.`);
