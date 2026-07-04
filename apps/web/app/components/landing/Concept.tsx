'use client';

/**
 * Section Gameplay Loop (#concept) — AMENDEMENT-05 §3.3 + AMENDEMENT-11.
 * 5 étapes « Cours → Capture → Défends → Attaque → Domine » qui pilotent UNE
 * mini-map ORGANIQUE partagée (plus aucune grille hexagonale visible) :
 * trace seule → territoire chartreuse → decay → secteur repris sur l'ennemi
 * (--ennemi, état de jeu §1) → zoom-out + classement. Les états sont des
 * territoires lissés + frontières en crossfade (opacité CSS 250 ms).
 * Interaction : hover desktop / tap mobile / auto-advance doux (coupé sous
 * prefers-reduced-motion, en pause au survol, stoppé après un clic).
 * Chiffres de JEU réels : HEX_LOCK_HOURS, DECAY_DAYS, SEASON_DURATION_WEEKS
 * (@klaim/shared). Leaderboard de démo fictif assumé, déterministe (SSR stable).
 * Export principal : GameplayLoop — alias `Concept` conservé pour page.tsx.
 */

import { useEffect, useState, type PointerEvent } from 'react';
import { DECAY_DAYS, HEX_LOCK_HOURS, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { DEMO_LEADERBOARD } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import { useReveal } from './useReveal';
import ui from './ui.module.css';
import styles from './Concept.module.css';

/* ---------------------------------------------------------------------------
 * Géométrie de la mini-map — territoires ORGANIQUES lissés (AMENDEMENT-11) :
 * des blobs statiques déterministes (aucun Math.random, SSR stable) qui se
 * crossfadent selon l'étape. Aucune cellule : la frontière bouge, pas la
 * grille. Rues abstraites en fond pour la lecture « ville ».
 * ------------------------------------------------------------------------- */

const VIEW_W = 400;
const VIEW_H = 310;

/** Trace de course (étapes 1-2) — courbe lissée dans le corridor capturé. */
const ROUTE_D = 'M 89 138 C 105 126, 118 108, 141 108 C 167 108, 190 138, 210 168';
const ROUTE_START = { cx: 89, cy: 138 };
const ROUTE_END = { cx: 210, cy: 168 };

/** Mon territoire (étapes 2-4) : corridor organique capturé par la course. */
const MINE_RUN_D =
  'M 76 136 C 82 114, 110 94, 138 95 C 166 96, 188 120, 206 142 ' +
  'C 222 160, 226 178, 211 185 C 195 192, 166 178, 142 168 C 116 158, 92 162, 80 150 C 76 145, 74 141, 76 136 Z';

/** Étape 3 (decay) : moitié ouest non défendue qui pâlit… */
const DECAY_WEST_D =
  'M 78 134 C 84 114, 108 96, 134 97 C 150 98, 160 108, 166 120 ' +
  'C 158 140, 142 154, 122 158 C 104 161, 86 154, 79 146 C 76 141, 76 138, 78 134 Z';

/** …et moitié est toujours défendue. */
const MINE_EAST_D =
  'M 166 120 C 178 128, 192 140, 204 152 C 216 164, 220 176, 208 182 ' +
  'C 194 189, 172 178, 152 166 C 142 160, 136 152, 139 141 C 146 131, 156 124, 166 120 Z';

/** Secteur adverse (étape 4) : blob --ennemi au nord-est. */
const ENEMY_D =
  'M 196 74 C 204 50, 232 36, 258 40 C 285 44, 301 66, 297 92 ' +
  'C 293 115, 270 128, 245 123 C 221 118, 199 104, 195 88 C 194 82, 194 78, 196 74 Z';

/** Zone reprise sur l'ennemi (étape 4) : la frontière recule, bascule chartreuse. */
const TAKEN_D =
  'M 216 124 C 222 108, 240 100, 253 109 C 264 116, 266 133, 255 141 ' +
  'C 244 149, 226 147, 219 136 C 216 132, 215 128, 216 124 Z';

/** Frontière attaquée (étape 4) : arc « en danger » le long du secteur adverse. */
const DANGER_FRONT_D = 'M 212 120 C 222 106, 238 97, 256 99';

/** Étape 5 (zoom-out) : mon territoire élargi + deux fronts ennemis. */
const MINE_BIG_D =
  'M 70 130 C 80 98, 122 82, 162 87 C 202 92, 240 104, 258 128 ' +
  'C 274 150, 268 178, 238 190 C 208 202, 158 200, 119 188 C 87 178, 62 158, 70 130 Z';
const ENEMY_NE_D =
  'M 232 52 C 246 32, 278 26, 301 39 C 321 51, 325 74, 311 90 ' +
  'C 296 105, 268 105, 250 92 C 234 81, 224 66, 232 52 Z';
const ENEMY_SW_D =
  'M 84 222 C 94 205, 120 199, 140 207 C 158 215, 165 236, 152 252 ' +
  'C 139 267, 113 268, 98 256 C 84 245, 78 233, 84 222 Z';

/** Rues abstraites du fond (contours neutres — lecture ville, pas de grille). */
const STREETS = [
  'M -10 62 Q 200 48 410 70',
  'M -10 170 Q 200 158 410 178',
  'M -10 258 Q 200 246 410 262',
  'M 96 -10 Q 84 160 104 320',
  'M 236 -10 Q 226 150 246 320',
  'M 330 -10 Q 322 160 336 320',
] as const;

/** Zoom serré sur le théâtre de la course (étapes 1-4) ; plein cadre à l'étape 5. */
const ZOOM_SCALE = 1.5;
const ZOOM_FOCUS = { x: 168, y: 126 };
const ZOOM_IN = `translate(${(ZOOM_FOCUS.x * (1 - ZOOM_SCALE)).toFixed(1)}px, ${(
  ZOOM_FOCUS.y * (1 - ZOOM_SCALE)
).toFixed(1)}px) scale(${ZOOM_SCALE})`;
const ZOOM_OUT = 'translate(0px, 0px) scale(1)';

/** Territoires visibles par étape (crossfade CSS — la frontière bouge). */
type BlobId =
  | 'mineRun'
  | 'decayWest'
  | 'mineEast'
  | 'enemy'
  | 'taken'
  | 'dangerFront'
  | 'mineBig'
  | 'enemyNE'
  | 'enemySW';

const STEP_BLOBS: readonly (readonly BlobId[])[] = [
  [],
  ['mineRun'],
  ['mineEast', 'decayWest'],
  ['mineRun', 'taken', 'enemy', 'dangerFront'],
  ['mineBig', 'enemyNE', 'enemySW'],
];

/* ---------------------------------------------------------------------------
 * i18n locale au composant (AMENDEMENT-05 §4) — FR/EN complets, chiffres de
 * jeu interpolés depuis @klaim/shared (zéro nombre de règle en dur).
 * ------------------------------------------------------------------------- */

const STEP_COUNT = 5;

type LoopStrings = {
  kicker: string;
  title: string;
  sub: string;
  stepAria: string;
  steps: { name: string; body: string }[];
  chips: string[];
  boardTitle: string;
  yourCrew: string;
  rivalTag: string;
  pointsUnit: string;
  beforeLabel: string;
  beforeText: string;
  afterLabel: string;
  afterText: string;
};

const STRINGS: Record<'fr' | 'en', LoopStrings> = {
  fr: {
    kicker: 'Gameplay loop',
    title: 'Pas de joystick. Pas de triche. Ton corps est la manette.',
    sub: 'Cinq gestes, une seule boucle. Chaque course fait bouger la même carte.',
    stepAria: 'Étape',
    steps: [
      { name: 'Cours', body: 'Trace ta route. Chaque mètre valide peut capturer.' },
      {
        name: 'Capture',
        body: `Les zones traversées passent à ton crew — verrouillées ${HEX_LOCK_HOURS} h après capture.`,
      },
      {
        name: 'Défends',
        body: `Les zones non défendues s'effacent avec le temps : ${DECAY_DAYS} jours sans passage et la zone redevient neutre.`,
      },
      { name: 'Attaque', body: 'Reprends les secteurs adverses et fais tomber leur contrôle.' },
      {
        name: 'Domine',
        body: `Monte au classement de ta ville, ton département, puis la France — la saison dure ${SEASON_DURATION_WEEKS} semaines.`,
      },
    ],
    chips: [
      'Run live · route en cours',
      '+6 zones capturées',
      `Decay · ${DECAY_DAYS} jours sans défense`,
      '+2 zones reprises',
      `Saison · ${SEASON_DURATION_WEEKS} semaines`,
    ],
    boardTitle: 'Classement · France',
    yourCrew: 'Ton crew',
    rivalTag: 'Rival',
    pointsUnit: 'pts',
    beforeLabel: 'Avant GRYD',
    beforeText: 'Tu cours, c’est enregistré.',
    afterLabel: 'Avec GRYD',
    afterText: 'Tu cours, tu prends un territoire, ton crew avance, la carte change.',
  },
  en: {
    kicker: 'Gameplay loop',
    title: 'No joystick. No cheating. Your body is the controller.',
    sub: 'Five moves, one loop. Every run moves the same map.',
    stepAria: 'Step',
    steps: [
      { name: 'Run', body: 'Trace your route. Every valid metre can capture.' },
      {
        name: 'Capture',
        body: `The zones you cross flip to your crew — locked for ${HEX_LOCK_HOURS} h after capture.`,
      },
      {
        name: 'Defend',
        body: `Undefended zones fade over time: ${DECAY_DAYS} days without a run and the zone turns neutral.`,
      },
      { name: 'Attack', body: 'Take back enemy sectors and break their control.' },
      {
        name: 'Dominate',
        body: `Climb the rankings of your city, your department, then all of France — a season lasts ${SEASON_DURATION_WEEKS} weeks.`,
      },
    ],
    chips: [
      'Run live · tracing route',
      '+6 zones captured',
      `Decay · ${DECAY_DAYS} days undefended`,
      '+2 zones retaken',
      `Season · ${SEASON_DURATION_WEEKS} weeks`,
    ],
    boardTitle: 'Rankings · France',
    yourCrew: 'Your crew',
    rivalTag: 'Rival',
    pointsUnit: 'pts',
    beforeLabel: 'Before GRYD',
    beforeText: 'You run, it gets logged.',
    afterLabel: 'With GRYD',
    afterText: 'You run, you take territory, your crew advances, the map changes.',
  },
};

/** Chip d'état : neutre / gain (chartreuse) / alerte (--ennemi, état de jeu §1). */
const CHIP_TONE: Array<'neutral' | 'gain' | 'danger'> = ['neutral', 'gain', 'danger', 'gain', 'neutral'];

// Mini-classement de démo : DEMO_LEADERBOARD (lib/landing, source unique
// AMENDEMENT-05 §4) — même trio et même rival (Canal Crew, violet) que le hero.

/* ------------------------------------------------------------------------- */

export function GameplayLoop() {
  const { lang, formatInt } = useLang();
  const t = STRINGS[lang];
  const area = useReveal<HTMLDivElement>();

  const [step, setStep] = useState(0);
  const [locked, setLocked] = useState(false); // l'utilisateur a cliqué : plus d'auto-advance
  const [hovered, setHovered] = useState(false); // pause douce au survol souris

  // Auto-advance doux — démarre côté client une fois la section visible,
  // jamais sous prefers-reduced-motion, en pause au survol, stoppé au clic.
  useEffect(() => {
    if (!area.shown || locked || hovered) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % STEP_COUNT);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [area.shown, locked, hovered]);

  const onAreaEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovered(true);
  };
  const onAreaLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovered(false);
  };

  const chipTone = CHIP_TONE[step] ?? 'neutral';

  return (
    <section id="concept" className={ui.section} aria-labelledby="concept-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{t.kicker}</p>
          <h2 id="concept-title" className={ui.sectionTitle}>
            {t.title}
          </h2>
          <p className={ui.sectionSub}>{t.sub}</p>
        </Reveal>

        <div
          ref={area.ref}
          className={styles.loopGrid}
          onPointerEnter={onAreaEnter}
          onPointerLeave={onAreaLeave}
        >
          {/* Les 5 étapes — hover (souris) prévisualise, clic/tap fixe l'étape. */}
          <ol className={styles.steps}>
            {t.steps.map((item, i) => (
              <li key={item.name}>
                <button
                  type="button"
                  className={`${styles.step} ${i === step ? styles.stepActive : ''}`}
                  aria-current={i === step ? 'step' : undefined}
                  aria-label={`${t.stepAria} ${i + 1} — ${item.name}`}
                  onClick={() => {
                    setStep(i);
                    setLocked(true);
                  }}
                  onMouseEnter={() => setStep(i)}
                  onFocus={() => setStep(i)}
                >
                  <span className={styles.stepNum} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.stepText}>
                    <span className={styles.stepName}>{item.name}</span>
                    <span className={styles.stepBody}>{item.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {/* LA mini-map partagée : un seul SVG, 5 états. */}
          <div className={styles.mapCard}>
            <svg
              className={styles.mapSvg}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              role="img"
              aria-label={`${t.steps[step]?.name ?? ''} — ${t.chips[step] ?? ''}`}
            >
              <g
                className={styles.zoomGroup}
                style={{ transform: step === 4 ? ZOOM_OUT : ZOOM_IN }}
              >
                {/* Fond ville : rues abstraites neutres (jamais de grille). */}
                <g className={styles.streets}>
                  {STREETS.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>

                {/* Territoires organiques — tous rendus, crossfade par étape. */}
                {(
                  [
                    ['mineRun', MINE_RUN_D, styles.blobMine],
                    ['decayWest', DECAY_WEST_D, styles.blobFade],
                    ['mineEast', MINE_EAST_D, styles.blobMine],
                    ['enemy', ENEMY_D, styles.blobEnemy],
                    ['taken', TAKEN_D, styles.blobTaken],
                    ['dangerFront', DANGER_FRONT_D, styles.frontDanger],
                    ['mineBig', MINE_BIG_D, styles.blobMine],
                    ['enemyNE', ENEMY_NE_D, styles.blobEnemy],
                    ['enemySW', ENEMY_SW_D, styles.blobEnemy],
                  ] as const
                ).map(([id, d, cls]) => (
                  <path
                    key={id}
                    d={d}
                    className={`${styles.blob} ${cls} ${
                      STEP_BLOBS[step]?.includes(id) ? styles.blobOn : ''
                    }`}
                  />
                ))}

                {/* Trace de course : dessinée à l'étape 1, estompée à l'étape 2. */}
                <path
                  d={ROUTE_D}
                  pathLength={1}
                  className={`${styles.route} ${step === 0 ? styles.routeDraw : ''} ${
                    step === 1 ? styles.routeGhost : ''
                  } ${step >= 2 ? styles.routeHidden : ''}`}
                />
                {ROUTE_START && (
                  <circle
                    cx={ROUTE_START.cx}
                    cy={ROUTE_START.cy}
                    r={3}
                    className={`${styles.routeDot} ${step >= 2 ? styles.routeHidden : ''}`}
                  />
                )}
                {ROUTE_END && (
                  <circle
                    cx={ROUTE_END.cx}
                    cy={ROUTE_END.cy}
                    r={4.5}
                    className={`${styles.runner} ${step === 0 ? '' : styles.routeHidden}`}
                  />
                )}
              </g>
            </svg>

            {/* Chip d'état (mono) — chartreuse = gain, --ennemi = alerte decay. */}
            <span
              className={`${styles.chip} ${
                chipTone === 'gain' ? styles.chipGain : chipTone === 'danger' ? styles.chipDanger : ''
              }`}
            >
              {t.chips[step]}
            </span>

            {/* Étape 5 : zoom-out + mini-classement (démo fictive, rival en violet). */}
            {step === 4 && (
              <div className={styles.board}>
                <span className={styles.boardTitle}>{t.boardTitle}</span>
                {DEMO_LEADERBOARD.map((row) => (
                  <span
                    key={row.name}
                    className={`${styles.boardRow} ${
                      row.kind === 'mine' ? styles.rowMine : row.kind === 'rival' ? styles.rowRival : ''
                    }`}
                  >
                    <span className={styles.boardRank}>#{row.rank}</span>
                    <span className={styles.boardName}>{row.name}</span>
                    <span className={styles.boardPts}>
                      {formatInt(row.points)} {t.pointsUnit}
                    </span>
                    {row.kind === 'mine' && <span className={styles.boardTag}>{t.yourCrew}</span>}
                    {row.kind === 'rival' && (
                      <span className={`${styles.boardTag} ${styles.boardTagRival}`}>{t.rivalTag}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Avant / Après (AMENDEMENT-05 §2) */}
        <Reveal delayMs={120}>
          <div className={styles.beforeAfter}>
            <div className={`${ui.card} ${styles.baCard}`}>
              <span className={ui.monoLabel}>{t.beforeLabel}</span>
              <p className={styles.baText}>{t.beforeText}</p>
            </div>
            <div className={`${ui.card} ${styles.baCard} ${styles.baAfter}`}>
              <span className={`${ui.monoLabel} ${styles.baAfterLabel}`}>{t.afterLabel}</span>
              <p className={styles.baText}>{t.afterText}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
