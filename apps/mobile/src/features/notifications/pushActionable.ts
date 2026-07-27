/**
 * GRYD — LA LIGNE « APPAREIL PUSH » EST-ELLE PRESSABLE ? Fonction PURE.
 *
 * ─── LA FAUTE RÉPARÉE (28/07/2026) ─────────────────────────────────────────
 * `app/parametres/[section].tsx` peignait la ligne pressable ET avec un chevron
 * dans TOUS les statuts non-`registered`, et sa branche par défaut appelait
 * `pushEnable()` — y compris sur des diagnostics dont `registerPushDevice`
 * rend le verdict AVANT toute I/O, à chaque appel, indéfiniment :
 *   · `push.ts:95` — `if (Platform.OS === 'web') return { status: 'unsupported' }` ;
 *   · `push.ts:98` — `if (!Notifications) return { status: 'module_missing' }`.
 * Le joueur pouvait réappuyer sans fin sur une action que le sous-libellé de la
 * MÊME ligne venait de déclarer impossible. C'est « aucun bouton mort » — et la
 * règle inverse était déjà appliquée 260 lignes plus haut, dans le même écran,
 * par `otherDevicesActionable` (features/account/otherDevices.ts:88). Deux
 * lignes voisines appliquaient des règles opposées ; celle-ci les réconcilie,
 * sur le même patron : une fonction PURE, testée, que l'écran consomme.
 *
 * ─── CE QUI EST NON-ACTIONNABLE, ET POURQUOI (chacun est démontrable) ──────
 *  · `unsupported`    — verdict de PLATEFORME, rendu avant toute I/O. Sur le
 *    bundle web (l'instrument de preview du fondateur depuis A-47), aucun appui
 *    ne peut aboutir, jamais.
 *  · `module_missing` — verdict de BUILD, rendu avant toute I/O. Le module natif
 *    absent du binaire installé ne peut pas apparaître pendant la session ; il
 *    faut un autre build, qui repart de `idle`.
 *  · `unavailable`    — le service de push n'a délivré AUCUN token. Ses deux
 *    causes sont des propriétés de l'environnement, pas de l'instant :
 *    credentials APNs/FCM absents du build, ou simulateur. Le sous-libellé de la
 *    ligne le dit déjà mot pour mot (`pushNoCredentials` : « c'est la
 *    configuration serveur qui manque »). Réappuyer redemanderait le même token
 *    au même service dépourvu des mêmes clés.
 *
 * ─── CE QUI RESTE ACTIONNABLE, ET POURQUOI ────────────────────────────────
 *  · `idle`              — jamais tenté : c'est l'appui NORMAL.
 *  · `registered`        — l'appui DÉSACTIVE (action réelle, sens inverse).
 *  · `permission_denied` — l'appui ouvre les réglages système, seul endroit où
 *    le refus se défait. Ce n'était déjà pas un `pushEnable()`.
 *  · `not_configured`    — pas de session / pas de projectId EAS. La session
 *    peut réapparaître pendant la vie de l'écran ; on ne condamne pas ce que le
 *    temps peut réparer.
 *  · `error`             — le serveur a refusé (réseau, RLS, session expirée).
 *    Un réessai est exactement la bonne réponse.
 *
 * Aucun import React/RN : testable en Deno, comme toute règle du dépôt.
 */
import type { PushStatus } from './pushStatus';

/**
 * La ligne doit-elle porter `onPress` ET `chevron` ?
 *
 * `false` ne veut pas dire « cacher la ligne » : l'état RESTE affiché, avec son
 * sous-libellé qui explique pourquoi. Une ligne muette informe ; une ligne
 * pressable qui échoue à coup sûr ment.
 */
export function pushActionable(status: PushStatus): boolean {
  return status !== 'unsupported' && status !== 'module_missing' && status !== 'unavailable';
}
