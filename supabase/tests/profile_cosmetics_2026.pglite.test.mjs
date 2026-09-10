#!/usr/bin/env node
/**
 * GRYD — 0180/0181 : LES COSMÉTIQUES DE PROFIL, JOUÉS SUR UN VRAI PostgreSQL.
 *
 * Le SQL exécuté est celui des migrations, sans réécriture. La lignée est celle
 * qui les porte : 0119 (registre d'XP), 0120 (droits GRYD+), 0121 (objets de
 * saison), 0125 (collections commerciales), puis 0180 et 0181.
 *
 * ─── CE QUE PGlite NE PROUVE PAS ────────────────────────────────────────────
 * Il tourne en SUPERUTILISATEUR et n'a pas PostGIS. Ce fichier prouve donc les
 * CONTRAINTES, les PRIVILÈGES POSÉS et la LOGIQUE des RPC — jamais l'effet
 * d'une policy sur un rôle restreint. C'est pour cette raison que le modèle ne
 * s'appuie sur AUCUNE policy : `revoke all … from anon, authenticated` et une
 * unique RPC `security definer` sont vérifiables ici, une policy ne le serait
 * pas. `set role authenticated` reste employé pour éprouver ce que la RPC lit
 * dans `auth.uid()`.
 *
 * ─── LES QUATRE PREUVES QUI COMPTENT ────────────────────────────────────────
 *  0. LE DÉFAUT EXISTAIT — avant 0180, aucun emplacement de profil ne pouvait
 *     porter une couleur de nom, une bannière, une trace, un pin ni un thème.
 *  1. LE SERVEUR DIT NON — un client qui demande un objet qu'il n'a pas est
 *     refusé, même si l'écran l'a proposé.
 *  2. AUCUN EFFET DE JEU — équiper ne touche ni les XP, ni le registre.
 *  3. RIEN NE FUIT — la trace et le thème de partage ne sortent jamais d'une
 *     lecture publique, et un profil masqué reste masqué.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { xpForLevel2026 } from '../functions/_shared/progression2026.ts';
import { PROFILE_COSMETIC_LEVELS_2026, PROFILE_COSMETIC_SLOTS_2026 } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const rejects = (fn, part) => assert.rejects(fn, part ? new RegExp(part) : undefined);
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.users(id uuid primary key,created_at timestamptz not null default now(),deletion_requested_at timestamptz);
    create table public.runs(id uuid primary key,user_id uuid not null references public.users(id) on delete cascade,
      activity text,started_at timestamptz,ended_at_2026 timestamptz,created_at timestamptz default now(),
      ruleset_version text not null default '2026.1',xp_awarded integer not null default 0);`);

  // ══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ═════════════════════════════════════════
  // Mesuré avant d'appliquer 0180 : la lignée complète 0119→0125 est en place,
  // et AUCUN de ses emplacements ne peut porter un cosmétique de profil.
  for (const name of ['0119_refonte_2026_progress_ledger.sql', '0120_refonte_2026_premium_entitlements.sql',
    '0121_refonte_2026_season_collections.sql', '0125_refonte_2026_permanent_collections.sql']) {
    await db.exec(migration(name));
  }
  for (let n = 1; n <= 6; n += 1) await db.query("insert into users(id,created_at) values($1,'2025-01-01')", [id(n)]);

  await test('étape 0 — avant 0180, aucun emplacement de profil ne peut porter un cosmétique', async () => {
    assert.equal(await one("select to_regclass('public.profile_cosmetics_2026') is null"), true);
    assert.equal(await one("select to_regclass('public.profile_cosmetic_items_2026') is null"), true);
    assert.equal(await one("select to_regprocedure('public.equip_cosmetic_2026(text,text)') is null"), true);
    // Les DEUX seuls emplacements déployés, et ils sont pris : 0121/0144 pour
    // le cadre et le titre, 0125 pour le cadre et l'emblème commerciaux.
    const slots = await q(`select conname,pg_get_constraintdef(oid) def from pg_constraint
      where conrelid='public.commercial_equipment_2026'::regclass and contype='c'`);
    assert.equal(slots.some(r => /'frame'/.test(r.def) && /'emblem'/.test(r.def)), true);
    // Aucune maison ne connaît « nameColor », « banner », « trace », « pin »,
    // « titleBadge » ni « cardTheme » : les y ranger était impossible.
    const connus = await one(`select coalesce(string_agg(pg_get_constraintdef(oid),' '),'') from pg_constraint where contype='c'`);
    for (const slot of ['nameColor', 'banner', 'trace', 'pin', 'titleBadge', 'cardTheme']) {
      assert.equal(connus.includes(`'${slot}'`), false, `${slot} existait déjà : l'étape 0 ne prouve rien`);
    }
  });

  await db.exec(migration('0180_profile_cosmetics_2026.sql'));

  // ══ 1. L'INSTANTANÉ GELÉ NE DÉRIVE PAS DES RÈGLES PARTAGÉES ══════════════
  await test('les seuils en XP sont exactement xpForLevel2026(niveau), sans exception', async () => {
    const rows = await q("select item_id,min_level,min_xp from public.profile_cosmetic_items_2026 where obtain='level' order by item_id");
    assert.ok(rows.length > 0);
    const echelle = new Set(Object.values(PROFILE_COSMETIC_LEVELS_2026));
    for (const row of rows) {
      assert.equal(Number(row.min_xp), xpForLevel2026(Number(row.min_level)),
        `${row.item_id} : niveau ${row.min_level} vaut ${xpForLevel2026(Number(row.min_level))} XP, la table dit ${row.min_xp}`);
      assert.equal(echelle.has(Number(row.min_level)), true,
        `${row.item_id} : niveau ${row.min_level} hors de PROFILE_COSMETIC_LEVELS_2026`);
    }
  });

  await test('les sept emplacements sont ceux de game-rules, et chacun a son objet livré', async () => {
    const slots = (await q('select distinct slot from public.profile_cosmetic_items_2026 order by slot')).map(r => r.slot);
    assert.deepEqual(slots, [...PROFILE_COSMETIC_SLOTS_2026].sort());
    for (const slot of PROFILE_COSMETIC_SLOTS_2026) {
      assert.equal(Number(await one(
        "select count(*) from public.profile_cosmetic_items_2026 where slot=$1 and obtain='level' and min_xp=0", [slot])), 1,
        `${slot} : il faut EXACTEMENT un objet livré avec le compte`);
    }
    // Un emplacement inventé est refusé par le `check`, pas par une convention.
    await rejects(() => db.query(
      "insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,min_level,min_xp) values('x','trophee','level',1,0)"),
      'violates check constraint');
  });

  await test('une origine, une seule condition : un objet ne peut pas être gratuit ET vendu', async () => {
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,min_level,min_xp,collection_id)
      values('double','banner','level',4,360,'relief')`), 'violates check constraint');
    await rejects(() => db.query(`insert into public.profile_cosmetic_items_2026(item_id,slot,obtain)
      values('vide','banner','collection')`), 'violates check constraint');
  });

  // ══ 2. LE SERVEUR DÉCIDE, ET LE CLIENT N'ÉCRIT RIEN ══════════════════════
  await test('aucune écriture cliente : anon et authenticated n’ont AUCUN droit sur les tables', async () => {
    for (const table of ['profile_cosmetics_2026', 'profile_cosmetic_items_2026']) {
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['select', 'insert', 'update', 'delete']) {
          assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, `public.${table}`, privilege]), false,
            `${role} peut ${privilege} sur ${table} : la table n'est plus décidée serveur`);
        }
      }
      assert.equal(await one('select relrowsecurity from pg_class where oid=$1::regclass', [`public.${table}`]), true);
    }
    // La RPC de vérification n'est PAS exposée : un client ne doit pas pouvoir
    // sonder l'inventaire d'un tiers, objet par objet.
    assert.equal(await one("select has_function_privilege('authenticated','public.cosmetic_unlocked_2026(uuid,text)','execute')"), false);
    assert.equal(await one("select has_function_privilege('authenticated','public.equip_cosmetic_2026(text,text)','execute')"), true);
    assert.equal(await one("select has_function_privilege('anon','public.equip_cosmetic_2026(text,text)','execute')"), false);
    assert.equal(await one("select has_function_privilege('anon','public.get_profile_cosmetics_2026()','execute')"), false);
  });

  await test('sans session, on n’équipe rien', async () => {
    await rejects(() => as(null, () => one("select public.equip_cosmetic_2026('nameColor','name_ivoire')")), 'authentication_required');
  });

  await test('l’objet livré avec le compte s’équipe dès le premier jour, sans une seule sortie', async () => {
    const result = await as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_ivoire')"));
    assert.equal(result.equipped, true);
    assert.equal(result.itemId, 'name_ivoire');
    // ET il n'a PAS créé de compte de progression : une lecture d'apparence
    // n'écrit pas une ligne d'XP.
    assert.equal(Number(await one('select count(*) from public.progress_accounts_2026 where user_id=$1', [id(1)])), 0);
  });

  await test('un objet de niveau supérieur est REFUSÉ tant que les XP n’y sont pas', async () => {
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_aurore')")), 'cosmetic_not_unlocked');
    // Le registre monte : le serveur change d'avis parce que le FAIT a changé.
    await db.query("insert into public.progress_accounts_2026(user_id,ledger) values($1,$2::jsonb)",
      [id(1), JSON.stringify({ totalXp: xpForLevel2026(PROFILE_COSMETIC_LEVELS_2026.established), days: [], collections: {} })]);
    assert.equal((await as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_aurore')"))).equipped, true);
    // Un XP en dessous du seuil ne suffit pas : la borne est bien >=, pas ~.
    await db.query("update public.progress_accounts_2026 set ledger=$2::jsonb where user_id=$1",
      [id(2), JSON.stringify({ totalXp: 0 })]);
    await db.query("insert into public.progress_accounts_2026(user_id,ledger) values($1,$2::jsonb)",
      [id(2), JSON.stringify({ totalXp: xpForLevel2026(PROFILE_COSMETIC_LEVELS_2026.established) - 1, days: [], collections: {} })]);
    await rejects(() => as(id(2), () => one("select public.equip_cosmetic_2026('nameColor','name_aurore')")), 'cosmetic_not_unlocked');
  });

  await test('GRYD+ et les collections permanentes sont DEUX droits distincts', async () => {
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('trace','trace_neon')")), 'cosmetic_not_unlocked');
    await db.query(`insert into public.premium_entitlements_2026(user_id,entitlement_id,product_id,is_active,lifetime,event_timestamp_ms,observed_at_ms,rc_event_id)
      values($1,'gryd_plus','p',true,true,1,1,'e1')`, [id(1)]);
    assert.equal((await as(id(1), () => one("select public.equip_cosmetic_2026('trace','trace_neon')"))).equipped, true);
    // §16.1 : une collection permanente n'est JAMAIS incluse dans l'abonnement.
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_lave')")), 'cosmetic_not_unlocked');
    await db.query(`insert into public.commercial_ownership_2026(user_id,collection_id,owned,product_id,acquired_at,observed_at_ms)
      values($1,'contour',true,'sku',now(),1)`, [id(1)]);
    assert.equal((await as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_lave')"))).equipped, true);
    // Une collection NON possédée (ligne présente, `owned` faux) ne débloque rien.
    await db.query(`insert into public.commercial_ownership_2026(user_id,collection_id,owned,observed_at_ms)
      values($1,'relief',false,1)`, [id(1)]);
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('avatarFrame','frame_hexagone')")), 'cosmetic_not_unlocked');
  });

  await test('un objet de saison se gagne, il ne se déduit pas d’un niveau', async () => {
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('pin','pin_couronne')")), 'cosmetic_not_unlocked');
    await db.query(`insert into public.season_collections_2026(id,title,time_zone,starts_at,ends_at)
      values('saison_test','Saison de test','Europe/Paris',now()-interval '1 day',now()+interval '30 days')`);
    await db.query(`insert into public.season_reward_ownership_2026(user_id,collection_id,reward_id,variant,ledger_version)
      values($1,'saison_test','title','standard',1)`, [id(1)]);
    assert.equal((await as(id(1), () => one("select public.equip_cosmetic_2026('pin','pin_couronne')"))).equipped, true);
  });

  await test('un objet ne peut pas changer d’emplacement, ni exister hors du catalogue', async () => {
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('pin','banner_trame')")), 'unknown_cosmetic');
    await rejects(() => as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_de_2027')")), 'unknown_cosmetic');
    // Et même en écrivant DIRECTEMENT (service_role) : la clé étrangère
    // composite refuse une bannière dans l'emplacement du pin.
    await rejects(() => db.query("insert into public.profile_cosmetics_2026(user_id,slot,item_id) values($1,'pin','banner_trame')", [id(3)]),
      'violates foreign key constraint');
  });

  await test('un seul objet par emplacement, et « retirer » remet l’objet livré', async () => {
    await as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_chartreuse')"));
    assert.equal(Number(await one("select count(*) from public.profile_cosmetics_2026 where user_id=$1 and slot='nameColor'", [id(1)])), 1);
    assert.equal(await one("select item_id from public.profile_cosmetics_2026 where user_id=$1 and slot='nameColor'", [id(1)]), 'name_chartreuse');
    const off = await as(id(1), () => one("select public.equip_cosmetic_2026('nameColor',null)"));
    assert.equal(off.equipped, false);
    assert.equal(Number(await one("select count(*) from public.profile_cosmetics_2026 where user_id=$1 and slot='nameColor'", [id(1)])), 0);
  });

  await test('un compte en cours de suppression n’équipe plus rien', async () => {
    await db.query('update public.users set deletion_requested_at=now() where id=$1', [id(4)]);
    await rejects(() => as(id(4), () => one("select public.equip_cosmetic_2026('pin','pin_goutte')")), 'account_unavailable');
    await db.query('update public.users set deletion_requested_at=null where id=$1', [id(4)]);
  });

  // ══ 3. AUCUN EFFET DE JEU ════════════════════════════════════════════════
  await test('équiper ne touche NI les XP, NI le registre, NI aucune possession', async () => {
    const avant = await one("select ledger from public.progress_accounts_2026 where user_id=$1", [id(1)]);
    const versionAvant = await one("select version from public.progress_accounts_2026 where user_id=$1", [id(1)]);
    await as(id(1), () => one("select public.equip_cosmetic_2026('cardTheme','card_sombre')"));
    await as(id(1), () => one("select public.equip_cosmetic_2026('titleBadge','title_simple')"));
    assert.deepEqual(await one("select ledger from public.progress_accounts_2026 where user_id=$1", [id(1)]), avant);
    assert.equal(await one("select version from public.progress_accounts_2026 where user_id=$1", [id(1)]), versionAvant);
    assert.equal(Number(await one('select coalesce(sum(xp_awarded),0) from public.runs where user_id=$1', [id(1)])), 0);
    // Et la table n'a AUCUNE colonne qui puisse porter un avantage.
    const colonnes = (await q(`select column_name from information_schema.columns
      where table_schema='public' and table_name='profile_cosmetics_2026'`)).map(r => r.column_name).sort();
    assert.deepEqual(colonnes, ['equipped_at', 'item_id', 'slot', 'user_id']);
  });

  await test('ma lecture ne rend QUE mes objets', async () => {
    const mien = await as(id(1), () => one('select public.get_profile_cosmetics_2026()'));
    assert.equal(mien.trace, 'trace_neon');
    assert.equal(mien.pin, 'pin_couronne');
    const autre = await as(id(5), () => one('select public.get_profile_cosmetics_2026()'));
    assert.deepEqual(autre, {}, 'la lecture d’un compte vide ne doit rien emprunter à un autre');
  });

  // ══ 4. LA LECTURE PUBLIQUE (0181) NE FAIT PAS FUIR LA TRACE ══════════════
  // Le compte 1 porte de quoi éprouver la sortie : deux emplacements PUBLICS
  // (la couleur du nom, la bannière) en plus du pin, du badge de titre, et
  // DEUX emplacements PRIVÉS déjà équipés (la trace, le thème de carte).
  await as(id(1), () => one("select public.equip_cosmetic_2026('nameColor','name_lave')"));
  await as(id(1), () => one("select public.equip_cosmetic_2026('banner','banner_carbone')"));
  await db.exec(`create table public.user_profiles(user_id uuid primary key references public.users(id),
      handle text unique not null,display_name text,bio text,avatar_path_2026 text,profile_visibility text not null default 'public');
    create table public.follows(follower_id uuid,followee_id uuid);
    create table public.friendships(requester_id uuid,addressee_id uuid,status text);
    create table public.social_blocks_2026(owner_id uuid,target_id uuid);
    create function public.social_profile_visible_2026(p_user_id uuid) returns boolean
      language sql stable as $$ select exists(select 1 from public.user_profiles p
        where p.user_id=p_user_id and (p.profile_visibility='public' or p.user_id=auth.uid())) $$;
    create function public.social_member_2026(p_user_id uuid) returns jsonb language sql stable as $$ select null::jsonb $$;`);
  await db.query("insert into public.user_profiles(user_id,handle,display_name) values($1,'coureur1','Coureur 1'),($2,'coureur5','Coureur 5')", [id(1), id(5)]);
  await db.exec(migration('0181_profile_cosmetics_public_read_2026.sql'));

  await test('un tiers voit les CINQ cosmétiques visibles, et jamais la trace ni le thème', async () => {
    const fiche = await as(id(5), () => one('select public.social_member_2026($1)', [id(1)]));
    assert.equal(fiche.handle, 'coureur1');
    assert.equal(fiche.cosmetics.pin, 'pin_couronne');
    assert.equal(fiche.cosmetics.nameColor, 'name_lave');
    assert.equal(fiche.cosmetics.titleBadge, 'title_simple');
    assert.equal(fiche.cosmetics.banner, 'banner_carbone');
    // Les deux emplacements PRIVÉS : équipés, et absents de la réponse.
    assert.equal('trace' in fiche.cosmetics, false, 'le style de trace d’un tiers n’a rien à faire dans une fiche');
    assert.equal('cardTheme' in fiche.cosmetics, false, 'le thème de partage voyage avec l’image, pas avec la fiche');
    assert.equal(await one("select item_id from public.profile_cosmetics_2026 where user_id=$1 and slot='trace'", [id(1)]), 'trace_neon');
  });

  await test('un profil masqué reste masqué, cosmétiques compris', async () => {
    await db.query("update public.user_profiles set profile_visibility='private' where user_id=$1", [id(1)]);
    assert.equal(await as(id(5), () => one('select public.social_member_2026($1)', [id(1)])), null);
    assert.deepEqual(await as(id(5), () => one('select public.public_profile_cosmetics_2026($1)', [id(1)])), {});
    // Et moi, je me vois toujours.
    assert.equal((await as(id(1), () => one('select public.social_member_2026($1)', [id(1)]))).cosmetics.pin, 'pin_couronne');
    await db.query("update public.user_profiles set profile_visibility='public' where user_id=$1", [id(1)]);
  });

  await test('la lecture publique n’est pas ouverte à anon', async () => {
    assert.equal(await one("select has_function_privilege('anon','public.public_profile_cosmetics_2026(uuid)','execute')"), false);
    assert.equal(await one("select has_function_privilege('authenticated','public.public_profile_cosmetics_2026(uuid)','execute')"), true);
  });

  console.log(`\n${passed} tests OK`);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.close();
}
