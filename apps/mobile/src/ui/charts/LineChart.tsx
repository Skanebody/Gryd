/**
 * GRYD — COURBE (SVG, `react-native-svg` déjà embarqué : aucune dépendance
 * nouvelle pour dessiner un graphique).
 *
 * ═══ CE QUE CE COMPOSANT NE FAIT PAS ════════════════════════════════════════
 * Il ne calcule rien et ne traduit rien : il reçoit des points DÉJÀ mesurés et
 * des étiquettes DÉJÀ composées par l'écran (locale-aware). Toute la géométrie
 * vit dans `chartGeometry.ts`, pur et testé — un graphique est le seul endroit
 * où une échelle mal posée passe pour une mesure.
 *
 * ═══ L'AXE INVERSÉ EST ÉTIQUETÉ, SINON IL MENT ══════════════════════════════
 * Pour l'allure, `invertY` place le plus RAPIDE en haut. Ce n'est lisible que
 * si les deux bornes sont écrites : `topLabel` et `bottomLabel` sont donc
 * OBLIGATOIRES (le type l'impose), et elles vivent dans une gouttière à gauche
 * du tracé — jamais posées PAR-DESSUS la courbe, où elles cacheraient la
 * mesure qu'elles décrivent.
 *
 * Accessibilité : la courbe entière porte UN libellé (`a11yLabel`) composé par
 * l'écran — VoiceOver lit une phrase, pas soixante points.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';
import { fonts, fontSizes, spacing } from '@klaim/shared';
import {
  areaPath,
  domainOf,
  polylinePoints,
  projectChart,
  type ChartFrame,
  type ChartPoint,
} from './chartGeometry';
import { chartPalette, type ChartTone } from './palette';

/** Hauteur du tracé, hors étiquettes. Mesure de composition, pas une règle. */
export const LINE_CHART_HEIGHT = 116;

/** Largeur de la gouttière des bornes d'axe. */
export const AXIS_GUTTER = 52;

const PADDING = { top: 6, right: 2, bottom: 6, left: 2 };

export interface LineChartProps {
  /** Points MESURÉS (x = distance ou temps, y = la grandeur). */
  points: readonly ChartPoint[];
  /** Largeur TOTALE disponible (gouttière comprise), mesurée par l'écran. */
  width: number;
  height?: number;
  tone: ChartTone;
  /** Allure : plus petit = plus rapide, donc plus haut. */
  invertY?: boolean;
  /** Borne HAUTE de l'axe, déjà formatée (obligatoire : l'axe doit se lire). */
  topLabel: string;
  /** Borne BASSE de l'axe, déjà formatée. */
  bottomLabel: string;
  /** Repère de gauche sous la courbe (ex. « 0 km »). */
  startLabel?: string;
  /** Repère de droite sous la courbe (ex. « 8,4 km »). */
  endLabel?: string;
  a11yLabel: string;
  testID?: string;
}

export function LineChart({
  points,
  width,
  height = LINE_CHART_HEIGHT,
  tone,
  invertY = false,
  topLabel,
  bottomLabel,
  startLabel,
  endLabel,
  a11yLabel,
  testID,
}: LineChartProps) {
  const palette = chartPalette(tone);
  const domain = domainOf(points);
  const plotWidth = width - AXIS_GUTTER;
  // Rien de mesuré, ou largeur pas encore connue : on ne peint pas un cadre
  // vide qui se lirait « ta sortie était plate ».
  if (domain === null || plotWidth < 2 || points.length < 2) return null;
  const frame: ChartFrame = { width: plotWidth, height, padding: PADDING };
  const projected = projectChart(points, domain, frame, invertY);
  const baseline = height - PADDING.bottom;
  const mid = PADDING.top + (baseline - PADDING.top) / 2;

  return (
    <View style={styles.root} testID={testID} accessible accessibilityLabel={a11yLabel}>
      <View style={styles.row}>
        <View style={[styles.gutter, { height }]}>
          <Text style={[styles.axisLabel, { color: palette.muted }]} numberOfLines={1}>
            {topLabel}
          </Text>
          <Text style={[styles.axisLabel, { color: palette.muted }]} numberOfLines={1}>
            {bottomLabel}
          </Text>
        </View>
        <Svg width={plotWidth} height={height}>
          {/* Grille : trois traits, presque invisibles, jamais un cadre. */}
          <Line x1={0} y1={PADDING.top} x2={plotWidth} y2={PADDING.top} stroke={palette.grid} strokeWidth={1} />
          <Line x1={0} y1={mid} x2={plotWidth} y2={mid} stroke={palette.grid} strokeWidth={1} />
          <Line x1={0} y1={baseline} x2={plotWidth} y2={baseline} stroke={palette.grid} strokeWidth={1} />
          <Path d={areaPath(projected, frame)} fill={palette.accentFill} />
          <Polyline
            points={polylinePoints(projected)}
            fill="none"
            stroke={palette.accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      {startLabel !== undefined || endLabel !== undefined ? (
        <View style={styles.footer}>
          <Text style={[styles.axisLabel, { color: palette.muted }]}>{startLabel ?? ''}</Text>
          <Text style={[styles.axisLabel, { color: palette.muted }]}>{endLabel ?? ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xxs },
  row: { flexDirection: 'row', gap: spacing.xs },
  gutter: { width: AXIS_GUTTER - spacing.xs, justifyContent: 'space-between' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: AXIS_GUTTER },
  axisLabel: {
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
});
