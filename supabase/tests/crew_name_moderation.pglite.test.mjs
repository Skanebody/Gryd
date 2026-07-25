#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la MODÉRATION DU NOM DE CREW (migration 0050) sur PGlite.
 *
 * POURQUOI : `crew_name_refusal` est un filtre subtil (normalisation Unicode NFD,
 * repli leet, homoglyphes cyrilliques/grecs, caractères invisibles, 'word' vs
 * 'squash') qui garde une surface CRITIQUE App Store (Guideline 1.2). Seule
 * l'exécution prouve à la fois qu'il ATTRAPE les contournements mécaniques ET
 * qu'il n'a PAS de faux positif sur des noms légitimes (Scunthorpe, Pineapple,
 * Team, Sussex). On verrouille le contrat + les limites ASSUMÉES par 0050.
 *
 * PORTÉE : on applique les sections 1-4 de 0050 (tables + fonctions de modération),
 * PAS create_crew/le trigger (sections 5-6 : ils exigent crews/crew_members/
 * city_zones + gen_random_bytes). On teste `crew_name_refusal` en direct — c'est
 * le cœur que les deux voies (RPC + trigger) appellent.
 *
 * CE QUE CE TEST NE PROUVE PAS : l'effet des REVOKE (PGlite tourne en superutilisateur) ;
 * l'exhaustivité de la liste (aucune liste ne couvre tout — la vraie défense reste
 * le signalement + revue humaine, cf. l'en-tête de 0050).
 *
 * Les contournements invisibles / homoglyphes sont construits par
 * String.fromCharCode(codepoint) — JAMAIS un caractère invisible LITTÉRAL dans la
 * source (illisible en revue, perdu au copier-coller : la règle que 0050 s'applique
 * déjà à lui-même via chr()).
 *
 * LANCER : GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *   node supabase/tests/crew_name_moderation.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 (un test non exécuté n'est jamais vert).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

const ZWSP = String.fromCharCode(0x200b); // zero-width space
const SHY = String.fromCharCode(0x00ad); // soft hyphen
const CYR_E = String.fromCharCode(0x0435); // « е » cyrillique, sosie du « e » latin

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite introuvable. Ce test n’a rien vérifié (sortie 2, jamais 0).\n' +
      `  cause : ${err.message}`,
  );
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
const eq = (actual, expected, what) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what} : attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
};

const db = new PGlite();

// Rôles Supabase (PGlite ne les a pas) — 0050 révoque de anon/authenticated.
await db.exec(`create role anon; create role authenticated; create role service_role;`);

// Prérequis MINIMAL : reserved_handles (créée par 0047) avec un échantillon
// représentatif. 0050 (section 1) lui AJOUTE blocks_crew_name / crew_match_mode
// et met à jour ces valeurs pour les handles ci-dessous.
await db.exec(`
  create table public.reserved_handles (handle text primary key);
  insert into public.reserved_handles (handle) values
    ('nike'), ('apple'), ('gryd'), ('adidas'), ('team');
`);

// Le VRAI SQL de 0050, sections 1-4 uniquement (avant create_crew).
const sql0050 = readFileSync(join(MIGRATIONS, '0050_crew_name_moderation.sql'), 'utf8');
const marker = '-- ═══ 5. create_crew';
const cut = sql0050.indexOf(marker);
if (cut < 0) throw new Error('marqueur section 5 introuvable dans 0050 — le slice doit être revu');
await db.exec(sql0050.slice(0, cut));

const refusal = async (name) =>
  (await db.query('select public.crew_name_refusal($1) as r', [name])).rows[0].r;

console.log('crew_name_moderation — migration 0050 sur PGlite\n');

await t('noms LÉGITIMES acceptés (aucun faux positif) → null', async () => {
  eq(await refusal('Les Foulées de Paris'), null, 'nom neutre');
  eq(await refusal('Team Paris'), null, 'team = légitime dans un nom (blocks_crew_name=false)');
  eq(await refusal('Pineapple Runners'), null, 'apple word-mode : pas dans « pineapple »');
  eq(await refusal('Scunthorpe Runners'), null, 'cunt word-mode : pas dans « scunthorpe »');
  eq(await refusal('Sussex Striders'), null, 'sex word-mode : pas dans « sussex »');
});

await t('MARQUES / termes officiels GRYD → reserved', async () => {
  eq(await refusal('Nike Runners'), 'reserved', 'nike en mot entier');
  eq(await refusal('GRYD Officiel'), 'reserved', 'gryd (squash) usurpation officielle');
  eq(await refusal('ADIDAS Paris'), 'reserved', 'adidas (squash)');
});

await t('INSULTES / slurs → blocked_term (mot entier ET squash)', async () => {
  eq(await refusal('connard'), 'blocked_term', 'insulte FR (squash)');
  eq(await refusal('Les Connards du 9-3'), 'blocked_term', 'insulte au milieu d’une phrase');
});

await t('contournements MÉCANIQUES neutralisés', async () => {
  eq(await refusal('c.o.n.n.a.r.d'), 'blocked_term', 'séparateurs (squash)');
  eq(await refusal('s4l0pe'), 'blocked_term', 'leet → salope');
  eq(await refusal('CoNnArD'), 'blocked_term', 'casse');
});

await t('caractères INVISIBLES → invisible (avant même de lire le mot)', async () => {
  eq(await refusal('con' + ZWSP + 'nard'), 'invisible', 'zero-width space (U+200B)');
  eq(await refusal('Team' + SHY + 'Paris'), 'invisible', 'soft hyphen (U+00AD), nom sinon légitime');
});

await t('HOMOGLYPHES : mélange d’alphabets → mixed_scripts', async () => {
  // « Nik<е cyrillique> » : indiscernable de « Nike » à l’œil.
  eq(await refusal('Nik' + CYR_E + ' Runners'), 'mixed_scripts', 'latin + cyrillique mêlés');
});

await t('LIMITES ASSUMÉES par 0050 (documentées, non des bugs)', async () => {
  // nike est en 'word' (pas 'squash') → N.I.K.E s’échappe (0050 l’assume : préférer
  // laisser filer une évasion rare que refuser « Techniker Team »).
  eq(await refusal('N.I.K.E Runners'), null, 'nike word-mode : N.I.K.E passe (assumé)');
  // Écriture non latine : rien à examiner (v_squash vide) → on ne refuse pas
  // (on ne sait pas lire ; le signalement prend le relais).
  eq(await refusal('走れ'), null, 'écriture non couverte → non refusée');
});

console.log(`\n${passed} ok, ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
