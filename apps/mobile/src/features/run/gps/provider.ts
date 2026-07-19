/**
 * GRYD — provider GPS natif (AMENDEMENT-15 §2). Wrapper expo-location +
 * expo-task-manager (stack imposée, déjà en deps) — le SEUL module qui touche
 * au capteur. Le moteur (engine/gps.ts) reste pur : ce fichier convertit les
 * LocationObject en RawFix et gère permissions/abonnements, rien d'autre.
 *
 * Permissions PROGRESSIVES GO-first (AMENDEMENT-14) :
 *  - foreground : demandée au premier GO (l'ouverture de course-live) ;
 *  - background : demandée UNIQUEMENT après une mise en arrière-plan pendant
 *    une course active, avec une phrase de rationale — jamais bloquant.
 *
 * Deux sources de fixes, jamais les deux en même temps (pas de doublons) :
 *  - foreground : watchPositionAsync (BestForNavigation) tant que l'écran vit ;
 *  - background : tâche GPS_BACKGROUND_TASK (startLocationUpdatesAsync) dès que
 *    la permission « Toujours » est accordée — notification de service Android
 *    (foregroundService), indicateur iOS. La tâche pousse vers le listener
 *    enregistré, sinon vers la file AsyncStorage (relance headless après kill).
 *
 * NB fichier natif uniquement : importé via useRealRun.ts /
 * registerBackgroundTask.ts (variantes .web.ts vides) — jamais dans le bundle web.
 */
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GPS_ACCURACY_MAX_M, GPS_SAMPLE_INTERVAL_MS, colors } from '@klaim/shared';
import { appendBackgroundFixes } from '../../../lib/runStore';
import type { RawFix } from './engine/gps';

/** Nom STABLE de la tâche background (persisté par l'OS entre relances). */
export const GPS_BACKGROUND_TASK = 'gryd-gps-background';

// ─── Conversion capteur → moteur ─────────────────────────────────────────────

/**
 * LocationObject → RawFix. Une accuracy absente (rare, vieux Android) est
 * remplacée par GPS_ACCURACY_MAX_M : le point reste affichable mais pèse
 * « faible » dans la jauge — jamais une fausse confiance.
 */
export function toRawFix(loc: Location.LocationObject): RawFix {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    ts: loc.timestamp,
    accuracy: loc.coords.accuracy ?? GPS_ACCURACY_MAX_M,
    ...(loc.coords.speed !== null && loc.coords.speed >= 0 ? { speed: loc.coords.speed } : {}),
  };
}

// ─── Tâche background (définie au chargement du module, natif seulement) ─────

type FixListener = (fixes: RawFix[]) => void;
let backgroundListener: FixListener | null = null;

/** Branche/débranche le tracker foreground sur la tâche background. */
export function setBackgroundFixListener(listener: FixListener | null): void {
  backgroundListener = listener;
}

if (Platform.OS !== 'web') {
  // DÉFENSIF : ce bloc s'exécute à l'ÉVALUATION DU BUNDLE (avant tout rendu
  // React, donc hors de portée de l'ErrorBoundary). Si expo-task-manager n'est
  // pas disponible, un throw ici tue l'app au démarrage sans écran d'erreur.
  // Perdre la reprise headless est acceptable ; perdre l'app ne l'est pas.
  try {
    TaskManager.defineTask(GPS_BACKGROUND_TASK, async ({ data, error }) => {
      if (error || !data) return; // un raté de tâche ne casse jamais la course
      const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
      if (locations.length === 0) return;
      const fixes = locations.map(toRawFix);
      if (backgroundListener) backgroundListener(fixes);
      // Relance headless après kill : personne n'écoute → file persistée,
      // fusionnée à la restauration (runStore.drainBackgroundFixes).
      else await appendBackgroundFixes(fixes);
    });
  } catch (e) {
    console.warn('[GRYD] tâche GPS background indisponible', e);
  }
}

// ─── Permissions (progressives, jamais bloquantes) ───────────────────────────

export interface ForegroundPermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  /** Android : seule la position APPROXIMATIVE est accordée (coarse). */
  coarseOnly: boolean;
}

function toForegroundState(p: Location.LocationPermissionResponse): ForegroundPermissionState {
  return {
    status: p.granted ? 'granted' : p.status === 'undetermined' ? 'undetermined' : 'denied',
    canAskAgain: p.canAskAgain,
    coarseOnly: p.granted && p.android?.accuracy === 'coarse',
  };
}

export async function checkForegroundPermission(): Promise<ForegroundPermissionState> {
  return toForegroundState(await Location.getForegroundPermissionsAsync());
}

/** Demande « pendant l'utilisation » — appelée au premier GO, pas avant. */
export async function requestForegroundPermission(): Promise<ForegroundPermissionState> {
  return toForegroundState(await Location.requestForegroundPermissionsAsync());
}

export async function checkBackgroundGranted(): Promise<boolean> {
  return (await Location.getBackgroundPermissionsAsync()).granted;
}

/** Demande « Toujours » — UNIQUEMENT après un passage en arrière-plan en course. */
export async function requestBackgroundPermission(): Promise<boolean> {
  return (await Location.requestBackgroundPermissionsAsync()).granted;
}

/** Localisation système activée ? (GPS du téléphone, pas la permission). */
export async function hasLocationServices(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/** Réglages système de l'app (bandeau « position exacte », aides constructeur). */
export function openLocationSettings(): void {
  void Linking.openSettings();
}

// ─── Suivi foreground ────────────────────────────────────────────────────────

/**
 * Suivi écran allumé : BestForNavigation, cadence GPS_SAMPLE_INTERVAL_MS
 * (Android — iOS pousse à sa cadence native, le moteur décime/nettoie).
 * distanceInterval = 0 VOLONTAIREMENT : un filtre de distance affamerait
 * detectPauses/signalState à l'arrêt (plus aucun fix au feu rouge → faux
 * « signal perdu »). Le filtrage anti-jitter est le travail du moteur.
 */
/**
 * Position PONCTUELLE (carte, hors course) : une lecture Balanced, pas de watch
 * BestForNavigation qui viderait la batterie sur un onglet passif. Renvoie null
 * si la permission manque ou si la lecture échoue — l'appelant garde son
 * fallback, jamais de throw sur le chemin d'un écran.
 */
export async function getCurrentPositionOnce(): Promise<RawFix | null> {
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return toRawFix(loc);
  } catch {
    return null;
  }
}

export async function watchPosition(
  onFix: (fix: RawFix) => void,
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: GPS_SAMPLE_INTERVAL_MS,
      distanceInterval: 0,
    },
    (loc) => onFix(toRawFix(loc)),
  );
}

// ─── Suivi background (écran éteint / app en fond) ───────────────────────────

/** Démarre la tâche background (après permission « Toujours » accordée). */
export async function startBackgroundUpdates(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(GPS_BACKGROUND_TASK)) return;
  await Location.startLocationUpdatesAsync(GPS_BACKGROUND_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: GPS_SAMPLE_INTERVAL_MS,
    distanceInterval: 0,
    // iOS : indicateur système visible (honnêteté — jamais de suivi caché),
    // pas de pause auto OS (le moteur gère les pauses, pas CoreLocation).
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    // Android : notification de service obligatoire — texte FR court, jamais
    // de position affichée (zéro position live publique, AMENDEMENT-15).
    foregroundService: {
      notificationTitle: 'GRYD — course en cours',
      notificationBody: 'Ta trace s’enregistre, écran éteint compris.',
      notificationColor: colors.chartreuse,
    },
  });
}

/** Arrêt propre de la tâche background (fin de course, clôture, unmount). */
export async function stopBackgroundUpdates(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(GPS_BACKGROUND_TASK)) {
      await Location.stopLocationUpdatesAsync(GPS_BACKGROUND_TASK);
    }
  } catch {
    // tâche déjà morte (permission retirée…) — jamais bloquant
  }
}
