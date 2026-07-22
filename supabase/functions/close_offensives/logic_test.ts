/**
 * Tests close_offensives/logic.ts — la partie PURE du job de clôture (§38.3).
 * Purs : lignes construites en mémoire, aucun réseau, aucune horloge implicite.
 *
 * Ce que ces tests tiennent, et qu'aucune relecture ne tient durablement :
 *   • un rejeu de cron ne recrédite RIEN (claimed=false / finalized=false ne
 *     comptent ni XP, ni coffre, ni participation) — c'est LA règle du lot ;
 *   • un `fail` crédite 0 XP et 0 coffre, mais la PARTICIPATION compte quand
 *     même (la métrique s'appelle « offensives rejointes ») ;
 *   • une réponse RPC de forme inattendue ne se lit JAMAIS comme un succès ;
 *   • le coffre est attribué à la semaine de la CLÔTURE, pas à celle du cron ;
 *   • aucun seuil n'est réécrit ici : les attentes se dérivent des constantes.
 */
import { assertEquals, assertFalse, assert } from 'jsr:@std/assert@^1';
import {
  CREW_CHEST_WEIGHTS,
  CREW_XP_SOURCES,
  OFFENSIVE_JOINED_MIN_HEXES,
  OFFENSIVE_FULL_AWARD_OBJECTIVE_HEXES,
  OFFENSIVE_RESULT_AWARD_FACTOR,
  OFFENSIVE_RESULT_THRESHOLDS,
} from '../_shared/game-rules.ts';
import {
  type ContributionRow,
  emptyReport,
  isoWeekStart,
  parseActivated,
  parseClaim,
  parseFinalize,
  type PendingFinalizeRow,
  planFinalization,
  recordClaim,
  recordFailure,
  recordFinalize,
  toContributions,
} from './logic.ts';

const NOW = new Date('2026-07-23T10:00:00Z'); // un jeudi
const OFF = 'off-1111';
const CREW = 'crew-aaa';
const U1 = 'user-1';
const U2 = 'user-2';

/**
 * Objectif de référence des fixtures : celui qui mérite le barème PLEIN (§38.2b).
 * Depuis que la récompense suit l'ambition, un objectif de 10 hexes ne vaut plus
 * le barème complet — les tests « au barème » doivent donc partir d'un objectif
 * réellement ambitieux, sinon ils testeraient la part plancher sans le dire.
 */
const OBJ = OFFENSIVE_FULL_AWARD_OBJECTIVE_HEXES;

function pending(over: Partial<PendingFinalizeRow> = {}): PendingFinalizeRow {
  return {
    id: OFF,
    crew_id: CREW,
    objectif_hexes: OBJ,
    hexes_taken: OBJ,
    closed_at: '2026-07-22T08:00:00Z',
    ...over,
  };
}

const contrib = (user_id: string, hexes: number | string | null): ContributionRow => ({
  user_id,
  hexes,
});

// ─── PASSE A : activation ────────────────────────────────────────────────────

Deno.test('parseActivated lit les ids activés', () => {
  assertEquals(parseActivated({ activated: ['a', 'b'] }), ['a', 'b']);
  assertEquals(parseActivated({ activated: [] }), []);
});

Deno.test('parseActivated ne devine jamais : forme inattendue → aucune activation', () => {
  assertEquals(parseActivated(null), []);
  assertEquals(parseActivated('ok'), []);
  assertEquals(parseActivated({}), []);
  assertEquals(parseActivated({ activated: 3 }), []);
  // Les entrées non textuelles sont écartées : on ne compte que ce qu'on peut nommer.
  assertEquals(parseActivated({ activated: ['a', 42, null] }), ['a']);
});

Deno.test('parseActivated déballe une réponse enveloppée dans un tableau', () => {
  assertEquals(parseActivated([{ activated: ['a'] }]), ['a']);
});

// ─── PASSE B : réclamation de clôture ────────────────────────────────────────

Deno.test('parseClaim : la clôture gagnée est reconnue avec ses chiffres figés', () => {
  const out = parseClaim({
    found: true,
    claimed: true,
    crew_id: CREW,
    hexes_taken: 7,
    objectif_hexes: 10,
  });
  assertEquals(out, {
    found: true,
    claimed: true,
    crewId: CREW,
    hexesTaken: 7,
    objectifHexes: 10,
  });
});

Deno.test('parseClaim : déjà clôturée (rejeu de cron) → claimed=false', () => {
  const out = parseClaim({ found: true, claimed: false, crew_id: CREW, hexes_taken: 3 });
  assert(out.found);
  assertFalse(out.claimed);
});

Deno.test('parseClaim : réponse inconnue ne vaut jamais un succès', () => {
  for (const raw of [null, undefined, 'done', 42, {}]) {
    const out = parseClaim(raw);
    assertFalse(out.found);
    assertFalse(out.claimed);
    assertEquals(out.hexesTaken, null);
  }
});

// ─── PASSE C : plan de finalisation (verdict + récompense) ───────────────────

Deno.test('planFinalization : objectif atteint → victory, XP et coffre au barème', () => {
  const plan = planFinalization(pending(), [], NOW);
  assertEquals(plan.result, 'victory');
  assertEquals(plan.crewXp, CREW_XP_SOURCES.offensiveCompleted);
  assertEquals(plan.chestDelta, CREW_CHEST_WEIGHTS.offensiveCompleted);
});

Deno.test('planFinalization : moitié de l’objectif → partial au facteur du barème', () => {
  const half = Math.ceil(OBJ * OFFENSIVE_RESULT_THRESHOLDS.partial);
  const plan = planFinalization(pending({ hexes_taken: half }), [], NOW);
  assertEquals(plan.result, 'partial');
  assertEquals(
    plan.crewXp,
    Math.floor(CREW_XP_SOURCES.offensiveCompleted * OFFENSIVE_RESULT_AWARD_FACTOR.partial),
  );
});

Deno.test('planFinalization : échec → 0 XP et 0 coffre (aucun lot de consolation)', () => {
  const plan = planFinalization(pending({ hexes_taken: 0 }), [], NOW);
  assertEquals(plan.result, 'fail');
  assertEquals(plan.crewXp, 0);
  assertEquals(plan.chestDelta, 0);
});

Deno.test('planFinalization : un échec compte quand même les participations', () => {
  const plan = planFinalization(
    pending({ hexes_taken: 1, objectif_hexes: 100 }),
    [contrib(U2, OFFENSIVE_JOINED_MIN_HEXES), contrib(U1, OFFENSIVE_JOINED_MIN_HEXES)],
    NOW,
  );
  assertEquals(plan.result, 'fail');
  assertEquals(plan.crewXp, 0);
  // Trié et dédupliqué : « offensives rejointes », pas « offensives gagnées ».
  assertEquals(plan.joinedUserIds, [U1, U2]);
});

Deno.test('planFinalization : une contribution à 0 hex ne compte pas comme rejointe', () => {
  const plan = planFinalization(
    pending(),
    [contrib(U1, 0), contrib(U2, OFFENSIVE_JOINED_MIN_HEXES)],
    NOW,
  );
  assertEquals(plan.joinedUserIds, [U2]);
});

Deno.test('planFinalization : hexes_taken FIGÉ prime sur la somme des contributions', () => {
  // Une contribution arrivée après la clôture ne doit pas changer le verdict :
  // la transition A a figé le chiffre sous verrou, c'est lui qui juge.
  const plan = planFinalization(
    pending({ hexes_taken: 2, objectif_hexes: 10 }),
    [contrib(U1, 50)],
    NOW,
  );
  assertEquals(plan.hexesTaken, 2);
  assertEquals(plan.result, 'fail');
});

Deno.test('planFinalization : sans hexes_taken, la somme MESURÉE sert de repli', () => {
  const plan = planFinalization(
    pending({ hexes_taken: null, objectif_hexes: 10 }),
    [contrib(U1, 6), contrib(U2, 4)],
    NOW,
  );
  assertEquals(plan.hexesTaken, 10);
  assertEquals(plan.result, 'victory');
});

Deno.test('planFinalization : PostgREST peut rendre des nombres en texte', () => {
  const plan = planFinalization(
    pending({ hexes_taken: '10' as unknown as number, objectif_hexes: '10' as unknown as number }),
    [contrib(U1, '4')],
    NOW,
  );
  assertEquals(plan.hexesTaken, 10);
  assertEquals(plan.result, 'victory');
  assertEquals(plan.joinedUserIds, [U1]);
});

Deno.test('planFinalization : le coffre va à la semaine de la CLÔTURE, pas du cron', () => {
  // Clôturée le mercredi 15/07, reprise par le cron le jeudi 23/07 (crash entre
  // A et B) : l'effort reste attribué à la semaine où il s'est terminé.
  const plan = planFinalization(pending({ closed_at: '2026-07-15T23:00:00Z' }), [], NOW);
  assertEquals(plan.weekStart, '2026-07-13');
  assertEquals(isoWeekStart(NOW), '2026-07-20');
});

Deno.test('planFinalization : closed_at manquant ou illisible → semaine du passage', () => {
  assertEquals(planFinalization(pending({ closed_at: null }), [], NOW).weekStart, '2026-07-20');
  assertEquals(planFinalization(pending({ closed_at: 'pas-une-date' }), [], NOW).weekStart, '2026-07-20');
});

Deno.test('isoWeekStart : un lundi est son propre début de semaine', () => {
  assertEquals(isoWeekStart(new Date('2026-07-20T00:00:00Z')), '2026-07-20');
  assertEquals(isoWeekStart(new Date('2026-07-26T23:59:59Z')), '2026-07-20'); // dimanche
});

Deno.test('toContributions : hexes illisibles valent 0, jamais NaN', () => {
  assertEquals(toContributions([contrib(U1, null), contrib(U2, 'x')]), [
    { userId: U1, hexes: 0 },
    { userId: U2, hexes: 0 },
  ]);
});

Deno.test('parseFinalize : forme inattendue → rien n’a été fait', () => {
  for (const raw of [null, 'ok', {}, []]) {
    assertEquals(parseFinalize(raw), {
      finalized: false,
      levelFrom: null,
      levelTo: null,
      joined: 0,
    });
  }
});

Deno.test('parseFinalize lit le niveau et les participations créditées', () => {
  assertEquals(parseFinalize({ finalized: true, level_from: 2, level_to: 3, joined: 4 }), {
    finalized: true,
    levelFrom: 2,
    levelTo: 3,
    joined: 4,
  });
});

// ─── Rapport : des compteurs RÉELS ───────────────────────────────────────────

Deno.test('emptyReport : rien à faire = tout à zéro et ok (pas un échec)', () => {
  const r = emptyReport();
  assert(r.ok);
  assertEquals(r.activated + r.due + r.closed + r.finalized + r.xpCredited, 0);
  assertEquals(r.failures, []);
});

Deno.test('recordClaim distingue les trois issues réelles', () => {
  const r = emptyReport();
  recordClaim(r, parseClaim({ found: true, claimed: true }));
  recordClaim(r, parseClaim({ found: true, claimed: false }));
  recordClaim(r, parseClaim({ found: false, claimed: false }));
  assertEquals([r.closed, r.alreadyClosed, r.vanished], [1, 1, 1]);
});

Deno.test('recordFinalize : un rejeu (finalized=false) ne crédite RIEN', () => {
  const r = emptyReport();
  const plan = planFinalization(pending(), [contrib(U1, 5)], NOW);
  recordFinalize(r, plan, { finalized: false, levelFrom: null, levelTo: null, joined: 0 });
  assertEquals(r.finalized, 0);
  assertEquals(r.xpCredited, 0);
  assertEquals(r.chestCredited, 0);
  assertEquals(r.joinedCredited, 0);
  assertEquals(r.victories, 0);
});

Deno.test('recordFinalize : deux passages sur la même offensive ne doublent pas l’XP', () => {
  const r = emptyReport();
  const plan = planFinalization(pending(), [contrib(U1, 5)], NOW);
  recordFinalize(r, plan, { finalized: true, levelFrom: 1, levelTo: 2, joined: 1 });
  recordFinalize(r, plan, { finalized: false, levelFrom: null, levelTo: null, joined: 0 });
  assertEquals(r.finalized, 1);
  assertEquals(r.xpCredited, CREW_XP_SOURCES.offensiveCompleted);
  assertEquals(r.joinedCredited, 1);
  assertEquals(r.crewLevelUps, 1);
});

Deno.test('recordFinalize : niveau inchangé → aucune montée comptée', () => {
  const r = emptyReport();
  const plan = planFinalization(pending(), [], NOW);
  recordFinalize(r, plan, { finalized: true, levelFrom: 3, levelTo: 3, joined: 0 });
  assertEquals(r.crewLevelUps, 0);
  assertEquals(r.victories, 1);
});

Deno.test('recordFinalize ventile les résultats sans en inventer', () => {
  const r = emptyReport();
  const done = { finalized: true, levelFrom: null, levelTo: null, joined: 0 };
  recordFinalize(r, planFinalization(pending(), [], NOW), done);
  recordFinalize(
    r,
    planFinalization(pending({ hexes_taken: Math.ceil(OBJ * OFFENSIVE_RESULT_THRESHOLDS.partial) }), [], NOW),
    done,
  );
  recordFinalize(r, planFinalization(pending({ hexes_taken: 0 }), [], NOW), done);
  assertEquals([r.victories, r.partials, r.fails], [1, 1, 1]);
  assertEquals(r.finalized, 3);
  // Le fail n'a rien ajouté au total d'XP.
  assertEquals(
    r.xpCredited,
    CREW_XP_SOURCES.offensiveCompleted +
      Math.floor(CREW_XP_SOURCES.offensiveCompleted * OFFENSIVE_RESULT_AWARD_FACTOR.partial),
  );
});

Deno.test('recordFailure : un échec isolé fait tomber ok mais garde le détail', () => {
  const r = emptyReport();
  recordFailure(r, 'finalize', OFF, 'boom');
  assertFalse(r.ok);
  assertEquals(r.failures, [{ step: 'finalize', offensiveId: OFF, message: 'boom' }]);
  // Un échec de LECTURE n'est rattaché à aucune offensive : il ne doit pas être
  // maquillé en échec d'une offensive précise.
  recordFailure(r, 'scan', null, 'offensives read: down');
  assertEquals(r.failures.length, 2);
  assertEquals(r.failures[1].offensiveId, null);
});
