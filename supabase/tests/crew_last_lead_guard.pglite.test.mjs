#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0098 (`crew_last_lead_guard`).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0093 a posé `must_transfer_lead` sur `leave_crew` et son en-tête a écrit que
 * l'orphelin était « fermé des deux bouts ». Il ne l'était pas : DEUX autres
 * fonctions closent une adhésion active sans lire le rôle — `join_crew_by_code`
 * (que 0093 réécrit elle-même) et `redeem_crew_invite` (0090). Un founder qui
 * REJOINT ailleurs quitte donc son crew sans passer par la porte gardée, et
 * laisse derrière lui un crew PEUPLÉ SANS CHEF que plus aucune RPC ne répare :
 * `transferFoundership` est founder-seul (game-rules.ts:1328), et la garde
 * `dead_crew` de 0093 ne mord qu'à ZÉRO membre actif — un crew décapité mais
 * peuplé continuait à recruter.
 *
 * Les 30 assertions de `crew_member_roles.pglite.test.mjs` étaient vertes et
 * n'ont rien vu : elles n'appellent `join_crew_by_code` que depuis un joueur
 * SANS crew, ou vers un crew mort. Le chemin fautif — un FOUNDER qui rejoint —
 * n'était couvert nulle part. C'est la leçon de ce fichier autant que la garde.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. LA BRÈCHE EXISTAIT VRAIMENT. Avant d'appliquer 0098, sur la lignée
 *     0002 → 0093, il REJOUE la séquence fautive et vérifie qu'elle passe.
 *     Sans cette étape, rien ne distinguerait 0098 d'un no-op.
 *  1. 0098 s'applique sur un Postgres réel, par-dessus 0002 → 0093.
 *  2. `join_crew_by_code` refuse le DERNIER CHEF (`must_transfer_lead` +
 *     `membersLeftBehind`), avec le MÊME motif et la même charge utile que
 *     `leave_crew` — un seul mot pour un seul fait.
 *  3. `redeem_crew_invite` le refuse pareil, et son compteur d'usages NE MONTE
 *     PAS sur ce refus (un refus n'est pas un recrutement).
 *  4. CE QUI RESTE PERMIS reste permis : founder SEUL (personne derrière lui),
 *     membre non-chef, et l'idempotence du founder qui rouvre le lien de SON
 *     PROPRE crew (il ne part nulle part — la garde est placée après).
 *  5. Les autres refus de 0090/0093 survivent à la réécriture : `bad_code`,
 *     `dead_crew`, `bad_token`, `revoked`, `expired`, `full`.
 *  6. APRÈS 0098, LE CREW NE PEUT PLUS ÊTRE DÉCAPITÉ : la séquence de l'étape 0
 *     rejouée à l'identique laisse le founder en place.
 *  7. ANTI-PAY-TO-WIN PAR ABSENCE : aucune des fonctions réécrites ne nomme
 *     `hex_claims`, `territories`, `crews.xp` ni `users.foulees` — vérifié sur
 *     le TEXTE stocké par Postgres, pas sur le fichier.
 *  8. PRIVILÈGES : `anon` n'exécute ni les deux RPC ni le helper interne, et
 *     `authenticated` n'exécute pas le helper.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue, pas un refus
 *    vécu par un tiers. `npm run verify:rls` le fait sur le vrai projet.
 *  · `auth.uid()` est un bouchon redéfini pour incarner un acteur.
 *  · LA SUPPRESSION DE COMPTE. `purge_due_accounts` (0046:267) supprime la ligne
 *    `users` et la cascade emporte l'adhésion du founder : ce troisième chemin
 *    reste OUVERT, il appelle une succession automatique et non une garde. 0098
 *    ne le ferme pas et ce test ne prétend pas le contraire.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   npm run test:sql            (ou, isolément :)
 *   node supabase/tests/crew_last_lead_guard.pglite.test.mjs
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
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 93)
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

console.log('crew_last_lead_guard — migration 0098 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0093)\n`);

// ─── Acteurs ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const COCAP = '22222222-2222-2222-2222-222222222222';
const ROOKIE = '55555555-5555-5555-5555-555555555555';
const OUTSIDER = '66666666-6666-6666-6666-666666666666';
const OTHER_FOUNDER = '77777777-7777-7777-7777-777777777777';
const SOLO = '88888888-8888-8888-8888-888888888888';
const ACTORS = [FOUNDER, COCAP, ROOKIE, OUTSIDER, OTHER_FOUNDER, SOLO];

const MINE = 'aaaaaaaa-0000-0000-0000-000000000001';
const THEIRS = 'aaaaaaaa-0000-0000-0000-000000000002';
const SOLO_CREW = 'aaaaaaaa-0000-0000-0000-000000000003';
const DEAD_CREW = 'aaaaaaaa-0000-0000-0000-000000000004';

await db.exec(`
  insert into auth.users (id) values ${ACTORS.map((a) => `('${a}')`).join(',')};
  insert into public.users (id, pseudo) values
    ('${FOUNDER}','founder'), ('${COCAP}','cocap'), ('${ROOKIE}','rookie'),
    ('${OUTSIDER}','outsider'), ('${OTHER_FOUNDER}','other'), ('${SOLO}','solo')
  on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by) values
    ('${MINE}','Foulées 93',3,'paris','ABC123','${FOUNDER}'),
    ('${THEIRS}','Rivaux',5,'paris','ZZZ999','${OTHER_FOUNDER}'),
    ('${SOLO_CREW}','Seul au monde',4,'paris','SOLO01','${SOLO}'),
    ('${DEAD_CREW}','Fantômes',7,'paris','DEAD01','${OUTSIDER}');
`);

/** Remet les adhésions dans l'état de départ (aucun `left_at`, aucun cooldown). */
const reset = async () => {
  await db.exec(`
    delete from public.crew_members;
    insert into public.crew_members (crew_id, user_id, role) values
      ('${MINE}','${FOUNDER}','founder'),
      ('${MINE}','${COCAP}','co_captain'),
      ('${MINE}','${ROOKIE}','rookie'),
      ('${THEIRS}','${OTHER_FOUNDER}','founder'),
      ('${SOLO_CREW}','${SOLO}','founder');
  `);
};
await reset();

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
const joinByCode = (uid, code) => rpc(`select public.join_crew_by_code('${code}') as r`, uid);
const redeem = (uid, token) => rpc(`select public.redeem_crew_invite('${token}') as r`, uid);

/** État d'un crew : membres actifs et founders actifs. */
const crewState = async (crewId) => {
  const r = await db.query(
    `select count(*) filter (where left_at is null)::int as actifs,
            count(*) filter (where left_at is null and role = 'founder')::int as founders
     from public.crew_members where crew_id = $1`,
    [crewId],
  );
  return { actifs: r.rows[0].actifs, founders: r.rows[0].founders };
};

// ═══ 0. LA BRÈCHE, REJOUÉE AVANT LE CORRECTIF ═══════════════════════════════
// Sans cette étape, un 0098 qui ne changerait rien passerait pour un succès.
await t('AVANT 0098 : un founder rejoint ailleurs et DÉCAPITE son crew (la brèche)', async () => {
  eq(
    await rpc('select public.leave_crew() as r', FOUNDER),
    { ok: false, reason: 'must_transfer_lead', membersLeftBehind: 2 },
    'la porte gardée par 0093 refuse bien',
  );
  const joined = await joinByCode(FOUNDER, 'ZZZ999');
  eq(joined.ok, true, 'la porte NON gardée laissait passer le même geste');
  eq(await crewState(MINE), { actifs: 2, founders: 0 }, 'crew peuplé, sans chef');
  // Et il recrutait encore : `dead_crew` ne mord qu'à zéro membre actif.
  const stranger = await joinByCode(OUTSIDER, 'ABC123');
  eq(stranger.ok, true, 'un crew décapité recrutait encore, vers l’irréparable');
});

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0098_crew_last_lead_guard.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}
await t('la migration 0098 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

await reset();

// ═══ 2. join_crew_by_code : LE DERNIER CHEF NE PART PAS ═════════════════════
await t('join_crew_by_code refuse le founder qui laisserait des membres derrière', async () => {
  eq(
    await joinByCode(FOUNDER, 'ZZZ999'),
    { ok: false, reason: 'must_transfer_lead', membersLeftBehind: 2 },
    'même motif et même charge utile que leave_crew',
  );
  eq(await crewState(MINE), { actifs: 3, founders: 1 }, 'rien n’a bougé');
  eq(await crewState(THEIRS), { actifs: 1, founders: 1 }, 'le crew visé non plus');
});

await t('le refus est le MÊME mot que celui de leave_crew (une seule traduction)', async () => {
  const viaLeave = await rpc('select public.leave_crew() as r', FOUNDER);
  const viaJoin = await joinByCode(FOUNDER, 'ZZZ999');
  eq(viaLeave.reason, viaJoin.reason, 'motif identique');
  eq(viaLeave.membersLeftBehind, viaJoin.membersLeftBehind, 'compte identique');
});

await t('un founder SEUL peut encore rejoindre ailleurs (il ne laisse personne)', async () => {
  const res = await joinByCode(SOLO, 'ZZZ999');
  eq(res.ok, true, 'aucun membre derrière : aucune raison de refuser');
  eq(await crewState(SOLO_CREW), { actifs: 0, founders: 0 }, 'le crew devient vide, pas orphelin');
  await reset();
});

await t('un membre NON-CHEF rejoint comme avant (la garde ne le concerne pas)', async () => {
  eq((await joinByCode(COCAP, 'ZZZ999')).ok, true, 'un co_captain n’est pas le chef');
  await reset();
  eq((await joinByCode(ROOKIE, 'ZZZ999')).ok, true, 'un rookie non plus');
  await reset();
});

await t('IDEMPOTENCE PRÉSERVÉE : le founder qui ressaisit le code de SON crew réussit', async () => {
  // La garde est placée APRÈS le test d'appartenance : répondre « transfère la
  // propriété » à quelqu'un qui ne part nulle part serait un refus inventé.
  const res = await joinByCode(FOUNDER, 'ABC123');
  eq(res.ok, true, 'succès sans rien changer');
  eq(await crewState(MINE), { actifs: 3, founders: 1 }, 'état intact');
});

// ═══ 3. LES AUTRES REFUS SURVIVENT À LA RÉÉCRITURE ══════════════════════════
await t('bad_code / dead_crew / full : 0093 est recopiée, pas réécrite de mémoire', async () => {
  eq(await joinByCode(OUTSIDER, 'ZZ'), { ok: false, reason: 'bad_code' }, 'code mal formé');
  eq(await joinByCode(OUTSIDER, 'QQQQQQ'), { ok: false, reason: 'bad_code' }, 'code inexistant');
  eq(
    await joinByCode(OUTSIDER, 'DEAD01'),
    { ok: false, reason: 'dead_crew' },
    'un crew sans aucun membre actif ne recrute pas',
  );
});

await t('le cooldown des départs VOLONTAIRES est intact (0093 §7)', async () => {
  // Une adhésion CLOSE volontairement (removed_by null), il y a un jour.
  await db.exec(
    `insert into public.crew_members (crew_id, user_id, role, joined_at, left_at, removed_by)
     values ('${THEIRS}', '${OUTSIDER}', 'rookie',
             now() - interval '3 days', now() - interval '1 day', null);`,
  );
  const res = await joinByCode(OUTSIDER, 'ABC123');
  eq(res.ok, false, 'refus');
  eq(res.reason, 'cooldown', 'motif cooldown');
  ok(res.daysLeft >= 1, `daysLeft attendu ≥ 1, obtenu ${res.daysLeft}`);
  await db.exec(`delete from public.crew_members where user_id = '${OUTSIDER}';`);
});

// ═══ 4. redeem_crew_invite : LA MÊME BORNE PAR LA PORTE DU LIEN ═════════════
// Alphabet base32 sans I/L/O/U, comme les jetons produits par 0090 ; `prefix`
// est bien les 4 PREMIERS caractères du jeton (le CHECK de la colonne l'exige).
const TOKEN = 'ABCD2345EFGH6789JKMNPQRS';
const mkInvite = async () => {
  await db.exec(`
    delete from public.crew_invites;
    insert into public.crew_invites (crew_id, created_by, token_hash, prefix, expires_at)
    values ('${THEIRS}', '${OTHER_FOUNDER}', public.gryd_invite_token_hash('${TOKEN}'),
            '${TOKEN.slice(0, 4)}', now() + interval '48 hours');
  `);
};
const inviteUses = async () => {
  const r = await db.query('select uses from public.crew_invites limit 1');
  return r.rows[0].uses;
};

await t('redeem_crew_invite refuse le dernier chef, avec le MÊME motif', async () => {
  await mkInvite();
  eq(
    await redeem(FOUNDER, TOKEN),
    { ok: false, reason: 'must_transfer_lead', membersLeftBehind: 2 },
    'un lien d’invitation n’achète pas le droit d’abandonner un crew',
  );
  eq(await crewState(MINE), { actifs: 3, founders: 1 }, 'rien n’a bougé');
});

await t('le compteur d’usages du lien NE MONTE PAS sur ce refus', async () => {
  eq(await inviteUses(), 0, 'un refus n’est pas un recrutement');
});

await t('redeem_crew_invite laisse passer un non-chef, et compte l’usage', async () => {
  await mkInvite();
  eq((await redeem(ROOKIE, TOKEN)).ok, true, 'un rookie rejoint');
  eq(await inviteUses(), 1, 'un vrai recrutement, lui, compte');
  await reset();
});

await t('bad_token / revoked / expired : 0090 est recopiée fidèlement', async () => {
  await mkInvite();
  eq(await redeem(OUTSIDER, 'pas-le-bon'), { ok: false, reason: 'bad_token' }, 'jeton inconnu');
  await db.exec(`update public.crew_invites set revoked_at = now();`);
  eq(await redeem(OUTSIDER, TOKEN), { ok: false, reason: 'revoked' }, 'jeton révoqué');
  // `expires_at > created_at` est un CHECK : on recule les deux, on ne triche pas.
  await db.exec(
    `update public.crew_invites
     set revoked_at = null,
         created_at = now() - interval '3 hours',
         expires_at = now() - interval '1 hour';`,
  );
  eq(await redeem(OUTSIDER, TOKEN), { ok: false, reason: 'expired' }, 'jeton expiré');
});

// ═══ 5. L'ORPHELIN NE PEUT PLUS ÊTRE FABRIQUÉ ══════════════════════════════
await t('APRÈS 0098 : la séquence de l’étape 0, rejouée, laisse le chef en place', async () => {
  await reset();
  eq((await rpc('select public.leave_crew() as r', FOUNDER)).reason, 'must_transfer_lead', 'porte 1');
  eq((await joinByCode(FOUNDER, 'ZZZ999')).reason, 'must_transfer_lead', 'porte 2');
  await mkInvite();
  eq((await redeem(FOUNDER, TOKEN)).reason, 'must_transfer_lead', 'porte 3');
  eq(await crewState(MINE), { actifs: 3, founders: 1 }, 'le crew a toujours son chef');
});

await t('le geste réparateur NOMMÉ par le refus fonctionne vraiment', async () => {
  // Un refus qui ne mène nulle part est un cul-de-sac : on vérifie que le chemin
  // cité (transférer, puis partir) aboutit.
  eq((await rpc(`select public.crew_transfer_lead('${COCAP}'::uuid) as r`, FOUNDER)).ok, true, 'transfert');
  eq((await joinByCode(FOUNDER, 'ZZZ999')).ok, true, 'l’ex-chef peut partir');
  eq(await crewState(MINE), { actifs: 2, founders: 1 }, 'le crew garde UN chef');
  await reset();
});

// ═══ 6. ANTI-PAY-TO-WIN, PAR ABSENCE ═══════════════════════════════════════
await t('aucune des fonctions réécrites ne touche territoire, xp ni foulées', async () => {
  const r = await db.query(
    `select p.proname, pg_get_functiondef(p.oid) as src
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('join_crew_by_code','redeem_crew_invite','crew_members_left_behind')`,
  );
  eq(r.rows.length, 3, 'les trois fonctions existent');
  for (const row of r.rows) {
    for (const forbidden of ['hex_claims', 'territories', 'crews.xp', 'foulees']) {
      ok(
        !row.src.includes(forbidden),
        `${row.proname} ne doit jamais nommer ${forbidden} (trouvé dans son corps)`,
      );
    }
  }
});

// ═══ 7. PRIVILÈGES ═════════════════════════════════════════════════════════
await t('anon n’exécute aucune des deux RPC, et personne n’exécute le helper', async () => {
  const can = async (role, sig) => {
    const r = await db.query(`select has_function_privilege($1, $2, 'execute') as c`, [role, sig]);
    return r.rows[0].c;
  };
  eq(await can('anon', 'public.join_crew_by_code(text)'), false, 'anon / join');
  eq(await can('anon', 'public.redeem_crew_invite(text)'), false, 'anon / redeem');
  eq(await can('authenticated', 'public.join_crew_by_code(text)'), true, 'authenticated / join');
  eq(await can('authenticated', 'public.redeem_crew_invite(text)'), true, 'authenticated / redeem');
  eq(await can('anon', 'public.crew_members_left_behind(uuid)'), false, 'anon / helper');
  eq(
    await can('authenticated', 'public.crew_members_left_behind(uuid)'),
    false,
    'le helper est INTERNE : aucun client ne l’appelle',
  );
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} échec(s) sur ${passed + failures.length} :`);
  for (const f of failures) console.error(`  · ${f.name}\n    ${f.err.message}`);
  process.exit(1);
}
console.log(`${passed} assertions vertes — 0098 ferme la porte de derrière du dernier chef.`);
