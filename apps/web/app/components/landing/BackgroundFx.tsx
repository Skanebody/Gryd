'use client';

/**
 * Effets de fond globaux : grain très léger (charte §H : grain 2 %) et
 * cursor-glow chartreuse (desktop pointer:fine uniquement, coupé sous
 * prefers-reduced-motion). Surface chartreuse quasi nulle (doctrine C.3).
 */

import { useEffect, useRef } from 'react';
import styles from './BackgroundFx.module.css';

export function BackgroundFx() {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    let raf = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      const { clientX, clientY } = event;
      raf = requestAnimationFrame(() => {
        glow.style.opacity = '1';
        glow.style.transform = `translate3d(${clientX - 320}px, ${clientY - 320}px, 0)`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className={styles.grain} aria-hidden="true" />
      <div ref={glowRef} className={styles.glow} aria-hidden="true" />
    </>
  );
}
