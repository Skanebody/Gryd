/**
 * GRYD — ANCRES RÉELLES de la démo Battle Map (AMENDEMENT-13 §2).
 * « Les vrais tracés réels » : la scène démo n'est plus posée sur une grille
 * procédurale mais sur le VRAI Paris (10e/11e, quartier République / Canal
 * Saint-Martin). Ce module est la SOURCE UNIQUE des coordonnées lat/lng
 * réelles : centre égocentré, axes hôtes des couloirs de course (les
 * territoires chartreuse serpentent le long de vraies rues), route ouverte,
 * objectif, points remarquables, caméra France.
 *
 * INVARIANT PRIVACY (AMENDEMENT-07 / -13 §5) : l'ego démo est une POSITION
 * FICTIVE posée place de la République — jamais une vraie géolocalisation.
 * Les waypoints sont des relevés approchés (précision ~20-30 m, largement
 * sous la maille H3 res 10 ≈ 130 m) : assez fidèles pour que les couloirs
 * suivent visiblement les axes sur les vraies tuiles.
 * Aucune règle de jeu ici — pur ancrage géographique de rendu/démo.
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

// ─── Centre égocentré réel ──────────────────────────────────────────────────

/**
 * L'ego démo (AMENDEMENT-01 « moi » au centre) : place de la République,
 * côté sud-est, vers le débouché du canal Saint-Martin (~48.867, 2.364).
 */
export const EGO_REPUBLIQUE: LatLngPoint = { lat: 48.867, lng: 2.3641 };

/** Zoom « échelle coureur » (AMENDEMENT-08 §4) : hex 130 m ≈ 30 px à Paris. */
export const RUNNER_SCALE_ZOOM = 14.6;

/**
 * Zoom « échelle ville » : on voit la ville entière et ses quartiers, pas la
 * maille des hexes. Sert au SEUL cas où l'on sait dans quelle ville joue le
 * joueur sans savoir OÙ il est : la ville qu'il a choisie à la main pendant
 * l'onboarding. Cadrer n'affirme rien sur son monde — c'est un point de vue, pas
 * un contenu (aucune zone, aucun propriétaire, aucun classement n'en découle).
 * Constante de RENDU (ce module ne porte aucune règle de jeu).
 */
export const CITY_SCALE_ZOOM = 11.2;

/** Caméra par défaut de la Battle Map réelle (onglet Carte). */
export const EGO_CAMERA = {
  lng: EGO_REPUBLIQUE.lng,
  lat: EGO_REPUBLIQUE.lat,
  zoom: RUNNER_SCALE_ZOOM,
} as const;

// ─── Conversion mètres ↔ degrés au voisinage de l'ego ───────────────────────

/** Mètres par degré de latitude (constante géodésique locale suffisante). */
export const REAL_M_PER_DEG_LAT = 111_320;
/** Mètres par degré de longitude à la latitude de République (cos φ). */
export const REAL_M_PER_DEG_LNG =
  REAL_M_PER_DEG_LAT * Math.cos((EGO_REPUBLIQUE.lat * Math.PI) / 180);

/**
 * (x m vers l'est, y m vers le nord) depuis l'EGO RÉEL → lat/lng réels.
 * Remplace `offsetMeters` de la basemap procédurale pour tout ce qui doit
 * rester ancré autour du « moi » (mates opt-in, markers démo…).
 */
export function offsetFromEgo(xEast: number, yNorth: number): LatLngPoint {
  return {
    lat: EGO_REPUBLIQUE.lat + yNorth / REAL_M_PER_DEG_LAT,
    lng: EGO_REPUBLIQUE.lng + xEast / REAL_M_PER_DEG_LNG,
  };
}

// ─── Points remarquables réels ──────────────────────────────────────────────

/** Square/jardin Villemin (10e) — le parc de la scène, bord du quai de Valmy. */
export const SQUARE_VILLEMIN: LatLngPoint = { lat: 48.8748, lng: 2.3622 };

/** Place de la Bastille — cap de l'avant-poste (bout de la route ouverte). */
export const BASTILLE: LatLngPoint = { lat: 48.8532, lng: 2.369 };

/** Carrefour Belleville (Faubourg-du-Temple × bd de Belleville) — départ rival. */
export const BELLEVILLE: LatLngPoint = { lat: 48.8722, lng: 2.3767 };

/**
 * Ancre de la ZONE OBJECTIF crew : secteur neutre du square Villemin, côté
 * quai de Valmy (narratif : « prendre le secteur Villemin »).
 */
export const OBJECTIVE_VILLEMIN: LatLngPoint = { lat: 48.8745, lng: 2.363 };

// ─── Axes réels (waypoints lat/lng le long des vraies rues) ─────────────────

/**
 * Canal Saint-Martin : QUAI DE VALMY (sud → nord), du débouché du canal
 * (square Frédérick-Lemaître) vers l'écluse des Récollets (le long du jardin
 * Villemin) puis Louis-Blanc — hôte du couloir crew « quai ».
 * GÉOMÉTRIE RÉELLE DE LA RUE (§4ter « pas de vol d'oiseau ») : way OSM
 * « Quai de Valmy » via Overpass (2026-07-05), assemblé, tronqué
 * Frédérick-Lemaître → Louis-Blanc, simplifié RDP 5 m — le couloir épouse la
 * courbe en S du canal, aucune dépendance réseau au runtime.
 */
export const QUAI_VALMY: readonly LatLngPoint[] = [
  { lat: 48.86878, lng: 2.36695 }, // square Frédérick-Lemaître
  { lat: 48.8717, lng: 2.36462 }, // passerelle Alibert / Hôtel du Nord
  { lat: 48.87379, lng: 2.36308 }, // rue Bichat, bord du jardin Villemin
  { lat: 48.8745, lng: 2.36281 }, // écluse des Récollets
  { lat: 48.875, lng: 2.36309 }, // le canal amorce son virage nord-est
  { lat: 48.87963, lng: 2.36707 }, // vers rue Louis-Blanc
];

/**
 * BOULEVARD VOLTAIRE (République → place Léon-Blum) — hôte du couloir crew
 * « sud-est » (ex-diagonale sud-ouest de la basemap procédurale).
 */
export const BOULEVARD_VOLTAIRE: readonly LatLngPoint[] = [
  { lat: 48.8668, lng: 2.3654 }, // départ place de la République
  { lat: 48.8647, lng: 2.3691 }, // croisement rue Oberkampf
  { lat: 48.8625, lng: 2.3727 },
  { lat: 48.8612, lng: 2.375 }, // Saint-Ambroise
  { lat: 48.8602, lng: 2.3764 },
  { lat: 48.858, lng: 2.38 }, // place Léon-Blum (mairie du 11e)
];

/**
 * AVENUE DE LA RÉPUBLIQUE (République → Père-Lachaise) — hôte du couloir crew
 * « est » (queue en decay, comme l'ex-axe Est).
 */
export const AVENUE_DE_LA_REPUBLIQUE: readonly LatLngPoint[] = [
  { lat: 48.867, lng: 2.3656 }, // départ place de la République
  { lat: 48.8663, lng: 2.3688 }, // croisement bd Jules-Ferry (canal couvert)
  { lat: 48.8654, lng: 2.3742 }, // métro Parmentier
  { lat: 48.8646, lng: 2.3785 },
  { lat: 48.8638, lng: 2.3828 }, // rue Saint-Maur
  { lat: 48.8631, lng: 2.3866 }, // vers Père-Lachaise
];

/**
 * RUE DU FAUBOURG-DU-TEMPLE, sens de la MENACE : le couloir RIVAL descend de
 * Belleville vers le canal (croisement quai de Valmy/Jemmapes) — l'intersection
 * avec le couloir quai produit les zones CONTESTÉES.
 */
export const RUE_FAUBOURG_DU_TEMPLE: readonly LatLngPoint[] = [
  BELLEVILLE, // carrefour Belleville
  { lat: 48.8712, lng: 2.3741 },
  { lat: 48.8702, lng: 2.3715 },
  { lat: 48.8692, lng: 2.3689 },
  { lat: 48.8684, lng: 2.3666 }, // croisement du canal Saint-Martin
];

// ─── Boucles de course réelles (AMENDEMENT-13 §4ter : la frontière EST le
// tracé du run — polygones nets construits sur ces waypoints, plus de lissage
// Chaikin à l'affichage) ────────────────────────────────────────────────────

/**
 * GRANDE BOUCLE CREW « République → Parmentier → Saint-Ambroise → Voltaire »
 * (§4ter) : le polygone affiché EST ce tracé de course (~2,3 km). ROUTÉE SUR
 * LES VRAIES RUES (« pas de vol d'oiseau ») : OSRM public, profil foot
 * (2026-07-05), vias place de la République → av. de la République ×
 * av. Parmentier → av. Parmentier × rue Saint-Ambroise → rue Saint-Ambroise ×
 * bd Voltaire → retour République ; géométrie figée (RDP 5 m — chaque segment
 * droit EST une rue droite, chaque sommet un coin de rue). Anneau OUVERT.
 */
export const BOUCLE_REPUBLIQUE: readonly LatLngPoint[] = [
  { lat: 48.86697, lng: 2.3656 },
  { lat: 48.86682, lng: 2.36668 },
  { lat: 48.86683, lng: 2.36685 },
  { lat: 48.86675, lng: 2.36722 },
  { lat: 48.86653, lng: 2.36844 },
  { lat: 48.8665, lng: 2.36866 },
  { lat: 48.86647, lng: 2.36884 },
  { lat: 48.86639, lng: 2.36915 },
  { lat: 48.86635, lng: 2.36936 },
  { lat: 48.86637, lng: 2.36959 },
  { lat: 48.86626, lng: 2.36987 },
  { lat: 48.86622, lng: 2.37009 },
  { lat: 48.86612, lng: 2.37059 },
  { lat: 48.86609, lng: 2.37077 },
  { lat: 48.86606, lng: 2.37094 },
  { lat: 48.86602, lng: 2.37114 },
  { lat: 48.86581, lng: 2.37221 },
  { lat: 48.86579, lng: 2.37239 },
  { lat: 48.86571, lng: 2.37281 },
  { lat: 48.86545, lng: 2.37422 },
  { lat: 48.86535, lng: 2.3744 },
  { lat: 48.86522, lng: 2.37449 },
  { lat: 48.86512, lng: 2.37458 },
  { lat: 48.865, lng: 2.37458 },
  { lat: 48.86459, lng: 2.3749 },
  { lat: 48.86449, lng: 2.37497 },
  { lat: 48.86397, lng: 2.37536 },
  { lat: 48.86318, lng: 2.37594 },
  { lat: 48.86264, lng: 2.37634 },
  { lat: 48.86254, lng: 2.37644 },
  { lat: 48.8623, lng: 2.37662 },
  { lat: 48.86218, lng: 2.37674 },
  { lat: 48.86205, lng: 2.37681 },
  { lat: 48.862, lng: 2.37698 },
  { lat: 48.86191, lng: 2.37687 },
  { lat: 48.86129, lng: 2.37551 },
  { lat: 48.86117, lng: 2.37529 },
  { lat: 48.861, lng: 2.37502 },
  { lat: 48.86102, lng: 2.37485 },
  { lat: 48.86109, lng: 2.3746 },
  { lat: 48.86156, lng: 2.37367 },
  { lat: 48.86196, lng: 2.37299 },
  { lat: 48.86202, lng: 2.37284 },
  { lat: 48.86211, lng: 2.37267 },
  { lat: 48.86219, lng: 2.37252 },
  { lat: 48.8625, lng: 2.37202 },
  { lat: 48.86245, lng: 2.37187 },
  { lat: 48.86256, lng: 2.37169 },
  { lat: 48.86276, lng: 2.37153 },
  { lat: 48.86299, lng: 2.37116 },
  { lat: 48.86309, lng: 2.371 },
  { lat: 48.86365, lng: 2.37007 },
  { lat: 48.86373, lng: 2.36991 },
  { lat: 48.86422, lng: 2.36911 },
  { lat: 48.86435, lng: 2.36889 },
  { lat: 48.86445, lng: 2.36876 },
  { lat: 48.86449, lng: 2.36855 },
  { lat: 48.86461, lng: 2.36841 },
  { lat: 48.86503, lng: 2.36775 },
  { lat: 48.86511, lng: 2.36762 },
  { lat: 48.8652, lng: 2.36748 },
  { lat: 48.86532, lng: 2.36723 },
  { lat: 48.86549, lng: 2.36695 },
  { lat: 48.86586, lng: 2.36637 },
  { lat: 48.86595, lng: 2.36621 },
  { lat: 48.8665, lng: 2.36536 },
  { lat: 48.86673, lng: 2.36514 },
  { lat: 48.86681, lng: 2.36525 },
  { lat: 48.86698, lng: 2.36549 },
];

/**
 * PETITE BOUCLE de la place de la République (tours de place — secteur maison
 * PROTÉGÉ) : le halo + le shield suivent ce tracé (§4ter).
 */
export const BOUCLE_PLACE_REPUBLIQUE: readonly LatLngPoint[] = [
  { lat: 48.8683, lng: 2.36279 },
  { lat: 48.86842, lng: 2.36294 },
  { lat: 48.8684, lng: 2.3631 },
  { lat: 48.86793, lng: 2.36396 },
  { lat: 48.8678, lng: 2.3642 },
  { lat: 48.86786, lng: 2.36438 },
  { lat: 48.86795, lng: 2.3646 },
  { lat: 48.86804, lng: 2.36485 },
  { lat: 48.86795, lng: 2.3646 },
  { lat: 48.86787, lng: 2.3644 },
  { lat: 48.86774, lng: 2.36436 },
  { lat: 48.86751, lng: 2.36424 },
  { lat: 48.86733, lng: 2.36398 },
  { lat: 48.86722, lng: 2.36383 },
  { lat: 48.86681, lng: 2.36452 },
  { lat: 48.86722, lng: 2.36383 },
  { lat: 48.86714, lng: 2.36372 },
  { lat: 48.86703, lng: 2.36357 },
  { lat: 48.86711, lng: 2.36344 },
  { lat: 48.86712, lng: 2.36327 },
  { lat: 48.86707, lng: 2.36311 },
  { lat: 48.86674, lng: 2.36325 },
  { lat: 48.86652, lng: 2.36337 },
  { lat: 48.86674, lng: 2.36325 },
  { lat: 48.867, lng: 2.36309 },
  { lat: 48.86667, lng: 2.36211 },
  { lat: 48.86684, lng: 2.36204 },
  { lat: 48.86693, lng: 2.36196 },
  { lat: 48.867, lng: 2.36179 },
  { lat: 48.86703, lng: 2.36163 },
  { lat: 48.867, lng: 2.36179 },
  { lat: 48.86693, lng: 2.36196 },
  { lat: 48.867, lng: 2.36221 },
  { lat: 48.86715, lng: 2.36255 },
  { lat: 48.86722, lng: 2.36267 },
  { lat: 48.86732, lng: 2.36294 },
  { lat: 48.8674, lng: 2.36307 },
  { lat: 48.86755, lng: 2.36329 },
  { lat: 48.86794, lng: 2.36264 },
  { lat: 48.86806, lng: 2.36262 },
  { lat: 48.86829, lng: 2.36278 },
];

/**
 * BOUCLE du square Villemin (zone OBJECTIF crew §4ter) : tour du square par
 * l'avenue de Verdun, le quai de Valmy et la rue des Récollets.
 */
export const BOUCLE_SQUARE_VILLEMIN: readonly LatLngPoint[] = [
  { lat: 48.87518, lng: 2.36084 },
  { lat: 48.87523, lng: 2.361 },
  { lat: 48.87528, lng: 2.36125 },
  { lat: 48.87535, lng: 2.3614 },
  { lat: 48.87547, lng: 2.36145 },
  { lat: 48.87544, lng: 2.3617 },
  { lat: 48.87542, lng: 2.36187 },
  { lat: 48.87542, lng: 2.36205 },
  { lat: 48.87538, lng: 2.36225 },
  { lat: 48.87531, lng: 2.36243 },
  { lat: 48.87526, lng: 2.3628 },
  { lat: 48.87526, lng: 2.36298 },
  { lat: 48.87526, lng: 2.36318 },
  { lat: 48.87537, lng: 2.36323 },
  { lat: 48.87543, lng: 2.36307 },
  { lat: 48.87546, lng: 2.36289 },
  { lat: 48.8754, lng: 2.36308 },
  { lat: 48.87532, lng: 2.36319 },
  { lat: 48.87523, lng: 2.36329 },
  { lat: 48.87493, lng: 2.36314 },
  { lat: 48.8748, lng: 2.36306 },
  { lat: 48.87468, lng: 2.363 },
  { lat: 48.87454, lng: 2.36296 },
  { lat: 48.87437, lng: 2.36292 },
  { lat: 48.87417, lng: 2.36294 },
  { lat: 48.87392, lng: 2.36303 },
  { lat: 48.8739, lng: 2.36323 },
  { lat: 48.87395, lng: 2.36338 },
  { lat: 48.87394, lng: 2.36355 },
  { lat: 48.87396, lng: 2.36372 },
  { lat: 48.87406, lng: 2.36365 },
  { lat: 48.87418, lng: 2.36361 },
  { lat: 48.87429, lng: 2.36359 },
  { lat: 48.87418, lng: 2.36361 },
  { lat: 48.87406, lng: 2.36365 },
  { lat: 48.87396, lng: 2.36372 },
  { lat: 48.87394, lng: 2.36355 },
  { lat: 48.87395, lng: 2.36338 },
  { lat: 48.87388, lng: 2.36317 },
  { lat: 48.87408, lng: 2.36296 },
  { lat: 48.87428, lng: 2.36292 },
  { lat: 48.87432, lng: 2.36271 },
  { lat: 48.87429, lng: 2.36253 },
  { lat: 48.87412, lng: 2.36236 },
  { lat: 48.87398, lng: 2.36221 },
  { lat: 48.87385, lng: 2.36208 },
  { lat: 48.87373, lng: 2.36196 },
  { lat: 48.87385, lng: 2.36208 },
  { lat: 48.87398, lng: 2.36221 },
  { lat: 48.87412, lng: 2.36236 },
  { lat: 48.87422, lng: 2.36247 },
  { lat: 48.87432, lng: 2.36256 },
  { lat: 48.87441, lng: 2.36225 },
  { lat: 48.87445, lng: 2.36209 },
  { lat: 48.87448, lng: 2.36193 },
  { lat: 48.87454, lng: 2.36171 },
  { lat: 48.87458, lng: 2.36151 },
  { lat: 48.87471, lng: 2.36133 },
  { lat: 48.87481, lng: 2.36121 },
  { lat: 48.87486, lng: 2.36099 },
  { lat: 48.87492, lng: 2.3608 },
  { lat: 48.87504, lng: 2.36078 },
  { lat: 48.87516, lng: 2.36082 },
];

/**
 * BOUCLE de la place de la Bastille (AVANT-POSTE §4ter) : tour de place au
 * débouché du bd Richard-Lenoir — petit polygone net, plus de blob.
 */
export const BOUCLE_BASTILLE: readonly LatLngPoint[] = [
  { lat: 48.854, lng: 2.36861 },
  { lat: 48.85388, lng: 2.36865 },
  { lat: 48.8538, lng: 2.36883 },
  { lat: 48.85377, lng: 2.36903 },
  { lat: 48.85379, lng: 2.36921 },
  { lat: 48.85375, lng: 2.3694 },
  { lat: 48.85371, lng: 2.36959 },
  { lat: 48.85366, lng: 2.36976 },
  { lat: 48.85358, lng: 2.36998 },
  { lat: 48.85336, lng: 2.37006 },
  { lat: 48.85322, lng: 2.37006 },
  { lat: 48.85309, lng: 2.37001 },
  { lat: 48.85272, lng: 2.36978 },
  { lat: 48.85246, lng: 2.36962 },
  { lat: 48.85242, lng: 2.36945 },
  { lat: 48.85257, lng: 2.3694 },
  { lat: 48.8524, lng: 2.36929 },
  { lat: 48.85242, lng: 2.36907 },
  { lat: 48.85249, lng: 2.36871 },
  { lat: 48.85254, lng: 2.36847 },
  { lat: 48.85259, lng: 2.3683 },
  { lat: 48.85243, lng: 2.36818 },
  { lat: 48.85257, lng: 2.36827 },
  { lat: 48.85266, lng: 2.36811 },
  { lat: 48.85275, lng: 2.36803 },
  { lat: 48.8529, lng: 2.36807 },
  { lat: 48.85317, lng: 2.36825 },
  { lat: 48.85325, lng: 2.36779 },
  { lat: 48.85328, lng: 2.36761 },
  { lat: 48.85326, lng: 2.36823 },
  { lat: 48.85337, lng: 2.36827 },
  { lat: 48.85374, lng: 2.36855 },
  { lat: 48.85375, lng: 2.36875 },
  { lat: 48.85384, lng: 2.36854 },
  { lat: 48.85393, lng: 2.36865 },
];

/**
 * BD RICHARD-LENOIR (République → Bastille, le canal couvert) — hôte de la
 * ROUTE OUVERTE ; l'avant-poste est à son extrémité, côté Bastille.
 * GÉOMÉTRIE RÉELLE DE LA RUE (§4ter) : voie continue du boulevard extraite
 * des ways OSM « Boulevard Richard-Lenoir » via Overpass (2026-07-05),
 * tronquée République → Bastille, RDP 5 m — la ligne suit le boulevard,
 * virage compris, sans couper les îlots.
 */
export const BD_RICHARD_LENOIR: readonly LatLngPoint[] = [
  { lat: 48.86633, lng: 2.36889 }, // départ côté République (rue Rampon)
  { lat: 48.86245, lng: 2.37187 }, // croisement rue Oberkampf
  { lat: 48.86191, lng: 2.37214 },
  { lat: 48.86127, lng: 2.37225 }, // le boulevard s'infléchit plein sud
  { lat: 48.86049, lng: 2.37213 }, // métro Richard-Lenoir
  { lat: 48.85412, lng: 2.36925 }, // marché, Bréguet-Sabin puis Bastille
  { lat: 48.85406, lng: 2.36914 }, // arrivée place de la Bastille
];

/**
 * Tronçons hôtes RÉELS des couloirs de course (consommés par fakeHexes) —
 * mêmes clés que l'ex-CORRIDOR_HOSTS de la basemap procédurale pour une
 * substitution 1:1 :
 *   est          couloir crew le long de l'avenue de la République
 *   quai         couloir crew le long du quai de Valmy (canal Saint-Martin)
 *   sudOuest     couloir crew le long du boulevard Voltaire (sud-est réel —
 *                la clé historique est conservée pour ne rien casser)
 *   rivalNordEst couloir RIVAL qui descend de Belleville par le
 *                Faubourg-du-Temple
 */
export const REAL_CORRIDOR_HOSTS = {
  est: AVENUE_DE_LA_REPUBLIQUE,
  quai: QUAI_VALMY,
  sudOuest: BOULEVARD_VOLTAIRE,
  rivalNordEst: RUE_FAUBOURG_DU_TEMPLE,
} as const;

/** Route ouverte réelle (doc §7) : République → Bastille par Richard-Lenoir. */
export const ROUTE_OUVERTE_REELLE: readonly LatLngPoint[] = BD_RICHARD_LENOIR;

// ─── « Mon territoire » : vraie carte, monde navigable (AMENDEMENT-13 §3/§4bis)
// L'écran territoire s'ouvre en fitBounds de l'ENSEMBLE des possessions
// (allTerritories.possessionsBounds) — plus de caméra France codée en dur.

/** Ancre des crews adverses de la vue France (Saison 0 : rivaux vers Lyon). */
export const LYON_RIVAL: LatLngPoint = { lat: 45.764, lng: 4.8357 };
