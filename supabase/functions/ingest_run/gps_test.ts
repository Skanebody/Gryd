/**
 * Tests engine/gps.ts — AMENDEMENT-15 §1 (moteur GPS pur, pipeline partagé
 * client/serveur). Purs : aucun réseau, aucune I/O, bruit GPS DÉTERMINISTE
 * (PRNG seedé). Les scénarios exigés par l'amendement :
 *  - trace propre de référence (distance connue ± 1 %) ;
 *  - outlier téléporté rejeté ; spike de vitesse rejeté (borne §3.2) ;
 *  - tunnel (trou 60 s → lost, reprise SANS faux kilomètres) ;
 *  - zigzag urbain lissé sans couper un virage à 90° ;
 *  - pause détectée (feu rouge) + jitter parking sans faux mètres ;
 *  - payload borné (Douglas-Peucker + plafond) compatible filterPoints §3.2 ;
 *  - trust dégradé avec accuracy pourrie / pertes de signal / outliers.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  cleanTrace,
  decimateForPayload,
  detectPauses,
  gpsTrustScore,
  rawFixesToRunPoints,
  signalState,
  smoothTrace,
  totalDistanceM,
  type RawFix,
} from '../_shared/engine/gps.ts';
import { computeStats, filterPoints } from '../_shared/engine/validation.ts';
import {
  GPS_ACCURACY_MAX_M,
  GPS_MAX_PAYLOAD_POINTS,
  GPS_PAUSE_AFTER_S,
  GPS_REANCHOR_AFTER_REJECTS,
  GPS_SAMPLE_INTERVAL_MS,
  GPS_SIGNAL_LOST_AFTER_S,
  GPS_SIGNAL_WEAK_AFTER_S,
  POINT_MAX_ACCURACY_M,
  POINT_MAX_JUMP_M,
} from '../_shared/game-rules.ts';

// ─── Géométrie locale (mètres → lat/lng autour de Paris) ─────────────────────
const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG = 111_195;
const COS_LAT0 = Math.cos((LAT0 * Math.PI) / 180);

/** (x est, y nord) en mètres → fix GPS. */
function fix(x: number, y: number, ts: number, accuracy: number): RawFix {
  return {
    lat: LAT0 + y / M_PER_DEG,
    lng: LNG0 + x / (M_PER_DEG * COS_LAT0),
    ts,
    accuracy,
  };
}

/** PRNG déterministe (mulberry32) — bruit GPS reproductible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Uniforme dans [−r ; +r]. */
const noise = (rnd: () => number, r: number): number => (rnd() * 2 - 1) * r;

const DT = GPS_SAMPLE_INTERVAL_MS; // cadence nominale (2 s)

/** Ligne droite plein nord depuis (x0, y0) : n points à `speedMs`, cadence DT. */
function north(
  { n, speedMs, x0 = 0, y0 = 0, t0 = 0, acc = 5 }: {
    n: number;
    speedMs: number;
    x0?: number;
    y0?: number;
    t0?: number;
    acc?: number;
  },
): RawFix[] {
  const out: RawFix[] = [];
  for (let i = 0; i < n; i++) {
    out.push(fix(x0, y0 + speedMs * (i * DT) / 1000, t0 + i * DT, acc));
  }
  return out;
}

// ═══ 1. Trace propre de référence : distance connue ± 1 % ════════════════════

Deno.test('gps : trace propre 5 km → distance à ±1 %, zéro rejet, zéro pause', () => {
  // 5 000 m à 3,333 m/s (allure 5:00/km), 751 points, accuracy 5 m.
  const raw = north({ n: 751, speedMs: 10_000 / 3_000 });
  const clean = cleanTrace(raw);
  assertEquals(clean.totalFixes, 751);
  assertEquals(Object.values(clean.rejected).reduce((a, b) => a + b, 0), 0);
  assertEquals(clean.points.length, 751);

  const d = totalDistanceM(clean.points);
  assert(Math.abs(d - 5000) <= 50, `distance ${d} hors 5000 ±1 %`);

  // Le lissage ne déforme pas une trace déjà propre (collinéaire → médiane = point).
  const dSmooth = totalDistanceM(smoothTrace(clean.points));
  assert(Math.abs(dSmooth - d) <= 5, `lissage a déformé la trace propre : ${dSmooth} vs ${d}`);

  assertEquals(detectPauses(clean.points), []);
  const trust = gpsTrustScore(clean);
  assert(trust >= 95, `trust ${trust} attendu ≥ 95 sur trace parfaite`);
});

// ═══ 2. Outliers : téléportation et spike de vitesse (bornes §3.2) ═══════════

Deno.test('gps : point téléporté à 500 m rejeté, distance intacte', () => {
  const raw = north({ n: 751, speedMs: 10_000 / 3_000 });
  const mid = raw[375]!;
  raw[375] = { ...mid, lng: LNG0 + 500 / (M_PER_DEG * COS_LAT0) }; // +500 m est
  const clean = cleanTrace(raw);
  assertEquals(clean.rejected.teleport, 1);
  assertEquals(clean.points.length, 750);
  const d = totalDistanceM(clean.points);
  assert(Math.abs(d - 5000) <= 50, `distance ${d} hors 5000 ±1 % après téléport`);
});

Deno.test('gps : spike de vitesse implicite (> 25 km/h §3.2) rejeté', () => {
  const raw = north({ n: 751, speedMs: 10_000 / 3_000 });
  const mid = raw[300]!;
  raw[300] = { ...mid, lat: mid.lat + 30 / M_PER_DEG }; // +30 m d'avance → ~18 m/s
  const clean = cleanTrace(raw);
  assertEquals(clean.rejected.speed, 1);
  const d = totalDistanceM(clean.points);
  assert(Math.abs(d - 5000) <= 50, `distance ${d} hors 5000 ±1 % après spike`);
});

Deno.test('gps : relock permanent → ré-ancrage après N rejets, sans faux kilomètres', () => {
  // 400 points ; à mi-course le GPS relocke 5 km plus loin, définitivement.
  const legA = north({ n: 200, speedMs: 10_000 / 3_000 });
  const legB = north({
    n: 200,
    speedMs: 10_000 / 3_000,
    x0: 5_000,
    y0: (10_000 / 3_000) * (200 * DT) / 1000,
    t0: 200 * DT,
  });
  const clean = cleanTrace([...legA, ...legB]);
  assertEquals(clean.rejected.teleport, GPS_REANCHOR_AFTER_REJECTS);
  const reanchored = clean.points.filter((p) => p.gapBefore === true);
  assertEquals(reanchored.length, 1);
  // Distance = deux tronçons, JAMAIS le saut de 5 km.
  const d = totalDistanceM(clean.points);
  const expected = (199 + 200 - GPS_REANCHOR_AFTER_REJECTS - 1) * ((10_000 / 3_000) * DT / 1000);
  assert(Math.abs(d - expected) <= expected * 0.01, `distance ${d} attendue ~${expected}`);
});

// ═══ 3. Tunnel : trou de 60 s → lost, reprise sans faux kilomètres ═══════════

Deno.test('gps : tunnel 60 s → gap marqué, 1800 m comptés (pas 2000)', () => {
  const v = 3; // m/s
  const legA = north({ n: 151, speedMs: v }); // 900 m en 300 s
  const holeS = 60;
  const resumeY = 900 + 200; // 200 m parcourus sous le tunnel (non mesurables)
  const legB = north({ n: 151, speedMs: v, y0: resumeY, t0: 300_000 + holeS * 1000 });
  const clean = cleanTrace([...legA, ...legB]);

  assertEquals(Object.values(clean.rejected).reduce((a, b) => a + b, 0), 0);
  const gaps = clean.points.filter((p) => p.gapBefore === true);
  assertEquals(gaps.length, 1, 'une seule discontinuité attendue (le tunnel)');

  const d = totalDistanceM(clean.points, detectPauses(clean.points));
  assert(Math.abs(d - 1800) <= 20, `distance ${d} : le saut du tunnel ne doit pas compter`);

  // Trust légèrement dégradé par la perte de signal, sans être puni.
  const trust = gpsTrustScore(clean);
  assert(trust < 100 && trust >= 90, `trust ${trust} attendu dans [90 ; 100[`);
});

Deno.test('gps : signalState ok → weak → lost pendant le trou', () => {
  const lastFix = { ts: 300_000, accuracy: 6 };
  assertEquals(signalState(300_500, lastFix), 'ok');
  assertEquals(signalState(300_000 + (GPS_SIGNAL_WEAK_AFTER_S + 2) * 1000, lastFix), 'weak');
  assertEquals(signalState(300_000 + (GPS_SIGNAL_LOST_AFTER_S + 5) * 1000, lastFix), 'lost');
  assertEquals(signalState(1_000, undefined), 'lost');
  assertEquals(signalState(1_000, null), 'lost');
  // Fix frais mais précision au-dessus du filtre claim §3.2 → weak ; inutilisable → lost.
  assertEquals(signalState(1_000, { ts: 500, accuracy: POINT_MAX_ACCURACY_M + 3 }), 'weak');
  assertEquals(signalState(1_000, { ts: 500, accuracy: GPS_ACCURACY_MAX_M + 10 }), 'lost');
});

// ═══ 4. Zigzag urbain : lissé sans couper un virage à 90° ═══════════════════

/** Trace en L : 600 m nord puis 600 m est, 3 m/s, bruit ±rM, accuracy acc. */
function lShape(rM: number, acc: number, seed = 42): RawFix[] {
  const rnd = mulberry32(seed);
  const v = 3;
  const out: RawFix[] = [];
  let t = 0;
  for (let i = 0; i <= 100; i++, t += DT) {
    out.push(fix(noise(rnd, rM), (i * v * DT) / 1000 + noise(rnd, rM), t, acc));
  }
  for (let i = 1; i <= 100; i++, t += DT) {
    out.push(fix((i * v * DT) / 1000 + noise(rnd, rM), 600 + noise(rnd, rM), t, acc));
  }
  return out;
}

Deno.test('gps : zigzag urbain bruité → le lissage réduit la fausse distance', () => {
  const clean = cleanTrace(lShape(2.5, 20));
  assertEquals(Object.values(clean.rejected).reduce((a, b) => a + b, 0), 0);
  const dNoisy = totalDistanceM(clean.points);
  const dSmooth = totalDistanceM(smoothTrace(clean.points));
  assert(dNoisy >= 1_250, `trace bruitée attendue gonflée (${dNoisy} m pour 1200 réels)`);
  assert(dSmooth <= dNoisy - 40, `lissage inefficace : ${dSmooth} vs brut ${dNoisy}`);
  assert(dSmooth >= 1_190, `lissage trop agressif : ${dSmooth} < 1190 (virage coupé ?)`);
});

Deno.test('gps : virage à 90° avec bon signal → aucun coin coupé', () => {
  const clean = cleanTrace(lShape(0, 5)); // trace exacte, accuracy excellente
  const smoothed = smoothTrace(clean.points);
  const corner = fix(0, 600, 0, 5);
  // Le sommet du virage reste sur place (médiane composante par composante
  // + pondération accuracy ≈ 0,14 : le L est un point fixe du lissage).
  const dyMin = Math.min(
    ...smoothed.map((p) =>
      Math.hypot(
        (p.lat - corner.lat) * M_PER_DEG,
        (p.lng - corner.lng) * M_PER_DEG * COS_LAT0,
      )
    ),
  );
  assert(dyMin <= 0.5, `sommet du virage déplacé de ${dyMin} m`);
  // Tolérance ±3 m : la fenêtre médiane asymétrique aux extrémités de trace
  // tire les 2 points de bord vers l'intérieur (~0,9 m par bout) — un virage
  // réellement coupé perdrait ~350 m (diagonale), pas 2.
  const d = totalDistanceM(smoothed);
  assert(d >= 1_197 && d <= 1_203, `longueur du L après lissage : ${d} ≠ 1200 ±3`);
});

// ═══ 5. Pause auto (feu rouge) + jitter parking ══════════════════════════════

Deno.test('gps : arrêt 45 s au feu rouge → 1 pause détectée, dérive non comptée', () => {
  const rnd = mulberry32(7);
  const v = 3;
  const legA = north({ n: 181, speedMs: v, acc: 8 }); // 1080 m en 360 s
  const stopY = 1080;
  const stop: RawFix[] = [];
  for (let i = 1; i <= 23; i++) { // ~45 s immobile, bruit ±2 m
    stop.push(fix(noise(rnd, 2), stopY + noise(rnd, 2), 360_000 + i * DT, 8));
  }
  const tResume = 360_000 + 24 * DT;
  const legB: RawFix[] = [];
  for (let i = 0; i <= 180; i++) { // 1080 m plein est
    legB.push(fix((i * v * DT) / 1000, stopY, tResume + i * DT, 8));
  }
  const clean = cleanTrace([...legA, ...stop, ...legB]);
  assert(clean.rejected.jitter > 0, 'le jitter d\'arrêt doit être collapsé');

  const pauses = detectPauses(clean.points);
  assertEquals(pauses.length, 1, `1 pause attendue, obtenu ${JSON.stringify(pauses)}`);
  const p = pauses[0]!;
  assert(p.durationS >= GPS_PAUSE_AFTER_S, 'durée de pause < seuil');
  assert(p.durationS >= 35 && p.durationS <= 70, `durée de pause ${p.durationS} hors [35 ; 70]`);

  const d = totalDistanceM(clean.points, pauses);
  assert(d >= 2_050 && d <= 2_200, `distance ${d} hors [2050 ; 2200] (2160 réels)`);
});

Deno.test('gps : footing lent continu (1,2 m/s) → AUCUNE fausse pause', () => {
  const raw = north({ n: 61, speedMs: 1.2, acc: 8 }); // 2 min à 1,2 m/s
  const clean = cleanTrace(raw);
  assertEquals(detectPauses(clean.points), []);
  const d = totalDistanceM(clean.points);
  assert(Math.abs(d - 144) <= 2, `distance ${d} ≠ 144 m : le lent n'est pas du jitter`);
});

Deno.test('gps : 10 min immobile (parking) → ~0 m, une seule pause', () => {
  const rnd = mulberry32(99);
  const raw: RawFix[] = [];
  for (let i = 0; i <= 300; i++) {
    raw.push(fix(noise(rnd, 2.5), noise(rnd, 2.5), i * DT, 10));
  }
  const clean = cleanTrace(raw);
  assert(clean.rejected.jitter >= 250, `jitter collapsé attendu, rejets=${clean.rejected.jitter}`);
  const pauses = detectPauses(clean.points);
  assertEquals(pauses.length, 1);
  const d = totalDistanceM(clean.points, pauses);
  assert(d <= 1, `parking : ${d} m comptés au lieu de ~0`);
});

// ═══ 6. Payload borné + compatibilité serveur §3.2 ═══════════════════════════

Deno.test('gps : decimateForPayload respecte le plafond et les extrémités', () => {
  // 6 000 points en zigzag serré (amplitude 3 m > epsilon DP) : DP garde
  // presque tout → c'est le PLAFOND qui doit borner.
  const out: RawFix[] = [];
  const v = 2.5;
  for (let i = 0; i < 6_000; i++) {
    const x = [0, 3, 0, -3][i % 4]!;
    out.push(fix(x, (i * v * DT) / 1000, i * DT, 6));
  }
  const clean = cleanTrace(out);
  const decimated = decimateForPayload(clean.points);
  assert(decimated.length <= GPS_MAX_PAYLOAD_POINTS, `payload ${decimated.length} > plafond`);
  assert(decimated.length >= 100, 'décimation absurde (trace vidée)');
  assertEquals(decimated[0]!.ts, clean.points[0]!.ts);
  assertEquals(decimated[decimated.length - 1]!.ts, clean.points[clean.points.length - 1]!.ts);
  for (let i = 1; i < decimated.length; i++) {
    const step = Math.hypot(
      (decimated[i]!.lat - decimated[i - 1]!.lat) * M_PER_DEG,
      (decimated[i]!.lng - decimated[i - 1]!.lng) * M_PER_DEG * COS_LAT0,
    );
    assert(step <= POINT_MAX_JUMP_M, `corde décimée ${step} m > POINT_MAX_JUMP_M`);
  }
});

Deno.test('gps : décimation fidèle (courbe réaliste) + relecture serveur §3.2', () => {
  // 30 km de rue sinueuse (sinusoïde 15 m / 400 m) — DP léger seul suffit.
  const v = 2.5;
  const raw: RawFix[] = [];
  for (let i = 0; i < 6_000; i++) {
    const y = (i * v * DT) / 1000;
    raw.push(fix(15 * Math.sin((2 * Math.PI * y) / 400), y, i * DT, 6));
  }
  const clean = cleanTrace(raw);
  const dRef = totalDistanceM(clean.points);
  const decimated = decimateForPayload(clean.points);
  assert(decimated.length <= GPS_MAX_PAYLOAD_POINTS);
  const dDecimated = totalDistanceM(decimated);
  assert(
    Math.abs(dDecimated - dRef) <= dRef * 0.015,
    `distance décimée ${dDecimated} vs ${dRef} (> 1,5 %)`,
  );
  // MÊME LOGIQUE côté serveur : filterPoints (§3.2) ne coupe RIEN sur le
  // payload décimé (cordes ≤ POINT_MAX_JUMP_M) et retrouve la distance.
  const filtered = filterPoints(rawFixesToRunPoints(decimated));
  assertEquals(filtered.keptPoints, decimated.length);
  assertEquals(filtered.segments.length, 1);
  const stats = computeStats(filtered.segments);
  assert(
    Math.abs(stats.distanceM - dDecimated) <= dRef * 0.005,
    `serveur ${stats.distanceM} ≠ client ${dDecimated}`,
  );
});

// ═══ 7. GPS Trust : dégradé avec accuracy pourrie / outliers ═════════════════

Deno.test('gps : trust dégradé — accuracy pourrie puis outliers', () => {
  const good = cleanTrace(north({ n: 751, speedMs: 10 / 3, acc: 5 }));
  const bad = cleanTrace(north({ n: 751, speedMs: 10 / 3, acc: 28 }));
  const tGood = gpsTrustScore(good);
  const tBad = gpsTrustScore(bad);
  assert(tGood >= 95, `trust propre ${tGood} < 95`);
  assert(tBad <= 70, `trust accuracy 28 m : ${tBad} > 70`);
  assert(tBad < tGood);

  // + ~12 % de téléportations : le trust plonge encore.
  const spiky = north({ n: 751, speedMs: 10 / 3, acc: 28 });
  for (let i = 8; i < 751 - 8; i += 8) {
    const p = spiky[i]!;
    spiky[i] = { ...p, lng: p.lng + 500 / (M_PER_DEG * COS_LAT0) };
  }
  const withOutliers = cleanTrace(spiky);
  assert(withOutliers.rejected.teleport >= 80, 'les spikes doivent être rejetés');
  const tOutliers = gpsTrustScore(withOutliers);
  assert(tOutliers <= 60, `trust avec outliers : ${tOutliers} > 60`);
  assert(tOutliers < tBad, `${tOutliers} devrait être < ${tBad}`);
});

Deno.test('gps : trust nul sans trace exploitable ; accuracy > max rejetée', () => {
  assertEquals(gpsTrustScore(cleanTrace([])), 0);
  assertEquals(gpsTrustScore(cleanTrace([fix(0, 0, 0, 5)])), 0);
  const clean = cleanTrace([
    fix(0, 0, 0, GPS_ACCURACY_MAX_M + 15),
    fix(0, 5, DT, GPS_ACCURACY_MAX_M + 15),
  ]);
  assertEquals(clean.rejected.accuracy, 2);
  assertEquals(clean.points.length, 0);
});

Deno.test('gps : timestamps dupliqués/désordonnés et champs non finis rejetés', () => {
  const raw = north({ n: 10, speedMs: 3 });
  const dup = { ...raw[4]! }; // même ts que raw[4]
  const nan: RawFix = { lat: Number.NaN, lng: LNG0, ts: 21_000, accuracy: 5 };
  const clean = cleanTrace([...raw, dup, nan]);
  assertEquals(clean.rejected.timestamp, 1);
  assertEquals(clean.rejected.invalid, 1);
  assertEquals(clean.points.length, 10);
});
