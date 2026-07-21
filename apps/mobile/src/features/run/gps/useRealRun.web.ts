/**
 * GRYD — useRealRun (NAVIGATEUR) : la course réelle sur localhost.
 *
 * CE FICHIER N'EST PLUS UN STUB (21/07/2026). Il renvoyait
 * `{ kind: 'simulation' }` en dur. Depuis l'abandon du mode vitrine, plus
 * aucun écran ne rend de course simulée : `course-live.tsx` tombait donc sur
 * « rien à enregistrer ici » À TOUS LES COUPS. La boucle centrale du produit —
 * GO → course-live → course-result → /partage — était injouable sur le seul
 * instrument de contrôle du fondateur tant que les builds EAS sont bloqués.
 *
 * La raison d'être du stub — ne pas tirer `./provider` (expo-location /
 * expo-task-manager) dans le bundle du navigateur — reste entièrement
 * respectée : ce module n'importe que `./webRunProvider`, qui ne touche que
 * `navigator.geolocation`. Le cœur (`useRealRunCore`) est le MÊME code que sur
 * iPhone.
 *
 * Ce n'est PAS un retour de la simulation. Les positions viennent du capteur
 * réel de la machine ; sans position, il n'y a pas de course et l'écran dit
 * laquelle des quatre raisons s'applique. La seule chose qui change par rapport
 * à l'iPhone est ce que la plateforme sait faire — pas d'arrière-plan, pas de
 * réglages système — et cela s'affiche au lieu d'être caché.
 */
import { useMemo } from 'react';
import type { LiveRunMode } from '../simulation';
import type { RealRunGate } from './gateTypes';
import { useRealRunCore } from './useRealRunCore';
import { WEB_RUN_ADAPTER } from './webRunProvider';

export function useRealRun(mode: LiveRunMode): RealRunGate {
  // L'adaptateur est un singleton de module : `useMemo` documente la stabilité
  // attendue par les effets du cœur (aucune re-souscription intempestive).
  const adapter = useMemo(() => WEB_RUN_ADAPTER, []);
  return useRealRunCore(mode, adapter);
}
