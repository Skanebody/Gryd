/** Session authority for transient result media. Undefined means unresolved, never guest. */
export type ResultOwner2026 = string | null;
export interface RunOwnerScope2026 { ownerId: ResultOwner2026; clientRunId: string }
let owner: ResultOwner2026 | undefined;
let epoch = 0;
const listeners = new Set<() => void>();
export function setResultOwner2026(next: ResultOwner2026 | undefined): void {
  if (next === owner) return;
  owner = next; epoch++;
  listeners.forEach(listener => listener());
}
export function currentResultOwner2026() { return owner; }
export function resultOwnerEpoch2026() { return epoch; }
export function isResultOwnerCurrent2026(expected: ResultOwner2026 | undefined, expectedEpoch = epoch) {
  return expected !== undefined && owner === expected && expectedEpoch === epoch;
}
export function subscribeResultOwner2026(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

/** Frozen producer ownership is independent of whichever account happens to be on screen later. */
export function createOwnedRunMemory2026<T>(invalidateOnSwitch = false) {
  let current: { scope: RunOwnerScope2026; value: T; epoch: number } | null = null;
  return {
    set(value: T, scope: RunOwnerScope2026) {
      if (scope.ownerId === undefined || !scope.clientRunId) return;
      current = { value, scope: { ...scope }, epoch };
    },
    get(requestedOwner = owner, clientRunId?: string): T | null {
      if (!current || !isResultOwnerCurrent2026(requestedOwner) || current.scope.ownerId !== requestedOwner ||
        clientRunId !== undefined && current.scope.clientRunId !== clientRunId || invalidateOnSwitch && current.epoch !== epoch) return null;
      return current.value;
    },
    clear() { current = null; },
  };
}
