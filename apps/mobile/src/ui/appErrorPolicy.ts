/**
 * GRYD — POLITIQUE D'ERREUR : ce que le joueur LIT quand l'app casse.
 *
 * ─── LE POURQUOI ────────────────────────────────────────────────────────────
 * Le fondateur a vu « fonts is not defined » s'afficher en toutes lettres
 * par-dessus l'app. La règle qu'il en tire est juste, et elle est ici : « aucun
 * message technique brut ne doit apparaître ; log interne oui, affichage brut
 * non ». Tout le rendu d'erreur de l'app passe par ce module, et ce module est
 * PUR (zéro import react-native / expo) — donc testable en Deno. C'est
 * volontaire : la garantie « aucun symbole à l'écran » n'a de valeur que si
 * elle est PROUVÉE, pas relue.
 *
 * ─── LA LIGNE QUI PORTE TOUT ────────────────────────────────────────────────
 * `technicalDetail()` rend `null` dès que `isDev` est faux, AVANT même de
 * regarder l'erreur. En production il n'existe aucun chemin de code qui rende
 * un nom de symbole, un fichier ou une pile d'appel : l'écran ne peut pas en
 * afficher parce qu'on ne lui en fabrique pas. En développement le détail
 * revient intact — on ne débogue pas à l'aveugle.
 *
 * ─── CE QUE LA COPIE N'A PAS LE DROIT DE DIRE ───────────────────────────────
 * Un plantage d'AFFICHAGE ne dit RIEN sur les données du joueur. Les textes
 * (catalogue `route.ts`) portent donc explicitement la nuance : les courses
 * ENVOYÉES et les territoires vivent côté serveur, un crash de rendu ne les
 * déplace pas. On ne parle pas d'une course en cours pas encore envoyée — elle
 * a son propre filet (`pendingUpload`), et promettre à sa place serait
 * exactement la faute qu'on corrige.
 */
import { C } from '../i18n/catalog/route';
import { resolve, type Locale } from '../i18n/types';

/**
 * Deux familles, pas plus. Elles se distinguent par ce que le joueur peut
 * FAIRE : sur `network` il a une action à lui (vérifier son réseau), sur
 * `display` il n'en a aucune — l'app seule est en cause, et le lui dire
 * autrement serait lui faire porter un défaut qui n'est pas le sien.
 */
export type AppErrorKind = 'network' | 'display';

/**
 * Signatures RÉSEAU, en minuscules. Volontairement conservatrice : dans le
 * doute on classe en `display`. Se tromper vers `display` fait lire au joueur
 * « l'app a lâché » (vrai, et sans reproche) ; se tromper vers `network` lui
 * ferait accuser sa connexion à tort et chercher un problème inexistant.
 */
const NETWORK_HINTS: readonly string[] = [
  'network request failed',
  'failed to fetch',
  'network error',
  'networkerror',
  'the internet connection appears to be offline',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'socket hang up',
  'timeout',
];

/** Noms d'erreur JS standard — voir `analyticsErrorName`. */
const KNOWN_ERROR_NAMES: readonly string[] = [
  'Error',
  'TypeError',
  'ReferenceError',
  'RangeError',
  'SyntaxError',
  'EvalError',
  'URIError',
  'AbortError',
];

/** Plafond du détail dev — une pile entière noie l'info utile (la tête). */
const DETAIL_MAX = 1200;

interface ErrorParts {
  readonly name: string;
  readonly message: string;
  readonly stack: string;
}

/**
 * Lecture DÉFENSIVE : un boundary reçoit `unknown`. On ne fait jamais
 * `String(error)` sur un objet quelconque — un objet applicatif peut porter un
 * token, une réponse serveur ou une référence circulaire. On ne lit que les
 * trois champs d'une Error, et seulement s'ils sont des chaînes.
 */
function readError(error: unknown): ErrorParts {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message ?? '',
      stack: error.stack ?? '',
    };
  }
  if (typeof error === 'string') return { name: 'Error', message: error, stack: '' };
  if (error !== null && typeof error === 'object') {
    const bag = error as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: typeof bag.name === 'string' && bag.name ? bag.name : 'Error',
      message: typeof bag.message === 'string' ? bag.message : '',
      stack: typeof bag.stack === 'string' ? bag.stack : '',
    };
  }
  return { name: 'Error', message: '', stack: '' };
}

/** Réseau ou affichage — voir `AppErrorKind`. */
export function classifyAppError(error: unknown): AppErrorKind {
  const { name, message } = readError(error);
  // Une requête annulée est un incident réseau, quel que soit son message.
  if (name === 'AbortError') return 'network';
  const haystack = message.toLowerCase();
  return NETWORK_HINTS.some((hint) => haystack.includes(hint)) ? 'network' : 'display';
}

/**
 * Détail technique — `null` HORS développement, sans condition. C'est la
 * garantie du chantier : en production le rendu n'a rien de technique à
 * afficher parce que rien ne lui est fourni.
 */
export function technicalDetail(error: unknown, isDev: boolean): string | null {
  if (!isDev) return null;
  const { name, message, stack } = readError(error);
  const head = message ? `${name}: ${message}` : name;
  const full = stack ? `${head}\n\n${stack}` : head;
  return full.length > DETAIL_MAX ? `${full.slice(0, DETAIL_MAX)}…` : full;
}

/**
 * Nom d'erreur pour le JOURNAL INTERNE (event `crash`), jamais pour l'écran.
 * Refermé sur un vocabulaire connu : le nom d'une erreur peut être arbitraire
 * (classes maison, messages serveur recopiés), et l'analytique du repo ne
 * transporte que des vocabulaires FERMÉS — mêmes règles que `deep_link_opened`.
 * Le message, lui, ne part JAMAIS : il peut contenir une URL ou un identifiant.
 */
export function analyticsErrorName(error: unknown): string {
  const { name } = readError(error);
  return KNOWN_ERROR_NAMES.includes(name) ? name : 'other';
}

/** Tout ce que l'écran d'erreur rend — et rien d'autre. */
export interface AppErrorView {
  readonly kind: AppErrorKind;
  readonly title: string;
  readonly body: string;
  readonly retryLabel: string;
  readonly backLabel: string;
  /** `null` hors DEV : le rendu par défaut n'a aucun détail technique. */
  readonly detail: string | null;
}

/** Vue de l'écran d'erreur React (frontière expo-router). */
export function buildAppErrorView(
  error: unknown,
  locale: Locale,
  isDev: boolean,
): AppErrorView {
  const kind = classifyAppError(error);
  return {
    kind,
    title: resolve(kind === 'network' ? C.crashTitleNetwork : C.crashTitleDisplay, locale),
    body: resolve(kind === 'network' ? C.crashBodyNetwork : C.crashBodyDisplay, locale),
    retryLabel: resolve(C.crashRetry, locale),
    backLabel: resolve(C.crashBackToMap, locale),
    detail: technicalDetail(error, isDev),
  };
}

/** Ce que rend l'alerte du filet FATAL (aucun arbre React monté). */
export interface FatalAlertView {
  readonly title: string;
  readonly body: string;
  readonly okLabel: string;
}

/**
 * Alerte de dernier recours : l'erreur est survenue AVANT qu'un écran puisse
 * être monté (évaluation d'un module, tâche native), il n'y a donc pas d'arbre
 * React pour rendre l'écran GRYD. On reste honnête quand même — même nuance
 * sur les données, et une reprise réelle (relancer l'app). Le détail technique
 * n'est recollé qu'en développement, à la fin, jamais en production.
 */
export function buildFatalAlertView(
  error: unknown,
  locale: Locale,
  isDev: boolean,
): FatalAlertView {
  const detail = technicalDetail(error, isDev);
  const body = resolve(C.crashAlertBody, locale);
  return {
    title: resolve(C.crashAlertTitle, locale),
    body: detail ? `${body}\n\n———\n${detail}` : body,
    okLabel: resolve(C.crashAlertOk, locale),
  };
}
