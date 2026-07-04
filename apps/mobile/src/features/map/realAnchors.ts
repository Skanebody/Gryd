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
 * Canal Saint-Martin, rive ouest : QUAI DE VALMY (sud → nord), du débouché du
 * canal (square Frédérick-Lemaître) vers l'écluse des Récollets et
 * Louis-Blanc — le quai de Jemmapes est la rive miroir à ~40 m à l'est.
 * Hôte du couloir crew « quai ».
 */
export const QUAI_VALMY: readonly LatLngPoint[] = [
  { lat: 48.8686, lng: 2.3667 }, // square Frédérick-Lemaître (canal à ciel ouvert)
  { lat: 48.8703, lng: 2.3664 },
  { lat: 48.8719, lng: 2.3663 }, // croisement rue du Faubourg-du-Temple
  { lat: 48.8736, lng: 2.366 }, // passerelle Alibert / Hôtel du Nord
  { lat: 48.8752, lng: 2.3656 }, // rue Bichat
  { lat: 48.8763, lng: 2.3661 }, // écluse des Récollets (face au square Villemin)
  { lat: 48.8778, lng: 2.3672 },
  { lat: 48.8793, lng: 2.3684 }, // vers rue Louis-Blanc
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

/**
 * BD JULES-FERRY puis BD RICHARD-LENOIR (République → Bastille, le canal
 * couvert) — hôte de la ROUTE OUVERTE ; l'avant-poste est à son extrémité,
 * côté Bastille.
 */
export const BD_RICHARD_LENOIR: readonly LatLngPoint[] = [
  { lat: 48.8666, lng: 2.366 }, // départ bd Jules-Ferry, au sud de République
  { lat: 48.8652, lng: 2.3679 },
  { lat: 48.8636, lng: 2.3699 }, // croisement rue Oberkampf
  { lat: 48.8618, lng: 2.3714 },
  { lat: 48.8598, lng: 2.372 }, // métro Richard-Lenoir
  { lat: 48.8578, lng: 2.3712 }, // marché Richard-Lenoir
  { lat: 48.8558, lng: 2.3704 }, // Bréguet-Sabin
  { lat: 48.8538, lng: 2.3694 }, // arrivée place de la Bastille
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

// ─── « Mon territoire » : vraie carte de France (AMENDEMENT-13 §3) ──────────

/** Caméra nationale (vue France entière, échelle « régions »). */
export const FRANCE_CAMERA = { lng: 2.4, lat: 46.6, zoom: 5 } as const;

/** Ancre des crews adverses de la vue France (Saison 0 : rivaux vers Lyon). */
export const LYON_RIVAL: LatLngPoint = { lat: 45.764, lng: 4.8357 };
