/**
 * GRYD — câblage React de la garde « aucun achat pendant une course » (E17).
 *
 * Lecture SEULE de `runStore` (AsyncStorage) : la boutique n'ouvre aucun capteur
 * et ne touche jamais au buffer de course. La règle de fraîcheur vit dans
 * `runGuard.ts` (pure + testée) ; ici uniquement l'accès au stockage, l'état de
 * chargement et la relecture au retour de l'app au premier plan (revenir d'une
 * course ne doit pas laisser l'écran sur une conclusion périmée).
 *
 * TROIS ÉTATS, pas deux : tant que la lecture n'a pas abouti, `loading` vaut
 * true et l'écran n'affirme NI « tu cours » NI « tu ne cours pas ».
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Activity } from '@klaim/shared';
import { loadActiveRun, loadCurrentRun } from '../../lib/runStore';
import { parseActivity } from '../../ui/activityLens';
import { isRunLive, probeFromStoredRun } from './runGuard';

export interface RunInProgressState {
  /** Une sortie est réellement en cours (buffer écrit il y a peu). */
  running: boolean;
  /** La lecture du stockage n'a pas encore abouti. */
  loading: boolean;
  /**
   * DISCIPLINE DÉCLARÉE de la sortie en cours (E14, ajouté le 26/07/2026).
   *
   * POURQUOI CE CHAMP EXISTE. Le commutateur Run/Bike met la préférence de
   * l'écran EN VEILLE pendant une sortie et montre le monde de CETTE sortie
   * (`ui/activityLens.ts` → `effectiveActivity`) — sinon un joueur resté en Bike
   * regarderait le mauvais monde sans commutateur pour en sortir. Tant que le
   * vélo n'existait pas, l'appelant pouvait poser « run » en dur : c'était vrai.
   * Depuis que le vélo enregistre, cette constante mentirait à un cycliste. On
   * remonte donc la discipline RÉELLEMENT persistée au départ.
   *
   * `null` = on ne sait pas : aucune sortie en cours, buffer écrit AVANT
   * l'arrivée du champ (`StoredRun.activity` est optionnel), ou valeur illisible.
   * Ne JAMAIS y substituer un défaut ici — l'appelant retombe alors sur la
   * préférence de l'utilisateur, ce qui est un fait, pas une supposition.
   */
  activity: Activity | null;
}

export function useRunInProgress(): RunInProgressState {
  const [state, setState] = useState<RunInProgressState>({
    running: false,
    loading: true,
    activity: null,
  });

  useEffect(() => {
    let alive = true;

    const read = async (): Promise<void> => {
      try {
        const [active, current] = await Promise.all([loadActiveRun(), loadCurrentRun()]);
        if (!alive) return;
        const now = Date.now();
        // Deux buffers cohabitent quand une reprise est en attente. On ne se
        // contente plus d'un booléen « au moins un est vivant » : on retient LE
        // buffer vivant, parce que c'est lui qui porte la discipline. `current`
        // (la sortie du moment) prime sur `active` (la reprise en attente).
        const live =
          [current, active].find((run) => isRunLive(probeFromStoredRun(run), now)) ?? null;
        setState({
          running: live !== null,
          loading: false,
          // Lecture DÉFENSIVE : une valeur inconnue rend `null` (pas de repli
          // silencieux sur la course à pied).
          activity: live ? parseActivity(live.activity ?? null) : null,
        });
      } catch {
        // Stockage illisible : on ne BLOQUE pas la boutique sur une lecture
        // ratée (conclure « tu cours » sur une erreur serait affirmer sans
        // savoir). On sort simplement du chargement.
        if (alive) setState({ running: false, loading: false, activity: null });
      }
    };

    void read();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void read();
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return state;
}
