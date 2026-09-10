/**
 * GRYD — L'ONGLET « SCANNER » NE SE PEINT QUE S'IL PEUT SCANNER (LOT Q4).
 *
 * ÉTAPE 0 — LE DÉFAUT QUI EXISTAIT, ET QU'ON NE REFAIT PAS. `app/qr.tsx`
 * (25/07/2026) écrivait, en toutes lettres, la raison pour laquelle l'onglet
 * Scanner n'était pas peint : « un segmented dont un onglet sur deux ne peut
 * rien faire est un bouton mort déguisé en navigation ». Le module natif arrive
 * avec ce lot ; la règle, elle, ne change pas. Un binaire ANTÉRIEUR au plugin
 * n'a rien à ouvrir, et ces tests le prouvent avant qu'un écran ne le peigne.
 *
 * Chaque cas ci-dessous est un binaire qui existe vraiment dans la nature :
 * celui du fondateur (31cdde4e, sans le module), la preview web, et le build
 * qui suivra ce lot.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CAMERA_PLUGIN_2026, scanCapability2026 } from './scanCapability2026.ts';

/** La déclaration telle qu'elle vit dans `app.json` après ce lot. */
const PLUGINS_APRES = [
  'expo-router',
  ['expo-location', { locationWhenInUsePermission: 'x' }],
  ['expo-image-picker', { cameraPermission: 'x' }],
  [CAMERA_PLUGIN_2026, { cameraPermission: 'GRYD utilise l’appareil photo…' }],
];

/** La déclaration du build que le fondateur a sur son iPhone. */
const PLUGINS_AVANT = ['expo-router', ['expo-image-picker', { cameraPermission: 'x' }]];

Deno.test('scanner : config déclarée + module natif = capable', () => {
  assertEquals(scanCapability2026('ios', PLUGINS_APRES, true), 'capable');
  assertEquals(scanCapability2026('android', PLUGINS_APRES, true), 'capable');
});

Deno.test('scanner : le module natif absent réclame un build, pas un « réessaie »', () => {
  // Le cas du binaire installé aujourd'hui : la config du dépôt est à jour, le
  // JS aussi (il voyage), mais le natif NON. Le verdict doit rester négatif.
  assertEquals(scanCapability2026('ios', PLUGINS_APRES, false), 'needs_build');
});

Deno.test('scanner : le plugin absent réclame un build, même avec le module', () => {
  // Sur iOS, ouvrir la caméra sans NSCameraUsageDescription TUE l'app. Ce cas
  // ne doit jamais rendre `capable`, quoi que dise le require.
  assertEquals(scanCapability2026('ios', PLUGINS_AVANT, true), 'needs_build');
});

Deno.test('scanner : un plugin déclaré sans purpose string ne suffit pas', () => {
  const plugins = [[CAMERA_PLUGIN_2026, { cameraPermission: false }]];
  assertEquals(scanCapability2026('ios', plugins, true), 'needs_build');
  assertEquals(scanCapability2026('ios', [[CAMERA_PLUGIN_2026, {}]], true), 'needs_build');
  assertEquals(scanCapability2026('ios', [[CAMERA_PLUGIN_2026, { cameraPermission: '  ' }]], true), 'needs_build');
});

Deno.test('scanner : le plugin en forme de chaîne nue ne déclare aucune string', () => {
  assertEquals(scanCapability2026('ios', [CAMERA_PLUGIN_2026], true), 'needs_build');
});

Deno.test('scanner : une config illisible vaut NON, jamais « peut-être »', () => {
  assertEquals(scanCapability2026('ios', null, true), 'needs_build');
  assertEquals(scanCapability2026('ios', undefined, true), 'needs_build');
});

Deno.test('scanner : sur le web, aucun onglet n’est peint', () => {
  // Ce n'est pas un défaut à corriger : la preview web sert à relire des
  // écrans, pas à scanner un carton. Un onglet qui demanderait l'accès webcam
  // du poste de travail serait une promesse déplacée.
  assertEquals(scanCapability2026('web', PLUGINS_APRES, true), 'unsupported_platform');
  assertEquals(scanCapability2026('unknown', PLUGINS_APRES, true), 'unsupported_platform');
});

Deno.test('scanner : app.json déclare RÉELLEMENT le plugin et sa purpose string', () => {
  // Sans cette lecture, les cas ci-dessus resteraient verts sur une app.json
  // que personne n'aurait modifiée : ils testeraient une fonction, pas le
  // produit.
  const raw = Deno.readTextFileSync(new URL('../../../app.json', import.meta.url));
  const config = JSON.parse(raw) as { expo: { plugins: unknown[] } };
  assertEquals(
    scanCapability2026('ios', config.expo.plugins, true),
    'capable',
    'app.json ne déclare pas expo-camera avec une purpose string',
  );
});

Deno.test('scanner : NSCameraUsageDescription est UNE seule phrase, la même partout', () => {
  /*
   * `IOSConfig.Permissions.applyPermissions` fait
   * `infoPlist[clé] = valeurDuPlugin || infoPlist[clé] || défautAnglais`.
   * DEUX plugins déclarent NSCameraUsageDescription (expo-image-picker et
   * expo-camera) : le dernier du tableau gagne. Deux formulations différentes
   * rendraient donc la chaîne INSTALLÉE dépendante de l'ordre des plugins, et
   * on auditerait un texte que l'utilisateur ne voit pas. C'est exactement le
   * piège déjà payé sur NSMotionUsageDescription (app.json, `_pourquoi`).
   */
  const raw = Deno.readTextFileSync(new URL('../../../app.json', import.meta.url));
  const config = JSON.parse(raw) as { expo: { plugins: unknown[] } };
  const strings = config.expo.plugins
    .filter((p): p is [string, Record<string, unknown>] => Array.isArray(p))
    .filter((p) => p[0] === 'expo-image-picker' || p[0] === CAMERA_PLUGIN_2026)
    .map((p) => p[1]?.cameraPermission);
  assertEquals(strings.length, 2, 'les deux plugins qui déclarent la caméra doivent être là');
  assertEquals(strings[0], strings[1], 'les deux purpose strings caméra ont divergé');
  const phrase = String(strings[0]);
  // Une seule phrase : un seul point final, et rien après lui.
  assertEquals(phrase.split('.').filter((part) => part.trim().length > 0).length, 1, phrase);
  assertEquals(/[—–]/.test(phrase), false, 'tiret long dans une chaîne française');
});
