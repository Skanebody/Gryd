/**
 * GRYD — bus léger de refresh carte après ingest_run / pending upload.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let generation = 0;

export function getMapDataGeneration(): number {
  return generation;
}

export function notifyMapDataChanged(): void {
  generation += 1;
  for (const fn of listeners) fn();
}

export function subscribeMapDataChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
