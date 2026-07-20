/**
 * GRYD — i18n : store de langue (même patron que profileStore : état MODULE +
 * useSyncExternalStore, persistance AsyncStorage, un seul état pour toute l'app,
 * bascule INSTANTANÉE sans redémarrage).
 *
 * Défaut : langue de l'appareil (expo-localization) si supportée, sinon
 * anglais ; le français reste servi aux appareils fr. Le choix manuel du
 * sélecteur (Paramètres) est persisté et gagne toujours.
 *
 * Init DÉFENSIVE (leçon du crash utf-16le) : toute API native au chargement du
 * module est sous try/catch — l'i18n ne doit JAMAIS empêcher un démarrage.
 */
import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCALES, type Entry, type Locale, format, resolve } from './types';

const STORAGE_KEY = 'gryd.locale.v1';

function deviceLocale(): Locale {
  try {
    // Import paresseux : module natif absent (vieux build) → fallback silencieux.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization') as {
      getLocales(): { languageCode: string | null }[];
    };
    const code = Localization.getLocales()[0]?.languageCode ?? '';
    if ((LOCALES as readonly string[]).includes(code)) return code as Locale;
  } catch {
    // Web preview / module indisponible : on retombe sur le défaut.
  }
  return 'en';
}

let locale: Locale = deviceLocale();
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Hydratation paresseuse du choix persisté (1er abonnement). */
function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  void AsyncStorage.getItem(STORAGE_KEY)
    .then((saved) => {
      if (saved && (LOCALES as readonly string[]).includes(saved) && saved !== locale) {
        locale = saved as Locale;
        emit();
      }
    })
    .catch(() => {
      // Stockage indisponible : le défaut appareil reste.
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensureHydrated();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return locale;
}

/** Langue courante hors React (Alert, toasts, modules non-composants). */
export function getLocale(): Locale {
  return locale;
}

/** Change la langue (sélecteur Paramètres) : immédiat + persisté. */
export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
    // Best effort — la session courante est déjà à jour.
  });
}

/** Langue réactive (re-render au changement). */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Hook principal des écrans : `const t = useT();` puis `t(C.maCle)` ou
 * `t(C.compteur, { n: 3 })`. Re-render automatique à la bascule de langue.
 */
export function useT(): (entry: Entry, vars?: Record<string, string | number>) => string {
  const current = useLocale();
  return useCallback(
    (entry: Entry, vars?: Record<string, string | number>) =>
      vars ? format(entry, vars, current) : resolve(entry, current),
    [current],
  );
}

/** Résolution ponctuelle hors composant (Alert, notifications, erreurs). */
export function t(entry: Entry, vars?: Record<string, string | number>): string {
  return vars ? format(entry, vars, locale) : resolve(entry, locale);
}
