/**
 * GRYD — la cloche du header carte, côté React. Trois lignes de colle, et rien
 * d'autre : la DÉCISION (« existe-t-elle ? que compte-t-elle ? ») vit dans
 * `bell.ts`, pur et testé ; la LECTURE vit dans `useActivityEvents`.
 *
 * ─── LA SEULE CHOSE QUE CE FICHIER AJOUTE : UNE HORLOGE HONNÊTE ─────────────
 * `bellState` est exact à l'instant où on l'appelle. Sans réveil, un écran qui
 * ne se redessine pas garderait une cloche allumée après la fermeture de la
 * dernière fenêtre de défense — et un compte périmé est un compte FAUX. On
 * programme donc UN réveil, à la plus proche échéance encore à venir
 * (`nextExpiryMs`) : pas de minuterie qui tourne à vide le reste du temps, pas
 * de rafraîchissement à la seconde, et le compte redevient exact PILE quand la
 * réalité change.
 *
 * `+1 s` de marge sur le réveil : un `setTimeout` peut tirer une poignée de
 * millisecondes AVANT l'instant visé (arrondis de la plateforme). Sans marge, le
 * recalcul retomberait sur « pas encore expiré » et reprogrammerait le même
 * réveil en boucle serrée.
 *
 * `MAX_TIMEOUT_MS` : au-delà de 2^31−1 ms, `setTimeout` déborde en 32 bits et
 * tire IMMÉDIATEMENT, ce qui bouclerait. Aucune fenêtre de défense n'approche
 * 24 jours (§9.2 : 18 à 36 h), mais un garde-fou qui coûte une ligne vaut mieux
 * qu'une boucle à découvrir en production. Au-delà, on ne programme rien : le
 * prochain rendu naturel de l'écran suffira largement.
 */
import { useEffect, useState } from 'react';
import { bellState, nextExpiryMs, type BellState } from './bell';
import { useActivityEvents } from './useActivityEvents';

/** Plafond de `setTimeout` (2^31−1 ms ≈ 24,8 j) : au-delà, il déborde. */
const MAX_TIMEOUT_MS = 2_147_483_647;

export function useActivityBell(): BellState {
  const { status, events } = useActivityEvents();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const next = nextExpiryMs(events, nowMs);
    if (next === null) return;
    const delay = Math.max(0, next - Date.now()) + 1000;
    if (delay > MAX_TIMEOUT_MS) return;
    const id = setTimeout(() => setNowMs(Date.now()), delay);
    return () => clearTimeout(id);
  }, [events, nowMs]);

  return bellState({ status, events, nowMs });
}
