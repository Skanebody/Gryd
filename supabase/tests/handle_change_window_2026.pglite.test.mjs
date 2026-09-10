// GRYD — 0175 : le @pseudo se change aux conditions d'Instagram.
//
// ═══ CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS ═════════════════════
// PGlite tourne en SUPERUTILISATEUR : il ne dit RIEN de l'effet d'une policy sur
// un rôle restreint. Ce qu'il prouve, c'est la LOGIQUE — le compteur de la
// fenêtre glissante, la réservation de quatorze jours, l'ordre des refus, et le
// fait que les DEUX chemins d'écriture du handle (`change_my_handle_2026` et
// `save_my_social_profile_2026`) passent par la même porte. Les fonctions sont
// lues sur le disque, jamais recopiées à la main.
//
// ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ════════════════════════════════════════════
// Sur la lignée 0011 + 0047 + 0124 SEULE (l'état de la prod avant ce lot), deux
// tests ci-dessous constatent les trous :
//   · un pseudo libéré est reprenable À LA SECONDE par un tiers ;
//   · aucune cadence n'existe : quatre renommages d'affilée passent.
// Sans ces deux constats, rien ne distinguerait 0175 d'un no-op.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const id = (n) => `${String(n).padStart(8, '0')}-0000-0000-0000-000000000000`;
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
/** Découpe un `create function … $$;` dans le SOURCE d'une migration. */
const fnFrom = (file, name) => {
  const src = sql(file);
  const start = src.indexOf(`create function public.${name}`);
  assert.ok(start >= 0, `${name} introuvable dans ${file}`);
  const end = src.indexOf('$$;', start);
  assert.ok(end > start, `fin de ${name} introuvable dans ${file}`);
  return src.slice(start, end + 3);
};

/** Enregistre un profil par le chemin RÉEL de l'app (RPC 0124, puis 0175). */
const saveProfile = (n, handle, name = 'Nom') =>
  as(n, async () =>
    await one('select public.save_my_social_profile_2026($1::jsonb)', [
      JSON.stringify({ handle, displayName: name, visibility: 'crew' }),
    ]));
const saveRefusal = async (n, handle) => {
  try {
    await saveProfile(n, handle);
    return null;
  } catch (e) {
    return String(e.message ?? e);
  }
};
const change = (n, handle) =>
  as(n, async () => await one('select public.change_my_handle_2026($1)', [handle]));
const status = (n) => as(n, async () => await one('select public.my_handle_status_2026()'));
const available = (n, handle) =>
  as(n, async () => await one('select public.check_handle_available_2026($1)', [handle]));
const handleOf = (n) =>
  one('select handle from public.user_profiles where user_id=$1', [id(n)]);
/** Recule dans le temps les traces d'un joueur : la fenêtre est GLISSANTE. */
const backdateChanges = (n, days) =>
  db.query(
    `update public.handle_changes_2026 set changed_at = changed_at - ($2||' days')::interval where user_id=$1`,
    [id(n), String(days)],
  );
const backdateHolds = (n, days) =>
  db.query(
    `update public.handle_holds_2026 set released_at = released_at - ($2||' days')::interval where held_for=$1`,
    [id(n), String(days)],
  );

try {
  // ── Décor minimal : rôles, auth.uid(), et les tables que ce chemin touche ──
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table auth.users(id uuid primary key, email text);
    create table public.users(id uuid primary key, pseudo text not null unique);
    create table public.crews(id uuid primary key,name text);
    create table public.crew_members(crew_id uuid,user_id uuid,left_at timestamptz);
    create table public.friendships(requester_id uuid,addressee_id uuid,status text);
    create table public.user_blocks(blocker_id uuid,blocked_pseudo text);
    create table public.social_blocks_2026(owner_id uuid,target_id uuid,target_label text);`);

  // LES VRAIES COLONNES de `user_profiles`, extraites de 0011 : les réécrire
  // ici inventerait le `unique` et le `check` que ce test prétend éprouver.
  const social0011 = sql('0011_social.sql');
  await db.exec(social0011.slice(
    social0011.indexOf('create table if not exists public.user_profiles'),
    social0011.indexOf('-- ═══ 3. friendships'),
  ));

  // BOUCHON DÉCLARÉ : `social_validate_media_2026` (0124) lit `storage.objects`,
  // que PGlite n'a pas. Aucun test ici n'envoie de photo — le bouchon REFUSE
  // tout chemin non nul, pour qu'un futur test qui en poserait un le voie.
  await db.exec(`create function public.social_validate_media_2026(p_path text,p_kind text) returns void language plpgsql as $$
    begin if p_path is not null then raise exception 'invalid_media'; end if; end $$;`);

  // 0047 en entier : `reserved_handles` + son seed + `check_handle_available`.
  await db.exec(sql('0047_handle_verification.sql'));
  // Les colonnes 2026 de `user_profiles`, puis les DEUX RPC de 0124.
  await db.exec(`alter table public.user_profiles add column if not exists avatar_path_2026 text;
    alter table public.user_profiles add column if not exists profile_data_2026 jsonb not null default '{}';`);
  await db.exec(fnFrom('0124_refonte_2026_social.sql', 'my_social_profile_2026'));
  await db.exec(fnFrom('0124_refonte_2026_social.sql', 'save_my_social_profile_2026'));

  for (const n of [1, 2, 3]) {
    await db.query('insert into auth.users(id,email) values($1,$2)', [id(n), `j${n}@example.test`]);
    await db.query('insert into public.users(id,pseudo) values($1,$2)', [id(n), `joueur${n}`]);
  }

  // ══ ÉTAPE 0 — CE QUE LA PROD FAIT AUJOURD'HUI ══════════════════════════════
  await test('étape 0 — un pseudo libéré est repris DANS LA SECONDE par un tiers', async () => {
    await saveProfile(1, 'koro');
    await saveProfile(1, 'koro_run');            // le joueur 1 libère « koro »
    assert.equal(await handleOf(1), 'koro_run');
    // 0047 le déclare disponible au joueur 2, et 0124 le lui donne vraiment.
    const verdict = await as(2, async () => await one("select public.check_handle_available('koro')"));
    assert.deepEqual(verdict, { ok: true }, 'AVANT 0175, aucune réservation ne protège un pseudo libéré');
    await saveProfile(2, 'koro');
    assert.equal(await handleOf(2), 'koro', 'AVANT 0175, le tiers obtient le pseudo de quelqu’un d’autre');
  });

  await test('étape 0 — aucune cadence : quatre renommages d’affilée passent', async () => {
    for (const h of ['koro_a', 'koro_b', 'koro_c', 'koro_d']) await saveProfile(1, h);
    assert.equal(await handleOf(1), 'koro_d', 'AVANT 0175, se renommer quatre fois de suite ne coûte rien');
  });

  // ══ LA LIGNÉE PASSE À 0175 ═════════════════════════════════════════════════
  // On remet le décor à zéro : les profils ci-dessus ont été créés SANS la
  // colonne `handle_chosen_2026`, donc avec son défaut `false`. C'est
  // exactement l'état des comptes déjà en base le jour du déploiement — on le
  // garde tel quel plutôt que de le maquiller.
  await db.exec(sql('0175_handle_change_window_2026.sql'));
  await db.exec(sql('0176_verified_kind_2026.sql'));

  await test('0175 — le premier NOMMAGE ne consomme rien et ne réserve rien', async () => {
    // Le joueur 3 porte l'étiquette de 0154 (handle_chosen_2026 = false).
    await db.query(
      "insert into public.user_profiles(user_id,handle,display_name) values($1,'runner_000000030000','Trois')",
      [id(3)],
    );
    const before = await status(3);
    assert.equal(before.handle_chosen, false, 'une ligne provisionnée n’est pas un pseudo choisi');
    const result = await change(3, 'trois');
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'named', 'nommer n’est pas changer');
    assert.equal(await handleOf(3), 'trois');
    assert.equal(await one('select count(*)::int from public.handle_changes_2026 where user_id=$1', [id(3)]), 0);
    assert.equal(await one("select count(*)::int from public.handle_holds_2026 where handle='runner_000000030000'"), 0,
      'personne n’a jamais cherché l’étiquette de 0154 : la réserver n’aurait protégé rien');
    const after = await status(3);
    assert.equal(after.handle_chosen, true);
    assert.equal(after.changes_left, 2, 'ses deux changements sont intacts');
  });

  await test('0175 — un compte DÉJÀ en base garde lui aussi son premier nommage', async () => {
    // Le défaut `false` de la colonne s'applique aux lignes existantes : les
    // comptes créés avant ce lot n'ont jamais été soumis à une cadence, et leur
    // en facturer une rétroactivement serait une punition pour une règle qui
    // n'existait pas. Le joueur 1 vient de l'étape 0 avec « koro_d ».
    assert.equal(await handleOf(1), 'koro_d');
    const result = await change(1, 'un_koro');
    assert.equal(result.reason, 'named');
    assert.equal(await one('select count(*)::int from public.handle_changes_2026 where user_id=$1', [id(1)]), 0);
    assert.equal((await status(1)).changes_left, 2);
    // À partir d'ici, il est un joueur comme un autre.
    assert.equal((await change(1, 'un_koro2')).reason, 'changed');
    assert.equal((await status(1)).changes_left, 1);
  });

  // Le joueur 2 vient lui aussi de l'étape 0. Son nommage gratuit est déjà
  // éprouvé deux fois ci-dessus ; on le marque « choisi » (écriture
  // service_role, la seule que la colonne autorise) pour éprouver la CADENCE
  // sur un compte ordinaire, sans rejouer une troisième fois la même branche.
  await db.query('update public.user_profiles set handle_chosen_2026=true where user_id=$1', [id(2)]);

  // ── RÈGLE 4 (format) : la faute est NOMMÉE, jamais « invalide » ────────────
  await test('0175 — format : too_short, too_long, bad_chars, et le @ toléré à la saisie', async () => {
    assert.equal((await change(3, 'ab')).reason, 'too_short');
    assert.equal((await change(3, 'a'.repeat(21))).reason, 'too_long');
    assert.equal((await change(3, 'nico.la')).reason, 'bad_chars', 'GRYD reste plus strict qu’Instagram : pas de point');
    assert.equal((await change(3, 'Nicolas!')).reason, 'bad_chars');
    assert.equal((await change(3, 'nike')).reason, 'reserved', 'les marques de 0047 restent bloquées');
    assert.equal((await change(3, 'n_i_k_e')).reason, 'reserved', 'et leurs contournements par tiret bas aussi');
    assert.equal(await handleOf(3), 'trois', 'aucun refus n’a écrit quoi que ce soit');
    // « @trois » et « TROIS » désignent le pseudo qu'il porte déjà.
    assert.equal((await change(3, '@TROIS')).reason, 'unchanged');
    assert.equal(await one('select count(*)::int from public.handle_changes_2026 where user_id=$1', [id(3)]), 0);
  });

  // ── RÈGLE 1 (unicité, insensible à la casse) ──────────────────────────────
  await test('0175 — unicité insensible à la casse contre les pseudos PORTÉS', async () => {
    assert.equal(await handleOf(2), 'koro');
    assert.equal((await change(3, 'koro')).reason, 'taken');
    assert.equal((await change(3, 'KORO')).reason, 'taken', 'la casse ne crée pas un second pseudo');
  });

  // ── RÈGLE 3 (réservation de 14 jours) ─────────────────────────────────────
  await test('0175 — l’ancien pseudo est RÉSERVÉ 14 jours à son ancien titulaire', async () => {
    const result = await change(2, 'koro2');
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'changed');
    assert.ok(result.held_until, 'la réponse dit jusqu’à quand « koro » lui reste réservé');
    const hold = (await q("select held_for, released_at from public.handle_holds_2026 where handle='koro'"))[0];
    assert.equal(hold.held_for, id(2));
    const jours = (new Date(hold.released_at) - new Date()) / 86400000;
    assert.ok(jours > 13.9 && jours < 14.1, `réservation de 14 jours, lu ${jours}`);
  });

  await test('0175 — personne d’autre ne peut prendre un pseudo réservé, et on lui dit jusqu’à quand', async () => {
    const refus = await change(3, 'koro');
    assert.equal(refus.ok, false);
    assert.equal(refus.reason, 'held');
    assert.ok(refus.held_until, 'un refus sans horizon ne se répare pas');
    // Le vérificateur d'écriture dit la même chose que la RPC d'écriture.
    const verdict = await available(3, 'koro');
    assert.deepEqual(
      { ok: verdict.ok, reason: verdict.reason },
      { ok: false, reason: 'held' },
      'check_handle_available_2026 tient compte des réservations',
    );
    // Et le chemin du profil complet refuse aussi : une seule porte.
    assert.equal(await saveRefusal(3, 'koro'), 'handle_held');
    assert.equal(await handleOf(3), 'trois');
  });

  await test('0175 — le titulaire, lui, REPREND son pseudo, et ça consomme un changement', async () => {
    assert.deepEqual(await available(2, 'koro'), { ok: true }, 'ma propre réservation ne me refuse rien');
    const avant = await status(2);
    assert.equal(avant.reclaimable.handle, 'koro', 'l’écran sait quoi proposer, sans deviner');
    const result = await change(2, 'koro');
    assert.equal(result.ok, true);
    assert.equal(await handleOf(2), 'koro');
    assert.equal(await one("select count(*)::int from public.handle_holds_2026 where handle='koro'"), 0,
      'la réservation reprise n’a plus d’objet');
    assert.equal(await one("select held_for from public.handle_holds_2026 where handle='koro2'"), id(2),
      'et « koro2 » part à son tour en réservation');
    const apres = await status(2);
    assert.equal(apres.changes_used, 2, 'un aller-retour coûte DEUX changements, pas zéro');
    assert.equal(apres.changes_left, 0);
  });

  // ── RÈGLE 2 (plafond, fenêtre glissante) ──────────────────────────────────
  await test('0175 — le 3ᵉ changement en 14 jours est refusé, avec la DATE du prochain', async () => {
    const refus = await change(2, 'koro3');
    assert.equal(refus.ok, false);
    assert.equal(refus.reason, 'rate_limited');
    const attente = (new Date(refus.next_change_allowed_at) - new Date()) / 86400000;
    assert.ok(attente > 13.9 && attente < 14.1, `le crédit revient 14 j après le PLUS ANCIEN des deux, lu ${attente}`);
    assert.equal(await handleOf(2), 'koro');
    // Le chemin du profil complet est plafonné de la même façon (une porte).
    assert.equal(await saveRefusal(2, 'koro3'), 'handle_rate_limited');
    // Et le refus de plafond passe APRÈS le format : une faute de frappe se
    // répare en tapant, l'annoncer sous « plus de changements » la cacherait.
    assert.equal((await change(2, 'ab')).reason, 'too_short');
  });

  await test('0175 — la fenêtre GLISSE : le crédit revient quand le plus ancien sort', async () => {
    const bloque = await status(2);
    assert.equal(bloque.changes_left, 0);
    assert.ok(bloque.next_change_allowed_at, 'un joueur bloqué lit une date, jamais un silence');
    await backdateChanges(2, 15);
    const libre = await status(2);
    assert.equal(libre.changes_left, 2);
    assert.equal(libre.next_change_allowed_at, null, 'une date d’attente quand rien n’attend ferait patienter pour rien');
    assert.equal((await change(2, 'koro3')).ok, true);
  });

  await test('0175 — passé 14 jours, la réservation tombe et un tiers peut prendre le pseudo', async () => {
    assert.equal((await available(3, 'koro')).reason, 'held', 'tant qu’elle court, elle protège');
    await backdateHolds(2, 15);
    assert.deepEqual(await available(3, 'koro'), { ok: true });
    assert.equal((await change(3, 'koro')).ok, true);
    assert.equal(await handleOf(3), 'koro');
  });

  await test('0175 — un compte NEUF ne contourne pas une réservation en cours', async () => {
    // Le trou qu'il fallait fermer côté création : `save_my_social_profile_2026`
    // insérait une première ligne sans jamais regarder les réservations.
    assert.equal(await one("select held_for from public.handle_holds_2026 where handle='trois'"), id(3));
    await db.query('insert into auth.users(id,email) values($1,$2)', [id(4), 'j4@example.test']);
    await db.query('insert into public.users(id,pseudo) values($1,$2)', [id(4), 'joueur4']);
    assert.equal(await saveRefusal(4, 'trois'), 'handle_held');
    assert.equal(await one('select count(*)::int from public.user_profiles where user_id=$1', [id(4)]), 0);
    // Un pseudo libre, lui, passe — et il est CHOISI dès la création.
    await saveProfile(4, 'quatre');
    assert.equal(await one('select handle_chosen_2026 from public.user_profiles where user_id=$1', [id(4)]), true);
  });

  await test('0175 — sans session, on ne lit rien et on n’écrit rien', async () => {
    assert.equal(await as(null, async () => await one('select public.my_handle_status_2026()')), null);
    assert.equal((await as(null, async () => await one("select public.change_my_handle_2026('libre123')"))).reason,
      'authentication_required');
  });

  await test('0175 — les tables et les RPC ne sont ouvertes à personne par défaut', async () => {
    for (const table of ['handle_changes_2026', 'handle_holds_2026']) {
      assert.equal(await one('select relrowsecurity from pg_class where relname=$1', [table]), true,
        `${table} sans RLS`);
      for (const role of ['public', 'anon', 'authenticated']) {
        assert.equal(
          await one('select has_table_privilege($1,$2,$3)', [role, `public.${table}`, 'SELECT']),
          false,
          `${table} lisible par ${role}`,
        );
      }
    }
    // La règle elle-même n'est atteignable QUE par les deux RPC publiques.
    assert.equal(await one("select has_function_privilege('authenticated','public.gryd_handle_change_2026(uuid,text)','EXECUTE')"), false);
    for (const fn of ['public.change_my_handle_2026(text)', 'public.my_handle_status_2026()', 'public.check_handle_available_2026(text)']) {
      assert.equal(await one('select has_function_privilege($1,$2,$3)', ['anon', fn, 'EXECUTE']), false, `${fn} ouverte à anon`);
      assert.equal(await one('select has_function_privilege($1,$2,$3)', ['authenticated', fn, 'EXECUTE']), true, `${fn} fermée aux joueurs`);
    }
  });

  await test('0176 — le badge vérifié sait dire QUI, et n’est attribué à personne', async () => {
    assert.equal(await one("select count(*)::int from public.user_profiles where verified_kind<>'none'"), 0,
      'aucun circuit humain n’existe : aucune ligne ne doit être badgée');
    assert.equal(await one("select count(*)::int from public.user_profiles where verified"), 0);
    for (const role of ['public', 'anon', 'authenticated']) {
      assert.equal(
        await one('select has_column_privilege($1,$2,$3,$4)', [role, 'public.user_profiles', 'verified_kind', 'UPDATE']),
        false,
        `verified_kind écrivable par ${role} : un badge achetable`,
      );
    }
    // L'incohérence est refusée EN BASE, pas seulement en intention.
    await assert.rejects(
      db.query("update public.user_profiles set verified_kind='brand' where user_id=$1", [id(2)]),
      /verified_kind_agrees_2026/,
      'un « brand » non vérifié serait un badge que l’app n’afficherait jamais',
    );
    await db.query("update public.user_profiles set verified=true, verified_kind='athlete' where user_id=$1", [id(2)]);
    assert.equal(await one('select verified_kind from public.user_profiles where user_id=$1', [id(2)]), 'athlete');
    await db.query("update public.user_profiles set verified=false, verified_kind='none' where user_id=$1", [id(2)]);
  });

  console.log(`\n${passed} tests verts.`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await db.close();
}
