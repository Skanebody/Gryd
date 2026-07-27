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
import type { IngestRunRequest } from '@klaim/shared';
import { QUEUE_DEPTH_UNKNOWN, reduceAnalysisAll, INITIAL_ANALYSIS_STATE } from './analysisMachine.ts';
import {
  MIN_TRACE_POINTS,
  type SyncSnapshot,
  UNREAD_SNAPSHOT,
  factsForRun,
  factsFromDrain,
  factsFromSnapshot,
} from './syncFacts.ts';

function snapshot(over: Partial<SyncSnapshot> = {}): SyncSnapshot {
  return {
    backendConfigured: true,
    tracePoints: 120,
    hasServerVerdict: false,
    queueDepth: 0,
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

Deno.test('une sortie EN FILE compte comme une sortie, même sans trace en mémoire', () => {
  // Relance de l'app après un kill : la trace singleton est perdue, la file non.
  assertEquals(phaseOf(snapshot({ tracePoints: 0, queueDepth: 1 })), 'deferred');
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

Deno.test('file non vide ⇒ envoi différé, avec la profondeur RÉELLE', () => {
  assertEquals(factsFromSnapshot(snapshot({ queueDepth: 3 })), [
    { kind: 'local_saved' },
    { kind: 'offline_queued', queueDepth: 3 },
  ]);
});

Deno.test('le verdict PRIME sur la file (une sortie jugée n’est plus « en attente »)', () => {
  assertEquals(phaseOf(snapshot({ hasServerVerdict: true, queueDepth: 2 })), 'complete');
});

Deno.test('file ILLISIBLE : on ne la compte JAMAIS pour vide, on dit qu’on ne sait pas', () => {
  assertEquals(phaseOf(snapshot({ queueDepth: QUEUE_DEPTH_UNKNOWN })), 'unreadable');
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

Deno.test('relais E26 « pas envoyée » + file NON vide ⇒ envoi différé', () => {
  assertEquals(
    phaseOf(snapshot({ fromFinish: true, queuedHint: true, queueDepth: 1 })),
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

Deno.test('« pas envoyée » + file ILLISIBLE ⇒ on ne conclut PAS « non stockée »', () => {
  assertEquals(
    phaseOf(snapshot({ fromFinish: true, queuedHint: true, queueDepth: QUEUE_DEPTH_UNKNOWN })),
    'unreadable',
  );
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

Deno.test('`local_saved` n’est émis QUE si la file a été relue NON VIDE', () => {
  // La faute corrigée le 27/07 : ce fait sortait en tête de CHAQUE branche.
  // `SyncSnapshot` ne porte qu'une seule source capable de prouver une écriture
  // disque — `queueDepth`, rendu par `pendingUploadCount()`. Ce test énumère
  // toutes les combinaisons du snapshot et vérifie l'équivalence stricte.
  const bools = [false, true];
  const depths = [QUEUE_DEPTH_UNKNOWN, 0, 1, 5];
  for (const backendConfigured of bools) {
    for (const hasServerVerdict of bools) {
      for (const fromFinish of bools) {
        for (const queuedHint of bools) {
          for (const tracePoints of [0, 2]) {
            for (const queueDepth of depths) {
              const snap = {
                backendConfigured,
                hasServerVerdict,
                fromFinish,
                queuedHint,
                tracePoints,
                queueDepth,
              };
              const saidSaved = factsFromSnapshot(snap).some((f) => f.kind === 'local_saved');
              const proven = backendConfigured && !hasServerVerdict && queueDepth > 0;
              assertEquals(saidSaved, proven, JSON.stringify(snap));
            }
          }
        }
      }
    }
  }
});

Deno.test('aucun tableau de faits ne se contredit lui-même', () => {
  // `local_saved` (« durablement tenue sur l'appareil ») et `not_stored`
  // (« n'a pas pu être stockée ») étaient rendus ENSEMBLE. Plus jamais.
  const bools = [false, true];
  for (const backendConfigured of bools) {
    for (const hasServerVerdict of bools) {
      for (const fromFinish of bools) {
        for (const queuedHint of bools) {
          for (const queueDepth of [QUEUE_DEPTH_UNKNOWN, 0, 1]) {
            const facts = factsFromSnapshot({
              backendConfigured,
              hasServerVerdict,
              fromFinish,
              queuedHint,
              tracePoints: 2,
              queueDepth,
            });
            const kinds = new Set(facts.map((f) => f.kind));
            assertEquals(
              kinds.has('local_saved') && kinds.has('not_stored'),
              false,
              JSON.stringify(facts),
            );
          }
        }
      }
    }
  }
});
