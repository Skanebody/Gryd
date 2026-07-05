/**
 * GRYD — onglet Profil COMPACT (AMENDEMENT-17 §1.3). Un écran = une identité,
 * pas d'action de course : la Player Card (nom · level · crew · « 55 zones
 * tenues · Paris + Lille » · rang ville) porte deux CTA sobres — [Partager] /
 * [Modifier mon profil], JAMAIS un GO, jamais « Ajouter » sur SON propre
 * profil. Puis 3 modules seulement, ordre AMENDEMENT-17 : Territoire (remonté,
 * intégré haut) → Progression → Badges (3 équipés + « Voir collection », pas de
 * carrousel géant). Les listes longues (collection, historique, perf, amis…)
 * descendent en liens vers des pages dédiées. Niveau/tier/rang DÉRIVÉS des
 * règles réelles (features/crew/rules) — aucun nombre magique local. Zéro
 * position live.
 *
 * RETOUR FONDATEUR : « pas trouvé les boutons pour modifier le profil » → la
 * card porte DEUX affordances d'édition ÉVIDENTES (bouton plein « Modifier mon
 * profil » + crayon sur l'avatar) vers /profil-edit. L'IDENTITÉ affichée (nom,
 * titre, ville, avatar, badges) vient du profil ÉDITABLE persisté (useMyProfile)
 * → toute édition se reflète immédiatement au retour. Le FRAME cosmétique équipé
 * (useEquippedCosmetics) est rendu autour de l'avatar : équiper a un effet réel.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BADGE_TIER_RANK,
  PLAYER_LEVEL_MAX,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
  XP_RATE_OF_POINTS,
  badgeKeyByName,
  colors,
  fontSizes,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import {
  badgeById,
  badgeColor,
  BADGE_TOTAL,
} from '../../src/features/badges/catalog';
import { BadgeHex } from '../../src/features/badges/BadgeHex';
import { UNLOCKED_IDS } from '../../src/features/badges/demo';
import { MY_CREW } from '../../src/features/crew/demo';
import {
  FRAME_TIER_LABELS,
  playerLevelForXp,
  playerLevelXpTable,
  playerTierForLevel,
} from '../../src/features/crew/rules';
import { MY_SOCIAL_PROFILE } from '../../src/features/social/demo';
import { PlayerCardAvatar } from '../../src/features/social/PlayerCardAvatar';
import { effectiveInitials, useMyProfile } from '../../src/features/social/profileStore';
import { useEquippedCosmetics, itemByKey, isTitleItem } from '../../src/features/arsenal';
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
import { CrewCrest, InlineRunCTA, ShareCard } from '../../src/ui/game';

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

type BadgeDefT = NonNullable<ReturnType<typeof badgeById>>;

/**
 * Badges affichables = débloqués, non-legacy, triés du plus rare au moins rare
 * (BADGE_TIER_RANK). Dérivé des stats démo (UNLOCKED_IDS) — jamais codé en dur.
 */
const DISPLAYABLE_BADGES: readonly BadgeDefT[] = [...UNLOCKED_IDS]
  .map((id) => badgeById(id))
  .filter((def): def is BadgeDefT => def !== undefined && !def.legacy)
  .sort((a, b) => BADGE_TIER_RANK[b.tier] - BADGE_TIER_RANK[a.tier]);

/** Défaut « équipés » = les 3 plus rares (AMENDEMENT-17 : 3, pas un carrousel). */
const DEFAULT_FEATURED_BADGES: readonly BadgeDefT[] = DISPLAYABLE_BADGES.slice(0, 3);

/**
 * Badges mis en avant EFFECTIFS : le choix manuel du joueur (featuredBadgeIds)
 * s'il est renseigné et valide, sinon le défaut (3 plus rares). On ne garde que
 * des badges réellement débloqués → jamais un slot vide/verrouillé sur la card.
 */
function resolveFeaturedBadges(chosenIds: readonly string[]): readonly BadgeDefT[] {
  const chosen = chosenIds
    .map((id) => DISPLAYABLE_BADGES.find((b) => b.id === id))
    .filter((def): def is BadgeDefT => def !== undefined);
  return chosen.length > 0 ? chosen.slice(0, 3) : DEFAULT_FEATURED_BADGES;
}

const UNLOCKED_COUNT = UNLOCKED_IDS.size;

interface ProfileLink {
  label: string;
  detail: string;
  icon: IconName;
  href?: string;
}

/**
 * PLUS — toutes les listes longues descendent en liens vers des pages dédiées
 * (AMENDEMENT-17 : « Listes longues → pages dédiées »). Aucun contenu déroulé
 * dans le profil lui-même.
 */
const LINKS: readonly ProfileLink[] = [
  { label: 'Mes amis', detail: 'Amis, demandes, suggestions, QR', icon: 'ami', href: '/amis' },
  { label: 'Performance', detail: 'Score Forme, records, impact GRYD', icon: 'performance', href: '/performance' },
  { label: 'Historique de courses', detail: 'Toutes tes conquêtes', icon: 'historique', href: '/historique' },
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
    href: '/parametres',
  },
];

export default function ProfilScreen() {
  const { session, configured } = useSession();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [shareOpen, setShareOpen] = useState(false);

  /** Profil ÉDITABLE persisté — l'édition depuis /profil-edit se reflète ici. */
  const { profile } = useMyProfile();
  /** Cosmétiques ÉQUIPÉS persistés — frame autour de l'avatar + titre affiché. */
  const { equipped } = useEquippedCosmetics();

  /** Titre affiché : un TITRE cosmétique équipé prime sur le titre éditorial. */
  const equippedTitleItem = equipped.profile ? itemByKey(equipped.profile) : undefined;
  const displayedTitle =
    equippedTitleItem && isTitleItem(equippedTitleItem)
      ? equippedTitleItem.name.replace(/^Titre\s*«\s*/, '').replace(/\s*»$/, '')
      : profile.title;

  /** Initiales + couleur d'avatar issues du profil éditable. */
  const initials = effectiveInitials(profile);
  /** Badges mis en avant : choix du joueur, sinon les 3 plus rares. */
  const featuredBadges = useMemo(
    () => resolveFeaturedBadges(profile.featuredBadgeIds),
    [profile.featuredBadgeIds],
  );

  useEffect(() => {
    screen('profil');
  }, []);

  const openEdit = () => router.push('/profil-edit');

  return (
    <>
      {/* Accès Paramètres — icône réglages en haut à droite, hors du flux compact */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir les paramètres"
        hitSlop={12}
        onPress={() => router.push('/parametres')}
        style={({ pressed }) => [
          styles.settingsBtn,
          { top: insets.top + 14 },
          pressed && styles.dim,
        ]}
      >
        <Icon name="reglages" size={22} color={colors.blanc} />
      </Pressable>
      <TabScreen title={profile.displayName} kicker="PLAYER CARD">
        {/* ── Player Card compacte : identité + 2 chiffres clés + rang ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            {/* Avatar + crayon d'édition ÉVIDENT posé dessus (affordance 1/2) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Modifier mon profil"
              onPress={openEdit}
              hitSlop={8}
              style={({ pressed }) => [styles.avatarPress, pressed && styles.dim]}
            >
              <PlayerCardAvatar
                initials={initials}
                fillColor={profile.avatarColor}
                tier={runnerTier}
                equippedFrameKey={equipped.profile}
                size={72}
                isMe
              />
              <View style={styles.editPencil}>
                <Icon name="profil" size={13} color={colors.noir} />
              </View>
            </Pressable>
            <View style={styles.headerInfo}>
              <Text style={styles.handle} numberOfLines={1}>
                {profile.displayName}
              </Text>
              {/* Titre affiché (cosmétique équipé prioritaire) + level/tier */}
              <Text style={styles.title} numberOfLines={1}>
                {displayedTitle}
              </Text>
              <Text style={styles.identity} numberOfLines={1}>
                Level {runnerLevel} · {FRAME_TIER_LABELS[runnerTier]} · {profile.city}
              </Text>
              <View style={styles.crewRow}>
                <CrewCrest seed={MY_CREW.seed} name={MY_CREW.name} size="s" />
                <Text style={styles.crewName} numberOfLines={1}>
                  {profile.crewName}
                </Text>
              </View>
            </View>
          </View>
          {/* Bio courte optionnelle (anti-shame : jamais imposée) */}
          {profile.bio.trim().length > 0 ? (
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
          ) : null}
          {/* Les 2 infos qui comptent : territoire tenu + rang ville */}
          <View style={styles.headerStats}>
            <Text style={styles.headerHold} numberOfLines={1}>
              <Text style={styles.headerHoldNum}>{formatInt(TERRITORY_KPI.totalZones)}</Text>{' '}
              zones tenues · {TERRITORY_KPI.citiesLabel}
            </Text>
            <Text style={styles.headerRank} numberOfLines={1}>
              Rang #{profile.seasonRank} {profile.seasonScope}
            </Text>
          </View>
          {/* CTA sobres — JAMAIS un GO, jamais « Ajouter » sur son profil.
              « Modifier mon profil » = affordance d'édition ÉVIDENTE 2/2. */}
          <View style={styles.headerActions}>
            <View style={styles.headerActionCell}>
              <InlineRunCTA
                label="PARTAGER"
                size="md"
                variant="secondary"
                onPress={() => {
                  setShareOpen((v) => !v);
                  if (!shareOpen) toast.show('Share card prête — capture-la pour la partager');
                }}
              />
            </View>
            <View style={styles.headerActionCellWide}>
              {/* Libellé court : « MODIFIER MON PROFIL » se coupait en « MODIFIER MO… »
                  sur 375px (règle épuration AMENDEMENT-18 : aucun texte d'action tronqué). */}
              <InlineRunCTA label="MODIFIER" size="md" onPress={openEdit} />
            </View>
          </View>
        </View>

        {/* Share card 4:5 (doc §18/§24) — révélée inline au tap sur Partager */}
        {shareOpen ? (
          <View style={styles.shareCardWrap}>
            <ShareCard
              stat={`#${profile.seasonRank}`}
              statLabel={`Rang saison · ${profile.seasonScope}`}
              title={`${profile.displayName} · ${profile.crewName}`}
              subtitle={`Runner niv. ${runnerLevel} · ${displayedTitle}`}
            >
              <PlayerCardAvatar
                initials={initials}
                fillColor={profile.avatarColor}
                tier={runnerTier}
                equippedFrameKey={equipped.profile}
                size={72}
                isMe
              />
            </ShareCard>
          </View>
        ) : null}

        {/* ── MODULE 1 · TERRITOIRE (remonté, intégré haut — AMENDEMENT-17) ── */}
        <View style={styles.sectionRow}>
          <Icon name="pin" size={14} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>MON TERRITOIRE</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir mon territoire sur la carte de France"
          onPress={() => router.push('/territoire')}
          style={({ pressed }) => [styles.territoryCard, pressed && styles.dim]}
        >
          <View style={styles.territoryPreview}>
            <TerritoryFranceMap preview />
          </View>
          <View style={styles.territoryFoot}>
            <View>
              <Text style={styles.territoryFootNum}>{formatInt(TERRITORY_KPI.totalZones)}</Text>
              <Text style={styles.territoryFootLabel}>
                zones tenues · {TERRITORY_KPI.citiesLabel}
              </Text>
            </View>
            <View style={styles.territoryOpenRow}>
              <Text style={styles.territoryOpenLabel}>Explorer la carte</Text>
              <Icon name="chevron" size={14} color={colors.gris} />
            </View>
          </View>
        </Pressable>

        {/* ── MODULE 2 · PROGRESSION : Level N → N+1, jauge XP réelle ── */}
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

        {/* ── MODULE 3 · BADGES : 3 équipés + « Voir collection » (pas géant) ── */}
        <View style={styles.sectionRow}>
          <Icon name="badge" size={14} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>BADGES ÉQUIPÉS</Text>
        </View>
        <View style={styles.badgeRow}>
          {featuredBadges.map((def) => (
            <Pressable
              key={def.id}
              accessibilityRole="button"
              accessibilityLabel={`Badge ${def.name}`}
              onPress={() => router.push('/badges')}
              style={({ pressed }) => [styles.badgeCell, pressed && styles.dim]}
            >
              <BadgeHex
                family={def.family}
                familyColor={badgeColor(def)}
                state="unlocked"
                tier={def.tier}
                size="md"
                secret={def.secret}
                slug={badgeKeyByName(def.name)}
              />
              <Text style={styles.badgeName} numberOfLines={1}>
                {def.name}
              </Text>
            </Pressable>
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

        {/* PLUS — listes longues déportées en pages dédiées */}
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

  // ── Bouton Paramètres (overlay coin haut-droit, au-dessus du scroll) ──
  settingsBtn: {
    position: 'absolute',
    right: spacing.cardPadding - 6,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Player Card compacte ──
  headerCard: {
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 14,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerInfo: { flex: 1 },
  // Avatar pressable + pastille crayon chartreuse (édition évidente sur la card)
  avatarPress: { width: 72, height: 72 },
  editPencil: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: 0.3 },
  title: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  identity: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 4, letterSpacing: 0.3 },
  bio: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  crewName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: 12,
  },
  headerHold: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },
  headerHoldNum: { color: colors.chartreuse, fontWeight: '800', fontVariant: ['tabular-nums'] },
  headerRank: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerActionCell: { flex: 1 },
  // « Modifier mon profil » plus large que « Partager » → affordance dominante
  headerActionCellWide: { flex: 1.5 },
  shareCardWrap: { marginTop: 14 },

  // ── En-têtes de section ──
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },

  // ── MODULE Territoire (remonté) ──
  territoryCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  /** Aperçu vraie carte (mini RealMap statique) — hauteur fixe, coins card. */
  territoryPreview: {
    alignSelf: 'stretch',
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
    backgroundColor: colors.noir,
  },
  territoryFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  territoryFootNum: {
    color: colors.chartreuse,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  territoryFootLabel: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  territoryOpenRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 2 },
  territoryOpenLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },

  // ── MODULE Progression ──
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

  // ── MODULE Badges (3 tuiles côte à côte, pas de carrousel géant) ──
  badgeRow: { flexDirection: 'row', gap: 10 },
  badgeCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  badgeName: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
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
  collectionLinkLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ── PLUS ──
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
