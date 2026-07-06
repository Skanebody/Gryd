/**
 * Tests du parseur GPX PUR (gpx-parse.ts) — source « Import GPX » (alternative
 * gratuite à Strava, O7). Deno, aucun réseau, fixtures GPX au format RÉEL
 * (Garmin/Coros/Suunto). Importe DIRECTEMENT la fonction de prod (l'import
 * `import type { RunPoint }` est effacé au runtime → Deno charge le module tel
 * quel, zéro drift). Couvre : trkpt standard, auto-fermé, quotes simples,
 * casse, rejets (bornes WGS84, sans <time>), ordre, entrées cassées.
 *
 * Lancer : ~/.deno/bin/deno test --allow-read \
 *   apps/mobile/src/features/sources/adapters/gpx-parse.test.ts
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { parseGpx } from './gpx-parse.ts';

Deno.test('parseGpx — trkpt standard : lat/lng/t, sans acc, dans l’ordre', () => {
  const xml = `<?xml version="1.0"?>
    <gpx><trk><trkseg>
      <trkpt lat="48.8620" lon="2.3510"><ele>35</ele><time>2026-07-01T07:00:00Z</time></trkpt>
      <trkpt lat="48.8631" lon="2.3522"><time>2026-07-01T07:00:30Z</time></trkpt>
    </trkseg></trk></gpx>`;
  const { points, trackpointCount, skipped } = parseGpx(xml);
  assertEquals(trackpointCount, 2);
  assertEquals(skipped, 0);
  assertEquals(points.length, 2);
  const [p0, p1] = points;
  assertEquals(p0, { lat: 48.862, lng: 2.351, t: Date.parse('2026-07-01T07:00:00Z') });
  // acc absent (le GPX ne porte pas d'accuracy) — traité « bon » côté serveur.
  assertEquals('acc' in p0!, false);
  // Ordre du parcours préservé.
  assertEquals(p1!.t > p0!.t, true);
});

Deno.test('parseGpx — trkpt auto-fermé (attrs seuls) avec <time> impossible → skipped', () => {
  // Un <trkpt .../> ne peut pas contenir <time> : inexploitable pour l'allure.
  const xml = `<gpx><trkpt lat="48.86" lon="2.35"/></gpx>`;
  const { points, trackpointCount, skipped } = parseGpx(xml);
  assertEquals(trackpointCount, 1);
  assertEquals(points.length, 0);
  assertEquals(skipped, 1);
});

Deno.test('parseGpx — quotes simples et casse mixte des attributs', () => {
  const xml = `<GPX><TrkPt LAT='48.10' LON='2.20'><Time>2026-07-01T08:00:00Z</Time></TrkPt></GPX>`;
  const { points } = parseGpx(xml);
  assertEquals(points.length, 1);
  assertEquals(points[0]!.lat, 48.1);
  assertEquals(points[0]!.lng, 2.2);
});

Deno.test('parseGpx — rejette lat/lng hors bornes WGS84', () => {
  const xml = `<gpx>
    <trkpt lat="91.0" lon="2.0"><time>2026-07-01T07:00:00Z</time></trkpt>
    <trkpt lat="48.0" lon="181.0"><time>2026-07-01T07:00:10Z</time></trkpt>
    <trkpt lat="48.0" lon="2.0"><time>2026-07-01T07:00:20Z</time></trkpt>
  </gpx>`;
  const { points, skipped } = parseGpx(xml);
  assertEquals(points.length, 1);
  assertEquals(skipped, 2);
  assertEquals(points[0]!.lat, 48);
});

Deno.test('parseGpx — trkpt sans <time> exploitable → skipped (allure §3.2)', () => {
  const xml = `<gpx>
    <trkpt lat="48.0" lon="2.0"></trkpt>
    <trkpt lat="48.1" lon="2.1"><time>not-a-date</time></trkpt>
  </gpx>`;
  const { points, skipped } = parseGpx(xml);
  assertEquals(points.length, 0);
  assertEquals(skipped, 2);
});

Deno.test('parseGpx — entrées cassées : vide / non-string → résultat vide honnête', () => {
  assertEquals(parseGpx('').points.length, 0);
  assertEquals(parseGpx('pas du xml').points.length, 0);
  // @ts-expect-error : robustesse runtime volontaire (jamais d'exception vers l'UI).
  assertEquals(parseGpx(null).points.length, 0);
});
