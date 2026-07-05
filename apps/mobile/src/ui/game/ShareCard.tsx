/**
 * GRYD — ShareCard : carte exportable visuellement (AMENDEMENT-08 §1, doc §10
 * & §24 ; variants AMENDEMENT-20 §3 ; carte 3D AMENDEMENT-24). View stylisée
 * prête à capturer, fond carte sombre charte, trace chartreuse, zone en glow.
 * Usages :
 *
 *  1. Legacy (course-result) : `stat` + `statLabel` + `title`/`subtitle` +
 *     `children` (slot visuel). Ratio 4:5 par défaut. INCHANGÉ.
 *  2. Templates de partage (écran /partage) : une CARTE PROPRE façon Strava —
 *     `kicker` (bandeau court « SECTEUR PRIS »), KPI `stat` dominant, ≤ 3
 *     `stats` en pied, `crest`/`children` discret, `ratio` réglable
 *     (Story 9:16 · Carré 1:1 · Feed 4:5). La discipline : ≤ 3 stats + 1 KPI,
 *     textes courts jamais tronqués, gros texte réservé aux chiffres.
 *  3. Carte 3D (AMENDEMENT-24) : `mapBackground` = un slot PLEIN CADRE derrière
 *     tout le contenu (la GRYD 3D Conquest Map pitchée). Un scrim sombre discret
 *     (neutre, charte §F — jamais coloré) garde le KPI lisible par-dessus la
 *     carte. Le format `mapOnly` (« Carte seule ») réduit la chrome au strict :
 *     `GRYD` en haut + KPI + 1 ligne en bas (ni kicker, ni stats, ni sous-titre)
 *     — la carte en GRAND.
 */
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import type { ReactNode } from 'react';

/** Format d'export de la card (change le ratio de la preview). */
export type ShareCardRatio = 'story' | 'square' | 'feed' | 'mapOnly';

/** Aspect (largeur / hauteur) par format. */
export const SHARE_CARD_ASPECT: Record<ShareCardRatio, number> = {
  story: 9 / 16, // Instagram / TikTok stories
  square: 1, // feed carré
  feed: 4 / 5, // feed portrait (défaut historique)
  mapOnly: 3 / 4, // « Carte seule » : carte en grand, chrome minimal (AMENDEMENT-24)
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
  /**
   * AMENDEMENT-24 — CARTE 3D : slot PLEIN CADRE derrière tout le contenu (la
   * GRYD 3D Conquest Map pitchée). Un scrim sombre discret garde le KPI lisible.
   * Défaut absent = card historique (fond carbon plein) — non-régression.
   */
  mapBackground?: ReactNode;
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
  mapBackground,
  crest,
  ratio = 'feed',
  width,
  style,
}: ShareCardProps) {
  const aspect = SHARE_CARD_ASPECT[ratio];
  // « Carte seule » (AMENDEMENT-24) : chrome minimale — GRYD + KPI + 1 ligne, la
  // carte en grand. Ni kicker, ni pied de stats, ni sous-titre.
  const mapOnly = ratio === 'mapOnly';
  const trimmed = mapOnly ? undefined : stats?.slice(0, 3);
  // Le KPI domine, mais un carré 1:1 (court) ne peut pas porter le hero plein :
  // on l'ajuste au ratio pour que rien ne se chevauche (web = pas d'autoshrink).
  const heroSize = ratio === 'square' ? fontSizes.xxl : fontSizes.hero;
  const hasMap = mapBackground !== undefined;
  return (
    <View
      style={[
        styles.card,
        // Sur fond carte, on retire le padding latéral pour un plein cadre — le
        // contenu reprend sa marge via un calque intérieur (chrome).
        hasMap ? styles.cardMap : null,
        { aspectRatio: aspect },
        width !== undefined ? { width } : null,
        style,
      ]}
    >
      {/* AMENDEMENT-24 — carte PLEIN CADRE + scrim sombre neutre (lisibilité du
          KPI ; jamais d'ombre colorée, charte §F). */}
      {hasMap ? (
        <>
          <View style={styles.mapLayer} pointerEvents="none">
            {mapBackground}
          </View>
          <View style={styles.mapScrim} pointerEvents="none" />
        </>
      ) : null}

      {/* Contenu (chrome) — au-dessus de la carte ; reprend le padding en mode carte. */}
      <View style={[styles.chrome, hasMap ? styles.chromeOnMap : null]}>
        <View style={styles.topRow}>
          <Text style={styles.wordmark}>GRYD</Text>
          {kicker && !mapOnly ? (
            <View style={[styles.kickerPill, { borderColor: accent }]}>
              <Text style={[styles.kickerText, { color: accent }]} numberOfLines={1}>
                {kicker}
              </Text>
            </View>
          ) : null}
        </View>

        {title && !mapOnly ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}

        {/* En « Carte seule » le bloc KPI descend en bas (la carte occupe le
            haut) ; sinon il reste centré comme historiquement. */}
        <View style={mapOnly ? styles.centerBottom : styles.center}>
          {!hasMap ? children : null}
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
          {subtitle && !mapOnly ? (
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
          {crest && !mapOnly ? <View style={styles.crest}>{crest}</View> : <View />}
          <Text style={styles.hashtag}>{hashtag}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // AMENDEMENT-22 : la story EST le container et FLOTTE — contour très discret
  // (filet à peine visible) + ombre neutre douce (jamais colorée, charte §F). Elle
  // se pose sur l'espace, elle ne s'enferme pas dans une grosse card.
  card: {
    backgroundColor: gameColors.carbon, // fond carte sombre (§3)
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(250,250,247,0.05)', // filet quasi invisible (≈ moitié du hairline)
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    // Ombre portée neutre discrète — donne l'effet « posé/flottant ».
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  // AMENDEMENT-24 — carte plein cadre : le padding passe au calque `chrome`
  // (la carte, elle, touche les bords ; seul le contenu garde sa marge).
  cardMap: {
    padding: 0,
    justifyContent: 'flex-start',
  },
  // La carte 3D occupe tout le cadre, DERRIÈRE le contenu.
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  // Scrim sombre neutre (jamais coloré) : léger, il détache le KPI de la carte
  // sans l'éteindre (charte §F — l'urgence/valeur passe par le mot et le chiffre).
  mapScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,11,9,0.28)',
  },
  // Calque du contenu au-dessus de la carte (occupe tout le cadre, colonne).
  chrome: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // En mode carte, le contenu reprend la marge que la card a cédée.
  chromeOnMap: {
    padding: spacing.cardPadding,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: '76%', // assez large pour « ZONE DÉFENDUE » sur ratio story (jamais tronqué)
    flexShrink: 1,
  },
  kickerText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.5 },
  center: { alignItems: 'center', gap: 8, flexShrink: 1 },
  // « Carte seule » : le bloc KPI est ancré vers le bas (la carte tient le haut),
  // aligné à gauche pour un pied de carte sobre (GRYD en haut, KPI + 1 ligne en bas).
  centerBottom: { alignItems: 'flex-start', gap: 6, marginTop: 'auto', flexShrink: 1 },
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
