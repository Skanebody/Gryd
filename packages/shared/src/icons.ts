/**
 * GRYD — Jeu d'icônes filaires (charte §F : trait 1,5 px, 24×24, pas cartoon).
 * SOURCE UNIQUE des tracés : le mobile (react-native-svg) et le web (SVG)
 * fournissent chacun un rendu fin de ces paths. « Des icônes plutôt que du
 * texte » (décision fondateur 03/07/2026) — réduire la friction de lecture.
 * stroke: couleur courante · strokeWidth 1.5 · linecap/linejoin round · fill none
 * (sauf `filled: true`, réservé aux états actifs).
 */

export const ICON_VIEWBOX = 24;

export interface IconDef {
  /** Tracés SVG (d) — dessinés au trait sauf mention filled. */
  paths: readonly string[];
  /** true = se remplit à l'état actif (onglet sélectionné). */
  fillable?: boolean;
}

export const ICONS = {
  /** Carte / territoire — l'hexagone, motif de marque. */
  carte: { paths: ['M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z'], fillable: true },
  /** Crew — deux coureurs. */
  crew: {
    paths: [
      'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M3.5 20c.5-3.5 2.9-5 5.5-5s5 1.5 5.5 5',
      'M16 5.7a2.6 2.6 0 0 1 0 5',
      'M17.6 15.3c2 .5 3.1 1.9 3.4 4.2',
    ],
  },
  /** Classement — podium. */
  classement: { paths: ['M9 21V8h6v13', 'M2.5 21v-7H9', 'M15 21V11h6.5', 'M2 21h20'] },
  /** Boutique — étiquette. */
  boutique: {
    paths: [
      'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z',
      'M7.5 7.5a.4.4 0 1 0 .01 0',
    ],
  },
  /** Profil. */
  profil: {
    paths: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 21c.8-4 3.9-6 7.5-6s6.7 2 7.5 6'],
  },
  /** Badge — hexagone validé. */
  badge: { paths: ['M12 3l7 4v10l-7 4-7-4V7l7-4z', 'M9.5 12.5l2 2 3.5-4'] },
  /** Performance — éclair. */
  performance: { paths: ['M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z'], fillable: true },
  /** Historique — horloge. */
  historique: { paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3.5 2'] },
  /** Réglages — engrenage épuré. */
  reglages: {
    paths: [
      'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
      'M12 2.5v3', 'M12 18.5v3', 'M2.5 12h3', 'M18.5 12h3',
      'M5 5l2.1 2.1', 'M16.9 16.9 19 19', 'M19 5l-2.1 2.1', 'M7.1 16.9 5 19',
    ],
  },
  /** Partage. */
  partage: {
    paths: ['M4 12v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-7', 'M12 15V3.5', 'M7.5 8 12 3.5 16.5 8'],
  },
  /** Bouclier. */
  bouclier: { paths: ['M12 21c5-2 8-5.5 8-10V6l-8-3-8 3v5c0 4.5 3 8 8 10z'] },
  /** Verrou (lock 24 h). */
  verrou: {
    paths: [
      'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-6.5A1.5 1.5 0 0 1 6.5 11z',
      'M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
    ],
  },
  /** Série — flamme. */
  serie: {
    paths: [
      'M12 21c3.9 0 6.5-2.4 6.5-6 0-2.6-1.4-4.6-3-6.5-.4 1.3-1.1 2.1-2 2.6C13.6 8.9 13 6 10.5 3c-.3 3-1.3 4.6-2.6 6.2C6.6 10.8 5.5 12.6 5.5 15c0 3.6 2.6 6 6.5 6z',
    ],
    fillable: true,
  },
  /** Alerte — attaque/danger. */
  alerte: { paths: ['M12 3 22 20H2L12 3z', 'M12 9.5V14', 'M12 16.8v.01'] },
  /** Couronne — victoire/rang 1. */
  couronne: { paths: ['M3.5 8.5 7.5 12l4.5-7 4.5 7 4-3.5L19 19H5L3.5 8.5z'], fillable: true },
  /** Notifications — cloche. */
  cloche: { paths: ['M18 10.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6', 'M10 20a2.2 2.2 0 0 0 4 0'] },
  /** Position — épingle. */
  pin: {
    paths: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  },
  chevron: { paths: ['m9 5 7 7-7 7'] },
  fermer: { paths: ['M5.5 5.5l13 13', 'M18.5 5.5l-13 13'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
