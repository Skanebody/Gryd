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

// ─── « Carte nue » : masquer TOUT le HUD (demande fondateur) ──────────────────
//
// Un drapeau « le HUD de la carte est masqué » partagé entre les DEUX sous-arbres
// qui composent l'écran Carte : la ligne mission/secteur/rival du HAUT (index.tsx
// `MissionLine`) et le BAS + les FABs (BattleMapOverlays). Un tap sur l'unique FAB
// « info » bascule ce drapeau → carte plein écran ; re-tap = tout revient. Remis à
// false à chaque entrée sur l'onglet Carte (même règle « repart de la carte » que
// le peek/zone). Pur état de présentation — aucune règle de jeu, aucune persistance.

let hudHidden = false;
const hudListeners = new Set<() => void>();

/** Bascule/masque le HUD de la carte ; n'émet QUE sur changement réel. */
export function setMapHudHidden(hidden: boolean): void {
  if (hudHidden === hidden) return;
  hudHidden = hidden;
  for (const listener of hudListeners) listener();
}

function subscribeHud(listener: () => void): () => void {
  hudListeners.add(listener);
  return () => {
    hudListeners.delete(listener);
  };
}

function getHudSnapshot(): boolean {
  return hudHidden;
}

/** Vrai si l'utilisateur a masqué le HUD (mode « carte nue » plein écran). */
export function useMapHudHidden(): boolean {
  return useSyncExternalStore(subscribeHud, getHudSnapshot, getHudSnapshot);
}
