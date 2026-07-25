/**
 * GRYD — ce que la lecture des préférences de confidentialité a le droit de
 * conclure d'un JSON stocké.
 *
 * Ce que ces tests protègent, dans l'ordre de gravité :
 *  1. LES DIX RÉGLAGES SUPPRIMÉS NE REVIENNENT PAS. Les téléphones déjà en
 *     service portent `livePosition`, `whoCanMessage`, `maskRadius`… dans leur
 *     stockage. Un `{ ...DEFAULT, ...parsed }` les ré-injecterait, et le premier
 *     patch les ré-écrirait : on persisterait pour toujours des préférences que
 *     plus aucun écran ne lit ni ne respecte. C'est le test central ;
 *  2. le PLANCHER de sécurité `maskEndpoints` ne s'ouvre jamais tout seul — ni
 *     par un stockage vide, ni par un JSON cassé, ni par une valeur d'un autre
 *     type. Le départ d'une course, c'est l'adresse du coureur ;
 *  3. une visibilité inconnue (client plus récent, corruption) retombe sur le
 *     défaut au lieu d'entrer telle quelle dans l'app ;
 *  4. un choix RÉELLEMENT enregistré est relu tel quel — sinon la page mentirait
 *     dans l'autre sens.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DEFAULT_PRIVACY,
  applyPatch,
  parsePrivacyPrefs,
  type PrivacyPrefs,
} from './prefs.ts';

Deno.test('stockage vide → les défauts, et le plancher est fermé', () => {
  assertEquals(parsePrivacyPrefs(null), DEFAULT_PRIVACY);
  assertEquals(parsePrivacyPrefs(''), DEFAULT_PRIVACY);
  assertEquals(DEFAULT_PRIVACY.maskEndpoints, true);
});

Deno.test('JSON illisible → les défauts, jamais une exception vers l’écran', () => {
  assertEquals(parsePrivacyPrefs('{oops'), DEFAULT_PRIVACY);
  assertEquals(parsePrivacyPrefs('null'), DEFAULT_PRIVACY);
  assertEquals(parsePrivacyPrefs('42'), DEFAULT_PRIVACY);
  assertEquals(parsePrivacyPrefs('"texte"'), DEFAULT_PRIVACY);
});

Deno.test('LES RÉGLAGES SUPPRIMÉS NE SURVIVENT PAS À UNE RELECTURE', () => {
  // Exactement ce qu'un téléphone déjà en service a en mémoire.
  const legacy = JSON.stringify({
    privateMode: true,
    profileVisibility: 'crew',
    runVisibility: 'hidden',
    maskEndpoints: false,
    maskRadius: '1000',
    maskHome: true,
    maskWork: true,
    livePosition: 'crew',
    heartRatePrivate: true,
    sportDataPrivate: true,
    territoryVisible: false,
    whoCanAdd: 'nobody',
    whoCanInvite: 'nobody',
    whoCanMessage: 'nobody',
    whoSeesStatus: 'nobody',
  });
  const prefs = parsePrivacyPrefs(legacy);
  assertEquals(Object.keys(prefs).sort(), ['maskEndpoints', 'profileVisibility']);
  // Les deux réglages qui AGISSENT, eux, sont relus fidèlement.
  assertEquals(prefs.profileVisibility, 'crew');
  assertEquals(prefs.maskEndpoints, false);
});

Deno.test('visibilité inconnue → défaut, jamais la valeur brute', () => {
  assertEquals(
    parsePrivacyPrefs('{"profileVisibility":"followers"}').profileVisibility,
    DEFAULT_PRIVACY.profileVisibility,
  );
  assertEquals(
    parsePrivacyPrefs('{"profileVisibility":7}').profileVisibility,
    DEFAULT_PRIVACY.profileVisibility,
  );
});

Deno.test('maskEndpoints d’un autre type ne peut pas OUVRIR le plancher', () => {
  // Un `0`, un `"false"` ou un `null` sont tous « faux » en JS : s'ils étaient
  // acceptés tels quels, une donnée corrompue déverrouillerait le masquage.
  assertEquals(parsePrivacyPrefs('{"maskEndpoints":0}').maskEndpoints, true);
  assertEquals(parsePrivacyPrefs('{"maskEndpoints":"false"}').maskEndpoints, true);
  assertEquals(parsePrivacyPrefs('{"maskEndpoints":null}').maskEndpoints, true);
  // Un vrai `false` enregistré par l'utilisateur, lui, est respecté.
  assertEquals(parsePrivacyPrefs('{"maskEndpoints":false}').maskEndpoints, false);
});

Deno.test('applyPatch ne crée aucune clé et n’en perd aucune', () => {
  const base: PrivacyPrefs = { profileVisibility: 'private', maskEndpoints: true };
  const next = applyPatch(base, { maskEndpoints: false });
  assertEquals(next, { profileVisibility: 'private', maskEndpoints: false });
  // L'état d'origine n'est pas muté (la persistance dérive du RÉSULTAT).
  assertEquals(base.maskEndpoints, true);
});

Deno.test('un aller-retour sérialisation → lecture est stable', () => {
  const prefs: PrivacyPrefs = { profileVisibility: 'friends', maskEndpoints: false };
  assertEquals(parsePrivacyPrefs(JSON.stringify(prefs)), prefs);
});
