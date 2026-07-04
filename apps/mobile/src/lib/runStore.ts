/**
 * GRYD — runStore : persistance de la course ACTIVE (AMENDEMENT-15 §2).
 * Buffer AsyncStorage de la trace GPS brute + métadonnées, flushé
 * périodiquement par le tracker (event §8 `run_autosave`) pour survivre à un
 * kill process (batterie, OS, crash). À la réouverture de course-live, la
 * course interrompue est proposée en reprise ou clôturée proprement — jamais
 * de course perdue en silence (GO-first : zéro friction, zéro punition).
 *
 * Deux clés :
 *  - ACTIVE_RUN_KEY : l'objet course complet (runId idempotent, mode, départ,
 *    fixes bruts) — écrit par le tracker foreground ;
 *  - BG_FIXES_KEY   : file d'attente des fixes reçus par la TÂCHE background
 *    (expo-task-manager) quand aucun tracker n'écoute (app relancée headless) —
 *    fusionnée puis vidée à la restauration.
 * Le moteur (cleanTrace) retrie/déduplique : un chevauchement entre les deux
 * sources n'introduit jamais de faux mètres.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RunMode } from '@klaim/shared';
import type { RawFix } from '../features/run/gps/engine/gps';

const ACTIVE_RUN_KEY = 'gryd.activeRun.v1';
const BG_FIXES_KEY = 'gryd.activeRun.bgFixes.v1';

/** Course active persistée (source de vérité de la reprise après kill). */
export interface StoredRun {
  /** UUID local généré AVANT la course — clé d'idempotence d'ingest_run. */
  runId: string;
  mode: RunMode;
  /** Départ epoch ms. */
  startedAt: number;
  /** Trace brute (le moteur nettoie à la relecture — on ne stocke jamais du dérivé). */
  fixes: RawFix[];
  /** Cumul des pauses MANUELLES déjà écoulées (ms) — le chrono reprend juste. */
  userPausedMs: number;
}

/** Charge la course active persistée (null : rien à reprendre / JSON corrompu). */
export async function loadActiveRun(): Promise<StoredRun | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as StoredRun;
    if (typeof parsed.runId !== 'string' || !Array.isArray(parsed.fixes)) return null;
    return parsed;
  } catch {
    return null; // stockage illisible → pas de reprise, jamais de crash
  }
}

/** Écrit (remplace) la course active — appelé par le flush périodique du tracker. */
export async function saveActiveRun(run: StoredRun): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run));
  } catch {
    // Stockage plein/indisponible : la course continue en mémoire (jamais bloquant).
  }
}

/** Efface la course active (fin de course envoyée ou clôturée). */
export async function clearActiveRun(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([ACTIVE_RUN_KEY, BG_FIXES_KEY]);
  } catch {
    // no-op
  }
}

/**
 * File d'attente background : la tâche expo-task-manager y pousse les fixes
 * quand aucun tracker foreground n'écoute (relance headless après kill).
 */
export async function appendBackgroundFixes(fixes: readonly RawFix[]): Promise<void> {
  if (fixes.length === 0) return;
  try {
    const raw = await AsyncStorage.getItem(BG_FIXES_KEY);
    const existing: RawFix[] = raw === null ? [] : (JSON.parse(raw) as RawFix[]);
    await AsyncStorage.setItem(BG_FIXES_KEY, JSON.stringify([...existing, ...fixes]));
  } catch {
    // no-op — au pire ces fixes manquent, le moteur marque le trou (gapBefore)
  }
}

/** Récupère PUIS vide la file background (fusion à la restauration/reprise). */
export async function drainBackgroundFixes(): Promise<RawFix[]> {
  try {
    const raw = await AsyncStorage.getItem(BG_FIXES_KEY);
    await AsyncStorage.removeItem(BG_FIXES_KEY);
    return raw === null ? [] : (JSON.parse(raw) as RawFix[]);
  } catch {
    return [];
  }
}
