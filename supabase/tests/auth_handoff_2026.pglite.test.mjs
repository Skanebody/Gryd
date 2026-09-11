// GRYD — 0198 : LA PAGE WEB VALIDE, ET L'APP SE CONNECTE TOUTE SEULE.
//
// Décision du fondateur, 12/09/2026 : « vas juste vers une page qui dit que ça
// a été bien validé mais derrière il faut que le compte fonctionne dans
// l'application ».
//
// ═══ CE QUE CE FICHIER PROUVE, DANS L'ORDRE ═════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il est REJOUÉ sur un vrai Postgres : avant
//   0198, la base n'offre AUCUN point de rendez-vous entre le navigateur qui a
//   vérifié le lien et le téléphone qui l'a demandé — ni table, ni RPC de dépôt,
//   ni RPC de réclamation. Un navigateur qui vérifie consomme le haché (usage
//   unique) et le garde pour lui : l'app ne peut rien apprendre. Sans cette
//   étape, rien ne distinguerait ce lot d'un no-op.
//
// PUIS 0198, et les garanties du lot :
//   · dépôt par une session, puis UNE réclamation qui rend le jeton et le type ;
//   · la deuxième réclamation ne rend rien, et le jeton a disparu de la ligne ;
//   · une remise échue ne rend rien, même jamais consommée ;
//   · un nonce inconnu, et un nonce malformé, ne rendent rien — et ne DISENT
//     rien de différent l'un de l'autre (pas d'oracle d'énumération) ;
//   · `anon` ne peut pas déposer (aucun `auth.uid()`) ;
//   · une remise consommée ne se re-remplit jamais (anti-rejeu) ;
//   · deux comptes ne s'écrasent pas sur une même empreinte ;
//   · la table n'est lisible par personne : RLS activée SANS policy, et les
//     privilèges retirés à `anon` comme à `authenticated` ;
//   · la purge efface les échues, garde les vivantes, et est idempotente.
//
// ⚠️ CE QUE PGlite NE PROUVE PAS. Il tourne en SUPERUTILISATEUR et n'a pas
// `pg_cron`. Donc :
//   · la RLS n'est pas prouvée par son EFFET — seulement par le fait que la
//     table l'active, qu'elle n'a AUCUNE policy, et que les GRANTS sont retirés
//     (`has_table_privilege`) ;
//   · le schéma `cron` n'existe pas : le `do $$ … $$` conditionnel de 0198 ne
//     pose rien, et l'ordonnancement est prouvé sur le TEXTE de la migration.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
const apply = (name) => db.exec(migration(name));

/** 64 caractères hexadécimaux : la forme EXACTE que l'app produit (32 octets). */
const nonce = (seed) => seed.repeat(64).slice(0, 64);
const NONCE_A = nonce('a1b2c3d4');
const NONCE_B = nonce('9f8e7d6c');

/** Le hachage que la base applique — recalculé ici pour lire la ligne à la main. */
const hashOf = (value) =>
  one("select encode(sha256(convert_to($1,'UTF8')),'hex')", [value]);

const deposit = (n, token, type = null) =>
  one('select public.auth_handoff_deposit_2026($1,$2,$3)', [n, token, type]);
const claim = (n) => one('select public.auth_handoff_claim_2026($1)', [n]);

try {
  // ── LE SOCLE : ce dont 0198 a besoin, et rien de plus ─────────────────────
  // `auth.users` parce que la remise est rattachée au compte qui l'a déposée
  // (cascade de suppression) ; `auth.uid()` parce que le dépôt en fait sa garde.
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;

    insert into auth.users (id) values ('${id(1)}'), ('${id(2)}');
  `);

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ ÉTAPE 0 — LE DÉFAUT EXISTAIT                                           ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('étape 0 — avant 0198, aucune remise de session n’existe en base', async () => {
    assert.equal(await one("select to_regclass('public.auth_handoff_2026') is null"), true);
    assert.equal(
      await one("select to_regprocedure('public.auth_handoff_deposit_2026(text,text,text)') is null"),
      true,
    );
    assert.equal(
      await one("select to_regprocedure('public.auth_handoff_claim_2026(text)') is null"),
      true,
    );
    assert.equal(
      await one("select to_regprocedure('public.purge_auth_handoff_2026()') is null"),
      true,
    );
  });

  await test('étape 0 — aucune migration antérieure ne parle de remise de session', async () => {
    // Le lot n'est pas un renommage : personne, avant 0198, n'avait écrit un
    // point de rendez-vous entre le navigateur et l'app. S'il en existait un,
    // ce fichier devrait le RELIER, pas en poser un second.
    const dir = new URL('../migrations/', import.meta.url);
    const anterieures = readdirSync(dir)
      .filter((f) => f.endsWith('.sql') && f < '0198_')
      .filter((f) => /auth_handoff/i.test(readFileSync(new URL(f, dir), 'utf8')));
    assert.deepEqual(anterieures, []);
  });

  apply('0198_auth_handoff_2026.sql');

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §1 — LE PARCOURS NOMINAL                                               ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('la page web dépose, l’app réclame une fois : jeton ET type', async () => {
    // La page a vérifié le haché : elle a donc une VRAIE session (compte 1).
    assert.equal(await as(1, () => deposit(NONCE_A, 'refresh-token-de-la-page', 'signup')), true);

    // L'app, elle, n'a AUCUNE session — c'est ce qu'elle vient chercher.
    const got = await as(null, () => claim(NONCE_A));
    assert.deepEqual(got, { refresh_token: 'refresh-token-de-la-page', type: 'signup' });
  });

  await test('le jeton a DISPARU de la ligne après la réclamation', async () => {
    const row = (await q(
      'select refresh_token, consumed_at is not null as consumed, user_id from public.auth_handoff_2026 where nonce_hash=$1',
      [await hashOf(NONCE_A)],
    ))[0];
    assert.equal(row.refresh_token, null);
    assert.equal(row.consumed, true);
    assert.equal(row.user_id, id(1));
  });

  await test('la deuxième réclamation ne rend RIEN (usage unique)', async () => {
    assert.equal(await as(null, () => claim(NONCE_A)), null);
    assert.equal(await as(1, () => claim(NONCE_A)), null);
  });

  await test('le nonce en clair n’est écrit NULLE PART — seulement son empreinte', async () => {
    assert.equal(
      Number(await one('select count(*) from public.auth_handoff_2026 where nonce_hash = $1', [NONCE_A])),
      0,
    );
    assert.equal(
      Number(await one('select count(*) from public.auth_handoff_2026 where nonce_hash = $1', [
        await hashOf(NONCE_A),
      ])),
      1,
    );
  });

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §2 — TOUS LES REFUS, ET ILS SE RESSEMBLENT TOUS                        ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('un nonce inconnu ne rend rien', async () => {
    assert.equal(await as(null, () => claim(nonce('0badbeef'))), null);
  });

  await test('un nonce malformé ne rend rien — et ne dit pas qu’il est malformé', async () => {
    for (const bad of ['', 'abc', 'A'.repeat(64), 'zz'.repeat(32), NONCE_A.slice(0, 63)]) {
      assert.equal(await as(null, () => claim(bad)), null, `nonce refusé : « ${bad.slice(0, 12)} »`);
    }
    assert.equal(await as(null, () => claim(null)), null);
  });

  await test('une remise ÉCHUE ne rend rien, même jamais consommée', async () => {
    await as(2, () => deposit(NONCE_B, 'jeton-qui-va-perimer', 'magiclink'));
    // On fait vieillir la ligne à la main : la migration ne sait pas voyager.
    // Les DEUX horodatages reculent ensemble — le `check (expires_at >
    // created_at)` de 0198 refuse une échéance antérieure à la création, et ce
    // refus-là est une garantie du lot, pas un obstacle au test.
    await db.query(
      `update public.auth_handoff_2026
          set created_at = now() - interval '10 minutes',
              expires_at = now() - interval '5 minutes'
        where nonce_hash = $1`,
      [await hashOf(NONCE_B)],
    );
    assert.equal(await as(null, () => claim(NONCE_B)), null);
    // Et elle n'a PAS été marquée consommée : elle est morte d'échéance, pas
    // d'usage. La purge est ce qui l'enlève, pas la réclamation.
    assert.equal(
      await one(
        'select consumed_at is null from public.auth_handoff_2026 where nonce_hash=$1',
        [await hashOf(NONCE_B)],
      ),
      true,
    );
  });

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §3 — LE DÉPÔT EXIGE UNE SESSION                                        ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('anon ne peut pas déposer : sans auth.uid(), rien n’entre', async () => {
    await assert.rejects(
      () => as(null, () => deposit(nonce('11223344'), 'jeton-sans-session')),
      /session est requise/,
    );
    assert.equal(
      Number(await one('select count(*) from public.auth_handoff_2026 where nonce_hash=$1', [
        await hashOf(nonce('11223344')),
      ])),
      0,
    );
  });

  await test('un dépôt refuse un nonce malformé et un jeton vide', async () => {
    await assert.rejects(() => as(1, () => deposit('abc', 'un-jeton-valide')), /forme invalide/);
    await assert.rejects(() => as(1, () => deposit(nonce('55667788'), '')), /hors bornes/);
    await assert.rejects(() => as(1, () => deposit(nonce('55667788'), null)), /hors bornes/);
    await assert.rejects(
      () => as(1, () => deposit(nonce('55667788'), 'x'.repeat(1025))),
      /hors bornes/,
    );
  });

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §4 — ANTI-REJEU                                                        ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('une remise CONSOMMÉE ne se re-remplit jamais', async () => {
    // NONCE_A a déjà été servi au §1. Rouvrir le lien (donc redéposer) doit
    // échouer SILENCIEUSEMENT — sinon le même nonce ouvrirait une seconde
    // session, c'est-à-dire un rejeu.
    assert.equal(await as(1, () => deposit(NONCE_A, 'jeton-de-rejeu', 'signup')), false);
    assert.equal(
      await one('select refresh_token from public.auth_handoff_2026 where nonce_hash=$1', [
        await hashOf(NONCE_A),
      ]),
      null,
    );
    assert.equal(await as(null, () => claim(NONCE_A)), null);
  });

  await test('un redépôt AVANT consommation est accepté (onglet rechargé)', async () => {
    const n = nonce('deadbe12');
    assert.equal(await as(1, () => deposit(n, 'premier-jeton', 'magiclink')), true);
    assert.equal(await as(1, () => deposit(n, 'second-jeton', 'magiclink')), true);
    assert.deepEqual(await as(null, () => claim(n)), {
      refresh_token: 'second-jeton',
      type: 'magiclink',
    });
  });

  await test('deux comptes ne s’écrasent pas sur une même empreinte', async () => {
    const n = nonce('c0ffee34');
    assert.equal(await as(1, () => deposit(n, 'jeton-du-compte-1', 'signup')), true);
    // Compte 2 vise la même empreinte : refusé, sans erreur et sans effet.
    assert.equal(await as(2, () => deposit(n, 'jeton-du-compte-2', 'signup')), false);
    assert.deepEqual(await as(null, () => claim(n)), {
      refresh_token: 'jeton-du-compte-1',
      type: 'signup',
    });
  });

  await test('un type de retour inconnu est refusé par la base', async () => {
    await assert.rejects(
      () => as(1, () => deposit(nonce('aa11bb22'), 'un-jeton-assez-long', 'n-importe-quoi')),
      /callback_type/,
    );
  });

  await test('un dépôt sans type reste réclamable : le type est un bonus, pas une condition', async () => {
    const n = nonce('12ab34cd');
    assert.equal(await as(1, () => deposit(n, 'jeton-sans-type')), true);
    assert.deepEqual(await as(null, () => claim(n)), {
      refresh_token: 'jeton-sans-type',
      type: null,
    });
  });

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §5 — LA TABLE N'EST LISIBLE PAR PERSONNE                               ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('RLS activée, et AUCUNE policy : le refus par défaut est le comportement', async () => {
    assert.equal(
      await one("select relrowsecurity from pg_class where oid='public.auth_handoff_2026'::regclass"),
      true,
    );
    assert.equal(
      Number(await one(
        "select count(*) from pg_policies where schemaname='public' and tablename='auth_handoff_2026'",
      )),
      0,
    );
  });

  await test('aucun client n’a le moindre privilège sur la table', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const priv of ['select', 'insert', 'update', 'delete']) {
        assert.equal(
          await one('select has_table_privilege($1,$2,$3)', [
            role,
            'public.auth_handoff_2026',
            priv,
          ]),
          false,
          `${role} ne doit pas pouvoir ${priv}`,
        );
      }
    }
    assert.equal(
      await one("select has_table_privilege('public','public.auth_handoff_2026','select')"),
      false,
    );
  });

  await test('les privilèges d’exécution disent EXACTEMENT qui appelle quoi', async () => {
    const can = (role, sig) =>
      one('select has_function_privilege($1,$2,$3)', [role, sig, 'execute']);
    // Le dépôt : la page web, donc une session. Jamais anon.
    assert.equal(await can('authenticated', 'public.auth_handoff_deposit_2026(text,text,text)'), true);
    assert.equal(await can('anon', 'public.auth_handoff_deposit_2026(text,text,text)'), false);
    // La réclamation : l'app, qui n'a pas encore de session. Donc anon.
    assert.equal(await can('anon', 'public.auth_handoff_claim_2026(text)'), true);
    assert.equal(await can('authenticated', 'public.auth_handoff_claim_2026(text)'), true);
    // L'oracle de hachage et la purge ne sont à personne.
    assert.equal(await can('anon', 'public.auth_handoff_nonce_hash_2026(text)'), false);
    assert.equal(await can('authenticated', 'public.auth_handoff_nonce_hash_2026(text)'), false);
    assert.equal(await can('anon', 'public.purge_auth_handoff_2026()'), false);
    assert.equal(await can('authenticated', 'public.purge_auth_handoff_2026()'), false);
  });

  await test('les deux RPC sont SECURITY DEFINER avec un search_path figé', async () => {
    const rows = await q(`
      select p.proname, p.prosecdef, array_to_string(p.proconfig,',') as cfg
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='public' and p.proname in
         ('auth_handoff_deposit_2026','auth_handoff_claim_2026','purge_auth_handoff_2026')
       order by p.proname`);
    assert.equal(rows.length, 3);
    for (const row of rows) {
      assert.equal(row.prosecdef, true, `${row.proname} doit être SECURITY DEFINER`);
      assert.match(row.cfg ?? '', /search_path=public, pg_temp/, `${row.proname} : search_path`);
    }
  });

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §6 — LA PURGE                                                          ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('la purge efface les échues, garde les vivantes, et est idempotente', async () => {
    const vivante = nonce('fedcba98');
    await as(2, () => deposit(vivante, 'jeton-encore-frais', 'magiclink'));
    const avant = Number(await one('select count(*) from public.auth_handoff_2026'));
    await db.query(
      `update public.auth_handoff_2026
          set created_at = now() - interval '10 minutes',
              expires_at = now() - interval '5 minutes'
        where nonce_hash <> $1`,
      [await hashOf(vivante)],
    );

    const efface = Number(await one('select public.purge_auth_handoff_2026()'));
    assert.equal(efface, avant - 1);
    assert.equal(Number(await one('select count(*) from public.auth_handoff_2026')), 1);
    // Rien à purger : 0, pas une erreur.
    assert.equal(Number(await one('select public.purge_auth_handoff_2026()')), 0);
    // La vivante est INTACTE et toujours réclamable.
    assert.deepEqual(await as(null, () => claim(vivante)), {
      refresh_token: 'jeton-encore-frais',
      type: 'magiclink',
    });
  });

  await test('la suppression d’un compte emporte ses remises (cascade)', async () => {
    const n = nonce('5a5a5a5a');
    await as(2, () => deposit(n, 'jeton-du-compte-2', 'signup'));
    await db.query('delete from auth.users where id = $1', [id(2)]);
    assert.equal(
      Number(await one('select count(*) from public.auth_handoff_2026 where nonce_hash=$1', [
        await hashOf(n),
      ])),
      0,
    );
  });

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ §7 — L'HORLOGE, PROUVÉE SUR LE TEXTE (PGlite n'a pas pg_cron)          ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  await test('0198 ordonnance la purge, sous un nom, et sans écraser d’autre job', async () => {
    const sql = migration('0198_auth_handoff_2026.sql');
    assert.match(sql, /cron\.schedule\(\s*'auth-handoff-purge-2026'/);
    assert.match(sql, /'\*\/10 \* \* \* \*'/);
    assert.match(sql, /select public\.purge_auth_handoff_2026\(\)/);
    // Conditionnel au schéma `cron` : le fichier reste rejouable hors prod.
    assert.match(sql, /if exists \(select 1 from pg_namespace where nspname = 'cron'\)/);
    // Il ne DÉPLANIFIE rien : ce lot n'a pas de prédécesseur à retirer.
    assert.equal(/cron\.unschedule/.test(sql.split('§6')[1] ?? sql), false);
  });

  await test('0198 ne réécrit AUCUNE migration antérieure', async () => {
    const sql = migration('0198_auth_handoff_2026.sql');
    // Aucune table, aucune fonction d'un autre lot n'est touchée : les seuls
    // objets créés portent tous le nom du lot.
    const touched = [...sql.matchAll(/^\s*(?:create|alter|drop)\s+(?:or replace\s+)?(table|function|index|view|policy)[^\n]*/gim)]
      .map((m) => m[0].trim());
    for (const line of touched) {
      assert.match(
        line,
        /auth_handoff_2026|auth_handoff_nonce_hash_2026|auth_handoff_deposit_2026|auth_handoff_claim_2026|purge_auth_handoff_2026/,
        `0198 ne doit toucher que ses propres objets : « ${line} »`,
      );
    }
  });

  console.log(`\n${passed} assertions — 0198 : la remise de session tient.`);
  await db.close();
} catch (error) {
  console.error(`\n✗ échec après ${passed} assertion(s)`);
  console.error(error);
  await db.close();
  process.exit(1);
}
