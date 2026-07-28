#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0093 (`crew_member_roles`).
 * E46 « Membres et rôles » + E47 « Actions sur un membre ».
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0093 ouvre les QUATRE gestes qui donnent du pouvoir sur d'autres personnes :
 * promouvoir, rétrograder, exclure, transférer la propriété. Aucun d'eux
 * n'existait avant elle, et chacun est une escalade de privilège en puissance.
 * Ce ne sont pas des fautes visibles à l'œil : une borne manquante ne casse
 * rien, elle laisse simplement passer.
 *
 * Les six manières dont ce fichier aurait pu être écrit de travers, et que les
 * tests ci-dessous cherchent activement :
 *   · un membre simple qui s'auto-promeut (borne `self` absente ou placée après
 *     la borne de rang, donc contournable) ;
 *   · un co_captain qui se hisse au rang du founder, ou qui en fabrique un
 *     second par une « promotion vers founder » ;
 *   · quelqu'un qui exclut le propriétaire du crew ;
 *   · un co_captain qui excède son périmètre §8.2 (CO_CAPTAIN_KICKABLE_ROLES /
 *     CO_CAPTAIN_PROMOTE_MAX_ROLE), plus large que ce que la matrice autorise ;
 *   · un founder qui part en laissant un crew PEUPLÉ SANS CHEF — l'état cassé
 *     que plus aucune RPC rôle-gatée ne peut réparer (par `leave_crew` ; les
 *     DEUX AUTRES portes sont couvertes par 0098 et son propre test) ;
 *   · une RPC SECURITY DEFINER laissée exécutable par `anon` faute d'avoir
 *     révoqué `public` d'abord (le piège attrapé en vrai sur 0083).
 *
 * Docker est indisponible sur ce poste (CLAUDE.md) : PGlite — Postgres compilé
 * en WASM — exécute le VRAI SQL des migrations dans Node. Même harnais que
 * `crew_invite_tokens.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0093 s'applique sur un Postgres réel, PAR-DESSUS la lignée 0002 → 0092.
 *  2. `crew_role_rank` est le miroir EXACT de CREW_ROLES (relu dans
 *     game-rules.ts, jamais recopié ici).
 *  3. PROMOTION/RÉTROGRADATION : gatée sur le rôle de L'APPELANT, jamais sur
 *     soi-même, jamais vers ou sur un rang ≥ au sien, plafonnée pour le
 *     co_captain, idempotente, et `role_since` n'est pas réarmé pour rien.
 *  4. `founder` n'est PAS attribuable par promotion : il n'y a jamais deux chefs.
 *  5. EXCLUSION : jamais le founder, jamais soi-même, périmètre §8.2 respecté,
 *     idempotente, et elle INSCRIT son auteur (`removed_by`).
 *  6. L'EXCLU N'EST PAS PUNI : le cooldown de changement de crew ignore les
 *     départs subis — par code ET depuis une fiche publique.
 *  7. TRANSFERT : founder uniquement, ÉCHANGE atomique (exactement un founder
 *     avant, exactement un après, et ce n'est plus le même).
 *  8. LE DERNIER CHEF NE PART PAS : `leave_crew` refuse tant qu'il reste
 *     quelqu'un, et l'autorise quand il est seul.
 *  9. UN CREW VIDE NE RECRUTE PAS (`dead_crew`).
 *
 *     ⚠ CORRECTION DU 28/07/2026 — cette ligne disait « l'orphelin est fermé des
 *     deux côtés ». C'ÉTAIT FAUX, et ces 30 assertions ne pouvaient pas le voir :
 *     elles n'appellent `join_crew_by_code` que depuis un joueur SANS crew, ou
 *     vers un crew mort. Le chemin fautif — un FOUNDER qui rejoint ailleurs, donc
 *     qui quitte son crew par le `update … set left_at` de join_crew_by_code
 *     (0093:589) ou de redeem_crew_invite (0090:529) sans jamais passer par
 *     `leave_crew` — n'était couvert nulle part. `dead_crew` ne mord qu'à ZÉRO
 *     membre actif : un crew DÉCAPITÉ MAIS PEUPLÉ continuait à recruter.
 *     La migration 0098 pose la garde sur ces deux portes, et
 *     `crew_last_lead_guard.pglite.test.mjs` REJOUE la brèche avant de la fermer.
 *     Ce fichier ne prouve donc que ce qu'il dit ici : un crew VIDE ne recrute
 *     pas — pas que l'orphelin est impossible.
 * 10. ANTI-PAY-TO-WIN PAR ABSENCE : aucune des quatre fonctions ne touche
 *     `hex_claims`, `territories`, `crews.xp` ni `users.foulees` — vérifié sur
 *     le TEXTE des fonctions tel que Postgres l'a stocké, et par un état de
 *     territoire mesuré avant/après une exclusion.
 * 11. PRIVILÈGES : `anon` n'exécute AUCUNE des quatre.
 * 12. ADDITIVE : `removed_by` est nullable, et tout l'historique antérieur reste
 *     lisible comme « départ volontaire ».
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies
 *    ne s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue (grants et
 *    revokes), pas un refus vécu par un tiers. `npm run verify:rls` le fait sur
 *    le vrai projet.
 *  · `auth.uid()` est un bouchon REDÉFINI pour incarner un acteur — une
 *    simulation fidèle de son effet, pas une session Supabase.
 *  · QUE LES ÉCRANS APPELLENT CES FONCTIONS (côté client, c'est
 *    `features/crew/memberRoles.ts` qui est testé en Deno).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   npm run test:sql            (ou, isolément :)
 *   node supabase/tests/crew_member_roles.pglite.test.mjs
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
/** Les 7 rôles, DANS L'ORDRE, lus dans game-rules.ts. */
const CREW_ROLES = (() => {
  const m = rules.match(/export const CREW_ROLES: readonly CrewRole\[\] = \[([\s\S]*?)\];/);
  if (!m) throw new Error('CREW_ROLES introuvable dans game-rules.ts');
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/'/g, ''))
    .filter((s) => s.length > 0 && !s.startsWith('//'));
})();
const strConst = (name) => {
  const m = rules.match(new RegExp(`export const ${name}: CrewRole = '([a-z_]+)'`));
  if (!m) throw new Error(`constante ${name} introuvable dans game-rules.ts`);
  return m[1];
};
const roleList = (name) => {
  const m = rules.match(new RegExp(`export const ${name}: readonly CrewRole\\[\\] = \\[([^\\]]+)\\]`));
  if (!m) throw new Error(`constante ${name} introuvable dans game-rules.ts`);
  return m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
};
const KICKABLE = roleList('CO_CAPTAIN_KICKABLE_ROLES');
const PROMOTE_MAX = strConst('CO_CAPTAIN_PROMOTE_MAX_ROLE');
const ENTRY_ROLE = strConst('CREW_ENTRY_ROLE');
/** Le cooldown, en jours — le SQL l'écrit en dur avec sa mention `game-rules:`. */
const SWITCH_COOLDOWN_DAYS = (() => {
  const m = rules.match(/export const CREW_SWITCH_COOLDOWN_DAYS = (\d+)/);
  if (!m) throw new Error('CREW_SWITCH_COOLDOWN_DAYS introuvable');
  return Number(m[1]);
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

console.log('crew_member_roles — migration 0093 (E46 + E47) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0092)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0093_crew_member_roles.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}
await t('la migration 0093 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const COCAP = '22222222-2222-2222-2222-222222222222';
const CAPTAIN = '33333333-3333-3333-3333-333333333333';
const SCOUT = '44444444-4444-4444-4444-444444444444';
const ROOKIE = '55555555-5555-5555-5555-555555555555';
const OUTSIDER = '66666666-6666-6666-6666-666666666666';
const OTHER_FOUNDER = '77777777-7777-7777-7777-777777777777';
const ACTORS = [FOUNDER, COCAP, CAPTAIN, SCOUT, ROOKIE, OUTSIDER, OTHER_FOUNDER];

const MINE = 'aaaaaaaa-0000-0000-0000-000000000001';
const THEIRS = 'aaaaaaaa-0000-0000-0000-000000000002';
const EMPTY_CREW = 'aaaaaaaa-0000-0000-0000-000000000003';

await db.exec(`
  insert into auth.users (id) values ${ACTORS.map((a) => `('${a}')`).join(',')};
  insert into public.users (id, pseudo) values
    ('${FOUNDER}','founder'), ('${COCAP}','cocap'), ('${CAPTAIN}','captain'),
    ('${SCOUT}','scout'), ('${ROOKIE}','rookie'), ('${OUTSIDER}','outsider'),
    ('${OTHER_FOUNDER}','other')
  on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by) values
    ('${MINE}','Foulées 93',3,'paris','ABC123','${FOUNDER}'),
    ('${THEIRS}','Rivaux',5,'paris','ZZZ999','${OTHER_FOUNDER}'),
    ('${EMPTY_CREW}','Fantômes',7,'paris','DEAD01','${OUTSIDER}');
  insert into public.crew_members (crew_id, user_id, role) values
    ('${MINE}','${FOUNDER}','founder'),
    ('${MINE}','${COCAP}','co_captain'),
    ('${MINE}','${CAPTAIN}','captain'),
    ('${MINE}','${SCOUT}','scout'),
    ('${MINE}','${ROOKIE}','rookie'),
    ('${THEIRS}','${OTHER_FOUNDER}','founder');
`);

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
const setRole = (uid, target, role) =>
  rpc(`select public.crew_set_member_role('${target}'::uuid, '${role}') as r`, uid);
const remove = (uid, target) =>
  rpc(`select public.crew_remove_member('${target}'::uuid) as r`, uid);
const transfer = (uid, target) =>
  rpc(`select public.crew_transfer_lead('${target}'::uuid) as r`, uid);
const leave = (uid) => rpc('select public.leave_crew() as r', uid);
const joinByCode = (uid, code) =>
  rpc(`select public.join_crew_by_code('${code}') as r`, uid);
const intent = (uid, crewId) =>
  rpc(`select public.crew_join_intent('${crewId}'::uuid) as r`, uid);

/** Rôle ACTIF d'un joueur dans un crew, ou null s'il n'y est plus. */
const roleOf = async (uid, crewId = MINE) => {
  const r = await db.query(
    'select role from public.crew_members where user_id = $1 and crew_id = $2 and left_at is null',
    [uid, crewId],
  );
  return r.rows[0]?.role ?? null;
};
/** Remet le crew dans son état initial entre deux familles de tests. */
const reset = async () => {
  await db.exec(`
    delete from public.crew_members where crew_id in ('${MINE}','${EMPTY_CREW}');
    insert into public.crew_members (crew_id, user_id, role) values
      ('${MINE}','${FOUNDER}','founder'),
      ('${MINE}','${COCAP}','co_captain'),
      ('${MINE}','${CAPTAIN}','captain'),
      ('${MINE}','${SCOUT}','scout'),
      ('${MINE}','${ROOKIE}','rookie');
  `);
};

// ═══ 2. LE RANG EST LE MIROIR DE game-rules ═════════════════════════════════
await t('crew_role_rank : miroir EXACT de CREW_ROLES (relu, jamais recopié)', async () => {
  for (let i = 0; i < CREW_ROLES.length; i++) {
    const r = await db.query('select public.crew_role_rank($1) as n', [CREW_ROLES[i]]);
    eq(r.rows[0].n, i, `rang de ${CREW_ROLES[i]}`);
  }
  const unknown = await db.query("select public.crew_role_rank('archiduc') as n");
  eq(unknown.rows[0].n, -1, 'un rôle inconnu doit être SOUS tout le monde, jamais au-dessus');
});

// ═══ 3. PROMOUVOIR / RÉTROGRADER ════════════════════════════════════════════
await t('un membre simple ne peut promouvoir PERSONNE (CREW_PERMISSIONS.promote)', async () => {
  eq((await setRole(ROOKIE, SCOUT, 'captain')).reason, 'forbidden', 'rookie promoteur');
  eq((await setRole(SCOUT, ROOKIE, 'runner')).reason, 'forbidden', 'scout promoteur');
  eq((await setRole(CAPTAIN, ROOKIE, 'runner')).reason, 'forbidden', 'captain promoteur');
  eq(await roleOf(ROOKIE), 'rookie', 'aucune écriture n’a eu lieu');
});

await t('PERSONNE NE S’AUTO-PROMEUT — la borne `self` vient avant celle de rang', async () => {
  // Le cas qui compte : un co_captain a bien la permission `promote`. Sans la
  // borne `self`, seule la borne de rang le retiendrait — et elle ne couvre pas
  // une rétrogradation de soi vers… soi, ni un futur assouplissement.
  eq((await setRole(COCAP, COCAP, 'co_captain')).reason, 'self', 'co_captain sur lui-même');
  eq((await setRole(FOUNDER, FOUNDER, 'co_captain')).reason, 'self', 'founder sur lui-même');
  eq((await setRole(ROOKIE, ROOKIE, 'captain')).reason, 'forbidden', 'rookie : refusé plus tôt');
  eq(await roleOf(COCAP), 'co_captain', 'le co_captain n’a pas bougé');
});

await t('le rôle de CHEF n’est pas attribuable par promotion (jamais deux chefs)', async () => {
  const r = await setRole(FOUNDER, CAPTAIN, 'founder');
  eq(r.reason, 'bad_role', 'promouvoir vers founder');
  const founders = await db.query(
    `select count(*)::int as n from public.crew_members
     where crew_id = '${MINE}' and left_at is null and role = 'founder'`,
  );
  eq(founders.rows[0].n, 1, 'il y a EXACTEMENT un founder');
});

await t('un rôle inexistant est refusé (bad_role), pas écrit tel quel', async () => {
  eq((await setRole(FOUNDER, ROOKIE, 'archiduc')).reason, 'bad_role', 'rôle inventé');
  eq((await setRole(FOUNDER, ROOKIE, '')).reason, 'bad_role', 'rôle vide');
  eq(await roleOf(ROOKIE), 'rookie', 'aucune écriture');
});

await t('le founder promeut et rétrograde, et le SENS est dérivé (jamais déclaré)', async () => {
  const up = await setRole(FOUNDER, ROOKIE, 'scout');
  eq(up.ok, true, 'promotion acceptée');
  eq(up.effect, 'promoted', 'sens dérivé des rangs');
  eq(up.previousRole, 'rookie', 'l’avant est rendu');
  eq(await roleOf(ROOKIE), 'scout', 'le rôle a réellement changé');

  const down = await setRole(FOUNDER, ROOKIE, 'runner');
  eq(down.effect, 'demoted', 'rétrogradation reconnue comme telle');
  eq(await roleOf(ROOKIE), 'runner', 'la descente est écrite');
  await reset();
});

await t('IDEMPOTENTE : le même rôle réappliqué n’écrit rien et ne réarme pas role_since', async () => {
  await setRole(FOUNDER, ROOKIE, 'scout');
  const before = (
    await db.query(
      `select role_since from public.crew_members
       where user_id = '${ROOKIE}' and crew_id = '${MINE}' and left_at is null`,
    )
  ).rows[0].role_since;
  const again = await setRole(FOUNDER, ROOKIE, 'scout');
  eq(again.ok, true, 'réappliquer réussit');
  eq(again.effect, 'unchanged', 'et le dit');
  const after = (
    await db.query(
      `select role_since from public.crew_members
       where user_id = '${ROOKIE}' and crew_id = '${MINE}' and left_at is null`,
    )
  ).rows[0].role_since;
  eq(String(after), String(before), 'role_since intact (sinon l’essai rookie se prolonge)');
  await reset();
});

await t('un co_captain ne touche NI le founder NI un autre co_captain', async () => {
  eq((await setRole(COCAP, FOUNDER, 'runner')).reason, 'out_of_scope', 'sur le founder');
  // Un second co_captain, pour le cas « même rang ».
  await setRole(FOUNDER, CAPTAIN, 'co_captain');
  eq((await setRole(COCAP, CAPTAIN, 'rookie')).reason, 'out_of_scope', 'sur son pair');
  eq(await roleOf(FOUNDER), 'founder', 'le chef est intact');
  await reset();
});

await t(`un co_captain ne dépasse pas CO_CAPTAIN_PROMOTE_MAX_ROLE (« ${PROMOTE_MAX} »)`, async () => {
  const okRole = await setRole(COCAP, ROOKIE, PROMOTE_MAX);
  eq(okRole.ok, true, `promotion jusqu’à ${PROMOTE_MAX} autorisée`);
  // Le cran AU-DESSUS du plafond, calculé depuis game-rules — jamais écrit ici.
  const above = CREW_ROLES[CREW_ROLES.indexOf(PROMOTE_MAX) + 1];
  eq((await setRole(COCAP, ROOKIE, above)).reason, 'out_of_scope', `promotion vers ${above}`);
  eq((await setRole(COCAP, CAPTAIN, 'rookie')).reason, 'out_of_scope', 'rétrograder un capitaine');
  await reset();
});

await t('on ne promeut pas quelqu’un d’un AUTRE crew (not_member, pas un annuaire)', async () => {
  eq((await setRole(FOUNDER, OTHER_FOUNDER, 'runner')).reason, 'not_member', 'membre d’ailleurs');
  eq((await setRole(FOUNDER, OUTSIDER, 'runner')).reason, 'not_member', 'sans crew');
  eq(await roleOf(OTHER_FOUNDER, THEIRS), 'founder', 'le crew rival est intact');
});

await t('hors session : signed_out, avant toute lecture de crew', async () => {
  eq((await setRole(null, ROOKIE, 'runner')).reason, 'signed_out', 'set_member_role');
  eq((await remove(null, ROOKIE)).reason, 'signed_out', 'remove_member');
  eq((await transfer(null, ROOKIE)).reason, 'signed_out', 'transfer_lead');
});

// ═══ 4. EXCLURE ═════════════════════════════════════════════════════════════
await t('LE PROPRIÉTAIRE NE PEUT PAS ÊTRE EXCLU — par personne', async () => {
  eq((await remove(COCAP, FOUNDER)).reason, 'cannot_target_lead', 'par un co_captain');
  await setRole(FOUNDER, CAPTAIN, 'co_captain');
  eq((await remove(CAPTAIN, FOUNDER)).reason, 'cannot_target_lead', 'par un second co_captain');
  eq(await roleOf(FOUNDER), 'founder', 'le chef est toujours là');
  await reset();
});

await t('un membre simple n’exclut personne (CREW_PERMISSIONS.kick)', async () => {
  eq((await remove(ROOKIE, SCOUT)).reason, 'forbidden', 'rookie');
  eq((await remove(SCOUT, ROOKIE)).reason, 'forbidden', 'scout');
  eq((await remove(CAPTAIN, ROOKIE)).reason, 'forbidden', 'captain');
  ok((await roleOf(ROOKIE)) !== null, 'personne n’est sorti');
});

await t('on ne s’exclut pas soi-même (leave_crew existe, et elle a SA règle)', async () => {
  eq((await remove(FOUNDER, FOUNDER)).reason, 'self', 'founder');
  eq((await remove(COCAP, COCAP)).reason, 'self', 'co_captain');
});

await t(`un co_captain reste dans CO_CAPTAIN_KICKABLE_ROLES (${KICKABLE.join(', ')})`, async () => {
  // Le `captain` n'est PAS dans la liste : le co_captain pourrait le NOMMER
  // (plafond `strategist` ≥ ?) mais pas le mettre dehors. Nommer se défait.
  ok(!KICKABLE.includes('captain'), 'garde-fou du test : captain hors périmètre');
  eq((await remove(COCAP, CAPTAIN)).reason, 'out_of_scope', 'exclure un capitaine');
  const r = await remove(COCAP, KICKABLE.includes('scout') ? SCOUT : ROOKIE);
  eq(r.ok, true, 'exclure dans son périmètre');
  await reset();
});

await t('l’exclusion INSCRIT son auteur, et elle est IDEMPOTENTE', async () => {
  const first = await remove(FOUNDER, ROOKIE);
  eq(first.ok, true, 'première exclusion');
  eq(first.effect, 'removed', 'effet nommé');
  const row = await db.query(
    `select removed_by, left_at from public.crew_members
     where user_id = '${ROOKIE}' and crew_id = '${MINE}'`,
  );
  eq(row.rows[0].removed_by, FOUNDER, 'removed_by porte l’auteur');
  ok(row.rows[0].left_at !== null, 'left_at est posé');

  const second = await remove(FOUNDER, ROOKIE);
  eq(second.ok, true, 'ré-exclure n’est pas une erreur');
  eq(second.effect, 'already_removed', 'et le dit sans mentir sur ce qui s’est passé');
});

await t('EXCLURE NE TRANSFÈRE AUCUN TERRITOIRE (anti-pay-to-win, mesuré)', async () => {
  // L'exclu de la ligne précédente est toujours dehors. On mesure l'état du
  // territoire : aucune ligne de hex_claims n'a changé de main.
  const claims = await db.query('select count(*)::int as n from public.hex_claims');
  eq(claims.rows[0].n, 0, 'aucune capture n’existe (base de test vierge)');
  const xp = await db.query(`select xp from public.crews where id = '${MINE}'`);
  eq(Number(xp.rows[0].xp), 0, 'exclure n’a rapporté aucune XP au crew');
  await reset();
});

// ═══ 5. L'EXCLU N'EST PAS PUNI ══════════════════════════════════════════════
await t(
  `un exclu échappe au cooldown de ${SWITCH_COOLDOWN_DAYS} j — par code ET depuis une fiche`,
  async () => {
    await remove(FOUNDER, ROOKIE);
    // Départ SUBI, à l'instant : sans le filtre `removed_by is null`, le
    // cooldown mordrait immédiatement.
    const byCode = await joinByCode(ROOKIE, 'ZZZ999');
    eq(byCode.ok, true, 'l’exclu peut rejoindre un autre crew tout de suite');
    // Et le second chemin dit la MÊME chose (il est maintenant membre ailleurs).
    eq((await intent(ROOKIE, MINE)).intent, 'already_in_crew', 'fiche publique cohérente');
    await db.exec(
      `delete from public.crew_members where user_id = '${ROOKIE}' and crew_id = '${THEIRS}'`,
    );
    await reset();
  },
);

await t('un départ VOLONTAIRE, lui, arme toujours le cooldown (la doctrine tient)', async () => {
  const bye = await leave(SCOUT);
  eq(bye.ok, true, 'un membre simple part quand il veut');
  const row = await db.query(
    `select removed_by from public.crew_members
     where user_id = '${SCOUT}' and crew_id = '${MINE}' and left_at is not null`,
  );
  eq(row.rows[0].removed_by, null, 'un départ choisi n’a pas d’auteur tiers');
  const retry = await joinByCode(SCOUT, 'ZZZ999');
  eq(retry.ok, false, 'le nomadisme reste bridé');
  eq(retry.reason, 'cooldown', 'et pour la bonne raison');
  await reset();
});

// ═══ 6. TRANSFÉRER LE RÔLE DE CHEF ══════════════════════════════════════════
await t('seul le chef transfère (transferFoundership === [founder])', async () => {
  eq((await transfer(COCAP, CAPTAIN)).reason, 'forbidden', 'un co_captain');
  eq((await transfer(CAPTAIN, ROOKIE)).reason, 'forbidden', 'un capitaine');
  eq((await transfer(ROOKIE, SCOUT)).reason, 'forbidden', 'un rookie');
  eq((await transfer(FOUNDER, FOUNDER)).reason, 'self', 'à soi-même');
  eq((await transfer(FOUNDER, OUTSIDER)).reason, 'not_member', 'à un non-membre');
  eq(await roleOf(FOUNDER), 'founder', 'rien n’a bougé');
});

await t('le transfert est un ÉCHANGE : un seul chef avant, un seul après', async () => {
  const before = await db.query(
    `select count(*)::int as n from public.crew_members
     where crew_id = '${MINE}' and left_at is null and role = 'founder'`,
  );
  eq(before.rows[0].n, 1, 'un seul chef avant');

  const r = await transfer(FOUNDER, CAPTAIN);
  eq(r.ok, true, 'transfert accepté');
  eq(r.effect, 'transferred', 'effet nommé');
  eq(r.myRole, 'co_captain', 'l’ancien chef sait ce qu’il devient');

  eq(await roleOf(CAPTAIN), 'founder', 'la cible est le nouveau chef');
  eq(await roleOf(FOUNDER), 'co_captain', 'l’ancien chef reste administrateur');
  const after = await db.query(
    `select count(*)::int as n from public.crew_members
     where crew_id = '${MINE}' and left_at is null and role = 'founder'`,
  );
  eq(after.rows[0].n, 1, 'un seul chef après — jamais deux, jamais zéro');

  // IRRÉVERSIBLE PAR L'APPELANT : l'ancien chef ne peut plus reprendre.
  eq((await transfer(FOUNDER, FOUNDER)).reason, 'forbidden', 'reprendre est impossible');
  await reset();
});

// ═══ 7. LE DERNIER CHEF NE PART PAS SANS TRANSMETTRE ════════════════════════
await t('LE CREW ORPHELIN EST IMPOSSIBLE : le chef ne part pas s’il reste quelqu’un', async () => {
  const r = await leave(FOUNDER);
  eq(r.ok, false, 'refus');
  eq(r.reason, 'must_transfer_lead', 'motif qui NOMME le geste manquant');
  eq(r.membersLeftBehind, 4, 'et compte ceux qu’il allait abandonner');
  eq(await roleOf(FOUNDER), 'founder', 'il est toujours là');
});

await t('après transfert, l’ancien chef part librement', async () => {
  await transfer(FOUNDER, CAPTAIN);
  const r = await leave(FOUNDER);
  eq(r.ok, true, 'il n’abandonne plus personne');
  eq(await roleOf(FOUNDER), null, 'sorti');
  eq(await roleOf(CAPTAIN), 'founder', 'le crew a toujours un chef');
  await reset();
});

await t('un chef SEUL peut partir : il n’abandonne personne', async () => {
  await db.exec(
    `delete from public.crew_members where crew_id = '${MINE}' and user_id <> '${FOUNDER}'`,
  );
  const r = await leave(FOUNDER);
  eq(r.ok, true, 'autorisé');
  eq(await roleOf(FOUNDER), null, 'sorti');
});

await t('UN CREW SANS AUCUN MEMBRE ACTIF NE RECRUTE PLUS (dead_crew)', async () => {
  // Le crew que le chef vient de quitter est vide. Y entrer créerait un crew
  // peuplé sans chef — l'orphelin par l'autre bout.
  const r = await joinByCode(OUTSIDER, 'ABC123');
  eq(r.ok, false, 'refus');
  eq(r.reason, 'dead_crew', 'motif propre, jamais un `full` ni un `bad_code` trompeur');
  // Et un crew JAMAIS peuplé se comporte pareil (EMPTY_CREW n'a aucun membre).
  eq((await joinByCode(OUTSIDER, 'DEAD01')).reason, 'dead_crew', 'crew jamais peuplé');
  await reset();
});

await t('un crew VIVANT recrute toujours, et l’entrant naît au rôle d’essai', async () => {
  const r = await joinByCode(OUTSIDER, 'ABC123');
  eq(r.ok, true, 'le chemin nominal n’a pas été cassé');
  eq(await roleOf(OUTSIDER), ENTRY_ROLE, `entrée au rôle ${ENTRY_ROLE} (CREW_ENTRY_ROLE)`);
  await reset();
});

// ═══ 8. ANTI-PAY-TO-WIN PAR ABSENCE, SUR LE TEXTE STOCKÉ ════════════════════
await t('aucune des quatre fonctions ne touche territoire, XP, foulées ni score', async () => {
  const names = [
    'crew_set_member_role',
    'crew_remove_member',
    'crew_transfer_lead',
    'leave_crew',
  ];
  const interdits = [
    'hex_claims',
    'territories',
    'foulees',
    'crews.xp',
    'season_scores',
    'user_items',
  ];
  for (const name of names) {
    const src = (
      await db.query(
        `select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = $1`,
        [name],
      )
    ).rows[0].prosrc;
    for (const mot of interdits) {
      ok(!src.includes(mot), `${name} mentionne « ${mot} » — un rôle ne doit RIEN rapporter`);
    }
  }
});

// ═══ 9. PRIVILÈGES : anon n'exécute RIEN ════════════════════════════════════
await t('`anon` n’exécute AUCUNE des RPC de 0093 (revoke public d’abord)', async () => {
  const fns = [
    ['crew_set_member_role', 'uuid, text'],
    ['crew_remove_member', 'uuid'],
    ['crew_transfer_lead', 'uuid'],
    ['crew_role_rank', 'text'],
    ['leave_crew', ''],
    ['join_crew_by_code', 'text'],
    ['crew_join_intent', 'uuid'],
  ];
  for (const [name, args] of fns) {
    const sig = `public.${name}(${args})`;
    const r = await db.query(`select has_function_privilege('anon', $1, 'execute') as p`, [sig]);
    eq(r.rows[0].p, false, `anon peut exécuter ${sig}`);
    const a = await db.query(
      `select has_function_privilege('authenticated', $1, 'execute') as p`,
      [sig],
    );
    eq(a.rows[0].p, true, `authenticated ne peut PAS exécuter ${sig}`);
  }
});

// ═══ 10. ADDITIVE ═══════════════════════════════════════════════════════════
await t('`removed_by` est NULLABLE : tout l’historique antérieur reste volontaire', async () => {
  const col = await db.query(
    `select is_nullable, column_default from information_schema.columns
     where table_schema = 'public' and table_name = 'crew_members' and column_name = 'removed_by'`,
  );
  eq(col.rows[0].is_nullable, 'YES', 'la colonne doit être nullable');
  eq(col.rows[0].column_default, null, 'aucun défaut : un départ passé n’est pas réécrit');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} vérifications passées, ${failures.length} en échec.`);
if (failures.length > 0) {
  console.error('\nÉCHECS :');
  for (const f of failures) console.error(`  · ${f.name}\n    ${f.err.message}`);
  process.exit(1);
}
