/**
 * Tests §38 — cycle de vie d'une offensive crew (moteur PUR, engine/offensive.ts).
 *
 * Couvre : bornes de création (rôle, libellé, rayon, objectif, durée, avance,
 * plafond anti-spam), transitions de phase (preparation→active→done, `done`
 * TERMINAL), récompense de clôture par résultat (fail = 0, aucun lot de
 * consolation), et la métrique `offensivesJoined` (contributeurs RÉELS,
 * dédupliqués). AUCUN réseau, aucune horloge (nowMs toujours paramètre).
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  CREW_CHEST_WEIGHTS,
  CREW_XP_SOURCES,
  OFFENSIVE_DURATION_H,
  OFFENSIVE_JOINED_MIN_HEXES,
  OFFENSIVE_MAX_ACTIVE_PER_CREW,
  OFFENSIVE_MAX_DURATION_H,
  OFFENSIVE_MAX_LEAD_TIME_H,
  OFFENSIVE_MIN_DURATION_H,
  OFFENSIVE_OBJECTIVE_HEXES_MAX,
  OFFENSIVE_OBJECTIVE_HEXES_MIN,
  OFFENSIVE_RADIUS_KM_MAX,
  OFFENSIVE_RADIUS_KM_MIN,
  OFFENSIVE_RESULT_AWARD_FACTOR,
  OFFENSIVE_ZONE_LABEL_MAX,
  type CrewRole,
} from '../_shared/game-rules.ts';
import {
  joinedContributors,
  offensiveAward,
  offensiveHexesTaken,
  offensiveStatusAt,
  shouldActivateOffensive,
  shouldCloseOffensive,
  validateOffensiveDraft,
  type OffensiveCreationContext,
  type OffensiveDraft,
} from '../_shared/engine/offensive.ts';

const H = 3_600_000;
const NOW = Date.parse('2026-07-23T12:00:00Z');

/** Brouillon VALIDE de référence : 24 h (OFFENSIVE_DURATION_H), ouvert maintenant. */
function draft(over: Partial<OffensiveDraft> = {}): OffensiveDraft {
  return {
    zoneLabel: 'Canal Saint-Martin',
    radiusKm: 2,
    objectiveHexes: 60,
    startsAtMs: NOW,
    endsAtMs: NOW + OFFENSIVE_DURATION_H * H,
    ...over,
  };
}

function ctx(over: Partial<OffensiveCreationContext> = {}): OffensiveCreationContext {
  return { nowMs: NOW, role: 'founder', openOffensives: 0, ...over };
}

// ─── Création : le cas nominal ───────────────────────────────────────────────

// ─── Antidatage : le temps DÉCLARÉ n'est pas le temps JOUABLE ────────────────
// La durée se jugeait sur `endsAt - startsAt`, sans jamais borner `startsAt` par
// le bas : antidater le début ouvrait une offensive dont la fenêtre annoncée
// respecte le minimum alors qu'il ne reste presque plus de temps pour courir.
// OFFENSIVE_MIN_DURATION_H cessait donc d'être opposable.

Deno.test('validateOffensiveDraft : début antidaté qui ne laisse plus le minimum JOUABLE → refusé', () => {
  // Fenêtre déclarée = MIN (donc valide en apparence), mais elle a commencé il y
  // a MIN − 1 min : il ne reste qu'une minute de course.
  const startsAtMs = NOW - (OFFENSIVE_MIN_DURATION_H * H - 60_000);
  assertEquals(
    validateOffensiveDraft(
      draft({ startsAtMs, endsAtMs: startsAtMs + OFFENSIVE_MIN_DURATION_H * H }),
      ctx(),
    ),
    { ok: false, reason: 'duration_out_of_range' },
  );
});

Deno.test('validateOffensiveDraft : début antidaté mais minimum JOUABLE préservé → accepté', () => {
  // L'antidatage n'est pas interdit : il est seulement privé d'intérêt. Ici il
  // reste tout le minimum à courir, l'offensive démarre simplement déjà active.
  const startsAtMs = NOW - 2 * H;
  assertEquals(
    validateOffensiveDraft(
      draft({ startsAtMs, endsAtMs: NOW + OFFENSIVE_MIN_DURATION_H * H }),
      ctx(),
    ),
    { ok: true },
  );
});

Deno.test('validateOffensiveDraft : brouillon 24 h par le founder → accepté', () => {
  assertEquals(validateOffensiveDraft(draft(), ctx()), { ok: true });
});

Deno.test('validateOffensiveDraft : le rôle gate vient de CREW_PERMISSIONS.launchOffensive', () => {
  // co_captain et founder passent ; personne d'autre — y compris le captain,
  // qui ne peut que PROPOSER (proposeOffensive), et le strategist.
  const allowed: CrewRole[] = ['co_captain', 'founder'];
  const refused: CrewRole[] = ['rookie', 'runner', 'scout', 'strategist', 'captain'];
  for (const role of allowed) {
    assertEquals(validateOffensiveDraft(draft(), ctx({ role })), { ok: true }, role);
  }
  for (const role of refused) {
    assertEquals(
      validateOffensiveDraft(draft(), ctx({ role })),
      { ok: false, reason: 'forbidden_role' },
      role,
    );
  }
});

// ─── Création : bornes de forme ──────────────────────────────────────────────

Deno.test('validateOffensiveDraft : libellé vide ou trop long refusé (bornes 0010)', () => {
  assertEquals(
    validateOffensiveDraft(draft({ zoneLabel: '   ' }), ctx()),
    { ok: false, reason: 'label_length' },
  );
  const long = 'x'.repeat(OFFENSIVE_ZONE_LABEL_MAX + 1);
  assertEquals(
    validateOffensiveDraft(draft({ zoneLabel: long }), ctx()),
    { ok: false, reason: 'label_length' },
  );
  // Exactement à la borne : accepté (borne INCLUSE).
  assertEquals(
    validateOffensiveDraft(draft({ zoneLabel: 'y'.repeat(OFFENSIVE_ZONE_LABEL_MAX) }), ctx()),
    { ok: true },
  );
});

Deno.test('validateOffensiveDraft : rayon hors [MIN, MAX] refusé, bornes incluses', () => {
  for (const r of [OFFENSIVE_RADIUS_KM_MIN, OFFENSIVE_RADIUS_KM_MAX]) {
    assertEquals(validateOffensiveDraft(draft({ radiusKm: r }), ctx()), { ok: true }, `${r}`);
  }
  for (const r of [0, -1, OFFENSIVE_RADIUS_KM_MIN / 2, OFFENSIVE_RADIUS_KM_MAX + 0.1, NaN]) {
    assertEquals(
      validateOffensiveDraft(draft({ radiusKm: r }), ctx()),
      { ok: false, reason: 'radius_out_of_range' },
      `${r}`,
    );
  }
});

Deno.test('validateOffensiveDraft : objectif hors bornes ou non entier refusé', () => {
  for (const o of [OFFENSIVE_OBJECTIVE_HEXES_MIN, OFFENSIVE_OBJECTIVE_HEXES_MAX]) {
    assertEquals(validateOffensiveDraft(draft({ objectiveHexes: o }), ctx()), { ok: true }, `${o}`);
  }
  for (
    const o of [
      0,
      -5,
      OFFENSIVE_OBJECTIVE_HEXES_MIN - 1,
      OFFENSIVE_OBJECTIVE_HEXES_MAX + 1,
      12.5,
    ]
  ) {
    assertEquals(
      validateOffensiveDraft(draft({ objectiveHexes: o }), ctx()),
      { ok: false, reason: 'objective_out_of_range' },
      `${o}`,
    );
  }
});

Deno.test('validateOffensiveDraft : fenêtre inversée ou nulle refusée', () => {
  assertEquals(
    validateOffensiveDraft(draft({ endsAtMs: NOW - H }), ctx()),
    { ok: false, reason: 'window_invalid' },
  );
  assertEquals(
    validateOffensiveDraft(draft({ endsAtMs: NOW }), ctx()),
    { ok: false, reason: 'window_invalid' },
  );
});

Deno.test('validateOffensiveDraft : durée hors [MIN_DURATION_H, MAX_DURATION_H]', () => {
  const shortWin = draft({ endsAtMs: NOW + (OFFENSIVE_MIN_DURATION_H - 1) * H });
  assertEquals(
    validateOffensiveDraft(shortWin, ctx()),
    { ok: false, reason: 'duration_out_of_range' },
  );
  const longWin = draft({ endsAtMs: NOW + (OFFENSIVE_MAX_DURATION_H + 1) * H });
  assertEquals(
    validateOffensiveDraft(longWin, ctx()),
    { ok: false, reason: 'duration_out_of_range' },
  );
  // Bornes exactes : acceptées.
  for (const d of [OFFENSIVE_MIN_DURATION_H, OFFENSIVE_MAX_DURATION_H]) {
    assertEquals(
      validateOffensiveDraft(draft({ endsAtMs: NOW + d * H }), ctx()),
      { ok: true },
      `${d}h`,
    );
  }
});

Deno.test('validateOffensiveDraft : programmation au-delà de MAX_LEAD_TIME_H refusée', () => {
  const start = NOW + (OFFENSIVE_MAX_LEAD_TIME_H + 1) * H;
  assertEquals(
    validateOffensiveDraft(
      draft({ startsAtMs: start, endsAtMs: start + OFFENSIVE_DURATION_H * H }),
      ctx(),
    ),
    { ok: false, reason: 'starts_too_far_ahead' },
  );
  // Pile à la borne : accepté.
  const ok = NOW + OFFENSIVE_MAX_LEAD_TIME_H * H;
  assertEquals(
    validateOffensiveDraft(
      draft({ startsAtMs: ok, endsAtMs: ok + OFFENSIVE_DURATION_H * H }),
      ctx(),
    ),
    { ok: true },
  );
});

Deno.test('validateOffensiveDraft : une offensive déjà expirée ne peut pas naître', () => {
  const start = NOW - 3 * OFFENSIVE_DURATION_H * H;
  assertEquals(
    validateOffensiveDraft(
      draft({ startsAtMs: start, endsAtMs: start + OFFENSIVE_DURATION_H * H }),
      ctx(),
    ),
    { ok: false, reason: 'window_invalid' },
  );
});

Deno.test('validateOffensiveDraft : plafond anti-spam OFFENSIVE_MAX_ACTIVE_PER_CREW', () => {
  assertEquals(
    validateOffensiveDraft(draft(), ctx({ openOffensives: OFFENSIVE_MAX_ACTIVE_PER_CREW - 1 })),
    { ok: true },
  );
  assertEquals(
    validateOffensiveDraft(draft(), ctx({ openOffensives: OFFENSIVE_MAX_ACTIVE_PER_CREW })),
    { ok: false, reason: 'too_many_open' },
  );
  // Un crew qui aurait dépassé le plafond (données historiques) reste bloqué.
  assertEquals(
    validateOffensiveDraft(draft(), ctx({ openOffensives: 999 })),
    { ok: false, reason: 'too_many_open' },
  );
});

Deno.test('validateOffensiveDraft : le rôle est jugé AVANT la forme (message le plus utile)', () => {
  const bad = draft({ radiusKm: 9_999, objectiveHexes: -1 });
  assertEquals(
    validateOffensiveDraft(bad, ctx({ role: 'rookie' })),
    { ok: false, reason: 'forbidden_role' },
  );
});

// ─── Transitions de phase ────────────────────────────────────────────────────

const win = { startsAtMs: NOW, endsAtMs: NOW + OFFENSIVE_DURATION_H * H };

Deno.test('offensiveStatusAt : preparation avant, active pendant, done après', () => {
  const w = { ...win, status: 'preparation' as const };
  assertEquals(offensiveStatusAt(w, NOW - H), 'preparation');
  assertEquals(offensiveStatusAt(w, NOW), 'active'); // borne basse INCLUSE
  assertEquals(offensiveStatusAt(w, NOW + H), 'active');
  assertEquals(offensiveStatusAt(w, w.endsAtMs - 1), 'active');
  assertEquals(offensiveStatusAt(w, w.endsAtMs), 'done'); // borne haute EXCLUE
});

Deno.test('offensiveStatusAt : `done` est TERMINAL (aucun retour en arrière)', () => {
  const closed = { ...win, status: 'done' as const };
  // Même si l'horloge recule (dérive NTP, rejeu de job) : jamais réactivée.
  assertEquals(offensiveStatusAt(closed, NOW - 10 * H), 'done');
  assertEquals(offensiveStatusAt(closed, NOW), 'done');
  assertFalse(shouldActivateOffensive(closed, NOW));
  assertFalse(shouldCloseOffensive(closed, closed.endsAtMs + H));
});

Deno.test('shouldActivateOffensive : uniquement preparation dont la fenêtre est ouverte', () => {
  const prep = { ...win, status: 'preparation' as const };
  assertFalse(shouldActivateOffensive(prep, NOW - H));
  assert(shouldActivateOffensive(prep, NOW));
  // Fenêtre déjà expirée : on NE l'active pas rétroactivement — on la clôture.
  assertFalse(shouldActivateOffensive(prep, win.endsAtMs + H));
  assert(shouldCloseOffensive(prep, win.endsAtMs + H));
  // Déjà active : rien à activer (idempotence).
  assertFalse(shouldActivateOffensive({ ...win, status: 'active' }, NOW + H));
});

Deno.test('shouldCloseOffensive : vraie dès ends_at, fausse avant, jamais deux fois', () => {
  const active = { ...win, status: 'active' as const };
  assertFalse(shouldCloseOffensive(active, win.endsAtMs - 1));
  assert(shouldCloseOffensive(active, win.endsAtMs));
  // Après la clôture, la même offensive ne redemande jamais de clôture.
  assertFalse(shouldCloseOffensive({ ...win, status: 'done' }, win.endsAtMs + 10 * H));
});

// ─── Clôture : récompense ────────────────────────────────────────────────────

Deno.test('offensiveAward : barème = CREW_XP_SOURCES × facteur de résultat', () => {
  assertEquals(offensiveAward('victory'), {
    crewXp: CREW_XP_SOURCES.offensiveCompleted,
    chestDelta: CREW_CHEST_WEIGHTS.offensiveCompleted,
  });
  assertEquals(offensiveAward('partial'), {
    crewXp: Math.floor(
      CREW_XP_SOURCES.offensiveCompleted * OFFENSIVE_RESULT_AWARD_FACTOR.partial,
    ),
    chestDelta: Math.floor(
      CREW_CHEST_WEIGHTS.offensiveCompleted * OFFENSIVE_RESULT_AWARD_FACTOR.partial,
    ),
  });
});

Deno.test('offensiveAward : un ÉCHEC ne crédite RIEN (aucun lot de consolation)', () => {
  assertEquals(offensiveAward('fail'), { crewXp: 0, chestDelta: 0 });
});

Deno.test('offensiveAward : toujours des entiers, jamais au-dessus du barème', () => {
  for (const r of ['fail', 'partial', 'victory'] as const) {
    const a = offensiveAward(r);
    assert(Number.isInteger(a.crewXp), r);
    assert(Number.isInteger(a.chestDelta), r);
    assert(a.crewXp <= CREW_XP_SOURCES.offensiveCompleted, r);
    assert(a.chestDelta <= CREW_CHEST_WEIGHTS.offensiveCompleted, r);
  }
});

// ─── Clôture : métrique offensivesJoined (Raid Leader / Strategist) ──────────

Deno.test('joinedContributors : seuls les contributeurs RÉELS comptent', () => {
  const joined = joinedContributors([
    { userId: 'u-b', hexes: OFFENSIVE_JOINED_MIN_HEXES },
    { userId: 'u-a', hexes: 12 },
    { userId: 'u-zero', hexes: 0 }, // ligne créée mais 0 hex : ne compte pas
    { userId: 'u-neg', hexes: -3 }, // donnée aberrante : ne compte pas
  ]);
  assertEquals(joined, ['u-a', 'u-b']); // trié → sortie stable
});

Deno.test('joinedContributors : dédoublonne (une offensive = +1 par joueur, jamais 2)', () => {
  assertEquals(
    joinedContributors([
      { userId: 'u-a', hexes: 4 },
      { userId: 'u-a', hexes: 7 },
    ]),
    ['u-a'],
  );
});

Deno.test('joinedContributors : aucune contribution → aucun crédit (état vide honnête)', () => {
  assertEquals(joinedContributors([]), []);
});

Deno.test('offensiveHexesTaken : somme, en ignorant les valeurs négatives', () => {
  assertEquals(offensiveHexesTaken([]), 0);
  assertEquals(
    offensiveHexesTaken([{ userId: 'a', hexes: 10 }, { userId: 'b', hexes: 5 }]),
    15,
  );
  assertEquals(
    offensiveHexesTaken([{ userId: 'a', hexes: 10 }, { userId: 'b', hexes: -5 }]),
    10,
  );
});
