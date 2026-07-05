/**
 * GRYD — Schéma 2 « La boucle fait la zone » (§31.2).
 * AVANT : le trait seul capture les cellules PROCHES du passage (largeur de
 * capture) → +214 (démo). APRÈS : la boucle fermée remplit l'INTÉRIEUR → +247,
 * soit +33 gagnés grâce à la fermeture. Composant PUR ; les 3 nombres sont des
 * SCÉNARIOS DÉMO (défauts = exemple du doc §13/§34), à surcharger par la page.
 * Charte : trait chartreuse (moi), remplissage chartreuse 14 %, gain en gros.
 */
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import type { SchemaBaseProps } from './types';

const VB_W = 280;
const VB_H = 168;
const RATIO = VB_H / VB_W;

/** Même contour de boucle des deux côtés (avant = trait seul / après = rempli). */
const LOOP_PATH =
  'M40 44 C 78 26, 108 34, 112 62 C 116 92, 92 112, 60 108 C 30 104, 16 74, 40 44 Z';
const LOOP_PATH_RIGHT =
  'M188 44 C 226 26, 256 34, 260 62 C 264 92, 240 112, 208 108 C 178 104, 164 74, 188 44 Z';

export interface BoucleFaitLaZoneProps extends SchemaBaseProps {
  /** Zones capturées par la trace seule (démo). Défaut 214. */
  traceZones?: number;
  /** Zones capturées avec la boucle fermée (démo). Défaut 247. */
  loopZones?: number;
  /** Gain apporté par la fermeture = loopZones − traceZones (démo). Défaut 33. */
  loopGain?: number;
}

export function BoucleFaitLaZone({
  size = VB_W,
  traceZones = 214,
  loopZones = 247,
  loopGain = 33,
  accessibilityLabel = 'La trace seule capture le passage ; la boucle fermée ajoute l’intérieur.',
}: BoucleFaitLaZoneProps) {
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel}
    >
      {/* AVANT — trace seule : contour non rempli, gris (couloir du passage) */}
      <G>
        <Path
          d={LOOP_PATH}
          fill="none"
          stroke={colors.gris}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <SvgText x={64} y={78} fill={colors.blanc} fontSize={18} fontFamily={fonts.mono} textAnchor="middle">
          {`+${traceZones}`}
        </SvgText>
        <SvgText x={64} y={140} fill={colors.gris} fontSize={12} fontFamily={fonts.text} textAnchor="middle">
          Trace seule
        </SvgText>
      </G>

      {/* Flèche « devient » (espace, pas de boîte) */}
      <Path
        d="M132 76 L154 76 M148 70 L154 76 L148 82"
        stroke={colors.gris}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* APRÈS — boucle fermée : intérieur rempli chartreuse, +gain souligné */}
      <G>
        <Path
          d={LOOP_PATH_RIGHT}
          fill={colors.chartreuse14}
          stroke={colors.chartreuse40}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Circle cx={188} cy={44} r={4} fill={colors.chartreuse} />
        <SvgText x={212} y={72} fill={colors.chartreuse} fontSize={18} fontFamily={fonts.mono} textAnchor="middle">
          {`+${loopZones}`}
        </SvgText>
        <SvgText x={212} y={92} fill={colors.blanc} fontSize={12} fontFamily={fonts.mono} textAnchor="middle">
          {`+${loopGain} par la boucle`}
        </SvgText>
        <SvgText x={212} y={140} fill={colors.gris} fontSize={12} fontFamily={fonts.text} textAnchor="middle">
          Boucle fermée
        </SvgText>
      </G>
    </Svg>
  );
}
