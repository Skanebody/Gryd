/**
 * GRYD — LE PARTAGE EN UN GESTE, SES RÈGLES ET SES REFUS.
 *
 * Chaque test commence par ce qu'il empêche. Les trois qui comptent le plus :
 *   · une feuille ne peint pas un bouton vidéo tant que l'encodeur n'a pas
 *     répondu (« pas encore mesuré » vaut non) ;
 *   · une affiche ne fabrique aucune ligne pour une mesure absente ;
 *   · le fond « chartreuse » n'invente pas un troisième thème natif, sinon les
 *     films d'un binaire déjà installé cesseraient de se décoder.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  QUICK_SHARE_ACTIONS_2026, QUICK_SHARE_FORMATS_2026, QUICK_SHARE_THEMES_2026,
  quickShareActions2026, quickSharePrimaryClaim2026, quickShareRendering2026,
  quickShareStats2026, quickShareTraceState2026,
} from './quickShare2026.ts';
import { SHARE_EXPORT_FORMATS_2026 } from './shareModel2026.ts';

// ─── 1. LES CADRES ET LES FONDS ─────────────────────────────────────────────

Deno.test('les deux cadres de la feuille courte existent VRAIMENT dans les formats d’export', () => {
  // ÉTAPE 0 : un cadre que `SHARE_EXPORT_FORMATS_2026` ne connaît pas ferait
  // planter `exportLayout2026` au moment de la capture, donc au moment exact où
  // le joueur appuie sur « Partager ». On le refuse ici, pas là-bas.
  for (const format of QUICK_SHARE_FORMATS_2026) {
    assert(format in SHARE_EXPORT_FORMATS_2026, `cadre inconnu de l'export : ${format}`);
  }
  assertEquals([...QUICK_SHARE_FORMATS_2026], ['story', 'square']);
  // 9:16 et 1:1, les deux usages réels — story plein écran et post de feed.
  assertEquals(SHARE_EXPORT_FORMATS_2026.story, { width: 1080, height: 1920 });
  assertEquals(SHARE_EXPORT_FORMATS_2026.square, { width: 1080, height: 1080 });
});

Deno.test('« chartreuse » n’est PAS un troisième thème natif : il retombe sur le fond sombre', () => {
  // LE BUG QUE CE TEST FERME. `ShareTheme2026` voyage jusqu'au natif :
  // `buildRunFilmScene2026` le sérialise dans la scène JSON que
  // RunFilmEncoder.swift / RunFilmScene.kt décodent en Codable STRICT. Une
  // troisième valeur ferait échouer le décodage d'un binaire DÉJÀ INSTALLÉ :
  // un film qui marche aujourd'hui cesserait de marcher, pour une teinte.
  for (const theme of QUICK_SHARE_THEMES_2026) {
    const rendering = quickShareRendering2026(theme);
    assert(rendering.theme === 'dark' || rendering.theme === 'light',
      `le fond « ${theme} » produit un thème que le natif ne sait pas décoder : ${rendering.theme}`);
  }
  assertEquals(quickShareRendering2026('noir'), { theme: 'dark', accent: false });
  assertEquals(quickShareRendering2026('chartreuse'), { theme: 'dark', accent: true });
  assertEquals(quickShareRendering2026('minimal'), { theme: 'light', accent: false });
});

Deno.test('l’accent ne se combine JAMAIS au fond clair (contraste)', () => {
  // Chartreuse sur blanc est illisible. Le seul fond clair du lot est
  // « minimal », et il n'est jamais accentué.
  for (const theme of QUICK_SHARE_THEMES_2026) {
    const rendering = quickShareRendering2026(theme);
    assert(!(rendering.theme === 'light' && rendering.accent), `fond clair accentué : ${theme}`);
  }
});

// ─── 2. LA CAPACITÉ, JAMAIS L'INTENTION ─────────────────────────────────────

Deno.test('« pas encore mesuré » vaut NON : aucun bouton vidéo tant que l’encodeur n’a pas répondu', () => {
  // ÉTAPE 0 : `filmAvailable` vaut `null` pendant tout le temps que met
  // `getRunFilmCompatibility2026` à répondre. Peindre le bouton « au cas où »
  // produirait un bouton qui échoue sur les binaires sans le module natif.
  assertEquals(quickShareActions2026({ platform: 'ios', filmAvailable: null }), ['image', 'studio']);
  assertEquals(quickShareActions2026({ platform: 'ios', filmAvailable: false }), ['image', 'studio']);
  assertEquals(quickShareActions2026({ platform: 'ios', filmAvailable: true }), ['image', 'film', 'studio']);
});

Deno.test('le web n’a pas de vidéo, même si on le lui affirme', () => {
  // `generateRunFilm2026` répond `web_not_supported` : un appelant qui forcerait
  // `filmAvailable: true` sur web obtiendrait un bouton qui échoue toujours.
  assertEquals(quickShareActions2026({ platform: 'web', filmAvailable: true }), ['image', 'studio']);
});

Deno.test('l’ordre des actions est STABLE, et c’est la seule source de l’ordre', () => {
  // Un geste appris ne doit pas devenir une loterie d'un rendu à l'autre.
  const actions = quickShareActions2026({ platform: 'android', filmAvailable: true });
  assertEquals(actions, [...QUICK_SHARE_ACTIONS_2026]);
});

Deno.test('le web ne promet pas une image : il n’en produit pas', () => {
  // `captureRef` n'existe pas sur react-native-web : `shareAsImage` retombe sur
  // `openShareSheet`, qui envoie la LÉGENDE. Le dépôt a déjà payé ce mensonge
  // une fois (le sticker texte annoncé « PNG », cf. shareActions.ts).
  assertEquals(quickSharePrimaryClaim2026('web'), 'text');
  assertEquals(quickSharePrimaryClaim2026('ios'), 'image');
  assertEquals(quickSharePrimaryClaim2026('android'), 'image');
});

// ─── 3. LES QUATRE ÉTATS DE LA TRACE ────────────────────────────────────────

Deno.test('les quatre états de la trace sont distincts — jamais trois (L8/L14/L19)', () => {
  // « en cours de vérification » ≠ « échec » ≠ « rien à montrer » ≠ « masquée ».
  // Les confondre reviendrait à annoncer une protection qu'on n'a pas lue.
  assertEquals(quickShareTraceState2026({ privacyResolved: false, privacyFailed: false, protectedSegmentCount: 0 }), 'checking');
  assertEquals(quickShareTraceState2026({ privacyResolved: false, privacyFailed: true, protectedSegmentCount: 0 }), 'failed');
  assertEquals(quickShareTraceState2026({ privacyResolved: true, privacyFailed: false, protectedSegmentCount: 0 }), 'none');
  assertEquals(quickShareTraceState2026({ privacyResolved: true, privacyFailed: false, protectedSegmentCount: 2 }), 'masked');
});

Deno.test('un échec de lecture des protections l’emporte sur tout le reste', () => {
  // Même avec des segments en main, une lecture échouée ne doit jamais être
  // annoncée « masqué » : on ne sait pas ce qui a été appliqué.
  assertEquals(
    quickShareTraceState2026({ privacyResolved: true, privacyFailed: true, protectedSegmentCount: 5 }),
    'failed',
  );
});

// ─── 4. LES MESURES : AUCUNE LIGNE INVENTÉE ─────────────────────────────────

const FULL = {
  distance: '8,42', duration: '42:10', rate: "5:00 /km", rateLabel: 'ALLURE',
  elevation: '124 m', gain: '12 400 m²',
} as const;

Deno.test('une sortie complète rend ses cinq mesures, dans l’ordre de lecture', () => {
  const stats = quickShareStats2026(FULL, 'fr');
  assertEquals(stats.map((stat) => stat.key), ['distance', 'duration', 'rate', 'elevation', 'gain']);
  assertEquals(stats.map((stat) => stat.value), ['8,42', '42:10', '5:00 /km', '124 m', '12 400 m²']);
});

Deno.test('une mesure ABSENTE ne produit pas de ligne — jamais un zéro nu, jamais un tiret', () => {
  // C'est l'interdit L8/L14 appliqué à une image qui SORT de l'app : un « 0 »
  // sur une affiche partagée est un mensonge public, pas un défaut d'affichage.
  const stats = quickShareStats2026(
    { ...FULL, rate: null, elevation: null, gain: null },
    'fr',
  );
  assertEquals(stats.map((stat) => stat.key), ['distance', 'duration']);
  for (const stat of stats) {
    assert(stat.value.length > 0, 'une ligne vide a été produite');
    assert(!/^[—–-]$/.test(stat.value), 'un tiret de remplissage a été produit');
  }
});

Deno.test('une chaîne d’espaces ne vaut pas une mesure', () => {
  // Les formatteurs du dépôt rendent `''` quand ils ne savent pas ; un appelant
  // distrait peut rendre `' '`. Les deux doivent disparaître de la même façon.
  assertEquals(quickShareStats2026({ ...FULL, elevation: '   ', gain: '' }, 'fr').map((s) => s.key),
    ['distance', 'duration', 'rate']);
});

Deno.test('le terrain gagné est la SEULE ligne accentuée', () => {
  // Le quota d'accent de la charte (8 à 10 %) tient parce qu'une seule valeur
  // le porte. Deux lignes chartreuse sur une affiche, et l'accent devient un
  // fond.
  const accented = quickShareStats2026(FULL, 'fr').filter((stat) => stat.accent);
  assertEquals(accented.map((stat) => stat.key), ['gain']);
});

Deno.test('l’étiquette du rythme vient de l’appelant : un vélo ne dit jamais « allure »', () => {
  // `buildShareFacts2026` calcule km/h pour le vélo et s/km pour la course, et
  // fournit l'étiquette correspondante. Ce module ne la devine pas.
  const bike = quickShareStats2026({ ...FULL, rate: '24,1 km/h', rateLabel: 'VITESSE' }, 'fr');
  assertEquals(bike.find((stat) => stat.key === 'rate')?.label, 'VITESSE');
  assertEquals(bike.find((stat) => stat.key === 'rate')?.value, '24,1 km/h');
});

Deno.test('les étiquettes suivent la langue', () => {
  const fr = quickShareStats2026(FULL, 'fr').map((stat) => stat.label);
  const en = quickShareStats2026(FULL, 'en').map((stat) => stat.label);
  assertEquals(fr[1], 'DURÉE');
  assertEquals(en[1], 'TIME');
  assertEquals(fr[4], 'TERRAIN GAGNÉ');
  assertEquals(en[4], 'TERRITORY GAINED');
});

// ─── 5. PURETÉ ──────────────────────────────────────────────────────────────

Deno.test('module PUR : aucun import React / react-native / Expo', () => {
  // Même garde que `shareTargets.test.ts` : un import natif rendrait ce modèle
  // intestable en Deno et le sortirait du domaine des fonctions pures.
  const src = Deno.readTextFileSync(new URL('./quickShare2026.ts', import.meta.url));
  const imports = [...src.matchAll(/^\s*import\s+(?!type\s)[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  assertEquals(imports, [], `quickShare2026.ts doit rester sans dépendance de valeur : ${imports.join(', ')}`);
  for (const forbidden of ['react', 'react-native', 'expo-sharing', 'expo-haptics']) {
    assert(!src.includes(`'${forbidden}'`), `import interdit : ${forbidden}`);
  }
});
