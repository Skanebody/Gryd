'use client';

/**
 * Illustration téléphone du hero (AMENDEMENT-11) : Battle Map ORGANIQUE à trois
 * rôles (mon territoire chartreuse, territoire ennemi --ennemi, ville neutre —
 * aucune grille), trace de course dont le corridor capturé PROGRESSE le long de
 * la route et mord le territoire ennemi (la frontière recule). C'est un SCHÉMA
 * de la mécanique, pas une capture d'écran d'un compte réel.
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Le panneau
 * « RAID LIVE · 62 % GRYD Crew · 31 % Rival · 7 % Neutre · +18 zones prises ·
 * 4 membres actifs · 22 min restantes » a été SUPPRIMÉ : chacun de ces nombres
 * était inventé, et le mot « LIVE » les présentait comme une partie en cours.
 * À la place : une LÉGENDE des trois rôles de couleur — elle explique le code
 * visuel, elle n'affirme rien sur l'état du monde. Le geste (la course qui
 * conquiert un corridor) reste : lui, il est vrai.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { colors, mapTokens } from '@klaim/shared';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { useReveal } from './useReveal';
import styles from './PhoneMockup.module.css';

/* ── Géométrie déterministe (module scope → SSR-safe) ─────────────────────── */

const VIEW_W = 240;
const VIEW_H = 222;

/**
 * Battle Map organique (AMENDEMENT-11) : mon territoire en bas-gauche,
 * territoire ennemi en haut-droite, ville neutre entre les deux (rues
 * abstraites). Aucune cellule visible — les frontières sont lissées.
 */
const MINE_TERRITORY_D =
  'M 2 168 C 14 148, 44 142, 66 152 C 86 161, 96 184, 87 203 ' +
  'C 78 220, 52 228, 30 221 C 10 214, -6 196, 2 168 Z';

const FOE_TERRITORY_D =
  'M 126 30 C 140 8, 172 -2, 204 4 C 234 10, 248 34, 243 62 ' +
  'C 238 89, 213 107, 185 102 C 157 97, 131 76, 126 52 Z';

/** Rues abstraites du fond neutre (lecture ville, jamais de grille). */
const STREETS = [
  'M -10 60 Q 120 48 250 66',
  'M -10 128 Q 120 116 250 134',
  'M -10 190 Q 120 180 250 196',
  'M 62 -10 Q 52 110 70 232',
  'M 148 -10 Q 140 110 156 232',
] as const;

/**
 * Étapes de la séquence de capture le long de la route : le corridor
 * capturé progresse (ruban chartreuse), puis la frontière ennemie recule
 * (« bite » reprise en fin de course).
 */
const SEQUENCE = [
  '72.6,159', '96.9,159', '84.7,138', '121.1,117', '109,96', '145.3,75',
  '133.2,54', '157.5,54', '169.6,33', '193.8,33', '181.7,54', '206,54',
] as const;

const SIM_STEP_MS = 150;
const BADGE_HIDE_MS = 3_000;

const SEQ_CENTERS = SEQUENCE.map((key) => {
  const [cx = 0, cy = 0] = key.split(',').map(Number);
  return { cx, cy };
});
const RUN_PATH_D = SEQ_CENTERS.map(
  (p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`,
).join(' ');
const PIN = SEQ_CENTERS[SEQ_CENTERS.length - 1] ?? { cx: 0, cy: 0 };

/** Zone reprise sur l'ennemi en fin de séquence (la frontière recule). */
const TAKEN_BITE_D =
  'M 164 30 C 172 16, 194 12, 208 22 C 220 31, 222 50, 210 60 ' +
  'C 197 70, 175 66, 167 52 C 163 45, 162 37, 164 30 Z';
/** La « bite » apparaît quand la course a pénétré le territoire ennemi. */
const BITE_AT = SEQUENCE.length - 3;

const STRINGS = {
  fr: {
    previewChip: 'SCHÉMA',
    legendTitle: 'Le code couleur de la carte',
    contested: '⚠ Contesté',
    crew: 'Ton crew',
    /* Libellé aligné AMENDEMENT-05 §1 : la faction adverse est rendue en
       --ennemi (zone ennemie/attaque) — « Rival » (violet) serait faux. */
    rival: 'Ennemi',
    neutral: 'Neutre',
    badgeName: 'Route Opened',
    badgeLabel: 'Un badge existe pour ça',
    legendAria: 'Légende des rôles de couleur de la carte',
    frameAria:
      'Schéma de la mécanique GRYD : une course trace un corridor qui devient ton territoire et fait reculer la frontière ennemie',
  },
  en: {
    previewChip: 'DIAGRAM',
    legendTitle: 'The map colour code',
    contested: '⚠ Contested',
    crew: 'Your crew',
    /* Label aligned with AMENDEMENT-05 §1: the foe faction renders in
       --ennemi (enemy zone/attack) — "Rival" (purple) would contradict it. */
    rival: 'Enemy',
    neutral: 'Neutral',
    badgeName: 'Route Opened',
    badgeLabel: 'There is a badge for that',
    legendAria: 'Legend of the map colour roles',
    frameAria:
      'GRYD mechanic diagram: a run draws a corridor that becomes your territory and pushes the enemy border back',
  },
} as const;

/* ── Composant ─────────────────────────────────────────────────────────────── */

export function PhoneMockup() {
  const { lang, copy } = useLang();
  const S = STRINGS[lang];
  const { zone, simTick } = usePhone();
  const reveal = useReveal<HTMLDivElement>(0.35);

  const [capturedCount, setCapturedCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [badge, setBadge] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playedRef = useRef(false);

  // Rejouer le schéma ne déclenche PLUS de toast « Course validée · +18 zones » :
  // aucune course n'a eu lieu, rien n'a été validé, il n'y a rien à annoncer.
  const play = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setBadge(false);

    const finish = () => {
      setRunning(false);
      setBadge(true);
      timersRef.current.push(setTimeout(() => setBadge(false), BADGE_HIDE_MS));
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Schéma posé d'un bloc, badge sans pop (charte §G).
      setCapturedCount(SEQUENCE.length);
      finish();
      return;
    }

    setCapturedCount(0);
    setRunning(true);
    SEQUENCE.forEach((_, i) => {
      timersRef.current.push(setTimeout(() => setCapturedCount(i + 1), 200 + i * SIM_STEP_MS));
    });
    timersRef.current.push(setTimeout(finish, 200 + SEQUENCE.length * SIM_STEP_MS + 350));
  }, []);

  // Séquence jouée une fois à l'apparition du téléphone (démarrage client, valeurs fixes).
  useEffect(() => {
    if (!reveal.shown || playedRef.current) return;
    playedRef.current = true;
    play();
  }, [reveal.shown, play]);

  // « Simuler une course » rejoue le schéma.
  useEffect(() => {
    if (simTick === 0) return;
    play();
  }, [simTick, play]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  // Progression du corridor capturé le long de la route (0 → 1).
  const progress = capturedCount / SEQUENCE.length;
  const zoneName = zone?.name ?? copy.phone.defaultZoneName;

  return (
    <div ref={reveal.ref} className={styles.scene}>
      <div className={styles.phone} role="img" aria-label={S.frameAria}>
        <div className={styles.notch} aria-hidden="true" />
        <div className={styles.screen}>
          <div className={styles.statusBar}>
            <span className={styles.time}>19:42</span>
            {/* Plus de chip « LIVE » : rien n'est en direct, c'est un schéma. */}
            <span className={styles.previewChip}>{S.previewChip}</span>
          </div>

          <div className={styles.mapWrap}>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={styles.map} aria-hidden="true">
              <rect width={VIEW_W} height={VIEW_H} fill={colors.noir} />

              {/* Ville neutre : rues abstraites (aucune grille — AMENDEMENT-11). */}
              <g stroke={mapTokens.roads} strokeWidth="1.6" fill="none">
                {STREETS.map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>

              {/* Territoire ennemi : --ennemi (état de jeu exclusif, AMENDEMENT-05 §1). */}
              <path
                d={FOE_TERRITORY_D}
                fill="var(--ennemi-14)"
                stroke="var(--ennemi-40)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />

              {/* Mon territoire de base (chartreuse-14, frontière lissée). */}
              <path
                d={MINE_TERRITORY_D}
                fill={mapTokens.mineFill}
                stroke={mapTokens.mineStroke}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />

              {/* Corridor capturé : ruban organique qui progresse avec la course. */}
              <path
                className={styles.corridor}
                d={RUN_PATH_D}
                pathLength={100}
                fill="none"
                stroke={mapTokens.mineFill}
                strokeWidth="15"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={100}
                strokeDashoffset={100 - progress * 100}
              />

              {/* Frontière ennemie qui recule : zone reprise en fin de course. */}
              {capturedCount >= BITE_AT ? (
                <path
                  className={styles.zoneFlip}
                  d={TAKEN_BITE_D}
                  fill={mapTokens.mineFill}
                  stroke={mapTokens.mineStroke}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Trace de course : fantôme permanent + tracé animé pendant la sim. */}
              <path
                d={RUN_PATH_D}
                fill="none"
                stroke={colors.chartreuse40}
                strokeWidth="2"
                strokeDasharray="3 5"
                strokeLinecap="round"
              />
              <path
                className={`${styles.runLine} ${running ? styles.runLineOn : ''}`}
                d={RUN_PATH_D}
                pathLength={100}
                fill="none"
                stroke={colors.chartreuse}
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Pin coureur pulsé. */}
              <circle className={styles.pinPulse} cx={PIN.cx} cy={PIN.cy} r="9" fill={colors.chartreuse40} />
              <circle cx={PIN.cx} cy={PIN.cy} r="4" fill={colors.chartreuse} stroke={colors.noir} strokeWidth="1.4" />
            </svg>

            {/* Alerte raid : zone contestée (pulse ennemi discret). */}
            <span className={styles.contested}>{S.contested}</span>

            {/* Badge qui pop en fin de séquence — --or réservé victoire/badge. */}
            {badge ? (
              <div className={styles.badge}>
                <svg viewBox="0 0 24 24" className={styles.badgeHex} aria-hidden="true">
                  <polygon
                    points="12,1.5 21.5,7 21.5,17.5 12,23 2.5,17.5 2.5,7"
                    fill="var(--or-14)"
                    stroke="var(--or)"
                    strokeWidth="1.4"
                  />
                  <polygon points="12,7 16.3,9.5 16.3,14.5 12,17 7.7,14.5 7.7,9.5" fill="var(--or)" />
                </svg>
                <span className={styles.badgeTexts}>
                  <strong className={styles.badgeName}>{S.badgeName}</strong>
                  <span className={styles.badgeLabel}>{S.badgeLabel}</span>
                </span>
              </div>
            ) : null}
          </div>

          {/* Légende du code couleur — ce qui remplace l'ancien HUD « RAID LIVE ».
              Une légende explique un dessin ; elle ne prétend pas mesurer une partie. */}
          <div className={styles.raidPanel}>
            <div className={styles.raidHead}>
              <span className={styles.raidChip}>{S.legendTitle}</span>
              <strong className={styles.raidZone}>{zoneName}</strong>
            </div>

            <div className={styles.legend} role="img" aria-label={S.legendAria}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotCrew}`} aria-hidden="true" />
                {S.crew}
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotRival}`} aria-hidden="true" />
                {S.rival}
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotNeutral}`} aria-hidden="true" />
                {S.neutral}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
