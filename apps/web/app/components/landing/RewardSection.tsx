'use client';

/**
 * Moment reward : result-card animée (chiffre héros +N HEXES, breakdown,
 * 3 jauges) + reroll « Relancer l'animation » + 3 badges.
 * Les POINTS sont CALCULÉS depuis @klaim/shared (POINTS_NEUTRAL_HEX/STOLEN/
 * DEFENDED) — aucun barème en dur. Badges différenciés par intensité de glow
 * chartreuse/blanc et libellé, jamais par teinte (écart charte du brouillon corrigé).
 */

import { useMemo, useState } from 'react';
import {
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
  POINTS_STOLEN_HEX,
} from '@klaim/shared';
import { DEMO } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './RewardSection.module.css';

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export function RewardSection() {
  const { copy, formatInt } = useLang();
  const card = useReveal<HTMLDivElement>();
  const [rollIndex, setRollIndex] = useState(0);

  const roll = useMemo(() => {
    if (rollIndex === 0) {
      return {
        hexes: DEMO.hexesGained,
        stolen: DEMO.hexesStolen,
        defended: DEMO.hexesDefended,
        level: DEMO.levelPct,
        pass: DEMO.passPct,
        form: DEMO.formScore,
      };
    }
    const hexes = randomInt(DEMO.simHexGainMin, DEMO.simHexGainMax);
    return {
      hexes,
      stolen: randomInt(10, Math.max(11, Math.round(hexes * 0.25))),
      defended: randomInt(20, Math.max(21, Math.round(hexes * 0.35))),
      level: randomInt(30, 90),
      pass: randomInt(15, 80),
      form: randomInt(60, 95),
    };
  }, [rollIndex]);

  // Barème @klaim/shared : +neutre / +volé / +défendu.
  const neutral = Math.max(0, roll.hexes - roll.stolen - roll.defended);
  const points =
    neutral * POINTS_NEUTRAL_HEX +
    roll.stolen * POINTS_STOLEN_HEX +
    roll.defended * POINTS_DEFENDED_HEX;

  const shownHexes = useCountUp(roll.hexes, card.shown);
  const shownStolen = useCountUp(roll.stolen, card.shown);
  const shownDefended = useCountUp(roll.defended, card.shown);
  const shownPoints = useCountUp(points, card.shown);

  const gauges = [
    { label: copy.reward.gaugeLevel, pct: roll.level },
    { label: copy.reward.gaugePass, pct: roll.pass },
    { label: copy.reward.gaugeForm, pct: roll.form },
  ];

  return (
    <section className={ui.section} aria-labelledby="reward-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{copy.reward.kicker}</p>
          <h2 id="reward-title" className={ui.sectionTitle}>
            {copy.reward.title}
          </h2>
          <p className={ui.sectionSub}>{copy.reward.sub}</p>
        </Reveal>

        <div className={styles.grid}>
          <div
            ref={card.ref}
            className={`${ui.card} ${styles.resultCard} ${card.shown ? styles.cardShown : ''}`}
          >
            <div className={styles.cardHead}>
              <span className={ui.monoLabel}>{copy.phone.runValidated}</span>
              <span className={styles.verified}>
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                  <path
                    d="M12 2.8 19.5 6v6.1c0 4.6-3.2 7.6-7.5 9.1-4.3-1.5-7.5-4.5-7.5-9.1V6L12 2.8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path d="m8.6 12 2.4 2.4 4.4-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                {copy.reward.verified}
              </span>
            </div>

            {/* Chiffre héros : graisse 400, chartreuse = gain. */}
            <p className={styles.heroNumber}>
              +{formatInt(shownHexes)}
              <span className={styles.heroUnit}>{copy.phone.hexesUnit}</span>
            </p>

            <dl className={styles.breakdown}>
              <div className={styles.breakItem}>
                <dt className={ui.monoLabel}>{copy.reward.stolen}</dt>
                <dd>{formatInt(shownStolen)}</dd>
              </div>
              <div className={styles.breakItem}>
                <dt className={ui.monoLabel}>{copy.reward.defended}</dt>
                <dd>{formatInt(shownDefended)}</dd>
              </div>
              <div className={styles.breakItem}>
                <dt className={ui.monoLabel}>{copy.reward.points}</dt>
                <dd>{formatInt(shownPoints)}</dd>
              </div>
            </dl>

            <div className={styles.gauges}>
              {gauges.map((gauge) => (
                <div key={gauge.label} className={styles.gauge}>
                  <div className={styles.gaugeHead}>
                    <span className={ui.monoLabel}>{gauge.label}</span>
                    <span className={styles.gaugePct}>{formatInt(gauge.pct)} %</span>
                  </div>
                  <div
                    className={styles.track}
                    role="progressbar"
                    aria-label={gauge.label}
                    aria-valuenow={gauge.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={styles.fill}
                      style={{ width: card.shown ? `${gauge.pct}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Reroll : bouton ghost (le chartreuse reste aux gains de la carte). */}
            <button
              type="button"
              className={`${ui.btnGhost} ${styles.replay}`}
              onClick={() => setRollIndex((i) => i + 1)}
            >
              {copy.reward.replay}
            </button>
          </div>

          <div className={styles.badges}>
            {copy.reward.badges.map((badge, i) => (
              <Reveal key={badge.name} delayMs={i * 90}>
                {/* Différenciation par glow + libellé, pas par teinte (charte C.3). */}
                <div className={`${styles.badge} ${[styles.badgeSoft, styles.badgeFlat, styles.badgeLegend][i] ?? ''}`}>
                  <span className={styles.badgeHex} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22">
                      <polygon
                        points="12,2.5 20.2,7.25 20.2,16.75 12,21.5 3.8,16.75 3.8,7.25"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                  <span className={styles.badgeName}>{badge.name}</span>
                  <span className={styles.badgeSub}>{badge.sub}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
