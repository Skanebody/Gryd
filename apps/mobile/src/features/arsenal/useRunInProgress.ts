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
import { loadActiveRun, loadCurrentRun } from '../../lib/runStore';
import { anyRunLive, probeFromStoredRun } from './runGuard';

export interface RunInProgressState {
  /** Une course est réellement en cours (buffer écrit il y a peu). */
  running: boolean;
  /** La lecture du stockage n'a pas encore abouti. */
  loading: boolean;
}

export function useRunInProgress(): RunInProgressState {
  const [state, setState] = useState<RunInProgressState>({ running: false, loading: true });

  useEffect(() => {
    let alive = true;

    const read = async (): Promise<void> => {
      try {
        const [active, current] = await Promise.all([loadActiveRun(), loadCurrentRun()]);
        if (!alive) return;
        const running = anyRunLive(
          [probeFromStoredRun(active), probeFromStoredRun(current)],
          Date.now(),
        );
        setState({ running, loading: false });
      } catch {
        // Stockage illisible : on ne BLOQUE pas la boutique sur une lecture
        // ratée (conclure « tu cours » sur une erreur serait affirmer sans
        // savoir). On sort simplement du chargement.
        if (alive) setState({ running: false, loading: false });
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
