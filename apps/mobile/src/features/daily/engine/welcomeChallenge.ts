// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/welcomeChallenge.ts (drift testé côté Deno).

/**
 * GRYD — engine/welcomeChallenge.ts — LE DÉFI 7 JOURS D'ACCUEIL (A-45 §3, action 4).
 *
 * LE PROBLÈME QUE CE FICHIER RÉSOUT. Un nouveau joueur qui installe GRYD n'a
 * aucune idée de ce qu'il est censé faire les jours suivants : il court une fois,
 * capture peut-être, et l'app se tait. Le défi d'accueil est la rampe — cinq
 * paliers ordonnés (3 km → 5 km → boucle → capture → partage) qui font découvrir
 * la mécanique dans l'ordre où elle a du sens.
 *
 * ═══ CE QUI EST RÉUTILISÉ DE LA MIGRATION 0012 (et pourquoi c'est suffisant) ══
 * Rien n'est dupliqué. 0012 a déjà posé :
 *   · la table `challenges` (type/slug/fenêtre/visibilité/goals/RLS) — le défi
 *     d'accueil y est SEEDÉ comme n'importe quel autre challenge solo, donc il
 *     s'affiche dans l'écran Challenges existant, avec la RLS existante ;
 *   · la table `challenge_progress` (unique par challenge+kind+subject) ;
 *   · les colonnes de métriques `user_stats` qui portent les 5 paliers.
 * Aucune table n'est ajoutée pour ce défi, aucun compteur n'est créé.
 *
 * ═══ POURQUOI L'ÉTAT EST DÉRIVÉ, ET NON STOCKÉ ══════════════════════════════
 * Les cinq paliers se lisent INTÉGRALEMENT dans des colonnes `user_stats` que
 * `ingest_run` maintient déjà (best_run_distance_m, loop_runs, hexes_captured,
 * first_shares). Les recopier dans `challenge_progress` créerait une SECONDE
 * VÉRITÉ, qui dériverait au premier correctif de stats — et un écran qui affiche
 * « palier atteint » alors que le compteur dit le contraire, c'est exactement le
 * mensonge que la doctrine interdit. La progression est donc une PROJECTION
 * calculée ici, pure et rejouable, jamais un état parallèle à resynchroniser.
 * (Conséquence assumée : `challenge_progress` reste vide pour ce challenge —
 * `processChallenges` d'ingest_run l'ignore de lui-même, sa métrique de but
 * n'étant pas dans CHALLENGE_METRICS. C'est voulu, pas un oubli.)
 *
 * ═══ ANTI-SHAME : CE QUE CE TYPE NE CONTIENT DÉLIBÉRÉMENT PAS ═══════════════
 * Règle non négociable : on ne culpabilise JAMAIS un joueur qui a raté un jour.
 * Ce fichier l'applique par CONSTRUCTION, pas par prudence de copy :
 *   · aucun champ `late`, `missed`, `behind`, `expired`, `streakBroken` — ils
 *     n'existent pas, donc aucun écran ne peut les afficher un jour par erreur ;
 *   · aucun décompte de jours écoulés en sortie : le « 7 jours » est un RYTHME
 *     SUGGÉRÉ affiché en copy (WELCOME_STEPS[].day), jamais une échéance opposée
 *     au joueur ;
 *   · aucune remise à zéro : un palier franchi l'est DÉFINITIVEMENT, parce qu'il
 *     est adossé à un compteur cumulatif ou à un record, jamais à une fenêtre
 *     glissante. Ne pas courir pendant deux semaines ne retire rien.
 * La seule chose que la sortie sait dire, c'est ce qui est fait et ce qui vient
 * ensuite.
 *
 * Fonction PURE : aucune I/O, aucune horloge implicite, aucun aléa. Aucun nombre
 * magique — les paliers viennent de WELCOME_STEPS (@klaim/shared/game-rules).
 */
import { WELCOME_STEPS, type WelcomeMetric, type WelcomeStepKey } from '@klaim/shared';

// ─── Entrées : les compteurs RÉELS du joueur (user_stats) ────────────────────

/**
 * Les quatre compteurs qui portent les cinq paliers. Tous existent déjà en base
 * et sont alimentés par `ingest_run` — aucun n'est estimé, aucun n'est un défaut
 * sympathique. Un joueur tout neuf, sans ligne `user_stats`, vaut zéro partout :
 * c'est exactement vrai (il n'a encore rien fait), donc l'état affiché « 0 / 5 »
 * n'est pas un état dégradé mais un état juste.
 */
export interface WelcomeFacts {
  /** `user_stats.best_run_distance_m` — RECORD, jamais un cumul : le palier
   *  « 5 km » demande UNE course de 5 km, pas 5 km étalés sur la semaine. */
  bestRunDistanceM: number;
  /** `user_stats.loop_runs` — courses ayant réellement fermé une boucle. */
  loopRuns: number;
  /** `user_stats.hexes_captured` — zones réellement capturées (serveur). */
  hexesCaptured: number;
  /** `user_stats.first_shares` — partages réellement effectués. */
  shares: number;
}

// ─── Sortie ──────────────────────────────────────────────────────────────────

/** L'état d'UN palier. `value` est le compteur réel, montré tel quel. */
export interface WelcomeStepState {
  key: WelcomeStepKey;
  /** Jour SUGGÉRÉ (WELCOME_STEPS[].day) — un rythme proposé, jamais une limite. */
  suggestedDay: number;
  metric: WelcomeMetric;
  /** Seuil du palier (DATA game-rules). */
  target: number;
  /** Valeur réelle du compteur correspondant, non plafonnée. */
  value: number;
  done: boolean;
}

/**
 * L'état complet du défi. Deux formes seulement — et aucune n'est un échec :
 *  · `in_progress` : il reste au moins un palier, `next` dit lequel ;
 *  · `complete`    : les cinq sont franchis.
 * Il n'existe volontairement pas de troisième forme « raté » ou « expiré ».
 */
export type WelcomeChallenge =
  | {
      kind: 'in_progress';
      steps: readonly WelcomeStepState[];
      /** Le PREMIER palier non franchi, dans l'ordre du parcours. */
      next: WelcomeStepState;
      doneCount: number;
      total: number;
    }
  | {
      kind: 'complete';
      steps: readonly WelcomeStepState[];
      doneCount: number;
      total: number;
    };

// ─── Garde-fous d'entrée ─────────────────────────────────────────────────────

/**
 * Entier fini ≥ 0, sinon 0. Un compteur illisible ne doit JAMAIS franchir un
 * palier tout seul : dans le doute, le palier reste à faire — l'inverse
 * offrirait une progression que le joueur n'a pas gagnée.
 */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Lit le compteur réel adossé à une métrique de palier. */
function valueOf(facts: WelcomeFacts | null | undefined, metric: WelcomeMetric): number {
  switch (metric) {
    case 'bestRunDistanceM':
      return count(facts?.bestRunDistanceM);
    case 'loopRuns':
      return count(facts?.loopRuns);
    case 'hexesCaptured':
      return count(facts?.hexesCaptured);
    case 'shares':
      return count(facts?.shares);
    default:
      // Métrique inconnue (DATA élargie sans câblage) : palier INFRANCHISSABLE
      // plutôt qu'offert. Un palier bloqué se voit et se corrige ; un palier
      // offert par erreur ment silencieusement.
      return 0;
  }
}

// ─── La dérivation ───────────────────────────────────────────────────────────

/**
 * Projette les compteurs réels sur les cinq paliers d'accueil. PURE.
 *
 * Les paliers sont ÉVALUÉS INDÉPENDAMMENT, pas en cascade : un joueur qui
 * capture une zone dès sa première sortie voit ce palier franchi immédiatement,
 * même si « 5 km » ne l'est pas encore. Séquencer artificiellement reviendrait à
 * masquer un fait réel pour préserver une jolie progression — c'est-à-dire à
 * mentir sur ce que le joueur a fait.
 *
 * `next` reste, lui, le premier palier non franchi DANS L'ORDRE : l'écran a
 * toujours une seule chose à proposer (§A « 1 écran = 1 décision »).
 */
export function deriveWelcomeChallenge(facts: WelcomeFacts | null | undefined): WelcomeChallenge {
  const steps: WelcomeStepState[] = WELCOME_STEPS.map((s) => {
    const value = valueOf(facts, s.metric);
    return {
      key: s.key,
      suggestedDay: s.day,
      metric: s.metric,
      target: s.target,
      value,
      // `>=` et non `>` : atteindre le seuil, c'est le franchir.
      done: s.target > 0 && value >= s.target,
    };
  });

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const next = steps.find((s) => !s.done);

  if (next === undefined) return { kind: 'complete', steps, doneCount, total };
  return { kind: 'in_progress', steps, next, doneCount, total };
}
