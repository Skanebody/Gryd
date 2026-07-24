/**
 * GRYD — JOURNAL LOCAL des courses : uniquement des TIMESTAMPS de fin de course,
 * sur l'appareil. Aucune position, aucune trace (vie privée : le journal ne sert
 * qu'à dériver une SÉRIE honnête, pas à rejouer un parcours).
 *
 * POURQUOI. La série (§3.4) est calculée par le moteur partagé `computeStreak`,
 * mais `useMyStreak` la dérive des courses côté SERVEUR — donc elle est VIDE
 * hors-ligne et avant O1. Ce journal donne au moteur une source LOCALE : après une
 * course, l'écran de résultat peut montrer une série même sans verdict serveur.
 * Quand le serveur, lui, a jugé (post-O1), c'est SA série qui prime (autorité,
 * agrège tous les appareils) — le local n'est qu'un filet hors-ligne/pré-O1.
 *
 * HONNÊTE : le journal reflète les courses RÉELLEMENT tracées par cet appareil —
 * jamais fabriquées. `computeStreak` ne rend une série que si elle est vraiment
 * gagnée (STREAK_MIN_RUNS_PER_WEEK/semaine), sinon `status:'none'` → rien affiché.
 *
 * Le cœur PUR (`appendRun`) vit dans runJournalCore.ts (Deno-testable, aucun
 * import) ; ici on n'ajoute que de minces enveloppes AsyncStorage (best effort,
 * ne lèvent jamais).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendRun } from './runJournalCore';

const KEY = 'gryd.runjournal.v1';

/** Enregistre une course terminée (best effort — un échec de stockage n'est jamais fatal). */
export async function recordRun(atMs: number): Promise<void> {
  try {
    const existing = await readRunJournal();
    const next = appendRun(existing, atMs, atMs);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best effort : sans journal local, la série locale sera simplement absente.
  }
}

/** Lit les timestamps de course locaux (ms), du plus récent au plus ancien. */
export async function readRunJournal(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  } catch {
    return [];
  }
}
