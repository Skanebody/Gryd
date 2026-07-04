/**
 * GRYD — CREW HQ, la base du crew (AMENDEMENT-08 §6, doc §11-§14).
 * Fini le scroll infini SaaS : header de base (GRAND blason animé + frame de
 * ligue + niveau/XP + Prêt guerre + rank local + membres actifs + coffre hebdo
 * + offensive) puis ONGLETS INTERNES Base / Membres / Coffre / Perks / Chat.
 * Base = bento 6 cartes (AMENDEMENT-10 §6) + bloc TERRITOIRE CREW
 * (AMENDEMENT-11 §4 — zones/secteurs/rues, jamais de « hex » visible) + CTA ;
 * Membres = MemberCard + sheet d'actions démo ;
 * Coffre = ChestCard claimable + paliers + contributions ; Perks = cartes
 * reward + « PROCHAIN PERK — XP restants » ; Chat = War Log fusionné
 * (WarEventCard + réactions GRYD + LIVE) et messages actionnables (RSVP
 * défense, ping zone → carte). Données démo DÉTERMINISTES (features/crew) —
 * TODO(O1) brancher crews / crew_members / crew_chests / crew_feed_events.
 * Aucun nombre magique : niveaux/paliers DÉRIVÉS de @klaim/shared via rules.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  gameColors,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import {
  ChestCard,
  CrewCrest,
  CREW_ROLE_META,
  MemberCard,
  PerkCard,
  RewardCard,
  WarEventCard,
  timeAgoLabel,
  usePulse,
} from '../../src/ui/game';
import {
  ACTIVITY_STATUS_LABELS,
  CHEST_TIER_LABELS,
  PERK_VISUALS,
  PERK_VISUAL_FALLBACK,
  activityStatusForScore,
  chestStateFor,
  crewLevelForXp,
  crewLevelProgress,
  crewXpForLevel,
  leagueLabelFor,
  memberCardRole,
} from '../../src/features/crew/rules';
import { CHEST_REWARDS, MY_CREW, type CrewMemberDemo } from '../../src/features/crew/demo';
import {
  CHAT_TIMELINE,
  DEFENSE_RSVP_OPTIONS,
  WAR_LOG_META,
  warLogTint,
  type DefenseRsvp,
} from '../../src/features/crew/feed';
import { ReactionBar } from '../../src/features/crew/ReactionBar';

/** Toggle démo : passer à false pour prévisualiser l'état « sans crew ». */
const HAS_CREW = true;

/** Onglets internes du HQ (doc §11 — pas de scroll infini). */
type HqTab = 'base' | 'membres' | 'coffre' | 'perks' | 'chat';
const HQ_TABS: readonly { key: HqTab; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'membres', label: 'Membres' },
  { key: 'coffre', label: 'Coffre' },
  { key: 'perks', label: 'Perks' },
  { key: 'chat', label: 'Chat' },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
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

/** Carte bento de l'onglet Base (« Coffre crew — 66 % », AMENDEMENT-10 §6). */
function BaseCard({
  icon,
  tint = colors.blanc,
  label,
  value,
  sub,
  progress,
  onPress,
}: {
  icon: IconName;
  tint?: string;
  label: string;
  value: string;
  /** Ligne de détail courte sous la valeur (« Secteur République »). */
  sub?: string;
  /** Jauge optionnelle sous la valeur (objectif crew). */
  progress?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.baseCard, pressed && styles.dim]}
    >
      <Icon name={icon} size={18} color={tint} />
      <Text style={styles.baseCardLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.baseCardValue, { color: tint }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.baseCardSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
      {progress !== undefined ? <ProgressBar value={progress} height={4} /> : null}
    </Pressable>
  );
}

/**
 * Bloc TERRITOIRE CREW (AMENDEMENT-11 §4) : « Paris Est : 42 % · Zones tenues
 * 2 147 · Frontières contestées 3 · Routes ouvertes 6 ». Tap → Battle Map.
 * Le violet contesté est un état de jeu (charte) — pas une déco.
 */
function TerritoryBlock() {
  const t = MY_CREW.territory;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Territoire crew : ${t.sector} ${t.controlPct} % — ouvrir la carte`}
      onPress={() => router.navigate('/')}
      style={({ pressed }) => [styles.territoryCard, pressed && styles.dim]}
    >
      <View style={styles.territoryHead}>
        <Icon name="pin" size={16} color={gameColors.crew} />
        <Text style={styles.territoryKicker}>TERRITOIRE CREW</Text>
        <Icon name="chevron" size={14} color={colors.gris} />
      </View>
      <View style={styles.territoryMain}>
        <Text style={styles.territorySector} numberOfLines={1}>
          {t.sector}
        </Text>
        <Text style={styles.territoryPct}>{t.controlPct} %</Text>
      </View>
      <ProgressBar value={t.controlPct / 100} height={6} />
      <View style={styles.territoryStats}>
        <View style={styles.territoryCell}>
          <Text style={styles.territoryValue}>{formatInt(t.zonesHeld)}</Text>
          <Text style={styles.territoryLabel}>Zones tenues</Text>
        </View>
        <View style={styles.territoryCell}>
          <Text style={[styles.territoryValue, { color: gameColors.contested }]}>
            {t.contestedBorders}
          </Text>
          <Text style={styles.territoryLabel}>Frontières contestées</Text>
        </View>
        <View style={styles.territoryCell}>
          <Text style={styles.territoryValue}>{t.openRoutes}</Text>
          <Text style={styles.territoryLabel}>Routes ouvertes</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CrewScreen() {
  useEffect(() => {
    screen('crew_hq');
  }, []);

  const [tab, setTab] = useState<HqTab>('base');
  /** Feedback court des actions démo (invite, sheet membre). */
  const [notice, setNotice] = useState<string | null>(null);
  const [memberSheet, setMemberSheet] = useState<CrewMemberDemo | null>(null);
  const [chestOpened, setChestOpened] = useState(false);
  const [rsvp, setRsvp] = useState<Record<string, DefenseRsvp>>({});
  const [showTiers, setShowTiers] = useState(false);

  const insets = useSafeAreaInsets();
  // Blason vivant : pulse très léger (reduce motion → inerte, géré par le hook).
  const crestScale = usePulse(true, 1.02);

  // Niveau + jauge dérivés de l'XP réelle (§34.3).
  const level = crewLevelForXp(MY_CREW.xp);
  const levelProgress = crewLevelProgress(MY_CREW.xp, level);
  const nextLevelXp = level < CREW_LEVEL_MAX ? crewXpForLevel(level + 1) : null;

  // Statut d'activité (§45) — 91 → « Prêt guerre ».
  const status = activityStatusForScore(MY_CREW.activityScore);
  const warReady = status === 'war_ready';

  // Coffre hebdo (§39.2) : état/palier DÉRIVÉS de chestStateFor (source unique,
  // identique à la War Room) — réclamable tant qu'il n'est pas ouvert.
  const chestPct = MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chest = chestStateFor(chestPct);
  const nextChestTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);
  const chestClaimable = chest.state === 'claimable' && !chestOpened;

  // Perks (§35.1) : débloqués / prochain (XP restants dérivés) / à venir.
  const unlockedPerks = useMemo(() => CREW_PERKS.filter((p) => p.level <= level), [level]);
  const nextPerk = useMemo(() => CREW_PERKS.find((p) => p.level > level), [level]);
  const futurePerks = useMemo(
    () => CREW_PERKS.filter((p) => p.level > level && p.key !== nextPerk?.key),
    [level, nextPerk],
  );
  const nextPerkXpRemaining = nextPerk ? crewXpForLevel(nextPerk.level) - MY_CREW.xp : 0;

  // Contributions coffre triées (Coffre) + max pour l'échelle des jauges.
  const contributors = useMemo(
    () => [...MY_CREW.members].sort((a, b) => b.chestPoints - a.chestPoints),
    [],
  );
  const maxChestPoints = Math.max(1, contributors[0]?.chestPoints ?? 1);

  const activeMembers = MY_CREW.members.length;

  if (!HAS_CREW) return <EmptyState />;

  const notify = (message: string) => {
    haptics.light();
    setNotice(message);
  };

  const memberAction = (label: string, member: CrewMemberDemo) => {
    setMemberSheet(null);
    if (label === 'Voir profil' && member.me) {
      router.navigate('/profil');
      return;
    }
    notify(`${label} · ${member.pseudo} — envoyé au crew (démo)`);
  };

  return (
    <TabScreen title={MY_CREW.name} icon="crew" kicker={`CREW HQ · ${MY_CREW.city.toUpperCase()}`}>
      {/* ── Header base : GRAND blason animé + frame ligue + niveau/XP ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Animated.View style={{ transform: [{ scale: crestScale }] }}>
            <CrewCrest
              seed={MY_CREW.seed}
              name={MY_CREW.name}
              size="xl"
              leagueTier={MY_CREW.league}
            />
          </Animated.View>
          <View style={styles.headerInfo}>
            <Text style={styles.metaLine} numberOfLines={1}>
              {MY_CREW.city} · {leagueLabelFor(MY_CREW.league)}
            </Text>
            <View style={[styles.statusChip, warReady && styles.statusChipWar]}>
              <Icon
                name="guerre"
                size={13}
                color={warReady ? gameColors.crew : colors.blanc}
              />
              <Text style={[styles.statusChipText, warReady && styles.statusChipTextWar]}>
                {ACTIVITY_STATUS_LABELS[status]}
              </Text>
            </View>
            <Text style={styles.levelBig}>Niveau {level}</Text>
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

        {/* Bandeau de guerre : rank local · membres actifs · coffre · offensive */}
        <View style={styles.quickRow}>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Rank local</Text>
            <Text style={styles.quickValue}>#{MY_CREW.localRank}</Text>
          </View>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Membres actifs</Text>
            <Text style={styles.quickValue}>
              {activeMembers}/{CREW_MAX_MEMBERS}
            </Text>
          </View>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Coffre hebdo</Text>
            <Text style={styles.quickValue}>{Math.round(chestPct * 100)} %</Text>
          </View>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Offensive</Text>
            <Text
              style={[styles.quickValue, MY_CREW.offensiveReady && styles.quickValueReady]}
            >
              {MY_CREW.offensiveReady ? 'Prête' : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Onglets internes (segmented control, doc §11) ── */}
      <View accessibilityRole="tablist" style={styles.segments}>
        {HQ_TABS.map((t) => {
          const active = tab === t.key;
          const chestDot = t.key === 'coffre' && chestClaimable;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {t.label}
              </Text>
              {/* Point chartreuse = coffre à récupérer (état de jeu, pas déco) */}
              {chestDot ? <View style={styles.segmentDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* Feedback des actions démo */}
      {notice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la notification"
          onPress={() => setNotice(null)}
          style={styles.notice}
        >
          <Icon name="cloche" size={14} color={colors.blanc} />
          <Text style={styles.noticeText} numberOfLines={2}>
            {notice}
          </Text>
          <Icon name="fermer" size={13} color={colors.gris} />
        </Pressable>
      ) : null}

      {/* ══ BASE : bento 6 cartes (AMENDEMENT-10 §6) + TERRITOIRE CREW ══ */}
      {tab === 'base' ? (
        <>
          <View style={styles.baseGrid}>
            {/* Défense urgente — muted red DISCRET (urgence réelle, pas d'alarme) */}
            <BaseCard
              icon="bouclier"
              tint={gameColors.danger}
              label="Défense urgente"
              value={`${MY_CREW.urgentDefense.streets} rues · ${MY_CREW.urgentDefense.hoursLeft} h`}
              sub={`Secteur ${MY_CREW.urgentDefense.sector}`}
              onPress={() => router.navigate('/warroom')}
            />
            <BaseCard
              icon="guerre"
              tint={MY_CREW.offensiveReady ? gameColors.crew : colors.blanc}
              label="Offensive"
              value={MY_CREW.offensiveReady ? 'Prête' : 'En préparation'}
              sub="Lancer depuis la War Room"
              onPress={() => router.navigate('/warroom')}
            />
            <BaseCard
              icon="coffre"
              tint={chestClaimable ? gameColors.crew : gameColors.gold}
              label="Coffre crew"
              value={`${Math.round(chestPct * 100)} %`}
              progress={chestPct}
              onPress={() => setTab('coffre')}
            />
            <BaseCard
              icon="ajoutami"
              label="Recrutement"
              value={`${MY_CREW.recruitSpots} places`}
              sub="Crews autour de toi"
              onPress={() => router.push('/crew-discovery')}
            />
            <BaseCard
              icon={nextPerk ? (PERK_VISUALS[nextPerk.key] ?? PERK_VISUAL_FALLBACK).icon : 'badge'}
              label="Prochain perk"
              value={nextPerk ? nextPerk.name : 'Tout débloqué'}
              sub={
                nextPerk
                  ? `Niveau ${nextPerk.level} · ${formatInt(nextPerkXpRemaining)} XP restants`
                  : undefined
              }
              onPress={() => setTab('perks')}
            />
            <BaseCard
              icon="crew"
              label="Membres actifs"
              value={`${activeMembers} / ${CREW_MAX_MEMBERS}`}
              onPress={() => setTab('membres')}
            />
          </View>

          <TerritoryBlock />

          <View style={styles.baseActions}>
            <GhostButton
              label="Voir War Room"
              icon="guerre"
              onPress={() => router.navigate('/warroom')}
            />
            <GhostButton
              label="Inviter un membre"
              icon="ajoutami"
              onPress={() => notify('Lien d’invitation copié — gryd.run/c/foulees93 (démo)')}
            />
          </View>
        </>
      ) : null}

      {/* ══ MEMBRES : MemberCard + sheet d'actions (doc §12) ══ */}
      {tab === 'membres' ? (
        <>
          <SectionLabel>
            MEMBRES · {activeMembers}/{CREW_MAX_MEMBERS}
          </SectionLabel>
          {MY_CREW.members.map((m) => (
            <View key={m.pseudo} style={styles.memberItem}>
              <MemberCard
                name={m.pseudo}
                role={memberCardRole(m.role)}
                tier={m.tier}
                warReady={m.availability === 'war'}
                weeklyPoints={m.weekHexes}
                lastAction={m.lastAction}
                isMe={m.me}
                onPress={() => setMemberSheet(m)}
              />
            </View>
          ))}
        </>
      ) : null}

      {/* ══ COFFRE : WEEKLY CHEST + paliers + contributions (doc §11) ══ */}
      {tab === 'coffre' ? (
        <>
          <SectionLabel>WEEKLY CHEST</SectionLabel>
          <ChestCard
            label="Coffre crew hebdo"
            progress={chestPct}
            nextMilestone={
              nextChestTier
                ? `Prochain palier : ${CHEST_TIER_LABELS[nextChestTier]} · ${Math.round(
                    CREW_CHEST_TIERS[nextChestTier] * 100,
                  )} %`
                : 'Palier max atteint'
            }
            state={chestClaimable ? 'claimable' : 'inprogress'}
            onOpen={() => {
              setChestOpened(true);
              setNotice(
                chest.tier
                  ? `Palier ${CHEST_TIER_LABELS[chest.tier]} ouvert — récompenses au crew (démo)`
                  : null,
              );
            }}
          />
          <Text style={styles.chestMeta}>
            {formatInt(MY_CREW.chestProgress)} / {formatInt(CREW_CHEST_WEEKLY_TARGET)} points
            collectifs
          </Text>

          {chestOpened && chest.tier ? (
            <>
              <SectionLabel>RÉCOMPENSES · PALIER {CHEST_TIER_LABELS[chest.tier].toUpperCase()}</SectionLabel>
              <View style={styles.rewardList}>
                {CHEST_REWARDS.map((r) => (
                  <RewardCard
                    key={r.label}
                    icon={r.icon}
                    label={r.label}
                    sublabel={r.sublabel}
                    state="unlocked"
                    tint={gameColors.gold}
                    reveal
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Détail des paliers au tap (copywriting court, doc §27) */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showTiers }}
            onPress={() => setShowTiers((v) => !v)}
            style={({ pressed }) => [styles.tiersToggle, pressed && styles.dim]}
          >
            <Text style={styles.tiersToggleText}>Paliers du coffre</Text>
            <Icon name="chevron" size={15} color={colors.gris} />
          </Pressable>
          {showTiers ? (
            <View style={styles.tiersCard}>
              {CREW_CHEST_TIER_ORDER.map((t) => {
                const reached = chestPct >= CREW_CHEST_TIERS[t];
                return (
                  <View key={t} style={styles.tierRow}>
                    <Icon
                      name={reached ? 'coffre' : 'verrou'}
                      size={15}
                      color={reached ? gameColors.gold : colors.gris}
                    />
                    <Text style={[styles.tierName, !reached && styles.dimText]}>
                      {CHEST_TIER_LABELS[t]}
                    </Text>
                    <Text style={styles.tierPct}>
                      {Math.round(CREW_CHEST_TIERS[t] * 100)} %
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <SectionLabel>CONTRIBUTIONS DES MEMBRES</SectionLabel>
          {contributors.map((m) => (
            <View key={m.pseudo} style={styles.contribRow}>
              <Text
                style={[styles.contribName, m.me && styles.contribNameMe]}
                numberOfLines={1}
              >
                {m.pseudo}
              </Text>
              <View style={styles.contribBar}>
                <ProgressBar value={m.chestPoints / maxChestPoints} height={5} />
              </View>
              <Text style={styles.contribPts}>{formatInt(m.chestPoints)}</Text>
            </View>
          ))}
        </>
      ) : null}

      {/* ══ PERKS : cartes reward + PROCHAIN PERK (doc §11) ══ */}
      {tab === 'perks' ? (
        <>
          <SectionLabel>PERKS DÉBLOQUÉS · {unlockedPerks.length}</SectionLabel>
          <View style={styles.perkList}>
            {unlockedPerks.map((p) => {
              const visual = PERK_VISUALS[p.key] ?? PERK_VISUAL_FALLBACK;
              return (
                <PerkCard
                  key={p.key}
                  name={p.name}
                  icon={visual.icon}
                  rarity={visual.rarity}
                  levelRequired={p.level}
                  state="unlocked"
                  description={p.desc}
                />
              );
            })}
          </View>

          {nextPerk ? (
            <>
              <SectionLabel>PROCHAIN PERK</SectionLabel>
              <PerkCard
                name={nextPerk.name}
                icon={(PERK_VISUALS[nextPerk.key] ?? PERK_VISUAL_FALLBACK).icon}
                rarity={(PERK_VISUALS[nextPerk.key] ?? PERK_VISUAL_FALLBACK).rarity}
                levelRequired={nextPerk.level}
                state="inprogress"
                xpRemaining={nextPerkXpRemaining}
                description={nextPerk.desc}
              />
            </>
          ) : null}

          {futurePerks.length > 0 ? (
            <>
              <SectionLabel>À VENIR</SectionLabel>
              <View style={styles.perkList}>
                {futurePerks.map((p) => {
                  const visual = PERK_VISUALS[p.key] ?? PERK_VISUAL_FALLBACK;
                  return (
                    <PerkCard
                      key={p.key}
                      name={p.name}
                      icon={visual.icon}
                      rarity={visual.rarity}
                      levelRequired={p.level}
                      state="locked"
                    />
                  );
                })}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      {/* ══ CHAT : War Log + messages actionnables fusionnés (doc §13/§14) ══ */}
      {tab === 'chat' ? (
        <>
          <SectionLabel>WAR LOG · CHAT DU CREW</SectionLabel>
          {CHAT_TIMELINE.map((item) =>
            item.kind === 'event' ? (
              <View key={item.id} style={styles.feedItem}>
                <WarEventCard
                  icon={WAR_LOG_META[item.type].icon}
                  message={item.message}
                  zone={item.zone}
                  points={item.points}
                  minutesAgo={item.minutesAgo}
                  tint={warLogTint(item)}
                />
                <View style={styles.feedReactions}>
                  <ReactionBar initial={item.reactions} />
                </View>
              </View>
            ) : (
              <View key={item.id} style={[styles.msgCard, item.me && styles.msgCardMe]}>
                <View style={styles.msgHead}>
                  <Text style={[styles.msgAuthor, item.me && styles.msgAuthorMe]}>
                    {item.author}
                    {item.me ? ' · toi' : ''}
                  </Text>
                  <Text style={styles.msgAgo}>{timeAgoLabel(item.minutesAgo)}</Text>
                </View>
                <Text style={styles.msgText}>{item.text}</Text>

                {/* Sortie défense → RSVP (Je participe / Peut-être / Indispo) */}
                {item.action === 'rsvp' ? (
                  <>
                    <View style={styles.rsvpRow}>
                      {DEFENSE_RSVP_OPTIONS.map((opt) => {
                        const selected = rsvp[item.id] === opt;
                        const engaged = selected && opt === 'Je participe';
                        return (
                          <Pressable
                            key={opt}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => {
                              haptics.light();
                              setRsvp((r) => ({ ...r, [item.id]: opt }));
                            }}
                            style={[
                              styles.rsvpChip,
                              selected && styles.rsvpChipSelected,
                              engaged && styles.rsvpChipEngaged,
                            ]}
                          >
                            <Text
                              style={[
                                styles.rsvpLabel,
                                selected && styles.rsvpLabelSelected,
                                engaged && styles.rsvpLabelEngaged,
                              ]}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {rsvp[item.id] ? (
                      <Text style={styles.rsvpDone}>Réponse envoyée au crew (démo)</Text>
                    ) : null}
                  </>
                ) : null}

                {/* Ping zone → Ouvrir la carte */}
                {item.action === 'openMap' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.navigate('/')}
                    style={({ pressed }) => [styles.mapBtn, pressed && styles.dim]}
                  >
                    <Icon name="carte" size={14} color={colors.blanc} />
                    <Text style={styles.mapBtnLabel}>Ouvrir la carte</Text>
                  </Pressable>
                ) : null}

                <ReactionBar initial={item.reactions} />
              </View>
            ),
          )}
          <Text style={styles.chatNote}>
            War Log + chat du crew. Réactions et réponses rapides — pas de messages privés (MVP).
          </Text>
        </>
      ) : null}

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

      {/* ── Sheet d'actions membre (doc §12 — démo locale) ── */}
      <Modal
        visible={memberSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberSheet(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setMemberSheet(null)}
          />
          {memberSheet ? (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetName}>{memberSheet.pseudo}</Text>
              <Text style={styles.sheetRole}>
                {CREW_ROLE_META[memberCardRole(memberSheet.role)].label} ·{' '}
                {formatInt(memberSheet.weekHexes)} pts cette semaine
              </Text>
              {(
                [
                  { label: 'Assigner mission', icon: 'mission' },
                  { label: 'Inviter sortie', icon: 'ami' },
                  { label: 'Promouvoir', icon: 'couronne' },
                  { label: 'Voir profil', icon: 'profil' },
                ] as const
              ).map((a) => (
                <Pressable
                  key={a.label}
                  accessibilityRole="button"
                  onPress={() => memberAction(a.label, memberSheet)}
                  style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
                >
                  <Icon name={a.icon} size={18} color={colors.blanc} />
                  <Text style={styles.sheetActionLabel}>{a.label}</Text>
                  <Icon name="chevron" size={15} color={colors.gris} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.6 },
  dimText: { color: colors.gris },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 12,
  },
  // ── Header base ──
  headerCard: {
    marginTop: 20,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerInfo: { flex: 1 },
  metaLine: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.3 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusChipWar: { borderColor: colors.chartreuse40 },
  statusChipText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  statusChipTextWar: { color: gameColors.crew },
  levelBig: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 10,
  },
  headerGauge: { marginTop: 8 },
  xpLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 7,
    fontVariant: ['tabular-nums'],
  },
  quickRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  quickCell: { flex: 1, alignItems: 'center', gap: 3 },
  quickLabel: { color: colors.gris, fontSize: 10, letterSpacing: 0.3 },
  quickValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  quickValueReady: { color: gameColors.crew },
  // ── Segmented control ──
  segments: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  segmentActive: { backgroundColor: colors.carbone2 },
  segmentLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  segmentLabelActive: { color: colors.blanc },
  segmentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: gameColors.crew },
  // ── Notice (feedback démo) ──
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    backgroundColor: colors.carbone2,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  noticeText: { flex: 1, color: colors.blanc, fontSize: fontSizes.xs, lineHeight: 16 },
  // ── Base : 4 cartes courtes + CTA ──
  baseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  baseCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 6,
  },
  baseCardLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  baseCardValue: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  baseCardSub: { color: colors.gris, fontSize: 11, letterSpacing: 0.2 },
  baseActions: { marginTop: 18, gap: 10 },
  // ── TERRITOIRE CREW (AMENDEMENT-11 §4) ──
  territoryCard: {
    marginTop: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 10,
  },
  territoryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  territoryKicker: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  territoryMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  territorySector: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  territoryPct: {
    color: gameColors.crew,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  territoryStats: {
    flexDirection: 'row',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  territoryCell: { flex: 1, alignItems: 'center', gap: 3 },
  territoryValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  territoryLabel: {
    color: colors.gris,
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  // ── Membres ──
  memberItem: { marginBottom: 8 },
  // ── Coffre ──
  chestMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  rewardList: { gap: 8 },
  tiersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tiersToggleText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  tiersCard: {
    marginTop: 8,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  tierName: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  tierPct: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  contribRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  contribName: { width: 118, color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  contribNameMe: { color: gameColors.crew },
  contribBar: { flex: 1 },
  contribPts: {
    width: 44,
    textAlign: 'right',
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  // ── Perks ──
  perkList: { gap: 8 },
  // ── Chat / War Log ──
  feedItem: { marginBottom: 12 },
  feedReactions: { paddingHorizontal: 4 },
  msgCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    marginBottom: 12,
  },
  msgCardMe: { borderColor: colors.chartreuse40 },
  msgHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  msgAuthor: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.4 },
  msgAuthorMe: { color: gameColors.crew },
  msgAgo: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  msgText: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: 6,
  },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  rsvpChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  rsvpChipSelected: { borderColor: colors.blanc },
  rsvpChipEngaged: { backgroundColor: gameColors.crew, borderColor: gameColors.crew },
  rsvpLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  rsvpLabelSelected: { color: colors.blanc },
  // Libellé noir sur chartreuse (contraste charte — jamais l'inverse).
  rsvpLabelEngaged: { color: colors.noir },
  rsvpDone: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 8 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 10,
  },
  mapBtnLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  chatNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 6,
  },
  // ── Crew Discovery ──
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
    marginTop: 26,
  },
  discoveryText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── Sheet membre ──
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,5,0.72)', // voile noir charte
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.grisLigne,
    marginBottom: 14,
  },
  sheetName: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.3 },
  sheetRole: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3, marginBottom: 12 },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  sheetActionLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
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
