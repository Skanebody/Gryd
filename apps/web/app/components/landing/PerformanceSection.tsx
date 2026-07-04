'use client';

/**
 * Section Performance (#performance) : Score Forme en anneau SVG
 * (stroke-dashoffset animé au reveal) + 4 perf-cards, désormais reliées au
 * territoire (AMENDEMENT-05 §3.9) : bandeau « performance = arme » (+bonus
 * conquête plafonné par PERFORMANCE_BONUS_CAP réel, données fiables GRYD
 * Verified, records, hexes) + mini-hexes chartreuse dans les cards. Valeurs de
 * démonstration (lib/landing DEMO + TERRITORY_DEMO locales, fictives assumées,
 * déterministes), formatées via Intl selon la langue.
 */

import { PERFORMANCE_BONUS_CAP } from '@klaim/shared';
import { DEMO, TERRITORY_DEMO } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './PerformanceSection.module.css';

const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

/** Plafond réel du bonus performance, en % (+15 avec PERFORMANCE_BONUS_CAP = 1.15). */
const CAP_PCT = Math.round((PERFORMANCE_BONUS_CAP - 1) * 100);

// Chiffres de SHOWCASE du lien performance → territoire : TERRITORY_DEMO
// (lib/landing — fictifs assumés, déterministes, centralisés §4).

/** Strings locales §3.9 (AMENDEMENT-05 §4 : nouvelles strings hors dictionary.ts). */
const STRINGS = {
  fr: {
    stripAria: 'Ce que ta forme change sur la carte',
    bonusLabel: 'bonus conquête',
    bonusNote: (cap: string) => `plafonné à +${cap} %`,
    verifiedLabel: 'données fiables',
    verifiedNote: 'GRYD Verified',
    recordsLabel: 'records cette saison',
    hexesLabel: 'zones cette semaine',
    message: 'Plus tu progresses comme coureur, plus tes runs deviennent dangereux sur la carte.',
  },
  en: {
    stripAria: 'What your form changes on the map',
    bonusLabel: 'conquest bonus',
    bonusNote: (cap: string) => `capped at +${cap}%`,
    verifiedLabel: 'verified data',
    verifiedNote: 'GRYD Verified',
    recordsLabel: 'records this season',
    hexesLabel: 'zones this week',
    message: 'The stronger you get as a runner, the more dangerous your runs become on the map.',
  },
};

/** Mini-cluster d'hexes chartreuse (décoratif) — le lien visuel cards → territoire. */
function HexCluster() {
  return (
    <svg viewBox="0 0 40 26" className={styles.hexes} aria-hidden="true" focusable="false">
      <polygon points="10,7 15.2,10 15.2,16 10,19 4.8,16 4.8,10" />
      <polygon points="21,3 25.3,5.5 25.3,10.5 21,13 16.7,10.5 16.7,5.5" />
      <polygon points="30,11 34.3,13.5 34.3,18.5 30,21 25.7,18.5 25.7,13.5" />
    </svg>
  );
}

export function PerformanceSection() {
  const { copy, lang, formatInt, formatDecimal } = useLang();
  const t = STRINGS[lang];
  const ring = useReveal<HTMLDivElement>();
  const strip = useReveal<HTMLUListElement>();

  const score = useCountUp(DEMO.formScore, ring.shown);
  const km = useCountUp(DEMO.weekKm, ring.shown, { decimals: 1 });
  const runs = useCountUp(DEMO.weekRuns, ring.shown);
  const delta = useCountUp(DEMO.weekDeltaPct, ring.shown);

  const bonus = useCountUp(DEMO.weekDeltaPct, strip.shown);
  const verified = useCountUp(TERRITORY_DEMO.verifiedPct, strip.shown);
  const records = useCountUp(TERRITORY_DEMO.seasonRecords, strip.shown);
  const weekHexes = useCountUp(TERRITORY_DEMO.weekHexes, strip.shown);

  const cards = [
    { value: formatDecimal(km, 1), unit: 'km', label: copy.performance.cardKm, gain: false },
    { value: formatInt(runs), unit: '', label: copy.performance.cardRuns, gain: false },
    { value: DEMO.weekPace, unit: '/km', label: copy.performance.cardPace, gain: false, mono: true },
    { value: `+${formatInt(delta)}`, unit: '%', label: copy.performance.cardDelta, gain: true },
  ];

  /* Lien performance → territoire (§3.9) : +bonus (gain → chartreuse), fiabilité, records, hexes. */
  const territory: { value: string; unit: string; label: string; note?: string; gain?: boolean }[] = [
    {
      value: `+${formatInt(bonus)}`,
      unit: '%',
      label: t.bonusLabel,
      note: t.bonusNote(formatInt(CAP_PCT)),
      gain: true,
    },
    { value: formatInt(verified), unit: '%', label: t.verifiedLabel, note: t.verifiedNote },
    { value: formatInt(records), unit: '', label: t.recordsLabel },
    { value: formatInt(weekHexes), unit: '', label: t.hexesLabel },
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
                  <HexCluster />
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

        {/* Performance = arme (AMENDEMENT-05 §3.9) : la forme se convertit en territoire. */}
        <Reveal delayMs={80}>
          <ul ref={strip.ref} className={styles.territoryStats} aria-label={t.stripAria}>
            {territory.map((stat) => (
              <li key={stat.label} className={`${ui.card} ${styles.tStat}`}>
                <span className={`${styles.tValue} ${stat.gain ? styles.tGain : ''}`}>
                  {stat.value}
                  {stat.unit ? <small className={styles.tUnit}>{stat.unit}</small> : null}
                </span>
                <span className={styles.tLabel}>{stat.label}</span>
                {stat.note ? <span className={styles.tNote}>{stat.note}</span> : null}
              </li>
            ))}
          </ul>
          <p className={styles.territoryMessage}>{t.message}</p>
        </Reveal>
      </div>
    </section>
  );
}
