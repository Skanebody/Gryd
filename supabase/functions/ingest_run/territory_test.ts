/**
 * GRYD — DOUBLE ÉCRITURE DU TERRITOIRE (LOT 1, ÉTAPE 2 sur 4).
 * Purs : aucune I/O, aucun réseau, aucune base. h3-js est déterministe.
 *
 * ═══ CE QUI EST VERROUILLÉ ICI, ET POURQUOI CES CAS-LÀ ══════════════════════
 * L'étape 2 écrit, à côté des cellules H3, la forme RÉELLE du territoire. Le
 * risque n'est pas qu'elle plante — c'est qu'elle écrive quelque chose de
 * PLAUSIBLE MAIS FAUX, dans une table que personne ne lit encore (donc que rien
 * ne contredit avant l'étape 4). Quatre façons d'écrire faux, une famille de
 * tests chacune :
 *
 *  1. ÉCRIRE UNE SURFACE QUI N'A PAS ÉTÉ GAGNÉE — pas de boucle, intérieur
 *     refusé (forme/GPS), aucune cellule capturée, aire sous le plancher. Dans
 *     chacun de ces cas la course est VALIDE mais il n'y a PAS de territoire :
 *     en écrire un serait fabriquer de la propriété.
 *  2. ÉCRIRE L'AIRE DES CELLULES AU LIEU DE CELLE DU POLYGONE. C'est l'erreur
 *     la plus facile à commettre et la plus difficile à voir : les deux nombres
 *     se ressemblent. Le test compare donc les DEUX explicitement, sur une
 *     géométrie dont l'aire vraie est connue à la main.
 *  3. SERVIR LA TRACE EXACTE SOUS LE NOM `geometry_generalized` (§12.3 : « ne
 *     doit pas permettre de reconstruire le trajet privé exact »). Une
 *     simplification qui ne retire rien, ou une recopie, sont la même faute.
 *  4. DUPLIQUER — un renvoi de la même course ne doit pas créer un second
 *     territoire. Le côté BASE de cette garantie (index unique) est prouvé par
 *     `supabase/tests/territories_source_run_unique.pglite.test.mjs` sur un
 *     Postgres réel ; ici on prouve le côté DÉCISION : la clé naturelle est la
 *     course, et deux constructions successives sont RIGOUREUSEMENT identiques.
 *
 * Un cinquième test regarde `index.ts` : un module pur que personne n'appelle ne
 * protège rien.
 *
 * Géométrie : repère local plan centré Paris, mêmes conversions que
 * `boundary_open_test.ts` / `loop_test.ts`. Les seuils ne sont jamais écrits en
 * dur — ils viennent de game-rules (ou, pour les deux constantes encore en
 * transit, du module lui-même, cf. son TODO).
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { getHexagonAreaAvg, polygonToCells, UNITS } from 'npm:h3-js@^4.1';
import { H3_RESOLUTION, MIN_POLYGON_AREA_M2 } from '../_shared/game-rules.ts';
import { detectLoop, type LatLngPoint } from '../_shared/engine/hexing.ts';
import { normalizeRing, polygonAreaM2 } from '../_shared/engine/polygon.ts';
import {
  buildTerritoryRow,
  reportableAreaM2,
  TERRITORY_ALGORITHM_VERSION,
  TERRITORY_GENERALIZE_TOLERANCE_M,
  TERRITORY_PUBLISH_DELAY_MINUTES,
  type TerritoryRowInput,
} from './territory.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/** Point à (xM est, yM nord) du coin d'origine. */
function pt(xM: number, yM: number): LatLngPoint {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG };
}

/**
 * Carré de côté `sideM`, densifié tous les `stepM` (une trace GPS réelle porte
 * des centaines de points — c'est ce qui donne à la simplification de quoi
 * mordre), et REFERMÉ sur son point de départ (fermeture par tolérance).
 */
function squareTrace(sideM: number, stepM = 10): LatLngPoint[] {
  const corners: Array<[number, number]> = [[0, 0], [sideM, 0], [sideM, sideM], [0, sideM]];
  const out: LatLngPoint[] = [];
  for (let c = 0; c < corners.length; c++) {
    const [x0, y0] = corners[c]!;
    const [x1, y1] = corners[(c + 1) % corners.length]!;
    const legM = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(legM / stepM));
    for (let i = 0; i < n; i++) {
      out.push(pt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n));
    }
  }
  out.push(pt(0, 0)); // retour au départ : fermeture par tolérance
  return out;
}

const NOW = new Date('2026-07-27T10:00:00.000Z');
const RUNNER = '11111111-1111-1111-1111-111111111111';
const RUN_ID = '22222222-2222-2222-2222-222222222222';

/** Le polygone tel que le moteur le produit : `detectLoop(trace).polygon`. */
function enginePolygon(trace: LatLngPoint[]): LatLngPoint[] {
  const loop = detectLoop(trace, 'run');
  assert(loop !== null, 'la trace de test doit fermer une boucle (sinon le test ne teste rien)');
  return loop!.polygon;
}

/** Entrée NOMINALE : une capture réelle sur une boucle de 400 m de côté. */
function nominalInput(over: Partial<TerritoryRowInput> = {}): TerritoryRowInput {
  return {
    polygon: enginePolygon(squareTrace(400)),
    interiorRejected: false,
    capturedCellCount: 7,
    activity: 'run',
    ownerUserId: RUNNER,
    cityId: 'paris',
    runId: RUN_ID,
    now: NOW,
    ...over,
  };
}

// ═══ 1. UNE CAPTURE PRODUIT UNE LIGNE COHÉRENTE AVEC LE POLYGONE DU MOTEUR ══

Deno.test('une capture écrit une ligne territories cohérente avec le polygone du MOTEUR', () => {
  const polygon = enginePolygon(squareTrace(400));
  const row = buildTerritoryRow(nominalInput({ polygon }));
  assert(row !== null, 'une capture sur boucle fermée DOIT produire un territoire');

  // La géométrie décrit bien CE polygone-là, pas une union de cellules.
  assertEquals(row!.geometry.type, 'Polygon');
  const outer = row!.geometry.coordinates[0]!;
  // `normalizeRing` retire la fermeture RÉPÉTÉE de la trace (le coureur revient
  // à son point de départ) avant que `toGeoJsonPolygon` ne la remette, une fois,
  // comme l'exige la RFC 7946. Le compte attendu est donc celui de l'anneau
  // canonique + 1 — l'écrire `polygon.length + 1` masquerait cette déduplication.
  assertEquals(
    outer.length,
    normalizeRing(polygon).length + 1,
    'anneau canonique refermé : n sommets distincts + la répétition du premier',
  );
  assertEquals(outer[0], outer[outer.length - 1], 'RFC 7946 : le dernier sommet répète le premier');
  assert(outer.length > 3, 'un polygone a au moins 3 sommets distincts');
  // Coordonnées [lng, lat] — l'inversion est l'erreur classique, et elle
  // téléporterait le territoire en Somalie sans qu'aucun type ne s'en plaigne.
  for (const [lng, lat] of outer) {
    assert(Math.abs(lat! - LAT0) < 0.02, `lat hors du terrain de test : ${lat}`);
    assert(Math.abs(lng! - LNG0) < 0.02, `lng hors du terrain de test : ${lng}`);
  }

  // Les champs que la spec exige, et rien d'inventé.
  assertEquals(row!.owner_type, 'user');
  assertEquals(row!.owner_id, RUNNER);
  assertEquals(row!.state, 'owned_personal');
  assertEquals(row!.defense_level, 0);
  assertEquals(row!.activity, 'run');
  assertEquals(row!.city_id, 'paris');
  assertEquals(row!.source_run_id, RUN_ID);
  assertEquals(row!.algorithm_version, TERRITORY_ALGORITHM_VERSION);
  assert(row!.algorithm_version.length > 0, '§19 : la version d’algorithme ne peut pas être vide');
});

Deno.test('§1.5 : publication DIFFÉRÉE — publish_after = now + le délai, controlled_since = now', () => {
  const row = buildTerritoryRow(nominalInput())!;
  assertEquals(row.controlled_since, NOW.toISOString());
  assertEquals(
    row.publish_after,
    new Date(NOW.getTime() + TERRITORY_PUBLISH_DELAY_MINUTES * 60_000).toISOString(),
  );
  // La garantie de §1.5 est qu'un rival ne voit RIEN tout de suite : si le délai
  // n'est pas STRICTEMENT positif, la colonne existe et ne protège personne.
  assert(
    new Date(row.publish_after).getTime() > NOW.getTime(),
    'un délai nul rendrait le territoire public à l’instant de la course',
  );
});

Deno.test('E14 : la discipline de la course est celle du territoire (run et bike ne se mélangent jamais)', () => {
  const bike = buildTerritoryRow(nominalInput({ activity: 'bike' }))!;
  assertEquals(bike.activity, 'bike');
});

// ═══ 2. L'AIRE EST CELLE DU POLYGONE, PAS LA SOMME DES CELLULES ═════════════

Deno.test('area_m2 est l’aire GÉODÉSIQUE du polygone — jamais la somme des cellules H3', () => {
  const SIDE_M = 400;
  const TRUE_AREA_M2 = SIDE_M * SIDE_M; // 160 000 m², connue à la main
  const row = buildTerritoryRow(nominalInput({ polygon: enginePolygon(squareTrace(SIDE_M)) }))!;

  // (a) C'est bien l'aire du POLYGONE — mesurée indépendamment.
  const rel = Math.abs(row.area_m2 - TRUE_AREA_M2) / TRUE_AREA_M2;
  assert(rel < 0.01, `aire attendue ≈ ${TRUE_AREA_M2} m², obtenue ${row.area_m2} m² (écart ${(rel * 100).toFixed(2)} %)`);

  // (b) Et ce n'est PAS ce qu'aurait donné un comptage de cellules. On calcule
  //     la valeur concurrente pour de vrai — l'affirmer sans la mesurer ne
  //     prouverait rien.
  const cells = polygonToCells(row.geometry.coordinates, H3_RESOLUTION, true);
  const cellSumM2 = cells.length * getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2);
  assert(cells.length > 0, 'la boucle de test doit contenir au moins une cellule');
  const gap = Math.abs(row.area_m2 - cellSumM2) / row.area_m2;
  assert(
    gap > 0.01,
    `l’aire du polygone (${row.area_m2.toFixed(0)} m²) et la somme des ${cells.length} cellules ` +
      `(${cellSumM2.toFixed(0)} m²) sont trop proches pour que ce test distingue les deux — ` +
      `changer la géométrie de test, pas l’assertion`,
  );

  // (c) Le nombre de cellules CAPTURÉES n'a aucune influence sur l'aire : c'est
  //     exactement la confusion que ce test existe pour interdire.
  const other = buildTerritoryRow(nominalInput({ capturedCellCount: 42 }))!;
  assertEquals(other.area_m2, row.area_m2);
});

// ═══ 3. §12.3 — LE RENDU PUBLIC NE REND PAS LE TRAJET EXACT ═════════════════

Deno.test('§12.3 : geometry_generalized est STRICTEMENT plus grossière — jamais une copie de geometry', () => {
  const row = buildTerritoryRow(nominalInput())!;
  assert(row.geometry_generalized !== null, 'une trace densifiée DOIT pouvoir être généralisée');
  const fine = row.geometry.coordinates[0]!.length;
  const coarse = row.geometry_generalized!.coordinates[0]!.length;
  assert(
    coarse < fine,
    `généralisée (${coarse} sommets) doit être plus grossière que l’autoritaire (${fine})`,
  );
  assert(
    JSON.stringify(row.geometry_generalized) !== JSON.stringify(row.geometry),
    'servir la trace exacte sous le nom « generalized » est le mensonge que §12.3 interdit',
  );
  // Elle reste RECONNAISSABLE : une simplification qui déformerait la surface
  // ne protégerait pas la vie privée, elle mentirait sur le territoire.
  const coarseArea = polygonAreaM2(
    row.geometry_generalized!.coordinates[0]!.slice(0, -1).map(([lng, lat]) => ({
      lat: lat!,
      lng: lng!,
    })),
  );
  const drift = Math.abs(coarseArea - row.area_m2) / row.area_m2;
  assert(drift < 0.05, `la forme publique dérive de ${(drift * 100).toFixed(1)} % de la vraie`);
});

Deno.test('§12.3 : si la simplification ne retire AUCUN sommet, on n’écrit rien plutôt qu’une copie', () => {
  // Un carré de 400 m NON densifié : 4 sommets, chacun à ~400 m de la corde —
  // Douglas-Peucker à 30 m ne peut en retirer aucun. La règle est alors « null »,
  // pas « recopie ».
  const bare: LatLngPoint[] = [pt(0, 0), pt(400, 0), pt(400, 400), pt(0, 400), pt(0, 0)];
  const loop = detectLoop(bare, 'run');
  assert(loop !== null, 'un carré de 400 m ferme bien une boucle');
  const row = buildTerritoryRow(nominalInput({ polygon: loop!.polygon }))!;
  assertEquals(
    row.geometry_generalized,
    null,
    `à ${TERRITORY_GENERALIZE_TOLERANCE_M} m de tolérance, un carré nu ne se simplifie pas : ` +
      'null est la seule réponse honnête',
  );
});

// ═══ 4. IDEMPOTENCE — UN RENVOI NE CRÉE PAS UN SECOND TERRITOIRE ════════════

Deno.test('idempotence : deux constructions de la MÊME course donnent une ligne rigoureusement identique', () => {
  // Le renvoi d'un `clientRunId` déjà vu sort d'ingest_run AVANT toute écriture
  // (insertRun → replayed). Mais si deux requêtes concurrentes franchissent la
  // garde, le second insert doit être refusé par la BASE : c'est possible
  // uniquement si la clé naturelle — `source_run_id` — est stable et si la ligne
  // ne dépend d'aucun aléa. On le prouve ici ; l'index unique qui l'applique est
  // prouvé sur un vrai Postgres (territories_source_run_unique.pglite.test.mjs).
  const a = buildTerritoryRow(nominalInput())!;
  const b = buildTerritoryRow(nominalInput())!;
  assertEquals(JSON.stringify(b), JSON.stringify(a), 'la construction doit être déterministe');
  assertEquals(a.source_run_id, RUN_ID, 'la clé naturelle d’idempotence est LA COURSE');

  // Et deux courses DIFFÉRENTES restent deux territoires différents — une
  // idempotence qui écraserait des courses distinctes serait pire que rien.
  const other = buildTerritoryRow(nominalInput({ runId: '33333333-3333-3333-3333-333333333333' }))!;
  assert(other.source_run_id !== a.source_run_id);
});

// ═══ 5. CE QUI NE DOIT PAS ÊTRE ÉCRIT ═══════════════════════════════════════

Deno.test('une course SANS capture n’écrit AUCUN territoire', () => {
  assertEquals(
    buildTerritoryRow(nominalInput({ capturedCellCount: 0 })),
    null,
    'zéro cellule capturée = rien n’a changé de mains : un territoire serait une propriété inventée',
  );
});

Deno.test('une course SANS boucle n’écrit AUCUN territoire (un couloir n’enclôt rien)', () => {
  assertEquals(buildTerritoryRow(nominalInput({ polygon: null })), null);
});

Deno.test('intérieur REFUSÉ (forme trop étroite / GPS sous le seuil) : la surface n’a pas été gagnée', () => {
  assertEquals(
    buildTerritoryRow(nominalInput({ interiorRejected: true })),
    null,
    'le moteur a refusé l’intérieur : écrire le polygone affirmerait le contraire',
  );
});

Deno.test('§8.2 : une aire sous MIN_POLYGON_AREA_M2 n’écrit AUCUN territoire', () => {
  // Côté tel que l'aire soit franchement sous le plancher (5 000 m²), tout en
  // gardant un périmètre suffisant pour que `detectLoop` voie une boucle : on
  // fabrique donc l'anneau à la main plutôt que via la trace (une boucle si
  // petite serait de toute façon refusée en amont par la forme — ce test vise
  // LA PORTE, pas le scénario).
  const side = Math.sqrt(MIN_POLYGON_AREA_M2) * 0.5; // aire ≈ 25 % du plancher
  const tiny: LatLngPoint[] = [pt(0, 0), pt(side, 0), pt(side, side), pt(0, side)];
  assert(polygonAreaM2(tiny) < MIN_POLYGON_AREA_M2, 'la géométrie de test doit être sous le plancher');
  assertEquals(buildTerritoryRow(nominalInput({ polygon: tiny })), null);
});

Deno.test('un anneau dégénéré (moins de 3 sommets distincts) n’écrit AUCUN territoire', () => {
  assertEquals(buildTerritoryRow(nominalInput({ polygon: [pt(0, 0), pt(100, 0)] })), null);
  assertEquals(buildTerritoryRow(nominalInput({ polygon: [] })), null);
});

// ═══ 6. LE CÂBLAGE — un module pur que personne n'appelle ne protège rien ═══

Deno.test('index.ts écrit RÉELLEMENT dans `territories`, après la RPC claim_hexes', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));

  assert(
    /import\s*\{[^}]*buildTerritoryRow[^}]*\}\s*from\s*'\.\/territory\.ts'/.test(source),
    'index.ts doit passer par le module de décision pur (sinon rien de ce fichier ne garde quoi que ce soit)',
  );
  // Un `.from('territories')` seul ne prouve rien (on pourrait lire) : c'est
  // l'INSERT qui fait l'étape 2. On aplatit les blancs pour rester insensible au
  // formatage, jamais à la présence de l'appel.
  const flat = source.replace(/\s+/g, ' ');
  assert(
    /\.from\('territories'\) \.insert\(/.test(flat),
    'index.ts doit INSÉRER dans `territories` — sans écriture, la table reste vide et l’étape 2 n’existe pas',
  );

  // L'ORDRE compte : le territoire polygonal décrit une capture DÉJÀ appliquée.
  // L'écrire avant la RPC affirmerait une propriété que la RPC peut encore
  // refuser (garde TOCTOU de claim_hexes).
  const rpcAt = source.indexOf("supabase.rpc('claim_hexes'");
  const territoryAt = source.indexOf("from('territories')");
  assert(rpcAt > 0, 'claim_hexes doit toujours être appelée');
  assert(territoryAt > rpcAt, 'l’écriture du territoire doit suivre la RPC, jamais la précéder');

  // Best-effort STRICT : la course est déjà créditée. Un `throw` sur cette
  // écriture ferait perdre son résultat à un coureur pour une table que
  // personne ne lit encore.
  const block = source.slice(territoryAt - 3_000, territoryAt + 1_500);
  assert(
    /console\.error\([^)]*territories/.test(block),
    'l’échec d’écriture du territoire doit être loggué, jamais propagé',
  );
  assert(
    !/throw new Error\(`territories/.test(source),
    'aucun throw sur cette écriture : la propriété hexagonale et les points sont déjà appliqués',
  );
});

// ─── L'aire renvoyée au client ne décrit jamais un polygone absent ──────────

Deno.test('l’aire n’est renvoyée QUE si le polygone est réellement en base', () => {
  const row = { area_m2: 42_000 };
  // Écriture réussie : l'aire décrit une ligne que la carte pourra montrer.
  assertEquals(reportableAreaM2(row, null), 42_000);
  // Rien à écrire (aucune capture, ou intérieur refusé) : rien à annoncer.
  assertEquals(reportableAreaM2(null, null), undefined);
});

Deno.test('un échec d’écriture ne produit PAS de chiffre héros', () => {
  // Le bloc `territories` est best-effort : la course est déjà créditée. Sans
  // cette règle, le résultat annoncerait « +42 000 m² » pour un polygone que la
  // carte ne montrerait jamais — le joueur croirait la carte cassée.
  assertEquals(reportableAreaM2({ area_m2: 42_000 }, { code: '42501' }), undefined);
  assertEquals(reportableAreaM2({ area_m2: 42_000 }, { code: undefined }), undefined);
});

Deno.test('23505 est un SUCCÈS : un retry concurrent a déjà écrit la ligne', () => {
  // La traiter comme un échec priverait de son chiffre héros exactement le
  // joueur dont l'app a renvoyé sa course deux fois.
  assertEquals(reportableAreaM2({ area_m2: 42_000 }, { code: '23505' }), 42_000);
});
