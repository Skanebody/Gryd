/**
 * GRYD — LA FORMULATION : ce que le joueur LIT, mot pour mot.
 *
 * ─── POURQUOI TESTER DE LA COPIE ────────────────────────────────────────────
 * Parce qu'ici la copie EST la règle. « Il te manque 2 km » et « tu n'es pas
 * éligible » décrivent le même état serveur et ne produisent pas le même
 * joueur : la première laisse une suite, la seconde ferme une porte. Le
 * fondateur a nommé la première, mot pour mot, et §4.2 H l'a inscrite.
 *
 * De même, « non partagé » et « 0 » décrivent deux états serveur DIFFÉRENTS.
 * Les confondre est le mensonge que L8 interdit ; ce fichier vérifie que le
 * seul chemin d'une mesure vers un texte ne peut pas produire « 0 » pour une
 * mesure masquée, dans AUCUNE des cinq langues.
 *
 * La traduction est passée en paramètre (`Translate`) : ces tests tournent en
 * Deno sans React, sur le catalogue RÉEL — pas sur des fausses phrases.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_MEASURE_NOT_SHARED } from '@klaim/shared';
import { LOCALES, format, resolve, type Locale } from '../../../i18n/types.ts';
import {
  activityName,
  enforcementLine,
  lastRunText,
  measureText,
  missingLine,
  num,
  requirementLine,
  requestAgeText,
  dayText,
  type Translate,
} from './crewManagementCopy.ts';
import { parseMissing } from './crewRules2026.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

/** La vraie résolution, dans la langue demandée. Aucun catalogue de test. */
const tr = (locale: Locale): Translate => (entry, vars) =>
  vars ? format(entry, vars, locale) : resolve(entry, locale);

const t = tr('fr');
const T0 = Date.parse('2026-09-10T12:00:00.000Z');
const jours = (n: number) => T0 - n * 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════
// ① UNE MESURE MASQUÉE NE DEVIENT JAMAIS UN CHIFFRE, DANS AUCUNE LANGUE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('mesure : `not_shared` se dit, en toutes lettres, dans les 5 langues', () => {
  for (const locale of LOCALES) {
    const texte = measureText(tr(locale), CREW_MEASURE_NOT_SHARED);
    assert(texte.length > 2, `${locale} : le masque doit être une PHRASE, pas un glyphe`);
    // Le piège exact : un « 0 » ou un tiret affirmeraient que la personne n'a
    // pas couru. Aucune langue n'a le droit de les produire ici.
    assertEquals(/^\s*[-—–0]\s*$/.test(texte), false, `${locale} : ni tiret ni zéro`);
  }
});

Deno.test('mesure : une valeur LUE reste un nombre lisible', () => {
  assertEquals(measureText(t, 22), '22');
  assertEquals(measureText(t, 0), '0', 'un vrai zéro se dit zéro : c’est une mesure');
  assertEquals(measureText(t, 22.46), '22.5');
});

Deno.test('num : jamais « 12.0 », jamais une traînée de décimales', () => {
  assertEquals(num(12), '12');
  assertEquals(num(12.0), '12');
  assertEquals(num(12.34), '12.3');
});

// ═══════════════════════════════════════════════════════════════════════════
// ② LA DERNIÈRE SORTIE : trois phrases pour trois faits
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('dernière sortie : masquée, jamais sortie et « il y a N j » diffèrent', () => {
  const masque = lastRunText(t, CREW_MEASURE_NOT_SHARED, T0);
  const jamais = lastRunText(t, null, T0);
  const recent = lastRunText(t, jours(3), T0);
  assert(masque !== jamais, '« non partagé » ne doit pas dire « jamais sorti »');
  assert(jamais !== recent);
  assertEquals(recent, 'il y a 3 j');
  assertEquals(lastRunText(t, jours(0), T0), 'sorti aujourd’hui');
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ « IL TE MANQUE 2 KM » — la phrase du fondateur, à la lettre
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('manque : la phrase dit CE QUI manque ET DE COMBIEN', () => {
  const [m] = parseMissing([
    { key: 'min_distance_km_28d', need: 30, have: 28, unit: 'km' },
  ]);
  const phrase = missingLine(t, m!);
  assert(phrase.includes('30'), 'ce que le crew demande');
  assert(phrase.includes('2'), 'ce qu’il manque, CHIFFRÉ');
  assert(phrase.includes('manque'), 'la phrase du fondateur, mot pour mot');
});

Deno.test('manque : le niveau dit où j’en suis, pas seulement le seuil', () => {
  const [m] = parseMissing([{ key: 'min_level', need: 4, have: 1, unit: 'level' }]);
  const phrase = missingLine(t, m!);
  assert(phrase.includes('4') && phrase.includes('1'));
});

Deno.test('manque : sans `have`, on dit l’EXIGENCE, jamais un écart inventé', () => {
  const [m] = parseMissing([{ key: 'min_distance_km_28d', need: 30, unit: 'km' }]);
  const phrase = missingLine(t, m!);
  assert(phrase.includes('30'));
  // Un « il te manque 30 km » serait faux : on ne sait pas où en est la personne.
  assertEquals(phrase.includes('manque'), false);
});

Deno.test('manque : commune et discipline se disent SANS chiffre', () => {
  const [ville] = parseMissing([
    { key: 'city_id', need: 'insee-76540', have: 'insee-75056', unit: 'city' },
  ]);
  const phraseVille = missingLine(t, ville!);
  // ⚠ AUCUN identifiant INSEE à l'écran : un code n'apprend rien à qui lit, et
  // le nom de la commune n'est pas dans ce contrat.
  assertEquals(phraseVille.includes('insee-'), false);

  const [disc] = parseMissing([
    { key: 'activity', need: 'run', have: ['bike'], unit: 'activity' },
  ]);
  assert(missingLine(t, disc!).includes('la course'));
});

Deno.test('manque : toutes les clés d’exigence ont une phrase dans les 5 langues', () => {
  const toutes = parseMissing([
    { key: 'min_level', need: 4, have: 1, unit: 'level' },
    { key: 'min_distance_km_28d', need: 30, have: 28, unit: 'km' },
    { key: 'min_active_days_28d', need: 8, have: 2, unit: 'days' },
    { key: 'city_id', need: 'insee-76540', have: 'insee-75056', unit: 'city' },
    { key: 'activity', need: 'bike', have: [], unit: 'activity' },
  ]);
  assertEquals(toutes.length, 5);
  for (const locale of LOCALES) {
    for (const m of toutes) {
      const phrase = missingLine(tr(locale), m);
      assert(phrase.length > 8, `${locale}/${m.key} : phrase absente`);
      assertEquals(phrase.includes('{'), false, `${locale}/${m.key} : variable non substituée`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ EXIGENCES ET RÈGLES, DITES EN CLAIR
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('exigences : les cinq clés se disent, sans variable qui traîne', () => {
  const lignes = [
    requirementLine(t, 'min_level', 4),
    requirementLine(t, 'min_distance_km_28d', 30),
    requirementLine(t, 'min_active_days_28d', 8),
    requirementLine(t, 'city_id', 'insee-76540'),
    requirementLine(t, 'activity', 'bike'),
  ];
  for (const l of lignes) {
    assert(l.length > 5);
    assertEquals(l.includes('{'), false);
  }
  assertEquals(lignes[3]!.includes('insee-'), false, 'aucun code INSEE à l’écran');
  assert(lignes[4]!.includes('le vélo'));
});

Deno.test('règles : les quatre réglages se disent, dans les 5 langues', () => {
  for (const locale of LOCALES) {
    const tt = tr(locale);
    for (const [key, value] of [
      ['min_weekly_outings', 2],
      ['min_challenge_days', 3],
      ['max_inactivity_days', 14],
      ['auto_remove_after_days', 7],
    ] as const) {
      const l = enforcementLine(tt, key, value);
      assert(l.includes(String(value)), `${locale}/${key} : le seuil doit être dit`);
      assertEquals(l.includes('{'), false, `${locale}/${key} : variable non substituée`);
    }
  }
});

Deno.test('discipline : une valeur inconnue du serveur passe TELLE QUELLE', () => {
  // On ne la range pas sous « course » : inventer une discipline serait pire
  // qu'afficher un mot qu'on ne comprend pas.
  assertEquals(activityName(t, 'swim'), 'swim');
  assertEquals(activityName(t, 'run'), 'la course');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LES DATES : `null` ne devient jamais « aujourd'hui »
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('date : une absence reste une absence', () => {
  assertEquals(dayText(null, 'fr'), null);
  assertEquals(dayText(Number.NaN, 'fr'), null);
  assert((dayText(T0, 'fr') ?? '').length > 0);
});

Deno.test('ancienneté d’une demande : aujourd’hui, ou « il y a N j »', () => {
  assertEquals(requestAgeText(t, null, T0), null);
  assertEquals(requestAgeText(t, jours(0), T0), 'Demande envoyée aujourd’hui');
  assertEquals(requestAgeText(t, jours(4), T0), 'Demande envoyée il y a 4 j');
});
