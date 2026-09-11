/**
 * GRYD — 0192 : LA BOÎTE DE RÉCEPTION DEVIENT LISIBLE, ET LE CATALOGUE OPPOSABLE.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL EST REJOUÉ ════════════════════════
 * Avant d'exécuter une ligne de 0192, ce fichier applique le VRAI SQL d'avant —
 * `public.notifications` (0006), son `event_id` (0188), les préférences (0140)
 * et le moteur de budget (0141) — puis les met en situation :
 *   0a. AUCUNE RPC ne lit la boîte : `my_notifications_2026`,
 *       `mark_notifications_read_2026`, `unread_notifications_count_2026` et le
 *       catalogue `notification_kinds_2026` n'existent pas.
 *   0b. `claim_notification_2026` ACCEPTE une sollicitation et n'écrit RIEN
 *       dans `public.notifications` : le joueur ne retrouve nulle part le
 *       message qu'on vient de décider de lui envoyer.
 *   0c. Trois familles manquent à la contrainte `type` : `capture`, `result`,
 *       `event` sont REFUSÉES par la base.
 * Sans cette étape, rien ne distinguerait 0192 d'un no-op.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  1. 0192 s'applique sur un vrai Postgres, tel quel ;
 *  2. le catalogue SQL est le MIROIR EXACT de `NOTIFICATION_EVENTS_2026`
 *     (packages/shared, lu à la source) — 21 faits, emoji compris ;
 *  3. les six faits de crew coïncident avec `crew_notification_event_2026`
 *     (0188) : catégorie, transactionnalité, priorité, préfixe ;
 *  4. la RÈGLE des refus : ce qui entre quand même dans la boîte, ce qui n'y
 *     entre jamais, et ce qui consomme le budget ;
 *  5. la plage calme DIFFÈRE sans perdre : refusée à 22 h, la ligne est là ;
 *  6. une seule ligne par `event_id`, quel que soit le nombre de passages ;
 *  7. la lecture : page, curseur, non-lus, marquage, et le `null` hors session ;
 *  8. les privilèges : `anon` n'appelle rien, le catalogue reste au serveur.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR. On vérifie les
 *    privilèges au catalogue, jamais un refus vécu par un rôle restreint. La
 *    preuve réelle est `npm run verify:rls` après push.
 *  · LES PRODUCTEURS : ils sont en 0193, avec leur propre fichier de test.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/notification_inbox_2026.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const SHARED = join(HERE, '..', '..', 'packages', 'shared', 'src');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite est introuvable. Ce test n’a rien vérifié ;\n' +
      `ne le comptez pas comme vert (sortie 2, jamais 0).\n  cause : ${err.message}`,
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
const ok = (cond, what) => { if (!cond) throw new Error(what); };

const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => (await q(sql, args))[0];
const val = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const as = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid ? `'${uid}'::uuid` : 'null::uuid'
    } $$;`,
  );
};
const exists = async (signature) =>
  await val(`select to_regprocedure('public.${signature}') is not null`);

/** Extrait un morceau CONTIGU d'une migration RÉELLE (jamais une réécriture). */
function slice(file, from, to) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const a = raw.indexOf(from);
  const b = to === null ? raw.length : raw.indexOf(to, a);
  if (a === -1 || (to !== null && b === -1)) {
    console.error(`\nEXTRACTION IMPOSSIBLE dans ${file} — le test ne prouve rien.`);
    process.exit(1);
  }
  return raw.slice(a, b);
}

// ─── Le catalogue TypeScript, LU À LA SOURCE ───────────────────────────────
// Les six faits de crew y sont ÉTALÉS depuis CREW_NOTIFICATION_EVENTS_2026 :
// ce parseur résout l'étalement, sinon il comparerait des trous.
const RULES = readFileSync(join(SHARED, 'game-rules.ts'), 'utf8');
function catalogueTs(nom) {
  const debut = RULES.indexOf(`export const ${nom} = {`);
  if (debut === -1) {
    console.error(`\n${nom} INTROUVABLE dans game-rules.ts — le test ne prouve rien.`);
    process.exit(1);
  }
  const brut = RULES.slice(debut, RULES.indexOf('\n} as const;', debut));
  const sansCommentaires = brut.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const out = {};
  for (const m of sansCommentaires.matchAll(/^ {2}([a-z_]+): \{([\s\S]*?)\n {2}\},$/gm)) {
    out[m[1]] = m[2];
  }
  return out;
}
const CREW_TS = catalogueTs('CREW_NOTIFICATION_EVENTS_2026');
const KINDS_TS_RAW = catalogueTs('NOTIFICATION_EVENTS_2026');
const champ = (corps, nom, motif) => {
  const m = new RegExp(`${nom}: (${motif})`).exec(corps);
  return m === null ? undefined : m[1];
};
const KINDS_TS = {};
for (const [kind, corpsBrut] of Object.entries(KINDS_TS_RAW)) {
  const etale = /\.\.\.CREW_NOTIFICATION_EVENTS_2026\.([a-z_]+)/.exec(corpsBrut);
  const corps = etale === null ? corpsBrut : `${CREW_TS[etale[1]]}\n${corpsBrut}`;
  const lien = champ(corps, 'deepLink', "null|'[^']*'");
  KINDS_TS[kind] = {
    category: champ(corps, 'category', "'[^']*'").slice(1, -1),
    transactional: champ(corps, 'transactional', 'true|false') === 'true',
    priority: Number(champ(corps, 'priority', '\\d+')),
    emoji: champ(corps, 'emoji', "'[^']*'").slice(1, -1),
    family: champ(corps, 'family', "'[^']*'").slice(1, -1),
    eventIdPrefix: champ(corps, 'eventIdPrefix', "'[^']*'").slice(1, -1),
    deepLink: lien === 'null' ? null : lien.slice(1, -1),
  };
}
if (Object.keys(KINDS_TS).length < 20) {
  console.error('\nLE PARSEUR DE CATALOGUE N’A RIEN LU — le test ne prouve rien.');
  process.exit(1);
}

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const CREW = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

try {
  // ─── Socle minimal, aux colonnes des migrations qui créent ces tables ────
  await db.exec(`
    set time zone 'UTC';
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table public.users (id uuid primary key, deletion_requested_at timestamptz);
    create table public.crews (id uuid primary key, name text not null);
  `);
  await db.exec(slice('0119_refonte_2026_progress_ledger.sql',
    'create table public.progress_accounts_2026', ');') + ');');

  // 0006 : la boîte de réception, telle qu'elle est.
  await db.exec(slice('0006_notifications.sql',
    'create table public.notifications (', '-- ─── push_log'));
  await db.exec('alter table public.notifications enable row level security;');
  await db.exec(slice('0006_notifications.sql',
    'revoke insert, update, delete on public.notifications', '-- push_log : interne'));

  // 0188 : `event_id`, son index unique partiel, et le catalogue de crew.
  await db.exec(slice('0188_crew_rules_2026.sql',
    'alter table public.notifications\n  add column if not exists event_id text;',
    'create or replace function public.crew_notification_event_2026'));
  await db.exec(slice('0188_crew_rules_2026.sql',
    'create or replace function public.crew_notification_event_2026',
    '-- ════════════════════════════════════════════════════════════════════════════\n-- 4. LE JOURNAL DES DÉCISIONS'));

  await db.exec(readFileSync(join(MIGRATIONS, '0140_notification_preferences_2026.sql'), 'utf8'));
  await db.exec(readFileSync(join(MIGRATIONS, '0141_notification_engine_2026.sql'), 'utf8'));

  await db.exec(`insert into public.users(id) values ('${A}'), ('${B}');
    insert into public.crews(id, name) values ('${CREW}', 'Les Foulées du Canal');`);

  console.log('\n── ÉTAPE 0 : le défaut existait ──');

  await t('0a — aucune RPC ne lit la boîte de réception', async () => {
    eq(await exists('my_notifications_2026(integer,timestamptz)'), false, 'my_notifications_2026');
    eq(await exists('mark_notifications_read_2026(uuid[])'), false, 'mark_notifications_read_2026');
    eq(await exists('unread_notifications_count_2026()'), false, 'unread_notifications_count_2026');
    eq(await exists('notification_kinds_2026()'), false, 'le catalogue');
  });

  await t('0b — claim_notification_2026 accepte, et n’écrit RIEN dans la boîte', async () => {
    const verdict = await val(
      `select claim_notification_2026($1,'results','referral_completed:zero','2026-09-11T12:00:00Z'::timestamptz)`,
      [A]);
    eq(verdict.allowed, true, 'la sollicitation est accordée');
    eq(verdict.logged, true, 'le budget est consommé');
    eq(Number(await val(`select count(*) from public.notifications where user_id=$1`, [A])), 0,
      'AUCUNE ligne de réception : le message décidé n’arrive nulle part');
  });

  await t('0c — les familles capture / result / event sont REFUSÉES par la base', async () => {
    for (const famille of ['capture', 'result', 'event']) {
      let refuse = false;
      try {
        await db.query(
          `insert into public.notifications(user_id,type,priority,payload) values ($1,$2,3,'{}')`,
          [A, famille]);
      } catch { refuse = true; }
      ok(refuse, `la contrainte type accepte déjà « ${famille} » — l’étape 0 est fausse`);
    }
  });

  // ─── 0192 ────────────────────────────────────────────────────────────────
  await db.exec(readFileSync(join(MIGRATIONS, '0192_notification_inbox_2026.sql'), 'utf8'));
  await db.exec(`delete from public.notification_log_2026;`);

  // ─── 0197 : LA LIGNÉE, ET NON UNE RÉÉCRITURE (12/09/2026) ────────────────
  // 0197 ajoute le fait `run_sport_only` au catalogue par un `create or
  // replace`. Sans cette ligne, le miroir ci-dessous comparerait le catalogue
  // TypeScript d'AUJOURD'HUI à la base de 0192 et rougirait pour une raison qui
  // n'est pas un défaut — c'est exactement ce qui est arrivé le jour où le fait
  // a été ajouté. Seule la fonction de CATALOGUE est rejouée ici : le reste de
  // 0197 (la colonne de `runs`, les gardes d'admission, le producteur) a son
  // propre fichier, `sport_only_runs_2026.pglite.test.mjs`.
  await db.exec(slice('0197_sport_only_runs_2026.sql',
    'create or replace function public.notification_kinds_2026()',
    'create function public.notify_run_sport_only_2026()'));

  console.log('\n── LE CATALOGUE ──');

  await t('le catalogue SQL est le miroir EXACT de NOTIFICATION_EVENTS_2026', async () => {
    const rows = await q(`select * from public.notification_kinds_2026() order by kind`);
    eq(rows.map((r) => r.kind).sort(), Object.keys(KINDS_TS).sort(), 'la liste des faits');
    for (const row of rows) {
      const attendu = KINDS_TS[row.kind];
      eq({
        category: row.category,
        transactional: row.transactional,
        priority: Number(row.priority),
        emoji: row.emoji,
        family: row.family,
        eventIdPrefix: row.event_id_prefix,
        deepLink: row.deep_link,
      }, attendu, `le fait « ${row.kind} »`);
    }
  });

  await t('les six faits de crew coïncident avec crew_notification_event_2026 (0188)', async () => {
    for (const kind of Object.keys(CREW_TS)) {
      const zero = await val(`select crew_notification_event_2026($1)`, [kind]);
      ok(zero !== null, `${kind} absent du catalogue de 0188`);
      const mien = await val(`select notification_kind_2026($1)`, [kind]);
      eq(mien.transactional, zero.transactional, `${kind} : transactionnalité`);
      eq(Number(mien.priority), Number(zero.priority), `${kind} : priorité`);
      eq(mien.eventIdPrefix, zero.prefix, `${kind} : préfixe d’identifiant`);
      eq(mien.category, 'crew', `${kind} : catégorie`);
    }
  });

  await t('chaque famille du catalogue est acceptée par la contrainte type', async () => {
    const familles = await q(`select distinct family from public.notification_kinds_2026()`);
    for (const { family } of familles) {
      await db.query(
        `insert into public.notifications(user_id,type,priority,payload) values ($1,$2,3,'{}')`,
        [B, family]);
    }
    await db.query(`delete from public.notifications where user_id=$1`, [B]);
  });

  await t('un fait hors catalogue LÈVE plutôt que d’écrire une ligne muette', async () => {
    let leve = false;
    try { await db.query(`select notification_inbox_write_2026($1,'inconnu','x')`, [A]); }
    catch { leve = true; }
    ok(leve, 'notification_inbox_write_2026 a accepté un fait hors catalogue');
  });

  await t('le lien profond se résout, ou rend null plutôt qu’un modèle littéral', async () => {
    eq(await val(`select notification_deep_link_2026('capture_published', '{"runId":"r-9"}'::jsonb)`),
      '/course/r-9', 'le modèle est rempli');
    eq(await val(`select notification_deep_link_2026('capture_published', '{}'::jsonb)`),
      null, 'sans runId, aucun lien — jamais « /course/{runId} »');
    eq(await val(`select notification_deep_link_2026('removed', '{}'::jsonb)`),
      null, 'un fait sans lien n’en invente pas');
    eq(await val(`select notification_deep_link_2026('crew_joined', '{}'::jsonb)`),
      '/crew', 'un lien sans variable se résout toujours');
  });

  console.log('\n── LA RÈGLE DES REFUS ──');

  const claim = async (user, category, eventId, at, extra = '') =>
    await val(`select claim_notification_2026($1,$2,$3,$4::timestamptz${extra})`,
      [user, category, eventId, at]);
  const inbox = async (user) =>
    await q(`select event_id, type, priority, payload, read_at from public.notifications
              where user_id=$1 order by created_at, event_id`, [user]);

  await t('accepté : une ligne de réception ET le budget consommé', async () => {
    const v = await claim(A, 'results', 'referral_completed:lien-1', '2026-09-11T12:00:00Z');
    eq(v.allowed, true, 'accordé');
    eq(v.logged, true, 'budget consommé');
    eq(v.inboxed, true, 'ligne écrite');
    const rows = await inbox(A);
    eq(rows.length, 1, 'une ligne');
    eq(rows[0].type, 'reward', 'la famille vient du catalogue');
    eq(rows[0].payload.event, 'referral_completed', 'le FAIT est écrit, pas une phrase');
    ok(rows[0].payload.title === undefined, 'aucune phrase en base');
  });

  await t('plage calme : la sollicitation est refusée, la ligne est LÀ', async () => {
    const v = await claim(B, 'results', 'referral_completed:lien-2', '2026-09-11T22:30:00Z');
    eq(v.allowed, false, 'refusé');
    eq(v.reason, 'quiet_hours', 'et refusé pour la plage calme');
    eq(v.logged, false, 'le budget reste INTACT');
    eq(v.inboxed, true, 'la ligne existe quand même');
    eq(Number(await val(
      `select count(*) from public.notification_log_2026 where user_id=$1`, [B])), 0,
      'aucune sollicitation consommée');
  });

  await t('budget épuisé : la ligne est là, la sollicitation non', async () => {
    // La première a consommé le quota du jour pour A (1/jour).
    const v = await claim(A, 'results', 'referral_completed:lien-3', '2026-09-11T13:00:00Z');
    eq(v.reason, 'daily_budget', 'le budget quotidien refuse');
    eq(v.logged, false, 'rien n’est consommé');
    eq(v.inboxed, true, 'et pourtant le joueur le retrouvera');
  });

  await t('catégorie coupée : le réglage fait taire, il n’efface pas l’histoire', async () => {
    await db.query(`insert into public.notification_preferences_2026(user_id, notify_results)
                    values ($1,false)`, [B]);
    const v = await claim(B, 'results', 'referral_completed:lien-4', '2026-09-11T12:00:00Z');
    eq(v.reason, 'category_off', 'la catégorie refuse');
    eq(v.logged, false, 'aucune sollicitation');
    eq(v.inboxed, true, 'la ligne reste consultable');
  });

  await t('événement devenu faux ou auteur bloqué : AUCUNE ligne', async () => {
    const faux = await val(
      `select claim_notification_2026($1,'results','referral_completed:faux',
        '2026-09-11T12:00:00Z'::timestamptz,false,false,false,false)`, [A]);
    eq(faux.reason, 'event_invalid', 'refus nommé');
    eq(faux.inboxed, false, 'un message devenu faux n’entre pas dans la boîte');
    const bloque = await val(
      `select claim_notification_2026($1,'results','referral_completed:bloque',
        '2026-09-11T12:00:00Z'::timestamptz,false,false,true,true)`, [A]);
    eq(bloque.reason, 'blocked', 'refus nommé');
    eq(bloque.inboxed, false, 'jamais si auteur bloqué (§14.3)');
  });

  await t('une seule ligne par event_id, quel que soit le nombre de passages', async () => {
    const avant = (await inbox(A)).length;
    for (let i = 0; i < 3; i += 1) {
      await claim(A, 'results', 'referral_completed:lien-1', '2026-09-11T14:00:00Z');
    }
    eq((await inbox(A)).length, avant, 'aucune ligne ajoutée');
  });

  await t('un fait hors catalogue n’écrit pas de ligne, mais la décision reste rendue', async () => {
    const v = await claim(A, 'weekly', 'digest_hebdo:2026-W37', '2026-09-13T10:00:00Z');
    ok(v.allowed === true || v.allowed === false, 'un verdict est rendu');
    eq(v.inboxed, false, 'aucune ligne : ce préfixe n’a ni emoji ni texte');
  });

  console.log('\n── LA LECTURE ──');

  await t('hors session : null, jamais une liste vide', async () => {
    await as(null);
    eq(await val(`select my_notifications_2026()`), null, 'my_notifications_2026');
    eq(await val(`select unread_notifications_count_2026()`), null, 'le compteur');
  });

  await t('la page rend les faits, l’emoji du catalogue et aucun texte', async () => {
    await as(A);
    const page = await val(`select my_notifications_2026()`);
    eq(page.hasAccount, true, 'hasAccount');
    // Deux lignes exactement : `lien-1` (accordée) et `lien-3` (budget épuisé).
    // `faux`, `bloqué` et le préfixe hors catalogue n'en ont produit aucune.
    eq(page.items.length, 2, 'deux lignes, et ce sont les bonnes');
    const ligne = page.items.find((i) => i.kind === 'referral_completed');
    eq(ligne.emoji, KINDS_TS.referral_completed.emoji, 'l’emoji vient du catalogue');
    eq(ligne.deepLink, '/parrainage', 'le lien est résolu');
    eq(ligne.title, null, 'aucun titre en base : l’app le dit dans la langue du lecteur');
    eq(page.unread, page.items.length, 'tout est non lu');
  });

  await t('une ligne d’AVANT ce lot garde son texte et reçoit un emoji de famille', async () => {
    await db.query(`insert into public.notifications(user_id,type,priority,payload)
      values ($1,'digest',4,'{"title":"Ta semaine","body":"Deux sorties."}'::jsonb)`, [A]);
    await as(A);
    const page = await val(`select my_notifications_2026()`);
    const legacy = page.items.find((i) => i.title === 'Ta semaine');
    ok(legacy !== undefined, 'la ligne héritée est servie');
    eq(legacy.kind, null, 'elle n’a pas de fait de catalogue');
    eq(legacy.emoji, '📊', 'et reçoit l’emoji de sa famille');
    eq(legacy.body, 'Deux sorties.', 'son texte figé est rendu tel quel');
  });

  await t('une ligne sans fait NI texte n’est ni servie ni comptée', async () => {
    await db.query(`insert into public.notifications(user_id,type,priority,payload)
      values ($1,'system',6,'{"foo":"bar"}'::jsonb)`, [A]);
    await as(A);
    const page = await val(`select my_notifications_2026()`);
    eq(page.items.filter((i) => i.kind === null && i.title === null).length, 0,
      'aucune ligne muette servie');
    eq(page.unread, page.items.length,
      'le compteur ne promet jamais un non-lu introuvable dans la liste');
  });

  await t('le curseur pagine sans sauter ni répéter', async () => {
    await as(A);
    const p1 = await val(`select my_notifications_2026(1)`);
    eq(p1.items.length, 1, 'une ligne');
    eq(p1.hasMore, true, 'il en reste');
    const p2 = await val(`select my_notifications_2026(2, $1::timestamptz)`,
      [p1.items[0].createdAt]);
    const chevauchement = p2.items.filter((i) => p1.items.some((j) => j.id === i.id));
    eq(chevauchement.length, 0, 'aucune ligne servie deux fois');
  });

  await t('marquer lu : ciblé, puis tout — et le compteur tombe à zéro', async () => {
    await as(A);
    const page = await val(`select my_notifications_2026()`);
    const cible = page.items[0].id;
    eq(await val(`select mark_notifications_read_2026(array[$1]::uuid[])`, [cible]), 1,
      'une seule ligne marquée');
    eq(await val(`select unread_notifications_count_2026()`), page.unread - 1, 'le compteur baisse');
    const reste = await val(`select mark_notifications_read_2026()`);
    eq(reste, page.unread - 1, 'le reste est marqué en un geste');
    eq(await val(`select unread_notifications_count_2026()`), 0, 'plus aucun non-lu');
  });

  await t('marquer lu ne réécrit jamais une date de lecture déjà posée', async () => {
    await as(A);
    const avant = await val(`select min(read_at) from public.notifications where user_id=$1`, [A]);
    eq(await val(`select mark_notifications_read_2026()`), 0, 'rien à marquer');
    eq(String(await val(`select min(read_at) from public.notifications where user_id=$1`, [A])),
      String(avant), 'la première lecture reste la première');
  });

  await t('la boîte d’un compte n’est jamais celle d’un autre', async () => {
    await as(B);
    const page = await val(`select my_notifications_2026()`);
    ok(page.items.every((i) => i.kind !== null || i.title !== null), 'lignes lisibles');
    eq(page.items.some((i) => i.title === 'Ta semaine'), false, 'aucune ligne du compte A');
  });

  console.log('\n── PRIVILÈGES ──');

  await t('anon n’appelle rien, et le catalogue reste au serveur', async () => {
    const interdit = async (signature, role) => await val(
      `select has_function_privilege($1, 'public.${signature}', 'execute')`, [role]);
    for (const s of ['my_notifications_2026(integer,timestamptz)',
      'mark_notifications_read_2026(uuid[])', 'unread_notifications_count_2026()']) {
      eq(await interdit(s, 'anon'), false, `anon peut appeler ${s}`);
      eq(await interdit(s, 'authenticated'), true, `authenticated ne peut pas appeler ${s}`);
    }
    for (const s of ['notification_kinds_2026()',
      'notification_inbox_write_2026(uuid,text,text,jsonb,timestamptz)']) {
      eq(await interdit(s, 'authenticated'), false, `authenticated peut appeler ${s}`);
      eq(await interdit(s, 'service_role'), true, `service_role ne peut pas appeler ${s}`);
    }
  });

  console.log('');
  if (failures.length > 0) {
    console.error(`${failures.length} échec(s) sur ${passed + failures.length}.`);
    for (const f of failures) console.error(`  ${f.name}\n    ${f.err.stack ?? f.err.message}`);
    process.exit(1);
  }
  console.log(`${passed} vérifications vertes.`);
} catch (err) {
  console.error(`\nERREUR FATALE — le test n’a pas pu tourner :\n  ${err.stack ?? err.message}`);
  process.exit(1);
} finally {
  await db.close();
}
