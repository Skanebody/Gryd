/**
 * GRYD — MISSION-FIRST, mission RÉELLE (variante NATIVE).
 *
 * « À chaque ouverture, GRYD répond : où dois-je courir maintenant ? » — mais
 * JAMAIS en inventant. Toute la logique vit dans `useRealMissionCore` (partagée
 * avec le web depuis le 21/07/2026) ; ce fichier n'apporte QUE la source de
 * position native, `getCurrentPositionOnce` de `run/gps/provider` (expo-location
 * / expo-task-manager). C'est le seul import à ne pas devoir entrer dans le
 * bundle web — d'où la variante `useRealMission.web.ts`, qui branche le même
 * cœur sur `navigator.geolocation`. Le COMPORTEMENT est identique sur les deux
 * surfaces : c'est ce qui rend localhost fidèle à l'iPhone.
 */
import { getCurrentPositionOnce } from '../run/gps/provider';
import { useRealMissionCore } from './useRealMissionCore';

export type { UseRealMissionResult } from './useRealMissionCore';

export function useRealMission() {
  return useRealMissionCore(getCurrentPositionOnce);
}
