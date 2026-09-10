/**
 * GRYD — CHARTE, EXIGENCES, RÈGLES : la table de vérité, côté client.
 *
 * ─── CE QUE CES TESTS PROUVENT, ET CE QU'ILS NE PROUVENT PAS ────────────────
 * Ils prouvent que le CLIENT ne peut pas peindre un enregistrement que le
 * serveur refuserait, et qu'il lit `crew_rules_get_2026` sans jamais inventer
 * une valeur absente. Ils ne prouvent RIEN sur le serveur : 0188 rejuge tout,
 * et `supabase/tests/crew_rules_2026.pglite.test.mjs` tient l'autre moitié du
 * miroir. Si l'un des deux dérive, l'autre le dit.
 *
 * ─── ÉTAPE 0 ────────────────────────────────────────────────────────────────
 * Avant ce lot, aucun de ces objets n'existait côté mobile : `crews.description`
 * (0084) portait des règles que RIEN n'appliquait, et aucune exigence d'entrée
 * n'était mesurée. Chaque test ci-dessous cite donc le refus SERVEUR qu'il
 * anticipe, pour qu'on puisse vérifier ligne à ligne qu'il dit la même chose.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_CHARTER_MAX_CHARS, CREW_MIN_CHALLENGE_DAYS_MAX } from '@klaim/shared';
import {
  EMPTY_ENFORCEMENT,
  activeEnforcement,
  activeRequirements,
  badRulesDetail,
  charterStale,
  draftOfRules,
  isRulesDirty,
  parseCrewRules,
  parseEligibility,
  parseMissing,
  removalArmable,
  rulesBlock,
  rulesPayload,
  shortfallOf,
  type CrewRules2026,
} from './crewRules2026.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

/** L'état de TOUS les crews existants : aucune charte, aucune exigence, aucune règle. */
const VIERGE: unknown = {
  ok: true,
  charter: null,
  charterVersion: 1,
  myAcceptedVersion: null,
  requirements: {},
  enforcement: {},
  updatedAt: null,
};

/** Le JSON de référence, copié du §6.3 de la spec (exécution réelle). */
const REGLÉ: unknown = {
  ok: true,
  charter: 'On court le mardi soir, et on attend tout le monde.',
  charterVersion: 1,
  myAcceptedVersion: 1,
  requirements: { min_level: 4, min_distance_km_28d: 30 },
  enforcement: { max_inactivity_days: 14, auto_remove_after_days: 7 },
  updatedAt: '2026-09-10T18:47:00.78+00:00',
};

// ═══════════════════════════════════════════════════════════════════════════
// ① LECTURE : rien n'est inventé, et l'absence se distingue du zéro
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('règles : un crew sans rien est LU comme tel, pas comme un échec', () => {
  const r = parseCrewRules(VIERGE);
  assert(r !== null, 'un crew sans charte est une réponse valide, pas une panne');
  assertEquals(r.charter, null);
  assertEquals(r.myAcceptedVersion, null, 'null ≠ 0 : « rien accepté » n’est pas « version 0 »');
  assertEquals(activeRequirements(r.requirements).length, 0);
  assertEquals(activeEnforcement(r.enforcement).length, 0);
  assertEquals(r.enforcement, EMPTY_ENFORCEMENT);
});

Deno.test('règles : `{ok:false}` et un contrat inattendu rendent null, jamais un vide', () => {
  // Un `null` force l'écran à distinguer « je n'ai pas lu » de « il n'y a
  // rien » : rendre un objet vide ici ferait passer un refus pour un crew
  // ouvert, ce que le §5.3 nomme comme le risque n° 3 du lot.
  assertEquals(parseCrewRules({ ok: false, reason: 'not_found' }), null);
  assertEquals(parseCrewRules(null), null);
  assertEquals(parseCrewRules('nope'), null);
});

Deno.test('règles : seules les clés POSÉES sont actives (zéro = éteinte)', () => {
  const r = parseCrewRules(REGLÉ)!;
  assertEquals(
    activeRequirements(r.requirements).map((x) => x.key),
    ['min_level', 'min_distance_km_28d'],
  );
  assertEquals(
    activeEnforcement(r.enforcement).map((x) => x.key),
    ['max_inactivity_days', 'auto_remove_after_days'],
  );
  // Les deux règles NON posées valent zéro, et zéro ne figure jamais dans les
  // règles actives : ce n'est pas « un seuil de zéro », c'est « pas de règle ».
  assertEquals(r.enforcement.min_weekly_outings, 0);
});

Deno.test('règles : une valeur illisible vaut ÉTEINTE, jamais une règle inventée', () => {
  const r = parseCrewRules({
    ...(REGLÉ as Record<string, unknown>),
    enforcement: { max_inactivity_days: 'beaucoup', min_weekly_outings: -3 },
  })!;
  assertEquals(r.enforcement.max_inactivity_days, 0);
  assertEquals(r.enforcement.min_weekly_outings, 0, 'un négatif ne devient pas une règle');
});

// ═══════════════════════════════════════════════════════════════════════════
// ② LA CHARTE PÉRIMÉE — et le crew qui n'en a pas
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('charte : un crew SANS charte n’est jamais « périmé »', () => {
  // Sans ce garde, TOUS les crews existants afficheraient à vie un bandeau
  // « la charte a changé » sur un texte qui n'existe pas — un bouton mort qui
  // accuse en plus son lecteur de ne pas avoir lu.
  const r = parseCrewRules(VIERGE)!;
  assertEquals(charterStale(r), false);
});

Deno.test('charte : acceptée à la version courante ⇒ pas de bandeau', () => {
  assertEquals(charterStale(parseCrewRules(REGLÉ)!), false);
});

Deno.test('charte : jamais acceptée, ou acceptée sur une version ANCIENNE ⇒ bandeau', () => {
  const jamais = parseCrewRules({ ...(REGLÉ as Record<string, unknown>), myAcceptedVersion: null })!;
  assertEquals(charterStale(jamais), true);
  const vieille = parseCrewRules({
    ...(REGLÉ as Record<string, unknown>),
    charterVersion: 3,
    myAcceptedVersion: 2,
  })!;
  assertEquals(charterStale(vieille), true);
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ LE BROUILLON ET SES BORNES — miroir des dix refus `bad_rules`
// ═══════════════════════════════════════════════════════════════════════════

const rules = (): CrewRules2026 => parseCrewRules(VIERGE)!;

Deno.test('brouillon : ouvrir l’écran sans rien toucher n’est PAS une erreur', () => {
  const r = rules();
  assertEquals(rulesBlock(r, draftOfRules(r)), 'pristine');
  assertEquals(isRulesDirty(r, draftOfRules(r)), false);
});

Deno.test('brouillon : une charte trop longue est refusée AVANT l’envoi', () => {
  const r = rules();
  const d = draftOfRules(r);
  d.charter = 'x'.repeat(CREW_CHARTER_MAX_CHARS + 1);
  assertEquals(rulesBlock(r, d), 'charter_too_long');
  // Pile à la borne : accepté. Un « > » lu « >= » interdirait la charte la plus
  // longue que le serveur accepte, et personne ne saurait pourquoi.
  d.charter = 'y'.repeat(CREW_CHARTER_MAX_CHARS);
  assertEquals(rulesBlock(r, d), null);
});

Deno.test('brouillon : le GARDE-FOU ① est peint, pas seulement appliqué', () => {
  const r = rules();
  const d = draftOfRules(r);
  d.enforcement.auto_remove_after_days = 7;
  assertEquals(removalArmable(d), false, 'le réglage doit être inactionnable');
  assertEquals(rulesBlock(r, d), 'removal_without_warning');
  // L'avertissement d'abord : c'est ce qui rend le retrait légitime.
  d.enforcement.max_inactivity_days = 14;
  assertEquals(removalArmable(d), true);
  assertEquals(rulesBlock(r, d), null);
});

Deno.test('brouillon : `min_challenge_days` ne dépasse pas la durée d’un défi', () => {
  const r = rules();
  const d = draftOfRules(r);
  d.enforcement.min_challenge_days = CREW_MIN_CHALLENGE_DAYS_MAX + 1;
  assertEquals(rulesBlock(r, d), 'challenge_days_over_max');
  d.enforcement.min_challenge_days = CREW_MIN_CHALLENGE_DAYS_MAX;
  assertEquals(rulesBlock(r, d), null, 'le plafond EXACT reste réglable');
});

Deno.test('brouillon : aucune valeur négative ne part au serveur', () => {
  const r = rules();
  const d = draftOfRules(r);
  d.requirements.min_distance_km_28d = -1;
  assertEquals(rulesBlock(r, d), 'negative');
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ LA CHARGE UTILE — le piège n° 1 de l'écran des règles
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('charge : les TROIS champs partent ensemble, TOUJOURS', () => {
  /*
   * `crew_rules_set_2026` fait `coalesce(p_requirements, '{}')`. Un écran qui
   * n'enverrait que la charte remettrait donc exigences ET règles à zéro EN
   * SILENCE : un capitaine perdrait ses seuils en corrigeant une faute
   * d'orthographe. C'est LE défaut que ce test interdit.
   */
  const r = parseCrewRules(REGLÉ)!;
  const d = draftOfRules(r);
  d.charter = 'Nouveau texte.';
  const p = rulesPayload(d);
  assertEquals(p.p_charter, 'Nouveau texte.');
  assertEquals(p.p_requirements.min_level, 4);
  assertEquals(p.p_requirements.min_distance_km_28d, 30);
  assertEquals(p.p_enforcement.max_inactivity_days, 14);
  assertEquals(p.p_enforcement.auto_remove_after_days, 7);
});

Deno.test('charge : un ZÉRO est ÉCRIT — c’est ainsi qu’on éteint une règle', () => {
  const r = parseCrewRules(REGLÉ)!;
  const d = draftOfRules(r);
  d.enforcement.auto_remove_after_days = 0;
  d.enforcement.max_inactivity_days = 0;
  const p = rulesPayload(d);
  assertEquals(p.p_enforcement.auto_remove_after_days, 0);
  assertEquals(p.p_enforcement.max_inactivity_days, 0);
  // Omettre la clé laisserait le serveur sur son ancienne valeur : la règle ne
  // s'éteindrait jamais, et l'écran afficherait pourtant « éteint ».
  assert('max_inactivity_days' in p.p_enforcement);
});

Deno.test('charge : une charte VIDE devient `null`, jamais une chaîne vide', () => {
  const r = parseCrewRules(REGLÉ)!;
  const d = draftOfRules(r);
  d.charter = '   ';
  assertEquals(rulesPayload(d).p_charter, null);
});

Deno.test('charge : commune et discipline nulles DISPARAISSENT de l’objet', () => {
  // Le serveur les teste par `nullif(…, '')` : une clé présente à `null` et une
  // clé absente y sont équivalentes, mais l'absence est la forme canonique.
  const d = draftOfRules(rules());
  const p = rulesPayload(d);
  assertEquals('city_id' in p.p_requirements, false);
  assertEquals('activity' in p.p_requirements, false);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ L'ÉLIGIBILITÉ — « il te manque 2 km », jamais « non éligible » tout seul
// ═══════════════════════════════════════════════════════════════════════════

/** Copié du §6.3 : la réponse réelle de `crew_eligibility_2026`. */
const PAS_ELIGIBLE: unknown = {
  ok: true,
  eligible: false,
  missing: [
    { key: 'min_level', need: 4, have: 1, unit: 'level' },
    { key: 'min_distance_km_28d', need: 30, have: 28, unit: 'km' },
  ],
  charterVersion: 1,
  charterRequired: true,
  invitesBypass: true,
};

Deno.test('éligibilité : la liste est lue, et l’écart est CHIFFRÉ', () => {
  const e = parseEligibility(PAS_ELIGIBLE)!;
  assertEquals(e.eligible, false);
  assertEquals(e.missing.length, 2);
  assertEquals(shortfallOf(e.missing[1]!), 2, 'il te manque 2 km : la phrase du fondateur');
  assertEquals(e.invitesBypass, true, 'la porte humaine doit pouvoir s’écrire');
});

Deno.test('éligibilité : `eligible` vient du SERVEUR, il n’est pas dérivé de la liste', () => {
  // Les deux disent la même chose aujourd'hui. Si le serveur divergeait un jour,
  // c'est LUI qui décide, et la divergence doit se voir plutôt que se lisser.
  const e = parseEligibility({ ...(PAS_ELIGIBLE as Record<string, unknown>), missing: [] })!;
  assertEquals(e.eligible, false);
  assertEquals(e.missing.length, 0);
});

Deno.test('éligibilité : une entrée MALFORMÉE est écartée, jamais complétée', () => {
  const list = parseMissing([
    { key: 'min_level', need: 4, have: 1, unit: 'level' },
    { key: 'inventée', need: 1, have: 0, unit: 'km' },
    { key: 'min_level', need: 4, unit: 'unité_inconnue' },
    { key: 'min_active_days_28d', unit: 'days' },
  ]);
  assertEquals(list.length, 1, 'seule l’entrée complète et connue survit');
});

Deno.test('éligibilité : un écart NON calculable rend null, jamais zéro', () => {
  // `have` absent : on ne sait pas de combien il manque. Un `0` dirait « il ne
  // te manque rien », et l'écran peindrait un bouton qui serait refusé.
  const [m] = parseMissing([{ key: 'min_distance_km_28d', need: 30, unit: 'km' }]);
  assertEquals(shortfallOf(m!), null);
  // Unité textuelle : l'écart n'a pas de sens.
  const [c] = parseMissing([{ key: 'city_id', need: 'insee-76540', have: 'insee-75056', unit: 'city' }]);
  assertEquals(shortfallOf(c!), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ LE `detail` D'UN `bad_rules` — dire LEQUEL des dix refus
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('bad_rules : le detail connu est rendu, l’inconnu retombe sur null', () => {
  assertEquals(
    badRulesDetail({ ok: false, reason: 'bad_rules', detail: 'unknown_city' }),
    'unknown_city',
  );
  assertEquals(badRulesDetail({ ok: false, reason: 'bad_rules', detail: 'quoi' }), null);
  assertEquals(badRulesDetail({ ok: false, reason: 'forbidden' }), null);
});
