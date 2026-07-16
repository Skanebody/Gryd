/**
 * P0 C4/D3 (MVP_CHANGESET) — la DÉRIVATION DE VILLE tient sur les VRAIS contours.
 *
 * ingest_run dérive désormais cityId du 1er fix GPS (point-in-polygon sur
 * city_zones actives) parce que le client ne le déclare jamais (buildPayload) —
 * sans ça p_city_id restait NULL et season_scores (le classement local, objectif
 * nommé du pilote) ne se peuplait JAMAIS.
 *
 * Ce test rejoue la logique exacte (pointInGeoJson, le même code moteur que la
 * prod) contre les contours RÉELS de la migration 0033 (Paris = union des
 * communes 75+92+93+94 ; Lille = MEL) — pas des fixtures inventées. Si un futur
 * resserrage de polygone (C11) exclut République ou la Grand-Place, ce test
 * casse AVANT le terrain.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { pointInGeoJson, type GeoJsonPolygonal } from '../_shared/engine/hexing.ts';

/** Extrait les contours réels depuis la migration 0033 (source de vérité prod). */
async function loadRealZones(): Promise<Map<string, GeoJsonPolygonal>> {
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0033_real_city_zones.sql', import.meta.url),
  );
  const zones = new Map<string, GeoJsonPolygonal>();
  // Chaque bloc : update ... set geojson = '<JSON>'::jsonb ... where city_id = '<id>'
  const re = /set geojson = '(\{.*?\})'::jsonb[\s\S]*?where city_id = '(\w+)'/g;
  for (const m of sql.matchAll(re)) {
    zones.set(m[2]!, JSON.parse(m[1]!) as GeoJsonPolygonal);
  }
  return zones;
}

/** La logique de deriveCityId (ingest_run), rejouée sur des zones fournies. */
function deriveFrom(
  zones: ReadonlyMap<string, GeoJsonPolygonal>,
  lat: number,
  lng: number,
): string | undefined {
  for (const [cityId, geo] of zones) {
    if (pointInGeoJson(lat, lng, geo)) return cityId;
  }
  return undefined;
}

Deno.test('deriveCityId : un départ à République tombe dans PARIS', async () => {
  const zones = await loadRealZones();
  assert(zones.has('paris') && zones.has('lille'), 'migration 0033 illisible');
  assertEquals(deriveFrom(zones, 48.8674, 2.3636), 'paris');
});

Deno.test('deriveCityId : un départ Grand-Place tombe dans LILLE', async () => {
  const zones = await loadRealZones();
  assertEquals(deriveFrom(zones, 50.6365, 3.0635), 'lille');
});

Deno.test('deriveCityId : hors zone (Lyon) → undefined, la capture reste permise', async () => {
  const zones = await loadRealZones();
  // AMENDEMENT-02/35 : la capture n'est PAS bornée aux villes — hors zone, le run
  // reste valide (densité 'wild'), seul le rattachement classement est absent.
  assertEquals(deriveFrom(zones, 45.7640, 4.8357), undefined);
});

Deno.test('deriveCityId : la banlieue proche de Paris (Vincennes) est bien rattachée', async () => {
  const zones = await loadRealZones();
  // Le contour 0033 = union 75+92+93+94 : un run à Vincennes (94) compte pour Paris.
  assertEquals(deriveFrom(zones, 48.8443, 2.4370), 'paris');
});
