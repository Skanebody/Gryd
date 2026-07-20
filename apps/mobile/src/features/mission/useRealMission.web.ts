/**
 * GRYD — useRealMission (WEB) : stub vitrine.
 * La mission RÉELLE n'existe que sur appareil natif (vraies captures + GPS) ;
 * la vitrine web garde sa mission DÉMO (index.tsx, branche showcase). Aucun
 * import natif (provider.ts → expo-location / expo-task-manager) ne doit entrer
 * dans le bundle web — ce stub coupe tout, comme useRealRun.web.ts.
 */
import type { UseRealMissionResult } from './useRealMission';

export function useRealMission(): UseRealMissionResult {
  return { mission: null, loading: false };
}
