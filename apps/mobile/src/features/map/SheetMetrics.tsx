/**
 * GRYD — RANGÉE DE MÉTRIQUES À SÉPARATEURS des sheets de décision de la Carte
 * (planches E04 « jamais 6 métriques » et E05 « 4 métriques MAX dans UN SEUL
 * bloc, jamais 4 cards »).
 *
 * COMPOSITION FIDÈLE AUX PLANCHES (recalage 26/07/2026). Chaque métrique se lit
 * sur DEUX niveaux typographiques, mesurés au pixel sur -selection10/-selection11 :
 *   • la VALEUR en gros (~28 px, rôle `typography.stat` — Inter Tight 800,
 *     tabular, tracking serré : les chiffres ne dansent pas quand la donnée
 *     change) ;
 *   • son UNITÉ petite juste à côté (« 0,42 » grand, « km² » petit, alignés sur
 *     la ligne de base) — jamais collée dans la même chaîne ;
 *   • le LIBELLÉ court en gris dessous.
 * Avant ce recalage la valeur était un simple texte de 15 px, unité comprise :
 * la hiérarchie « grand nombre » de la planche était perdue.
 *
 * DEUX RÈGLES DE FORME, toutes deux contraignantes :
 *   • AUCUN contenant. Pas de bordure, pas de fond : la sheet EST déjà une
 *     surface, et un bloc encadré à l'intérieur serait la card-dans-card que
 *     §A interdit. Ce qui sépare les métriques est un filet VERTICAL de 1 px.
 *   • AUCUNE cellule vide. Le composant rend la liste qu'on lui donne — et
 *     l'appelant ne lui donne QUE des métriques sourcées (zoneDecision.ts). Une
 *     métrique sans source ne devient jamais « — » ni « 0 » : elle n'est pas là.
 *
 * §A9 : valeur et libellé tiennent chacun sur UNE ligne et se réduisent plutôt
 * que de se tronquer (`adjustsFontSizeToFit`), y compris en allemand.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes } from '@klaim/shared';

export interface SheetMetric {
  /** Clé stable (rendu déterministe, pas d'index de tableau). */
  key: string;
  /** Valeur déjà FORMATÉE dans la langue du joueur, SANS unité (« 0,42 », « 3 »). */
  value: string;
  /**
   * Unité affichée PETITE à côté de la valeur (« km² », « km »). Absente quand la
   * métrique n'en porte pas (un nombre de zones, une ancienneté « 6 j » où le
   * « j » vit déjà dans la valeur) — on ne peint alors rien à côté.
   */
  unit?: string;
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
            {/* Valeur (gros) + unité (petit), alignées sur la ligne de base —
                la composition « grand nombre + petite unité » des planches. */}
            <View style={styles.valueRow}>
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                {m.value}
              </Text>
              {m.unit ? (
                <Text style={styles.unit} numberOfLines={1}>
                  {m.unit}
                </Text>
              ) : null}
            </View>
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
  // Ligne de base commune : l'unité « km² » s'assoit sur le pied du grand nombre.
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  // GROS NOMBRE des planches — rôle R6 « stat » (Inter Tight 800, tabular,
  // tracking serré) à la taille xl (28 px) mesurée sur -selection10. Recopié à la
  // main plutôt qu'étalé depuis `typography.stat` : ce rôle porte un `fontVariant`
  // en LECTURE SEULE que `StyleSheet` refuse à l'étalement (même contournement que
  // RealRunCard/StatBlock). `flexShrink` : l'unité ne pousse jamais le nombre hors
  // cellule ; §A9 est tenu par `adjustsFontSizeToFit` au rendu.
  value: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.xl,
    flexShrink: 1,
  },
  // Unité petite et grise, jamais collée à la valeur (marge d'un poil).
  unit: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700', marginLeft: 3 },
  // Plancher a11y : aucun texte porteur de sens sous 12 px.
  label: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
});
