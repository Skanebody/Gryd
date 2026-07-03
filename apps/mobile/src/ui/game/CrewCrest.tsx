/**
 * GRYD — CrewCrest : blason hexagonal de crew généré depuis un seed
 * (AMENDEMENT-08 §1, doc §11). Déterministe : même seed → même blason
 * (initiales + 2-3 formes géométriques, PRNG mulberry32 local). Monochrome
 * charte (chartreuse = ton crew), la FRAME optionnelle lit la ligue via la
 * recette BADGE_TIER_STYLE (road → legend) — la couleur lit l'état de jeu.
 */
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { BADGE_TIER_STYLE, colors, gameColors, type BadgeTier } from '@klaim/shared';

export type CrewCrestSize = 's' | 'm' | 'l' | 'xl';

/** Tailles gelées : s 32 (listes) · m 48 (cartes) · l 72 (header) · xl 112 (HQ). */
const SIZES: Record<CrewCrestSize, number> = { s: 32, m: 48, l: 72, xl: 112 };

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const HEX_RADIUS = 40;

/** Hash FNV-1a 32 bits d'un seed texte → graine numérique. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — même générateur déterministe que les demos (D-décisions). */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const HEX = hexPoints(CENTER, CENTER, HEX_RADIUS);
const HEX_FRAME = hexPoints(CENTER, CENTER, HEX_RADIUS + 6);

/** Initiales du crew (2 lettres max, chiffres conservés — « LES FOULÉES 9³ » → LF). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '?';
  const second = words[1]?.charAt(0) ?? '';
  return (first + second).toUpperCase();
}

/** Motif géométrique déterministe : 2-3 formes parmi 4 familles. */
function motifShapes(seed: string): { kind: number; angle: number; inset: number }[] {
  const rand = mulberry32(hashSeed(seed));
  const count = 2 + (rand() < 0.5 ? 0 : 1); // 2 ou 3 formes
  const shapes: { kind: number; angle: number; inset: number }[] = [];
  for (let i = 0; i < count; i++) {
    shapes.push({
      kind: Math.floor(rand() * 4), // 0 chevron · 1 barres · 2 anneau · 3 triangle
      angle: Math.floor(rand() * 6) * 60,
      inset: 14 + Math.floor(rand() * 10),
    });
  }
  return shapes;
}

export interface CrewCrestProps {
  /** Seed déterministe du blason (id/slug du crew). */
  seed: string;
  /** Nom du crew — fournit les initiales. */
  name: string;
  size?: CrewCrestSize;
  /** Frame de ligue optionnelle (road → legend, recette BADGE_TIER_STYLE). */
  leagueTier?: BadgeTier;
  /** Teinte du blason : chartreuse = MON crew (défaut), blanc = crew tiers. */
  tint?: string;
}

export function CrewCrest({
  seed,
  name,
  size = 'm',
  leagueTier,
  tint = gameColors.crew,
}: CrewCrestProps) {
  const px = SIZES[size];
  const shapes = motifShapes(seed);
  const frame = leagueTier ? BADGE_TIER_STYLE[leagueTier] : null;
  const showInitials = size !== 's'; // en 32 px les initiales deviennent illisibles

  return (
    <Svg width={px} height={px} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      {/* Frame de ligue (anneau extérieur, teinté tier) */}
      {frame ? (
        <Polygon
          points={HEX_FRAME}
          fill="none"
          stroke={frame.ring}
          strokeWidth={frame.strokeWidth}
          strokeLinejoin="round"
        />
      ) : null}
      {frame?.ring2 ? (
        <Polygon
          points={hexPoints(CENTER, CENTER, HEX_RADIUS + 2.5)}
          fill="none"
          stroke={frame.ring2}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Corps du blason */}
      <Polygon points={HEX} fill={colors.noir} />
      <Polygon points={HEX} fill={tint} fillOpacity={0.12} />
      <Polygon points={HEX} fill="none" stroke={tint} strokeWidth={2} strokeLinejoin="round" />

      {/* Motif géométrique déterministe (discret, sous les initiales) */}
      {shapes.map((s, i) => {
        const key = `${s.kind}-${s.angle}-${i}`;
        const g = `rotate(${s.angle} ${CENTER} ${CENTER})`;
        const r = HEX_RADIUS - s.inset;
        if (s.kind === 0) {
          return (
            <G key={key} transform={g}>
              <Polygon
                points={`${CENTER - r},${CENTER + r * 0.4} ${CENTER},${CENTER - r * 0.4} ${CENTER + r},${CENTER + r * 0.4}`}
                fill="none"
                stroke={tint}
                strokeOpacity={0.4}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </G>
          );
        }
        if (s.kind === 1) {
          return (
            <G key={key} transform={g}>
              <Line x1={CENTER - r} y1={CENTER - 6} x2={CENTER + r} y2={CENTER - 6} stroke={tint} strokeOpacity={0.35} strokeWidth={2} />
              <Line x1={CENTER - r} y1={CENTER + 6} x2={CENTER + r} y2={CENTER + 6} stroke={tint} strokeOpacity={0.35} strokeWidth={2} />
            </G>
          );
        }
        if (s.kind === 2) {
          return (
            <Circle key={key} cx={CENTER} cy={CENTER} r={r} fill="none" stroke={tint} strokeOpacity={0.3} strokeWidth={1.6} />
          );
        }
        return (
          <G key={key} transform={g}>
            <Polygon
              points={`${CENTER},${CENTER - r} ${CENTER + r * 0.85},${CENTER + r * 0.6} ${CENTER - r * 0.85},${CENTER + r * 0.6}`}
              fill="none"
              stroke={tint}
              strokeOpacity={0.3}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          </G>
        );
      })}

      {/* Initiales — l'identité lisible du crew */}
      {showInitials ? (
        <SvgText
          x={CENTER}
          y={CENTER + 10}
          textAnchor="middle"
          fontSize={28}
          fontWeight="700"
          fill={colors.blanc}
        >
          {initialsOf(name)}
        </SvgText>
      ) : null}
    </Svg>
  );
}
