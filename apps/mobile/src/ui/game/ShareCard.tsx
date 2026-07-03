/**
 * GRYD — ShareCard : carte 4:5 exportable visuellement (AMENDEMENT-08 §1,
 * doc §10 & §24). View stylisée prête à capturer : wordmark GRYD, slot visuel
 * (blason / badge / médaille via children), STAT HÉROS dominante (échelle typo
 * §E), sous-titre, hashtag. Fond noir charte — pensée pour les stories 4:5.
 */
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import type { ReactNode } from 'react';

export interface ShareCardProps {
  /** Stat héros (« +214 », « #7 », « 62 % ») — domine la carte. */
  stat: string;
  /** Libellé de la stat (« HEXES CAPTURÉS »). */
  statLabel: string;
  /** Titre haut (« KORO · LES FOULÉES 9³ »). */
  title?: string;
  /** Sous-titre (« Paris Est passe à 62 % »). */
  subtitle?: string;
  /** Hashtag bas de carte. */
  hashtag?: string;
  /** Teinte de la stat héros (défaut chartreuse — gain). Toujours un token. */
  accent?: string;
  /** Slot visuel central : CrewCrest, BadgeHex, LeagueMedal… */
  children?: ReactNode;
  /** Largeur imposée (hauteur dérivée 4:5). Défaut : s'étire au parent. */
  width?: number;
  style?: ViewStyle;
}

export function ShareCard({
  stat,
  statLabel,
  title,
  subtitle,
  hashtag = '#GRYD',
  accent = gameColors.crew,
  children,
  width,
  style,
}: ShareCardProps) {
  return (
    <View style={[styles.card, width !== undefined ? { width } : null, style]}>
      <Text style={styles.wordmark}>GRYD</Text>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}

      <View style={styles.center}>
        {children}
        <Text style={[styles.stat, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {stat}
        </Text>
        <Text style={styles.statLabel} numberOfLines={1}>
          {statLabel.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Text style={styles.hashtag}>{hashtag}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 4 / 5, // format story/feed 4:5 (doc §10)
    backgroundColor: colors.noir,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 4,
  },
  title: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.5 },
  center: { alignItems: 'center', gap: 8, flexShrink: 1 },
  // Stat héros : elle domine la carte (échelle typo §E).
  stat: { fontSize: fontSizes.hero, fontWeight: '800', letterSpacing: -1 },
  statLabel: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  subtitle: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },
  hashtag: { color: gameColors.crew, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 1 },
});
