/**
 * GRYD — basemap urbaine STYLISÉE de la Battle Map web (AMENDEMENT-08 §4,
 * doc §7 « Basemap urbaine subtile »). Ce n'est PAS une carte exacte : des
 * polylignes approximatives (Seine, canal Saint-Martin, 3 parcs, axes
 * principaux) et des noms de secteurs discrets, dessinées en SVG sous la
 * grille d'hexes pour que la ville se sente sans jamais ressembler à Google
 * Maps. Coordonnées lat/lng grossières autour du disque démo (centre Paris,
 * rayon ~1,7 km) — purement visuelles, aucune règle de jeu ici.
 * (La version native MapLibre a déjà un fond vectoriel : ce module ne sert
 * qu'au rendu SVG web + aux labels de secteurs des deux variantes.)
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface SectorLabel {
  name: string;
  lat: number;
  lng: number;
}

/** La Seine, stylisée ouest → est (bande large). */
export const SEINE: readonly LatLngPoint[] = [
  { lat: 48.8601, lng: 2.328 },
  { lat: 48.8572, lng: 2.341 },
  { lat: 48.8533, lng: 2.35 },
  { lat: 48.851, lng: 2.356 },
  { lat: 48.8497, lng: 2.365 },
  { lat: 48.8479, lng: 2.376 },
];

/** Canal Saint-Martin → bassin de l'Arsenal (trait fin nord → sud). */
export const CANAL: readonly LatLngPoint[] = [
  { lat: 48.8724, lng: 2.3662 },
  { lat: 48.8698, lng: 2.3672 },
  { lat: 48.867, lng: 2.3656 },
  { lat: 48.8643, lng: 2.3645 },
  { lat: 48.8615, lng: 2.3668 },
  { lat: 48.8565, lng: 2.3678 },
  { lat: 48.8495, lng: 2.3688 },
];

/** 3 parcs stylisés (anneaux fermés). */
export const PARKS: readonly (readonly LatLngPoint[])[] = [
  // Square du Temple
  [
    { lat: 48.8654, lng: 2.3598 },
    { lat: 48.8653, lng: 2.362 },
    { lat: 48.864, lng: 2.3618 },
    { lat: 48.8641, lng: 2.36 },
  ],
  // Place des Vosges
  [
    { lat: 48.8563, lng: 2.3645 },
    { lat: 48.8562, lng: 2.3665 },
    { lat: 48.8549, lng: 2.3663 },
    { lat: 48.855, lng: 2.3644 },
  ],
  // Jardin des Plantes (bord sud du disque, partiellement hors cadre)
  [
    { lat: 48.8443, lng: 2.3545 },
    { lat: 48.8437, lng: 2.362 },
    { lat: 48.8415, lng: 2.3608 },
    { lat: 48.8421, lng: 2.3538 },
  ],
];

/** Axes principaux (traits très fins). */
export const AXES: readonly (readonly LatLngPoint[])[] = [
  // Rivoli → Saint-Antoine → Bastille
  [
    { lat: 48.8592, lng: 2.329 },
    { lat: 48.8568, lng: 2.345 },
    { lat: 48.8553, lng: 2.361 },
    { lat: 48.8532, lng: 2.369 },
  ],
  // Sébastopol (nord-sud)
  [
    { lat: 48.845, lng: 2.348 },
    { lat: 48.857, lng: 2.3505 },
    { lat: 48.869, lng: 2.354 },
  ],
  // Grands Boulevards ← République
  [
    { lat: 48.8676, lng: 2.3634 },
    { lat: 48.869, lng: 2.351 },
    { lat: 48.871, lng: 2.34 },
  ],
  // Boulevard Voltaire (République → sud-est)
  [
    { lat: 48.8676, lng: 2.3634 },
    { lat: 48.86, lng: 2.376 },
  ],
];

/** Noms de secteurs très discrets (doc §7 : Paris Est / République / Canal / Bastille). */
export const SECTOR_LABELS: readonly SectorLabel[] = [
  { name: 'RÉPUBLIQUE', lat: 48.8688, lng: 2.3634 },
  { name: 'CANAL', lat: 48.871, lng: 2.3698 },
  { name: 'BASTILLE', lat: 48.8523, lng: 2.3692 },
  { name: 'PARIS EST', lat: 48.8598, lng: 2.3745 },
];
