/**
 * GRYD — engine/polygon.ts
 * Géométrie POLYGONALE des territoires (spec produit §1.4 : un territoire est
 * un POLYGONE issu de la trace réelle — les hexagones ne sont plus qu'un index
 * spatial interne, jamais une frontière montrée).
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun accès réseau/DB — et
 * AUCUNE dépendance (ni h3-js, ni game-rules). C'est volontaire :
 *  · aucune constante de JEU n'intervient ici (les seuils — 60 % de §9.1, la
 *    tolérance de généralisation de §12.3 — sont des PARAMÈTRES passés par
 *    l'appelant, qui les tire de game-rules) ; seules des constantes
 *    physiques/numériques vivent dans ce fichier ;
 *  · le module reste chargeable seul (moteur, Edge Function, test) sans tirer
 *    la grille H3 dans le graphe d'imports.
 * `haversineM` est réimplémenté ici (10 lignes) plutôt qu'importé de
 * validation.ts pour cette raison — la formule est une identité mathématique,
 * pas une règle susceptible de diverger.
 *
 * CONVENTION D'ANNEAU — identique à `DetectedLoop.polygon` (hexing.ts) : le
 * dernier sommet NE répète PAS le premier ; la fermeture est implicite. Seule
 * la forme PERSISTÉE (GeoJSON, jsonb) referme l'anneau explicitement, comme
 * l'exige la RFC 7946. Orientation canonique : CCW (sens trigonométrique dans
 * le plan x=lng, y=lat), également la convention RFC 7946 pour un anneau
 * extérieur.
 *
 * PROJECTION — deux régimes, assumés et distincts :
 *  · `polygonAreaM2` est GÉODÉSIQUE (formule d'aire sphérique, cf. son
 *    docblock) : c'est l'aire qu'on affiche, qu'on compare à un plafond, qu'on
 *    persiste. Elle doit être juste dans l'absolu.
 *  · intersection / union / simplification travaillent en projection
 *    équirectangulaire LOCALE (mêmes conventions que hexing.ts : origine au
 *    premier point, cos(latitude moyenne)) : à l'échelle d'un quartier la
 *    distorsion est < 1e-4 en relatif, et surtout elle est IDENTIQUE sur les
 *    deux polygones comparés — un RAPPORT d'aires (intersectionRatio) est donc
 *    exact à cette échelle, ce qui est précisément ce que §9.1 demande.
 *
 * NON COUVERT (et jamais prétendu) : l'antiméridien (±180°) et les pôles. Le
 * terrain de jeu est l'Europe ; aucune de ces fonctions ne recolle une
 * longitude qui saute de +180 à −180.
 */
/**
 * Point lat/lng. DÉCLARÉ ICI, et surtout PAS importé de `./hexing.ts` — c'est la
 * dernière ligne qui manquait au « AUCUNE dépendance » revendiqué ci-dessus.
 *
 * Un `import type` est effacé à la compilation, donc il ne coûtait rien à
 * l'exécution ; mais il oblige tout typechecker qui ouvre ce fichier à ouvrir
 * AUSSI `hexing.ts`, donc `@klaim/shared/game-rules` et h3-js. Le mobile
 * (`moduleResolution: node`, qui ne lit pas le champ `exports`) échouait dessus
 * — et c'est ce module qui alimente son pipeline de confidentialité du partage
 * (`apps/mobile/src/features/share/sharePrivacy.ts`).
 *
 * TypeScript étant STRUCTUREL, ce type et `hexing.LatLngPoint` restent
 * interchangeables partout : rien à convertir chez les appelants. Il n'est
 * volontairement PAS exporté — `src/index.ts` ré-exporte `hexing.ts` ET ce
 * fichier, deux exports du même nom entreraient en collision.
 */
interface LatLngPoint {
  lat: number;
  lng: number;
}

// ─── Constantes physiques / numériques — PAS des règles de jeu ───────────────
const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
/** Tolérance « ce point est sur cette arête » (m). 1 µm ≫ l'erreur double (~1e-10 m). */
const ON_EDGE_EPS_M = 1e-6;
/** Grille de quantification des extrémités de fragments pour le chaînage (m). */
const SNAP_M = 1e-3;
/** Sous cette longueur (m), un fragment d'arête est du bruit numérique. */
const MIN_FRAGMENT_M = 1e-6;

/** Anneau de territoire : sommets lat/lng, fermeture implicite (cf. docblock). */
export type PolygonRing = readonly LatLngPoint[];

/** Polygone GeoJSON (RFC 7946) — la forme PERSISTÉE en colonne jsonb. */
export interface GeoJsonPolygon {
  type: 'Polygon';
  /** Anneaux `[lng, lat]`, premier = extérieur, refermés (dernier = premier). */
  coordinates: number[][][];
}

/** Distance haversine (m) — identité mathématique, cf. docblock du module. */
function haversineM(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = (b.lat - a.lat) * RAD_PER_DEG;
  const dLng = (b.lng - a.lng) * RAD_PER_DEG;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD_PER_DEG) * Math.cos(b.lat * RAD_PER_DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

// ─── §1 Mesures ──────────────────────────────────────────────────────────────

/**
 * Aire GÉODÉSIQUE (m²) d'un anneau lat/lng, formule d'aire sphérique
 * A = R²/2 · Σ (λᵢ₊₁ − λᵢ₋₁) · sin φᵢ.
 *
 * POURQUOI celle-ci plutôt qu'un shoelace sur projection locale (ce que fait
 * `traceAreaM2` dans hexing.ts) : le shoelace local ne sert là-bas qu'à écarter
 * un polygone DÉGÉNÉRÉ (aire ≈ 0) — une erreur de 1 % y est sans conséquence.
 * Ici l'aire est AUTORITAIRE : elle est persistée, affichée, comparée au
 * plafond de §9. La formule sphérique est l'intégrale exacte de l'aire sous
 * chaque arête dans la projection cylindrique équivalente (λ, sin φ) : elle est
 * EXACTE pour un rectangle lat/lng et juste à mieux que 1e-4 en relatif à
 * l'échelle d'un quartier, sans dépendre d'un choix de latitude de référence.
 *
 * Retourne une aire NON SIGNÉE : l'orientation de l'anneau ne change rien.
 */
export function polygonAreaM2(ring: PolygonRing): number {
  const n = ring.length;
  if (n < 3) return 0;
  let doubled = 0;
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n]!;
    const cur = ring[i]!;
    const next = ring[(i + 1) % n]!;
    doubled += (next.lng - prev.lng) * RAD_PER_DEG * Math.sin(cur.lat * RAD_PER_DEG);
  }
  return Math.abs((doubled * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Périmètre (m) d'un anneau : somme des arêtes, segment de fermeture inclus. */
export function polygonPerimeterM(ring: PolygonRing): number {
  const n = ring.length;
  if (n < 2) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) total += haversineM(ring[i]!, ring[(i + 1) % n]!);
  return total;
}

// ─── §2 Projection équirectangulaire locale (conventions de hexing.ts) ───────

interface XY {
  x: number;
  y: number;
}

interface LocalProjection {
  lat0: number;
  lng0: number;
  cosLat0: number;
}

/** Projection centrée sur le 1er point, échelle en longitude à la latitude moyenne. */
function projectionFor(points: readonly LatLngPoint[]): LocalProjection {
  const first = points[0] ?? { lat: 0, lng: 0 };
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const meanLat = points.length > 0 ? latSum / points.length : 0;
  return { lat0: first.lat, lng0: first.lng, cosLat0: Math.cos(meanLat * RAD_PER_DEG) };
}

function toXY(p: LatLngPoint, proj: LocalProjection): XY {
  return {
    x: (p.lng - proj.lng0) * RAD_PER_DEG * proj.cosLat0 * EARTH_RADIUS_M,
    y: (p.lat - proj.lat0) * RAD_PER_DEG * EARTH_RADIUS_M,
  };
}

function toLatLng(q: XY, proj: LocalProjection): LatLngPoint {
  return {
    lat: proj.lat0 + q.y / (RAD_PER_DEG * EARTH_RADIUS_M),
    lng: proj.lng0 + q.x / (RAD_PER_DEG * EARTH_RADIUS_M * proj.cosLat0),
  };
}

/** Produit vectoriel 2D (z) — double de l'aire signée du triangle (O, a, b). */
function cross(a: XY, b: XY): number {
  return a.x * b.y - a.y * b.x;
}

/** Aire signée (m²) d'un anneau projeté : > 0 ⇔ CCW. */
function signedAreaXY(ring: readonly XY[]): number {
  let doubled = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    doubled += cross(a, b);
  }
  return doubled / 2;
}

// ─── §3 Normalisation ────────────────────────────────────────────────────────

/**
 * Anneau CANONIQUE : sans sommet dupliqué consécutif (ni fermeture répétée) et
 * orienté CCW (RFC 7946 pour un anneau extérieur). PURE, retourne une COPIE.
 *
 * L'orientation se décide au shoelace sur (lng, lat) BRUTS : mettre les
 * longitudes à l'échelle par cos(lat) est une homothétie positive, elle ne peut
 * pas changer le SIGNE — inutile de projeter pour connaître le sens.
 *
 * Un anneau de moins de 3 sommets distincts n'est pas un polygone : il est
 * retourné tel quel (dédupliqué), à charge de l'appelant de le refuser.
 */
export function normalizeRing(ring: PolygonRing): LatLngPoint[] {
  const out: LatLngPoint[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (last !== undefined && last.lat === p.lat && last.lng === p.lng) continue;
    out.push({ lat: p.lat, lng: p.lng });
  }
  while (out.length > 1) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (first.lat !== last.lat || first.lng !== last.lng) break;
    out.pop();
  }
  if (out.length < 3) return out;
  let doubled = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[i]!;
    const b = out[(i + 1) % out.length]!;
    doubled += a.lng * b.lat - b.lng * a.lat;
  }
  if (doubled < 0) out.reverse();
  return out;
}

// ─── §4 Persistance GeoJSON (colonne jsonb — décision A1-bis, pas de PostGIS) ─

/**
 * Anneau → Polygon GeoJSON (RFC 7946) : coordonnées `[lng, lat]`, anneau
 * REFERMÉ (le dernier sommet répète le premier), orientation CCW normalisée.
 * C'est la forme écrite en base ; `pointInGeoJson` (hexing.ts) l'accepte tel quel.
 */
export function toGeoJsonPolygon(ring: PolygonRing): GeoJsonPolygon {
  const normalized = normalizeRing(ring);
  const coords = normalized.map((p) => [p.lng, p.lat]);
  const first = normalized[0];
  if (first !== undefined) coords.push([first.lng, first.lat]);
  return { type: 'Polygon', coordinates: [coords] };
}

/**
 * Polygon GeoJSON → anneau lat/lng (fermeture retirée, CCW). Seul l'anneau
 * EXTÉRIEUR est lu : le moteur ne manipule pas encore de territoire à trous —
 * l'annoncer serait promettre au-delà du code.
 */
export function fromGeoJsonPolygon(geo: GeoJsonPolygon): LatLngPoint[] {
  const outer = geo.coordinates[0] ?? [];
  const ring: LatLngPoint[] = [];
  for (const pair of outer) {
    const lng = pair[0];
    const lat = pair[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    ring.push({ lat, lng });
  }
  return normalizeRing(ring);
}

// ─── §5 Intersection (brique de §9.1 CONTEST_INTERSECTION_THRESHOLD) ─────────

/**
 * Aire (m²) de l'intersection de deux triangles CONVEXES CCW — Sutherland-
 * Hodgman (exact et sans cas dégénéré tant que le polygone de coupe est
 * convexe, ce qu'un triangle est par construction).
 */
function convexClipAreaXY(subject: readonly XY[], clip: readonly XY[]): number {
  let out: XY[] = [...subject];
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i]!;
    const b = clip[(i + 1) % clip.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const side = (p: XY): number => ex * (p.y - a.y) - ey * (p.x - a.x);
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j]!;
      const q = input[(j + 1) % input.length]!;
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
        const t = sp / (sp - sq);
        out.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
      }
    }
  }
  return Math.abs(signedAreaXY(out));
}

/**
 * Aire (m²) de l'intersection de deux anneaux quelconques, projetés.
 *
 * MÉTHODE — décomposition en éventail signé depuis l'origine : l'aire signée
 * d'un polygone est la somme des aires signées des triangles (O, Pᵢ, Pᵢ₊₁), ce
 * qui reste vrai pour un polygone NON CONVEXE (les triangles « en trop » se
 * soustraient). D'où l'identité |A ∩ B| = |Σᵢ Σⱼ σ(Tᵢ)·σ(Uⱼ)·|Tᵢ ∩ Uⱼ|| : on
 * ne clippe jamais que du CONVEXE contre du CONVEXE (deux triangles), donc
 * aucun algorithme de découpe générale — la source de bugs silencieux évoquée
 * en A1-bis — n'est nécessaire. Concave, disjoint, inclus : mêmes formules.
 *
 * Coût O(|A|·|B|) : les anneaux de territoire sont GÉNÉRALISÉS (simplifyRing)
 * avant d'être confrontés ; l'appelant ne doit pas y jeter une trace brute de
 * 2 000 points.
 */
function intersectionAreaXY(a: readonly XY[], b: readonly XY[]): number {
  // Rejet par boîtes englobantes AVANT la double boucle : c'est le cas le plus
  // fréquent (deux territoires quelconques ne se touchent pas), il coûte O(n+m)
  // au lieu de O(n·m) — et il rend l'aire EXACTEMENT nulle sur des polygones
  // disjoints, là où la somme signée des triangles laisserait un résidu de
  // l'ordre du plancher de la double précision.
  if (!boxesOverlap(a, b)) return 0;
  const origin: XY = { x: 0, y: 0 };
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i]!;
    const a2 = a[(i + 1) % a.length]!;
    const s1 = cross(a1, a2);
    if (s1 === 0) continue;
    const t1: XY[] = s1 > 0 ? [origin, a1, a2] : [origin, a2, a1];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j]!;
      const b2 = b[(j + 1) % b.length]!;
      const s2 = cross(b1, b2);
      if (s2 === 0) continue;
      const t2: XY[] = s2 > 0 ? [origin, b1, b2] : [origin, b2, b1];
      const shared = convexClipAreaXY(t1, t2);
      if (shared === 0) continue;
      total += Math.sign(s1) * Math.sign(s2) * shared;
    }
  }
  return Math.abs(total);
}

/** Les boîtes englobantes des deux anneaux se chevauchent-elles ? */
function boxesOverlap(a: readonly XY[], b: readonly XY[]): boolean {
  const box = (ring: readonly XY[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  };
  const ba = box(a);
  const bb = box(b);
  return ba.minX <= bb.maxX && bb.minX <= ba.maxX && ba.minY <= bb.maxY && bb.minY <= ba.maxY;
}

/** Aire (m²) commune à deux territoires. PURE. Concave et disjoint gérés. */
export function intersectionAreaM2(a: PolygonRing, b: PolygonRing): number {
  if (a.length < 3 || b.length < 3) return 0;
  const proj = projectionFor([...a, ...b]);
  return intersectionAreaXY(a.map((p) => toXY(p, proj)), b.map((p) => toXY(p, proj)));
}

/**
 * Fraction de l'aire de `a` couverte par `b` ∈ [0, 1]. C'est la brique de
 * §9.1 : l'appelant compare ce ratio au seuil de contestation, qui reste dans
 * game-rules — ce module ne connaît AUCUN seuil.
 *
 * Le numérateur et le dénominateur sont calculés dans la MÊME projection
 * locale : la distorsion équirectangulaire se simplifie et le rapport est
 * exact à l'échelle d'un quartier (cf. docblock du module). Un `a` d'aire
 * nulle donne 0 — jamais NaN, jamais une division qui « invente » 1.
 */
export function intersectionRatio(a: PolygonRing, b: PolygonRing): number {
  if (a.length < 3 || b.length < 3) return 0;
  const proj = projectionFor([...a, ...b]);
  const ax = a.map((p) => toXY(p, proj));
  const bx = b.map((p) => toXY(p, proj));
  const areaA = Math.abs(signedAreaXY(ax));
  if (areaA <= 0) return 0;
  const shared = intersectionAreaXY(ax, bx);
  return Math.min(1, shared / areaA);
}

// ─── §6 Union (frontière collective d'un crew, §8.5) ─────────────────────────

interface Fragment {
  a: XY;
  b: XY;
  /** Index de l'anneau d'origine — une arête n'est jamais coupée par le sien. */
  owner: number;
}

/** Clé de quantification (grille SNAP_M) : deux extrémités calculées séparément se recollent. */
function key(p: XY): string {
  return `${Math.round(p.x / SNAP_M)},${Math.round(p.y / SNAP_M)}`;
}

/** Paramètres t ∈ (0,1) auxquels [p,q] doit être coupé à cause de [u,v]. */
function splitParams(p: XY, q: XY, u: XY, v: XY): number[] {
  const out: number[] = [];
  const rx = q.x - p.x;
  const ry = q.y - p.y;
  const sx = v.x - u.x;
  const sy = v.y - u.y;
  const len2 = rx * rx + ry * ry;
  if (len2 === 0) return out;
  const denom = rx * sy - ry * sx;
  if (denom !== 0) {
    const qpx = u.x - p.x;
    const qpy = u.y - p.y;
    const t = (qpx * sy - qpy * sx) / denom;
    const s = (qpx * ry - qpy * rx) / denom;
    if (t > 0 && t < 1 && s >= 0 && s <= 1) out.push(t);
  }
  // Jonction en T / recouvrement colinéaire : une extrémité de [u,v] POSÉE sur
  // [p,q] doit couper aussi, sinon le chaînage rate le raccord.
  for (const w of [u, v]) {
    const t = ((w.x - p.x) * rx + (w.y - p.y) * ry) / len2;
    if (t <= 0 || t >= 1) continue;
    const dx = w.x - (p.x + t * rx);
    const dy = w.y - (p.y + t * ry);
    if (Math.hypot(dx, dy) <= ON_EDGE_EPS_M) out.push(t);
  }
  return out;
}

/** Point STRICTEMENT intérieur à l'anneau (sur la frontière ⇒ false). Even-odd. */
function strictlyInsideXY(ring: readonly XY[], pt: XY): boolean {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len2 = ex * ex + ey * ey;
    if (len2 === 0) continue;
    const t = Math.min(1, Math.max(0, ((pt.x - a.x) * ex + (pt.y - a.y) * ey) / len2));
    const dx = pt.x - (a.x + t * ex);
    const dy = pt.y - (a.y + t * ey);
    if (Math.hypot(dx, dy) <= ON_EDGE_EPS_M) return false; // sur la frontière
  }
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const crosses = (a.y > pt.y) !== (b.y > pt.y) &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Fusion d'un ensemble de territoires en une frontière collective (§8.5).
 * PURE. Retourne la LISTE des anneaux de la fusion (plusieurs si le crew tient
 * des zones disjointes — c'est le cas nominal, pas une erreur).
 *
 * MÉTHODE (découpe + classification + chaînage, pas de dépendance externe) :
 *  1. chaque arête est découpée à toutes ses intersections avec les AUTRES
 *     anneaux (croisements francs ET jonctions en T) ;
 *  2. tout fragment dont le MILIEU est strictement intérieur à un autre anneau
 *     est jeté — c'est de l'intérieur d'union, pas une frontière ;
 *  3. les fragments COÏNCIDENTS sont dédupliqués : parcourus dans le même sens
 *     on en garde un (bords superposés), parcourus en sens OPPOSÉS on les jette
 *     tous — c'est la frontière commune de deux zones accolées, elle disparaît
 *     de l'union (« sans double comptage sur la frontière commune ») ;
 *  4. les fragments restants sont chaînés en anneaux ; à un nœud de degré > 1
 *     on prend le premier voisin dans le sens HORAIRE depuis l'arête d'arrivée
 *     inversée, ce qui suit une face en gardant l'intérieur à gauche.
 *
 * Orientation retournée : TELLE QUE TRACÉE — un contour extérieur ressort CCW.
 * Un éventuel trou (anneau CW) n'est PAS prouvé par les tests : ne pas s'en
 * réclamer tant qu'un cas de trou n'est pas couvert.
 *
 * Coût O(n²) sur le nombre total d'arêtes : à réserver à des anneaux
 * GÉNÉRALISÉS (simplifyRing), pas à des traces brutes.
 */
export function unionPolygons(polygons: readonly PolygonRing[]): LatLngPoint[][] {
  const rings = polygons.map(normalizeRing).filter((r) => r.length >= 3);
  if (rings.length === 0) return [];
  if (rings.length === 1) return [rings[0]!];

  const all: LatLngPoint[] = [];
  for (const r of rings) all.push(...r);
  const proj = projectionFor(all);
  const xy = rings.map((r) => r.map((p) => toXY(p, proj)));

  // 1. découpe
  const fragments: Fragment[] = [];
  for (let r = 0; r < xy.length; r++) {
    const ring = xy[r]!;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!;
      const q = ring[(i + 1) % ring.length]!;
      const ts = new Set<number>([0, 1]);
      for (let s = 0; s < xy.length; s++) {
        if (s === r) continue;
        const other = xy[s]!;
        for (let j = 0; j < other.length; j++) {
          for (const t of splitParams(p, q, other[j]!, other[(j + 1) % other.length]!)) ts.add(t);
        }
      }
      const sorted = [...ts].sort((m, n) => m - n);
      for (let k = 0; k + 1 < sorted.length; k++) {
        const t0 = sorted[k]!;
        const t1 = sorted[k + 1]!;
        const a: XY = { x: p.x + t0 * (q.x - p.x), y: p.y + t0 * (q.y - p.y) };
        const b: XY = { x: p.x + t1 * (q.x - p.x), y: p.y + t1 * (q.y - p.y) };
        if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_FRAGMENT_M) continue;
        fragments.push({ a, b, owner: r });
      }
    }
  }

  // 2. classification : l'intérieur d'un autre anneau n'est plus une frontière
  const onBorder = fragments.filter((f) => {
    const mid: XY = { x: (f.a.x + f.b.x) / 2, y: (f.a.y + f.b.y) / 2 };
    for (let s = 0; s < xy.length; s++) {
      if (s === f.owner) continue;
      if (strictlyInsideXY(xy[s]!, mid)) return false;
    }
    return true;
  });

  // 3. déduplication des fragments coïncidents
  const groups = new Map<string, Fragment[]>();
  for (const f of onBorder) {
    const ka = key(f.a);
    const kb = key(f.b);
    const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    const bucket = groups.get(id);
    if (bucket === undefined) groups.set(id, [f]);
    else bucket.push(f);
  }
  const kept: Fragment[] = [];
  for (const bucket of groups.values()) {
    const first = bucket[0]!;
    if (bucket.length === 1) {
      kept.push(first);
      continue;
    }
    const forward = key(first.a) < key(first.b);
    const opposite = bucket.some((f) => (key(f.a) < key(f.b)) !== forward);
    if (opposite) continue; // frontière commune de deux zones accolées → disparaît
    kept.push(first); // bords superposés dans le même sens → un seul suffit
  }

  // 4. chaînage
  const outgoing = new Map<string, Fragment[]>();
  for (const f of kept) {
    const k = key(f.a);
    const bucket = outgoing.get(k);
    if (bucket === undefined) outgoing.set(k, [f]);
    else bucket.push(f);
  }
  const used = new Set<Fragment>();
  const result: LatLngPoint[][] = [];
  for (const seed of kept) {
    if (used.has(seed)) continue;
    const ringXY: XY[] = [];
    let current: Fragment | undefined = seed;
    const startKey = key(seed.a);
    while (current !== undefined && !used.has(current)) {
      used.add(current);
      ringXY.push(current.a);
      const endKey = key(current.b);
      if (endKey === startKey) break;
      const candidates = (outgoing.get(endKey) ?? []).filter((f) => !used.has(f));
      current = pickNext(current, candidates);
    }
    if (ringXY.length < 3) continue;
    const ring = normalizeRing(ringXY.map((q) => toLatLng(q, proj)));
    if (ring.length < 3 || polygonAreaM2(ring) <= 0) continue;
    result.push(ring);
  }
  return result;
}

/**
 * Prochain fragment à un nœud : le PREMIER voisin rencontré en tournant dans le
 * sens HORAIRE depuis la direction d'arrivée inversée — la règle classique pour
 * suivre une face en gardant son intérieur à gauche (donc un contour extérieur
 * CCW). Sur un nœud de degré 1 (le cas courant après classification) le choix
 * est unique et la règle ne coûte rien.
 */
function pickNext(current: Fragment, candidates: readonly Fragment[]): Fragment | undefined {
  if (candidates.length <= 1) return candidates[0];
  const back = Math.atan2(current.a.y - current.b.y, current.a.x - current.b.x);
  let best: Fragment | undefined;
  let bestTurn = Infinity;
  for (const c of candidates) {
    const heading = Math.atan2(c.b.y - c.a.y, c.b.x - c.a.x);
    let turn = back - heading; // sens horaire = angle décroissant
    while (turn <= 0) turn += 2 * Math.PI;
    while (turn > 2 * Math.PI) turn -= 2 * Math.PI;
    if (turn < bestTurn) {
      bestTurn = turn;
      best = c;
    }
  }
  return best;
}

// ─── §7 Généralisation pour l'affichage public (§12.3) ───────────────────────

/** Distance point→segment (m) en projection locale. */
function pointSegmentDistM(p: XY, a: XY, b: XY): number {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const len2 = ex * ex + ey * ey;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / len2));
  return Math.hypot(p.x - (a.x + t * ex), p.y - (a.y + t * ey));
}

/**
 * Douglas-Peucker itératif (pile explicite : pas de récursion profonde sur
 * 2 000 points) — rend les INDICES conservés, croissants.
 *
 * Pourquoi des indices et pas des points : c'est la seule forme qui permet à
 * l'appelant de rendre les objets d'ORIGINE (`simplifyPolyline` en dépend — un
 * aller-retour lat/lng → XY → lat/lng réintroduirait des coordonnées qui ne
 * sont plus, au bit près, celles que le GPS a mesurées). Le corps de
 * l'algorithme est inchangé ; `douglasPeucker` en devient un habillage.
 */
function douglasPeuckerKeep(points: readonly XY[], toleranceM: number): number[] {
  const n = points.length;
  if (n < 3) return points.map((_, i) => i);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop()!;
    if (hi - lo < 2) continue;
    let farthest = -1;
    let maxDist = toleranceM;
    for (let i = lo + 1; i < hi; i++) {
      const d = pointSegmentDistM(points[i]!, points[lo]!, points[hi]!);
      if (d > maxDist) {
        maxDist = d;
        farthest = i;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push([lo, farthest], [farthest, hi]);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i] === 1) out.push(i);
  return out;
}

/** Douglas-Peucker itératif — les POINTS conservés (cf. `douglasPeuckerKeep`). */
function douglasPeucker(points: readonly XY[], toleranceM: number): XY[] {
  return douglasPeuckerKeep(points, toleranceM).map((i) => points[i]!);
}

/**
 * Anneau GÉNÉRALISÉ pour l'affichage PUBLIC (§12.3) : `toleranceM` est la
 * distance maximale dont un sommet peut être écarté — au-delà, le tracé exact
 * n'est plus reconstructible depuis la géométrie publiée. La tolérance est un
 * PARAMÈTRE : sa valeur est une règle de jeu et vit dans game-rules, pas ici.
 *
 * Douglas-Peucker, adapté à un ANNEAU (DP ne sait traiter qu'une polyligne
 * ouverte) : on coupe l'anneau en deux polylignes au sommet le plus ÉLOIGNÉ du
 * premier — le point de coupe est ainsi un sommet structurant, jamais un point
 * arbitraire dont la suppression déformerait la boucle — puis on simplifie
 * chaque moitié et on recolle.
 *
 * Un anneau qui tomberait sous 3 sommets est rendu INCHANGÉ (normalisé) : une
 * généralisation ne doit jamais détruire le territoire qu'elle affiche.
 */
export function simplifyRing(ring: PolygonRing, toleranceM: number): LatLngPoint[] {
  const normalized = normalizeRing(ring);
  if (normalized.length < 4 || toleranceM <= 0) return normalized;
  const proj = projectionFor(normalized);
  const pts = normalized.map((p) => toXY(p, proj));
  const first = pts[0]!;
  let split = 1;
  let maxDist = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.x - first.x, pts[i]!.y - first.y);
    if (d > maxDist) {
      maxDist = d;
      split = i;
    }
  }
  const headXY = douglasPeucker(pts.slice(0, split + 1), toleranceM);
  const tailXY = douglasPeucker([...pts.slice(split), first], toleranceM);
  const mergedXY = [...headXY.slice(0, -1), ...tailXY.slice(0, -1)];
  if (mergedXY.length < 3) return normalized;
  const simplified = normalizeRing(mergedXY.map((q) => toLatLng(q, proj)));
  return simplified.length < 3 ? normalized : simplified;
}

/**
 * Polyligne OUVERTE généralisée — le pendant de `simplifyRing` pour une TRACE
 * (§12.1 « simplifier les contours » appliqué à un parcours, pas à un
 * territoire). Même Douglas-Peucker, même projection locale ; sans le
 * découpage/recollage propre à la boucle, parce qu'une course a un début et une
 * fin qui ne se rejoignent pas — les refermer dessinerait un segment jamais
 * couru.
 *
 * TROIS GARANTIES, et ce sont elles qui rendent la fonction utilisable dans un
 * pipeline de CONFIDENTIALITÉ (cf. `apps/mobile/src/features/share/sharePrivacy.ts`) :
 *  1. SOUS-SUITE STRICTE — la sortie ne contient que des points de l'entrée,
 *     dans le même ordre, et ce sont les OBJETS d'origine (aucune coordonnée
 *     recalculée : le passage en XY sert uniquement à choisir les indices).
 *     Corollaire : un point retiré en amont ne peut pas réapparaître ici.
 *  2. les DEUX extrémités de l'entrée sont conservées — la généralisation ne
 *     rallonge donc jamais la trace vers ce qu'un masquage amont a coupé ;
 *  3. la sortie n'est jamais plus longue (ni en points, ni en mètres) que
 *     l'entrée : DP ne fait que supprimer, et supprimer un sommet d'une
 *     polyligne raccourcit toujours (inégalité triangulaire).
 *
 * `toleranceM <= 0` ou moins de 3 points → l'entrée est rendue telle quelle
 * (copie). Comme pour `simplifyRing`, la tolérance est un PARAMÈTRE : sa valeur
 * est une règle de jeu et vit dans game-rules, jamais ici.
 */
export function simplifyPolyline(
  points: readonly LatLngPoint[],
  toleranceM: number,
): LatLngPoint[] {
  if (points.length < 3 || toleranceM <= 0) return [...points];
  const proj = projectionFor(points);
  const xy = points.map((p) => toXY(p, proj));
  return douglasPeuckerKeep(xy, toleranceM).map((i) => points[i]!);
}
