/**
 * GRYD — Schéma 6 « GRYD Verify » (§31.6).
 * Un tracé est validé segment par segment : la portion GPS PROPRE + motion
 * cohérent est confirmée (check BLEU verify) et capture ; une portion GPS FAIBLE
 * est EXCLUE (segment grisé barré) — la course reste valide sportivement mais ce
 * bout ne capture pas (ou passe en stats-only si trop de segments tombent).
 * Composant PUR. Les seuils (80 / 60) sont injectés par la page via labels dérivés
 * de VERIFY_FULL_MIN / VERIFY_PARTIAL_MIN — pas codés ici. Charte : verify = bleu
 * `gameColors.verify` (seule exception tolérée), exclu = gris.
 */
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts, gameColors } from '@klaim/shared';
import type { SchemaBaseProps } from './types';

// viewBox élargi (316 vs 280) pour que les libellés injectés de paliers verify
// — « Capture validée · 80+ » / « Segment exclu · < 60 », valeurs tirées de
// VERIFY_FULL_MIN / VERIFY_PARTIAL_MIN — tiennent en entier à droite du glyph
// sans être coupés par overflow:hidden. Le tracé (courbes + pastilles) garde sa
// composition à gauche ; seule la boîte gagne de la marge droite. Le composant
// reste responsive : `size` fixe la largeur, la hauteur suit RATIO.
const VB_W = 316;
const VB_H = 132;
const RATIO = VB_H / VB_W;

export interface VerifySchemaProps extends SchemaBaseProps {
  /** Libellé du segment validé (défaut « Capture validée »). */
  validLabel?: string;
  /** Libellé du segment exclu (défaut « Segment exclu »). */
  excludedLabel?: string;
}

export function VerifySchema({
  size = VB_W,
  validLabel = 'Capture validée',
  excludedLabel = 'Segment exclu',
  accessibilityLabel = 'Un GPS propre valide la capture ; un segment faible est exclu.',
}: VerifySchemaProps) {
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Ligne du haut — VALIDÉE : trait bleu verify + check bleu */}
      <G>
        <Path
          d="M16 40 C 52 24, 96 56, 138 40"
          fill="none"
          stroke={gameColors.verify}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Pastille check bleu */}
        <G transform="translate(174 40)">
          <Circle r={14} fill="none" stroke={gameColors.verify} strokeWidth={2} />
          <Path
            d="M-6 0 L-1.5 5 L7 -6"
            fill="none"
            stroke={gameColors.verify}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
        <SvgText x={196} y={45} fill={colors.blanc} fontSize={12} fontFamily={fonts.text}>
          {validLabel}
        </SvgText>
      </G>

      {/* Ligne du bas — EXCLUE : trait gris pointillé barré */}
      <G>
        <Path
          d="M16 92 C 52 76, 96 108, 138 92"
          fill="none"
          stroke={colors.gris}
          strokeWidth={4}
          strokeDasharray="6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Croix « barré » */}
        <G transform="translate(174 92)">
          <Circle r={14} fill="none" stroke={colors.gris} strokeWidth={2} />
          <Line x1={-5} y1={-5} x2={5} y2={5} stroke={colors.gris} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={5} y1={-5} x2={-5} y2={5} stroke={colors.gris} strokeWidth={2.5} strokeLinecap="round" />
        </G>
        <SvgText x={196} y={97} fill={colors.gris} fontSize={12} fontFamily={fonts.text}>
          {excludedLabel}
        </SvgText>
      </G>
    </Svg>
  );
}
