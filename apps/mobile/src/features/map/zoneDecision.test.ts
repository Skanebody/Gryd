/**
 * GRYD — tests de la logique PURE des sheets E04/E05. Le cœur de ce fichier
 * n'est pas « la sheet s'affiche » mais « elle ne dit QUE ce qui a une source,
 * et sa hauteur suit ce qu'elle dit ». Les deux fautes qu'on verrouille ici :
 * une métrique fabriquée pour remplir un trou, et une hauteur devinée qui
 * tronque le CTA (§A9) ou laisse une bande carbone vide (§A).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  ZONE_METRIC_ORDER,
  areaStatParts,
  briefMetricKeys,
  briefRouteState,
  briefSheetHeight,
  daysSinceCapture,
  distanceStatParts,
  zoneMetricKeys,
  zoneSheetHeight,
} from './zoneDecision.ts';

const NOW = new Date('2026-07-25T12:00:00Z');

// ─── E04 — métriques ────────────────────────────────────────────────────────

Deno.test('zoneMetricKeys : trois métriques MAX, dans l’ordre de la planche', () => {
  const keys = zoneMetricKeys({ areaKm2: 0.42, zones: 3, capturedDaysAgo: 6 });
  assertEquals(keys, ['area', 'zones', 'lastCapture']);
  assert(keys.length <= 3, 'la planche interdit d’en empiler six');
  // L'ordre déclaré est celui qui sort — pas un tri accidentel.
  assertEquals([...keys], ZONE_METRIC_ORDER.filter((k) => keys.includes(k)));
});

Deno.test('zoneMetricKeys : sans date de capture, la LIGNE DISPARAÎT (ni tiret, ni zéro)', () => {
  const keys = zoneMetricKeys({ areaKm2: 0.42, zones: 3, capturedDaysAgo: null });
  assertEquals(keys, ['area', 'zones']);
  assert(!keys.includes('lastCapture'));
});

Deno.test('zoneMetricKeys : une surface nulle est une ABSENCE de mesure, pas « 0 km² »', () => {
  assertEquals(zoneMetricKeys({ areaKm2: 0, zones: 2, capturedDaysAgo: null }), ['zones']);
  assertEquals(zoneMetricKeys({ areaKm2: Number.NaN, zones: 2, capturedDaysAgo: null }), ['zones']);
  assertEquals(zoneMetricKeys({ areaKm2: 0.4, zones: 0, capturedDaysAgo: null }), ['area']);
  // Rien de mesurable du tout : le bloc entier disparaît (aucune ligne vide).
  assertEquals(zoneMetricKeys({ areaKm2: 0, zones: 0, capturedDaysAgo: null }), []);
});

Deno.test('daysSinceCapture : jours pleins, absence = null, jamais une valeur devinée', () => {
  assertEquals(daysSinceCapture('2026-07-19T12:00:00Z', NOW), 6);
  assertEquals(daysSinceCapture('2026-07-25T09:00:00Z', NOW), 0, 'moins d’un jour = aujourd’hui');
  assertEquals(daysSinceCapture(null, NOW), null);
  assertEquals(daysSinceCapture('', NOW), null);
  assertEquals(daysSinceCapture('pas-une-date', NOW), null);
});

Deno.test('daysSinceCapture : une date FUTURE (dérive d’horloge) ne rend jamais un négatif', () => {
  assertEquals(daysSinceCapture('2026-07-27T12:00:00Z', NOW), 0);
});

// ─── E04/E05 — « grand nombre + petite unité » (composition des planches) ────

Deno.test('areaStatParts : valeur et unité SÉPARÉES, virgule décimale sauf en anglais', () => {
  // La planche compose « 0,42 » (gros) + « km² » (petit) : le rendu a besoin des
  // deux morceaux, jamais d'une chaîne déjà collée.
  assertEquals(areaStatParts(0.42, 'fr'), { value: '0,42', unit: 'km²' });
  assertEquals(areaStatParts(0.42, 'en'), { value: '0.42', unit: 'km²' });
  assertEquals(areaStatParts(0.42, 'de'), { value: '0,42', unit: 'km²' });
});

Deno.test('areaStatParts : zéros de fin retirés (jamais « 0,80 » ni « 1,00 »)', () => {
  assertEquals(areaStatParts(0.8, 'fr').value, '0,8');
  assertEquals(areaStatParts(1, 'fr').value, '1');
  assertEquals(areaStatParts(1.5, 'en').value, '1.5');
});

Deno.test('distanceStatParts : une décimale, unité km à part', () => {
  assertEquals(distanceStatParts(4.2, 'fr'), { value: '4,2', unit: 'km' });
  assertEquals(distanceStatParts(4.2, 'en'), { value: '4.2', unit: 'km' });
  // Arrondi à la décimale (comme le briefing) — jamais une traînée de chiffres.
  assertEquals(distanceStatParts(3.14159, 'fr').value, '3,1');
});

// ─── E04 — hauteur de la sheet ──────────────────────────────────────────────

Deno.test('zoneSheetHeight : chaque bloc rendu AJOUTE de la hauteur (monotone)', () => {
  const base = zoneSheetHeight({ metrics: 0, hasCta: false, hasTertiary: false });
  const withMetrics = zoneSheetHeight({ metrics: 3, hasCta: false, hasTertiary: false });
  const withCta = zoneSheetHeight({ metrics: 3, hasCta: true, hasTertiary: false });
  const full = zoneSheetHeight({ metrics: 3, hasCta: true, hasTertiary: true });
  assert(base < withMetrics && withMetrics < withCta && withCta < full);
});

Deno.test('zoneSheetHeight : le bloc de métriques compte UNE fois, pas une par métrique', () => {
  // Sinon une zone à 3 métriques ouvrirait une sheet trois fois trop haute —
  // le bloc est une rangée à séparateurs, pas trois cards (§A « card in card »).
  const one = zoneSheetHeight({ metrics: 1, hasCta: true, hasTertiary: true });
  const three = zoneSheetHeight({ metrics: 3, hasCta: true, hasTertiary: true });
  assertEquals(one, three);
});

Deno.test('zoneSheetHeight : MA zone (sans CTA) est plus courte que la zone rivale', () => {
  const mine = zoneSheetHeight({ metrics: 3, hasCta: false, hasTertiary: false });
  const rival = zoneSheetHeight({ metrics: 3, hasCta: true, hasTertiary: true });
  assert(mine < rival, 'aucun vide sous une sheet sans décision à prendre');
  // Et jamais une sheet plus courte que son en-tête + son nom (texte tronqué §A9).
  assert(mine > 120, `hauteur suspecte : ${mine}`);
});

// ─── E05 — état du tracé ────────────────────────────────────────────────────

Deno.test('briefRouteState : les QUATRE états sont distincts et jamais confondus', () => {
  assertEquals(
    briefRouteState({ hasPosition: false, loading: false, distanceKm: null }),
    'no-position',
  );
  // Position inconnue : même « en cours », on ne peut RIEN router — et on
  // n'ouvre surtout pas l'invite système sans geste.
  assertEquals(
    briefRouteState({ hasPosition: false, loading: true, distanceKm: null }),
    'no-position',
  );
  assertEquals(briefRouteState({ hasPosition: true, loading: true, distanceKm: null }), 'loading');
  assertEquals(briefRouteState({ hasPosition: true, loading: false, distanceKm: null }), 'failed');
  assertEquals(briefRouteState({ hasPosition: true, loading: false, distanceKm: 4.2 }), 'ready');
  assertEquals(
    new Set([
      briefRouteState({ hasPosition: false, loading: false, distanceKm: null }),
      briefRouteState({ hasPosition: true, loading: true, distanceKm: null }),
      briefRouteState({ hasPosition: true, loading: false, distanceKm: null }),
      briefRouteState({ hasPosition: true, loading: false, distanceKm: 4.2 }),
    ]).size,
    4,
  );
});

Deno.test('briefRouteState : une distance nulle n’est PAS un tracé prêt', () => {
  assertEquals(briefRouteState({ hasPosition: true, loading: false, distanceKm: 0 }), 'failed');
  assertEquals(briefRouteState({ hasPosition: true, loading: true, distanceKm: 0 }), 'loading');
});

Deno.test('briefMetricKeys : la distance n’est annoncée QUE si un tracé existe vraiment', () => {
  assertEquals(briefMetricKeys('ready'), ['distance']);
  for (const state of ['no-position', 'loading', 'failed'] as const) {
    assertEquals(briefMetricKeys(state), [], `${state} : aucune métrique à afficher`);
  }
});

Deno.test('briefMetricKeys : durée, gain de surface et difficulté n’existent PAS', () => {
  // Garde-fou : si quelqu'un réintroduit une estimation de durée à allure fixe,
  // un « +0,42 km² » promis avant la course ou une difficulté à seuils, ce test
  // tombe. Toutes trois sont des chiffres que rien ne sait produire honnêtement.
  assertEquals(briefMetricKeys('ready').length, 1);
});

Deno.test('briefSheetHeight : un tracé RÉEL ouvre plus grand qu’un état d’absence', () => {
  const ready = briefSheetHeight({ state: 'ready', metrics: 1, hasStateAction: true });
  const none = briefSheetHeight({ state: 'no-position', metrics: 0, hasStateAction: true });
  const loading = briefSheetHeight({ state: 'loading', metrics: 0, hasStateAction: false });
  assert(ready > none, 'la mini-carte occupe la place, l’absence non');
  assert(none > loading, 'un état porteur d’action est plus haut qu’un simple chargement');
  // Sur un écran de 812 px, l'état « prêt » approche les 58 % de la planche.
  assert(ready > 812 * 0.5 && ready < 812 * 0.7, `hauteur inattendue : ${ready}`);
});

// ─── E14 — les deux métriques que seule `territories` rend possibles ─────────

Deno.test('E14 : la PROTECTION prend la place de « Zones », elle ne s’y ajoute pas', () => {
  // Trois cellules maximum sur 375 px : une quatrième tronquerait un libellé
  // (§A9). Et sur un territoire polygonal `zones` vaut toujours 1 — il n'apprend
  // rien, alors que le niveau de protection dit un fait.
  assertEquals(
    zoneMetricKeys({ areaKm2: 0.42, zones: 1, capturedDaysAgo: 6, protectionLevel: 2 }),
    ['area', 'protection', 'lastCapture'],
  );
  // Aucune fortification (déjà filtré en amont ⇒ null) : « Zones » reprend sa place.
  assertEquals(
    zoneMetricKeys({ areaKm2: 0.42, zones: 3, capturedDaysAgo: 6, protectionLevel: null }),
    ['area', 'zones', 'lastCapture'],
  );
});

Deno.test('E14 : « Tenue depuis » n’apparaît que si la date EST le début du contrôle', () => {
  assertEquals(
    zoneMetricKeys({ areaKm2: 0.42, zones: 1, capturedDaysAgo: 6, timeMetric: 'held' }),
    ['area', 'zones', 'held'],
  );
  // Défaut = le sens le plus prudent : il ne prétend rien sur la continuité.
  assertEquals(
    zoneMetricKeys({ areaKm2: 0.42, zones: 1, capturedDaysAgo: 6 }),
    ['area', 'zones', 'lastCapture'],
  );
  // Sans date, aucune des deux : la ligne disparaît, elle ne devient pas « — ».
  assertEquals(
    zoneMetricKeys({ areaKm2: 0.42, zones: 1, capturedDaysAgo: null, timeMetric: 'held' }),
    ['area', 'zones'],
  );
});

Deno.test('E14 : la hauteur réserve le CTA de MA zone, la frontière et la confidentialité', () => {
  const base = { metrics: 3, hasCta: false, hasTertiary: false };
  const bare = zoneSheetHeight(base);
  // Chaque ligne ajoutée AGRANDIT réellement la sheet : sans ça, le CTA de la
  // zone personnelle (nouveau) passerait sous la ligne de flottaison.
  assert(zoneSheetHeight({ ...base, hasCta: true }) > bare);
  assert(zoneSheetHeight({ ...base, hasBorderNote: true }) > bare);
  assert(zoneSheetHeight({ ...base, hasPrivacyNote: true }) > bare);
  // La note de confidentialité réserve DEUX lignes (l'allemand y passe).
  assertEquals(
    zoneSheetHeight({ ...base, hasPrivacyNote: true }) - bare,
    2 * (zoneSheetHeight({ ...base, hasBorderNote: true }) - bare) - 6,
  );
  // Les champs optionnels omis se comportent comme `false` (aucun appelant cassé).
  assertEquals(zoneSheetHeight({ ...base, hasBorderNote: false }), bare);
});
