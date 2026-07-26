/**
 * GRYD — la 3ᵉ statistique du Résultat ne ment dans aucune des deux disciplines.
 *
 * Deux propriétés, et c'est tout ce que ce module doit garantir :
 *   1. la GRANDEUR suit la discipline (allure à pied, vitesse à vélo) et elle
 *      est une conversion EXACTE de la même mesure — jamais un second calcul
 *      qui pourrait diverger de ce que l'autre monde affiche ;
 *   2. l'absence de mesure produit une ABSENCE, jamais un zéro. C'est le cas
 *      dégénéré qui compte : durée nulle, distance nulle, verdict muet — tout
 *      cela remonte ici sous forme d'allure `0`, `NaN` ou `Infinity`, et un
 *      « 0,0 km/h » affiché se lirait comme une mesure.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import { EFFORT_RATE_KIND, effortRate, formatSpeedKmh } from './effortRate.ts';

// ─── 1. Chaque discipline lit son effort dans SA grandeur ───────────────────

Deno.test('toute discipline du domaine a une grandeur tranchée — aucune ne sort par défaut', () => {
  // Le Record est exhaustif côté types ; ce test le vérifie côté valeurs, pour
  // qu'une 3ᵉ discipline ajoutée à ACTIVITIES ne puisse pas rester muette.
  for (const a of ACTIVITIES) {
    assert(
      EFFORT_RATE_KIND[a] === 'pace' || EFFORT_RATE_KIND[a] === 'speed',
      `« ${a} » n’a pas de grandeur déclarée`,
    );
  }
});

Deno.test('à pied : une ALLURE, rendue telle quelle (aucune conversion parasite)', () => {
  const r = effortRate('run', 328);
  assertEquals(r, { kind: 'pace', sPerKm: 328 });
});

Deno.test('à vélo : une VITESSE, conversion exacte de la MÊME allure mesurée', () => {
  // 2'00/km = 120 s/km = 30 km/h. Le chiffre du cycliste est le chiffre du
  // coureur vu autrement — il n'est jamais recalculé depuis distance/durée,
  // sinon les deux écrans finiraient par annoncer deux efforts différents.
  assertEquals(effortRate('bike', 120), { kind: 'speed', kmh: 30 });
  assertEquals(effortRate('bike', 180), { kind: 'speed', kmh: 20 });
});

Deno.test('la conversion est RÉVERSIBLE : aucune information n’est perdue en route', () => {
  for (const sPerKm of [90, 120, 147.5, 240, 360]) {
    const r = effortRate('bike', sPerKm);
    assert(r !== null && r.kind === 'speed');
    // 3600 / (3600 / p) === p, à l'epsilon flottant près.
    assert(Math.abs(3600 / r.kmh - sPerKm) < 1e-9, `${sPerKm} s/km`);
  }
});

// ─── 2. LES CAS DÉGÉNÉRÉS : une absence, jamais un « 0 » nu ─────────────────

Deno.test('aucune mesure ⇒ AUCUNE statistique, dans les deux disciplines', () => {
  // Ce que produisent réellement les branches de l'écran : durée nulle
  // (0 / x → 0), distance nulle (x / 0 → Infinity), verdict absent (NaN),
  // et la valeur négative qu'un serveur en dérive ne devrait jamais émettre.
  for (const bad of [0, -1, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    for (const a of ACTIVITIES) {
      assertEquals(effortRate(a, bad), null, `${a} · ${String(bad)}`);
    }
  }
});

Deno.test('une allure minuscule mais RÉELLE reste affichée — on ne censure pas la mesure', () => {
  // Le module ne juge pas la plausibilité : c'est l'anti-triche serveur qui
  // tranche. Il ne fait disparaître que ce qui n'est PAS un nombre mesuré.
  const r = effortRate('bike', 0.5);
  assert(r !== null && r.kind === 'speed' && r.kmh === 7200);
});

// ─── 3. Le rendu : une décimale, le séparateur de la langue, sans Intl ──────

Deno.test('formatSpeedKmh : une décimale et le séparateur passé par l’appelant', () => {
  assertEquals(formatSpeedKmh(24.35, ','), '24,4');
  assertEquals(formatSpeedKmh(24.35, '.'), '24.4');
  // La décimale est TOUJOURS rendue : « 30 » se lirait comme un entier arrondi.
  assertEquals(formatSpeedKmh(30, ','), '30,0');
});
