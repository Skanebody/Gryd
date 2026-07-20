/**
 * GRYD — Schéma 5 « Bonus ciblé » (§31.5).
 * Une boucle presque fermée : il reste un segment MANQUANT (pointillé). Un bonus
 * Finisher est ACTIF sur cette opportunité (glyph éclair = bonus, §30) et incite
 * à terminer — le CTA « Termine la boucle ». Composant PUR. La distance restante
 * (620 m démo) est passée en props. Anti pay-to-win : le bonus n'attribue PAS de
 * territoire, il signale une opportunité (récompense = coffre/XP côté moteur).
 * Charte : trait chartreuse (moi), manquant pointillé, éclair chartreuse (rareté N3).
 */
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';

const VB_W = 280;
const VB_H = 150;
const RATIO = VB_H / VB_W;

/** Partie DÉJÀ courue de la boucle (trait plein). */
const DONE = 'M150 34 C 96 26, 58 58, 62 96 C 66 128, 108 138, 146 128';
/** Segment MANQUANT (pointillé) qui refermerait la boucle. */
const MISSING = 'M146 128 C 172 120, 186 84, 178 58 C 172 44, 164 38, 150 34';

/** Glyph éclair (= bonus, §30) centré autour de (0,0), échelle locale. */
const BOLT = 'M4 -12 L-6 2 L0 2 L-4 12 L8 -4 L1 -4 Z';

export interface BonusCibleProps extends SchemaBaseProps {
  /** Distance restante pour fermer (démo). Défaut 620. */
  remainingMeters?: number;
  /** Libellé du CTA (défaut « Termine la boucle »). */
  ctaLabel?: string;
  /** Libellé du bonus (défaut « Bonus Finisher »). */
  bonusLabel?: string;
}

export function BonusCible({
  size = VB_W,
  remainingMeters = 620,
  ctaLabel,
  bonusLabel,
  accessibilityLabel,
}: BonusCibleProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaBonusA11y)}
    >
      {/* Boucle courue (plein) */}
      <Path d={DONE} fill="none" stroke={colors.chartreuse} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {/* Segment manquant (pointillé) + distance restante */}
      <Path
        d={MISSING}
        fill="none"
        stroke={colors.gris}
        strokeWidth={3}
        strokeDasharray="6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText x={196} y={82} fill={colors.blanc} fontSize={15} fontFamily={fonts.mono} textAnchor="middle">
        {`${remainingMeters} m`}
      </SvgText>

      {/* Bonus actif : éclair chartreuse (rareté N3) + libellé */}
      <G transform="translate(232 40)">
        <Circle r={16} fill={colors.chartreuse14} stroke={colors.chartreuse40} strokeWidth={1.5} />
        <Path d={BOLT} fill={colors.chartreuse} stroke="none" />
      </G>
      <SvgText x={232} y={72} fill={colors.chartreuse} fontSize={11} fontFamily={fonts.text} textAnchor="middle">
        {bonusLabel ?? t(C.schemaFinisherBonus)}
      </SvgText>

      {/* CTA (unique) — pill chartreuse, texte NOIR (jamais chartreuse sur clair : ici noir sur chartreuse = OK) */}
      <G>
        <Path
          d={`M52 ${VB_H - 34} h176 a13 13 0 0 1 13 13 v0 a13 13 0 0 1 -13 13 h-176 a13 13 0 0 1 -13 -13 v0 a13 13 0 0 1 13 -13 z`}
          fill={colors.chartreuse}
        />
        <SvgText
          x={VB_W / 2}
          y={VB_H - 17}
          fill={colors.noir}
          fontSize={13}
          fontFamily={fonts.text}
          textAnchor="middle"
        >
          {ctaLabel ?? t(C.schemaFinishLoopCta)}
        </SvgText>
      </G>
    </Svg>
  );
}
