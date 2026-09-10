/**
 * GRYD : L'ACTION DE DÉPART, CALCULÉE UNE FOIS POUR TOUTES LES PAGES.
 *
 * Retour du fondateur, 10/09/2026, après test sur son iPhone : « le menu en bas
 * avec le bouton Courir doit être le même sur toutes les pages ». Il ne l'était
 * pas, et pas seulement à l'oeil : la Carte MONTAIT sa propre barre en lui
 * passant l'action (`GrydNavBar mapAction={{ ... }}`, MapHome.tsx), pendant que
 * le layout d'onglets en montait une AUTRE, sans action, pour Crew et Profil.
 * Le libellé, la cible et l'état d'attente vivaient donc dans un écran, hors
 * d'atteinte des deux autres.
 *
 * Ce hook est ce que la Carte savait, rendu disponible partout :
 *   . une sortie est en cours d'enregistrement  -> « Reprendre », vers /course-live ;
 *   . sinon, la lentille de la Carte décide      -> « Courir » ou « Rouler ».
 *
 * CE QU'IL NE CHANGE PAS, ET C'EST VOLONTAIRE : la chaîne de course. La cible
 * reste `/course-live?mode=conquete&activity=...`, exactement comme avant, et
 * l'événement `run_start_tap` est toujours émis, avec sa provenance réelle
 * (`source`) au lieu d'un « map » codé en dur, désormais faux deux fois sur
 * trois.
 *
 * `disabled` vaut TOUJOURS false, et ce n'est pas un oubli : une préférence de
 * confidentialité illisible avait déjà éteint « Courir » définitivement une
 * fois (cf. `liveChain2026.test.ts`). Un stockage en panne n'est pas une raison
 * d'interdire une sortie ; le préflight sait le dire et le réessayer.
 */
import { useCallback } from 'react';
import { router } from 'expo-router';
import type { Activity } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { useMapActivity } from '../map/mapPref';
import { useRecordingChoice2026 } from '../refonte/useRecordingChoice2026';
import { useRunSession } from '../refonte/RunSession';
import { C } from '../../i18n/catalog/nav';
import { useT } from '../../i18n/store';

export interface RunAction2026 {
  /** Mot du bouton : Courir, Rouler ou Reprendre. Déjà traduit. */
  readonly label: string;
  readonly onPress: () => void;
  /** Jamais vrai : voir l'en-tête. Le champ existe pour que la barre le lise. */
  readonly disabled: boolean;
  /** Le choix de partage n'est pas encore lu : le bouton attend, il ne ment pas. */
  readonly busy: boolean;
  /** Une sortie tourne déjà (le bouton y ramène au lieu d'en lancer une autre). */
  readonly recording: boolean;
  readonly activity: Activity;
}

/**
 * PURE. Provenance analytique d'un départ, dérivée du chemin courant.
 * `MapHome` envoyait `source: 'map'` en dur ; la barre vit maintenant sur les
 * trois destinations, et une mesure qui dit « carte » depuis le Profil ne
 * mesure plus rien.
 */
export function runActionSource2026(pathname: string): string {
  if (pathname === '/') return 'map';
  if (pathname.startsWith('/crew')) return 'crew';
  if (pathname.startsWith('/profil')) return 'profile';
  return 'nav';
}

export function useRunAction2026(pathname: string): RunAction2026 {
  const t = useT();
  const { gate } = useRunSession();
  const { activity } = useMapActivity();
  const choice = useRecordingChoice2026();
  const recording = gate?.kind === 'real';
  const source = runActionSource2026(pathname);

  const onPress = useCallback(() => {
    // L6 : chaque événement de jeu se sent. Lancer ou reprendre une sortie en
    // est un.
    haptics.light();
    if (recording) {
      router.push('/course-live');
      return;
    }
    track(EVENTS.runStartTap, { source, activity });
    router.push(`/course-live?mode=conquete&activity=${activity}`);
  }, [recording, source, activity]);

  return {
    label: recording
      ? t(C.navActionReprendre)
      : activity === 'run'
        ? t(C.navActionCourir)
        : t(C.navActionRouler),
    onPress,
    disabled: false,
    busy: !recording && ((!choice.ready && !choice.failed) || choice.saving),
    recording,
    activity,
  };
}
