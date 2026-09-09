// GRYD — 0135 : les réglages d'audience deviennent une décision SERVEUR.
//
// PGlite tourne en SUPERUTILISATEUR : ce fichier prouve le SQL (existence des
// fonctions, domaines refusés, colonnes réellement écrites, privilèges posés),
// jamais l'EFFET d'une policy sur un rôle restreint. Ce qu'il prouve en plus,
// et qui est le cœur du correctif : après écriture, c'est la MÊME lecture 0126
// (`territory_owner_identity_2026`) qui change d'avis — donc le réglage
// gouverne vraiment une exposition, il ne dort pas dans une colonne.
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

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    grant usage on schema auth to authenticated,service_role;
    create table users(id uuid primary key);
    create table crews(id uuid primary key,name text);
    create table crew_members(crew_id uuid,user_id uuid,left_at timestamptz);
    create table runs(id uuid primary key,user_id uuid,activity text,game_status_2026 text,game_reason_2026 text);
    create table friendships(requester_id uuid,addressee_id uuid,status text);`);

  // Les VRAIES colonnes et leurs VRAIS défauts, extraits de 0011 sans les
  // réécrire : c'est ce qui rend l'étape 0 opposable (un défaut inventé ici
  // prouverait un réglage inventé).
  const social0011 = readFileSync(new URL('../migrations/0011_social.sql', import.meta.url), 'utf8');
  const profilesDdl = social0011.slice(
    social0011.indexOf('create table if not exists public.user_profiles'),
    social0011.indexOf('-- ═══ 3. friendships'),
  );
  await db.exec(profilesDdl);
  await db.exec(readFileSync(new URL('../migrations/0123_refonte_2026_territory_read_model.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../migrations/0126_refonte_2026_territory_owner_identity.sql', import.meta.url), 'utf8'));

  // ── ÉTAPE 0 : LE DÉFAUT EXISTAIT ─────────────────────────────────────────
  await test('étape 0 — avant 0135, aucune RPC ne lit ni n’écrit les réglages d’audience', async () => {
    assert.equal(await one(`select ${fn('my_privacy_settings_2026()')}`), false);
    assert.equal(await one(`select ${fn('save_privacy_settings_2026(text,text,boolean)')}`), false);
    // …alors que 0126 lisait DÉJÀ ces colonnes : le réglage client était donc
    // sans effet sur la seule autorité qui le consultait.
    const identity = await one("select pg_get_functiondef('territory_owner_identity_2026(uuid,uuid)'::regprocedure)");
    for (const column of ['profile_visibility', 'discreet_mode']) assert.ok(identity.includes(column));
    const ownership = await one("select pg_get_functiondef('get_ownership_2026(text,float8,float8,float8,float8)'::regprocedure)");
    assert.ok(ownership.includes("up.map_sharing<>'none'"));
  });

  await test('étape 0 — les défauts de colonne sont bien crew / simplified / false', async () => {
    await db.query('insert into users values($1),($2)', [id(1), id(2)]);
    await db.query("insert into public.user_profiles(user_id,handle,display_name) values($1,'runner1','Runner 1')", [id(1)]);
    const row = (await q('select profile_visibility,map_sharing,discreet_mode from public.user_profiles where user_id=$1', [id(1)]))[0];
    assert.deepEqual(row, { profile_visibility: 'crew', map_sharing: 'simplified', discreet_mode: false });
  });

  // ── LA MIGRATION ─────────────────────────────────────────────────────────
  await db.exec(readFileSync(new URL('../migrations/0135_privacy_settings_2026.sql', import.meta.url), 'utf8'));

  await test('0135 s’applique sans créer ni modifier la moindre ligne de profil', async () => {
    assert.equal(await one('select count(*)::int from public.user_profiles'), 1);
    const row = (await q('select profile_visibility,map_sharing,discreet_mode from public.user_profiles where user_id=$1', [id(1)]))[0];
    assert.deepEqual(row, { profile_visibility: 'crew', map_sharing: 'simplified', discreet_mode: false });
  });

  await test('hors session : la lecture rend NULL et l’écriture est refusée', async () => {
    assert.equal(await as(null, () => one('select my_privacy_settings_2026()')), null);
    await assert.rejects(
      () => as(null, () => one("select save_privacy_settings_2026('public','precise',false)")),
      /authentication_required/,
    );
  });

  await test('sans profil : hasProfile=false, défauts rendus, et l’écriture dit profile_required', async () => {
    const read = await as(2, () => one('select my_privacy_settings_2026()'));
    assert.deepEqual(read, {
      hasProfile: false,
      profileVisibility: 'crew',
      mapSharing: 'simplified',
      discreetMode: false,
      updatedAt: null,
    });
    await assert.rejects(
      () => as(2, () => one("select save_privacy_settings_2026('public','precise',false)")),
      /profile_required/,
    );
    assert.equal(await one('select count(*)::int from public.user_profiles'), 1);
  });

  await test('avec profil : la lecture rend les valeurs stockées, jamais celles d’un autre compte', async () => {
    const read = await as(1, () => one('select my_privacy_settings_2026()'));
    assert.equal(read.hasProfile, true);
    assert.equal(read.profileVisibility, 'crew');
    assert.equal(read.mapSharing, 'simplified');
    assert.equal(read.discreetMode, false);
    assert.ok(typeof read.updatedAt === 'string');
  });

  await test('les valeurs hors domaine sont refusées et n’écrivent rien', async () => {
    for (const args of [
      "'everyone','precise',false",
      "'public','everything',false",
      "'public','precise',null",
      "null,'precise',false",
      "'public',null,false",
    ]) {
      await assert.rejects(
        () => as(1, () => one(`select save_privacy_settings_2026(${args})`)),
        /invalid_privacy_settings/,
        `refus attendu pour ${args}`,
      );
    }
    const row = (await q('select profile_visibility,map_sharing,discreet_mode from public.user_profiles where user_id=$1', [id(1)]))[0];
    assert.deepEqual(row, { profile_visibility: 'crew', map_sharing: 'simplified', discreet_mode: false });
  });

  await test('l’écriture porte sur les TROIS colonnes du compte appelant, et sur lui seul', async () => {
    await db.query("insert into public.user_profiles(user_id,handle) values($1,'runner2')", [id(2)]);
    const saved = await as(1, () => one("select save_privacy_settings_2026('public','none',true)"));
    assert.deepEqual(
      { v: saved.profileVisibility, m: saved.mapSharing, d: saved.discreetMode, h: saved.hasProfile },
      { v: 'public', m: 'none', d: true, h: true },
    );
    const mine = (await q('select profile_visibility,map_sharing,discreet_mode from public.user_profiles where user_id=$1', [id(1)]))[0];
    assert.deepEqual(mine, { profile_visibility: 'public', map_sharing: 'none', discreet_mode: true });
    const other = (await q('select profile_visibility,map_sharing,discreet_mode from public.user_profiles where user_id=$1', [id(2)]))[0];
    assert.deepEqual(other, { profile_visibility: 'crew', map_sharing: 'simplified', discreet_mode: false });
  });

  await test('le réglage gouverne VRAIMENT l’identité lue par 0126 sur la carte', async () => {
    await db.query('insert into crews values($1,$2)', [id(11), 'Crew de fixture']);
    await db.query('insert into crew_members values($1,$2,null),($1,$3,null)', [id(11), id(1), id(2)]);
    const identity = () => one('select territory_owner_identity_2026($1,$2)', [id(1), id(2)]);
    // discreet_mode=true (écrit par la RPC juste au-dessus) → aucun nom.
    assert.equal((await identity()).label, null);
    await as(1, () => one("select save_privacy_settings_2026('public','precise',false)"));
    assert.equal((await identity()).label, 'Runner 1');
    await as(1, () => one("select save_privacy_settings_2026('private','precise',false)"));
    assert.equal((await identity()).label, null);
    await as(1, () => one("select save_privacy_settings_2026('crew','precise',false)"));
    assert.equal((await identity()).label, 'Runner 1');
    // …et le mode discret reprend la main même sur un profil de crew ouvert.
    await as(1, () => one("select save_privacy_settings_2026('crew','precise',true)"));
    assert.equal((await identity()).label, null);
    assert.equal((await identity()).crew, null);
  });

  await test('privilèges : jamais public ni anon ; authenticated et service_role seulement', async () => {
    for (const signature of ['my_privacy_settings_2026()', 'save_privacy_settings_2026(text,text,boolean)']) {
      for (const role of ['anon']) {
        assert.equal(await one(`select has_function_privilege($1,'public.${signature}','execute')`, [role]), false);
      }
      for (const role of ['authenticated', 'service_role']) {
        assert.equal(await one(`select has_function_privilege($1,'public.${signature}','execute')`, [role]), true);
      }
      assert.equal(
        await one(
          `select coalesce(bool_or(a.privilege_type='EXECUTE'),false) from pg_proc p,
             aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
           where p.oid='public.${signature}'::regprocedure and a.grantee=0`,
        ),
        false,
        `PUBLIC ne doit pas exécuter ${signature}`,
      );
    }
  });

  console.log(`${passed} contrôles PostgreSQL passés (0135). RLS non prouvée ici : PGlite est superutilisateur.`);
} finally {
  await db.close();
}
