/**
 * GRYD — Schéma « LE RELAIS » (AMENDEMENT-41 §1/§2).
 * Montre LA MÉCANIQUE d'une sortie de groupe, en deux colonnes qui répondent aux
 * deux questions qu'on se pose vraiment après avoir couru à plusieurs :
 *  - GAUCHE  « la zone » : une boucle remplie, un seul propriétaire — le 1ᵉʳ ;
 *  - DROITE  « les points » : trois barres de longueur 1, 1/2, 1/3 — la loi
 *    harmonique (part = 1 ÷ rang). La longueur EST la part : aucune décoration.
 *
 * Composant PUR. Les fractions affichées (1, 1/2, 1/3) sont la RÈGLE elle-même
 * (`coCaptureShare(rang) = 1/rang`, engine/social.ts), pas un scénario démo :
 * elles ne dépendent d'aucune constante calibrable — c'est tout l'intérêt de la
 * loi harmonique. Les rangs sont des Entries (ordinaux propres aux 5 langues).
 * Charte : chartreuse pleine = ce que TU prends, chartreuse 40 % = la part des
 * suivants (même rôle « moi », intensité moindre).
 */
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@klaim/shared';
import { C } from '../../../i18n/catalog/explain';
import { useT } from '../../../i18n/store';
import type { SchemaBaseProps } from './types';
import { realLoopSchema } from './realLoop';

const VB_W = 280;
const VB_H = 168;
const RATIO = VB_H / VB_W;

/** VRAIE boucle République projetée (jamais un blob dessiné à la main). */
const LOOP = realLoopSchema(96, 84, 6);

/** Longueur de la barre du rang 1 : les autres en sont des fractions exactes. */
const BAR_FULL = 62;
const BAR_X = 186;
const ROWS_Y = [50, 92, 134] as const;

/** Une ligne « rang → part » : la longueur de barre = 1 ÷ rang, sans arrondi. */
function ShareRow({
  y,
  rank,
  share,
  fraction,
  lead,
}: {
  y: number;
  rank: string;
  share: number;
  fraction: string;
  lead: boolean;
}) {
  return (
    <G>
      <SvgText x={144} y={y + 4} fill={colors.blanc} fontSize={12} fontFamily={fonts.text}>
        {rank}
      </SvgText>
      <Rect
        x={BAR_X}
        y={y - 5}
        width={BAR_FULL * share}
        height={9}
        rx={4.5}
        fill={lead ? colors.chartreuse : colors.chartreuse40}
      />
      <SvgText
        x={VB_W - 6}
        y={y + 4}
        fill={colors.gris}
        fontSize={12}
        fontFamily={fonts.mono}
        textAnchor="end"
      >
        {fraction}
      </SvgText>
    </G>
  );
}

export type LeRelaisProps = SchemaBaseProps;

export function LeRelais({ size = VB_W, accessibilityLabel }: LeRelaisProps) {
  const t = useT();
  const width = size;
  const height = size * RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel ?? t(C.schemaRelaisA11y)}
    >
      {/* ── Colonne gauche : LA ZONE — une seule, au premier arrivé ── */}
      <SvgText x={8} y={16} fill={colors.gris} fontSize={10} fontFamily={fonts.text} letterSpacing={1.5}>
        {t(C.schemaTheZone)}
      </SvgText>
      <G transform="translate(10 30)">
        <Path
          d={LOOP.path}
          fill={colors.chartreuse14}
          stroke={colors.chartreuse}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Circle cx={LOOP.start.x} cy={LOOP.start.y} r={4} fill={colors.chartreuse} />
      </G>
      <SvgText x={8} y={152} fill={colors.chartreuse} fontSize={12} fontFamily={fonts.text}>
        {t(C.schemaOwnerOnly)}
      </SvgText>

      {/* Séparateur : deux règles distinctes, jamais confondues (A-41 §1) */}
      <Line x1={128} y1={10} x2={128} y2={158} stroke={colors.grisLigne} strokeWidth={1} />

      {/* ── Colonne droite : LES POINTS — 1 ÷ rang, la barre EST la part ── */}
      <SvgText x={144} y={16} fill={colors.gris} fontSize={10} fontFamily={fonts.text} letterSpacing={1.5}>
        {t(C.schemaThePoints)}
      </SvgText>
      <ShareRow y={ROWS_Y[0]} rank={t(C.schemaRank1)} share={1} fraction="1" lead />
      <ShareRow y={ROWS_Y[1]} rank={t(C.schemaRank2)} share={1 / 2} fraction="1/2" lead={false} />
      <ShareRow y={ROWS_Y[2]} rank={t(C.schemaRank3)} share={1 / 3} fraction="1/3" lead={false} />
    </Svg>
  );
}
