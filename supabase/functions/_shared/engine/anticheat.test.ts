// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/anticheat.test.ts

/**
 * GRYD — tests de engine/anticheat.ts (§11.1 signaux, §11.3 décisions).
 *
 * ═══ CE QUE CES TESTS VERROUILLENT ══════════════════════════════════════════
 * La phrase de la spec qui coûte le plus cher si elle est trahie : « le système
 * ne bannit pas automatiquement sur un signal unique faible ». Un scoring
 * anti-triche écrit en OU logique passe toutes les relectures et se voit
 * seulement le jour où un coureur honnête est refusé sous un pont. Ces tests
 * mesurent donc les QUATRE marches de la spec, chacune par la voie qui la
 * produit :
 *   · un signal FAIBLE seul  ⇒ PASS (et le score reste bas) ;
 *   · plusieurs signaux MODÉRÉS ⇒ MANUAL_REVIEW, alors qu'AUCUN d'eux ne
 *     franchit seul le seuil « fort » — c'est la CONVERGENCE qui décide ;
 *   · un signal FORT seul ⇒ MANUAL_REVIEW, jamais REJECT, et on prouve que
 *     c'est bien la règle « fort seul » qui a joué (le score, lui, reste sous
 *     le seuil de revue) ;
 *   · un signal MASSIF et décisif ⇒ REJECT, et on prouve là aussi que c'est la
 *     règle décisive qui a joué (le score reste sous REJECT_AT) ;
 *   · des segments douteux mais bornés ⇒ PASS_WITH_EXCLUSIONS.
 *
 * ═══ ET CE QU'ILS VERROUILLENT AUTANT : L'ABSENCE ═══════════════════════════
 * Un signal INDISPONIBLE ne doit ni pénaliser ni blanchir. C'est le défaut
 * silencieux typique d'un scoring pondéré : compter un podomètre absent comme
 * « 0 de sévérité » dilue le score et innocente ; le compter comme 1 accuse un
 * appareil qui n'a rien fait. On vérifie donc qu'il SORT du dénominateur.
 *
 * MÊMES CONTRAINTES D'OUTILLAGE que contest.test.ts / polygon.test.ts : aucun
 * import externe (le tsconfig du paquet typecheckerait un spécificateur `jsr:`),
 * et le global `Deno` déclaré localement.
 */
import {
  ANTICHEAT_HUMAN_MIN_SPEED_CV,
  ANTICHEAT_JUMPS_SEVERE,
  ANTICHEAT_REJECT_AT,
  ANTICHEAT_REVIEW_AT,
  ANTICHEAT_SIGNAL_SPECS,
  ANTICHEAT_SIGNALS_NOT_COLLECTED,
  ANTICHEAT_STRONG_SEVERITY,
  creditsCapture,
  needsHumanReview,
  scoreRun,
  traceFingerprint,
  type AntiCheatReport,
  type AntiCheatSignalId,
} from './anticheat.ts';
import { computeStats, filterPoints } from './validation.ts';
import { POINT_MAX_ACCURACY_M, SEGMENT_PACE_MAX_S_KM } from '../game-rules.ts';
import type { RunPoint } from '../types.ts';

// Voir le docblock : le runner Deno, typé localement.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

// ─── Assertions minimales ────────────────────────────────────────────────────

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
// Toutes les traces avancent PLEIN EST à latitude constante : la conversion
// mètres → degrés est alors exacte au premier ordre, et une distance demandée
// est la distance mesurée par la haversine du moteur. Aucune trace n'est tirée
// au hasard : le générateur de « jitter » est un LCG à graine fixe, donc chaque
// test est reproductible à l'octet près.

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 48.85, lng: 2.35 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);
/** 1er mars 2026, 08:00 UTC — une date fixe, jamais `Date.now()`. */
const T0 = Date.UTC(2026, 2, 1, 8, 0, 0);

function pointEst(xM: number, tMs: number, acc?: number): RunPoint {
  const p: RunPoint = {
    lat: ORIGINE.lat,
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
    t: tMs,
  };
  return acc === undefined ? p : { ...p, acc };
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

interface TraceOptions {
  /** Allure visée en s/km (300 = 5:00/km). */
  paceSKm?: number;
  durationS?: number;
  /** Cadence d'échantillonnage (s). */
  stepS?: number;
  /** Précision annoncée, ou `undefined` pour une source qui n'en fournit pas. */
  acc?: number | undefined;
  /** Amplitude relative de la variation de vitesse (0 = trace parfaite). */
  jitter?: number;
  seed?: number;
  /** Position et instant de départ (pour chaîner des segments). */
  x0?: number;
  t0?: number;
}

function trace(o: TraceOptions = {}): RunPoint[] {
  const paceSKm = o.paceSKm ?? 300;
  const durationS = o.durationS ?? 1200;
  const stepS = o.stepS ?? 1;
  const jitter = o.jitter ?? 0.3;
  const acc = o.acc === undefined && 'acc' in o ? undefined : (o.acc ?? 8);
  const rnd = lcg(o.seed ?? 42);
  const v = 1000 / paceSKm;
  const pts: RunPoint[] = [];
  let x = o.x0 ?? 0;
  const t0 = o.t0 ?? T0;
  for (let s = 0; s <= durationS; s += stepS) {
    pts.push(pointEst(x, t0 + s * 1000, acc));
    x += v * stepS * (1 + (rnd() * 2 - 1) * jitter);
  }
  return pts;
}

/** Instant « serveur » : après la fin de la trace, jamais l'horloge machine. */
function afterEnd(points: readonly RunPoint[]): number {
  return Math.max(...points.map((p) => p.t)) + 60_000;
}

function signal(report: AntiCheatReport, id: AntiCheatSignalId) {
  const s = report.signals.find((x) => x.id === id);
  if (!s) throw new Error(`signal ${id} absent du rapport`);
  return s;
}

/** Distance réellement retenue par le moteur — sert à calibrer un podomètre. */
function keptDistanceM(points: readonly RunPoint[]): number {
  return computeStats(filterPoints([...points]).segments).distanceM;
}

/**
 * Une PAUSE LONGUE qui se termine 300 m plus loin : le moteur y voit un saut
 * (> `pointMaxJumpM`) et COUPE le segment, sans qu'aucune vitesse ni aucune
 * accélération n'y soit anormale (300 m en 600 s = 0,5 m/s). C'est le seul
 * moyen honnête de tester `gps_jumps` seul : un saut « téléporté » en une
 * seconde déclencherait mécaniquement `sustained_speed` et `acceleration`, et le
 * test ne mesurerait plus ce qu'il prétend mesurer.
 */
const DRIFT_M = 300;
const DRIFT_S = 600;

/** Trace continue coupée par `jumps` dérives longues. */
function traceAvecSauts(jumps: number, o: TraceOptions = {}): RunPoint[] {
  const perLegS = o.durationS ?? 400;
  let pts: RunPoint[] = [];
  let x = 0;
  let t = T0;
  for (let i = 0; i <= jumps; i++) {
    const leg = trace({ ...o, durationS: perLegS, x0: x, t0: t, seed: 7 + i });
    pts = pts.concat(leg);
    const last = leg[leg.length - 1]!;
    x = ((last.lng - ORIGINE.lng) * RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0) + DRIFT_M;
    t = last.t + DRIFT_S * 1000;
  }
  return pts;
}

// ════════════════════════════════════════════════════════════════════════════
// LE CAS NORMAL
// ════════════════════════════════════════════════════════════════════════════

Deno.test('une course propre passe, et son score de suspicion est nul', () => {
  const pts = trace();
  const r = scoreRun({ points: pts, now: afterEnd(pts) });
  assertEgal(r.decision, 'PASS', 'une sortie ordinaire ne doit rien déclencher');
  assertEgal(r.suspicion, 0, 'aucun signal ne doit être positif sur une trace propre');
  assertEgal(r.reasons, [], 'aucune raison ne doit être listée');
  assertEgal(r.excludedSegmentCount, 0, 'aucun segment exclu');
});

Deno.test('marcher n’est pas tricher : une allure LENTE ne lève aucun soupçon', () => {
  // 12:00/km — au-delà de l'allure max §3.2, donc `validateRun` la refusera
  // comme règle de JEU. L'anti-triche, lui, n'a rien à dire : accuser quelqu'un
  // de marcher serait le pire faux positif possible.
  const pts = trace({ paceSKm: 720 });
  const r = scoreRun({ points: pts, now: afterEnd(pts) });
  assertEgal(signal(r, 'distance_time_ratio').severity, 0, 'la lenteur n’est pas un signal');
  assertEgal(r.decision, 'PASS', 'une sortie lente reste PASS côté anti-triche');
});

// ════════════════════════════════════════════════════════════════════════════
// §11.3 — LES QUATRE MARCHES
// ════════════════════════════════════════════════════════════════════════════

Deno.test('UN signal FAIBLE seul ⇒ PASS (jamais de sanction sur un indice isolé)', () => {
  // 40 % des points au-delà de la précision admise : c'est un vrai signal, il
  // est mesuré, il est faible. Il ne doit produire aucune conséquence.
  const pts = trace().map((p, i) =>
    i % 5 < 2 ? { ...p, acc: POINT_MAX_ACCURACY_M + 15 } : p,
  );
  const r = scoreRun({ points: pts, now: afterEnd(pts) });
  const acc = signal(r, 'gps_accuracy');
  assert(acc.available, 'la précision doit être mesurée');
  assert(acc.severity > 0.3 && acc.severity < 0.5, `sévérité attendue ~0,4 (obtenu ${acc.severity})`);
  assert(
    r.suspicion < ANTICHEAT_REVIEW_AT,
    `un signal faible seul doit rester sous le seuil de revue (score ${r.suspicion})`,
  );
  assertEgal(r.decision, 'PASS', 'un seul signal faible ne déclenche RIEN');
});

Deno.test('PLUSIEURS signaux modérés ⇒ MANUAL_REVIEW, sans qu’aucun ne soit fort', () => {
  // Quatre signaux réels, tous MODÉRÉS : précision dégradée, trace coupée trois
  // fois, podomètre à moitié cohérent, horloge d'appareil en avance sur la
  // seconde moitié de la sortie. Aucun ne suffirait ; ensemble, ils demandent
  // une revue. C'est exactement la différence entre un scoring pondéré et un OU.
  const base = traceAvecSauts(3, { acc: POINT_MAX_ACCURACY_M + 20 });
  // 75 % de points imprécis (le reste redevient propre).
  const pts = base.map((p, i) => (i % 4 === 0 ? { ...p, acc: 8 } : p));
  // Podomètre à 0,15 pas/m ⇒ motionTrust 30 ⇒ sévérité 0,7 (calibré sur la
  // distance RÉELLEMENT retenue, pour ne pas dépendre du jitter).
  const stepCount = Math.round(0.15 * keptDistanceM(pts));
  // `now` placé au MILIEU de la sortie : la seconde moitié des points tombe
  // au-delà de la tolérance d'horloge.
  const tMin = Math.min(...pts.map((p) => p.t));
  const tMax = Math.max(...pts.map((p) => p.t));
  const now = tMin + (tMax - tMin) / 2;

  const r = scoreRun({ points: pts, stepCount, now });

  assertEgal(r.decision, 'MANUAL_REVIEW', 'la convergence doit demander une revue');
  const forts = r.signals.filter(
    (s) => s.available && ANTICHEAT_SIGNAL_SPECS[s.id].soloEscalates && s.severity >= ANTICHEAT_STRONG_SEVERITY,
  );
  assertEgal(
    forts.map((s) => s.id),
    [],
    'AUCUN signal ne doit être fort à lui seul : c’est la convergence qui décide',
  );
  assert(
    r.suspicion >= ANTICHEAT_REVIEW_AT,
    `le score pondéré doit franchir le seuil de revue (obtenu ${r.suspicion})`,
  );
  assert(r.reasons.length >= 3, `au moins trois signaux doivent être cités (${r.reasons.join(', ')})`);
});

Deno.test('UN signal FORT seul ⇒ MANUAL_REVIEW, et JAMAIS un refus', () => {
  // Trace rejouée à l'identique : l'empreinte de la sortie figure déjà parmi
  // celles du joueur. Signal fort — mais deux boucles du même parcours se
  // ressemblent, donc on demande une revue, on ne condamne pas.
  const pts = trace();
  const empreinte = traceFingerprint(pts);
  const r = scoreRun({
    points: pts,
    now: afterEnd(pts),
    priorTraceFingerprints: [empreinte, 'deadbeef'],
  });
  assertEgal(signal(r, 'duplicate_trace').severity, 1, 'le rejeu doit être détecté');
  assertEgal(r.decision, 'MANUAL_REVIEW', 'un signal fort seul demande une revue');
  assert(
    r.suspicion < ANTICHEAT_REVIEW_AT,
    `preuve que c’est la règle « fort seul » qui a joué, pas le score (${r.suspicion})`,
  );
});

Deno.test('UN signal MASSIF et décisif ⇒ REJECT, alors même que le score reste bas', () => {
  // 90 km/h SOUTENUS sur cinq minutes : ce n'est pas un pic de satellite, c'est
  // un véhicule. Le score pondéré, lui, reste modeste (la moitié des signaux
  // devient indisponible faute de points retenus) — ce test prouve donc que le
  // refus vient de la règle DÉCISIVE et non d'une accumulation.
  const pts: RunPoint[] = [];
  for (let s = 0; s <= 300; s += 2) pts.push(pointEst(25 * s, T0 + s * 1000, 8));
  const r = scoreRun({ points: pts, now: afterEnd(pts) });

  const vitesse = signal(r, 'sustained_speed');
  assertEgal(vitesse.severity, 1, 'toute la durée est au-dessus de la borne');
  assert(ANTICHEAT_SIGNAL_SPECS.sustained_speed.decisive, 'la vitesse soutenue est le signal décisif');
  assertEgal(r.decision, 'REJECT', 'un signal décisif au maximum refuse la sortie');
  assert(
    r.suspicion < ANTICHEAT_REJECT_AT,
    `preuve que c’est la règle décisive qui a joué, pas le cumul (${r.suspicion})`,
  );
});

Deno.test('anomalie BORNÉE à un segment ⇒ PASS_WITH_EXCLUSIONS', () => {
  // Une course normale, une longue pause qui se termine 300 m plus loin, puis
  // un retour au calme à 13:00/km : ce dernier segment sort des bornes d'allure
  // du claim (§3.2) et n'est pas capturé. Le reste de la sortie l'est.
  const a = trace({ durationS: 600 });
  const dernier = a[a.length - 1]!;
  const xA = (dernier.lng - ORIGINE.lng) * RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0;
  const b = trace({
    paceSKm: SEGMENT_PACE_MAX_S_KM + 60,
    durationS: 400,
    x0: xA + DRIFT_M,
    t0: dernier.t + DRIFT_S * 1000,
    seed: 99,
  });
  const pts = a.concat(b);
  const r = scoreRun({ points: pts, now: afterEnd(pts) });

  assert(r.excludedSegmentCount >= 1, 'au moins un segment doit être écarté du claim');
  assert(
    r.suspicion < ANTICHEAT_REVIEW_AT,
    `rien de global ne doit être suspect (score ${r.suspicion})`,
  );
  assertEgal(r.decision, 'PASS_WITH_EXCLUSIONS', 'l’anomalie est localisée, pas globale');
  assert(creditsCapture(r.decision), 'une exclusion partielle crédite quand même la capture');
});

// ════════════════════════════════════════════════════════════════════════════
// L'ABSENCE DE SIGNAL N'EST PAS UNE INFORMATION
// ════════════════════════════════════════════════════════════════════════════

Deno.test('un signal INDISPONIBLE sort du dénominateur : il n’accuse ni n’innocente', () => {
  const propre = trace();
  const sansAcc = propre.map(({ acc: _acc, ...p }) => p as RunPoint);

  const avec = scoreRun({ points: propre, now: afterEnd(propre) });
  const sans = scoreRun({ points: sansAcc, now: afterEnd(sansAcc) });

  const s = signal(sans, 'gps_accuracy');
  assertEgal(s.available, false, 'sans `acc`, le signal n’est pas calculable');
  assertEgal(s.severity, 0, 'un signal indisponible ne porte aucune sévérité');
  assert((s.unavailableReason ?? '').length > 10, 'l’indisponibilité doit être EXPLIQUÉE');
  assertEgal(avec.suspicion, sans.suspicion, 'le score ne doit pas bouger d’un iota');
});

Deno.test('podomètre absent ⇒ signal indisponible, pas « propre »', () => {
  const pts = trace();
  const s = signal(scoreRun({ points: pts, now: afterEnd(pts) }), 'step_coherence');
  assertEgal(s.available, false, 'aucun stepCount ⇒ indisponible');
  assert((s.unavailableReason ?? '').includes('stepCount'), 'la raison doit nommer la donnée absente');
});

Deno.test('antécédents FOURNIS mais vides ⇒ signal disponible et négatif', () => {
  // La nuance qui compte : `undefined` (« je n'ai pas regardé ») et `[]` (« j'ai
  // regardé, il n'y a rien ») ne sont pas le même état.
  const pts = trace();
  const rien = signal(scoreRun({ points: pts, now: afterEnd(pts) }), 'duplicate_trace');
  const vide = signal(
    scoreRun({ points: pts, now: afterEnd(pts), priorTraceFingerprints: [] }),
    'duplicate_trace',
  );
  assertEgal(rien.available, false, 'sans antécédents fournis : indisponible');
  assertEgal(vide.available, true, 'avec une liste vide : disponible');
  assertEgal(vide.severity, 0, 'aucun antécédent ⇒ sévérité nulle');
});

Deno.test('chaque signal INDISPONIBLE porte toujours une raison lisible', () => {
  // Trace minuscule : presque tout devient indisponible. Aucun de ces cas ne
  // doit sortir muet — un opérateur doit savoir ce que le système n'a pas vu.
  const pts = [pointEst(0, T0), pointEst(5, T0 + 3000)];
  const r = scoreRun({ points: pts, now: afterEnd(pts) });
  for (const s of r.signals) {
    if (s.available) continue;
    assert(
      typeof s.unavailableReason === 'string' && s.unavailableReason.length > 10,
      `signal ${s.id} indisponible SANS raison`,
    );
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SIGNAUX PRIS UN À UN
// ════════════════════════════════════════════════════════════════════════════

Deno.test('une trace TROP RÉGULIÈRE est repérée, une trace humaine ne l’est pas', () => {
  const synthetique = trace({ jitter: 0 });
  const humaine = trace({ jitter: 0.3 });
  const sSynth = signal(scoreRun({ points: synthetique, now: afterEnd(synthetique) }), 'trace_regularity');
  const sHum = signal(scoreRun({ points: humaine, now: afterEnd(humaine) }), 'trace_regularity');
  // > 0,99 et non « = 1 » : la haversine laisse une poussière flottante (CV de
  // l'ordre de 1e-11) même sur une trace strictement constante. Exiger l'égalité
  // exacte ferait échouer un test qui a raison.
  assert(sSynth.severity > 0.99, `vitesse constante ⇒ sévérité maximale (obtenu ${sSynth.severity})`);
  assertEgal(sHum.severity, 0, 'une allure vivante ne doit rien déclencher');
  assert(
    (sHum.evidence.speedCv ?? 0) > ANTICHEAT_HUMAN_MIN_SPEED_CV,
    'la dispersion humaine doit dépasser le plancher',
  );
});

Deno.test('les sauts GPS se comptent, et saturent au seuil déclaré', () => {
  const deux = traceAvecSauts(2);
  const beaucoup = traceAvecSauts(ANTICHEAT_JUMPS_SEVERE + 2, { durationS: 200 });
  assertEgal(signal(scoreRun({ points: deux, now: afterEnd(deux) }), 'gps_jumps').evidence.jumps, 2, 'deux dérives = deux sauts');
  assertEgal(
    signal(scoreRun({ points: beaucoup, now: afterEnd(beaucoup) }), 'gps_jumps').severity,
    1,
    'au-delà du seuil, la sévérité sature à 1 (jamais au-dessus)',
  );
});

Deno.test('horloge d’appareil en avance : signal levé, mais AUCUN refus automatique', () => {
  // Une horloge fausse n'est pas de la triche. Le système le dit — il refuse de
  // créditer, il ne condamne pas.
  const pts = trace();
  const r = scoreRun({ points: pts, now: T0 - 3_600_000 });
  assertEgal(signal(r, 'future_timestamps').severity, 1, 'toute la trace est dans le futur');
  assertEgal(ANTICHEAT_SIGNAL_SPECS.future_timestamps.decisive, false, 'ce signal n’est pas décisif');
  assertEgal(r.decision, 'MANUAL_REVIEW', 'revue, pas refus');
});

Deno.test('le temps est INJECTÉ : seul `now` fait bouger l’horodatage', () => {
  const pts = trace();
  const a = scoreRun({ points: pts, now: afterEnd(pts) });
  const b = scoreRun({ points: pts, now: afterEnd(pts) + 10_000_000 });
  assertEgal(a.suspicion, b.suspicion, 'un `now` plus tardif ne change rien à une trace passée');
  assertEgal(signal(a, 'future_timestamps').severity, 0, 'rien dans le futur');
});

Deno.test('scoreRun est DÉTERMINISTE : deux appels identiques, deux rapports identiques', () => {
  const pts = trace();
  const now = afterEnd(pts);
  assertEgal(
    scoreRun({ points: pts, now, priorTraceFingerprints: [] }),
    scoreRun({ points: pts, now, priorTraceFingerprints: [] }),
    'le moteur ne doit dépendre d’aucun état',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// EMPREINTE DE TRACE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('l’empreinte ignore l’ORDRE des points et distingue deux parcours', () => {
  const pts = trace();
  const melangee = [...pts].reverse();
  assertEgal(
    traceFingerprint(melangee),
    traceFingerprint(pts),
    'les points sont triés avant empreinte : un payload désordonné donne la même trace',
  );
  const autre = trace({ seed: 1234 });
  assert(
    traceFingerprint(autre) !== traceFingerprint(pts),
    'deux parcours différents ne doivent pas partager une empreinte',
  );
  assertEgal(traceFingerprint([]), 'empty', 'une trace vide se nomme, elle ne hache pas du vide');
});

// ════════════════════════════════════════════════════════════════════════════
// CONTRAT DE SORTIE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('§11.1 — les signaux NON collectés sont nommés et justifiés', () => {
  assert(ANTICHEAT_SIGNALS_NOT_COLLECTED.length >= 6, 'la liste ne doit pas se vider en silence');
  for (const s of ANTICHEAT_SIGNALS_NOT_COLLECTED) {
    assert(s.signal.length > 0, 'un signal sans nom');
    assert(s.reason.length > 30, `« ${s.signal} » : la raison doit expliquer, pas étiqueter`);
  }
  const noms = ANTICHEAT_SIGNALS_NOT_COLLECTED.map((s) => s.signal).join(' ');
  for (const attendu of ['gyroscope', 'baromètre', 'cadence']) {
    assert(noms.includes(attendu), `« ${attendu} » doit être nommé comme non collecté`);
  }
});

Deno.test('le rapport porte l’origine déclarée sans jamais la scorer', () => {
  const pts = trace();
  const gps = scoreRun({ points: pts, source: 'gps', now: afterEnd(pts) });
  const hk = scoreRun({ points: pts, source: 'healthkit', now: afterEnd(pts) });
  assertEgal(gps.source, 'gps', 'l’origine est reportée telle quelle');
  assertEgal(hk.source, 'healthkit', 'l’origine est reportée telle quelle');
  assertEgal(gps.suspicion, hk.suspicion, 'AUCUNE origine n’est suspecte en soi');
  assertEgal(scoreRun({ points: pts, now: afterEnd(pts) }).source, null, 'origine absente ⇒ null, pas un repli');
});

Deno.test('les deux lectures d’une décision sont cohérentes avec §11.3', () => {
  assertEgal(
    (['PASS', 'PASS_WITH_EXCLUSIONS', 'MANUAL_REVIEW', 'REJECT'] as const).map(creditsCapture),
    [true, true, false, false],
    'seules les deux premières décisions créditent une capture',
  );
  assertEgal(
    (['PASS', 'PASS_WITH_EXCLUSIONS', 'MANUAL_REVIEW', 'REJECT'] as const).map(needsHumanReview),
    [false, false, true, false],
    'seul MANUAL_REVIEW demande un humain — un REJECT ouvre un APPEL, ce n’est pas la même file',
  );
});
