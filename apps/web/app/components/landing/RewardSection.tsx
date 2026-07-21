'use client';

/**
 * Victoire — ce qui se passe QUAND une course se termine : la zone bascule si
 * elle franchit le seuil réel, le crew monte, un badge tombe, la médaille de
 * secteur arrive, le bonus performance s'applique. Séquence rejouable.
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). La carte affichait
 * « +214 ZONES », « Paris Est bascule à 62 % », « Ton crew passe #3 (#4 → #3) »
 * et « +7 % de bonus » : le relevé d'un coureur qui n'existe pas, lisible comme
 * une capture d'écran. Les nombres inventés sont partis ; les DEUX nombres qui
 * restent sont des règles réelles de @klaim/shared — le seuil de bascule d'un
 * secteur et le plafond du bonus performance.
 *
 * La séquence est maintenant écrite au FUTUR : elle promet ce que tu verras,
 * elle ne raconte pas ce que quelqu'un aurait fait.
 * prefers-reduced-motion : tout s'affiche d'un bloc, sans mise en scène.
 */

import { useEffect, useState } from 'react';
import { PERFORMANCE_BONUS_CAP, SECTOR_CONTROL_THRESHOLDS } from '@klaim/shared';
import { useLang } from './LangProvider';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import { useToast } from './Toast';
import ui from './ui.module.css';
import styles from './RewardSection.module.css';

// ─── Mise en scène ───────────────────────────────────────────────────────────
/** Seuil RÉEL de bascule d'un secteur (@klaim/shared — jamais en dur). */
const ZONE_MAJORITY_PCT = Math.round(SECTOR_CONTROL_THRESHOLDS.controlled * 100);
/** Plafond RÉEL du bonus performance, en % (+15 avec PERFORMANCE_BONUS_CAP = 1.15). */
const BONUS_CAP_PCT = Math.round((PERFORMANCE_BONUS_CAP - 1) * 100);
const STEPS_TOTAL = 6;
const STEP_MS = 650;

const HEX_POINTS = '12,2.5 20.2,7.25 20.2,16.75 12,21.5 3.8,16.75 3.8,7.25';

/** Hexagone pointy-top pour le mini-cluster de l'aperçu story (déterministe). */
const hexPoints = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

const STORY_R = 10;
const STORY_OWN: ReadonlyArray<readonly [number, number]> = [
  [60, 26],
  [42.7, 26],
  [51.35, 41],
  [68.65, 41],
  [60, 56],
];
const STORY_DIM: ReadonlyArray<readonly [number, number]> = [
  [77.3, 26],
  [34.05, 41],
  [77.3, 56],
];

const STRINGS = {
  fr: {
    kicker: 'La victoire',
    title: 'Quand ta course se termine, la carte a changé.',
    sub: 'Pas un rapport de stats : une carte de victoire. Les zones tombent, le secteur bascule, ton crew monte, le badge claque.',
    stamp: 'ZONE CAPTURÉE',
    cardTitle: 'Ce que tu verras à la fin d’une course',
    zoneLine: (pct: string) => `Au-delà de ${pct} %, le secteur bascule de ton côté`,
    zoneAria: 'Seuil de bascule d’un secteur',
    threshold: (pct: string) => `seuil réel : ${pct} %`,
    rankLine: 'Ton crew monte au classement de secteur',
    rankSub: 'Le rang se gagne — il ne s’affiche pas avant.',
    badgeLine: 'Un badge peut tomber',
    badgeSub: 'ROUTE OPENED · pour une liaison encore jamais courue',
    medalLine: 'Et une médaille de secteur, si tu le tiens',
    medalSub: 'La médaille appartient au secteur, pas à la démo.',
    bonusValue: (pct: string) => `+${pct} %`,
    bonusLine: 'Bonus performance sur tes prochaines captures, plafonné',
    sequenceAria: 'Ce qui se passe à la fin d’une course',
    share: 'Partager en story',
    shareHint: 'Aperçu du FORMAT 9:16 — les chiffres seront les tiens, pas les nôtres.',
    shareToast: 'La carte de story arrive avec l’app — Saison 0.',
    previewAria:
      'Aperçu du format de carte de partage 9:16 : fond noir, secteur chartreuse, emplacement du chiffre héros',
    previewPlaceholder: 'ta capture',
    previewSeason: 'SAISON 0',
  },
  en: {
    kicker: 'The victory',
    title: 'When your run ends, the map has changed.',
    sub: 'Not a stats report: a victory card. Zones drop, the sector flips, your crew climbs, the badge lands.',
    stamp: 'ZONE CAPTURED',
    cardTitle: 'What you will see when a run ends',
    zoneLine: (pct: string) => `Past ${pct}%, the sector flips to your side`,
    zoneAria: 'Sector flip threshold',
    threshold: (pct: string) => `real threshold: ${pct}%`,
    rankLine: 'Your crew climbs the sector leaderboard',
    rankSub: 'A rank is earned — it is not displayed beforehand.',
    badgeLine: 'A badge may drop',
    badgeSub: 'ROUTE OPENED · for a link nobody has run yet',
    medalLine: 'And a sector medal, if you hold it',
    medalSub: 'The medal belongs to the sector, not to a demo.',
    bonusValue: (pct: string) => `+${pct}%`,
    bonusLine: 'Performance bonus on your next captures, capped',
    sequenceAria: 'What happens when a run ends',
    share: 'Share to story',
    shareHint: '9:16 FORMAT preview — the numbers will be yours, not ours.',
    shareToast: 'Story cards ship with the app — Season 0.',
    previewAria:
      '9:16 share-card format preview: black background, chartreuse cluster, hero-number slot',
    previewPlaceholder: 'your capture',
    previewSeason: 'SEASON 0',
  },
} as const;

export function RewardSection() {
  const { lang, copy, formatInt } = useLang();
  const t = STRINGS[lang];
  const card = useReveal<HTMLDivElement>();
  const { showToast } = useToast();
  const [seq, setSeq] = useState(0); // incrémenté par « Relancer l'animation »
  const [step, setStep] = useState(0); // 0 = rien · 1..STEPS_TOTAL = séquence

  useEffect(() => {
    if (!card.shown) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(STEPS_TOTAL); // pas de mise en scène : tout d'un bloc
      return;
    }
    setStep(1);
    let current = 1;
    const id = window.setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= STEPS_TOTAL) window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [card.shown, seq]);

  /* La jauge illustre le SEUIL, pas un score : elle s'arrête pile dessus. */
  const zonePct = step >= 2 ? ZONE_MAJORITY_PCT : 0;
  const seqClass = (n: number) => `${styles.seqItem} ${step >= n ? styles.seqShown : ''}`;

  return (
    <section className={ui.section} aria-labelledby="reward-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{t.kicker}</p>
          <h2 id="reward-title" className={ui.sectionTitle}>
            {t.title}
          </h2>
          <p className={ui.sectionSub}>{t.sub}</p>
        </Reveal>

        <div className={styles.grid}>
          <div
            ref={card.ref}
            className={`${ui.card} ${styles.resultCard} ${card.shown ? styles.cardShown : ''}`}
          >
            <div className={styles.cardHead}>
              <span className={ui.monoLabel}>{t.cardTitle}</span>
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

            {/* Stamp final — --or réservé au contexte victoire (AMENDEMENT-05 §1). */}
            <span
              className={`${styles.stamp} ${step >= STEPS_TOTAL ? styles.stampShown : ''}`}
              aria-hidden={step < STEPS_TOTAL}
            >
              {t.stamp}
            </span>

            <ol className={styles.sequence} aria-label={t.sequenceAria}>
              {/* 2 — la zone bascule : la jauge franchit le seuil. */}
              <li className={seqClass(2)}>
                <span className={`${styles.aside} ${styles.asideGain}`} aria-hidden="true">
                  {formatInt(ZONE_MAJORITY_PCT)} %
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.zoneLine(formatInt(ZONE_MAJORITY_PCT))}</p>
                  <div
                    className={styles.zoneTrack}
                    role="progressbar"
                    aria-label={t.zoneAria}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={zonePct}
                  >
                    <div className={styles.zoneFill} style={{ width: `${zonePct}%` }} />
                    <span
                      className={styles.zoneTick}
                      style={{ left: `${ZONE_MAJORITY_PCT}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className={styles.seqSub}>{t.threshold(formatInt(ZONE_MAJORITY_PCT))}</p>
                </div>
              </li>

              {/* 3 — rank-up crew : flèche + nouveau rang qui pop. */}
              <li className={seqClass(3)}>
                {/* Plus de « #4 → #3 » : aucun rang n'a été calculé pour personne. */}
                <span className={styles.aside} aria-hidden="true">
                  <svg className={styles.rankArrow} viewBox="0 0 24 24" width="14" height="14">
                    <path
                      d="M12 20V5m0 0-6 6m6-6 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.rankLine}</p>
                  <p className={styles.seqSub}>{t.rankSub}</p>
                </div>
              </li>

              {/* 4 — badge hexagonal qui POP avec halo --or (victoire/médaille, §1). */}
              <li className={seqClass(4)}>
                <span className={`${styles.aside} ${styles.badgePop}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="30" height="30">
                    <polygon points={HEX_POINTS} fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="m8.6 12.2 2.4 2.4 4.4-4.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.badgeLine}</p>
                  <p className={styles.seqSub}>{t.badgeSub}</p>
                </div>
              </li>

              {/* 5 — MÉDAILLE de secteur (--or : victoire/médaille, §1) qui pop après le badge. */}
              <li className={seqClass(5)}>
                <span className={`${styles.aside} ${styles.badgePop} ${styles.medalPop}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="30" height="30">
                    {/* Rubans + médaille (trait 1,5, charte §F). */}
                    <path
                      d="M8.2 3l2.3 6.2M15.8 3l-2.3 6.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="15" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="m9.7 15.2 1.6 1.6 3-3.3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.medalLine}</p>
                  <p className={styles.seqSub}>{t.medalSub}</p>
                </div>
              </li>

              {/* 6 — bonus performance (gain → chartreuse). */}
              <li className={seqClass(6)}>
                <span className={`${styles.aside} ${styles.asideGain}`} aria-hidden="true">
                  {t.bonusValue(formatInt(BONUS_CAP_PCT))}
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.bonusLine}</p>
                </div>
              </li>
            </ol>

            {/* Reroll conservé : bouton ghost (le chartreuse reste aux gains). */}
            <button
              type="button"
              className={`${ui.btnGhost} ${styles.replay}`}
              onClick={() => {
                setStep(0);
                setSeq((i) => i + 1);
              }}
            >
              {copy.reward.replay}
            </button>
          </div>

          {/* Aperçu story 9:16 — statique (pas de génération), noir/chartreuse. */}
          <Reveal delayMs={120} className={styles.shareCol}>
            <div className={styles.storyCard} role="img" aria-label={t.previewAria}>
              <div className={styles.storyTop}>
                <span className={styles.storyBrand}>GRYD</span>
                <span className={styles.storySeason}>{t.previewSeason}</span>
              </div>
              <svg className={styles.storyMap} viewBox="0 0 120 80" aria-hidden="true">
                {STORY_DIM.map(([cx, cy]) => (
                  <polygon key={`${cx}-${cy}`} points={hexPoints(cx, cy, STORY_R)} className={styles.storyHexDim} />
                ))}
                {STORY_OWN.map(([cx, cy]) => (
                  <polygon key={`${cx}-${cy}`} points={hexPoints(cx, cy, STORY_R)} className={styles.storyHexOwn} />
                ))}
                <polyline points="38,16 51,33 60,41 60,56" className={styles.storyRoute} />
              </svg>
              {/* Emplacement du chiffre héros — VIDE. L'ancien aperçu affichait
                  « +214 ZONES · PARIS EST · 62 % », soit une story fabriquée. */}
              <div>
                <p className={styles.storyNumber}>+—</p>
                <p className={styles.storyUnit}>{copy.phone.hexesUnit}</p>
                <p className={styles.storyFooter}>{t.previewPlaceholder}</p>
              </div>
            </div>
            <button
              type="button"
              className={`${ui.btnGhost} ${styles.shareBtn}`}
              onClick={() => showToast(t.shareToast)}
            >
              {t.share}
            </button>
            <p className={styles.shareHint}>{t.shareHint}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
