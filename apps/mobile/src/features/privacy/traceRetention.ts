/**
 * GRYD — LA CONSERVATION DES TRACÉS : forme, décodage, verdicts.
 *
 * Module PUR (zéro import React / React Native / Supabase) : testable sous
 * Deno. L'I/O vit dans `./audienceStore.ts` (le réglage) et `./traceDelete.ts`
 * (l'effacement d'UNE sortie).
 *
 * ═══ LA DÉCISION, ET LA CONTRADICTION QU'ELLE FERME ═════════════════════════
 * Décision du fondateur, 11/09/2026 : « Trace GPS : ce qui est le plus adapté,
 * ou mettre dans les réglages l'option, mais ne pas purger directement. »
 *
 * Le serveur gardait DEUX formes de la même trace, avec deux durées de vie
 * opposées, et le joueur n'avait son mot à dire sur aucune :
 *   · `runs.polyline_masked` — trace expurgée, PURGÉE À 90 JOURS POUR TOUT LE
 *     MONDE (migrations 0101 + 0102) ;
 *   · `runs.trace_points_2026` — les points COMPLETS et horodatés (0118),
 *     JAMAIS purgée, par rien.
 * Depuis 0195/0196, la conservation est un CHOIX, il vaut `keep` par défaut, et
 * il gouverne les DEUX formes ensemble.
 *
 * ═══ POURQUOI CE MODULE NE PORTE AUCUN DÉFAUT DE REPLI ══════════════════════
 * `keep` est le défaut du SERVEUR (colonne `user_profiles.trace_retention_2026`).
 * Ce module ne le fabrique jamais côté client : quand le serveur n'a rien dit,
 * il rend `null`, et l'écran affiche « on n'a pas pu lire ta préférence ». Dire
 * « Tout est conservé » sans que le serveur l'ait dit serait exactement le repli
 * inventé que L19 interdit — sur la page qui gouverne une donnée de
 * localisation, deviner c'est affirmer.
 */
import {
  TRACE_RETENTION_CHOICES_2026,
  TRACE_RETENTION_DAYS_2026,
  type TraceRetentionChoice2026,
} from '@klaim/shared';

export type { TraceRetentionChoice2026 };

/**
 * L'ordre d'affichage EST celui de la constante partagée : le défaut d'abord,
 * puis la durée la plus longue de conservation, puis la plus courte. On ne
 * réordonne pas ici — deux ordres divergeraient au premier arbitrage.
 */
export const TRACE_RETENTION_ORDER = TRACE_RETENTION_CHOICES_2026;

/** Nombre de jours d'une conservation, ou `null` quand il n'y en a pas. */
export function traceRetentionDays(choice: TraceRetentionChoice2026): number | null {
  return TRACE_RETENTION_DAYS_2026[choice];
}

/**
 * Charge utile `traceRetention` de `my_privacy_settings_2026()` → choix typé,
 * ou `null`.
 *
 * ⚠️ TROIS SITUATIONS, UNE SEULE RÉPONSE, ET C'EST VOULU : clé absente (serveur
 * antérieur à 0195), valeur inconnue, ou `null` explicite rendent tous `null`.
 * Elles ont en commun la seule chose qui compte pour l'écran : LE SERVEUR N'A
 * PAS DIT ce qu'il applique. La phrase à afficher est donc la même.
 */
export function parseTraceRetention(raw: unknown): TraceRetentionChoice2026 | null {
  return typeof raw === 'string' &&
    (TRACE_RETENTION_CHOICES_2026 as readonly string[]).includes(raw)
    ? (raw as TraceRetentionChoice2026)
    : null;
}

/** Verdict d'une écriture de conservation. Les quatre issues sont DISTINCTES. */
export type TraceRetentionWrite =
  /** Le serveur a acquitté : la valeur rendue est celle qu'il applique. */
  | { readonly kind: 'saved'; readonly choice: TraceRetentionChoice2026 }
  /** Aucun backend joignable ou aucune session : rien n'a été tenté. */
  | { readonly kind: 'signed-out' }
  /** Aucun profil : le serveur refuse, et l'écran conduit à sa création. */
  | { readonly kind: 'profile-required' }
  /** Refus ou réseau : RIEN n'a changé côté serveur, et il faut le dire. */
  | { readonly kind: 'failed' };

/**
 * Traduit l'erreur PostgREST/PostgreSQL en verdict. `profile_required` a son
 * cas à lui : c'est le seul refus auquel le joueur peut REMÉDIER (même
 * doctrine que `privacyWriteFailure`).
 */
export function traceRetentionWriteFailure(message: string): TraceRetentionWrite {
  return message.includes('profile_required')
    ? { kind: 'profile-required' }
    : { kind: 'failed' };
}

/**
 * L'issue d'un effacement à la demande (`delete_run_trace_2026`, 0195).
 *
 * SIX ISSUES, PARCE QU'ELLES N'APPELLENT PAS LA MÊME PHRASE :
 *  · `deleted`      — le tracé est parti, les mesures et le terrain restent ;
 *  · `already-empty`— il n'y avait plus de tracé. Ce n'est ni un succès à
 *                     fêter, ni un échec : c'est un fait, et l'écran le dit ;
 *  · `review-open`  — LE PLANCHER ANTI-TRICHE. Une revue (0081) ou un recours
 *                     est ouvert sur cette sortie : son tracé EST la preuve du
 *                     dossier. Refus TEMPORAIRE et nommé, pas une confiscation ;
 *  · `not-found`    — identifiant inconnu OU sortie d'autrui. Les deux ont le
 *                     même refus côté serveur : les distinguer dirait à qui
 *                     forge un identifiant que la sortie existe (§12) ;
 *  · `signed-out`   — pas de session, pas de backend : rien n'a été tenté ;
 *  · `failed`       — réseau ou refus inattendu. RIEN n'a été effacé.
 */
export type TraceDeleteOutcome =
  | { readonly kind: 'deleted' }
  | { readonly kind: 'already-empty' }
  | { readonly kind: 'review-open' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'failed' };

/**
 * Message d'erreur serveur → issue. Les refus sont NOMMÉS côté SQL
 * (`TRACE_DELETE_REFUSALS_2026`), donc la traduction ne devine pas : ce qui
 * n'est pas reconnu tombe sur `failed`, jamais sur un succès optimiste.
 */
export function traceDeleteFailure(message: string): TraceDeleteOutcome {
  if (message.includes('review_open')) return { kind: 'review-open' };
  if (message.includes('not_found')) return { kind: 'not-found' };
  if (message.includes('authentication_required')) return { kind: 'signed-out' };
  return { kind: 'failed' };
}

/**
 * Charge utile de `delete_run_trace_2026` → issue.
 *
 * On lit `deleted` du SERVEUR plutôt que de supposer le succès dès qu'aucune
 * erreur n'est remontée : la RPC est idempotente et distingue « effacé » de
 * « il n'y avait rien à effacer ». Une forme inattendue rend `failed` — jamais
 * un « c'est fait » sur une réponse qu'on n'a pas comprise.
 */
export function parseTraceDelete(raw: unknown): TraceDeleteOutcome {
  if (raw === null || typeof raw !== 'object') return { kind: 'failed' };
  const row = raw as Record<string, unknown>;
  if (row.deleted === true) return { kind: 'deleted' };
  if (row.deleted === false && row.reason === 'already_empty') return { kind: 'already-empty' };
  return { kind: 'failed' };
}
