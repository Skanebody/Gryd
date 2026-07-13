/**
 * GRYD — micro-store d'UI carte (hors état de jeu). Un unique drapeau « une
 * sheet de ZONE est ouverte » partagé entre DEUX sous-arbres disjoints : la
 * carte (BattleMapOverlays, sous l'onglet Carte) qui l'écrit, et la barre de
 * navigation persistante (GrydNavBar, dans le layout tabs) qui le lit.
 *
 * Raison d'être (Règles §A.4 — « 1 seul CTA chartreuse PLEIN par scène ») :
 * quand la sheet de zone affiche son CTA chartreuse plein « Défendre la zone »,
 * le bouton d'action central de la nav doit passer en variante CONTOUR (comme
 * il le fait déjà sur /warroom) pour ne pas exposer DEUX CTA chartreuse pleins.
 *
 * External store minimal (useSyncExternalStore) — pur état de présentation,
 * aucune règle de jeu, aucune persistance.
 */
import { useSyncExternalStore } from 'react';

let zoneSheetOpen = false;
const listeners = new Set<() => void>();

/** Écrit le drapeau ; n'émet QUE sur changement réel (évite les re-renders inutiles). */
export function setZoneSheetOpen(open: boolean): void {
  if (zoneSheetOpen === open) return;
  zoneSheetOpen = open;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return zoneSheetOpen;
}

/** Vrai si une sheet de zone est actuellement ouverte sur la carte. */
export function useZoneSheetOpen(): boolean {
  // getServerSnapshot = getSnapshot : cohérent en preview web (pas d'hydratation
  // divergente) — la valeur initiale est déterministe (false).
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
