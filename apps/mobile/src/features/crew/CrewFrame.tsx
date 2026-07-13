/**
 * GRYD — blason crew hexagonal à cadre ÉVOLUTIF par tier de niveau
 * (AMENDEMENT-06 §2, doc v3 §33.2/§43.2). Le tier (road→legend) vient du niveau
 * crew via crewFrameTierForLevel — road = contour simple, legend = double cadre
 * + halo or. Le tag du crew est gravé au centre (mono). Tokens stricts : la
 * teinte du cadre reste dans la palette (blanc/gris pour les bas tiers, un or
 * chaud réservé aux hauts tiers — même logique de « rareté = intensité » que
 * BadgeHex, §8.3). react-native-svg (déjà en dépendance).
 */
import Svg, {
  Circle,
  Defs,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, gameColors, withAlpha } from '@klaim/shared';
import type { CrewFrameTier } from '@klaim/shared';

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

/** Recette visuelle par tier — intensité croissante (bordure + glow), §43.2. */
interface FrameStyle {
  stroke: string;
  strokeWidth: number;
  /** Anneau externe (double cadre) à partir de race. */
  outerRing: boolean;
  /** Halo radial (elite/legend). */
  glow: string | null;
}

/** Or chaud pour les hauts tiers (token gameColors.gold — hors chartreuse, §charte). */
const OR = gameColors.gold;

const TIER_STYLE: Record<CrewFrameTier, FrameStyle> = {
  road: { stroke: colors.grisLigne, strokeWidth: 2, outerRing: false, glow: null },
  tempo: { stroke: withAlpha(colors.blanc, 0.28), strokeWidth: 2.5, outerRing: false, glow: null },
  race: { stroke: colors.blanc, strokeWidth: 2.5, outerRing: true, glow: null },
  carbon: { stroke: colors.blanc, strokeWidth: 3, outerRing: true, glow: withAlpha(colors.blanc, 0.18) },
  elite: { stroke: OR, strokeWidth: 3, outerRing: true, glow: withAlpha(OR, 0.22) },
  legend: { stroke: OR, strokeWidth: 3.5, outerRing: true, glow: withAlpha(OR, 0.38) },
};

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export interface CrewFrameProps {
  /** Tier dérivé du niveau crew (crewFrameTierForLevel). */
  tier: CrewFrameTier;
  /** Tag court gravé au centre (ex. « 9³ »). */
  tag: string;
  /** Côté en px (défaut 84). */
  size?: number;
}

export function CrewFrame({ tier, tag, size = 84 }: CrewFrameProps) {
  const s = TIER_STYLE[tier];
  const glowId = `crewframe-${tier}`;
  const inner = hexPoints(CENTER, CENTER, 34);
  const outer = hexPoints(CENTER, CENTER, 44);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      {s.glow ? (
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={s.stroke} stopOpacity={0.5} />
            <Stop offset="65%" stopColor={s.stroke} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={s.stroke} stopOpacity={0} />
          </RadialGradient>
        </Defs>
      ) : null}

      {s.glow ? <Circle cx={CENTER} cy={CENTER} r={CENTER - 1} fill={`url(#${glowId})`} /> : null}

      {/* Anneau externe (double cadre) — race et au-dessus */}
      {s.outerRing ? (
        <Polygon
          points={outer}
          fill="none"
          stroke={s.stroke}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Corps du blason */}
      <Polygon points={inner} fill={colors.carbone2} />
      <Polygon
        points={inner}
        fill="none"
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeLinejoin="round"
      />

      {/* Tag central (mono, gravé) */}
      <SvgText
        x={CENTER}
        y={CENTER + 6}
        textAnchor="middle"
        fontSize={26}
        fontWeight="700"
        fill={colors.blanc}
      >
        {tag}
      </SvgText>
    </Svg>
  );
}
