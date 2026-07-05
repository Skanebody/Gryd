/**
 * GRYD — HISTORIQUE (AMENDEMENT-17 CHANTIER 3) : « une course = un effort +
 * un impact territorial ». Données démo DÉTERMINISTES miroir de ce que le
 * serveur renverra (runs + hex_claims + partial_boundaries) — le client
 * n'attribue jamais rien, il rejoue une liste figée. Chaque course raconte
 * DEUX choses : l'effort (distance/durée/allure) et l'impact (zones prises,
 * défendues, frontières fermées, routes ouvertes) OU la RAISON honnête d'un
 * refus de capture (jamais de blâme — anti-shame §11).
 *
 * Vocabulaire varié CHANTIER 3 (zones/secteurs/frontières/routes/rues) selon
 * le type de course. Aucune valeur de jeu calculée ici : ce sont les résultats
 * déjà décidés côté serveur, mis en forme pour l'affichage.
 */

// ─── Types de course (= 5 filtres Historique) ───────────────────────────────

/**
 * Type d'une course dans l'historique — pilote le filtre ET l'accent visuel.
 * `conquest` = zones prises · `defense` = zones sauvées · `route` = route
 * ouverte (frontière crew à fermer) · `stats` = aucune capture (course privée,
 * ou refus GPS/géométrie). Le filtre « Tout » les montre toutes.
 */
export type RunKind = 'conquest' | 'defense' | 'route' | 'stats';

/** Statut GRYD Verify d'une course (miroir de la décision serveur). */
export type VerifyStatus = 'verified' | 'partial' | 'statsonly';

/**
 * Raison HONNÊTE quand une capture n'a pas eu lieu (copy §CH3 : états de refus
 * explicites). `null` = la course a bien capturé. Chaque motif = une phrase
 * courte, factuelle, jamais culpabilisante.
 */
export type RefusalReason =
  | 'loop_open'
  | 'zone_thin'
  | 'gps_unstable'
  | 'speed_incoherent'
  | null;

/** Un segment de la course (détail) : sa nature de validation Verify. */
export type SegmentState = 'valid' | 'weak_gps' | 'pause';

export interface RunSegment {
  /** Libellé court du segment (« Canal Saint-Martin », « Pause feu rouge »). */
  label: string;
  /** Longueur affichée (km) — 0 pour une pause. */
  km: number;
  state: SegmentState;
}

/**
 * Une ligne d'impact territorial du détail (résumé + détail) : une icône, un
 * chiffre, un libellé varié. Ex. « +18 zones », « 12 rues défendues »,
 * « 1 frontière fermée », « Base → République ».
 */
export interface ImpactLine {
  icon: import('@klaim/shared').IconName;
  label: string;
  /** `true` = gain (chartreuse) ; `false` = neutre/gris (info). */
  gain: boolean;
}

export interface RunHistoryEntry {
  id: string;
  /** Nom éditorial de la course (« Boucle République », « Défense Ourcq »). */
  name: string;
  /** Vocabulaire varié : secteur/quartier de la course. */
  area: string;
  kind: RunKind;
  /** Horodatage relatif figé (« Aujourd'hui · 07:42 », « Hier », « Lun. »). */
  when: string;
  // ── Effort ──
  km: number;
  /** Durée en secondes. */
  durationS: number;
  /** Allure en secondes / km. */
  paceSPerKm: number;
  // ── Impact (résumé card : 2-3 fragments courts déjà mis en forme) ──
  /** Fragments d'impact affichés sur la card (« +18 zones », « 1 frontière fermée »). */
  impactChips: readonly string[];
  verify: VerifyStatus;
  refusal: RefusalReason;
  // ── Détail ──
  /** Boucle fermée → mini-carte avant/après disponible. */
  hasLoopMap: boolean;
  /**
   * Anchor géométrique d'authoring pour la mini-carte avant/après (réutilise
   * realAnchors). Absent = pas de carte (défense/route/stats/refus). Les zones
   * avant/après sont des estimations d'affichage (le serveur décide).
   */
  loopMap?: { anchor: 'republique' | 'bastille'; beforeZones: number; afterZones: number };
  impactLines: readonly ImpactLine[];
  segments: readonly RunSegment[];
  /** Sous-titre du bloc raison (détail) quand `refusal !== null`. */
  refusalDetail: string | null;
  /** Une ligne de contexte crew si pertinent (frontière ouverte/fermée). */
  crewNote: string | null;
}

// ─── Libellés des filtres (= RunKind + « all ») ──────────────────────────────

export type HistoryFilter = 'all' | RunKind;

export const HISTORY_FILTERS: readonly { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'conquest', label: 'Conquêtes' },
  { key: 'defense', label: 'Défenses' },
  { key: 'route', label: 'Routes' },
  { key: 'stats', label: 'Stats only' },
];

/** Libellés courts du motif de refus (bloc raison du détail). */
export const REFUSAL_TITLES: Record<Exclude<RefusalReason, null>, string> = {
  loop_open: 'Boucle non fermée',
  zone_thin: 'Zone trop fine',
  gps_unstable: 'GPS instable → stats only',
  speed_incoherent: 'Vitesse incohérente → refusé',
};

// ─── Données démo (variées, déterministes) ───────────────────────────────────
// Ordre = plus récent d'abord. Les 3 premières = « au-dessus du fold ».

export const RUN_HISTORY: readonly RunHistoryEntry[] = [
  // 1) CONQUÊTE réussie — boucle fermée, +18 zones, une frontière fermée.
  {
    id: 'r-boucle-republique',
    name: 'Boucle République',
    area: 'Paris Est · secteur République',
    kind: 'conquest',
    when: "Aujourd'hui · 07:42",
    km: 4.8,
    durationS: 28 * 60 + 12,
    paceSPerKm: 5 * 60 + 52,
    impactChips: ['+18 zones', '1 frontière fermée'],
    verify: 'verified',
    refusal: null,
    hasLoopMap: true,
    loopMap: { anchor: 'republique', beforeZones: 4, afterZones: 18 },
    impactLines: [
      { icon: 'cible', label: '+18 zones capturées', gain: true },
      { icon: 'bouclier', label: '1 frontière fermée sur la rue du Faubourg', gain: true },
      { icon: 'crew', label: '+120 pts crew cette course', gain: true },
    ],
    segments: [
      { label: 'Canal → République', km: 2.1, state: 'valid' },
      { label: 'République → Voltaire', km: 1.6, state: 'valid' },
      { label: 'Retour boucle', km: 1.1, state: 'valid' },
    ],
    refusalDetail: null,
    crewNote: 'Boucle fermée en solo — zone tenue par LES FOULÉES 9³.',
  },

  // 2) DÉFENSE — 12 rues sauvées, timer +48 h, aucune capture nouvelle.
  {
    id: 'r-defense-ourcq',
    name: 'Défense Ourcq',
    area: 'Paris Nord-Est · rues du canal',
    kind: 'defense',
    when: 'Hier · 19:05',
    km: 3.2,
    durationS: 19 * 60 + 40,
    paceSPerKm: 6 * 60 + 8,
    impactChips: ['+48 h', '12 zones sauvées'],
    verify: 'verified',
    refusal: null,
    hasLoopMap: false,
    impactLines: [
      { icon: 'bouclier', label: '12 rues défendues avant leur chute', gain: true },
      { icon: 'sablier', label: 'Fraîcheur relancée : +48 h', gain: true },
      { icon: 'guerre', label: 'CANAL CREW repoussé sur République', gain: false },
    ],
    segments: [
      { label: 'Bassin de la Villette', km: 1.4, state: 'valid' },
      { label: 'Quai de l’Ourcq', km: 1.8, state: 'valid' },
    ],
    refusalDetail: null,
    crewNote: 'Réponse à l’attaque de CANAL CREW — 12 rues tenues.',
  },

  // 3) ROUTE OUVERTE — boucle non fermée mais « fermable » par le crew.
  {
    id: 'r-route-base-republique',
    name: 'Route ouverte Base → République',
    area: 'Paris Est · frontière République',
    kind: 'route',
    when: 'Hier · 08:20',
    km: 3.6,
    durationS: 22 * 60 + 3,
    paceSPerKm: 6 * 60 + 7,
    impactChips: ['Frontière ouverte', 'il manque 620 m'],
    verify: 'verified',
    refusal: null,
    hasLoopMap: false,
    impactLines: [
      { icon: 'route', label: 'Route ouverte Base → République', gain: true },
      { icon: 'virage', label: '2,4 km de frontière tracés', gain: true },
      { icon: 'crew', label: 'Ton crew peut la fermer — il manque 620 m', gain: false },
    ],
    segments: [
      { label: 'Base → Canal', km: 1.9, state: 'valid' },
      { label: 'Canal → République', km: 1.7, state: 'valid' },
    ],
    refusalDetail: null,
    crewNote: 'Frontière ouverte · expire dans 23 h · à fermer par LES FOULÉES 9³.',
  },

  // 4) STATS ONLY (choisi) — course privée, 6,1 km, pas de boucle.
  {
    id: 'r-footing-prive',
    name: 'Footing privé',
    area: 'Bois de Vincennes',
    kind: 'stats',
    when: 'Dim. · 10:12',
    km: 6.1,
    durationS: 37 * 60 + 30,
    paceSPerKm: 6 * 60 + 9,
    impactChips: ['Pas de boucle', 'stats enrichies'],
    verify: 'verified',
    refusal: null,
    hasLoopMap: false,
    impactLines: [
      { icon: 'performance', label: '6,1 km ajoutés à tes stats', gain: true },
      { icon: 'discret', label: 'Course privée — aucun territoire pris', gain: false },
    ],
    segments: [
      { label: 'Lac Daumesnil', km: 3.0, state: 'valid' },
      { label: 'Retour esplanade', km: 3.1, state: 'valid' },
    ],
    refusalDetail: null,
    crewNote: null,
  },

  // 5) CAPTURE PARTIELLE — 2 segments exclus (GPS faible), zone partielle prise.
  {
    id: 'r-partielle-bastille',
    name: 'Tour de Bastille',
    area: 'Paris · secteur Bastille',
    kind: 'conquest',
    when: 'Ven. · 18:47',
    km: 5.4,
    durationS: 33 * 60 + 5,
    paceSPerKm: 6 * 60 + 8,
    impactChips: ['+9 zones', '2 segments exclus'],
    verify: 'partial',
    refusal: null,
    hasLoopMap: true,
    loopMap: { anchor: 'bastille', beforeZones: 3, afterZones: 9 },
    impactLines: [
      { icon: 'cible', label: '+9 zones capturées (boucle partielle)', gain: true },
      { icon: 'gps', label: '2 segments exclus — GPS faible sous tunnel', gain: false },
      { icon: 'crew', label: '+60 pts crew', gain: true },
    ],
    segments: [
      { label: 'Bastille → Ledru-Rollin', km: 1.6, state: 'valid' },
      { label: 'Passage souterrain', km: 0.8, state: 'weak_gps' },
      { label: 'Reprise Charonne', km: 2.1, state: 'valid' },
      { label: 'Tunnel Daumesnil', km: 0.9, state: 'weak_gps' },
    ],
    refusalDetail:
      '2 segments écartés car le signal GPS était trop faible pour les vérifier. Le reste de la boucle a bien capturé.',
    crewNote: null,
  },

  // 6) REFUS — boucle non fermée, il manquait 240 m (sous le seuil).
  {
    id: 'r-refus-loop',
    name: 'Boucle Belleville',
    area: 'Paris Est · Belleville',
    kind: 'stats',
    when: 'Jeu. · 07:15',
    km: 4.1,
    durationS: 25 * 60 + 2,
    paceSPerKm: 6 * 60 + 6,
    impactChips: ['Boucle non fermée', 'il manquait 240 m'],
    verify: 'statsonly',
    refusal: 'loop_open',
    hasLoopMap: false,
    impactLines: [
      { icon: 'performance', label: '4,1 km ajoutés à tes stats', gain: true },
      { icon: 'virage', label: 'Boucle presque bouclée — il manquait 240 m', gain: false },
    ],
    segments: [
      { label: 'Belleville → Ménilmontant', km: 2.2, state: 'valid' },
      { label: 'Retour partiel', km: 1.9, state: 'valid' },
    ],
    refusalDetail:
      'La boucle n’était pas refermée : il manquait 240 m entre ton départ et ton arrivée. Reviens fermer la frontière et la zone est à toi.',
    crewNote: 'Frontière fermable — demande à ton crew de terminer les 240 m.',
  },

  // 7) REFUS — zone trop fine (couloir sans surface).
  {
    id: 'r-refus-thin',
    name: 'Aller-retour Rivoli',
    area: 'Paris Centre · rue de Rivoli',
    kind: 'stats',
    when: 'Mer. · 12:30',
    km: 3.3,
    durationS: 20 * 60 + 55,
    paceSPerKm: 6 * 60 + 20,
    impactChips: ['Zone trop fine', 'stats only'],
    verify: 'statsonly',
    refusal: 'zone_thin',
    hasLoopMap: false,
    impactLines: [
      { icon: 'performance', label: '3,3 km ajoutés à tes stats', gain: true },
      { icon: 'route', label: 'Tracé en aller-retour — pas de surface', gain: false },
    ],
    segments: [
      { label: 'Aller Rivoli', km: 1.6, state: 'valid' },
      { label: 'Retour Rivoli', km: 1.7, state: 'valid' },
    ],
    refusalDetail:
      'Le tracé était un aller-retour : trop fin pour dessiner une zone. Trace une vraie boucle pour capturer du territoire.',
    crewNote: null,
  },

  // 8) REFUS — GPS instable → stats only (dérive de signal).
  {
    id: 'r-refus-gps',
    name: 'Sortie sous la pluie',
    area: 'Lille · Vieux-Lille',
    kind: 'stats',
    when: 'Mar. · 20:10',
    km: 5.0,
    durationS: 31 * 60 + 18,
    paceSPerKm: 6 * 60 + 16,
    impactChips: ['GPS instable', 'stats only'],
    verify: 'statsonly',
    refusal: 'gps_unstable',
    hasLoopMap: false,
    impactLines: [
      { icon: 'performance', label: '5,0 km ajoutés à tes stats', gain: true },
      { icon: 'gps', label: 'Signal GPS instable sur toute la sortie', gain: false },
    ],
    segments: [
      { label: 'Grand-Place', km: 1.7, state: 'weak_gps' },
      { label: 'Quais de la Deûle', km: 1.6, state: 'weak_gps' },
      { label: 'Retour', km: 1.7, state: 'weak_gps' },
    ],
    refusalDetail:
      'Le signal GPS a trop dérivé pour vérifier le tracé (météo, immeubles). La course compte pour tes stats, mais pas pour le territoire.',
    crewNote: null,
  },

  // 9) REFUS — vitesse incohérente → refusé (trop rapide, trajet non couru).
  {
    id: 'r-refus-speed',
    name: 'Trajet vélo importé',
    area: 'Paris · import Strava',
    kind: 'stats',
    when: 'Lun. · 09:00',
    km: 12.4,
    durationS: 24 * 60 + 40,
    paceSPerKm: 1 * 60 + 59,
    impactChips: ['Vitesse incohérente', 'refusé'],
    verify: 'statsonly',
    refusal: 'speed_incoherent',
    hasLoopMap: false,
    impactLines: [
      { icon: 'alerte', label: 'Vitesse incompatible avec la course à pied', gain: false },
      { icon: 'discret', label: 'Non comptée pour le territoire', gain: false },
    ],
    segments: [
      { label: 'Segment importé', km: 12.4, state: 'weak_gps' },
    ],
    refusalDetail:
      'L’allure moyenne (1’59/km) correspond à du vélo, pas à de la course. GRYD ne compte que l’effort couru : cette activité est écartée du territoire.',
    crewNote: null,
  },
];

// ─── Sélecteurs (déterministes, pas de calcul de jeu) ────────────────────────

/** Les 3 dernières courses (au-dessus du fold de /historique). */
export function recentRuns(): readonly RunHistoryEntry[] {
  return RUN_HISTORY.slice(0, 3);
}

/** Filtre l'historique par onglet (« all » = tout). */
export function runsByFilter(filter: HistoryFilter): readonly RunHistoryEntry[] {
  if (filter === 'all') return RUN_HISTORY;
  return RUN_HISTORY.filter((r) => r.kind === filter);
}

/** Retrouve une course par id (détail). */
export function findRun(id: string): RunHistoryEntry | undefined {
  return RUN_HISTORY.find((r) => r.id === id);
}

/** Compte des courses par filtre (badge des onglets). */
export function countByFilter(filter: HistoryFilter): number {
  return runsByFilter(filter).length;
}

// ─── Formatage effort (fr, sans Intl — cohérent avec run/simulation) ─────────

/** Distance : 4.8 → « 4,8 km ». */
export function fmtKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Durée : 1692 s → « 28:12 ». */
export function fmtDuration(totalS: number): string {
  const m = Math.floor(totalS / 60);
  const s = Math.round(totalS % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Allure : 352 s/km → « 5’52/km ». */
export function fmtPace(sPerKm: number): string {
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}’${s.toString().padStart(2, '0')}/km`;
}

/** Libellé Verify court (pastille card). */
export const VERIFY_LABELS: Record<VerifyStatus, string> = {
  verified: 'GRYD Verified',
  partial: 'Capture partielle',
  statsonly: 'Stats only',
};
