/**
 * GRYD — le départ part à l'heure, et ne ment pas sur le signal (lot M4).
 *
 * Un décompte se teste très mal à la main : il faut attendre, et l'erreur
 * classique (« 0 » affiché une seconde entière avant le départ) passe pour une
 * lenteur plutôt que pour un bug. D'où ces assertions.
 */
import {
  COUNTDOWN_S,
  GPS_GOOD_ACCURACY_M,
  gpsGrade,
  isDegradedStart,
  isDone,
  remaining,
} from './countdown';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

// ─── Le décompte ────────────────────────────────────────────────────────────

Deno.test('le décompte descend une fois par seconde, et s’arrête à zéro', () => {
  assertEquals(remaining(0), 3);
  assertEquals(remaining(0.9), 3);
  assertEquals(remaining(1), 2);
  assertEquals(remaining(2.5), 1);
  assertEquals(remaining(3), 0);
  assertEquals(remaining(9), 0);
});

Deno.test('« 0 » n’est JAMAIS affiché avant le départ', () => {
  // Le piège : `remaining` atteint 0 exactement quand `isDone` bascule. Si les
  // deux divergeaient d'un cran, l'écran montrerait « 0 » pendant une seconde
  // entière avant de partir — et le joueur, lui, serait déjà en train de courir.
  for (const t of [0, 0.5, 1, 1.99, 2, 2.99, 3, 3.01, 10]) {
    assertEquals(remaining(t) === 0, isDone(t), `à ${t} s, l'affichage et le départ divergent`);
  }
});

Deno.test('une horloge aberrante ne fait pas partir tout de suite', () => {
  // Se tromper vers « pas encore » coûte trois secondes ; se tromper vers
  // « c'est parti » vole le début de la trace.
  for (const t of [-1, Number.NaN, Number.NEGATIVE_INFINITY]) {
    assertEquals(remaining(t), COUNTDOWN_S, `valeur ${String(t)}`);
    assert(!isDone(t), `départ pris sur une horloge ${String(t)}`);
  }
});

// ─── Le signal : une information, jamais une permission ─────────────────────

Deno.test('aucun point reçu → « recherche », surtout pas « faible »', () => {
  // Annoncer un signal faible avant d'avoir mesuré quoi que ce soit invente un
  // diagnostic, et inquiète sur la foi de rien.
  for (const v of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertEquals(gpsGrade(v as number | null), 'searching', `valeur ${String(v)}`);
  }
});

Deno.test('la précision décide du mot, et le seuil est celui qui est écrit', () => {
  assertEquals(gpsGrade(5), 'good');
  assertEquals(gpsGrade(GPS_GOOD_ACCURACY_M), 'good');
  assertEquals(gpsGrade(GPS_GOOD_ACCURACY_M + 0.1), 'weak');
  assertEquals(gpsGrade(120), 'weak');
});

Deno.test('un départ sans repère compte comme DÉGRADÉ, au même titre qu’un mauvais', () => {
  // On veut savoir combien de courses partent sans repère — pas seulement
  // combien partent avec un mauvais.
  assert(isDegradedStart('searching'), 'départ sans point non compté comme dégradé');
  assert(isDegradedStart('weak'), 'départ à signal faible non compté comme dégradé');
  assert(!isDegradedStart('good'), 'départ franc compté comme dégradé');
});
