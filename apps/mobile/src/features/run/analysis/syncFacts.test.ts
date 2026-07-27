/**
 * GRYD — E27 : CE QUE L'OBSERVATION A LE DROIT DE CONCLURE.
 *
 * La machine à états est déjà verrouillée (`analysisMachine.test.ts`). Reste le
 * maillon où le mensonge s'introduirait le plus discrètement : la traduction
 * « ce que j'ai lu » → « ce que j'affirme ». Un seul repli optimiste ici (une
 * file illisible comptée pour vide, un verdict supposé sur une file drainée) et
 * l'écran annoncerait une conquête que personne n'a validée.
 *
 * Les tests couvrent donc, une par une, TOUTES les branches de décision, et en
 * particulier les trois qui doivent rester des « je ne sais pas ».
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { DrainReport, PendingEntry } from '../../../lib/pendingUploadQueue.ts';
import { PENDING_QUEUE_MAX_ENTRIES } from '../../../lib/pendingUploadQueue.ts';
import type { IngestRunRequest } from '@klaim/shared';
import { QUEUE_DEPTH_UNKNOWN, reduceAnalysisAll, INITIAL_ANALYSIS_STATE } from './analysisMachine.ts';
import {
  MIN_TRACE_POINTS,
  type RunQueueMembership,
  type SyncSnapshot,
  UNREAD_SNAPSHOT,
  factsForRun,
  factsFromDrain,
  factsFromSnapshot,
} from './syncFacts.ts';

/**
 * Monde par défaut : backend présent, une trace mesurée, la file RELUE et vide —
 * donc la sortie regardée n'y est pas. `runInQueue` est TOUJOURS explicite dans
 * les tests qui en dépendent : depuis le 27/07/2026, `queueDepth` ne prouve plus
 * rien sur la sortie du joueur (il compte la file entière), et une valeur
 * déduite de l'autre reproduirait le défaut à l'intérieur même du test.
 */
function snapshot(over: Partial<SyncSnapshot> = {}): SyncSnapshot {
  return {
    backendConfigured: true,
    tracePoints: 120,
    hasServerVerdict: false,
    queueDepth: 0,
    runInQueue: 'absent',
    fromFinish: false,
    queuedHint: false,
    ...over,
  };
}

/** Phase finale réellement atteinte par l'écran à partir d'un snapshot. */
function phaseOf(snap: SyncSnapshot): string {
  return reduceAnalysisAll(INITIAL_ANALYSIS_STATE, factsFromSnapshot(snap)).phase;
}

function entry(id: string): PendingEntry {
  return { payload: { clientRunId: id } as unknown as IngestRunRequest, queuedAt: 0 };
}

function report(over: Partial<DrainReport> = {}): DrainReport {
  return { remaining: [], sent: [], rejected: [], stoppedBy: 'empty', ...over };
}

// ═══ SNAPSHOT → FAITS ═══════════════════════════════════════════════════════

Deno.test('rien à analyser : aucune trace, aucune file, aucun verdict', () => {
  assertEquals(factsFromSnapshot(snapshot({ tracePoints: 0 })), [{ kind: 'no_run' }]);
  assertEquals(phaseOf(snapshot({ tracePoints: 0 })), 'no_run');
});

Deno.test('une trace d’un seul point ne prouve aucune sortie (seuil du Résultat)', () => {
  assertEquals(MIN_TRACE_POINTS, 2);
  assertEquals(phaseOf(snapshot({ tracePoints: 1 })), 'no_run');
  assertEquals(phaseOf(snapshot({ tracePoints: 2 })), 'unreadable');
});

Deno.test('MA sortie en file compte comme une sortie, même sans trace en mémoire', () => {
  // Relance de l'app après un kill : la trace singleton est perdue, la file non.
  // Il faut que la file ait été relue ET que la sortie regardée y soit trouvée.
  assertEquals(
    phaseOf(snapshot({ tracePoints: 0, queueDepth: 1, runInQueue: 'queued' })),
    'deferred',
  );
});

Deno.test('une file NON VIDE qui ne contient PAS ma sortie ne prouve AUCUNE sortie à analyser', () => {
  // Le compte global disait « il y a une sortie » : c'était vrai de la FILE, et
  // faux de cet écran. Une course d'hier en attente ne donne pas à E27, ouvert
  // sans contexte, une sortie à raconter.
  assertEquals(phaseOf(snapshot({ tracePoints: 0, queueDepth: 4, runInQueue: 'absent' })), 'no_run');
  assertEquals(
    phaseOf(snapshot({ tracePoints: 0, queueDepth: 4, runInQueue: 'unknown' })),
    'no_run',
  );
});

Deno.test('un verdict capturé compte comme une sortie, même sans trace en mémoire', () => {
  assertEquals(phaseOf(snapshot({ tracePoints: 0, hasServerVerdict: true })), 'complete');
});

Deno.test('pas de backend : AUCUNE persistance n’est affirmée (correctif 27/07)', () => {
  // Ce test attendait `local_saved` en tête — c'était le fait fabriqué. Sans
  // backend, `uploadOrQueue` sort en 'none' AVANT la file (useRealRunCore.ts:166)
  // et `finish()` purge ensuite les clés de la course (:495-499) : rien n'écrit
  // la sortie sur le disque. Le snapshot ne lit d'ailleurs AUCUNE persistance.
  assertEquals(factsFromSnapshot(snapshot({ backendConfigured: false })), [
    { kind: 'no_backend' },
  ]);
});

Deno.test('pas de backend ET aucune sortie : c’est « rien à analyser », pas « pas de serveur »', () => {
  assertEquals(phaseOf(snapshot({ backendConfigured: false, tracePoints: 0 })), 'no_run');
});

Deno.test('verdict serveur capturé ⇒ analyse terminée (la seule preuve acceptée)', () => {
  // Plus de `local_saved` ici non plus : sur ce chemin la sortie est chez le
  // SERVEUR, et les clés locales viennent d'être purgées.
  assertEquals(factsFromSnapshot(snapshot({ hasServerVerdict: true })), [
    { kind: 'server_accepted' },
  ]);
});

Deno.test('MA sortie en file ⇒ envoi différé, avec la profondeur RÉELLE de la file', () => {
  // `queueDepth` est le TOTAL de la file (3 sorties attendent, dont la mienne) :
  // il n'est affiché que dans ce cas, où « ta sortie comprise » est vrai.
  assertEquals(factsFromSnapshot(snapshot({ queueDepth: 3, runInQueue: 'queued' })), [
    { kind: 'local_saved' },
    { kind: 'offline_queued', queueDepth: 3 },
  ]);
});

Deno.test('file non vide SANS ma sortie ⇒ ni « à l’abri », ni « en attente »', () => {
  // LE DÉFAUT EXACT, DANS SA FORME LA PLUS NUE : la file parle d'autres courses.
  // Rien de ce qu'elle contient n'est une preuve sur celle-ci.
  assertEquals(factsFromSnapshot(snapshot({ queueDepth: 5, runInQueue: 'absent' })), [
    { kind: 'outcome_unreadable' },
  ]);
});

Deno.test('le verdict PRIME sur la file (une sortie jugée n’est plus « en attente »)', () => {
  assertEquals(
    phaseOf(snapshot({ hasServerVerdict: true, queueDepth: 2, runInQueue: 'queued' })),
    'complete',
  );
});

Deno.test('file ILLISIBLE : on ne la compte JAMAIS pour vide, on dit qu’on ne sait pas', () => {
  assertEquals(
    phaseOf(snapshot({ queueDepth: QUEUE_DEPTH_UNKNOWN, runInQueue: 'unknown' })),
    'unreadable',
  );
});

Deno.test('SANS IDENTITÉ DE SORTIE, une file lisible ne conclut rien non plus', () => {
  // App relancée à froid / lien profond : `syncFactRunId()` est `null`, donc
  // `runInQueue` vaut 'unknown' même si la file a été parfaitement lue. On ne
  // sait pas de quelle sortie on parle : on ne lui attribue rien.
  assertEquals(
    factsFromSnapshot(snapshot({ queueDepth: 2, runInQueue: 'unknown', fromFinish: true })),
    [{ kind: 'outcome_unreadable' }],
  );
});

Deno.test('sortie partie, file vide, aucun verdict : issue INCONNUE, jamais « terminé »', () => {
  // Ni « terminé », ni « à l'abri » : file vide ou illisible, c'est exactement
  // le cas où personne ne sait où la sortie se trouve.
  assertEquals(factsFromSnapshot(snapshot()), [{ kind: 'outcome_unreadable' }]);
  assertEquals(phaseOf(snapshot()), 'unreadable');
});

Deno.test('un snapshot où RIEN n’a été lu ne conclut rien de flatteur', () => {
  assertEquals(phaseOf(UNREAD_SNAPSHOT), 'no_run');
});

// ═══ LE RELAIS DE E26 : CE QU'IL SÉPARE, ET QUE RIEN D'AUTRE NE SÉPARAIT ════
// `finish()` rend UN booléen `uploadQueued` pour DEUX verdicts opposés
// ('queued' et 'lost', useRealRunCore.ts:506). Croisé avec la file, il les
// distingue enfin — c'est la seule raison pour laquelle ces deux champs
// existent dans le snapshot.

Deno.test('relais E26 « pas envoyée » + MA sortie retrouvée en file ⇒ envoi différé', () => {
  assertEquals(
    phaseOf(snapshot({ fromFinish: true, queuedHint: true, queueDepth: 1, runInQueue: 'queued' })),
    'deferred',
  );
});

Deno.test('relais E26 « pas envoyée » + file VIDE ⇒ la sortie n’a PAS pu être mise en file', () => {
  // Chemin 'lost' : promettre « envoi dès que possible » ici serait promettre
  // un envoi qui ne viendrait jamais.
  // Et surtout : plus de `local_saved` ACCOLÉ à `not_stored`. Les deux faits se
  // contredisaient dans le même tableau — le second dit littéralement que la
  // sortie n'a PAS pu être stockée.
  assertEquals(factsFromSnapshot(snapshot({ fromFinish: true, queuedHint: true })), [
    { kind: 'not_stored', reason: 'storage' },
  ]);
  assertEquals(phaseOf(snapshot({ fromFinish: true, queuedHint: true })), 'unstored');
});

Deno.test('FILE AU PLAFOND : une sortie REFUSÉE n’est PAS « en file » parce que la file est pleine', () => {
  // LE MENSONGE QUE CE TEST REPRODUIT. `queuePendingUpload` REFUSE l'entrée
  // quand la file est au plafond (pendingUploadQueue.ts:180) et publie
  // `not_stored` (pendingUpload.ts:143) : E27 se pose correctement en
  // « non mise en file ». Puis `observeSync` relit une file forcément NON VIDE
  // — c'est exactement pourquoi elle a refusé — et l'écran repliait ce compte
  // GLOBAL par-dessus : « ta sortie repartira au premier réseau », plus
  // « n en attente d'envoi », POUR UNE COURSE QUI N'EST PAS DANS LA FILE.
  const snap = snapshot({
    fromFinish: true,
    queuedHint: true,
    queueDepth: PENDING_QUEUE_MAX_ENTRIES,
    runInQueue: 'absent',
  });
  assertEquals(factsFromSnapshot(snap), [{ kind: 'not_stored', reason: 'unknown' }]);
  assertEquals(phaseOf(snap), 'unstored');
});

Deno.test('« pas envoyée » + file ILLISIBLE ⇒ on ne conclut PAS « non stockée »', () => {
  assertEquals(
    phaseOf(
      snapshot({
        fromFinish: true,
        queuedHint: true,
        queueDepth: QUEUE_DEPTH_UNKNOWN,
        runInQueue: 'unknown',
      }),
    ),
    'unreadable',
  );
});

Deno.test('LA LECTURE NE REPEINT PAS UN « non stockée » PUBLIÉ PAR LE PRODUCTEUR', () => {
  // ⚠ LE DÉFAUT COMPLET, DANS SA COMPOSITION RÉELLE (27/07/2026).
  // 1. `queuePendingUpload` refuse la sortie au plafond et publie la cause
  //    EXACTE — `not_stored reason:'queue_full'` (lib/pendingUpload.ts). E27
  //    replie ce journal au montage : phase `unstored`, copie vraie
  //    (« elle sera reproposée à ta prochaine course »), aucune reprise peinte.
  // 2. `observeSync` relit ENSUITE le monde. Si la relecture de la file échoue
  //    (`runInQueue: 'unknown'`), la table ci-dessous rend `outcome_unreadable`
  //    — ce qui est correct de SA part : elle, elle ne sait rien.
  // 3. L'écran appliquait ce fait par-dessus : le diagnostic juste devenait
  //    « issue non lisible », et `canRetry` rallumait un « Réessayer » qui ne
  //    peut rien trouver (la reprise ne draine que la file, où cette sortie
  //    n'est justement PAS).
  const journal = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, [
    { kind: 'not_stored', reason: 'queue_full' },
  ]);
  const illisible = snapshot({
    fromFinish: true,
    queuedHint: true,
    queueDepth: QUEUE_DEPTH_UNKNOWN,
    runInQueue: 'unknown',
  });
  assertEquals(factsFromSnapshot(illisible), [{ kind: 'outcome_unreadable' }]);
  assertEquals(reduceAnalysisAll(journal, factsFromSnapshot(illisible)).phase, 'unstored');
});

Deno.test('… et une lecture illisible ne dégrade pas non plus un « en file » déjà établi', () => {
  const journal = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, [
    { kind: 'offline_queued', queueDepth: 3 },
  ]);
  const illisible = snapshot({
    fromFinish: true,
    queueDepth: QUEUE_DEPTH_UNKNOWN,
    runInQueue: 'unknown',
  });
  const apres = reduceAnalysisAll(journal, factsFromSnapshot(illisible));
  assertEquals(apres.phase, 'deferred');
  assertEquals(apres.queueDepth, 3, 'la profondeur RÉELLE lue est remplacée par un « inconnu »');
});

Deno.test('un verdict serveur prime même sur le relais « pas envoyée »', () => {
  // Cas réel : renvoi hors-ligne abouti pendant que l'écran était ouvert.
  assertEquals(
    phaseOf(snapshot({ fromFinish: true, queuedHint: true, hasServerVerdict: true })),
    'complete',
  );
});

Deno.test('le relais SEUL suffit à prouver qu’une sortie existe (trace perdue au kill)', () => {
  assertEquals(phaseOf(snapshot({ fromFinish: true, tracePoints: 0 })), 'unreadable');
});

Deno.test('sans relais, le même monde reste « rien à analyser » (lien profond nu)', () => {
  assertEquals(phaseOf(snapshot({ fromFinish: false, tracePoints: 0 })), 'no_run');
});

Deno.test('relais SANS « queued » ⇒ jamais « non stockée » (E26 n’a rien affirmé de tel)', () => {
  assertEquals(phaseOf(snapshot({ fromFinish: true, queuedHint: false })), 'unreadable');
});

// ═══ RAPPORT DE RENVOI → FAITS, CHACUN NOMMÉ ═══════════════════════════════
//
// ⚠ CE BLOC A CHANGÉ LE 27/07/2026, ET IL LE DEVAIT. Il verrouillait un verdict
// AGRÉGÉ : « au moins une sortie est partie » ⇒ `server_accepted`, sans dire
// laquelle. Or le drain part TOUT SEUL à chaque retour au premier plan
// (app/_layout.tsx) et vide des sorties d'hier : E27, ouvert sur une course
// encore en file, peignait ses trois étapes « terminé ». Les tests verdissaient
// parce qu'ils exerçaient la table isolément, sans jamais demander DE QUELLE
// sortie parlait le fait. Ils demandent maintenant.

Deno.test('aucun rejeu (null) ⇒ AUCUN fait : l’écran n’a rien appris', () => {
  assertEquals(factsFromDrain(null), []);
});

Deno.test('renvoi réussi ⇒ verdict serveur, RATTACHÉ à la sortie partie', () => {
  assertEquals(factsFromDrain(report({ sent: ['r1'] })), [
    { runId: 'r1', fact: { kind: 'server_accepted' } },
  ]);
});

Deno.test('renvoi refusé définitivement ⇒ course refusée, pas une panne réseau', () => {
  assertEquals(factsFromDrain(report({ rejected: ['r1'] })), [
    { runId: 'r1', fact: { kind: 'server_replied_error', httpStatus: 400 } },
  ]);
});

Deno.test('DEUX SORTIES, DEUX VERDICTS : aucune n’hérite de l’issue de l’autre', () => {
  // Le cas exact du défaut : une course d'hier part, celle du joueur reste en
  // file. Chaque fait cite SA sortie — et le transport ne gardera que la bonne.
  const facts = factsFromDrain(
    report({ sent: ['hier'], remaining: [entry('la-mienne')], stoppedBy: 'retry_later' }),
  );
  assertEquals(facts, [
    { runId: 'hier', fact: { kind: 'server_accepted' } },
    { runId: 'la-mienne', fact: { kind: 'offline_queued', queueDepth: 1 } },
  ]);
  // Ce que la sortie du joueur apprend, et RIEN d'autre.
  assertEquals(factsForRun(facts, 'la-mienne'), [{ kind: 'offline_queued', queueDepth: 1 }]);
  assertEquals(
    reduceAnalysisAll(INITIAL_ANALYSIS_STATE, factsForRun(facts, 'la-mienne')).phase,
    'deferred',
  );
});

Deno.test('un envoi réussi ne PRIME plus sur un refus : ils parlent de sorties différentes', () => {
  // Ancienne règle : « sent prime sur rejected ». Elle n'avait de sens que parce
  // que le fait était anonyme — il fallait bien en choisir un. Avec l'identité,
  // arbitrer serait perdre une information vraie.
  const facts = factsFromDrain(report({ sent: ['r1'], rejected: ['r2'] }));
  assertEquals(factsForRun(facts, 'r1'), [{ kind: 'server_accepted' }]);
  assertEquals(factsForRun(facts, 'r2'), [{ kind: 'server_replied_error', httpStatus: 400 }]);
});

Deno.test('file toujours pleine (réseau) ⇒ envoi différé avec le RESTE réel', () => {
  assertEquals(
    factsFromDrain(report({ remaining: [entry('a'), entry('b')], stoppedBy: 'retry_later' })),
    [
      { runId: 'a', fact: { kind: 'offline_queued', queueDepth: 2 } },
      { runId: 'b', fact: { kind: 'offline_queued', queueDepth: 2 } },
    ],
  );
});

Deno.test('pas de session ⇒ la sortie reste gardée : même fait, aucune cause affirmée', () => {
  assertEquals(factsFromDrain(report({ remaining: [entry('a')], stoppedBy: 'no_session' })), [
    { runId: 'a', fact: { kind: 'offline_queued', queueDepth: 1 } },
  ]);
});

Deno.test('rapport VIDE (rien n’était en file) ⇒ AUCUN fait appris, pas un diagnostic', () => {
  // Rendre « issue illisible » ici serait prétendre avoir regardé : le drain
  // n'a rien eu à envoyer, il n'a donc rien constaté. L'appelant relit le monde.
  assertEquals(factsFromDrain(report()), []);
});

Deno.test('un rapport vide ne DÉGRADE pas un diagnostic déjà juste', () => {
  const before = reduceAnalysisAll(INITIAL_ANALYSIS_STATE, [
    { kind: 'not_stored', reason: 'storage' },
  ]);
  assertEquals(
    reduceAnalysisAll(before, factsForRun(factsFromDrain(report()), 'a')).phase,
    'unstored',
  );
});

Deno.test('les issues de renvoi mènent à des phases DISTINCTES', () => {
  const phases = [
    report({ sent: ['a'] }),
    report({ rejected: ['a'] }),
    report({ remaining: [entry('a')], stoppedBy: 'retry_later' }),
  ].map(
    (r) =>
      reduceAnalysisAll(INITIAL_ANALYSIS_STATE, factsForRun(factsFromDrain(r), 'a')).phase,
  );
  assertEquals(phases, ['complete', 'rejected', 'deferred']);
  assertEquals(new Set(phases).size, 3);
});

// ═══ FILTRER PAR SORTIE : L'OPÉRATION QUI REND LE DRAIN HONNÊTE ═════════════

Deno.test('`factsForRun` sans identité de sortie n’adopte RIEN', () => {
  // Écran ouvert par lien profond, app relancée à froid : aucune course n'a été
  // ouverte dans cette session. Le drain d'un autre jour ne lui apprend rien.
  const facts = factsFromDrain(report({ sent: ['hier'] }));
  assertEquals(factsForRun(facts, null), []);
  assertEquals(factsForRun(facts, 'jamais-vue'), []);
});

// ═══ L'INVARIANT QUI MANQUAIT : AUCUN FAIT N'EST FABRIQUÉ ═══════════════════

/** Toutes les combinaisons du snapshot, sans en oublier une seule. */
function* allSnapshots(): Generator<SyncSnapshot> {
  const bools = [false, true];
  const depths = [QUEUE_DEPTH_UNKNOWN, 0, 1, 5];
  const memberships: RunQueueMembership[] = ['queued', 'absent', 'unknown'];
  for (const backendConfigured of bools) {
    for (const hasServerVerdict of bools) {
      for (const fromFinish of bools) {
        for (const queuedHint of bools) {
          for (const tracePoints of [0, 2]) {
            for (const queueDepth of depths) {
              for (const runInQueue of memberships) {
                yield {
                  backendConfigured,
                  hasServerVerdict,
                  fromFinish,
                  queuedHint,
                  tracePoints,
                  queueDepth,
                  runInQueue,
                };
              }
            }
          }
        }
      }
    }
  }
}

Deno.test('`local_saved` n’est émis QUE si MA sortie a été RETROUVÉE dans la file', () => {
  // Deux fautes corrigées le 27/07, et ce test les verrouille toutes les deux :
  //  1. le fait sortait en tête de CHAQUE branche, sans qu'aucune source ne
  //     l'atteste ;
  //  2. il s'appuyait ensuite sur `queueDepth > 0` — la file ENTIÈRE, qui ne
  //     prouve rien de la sortie regardée.
  // La seule preuve d'écriture disque que ce snapshot porte est
  // `runInQueue === 'queued'` : la file a été relue, et CETTE sortie y est.
  for (const snap of allSnapshots()) {
    const saidSaved = factsFromSnapshot(snap).some((f) => f.kind === 'local_saved');
    const proven = snap.backendConfigured && !snap.hasServerVerdict && snap.runInQueue === 'queued';
    assertEquals(saidSaved, proven, JSON.stringify(snap));
  }
});

Deno.test('`offline_queued` n’est JAMAIS émis pour une sortie absente de la file', () => {
  // L'énoncé exact du mensonge : « ta sortie repartira au premier réseau » ne
  // peut être dit que d'une sortie qui EST dans la file d'envoi.
  for (const snap of allSnapshots()) {
    const saidQueued = factsFromSnapshot(snap).some((f) => f.kind === 'offline_queued');
    if (saidQueued) assertEquals(snap.runInQueue, 'queued', JSON.stringify(snap));
  }
});

Deno.test('aucun tableau de faits ne se contredit lui-même', () => {
  // `local_saved` (« durablement tenue sur l'appareil ») et `not_stored`
  // (« n'a pas pu être stockée ») étaient rendus ENSEMBLE. Plus jamais.
  for (const snap of allSnapshots()) {
    const kinds = new Set(factsFromSnapshot(snap).map((f) => f.kind));
    assertEquals(kinds.has('local_saved') && kinds.has('not_stored'), false, JSON.stringify(snap));
    assertEquals(
      kinds.has('offline_queued') && kinds.has('not_stored'),
      false,
      JSON.stringify(snap),
    );
  }
});
