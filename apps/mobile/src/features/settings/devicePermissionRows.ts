/**
 * GRYD — RÉGLAGES › AUTORISATIONS DE L'APPAREIL : la logique PURE de la page.
 *
 * Une seule question, et elle est plus subtile qu'elle n'en a l'air : QUEL
 * BOUTON une ligne d'autorisation a-t-elle le droit de peindre ?
 *
 * ─── POURQUOI CETTE PAGE NE DEMANDE AUCUNE PERMISSION ───────────────────────
 * `features/setup/permissionSensors.ts` porte la règle du dépôt, en tête de
 * fichier : « chaque permission est demandée au moment de son bénéfice », et il
 * documente ce que sa violation a déjà coûté (une permission de notification
 * demandée à froid, refusée une fois, et iOS ne la repropose jamais). Une page
 * de Réglages n'est le moment du bénéfice d'AUCUNE permission : personne n'y
 * prend une photo ni n'y démarre une course.
 *
 * Cette page LIT donc, et son unique action est d'ouvrir les réglages du
 * système — ce que G27 demande en toutes lettres : « ouvrir les réglages du
 * système lorsque le changement s'effectue là-bas ».
 *
 * ─── LE PIÈGE : « OUVRIR LES RÉGLAGES » N'EST PAS TOUJOURS UNE ACTION ───────
 * Sur iOS, la ligne d'une app n'apparaît dans Réglages › GRYD qu'APRÈS que
 * l'app a demandé la permission au moins une fois. Tant que l'état est
 * `undetermined`, envoyer quelqu'un là-bas l'envoie devant un écran où il n'y a
 * rien à changer : un bouton qui n'échoue pas franchement, mais qui ne tient
 * pas sa promesse — la pire espèce, parce qu'elle fait douter l'utilisateur de
 * lui-même. On ne peint donc le bouton que pour les trois états où l'OS a
 * VRAIMENT une entrée à montrer : accordé (on peut retirer), refusé, bloqué.
 *
 * `unavailable` couvre les deux « on ne sait pas » du dépôt (capteur absent,
 * interrogation qui a levé) : aucun bouton, et la ligne le dit.
 */
import type { PermissionCardState, PermissionProbe } from '../setup/permissionCards';

/**
 * Lecture d'UNE permission système, sans dialogue. `null` = l'interrogation a
 * échoué ou levé, et ce n'est PAS un refus : la page dira « impossible à lire »
 * plutôt que d'accuser l'OS d'un non qu'il n'a pas dit.
 *
 * Le contrat vit dans le module PUR — et non dans `devicePermissionSensors.ts` —
 * pour que la variante web puisse le référencer sans importer son jumeau natif
 * (donc sans traîner expo-location dans un bundle navigateur). C'est exactement
 * la raison pour laquelle `PermissionSensor` vit dans `permissionCards.ts`.
 */
export type DevicePermissionProbe = () => Promise<PermissionProbe | null>;

/** Ce qu'une ligne d'autorisation a le droit d'afficher sous son état. */
export type DevicePermissionAction = 'none' | 'open_settings';

/**
 * Le bouton de la ligne. `checking` et `undetermined` n'en peignent aucun (voir
 * le piège ci-dessus) ; `asking` non plus — cette page ne demande rien, l'état
 * ne peut pas survenir ici, et le traiter comme actionnable serait accepter un
 * jour un « Autoriser » qu'on a refusé d'écrire.
 */
export function devicePermissionAction(state: PermissionCardState): DevicePermissionAction {
  switch (state) {
    case 'granted':
    case 'denied':
    case 'blocked':
      return 'open_settings';
    case 'checking':
    case 'undetermined':
    case 'asking':
    case 'unavailable':
      return 'none';
  }
}

/**
 * Les quatre familles d'états que la page doit distinguer SANS jamais les
 * confondre (L8/L14/L19) — c'est ce qui décide de la phrase affichée :
 *   · `reading`  — on n'affirme rien, on lit ;
 *   · `granted`  — l'OS a dit oui ;
 *   · `refused`  — l'OS a dit non (refusé ou définitivement bloqué) ;
 *   · `pending`  — GRYD ne l'a pas encore demandée : ni oui, ni non ;
 *   · `unknown`  — on ne peut pas savoir sur cet appareil.
 * `denied` et `blocked` partagent la même famille parce qu'ils appellent la même
 * PHRASE et le même geste ; ils gardent des états distincts en amont parce
 * qu'ils n'ont pas la même cause, et `cardState` les sépare déjà.
 */
export type DevicePermissionTone = 'reading' | 'granted' | 'refused' | 'pending' | 'unknown';

export function devicePermissionTone(state: PermissionCardState): DevicePermissionTone {
  switch (state) {
    case 'checking':
    case 'asking':
      return 'reading';
    case 'granted':
      return 'granted';
    case 'denied':
    case 'blocked':
      return 'refused';
    case 'undetermined':
      return 'pending';
    case 'unavailable':
      return 'unknown';
  }
}

/**
 * Un bouton « Ouvrir les Réglages » ne se peint que si la plateforme sait
 * VRAIMENT ouvrir des réglages : sur le web, `Linking.openSettings` n'existe
 * pas (`permissionSensors.web.ts` sert `OPEN_APP_SETTINGS = null`). Sans cette
 * deuxième condition, la page rendrait un bouton mort sur toute la preview web.
 */
export function showsOpenSettings(
  state: PermissionCardState,
  canOpenSettings: boolean,
): boolean {
  return canOpenSettings && devicePermissionAction(state) === 'open_settings';
}
