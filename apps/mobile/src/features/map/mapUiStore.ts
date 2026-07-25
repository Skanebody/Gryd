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

// ─── Géométrie de la sheet ancrée (planche E02) ──────────────────────────────
//
// TROISIÈME drapeau, et pour la même raison que les deux premiers : la sheet et
// les surfaces qui doivent l'éviter vivent dans des SOUS-ARBRES DISJOINTS.
//   • le bouton GO (app/(tabs)/index.tsx) est un frère de <MapScreen/> : il doit
//     savoir si la sheet est déployée pour passer de la PILL au ROND (E02) ;
//   • l'attribution légale (© OpenStreetMap / © Esri) et la note d'état de la
//     carte vivent dans MapScreen : depuis que la sheet est COLLÉE au bas, leur
//     ancrage historique (RUN_BUTTON_BOTTOM) tombe DERRIÈRE elle. Elles se
//     recalent donc au-dessus du peek — l'attribution est une obligation légale,
//     elle ne doit jamais finir masquée.
//
// PIÈGE ÉVITÉ (caméra MapLibre) : on publie UNIQUEMENT au SNAP, jamais la
// position du doigt image par image. Publier une hauteur par frame re-rendrait
// MapScreen 60 fois par seconde → le binding de caméra se ré-appliquerait
// par-dessus le geste (« le zoom revient en arrière », retour terrain 20/07).

export interface MapSheetLayout {
  /** Une sheet du bas est-elle montée ? (false ⇒ les px décrivent le bord de nav) */
  visible: boolean;
  /** La sheet est-elle au-delà du palier compact ? (pilote le morph de GO) */
  expanded: boolean;
  /** Distance px entre le BAS DE L'ÉCRAN et le HAUT de la sheet, palier COURANT. */
  topPx: number;
  /** Idem au palier COMPACT — ancre STABLE (attribution, note d'état). */
  peekTopPx: number;
}

const EMPTY_SHEET_LAYOUT: MapSheetLayout = {
  visible: false,
  expanded: false,
  topPx: 0,
  peekTopPx: 0,
};

/** Instantané STABLE par référence : useSyncExternalStore l'exige (sinon boucle). */
let sheetLayout: MapSheetLayout = EMPTY_SHEET_LAYOUT;
const sheetLayoutListeners = new Set<() => void>();

/** Publie la géométrie de la sheet ; n'émet QUE sur changement réel de valeur. */
export function setMapSheetLayout(next: MapSheetLayout): void {
  if (
    sheetLayout.visible === next.visible &&
    sheetLayout.expanded === next.expanded &&
    sheetLayout.topPx === next.topPx &&
    sheetLayout.peekTopPx === next.peekTopPx
  ) {
    return;
  }
  sheetLayout = next;
  for (const listener of sheetLayoutListeners) listener();
}

/** Remet la géométrie à zéro (démontage de la carte / bascule d'onglet). */
export function clearMapSheetLayout(): void {
  setMapSheetLayout(EMPTY_SHEET_LAYOUT);
}

function subscribeSheetLayout(listener: () => void): () => void {
  sheetLayoutListeners.add(listener);
  return () => {
    sheetLayoutListeners.delete(listener);
  };
}

function getSheetLayoutSnapshot(): MapSheetLayout {
  return sheetLayout;
}

/** Géométrie courante de la sheet ancrée de la Carte. */
export function useMapSheetLayout(): MapSheetLayout {
  return useSyncExternalStore(
    subscribeSheetLayout,
    getSheetLayoutSnapshot,
    getSheetLayoutSnapshot,
  );
}
