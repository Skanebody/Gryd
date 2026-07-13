/**
 * GRYD — avatar hexagonal à cadre ÉVOLUTIF par tier JOUEUR (AMENDEMENT-07 §8,
 * doc social Partie C). Même logique visuelle « rareté = intensité » que
 * CrewFrame (§43.2) mais côté joueur : road = contour graphite → legend =
 * or + halo. Le tier vient du niveau joueur (playerTierForLevel). Les initiales
 * du pseudo sont gravées au centre (pas de photo en MVP). Un mini-blason crew
 * (tag) peut être posé en pastille bas-droite. Tokens stricts : seul un or chaud
 * (hors palette chartreuse, réservé aux hauts tiers) apparaît, exactement comme
 * CrewFrame/BadgeHex. react-native-svg (déjà en dépendance).
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
import type { PlayerTier } from '@klaim/shared';

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

/** Or chaud partagé avec CrewFrame (token gameColors.gold, hors chartreuse). */
const OR = gameColors.gold;

interface FrameStyle {
  stroke: string;
  strokeWidth: number;
  outerRing: boolean;
  glow: string | null;
}

/** Recette par tier joueur (road→legend) — miroir de CrewFrame.TIER_STYLE. */
const TIER_STYLE: Record<PlayerTier, FrameStyle> = {
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

/** Initiales gravées : 1re lettre + 1re après un séparateur, sinon 2 premières. */
function initials(handle: string): string {
  const clean = handle.replace(/^@/, '');
  const parts = clean.split(/[._·\s-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export interface AvatarHexProps {
  /** Pseudo/handle → initiales gravées au centre. */
  handle: string;
  /** Tier joueur dérivé du niveau (playerTierForLevel). */
  tier: PlayerTier;
  /** Tag du crew → mini-blason bas-droite (absent = pas de crew). */
  crewTag?: string;
  /** Côté en px (défaut 84). */
  size?: number;
}

export function AvatarHex({ handle, tier, crewTag, size = 84 }: AvatarHexProps) {
  const s = TIER_STYLE[tier];
  const glowId = `avatarframe-${tier}`;
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

      {/* Anneau externe (race et au-dessus) */}
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

      {/* Corps de l'avatar */}
      <Polygon points={inner} fill={colors.carbone2} />
      <Polygon
        points={inner}
        fill="none"
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeLinejoin="round"
      />

      {/* Initiales gravées (mono, comme le tag crew) */}
      <SvgText
        x={CENTER}
        y={CENTER + 7}
        textAnchor="middle"
        fontSize={26}
        fontWeight="700"
        fill={colors.blanc}
      >
        {initials(handle)}
      </SvgText>

      {/* Mini-blason crew (pastille bas-droite) */}
      {crewTag ? (
        <>
          <Circle cx={78} cy={78} r={16} fill={colors.noir} stroke={s.stroke} strokeWidth={1.5} />
          <SvgText
            x={78}
            y={82}
            textAnchor="middle"
            fontSize={13}
            fontWeight="700"
            fill={colors.blanc}
          >
            {crewTag}
          </SvgText>
        </>
      ) : null}
    </Svg>
  );
}
