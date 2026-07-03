/**
 * GRYD — LeagueMedal : médaille de rang de ligue (AMENDEMENT-08 §1, doc §17).
 * SVG ruban + disque, numéro de rang centré. La teinte lit l'ÉTAT de jeu :
 * #1 = or victoire (recette legend), #2 = titane (carbon), #3 = blanc renforcé
 * (tempo), au-delà = graphite (road). Aucune couleur décorative.
 */
import { View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { BADGE_TIER_STYLE, colors, type BadgeTierStyle } from '@klaim/shared';

export interface LeagueMedalProps {
  /** Rang (1 = or, 2 = titane, 3 = blanc, 4+ = graphite). */
  rank: number;
  /** Côté en px (défaut 48). */
  size?: number;
}

function styleForRank(rank: number): BadgeTierStyle {
  if (rank <= 1) return BADGE_TIER_STYLE.legend;
  if (rank === 2) return BADGE_TIER_STYLE.carbon;
  if (rank === 3) return BADGE_TIER_STYLE.tempo;
  return BADGE_TIER_STYLE.road;
}

const VIEWBOX = 48;
const CX = VIEWBOX / 2;
const CY = 29;
const R = 13;

export function LeagueMedal({ rank, size = 48 }: LeagueMedalProps) {
  const ts = styleForRank(rank);
  const podium = rank <= 3;

  return (
    <View accessibilityLabel={`Rang ${rank}`}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        {/* Ruban */}
        <Path
          d={`M${CX - 8} 4l5.2 12.5M${CX + 8} 4l-5.2 12.5`}
          stroke={podium ? ts.ring : colors.grisLigne}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
        {/* Halo/glow (legend = #1 uniquement) */}
        {ts.glow ? <Circle cx={CX} cy={CY} r={R + 4} fill={ts.glow} opacity={0.25} /> : null}
        {/* Disque */}
        <Circle cx={CX} cy={CY} r={R} fill={colors.noir} stroke={ts.ring} strokeWidth={ts.strokeWidth} />
        {ts.ring2 ? <Circle cx={CX} cy={CY} r={R - 3} fill="none" stroke={ts.ring2} strokeWidth={1} /> : null}
        {/* Rang */}
        <SvgText
          x={CX}
          y={CY + 4.5}
          textAnchor="middle"
          fontSize={12}
          fontWeight="700"
          fill={podium ? ts.ring : colors.gris}
        >
          {`#${rank}`}
        </SvgText>
      </Svg>
    </View>
  );
}
