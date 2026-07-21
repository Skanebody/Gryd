/**
 * GRYD — tests de `deriveWelcomeChallenge` (engine/welcomeChallenge.ts,
 * A-45 §3 action 4 : le défi 7 jours d'accueil).
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. ANTI-SHAME — aucune régression possible : un palier franchi ne se re-perd
 *     JAMAIS, et il n'existe aucun état « raté / en retard / expiré » ;
 *  2. la progression est une PROJECTION fidèle des compteurs réels (jamais un
 *     palier offert, jamais un palier masqué) ;
 *  3. l'écran n'a jamais plus d'une chose à proposer (`next`, §A) ;
 *  4. les compteurs illisibles ne franchissent rien tout seuls.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  deriveWelcomeChallenge,
  type WelcomeFacts,
} from '../_shared/engine/welcomeChallenge.ts';
import { WELCOME_CHALLENGE_DAYS, WELCOME_STEPS } from '../_shared/game-rules.ts';

/** Joueur tout neuf : aucune ligne user_stats ⇒ zéro partout, ce qui est VRAI. */
function facts(p: Partial<WelcomeFacts> = {}): WelcomeFacts {
  return { bestRunDistanceM: 0, loopRuns: 0, hexesCaptured: 0, shares: 0, ...p };
}

/** Compteurs qui franchissent les 5 paliers. */
const ALL_DONE: WelcomeFacts = {
  bestRunDistanceM: 5_000,
  loopRuns: 1,
  hexesCaptured: 1,
  shares: 1,
};

// ═══ 1. La DATA du parcours (game-rules) est bien celle attendue ════════════

Deno.test('le parcours est celui de A-45 §3 : 3 km → 5 km → boucle → capture → partage', () => {
  assertEquals(
    WELCOME_STEPS.map((s) => s.key),
    ['run_3k', 'run_5k', 'loop', 'capture', 'share'],
  );
  assertEquals(WELCOME_STEPS.length, 5);
  // Le rythme suggéré tient dans la fenêtre annoncée — c'est une SUGGESTION,
  // et elle doit au moins être cohérente avec le nom du défi.
  for (const s of WELCOME_STEPS) {
    assertEquals(s.day >= 1 && s.day <= WELCOME_CHALLENGE_DAYS, true, s.key);
  }
});

// ═══ 2. État initial : honnête, et jamais dégradé ═══════════════════════════

Deno.test('joueur tout neuf : 0 / 5, prochain palier = 3 km', () => {
  const out = deriveWelcomeChallenge(facts());
  assertEquals(out.kind, 'in_progress');
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.doneCount, 0);
  assertEquals(out.total, 5);
  assertEquals(out.next.key, 'run_3k');
  assertEquals(out.next.target, 3_000);
  assertEquals(out.next.value, 0);
});

Deno.test('facts absents (null/undefined) : même état honnête, jamais un crash', () => {
  for (const input of [null, undefined]) {
    const out = deriveWelcomeChallenge(input);
    assertEquals(out.kind, 'in_progress');
    if (out.kind !== 'in_progress') throw new Error('unreachable');
    assertEquals(out.doneCount, 0);
    assertEquals(out.next.key, 'run_3k');
  }
});

// ═══ 3. Franchissement : le seuil atteint EST franchi ═══════════════════════

Deno.test('atteindre pile le seuil franchit le palier (3 000 m = 3 km)', () => {
  const out = deriveWelcomeChallenge(facts({ bestRunDistanceM: 3_000 }));
  assertEquals(out.kind, 'in_progress');
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.steps[0]?.done, true);
  assertEquals(out.next.key, 'run_5k');
});

Deno.test('un mètre en dessous ne franchit pas (2 999 m ≠ 3 km)', () => {
  const out = deriveWelcomeChallenge(facts({ bestRunDistanceM: 2_999 }));
  assertEquals(out.kind, 'in_progress');
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.doneCount, 0);
  assertEquals(out.next.key, 'run_3k');
});

Deno.test('une course de 5 km franchit AUSSI le palier 3 km (record, pas cumul)', () => {
  const out = deriveWelcomeChallenge(facts({ bestRunDistanceM: 5_000 }));
  assertEquals(out.kind, 'in_progress');
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.doneCount, 2);
  assertEquals(out.next.key, 'loop');
});

Deno.test('les paliers sont indépendants : capturer dès la 1re sortie compte tout de suite', () => {
  // Le joueur a capturé une zone sans avoir encore couru 3 km : on affiche le
  // FAIT (palier capture franchi), et `next` reste la première étape non faite.
  const out = deriveWelcomeChallenge(facts({ hexesCaptured: 1 }));
  assertEquals(out.kind, 'in_progress');
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.doneCount, 1);
  assertEquals(out.steps.find((s) => s.key === 'capture')?.done, true);
  assertEquals(out.next.key, 'run_3k');
});

Deno.test('les 5 paliers franchis → complete (et jamais un 6ᵉ)', () => {
  const out = deriveWelcomeChallenge(ALL_DONE);
  assertEquals(out.kind, 'complete');
  assertEquals(out.doneCount, 5);
  assertEquals(out.total, 5);
  assertEquals(out.steps.every((s) => s.done), true);
});

// ═══ 4. ANTI-SHAME : rien ne régresse, rien n'accuse ════════════════════════

Deno.test('ANTI-SHAME : aucune régression — des compteurs qui ne bougent plus gardent l’acquis', () => {
  // Simule l'inactivité : les compteurs sont CUMULATIFS ou des RECORDS, donc
  // relire le même état 1000 « jours » plus tard rend exactement le même acquis.
  const acquis = facts({ bestRunDistanceM: 5_000, loopRuns: 1 });
  const first = deriveWelcomeChallenge(acquis);
  const later = deriveWelcomeChallenge(acquis);
  assertEquals(later, first);
  if (later.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(later.doneCount, 3);
});

Deno.test('ANTI-SHAME : la sortie ne porte AUCUN champ de reproche', () => {
  // Test structurel : si quelqu'un ajoute un jour `late`/`missed`/`expired`,
  // ce test tombe — et la conversation a lieu AVANT que l'écran ne l'affiche.
  const out = deriveWelcomeChallenge(facts({ bestRunDistanceM: 3_000 }));
  const interdits = ['late', 'missed', 'behind', 'expired', 'failed', 'streakBroken', 'daysLeft', 'deadline'];
  const topLevel = Object.keys(out);
  for (const k of interdits) {
    assertEquals(topLevel.includes(k), false, `champ interdit en sortie : ${k}`);
  }
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  for (const step of out.steps) {
    for (const k of interdits) {
      assertEquals(Object.keys(step).includes(k), false, `champ interdit sur un palier : ${k}`);
    }
  }
});

Deno.test('ANTI-SHAME : aucune remise à zéro possible — la sortie ne dépend QUE des compteurs', () => {
  // Aucune horloge n'entre dans la fonction : il n'existe donc littéralement
  // aucun chemin de code par lequel « le temps qui passe » retirerait un palier.
  assertEquals(deriveWelcomeChallenge.length, 1);
  const out = deriveWelcomeChallenge(ALL_DONE);
  assertEquals(out.kind, 'complete');
});

// ═══ 5. Compteurs illisibles : rien n'est offert ════════════════════════════

Deno.test('compteurs aberrants (NaN, négatif, Infinity) ne franchissent aucun palier', () => {
  const out = deriveWelcomeChallenge({
    bestRunDistanceM: Number.NaN,
    loopRuns: -3,
    hexesCaptured: Number.POSITIVE_INFINITY,
    shares: Number.NEGATIVE_INFINITY,
  });
  assertEquals(out.kind, 'in_progress');
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.doneCount, 0);
});

Deno.test('les valeurs réelles sont montrées telles quelles, non plafonnées', () => {
  const out = deriveWelcomeChallenge(facts({ bestRunDistanceM: 21_097, hexesCaptured: 42 }));
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.steps.find((s) => s.key === 'run_5k')?.value, 21_097);
  assertEquals(out.steps.find((s) => s.key === 'capture')?.value, 42);
});

Deno.test('chaque palier expose sa métrique réelle et son jour suggéré', () => {
  const out = deriveWelcomeChallenge(facts());
  if (out.kind !== 'in_progress') throw new Error('unreachable');
  assertEquals(out.steps.map((s) => s.metric), [
    'bestRunDistanceM',
    'bestRunDistanceM',
    'loopRuns',
    'hexesCaptured',
    'shares',
  ]);
  assertEquals(out.steps.map((s) => s.suggestedDay), WELCOME_STEPS.map((s) => s.day));
});

// ═══ 6. §A « 1 écran = 1 décision » ═════════════════════════════════════════

Deno.test('§A : `next` est TOUJOURS le premier non-franchi, dans l’ordre du parcours', () => {
  const cases: Array<[Partial<WelcomeFacts>, string]> = [
    [{}, 'run_3k'],
    [{ bestRunDistanceM: 3_000 }, 'run_5k'],
    [{ bestRunDistanceM: 5_000 }, 'loop'],
    [{ bestRunDistanceM: 5_000, loopRuns: 2 }, 'capture'],
    [{ bestRunDistanceM: 5_000, loopRuns: 2, hexesCaptured: 3 }, 'share'],
  ];
  for (const [p, expected] of cases) {
    const out = deriveWelcomeChallenge(facts(p));
    if (out.kind !== 'in_progress') throw new Error(`attendu in_progress pour ${expected}`);
    assertEquals(out.next.key, expected);
    // `next` est bien un élément de `steps`, pas une copie divergente.
    assertEquals(out.steps.find((s) => s.key === out.next.key), out.next);
  }
});
