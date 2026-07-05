/**
 * GRYD — Schéma 3 « Défendre une frontière » (§31.3).
 * 3 mini-cartes côte à côte, intensité croissante :
 *  1) TRAVERSER la zone       → défense légère
 *  2) LONGER la frontière     → défense forte
 *  3) FERMER / couvrir        → défense maximale
 * Chaque mini-carte : la zone (contour chartreuse) + le tracé du runner (blanc)
 * qui couvre de plus en plus la frontière. Composant PUR. Les DURÉES affichées
 * (+24 h / +48 h / +72 h) sont des labels passés en props par la page, dérivés
 * de DEFENSE_HOURS_TRAVERSE/LONGE/COVER (game-rules.ts) — jamais codés en dur.
 */
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import type { SchemaBaseProps } from './types';

const VB_W = 280;
const VB_H = 138;
const RATIO = VB_H / VB_W;

/** Contour d'une zone dans une mini-carte (coords locales 0..76 × 0..76). */
const ZONE = 'M14 20 C 40 8, 64 16, 66 38 C 68 60, 44 70, 22 62 C 6 56, 2 30, 14 20 Z';

/** Une mini-carte : zone + tracé runner + libellés. */
interface MiniProps {
  x: number;
  /** `d` du tracé runner en coords locales de la mini-carte. */
  runnerD: string;
  title: string;
  duration: string;
  strong: boolean;
}

function Mini({ x, runnerD, title, duration, strong }: MiniProps) {
  return (
    <G transform={`translate(${x} 8)`}>
      {/* Zone défendue (contour chartreuse, léger remplissage) */}
      <Path d={ZONE} fill={colors.chartreuse14} stroke={colors.chartreuse40} strokeWidth={2.5} strokeLinejoin="round" />
      {/* Tracé du runner (blanc) : plus il couvre, plus la défense est forte */}
      <Path
        d={runnerD}
        fill="none"
        stroke={colors.blanc}
        strokeWidth={strong ? 3.5 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText x={38} y={92} fill={colors.blanc} fontSize={11} fontFamily={fonts.text} textAnchor="middle">
        {title}
      </SvgText>
      <SvgText
        x={38}
        y={110}
        fill={strong ? colors.chartreuse : colors.gris}
        fontSize={12}
        fontFamily={fonts.mono}
        textAnchor="middle"
      >
        {duration}
      </SvgText>
    </G>
  );
}

export interface DefenseFrontiereProps extends SchemaBaseProps {
  /** Durée « traverser » (label dérivé de DEFENSE_HOURS_TRAVERSE). Défaut « +24 h ». */
  traverseLabel?: string;
  /** Durée « longer » (label dérivé de DEFENSE_HOURS_LONGE). Défaut « +48 h ». */
  longeLabel?: string;
  /** Durée « fermer/couvrir » (label dérivé de DEFENSE_HOURS_COVER). Défaut « +72 h ». */
  coverLabel?: string;
}

export function DefenseFrontiere({
  size = VB_W,
  traverseLabel = '+24 h',
  longeLabel = '+48 h',
  coverLabel = '+72 h',
  accessibilityLabel = 'Plus ton tracé couvre la frontière, plus la défense est longue.',
}: DefenseFrontiereProps) {
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel}
    >
      {/* 1 — Traverser : le tracé coupe l'intérieur (couverture faible) */}
      <Mini x={2} runnerD="M8 30 L60 46" title="Traverser" duration={traverseLabel} strong={false} />
      {/* 2 — Longer : le tracé suit une partie de la frontière */}
      <Mini
        x={100}
        runnerD="M14 20 C 40 8, 64 16, 66 38"
        title="Longer"
        duration={longeLabel}
        strong={false}
      />
      {/* 3 — Fermer : le tracé recouvre toute la frontière (défense max) */}
      <Mini
        x={198}
        runnerD="M14 20 C 40 8, 64 16, 66 38 C 68 60, 44 70, 22 62 C 6 56, 2 30, 14 20 Z"
        title="Fermer"
        duration={coverLabel}
        strong
      />
    </Svg>
  );
}
