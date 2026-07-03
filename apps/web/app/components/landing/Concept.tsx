'use client';

/**
 * Section Concept (#concept) : kicker + titre + 3 feature-cards avec tilt 3D
 * au hover (pointer fine uniquement, coupé sous prefers-reduced-motion).
 */

import { useRef, type PointerEvent } from 'react';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './Concept.module.css';

const ICONS = [
  // Hexagone (capture réelle)
  <svg key="hex" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <polygon
      points="12,2.5 20.2,7.25 20.2,16.75 12,21.5 3.8,16.75 3.8,7.25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>,
  // Pin de carte (zones adaptatives)
  <svg key="pin" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path
      d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
  // Bouclier-check (GRYD Verify)
  <svg key="shield" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path
      d="M12 2.8 19.5 6v6.1c0 4.6-3.2 7.6-7.5 9.1-4.3-1.5-7.5-4.5-7.5-9.1V6L12 2.8Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="m8.6 12 2.4 2.4 4.4-4.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
];

function TiltCard({
  icon,
  title,
  body,
  delayMs,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  delayMs: number;
}) {
  const cardRef = useRef<HTMLElement | null>(null);

  const canTilt = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onMove = (event: PointerEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el || !canTilt()) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(720px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-3px)`;
  };

  const onLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = '';
  };

  return (
    <Reveal delayMs={delayMs}>
      <article
        ref={cardRef}
        className={`${ui.card} ${styles.feature}`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <span className={styles.icon}>{icon}</span>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureBody}>{body}</p>
      </article>
    </Reveal>
  );
}

export function Concept() {
  const { copy } = useLang();

  return (
    <section id="concept" className={ui.section} aria-labelledby="concept-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{copy.concept.kicker}</p>
          <h2 id="concept-title" className={ui.sectionTitle}>
            {copy.concept.title}
          </h2>
          <p className={ui.sectionSub}>{copy.concept.sub}</p>
        </Reveal>

        <div className={styles.grid}>
          {copy.concept.features.map((feature, i) => (
            <TiltCard
              key={feature.title}
              icon={ICONS[i]}
              title={feature.title}
              body={feature.body}
              delayMs={i * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
