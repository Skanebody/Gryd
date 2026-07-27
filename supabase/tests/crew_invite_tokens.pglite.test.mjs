#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0090 (`crew_invite_tokens`).
 * UNE INVITATION EST UN LIEN QUI DONNE UN DROIT — et un droit se prouve.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0090 ne contient AUCUN TypeScript : une table, sept fonctions PL/pgSQL, des
 * grants. Aucun test Deno n'en touche une ligne. Sans lui, « le lien expire »,
 * « le lien se révoque » et « le client ne s'ajoute jamais lui-même » seraient
 * des phrases dans un commentaire — c'est-à-dire une doc qui promet au-delà du
 * code, la faute que la constitution nomme explicitement.
 *
 * Six fautes de cette migration ne se lisent PAS :
 *   · un `%` biaisé sur l'alphabet du jeton (36 ne divise pas 256 — 0042 le
 *     tolère pour un code opaque ; ici l'entropie EST la sécurité) ;
 *   · une expiration qui se compare dans le mauvais sens, et un lien mort qui
 *     recrute encore ;
 *   · une révocation qui laisse passer, parce que `redeem` lit l'invitation
 *     avant de tester `revoked_at` ;
 *   · un `force row level security` qui, avec une table sans policy, aurait fait
 *     échouer les cinq RPC SECURITY DEFINER en silence ;
 *   · le jeton stocké en clair — une fuite de sauvegarde donnerait des liens
 *     utilisables ;
 *   · un `grant select` oublié sur la table, qui rendrait toute la mécanique
 *     décorative.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `crew_edit_rpc.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0090 s'applique sur un Postgres réel, telle quelle, PAR-DESSUS la lignée
 *     complète 0002 → 0089 — pas sur une maquette de schéma.
 *  2. LE JETON N'EST PAS DEVINABLE : 26 caractères sur l'alphabet Crockford,
 *     jamais deux fois le même sur 200 tirages, et la distribution ne trahit
 *     aucun symbole manquant (I, L, O, U absents ; les 32 autres présents).
 *  3. LA BASE NE STOCKE PAS LE JETON : `token_hash` vaut sha256(jeton) et le
 *     texte du jeton n'apparaît dans AUCUNE colonne de la table.
 *  4. IL EXPIRE : un jeton dont `expires_at` est passé est refusé par `peek` ET
 *     par `redeem`, avec `expired` — et l'adhésion n'a PAS lieu.
 *  5. IL SE RÉVOQUE : après `revoke_crew_invite`, `peek` et `redeem` répondent
 *     `revoked`. La révocation est idempotente et ne déplace pas `revoked_at`.
 *  6. LA MATRICE DÉCIDE QUI INVITE : `CREW_PERMISSIONS.invite` est RELUE dans
 *     `game-rules.ts` — fondateur et co-capitaine créent, capitaine/runner/
 *     rookie sont refusés (`forbidden`), non-membre `no_crew`.
 *  7. RÉVOQUER EST PLUS PERMISSIF QUE CRÉER : l'émetteur rétrogradé referme sa
 *     propre porte ; un membre quelconque ne referme pas celle d'un autre ;
 *     l'invitation d'un AUTRE crew est `not_found` (jamais `forbidden` — sinon
 *     la RPC devient un oracle d'existence).
 *  8. LES BORNES DE DURÉE SONT REFUSÉES, PAS ROGNÉES (`bad_ttl`), et le défaut
 *     vaut CREW_INVITE_DEFAULT_TTL_HOURS à la seconde près.
 *  9. LE PLAFOND D'INVITATIONS VIVANTES EST CREW_INVITE_MAX_ACTIVE — et un
 *     jeton révoqué ou expiré libère une place.
 * 10. L'ADHÉSION EST DÉCIDÉE SERVEUR, avec les règles de 0043 : rôle d'entrée
 *     `rookie`, idempotence sur le même crew (sans incrémenter `uses`), cooldown
 *     7 j, plafond 50, switch qui clôt l'adhésion précédente.
 * 11. L'APERÇU NE FUIT RIEN : `peek` rend nom/couleur/ville/effectif et AUCUN
 *     identifiant de personne. `list_crew_invites` ne rend ni jeton, ni
 *     empreinte, ni `user_id`.
 * 12. LA TABLE EST FERMÉE AUX CLIENTS : RLS activée, zéro policy, zéro
 *     privilège pour `anon`/`authenticated` — et les deux helpers de jeton sont
 *     fermés à tout le monde.
 * 13. AUCUNE DÉRIVE DE CONSTANTE : les six valeurs écrites dans le SQL sont
 *     comparées à `packages/shared/src/game-rules.ts`.
 * 14. ADDITIVITÉ : la lignée 0002→0089 et les données préexistantes survivent —
 *     `crews.code` et `join_crew_by_code` fonctionnent toujours après 0090.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue et l'absence
 *    de policy, pas un refus vécu par un tiers (`npm run verify:rls`).
 *  · `auth.uid()` est un bouchon REDÉFINI pour incarner un acteur. Ce n'est pas
 *    une session Supabase, c'est une simulation fidèle de son effet.
 *  · LA QUALITÉ CRYPTOGRAPHIQUE DE L'ALÉA. `extensions.gen_random_bytes` est
 *    ici un bouchon `md5(random())` (pgcrypto n'existe pas sous PGlite) : on
 *    prouve la FORME du jeton et l'absence de collision, pas l'imprévisibilité
 *    du CSPRNG de production. Celle-ci vient de pgcrypto, installé par 0001.
 *  · LES `for update` SOUS CONTENTION : PGlite est mono-connexion.
 *  · QUE L'ÉCRAN APPELLE CES FONCTIONS. Les décisions clientes sont pures et
 *    testées en Deno (`features/crew/inviteToken.test.ts`,
 *    `features/crew/inviteShareCapabilities.test.ts`).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/crew_invite_tokens.pglite.test.mjs
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
      `  cause : ${err.message}\n\n` +
      '  mkdir -p /tmp/pglite && cd /tmp/pglite\n' +
      '  echo \'{"name":"pglite-scratch","private":true}\' > package.json\n' +
      '  npm i --ignore-scripts @electric-sql/pglite\n' +
      '  cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \\\n' +
      '    node supabase/tests/crew_invite_tokens.pglite.test.mjs',
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
  -- Bouchon d'aléa : pgcrypto n'existe pas sous PGlite. Il rend jusqu'à 48
  -- octets — 0090 en demande 26 (CREW_INVITE_TOKEN_LENGTH), 0042 en demande 6.
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
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 89)
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

console.log('crew_invite_tokens — migration 0090 (jetons d’invitation) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0089)\n`);

// ─── Acteurs ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const COCAP = '22222222-2222-2222-2222-222222222222';
const CAPTAIN = '33333333-3333-3333-3333-333333333333';
const ROOKIE = '44444444-4444-4444-4444-444444444444';
const OUTSIDER = '55555555-5555-5555-5555-555555555555';
const NEWBIE = '66666666-6666-6666-6666-666666666666';
const OTHER_FOUNDER = '77777777-7777-7777-7777-777777777777';

const ACTORS = [FOUNDER, COCAP, CAPTAIN, ROOKIE, OUTSIDER, NEWBIE, OTHER_FOUNDER];

const as = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );
};
const rpc = async (sql, uid) => {
  await as(uid ?? null);
  const res = await db.query(sql);
  return res.rows[0][Object.keys(res.rows[0])[0]];
};

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0090_crew_invite_tokens.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0090 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Socle de données (crew réel, membres réels) ────────────────────────────
await db.exec(`
  insert into auth.users (id) values
    ${ACTORS.map((a) => `('${a}')`).join(',')};
  -- ON CONFLICT : la lignée pose un trigger qui matérialise public.users
  -- depuis auth.users. On ne se bat pas contre lui, on nomme les acteurs.
  insert into public.users (id, pseudo) values
    ('${FOUNDER}','founder'), ('${COCAP}','cocap'), ('${CAPTAIN}','captain'),
    ('${ROOKIE}','rookie'), ('${OUTSIDER}','outsider'), ('${NEWBIE}','newbie'),
    ('${OTHER_FOUNDER}','other')
  on conflict (id) do update set pseudo = excluded.pseudo;
  -- Un vrai polygone : 0066 pose un trigger qui dérive la bbox NOT NULL
  -- (min_lat/max_lat/...) du geojson. Un '{}' donnerait des NULL et un refus.
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by) values
    ('aaaaaaaa-0000-0000-0000-000000000001','Foulées 93',3,'paris','ABC123','${FOUNDER}'),
    ('aaaaaaaa-0000-0000-0000-000000000002','Rivaux',5,'paris','ZZZ999','${OTHER_FOUNDER}');
  insert into public.crew_members (crew_id, user_id, role) values
    ('aaaaaaaa-0000-0000-0000-000000000001','${FOUNDER}','founder'),
    ('aaaaaaaa-0000-0000-0000-000000000001','${COCAP}','co_captain'),
    ('aaaaaaaa-0000-0000-0000-000000000001','${CAPTAIN}','captain'),
    ('aaaaaaaa-0000-0000-0000-000000000001','${ROOKIE}','rookie'),
    ('aaaaaaaa-0000-0000-0000-000000000002','${OTHER_FOUNDER}','founder');
`);

const MINE = 'aaaaaaaa-0000-0000-0000-000000000001';
const THEIRS = 'aaaaaaaa-0000-0000-0000-000000000002';

const createInvite = (uid, ttl) =>
  rpc(`select public.create_crew_invite(${ttl === undefined ? 'null' : ttl}) as r`, uid);

/**
 * Fait VIEILLIR une invitation. On déplace `created_at` ET `expires_at` : le
 * check `expires_at > created_at` est une invariante de la table (une
 * invitation née déjà morte n'a aucun sens), pas un obstacle de test — on
 * simule le temps qui passe, on ne contourne pas la contrainte.
 */
const expireInvite = (id) =>
  db.exec(`update public.crew_invites
              set created_at = now() - interval '3 hours',
                  expires_at = now() - interval '1 hour'
            where id = '${id}'`);

// ═══ 2. LE JETON N'EST PAS DEVINABLE ════════════════════════════════════════
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

await t('le jeton fait CREW_INVITE_TOKEN_LENGTH caractères sur l’alphabet Crockford', async () => {
  const r = await createInvite(FOUNDER);
  eq(r.ok, true, 'création par le fondateur');
  eq(r.invite.token.length, 26, 'longueur du jeton'); // game-rules: CREW_INVITE_TOKEN_LENGTH
  ok(/^[0-9A-HJKMNP-TV-Z]{26}$/.test(r.invite.token), `alphabet du jeton : ${r.invite.token}`);
  eq(r.invite.prefix, r.invite.token.slice(0, 4), 'le préfixe est bien le début du jeton');
});

await t('200 tirages : aucune collision, et aucun symbole hors alphabet', async () => {
  // On tire directement le générateur (les invitations sont plafonnées à 5).
  const res = await db.query(
    'select public.gryd_new_invite_token() as tok from generate_series(1, 200)',
  );
  const toks = res.rows.map((r) => r.tok);
  eq(new Set(toks).size, 200, 'jetons distincts sur 200 tirages');
  const seen = new Set(toks.join('').split(''));
  for (const ch of seen) {
    ok(ALPHABET.includes(ch), `symbole « ${ch} » hors de l’alphabet Crockford`);
  }
  // Les quatre lettres ambiguës ne doivent JAMAIS sortir (I, L, O, U).
  for (const ch of ['I', 'L', 'O', 'U']) {
    ok(!seen.has(ch), `la lettre ambiguë « ${ch} » est sortie d’un tirage`);
  }
  // 200 × 26 = 5200 symboles : les 32 doivent tous être apparus. Un alphabet
  // tronqué (mauvais modulo, mauvais `substr`) se verrait exactement ici.
  eq(seen.size, 32, 'nombre de symboles distincts observés');
});

// ═══ 3. LA BASE NE STOCKE PAS LE JETON ══════════════════════════════════════
await t('la table stocke sha256(jeton), jamais le jeton', async () => {
  const r = await createInvite(COCAP);
  eq(r.ok, true, 'création par le co-capitaine');
  const tok = r.invite.token;
  const row = await db.query(
    `select encode(token_hash,'hex') as h, octet_length(token_hash) as n,
            (token_hash = sha256(convert_to($1,'UTF8'))) as matches
       from public.crew_invites where id = $2`,
    [tok, r.invite.id],
  );
  eq(row.rows[0].n, 32, 'taille de l’empreinte');
  eq(row.rows[0].matches, true, 'l’empreinte est bien sha256(jeton)');
  // Le texte du jeton ne doit apparaître dans AUCUNE colonne textuelle.
  const leak = await db.query(
    `select count(*)::int as n from public.crew_invites
      where prefix = $1 or id::text = $1 or encode(token_hash,'hex') ilike '%' || $1 || '%'`,
    [tok],
  );
  eq(leak.rows[0].n, 0, 'aucune colonne ne contient le jeton en clair');
});

await t('un jeton retapé en minuscules, avec espaces ou tirets, est reconnu', async () => {
  const r = await createInvite(FOUNDER);
  const tok = r.invite.token;
  const messy = `${tok.slice(0, 6).toLowerCase()}-${tok.slice(6, 13)} ${tok.slice(13).toLowerCase()}`;
  const peek = await rpc(`select public.peek_crew_invite($$${messy}$$) as r`, OUTSIDER);
  eq(peek.ok, true, 'jeton normalisé accepté');
  eq(peek.crew.name, 'Foulées 93', 'crew rendu par l’aperçu');
});

// ═══ 4. L'APERÇU NE FUIT RIEN ═══════════════════════════════════════════════
await t('peek rend nom/couleur/ville/effectif — et AUCUN identifiant de personne', async () => {
  const r = await createInvite(FOUNDER);
  const peek = await rpc(`select public.peek_crew_invite('${r.invite.token}') as r`, null);
  eq(peek.ok, true, 'aperçu accessible sans session (anon)');
  eq(peek.crew.name, 'Foulées 93', 'nom du crew');
  eq(peek.crew.memberCount, 4, 'effectif actif');
  eq(peek.crew.maxMembers, 50, 'plafond'); // game-rules: CREW_MAX_MEMBERS
  const keys = Object.keys(peek.crew).sort();
  eq(keys, ['cityId', 'color', 'id', 'maxMembers', 'memberCount', 'name'], 'clés de l’aperçu');
  ok(!JSON.stringify(peek).includes(FOUNDER), 'l’aperçu ne contient aucun user_id');
});

await t('un jeton inconnu répond bad_token (jamais un aperçu vide)', async () => {
  const peek = await rpc(`select public.peek_crew_invite('ZZZZZZZZZZZZZZZZZZZZZZZZZZ') as r`, null);
  eq(peek, { ok: false, reason: 'bad_token' }, 'jeton inconnu');
});

// ═══ 5. IL EXPIRE ═══════════════════════════════════════════════════════════
await t('un jeton expiré est refusé par peek ET par redeem, avec « expired »', async () => {
  const r = await createInvite(FOUNDER);
  await expireInvite(r.invite.id);
  const peek = await rpc(`select public.peek_crew_invite('${r.invite.token}') as r`, null);
  eq(peek, { ok: false, reason: 'expired' }, 'aperçu d’un jeton expiré');
  const red = await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE);
  eq(red, { ok: false, reason: 'expired' }, 'adhésion refusée');
  const m = await db.query(
    `select count(*)::int as n from public.crew_members where user_id = '${NEWBIE}'`,
  );
  eq(m.rows[0].n, 0, 'AUCUNE adhésion créée par un lien expiré');
});

await t('la durée par défaut vaut CREW_INVITE_DEFAULT_TTL_HOURS', async () => {
  await db.exec(`delete from public.crew_invites`);
  const r = await createInvite(FOUNDER);
  const row = await db.query(
    `select round(extract(epoch from (expires_at - created_at)) / 3600.0)::int as h
       from public.crew_invites where id = '${r.invite.id}'`,
  );
  eq(row.rows[0].h, 168, 'TTL par défaut en heures'); // game-rules: CREW_INVITE_DEFAULT_TTL_HOURS
});

await t('les durées hors bornes sont REFUSÉES, pas rognées', async () => {
  eq(await createInvite(FOUNDER, 0), { ok: false, reason: 'bad_ttl' }, 'ttl 0');
  eq(await createInvite(FOUNDER, -5), { ok: false, reason: 'bad_ttl' }, 'ttl négatif');
  eq(await createInvite(FOUNDER, 721), { ok: false, reason: 'bad_ttl' }, 'ttl > max');
  const short = await createInvite(FOUNDER, 1); // game-rules: CREW_INVITE_MIN_TTL_HOURS
  eq(short.ok, true, 'ttl minimal accepté');
  const long = await createInvite(FOUNDER, 720); // game-rules: CREW_INVITE_MAX_TTL_HOURS
  eq(long.ok, true, 'ttl maximal accepté');
});

// ═══ 6. IL SE RÉVOQUE ═══════════════════════════════════════════════════════
await t('après révocation, peek et redeem répondent « revoked » ; l’acte est idempotent', async () => {
  await db.exec(`delete from public.crew_invites`);
  const r = await createInvite(FOUNDER);
  eq(await rpc(`select public.revoke_crew_invite('${r.invite.id}') as r`, FOUNDER), { ok: true }, 'révocation');
  const at1 = (await db.query(`select revoked_at from public.crew_invites where id = '${r.invite.id}'`))
    .rows[0].revoked_at;
  eq(
    await rpc(`select public.peek_crew_invite('${r.invite.token}') as r`, null),
    { ok: false, reason: 'revoked' },
    'aperçu après révocation',
  );
  eq(
    await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE),
    { ok: false, reason: 'revoked' },
    'adhésion après révocation',
  );
  // Rejouer le geste de sécurité ne doit ni échouer ni déplacer l'horodatage.
  eq(await rpc(`select public.revoke_crew_invite('${r.invite.id}') as r`, FOUNDER), { ok: true }, 're-révocation');
  const at2 = (await db.query(`select revoked_at from public.crew_invites where id = '${r.invite.id}'`))
    .rows[0].revoked_at;
  eq(String(at1), String(at2), 'revoked_at inchangé');
});

// ═══ 7. QUI PEUT CRÉER / RÉVOQUER ═══════════════════════════════════════════
await t('CREW_PERMISSIONS.invite décide qui crée : founder + co_captain, personne d’autre', async () => {
  await db.exec(`delete from public.crew_invites`);
  eq((await createInvite(FOUNDER)).ok, true, 'fondateur');
  eq((await createInvite(COCAP)).ok, true, 'co-capitaine');
  eq(await createInvite(CAPTAIN), { ok: false, reason: 'forbidden' }, 'capitaine');
  eq(await createInvite(ROOKIE), { ok: false, reason: 'forbidden' }, 'rookie');
  eq(await createInvite(OUTSIDER), { ok: false, reason: 'no_crew' }, 'non-membre');
  eq(await createInvite(null), { ok: false, reason: 'signed_out' }, 'déconnecté');
});

await t('révoquer : l’émetteur rétrogradé referme sa porte, un membre lambda non', async () => {
  await db.exec(`delete from public.crew_invites`);
  const mineInv = await createInvite(COCAP);
  // Rétrogradation : il ne peut plus CRÉER…
  await db.exec(
    `update public.crew_members set role = 'runner' where user_id = '${COCAP}' and left_at is null`,
  );
  eq(await createInvite(COCAP), { ok: false, reason: 'forbidden' }, 'création après rétrogradation');
  // …mais il referme ce qu'il a ouvert.
  eq(
    await rpc(`select public.revoke_crew_invite('${mineInv.invite.id}') as r`, COCAP),
    { ok: true },
    'révocation de sa propre invitation',
  );
  await db.exec(
    `update public.crew_members set role = 'co_captain' where user_id = '${COCAP}' and left_at is null`,
  );

  const otherInv = await createInvite(FOUNDER);
  eq(
    await rpc(`select public.revoke_crew_invite('${otherInv.invite.id}') as r`, ROOKIE),
    { ok: false, reason: 'forbidden' },
    'un rookie ne révoque pas l’invitation d’un autre',
  );
  eq(
    await rpc(`select public.revoke_crew_invite('${otherInv.invite.id}') as r`, COCAP),
    { ok: true },
    'le co-capitaine referme la porte de n’importe qui',
  );
});

await t('une invitation d’un AUTRE crew est « not_found », jamais « forbidden »', async () => {
  const foreign = await createInvite(OTHER_FOUNDER);
  eq(foreign.ok, true, 'le crew rival crée son invitation');
  eq(
    await rpc(`select public.revoke_crew_invite('${foreign.invite.id}') as r`, FOUNDER),
    { ok: false, reason: 'not_found' },
    'aucun oracle d’existence',
  );
  eq(
    await rpc(`select public.revoke_crew_invite(gen_random_uuid()) as r`, FOUNDER),
    { ok: false, reason: 'not_found' },
    'uuid inexistant : même réponse, mot pour mot',
  );
});

// ═══ 8. PLAFOND D'INVITATIONS VIVANTES ══════════════════════════════════════
await t('CREW_INVITE_MAX_ACTIVE plafonne les jetons vivants — révoquer libère une place', async () => {
  await db.exec(`delete from public.crew_invites where crew_id = '${MINE}'`);
  const ids = [];
  for (let i = 0; i < 5; i += 1) {
    // game-rules: CREW_INVITE_MAX_ACTIVE
    const r = await createInvite(FOUNDER);
    eq(r.ok, true, `création n°${i + 1}`);
    ids.push(r.invite.id);
  }
  eq(await createInvite(FOUNDER), { ok: false, reason: 'too_many_invites' }, '6ᵉ création');
  await rpc(`select public.revoke_crew_invite('${ids[0]}') as r`, FOUNDER);
  eq((await createInvite(FOUNDER)).ok, true, 'une révocation libère une place');
  // Une EXPIRATION libère aussi : c'est ce qui rend le plafond vivable.
  await expireInvite(ids[1]);
  eq((await createInvite(FOUNDER)).ok, true, 'une expiration libère une place');
});

// ═══ 9. L'ADHÉSION EST DÉCIDÉE SERVEUR ══════════════════════════════════════
await t('redeem fait entrer en rookie, incrémente uses, et n’est pas rejouable en double', async () => {
  await db.exec(`delete from public.crew_invites where crew_id = '${MINE}'`);
  const r = await createInvite(FOUNDER);
  const red = await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE);
  eq(red.ok, true, 'adhésion accordée');
  eq(red.crew.name, 'Foulées 93', 'crew rendu');
  const row = await db.query(
    `select role, left_at from public.crew_members where user_id = '${NEWBIE}' and left_at is null`,
  );
  eq(row.rows[0].role, 'rookie', 'rôle d’entrée'); // game-rules: CREW_ENTRY_ROLE
  const u1 = (await db.query(`select uses from public.crew_invites where id = '${r.invite.id}'`)).rows[0].uses;
  eq(u1, 1, 'compteur d’usages');

  // Idempotent : rouvrir le lien quand on est déjà membre ne recrute personne.
  const again = await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE);
  eq(again.ok, true, 'rejeu idempotent');
  const u2 = (await db.query(`select uses from public.crew_invites where id = '${r.invite.id}'`)).rows[0].uses;
  eq(u2, 1, 'le compteur n’a PAS bougé');
  const n = await db.query(
    `select count(*)::int as n from public.crew_members where user_id = '${NEWBIE}'`,
  );
  eq(n.rows[0].n, 1, 'une seule ligne d’adhésion');
});

await t('redeem applique le cooldown 7 j de 0043 — un lien ne l’achète pas', async () => {
  // `left_at >= joined_at` (0002:57) : on recule les DEUX horodatages, sinon
  // c'est le schéma qu'on violerait, pas le cooldown qu'on éprouverait.
  await db.exec(`
    update public.crew_members
       set joined_at = now() - interval '10 days', left_at = now() - interval '2 days'
     where user_id = '${NEWBIE}' and left_at is null;
  `);
  const r = await createInvite(FOUNDER);
  const red = await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE);
  eq(red.ok, false, 'refus');
  eq(red.reason, 'cooldown', 'motif'); // game-rules: CREW_SWITCH_COOLDOWN_DAYS
  eq(red.daysLeft, 5, 'jours restants');
  // Purge : on remet le testeur à zéro pour la suite.
  await db.exec(`delete from public.crew_members where user_id = '${NEWBIE}'`);
});

await t('redeem depuis un AUTRE crew fait un switch (l’ancienne adhésion est close)', async () => {
  await db.exec(`
    insert into public.crew_members (crew_id, user_id, role)
      values ('${THEIRS}', '${NEWBIE}', 'runner');
  `);
  const r = await createInvite(FOUNDER);
  const red = await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE);
  eq(red.ok, true, 'switch accordé');
  const rows = await db.query(
    `select crew_id::text as crew_id, left_at is null as active
       from public.crew_members where user_id = '${NEWBIE}' order by joined_at`,
  );
  eq(rows.rows.length, 2, 'deux lignes : l’ancienne close, la nouvelle active');
  eq(rows.rows[0].active, false, 'l’adhésion au crew rival est CLOSE');
  eq(rows.rows[1].crew_id, MINE, 'la nouvelle adhésion vise le bon crew');
  await db.exec(`delete from public.crew_members where user_id = '${NEWBIE}'`);
});

await t('redeem refuse un crew plein (CREW_MAX_MEMBERS), sans consommer le jeton', async () => {
  const r = await createInvite(FOUNDER);
  // On remplit le crew jusqu'au plafond avec des membres synthétiques, aux
  // identifiants CHOISIS (un `gen_random_uuid()` serait irrattrapable pour la
  // purge, et la lignée matérialise déjà public.users depuis auth.users).
  // ⚠ Les 12 PREMIERS caractères hexadécimaux doivent différer : le trigger
  // `handle_new_user` (0028) dérive `pseudo = 'runner_' || substr(uuid, 1, 12)`
  // et ce pseudo est UNIQUE. Des uuids qui ne diffèrent qu'à la fin
  // s'effondreraient tous sur le même pseudo.
  const bots = Array.from({ length: 60 }, (_, i) =>
    `bbbb${String(i + 1).padStart(4, '0')}-0000-0000-0000-000000000000`);
  await db.exec(`
    insert into auth.users (id) values ${bots.map((b) => `('${b}')`).join(',')}
      on conflict (id) do nothing;
    insert into public.users (id, pseudo) values
      ${bots.map((b, i) => `('${b}','bot_${i}')`).join(',')}
      on conflict (id) do update set pseudo = excluded.pseudo;
    insert into public.crew_members (crew_id, user_id, role)
      select '${MINE}', u.id, 'runner' from public.users u
       where u.pseudo like 'bot\\_%'
         and not exists (select 1 from public.crew_members m
                          where m.user_id = u.id and m.left_at is null);
  `);
  const filled = await db.query(
    `select count(*)::int as n from public.crew_members
      where crew_id = '${MINE}' and left_at is null`,
  );
  ok(filled.rows[0].n >= 50, `le crew doit être plein (${filled.rows[0].n} membres)`);
  const red = await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, NEWBIE);
  eq(red, { ok: false, reason: 'full' }, 'crew plein'); // game-rules: CREW_MAX_MEMBERS
  const u = (await db.query(`select uses from public.crew_invites where id = '${r.invite.id}'`)).rows[0].uses;
  eq(u, 0, 'un refus ne consomme pas le jeton');
  // Purge des membres synthétiques.
  await db.exec(`
    delete from public.crew_members cm using public.users u
      where cm.user_id = u.id and u.pseudo like 'bot\\_%';
  `);
});

await t('redeem sans session est signed_out — le client ne s’ajoute jamais lui-même', async () => {
  const r = await createInvite(FOUNDER);
  eq(
    await rpc(`select public.redeem_crew_invite('${r.invite.token}') as r`, null),
    { ok: false, reason: 'signed_out' },
    'déconnecté',
  );
});

// ═══ 10. LA LISTE NE FUIT NI JETON NI PERSONNE ══════════════════════════════
await t('list_crew_invites : ni jeton, ni empreinte, ni user_id — et un statut vrai', async () => {
  await db.exec(`delete from public.crew_invites where crew_id = '${MINE}'`);
  const a = await createInvite(FOUNDER);
  const b = await createInvite(COCAP);
  const c = await createInvite(FOUNDER);
  await rpc(`select public.revoke_crew_invite('${b.invite.id}') as r`, FOUNDER);
  await expireInvite(c.invite.id);

  const list = await rpc('select public.list_crew_invites() as r', FOUNDER);
  eq(list.ok, true, 'liste rendue');
  eq(list.invites.length, 3, 'trois invitations');
  const byId = Object.fromEntries(list.invites.map((i) => [i.id, i]));
  eq(byId[a.invite.id].status, 'active', 'statut actif');
  eq(byId[b.invite.id].status, 'revoked', 'statut révoqué');
  eq(byId[c.invite.id].status, 'expired', 'statut expiré');
  eq(byId[a.invite.id].mine, true, 'la mienne');
  eq(byId[b.invite.id].mine, false, 'celle d’un autre — sans dire qui');
  const keys = Object.keys(byId[a.invite.id]).sort();
  eq(keys, ['createdAt', 'expiresAt', 'id', 'mine', 'prefix', 'status', 'uses'], 'clés de la liste');
  const dump = JSON.stringify(list);
  ok(!dump.includes(a.invite.token), 'la liste ne contient aucun jeton');
  ok(!dump.includes(FOUNDER) && !dump.includes(COCAP), 'la liste ne contient aucun user_id');
});

await t('list_crew_invites ne montre que MON crew, et refuse un non-membre', async () => {
  const list = await rpc('select public.list_crew_invites() as r', ROOKIE);
  eq(list.ok, true, 'un membre simple voit les portes ouvertes de son crew');
  const foreign = await db.query(
    `select count(*)::int as n from public.crew_invites where crew_id = '${THEIRS}'`,
  );
  ok(foreign.rows[0].n > 0, 'le crew rival a bien des invitations en base');
  eq(list.invites.every((i) => i.status !== undefined), true, 'chaque ligne porte un statut');
  eq(
    await rpc('select public.list_crew_invites() as r', OUTSIDER),
    { ok: false, reason: 'no_crew' },
    'non-membre',
  );
});

// ═══ 11. LA TABLE EST FERMÉE AUX CLIENTS ════════════════════════════════════
await t('RLS activée, ZÉRO policy, ZÉRO privilège pour anon/authenticated', async () => {
  const rls = await db.query(
    `select relrowsecurity from pg_class where oid = 'public.crew_invites'::regclass`,
  );
  eq(rls.rows[0].relrowsecurity, true, 'RLS activée');
  const pol = await db.query(
    `select count(*)::int as n from pg_policies where schemaname='public' and tablename='crew_invites'`,
  );
  eq(pol.rows[0].n, 0, 'aucune policy permissive (refus par défaut)');
  const grants = await db.query(
    `select count(*)::int as n from information_schema.role_table_grants
      where table_schema='public' and table_name='crew_invites'
        and grantee in ('anon','authenticated')`,
  );
  eq(grants.rows[0].n, 0, 'aucun privilège client sur la table');
});

await t('les deux helpers de jeton sont fermés à TOUT LE MONDE', async () => {
  for (const fn of ['gryd_new_invite_token', 'gryd_invite_token_hash']) {
    const g = await db.query(
      `select count(*)::int as n from information_schema.role_routine_grants
        where routine_schema='public' and routine_name=$1
          and grantee in ('anon','authenticated','PUBLIC')`,
      [fn],
    );
    eq(g.rows[0].n, 0, `${fn} : aucun grant client`);
  }
});

await t('les 5 RPC sont SECURITY DEFINER, search_path figé, et ouvertes au bon rôle', async () => {
  const rows = await db.query(`
    select p.proname, p.prosecdef, array_to_string(p.proconfig, ',') as cfg
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('create_crew_invite','revoke_crew_invite','list_crew_invites',
                         'peek_crew_invite','redeem_crew_invite')
     order by p.proname
  `);
  eq(rows.rows.length, 5, 'les 5 fonctions existent');
  for (const r of rows.rows) {
    eq(r.prosecdef, true, `${r.proname} est SECURITY DEFINER`);
    ok((r.cfg ?? '').includes('search_path='), `${r.proname} fige son search_path`);
  }
  const anonGrants = await db.query(`
    select routine_name from information_schema.role_routine_grants
     where routine_schema='public' and grantee='anon'
       and routine_name in ('create_crew_invite','revoke_crew_invite','list_crew_invites',
                            'peek_crew_invite','redeem_crew_invite')
  `);
  eq(
    anonGrants.rows.map((r) => r.routine_name),
    ['peek_crew_invite'],
    'anon n’a QUE l’aperçu (§4.4)',
  );
});

// ═══ 12. AUCUNE DÉRIVE DE CONSTANTE ═════════════════════════════════════════
await t('les valeurs écrites dans 0090 sont celles de game-rules.ts', async () => {
  const rules = readFileSync(GAME_RULES, 'utf8');
  const constant = (name) => {
    const m = new RegExp(`export const ${name} = (\\d+)`).exec(rules);
    if (!m) throw new Error(`${name} introuvable dans game-rules.ts`);
    return Number(m[1]);
  };
  eq(constant('CREW_INVITE_TOKEN_LENGTH'), 26, 'longueur du jeton');
  eq(constant('CREW_INVITE_TOKEN_BYTES'), 16, 'octets d’entropie');
  eq(constant('CREW_INVITE_DEFAULT_TTL_HOURS'), 168, 'TTL par défaut');
  eq(constant('CREW_INVITE_MAX_TTL_HOURS'), 720, 'TTL max');
  eq(constant('CREW_INVITE_MIN_TTL_HOURS'), 1, 'TTL min');
  eq(constant('CREW_INVITE_MAX_ACTIVE'), 5, 'invitations vivantes max');
  eq(constant('CREW_MAX_MEMBERS'), 50, 'plafond de membres');
  eq(constant('CREW_SWITCH_COOLDOWN_DAYS'), 7, 'cooldown');
  // 26 caractères base32 doivent pouvoir porter les 16 octets d'entropie.
  ok(
    constant('CREW_INVITE_TOKEN_LENGTH') * 5 >= constant('CREW_INVITE_TOKEN_BYTES') * 8,
    'le jeton encodé est trop court pour son entropie annoncée',
  );
  // La matrice reste la loi : si `invite` s'ouvrait à d'autres rôles, la garde
  // recopiée dans 0090 dériverait en silence.
  const sql = readFileSync(join(MIGRATIONS, '0090_crew_invite_tokens.sql'), 'utf8');
  const matrix = /invite: \[([^\]]+)\]/.exec(rules);
  ok(matrix !== null, 'CREW_PERMISSIONS.invite introuvable');
  const roles = matrix[1].match(/'([a-z_]+)'/g).map((s) => s.replace(/'/g, ''));
  eq(roles.sort(), ['co_captain', 'founder'], 'CREW_PERMISSIONS.invite');
  for (const role of roles) {
    ok(sql.includes(`'${role}'`), `0090 ne teste pas le rôle « ${role} » de la matrice`);
  }
});

// ═══ 13. ADDITIVITÉ ═════════════════════════════════════════════════════════
await t('0090 est ADDITIVE : le code permanent et join_crew_by_code marchent encore', async () => {
  const join = await rpc(`select public.join_crew_by_code('ZZZ999') as r`, NEWBIE);
  eq(join.ok, true, 'adhésion par code après 0090');
  eq(join.crew.name, 'Rivaux', 'crew rejoint');
  await db.exec(`delete from public.crew_members where user_id = '${NEWBIE}'`);
  const code = await rpc('select public.my_crew_code() as r', FOUNDER);
  eq(code, { ok: true, code: 'ABC123' }, 'my_crew_code intact');
  // Aucune colonne n'a été retirée de crews / crew_members.
  const cols = await db.query(
    `select count(*)::int as n from information_schema.columns
      where table_schema='public' and table_name='crews' and column_name in ('code','name','color','city_id')`,
  );
  eq(cols.rows[0].n, 4, 'colonnes de crews intactes');
});

// ─── Bilan ──────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} test(s) en échec sur ${passed + failures.length} :`);
  for (const f of failures) console.error(`  · ${f.name}\n    ${f.err.stack ?? f.err.message}`);
  process.exit(1);
}
console.log(`${passed} tests verts — 0090 tient ce qu’elle écrit.`);
