/**
 * GRYD — Schéma « Une zone s'use » (SPEC §3.3/§3.4, statuts §24-§25).
 * UNE ligne de vie horizontale, lue de gauche à droite : capture → solide →
 * fragile → libre. La longueur de chaque segment est PROPORTIONNELLE aux vraies
 * durées (ZONE_STABLE_MAX_DAYS / ZONE_DECAY_DAYS), et la fenêtre « à défendre »
 * (ZONE_DEFEND_WINDOW_HOURS) est encadrée à sa vraie place, tout à la fin.
 * Sous la ligne, la flèche de retour dit la seule action qui compte : y repasser
 * remet le compte à zéro.
 *
 * Composant PUR : les libellés de durée arrivent en props depuis la page
 * (labels.ts → game-rules.ts). Les PROPORTIONS sont passées en props elles aussi
 * (`stableShare`, `defendShare`) pour qu'aucune fraction de règle ne soit codée
 * ici — si ZONE_STABLE_MAX_DAYS bouge, le dessin suit.
 * Charte : chartreuse pleine = la zone tient, chartreuse 40 % = elle faiblit,
 * gris = elle ne t'appartient plus.
 */
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';

const VB_W = 280;
const VB_H = 156;
const RATIO = VB_H / VB_W;

const BAR_X = 14;
const BAR_W = 252;
const BAR_Y = 58;
const BAR_H = 12;

export interface VieDeLaZoneProps extends SchemaBaseProps {
  /** Libellé de la phase solide (« 7 jours »), dérivé de game-rules. */
  stableLabel?: string;
  /** Libellé de la phase fragile (« jours 8 à 14 »), dérivé de game-rules. */
  fragileLabel?: string;
  /** Part de la ligne de vie passée en phase solide (0..1). Défaut 0,5. */
  stableShare?: number;
  /** Part FINALE encadrée « à défendre » (0..1). Défaut 0,14. */
  defendShare?: number;
}

export function VieDeLaZone({
  size = VB_W,
  stableLabel = '7 jours',
  fragileLabel = 'jours 8 à 14',
  stableShare = 0.5,
  defendShare = 0.14,
  accessibilityLabel,
}: VieDeLaZoneProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;

  // Bornes des segments — clampées pour rester dessinables quoi qu'on passe.
  const stable = Math.min(Math.max(stableShare, 0.1), 0.9);
  const defend = Math.min(Math.max(defendShare, 0.05), 0.4);
  const stableW = BAR_W * stable;
  const fragileX = BAR_X + stableW;
  const fragileW = BAR_W - stableW;
  const defendW = BAR_W * defend;
  const defendX = BAR_X + BAR_W - defendW;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaVieZoneA11y)}
    >
      {/* Repères des deux extrémités : d'où on part, où on finit */}
      <SvgText x={BAR_X} y={40} fill={colors.chartreuse} fontSize={11} fontFamily={fonts.text}>
        {t(C.schemaZoneCapture)}
      </SvgText>
      <SvgText
        x={BAR_X + BAR_W}
        y={40}
        fill={colors.gris}
        fontSize={11}
        fontFamily={fonts.text}
        textAnchor="end"
      >
        {t(C.schemaZoneFree)}
      </SvgText>

      {/* La ligne de vie : solide, puis fragile — longueurs = vraies durées */}
      <Rect x={BAR_X} y={BAR_Y} width={stableW} height={BAR_H} rx={6} fill={colors.chartreuse} />
      <Rect x={fragileX} y={BAR_Y} width={fragileW} height={BAR_H} rx={6} fill={colors.chartreuse40} />

      {/* Fenêtre « à défendre » : encadrée tout à la fin, là où elle tombe */}
      <Rect
        x={defendX}
        y={BAR_Y - 5}
        width={defendW}
        height={BAR_H + 10}
        rx={5}
        fill="none"
        stroke={colors.blanc35}
        strokeWidth={1.5}
      />

      {/* Durées sous chaque phase (valeurs game-rules injectées par la page) */}
      <SvgText
        x={BAR_X + stableW / 2}
        y={92}
        fill={colors.blanc}
        fontSize={11}
        fontFamily={fonts.mono}
        textAnchor="middle"
      >
        {stableLabel}
      </SvgText>
      <SvgText
        x={fragileX + fragileW / 2}
        y={92}
        fill={colors.gris}
        fontSize={11}
        fontFamily={fonts.mono}
        textAnchor="middle"
      >
        {fragileLabel}
      </SvgText>
      <SvgText
        x={BAR_X + BAR_W}
        y={110}
        fill={colors.blanc}
        fontSize={10}
        fontFamily={fonts.text}
        textAnchor="end"
      >
        {t(C.schemaZoneDefendWindow)}
      </SvgText>

      {/* La seule action qui compte : repasser → le compte repart à zéro */}
      <G>
        <Path
          d={`M${BAR_X + BAR_W - 40} 126 C 170 146, 70 146, ${BAR_X + 6} 132`}
          fill="none"
          stroke={colors.chartreuse}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d={`M${BAR_X + 6} 132 l 10 -4 M${BAR_X + 6} 132 l 8 6`}
          fill="none"
          stroke={colors.chartreuse}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </G>
      <SvgText x={VB_W / 2} y={152} fill={colors.gris} fontSize={11} fontFamily={fonts.text} textAnchor="middle">
        {t(C.schemaZoneReset)}
      </SvgText>
    </Svg>
  );
}
