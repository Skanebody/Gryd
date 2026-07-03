/**
 * GRYD — jauge de progression horizontale (Crew Level, Crew Chest, Offensive,
 * Player Level — AMENDEMENT-06 §2). Piste carbone, remplissage chartreuse
 * (§C.3 (3) : la chartreuse porte le gain/la progression). Le remplissage est
 * borné [0,1]. Purement présentiel — aucune constante de jeu ici.
 */
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '@klaim/shared';

interface ProgressBarProps {
  /** Fraction remplie 0..1 (bornée). */
  value: number;
  /** Hauteur de la piste en px (défaut 8). */
  height?: number;
  /** Couleur du remplissage (défaut chartreuse). Toujours un token. */
  fill?: string;
}

export function ProgressBar({ value, height = 8, fill = colors.chartreuse }: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: fill,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
});
