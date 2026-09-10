#!/usr/bin/env node
/**
 * GRYD — 0191 : LES OBJETS DE PARRAINAGE, JOUÉS SUR UN VRAI PostgreSQL.
 *
 * Le SQL exécuté est celui des migrations, sans réécriture. La lignée est celle
 * qui les porte : 0119 (registre d'XP), 0120 (droits GRYD+), 0121 (saisons),
 * 0125 (collections permanentes), 0140/0141 (notifications), 0144 (récompenses
 * de niveau), 0180 (les cosmétiques de profil), 0184/0185/0186 (le parrainage),
 * puis 0191. Seuls `users`, `runs` et `auth` sont des fixtures.
 *
 * Le parrainage n'est PAS simulé : les octrois sont écrits par la vraie chaîne
 * (code → saisie → deux sorties réelles → `referral_try_complete_2026`), et la
 * révocation par le vrai déclencheur (`runs.status` → `rejected`).
 *
 * ─── CE QUE PGlite NE PROUVE PAS ────────────────────────────────────────────
 * Il tourne en SUPERUTILISATEUR et n'a pas PostGIS. Ce fichier prouve les
 * CONTRAINTES, les PRIVILÈGES POSÉS et la LOGIQUE des RPC et des déclencheurs,
 * jamais l'effet d'une policy sur un rôle restreint. C'est pour cette raison
 * que le modèle ne s'appuie sur AUCUNE policy : `revoke all … from anon,
 * authenticated` plus une RPC `security definer` sont vérifiables ici.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────
 * AVANT 0191, un parrainage ABOUTI écrivait bien ses quatre lignes d'octroi, et
 * `equip_cosmetic_2026('avatarFrame','referral_frame')` répondait quand même
 * `unknown_cosmetic` — au parrain comme au filleul. L'objet était promis par
 * `/parrainage`, gagné dans `referral_grants_2026`, et portable par personne.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeProgressLedger2026 } from '../functions/_shared/progression2026.ts';
import { REFERRAL_REWARDS_2026 } from '../functions/_shared/game-rules.ts';

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
const BETA = id(2);    // le premier filleul
const DELTA = id(3);   // le second filleul
const GAMMA = id(4);   // un tiers, qui n'a jamais parrainé personne

const equip = (user, slot, item) => as(user, () => one('select public.equip_cosmetic_2026($1,$2)', [slot, item]));
/** L'objet PORTÉ dans un emplacement, ou `null` quand l'emplacement est vide. */
const worn = async (user, slot) => (await q(
  'select item_id from public.profile_cosmetics_2026 where user_id=$1 and slot=$2', [user, slot]))[0]?.item_id ?? null;

async function commit(user, run = null) {
  const s = await one('select public.progress_snapshot_2026($1)', [user]);
  const ledger = computeProgressLedger2026({ accountId: user, ...s });
  return one('select public.commit_progress_2026($1,$2,$3,$4)', [user, s.version, ledger, run]);
}
/** Une sortie RÉELLE : la ligne `runs` puis l'évidence sportive de 0119. */
async function outing(run, user, startedAt) {
  const ended = new Date(Date.parse(startedAt) + 30 * 60_000).toISOString();
  await db.query(`insert into public.runs(id,user_id,started_at,distance_m,status)
    values($1,$2,$3,5000,'valid') on conflict(id) do nothing`, [run, user, startedAt]);
  await db.query('select public.record_progress_evidence_2026($1,$2)', [run, {
    canonicalId: run, revision: 1, sport: 'run', startedAt, endedAt: ended, receivedAt: ended,
    source: 'gps', eligibility: 'eligible', movement: [{ start: startedAt, end: ended }],
  }]);
  return commit(user, run);
}
const day = (offset) => new Date(Date.now() - (20 - offset) * 86_400_000).toISOString();

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
      xp_awarded integer not null default 0);`);

  for (const name of [
    '0119_refonte_2026_progress_ledger.sql', '0120_refonte_2026_premium_entitlements.sql',
    '0121_refonte_2026_season_collections.sql', '0125_refonte_2026_permanent_collections.sql',
    '0140_notification_preferences_2026.sql', '0141_notification_engine_2026.sql',
    '0144_refonte_2026_level_rewards.sql', '0180_profile_cosmetics_2026.sql',
    '0184_referral_codes_2026.sql', '0185_referral_links_2026.sql', '0186_referral_rewards_2026.sql',
  ]) await db.exec(migration(name));

  await db.query(`insert into public.users(id,pseudo,created_at) values
    ($1,'alpha',now()-interval '200 days'),($2,'beta',now()-interval '1 day'),
    ($3,'delta',now()-interval '1 day'),($4,'gamma',now()-interval '90 days')`,
    [ALPHA, BETA, DELTA, GAMMA]);

  // ── LE PARRAINAGE, JOUÉ EN ENTIER ─────────────────────────────────────────
  const code = await one('select public.ensure_referral_code_2026($1)', [ALPHA]);
  await as(BETA, () => one('select public.redeem_referral_code_2026($1)', [code]));
  await outing(runId(1), BETA, day(1));
  await outing(runId(2), ALPHA, day(2));
  await as(DELTA, () => one('select public.redeem_referral_code_2026($1)', [code]));
  await outing(runId(3), DELTA, day(3));
  await outing(runId(4), ALPHA, day(4));

  // ══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ═════════════════════════════════════════
  await test('étape 0 — deux parrainages aboutis, et AUCUN objet portable', async () => {
    // Les deux liens sont CLOS : la chaîne de 0186 a vraiment tourné.
    assert.equal(Number(await one('select count(*) from public.referral_links_2026 where completed_at is not null')), 2);
    // Le parrain porte trois octrois VIVANTS de la collection exclusive.
    const octrois = (await q(`select reward_id from public.referral_grants_2026
      where user_id=$1 and kind='collection' and revoked_at is null order by reward_id`, [ALPHA])).map(r => r.reward_id);
    assert.deepEqual([...new Set(octrois)].sort(), ['referral_frame', 'referral_title_parrain', 'referral_trace']);
    // ET pourtant le serveur ne sait pas les poser : ils ne sont pas au catalogue.
    for (const [slot, item] of [['avatarFrame', 'referral_frame'], ['trace', 'referral_trace']]) {
      assert.equal(Number(await one('select count(*) from public.profile_cosmetic_items_2026 where item_id=$1', [item])), 0);
      await rejects(() => equip(ALPHA, slot, item), 'unknown_cosmetic');
      await rejects(() => equip(BETA, slot, item), 'unknown_cosmetic');
    }
    // L'origine « referral » n'existe NULLE PART : ni dans le `check` du
    // catalogue, ni dans une insertion qui tenterait de passer outre.
    const origines = await one(`select pg_get_constraintdef(oid) from pg_constraint
      where conrelid='public.profile_cosmetic_items_2026'::regclass and conname='profile_cosmetic_items_2026_obtain_check'`);
    assert.equal(origines.includes("'referral'"), false, 'l’origine existait déjà : l’étape 0 ne prouve rien');
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain)
      values('referral_frame','avatarFrame','referral')`), 'violates check constraint');
    // Les DEUX contraintes que 0191 retire PAR LEUR NOM existent bien : sans
    // cette mesure, un `drop constraint` renommé passerait pour un correctif.
    const noms = (await q(`select conname from pg_constraint
      where conrelid='public.profile_cosmetic_items_2026'::regclass and contype='c' order by conname`)).map(r => r.conname);
    assert.equal(noms.includes('profile_cosmetic_items_2026_obtain_check'), true);
    assert.equal(noms.includes('profile_cosmetic_items_2026_check'), true);
  });

  await db.exec(migration('0191_referral_cosmetics_2026.sql'));

  // ══ 1. LE CATALOGUE, ET CE QU'IL N'ACCEPTE PAS ═══════════════════════════
  await test('les deux objets entrent, et EUX SEULS parmi les récompenses de 0186', async () => {
    const rows = await q("select item_id,slot from public.profile_cosmetic_items_2026 where obtain='referral' order by item_id");
    assert.deepEqual(rows, [{ item_id: 'referral_frame', slot: 'avatarFrame' }, { item_id: 'referral_trace', slot: 'trace' }]);
    // La source unique reste `REFERRAL_REWARDS_2026` (game-rules §3.7) : les
    // identifiants et les emplacements sont ceux-là, pas une copie qui dérive.
    for (const reward of REFERRAL_REWARDS_2026) {
      const attendu = reward.slot === 'title' ? 0 : 1;
      assert.equal(Number(await one("select count(*) from public.profile_cosmetic_items_2026 where item_id=$1 and slot=$2 and obtain='referral'",
        [reward.id, reward.slot])), attendu, `${reward.id} : ${attendu === 1 ? 'absent du catalogue' : 'ne devrait pas y être'}`);
    }
    // LES DEUX TITRES : octroyés, et volontairement HORS catalogue cosmétique
    // (aucune maison de titres ne sait les porter — voir l'en-tête de 0191).
    for (const titre of ['referral_title_parrain', 'referral_title_filleul']) {
      assert.equal(Number(await one('select count(*) from public.profile_cosmetic_items_2026 where item_id=$1', [titre])), 0);
      assert.equal(Number(await one('select count(*) from public.referral_grants_2026 where reward_id=$1', [titre])) > 0, true,
        `${titre} : plus octroyé par 0186 — la note de 0191 ne décrit plus rien`);
    }
  });

  await test('une origine, une seule condition : « referral » ne porte aucun seuil', async () => {
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,min_level,min_xp)
      values('x','banner','referral',4,360)`), 'profile_cosmetic_items_2026_check');
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,collection_id)
      values('y','banner','referral','relief')`), 'profile_cosmetic_items_2026_check');
    // Les quatre origines de 0180 restent exactement ce qu'elles étaient.
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,min_level,min_xp,collection_id)
      values('z','banner','level',4,360,'relief')`), 'profile_cosmetic_items_2026_check');
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain)
      values('w','banner','cadeau')`), 'violates check constraint');
    // Et « referral » EST maintenant une origine connue du `check` de tête.
    assert.equal((await one(`select pg_get_constraintdef(oid) from pg_constraint
      where conrelid='public.profile_cosmetic_items_2026'::regclass
        and conname='profile_cosmetic_items_2026_obtain_check'`)).includes("'referral'"), true);
  });

  // ══ 2. LE SERVEUR DÉCIDE ═════════════════════════════════════════════════
  await test('avec un octroi vivant, l’objet s’équipe — au parrain comme au filleul', async () => {
    assert.equal((await equip(ALPHA, 'avatarFrame', 'referral_frame')).equipped, true);
    assert.equal((await equip(ALPHA, 'trace', 'referral_trace')).equipped, true);
    assert.equal((await equip(BETA, 'avatarFrame', 'referral_frame')).equipped, true);
    assert.equal(await worn(ALPHA, 'avatarFrame'), 'referral_frame');
    assert.equal(await worn(BETA, 'avatarFrame'), 'referral_frame');
  });

  await test('sans octroi, le serveur dit NON — même à un compte ancien et bien noté', async () => {
    await db.query("insert into public.progress_accounts_2026(user_id,ledger) values($1,$2::jsonb)",
      [GAMMA, JSON.stringify({ totalXp: 30000, days: [], collections: {} })]);
    await db.query(`insert into public.premium_entitlements_2026(user_id,entitlement_id,product_id,is_active,lifetime,event_timestamp_ms,observed_at_ms,rc_event_id)
      values($1,'gryd_plus','p',true,true,1,1,'e1')`, [GAMMA]);
    await db.query(`insert into public.commercial_ownership_2026(user_id,collection_id,owned,product_id,acquired_at,observed_at_ms)
      values($1,'relief',true,'sku',now(),1)`, [GAMMA]);
    // Niveau 50, GRYD+ actif, une collection payée : rien de tout cela n'ouvre
    // un objet de parrainage. C'est LA définition de « exclusif ».
    await rejects(() => equip(GAMMA, 'avatarFrame', 'referral_frame'), 'cosmetic_not_unlocked');
    await rejects(() => equip(GAMMA, 'trace', 'referral_trace'), 'cosmetic_not_unlocked');
    assert.equal((await equip(GAMMA, 'avatarFrame', 'frame_hexagone')).equipped, true, 'sa collection payée, elle, s’ouvre');
  });

  await test('un objet de parrainage ne change pas d’emplacement', async () => {
    await rejects(() => equip(ALPHA, 'trace', 'referral_frame'), 'unknown_cosmetic');
    await rejects(() => equip(ALPHA, 'titleBadge', 'referral_title_parrain'), 'unknown_cosmetic');
  });

  // ══ 3. LA RÉVOCATION ═════════════════════════════════════════════════════
  await test('un octroi révoqué ne s’équipe plus, et l’objet PORTÉ tombe avec lui', async () => {
    // La sortie du PREMIER filleul est rejetée : le lien 1 et ses octrois sont
    // révoqués par la vraie chaîne de 0186 (déclencheur sur `runs.status`).
    await db.query("update public.runs set status='rejected' where id=$1", [runId(1)]);
    assert.equal(Number(await one(`select count(*) from public.referral_grants_2026
      where user_id=$1 and kind='collection' and revoked_at is null`, [BETA])), 0);
    // Le filleul n'a plus rien : il ne peut plus l'équiper, et ne le porte plus.
    await rejects(() => equip(BETA, 'avatarFrame', 'referral_frame'), 'cosmetic_not_unlocked');
    assert.equal(await worn(BETA, 'avatarFrame'), null, 'un objet révoqué resterait PEINT sur le profil');
    // Le parrain, lui, a un SECOND parrainage abouti : rien ne lui est retiré.
    assert.equal(await worn(ALPHA, 'avatarFrame'), 'referral_frame');
    assert.equal(await worn(ALPHA, 'trace'), 'referral_trace');
  });

  await test('quand le DERNIER octroi tombe, le parrain le perd aussi', async () => {
    await db.query("update public.runs set status='rejected' where id=$1", [runId(3)]);
    assert.equal(Number(await one(`select count(*) from public.referral_grants_2026
      where user_id=$1 and kind='collection' and revoked_at is null`, [ALPHA])), 0);
    assert.equal(await worn(ALPHA, 'avatarFrame'), null);
    assert.equal(await worn(ALPHA, 'trace'), null);
    await rejects(() => equip(ALPHA, 'avatarFrame', 'referral_frame'), 'cosmetic_not_unlocked');
    // Ce qui n'était PAS un objet de parrainage n'a pas bougé d'un pouce.
    assert.equal(await worn(GAMMA, 'avatarFrame'), 'frame_hexagone');
  });

  // ══ 4. AUCUNE PORTE NOUVELLE ═════════════════════════════════════════════
  await test('rien n’est ouvert au client : ni la table des octrois, ni le juge d’obtention', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['select', 'insert', 'update', 'delete']) {
        assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, 'public.referral_grants_2026', privilege]), false);
        assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, 'public.profile_cosmetic_items_2026', privilege]), false);
        assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, 'public.profile_cosmetics_2026', privilege]), false);
      }
    }
    for (const fn of ['public.cosmetic_unlocked_2026(uuid,text)', 'public.referral_cosmetic_revoked_2026()']) {
      for (const role of ['anon', 'authenticated']) {
        assert.equal(await one('select has_function_privilege($1,$2,$3)', [role, fn, 'execute']), false, `${role} sur ${fn}`);
      }
    }
    assert.equal(await one("select has_function_privilege('anon','public.equip_cosmetic_2026(text,text)','execute')"), false);
    assert.equal(await one("select has_function_privilege('authenticated','public.equip_cosmetic_2026(text,text)','execute')"), true);
    assert.equal(await one("select has_function_privilege('anon','public.get_profile_cosmetics_2026()','execute')"), false);
  });

  // ══ 5. AUCUN EFFET DE JEU ════════════════════════════════════════════════
  await test('équiper un objet de parrainage ne touche NI les XP, NI le registre', async () => {
    // Le parrain reçoit un troisième parrainage : ses objets redeviennent siens.
    await db.query("insert into public.users(id,pseudo,created_at) values($1,'epsilon',now())", [id(5)]);
    await as(id(5), () => one('select public.redeem_referral_code_2026($1)', [code]));
    await outing(runId(5), id(5), day(5));
    await outing(runId(6), ALPHA, day(6));
    const avant = await one("select ledger from public.progress_accounts_2026 where user_id=$1", [ALPHA]);
    const version = await one("select version from public.progress_accounts_2026 where user_id=$1", [ALPHA]);
    const octrois = Number(await one('select count(*) from public.referral_grants_2026'));
    const bonus = Number(await one('select count(*) from public.referral_xp_bonus_2026'));
    assert.equal((await equip(ALPHA, 'avatarFrame', 'referral_frame')).equipped, true);
    assert.equal((await equip(ALPHA, 'trace', 'referral_trace')).equipped, true);
    assert.deepEqual(await one("select ledger from public.progress_accounts_2026 where user_id=$1", [ALPHA]), avant);
    assert.equal(await one("select version from public.progress_accounts_2026 where user_id=$1", [ALPHA]), version);
    // Équiper ne fabrique NI un octroi, NI un bonus : porter un objet n'est pas
    // le gagner, et le chemin d'écriture reste `referral_try_complete_2026`.
    assert.equal(Number(await one('select count(*) from public.referral_grants_2026')), octrois);
    assert.equal(Number(await one('select count(*) from public.referral_xp_bonus_2026')), bonus);
    assert.equal(Number(await one('select coalesce(sum(xp_awarded),0) from public.runs where user_id=$1', [GAMMA])), 0);
  });

  // ══ 6. CE QUE LES AUTRES EN VOIENT (0181) ════════════════════════════════
  await db.exec(`create table public.user_profiles(user_id uuid primary key references public.users(id),
      handle text unique not null,display_name text,bio text,avatar_path_2026 text,profile_visibility text not null default 'public');
    create table public.follows(follower_id uuid,followee_id uuid);
    create table public.friendships(requester_id uuid,addressee_id uuid,status text);
    create table public.social_blocks_2026(owner_id uuid,target_id uuid);
    create function public.social_profile_visible_2026(p_user_id uuid) returns boolean
      language sql stable as $$ select exists(select 1 from public.user_profiles p
        where p.user_id=p_user_id and (p.profile_visibility='public' or p.user_id=auth.uid())) $$;
    create function public.social_member_2026(p_user_id uuid) returns jsonb language sql stable as $$ select null::jsonb $$;`);
  await db.query("insert into public.user_profiles(user_id,handle,display_name) values($1,'alpha','Alpha'),($2,'gamma','Gamma')", [ALPHA, GAMMA]);
  await db.exec(migration('0181_profile_cosmetics_public_read_2026.sql'));

  await test('le cadre de parrainage se VOIT ; la trace, comme toutes les traces, reste privée', async () => {
    const fiche = await as(GAMMA, () => one('select public.social_member_2026($1)', [ALPHA]));
    assert.equal(fiche.cosmetics.avatarFrame, 'referral_frame', 'un cosmétique que personne ne voit n’en est pas un');
    assert.equal('trace' in fiche.cosmetics, false, 'la trace d’un tiers n’est jamais servie (0181)');
    assert.equal(await worn(ALPHA, 'trace'), 'referral_trace');
  });

  console.log(`\n${passed} tests OK`);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.close();
}
