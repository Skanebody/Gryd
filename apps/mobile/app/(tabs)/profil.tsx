/**
 * GRYD — onglet Profil (placeholder MVP, GRYD_prompt_pages_ux §10 +
 * AMENDEMENT-02 §6). Progression PERMANENTE (niveau/XP 1:1 points via
 * XP_RATE_OF_POINTS, streak, badges factices) + entrée « Mon territoire » :
 * mini carte de France (écran 04 de la maquette) avec chiffre héros.
 * La page Performance est accessible d'ICI (pas un onglet — AMENDEMENT-02 §5).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
  XP_RATE_OF_POINTS,
  colors,
  fontSizes,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { BadgeHex } from '../../src/features/badges/BadgeHex';
import { BADGE_TOTAL, badgeById, badgeColor } from '../../src/features/badges/catalog';
import { UNLOCKED_IDS, lastUnlockedIds } from '../../src/features/badges/demo';
import { FranceMap } from '../../src/features/territory/FranceMap';
import { screen } from '../../src/lib/analytics';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt, formatMultiplier } from '../../src/ui/format';

/** Données factices crédibles — cohérentes avec le classement (KORO, 8ᵉ, 4 210 pts). */
const FAKE_PROFILE = {
  pseudo: 'KORO',
  crew: 'LES FOULÉES 9³',
  level: 7,
  seasonPoints: 4210,
  streakWeeks: 3,
  parisHexes: 1835,
  lilleHexes: 312,
} as const;

/** XP permanent : 1:1 avec les points territoire (choix D18). */
const xp = FAKE_PROFILE.seasonPoints * XP_RATE_OF_POINTS;
const streakMultiplier = Math.min(
  1 + FAKE_PROFILE.streakWeeks * STREAK_MULTIPLIER_STEP,
  STREAK_MULTIPLIER_CAP,
);
const totalHexes = FAKE_PROFILE.parisHexes + FAKE_PROFILE.lilleHexes;

/**
 * Aperçu badges (AMENDEMENT-04) : les 5 derniers débloqués du set factice
 * (TODO(O1) user_badges) — hexagones sm, collection complète via /badges.
 */
const RECENT_BADGES = lastUnlockedIds(5)
  .map((id) => badgeById(id))
  .filter((def): def is NonNullable<typeof def> => def !== undefined);
const UNLOCKED_COUNT = UNLOCKED_IDS.size;

interface ProfileLink {
  label: string;
  detail: string;
  icon: IconName;
}

/** Entrées à venir — libellés directifs, rien de câblé (placeholder MVP). */
const LINKS: readonly ProfileLink[] = [
  { label: 'Performance', detail: 'Records, allure, régularité', icon: 'performance' },
  { label: 'Historique de courses', detail: 'Toutes tes conquêtes', icon: 'historique' },
  {
    label: 'Paramètres & confidentialité',
    detail: 'Zones privées, notifications, compte',
    icon: 'reglages',
  },
];

export default function ProfilScreen() {
  const { session, configured } = useSession();

  useEffect(() => {
    screen('profil');
  }, []);

  return (
    <TabScreen title={FAKE_PROFILE.pseudo} kicker="PROFIL">
      <Text style={styles.identity}>
        Niveau {FAKE_PROFILE.level} · {FAKE_PROFILE.crew}
      </Text>

      {/* Chips progression permanente — survit au reset de saison */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          {/* Flamme filaire chartreuse (charte §F chips : icône 16) — §C.3 (3) gain/streak */}
          <Icon name="serie" size={16} color={colors.chartreuse} />
          <Text style={styles.chipText}>
            Série {formatMultiplier(streakMultiplier)} · {FAKE_PROFILE.streakWeeks} sem
          </Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{formatInt(xp)} XP</Text>
        </View>
      </View>

      {/* Mon territoire — l'Hexagone (maquette écran 04) */}
      <View style={styles.territoryCard}>
        <Text style={styles.territoryTitle}>Mon territoire</Text>
        <Text style={styles.territorySubtitle}>
          Saison 0 · France entière capturable · 2 zones de guerre actives
        </Text>
        <FranceMap parisHexes={FAKE_PROFILE.parisHexes} lilleHexes={FAKE_PROFILE.lilleHexes} />
        <Text style={styles.heroNumber}>{formatInt(totalHexes)}</Text>
        <Text style={styles.heroLabel}>hexagones tenus dans toute la France</Text>
      </View>

      <View style={styles.sectionRow}>
        <Icon name="badge" size={14} color={colors.gris} />
        <Text style={styles.sectionRowLabel}>BADGES</Text>
      </View>
      {/* Derniers débloqués — BadgeHex = surface badge (exception polychrome §1) */}
      <View style={styles.badgeRow}>
        {RECENT_BADGES.map((def) => (
          <BadgeHex
            key={def.id}
            family={def.family}
            familyColor={badgeColor(def)}
            state="unlocked"
            size="sm"
            secret={def.secret}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir la collection de badges"
        onPress={() => router.push('/badges')}
        style={({ pressed }) => [styles.collectionLink, pressed && styles.collectionLinkPressed]}
      >
        <Text style={styles.collectionLinkLabel}>
          Voir la collection ({UNLOCKED_COUNT}/{BADGE_TOTAL})
        </Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>

      <Text style={styles.sectionLabel}>PLUS</Text>
      {LINKS.map((link) => (
        <View key={link.label} style={styles.linkRow}>
          {/* Icône filaire (charte §F) — réduit la friction de lecture */}
          <Icon name={link.icon} size={20} color={colors.blanc} />
          <View style={styles.linkInfo}>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <Text style={styles.linkDetail}>{link.detail}</Text>
          </View>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>
      ))}

      {configured && session ? (
        <View style={styles.signOutWrap}>
          {/* Destructif = ghost + libellé explicite (§F, pas de rouge) */}
          <GhostButton label="Se déconnecter" onPress={() => void signOut()} />
        </View>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  identity: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 6, letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
  territoryCard: {
    marginTop: 22,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
  },
  territoryTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  territorySubtitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroNumber: {
    color: colors.chartreuse, // §C.3 (3) : LE chiffre qui domine l'écran (addendum §E)
    fontSize: fontSizes.hero,
    fontWeight: '700',
    letterSpacing: -1.5,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
    // TODO fonts : Space Grotesk 700 (addendum §E) — police système en attendant
  },
  heroLabel: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 4 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  collectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginTop: 12,
  },
  collectionLinkPressed: { opacity: 0.7 },
  collectionLinkLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  linkInfo: { flex: 1 },
  linkLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  linkDetail: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3 },
  signOutWrap: { marginTop: 18 },
});
