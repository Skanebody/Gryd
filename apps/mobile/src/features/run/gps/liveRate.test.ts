/**
 * GRYD — LE BANDEAU DE COURSE N'AFFICHE PLUS DE ZÉRO NU, ET IL PARLE LA LANGUE
 * DE LA DISCIPLINE.
 *
 * Ce que ces tests verrouillent, et pourquoi chacun existe :
 *  1. ZÉRO NU — une allure non mesurée ne produit AUCUN chiffre. C'est le cœur :
 *     le tracker pose `paceSPerKm = 0` tant qu'aucun kilomètre n'est parcouru,
 *     et l'écran rendait « 0'00 » sous « ALLURE /KM » pendant tout ce temps.
 *     Le test énumère les valeurs que le pipeline produit RÉELLEMENT (0, NaN,
 *     Infinity) plutôt qu'un cas symbolique.
 *  2. LA CASE NE DISPARAÎT PAS — `kind` reste connu même sans mesure : c'est ce
 *     qui permet au bandeau de garder ses trois colonnes et son libellé au lieu
 *     de se réorganiser au premier kilomètre, en pleine course.
 *  3. GRANDEUR PAR DISCIPLINE — allure à pied, vitesse à vélo, et l'unité suit :
 *     un cycliste ne peut pas lire des km/h à l'arrivée et des min/km en
 *     roulant. Test EXHAUSTIF sur `ACTIVITIES` : une 3ᵉ discipline ne peut pas
 *     sortir muette.
 *  4. UNE SEULE SOURCE — le chiffre du cycliste est la CONVERSION de l'allure
 *     mesurée, jamais un second calcul distance/durée qui divergerait de ce que
 *     le Résultat annonce.
 *  5. LE FORMATEUR D'ALLURE — déplacé ici depuis `simulation.ts` (qui importe
 *     React et n'est donc pas chargeable sous Deno), il est enfin testé.
 *
 * PUR : aucun import React Native, aucun i18n — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import { EFFORT_RATE_KIND } from '../effortRate.ts';
import { NO_MEASURE, SPEED_UNIT, formatPaceMmSs, liveRateDisplay } from './liveRate.ts';

/** Le séparateur français — l'appelant le fournit, ce module n'a pas d'i18n. */
const FR = ',';

// ─── 1 & 2. Le « 0 » nu : une ABSENCE, mais une absence qui garde sa place ───

Deno.test('aucune mesure ⇒ jamais un chiffre, dans TOUTES les disciplines', () => {
  // Ce que le pipeline produit vraiment : `km > 0 ? activeS / km : 0` rend 0
  // avant le premier kilomètre ; une durée nulle rend NaN ; une distance nulle
  // rend Infinity. Aucune de ces valeurs n'est une allure.
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    for (const activity of ACTIVITIES) {
      const r = liveRateDisplay(activity, bad, FR);
      assertEquals(r.measured, false, `${activity} · ${String(bad)}`);
      assertEquals(r.value, NO_MEASURE, `${activity} · ${String(bad)}`);
      // « — KM/H » suggérerait une mesure en km/h : l'unité part avec le chiffre.
      assertEquals(r.unit, null, `${activity} · ${String(bad)}`);
    }
  }
});

Deno.test('le tiret n’est PAS un zéro déguisé : aucun chiffre dans la valeur', () => {
  for (const activity of ACTIVITIES) {
    const r = liveRateDisplay(activity, 0, FR);
    assert(!/\d/.test(r.value), `« ${r.value} » contient un chiffre`);
    // Tiret CADRATIN (U+2014), pas un tiret d'union ni des points de suspension.
    assertEquals(r.value, '—');
  }
});

Deno.test('sans mesure, la case garde sa GRANDEUR — donc son libellé et sa place', () => {
  // Si `kind` était inconnu, l'écran n'aurait plus de libellé à afficher et la
  // 3ᵉ colonne disparaîtrait : le bandeau se réorganiserait au premier
  // kilomètre mesuré, sous les yeux de quelqu'un qui court.
  for (const activity of ACTIVITIES) {
    assertEquals(liveRateDisplay(activity, 0, FR).kind, EFFORT_RATE_KIND[activity]);
  }
});

// ─── 3. La grandeur suit la discipline, du départ à l'arrivée ───────────────

Deno.test('à pied : une ALLURE, et son unité reste dans le libellé (« ALLURE /KM »)', () => {
  const r = liveRateDisplay('run', 328, FR);
  assertEquals(r, { kind: 'pace', measured: true, value: `5'28`, unit: null });
});

Deno.test('à vélo : une VITESSE en km/h — la même grandeur qu’à l’arrivée', () => {
  // 2'00/km = 120 s/km = 30 km/h.
  assertEquals(liveRateDisplay('bike', 120, FR), {
    kind: 'speed',
    measured: true,
    value: '30,0',
    unit: SPEED_UNIT,
  });
});

Deno.test('exhaustif : chaque discipline rend l’unité de SA grandeur', () => {
  for (const activity of ACTIVITIES) {
    const r = liveRateDisplay(activity, 240, FR);
    assert(r.measured);
    // L'unité est portée par la valeur pour la vitesse, par le libellé pour
    // l'allure : jamais l'inverse, jamais les deux.
    assertEquals(r.unit, EFFORT_RATE_KIND[activity] === 'speed' ? SPEED_UNIT : null, activity);
  }
});

Deno.test('le séparateur décimal vient de l’appelant (aucun Intl, parité Hermes)', () => {
  assertEquals(liveRateDisplay('bike', 147, '.').value, '24.5');
  assertEquals(liveRateDisplay('bike', 147, ',').value, '24,5');
});

// ─── 4. Une seule source : la vitesse est une CONVERSION, pas un 2ᵉ calcul ───

Deno.test('vélo : le chiffre affiché se reconvertit en l’allure mesurée', () => {
  for (const sPerKm of [90, 120, 147.5, 240]) {
    const shown = Number(liveRateDisplay('bike', sPerKm, '.').value);
    // Une décimale d'affichage ⇒ tolérance large, mais l'ordre de grandeur ne
    // peut pas dériver : c'est bien la MÊME mesure, vue autrement.
    assert(Math.abs(3600 / shown - sPerKm) < 1, `${sPerKm} s/km → ${shown} km/h`);
  }
});

// ─── 5. Le formateur d'allure, enfin testable ───────────────────────────────

Deno.test('formatPaceMmSs : minutes et secondes, secondes toujours sur 2 chiffres', () => {
  assertEquals(formatPaceMmSs(328), `5'28`);
  assertEquals(formatPaceMmSs(305), `5'05`);
  assertEquals(formatPaceMmSs(60), `1'00`);
  // Au-delà de l'heure par kilomètre (marche très lente) : pas de repli muet.
  assertEquals(formatPaceMmSs(3661), `61'01`);
});

Deno.test('formatPaceMmSs : arrondi à la seconde, jamais de troncature', () => {
  assertEquals(formatPaceMmSs(328.6), `5'29`);
  assertEquals(formatPaceMmSs(59.5), `1'00`);
});
