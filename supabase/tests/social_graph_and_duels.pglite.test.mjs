#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0088 (`social_graph_and_duels`).
 * E57 (suivis et amis) + E58 (défi).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0088 ne contient AUCUN TypeScript : deux tables, treize fonctions PL/pgSQL,
 * des index partiels et des grants. Aucun test Deno n'en touche une ligne. Sans
 * ce fichier, « un lien social se demande, il ne se prend pas » et « un défi se
 * refuse sans friction » resteraient des phrases dans un commentaire.
 *
 * Et ce sont précisément les fautes SILENCIEUSES qui coûtent cher ici :
 *   · un cooldown qui porte sur le SENS (A→B) au lieu de la PAIRE — il suffirait
 *     de se faire refuser puis de re-défier « dans l'autre sens » ;
 *   · un cooldown contournable en laissant POURRIR un défi au lieu d'attendre
 *     une réponse ;
 *   · un défi ouvert à un INCONNU parce qu'on a oublié d'exiger la réciprocité
 *     du suivi ;
 *   · une liste qui fuit — les suivis d'un TIERS, un ami d'ami, un handle
 *     énuméré ;
 *   · un `follow_user` qui distingue « handle inconnu » de « profil privé », ce
 *     qui transforme le refus en oracle d'existence.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `crew_outing_create.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0088 s'applique sur un Postgres réel, PAR-DESSUS la lignée 0002 → 0087.
 *  2. ANTI-PAY-TO-WIN PAR ABSENCE DE COLONNE : `duels` n'a aucun champ de mise,
 *     d'enjeu, de récompense ni de coût, et aucune fonction ne touche
 *     `hex_claims`, `territories` ni `users.foulees`.
 *  3. IL N'Y A PAS D'ANNUAIRE : `social_resolve_handle` est FERMÉE aux rôles
 *     clients, `social_graph` ne rend que MES arêtes, et jamais un ami d'ami.
 *  4. Le suivi est asymétrique, idempotent, révocable, et PLAFONNÉ par jour ;
 *     re-suivre quelqu'un ne consomme pas de quota.
 *  5. Un profil `private` est INJOIGNABLE, et son refus est indistinguable de
 *     celui d'un handle inconnu.
 *  6. L'amitié se DEMANDE : croisement = acceptation, refus = cooldown réel,
 *     plafond de demandes en attente, et seul le DESTINATAIRE répond.
 *  7. LE DÉFI EXIGE UN LIEN : ni ami ni suivi réciproque → `no_relation`.
 *  8. LE REFUS EST UN TAP : `duel_respond(false)` réussit sans motif, et
 *     verrouille la relance pendant DUEL_RETRY_COOLDOWN_HOURS — dans les DEUX
 *     sens, et même si le défi a simplement EXPIRÉ.
 *  9. Un seul défi ouvert par paire, quel que soit le sens ; plafond de défis
 *     émis ; expiration appliquée à la lecture ET au moment de répondre.
 * 10. LES CONSTANTES NE DÉRIVENT PAS : chaque nombre du SQL est comparé à
 *     `packages/shared/src/game-rules.ts`, relu dans le fichier source.
 * 11. `duel_inbox` ne rend AUCUN score et le DIT (`scoringExists: false`), et
 *     `social_graph` dit `suggestionsSource: 'none'` au lieu d'un tableau vide.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue (grants et
 *    revokes), pas un refus vécu par un tiers.
 *  · `auth.uid()` est un bouchon REDÉFINI pour incarner un acteur. Ce n'est pas
 *    une session Supabase, c'est une simulation fidèle de son effet.
 *  · QUE LES ÉCRANS APPELLENT CES FONCTIONS (côté client, c'est `socialData.ts`
 *    et ses modules purs qui sont testés en Deno).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/social_graph_and_duels.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const MIGRATIONS = join(HERE, '..', 'migrations');
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
const num = (name) => {
  const m = rules.match(new RegExp(`export const ${name} = (\\d+)`));
  if (!m) throw new Error(`constante ${name} introuvable dans game-rules.ts`);
  return Number(m[1]);
};
const FOLLOW_MAX_PER_DAY = num('SOCIAL_FOLLOW_MAX_PER_DAY');
const FRIEND_MAX_PENDING = num('SOCIAL_FRIEND_REQUESTS_MAX_PENDING');
const FRIEND_COOLDOWN_DAYS = num('SOCIAL_FRIEND_REQUEST_COOLDOWN_DAYS');
const LIST_LIMIT = num('SOCIAL_LIST_ROWS_LIMIT');
const DUEL_EXPIRY_H = num('DUEL_EXPIRY_HOURS');
const DUEL_MAX_PENDING = num('DUEL_MAX_PENDING_SENT');
const DUEL_COOLDOWN_H = num('DUEL_RETRY_COOLDOWN_HOURS');
const PERIOD_MIN = num('DUEL_PERIOD_DAYS_MIN');
const PERIOD_MAX = num('DUEL_PERIOD_DAYS_MAX');

/** Les quatre formats de défi, LUS dans game-rules (jamais recopiés ici). */
const KINDS = (() => {
  const m = rules.match(/export const DUEL_KINDS = \[([^\]]+)\]/);
  if (!m) throw new Error('DUEL_KINDS introuvable dans game-rules.ts');
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/'/g, ''))
    .filter(Boolean)
    .sort();
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
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 87)
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

console.log('social_graph_and_duels — migration 0088 (E57 + E58) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0087)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0088_social_graph_and_duels.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}
await t('la migration 0088 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const ANA = '11111111-1111-1111-1111-111111111111';
const BEN = '22222222-2222-2222-2222-222222222222';
const CLO = '33333333-3333-3333-3333-333333333333';
const DAN = '44444444-4444-4444-4444-444444444444'; // profil PRIVÉ
const EVE = '55555555-5555-5555-5555-555555555555'; // inconnue d'Ana
const FLO = '66666666-6666-6666-6666-666666666666'; // sans user_profiles du tout
const PARIS = 'paris';

const PROFILES = [
  [ANA, 'ana', 'public'],
  [BEN, 'ben', 'public'],
  [CLO, 'clo', 'crew'],
  [DAN, 'dan', 'private'],
  [EVE, 'eve', 'public'],
];
/**
 * ⚠ 0028 provisionne `public.users` PAR TRIGGER sur `auth.users` : insérer dans
 * `public.users` après coup viole la PK. On UPSERT donc, ce qui est aussi ce que
 * fait la vraie chaîne d'inscription.
 */
const makeUser = async (id, pseudo) => {
  await db.query('insert into auth.users (id) values ($1) on conflict do nothing', [id]);
  await db.query(
    `insert into public.users (id, pseudo, city_id, foulees) values ($1, $2, $3, 1000)
     on conflict (id) do update set pseudo = excluded.pseudo, city_id = excluded.city_id`,
    [id, pseudo, PARIS],
  );
};
for (const id of [ANA, BEN, CLO, DAN, EVE, FLO]) await makeUser(id, id.slice(0, 4));
for (const [id, handle, vis] of PROFILES) {
  await db.query(
    `insert into public.user_profiles (user_id, handle, display_name, profile_visibility)
     values ($1, $2, $3, $4)`,
    [id, handle, handle.toUpperCase(), vis],
  );
}

const be = (uid) =>
  db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );
const call = async (sql, params = []) => (await db.query(`select ${sql} as r`, params)).rows[0].r;

const follow = (h) => call('public.follow_user($1)', [h]);
const unfollow = (h) => call('public.unfollow_user($1)', [h]);
const graph = () => call('public.social_graph()');
const friendReq = (h) => call('public.friend_request($1)', [h]);
const friendResp = (id, a) => call('public.friend_respond($1, $2)', [id, a]);
const inbox = () => call('public.duel_inbox()');
const duel = (h, kind, days, activity = 'run', target = null, zone = null) =>
  call('public.duel_create($1, $2, $3, $4, $5, $6)', [h, kind, days, activity, target, zone]);
const duelResp = (id, a) => call('public.duel_respond($1, $2)', [id, a]);
const duelCancel = (id) => call('public.duel_cancel($1)', [id]);

// ═══ 2. ANTI-PAY-TO-WIN : L'ABSENCE DE COLONNE ══════════════════════════════
await t('duels n’a AUCUNE colonne de mise / enjeu / récompense / coût', async () => {
  const { rows } = await db.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'duels'`,
  );
  const cols = rows.map((r) => r.column_name).sort();
  // ⚠ Les motifs sont ancrés sur des MOTS : sans `\b`, « xp » attrape
  // « e-xp-ires_at » et le test échoue sur une colonne parfaitement innocente.
  const forbidden = cols.filter((c) =>
    /\b(stake|wager|bet|reward|prize|price|cost|foulees|coin|gem|xp|point|points|premium)\b/i.test(c),
  );
  eq(forbidden, [], 'colonnes interdites dans duels');
  eq(
    cols,
    [
      'activity', 'challenger_id', 'created_at', 'expires_at', 'id', 'kind',
      'opponent_id', 'period_days', 'responded_at', 'status', 'target_value', 'zone_label',
    ],
    'colonnes de duels',
  );
});

await t('aucune fonction de 0088 ne touche hex_claims / territories / foulees', async () => {
  const { rows } = await db.query(
    `select p.proname, pg_get_functiondef(p.oid) as src
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('follow_user','unfollow_user','friend_request','friend_respond',
                         'duel_create','duel_respond','duel_cancel','duel_inbox','social_graph')`,
  );
  eq(rows.length, 9, 'les 9 RPC existent');
  for (const r of rows) {
    ok(!/hex_claims|territories|foulees|sector_/i.test(r.src), `${r.proname} touche le territoire`);
  }
});

// ═══ 3. PAS D'ANNUAIRE : PRIVILÈGES ═════════════════════════════════════════
await t('social_resolve_handle / social_pair_state / social_person sont FERMÉES aux clients', async () => {
  for (const fn of ['social_resolve_handle', 'social_pair_state', 'social_person']) {
    const { rows } = await db.query(
      `select has_function_privilege('authenticated', p.oid, 'execute') as can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = $1`,
      [fn],
    );
    ok(rows.length > 0, `${fn} existe`);
    eq(rows[0].can, false, `${fn} exécutable par authenticated`);
  }
});

await t('les 9 RPC sont exécutables par authenticated et JAMAIS par anon', async () => {
  const names = [
    'social_graph', 'follow_user', 'unfollow_user', 'friend_request', 'friend_respond',
    'duel_create', 'duel_respond', 'duel_cancel', 'duel_inbox',
  ];
  for (const fn of names) {
    const { rows } = await db.query(
      `select has_function_privilege('authenticated', p.oid, 'execute') as auth_can,
              has_function_privilege('anon', p.oid, 'execute') as anon_can
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = $1`,
      [fn],
    );
    eq(rows[0].auth_can, true, `${fn} : authenticated`);
    eq(rows[0].anon_can, false, `${fn} : anon NE DOIT PAS`);
  }
});

await t('follows et duels : RLS activée, écriture client révoquée', async () => {
  const { rows } = await db.query(
    `select relname, relrowsecurity from pg_class
     where relname in ('follows','duels') and relnamespace = 'public'::regnamespace`,
  );
  eq(rows.length, 2, 'les deux tables existent');
  for (const r of rows) eq(r.relrowsecurity, true, `${r.relname} : RLS`);
  for (const table of ['follows', 'duels', 'friendships']) {
    for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
      for (const role of ['anon', 'authenticated']) {
        const { rows: p } = await db.query(
          `select has_table_privilege($1, $2, $3) as can`,
          [role, `public.${table}`, priv],
        );
        eq(p[0].can, false, `${role} peut ${priv} sur ${table}`);
      }
    }
  }
});

// ═══ 4. LES CONSTANTES NE DÉRIVENT PAS ══════════════════════════════════════
await t('chaque nombre du SQL est celui de game-rules.ts', async () => {
  const pairs = [
    ['social_follow_max_per_day', FOLLOW_MAX_PER_DAY],
    ['social_friend_requests_max_pending', FRIEND_MAX_PENDING],
    ['social_friend_request_cooldown_days', FRIEND_COOLDOWN_DAYS],
    ['social_list_rows_limit', LIST_LIMIT],
    ['duel_expiry_hours', DUEL_EXPIRY_H],
    ['duel_max_pending_sent', DUEL_MAX_PENDING],
    ['duel_retry_cooldown_hours', DUEL_COOLDOWN_H],
  ];
  for (const [fn, expected] of pairs) {
    const v = await call(`public.${fn}()`);
    eq(Number(v), expected, `public.${fn}()`);
  }
});

await t('le CHECK de duels.kind est EXACTEMENT DUEL_KINDS, et period_days ses bornes', async () => {
  const { rows } = await db.query(
    `select conname, pg_get_constraintdef(oid) as def from pg_constraint
     where conrelid = 'public.duels'::regclass and contype = 'c'`,
  );
  // On cible le CHECK par son NOM (`duels_kind_check`) : un filtre par contenu
  // attrapait aussi `duels_zone_only_for_defense`, qui cite `kind` lui aussi.
  const kindDef = rows.find((r) => r.conname === 'duels_kind_check');
  ok(kindDef, `CHECK duels_kind_check introuvable parmi ${rows.map((r) => r.conname).join(', ')}`);
  const found = [...kindDef.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort();
  eq(found, KINDS, 'kinds du CHECK vs DUEL_KINDS');
  const periodDef = rows.find((r) => r.conname === 'duels_period_days_check');
  ok(periodDef, 'CHECK sur period_days introuvable');
  ok(
    periodDef.def.includes(String(PERIOD_MIN)) && periodDef.def.includes(String(PERIOD_MAX)),
    `bornes de period_days : ${periodDef.def} vs ${PERIOD_MIN}..${PERIOD_MAX}`,
  );
});

// ═══ 5. LE SUIVI ════════════════════════════════════════════════════════════
await t('pas connecté → signed_out partout, jamais un état vide qui ressemble à « rien »', async () => {
  await be(null);
  eq((await graph()).reason, 'signed_out', 'social_graph');
  eq((await inbox()).reason, 'signed_out', 'duel_inbox');
  eq((await follow('ben')).reason, 'signed_out', 'follow_user');
  eq((await duel('ben', 'distance', 7, 'run', 10)).reason, 'signed_out', 'duel_create');
});

await t('suivre : asymétrique, idempotent, et ne se suit pas soi-même', async () => {
  await be(ANA);
  const r = await follow('ben');
  eq([r.ok, r.already], [true, false], 'premier suivi');
  const again = await follow('BEN'); // casse différente : le handle est normalisé
  eq([again.ok, again.already], [true, true], 'suivre deux fois');
  eq((await follow('ana')).reason, 'self', 'se suivre soi-même');

  const g = await graph();
  eq(g.following.map((p) => p.handle), ['ben'], 'Ana suit Ben');
  eq(g.followers, [], 'Ana n’a aucun abonné (asymétrie)');
  await be(BEN);
  eq((await graph()).followers.map((p) => p.handle), ['ana'], 'Ben a Ana en abonnée');
  eq((await graph()).following, [], 'Ben ne suit personne');
});

await t('un profil PRIVÉ est injoignable, et son refus est indistinguable d’un inconnu', async () => {
  await be(ANA);
  eq((await follow('dan')).reason, 'not_found', 'profil privé');
  eq((await follow('personne_qui_nexiste_pas')).reason, 'not_found', 'handle inconnu');
  eq((await friendReq('dan')).reason, 'not_found', 'demande d’ami à un profil privé');
});

await t('se désabonner marche toujours, même si la personne est passée en privé', async () => {
  await be(ANA);
  await follow('eve');
  await db.query(`update public.user_profiles set profile_visibility = 'private' where handle = 'eve'`);
  const r = await unfollow('eve');
  eq([r.ok, r.already], [true, false], 'désabonnement d’un profil devenu privé');
  eq((await unfollow('eve')).already, true, 'désabonnement idempotent');
  await db.query(`update public.user_profiles set profile_visibility = 'public' where handle = 'eve'`);
});

await t('le plafond quotidien de suivis mord — et re-suivre ne consomme PAS de quota', async () => {
  // On fabrique FOLLOW_MAX_PER_DAY arêtes récentes pour Clo, puis on vérifie
  // qu'un suivi de plus est refusé, et qu'un re-suivi passe quand même.
  await db.query('delete from public.follows where follower_id = $1', [CLO]);
  for (let i = 0; i < FOLLOW_MAX_PER_DAY; i += 1) {
    const id = `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`;
    await makeUser(id, `p${i}`);
    await db.query('insert into public.follows (follower_id, followee_id) values ($1, $2)', [CLO, id]);
  }
  await be(CLO);
  const r = await follow('ben');
  eq(r.reason, 'rate_limited', 'plafond quotidien');
  eq(Number(r.maxPerDay), FOLLOW_MAX_PER_DAY, 'plafond rendu au client');

  // Re-suivre quelqu'un qu'on suit déjà : autorisé malgré le plafond.
  const someone = (await db.query(
    'select followee_id from public.follows where follower_id = $1 limit 1', [CLO],
  )).rows[0].followee_id;
  await db.query(
    `insert into public.user_profiles (user_id, handle) values ($1, 'deja_suivi')
     on conflict (user_id) do nothing`, [someone],
  );
  eq((await follow('deja_suivi')).already, true, 're-suivre malgré le plafond');

  await db.query('delete from public.follows where follower_id = $1', [CLO]);
});

// ═══ 6. L'AMITIÉ SE DEMANDE ═════════════════════════════════════════════════
await t('demander en ami : pending, puis SEUL le destinataire répond', async () => {
  await be(ANA);
  const r = await friendReq('clo');
  eq([r.ok, r.status], [true, 'pending'], 'demande émise');
  eq((await friendReq('clo')).already, true, 'demander deux fois');
  eq((await graph()).requestsOut.map((p) => p.handle), ['clo'], 'ma demande sortante');

  const gClo = await (async () => { await be(CLO); return graph(); })();
  eq(gClo.requestsIn.map((p) => p.handle), ['ana'], 'la demande arrive chez Clo');
  const reqId = gClo.requestsIn[0].id;
  ok(reqId, 'la demande REÇUE porte un id (c’est la seule sur laquelle on décide)');
  eq(gClo.requestsOut, [], 'Clo n’a rien demandé');

  // L'ÉMETTRICE ne peut pas accepter sa propre demande.
  await be(ANA);
  eq((await friendResp(reqId, true)).reason, 'not_found', 'Ana accepte sa propre demande');

  await be(CLO);
  eq((await friendResp(reqId, true)).status, 'accepted', 'Clo accepte');
  eq((await graph()).friends.map((p) => p.handle), ['ana'], 'Clo a Ana en amie');
  await be(ANA);
  eq((await graph()).friends.map((p) => p.handle), ['clo'], 'et réciproquement');
  eq((await graph()).requestsOut, [], 'la demande n’est plus en attente');
});

await t('demande CROISÉE = acceptation (sinon l’index de paire bloquerait les deux)', async () => {
  await be(BEN);
  eq((await friendReq('eve')).status, 'pending', 'Ben demande Eve');
  await be(EVE);
  const r = await friendReq('ben'); // Eve demande Ben, qui l'a déjà demandée
  eq([r.ok, r.status], [true, 'accepted'], 'croisement');
  eq((await graph()).friends.map((p) => p.handle), ['ben'], 'Eve et Ben sont amis');
});

await t('un REFUS tient : cooldown réel, exprimé en jours', async () => {
  const ZOE = '77777777-7777-7777-7777-777777777777';
  await makeUser(ZOE, 'zoe');
  await db.query(
    `insert into public.user_profiles (user_id, handle, profile_visibility) values ($1, 'zoe', 'public')`,
    [ZOE],
  );
  await be(ANA);
  await friendReq('zoe');
  await be(ZOE);
  const id = (await graph()).requestsIn[0].id;
  eq((await friendResp(id, false)).status, 'rejected', 'Zoé refuse');

  await be(ANA);
  const again = await friendReq('zoe');
  eq(again.reason, 'cooldown', 'relance immédiate après refus');
  eq(Number(again.cooldownDays), FRIEND_COOLDOWN_DAYS, 'délai rendu au client');

  // On vieillit le refus au-delà du cooldown : la demande redevient possible,
  // et RÉUTILISE la ligne (l'index d'unicité de paire de 0011 interdit un doublon).
  await db.query(
    `update public.friendships set updated_at = now() - ($1 || ' days')::interval
     where least(requester_id, addressee_id) = least($2::uuid, $3::uuid)
       and greatest(requester_id, addressee_id) = greatest($2::uuid, $3::uuid)`,
    [FRIEND_COOLDOWN_DAYS + 1, ANA, ZOE],
  );
  eq((await friendReq('zoe')).status, 'pending', 'relance après expiration du cooldown');
  const { rows } = await db.query(
    `select count(*)::int as n from public.friendships
     where least(requester_id, addressee_id) = least($1::uuid, $2::uuid)
       and greatest(requester_id, addressee_id) = greatest($1::uuid, $2::uuid)`,
    [ANA, ZOE],
  );
  eq(rows[0].n, 1, 'une seule ligne pour la paire');
});

await t('le plafond de demandes EN ATTENTE mord', async () => {
  const HUB = '88888888-8888-8888-8888-888888888888';
  await makeUser(HUB, 'hub');
  await db.query(
    `insert into public.user_profiles (user_id, handle, profile_visibility) values ($1, 'hub', 'public')`,
    [HUB],
  );
  for (let i = 0; i < FRIEND_MAX_PENDING; i += 1) {
    const id = `bbbbbbbb-0000-0000-0000-${String(i).padStart(12, '0')}`;
    await makeUser(id, `q${i}`);
    await db.query(
      'insert into public.friendships (requester_id, addressee_id, status) values ($1, $2, $3)',
      [HUB, id, 'pending'],
    );
  }
  await be(HUB);
  const r = await friendReq('ben');
  eq(r.reason, 'too_many_pending', 'plafond de demandes en attente');
  eq(Number(r.maxPending), FRIEND_MAX_PENDING, 'plafond rendu au client');
});

await t('social_graph ne rend JAMAIS un ami d’ami ni les suivis d’un tiers', async () => {
  // Ana ↔ Clo sont amies ; Ben ↔ Eve sont amis. Ana ne doit voir ni Eve ni Ben.
  await be(ANA);
  const g = await graph();
  const all = JSON.stringify([g.friends, g.requestsIn, g.requestsOut, g.followers]);
  ok(!all.includes('"eve"'), 'Eve (amie de Ben) apparaît chez Ana');
  eq(g.friends.map((p) => p.handle).sort(), ['clo'], 'les amis d’Ana, et rien d’autre');
  // Ana suit Ben : elle voit SON arête, pas celles de Ben.
  eq(g.following.map((p) => p.handle), ['ben'], 'les suivis d’Ana');
  ok(!('followingOf' in g) && !('suggestions' in g), 'aucune clé de graphe étendu');
});

await t('aucune suggestion n’est FABRIQUÉE — la clé dit qu’il n’y a pas de SOURCE', async () => {
  await be(ANA);
  const g = await graph();
  eq(g.suggestionsSource, 'none', 'suggestionsSource');
  eq(g.importedFriendsSource, 'none', 'importedFriendsSource');
  eq(Number(g.rowsLimit), LIST_LIMIT, 'borne de section rendue au client');
});

// ═══ 7. LE DÉFI ═════════════════════════════════════════════════════════════
await t('défier un INCONNU est refusé : no_relation (le lien précède la sollicitation)', async () => {
  await be(ANA);
  eq((await duel('eve', 'distance', 7, 'run', 10)).reason, 'no_relation', 'aucun lien');
  // Un suivi UNILATÉRAL ne suffit pas : Ana suit Ben, Ben ne la suit pas.
  eq((await duel('ben', 'distance', 7, 'run', 10)).reason, 'no_relation', 'suivi unilatéral');
});

await t('un suivi RÉCIPROQUE ouvre le défi, et une amitié aussi', async () => {
  await be(BEN);
  await follow('ana'); // réciprocité
  await be(ANA);
  const r = await duel('ben', 'distance', 7, 'run', 12.5);
  eq(r.ok, true, `défi via suivi réciproque : ${JSON.stringify(r)}`);
  ok(r.id, 'le défi a un id');
  await be(ANA);
  const r2 = await duel('clo', 'loops', 3, 'run', 4); // Clo est AMIE
  eq(r2.ok, true, `défi via amitié : ${JSON.stringify(r2)}`);
});

await t('les quatre formats : chacun exige ce qu’il exige, et rien d’autre', async () => {
  await be(ANA);
  // Un défi est déjà ouvert avec Ben et Clo : on nettoie pour tester les formats.
  await db.query('delete from public.duels');
  eq((await duel('ben', 'defend_zone', 5, 'run', null, null)).reason, 'bad_zone', 'defend_zone sans zone');
  eq((await duel('ben', 'defend_zone', 5, 'run', 9, 'Buttes-Chaumont')).reason, 'bad_target',
     'defend_zone avec une cible chiffrée');
  eq((await duel('ben', 'distance', 5, 'run', null)).reason, 'bad_target', 'distance sans cible');
  eq((await duel('ben', 'distance', 5, 'run', 0)).reason, 'bad_target', 'cible nulle');
  eq((await duel('ben', 'peloton', 5, 'run', 10)).reason, 'bad_kind', 'format hors DUEL_KINDS');
  eq((await duel('ben', 'distance', 5, 'trottinette', 10)).reason, 'bad_activity', 'discipline inconnue');
  eq((await duel('ben', 'distance', PERIOD_MAX + 1, 'run', 10)).reason, 'bad_period', 'fenêtre trop longue');
  eq((await duel('ben', 'distance', PERIOD_MIN - 1, 'run', 10)).reason, 'bad_period', 'fenêtre nulle');

  const okZone = await duel('ben', 'defend_zone', 5, 'run', null, '  Buttes-Chaumont  ');
  eq(okZone.ok, true, 'defend_zone valide');
  const { rows } = await db.query('select zone_label, target_value from public.duels where id = $1', [okZone.id]);
  eq(rows[0].zone_label, 'Buttes-Chaumont', 'le libellé est nettoyé');
  await db.query('delete from public.duels');
});

// ═══ LE LIBELLÉ DE ZONE EST LE SEUL TEXTE LIBRE DE E58, ET IL VOYAGE ════════
// `duel_inbox` le ressert VERBATIM au destinataire. Sans garde SERVEUR, un
// avertissement de placeholder ne protège personne : au moment où l'écran
// conseille, rien n'empêche l'envoi. Les deux gardes du dépôt sont appelées.
await t('le libellé de zone ne peut pas porter une adresse — refus SERVEUR, motif dit', async () => {
  await be(ANA);
  await db.query('delete from public.duels');
  for (const [label, kind] of [
    ['12 rue de la Paix', 'street_address'],
    ['221 Baker Street', 'street_address'],
    ['Hauptstrasse 4', 'street_address'],
    ['devant chez moi, digicode 45A12', 'door_detail'],
    ['batiment B appartement 12', 'door_detail'],
  ]) {
    const res = await duel('ben', 'defend_zone', 5, 'run', null, label);
    eq(res.ok, false, `refusé : ${label}`);
    eq(res.reason, 'zone_looks_like_address', `motif pour « ${label} »`);
    eq(res.kind, kind, `sous-motif pour « ${label} »`);
  }
  // Le miroir : un vrai lieu public passe. Sans ça, la garde serait un mur.
  for (const label of ['Buttes-Chaumont', 'Place de la République', 'Canal Saint-Martin']) {
    const res = await duel('ben', 'defend_zone', 5, 'run', null, label);
    eq(res.ok, true, `accepté : ${label}`);
    await db.query('delete from public.duels');
  }
  eq(
    (await db.query('select count(*)::int as n from public.duels')).rows[0].n,
    0,
    'aucun défi n’a été écrit par les libellés refusés',
  );
});

await t('le libellé de zone passe la modération de prose — motif OPAQUE (doctrine 0050)', async () => {
  await be(ANA);
  await db.query('delete from public.duels');
  // Caractère invisible (U+200B) : `moderation_has_invisible` (0050) le refuse,
  // et le motif ne dit PAS lequel a mordu — le détailler serait un mode d'emploi
  // du contournement (doctrine 0050, à l'inverse du motif d'adresse ci-dessus,
  // que le joueur DOIT connaître pour corriger).
  const res = await duel('ben', 'defend_zone', 5, 'run', null, 'Buttes​-Chaumont');
  eq(res.ok, false, 'libellé porteur d’un caractère invisible');
  eq(res.reason, 'zone_unavailable', 'motif opaque');
  eq(res.kind, undefined, 'aucun sous-motif : rien à apprendre au contournement');
  eq(
    (await db.query('select count(*)::int as n from public.duels')).rows[0].n,
    0,
    'rien n’a été écrit',
  );
});

await t('un seul défi ouvert par paire, QUEL QUE SOIT LE SENS', async () => {
  await be(ANA);
  const first = await duel('ben', 'distance', 7, 'run', 10);
  eq(first.ok, true, 'premier défi');
  eq((await duel('ben', 'loops', 3, 'run', 5)).reason, 'already_pending', 'deuxième défi d’Ana');
  await be(BEN);
  eq((await duel('ana', 'loops', 3, 'run', 5)).reason, 'already_pending', 'défi en sens inverse');
  // Il est bien visible des deux côtés, et rangé du bon côté.
  await be(BEN);
  const ib = await inbox();
  eq(ib.incoming.map((d) => d.from.handle), ['ana'], 'Ben le reçoit');
  eq(ib.outgoing, [], 'Ben n’a rien envoyé');
  await be(ANA);
  const ia = await inbox();
  eq(ia.outgoing.map((d) => d.to.handle), ['ben'], 'Ana l’a envoyé');
  eq(ia.incoming, [], 'Ana ne l’a pas reçu');
});

await t('REFUSER est un tap : aucun motif, et la relance est verrouillée DANS LES DEUX SENS', async () => {
  await be(BEN);
  const id = (await inbox()).incoming[0].id;
  const r = await duelResp(id, false);
  eq([r.ok, r.status], [true, 'declined'], 'refus');
  // Il n'existe AUCUN champ de motif : la colonne n'existe pas (testé §2).
  await be(ANA);
  const relance = await duel('ben', 'loops', 3, 'run', 4);
  eq(relance.reason, 'cooldown', 'relance immédiate par l’émettrice');
  eq(Number(relance.cooldownHours), DUEL_COOLDOWN_H, 'délai rendu au client');
  await be(BEN);
  eq((await duel('ana', 'loops', 3, 'run', 4)).reason, 'cooldown',
     'relance par l’autre côté — le cooldown porte sur la PAIRE');
});

await t('changer de FORMAT ne contourne pas le cooldown', async () => {
  await be(ANA);
  for (const k of KINDS) {
    const r = k === 'defend_zone'
      ? await duel('ben', k, 3, 'run', null, 'Canal')
      : await duel('ben', k, 3, 'run', 4);
    eq(r.reason, 'cooldown', `format ${k}`);
  }
});

await t('laisser POURRIR un défi ne contourne pas le cooldown non plus', async () => {
  // On vieillit le refus au-delà du cooldown pour repartir propre…
  await db.query('delete from public.duels');
  await be(ANA);
  const d = await duel('ben', 'distance', 7, 'run', 10);
  eq(d.ok, true, 'défi émis');
  // …puis on le fait EXPIRER sans que personne n'ait répondu.
  await db.query(`update public.duels set expires_at = now() - interval '1 minute' where id = $1`, [d.id]);
  await be(BEN);
  eq((await inbox()).incoming, [], 'un défi expiré ne s’affiche plus');
  eq((await duelResp(d.id, true)).reason, 'expired', 'on ne peut plus accepter un défi mort');
  await be(ANA);
  const relance = await duel('ben', 'loops', 3, 'run', 4);
  eq(relance.reason, 'cooldown', 'relance après expiration — le silence vaut réponse');
});

await t('accepter marche, et le défi accepté apparaît des deux côtés SANS score', async () => {
  await db.query('delete from public.duels');
  await be(ANA);
  const d = await duel('clo', 'surface_period', 7, 'run', 2.5);
  eq(d.ok, true, `défi à Clo : ${JSON.stringify(d)}`);
  await be(CLO);
  eq((await duelResp(d.id, true)).status, 'accepted', 'Clo accepte');
  const ic = await inbox();
  eq(ic.active.map((x) => x.with.handle), ['ana'], 'défi actif côté Clo');
  eq(ic.active[0].iChallenged, false, 'Clo n’est pas l’émettrice');
  eq(ic.scoringExists, false, 'AUCUN score n’est prétendu');
  ok(!JSON.stringify(ic.active[0]).includes('score'), 'aucune clé de score');
  await be(ANA);
  const ia = await inbox();
  eq(ia.active[0].iChallenged, true, 'Ana est l’émettrice');
  eq(Number(ia.expiryHours), DUEL_EXPIRY_H, 'délai d’expiration rendu au client');
  eq(Number(ia.maxPendingSent), DUEL_MAX_PENDING, 'plafond rendu au client');
});

await t('un tiers ne peut ni répondre ni annuler le défi de quelqu’un d’autre', async () => {
  await db.query('delete from public.duels');
  await be(ANA);
  const d = await duel('clo', 'loops', 3, 'run', 4);
  await be(EVE);
  eq((await duelResp(d.id, true)).reason, 'not_found', 'Eve répond à la place de Clo');
  eq((await duelCancel(d.id)).reason, 'not_found', 'Eve annule le défi d’Ana');
  // L'émettrice ne répond pas à son propre défi ; elle l'ANNULE.
  await be(ANA);
  eq((await duelResp(d.id, false)).reason, 'not_found', 'Ana répond à son propre défi');
  eq((await duelCancel(d.id)).status, 'cancelled', 'Ana retire son défi');
  eq((await duelCancel(d.id)).reason, 'not_pending', 'annuler deux fois');
});

await t('le plafond de défis ÉMIS en attente mord', async () => {
  await db.query('delete from public.duels');
  // Ana a besoin de DUEL_MAX_PENDING + 1 relations réciproques.
  const targets = [];
  for (let i = 0; i < DUEL_MAX_PENDING + 1; i += 1) {
    const id = `cccccccc-0000-0000-0000-${String(i).padStart(12, '0')}`;
    await makeUser(id, `r${i}`);
    await db.query(
      `insert into public.user_profiles (user_id, handle, profile_visibility) values ($1, $2, 'public')`,
      [id, `rival${i}`],
    );
    await db.query('insert into public.follows (follower_id, followee_id) values ($1, $2), ($2, $1)', [ANA, id]);
    targets.push(`rival${i}`);
  }
  await be(ANA);
  for (let i = 0; i < DUEL_MAX_PENDING; i += 1) {
    const r = await duel(targets[i], 'distance', 5, 'run', 8);
    eq(r.ok, true, `défi ${i + 1} : ${JSON.stringify(r)}`);
  }
  const over = await duel(targets[DUEL_MAX_PENDING], 'distance', 5, 'run', 8);
  eq(over.reason, 'too_many_pending', 'plafond de défis émis');
  eq(Number(over.maxPending), DUEL_MAX_PENDING, 'plafond rendu au client');
});

await t('l’échéance montrée au destinataire vaut DUEL_EXPIRY_HOURS depuis l’envoi', async () => {
  const { rows } = await db.query(
    `select extract(epoch from (expires_at - created_at)) / 3600 as h
     from public.duels where status = 'pending' limit 1`,
  );
  ok(Math.abs(Number(rows[0].h) - DUEL_EXPIRY_H) < 0.01, `fenêtre : ${rows[0].h} h vs ${DUEL_EXPIRY_H} h`);
});

// ─── Bilan ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} vert(s), ${failures.length} rouge(s)`);
if (failures.length > 0) {
  console.log('\nÉCHECS :');
  for (const f of failures) console.log(`  · ${f.name}\n    ${f.err.stack || f.err.message}`);
  process.exit(1);
}
console.log('OK — E57/E58 : le lien se demande, le défi se refuse, rien ne se fabrique.');
