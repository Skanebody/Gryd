/**
 * GRYD — COLLE QUOTIDIENNE du crew (AMENDEMENT-34, mapping Clash → GRYD :
 * « récompense de connexion du jour » + garder le clan vivant les jours SANS
 * courir). Le Crew HQ propose 4 micro-actions low-effort qui ne demandent pas
 * de courir : Encourager un runner, Voter une cible, Signaler une zone faible,
 * Boost coffre GRATUIT (1×/jour). Chaque action pose un petit +XP SOCIAL
 * cosmétique et une anim — JAMAIS de territoire/point/vitesse/protection
 * (anti pay-to-win STRICT, cf. game-rules DAILY_CHEST_BOOST_*).
 *
 * Store minimal façon `conquestReactions.ts` (A-18) : useSyncExternalStore +
 * AsyncStorage, lecture lazy, écriture fire-and-forget. RESET AUTOMATIQUE à
 * minuit LOCAL (la clé de jour `dayKey()` change → l'état repart neuf), et le
 * BOOST coffre est CAPÉ à DAILY_CHEST_BOOST_PER_DAY par jour. L'effet du boost
 * (DAILY_CHEST_BOOST_PCT, +2 %) alimente le coffre crew DÉMO (visuel) via
 * `dailyChestBonusPct()` — comme le Crew Boost payant, effet coffre UNIQUEMENT.
 *
 * TODO(O1) : brancher un vrai endpoint crew (les encouragements/votes/signaux
 * sont décidés serveur — écriture client interdite côté DB).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DAILY_CHEST_BOOST_PCT,
  DAILY_CHEST_BOOST_PER_DAY,
} from '@klaim/shared';

/** Les 4 actions low-effort de la colle quotidienne (ordre d'affichage stable). */
export type DailyGlueAction = 'encourage' | 'vote' | 'signal' | 'boost';

/** +XP SOCIAL cosmétique posé par action (jamais de l'XP de jeu — statut only). */
export const DAILY_GLUE_SOCIAL_XP = 5;

/**
 * État persisté d'UN jour : quelles actions faites + combien de boosts posés.
 * `done` porte les actions ponctuelles (une fois/jour) ; `boostsUsed` compte les
 * boosts pour appliquer le cap DAILY_CHEST_BOOST_PER_DAY (aujourd'hui 1).
 */
interface DailyGlueDay {
  /** dayKey local du jour couvert par cet état (change → reset à minuit). */
  day: string;
  /** Actions ponctuelles déjà accomplies aujourd'hui. */
  done: Partial<Record<Exclude<DailyGlueAction, 'boost'>, true>>;
  /** Nombre de boosts coffre posés aujourd'hui (capé, cf. per-day). */
  boostsUsed: number;
}

/** Vue lisible par l'écran : par action « fait ou pas » + le boost dispo/capé. */
export interface DailyGlueView {
  /** true si l'action ponctuelle a été accomplie aujourd'hui. */
  encourage: boolean;
  vote: boolean;
  signal: boolean;
  /** true tant qu'il reste un boost gratuit à poser aujourd'hui. */
  boostAvailable: boolean;
  /** Boosts déjà posés aujourd'hui (0..DAILY_CHEST_BOOST_PER_DAY). */
  boostsUsed: number;
  /** Nombre d'actions faites aujourd'hui (0..4) — pour la coche « X/4 ». */
  doneCount: number;
  /** +% de progression coffre offert par le(s) boost(s) du jour (visuel démo). */
  chestBonusPct: number;
  /** XP social cumulé aujourd'hui (cosmétique, jamais de l'XP de jeu). */
  socialXpToday: number;
  loaded: boolean;
}

/** Clé de persistance de la colle quotidienne (démo locale). */
const STORAGE_KEY = 'gryd.crew.dailyGlue';

/**
 * Clé de JOUR locale (AAAA-MM-JJ dans le fuseau de l'appareil). Le reset à
 * minuit est IMPLICITE : dès que le jour change, la clé change et l'état stocké
 * (attaché à l'ancien jour) est considéré comme neuf par `currentDay()`.
 */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Store minimal (notifier + snapshot versionné, useSyncExternalStore) ──────

let stored: DailyGlueDay | null = null;
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const l of listeners) l();
}

/** État neuf pour un jour donné (aucune action, aucun boost). */
function freshDay(day: string): DailyGlueDay {
  return { day, done: {}, boostsUsed: 0 };
}

/**
 * État du JOUR courant, en appliquant le reset de minuit : si l'état stocké
 * couvre un autre jour (ou est absent/corrompu), on repart d'un jour neuf.
 * Ne persiste pas ici (lecture pure) — la persistance suit la 1ʳᵉ écriture.
 */
function currentDay(): DailyGlueDay {
  const today = dayKey();
  if (stored && stored.day === today) return stored;
  return freshDay(today);
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as DailyGlueDay;
            if (parsed && typeof parsed === 'object' && typeof parsed.day === 'string') {
              stored = {
                day: parsed.day,
                done: parsed.done && typeof parsed.done === 'object' ? parsed.done : {},
                boostsUsed: Number.isFinite(parsed.boostsUsed) ? parsed.boostsUsed : 0,
              };
            }
          } catch {
            // corpus corrompu → on repart propre (best effort).
          }
        }
        loaded = true;
        emit();
      })
      .catch(() => {
        loaded = true;
      });
  }
  return loadPromise;
}

function persist() {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored)).catch(() => {});
}

/**
 * Marque une action PONCTUELLE (encourage / vote / signal) comme faite
 * aujourd'hui. Idempotent : re-taper ne pose pas d'XP en double (une fois/jour).
 * Renvoie true si l'action VIENT d'être posée (→ l'écran joue l'anim + haptique).
 */
export function markDailyAction(action: Exclude<DailyGlueAction, 'boost'>): boolean {
  const day = currentDay();
  if (day.done[action]) {
    // Déjà fait aujourd'hui : on réaligne l'état stocké (au cas où le jour a
    // changé sur un ancien état) mais on ne re-pose rien.
    stored = day;
    return false;
  }
  stored = { ...day, done: { ...day.done, [action]: true } };
  persist();
  emit();
  return true;
}

/**
 * Pose le BOOST coffre gratuit du jour. CAPÉ à DAILY_CHEST_BOOST_PER_DAY :
 * au-delà, renvoie false (l'écran n'anime pas et affiche « déjà utilisé »).
 * Renvoie true si le boost vient d'être posé. Effet coffre-only (anti-P2W).
 */
export function useDailyBoost(): boolean {
  const day = currentDay();
  if (day.boostsUsed >= DAILY_CHEST_BOOST_PER_DAY) {
    stored = day;
    return false;
  }
  stored = { ...day, boostsUsed: day.boostsUsed + 1 };
  persist();
  emit();
  return true;
}

/** RAZ (utilitaire démo / tests). */
export function resetDailyGlue(): void {
  stored = freshDay(dayKey());
  persist();
  emit();
}

/** Vue dérivée de l'état du jour courant (pure, mémoïsable par version). */
export function resolveDailyGlue(): DailyGlueView {
  const day = currentDay();
  const encourage = day.done.encourage === true;
  const vote = day.done.vote === true;
  const signal = day.done.signal === true;
  const boostsUsed = Math.max(0, Math.min(DAILY_CHEST_BOOST_PER_DAY, day.boostsUsed));
  const boostAvailable = boostsUsed < DAILY_CHEST_BOOST_PER_DAY;
  const doneCount =
    (encourage ? 1 : 0) + (vote ? 1 : 0) + (signal ? 1 : 0) + (boostsUsed > 0 ? 1 : 0);
  return {
    encourage,
    vote,
    signal,
    boostAvailable,
    boostsUsed,
    doneCount,
    // Chaque boost du jour ajoute DAILY_CHEST_BOOST_PCT au coffre (visuel démo).
    chestBonusPct: boostsUsed * DAILY_CHEST_BOOST_PCT,
    socialXpToday: doneCount * DAILY_GLUE_SOCIAL_XP,
    loaded,
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return version;
}

/**
 * Hook de la colle quotidienne : abonne le composant (re-render à chaque action)
 * et renvoie la vue du jour. Le reset de minuit est géré par `dayKey` — pas de
 * timer nécessaire : au prochain render post-minuit, la vue repart à zéro.
 */
export function useDailyGlue(): DailyGlueView {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return resolveDailyGlue();
}
