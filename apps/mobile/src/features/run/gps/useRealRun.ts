/**
 * GRYD — useRealRun (APPAREIL) : la course réelle sur iPhone/Android.
 *
 * Ce fichier ne contient plus que la SOURCE DE POSITION native (expo-location
 * + tâche background expo-task-manager). Toute l'orchestration — permission,
 * tracker, autosave, reprise après kill, envoi ingest_run, hors-ligne — vit
 * dans `useRealRunCore.ts`, partagée avec la variante navigateur : même cœur,
 * deux capteurs. La variante `.web.ts` branche `navigator.geolocation`.
 *
 * NB : ce module importe `./provider`, qui tire expo-location/expo-task-manager
 * — il ne doit JAMAIS entrer dans le bundle web. C'est la raison d'être de la
 * variante `.web.ts` (résolution par extension de plateforme, Metro).
 */
import { useMemo } from 'react';
import { EVENTS, track } from '../../../lib/analytics';
import { drainBackgroundFixes } from '../../../lib/runStore';
import type { LiveRunMode } from '../simulation';
import type { RealRunGate } from './gateTypes';
import type { AcquireResult, RunLocationAdapter } from './locationAdapter';
import {
  checkBackgroundGranted,
  checkForegroundPermission,
  hasLocationServices,
  openLocationSettings,
  requestBackgroundPermission,
  requestForegroundPermission,
  setBackgroundFixListener,
  startBackgroundUpdates,
  stopBackgroundUpdates,
  watchPosition,
} from './provider';
import { useRealRunCore } from './useRealRunCore';

/**
 * Permission foreground demandée AU PREMIER GO (AMENDEMENT-14). Deux échecs
 * distincts, deux phrases distinctes à l'écran : autorisation refusée (elle se
 * redonne dans les Réglages) ou localisation du téléphone coupée (c'est
 * l'interrupteur système qu'il faut rallumer).
 *
 * ─── ET C'EST BIEN LE PREMIER MOMENT, DEPUIS LE 21/07/2026 ──────────────────
 * Ça ne l'était pas : `MapScreen` demandait la permission AU MONTAGE, donc la
 * boîte système tombait à l'ouverture de l'onglet Carte, avant tout GO. La carte
 * ne fait plus que LIRE la permission à l'ouverture ; elle ne la DEMANDE que sur
 * geste (bouton Recentrer). Ce commentaire, l'entête de `onboarding/content.ts`
 * et la copie `learnNote` (« le GPS s'allume au départ ») disent donc enfin la
 * même chose que le code.
 *
 * ─── CE QUE ÇA CHANGE POUR LE FUNNEL §8 (`permission_location`) ─────────────
 * L'event n'a plus aucun émetteur « déclaratif ». La valeur
 * `result: 'onboarding_accept'` a disparu avec l'écran `permission` de
 * l'onboarding (supprimé le 21/07/2026) : elle comptait des joueurs qui avaient
 * tapé « OK » sur un écran PÉDAGOGIQUE, sans qu'aucune permission n'ait été
 * demandée — un consentement affiché, pas obtenu. Vérifié le 21/07/2026 :
 * `onboarding_accept` n'apparaît plus nulle part dans le dépôt (aucune requête,
 * aucun tableau de bord versionné, aucune doc). Les seules valeurs émises
 * aujourd'hui sont de VRAIES réponses de l'OS :
 *   • foreground (ici + `webRunProvider`) : 'granted' | 'denied' | 'undetermined' ;
 *   • background (`useRealRunCore`)       : 'background_granted' | 'background_denied'.
 * Conséquence à assumer côté pilote : la marche « permission » de l'entonnoir
 * chute mécaniquement (elle était gonflée par l'accord déclaratif) et se décale
 * dans le temps (au 1er GO, plus à l'onboarding). Une comparaison avant/après le
 * 21/07/2026 sur cet event n'a PAS de sens — comparer les cohortes postérieures.
 */
async function acquireNative(): Promise<AcquireResult> {
  let perm = await checkForegroundPermission();
  if (perm.status !== 'granted') {
    perm = await requestForegroundPermission();
    track(EVENTS.permissionLocation, { result: perm.status });
  }
  if (perm.status !== 'granted') return { ok: false, reason: 'denied' };
  if (!(await hasLocationServices())) return { ok: false, reason: 'services-off' };
  return { ok: true };
}

/** La source de position de l'appareil : le seul capteur qui sait tout faire. */
const NATIVE_ADAPTER: RunLocationAdapter = {
  platform: 'device',
  acquire: acquireNative,
  // Natif : l'OS répond de façon fiable — un « pas accordé » EST un retrait.
  isStillGranted: async () => (await checkForegroundPermission()).status === 'granted',
  watchPosition,
  openSettings: openLocationSettings,
  background: {
    checkGranted: checkBackgroundGranted,
    request: requestBackgroundPermission,
    setFixListener: setBackgroundFixListener,
    start: startBackgroundUpdates,
    stop: stopBackgroundUpdates,
    drainQueuedFixes: drainBackgroundFixes,
  },
};

export function useRealRun(mode: LiveRunMode): RealRunGate {
  // L'adaptateur est un singleton de module : `useMemo` documente la stabilité
  // attendue par les effets du cœur (aucune re-souscription intempestive).
  const adapter = useMemo(() => NATIVE_ADAPTER, []);
  return useRealRunCore(mode, adapter);
}
