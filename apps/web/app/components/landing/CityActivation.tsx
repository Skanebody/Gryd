'use client';

/**
 * City Activation Progress (AMENDEMENT-05 §3.4) : « les villes se remplissent ».
 * Barres de progression par ville — données de DÉMONSTRATION fictives assumées,
 * déterministes au rendu (SSR stable) ; les compteurs animent côté client au
 * reveal (useCountUp, prefers-reduced-motion respecté par le hook et le CSS).
 */

import { CITY_FILL } from '../../../lib/landing';
import { WAITLIST_UNLOCK_THRESHOLD } from '../../../lib/waitlist';
import { useLang } from './LangProvider';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import ui from './ui.module.css';
import styles from './CityActivation.module.css';

// Taille d'une vague = seuil produit WAITLIST_UNLOCK_THRESHOLD (lib/waitlist,
// source unique — même jauge que WaitlistSection §3.11). Remplissage des
// villes : CITY_FILL (lib/landing, Paris/Lille = FAKE_WAITLIST_COUNTS).

const STRINGS = {
  fr: {
    kicker: 'City Activation',
    title: 'Les villes se remplissent.',
    sub: 'Chaque ville ouvre par vagues d’accès fondateurs. Quand la jauge est pleine, la vague part.',
    of: 'sur',
    barAria: (city: string, count: string, total: string) =>
      `${city} — ${count} accès réservés sur ${total}`,
  },
  en: {
    kicker: 'City Activation',
    title: 'Cities are filling up.',
    sub: 'Each city opens in waves of founder seats. When the gauge is full, the wave ships.',
    of: 'of',
    barAria: (city: string, count: string, total: string) =>
      `${city} — ${count} seats reserved of ${total}`,
  },
} as const;

function CityBar({
  name,
  count,
  index,
  shown,
}: {
  name: string;
  count: number;
  index: number;
  shown: boolean;
}) {
  const { lang, formatInt } = useLang();
  const s = STRINGS[lang];
  const animated = useCountUp(count, shown);
  const pct = Math.round((count / WAITLIST_UNLOCK_THRESHOLD) * 100);

  return (
    <div className={styles.row}>
      <span className={styles.city}>{name}</span>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={WAITLIST_UNLOCK_THRESHOLD}
        aria-valuenow={count}
        aria-label={s.barAria(name, formatInt(count), formatInt(WAITLIST_UNLOCK_THRESHOLD))}
      >
        <span
          className={styles.fill}
          style={{
            width: shown ? `${pct}%` : '0%',
            transitionDelay: `${index * 60}ms`,
          }}
          aria-hidden="true"
        />
      </div>
      <span className={styles.count}>
        {formatInt(animated)}
        <span className={styles.total}>
          {' '}
          / {formatInt(WAITLIST_UNLOCK_THRESHOLD)}
        </span>
      </span>
    </div>
  );
}

export function CityActivation() {
  const { lang } = useLang();
  const s = STRINGS[lang];
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className={`${ui.card} ${styles.box}`}>
      <p className={ui.monoLabel}>{s.kicker}</p>
      <h3 className={styles.title}>{s.title}</h3>
      <p className={styles.sub}>{s.sub}</p>
      <div className={styles.rows}>
        {CITY_FILL.map((city, i) => (
          <CityBar key={city.name} name={city.name} count={city.count} index={i} shown={shown} />
        ))}
      </div>
    </div>
  );
}
