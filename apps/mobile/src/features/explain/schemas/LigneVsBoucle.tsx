/**
 * GRYD — Schéma 1 « Ligne vs boucle » (§31.1, option A — vérité).
 * À GAUCHE : une ligne → PREND les rues courues (chartreuse fin : elles sont à toi,
 *   conformément au moteur `allHexes=[couloir,…]` + doc lignes droites §2 « capture
 *   uniquement les hexes traversés »). Trait fin = territoire, mais pas de zone pleine.
 * À DROITE : une boucle fermée REMPLIE → prend TOUTE la zone (chartreuse plein).
 * Les deux sont À TOI (chartreuse) ; la boucle est le plus gros lot (plein > fin).
 * Composant sans état. Charte : chartreuse = à moi. Libellés par défaut i18n
 * (catalogue explain) — surchargables par props.
 */
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';
import { realLoopSchema } from './realLoop';

const VB_W = 280;
const VB_H = 150;
const RATIO = VB_H / VB_W;

/** VRAIE boucle République projetée dans la moitié droite (plus de lobe 'C'). */
const LOOP = realLoopSchema(108, 92, 8);
const LOOP_X = 156;
const LOOP_Y = 18;

export interface LigneVsBoucleProps extends SchemaBaseProps {
  /** Libellé sous le trait (défaut « Rues prises »). */
  lineLabel?: string;
  /** Libellé sous la boucle (défaut « Zone prise »). */
  loopLabel?: string;
}

export function LigneVsBoucle({
  size = VB_W,
  lineLabel,
  loopLabel,
  accessibilityLabel,
}: LigneVsBoucleProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaLigneA11y)}
    >
      {/* Séparateur d'espace au centre (filet discret, pas un cadre) */}
      <Path d={`M${VB_W / 2} 18 L${VB_W / 2} ${VB_H - 42}`} stroke={colors.grisLigne} strokeWidth={1} />

      {/* GAUCHE — la ligne PREND les rues courues (chartreuse fin = à toi) */}
      <G>
        <Path
          d="M22 62 C 52 40, 88 92, 118 66"
          stroke={colors.chartreuse}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={22} cy={62} r={4} fill={colors.blanc} />
        <Circle cx={118} cy={66} r={4} fill={colors.blanc} />
        <SvgText
          x={70}
          y={VB_H - 20}
          fill={colors.chartreuse}
          fontSize={13}
          fontFamily={fonts.text}
          textAnchor="middle"
        >
          {lineLabel ?? t(C.schemaStreetsTaken)}
        </SvgText>
      </G>

      {/* DROITE — la VRAIE boucle fermée crée une zone remplie (République projetée) */}
      <G>
        <G transform={`translate(${LOOP_X} ${LOOP_Y})`}>
          {/* Remplissage de MA zone (chartreuse 14 %) — le tracé EST la frontière */}
          <Path
            d={LOOP.path}
            fill={colors.chartreuse14}
            stroke={colors.chartreuse40}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {/* Point de fermeture (départ = arrivée) */}
          <Circle cx={LOOP.start.x} cy={LOOP.start.y} r={4} fill={colors.chartreuse} />
        </G>
        <SvgText
          x={210}
          y={VB_H - 20}
          fill={colors.chartreuse}
          fontSize={13}
          fontFamily={fonts.text}
          textAnchor="middle"
        >
          {loopLabel ?? t(C.schemaZoneTaken)}
        </SvgText>
      </G>
    </Svg>
  );
}
