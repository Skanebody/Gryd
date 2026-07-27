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
  type SendVerdict,
  drainPendingQueue,
  enqueuePending,
  isPermanentHttpStatus,
  parsePendingQueue,
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

Deno.test('un payload sans clientRunId n’entre pas en file (rien à idempotencer)', () => {
  const res = enqueuePending([], { source: 'gps' } as unknown as IngestRunRequest, 1);
  assertEquals(res.accepted, false);
  assertEquals(res.outcome, 'invalid');
  assertEquals(res.queue.length, 0);
});
