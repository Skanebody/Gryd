'use client';

import type { ReactNode } from 'react';
import { useReveal } from './useReveal';
import styles from './Reveal.module.css';

/** Wrapper de reveal on scroll (translateY+opacité ; opacité seule en reduced-motion). */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${shown ? styles.shown : ''} ${className ?? ''}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
