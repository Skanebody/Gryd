import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { currentResultOwner2026, isResultOwnerCurrent2026, resultOwnerEpoch2026, setResultOwner2026, subscribeResultOwner2026 } from './resultOwner2026.ts';
import { clearLastRunResult, getLastRunResult, setLastRunResult } from './runResult.ts';
import { getShareRun, isShareRunCurrent2026, setShareRun, shareCardFromResult, type ShareRunData } from '../share/shareRun.ts';
import { UNJUDGED_VERDICT } from '../share/narrative.ts';
import type { IngestRunResponse } from '@klaim/shared';

const scope = { ownerId: 'runner-a', clientRunId: 'recording-a' };
const result = { runId: 'server-run-a', distanceM: 1234, durationS: 670 } as IngestRunResponse;
function share(): ShareRunData { return { card: shareCardFromResult({ distanceKm: '1,23', clockLabel: '11:10' }), intention: null, mode: 'conquete', verdict: UNJUDGED_VERDICT }; }

Deno.test('autorité de session : invalide synchroniquement les callbacks et distingue invité de session inconnue', () => {
  setResultOwner2026(scope.ownerId);
  const armedEpoch = resultOwnerEpoch2026();
  const observed: (string | null | undefined)[] = [];
  const unsubscribe = subscribeResultOwner2026(() => observed.push(currentResultOwner2026()));
  setResultOwner2026(null);
  assertEquals(isResultOwnerCurrent2026(scope.ownerId, armedEpoch), false);
  assertEquals(isResultOwnerCurrent2026(null), true);
  setResultOwner2026(undefined);
  assertEquals(isResultOwnerCurrent2026(undefined), false);
  setResultOwner2026(scope.ownerId);
  assertEquals(isResultOwnerCurrent2026(scope.ownerId, armedEpoch), false, 'A → invité → A ne réarme pas un ancien callback');
  setResultOwner2026(scope.ownerId);
  unsubscribe();
  assertEquals(observed, [null, undefined, scope.ownerId]);
});

Deno.test('une réponse réseau tardive reste attachée au compte et à la sortie qui ont enregistré', () => {
  clearLastRunResult();
  setResultOwner2026('runner-b');
  setLastRunResult(result, scope);
  assertEquals(getLastRunResult(), null);
  assertEquals(getLastRunResult(scope.ownerId), null);
  setResultOwner2026(null);
  assertEquals(getLastRunResult(), null);
  setResultOwner2026(scope.ownerId);
  assertEquals(getLastRunResult(scope.ownerId, 'recording-b'), null);
  assertEquals(getLastRunResult(scope.ownerId, scope.clientRunId), result);
  clearLastRunResult();
  assertEquals(getLastRunResult(), null);
});

Deno.test('Studio : le changement A → B → A révoque le partage jusqu’à une nouvelle ouverture explicite', () => {
  const data = share();
  setResultOwner2026(scope.ownerId);
  assertEquals(setShareRun(data, scope), true);
  assertEquals(getShareRun(), data);
  setResultOwner2026('runner-b');
  assertEquals(getShareRun(), null);
  assertEquals(isShareRunCurrent2026(data, scope.ownerId), false);
  assertEquals(setShareRun(data, scope), false);
  setResultOwner2026(scope.ownerId);
  assertEquals(getShareRun(), null);
  assertEquals(isShareRunCurrent2026(data, scope.ownerId), false);
  assertEquals(setShareRun(data, scope), true);
  assertEquals(getShareRun(), data);
});

Deno.test('Studio invité : ses propres mesures sont exportables, aucune sortie du compte précédent', () => {
  const data = share();
  setResultOwner2026(null);
  assertEquals(setShareRun(data, { ownerId: null, clientRunId: 'guest-recording' }), true);
  assertEquals(isShareRunCurrent2026(data, null), true);
  setResultOwner2026(scope.ownerId);
  assertEquals(getShareRun(), null);
  setResultOwner2026(null);
  assertEquals(getShareRun(), null, 'il faut rouvrir volontairement la sortie locale');
  assertEquals(setShareRun(data, scope), false);
});

Deno.test('Studio : ouvrir une autre sortie révoque également l’export déjà préparé', () => {
  setResultOwner2026(scope.ownerId);
  const first = share(), second = share();
  setShareRun(first, scope);
  setShareRun(second, { ...scope, clientRunId: 'recording-a-2' });
  assertEquals(isShareRunCurrent2026(first, scope.ownerId), false);
  assertEquals(isShareRunCurrent2026(second, scope.ownerId), true);
  assertEquals(setShareRun(first, { ...scope, clientRunId: '' }), false);
});
