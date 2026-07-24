/**
 * GRYD — le journal local des courses reste borné et honnête. `appendRun` est
 * pur (Deno) : on verrouille l'élagage (rétention + CAP), le tri, et le rejet des
 * entrées non finies / futures (jamais une course fabriquée dans la série).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { appendRun } from './runJournalCore.ts';

const DAY = 86_400_000;

Deno.test('ajout simple : la course apparaît, du plus récent au plus ancien', () => {
  const now = 1_000 * DAY;
  const out = appendRun([now - 2 * DAY], now, now);
  assertEquals(out, [now, now - 2 * DAY]);
});

Deno.test('élagage rétention : les courses trop vieilles (> ~400 j) tombent', () => {
  const now = 1_000 * DAY;
  const vieux = now - 500 * DAY;
  const recent = now - 10 * DAY;
  const out = appendRun([vieux, recent], now, now);
  // `now` ajouté, `recent` gardé, `vieux` (500 j) élagué par la rétention.
  assertEquals(out, [now, recent]);
});

Deno.test('rejet des timestamps futurs / non finis (jamais une course fabriquée)', () => {
  const now = 1_000 * DAY;
  const out = appendRun([now + DAY, Number.NaN, Number.POSITIVE_INFINITY], now, now);
  // Seul `now` (l'atMs valide) survit ; le futur et les non-finis sont rejetés.
  assertEquals(out, [now]);
});

Deno.test('dédoublonnage : un même timestamp ne compte jamais deux fois', () => {
  const now = 1_000 * DAY;
  const t = now - 3 * DAY;
  const out = appendRun([t, t], t, now); // t présent 3 fois → une seule entrée
  assertEquals(out, [t]);
});

Deno.test('CAP exercé DANS la fenêtre : > 400 courses récentes → borné à 400, les plus vieilles coupées', () => {
  const now = 1_000 * DAY;
  const HOUR = 3_600_000;
  // 450 courses distinctes sur ~19 jours : toutes dans la rétention → SEULE la
  // borne CAP mord (la rétention ne coupe rien ici).
  const many = Array.from({ length: 450 }, (_, i) => now - (i + 1) * HOUR);
  const out = appendRun(many, now, now);
  assertEquals(out.length, 400);
  assertEquals(out[0], now); // atMs=now en tête
  assertEquals(out[399], now - 399 * HOUR); // 400e la plus récente ; au-delà, coupé
});

Deno.test('atMs valide est bien ajouté et borné au CAP', () => {
  const now = 5_000 * DAY;
  // 405 courses sur 405 jours consécutifs : rétention (~400 j) + CAP (400) bornent.
  const many = Array.from({ length: 405 }, (_, i) => now - i * DAY);
  const out = appendRun(many, now, now);
  // Toutes ≤ now, mais celles au-delà de la rétention sont coupées, puis CAP.
  assertEquals(out.length <= 400, true);
  assertEquals(out[0], now); // la plus récente en tête
  // strictement décroissant
  for (let i = 1; i < out.length; i++) assertEquals(out[i] < out[i - 1], true);
});
