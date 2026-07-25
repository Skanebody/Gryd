/**
 * GRYD — barres de signal GPS (antenne), façon indicateur de téléphone. Quatre
 * barres de hauteur croissante ; `level` (0-4, issu de `signalLevel`) = barres
 * pleines dérivées du GPS Trust / état RÉELS du tracker (jamais fabriqué). `tone`
 * colore les pleines : 'ok' = neutre discret, 'weak' = ambre — JAMAIS rouge : un
 * signal faible est NORMAL (intérieur, tunnel), pas un échec. Barres vides en
 * filet. Subtil, ambiant, jamais anxiogène. La logique vit dans `signalLevel.ts`
 * (PURE, Deno-testée) — ici, que le rendu.
 */
import { StyleSheet, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { type SignalTone } from './signalLevel';

/** Hauteurs croissantes (px) des 4 barres. */
const BAR_HEIGHTS = [4, 7, 10, 13] as const;

export interface SignalBarsProps {
  /** Barres pleines (0-4), issu de `signalLevel`. */
  level: number;
  /** Couleur des barres pleines. */
  tone?: SignalTone;
}

export function SignalBars({ level, tone = 'ok' }: SignalBarsProps) {
  const fill = tone === 'weak' ? gameColors.warn : colors.gris;
  return (
    <View style={styles.row} accessible={false} pointerEvents="none">
      {BAR_HEIGHTS.map((h, i) => (
        <View
          key={h}
          style={[styles.bar, { height: h, backgroundColor: i < level ? fill : colors.grisLigne }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 13 },
  bar: { width: 3, borderRadius: 1 },
});
