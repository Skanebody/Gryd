/**
 * GRYD — E18 : LA grammaire unique des trois blocs de la planche.
 *
 *     CHIFFRE  →  GRAPHIQUE  →  CONCLUSION EN LANGAGE NATUREL
 *
 * Les trois blocs (volume · territoire · régularité) passent tous par ici : c'est
 * ce qui fait de l'écran une ANALYSE et non un tableau de bord SaaS. Le joueur
 * apprend la grammaire une fois, puis la relit deux fois sans effort.
 *
 * UNE surface N1 (`elevation.surface`) par bloc, JAMAIS de sous-card : le
 * graphique, la légende et la conclusion vivent à plat dedans (§A « jamais de
 * card dans card »). Les blocs se séparent par l'ESPACE, pas par des contours
 * (règle 80/20 : un contour signale un état, pas une frontière de section).
 *
 * HONNÊTETÉ : chaque emplacement est NULLABLE et disparaît quand sa source
 * manque. Un bloc sans chiffre n'affiche pas « 0 » ; un bloc sans assez de
 * courses n'affiche pas un graphique vide — il dit ce qui manque (`note`).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  colors,
  elevation,
  fontSizes,
  fonts,
  radii,
  spacing,
  typography,
} from '@klaim/shared';

export interface StatBlockProps {
  /** Kicker du bloc (« VOLUME D'ACTIVITÉ ») — mis en majuscules par le style. */
  title: string;
  /** Le grand chiffre, déjà formaté. `null` = pas de source lue : on n'affiche RIEN. */
  value?: string | null;
  /** Unité posée à côté du chiffre (km, km²…) — invariant, jamais traduite. */
  unit?: string | null;
  /** Variation. `positive` colore en chartreuse ; une baisse reste GRISE, jamais rouge. */
  delta?: { text: string; positive: boolean } | null;
  /** Précision sous le chiffre (« 12 zones tenues »). */
  sub?: string | null;
  /** Le graphique. `null` = pas assez de données : on ne peint pas un graphe vide. */
  chart?: ReactNode;
  /** Légende DIRECTE sous le graphique (jamais une légende distante). */
  caption?: string | null;
  /** LA conclusion en langage naturel — la réponse que le regard cherchait. */
  conclusion?: string | null;
  /** État du bloc (insuffisance, lecture en cours, échec) — rendu à la place du reste. */
  note?: string | null;
}

export function StatBlock({
  title,
  value,
  unit,
  delta,
  sub,
  chart,
  caption,
  conclusion,
  note,
}: StatBlockProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.kicker} numberOfLines={1} ellipsizeMode="clip">
        {title}
      </Text>

      {value ? (
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="clip">
            {value}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      ) : null}

      {/* Aucun `numberOfLines` sur ces lignes : elles passent à la ligne plutôt
          que de se faire couper par un « … » (§A.9). */}
      {delta ? (
        <Text style={[styles.delta, delta.positive && styles.deltaUp]}>{delta.text}</Text>
      ) : null}
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}

      {chart ? <View style={styles.chart}>{chart}</View> : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {conclusion ? <Text style={styles.conclusion}>{conclusion}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // UNE surface N1. Pas de contour : les blocs se séparent par l'espace.
  block: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xxs,
  },
  kicker: { ...typography.kicker, color: colors.gris, textTransform: 'uppercase' },

  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs, marginTop: spacing.xxs },
  // Rôle R6 « stat » recopié à la main : `typography.stat` porte un `fontVariant`
  // en lecture seule que StyleSheet refuse à l'étalement (TextStyle le veut
  // mutable). Mêmes valeurs, chiffres TABULAIRES compris.
  value: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * 1.1,
  },
  unit: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.md },

  // Une BAISSE n'est pas une faute : gris neutre, jamais de rouge d'alerte.
  delta: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] },
  deltaUp: { color: colors.chartreuse },
  sub: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },

  chart: { marginTop: spacing.sm },
  caption: { color: colors.grisFaible, fontFamily: fonts.text, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.45 },
  // La conclusion est la PHRASE que le regard cherchait : blanche, jamais grise.
  conclusion: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.xs,
  },
  note: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.xxs,
  },
});
