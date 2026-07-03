'use client';

/**
 * Notifications flottantes du hero war room (AMENDEMENT-05 §3.1) — pills de
 * démo fictives assumées autour du téléphone : attaque (--ennemi), gain
 * (chartreuse), rank-up, contrôle de zone, décompte saison. Apparition
 * séquencée discrète (240 ms ease-out, une par ~1,3 s) ; prefers-reduced-motion
 * → toutes visibles d'emblée, statiques. Décoratif : aria-hidden (l'information
 * réelle vit dans le texte du hero). Strings locales fr/en.
 */

import { useEffect, useState } from 'react';
import { DEMO, SEASON0 } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { useReveal } from './useReveal';
import styles from './HeroAlerts.module.css';

const STRINGS = {
  fr: {
    attack: '⚠ Paris Est attaqué',
    captured: (n: string) => `+${n} hexes capturés`,
    rankUp: 'Night Pacers passe #3',
    zone: (pct: string) => `Zone République : ${pct} % contrôlée`,
    season: (days: string) => `Saison 0 : ${days} jours restants`,
  },
  en: {
    attack: '⚠ East Paris under attack',
    captured: (n: string) => `+${n} hexes captured`,
    rankUp: 'Night Pacers climbs to #3',
    zone: (pct: string) => `République zone: ${pct}% controlled`,
    season: (days: string) => `Season 0: ${days} days left`,
  },
} as const;

const ALERT_COUNT = 5;
const FIRST_DELAY_MS = 500;
const STEP_MS = 1_300;

type Tone = 'ennemi' | 'gain' | 'neutral';

export function HeroAlerts() {
  const { lang, formatInt } = useLang();
  const S = STRINGS[lang];
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!shown) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Statiques : tout est posé d'un bloc (charte §G).
      setVisibleCount(ALERT_COUNT);
      return;
    }
    const timers = Array.from({ length: ALERT_COUNT }, (_, i) =>
      setTimeout(() => setVisibleCount(i + 1), FIRST_DELAY_MS + i * STEP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [shown]);

  const alerts: { tone: Tone; text: string }[] = [
    { tone: 'ennemi', text: S.attack },
    { tone: 'gain', text: S.captured(formatInt(DEMO.hexesGained)) },
    { tone: 'neutral', text: S.rankUp },
    { tone: 'neutral', text: S.zone(formatInt(DEMO.zoneControlPct)) },
    { tone: 'neutral', text: S.season(formatInt(SEASON0.daysLeft)) },
  ];

  const toneClass: Record<Tone, string> = {
    ennemi: styles.ennemi ?? '',
    gain: styles.gain ?? '',
    neutral: '',
  };

  return (
    <div ref={ref} className={styles.layer} aria-hidden="true">
      {alerts.map((alert, i) => (
        <div
          key={alert.text}
          className={`${styles.alert} ${styles[`pos${i}`] ?? ''} ${toneClass[alert.tone]} ${
            i < visibleCount ? styles.shown : ''
          }`}
        >
          {alert.text}
        </div>
      ))}
    </div>
  );
}
