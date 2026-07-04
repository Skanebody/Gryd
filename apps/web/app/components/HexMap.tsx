'use client';

/**
 * Carte de territoire ORGANIQUE égocentrée animée (hero du site waitlist).
 * AMENDEMENT-11 : plus aucune grille hexagonale visible — des territoires
 * colorés lissés + frontières + route recommandée (« Pas une grille. Une
 * ville à prendre. »). Mon territoire en aplat chartreuse-14 + frontière
 * chartreuse-40 et cœur glowing ; crew adverse en blob hachuré (motif, jamais
 * de teinte pleine — AMENDEMENT-01) à frontière rivale orange (--ennemi).
 * Déterministe (paths statiques) → SSR-safe. Animations en CSS uniquement,
 * désactivées sous prefers-reduced-motion (voir HexMap.module.css).
 * Le nom `HexMap` est conservé (identifiant technique, aucun texte visible).
 */

import { colors, mapTokens } from '@klaim/shared';
import styles from './HexMap.module.css';

const VIEW_W = 480;
const VIEW_H = 420;

/** Cœur de mon territoire (glow + noyau organique). */
const HEART = { cx: 140, cy: 193 };

/** Mon territoire : blob organique lissé, frontière irrégulière (lobes). */
const MINE_D =
  'M 92 172 C 100 150, 128 140, 152 146 C 170 150, 186 142, 202 154 ' +
  'C 218 166, 212 186, 222 202 C 232 220, 220 244, 198 250 C 180 255, 162 246, 144 256 ' +
  'C 124 266, 98 258, 88 240 C 79 224, 92 214, 84 198 C 79 186, 87 180, 92 172 Z';

/** Noyau du territoire (cœur glowing, remplace l'ancien hex cœur). */
const HEART_D =
  'M 122 188 C 126 176, 146 170, 158 178 C 170 186, 170 202, 158 210 ' +
  'C 148 217, 130 215, 122 205 C 118 199, 119 193, 122 188 Z';

/** Crew adverse : blob hachuré (motif par crew), frontière rivale marquée. */
const FOE_D =
  'M 302 72 C 316 50, 354 42, 378 57 C 400 71, 405 101, 391 123 ' +
  'C 378 144, 346 153, 322 142 C 298 131, 287 106, 294 87 C 296 81, 298 77, 302 72 Z';

/** Route recommandée : du cœur de mon territoire vers la frontière adverse. */
const ROUTE_D = 'M 146 196 C 200 182, 238 152, 282 118';

export function HexMap() {
  return (
    <svg
      className={styles.map}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Carte de territoire : mon secteur en chartreuse face à un crew adverse hachuré"
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

      {/* Glow du cœur de territoire */}
      <circle
        className={styles.glow}
        cx={HEART.cx}
        cy={HEART.cy}
        r="115"
        fill="url(#klaim-glow)"
        opacity="0.35"
      />

      {/* Territoire adverse : aplat hachuré + frontière rivale (--ennemi-40) */}
      <path
        d={FOE_D}
        fill="url(#klaim-hatch)"
        stroke="var(--ennemi-40)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Mon territoire : aplat chartreuse + frontière lissée */}
      <path
        className={styles.mine}
        d={MINE_D}
        fill={mapTokens.mineFill}
        stroke={mapTokens.mineStroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Route recommandée : ma frontière → la frontière adverse (route-first) */}
      <path
        className={styles.routeLine}
        d={ROUTE_D}
        pathLength={1}
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="282" cy="118" r="4" fill={colors.chartreuse} stroke={colors.noir} strokeWidth="1.4" />

      {/* Cœur du territoire, glowing */}
      <path
        className={styles.heart}
        d={HEART_D}
        fill={colors.chartreuse40}
        stroke={colors.chartreuse}
        strokeWidth="1.6"
        strokeLinejoin="round"
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
