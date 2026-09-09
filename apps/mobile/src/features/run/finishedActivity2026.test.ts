import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getFinishedActivity2026, resolveResultActivity2026, setFinishedActivity2026, type FinishedActivityEvidence2026 } from './finishedActivity2026.ts';
import { setResultOwner2026 } from './resultOwner2026.ts';
import type { LocalActivity2026 } from '../refonte/localActivityModel2026.ts';
import type { IngestRunResponse } from '@klaim/shared';

function activity(ownerId: string | null = 'runner-a'): LocalActivity2026 {
  return { clientRunId: 'recorded-run', ownerId, activity: 'run', distanceM: 1250, durationS: 670, startedAt: '2026-09-09T10:00:00Z', finishedAt: '2026-09-09T10:11:10Z', pending: ownerId !== null, traceSegments: [[{ lat: 48.87, lng: 2.35 }, { lat: 48.871, lng: 2.351 }]] };
}
const resolve = (ownerId: string | null | undefined, activities: LocalActivity2026[], finished: FinishedActivityEvidence2026 | null, localId?: string) => resolveResultActivity2026({ ownerId, activities, finished, localId });

Deno.test('un lien résultat seul ne prouve pas une sortie enregistrée et ne choisit pas la dernière archive', () => {
  const stored = activity();
  assertEquals(resolve('runner-a', [stored], null), null);
  assertEquals(resolve('runner-a', [stored], null, 'invented-id'), null);
  assertEquals(resolve('runner-a', [], null, stored.clientRunId), null);
  assertEquals(resolve('runner-a', [stored], null, stored.clientRunId)?.activity, stored);
});

Deno.test('la même identité de sortie ne permet jamais de lire l’archive d’un autre propriétaire', () => {
  const stored = activity();
  for (const owner of ['runner-b', null, undefined]) assertEquals(resolve(owner, [stored], null, stored.clientRunId), null);
  const guest = activity(null);
  assertEquals(resolve(null, [stored, guest], null, guest.clientRunId)?.activity, guest);
  assertEquals(resolve('runner-b', [guest], null, guest.clientRunId), null);
  assertEquals(resolve(undefined, [guest], null, guest.clientRunId), null);
});

Deno.test('un ancien enregistrement sans propriétaire n’est pas une sortie invitée', () => {
  const legacy = { ...activity(), ownerId: undefined } as unknown as LocalActivity2026;
  const evidence = { activity: legacy, archiveSaved: true, recoverySaved: true };
  for (const owner of [null, 'runner-a', undefined]) {
    assertEquals(resolve(owner, [legacy], evidence, legacy.clientRunId), null);
  }
});

Deno.test('échec d’archive : les mesures réellement sécurisées dans le buffer restent consultables par leur propriétaire', () => {
  for (const owner of ['runner-a', null]) {
    const evidence = { activity: activity(owner), archiveSaved: false, recoverySaved: true };
    setResultOwner2026(owner);
    setFinishedActivity2026(evidence);
    const remembered = getFinishedActivity2026(owner, evidence.activity.clientRunId);
    assertEquals(resolve(owner, [], remembered, evidence.activity.clientRunId), evidence);
    assertEquals(resolve(owner, [], remembered, 'another-run'), null);
    setResultOwner2026('runner-b');
    assertEquals(getFinishedActivity2026(), null);
    assertEquals(resolve('runner-b', [], evidence, evidence.activity.clientRunId), null);
    setResultOwner2026(owner);
    assertEquals(getFinishedActivity2026(), evidence, 'le buffer propriétaire n’est pas détruit par un changement de compte');
  }
});

Deno.test('des mesures jamais sauvegardées ne deviennent pas un résultat durable', () => {
  const evidence = { activity: activity(), archiveSaved: false, recoverySaved: false };
  assertEquals(resolve('runner-a', [], evidence, evidence.activity.clientRunId), null);
  assertEquals(resolve('runner-a', [{ ...activity(), distanceM: NaN }], null, 'recorded-run'), null);
  assertEquals(resolve('runner-a', [{ ...activity(), durationS: -1 }], null, 'recorded-run'), null);
});

Deno.test('un verdict reçu reste visible si la mise à jour de l’archive échoue, sans changer de sortie', () => {
  const stored = activity();
  const serverResult = { runId: 'server-recorded-run', status: 'valid', distanceM: 1250, durationS: 670 } as IngestRunResponse;
  const completed = { activity: { ...stored, pending: false, result: serverResult }, archiveSaved: true, recoverySaved: true };
  const resolved = resolve('runner-a', [stored], completed, stored.clientRunId);
  assertEquals(resolved?.activity.result, serverResult);
  assertEquals(resolved?.activity.pending, false);
  const otherRun = { ...completed, activity: { ...completed.activity, clientRunId: 'another-run' } };
  assertEquals(resolve('runner-a', [stored], otherRun, stored.clientRunId)?.activity.result, undefined);
});
