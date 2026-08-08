/**
 * GRYD — la célébration a trois TEMPS, pas un fondu (L7).
 *
 * Ce test existe parce que ni la relecture ni la capture ne peuvent l'attraper :
 * trois `interpolate` écrits à la suite se chevauchent sans qu'on le voie, et
 * l'aller-retour d'une capture d'écran dépasse la durée de la séquence — on ne
 * photographie que l'état final. Si l'ordre s'aplatit, seul ce fichier rougit.
 */
import { BEATS, CELEBRATION_MS, FILL, GAIN, OUTLINE, OUTLINE_SCALE } from './celebration';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

Deno.test('L7 — la durée tient dans la fourchette « 2 à 3 s »', () => {
  assert(CELEBRATION_MS >= 2_000 && CELEBRATION_MS <= 3_000, `${CELEBRATION_MS} ms hors bornes`);
});

Deno.test('LES TROIS TEMPS NE SE CHEVAUCHENT PAS', () => {
  // Le cœur de L7. Un remplissage qui démarre avant que le contour soit posé
  // donne une tache qui se cherche une forme ; un chiffre qui arrive pendant le
  // remplissage n'est plus une révélation, juste un affichage de plus.
  for (let i = 1; i < BEATS.length; i += 1) {
    const avant = BEATS[i - 1]!;
    const apres = BEATS[i]!;
    assert(
      apres.from >= avant.to,
      `le temps ${i + 1} démarre à ${apres.from} alors que le ${i} finit à ${avant.to}`,
    );
  }
});

Deno.test('l’ORDRE est celui de la loi : contour → remplissage → gain', () => {
  assert(OUTLINE.to <= FILL.from, 'le remplissage précède le contour');
  assert(FILL.to <= GAIN.from, 'le gain précède le remplissage');
});

Deno.test('la séquence COUVRE toute la durée, sans trou ni dépassement', () => {
  // Un trou laisserait un temps mort au milieu du pic émotionnel ; un
  // dépassement couperait le chiffre avant qu'il soit lisible.
  assertEquals(BEATS[0]!.from, 0);
  assertEquals(BEATS[BEATS.length - 1]!.to, 1);
  for (let i = 1; i < BEATS.length; i += 1) {
    assertEquals(BEATS[i]!.from, BEATS[i - 1]!.to, `trou entre le temps ${i} et le ${i + 1}`);
  }
});

Deno.test('le contour DÉPASSE puis revient — « se stabilise », pas « apparaît »', () => {
  const [a, b, c] = OUTLINE_SCALE.output;
  assert(a! < 1, 'le contour n’arrive pas plus petit');
  assert(b! > 1, 'aucun dépassement : la forme grandit et s’arrête, ça se lit comme un zoom');
  assertEquals(c, 1, 'le contour ne se pose pas à sa taille finale');
  // Le dépassement doit tomber DANS le premier temps, sinon il déborde sur le
  // remplissage et les deux se marchent dessus.
  assert(OUTLINE_SCALE.input[1] > OUTLINE.from && OUTLINE_SCALE.input[1] < OUTLINE.to);
  assertEquals(OUTLINE_SCALE.input[2], OUTLINE.to);
});
