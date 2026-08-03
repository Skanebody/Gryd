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
 *   • ACTIVITÉ, PAR SURFACE  (planche E14 « commutateur Run / Bike », « le choix
 *     est mémorisé PAR ONGLET ») — 'run' (DÉFAUT) | 'bike', une clé par surface
 *     (`gryd.mapactivity` pour la Carte, `gryd.activity.<surface>` ailleurs).
 *     Hooks : `useActivityPref(surface)` et son alias historique
 *     `useMapActivity()`. Ce réglage n'affirme RIEN sur le joueur : il choisit la
 *     LENTILLE d'un écran, et l'univers Bike est aujourd'hui honnêtement vide
 *     (cf. le commentaire de `flags.bike` et `ui/activityLens.ts`).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import {
  activityStorageKey,
  parseActivity,
  type ActivitySurface,
} from '../../ui/activityLens';
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
 * propose ainsi 3 options explicites — AMENDEMENT-28).
 *
 * ⚠ `styleUrl` est un HÉRITAGE, inutilisé hors de ce hook, et ce n'est PLUS le
 * style servi : le fond sombre est embarqué (`mvp/map/nightStyle.ts`) et le
 * satellite est un raster construit sur place. Ce champ ne rend que l'URL CARTO
 * de PROVENANCE (repli sombre pour `satellite`). Les forks RealMap résolvent
 * eux-mêmes le vrai style ; ne pas rebrancher un rendu dessus.
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

// ─── Activité, PAR SURFACE : Run / Bike (planche E14) ───────────────────────
// TROISIÈME réglage, MÊME grammaire que les deux précédents (valeur mémoire qui
// fait foi, lecture LAZY unique, abonnés notifiés, persistance best-effort) —
// à une différence près, exigée par la planche : « le choix est mémorisé PAR
// ONGLET ». Les deux premiers réglages sont GLOBAUX (un fond de carte, une vue
// 3D pour toute l'app) ; celui-ci ne l'est pas. Basculer le Classement en Bike
// ne doit pas téléporter la Carte : ce sont quatre lentilles indépendantes, donc
// quatre emplacements — un par surface (cf. `ui/activityLens.ts`, qui possède
// les clés et les prouve distinctes).
//
// CE QUE CE RÉGLAGE FAIT, ET CE QU'IL NE FAIT PAS. Il choisit la LENTILLE d'un
// écran, rien d'autre — mais depuis le 26/07/2026 cette lentille est passée aux
// LECTURES (`useRealTerritories(crewIds, activity)`, `useMyRunHistory`,
// `useStats`, `useSeasonLeaderboard`…), qui la traduisent en
// `.eq('activity', …)`. Les deux mondes existent donc vraiment en base
// (migration 0070, appliquée le 25/07) et chacun montre SES lignes.
//
// Ce commentaire a porté l'inverse jusqu'au matin du 26/07 : « en 'bike', la
// surface n'affiche AUCUN territoire, AUCUNE mission et AUCUN classement ».
// C'était vrai tant que rien ne pouvait être enregistré à vélo ; la décision
// fondateur du même jour l'a rendu faux, et le laisser aurait fait dire à la
// doc que l'app ne fait pas ce qu'elle fait.
//
// IL NE DÉCIDE AUCUNE DISCIPLINE D'ENREGISTREMENT, ET ÇA NE CHANGE PAS. Une
// préférence d'AFFICHAGE ne décide jamais EN SILENCE de la nature d'un effort
// enregistré (arbitrage du 25/07/2026, détaillé dans `runActivity.ts`) : rien
// dans `features/run/**` ne lit ce module. Les écrans qui lancent une sortie
// DÉCLARENT sa discipline dans l'URL (`ui/activityLens.ts` →
// `withStartActivity`), et le préflight l'AFFICHE avant le premier mètre —
// déclarer et montrer, ce n'est pas deviner.

/**
 * Les deux lentilles (planche E14) — jamais mélangées (§ séparation stricte).
 * Alias HISTORIQUE du type de jeu `Activity` : la Carte et BattleMapOverlays
 * l'importent sous ce nom, et les deux mondes n'ont aucune raison de diverger.
 */
export type MapActivity = Activity;

/** Un emplacement de préférence : sa valeur, sa lecture LAZY, ses abonnés. */
interface ActivitySlot {
  value: Activity;
  load: Promise<void> | null;
  listeners: Set<(value: Activity) => void>;
}

/** Un emplacement PAR SURFACE — créé à la demande, jamais partagé entre écrans. */
const activitySlots = new Map<ActivitySurface, ActivitySlot>();

function slotOf(surface: ActivitySurface): ActivitySlot {
  const existing = activitySlots.get(surface);
  if (existing) return existing;
  // Défaut imposé : la course à pied — la seule discipline que GRYD chronomètre.
  const created: ActivitySlot = { value: DEFAULT_ACTIVITY, load: null, listeners: new Set() };
  activitySlots.set(surface, created);
  return created;
}

function ensureActivityLoaded(surface: ActivitySurface): Promise<void> {
  const slot = slotOf(surface);
  if (!slot.load) {
    slot.load = AsyncStorage.getItem(activityStorageKey(surface))
      .then((raw) => {
        const parsed = parseActivity(raw);
        if (parsed !== null && parsed !== slot.value) {
          slot.value = parsed;
          for (const l of slot.listeners) l(parsed);
        }
      })
      .catch(() => {
        // Best effort : stockage indisponible → défaut (Run).
      });
  }
  return slot.load;
}

/** Lit la lentille persistée d'une surface (défaut Run si absente/illisible). */
export async function getActivityPref(surface: ActivitySurface): Promise<Activity> {
  await ensureActivityLoaded(surface);
  return slotOf(surface).value;
}

/** Fixe la lentille d'UNE surface, notifie ses abonnés et la persiste. */
export function setActivityPref(surface: ActivitySurface, value: Activity): void {
  const slot = slotOf(surface);
  if (value === slot.value) return;
  slot.value = value;
  // La valeur en mémoire fait foi désormais — inutile de relire le stockage.
  slot.load = Promise.resolve();
  for (const l of slot.listeners) l(value);
  void AsyncStorage.setItem(activityStorageKey(surface), value).catch(() => {});
}

/**
 * Hook : lentille courante d'UNE surface + setter. Tous les composants d'un même
 * écran partagent l'emplacement (un seul état, aucune condition locale
 * réinventée) ; deux écrans différents ne se voient pas.
 */
export function useActivityPref(surface: ActivitySurface): {
  activity: Activity;
  setActivity: (value: Activity) => void;
} {
  const [activity, setLocal] = useState<Activity>(() => slotOf(surface).value);

  useEffect(() => {
    const slot = slotOf(surface);
    const listener = (value: Activity) => setLocal(value);
    slot.listeners.add(listener);
    // Aligne l'état local si la valeur a bougé entre le rendu et l'effet (ou si
    // `surface` change : le hook doit alors adopter la valeur du nouvel emplacement).
    setLocal(slot.value);
    // Charge la valeur persistée (une seule fois par surface, partagée).
    void ensureActivityLoaded(surface);
    return () => {
      slot.listeners.delete(listener);
    };
  }, [surface]);

  return {
    activity,
    setActivity: (value: Activity) => setActivityPref(surface, value),
  };
}

// ── Alias HISTORIQUES de la Carte (surface 'map', clé `gryd.mapactivity`) ────
// La Carte n'est pas dans le périmètre de ce chantier : sa signature d'import ne
// bouge pas d'un caractère, et son choix déjà persisté sur les téléphones du
// pilote reste lu à la même clé.

/** Lit l'activité persistée de la Carte (résout le défaut Run si absente). */
export function getMapActivity(): Promise<MapActivity> {
  return getActivityPref('map');
}

/** Fixe l'activité de la Carte, notifie les abonnés et persiste. */
export function setMapActivity(value: MapActivity): void {
  setActivityPref('map', value);
}

/**
 * Hook : activité courante de la CARTE + setter. Partagée par toutes les
 * surfaces de carte (les deux forks MapScreen, le commutateur du header, le
 * bouton GO) — un seul état pour la carte, distinct des trois autres onglets.
 */
export function useMapActivity(): {
  activity: MapActivity;
  setActivity: (value: MapActivity) => void;
} {
  return useActivityPref('map');
}
