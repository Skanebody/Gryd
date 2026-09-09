/**
 * GRYD — 0153 : trois réactions humaines, un lien profond qui tient, une
 * relation qui existe.
 *
 * ═══ ÉTAPE 0 — LES TROIS DÉFAUTS SONT REJOUÉS AVANT D'ÊTRE CORRIGÉS ════════
 * Ce fichier applique d'abord 0124 (+0128) TELLES QUELLES, puis constate, sur
 * une fixture réelle :
 *   · réagir n'a qu'une valeur — `social_reactions_2026` n'a pas de colonne de
 *     type : c'est un « like », pas les trois réactions de §13.4 ;
 *   · un lien profond vers une publication à VÉLO, lu avec la discipline par
 *     défaut du client ('run', `app/crew-feed.tsx:15`), rend ZÉRO ligne —
 *     l'écran affiche alors « Cette publication n'est plus accessible » sur un
 *     contenu qui existe et qu'on a le droit de voir ;
 *   · `social_member_2026` ne renvoie AUCUN état de relation : l'écran ne peut
 *     que peindre « Suivre », « Ne plus suivre » et « Demander en ami »
 *     ensemble, dont deux sont morts.
 * Sans cette étape, rien ne distinguerait 0153 d'un no-op.
 *
 * ═══ CE QUE CE TEST PROUVE ENSUITE ═════════════════════════════════════════
 *  1. 0153 s'applique sur un vrai Postgres, telle quelle ;
 *  2. les trois réactions existent, la liste est FERMÉE (un quatrième motif est
 *     refusé, jamais ramené sur « encouragement ») ;
 *  3. elles sont LIMITÉES : une personne pose UNE réaction, en choisir une
 *     autre remplace — trois compteurs empilables seraient trois likes ;
 *  4. retirer « merci » n'efface pas « à la prochaine » posée entre-temps ;
 *  5. les réactions d'AVANT 0153 restent des encouragements (aucune n'est
 *     réinterprétée par le défaut de colonne) ;
 *  6. l'ancienne signature `(post, bool)` marche encore : un client déjà
 *     installé garde son bouton ;
 *  7. le lien profond vers un post vélo répond, sans élargir l'audience d'un
 *     iota (un membre d'un autre crew ne le voit toujours pas) ;
 *  8. la relation est rendue du point de vue du LECTEUR : suivi, amitié,
 *     demande envoyée vs reçue, blocage — et `null` sur mon propre profil ;
 *  9. elle ne dit RIEN des autres liens de la personne (pas d'abonnés).
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 * PGlite tourne en SUPERUTILISATEUR : les policies ne s'y appliquent pas. On
 * incarne un compte via `set role authenticated` + `auth.uid()` bouchonné, ce
 * qui vérifie la LOGIQUE des fonctions et les privilèges au catalogue, jamais
 * un refus vécu par un tiers en production.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(`NON EXÉCUTÉ — PGlite est introuvable (sortie 2, jamais 0).\n  ${err.message}`);
  process.exit(2);
}
const db = new PGlite(); let passed = 0;
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const q = async (s, p = []) => (await db.query(s, p)).rows;
const val = async (s, p = []) => Object.values((await q(s, p))[0])[0];
const as = async (n, fn) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : id(n)]);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
};
const test = async (n, fn) => { await fn(); console.log(`  ok   ${n}`); passed += 1; };

try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,storage to authenticated,anon,service_role;
  create table users(id uuid primary key,pseudo text); create table crews(id uuid primary key,name text default 'Fixture crew');
  create table crew_members(crew_id uuid references crews(id),user_id uuid references users(id),role text,left_at timestamptz,primary key(crew_id,user_id));
  create table user_profiles(user_id uuid primary key references users(id),handle text unique not null,display_name text,bio text,profile_visibility text not null default 'crew',updated_at timestamptz default now());
  create table follows(follower_id uuid,followee_id uuid); create table friendships(requester_id uuid,addressee_id uuid,status text); create table user_blocks(blocker_id uuid,blocked_pseudo text);
  create table runs(id uuid primary key,user_id uuid references users(id),ruleset_version text,status text,activity text,distance_m integer,duration_s integer);
  create table crew_events(id uuid primary key default gen_random_uuid(),crew_id uuid references crews(id),created_by uuid references users(id),title text,starts_at timestamptz,activity text,place_label text,capacity integer);
  create table crew_event_rsvps(event_id uuid references crew_events(id),user_id uuid references users(id),choice text,updated_at timestamptz default now(),primary key(event_id,user_id));
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
  alter table storage.objects enable row level security; grant select,insert,delete on storage.objects to authenticated;
  create function crew_description_refusal(text) returns text language sql as $$select null::text$$;
  create function crew_outing_place_refusal(text) returns text language sql as $$select null::text$$;
  create function crew_outing_horizon_days() returns integer language sql as $$select 30$$;`);

  const oldSocial = readFileSync(new URL('../migrations/0011_social.sql', import.meta.url), 'utf8');
  await db.exec('alter table user_profiles enable row level security; grant select on user_profiles to authenticated;');
  await db.exec(oldSocial.slice(oldSocial.indexOf('create policy user_profiles_select_visible'), oldSocial.indexOf('-- ── friendships : owner-only')));
  const challenges = readFileSync(new URL('../migrations/0122_refonte_2026_crew_challenges.sql', import.meta.url), 'utf8');
  await db.exec('create table challenge_identity_blocks_2026(blocker_id uuid,blocked_user_id uuid);');
  await db.exec(challenges.slice(challenges.indexOf('create function public.challenge_pair_blocked_2026'), challenges.indexOf('create function public.challenge_has_block_2026')));
  await db.exec('revoke all on function challenge_pair_blocked_2026(uuid,uuid) from public,anon,authenticated; grant execute on function challenge_pair_blocked_2026(uuid,uuid) to service_role;');
  await db.exec(readFileSync(new URL('../migrations/0124_refonte_2026_social.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../migrations/0128_crew_outing_host_profile_visibility.sql', import.meta.url), 'utf8'));

  // Fixture : un crew de trois, un étranger, deux sorties (course + vélo).
  for (let i = 1; i <= 5; i++) await db.query('insert into users(id) values($1)', [id(i)]);
  await db.query('insert into crews(id) values($1),($2)', [id(11), id(12)]);
  for (const [i, role] of [[1, 'founder'], [2, 'runner'], [3, 'runner']]) {
    await db.query('insert into crew_members values($1,$2,$3,null)', [id(11), id(i), role]);
  }
  await db.query('insert into crew_members values($1,$2,$3,null)', [id(12), id(4), 'founder']);
  for (let n = 1; n <= 4; n++) {
    await as(n, () => val('select save_my_social_profile_2026($1)',
      [{ handle: `runner${n}`, displayName: `Runner ${n}`, bio: '', visibility: 'crew' }]));
  }
  await db.query("insert into runs values($1,$2,'2026.1','valid','run',5000,1800)", [id(51), id(1)]);
  await db.query("insert into runs values($1,$2,'2026.1','valid','bike',22000,3600)", [id(52), id(2)]);
  const postRun = (await as(1, () => val("select social_publish_2026($1,$2,'À pied',null,true,$3)", [id(61), id(51), id(11)]))).id;
  const postBike = (await as(2, () => val("select social_publish_2026($1,$2,'À vélo',null,true,$3)", [id(62), id(52), id(11)]))).id;

  console.log('\nsocial_reactions_2026 — migration 0153 sur PGlite\n');

  // ════════════════════════════════════════════════════════════════════════
  // ÉTAPE 0
  // ════════════════════════════════════════════════════════════════════════
  await test('ÉTAPE 0 — réagir n’a qu’une valeur : c’est un « like », pas §13.4', async () => {
    const cols = await q(`select column_name from information_schema.columns
      where table_name='social_reactions_2026' order by column_name`);
    assert.deepEqual(cols.map((c) => c.column_name), ['created_at', 'post_id', 'user_id']);
    await as(3, () => val('select social_react_2026($1,true)', [postRun]));
    const feed = await as(3, () => val('select social_feed_2026()'));
    const item = feed.find((p) => p.id === postRun);
    assert.equal(item.reacted, true);
    assert.equal(item.reactionCount, 1);
    assert.equal('myReaction' in item, false, 'aucune réaction NOMMÉE n’existe');
  });

  await test('ÉTAPE 0 — un lien profond vers un post VÉLO répond « rien »', async () => {
    // Ce que l'écran envoie quand il n'a qu'un identifiant : sa valeur par
    // défaut de discipline. Le post existe, il est visible… et le fil est vide.
    const deep = await as(3, () => val("select social_feed_2026('run',$1)", [postBike]));
    assert.deepEqual(deep, [], 'le filtre de discipline masque une publication accessible');
    const direct = await as(3, () => val("select social_feed_2026('bike',$1)", [postBike]));
    assert.equal(direct.length, 1, 'la même lecture aboutit si le client devine la discipline');
  });

  await test('ÉTAPE 0 — la fiche d’un membre ne porte AUCUN état de relation', async () => {
    const person = await as(3, () => val('select social_member_2026($1)', [id(1)]));
    assert.equal('relation' in person, false, 'rien ne dit si je le suis déjà');
  });

  // ════════════════════════════════════════════════════════════════════════
  // 0153
  // ════════════════════════════════════════════════════════════════════════
  await db.exec(readFileSync(new URL('../migrations/0153_social_reactions_and_relation_2026.sql', import.meta.url), 'utf8'));
  await test('0153 s’applique sur un Postgres réel, telle quelle', async () => {
    assert.equal(await val(`select count(*)::int from information_schema.columns
      where table_name='social_reactions_2026' and column_name='kind'`), 1);
  });

  await test('la réaction d’AVANT reste un encouragement — aucune n’est réinterprétée', async () => {
    assert.equal(await val('select kind from social_reactions_2026 where post_id=$1 and user_id=$2',
      [postRun, id(3)]), 'cheer');
    const item = (await as(3, () => val('select social_feed_2026()'))).find((p) => p.id === postRun);
    assert.equal(item.myReaction, 'cheer');
    assert.deepEqual(item.reactions, { cheer: 1, thanks: 0, nextTime: 0 });
  });

  await test('§13.4 — les trois réactions existent et la liste est FERMÉE', async () => {
    await as(2, () => val("select social_react_2026($1,'thanks',true)", [postRun]));
    await as(1, () => val("select social_react_2026($1,'next_time',true)", [postRun]));
    const item = (await as(1, () => val('select social_feed_2026()'))).find((p) => p.id === postRun);
    assert.deepEqual(item.reactions, { cheer: 1, thanks: 1, nextTime: 1 });
    assert.equal(item.reactionCount, 3);
    assert.equal(item.myReaction, 'next_time');
    // Un motif inconnu est REFUSÉ, jamais ramené sur « encouragement » : le
    // serveur ne devine pas ce qu’une personne a voulu dire.
    await assert.rejects(() => as(1, () => val("select social_react_2026($1,'clap',true)", [postRun])),
      /invalid_reaction/);
    await assert.rejects(() => as(1, () => val('select social_react_2026($1,null,true)', [postRun])),
      /invalid_reaction/);
  });

  await test('LIMITÉES : une personne pose UNE réaction, en choisir une autre remplace', async () => {
    await as(2, () => val("select social_react_2026($1,'cheer',true)", [postRun]));
    assert.equal(await val('select count(*)::int from social_reactions_2026 where post_id=$1 and user_id=$2',
      [postRun, id(2)]), 1, 'jamais deux lignes pour la même personne');
    const item = (await as(1, () => val('select social_feed_2026()'))).find((p) => p.id === postRun);
    assert.deepEqual(item.reactions, { cheer: 2, thanks: 0, nextTime: 1 });
  });

  await test('retirer « merci » n’efface pas la réaction posée entre-temps', async () => {
    await as(2, () => val("select social_react_2026($1,'thanks',false)", [postRun]));
    const item = (await as(1, () => val('select social_feed_2026()'))).find((p) => p.id === postRun);
    assert.deepEqual(item.reactions, { cheer: 2, thanks: 0, nextTime: 1 }, 'son encouragement tient');
    await as(2, () => val("select social_react_2026($1,'cheer',false)", [postRun]));
    const apres = (await as(1, () => val('select social_feed_2026()'))).find((p) => p.id === postRun);
    assert.deepEqual(apres.reactions, { cheer: 1, thanks: 0, nextTime: 1 });
  });

  await test('l’ancienne signature survit : un client déjà installé garde son bouton', async () => {
    await as(2, () => val('select social_react_2026($1,true)', [postRun]));
    assert.equal(await val('select kind from social_reactions_2026 where post_id=$1 and user_id=$2',
      [postRun, id(2)]), 'cheer');
    await as(2, () => val('select social_react_2026($1,false)', [postRun]));
    assert.equal(await val('select count(*)::int from social_reactions_2026 where post_id=$1 and user_id=$2',
      [postRun, id(2)]), 0);
  });

  await test('le lien profond vers un post VÉLO répond enfin', async () => {
    const deep = await as(3, () => val("select social_feed_2026('run',$1)", [postBike]));
    assert.equal(deep.length, 1, 'la publication est rendue quelle que soit la discipline demandée');
    assert.equal(deep[0].id, postBike);
    assert.equal(deep[0].activity, 'bike', 'et elle dit sa vraie discipline');
  });

  await test('l’audience ne bouge pas d’un iota : un autre crew ne voit toujours rien', async () => {
    assert.deepEqual(await as(4, () => val("select social_feed_2026('run',$1)", [postBike])), []);
    assert.deepEqual(await as(null, () => val("select social_feed_2026('run',$1)", [postBike])), []);
    // Et la liste NON nommée reste disciplinée : le fil « Course » ne se met
    // pas à mélanger les deux mondes.
    const list = await as(3, () => val("select social_feed_2026('run')"));
    assert.deepEqual(list.map((p) => p.activity), ['run']);
  });

  await test('la relation est rendue, du point de vue du LECTEUR', async () => {
    const inconnu = await as(3, () => val('select social_member_2026($1)', [id(1)]));
    assert.deepEqual(inconnu.relation,
      { following: false, friend: false, requestSent: false, requestReceived: false, blocked: false });
    await db.query('insert into follows values($1,$2)', [id(3), id(1)]);
    await db.query("insert into friendships(requester_id,addressee_id,status) values($1,$2,'pending')", [id(3), id(2)]);
    await db.query("insert into friendships(requester_id,addressee_id,status) values($1,$2,'pending')", [id(1), id(3)]);
    const suivi = await as(3, () => val('select social_member_2026($1)', [id(1)]));
    assert.equal(suivi.relation.following, true);
    assert.equal(suivi.relation.requestReceived, true, 'c’est LUI qui a demandé : je réponds, je ne redemande pas');
    assert.equal(suivi.relation.requestSent, false);
    const demande = await as(3, () => val('select social_member_2026($1)', [id(2)]));
    assert.equal(demande.relation.requestSent, true, 'ma demande est en attente : aucun bouton à repeindre');
    assert.equal(demande.relation.following, false);
  });

  await test('mon propre profil n’a pas de relation à moi-même', async () => {
    const moi = await as(3, () => val('select social_member_2026($1)', [id(3)]));
    assert.equal(moi.isMe, true);
    assert.equal(moi.relation, null);
  });

  await test('la relation ne raconte RIEN des autres liens de la personne', async () => {
    const person = await as(3, () => val('select social_member_2026($1)', [id(1)]));
    assert.deepEqual(Object.keys(person.relation).sort(),
      ['blocked', 'following', 'friend', 'requestReceived', 'requestSent']);
    assert.deepEqual(Object.keys(person).sort(),
      ['avatarPath', 'bio', 'handle', 'id', 'isMe', 'name', 'relation']);
  });

  await test('bloquer FERME la fiche — et `blocked` sert au moment où elle rouvre', async () => {
    await as(3, () => val('select social_block_2026($1,true)', [id(1)]));
    // Comportement de 0124, inchangé : `social_profile_visible_2026` exclut une
    // personne bloquée. La fiche devient donc muette, et le déblocage passe par
    // `social_block_list_2026` (écran /amis) — pas par le profil.
    assert.equal(await as(3, () => val('select social_member_2026($1)', [id(1)])), null);
    assert.equal(
      (await as(3, () => val('select social_block_list_2026()'))).some((b) => b.id === id(1)),
      true,
      'la personne bloquée reste retrouvable là où on peut la débloquer',
    );
    // Débloquée, la fiche revient — et le suivi, lui, a bien été coupé (0124).
    await as(3, () => val('select social_block_2026($1,false)', [id(1)]));
    const person = await as(3, () => val('select social_member_2026($1)', [id(1)]));
    assert.equal(person.relation.blocked, false);
    assert.equal(person.relation.following, false, 'social_block_2026 avait coupé l’arête');
    assert.equal(person.relation.requestReceived, false, 'et rejeté la demande en attente');
  });

  await test('les deux signatures de réaction restent fermées à anon', async () => {
    for (const sig of ['social_react_2026(uuid,text,boolean)', 'social_react_2026(uuid,boolean)',
      'social_feed_2026(text,uuid)', 'social_member_2026(uuid)']) {
      assert.equal(await val(`select has_function_privilege('anon',$1,'EXECUTE')`, [sig]), false, sig);
      assert.equal(await val(`select has_function_privilege('authenticated',$1,'EXECUTE')`, [sig]), true, sig);
    }
  });

  console.log(`\n${passed} vérifications passées.`);
  console.log('RLS non prouvée (PGlite = superutilisateur) · stockage et réseau non exercés.\n');
} finally {
  await db.close();
}
