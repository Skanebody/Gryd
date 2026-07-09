'use client';

/**
 * FAQ accordéon — 4 questions courtes (dictionary). Le détail gameplay
 * reste dans l'app ; les bornes Verify viennent de @klaim/shared.
 */

import { useState } from 'react';
import { RUN_AVG_PACE_MAX_S_KM, RUN_AVG_PACE_MIN_S_KM } from '@klaim/shared';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './FaqSection.module.css';

function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function FaqSection() {
  const { copy } = useLang();
  const [open, setOpen] = useState<number | null>(0);

  const items: ReadonlyArray<{ q: string; a: string }> = copy.faq.items.map((item) => ({
    q: item.q,
    a: item.a
      .replace('{min}', formatPace(RUN_AVG_PACE_MIN_S_KM))
      .replace('{max}', formatPace(RUN_AVG_PACE_MAX_S_KM)),
  }));

  return (
    <section id="faq" className={ui.section} aria-labelledby="faq-title">
      <div className={`${ui.inner} ${styles.narrow}`}>
        <Reveal>
          <p className={ui.kicker}>{copy.faq.kicker}</p>
          <h2 id="faq-title" className={ui.sectionTitle}>
            {copy.faq.title}
          </h2>
        </Reveal>

        <div className={styles.list}>
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delayMs={i * 60}>
                <div className={styles.item}>
                  <h3 className={styles.question}>
                    <button
                      type="button"
                      id={`faq-btn-${i}`}
                      className={styles.trigger}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span>{item.q}</span>
                      <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    className={styles.panel}
                    hidden={!isOpen}
                  >
                    <p className={styles.answer}>{item.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
