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
 *
 * i18n : module PUR → résolution directe catalogue (resolve/format + `locale`
 * en paramètre, défaut 'fr'), JAMAIS d'import du store. Les écrans passent
 * useLocale().
 */
import { C } from '../../i18n/catalog/map';
import { format, resolve, type Locale } from '../../i18n/types';

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

/**
 * 0,74 km² — 2 décimales significatives, jamais de cellules. Virgule décimale
 * partout sauf en anglais (point) — pas d'Intl (parité Hermes/Deno).
 */
export function formatKm2(areaM2: number, locale: Locale = 'fr'): string {
  const km2 = areaM2 / 1_000_000;
  const digits = km2 >= 10 ? 1 : 2;
  const fixed = km2.toFixed(digits);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km²`;
}

/** 3,2 km — depuis des mètres (même règle décimale que formatKm2). */
function km(m: number, locale: Locale): string {
  const fixed = (m / 1000).toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

/** Aucun nom inventé : null → « Zone » traduit (catalogue). */
function zoneName(input: TerritoryWidgetInput, locale: Locale): string {
  return input.displayName ?? resolve(C.zoneFallback, locale);
}

/**
 * Copie des 8 états — la spec mot à mot, paramétrée par les vraies données.
 * Chaque état = titre + ≤ 2 lignes + UN CTA. Aucune stat sportive (allure,
 * calories, XP…) : elles restent au profil/historique.
 */
export function buildWidgetView(
  state: WidgetState,
  input: TerritoryWidgetInput,
  locale: Locale = 'fr',
): TerritoryWidgetView {
  const zonesEntry = input.territoryCount > 1 ? C.zonesMany : C.zonesOne;
  const possession = `${formatKm2(input.controlledAreaM2, locale)} · ${format(
    zonesEntry,
    { n: input.territoryCount },
    locale,
  )}`;
  const rank =
    input.localRank !== null && input.localRankAreaLabel
      ? `#${input.localRank} ${input.localRankAreaLabel}`
      : null;
  const zone = zoneName(input, locale);

  switch (state) {
    case 'first_capture':
      return {
        state,
        title: resolve(C.wFirstTitle, locale),
        lines: [
          resolve(C.wFirstLine, locale),
          ...(input.estimatedRunDistanceM !== null
            ? [format(C.wKmEstimated, { km: km(input.estimatedRunDistanceM, locale) }, locale)]
            : []),
        ],
        ctaLabel: 'GO',
        action: 'go',
      };
    case 'territory_lost':
      return {
        state,
        title: input.rivalName
          ? format(
              C.wLostTitleRival,
              { rival: input.rivalName.toUpperCase(), zone: zone.toUpperCase() },
              locale,
            )
          : format(C.wLostTitle, { zone: zone.toUpperCase() }, locale),
        lines: [
          ...(input.minutesSinceEvent !== null
            ? [format(C.wLostAgo, { min: input.minutesSinceEvent }, locale)]
            : []),
          ...(input.estimatedRunDistanceM !== null
            ? [format(C.wKmEstimated, { km: km(input.estimatedRunDistanceM, locale) }, locale)]
            : []),
        ],
        ctaLabel: resolve(C.wLostCta, locale),
        action: 'recapture',
      };
    case 'under_attack':
      return {
        state,
        title: format(C.wAttackTitle, { zone: zone.toUpperCase() }, locale),
        lines: [
          input.eventAreaM2 !== null
            ? format(C.wAttackThreatened, { area: formatKm2(input.eventAreaM2, locale) }, locale)
            : resolve(C.wAttackContested, locale),
          ...(input.estimatedRunDistanceM !== null
            ? [format(C.wAttackKmToDefend, { km: km(input.estimatedRunDistanceM, locale) }, locale)]
            : []),
        ],
        ctaLabel: resolve(C.wAttackCta, locale),
        action: 'defend',
      };
    case 'loop_incomplete':
      return {
        state,
        title: resolve(C.wLoopTitle, locale),
        lines: [
          input.remainingLoopDistanceM !== null
            ? format(C.wLoopMissing, { m: Math.round(input.remainingLoopDistanceM), zone }, locale)
            : format(C.wLoopMissingFew, { zone }, locale),
        ],
        ctaLabel: resolve(C.wLoopCta, locale),
        action: 'complete',
      };
    case 'crew_help':
      return {
        state,
        title: resolve(C.wCrewTitle, locale),
        lines: [
          input.remainingLoopDistanceM !== null
            ? format(C.wCrewMissing, { m: Math.round(input.remainingLoopDistanceM), zone }, locale)
            : format(C.wCrewHelp, { zone }, locale),
        ],
        ctaLabel: resolve(C.wCrewCta, locale),
        action: 'help',
      };
    case 'share_moment':
      return {
        state,
        title: format(C.wShareTitle, { zone: zone.toUpperCase() }, locale),
        lines: [
          ...(input.eventAreaM2 !== null ? [`+${formatKm2(input.eventAreaM2, locale)}`] : []),
          ...(input.minutesSinceEvent !== null
            ? [format(C.wShareCapturedAgo, { min: input.minutesSinceEvent }, locale)]
            : []),
        ],
        ctaLabel: resolve(C.wShareCta, locale),
        action: 'share',
      };
    case 'rank_progress':
      return {
        state,
        title: resolve(C.wRankTitle, locale),
        lines: [
          ...(input.eventAreaM2 !== null && input.localRank !== null
            ? [
                format(
                  C.wRankToPass,
                  { area: formatKm2(input.eventAreaM2, locale), rank: input.localRank - 1 },
                  locale,
                ),
              ]
            : []),
          possession,
        ],
        ctaLabel: resolve(C.wRankCta, locale),
        action: 'conquer',
      };
    case 'stable':
      return {
        state,
        title: resolve(C.wStableTitle, locale),
        lines: [possession, ...(rank ? [rank] : [])],
        ctaLabel: resolve(C.wStableCta, locale),
        action: 'view_map',
      };
  }
}

/**
 * Sources RÉELLES du widget — types STRUCTURELS (aucun import) pour rester pur
 * et testable en Deno : la carte et le profil y versent leurs données.
 */
export interface RealWidgetSources {
  /** Aires (m²) des territoires 'crew' — issues de hex_claims (aire H3 réelle). */
  mineAreasM2: readonly number[];
  /** Frontière ouverte du dernier verdict serveur (openBoundary), sinon null. */
  openBoundary: { name: string; missingM: number } | null;
  /** Le dernier run jugé a-t-il capturé (claimed+stolen+pioneer > 0) ? */
  capturedInLastRun: boolean;
}

/**
 * Widget depuis le RÉEL uniquement — les signaux sans source (attaque, zone
 * perdue, crew, rang) restent ÉTEINTS : on ne fabrique pas une urgence.
 * Partagé par la Carte (peek) et le Profil (card compacte) : une seule logique.
 */
export function buildRealWidgetView(
  src: RealWidgetSources,
  locale: Locale = 'fr',
): TerritoryWidgetView {
  const state = selectWidgetState({
    hasCapturedTerritory: src.mineAreasM2.length > 0,
    recentlyLostTerritory: false,
    activeAttack: false,
    incompleteLoop: src.openBoundary !== null,
    urgentCrewRequest: false,
    recentShareworthyCapture: src.capturedInLastRun,
    closeToNextRank: false,
  });
  return buildWidgetView(
    state,
    {
      controlledAreaM2: src.mineAreasM2.reduce((sum, a) => sum + a, 0),
      territoryCount: src.mineAreasM2.length,
      localRank: null, // season_scores : câblé après déploiement C4
      localRankAreaLabel: null,
      displayName: src.openBoundary?.name ?? null,
      rivalName: null,
      estimatedRunDistanceM: null,
      remainingLoopDistanceM: src.openBoundary?.missingM ?? null,
      eventAreaM2: null,
      minutesSinceEvent: null,
    },
    locale,
  );
}
