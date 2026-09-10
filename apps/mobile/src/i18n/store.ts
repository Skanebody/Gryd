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
import { type Entry, type Locale, format, resolve } from './types';

const STORAGE_KEY = 'gryd.locale.v1';

/**
 * ─── LES LANGUES RÉELLEMENT PROPOSÉES (10/09/2026) ──────────────────────────
 *
 * `LOCALES` en compte CINQ, et les catalogues typés les tiennent toutes : une
 * `Entry` est un `Record<Locale, string>` COMPLET, donc rien n'expédie une
 * chaîne non traduite (ADR-009). Ce contrat vaut pour le CATALOGUE — il ne vaut
 * pas pour l'app entière.
 *
 * LE CONSTAT, MESURÉ : le domaine « refonte » (journal, communauté, collection,
 * conversation, fil de crew…) n'écrit pas ses textes dans un catalogue. Il
 * appelle `useRefonteCopy()` (`features/refonte/ProfilePrimitives.tsx`), qui
 * ne connaît QUE deux langues — `locale === 'en' ? en : fr`. Un compte réglé en
 * espagnol, en allemand ou en portugais lit donc du FRANÇAIS sur des écrans
 * entiers. Environ 620 appels `copy(fr, en)` sont concernés.
 *
 * LA DÉCISION : ne proposer que ce qui est tenu. Le sélecteur n'offre plus que
 * le français et l'anglais, et l'écran DIT pourquoi. Les trois autres langues
 * ne sont ni supprimées ni reniées — les catalogues restent typés cinq langues,
 * et elles reviendront dans cette liste le jour où le domaine refonte parlera
 * autre chose que deux langues. Proposer une langue qu'on ne parle qu'à moitié
 * serait exactement la promesse au-delà du code que le dépôt s'interdit.
 *
 * ⚠ NE PAS « corriger » en rajoutant es/de/pt ici sans avoir traduit
 * `useRefonteCopy` : la liste est la PROMESSE, pas le catalogue.
 */
export const SELECTABLE_LOCALES: readonly Locale[] = ['fr', 'en'];

/** Une valeur inconnue n'est jamais une langue proposée (défaut le plus sûr). */
export function isSelectableLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SELECTABLE_LOCALES as readonly string[]).includes(value);
}

function deviceLocale(): Locale {
  try {
    // Import paresseux : module natif absent (vieux build) → fallback silencieux.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization') as {
      getLocales(): { languageCode: string | null }[];
    };
    const code = Localization.getLocales()[0]?.languageCode ?? '';
    // Un téléphone en espagnol reçoit l'ANGLAIS, pas l'espagnol : c'est la
    // langue que l'app parle réellement de bout en bout. Lui servir un
    // espagnol à trous serait pire qu'une langue étrangère assumée.
    if (isSelectableLocale(code)) return code;
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
      // Un choix persisté AVANT la restriction (es/de/pt) n'est pas restauré :
      // il rouvrirait la langue à trous sans que le sélecteur puisse en sortir.
      if (isSelectableLocale(saved) && saved !== locale) {
        locale = saved;
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
  // Garde de dernier recours : une langue hors liste n'est pas appliquée. Le
  // sélecteur ne peut pas la produire, mais un appelant futur, si.
  if (!isSelectableLocale(next) || next === locale) return;
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
