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
  ACTIVITY_STATUS_LABELS,
  CHEST_TIER_LABELS,
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

/** Onglets internes du HQ (doc §11 — pas de scroll infini). */
type HqTab = 'base' | 'membres' | 'sorties' | 'coffre' | 'perks' | 'chat';
const HQ_TABS: readonly { key: HqTab; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'membres', label: 'Membres' },
  { key: 'sorties', label: 'Sorties' },
  { key: 'coffre', label: 'Coffre' },
  { key: 'perks', label: 'Perks' },
  { key: 'chat', label: 'Chat' },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function EmptyState() {
  const todoCrewFlow = (step: 'create' | 'join') => {
    // TODO(O1) : création / rejoindre un crew (crew_created, crew_joined §8).
    // En attendant le flux serveur, le bouton répond honnêtement au tap.
    if (step === 'create') {
      Alert.alert(
        'Créer mon crew',
        'La création de crew arrive très bientôt. En attendant, explore les crews autour de toi et rejoins-en un en un tap.',
        [{ text: 'Explorer', onPress: () => router.push('/crew-discovery') }, { text: 'Plus tard', style: 'cancel' }],
      );
    } else {
      Alert.alert(
        'Rejoindre avec un code',
        'Rejoindre un crew par code arrive très bientôt. En attendant, explore les crews autour de toi.',
        [{ text: 'Explorer', onPress: () => router.push('/crew-discovery') }, { text: 'Plus tard', style: 'cancel' }],
      );
    }
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

/** Horodatage court d'un message chat (« à l'instant », « 14:32 », « hier »). */
function chatTimeLabel(at: number, now: number): string {
  const diffMin = Math.max(0, Math.round((now - at) / 60_000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diffMin < 24 * 60) return `${hh}:${mm}`;
  return `hier ${hh}:${mm}`;
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
  const now = Date.now();
  // Filtrage de mots (§1) : un message toxique est MASQUÉ (jamais montré en
  // clair), tout en gardant l'auteur visible pour pouvoir le signaler/bloquer.
  const masked = containsBlockedWord(msg.text);
  const shownText = masked ? 'Message masqué (contenu signalé)' : msg.text;
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
            accessibilityLabel={`Signaler le message de ${msg.author}`}
            hitSlop={8}
            onPress={() => onReport(msg)}
            style={({ pressed }) => [styles.bubbleMore, pressed && styles.dim]}
          >
            <Text style={styles.bubbleMoreDots}>···</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Message de ${msg.author}. Appui long pour signaler.`}
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
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {rsvp[msg.id] ? (
              <Text style={styles.rsvpDone}>Réponse envoyée au crew (démo)</Text>
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
            <Text style={styles.mapBtnLabel}>Ouvrir la carte</Text>
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
 * Carte d'action « À FAIRE » (A.2) : type + zone + 1-2 infos + 1 CTA plein.
 * Le CTA route vers l'écran de course/planner (le client ne claim jamais) ou
 * relaie une action démo (sortie, demande). Libellé de CTA JAMAIS tronqué.
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
  return (
    <View style={[styles.bonusCard, { borderColor: card.tint }]}>
      <View style={styles.actionTop}>
        <View style={[styles.actionIcon, { borderColor: card.tint }]}>
          <Icon name={card.icon} size={18} color={card.tint} />
        </View>
        <View style={styles.actionBody}>
          <Text style={[styles.bonusTitle, { color: card.tint }]} numberOfLines={1}>
            {card.title}
          </Text>
          <Text style={styles.actionZone} numberOfLines={2}>
            {card.detail}
          </Text>
        </View>
      </View>
      {/* Effet PROMIS (libellé court non tronqué) — jamais points/territoire. */}
      <View style={[styles.bonusEffectPill, { borderColor: card.tint }]}>
        <Text style={[styles.bonusEffect, { color: card.tint }]} numberOfLines={1}>
          {card.effect}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.bonus.cta} · ${card.title}`}
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
  // Seed idempotent des compteurs de départ (avant tout tap).
  seedGiftReactions(gift.id, gift.seed);
  const state = resolveGiftReactions(gift.id);
  const thanks = thanksLine(gift.id, gift.by);
  const who = gift.by ?? 'Un membre';
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
              accessibilityLabel={`${r.label} · ${gift.kicker}`}
              onPress={() => {
                haptics.light();
                toggleGiftReaction(gift.id, r.key);
              }}
              style={[styles.giftReact, mine && styles.giftReactMine]}
            >
              <Text style={[styles.giftReactLabel, mine && styles.giftReactLabelMine]}>
                {r.label}
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
  if (giftExpired(gift, now)) return 'Expiré';
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
  const left = giftRewardsLeft(gift);
  const mine = giftClaimedByMe(gift);
  const expired = giftExpired(gift, now);
  const claimable = giftClaimable(gift, now);
  const who = gift.by ?? 'Un membre';
  // État du CTA : réclamable / déjà réclamé / épuisé / expiré.
  const ctaLabel = mine
    ? 'Déjà réclamé'
    : expired
      ? 'Offre expirée'
      : left <= 0
        ? 'Tout réclamé'
        : 'Réclamer';
  return (
    <View style={styles.cadeauCard}>
      <View style={styles.cadeauHead}>
        <View style={styles.cadeauIcon}>
          <Icon name="cadeau" size={16} color={gameColors.gold} />
        </View>
        <Text style={styles.cadeauKicker} numberOfLines={1}>
          CADEAU CREW
        </Text>
        <Text style={styles.cadeauWindow} numberOfLines={1}>
          {giftWindowLabel(gift, now)}
        </Text>
      </View>
      <Text style={styles.cadeauMessage} numberOfLines={2}>
        <Text style={styles.giftBy}>{who} </Text>a offert un {gift.title}
      </Text>
      {/* Récompenses restantes — jamais de montant ni de prix (A.3). */}
      <Text style={styles.cadeauMeta} numberOfLines={1}>
        {left} récompense{left > 1 ? 's' : ''} · {CREW_GIFT_CLAIMS_PER_MEMBER}/membre · expire {CREW_GIFT_EXPIRY_H} h
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
  const meta = OUTING_OBJECTIVE_META[outing.objective];
  // Densité de la sortie : « 7 viennent » (jamais 0 → on n'affiche pas « 0 »).
  const goingLabel =
    outing.going > 0 ? `${outing.going} vien${outing.going > 1 ? 'nent' : 't'}` : null;
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
            {objectiveLabel(outing.objective)} · {outing.zone}
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
        {outing.mine ? 'Ta sortie' : `Par ${outing.host}`}
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
              accessibilityLabel={`${opt} · ${outing.title}`}
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
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {outing.myRsvp ? (
        <Text style={styles.outingRsvpDone}>Réponse envoyée au crew (démo)</Text>
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
  return (
    <View style={styles.glueSection}>
      <View style={styles.glueHead}>
        <Icon name="aujourdhui" size={15} color={gameColors.crew} />
        <Text style={styles.glueKicker}>AUJOURD’HUI</Text>
        <Text style={styles.glueProgress} numberOfLines={1}>
          {glue.doneCount}/4 · +{glue.socialXpToday} XP
        </Text>
      </View>
      <Text style={styles.glueLead} numberOfLines={2}>
        Pas de run aujourd’hui ? Garde le crew vivant en 4 gestes.
      </Text>

      <DailyGlueRow
        icon="reactRespect"
        tint={gameColors.crew}
        label="Encourager un runner"
        sub="Envoie un boost de moral à celui qui part défendre."
        done={glue.encourage}
        doneLabel={`+${DAILY_GLUE_SOCIAL_XP} XP`}
        onPress={() => onAction('encourage')}
      />
      <DailyGlueRow
        icon="cible"
        tint={gameColors.crew}
        label="Voter une cible"
        sub="Choisis la zone que le crew devrait viser en priorité."
        done={glue.vote}
        doneLabel={`+${DAILY_GLUE_SOCIAL_XP} XP`}
        onPress={() => onAction('vote')}
      />
      <DailyGlueRow
        icon="bouclier"
        tint={gameColors.contested}
        label="Signaler une zone faible"
        sub="Préviens le crew d’un secteur qui risque de tomber."
        done={glue.signal}
        doneLabel={`+${DAILY_GLUE_SOCIAL_XP} XP`}
        onPress={() => onAction('signal')}
      />
      <DailyGlueRow
        icon="cadeau"
        tint={gameColors.gold}
        label="Boost coffre gratuit"
        sub="Un petit coup de pouce au coffre crew. Gratuit, 1×/jour."
        done={!glue.boostAvailable}
        doneLabel="Utilisé"
        onPress={onBoost}
      />

      <Text style={styles.glueNote} numberOfLines={2}>
        Ces gestes nourrissent le crew et le coffre — jamais de territoire ni de points.
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
  return (
    <View style={styles.chatSectionHead}>
      <Text style={styles.chatSectionLabel}>{label}</Text>
      {count > 2 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          onPress={onToggle}
          style={({ pressed }) => [styles.seeAllBtn, pressed && styles.dim]}
        >
          <Text style={styles.seeAllLabel}>{showAll ? 'Réduire' : `Voir tout (${count})`}</Text>
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

  if (!HAS_CREW) return <EmptyState />;

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
      notify(`${card.cta} · ${card.zone} — don enregistré, le crew le voit (démo)`);
      return;
    }
    notify(`${card.cta} · ${card.zone} — envoyé au crew (démo)`);
  };

  // CTA d'une carte BONUS (AMENDEMENT-19 §4) : GRYD révèle le bon moment, le
  // JOUEUR agit — on route vers l'écran adéquat selon la famille (finisher →
  // fermer la frontière ; défense → défendre ; coffre → onglet Coffre). Le
  // serveur reste seul juge de la récompense (§3) : ici on ne fait qu'inviter.
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
        setTab('coffre');
        return;
      default:
        notify(`${card.bonus.cta} · ${card.title} (démo)`);
    }
  };

  // CTA « Voir » d'un don : coffre (onglet), carte, ou Arsenal.
  const onGiftCta = (gift: GiftCardDemo) => {
    haptics.light();
    if (gift.ctaKind === 'chest') {
      setTab('coffre');
      return;
    }
    if (gift.ctaKind === 'map') {
      router.navigate('/');
      return;
    }
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
      notify('Boost proposé au crew — 100 % optionnel, aucune obligation (démo)');
    } else {
      notify(`Demande envoyée au crew · ${REQUEST_CHOICES.find((c) => c.key === choice)?.label} (démo)`);
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
        ? { title: 'Coffre cosmétique', rewardsTotal: 5, anonymous, by: CHAT_ME }
        : { title: 'Crew Boost 24 h', rewardsTotal: 5, anonymous, by: CHAT_ME },
    );
    setChatFilter('dons');
    setTab('chat');
    notify('Cadeau offert au crew — à réclamer sous 24 h (démo)');
  };

  // Réclamer un cadeau (démo) : décrémente les récompenses + toast. Les gardes
  // (expiré / épuisé / déjà réclamé) sont dans claimGift — on ne toast que le OK.
  const onClaimGift = (gift: OfferedGift) => {
    haptics.light();
    const ok = claimGift(gift.id);
    if (ok) notify(`Récompense réclamée · ${gift.title} (démo)`);
  };

  // ── COLLE QUOTIDIENNE (AMENDEMENT-34) : 4 micro-actions SANS courir pour
  // garder le crew vivant les jours off. Chaque action pose un +XP SOCIAL
  // cosmétique + une anim ; ZÉRO territoire/point/vitesse/protection (anti-P2W).
  // Encourager / Voter / Signaler : action ponctuelle, une fois/jour (idempotent).
  const onDailyAction = (action: 'encourage' | 'vote' | 'signal') => {
    const posted = markDailyAction(action);
    if (!posted) {
      notify('Déjà fait aujourd’hui — reviens demain (démo)');
      return;
    }
    haptics.light();
    const label =
      action === 'encourage'
        ? 'Encouragement envoyé au runner'
        : action === 'vote'
          ? 'Vote de cible enregistré'
          : 'Zone faible signalée au crew';
    notify(`${label} · +${DAILY_GLUE_SOCIAL_XP} XP social (démo)`);
  };
  // Boost coffre GRATUIT : capé 1×/jour (DAILY_CHEST_BOOST_*). Alimente le coffre
  // crew DÉMO (visuel, +2 %) — jamais points/XP de jeu/territoire. success = geste
  // de générosité franc ; refus doux si déjà utilisé aujourd'hui.
  const onDailyBoost = () => {
    const posted = useDailyBoost();
    if (!posted) {
      notify('Boost coffre déjà utilisé aujourd’hui — 1×/jour (démo)');
      return;
    }
    haptics.success();
    notify('Boost coffre offert — le coffre crew avance un peu (démo)');
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
    setTab('sorties');
    notify('Sortie créée — le crew la voit (démo)');
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

  const memberAction = (label: string, member: CrewMemberDemo) => {
    setMemberSheet(null);
    if (label === 'Voir profil' && member.me) {
      router.navigate('/profil');
      return;
    }
    notify(`${label} · ${member.pseudo} — envoyé au crew (démo)`);
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
    notify(`Signalement envoyé, examiné sous ${REPORT_REVIEW_HOURS} h. Merci (démo).`);
  };
  // Bloquer un membre : masque ses messages (filtre d'affichage) — silencieux.
  const onBlockMember = (member: CrewMemberDemo) => {
    setMemberSheet(null);
    haptics.medium();
    blockMember(member.pseudo);
    notify(`${member.pseudo} bloqué. Ses messages sont masqués (démo).`);
  };
  // Débloquer depuis la liste « Membres bloqués ».
  const onUnblockMember = (pseudo: string) => {
    haptics.light();
    unblockMember(pseudo);
    notify(`${pseudo} débloqué. Ses messages réapparaissent (démo).`);
  };

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
                {ACTIVITY_STATUS_LABELS[status]}
              </Text>
            </View>
            {/* Ligne d'identité forte : niveau · rang ville · membres actifs. */}
            <Text style={styles.identityLine} numberOfLines={2}>
              Niveau {level} · #{MY_CREW.localRank} {MY_CREW.city} · {activeMembers}/
              {CREW_MAX_MEMBERS} actifs
            </Text>
            <View style={styles.headerGauge}>
              <ProgressBar value={levelProgress} height={7} />
            </View>
            {/* La LIGUE est déjà portée par le cadre du blason (leagueTier) —
                cette ligne ne garde que la progression liée à la jauge au-dessus,
                pour ne jamais tronquer (§9) ni répéter l'info du blason (§20). */}
            <Text style={styles.xpLine} numberOfLines={1}>
              {nextLevelXp !== null
                ? `${formatInt(nextLevelXp - MY_CREW.xp)} XP vers niv. ${level + 1}`
                : 'Niveau max atteint'}
            </Text>
          </View>
        </View>

        {/* UN SEUL gros CTA chartreuse (Voir War Room). Actions secondaires
            LÉGÈRES façon Strava (icône + label), jamais de grosse card — §3. */}
        <View style={styles.headerCta}>
          <InlineRunCTA
            label="VOIR WAR ROOM"
            leading={<Icon name="guerre" size={18} color={colors.noir} />}
            onPress={() => router.navigate('/warroom')}
          />
          <View style={styles.headerActions}>
            <IconAction
              icon="ajoutami"
              label="Inviter"
              onPress={() => notify('Lien d’invitation copié — gryd.run/c/foulees93 (démo)')}
            />
            {/* « Modifier le crew » (founder §8.1) → écran d'édition. */}
            {canEditCrew ? (
              <IconAction
                icon="reglages"
                label="Modifier"
                onPress={() => {
                  haptics.light();
                  router.push('/crew-edit');
                }}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Onglets internes = UN segmented control (§4). Ton `surface` : un gros
          CTA chartreuse (Voir War Room) existe déjà dans la scène, donc l'onglet
          actif se relève en N2 (pas un 2ᵉ focus chartreuse fort). Coffre à
          récupérer = pastille « • » collée au label (état de jeu, non tronqué). ── */}
      <Segmented
        style={styles.hqSegmented}
        tone="surface"
        accessibilityLabel="Sections du crew"
        options={HQ_TABS.map((t) => ({
          id: t.key,
          label: t.key === 'coffre' && chestClaimable ? `${t.label} •` : t.label,
        }))}
        value={tab}
        onChange={setTab}
        scrollable
      />

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

      {/* ══ BASE : 4 cards compactes (§1.3) — 1 titre + 1 chiffre + 1 CTA au tap.
          Territoire / Membres / Coffre / Contribution. Boost & contribution
          restent SECONDAIRES (repliés, après les stats + War Room). ══ */}
      {tab === 'base' ? (
        <>
          {/* ── AUJOURD'HUI (AMENDEMENT-34) : colle quotidienne, 4 micro-actions
              SANS courir pour garder le crew vivant les jours off. En TÊTE de la
              Base (c'est le geste du jour), avant les stats. Anti-P2W strict. ── */}
          <DailyGlue glue={dailyGlue} onAction={onDailyAction} onBoost={onDailyBoost} />

          <View style={styles.baseGrid}>
            {/* Territoire — le cœur du jeu : tap → détail secteur/frontières. */}
            <BaseCard
              icon="pin"
              tint={gameColors.crew}
              label="Territoire"
              value={`${formatInt(MY_CREW.territory.zonesHeld)} zones`}
              sub={`${MY_CREW.territory.contestedBorders} frontières contestées`}
              onPress={() => {
                haptics.light();
                setShowTerritory((v) => !v);
              }}
            />
            {/* Membres — tap → onglet Membres (roster + actions). */}
            <BaseCard
              icon="crew"
              label="Membres"
              value={`${activeMembers}/${CREW_MAX_MEMBERS} actifs`}
              sub={`${MY_CREW.recruitSpots} places ouvertes`}
              onPress={() => setTab('membres')}
            />
            {/* Coffre — % hebdo + jauge ; tap → onglet Coffre. */}
            <BaseCard
              icon="coffre"
              tint={chestClaimable ? gameColors.crew : gameColors.gold}
              label="Coffre"
              value={`${Math.round(chestPct * 100)} %`}
              sub={chestClaimable ? 'À récupérer' : `Palier ${nextChestTier ? CHEST_TIER_LABELS[nextChestTier] : 'max'}`}
              progress={chestPct}
              onPress={() => setTab('coffre')}
            />
            {/* Contribution — SECONDAIRE : ouvre la section boost repliée plus bas. */}
            <BaseCard
              icon="cadeau"
              tint={boostActive ? gameColors.gold : colors.blanc}
              label="Contribution"
              value={boostActive ? 'Boost actif' : 'Boost dispo'}
              sub={boostActive ? formatBoostRemaining(boost, nowTick) : 'Accélère le coffre'}
              onPress={() => {
                haptics.light();
                setShowContribution(true);
              }}
            />
          </View>

          {/* Détail Territoire (AMENDEMENT-11 §4) révélé au tap de la card. */}
          {showTerritory ? <TerritoryBlock /> : null}

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
              Contribution &amp; boost {boostActive ? '· actif' : ''}
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
                      <Text style={styles.boostTitle}>Boost actif</Text>
                      <View style={styles.boostBonus}>
                        <Text style={styles.boostBonusText}>{BOOST_CHEST_BONUS_LABEL}</Text>
                      </View>
                    </View>
                    <Text style={styles.boostSub}>
                      {boost.by ? `${boost.by} a boosté le crew` : 'Un membre a boosté le crew'} ·{' '}
                      <Text style={styles.boostTimer}>{formatBoostRemaining(boost, nowTick)}</Text>
                    </Text>
                    <Text style={styles.boostNote}>
                      Accélère la progression du coffre. Jamais de points ni de zones.
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.contribCard}>
                <Text style={styles.contribLead}>Offre un boost à ton crew.</Text>
                <Text style={styles.contribBody}>
                  Tous les runs comptent plus fort pour le coffre.
                </Text>
                <Text style={styles.contribStrong}>
                  Aucune obligation. La victoire reste sur la route.
                </Text>

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
                    <Text style={styles.wallToggleLabel}>Afficher le Crew Wall</Text>
                    <Text style={styles.wallToggleSub}>
                      Supporters de la saison — sans montant, offrande anonyme respectée.
                    </Text>
                  </View>
                </Pressable>

                {wallOptIn ? (
                  <View style={styles.wall}>
                    <Text style={styles.wallTitle}>Supporters de la saison</Text>
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
                    <Text style={styles.wallFootnote}>
                      Aucun montant. Aucun classement par dépense.
                    </Text>
                  </View>
                ) : null}

                <GhostButton
                  label="Voir l’Arsenal"
                  icon="boutique"
                  onPress={() => router.push('/arsenal')}
                />
              </View>
            </>
          ) : null}
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

      {/* ══ SORTIES (AMENDEMENT-32 §1) : sorties de crew à venir (titre + heure +
          lieu de RDV + ZONE cible défense/conquête) + « Je viens » (RSVP démo
          persisté) + créer une sortie. SOCIAL, pas de monétisation (§A.19) —
          courir ensemble = coordination + densité (le moat). 1 SEUL CTA plein
          (Créer une sortie) ; les RSVP sont des chips (§A.4). ══ */}
      {tab === 'sorties' ? (
        <>
          <SectionLabel>SORTIES À VENIR · {crewOutings.outings.length}</SectionLabel>

          {/* UN SEUL gros CTA : créer une sortie. Ouvre le form court (sheet). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Créer une sortie de crew"
            onPress={() => {
              haptics.light();
              setOutingSheet(true);
            }}
            style={({ pressed }) => [styles.outingCreateBtn, pressed && styles.dim]}
          >
            <Icon name="plus" size={18} color={colors.noir} />
            <Text style={styles.outingCreateLabel}>Créer une sortie</Text>
          </Pressable>

          <View style={styles.outingList}>
            {crewOutings.outings.map((o) => (
              <SortieCard key={o.id} outing={o} onRsvp={onOutingRsvp} />
            ))}
          </View>

          <Text style={styles.outingNote}>
            Courir ensemble, c’est plus de terrain tenu. Aucune sortie ne donne de points (démo).
          </Text>
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
          {/* Rappel anti pay-to-win STRICT (§52) : les perks sont statut/orga/
              cosmétique — jamais territoire, points ni protection. Ligne simple
              (pas de card-dans-card §A). */}
          <Text style={styles.perkNote}>
            Cosmétique et organisation — jamais d'avantage territorial.
          </Text>
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
                      stateLabel={`Niveau ${p.level}`}
                    />
                  );
                })}
              </View>
            </>
          ) : null}
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
            accessibilityLabel="Filtrer le chat du crew"
            options={CHAT_FILTERS.map((f) => ({ id: f.key, label: f.label }))}
            value={chatFilter}
            onChange={setChatFilter}
            scrollable
          />

          {/* ── DEMANDER / OFFRIR (A.3) : en tête du chat actionnable. « Demander »
              ouvre la feuille de choix (Défense/Terminer/Route/Scout/Sortie/
              Proposer un boost) → carte requête. « Offrir » propose un cadeau
              premium (Boost/Coffre) → carte CADEAU CREW réclamable. ── */}
          <View style={styles.askRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Demander de l'aide au crew"
              onPress={() => {
                haptics.light();
                setAskSheet(true);
              }}
              style={({ pressed }) => [styles.askBtn, pressed && styles.dim]}
            >
              <Icon name="ajoutami" size={16} color={colors.noir} />
              <Text style={styles.askBtnLabel}>Demander</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Offrir un cadeau au crew"
              onPress={() => {
                haptics.light();
                setGiftSheet(true);
              }}
              style={({ pressed }) => [styles.offerBtn, pressed && styles.dim]}
            >
              <Icon name="cadeau" size={16} color={gameColors.gold} />
              <Text style={styles.offerBtnLabel}>Offrir au crew</Text>
            </Pressable>
          </View>

          {/* ── SECTION 1 · À FAIRE (prioritaire, ouverte) : carte BONUS ciblée
              (AMENDEMENT-19 §4, en tête) + cartes d'action ── */}
          {showBonusCard || visibleActions.length > 0 ? (
            <View style={styles.chatSection}>
              <SectionHead
                label="À FAIRE"
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
              <Text style={styles.chatSectionLabel}>MESSAGES</Text>
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
                  accessibilityLabel="Lire le code de conduite"
                  onPress={() => {
                    haptics.light();
                    router.push('/code-conduite');
                  }}
                  style={({ pressed }) => [styles.moderationLink, pressed && styles.dim]}
                >
                  <Icon name="bouclier" size={14} color={colors.gris} />
                  <Text style={styles.moderationLinkText}>Code de conduite</Text>
                </Pressable>
                {moderation.blocked.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Gérer les membres bloqués (${moderation.blocked.length})`}
                    onPress={() => {
                      haptics.light();
                      setBlockedSheet(true);
                    }}
                    style={({ pressed }) => [styles.moderationLink, pressed && styles.dim]}
                  >
                    <Icon name="verrou" size={14} color={colors.gris} />
                    <Text style={styles.moderationLinkText}>
                      Bloqués ({moderation.blocked.length})
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* BARRE DE SAISIE — évidente, en bas du fil : où taper + Envoyer. */}
              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Écris au crew…"
                  placeholderTextColor={colors.gris}
                  style={styles.composerInput}
                  multiline
                  maxLength={280}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  returnKeyType="send"
                  accessibilityLabel="Écris un message au crew"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Envoyer le message"
                  accessibilityState={{ disabled: !canSend }}
                  disabled={!canSend}
                  onPress={sendMessage}
                  style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnIdle]}
                >
                  <Icon name="partage" size={18} color={canSend ? colors.noir : colors.gris} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* ── SECTION · DONS : cadeaux premium réclamables + dons gratuits
              (route/scout/segment/défense) + Merci/Respect/Bien joué ── */}
          {visibleGifts.length > 0 || visibleCadeaux.length > 0 ? (
            <View style={styles.chatSection}>
              <Text style={styles.chatSectionLabel}>DONS</Text>
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

          {/* ── SECTION 3 · LOG (War Log compressé) : 2 visibles + Voir tout ── */}
          {showLog ? (
            <View style={styles.chatSection}>
              <SectionHead
                label="LOG"
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

          <Text style={styles.chatNote}>
            Ton crew ne parle pas seulement. Il agit. Messages du crew — pas de MP (MVP, démo).
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
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setAskSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetName}>Demander au crew</Text>
            <Text style={styles.sheetRole}>
              Quelqu’un aide · le crew progresse · tout le monde le voit.
            </Text>
            {REQUEST_CHOICES.map((choice) => (
              <Pressable
                key={choice.key}
                accessibilityRole="button"
                accessibilityLabel={choice.label}
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
                  <Text style={styles.sheetActionLabel}>{choice.label}</Text>
                  <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                    {choice.hint}
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
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setGiftSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetName}>Offrir au crew</Text>
            <Text style={styles.sheetRole}>
              Un geste, pas un avantage · 1 réclamation/membre · expire 24 h · jamais de points.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Offrir un Crew Boost 24 h"
              onPress={() => onOfferGift('boost', false)}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
            >
              <Icon name="cadeau" size={18} color={gameColors.gold} />
              <View style={styles.sheetChoiceText}>
                <Text style={styles.sheetActionLabel}>Crew Boost 24 h</Text>
                <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                  Accélère le coffre · jamais de territoire
                </Text>
              </View>
              <Icon name="chevron" size={15} color={colors.gris} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Offrir un Coffre cosmétique"
              onPress={() => onOfferGift('chest', false)}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
            >
              <Icon name="coffre" size={18} color={gameColors.gold} />
              <View style={styles.sheetChoiceText}>
                <Text style={styles.sheetActionLabel}>Coffre cosmétique</Text>
                <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                  5 récompenses cosmétiques à réclamer
                </Text>
              </View>
              <Icon name="chevron" size={15} color={colors.gris} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Offrir un Coffre cosmétique anonymement"
              onPress={() => onOfferGift('chest', true)}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.dim]}
            >
              <Icon name="verrou" size={18} color={colors.blanc} />
              <View style={styles.sheetChoiceText}>
                <Text style={styles.sheetActionLabel}>Coffre · offrande anonyme</Text>
                <Text style={styles.sheetChoiceHint} numberOfLines={1}>
                  Ton nom n’apparaît pas · aucun classement
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
                    accessibilityLabel={objectiveLabel(obj)}
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
                      {objectiveLabel(obj)}
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
                {CREW_ROLE_META[memberCardRole(memberSheet.role)].label}
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
                  { label: 'Assigner mission', icon: 'mission', can: roleCan(myRole, 'assignObjectives') },
                  { label: 'Inviter sortie', icon: 'ami', can: roleCan(myRole, 'createOuting') },
                  {
                    label: 'Promouvoir',
                    icon: 'couronne',
                    can: roleCan(myRole, 'promote') && memberSheet.role !== 'founder',
                  },
                  { label: 'Voir profil', icon: 'profil', can: true },
                ] as const
              )
                .filter((a) => a.can)
                .map((a) => (
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
    marginTop: 26,
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
  glueDone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  glueDoneLabel: {
    color: gameColors.crew,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  glueNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 15, marginTop: 2 },
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
  headerActions: { flexDirection: 'row', justifyContent: 'center', gap: 40 },
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
  baseCardSub: { color: colors.gris, fontSize: 11, letterSpacing: 0.2 },
  // ── Bascule Contribution & boost (secondaire, repliée) : détail AU TAP (§6).
  //    Rangée légère séparée par l'ESPACE + un filet, pas une card cadrée. ──
  contribToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingVertical: 12,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  boostBody: { flex: 1, gap: 3 },
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
  boostNote: { color: colors.gris, fontSize: 11, lineHeight: 15, marginTop: 1 },
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
    borderRadius: 7,
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
  // Wall = vraie liste-preview relevée (N2) dans la surface Contribution (N1).
  wall: {
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    padding: 14,
    marginTop: 10,
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
  wallFootnote: { color: colors.gris, fontSize: 11, marginTop: 2 },
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
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
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
  // Paliers = détail AU TAP (§6) : rangée légère séparée par un filet, pas une card.
  tiersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 12,
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
  // « Voir tout » = action légère : pill N2 relevé, sans contour.
  seeAllBtn: {
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    paddingVertical: 5,
    paddingHorizontal: 11,
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
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  actionBody: { flex: 1, gap: 3 },
  actionTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionZone: { color: colors.gris, fontSize: fontSizes.xs },
  // CTA plein chartreuse — libellé NOIR (contraste charte), jamais tronqué.
  actionCta: {
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCtaLabel: {
    color: colors.noir,
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
  bonusEffect: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
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
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: elevation.raised,
    paddingVertical: 7,
    paddingHorizontal: 12,
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
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    paddingVertical: 10,
  },
  giftCtaLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Demander / Offrir (A.3) — barre en tête du chat actionnable ──
  askRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  askBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  // Libellé NOIR sur chartreuse (contraste charte, jamais l'inverse).
  askBtnLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.3 },
  // « Offrir » = action secondaire à côté du gros CTA « Demander » : pill N2
  // relevé sans contour (le sens « cadeau » vient de l'icône + label or).
  offerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  offerBtnLabel: { color: gameColors.gold, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.2 },
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
  cadeauMeta: { color: colors.gris, fontSize: 11, letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  cadeauCta: {
    borderRadius: radii.pill,
    paddingVertical: 11,
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
  bubbleTime: { color: colors.gris, fontSize: 10, fontVariant: ['tabular-nums'] },
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
  moderationLink: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  moderationLinkText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  blockedEmpty: { color: colors.gris, fontSize: fontSizes.sm, paddingVertical: 16 },
  unblockBtn: {
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    fontSize: 10,
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
  sendBtnActive: { backgroundColor: gameColors.crew },
  sendBtnIdle: { backgroundColor: elevation.raised },
  // ── War Log ──
  feedItem: { marginBottom: 12 },
  feedReactions: { paddingHorizontal: 4 },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  // Choix RSVP = pills N2 relevés sans contour ; sélection/engagement = état N3.
  rsvpChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: elevation.raised,
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
  // « Ouvrir la carte » = action légère : pill N2 relevé, sans contour.
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
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
    marginTop: 26,
  },
  discoveryText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── Sheet membre ──
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,5,0.72)', // voile noir charte
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
  sheetRole: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3, marginBottom: 12 },
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
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    paddingVertical: 13,
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
    borderRadius: 12,
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
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: borderState.hairline,
    paddingVertical: 8,
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
    borderRadius: radii.pill,
    paddingVertical: 13,
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
