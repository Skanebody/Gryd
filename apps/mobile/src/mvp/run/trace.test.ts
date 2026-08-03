/**
 * GRYD — ce que la course affiche est vrai, ou n'est pas affiché (lot M4).
 *
 * Deux fautes classiques sont visées nommément : un chrono passé par `Date`
 * (décalé d'une heure entière hors du fuseau de développement) et un « 0,00 km »
 * au premier pas, qui se lit comme une panne.
 */
import { distanceM, formatChrono, formatKm, traceDistanceM, type TracePoint } from './trace';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const P = (lng: number, lat: number, t = 0): TracePoint => ({ lng, lat, t });

// ─── Distance ───────────────────────────────────────────────────────────────

Deno.test('un degré de latitude vaut ~111 km, et le calcul le retrouve', () => {
  // Repère indépendant du code : si la formule est fausse, cet écart le crie.
  const d = distanceM(P(0, 49), P(0, 50));
  assert(Math.abs(d - 111_195) < 300, `un degré de latitude mesuré à ${Math.round(d)} m`);
});

Deno.test('la longitude se resserre avec la latitude', () => {
  // À 49°, un degré de longitude vaut ~73 km — pas 111. Une formule qui
  // oublierait le cosinus donnerait le même nombre qu'à l'équateur.
  const equateur = distanceM(P(0, 0), P(1, 0));
  const rouen = distanceM(P(0, 49), P(1, 49));
  assert(rouen < equateur * 0.7, `pas de resserrement : ${Math.round(rouen)} m à 49°`);
});

Deno.test('une trace de moins de deux points ne parcourt rien', () => {
  assertEquals(traceDistanceM([]), 0);
  assertEquals(traceDistanceM([P(1.0993, 49.4431)]), 0);
});

Deno.test('la trace CUMULE ses segments, elle ne mesure pas le vol d’oiseau', () => {
  // Un aller-retour parcourt DEUX fois la distance, même s'il revient au départ.
  const aller = distanceM(P(0, 49), P(0, 49.001));
  const total = traceDistanceM([P(0, 49), P(0, 49.001), P(0, 49)]);
  assert(Math.abs(total - 2 * aller) < 0.01, `aller-retour mesuré ${total} au lieu de ${2 * aller}`);
});

// ─── Distance affichée ──────────────────────────────────────────────────────

Deno.test('« 0,00 km » ne s’affiche jamais : au premier pas, c’est un tiret', () => {
  // Un compteur à zéro au démarrage se lit comme une panne de GPS.
  assertEquals(formatKm(0), null);
  assertEquals(formatKm(-10), null);
  assertEquals(formatKm(Number.NaN), null);
  // …y compris quand l'arrondi ramènerait à zéro.
  assertEquals(formatKm(2), null);
});

Deno.test('la distance s’écrit en km, virgule décimale', () => {
  assertEquals(formatKm(1_234), '1,23');
  assertEquals(formatKm(10_000), '10,00');
  assertEquals(formatKm(15), '0,02');
});

// ─── Chrono ─────────────────────────────────────────────────────────────────

Deno.test('le chrono est une DURÉE, pas une heure : aucun fuseau ne s’y applique', () => {
  // `new Date(0)` rendrait 01:00 à Paris et 00:00 à Londres. Une durée nulle
  // vaut zéro partout.
  assertEquals(formatChrono(0), '00:00');
  assertEquals(formatChrono(59_000), '00:59');
  assertEquals(formatChrono(60_000), '01:00');
  assertEquals(formatChrono(3_599_000), '59:59');
});

Deno.test('au-delà d’une heure, l’heure apparaît — et pas avant', () => {
  assertEquals(formatChrono(3_600_000), '1:00:00');
  assertEquals(formatChrono(3_661_000), '1:01:01');
  assert(!formatChrono(3_599_999).includes(':'.repeat(2)), 'heure affichée trop tôt');
});

Deno.test('une horloge aberrante affiche zéro, jamais « NaN:NaN »', () => {
  for (const v of [-1, Number.NaN, Number.NEGATIVE_INFINITY]) {
    assertEquals(formatChrono(v), '00:00', `valeur ${String(v)}`);
  }
});
