/**
 * GRYD — préférences d'AFFICHAGE de carte (aucune règle de jeu ici — pur réglage
 * d'affichage, zéro impact gameplay : le serveur décide toujours du claim).
 * Deux réglages, MÊME grammaire que le wrapper haptics (src/lib/haptics.ts) :
 * valeur en MÉMOIRE qui fait foi, lecture unique et LAZY au premier accès,
 * best-effort (stockage indisponible → défaut), abonnés re-rendus à chaque
 * bascule (les deux forks MapScreen — et toute surface de carte — partagent
 * l'état). Chaque réglage a sa propre clé AsyncStorage :
 *
 *   • FOND DE CARTE  (`gryd.basemap`, demande fondateur « la carte en couleur
 *     comme sur Plan d'iPhone ») — 'dark' (CARTO dark-matter, DÉFAUT) | 'color'
 *     (CARTO Voyager). Hook : `useBasemapStyle()`.
 *   • VUE 3D  (`gryd.map3d`, AMENDEMENT-26 « la 3D proposée sur TOUTES les
 *     cartes ») — bool, DÉFAUT false = 2D (aucune régression lisibilité/perf ;
 *     aucune carte ne bascule en 3D sans action utilisateur). true = GRYD 3D
 *     Conquest (carte pitchée + zones extrudées, AMENDEMENT-24). Hook :
 *     `useMap3d()`. La 3D est un CONFORT visuel — elle ne change jamais le
 *     calcul ni la décision serveur (anti pay-to-win).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAP_BASEMAP_STYLES, type BasemapKey } from './mapStyle';

/** Clé de persistance du réglage « Fond de carte ». */
const BASEMAP_STORAGE_KEY = 'gryd.basemap';
/** Défaut imposé : sombre (l'esthétique GRYD reste dark-first). */
const DEFAULT_BASEMAP: BasemapKey = 'dark';

/** Réglage en mémoire — fait foi dès le premier `setBasemap`. */
let current: BasemapKey = DEFAULT_BASEMAP;
/** Lecture unique et LAZY du réglage persisté (déclenchée au premier montage). */
let loadPromise: Promise<void> | null = null;
/** Abonnés (hooks montés) notifiés à chaque changement de valeur. */
const listeners = new Set<(value: BasemapKey) => void>();

/** Une valeur brute stockée est-elle une clé de fond connue ? */
function isBasemapKey(raw: string | null): raw is BasemapKey {
  return raw !== null && raw in MAP_BASEMAP_STYLES;
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(BASEMAP_STORAGE_KEY)
      .then((raw) => {
        if (isBasemapKey(raw) && raw !== current) {
          current = raw;
          for (const l of listeners) l(current);
        }
      })
      .catch(() => {
        // Best effort : stockage indisponible → défaut (sombre).
      });
  }
  return loadPromise;
}

/** Lit le réglage persisté (résout le défaut si absent/illisible). */
export async function getBasemap(): Promise<BasemapKey> {
  await ensureLoaded();
  return current;
}

/** Fixe le fond de carte, notifie les abonnés et persiste sous 'gryd.basemap'. */
export function setBasemap(value: BasemapKey): void {
  if (value === current) return;
  current = value;
  // La valeur en mémoire fait foi désormais — inutile de relire le stockage.
  loadPromise = Promise.resolve();
  for (const l of listeners) l(current);
  void AsyncStorage.setItem(BASEMAP_STORAGE_KEY, value).catch(() => {});
}

/**
 * Hook : fond de carte courant + setter + bascule dark↔color. La valeur
 * persistée est chargée LAZY au montage (le défaut sombre s'affiche d'abord,
 * puis la valeur stockée si différente) — jamais de flash au reload puisque le
 * défaut EST déjà le sombre.
 */
export function useBasemapStyle(): {
  basemap: BasemapKey;
  styleUrl: string;
  setBasemap: (value: BasemapKey) => void;
  toggle: () => void;
} {
  const [basemap, setLocal] = useState<BasemapKey>(current);

  useEffect(() => {
    const listener = (value: BasemapKey) => setLocal(value);
    listeners.add(listener);
    // Aligne l'état local si la valeur a bougé entre le rendu et l'effet.
    if (current !== basemap) setLocal(current);
    // Charge la valeur persistée (une seule fois, partagée).
    void ensureLoaded();
    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    basemap,
    styleUrl: MAP_BASEMAP_STYLES[basemap],
    setBasemap,
    toggle: () => setBasemap(current === 'dark' ? 'color' : 'dark'),
  };
}

// ─── Vue 3D (AMENDEMENT-26) ─────────────────────────────────────────────────
// MÊME mécanisme que le fond de carte ci-dessus (valeur mémoire qui fait foi,
// lecture LAZY unique, abonnés notifiés, persistance best-effort) — pour un
// booléen 2D/3D partagé par TOUTES les surfaces de carte. DÉFAUT false = 2D :
// aucune carte ne s'ouvre en 3D sans action utilisateur (non-régression totale
// lisibilité/perf). Pur affichage — zéro impact gameplay.

/** Clé de persistance du réglage « Vue 3D ». */
const MAP3D_STORAGE_KEY = 'gryd.map3d';
/** Défaut imposé : 2D (la 3D est un confort visuel opt-in, jamais par défaut). */
const DEFAULT_MAP3D = false;

/** Réglage 3D en mémoire — fait foi dès le premier `setMap3d`. */
let currentMap3d: boolean = DEFAULT_MAP3D;
/** Lecture unique et LAZY du réglage 3D persisté (au premier montage/accès). */
let map3dLoadPromise: Promise<void> | null = null;
/** Abonnés (hooks montés) notifiés à chaque bascule 2D↔3D. */
const map3dListeners = new Set<(value: boolean) => void>();

function ensureMap3dLoaded(): Promise<void> {
  if (!map3dLoadPromise) {
    map3dLoadPromise = AsyncStorage.getItem(MAP3D_STORAGE_KEY)
      .then((raw) => {
        // Persisté en 'true'/'false' (parité avec le wrapper haptics).
        if (raw !== null) {
          const value = raw === 'true';
          if (value !== currentMap3d) {
            currentMap3d = value;
            for (const l of map3dListeners) l(currentMap3d);
          }
        }
      })
      .catch(() => {
        // Best effort : stockage indisponible → défaut (2D).
      });
  }
  return map3dLoadPromise;
}

/** Lit le réglage 3D persisté (résout le défaut 2D si absent/illisible). */
export async function getMap3d(): Promise<boolean> {
  await ensureMap3dLoaded();
  return currentMap3d;
}

/** Fixe la vue (true = 3D), notifie les abonnés et persiste sous 'gryd.map3d'. */
export function setMap3d(value: boolean): void {
  if (value === currentMap3d) return;
  currentMap3d = value;
  // La valeur en mémoire fait foi désormais — inutile de relire le stockage.
  map3dLoadPromise = Promise.resolve();
  for (const l of map3dListeners) l(currentMap3d);
  void AsyncStorage.setItem(MAP3D_STORAGE_KEY, String(value)).catch(() => {});
}

/**
 * Hook : vue 2D/3D courante + setter + bascule. La valeur persistée est chargée
 * LAZY au montage (le défaut 2D s'affiche d'abord, puis la valeur stockée si
 * différente) — jamais de flash puisque le défaut EST déjà la 2D (comportement
 * historique de toutes les cartes). Partagé par toutes les surfaces : basculer
 * la vue sur la Battle Map la mémorise pour Course Live, Mon Territoire, etc.
 */
export function useMap3d(): {
  map3d: boolean;
  setMap3d: (value: boolean) => void;
  toggle: () => void;
} {
  const [map3d, setLocal] = useState<boolean>(currentMap3d);

  useEffect(() => {
    const listener = (value: boolean) => setLocal(value);
    map3dListeners.add(listener);
    // Aligne l'état local si la valeur a bougé entre le rendu et l'effet.
    if (currentMap3d !== map3d) setLocal(currentMap3d);
    // Charge la valeur persistée (une seule fois, partagée).
    void ensureMap3dLoaded();
    return () => {
      map3dListeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    map3d,
    setMap3d,
    toggle: () => setMap3d(!currentMap3d),
  };
}
