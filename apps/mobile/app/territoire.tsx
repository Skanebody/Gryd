/**
 * GRYD — page détaillée « Mon territoire » (/territoire), AMENDEMENT-18 PARTIE
 * B. Ouverte au tap depuis la card du Profil. Ce n'est PAS une carte
 * décorative : c'est un RÉSUMÉ STRATÉGIQUE personnel — voici ce que je contrôle
 * (VILLES) · ce qui est menacé (À DÉFENDRE) · mes prochaines actions (ROUTES
 * OUVERTES) · ma fierté (RECORDS TERRITOIRE).
 *
 * En-tête stratégique (« TERRITOIRE DE KORO · 55 zones tenues · Paris + Lille ·
 * 3 frontières contestées »), puis la VRAIE carte (TerritoryFranceMap, ~40 %
 * hauteur ≤ 260 px), puis 4 sections compactes (≤ 2 items visibles + « Voir
 * tout »). CTA bas contextuel : [Voir sur la carte] [Défendre] [Partager] —
 * jamais « Explorer la carte » vague. Vocabulaire zones/secteurs/frontières/
 * rues, libellés courts NON tronqués (Partie D), anti-shame, zéro position
 * live/tracé public. screen('territoire') au montage (§8, écran sans event
 * dédié). Données démo : franceKpi() (titre) + pageDemo (sections).
 */
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, spacing } from '@klaim/shared';
import { TerritoryFranceMap } from '../src/features/territory/TerritoryFranceMap';
import { dataNote } from '../src/features/map/territoryBuild';
import { TERRITORY_PAGE_DEMO } from '../src/features/territory/pageDemo';
import { ZoneLeaderboard } from '../src/features/territory/ZoneLeaderboard';
import { DEFAULT_ZONE_LEADERBOARD } from '../src/features/territory/leaderboardDemo';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import { useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/historique';

/** Section compacte : titre + ≤ 2 items visibles + « Voir tout » (anti-scroll). */
function Section({
  title,
  count,
  onSeeAll,
  children,
}: {
  title: string;
  count: number;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count > 2 && onSeeAll ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t(C.a11ySeeAll, { title })}
            onPress={onSeeAll}
          >
            <Text style={styles.seeAll}>{t(C.seeAll)}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function TerritoireScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const d = TERRITORY_PAGE_DEMO;

  useEffect(() => {
    screen('territoire');
  }, []);

  /** Prochaine menace urgente = cible du CTA « Défendre » (contextuel). */
  const urgent = d.threats.find((t) => t.urgent) ?? d.threats[0];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête stratégique ────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yBackProfile)}
              onPress={() => goBack('/profil')}
              hitSlop={12}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <View style={styles.backChevron}>
                <Icon name="chevron" size={20} color={colors.blanc} />
              </View>
            </Pressable>
            <Text style={styles.kicker}>{t(C.territoryKicker)}</Text>
            <View style={styles.back} />
          </View>

          <Text style={styles.title}>{t(C.territoryOf, { name: d.runner })}</Text>
          {/* P0 B4 (MVP_CHANGESET) — cet écran rend TERRITORY_PAGE_DEMO : depuis que la
              Battle Map lit les vraies captures, le présenter comme le joueur était un
              mensonge silencieux. Même formulation canonique que la carte (dataNote). */}
          <Text style={styles.demoNote}>
            {dataNote(false, false)}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryStrong}>
              {t(C.zonesHeld, { n: formatInt(d.totalZones) })}
            </Text>
            <Text style={styles.summaryDot}> · </Text>
            <Text style={styles.summaryMuted}>{d.citiesLabel}</Text>
            <Text style={styles.summaryDot}> · </Text>
            <Text style={styles.summaryContested}>
              {t(C.contestedBorders, { n: d.contestedBorders })}
            </Text>
          </View>
        </View>

        {/* ── La carte (résumé, ~40 % — hauteur ≤ 260 px) ────────────────── */}
        <View style={styles.mapWrap}>
          <TerritoryFranceMap style={styles.map} testID="territoire-france-map" />
        </View>

        {/* ── VILLES ──────────────────────────────────────────────────────── */}
        <Section
          title={t(C.sectionCities)}
          count={d.cities.length}
          onSeeAll={() => router.push('/(tabs)')}
        >
          {d.cities.slice(0, 2).map((c) => (
            <View key={c.city} style={styles.cityRow}>
              <View style={styles.cityLeft}>
                <Text style={styles.cityName}>{c.city}</Text>
                <Text style={styles.cityStatus}>{c.status}</Text>
              </View>
              <Text style={styles.cityZones}>{t(C.zonesCount, { n: formatInt(c.zones) })}</Text>
            </View>
          ))}
        </Section>

        {/* ── CLASSEMENT DE LA ZONE (AMENDEMENT-31 §3) ────────────────────────
            Emprunt Strava (segment/KOM) rendu GRYD : sur la zone la plus
            disputée (Canal), top conquérants/défenseurs + hook « raison de
            revenir ». Section légère, pas de card-dans-card (§A3). */}
        <ZoneLeaderboard data={DEFAULT_ZONE_LEADERBOARD} />

        {/* ── À DÉFENDRE ──────────────────────────────────────────────────── */}
        <Section
          title={t(C.sectionDefend)}
          count={d.threats.length}
          onSeeAll={() => router.push('/(tabs)')}
        >
          {d.threats.slice(0, 2).map((t) => (
            <View key={t.name} style={styles.itemRow}>
              <View
                style={[styles.itemIcon, t.urgent && styles.itemIconUrgent]}
                accessible={false}
              >
                <Icon
                  name={t.icon}
                  size={16}
                  color={t.urgent ? gameColors.danger : colors.gris}
                />
              </View>
              <Text style={styles.itemName}>{t.name}</Text>
              <Text style={[styles.itemDetail, t.urgent && styles.itemDetailUrgent]}>
                {t.detail}
              </Text>
            </View>
          ))}
        </Section>

        {/* ── ROUTES OUVERTES ─────────────────────────────────────────────── */}
        <Section
          title={t(C.sectionOpenRoutes)}
          count={d.routes.length}
          onSeeAll={() => router.push('/(tabs)')}
        >
          {d.routes.slice(0, 2).map((r) => (
            <View key={r.label} style={styles.itemRow}>
              <View style={styles.itemIcon} accessible={false}>
                <Icon name="route" size={16} color={colors.chartreuse} />
              </View>
              <Text style={styles.itemName}>{r.label}</Text>
              <Text style={styles.itemDetail}>{r.distance}</Text>
            </View>
          ))}
        </Section>

        {/* ── RECORDS TERRITOIRE (anti-shame : que du positif) ────────────── */}
        <Section title={t(C.sectionRecords)} count={d.records.length}>
          {d.records.slice(0, 2).map((rec) => (
            <View key={rec.label} style={styles.itemRow}>
              <View style={styles.itemIcon} accessible={false}>
                <Icon name={rec.icon} size={16} color={gameColors.gold} />
              </View>
              <Text style={styles.itemName}>{rec.label}</Text>
              <Text style={styles.itemRecord}>{rec.value}</Text>
            </View>
          ))}
        </Section>
      </ScrollView>

      {/* ── CTA bas contextuel (jamais « Explorer la carte » vague) ──────── */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.seeOnMap)}
          onPress={() => router.push('/(tabs)')}
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed]}
        >
          <Icon name="carte" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.ctaPrimaryLabel}>{t(C.seeOnMap)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yDefend, { name: urgent?.name ?? '' })}
          onPress={() => router.push('/route-planner?type=defense')}
          style={({ pressed }) => [styles.ctaGhost, pressed && styles.pressed]}
        >
          <Icon name="bouclier" size={iconSizes.md} color={colors.blanc} />
          {/* Zéro-lie : le bouton MÈNE à la planification de défense — il ne
              « met pas en défense » (aucun état réel derrière). Label stable. */}
          <Text style={styles.ctaGhostLabel}>{t(C.defend)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yShareTerritory)}
          onPress={() => router.push('/partage?template=conquete')}
          style={({ pressed }) => [styles.ctaIcon, pressed && styles.pressed]}
        >
          <Icon name="partage" size={iconSizes.md} color={colors.blanc} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.cardPadding },
  pressed: { opacity: 0.7 },

  // En-tête
  header: { paddingBottom: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 32, alignItems: 'flex-start' },
  backChevron: { transform: [{ scaleX: -1 }] },
  demoNote: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 6 },
  kicker: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginTop: 14,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  summaryStrong: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },
  summaryMuted: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryContested: { color: gameColors.contested, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryDot: { color: colors.gris, fontSize: fontSizes.sm },

  // Carte (≤ 260 px, ~40 %)
  mapWrap: {
    height: 220,
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  map: { flex: 1 },

  // Sections
  section: { marginTop: 22 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  seeAll: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },

  // Villes
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.carbone,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  cityLeft: { flexDirection: 'column' },
  cityName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  cityStatus: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  cityZones: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Items génériques (menaces / routes / records)
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconUrgent: { backgroundColor: gameColors.dangerSoft },
  itemName: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  itemDetail: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  itemDetailUrgent: { color: gameColors.danger },
  itemRecord: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },

  // CTA bas
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.noir,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: sizes.buttonMd,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  ctaPrimaryLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: sizes.buttonMd,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  ctaGhostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  ctaIcon: {
    width: sizes.buttonMd,
    height: sizes.buttonMd,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
});
