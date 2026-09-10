/**
 * GRYD — HISTOGRAMME (SVG). Une série, deux couleurs : la barre qui porte le
 * message en chartreuse, les autres en neutre.
 *
 * ═══ CE QU'IL TIENT, PARCE QUE `chartGeometry` LE TIENT ═════════════════════
 *  · échelle à base ZÉRO (une base flottante double une progression) ;
 *  · une période SANS sortie garde une barre minimale : elle se lit « rien
 *    cette semaine-là », elle ne disparaît pas de l'axe ;
 *  · aucune valeur inventée : l'écran passe ce qu'il a mesuré.
 *
 * Accessibilité : chaque barre porte son libellé complet (VoiceOver lit
 * « Semaine du 1er septembre, 24,3 kilomètres ») ; le groupe en porte un aussi.
 * Les libellés sont composés par l'écran — ce composant ne traduit rien.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { fonts, fontSizes, spacing } from '@klaim/shared';
import { barsLayout, type ChartFrame } from './chartGeometry';
import { chartPalette, type ChartTone } from './palette';

/** Hauteur du tracé, hors étiquettes d'axe. */
export const BAR_CHART_HEIGHT = 112;

/** Rayon du sommet d'une barre — le même langage que les surfaces (radii.sm). */
const BAR_RADIUS = 4;

export interface BarChartProps {
  values: readonly number[];
  /** Étiquettes sous les barres, déjà composées. Vide = axe muet. */
  labels?: readonly string[];
  /** Libellés VoiceOver, un par barre, déjà composés. */
  a11yLabels?: readonly string[];
  /** Barre mise en avant (chartreuse). `null` = aucune ne parle plus qu'une autre. */
  highlight?: number | null;
  width: number;
  height?: number;
  tone: ChartTone;
  a11yLabel: string;
  testID?: string;
}

export function BarChart({
  values,
  labels,
  a11yLabels,
  highlight = null,
  width,
  height = BAR_CHART_HEIGHT,
  tone,
  a11yLabel,
  testID,
}: BarChartProps) {
  const palette = chartPalette(tone);
  if (width < 2 || values.length === 0) return null;
  const frame: ChartFrame = {
    width,
    height,
    padding: { top: 4, right: 0, bottom: 0, left: 0 },
  };
  const gap = values.length > 12 ? 3 : 8;
  const bars = barsLayout(values, frame, gap);

  return (
    <View style={styles.root} testID={testID}>
      <View accessible accessibilityLabel={a11yLabel}>
        <Svg width={width} height={height}>
          {bars.map((bar) => (
            <Rect
              key={bar.index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={Math.min(BAR_RADIUS, bar.width / 2)}
              fill={bar.index === highlight ? palette.accent : palette.neutral}
            />
          ))}
        </Svg>
      </View>
      {/* L'étiquette visible sous chaque barre PORTE le libellé VoiceOver
          complet : le SVG n'expose pas ses enfants à l'accessibilité sur les
          deux plateformes, et une barre muette n'est pas une barre. */}
      {labels !== undefined ? (
        <View style={[styles.labels, { gap }]}>
          {labels.map((label, index) => (
            <Text
              key={`${index}-${label}`}
              numberOfLines={1}
              accessible
              {...(a11yLabels?.[index] !== undefined
                ? { accessibilityLabel: a11yLabels[index] }
                : {})}
              style={[
                styles.label,
                { color: index === highlight ? palette.ink : palette.muted },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xxs },
  labels: { flexDirection: 'row' },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
});
