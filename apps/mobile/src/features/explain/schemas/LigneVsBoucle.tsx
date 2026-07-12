/**
 * GRYD — Schéma 1 « Ligne vs boucle » (§31.1).
 * À GAUCHE : un trait simple → ouvre une ROUTE (gris, pas de zone).
 * À DROITE : une boucle fermée REMPLIE → crée une ZONE (chartreuse, mon territoire).
 * Composant PUR (aucun état) : dessine la règle « une ligne ouvre une route,
 * une boucle crée une zone ». Charte : gris = neutre/route, chartreuse = ma zone.
 */
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
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
  /** Libellé sous le trait (défaut « Route ouverte »). */
  lineLabel?: string;
  /** Libellé sous la boucle (défaut « Zone capturée »). */
  loopLabel?: string;
}

export function LigneVsBoucle({
  size = VB_W,
  lineLabel = 'Route ouverte',
  loopLabel = 'Zone capturée',
  accessibilityLabel = 'Un trait ouvre une route, une boucle fermée crée une zone.',
}: LigneVsBoucleProps) {
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Séparateur d'espace au centre (filet discret, pas un cadre) */}
      <Path d={`M${VB_W / 2} 18 L${VB_W / 2} ${VB_H - 42}`} stroke={colors.grisLigne} strokeWidth={1} />

      {/* GAUCHE — le trait ouvre une route */}
      <G>
        <Path
          d="M22 62 C 52 40, 88 92, 118 66"
          stroke={colors.gris}
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
          fill={colors.gris}
          fontSize={13}
          fontFamily={fonts.text}
          textAnchor="middle"
        >
          {lineLabel}
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
          {loopLabel}
        </SvgText>
      </G>
    </Svg>
  );
}
