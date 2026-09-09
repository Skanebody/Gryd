// GRYD — 0136 : la purge de compte emporte AUSSI les médias du bucket
// `social-2026`. PGlite est superutilisateur : ce fichier prouve le SQL (la
// clause `delete`, le préfixe exact, les privilèges), jamais l'effet d'une
// policy sur un rôle restreint ni le nettoyage du blob côté service Storage.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => {
  await fn();
  console.log(`ok ${++passed} - ${name}`);
};

/** Le SEUL morceau de 0046 dont ce test a besoin : la fonction de purge. */
function purgeFrom(file) {
  const sql = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
  const start = sql.indexOf('create or replace function public.purge_due_accounts()');
  const end = sql.indexOf('end $$;', start) + 'end $$;'.length;
  assert.ok(start > 0 && end > start, `purge_due_accounts introuvable dans ${file}`);
  return sql.slice(start, end);
}

/** Deux comptes : l'un demande sa suppression il y a longtemps, l'autre non. */
const seed = async () => {
  await db.exec('delete from storage.objects; delete from auth.users;');
  await db.query("insert into auth.users values($1),($2)", [id(1), id(2)]);
  await db.query(
    "insert into public.users values($1,now()-interval '90 days'),($2,null)",
    [id(1), id(2)],
  );
  await db.query(
    `insert into storage.objects(bucket_id,name) values
      ('social-2026',$1),('social-2026',$2),('social-2026',$3),('other-bucket',$4)`,
    [
      `${id(1)}/avatar/${id(101)}.jpg`,
      `${id(1)}/post/${id(102)}.jpg`,
      `${id(2)}/avatar/${id(103)}.jpg`,
      `${id(1)}/avatar/${id(104)}.jpg`,
    ],
  );
};

const remaining = () => q('select bucket_id,name from storage.objects order by name');

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema storage;
    grant usage on schema auth,storage to authenticated,service_role;
    create table auth.users(id uuid primary key);
    create table public.users(id uuid primary key references auth.users(id) on delete cascade,
      deletion_requested_at timestamptz);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function public.account_deletion_grace_days() returns integer language sql as $$ select 30 $$;`);

  // ── ÉTAPE 0 : LE DÉFAUT EXISTAIT ─────────────────────────────────────────
  await db.exec(purgeFrom('0046_account_deletion_grace.sql'));
  await seed();
  await test('étape 0 — avant 0136, la purge laisse les médias du compte effacé', async () => {
    assert.equal(await one('select purge_due_accounts()'), 1);
    assert.equal(await one('select count(*)::int from public.users'), 1, 'le compte échu est parti');
    const left = await remaining();
    // Les deux images du compte purgé sont TOUJOURS là. Un visage, dans un
    // bucket, après un droit à l'effacement exercé.
    assert.equal(left.filter((o) => o.name.startsWith(id(1))).length, 3);
    assert.equal(left.length, 4);
  });

  // ── LA MIGRATION ─────────────────────────────────────────────────────────
  await db.exec(readFileSync(new URL('../migrations/0136_purge_account_media_2026.sql', import.meta.url), 'utf8'));

  await test('0136 emporte les médias `social-2026` du compte purgé, et eux seuls', async () => {
    await seed();
    assert.equal(await one('select purge_due_accounts()'), 1);
    const left = await remaining();
    assert.deepEqual(
      left.map((o) => `${o.bucket_id}:${o.name}`),
      [
        // le média d'un AUTRE bucket n'est pas gouverné par 0124 : intact.
        `other-bucket:${id(1)}/avatar/${id(104)}.jpg`,
        // l'avatar du compte NON échu : intact.
        `social-2026:${id(2)}/avatar/${id(103)}.jpg`,
      ],
    );
  });

  await test('un compte NON échu ne perd ni son compte ni ses médias', async () => {
    await seed();
    await db.query("update public.users set deletion_requested_at=now() where id=$1", [id(1)]);
    assert.equal(await one('select purge_due_accounts()'), 0);
    assert.equal(await one('select count(*)::int from public.users'), 2);
    assert.equal((await remaining()).length, 4);
  });

  await test('le préfixe est un SEGMENT, jamais un `like` : un chemin voisin survit', async () => {
    await seed();
    // Un chemin qui COMMENCE par les mêmes caractères mais appartient à un
    // autre compte : un `like 'uuid%'` l'aurait emporté.
    const neighbour = `${id(1)}extra/avatar/${id(105)}.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('social-2026',$1)", [neighbour]);
    assert.equal(await one('select purge_due_accounts()'), 1);
    assert.equal(
      (await remaining()).some((o) => o.name === neighbour),
      true,
      'le média du voisin ne doit pas partir',
    );
  });

  await test('la purge reste service_role : ni public, ni anon, ni authenticated', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await one("select has_function_privilege($1,'public.purge_due_accounts()','execute')", [role]), false);
    }
    assert.equal(await one("select has_function_privilege('service_role','public.purge_due_accounts()','execute')"), true);
    assert.equal(
      await one(
        `select coalesce(bool_or(a.privilege_type='EXECUTE'),false) from pg_proc p,
           aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
         where p.oid='public.purge_due_accounts()'::regprocedure and a.grantee=0`,
      ),
      false,
    );
  });

  await test('la lignée territoriale reste DÉCLARÉE : 0118 garde ses `set null`', async () => {
    // On ne change pas la cascade — on vérifie qu'elle est toujours celle que
    // la politique de confidentialité décrit. Si quelqu'un la passait en
    // cascade un jour, le texte légal deviendrait faux sans prévenir.
    const polygon = readFileSync(new URL('../migrations/0118_refonte_2026_polygon_authority.sql', import.meta.url), 'utf8');
    const block = polygon.slice(
      polygon.indexOf('create table public.capture_events_2026'),
      polygon.indexOf('create index capture_events_2026_order'),
    );
    assert.match(block, /run_id uuid references public\.runs\(id\) on delete set null/);
    assert.match(block, /owner_id uuid references public\.users\(id\) on delete set null/);
  });

  console.log(`${passed} contrôles PostgreSQL passés (0136). Le blob Storage n'est PAS testé ici.`);
} finally {
  await db.close();
}
