/**
 * GRYD — tests de la capacité de push distant.
 *
 * ÉTAPE 0 : le premier test lit `app.json` POUR DE VRAI. Il ne vérifie pas mon
 * code, il fixe le FAIT que ce lot corrige — ce build retire l'entitlement iOS
 * et ne déclare aucun `google-services.json`, donc aucun jeton de push ne peut
 * exister. Le jour où le fondateur dépose une clé APNs et retire le plugin, ce
 * test tombe : c'est exactement ce qu'on veut qu'il fasse.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  remotePushCapability,
  remotePushPossible,
  WITHOUT_PUSH_ENTITLEMENT_PLUGIN,
} from './remotePushCapability.ts';

const appJson = JSON.parse(
  await Deno.readTextFile(new URL('../../../app.json', import.meta.url)),
) as { expo: { plugins?: unknown[]; android?: { googleServicesFile?: string } } };

const FACTS = {
  plugins: appJson.expo.plugins,
  googleServicesFile: appJson.expo.android?.googleServicesFile,
};

Deno.test('étape 0 — app.json retire bien l’entitlement iOS et ne déclare aucun FCM', () => {
  assert(
    (appJson.expo.plugins ?? []).includes(WITHOUT_PUSH_ENTITLEMENT_PLUGIN),
    'le plugin qui retire `aps-environment` a disparu d’app.json',
  );
  assertEquals(appJson.expo.android?.googleServicesFile, undefined);
});

Deno.test('étape 0 — sur CE build, aucune plateforme ne peut recevoir un push distant', () => {
  assertEquals(remotePushCapability('ios', FACTS), 'no_entitlement');
  assertEquals(remotePushCapability('android', FACTS), 'no_fcm_config');
  assertEquals(remotePushCapability('web', FACTS), 'unsupported_platform');
  for (const p of ['ios', 'android', 'web']) {
    assertEquals(remotePushPossible(remotePushCapability(p, FACTS)), false);
  }
});

Deno.test('iOS : le verdict suit le plugin, pas une supposition', () => {
  assertEquals(
    remotePushCapability('ios', { plugins: ['expo-router'], googleServicesFile: undefined }),
    'capable',
  );
  // Forme `["nom", options]` : c'est ainsi qu'expo-location et expo-sensors
  // figurent dans app.json. Rater cette forme rendrait le verdict faussement
  // positif le jour où quelqu'un passe des options au plugin.
  assertEquals(
    remotePushCapability('ios', {
      plugins: [[WITHOUT_PUSH_ENTITLEMENT_PLUGIN, { any: true }]],
      googleServicesFile: undefined,
    }),
    'no_entitlement',
  );
});

Deno.test('configuration illisible : le verdict est NÉGATIF, jamais « peut-être »', () => {
  // Un « peut-être » se paierait par une boîte de permission ouverte pour rien
  // — et iOS ne la propose qu'une fois.
  assertEquals(remotePushCapability('ios', { plugins: null, googleServicesFile: null }), 'no_entitlement');
  assertEquals(
    remotePushCapability('ios', { plugins: undefined, googleServicesFile: undefined }),
    'no_entitlement',
  );
});

Deno.test('Android : c’est la déclaration FCM qui tranche', () => {
  assertEquals(
    remotePushCapability('android', { plugins: [], googleServicesFile: './google-services.json' }),
    'capable',
  );
  assertEquals(remotePushCapability('android', { plugins: [], googleServicesFile: '' }), 'no_fcm_config');
});

Deno.test('plateforme inconnue : rien n’est prouvé, donc rien n’est promis', () => {
  assertEquals(remotePushCapability('windows', FACTS), 'unsupported_platform');
});
