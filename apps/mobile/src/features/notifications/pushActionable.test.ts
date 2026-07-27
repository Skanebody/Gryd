/**
 * GRYD — « aucun bouton mort » sur la ligne push. Tests PURS (Deno), zéro React.
 *
 * Ce test n'existe pas pour vérifier un booléen : il existe pour que le jour où
 * quelqu'un rendra `unsupported` pressable « pour que ça fasse quelque chose »,
 * l'arbre casse. C'est le même rôle que `otherDevices.test.ts` sur la ligne
 * voisine du MÊME écran (`app/parametres/[section].tsx`).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { pushActionable } from './pushActionable.ts';
import { PUSH_STATUSES, type PushStatus } from './pushStatus.ts';

/** La liste EXHAUSTIVE de `PushStatus`, LUE à la source (`pushStatus.ts`) —
 *  jamais recopiée : une copie aurait raté le statut ajouté demain. */
const ALL: readonly PushStatus[] = PUSH_STATUSES;

Deno.test('les verdicts rendus AVANT toute I/O ne sont pas pressables', () => {
  // push.ts:95 — `Platform.OS === 'web'`. Sur le bundle web, aucun appui ne peut
  // aboutir : le résultat est décidé avant le moindre appel réseau.
  assertEquals(pushActionable('unsupported'), false);
  // push.ts:98 — `!Notifications`. Le module natif absent du binaire installé
  // n'apparaîtra pas pendant la session.
  assertEquals(pushActionable('module_missing'), false);
  // Aucun token délivré : credentials APNs/FCM absents du build, ou simulateur.
  // Le sous-libellé de la ligne le dit déjà — réappuyer redemanderait le même
  // token au même service dépourvu des mêmes clés.
  assertEquals(pushActionable('unavailable'), false);
});

Deno.test('ce que le temps ou le joueur peut réparer RESTE pressable', () => {
  assertEquals(pushActionable('idle'), true, 'jamais tenté : c’est l’appui normal');
  assertEquals(pushActionable('registered'), true, 'l’appui désactive');
  assertEquals(pushActionable('permission_denied'), true, 'l’appui ouvre les réglages système');
  assertEquals(pushActionable('not_configured'), true, 'une session peut réapparaître');
  assertEquals(pushActionable('error'), true, 'un refus serveur se réessaie');
});

Deno.test('chaque statut est tranché — aucun n’est laissé au hasard', () => {
  const decided = ALL.filter((s) => typeof pushActionable(s) === 'boolean');
  assertEquals(decided.length, ALL.length);
  // Et la fonction ne condamne QUE trois statuts : si ce nombre bouge, c'est une
  // décision produit, pas un effet de bord — le test l'oblige à être vue.
  assertEquals(ALL.filter((s) => !pushActionable(s)).length, 3);
});
