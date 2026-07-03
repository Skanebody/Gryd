/**
 * GRYD — engine/social.ts (AMENDEMENT-07 §3, social Partie A). Fonctions PURES :
 * aucune I/O, aucune horloge. L'appelant (ingest_run) lit l'état, appelle ces
 * fonctions, persiste. Tous les seuils viennent de @klaim/shared/game-rules —
 * AUCUN nombre magique ici.
 *
 * Couvre : détection de Group Run (§3), résolution d'un hex contesté entre crews
 * (§3, pondération nb coureurs × trust, égalité neutre jamais volée), pénalité
 * anti-collusion sur historique de reprises (§11, approx MVP compteur d'alternances).
 */
import {
  COLLUSION_MAX_ALTERNATIONS,
  GROUP_RUN_HEX_SHARE_MIN,
  GROUP_RUN_START_TOLERANCE_MIN,
  SAME_CREW_CONTRIB_STEPS,
} from '@klaim/shared/game-rules';
import type { HexSocialStatus } from '@klaim/shared/types';

const MS_PER_MIN = 60_000;

// ─── §3 Détection de Group Run ────────────────────────────────────────────────

/** Résumé d'une course pour la détection de run groupé (fourni par l'appelant). */
export interface GroupRunRun {
  /** Départ epoch ms (ou ISO parsable) — ici on impose déjà epoch ms. */
  startedAtMs: number;
  /** Ensemble des index H3 (string) touchés par la trace claimable. */
  hexes: ReadonlySet<string> | readonly string[];
}

const asSet = (h: ReadonlySet<string> | readonly string[]): ReadonlySet<string> =>
  h instanceof Set ? h : new Set(h as readonly string[]);

/**
 * Deux courses forment-elles un Group Run (§3) ? PURE. Critères cumulés :
 *  1. départ ≤ GROUP_RUN_START_TOLERANCE_MIN minutes d'écart ;
 *  2. part d'hexes communs ≥ GROUP_RUN_HEX_SHARE_MIN (approx MVP du chevauchement
 *     de trace ≥ 70 % : |A∩B| / min(|A|,|B|)).
 * Deux courses sans hex → false (aucun chevauchement mesurable).
 */
export function detectGroupRun(runA: GroupRunRun, runB: GroupRunRun): boolean {
  const startGapMin = Math.abs(runA.startedAtMs - runB.startedAtMs) / MS_PER_MIN;
  if (startGapMin > GROUP_RUN_START_TOLERANCE_MIN) return false;

  const a = asSet(runA.hexes);
  const b = asSet(runB.hexes);
  const minSize = Math.min(a.size, b.size);
  if (minSize === 0) return false;

  let common = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const h of small) if (large.has(h)) common++;

  return common / minSize >= GROUP_RUN_HEX_SHARE_MIN;
}

/**
 * Contribution crew (part 0..1) du Nᵉ coureur d'un MÊME crew sur un hex
 * re-parcouru en Group Run (§6) : SAME_CREW_CONTRIB_STEPS[index], plafonné au
 * dernier pas de la table pour les indices au-delà. PURE. index 0 = 1ᵉʳ (capture).
 */
export function sameCrewContribStep(index: number): number {
  if (index < 0) return 0;
  const steps = SAME_CREW_CONTRIB_STEPS;
  return index < steps.length ? steps[index]! : steps[steps.length - 1]!;
}

// ─── §3 Résolution d'un hex contesté entre crews ──────────────────────────────

/** Présence d'un crew sur un hex contesté (nb de coureurs validés × trust moyen). */
export interface ContestedCrewPresence {
  crewId: string;
  /** Nombre de coureurs validés du crew ayant touché l'hex. */
  runners: number;
  /**
   * Trust moyen [0..1] des coureurs du crew (proxy §3 : motion/gps trust). Une
   * valeur ≤ 0 annule la contribution (course non fiable ne vole pas).
   */
  trust: number;
}

export interface ResolveContestedHexInput {
  /** Propriétaire crew actuel de l'hex (null = neutre). Jamais volé en égalité. */
  currentOwnerCrewId: string | null;
  /** Présences concurrentes sur l'hex dans la fenêtre (≥ 1 crew). */
  presences: readonly ContestedCrewPresence[];
}

export interface ResolveContestedHexResult {
  /** Crew propriétaire APRÈS résolution (null = reste neutre). */
  ownerCrewId: string | null;
  /** Statut social résultant (§13). */
  status: HexSocialStatus;
}

/** Contribution pondérée d'une présence : runners × trust, jamais négative. PURE. */
const weightOf = (p: ContestedCrewPresence): number =>
  Math.max(0, p.runners) * Math.max(0, p.trust);

/**
 * Résout un hex touché par plusieurs présences (§3). PURE.
 *  - Un SEUL crew présent : il possède l'hex (status `defended` s'il le tenait
 *    déjà, sinon `contested` reste `neutralized`→non : voir règles ci-dessous).
 *  - Plusieurs crews : le plus forte contribution pondérée (runners × trust)
 *    l'emporte → `contested` résolu ; ÉGALITÉ stricte → reste neutre/contesté,
 *    JAMAIS volé (`neutralized`) et un hex possédé n'est jamais volé en égalité.
 *  - Toutes les contributions nulles (trust 0) → aucun vol, statut `neutralized`.
 *
 * Règles précises :
 *  - même crew que le propriétaire seul en lice → `defended` (il conserve) ;
 *  - un seul crew, hex neutre → il capture, status `contested` (nouvelle prise
 *    signalée au résumé) ;
 *  - crews différents, vainqueur net → owner = vainqueur, status `contested` ;
 *  - égalité (y compris propriétaire ex æquo) → owner = propriétaire actuel,
 *    status `neutralized`.
 */
export function resolveContestedHex(
  input: ResolveContestedHexInput,
): ResolveContestedHexResult {
  const { currentOwnerCrewId, presences } = input;

  // Agrège par crew (un crew peut apparaître via plusieurs coureurs déjà cumulés,
  // mais on tolère des entrées multiples : on somme les poids).
  const weights = new Map<string, number>();
  for (const p of presences) {
    weights.set(p.crewId, (weights.get(p.crewId) ?? 0) + weightOf(p));
  }
  // Retire les crews à contribution nulle (trust 0 / 0 coureur : ne volent pas).
  for (const [crewId, w] of [...weights]) if (w <= 0) weights.delete(crewId);

  if (weights.size === 0) {
    // Aucune contribution fiable → rien ne change, statut neutralisé.
    return { ownerCrewId: currentOwnerCrewId, status: 'neutralized' };
  }

  // Plus forte contribution + détection d'égalité au sommet.
  let bestCrew: string | null = null;
  let bestWeight = -1;
  let tie = false;
  for (const [crewId, w] of weights) {
    if (w > bestWeight) {
      bestWeight = w;
      bestCrew = crewId;
      tie = false;
    } else if (w === bestWeight) {
      tie = true;
    }
  }

  // Égalité au sommet → jamais de vol : le propriétaire actuel conserve, neutralisé.
  if (tie) {
    return { ownerCrewId: currentOwnerCrewId, status: 'neutralized' };
  }

  // Vainqueur net.
  if (bestCrew === currentOwnerCrewId) {
    // Le propriétaire re-parcourt / domine → défense, pas de changement.
    return { ownerCrewId: currentOwnerCrewId, status: 'defended' };
  }
  // Un autre crew l'emporte → l'hex bascule contesté au profit du vainqueur.
  return { ownerCrewId: bestCrew, status: 'contested' };
}

// ─── §11 Anti-collusion ───────────────────────────────────────────────────────

/**
 * Historique ordonné (du plus ancien au plus récent) des crews ayant possédé un
 * hex donné lors de reprises contestées entre les mêmes crews. Chaque entrée =
 * crewId qui a pris l'hex à ce tour.
 */
export type ContestedHistory = readonly string[];

/**
 * Pénalité anti-collusion (§11, approx MVP) pour une reprise d'hex. PURE.
 * Compte les ALTERNANCES (changements de crew possédant) dans l'historique ;
 * au-delà de COLLUSION_MAX_ALTERNATIONS, le bonus vol est retiré et l'hex passe
 * `stats_only` (message doux côté appelant). Sinon `none` (reprise normale).
 * Un historique impliquant plus de 2 crews distincts n'est PAS de la collusion
 * (échange bilatéral seulement) → jamais pénalisé par ce détecteur MVP.
 */
export function collusionPenalty(history: ContestedHistory): 'none' | 'stats_only' {
  if (history.length < 2) return 'none';

  const distinct = new Set(history);
  // Le détecteur MVP ne vise que l'échange entre DEUX mêmes crews.
  if (distinct.size !== 2) return 'none';

  let alternations = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i] !== history[i - 1]) alternations++;
  }
  return alternations > COLLUSION_MAX_ALTERNATIONS ? 'stats_only' : 'none';
}
