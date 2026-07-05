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
  InlineRunCTA,
  MemberCard,
  PerkCard,
  RewardCard,
  WarEventCard,
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
  warLogTint,
  type ActionCardDemo,
  type ChatFilter,
  type DefenseRsvp,
  type GiftCardDemo,
} from '../../src/features/crew/feed';
import { ReactionBar } from '../../src/features/crew/ReactionBar';
import {
  GIFT_REACTIONS,
  resolveGiftReactions,
  seedGiftReactions,
  thanksLine,
  toggleGiftReaction,
  useGiftReactions,
} from '../../src/features/crew/reactions';
import { useCrewChat, type ChatThreadMessage } from '../../src/features/crew/chatStore';
import { useCrewProfile } from '../../src/features/crew/crewEdit';

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
}: {
  msg: ChatThreadMessage;
  rsvp: Record<string, DefenseRsvp>;
  setRsvp: Dispatch<SetStateAction<Record<string, DefenseRsvp>>>;
}) {
  const now = Date.now();
  if (msg.me) {
    return (
      <View style={styles.bubbleRowMe}>
        <View style={[styles.bubble, styles.bubbleMe]}>
          <Text style={styles.bubbleTextMe}>{msg.text}</Text>
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
        </View>
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Text style={styles.bubbleText}>{msg.text}</Text>
        </View>

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
    notify(`${card.cta} · ${card.zone} — envoyé au crew (démo)`);
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

  // ── Sections du chat actionnable filtrées (A.2) ──
  // À FAIRE : cartes d'action visibles selon le filtre (Dons masque À faire).
  const visibleActions = useMemo(
    () =>
      chatFilter === 'dons' || chatFilter === 'resultats'
        ? []
        : ACTION_CARDS_DEMO.filter(
            (c) => chatFilter === 'tout' || c.filters.includes(chatFilter),
          ),
    [chatFilter],
  );
  // DONS : cartes de don (boost/cadeau/segment…) — masquées sous Résultats/Missions.
  const visibleGifts = useMemo(
    () => (chatFilter === 'resultats' || chatFilter === 'missions' ? [] : GIFT_CARDS_DEMO),
    [chatFilter],
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
            <Text style={styles.xpLine} numberOfLines={1}>
              {leagueLabelFor(MY_CREW.league)}
              {nextLevelXp !== null
                ? ` · ${formatInt(nextLevelXp - MY_CREW.xp)} XP vers niv. ${level + 1}`
                : ' · niveau max'}
            </Text>
          </View>
        </View>

        {/* CTA principal inline (Voir War Room) + secondaire (Inviter) — §1.3 */}
        <View style={styles.headerCta}>
          <InlineRunCTA
            label="VOIR WAR ROOM"
            leading={<Icon name="guerre" size={18} color={colors.noir} />}
            onPress={() => router.navigate('/warroom')}
          />
          <View style={styles.headerCtaRow}>
            <View style={styles.headerCtaCell}>
              <InlineRunCTA
                label="Inviter"
                variant="secondary"
                size="md"
                leading={<Icon name="ajoutami" size={16} color={colors.blanc} />}
                onPress={() => notify('Lien d’invitation copié — gryd.run/c/foulees93 (démo)')}
              />
            </View>
            {/* « Modifier le crew » ÉVIDENT (founder §8.1) → écran d'édition. */}
            {canEditCrew ? (
              <View style={styles.headerCtaCell}>
                <InlineRunCTA
                  label="Modifier"
                  variant="secondary"
                  size="md"
                  leading={<Icon name="reglages" size={16} color={colors.blanc} />}
                  onPress={() => {
                    haptics.light();
                    router.push('/crew-edit');
                  }}
                />
              </View>
            ) : null}
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

      {/* ══ BASE : 4 cards compactes (§1.3) — 1 titre + 1 chiffre + 1 CTA au tap.
          Territoire / Membres / Coffre / Contribution. Boost & contribution
          restent SECONDAIRES (repliés, après les stats + War Room). ══ */}
      {tab === 'base' ? (
        <>
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

      {/* ══ CHAT ACTIONNABLE (AMENDEMENT-18 A.2) : le chat n'est PAS un WhatsApp,
          c'est le CENTRE D'ACTION du crew. 3 sections — À FAIRE (ouverte, en
          haut), MESSAGES (fil humain, secondaire), LOG (War Log compressé) —
          + filtres Tout/Demandes/Missions/Dons/Résultats. Anti-scroll : 2 cartes
          visibles par section + « Voir tout ». ══ */}
      {tab === 'chat' ? (
        <>
          {/* Filtres en chips (A.2) — pilotent l'affichage des sections. */}
          <View accessibilityRole="tablist" style={styles.filterRow}>
            {CHAT_FILTERS.map((f) => {
              const active = chatFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    haptics.light();
                    setChatFilter(f.key);
                  }}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── SECTION 1 · À FAIRE (prioritaire, ouverte) : cartes d'action ── */}
          {visibleActions.length > 0 ? (
            <View style={styles.chatSection}>
              <SectionHead
                label="À FAIRE"
                count={visibleActions.length}
                showAll={showAllActions}
                onToggle={() => {
                  haptics.light();
                  setShowAllActions((v) => !v);
                }}
              />
              <View style={styles.actionList}>
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
                {chat.messages.map((m) => (
                  <ChatBubble key={m.id} msg={m} rsvp={rsvp} setRsvp={setRsvp} />
                ))}
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

          {/* ── SECTION · DONS : boost/segment/coffre offerts + Merci/Respect ── */}
          {visibleGifts.length > 0 ? (
            <View style={styles.chatSection}>
              <Text style={styles.chatSectionLabel}>DONS</Text>
              <View style={styles.actionList}>
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
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
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
  // CTA principal + secondaire, sous le bloc identité (§1.3).
  headerCta: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    gap: 10,
  },
  // Ligne d'actions secondaires (Inviter + Modifier le crew côte à côte).
  headerCtaRow: { flexDirection: 'row', gap: 10 },
  headerCtaCell: { flex: 1 },
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
  // ── Bascule Contribution & boost (secondaire, repliée par défaut §1.3) ──
  contribToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  contribToggleText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── Crew Boost actif (AMENDEMENT-16 §13.1) ──
  boostCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.carbone,
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
    borderWidth: 1.5,
    borderColor: gameColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone2,
  },
  boostBody: { flex: 1, gap: 3 },
  boostTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boostTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '800' },
  boostBonus: {
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  boostBonusText: { color: gameColors.gold, fontSize: fontSizes.xs, fontWeight: '800' },
  boostSub: { color: colors.gris, fontSize: fontSizes.xs },
  boostTimer: { color: colors.blanc, fontWeight: '700', fontVariant: ['tabular-nums'] },
  boostNote: { color: colors.gris, fontSize: 11, lineHeight: 15, marginTop: 1 },
  // ── Contribution + Crew Wall (§14/§28) ──
  contribCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
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
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  wallCheckboxOn: { backgroundColor: gameColors.crew, borderColor: gameColors.crew },
  wallCheckDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.noir },
  wallToggleText: { flex: 1 },
  wallToggleLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  wallToggleSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, lineHeight: 16 },
  wall: {
    backgroundColor: colors.carbone2,
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
  // ── Chat actionnable (A.2) : filtres en chips ──
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  filterChipActive: { backgroundColor: colors.carbone2, borderColor: colors.blanc },
  filterLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700' },
  filterLabelActive: { color: colors.blanc },
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
  seeAllBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  seeAllLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Carte d'action « À FAIRE » : type + zone + infos + 1 CTA plein ──
  actionList: { gap: 10 },
  actionCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 12,
  },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone2,
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
  // ── Carte de DON (A.4) : kicker + effet + réactions Merci/Respect/Bien joué ──
  giftCard: {
    backgroundColor: colors.carbone,
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
    backgroundColor: colors.carbone2,
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
  giftReact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  giftReactMine: { borderColor: gameColors.crew },
  giftReactLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  giftReactLabelMine: { color: gameColors.crew },
  giftReactCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  giftThanks: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600', marginTop: 2 },
  giftCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 10,
  },
  giftCtaLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  // ── Chat : fil de discussion (bulles) ──
  thread: { marginTop: 4, gap: 12 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingRight: 32 },
  bubbleRowMe: { alignItems: 'flex-end', paddingLeft: 40 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
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
  bubble: {
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 8,
  },
  composerInput: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.35,
    maxHeight: 110,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: gameColors.crew },
  sendBtnIdle: {
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  // ── War Log ──
  feedItem: { marginBottom: 12 },
  feedReactions: { paddingHorizontal: 4 },
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
