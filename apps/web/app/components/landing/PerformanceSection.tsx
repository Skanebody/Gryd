'use client';

/**
 * Section Performance (#performance) : « ta forme est une arme ».
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Cette section montrait
 * le tableau de bord d'un coureur qui n'existe pas : Score Forme 82 dans un
 * anneau rempli aux deux tiers, 24,8 km cette semaine, 4 courses, 5:42/km,
 * +7 % vs la semaine dernière — puis un bandeau « 88 % données fiables ·
 * 3 records cette saison · 412 zones cette semaine » qui ressemblait à des
 * chiffres de traction. Rien de tout ça n'a été mesuré.
 *
 * Ce qui reste : ce que GRYD SUIVRA (les quatre indicateurs, nommés, sans
 * valeur) et la seule vraie règle du lien perf → territoire, le plafond
 * PERFORMANCE_BONUS_CAP lu dans @klaim/shared. Un anneau vide qui annonce ce
 * qu'il affichera est honnête ; un anneau rempli d'un score inventé ne l'est pas.
 */

import { PERFORMANCE_BONUS_CAP } from '@klaim/shared';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './PerformanceSection.module.css';

const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

/** Plafond réel du bonus performance, en % (+15 avec PERFORMANCE_BONUS_CAP = 1.15). */
const CAP_PCT = Math.round((PERFORMANCE_BONUS_CAP - 1) * 100);

const STRINGS = {
  fr: {
    ringEmpty: 'Ton score apparaîtra ici, après tes premières courses.',
    tracksLabel: 'Ce que GRYD suit',
    bonusLabel: 'bonus conquête maximum',
    bonusNote: 'Le plafond est une règle du jeu, pas une promesse marketing.',
    message:
      'Plus tu progresses comme coureur, plus tes runs deviennent dangereux sur la carte — dans la limite de ce plafond, jamais au-delà.',
  },
  en: {
    ringEmpty: 'Your score will appear here, after your first runs.',
    tracksLabel: 'What GRYD tracks',
    bonusLabel: 'maximum conquest bonus',
    bonusNote: 'The cap is a game rule, not a marketing promise.',
    message:
      'The stronger you get as a runner, the more dangerous your runs become on the map — up to that cap, never beyond it.',
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
  const { copy, lang, formatInt } = useLang();
  const t = STRINGS[lang];

  /* Les quatre indicateurs sont NOMMÉS, pas chiffrés : la landing dit ce que
     l'app mesurera, elle ne prétend pas l'avoir déjà mesuré. */
  const tracked = [
    copy.performance.cardKm,
    copy.performance.cardRuns,
    copy.performance.cardPace,
    copy.performance.cardDelta,
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
          <div className={`${ui.card} ${styles.ringCard}`}>
            <div className={styles.ringWrap}>
              {/* Anneau VIDE : la piste seule. L'ancien arc chartreuse dessinait
                  un score de 82 qui n'appartenait à personne. */}
              <svg viewBox="0 0 140 140" className={styles.ringSvg} aria-hidden="true">
                <circle cx="70" cy="70" r={RING_R} className={styles.ringTrack} />
                <circle
                  cx="70"
                  cy="70"
                  r={RING_R}
                  className={styles.ringFill}
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C}
                />
              </svg>
              <div className={styles.ringCenter}>
                <span className={ui.monoLabel}>{copy.performance.ringLabel}</span>
              </div>
            </div>
            <p className={styles.ringEmpty}>{t.ringEmpty}</p>
          </div>

          <div className={styles.cards}>
            <p className={`${ui.monoLabel} ${styles.tracksLabel}`}>{t.tracksLabel}</p>
            <ul className={styles.trackedList}>
              {tracked.map((label, i) => (
                <Reveal key={label} delayMs={i * 70}>
                  <li className={`${ui.card} ${styles.perfCard}`}>
                    <HexCluster />
                    <span className={styles.perfLabel}>{label}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Le seul chiffre de la section : le plafond RÉEL du bonus performance. */}
        <Reveal delayMs={80}>
          <div className={`${ui.card} ${styles.capCard}`}>
            <span className={styles.capValue}>
              +{formatInt(CAP_PCT)}
              <small className={styles.capUnit}>%</small>
            </span>
            <span className={styles.capLabel}>{t.bonusLabel}</span>
            <span className={styles.capNote}>{t.bonusNote}</span>
          </div>
          <p className={styles.territoryMessage}>{t.message}</p>
        </Reveal>
      </div>
    </section>
  );
}
