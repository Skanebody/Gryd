/**
 * GRYD — L'ALTITUDE ARRIVE JUSQU'AU SERVEUR, ET LE SERVEUR LA GARDE (LOT R).
 *
 * ═══ ÉTAPE 0 : « L'ALTITUDE ÉTAIT PERDUE » ══════════════════════════════════
 * Avant le 11/09/2026, `RunPoint` (`_shared/types.ts`) valait exactement
 * `{ breakBefore?, lat, lng, t, acc? }`. Le téléphone lisait `coords.altitude`
 * à chaque relevé et le jetait au moment de fabriquer le fix ; le champ
 * n'existait donc dans AUCUN payload, `runs.trace_points_2026` n'en contenait
 * aucun, et le profil de dénivelé du détail de sortie — écrit et testé depuis le
 * lot journal — ne pouvait rendre que `available: false`. Le premier test
 * ci-dessous échoue mot pour mot sur ce contrat-là.
 *
 * ═══ POURQUOI AUCUNE MIGRATION ══════════════════════════════════════════════
 * `runs.trace_points_2026` est une colonne `jsonb` (migration 0118) et
 * `refonte2026.ts` y écrit `request.points` TEL QUEL : un champ de plus dans
 * chaque objet ne demande ni colonne, ni type, ni renumérotation. Le test
 * `stockage` verrouille précisément ça — le jour où quelqu'un remapperait les
 * points avant l'écriture (`points.map(p => ({lat, lng, t}))`), l'altitude
 * repartirait dans le silence et ce fichier rougirait.
 *
 * ═══ CE QUE LE SERVEUR NE FAIT PAS AVEC ════════════════════════════════════
 * Rien. Ni distance, ni allure, ni capture, ni point, ni XP : le dénivelé n'est
 * pas une monnaie (anti-pay-to-win, règle 10). Il est stocké pour être RELU par
 * l'app, et la trace PUBLIQUE (`polyline_masked`) ne le porte pas — publier une
 * altitude au mètre près à côté d'une géométrie volontairement grossière
 * annulerait une partie du masquage.
 *
 * Purs : aucun réseau, aucune I/O de base.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { analyzeTrace2026 } from '../_shared/engine/capture2026.ts';
import { maskedPolylineFor } from './tracePersist.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 49.4431;
const LNG0 = 1.0993;
const M_PER_DEG_LAT = 111_195;
/** 11 septembre 2026, 07:00 UTC — date fixe, jamais `Date.now()`. */
const T0 = Date.UTC(2026, 8, 11, 7, 0, 0);

/** Une trace plein nord à 3 m/s, montant de `pente` mètres par seconde. */
function trace(n: number, pente: number | null): RunPoint[] {
  const out: RunPoint[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      lat: LAT0 + (i * 3) / M_PER_DEG_LAT,
      lng: LNG0,
      t: T0 + i * 1_000,
      acc: 5,
      ...(pente === null ? {} : { alt: 100 + i * pente }),
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. LE CONTRAT — le champ existe, il est OPTIONNEL
// ════════════════════════════════════════════════════════════════════════════

Deno.test('altitude : `RunPoint.alt` fait partie du contrat d’ingestion', () => {
  const source = Deno.readTextFileSync(new URL('../_shared/types.ts', import.meta.url));
  const bloc = source.slice(source.indexOf('export interface RunPoint'));
  const fin = bloc.indexOf('\n}');
  assert(bloc.slice(0, fin).includes('alt?: number'),
    'le contrat client ↔ serveur doit porter l’altitude, en OPTIONNEL');
});

Deno.test('altitude : une trace SANS altitude reste un payload parfaitement valide', () => {
  // Rétro-compatibilité stricte : toutes les sorties déjà stockées sont ainsi.
  const points = trace(120, null);
  assert(points.every((p) => p.alt === undefined), 'trace de contrôle sans altitude');
  const analyse = analyzeTrace2026(points, 'run');
  assert(analyse.distanceM > 0, 'elle se mesure exactement comme avant');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE STOCKAGE — jsonb, aucune migration, aucun remapping
// ════════════════════════════════════════════════════════════════════════════

Deno.test('altitude : les points sont écrits TELS QUELS dans trace_points_2026', () => {
  const source = Deno.readTextFileSync(new URL('./refonte2026.ts', import.meta.url));
  assert(source.includes('trace_points_2026: request.points'),
    'les points partent entiers vers la colonne jsonb : un remapping perdrait l’altitude');
  const migration = Deno.readTextFileSync(
    new URL('../../migrations/0118_refonte_2026_polygon_authority.sql', import.meta.url),
  );
  assert(migration.includes('trace_points_2026 jsonb'),
    'la colonne est jsonb depuis 0118 : un champ de plus ne demande aucune migration');
});

Deno.test('altitude : la relecture serveur d’une trace altimétrée donne la même mesure', () => {
  // `refonte2026` relit `run.trace_points_2026` pour rejouer une capture. La
  // preuve relue porte désormais l’altitude ; la mesure ne doit pas bouger d’un
  // mètre pour autant — la distance de GRYD est PLANE des deux côtés.
  const plat = analyzeTrace2026(trace(120, null), 'run');
  const montagne = analyzeTrace2026(trace(120, 2), 'run');
  assertEquals(montagne.distanceM, plat.distanceM, 'la pente n’allonge aucune distance');
  assertEquals(montagne.durationS, plat.durationS, 'ni aucune durée');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LA VIE PRIVÉE — la trace PUBLIQUE ne porte pas l'altitude
// ════════════════════════════════════════════════════════════════════════════

Deno.test('altitude : `polyline_masked` reste une géométrie plane, sans altitude', () => {
  const masked = maskedPolylineFor(trace(400, 2), []);
  if (masked === null) return; // trace trop courte après la coupe : rien à publier
  const parsed = JSON.parse(masked) as unknown[];
  assert(parsed.every((row) => Array.isArray(row) && row.length === 2),
    'la trace publiée reste `[[lat, lng], …]` : le relief ne se publie pas avec elle');
});
