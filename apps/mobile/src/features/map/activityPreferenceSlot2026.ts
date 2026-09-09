import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { parseActivity } from '../../ui/activityLens';

/** Per-surface state, with injected storage so hydration races are testable. */
export interface ActivityPreferenceSlot2026 {
  value: Activity;
  load: Promise<void> | null;
  decision: number;
  listeners: Set<(value: Activity) => void>;
}
export function createActivityPreferenceSlot2026(): ActivityPreferenceSlot2026 {
  return { value: DEFAULT_ACTIVITY, load: null, decision: 0, listeners: new Set() };
}
export function ensureActivityPreferenceSlot2026(slot: ActivityPreferenceSlot2026, read: () => Promise<string | null>): Promise<void> {
  if (!slot.load) {
    const decision = slot.decision;
    slot.load = Promise.resolve().then(read).then(raw => {
      // Replacing `load` does not cancel the earlier promise. Its result must
      // independently prove that no explicit choice happened since it began.
      if (slot.decision !== decision) return;
      const parsed = parseActivity(raw);
      if (parsed !== null && parsed !== slot.value) {
        slot.value = parsed;
        for (const listener of slot.listeners) listener(parsed);
      }
    }).catch(() => { /* Display preference remains usable when storage fails. */ });
  }
  return slot.load;
}
export function chooseActivityPreferenceSlot2026(slot: ActivityPreferenceSlot2026, value: Activity, write: (value: Activity) => Promise<void>): void {
  // Even choosing the currently displayed DEFAULT is a decision. It must both
  // defeat a pending disk read and replace any contrary value on disk.
  slot.decision++;
  slot.load = Promise.resolve();
  const changed = value !== slot.value;
  slot.value = value;
  if (changed) for (const listener of slot.listeners) listener(value);
  void Promise.resolve().then(() => write(value)).catch(() => {});
}
