/**
 * GRYD — DE LA BASE AU DESSIN, SANS RIEN COMBLER. PUR (lot M3).
 *
 * ─── LE PROBLÈME QUE CE MODULE TRAITE ───────────────────────────────────────
 * `public.territories.geometry` est une colonne `jsonb`. La base STOCKE, elle ne
 * VÉRIFIE pas : ni l'anneau fermé, ni le nombre de sommets, ni la cohérence avec
 * `area_m2`. Ce qui en sort est donc `unknown` au sens strict, et le traiter
 * comme un GeoJSON valide serait affirmer une garantie que personne ne tient.
 *
 * ─── LA RÈGLE : ÉCARTER ET COMPTER, JAMAIS APPROCHER ────────────────────────
 * Une ligne qu'on ne sait pas lire honnêtement n'est pas « redressée », pas
 * remplacée par une forme voisine, pas silencieusement ignorée. Elle est
 * COMPTÉE, et sa présence fait basculer TOUTE la lecture en échec.
 *
 * C'est volontairement sévère, et voici pourquoi : peindre les polygones lisibles
 * en taisant les autres montrerait au joueur MOINS de territoire qu'il n'en a.
 * Une sous-déclaration silencieuse est un mensonge au même titre qu'une donnée
 * inventée — avec le désavantage d'être invisible, y compris pour nous. Un
 * polygone illisible dans `territories` est un bug ; il doit faire du bruit.
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * Aucune I/O, aucun React, aucun recalcul de géométrie. L'aire affichée est
 * `area_m2` — l'aire géodésique calculée UNE FOIS par le moteur, celle de la
 * forme que le joueur voit. On ne « corrige » pas un polygone qu'on n'a pas
 * produit.
 */

/** Attribution LÉGALE des sources de tuiles du fond de nuit (ODbL / CARTO). */
export const BASEMAP_ATTRIBUTION = '© OpenStreetMap © CARTO';

/** Position GeoJSON `[lng, lat]`. */
export type Position = [number, number];

/** Anneau FERMÉ (dernier point = premier), tel que MapLibre l'attend. */
export type ClosedRing = Position[];

/**
 * ⚠️ CES DEUX TYPES NE SONT PAS `readonly`, et c'est SUBI, pas choisi : les
 * déclarations GeoJSON de MapLibre (natif comme web) demandent des tableaux
 * MUTABLES, et un `readonly` ici ne se convertit pas. L'immuabilité reste tenue
 * par l'usage — ces objets sont construits une fois par `toTerritoryGeo` et
 * personne ne les écrit ensuite —, simplement plus par le compilateur.
 */
export interface TerritoryFeature {
  type: 'Feature';
  id: string;
  properties: { areaM2: number };
  geometry: { type: 'Polygon'; coordinates: ClosedRing[] };
}

export interface TerritoryFeatureCollection {
  type: 'FeatureCollection';
  features: TerritoryFeature[];
}

/**
 * Une ligne de `public.territories`, réduite à ce que le MVP en lit.
 *
 * `geometry` est `unknown` À DESSEIN — voir l'en-tête.
 */
export interface TerritoryRow {
  readonly id: string;
  readonly geometry: unknown;
  readonly area_m2: number;
}

/** Un sommet est-il une position terrestre plausible ? */
function estPosition(v: unknown): v is Position {
  if (!Array.isArray(v) || v.length < 2) return false;
  const [lng, lat] = v as unknown[];
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * `jsonb` → anneaux FERMÉS, ou `null` si ce n'est pas un Polygon exploitable.
 *
 * FERMÉS, et le premier point est réapposé SEULEMENT s'il manque : ajouter un
 * sommet à un anneau déjà fermé y créerait un segment de longueur nulle, que
 * MapLibre peut refuser de trianguler — la forme disparaîtrait sans un mot.
 *
 * Tous les anneaux sont conservés, TROUS COMPRIS : un territoire peut en avoir
 * (une place fermée, un parc traversé), et n'en garder que l'extérieur peindrait
 * une surface que le joueur ne possède pas.
 */
export function parsePolygonRings(value: unknown): ClosedRing[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const g = value as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates) || g.coordinates.length === 0) {
    return null;
  }

  const anneaux: ClosedRing[] = [];
  for (const brut of g.coordinates) {
    if (!Array.isArray(brut)) return null;
    const points: Position[] = [];
    for (const p of brut) {
      if (!estPosition(p)) return null;
      points.push([p[0], p[1]]);
    }
    // Un anneau a besoin de 3 sommets DISTINCTS : moins, c'est un segment ou un
    // point, qui n'enferme aucune surface. On refuse plutôt que de peindre un
    // trait en le nommant « territoire ».
    const premier = points[0];
    const dernier = points[points.length - 1];
    const ouvert =
      premier !== undefined && dernier !== undefined && points.length >= 2 && memePoint(premier, dernier)
        ? points.slice(0, -1)
        : points;
    const depart = ouvert[0];
    if (ouvert.length < 3 || depart === undefined) return null;
    anneaux.push([...ouvert, depart]);
  }
  return anneaux;
}

function memePoint(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Le résultat d'une lecture de territoires.
 *
 * `failed` porte le NOMBRE de lignes illisibles : sans lui, l'échec serait
 * indiscernable d'une panne réseau, et personne ne saurait qu'il y a des données
 * corrompues à réparer.
 */
export type TerritoryGeoResult =
  | {
      readonly kind: 'ok';
      /** Ce que je POSSÈDE : surface dérivée des cellules (ADR-010), lissée. */
      readonly collection: TerritoryFeatureCollection;
      /**
       * Ce que j'ai COURU : le tracé réel, point par point.
       *
       * ⚠️ Ce n'est PAS la même chose que `collection`, et les confondre était
       * tout le sujet d'ADR-010. La surface possédée épouse la maille (elle
       * peut rétrécir quand un rival mord dedans) ; le TRACÉ, lui, suit les
       * rues — c'est la ligne que le coureur reconnaît comme sa sortie, et elle
       * ne change jamais après coup.
       *
       * Vide = aucune trace à dessiner. Jamais une ligne droite de substitution :
       * relier deux points éloignés dessinerait un raccourci que personne n'a
       * couru (à travers un pâté de maisons, un fleuve, une voie ferrée).
       */
      readonly trace: TerritoryFeatureCollection;
      readonly ownedCount: number;
      readonly areaM2: number;
    }
  | { readonly kind: 'failed'; readonly unreadable: number };

/**
 * Lignes de la base → ce que la carte peint et ce que l'écran annonce. PURE.
 *
 * UNE seule ligne illisible fait basculer le tout en `failed` — voir l'en-tête.
 * Zéro ligne, en revanche, est un `ok` parfaitement valide : c'est le joueur qui
 * n'a encore rien pris, et c'est le SEUL cas où l'écran a le droit de le dire.
 */
export function toTerritoryGeo(rows: readonly TerritoryRow[]): TerritoryGeoResult {
  const features: TerritoryFeature[] = [];
  let illisibles = 0;
  let aire = 0;

  for (const row of rows) {
    const anneaux = parsePolygonRings(row.geometry);
    // `area_m2` est vérifiée AUSSI : une aire absente ou aberrante rendrait le
    // chiffre héros faux, et un chiffre faux est pire qu'une forme manquante —
    // c'est lui que le joueur retient et partage.
    if (anneaux === null || !Number.isFinite(row.area_m2) || row.area_m2 < 0) {
      illisibles += 1;
      continue;
    }
    features.push({
      type: 'Feature',
      id: row.id,
      properties: { areaM2: row.area_m2 },
      geometry: { type: 'Polygon', coordinates: anneaux },
    });
    aire += row.area_m2;
  }

  if (illisibles > 0) return { kind: 'failed', unreadable: illisibles };
  const collection: TerritoryFeatureCollection = { type: 'FeatureCollection', features };
  return {
    kind: 'ok',
    collection,
    // Par défaut, le tracé EST la géométrie lue : c'est le chemin réel, tel que
    // le moteur l'a produit à partir des points GPS. L'appelant remplace
    // `collection` par la surface dérivée des cellules (ADR-010) et GARDE
    // celle-ci comme tracé.
    trace: collection,
    ownedCount: features.length,
    areaM2: aire,
  };
}
