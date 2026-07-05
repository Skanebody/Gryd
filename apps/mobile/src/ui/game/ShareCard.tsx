/**
 * GRYD — ShareCard : carte exportable visuellement (AMENDEMENT-08 §1, doc §10
 * & §24 ; variants AMENDEMENT-20 §3). View stylisée prête à capturer, fond
 * carte sombre charte, trace chartreuse, zone en glow. Deux usages :
 *
 *  1. Legacy (course-result) : `stat` + `statLabel` + `title`/`subtitle` +
 *     `children` (slot visuel). Ratio 4:5 par défaut. INCHANGÉ.
 *  2. Templates de partage (écran /partage) : une CARTE PROPRE façon Strava —
 *     `kicker` (bandeau court « SECTEUR PRIS »), KPI `stat` dominant, ≤ 3
 *     `stats` en pied, `crest`/`children` discret, `ratio` réglable
 *     (Story 9:16 · Carré 1:1 · Feed 4:5). La discipline : ≤ 3 stats + 1 KPI,
 *     textes courts jamais tronqués, gros texte réservé aux chiffres.
 */
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import type { ReactNode } from 'react';

/** Format d'export de la card (change le ratio de la preview). */
export type ShareCardRatio = 'story' | 'square' | 'feed';

/** Aspect (largeur / hauteur) par format. */
export const SHARE_CARD_ASPECT: Record<ShareCardRatio, number> = {
  story: 9 / 16, // Instagram / TikTok stories
  square: 1, // feed carré
  feed: 4 / 5, // feed portrait (défaut historique)
};

/** Une mini-stat de pied de card (façon Strava : valeur GROSSE, label discret). */
export interface ShareStat {
  value: string;
  label: string;
}

export interface ShareCardProps {
  /** Stat héros (« +214 », « #7 », « 62 % ») — domine la carte. */
  stat: string;
  /** Libellé de la stat (« HEXES CAPTURÉS »). */
  statLabel: string;
  /** Bandeau court en haut (« SECTEUR PRIS », « RÉPUBLIQUE DÉFENDUE »). */
  kicker?: string;
  /** Titre haut (« KORO · LES FOULÉES 9³ »). */
  title?: string;
  /** Sous-titre (« Paris Est passe à 62 % »). */
  subtitle?: string;
  /** Jusqu'à 3 mini-stats en pied (façon Strava : distance · allure · zones). */
  stats?: readonly ShareStat[];
  /** Hashtag bas de carte. */
  hashtag?: string;
  /** Teinte de la stat héros + accents (défaut chartreuse — gain). Token only. */
  accent?: string;
  /** Slot visuel central : mini-carte, bouclier, avant/après… */
  children?: ReactNode;
  /** Blason crew discret (coin bas). */
  crest?: ReactNode;
  /** Format d'export (règle l'aspect). Défaut : `feed` (4:5). */
  ratio?: ShareCardRatio;
  /** Largeur imposée (hauteur dérivée du ratio). Défaut : s'étire au parent. */
  width?: number;
  style?: ViewStyle;
}

export function ShareCard({
  stat,
  statLabel,
  kicker,
  title,
  subtitle,
  stats,
  hashtag = '#GRYD',
  accent = gameColors.crew,
  children,
  crest,
  ratio = 'feed',
  width,
  style,
}: ShareCardProps) {
  const aspect = SHARE_CARD_ASPECT[ratio];
  const trimmed = stats?.slice(0, 3);
  // Le KPI domine, mais un carré 1:1 (court) ne peut pas porter le hero plein :
  // on l'ajuste au ratio pour que rien ne se chevauche (web = pas d'autoshrink).
  const heroSize = ratio === 'square' ? fontSizes.xxl : fontSizes.hero;
  return (
    <View
      style={[
        styles.card,
        { aspectRatio: aspect },
        width !== undefined ? { width } : null,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.wordmark}>GRYD</Text>
        {kicker ? (
          <View style={[styles.kickerPill, { borderColor: accent }]}>
            <Text style={[styles.kickerText, { color: accent }]} numberOfLines={1}>
              {kicker}
            </Text>
          </View>
        ) : null}
      </View>

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}

      <View style={styles.center}>
        {children}
        <Text
          style={[styles.stat, { color: accent, fontSize: heroSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
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

      {trimmed && trimmed.length > 0 ? (
        <View style={styles.statsRow}>
          {trimmed.map((s, i) => (
            <View key={`${s.label}-${i}`} style={styles.statCell}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text style={styles.statCellLabel} numberOfLines={1}>
                {s.label.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        {crest ? <View style={styles.crest}>{crest}</View> : <View />}
        <Text style={styles.hashtag}>{hashtag}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: gameColors.carbon, // fond carte sombre (§3)
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 4,
  },
  kickerPill: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '68%',
  },
  kickerText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
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
  // Pied « façon Strava » : 3 chiffres alignés, labels discrets.
  statsRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: 12,
  },
  statCell: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800', letterSpacing: -0.5 },
  statCellLabel: { color: colors.gris, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  footer: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  crest: { opacity: 0.9 },
  hashtag: { color: gameColors.crew, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 1 },
});
