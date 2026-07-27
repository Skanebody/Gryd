/**
 * GRYD — E08, lecture de la position : LE VERSANT WEB (voir `location.ts`).
 *
 * Même surface, même honnêteté, autre capteur : `navigator.geolocation` au lieu
 * d'`expo-location`. Rien n'est fabriqué ici non plus — pas de position de
 * repli, pas de ville par défaut.
 *
 * ⚠️ LIMITE RÉELLE DU NAVIGATEUR, DITE PLUTÔT QUE CONTOURNÉE. Safari n'expose
 * pas l'état de la permission de géolocalisation : `checkForegroundPermission`
 * y répond TOUJOURS `undetermined`, même après une autorisation accordée
 * (`webGeolocation.ts` le documente et fournit `hasProvenGrant` /
 * `isPermissionStateReadable` pour les surfaces qui veulent insister).
 *
 * Conséquence assumée sur E08 : là où l'état n'est pas lisible, l'écran ne
 * propose PAS de ville — le champ reste vide et le dit (`cityUnknown`), le
 * joueur choisit. C'est un confort en moins, pas un mensonge. L'alternative
 * serait de TENTER la position sans savoir, ce qui déclencherait l'invite du
 * navigateur à l'arrivée sur l'écran : précisément la demande surprise que ce
 * parcours refuse (elle appartient à E05 et au premier GO).
 */
export {
  checkForegroundPermission,
  getCurrentPositionOnce,
} from '../map/webGeolocation';
