/**
 * Émet un effet UNE fois par valeur d'état (spec widget : « ne tracke pas
 * chaque rafraîchissement automatique comme une vue utilisateur »). Un état
 * null n'émet rien ; revenir à un état déjà vu dans la même session n'émet pas.
 */
import { useEffect, useRef } from 'react';

export function useEffectOncePerState<S extends string>(
  state: S | null,
  effect: (state: S) => void,
): void {
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (state === null || seenRef.current.has(state)) return;
    seenRef.current.add(state);
    effect(state);
    // `effect` volontairement hors deps : on ne ré-émet pas sur changement de closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
