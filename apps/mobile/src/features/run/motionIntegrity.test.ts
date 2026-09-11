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
  addStepSample2026,
  mockedLocationForPayload,
  openStepWindows2026,
  sealStepWindows2026,
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

// ════════════════════════════════════════════════════════════════════════════
// LES TRANCHES DE PODOMÈTRE (12/09/2026) — CE QUE LE CONTRÔLE DE DISCIPLINE LIT
// ════════════════════════════════════════════════════════════════════════════
//
// ÉTAPE 0 : ces trois fonctions n'existaient pas. Le tracker gardait un CUMUL
// et des échantillons bruts PLAFONNÉS à 240 entrées — sur une sortie d'une
// heure, les premières minutes avaient disparu. Le contrôle de fin, qui oppose
// une cadence à une fenêtre de cinq minutes pouvant tomber n'importe où,
// n'aurait rien vu avant les dernières minutes.

const MINUTE_MS = 60_000;

Deno.test('une tranche ABSENTE n’est pas « zéro pas » : le rangement part vide', () => {
  const ouvert = openStepWindows2026(T0, 0);
  assertEgal(ouvert.windows, [], 'aucune tranche tant qu’aucun relevé n’est arrivé');
  assertEgal(sealStepWindows2026(ouvert, T0, MINUTE_MS), [], 'fermer à l’instant d’ouverture ne crée rien');
});

Deno.test('les pas se rangent dans la tranche de leur horodatage, en DELTAS', () => {
  let state = openStepWindows2026(T0, 0);
  state = addStepSample2026(state, { ts: T0 + 30_000, steps: 80 }, MINUTE_MS);
  state = addStepSample2026(state, { ts: T0 + 59_000, steps: 170 }, MINUTE_MS);
  state = addStepSample2026(state, { ts: T0 + 90_000, steps: 340 }, MINUTE_MS);
  assertEgal(state.windows.length, 2, 'deux minutes traversées, deux tranches');
  assertEgal(state.windows[0]!.steps, 170, 'la première minute porte son CUMUL local');
  assertEgal(state.windows[1]!.steps, 170, 'la seconde ne recompte pas la première');
});

Deno.test('les minutes traversées EN SILENCE s’ouvrent à zéro : c’est une mesure', () => {
  // Le cas exact du vélo : le podomètre tourne et ne compte rien pendant
  // dix minutes. Sans tranches à zéro, ce silence ressemblerait à une absence
  // de capteur — et le contrôle se tairait précisément là où il doit parler.
  let state = openStepWindows2026(T0, 0);
  state = addStepSample2026(state, { ts: T0 + 30_000, steps: 40 }, MINUTE_MS);
  state = addStepSample2026(state, { ts: T0 + 5 * MINUTE_MS + 10_000, steps: 40 }, MINUTE_MS);
  assertEgal(state.windows.length, 6, 'six tranches, de la première à la sixième minute');
  for (let i = 1; i <= 4; i++) {
    assertEgal(state.windows[i]!.steps, 0, `la minute ${i + 1} est mesurée à zéro`);
  }
});

Deno.test('le CUMUL REPRIS d’une sortie rouverte ne devient pas une cadence fantôme', () => {
  // ÉTAPE 0 de ce piège : sans `baseSteps`, le premier relevé d'une reprise
  // (cumul 4 200) aurait produit un delta de 4 200 pas rangé dans la première
  // minute — soit 4 200 pas/min, une cadence qu'aucun humain ne produit.
  let state = openStepWindows2026(T0, 4_200);
  state = addStepSample2026(state, { ts: T0 + 10_000, steps: 4_260 }, MINUTE_MS);
  assertEgal(state.windows[0]!.steps, 60, 'seuls les pas NOUVEAUX sont rangés');
});

Deno.test('un cumul qui REDESCEND (compteur remis à zéro) ne retire jamais de pas', () => {
  let state = openStepWindows2026(T0, 0);
  state = addStepSample2026(state, { ts: T0 + 10_000, steps: 500 }, MINUTE_MS);
  state = addStepSample2026(state, { ts: T0 + 20_000, steps: 10 }, MINUTE_MS);
  assertEgal(state.windows[0]!.steps, 500, 'aucun delta négatif');
});

Deno.test('un relevé ANTÉRIEUR à l’ouverture est ignoré, jamais rangé ailleurs', () => {
  let state = openStepWindows2026(T0, 0);
  state = addStepSample2026(state, { ts: T0 - 60_000, steps: 900 }, MINUTE_MS);
  assertEgal(state.windows, [], 'le capteur n’écoutait pas : on n’invente pas de pas');
});

Deno.test('la fermeture RABOTE la dernière tranche sur l’instant de fin', () => {
  // Sans rabotage, la dernière tranche déborderait dans le futur et la
  // couverture d'une fenêtre serait surévaluée : on jugerait sur du temps qui
  // n'a pas eu lieu.
  let state = openStepWindows2026(T0, 0);
  state = addStepSample2026(state, { ts: T0 + 80_000, steps: 200 }, MINUTE_MS);
  const scelle = sealStepWindows2026(state, T0 + 95_000, MINUTE_MS);
  assertEgal(scelle.length, 2, 'deux tranches');
  assertEgal(scelle[1]!.toT, T0 + 95_000, 'la dernière s’arrête à la fin réelle');
  assert(scelle[0]!.toT === scelle[1]!.fromT, 'les tranches restent contiguës');
});

Deno.test('la fermeture COMPLÈTE le silence final : un arrêt de pas est mesuré', () => {
  let state = openStepWindows2026(T0, 0);
  state = addStepSample2026(state, { ts: T0 + 10_000, steps: 30 }, MINUTE_MS);
  const scelle = sealStepWindows2026(state, T0 + 10 * MINUTE_MS, MINUTE_MS);
  assertEgal(scelle.length, 10, 'dix minutes couvertes, dont neuf en silence');
  assertEgal(scelle[9]!.steps, 0, 'la dernière minute est mesurée à zéro');
});

Deno.test('le rangement est PUR : l’état d’entrée n’est jamais muté', () => {
  const state = openStepWindows2026(T0, 0);
  const avant = JSON.stringify(state);
  addStepSample2026(state, { ts: T0 + 10_000, steps: 50 }, MINUTE_MS);
  sealStepWindows2026(state, T0 + MINUTE_MS, MINUTE_MS);
  assertEgal(JSON.stringify(state), avant, 'aucune mutation en place');
});
