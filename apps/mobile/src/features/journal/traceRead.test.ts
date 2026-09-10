/**
 * GRYD — LA TRACE D'UNE SORTIE PASSÉE : les règles de lecture, prouvées.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 *  · `features/history/detailRead.ts` DOCUMENTAIT que `polyline_masked` n'était
 *    pas demandé « parce que `ingest_run` ne l'écrit jamais ». Le serveur
 *    l'écrit (`ingest_run/index.ts:3146`) et écrit AUSSI les points complets
 *    (`refonte2026.ts:167`) : le test ci-dessous relit ces deux sources, pour
 *    qu'une régression serveur soit vue ici et pas par un joueur ;
 *  · confondre les deux sources ferait afficher des splits sur une trace SANS
 *    horodatage — c'est-à-dire une allure inventée par kilomètre ;
 *  · relier deux segments séparés par une rupture dessine un raccourci que
 *    personne n'a couru.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  NO_TRACE,
  decimateForDisplay,
  parseMaskedPolyline,
  parseTracePoints2026,
  runTraceFrom,
  traceSegments,
} from './traceRead.ts';
import type { JournalPoint } from './metrics.ts';

Deno.test('trace_points_2026 — un payload illisible ne devient jamais une trace', () => {
  for (const bad of [null, undefined, 'nope', 42, {}, [null, 3, 'x'], [{ lat: 'a', lng: 1 }]]) {
    assertEquals(parseTracePoints2026(bad).length, 0, `refusé : ${JSON.stringify(bad)}`);
  }
  // Coordonnées hors des bornes terrestres : écartées point par point.
  assertEquals(
    parseTracePoints2026([{ lat: 91, lng: 1 }, { lat: 49.4, lng: 1.1, t: 1 }]).length,
    1,
  );
});

Deno.test('trace_points_2026 — temps, précision et rupture sont conservés', () => {
  const points = parseTracePoints2026([
    { lat: 49.44, lng: 1.1, t: 1_000, acc: 5 },
    { lat: 49.45, lng: 1.1, t: 2_000, acc: 8, breakBefore: true },
  ]);
  assertEquals(points.length, 2);
  assertEquals(points[0]!.t, 1_000);
  assertEquals(points[1]!.breakBefore, true);
  // L'altitude n'est écrite par aucune source : elle reste absente, jamais 0.
  assertEquals(points[0]!.alt, undefined);
});

Deno.test('polyline_masked — géométrie SEULE, jamais un temps inventé', () => {
  const points = parseMaskedPolyline(JSON.stringify([[49.44, 1.1], [49.45, 1.11]]));
  assertEquals(points.length, 2);
  assertEquals(points[0]!.t, undefined);
  // JSON cassé, colonne vide, colonne nulle : aucune trace, aucune exception.
  assertEquals(parseMaskedPolyline('[[49.4,').length, 0);
  assertEquals(parseMaskedPolyline('').length, 0);
  assertEquals(parseMaskedPolyline(null).length, 0);
});

Deno.test('source — la trace COMPLÈTE prime sur la trace masquée', () => {
  const trace = runTraceFrom({
    tracePoints2026: [
      { lat: 49.44, lng: 1.1, t: 1_000 },
      { lat: 49.45, lng: 1.1, t: 2_000 },
    ],
    polylineMasked: JSON.stringify([[49.44, 1.1], [49.45, 1.11]]),
  });
  assertEquals(trace.source, 'full');
  assertEquals(trace.points[0]!.t, 1_000);
});

Deno.test('source — sans points complets, la masquée fait la carte (et le dit)', () => {
  const trace = runTraceFrom({
    tracePoints2026: null,
    polylineMasked: JSON.stringify([[49.44, 1.1], [49.45, 1.11]]),
  });
  assertEquals(trace.source, 'masked');
  assertEquals(runTraceFrom({}), NO_TRACE);
  // Un point isolé n'est pas une trace : rien à dessiner.
  assertEquals(runTraceFrom({ polylineMasked: JSON.stringify([[49.44, 1.1]]) }).source, 'none');
});

Deno.test('affichage — la décimation garde les extrémités et les ruptures', () => {
  const points: JournalPoint[] = Array.from({ length: 500 }, (_, i) => ({
    lat: 49.44 + i * 0.0001,
    lng: 1.1,
    t: 1_000 + i * 1_000,
    ...(i === 250 ? { breakBefore: true as const } : {}),
  }));
  const shown = decimateForDisplay(points, 50);
  assert(shown.length <= 60, `points dessinés : ${shown.length}`);
  assertEquals(shown[0]!.lat, points[0]!.lat);
  assertEquals(shown[shown.length - 1]!.lat, points[499]!.lat);
  assert(shown.some((p) => p.breakBefore === true), 'la rupture doit survivre');
  // Sous le plafond, rien n'est touché.
  assertEquals(decimateForDisplay(points.slice(0, 10), 50).length, 10);
});

Deno.test('segments — une rupture coupe le trait, elle ne le raccourcit pas', () => {
  const points: JournalPoint[] = [
    { lat: 49.44, lng: 1.1 },
    { lat: 49.45, lng: 1.1 },
    { lat: 49.5, lng: 1.2, breakBefore: true },
    { lat: 49.51, lng: 1.2 },
  ];
  const segments = traceSegments(points);
  assertEquals(segments.length, 2);
  assertEquals(segments[0]!.length, 2);
  assertEquals(segments[1]!.length, 2);
});

Deno.test('serveur — les deux colonnes de trace sont bien écrites (sinon l’écran ment)', () => {
  const base = new URL('../../../../../supabase/functions/ingest_run/', import.meta.url);
  const legacy = Deno.readTextFileSync(new URL('index.ts', base));
  const refonte = Deno.readTextFileSync(new URL('refonte2026.ts', base));
  assert(
    legacy.includes('polyline_masked: maskedPolyline'),
    'ingest_run n’écrit plus la trace masquée : le détail doit reprendre son état honnête',
  );
  assert(
    refonte.includes('trace_points_2026: request.points'),
    'le monde 2026 n’écrit plus les points : splits et courbe doivent disparaître AVEC',
  );
});

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};
