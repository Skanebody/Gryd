// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/polygon.test.ts

/**
 * GRYD — tests de engine/polygon.ts (géométrie POLYGONALE des territoires).
 *
 * Ce que ces tests VERROUILLENT, ce sont des RÈGLES, pas des implémentations :
 * une aire ne dépend pas de la façon dont on a écrit l'anneau, une frontière
 * commune ne se compte pas deux fois, une géométrie publiée est généralisée
 * sans mentir sur la taille du territoire, et ce qu'on écrit en base est
 * exactement ce qu'on relit.
 *
 * DEUX CONTRAINTES D'OUTILLAGE, assumées ici plutôt qu'en modifiant le gate :
 *  1. AUCUN IMPORT EXTERNE (pas de `jsr:@std/assert`) — `packages/engine/tsconfig.json`
 *     inclut `src/` en entier, donc `npm run typecheck` typecheckerait ce fichier
 *     et échouerait sur un spécificateur `jsr:` que tsc ne sait pas résoudre. Les
 *     trois assertions dont on a besoin tiennent en dix lignes.
 *  2. `packages/engine/package.json` porte `"type": "module"` : Deno traite alors
 *     ce dossier comme un paquet npm ESM et n'y injecte PAS la lib `deno.ns` — le
 *     global `Deno` n'y est donc pas typé. Une déclaration LOCALE (portée module)
 *     le règle, et elle reste valide sous `tsc` comme dans la copie générée
 *     `supabase/functions/_shared/engine/` où `Deno` est, lui, bien global.
 */
import {
  fromGeoJsonPolygon,
  intersectionAreaM2,
  intersectionRatio,
  normalizeRing,
  polygonAreaM2,
  polygonPerimeterM,
  simplifyRing,
  toGeoJsonPolygon,
  unionPolygons,
} from './polygon.ts';
import type { LatLngPoint } from './hexing.ts';

// Voir point 2 du docblock : le runner Deno, typé localement.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

// ─── Assertions minimales ────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

/**
 * Écart RELATIF toléré (fraction, ex. 0.005 = 0,5 %). Quand `expected` vaut 0,
 * la comparaison devient ABSOLUE — un écart relatif à zéro n'a pas de sens.
 */
function assertProche(actual: number, expected: number, tolerance: number, quoi: string): void {
  const ecart = expected === 0 ? Math.abs(actual) : Math.abs(actual - expected) / Math.abs(expected);
  if (ecart > tolerance) {
    throw new Error(
      `${quoi} : attendu ${expected}, obtenu ${actual} ` +
        `(écart ${(ecart * 100).toFixed(3)} % > ${(tolerance * 100).toFixed(3)} %)`,
    );
  }
}

// ─── Fabrique de géométries : mètres → lat/lng autour d'un point de Paris ─────

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 48.85, lng: 2.35 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);

/** Point à (xM, yM) mètres à l'est / au nord de l'origine. */
function pt(xM: number, yM: number): LatLngPoint {
  return {
    lat: ORIGINE.lat + yM / (RAD_PER_DEG * EARTH_RADIUS_M),
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
  };
}

/** Rectangle CCW défini par son coin bas-gauche et sa taille, en mètres. */
function rect(x0: number, y0: number, largeurM: number, hauteurM: number): LatLngPoint[] {
  return [
    pt(x0, y0),
    pt(x0 + largeurM, y0),
    pt(x0 + largeurM, y0 + hauteurM),
    pt(x0, y0 + hauteurM),
  ];
}

/** Cercle CCW échantillonné (rayon en mètres) — sert de trace « lisse » à généraliser. */
function cercle(rayonM: number, sommets: number): LatLngPoint[] {
  const out: LatLngPoint[] = [];
  for (let i = 0; i < sommets; i++) {
    const a = (2 * Math.PI * i) / sommets;
    out.push(pt(rayonM * Math.cos(a), rayonM * Math.sin(a)));
  }
  return out;
}

// ─── §1 Aire et périmètre ────────────────────────────────────────────────────

Deno.test("l'aire d'un carré d'un kilomètre de côté vaut un kilomètre carré", () => {
  assertProche(polygonAreaM2(rect(0, 0, 1000, 1000)), 1_000_000, 0.005, 'aire du carré 1 km');
});

Deno.test("l'aire ne dépend pas du sommet par lequel l'anneau commence", () => {
  const anneau = rect(0, 0, 1000, 600);
  const reference = polygonAreaM2(anneau);
  for (let k = 1; k < anneau.length; k++) {
    const tourne = [...anneau.slice(k), ...anneau.slice(0, k)];
    assertProche(polygonAreaM2(tourne), reference, 1e-9, `aire après rotation de ${k} sommets`);
  }
});

Deno.test("l'aire ne dépend pas du sens de parcours de l'anneau", () => {
  const anneau = rect(0, 0, 1000, 600);
  assertProche(
    polygonAreaM2([...anneau].reverse()),
    polygonAreaM2(anneau),
    1e-9,
    'aire du même anneau parcouru en sens inverse',
  );
});

Deno.test("un anneau de moins de trois sommets n'a pas d'aire (jamais NaN)", () => {
  assertEgal(polygonAreaM2([]), 0, 'aire du vide');
  assertEgal(polygonAreaM2([pt(0, 0), pt(100, 0)]), 0, "aire d'un simple segment");
});

Deno.test("le périmètre d'un carré d'un kilomètre de côté vaut quatre kilomètres", () => {
  assertProche(polygonPerimeterM(rect(0, 0, 1000, 1000)), 4000, 0.005, 'périmètre du carré 1 km');
});

Deno.test('le périmètre inclut le segment de fermeture', () => {
  // Triangle rectangle 300 × 400 : l'hypoténuse (500 m) n'existe que si l'anneau
  // se referme. Sans elle le périmètre vaudrait 700 m, pas 1 200 m.
  const triangle = [pt(0, 0), pt(300, 0), pt(0, 400)];
  assertProche(polygonPerimeterM(triangle), 1200, 0.005, 'périmètre du triangle 3-4-5');
});

// ─── §2 Normalisation ────────────────────────────────────────────────────────

Deno.test('un anneau parcouru dans le sens horaire est ramené en sens trigonométrique', () => {
  const horaire = [...rect(0, 0, 500, 500)].reverse();
  const normalise = normalizeRing(horaire);
  // CCW ⇔ shoelace positif sur (lng, lat).
  let doubled = 0;
  for (let i = 0; i < normalise.length; i++) {
    const a = normalise[i]!;
    const b = normalise[(i + 1) % normalise.length]!;
    doubled += a.lng * b.lat - b.lng * a.lat;
  }
  assert(doubled > 0, 'un anneau normalisé doit être orienté CCW');
});

Deno.test("la normalisation retire les sommets doublés et la fermeture répétée", () => {
  const carre = rect(0, 0, 500, 500);
  const sale = [...carre, carre[0]!, carre[0]!]; // fermeture explicite, deux fois
  const normalise = normalizeRing([carre[0]!, ...sale]);
  assertEgal(normalise.length, 4, "l'anneau normalisé garde exactement ses 4 sommets distincts");
});

// ─── §3 Intersection — la brique de §9.1 (seuil de contestation) ─────────────

Deno.test('deux territoires disjoints ne se recouvrent pas du tout', () => {
  const a = rect(0, 0, 1000, 1000);
  const b = rect(2000, 0, 1000, 1000);
  assertEgal(intersectionAreaM2(a, b), 0, 'aire commune de deux territoires disjoints');
  assertEgal(intersectionRatio(a, b), 0, 'ratio de recouvrement de deux territoires disjoints');
});

Deno.test("un territoire entièrement contenu dans un autre en est couvert à 100 %", () => {
  const petit = rect(250, 250, 500, 500);
  const grand = rect(0, 0, 1000, 1000);
  assertProche(intersectionRatio(petit, grand), 1, 1e-6, 'petit ⊂ grand');
  // …et la réciproque n'est PAS vraie : le grand n'est couvert qu'au quart.
  assertProche(intersectionRatio(grand, petit), 0.25, 1e-6, 'grand couvert par petit');
});

Deno.test("un recouvrement de moitié se lit exactement 0,5", () => {
  const a = rect(0, 0, 1000, 1000);
  const b = rect(500, 0, 1000, 1000);
  assertProche(intersectionRatio(a, b), 0.5, 1e-6, 'demi-recouvrement');
  assertProche(intersectionAreaM2(a, b), 500_000, 0.005, 'aire commune du demi-recouvrement');
});

Deno.test("le creux d'un territoire non convexe n'est pas du territoire", () => {
  // Territoire en L = carré 1 km privé de son quadrant nord-est.
  const enL = [pt(0, 0), pt(1000, 0), pt(1000, 500), pt(500, 500), pt(500, 1000), pt(0, 1000)];
  assertProche(polygonAreaM2(enL), 750_000, 0.005, 'aire du territoire en L');
  // Le quadrant manquant ne recouvre RIEN : un algorithme qui traiterait le L
  // comme son enveloppe convexe renverrait 250 000 m² ici.
  assertProche(intersectionAreaM2(enL, rect(500, 500, 500, 500)), 0, 1e-9, 'aire du creux');
  // Le quadrant sud-ouest, lui, est bien à l'intérieur du L : un tiers de son aire.
  assertProche(intersectionRatio(enL, rect(0, 0, 500, 500)), 1 / 3, 1e-6, 'bras sud-ouest du L');
  assertProche(intersectionRatio(rect(0, 0, 500, 500), enL), 1, 1e-6, 'quadrant ⊂ L');
});

Deno.test("le ratio de recouvrement ne dépend pas du sens de parcours des anneaux", () => {
  const a = rect(0, 0, 1000, 1000);
  const b = rect(500, 0, 1000, 1000);
  assertProche(intersectionRatio([...a].reverse(), b), 0.5, 1e-6, 'a inversé');
  assertProche(intersectionRatio(a, [...b].reverse()), 0.5, 1e-6, 'b inversé');
});

// ─── §4 Union — frontière collective d'un crew (§8.5) ────────────────────────

/** Aire totale (m²) d'une liste d'anneaux. */
function aireTotale(anneaux: readonly (readonly LatLngPoint[])[]): number {
  let total = 0;
  for (const a of anneaux) total += polygonAreaM2(a);
  return total;
}

Deno.test('deux zones accolées fusionnent sans compter deux fois leur frontière commune', () => {
  const union = unionPolygons([rect(0, 0, 1000, 1000), rect(1000, 0, 1000, 1000)]);
  assertEgal(union.length, 1, 'deux carrés accolés ne font plus qu’une seule frontière');
  assertProche(aireTotale(union), 2_000_000, 0.005, "aire de l'union de deux carrés accolés");
});

Deno.test('deux zones qui se chevauchent ne comptent leur intersection qu’une fois', () => {
  const union = unionPolygons([rect(0, 0, 1000, 1000), rect(500, 0, 1000, 1000)]);
  assertEgal(union.length, 1, 'deux carrés qui se chevauchent font une frontière');
  assertProche(aireTotale(union), 1_500_000, 0.005, "aire de l'union avec chevauchement");
});

Deno.test('deux zones disjointes restent deux frontières distinctes', () => {
  const union = unionPolygons([rect(0, 0, 1000, 1000), rect(2000, 0, 1000, 1000)]);
  assertEgal(union.length, 2, 'un crew qui tient deux quartiers éloignés a deux frontières');
  assertProche(aireTotale(union), 2_000_000, 0.005, "aire de l'union de deux carrés disjoints");
});

Deno.test("une zone incluse dans une autre disparaît dans l'union", () => {
  const union = unionPolygons([rect(0, 0, 1000, 1000), rect(250, 250, 500, 500)]);
  assertEgal(union.length, 1, 'la zone incluse ne crée pas de seconde frontière');
  assertProche(aireTotale(union), 1_000_000, 0.005, "aire de l'union avec inclusion");
});

Deno.test("l'union d'un seul territoire est ce territoire, l'union de rien est vide", () => {
  assertEgal(unionPolygons([]).length, 0, 'union du vide');
  const seul = unionPolygons([rect(0, 0, 800, 400)]);
  assertEgal(seul.length, 1, 'union singleton');
  assertProche(aireTotale(seul), 320_000, 0.005, "aire de l'union singleton");
});

// ─── §5 Généralisation publique (§12.3) ──────────────────────────────────────

Deno.test("la généralisation retire des sommets sans déplacer l'aire de plus de 2 %", () => {
  const detaille = cercle(500, 180);
  const generalise = simplifyRing(detaille, 4);
  assert(
    generalise.length < detaille.length / 2,
    `la généralisation doit vraiment alléger la géométrie ` +
      `(${detaille.length} → ${generalise.length} sommets)`,
  );
  assert(generalise.length >= 3, 'une généralisation ne détruit jamais le territoire');
  assertProche(
    polygonAreaM2(generalise),
    polygonAreaM2(detaille),
    0.02,
    "aire après généralisation à 4 m",
  );
});

Deno.test('plus la tolérance est grande, moins il reste de sommets', () => {
  const detaille = cercle(500, 180);
  const fine = simplifyRing(detaille, 2);
  const grossiere = simplifyRing(detaille, 25);
  assert(
    grossiere.length < fine.length,
    `tolérance 25 m (${grossiere.length} sommets) doit être plus grossière ` +
      `que 2 m (${fine.length} sommets)`,
  );
});

Deno.test('une tolérance nulle ou négative ne déplace aucun sommet', () => {
  const anneau = cercle(500, 24);
  assertEgal(simplifyRing(anneau, 0), normalizeRing(anneau), 'tolérance 0');
  assertEgal(simplifyRing(anneau, -5), normalizeRing(anneau), 'tolérance négative');
});

Deno.test('un triangle reste un triangle quelle que soit la tolérance', () => {
  const triangle = [pt(0, 0), pt(1000, 0), pt(500, 900)];
  assertEgal(simplifyRing(triangle, 10_000).length, 3, 'sommets restants du triangle');
});

// ─── §6 Forme persistée (colonne jsonb, décision A1-bis) ─────────────────────

Deno.test("l'aller-retour GeoJSON préserve la géométrie", () => {
  const anneau = [pt(0, 0), pt(1000, 0), pt(1000, 500), pt(500, 500), pt(500, 1000), pt(0, 1000)];
  const relu = fromGeoJsonPolygon(toGeoJsonPolygon(anneau));
  assertEgal(relu, normalizeRing(anneau), 'anneau relu depuis sa forme persistée');
  assertProche(polygonAreaM2(relu), polygonAreaM2(anneau), 1e-12, 'aire après aller-retour');
});

Deno.test("la forme persistée respecte la RFC 7946 : [lng, lat] et anneau refermé", () => {
  const anneau = rect(0, 0, 1000, 1000);
  const geo = toGeoJsonPolygon(anneau);
  assertEgal(geo.type, 'Polygon', 'type GeoJSON');
  const exterieur = geo.coordinates[0]!;
  assertEgal(exterieur.length, 5, '4 sommets + la fermeture explicite');
  assertEgal(exterieur[0], exterieur[exterieur.length - 1], "l'anneau persisté est refermé");
  assertEgal(exterieur[0]![0], anneau[0]!.lng, 'la première coordonnée est la longitude');
  assertEgal(exterieur[0]![1], anneau[0]!.lat, 'la seconde coordonnée est la latitude');
});

Deno.test("un anneau horaire ressort CCW de la forme persistée", () => {
  const horaire = [...rect(0, 0, 1000, 1000)].reverse();
  assertEgal(
    fromGeoJsonPolygon(toGeoJsonPolygon(horaire)),
    normalizeRing(horaire),
    'la persistance normalise l’orientation',
  );
});
