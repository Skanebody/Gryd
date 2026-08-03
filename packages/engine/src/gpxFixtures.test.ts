/**
 * GRYD — LES 8 FIXTURES GPX : la définition du succès de `geo-engine` (MASTER
 * Phase 1, lot G2).
 *
 * ─── POURQUOI DES FICHIERS .gpx ET PAS DES TABLEAUX TypeScript ─────────────
 * Parce que le format est celui d'une VRAIE MONTRE. Le fondateur pourra
 * déposer `mon_run_du_samedi.gpx` dans `packages/engine/fixtures/gpx/` et voir
 * immédiatement ce que le moteur en fait — sans écrire une ligne de code. La
 * checklist de lancement (Annexe D) exige « une course réelle sur le terrain
 * documentée » : ce dossier est l'endroit où elle atterrira.
 *
 * ⚠️ LES 8 FIXTURES LIVRÉES ICI SONT SYNTHÉTIQUES, et leur en-tête `<desc>` le
 * dit. Elles éprouvent les BORNES, pas le monde réel — un GPS de ville produit
 * des artefacts qu'aucune génération ne reproduit honnêtement. Les appeler
 * « traces réelles » serait exactement la donnée fabriquée que ce dépôt refuse.
 *
 * ─── DEUX ÉCARTS DU MASTER, TROUVÉS EN ÉCRIVANT CES FIXTURES ───────────────
 *  1. Phase 1 demande « boucle à 84 m d'écart (fermeture assistée) ». Or
 *     l'Annexe A du MÊME document plafonne la bande assistée à 60 m
 *     (`CLOSE_GAP_ASSIST_M`) : à 84 m, la boucle est REFUSÉE, pas assistée. Le
 *     84 vient probablement de la jauge live (« 84 m restants », §4/L5), qui
 *     mesure autre chose. La fixture 02 utilise donc un écart RÉELLEMENT dans
 *     la bande, dérivé des constantes — elle suivra tout réglage de Saison 0.
 *  2. Phase 1 demande « première capture 500 m (seuil abaissé accepté) ». Le
 *     seuil abaissé n'existait que comme CONSTANTE : il a été câblé dans le
 *     moteur avec ce lot (`isFirstCapture`), sans quoi la fixture 08 aurait
 *     échoué en prouvant… que la fonctionnalité n'existe pas.
 */
import {
  DEFAULT_ACTIVITY,
  LOOP_CLOSE_ASSIST_M,
  LOOP_CLOSE_TOLERANCE_M,
  activityRules,
} from '@klaim/shared/game-rules';
import { detectLoop, loopClosureVerdict, loopShapeVerdict, traceLengthM } from './hexing.ts';
import { computeStats, validateRun, type Segment } from './validation.ts';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFile(chemin: string): Promise<string>;
};

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const ICI = (import.meta as unknown as { readonly dirname: string }).dirname;
const FIXTURES = `${ICI}/../fixtures/gpx`;

interface GpxPoint {
  lat: number;
  lng: number;
  t: number;
}

/**
 * Parseur GPX MINIMAL — `<trkpt lat lon>` + `<time>`, rien d'autre.
 *
 * Volontairement naïf : une dépendance XML pour lire huit fichiers de test
 * serait une dette pour zéro bénéfice, et ce parseur ne quitte jamais les
 * tests. Il JETTE sur une trace vide plutôt que de rendre `[]` — un fichier
 * illisible qui passerait pour « aucun point » ferait passer une fixture au
 * vert sans rien avoir éprouvé.
 */
function parseGpx(xml: string, nom: string): GpxPoint[] {
  const points: GpxPoint[] = [];
  const re = /<trkpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"\s*>\s*<time>([^<]+)<\/time>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = Date.parse(m[3]!);
    if (!Number.isFinite(t)) throw new Error(`${nom} : horodatage illisible « ${m[3]} »`);
    points.push({ lat: Number(m[1]), lng: Number(m[2]), t });
  }
  if (points.length < 2) throw new Error(`${nom} : ${points.length} point(s) — fixture illisible`);
  return points;
}

async function fixture(nom: string): Promise<GpxPoint[]> {
  return parseGpx(await Deno.readTextFile(`${FIXTURES}/${nom}.gpx`), nom);
}

/**
 * Verdict de validité §3.2 d'une fixture, tel qu'`ingest_run` le calculerait :
 * la trace entière en UN segment, agrégée par `computeStats` puis jugée par
 * `validateRun`. On ne réimplémente aucune borne ici — sinon le test
 * mesurerait sa propre arithmétique, pas celle du moteur.
 */
function verdictDeValidite(points: GpxPoint[]) {
  const segment: Segment = points.map((p) => ({ lat: p.lat, lng: p.lng, t: p.t }));
  return validateRun(computeStats([segment]), DEFAULT_ACTIVITY);
}

const RULES = activityRules(DEFAULT_ACTIVITY);

// ─── 0. Le harnais lui-même ─────────────────────────────────────────────────

Deno.test('les 8 fixtures existent et sont lisibles', async () => {
  const noms = [
    '01_boucle_parfaite',
    '02_fermeture_assistee',
    '03_aller_retour',
    '04_tram',
    '05_voiture',
    '06_gps_bruite',
    '07_boucle_minuscule',
    '08_premiere_capture',
  ];
  for (const nom of noms) {
    const pts = await fixture(nom);
    assert(pts.length >= 3, `${nom} : trace trop courte pour être exploitée`);
  }
});

Deno.test('chaque fixture DÉCLARE qu’elle est synthétique', async () => {
  // Le jour où une vraie trace de montre arrive dans ce dossier, elle ne
  // portera pas ce mot — et personne ne confondra les deux.
  for (const nom of ['01_boucle_parfaite', '06_gps_bruite']) {
    const xml = await Deno.readTextFile(`${FIXTURES}/${nom}.gpx`);
    assert(
      xml.includes('synthetique'),
      `${nom} : une fixture fabriquée doit le dire dans son en-tête`,
    );
  }
});

// ─── 1. Boucle parfaite ─────────────────────────────────────────────────────

Deno.test('01 — boucle parfaite : fermée par TOLÉRANCE, et elle capture', async () => {
  const pts = await fixture('01_boucle_parfaite');
  const v = loopClosureVerdict(pts);
  assertEquals(v.kind, 'closed');
  const loop = detectLoop(pts);
  assert(loop !== null, 'un carré de 400 m refermé doit faire une zone');
  assertEquals(loop!.closure, 'tolerance', 'le joueur a bouclé LUI-MÊME');
  assert(loopShapeVerdict(loop!, DEFAULT_ACTIVITY).ok, 'un carré est une forme honnête');
});

// ─── 2. Fermeture assistée ──────────────────────────────────────────────────

Deno.test('02 — écart dans la bande : GRYD referme, et le DIT', async () => {
  const pts = await fixture('02_fermeture_assistee');
  const v = loopClosureVerdict(pts);
  assert(
    v.gapM !== null && v.gapM > LOOP_CLOSE_TOLERANCE_M && v.gapM <= LOOP_CLOSE_ASSIST_M,
    `l'écart (${v.gapM?.toFixed(1)} m) doit tomber DANS la bande assistée`,
  );
  assertEquals(v.kind, 'assisted');
  const loop = detectLoop(pts);
  assert(loop !== null, 'la boucle assistée doit être accordée');
  assertEquals(loop!.closure, 'assisted', 'et le produit doit savoir ce qu’il a donné');
});

// ─── 3. Aller-retour ────────────────────────────────────────────────────────

Deno.test('03 — aller-retour : la FERMETURE est parfaite, c’est la FORME qui refuse', async () => {
  const pts = await fixture('03_aller_retour');
  // La distinction est le cœur du test : si la fermeture échouait aussi, on ne
  // saurait pas laquelle des deux bornes a fait le travail.
  assertEquals(loopClosureVerdict(pts).kind, 'closed', 'l’aller-retour revient bien au départ');
  const loop = detectLoop(pts);
  if (loop !== null) {
    const shape = loopShapeVerdict(loop, DEFAULT_ACTIVITY);
    assertEquals(shape.ok, false, 'une bande de 50 cm de large n’enclôt rien');
    assertEquals(shape.reason, 'narrow');
  }
});

// ─── 4-5. Véhicules ─────────────────────────────────────────────────────────

Deno.test('04 — tram : rejeté par l’ALLURE, pas par la géométrie', async () => {
  const pts = await fixture('04_tram');
  const verdict = verdictDeValidite(pts);
  assert(
    verdict.status !== 'valid',
    `un carré parcouru à ~35 km/h ne doit pas être une course (statut ${verdict.status})`,
  );
  // …et sa GÉOMÉTRIE, elle, est irréprochable : c'est bien l'allure qui tranche.
  assertEquals(loopClosureVerdict(pts).kind, 'closed');
});

Deno.test('05 — voiture : rejetée, et plus franchement encore', async () => {
  const pts = await fixture('05_voiture');
  const verdict = verdictDeValidite(pts);
  assert(verdict.status !== 'valid', `~70 km/h doit être refusé (statut ${verdict.status})`);
});

// ─── 6. GPS bruité ──────────────────────────────────────────────────────────

Deno.test('06 — GPS bruité urbain : le bruit ne coûte PAS la zone', async () => {
  const pts = await fixture('06_gps_bruite');
  const loop = detectLoop(pts);
  assert(loop !== null, 'un carré de 400 m sous ±6 m de bruit reste une boucle');
  assert(
    loopShapeVerdict(loop!, DEFAULT_ACTIVITY).ok,
    'le bruit ne doit pas faire passer un carré pour une forme étroite',
  );
});

// ─── 7. Boucle minuscule ────────────────────────────────────────────────────

Deno.test('07 — boucle minuscule : aucune zone, même parfaitement fermée', async () => {
  const pts = await fixture('07_boucle_minuscule');
  assertEquals(loopClosureVerdict(pts).kind, 'closed', 'un carré de 25 m se referme très bien');
  assert(
    traceLengthM(pts) < RULES.loopMinPerimeterM,
    'la fixture doit rester SOUS le plancher, sinon elle ne teste rien',
  );
  assertEquals(detectLoop(pts), null, 'farmer une micro-boucle sur place ne rapporte rien');
});

// ─── 8. Première capture ────────────────────────────────────────────────────

Deno.test('08 — première capture : REFUSÉE au barème établi, ACCEPTÉE à la première', async () => {
  const pts = await fixture('08_premiere_capture');
  const longueur = traceLengthM(pts);
  // La fixture doit tomber ENTRE les deux seuils, sinon elle ne prouve rien.
  assert(
    longueur >= RULES.loopMinPerimeterFirstM && longueur < RULES.loopMinPerimeterM,
    `périmètre ${longueur.toFixed(0)} m : la fixture doit être entre les deux seuils`,
  );
  assertEquals(detectLoop(pts, DEFAULT_ACTIVITY, false), null, 'trop courte pour le jeu établi');
  assert(
    detectLoop(pts, DEFAULT_ACTIVITY, true) !== null,
    'mais la TOUTE PREMIÈRE capture doit passer — c’est la métrique d’activation',
  );
});

Deno.test('l’exception de première capture ne vaut QUE pour elle', async () => {
  // Une micro-boucle reste refusée même au barème abaissé : l'exception rend la
  // première capture atteignable, elle n'ouvre pas une faille permanente.
  const minuscule = await fixture('07_boucle_minuscule');
  assertEquals(detectLoop(minuscule, DEFAULT_ACTIVITY, true), null);
});
