/**
 * GRYD — onglet Profil RENFORCÉ (AMENDEMENT-07 §8, doc social Partie C ;
 * conserve AMENDEMENT-02 §6 + AMENDEMENT-06). En-tête social : avatar hexagonal
 * à cadre par tier JOUEUR (AvatarHex) + mini-blason crew, @handle, ville, rang
 * de saison, niveau, titre. Puis chips progression permanente (série/XP), Score
 * Forme, contribution au coffre de crew (formulation anti-shame), badges rares,
 * « Mon territoire », collection de badges, accès Amis, et les entrées PLUS.
 * Boutons Ajouter / Inviter au crew / Partager le profil (icônes @klaim/shared).
 * Données démo (features/social/demo + features/badges/demo). Le niveau/tier/
 * rang sont DÉRIVÉS des règles réelles — aucun nombre magique local. Zéro
 * position live.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  BADGE_TIER_LABEL,
  BADGE_TIER_RANK,
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
import { UNLOCKED_IDS } from '../../src/features/badges/demo';
import {
  FRAME_TIER_LABELS,
  playerLevelForXp,
  playerTierForLevel,
} from '../../src/features/crew/rules';
import { AvatarHex } from '../../src/features/social/AvatarHex';
import { MY_SOCIAL_PROFILE } from '../../src/features/social/demo';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { FranceMap } from '../../src/features/territory/FranceMap';
import { screen } from '../../src/lib/analytics';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt, formatMultiplier } from '../../src/ui/format';

/** Territoire factice (cohérent avec l'ancien profil). */
const PARIS_HEXES = 1835;
const LILLE_HEXES = 312;
const STREAK_WEEKS = 3;

/** XP permanent : 1:1 avec les points territoire (choix D18), source shared. */
const xp = MY_SOCIAL_PROFILE.xp * XP_RATE_OF_POINTS;
/** Niveau/tier DÉRIVÉS de la courbe réelle (features/crew/rules). */
const runnerLevel = playerLevelForXp(xp);
const runnerTier = playerTierForLevel(runnerLevel);
const streakMultiplier = Math.min(
  1 + STREAK_WEEKS * STREAK_MULTIPLIER_STEP,
  STREAK_MULTIPLIER_CAP,
);
const totalHexes = PARIS_HEXES + LILLE_HEXES;

/**
 * Badges RARES = les 4 débloqués de plus haut tier (BADGE_TIER_RANK), du plus
 * rare au moins rare. Dérivé des stats démo (UNLOCKED_IDS) — jamais codé en dur.
 */
const RARE_BADGES = [...UNLOCKED_IDS]
  .map((id) => badgeById(id))
  .filter((def): def is NonNullable<typeof def> => def !== undefined && !def.legacy)
  .sort((a, b) => BADGE_TIER_RANK[b.tier] - BADGE_TIER_RANK[a.tier])
  .slice(0, 4);

const UNLOCKED_COUNT = UNLOCKED_IDS.size;

interface ProfileLink {
  label: string;
  detail: string;
  icon: IconName;
  href?: string;
}

const LINKS: readonly ProfileLink[] = [
  { label: 'Mes amis', detail: 'Amis, demandes, suggestions, QR', icon: 'ami', href: '/amis' },
  { label: 'Performance', detail: 'Records, allure, régularité', icon: 'performance' },
  { label: 'Historique de courses', detail: 'Toutes tes conquêtes', icon: 'historique' },
  { label: 'Arsenal', detail: 'Skins, objets capés, Club — Gear', icon: 'boutique', href: '/arsenal' },
  {
    label: 'Sources connectées',
    detail: 'GPS, Apple Health, Strava, WHOOP…',
    icon: 'lien',
    href: '/sources',
  },
  {
    label: 'Support course',
    detail: 'Course non comptée, signalement, données',
    icon: 'aide',
    href: '/support',
  },
  {
    label: 'Paramètres & confidentialité',
    detail: 'Zones privées, notifications, compte',
    icon: 'reglages',
  },
];

export default function ProfilScreen() {
  const { session, configured } = useSession();
  const toast = useToast();

  useEffect(() => {
    screen('profil');
  }, []);

  return (
    <>
      <TabScreen title={MY_SOCIAL_PROFILE.displayName} kicker="PROFIL">
        {/* En-tête social : avatar hexagonal + identité (§8) */}
        <View style={styles.headerCard}>
          <AvatarHex
            handle={MY_SOCIAL_PROFILE.handle}
            tier={runnerTier}
            crewTag={MY_SOCIAL_PROFILE.crewTag}
            size={92}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.handle}>@{MY_SOCIAL_PROFILE.handle}</Text>
            <Text style={styles.title}>{MY_SOCIAL_PROFILE.title}</Text>
            <View style={styles.metaRow}>
              <Icon name="pin" size={13} color={colors.gris} />
              <Text style={styles.metaText}>{MY_SOCIAL_PROFILE.city}</Text>
            </View>
            <Text style={styles.identity}>
              Runner niv. {runnerLevel} · {FRAME_TIER_LABELS[runnerTier]} ·{' '}
              {MY_SOCIAL_PROFILE.crewName}
            </Text>
            <Text style={styles.rank}>
              Rang saison #{MY_SOCIAL_PROFILE.seasonRank} · {MY_SOCIAL_PROFILE.seasonScope}
            </Text>
          </View>
        </View>

        {/* Actions sociales (§8) — ghost + icônes filaires */}
        <View style={styles.actionsRow}>
          <View style={styles.actionCell}>
            <GhostButton
              label="Ajouter"
              icon="ajoutami"
              onPress={() => router.push('/amis')}
            />
          </View>
          <View style={styles.actionCell}>
            <GhostButton
              label="Inviter au crew"
              icon="crew"
              onPress={() => toast.show('Invitation crew envoyée')}
            />
          </View>
        </View>
        <View style={styles.shareRow}>
          <GhostButton
            label="Partager mon profil"
            icon="partage"
            onPress={() => toast.show('Profil copié — @' + MY_SOCIAL_PROFILE.handle)}
          />
        </View>

        {/* Chips progression permanente — survit au reset de saison */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Icon name="serie" size={16} color={colors.chartreuse} />
            <Text style={styles.chipText}>
              Série {formatMultiplier(streakMultiplier)} · {STREAK_WEEKS} sem
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{formatInt(xp)} XP</Text>
          </View>
        </View>

        {/* Score Forme + contribution crew (motivation, formulation POSITIVE §11) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="serie" size={16} color={colors.chartreuse} />
            <Text style={styles.statValue}>{MY_SOCIAL_PROFILE.formeScore}</Text>
            <Text style={styles.statLabel}>Score Forme</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="coffre" size={16} color={colors.blanc} />
            <Text style={styles.statValue}>{MY_SOCIAL_PROFILE.crewChestContribPct} %</Text>
            <Text style={styles.statLabel}>de ton coffre de crew</Text>
          </View>
        </View>

        {/* Badges rares (§8) — les plus hauts tiers débloqués */}
        <View style={styles.sectionRow}>
          <Icon name="badge" size={14} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>BADGES RARES</Text>
        </View>
        <View style={styles.badgeRow}>
          {RARE_BADGES.map((def) => (
            <View key={def.id} style={styles.rareBadge}>
              <BadgeHex
                family={def.family}
                familyColor={badgeColor(def)}
                state="unlocked"
                tier={def.tier}
                size="sm"
                secret={def.secret}
              />
              <Text style={styles.rareTier}>{BADGE_TIER_LABEL[def.tier]}</Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir la collection de badges"
          onPress={() => router.push('/badges')}
          style={({ pressed }) => [styles.collectionLink, pressed && styles.dim]}
        >
          <Text style={styles.collectionLinkLabel}>
            Voir la collection ({UNLOCKED_COUNT}/{BADGE_TOTAL})
          </Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>

        {/* Mon territoire — l'Hexagone (maquette écran 04) */}
        <View style={styles.territoryCard}>
          <Text style={styles.territoryTitle}>Mon territoire</Text>
          <Text style={styles.territorySubtitle}>
            Saison 0 · France entière capturable · 2 zones de guerre actives
          </Text>
          <FranceMap parisHexes={PARIS_HEXES} lilleHexes={LILLE_HEXES} />
          <Text style={styles.heroNumber}>{formatInt(totalHexes)}</Text>
          <Text style={styles.heroLabel}>hexagones tenus dans toute la France</Text>
        </View>

        <Text style={styles.sectionLabel}>PLUS</Text>
        {LINKS.map((link) => (
          <Pressable
            key={link.label}
            accessibilityRole="button"
            accessibilityLabel={link.label}
            disabled={link.href === undefined}
            onPress={() => {
              if (link.href !== undefined) router.push(link.href);
              else if (__DEV__) console.log(`[profil] ${link.label} — écran à venir (O1)`);
            }}
            style={({ pressed }) => [
              styles.linkRow,
              pressed && link.href !== undefined && styles.dim,
            ]}
          >
            <Icon name={link.icon} size={20} color={colors.blanc} />
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkDetail}>{link.detail}</Text>
            </View>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        ))}

        {configured && session ? (
          <View style={styles.signOutWrap}>
            <GhostButton label="Se déconnecter" onPress={() => void signOut()} />
          </View>
        ) : null}
      </TabScreen>
      <ToastHost state={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.7 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  headerInfo: { flex: 1 },
  handle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0.3 },
  title: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  metaText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  identity: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 6, letterSpacing: 0.3 },
  rank: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionCell: { flex: 1 },
  shareRow: { marginTop: 10 },
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
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  statValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  rareBadge: { alignItems: 'center', gap: 4 },
  rareTier: { color: colors.gris, fontSize: 10, letterSpacing: 0.4 },
  collectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginTop: 14,
  },
  collectionLinkLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
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
    color: colors.chartreuse,
    fontSize: fontSizes.hero,
    fontWeight: '700',
    letterSpacing: -1.5,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  heroLabel: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 4 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 12,
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
