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
  /** Cible — offensive crew (§38). */
  cible: {
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
      'M12 12.8a.8.8 0 1 0 .01 0',
    ],
  },
  /** Mission — case cochée dans une liste (§7.12). */
  mission: {
    paths: [
      'M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5z',
      'M8.5 12l2.2 2.2L15.5 9.5',
    ],
  },
  /** Coffre — Crew Chest hebdo (§39). */
  coffre: {
    paths: [
      'M4 8.5 12 5l8 3.5v8L12 20l-8-3.5v-8z',
      'M4 8.5 12 12l8-3.5',
      'M12 12v8',
      'M10.5 10.4h3',
    ],
  },
  /** Lien — source connectée / import (§13, §16). */
  lien: {
    paths: [
      'M9.5 14.5 14.5 9.5',
      'M10 6.5l1.2-1.2a3.5 3.5 0 0 1 5 5L15 11.5',
      'M14 17.5l-1.2 1.2a3.5 3.5 0 0 1-5-5L9 11.5',
    ],
  },
  /** Aide — support / contestation (§7.15). */
  aide: {
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      'M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.1-2.5 3.9',
      'M12 17.2v.01',
    ],
  },

  // ─── AMENDEMENT-07 §8 : social / amis / feed / réactions (ADDITIF) ──────────
  /** Ami — une personne (distinct de `crew` = plusieurs). */
  ami: {
    paths: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 21c.8-4 3.9-6 7.5-6s6.7 2 7.5 6'],
  },
  /** Ajouter un ami — personne + petit plus. */
  ajoutami: {
    paths: [
      'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
      'M3 21c.7-3.6 3.4-5.5 7-5.5',
      'M18 14.5v6',
      'M15 17.5h6',
    ],
  },
  /** Feed — fil d'activité (lignes empilées). */
  feed: {
    paths: [
      'M4 6.5h11',
      'M4 12h16',
      'M4 17.5h11',
      'M19.5 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    ],
  },
  /** Aujourd'hui — soleil (Focus Solo, §8). */
  aujourdhui: {
    paths: [
      'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
      'M12 2.5v2.5', 'M12 19v2.5', 'M4.6 4.6l1.8 1.8', 'M17.6 17.6l1.8 1.8',
      'M2.5 12H5', 'M19 12h2.5', 'M4.6 19.4l1.8-1.8', 'M17.6 6.4l1.8-1.8',
    ],
  },
  /** Mode discret — œil barré (hors leaderboards, §7). */
  discret: {
    paths: [
      'M4 4l16 16',
      'M9.9 5.2A9.5 9.5 0 0 1 12 5c5 0 9 5.5 9 7 0 .8-1.1 2.5-2.9 3.9',
      'M6.5 7.6C4.2 9 3 11.3 3 12c0 1.5 4 7 9 7 1.3 0 2.5-.3 3.6-.9',
      'M9.9 9.9a3 3 0 0 0 4.2 4.2',
    ],
  },
  /** QR — carré de scan (échange d'amis, §8). */
  qr: {
    paths: [
      'M4 4.5h5v5H4z', 'M15 4.5h5v5h-5z', 'M4 15.5h5v5H4z',
      'M15 15.5v2', 'M17.5 15.5h2.5v2.5', 'M20 20.5h-2.5v-2.5', 'M15 20.5v-1',
    ],
  },
  /** Copier — deux cadres décalés (copier le lien crew, §8). */
  copier: {
    paths: [
      'M9 9.5h9A1.5 1.5 0 0 1 19.5 11v8A1.5 1.5 0 0 1 18 20.5H9A1.5 1.5 0 0 1 7.5 19v-8A1.5 1.5 0 0 1 9 9.5z',
      'M5 14.5H4.5A1.5 1.5 0 0 1 3 13V4.5A1.5 1.5 0 0 1 4.5 3H13a1.5 1.5 0 0 1 1.5 1.5V5',
    ],
  },

  // ── Réactions GRYD custom (icônes, PAS emojis — §8) ──
  /** Raid — cible frappée (offensive). */
  reactRaid: {
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
      'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3',
    ],
  },
  /** Défense — bouclier avec coche. */
  reactDefense: {
    paths: ['M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z', 'M8.5 12l2.5 2.5L15.5 9'],
  },
  /** Clean — étincelle nette (course propre / fair-play). */
  reactClean: {
    paths: [
      'M12 3l1.8 6.4L20 11l-6.2 1.6L12 19l-1.8-6.4L4 11l6.2-1.6L12 3z',
      'M18.5 4.5v3', 'M20 6h-3',
    ],
  },
  /** Fast — chevrons de vitesse. */
  reactFast: { paths: ['M4 7l6 5-6 5', 'M11 7l6 5-6 5'] },
  /** Rank up — flèche montante en gradins. */
  reactRankup: { paths: ['M4 18l5-5 4 3 7-8', 'M17 8h4v4'] },
  /** Hold — main ouverte / paume (tenir la position). */
  reactHold: {
    paths: [
      'M8 11V5.5a1.5 1.5 0 0 1 3 0V11',
      'M11 11V4.5a1.5 1.5 0 0 1 3 0V11',
      'M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a5 5 0 0 1-3.6-1.5L5 16.5a1.6 1.6 0 0 1 2.4-2L8 15',
    ],
  },
  /** Respect — poing (fist bump). */
  reactRespect: {
    paths: [
      'M6 10.5V8a1.5 1.5 0 0 1 3 0v1.5',
      'M9 9.5V7a1.5 1.5 0 0 1 3 0v2.5',
      'M12 9.5V7.5a1.5 1.5 0 0 1 3 0V13',
      'M15 10.5a1.5 1.5 0 0 1 3 0V15a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3.5a1.5 1.5 0 0 1 3 0V13',
    ],
  },
  /** Legend — couronne à étincelle (rareté max). */
  reactLegend: {
    paths: ['M4 17.5V9l4.5 3.5L12 5l3.5 7.5L20 9v8.5H4z', 'M12 5V3'],
    fillable: true,
  },

  // ─── AMENDEMENT-08 : Game UI « scènes de jeu » (ADDITIF, doc §26) ───────────
  // NB : le podium existe déjà (`classement`), le coffre (`coffre`), le
  // bouclier (`bouclier`), la couronne (`couronne`), la cible (`cible`).
  /** Crest — blason hexagonal de crew (écusson + pointe). */
  crest: {
    paths: ['M12 2.5l8 4.6v9.3L12 21.5l-8-5.1V7.1l8-4.6z', 'M8.5 9.5 12 11.8l3.5-2.3', 'M12 11.8v5'],
    fillable: true,
  },
  /** Médaille — ruban + disque coché (récompense de ligue). */
  medaille: {
    paths: [
      'M8 3l2.6 5.3', 'M16 3l-2.6 5.3',
      'M12 18.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
      'M10 13.5l1.5 1.5 2.5-3',
    ],
  },
  /** Raid — flèches croisées (offensive). */
  raid: { paths: ['M5 19 19 5', 'M14.5 5H19v4.5', 'M5 5l14 14', 'M19 14.5V19h-4.5'] },
  /** Scout — boussole, aiguille pointée. */
  scout: {
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      'M15.5 8.5l-2 5-5 2 2-5 5-2z',
    ],
  },
  /** Radar — balayage + écho (détection de zone). */
  radar: {
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      'M12 16.5a4.5 4.5 0 1 1 4.5-4.5',
      'M12 12l5.5-5.5',
      'M12 12v.01',
    ],
  },
  /** Sablier — decay / temps restant. */
  sablier: {
    paths: [
      'M7 3h10', 'M7 21h10',
      'M8.5 3v2.3c0 2.6 3.5 3.9 3.5 6.7 0 2.8-3.5 4.1-3.5 6.7V21',
      'M15.5 3v2.3c0 2.6-3.5 3.9-3.5 6.7 0 2.8 3.5 4.1 3.5 6.7V21',
    ],
  },
  /** GPS — croix de visée + point fixe (signal de position). */
  gps: {
    paths: [
      'M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z',
      'M12 2.5V5', 'M12 19v2.5', 'M2.5 12H5', 'M19 12h2.5',
      'M12 12v.01',
    ],
  },
  /** Route — tracé en S vers une flèche (route ouverte). */
  route: {
    paths: ['M4 19.5h9a3.5 3.5 0 0 0 0-7h-2a3.5 3.5 0 0 1 0-7h8', 'M16 2.5 19 5.5 16 8.5'],
  },
  /** Avant-poste — fanion planté. */
  avantposte: {
    paths: ['M7 21V3.5', 'M7 4.5h9.5L14 8l2.5 3.5H7', 'M4 21h6'],
  },
  /** Éclats — gemme facettée (monnaie premium capée). */
  eclats: {
    paths: ['M7.5 4h9L20 9l-8 11L4 9l3.5-5z', 'M4 9h16', 'M9.5 4 8.5 9l3.5 11', 'M14.5 4l1 5L12 20'],
  },
  /** Foulées — chaussure de course (monnaie d'effort). */
  foulees: {
    paths: [
      'M3 17.5h18',
      'M3 17.5v-1.8c0-1 .6-1.9 1.6-2.2L9 12.2l2-4.2c1.5 2 3.1 3.1 5.6 3.7 2.4.6 4.4 1.9 4.4 3.8v2',
      'M10.7 12.6l1.6-1.1', 'M12.7 14.2l1.6-1.1',
    ],
  },
  /** Pass — ticket perforé (Pass Saison). */
  pass: {
    paths: [
      'M4.5 7h15A1.5 1.5 0 0 1 21 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7z',
      'M15.5 7v1.8', 'M15.5 11v2', 'M15.5 15.2V17',
    ],
  },
  /** Skin — palette (style, jamais l'avantage). */
  skin: {
    paths: [
      'M12 21a9 9 0 1 1 9-9c0 1.9-1.3 3-3 3h-2.2a2 2 0 0 0-1.6 3.2c.9 1.2.3 2.8-2.2 2.8z',
      'M8 10.5v.01', 'M12 7.5v.01', 'M16 10.5v.01',
    ],
  },
  /** Cadeau — boîte à ruban (récompense offerte). */
  cadeau: {
    paths: [
      'M5 11.5h14V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5z',
      'M4 8h16v3.5H4z', 'M12 8v13',
      'M12 8C8.5 8 7 6.8 7 5.5S8.2 3 9.5 3 12 5.3 12 8z',
      'M12 8c3.5 0 5-1.2 5-2.5S15.8 3 14.5 3 12 5.3 12 8z',
    ],
  },
  /** Niveau — double chevron montant (level up). */
  niveau: { paths: ['M6 17.5l6-6 6 6', 'M6 11l6-6 6 6'] },
  /** Parc — arbre stylisé (POI running, AMENDEMENT-09). */
  parc: {
    paths: [
      'M12 21v-7',
      'M12 3a5.5 5.5 0 0 1 5.5 5.5c0 3.1-2.4 5.5-5.5 5.5S6.5 11.6 6.5 8.5A5.5 5.5 0 0 1 12 3z',
    ],
  },
  /** Fontaine — goutte d'eau (POI running, AMENDEMENT-09). */
  fontaine: {
    paths: ['M12 3.5c3.6 4.4 5.5 7.2 5.5 9.9a5.5 5.5 0 1 1-11 0c0-2.7 1.9-5.5 5.5-9.9z'],
  },
  /** Spot — étoile (spot populaire, POI running AMENDEMENT-09). */
  spot: {
    paths: [
      'M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2l-5.1 2.7 1.1-5.6-4.2-3.9 5.7-.7L12 3.5z',
    ],
    fillable: true,
  },
  /** Virage — flèche de changement de direction (navigation, AMENDEMENT-09). */
  virage: { paths: ['M6 20.5V13a4.5 4.5 0 0 1 4.5-4.5H18', 'M14.5 5 18 8.5 14.5 12'] },
  /** Guerre — étendard planté (war ready / offensive de crew). */
  guerre: {
    paths: ['M7 21V3', 'M7 4.5h10.5V12l-3.4-1.7L10.7 12 7 10.3', 'M4.5 21h5'],
    fillable: true,
  },
  /** Calques — pile de losanges (bascule du fond de carte sombre/couleur). */
  calques: {
    paths: [
      'M12 3 21 8l-9 5-9-5 9-5z',
      'M3.5 12 12 17l8.5-5',
      'M3.5 16 12 21l8.5-5',
    ],
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
