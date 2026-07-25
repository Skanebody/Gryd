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
 *     (CARTO Voyager) | 'satellite' (photos aériennes Esri, AMENDEMENT-28). Hook :
 *     `useBasemapStyle()` ; `toggle()` cycle les trois, `toggle(key)` fixe une valeur.
 *   • VUE 3D  (`gryd.map3d`, AMENDEMENT-26 « la 3D proposée sur TOUTES les
 *     cartes ») — bool, DÉFAUT false = 2D (aucune régression lisibilité/perf ;
 *     aucune carte ne bascule en 3D sans action utilisateur). true = GRYD 3D
 *     Conquest (carte pitchée + zones extrudées, AMENDEMENT-24). Hook :
 *     `useMap3d()`. La 3D est un CONFORT visuel — elle ne change jamais le
 *     calcul ni la décision serveur (anti pay-to-win).
 *   • ACTIVITÉ DE LA CARTE  (`gryd.mapactivity`, planche E14 « commutateur
 *     Run / Bike ») — 'run' (DÉFAUT) | 'bike'. Hook : `useMapActivity()`.
 *     « Choix mémorisé » (planche). Ce réglage n'affirme RIEN sur le joueur : il
 *     choisit la LENTILLE de la carte, et l'univers Bike est aujourd'hui
 *     honnêtement vide (cf. le commentaire de `flags.bike`).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASEMAP_KEYS, MAP_BASEMAP_STYLES, type BasemapKey } from './mapStyle';

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

/** Une valeur brute stockée est-elle une clé de fond connue (dark|color|satellite) ? */
function isBasemapKey(raw: string | null): raw is BasemapKey {
  return raw !== null && (BASEMAP_KEYS as readonly string[]).includes(raw);
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

/** Fond suivant dans le cycle dark → color → satellite → dark (AMENDEMENT-28). */
function nextBasemap(value: BasemapKey): BasemapKey {
  const i = BASEMAP_KEYS.indexOf(value);
  return BASEMAP_KEYS[(i + 1) % BASEMAP_KEYS.length] ?? DEFAULT_BASEMAP;
}

/**
 * Hook : fond de carte courant + setter + `toggle`. La valeur persistée est
 * chargée LAZY au montage (le défaut sombre s'affiche d'abord, puis la valeur
 * stockée si différente) — jamais de flash au reload puisque le défaut EST déjà
 * le sombre. `toggle()` sans argument cycle les trois fonds (dark → color →
 * satellite → dark) ; `toggle(key)` fixe une valeur précise (le menu Calques
 * propose ainsi 3 options explicites — AMENDEMENT-28). `styleUrl` (héritage,
 * inutilisé hors du hook) retombe sur le sombre pour `satellite` (raster sans
 * styleURL — les forks RealMap le résolvent eux-mêmes).
 */
export function useBasemapStyle(): {
  basemap: BasemapKey;
  styleUrl: string;
  setBasemap: (value: BasemapKey) => void;
  toggle: (value?: BasemapKey) => void;
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
    styleUrl: MAP_BASEMAP_STYLES[basemap as keyof typeof MAP_BASEMAP_STYLES] ?? MAP_BASEMAP_STYLES.dark,
    setBasemap,
    toggle: (value?: BasemapKey) => setBasemap(value ?? nextBasemap(current)),
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

// ─── Activité de la carte : Run / Bike (planche E14) ────────────────────────
// TROISIÈME réglage, MÊME grammaire que les deux précédents (valeur mémoire qui
// fait foi, lecture LAZY unique, abonnés notifiés, persistance best-effort).
//
// CE QUE CE RÉGLAGE FAIT, ET CE QU'IL NE FAIT PAS. Il choisit la LENTILLE de la
// carte, rien d'autre. En 'bike', la Carte n'affiche AUCUN territoire, AUCUNE
// mission et AUCUN classement : le vélo n'existe pas encore sous l'écran (`runs`
// n'a pas de colonne d'activité, aucun classement n'est séparé par discipline —
// cf. `lib/flags.ts`). Rejouer les données Run sous une étiquette vélo serait
// exactement la donnée fabriquée que la charte interdit ; l'univers Bike est
// donc honnêtement VIDE, et il le DIT.

/** Les deux lentilles de la carte (planche E14) — jamais mélangées (§ séparation stricte). */
export type MapActivity = 'run' | 'bike';

/** Clé de persistance du réglage « Activité de la carte ». */
const ACTIVITY_STORAGE_KEY = 'gryd.mapactivity';
/** Défaut imposé : la course à pied — la seule discipline que GRYD chronomètre. */
const DEFAULT_ACTIVITY: MapActivity = 'run';

/** Activité en mémoire — fait foi dès le premier `setMapActivity`. */
let currentActivity: MapActivity = DEFAULT_ACTIVITY;
/** Lecture unique et LAZY de l'activité persistée (au premier montage/accès). */
let activityLoadPromise: Promise<void> | null = null;
/** Abonnés (hooks montés) notifiés à chaque bascule Run ↔ Bike. */
const activityListeners = new Set<(value: MapActivity) => void>();

function isMapActivity(raw: string | null): raw is MapActivity {
  return raw === 'run' || raw === 'bike';
}

function ensureActivityLoaded(): Promise<void> {
  if (!activityLoadPromise) {
    activityLoadPromise = AsyncStorage.getItem(ACTIVITY_STORAGE_KEY)
      .then((raw) => {
        if (isMapActivity(raw) && raw !== currentActivity) {
          currentActivity = raw;
          for (const l of activityListeners) l(currentActivity);
        }
      })
      .catch(() => {
        // Best effort : stockage indisponible → défaut (Run).
      });
  }
  return activityLoadPromise;
}

/** Lit l'activité persistée (résout le défaut Run si absente/illisible). */
export async function getMapActivity(): Promise<MapActivity> {
  await ensureActivityLoaded();
  return currentActivity;
}

/** Fixe l'activité, notifie les abonnés et persiste sous 'gryd.mapactivity'. */
export function setMapActivity(value: MapActivity): void {
  if (value === currentActivity) return;
  currentActivity = value;
  // La valeur en mémoire fait foi désormais — inutile de relire le stockage.
  activityLoadPromise = Promise.resolve();
  for (const l of activityListeners) l(currentActivity);
  void AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, value).catch(() => {});
}

/**
 * Hook : activité courante de la carte + setter. Partagée par TOUTES les
 * surfaces de carte (les deux forks MapScreen, le commutateur du header, le
 * bouton GO) — un seul état, aucune condition locale réinventée.
 */
export function useMapActivity(): {
  activity: MapActivity;
  setActivity: (value: MapActivity) => void;
} {
  const [activity, setLocal] = useState<MapActivity>(currentActivity);

  useEffect(() => {
    const listener = (value: MapActivity) => setLocal(value);
    activityListeners.add(listener);
    // Aligne l'état local si la valeur a bougé entre le rendu et l'effet.
    if (currentActivity !== activity) setLocal(currentActivity);
    // Charge la valeur persistée (une seule fois, partagée).
    void ensureActivityLoaded();
    return () => {
      activityListeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activity, setActivity: setMapActivity };
}
