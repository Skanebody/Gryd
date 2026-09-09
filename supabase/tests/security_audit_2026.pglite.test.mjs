#!/usr/bin/env node
/**
 * GRYD — AUDIT DE SÉCURITÉ 2026 : les trous que la migration 0129 referme.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * Trois défauts ont été TROUVÉS EN PRODUCTION le 10/09/2026 (projet `gryd`,
 * sondes lecture seule + `has_function_privilege`) :
 *
 *   1. `sync_club_entitlements(uuid, boolean)` (0027) est SECURITY DEFINER,
 *      ne lit JAMAIS `auth.uid()`, prend l'identifiant de sa victime EN
 *      PARAMÈTRE, et accorde cinq droits premium PERMANENTS
 *      (`expires_at = null`). En prod, `anon` ET `authenticated` peuvent
 *      l'exécuter. Preuve prod : l'appel sous rôle `anon` avec un UUID
 *      inexistant rend `23503` (violation de clé étrangère) — donc le CORPS a
 *      tourné — et non `42501` (privilège refusé).
 *      → anti-pay-to-win (règle 10) contourné avec la seule clé anon publique,
 *        et grief possible : `p_active = false` éteint les droits d'un payeur.
 *
 *   2. `hex_claims_for_city(text)` existe en prod, dans AUCUNE migration de
 *      cette branche (héritée d'un `0018_map_and_crew.sql` d'une branche Cursor
 *      abandonnée, appliquée au projet partagé et jamais retirée). SECURITY
 *      DEFINER, exécutable par `anon`, elle rend jusqu'à 8000 revendications
 *      avec `owner_user_id` — en contournant la RLS de `hex_claims` ET le
 *      filtre `map_sharing` que 0087/0089 imposent à `public_hex_claims`.
 *
 *   3. `anon` détient TRUNCATE sur 68 tables publiques (défaut Supabase
 *      `grant all on tables`). PostgREST ne sait pas l'émettre aujourd'hui —
 *      ce privilège n'a aucune raison d'exister pour autant.
 *
 * ═══ CE QUE LE TEST FAIT, DANS CET ORDRE ════════════════════════════════════
 * ÉTAPE 0 — il REJOUE le défaut sur un vrai Postgres : les migrations réelles
 * 0026/0027 s'appliquent, la fonction orpheline est recréée TELLE QU'ELLE EST
 * EN PROD, et l'attaque réussit. Sans cette étape, rien ne distinguerait 0129
 * d'un no-op.
 * ÉTAPE 1 — il applique `0129_security_audit_2026.sql` et rejoue les mêmes
 * attaques : elles échouent.
 *
 * ═══ CE QU'IL N'EST PAS ═════════════════════════════════════════════════════
 * PGlite n'a ni PostgREST ni GoTrue. `auth.uid()` / `auth.role()` sont des
 * bouchons. En revanche `set role anon` fait de la session un rôle NON
 * superutilisateur : les GRANTS et la RLS s'appliquent pour de bon, et c'est
 * précisément ce qui rend l'étape 0 probante.
 *
 * `alter default privileges ... grant execute on functions to anon,
 * authenticated` est REJOUÉ ICI parce que c'est le mécanisme exact de Supabase
 * qui a rendu le `revoke ... from public` de 0027 inopérant. Sans lui, le test
 * verrait un faux vert.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(`NON EXÉCUTÉ — PGlite est introuvable : ${err.message}`);
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
const ok = (cond, what) => { if (!cond) throw new Error(what); };
const eq = (a, e, what) => {
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    throw new Error(`${what} : attendu ${JSON.stringify(e)}, obtenu ${JSON.stringify(a)}`);
  }
};

/** Exécute `sql` sous un rôle réel puis revient. Rend { ok } ou { code }. */
const asRole = async (role, sql) => {
  await db.exec(`set role ${role};`);
  try {
    const res = await db.query(sql);
    return { ok: true, rows: res.rows };
  } catch (err) {
    return { ok: false, code: err.code ?? null, message: err.message };
  } finally {
    await db.exec('reset role;');
  }
};

const VICTIME = '11111111-1111-1111-1111-111111111111';
const ATTAQUANT = '22222222-2222-2222-2222-222222222222';

const db = new PGlite();

// ─── Socle : ce que Supabase pose AVANT la première migration ───────────────
await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('gryd.uid', true), '')::uuid $$;
  create function auth.role() returns text language sql stable
    as $$ select nullif(current_setting('gryd.role', true), '') $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
  -- LE MECANISME COUPABLE, rejoue a l'identique : Supabase donne d'office
  -- EXECUTE et ALL ON TABLES a anon/authenticated sur tout ce que le role
  -- postgres cree ensuite dans public. Un revoke ... from public ne les atteint pas.
  -- Reproduction FIDELE de pg_default_acl de la prod (owner postgres, schema
  -- public) : {postgres=X, anon=X, authenticated=X, service_role=X} pour les
  -- fonctions -- PUBLIC n'y figure pas, et c'est precisement pourquoi les
  -- \"revoke ... from public\" de 0026/0027 ne retiraient rien.
  alter default privileges in schema public revoke execute on functions from public;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

  create table public.users (
    id uuid primary key,
    pseudo text,
    deletion_requested_at timestamptz
  );
  insert into public.users (id, pseudo) values ('${VICTIME}', 'victime'), ('${ATTAQUANT}', 'attaquant');
  alter table public.users enable row level security;
  create policy users_select_self on public.users for select to authenticated
    using (id = (select auth.uid()));

  create table public.user_profiles (
    user_id uuid primary key references public.users(id) on delete cascade,
    map_sharing text not null default 'none'
  );
  insert into public.user_profiles values ('${VICTIME}', 'none');

  create table public.crew_members (
    crew_id uuid, user_id uuid references public.users(id) on delete cascade, left_at timestamptz
  );
  create table public.hex_claims (
    h3index bigint primary key,
    owner_user_id uuid references public.users(id) on delete cascade,
    city_id text,
    claim_type text,
    claimed_at timestamptz default now(),
    decay_at timestamptz,
    shielded_until timestamptz
  );
  insert into public.hex_claims (h3index, owner_user_id, city_id, claim_type)
    values (613196750812971007, '${VICTIME}', 'rouen', 'neutral');
  alter table public.hex_claims enable row level security;
  revoke all on public.hex_claims from anon, authenticated;

  create table public.sectors (id text primary key, total_hexes int not null default 10);
  insert into public.sectors values ('s1', 10);
  create materialized view public.sector_control as
    select s.id as sector_id, 1 as owned_hexes from public.sectors s;
  grant select on public.sector_control to authenticated;
`);

console.log('audit de sécurité 2026 — les trous trouvés en prod, puis 0129\n');

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT EXISTAIT. Les migrations réelles, puis l'attaque.
// ═══════════════════════════════════════════════════════════════════════════
await db.exec(readFileSync(join(MIGRATIONS, '0026_feature_entitlements.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0027_club_entitlements.sql'), 'utf8'));

// La fonction orpheline TELLE QU'ELLE EST EN PROD (relevée par
// `pg_get_functiondef` le 10/09/2026). Elle n'est dans aucune migration : sans
// cette recréation, le test ne pourrait pas prouver ce que 0129 supprime.
await db.exec(`
  create or replace function public.hex_claims_for_city(p_city_id text)
  returns table(h3index bigint, owner_user_id uuid, claim_type text, decay_at timestamptz,
                shielded_until timestamptz, owner_crew_id uuid)
  language sql stable security definer set search_path to 'public'
  as $$
    select hc.h3index, hc.owner_user_id, hc.claim_type, hc.decay_at, hc.shielded_until,
      (select cm.crew_id from public.crew_members cm
        where cm.user_id = hc.owner_user_id and cm.left_at is null limit 1) as owner_crew_id
    from public.hex_claims hc
    where hc.city_id = p_city_id and hc.owner_user_id is not null
    limit 8000;
  $$;
`);

await t('étape 0 — anon N’A PAS le droit de lire hex_claims en direct', async () => {
  const r = await asRole('anon', 'select count(*) from public.hex_claims');
  eq(r.ok, false, 'la lecture directe doit être refusée');
  eq(r.code, '42501', 'code attendu : privilège insuffisant');
});

await t('étape 0 — mais anon lit TOUT par hex_claims_for_city (contournement RLS + map_sharing)', async () => {
  const r = await asRole('anon', `select owner_user_id::text as o from public.hex_claims_for_city('rouen')`);
  ok(r.ok, `l’appel aurait dû réussir : ${r.message ?? ''}`);
  eq(r.rows.length, 1, 'une revendication rendue');
  eq(r.rows[0].o, VICTIME, 'l’identifiant du propriétaire fuit');
  const sharing = (await db.query(
    `select map_sharing from public.user_profiles where user_id = $1`, [VICTIME])).rows[0].map_sharing;
  eq(sharing, 'none', 'la victime a pourtant refusé le partage de carte');
});

await t('étape 0 — anon accorde 5 droits premium PERMANENTS à un compte tiers', async () => {
  const r = await asRole('anon', `select public.sync_club_entitlements('${VICTIME}'::uuid, true)`);
  ok(r.ok, `l’attaque aurait dû passer : ${r.message ?? ''}`);
  const rows = (await db.query(
    `select feature_key, is_active, expires_at from public.feature_entitlements
      where user_id = $1 order by feature_key`, [VICTIME])).rows;
  eq(rows.length, 5, 'cinq droits accordés sans aucun achat');
  ok(rows.every((x) => x.is_active === true && x.expires_at === null), 'tous actifs et sans expiration');
});

await t('étape 0 — authenticated éteint les droits d’un AUTRE compte (grief)', async () => {
  await db.exec(`set gryd.uid = '${ATTAQUANT}'; set gryd.role = 'authenticated';`);
  const r = await asRole('authenticated', `select public.sync_club_entitlements('${VICTIME}'::uuid, false)`);
  ok(r.ok, `la révocation croisée aurait dû passer : ${r.message ?? ''}`);
  const actifs = (await db.query(
    `select count(*)::int as n from public.feature_entitlements where user_id = $1 and is_active`,
    [VICTIME])).rows[0].n;
  eq(actifs, 0, 'les droits du tiers sont éteints par un inconnu');
});

await t('étape 0 — anon détient TRUNCATE sur les tables du jeu', async () => {
  const r = (await db.query(
    `select has_table_privilege('anon', 'public.users', 'TRUNCATE') as u,
            has_table_privilege('authenticated', 'public.users', 'TRUNCATE') as h`)).rows[0];
  eq([r.u, r.h], [true, true], 'TRUNCATE accordé par défaut aux deux rôles clients');
});

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 1 — LA MIGRATION 0129. Les mêmes attaques, rejouées.
// ═══════════════════════════════════════════════════════════════════════════
await db.exec(`insert into public.feature_entitlements (user_id, feature_key, source, is_active)
  values ('${VICTIME}', 'advanced_stats', 'pass', true);`);
await db.exec(readFileSync(join(MIGRATIONS, '0129_security_audit_2026.sql'), 'utf8'));

await t('0129 — hex_claims_for_city n’existe plus', async () => {
  const n = (await db.query(
    `select count(*)::int as n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'public' and p.proname = 'hex_claims_for_city'`)).rows[0].n;
  eq(n, 0, 'la fonction orpheline doit être supprimée');
  const r = await asRole('anon', `select * from public.hex_claims_for_city('rouen')`);
  eq(r.ok, false, 'l’appel doit échouer');
});

await t('0129 — anon ne peut plus exécuter sync_club_entitlements', async () => {
  const priv = (await db.query(
    `select has_function_privilege('anon', 'public.sync_club_entitlements(uuid,boolean)', 'EXECUTE') as a,
            has_function_privilege('authenticated', 'public.sync_club_entitlements(uuid,boolean)', 'EXECUTE') as u,
            has_function_privilege('service_role', 'public.sync_club_entitlements(uuid,boolean)', 'EXECUTE') as s`)).rows[0];
  eq([priv.a, priv.u, priv.s], [false, false, true], 'seul service_role garde le droit');
  const r = await asRole('anon', `select public.sync_club_entitlements('${VICTIME}'::uuid, true)`);
  eq(r.ok, false, 'l’appel doit être refusé');
  eq(r.code, '42501', 'refus de privilège');
});

await t('0129 — même RE-DONNÉ, le droit ne suffit pas : la garde interne refuse', async () => {
  await db.exec(`grant execute on function public.sync_club_entitlements(uuid, boolean) to authenticated;`);
  await db.exec(`set gryd.uid = '${ATTAQUANT}'; set gryd.role = 'authenticated';`);
  const r = await asRole('authenticated', `select public.sync_club_entitlements('${VICTIME}'::uuid, true)`);
  eq(r.ok, false, 'la garde interne doit refuser');
  ok(/not_authorized/.test(r.message ?? ''), `motif attendu not_authorized, obtenu : ${r.message}`);
  await db.exec(`revoke execute on function public.sync_club_entitlements(uuid, boolean) from authenticated;`);
});

await t('0129 — le service, lui, passe toujours (le webhook n’est pas cassé)', async () => {
  await db.exec(`set gryd.role = 'service_role';`);
  const r = await asRole('service_role', `select public.sync_club_entitlements('${ATTAQUANT}'::uuid, true)`);
  ok(r.ok, `service_role doit rester capable : ${r.message ?? ''}`);
  const n = (await db.query(
    `select count(*)::int as n from public.feature_entitlements where user_id = $1 and is_active`,
    [ATTAQUANT])).rows[0].n;
  eq(n, 5, 'les cinq droits sont bien accordés par le chemin légitime');
});

await t('0129 — les droits déjà accordés ne sont PAS effacés (aucune donnée détruite)', async () => {
  const n = (await db.query(
    `select count(*)::int as n from public.feature_entitlements where user_id = $1`, [VICTIME])).rows[0].n;
  ok(n >= 5, `les lignes existantes survivent à la migration (${n})`);
});

await t('0129 — TRUNCATE / REFERENCES / TRIGGER retirés à anon et authenticated', async () => {
  const r = (await db.query(
    `select bool_or(has_table_privilege('anon', c.oid, 'TRUNCATE')) as t_anon,
            bool_or(has_table_privilege('authenticated', c.oid, 'TRUNCATE')) as t_auth,
            bool_or(has_table_privilege('anon', c.oid, 'REFERENCES')) as r_anon,
            bool_or(has_table_privilege('anon', c.oid, 'TRIGGER')) as g_anon
       from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and c.relkind = 'r'`)).rows[0];
  eq([r.t_anon, r.t_auth, r.r_anon, r.g_anon], [false, false, false, false],
    'plus aucun TRUNCATE/REFERENCES/TRIGGER pour les rôles clients');
});

await t('0129 — la lecture légitime des tables ouvertes n’est pas touchée', async () => {
  const r = (await db.query(
    `select has_table_privilege('authenticated', 'public.users', 'SELECT') as s,
            has_table_privilege('anon', 'public.users', 'SELECT') as a`)).rows[0];
  eq([r.s, r.a], [true, true], 'SELECT intact : 0129 ne referme que ce qui est inutile');
});

await t('0129 — aucune fonction TRIGGER n’est exécutable par anon/authenticated', async () => {
  const rows = (await db.query(
    `select p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'public' and p.prorettype = 'trigger'::regtype
        and (has_function_privilege('anon', p.oid, 'EXECUTE')
          or has_function_privilege('authenticated', p.oid, 'EXECUTE'))`)).rows;
  eq(rows.map((r) => r.proname), [], 'aucune fonction de trigger ouverte aux clients');
});

await t('0129 — la vue MATÉRIALISÉE sector_control n’est plus lisible par un client', async () => {
  const r = (await db.query(
    `select has_table_privilege('anon', 'public.sector_control', 'SELECT') as a,
            has_table_privilege('authenticated', 'public.sector_control', 'SELECT') as u,
            has_table_privilege('service_role', 'public.sector_control', 'SELECT') as s`)).rows[0];
  eq([r.a, r.u, r.s], [false, false, true],
    'une matview n’a pas de RLS : seul le service la lit');
  const call = await asRole('authenticated', 'select count(*) from public.sector_control');
  eq(call.ok, false, 'la lecture cliente doit être refusée');
});

await t('0129 — le défaut nommé anon/authenticated a disparu de pg_default_acl', async () => {
  const acl = (await db.query(
    `select coalesce(string_agg(defaclacl::text, ' '), '') as a from pg_default_acl
      where defaclobjtype = 'f'`)).rows[0].a;
  ok(!/\banon=/.test(acl), `anon ne doit plus figurer au défaut : ${acl}`);
  ok(!/\bauthenticated=/.test(acl), `authenticated ne doit plus figurer au défaut : ${acl}`);
  ok(/service_role=/.test(acl), `le service, lui, doit rester au défaut : ${acl}`);
});

// ═══ LA LIMITE, ÉCRITE PLUTÔT QUE TUE ═══════════════════════════════════════
// Ce test échouerait si quelqu'un croyait avoir « fermé les fonctions par
// défaut ». Postgres fusionne toujours acldefault() — qui donne EXECUTE à
// PUBLIC — par-dessus pg_default_acl : une fonction créée après 0129 reste
// jointe par anon. C'est mesuré ici pour que personne ne s'appuie sur une
// garantie qui n'existe pas ; la vraie application est dans verify:rls.
await t('LIMITE MESURÉE — une fonction neuve reste jointe par anon via PUBLIC', async () => {
  await db.exec(`create function public.piege_futur_2026() returns int language sql as $$ select 1 $$;`);
  const r = (await db.query(
    `select has_function_privilege('anon', 'public.piege_futur_2026()', 'EXECUTE') as a,
            (select proacl::text from pg_proc where proname = 'piege_futur_2026') as acl`)).rows[0];
  eq(r.a, true,
    'si ceci devient false, Postgres a changé : relire la section 6 de 0129 et verify:rls');
  ok(/=X\//.test(r.acl), `la trace du grant PUBLIC doit être visible : ${r.acl}`);
  const explicite = (await db.query(
    `select public.piege_futur_2026()`)) && null;
  ok(explicite === null, 'la fonction existe bien');
});

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} échec(s) sur ${passed + failures.length}.`);
  for (const f of failures) console.error(`  ${f.name}\n    ${f.err.stack ?? f.err.message}`);
  await db.close();
  process.exit(1);
}
console.log(`${passed} vérifications de sécurité passées (défaut rejoué, puis 0129 appliquée).`);
await db.close();
