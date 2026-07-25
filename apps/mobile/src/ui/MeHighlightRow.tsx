/**
 * GRYD — ligne « Vous » me-centric (classement / crew).
 * Contour chartreuse + barre de progression vers le rang suivant.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderState, colors, elevation, fontSizes, radii, spacing } from '@klaim/shared';
import { ProgressBar } from './ProgressBar';

export function MeHighlightRow({
  rankLabel,
  title,
  subtitle,
  value,
  progress,
  progressLabel,
  leading,
}: {
  rankLabel: string;
  title: string;
  subtitle?: string;
  value: string;
  /** 0..1 vers le rang suivant — omis si pas de cible. */
  progress?: number;
  progressLabel?: string;
  leading?: ReactNode;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.row}>
        <Text style={styles.rank}>{rankLabel}</Text>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.mid}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.sub} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
      {progress != null && progressLabel ? (
        <View style={styles.progressBlock}>
          <ProgressBar value={progress} height={3} fill={colors.chartreuse} />
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: borderState.active,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
  },
  leading: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1, gap: 2 },
  title: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  sub: { color: colors.gris, fontSize: fontSizes.xs },
  value: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressBlock: { gap: 6 },
  progressLabel: { color: colors.gris, fontSize: fontSizes.xs },
});
