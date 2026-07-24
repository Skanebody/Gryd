/**
 * GRYD — OUVRIR UNE COMMUNE PAR LA PRÉSENCE (partie pure + adaptateur réseau).
 *
 * « Dès que quelqu'un s'inscrit et est le premier dans la ville, ça ouvre la
 * ville, même en campagne. » Il n'y a AUCUNE position au signup (le compte se
 * crée avant le GPS, migration 0028). Le vrai « premier présent », c'est le
 * coureur dont la PREMIÈRE course tombe dans une commune sans `city_zone`. Ce
 * module fournit ce dont `ingest_run` a besoin pour l'ouvrir HONNÊTEMENT :
 *
 *  1. `communeCityId(insee)` — l'identifiant stable de la zone : « insee-<code> »,
 *     sans collision avec les geonameid EU ni les starters 'paris'/'lille' ;
 *  2. `simplifyGeometry(contour, tol)` — allège le contour ADMINISTRATIF RÉEL
 *     (geo.api.gouv.fr) avant de l'écrire, en gardant sa forme. PUR, donc testé ;
 *  3. `reverseGeocodeCommune(lat, lng)` — résout un point → { insee, nom,
 *     geojson } depuis geo.api.gouv.fr. BEST-EFFORT strict : sur panne réseau ou
 *     réponse illisible, renvoie `undefined` (jamais throw). L'appelant DIFFÈRE
 *     alors l'ouverture — la course reste « hors zone », comportement honnête
 *     déjà en place —, il ne fabrique JAMAIS ni disque ni nom de repli.
 *
 * ⚠️ On ne pose PAS de disque de 15 km sur une commune : les communes PARTITIONNENT
 * le territoire, un disque en avalerait des dizaines (CITY_DISC_RADIUS_M est
 * réservé à la voie Europe-vision — cf. game-rules). Ici, contour réel ou rien.
 */
import { COMMUNE_CONTOUR_SIMPLIFY_DEG } from '../_shared/game-rules.ts';

/** Identifiant de zone d'une commune. Le code INSEE reste TEXTE (« 01001 », « 2A004 »). */
export function communeCityId(insee: string): string {
  return `insee-${insee}`;
}

/**
 * LE GARDE de l'auto-ouverture par présence, isolé et PUR (la partie la plus
 * facile à casser). Une course n'ouvre une commune QUE si les cinq conditions
 * tiennent ENSEMBLE :
 *  · `!hasCityZone` — le départ ne tombe dans AUCUNE zone existante (sinon on
 *    court déjà dans une commune ouverte, rien à ouvrir) ;
 *  · `validationKind === 'claimable'` — une course refusée/suspecte n'ouvre rien
 *    (on ne fonde pas le monde sur un fait de jeu invalidé) ;
 *  · `runMode === 'conquete'` — une course_privee (aucun partage) ou un
 *    social_run ne DOIT pas ouvrir une commune PUBLIQUE (confidentialité) ;
 *  · `source === 'gps'` — GPS LIVE uniquement : les imports (gpx/healthkit) sont
 *    le vecteur de la « zone vide au loin » falsifiée que le fondateur interdit ;
 *  · `pointCount > 0` — il faut un point de départ à géocoder.
 */
export function shouldAutoOpenCommune(ctx: {
  readonly hasCityZone: boolean;
  readonly validationKind: string;
  readonly runMode: string;
  readonly source: string;
  readonly pointCount: number;
}): boolean {
  return (
    !ctx.hasCityZone &&
    ctx.validationKind === 'claimable' &&
    ctx.runMode === 'conquete' &&
    ctx.source === 'gps' &&
    ctx.pointCount > 0
  );
}

type Pt = readonly [number, number];

/**
 * Distance perpendiculaire du point `p` au segment [a, b], en espace degrés.
 * Suffisant pour SIMPLIFIER (on ne mesure pas une vraie distance terrestre, on
 * décide quels sommets sont superflus) — la tolérance est elle-même en degrés.
 */
function perpDist(p: Pt, a: Pt, b: Pt): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return Math.sqrt(ex * ex + ey * ey);
  }
  // Projection scalaire bornée au segment.
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

/** Douglas-Peucker classique sur une polyligne ouverte. Pur, sans effet de bord. */
export function douglasPeucker(points: readonly Pt[], tol: number): Pt[] {
  if (points.length <= 2) return points.slice();
  let maxDist = 0;
  let idx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      idx = i;
    }
  }
  if (maxDist <= tol) return [first, last];
  const left = douglasPeucker(points.slice(0, idx + 1), tol);
  const right = douglasPeucker(points.slice(idx), tol);
  // `left` finit par points[idx], `right` commence par points[idx] : on dédoublonne.
  return left.slice(0, -1).concat(right);
}

/**
 * Simplifie un anneau FERMÉ (premier point == dernier). On simplifie la partie
 * ouverte puis on referme. Un anneau valide (GeoJSON) exige ≥ 4 points (3 + le
 * point de fermeture) : si la simplification descend en dessous, on GARDE
 * l'anneau d'origine plutôt que de produire une géométrie dégénérée.
 */
export function simplifyRing(ring: readonly Pt[], tol: number): Pt[] {
  if (ring.length < 5) return ring.slice(); // déjà minimal : rien à gagner
  const open = douglasPeucker(ring.slice(0, -1), tol);
  if (open.length < 3) return ring.slice(); // dégénéré → on n'abîme pas la donnée
  return open.concat([open[0]]);
}

type Ring = Pt[];
type PolygonCoords = Ring[]; // [extérieur, trous...]
export interface GeoPolygon {
  readonly type: 'Polygon';
  readonly coordinates: readonly (readonly Pt[])[];
}
export interface GeoMultiPolygon {
  readonly type: 'MultiPolygon';
  readonly coordinates: readonly (readonly (readonly Pt[])[])[];
}
export type CommuneGeometry = GeoPolygon | GeoMultiPolygon;

function simplifyPolygon(coords: readonly (readonly Pt[])[], tol: number): PolygonCoords {
  return coords.map((ring) => simplifyRing(ring, tol));
}

/**
 * Simplifie un contour Polygon OU MultiPolygon. Toute autre forme (ou une
 * géométrie illisible) renvoie `undefined` : on n'écrit que ce qu'on a compris.
 */
export function simplifyGeometry(
  geom: unknown,
  tol: number = COMMUNE_CONTOUR_SIMPLIFY_DEG,
): CommuneGeometry | undefined {
  if (!geom || typeof geom !== 'object') return undefined;
  const g = geom as { type?: unknown; coordinates?: unknown };
  if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
    const rings = g.coordinates as (readonly Pt[])[];
    if (!isRings(rings)) return undefined;
    return { type: 'Polygon', coordinates: simplifyPolygon(rings, tol) };
  }
  if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
    const polys = g.coordinates as (readonly (readonly Pt[])[])[];
    if (!polys.every(isRings)) return undefined;
    return {
      type: 'MultiPolygon',
      coordinates: polys.map((p) => simplifyPolygon(p, tol)),
    };
  }
  return undefined;
}

function isRings(rings: unknown): rings is (readonly Pt[])[] {
  return (
    Array.isArray(rings) &&
    rings.length > 0 &&
    rings.every(
      (r) =>
        Array.isArray(r) &&
        r.length >= 4 &&
        r.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            Number.isFinite(p[0]) &&
            Number.isFinite(p[1]),
        ),
    )
  );
}

export interface ResolvedCommune {
  readonly insee: string;
  readonly nom: string;
  readonly geojson: CommuneGeometry;
}

/** Forme de `fetch` injectable, pour tester l'adaptateur sans réseau. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * Budget I/O de l'appel geo.api.gouv.fr — TECHNIQUE, pas une règle de jeu (comme
 * WEATHER_TIMEOUT_MS d'ingest_run). Sans borne, un ralentissement de l'API
 * gouvernementale sur le chemin CHAUD d'ingestion ferait tuer la fonction edge
 * par son wall-clock → une course VALIDE échouerait à s'enregistrer. Le timeout
 * dépassé lève, `reverseGeocodeCommune` l'attrape et rend `undefined` : la course
 * reste « hors zone » (honnête), jamais un échec d'ingestion.
 */
const GEO_API_TIMEOUT_MS = 3_000;

/** `fetch` par défaut, BORNÉ par un timeout — l'injection dans les tests s'en passe. */
const timedFetch: FetchLike = (url) =>
  fetch(url, { signal: AbortSignal.timeout(GEO_API_TIMEOUT_MS) });

/**
 * Résout un point GPS → commune RÉELLE (code INSEE + nom + contour) via
 * geo.api.gouv.fr. BEST-EFFORT : toute panne (réseau, 4xx/5xx, corps illisible,
 * contour non simplifiable) rend `undefined`. JAMAIS de throw, JAMAIS de repli
 * fabriqué — l'appelant diffère l'ouverture, la course reste honnêtement « hors
 * zone ».
 */
export async function reverseGeocodeCommune(
  lat: number,
  lng: number,
  fetchImpl: FetchLike = timedFetch,
): Promise<ResolvedCommune | undefined> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const url =
    `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}` +
    `&fields=code,nom,contour&geometry=contour&format=json`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return undefined;
    const body: unknown = await res.json();
    if (!Array.isArray(body) || body.length === 0) return undefined;
    // Le point tombe dans UNE commune ; s'il y en a plusieurs (frontière), la
    // première fait foi — le rattachement exact restera au point-in-polygon.
    const first = body[0] as { code?: unknown; nom?: unknown; contour?: unknown };
    if (typeof first.code !== 'string' || first.code.length === 0) return undefined;
    if (typeof first.nom !== 'string' || first.nom.length === 0) return undefined;
    const geojson = simplifyGeometry(first.contour);
    if (!geojson) return undefined;
    return { insee: first.code, nom: first.nom, geojson };
  } catch {
    // Réseau tombé / JSON illisible : on ne devine rien, on diffère.
    return undefined;
  }
}
