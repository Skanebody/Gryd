/**
 * GRYD — E68 : ce que le détail d'une sortie archivée doit tenir, prouvé.
 *
 * On ne verrouille pas « l'écran s'affiche » mais les règles d'honnêteté qui,
 * laissées dans le JSX, se trompent en silence :
 *   · un impact INCONNU (payload absent/tronqué) ne se rend jamais comme un
 *     impact NUL — c'est la faute la plus répétée du dépôt ;
 *   · un motif de refus INCONNU ne se transforme jamais en explication ;
 *   · une sortie refusée ou gelée n'ouvre pas de bloc « impact » (elle n'en a
 *     aucun par construction serveur) ;
 *   · `points_awarded = 0` EST un fait, à la différence d'un compteur de
 *     `celebration` manquant — les deux ne doivent pas se confondre ;
 *   · le TOTAL pris suit la convention EXACTE de la ligne d'historique, sinon
 *     le détail contredirait la liste d'où il est ouvert.
 */
import { assert, assertEquals, assertFalse } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  capturedTotal,
  effortIsMeasured,
  impactBreakdown,
  impactIsKnown,
  parseRejectReason,
  runAwards,
  runTraceState,
  runVerdict,
  verdictAllowsImpact,
} from './runDetail.ts';
// La convention de total du DÉTAIL doit rester celle de la LIGNE : on la relit
// depuis la source qui la porte déjà, plutôt que de la recopier ici.
import { runStory } from './historyView.ts';

// ─── impactBreakdown : un payload illisible ne devient JAMAIS un bilan à 0 ───

Deno.test('impactBreakdown : payload absent -> six null, aucun zéro', () => {
  for (const bad of [null, undefined, 'nope', 42, [], {}]) {
    const b = impactBreakdown(bad);
    assertEquals(b, {
      claimed: null,
      stolen: null,
      pioneer: null,
      defended: null,
      blocked: null,
      coCaptured: null,
    });
    assertFalse(impactIsKnown(b), 'un payload illisible ne « sait » rien');
  }
});

Deno.test('impactBreakdown : payload PARTIEL — on garde ce qui est lisible', () => {
  // Le serveur a bien dit « 3 neuves », il n'a rien dit du reste. Taire les 3
  // perdrait de l'information RÉELLE ; mettre 0 aux autres en inventerait.
  const b = impactBreakdown({ hexes: { claimed: 3, stolen: 'x', pioneer: null } });
  assertEquals(b.claimed, 3);
  assertEquals(b.stolen, null);
  assertEquals(b.pioneer, null);
  assert(impactIsKnown(b));
});

Deno.test('impactBreakdown : un 0 SERVEUR reste un 0 (décision), pas un null', () => {
  const b = impactBreakdown({
    hexes: { claimed: 0, stolen: 0, pioneer: 0, defended: 0, blocked: 2 },
  });
  assertEquals(b.claimed, 0);
  assertEquals(b.blocked, 2);
  assert(impactIsKnown(b), '« le serveur a dit 0 » est une information');
});

Deno.test('impactBreakdown : un compteur négatif est rejeté (jamais rendu tel quel)', () => {
  const b = impactBreakdown({ hexes: { claimed: -1, defended: 2 } });
  assertEquals(b.claimed, null);
  assertEquals(b.defended, 2);
});

Deno.test('impactBreakdown : coCaptured (LE RELAIS) est lu quand il est là', () => {
  assertEquals(impactBreakdown({ hexes: { coCaptured: 4 } }).coCaptured, 4);
  // Absent = 0 côté contrat serveur, mais on ne le SAIT pas : reste null.
  assertEquals(impactBreakdown({ hexes: { claimed: 1 } }).coCaptured, null);
});

// ─── capturedTotal : la MÊME convention que la ligne d'historique ────────────

Deno.test('capturedTotal : neuf + arraché + pionnier', () => {
  const b = impactBreakdown({ hexes: { claimed: 2, stolen: 3, pioneer: 1 } });
  assertEquals(capturedTotal(b), 6);
});

Deno.test('capturedTotal : une composante manquante -> null (jamais un sous-total)', () => {
  // Rendre 5 ici afficherait « +5 zones » sous une ligne d'historique qui, elle,
  // n'affiche AUCUN chiffre : le détail contredirait la liste.
  const b = impactBreakdown({ hexes: { claimed: 2, stolen: 3 } });
  assertEquals(b.pioneer, null);
  assertEquals(capturedTotal(b), null);
});

Deno.test('capturedTotal reste ALIGNÉ sur runStory (liste ↔ détail)', () => {
  // Une reprise pure : la ligne raconte « Reprise · 3 », le détail doit compter
  // 3 pris au total — sinon les deux surfaces se contredisent sur la même course.
  const b = impactBreakdown({ hexes: { claimed: 0, stolen: 3, pioneer: 0, defended: 0 } });
  const total = capturedTotal(b);
  assertEquals(total, 3);
  assertEquals(runStory({ captured: total, retaken: b.stolen, defended: b.defended }), {
    type: 'reprise',
    zones: 3,
  });
});

// ─── parseRejectReason : une cause inconnue n'est pas une cause ──────────────

Deno.test('parseRejectReason : les motifs du domaine passent', () => {
  for (const r of ['too_short', 'too_brief', 'pace_too_fast', 'pace_too_slow', 'too_far', 'no_valid_points']) {
    assertEquals(parseRejectReason(r), r);
  }
});

Deno.test('parseRejectReason : inconnu / absent -> null (aucune cause inventée)', () => {
  for (const bad of [null, undefined, '', 'gps_jitter', 'TOO_SHORT', 'sabotage']) {
    assertEquals(parseRejectReason(bad), null);
  }
});

// ─── runVerdict : quatre cas, aucun n'absorbe l'autre ───────────────────────

Deno.test('runVerdict : les quatre statuts sont distincts', () => {
  assertEquals(runVerdict('valid', null), { kind: 'valid' });
  assertEquals(runVerdict('partial', null), { kind: 'partial' });
  assertEquals(runVerdict('flagged', null), { kind: 'flagged' });
  assertEquals(runVerdict('rejected', 'too_short'), { kind: 'rejected', reason: 'too_short' });
});

Deno.test('runVerdict : refusée SANS motif lisible -> refusée, sans cause', () => {
  assertEquals(runVerdict('rejected', 'quelque_chose'), { kind: 'rejected', reason: null });
  assertEquals(runVerdict('rejected', null), { kind: 'rejected', reason: null });
});

Deno.test('verdictAllowsImpact : refusée/gelée n’ouvre AUCUN bloc impact', () => {
  // `ingest_run` insère la ligne et n'écrit aucun hex sur ces deux statuts :
  // un bloc « impact » vide s'y lirait comme une perte, pas comme une absence.
  assertFalse(verdictAllowsImpact(runVerdict('rejected', 'too_far')));
  assertFalse(verdictAllowsImpact(runVerdict('flagged', null)));
  assert(verdictAllowsImpact(runVerdict('valid', null)));
  assert(verdictAllowsImpact(runVerdict('partial', null)));
});

// ─── runAwards : ici, 0 est une vérité (colonne NOT NULL DEFAULT 0) ─────────

Deno.test('runAwards : 0 point est un FAIT serveur, pas un trou', () => {
  assertEquals(runAwards({ pointsAwarded: 0, xpAwarded: 0 }), { points: 0, xp: 0 });
});

Deno.test('runAwards : une colonne non numérique -> null (rien de fabriqué)', () => {
  assertEquals(runAwards({ pointsAwarded: null, xpAwarded: 12 }), { points: null, xp: 12 });
  assertEquals(
    runAwards({ pointsAwarded: Number.NaN as unknown as number, xpAwarded: -3 }),
    { points: null, xp: null },
  );
});

// ─── effortIsMeasured : 0 km n'est pas une performance, c'est une absence ───

Deno.test('effortIsMeasured : seules les mesures strictement positives comptent', () => {
  assert(effortIsMeasured(4.8));
  assertFalse(effortIsMeasured(0));
  assertFalse(effortIsMeasured(-1));
  assertFalse(effortIsMeasured(Number.NaN));
});

// ─── LE TRACÉ : E68 n'en a aucun, et le test empêche que ça change en douce ──

Deno.test('runTraceState : aucune trace archivée — et la raison est SERVEUR', () => {
  // Si un jour `ingest_run` écrit `polyline_masked`, ce test échoue : c'est
  // exactement ce qu'on veut. La carte de E68 doit alors être écrite EN MÊME
  // TEMPS que l'archivage, pas devinée après.
  assertEquals(runTraceState(), 'not-archived');
});
