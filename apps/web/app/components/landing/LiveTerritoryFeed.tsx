'use client';

/**
 * Live Territory Feed (AMENDEMENT-05 §3.5) : flux « zones capturées récemment »
 * qui défile doucement en boucle (liste dupliquée + translateY CSS), pause au
 * hover/focus, liste statique sous prefers-reduced-motion.
 * Entrées fictives assumées, déterministes : lib/landing.ts (factions colorées
 * selon la palette de conflit §1 — crew --ch, rival --rival, ennemi --ennemi).
 */

import type { IconName } from '@klaim/shared';
import { useLang } from './LangProvider';
import type { Lang } from './dictionary';
import { FEED_ENTRIES, type FeedEntry } from '../../../lib/landing';
import { Icon } from '../ui/Icon';
import ui from './ui.module.css';
import styles from './LiveTerritoryFeed.module.css';

const STRINGS = {
  fr: {
    title: 'FLUX TERRITOIRE',
    liveChip: 'EN DIRECT',
    listAria: 'Zones capturées récemment (démonstration)',
    captured: (e: FeedEntry) => `${e.zone} +${e.delta ?? 0} hexes`,
    contested: (e: FeedEntry) => `${e.zone} contestée`,
    defended: (e: FeedEntry) => `${e.zone} défendu`,
    attacked: (e: FeedEntry) => `${e.zone} attaqué`,
    ago: (min: number) => `il y a ${min} min`,
  },
  en: {
    title: 'TERRITORY FEED',
    liveChip: 'LIVE',
    listAria: 'Recently captured zones (demo)',
    captured: (e: FeedEntry) => `${e.zone} +${e.delta ?? 0} hexes`,
    contested: (e: FeedEntry) => `${e.zone} contested`,
    defended: (e: FeedEntry) => `${e.zone} defended`,
    attacked: (e: FeedEntry) => `${e.zone} under attack`,
    ago: (min: number) => `${min} min ago`,
  },
} satisfies Record<Lang, unknown>;

const FACTION_CLASS: Record<FeedEntry['faction'], string> = {
  crew: 'fCrew',
  rival: 'fRival',
  enemy: 'fEnemy',
  neutral: 'fNeutral',
};

/** Icône de renfort par type d'entrée : capture = carte · défense = bouclier ·
    contesté/attaque = alerte (le « ⚠ » texte d'avant est remplacé par l'icône). */
const KIND_ICON: Record<FeedEntry['kind'], IconName> = {
  captured: 'carte',
  contested: 'alerte',
  defended: 'bouclier',
  attacked: 'alerte',
};

function FeedList({ ariaHidden }: { ariaHidden?: boolean }) {
  const { lang } = useLang();
  const s = STRINGS[lang];

  return (
    <ul className={styles.list} aria-hidden={ariaHidden || undefined}>
      {FEED_ENTRIES.map((entry, i) => (
        <li key={i} className={styles.item}>
          <p className={`${styles.event} ${entry.kind === 'attacked' ? styles.eventAlert : ''}`}>
            <Icon name={KIND_ICON[entry.kind]} size={14} className={styles.eventIcon} />
            {s[entry.kind](entry)}
          </p>
          <p className={styles.meta}>
            <span className={styles[FACTION_CLASS[entry.faction]] ?? ''}>{entry.crew}</span>
            <span className={styles.ago}>{s.ago(entry.minutesAgo)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function LiveTerritoryFeed() {
  const { lang } = useLang();
  const s = STRINGS[lang];

  return (
    <aside className={`${ui.card} ${styles.feedCard}`} aria-label={s.listAria}>
      <header className={styles.feedHead}>
        <p className={styles.feedTitle}>
          <span className={styles.liveDot} aria-hidden="true" />
          {s.title}
        </p>
        <span className={styles.liveChip}>{s.liveChip}</span>
      </header>

      <div className={styles.viewport}>
        <div className={styles.track}>
          <FeedList />
          {/* Copie pour la boucle infinie — ignorée des lecteurs d'écran,
              masquée en reduced-motion (liste statique). */}
          <div className={styles.loopCopy}>
            <FeedList ariaHidden />
          </div>
        </div>
      </div>
    </aside>
  );
}
