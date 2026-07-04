/**
 * GRYD — useRealRun (WEB) : stub simulation (AMENDEMENT-15 §0).
 * Le GPS réel n'existe que sur appareil natif ; le preview web garde la
 * simulation démo INCHANGÉE. Aucun import natif (expo-location,
 * expo-task-manager) ne doit entrer dans le bundle web — ce stub coupe tout.
 */
import type { LiveRunMode } from '../simulation';
import type { RealRunGate } from './gateTypes';

export function useRealRun(_mode: LiveRunMode): RealRunGate {
  return { kind: 'simulation', notice: null };
}
