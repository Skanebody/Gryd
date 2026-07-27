/**
 * GRYD — CE QUE LA FILE D'ENVOI DIFFÉRÉ N'A PAS LE DROIT DE PERDRE.
 *
 * Le défaut réparé ici (AUDIT R4) était une perte de donnée utilisateur
 * SILENCIEUSE : l'envoi différé tenait dans UN slot, donc deux fins de course
 * hors ligne = la première ÉCRASÉE. Le test central de ce fichier est celui-là.
 *
 * Ordre de gravité :
 *  1. deux sorties hors ligne sont TOUTES DEUX conservées, dans l'ordre ;
 *  2. une entrée acceptée n'est retirée que par un VERDICT DU SERVEUR — une
 *     panne réseau au 2ᵉ garde le 2ᵉ ET tous les suivants ;
 *  3. un rejet définitif retire l'entrée sans prendre la file en otage ;
 *  4. l'ancien slot v1 d'un téléphone déjà en service est MIGRÉ, pas perdu ;
 *  5. le plafond ne jette RIEN : à la limite il REFUSE (et le dit), il n'écrase
 *     jamais une entrée déjà acceptée.
 *
 * La logique testée est celle du module PUR `pendingUploadQueue.ts` (AsyncStorage
 * et l'invoke Supabase vivent dans `pendingUpload.ts` et sont injectés).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { IngestRunRequest } from '@klaim/shared';
import {
  LEGACY_PENDING_UPLOAD_KEY,
  PENDING_QUEUE_KEY,
  PENDING_QUEUE_MAX_BYTES,
  PENDING_QUEUE_MAX_ENTRIES,
  type PendingEntry,
  type QueueRead,
  type SendVerdict,
  drainPendingQueue,
  enqueuePending,
  hasPendingRun,
  isPermanentHttpStatus,
  parsePendingQueue,
  planEnqueue,
  planRemoval,
  removePending,
  serializePendingQueue,
} from './pendingUploadQueue.ts';

/** Payload minimal mais RÉEL (forme du contrat ingest_run). */
function payload(id: string, points = 1): IngestRunRequest {
  return {
    clientRunId: id,
    source: 'gps',
    activity: 'run',
    startedAt: '2026-07-27T06:00:00.000Z',
    points: Array.from({ length: points }, (_, i) => ({
      lat: 48.85 + i * 1e-5,
      lng: 2.35 + i * 1e-5,
      t: 1_753_000_000_000 + i * 1000,
      acc: 8,
    })),
  };
}

/** Les identifiants de la file, dans l'ordre — la seule chose qu'on lit ici. */
function ids(queue: readonly PendingEntry[]): string[] {
  return queue.map((e) => e.payload.clientRunId);
}

/** Met en file en série ; échoue le test si une entrée est refusée. */
function queueAll(...payloads: IngestRunRequest[]): PendingEntry[] {
  let queue: readonly PendingEntry[] = [];
  payloads.forEach((p, i) => {
    const res = enqueuePending(queue, p, 1_000 + i);
    assert(res.accepted, `entrée ${p.clientRunId} refusée : ${res.outcome}`);
    queue = res.queue;
  });
  return queue.slice();
}

// ════════════════════════════════════════════════════════════════════════════
// 1. LE CAS QUI PERDAIT DES DONNÉES
// ════════════════════════════════════════════════════════════════════════════

Deno.test('DEUX sorties hors ligne : les DEUX sont conservées, dans l’ordre', () => {
  const queue = queueAll(payload('run-1'), payload('run-2'));
  assertEquals(ids(queue), ['run-1', 'run-2']);
});

Deno.test('l’ordre FIFO survit à un aller-retour par le stockage', () => {
  const queue = queueAll(payload('a'), payload('b'), payload('c'));
  const relu = parsePendingQueue(serializePendingQueue(queue), null);
  assertEquals(ids(relu), ['a', 'b', 'c']);
  assertEquals(relu[0].queuedAt, 1_000); // l'instant de mise en file est persisté
});

Deno.test('la même course re-soumise REMPLACE sur place — ni doublon, ni décalage', () => {
  const queue = queueAll(payload('a'), payload('b'));
  const res = enqueuePending(queue, payload('a', 42), 9_999);
  assertEquals(res.accepted, true);
  assertEquals(res.outcome, 'replaced');
  assertEquals(ids(res.queue), ['a', 'b']); // 'a' reste EN TÊTE, pas renvoyé à la fin
  assertEquals(res.queue[0].payload.points.length, 42); // payload à jour
  assertEquals(res.queue[0].queuedAt, 1_000); // ancienneté conservée
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE REJEU
// ════════════════════════════════════════════════════════════════════════════

Deno.test('le rejeu vide la file DANS L’ORDRE', async () => {
  const queue = queueAll(payload('a'), payload('b'), payload('c'));
  const envoyes: string[] = [];
  const report = await drainPendingQueue(queue, (p) => {
    envoyes.push(p.clientRunId);
    return Promise.resolve<SendVerdict>('sent');
  });
  assertEquals(envoyes, ['a', 'b', 'c']); // l'ordre d'ENVOI, pas seulement celui du rapport
  assertEquals(report.sent, ['a', 'b', 'c']);
  assertEquals(report.remaining.length, 0);
  assertEquals(report.stoppedBy, 'empty');
});

Deno.test('panne réseau au 2ᵉ : le 2ᵉ ET LES SUIVANTS restent, dans l’ordre', async () => {
  const queue = queueAll(payload('a'), payload('b'), payload('c'));
  const tentes: string[] = [];
  const report = await drainPendingQueue(queue, (p) => {
    tentes.push(p.clientRunId);
    return Promise.resolve<SendVerdict>(p.clientRunId === 'a' ? 'sent' : 'retry_later');
  });
  assertEquals(tentes, ['a', 'b']); // on n'insiste PAS sur 'c' : le réseau est tombé
  assertEquals(report.sent, ['a']);
  assertEquals(ids(report.remaining), ['b', 'c']);
  assertEquals(report.stoppedBy, 'retry_later');
});

Deno.test('sans session : la file est INTACTE, aucune entrée consommée', async () => {
  const queue = queueAll(payload('a'), payload('b'));
  const report = await drainPendingQueue(queue, () => Promise.resolve<SendVerdict>('no_session'));
  assertEquals(ids(report.remaining), ['a', 'b']);
  assertEquals(report.sent, []);
  assertEquals(report.stoppedBy, 'no_session');
});

Deno.test('un REJET DÉFINITIF retire l’entrée et NE BLOQUE PAS la file', async () => {
  const queue = queueAll(payload('a'), payload('b'), payload('c'));
  const report = await drainPendingQueue(queue, (p) =>
    Promise.resolve<SendVerdict>(p.clientRunId === 'a' ? 'rejected_permanent' : 'sent'),
  );
  assertEquals(report.rejected, ['a']);
  assertEquals(report.sent, ['b', 'c']); // les suivantes ne sont pas prises en otage
  assertEquals(report.remaining.length, 0);
});

Deno.test('chaque verdict définitif est notifié AVANT la suite (persistance crash-safe)', async () => {
  const queue = queueAll(payload('a'), payload('b'));
  const journal: string[] = [];
  await drainPendingQueue(
    queue,
    (p) => {
      journal.push(`envoi:${p.clientRunId}`);
      return Promise.resolve<SendVerdict>('sent');
    },
    (entry) => {
      journal.push(`persiste:${entry.payload.clientRunId}`);
    },
  );
  assertEquals(journal, ['envoi:a', 'persiste:a', 'envoi:b', 'persiste:b']);
});

Deno.test('4xx hors 429 = jugé ; 429 et 5xx = réessayables', () => {
  assertEquals(isPermanentHttpStatus(400), true);
  assertEquals(isPermanentHttpStatus(403), true);
  assertEquals(isPermanentHttpStatus(422), true);
  assertEquals(isPermanentHttpStatus(429), false); // rate limit : on retentera
  assertEquals(isPermanentHttpStatus(500), false);
  assertEquals(isPermanentHttpStatus(undefined), false); // réseau/relay → réessayable
});

Deno.test('removePending retire par clientRunId sans toucher l’ordre', () => {
  const queue = queueAll(payload('a'), payload('b'), payload('c'));
  assertEquals(ids(removePending(queue, 'b')), ['a', 'c']);
  assertEquals(ids(removePending(queue, 'inconnu')), ['a', 'b', 'c']);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. MIGRATION DE L'ANCIEN SLOT UNIQUE (v1)
// ════════════════════════════════════════════════════════════════════════════

Deno.test('la course du slot v1 d’un téléphone déjà installé N’EST PAS PERDUE', () => {
  const legacy = JSON.stringify(payload('vieille-course')); // payload NU, format v1
  const queue = parsePendingQueue(null, legacy);
  assertEquals(ids(queue), ['vieille-course']);
});

Deno.test('le slot v1 passe DEVANT la file v2 (il lui est antérieur)', () => {
  const v2 = serializePendingQueue(queueAll(payload('neuve')));
  const queue = parsePendingQueue(v2, JSON.stringify(payload('vieille')));
  assertEquals(ids(queue), ['vieille', 'neuve']);
});

Deno.test('une migration rejouée ne duplique pas la course (même clientRunId)', () => {
  const v2 = serializePendingQueue(queueAll(payload('x'), payload('y')));
  const queue = parsePendingQueue(v2, JSON.stringify(payload('x')));
  assertEquals(ids(queue), ['x', 'y']);
});

Deno.test('les clés de stockage sont figées — les renommer perdrait les files posées', () => {
  assertEquals(LEGACY_PENDING_UPLOAD_KEY, 'gryd.pendingUpload.v1');
  assertEquals(PENDING_QUEUE_KEY, 'gryd.pendingUpload.queue.v2');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LECTURE DÉFENSIVE — lire ne détruit jamais, et ne lève jamais
// ════════════════════════════════════════════════════════════════════════════

Deno.test('stockage vide/illisible → file vide, jamais d’exception vers l’app', () => {
  assertEquals(parsePendingQueue(null, null), []);
  assertEquals(parsePendingQueue('', ''), []);
  assertEquals(parsePendingQueue('{oops', '{oops'), []);
  assertEquals(parsePendingQueue('null', 'null'), []);
  assertEquals(parsePendingQueue('42', '"texte"'), []);
  assertEquals(parsePendingQueue('{"pas":"un tableau"}', null), []);
});

Deno.test('les entrées ININVOYABLES (sans clientRunId) sont écartées, les autres restent', () => {
  const raw = JSON.stringify([
    { payload: { source: 'gps' }, queuedAt: 1 }, // pas de clientRunId → inenvoyable
    null,
    'texte',
    { payload: payload('bonne'), queuedAt: 7 },
    { payload: { clientRunId: '' }, queuedAt: 2 }, // id vide → inenvoyable
  ]);
  const queue = parsePendingQueue(raw, null);
  assertEquals(ids(queue), ['bonne']);
  assertEquals(queue[0].queuedAt, 7);
});

Deno.test('un payload NU dans la file (build antérieur) est toléré, pas jeté', () => {
  const raw = JSON.stringify([payload('nu'), { payload: payload('enveloppe'), queuedAt: 5 }]);
  assertEquals(ids(parsePendingQueue(raw, null)), ['nu', 'enveloppe']);
});

// ════════════════════════════════════════════════════════════════════════════
// 5. LE PLAFOND — il refuse, il n'écrase pas
// ════════════════════════════════════════════════════════════════════════════

Deno.test('PLAFOND ENTRÉES : la file pleine REFUSE la nouvelle et n’en sacrifie AUCUNE', () => {
  const pleine = queueAll(
    ...Array.from({ length: PENDING_QUEUE_MAX_ENTRIES }, (_, i) => payload(`run-${i}`)),
  );
  assertEquals(pleine.length, PENDING_QUEUE_MAX_ENTRIES);
  const res = enqueuePending(pleine, payload('de-trop'), 5_000);
  assertEquals(res.accepted, false); // DIT à l'appelant : rien n'a été mis en file
  assertEquals(res.outcome, 'full_entries');
  assertEquals(ids(res.queue), ids(pleine)); // la plus ANCIENNE est toujours là
  assertEquals(res.queue.length, PENDING_QUEUE_MAX_ENTRIES); // aucune éviction
});

Deno.test('PLAFOND OCTETS : une file déjà lourde refuse, sans rien perdre', () => {
  // ~2 Mo de trace : chaque point pèse ≈ 60 octets sérialisés.
  const gros = payload('enorme', Math.ceil(PENDING_QUEUE_MAX_BYTES / 55));
  const queue = queueAll(payload('petite'));
  const res = enqueuePending(queue, gros, 2_000);
  assertEquals(res.accepted, false);
  assertEquals(res.outcome, 'full_bytes');
  assertEquals(ids(res.queue), ['petite']);
});

Deno.test('une file VIDE accepte TOUJOURS : une longue sortie n’est jamais inenvoyable à vie', () => {
  const gros = payload('ultra', Math.ceil(PENDING_QUEUE_MAX_BYTES / 55));
  const res = enqueuePending([], gros, 3_000);
  assertEquals(res.accepted, true);
  assertEquals(res.outcome, 'queued');
  assertEquals(ids(res.queue), ['ultra']);
});

// ═══ « CETTE SORTIE-LÀ EST-ELLE DEDANS ? » — LA QUESTION QUE LE COMPTE NE
//     POUVAIT PAS RÉPONDRE (27/07/2026) ═══════════════════════════════════════

Deno.test('appartenance : la file répond SUR UNE SORTIE, pas sur son cardinal', () => {
  const queue = queueAll(payload('a'), payload('b'));
  assertEquals(hasPendingRun(queue, 'a'), true);
  assertEquals(hasPendingRun(queue, 'b'), true);
  assertEquals(hasPendingRun(queue, 'c'), false); // non vide, et pourtant absente
  assertEquals(hasPendingRun([], 'a'), false);
});

Deno.test('LE CAS DU PLAFOND : la file REFUSE, reste NON VIDE, et ne contient PAS la sortie', () => {
  // C'est le scénario complet du mensonge de E27, prouvé ici sur la file elle-
  // même : un compte (`queue.length`) dit « 12 en attente » à l'instant précis
  // où la sortie du joueur n'y est pas — parce que c'est ce plein-là qui l'a
  // fait refuser. Seule une question NOMINATIVE distingue les deux.
  const pleine = queueAll(
    ...Array.from({ length: PENDING_QUEUE_MAX_ENTRIES }, (_, i) => payload(`vieille-${i}`)),
  );
  const res = enqueuePending(pleine, payload('la-mienne'), 1_000);
  assertEquals(res.accepted, false);
  assertEquals(res.outcome, 'full_entries');
  assertEquals(res.queue.length, PENDING_QUEUE_MAX_ENTRIES); // le compte dit « plein »
  assertEquals(hasPendingRun(res.queue, 'la-mienne'), false); // la sortie, elle, n'y est pas
});

Deno.test('appartenance : une sortie RETIRÉE sur verdict serveur n’y est plus', () => {
  const queue = queueAll(payload('a'), payload('b'));
  assertEquals(hasPendingRun(removePending(queue, 'a'), 'a'), false);
  assertEquals(hasPendingRun(removePending(queue, 'a'), 'b'), true);
});

Deno.test('appartenance : une sortie RE-SOUMISE reste la MÊME entrée (idempotence)', () => {
  // `enqueuePending` remplace sur place quand le `clientRunId` est déjà là :
  // l'appartenance ne doit ni disparaître ni se dupliquer entre-temps.
  const queue = queueAll(payload('a'));
  const res = enqueuePending(queue, payload('a', 5), 2_000);
  assertEquals(res.accepted, true);
  assertEquals(res.outcome, 'replaced');
  assertEquals(res.queue.length, 1);
  assertEquals(hasPendingRun(res.queue, 'a'), true);
});

Deno.test('appartenance : une entrée relue depuis le STOCKAGE est reconnue', () => {
  // La question doit survivre à un kill : c'est le cas nominal de E27 rouvert.
  const relue = parsePendingQueue(serializePendingQueue(queueAll(payload('a'))), null);
  assertEquals(hasPendingRun(relue, 'a'), true);
  assertEquals(hasPendingRun(relue, 'jamais-vue'), false);
});

Deno.test('un payload sans clientRunId n’entre pas en file (rien à idempotencer)', () => {
  const res = enqueuePending([], { source: 'gps' } as unknown as IngestRunRequest, 1);
  assertEquals(res.accepted, false);
  assertEquals(res.outcome, 'invalid');
  assertEquals(res.queue.length, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// 6. UNE LECTURE EN ÉCHEC N'AUTORISE AUCUNE ÉCRITURE (27/07/2026)
//
// ⚠ LE DÉFAUT, DANS SA FORME EXACTE. `readQueue()` (lib/pendingUpload.ts) rend
// `{ queue: [], readable: false }` quand AsyncStorage JETTE. Ce `[]` est un
// repli syntaxique, pas une file vide — et il était lu comme une file vide :
// `queuePendingUpload` y ajoutait la sortie du jour et RÉÉCRIVAIT la clé avec
// UNE SEULE entrée. Le slot unique que cette FIFO existe pour supprimer,
// revenu : jusqu'à 12 sorties utilisateur détruites en silence, sur une simple
// lecture disque ratée suivie d'une écriture réussie. Le retrait après verdict
// (`onSettled`) avait le même trou, en pire : il aurait écrit une file VIDE.
// ════════════════════════════════════════════════════════════════════════════

/** Une lecture RÉUSSIE de la file. */
function lu(queue: readonly PendingEntry[]): QueueRead {
  return { readable: true, queue };
}

/** La lecture telle que le stockage la rend quand il a JETÉ : vide ET illisible. */
const ILLISIBLE: QueueRead = { readable: false, queue: [] };

Deno.test('LE SCÉNARIO DE DESTRUCTION — ce qu’une lecture illisible aurait écrit', () => {
  // On prouve d'abord le DÉGÂT, sur les fonctions pures et avec la séquence
  // exacte de `queuePendingUpload` (lire → enfiler → écrire). Sans la règle, la
  // file du disque — trois sorties — est remplacée par une file d'UNE entrée.
  const surLeDisque = queueAll(payload('run-lundi'), payload('run-mardi'), payload('run-mercredi'));
  const commeSiVide = enqueuePending([], payload('run-du-jour'), 5_000);
  assertEquals(commeSiVide.accepted, true);
  assertEquals(ids(commeSiVide.queue), ['run-du-jour']);
  assertEquals(ids(parsePendingQueue(serializePendingQueue(commeSiVide.queue), null)), [
    'run-du-jour',
  ]); // ← ce que la clé aurait contenu : trois sorties effacées
  assertEquals(ids(surLeDisque).length, 3); // ← ce qu'elle contenait vraiment

  // Et voici la règle qui l'interdit : depuis une lecture ILLISIBLE, aucun plan
  // d'écriture n'est produit. Rien n'est écrit, donc rien n'est détruit.
  const plan = planEnqueue(ILLISIBLE, payload('run-du-jour'), 5_000);
  assertEquals(plan.write, false);
  assertEquals(plan.outcome, 'unreadable');
});

Deno.test('AUCUN plan d’écriture ne naît d’une lecture illisible — quelle que soit l’entrée', () => {
  // Exhaustif sur ce qui varie : le payload (valide / inenvoyable) et l'instant.
  const payloads = [payload('a'), { source: 'gps' } as unknown as IngestRunRequest];
  for (const p of payloads) {
    for (const now of [0, 1_000, Date.now()]) {
      assertEquals(planEnqueue(ILLISIBLE, p, now).write, false, JSON.stringify({ p, now }));
    }
  }
  for (const id of ['a', 'inconnue', '']) {
    assertEquals(planRemoval(ILLISIBLE, id).write, false, id);
  }
});

Deno.test('le RETRAIT après verdict n’écrit pas une file vide sur une relecture ratée', () => {
  // Le pire cas : le drain a envoyé 'a', veut la retirer, et la relecture jette.
  // Écrire ici poserait `[]` sur le disque — 'b' et 'c' effacées alors qu'elles
  // n'étaient même pas parties.
  assertEquals(planRemoval(ILLISIBLE, 'a').write, false);
  // Lecture réussie : le retrait a bien lieu, et lui seul.
  const plan = planRemoval(lu(queueAll(payload('a'), payload('b'), payload('c'))), 'a');
  assert(plan.write);
  assertEquals(ids(plan.queue), ['b', 'c']);
});

Deno.test('une lecture RÉUSSIE écrit exactement ce que la file pure décide', () => {
  // La règle ne doit pas devenir une excuse pour ne plus rien écrire : sur une
  // lecture saine, `planEnqueue` rend le même verdict qu'`enqueuePending`.
  const queue = queueAll(payload('a'));
  const ajout = planEnqueue(lu(queue), payload('b'), 2_000);
  assert(ajout.write);
  assertEquals(ajout.outcome, 'queued');
  assertEquals(ids(ajout.queue), ['a', 'b']);

  const pleine = queueAll(
    ...Array.from({ length: PENDING_QUEUE_MAX_ENTRIES }, (_, i) => payload(`run-${i}`)),
  );
  const refus = planEnqueue(lu(pleine), payload('de-trop'), 3_000);
  assertEquals(refus.write, false);
  assertEquals(refus.outcome, 'full_entries'); // le plafond, PAS 'unreadable' : la cause reste exacte

  const invalide = planEnqueue(lu([]), { source: 'gps' } as unknown as IngestRunRequest, 1);
  assertEquals(invalide.write, false);
  assertEquals(invalide.outcome, 'invalid');
});

// ═══ LE BRANCHEMENT : le stockage passe VRAIMENT par la règle ════════════════
// Un test de comportement sur les fonctions pures ne peut pas voir un appelant
// qui les ignore — c'est exactement ce qui s'est produit : le drapeau `readable`
// existait déjà, et le chemin d'écriture ne le lisait pas. On relit donc la
// source du seul module qui touche AsyncStorage (même patron que
// `syncFactWiring.test.ts` : il tire `react-native`, il n'est pas importable ici).

Deno.test('BRANCHEMENT — le stockage n’écrit QUE sur un plan, jamais sur une file brute', () => {
  const SRC = Deno.readTextFileSync(new URL('./pendingUpload.ts', import.meta.url));
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(
    /planEnqueue\(read, payload, Date\.now\(\)\)/.test(code),
    'la mise en file ne passe plus par `planEnqueue` : une lecture illisible pourrait de nouveau ' +
      'écraser la file par une entrée unique',
  );
  assert(
    /planRemoval\(await readQueue\(\), entry\.payload\.clientRunId\)/.test(code),
    'le retrait après verdict ne passe plus par `planRemoval` : une relecture ratée en plein drain ' +
      'écrirait une file VIDE',
  );
  // Aucun appel direct aux primitives non gardées depuis ce module.
  assert(
    !/enqueuePending\(/.test(code) && !/removePending\(/.test(code),
    'le stockage appelle de nouveau la file NUE (sans la règle de lisibilité) : le trou est rouvert',
  );
  // Le rejeu non plus : il écrit la file MIGRÉE (slot v1 → v2) avant le premier
  // envoi. Partir d'une lecture illisible y écrirait une file amputée du v1.
  assert(
    /if \(!readable\) return EMPTY_REPORT;/.test(code),
    'le rejeu ne s’arrête plus sur une file illisible : sa migration écrirait par-dessus une file ' +
      'inconnue',
  );
});
