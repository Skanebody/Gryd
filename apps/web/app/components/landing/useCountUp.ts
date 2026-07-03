'use client';

/**
 * Compteur animé ease-out cubic (charte §G : le chiffre héros compte en ~800 ms).
 * prefers-reduced-motion → valeur affichée directement, sans animation.
 * Le formatage (Intl.NumberFormat selon la langue) est laissé à l'appelant.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from '@klaim/shared';

export function useCountUp(
  target: number,
  active: boolean,
  { durationMs = motion.celebrationCountMs, decimals = 0 }: { durationMs?: number; decimals?: number } = {},
): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const factor = 10 ** decimals;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - p) ** 3; // ease-out cubic
      setValue(Math.round(target * eased * factor) / factor);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, active, durationMs, decimals]);

  return value;
}
