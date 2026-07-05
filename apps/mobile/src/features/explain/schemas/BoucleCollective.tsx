/**
 * GRYD — Schéma 4 « Boucle collective crew » (§31.4).
 * Deux membres d'un même crew ferment UNE boucle : le premier trace la majeure
 * partie de la frontière, le second complète le segment manquant. Quand les
 * segments se connectent, la zone remplie appartient au CREW, avec les
 * contributions au prorata de la frontière validée par chacun (démo : 79 % / 21 %).
 * Composant PUR. Noms & % = SCÉNARIOS DÉMO passés en props (défauts = doc §20).
 * Charte : les deux tracés + la zone en chartreuse (le crew = « moi » élargi).
 */
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import type { SchemaBaseProps } from './types';

const VB_W = 280;
const VB_H = 172;
const RATIO = VB_H / VB_W;

/** Segment du 1er runner (majeure partie de la frontière). */
const SEG_A = 'M120 40 C 72 30, 44 60, 50 96 C 54 122, 84 134, 116 128';
/** Segment du 2nd runner (le manquant qui referme la boucle). */
const SEG_B = 'M116 128 C 138 122, 150 92, 148 70 C 146 52, 138 42, 120 40';
/** Remplissage intérieur une fois la boucle refermée. */
const ZONE_FILL =
  'M120 40 C 72 30, 44 60, 50 96 C 54 122, 84 134, 116 128 C 138 122, 150 92, 148 70 C 146 52, 138 42, 120 40 Z';

export interface Contributor {
  name: string;
  /** Part de frontière validée en % entier (démo). */
  pct: number;
}

export interface BoucleCollectiveProps extends SchemaBaseProps {
  /** Ouvreur de la frontière (démo). Défaut { KORO, 79 }. */
  opener?: Contributor;
  /** Finisher qui referme (démo). Défaut { LENA, 21 }. */
  finisher?: Contributor;
}

export function BoucleCollective({
  size = VB_W,
  opener = { name: 'KORO', pct: 79 },
  finisher = { name: 'LENA', pct: 21 },
  accessibilityLabel = 'Deux membres du crew ferment une boucle ; la zone est au crew, contributions au prorata.',
}: BoucleCollectiveProps) {
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Intérieur rempli = zone du crew */}
      <Path d={ZONE_FILL} fill={colors.chartreuse14} stroke="none" />

      {/* Segment A (ouvreur) — trait plein chartreuse */}
      <Path d={SEG_A} fill="none" stroke={colors.chartreuse} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {/* Segment B (finisher) — trait chartreuse pointillé = le manquant refermé */}
      <Path
        d={SEG_B}
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth={4}
        strokeDasharray="7 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Point de jonction des deux segments */}
      <Circle cx={116} cy={128} r={4.5} fill={colors.chartreuse} />
      <Circle cx={120} cy={40} r={4.5} fill={colors.chartreuse} />

      {/* Contributions au prorata (opener = plein, finisher = pointillé) */}
      <G>
        <Circle cx={186} cy={70} r={4} fill={colors.chartreuse} />
        <SvgText x={198} y={74} fill={colors.blanc} fontSize={13} fontFamily={fonts.text}>
          {opener.name}
        </SvgText>
        <SvgText x={VB_W - 10} y={74} fill={colors.chartreuse} fontSize={14} fontFamily={fonts.mono} textAnchor="end">
          {`${opener.pct} %`}
        </SvgText>
      </G>
      <G>
        <Circle cx={186} cy={100} r={4} fill="none" stroke={colors.chartreuse} strokeWidth={2} strokeDasharray="3 3" />
        <SvgText x={198} y={104} fill={colors.blanc} fontSize={13} fontFamily={fonts.text}>
          {finisher.name}
        </SvgText>
        <SvgText x={VB_W - 10} y={104} fill={colors.gris} fontSize={14} fontFamily={fonts.mono} textAnchor="end">
          {`${finisher.pct} %`}
        </SvgText>
      </G>

      <SvgText x={186} y={140} fill={colors.gris} fontSize={11} fontFamily={fonts.text}>
        Zone au crew
      </SvgText>
    </Svg>
  );
}
