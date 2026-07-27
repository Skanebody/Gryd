/**
 * GRYD — tests de engine/leaderboard.ts (§10.1/§10.2 : le classement en SURFACE).
 *
 * Ce que ces tests VERROUILLENT, ce sont des RÈGLES, pas une implémentation :
 * la surface prime, les trois départages tombent DANS L'ORDRE de la spec,
 * l'égalité parfaite ne se tranche jamais au hasard, un cycliste n'entre pas
 * dans le classement des coureurs, et « personne » n'est pas « panne ».
 *
 * Mêmes contraintes d'outillage que `polygon.test.ts` (aucun import externe,
 * `Deno` déclaré localement) — voir son docblock pour le pourquoi.
 */
import {
  compareLeaderboardEntries,
  groupLeaderboardByActivity,
  rankLeaderboard,
  type LeaderboardEntry,
} from './leaderboard.ts';
import type { Activity } from '@klaim/shared/game-rules';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

/**
 * Une entrée « neutre » : toutes les mesures à zéro sauf ce que le test veut
 * dire. Chaque test ne surcharge QUE le critère qu'il met à l'épreuve — sinon
 * on ne saurait jamais lequel des quatre a réellement départagé.
 */
function entry(
  subjectId: string,
  patch: Partial<LeaderboardEntry> = {},
): LeaderboardEntry {
  return {
    subjectType: 'user',
    subjectId,
    activity: 'run',
    controlledAreaM2: 0,
    successfulDefenses: 0,
    conqueredAreaM2: 0,
    previousSnapshotAtMs: null,
    ...patch,
  };
}

function ordre(ranking: ReturnType<typeof rankLeaderboard>): string[] {
  assert(ranking.ok, 'le classement devait réussir');
  return ranking.ok ? ranking.rows.map((r) => r.subjectId) : [];
}

function rangs(ranking: ReturnType<typeof rankLeaderboard>): number[] {
  assert(ranking.ok, 'le classement devait réussir');
  return ranking.ok ? ranking.rows.map((r) => r.rank) : [];
}

// ═══════════════════════════════════════════════════════════════════════════
// §10.1 — LA MÉTRIQUE PRINCIPALE EST UNE SURFACE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('§10.1 — la plus grande surface contrôlée passe devant, quoi qu\'il arrive ailleurs', () => {
  // Le petit territoire a TOUT le reste pour lui : plus de défenses, plus de
  // conquêtes, plus d'ancienneté. Si un seul de ces critères pouvait renverser
  // la surface, le classement ne serait plus « en surface ».
  const r = rankLeaderboard('run', [
    entry('petit', {
      controlledAreaM2: 999,
      successfulDefenses: 50,
      conqueredAreaM2: 900,
      previousSnapshotAtMs: 1,
    }),
    entry('grand', { controlledAreaM2: 1000 }),
  ]);
  assertEgal(ordre(r), ['grand', 'petit'], 'la surface doit primer sur tous les autres critères');
  assertEgal(rangs(r), [1, 2], 'deux surfaces distinctes = deux rangs distincts');
});

Deno.test('§10.1 — un mètre carré de plus suffit (la surface n\'est pas arrondie)', () => {
  const r = rankLeaderboard('run', [
    entry('a', { controlledAreaM2: 12_345.0 }),
    entry('b', { controlledAreaM2: 12_345.5 }),
  ]);
  assertEgal(ordre(r), ['b', 'a'], 'une demi-unité de surface départage déjà');
});

// ═══════════════════════════════════════════════════════════════════════════
// §10.2 — LES QUATRE DÉPARTAGES, DANS L'ORDRE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('§10.2 (2) — à surface égale, les défenses réussies départagent', () => {
  const r = rankLeaderboard('run', [
    // `mou` a plus de conquêtes ET plus d'ancienneté : les critères 3 et 4 ne
    // doivent PAS pouvoir passer devant le critère 2.
    entry('mou', {
      controlledAreaM2: 500,
      successfulDefenses: 1,
      conqueredAreaM2: 400,
      previousSnapshotAtMs: 1,
    }),
    entry('roc', { controlledAreaM2: 500, successfulDefenses: 2 }),
  ]);
  assertEgal(ordre(r), ['roc', 'mou'], 'les défenses réussies passent avant la conquête');
});

Deno.test('§10.2 (3) — à surface et défenses égales, la conquête de la période départage', () => {
  const r = rankLeaderboard('run', [
    entry('assis', {
      controlledAreaM2: 500,
      successfulDefenses: 2,
      conqueredAreaM2: 10,
      previousSnapshotAtMs: 1,
    }),
    entry('actif', { controlledAreaM2: 500, successfulDefenses: 2, conqueredAreaM2: 11 }),
  ]);
  assertEgal(ordre(r), ['actif', 'assis'], 'la conquête de la période passe avant l\'ancienneté');
});

Deno.test('§10.2 (4) — à tout le reste égal, le snapshot précédent le PLUS ANCIEN gagne', () => {
  const r = rankLeaderboard('run', [
    entry('recent', { controlledAreaM2: 500, previousSnapshotAtMs: 2_000 }),
    entry('ancien', { controlledAreaM2: 500, previousSnapshotAtMs: 1_000 }),
  ]);
  assertEgal(ordre(r), ['ancien', 'recent'], 'l\'ancienneté dans le classement départage');
  assertEgal(rangs(r), [1, 2], 'le critère 4 produit bien deux rangs distincts');
});

Deno.test('§10.2 (4) — jamais classé (null) passe DERRIÈRE un sujet déjà classé', () => {
  const r = rankLeaderboard('run', [
    entry('nouveau', { controlledAreaM2: 500, previousSnapshotAtMs: null }),
    entry('installe', { controlledAreaM2: 500, previousSnapshotAtMs: 9_999_999 }),
  ]);
  assertEgal(
    ordre(r),
    ['installe', 'nouveau'],
    'un sujet sans historique ne peut pas devancer un sujet installé sur ce seul critère',
  );
});

Deno.test('§10.2 — l\'ordre des quatre critères est celui de la spec, testé en cascade', () => {
  // Un lot où chaque paire successive ne diffère QUE par un critère de plus en
  // plus faible : si l'ordre des critères était permuté, ce classement tombe.
  const r = rankLeaderboard('run', [
    entry('d', { controlledAreaM2: 100, successfulDefenses: 3, conqueredAreaM2: 50, previousSnapshotAtMs: 20 }),
    entry('c', { controlledAreaM2: 100, successfulDefenses: 3, conqueredAreaM2: 50, previousSnapshotAtMs: 10 }),
    entry('b', { controlledAreaM2: 100, successfulDefenses: 3, conqueredAreaM2: 60, previousSnapshotAtMs: 99 }),
    entry('a', { controlledAreaM2: 100, successfulDefenses: 4, conqueredAreaM2: 0, previousSnapshotAtMs: 99 }),
    entry('z', { controlledAreaM2: 101, successfulDefenses: 0, conqueredAreaM2: 0, previousSnapshotAtMs: 99 }),
  ]);
  assertEgal(ordre(r), ['z', 'a', 'b', 'c', 'd'], 'cascade surface → défenses → conquête → ancienneté');
  assertEgal(rangs(r), [1, 2, 3, 4, 5], 'aucun ex aequo dans cette cascade');
});

// ═══════════════════════════════════════════════════════════════════════════
// L'ÉGALITÉ PARFAITE — LE POINT QUI NE DOIT JAMAIS SE JOUER AU HASARD
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('égalité PARFAITE — même rang partagé, jamais 2ᵉ et 3ᵉ arbitrairement', () => {
  const jumeau = { controlledAreaM2: 300, successfulDefenses: 2, conqueredAreaM2: 30, previousSnapshotAtMs: 7 };
  const r = rankLeaderboard('run', [
    entry('tete', { controlledAreaM2: 900 }),
    entry('ex1', jumeau),
    entry('ex2', jumeau),
    entry('queue', { controlledAreaM2: 10 }),
  ]);
  assertEgal(rangs(r), [1, 2, 2, 4], 'rang de compétition : les ex aequo partagent, le suivant saute');
  assert(r.ok, 'classement attendu');
  if (r.ok) {
    assertEgal(
      r.rows.map((x) => x.tiedCount),
      [1, 2, 2, 1],
      'chaque ligne dit combien de sujets partagent son rang',
    );
  }
});

Deno.test('égalité PARFAITE — le comparateur rend exactement 0 (aucun départage caché)', () => {
  const a = entry('a', { controlledAreaM2: 42, successfulDefenses: 1, conqueredAreaM2: 3, previousSnapshotAtMs: 5 });
  const b = entry('b', { controlledAreaM2: 42, successfulDefenses: 1, conqueredAreaM2: 3, previousSnapshotAtMs: 5 });
  assertEgal(compareLeaderboardEntries(a, b), 0, 'deux mesures identiques ne se départagent pas');
  assertEgal(compareLeaderboardEntries(b, a), 0, 'et la symétrie tient dans les deux sens');
});

Deno.test('égalité PARFAITE — deux sujets sans historique restent ex aequo (null vs null)', () => {
  const nu = { controlledAreaM2: 500, previousSnapshotAtMs: null };
  const r = rankLeaderboard('run', [entry('x', nu), entry('y', nu)]);
  assertEgal(rangs(r), [1, 1], 'null contre null n\'invente pas d\'ancienneté');
});

Deno.test('déterminisme — la même entrée rend deux fois exactement la même sortie', () => {
  const jumeau = { controlledAreaM2: 300, successfulDefenses: 2, conqueredAreaM2: 30, previousSnapshotAtMs: 7 };
  const lot = [entry('m', jumeau), entry('n', jumeau), entry('o', jumeau), entry('p', { controlledAreaM2: 301 })];
  const un = rankLeaderboard('run', lot);
  const deux = rankLeaderboard('run', lot);
  assertEgal(ordre(un), ordre(deux), 'sortie instable entre deux appels identiques');
  assertEgal(ordre(un), ['p', 'm', 'n', 'o'], 'les ex aequo gardent l\'ordre d\'ENTRÉE, jamais un tirage');
});

Deno.test('déterminisme — l\'ordre d\'entrée ne change pas les RANGS attribués', () => {
  const jumeau = { controlledAreaM2: 300, successfulDefenses: 2, conqueredAreaM2: 30, previousSnapshotAtMs: 7 };
  const direct = rankLeaderboard('run', [entry('a', jumeau), entry('b', jumeau), entry('c', { controlledAreaM2: 999 })]);
  const inverse = rankLeaderboard('run', [entry('c', { controlledAreaM2: 999 }), entry('b', jumeau), entry('a', jumeau)]);
  assertEgal(rangs(direct), [1, 2, 2], 'rangs attendus (ordre direct)');
  assertEgal(rangs(inverse), [1, 2, 2], 'rangs attendus (ordre inverse) — le rang ne dépend pas de l\'entrée');
});

// ═══════════════════════════════════════════════════════════════════════════
// §1.2 — RUN ET BIKE NE SE MÉLANGENT JAMAIS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('§1.2 — une entrée Bike dans un classement Run fait REFUSER le lot entier', () => {
  const r = rankLeaderboard('run', [
    entry('coureur', { controlledAreaM2: 100 }),
    entry('cycliste', { activity: 'bike', controlledAreaM2: 100_000 }),
  ]);
  assert(!r.ok, 'un lot mixte doit être refusé, jamais classé');
  if (!r.ok) {
    assertEgal(r.reason, 'foreign_activity', 'motif attendu');
    assertEgal(r.subjectId, 'cycliste', 'le sujet fautif doit être nommé');
  }
});

Deno.test('§1.2 — le refus est TOTAL : aucun classement amputé n\'est servi', () => {
  const r = rankLeaderboard('bike', [
    entry('c1', { activity: 'bike', controlledAreaM2: 10 }),
    entry('intrus', { activity: 'run', controlledAreaM2: 10 }),
    entry('c2', { activity: 'bike', controlledAreaM2: 20 }),
  ]);
  assert(!r.ok, 'filtrer silencieusement l\'intrus produirait un classement faux qui aurait l\'air complet');
});

Deno.test('§1.2 — les deux disciplines se classent séparément, sans jamais s\'additionner', () => {
  const lot: LeaderboardEntry[] = [
    entry('a', { activity: 'run', controlledAreaM2: 100 }),
    entry('a', { activity: 'bike', controlledAreaM2: 900 }),
    entry('b', { activity: 'run', controlledAreaM2: 200 }),
    entry('b', { activity: 'bike', controlledAreaM2: 50 }),
  ];
  const parDiscipline = groupLeaderboardByActivity(lot);
  const run = rankLeaderboard('run', parDiscipline.run);
  const bike = rankLeaderboard('bike', parDiscipline.bike);
  assertEgal(ordre(run), ['b', 'a'], 'classement Run — 200 > 100');
  assertEgal(ordre(bike), ['a', 'b'], 'classement Bike — 900 > 50, l\'ordre s\'INVERSE');
  // La preuve que rien n'a été sommé : sommées, les surfaces de `a` (1000)
  // écraseraient celles de `b` (250) dans les DEUX tableaux.
  assert(run.ok && run.rows[0]!.controlledAreaM2 === 200, 'la surface Run de `b` doit rester 200');
  assert(bike.ok && bike.rows[0]!.controlledAreaM2 === 900, 'la surface Bike de `a` doit rester 900');
});

Deno.test('§1.2 — une discipline sans aucun sujet reste PRÉSENTE et vide, jamais absente', () => {
  const grouped = groupLeaderboardByActivity([entry('seul', { activity: 'run' })]);
  assertEgal(grouped.bike.length, 0, '« aucun cycliste » est un fait, pas une absence de calcul');
  assertEgal(grouped.run.length, 1, 'et le coureur est bien là');
  assert('bike' in grouped, 'la discipline vide doit exister dans la sortie');
});

// ═══════════════════════════════════════════════════════════════════════════
// LES ÉTATS QUI NE SONT PAS DES PANNES
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('liste VIDE — classement vide et valide, jamais une erreur', () => {
  for (const activity of ['run', 'bike'] as Activity[]) {
    const r = rankLeaderboard(activity, []);
    assert(r.ok, '« personne n\'est classé » est un état réel du jeu, pas un échec');
    if (r.ok) {
      assertEgal(r.rows.length, 0, 'zéro ligne');
      assertEgal(r.activity, activity, 'la discipline du classement vide reste connue');
    }
  }
});

Deno.test('un seul sujet — rang 1, sans ex aequo', () => {
  const r = rankLeaderboard('run', [entry('solo', { controlledAreaM2: 1 })]);
  assertEgal(rangs(r), [1], 'un classement à un seul sujet est un classement');
});

Deno.test('surface ZÉRO — le sujet est classé dernier, jamais retiré du tableau', () => {
  const r = rankLeaderboard('run', [entry('vide'), entry('plein', { controlledAreaM2: 5 })]);
  assertEgal(ordre(r), ['plein', 'vide'], 'zéro m² reste une mesure réelle : le sujet existe');
  assertEgal(rangs(r), [1, 2], 'et il occupe un rang');
});

// ═══════════════════════════════════════════════════════════════════════════
// CE QUE LE MOTEUR REFUSE DE CLASSER
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('le même sujet deux fois est REFUSÉ (le fusionner inventerait une surface)', () => {
  const r = rankLeaderboard('run', [
    entry('double', { controlledAreaM2: 100 }),
    entry('double', { controlledAreaM2: 200 }),
  ]);
  assert(!r.ok, 'un doublon doit être refusé');
  if (!r.ok) assertEgal(r.reason, 'duplicate_subject', 'motif attendu');
});

Deno.test('un joueur et un crew de même identifiant NE SONT PAS un doublon', () => {
  const r = rankLeaderboard('run', [
    entry('meme-uuid', { subjectType: 'user', controlledAreaM2: 100 }),
    entry('meme-uuid', { subjectType: 'crew', controlledAreaM2: 200 }),
  ]);
  assert(r.ok, 'l\'unicité porte sur (type, id), pas sur l\'id seul');
  assertEgal(ordre(r), ['meme-uuid', 'meme-uuid'], 'les deux sujets sont classés');
});

Deno.test('une mesure non finie ou négative est REFUSÉE (jamais classée « au mieux »)', () => {
  const cas: Array<[string, Partial<LeaderboardEntry>, string]> = [
    ['NaN de surface', { controlledAreaM2: Number.NaN }, 'measure_not_finite'],
    ['surface infinie', { controlledAreaM2: Number.POSITIVE_INFINITY }, 'measure_not_finite'],
    ['surface négative', { controlledAreaM2: -1 }, 'measure_negative'],
    ['défenses négatives', { successfulDefenses: -2 }, 'measure_negative'],
    ['conquête négative', { conqueredAreaM2: -0.5 }, 'measure_negative'],
    ['demi-défense', { successfulDefenses: 1.5 }, 'measure_not_integer'],
    ['ancienneté NaN', { previousSnapshotAtMs: Number.NaN }, 'measure_not_finite'],
  ];
  for (const [quoi, patch, motif] of cas) {
    const r = rankLeaderboard('run', [entry('sain', { controlledAreaM2: 1 }), entry('malade', patch)]);
    assert(!r.ok, `${quoi} : devait être refusé`);
    if (!r.ok) {
      assertEgal(r.reason, motif, `${quoi} : motif attendu`);
      assertEgal(r.subjectId, 'malade', `${quoi} : le sujet fautif doit être nommé`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ANTI PAY-TO-WIN — LE CLASSEMENT NE CONNAÎT AUCUN STATUT PAYANT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('anti pay-to-win — aucun champ d\'entrée ne peut porter un avantage acheté', () => {
  // Le type `LeaderboardEntry` n'a QUE des mesures de terrain. Ce test verrouille
  // la SURFACE D'ENTRÉE elle-même : si un lot futur ajoutait `premium`,
  // `boostMultiplier` ou `shieldLevel`, il tomberait ici avant d'atteindre
  // l'écran — et c'est exactement là qu'il doit tomber.
  const clefs = Object.keys(entry('x')).sort();
  assertEgal(
    clefs,
    [
      'activity',
      'conqueredAreaM2',
      'controlledAreaM2',
      'previousSnapshotAtMs',
      'subjectId',
      'subjectType',
      'successfulDefenses',
    ],
    'la surface d\'entrée du classement a changé — vérifier qu\'aucun statut payant n\'y est entré',
  );
});
