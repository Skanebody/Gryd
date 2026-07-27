/**
 * GRYD — E07 « Connexion par e-mail » : les DÉCISIONS de l'écran, en pur.
 *
 * L'écran (`app/(auth)/email.tsx`) ne décide rien tout seul : il PEINT ce que
 * ces fonctions concluent. Aucune de ces conclusions n'a besoin de React, d'un
 * fuseau horaire, d'un fetch ou d'un mock — elles sont donc testables en Deno
 * (`emailLink.test.ts`, joué par `npm run test:mobile`), ce que ne serait jamais
 * une condition écrite au milieu d'un JSX.
 *
 * ═══ CE QUE CE MODULE N'A PAS LE DROIT DE FAIRE ═════════════════════════════
 * DEVINER. Trois refus explicites, chacun contre une tentation précise :
 *
 *  1. IL NE DIT JAMAIS QU'UNE ADRESSE EXISTE. `isEmailShapeValid` juge une
 *     FORME (« il y a un @, un domaine, un TLD ») et RIEN d'autre. L'existence
 *     d'une boîte ne se prouve que par la réception du lien ; l'affirmer depuis
 *     le client serait une donnée fabriquée.
 *
 *  2. IL NE DÉDUIT JAMAIS UN FOURNISSEUR D'UN DOMAINE. `@gmail.com` ne veut pas
 *     dire « ce compte est lié à Google » — des dizaines de milliers de comptes
 *     Gmail se connectent par mot de passe ou par lien. `existing_provider` ne
 *     sort d'ici QUE si le SERVEUR a nommé le fournisseur dans son erreur
 *     (marqueurs fermés ci-dessous). Sans phrase serveur : jamais.
 *
 *  3. IL NE TRANSFORME PAS UN SILENCE EN VERDICT. Un message d'erreur inconnu
 *     rend `'unknown'`, pas `'network'` ni `'rate_limited'` — se tromper de
 *     cause fait donner au joueur un conseil faux (« attends une minute »
 *     quand c'est son réseau qui est coupé).
 *
 * ═══ HONNÊTETÉ, ÉTAT DATÉ (27/07/2026) ══════════════════════════════════════
 * `existing_provider` est CODÉ et TESTÉ comme un mapping, mais il n'a JAMAIS
 * été observé en production : `requestEmailOtp` appelle `signInWithOtp` avec
 * `shouldCreateUser: true`, et GoTrue envoie alors le lien SANS dire si
 * l'adresse porte déjà une identité Apple/Google. Autrement dit : la branche
 * existe pour ne pas être improvisée le jour où la fusion de comptes (E06
 * « fusion par e-mail vérifié ») la remontera — elle ne prétend pas être
 * atteinte aujourd'hui. Les tests vérifient LE MAPPING (telle phrase → tel
 * verdict), jamais que le serveur envoie cette phrase.
 */
import { AUTH_EMAIL_RESEND_DELAY_S } from '@klaim/shared';

/**
 * Les motifs d'échec d'envoi — miroir EXACT du `reason` FERMÉ documenté sur
 * `EVENTS.authEmailLinkFailed` (packages/shared/src/events.ts). Un motif qui
 * n'est pas ici ne part pas en analytics.
 */
export type EmailLinkFailureReason =
  | 'invalid_email'
  | 'existing_provider'
  | 'rate_limited'
  | 'network'
  | 'unknown';

/** Fournisseurs externes que GRYD sait nommer. Marques : jamais traduites. */
export type ExternalProvider = 'Apple' | 'Google';

export interface EmailLinkFailure {
  readonly reason: EmailLinkFailureReason;
  /** Renseigné UNIQUEMENT sur `existing_provider`, et seulement si le serveur l'a nommé. */
  readonly provider?: ExternalProvider;
}

/** Verdict d'un lien OUVERT — miroir du `result` FERMÉ de `authEmailLinkOpened`. */
export type EmailLinkVerdict = 'expired' | 'invalid';

/**
 * Nettoyage minimal avant envoi : espaces de bord uniquement.
 *
 * On ne met PAS en minuscules, volontairement. La casse de la partie locale est
 * significative pour la RFC 5321, et surtout : l'écran réaffiche l'adresse dans
 * « Regarde dans {email} ». Afficher une adresse que le joueur n'a pas tapée le
 * ferait douter d'avoir bien saisi. On envoie et on affiche la MÊME chaîne.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim();
}

/**
 * FORME d'une adresse — le seul refus que le client a le droit de prononcer.
 *
 * Volontairement PERMISSIF : le juge final est le serveur. Une regex trop
 * stricte refuse des adresses valides (TLD longs, sous-domaines, `+`, tirets
 * dans le domaine, apostrophes dans la partie locale) et fabrique un mur là où
 * il n'y a pas de faute. On n'attrape donc que ce qui ne peut PAS être une
 * adresse : pas d'arobase, plusieurs arobases, un espace, pas de point dans le
 * domaine, un TLD d'un seul caractère, un point doublé ou en bord de partie.
 */
export function isEmailShapeValid(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length === 0) return false;
  // Deux points de suite ne sont valides dans AUCUNE des deux parties (hors
  // quoted-string, que personne ne tape à la main) — et c'est LA faute de frappe.
  if (email.includes('..')) return false;
  const at = email.indexOf('@');
  if (at <= 0) return false; // absent, ou en tête (partie locale vide)
  if (email.indexOf('@', at + 1) !== -1) return false; // un seul @
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.startsWith('-')) return false;
  // Un domaine sans point n'est joignable que sur un réseau interne : sur une
  // app grand public c'est une frappe inachevée (« ton@gmail »).
  const lastDot = domain.lastIndexOf('.');
  if (lastDot === -1) return false;
  const tld = domain.slice(lastDot + 1);
  if (tld.length < 2) return false;
  if (!/^[A-Za-z]+$/.test(tld)) return false;
  // Aucun blanc nulle part (un copier-coller depuis un SMS en amène souvent).
  return !/\s/.test(email);
}

/**
 * Marqueurs SERVEUR, en minuscules. Chaque famille est FERMÉE : on ne classe
 * que ce qu'on reconnaît, le reste tombe en `unknown` (voir refus n°3 en tête).
 * Les chaînes viennent de GoTrue / supabase-js — pas d'une supposition.
 */
const RATE_LIMIT_MARKERS = [
  'over_email_send_rate_limit',
  'rate limit',
  'too many requests',
  'for security purposes', // « For security purposes, you can only request this after N seconds »
] as const;

const INVALID_EMAIL_MARKERS = [
  'email_address_invalid',
  'unable to validate email address',
  'invalid email',
  'invalid format',
] as const;

const NETWORK_MARKERS = [
  'failed to fetch',
  'network request failed',
  'networkerror',
  'load failed',
  'timeout',
  'econnrefused',
  'err_internet_disconnected',
] as const;

/**
 * Marqueurs d'une identité DÉJÀ liée. Il en faut un ET un nom de fournisseur :
 * le mot « google » seul dans une phrase serveur ne dit rien (il peut venir
 * d'une URL). Voir l'encart d'honnêteté en tête : jamais observé à ce jour.
 */
const EXISTING_IDENTITY_MARKERS = [
  'identity_already_exists',
  'already linked',
  'already registered with',
  'already associated with',
] as const;

const PROVIDER_MARKERS: ReadonlyArray<readonly [string, ExternalProvider]> = [
  ['apple', 'Apple'],
  ['google', 'Google'],
];

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Message d'erreur SERVEUR → motif fermé (+ fournisseur s'il est nommé).
 *
 * ORDRE : du plus spécifique au plus vague. `existing_provider` d'abord (il
 * exige deux marqueurs, donc il ne peut pas voler un cas aux autres), puis la
 * cadence, puis la forme refusée côté serveur, puis le transport.
 *
 * `undefined` / chaîne vide → `'unknown'` : une erreur sans message est une
 * erreur qu'on ne sait pas nommer, pas une panne réseau.
 */
export function classifyEmailLinkFailure(message?: string): EmailLinkFailure {
  const m = (message ?? '').toLowerCase();
  if (m.length === 0) return { reason: 'unknown' };

  if (includesAny(m, EXISTING_IDENTITY_MARKERS)) {
    const named = PROVIDER_MARKERS.find(([marker]) => m.includes(marker));
    // Identité déjà liée MAIS fournisseur non nommé : on ne le devine pas —
    // proposer « Continue avec Apple » au hasard enverrait dans un mur.
    if (named) return { reason: 'existing_provider', provider: named[1] };
    return { reason: 'unknown' };
  }
  if (includesAny(m, RATE_LIMIT_MARKERS)) return { reason: 'rate_limited' };
  if (includesAny(m, INVALID_EMAIL_MARKERS)) return { reason: 'invalid_email' };
  if (includesAny(m, NETWORK_MARKERS)) return { reason: 'network' };
  return { reason: 'unknown' };
}

/**
 * Secondes restantes avant que « Renvoyer le lien » soit armé.
 *
 * Le délai vient de `AUTH_EMAIL_RESEND_DELAY_S` (game-rules) : c'est la cadence
 * que l'expéditeur impose, pas une politesse d'UI — armer plus tôt peindrait un
 * bouton condamné au refus (constitution §2).
 *
 * BORNÉ DES DEUX CÔTÉS. `nowMs < sentAtMs` arrive pour de vrai (horloge remise
 * à l'heure, passage à l'heure d'hiver, appareil réveillé) : sans plafond, le
 * compte à rebours afficherait des milliers de secondes et le bouton ne
 * reviendrait jamais. On plafonne au délai, donc au pire on attend une fois.
 */
export function resendSecondsLeft(
  sentAtMs: number,
  nowMs: number,
  delayS: number = AUTH_EMAIL_RESEND_DELAY_S,
): number {
  if (!Number.isFinite(sentAtMs) || !Number.isFinite(nowMs)) return delayS;
  const remainingMs = sentAtMs + delayS * 1000 - nowMs;
  if (remainingMs <= 0) return 0;
  return Math.min(delayS, Math.ceil(remainingMs / 1000));
}

/** Le renvoi est-il ARMÉ ? (sucre lisible : `secondsLeft === 0`). */
export function canResend(sentAtMs: number, nowMs: number, delayS?: number): boolean {
  return resendSecondsLeft(sentAtMs, nowMs, delayS) === 0;
}

/** Ce qu'expo-router rend pour un paramètre d'URL (absent, unique, ou répété). */
export type RouteParam = string | string[] | undefined;

function firstParam(value: RouteParam): string {
  if (value === undefined) return '';
  return (Array.isArray(value) ? (value[0] ?? '') : value).toLowerCase();
}

/**
 * Verdict d'un lien OUVERT, lu dans les paramètres d'URL du retour GoTrue.
 *
 * GoTrue renvoie `error=access_denied`, `error_code=otp_expired`,
 * `error_description=Email+link+is+invalid+or+has+expired` quand le lien a
 * servi ou a dépassé sa durée de vie. On distingue DEUX verdicts, parce qu'ils
 * appellent deux phrases différentes : « expiré » (normal, on en redemande un)
 * et « incomplet » (le lien a été recopié à la main / coupé par le client mail).
 *
 * `null` = AUCUN verdict : ni succès ni échec — l'écran ne doit alors rien
 * affirmer sur le lien (constitution §1 : un silence n'est pas une réponse).
 */
export function linkVerdictFromParams(params: {
  error?: RouteParam;
  error_code?: RouteParam;
  error_description?: RouteParam;
}): EmailLinkVerdict | null {
  const code = firstParam(params.error_code);
  const desc = firstParam(params.error_description);
  const err = firstParam(params.error);
  if (code.length === 0 && desc.length === 0 && err.length === 0) return null;
  if (code.includes('expired') || desc.includes('expired')) return 'expired';
  return 'invalid';
}
