/**
 * GRYD — LA FORME DE CE QUE JE TIENS, DÉRIVÉE DES CELLULES (ADR-010).
 *
 * ─── POURQUOI CE MODULE REMPLACE LA LECTURE DES POLYGONES ───────────────────
 * Un coureur ne prend pas une zone entière : il en prend une PART, et souvent
 * une part de plusieurs à la fois. C'est le cas normal, pas un cas limite.
 *
 * Or `territories` n'est jamais découpé (aucun `ST_Difference` dans le dépôt).
 * Lire les polygones de boucle, c'est donc afficher à chacun sa boucle ENTIÈRE
 * sur un terrain qui n'appartient qu'à l'un d'eux — la carte affirme une
 * propriété que la base contredit.
 *
 * ADR-010 tranche : les CELLULES sont la propriété, la forme se DÉRIVE d'elles.
 * Perdre une part, c'est perdre des cellules — la forme se redessine seule,
 * sans découpe, sans échardes, et sans divergence possible puisqu'il n'y a plus
 * qu'une source de vérité.
 *
 * ─── POURQUOI ICI ET PAS EN SQL ─────────────────────────────────────────────
 * `h3` n'est pas disponible comme extension sur le projet Supabase (vérifié
 * le 03/08/2026) : la base ne sait pas convertir un `h3index` en géométrie.
 * `h3-js` est en revanche une dépendance de `apps/mobile`. C'est exactement ce
 * que décrit le MASTER §29 — « H3 invisible backend, polygones organiques
 * frontend ».
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * Aucune I/O, aucune décision de jeu. Il traduit une liste de cellules en
 * anneaux dessinables, et refuse de traduire ce qu'il ne sait pas lire.
 */
import { cellsToMultiPolygon } from 'h3-js';
import type { ClosedRing, TerritoryFeature, TerritoryFeatureCollection } from './territoryGeo';

/**
 * Une cellule tenue, telle que `hex_claims` la rend.
 *
 * ⚠️ `h3index` est un **BIGINT** en base, et PostgREST le rend en `string` ou
 * `number` selon la colonne et le client. `h3-js` n'accepte QUE la forme
 * hexadécimale. La conversion est faite ici, une fois, à l'unique endroit qui
 * lit la base — ailleurs, un `toString()` sur un bigint donnerait du décimal,
 * que `h3-js` refuse silencieusement (cellule ignorée, territoire amputé).
 */
export interface HeldCell {
  readonly h3index: string | number | bigint;
}

/** BIGINT (décimal) → index H3 hexadécimal. `null` si ce n'est pas un entier. */
export function toH3Index(brut: string | number | bigint): string | null {
  try {
    // Déjà hexadécimal ? Un index H3 res 10 fait 15 caractères et commence par
    // `8`. On ne « devine » pas : on n'accepte cette forme que si elle est
    // strictement hexadécimale et de la bonne longueur.
    if (typeof brut === 'string' && /^[0-9a-f]{15,16}$/i.test(brut) && !/^\d+$/.test(brut)) {
      return brut.toLowerCase();
    }
    const n = BigInt(brut);
    if (n <= 0n) return null;
    return n.toString(16);
  } catch {
    return null;
  }
}

/**
 * Cellules tenues → anneaux dessinables. PURE.
 *
 * `cellsToMultiPolygon` fusionne les cellules ADJACENTES en un seul contour :
 * c'est ce qui donne la forme ORGANIQUE. Des cellules éparses rendent plusieurs
 * contours — et c'est juste : deux quartiers non contigus SONT deux formes.
 *
 * ⚠️ Une cellule illisible est ÉCARTÉE et COMPTÉE, jamais devinée. Un index mal
 * converti dessinerait un hexagone à l'autre bout du monde, ou en effacerait un
 * silencieusement — les deux sont des mensonges, l'un visible, l'autre pas.
 */
export interface HeldShapeResult {
  readonly rings: ClosedRing[];
  /** Cellules qu'on n'a pas su lire. > 0 = la forme est INCOMPLÈTE. */
  readonly unreadable: number;
}

export function heldShape(cells: readonly HeldCell[]): HeldShapeResult {
  const index: string[] = [];
  let unreadable = 0;
  for (const c of cells) {
    const h = toH3Index(c.h3index);
    if (h === null) unreadable += 1;
    else index.push(h);
  }
  if (index.length === 0) return { rings: [], unreadable };

  let brut: number[][][][];
  try {
    // `true` = coordonnées GeoJSON (lng, lat). Le défaut de h3-js est (lat, lng)
    // — l'inverse. Se tromper ici place Rouen au large de la Somalie.
    brut = cellsToMultiPolygon(index, true) as unknown as number[][][][];
  } catch {
    return { rings: [], unreadable: unreadable + index.length };
  }

  const rings: ClosedRing[] = [];
  for (const polygone of brut) {
    for (const anneau of polygone) {
      if (!Array.isArray(anneau) || anneau.length < 3) continue;
      const points = anneau
        .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .map((p) => [p[0], p[1]] as [number, number]);
      if (points.length < 3) continue;
      const premier = points[0];
      const dernier = points[points.length - 1];
      if (premier === undefined || dernier === undefined) continue;
      // Refermer SEULEMENT si nécessaire : un sommet dupliqué crée un segment
      // de longueur nulle que MapLibre peut refuser de trianguler.
      const ferme =
        premier[0] === dernier[0] && premier[1] === dernier[1] ? points : [...points, premier];
      rings.push(ferme);
    }
  }
  return { rings, unreadable };
}

/**
 * Cellules tenues → ce que la carte peint. PURE.
 *
 * UNE seule `Feature` : ce que je tiens est UNE possession, même si elle se
 * dessine en plusieurs morceaux. En faire une feature par morceau ferait
 * compter des « zones » là où il n'y a que des fragments d'une même propriété.
 *
 * ⚠️ Renvoie `null` dès qu'une cellule est illisible — même contrat que
 * `toTerritoryGeo` : peindre les cellules lisibles en taisant les autres
 * montrerait MOINS de territoire qu'il n'y en a, et une sous-déclaration
 * silencieuse est un mensonge au même titre qu'une donnée inventée.
 */
export function heldCollection(
  cells: readonly HeldCell[],
): { readonly collection: TerritoryFeatureCollection; readonly cellCount: number } | null {
  const { rings, unreadable } = heldShape(cells);
  if (unreadable > 0) return null;
  if (rings.length === 0) {
    return { collection: { type: 'FeatureCollection', features: [] }, cellCount: 0 };
  }
  const feature: TerritoryFeature = {
    type: 'Feature',
    id: 'moi',
    // L'aire ne se dérive PAS d'ici : elle vient de la base (`area_m2`), qui la
    // tient du moteur. La recalculer sur les anneaux donnerait un second chiffre
    // qui finirait par contredire le premier.
    properties: { areaM2: 0 },
    geometry: { type: 'Polygon', coordinates: rings },
  };
  return { collection: { type: 'FeatureCollection', features: [feature] }, cellCount: cells.length };
}
