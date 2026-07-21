'use client';

/**
 * Compteur animé ease-out cubic (charte §G : le chiffre héros compte en ~800 ms).
 * prefers-reduced-motion → valeur affichée directement, sans animation.
 * Le formatage (Intl.NumberFormat selon la langue) est laissé à l'appelant.
 *
 * ÉTAT VIDE ≠ « 0 » NU (décision fondateur 21/07/2026) : le hook renvoyait 0
 * tant que l'animation n'avait pas démarré. Résultat, au rendu serveur, sans
 * JavaScript, ou avant que la section entre dans le viewport, la page affichait
 * « 0 km² capturables · 0 semaines par saison · 0 coureurs par crew ». Trois
 * zéros nus, tous faux. Désormais la valeur VRAIE est renvoyée tant que
 * l'animation n'a pas commencé : le compte à rebours est un effet, pas la
 * source de vérité.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from '@klaim/shared';

export function useCountUp(
  target: number,
  active: boolean,
  { durationMs = motion.celebrationCountMs, decimals = 0 }: { durationMs?: number; decimals?: number } = {},
): number {
  /** `null` = l'animation n'a jamais tourné → on affiche la vraie valeur. */
  const [animated, setAnimated] = useState<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimated(target);
      return;
    }
    const factor = 10 ** decimals;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - p) ** 3; // ease-out cubic
      setAnimated(Math.round(target * eased * factor) / factor);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, active, durationMs, decimals]);

  return animated ?? target;
}
