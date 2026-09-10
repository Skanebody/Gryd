/**
 * GRYD — tests de `motionIntegrity.ts` ET de son effet RÉEL sur le payload
 * d'ingestion (anti-triche 2026, cahier §18.4).
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ══════════════════════════════════════════
 * `buildIngestPayload` n'envoyait `stepCount` que s'il était STRICTEMENT
 * positif. « Aucun podomètre sur cet appareil » et « un podomètre a tourné
 * pendant 12 km sans compter un seul pas » arrivaient donc au serveur sous la
 * MÊME forme : un champ absent. Le second cas est pourtant la signature d'un
 * déplacement non pédestre — le seul fait qu'un téléphone sache opposer à un
 * vélo déclaré « course ». Le test « le podomètre a tourné et n'a compté aucun
 * pas » était rouge avant ce lot (le champ était omis) ; il est vert
 * maintenant.
 *
 * Le drapeau `mocked` d'Android, lui, n'existait NULLE PART dans le dépôt :
 * ni lu, ni transmis, ni stocké.
 */
import {
  mockedLocationForPayload,
  stepCountForPayload,
} from './motionIntegrity';
import { buildIngestPayload, type RunPipelineState } from './gps/runPipeline';
import type { RawFix } from './gps/engine/gps';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

const T0 = Date.UTC(2026, 8, 1, 8, 0, 0);
const ORIGIN = { lat: 49.4431, lng: 1.0993 };
const M_PER_DEG_LNG = (Math.PI / 180) * 6_371_000 * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** Une trace honnête de 10 min à 11 km/h, cadencée à 1 Hz. */
function fixes(count = 600, mocked?: boolean): RawFix[] {
  const out: RawFix[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      lat: ORIGIN.lat,
      lng: ORIGIN.lng + (i * (11 / 3.6)) / M_PER_DEG_LNG,
      ts: T0 + i * 1000,
      accuracy: 5 + (i % 5),
      ...(mocked === undefined ? {} : { mocked }),
    });
  }
  return out;
}

function state(trace: readonly RawFix[]): RunPipelineState {
  return {
    fixes: trace,
    activity: 'run',
    mode: 'conquete',
    startedAt: T0,
    userPausedMs: 0,
    deadMs: 0,
  } as RunPipelineState;
}

// ════════════════════════════════════════════════════════════════════════════
// LE PODOMÈTRE — UNE MESURE, OU RIEN
// ════════════════════════════════════════════════════════════════════════════

Deno.test('podomètre jamais démarré ⇒ AUCUNE valeur (l’absence ne s’invente pas)', () => {
  assertEgal(stepCountForPayload({ sensorRan: false, steps: 0 }), undefined, 'capteur absent');
  // Même un cumul non nul hérité d'ailleurs ne vaut rien si aucun capteur n'a
  // tourné : on n'envoie que ce qui a été mesuré.
  assertEgal(stepCountForPayload({ sensorRan: false, steps: 42 }), undefined, 'capteur absent');
});

Deno.test('ÉTAPE 0 — podomètre qui a tourné et compté ZÉRO pas : la mesure part enfin', () => {
  assertEgal(stepCountForPayload({ sensorRan: true, steps: 0 }), 0, 'zéro mesuré est une mesure');
});

Deno.test('un cumul réel est transmis, arrondi et jamais négatif', () => {
  assertEgal(stepCountForPayload({ sensorRan: true, steps: 4211.6 }), 4212, 'arrondi');
  assertEgal(stepCountForPayload({ sensorRan: true, steps: -3 }), 0, 'jamais négatif');
  assertEgal(stepCountForPayload({ sensorRan: true, steps: Number.NaN }), undefined, 'NaN n’est pas une mesure');
});

Deno.test('ÉTAPE 0 — le payload porte `stepCount: 0` quand le capteur a tourné', () => {
  const sansCapteur = buildIngestPayload(state(fixes()), { clientRunId: 'a', stepCount: 0 });
  assertEgal('stepCount' in sansCapteur, false, 'aucun capteur ⇒ champ absent (inchangé)');

  const avecCapteur = buildIngestPayload(state(fixes()), {
    clientRunId: 'a',
    stepCount: 0,
    stepSensorRan: true,
  });
  assertEgal(avecCapteur.stepCount, 0, 'un zéro MESURÉ doit atteindre le serveur');
});

Deno.test('rétro-compatibilité : sans `stepSensorRan`, le comportement d’avant est exact', () => {
  const sans = buildIngestPayload(state(fixes()), { clientRunId: 'a', stepCount: 0 });
  assertEgal('stepCount' in sans, false, '0 sans drapeau ⇒ omis, comme avant');
  const avec = buildIngestPayload(state(fixes()), { clientRunId: 'a', stepCount: 900 });
  assertEgal(avec.stepCount, 900, 'un cumul positif part, comme avant');
});

// ════════════════════════════════════════════════════════════════════════════
// LA POSITION SIMULÉE — TROIS ÉTATS, ET LA DIFFÉRENCE COMPTE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('aucun relevé ne porte l’information (iOS, navigateur) ⇒ undefined', () => {
  assertEgal(mockedLocationForPayload(fixes(10)), undefined, 'la plateforme n’a rien dit');
  assertEgal(mockedLocationForPayload([]), undefined, 'trace vide');
});

Deno.test('l’appareil répond « non » ⇒ false (une mesure négative est une information)', () => {
  assertEgal(mockedLocationForPayload(fixes(10, false)), false, 'Android a répondu');
});

Deno.test('UN SEUL relevé simulé suffit ⇒ true (une trace à moitié truquée l’est)', () => {
  const trace = fixes(10, false);
  trace[6] = { ...trace[6]!, mocked: true };
  assertEgal(mockedLocationForPayload(trace), true, 'le serveur doit voir la moitié truquée');
});

Deno.test('le drapeau part dans le payload, et seulement quand il existe', () => {
  const muet = buildIngestPayload(state(fixes()), { clientRunId: 'a', stepCount: 0 });
  assertEgal('mockedLocation' in muet, false, 'aucune information ⇒ champ absent');

  const honnete = buildIngestPayload(state(fixes(600, false)), { clientRunId: 'a', stepCount: 0 });
  assertEgal(honnete.mockedLocation, false, 'un « non » mesuré part aussi');

  const simule = buildIngestPayload(state(fixes(600, true)), { clientRunId: 'a', stepCount: 0 });
  assertEgal(simule.mockedLocation, true, 'une position simulée part');
});

Deno.test('le drapeau se lit sur la trace BRUTE, pas sur la trace décimée', () => {
  // Un seul relevé simulé au milieu d'une longue trace : la décimation
  // (Douglas-Peucker) a toutes les chances de l'écarter. Le signal ne doit pas
  // dépendre de ce hasard-là.
  const trace = fixes(600);
  trace[301] = { ...trace[301]!, mocked: true };
  const payload = buildIngestPayload(state(trace), { clientRunId: 'a', stepCount: 0 });
  assertEgal(payload.mockedLocation, true, 'un relevé écarté du payload compte quand même');
  assert(
    payload.points.length < trace.length,
    'la trace envoyée est bien décimée — sinon ce test ne prouve rien',
  );
});
