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
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';
import { realLoopSchema } from './realLoop';

const VB_W = 280;
const VB_H = 168;
const RATIO = VB_H / VB_W;

/**
 * MÊME vraie boucle République projetée des deux côtés (avant = trait seul gris /
 * après = intérieur rempli chartreuse) — plus de lobe 'C' fabriqué. On la pose
 * via un translate : gauche puis droite.
 */
const LOOP = realLoopSchema(112, 96, 8);
const LOOP_LEFT_X = 8;
const LOOP_RIGHT_X = 156;
const LOOP_Y = 8;

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
  accessibilityLabel,
}: BoucleFaitLaZoneProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaBoucleFaitA11y)}
    >
      {/* AVANT — trace seule : contour non rempli, gris (couloir du passage) */}
      <G>
        <Path
          d={LOOP.path}
          fill="none"
          stroke={colors.gris}
          strokeWidth={3}
          strokeLinejoin="round"
          transform={`translate(${LOOP_LEFT_X} ${LOOP_Y})`}
        />
        <SvgText x={64} y={78} fill={colors.blanc} fontSize={18} fontFamily={fonts.mono} textAnchor="middle">
          {`+${traceZones}`}
        </SvgText>
        <SvgText x={64} y={140} fill={colors.gris} fontSize={12} fontFamily={fonts.text} textAnchor="middle">
          {t(C.schemaTraceAlone)}
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
        <G transform={`translate(${LOOP_RIGHT_X} ${LOOP_Y})`}>
          <Path
            d={LOOP.path}
            fill={colors.chartreuse14}
            stroke={colors.chartreuse40}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Circle cx={LOOP.start.x} cy={LOOP.start.y} r={4} fill={colors.chartreuse} />
        </G>
        <SvgText x={212} y={72} fill={colors.chartreuse} fontSize={18} fontFamily={fonts.mono} textAnchor="middle">
          {`+${loopZones}`}
        </SvgText>
        <SvgText x={212} y={92} fill={colors.blanc} fontSize={12} fontFamily={fonts.mono} textAnchor="middle">
          {t(C.schemaLoopGain, { n: loopGain })}
        </SvgText>
        <SvgText x={212} y={140} fill={colors.gris} fontSize={12} fontFamily={fonts.text} textAnchor="middle">
          {t(C.schemaLoopClosed)}
        </SvgText>
      </G>
    </Svg>
  );
}
