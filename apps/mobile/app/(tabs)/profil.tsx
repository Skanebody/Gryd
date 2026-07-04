/**
 * GRYD — onglet Profil → PLAYER CARD (AMENDEMENT-08 §8, doc §18 ; conserve
 * AMENDEMENT-07 §8 + AMENDEMENT-02 §6). En-tête de jeu : PlayerAvatarFrame XL
 * (frame par tier JOUEUR, contour « moi »), KORO @koro, titre « Tenace du
 * 19ᵉ », Runner niv./tier, mini CrewCrest + crew, rang saison. Bloc PROGRESSION
 * (Level N → N+1 avec jauge XP DÉRIVÉE de la courbe réelle, Score Forme, série,
 * contribution crew — formulations POSITIVES). BADGES RARES EN GRAND
 * (BadgeCards horizontales) + lien Collection, « Mon territoire », Partager le
 * profil (ShareCard 4:5 révélée inline). Données démo — le niveau/tier/rang
 * sont DÉRIVÉS des règles réelles, aucun nombre magique local. Zéro position
 * live.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  BADGE_TIER_RANK,
  PLAYER_LEVEL_MAX,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
  XP_RATE_OF_POINTS,
  colors,
  fontSizes,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import {
  BADGE_FAMILIES,
  badgeById,
  badgeColor,
  badgeRewardLabel,
  BADGE_TOTAL,
} from '../../src/features/badges/catalog';
import { UNLOCKED_IDS } from '../../src/features/badges/demo';
import { MY_CREW } from '../../src/features/crew/demo';
import {
  FRAME_TIER_LABELS,
  playerLevelForXp,
  playerLevelXpTable,
  playerTierForLevel,
} from '../../src/features/crew/rules';
import { MY_SOCIAL_PROFILE } from '../../src/features/social/demo';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { TerritoryFranceMap } from '../../src/features/territory/TerritoryFranceMap';
import { franceKpi } from '../../src/features/territory/franceTerritories';
import { screen } from '../../src/lib/analytics';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt, formatMultiplier } from '../../src/ui/format';
import { BadgeCard, CrewCrest, PlayerAvatarFrame, ShareCard } from '../../src/ui/game';

const STREAK_WEEKS = 3;

/** XP permanent : 1:1 avec les points territoire (choix D18), source shared. */
const xp = MY_SOCIAL_PROFILE.xp * XP_RATE_OF_POINTS;
/** Niveau/tier DÉRIVÉS de la courbe réelle (features/crew/rules). */
const runnerLevel = playerLevelForXp(xp);
const runnerTier = playerTierForLevel(runnerLevel);
/** Bornes XP du niveau courant → jauge « Level N → N+1 » (courbe §43.1). */
const XP_TABLE = playerLevelXpTable();
const levelFloor = XP_TABLE[runnerLevel - 1] ?? 0;
const levelCeil = runnerLevel < PLAYER_LEVEL_MAX ? (XP_TABLE[runnerLevel] ?? levelFloor) : levelFloor;
const levelRatio = levelCeil > levelFloor ? (xp - levelFloor) / (levelCeil - levelFloor) : 1;
const streakMultiplier = Math.min(
  1 + STREAK_WEEKS * STREAK_MULTIPLIER_STEP,
  STREAK_MULTIPLIER_CAP,
);
/**
 * Territoire : KPI DÉRIVÉ des mêmes données démo que la vraie carte de France
 * (AMENDEMENT-13 §3 — digital twin, jamais codé en dur).
 */
const TERRITORY_KPI = franceKpi();

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

/** Libellé FR de famille pour les BadgeCards (les secrets restent « Secret »). */
function familyLabelOf(familyId: string): string {
  return BADGE_FAMILIES.find((f) => f.id === familyId)?.name ?? 'Secret';
}

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
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    screen('profil');
  }, []);

  return (
    <>
      <TabScreen title={MY_SOCIAL_PROFILE.displayName} kicker="PLAYER CARD">
        {/* ── Player Card : avatar hex XL + identité de jeu (doc §18) ── */}
        <View style={styles.headerCard}>
          <PlayerAvatarFrame
            name={MY_SOCIAL_PROFILE.displayName}
            tier={runnerTier}
            size="xl"
            isMe
          />
          <View style={styles.headerInfo}>
            <Text style={styles.handle}>@{MY_SOCIAL_PROFILE.handle}</Text>
            <Text style={styles.title}>{MY_SOCIAL_PROFILE.title}</Text>
            <Text style={styles.identity}>
              Runner niv. {runnerLevel} · {FRAME_TIER_LABELS[runnerTier]}
            </Text>
            <View style={styles.crewRow}>
              <CrewCrest seed={MY_CREW.seed} name={MY_CREW.name} size="s" />
              <Text style={styles.crewName} numberOfLines={1}>
                {MY_SOCIAL_PROFILE.crewName}
              </Text>
            </View>
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
            label={shareOpen ? 'Masquer la share card' : 'Partager mon profil'}
            icon="partage"
            onPress={() => {
              setShareOpen((v) => !v);
              if (!shareOpen) toast.show('Share card prête — capture-la pour la partager');
            }}
          />
        </View>

        {/* Share card 4:5 (doc §18/§24) — révélée inline, exportable */}
        {shareOpen ? (
          <View style={styles.shareCardWrap}>
            <ShareCard
              stat={`#${MY_SOCIAL_PROFILE.seasonRank}`}
              statLabel={`Rang saison · ${MY_SOCIAL_PROFILE.seasonScope}`}
              title={`${MY_SOCIAL_PROFILE.displayName} · ${MY_SOCIAL_PROFILE.crewName}`}
              subtitle={`Runner niv. ${runnerLevel} · ${MY_SOCIAL_PROFILE.title}`}
            >
              <PlayerAvatarFrame
                name={MY_SOCIAL_PROFILE.displayName}
                tier={runnerTier}
                size="l"
                isMe
              />
            </ShareCard>
          </View>
        ) : null}

        {/* ── PROGRESSION (doc §18) : Level N → N+1, jauge XP réelle ── */}
        <View style={styles.sectionRow}>
          <Icon name="niveau" size={14} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>PROGRESSION</Text>
        </View>
        <View style={styles.progressCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>
              Level {runnerLevel} <Text style={styles.levelArrow}>→</Text>{' '}
              {Math.min(runnerLevel + 1, PLAYER_LEVEL_MAX)}
            </Text>
            <Text style={styles.levelXp}>
              {formatInt(xp)} / {formatInt(levelCeil)} XP
            </Text>
          </View>
          <ProgressBar value={levelRatio} height={8} />
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>{MY_SOCIAL_PROFILE.formeScore}</Text>
              <Text style={styles.progressStatLabel}>Score Forme</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>
                {formatMultiplier(streakMultiplier)}
              </Text>
              <Text style={styles.progressStatLabel}>Série · {STREAK_WEEKS} sem</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>
                {MY_SOCIAL_PROFILE.crewChestContribPct} %
              </Text>
              <Text style={styles.progressStatLabel}>du coffre crew</Text>
            </View>
          </View>
        </View>

        {/* ── BADGES RARES EN GRAND (doc §18) : BadgeCards scrollables ── */}
        <View style={styles.sectionRow}>
          <Icon name="badge" size={14} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>BADGES RARES</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.rareScroll}
          contentContainerStyle={styles.rareScrollContent}
        >
          {RARE_BADGES.map((def) => (
            <View key={def.id} style={styles.rareCard}>
              <BadgeCard
                name={def.name}
                family={def.family}
                familyLabel={familyLabelOf(def.family)}
                familyColor={badgeColor(def)}
                tier={def.tier}
                state="unlocked"
                requirement={def.requirement}
                reward={badgeRewardLabel(def)}
                secret={def.secret}
                onPress={() => router.push('/badges')}
              />
            </View>
          ))}
        </ScrollView>
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

        {/* Mon territoire — aperçu tappable de la VRAIE France (AMENDEMENT-13 §3) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir mon territoire sur la carte de France"
          onPress={() => router.push('/territoire')}
          style={({ pressed }) => [styles.territoryCard, pressed && styles.dim]}
        >
          <Text style={styles.territoryTitle}>Mon territoire</Text>
          <Text style={styles.territorySubtitle}>
            Saison 0 · France entière capturable · 2 zones de guerre actives
          </Text>
          {/* Mini vraie carte statique (caméra France) — le tap ouvre l'écran plein */}
          <View style={styles.territoryPreview}>
            <TerritoryFranceMap preview />
          </View>
          <Text style={styles.heroNumber}>{formatInt(TERRITORY_KPI.totalZones)}</Text>
          <Text style={styles.heroLabel}>zones tenues · {TERRITORY_KPI.citiesLabel}</Text>
          <View style={styles.territoryOpenRow}>
            <Text style={styles.territoryOpenLabel}>Explorer la carte</Text>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
        </Pressable>

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
  identity: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 6, letterSpacing: 0.3 },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  crewName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  rank: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionCell: { flex: 1 },
  shareRow: { marginTop: 10 },
  shareCardWrap: { marginTop: 14 },

  // ── PROGRESSION ──
  progressCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 10,
  },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  levelLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  levelArrow: { color: colors.chartreuse },
  levelXp: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  progressStatsRow: { flexDirection: 'row', marginTop: 4 },
  progressStat: { flex: 1, gap: 2 },
  progressStatValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressStatLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },

  // ── Badges rares en grand ──
  rareScroll: { marginHorizontal: -spacing.cardPadding },
  rareScrollContent: { paddingHorizontal: spacing.cardPadding, gap: 12 },
  rareCard: { width: 230 },
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
  /** Aperçu vraie carte (mini RealMap statique) — hauteur fixe, coins card. */
  territoryPreview: {
    alignSelf: 'stretch',
    height: 190,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
    backgroundColor: colors.noir,
  },
  territoryOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  territoryOpenLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
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
