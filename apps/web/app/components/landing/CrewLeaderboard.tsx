'use client';

/**
 * Classement crews (AMENDEMENT-05 §3.5) : onglets France / Paris / Lille /
 * Pionniers / Crews — pattern ARIA tablist repris des zone-tabs de
 * FranceMapSection (roving tabindex + flèches). Classements fictifs assumés
 * (lib/landing.ts) : rang 1 en --or, crew rival en --rival, « toi »
 * (Night Pacers) ancré/surligné en chartreuse.
 */

import { useRef, useState } from 'react';
import { useLang } from './LangProvider';
import type { Lang } from './dictionary';
import { BOARD_TABS, type BoardTabId } from '../../../lib/landing';
import ui from './ui.module.css';
import styles from './CrewLeaderboard.module.css';

const TAB_IDS: BoardTabId[] = ['france', 'paris', 'lille', 'pioneers', 'crews'];

const STRINGS = {
  fr: {
    heading: 'Classements',
    tablistAria: 'Classements par périmètre',
    tabs: {
      france: 'France',
      paris: 'Paris',
      lille: 'Lille',
      pioneers: 'Pionniers',
      crews: 'Crews',
    } as Record<BoardTabId, string>,
    units: { pts: 'pts', hexes: 'hexes' } as Record<'pts' | 'hexes', string>,
    youChip: 'TOI',
    demoNote: 'Classements de démonstration — la Saison 0 écrira les vrais.',
  },
  en: {
    heading: 'Leaderboards',
    tablistAria: 'Leaderboards by scope',
    tabs: {
      france: 'France',
      paris: 'Paris',
      lille: 'Lille',
      pioneers: 'Pioneers',
      crews: 'Crews',
    } as Record<BoardTabId, string>,
    units: { pts: 'pts', hexes: 'hexes' } as Record<'pts' | 'hexes', string>,
    youChip: 'YOU',
    demoNote: 'Demo leaderboards — Season 0 will write the real ones.',
  },
} satisfies Record<Lang, unknown>;

export function CrewLeaderboard() {
  const { lang, formatInt } = useLang();
  const s = STRINGS[lang];
  const [tab, setTab] = useState<BoardTabId>('france');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + delta + TAB_IDS.length) % TAB_IDS.length;
    const key = TAB_IDS[next];
    if (!key) return;
    setTab(key);
    tabRefs.current[next]?.focus();
  };

  const board = BOARD_TABS.find((entry) => entry.id === tab) ?? BOARD_TABS[0];
  if (!board) return null;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>{s.heading}</h3>

      <div className={styles.tabs} role="tablist" aria-label={s.tablistAria}>
        {TAB_IDS.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`board-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="board-panel"
            tabIndex={tab === id ? 0 : -1}
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
            onKeyDown={(event) => onTabKeyDown(event, i)}
          >
            {s.tabs[id]}
          </button>
        ))}
      </div>

      <div
        key={tab}
        id="board-panel"
        role="tabpanel"
        aria-labelledby={`board-tab-${tab}`}
        className={`${ui.card} ${styles.panel}`}
      >
        <ol className={styles.rows}>
          {board.rows.map((row, i) => {
            const rank = i + 1;
            const rowClass = [
              styles.row,
              rank === 1 ? styles.rowGold : '',
              row.isRival ? styles.rowRival : '',
              row.isYou ? styles.rowYou : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={row.name} className={rowClass}>
                <span className={styles.rank}>{String(rank).padStart(2, '0')}</span>
                <span className={styles.name}>
                  {row.name}
                  {row.isYou ? <span className={styles.youChip}>{s.youChip}</span> : null}
                </span>
                <span className={styles.meta}>{row.meta}</span>
                <span className={styles.points}>
                  {formatInt(row.points)}
                  <span className={styles.unit}> {s.units[board.unit]}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className={styles.demoNote}>{s.demoNote}</p>
    </div>
  );
}
