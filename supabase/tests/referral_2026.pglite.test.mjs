#!/usr/bin/env node
/**
 * GRYD — 0184/0185/0186 : LE PARRAINAGE « FAÇON TESLA », JOUÉ SUR UN VRAI
 * PostgreSQL.
 *
 * Le SQL exécuté est celui des migrations, sans réécriture. La lignée est celle
 * qui les porte : 0119 (registre d'XP), 0120 (droits GRYD+), 0121 (collections
 * de saison), 0140/0141 (notifications), 0144 (récompenses de niveau), puis
 * 0184, 0185, 0186. Seuls `users`, `runs` et `auth` sont des fixtures.
 *
 * ─── CE QUE PGlite NE PROUVE PAS ────────────────────────────────────────────
 * Il tourne en SUPERUTILISATEUR et n'a pas PostGIS. Ce fichier prouve les
 * CONTRAINTES, les PRIVILÈGES POSÉS et la LOGIQUE des RPC et des déclencheurs —
 * jamais l'effet d'une policy sur un rôle restreint. C'est pour cette raison
 * que le modèle ne s'appuie sur AUCUNE policy : `revoke all … from anon,
 * authenticated` plus deux RPC `security definer` sont vérifiables ici.
 *
 * ─── ÉTAPE 0 ────────────────────────────────────────────────────────────────
 * AVANT 0184, aucune table ni RPC de parrainage n'écrit quoi que ce soit : la
 * table `public.referrals` de 0002 existe mais reste vide, aucune fonction ne
 * transforme un code en lien, et le boost d'XP n'existe nulle part.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeProgressLedger2026 } from '../functions/_shared/progression2026.ts';
import {
  NOTIFICATION_RULES_2026, REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH,
  REFERRAL_COMPLETION_WINDOW_DAYS, REFERRAL_GRYD_PLUS_CREDIT_DAYS,
  REFERRAL_MAX_ACTIVE_PER_SEASON, REFERRAL_MIN_VALIDATED_DISTANCE_M,
  REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS, REFERRAL_REWARDS_2026, REFERRAL_XP_BOOST_2026,
} from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const runId = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
async function rejects(fn, part) { await assert.rejects(fn, part ? new RegExp(part) : undefined); }
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}

const ALPHA = id(1);   // le parrain
const BETA = id(2);    // le filleul
const GAMMA = id(3);   // un tiers
const snapshot = (user) => one('select public.progress_snapshot_2026($1)', [user]);
async function commit(user, run = null) {
  const s = await snapshot(user);
  const ledger = computeProgressLedger2026({ accountId: user, ...s });
  return one('select public.commit_progress_2026($1,$2,$3,$4)', [user, s.version, ledger, run]);
}
/** Une sortie RÉELLE : la ligne `runs` puis l'évidence sportive de 0119. */
async function outing(run, user, startedAt, { distanceM = 5000, status = 'valid', eligibility = 'eligible', minutes = 30 } = {}) {
  const ended = new Date(Date.parse(startedAt) + minutes * 60_000).toISOString();
  await db.query(`insert into public.runs(id,user_id,started_at,distance_m,status)
    values($1,$2,$3,$4,$5) on conflict(id) do update set distance_m=excluded.distance_m,status=excluded.status`,
    [run, user, startedAt, distanceM, status]);
  await db.query('select public.record_progress_evidence_2026($1,$2)', [run, {
    canonicalId: run, revision: 1, sport: 'run', startedAt, endedAt: ended, receivedAt: ended,
    source: 'gps', eligibility, movement: [{ start: startedAt, end: ended }],
  }]);
  return commit(user, run);
}
const link = (n = 1) => q('select * from public.referral_links_2026 order by id').then(rows => rows[n - 1]);
const mine = (user) => as(user, () => one('select public.my_referral_2026()'));
const redeem = (user, code) => as(user, () => one('select public.redeem_referral_code_2026($1)', [code]));

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function extensions.gen_random_bytes(int) returns bytea language sql as $$
      select decode(string_agg(lpad(to_hex((random()*255)::int),2,'0'),''),'hex')
      from generate_series(1,$1) $$;
    grant usage on schema auth,extensions to anon,authenticated,service_role;
    create table public.users(id uuid primary key,pseudo text not null unique,
      created_at timestamptz not null default now(),deletion_requested_at timestamptz);
    create table public.runs(id uuid primary key,
      user_id uuid not null references public.users(id) on delete cascade,
      started_at timestamptz not null default now(),
      distance_m integer not null default 0,
      status text not null default 'valid' check (status in ('valid','partial','flagged','rejected')),
      ruleset_version text not null default '2026.1',
      xp_awarded integer not null default 0);
    -- La table morte de 0002, telle quelle : l'étape 0 la mesure.
    create table public.referrals(referrer_id uuid not null references public.users(id),
      referee_id uuid not null references public.users(id),
      activated_at timestamptz, boost_expires_at timestamptz);`);

  for (const name of [
    '0119_refonte_2026_progress_ledger.sql', '0120_refonte_2026_premium_entitlements.sql',
    '0121_refonte_2026_season_collections.sql', '0140_notification_preferences_2026.sql',
    '0141_notification_engine_2026.sql', '0144_refonte_2026_level_rewards.sql',
  ]) await db.exec(migration(name));

  await db.query(`insert into public.users(id,pseudo,created_at) values
    ($1,'alpha',now()-interval '200 days'),($2,'beta',now()-interval '1 day'),($3,'gamma',now()-interval '2 days')`,
    [ALPHA, BETA, GAMMA]);
  // Le test « les DEUX ont été notifiés » ne doit pas dépendre de l'heure à
  // laquelle il tourne : la notification de parrainage n'est PAS transactionnelle,
  // donc `claim_notification_2026` la refuse pendant la plage calme par défaut
  // (21 h → 9 h, 0140). Mesuré le 11/09/2026 : rouge à 21 h 01, vert à 21 h 13
  // selon l'horloge de la machine. `start = end` = aucune plage calme (0141).
  await db.query(`insert into public.notification_preferences_2026(user_id,quiet_start_hour,quiet_end_hour)
    values ($1,9,9),($2,9,9),($3,9,9)
    on conflict (user_id) do update set quiet_start_hour=9, quiet_end_hour=9`, [ALPHA, BETA, GAMMA]);
  const seasonStart = await one("select ((date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks') at time zone 'Europe/Paris')::text");
  await one('select configure_season_collection_2026($1,$2,$3)', ['fixture_current', 'Collection de test', seasonStart]);
  const day = (offset) => new Date(Date.parse(seasonStart) + offset * 86_400_000 + 12 * 3_600_000).toISOString();

  // ══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ═════════════════════════════════════════
  await test('étape 0 — avant 0184, aucune table ni RPC de parrainage n’écrit quoi que ce soit', async () => {
    for (const table of ['referral_codes_2026', 'referral_links_2026', 'referral_grants_2026',
      'referral_xp_bonus_2026', 'referral_gryd_plus_credits_2026', 'referral_reward_templates_2026']) {
      assert.equal(await one('select to_regclass($1) is null', [`public.${table}`]), true, `${table} absente`);
    }
    for (const fn of ['my_referral_2026()', 'redeem_referral_code_2026(text)',
      'ensure_referral_code_2026(uuid)', 'referral_boost_active_2026(uuid,timestamptz)']) {
      assert.equal(await one('select to_regprocedure($1) is null', [`public.${fn}`]), true, `${fn} absente`);
    }
    // La table de 0002 EXISTE — et reste vide : rien ne l’écrit, ni ici ni en
    // production (`grep -rn "from('referrals')" supabase/` ne rend rien).
    assert.equal(await one("select to_regclass('public.referrals') is not null"), true);
    assert.equal(Number(await one('select count(*) from public.referrals')), 0);
    // Deux sorties réelles, et AUCUN boost possible : le total d’XP est le total
    // pur du grand livre, à l’unité près.
    await outing(runId(1), ALPHA, day(0));
    await outing(runId(2), ALPHA, day(1));
    assert.equal(Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA])), 200);
  });

  for (const name of ['0184_referral_codes_2026.sql', '0185_referral_links_2026.sql', '0186_referral_rewards_2026.sql']) {
    await db.exec(migration(name));
  }

  // ══ 1. LE CODE ═══════════════════════════════════════════════════════════
  await test('le format du code SQL est exactement celui de game-rules §3.7', async () => {
    const definition = await one(`select pg_get_constraintdef(oid) from pg_constraint
      where conrelid='public.referral_codes_2026'::regclass and contype='c'`);
    assert.ok(definition.includes(REFERRAL_CODE_ALPHABET), 'alphabet gelé identique à la source');
    assert.ok(definition.includes(`{${REFERRAL_CODE_LENGTH}}`), 'longueur gelée identique à la source');
    for (const ambiguous of ['I', 'O', '0', '1']) {
      assert.ok(!REFERRAL_CODE_ALPHABET.includes(ambiguous), `${ambiguous} retiré de l’alphabet`);
    }
  });

  await test('un compte a UN code, créé à la première demande et jamais changé', async () => {
    const first = await one('select public.ensure_referral_code_2026($1)', [ALPHA]);
    assert.match(first, new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`));
    assert.equal(await one('select public.ensure_referral_code_2026($1)', [ALPHA]), first);
    assert.equal(Number(await one('select count(*) from public.referral_codes_2026 where user_id=$1', [ALPHA])), 1);
    await rejects(() => db.query('insert into public.referral_codes_2026(user_id,code) values($1,$2)', [BETA, 'ABCDE']),
      'referral_codes_2026_code_check');
  });

  await test('le client ne peut ni lire ni écrire une seule table de parrainage', async () => {
    for (const table of ['referral_codes_2026', 'referral_links_2026', 'referral_grants_2026',
      'referral_xp_bonus_2026', 'referral_gryd_plus_credits_2026', 'referral_reward_templates_2026']) {
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['select', 'insert', 'update', 'delete']) {
          assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, `public.${table}`, privilege]),
            false, `${role} ne peut pas ${privilege} sur ${table}`);
        }
      }
      assert.equal(await one('select relrowsecurity from pg_class where oid=$1::regclass', [`public.${table}`]), true);
    }
    // Les deux SEULES portes ouvertes au client.
    assert.equal(await one("select has_function_privilege('authenticated','public.my_referral_2026()','execute')"), true);
    assert.equal(await one("select has_function_privilege('authenticated','public.redeem_referral_code_2026(text)','execute')"), true);
    for (const fn of ['public.referral_try_complete_2026(bigint)', 'public.referral_unqualify_run_2026(uuid,text)',
      'public.ensure_referral_code_2026(uuid)', 'public.start_referral_gryd_plus_credits_2026(uuid)']) {
      assert.equal(await one('select has_function_privilege($1,$2,$3)', ['authenticated', fn, 'execute']), false, fn);
    }
  });

  // ══ 2. LES REFUS NOMMÉS DE LA SAISIE ═════════════════════════════════════
  const alphaCode = await one('select code from public.referral_codes_2026 where user_id=$1', [ALPHA]);
  await test('saisie : les six refus sont NOMMÉS, jamais un « réessaie » opaque', async () => {
    assert.equal((await redeem(BETA, 'ZZZ')).reason, 'bad_code');
    assert.equal((await redeem(BETA, 'AAAAAA')).reason, 'unknown_code');
    const betaCode = await one('select public.ensure_referral_code_2026($1)', [BETA]);
    assert.equal((await redeem(BETA, betaCode)).reason, 'self_referral');
    await rejects(() => as(null, () => one('select public.redeem_referral_code_2026($1)', [alphaCode])), 'authentication_required');
  });

  await test('un compte de plus de 7 jours ne peut plus saisir un code', async () => {
    // game-rules: REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS
    assert.equal(REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS, 7);
    await db.query(`update public.users set created_at=now()-interval '8 days' where id=$1`, [GAMMA]);
    assert.equal((await redeem(GAMMA, alphaCode)).reason, 'account_too_old');
    const read = await mine(GAMMA);
    assert.equal(read.canRedeem, false);
    assert.equal(read.redeemBlockedReason, 'account_too_old');
    await db.query(`update public.users set created_at=now()-interval '2 days' where id=$1`, [GAMMA]);
  });

  await test('la saisie noue un lien et n’octroie RIEN — la récompense vient d’une sortie', async () => {
    const result = await redeem(BETA, alphaCode);
    assert.equal(result.ok, true);
    assert.equal(result.state, 'awaiting_my_run');
    const row = await link(1);
    assert.equal(row.referrer_id, ALPHA);
    assert.equal(row.referee_id, BETA);
    assert.equal(row.completed_at, null);
    // Le PARRAIN, lui, avait déjà couru : le rattrapage l’a qualifié à la saisie.
    assert.notEqual(row.referrer_qualified_at, null);
    assert.equal(row.referee_qualified_at, null);
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026')), 0);
  });

  await test('un filleul a UN parrain, jamais deux, et la réciprocité est refusée', async () => {
    const gammaCode = await one('select public.ensure_referral_code_2026($1)', [GAMMA]);
    assert.equal((await redeem(BETA, gammaCode)).reason, 'already_referred');
    // A parraine B ⇒ B ne peut pas parrainer A.
    const betaCode = await one('select code from public.referral_codes_2026 where user_id=$1', [BETA]);
    await db.query(`update public.users set created_at=now()-interval '1 day' where id=$1`, [ALPHA]);
    assert.equal((await redeem(ALPHA, betaCode)).reason, 'reciprocity');
    await db.query(`update public.users set created_at=now()-interval '200 days' where id=$1`, [ALPHA]);
    // Et la contrainte structurelle tient même hors RPC.
    await rejects(() => db.query(`insert into public.referral_links_2026(referrer_id,referee_id,code,season_key)
      values($1,$2,'AAAAAA','x')`, [GAMMA, BETA]), 'referral_links_2026_referee_unique');
    await rejects(() => db.query(`insert into public.referral_links_2026(referrer_id,referee_id,code,season_key)
      values($1,$1,'AAAAAA','x')`, [GAMMA]), 'referral_links_2026_no_self');
  });

  // ══ 3. LA SORTIE QUI NE COMPTE PAS ═══════════════════════════════════════
  await test('une sortie trop courte ne qualifie pas le filleul', async () => {
    assert.equal(REFERRAL_MIN_VALIDATED_DISTANCE_M, 1_000);
    await outing(runId(10), BETA, day(2), { distanceM: REFERRAL_MIN_VALIDATED_DISTANCE_M - 1 });
    assert.equal((await link(1)).referee_qualified_at, null);
  });

  await test('une sortie gelée par l’anti-triche ne qualifie pas non plus', async () => {
    await outing(runId(11), BETA, day(3), { eligibility: 'review' });
    assert.equal((await link(1)).referee_qualified_at, null);
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026')), 0);
  });

  // ══ 4. L'OCTROI ══════════════════════════════════════════════════════════
  await test('la sortie validée du filleul clôt le parrainage, et les DEUX sont servis', async () => {
    await outing(runId(12), BETA, day(4));
    const row = await link(1);
    assert.notEqual(row.completed_at, null);
    assert.equal(row.referee_run_id, runId(12));
    assert.equal(row.referrer_capped, false);
    const grants = await q('select user_id,side,kind,reward_id from public.referral_grants_2026 order by user_id,kind,reward_id');
    // Collection exclusive : le cadre et la trace aux DEUX, le titre à chacun.
    const collection = grants.filter(g => g.kind === 'collection');
    assert.deepEqual(collection.filter(g => g.user_id === ALPHA).map(g => g.reward_id).sort(),
      ['referral_frame', 'referral_title_parrain', 'referral_trace']);
    assert.deepEqual(collection.filter(g => g.user_id === BETA).map(g => g.reward_id).sort(),
      ['referral_frame', 'referral_title_filleul', 'referral_trace']);
    // Boost et crédit GRYD+ pour chacun.
    for (const user of [ALPHA, BETA]) {
      assert.equal(grants.filter(g => g.user_id === user && g.kind === 'xp_boost').length, 1);
      assert.equal(grants.filter(g => g.user_id === user && g.kind === 'gryd_plus').length, 1);
      assert.equal(await one('select public.referral_boost_active_2026($1,now())', [user]), true);
    }
  });

  await test('le catalogue SQL gelé est exactement REFERRAL_REWARDS_2026 (aucune dérive)', async () => {
    const rows = await q('select reward_id,slot,side from public.referral_reward_templates_2026 order by reward_id');
    assert.deepEqual(rows.map(r => ({ id: r.reward_id, slot: r.slot, side: r.side })),
      [...REFERRAL_REWARDS_2026].map(r => ({ id: r.id, slot: r.slot, side: r.side }))
        .sort((a, b) => a.id.localeCompare(b.id)));
  });

  await test('la collection de parrainage n’existe dans AUCUN autre catalogue', async () => {
    for (const reward of REFERRAL_REWARDS_2026) {
      assert.equal(Number(await one('select count(*) from public.level_reward_templates_2026 where reward_id=$1', [reward.id])), 0);
      assert.equal(Number(await one('select count(*) from public.season_reward_templates_2026 where reward_id=$1', [reward.id])), 0);
    }
  });

  await test('l’octroi est rejouable : le refaire n’ajoute rien', async () => {
    const before = Number(await one('select count(*) from public.referral_grants_2026'));
    assert.equal(await one('select public.referral_try_complete_2026($1)', [(await link(1)).id]), false);
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026')), before);
    assert.equal(Number(await one('select count(*) from public.referral_gryd_plus_credits_2026')), 2);
  });

  await test('les DEUX ont été notifiés, une seule fois, en catégorie « résultats »', async () => {
    assert.equal(NOTIFICATION_RULES_2026.referralCompleted.category, 'results');
    assert.equal(NOTIFICATION_RULES_2026.referralCompleted.transactional, false);
    const rows = await q('select user_id,category,event_id,transactional from public.notification_log_2026 order by user_id');
    assert.equal(rows.length, 2, 'un message par personne, jamais deux');
    for (const row of rows) {
      assert.equal(row.category, NOTIFICATION_RULES_2026.referralCompleted.category);
      assert.equal(row.transactional, NOTIFICATION_RULES_2026.referralCompleted.transactional);
      assert.ok(row.event_id.startsWith(NOTIFICATION_RULES_2026.referralCompleted.eventIdPrefix));
    }
  });

  // ══ 5. LE BOOST D'XP ═════════════════════════════════════════════════════
  await test('le boost ×1,5 s’applique à l’XP de progression, et à elle seule', async () => {
    assert.deepEqual({ ...REFERRAL_XP_BOOST_2026 }, { multiplier: 1.5, days: 7 });
    const before = Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA]));
    await outing(runId(13), ALPHA, day(6));
    const after = Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA]));
    // Une journée active vaut 100 XP au grand livre ; le boost en ajoute 50.
    assert.equal(after - before, 150);
    const bonus = await q('select run_id,base_xp,bonus_xp,multiplier from public.referral_xp_bonus_2026 where user_id=$1', [ALPHA]);
    assert.deepEqual(bonus.map(b => [b.run_id, b.base_xp, b.bonus_xp, Number(b.multiplier)]),
      [[runId(13), 100, 50, REFERRAL_XP_BOOST_2026.multiplier]]);
    // NI territoire, NI performance : le parrainage n’écrit aucune de ces colonnes.
    assert.equal(Number(await one('select coalesce(sum(xp_awarded),0) from public.runs where id=$1', [runId(13)])), 150);
  });

  await test('le boost ne touche PAS les paliers de collection de saison', async () => {
    const collections = await one("select ledger->'collections' from public.progress_accounts_2026 where user_id=$1", [ALPHA]);
    const total = Object.values(collections ?? {}).reduce((sum, value) => sum + Number(value), 0);
    const bonus = Number(await one('select public.referral_xp_bonus_total_2026($1)', [ALPHA]));
    assert.ok(bonus > 0, 'le bonus existe bien');
    // La somme des paliers est le total PUR : le bonus n’y est jamais entré.
    assert.equal(total + bonus, Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA])));
  });

  await test('un recalcul rejoué ne double aucun bonus et ne pose aucune correction', async () => {
    const beforeBonus = Number(await one('select count(*) from public.referral_xp_bonus_2026'));
    const beforeTotal = Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA]));
    const beforeCorrections = Number(await one('select count(*) from public.progress_corrections_2026 where user_id=$1', [ALPHA]));
    const receipt = await commit(ALPHA, runId(13));
    assert.equal(receipt.committed, true);
    assert.equal(receipt.xpDelta, 0);
    assert.equal(Number(await one('select count(*) from public.referral_xp_bonus_2026')), beforeBonus);
    assert.equal(Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA])), beforeTotal);
    assert.equal(Number(await one('select count(*) from public.progress_corrections_2026 where user_id=$1', [ALPHA])), beforeCorrections);
  });

  await test('hors fenêtre, la sortie suivante ne vaut plus que son XP nue', async () => {
    await db.query(`update public.referral_grants_2026 set boost_ends_at=now()-interval '1 hour' where kind='xp_boost' and user_id=$1`, [ALPHA]);
    assert.equal(await one('select public.referral_boost_active_2026($1,now())', [ALPHA]), false);
    const before = Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA]));
    await outing(runId(14), ALPHA, day(7));
    assert.equal(Number(await one("select (ledger->>'totalXp')::int from public.progress_accounts_2026 where user_id=$1", [ALPHA])) - before, 100);
  });

  // ══ 6. LE CRÉDIT GRYD+ ═══════════════════════════════════════════════════
  await test('le crédit GRYD+ est BANQUÉ, et n’ouvre rien tant qu’il n’a pas démarré', async () => {
    assert.equal(REFERRAL_GRYD_PLUS_CREDIT_DAYS, 30);
    const rows = await q('select user_id,days,consumed_at,ends_at from public.referral_gryd_plus_credits_2026 order by user_id');
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.days, REFERRAL_GRYD_PLUS_CREDIT_DAYS);
      assert.equal(row.consumed_at, null);
      assert.equal(row.ends_at, null);
    }
    assert.equal(await one('select public.has_gryd_plus_access_2026($1)', [ALPHA]), false);
  });

  await test('le jour de l’ouverture, l’interrupteur démarre les crédits — une seule fois', async () => {
    assert.equal(await one('select public.start_referral_gryd_plus_credits_2026()'), 2);
    assert.equal(await one('select public.start_referral_gryd_plus_credits_2026()'), 0);
    assert.equal(await one('select public.has_gryd_plus_access_2026($1)', [ALPHA]), true);
    assert.equal(await one('select public.has_gryd_plus_access_2026($1)', [BETA]), true);
    // 30 jours, pas 29 ni 31.
    assert.equal(Number(await one(`select round(extract(epoch from (ends_at-consumed_at))/86400)
      from public.referral_gryd_plus_credits_2026 where user_id=$1`, [ALPHA])), REFERRAL_GRYD_PLUS_CREDIT_DAYS);
    // Le crédit n’est PAS un abonnement : la lecture que l’app affiche
    // (`get_gryd_plus_access_2026`) continue de dire « pas de reçu ».
    const shown = await as(ALPHA, () => one('select public.get_gryd_plus_access_2026()'));
    assert.equal(shown.active, false);
    assert.equal(shown.productId, null);
  });

  // ══ 7. LA LECTURE DU CLIENT ══════════════════════════════════════════════
  await test('my_referral_2026 rend l’état réel, et JAMAIS un identifiant de tiers', async () => {
    const read = await mine(ALPHA);
    assert.match(read.code, new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`));
    assert.equal(read.referees.length, 1);
    assert.deepEqual(read.referees.map(r => [r.pseudo, r.state]), [['beta', 'rewarded']]);
    assert.equal(read.sponsor, null);
    assert.equal(read.boostActive, false);
    assert.equal(read.bonusXp, 50);
    assert.equal(read.grydPlusCredit.days, REFERRAL_GRYD_PLUS_CREDIT_DAYS);
    assert.equal(read.grydPlusCredit.state, 'running');
    assert.equal(read.nextStep, 'done');
    assert.equal(read.remainingThisSeason, REFERRAL_MAX_ACTIVE_PER_SEASON - 1);
    assert.equal(JSON.stringify(read).includes(ALPHA), false, 'aucun user_id ne sort');
    assert.equal(JSON.stringify(read).includes(BETA), false, 'aucun user_id ne sort');
    assert.equal(JSON.stringify(read).includes('gryd://'), false, 'le serveur n’écrit jamais l’adresse');
    const refereeRead = await mine(BETA);
    assert.deepEqual([refereeRead.sponsor.pseudo, refereeRead.sponsor.state], ['alpha', 'rewarded']);
    assert.equal(refereeRead.canRedeem, false);
    assert.equal(refereeRead.redeemBlockedReason, 'already_referred');
  });

  await test('un compte sans parrainage lit un état VIDE, jamais un zéro inventé', async () => {
    const read = await mine(GAMMA);
    assert.deepEqual(read.referees, []);
    assert.equal(read.sponsor, null);
    assert.deepEqual(read.rewards, []);
    assert.equal(read.grydPlusCredit, null, 'pas de crédit ⇒ null, pas « 0 jour »');
    assert.equal(read.boostActive, false);
    assert.equal(read.nextStep, 'share');
    assert.equal(read.canRedeem, true);
    assert.equal(read.redeemBlockedReason, null);
    await rejects(() => as(null, () => one('select public.my_referral_2026()')), 'authentication_required');
  });

  // ══ 8. LA RÉVOCATION ═════════════════════════════════════════════════════
  await test('une sortie rejetée par l’anti-triche révoque le parrainage qu’elle prouvait', async () => {
    await db.query("update public.runs set status='rejected' where id=$1", [runId(12)]);
    const row = await link(1);
    assert.notEqual(row.revoked_at, null);
    assert.equal(row.revoked_reason, 'run_rejected');
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026 where revoked_at is null')), 0);
    assert.equal(Number(await one('select count(*) from public.referral_gryd_plus_credits_2026 where revoked_at is null')), 0);
    assert.equal(await one('select public.has_gryd_plus_access_2026($1)', [ALPHA]), false);
    assert.equal(await one('select public.referral_boost_active_2026($1,now())', [BETA]), false);
    assert.deepEqual((await mine(ALPHA)).rewards, []);
    assert.deepEqual((await mine(ALPHA)).referees.map(r => r.state), ['revoked']);
  });

  await test('les XP DÉJÀ créditées par le boost ne sont jamais reprises', async () => {
    // Permanence (0144) : un niveau ne redescend pas. La fenêtre, elle, est
    // fermée — le tricheur ne gagne rien DE PLUS.
    assert.equal(Number(await one('select public.referral_xp_bonus_total_2026($1)', [ALPHA])), 50);
    assert.equal(await one('select public.referral_boost_active_2026($1,now())', [ALPHA]), false);
  });

  await test('un gel qui survient AVANT la clôture efface la qualification, sans révoquer', async () => {
    await db.query('delete from public.referral_links_2026');
    await db.query(`update public.users set created_at=now()-interval '1 day' where id=$1`, [GAMMA]);
    assert.equal((await redeem(GAMMA, alphaCode)).ok, true);
    // Le parrain est qualifié (rattrapage), le filleul non.
    assert.equal((await link(1)).referee_qualified_at, null);
    await outing(runId(20), GAMMA, day(8), { eligibility: 'review' });
    assert.equal((await link(1)).referee_qualified_at, null);
    assert.equal((await link(1)).completed_at, null);
    assert.equal((await link(1)).revoked_at, null);
    // Le modérateur blanchit la sortie : la MÊME évidence repasse éligible et
    // le parrainage se clôt sans qu’aucune Edge Function ne bouge (0187).
    await db.query(`select public.record_progress_evidence_2026($1, (
      select jsonb_set(evidence,'{eligibility}','"eligible"') from public.progress_activity_2026 where run_id=$1))`, [runId(20)]);
    assert.notEqual((await link(1)).completed_at, null);
  });

  await test('hors fenêtre de 30 jours, le lien est CLOS PAR EXPIRATION, pas laissé en attente', async () => {
    assert.equal(REFERRAL_COMPLETION_WINDOW_DAYS, 30);
    await db.query('delete from public.referral_links_2026');
    await db.query(`insert into public.referral_links_2026(referrer_id,referee_id,code,season_key,
      redeemed_at,referrer_run_id,referrer_qualified_at)
      values($1,$2,$3,'hors_saison',now()-interval '40 days',$4,now()-interval '40 days')`,
      [ALPHA, BETA, alphaCode, runId(1)]);
    const row = await link(1);
    await db.query(`update public.referral_links_2026 set referee_run_id=$2,referee_qualified_at=now() where id=$1`, [row.id, runId(14)]);
    assert.equal(await one('select public.referral_try_complete_2026($1)', [row.id]), false);
    const after = await link(1);
    assert.equal(after.completed_at, null);
    assert.equal(after.revoked_reason, 'window_expired');
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026 where link_id=$1', [row.id])), 0);
  });

  // ══ 9. LE PLAFOND ════════════════════════════════════════════════════════
  await test('au-delà du plafond de saison, le filleul garde sa part, le parrain non', async () => {
    await db.query('delete from public.referral_grants_2026');
    await db.query('delete from public.referral_gryd_plus_credits_2026');
    await db.query('delete from public.referral_links_2026');
    const season = await one('select public.referral_season_key_2026(now())');
    // game-rules: REFERRAL_MAX_ACTIVE_PER_SEASON — cinq parrainages déjà clos.
    for (let i = 0; i < REFERRAL_MAX_ACTIVE_PER_SEASON; i++) {
      const filleul = id(100 + i);
      await db.query('insert into public.users(id,pseudo) values($1,$2)', [filleul, `filleul${i}`]);
      await db.query(`insert into public.referral_links_2026(referrer_id,referee_id,code,season_key,
        referrer_run_id,referrer_qualified_at,referee_run_id,referee_qualified_at,completed_at)
        values($1,$2,$3,$4,$5,now(),$5,now(),now())`, [ALPHA, filleul, alphaCode, season, runId(1)]);
    }
    await db.query(`update public.users set created_at=now()-interval '1 day' where id=$1`, [BETA]);
    assert.equal((await redeem(BETA, alphaCode)).ok, true);
    await outing(runId(30), BETA, day(9));
    const row = await q('select * from public.referral_links_2026 where referee_id=$1', [BETA]).then(r => r[0]);
    assert.notEqual(row.completed_at, null);
    assert.equal(row.referrer_capped, true);
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026 where link_id=$1 and user_id=$2', [row.id, BETA])), 5);
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026 where link_id=$1 and user_id=$2', [row.id, ALPHA])), 0);
    assert.equal((await mine(ALPHA)).remainingThisSeason, 0);
  });

  console.log(`\n${passed} assertions SQL vertes.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.close();
}
