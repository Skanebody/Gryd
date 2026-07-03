'use client';

/**
 * Section Performance (#performance) : Score Forme en anneau SVG
 * (stroke-dashoffset animé au reveal) + 4 perf-cards. Valeurs de démonstration
 * (lib/landing DEMO), formatées via Intl selon la langue.
 */

import { DEMO } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './PerformanceSection.module.css';

const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

export function PerformanceSection() {
  const { copy, formatInt, formatDecimal } = useLang();
  const ring = useReveal<HTMLDivElement>();

  const score = useCountUp(DEMO.formScore, ring.shown);
  const km = useCountUp(DEMO.weekKm, ring.shown, { decimals: 1 });
  const runs = useCountUp(DEMO.weekRuns, ring.shown);
  const delta = useCountUp(DEMO.weekDeltaPct, ring.shown);

  const cards = [
    { value: formatDecimal(km, 1), unit: 'km', label: copy.performance.cardKm, gain: false },
    { value: formatInt(runs), unit: '', label: copy.performance.cardRuns, gain: false },
    { value: DEMO.weekPace, unit: '/km', label: copy.performance.cardPace, gain: false, mono: true },
    { value: `+${formatInt(delta)}`, unit: '%', label: copy.performance.cardDelta, gain: true },
  ];

  return (
    <section id="performance" className={ui.section} aria-labelledby="performance-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{copy.performance.kicker}</p>
          <h2 id="performance-title" className={ui.sectionTitle}>
            {copy.performance.title}
          </h2>
          <p className={ui.sectionSub}>{copy.performance.sub}</p>
        </Reveal>

        <div className={styles.grid}>
          <div ref={ring.ref} className={`${ui.card} ${styles.ringCard}`}>
            <div className={styles.ringWrap}>
              <svg viewBox="0 0 140 140" className={styles.ringSvg} aria-hidden="true">
                <circle cx="70" cy="70" r={RING_R} className={styles.ringTrack} />
                <circle
                  cx="70"
                  cy="70"
                  r={RING_R}
                  className={styles.ringFill}
                  strokeDasharray={RING_C}
                  strokeDashoffset={ring.shown ? RING_C * (1 - DEMO.formScore / 100) : RING_C}
                />
              </svg>
              <div className={styles.ringCenter}>
                {/* Chiffre héros 400. */}
                <span className={styles.ringValue}>{formatInt(score)}</span>
                <span className={ui.monoLabel}>{copy.performance.ringLabel}</span>
              </div>
            </div>
          </div>

          <div className={styles.cards}>
            {cards.map((card, i) => (
              <Reveal key={card.label} delayMs={i * 70}>
                <div className={`${ui.card} ${styles.perfCard}`}>
                  <span
                    className={`${styles.perfValue} ${card.mono ? styles.perfMono : ''} ${card.gain ? styles.perfGain : ''}`}
                  >
                    {card.value}
                    {card.unit ? <small className={styles.perfUnit}>{card.unit}</small> : null}
                  </span>
                  <span className={styles.perfLabel}>{card.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
