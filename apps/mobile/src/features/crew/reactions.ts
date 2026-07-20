/**
 * GRYD — réactions « Merci / Respect / Bien joué » des DONS (AMENDEMENT-18 A.3).
 * Sur un don (boost offert, route donnée, segment terminé, défense prise,
 * coffre offert), taper une réaction incrémente un compteur PERSISTÉ localement
 * (démo) façon chatStore.ts : lecture lazy, écriture fire-and-forget. Statut
 * social COSMÉTIQUE uniquement — jamais de récompense, jamais de pay-to-win
 * (A.3 : « 12 membres ont remercié Benjamin. »).
 *
 * Le fondateur veut : « Ton crew ne parle pas seulement. Il agit. » — remercier
 * un don EST une action sociale, elle doit se souvenir (reload → mon Merci reste).
 * TODO(O1) brancher crew_gift_reactions (0014/gifting) via Edge Function
 * (écriture client interdite côté DB).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/crew';
import { t } from '../../i18n/store';

/** Les 3 réactions de don (ordre stable d'affichage, A.3). */
export type GiftReactionKey = 'merci' | 'respect' | 'bienjoue';

export interface GiftReactionDef {
  key: GiftReactionKey;
  /** Libellé localisé — résolu par t() à l'affichage. */
  label: Entry;
}

export const GIFT_REACTIONS: readonly GiftReactionDef[] = [
  { key: 'merci', label: C.reactMerci },
  { key: 'respect', label: C.reactRespect },
  { key: 'bienjoue', label: C.reactBienJoue },
];

/** Compteurs d'un don : par réaction + drapeau « j'ai déjà réagi » par clé. */
export interface GiftReactionState {
  counts: Partial<Record<GiftReactionKey, number>>;
  /** Réactions que MOI (démo) j'ai posées — évite le double-comptage + teinte. */
  mine: Partial<Record<GiftReactionKey, true>>;
}

/** Clé de persistance des réactions de don que j'ai posées (démo locale). */
const STORAGE_KEY = 'gryd.crew.giftReactions';

/**
 * Seed déterministe des compteurs AVANT interaction (démo). Les valeurs vivent
 * dans feed.ts (source des cartes de don) et sont fusionnées avec mes réactions
 * persistées au montage. `mine` démarre vide : seul mon tap le remplit.
 */
type SeedMap = Record<string, Partial<Record<GiftReactionKey, number>>>;

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

/** Mes réactions persistées : giftId → { merci: true, … }. */
let mine: Record<string, Partial<Record<GiftReactionKey, true>>> = {};
let seeds: SeedMap = {};
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Snapshot stable (version bump) : getSnapshot pur pour useSyncExternalStore. */
let version = 0;

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as typeof mine;
            if (parsed && typeof parsed === 'object') mine = parsed;
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
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mine)).catch(() => {});
}

/**
 * Enregistre les compteurs de départ d'un don (démo). Idempotent : on ne seed
 * qu'une fois par giftId pour ne pas écraser l'affichage entre deux rendus.
 */
export function seedGiftReactions(
  giftId: string,
  counts: Partial<Record<GiftReactionKey, number>>,
): void {
  if (seeds[giftId]) return;
  seeds = { ...seeds, [giftId]: counts };
}

/**
 * Toggle ma réaction sur un don. 1ᵉʳ tap = +1 (compteur, cosmétique) ; 2ᵉ tap =
 * retire ma voix. Zéro effet de jeu (A.3). Retourne le nouvel état résolu.
 */
export function toggleGiftReaction(giftId: string, key: GiftReactionKey): void {
  const current = mine[giftId]?.[key];
  const next = { ...(mine[giftId] ?? {}) };
  if (current) delete next[key];
  else next[key] = true;
  mine = { ...mine, [giftId]: next };
  persist();
  emit();
}

/** RAZ (utilitaire démo / tests). */
export function resetGiftReactions(): void {
  mine = {};
  persist();
  emit();
}

/** Résout l'état affiché d'un don : seed démo + ma voix persistée. */
export function resolveGiftReactions(giftId: string): GiftReactionState {
  const seed = seeds[giftId] ?? {};
  const my = mine[giftId] ?? {};
  const counts: Partial<Record<GiftReactionKey, number>> = {};
  for (const { key } of GIFT_REACTIONS) {
    const base = seed[key] ?? 0;
    counts[key] = base + (my[key] ? 1 : 0);
  }
  return { counts, mine: my };
}

/**
 * Total de « Merci » d'un don → phrase sociale A.3 (« 12 membres ont remercié
 * Benjamin. »). null si personne (on n'affiche pas « 0 membre »). `by` = nom du
 * donateur, ou null si offrande anonyme (« … ont remercié ce membre. »).
 */
export function thanksLine(giftId: string, by: string | null): string | null {
  const merci = resolveGiftReactions(giftId).counts.merci ?? 0;
  if (merci <= 0) return null;
  // Localisé via t() module (l'écran re-render à la bascule de langue → la
  // ligne est recalculée avec la locale courante).
  const who = by ?? t(C.thisMember);
  return merci === 1 ? t(C.thanksOne, { who }) : t(C.thanksMany, { n: merci, who });
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
 * Hook des réactions de don. Ne renvoie rien de spécifique : il ABONNE le
 * composant au store (re-render à chaque tap) — l'écran lit ensuite via
 * `resolveGiftReactions` / `thanksLine`. `loaded` expose l'état de chargement.
 */
export function useGiftReactions(): { loaded: boolean } {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { loaded };
}
