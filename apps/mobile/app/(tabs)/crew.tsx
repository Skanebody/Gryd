/**
 * GRYD — CREW HQ, la base du crew (AMENDEMENT-08 §6, doc §11-§14).
 * 3 ONGLETS INTERNES seulement : Base / Chat / Membres (zéro mini-SaaS).
 * Base = LA décision de l'écran : carte MISSION PRIORITAIRE en tête
 * (« DÉFENSE URGENTE · République · 48 h » + unique CTA chartreuse DÉFENDRE,
 * câblée sur MY_CREW.urgentDefense) + lien gris vers les missions (War Room),
 * puis tuiles Territoire / Coffre / Membres / Perks (détail Coffre & Perks
 * révélé AU TAP, dans la Base — plus d'onglets dédiés), colle quotidienne
 * « AUJOURD'HUI » en secondaire, contribution/boost repliés (jamais mis en
 * avant). Chat = centre d'action (À FAIRE + messages + dons + résultats) ;
 * Membres = roster + sheet d'actions + section SORTIES (fusionnée ici).
 * Données démo DÉTERMINISTES (features/crew) — TODO(O1) brancher crews /
 * crew_members / crew_chests / crew_feed_events.
 * Aucun nombre magique : niveaux/paliers DÉRIVÉS de @klaim/shared via rules.
 */
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  CREW_CODE_LENGTH,
  CREW_GIFT_CLAIMS_PER_MEMBER,
  CREW_GIFT_EXPIRY_H,
  CREW_LEVEL_MAX,
  CREW_MAX_MEMBERS,
  CREW_PERKS,
  borderState,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  type IconName,
} from '@klaim/shared';
import { flags } from '../../src/lib/flags';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { useSession } from '../../src/lib/session';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import {
  ChestCard,
  CrewCrest,
  IconAction,
  InlineRunCTA,
  MemberCard,
  PerkCard,
  RewardCard,
  Segmented,
  WarEventCard,
  usePulse,
  useReveal,
  type WarEventReaction,
} from '../../src/ui/game';
import {
  PERK_VISUALS,
  PERK_VISUAL_FALLBACK,
  activityStatusForScore,
  chestStateFor,
  crewLevelForXp,
  crewLevelProgress,
  crewXpForLevel,
  memberCardRole,
  roleCan,
  rookieTrialDaysLeft,
} from '../../src/features/crew/rules';
import {
  C,
  CREW_ROLE_E,
  CREW_STATUS_E,
  DEFENSE_RSVP_E,
  OUTING_RSVP_E,
  REPORT_REASON_E,
  TIER_E,
} from '../../src/i18n/catalog/crew';
import { t as tGlobal, useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { CHEST_REWARDS, MY_CREW, type CrewMemberDemo } from '../../src/features/crew/demo';
import {
  BOOST_CHEST_BONUS_LABEL,
  INITIAL_CREW_WALL,
  formatBoostRemaining,
  startBoost,
  supporterLabel,
  type CrewBoostState,
} from '../../src/features/arsenal';
import {
  ACTION_CARDS_DEMO,
  CHAT_FILTERS,
  CHAT_TIMELINE,
  DEFENSE_RSVP_OPTIONS,
  GIFT_CARDS_DEMO,
  WAR_LOG_META,
  buildCrewChatBonusCard,
  warLogTint,
  type ActionCardDemo,
  type BonusActionCard as BonusActionCardData,
  type ChatFilter,
  type CrewLocText,
  type CrewReactionKey,
  type DefenseRsvp,
  type GiftCardDemo,
  type WarLogEntryDemo,
  type WarLogType,
} from '../../src/features/crew/feed';
import { ReactionBar } from '../../src/features/crew/ReactionBar';
import {
  DAILY_GLUE_SOCIAL_XP,
  markDailyAction,
  useDailyBoost,
  useDailyGlue,
  type DailyGlueView,
} from '../../src/features/crew/dailyGlue';
import {
  CONQUEST_REACTIONS,
  resolveConquestReactions,
  seedConquestReactions,
  toggleConquestReaction,
  useConquestReactions,
} from '../../src/features/crew/conquestReactions';
import {
  GIFT_REACTIONS,
  resolveGiftReactions,
  seedGiftReactions,
  thanksLine,
  toggleGiftReaction,
  useGiftReactions,
} from '../../src/features/crew/reactions';
import { useCrewChat, CHAT_ME, type ChatThreadMessage } from '../../src/features/crew/chatStore';
import {
  REPORT_REASONS,
  REPORT_REVIEW_HOURS,
  blockMember,
  containsBlockedWord,
  isBlocked,
  reportContent,
  unblockMember,
  useModeration,
  type ReportReason,
  type ReportTargetKind,
} from '../../src/features/crew/moderation';
import { useCrewProfile } from '../../src/features/crew/crewEdit';
import { buildInviteLink, copyInviteLink, demoInviteToken } from '../../src/features/crew/invite';
import {
  OUTING_RSVP_OPTIONS,
  createOuting,
  objectiveLabel,
  setOutingRsvp,
  useCrewOutings,
  type CrewOutingObjective,
  type OutingRsvp,
  type OutingView,
} from '../../src/features/crew/events';
import {
  REQUEST_CHOICES,
  claimGift,
  createDonation,
  createRequest,
  donationToGiftCard,
  giftClaimable,
  giftClaimedByMe,
  giftExpired,
  giftRewardsLeft,
  offerGift,
  requestToActionCard,
  useCrewRequests,
  type OfferedGift,
  type RequestChoiceKey,
} from '../../src/features/crew/requests';

/** Toggle démo : passer à false pour prévisualiser l'état « sans crew ». */
const HAS_CREW = true;

/** Onglets internes du HQ — 3 seulement (§A « 1 écran = 1 décision »). */
type HqTab = 'base' | 'chat' | 'membres';
const HQ_TABS: readonly { key: HqTab; label: Entry }[] = [
  { key: 'base', label: C.tabBase },
  { key: 'chat', label: C.tabChat },
  { key: 'membres', label: C.tabMembers },
];

/**
 * Palier du coffre localisé (catalogue crew, TIER_E) — les clés restent les
 * noms techniques de rules.ts. Repli sur la clé brute (robustesse démo).
 * Résolu via t() global : appelé pendant le rendu d'un écran déjà abonné à la
 * locale (useT dans CrewScreen) → recalcul à chaque bascule.
 */
const tierLabelFr = (tier: string): string => {
  const entry = (TIER_E as Readonly<Record<string, Entry | undefined>>)[tier];
  return entry ? tGlobal(entry) : tier;
};

/** Résout un texte localisable de carte (feed.ts CrewLocText) — via t() global. */
const locText = (x: CrewLocText): string => ('raw' in x ? x.raw : tGlobal(x.entry, x.vars));

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function EmptyState() {
  const t = useT();
  const todoCrewFlow = (step: 'create' | 'join') => {
    // TODO(O1) : création / rejoindre un crew (crew_created, crew_joined §8).
    // En attendant le flux serveur, le bouton répond honnêtement au tap.
    if (step === 'create') {
      Alert.alert(t(C.createMyCrew), t(C.alertCreateBody), [
        { text: t(C.explore), onPress: () => router.push('/crew-discovery') },
        { text: t(C.later), style: 'cancel' },
      ]);
    } else {
      Alert.alert(t(C.alertJoinTitle), t(C.alertJoinBody), [
        { text: t(C.explore), onPress: () => router.push('/crew-discovery') },
        { text: t(C.later), style: 'cancel' },
      ]);
    }
  };
  return (
    <TabScreen
      title="Crew"
      icon="crew"
      kicker={t(C.kickerSeason)}
      subtitle={t(C.emptySubtitle)}
    >
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>{t(C.emptyTitle)}</Text>
        <Text style={styles.emptyBody}>{t(C.emptyBody)}</Text>
        <View style={styles.emptyActions}>
          <GhostButton label={t(C.createMyCrew)} icon="plus" onPress={() => todoCrewFlow('create')} />
          <GhostButton
            label={t(C.joinWithCodeN, { n: CREW_CODE_LENGTH })}
            onPress={() => todoCrewFlow('join')}
          />
          <GhostButton
            label={t(C.exploreAroundMe)}
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
      {/* Détail : 2 lignes possibles — un texte n'est JAMAIS coupé par « … ». */}
      {sub ? (
        <Text style={styles.baseCardSub} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
      {progress !== undefined ? <ProgressBar value={progress} height={4} /> : null}
    </Pressable>
  );
}

/**
 * Carte MISSION PRIORITAIRE — LA décision du Crew HQ, en tête de la Base.
 * Câblée sur MY_CREW.urgentDefense : « DÉFENSE URGENTE · République · 48 h »
 * + UNIQUE CTA chartreuse « DÉFENDRE · RÉPUBLIQUE » qui route vers la course
 * en intention défense (le serveur reste seul juge du claim §3). Liseré violet
 * contesté = état de jeu « sous pression », pas une déco. 3 infos max :
 * secteur · rues · heures restantes (seule horloge de la Base).
 */
function UrgentMissionCard() {
  const t = useT();
  const d = MY_CREW.urgentDefense;
  return (
    <View style={styles.missionCard}>
      <View style={styles.missionHead}>
        <Icon name="bouclier" size={16} color={gameColors.contested} />
        <Text style={styles.missionKicker}>{t(C.urgentDefense)}</Text>
        <Text style={styles.missionHours} numberOfLines={1}>
          {t(C.hoursLeft, { h: d.hoursLeft })}
        </Text>
      </View>
      <Text style={styles.missionSector} numberOfLines={1}>
        {d.sector}
      </Text>
      <Text style={styles.missionMeta} numberOfLines={1}>
        {t(C.streetsToHold, { n: d.streets })}
      </Text>
      <InlineRunCTA
        label={`${t(C.defendCta)} · ${d.sector.toUpperCase()}`}
        leading={<Icon name="bouclier" size={18} color={colors.noir} />}
        accessibilityLabel={t(C.defendA11y, { sector: d.sector, h: d.hoursLeft })}
        onPress={() => router.push('/course-live?intention=defense')}
      />
    </View>
  );
}

/**
 * Bloc TERRITOIRE CREW (AMENDEMENT-11 §4) : « Paris Est : 42 % · Zones tenues
 * 2 147 · Frontières contestées 3 · Routes ouvertes 6 ». Tap → Battle Map.
 * Le violet contesté est un état de jeu (charte) — pas une déco.
 */
function TerritoryBlock() {
  const t = useT();
  const terr = MY_CREW.territory;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.territoryA11y, { sector: terr.sector, pct: terr.controlPct })}
      onPress={() => router.navigate('/')}
      style={({ pressed }) => [styles.territoryCard, pressed && styles.dim]}
    >
      <View style={styles.territoryHead}>
        <Icon name="pin" size={16} color={gameColors.crew} />
        <Text style={styles.territoryKicker}>{t(C.territoryKicker)}</Text>
        <Icon name="chevron" size={14} color={colors.gris} />
      </View>
      <View style={styles.territoryMain}>
        <Text style={styles.territorySector} numberOfLines={1}>
          {terr.sector}
        </Text>
        <Text style={styles.territoryPct}>{terr.controlPct} %</Text>
      </View>
      <ProgressBar value={terr.controlPct / 100} height={6} />
      {/* Surface ≤ 3 infos (§A) : secteur + contrôle % (le KPI, jauge) + le seul
          signal d'action — les frontières contestées (violet). Le reste (zones
          tenues, routes ouvertes) vit sur la carte, ouverte au tap de la carte. */}
      <View style={styles.territoryStats}>
        <Text style={[styles.territoryValue, { color: gameColors.contested }]}>
          {terr.contestedBorders}
        </Text>
        <Text style={styles.territoryStatLabel}>{t(C.contestedDetail)}</Text>
      </View>
    </Pressable>
  );
}

/** Horodatage court d'un message chat (« à l'instant », « 14:32 », « hier »). */
function chatTimeLabel(at: number, now: number): string {
  const diffMin = Math.max(0, Math.round((now - at) / 60_000));
  // Localisé via t() global — appelé au rendu d'un composant abonné (useT).
  if (diffMin < 1) return tGlobal(C.justNow);
  if (diffMin < 60) return `${diffMin} min`;
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diffMin < 24 * 60) return `${hh}:${mm}`;
  return tGlobal(C.yesterdayAt, { time: `${hh}:${mm}` });
}

/**
 * Bulle de chat : les MIENNES alignées à DROITE (chartreuse discret), les autres
 * à GAUCHE avec avatar (initiale) + pseudo. Messages actionnables démo conservés
 * (RSVP sortie défense, ping zone → carte) sous la bulle de l'auteur.
 */
function ChatBubble({
  msg,
  rsvp,
  setRsvp,
  onReport,
}: {
  msg: ChatThreadMessage;
  rsvp: Record<string, DefenseRsvp>;
  setRsvp: Dispatch<SetStateAction<Record<string, DefenseRsvp>>>;
  /** Ouvre la feuille « Signaler » sur ce message (menu … / appui long). */
  onReport: (msg: ChatThreadMessage) => void;
}) {
  const t = useT();
  const now = Date.now();
  // Filtrage de mots (§1) : un message toxique est MASQUÉ (jamais montré en
  // clair), tout en gardant l'auteur visible pour pouvoir le signaler/bloquer.
  const masked = containsBlockedWord(msg.text);
  const shownText = masked ? t(C.maskedMessage) : msg.text;
  if (msg.me) {
    return (
      <View style={styles.bubbleRowMe}>
        <View style={[styles.bubble, styles.bubbleMe]}>
          <Text style={[styles.bubbleTextMe, masked && styles.bubbleMasked]}>{shownText}</Text>
          <Text style={styles.bubbleTimeMe}>{chatTimeLabel(msg.at, now)}</Text>
        </View>
      </View>
    );
  }
  const initial = msg.author.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').charAt(0).toUpperCase() || '?';
  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.bubbleCol}>
        <View style={styles.bubbleHead}>
          <Text style={styles.bubbleAuthor} numberOfLines={1}>
            {msg.author}
          </Text>
          <Text style={styles.bubbleTime}>{chatTimeLabel(msg.at, now)}</Text>
          {/* Menu « … » → Signaler ce message (App Store 1.2). Appui long aussi. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.reportMessageOf, { author: msg.author })}
            hitSlop={14}
            onPress={() => onReport(msg)}
            style={({ pressed }) => [styles.bubbleMore, pressed && styles.dim]}
          >
            <Text style={styles.bubbleMoreDots}>···</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.messageLongPress, { author: msg.author })}
          onLongPress={() => onReport(msg)}
          delayLongPress={350}
          style={[styles.bubble, styles.bubbleOther]}
        >
          <Text style={[styles.bubbleText, masked && styles.bubbleMasked]}>{shownText}</Text>
        </Pressable>

        {/* Sortie défense → RSVP (Je participe / Peut-être / Indispo) */}
        {msg.action === 'rsvp' ? (
          <>
            <View style={styles.rsvpRow}>
              {DEFENSE_RSVP_OPTIONS.map((opt) => {
                const selected = rsvp[msg.id] === opt;
                const engaged = selected && opt === 'Je participe';
                return (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      haptics.light();
                      setRsvp((r) => ({ ...r, [msg.id]: opt }));
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
                      {/* Clé stable FR (état local) — présentation localisée. */}
                      {DEFENSE_RSVP_E[opt] ? t(DEFENSE_RSVP_E[opt]!) : opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {rsvp[msg.id] ? (
              <Text style={styles.rsvpDone}>{t(C.rsvpSent)}</Text>
            ) : null}
          </>
        ) : null}

        {/* Ping zone → Ouvrir la carte */}
        {msg.action === 'openMap' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/')}
            style={({ pressed }) => [styles.mapBtn, pressed && styles.dim]}
          >
            <Icon name="carte" size={14} color={colors.blanc} />
            <Text style={styles.mapBtnLabel}>{t(C.openMap)}</Text>
          </Pressable>
        ) : null}

        {msg.reactions ? <ReactionBar initial={msg.reactions} /> : null}
      </View>
    </View>
  );
}

/** Icône + teinte d'une carte d'action « À FAIRE » (état de jeu, pas déco). */
const ACTION_META: Record<
  ActionCardDemo['kind'],
  { icon: IconName; tint: string }
> = {
  finish: { icon: 'avantposte', tint: gameColors.crew },
  defense: { icon: 'bouclier', tint: gameColors.contested },
  outing: { icon: 'crew', tint: gameColors.crew },
  request: { icon: 'route', tint: gameColors.gold },
};

/**
 * Carte d'action « À FAIRE » (A.2) : type + zone + 1-2 infos + 1 CTA (pill N2
 * relevé, verbe précis — le seul CTA chartreuse plein de la scène Chat reste
 * « Demander de l'aide »). Le CTA route vers l'écran de course/planner (le
 * client ne claim jamais) ou relaie une action démo. Libellé JAMAIS tronqué.
 */
function ActionCard({
  card,
  onCta,
}: {
  card: ActionCardDemo;
  onCta: (card: ActionCardDemo) => void;
}) {
  const meta = ACTION_META[card.kind];
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionTop}>
        <View style={[styles.actionIcon, { borderColor: meta.tint }]}>
          <Icon name={meta.icon} size={18} color={meta.tint} />
        </View>
        <View style={styles.actionBody}>
          <Text style={styles.actionTitle} numberOfLines={1}>
            {card.title}
          </Text>
          <Text style={styles.actionZone} numberOfLines={1}>
            {card.zone} · {card.infos.join(' · ')}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.cta} · ${card.zone}`}
        onPress={() => onCta(card)}
        style={({ pressed }) => [styles.actionCta, pressed && styles.dim]}
      >
        <Text style={styles.actionCtaLabel}>{card.cta}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Carte d'action BONUS (AMENDEMENT-19 §4) en tête de À FAIRE : « BONUS FINISHER ·
 * Il manque 620 m pour capturer République · [TERMINER] ». GRYD révèle le bon
 * moment pour agir — 1 SEUL bonus principal, libellé court NON tronqué, cohérent
 * avec ActionCard. Liseré teinté par famille (finisher = chartreuse) pour la
 * distinguer sans la faire crier. Le CTA route vers la course (le serveur reste
 * seul juge du claim §3) — jamais de territoire/point offert ici.
 */
function BonusActionCard({
  card,
  onCta,
}: {
  card: BonusActionCardData;
  onCta: (card: BonusActionCardData) => void;
}) {
  // Abonne la carte à la locale (les textes CrewLocText sont résolus au rendu).
  useT();
  return (
    <View style={[styles.bonusCard, { borderColor: card.tint }]}>
      <View style={styles.actionTop}>
        <View style={[styles.actionIcon, { borderColor: card.tint }]}>
          <Icon name={card.icon} size={18} color={card.tint} />
        </View>
        <View style={styles.actionBody}>
          <Text style={[styles.bonusTitle, { color: card.tint }]} numberOfLines={1}>
            {locText(card.title)}
          </Text>
          <Text style={styles.actionZone} numberOfLines={2}>
            {locText(card.detail)}
          </Text>
        </View>
      </View>
      {/* Effet PROMIS (libellé court non tronqué) — jamais points/territoire. */}
      <View style={[styles.bonusEffectPill, { borderColor: card.tint }]}>
        <Text style={[styles.bonusEffect, { color: card.tint }]} numberOfLines={1}>
          {locText(card.effect)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.bonus.cta} · ${locText(card.title)}`}
        onPress={() => onCta(card)}
        style={({ pressed }) => [styles.actionCta, pressed && styles.dim]}
      >
        <Text style={styles.actionCtaLabel}>{card.bonus.cta}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Types d'événements War Log qui sont une CONQUÊTE d'un coéquipier (§31.2) :
 * une zone reprise (`reprise`) ou une frontière fermée qui capture la zone
 * (`boundaryCompleted`). Seuls ceux-ci portent les kudos GRYD Respect/Feu/
 * Défends-la (les autres events gardent la barre de réactions générique).
 */
const CONQUEST_EVENT_TYPES = new Set<WarLogType>(['reprise', 'boundaryCompleted']);

/** true si l'event est la conquête d'un coéquipier → kudos GRYD persistés. */
function isConquestEvent(type: WarLogType): boolean {
  return CONQUEST_EVENT_TYPES.has(type);
}

/**
 * Compteurs de départ des kudos de conquête (démo), dérivés des réactions
 * génériques déjà portées par l'event dans feed.ts (POSITIVES : raid/respect/
 * legend…). On mappe vers les 3 kudos GRYD sans toucher feed.ts : Respect ←
 * respect ; Feu ← raid + fast + legend (l'élan de la prise) ; Défends-la ←
 * defense + hold (tenir la zone). Jamais négatif (§11).
 */
function conquestSeedFor(
  reactions: Partial<Record<CrewReactionKey, number>>,
): Partial<Record<'respect' | 'feu' | 'defends', number>> {
  const r = (k: CrewReactionKey) => reactions[k] ?? 0;
  return {
    respect: r('respect'),
    feu: r('raid') + r('fast') + r('legend'),
    defends: r('defense') + r('hold'),
  };
}

/**
 * Carte de CONQUÊTE d'un coéquipier (§31.2, emprunt kudos Strava rendu GRYD).
 * Rend l'event via WarEventCard avec ses réactions natives câblées sur le store
 * PERSISTÉ (conquestReactions.ts) : Respect · Feu · Défends-la (picto GRYD, pas
 * d'emoji). Anti-shame : compteurs POSITIFS seulement, on salue la prise —
 * jamais de « perdu », jamais de compteur négatif. Zéro effet de jeu.
 */
function ConquestEventCard({ item }: { item: WarLogEntryDemo }) {
  // Seed idempotent des compteurs de départ (avant tout tap), dérivé des
  // réactions génériques positives de l'event (pas d'édition de feed.ts).
  seedConquestReactions(item.id, conquestSeedFor(item.reactions));
  const state = resolveConquestReactions(item.id);
  const reactions: readonly WarEventReaction[] = CONQUEST_REACTIONS.map((r) => ({
    icon: r.icon,
    count: state.counts[r.key] ?? 0,
    mine: state.mine[r.key] === true,
  }));
  return (
    <WarEventCard
      icon={WAR_LOG_META[item.type].icon}
      message={item.message}
      zone={item.zone}
      points={item.points}
      minutesAgo={item.minutesAgo}
      tint={warLogTint(item)}
      reactions={reactions}
      onReact={(icon) => {
        const def = CONQUEST_REACTIONS.find((r) => r.icon === icon);
        if (def) toggleConquestReaction(item.id, def.key);
      }}
    />
  );
}

/**
 * Carte de DON (A.4) : kicker + qui + effet + [Voir] + réactions Merci/Respect/
 * Bien joué (persistées, reactions.ts). Statut social COSMÉTIQUE — la ligne
 * « 12 membres ont remercié Benjamin. » apparaît dès le 1ᵉʳ Merci. Don anonyme
 * → « ce membre » (jamais de nom forcé). ZÉRO pay-to-win.
 */
function GiftCard({ gift, onCta }: { gift: GiftCardDemo; onCta: (gift: GiftCardDemo) => void }) {
  const t = useT();
  // Seed idempotent des compteurs de départ (avant tout tap).
  seedGiftReactions(gift.id, gift.seed);
  const state = resolveGiftReactions(gift.id);
  const thanks = thanksLine(gift.id, gift.by);
  const who = gift.by ?? t(C.aMember);
  return (
    <View style={styles.giftCard}>
      <View style={styles.giftHead}>
        <View style={styles.giftIcon}>
          <Icon name="cadeau" size={16} color={gameColors.gold} />
        </View>
        <Text style={styles.giftKicker} numberOfLines={1}>
          {gift.kicker}
        </Text>
      </View>
      <Text style={styles.giftMessage} numberOfLines={2}>
        <Text style={styles.giftBy}>{who} </Text>
        {gift.message}
      </Text>
      <Text style={styles.giftEffect} numberOfLines={2}>
        {gift.effect}
      </Text>

      {/* Réactions Merci / Respect / Bien joué — cosmétique, persisté. */}
      <View style={styles.giftReactRow}>
        {GIFT_REACTIONS.map((r) => {
          const count = state.counts[r.key] ?? 0;
          const mine = state.mine[r.key] === true;
          return (
            <Pressable
              key={r.key}
              accessibilityRole="button"
              accessibilityState={{ selected: mine }}
              accessibilityLabel={`${t(r.label)} · ${gift.kicker}`}
              onPress={() => {
                haptics.light();
                toggleGiftReaction(gift.id, r.key);
              }}
              style={[styles.giftReact, mine && styles.giftReactMine]}
            >
              <Text style={[styles.giftReactLabel, mine && styles.giftReactLabelMine]}>
                {t(r.label)}
              </Text>
              {count > 0 ? (
                <Text style={[styles.giftReactCount, mine && styles.giftReactLabelMine]}>
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {thanks ? <Text style={styles.giftThanks}>{thanks}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={gift.cta}
        onPress={() => onCta(gift)}
        style={({ pressed }) => [styles.giftCtaBtn, pressed && styles.dim]}
      >
        <Icon name="chevron" size={14} color={colors.blanc} />
        <Text style={styles.giftCtaLabel}>{gift.cta}</Text>
      </Pressable>
    </View>
  );
}

/** Fenêtre de réclamation restante d'un cadeau (« 23 h », « 42 min », « Expiré »). */
function giftWindowLabel(gift: OfferedGift, now: number): string {
  if (giftExpired(gift, now)) return tGlobal(C.expired);
  const min = Math.max(0, Math.round((gift.expiresAt - now) / 60_000));
  if (min >= 60) return `${Math.floor(min / 60)} h`;
  return `${min} min`;
}

/**
 * Carte CADEAU CREW (A.3, gifting premium) : « Benjamin a offert un Coffre
 * cosmétique · 5 récompenses · [Réclamer] ». LIMITES DURES affichées et
 * appliquées : 1 réclamation/membre (CREW_GIFT_CLAIMS_PER_MEMBER), expiration
 * CREW_GIFT_EXPIRY_H (24 h), mention « offert » (anonyme → « Un membre »).
 * JAMAIS de montant ni de classement. Réclamer décrémente les récompenses.
 */
function CadeauCrewCard({
  gift,
  now,
  onClaim,
}: {
  gift: OfferedGift;
  now: number;
  onClaim: (gift: OfferedGift) => void;
}) {
  const t = useT();
  const left = giftRewardsLeft(gift);
  const mine = giftClaimedByMe(gift);
  const expired = giftExpired(gift, now);
  const claimable = giftClaimable(gift, now);
  const who = gift.by ?? t(C.aMember);
  // État du CTA : réclamable / déjà réclamé / épuisé / expiré.
  const ctaLabel = mine
    ? t(C.alreadyClaimed)
    : expired
      ? t(C.offerExpired)
      : left <= 0
        ? t(C.allClaimed)
        : t(C.claim);
  return (
    <View style={styles.cadeauCard}>
      <View style={styles.cadeauHead}>
        <View style={styles.cadeauIcon}>
          <Icon name="cadeau" size={16} color={gameColors.gold} />
        </View>
        <Text style={styles.cadeauKicker} numberOfLines={1}>
          {t(C.cadeauKicker)}
        </Text>
        <Text style={styles.cadeauWindow} numberOfLines={1}>
          {giftWindowLabel(gift, now)}
        </Text>
      </View>
      <Text style={styles.cadeauMessage} numberOfLines={2}>
        <Text style={styles.giftBy}>{who} </Text>
        {t(C.offeredGift, { title: gift.title })}
      </Text>
      {/* Récompenses restantes — jamais de montant ni de prix (A.3). */}
      <Text style={styles.cadeauMeta} numberOfLines={1}>
        {t(C.cadeauMeta, {
          rewards: left === 1 ? t(C.rewardsOne) : t(C.rewardsMany, { n: left }),
          c: CREW_GIFT_CLAIMS_PER_MEMBER,
          h: CREW_GIFT_EXPIRY_H,
        })}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ctaLabel} · ${gift.title}`}
        accessibilityState={{ disabled: !claimable }}
        disabled={!claimable}
        onPress={() => onClaim(gift)}
        style={({ pressed }) => [
          styles.cadeauCta,
          claimable ? styles.cadeauCtaActive : styles.cadeauCtaIdle,
          pressed && claimable && styles.dim,
        ]}
      >
        <Text style={[styles.cadeauCtaLabel, claimable && styles.cadeauCtaLabelActive]}>
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/** Icône + teinte de l'objectif d'une sortie (état de jeu, pas déco). */
const OUTING_OBJECTIVE_META: Record<
  CrewOutingObjective,
  { icon: IconName; tint: string }
> = {
  // Défense = bouclier + bleu « protégé » (§C : le violet reste réservé au
  // statut CONTESTÉ ; une sortie défense = on protège/tient une zone).
  defense: { icon: 'bouclier', tint: gameColors.verify },
  // Conquête = cible + chartreuse crew (on va prendre du terrain ensemble).
  conquete: { icon: 'cible', tint: gameColors.crew },
};

/**
 * Carte d'une SORTIE de crew (AMENDEMENT-32 §1) : titre + heure + lieu de RDV +
 * ZONE CIBLE avec objectif (défense/conquête) + RSVP « Je viens ». Une seule
 * couche de container (§A.3), textes courts NON tronqués (§A.9). Le compteur
 * « X viennent » est un signal de densité — jamais un classement (§A.19). ZÉRO
 * effet de jeu : courir ensemble ne donne ni territoire ni point.
 */
function SortieCard({
  outing,
  onRsvp,
}: {
  outing: OutingView;
  onRsvp: (outing: OutingView, choice: OutingRsvp) => void;
}) {
  const t = useT();
  const meta = OUTING_OBJECTIVE_META[outing.objective];
  // Densité de la sortie : « 7 viennent » (jamais 0 → on n'affiche pas « 0 »).
  const goingLabel =
    outing.going > 0
      ? outing.going === 1
        ? t(C.goingOne)
        : t(C.goingMany, { n: outing.going })
      : null;
  return (
    <View style={styles.outingCard}>
      {/* Ligne 1 : objectif (icône teintée) + titre + zone cible. */}
      <View style={styles.outingTop}>
        <View style={[styles.outingIcon, { borderColor: meta.tint }]}>
          <Icon name={meta.icon} size={18} color={meta.tint} />
        </View>
        <View style={styles.outingHeadText}>
          <Text style={styles.outingTitle} numberOfLines={1}>
            {outing.title}
          </Text>
          <Text style={[styles.outingObjective, { color: meta.tint }]} numberOfLines={1}>
            {t(objectiveLabel(outing.objective))} · {outing.zone}
          </Text>
        </View>
      </View>

      {/* Ligne 2 : quand + où (RDV) — 2 infos compactes, non tronquées. */}
      <View style={styles.outingMetaRow}>
        <Icon name="serie" size={13} color={colors.gris} />
        <Text style={styles.outingMeta} numberOfLines={1}>
          {outing.when}
        </Text>
      </View>
      <View style={styles.outingMetaRow}>
        <Icon name="pin" size={13} color={colors.gris} />
        <Text style={styles.outingMeta} numberOfLines={2}>
          {outing.place}
        </Text>
      </View>

      {/* Ligne 3 : densité (X viennent) + qui organise. */}
      <Text style={styles.outingDensity} numberOfLines={1}>
        {goingLabel ? `${goingLabel} · ` : ''}
        {outing.mine ? t(C.yourOuting) : t(C.byHost, { host: outing.host })}
      </Text>

      {/* RSVP : Je viens / Peut-être / Indispo — mon choix se souvient (persisté). */}
      <View style={styles.outingRsvpRow}>
        {OUTING_RSVP_OPTIONS.map((opt) => {
          const selected = outing.myRsvp === opt;
          const engaged = selected && opt === 'Je viens';
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${OUTING_RSVP_E[opt] ? t(OUTING_RSVP_E[opt]!) : opt} · ${outing.title}`}
              onPress={() => onRsvp(outing, opt)}
              style={[
                styles.outingRsvpChip,
                selected && styles.outingRsvpChipSelected,
                engaged && styles.outingRsvpChipEngaged,
              ]}
            >
              <Text
                style={[
                  styles.outingRsvpLabel,
                  selected && styles.outingRsvpLabelSelected,
                  engaged && styles.outingRsvpLabelEngaged,
                ]}
              >
                {/* Clé stable FR (persistée) — présentation localisée. */}
                {OUTING_RSVP_E[opt] ? t(OUTING_RSVP_E[opt]!) : opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {outing.myRsvp ? (
        <Text style={styles.outingRsvpDone}>{t(C.rsvpSent)}</Text>
      ) : null}
    </View>
  );
}

/**
 * Une LIGNE d'action de la colle quotidienne (§A.3 : une seule couche de
 * container, texte NON tronqué, 1 tap = 1 micro-action). Icône teintée à gauche,
 * libellé + sous-titre au centre, état à droite (chip « Fait » quand accompli).
 * `done` grise doucement la ligne — l'action reste lisible (jamais barrée).
 */
function DailyGlueRow({
  icon,
  tint,
  label,
  sub,
  done,
  doneLabel,
  onPress,
}: {
  icon: IconName;
  tint: string;
  label: string;
  sub: string;
  done: boolean;
  doneLabel: string;
  onPress: () => void;
}) {
  // Micro-anim de validation (reveal) rejouée quand la ligne passe à « fait ».
  const check = useReveal(done);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: done }}
      accessibilityLabel={done ? `${label} — ${doneLabel}` : `${label}. ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [styles.glueRow, pressed && styles.dim]}
    >
      <View style={[styles.glueIcon, { borderColor: tint }]}>
        <Icon name={icon} size={18} color={tint} />
      </View>
      <View style={styles.glueBody}>
        <Text style={[styles.glueLabel, done && styles.glueLabelDone]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.glueSub} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      {done ? (
        <Animated.View style={[styles.glueDone, { opacity: check.opacity, transform: [{ scale: check.scale }] }]}>
          <Icon name="reactClean" size={13} color={gameColors.crew} />
          <Text style={styles.glueDoneLabel} numberOfLines={1}>
            {doneLabel}
          </Text>
        </Animated.View>
      ) : (
        <Icon name="chevron" size={15} color={colors.gris} />
      )}
    </Pressable>
  );
}

/**
 * Section « AUJOURD'HUI » (AMENDEMENT-34, colle quotidienne façon Clash) : 4
 * micro-actions SANS courir pour garder le crew vivant les jours off —
 * Encourager un runner, Voter une cible, Signaler une zone faible, Boost coffre
 * GRATUIT (1×/jour, DAILY_CHEST_BOOST_*). Chaque action pose un petit +XP SOCIAL
 * cosmétique + une anim ; ZÉRO avantage territorial (anti pay-to-win STRICT).
 * UNE seule section claire (§A), pas de card-dans-card : les lignes sont des
 * surfaces N2 posées côte à côte. Reset à minuit géré par le store (dailyGlue).
 */
function DailyGlue({
  glue,
  onAction,
  onBoost,
}: {
  glue: DailyGlueView;
  onAction: (action: 'encourage' | 'vote' | 'signal') => void;
  onBoost: () => void;
}) {
  const t = useT();
  const xpChip = t(C.xpPlus, { n: DAILY_GLUE_SOCIAL_XP });
  return (
    <View style={styles.glueSection}>
      <View style={styles.glueHead}>
        <Icon name="aujourdhui" size={15} color={gameColors.crew} />
        <Text style={styles.glueKicker}>{t(C.todayKicker)}</Text>
        <Text style={styles.glueProgress} numberOfLines={1}>
          {t(C.glueProgress, { done: glue.doneCount, xp: glue.socialXpToday })}
        </Text>
      </View>
      <Text style={styles.glueLead} numberOfLines={2}>
        {t(C.glueLead)}
      </Text>

      <DailyGlueRow
        icon="reactRespect"
        tint={gameColors.crew}
        label={t(C.glueEncourage)}
        sub={t(C.glueEncourageSub)}
        done={glue.encourage}
        doneLabel={xpChip}
        onPress={() => onAction('encourage')}
      />
      <DailyGlueRow
        icon="cible"
        tint={gameColors.crew}
        label={t(C.glueVote)}
        sub={t(C.glueVoteSub)}
        done={glue.vote}
        doneLabel={xpChip}
        onPress={() => onAction('vote')}
      />
      <DailyGlueRow
        icon="bouclier"
        tint={gameColors.contested}
        label={t(C.glueSignal)}
        sub={t(C.glueSignalSub)}
        done={glue.signal}
        doneLabel={xpChip}
        onPress={() => onAction('signal')}
      />
      <DailyGlueRow
        icon="cadeau"
        tint={gameColors.gold}
        label={t(C.glueBoost)}
        sub={t(C.glueBoostSub)}
        done={!glue.boostAvailable}
        doneLabel={t(C.used)}
        onPress={onBoost}
      />

      <Text style={styles.glueNote} numberOfLines={2}>
        {t(C.glueNote)}
      </Text>
    </View>
  );
}

/** En-tête d'une section du chat actionnable + « Voir tout » optionnel (anti-scroll). */
function SectionHead({
  label,
  count,
  showAll,
  onToggle,
}: {
  label: string;
  count: number;
  showAll: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.chatSectionHead}>
      <Text style={styles.chatSectionLabel}>{label}</Text>
      {count > 2 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          hitSlop={8}
          onPress={onToggle}
          style={({ pressed }) => [styles.seeAllBtn, pressed && styles.dim]}
        >
          <Text style={styles.seeAllLabel}>
            {showAll ? t(C.collapse) : t(C.seeAllN, { n: count })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CrewScreen() {
  useEffect(() => {
    screen('crew_hq');
  }, []);

  const [tab, setTab] = useState<HqTab>('base');
  /** Traduction réactive (re-render à la bascule de langue, Paramètres). */
  const t = useT();
  // Activation O1 : aucune source de crew RÉELLE (crew_members non peuplé). Un vrai
  // utilisateur (session) n'a donc PAS de crew → EmptyState « crée/rejoins un crew »
  // (rendu APRÈS tous les hooks, jamais un HQ fabriqué). Showcase (web/dev sans
  // session) → HQ démo. Le gate effectif est juste avant le return (Rules of Hooks).
  const { session, configured } = useSession();
  const realUser = configured && !!session;
  /** Profil crew effectif (reflète l'édition founder persistée au retour). */
  const crewProfile = useCrewProfile();
  /** Base horaire figée au montage (ordre stable des messages démo). */
  const chatNowBase = useMemo(() => Date.now(), []);
  const chat = useCrewChat(chatNowBase);
  /** Abonne l'écran au store des réactions de don (re-render à chaque Merci). */
  useGiftReactions();
  /** Abonne l'écran aux kudos de conquête (re-render à chaque Respect/Feu/Défends-la). */
  useConquestReactions();
  /** Requêtes émises + dons accomplis + cadeaux offerts (persistés, A.3). */
  const crewRequests = useCrewRequests();
  /** Sorties de crew à venir + mon RSVP (persistés, AMENDEMENT-32 §1). */
  const crewOutings = useCrewOutings();
  /** Colle quotidienne : 4 micro-actions du jour (persistées, AMENDEMENT-34). */
  const dailyGlue = useDailyGlue();
  /** Form « Créer une sortie » (bottom sheet) — false = fermé. */
  const [outingSheet, setOutingSheet] = useState(false);
  const [outingTitle, setOutingTitle] = useState('');
  const [outingWhen, setOutingWhen] = useState('');
  const [outingPlace, setOutingPlace] = useState('');
  const [outingZone, setOutingZone] = useState('');
  const [outingObjective, setOutingObjective] = useState<CrewOutingObjective>('conquete');
  /** Feuille « Demander » (choix de requête) — null = fermée. */
  const [askSheet, setAskSheet] = useState(false);
  /** Feuille « Offrir au crew » (cadeau premium) — null = fermée. */
  const [giftSheet, setGiftSheet] = useState(false);
  /** Filtre actif du chat actionnable (Tout / Demandes / Missions / Dons / Résultats). */
  const [chatFilter, setChatFilter] = useState<ChatFilter>('tout');
  /** Anti-scroll : « Voir tout » par section (À faire / Log) — 2 visibles sinon. */
  const [showAllActions, setShowAllActions] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);
  /** Champ de saisie du chat (barre persistante en bas de l'onglet Chat). */
  const [draft, setDraft] = useState('');
  /** Feedback court des actions démo (invite, sheet membre). */
  const [notice, setNotice] = useState<string | null>(null);
  const [memberSheet, setMemberSheet] = useState<CrewMemberDemo | null>(null);
  /** Modération (App Store 1.2) : membres bloqués + signalements persistés. */
  const moderation = useModeration();
  /** Cible du signalement en cours (message ou membre) — null = feuille fermée. */
  const [reportTarget, setReportTarget] = useState<{
    kind: ReportTargetKind;
    targetId: string;
    author: string;
  } | null>(null);
  /** Gestion « Membres bloqués » (liste + Débloquer) — false = fermée. */
  const [blockedSheet, setBlockedSheet] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const [rsvp, setRsvp] = useState<Record<string, DefenseRsvp>>({});
  const [showTiers, setShowTiers] = useState(false);
  /** Contribution/boost = section SECONDAIRE repliée par défaut (§1.3). */
  const [showContribution, setShowContribution] = useState(false);
  /** Détail territoire (secteur / zones / frontières / routes) révélé au tap. */
  const [showTerritory, setShowTerritory] = useState(false);
  /** Détail Coffre (ChestCard + paliers + contributions) révélé au tap (Base). */
  const [showCoffre, setShowCoffre] = useState(false);
  /** Détail Perks (débloqués + prochain + à venir) révélé au tap (Base). */
  const [showPerks, setShowPerks] = useState(false);
  /** Détail header (niveau + rang ville) révélé au tap — surface ≤ 3 infos (§A). */
  const [showHeaderDetail, setShowHeaderDetail] = useState(false);

  // ── Crew Boost DÉMO actif (AMENDEMENT-16 §13.1) : contribution volontaire,
  // effet COFFRE uniquement (+25 %), jamais de points. Un membre a offert un
  // Boost 24 h il y a 3 h (offrande NON anonyme en démo). Le timer descend en
  // live. O1 : cet état viendra de crew_boosts (0014).
  const [boost] = useState<CrewBoostState>(() =>
    startBoost(
      'crew_boost_24',
      { anonymous: false, by: 'LENA_RUN' },
      Date.now() - 3 * 3_600_000,
    ),
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const boostActive = boost.endsAt === null || boost.endsAt > nowTick;

  // Crew Wall (§14) : opt-in, Supporters de la saison SANS montant ni classement.
  const [wallOptIn, setWallOptIn] = useState(false);

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
  // Le boost coffre GRATUIT du jour (colle quotidienne) ajoute un petit +% au
  // coffre DÉMO (visuel) — comme le Crew Boost payant, effet COFFRE uniquement,
  // jamais points/XP de jeu/territoire (anti-P2W). Borné à 100 %.
  const chestPct = Math.min(
    1,
    MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET + dailyGlue.chestBonusPct,
  );
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

  // Mon rôle démo (KORO = founder) → gating visuel des actions (matrice §8).
  const myRole = MY_CREW.members.find((m) => m.me)?.role ?? 'runner';
  // Bouton « Modifier le crew » : founder-only (CREW_PERMISSIONS source de vérité).
  const canEditCrew = roleCan(myRole, 'changeNameEmblem') || roleCan(myRole, 'manageRecruitment');

  // War Log = UNIQUEMENT les événements (les messages vivent dans le sous-onglet
  // Chat) — on ne mélange plus événements et messages dans une seule liste.
  const warLogEvents = useMemo(
    () => CHAT_TIMELINE.filter((i) => i.kind === 'event'),
    [],
  );

  // AMENDEMENT-19 §4 — LE bonus social/Finisher pertinent pour le Crew Chat
  // (selectBonus(context, 'crew_chat') mirroré, feed.ts). Contexte DÉMO
  // DÉTERMINISTE cohérent avec la timeline : KORO a ouvert la frontière
  // République (bopen_republique), il manque 620 m → fenêtre Finisher ouverte.
  // O1 : ce contexte viendra des active_bonuses réels (migration 0016). UN seul
  // bonus principal — la carte n'apparaît QUE si le moteur le juge pertinent.
  const chatBonusCard = useMemo(
    () =>
      buildCrewChatBonusCard({
        hasCrew: true,
        nearestOpenBoundaryMissingM: 620,
        zone: 'République',
      }),
    [],
  );


  const notify = (message: string) => {
    haptics.light();
    setNotice(message);
  };

  const canSend = draft.trim().length > 0;
  const sendMessage = () => {
    if (!canSend) return;
    haptics.light();
    chat.send(draft);
    setDraft('');
  };

  // CTA d'une carte d'action « À FAIRE » : route vers l'écran de course
  // (intention client only, le serveur reste seul juge du claim §3) ou feedback
  // démo (sortie/demande relayée au crew).
  const onActionCta = (card: ActionCardDemo) => {
    haptics.medium();
    // « quelqu'un aide » (A.3) : aider sur une carte route/scout/défense enregistre
    // un DON GRATUIT visible en DONS (+ Merci possible). ZÉRO territoire/point : le
    // routage vers la course reste inchangé (le claim reste décidé serveur §3).
    if (card.donationKind) {
      createDonation(card.donationKind);
      setChatFilter('dons');
    }
    if (card.ctaKind === 'live') {
      const q =
        card.intention === 'complete'
          ? `intention=complete&boundary=${card.boundary ?? ''}`
          : 'intention=defense';
      router.push(`/course-live?${q}`);
      return;
    }
    if (card.ctaKind === 'planner') {
      router.push('/route-planner');
      return;
    }
    if (card.donationKind) {
      notify(t(C.donationRecorded, { cta: card.cta, zone: card.zone }));
      return;
    }
    notify(t(C.sentToCrewNotice, { cta: card.cta, zone: card.zone }));
  };

  // CTA d'une carte BONUS (AMENDEMENT-19 §4) : GRYD révèle le bon moment, le
  // JOUEUR agit — on route vers l'écran adéquat selon la famille (finisher →
  // fermer la frontière ; défense → défendre ; coffre → détail Coffre de la
  // Base). Le serveur reste seul juge de la récompense (§3) : on invite.
  const onBonusCta = (card: BonusActionCardData) => {
    haptics.medium();
    switch (card.bonus.id) {
      case 'finisher':
        router.push('/course-live?intention=complete&boundary=republique');
        return;
      case 'defense_critical':
        router.push('/course-live?intention=defense');
        return;
      case 'crew_chest':
        setTab('base');
        setShowCoffre(true);
        return;
      default:
        notify(t(C.bonusDemoNotice, { cta: card.bonus.cta, title: locText(card.title) }));
    }
  };

  // CTA « Voir » d'un don : coffre (détail dans la Base), carte, ou Arsenal.
  const onGiftCta = (gift: GiftCardDemo) => {
    haptics.light();
    if (gift.ctaKind === 'chest') {
      setTab('base');
      setShowCoffre(true);
      return;
    }
    if (gift.ctaKind === 'map') {
      router.navigate('/');
      return;
    }
    // D8 : Arsenal masqué hors MVP — le don retombe sur la base du crew.
    if (!flags.arsenal) return;
    router.push('/arsenal');
  };

  // « Demander » (A.3) : un choix crée une CARTE REQUÊTE persistée en tête de
  // À FAIRE. `boost` est une PROPOSITION optionnelle, jamais une demande de payer.
  const onAskChoice = (choice: RequestChoiceKey) => {
    haptics.medium();
    setAskSheet(false);
    createRequest(choice);
    // On bascule sur le filtre pertinent + on s'assure d'être sur l'onglet Chat.
    setChatFilter(choice === 'outing' ? 'missions' : 'demandes');
    setTab('chat');
    if (choice === 'boost') {
      notify(t(C.boostProposedNotice));
    } else {
      const def = REQUEST_CHOICES.find((c) => c.key === choice);
      notify(t(C.requestSentNotice, { label: def ? t(def.label) : choice }));
    }
  };

  // « Offrir au crew » (A.3, gifting premium) : crée une CARTE CADEAU réclamable
  // dans DONS. Limites DURES appliquées dans le store (1/membre, 24 h). Anonyme
  // possible. JAMAIS de montant. Cohérent avec le gifting AMENDEMENT-16.
  const onOfferGift = (kind: 'boost' | 'chest', anonymous: boolean) => {
    haptics.medium();
    setGiftSheet(false);
    offerGift(
      kind === 'chest'
        ? { title: t(C.cosmeticChest), rewardsTotal: 5, anonymous, by: CHAT_ME }
        : { title: t(C.boostCrew24), rewardsTotal: 5, anonymous, by: CHAT_ME },
    );
    setChatFilter('dons');
    setTab('chat');
    notify(t(C.giftOfferedNotice, { h: CREW_GIFT_EXPIRY_H }));
  };

  // Réclamer un cadeau (démo) : décrémente les récompenses + toast. Les gardes
  // (expiré / épuisé / déjà réclamé) sont dans claimGift — on ne toast que le OK.
  const onClaimGift = (gift: OfferedGift) => {
    haptics.light();
    const ok = claimGift(gift.id);
    if (ok) notify(t(C.rewardClaimedNotice, { title: gift.title }));
  };

  // ── COLLE QUOTIDIENNE (AMENDEMENT-34) : 4 micro-actions SANS courir pour
  // garder le crew vivant les jours off. Chaque action pose un +XP SOCIAL
  // cosmétique + une anim ; ZÉRO territoire/point/vitesse/protection (anti-P2W).
  // Encourager / Voter / Signaler : action ponctuelle, une fois/jour (idempotent).
  const onDailyAction = (action: 'encourage' | 'vote' | 'signal') => {
    const posted = markDailyAction(action);
    if (!posted) {
      notify(t(C.alreadyDoneToday));
      return;
    }
    haptics.light();
    const label =
      action === 'encourage'
        ? t(C.encourageSent)
        : action === 'vote'
          ? t(C.voteRecorded)
          : t(C.weakZoneSignaled);
    notify(t(C.socialXpNotice, { label, n: DAILY_GLUE_SOCIAL_XP }));
  };
  // Boost coffre GRATUIT : capé 1×/jour (DAILY_CHEST_BOOST_*). Alimente le coffre
  // crew DÉMO (visuel, +2 %) — jamais points/XP de jeu/territoire. success = geste
  // de générosité franc ; refus doux si déjà utilisé aujourd'hui.
  const onDailyBoost = () => {
    const posted = useDailyBoost();
    if (!posted) {
      notify(t(C.boostUsedToday));
      return;
    }
    haptics.success();
    notify(t(C.boostGiven));
  };

  // RSVP à une sortie (AMENDEMENT-32 §1) : « Je viens » / « Peut-être » /
  // « Indispo », mon choix persiste (toggle dans le store). ZÉRO effet de jeu.
  const onOutingRsvp = (outing: OutingView, choice: OutingRsvp) => {
    haptics.light();
    setOutingRsvp(outing.id, choice);
  };

  // Créer une sortie (form court) : titre + heure + lieu + zone obligatoires,
  // objectif défense/conquête. Textes trimés, sortie persistée en tête de liste.
  const outingReady =
    outingTitle.trim().length > 0 &&
    outingWhen.trim().length > 0 &&
    outingPlace.trim().length > 0 &&
    outingZone.trim().length > 0;
  const submitOuting = () => {
    if (!outingReady) return;
    haptics.medium();
    createOuting({
      title: outingTitle.trim(),
      when: outingWhen.trim(),
      place: outingPlace.trim(),
      zone: outingZone.trim(),
      objective: outingObjective,
    });
    setOutingSheet(false);
    setOutingTitle('');
    setOutingWhen('');
    setOutingPlace('');
    setOutingZone('');
    setOutingObjective('conquete');
    setTab('membres');
    notify(t(C.outingCreated));
  };

  // ── Sections du chat actionnable filtrées (A.2/A.3) ──
  // Mes REQUÊTES émises (bouton « Demander ») en TÊTE de À FAIRE, avant la démo.
  const myRequestCards = useMemo(
    () => crewRequests.requests.map(requestToActionCard),
    [crewRequests.requests],
  );
  // À FAIRE : mes requêtes + cartes démo, filtrées (Dons/Résultats masquent À faire).
  const visibleActions = useMemo(() => {
    if (chatFilter === 'dons' || chatFilter === 'resultats') return [];
    const all = [...myRequestCards, ...ACTION_CARDS_DEMO];
    return all.filter((c) => chatFilter === 'tout' || c.filters.includes(chatFilter));
  }, [chatFilter, myRequestCards]);
  // La carte BONUS partage la section À FAIRE : visible sous Tout/Demandes/
  // Missions (comme une action d'entraide), masquée sous Dons/Résultats.
  const showBonusCard =
    chatBonusCard !== null &&
    (chatFilter === 'tout' || chatFilter === 'demandes' || chatFilter === 'missions');
  // Mes DONS accomplis (route/scout/défense donnés) en tête des dons.
  const myDonationCards = useMemo(
    () => crewRequests.donations.map(donationToGiftCard),
    [crewRequests.donations],
  );
  // DONS : mes dons + dons démo — masqués sous Résultats/Missions.
  const visibleGifts = useMemo(
    () =>
      chatFilter === 'resultats' || chatFilter === 'missions'
        ? []
        : [...myDonationCards, ...GIFT_CARDS_DEMO],
    [chatFilter, myDonationCards],
  );
  // CADEAUX CREW premium offerts (réclamables) — dans la section Dons.
  const visibleCadeaux = useMemo(
    () =>
      chatFilter === 'resultats' || chatFilter === 'missions' ? [] : crewRequests.gifts,
    [chatFilter, crewRequests.gifts],
  );
  // MESSAGES : fil humain — masqué quand on filtre sur Dons/Résultats (secondaire).
  const showMessages = chatFilter === 'tout' || chatFilter === 'demandes';
  // LOG : masqué sous Demandes/Dons (le Log = Résultats).
  const showLog = chatFilter === 'tout' || chatFilter === 'resultats' || chatFilter === 'missions';

  const memberAction = (
    key: 'mission' | 'outing' | 'promote' | 'profil',
    label: string,
    member: CrewMemberDemo,
  ) => {
    setMemberSheet(null);
    if (key === 'profil' && member.me) {
      router.navigate('/profil');
      return;
    }
    notify(t(C.memberActionSent, { action: label, name: member.pseudo }));
  };

  // ── MODÉRATION (App Store 1.2) ────────────────────────────────────────────
  // Ouvre la feuille « Signaler » sur un message (menu … / appui long).
  const openReportMessage = (msg: ChatThreadMessage) => {
    haptics.light();
    setReportTarget({ kind: 'message', targetId: msg.id, author: msg.author });
  };
  // Ouvre la feuille « Signaler » sur un membre (depuis sa sheet d'actions).
  const openReportMember = (member: CrewMemberDemo) => {
    setMemberSheet(null);
    haptics.light();
    setReportTarget({ kind: 'member', targetId: member.pseudo, author: member.pseudo });
  };
  // Choix d'un motif → enregistre le signalement + toast « examiné sous 24 h ».
  const onReportReason = (reason: ReportReason) => {
    if (!reportTarget) return;
    haptics.medium();
    reportContent({ ...reportTarget, reason });
    setReportTarget(null);
    notify(t(C.reportSentNotice, { h: REPORT_REVIEW_HOURS }));
  };
  // Bloquer un membre : masque ses messages (filtre d'affichage) — silencieux.
  const onBlockMember = (member: CrewMemberDemo) => {
    setMemberSheet(null);
    haptics.medium();
    blockMember(member.pseudo);
    notify(t(C.memberBlockedNotice, { name: member.pseudo }));
  };
  // Débloquer depuis la liste « Membres bloqués ».
  const onUnblockMember = (pseudo: string) => {
    haptics.light();
    unblockMember(pseudo);
    notify(t(C.memberUnblockedNotice, { name: pseudo }));
  };

  // Gate APRÈS tous les hooks (Rules of Hooks) : pas de crew réel → EmptyState.
  if (!HAS_CREW || realUser) return <EmptyState />;

  return (
    <TabScreen title={crewProfile.name} icon="crew" kicker={`CREW HQ · ${MY_CREW.city.toUpperCase()}`}>
      {/* ── Header base : GRAND blason animé + frame ligue + niveau/XP ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Animated.View style={{ transform: [{ scale: crestScale }] }}>
            <CrewCrest
              seed={MY_CREW.seed}
              name={crewProfile.name}
              size="xl"
              leagueTier={MY_CREW.league}
            />
          </Animated.View>
          <View style={styles.headerInfo}>
            <View style={[styles.statusChip, warReady && styles.statusChipWar]}>
              <Icon
                name="guerre"
                size={13}
                color={warReady ? gameColors.crew : colors.blanc}
              />
              <Text style={[styles.statusChipText, warReady && styles.statusChipTextWar]}>
                {t(CREW_STATUS_E[status])}
              </Text>
            </View>
            {/* Surface ≤ 3 infos (§A) : le chip (état) + l'ACTIVITÉ (X/Y actifs,
                le KPI qui domine) + la progression (jauge + XP). Niveau et rang
                ville passent en SECONDAIRE au tap — jamais perdus, jamais tronqués. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showHeaderDetail }}
              accessibilityLabel={t(C.headerDetailA11y)}
              hitSlop={6}
              onPress={() => {
                haptics.light();
                setShowHeaderDetail((v) => !v);
              }}
            >
              <Text style={styles.identityLine} numberOfLines={1}>
                {t(C.activesCount, { n: activeMembers, max: CREW_MAX_MEMBERS })}
              </Text>
            </Pressable>
            <View style={styles.headerGauge}>
              <ProgressBar value={levelProgress} height={7} />
            </View>
            {/* La LIGUE est déjà portée par le cadre du blason (leagueTier) —
                cette ligne ne garde que la progression liée à la jauge au-dessus,
                pour ne jamais tronquer (§9) ni répéter l'info du blason (§20). */}
            <Text style={styles.xpLine} numberOfLines={1}>
              {nextLevelXp !== null
                ? t(C.xpToNext, { xp: formatInt(nextLevelXp - MY_CREW.xp), lvl: level + 1 })
                : t(C.levelMax)}
            </Text>
            {/* SECONDAIRE (tap) : niveau + rang ville — détail, jamais imposé. */}
            {showHeaderDetail ? (
              <Text style={styles.headerDetailLine} numberOfLines={1}>
                {t(C.headerDetailLine, {
                  lvl: level,
                  rank: MY_CREW.localRank,
                  city: MY_CREW.city,
                })}
              </Text>
            ) : null}
          </View>
        </View>

        {/* AUCUN gros CTA ici : le geste du moment vit dans la carte MISSION
            en tête de la Base (unique CTA chartreuse du landing). Actions
            secondaires LÉGÈRES façon Strava (icône + label), jamais de card. */}
        <View style={styles.headerCta}>
          <View style={styles.headerActions}>
            <IconAction
              icon="ajoutami"
              label={t(C.inviteRunner)}
              onPress={() => {
                // Zéro-mensonge : on COPIE vraiment le lien (expo-clipboard/web),
                // avec repli sur la feuille de partage native. Le feedback reflète
                // ce qui s'est réellement passé (copié vs partagé vs affiché).
                const link = buildInviteLink(demoInviteToken(crewProfile.name));
                haptics.light();
                void copyInviteLink(link).then((res) =>
                  setNotice(
                    res.ok && res.via === 'clipboard'
                      ? t(C.inviteCopied, { link })
                      : res.ok
                        ? t(C.inviteShared, { link })
                        : t(C.inviteLinkIs, { link }),
                  ),
                );
              }}
            />
            {/* « Modifier le crew » (founder §8.1) → écran d'édition. */}
            {canEditCrew ? (
              <IconAction
                icon="reglages"
                label={t(C.editCrew)}
                onPress={() => {
                  haptics.light();
                  router.push('/crew-edit');
                }}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Onglets internes = UN segmented control (§4), 3 sections. Ton
          `surface` : le CTA chartreuse de la mission est le focus fort de la
          scène, donc l'onglet actif se relève en N2. Coffre à récupérer =
          pastille « • » sur Base (le coffre y vit) — doublée par le texte
          « À récupérer » de la tuile Coffre (jamais la couleur seule). ── */}
      <Segmented
        style={styles.hqSegmented}
        tone="surface"
        accessibilityLabel={t(C.crewSectionsA11y)}
        options={HQ_TABS.map((tabDef) => ({
          id: tabDef.key,
          label:
            tabDef.key === 'base' && chestClaimable
              ? `${t(tabDef.label)} •`
              : t(tabDef.label),
        }))}
        value={tab}
        onChange={setTab}
        scrollable
      />

      {/* Feedback des actions démo */}
      {notice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.closeNoticeA11y)}
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

      {/* ══ BASE — une seule colonne de priorité : (1) MISSION PRIORITAIRE
          (l'unique CTA chartreuse du landing) + lien gris Missions, (2) tuiles
          Territoire / Coffre / Membres / Perks (détail AU TAP, dans la Base),
          (3) AUJOURD'HUI en secondaire, (4) contribution/boost repliés. ══ */}
      {tab === 'base' ? (
        <>
          {/* ── LA décision de l'écran : défense urgente (urgentDefense). ── */}
          <UrgentMissionCard />
          {/* Lien discret (texte gris) vers toutes les missions — la War Room
              n'est plus le CTA héros, juste une navigation légère. D8 : hors
              MVP la route est masquée, le lien disparaît avec elle. */}
          {flags.warRoom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.allMissionsA11y)}
              hitSlop={8}
              onPress={() => router.navigate('/warroom')}
              style={({ pressed }) => [styles.missionsLink, pressed && styles.dim]}
            >
              <Text style={styles.missionsLinkText}>{t(C.allMissions)}</Text>
              <Icon name="chevron" size={14} color={colors.gris} />
            </Pressable>
          ) : null}

          <View style={styles.baseGrid}>
            {/* Territoire — le cœur du jeu : tap → détail secteur/frontières. */}
            <BaseCard
              icon="pin"
              tint={gameColors.crew}
              label={t(C.tileTerritory)}
              value={t(C.zonesCount, { n: formatInt(MY_CREW.territory.zonesHeld) })}
              sub={t(C.contestedBordersCount, { n: MY_CREW.territory.contestedBorders })}
              onPress={() => {
                haptics.light();
                setShowTerritory((v) => !v);
              }}
            />
            {/* Coffre — % hebdo + jauge ; tap → détail (paliers, contributions). */}
            <BaseCard
              icon="coffre"
              tint={chestClaimable ? gameColors.crew : gameColors.gold}
              label={t(C.tileChest)}
              value={`${Math.round(chestPct * 100)} %`}
              sub={
                chestClaimable
                  ? t(C.toClaim)
                  : nextChestTier
                    ? t(C.nextTierAt, { pct: Math.round(CREW_CHEST_TIERS[nextChestTier] * 100) })
                    : t(C.tierMaxReached)
              }
              progress={chestPct}
              onPress={() => {
                haptics.light();
                setShowCoffre((v) => !v);
              }}
            />
            {/* Membres — tap → onglet Membres (roster + sorties). */}
            <BaseCard
              icon="crew"
              label={t(C.tabMembers)}
              value={t(C.activesCount, { n: activeMembers, max: CREW_MAX_MEMBERS })}
              sub={t(C.openSpots, { n: MY_CREW.recruitSpots })}
              onPress={() => setTab('membres')}
            />
            {/* Perks — tap → détail (débloqués / prochain / à venir). */}
            <BaseCard
              icon="couronne"
              label={t(C.tilePerks)}
              value={t(C.unlockedCount, { n: unlockedPerks.length })}
              sub={nextPerk ? t(C.nextAtLevel, { n: nextPerk.level }) : t(C.allUnlocked)}
              onPress={() => {
                haptics.light();
                setShowPerks((v) => !v);
              }}
            />
          </View>

          {/* Détail Territoire (AMENDEMENT-11 §4) révélé au tap de la tuile. */}
          {showTerritory ? <TerritoryBlock /> : null}

          {/* ── Détail COFFRE (ex-onglet Coffre, fusionné ici) : ChestCard +
              paliers + contributions — révélé au tap de la tuile Coffre. ── */}
          {showCoffre ? (
            <>
              <SectionLabel>{t(C.weeklyChestKicker)}</SectionLabel>
              <ChestCard
                label={t(C.weeklyChestCard)}
                progress={chestPct}
                nextMilestone={
                  nextChestTier
                    ? t(C.nextTierLabel, {
                        tier: tierLabelFr(nextChestTier),
                        pct: Math.round(CREW_CHEST_TIERS[nextChestTier] * 100),
                      })
                    : t(C.tierMaxReached)
                }
                state={chestClaimable ? 'claimable' : 'inprogress'}
                onOpen={() => {
                  setChestOpened(true);
                  setNotice(
                    chest.tier
                      ? t(C.tierOpened, { tier: tierLabelFr(chest.tier) })
                      : null,
                  );
                }}
              />
              <Text style={styles.chestMeta}>
                {t(C.collectivePoints, {
                  a: formatInt(MY_CREW.chestProgress),
                  b: formatInt(CREW_CHEST_WEEKLY_TARGET),
                })}
              </Text>

              {chestOpened && chest.tier ? (
                <>
                  <SectionLabel>
                    {t(C.rewardsTierSection, { tier: tierLabelFr(chest.tier).toUpperCase() })}
                  </SectionLabel>
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
                <Text style={styles.tiersToggleText}>{t(C.chestTiers)}</Text>
                <Icon name="chevron" size={15} color={colors.gris} />
              </Pressable>
              {showTiers ? (
                <View style={styles.tiersCard}>
                  {CREW_CHEST_TIER_ORDER.map((tier) => {
                    const reached = chestPct >= CREW_CHEST_TIERS[tier];
                    return (
                      <View key={tier} style={styles.tierRow}>
                        <Icon
                          name={reached ? 'coffre' : 'verrou'}
                          size={15}
                          color={reached ? gameColors.gold : colors.gris}
                        />
                        <Text style={[styles.tierName, !reached && styles.dimText]}>
                          {tierLabelFr(tier)}
                        </Text>
                        <Text style={styles.tierPct}>
                          {Math.round(CREW_CHEST_TIERS[tier] * 100)} %
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <SectionLabel>{t(C.memberContribs)}</SectionLabel>
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

          {/* ── Détail PERKS (ex-onglet Perks, fusionné ici) : rappel anti
              pay-to-win + débloqués / prochain / à venir — révélé au tap. ── */}
          {showPerks ? (
            <>
              {/* Rappel anti pay-to-win STRICT (§52) : les perks sont statut/
                  orga/cosmétique — jamais territoire, points ni protection. */}
              <Text style={styles.perkNote}>{t(C.perkNote)}</Text>
              <SectionLabel>{t(C.perksUnlocked, { n: unlockedPerks.length })}</SectionLabel>
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
                  <SectionLabel>{t(C.nextPerkKicker)}</SectionLabel>
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
                  <SectionLabel>{t(C.upcomingKicker)}</SectionLabel>
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
                          stateLabel={t(C.levelN, { n: p.level })}
                        />
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {/* ── AUJOURD'HUI (AMENDEMENT-34) : colle quotidienne, 4 micro-actions
              SANS courir — en SECONDAIRE, après la mission et les chiffres clés
              (le signal avant le bruit). Anti-P2W strict. ── */}
          <DailyGlue glue={dailyGlue} onAction={onDailyAction} onBoost={onDailyBoost} />

          {/* ── SECONDAIRE : Contribution / Boost / Crew Wall (§28/§14), replié
              par défaut — jamais en premier (pas de monétisation trop visible). ── */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showContribution }}
            onPress={() => {
              haptics.light();
              setShowContribution((v) => !v);
            }}
            style={({ pressed }) => [styles.contribToggle, pressed && styles.dim]}
          >
            <Icon name="cadeau" size={16} color={boostActive ? gameColors.gold : colors.gris} />
            <Text style={styles.contribToggleText}>
              {t(C.contribToggle)} {boostActive ? t(C.activeSuffix) : ''}
            </Text>
            <Icon name="chevron" size={15} color={colors.gris} />
          </Pressable>

          {showContribution ? (
            <>
              {/* Boost actif (§13.1) : badge + timer + effet COFFRE uniquement. */}
              {boostActive ? (
                <View style={styles.boostCard}>
                  <View style={styles.boostIcon}>
                    <Icon name="cadeau" size={18} color={gameColors.gold} />
                  </View>
                  <View style={styles.boostBody}>
                    <View style={styles.boostTopRow}>
                      <Text style={styles.boostTitle}>{t(C.boostActiveTitle)}</Text>
                      <View style={styles.boostBonus}>
                        <Text style={styles.boostBonusText}>{BOOST_CHEST_BONUS_LABEL}</Text>
                      </View>
                    </View>
                    <Text style={styles.boostSub}>
                      {boost.by ? t(C.boostedBy, { name: boost.by }) : t(C.memberBoosted)} ·{' '}
                      <Text style={styles.boostTimer}>{formatBoostRemaining(boost, nowTick)}</Text>
                    </Text>
                    <Text style={styles.boostNote}>{t(C.boostNote)}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.contribCard}>
                <Text style={styles.contribLead}>{t(C.contribLead)}</Text>
                <Text style={styles.contribBody}>{t(C.contribBody)}</Text>
                <Text style={styles.contribStrong}>{t(C.contribStrong)}</Text>

                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: wallOptIn }}
                  onPress={() => {
                    haptics.light();
                    setWallOptIn((v) => !v);
                  }}
                  style={styles.wallToggle}
                >
                  <View style={[styles.wallCheckbox, wallOptIn && styles.wallCheckboxOn]}>
                    {wallOptIn ? <View style={styles.wallCheckDot} /> : null}
                  </View>
                  <View style={styles.wallToggleText}>
                    <Text style={styles.wallToggleLabel}>{t(C.showWall)}</Text>
                    <Text style={styles.wallToggleSub}>{t(C.wallSub)}</Text>
                  </View>
                </Pressable>

                {wallOptIn ? (
                  <View style={styles.wall}>
                    <Text style={styles.wallTitle}>{t(C.wallTitle)}</Text>
                    {INITIAL_CREW_WALL.map((entry) => (
                      <View
                        key={`${entry.supporter ?? 'anon'}-${entry.contribution}`}
                        style={styles.wallRow}
                      >
                        <Text style={styles.wallSupporter} numberOfLines={1}>
                          {supporterLabel(entry)}
                        </Text>
                        <Text style={styles.wallContribution} numberOfLines={1}>
                          {entry.contribution}
                        </Text>
                      </View>
                    ))}
                    <Text style={styles.wallFootnote}>{t(C.wallFootnote)}</Text>
                  </View>
                ) : null}

                {flags.arsenal ? (
                  <GhostButton
                    label={t(C.seeArsenal)}
                    icon="boutique"
                    onPress={() => router.push('/arsenal')}
                  />
                ) : null}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      {/* ══ MEMBRES : MemberCard + sheet d'actions (doc §12) + section SORTIES
          (AMENDEMENT-32 §1, fusionnée ici — les sorties sont l'affaire des
          membres). 1 SEUL CTA plein de la scène : « Créer une sortie ». ══ */}
      {tab === 'membres' ? (
        <>
          <SectionLabel>
            {t(C.membersCount, { n: activeMembers, max: CREW_MAX_MEMBERS })}
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

          {/* ── SORTIES à venir : titre + heure + lieu de RDV + zone cible
              défense/conquête + RSVP chips (persisté). SOCIAL, zéro effet de
              jeu — courir ensemble = coordination + densité (le moat). ── */}
          <SectionLabel>{t(C.outingsUpcoming, { n: crewOutings.outings.length })}</SectionLabel>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.createOutingA11y)}
            onPress={() => {
              haptics.light();
              setOutingSheet(true);
            }}
            style={({ pressed }) => [styles.outingCreateBtn, pressed && styles.dim]}
          >
            <Icon name="plus" size={18} color={colors.noir} />
            <Text style={styles.outingCreateLabel}>{t(C.createOuting)}</Text>
          </Pressable>

          <View style={styles.outingList}>
            {crewOutings.outings.map((o) => (
              <SortieCard key={o.id} outing={o} onRsvp={onOutingRsvp} />
            ))}
          </View>

          <Text style={styles.outingNote}>{t(C.outingNote)}</Text>
        </>
      ) : null}

      {/* ══ CHAT ACTIONNABLE (AMENDEMENT-18 A.2) : le chat n'est PAS un WhatsApp,
          c'est le CENTRE D'ACTION du crew. 3 sections — À FAIRE (ouverte, en
          haut), MESSAGES (fil humain, secondaire), LOG (War Log compressé) —
          + filtres Tout/Demandes/Missions/Dons/Résultats. Anti-scroll : 2 cartes
          visibles par section + « Voir tout ». ══ */}
      {tab === 'chat' ? (
        <>
          {/* Filtres = UN segmented scrollable (§4) — plus de N chips séparées.
              Ton `surface` : « Demander » (chartreuse) est le focus fort de la scène. */}
          <Segmented
            style={styles.chatFilters}
            tone="surface"
            accessibilityLabel={t(C.filterChatA11y)}
            options={CHAT_FILTERS.map((f) => ({ id: f.key, label: t(f.label) }))}
            value={chatFilter}
            onChange={setChatFilter}
            scrollable
          />

          {/* ── DEMANDER / OFFRIR (A.3) : en tête du chat actionnable. « Demander
              de l'aide » (unique CTA chartreuse de la scène) ouvre la feuille de
              choix → carte requête. « Offrir au crew » (cadeau premium) reste un
              LIEN LÉGER en dessous — donner de l'argent n'a jamais le même poids
              visuel que demander de l'aide (anti-P2W, §A.19). ── */}
          <View style={styles.askRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.askHelpA11y)}
              onPress={() => {
                haptics.light();
                setAskSheet(true);
              }}
              style={({ pressed }) => [styles.askBtn, pressed && styles.dim]}
            >
              <Icon name="ajoutami" size={16} color={colors.noir} />
              <Text style={styles.askBtnLabel}>{t(C.askHelp)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.offerToCrewA11y)}
              hitSlop={6}
              onPress={() => {
                haptics.light();
                setGiftSheet(true);
              }}
              style={({ pressed }) => [styles.offerLink, pressed && styles.dim]}
            >
              <Icon name="cadeau" size={14} color={gameColors.gold} />
              <Text style={styles.offerLinkLabel}>{t(C.offerToCrew)}</Text>
            </Pressable>
          </View>

          {/* ── SECTION 1 · À FAIRE (prioritaire, ouverte) : carte BONUS ciblée
              (AMENDEMENT-19 §4, en tête) + cartes d'action ── */}
          {showBonusCard || visibleActions.length > 0 ? (
            <View style={styles.chatSection}>
              <SectionHead
                label={t(C.sectionTodo)}
                count={visibleActions.length + (showBonusCard ? 1 : 0)}
                showAll={showAllActions}
                onToggle={() => {
                  haptics.light();
                  setShowAllActions((v) => !v);
                }}
              />
              <View style={styles.actionList}>
                {/* GRYD révèle le bon moment : 1 SEUL bonus principal, en tête. */}
                {showBonusCard && chatBonusCard ? (
                  <BonusActionCard card={chatBonusCard} onCta={onBonusCta} />
                ) : null}
                {(showAllActions ? visibleActions : visibleActions.slice(0, 2)).map((card) => (
                  <ActionCard key={card.id} card={card} onCta={onActionCta} />
                ))}
              </View>
            </View>
          ) : null}

          {/* ── SECTION 2 · MESSAGES (fil humain, secondaire) + composer ── */}
          {showMessages ? (
            <View style={styles.chatSection}>
              <Text style={styles.chatSectionLabel}>{t(C.sectionMessages)}</Text>
              <View style={styles.thread}>
                {/* Filtre d'affichage (§1) : les messages d'un membre BLOQUÉ ne
                    sont jamais rendus. La liste bloquée vient du store persisté. */}
                {chat.messages
                  .filter((m) => m.me || !isBlocked(m.author))
                  .map((m) => (
                    <ChatBubble
                      key={m.id}
                      msg={m}
                      rsvp={rsvp}
                      setRsvp={setRsvp}
                      onReport={openReportMessage}
                    />
                  ))}
              </View>
              {/* Accès permanent au cadre communautaire + gestion des bloqués. */}
              <View style={styles.moderationBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.codeOfConductA11y)}
                  onPress={() => {
                    haptics.light();
                    router.push('/code-conduite');
                  }}
                  style={({ pressed }) => [styles.moderationLink, pressed && styles.dim]}
                >
                  <Icon name="bouclier" size={14} color={colors.gris} />
                  <Text style={styles.moderationLinkText}>{t(C.codeOfConduct)}</Text>
                </Pressable>
                {moderation.blocked.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(C.manageBlockedA11y, { n: moderation.blocked.length })}
                    onPress={() => {
                      haptics.light();
                      setBlockedSheet(true);
                    }}
                    style={({ pressed }) => [styles.moderationLink, pressed && styles.dim]}
                  >
                    <Icon name="verrou" size={14} color={colors.gris} />
                    <Text style={styles.moderationLinkText}>
                      {t(C.blockedCount, { n: moderation.blocked.length })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* BARRE DE SAISIE — évidente, en bas du fil : où taper + Envoyer. */}
              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t(C.composerPh)}
                  placeholderTextColor={colors.gris}
                  style={styles.composerInput}
                  multiline
                  maxLength={280}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  returnKeyType="send"
                  accessibilityLabel={t(C.composerA11y)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.sendMessageA11y)}
                  accessibilityState={{ disabled: !canSend }}
                  disabled={!canSend}
                  onPress={sendMessage}
                  style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnIdle]}
                >
                  <Icon name="partage" size={18} color={canSend ? gameColors.crew : colors.gris} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* ── SECTION · DONS : cadeaux premium réclamables + dons gratuits
              (route/scout/segment/défense) + Merci/Respect/Bien joué ── */}
          {visibleGifts.length > 0 || visibleCadeaux.length > 0 ? (
            <View style={styles.chatSection}>
              <Text style={styles.chatSectionLabel}>{t(C.sectionGifts)}</Text>
              <View style={styles.actionList}>
                {/* Cadeaux premium offerts (réclamables) EN TÊTE — les plus récents. */}
                {visibleCadeaux.map((gift) => (
                  <CadeauCrewCard
                    key={gift.id}
                    gift={gift}
                    now={nowTick}
                    onClaim={onClaimGift}
                  />
                ))}
                {visibleGifts.map((gift) => (
                  <GiftCard key={gift.id} gift={gift} onCta={onGiftCta} />
                ))}
              </View>
            </View>
          ) : null}

          {/* ── SECTION 3 · RÉSULTATS (War Log compressé) : 2 visibles + Voir tout ── */}
          {showLog ? (
            <View style={styles.chatSection}>
              <SectionHead
                label={t(C.sectionResults)}
                count={warLogEvents.length}
                showAll={showAllLog}
                onToggle={() => {
                  haptics.light();
                  setShowAllLog((v) => !v);
                }}
              />
              {(showAllLog ? warLogEvents : warLogEvents.slice(0, 2)).map((item) =>
                item.kind === 'event' ? (
                  <View key={item.id} style={styles.feedItem}>
                    {isConquestEvent(item.type) ? (
                      // Conquête d'un coéquipier → kudos GRYD persistés dans la
                      // carte (Respect · Feu · Défends-la), pas de barre générique.
                      <ConquestEventCard item={item} />
                    ) : (
                      <>
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
                      </>
                    )}
                  </View>
                ) : null,
              )}
            </View>
          ) : null}

          <Text style={styles.chatNote}>{t(C.chatNote)}</Text>
        </>
      ) : null}

      {/* Accès Crew Discovery (§46) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.exploreOtherCrews)}
        onPress={() => router.push('/crew-discovery')}
        style={({ pressed }) => [styles.discoveryLink, pressed && styles.dim]}
      >
        <Icon name="crew" size={18} color={colors.blanc} />
        <Text style={styles.discoveryText}>{t(C.exploreOtherCrews)}</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>

      {/* ── Feuille « Demander » (A.3) : 6 choix → carte requête ── */}
      <Modal
        visible={askSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setAskSheet(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.close)}
            style={styles.sheetBackdrop}
            onPress={() => setAskSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetName}>{t(C.askSheetTitle)}</Text>
            <Text style={styles.sheetRole}>{t(C.askSheetSub)}</Text>
            {REQUEST_CHOICES.map((choice) => (
              <Pressable
                key={choice.key}
                accessibilityRole="button"
                accessibilityLabel={t(choice.label)}
                onPress={() => onAskChoice(choice.key)}
                style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
              >
                <Icon
                  name={
                    choice.key === 'defense'
                      ? 'bouclier'
                      : choice.key === 'finish'
                        ? 'avantposte'
                        : choice.key === 'route'
                          ? 'route'
                          : choice.key === 'scout'
                            ? 'scout'
                            : choice.key === 'outing'
                              ? 'crew'
                              : 'cadeau'
                  }
                  size={18}
                  color={choice.key === 'boost' ? gameColors.gold : colors.blanc}
                />
                <View style={styles.sheetChoiceText}>
                  <Text style={styles.sheetActionLabel}>{t(choice.label)}</Text>
                  <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                    {t(choice.hint)}
                  </Text>
                </View>
                <Icon name="chevron" size={15} color={colors.gris} />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Feuille « Offrir au crew » (A.3, gifting premium) : Boost / Coffre ── */}
      <Modal
        visible={giftSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setGiftSheet(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.close)}
            style={styles.sheetBackdrop}
            onPress={() => setGiftSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetName}>{t(C.offerToCrew)}</Text>
            <Text style={styles.sheetRole}>
              {t(C.giftSheetSub, { c: CREW_GIFT_CLAIMS_PER_MEMBER, h: CREW_GIFT_EXPIRY_H })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.offerBoostA11y)}
              onPress={() => onOfferGift('boost', false)}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
            >
              <Icon name="cadeau" size={18} color={gameColors.gold} />
              <View style={styles.sheetChoiceText}>
                <Text style={styles.sheetActionLabel}>{t(C.boostCrew24)}</Text>
                <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                  {t(C.boostHint)}
                </Text>
              </View>
              <Icon name="chevron" size={15} color={colors.gris} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.offerChestA11y)}
              onPress={() => onOfferGift('chest', false)}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
            >
              <Icon name="coffre" size={18} color={gameColors.gold} />
              <View style={styles.sheetChoiceText}>
                <Text style={styles.sheetActionLabel}>{t(C.cosmeticChest)}</Text>
                <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                  {t(C.chestHint, { n: 5 })}
                </Text>
              </View>
              <Icon name="chevron" size={15} color={colors.gris} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.offerChestAnonA11y)}
              onPress={() => onOfferGift('chest', true)}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
            >
              <Icon name="verrou" size={18} color={colors.blanc} />
              <View style={styles.sheetChoiceText}>
                <Text style={styles.sheetActionLabel}>{t(C.chestAnon)}</Text>
                <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                  {t(C.chestAnonHint)}
                </Text>
              </View>
              <Icon name="chevron" size={15} color={colors.gris} />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Form « Créer une sortie » (AMENDEMENT-32 §1) : titre + heure + lieu de
          RDV + zone cible + objectif défense/conquête. Court, 1 seul CTA plein.
          SOCIAL — aucune sortie ne donne de territoire ni de point (§A.19). ── */}
      <Modal
        visible={outingSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setOutingSheet(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setOutingSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetName}>Créer une sortie</Text>
            <Text style={styles.sheetRole}>
              Courir ensemble · aucune sortie ne donne de points ni de zones.
            </Text>

            <Text style={styles.outingFieldLabel}>Titre</Text>
            <TextInput
              value={outingTitle}
              onChangeText={setOutingTitle}
              placeholder="Défense République"
              placeholderTextColor={colors.gris}
              style={styles.outingInput}
              maxLength={40}
              returnKeyType="next"
              accessibilityLabel="Titre de la sortie"
            />

            <Text style={styles.outingFieldLabel}>Heure</Text>
            <TextInput
              value={outingWhen}
              onChangeText={setOutingWhen}
              placeholder="Ce soir · 19:00"
              placeholderTextColor={colors.gris}
              style={styles.outingInput}
              maxLength={40}
              returnKeyType="next"
              accessibilityLabel="Heure de la sortie"
            />

            <Text style={styles.outingFieldLabel}>Lieu de rendez-vous</Text>
            <TextInput
              value={outingPlace}
              onChangeText={setOutingPlace}
              placeholder="Métro République, sortie Magenta"
              placeholderTextColor={colors.gris}
              style={styles.outingInput}
              maxLength={60}
              returnKeyType="next"
              accessibilityLabel="Lieu de rendez-vous"
            />

            <Text style={styles.outingFieldLabel}>Zone cible</Text>
            <TextInput
              value={outingZone}
              onChangeText={setOutingZone}
              placeholder="République"
              placeholderTextColor={colors.gris}
              style={styles.outingInput}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={submitOuting}
              accessibilityLabel="Zone cible de la sortie"
            />

            {/* Objectif : Défense / Conquête — 2 chips exclusifs (pas de « GO »). */}
            <Text style={styles.outingFieldLabel}>Objectif</Text>
            <View style={styles.outingObjRow}>
              {(['defense', 'conquete'] as const).map((obj) => {
                const selected = outingObjective === obj;
                const m = OUTING_OBJECTIVE_META[obj];
                return (
                  <Pressable
                    key={obj}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(objectiveLabel(obj))}
                    onPress={() => {
                      haptics.light();
                      setOutingObjective(obj);
                    }}
                    style={[
                      styles.outingObjChip,
                      selected && { borderColor: m.tint },
                    ]}
                  >
                    <Icon name={m.icon} size={16} color={selected ? m.tint : colors.gris} />
                    <Text
                      style={[
                        styles.outingObjLabel,
                        selected && { color: m.tint },
                      ]}
                    >
                      {t(objectiveLabel(obj))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Publier la sortie au crew"
              accessibilityState={{ disabled: !outingReady }}
              disabled={!outingReady}
              onPress={submitOuting}
              style={({ pressed }) => [
                styles.outingSubmit,
                outingReady ? styles.outingSubmitActive : styles.outingSubmitIdle,
                pressed && outingReady && styles.dim,
              ]}
            >
              <Text
                style={[
                  styles.outingSubmitLabel,
                  outingReady && styles.outingSubmitLabelActive,
                ]}
              >
                Publier la sortie
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
                {t(CREW_ROLE_E[memberCardRole(memberSheet.role)])}
                {/* Rookie : jours d'essai restants (§8.7, ROOKIE_TRIAL_DAYS). */}
                {memberSheet.role === 'rookie'
                  ? ` · essai — ${rookieTrialDaysLeft(memberSheet.joinedDaysAgo ?? 0)} j restants`
                  : ''}{' '}
                · {formatInt(memberSheet.weekHexes)} pts cette semaine
              </Text>
              {/* Actions filtrées par MON rôle (matrice §8) — gating visuel,
                  le serveur reste seul juge. Promouvoir : jamais sur le founder. */}
              {(
                [
                  {
                    key: 'mission',
                    entry: C.actionAssignMission,
                    icon: 'mission',
                    can: roleCan(myRole, 'assignObjectives'),
                  },
                  {
                    key: 'outing',
                    entry: C.actionInviteOuting,
                    icon: 'ami',
                    can: roleCan(myRole, 'createOuting'),
                  },
                  {
                    key: 'promote',
                    entry: C.actionPromote,
                    icon: 'couronne',
                    can: roleCan(myRole, 'promote') && memberSheet.role !== 'founder',
                  },
                  { key: 'profil', entry: C.actionViewProfile, icon: 'profil', can: true },
                ] as const
              )
                .filter((a) => a.can)
                .map((a) => (
                  <Pressable
                    key={a.key}
                    accessibilityRole="button"
                    // La clé pilote le comportement, le libellé TRADUIT part dans
                    // le toast de confirmation (memberActionSent).
                    onPress={() => memberAction(a.key, t(a.entry), memberSheet)}
                    style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
                  >
                    <Icon name={a.icon} size={18} color={colors.blanc} />
                    <Text style={styles.sheetActionLabel}>{t(a.entry)}</Text>
                    <Icon name="chevron" size={15} color={colors.gris} />
                  </Pressable>
                ))}

              {/* ── MODÉRATION (App Store 1.2) — jamais sur soi-même ── */}
              {!memberSheet.me ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Signaler ${memberSheet.pseudo}`}
                    onPress={() => openReportMember(memberSheet)}
                    style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
                  >
                    <Icon name="alerte" size={18} color={colors.blanc} />
                    <Text style={styles.sheetActionLabel}>Signaler ce membre</Text>
                    <Icon name="chevron" size={15} color={colors.gris} />
                  </Pressable>
                  {isBlocked(memberSheet.pseudo) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Débloquer ${memberSheet.pseudo}`}
                      onPress={() => {
                        const p = memberSheet.pseudo;
                        setMemberSheet(null);
                        onUnblockMember(p);
                      }}
                      style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
                    >
                      <Icon name="verrou" size={18} color={colors.blanc} />
                      <Text style={styles.sheetActionLabel}>Débloquer ce membre</Text>
                      <Icon name="chevron" size={15} color={colors.gris} />
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Bloquer ${memberSheet.pseudo}`}
                      onPress={() => onBlockMember(memberSheet)}
                      style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
                    >
                      <Icon name="verrou" size={18} color={gameColors.danger} />
                      <Text style={[styles.sheetActionLabel, { color: gameColors.danger }]}>
                        Bloquer ce membre
                      </Text>
                      <Icon name="chevron" size={15} color={colors.gris} />
                    </Pressable>
                  )}
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ── Feuille « Signaler » (App Store 1.2) : motifs courts → signalement
          persisté + toast « examiné sous 24 h ». Message OU membre. ── */}
      <Modal
        visible={reportTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setReportTarget(null)}
          />
          {reportTarget ? (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetName}>
                {reportTarget.kind === 'message'
                  ? 'Signaler ce message'
                  : `Signaler ${reportTarget.author}`}
              </Text>
              <Text style={styles.sheetRole}>
                Choisis un motif. Une personne l’examine sous {REPORT_REVIEW_HOURS} h. Le
                signalement reste confidentiel.
              </Text>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r.key}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  onPress={() => onReportReason(r.key)}
                  style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
                >
                  <Icon
                    name={r.key === 'spam' ? 'cloche' : r.key === 'autre' ? 'info' : 'alerte'}
                    size={18}
                    color={r.key === 'haine' || r.key === 'harcelement' ? gameColors.danger : colors.blanc}
                  />
                  <View style={styles.sheetChoiceText}>
                    <Text style={styles.sheetActionLabel}>{r.label}</Text>
                    <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                      {r.hint}
                    </Text>
                  </View>
                  <Icon name="chevron" size={15} color={colors.gris} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ── Feuille « Membres bloqués » : liste + Débloquer (App Store 1.2) ── */}
      <Modal
        visible={blockedSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockedSheet(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setBlockedSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetName}>Membres bloqués</Text>
            <Text style={styles.sheetRole}>
              Leurs messages te sont masqués. Débloque quand tu veux.
            </Text>
            {moderation.blocked.length === 0 ? (
              <Text style={styles.blockedEmpty}>Personne n’est bloqué.</Text>
            ) : (
              moderation.blocked.map((pseudo) => (
                <View key={pseudo} style={styles.sheetAction}>
                  <Icon name="verrou" size={18} color={colors.gris} />
                  <Text style={styles.sheetActionLabel} numberOfLines={1}>
                    {pseudo}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Débloquer ${pseudo}`}
                    hitSlop={8}
                    onPress={() => onUnblockMember(pseudo)}
                    style={({ pressed }) => [styles.unblockBtn, pressed && styles.dim]}
                  >
                    <Text style={styles.unblockBtnText}>Débloquer</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
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
    marginTop: spacing.xl,
    marginBottom: 12,
  },
  // ── AUJOURD'HUI (colle quotidienne) : UNE surface N1 de section (§A.3, une
  // seule couche de container), posée en tête de la Base. Les 4 lignes sont des
  // surfaces N2 côte à côte — jamais de card-dans-card. ──
  glueSection: {
    marginTop: 20,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 10,
  },
  glueHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glueKicker: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  glueProgress: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  glueLead: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 18 },
  // Ligne d'action : icône teintée + texte + état, sur une surface N2 (raised).
  glueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  glueIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glueBody: { flex: 1, gap: 2 },
  glueLabel: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // « Fait » : le libellé se pose en gris doux — jamais barré, reste lisible.
  glueLabelDone: { color: colors.gris },
  glueSub: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 15 },
  // Chip d'état « Fait · +5 XP » (chartreuse discret) — statut social, pas un gain.
  glueDone: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  glueDoneLabel: {
    color: gameColors.crew,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  glueNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 15, marginTop: 2 },
  // ── MISSION PRIORITAIRE (tête de la Base) : surface N1 + liseré violet
  //    contesté = état de jeu « sous pression » (pas une déco). 3 infos max
  //    (secteur · rues · heures) + l'unique CTA chartreuse du landing. ──
  missionCard: {
    marginTop: 18,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.contested,
    padding: spacing.cardPadding,
    gap: 8,
  },
  missionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missionKicker: {
    flex: 1,
    color: gameColors.contested,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  missionHours: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  missionSector: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  missionMeta: { color: colors.gris, fontSize: fontSizes.xs, marginBottom: 4 },
  // Lien discret « Toutes les missions du crew » (War Room) — texte gris,
  // navigation légère, jamais un 2ᵉ CTA.
  missionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  missionsLinkText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Header base : LA surface N1 de la section (pose sur le fond, sans cadre). ──
  headerCard: {
    marginTop: 20,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerInfo: { flex: 1 },
  // Statut = pill N2 SANS contour ; « Prêt guerre » = état N3 (filet chartreuse).
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusChipWar: { borderWidth: 1, borderColor: borderState.activeSoft },
  statusChipText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  statusChipTextWar: { color: gameColors.crew },
  // Ligne d'identité forte : niveau · rang ville · membres actifs (§1.3).
  identityLine: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: fontSizes.md * 1.3,
    marginTop: 10,
  },
  headerGauge: { marginTop: 10 },
  xpLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 7,
    fontVariant: ['tabular-nums'],
  },
  // Détail header révélé au tap (niveau + rang ville) — secondaire, gris.
  headerDetailLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 6,
  },
  // Gros CTA + rangée d'actions légères, séparés du bloc identité par un filet
  // discret (séparateur, PAS un cadre de card).
  headerCta: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    gap: 14,
  },
  // Rangée d'IconAction (Inviter · Modifier) répartie, façon Strava.
  headerActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxl },
  // ── Segmented HQ (primitive) : posé sur le fond, respire au-dessus de la Base. ──
  hqSegmented: { marginTop: 16 },
  // ── Notice (feedback démo) : toast N2 relevé, sans contour permanent. ──
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  noticeText: { flex: 1, color: colors.blanc, fontSize: fontSizes.xs, lineHeight: 16 },
  // ── Base : 4 tuiles courtes posées sur le fond (surfaces N1, sans cadre). ──
  baseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  baseCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
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
  baseCardSub: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },
  // ── Bascule Contribution & boost (secondaire, repliée) : détail AU TAP (§6).
  //    Rangée légère séparée par l'ESPACE + un filet, pas une card cadrée. ──
  contribToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  contribToggleText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── Crew Boost actif (AMENDEMENT-16 §13.1) : surface N1, liseré or = STATUT (N3). ──
  boostCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.gold,
    padding: 14,
    marginTop: 12,
  },
  boostIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  boostBody: { flex: 1, gap: spacing.xxs },
  boostTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boostTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '800' },
  boostBonus: {
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  boostBonusText: { color: gameColors.gold, fontSize: fontSizes.xs, fontWeight: '800' },
  boostSub: { color: colors.gris, fontSize: fontSizes.xs },
  boostTimer: { color: colors.blanc, fontWeight: '700', fontVariant: ['tabular-nums'] },
  boostNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16, marginTop: 1 },
  // ── Contribution + Crew Wall (§14/§28) : surface N1 unique, sans cadre. ──
  contribCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 16,
    marginTop: 16,
    gap: 6,
  },
  contribLead: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  contribBody: { color: colors.blanc, fontSize: fontSizes.sm },
  contribStrong: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  wallToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 6 },
  wallCheckbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: borderState.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  // Coché = état N3 (chartreuse plein, puce noire — jamais chartreuse sur clair).
  wallCheckboxOn: { backgroundColor: borderState.active, borderColor: borderState.active },
  wallCheckDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.noir },
  wallToggleText: { flex: 1 },
  wallToggleLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  wallToggleSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, lineHeight: 16 },
  // Wall = section À PLAT dans la surface Contribution (N1) : jamais de
  // card-dans-card (§A) — un séparateur hairline sépare, pas un second cadre.
  wall: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    gap: 8,
  },
  wallTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  wallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  wallSupporter: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', flexShrink: 1 },
  wallContribution: { color: colors.gris, fontSize: fontSizes.xs, flexShrink: 1, textAlign: 'right' },
  wallFootnote: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  // ── TERRITOIRE CREW (AMENDEMENT-11 §4) : détail au tap = surface N1 posée. ──
  territoryCard: {
    marginTop: 14,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
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
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  territoryValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  territoryStatLabel: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
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
  // Paliers = détail AU TAP (§6) : rangée légère séparée par un filet, pas une card.
  tiersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  tiersToggleText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  tiersCard: {
    marginTop: 8,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
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
  perkNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    marginBottom: 14,
  },
  // ── Chat actionnable (A.2) : filtres = Segmented scrollable (§4). ──
  chatFilters: { marginTop: 18 },
  // ── Chat actionnable : sections À FAIRE / MESSAGES / DONS / LOG ──
  chatSection: { marginTop: 22 },
  chatSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chatSectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12,
  },
  // « Voir tout » = action légère : pill N2 relevé, sans contour (hitSlop en
  // JSX pour garder la cible tactile ≥ 44 px).
  seeAllBtn: {
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  seeAllLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Carte d'action « À FAIRE » : surface N1 (sans cadre) + 1 CTA plein. ──
  actionList: { gap: 10 },
  actionCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 14,
    gap: 12,
  },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Pastille icône relevée (N2) : le liseré teinté = la FAMILLE de jeu (état), pas déco.
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  actionBody: { flex: 1, gap: spacing.xxs },
  actionTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionZone: { color: colors.gris, fontSize: fontSizes.xs },
  // CTA de carte = pill N2 relevé, verbe précis jamais tronqué. Un seul CTA
  // chartreuse plein par scène (§A.4) : dans le Chat c'est « Demander de
  // l'aide » — les cartes gardent un bouton clair mais en poids secondaire.
  actionCta: {
    minHeight: sizes.touchTarget,
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCtaLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // ── Carte BONUS (AMENDEMENT-19 §4) : liseré teinté par famille + effet promis
  //    en pastille. Même gabarit qu'actionCard — 1 seul bonus principal. ──
  bonusCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  bonusTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bonusEffectPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bonusEffect: { fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 0.2 },
  // ── Carte de DON (A.4) : kicker + effet + réactions Merci/Respect/Bien joué ──
  // Don = surface N1 ; liseré or = STATUT « cadeau » (état N3), pas déco.
  giftCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.gold,
    padding: 14,
    gap: 8,
  },
  giftHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  giftIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: gameColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  giftKicker: {
    flex: 1,
    color: gameColors.gold,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  giftMessage: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  giftBy: { fontWeight: '800' },
  giftEffect: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5 },
  giftReactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  // Réaction = pill N2 sans contour ; sélection (« mine ») = état N3 chartreuse.
  giftReact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: elevation.raised,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  giftReactMine: { borderColor: borderState.active },
  giftReactLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  giftReactLabelMine: { color: gameColors.crew },
  giftReactCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  giftThanks: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600', marginTop: 2 },
  // « Voir » = action légère : pill N2 relevé, sans contour (contour = état).
  giftCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    paddingVertical: 10,
  },
  giftCtaLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Demander / Offrir (A.3) — en tête du chat actionnable. « Demander de
  // l'aide » = l'unique CTA chartreuse plein de la scène ; « Offrir au crew »
  // = LIEN léger dessous (la contribution payante n'est jamais mise en avant). ──
  askRow: { marginTop: 18, gap: 4 },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: sizes.touchTarget,
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
  },
  // Libellé NOIR sur chartreuse (contraste charte, jamais l'inverse).
  askBtnLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.3 },
  offerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
  },
  offerLinkLabel: { color: gameColors.gold, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Carte CADEAU CREW (A.3, gifting premium réclamable) ──
  // Cadeau premium = surface N1 ; liseré or = STATUT « cadeau » (état N3).
  cadeauCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.gold,
    padding: 14,
    gap: 8,
  },
  cadeauHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cadeauIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: gameColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  cadeauKicker: {
    flex: 1,
    color: gameColors.gold,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cadeauWindow: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cadeauMessage: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  cadeauMeta: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  cadeauCta: {
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cadeauCtaActive: { backgroundColor: gameColors.gold },
  cadeauCtaIdle: {
    backgroundColor: elevation.raised,
  },
  cadeauCtaLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.3 },
  cadeauCtaLabelActive: { color: colors.noir },
  // ── Feuille de choix (Demander / Offrir) : texte à 2 lignes par option ──
  sheetChoiceText: { flex: 1 },
  sheetChoiceHint: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  // ── Chat : fil de discussion (bulles) ──
  thread: { marginTop: 4, gap: 12 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingRight: 32 },
  bubbleRowMe: { alignItems: 'flex-end', paddingLeft: 40 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: elevation.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  avatarText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '800' },
  bubbleCol: { flex: 1, gap: 4 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubbleAuthor: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  bubbleTime: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  // « … » de signalement collé à la fin de l'en-tête (App Store 1.2).
  bubbleMore: { marginLeft: 'auto', paddingHorizontal: 4 },
  bubbleMoreDots: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 1 },
  // Message masqué par le filtre de mots : texte grisé, neutre (anti-shame).
  bubbleMasked: { color: colors.gris, fontStyle: 'italic' },
  // ── Barre de modération sous le fil : liens discrets (§A, ton calme). ──
  moderationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  // Liens de modération : padding vertical généreux → cible tactile ≥ 44 px.
  moderationLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.touchTarget, paddingVertical: 12 },
  moderationLinkText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  blockedEmpty: { color: colors.gris, fontSize: fontSizes.sm, paddingVertical: 16 },
  unblockBtn: {
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unblockBtnText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },
  bubble: {
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  // Bulle = vraie preview de contenu (le message EST le container) : surface N1
  // sans cadre. Ma bulle (chartreuse discret) reste le seul contraste d'état.
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: elevation.surface,
    borderTopLeftRadius: 4,
  },
  // MOI : chartreuse DISCRET (remplissage 14 %, contour 40 %) — jamais plein.
  bubbleMe: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    backgroundColor: colors.chartreuse14,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    borderTopRightRadius: 4,
  },
  bubbleText: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  // Texte BLANC sur fond chartreuse discret (14 % = fond sombre → contraste OK).
  bubbleTextMe: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  bubbleTimeMe: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 4,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  // ── Chat : barre de saisie persistante ──
  // Composer = surface N1 du fil (input relevé à l'intérieur), sans cadre.
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 16,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 8,
  },
  composerInput: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.35,
    maxHeight: 110,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Actif = variante CONTOUR chartreuse (pas plein) : « Demander de l'aide »
  // reste l'UNIQUE bloc chartreuse plein de la scène Chat (charte : 1 seul).
  sendBtnActive: {
    backgroundColor: elevation.raised,
    borderWidth: 1.5,
    borderColor: gameColors.crew,
  },
  sendBtnIdle: { backgroundColor: elevation.raised },
  // ── War Log ──
  feedItem: { marginBottom: 12 },
  feedReactions: { paddingHorizontal: 4 },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  // Choix RSVP = pills N2 relevés sans contour ; sélection/engagement = état N3.
  rsvpChip: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: elevation.raised,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  rsvpChipSelected: { borderColor: colors.blanc },
  rsvpChipEngaged: { backgroundColor: gameColors.crew, borderColor: gameColors.crew },
  rsvpLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  rsvpLabelSelected: { color: colors.blanc },
  // Libellé noir sur chartreuse (contraste charte — jamais l'inverse).
  rsvpLabelEngaged: { color: colors.noir },
  rsvpDone: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 8 },
  // « Ouvrir la carte » = action légère : pill N2 relevé, sans contour.
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
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
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginTop: spacing.xl,
  },
  discoveryText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── Sheet membre ──
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimStrong, // voile noir charte (token)
  },
  // Bottom sheet = surface N1 qui flotte sur le voile ; pas de cadre.
  sheet: {
    backgroundColor: elevation.surface,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: borderState.hairline,
    marginBottom: 14,
  },
  sheetName: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.3 },
  sheetRole: { color: colors.gris, fontSize: fontSizes.xs, marginTop: spacing.xxs, marginBottom: 12 },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  sheetActionLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── état vide (sans crew) : surface N1 posée sur le fond, sans cadre. ──
  emptyCard: {
    marginTop: 22,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
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
  // ── Sorties (AMENDEMENT-32 §1) ──
  // UN SEUL gros CTA de la scène : créer une sortie (chartreuse, noir dessus).
  outingCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: sizes.touchTarget,
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    marginBottom: 4,
  },
  outingCreateLabel: {
    color: colors.noir,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  outingList: { marginTop: 14, gap: 12 },
  // Carte sortie = surface N1 unique (pas de card-dans-card), sections par l'espace.
  outingCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 14,
    gap: 8,
  },
  outingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outingIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  outingHeadText: { flex: 1, gap: 2 },
  outingTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  outingObjective: { fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.3 },
  outingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outingMeta: { flex: 1, color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.35 },
  outingDensity: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  // RSVP = chips (§A.4, pas de 2ᵉ gros CTA) — calqué sur les chips RSVP défense.
  outingRsvpRow: { flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  outingRsvpChip: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: borderState.hairline,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  outingRsvpChipSelected: { borderColor: colors.blanc },
  outingRsvpChipEngaged: { backgroundColor: gameColors.crew, borderColor: gameColors.crew },
  outingRsvpLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  outingRsvpLabelSelected: { color: colors.blanc },
  outingRsvpLabelEngaged: { color: colors.noir },
  outingRsvpDone: { color: colors.gris, fontSize: fontSizes.xs },
  outingNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 18,
  },
  // ── Form « Créer une sortie » (bottom sheet) ──
  outingFieldLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
    marginTop: 12,
    marginBottom: 6,
  },
  outingInput: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  outingObjRow: { flexDirection: 'row', gap: 10 },
  outingObjChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: borderState.hairline,
    paddingVertical: 11,
  },
  outingObjLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  outingSubmit: {
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  outingSubmitActive: { backgroundColor: gameColors.crew },
  outingSubmitIdle: { backgroundColor: elevation.raised },
  outingSubmitLabel: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  outingSubmitLabelActive: { color: colors.noir },
});
