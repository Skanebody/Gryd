/**
 * GRYD — RANGÉE DE MÉTRIQUES À SÉPARATEURS des sheets de décision de la Carte
 * (planches E04 « jamais 6 métriques » et E05 « 4 métriques MAX dans UN SEUL
 * bloc, jamais 4 cards »).
 *
 * DEUX RÈGLES DE FORME, toutes deux contraignantes :
 *   • AUCUN contenant. Pas de bordure, pas de fond : la sheet EST déjà une
 *     surface, et un bloc encadré à l'intérieur serait la card-dans-card que
 *     §A interdit. Ce qui sépare les métriques est un filet de 1 px, rien de plus.
 *   • AUCUNE cellule vide. Le composant rend la liste qu'on lui donne — et
 *     l'appelant ne lui donne QUE des métriques sourcées (zoneDecision.ts). Une
 *     métrique sans source ne devient jamais « — » ni « 0 » : elle n'est pas là.
 *
 * §A9 : chaque cellule tient sur UNE ligne et se réduit plutôt que de se
 * tronquer (`adjustsFontSizeToFit`), y compris en allemand.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes } from '@klaim/shared';

export interface SheetMetric {
  /** Clé stable (rendu déterministe, pas d'index de tableau). */
  key: string;
  /** Valeur déjà FORMATÉE dans la langue du joueur (« 0,42 km² », « 6 j »). */
  value: string;
  /** Libellé court, traduit. */
  label: string;
}

export function SheetMetrics({
  metrics,
  testID,
}: {
  metrics: readonly SheetMetric[];
  testID?: string;
}) {
  // Zéro métrique sourcée ⇒ zéro rangée. Pas une rangée vide, pas un filet seul.
  if (metrics.length === 0) return null;
  return (
    <View style={styles.row} testID={testID}>
      {metrics.map((m, i) => (
        <View key={m.key} style={styles.cellWrap}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.cell}>
            <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
              {m.value}
            </Text>
            <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
              {m.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', marginTop: 2 },
  // `flex: 1` sur le WRAPPER (et non la cellule) : le filet vit dans le flux,
  // donc les cellules gardent des largeurs égales quel qu'en soit le nombre.
  cellWrap: { flex: 1, flexDirection: 'row' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.grisLigne, marginRight: 12 },
  cell: { flex: 1, gap: 2, paddingVertical: 2 },
  value: {
    color: colors.blanc,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Plancher a11y : aucun texte porteur de sens sous 12 px.
  label: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
});
