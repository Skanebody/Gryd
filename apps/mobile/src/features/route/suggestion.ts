/**
 * GRYD — LA PROPOSITION DE PARCOURS PERSONNALISÉE (demande fondateur 21/07).
 *
 * ═══ LE MENSONGE QUE CE FICHIER SUPPRIME ════════════════════════════════════
 * Le Route Planner affichait la puce « Adaptée à tes habitudes »
 * (features/route/demo.ts, ROUTE_REASONS) alors qu'AUCUN code n'apprenait quoi
 * que ce soit : la distance proposée était la constante `GEN_DEFAULT_KM`, la
 * même pour tout le monde, tous les jours. C'est exactement la famille de bugs
 * `users.streak_weeks` / `daily_zone_awards` : un écran qui affirme un calcul
 * que le produit ne fait pas. Ici, soit la personnalisation est RÉELLE et on la
 * nomme, soit elle ne l'est pas et on le DIT — jamais d'entre-deux flatteur.
 *
 * ═══ CE QUE CE MODULE EST ═══════════════════════════════════════════════════
 * Une dérivation PURE : (profil d'habitudes, réglages, bornes) → une distance +
 * la RAISON de cette distance. Aucun réseau, aucune horloge, aucun état — donc
 * testable hors app, et la copie affichée ne peut pas diverger de la décision
 * (les deux sortent du même objet `RouteSuggestion`).
 *
 * ═══ CE QUE CE MODULE N'EST PAS ═════════════════════════════════════════════
 *   · Il ne CALCULE pas le profil d'habitudes. Les FAITS viennent du serveur
 *     (RPC `habits_inputs`, bornée à auth.uid()) et le calcul vit dans
 *     `computeHabitsProfile` (@klaim/shared), pour la raison de fond exposée
 *     plus bas : ce sont des données de localisation, elles ne transitent pas et
 *     ne se croisent jamais entre joueurs.
 *   · Il n'attribue RIEN. Une proposition de parcours ne donne aucun point,
 *     aucune zone, aucune protection, aucun bonus de decay — anti pay-to-win
 *     STRICT (§22). C'est structurel et pas seulement déclaratif : la sortie de
 *     ce module est UNE DISTANCE EN KILOMÈTRES et une phrase. Aucun claim,
 *     aucun score, aucun identifiant de zone ne peut en sortir, donc aucun
 *     chemin de code ne peut transformer « on t'a suggéré 5 km » en avantage.
 *     Un coureur qui ignore la suggestion joue exactement le même jeu.
 *
 * ═══ VIE PRIVÉE — POURQUOI CETTE FORME, ET PAS UNE AUTRE ════════════════════
 * Apprendre les habitudes de course, c'est du profilage sur des données de
 * localisation. Quatre contraintes structurent le contrat :
 *
 *  1. DONNÉES DE L'APPELANT UNIQUEMENT. La RPC lit `public.runs` sous RLS avec
 *     `auth.uid()`. Aucun agrégat d'autrui, aucune comparaison entre joueurs :
 *     un profil n'est jamais construit à partir de la course de quelqu'un
 *     d'autre, même anonymisée.
 *  2. AUCUNE COORDONNÉE NE REMONTE ICI. Le profil transporte des SCALAIRES
 *     (une distance typique, un nombre de courses) — jamais un point de départ,
 *     jamais un tracé, jamais un secteur favori. C'est délibéré et contraignant :
 *     le domicile est flouté à 500 m par défaut, et un « profil d'habitudes »
 *     qui renverrait un point de convergence quotidien ré-exposerait très
 *     exactement ce que le floutage protège. Une distance ne localise personne.
 *  3. CONSULTABLE ET CORRIGIBLE. `RouteSuggestion` expose la source ET les
 *     faits qui l'ont produite (`sampleRuns`) : l'utilisateur peut lire ce qui a
 *     été déduit de lui, et le réglage manuel PRIME toujours sur l'apprentissage
 *     (cf. ordre de priorité ci-dessous) — corriger, c'est régler.
 *  4. DÉSACTIVABLE. `learningEnabled: false` court-circuite tout : l'appelant ne
 *     doit alors même pas interroger la RPC. L'écran ne prétend pas pour autant
 *     être personnalisé — il bascule sur `source: 'default'`, cause `'off'`.
 *
 * ═══ ORDRE DE PRIORITÉ (les 3 états visibles) ═══════════════════════════════
 *   1. `manual`  — un réglage explicite existe. Il gagne TOUJOURS, et l'écran le
 *                  dit : personne ne doit se demander pourquoi son réglage est
 *                  ignoré, donc il ne l'est jamais.
 *   2. `learned` — profil connu : « Adapté à tes habitudes ». Ce libellé n'est
 *                  autorisé QUE dans cet état — c'est toute la raison d'être du
 *                  chantier.
 *   3. `default` — on ne sait pas (pas assez de courses / apprentissage coupé /
 *                  lecture indisponible). Distance par défaut ASSUMÉE comme
 *                  telle, avec la cause. Jamais présentée comme personnalisée.
 */

// ─── Ce que le SERVEUR nous donne (contrat consommé, calculé ailleurs) ───────

/**
 * Profil d'habitudes de course de L'APPELANT, dérivé des faits renvoyés par la
 * RPC `habits_inputs` (0055) et calculé par `computeHabitsProfile`
 * (@klaim/shared) : une seule implémentation de l'algorithme, testée hors base.
 *
 * Le payload JSON attendu, exactement :
 *   { "ok": true, "kind": "known",       "typicalKm": 5.2, "sampleRuns": 12 }
 *   { "ok": true, "kind": "learning",    "sampleRuns": 2, "requiredRuns": 5 }
 *   { "ok": true, "kind": "off" }
 *   { "ok": false, ... }                         → traité comme `unavailable`
 *
 * `typicalKm` est une STATISTIQUE ROBUSTE des courses récentes (une médiane, pas
 * une moyenne : un unique marathon ne doit pas déplacer la proposition
 * quotidienne d'un coureur de 5 km). Le seuil `requiredRuns` vient du serveur et
 * n'est PAS redéfini ici — une seconde définition du seuil serait une seconde
 * vérité, donc une occasion de dire « encore 2 courses » quand il en faut 3.
 */
export type HabitProfile =
  /** Assez de courses réelles : la personnalisation est VRAIE. */
  | { kind: 'known'; typicalKm: number; sampleRuns: number }
  /** Pas encore assez de courses — on le dit, on n'invente pas. */
  | { kind: 'learning'; sampleRuns: number; requiredRuns: number }
  /** L'utilisateur a désactivé l'apprentissage (droit inconditionnel). */
  | { kind: 'off' }
  /** Hors session, vitrine web, lecture ratée : on ne sait pas, et on le dit. */
  | { kind: 'unavailable' };

/**
 * Réglages de distance, convertis depuis le store SERVEUR (features/routePrefs/store.ts). Écrits par l'écran
 * de réglages, lus ici. `manualKm: null` = aucun réglage explicite.
 */
export interface RouteDistancePrefs {
  /** Distance choisie à la main. `null` = laisser l'app décider. */
  manualKm: number | null;
  /** L'apprentissage des habitudes est-il autorisé ? Désactivable à tout moment. */
  learningEnabled: boolean;
}

/** Bornes du planificateur, injectées (jamais dupliquées ici). */
export interface SuggestionBounds {
  minKm: number;
  maxKm: number;
  stepKm: number;
  /** Distance par défaut ASSUMÉE quand rien n'est su. */
  fallbackKm: number;
}

// ─── Ce que l'écran affiche ─────────────────────────────────────────────────

/** D'où vient la distance proposée. Pilote la copie — 1 état = 1 phrase. */
export type SuggestionSource = 'manual' | 'learned' | 'default';

/** Pourquoi on est retombé sur le défaut (jamais tu, jamais maquillé). */
export type DefaultCause = 'learning' | 'off' | 'unavailable';

export interface RouteSuggestion {
  /** Distance proposée, bornée et alignée sur le pas du planificateur. */
  km: number;
  source: SuggestionSource;
  /** Courses réellement analysées (`learned`/`learning`) — le fait montrable. */
  sampleRuns: number | null;
  /** Courses nécessaires avant de personnaliser (`learning` seulement). */
  requiredRuns: number | null;
  /** Renseigné UNIQUEMENT si `source === 'default'`. */
  cause: DefaultCause | null;
}

/** Aligne sur le pas du planificateur puis borne — une proposition reste courable. */
function snap(km: number, b: SuggestionBounds): number {
  const stepped = b.stepKm > 0 ? Math.round(km / b.stepKm) * b.stepKm : km;
  const clamped = Math.min(b.maxKm, Math.max(b.minKm, stepped));
  // Le pas peut produire du bruit flottant (0.1 + 0.2) : 1 décimale suffit à
  // l'affichage comme au routage, et évite « 5,300000000000001 km ».
  return Math.round(clamped * 10) / 10;
}

/**
 * LA dérivation. Pure, totale (aucune entrée ne renvoie `null` : il y a toujours
 * une distance courable et toujours une raison à donner).
 *
 * Un `manualKm` hors bornes ou non fini est IGNORÉ plutôt que corrigé
 * silencieusement en un nombre que l'utilisateur n'a pas choisi : on retombe sur
 * la chaîne normale, qui, elle, s'explique.
 */
export function resolveRouteSuggestion(
  profile: HabitProfile,
  prefs: RouteDistancePrefs,
  bounds: SuggestionBounds,
): RouteSuggestion {
  // 1. Le réglage explicite gagne toujours.
  const manual = prefs.manualKm;
  if (manual !== null && Number.isFinite(manual) && manual > 0) {
    return {
      km: snap(manual, bounds),
      source: 'manual',
      sampleRuns: null,
      requiredRuns: null,
      cause: null,
    };
  }

  // 2. Apprentissage coupé : on n'utilise RIEN, même si un profil traînait.
  if (!prefs.learningEnabled) {
    return {
      km: snap(bounds.fallbackKm, bounds),
      source: 'default',
      sampleRuns: null,
      requiredRuns: null,
      cause: 'off',
    };
  }

  // 3. Profil réellement appris.
  if (profile.kind === 'known' && Number.isFinite(profile.typicalKm) && profile.typicalKm > 0) {
    return {
      km: snap(profile.typicalKm, bounds),
      source: 'learned',
      sampleRuns: profile.sampleRuns,
      requiredRuns: null,
      cause: null,
    };
  }

  // 4. Défaut assumé — avec sa cause exacte.
  if (profile.kind === 'learning') {
    return {
      km: snap(bounds.fallbackKm, bounds),
      source: 'default',
      sampleRuns: profile.sampleRuns,
      requiredRuns: profile.requiredRuns,
      cause: 'learning',
    };
  }
  return {
    km: snap(bounds.fallbackKm, bounds),
    source: 'default',
    sampleRuns: null,
    requiredRuns: null,
    // `known` invalide (typicalKm absurde) retombe ici plutôt que de proposer un
    // nombre incohérent en le présentant comme appris.
    cause: profile.kind === 'off' ? 'off' : 'unavailable',
  };
}

/**
 * Courses restantes avant que la personnalisation devienne vraie. `null` quand
 * la question n'a pas de sens (déjà appris, coupé, indisponible).
 */
export function runsBeforeLearning(s: RouteSuggestion): number | null {
  if (s.cause !== 'learning' || s.requiredRuns === null) return null;
  return Math.max(0, s.requiredRuns - (s.sampleRuns ?? 0));
}
