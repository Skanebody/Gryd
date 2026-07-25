/**
 * GRYD — E14 : LA DISCIPLINE DESCEND JUSQU'AU NETTOYAGE ET JUSQU'AU SERVEUR.
 *
 * Ces tests verrouillent le défaut GRAVE trouvé en revue adversariale
 * (25/07/2026) : `RunTracker` appelait `cleanTrace(fixes)` et
 * `decimateForPayload(smoothed)` SANS discipline, donc aux bornes de la course
 * à pied (25 km/h, saut 100 m), y compris pour une sortie VÉLO. Tout le socle
 * serveur par discipline était court-circuité EN AMONT : la trace arrivait déjà
 * mutilée, et le cycliste lisait une distance live FAUSSE pendant toute sa
 * sortie.
 *
 * Chacun de ces tests ÉCHOUE si l'on retire la discipline d'un seul des trois
 * points de passage — nettoyage, décimation, déclaration au serveur. Vérifié en
 * les remettant un par un dans l'état d'avant le correctif (cf. rapport).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { activityRules } from '@klaim/shared';
import type { RawFix } from './engine/gps.ts';
import { haversineM } from './engine/validation.ts';
import { buildIngestPayload, computeSnapshot, type RunPipelineState } from './runPipeline.ts';

/** Mètres par degré de latitude (projection locale) — pas une règle de jeu. */
const M_PER_DEG_LAT = 111_195;
const START_LAT = 48.8674; // République, Paris
const START_LNG = 2.3636;
const T0 = 1_700_000_000_000;

/**
 * Trace SYNTHÉTIQUE mais physiquement cohérente : ligne droite plein est, un fix
 * par seconde, à vitesse constante. Aucune approximation d'accuracy (6 m : bon
 * signal), donc le seul motif de rejet possible est la VITESSE — exactement ce
 * qu'on veut isoler.
 */
function straightLine(count: number, speedKmh: number): RawFix[] {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((START_LAT * Math.PI) / 180);
  const speedMps = speedKmh / 3.6;
  const out: RawFix[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      lat: START_LAT,
      lng: START_LNG + (i * speedMps) / mPerDegLng,
      ts: T0 + i * 1_000,
      accuracy: 6,
    });
  }
  return out;
}

function stateOf(fixes: readonly RawFix[], activity: 'run' | 'bike'): RunPipelineState {
  return {
    fixes,
    activity,
    mode: 'conquete',
    startedAt: T0,
    userPausedMs: 0,
    userPausedSinceTs: null,
    finished: false,
  };
}

/** Le scénario de la sonde : 300 fixes à 30 km/h, entre les deux bornes §3.2. */
const BIKE_FIXES = straightLine(300, 30);
const NOW = T0 + 300_000;
/** Distance réellement parcourue par cette trace (299 intervalles d'une seconde). */
const TRUE_DISTANCE_M = (299 * 30) / 3.6;

Deno.test('30 km/h : la borne de VITESSE lue est bien celle de la discipline', () => {
  // Sanity : le scénario n'a de sens que si 30 km/h encadre les deux bornes.
  assert(activityRules('run').pointMaxSpeedKmh < 30, 'la borne course doit être < 30 km/h');
  assert(activityRules('bike').pointMaxSpeedKmh > 30, 'la borne vélo doit être > 30 km/h');
});

Deno.test('sortie VÉLO : la trace est gardée ENTIÈRE et la distance live est vraie', () => {
  const snap = computeSnapshot(stateOf(BIKE_FIXES, 'bike'), NOW);
  // Aucun point sacrifié : les 300 fixes passent les bornes du vélo.
  assertEquals(snap.totalFixes, 300);
  assertEquals(snap.keptPoints, 300);
  // ±1 % de la distance réelle (le lissage pondéré déplace les points à la marge).
  assert(
    Math.abs(snap.distanceM - TRUE_DISTANCE_M) < TRUE_DISTANCE_M * 0.01,
    `distance live ${Math.round(snap.distanceM)} m ≉ ${Math.round(TRUE_DISTANCE_M)} m`,
  );
});

Deno.test('la MÊME trace lue en COURSE est massivement rejetée (le défaut d’origine)', () => {
  // Ce test ne « valide » pas le rejet : il documente le prix EXACT payé quand
  // la discipline ne descend pas — c'est ce que le cycliste voyait.
  const asRun = computeSnapshot(stateOf(BIKE_FIXES, 'run'), NOW);
  const asBike = computeSnapshot(stateOf(BIKE_FIXES, 'bike'), NOW);
  assert(asRun.keptPoints < asBike.keptPoints / 4, 'la lecture course doit mutiler la trace');
  // Et la distance affichée s'effondre : 0 m sur toute la sortie.
  assert(asRun.distanceM < 1, `distance course ${asRun.distanceM} m devrait être ~0`);
  assert(asBike.distanceM > 2_000, 'distance vélo attendue > 2 km');
});

Deno.test('payload : la discipline est DÉCLARÉE au serveur (sinon il rejuge en course)', () => {
  const bike = buildIngestPayload(stateOf(BIKE_FIXES, 'bike'), {
    clientRunId: 'run-uuid',
    stepCount: 0,
  });
  // Sans ce champ, `ingest_run` retombe sur 'run' : nettoyer la trace aux bonnes
  // bornes SANS le dire au serveur reviendrait à n'avoir rien corrigé.
  assertEquals(bike.activity, 'bike');
  assert(bike.points.length > 2, 'un payload vélo doit porter une vraie trace');

  const run = buildIngestPayload(stateOf(straightLine(300, 11), 'run'), {
    clientRunId: 'run-uuid',
    stepCount: 0,
  });
  assertEquals(run.activity, 'run');
});

Deno.test('payload : les CORDES sont re-bornées à la discipline, pas à la course', () => {
  // Troisième point de passage de la discipline, distinct des deux autres :
  // `decimateForPayload` re-découpe les cordes à `pointMaxJumpM` (100 m à pied,
  // 300 m à vélo). Avec la borne course appliquée à une sortie vélo, le payload
  // enfle sans rien apporter — mesure du 25/07/2026 sur 30 km à 30 km/h :
  // 513 points aux bornes course contre 129 aux bornes vélo, soit 4× le budget
  // consommé sur le plafond dur GPS_MAX_PAYLOAD_POINTS (2 000). Une sortie
  // longue finirait par y perdre de la résolution, là où elle en a le plus besoin.
  const payload = buildIngestPayload(stateOf(BIKE_FIXES, 'bike'), {
    clientRunId: 'r',
    stepCount: 0,
  });
  const chords: number[] = [];
  for (let i = 1; i < payload.points.length; i += 1) {
    chords.push(haversineM(payload.points[i - 1]!, payload.points[i]!));
  }
  const maxChord = Math.max(...chords);
  // Jamais au-delà de la corde VÉLO (la borne est bien appliquée).
  assert(
    maxChord <= activityRules('bike').pointMaxJumpM,
    `corde max ${Math.round(maxChord)} m > borne vélo`,
  );
  // Et AU-DELÀ de la corde course : la trace n'a pas été redécoupée à 100 m —
  // c'est ce qui échoue si l'on retire la discipline de la décimation.
  assert(
    maxChord > activityRules('run').pointMaxJumpM,
    `corde max ${Math.round(maxChord)} m : la trace vélo a été re-bornée comme une course`,
  );
});

Deno.test('COURSE À PIED : aucune régression (11 km/h intégralement gardés)', () => {
  const runner = straightLine(300, 11);
  const snap = computeSnapshot(stateOf(runner, 'run'), NOW);
  assertEquals(snap.keptPoints, 300);
  const trueM = (299 * 11) / 3.6;
  assert(
    Math.abs(snap.distanceM - trueM) < trueM * 0.01,
    `distance ${Math.round(snap.distanceM)} m ≉ ${Math.round(trueM)} m`,
  );
});

Deno.test('podomètre absent → stepCount OMIS du payload (motionTrust neutre)', () => {
  const sans = buildIngestPayload(stateOf(BIKE_FIXES, 'bike'), { clientRunId: 'r', stepCount: 0 });
  assertEquals('stepCount' in sans, false);
  const avec = buildIngestPayload(stateOf(BIKE_FIXES, 'bike'), { clientRunId: 'r', stepCount: 42 });
  assertEquals(avec.stepCount, 42);
});

Deno.test('pause MANUELLE en cours : le chrono actif est gelé, jamais négatif', () => {
  const fixes = straightLine(60, 11);
  const paused: RunPipelineState = {
    ...stateOf(fixes, 'run'),
    userPausedSinceTs: T0 + 60_000,
  };
  const at = T0 + 120_000;
  const snap = computeSnapshot(paused, at);
  assertEquals(snap.phase, 'paused-user');
  // 120 s écoulées − 60 s de pause manuelle en cours − les pauses auto détectées.
  assert(snap.activeS <= 60, `activeS ${snap.activeS} devrait être ≤ 60 s`);
  assert(snap.activeS >= 0, 'activeS ne peut pas être négatif');
});
