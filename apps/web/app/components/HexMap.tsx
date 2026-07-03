'use client';

/**
 * Grille hexagonale égocentrée animée (hero du site waitlist — addendum §H).
 * Reprend le rendu de maquette-ui-klaim.html : mon cluster en chartreuse-14/40
 * + glow, crew adverse hachuré (jamais de teinte), neutre en contour blanc 5 %.
 * Déterministe (module scope) → SSR-safe. Animations en CSS uniquement,
 * désactivées sous prefers-reduced-motion (voir HexMap.module.css).
 */

import { colors, mapTokens } from '@klaim/shared';
import styles from './HexMap.module.css';

const R = 17;
const W = Math.sqrt(3) * R;
const H = 1.5 * R;
const COLS = 16;
const ROWS = 16;
const VIEW_W = 480;
const VIEW_H = 420;

/** Mon cluster (chartreuse) — clefs "col,row". */
const MINE = new Set([
  '4,6', '5,6', '5,7', '4,7', '3,7', '4,8', '5,8', '3,8', '4,9', '6,7', '6,8',
]);
/** Cœur de cluster (hex glowing). */
const HEART = { c: 4, r: 7 };
/** Crew adverse (motif hachuré 45°, jamais par teinte — AMENDEMENT-01). */
const FOE = new Set(['10,3', '11,3', '10,4', '11,4', '12,4', '11,5', '10,5', '12,5', '11,2']);

function hexCenter(c: number, r: number): { cx: number; cy: number } {
  return { cx: c * W + (r % 2 ? W / 2 : 0) + 8, cy: r * H + 14 };
}

function hexPoints(cx: number, cy: number): string {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    s += `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)} `;
  }
  return s.trim();
}

type HexKind = 'mine' | 'foe' | 'neutral';
type Hex = { key: string; points: string; kind: HexKind; delayMs: number };

const heart = hexCenter(HEART.c, HEART.r);

const HEXES: Hex[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const { cx, cy } = hexCenter(c, r);
    const key = `${c},${r}`;
    const kind: HexKind = MINE.has(key) ? 'mine' : FOE.has(key) ? 'foe' : 'neutral';
    // Vague de capture : délai proportionnel à la distance au cœur (addendum §G).
    const delayMs = kind === 'mine' ? Math.round(Math.hypot(cx - heart.cx, cy - heart.cy) * 5) : 0;
    HEXES.push({ key, points: hexPoints(cx, cy), kind, delayMs });
  }
}

const HEART_POINTS = hexPoints(heart.cx, heart.cy);
const HEART_DELAY_MS = Math.round(Math.hypot(W, H) * 5) + 200;

export function HexMap() {
  return (
    <svg
      className={styles.map}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Carte de territoire : mon cluster d’hexagones en chartreuse face à un crew adverse hachuré"
    >
      <defs>
        <pattern
          id="klaim-hatch"
          width="7"
          height="7"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke={mapTokens.foeStroke} strokeWidth="1.1" />
        </pattern>
        <radialGradient id="klaim-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.chartreuse} stopOpacity="0.5" />
          <stop offset="100%" stopColor={colors.chartreuse} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill={colors.noir} />

      {/* Rues abstraites (fond vectoriel sombre custom — addendum §D) */}
      <g stroke={mapTokens.roads} strokeWidth="2.4" fill="none">
        <path d="M-10 110 Q170 70 300 130 T500 100" />
        <path d="M80 -10 Q110 160 60 260 T110 430" />
        <path d="M-10 250 Q200 225 340 275 T500 255" />
        <path d="M320 -10 Q300 130 360 230 T330 430" />
      </g>
      <g stroke={mapTokens.neutralStroke} strokeWidth="1.3" fill="none">
        <path d="M-10 55 H490" />
        <path d="M-10 180 Q240 165 490 190" />
        <path d="M190 -10 V430" />
        <path d="M420 -10 Q400 220 430 430" />
      </g>

      {/* Parc + eau */}
      <ellipse cx="400" cy="66" rx="82" ry="46" fill={mapTokens.parks} />
      <path d="M-10 378 Q240 348 490 384 L490 430 L-10 430 Z" fill={mapTokens.water} />

      {/* Glow du cœur de cluster */}
      <circle
        className={styles.glow}
        cx={heart.cx}
        cy={heart.cy}
        r="115"
        fill="url(#klaim-glow)"
        opacity="0.35"
      />

      {/* Grille */}
      <g>
        {HEXES.map((h) => {
          if (h.kind === 'mine') {
            return (
              <polygon
                key={h.key}
                className={styles.mine}
                style={{ animationDelay: `${h.delayMs}ms` }}
                points={h.points}
                fill={mapTokens.mineFill}
                stroke={mapTokens.mineStroke}
                strokeWidth="1.4"
              />
            );
          }
          if (h.kind === 'foe') {
            return (
              <polygon
                key={h.key}
                points={h.points}
                fill="url(#klaim-hatch)"
                stroke={mapTokens.foeStroke}
                strokeWidth="1"
              />
            );
          }
          return (
            <polygon
              key={h.key}
              points={h.points}
              fill="none"
              stroke={mapTokens.neutralStroke}
              strokeWidth="1"
            />
          );
        })}
      </g>

      {/* Hex cœur glowing */}
      <polygon
        className={styles.heart}
        style={{ animationDelay: `${HEART_DELAY_MS}ms` }}
        points={HEART_POINTS}
        fill={colors.chartreuse40}
        stroke={colors.chartreuse}
        strokeWidth="1.6"
      />

      {/* Étiquettes crews en mono (différenciation motif + label, jamais teinte) */}
      <text
        x="292"
        y="46"
        fontFamily="var(--mono)"
        fontSize="10"
        fill={colors.gris}
        letterSpacing="1.5"
      >
        CREW NORD·XI
      </text>
      <text
        x="86"
        y="262"
        fontFamily="var(--mono)"
        fontSize="10"
        fill={colors.chartreuse}
        letterSpacing="1.5"
      >
        LES FOULÉES 9³
      </text>
    </svg>
  );
}
