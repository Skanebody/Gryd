/** Geometry of equal-width, stationary touch targets; only the selection moves. */
export function selectionFrame2026(container: number, count: number, index: number, inset: number, gap: number) {
  const n = Math.max(1, Math.floor(count));
  const width = Math.max(0, (container - inset * 2 - Math.max(0, n - 1) * gap) / n);
  const active = Math.min(n - 1, Math.max(0, Math.floor(index)));
  return { width, x: active * (width + gap) };
}
