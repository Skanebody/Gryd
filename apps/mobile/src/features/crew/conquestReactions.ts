/**
 * GRYD — réactions « kudos GRYD » sur la CONQUÊTE d'un coéquipier
 * (AMENDEMENT-31 §2 [P1], emprunt Strava du kudos). Sur une carte de conquête
 * du War Log crew (un coéquipier a repris une zone / fermé une frontière), taper
 * une réaction `Respect · Feu · Défends-la` incrémente un compteur PERSISTÉ
 * localement (démo), façon `reactions.ts` (A-18) : lecture lazy, écriture
 * fire-and-forget. Picto GRYD via le set d'icônes partagé — JAMAIS d'emoji.
 *
 * Boucle sociale légère (dopamine + colle) façon kudos, rendue GRYD. Statut
 * social COSMÉTIQUE uniquement — zéro effet de jeu, zéro pay-to-win.
 * Anti-shame (§11) : compteurs POSITIFS seulement, aucun compteur négatif,
 * jamais de « perdu » mis en avant — on ne félicite que la prise.
 *
 * Distinct du store des DONS (`reactions.ts`) : ses réactions sont propres à la
 * conquête et sa persistance vit sous sa propre clé (pas de collision d'ids).
 * TODO(O1) brancher crew_feed_event_reactions via Edge Function (écriture
 * client interdite côté DB — tout kudos est décidé serveur).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IconName } from '@klaim/shared';

/** Les 3 réactions de conquête (ordre stable d'affichage, §31.2). */
export type ConquestReactionKey = 'respect' | 'feu' | 'defends';

export interface ConquestReactionDef {
  key: ConquestReactionKey;
  /** Icône du set partagé (picto GRYD, jamais d'emoji). */
  icon: IconName;
  /** Libellé court FR (accessibilité + tooltip). */
  label: string;
}

/**
 * Kudos GRYD : Respect (main levée), Feu (flamme de série), Défends-la
 * (bouclier). Tous POSITIFS — on salue la prise, on ne pointe jamais une perte.
 */
export const CONQUEST_REACTIONS: readonly ConquestReactionDef[] = [
  { key: 'respect', icon: 'reactRespect', label: 'Respect' },
  { key: 'feu', icon: 'serie', label: 'Feu' },
  { key: 'defends', icon: 'bouclier', label: 'Défends-la' },
];

/** État affiché d'une conquête : compteur par réaction + ma voix (« mine »). */
export interface ConquestReactionState {
  counts: Partial<Record<ConquestReactionKey, number>>;
  /** Réactions que MOI (démo) j'ai posées — évite le double-comptage + teinte. */
  mine: Partial<Record<ConquestReactionKey, true>>;
}

/** Clé de persistance des réactions de conquête que j'ai posées (démo locale). */
const STORAGE_KEY = 'gryd.crew.conquestReactions';

/**
 * Seed déterministe des compteurs AVANT interaction (démo). Les valeurs vivent
 * dans feed.ts (source des cartes de conquête) et sont fusionnées avec mes
 * réactions persistées au montage. `mine` démarre vide : seul mon tap le remplit.
 */
type SeedMap = Record<string, Partial<Record<ConquestReactionKey, number>>>;

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

/** Mes réactions persistées : conquestId → { respect: true, … }. */
let mine: Record<string, Partial<Record<ConquestReactionKey, true>>> = {};
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
 * Enregistre les compteurs de départ d'une conquête (démo). Idempotent : on ne
 * seed qu'une fois par conquestId pour ne pas écraser l'affichage entre rendus.
 */
export function seedConquestReactions(
  conquestId: string,
  counts: Partial<Record<ConquestReactionKey, number>>,
): void {
  if (seeds[conquestId]) return;
  seeds = { ...seeds, [conquestId]: counts };
}

/**
 * Toggle ma réaction sur une conquête. 1ᵉʳ tap = +1 (compteur, cosmétique) ;
 * 2ᵉ tap = retire ma voix. Zéro effet de jeu, zéro compteur négatif (§11).
 */
export function toggleConquestReaction(
  conquestId: string,
  key: ConquestReactionKey,
): void {
  const current = mine[conquestId]?.[key];
  const next = { ...(mine[conquestId] ?? {}) };
  if (current) delete next[key];
  else next[key] = true;
  mine = { ...mine, [conquestId]: next };
  persist();
  emit();
}

/** RAZ (utilitaire démo / tests). */
export function resetConquestReactions(): void {
  mine = {};
  persist();
  emit();
}

/** Résout l'état affiché d'une conquête : seed démo + ma voix persistée. */
export function resolveConquestReactions(conquestId: string): ConquestReactionState {
  const seed = seeds[conquestId] ?? {};
  const my = mine[conquestId] ?? {};
  const counts: Partial<Record<ConquestReactionKey, number>> = {};
  for (const { key } of CONQUEST_REACTIONS) {
    const base = seed[key] ?? 0;
    counts[key] = base + (my[key] ? 1 : 0);
  }
  return { counts, mine: my };
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
 * Hook des réactions de conquête. Ne renvoie rien de spécifique : il ABONNE le
 * composant au store (re-render à chaque tap) — l'écran lit ensuite via
 * `resolveConquestReactions`. `loaded` expose l'état de chargement.
 */
export function useConquestReactions(): { loaded: boolean } {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { loaded };
}
