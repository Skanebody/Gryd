/**
 * GRYD — SÉRIE LOCALE : la série (§3.4) dérivée du JOURNAL de courses de CET
 * appareil (features/run/runJournal), via le MÊME moteur partagé `computeStreak`
 * que la série serveur — aucune règle dupliquée.
 *
 * POURQUOI. `useMyStreak` dérive la série des courses côté SERVEUR : elle est donc
 * VIDE hors-ligne et avant O1. Ce hook donne un filet LOCAL pour que l'écran de
 * résultat montre une série honnête même sans verdict serveur. Autorité : dès que
 * le serveur a jugé (il agrège tous les appareils), c'est SA série qui prime —
 * l'appelant n'utilise le local QUE lorsqu'il n'y a AUCUN verdict serveur.
 *
 * HONNÊTE : `status:'none'` (série non réellement gagnée) → `null` ⇒ l'UI n'affiche
 * RIEN, jamais un « 0 » ni une série inventée.
 */
import { useEffect, useState } from 'react';
import { computeStreak, type StreakState } from '@klaim/shared';
import { readRunJournal } from '../run/runJournal';

export function useLocalStreak(): StreakState | null {
  const [state, setState] = useState<StreakState | null>(null);
  useEffect(() => {
    let alive = true;
    void readRunJournal().then((ms) => {
      if (!alive) return;
      const computed = computeStreak({
        runStartedAt: ms.map((t) => new Date(t)),
        now: new Date(),
      });
      setState(computed.status === 'none' ? null : computed);
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
