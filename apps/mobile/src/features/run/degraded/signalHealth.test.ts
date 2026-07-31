/**
 * GRYD — E24 : un test par TRANSITION et par CAS DÉGRADÉ, plus la garantie qui
 * compte vraiment.
 *
 * Les tests du bas ne testent PAS ce module : ils testent le VRAI pipeline
 * (`engine/gps.ts` + `traceSample.ts`) sur une trace trouée, et vérifient
 * qu'aucune position n'est fabriquée pour lisser le trou. C'est délibéré. Une
 * interpolation ne serait pas un défaut d'affichage : elle finirait dans un
 * payload `ingest_run`, donc dans un verdict de capture — du territoire pris à
 * quelqu'un sur la foi d'un point que personne n'a mesuré. Ce fichier est
 * l'endroit où cette ligne est gardée, parce que c'est ici qu'on décrit le trou.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GPS_ACCURACY_MAX_M, GPS_SIGNAL_LOST_AFTER_S } from '@klaim/shared';
import {
  cleanTrace,
  type RawFix,
  smoothTrace,
  totalDistanceM,
} from '../gps/engine/gps.ts';
import { splitAndSampleAtGaps } from '../gps/traceSample.ts';
import {
  describeSignal,
  type SignalHealth,
  type SignalInput,
  stepInterruptionTelemetry,
} from './signalHealth.ts';

function input(over: Partial<SignalInput> = {}): SignalInput {
  return {
    pausedByUser: false,
    permissionRevoked: false,
    awaitingFirstFix: false,
    firstFixOverdue: false,
    signal: 'ok',
    ...over,
  };
}

// ══ « DÉGRADÉ » ET « PERDU » NE SONT PAS LE MÊME FAIT ══════════════════════

Deno.test('GPS FAIBLE : l’activité CONTINUE de s’enregistrer (le cœur d’E24)', () => {
  const m = describeSignal(input({ signal: 'weak' }));
  assertEquals(m.health, 'degraded');
  assertEquals(m.recording, true);
  assertEquals(m.leavesGap, false);
});

Deno.test('SIGNAL PERDU : on n’enregistre plus, et la trace aura un TROU', () => {
  const m = describeSignal(input({ signal: 'lost' }));
  assertEquals(m.health, 'lost');
  assertEquals(m.recording, false);
  assertEquals(m.leavesGap, true);
});

Deno.test('« dégradé » et « perdu » ne se confondent jamais', () => {
  const faible = describeSignal(input({ signal: 'weak' }));
  const perdu = describeSignal(input({ signal: 'lost' }));
  assert(faible.health !== perdu.health);
  assert(faible.recording !== perdu.recording);
});

// ══ LECTURE EN COURS ≠ ÉCHEC ═══════════════════════════════════════════════

Deno.test('avant la première position : LECTURE EN COURS, jamais « perdu »', () => {
  const m = describeSignal(input({ awaitingFirstFix: true, signal: 'lost' }));
  assertEquals(m.health, 'measuring');
  // On n'a rien perdu — on n'a jamais rien eu : il n'y a pas de trace à trouer.
  assertEquals(m.leavesGap, false);
});

Deno.test('attente qui DURE : « rien n’arrive » — toujours pas « perdu »', () => {
  const m = describeSignal(
    input({ awaitingFirstFix: true, firstFixOverdue: true, signal: 'lost' }),
  );
  assertEquals(m.health, 'never_received');
  assertEquals(m.leavesGap, false);
});

Deno.test('les six états ont six noms DISTINCTS (aucune image partagée)', () => {
  const seen = new Set<SignalHealth>([
    describeSignal(input({ pausedByUser: true })).health,
    describeSignal(input({ permissionRevoked: true })).health,
    describeSignal(input({ awaitingFirstFix: true })).health,
    describeSignal(input({ awaitingFirstFix: true, firstFixOverdue: true })).health,
    describeSignal(input({ signal: 'lost' })).health,
    describeSignal(input({ signal: 'weak' })).health,
  ]);
  assertEquals(seen.size, 6);
});

// ══ CAS DÉGRADÉS DE PRIORITÉ ═══════════════════════════════════════════════

Deno.test('DÉGRADÉ : en pause manuelle, aucune panne n’est inventée', () => {
  const m = describeSignal(input({ pausedByUser: true, signal: 'lost' }));
  assertEquals(m.health, 'suspended');
  assertEquals(m.leavesGap, false);
});

Deno.test('DÉGRADÉ : permission coupée prime sur la perte de signal (cause différente)', () => {
  const m = describeSignal(input({ permissionRevoked: true, signal: 'lost' }));
  assertEquals(m.health, 'revoked');
  assertEquals(m.leavesGap, true);
});

Deno.test('DÉGRADÉ : la pause manuelle prime même sur la permission coupée', () => {
  // Le joueur a choisi de s'arrêter ; l'accident est annoncé ailleurs
  // (GpsSignalPill / selectLiveNotice), pas en réécrivant son geste.
  assertEquals(
    describeSignal(input({ pausedByUser: true, permissionRevoked: true })).health,
    'suspended',
  );
});

// ══ TÉLÉMÉTRIE : SUR TRANSITION, JAMAIS PAR SECONDE ════════════════════════

Deno.test('aucun event tant que l’état ne change pas (1 Hz, GPS actif, batterie)', () => {
  const all: SignalHealth[] = [
    'suspended', 'revoked', 'measuring', 'never_received', 'lost', 'degraded', 'ok',
  ];
  for (const s of all) assertEquals(stepInterruptionTelemetry(s, s), null);
});

Deno.test('ok → perdu = un accident nommé', () => {
  assertEquals(stepInterruptionTelemetry('ok', 'lost'), 'signal_lost');
});

Deno.test('dégradé → perdu = un accident (le signal faible n’en était pas un)', () => {
  assertEquals(stepInterruptionTelemetry('degraded', 'lost'), 'signal_lost');
});

Deno.test('ok → dégradé n’est PAS un accident : rien n’est interrompu', () => {
  assertEquals(stepInterruptionTelemetry('ok', 'degraded'), null);
});

Deno.test('mesure en cours → jamais reçue n’est PAS une interruption', () => {
  // Rien n'a été interrompu : rien n'avait commencé.
  assertEquals(stepInterruptionTelemetry('measuring', 'never_received'), null);
});

Deno.test('perdu → permission coupée compte comme un NOUVEL accident', () => {
  assertEquals(stepInterruptionTelemetry('lost', 'revoked'), 'permission_revoked');
});

Deno.test('la récupération (perdu → ok) n’émet aucun accident', () => {
  assertEquals(stepInterruptionTelemetry('lost', 'ok'), null);
  assertEquals(stepInterruptionTelemetry('revoked', 'ok'), null);
});

// ══════════════════════════════════════════════════════════════════════════
// LA GARANTIE : UN TROU EST DIT, JAMAIS COMBLÉ
// (tests sur le VRAI pipeline — engine/gps.ts + traceSample.ts)
// ══════════════════════════════════════════════════════════════════════════

const M_PER_DEG_LAT = 111_320;
/** Vitesse plausible à pied, largement au-dessus du rayon de jitter en 10 s. */
const SPEED_MPS = 4;

/**
 * Une sortie coupée en deux par un tunnel : 10 positions à 1 Hz, PLUS AUCUNE
 * pendant un silence supérieur à `GPS_SIGNAL_LOST_AFTER_S`, puis 10 de nouveau.
 * Le coureur a bel et bien avancé pendant le silence — mais personne ne l'a
 * mesuré, et c'est exactement ce que la trace doit refléter.
 */
function tracedAcrossTunnel(): { fixes: RawFix[]; silenceS: number } {
  const silenceS = GPS_SIGNAL_LOST_AFTER_S * 4;
  const fixes: RawFix[] = [];
  const t0 = 1_700_000_000_000;
  let meters = 0;
  for (let i = 0; i < 10; i++) {
    fixes.push({
      lat: 48.85 + meters / M_PER_DEG_LAT,
      lng: 2.35,
      ts: t0 + i * 1_000,
      accuracy: 8,
    });
    meters += SPEED_MPS;
  }
  // LE SILENCE. Aucun fix n'est produit — et surtout aucun n'est inventé.
  meters += SPEED_MPS * silenceS;
  for (let i = 0; i < 10; i++) {
    fixes.push({
      lat: 48.85 + meters / M_PER_DEG_LAT,
      lng: 2.35,
      ts: t0 + (10 + silenceS + i) * 1_000,
      accuracy: 8,
    });
    meters += SPEED_MPS;
  }
  return { fixes, silenceS };
}

Deno.test('AUCUNE position n’est fabriquée pour combler le trou', () => {
  const { fixes } = tracedAcrossTunnel();
  const clean = cleanTrace(fixes, 'run');
  // Rien n'est ajouté : le nettoyage ne peut que garder ou rejeter.
  assert(clean.points.length <= fixes.length);
  // Et chaque point gardé EXISTE dans l'entrée, à l'horodatage près.
  const sourceTs = new Set(fixes.map((f) => f.ts));
  for (const p of clean.points) assert(sourceTs.has(p.ts), `point inventé à ts=${p.ts}`);
  // Le lissage repondère, il ne peuple pas.
  assertEquals(smoothTrace(clean.points).length, clean.points.length);
});

Deno.test('le trou est MARQUÉ (gapBefore), pas rebouché', () => {
  const { fixes } = tracedAcrossTunnel();
  const points = cleanTrace(fixes, 'run').points;
  const gaps = points.filter((p) => p.gapBefore === true);
  assertEquals(gaps.length, 1);
});

Deno.test('la distance ne compte JAMAIS les mètres du silence', () => {
  const { fixes, silenceS } = tracedAcrossTunnel();
  const points = cleanTrace(fixes, 'run').points;
  const measured = totalDistanceM(points);
  const traversedUnmeasured = SPEED_MPS * silenceS;
  // Le trou vaut à lui seul bien plus que tout le reste : s'il était compté,
  // la distance exploserait. Elle reste sous ce que le silence représente.
  assert(
    measured < traversedUnmeasured,
    `distance ${measured} m : le trou de ${traversedUnmeasured} m a été compté`,
  );
});

Deno.test('la trace affichée est COUPÉE en deux tronçons mesurés (planche E07)', () => {
  const { fixes } = tracedAcrossTunnel();
  const points = smoothTrace(cleanTrace(fixes, 'run').points);
  const segments = splitAndSampleAtGaps(points, 240);
  assertEquals(segments.length, 2);
  // Ce qui sépare les deux tronçons n'a jamais été mesuré : il n'y a AUCUN
  // point entre eux, donc rien à peindre en trait plein.
  for (const seg of segments) assert(seg.length >= 2);
});

Deno.test('un fix illisible est REJETÉ, jamais remplacé par une estimation', () => {
  const t0 = 1_700_000_000_000;
  const fixes: RawFix[] = [
    { lat: 48.85, lng: 2.35, ts: t0, accuracy: 8 },
    // Précision hors bornes : inexploitable. Le pipeline le jette.
    { lat: 48.86, lng: 2.35, ts: t0 + 1_000, accuracy: GPS_ACCURACY_MAX_M + 1 },
    { lat: 48.85 + 8 / M_PER_DEG_LAT, lng: 2.35, ts: t0 + 2_000, accuracy: 8 },
  ];
  const clean = cleanTrace(fixes, 'run');
  assertEquals(clean.rejected.accuracy, 1);
  assertEquals(clean.points.length, 2);
  assert(!clean.points.some((p) => p.accuracy > GPS_ACCURACY_MAX_M));
});
