'use client';

/**
 * Section « Salle de guerre » (#warroom) — LES RÈGLES DU CONFLIT.
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Cette section
 * affichait auparavant :
 * - une « OFFENSIVE CREW · EN COURS » sur Canal Saint-Martin, avec un compte à
 *   rebours qui tournait (04:21:08), une jauge à 62 %, « 496 / 800 zones
 *   prises » et « 7 membres actifs » — aucune de ces offensives n'a existé ;
 * - un « FLUX TERRITOIRE · EN DIRECT » de captures inventées (République,
 *   Croix-Rousse, Wazemmes…) attribuées à des crews qui n'existent pas ;
 * - cinq onglets de classements France / Paris / Lille / Pionniers / Crews,
 *   dont un podium de personnes nommées (« Léa M. », « Marco V. »…).
 * Tout cela a été supprimé, composants compris (LiveTerritoryFeed,
 * CrewLeaderboard). Un classement se gagne, il ne se maquette pas.
 *
 * Ce qui reste dit ce QU'EST le conflit, sans prétendre qu'il a déjà lieu :
 * les quatre états qu'une zone peut prendre (schéma-légende) et les trois
 * horloges du jeu — lock, decay, durée de saison — qui sont des RÈGLES RÉELLES
 * lues dans @klaim/shared, pas des mesures.
 */

import { ZONE_DECAY_DAYS, HEX_LOCK_HOURS, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { useLang } from './LangProvider';
import type { Lang } from './dictionary';
import { Icon } from '../ui/Icon';
import { Reveal } from './Reveal';
import { LEGEND_HEXES, LEGEND_VIEW_H, LEGEND_VIEW_W } from '../../../lib/landing';
import ui from './ui.module.css';
import styles from './WarRoom.module.css';

const STRINGS = {
  fr: {
    kicker: 'Les règles du conflit',
    title: 'SALLE DE GUERRE',
    sub: 'Une zone se prend, se garde, se perd. Voilà les quatre états d’un terrain et les trois horloges qui décident de tout.',
    legendLabel: 'ÉTATS D’UNE ZONE',
    mapAria:
      'Schéma des états d’une zone : zones de ton crew en chartreuse, zones ennemies en orange, zones contestées hachurées, zones neutres en gris',
    legendCrew: 'Mon crew',
    legendEnemy: 'Ennemi',
    legendContested: 'Contesté',
    legendNeutral: 'Neutre',
    clocksLabel: 'LES TROIS HORLOGES',
    lockLabel: 'Lock',
    lockValue: `${HEX_LOCK_HOURS} h`,
    lockNote: 'Une zone prise ne peut pas être reprise tout de suite.',
    decayLabel: 'Decay',
    decayValue: `${ZONE_DECAY_DAYS} j`,
    decayNote: 'Une zone que personne ne défend finit par retomber.',
    seasonLabel: 'Saison',
    seasonValue: `${SEASON_DURATION_WEEKS} sem.`,
    seasonNote: 'À la fin, la carte est remise à zéro et tout recommence.',
    honest:
      'Aucun classement n’est affiché ici : la Saison 0 n’a pas commencé. Les premiers noms sur cette page seront ceux qui les auront courus.',
  },
  en: {
    kicker: 'The rules of conflict',
    title: 'WAR ROOM',
    sub: 'A zone is taken, held, lost. Here are the four states of a piece of ground, and the three clocks that decide everything.',
    legendLabel: 'STATES OF A ZONE',
    mapAria:
      'Diagram of zone states: your crew’s zones in chartreuse, enemy zones in orange, contested zones hatched, neutral zones in grey',
    legendCrew: 'My crew',
    legendEnemy: 'Enemy',
    legendContested: 'Contested',
    legendNeutral: 'Neutral',
    clocksLabel: 'THE THREE CLOCKS',
    lockLabel: 'Lock',
    lockValue: `${HEX_LOCK_HOURS} h`,
    lockNote: 'A zone just taken cannot be taken straight back.',
    decayLabel: 'Decay',
    decayValue: `${ZONE_DECAY_DAYS} d`,
    decayNote: 'A zone nobody defends eventually falls away.',
    seasonLabel: 'Season',
    seasonValue: `${SEASON_DURATION_WEEKS} wk`,
    seasonNote: 'At the end, the map resets and it all starts again.',
    honest:
      'No leaderboard is shown here: Season 0 has not started. The first names on this page will be the ones who ran for them.',
  },
} satisfies Record<Lang, Record<string, string>>;

const HEX_CLASS: Record<string, string> = {
  crew: 'hexCrew',
  enemy: 'hexEnemy',
  neutral: 'hexNeutral',
  contested: 'hexContested',
};

/** Schéma-légende des états d'une zone + les trois horloges réelles du jeu. */
export function WarRoom() {
  const { lang } = useLang();
  const s = STRINGS[lang];

  const clocks = [
    { icon: 'bouclier', label: s.lockLabel, value: s.lockValue, note: s.lockNote },
    { icon: 'historique', label: s.decayLabel, value: s.decayValue, note: s.decayNote },
    { icon: 'badge', label: s.seasonLabel, value: s.seasonValue, note: s.seasonNote },
  ] as const;

  return (
    <article className={`${ui.card} ${styles.warCard}`}>
      <div className={styles.warGrid}>
        <div className={styles.warInfo}>
          <p className={ui.monoLabel}>{s.clocksLabel}</p>
          <dl className={styles.clocks}>
            {clocks.map((clock) => (
              <div key={clock.label} className={styles.clock}>
                <Icon name={clock.icon} size={15} className={styles.clockIcon} />
                <dt className={styles.clockHead}>
                  <span className={styles.clockLabel}>{clock.label}</span>
                  <span className={styles.clockValue}>{clock.value}</span>
                </dt>
                <dd className={styles.clockNote}>{clock.note}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.warMap}>
          <p className={ui.monoLabel}>{s.legendLabel}</p>
          <svg
            viewBox={`0 0 ${LEGEND_VIEW_W} ${LEGEND_VIEW_H}`}
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
            {LEGEND_HEXES.map((hex, i) => (
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

        <Reveal>
          <WarRoom />
        </Reveal>

        {/* Dire pourquoi il n'y a pas de classement vaut mieux qu'en inventer un. */}
        <Reveal delayMs={100}>
          <p className={styles.honestNote}>{s.honest}</p>
        </Reveal>
      </div>
    </section>
  );
}
