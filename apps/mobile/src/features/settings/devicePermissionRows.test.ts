/**
 * GRYD — AUTORISATIONS DE L'APPAREIL : les états qu'on refuse de confondre.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT, ET IL EST ÉCRIT DANS CE DÉPÔT ────────────
 * Le patron « une permission, un bouton Ouvrir les Réglages » a déjà produit
 * deux fautes ailleurs, et ce sont elles que ce fichier verrouille :
 *
 *  1. UN BOUTON QUI NE TIENT PAS SA PROMESSE. `features/map/BattleMapOverlays`
 *     appelle `Linking.openSettings()` dès que la position n'est pas accordée.
 *     Sur un `undetermined` (GRYD n'a jamais demandé), iOS n'a encore AUCUNE
 *     entrée pour l'app : le joueur arrive sur un écran sans l'interrupteur
 *     qu'on lui a promis. Ici, `devicePermissionAction('undetermined')` doit
 *     rendre `none`.
 *  2. UN BOUTON MORT SUR LE WEB. `permissionSensors.web.ts` sert
 *     `OPEN_APP_SETTINGS = null` parce qu'aucune API navigateur ne mène aux
 *     réglages ; un écran qui peint quand même le bouton échoue à 100 % des
 *     taps. `showsOpenSettings(state, false)` doit donc être faux PARTOUT.
 *
 * Chacune de ces deux règles échouerait sur le code naïf `state !== 'granted'`.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { PermissionCardState } from '../setup/permissionCards.ts';
import {
  devicePermissionAction,
  devicePermissionTone,
  showsOpenSettings,
} from './devicePermissionRows.ts';

const ALL: readonly PermissionCardState[] = [
  'checking',
  'undetermined',
  'asking',
  'granted',
  'denied',
  'blocked',
  'unavailable',
];

Deno.test('autorisations : « Ouvrir les Réglages » seulement là où l’OS a une entrée', () => {
  assert(devicePermissionAction('granted') === 'open_settings', 'accordé : on doit pouvoir retirer');
  assert(devicePermissionAction('denied') === 'open_settings');
  assert(devicePermissionAction('blocked') === 'open_settings');
  // Le défaut n° 1 : jamais avant la première demande.
  assert(
    devicePermissionAction('undetermined') === 'none',
    'undetermined : iOS n’a pas encore d’entrée pour GRYD, le bouton ne tiendrait pas sa promesse',
  );
  assert(devicePermissionAction('checking') === 'none', 'on ne propose rien pendant qu’on lit');
  assert(devicePermissionAction('unavailable') === 'none', 'ne pas savoir n’est pas un refus');
  assert(devicePermissionAction('asking') === 'none', 'cette page ne demande aucune permission');
});

Deno.test('autorisations : aucune plateforme sans réglages ne peint le bouton', () => {
  for (const state of ALL) {
    // Le défaut n° 2 : sur le web, aucun état ne mérite un bouton.
    assert(
      showsOpenSettings(state, false) === false,
      `${state} : bouton peint alors que la plateforme n’ouvre aucun réglage`,
    );
  }
  assert(showsOpenSettings('blocked', true), 'bloqué + plateforme capable = la seule issue réelle');
});

Deno.test('autorisations : cinq familles d’états, jamais confondues', () => {
  assert(devicePermissionTone('checking') === 'reading');
  assert(devicePermissionTone('asking') === 'reading');
  assert(devicePermissionTone('granted') === 'granted');
  // Refusé et bloqué appellent la même phrase ET le même geste.
  assert(devicePermissionTone('denied') === 'refused');
  assert(devicePermissionTone('blocked') === 'refused');
  // « Pas encore demandée » n'est PAS un refus : le dire serait accuser
  // l'utilisateur d'un geste qu'il n'a jamais fait.
  assert(devicePermissionTone('undetermined') === 'pending');
  // Et « on ne sait pas » n'est ni l'un ni l'autre.
  assert(devicePermissionTone('unavailable') === 'unknown');

  const tones = new Set(ALL.map(devicePermissionTone));
  assert(tones.size === 5, `les états s’écrasent : ${[...tones].join(', ')}`);
});
