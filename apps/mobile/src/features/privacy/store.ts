/**
 * GRYD — accès React aux préférences de confidentialité.
 *
 * La FORME, les DÉFAUTS et la LECTURE vivent dans `./prefs.ts` — module pur,
 * testé sous Deno (c'est là qu'est expliquée la suppression des dix réglages
 * sans consommateur, et pourquoi la relecture pioche au lieu de fusionner).
 * Ici : uniquement le hook et la persistance.
 *
 * Persistance LOCALE (AsyncStorage), miroir CLIENT : il n'y a pas de colonne
 * serveur (TODO O1). C'est précisément ce qui interdit d'y remettre des réglages
 * qu'un serveur devrait respecter — un serveur ne peut pas honorer une
 * préférence qui ne quitte jamais le téléphone. L'écran DIT cette limite au
 * lieu de la masquer.
 *
 * Web/preview : AsyncStorage est présent mais on ne bloque jamais le rendu
 * dessus (lecture asynchrone, `loading` exposé pour que les écrans n'affirment
 * rien avant d'avoir lu).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PRIVACY,
  PRIVACY_STORAGE_KEY,
  applyPatch,
  parsePrivacyPrefs,
  type PrivacyPrefs,
} from './prefs';

export { DEFAULT_PRIVACY, applyPatch, parsePrivacyPrefs } from './prefs';
export type { PrivacyPrefs } from './prefs';

async function readPrefs(): Promise<PrivacyPrefs> {
  try {
    return parsePrivacyPrefs(await AsyncStorage.getItem(PRIVACY_STORAGE_KEY));
  } catch {
    return DEFAULT_PRIVACY;
  }
}

async function writePrefs(prefs: PrivacyPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne casse rien.
  }
}

export interface PrivacyStore {
  prefs: PrivacyPrefs;
  /** True tant que la lecture initiale n'a pas résolu (défauts affichés). */
  loading: boolean;
  /** Patch partiel + persistance. Retourne la promesse d'écriture. */
  update: (patch: Partial<PrivacyPrefs>) => Promise<void>;
}

/**
 * Hook d'accès aux préférences de confidentialité. Charge en asynchrone,
 * persiste chaque patch. Aucune requête réseau.
 */
export function usePrivacyPrefs(): PrivacyStore {
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  /**
   * Miroir SYNCHRONE de l'état canonique. La valeur à persister est dérivée
   * d'ICI, jamais du callback fonctionnel de setPrefs (qui, sous React 18 batché
   * ou en mode concurrent, peut ne pas s'exécuter avant `await writePrefs` →
   * bug de persistance : on écrivait les défauts à la place du patch).
   */
  const prefsRef = useRef<PrivacyPrefs>(DEFAULT_PRIVACY);

  useEffect(() => {
    let alive = true;
    void readPrefs().then((p) => {
      if (alive) {
        prefsRef.current = p;
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<PrivacyPrefs>) => {
    const next = applyPatch(prefsRef.current, patch);
    prefsRef.current = next;
    setPrefs(next);
    await writePrefs(next);
  }, []);

  return { prefs, loading, update };
}
