/**
 * GRYD — Schéma 4 « Boucle collective crew » (§31.4).
 * Deux membres d'un même crew ferment UNE boucle : le premier trace la majeure
 * partie de la frontière, le second complète le segment manquant. Quand les
 * segments se connectent, la zone remplie appartient au CREW, avec les
 * contributions au prorata de la frontière validée par chacun (démo : 79 % / 21 %).
 * Composant PUR. Noms & % = SCÉNARIOS DÉMO passés en props (défauts = doc §20).
 * Charte : les deux tracés + la zone en chartreuse (le crew = « moi » élargi).
 */
import Svg, { Circle, G, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';
import { realLoopSchema } from './realLoop';

const VB_W = 280;
const VB_H = 172;
const RATIO = VB_H / VB_W;

/**
 * VRAIE boucle République projetée, découpée en deux demi-tracés (ouvreur /
 * finisher) — plus de segments 'C' fabriqués. La zone remplie = le path fermé.
 */
const LOOP = realLoopSchema(140, 128, 10);
const LOOP_X = 18;
const LOOP_Y = 20;

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
  accessibilityLabel,
}: BoucleCollectiveProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaCollectiveA11y)}
    >
      <G transform={`translate(${LOOP_X} ${LOOP_Y})`}>
        {/* Intérieur rempli = zone du crew (le tracé réel EST la frontière) */}
        <Path d={LOOP.path} fill={colors.chartreuse14} stroke="none" />

        {/* Segment A (ouvreur) — trait plein chartreuse */}
        <Polyline
          points={LOOP.openerPoints}
          fill="none"
          stroke={colors.chartreuse}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Segment B (finisher) — trait chartreuse pointillé = le manquant refermé */}
        <Polyline
          points={LOOP.finisherPoints}
          fill="none"
          stroke={colors.chartreuse}
          strokeWidth={4}
          strokeDasharray="7 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points de jonction / fermeture des deux segments */}
        <Circle cx={LOOP.join.x} cy={LOOP.join.y} r={4.5} fill={colors.chartreuse} />
        <Circle cx={LOOP.start.x} cy={LOOP.start.y} r={4.5} fill={colors.chartreuse} />
      </G>

      {/* Contributions au prorata (opener = plein, finisher = pointillé) */}
      <G>
        <Circle cx={186} cy={70} r={4} fill={colors.chartreuse} />
        <SvgText x={198} y={74} fill={colors.blanc} fontSize={13} fontFamily={fonts.text}>
          {opener.name}
        </SvgText>
        <SvgText x={VB_W - 10} y={74} fill={colors.chartreuse} fontSize={14} fontFamily={fonts.mono} textAnchor="end">
          {t(C.pctShare, { n: opener.pct })}
        </SvgText>
      </G>
      <G>
        <Circle cx={186} cy={100} r={4} fill="none" stroke={colors.chartreuse} strokeWidth={2} strokeDasharray="3 3" />
        <SvgText x={198} y={104} fill={colors.blanc} fontSize={13} fontFamily={fonts.text}>
          {finisher.name}
        </SvgText>
        <SvgText x={VB_W - 10} y={104} fill={colors.gris} fontSize={14} fontFamily={fonts.mono} textAnchor="end">
          {t(C.pctShare, { n: finisher.pct })}
        </SvgText>
      </G>

      <SvgText x={186} y={140} fill={colors.gris} fontSize={11} fontFamily={fonts.text}>
        {t(C.schemaZoneToCrew)}
      </SvgText>
    </Svg>
  );
}
