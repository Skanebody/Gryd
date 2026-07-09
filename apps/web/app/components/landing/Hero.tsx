'use client';

/**
 * Hero V2 « war room » (AMENDEMENT-05 §3.1) : kicker fort « LA FRANCE EST
 * OUVERTE. » + H1 « Cours. Capture. Défends. » + sous-titre crew/quartier/
 * saison (§2), compte à rebours Saison 0, 2 CTA (« Réserver mon accès »
 * chartreuse → #waitlist, « Créer mon crew » ghost → #crews), 3 stat-cards à
 * compteurs (chiffres réels @klaim/shared), téléphone HUD RAID LIVE entouré
 * de notifications flottantes, mini-leaderboard 3 crews (démo fictive assumée,
 * rival en --rival, mon crew en chartreuse) et relance « Simuler une course ».
 * Nouvelles strings V2 locales (STRINGS fr/en) — consolidation dictionary.ts
 * par l'intégrateur.
 */

import { CREW_MAX_MEMBERS, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { DEMO_LEADERBOARD, FRANCE_CAPTURABLE_KM2 } from '../../../lib/landing';
import { HexMap } from '../HexMap';
import { Icon } from '../ui/Icon';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import { PhoneMockup } from './PhoneMockup';
import { SeasonCountdown } from './SeasonCountdown';
import { HeroAlerts } from './HeroAlerts';
import ui from './ui.module.css';
import styles from './Hero.module.css';

// Mini-leaderboard de démonstration : DEMO_LEADERBOARD (lib/landing, source
// unique AMENDEMENT-05 §4) — `mine` = Night Pacers (cohérent avec l'alerte
// « passe #3 » et le Crew War Room §3.8), `rival` = Canal Crew (violet --rival,
// un seul récit de rivalité §1, aligné BOARD_TABS/WAR_DEMO).

const STRINGS = {
  fr: {
    kicker: 'Beta fondateur · Saison 0',
    sub: 'Courez dehors. Prenez le quartier. Défendez en crew.',
    ctaCrew: 'Créer mon crew',
    boardTitle: 'Classement crews · Saison 0',
    boardPtsUnit: 'pts',
    tagMine: 'Ton crew',
    tagRival: 'Rival',
    boardAria: 'Classement de démonstration des crews de la Saison 0',
  },
  en: {
    kicker: 'Founder beta · Season 0',
    sub: 'Run outside. Take the block. Defend with your crew.',
    ctaCrew: 'Create my crew',
    boardTitle: 'Crew leaderboard · Season 0',
    boardPtsUnit: 'pts',
    tagMine: 'Your crew',
    tagRival: 'Rival',
    boardAria: 'Season 0 demo crew leaderboard',
  },
} as const;

const PILLS = [
  { key: 'pillGps' as const, icon: 'gps' as const },
  { key: 'pillStrava' as const, icon: 'route' as const },
  { key: 'pillCrew' as const, icon: 'crew' as const },
];

function HeroStat({
  target,
  label,
  shown,
}: {
  target: number;
  label: string;
  shown: boolean;
}) {
  const { formatInt } = useLang();
  const value = useCountUp(target, shown, { durationMs: 900 });
  return (
    <div className={styles.stat}>
      {/* Chiffres héros en graisse 400 (AMENDEMENT-03). */}
      <span className={styles.statValue}>{formatInt(value)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export function Hero() {
  const { lang, copy, formatInt } = useLang();
  const S = STRINGS[lang];
  const { requestSim } = usePhone();
  const stats = useReveal<HTMLDivElement>();

  return (
    <section className={styles.hero}>
      <div className={styles.bg} aria-hidden="true">
        <HexMap />
      </div>

      <div className={styles.inner}>
        <div className={styles.copyCol}>
          <Reveal>
            <h1 className={styles.title}>
              {/* Kicker fort V2 — le vrai statement, au-dessus du triptyque. */}
              <span className={styles.kicker}>{S.kicker}</span>
              {copy.hero.line1}
              <br />
              <span className={styles.accent}>{copy.hero.line2}</span>
              <br />
              {copy.hero.line3}
            </h1>
          </Reveal>

          <Reveal delayMs={80}>
            <p className={styles.sub}>{S.sub}</p>
          </Reveal>

          <Reveal delayMs={100}>
            <ul className={styles.pills} aria-label="Sources actives">
              {PILLS.map((pill, i) => (
                <li
                  key={pill.key}
                  className={styles.pill}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <Icon name={pill.icon} size={16} />
                  <span>{copy.hero[pill.key]}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayMs={120}>
            <p className={styles.trustLine}>{copy.hero.trustLine}</p>
          </Reveal>

          <Reveal delayMs={140}>
            <SeasonCountdown />
          </Reveal>

          <Reveal delayMs={200}>
            <div className={styles.ctas}>
              {/* 1 seul CTA chartreuse par section : celui-ci. */}
              <a href="#waitlist" className={`${ui.btnPrimary} ${styles.ctaPulse}`}>
                {copy.hero.ctaPrimary}
              </a>
              <a href="#crews" className={ui.btnGhost}>
                {S.ctaCrew}
              </a>
            </div>
          </Reveal>

          <div ref={stats.ref} className={`${styles.stats} ${stats.shown ? styles.statsShown : ''}`}>
            <HeroStat target={FRANCE_CAPTURABLE_KM2} label={copy.hero.statKm} shown={stats.shown} />
            <HeroStat target={SEASON_DURATION_WEEKS} label={copy.hero.statWeeks} shown={stats.shown} />
            <HeroStat target={CREW_MAX_MEMBERS} label={copy.hero.statCrew} shown={stats.shown} />
          </div>
        </div>

        <Reveal delayMs={150} className={styles.phoneCol}>
          <div className={styles.phoneStage}>
            <PhoneMockup />
            <HeroAlerts />
          </div>

          <div className={styles.simRow}>
            {/* Rejoue la séquence RAID LIVE du téléphone (PhoneContext.simTick). */}
            <button type="button" className={styles.simBtn} onClick={requestSim}>
              <Icon name="conquete" size={14} />
              {copy.hero.ctaSecondary}
            </button>
          </div>

          <div className={styles.board} aria-label={S.boardAria}>
            <p className={styles.boardTitle}>{S.boardTitle}</p>
            <ol className={styles.boardList}>
              {DEMO_LEADERBOARD.map((row) => (
                <li
                  key={row.name}
                  className={`${styles.boardRow} ${
                    row.kind === 'mine' ? styles.rowMine : row.kind === 'rival' ? styles.rowRival : ''
                  }`}
                >
                  <span className={styles.boardRank}>#{row.rank}</span>
                  <span className={styles.boardName}>{row.name}</span>
                  {row.kind !== 'neutral' ? (
                    <span className={`${styles.tag} ${row.kind === 'mine' ? styles.tagMine : styles.tagRival}`}>
                      {row.kind === 'mine' ? S.tagMine : S.tagRival}
                    </span>
                  ) : null}
                  <span className={styles.boardPts}>
                    {formatInt(row.points)} <small className={styles.boardUnit}>{S.boardPtsUnit}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
