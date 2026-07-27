/**
 * GRYD — E78, CE QUE LA LIGNE « APPAREILS » A LE DROIT D'AFFIRMER. Module PUR
 * (aucun import React / React Native), donc testable sous Deno.
 *
 * ─── LE PIÈGE DE CET ÉCRAN ────────────────────────────────────────────────────
 * La spec (E78, l.2373) demande « connexions et appareils » avec des états
 * « connecté / expiré / synchronisation / déconnexion ». Il serait facile de
 * peindre une liste d'appareils — modèle, ville, dernière activité — et elle
 * serait ENTIÈREMENT INVENTÉE : le client Supabase Auth n'expose AUCUN moyen
 * d'énumérer les sessions d'un compte (cf. `lib/auth.ts`, `signOutOtherDevices`).
 * Ce qui existe vraiment, c'est UNE action serveur : révoquer toutes les autres
 * sessions (`signOut({ scope: 'others' })`).
 *
 * D'où la règle que ce module encode : on ne peint jamais un appareil, on peint
 * une ACTION — et seulement quand elle peut réussir.
 *
 * ─── QUATRE ÉTATS JAMAIS CONFONDUS (constitution §1) ──────────────────────────
 * `unknown` (la session est encore en cours de restauration : on n'affirme rien,
 * surtout pas « pas de compte ») · `noBackend` (build sans Supabase : l'action
 * est impossible, on le dit au lieu d'un bouton mort) · `signedOut` (pas de
 * compte : il n'y a aucune session à révoquer) · `ready` / `busy` / `done` /
 * `failed` (l'action, avant, pendant et après).
 *
 * Aucune valeur de jeu ici — cette ligne ne décide d'aucun claim.
 */

/** Ce que la ligne « Déconnecter les autres appareils » montre. */
export type OtherDevicesState =
  /** Session en cours de restauration — un chargement n'affirme rien. */
  | 'unknown'
  /** Aucun backend configuré : l'action ne peut pas exister ici. */
  | 'noBackend'
  /** Pas de compte : il n'y a aucune autre session à couper. */
  | 'signedOut'
  /** Action possible, jamais tentée depuis l'ouverture de l'écran. */
  | 'ready'
  /** Révocation en vol. */
  | 'busy'
  /** Le serveur a confirmé la révocation. */
  | 'done'
  /** La révocation a échoué — l'écran doit le dire, pas le taire. */
  | 'failed';

export interface OtherDevicesInput {
  /** `useSession().loading` — la restauration n'est pas une absence de compte. */
  sessionLoading: boolean;
  /** `useSession().configured` — un backend existe dans ce build. */
  configured: boolean;
  /** Une session RÉELLE est ouverte sur cet appareil. */
  signedIn: boolean;
  /** Une révocation est en vol. */
  busy: boolean;
  /** Issue de la DERNIÈRE tentative de cette session d'écran. */
  lastResult: 'none' | 'ok' | 'error';
}

/**
 * L'ordre des tests EST la logique, du plus établi au plus incertain :
 *
 *   1. on ne sait pas encore  → on ne dit rien de l'utilisateur ;
 *   2. pas de backend         → l'action est structurellement impossible ;
 *   3. pas de session         → rien à révoquer (et l'appel échouerait) ;
 *   4. en vol                 → une action est en cours ;
 *   5. issue de la tentative  → succès ou échec, jamais confondus ;
 *   6. sinon                  → l'action est offerte.
 *
 * `sessionLoading` PRIME sur tout : c'est la fenêtre où `signedIn` vaut faux
 * sans que cela veuille dire « pas de compte » — le piège déjà corrigé sur
 * l'identité de cette même sous-page.
 */
export function otherDevicesState(input: OtherDevicesInput): OtherDevicesState {
  if (input.sessionLoading) return 'unknown';
  if (!input.configured) return 'noBackend';
  if (!input.signedIn) return 'signedOut';
  if (input.busy) return 'busy';
  if (input.lastResult === 'error') return 'failed';
  if (input.lastResult === 'ok') return 'done';
  return 'ready';
}

/**
 * La ligne est-elle PRESSABLE ? Un état qui n'est pas actionnable ne doit pas
 * porter de chevron ni de `onPress` : peindre une action qui échouerait à coup
 * sûr est la faute que la constitution nomme « bouton mort ».
 *
 * `done` reste pressable : révoquer une deuxième fois est licite (un appareil a
 * pu se reconnecter entre-temps) et sans effet de bord dangereux.
 */
export function otherDevicesActionable(state: OtherDevicesState): boolean {
  return state === 'ready' || state === 'failed' || state === 'done';
}

/**
 * L'état mérite-t-il une ligne du tout ? `unknown` n'en mérite pas : mieux vaut
 * une ligne qui apparaît dès qu'on sait qu'une affirmation prématurée.
 */
export function otherDevicesVisible(state: OtherDevicesState): boolean {
  return state !== 'unknown';
}
