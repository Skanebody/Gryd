/**
 * GRYD — onglet Crew HQ V2 (AMENDEMENT-06 §2, doc v3 §6/§34-§45/§50).
 * Avec crew : header blason + cadre évolutif par level (§43.2), Crew Level/XP
 * (jauge vers palier suivant, table CREW_XP_TABLE réelle), perks débloqués/
 * verrouillés (CREW_PERKS), Activity Score + statut (War Ready…), membres avec
 * rôles (7) + war availability (chips), Crew Chest, achievements teaser + accès
 * Crew Discovery. Sans crew : l'état vide directif + builder existant restent.
 * Données démo DÉTERMINISTES (features/crew/demo) — TODO(O1) brancher crews /
 * crew_members / crew_chests (0010). Aucun nombre magique : niveaux/tiers/
 * paliers DÉRIVÉS de @klaim/shared via features/crew/rules.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  CREW_CODE_LENGTH,
  CREW_LEVEL_MAX,
  CREW_MAX_MEMBERS,
  CREW_PERKS,
  colors,
  fontSizes,
  radii,
  spacing,
  type CrewPerk,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import { CrewFrame } from '../../src/features/crew/CrewFrame';
import {
  ACTIVITY_STATUS_LABELS,
  CHEST_TIER_LABELS,
  CREW_ROLE_LABELS,
  FRAME_TIER_LABELS,
  WAR_AVAILABILITY_LABELS,
  activityStatusForScore,
  chestTierFor,
  crewFrameTierForLevel,
  crewLevelForXp,
  crewLevelProgress,
  crewXpForLevel,
} from '../../src/features/crew/rules';
import { CREW_ACHIEVEMENTS, MY_CREW } from '../../src/features/crew/demo';

/** Toggle démo : passer à false pour prévisualiser l'état « sans crew ». */
const HAS_CREW = true;

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/** Ligne de perk : débloqué (blanc + coche) ou verrouillé (gris + verrou). */
function PerkRow({ perk, unlocked }: { perk: CrewPerk; unlocked: boolean }) {
  return (
    <View style={styles.perkRow}>
      <Icon name={unlocked ? 'badge' : 'verrou'} size={18} color={unlocked ? colors.blanc : colors.gris} />
      <View style={styles.perkInfo}>
        <Text style={[styles.perkName, !unlocked && styles.dim]}>
          Niv. {perk.level} · {perk.name}
        </Text>
        <Text style={styles.perkDesc}>{perk.desc}</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  const todoCrewFlow = (step: string) => {
    // TODO(O1) : création / rejoindre un crew (crew_created, crew_joined §8).
    if (__DEV__) console.log(`[crew] ${step} — flux crew à venir (O1)`);
  };
  return (
    <TabScreen
      title="Crew"
      icon="crew"
      kicker="SAISON 0 · PARIS"
      subtitle="Le jeu de conquête de territoire pour run clubs."
    >
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Personne ne tient un quartier seul.</Text>
        <Text style={styles.emptyBody}>
          Un crew cumule le territoire de ses coureurs — et le défend quand tu dors. Fonde le
          tien ou rejoins-en un en 1 tap.
        </Text>
        <View style={styles.emptyActions}>
          <GhostButton label="Créer mon crew" icon="plus" onPress={() => todoCrewFlow('create')} />
          <GhostButton
            label={`Rejoindre avec un code (${CREW_CODE_LENGTH} caractères)`}
            onPress={() => todoCrewFlow('join')}
          />
          <GhostButton
            label="Explorer les crews autour de moi"
            icon="crew"
            onPress={() => router.push('/crew-discovery')}
          />
        </View>
      </View>
    </TabScreen>
  );
}

export default function CrewScreen() {
  useEffect(() => {
    screen('crew_hq');
  }, []);

  const [showAllPerks, setShowAllPerks] = useState(false);

  if (!HAS_CREW) return <EmptyState />;

  // Niveau + tier + jauge dérivés de l'XP réelle (§34.3 / §43.2).
  const level = crewLevelForXp(MY_CREW.xp);
  const frameTier = crewFrameTierForLevel(level);
  const levelProgress = crewLevelProgress(MY_CREW.xp, level);
  const nextLevelXp = level < CREW_LEVEL_MAX ? crewXpForLevel(level + 1) : null;

  // Activity Score → statut (§45).
  const status = activityStatusForScore(MY_CREW.activityScore);

  // Chest (§39.2).
  const chestPct = MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chestTier = chestTierFor(MY_CREW.chestProgress);
  const nextChestTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);

  // Perks : débloqués si level ≥ perk.level. Aperçu = jusqu'au prochain verrouillé.
  const visiblePerks = showAllPerks
    ? CREW_PERKS
    : CREW_PERKS.filter((p) => p.level <= level + 1);

  return (
    <TabScreen title={MY_CREW.name} icon="crew" kicker={`CREW HQ · ${MY_CREW.city.toUpperCase()}`}>
      {/* Header blason + cadre évolutif + niveau/XP */}
      <View style={styles.headerCard}>
        <CrewFrame tier={frameTier} tag={MY_CREW.tag} size={88} />
        <View style={styles.headerInfo}>
          <View style={styles.levelRow}>
            <Text style={styles.levelBig}>Niveau {level}</Text>
            <Text style={styles.frameTierChip}>Cadre {FRAME_TIER_LABELS[frameTier]}</Text>
          </View>
          <View style={styles.headerGauge}>
            <ProgressBar value={levelProgress} height={7} />
          </View>
          <Text style={styles.xpLine}>
            {formatInt(MY_CREW.xp)} XP
            {nextLevelXp !== null
              ? ` · ${formatInt(nextLevelXp - MY_CREW.xp)} vers niv. ${level + 1}`
              : ' · niveau max'}
          </Text>
        </View>
      </View>

      {/* Activity Score + statut (§45) */}
      <View style={styles.statusCard}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Activity Score</Text>
          <Text style={styles.statusValue}>{MY_CREW.activityScore}/100</Text>
        </View>
        <View style={styles.statusBadge}>
          <Icon name="alerte" size={14} color={colors.chartreuse} />
          <Text style={styles.statusBadgeText}>{ACTIVITY_STATUS_LABELS[status]}</Text>
        </View>
      </View>

      {/* Perks débloqués / verrouillés (§35.1) */}
      <SectionLabel>PERKS DE CREW</SectionLabel>
      {visiblePerks.map((perk) => (
        <PerkRow key={perk.key} perk={perk} unlocked={level >= perk.level} />
      ))}
      {!showAllPerks && CREW_PERKS.length > visiblePerks.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir tous les perks"
          onPress={() => setShowAllPerks(true)}
          style={({ pressed }) => [styles.moreLink, pressed && styles.dim]}
        >
          <Text style={styles.moreLinkText}>Voir tous les perks ({CREW_PERKS.length})</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>
      ) : null}

      {/* Membres : rôle (7) + war availability (chips) (§36/§37.2) */}
      <SectionLabel>
        MEMBRES · {MY_CREW.members.length}/{CREW_MAX_MEMBERS}
      </SectionLabel>
      {MY_CREW.members.map((m) => (
        <View key={m.pseudo} style={[styles.memberRow, m.me && styles.memberRowMe]}>
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, m.me && styles.memberNameMe]}>
              {m.pseudo}
              {m.me ? '  · toi' : ''}
            </Text>
            <Text style={styles.memberRole}>{CREW_ROLE_LABELS[m.role]}</Text>
          </View>
          <View style={styles.availChip}>
            <Text style={styles.availChipText}>{WAR_AVAILABILITY_LABELS[m.availability]}</Text>
          </View>
          <Text style={styles.memberHexes}>{formatInt(m.weekHexes)}</Text>
        </View>
      ))}

      {/* Crew Chest (§39) */}
      <SectionLabel>CREW CHEST · CETTE SEMAINE</SectionLabel>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Icon name="coffre" size={18} color={colors.blanc} />
          <Text style={styles.cardTitle}>
            {chestTier ? `Palier ${CHEST_TIER_LABELS[chestTier]}` : 'Pas encore de palier'}
          </Text>
          <Text style={styles.cardPct}>{Math.round(chestPct * 100)} %</Text>
        </View>
        <View style={styles.headerGauge}>
          <ProgressBar value={chestPct} />
        </View>
        <Text style={styles.cardMeta}>
          {formatInt(MY_CREW.chestProgress)} / {formatInt(CREW_CHEST_WEEKLY_TARGET)} points collectifs
          {nextChestTier
            ? ` · prochain : ${CHEST_TIER_LABELS[nextChestTier]}`
            : ' · palier max'}
        </Text>
      </View>

      {/* Achievements teaser (§44) */}
      <SectionLabel>ACHIEVEMENTS</SectionLabel>
      <View style={styles.achievements}>
        {CREW_ACHIEVEMENTS.map((a) => (
          <View key={a.key} style={styles.achievementChip}>
            <Icon name={a.done ? 'badge' : 'verrou'} size={14} color={a.done ? colors.blanc : colors.gris} />
            <Text style={[styles.achievementText, !a.done && styles.dim]}>{a.label}</Text>
          </View>
        ))}
      </View>

      {/* Accès Crew Discovery (§46) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explorer d'autres crews"
        onPress={() => router.push('/crew-discovery')}
        style={({ pressed }) => [styles.discoveryLink, pressed && styles.dim]}
      >
        <Icon name="crew" size={18} color={colors.blanc} />
        <Text style={styles.discoveryText}>Explorer d'autres crews</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.55 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 28,
    marginBottom: 12,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  headerInfo: { flex: 1 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBig: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.4 },
  frameTierChip: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  headerGauge: { marginTop: 10 },
  xpLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
  },
  statusInfo: {},
  statusLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },
  statusValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  statusBadgeText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.4 },
  perkRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  perkInfo: { flex: 1 },
  perkName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  perkDesc: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5, marginTop: 4 },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  moreLinkText: { color: colors.gris, fontSize: fontSizes.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.noir,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  memberRowMe: { borderColor: colors.chartreuse40 },
  memberInfo: { flex: 1 },
  memberName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.4 },
  memberNameMe: { fontWeight: '700' },
  memberRole: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  availChip: {
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  availChipText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  memberHexes: {
    width: 44,
    textAlign: 'right',
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: -0.2 },
  cardPct: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cardMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  achievements: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  achievementText: { color: colors.blanc, fontSize: fontSizes.xs, letterSpacing: 0.2 },
  discoveryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginTop: 22,
  },
  discoveryText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── état vide (sans crew) ──
  emptyCard: {
    marginTop: 22,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  emptyTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.3 },
  emptyBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 8,
  },
  emptyActions: { marginTop: 18, gap: 10 },
});
