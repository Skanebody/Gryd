/**
 * GRYD — l'onboarding ne peut pas fabriquer de cul-de-sac (lot M2).
 *
 * C'est le seul endroit du MVP où l'app dépend d'une réponse qu'elle ne
 * contrôle pas. Les trois suites se testent ici parce qu'elles NE SE TESTENT
 * PAS À LA MAIN : un refus définitif ne se rejoue qu'en réinstallant, et l'état
 * « refusé mais redemandable » n'existe que sur une plateforme. Le cas le plus
 * rare est justement celui qui laisse quelqu'un devant un bouton mort.
 */
import {
  MAP_REACHABLE_WITHOUT_PERMISSION,
  onboardingDone,
  permissionOutcome,
} from './permission';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

// ─── Les trois suites ───────────────────────────────────────────────────────

Deno.test('accordée → on va à la carte, sans félicitations', () => {
  assertEquals(permissionOutcome({ granted: true }), 'granted');
  // `canAskAgain` n'a plus aucun sens une fois accordé : il ne doit pas peser.
  assertEquals(permissionOutcome({ granted: true, canAskAgain: false }), 'granted');
});

Deno.test('refusée mais REDEMANDABLE → on repropose, on n’envoie PAS aux réglages', () => {
  assertEquals(permissionOutcome({ granted: false, canAskAgain: true }), 'retry');
});

Deno.test('refusée DÉFINITIVEMENT → les réglages sont la seule sortie réelle', () => {
  assertEquals(permissionOutcome({ granted: false, canAskAgain: false }), 'settings');
});

// ─── Le défaut prudent, et sa DIRECTION ─────────────────────────────────────

Deno.test('`canAskAgain` absent → on suppose qu’on PEUT redemander', () => {
  // Se tromper vers `retry` coûte un tap. Se tromper vers `settings` expédie le
  // joueur hors de l'app pour un dialogue qu'un simple bouton rouvrait — et
  // beaucoup ne reviennent pas. L'erreur doit aller dans ce sens-là.
  assertEquals(permissionOutcome({ granted: false }), 'retry');
  assertEquals(permissionOutcome(null), 'retry');
  assertEquals(permissionOutcome(undefined), 'retry');
});

Deno.test('INVARIANT : « Ouvrir les réglages » n’apparaît QUE si l’OS a fermé la porte', () => {
  // Un bouton qui marche mais ne sert à rien est un bouton mort (constitution).
  const cas: { granted: boolean; canAskAgain?: boolean }[] = [
    { granted: true },
    { granted: true, canAskAgain: true },
    { granted: false, canAskAgain: true },
    { granted: false },
  ];
  for (const c of cas) {
    assert(
      permissionOutcome(c) !== 'settings',
      `${JSON.stringify(c)} : les réglages sont proposés alors qu'on peut redemander`,
    );
  }
});

// ─── Refuser n'enferme jamais ───────────────────────────────────────────────

Deno.test('la carte reste atteignable SANS autorisation', () => {
  // Refuser est un choix légitime, et la carte a un état vide honnête. Bloquer
  // l'accès en ferait une rançon.
  assertEquals(MAP_REACHABLE_WITHOUT_PERMISSION, true);
});

Deno.test('l’onboarding vu une fois est terminé — même sans permission', () => {
  // Lier les deux ré-enfermerait dans le tutoriel quiconque a refusé, à CHAQUE
  // ouverture. Un joueur qui a vu les écrans les a vus.
  assertEquals(onboardingDone(1_770_000_000_000), true);
});

Deno.test('un horodatage absent ou aberrant ne clôt PAS l’onboarding', () => {
  // Le sens du doute compte : conclure « déjà vu » à tort saute la seule
  // explication du jeu, et le joueur arrive sur une carte vide sans savoir quoi
  // en faire. Conclure « pas encore vu » à tort ne coûte que deux taps.
  for (const v of [null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertEquals(onboardingDone(v as number | null), false, `valeur ${String(v)}`);
  }
});
