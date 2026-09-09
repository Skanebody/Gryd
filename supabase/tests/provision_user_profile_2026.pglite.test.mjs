// GRYD — 0154 : l'inscription provisionne aussi `user_profiles`.
//
// ═══ CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS ═════════════════════
// PGlite tourne en SUPERUTILISATEUR et n'a PAS PostGIS. Il ne prouve donc ni
// l'effet d'une policy sur un rôle restreint, ni la moindre géométrie. Ce qu'il
// prouve — et c'est exactement le défaut de la recette du 10/09/2026 — c'est la
// CHAÎNE : trigger d'inscription → ligne `user_profiles` → clause `exists(...)`
// de `get_ownership_2026`. La géométrie est remplacée par des bouchons DÉCLARÉS
// plus bas ; le filtre qui décide, lui, est celui du VRAI fichier 0126, lu sur
// le disque et jamais recopié à la main.
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT : avec la seule 0028, un compte créé n'a AUCUNE
// ligne de profil, et `get_ownership_2026` ne rend alors aucune possession —
// pas même au propriétaire, puisque le filtre s'applique aussi quand
// `o.owner_id = auth.uid()`. Le premier test ci-dessous le constate.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
// ⚠️ LE COMPTEUR EST EN TÊTE DE L'UUID, ET C'EST INDISPENSABLE. Le pseudo de
// 0028 comme le @handle de 0154 dérivent des 12 PREMIERS caractères
// hexadécimaux : des identifiants qui ne diffèrent que par la fin (le gabarit
// habituel de ces tests) produiraient tous le même pseudo, et 0028 échouerait
// sur `users_pseudo_key` avant même d'atteindre le profil.
const id = (n) => `${String(n).padStart(8, '0')}-0000-0000-0000-000000000000`;
/** Le @handle que 0028/0154 dérivent de cet identifiant (12 premiers hex). */
const derived = (n) => `runner_${String(n).padStart(8, '0')}0000`;
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
const sql = (file) => readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
/** Découpe un `create function … $$;` dans le SOURCE d'une migration (jamais un copier-coller). */
const fnFrom = (file, name) => {
  const src = sql(file);
  const start = src.indexOf(`create function public.${name}`);
  assert.ok(start >= 0, `${name} introuvable dans ${file}`);
  const end = src.indexOf('$$;', start);
  assert.ok(end > start, `fin de ${name} introuvable dans ${file}`);
  return src.slice(start, end + 3);
};

try {
  // ── Le décor minimal : rôles, `auth`, et les tables que la lecture touche ──
  // `public.users` est réduite aux colonnes lues ici. 0028 documente que toutes
  // ses autres colonnes NOT NULL ont un défaut — ce test ne les rejoue pas,
  // c'est la seule simplification côté `users`.
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,service_role;
    create table auth.users(id uuid primary key, email text);
    create table public.users(id uuid primary key, pseudo text not null unique, deletion_requested_at timestamptz);
    create table public.crews(id uuid primary key,name text);
    create table public.crew_members(crew_id uuid,user_id uuid,left_at timestamptz);
    create table public.friendships(requester_id uuid,addressee_id uuid,status text);
    create table public.user_blocks(blocker_id uuid,blocked_pseudo text);
    create table public.challenge_identity_blocks_2026(blocker_id uuid,blocked_user_id uuid);`);

  // ── BOUCHONS POSTGIS, DÉCLARÉS ────────────────────────────────────────────
  // PGlite n'a pas PostGIS. `geometry`/`geography` deviennent des domaines sur
  // `text`, et les quatre fonctions spatiales que la lecture appelle rendent des
  // valeurs constantes. Conséquence à retenir : ce fichier ne dit RIEN de la
  // justesse spatiale (`&&` rend toujours vrai). Il dit ce qu'il annonce — quel
  // PROPRIÉTAIRE passe le filtre, et lequel disparaît.
  await db.exec(`create domain extensions.geometry as text;
    create domain extensions.geography as text;
    create function public.st_asgeojson(g text) returns text language sql immutable as $$ select g $$;
    create function public.st_area(g text) returns float8 language sql immutable as $$ select 12345.0::float8 $$;
    create function public.st_makeenvelope(a float8,b float8,c float8,d float8,srid int) returns text language sql immutable as $$ select 'viewport' $$;
    create function public.gryd_stub_overlaps(a text,b text) returns boolean language sql immutable as $$ select true $$;
    create operator public.&& (leftarg=text, rightarg=text, function=public.gryd_stub_overlaps);`);

  // ── LES VRAIES COLONNES DE `user_profiles`, extraites de 0011 ─────────────
  // Les réécrire ici inventerait les défauts que ce test prétend vérifier.
  const social0011 = sql('0011_social.sql');
  await db.exec(social0011.slice(
    social0011.indexOf('create table if not exists public.user_profiles'),
    social0011.indexOf('-- ═══ 3. friendships'),
  ));

  // Tables de territoire : mêmes COLONNES que 0118 pour ce que la lecture
  // touche, avec la géométrie bouchonnée (0118 n'est pas rejouable sans PostGIS).
  await db.exec(`create table public.capture_events_2026(
      id uuid primary key, owner_id uuid references public.users(id) on delete set null,
      activity text not null check(activity in ('run','bike')),
      geometry extensions.geometry not null,
      status text not null check(status in ('private','pending','scheduled','published','withdrawn')));
    create table public.ownership_2026(
      event_id uuid primary key references public.capture_events_2026(id) on delete cascade,
      owner_id uuid not null references public.users(id) on delete cascade,
      activity text not null check(activity in ('run','bike')),
      geometry extensions.geometry not null,
      controlled_since timestamptz not null);`);

  await db.exec(fnFrom('0122_refonte_2026_crew_challenges.sql', 'challenge_pair_blocked_2026'));
  await db.exec(sql('0123_refonte_2026_territory_read_model.sql').slice(
    0,
    sql('0123_refonte_2026_territory_read_model.sql').indexOf('create or replace function public.capture_result_2026'),
  ));
  await db.exec(sql('0126_refonte_2026_territory_owner_identity.sql'));

  // ── LA LIGNÉE TELLE QU'ELLE EST EN PROD AUJOURD'HUI ──────────────────────
  await db.exec(sql('0028_provision_user_on_signup.sql'));

  const ownership = async (viewer) =>
    as(viewer, async () =>
      await one("select public.get_ownership_2026('run',1.0,49.4,1.2,49.5)"));

  await test('étape 0 — 0028 crée `users`, JAMAIS `user_profiles`', async () => {
    await db.query('insert into auth.users(id,email) values($1,$2)', [id(1), 'un@example.test']);
    assert.equal(await one('select count(*)::int from public.users where id=$1', [id(1)]), 1);
    assert.equal(await one('select pseudo from public.users where id=$1', [id(1)]), derived(1));
    assert.equal(await one('select count(*)::int from public.user_profiles where user_id=$1', [id(1)]), 0);
  });

  await test('étape 0 — le terrain d’un compte neuf n’apparaît à PERSONNE, lui compris', async () => {
    await db.query(
      `insert into public.capture_events_2026(id,owner_id,activity,geometry,status)
       values($1,$2,'run','{"type":"MultiPolygon","coordinates":[]}','published')`,
      [id(90), id(1)],
    );
    await db.query(
      `insert into public.ownership_2026(event_id,owner_id,activity,geometry,controlled_since)
       values($1,$2,'run','{"type":"MultiPolygon","coordinates":[]}',now())`,
      [id(90), id(1)],
    );
    const view = await ownership(1);
    assert.equal(view.contract, 'ownership.2026.3');
    assert.deepEqual(view.features, [], 'sans ligne de profil, la possession est invisible pour son propre auteur');
  });

  // ── LA MIGRATION ─────────────────────────────────────────────────────────
  await db.exec(sql('0154_provision_user_profile_on_signup.sql'));

  await test('0154 rattrape le compte existant — un profil, aux défauts de 0011', async () => {
    const row = (await q(
      'select handle,display_name,profile_visibility,activity_sharing,map_sharing,discreet_mode from public.user_profiles where user_id=$1',
      [id(1)],
    ))[0];
    assert.deepEqual(row, {
      // Même dérivation que le pseudo de 0028 : une seule identité technique.
      handle: derived(1),
      display_name: null,
      profile_visibility: 'crew',
      activity_sharing: 'crew',
      map_sharing: 'simplified',
      discreet_mode: false,
    });
  });

  await test('la possession devient visible — la MÊME lecture 0126 change d’avis', async () => {
    const view = await ownership(1);
    assert.equal(view.features.length, 1);
    const props = view.features[0].properties;
    assert.equal(props.ownerId, id(1));
    assert.equal(props.role, 'mine');
    // `territory_owner_identity_2026` (0126:22) rendait `label: null` faute de
    // ligne : le propriétaire n'avait même pas de nom sur sa propre zone.
    assert.equal(props.owner.label, derived(1));
  });

  await test('un compte créé APRÈS 0154 a sa ligne de profil dans la foulée', async () => {
    await db.query('insert into auth.users(id,email) values($1,$2)', [id(2), 'deux@example.test']);
    const row = (await q('select handle,profile_visibility,map_sharing from public.user_profiles where user_id=$1', [id(2)]))[0];
    assert.deepEqual(row, { handle: derived(2), profile_visibility: 'crew', map_sharing: 'simplified' });
  });

  await test('un @handle DÉJÀ pris ne fait pas échouer l’inscription', async () => {
    // Cas réel : un humain a revendiqué ce handle dans /profil-edit. Le trigger
    // ne doit ni lever (l'inscription échouerait) ni écraser la ligne d'autrui.
    await db.query('insert into auth.users(id,email) values($1,$2)', [id(3), 'trois@example.test']);
    // Le joueur 3 s'attribue le handle que le joueur 4 obtiendrait par dérivation.
    await db.query('update public.user_profiles set handle=$2 where user_id=$1', [id(3), derived(4)]);
    await db.query('insert into auth.users(id,email) values($1,$2)', [id(4), 'quatre@example.test']);
    const taken = await one('select user_id from public.user_profiles where handle=$1', [derived(4)]);
    assert.equal(taken, id(3), 'la ligne du premier n’est pas touchée');
    const mine = await one('select handle from public.user_profiles where user_id=$1', [id(4)]);
    assert.ok(mine !== null && mine !== derived(4));
    assert.ok(/^[a-z0-9_]{3,20}$/.test(mine), `le handle de repli respecte la contrainte 0011 : ${mine}`);
  });

  await test('le handle dérivé est STABLE — deux appels rendent la même valeur', async () => {
    const a = await one('select public.gryd_default_profile_handle($1)', [id(7)]);
    const b = await one('select public.gryd_default_profile_handle($1)', [id(7)]);
    assert.equal(a, b);
    assert.ok(/^[a-z0-9_]{3,20}$/.test(a));
  });

  await test('0154 est IDEMPOTENTE — la rejouer ne crée ni ne modifie rien', async () => {
    const before = await q('select user_id,handle,created_at from public.user_profiles order by user_id');
    await db.exec(sql('0154_provision_user_profile_on_signup.sql'));
    const after = await q('select user_id,handle,created_at from public.user_profiles order by user_id');
    assert.deepEqual(after, before);
  });

  await test('un compte SANS ligne de profil est réparé par un simple rejeu', async () => {
    await db.query('delete from public.user_profiles where user_id=$1', [id(2)]);
    assert.equal(await one('select count(*)::int from public.user_profiles where user_id=$1', [id(2)]), 0);
    await db.exec(sql('0154_provision_user_profile_on_signup.sql'));
    assert.equal(await one('select count(*)::int from public.user_profiles where user_id=$1', [id(2)]), 1);
  });

  await test('la fonction de handle n’est pas offerte au client', async () => {
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(
        await one(
          `select has_function_privilege($1,'public.gryd_default_profile_handle(uuid)','execute')`,
          [role],
        ),
        false,
        `${role} ne doit pas pouvoir appeler la dérivation de handle`,
      );
    }
    assert.equal(
      await one(`select has_function_privilege('service_role','public.gryd_default_profile_handle(uuid)','execute')`),
      true,
    );
  });

  console.log(`\n${passed} tests verts — 0154.`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
