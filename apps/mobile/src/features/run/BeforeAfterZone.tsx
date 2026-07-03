/**
 * GRYD — mini avant/après de zone (étape « Zone modifiée » du résultat,
 * AMENDEMENT-08 §5, doc §10). Deux rosaces hex (19 cellules, rayon 2) : le %
 * de contrôle du crew allume les cellules du centre vers le bord — les
 * cellules GAGNÉES par cette course sont soulignées en chartreuse pleine.
 * Purement schématique (aucune géo réelle) — le serveur décide du territoire.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { hexPolygonPoints } from './simulation';

/** Rosace hex rayon 2 en coordonnées axiales (q, r) — centre vers le bord. */
const AXIAL: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1],
  [2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1],
  [-2, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [2, -1],
];

const CLUSTER_R = 9; // rayon d'un hex de rosace (unités viewBox)
const VB = 100; // viewBox carré, rosace centrée
const SQRT3 = Math.sqrt(3);

function axialToCenter(q: number, r: number): { cx: number; cy: number } {
  return {
    cx: VB / 2 + SQRT3 * CLUSTER_R * (q + r / 2),
    cy: VB / 2 + 1.5 * CLUSTER_R * r,
  };
}

/** Nombre de cellules allumées pour un % de contrôle (borné 0..19). */
function litCount(pct: number): number {
  return Math.max(0, Math.min(AXIAL.length, Math.round((pct / 100) * AXIAL.length)));
}

function Cluster({ lit, gainedFrom }: { lit: number; gainedFrom?: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`}>
      {AXIAL.map(([q, r], i) => {
        const { cx, cy } = axialToCenter(q, r);
        const on = i < lit;
        const gained = on && gainedFrom !== undefined && i >= gainedFrom;
        return (
          <Polygon
            key={`${q}:${r}`}
            points={hexPolygonPoints(cx, cy, CLUSTER_R - 0.7)}
            fill={on ? (gained ? colors.chartreuse40 : colors.chartreuse14) : 'none'}
            stroke={gained ? colors.chartreuse : on ? colors.chartreuse40 : colors.grisLigne}
            strokeWidth={gained ? 1.6 : 1}
          />
        );
      })}
    </Svg>
  );
}

export interface BeforeAfterZoneProps {
  zoneName: string;
  pctBefore: number;
  pctAfter: number;
}

export function BeforeAfterZone({ zoneName, pctBefore, pctAfter }: BeforeAfterZoneProps) {
  const before = litCount(pctBefore);
  const after = Math.max(before, litCount(pctAfter));
  return (
    <View style={styles.card}>
      <Text style={styles.zone} numberOfLines={1}>
        {zoneName.toUpperCase()}
      </Text>
      <View style={styles.row}>
        <View style={styles.side}>
          <View style={styles.cluster}>
            <Cluster lit={before} />
          </View>
          <Text style={styles.sideLabel}>AVANT</Text>
          <Text style={styles.pct}>{pctBefore} %</Text>
        </View>
        <Icon name="chevron" size={20} color={colors.gris} />
        <View style={styles.side}>
          <View style={styles.cluster}>
            <Cluster lit={after} gainedFrom={before} />
          </View>
          <Text style={styles.sideLabel}>APRÈS</Text>
          <Text style={[styles.pct, styles.pctAfter]}>{pctAfter} %</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
    gap: 12,
  },
  zone: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  side: { flex: 1, alignItems: 'center', gap: 4 },
  cluster: { width: '78%', aspectRatio: 1 },
  sideLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  pct: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  pctAfter: { color: colors.chartreuse },
});
