/**
 * GRYD — les zones floutées du joueur sont-elles lues SANS être inventées ?
 *
 * Ce module décide deux choses qui, mal faites, cassent une promesse de
 * confidentialité :
 *  1. QUELLES zones s'appliquent — décodées depuis la base, jamais fabriquées,
 *     jamais corrompues en une zone de rayon 0 qui ne masquerait rien ;
 *  2. QUAND on a le droit de publier — « je n'ai pas pu lire » n'est pas « il
 *     n'y en a pas », et les deux ne donnent pas le même droit.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  PRIVACY_ZONES_MAX,
  PRIVACY_ZONE_RADIUS_MAX_M,
  PRIVACY_ZONE_RADIUS_MIN_M,
} from '@klaim/shared';
import { latLngToCell } from 'h3-js';
import { dbToH3, rowsToPrivacyZones, zonesForPublication } from './zones.ts';
import { applySharePrivacy, haversineM, SHARE_TRIM_M } from '../share/sharePrivacy.ts';
import type { LatLngPoint } from '../map/realAnchors.ts';

const HOME: LatLngPoint = { lat: 48.8566, lng: 2.3522 };
const DEG_PER_M = 1 / 111_320;

/** Un vrai index H3 res 8, stocké comme la base le fait : un `bigint` décimal. */
const h3Row = (p: LatLngPoint, radiusM: number) => ({
  center_h3_res8: BigInt(`0x${latLngToCell(p.lat, p.lng, 8)}`).toString(),
  radius_m: radiusM,
});

// ═══ 1. DÉCODAGE : le même que le serveur ═══════════════════════════════════

Deno.test('dbToH3 est l’inverse EXACT du h3ToDb de l’Edge Function', () => {
  const h3 = latLngToCell(HOME.lat, HOME.lng, 8);
  const stored = BigInt(`0x${h3}`).toString(); // ingest_run/index.ts:190
  assertEquals(dbToH3(stored), h3);
});

Deno.test('dbToH3 refuse ce qui n’est pas un index (0, négatif, texte)', () => {
  assertEquals(dbToH3('0'), null);
  assertEquals(dbToH3('-12'), null);
  assertEquals(dbToH3('pas un nombre'), null);
});

Deno.test('une ligne réelle donne une zone dont le centre est LA CELLULE, pas l’adresse', () => {
  const zones = rowsToPrivacyZones([h3Row(HOME, 300)]);
  assertEquals(zones.length, 1);
  const z = zones[0]!;
  assertEquals(z.radiusM, 300);
  // Le centre décodé n'est PAS le point d'origine, et c'est le BUT : la base ne
  // stocke qu'une cellule H3 res 8 (arête ≈ 460 m), jamais le domicile exact.
  const ecart = haversineM(HOME, z.center);
  assert(ecart > 0, 'le centre décodé serait exactement le domicile');
  //
  // ⚠️ CE QUE CE TEST MESURE, ET QU'IL FAUT LIRE : l'écart observé ici vaut
  // 259 m pour ce point — DÉJÀ plus que `PRIVACY_ZONE_RADIUS_MIN_M` (200 m), et
  // il peut monter à ~460 m ailleurs dans la cellule. Autrement dit, une zone de
  // 200 ou 300 m centrée sur la cellule peut NE PAS couvrir l'adresse qu'elle
  // prétend protéger. Ce n'est pas un défaut de ce module — il décode fidèlement
  // ce que la base contient, exactement comme `loadPrivacyHexes` côté serveur
  // (`supabase/functions/ingest_run/index.ts:445`) — mais du COUPLE
  // « res 8 + rayon 200-500 m » choisi en 0002. On le mesure ici plutôt que de
  // le laisser dormir ; le corriger (élargir le rayon effectif de la
  // circonradius de la cellule, ou stocker une résolution plus fine) touche le
  // serveur autant que le client et n'appartient pas à ce module seul.
  assert(ecart < 500, `écart de cellule inattendu : ${Math.round(ecart)} m`);
  assert(
    PRIVACY_ZONE_RADIUS_MIN_M === 200 && PRIVACY_ZONE_RADIUS_MAX_M === 500,
    'les bornes de rayon ont changé : re-mesurer la couverture réelle de la cellule',
  );
});

// ═══ 2. DÉFENSIVE : une ligne douteuse est ÉCARTÉE, pas dégradée ════════════

Deno.test('une ligne illisible est ÉCARTÉE — jamais convertie en zone de rayon 0', () => {
  const zones = rowsToPrivacyZones([
    { center_h3_res8: null, radius_m: 300 },
    { center_h3_res8: '123', radius_m: null },
    { center_h3_res8: 'pas un bigint', radius_m: 300 },
    h3Row(HOME, 300),
  ]);
  assertEquals(zones.length, 1, 'seule la ligne valide devient une zone');
  assert(zones[0]!.radiusM > 0, 'une zone rendue masque toujours quelque chose');
});

Deno.test('le rayon est borné aux valeurs que la contrainte SQL admet', () => {
  const trop = rowsToPrivacyZones([h3Row(HOME, 99_999)]);
  const pasAssez = rowsToPrivacyZones([h3Row(HOME, 1)]);
  assertEquals(trop[0]!.radiusM, PRIVACY_ZONE_RADIUS_MAX_M);
  assertEquals(pasAssez[0]!.radiusM, PRIVACY_ZONE_RADIUS_MIN_M);
});

Deno.test('le plafond de zones est celui de game-rules, pas celui de la requête', () => {
  const rows = Array.from({ length: PRIVACY_ZONES_MAX + 3 }, (_, i) =>
    h3Row({ lat: HOME.lat + i * 0.02, lng: HOME.lng }, 300),
  );
  assertEquals(rowsToPrivacyZones(rows).length, PRIVACY_ZONES_MAX);
});

Deno.test('aucune ligne → aucune zone (et surtout aucune zone de démonstration)', () => {
  assertEquals(rowsToPrivacyZones([]), []);
});

// ═══ 3. LES QUATRE ÉTATS, ET LE DROIT DE PUBLIER ════════════════════════════

Deno.test('« lecture aboutie, zéro zone » autorise la publication', () => {
  assertEquals(zonesForPublication({ status: 'ready', zones: [] }), { ready: true, zones: [] });
});

Deno.test('« pas de compte » autorise la publication : aucune zone n’existe à honorer', () => {
  assertEquals(zonesForPublication({ status: 'no-account' }), { ready: true, zones: [] });
});

Deno.test('« lecture EN COURS » INTERDIT de publier — et se distingue de l’échec', () => {
  assertEquals(zonesForPublication({ status: 'loading' }), { ready: false, reason: 'loading' });
});

Deno.test('« échec de lecture » INTERDIT de publier — pas de repli sur zéro zone', () => {
  assertEquals(zonesForPublication({ status: 'error' }), { ready: false, reason: 'error' });
});

// ═══ 4. BOUT EN BOUT : une zone lue en base masque VRAIMENT la trace ════════

Deno.test('une zone décodée depuis la base est réellement appliquée au partage', () => {
  // 2 km sinueux (une ligne parfaitement droite est le cas dégénéré de la
  // simplification : elle se réduit à 3 points, zone ou pas, et ne prouverait
  // donc rien) ; la zone couvre le milieu du parcours.
  const lngDegPerM = 1 / (111_320 * Math.cos((HOME.lat * Math.PI) / 180));
  const trace: LatLngPoint[] = Array.from({ length: 81 }, (_, i) => ({
    lat: HOME.lat + i * 25 * DEG_PER_M,
    lng: HOME.lng + Math.sin(i / 2) * 40 * lngDegPerM,
  }));
  const milieu = trace[40]!;
  const zones = rowsToPrivacyZones([h3Row(milieu, 300)]);
  assertEquals(zones.length, 1);

  const publie = applySharePrivacy(trace, SHARE_TRIM_M, zones);
  assert(publie.length >= 3, 'il reste un segment publiable de part et d’autre');
  for (const p of publie) {
    assert(
      haversineM(zones[0]!.center, p) > zones[0]!.radiusM,
      'un point publié tombe DANS une zone lue en base',
    );
  }
  // Et la zone retire bien quelque chose : sans elle, la trace publiée est plus
  // longue. Sinon ce test passerait alors que rien n'est branché.
  assert(
    publie.length < applySharePrivacy(trace, SHARE_TRIM_M).length,
    'la zone n’a rien retiré : elle n’est pas appliquée',
  );
});
