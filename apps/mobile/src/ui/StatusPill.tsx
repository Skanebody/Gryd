/**
 * GRYD — pill d'état live (boucle, alerte, succès).
 * tone=accent → fond chartreuse / texte noir (urgence positive).
 * tone=warn → fond carbone / point rival.
 * tone=neutral → fond carbone / point gris.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, elevation, fontSizes, gameColors, radii } from '@klaim/shared';

export type StatusPillTone = 'accent' | 'warn' | 'neutral';

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusPillTone;
}) {
  const accent = tone === 'accent';
  const warn = tone === 'warn';
  return (
    <View
      accessibilityRole="text"
      style={[styles.pill, accent && styles.pillAccent, warn && styles.pillWarn]}
    >
      <View
        style={[
          styles.dot,
          accent && styles.dotOnDark,
          warn && styles.dotWarn,
          !accent && !warn && styles.dotNeutral,
        ]}
      />
      <Text style={[styles.label, accent && styles.labelOnAccent]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '92%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: elevation.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
  },
  pillAccent: {
    backgroundColor: colors.chartreuse,
    borderColor: colors.chartreuse,
  },
  pillWarn: {
    borderColor: gameColors.rival,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOnDark: { backgroundColor: colors.noir },
  dotWarn: { backgroundColor: gameColors.rival },
  dotNeutral: { backgroundColor: colors.chartreuse },
  label: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelOnAccent: { color: colors.noir },
});
