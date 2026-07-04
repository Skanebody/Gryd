/**
 * GRYD — Registre d'icônes ARSENAL (AMENDEMENT-14 §5) : un dessin DISTINCTIF
 * par objet de la boutique, même style que la planche badges (badge-icons.ts) :
 * trait ~1.5, caps ronds, viewBox 24×24, fill none. UI-only : ce fichier n'est
 * PAS synchronisé vers supabase/functions/_shared (aucune règle de jeu ici).
 *
 * Volontairement séparé d'icons.ts (navigation/UI) et de badge-icons.ts
 * (emblèmes badges) : ici, l'icône EST le visuel de l'objet d'Arsenal —
 * consommée par le mobile (ui/game/ArsenalItemCard, react-native-svg) et la
 * landing V1 (SVG inline). Le rendu est teinté par la RARETÉ (BADGE_TIER_STYLE)
 * côté composant — jamais de couleur ici.
 *
 * Résolution (arsenalIconFor) : slug EXACT → alias → préfixe de famille
 * d'objet (skin_*, trace_*, eclats_*, crew_*…) → défaut `pack` (caisse).
 */

// ─── Icônes 24×24 au trait ───────────────────────────────────────────────────

/** Paths SVG (attribut d) d'une icône d'objet — fill none, stroke courant. */
export type ArsenalIconPaths = readonly string[];

export const ARSENAL_ICON_VIEWBOX = 24;

export const ARSENAL_ICONS = {
  /** Bouclier facetté — protection de secteur. */
  shield: [
    'M12 2.6l7.4 3.2v6c0 4.6-3 7.8-7.4 9.6-4.4-1.8-7.4-5-7.4-9.6v-6z',
    'M12 2.6v18.8',
    'M4.6 7.4 12 10.6l7.4-3.2',
    'M4.6 13.2 12 16.2l7.4-3',
  ],
  /** Jumelles — reconnaissance / rapport détaillé. */
  scout: [
    'M7 13.4a3.6 3.6 0 1 0 .01 0',
    'M17 13.4a3.6 3.6 0 1 0 .01 0',
    'M10.4 15.8c.6-1.3 2.6-1.3 3.2 0',
    'M5.4 14.4 7 5.6h2l.7 4.9',
    'M18.6 14.4 17 5.6h-2l-.7 4.9',
  ],
  /** Arcs concentriques + point — scan / pulse. */
  radar: [
    'M12 12v.01',
    'M8.6 12a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 0 0-6.8 0z',
    'M4.6 7.8a8.6 8.6 0 0 1 3.2-3.2',
    'M19.4 16.2a8.6 8.6 0 0 1-3.2 3.2',
    'M12 12l5.4-5.4',
  ],
  /** Route + éclair — boost d'itinéraire. */
  route_boost: [
    'M4.6 20.8c4.8-1.6 3.4-6.8 7-9',
    'M6.6 18.4l1.4-1.1',
    'M9.2 14.9l1.2-1.2',
    'M17.8 2.8l-4.4 6.6h3.6L13.4 16',
  ],
  /** Flocon — gel de série. */
  streak_gel: [
    'M12 3.2v17.6',
    'M4.4 7.6l15.2 8.8',
    'M19.6 7.6 4.4 16.4',
    'M9.8 4.6 12 6.8l2.2-2.2',
    'M9.8 19.4 12 17.2l2.2 2.2',
  ],
  /** Trame carbone — skin territoire tissé. */
  skin_carbon_grid: [
    'M4.5 4.5h15v15h-15z',
    'M4.5 9.5l5-5',
    'M4.5 14.5l10-10',
    'M4.5 19.5l15-15',
    'M9.5 19.5l10-10',
    'M14.5 19.5l5-5',
  ],
  /** Contour fantôme pointillé — skin trace discret. */
  skin_ghost: [
    'M6 20.5v-8.3',
    'M6.6 9.4a6 6 0 0 1 2.6-3.4',
    'M10.9 4.7c.7-.2 1.5-.2 2.2 0',
    'M14.8 6a6 6 0 0 1 2.6 3.4',
    'M18 12.2v8.3l-3-1.8-3 1.8-3-1.8-3 1.8',
    'M9.7 11.2v.01',
    'M14.3 11.2v.01',
  ],
  /** Halo + étoile — skin fondateur lumineux. */
  skin_founder_glow: [
    'M12 6.4l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z',
    'M5.2 7.2Q2.6 12 5.2 16.8',
    'M18.8 7.2q2.6 4.8 0 9.6',
    'M12 2.6v2',
    'M12 19.4v2',
  ],
  /** Trace stylisée — traînée de course avec pointe. */
  skin_trace: [
    'M4.5 19.5v.01',
    'M4.5 19.5c4.5-.4 3.2-6.4 7.5-7 3.3-.4 4 3.1 7.5 2.1',
    'M17.6 11.9 19.9 14.5l-3.3 1',
  ],
  /** Ticket étoilé — pass de saison. */
  pass_saison: [
    'M4 7.5h16v3.2a2.3 2.3 0 0 0 0 4.6v3.2H4v-3.2a2.3 2.3 0 0 0 0-4.6z',
    'M12 9.6l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3z',
  ],
  /** Blason laurier — Club GRYD. */
  club: [
    'M12 4.6l4.6 2v4.2c0 2.9-1.8 4.9-4.6 6.2-2.8-1.3-4.6-3.3-4.6-6.2V6.6z',
    'M9.6 10.8 12 8.8l2.4 2',
    'M5.2 8.2c-1.3 3-1.1 6 .7 9',
    'M4 11l1.8.4',
    'M4.4 14.4l1.8-.1',
    'M18.8 8.2c1.3 3 1.1 6-.7 9',
    'M20 11l-1.8.4',
    'M19.6 14.4l-1.8-.1',
  ],
  /** Caisse croisée — pack / bundle. */
  pack: [
    'M4.5 8h15v12h-15z',
    'M6.5 8 8 4.5h8L17.5 8',
    'M4.5 8l15 12',
    'M19.5 8l-15 12',
  ],
  /** Gemme facettée — monnaie Éclats. */
  eclats: [
    'M7.5 4.5h9L20.5 9 12 20.5 3.5 9z',
    'M3.5 9h17',
    'M9.8 4.5 8.2 9l3.8 11.5',
    'M14.2 4.5 15.8 9 12 20.5',
  ],
  /** Double empreinte de pas — monnaie Foulées. */
  foulees: [
    'M8.4 3.6c1.7 0 2.7 1.6 2.5 3.7-.2 2-1.3 3.3-2.8 3.2-1.5-.1-2.3-1.6-2.1-3.5.2-2 1-3.4 2.4-3.4z',
    'M8 12.4a1.4 1.4 0 1 0 .01 0',
    'M15.6 10.6c1.7 0 2.7 1.6 2.5 3.7-.2 2-1.3 3.3-2.8 3.2-1.5-.1-2.3-1.6-2.1-3.5.2-2 1-3.4 2.4-3.4z',
    'M15.2 19.4a1.4 1.4 0 1 0 .01 0',
  ],
  /** Fanion à chevron — gear de crew. */
  crew_gear: [
    'M6.5 21.5v-18',
    'M6.5 4.5H18l-2.6 3.4L18 11.3H6.5',
    'M10 6.4l1.8 1.5-1.8 1.5',
    'M4.5 21.5h4',
  ],

  // ── Variantes complémentaires (même style) — objets démo distincts ──
  /** Traces circuit + pastilles — skin territoire Circuit. */
  skin_circuit: [
    'M6.5 4.6v.01',
    'M6.5 6.4v4l4.2 4.2v4.8',
    'M17.5 4.6v.01',
    'M17.5 6.4v2.4l-3.9 3.9v6.7',
    'M12 4.6v.01',
    'M12 6.4v2.2',
  ],
  /** Cadre à coins + étoile — frame de blason (or de saison). */
  frame_gold: [
    'M4.5 8V6A1.5 1.5 0 0 1 6 4.5h2',
    'M16 4.5h2A1.5 1.5 0 0 1 19.5 6v2',
    'M19.5 16v2a1.5 1.5 0 0 1-1.5 1.5h-2',
    'M8 19.5H6A1.5 1.5 0 0 1 4.5 18v-2',
    'M12 8.4l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z',
  ],
  /** Carte visuelle + flèche sortante — template de partage. */
  share_template: [
    'M20 10.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h8',
    'M6.8 16.8l2.8-3.2 2.1 2.4 1.8-2 3.1 3.5',
    'M16 8.5 21 3.5',
    'M17.5 3.5H21V7',
  ],
  /** Sacoche nouée à gemme — pack d'Éclats moyen. */
  eclats_pouch: [
    'M9.2 8.4h5.6c2.6 1.8 4.2 4.3 4.2 6.9 0 3.4-2.9 5.4-7 5.4s-7-2-7-5.4c0-2.6 1.6-5.1 4.2-6.9z',
    'M9.2 8.4 8 5h8l-1.2 3.4',
    'M12 12.4l1.7 2-1.7 2.1-1.7-2.1z',
  ],
  /** Coffre à clasp — pack d'Éclats large. */
  eclats_chest: [
    'M4.2 12c0-3.2 2.2-5.5 5.3-5.5h5c3.1 0 5.3 2.3 5.3 5.5v7.5H4.2z',
    'M4.2 12h15.6',
    'M10.6 10.4h2.8v3.2h-2.8z',
    'M7.6 6.9v12.6',
    'M16.4 6.9v12.6',
  ],
} as const satisfies Record<string, ArsenalIconPaths>;

export type ArsenalIconName = keyof typeof ARSENAL_ICONS;

// ─── Résolution slug → icône ─────────────────────────────────────────────────

/**
 * Alias EXACTS (après normalisation `-`/espaces → `_`, minuscules) : SKUs de
 * game-rules (starter_pack, eclats_s/m/l, club_monthly/annual), noms FR usuels
 * et clés démo de l'écran Arsenal.
 */
const ARSENAL_ICON_ALIAS: Readonly<Record<string, ArsenalIconName>> = {
  // SKUs (game-rules SKUS)
  starter_pack: 'pack',
  eclats_s: 'eclats',
  eclats_m: 'eclats_pouch',
  eclats_l: 'eclats_chest',
  club_monthly: 'club',
  club_annual: 'club',
  // Noms usuels / FR
  bouclier: 'shield',
  gel: 'streak_gel',
  streak_freeze: 'streak_gel',
  flocon: 'streak_gel',
  jumelles: 'scout',
  pass: 'pass_saison',
  pass_s0: 'pass_saison',
  gemme: 'eclats',
  empreintes: 'foulees',
  fanion: 'crew_gear',
  // Objets démo (écran Arsenal)
  skin_aurora: 'skin_founder_glow',
  skin_pulse: 'radar',
  skin_carbone: 'skin_carbon_grid',
  trace_comete: 'skin_trace',
  trace_pointilles: 'skin_ghost',
  pace_report: 'scout',
  crew_rename: 'crew_gear',
  crew_frame_gold: 'frame_gold',
  crew_share_template: 'share_template',
};

/** Familles d'objets par PRÉFIXE de slug (ordre = priorité de matching). */
const ARSENAL_ICON_PREFIX: readonly (readonly [string, ArsenalIconName])[] = [
  ['skin', 'skin_trace'],
  ['trace', 'skin_trace'],
  ['streak', 'streak_gel'],
  ['shield', 'shield'],
  ['eclats', 'eclats'],
  ['foulees', 'foulees'],
  ['crew', 'crew_gear'],
  ['pass', 'pass_saison'],
  ['club', 'club'],
  ['pack', 'pack'],
  ['route', 'route_boost'],
];

/** Icône par défaut si aucun match (caisse — objet générique d'Arsenal). */
const DEFAULT_ARSENAL_ICON: ArsenalIconName = 'pack';

/**
 * Résout les paths d'icône d'un objet d'Arsenal : slug exact du registre →
 * alias exact (SKU / clé démo / nom FR) → préfixe de famille → défaut (caisse).
 * Tolère tirets/espaces/majuscules (normalisés en `snake_case`).
 */
export function arsenalIconFor(slug?: string | null): ArsenalIconPaths {
  if (slug) {
    const key = slug.trim().toLowerCase().replace(/[-\s]+/g, '_');
    if (key in ARSENAL_ICONS) return ARSENAL_ICONS[key as ArsenalIconName];
    const alias = ARSENAL_ICON_ALIAS[key];
    if (alias) return ARSENAL_ICONS[alias];
    const prefixed = ARSENAL_ICON_PREFIX.find(([prefix]) => key.startsWith(prefix));
    if (prefixed) return ARSENAL_ICONS[prefixed[1]];
  }
  return ARSENAL_ICONS[DEFAULT_ARSENAL_ICON];
}
