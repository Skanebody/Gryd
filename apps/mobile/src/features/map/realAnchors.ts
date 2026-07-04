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
  { lat: 48.86697, lng: 2.3656 }, // place de la République, angle sud-est
  { lat: 48.86529, lng: 2.37444 }, // av. de la République × av. Parmentier
  { lat: 48.862, lng: 2.37698 }, // av. Parmentier × rue Saint-Ambroise
  { lat: 48.86099, lng: 2.37477 }, // rue Saint-Ambroise × bd Voltaire
  { lat: 48.86673, lng: 2.36514 }, // bd Voltaire, retour place de la République
  { lat: 48.86698, lng: 2.36549 }, // bord sud de la place
];

/**
 * PETITE BOUCLE de la place de la République (tours de place — secteur maison
 * PROTÉGÉ) : le halo + le shield suivent ce tracé (§4ter).
 */
export const BOUCLE_PLACE_REPUBLIQUE: readonly LatLngPoint[] = [
  { lat: 48.8683, lng: 2.3628 }, // angle nord (bd Saint-Martin / bd Magenta)
  { lat: 48.8681, lng: 2.3648 }, // angle nord-est (débouché Faubourg-du-Temple)
  { lat: 48.8668, lng: 2.3645 }, // angle sud-est (départ bd Voltaire)
  { lat: 48.8664, lng: 2.363 }, // angle sud (bd du Temple)
  { lat: 48.8672, lng: 2.3616 }, // angle ouest (rue de Turbigo)
];

/**
 * BOUCLE du square Villemin (zone OBJECTIF crew §4ter) : tour du square par
 * l'avenue de Verdun, le quai de Valmy et la rue des Récollets.
 */
export const BOUCLE_SQUARE_VILLEMIN: readonly LatLngPoint[] = [
  { lat: 48.8752, lng: 2.3608 }, // angle nord-ouest (avenue de Verdun)
  { lat: 48.8756, lng: 2.363 }, // angle nord-est, côté quai de Valmy
  { lat: 48.8743, lng: 2.3638 }, // angle sud-est (écluse des Récollets)
  { lat: 48.8739, lng: 2.3614 }, // angle sud-ouest (rue des Récollets)
];

/**
 * BOUCLE de la place de la Bastille (AVANT-POSTE §4ter) : tour de place au
 * débouché du bd Richard-Lenoir — petit polygone net, plus de blob.
 */
export const BOUCLE_BASTILLE: readonly LatLngPoint[] = [
  { lat: 48.854, lng: 2.3686 }, // débouché bd Richard-Lenoir
  { lat: 48.8536, lng: 2.37 }, // côté est (rue de la Roquette)
  { lat: 48.8527, lng: 2.3698 }, // sud-est (rue du Faubourg-Saint-Antoine)
  { lat: 48.8524, lng: 2.3683 }, // sud (port de l'Arsenal)
  { lat: 48.8532, lng: 2.3676 }, // ouest (bd Henri-IV / rue Saint-Antoine)
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
