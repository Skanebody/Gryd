'use client';

/**
 * Compte à rebours Saison 0 du hero war room (AMENDEMENT-05 §3.1) :
 * « J-18 · 30 crews inscrits · 1 240 runners en attente » + horloge h/min/s.
 * Données de DÉMO fictives assumées et DÉTERMINISTES : le décompte démarre
 * d'une valeur FIXE (SSR stable, aucun Date.now au rendu) ; le tick 1 s ne
 * démarre que côté client, et prefers-reduced-motion fige l'affichage.
 * Strings locales (STRINGS fr/en) — consolidation dictionary.ts par l'intégrateur.
 */

import { useEffect, useState } from 'react';
import { SEASON0 } from '../../../lib/landing';
import { useLang } from './LangProvider';
import styles from './SeasonCountdown.module.css';

/** Valeur de départ FIXE du décompte (pas de Date.now — rendu serveur stable). */
const INITIAL_SECONDS =
  SEASON0.daysLeft * 86_400 +
  SEASON0.hoursLeft * 3_600 +
  SEASON0.minutesLeft * 60 +
  SEASON0.secondsLeft;

const STRINGS = {
  fr: {
    season: 'Saison 0',
    dayPrefix: 'J-',
    crews: 'crews inscrits',
    runners: 'runners en attente',
    timerAria: 'Compte à rebours avant l’ouverture de la Saison 0 (démonstration)',
  },
  en: {
    season: 'Season 0',
    dayPrefix: 'D-',
    crews: 'crews signed up',
    runners: 'runners waiting',
    timerAria: 'Countdown to the Season 0 opening (demo)',
  },
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function SeasonCountdown() {
  const { lang, formatInt } = useLang();
  const S = STRINGS[lang];
  const [left, setLeft] = useState(INITIAL_SECONDS);

  useEffect(() => {
    // reduced-motion : pas de décompte animé, l'affichage reste posé (charte §G).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, []);

  const days = Math.floor(left / 86_400);
  const hours = Math.floor((left % 86_400) / 3_600);
  const minutes = Math.floor((left % 3_600) / 60);
  const seconds = left % 60;

  return (
    <div className={styles.strip}>
      <span className={styles.chip}>
        <span className={styles.chipDot} aria-hidden="true" />
        {S.season}
      </span>

      <span className={styles.timer} role="timer" aria-label={S.timerAria}>
        <strong className={styles.days}>
          {S.dayPrefix}
          {days}
        </strong>
        <span className={styles.clock}>
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </span>

      <span className={styles.sep} aria-hidden="true" />

      <span className={styles.meta}>
        <strong>{formatInt(SEASON0.crews)}</strong> {S.crews}
      </span>
      <span className={styles.meta}>
        <strong>{formatInt(SEASON0.runnersWaiting)}</strong> {S.runners}
      </span>
    </div>
  );
}
