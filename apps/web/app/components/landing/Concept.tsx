'use client';

/**
 * Section Gameplay Loop (#concept) — AMENDEMENT-05 §3.3 (remplace Concept).
 * 5 étapes « Cours → Capture → Défends → Attaque → Domine » qui pilotent UNE
 * mini-map hexagonale SVG partagée : trace seule → hexes chartreuse → decay →
 * reprise sur l'ennemi (--ennemi, état de jeu §1) → zoom-out + classement.
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
 * Géométrie de la mini-map — grille hexagonale pointy-top, 100 % déterministe
 * (calculée au chargement du module : aucun Math.random, SSR stable).
 * ------------------------------------------------------------------------- */

const HEX_R = 20;
const COL_W = Math.sqrt(3) * HEX_R; // ≈ 34,64
const ROW_H = 1.5 * HEX_R; // 30
const GRID_COLS = 11;
const GRID_ROWS = 10;
const VIEW_W = 400;
const VIEW_H = 310;

type Hex = { id: string; cx: number; cy: number; points: string };

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const GRID: Hex[] = [];
for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
    const cx = 20 + col * COL_W + (row % 2 === 1 ? COL_W / 2 : 0);
    const cy = 18 + row * ROW_H;
    GRID.push({ id: `${row}-${col}`, cx, cy, points: hexPoints(cx, cy, HEX_R - 1.5) });
  }
}
const HEX_BY_ID = new Map(GRID.map((hex) => [hex.id, hex]));

/** Hexes traversés par la course (étapes 1-2) — la trace passe par leurs centres. */
const ROUTE_IDS = ['4-2', '4-3', '3-3', '3-4', '4-5', '5-5'];
const ROUTE_SET = new Set(ROUTE_IDS);
/** Sous-ensemble non défendu qui pâlit à l'étape 3 (decay @klaim/shared). */
const DECAY_SET = new Set(['4-2', '4-3', '3-3']);
/** Secteur adverse (étape 4) : hexes --ennemi + 2 hexes repris en chartreuse. */
const ENEMY_SET = new Set(['1-6', '2-5', '2-6', '2-7', '3-7']);
const TAKEN_SET = new Set(['3-6', '4-6']);
/** Hex ennemi « en danger » (pulse §1) : frontière de la reprise. */
const DANGER_ID = '2-6';
/** Étape 5 (zoom-out) : clusters élargis — mon crew vs deux fronts ennemis. */
const MINE_S5 = new Set([...ROUTE_IDS, ...TAKEN_SET, '3-5', '4-4', '5-4', '5-6']);
const ENEMY_S5 = new Set(['0-7', '1-6', '1-7', '2-7', '2-8', '3-8', '7-2', '7-3', '8-2', '8-3']);

const ROUTE_POINTS = ROUTE_IDS.map((id) => HEX_BY_ID.get(id)).filter((hex): hex is Hex => Boolean(hex));
const ROUTE_D = ROUTE_POINTS.map(
  (hex, i) => `${i === 0 ? 'M' : 'L'}${hex.cx.toFixed(1)} ${hex.cy.toFixed(1)}`,
).join(' ');
const ROUTE_START = ROUTE_POINTS[0];
const ROUTE_END = ROUTE_POINTS[ROUTE_POINTS.length - 1];

/** Zoom serré sur le théâtre de la course (étapes 1-4) ; plein cadre à l'étape 5. */
const ZOOM_SCALE = 1.5;
const ZOOM_FOCUS = { x: 168, y: 126 };
const ZOOM_IN = `translate(${(ZOOM_FOCUS.x * (1 - ZOOM_SCALE)).toFixed(1)}px, ${(
  ZOOM_FOCUS.y * (1 - ZOOM_SCALE)
).toFixed(1)}px) scale(${ZOOM_SCALE})`;
const ZOOM_OUT = 'translate(0px, 0px) scale(1)';

type HexState = 'neutral' | 'mine' | 'fade' | 'enemy' | 'taken' | 'danger';

function hexStateAt(step: number, id: string): HexState {
  switch (step) {
    case 1:
      return ROUTE_SET.has(id) ? 'mine' : 'neutral';
    case 2:
      if (DECAY_SET.has(id)) return 'fade';
      return ROUTE_SET.has(id) ? 'mine' : 'neutral';
    case 3:
      if (TAKEN_SET.has(id)) return 'taken';
      if (id === DANGER_ID) return 'danger';
      if (ENEMY_SET.has(id)) return 'enemy';
      return ROUTE_SET.has(id) ? 'mine' : 'neutral';
    case 4:
      if (MINE_S5.has(id)) return 'mine';
      return ENEMY_S5.has(id) ? 'enemy' : 'neutral';
    default:
      return 'neutral';
  }
}

const STATE_CLASS: Record<HexState, string> = {
  neutral: '',
  mine: 'hexMine',
  fade: 'hexFade',
  enemy: 'hexEnemy',
  taken: 'hexTaken',
  danger: 'hexDanger',
};

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
        body: `Les hexes traversés passent à ton crew — verrouillés ${HEX_LOCK_HOURS} h après capture.`,
      },
      {
        name: 'Défends',
        body: `Les zones non défendues s'effacent avec le temps : ${DECAY_DAYS} jours sans passage et l'hex redevient neutre.`,
      },
      { name: 'Attaque', body: 'Reprends les secteurs adverses et fais tomber leur contrôle.' },
      {
        name: 'Domine',
        body: `Monte au classement de ta ville, ton département, puis la France — la saison dure ${SEASON_DURATION_WEEKS} semaines.`,
      },
    ],
    chips: [
      'Run live · route en cours',
      '+6 hexes capturés',
      `Decay · ${DECAY_DAYS} jours sans défense`,
      '+2 hexes repris',
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
        body: `The hexes you cross flip to your crew — locked for ${HEX_LOCK_HOURS} h after capture.`,
      },
      {
        name: 'Defend',
        body: `Undefended zones fade over time: ${DECAY_DAYS} days without a run and the hex turns neutral.`,
      },
      { name: 'Attack', body: 'Take back enemy sectors and break their control.' },
      {
        name: 'Dominate',
        body: `Climb the rankings of your city, your department, then all of France — a season lasts ${SEASON_DURATION_WEEKS} weeks.`,
      },
    ],
    chips: [
      'Run live · tracing route',
      '+6 hexes captured',
      `Decay · ${DECAY_DAYS} days undefended`,
      '+2 hexes retaken',
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
                {GRID.map((hex) => {
                  const state = hexStateAt(step, hex.id);
                  const extra = STATE_CLASS[state];
                  return (
                    <polygon
                      key={hex.id}
                      points={hex.points}
                      className={`${styles.hex} ${extra ? styles[extra] : ''}`}
                    />
                  );
                })}

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
