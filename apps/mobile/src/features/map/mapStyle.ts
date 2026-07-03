/**
 * GRYD — styles de tracé de la Battle Map (AMENDEMENT-08 §4, doc §7).
 * TOUTES les couleurs sont DÉRIVÉES des tokens @klaim/shared (charte : toute
 * couleur hors tokens = bug) : `withAlpha` ne fait que décliner un token hex
 * en rgba — aucune teinte nouvelle. La couleur lit l'ÉTAT DE JEU :
 * chartreuse = mon crew, rival = orange sombre, contesté = rare/événement,
 * danger = decay urgent, verify = protection/info.
 * Partagé entre MapScreen natif (MapLibre) et MapScreen.web (SVG).
 */
import { colors, gameColors, mapTokens } from '@klaim/shared';

/** Décline un token `#RRGGBB` en rgba — n'accepte QUE des tokens hex 6 digits. */
export function withAlpha(tokenHex: string, alpha: number): string {
  const r = parseInt(tokenHex.slice(1, 3), 16);
  const g = parseInt(tokenHex.slice(3, 5), 16);
  const b = parseInt(tokenHex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const battleMapStyle = {
  // Mon crew (chartreuse + glow léger)
  heldFill: mapTokens.mineFill,
  heldStroke: mapTokens.mineStroke,
  heldGlow: withAlpha(colors.chartreuse, 0.14),

  // Rival (orange sombre — état de jeu, pas décor)
  rivalFill: withAlpha(gameColors.rival, 0.1),
  rivalStroke: withAlpha(gameColors.rival, 0.42),

  // Contesté (teinte rare + double contour crew/rival, contour rival pulsé)
  contestedFill: withAlpha(gameColors.contested, 0.1),
  contestedInnerStroke: mapTokens.mineStroke,
  contestedOuterStroke: withAlpha(gameColors.rival, 0.7),

  // Protégé (halo verify translucide autour du cœur)
  protectedHalo: withAlpha(gameColors.verify, 0.35),

  // Decay (pointillé ; muted red si urgent)
  decayStroke: withAlpha(colors.blanc, 0.35),
  decayUrgentStroke: withAlpha(gameColors.danger, 0.8),
  decayUrgentFill: withAlpha(gameColors.danger, 0.07),

  // Objectif crew (halo chartreuse sur zone neutre)
  objectiveHalo: withAlpha(colors.chartreuse, 0.12),
  objectiveStroke: mapTokens.mineStroke,

  // Avant-poste (marker hexagonal discret)
  outpostFill: mapTokens.foeFill,
  outpostStroke: withAlpha(colors.blanc, 0.5),

  // Route ouverte (ligne GPS chartreuse + points de liaison)
  routeStroke: withAlpha(colors.chartreuse, 0.85),
  routeDot: colors.chartreuse,

  // Grille neutre — à l'échelle coureur (hex ≈ 30 px) le trait token 5 %
  // disparaît : légère remontée, même dérivation withAlpha que le reste.
  neutralStroke: withAlpha(colors.blanc, 0.09),

  // ── Basemap Uber-night (AMENDEMENT-09 §0) — plan de quartier sombre ──
  /** Fond de carte : la rue est le vide entre les îlots. */
  ground: colors.noir,
  /** Aplat des îlots urbains (surface carbon de scène de jeu — token). */
  block: gameColors.carbon,
  /** Liseré subtil des îlots (définit visuellement le bord des rues). */
  blockEdge: withAlpha(colors.blanc, 0.03),
  /** Creusage des axes/rues hors trame à travers les îlots (couleur fond). */
  streetCasing: colors.noir,
  /** Surface des axes larges : légèrement plus claire que les rues (hiérarchie). */
  streetMajor: withAlpha(colors.blanc, 0.07),
  /**
   * Parcs : aplat « vert très sombre » (arbitrage AMENDEMENT-09 §0). Seul vert
   * de la palette = chartreuse, déclinée à 6 % sur fond noir — décor carto,
   * illisible comme état de jeu (aucune confusion crew possible).
   */
  parkFill: withAlpha(colors.chartreuse, 0.06),
  parkEdge: withAlpha(colors.chartreuse, 0.1),
  /** Base opaque sous le parc (efface les îlots par recouvrement). */
  parkBase: colors.noir,
  water: colors.eau,
  waterRim: withAlpha(colors.blanc, 0.08),

  // LEGACY AMENDEMENT-08 (réseau de lignes) — compat API, plus utilisé en web.
  parks: mapTokens.parks,
  parksEdge: withAlpha(colors.blanc, 0.05),
  /** Trame dense des rues secondaires (traits très fins). */
  roads: mapTokens.roads,
  /** 2-3 axes principaux, à peine plus présents que la trame. */
  roadsMajor: withAlpha(colors.blanc, 0.13),
  sectorLabel: colors.gris,
  /** Barre d'échelle graphique (500 m) — gris discret. */
  scaleBar: colors.gris,
} as const;
