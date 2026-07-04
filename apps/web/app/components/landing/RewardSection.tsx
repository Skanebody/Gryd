'use client';

/**
 * Victoire (AMENDEMENT-05 §3.6) — la result-card devient une carte de VICTOIRE :
 * séquence rejouable « +hexes (compteur) → la zone bascule (jauge qui franchit
 * le seuil réel SECTOR_CONTROL_THRESHOLDS.controlled) → rank-up crew → badge
 * qui pop → médaille de secteur (halo --or : contexte victoire, §1)
 * → bonus performance », stamp « ZONE CAPTURÉE » et aperçu story 9:16 statique.
 * Données de DÉMO déterministes (DEMO + constantes locales de mise en scène) :
 * la séquence ne démarre qu'au reveal côté client — SSR stable.
 * prefers-reduced-motion : tout s'affiche d'un bloc, sans mise en scène.
 */

import { useEffect, useState } from 'react';
import { SECTOR_CONTROL_THRESHOLDS } from '@klaim/shared';
import { DEMO } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import { useToast } from './Toast';
import ui from './ui.module.css';
import styles from './RewardSection.module.css';

// ─── Mise en scène (chiffres de SHOWCASE, pas des règles de jeu) ─────────────
const ZONE_START_PCT = 41; // la jauge démarre sous le seuil…
/** …et franchit le VRAI seuil « controlled » (@klaim/shared — jamais en dur). */
const ZONE_MAJORITY_PCT = Math.round(SECTOR_CONTROL_THRESHOLDS.controlled * 100);
const RANK_FROM = 4;
const RANK_TO = 3;
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
    zoneLine: (pct: string) => `Paris Est bascule à ${pct} %`,
    zoneAria: 'Contrôle de Paris Est',
    threshold: (pct: string) => `seuil ${pct} %`,
    rankLine: (rank: string) => `Ton crew passe #${rank}`,
    rankSub: (from: string, to: string) => `#${from} → #${to} au classement de secteur`,
    badgeLine: 'Badge Route Opened débloqué',
    badgeSub: 'ROUTE OPENED · liaison inédite',
    medalLine: 'Médaille de secteur décrochée',
    bonusValue: (pct: string) => `+${pct} %`,
    bonusLine: 'Bonus performance sur tes prochaines captures',
    sequenceAria: 'Séquence de victoire',
    share: 'Partager en story',
    shareHint: 'Aperçu 9:16 — chaque story sort aux couleurs exactes de la carte.',
    shareToast: 'La carte de story arrive avec l’app — Saison 0.',
    previewAria:
      'Aperçu statique de la carte de partage 9:16 : fond noir, secteur chartreuse, chiffre héros',
    previewZone: 'PARIS EST',
    previewSeason: 'SAISON 0',
  },
  en: {
    kicker: 'The victory',
    title: 'When your run ends, the map has changed.',
    sub: 'Not a stats report: a victory card. Zones drop, the sector flips, your crew climbs, the badge lands.',
    stamp: 'ZONE CAPTURED',
    zoneLine: (pct: string) => `Paris Est flips to ${pct}%`,
    zoneAria: 'Paris Est control',
    threshold: (pct: string) => `${pct}% threshold`,
    rankLine: (rank: string) => `Your crew climbs to #${rank}`,
    rankSub: (from: string, to: string) => `#${from} → #${to} on the sector leaderboard`,
    badgeLine: 'Route Opened badge unlocked',
    badgeSub: 'ROUTE OPENED · brand-new link',
    medalLine: 'Sector medal earned',
    bonusValue: (pct: string) => `+${pct}%`,
    bonusLine: 'Performance bonus on your next captures',
    sequenceAria: 'Victory sequence',
    share: 'Share to story',
    shareHint: '9:16 preview — every story ships in the exact map colours.',
    shareToast: 'Story cards ship with the app — Season 0.',
    previewAria:
      'Static 9:16 share-card preview: black background, chartreuse cluster, hero number',
    previewZone: 'PARIS EST',
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

  const shownHexes = useCountUp(DEMO.hexesGained, card.shown && step >= 1);
  const zonePct = step >= 2 ? DEMO.zoneControlPct : ZONE_START_PCT;
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

            {/* Stamp final — --or réservé au contexte victoire (AMENDEMENT-05 §1). */}
            <span
              className={`${styles.stamp} ${step >= STEPS_TOTAL ? styles.stampShown : ''}`}
              aria-hidden={step < STEPS_TOTAL}
            >
              {t.stamp}
            </span>

            {/* Chiffre héros : graisse 400, chartreuse = gain. */}
            <p className={styles.heroNumber}>
              +{formatInt(shownHexes)}
              <span className={styles.heroUnit}>{copy.phone.hexesUnit}</span>
            </p>

            <ol className={styles.sequence} aria-label={t.sequenceAria}>
              {/* 2 — la zone bascule : la jauge franchit le seuil. */}
              <li className={seqClass(2)}>
                <span className={`${styles.aside} ${styles.asideGain}`} aria-hidden="true">
                  {formatInt(DEMO.zoneControlPct)} %
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.zoneLine(formatInt(DEMO.zoneControlPct))}</p>
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
                  <span className={styles.rankNew}>#{formatInt(RANK_TO)}</span>
                </span>
                <div className={styles.seqBody}>
                  <p className={styles.seqText}>{t.rankLine(formatInt(RANK_TO))}</p>
                  <p className={styles.seqSub}>{t.rankSub(formatInt(RANK_FROM), formatInt(RANK_TO))}</p>
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
                  <p className={styles.seqSub}>
                    {t.previewZone} · {t.previewSeason}
                  </p>
                </div>
              </li>

              {/* 6 — bonus performance (gain → chartreuse). */}
              <li className={seqClass(6)}>
                <span className={`${styles.aside} ${styles.asideGain}`} aria-hidden="true">
                  {t.bonusValue(formatInt(DEMO.weekDeltaPct))}
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
              <div>
                <p className={styles.storyNumber}>+{formatInt(DEMO.hexesGained)}</p>
                <p className={styles.storyUnit}>{copy.phone.hexesUnit}</p>
                <p className={styles.storyFooter}>
                  {t.previewZone} · {formatInt(DEMO.zoneControlPct)} %
                </p>
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
