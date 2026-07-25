/**
 * GRYD — tests de la géométrie de la sheet ancrée (planche E02) et du bouton GO
 * à deux états.
 *
 * Ce qu'ils verrouillent, dans l'ordre des défauts constatés le 25/07/2026 :
 *   1. les paliers valent 29 % / 52 % / 90 % de l'ÉCRAN — pas d'un conteneur qui
 *      s'arrêtait 152 px au-dessus du bord bas (l'« ouvert 85 % » mesuré valait
 *      67 % d'écran, et dérivait à chaque ajustement du dégagement bas) ;
 *   2. la sheet ne passe JAMAIS sous la barre d'onglets (plafond `usable`) et ne
 *      descend jamais sous la hauteur de son peek (aucun texte tronqué, §A9) ;
 *   3. le relâcher choisit le palier le plus proche de la POSITION, le fling son
 *      voisin dans le sens du geste ;
 *   4. le tap sur la poignée BASCULE (compact ⇄ déployé), il ne cycle pas ;
 *   5. le rond GO chevauche le bord haut de la sheet sans jamais monter dans la
 *      bande du header ni redescendre sous sa position de pill.
 */
import { assertEquals, assertAlmostEquals } from 'jsr:@std/assert@1';
import {
  clampSheetToContent,
  clampSheetY,
  goButtonBottom,
  mapSheetStops,
  nearestSheetStop,
  releaseSheetStop,
  toggleSheetStop,
  MAP_SHEET_STOP_ORDER,
} from './sheetSnap.ts';

/** Écran de référence : la preview du fondateur (516 × 725, sans safe area). */
const PREVIEW = { screenH: 725, bottomInset: 0, navBarH: 60, peekMinHeight: 140 };
/** iPhone moderne : safe area basse de 34 px. */
const IPHONE = { screenH: 844, bottomInset: 34, navBarH: 60, peekMinHeight: 140 };

Deno.test('paliers = fractions de la HAUTEUR D\'ÉCRAN (29 / 52 / 90 %)', () => {
  const geo = mapSheetStops(PREVIEW);
  assertAlmostEquals(geo.heights.compact, 725 * 0.29, 0.01);
  assertAlmostEquals(geo.heights.semi, 725 * 0.52, 0.01);
  assertAlmostEquals(geo.heights.open, 725 * 0.9, 0.01);
});

Deno.test('la sheet ne passe jamais sous la barre d\'onglets', () => {
  const geo = mapSheetStops(IPHONE);
  const usable = 844 - 34 - 60;
  // 90 % de 844 = 759,6 > 750 d'espace libre : le palier ouvert est PLAFONNÉ.
  assertEquals(geo.heights.open, usable);
  assertEquals(geo.heights.open <= usable, true);
  assertEquals(geo.heights.semi <= geo.heights.open, true);
});

Deno.test('le peek n\'est jamais tronqué : le compact monte au niveau de son contenu', () => {
  // Petit écran (568) : 29 % = 164,7 px, mais le contenu en demande 200.
  const geo = mapSheetStops({ ...PREVIEW, screenH: 568, peekMinHeight: 200 });
  assertEquals(geo.heights.compact, 200);
  // Monotonie préservée : semi/open restent au-dessus du compact.
  assertEquals(geo.heights.semi >= geo.heights.compact, true);
  assertEquals(geo.heights.open >= geo.heights.semi, true);
});

Deno.test('géométrie dégénérée (écran minuscule) : tout reste borné et monotone', () => {
  const geo = mapSheetStops({ screenH: 200, bottomInset: 0, navBarH: 60, peekMinHeight: 300 });
  const usable = 140;
  for (const stop of MAP_SHEET_STOP_ORDER) assertEquals(geo.heights[stop], usable);
  assertEquals(geo.sheetH, usable);
  assertEquals(geo.offsets.compact, 0);
});

Deno.test('offsets : 0 au palier le plus ouvert, positif vers le compact', () => {
  const geo = mapSheetStops(PREVIEW);
  assertEquals(geo.offsets.open, 0);
  assertEquals(geo.offsets.compact, geo.sheetH - geo.heights.compact);
  assertEquals(geo.offsets.compact > geo.offsets.semi, true);
});

Deno.test('panneau FIXE : un seul palier ⇒ aucune amplitude de geste', () => {
  const geo = mapSheetStops({ ...PREVIEW, peekMinHeight: 132, stops: ['compact'] });
  assertEquals(geo.stops, ['compact']);
  assertEquals(geo.sheetH, geo.heights.compact);
  assertEquals(geo.offsets.compact, 0);
  assertEquals(clampSheetY(-500, geo), 0);
  assertEquals(clampSheetY(500, geo), 0);
});

Deno.test('hugContent : le panneau fixe épouse son contenu, pas le ratio 29 %', () => {
  const geo = mapSheetStops({
    ...PREVIEW,
    peekMinHeight: 128,
    stops: ['compact'],
    hugContent: true,
  });
  // 29 % de 725 = 210,25 — mais un panneau fixe de 210 px pour 128 px de texte
  // laisserait 82 px de carbone vide sous le contenu (§A : ça se lit cassé).
  assertEquals(geo.heights.compact, 128);
  assertEquals(geo.sheetH, 128);
});

Deno.test('hugContent : le plafond « au-dessus de la nav » s\'applique quand même', () => {
  const geo = mapSheetStops({
    screenH: 400,
    bottomInset: 0,
    navBarH: 60,
    peekMinHeight: 900,
    stops: ['compact'],
    hugContent: true,
  });
  assertEquals(geo.heights.compact, 340);
});

Deno.test('clamp : le doigt ne dépasse jamais les paliers extrêmes', () => {
  const geo = mapSheetStops(PREVIEW);
  assertEquals(clampSheetY(-120, geo), geo.offsets.open);
  assertEquals(clampSheetY(9_999, geo), geo.offsets.compact);
});

Deno.test('relâcher lent : palier le plus proche de la POSITION courante', () => {
  const geo = mapSheetStops(PREVIEW);
  const middle = (geo.offsets.compact + geo.offsets.semi) / 2;
  assertEquals(nearestSheetStop(geo.offsets.semi + 4, geo), 'semi');
  // Juste au-dessus du milieu compact↔semi (offset plus petit = plus ouvert).
  assertEquals(releaseSheetStop(middle - 10, 0.1, geo), 'semi');
  assertEquals(releaseSheetStop(middle + 10, 0.1, geo), 'compact');
});

Deno.test('fling vers le haut : saute au palier voisin plus ouvert', () => {
  const geo = mapSheetStops(PREVIEW);
  assertEquals(releaseSheetStop(geo.offsets.compact, -1.2, geo), 'semi');
  assertEquals(releaseSheetStop(geo.offsets.semi, -1.2, geo), 'open');
  // Borne haute : depuis « open », un fling vers le haut reste « open ».
  assertEquals(releaseSheetStop(geo.offsets.open, -1.2, geo), 'open');
});

Deno.test('fling vers le bas : saute au palier voisin plus fermé, borné au compact', () => {
  const geo = mapSheetStops(PREVIEW);
  assertEquals(releaseSheetStop(geo.offsets.open, 1.2, geo), 'semi');
  assertEquals(releaseSheetStop(geo.offsets.semi, 1.2, geo), 'compact');
  assertEquals(releaseSheetStop(geo.offsets.compact, 1.2, geo), 'compact');
});

Deno.test('tap sur la poignée = BASCULE, jamais un cycle à trois temps', () => {
  const geo = mapSheetStops(PREVIEW);
  assertEquals(toggleSheetStop('compact', geo), 'semi');
  assertEquals(toggleSheetStop('semi', geo), 'compact');
  // Depuis « open » aussi : on referme, on ne repart pas pour un tour.
  assertEquals(toggleSheetStop('open', geo), 'compact');
});

Deno.test('plafonnement au contenu : le palier 90 % saute quand il n\'a rien à montrer', () => {
  const geo = mapSheetStops(PREVIEW);
  // Contenu réel = 300 px : le palier 90 % (652) montrerait 350 px de carbone nu.
  const capped = clampSheetToContent(geo, 300);
  // Le 52 % est PRÉSERVÉ (déploiement franc), le 90 % retombe dessus…
  assertEquals(capped.heights.semi, geo.heights.semi);
  assertEquals(capped.heights.open, geo.heights.semi);
  // … et les deux se confondent ⇒ un seul palier déployé (pas de cran mort).
  assertEquals(capped.stops, ['compact', 'semi']);
  assertEquals(capped.sheetH, geo.heights.semi);
  // Le COMPACT n'est jamais rogné : il garde le ratio de la planche (le vide de
  // son bas est occupé par le bouton GO en position pill).
  assertEquals(capped.heights.compact, geo.heights.compact);
});

Deno.test('plafonnement au contenu : le déploiement reste FRANC même avec peu de contenu', () => {
  // Cas réel du 25/07 : peek 140 + bloc déployé 74 + poignée 44 = 258 px, à peine
  // plus que le compact (210). Sans garde-fou, la course serait de 48 px — et
  // NULLE sur un grand écran (le compact y dépasse le contenu), donc plus de
  // poignée du tout. Le premier palier déployé tient bon.
  const small = clampSheetToContent(mapSheetStops(PREVIEW), 258);
  assertEquals(small.stops, ['compact', 'semi']);
  assertEquals(small.heights.semi, 377);
  // Grand écran (iPhone 15 Pro Max) : le compact (270) dépasse déjà le contenu.
  const big = mapSheetStops({ ...PREVIEW, screenH: 932 });
  const bigCapped = clampSheetToContent(big, 258);
  assertEquals(bigCapped.stops.length, 2);
  assertEquals(bigCapped.heights.semi > bigCapped.heights.compact, true);
});

Deno.test('plafonnement au contenu : 3 paliers quand le contenu remplit vraiment', () => {
  const geo = mapSheetStops(PREVIEW);
  const capped = clampSheetToContent(geo, 600);
  assertEquals(capped.stops, ['compact', 'semi', 'open']);
  assertEquals(capped.heights.open, 600);
});

Deno.test('plafonnement au contenu : sans effet si le contenu dépasse les paliers', () => {
  const geo = mapSheetStops(PREVIEW);
  assertEquals(clampSheetToContent(geo, 5_000), geo);
  // Mesure absente / absurde : géométrie inchangée (aucun effet de bord).
  assertEquals(clampSheetToContent(geo, 0), geo);
  assertEquals(clampSheetToContent(geo, Number.NaN), geo);
});

Deno.test('plafonnement au contenu : le compact garde son ratio, quoi qu\'il arrive', () => {
  const geo = mapSheetStops(PREVIEW);
  // Contenu minuscule : le compact ne bouge PAS (le bouton GO occupe son bas) et
  // le premier palier déployé tient bon (sinon plus de geste du tout).
  const capped = clampSheetToContent(geo, 60);
  assertEquals(capped.heights.compact, geo.heights.compact);
  assertEquals(capped.heights.semi, geo.heights.semi);
  assertEquals(capped.stops, ['compact', 'semi']);
});

Deno.test('plafonnement au contenu : un panneau FIXE hugContent reste intouché', () => {
  // Un seul palier ⇒ aucun « premier palier déployé » ⇒ aucun plancher imposé.
  const geo = mapSheetStops({ ...PREVIEW, peekMinHeight: 128, stops: ['compact'], hugContent: true });
  assertEquals(clampSheetToContent(geo, 128), geo);
  assertEquals(clampSheetToContent(geo, 40).stops, ['compact']);
});

Deno.test('GO : pill tant que la sheet n\'est pas déployée', () => {
  const bottom = goButtonBottom({
    pillBottom: 72,
    sheetTop: 270,
    expanded: false,
    size: 60,
    screenH: 725,
    topClearance: 102,
  });
  assertEquals(bottom, 72);
});

Deno.test('GO déployé : rond CENTRÉ sur le bord haut de la sheet', () => {
  const bottom = goButtonBottom({
    pillBottom: 72,
    sheetTop: 437, // 60 (nav) + 377 (52 % de 725)
    expanded: true,
    size: 60,
    screenH: 725,
    topClearance: 102,
  });
  assertEquals(bottom, 407); // 437 - 30 : le rond chevauche le bord
});

Deno.test('GO déployé : ne monte jamais dans la bande du header (palier 90 %)', () => {
  const bottom = goButtonBottom({
    pillBottom: 72,
    sheetTop: 712, // 90 % d'un écran de 725 + nav
    expanded: true,
    size: 60,
    screenH: 725,
    topClearance: 102,
  });
  assertEquals(bottom, 725 - 102 - 60); // 563 — plafonné sous le header
});

Deno.test('GO déployé : ne redescend jamais sous sa position de pill', () => {
  // Sheet minuscule (peek très court sur un grand écran) : le rond resterait
  // sous la pill si on ne bornait pas — il reculerait au lieu d'avancer.
  const bottom = goButtonBottom({
    pillBottom: 200,
    sheetTop: 180,
    expanded: true,
    size: 60,
    screenH: 725,
    topClearance: 102,
  });
  assertEquals(bottom, 200);
});
