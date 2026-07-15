/**
 * GRYD — P0.3 (AMENDEMENT-39) : « une VRAIE course crée-t-elle une géométrie VISIBLE ? »
 *
 * Ce test parcourt la CHAÎNE ENTIÈRE, du fix GPS au polygone peint, en n'utilisant QUE
 * du code de PRODUCTION à chaque étape — aucun mock, aucune réimplémentation :
 *
 *   fixes GPS bruts (boucle réelle du canal Saint-Martin, ~1,6 km)
 *     → cleanTrace + smoothTrace + decimateForPayload + rawFixesToRunPoints   [CLIENT, tracker.ts]
 *     → filterPoints + computeStats + validateRun + claimableSegments         [SERVEUR §3.2]
 *     → hexesForSegments                                                      [SERVEUR, moteur]
 *     → encodage BIGINT (identique à ingest_run:146)                          [DB]
 *     → buildTerritories                                                      [CARTE]
 *     → polygone
 *
 * POURQUOI CE TEST EXISTE. L'audit de la chaîne a montré que ses 8 maillons sont bien
 * câblés — mais TOUTES les pannes possibles sont SILENCIEUSES : une course < 1 km, < 6 min,
 * un trust < 60, un runMode ≠ 'conquete' ou un city_id inutilisable produisent une carte
 * vide qui se lit exactement comme « tu n'as encore rien capturé ». Sans ce test, la seule
 * façon de distinguer « ça marche » de « c'est cassé » serait d'aller courir 1 km dehors.
 *
 * Il verrouille aussi le SEUIL : la démo servait des trajets courts, et le premier réflexe
 * de test (« je fais 300 m dans la rue ») ne capture RIEN — par design, pas par bug.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  cleanTrace,
  decimateForPayload,
  gpsTrustScore,
  rawFixesToRunPoints,
  smoothTrace,
  type RawFix,
} from '../run/gps/engine/gps.ts';
import {
  claimableSegments,
  computeStats,
  filterPoints,
  validateRun,
} from '../../../../../packages/engine/src/validation.ts';
import { hexesForSegments } from '../../../../../packages/engine/src/hexing.ts';
import { buildTerritories, type HexClaimRow } from './territoryBuild.ts';

const ME = 'coureur-uuid';

/** Encodage EXACT d'ingest_run (index.ts:146) : la cellule H3 est stockée en BIGINT. */
const h3ToDb = (h: string): string => BigInt('0x' + h).toString();

/**
 * Fabrique une trace GPS RÉALISTE : un rectangle le long du canal Saint-Martin,
 * échantillonné à 1 Hz à allure de course (~3 m/s ≈ 5:33/km — largement dans les bornes
 * §3.2), avec une précision GPS urbaine crédible. On génère les fixes comme le ferait
 * expo-location, pas des points idéalisés.
 */
function traceCanal(tourM: number, startTs = 1_752_000_000_000): RawFix[] {
  // Coins d'une boucle réelle (République → canal → Jemmapes → retour).
  const coins: [number, number][] = [
    [48.8674, 2.3636],
    [48.8712, 2.3661],
    [48.8721, 2.3612],
    [48.8683, 2.3588],
  ];
  const M_LAT = 111_320;
  const mLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);
  const fixes: RawFix[] = [];
  let ts = startTs;
  let parcouru = 0;
  let i = 0;
  while (parcouru < tourM) {
    const a = coins[i % coins.length];
    const b = coins[(i + 1) % coins.length];
    const dy = (b[0] - a[0]) * M_LAT;
    const dx = (b[1] - a[1]) * mLng(a[0]);
    const segM = Math.hypot(dx, dy);
    const pas = 3; // ~3 m/s à 1 Hz
    for (let d = 0; d < segM && parcouru < tourM; d += pas) {
      const t = d / segM;
      fixes.push({
        lat: a[0] + (b[0] - a[0]) * t,
        lng: a[1] + (b[1] - a[1]) * t,
        ts,
        accuracy: 8, // précision urbaine typique — bien sous le seuil de rejet
        speed: 3,
      });
      ts += 1_000;
      parcouru += pas;
    }
    i += 1;
  }
  return fixes;
}

/** Rejoue la chaîne de prod complète et rend ce que la CARTE recevrait. */
function courseVersCarte(fixes: RawFix[]) {
  // ── CLIENT (tracker.buildPayload, tracker.ts:295-308) ──
  const clean = cleanTrace(fixes);
  const smoothed = smoothTrace(clean.points);
  const points = rawFixesToRunPoints(decimateForPayload(smoothed));
  const trust = gpsTrustScore(clean);

  // ── SERVEUR (§3.2, ingest_run) ──
  const filtered = filterPoints(points);
  const stats = computeStats(filtered.segments);
  const validation = validateRun(stats);
  const claimable = claimableSegments(filtered.segments);

  // ── MOTEUR : trace → cellules H3 res 10 ──
  const cells = validation.status === 'valid' ? hexesForSegments(claimable.claimable) : [];

  // ── DB : ce que claim_hexes écrirait dans hex_claims ──
  const rows: HexClaimRow[] = cells.map((c) => ({
    h3index: h3ToDb(c),
    owner_user_id: ME,
    claim_type: 'claim',
    decay_at: null,
    claimed_at: '2026-07-15T10:00:00Z',
  }));

  // ── CARTE ──
  return { trust, stats, validation, cells, territories: buildTerritories(rows, ME) };
}

Deno.test('P0.3 — une vraie course de ~1,6 km produit une géométrie VISIBLE sur la carte', () => {
  const { trust, stats, validation, cells, territories } = courseVersCarte(traceCanal(1_600));

  // 1. Le client produit une trace exploitable (le trust conditionne tout : < 60 ⇒ flagged).
  assert(trust >= 60, `GPS trust ${trust} — une course propre doit passer GRYD Verify`);

  // 2. Le serveur l'accepte (§3.2 : ≥ 1 km, ≥ 6 min, allure plausible).
  assertEquals(validation.status, 'valid', `course rejetée : ${JSON.stringify(validation)}`);
  assert(stats.distanceM >= 1_000, `distance ${stats.distanceM} m`);

  // 3. Le moteur en tire de vraies cellules.
  assert(cells.length > 0, 'aucune cellule H3 : rien à capturer');

  // 4. LA CARTE A QUELQUE CHOSE À PEINDRE — le point de tout P0.3.
  assertEquals(territories.length, 1, 'un coureur + un état = un territoire');
  const t = territories[0];
  assertEquals(t.props.status, 'crew', 'ma course = MON territoire (chartreuse)');
  assertEquals(t.props.ownerId, ME);
  assert(t.polygons.length >= 1, 'aucun polygone : la carte resterait vide');
  assert(t.props.areaM2 > 0, 'aire nulle : rien de visible');

  // 5. Le polygone est un vrai anneau fermable (≥ 3 sommets), pas une dégénérescence.
  const anneau = t.polygons[0][0];
  assert(anneau.length >= 3, `anneau dégénéré : ${anneau.length} sommets`);

  // 6. La géométrie tombe bien sur Paris — une inversion lat/lng l'enverrait en Somalie.
  //    (Le GeoJSON est en [lng, lat] : c'est LE piège classique de cette chaîne.)
  const [lng, lat] = anneau[0];
  assert(lat > 48.8 && lat < 48.9, `latitude hors Paris : ${lat} (lat/lng inversés ?)`);
  assert(lng > 2.3 && lng < 2.4, `longitude hors Paris : ${lng} (lat/lng inversés ?)`);
});

Deno.test('P0.3 — le tour du pâté de maisons ne capture RIEN, et c’est par DESIGN', () => {
  // Le premier réflexe de test. 300 m : la validation §3.2 rejette sous 1 km.
  const { validation, territories } = courseVersCarte(traceCanal(300));
  assertEquals(validation.status, 'rejected', 'une course de 300 m ne doit jamais capturer');
  assertEquals(
    validation.status === 'rejected' ? validation.reason : null,
    'too_short',
    'le motif doit être la DISTANCE — pas un rejet accidentel pour une autre raison',
  );
  assertEquals(territories.length, 0, 'carte vide attendue');
  // La carte affichera « Aucun territoire capturé » : c'est le comportement correct,
  // PAS une panne de la carte. Ce test existe pour qu'on ne débogue jamais le mauvais bout.
});

Deno.test('P0.3 — deux courses sur la MÊME zone : un seul territoire qui S’ÉTEND', () => {
  // Motif de l'arbitrage « A » : un territoire s'ACCUMULE sur plusieurs courses — le tracé
  // d'UNE course n'égale jamais « ce que je possède maintenant ». On modélise la base
  // fidèlement : `h3index` est PRIMARY KEY (0002_schema.sql:128) et claim_hexes fait un
  // UPSERT (0031:123-134) → un hex re-couru ne crée JAMAIS une 2ᵉ ligne.
  const c1 = courseVersCarte(traceCanal(1_600));
  // Une 2ᵉ course qui déborde : même départ, plus longue → des hexes en commun ET des neufs.
  const c2 = courseVersCarte(traceCanal(2_400, 1_752_100_000_000));

  const parHex = new Map<string, HexClaimRow>();
  for (const cell of c1.cells) {
    parHex.set(cell, {
      h3index: h3ToDb(cell),
      owner_user_id: ME,
      claim_type: 'claim',
      decay_at: null,
      claimed_at: '2026-07-14T10:00:00Z',
    });
  }
  for (const cell of c2.cells) {
    // Upsert : la re-capture écrase la ligne, elle ne s'y ajoute pas.
    parHex.set(cell, {
      h3index: h3ToDb(cell),
      owner_user_id: ME,
      claim_type: 'defended',
      decay_at: null,
      claimed_at: '2026-07-15T10:00:00Z',
    });
  }
  const rows = [...parHex.values()];
  const territories = buildTerritories(rows, ME);

  assertEquals(territories.length, 1, 'deux courses = UN territoire, pas deux');
  assertEquals(territories[0].zoneCount, parHex.size, 'zoneCount = hexes DISTINCTS possédés');
  // La 2ᵉ course a agrandi le territoire : plus d'hexes qu'après la 1ʳᵉ seule.
  assert(parHex.size > new Set(c1.cells).size, 'la 2ᵉ course doit étendre le territoire');
  // capturedAt suit la capture la plus récente — « Lena vient de reprendre » doit être vrai.
  assertEquals(territories[0].props.capturedAt, '2026-07-15T10:00:00Z');
});

Deno.test('INVARIANT — h3index est PRIMARY KEY : buildTerritories ne voit jamais de doublon', () => {
  // Documenté par un test parce que la violation est BRUTALE : h3.cellsToMultiPolygon LÈVE
  // sur des cellules dupliquées, et buildTerritories n'attrape rien → écran blanc. Cet
  // invariant tient tant que la source est `hex_claims` (h3index bigint primary key,
  // 0002_schema.sql:128). Toute nouvelle source (jointure, fusion realtime, cache) DOIT
  // dédupliquer avant d'appeler buildTerritories.
  const cells = new Set(courseVersCarte(traceCanal(1_600)).cells);
  const rows: HexClaimRow[] = [...cells].map((c) => ({
    h3index: h3ToDb(c),
    owner_user_id: ME,
    claim_type: 'claim',
    decay_at: null,
    claimed_at: null,
  }));
  // Les h3index sont uniques, comme la PK le garantit.
  assertEquals(new Set(rows.map((r) => r.h3index)).size, rows.length);
  assertEquals(buildTerritories(rows, ME).length, 1);
});
