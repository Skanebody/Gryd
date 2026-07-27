/**
 * GRYD — E13 : PERSISTANCE des recherches récentes. Même grammaire que
 * `mapPref.ts` : valeur en MÉMOIRE qui fait foi, lecture unique et LAZY au
 * premier accès, best-effort (stockage indisponible ⇒ liste vide, jamais une
 * exception), abonnés re-rendus à chaque changement.
 *
 * ─── CE QUI EST STOCKÉ, ET CE QUI NE L'EST PAS ──────────────────────────────
 * Le LIEU CHOISI (identifiant, libellé, centre) — jamais le TERME TAPÉ. Un
 * journal de requêtes est une carte des intentions de son propriétaire ; §12 n'en
 * veut pas plus que l'analytics de cet écran (`EVENTS.placeSearchResultPicked`
 * s'interdit littéralement la même chose).
 *
 * ⚠️ TOUT EST LOCAL. Rien de cet historique ne part vers Supabase ni vers un
 * tiers : `AsyncStorage`, sur l'appareil, effaçable en un tap depuis l'écran.
 *
 * ─── LA RÈGLE DE VIE PRIVÉE ─────────────────────────────────────────────────
 * Elle N'EST PAS ici : la décision « ce lieu entre-t-il dans l'historique ? »
 * est une fonction PURE et testée (`admitToRecents`, placeSearch.ts). Ce module
 * ne fait qu'écrire ce qu'elle a admis — c'est la seule façon de prouver la
 * règle sans capture d'écran.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLACE_SEARCH_RECENT_MAX } from '@klaim/shared';
import {
  parseRecentPlaces,
  pushRecentPlace,
  serializeRecentPlaces,
  type RecentPlace,
} from './placeSearch';

/** Clé de persistance. Préfixe `gryd.` comme les autres réglages locaux. */
export const PLACE_RECENTS_STORAGE_KEY = 'gryd.placeRecents';

/** Valeur en mémoire — fait foi dès la première écriture. */
let current: readonly RecentPlace[] = [];
/**
 * L'historique a-t-il été RELU depuis le stockage ? Tant que non, une liste
 * vide ne signifie pas « aucune recherche » : l'écran affiche donc un état de
 * lecture, pas son message « Aucune recherche pour l'instant » (confondre les
 * deux serait précisément l'écueil de la constitution).
 */
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(PLACE_RECENTS_STORAGE_KEY)
      .then((raw) => {
        current = parseRecentPlaces(raw, PLACE_SEARCH_RECENT_MAX);
      })
      .catch(() => {
        // Stockage indisponible : on n'a rien lu, et on n'inventera rien.
        current = [];
      })
      .then(() => {
        loaded = true;
        emit();
      });
  }
  return loadPromise;
}

function persist(): void {
  void AsyncStorage.setItem(PLACE_RECENTS_STORAGE_KEY, serializeRecentPlaces(current)).catch(
    () => {
      // Best-effort : l'écriture qui échoue ne casse pas l'écran. La valeur en
      // mémoire reste celle affichée — on ne prétend pas avoir oublié.
    },
  );
}

export interface PlaceRecents {
  readonly items: readonly RecentPlace[];
  /** L'historique a-t-il été RELU ? `false` ⇒ « lecture en cours », pas « vide ». */
  readonly loaded: boolean;
  /** Ajoute en tête (dédupliqué, plafonné). L'appelant a déjà passé `admitToRecents`. */
  readonly remember: (entry: RecentPlace) => void;
  readonly clear: () => void;
}

export function usePlaceRecents(): PlaceRecents {
  const [snapshot, setSnapshot] = useState<{ items: readonly RecentPlace[]; loaded: boolean }>({
    items: current,
    loaded,
  });

  useEffect(() => {
    const listener = () => setSnapshot({ items: current, loaded });
    listeners.add(listener);
    void ensureLoaded().then(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const remember = useCallback((entry: RecentPlace) => {
    current = pushRecentPlace(current, entry, PLACE_SEARCH_RECENT_MAX);
    persist();
    emit();
  }, []);

  const clear = useCallback(() => {
    current = [];
    persist();
    emit();
  }, []);

  return { items: snapshot.items, loaded: snapshot.loaded, remember, clear };
}
