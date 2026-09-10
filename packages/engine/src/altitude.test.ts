/**
 * GRYD — L'ALTITUDE TRAVERSE LE MOTEUR (LOT R, 11/09/2026).
 *
 * ═══ ÉTAPE 0 : « L'ALTITUDE ÉTAIT PERDUE » ══════════════════════════════════
 * Avant ce lot, `RunPoint` valait exactement `{ breakBefore?, lat, lng, t, acc? }`
 * et `rawFixesToRunPoints` s'écrivait :
 *
 *     return fixes.map((f) => ({ lat: f.lat, lng: f.lng, t: f.ts, acc: f.accuracy,
 *       ...(f.breakBefore || (f as CleanFix).gapBefore ? { breakBefore: true } : {}),
 *     }));
 *
 * Le champ n'existait NULLE PART, donc rien ne pouvait le perdre visiblement :
 * la perte se faisait à la frontière du contrat, en silence. Le téléphone lisait
 * pourtant `coords.altitude` à chaque relevé, `features/journal/metrics.ts`
 * savait déjà en tirer un dénivelé (`elevationFrom`, hystérésis
 * `ELEVATION_NOISE_M`) et `traceRead.parseTracePoints2026` savait déjà le
 * relire — le commentaire de `metrics.ts` disait mot pour mot : « AUCUNE source
 * de GRYD ne fournit d'altitude aujourd'hui (`RunPoint` = lat/lng/t/acc) ».
 * Le profil d'altitude était donc structurellement mort, et l'écran de course
 * ne pouvait afficher aucun D+.
 *
 * Chacun des tests ci-dessous ÉCHOUE mot pour mot sur le code d'avant :
 * le premier parce que `alt` n'était pas recopié, les suivants parce que le
 * champ n'existait pas dans le type qu'ils lisent.
 *
 * ═══ CE QU'ILS VERROUILLENT AUTANT : LA RÉTRO-COMPATIBILITÉ ═════════════════
 * Toutes les traces déjà écrites dans `runs.trace_points_2026` sont SANS
 * altitude. Une trace sans `alt` doit donc rester strictement valide, produire
 * les mêmes segments, la même distance et le même verdict qu'avant ce lot —
 * sinon le champ optionnel serait une rupture de contrat déguisée.
 *
 * MÊMES CONTRAINTES D'OUTILLAGE que `validation.test.ts` : aucun import externe
 * (le tsconfig du paquet typecheckerait un spécificateur `jsr:`), et le global
 * `Deno` déclaré localement.
 */
import { cleanTrace, decimateForPayload, rawFixesToRunPoints, smoothTrace, type RawFix } from './gps.ts';
import { computeStats, filterPoints, validateRun } from './validation.ts';
import type { RunPoint } from '@klaim/shared/types';

// Voir le docblock : le runner Deno, typé localement.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

// ─── Fabrique de traces ──────────────────────────────────────────────────────
//
// Même géométrie que `validation.test.ts` : plein est, latitude constante
// (Rouen), donc la conversion mètres → degrés est exacte au premier ordre.

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 49.4431, lng: 1.0993 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);
const MS_PER_S = 1_000;
/** 11 septembre 2026, 07:00 UTC — une date fixe, jamais `Date.now()`. */
const T0 = Date.UTC(2026, 8, 11, 7, 0, 0);

function fixEst(xM: number, tS: number, alt?: number): RawFix {
  return {
    lat: ORIGINE.lat,
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
    ts: T0 + Math.round(tS * MS_PER_S),
    accuracy: 5,
    ...(alt === undefined ? {} : { alt }),
  };
}

/** Une trace régulière à 3 m/s (allure de course), montant de `pente` m/point. */
function montee(n: number, pente: number, altDepart = 100): RawFix[] {
  const out: RawFix[] = [];
  for (let i = 0; i < n; i++) out.push(fixEst(i * 3, i, altDepart + i * pente));
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. LE PONT VERS LE CONTRAT — c'est là que l'altitude se perdait
// ════════════════════════════════════════════════════════════════════════════

Deno.test('altitude : rawFixesToRunPoints la recopie dans RunPoint.alt', () => {
  const points = rawFixesToRunPoints([fixEst(0, 0, 112.5), fixEst(3, 1, 113.25)]);
  assertEgal(points.map((p) => p.alt), [112.5, 113.25],
    'l’altitude mesurée doit arriver telle quelle dans le point envoyé au serveur');
});

Deno.test('altitude : un relevé sans altitude n’en fabrique pas', () => {
  const points = rawFixesToRunPoints([fixEst(0, 0), fixEst(3, 1)]);
  assert(points.every((p) => !('alt' in p)),
    'le champ doit être ABSENT, jamais 0 : « pas mesurée » n’est pas « au niveau de la mer »');
});

Deno.test('altitude : une valeur non finie est traitée comme une absence', () => {
  // Un capteur en cours d’accrochage rend NaN ; un navigateur sans altimètre
  // rend null (que le provider n’envoie pas). Aucun des deux n’est une mesure.
  const casse: RawFix[] = [
    { ...fixEst(0, 0), alt: Number.NaN },
    { ...fixEst(3, 1), alt: Number.POSITIVE_INFINITY },
  ];
  const points = rawFixesToRunPoints(casse);
  assert(points.every((p) => !('alt' in p)),
    'NaN et Infinity ne sont pas des altitudes : le champ doit disparaître');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE PIPELINE DE NETTOYAGE LA TRANSPORTE SANS LA TOUCHER
// ════════════════════════════════════════════════════════════════════════════

Deno.test('altitude : elle survit à cleanTrace + smoothTrace + decimateForPayload', () => {
  const brut = montee(40, 0.5);
  const clean = cleanTrace(brut, 'run');
  const smoothed = smoothTrace(clean.points);
  const payload = rawFixesToRunPoints(decimateForPayload(smoothed, undefined, 'run'));
  assert(payload.length >= 2, 'la trace de contrôle doit survivre au nettoyage');
  assert(payload.every((p) => typeof p.alt === 'number'),
    'chaque point conservé garde son altitude jusqu’au payload');
});

Deno.test('altitude : smoothTrace la MOYENNE (et n’en invente pas là où il n’y en a pas)', () => {
  // Une oscillation de ±2 m sur une trace plate : c’est elle qui produisait
  // 596 m de D+ imaginaire avant `ELEVATION_SMOOTH_WINDOW_S`.
  const oscillante: RawFix[] = [];
  for (let i = 0; i < 120; i++) oscillante.push(fixEst(i * 3, i, 100 + (i % 2 === 0 ? 2 : -2)));
  const lisse = smoothTrace(cleanTrace(oscillante, 'run').points);
  // Au milieu de la trace, la fenêtre est pleine des deux côtés : la moyenne
  // tombe sur 100 m à quelques centièmes près.
  const milieu = lisse[Math.floor(lisse.length / 2)]!;
  assert(Math.abs((milieu.alt ?? 0) - 100) < 0.2,
    `l’oscillation doit s’annuler (altitude lissée obtenue : ${milieu.alt})`);
  // Et une trace SANS altitude n’en reçoit pas une : la fenêtre moyenne ce qui
  // a été mesuré, elle ne comble aucun trou.
  const nue = smoothTrace(cleanTrace(montee(20, 0).map(({ alt: _a, ...reste }) => reste), 'run').points);
  assert(nue.every((p) => p.alt === undefined), 'aucune altitude ne se fabrique au lissage');
});

Deno.test('altitude : une VRAIE montée survit au lissage', () => {
  // Le lissage doit tuer le bruit, pas les côtes : +0,5 m par relevé sur 200 s.
  const lisse = smoothTrace(cleanTrace(montee(200, 0.5), 'run').points);
  const premier = lisse[0]?.alt ?? 0;
  const dernier = lisse[lisse.length - 1]?.alt ?? 0;
  // Les bords d’une moyenne glissante rabotent la moitié de la fenêtre de chaque
  // côté (±10 s ⇒ ±5 m ici) : on borne la perte, on ne l’ignore pas.
  assert(dernier - premier > 89 && dernier - premier <= 99.5,
    `montée de 99,5 m attendue quasi intacte, obtenue ${dernier - premier}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LA VALIDATION L'IGNORE — et une trace ancienne reste identique
// ════════════════════════════════════════════════════════════════════════════

Deno.test('altitude : filterPoints la conserve sans jamais la lire', () => {
  const avec = rawFixesToRunPoints(montee(30, 1));
  const resultat = filterPoints(avec, 'run');
  const gardes = resultat.segments.flat();
  assert(gardes.length === avec.length, 'aucun point ne doit être rejeté pour son altitude');
  assert(gardes.every((p) => typeof p.alt === 'number'),
    'les points conservés gardent leur altitude (le serveur la stocke telle quelle)');
});

Deno.test('altitude : ajouter le champ ne change RIEN au verdict d’une sortie', () => {
  // La MÊME trace, une fois sans altitude (toutes les sorties déjà stockées) et
  // une fois avec une montée de 900 m. Distance, durée, allure et verdict
  // doivent être rigoureusement identiques : le dénivelé ne décide d’aucun
  // claim, d’aucun point, d’aucun XP (anti-pay-to-win, règle 10).
  const sans: RunPoint[] = rawFixesToRunPoints(montee(300, 0).map((f) => {
    const { alt: _ignore, ...reste } = f;
    return reste;
  }));
  const avec: RunPoint[] = rawFixesToRunPoints(montee(300, 3));
  const statsSans = computeStats(filterPoints(sans, 'run').segments);
  const statsAvec = computeStats(filterPoints(avec, 'run').segments);
  assertEgal(statsAvec, statsSans, 'la distance de GRYD est PLANE : la pente ne l’allonge pas');
  assertEgal(
    validateRun(statsAvec, 'run'),
    validateRun(statsSans, 'run'),
    'une trace ancienne (sans altitude) rend exactement le même verdict qu’une trace neuve',
  );
});
