/**
 * GRYD — tests du TRANSPORT des faits de synchronisation (`syncFactBus.ts`).
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. LE JOURNAL NE PARLE QUE D'UNE SORTIE. C'est le correctif du 27/07/2026 :
 *     le drain de la file (déclenché à chaque retour au premier plan) et la
 *     clôture d'une course écartée versaient leurs faits dans le journal de la
 *     course EN COURS — et `server_accepted` y peignait « analyse terminée » sur
 *     une sortie encore en file. Une progression sans travail derrière.
 *  2. UN OBSERVATEUR NE PEUT PAS FAIRE ÉCHOUER UN ENVOI. Les producteurs sont
 *     les deux chemins d'envoi du produit ; si publier pouvait jeter, une course
 *     pourrait être perdue à cause d'un écran.
 *  3. LE REJEU EST EXACT ET NE COMPTE RIEN DEUX FOIS. `attempts` est un nombre
 *     de départs RÉELS : un fait perdu ou dupliqué le rendrait faux.
 *  4. RIEN NE SURVIT À UNE NOUVELLE COURSE. Un fait périmé rejoué ferait mentir
 *     un écran neuf.
 *
 * L'isolation entre tests est explicite (`beginSyncFactRun` + désabonnements) :
 * le module est un singleton, exactement comme en production.
 */
import { assert, assertEquals, assertStrictEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { DrainReport } from '../../../lib/pendingUploadQueue.ts';
import {
  INITIAL_ANALYSIS_STATE,
  doneStepCount,
  reduceAnalysisAll,
  stepStatuses,
  type SyncFact,
} from './analysisMachine.ts';
import { factsFromDrain, factsFromSnapshot } from './syncFacts.ts';
import {
  MAX_RECORDED_FACTS,
  beginSyncFactRun,
  publishRunSyncFacts,
  publishSyncFact,
  subscribeSyncFacts,
  syncFactLog,
  syncFactRunId,
} from './syncFactBus.ts';

/** La sortie que le joueur regarde, et une autre qui traîne dans la file. */
const MINE = 'run-a-la-une';
const OTHER = 'run-d-hier';

/** Un drain qui a vidé la sortie d'HIER, et rien d'autre (le cas du défaut). */
const REPORT_OTHER_SENT: DrainReport = {
  remaining: [],
  sent: [OTHER],
  rejected: [],
  stoppedBy: 'empty',
};

/** Ouvre le journal au nom de la sortie regardée (état de départ de course). */
function openMine(): void {
  beginSyncFactRun(MINE);
}

/** Publie une suite de faits POUR la sortie regardée. */
function publishMine(facts: readonly SyncFact[]): void {
  publishRunSyncFacts(facts.map((fact) => ({ runId: MINE, fact })));
}

// ═══ 1. LE JOURNAL APPARTIENT À UNE SORTIE, ET À UNE SEULE ══════════════════

Deno.test('LE DÉFAUT CORRIGÉ — le succès d’une AUTRE sortie n’entre pas au journal', () => {
  openMine();
  // Scénario RÉEL : le joueur court, il déverrouille son écran, l'AppState
  // repasse à 'active' (app/_layout.tsx) et le drain vide une course d'hier.
  publishSyncFact({ kind: 'retry_started' }, OTHER);
  publishSyncFact({ kind: 'server_accepted' }, OTHER);
  assertEquals(syncFactLog(), []);

  // Puis SA course finit hors ligne : elle part en file, et c'est tout ce que
  // l'écran doit apprendre.
  publishMine([{ kind: 'upload_started' }, { kind: 'offline_queued', queueDepth: 2 }]);
  const state = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, syncFactLog());
  assertEquals(state.phase, 'deferred');
  // Avant le correctif : 'complete', et `isSettled` rendait l'erreur définitive.
  assert(state.phase !== 'complete', 'E27 annonce « analysée » sur la course de quelqu’un d’autre');
});

Deno.test('LE DÉFAUT CORRIGÉ — la course ÉCARTÉE ne raconte rien de la course en cours', () => {
  // `discardStored` (bouton « Ignorer » de la carte de reprise) envoie la course
  // interrompue PENDANT la course en cours, via le même `uploadOrQueue`.
  openMine();
  publishSyncFact({ kind: 'upload_started' }, OTHER);
  publishSyncFact({ kind: 'server_accepted' }, OTHER);
  assertEquals(syncFactLog(), []);
  assertEquals(reduceAnalysisAll(INITIAL_ANALYSIS_STATE, syncFactLog()), INITIAL_ANALYSIS_STATE);
});

Deno.test('`retry_started` d’une AUTRE entrée n’allume pas l’étape 2 de cette sortie', () => {
  // Le drain publie une tentative PAR ENTRÉE. Une sortie en file ne doit pas
  // afficher « envoi en cours » parce que la file traite l'entrée d'à côté.
  openMine();
  publishMine([{ kind: 'upload_started' }, { kind: 'offline_queued', queueDepth: 3 }]);
  const live: SyncFact[] = [];
  const sub = subscribeSyncFacts((f) => live.push(f));
  publishSyncFact({ kind: 'retry_started' }, OTHER);
  assertEquals(live, [], 'un abonné a reçu le départ d’une autre sortie');
  assertEquals(
    reduceAnalysisAll(INITIAL_ANALYSIS_STATE, syncFactLog()).phase,
    'deferred',
    'l’étape 2 est passée « en cours » sans qu’un travail parte POUR cette sortie',
  );
  // Et quand c'est SON entrée qui part, l'étape 2 s'allume pour de vrai.
  publishSyncFact({ kind: 'retry_started' }, MINE);
  assertEquals(reduceAnalysisAll(INITIAL_ANALYSIS_STATE, syncFactLog()).phase, 'uploading');
  sub.unsubscribe();
});

Deno.test('LE SCÉNARIO COMPLET DE E27 — trois étapes « terminé » sur une sortie EN FILE', () => {
  // Reproduction EXACTE de ce que fait `app/course/analyse.tsx` sur le chemin
  // nominal : rejeu du journal depuis l'état initial (l.260-262), puis
  // observation du monde pliée PAR-DESSUS (l.266). Avec le journal anonyme, ce
  // fold rendait { phase: 'complete' } et `stepStatuses` peignait secure/upload/
  // analyse tous les trois `done` — pour une course qui dormait dans la file, et
  // sans recours possible (`complete` est `isSettled`, plus rien ne la corrige).
  openMine();
  // 1. Le joueur déverrouille son écran EN COURSE : le drain part (_layout.tsx)
  //    et vide une entrée d'HIER. Le serveur l'accepte.
  publishRunSyncFacts(factsFromDrain(REPORT_OTHER_SENT));
  // 2. Sa course à lui finit hors ligne : elle entre en file.
  publishSyncFact({ kind: 'upload_started' }, MINE);
  publishSyncFact({ kind: 'offline_queued', queueDepth: 1 }, MINE);

  // 3. E27 s'ouvre : rejeu du journal, puis lecture du monde par-dessus.
  const sub = subscribeSyncFacts(() => {});
  const afterLog = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, sub.recorded);
  const world = factsFromSnapshot({
    backendConfigured: true,
    tracePoints: 120,
    hasServerVerdict: false,
    queueDepth: 1,
    // La file a été relue et SA sortie y est — la seule lecture qui autorise
    // « envoi différé » depuis le 27/07/2026 (`observeSync` la demande à
    // `pendingUploadStatus(syncFactRunId())`).
    runInQueue: 'queued',
    fromFinish: true,
    queuedHint: true,
  });
  const final = reduceAnalysisAll(afterLog, world);
  sub.unsubscribe();

  assertEquals(final.phase, 'deferred');
  assertEquals(stepStatuses(final.phase), {
    secure: 'done', // la file a été RELUE non vide : la persistance est prouvée
    upload: 'waiting', // l'envoi ATTEND un réseau — ni fait, ni échoué
    analyse: 'pending',
  });
  assertEquals(doneStepCount(final.phase), 1, 'E27 compte des étapes qui n’ont pas eu lieu');
});

Deno.test('SANS PROPRIÉTAIRE, aucun fait n’existe (démarrage à froid, lien profond)', () => {
  beginSyncFactRun(null);
  assertEquals(syncFactRunId(), null);
  publishSyncFact({ kind: 'server_accepted' }, OTHER);
  publishSyncFact({ kind: 'server_accepted' }, MINE);
  assertEquals(syncFactLog(), []);
});

Deno.test('`attempts` ne compte QUE les départs de cette sortie', () => {
  openMine();
  publishSyncFact({ kind: 'upload_started' }, MINE);
  publishSyncFact({ kind: 'offline_queued', queueDepth: 2 }, MINE);
  // Le drain part : deux entrées, dont une seule est la sienne.
  publishSyncFact({ kind: 'retry_started' }, OTHER);
  publishSyncFact({ kind: 'retry_started' }, MINE);
  const state = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, syncFactLog());
  assertEquals(state.attempts, 2, 'le compteur a gobé la tentative d’une autre sortie');
});

Deno.test('`publishRunSyncFacts` ne garde que les faits de la sortie propriétaire', () => {
  openMine();
  publishRunSyncFacts([
    { runId: OTHER, fact: { kind: 'server_accepted' } },
    { runId: MINE, fact: { kind: 'offline_queued', queueDepth: 1 } },
    { runId: 'run-encore-un-autre', fact: { kind: 'server_replied_error', httpStatus: 400 } },
  ]);
  assertEquals(syncFactLog(), [{ kind: 'offline_queued', queueDepth: 1 }]);
});

// ═══ 2. PUBLIER NE PEUT RIEN COÛTER À UNE COURSE ════════════════════════════

Deno.test('un abonné qui JETTE ne fait pas échouer la publication', () => {
  openMine();
  const seen: SyncFact[] = [];
  const bad = subscribeSyncFacts(() => {
    throw new Error('abonné cassé');
  });
  const good = subscribeSyncFacts((f) => seen.push(f));

  // Ne doit pas jeter : si ça jetait ici, ça jetterait dans `uploadOrQueue`,
  // juste avant l'invoke — et la course partirait moins souvent qu'avant.
  publishSyncFact({ kind: 'upload_started' }, MINE);

  assertEquals(seen, [{ kind: 'upload_started' }]);
  assertEquals(syncFactLog(), [{ kind: 'upload_started' }]);
  bad.unsubscribe();
  good.unsubscribe();
});

Deno.test('un abonné qui se désabonne PENDANT la diffusion ne casse pas les autres', () => {
  openMine();
  const seen: string[] = [];
  const first = subscribeSyncFacts(() => {
    seen.push('first');
    first.unsubscribe();
  });
  const second = subscribeSyncFacts(() => seen.push('second'));
  publishSyncFact({ kind: 'retry_started' }, MINE);
  assertEquals(seen, ['first', 'second']);
  second.unsubscribe();
});

Deno.test('publier sans aucun abonné journalise quand même (l’écran arrive après)', () => {
  openMine();
  // C'est le chemin NOMINAL : `finish()` attend l'envoi avant de naviguer, donc
  // personne n'écoute quand `upload_started` part.
  publishMine([{ kind: 'upload_started' }, { kind: 'server_accepted' }]);
  assertEquals(syncFactLog().length, 2);
});

// ═══ 3. LE REJEU : EXACT, ATOMIQUE, IDEMPOTENT ══════════════════════════════

Deno.test('s’abonner rend le journal DÉJÀ constitué (sinon E27 ne verrait rien)', () => {
  openMine();
  publishMine([{ kind: 'upload_started' }, { kind: 'server_accepted' }]);
  const sub = subscribeSyncFacts(() => {});
  assertEquals(sub.recorded, [{ kind: 'upload_started' }, { kind: 'server_accepted' }]);
  sub.unsubscribe();
});

Deno.test('le journal rejoué mène à l’état TERMINAL réel, pas à une progression', () => {
  openMine();
  // Chemin direct nominal : la requête part, le serveur répond. L'écran s'ouvre
  // APRÈS. Le fold est synchrone : il atterrit d'un coup sur `complete`.
  publishMine([{ kind: 'upload_started' }, { kind: 'server_accepted' }]);
  const sub = subscribeSyncFacts(() => {});
  const state = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, sub.recorded);
  assertEquals(state.phase, 'complete');
  // Une tentative RÉELLEMENT partie, et une seule.
  assertEquals(state.attempts, 1);
  sub.unsubscribe();
});

Deno.test('AUCUN FAIT N’EST PERDU NI COMPTÉ DEUX FOIS entre journal et abonnement', () => {
  openMine();
  // Scénario RÉEL : l'envoi direct part, le réseau manque, la sortie entre en
  // file. E27 s'ouvre là-dessus, puis le drain lance une reprise sous ses yeux.
  publishMine([{ kind: 'upload_started' }, { kind: 'offline_queued', queueDepth: 1 }]);

  // Ce que fait E27 : rejeu du journal depuis l'état initial, puis faits vivants.
  const live: SyncFact[] = [];
  const sub = subscribeSyncFacts((f) => live.push(f));
  let state = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, sub.recorded);
  assertEquals(state.phase, 'deferred');
  publishSyncFact({ kind: 'retry_started' }, MINE);
  state = reduceAnalysisAll(state, live);

  // Deux départs réels : le premier (journal) + la reprise (vivant). Jamais 3.
  assertEquals(state.attempts, 2);
  assertEquals(state.phase, 'uploading');
  assertEquals(live, [{ kind: 'retry_started' }]);
  sub.unsubscribe();
});

Deno.test('REJOUER EST IDEMPOTENT : un effet ré-exécuté ne double aucun compteur', () => {
  openMine();
  publishMine([
    { kind: 'upload_started' },
    { kind: 'offline_queued', queueDepth: 1 },
    { kind: 'retry_started' },
  ]);
  const a = subscribeSyncFacts(() => {});
  const first = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, a.recorded);
  a.unsubscribe();
  const b = subscribeSyncFacts(() => {});
  const second = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, b.recorded);
  b.unsubscribe();
  assertEquals(first, second);
  assertEquals(first.attempts, 2);
});

// ═══ 4. RIEN NE SURVIT À UNE NOUVELLE COURSE ════════════════════════════════

Deno.test('beginSyncFactRun vide le journal (la course N+1 ne rejoue pas la N)', () => {
  openMine();
  publishMine([{ kind: 'upload_started' }, { kind: 'server_accepted' }]);
  beginSyncFactRun('run-suivante');
  assertEquals(syncFactLog(), []);
  assertEquals(syncFactRunId(), 'run-suivante');
  const sub = subscribeSyncFacts(() => {});
  assertEquals(sub.recorded, []);
  // Et l'écran neuf repart de l'état initial, pas de « analyse terminée ».
  assertStrictEquals(
    reduceAnalysisAll(INITIAL_ANALYSIS_STATE, sub.recorded),
    INITIAL_ANALYSIS_STATE,
  );
  // La course N ne peut plus rien publier : son identité n'est plus propriétaire.
  publishSyncFact({ kind: 'server_accepted' }, MINE);
  assertEquals(syncFactLog(), []);
  sub.unsubscribe();
});

Deno.test('beginSyncFactRun NE détache PAS les abonnés (un écran ouvert reste branché)', () => {
  openMine();
  const seen: SyncFact[] = [];
  const sub = subscribeSyncFacts((f) => seen.push(f));
  beginSyncFactRun(MINE);
  publishSyncFact({ kind: 'local_save_failed' }, MINE);
  assertEquals(seen, [{ kind: 'local_save_failed' }]);
  sub.unsubscribe();
});

Deno.test('après désabonnement, plus RIEN n’arrive (aucun setState sur un écran démonté)', () => {
  openMine();
  const seen: SyncFact[] = [];
  const sub = subscribeSyncFacts((f) => seen.push(f));
  sub.unsubscribe();
  publishSyncFact({ kind: 'upload_started' }, MINE);
  assertEquals(seen, []);
});

// ═══ 5. LE PLAFOND : BORNÉ, MAIS JAMAIS AU PRIX DU VERDICT ══════════════════

Deno.test('le journal est BORNÉ et garde les DERNIERS faits (les terminaux)', () => {
  openMine();
  for (let i = 0; i < MAX_RECORDED_FACTS + 10; i += 1) {
    publishSyncFact({ kind: 'retry_started' }, MINE);
  }
  publishSyncFact({ kind: 'server_accepted' }, MINE);
  const log = syncFactLog();
  assertEquals(log.length, MAX_RECORDED_FACTS);
  // Le fait qui décide de l'état affiché est le plus récent : il DOIT survivre.
  assertEquals(log[log.length - 1], { kind: 'server_accepted' });
  assert(MAX_RECORDED_FACTS > 12, 'le plafond doit dépasser une file pleine drainée');
});
