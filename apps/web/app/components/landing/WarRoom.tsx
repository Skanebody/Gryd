'use client';

/**
 * Section Salle de guerre (#warroom, AMENDEMENT-05 §3.5) — SECTION NOUVELLE.
 * - WarRoom : carte d'offensive crew (objectif, décompte, jauge, mini-carte
 *   du secteur avec hexes contestés --ennemi vs --ch).
 * - WarRoomSection : parent qui assemble WarRoom + LiveTerritoryFeed +
 *   CrewLeaderboard — l'intégrateur ne branche QUE lui dans page.tsx.
 * Données de démo fictives assumées et déterministes : lib/landing.ts (AMENDEMENT-05 §4).
 * Chiffres de règles réels : @klaim/shared (jamais en dur).
 */

import { useEffect, useState } from 'react';
import { CREW_MAX_MEMBERS, DECAY_DAYS, HEX_LOCK_HOURS, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { useLang } from './LangProvider';
import type { Lang } from './dictionary';
import { Icon } from '../ui/Icon';
import { Reveal } from './Reveal';
import { useReveal } from './useReveal';
import { OFFENSIVE, OFFENSIVE_HEXES_TAKEN, SECTOR_HEXES, SECTOR_VIEW_H, SECTOR_VIEW_W } from '../../../lib/landing';
import { LiveTerritoryFeed } from './LiveTerritoryFeed';
import { CrewLeaderboard } from './CrewLeaderboard';
import ui from './ui.module.css';
import styles from './WarRoom.module.css';

const STRINGS = {
  fr: {
    kicker: 'Saison 0 · en direct',
    title: 'SALLE DE GUERRE',
    sub: 'Offensives coordonnées, zones qui basculent, classements en direct. La carte ne dort jamais — ton crew non plus.',
    offensiveLabel: 'OFFENSIVE CREW',
    liveChip: 'EN COURS',
    objectiveLabel: 'Objectif',
    objectiveUnit: 'hexes',
    takenLabel: 'hexes pris',
    timeLabel: 'Temps restant',
    progressLabel: 'Progression',
    membersLabel: 'Membres actifs',
    rewardLabel: 'Récompense',
    rewardValue: 'Coffre Crew',
    mapAria: 'Mini-carte du secteur : hexes de ton crew en chartreuse, hexes ennemis en orange, zones contestées hachurées',
    legendCrew: 'Mon crew',
    legendEnemy: 'Ennemi',
    legendContested: 'Contesté',
    legendNeutral: 'Neutre',
    rules: `Lock ${HEX_LOCK_HOURS} h · Decay ${DECAY_DAYS} j · Saison ${SEASON_DURATION_WEEKS} semaines`,
    progressAria: 'Progression de l’offensive',
    timerAria: 'Temps restant de l’offensive',
  },
  en: {
    kicker: 'Season 0 · live',
    title: 'WAR ROOM',
    sub: 'Coordinated offensives, flipping zones, live rankings. The map never sleeps — neither does your crew.',
    offensiveLabel: 'CREW OFFENSIVE',
    liveChip: 'LIVE',
    objectiveLabel: 'Objective',
    objectiveUnit: 'hexes',
    takenLabel: 'hexes taken',
    timeLabel: 'Time left',
    progressLabel: 'Progress',
    membersLabel: 'Active members',
    rewardLabel: 'Reward',
    rewardValue: 'Crew Chest',
    mapAria: 'Sector mini-map: your crew’s hexes in chartreuse, enemy hexes in orange, contested zones hatched',
    legendCrew: 'My crew',
    legendEnemy: 'Enemy',
    legendContested: 'Contested',
    legendNeutral: 'Neutral',
    rules: `${HEX_LOCK_HOURS} h lock · ${DECAY_DAYS}-day decay · ${SEASON_DURATION_WEEKS}-week season`,
    progressAria: 'Offensive progress',
    timerAria: 'Offensive time remaining',
  },
} satisfies Record<Lang, Record<string, string>>;

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const HEX_CLASS: Record<string, string> = {
  crew: 'hexCrew',
  enemy: 'hexEnemy',
  neutral: 'hexNeutral',
  contested: 'hexContested',
};

/** Carte d'offensive — HUD tactique nocturne (bordures fines, chips mono). */
export function WarRoom() {
  const { lang, formatInt } = useLang();
  const s = STRINGS[lang];

  // Décompte animé : démarre de la valeur fixe (SSR stable), tick côté client.
  // prefers-reduced-motion → valeur statique, aucun tick.
  const [secondsLeft, setSecondsLeft] = useState<number>(OFFENSIVE.timeLeftSeconds);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Jauge : se remplit au reveal (transition 250 ms ease-out en CSS).
  const gauge = useReveal<HTMLDivElement>();

  return (
    <article className={`${ui.card} ${styles.warCard}`} aria-label={s.offensiveLabel}>
      <header className={styles.warHead}>
        <p className={styles.offensiveLabel}>
          <span className={styles.liveDot} aria-hidden="true" />
          {s.offensiveLabel}
        </p>
        <span className={styles.liveChip}>{s.liveChip}</span>
      </header>

      <h3 className={styles.zoneName}>{OFFENSIVE.zoneName}</h3>

      <div className={styles.warGrid}>
        <div className={styles.warInfo}>
          <div className={styles.countdownBlock}>
            <span className={ui.monoLabel}>{s.timeLabel}</span>
            <span className={styles.countdown} role="timer" aria-label={s.timerAria}>
              {formatCountdown(secondsLeft)}
            </span>
          </div>

          <div className={styles.progressBlock}>
            <div className={styles.progressHead}>
              <span className={ui.monoLabel}>{s.progressLabel}</span>
              <span className={styles.progressValue}>{OFFENSIVE.progressPct} %</span>
            </div>
            <div
              ref={gauge.ref}
              className={styles.gauge}
              role="progressbar"
              aria-label={s.progressAria}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={OFFENSIVE.progressPct}
            >
              <span
                className={styles.gaugeFill}
                style={{ width: gauge.shown ? `${OFFENSIVE.progressPct}%` : '0%' }}
              />
            </div>
            <p className={styles.progressSub}>
              {formatInt(OFFENSIVE_HEXES_TAKEN)} / {formatInt(OFFENSIVE.objectiveHexes)} {s.takenLabel}
            </p>
          </div>

          {/* Chips avec icônes de renfort : objectif = pin · membres = crew · récompense = badge. */}
          <dl className={styles.chips}>
            <div className={styles.chip}>
              <Icon name="pin" size={13} className={styles.chipIcon} />
              <dt>{s.objectiveLabel}</dt>
              <dd>
                {formatInt(OFFENSIVE.objectiveHexes)} {s.objectiveUnit}
              </dd>
            </div>
            <div className={styles.chip}>
              <Icon name="crew" size={13} className={styles.chipIcon} />
              <dt>{s.membersLabel}</dt>
              <dd>
                {OFFENSIVE.activeMembers} / {CREW_MAX_MEMBERS}
              </dd>
            </div>
            <div className={styles.chip}>
              <Icon name="badge" size={13} className={styles.chipIcon} />
              <dt>{s.rewardLabel}</dt>
              <dd>{s.rewardValue}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.warMap}>
          <svg
            viewBox={`0 0 ${SECTOR_VIEW_W} ${SECTOR_VIEW_H}`}
            className={styles.sectorSvg}
            role="img"
            aria-label={s.mapAria}
          >
            <defs>
              {/* Contesté = hachures ennemi + chartreuse (AMENDEMENT-05 §1). */}
              <pattern
                id="wr-contested"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="3" height="6" className={styles.patEnemy} />
                <rect x="3" width="3" height="6" className={styles.patCrew} />
              </pattern>
            </defs>
            {SECTOR_HEXES.map((hex, i) => (
              <polygon
                key={i}
                points={hex.points}
                className={`${styles.hex} ${styles[HEX_CLASS[hex.owner] ?? 'hexNeutral'] ?? ''}`}
              />
            ))}
          </svg>

          <ul className={styles.legend}>
            <li>
              <span className={`${styles.swatch} ${styles.swCrew}`} aria-hidden="true" />
              {s.legendCrew}
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swEnemy}`} aria-hidden="true" />
              {s.legendEnemy}
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swContested}`} aria-hidden="true" />
              {s.legendContested}
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swNeutral}`} aria-hidden="true" />
              {s.legendNeutral}
            </li>
          </ul>
        </div>
      </div>

      <footer className={styles.rulesStrip}>{s.rules}</footer>
    </article>
  );
}

/** Section complète « Salle de guerre » — seul export à brancher dans page.tsx. */
export function WarRoomSection() {
  const { lang } = useLang();
  const s = STRINGS[lang];

  return (
    <section id="warroom" className={ui.section} aria-labelledby="war-room-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{s.kicker}</p>
          <h2 id="war-room-title" className={ui.sectionTitle}>
            {s.title}
          </h2>
          <p className={ui.sectionSub}>{s.sub}</p>
        </Reveal>

        <div className={styles.layout}>
          <Reveal className={styles.mainCol}>
            <WarRoom />
          </Reveal>
          <Reveal delayMs={100} className={styles.sideCol}>
            <LiveTerritoryFeed />
          </Reveal>
        </div>

        <Reveal delayMs={150}>
          <CrewLeaderboard />
        </Reveal>
      </div>
    </section>
  );
}
