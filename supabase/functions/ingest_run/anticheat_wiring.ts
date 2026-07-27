/**
 * GRYD — ingest_run/anticheat_wiring.ts : L'ANTI-TRICHE ENTRE EN SERVICE (§11).
 *
 * ═══ CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS ═════════════════════════
 * FAIT   : à partir (a) du verdict §3.2 déjà rendu par `validateOrStatus` et
 *          (b) de la trace BRUTE reçue, il appelle `scoreRun`
 *          (packages/engine/src/anticheat.ts, 20 tests, PUR) et en TIRE LES
 *          CONSÉQUENCES : quel `runs.status` la course porte, et si une ligne
 *          `anticheat_reviews` (migration 0081) doit exister.
 * NE FAIT PAS : aucune lecture, aucune écriture, aucune horloge (`nowMs` est
 *          INJECTÉ), et surtout AUCUNE règle anti-triche — les neuf signaux, la
 *          pondération et les quatre décisions vivent dans le moteur. Ce fichier
 *          ne fait que l'APPELER avec les bonnes entrées et TRADUIRE son avis
 *          dans le vocabulaire que la base et l'écran de résultat parlent déjà.
 *
 * ═══ POURQUOI UN FICHIER SÉPARÉ ═════════════════════════════════════════════
 * `index.ts` appelle `Deno.serve` au chargement : il n'est pas importable, donc
 * pas testable. Patron déjà établi par `validate.ts`, `dedup.ts`, `territory.ts`,
 * `contest_wiring.ts`. Sans ce fichier, « une course invraisemblable ouvre une
 * revue » resterait une intention non prouvée — exactement l'état que ce
 * chantier referme : jusqu'ici `scoreRun` était une règle exécutable que
 * PERSONNE n'exécutait, et `anticheat_reviews` une table vide à jamais.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ═══ LA CORRESPONDANCE : 4 DÉCISIONS MOTEUR → 4 STATUTS DE COURSE ═══════════
 * ════════════════════════════════════════════════════════════════════════════
 * `runs.status` est contraint à `valid | partial | flagged | rejected`
 * (0002_schema.sql:105) et ce chantier n'a PAS le droit d'y toucher. Voici la
 * correspondance retenue, et la raison de chaque ligne :
 *
 *  ┌──────────────────────┬───────────────┬──────────────────┬───────────────┐
 *  │ décision `scoreRun`  │ `runs.status` │ capture créditée │ ligne de revue│
 *  ├──────────────────────┼───────────────┼──────────────────┼───────────────┤
 *  │ PASS                 │ INCHANGÉ      │ oui              │ non           │
 *  │                      │ (`valid`)     │                  │               │
 *  │ PASS_WITH_EXCLUSIONS │ INCHANGÉ      │ oui, partielle   │ non           │
 *  │                      │ (`partial`)   │                  │               │
 *  │ MANUAL_REVIEW        │ `flagged`     │ NON              │ MANUAL_REVIEW │
 *  │ REJECT               │ `flagged`     │ NON              │ REJECT        │
 *  └──────────────────────┴───────────────┴──────────────────┴───────────────┘
 *
 * ── PASS et PASS_WITH_EXCLUSIONS NE CHANGENT RIEN, ET CE N'EST PAS UN OUBLI ──
 * `PASS_WITH_EXCLUSIONS` naît de `claimableSegments(...).excluded.length > 0` —
 * LE MÊME appel, sur LES MÊMES segments, que celui que `validateOrStatus` fait
 * déjà (validate.ts) et dont il tire `status: 'partial'`. Les segments écartés
 * le sont donc DÉJÀ, par le pipeline en vigueur, avant que ce module existe :
 * l'anti-triche NOMME ici ce que la validation faisait, il ne l'ajoute pas.
 * Ré-exclure quoi que ce soit serait exclure deux fois. C'est pour cela que
 * `runStatus` vaut `null` (= « laisse le verdict §3.2 tel quel ») sur ces deux
 * décisions : le comportement actuel est préservé au sens strict.
 *
 * ── ⚠️ POURQUOI `REJECT` ATTERRIT SUR `flagged` ET NON SUR `rejected` ────────
 * Ce n'est PAS une clémence, et il faut le démontrer plutôt que l'affirmer.
 *
 *  1. CE QUE ÇA NE CHANGE PAS. Dans `ingest_run`, `flagged` et `rejected`
 *     suivent EXACTEMENT le même chemin : même branche « non claimable »,
 *     `points_awarded = 0`, `xp_awarded = 0`, `newBadges: []`, aucune écriture
 *     hex, `applyRunToStats` les ignore l'un comme l'autre, la série n'avance
 *     pas (`streakAfterRun(false)`), et `awardRejectedRun` remet `cleanDays` à
 *     zéro dans les DEUX cas. La sévérité EFFECTIVE est identique ; seul le MOT
 *     diffère.
 *  2. POURQUOI LE MOT NE PEUT PAS ÊTRE `rejected` AUJOURD'HUI. Un refus PORTE
 *     SA RAISON : le type `ValidationOutcome` exige `reason: RejectReason`, et
 *     `RejectReason` est une union FERMÉE de règles de JEU §3.2 (`too_short`,
 *     `too_brief`, `pace_too_fast`, `pace_too_slow`, `too_far`,
 *     `no_valid_points`). Aucune n'est vraie d'un refus anti-triche, et en
 *     réutiliser une mentirait sur la règle qui a tranché. Écrire `rejected`
 *     avec une raison NULLE produirait l'autre faute : l'écran de résultat
 *     afficherait « CAPTURE REFUSÉE » et RIEN d'autre (`rejectCopy` est résolu
 *     défensivement, course-result.tsx:492/963) — un refus muet.
 *     Ajouter `'anticheat'` à `RejectReason` touche `packages/shared/src/types.ts`
 *     et les catalogues i18n, HORS du périmètre de ce chantier : c'est inscrit
 *     en suspens, pas contourné en douce.
 *  3. OÙ VIT LA VRAIE DISTINCTION. Dans `anticheat_reviews.system_decision`,
 *     qui vaut bien `'REJECT'` — c'est la colonne que l'écran d'appel (E28) lit,
 *     et c'est là que §11.3 attend la décision système. Le joueur peut faire
 *     appel des deux, exactement comme §11.4 le demande.
 *
 * ── CE QUE `flagged` DIT DÉJÀ, ET POURQUOI ON N'Y TOUCHE PAS ────────────────
 * La copie de l'écran de résultat (`heroFlagged` / `flaggedWhy`) a été corrigée
 * pour NE PLUS promettre d'examen, et son docblock l'INTERDIT tant que la revue
 * n'existe pas. La revue existe désormais — mais PERSONNE ne la dépile
 * (0081, « CE QUI RESTE EN SUSPENS », point 2 : aucun opérateur, aucun rôle,
 * aucune habilitation). La condition posée par ce docblock n'est donc PAS
 * remplie : la copie reste inchangée par ce chantier. Reparler d'« examen »
 * parce qu'une table s'est remplie serait refaire la faute d'origine un cran
 * plus loin.
 *
 * ── QUAND L'ANTI-TRICHE NE SE PRONONCE PAS ──────────────────────────────────
 * Si le verdict §3.2 n'est PAS `claimable`, la course n'est déjà pas créditée
 * ET elle porte une raison de JEU précise (« trop courte », « allure hors
 * bornes »). Superposer une suspicion y ferait deux dégâts : dire à quelqu'un
 * qu'il est soupçonné alors qu'il a simplement couru 200 m, et remplir la file
 * de dossiers qu'aucun opérateur n'a de raison d'ouvrir. Le moteur le dit
 * lui-même : `scoreRun` « ne REMPLACE PAS validateRun ». On ne le fait donc pas
 * tourner du tout — et le plan porte la raison de ce silence (`skipped`), au
 * lieu de rendre un rapport vide qu'on croirait « propre ».
 *
 * PURE : aucune I/O, aucune horloge, aucun `Date.now()`, aucun aléa.
 */
import {
  type AntiCheatDecision,
  type AntiCheatReport,
  creditsCapture,
  scoreRun,
} from '../_shared/engine/anticheat.ts';
import type { Activity } from '../_shared/game-rules.ts';
import type { RunPoint, RunSource, RunStatus } from '../_shared/types.ts';
import type { ValidationOutcome } from './validate.ts';

/**
 * La correspondance du tableau ci-dessus, sous forme de donnée LISIBLE ET
 * TESTABLE plutôt que d'un `switch` enfoui. `null` = « le statut §3.2 reste
 * celui qu'il était » ; c'est ce qui garantit qu'une course PASS se comporte
 * aujourd'hui exactement comme hier.
 */
export const ANTICHEAT_RUN_STATUS: Readonly<
  Record<AntiCheatDecision, Extract<RunStatus, 'flagged'> | null>
> = {
  PASS: null,
  PASS_WITH_EXCLUSIONS: null,
  MANUAL_REVIEW: 'flagged',
  REJECT: 'flagged',
};

/**
 * Les deux seules décisions qui ouvrent une ligne `anticheat_reviews`. La
 * migration 0081 le contraint en SQL (`check (system_decision in
 * ('MANUAL_REVIEW', 'REJECT'))`) ; le type le contraint ici, pour que l'erreur
 * se voie au typecheck plutôt qu'en production.
 */
export type ReviewableDecision = Extract<AntiCheatDecision, 'MANUAL_REVIEW' | 'REJECT'>;

/** Pourquoi l'anti-triche ne s'est pas prononcé sur cette course. */
export type AntiCheatSkipReason =
  /** Le verdict §3.2 n'était pas `claimable` : une règle de jeu a déjà tranché. */
  | 'not_claimable';

/**
 * La ligne à insérer dans `public.anticheat_reviews` — en `snake_case`, prête
 * pour PostgREST. `run_id` et `user_id` ne sont PAS ici : ils n'existent pas
 * encore au moment où le plan est calculé (la course n'est pas insérée). C'est
 * `buildReviewRow` qui les scelle, juste avant l'écriture.
 */
export interface AntiCheatReviewDraft {
  readonly system_decision: ReviewableDecision;
  /** Score pondéré 0-100 rendu par le moteur (`smallint`, borné par 0081). */
  readonly suspicion: number;
  /** `AntiCheatSignal[]` sérialisé : sévérités, poids, PREUVES CHIFFRÉES. */
  readonly signals: AntiCheatReport['signals'];
}

export interface AntiCheatWiringInput {
  /**
   * Le verdict §3.2 TEL QUEL, avant anti-triche. C'est lui qui décide si le
   * moteur tourne, et c'est de lui que le plan repart quand la décision ne
   * change rien.
   */
  readonly verdict: ValidationOutcome;
  /**
   * La trace BRUTE, non filtrée. Le moteur y tient : `filterPoints` supprime
   * justement les points trop rapides, donc mesurer la vitesse soutenue après
   * filtrage rendrait TOUJOURS zéro (cf. `scoreRun`, signal 1).
   */
  readonly points: readonly RunPoint[];
  /** Discipline effective, déjà résolue par le handler (`effectiveActivity`). */
  readonly activity: Activity;
  /** Podomètre. Absent ⇒ signal indisponible, jamais défavorable. */
  readonly stepCount?: number;
  /** Origine de la trace. Reportée dans le rapport, JAMAIS scorée. */
  readonly source?: RunSource;
  /** Horloge INJECTÉE (epoch ms) — ce module n'en lit aucune. */
  readonly nowMs: number;
  /**
   * Empreintes des traces déjà enregistrées par CE joueur.
   *
   * ⚠️ `undefined` AUJOURD'HUI, et volontairement : `runs` ne conserve aucune
   * trace exploitable (`polyline_masked` n'est jamais écrit par `ingest_run`,
   * et `polyline_hash` est un SHA-256 de forme canonique, pas l'empreinte
   * tolérante du moteur). Fournir un `[]` serait pire que `undefined` : le
   * moteur le lirait comme « signal DISPONIBLE et négatif », c'est-à-dire
   * comme la preuve qu'aucun antécédent ne colle — une affirmation qu'aucune
   * lecture ne soutient. Le signal `duplicate_trace` reste donc indisponible,
   * avec la raison que le moteur écrit lui-même dans le rapport.
   *
   * Ce n'est pas un trou dans la défense : le rejeu d'une course est déjà
   * attrapé EN AMONT par `findDuplicateRun` (dedup.ts, hash + fenêtre
   * durée/distance/départ, sur TOUT l'historique), qui sort avant même que ce
   * module soit appelé.
   */
  readonly priorTraceFingerprints?: readonly string[];
}

export interface AntiCheatPlan {
  /**
   * Le verdict à utiliser POUR LA SUITE du handler : identique à l'entrée quand
   * la décision crédite, DÉCLASSÉ en `flagged` sinon. Un seul objet à propager,
   * pour qu'aucune branche en aval ne puisse lire l'ancien par erreur.
   */
  readonly verdict: ValidationOutcome;
  /** Le rapport complet, ou `null` si le moteur n'a pas tourné. */
  readonly report: AntiCheatReport | null;
  /** La décision du moteur, ou `null` s'il n'a pas tourné. */
  readonly decision: AntiCheatDecision | null;
  /** Renseigné exactement quand `report` est `null`. */
  readonly skipped: AntiCheatSkipReason | null;
  /** La revue à créer, ou `null` quand la capture est créditée. */
  readonly review: AntiCheatReviewDraft | null;
  /** Le verdict §3.2 a-t-il été déclassé par l'anti-triche ? */
  readonly downgraded: boolean;
}

/**
 * §11.1 → §11.3 → base : l'avis du moteur, traduit en conséquences.
 *
 * PURE et DÉTERMINISTE. Deux appels avec la même entrée rendent le même plan —
 * propriété indispensable ici : c'est elle qui fait qu'un renvoi du même
 * `clientRunId` ne peut pas produire une décision différente de la première.
 */
export function planAntiCheat(input: AntiCheatWiringInput): AntiCheatPlan {
  // Le moteur ne tourne QUE sur une course que §3.2 aurait créditée (cf.
  // docblock, « QUAND L'ANTI-TRICHE NE SE PRONONCE PAS »).
  if (input.verdict.kind !== 'claimable') {
    return {
      verdict: input.verdict,
      report: null,
      decision: null,
      skipped: 'not_claimable',
      review: null,
      downgraded: false,
    };
  }

  const report = scoreRun({
    points: input.points,
    activity: input.activity,
    stepCount: input.stepCount,
    source: input.source,
    now: input.nowMs,
    priorTraceFingerprints: input.priorTraceFingerprints,
  });

  // PASS / PASS_WITH_EXCLUSIONS : le verdict §3.2 est rendu INTACT. Les segments
  // écartés l'ont déjà été par `claimableSegments` en amont — l'anti-triche les
  // NOMME, il ne les retire pas une seconde fois.
  if (creditsCapture(report.decision)) {
    return {
      verdict: input.verdict,
      report,
      decision: report.decision,
      skipped: null,
      review: null,
      downgraded: false,
    };
  }

  // MANUAL_REVIEW / REJECT : la capture n'est PAS créditée. Le verdict tombe sur
  // `flagged` — le seul état que `runs.status` sache porter sans inventer une
  // raison de refus qui n'existe pas (cf. docblock).
  const decision = report.decision as ReviewableDecision;
  return {
    verdict: {
      kind: 'flagged',
      // Les trois scores de confiance sont CONSERVÉS TELS QUELS : ils décrivent
      // la QUALITÉ DU SIGNAL (§3.2 / GRYD Verify), pas la suspicion. Les
      // écraser ferait dire à `runs.gps_trust` une chose qu'aucune mesure n'a
      // constatée, et la course perdrait la seule trace de ce qui a été mesuré.
      gpsTrust: input.verdict.gpsTrust,
      motionTrust: input.verdict.motionTrust,
      trustScore: input.verdict.trustScore,
    },
    report,
    decision,
    skipped: null,
    review: {
      system_decision: decision,
      suspicion: report.suspicion,
      signals: report.signals,
    },
    downgraded: true,
  };
}

/**
 * La ligne `anticheat_reviews` complète, une fois la course insérée et son id
 * connu. Séparée de `planAntiCheat` parce que le `run_id` n'existe qu'APRÈS
 * l'écriture de `runs` — et qu'un plan qui prétendrait le connaître avant
 * mentirait sur l'ordre réel des opérations.
 *
 * Les colonnes NON écrites ici le sont exprès : `status` part du DEFAULT
 * (`'open'`), `opened_at` de `now()` côté base, et `final_decision` /
 * `operator_id` / `operator_note` restent NULL — il n'y a pas d'opérateur, et
 * pré-remplir ces champs affirmerait qu'un dossier a été regardé.
 */
export function buildReviewRow(args: {
  readonly runId: string;
  readonly userId: string;
  readonly review: AntiCheatReviewDraft;
}): Record<string, unknown> {
  return {
    run_id: args.runId,
    // Dénormalisé depuis `runs.user_id`, comme 0081 l'exige : la policy RLS le
    // lit à chaque ligne sans dépendre d'une seconde policy.
    user_id: args.userId,
    system_decision: args.review.system_decision,
    suspicion: args.review.suspicion,
    signals: args.review.signals,
  };
}

/**
 * Code d'erreur PostgREST/Postgres d'une violation de contrainte unique.
 * `anticheat_reviews.run_id` est `unique` (0081) : c'est LA contrainte qui rend
 * l'écriture idempotente.
 *
 * POURQUOI PAR LA CONTRAINTE ET NON PAR UN `select` PRÉALABLE. Un « la revue
 * existe-t-elle déjà ? » suivi d'un `insert` a une FENÊTRE DE COURSE : deux
 * renvois simultanés du même `clientRunId` liraient tous deux « non », puis
 * insèreraient tous deux — et le second échouerait quand même, sur la même
 * contrainte, mais après avoir coûté un aller-retour de plus et donné
 * l'illusion d'une vérification. La base tranche ; on lit son verdict.
 */
export const UNIQUE_VIOLATION = '23505';

/**
 * Une erreur d'insertion de revue est-elle le signe BÉNIN qu'une revue existait
 * déjà pour cette course (renvoi concurrent), ou une vraie panne ?
 *
 * `true` ⇒ ne rien faire : la revue voulue est là, écrite par le premier
 * arrivant, avec le MÊME contenu (`planAntiCheat` est déterministe).
 */
export function isDuplicateReview(errorCode: string | null | undefined): boolean {
  return errorCode === UNIQUE_VIOLATION;
}
