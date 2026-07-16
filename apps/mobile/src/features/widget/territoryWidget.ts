/**
 * GRYD — WIDGET « MON TERRITOIRE » (spec fondateur 17/07) : fondation PURE.
 *
 * Formule exacte du widget :
 *   Ce que je possède + ce qui vient de changer + ce que je dois faire.
 *
 * Règle non négociable : 1 widget = 1 état principal = 1 action. Jamais
 * plusieurs objectifs, jamais dix KPI. Les cellules H3 restent invisibles :
 * on parle en km² (0,74 km²), en zones et en place locale (#6) — jamais en
 * « 247 cellules » ni « 1 832 points ».
 *
 * Ce module est PUR (zéro React, zéro réseau) : sélection d'état par priorité
 * stricte + copie des 8 états, testables en Deno comme territoryBuild. Les
 * écrans (Carte, Profil, plus tard widget OS) ne font que le rendre.
 *
 * Étapes produit : 1) haut de la carte · 2) profil · 3) widget iOS/Android
 * (BLOQUÉ O8 : extension native + dev build) · 4) Live Activity (plus tard).
 */

/** Priorité stricte de la spec — l'ordre du tableau EST la règle. */
export type WidgetState =
  | 'first_capture'
  | 'territory_lost'
  | 'under_attack'
  | 'loop_incomplete'
  | 'crew_help'
  | 'share_moment'
  | 'rank_progress'
  | 'stable';

export type WidgetAction =
  | 'go'
  | 'view_map'
  | 'conquer'
  | 'defend'
  | 'recapture'
  | 'complete'
  | 'help'
  | 'share';

/**
 * Contexte d'entrée — chaque signal est fourni par l'appelant depuis une source
 * RÉELLE quand elle existe (territoires réels, openBoundary du dernier run) ou
 * démo ÉTIQUETÉE. La sélection ne fabrique jamais un signal absent.
 */
export interface UserTerritoryContext {
  hasCapturedTerritory: boolean;
  recentlyLostTerritory: boolean;
  activeAttack: boolean;
  incompleteLoop: boolean;
  urgentCrewRequest: boolean;
  recentShareworthyCapture: boolean;
  closeToNextRank: boolean;
}

/** Sélection d'état — la fonction EXACTE de la spec (ordre gelé). */
export function selectWidgetState(context: UserTerritoryContext): WidgetState {
  if (!context.hasCapturedTerritory) return 'first_capture';
  if (context.recentlyLostTerritory) return 'territory_lost';
  if (context.activeAttack) return 'under_attack';
  if (context.incompleteLoop) return 'loop_incomplete';
  if (context.urgentCrewRequest) return 'crew_help';
  if (context.recentShareworthyCapture) return 'share_moment';
  if (context.closeToNextRank) return 'rank_progress';
  return 'stable';
}

/** Données d'affichage — le sous-ensemble MVP du contrat UserTerritoryWidget. */
export interface TerritoryWidgetInput {
  controlledAreaM2: number;
  territoryCount: number;
  /** Place locale (#6) + zone de classement — null tant que season_scores est vide. */
  localRank: number | null;
  localRankAreaLabel: string | null;
  /** Nom de la zone concernée par l'état prioritaire — null → « Zone » (jamais inventé). */
  displayName: string | null;
  /** Qui a pris la zone (état territory_lost) — null → formulation neutre. */
  rivalName: string | null;
  estimatedRunDistanceM: number | null;
  remainingLoopDistanceM: number | null;
  /** Aire fraîchement capturée/menacée (m²) pour share_moment / under_attack. */
  eventAreaM2: number | null;
  minutesSinceEvent: number | null;
}

/** Le widget rendu : titre situation, ≤ 2 lignes, UN CTA. */
export interface TerritoryWidgetView {
  state: WidgetState;
  title: string;
  lines: readonly string[];
  ctaLabel: string;
  action: WidgetAction;
}

/** 0,74 km² — français, virgule, 2 décimales significatives (jamais de cellules). */
export function formatKm2(areaM2: number): string {
  const km2 = areaM2 / 1_000_000;
  const digits = km2 >= 10 ? 1 : 2;
  return `${km2.toFixed(digits).replace('.', ',')} km²`;
}

/** 3,2 km — depuis des mètres. */
function km(m: number): string {
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

function zoneName(input: TerritoryWidgetInput): string {
  return input.displayName ?? 'Zone';
}

/**
 * Copie des 8 états — la spec mot à mot, paramétrée par les vraies données.
 * Chaque état = titre + ≤ 2 lignes + UN CTA. Aucune stat sportive (allure,
 * calories, XP…) : elles restent au profil/historique.
 */
export function buildWidgetView(
  state: WidgetState,
  input: TerritoryWidgetInput,
): TerritoryWidgetView {
  const possession = `${formatKm2(input.controlledAreaM2)} · ${input.territoryCount} zone${
    input.territoryCount > 1 ? 's' : ''
  }`;
  const rank =
    input.localRank !== null && input.localRankAreaLabel
      ? `#${input.localRank} ${input.localRankAreaLabel}`
      : null;

  switch (state) {
    case 'first_capture':
      return {
        state,
        title: 'PRENDS TA PREMIÈRE ZONE',
        lines: [
          'Ferme une boucle près de toi.',
          ...(input.estimatedRunDistanceM !== null
            ? [`${km(input.estimatedRunDistanceM)} estimés`]
            : []),
        ],
        ctaLabel: 'GO',
        action: 'go',
      };
    case 'territory_lost':
      return {
        state,
        title: input.rivalName
          ? `${input.rivalName.toUpperCase()} A REPRIS ${zoneName(input).toUpperCase()}`
          : `${zoneName(input).toUpperCase()} A ÉTÉ REPRISE`,
        lines: [
          ...(input.minutesSinceEvent !== null
            ? [`Perdue il y a ${input.minutesSinceEvent} min`]
            : []),
          ...(input.estimatedRunDistanceM !== null
            ? [`${km(input.estimatedRunDistanceM)} estimés`]
            : []),
        ],
        ctaLabel: 'LA REPRENDRE',
        action: 'recapture',
      };
    case 'under_attack':
      return {
        state,
        title: `${zoneName(input).toUpperCase()} SOUS PRESSION`,
        lines: [
          input.eventAreaM2 !== null
            ? `${formatKm2(input.eventAreaM2)} menacés`
            : 'Ta zone est contestée.',
          ...(input.estimatedRunDistanceM !== null
            ? [`${km(input.estimatedRunDistanceM)} pour défendre`]
            : []),
        ],
        ctaLabel: 'DÉFENDRE',
        action: 'defend',
      };
    case 'loop_incomplete':
      return {
        state,
        title: 'BOUCLE PRESQUE FERMÉE',
        lines: [
          input.remainingLoopDistanceM !== null
            ? `Il manque ${Math.round(input.remainingLoopDistanceM)} m à ${zoneName(input)}.`
            : `Il manque quelques mètres à ${zoneName(input)}.`,
        ],
        ctaLabel: 'TERMINER',
        action: 'complete',
      };
    case 'crew_help':
      return {
        state,
        title: 'TON CREW A BESOIN DE TOI',
        lines: [
          input.remainingLoopDistanceM !== null
            ? `Il manque ${Math.round(input.remainingLoopDistanceM)} m pour fermer ${zoneName(input)}.`
            : `Aide ton crew à fermer ${zoneName(input)}.`,
        ],
        ctaLabel: 'AIDER',
        action: 'help',
      };
    case 'share_moment':
      return {
        state,
        title: `${zoneName(input).toUpperCase()} EST À TOI`,
        lines: [
          ...(input.eventAreaM2 !== null ? [`+${formatKm2(input.eventAreaM2)}`] : []),
          ...(input.minutesSinceEvent !== null
            ? [`Capturée il y a ${input.minutesSinceEvent} min`]
            : []),
        ],
        ctaLabel: 'PARTAGER',
        action: 'share',
      };
    case 'rank_progress':
      return {
        state,
        title: 'PLUS QU’UNE PLACE',
        lines: [
          ...(input.eventAreaM2 !== null && input.localRank !== null
            ? [`${formatKm2(input.eventAreaM2)} pour passer #${input.localRank - 1}`]
            : []),
          possession,
        ],
        ctaLabel: 'CONQUÉRIR',
        action: 'conquer',
      };
    case 'stable':
      return {
        state,
        title: 'TON TERRITOIRE TIENT',
        lines: [possession, ...(rank ? [rank] : [])],
        ctaLabel: 'VOIR LA CARTE',
        action: 'view_map',
      };
  }
}
