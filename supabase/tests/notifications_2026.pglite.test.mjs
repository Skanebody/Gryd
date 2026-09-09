// GRYD — 0140/0141 : la politique de notification §14 devient opposable.
//
// PGlite tourne en SUPERUTILISATEUR : ce fichier prouve le SQL (existence des
// fonctions, domaines refusés, colonnes réellement écrites, privilèges posés,
// et surtout la DÉCISION de `can_notify_2026`), jamais l'EFFET d'une policy sur
// un rôle restreint.
//
// Les scénarios de refus sont EXACTEMENT ceux du miroir client
// (`apps/mobile/src/features/notifications/notifications2026.test.ts`) :
// quatrième sollicitation de la semaine, 21 h 30, promo sans opt-in, doublon.
// Deux moteurs, une seule table de vérité.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const as = async (n, fn) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : id(n)]);
  return await fn();
};
const test = async (name, fn) => {
  await fn();
  console.log(`ok ${++passed} - ${name}`);
};
const fn = (signature) => `to_regprocedure('public.${signature}') is not null`;

const CAN_NOTIFY = 'can_notify_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean)';
const CLAIM = 'claim_notification_2026(uuid,text,text,timestamptz,boolean,boolean,boolean,boolean)';

/** Le cahier, lu dans la SOURCE — jamais recopié ici. */
const gameRules = readFileSync(
  new URL('../../packages/shared/src/game-rules.ts', import.meta.url),
  'utf8',
);
const rulesBlock = gameRules.slice(
  gameRules.indexOf('export const NOTIFICATION_RULES_2026'),
  gameRules.indexOf('} as const;', gameRules.indexOf('export const NOTIFICATION_RULES_2026')),
);
const ruleNumber = (key) => Number(/(-?\d+)/.exec(rulesBlock.split(`${key}:`)[1])[1]);

const decide = async (args) => {
  const {
    user = 1,
    category = 'sport',
    eventId = 'e1',
    at = '2026-09-10T12:00:00Z',
    transactional = false,
    activity = false,
    blocked = false,
    valid = true,
  } = args ?? {};
  return await one(`select can_notify_2026($1,$2,$3,$4::timestamptz,$5,$6,$7,$8)`, [
    id(user), category, eventId, at, transactional, activity, blocked, valid,
  ]);
};

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,service_role;
    create table public.users(id uuid primary key, deletion_requested_at timestamptz);`);

  // La table de progression, avec SON vrai défaut de fuseau (0119) : c'est elle
  // qui décide la plage calme, et un fuseau inventé ici prouverait une plage
  // calme inventée.
  const ledger0119 = readFileSync(
    new URL('../migrations/0119_refonte_2026_progress_ledger.sql', import.meta.url),
    'utf8',
  );
  await db.exec(
    ledger0119.slice(
      ledger0119.indexOf('create table public.progress_accounts_2026'),
      ledger0119.indexOf(');', ledger0119.indexOf('create table public.progress_accounts_2026')) + 2,
    ),
  );

  // ── ÉTAPE 0 : LE DÉFAUT EXISTAIT ─────────────────────────────────────────
  await test('étape 0 — aucune RPC ne lit ni n’écrit une préférence de notification', async () => {
    assert.equal(await one(`select ${fn('my_notification_settings_2026()')}`), false);
    assert.equal(await one(`select ${fn('save_notification_settings_2026(jsonb)')}`), false);
    assert.equal(await one(`select ${fn(CAN_NOTIFY)}`), false);
    assert.equal(await one(`select ${fn(CLAIM)}`), false);
  });

  await test('étape 0 — la SEULE préférence serveur qui existait nommait les canaux ABOLIS', async () => {
    // `push_devices.notif_channels` (0048) contraint les canaux à
    // solo|crew|competition|off : `solo` était le canal du decay et
    // `competition` celui du vol de zone — les deux mécaniques supprimées par
    // §5.3 et §14.2. C'est le défaut que 0140 remplace, pas complète.
    const push0048 = readFileSync(new URL('../migrations/0048_push_devices.sql', import.meta.url), 'utf8');
    assert.ok(push0048.includes("array['solo', 'crew', 'competition', 'off']"));
    assert.ok(!push0048.includes('results'));
    assert.ok(!push0048.includes('weekly'));
  });

  // ── LES MIGRATIONS ───────────────────────────────────────────────────────
  await db.exec(readFileSync(new URL('../migrations/0140_notification_preferences_2026.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../migrations/0141_notification_engine_2026.sql', import.meta.url), 'utf8'));

  await test('les six catégories SQL sont EXACTEMENT celles de NOTIFICATION_RULES_2026', async () => {
    const sql = await one('select notification_categories_2026()');
    const ts = /categories:\s*\[([^\]]+)\]/
      .exec(rulesBlock)[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);
    assert.deepEqual(sql, ts);
  });

  await test('les nombres du moteur SQL sont ceux du cahier, pas d’autres', async () => {
    const def = await one(`select pg_get_functiondef('${CAN_NOTIFY}'::regprocedure)`);
    assert.equal(ruleNumber('maximumNonTransactionalPerDay'), 1);
    assert.equal(ruleNumber('maximumNonTransactionalPerWeek'), 3);
    assert.equal(ruleNumber('maximumOffersPerMonth'), 2);
    assert.equal(ruleNumber('quietHoursStart'), 21);
    assert.equal(ruleNumber('quietHoursEnd'), 9);
    assert.ok(def.includes(`v_day >= ${ruleNumber('maximumNonTransactionalPerDay')}`));
    assert.ok(def.includes(`v_week >= ${ruleNumber('maximumNonTransactionalPerWeek')}`));
    assert.ok(def.includes(`v_offers >= ${ruleNumber('maximumOffersPerMonth')}`));
    const table = await one(`select pg_get_expr(d.adbin,d.adrelid) from pg_attrdef d
      join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum
      where d.adrelid='public.notification_preferences_2026'::regclass and a.attname='quiet_start_hour'`);
    assert.equal(Number(table), ruleNumber('quietHoursStart'));
  });

  await test('promotion DÉSACTIVÉE par défaut, les cinq autres activées', async () => {
    const row = (await q(`select column_name, column_default from information_schema.columns
      where table_name='notification_preferences_2026' and column_name like 'notify_%'
      order by column_name`))
      .map((r) => [r.column_name, r.column_default]);
    assert.deepEqual(Object.fromEntries(row), {
      notify_crew: 'true', notify_events: 'true', notify_offers: 'false',
      notify_results: 'true', notify_sport: 'true', notify_weekly: 'true',
    });
  });

  await test('privilèges : rien pour public/anon, la décision reste service_role', async () => {
    for (const f of ['my_notification_settings_2026()', 'save_notification_settings_2026(jsonb)']) {
      assert.equal(await one(`select has_function_privilege('anon','public.${f}','execute')`), false);
      assert.equal(await one(`select has_function_privilege('authenticated','public.${f}','execute')`), true);
    }
    for (const f of [CAN_NOTIFY, CLAIM]) {
      assert.equal(await one(`select has_function_privilege('anon','public.${f}','execute')`), false);
      assert.equal(await one(`select has_function_privilege('authenticated','public.${f}','execute')`), false);
      assert.equal(await one(`select has_function_privilege('service_role','public.${f}','execute')`), true);
    }
    for (const t of ['notification_preferences_2026', 'notification_log_2026']) {
      assert.equal(await one(`select relrowsecurity from pg_class where oid='public.${t}'::regclass`), true);
      for (const role of ['anon', 'authenticated']) {
        assert.equal(await one(`select has_table_privilege('${role}','public.${t}','select')`), false);
        assert.equal(await one(`select has_table_privilege('${role}','public.${t}','insert')`), false);
      }
    }
  });

  // ── LECTURE ET ÉCRITURE ──────────────────────────────────────────────────
  await db.query('insert into public.users(id) values($1),($2)', [id(1), id(2)]);

  await test('hors session : lecture NULL, écriture refusée', async () => {
    assert.equal(await as(null, () => one('select my_notification_settings_2026()')), null);
    await assert.rejects(
      () => as(null, () => one(`select save_notification_settings_2026('{"sport":false}'::jsonb)`)),
      /authentication_required/,
    );
  });

  await test('lecture sans choix : hasSettings=false, défauts rendus, AUCUNE ligne créée', async () => {
    const read = await as(1, () => one('select my_notification_settings_2026()'));
    assert.equal(read.hasSettings, false);
    assert.equal(read.offers, false);
    assert.equal(read.sport, true);
    assert.equal(read.quietStartHour, 21);
    assert.equal(read.quietEndHour, 9);
    assert.equal(await one('select count(*)::int from public.notification_preferences_2026'), 0);
  });

  await test('écriture partielle : une clé change, les autres ne bougent pas', async () => {
    const after = await as(1, () => one(`select save_notification_settings_2026('{"offers":true}'::jsonb)`));
    assert.equal(after.offers, true);
    assert.equal(after.hasSettings, true);
    assert.equal(after.sport, true);
    assert.equal(after.weekly, true);
    const again = await as(1, () => one(`select save_notification_settings_2026('{"weekly":false}'::jsonb)`));
    assert.equal(again.offers, true, 'la clé absente a été écrasée');
    assert.equal(again.weekly, false);
  });

  await test('clé inconnue ignorée, heure hors domaine REFUSÉE', async () => {
    const ok = await as(1, () => one(`select save_notification_settings_2026('{"defense":true}'::jsonb)`));
    assert.equal(ok.hasSettings, true);
    await assert.rejects(
      () => as(1, () => one(`select save_notification_settings_2026('{"quietStartHour":25}'::jsonb)`)),
      /invalid_notification_settings/,
    );
    await assert.rejects(
      () => as(1, () => one(`select save_notification_settings_2026('{"quietEndHour":"tard"}'::jsonb)`)),
      /invalid_notification_settings/,
    );
    // …et le refus n'a rien écrit à moitié.
    assert.equal((await as(1, () => one('select my_notification_settings_2026()'))).quietStartHour, 21);
  });

  await test('un compte en cours de suppression n’enregistre plus de réglage', async () => {
    await db.query('update public.users set deletion_requested_at=now() where id=$1', [id(2)]);
    await assert.rejects(
      () => as(2, () => one(`select save_notification_settings_2026('{"sport":false}'::jsonb)`)),
      /account_unavailable/,
    );
    await db.query('update public.users set deletion_requested_at=null where id=$1', [id(2)]);
  });

  // ── LE MOTEUR §14.3 ──────────────────────────────────────────────────────
  await db.query('delete from public.notification_preferences_2026');
  await db.query('insert into public.progress_accounts_2026(user_id) values($1)', [id(1)]);

  await test('sans aucun réglage enregistré : les défauts du cahier s’appliquent', async () => {
    assert.deepEqual(await decide({ category: 'sport', eventId: 'a1' }), { allowed: true, reason: null });
    assert.deepEqual(await decide({ category: 'offers', eventId: 'a2' }),
      { allowed: false, reason: 'category_off' });
  });

  await test('4ᵉ sollicitation de la semaine : REFUSÉE (et la 3ᵉ passait)', async () => {
    await db.query(`insert into public.notification_log_2026(user_id,category,event_id,sent_at)
      values ($1,'sport','w1',$2),($1,'sport','w2',$3)`,
      [id(1), '2026-09-05T12:00:00Z', '2026-09-06T12:00:00Z']);
    assert.deepEqual(await decide({ eventId: 'w3' }), { allowed: true, reason: null });
    await db.query(`insert into public.notification_log_2026(user_id,category,event_id,sent_at)
      values ($1,'sport','w3',$2)`, [id(1), '2026-09-07T12:00:00Z']);
    assert.deepEqual(await decide({ eventId: 'w4' }), { allowed: false, reason: 'weekly_budget' });
  });

  await test('2ᵉ du même jour : REFUSÉE (budget quotidien = 1)', async () => {
    await db.query('delete from public.notification_log_2026');
    await db.query(`insert into public.notification_log_2026(user_id,category,event_id,sent_at)
      values ($1,'sport','d1',$2)`, [id(1), '2026-09-10T09:30:00Z']);
    assert.deepEqual(await decide({ eventId: 'd2' }), { allowed: false, reason: 'daily_budget' });
  });

  await test('21 h 30 locale : REFUSÉE — 9 h passe, 8 h 59 non', async () => {
    await db.query('delete from public.notification_log_2026');
    // Europe/Paris en septembre = UTC+2 : 19:30Z = 21:30 locale.
    assert.deepEqual(await decide({ eventId: 'q1', at: '2026-09-10T19:30:00Z' }),
      { allowed: false, reason: 'quiet_hours' });
    assert.deepEqual(await decide({ eventId: 'q2', at: '2026-09-10T06:59:00Z' }),
      { allowed: false, reason: 'quiet_hours' });
    assert.deepEqual(await decide({ eventId: 'q3', at: '2026-09-10T07:00:00Z' }),
      { allowed: true, reason: null });
  });

  await test('la plage calme suit le FUSEAU DU COMPTE, pas celui du serveur', async () => {
    await db.query("update public.progress_accounts_2026 set initial_timezone='Pacific/Auckland' where user_id=$1", [id(1)]);
    // 07:00Z = 19:00 à Auckland (UTC+12) : autorisé là-bas, autorisé à Paris aussi.
    // 19:30Z = 07:30 le lendemain à Auckland : DANS la plage calme locale, alors
    // qu'à Paris c'était 21 h 30 — deux refus pour deux raisons différentes, et
    // c'est bien le fuseau du compte qui décide.
    assert.deepEqual(await decide({ eventId: 'tz1', at: '2026-09-10T19:30:00Z' }),
      { allowed: false, reason: 'quiet_hours' });
    assert.deepEqual(await decide({ eventId: 'tz2', at: '2026-09-10T02:00:00Z' }),
      { allowed: true, reason: null });
    await db.query("update public.progress_accounts_2026 set initial_timezone='Europe/Paris' where user_id=$1", [id(1)]);
  });

  await test('un fuseau illisible ne tue pas le job : repli Europe/Paris', async () => {
    await db.query("update public.progress_accounts_2026 set initial_timezone='Mars/Olympus' where user_id=$1", [id(1)]);
    assert.equal(await one('select account_local_hour_2026($1,$2::timestamptz)', [id(1), '2026-09-10T12:00:00Z']), 14);
    await db.query("update public.progress_accounts_2026 set initial_timezone='Europe/Paris' where user_id=$1", [id(1)]);
  });

  await test('promo sans opt-in : REFUSÉE — et la raison dit « catégorie », pas « budget »', async () => {
    await db.query('delete from public.notification_log_2026');
    assert.deepEqual(await decide({ category: 'offers', eventId: 'p1' }),
      { allowed: false, reason: 'category_off' });
    await as(1, () => one(`select save_notification_settings_2026('{"offers":true}'::jsonb)`));
    assert.deepEqual(await decide({ category: 'offers', eventId: 'p2' }), { allowed: true, reason: null });
  });

  await test('offres : deux par mois au maximum', async () => {
    await db.query(`insert into public.notification_log_2026(user_id,category,event_id,sent_at)
      values ($1,'offers','o1',$2),($1,'offers','o2',$3)`,
      [id(1), '2026-08-20T12:00:00Z', '2026-08-28T12:00:00Z']);
    assert.deepEqual(await decide({ category: 'offers', eventId: 'o3' }),
      { allowed: false, reason: 'monthly_offer_budget' });
    await db.query('delete from public.notification_log_2026');
  });

  await test('doublon : le même identifiant d’événement ne repasse jamais', async () => {
    await db.query(`insert into public.notification_log_2026(user_id,category,event_id,sent_at)
      values ($1,'results','result:42',$2)`, [id(1), '2026-09-10T11:00:00Z']);
    assert.deepEqual(await decide({ category: 'results', eventId: 'result:42' }),
      { allowed: false, reason: 'duplicate' });
    // …y compris pour un transactionnel.
    assert.deepEqual(await decide({ category: 'results', eventId: 'result:42', transactional: true }),
      { allowed: false, reason: 'duplicate' });
    // …et la contrainte le tient même si un appelant insistait.
    await assert.rejects(
      () => db.query(`insert into public.notification_log_2026(user_id,category,event_id) values ($1,'results','result:42')`, [id(1)]),
      /duplicate key|unique/i,
    );
    await db.query('delete from public.notification_log_2026');
  });

  await test('transactionnel : hors budget et hors plage calme, jamais hors dédup', async () => {
    await db.query(`insert into public.notification_log_2026(user_id,category,event_id,sent_at)
      values ($1,'sport','t1',$2),($1,'sport','t2',$3),($1,'sport','t3',$4)`,
      [id(1), '2026-09-08T12:00:00Z', '2026-09-09T12:00:00Z', '2026-09-10T10:00:00Z']);
    assert.deepEqual(
      await decide({ category: 'events', eventId: 'cancel:9', at: '2026-09-10T19:30:00Z', transactional: true }),
      { allowed: true, reason: null },
    );
    await db.query('delete from public.notification_log_2026');
  });

  await test('« Pause du jeu » coupe la rétention et CONSERVE crew, événements, résultats', async () => {
    await as(1, () => one(`select save_notification_settings_2026('{"gamePause":true}'::jsonb)`));
    for (const c of ['sport', 'weekly', 'offers']) {
      assert.deepEqual(await decide({ category: c, eventId: `gp-${c}` }),
        { allowed: false, reason: 'game_paused' }, `${c} devrait être coupée`);
    }
    for (const c of ['crew', 'events', 'results']) {
      assert.deepEqual(await decide({ category: c, eventId: `gp-${c}` }),
        { allowed: true, reason: null }, `${c} ne doit PAS être coupée par la pause`);
    }
    await as(1, () => one(`select save_notification_settings_2026('{"gamePause":false}'::jsonb)`));
  });

  await test('activité en cours, blocage, événement devenu faux : trois refus distincts', async () => {
    assert.deepEqual(await decide({ eventId: 'c1', activity: true }),
      { allowed: false, reason: 'activity_in_progress' });
    assert.deepEqual(await decide({ eventId: 'c2', blocked: true }), { allowed: false, reason: 'blocked' });
    assert.deepEqual(await decide({ eventId: 'c3', valid: false }), { allowed: false, reason: 'event_invalid' });
  });

  await test('catégorie inventée : refus NOMMÉ, jamais un « oui » par défaut', async () => {
    await assert.rejects(
      () => decide({ category: 'defense', eventId: 'x1' }),
      /invalid_notification_request/,
    );
    await assert.rejects(() => decide({ eventId: '' }), /invalid_notification_request/);
  });

  await test('claim_notification_2026 : décide ET inscrit, une seule fois', async () => {
    await db.query('delete from public.notification_log_2026');
    const first = await one(`select claim_notification_2026($1,'results','result:99','2026-09-10T12:00:00Z'::timestamptz)`, [id(1)]);
    assert.deepEqual(first, { allowed: true, reason: null, logged: true });
    const second = await one(`select claim_notification_2026($1,'results','result:99','2026-09-10T12:00:00Z'::timestamptz)`, [id(1)]);
    assert.deepEqual(second, { allowed: false, reason: 'duplicate', logged: false });
    assert.equal(await one('select count(*)::int from public.notification_log_2026'), 1);
  });

  await test('un refus n’écrit RIEN dans le journal', async () => {
    const before = await one('select count(*)::int from public.notification_log_2026');
    const verdict = await one(`select claim_notification_2026($1,'offers','never','2026-09-10T22:30:00Z'::timestamptz)`, [id(1)]);
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.logged, false);
    assert.equal(await one('select count(*)::int from public.notification_log_2026'), before);
  });

  console.log(`\n${passed} tests OK`);
} catch (e) {
  console.error(`\nÉCHEC après ${passed} tests :`, e);
  process.exitCode = 1;
} finally {
  await db.close();
}
