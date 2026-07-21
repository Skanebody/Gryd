/**
 * GRYD — MISSION-FIRST, mission RÉELLE (variante WEB).
 *
 * CE FICHIER N'EST PLUS UN STUB (21/07/2026). Il renvoyait `{ mission: null,
 * loading: false }` en dur : sur localhost, la mission dynamique n'existait pas,
 * et le fondateur — dont localhost est le seul instrument de contrôle tant que
 * les builds EAS sont bloqués — voyait un état vide là où l'iPhone affiche une
 * vraie mission. Une donnée figée qui contredit le natif est un mensonge sur le
 * produit, même si aucun chiffre n'est fabriqué.
 *
 * La raison d'être du stub — ne pas tirer `run/gps/provider` (expo-location /
 * expo-task-manager) dans le bundle du navigateur — est désormais couverte par
 * `features/map/webGeolocation.ts` : même signature, `navigator.geolocation`
 * réel, AUCUNE position de repli (refus ou capteur muet → `null`, jamais une
 * position inventée). Le web branche donc le MÊME cœur que le natif, avec la
 * seule chose qui doit différer : la façon de lire la position.
 */
import { getCurrentPositionOnce } from '../map/webGeolocation';
import { useRealMissionCore } from './useRealMissionCore';

export type { UseRealMissionResult } from './useRealMissionCore';

export function useRealMission() {
  return useRealMissionCore(getCurrentPositionOnce);
}
