/**
 * GRYD — Schéma « Ce que vaut une zone » (doc §23, formule multiplicative).
 * Trois barres COMPARABLES, dans l'ordre croissant de ce que le moteur paie
 * réellement : zone libre (conquête neutre) < ta zone défendue < zone prise à un
 * rival. La longueur de barre est proportionnelle aux points — la comparaison se
 * lit sans lire les chiffres, les chiffres confirment.
 *
 * Composant PUR. Les points affichés arrivent en props depuis la page
 * (labels.ts → POINTS_BASE_PER_ZONE × ACTION_COEFF) : jamais un nombre écrit
 * ici. Les longueurs aussi sont dérivées (`ratios`), donc si un coefficient
 * bouge dans game-rules, les barres bougent avec lui.
 * Charte : la plus forte en chartreuse pleine, les autres en chartreuse 40 %.
 */
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';

const VB_W = 280;
const VB_H = 148;
const RATIO = VB_H / VB_W;

/** Longueur de la barre la plus forte : les autres en sont le prorata. */
const BAR_MAX = 172;
const BAR_X = 8;
const ROWS_Y = [22, 68, 114] as const;

function ValueRow({
  y,
  label,
  value,
  ratio,
  lead,
}: {
  y: number;
  label: string;
  value: string;
  ratio: number;
  lead: boolean;
}) {
  return (
    <G>
      <SvgText x={BAR_X} y={y} fill={colors.blanc} fontSize={11} fontFamily={fonts.text}>
        {label}
      </SvgText>
      <Rect
        x={BAR_X}
        y={y + 8}
        width={Math.max(6, BAR_MAX * ratio)}
        height={10}
        rx={5}
        fill={lead ? colors.chartreuse : colors.chartreuse40}
      />
      <SvgText
        x={VB_W - 6}
        y={y + 17}
        fill={lead ? colors.chartreuse : colors.gris}
        fontSize={13}
        fontFamily={fonts.mono}
        textAnchor="end"
      >
        {value}
      </SvgText>
    </G>
  );
}

export interface ValeurZoneProps extends SchemaBaseProps {
  /** Points d'une zone libre (« 10 pts »), dérivé de game-rules. */
  neutralLabel?: string;
  /** Points d'une zone à toi que tu défends (« 12 pts »). */
  defenseLabel?: string;
  /** Points d'une zone prise à un rival (« 13 pts »). */
  stealLabel?: string;
  /**
   * Longueurs relatives des 3 barres (neutre, défense, vol), normalisées sur la
   * plus grande. Défaut = les coefficients d'action §23.
   */
  ratios?: readonly [number, number, number];
}

export function ValeurZone({
  size = VB_W,
  neutralLabel = '10 pts',
  defenseLabel = '12 pts',
  stealLabel = '13 pts',
  ratios = [1, 1.2, 1.3],
  accessibilityLabel,
}: ValeurZoneProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;
  const max = Math.max(...ratios);
  const norm = (r: number) => (max > 0 ? r / max : 0);

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaValueA11y)}
    >
      <ValueRow
        y={ROWS_Y[0]}
        label={t(C.schemaValueFree)}
        value={neutralLabel}
        ratio={norm(ratios[0])}
        lead={false}
      />
      <ValueRow
        y={ROWS_Y[1]}
        label={t(C.schemaValueDefend)}
        value={defenseLabel}
        ratio={norm(ratios[1])}
        lead={false}
      />
      <ValueRow
        y={ROWS_Y[2]}
        label={t(C.schemaValueSteal)}
        value={stealLabel}
        ratio={norm(ratios[2])}
        lead
      />
    </Svg>
  );
}
