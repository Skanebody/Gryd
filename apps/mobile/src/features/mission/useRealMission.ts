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
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { getCurrentPositionOnce } from '../run/gps/provider';
import { useRealMissionCore } from './useRealMissionCore';

export type { UseRealMissionResult } from './useRealMissionCore';

/**
 * `activity` — LA LENTILLE (E14). Le cœur borne sa lecture de `hex_claims` à
 * cette discipline (clé primaire composite depuis 0070) : une mission vélo ne
 * peut donc pas apparaître dans la lentille course, ni l'inverse. Omise ⇒
 * `DEFAULT_ACTIVITY`, c'est-à-dire le comportement d'avant le vélo pour les
 * surfaces qui n'ont pas de commutateur.
 */
export function useRealMission(activity: Activity = DEFAULT_ACTIVITY) {
  return useRealMissionCore(getCurrentPositionOnce, activity);
}
