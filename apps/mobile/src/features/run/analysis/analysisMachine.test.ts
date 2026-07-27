/**
 * GRYD — CE QUE L'ÉCRAN D'ANALYSE (E27) N'A PAS LE DROIT DE RACONTER.
 *
 * E27 est l'écran le plus facile à truquer du jeu : le joueur vient de courir,
 * il attend, et il ne peut RIEN vérifier. Ces tests verrouillent les deux
 * interdits :
 *
 *  1. RIEN N'AVANCE SANS FAIT. La machine est déterministe et n'a aucune
 *     horloge : sans `SyncFact`, l'état ne bouge pas d'un pixel. Un test le
 *     prouve en lui donnant la liste vide, et un autre en lui donnant des faits
 *     hors contexte (qui doivent laisser l'état INCHANGÉ).
 *  2. LES ÉCHECS NE SE CONFONDENT NI ENTRE EUX NI AVEC « EN COURS ». Réseau
 *     coupé (en file / pas en file), serveur en erreur, course refusée, pas de
 *     backend, pas de sortie, issue illisible : six situations, six signatures
 *     d'étapes distinctes, aucune marquée « active ».
 *
 * Couverture demandée par le chantier : UN test par transition ET UN par échec.
 */
import { assert, assertEquals, assertStrictEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  ANALYSIS_STEPS,
  type AnalysisPhase,
  type AnalysisState,
  HTTP_STATUS_NONE,
  INITIAL_ANALYSIS_STATE,
  QUEUE_DEPTH_UNKNOWN,
  type SyncFact,
  canRetry,
  doneStepCount,
  factFromFinishVerdict,
  isSettled,
  isWorking,
  reduceAnalysis,
  reduceAnalysisAll,
  stepStatuses,
  visibleSteps,
} from './analysisMachine.ts';

/** Toutes les phases, pour les invariants exhaustifs. */
const ALL_PHASES: readonly AnalysisPhase[] = [
  'securing',
  'secured',
  'uploading',
  'analysing',
  'complete',
  'deferred',
  'unstored',
  'server_error',
  'rejected',
  'no_backend',
  'no_run',
  'unreadable',
];

function at(phase: AnalysisPhase, over: Partial<AnalysisState> = {}): AnalysisState {
  return { ...INITIAL_ANALYSIS_STATE, phase, ...over };
}

// ═══ 1. L'ÉCRAN N'AVANCE QUE SUR UN FAIT ════════════════════════════════════

Deno.test("aucun fait ⇒ aucun mouvement (il n'y a pas d'horloge dans cette machine)", () => {
  const after = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, []);
  assertStrictEquals(after, INITIAL_ANALYSIS_STATE);
  assertEquals(after.phase, 'securing');
});

Deno.test("l'état d'ouverture n'affirme ni file ni statut HTTP", () => {
  assertEquals(INITIAL_ANALYSIS_STATE.queueDepth, QUEUE_DEPTH_UNKNOWN);
  assertEquals(INITIAL_ANALYSIS_STATE.httpStatus, HTTP_STATUS_NONE);
  assertEquals(INITIAL_ANALYSIS_STATE.attempts, 0);
});

Deno.test('un même fait rejoué deux fois ne change rien (idempotence de lecture)', () => {
  const once = reduceAnalysis(INITIAL_ANALYSIS_STATE, { kind: 'local_saved' });
  const twice = reduceAnalysis(once, { kind: 'local_saved' });
  assertStrictEquals(twice, once);
});

// ═══ 2. UN TEST PAR TRANSITION NOMINALE ═════════════════════════════════════

Deno.test('transition — securing → secured (la sortie est à l’abri)', () => {
  const s = reduceAnalysis(INITIAL_ANALYSIS_STATE, { kind: 'local_saved' });
  assertEquals(s.phase, 'secured');
  assertEquals(stepStatuses(s.phase).secure, 'done');
});

Deno.test('transition — secured → uploading (une requête est RÉELLEMENT partie)', () => {
  const s = reduceAnalysis(at('secured'), { kind: 'upload_started' });
  assertEquals(s.phase, 'uploading');
  assertEquals(s.attempts, 1, 'une tentative partie = une tentative comptée');
  assertEquals(stepStatuses(s.phase).upload, 'active');
});

Deno.test('transition — uploading → analysing sur un VRAI accusé de réception', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'server_ack' });
  assertEquals(s.phase, 'analysing');
  const steps = stepStatuses(s.phase);
  assertEquals(steps.upload, 'done');
  assertEquals(steps.analyse, 'active');
});

Deno.test('transition — uploading → complete (la réponse prouve réception ET jugement)', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'server_accepted' });
  assertEquals(s.phase, 'complete');
  assertEquals(doneStepCount(s.phase), 3);
});

Deno.test('transition — analysing → complete', () => {
  const s = reduceAnalysis(at('analysing'), { kind: 'server_accepted' });
  assertEquals(s.phase, 'complete');
});

Deno.test('AUCUNE reprise sur une sortie non stockée : elle n’est pas en file (bouton mort)', () => {
  // Son payload vit dans le buffer de course, hors de portée de cet écran :
  // un « Réessayer » n'aurait rien à renvoyer et échouerait toujours.
  assertEquals(canRetry('unstored'), false);
  const s = at('unstored');
  assertStrictEquals(reduceAnalysis(s, { kind: 'retry_started' }), s);
});

Deno.test('transition — la reprise repart en envoi et INCRÉMENTE les tentatives', () => {
  const s = reduceAnalysis(at('deferred', { attempts: 1 }), { kind: 'retry_started' });
  assertEquals(s.phase, 'uploading');
  assertEquals(s.attempts, 2);
});

Deno.test('transition — deferred → complete quand le renvoi aboutit enfin', () => {
  const s = reduceAnalysisAll(at('deferred', { queueDepth: 2 }), [
    { kind: 'retry_started' },
    { kind: 'server_accepted' },
  ]);
  assertEquals(s.phase, 'complete');
});

Deno.test('parcours nominal complet — trois étapes, dans l’ordre, sans saut', () => {
  const facts: readonly SyncFact[] = [
    { kind: 'local_saved' },
    { kind: 'upload_started' },
    { kind: 'server_accepted' },
  ];
  const seen = facts.reduce<AnalysisPhase[]>(
    (acc, f) => {
      const last = acc[acc.length - 1] as AnalysisPhase;
      return [...acc, reduceAnalysis(at(last), f).phase];
    },
    ['securing'],
  );
  assertEquals(seen, ['securing', 'secured', 'uploading', 'complete']);
});

// ═══ 3. UN TEST PAR ÉCHEC — ET ILS NE SE CONFONDENT PAS ═════════════════════

Deno.test('échec — réseau coupé AVEC file : envoi différé, jamais « en cours »', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'offline_queued', queueDepth: 3 });
  assertEquals(s.phase, 'deferred');
  assertEquals(s.queueDepth, 3, 'la profondeur affichée vient de la file, pas d’un défaut');
  const steps = stepStatuses(s.phase);
  assertEquals(steps.upload, 'waiting', 'attendre un réseau n’est pas échouer');
  assertEquals(steps.analyse, 'pending', 'aucune analyse ne peut avoir commencé');
  assert(!isWorking(s.phase), 'un envoi différé n’est PAS un travail en vol');
});

Deno.test('échec — réseau coupé SANS file (stockage KO) : la sortie n’est pas à l’abri', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'not_stored', reason: 'storage' });
  assertEquals(s.phase, 'unstored');
  assertEquals(stepStatuses(s.phase).secure, 'failed');
});

Deno.test('échec — file au plafond : même phase, mais la file a REFUSÉ, elle n’a rien écrasé', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'not_stored', reason: 'queue_full' });
  assertEquals(s.phase, 'unstored');
});

Deno.test('échec — écriture locale impossible dès l’étape 1', () => {
  const s = reduceAnalysis(INITIAL_ANALYSIS_STATE, { kind: 'local_save_failed' });
  assertEquals(s.phase, 'unstored');
  assertEquals(stepStatuses(s.phase).secure, 'failed');
});

Deno.test('échec — serveur en erreur (500) : panne, PAS un refus de course', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'server_replied_error', httpStatus: 500 });
  assertEquals(s.phase, 'server_error');
  assertEquals(s.httpStatus, 500);
  assert(canRetry(s.phase), 'une panne serveur peut cesser : la reprise a un sens');
});

Deno.test('échec — 429 (rate limit) est une panne PASSAGÈRE, pas un jugement', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'server_replied_error', httpStatus: 429 });
  assertEquals(s.phase, 'server_error');
  assert(canRetry(s.phase));
});

Deno.test('échec — course REFUSÉE (403) : le serveur a jugé, aucune reprise n’est proposée', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'server_replied_error', httpStatus: 403 });
  assertEquals(s.phase, 'rejected');
  assertEquals(s.httpStatus, 403);
  assert(!canRetry(s.phase), 'l’idempotence rendrait le MÊME verdict : bouton mort interdit');
  const steps = stepStatuses(s.phase);
  assertEquals(steps.upload, 'done', 'le serveur a bien reçu — l’envoi n’a pas raté');
  assertEquals(steps.analyse, 'failed');
});

Deno.test('échec — 400 invalid_payload est un refus définitif, comme 403', () => {
  const s = reduceAnalysis(at('uploading'), { kind: 'server_replied_error', httpStatus: 400 });
  assertEquals(s.phase, 'rejected');
});

Deno.test('échec — aucun backend : rien n’est attendu et rien n’est promis', () => {
  const s = reduceAnalysis(at('secured'), { kind: 'no_backend' });
  assertEquals(s.phase, 'no_backend');
  assert(!canRetry(s.phase), 'réessayer sans serveur échouerait TOUJOURS');
  const steps = stepStatuses(s.phase);
  // CORRECTIF 27/07 — l'étape 1 valait `done` (« la sortie est bien sur
  // l'appareil »). Elle ne l'est pas : sans backend, `uploadOrQueue` sort en
  // 'none' AVANT la file et `finish()` purge les clés de la course. Rien
  // n'écrit la sortie sur le disque sur ce chemin.
  assertEquals(steps.secure, 'unavailable', 'rien n’écrit la sortie sur le disque ici');
  assertEquals(steps.upload, 'unavailable', '« à venir » promettrait un envoi qui n’aura pas lieu');
  assertEquals(steps.analyse, 'unavailable');
});

Deno.test('échec — aucune sortie à analyser : on ne peint pas trois étapes vides', () => {
  const s = reduceAnalysis(INITIAL_ANALYSIS_STATE, { kind: 'no_run' });
  assertEquals(s.phase, 'no_run');
  assertEquals(visibleSteps(s.phase), null);
  assertEquals(doneStepCount(s.phase), 0);
});

Deno.test('échec — issue ILLISIBLE : on le dit, on ne devine pas un succès', () => {
  const s = reduceAnalysis(at('secured'), { kind: 'outcome_unreadable' });
  assertEquals(s.phase, 'unreadable');
  assert(canRetry(s.phase), 'une relecture peut aboutir');
  const steps = stepStatuses(s.phase);
  // CORRECTIF 27/07 — l'étape 1 valait `done` (« la sortie existe sur
  // l'appareil, seul fait établi ») : cette phase est justement atteinte file
  // VIDE ou file ILLISIBLE, c'est-à-dire quand personne ne sait où elle est.
  assertEquals(steps.secure, 'unknown', 'on ne sait pas non plus où elle est');
  assertEquals(steps.upload, 'unknown', 'ni « pas encore », ni « raté » : on ne sait pas');
  assertEquals(steps.analyse, 'unknown', 'aucune analyse n’est affirmée');
});

// ═══ 4. LES ÉCHECS NE SE CONFONDENT PAS — INVARIANTS EXHAUSTIFS ═════════════

Deno.test('chaque phase a une signature d’étapes UNIQUE (aucune confusion à l’écran)', () => {
  const seen = new Map<string, AnalysisPhase>();
  for (const phase of ALL_PHASES) {
    const key = ANALYSIS_STEPS.map((id) => `${id}:${stepStatuses(phase)[id]}`).join('|');
    const clash = seen.get(key);
    assertEquals(
      clash,
      undefined,
      `« ${phase} » se lit exactement comme « ${clash} » : deux situations, une seule image`,
    );
    seen.set(key, phase);
  }
});

Deno.test('aucune phase d’échec ne peint une étape « active »', () => {
  const failures: readonly AnalysisPhase[] = [
    'deferred',
    'unstored',
    'server_error',
    'rejected',
    'no_backend',
    'no_run',
    'unreadable',
  ];
  for (const phase of failures) {
    const steps = stepStatuses(phase);
    for (const id of ANALYSIS_STEPS) {
      assert(steps[id] !== 'active', `${phase}/${id} se donne comme en cours alors que rien ne l’est`);
    }
    assert(!isWorking(phase), `${phase} passe pour un travail en vol`);
  }
});

Deno.test('seules les phases en vol sont « working » (rien d’autre n’a le droit d’animer)', () => {
  for (const phase of ALL_PHASES) {
    assertEquals(
      isWorking(phase),
      phase === 'securing' || phase === 'uploading' || phase === 'analysing',
      phase,
    );
  }
});

Deno.test('une étape n’est « done » que si un fait l’atteste (jamais par anticipation)', () => {
  assertEquals(doneStepCount('securing'), 0);
  assertEquals(doneStepCount('secured'), 1);
  assertEquals(doneStepCount('uploading'), 1);
  assertEquals(doneStepCount('analysing'), 2);
  assertEquals(doneStepCount('complete'), 3);
  assertEquals(doneStepCount('deferred'), 1);
});

// ═══ 5. LES PHASES DÉFINITIVES ABSORBENT TOUT ═══════════════════════════════

Deno.test('un verdict rendu ne peut plus être « dé-rendu » par une relecture tardive', () => {
  const done = at('complete');
  for (const fact of [
    { kind: 'offline_queued', queueDepth: 1 },
    { kind: 'not_stored', reason: 'storage' },
    { kind: 'server_replied_error', httpStatus: 500 },
    { kind: 'no_backend' },
    { kind: 'upload_started' },
  ] as const satisfies readonly SyncFact[]) {
    assertStrictEquals(reduceAnalysis(done, fact), done, `${fact.kind} a bougé un verdict rendu`);
  }
});

Deno.test('une course refusée ne repart JAMAIS toute seule en envoi', () => {
  const s = at('rejected', { httpStatus: 403 });
  assertStrictEquals(reduceAnalysis(s, { kind: 'retry_started' }), s);
  assertStrictEquals(reduceAnalysis(s, { kind: 'upload_started' }), s);
});

Deno.test('les phases définitives sont exactement celles qu’on n’a pas le droit de reprendre', () => {
  for (const phase of ALL_PHASES) {
    if (isSettled(phase)) assert(!canRetry(phase), `${phase} propose une reprise impossible`);
  }
  assertEquals(ALL_PHASES.filter(isSettled), ['complete', 'rejected', 'no_backend', 'no_run']);
  assertEquals(ALL_PHASES.filter(canRetry), ['deferred', 'server_error', 'unreadable']);
});

// ═══ 6. FAITS HORS CONTEXTE : L'ÉTAT NE RECULE PAS, NE SAUTE PAS ════════════

Deno.test('un accusé de réception hors envoi est ignoré (il ne prouverait rien)', () => {
  const s = at('secured');
  assertStrictEquals(reduceAnalysis(s, { kind: 'server_ack' }), s);
});

Deno.test('« sortie sécurisée » n’efface pas un envoi déjà en vol (aucun recul d’écran)', () => {
  const s = at('uploading', { attempts: 1 });
  assertStrictEquals(reduceAnalysis(s, { kind: 'local_saved' }), s);
});

Deno.test('une reprise depuis une phase en vol ne gonfle pas le compteur de tentatives', () => {
  const s = at('uploading', { attempts: 1 });
  assertStrictEquals(reduceAnalysis(s, { kind: 'retry_started' }), s);
});

// ═══ 7. PONT AVEC LE VERDICT D'ENVOI DÉJÀ EN PLACE DANS LE DÉPÔT ════════════

Deno.test('le verdict de useRealRunCore se traduit sans réinterprétation', () => {
  assertEquals(factFromFinishVerdict('sent'), { kind: 'server_accepted' });
  assertEquals(factFromFinishVerdict('rejected'), {
    kind: 'server_replied_error',
    httpStatus: 400,
  });
  assertEquals(factFromFinishVerdict('queued', 2), { kind: 'offline_queued', queueDepth: 2 });
  assertEquals(factFromFinishVerdict('lost'), { kind: 'not_stored', reason: 'storage' });
  assertEquals(factFromFinishVerdict('none'), { kind: 'no_backend' });
});

Deno.test('sans profondeur connue, la file est INCONNUE — jamais « 0 en attente »', () => {
  assertEquals(factFromFinishVerdict('queued'), {
    kind: 'offline_queued',
    queueDepth: QUEUE_DEPTH_UNKNOWN,
  });
});

Deno.test('les cinq verdicts d’envoi mènent chacun à une phase DIFFÉRENTE', () => {
  const phases = (['sent', 'rejected', 'queued', 'lost', 'none'] as const).map(
    (v) => reduceAnalysis(at('uploading'), factFromFinishVerdict(v)).phase,
  );
  assertEquals(phases, ['complete', 'rejected', 'deferred', 'unstored', 'no_backend']);
  assertEquals(new Set(phases).size, 5);
});
