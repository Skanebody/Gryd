/**
 * GRYD — onglet MISSIONS (AMENDEMENT-29 : ex-War Room recadrée « choisir une
 * mission » ; la coordination crew reste accessible depuis Crew). Dashboard
 * compact (AMENDEMENT-17 §1.3 + AMENDEMENT-22) : « Un écran = une action. » Les
 * 3 priorités du crew sont comprises SANS scroller — URGENT (défense critique) ·
 * ACTIF (conquête collective) · À TERMINER (frontières ouvertes) + COFFRE. Cet
 * écran ne fait que présenter les missions ; le bouton d'action flottant
 * (AMENDEMENT-29, layout) porte l'intention de course, et chaque mission garde
 * son action inline scopée à l'item (§A.4 : pas de 2ᵉ gros CTA en doublon).
 *
 * PROFONDEUR (AMENDEMENT-22, « UI en scènes ») : le fond noir est de l'ESPACE.
 * UNE seule vraie surface (N1) — la card URGENTE, seule à porter un contour
 * (état d'alerte). Tout le reste vit en LIGNES compactes posées sur l'espace,
 * sans cadre : icône N2 + titre + CHIFFRE grand + une action LÉGÈRE au bout.
 * UN SEUL gros CTA chartreuse (« DÉFENDRE ») ; les autres missions s'agissent
 * d'un tap sur la ligne (action légère à droite, pas de bouton plein). Sous le
 * fold, sections REPLIÉES (Objectifs / Routes / Scout / Historique), une seule
 * ouverte à la fois. Rien n'est câblé : données démo DÉTERMINISTES
 * (features/warroom/demo). Aucun nombre magique : seuils/paliers depuis
 * @klaim/shared.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  OFFENSIVE_DURATION_H,
  SKILLS_BY_ID,
  borderState,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  skillIconName,
  type IconName,
  type SkillDef,
  type SkillFamilyId,
} from '@klaim/shared';
import { contributeToRaid, useCrewRaid, type RaidView } from '../../src/features/crew/raid';
import {
  clearRevanche,
  useCrewRevanche,
  type RevancheView,
} from '../../src/features/crew/revanche';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import {
  InlineRunCTA,
  StatePill,
  WarEventCard,
  type WarEventReaction,
} from '../../src/ui/game';
import {
  chestStateFor,
  CHEST_TIER_LABELS,
  CREW_ROLE_LABELS,
  roleCan,
} from '../../src/features/crew/rules';
import { MY_CREW } from '../../src/features/crew/demo';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import {
  DEFENSE_MISSION,
  MISSIONS,
  OFFENSIVE,
  OPEN_BOUNDARIES,
  SCOUT_REPORTS,
  WAR_HISTORY,
  WAR_ROUTES,
  WAR_STATUS,
  type OpenBoundaryDemo,
  type WarHistoryEventDemo,
} from '../../src/features/warroom/demo';
import { useWarRoomLive } from '../../src/features/warroom/useWarRoomLive';
import {
  BONUS_ICON,
  MAP_BONUS_CONTEXT,
  bonusEffectLabelDemo,
  selectMapBonus,
  type SelectedBonusDemo,
} from '../../src/features/map/demo';

// ============================================================================
// RECO PAR SKILL (AMENDEMENT-23 §C, doc §29) — « le bon membre pour la mission »
// ============================================================================
/**
 * La War Room RECOMMANDE un membre du crew pour une mission d'après son SKILL
 * dominant (doc §29 : « KORO recommandé · Finisher II · 620 m restants »). Le
 * skill ORIENTE seulement — il ne donne JAMAIS de territoire/point/victoire
 * (anti pay-to-win §C) : c'est un signal de reconnaissance, la décision reste
 * humaine (et serveur pour tout claim).
 *
 * SOURCE UNIQUE : la reco réutilise le catalogue GELÉ `SKILLS` de @klaim/shared
 * (seuils I/II/III) et les MÊMES compteurs de stats que les badges
 * (LifetimeStats). La dérivation `deriveMemberSkill` est PURE et ré-implémentée
 * ICI — Metro ne résout pas les imports Deno `.ts` de `@klaim/engine`, exactement
 * comme le catalogue badges client et la section Skills du Profil. Aucun nombre
 * magique local : niveaux, roman et « restants » sortent du catalogue.
 */

/** Compteurs de skill démo d'UN membre (sous-ensemble de LifetimeStats §C). */
type MemberSkillStats = Partial<Record<SkillFamilyId, number>>;

/**
 * Stats de skill DÉMO par membre (déterministes), cohérentes avec leur rôle
 * clan et leur dernière action (features/crew/demo). Clé = famille, valeur = le
 * compteur LifetimeStats de cette famille (ex. `defender` = zones défendues).
 * Toute famille absente = 0 (skill verrouillé, jamais « à venir »). TODO(O1) :
 * brancher user_stats réels (mêmes compteurs que les badges).
 */
const MEMBER_SKILL_STATS: Record<string, MemberSkillStats> = {
  // KORO — fondateur offensif : gros volume de captures + boucles fermées → il
  // est le meilleur FINISHER du crew (620 m à fermer sur République, doc §29).
  KORO: { finisher: 58, conqueror: 720, defender: 24, streak_runner: 6 },
  // LENA_RUN — co-cap stratège : mène les offensives + défend beaucoup, et
  // ferme des boucles avec régularité → meilleur Finisher DISPO (KORO = moi) :
  // 31 boucles fermées = Finisher II (≥ 25, < 100), reco de fermeture doc §29.
  LENA_RUN: { defender: 96, strategist: 7, finisher: 31, conqueror: 410 },
  // MOLOKAÏ — capitaine terrain : conquête + défense soutenue.
  MOLOKAÏ: { conqueror: 540, defender: 61, finisher: 12 },
  // JOG.PARMENTIER — dispo défense : LE défenseur du crew (Defender III).
  'JOG.PARMENTIER': { defender: 152, finisher: 8, streak_runner: 12 },
  // PACER·20E — scout : découvre le terrain, ouvre des routes.
  'PACER·20E': { scout: 74, route_maker: 11, finisher: 4 },
  // TOUTDROIT — régulier : Streak Runner, entraide crew.
  TOUTDROIT: { streak_runner: 14, supporter: 27, finisher: 6 },
  // NOX.11 — rookie : quasiment tout à 0 (skills verrouillés, normal).
  'NOX.11': { supporter: 3 },
};

/** Compteur de skill démo d'un membre pour une famille (0 par défaut). */
function memberSkillValue(pseudo: string, id: SkillFamilyId): number {
  return Math.max(0, MEMBER_SKILL_STATS[pseudo]?.[id] ?? 0);
}

/** État dérivé du skill d'UN membre pour la reco (miroir DerivedSkill engine). */
interface MemberSkillReco {
  pseudo: string;
  def: SkillDef;
  /** Niveau atteint : 0 = verrouillé … 3 = III. */
  level: 0 | 1 | 2 | 3;
  /** Chiffre romain du niveau atteint ('I'|'II'|'III'), vide si verrouillé. */
  roman: string;
  /** Progression [0..1] à l'intérieur du niveau courant (départage la reco). */
  progress: number;
}

/**
 * Dérive le skill d'un membre pour une famille (PURE, mêmes règles que
 * l'engine) : niveau = nombre de seuils GELÉS franchis, progression linéaire
 * dans le niveau courant. Bornes strictement croissantes garanties par le
 * catalogue → span > 0.
 */
function deriveMemberSkill(pseudo: string, def: SkillDef): MemberSkillReco {
  const value = memberSkillValue(pseudo, def.id);
  const thresholds = def.levels.map((l) => l.threshold);
  let level = 0;
  for (const t of thresholds) if (value >= t) level += 1;
  const rank = Math.min(level, 3) as 0 | 1 | 2 | 3;
  const currentThreshold = rank > 0 ? thresholds[rank - 1]! : 0;
  const nextThreshold = rank >= 3 ? null : thresholds[rank]!;
  const roman = rank > 0 ? def.levels[rank - 1]!.roman : '';
  let progress = 1;
  if (nextThreshold !== null) {
    const span = nextThreshold - currentThreshold;
    progress = span > 0 ? Math.min(1, Math.max(0, (value - currentThreshold) / span)) : 0;
  }
  return { pseudo, def, level: rank, roman, progress };
}

/**
 * Meilleur membre du crew pour une famille de skill (reco de mission). Tri
 * identique à `rankSkillsForRecommendation` (engine) : niveau atteint le plus
 * haut d'abord, puis progression dans le niveau la plus avancée, puis l'ordre
 * démo du crew (stable). Ignore MOI (on recommande un COÉQUIPIER) et tout
 * niveau 0 (pas de reco creuse). null si personne n'a le skill.
 */
function recommendMemberFor(id: SkillFamilyId): MemberSkillReco | null {
  const def = SKILLS_BY_ID.get(id);
  if (!def) return null;
  const ranked = MY_CREW.members
    .filter((m) => !m.me)
    .map((m) => deriveMemberSkill(m.pseudo, def))
    .filter((r) => r.level > 0)
    .sort((a, b) => b.level - a.level || b.progress - a.progress);
  return ranked[0] ?? null;
}

/** Décompte h:mm:ss depuis un total de secondes (mono, tabular-nums). */
function formatCountdown(totalS: number): string {
  const clamped = Math.max(0, totalS);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Compte à rebours ANIMÉ : tick chaque seconde (1000 ms = unité de temps,
 * pas une constante de jeu), plancher à 0. Info temporelle — reste actif
 * même en reduce motion (lisibilité, pas décoratif).
 */
function useCountdown(initialS: number): string {
  const [left, setLeft] = useState(initialS);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  return formatCountdown(left);
}

/**
 * Tick minute qui force un re-render (60 000 ms = unité de temps, pas une
 * constante de jeu). Les cartes Raid (48 h) et Revanche (24 h) se lisent à la
 * minute : ce tick rafraîchit le `new Date()` capturé par les stores (statut,
 * heures restantes) sans faire clignoter les secondes. Actif même en reduce
 * motion (info temporelle, pas décoratif).
 */
function useMinuteTick(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

/**
 * Fenêtre en HEURES lisible depuis un total d'heures fractionnaire (Raid /
 * Revanche) : « 44 h » ou « 22 h 10 » (h + min quand la partie minute compte),
 * jamais de seconde. Sous l'heure → « 12 min ». Plancher « Expire » à 0.
 */
function formatHoursWindow(totalH: number): string {
  const totalMin = Math.max(0, Math.round(totalH * 60));
  if (totalMin <= 0) return 'Expire';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

/**
 * Fenêtre d'expiration lisible d'une frontière (AMENDEMENT-17 §CH2) : « 23 h 14 »
 * (heures + minutes, JAMAIS de seconde — le TTL 24 h se lit à la minute, pas au
 * tic). Sous l'heure → « 14 min ». Plancher « Expire » quand échu.
 */
function formatBoundaryWindow(totalMin: number): string {
  const clamped = Math.max(0, totalMin);
  if (clamped <= 0) return 'Expire';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

/**
 * Décompte d'une frontière à la MINUTE : tick chaque 60 s (60 000 ms = unité de
 * temps, pas une constante de jeu), plancher à 0. Le TTL des frontières se vit
 * en heures — inutile (et anxiogène) de faire clignoter les secondes.
 */
function useBoundaryCountdown(initialMin: number): string {
  const [left, setLeft] = useState(initialMin);
  useEffect(() => {
    const id = setInterval(() => setLeft((m) => (m > 0 ? m - 1 : 0)), 60_000);
    return () => clearInterval(id);
  }, []);
  return formatBoundaryWindow(left);
}

const MISSION_ICON: Record<string, IconName> = {
  quotidienne: 'mission',
  hebdomadaire: 'serie',
  crew: 'crew',
};

/**
 * Pont d'identifiants frontière (démo) — AMENDEMENT-17 §CH2. La War Room liste
 * ses frontières ouvertes avec des ids `pb_*` (OPEN_BOUNDARIES), mais Course Live
 * résout la frontière à terminer via `partialBoundaryById(param)` qui ne connaît
 * QUE les ids `PARTIAL_BOUNDARIES_DEMO` (`republique` | `canal`). Sans mapping,
 * tout `pb_*` retombe silencieusement sur la 1re frontière (République) → l'écran
 * de complétion ouvre la MAUVAISE zone. On mappe donc chaque frontière War Room
 * (par ZONE) vers l'id partiel correspondant ; les frontières sans jumelle
 * serveur en démo (Jaurès, Belleville) renvoient `null` → l'appelant donne un
 * retour honnête plutôt que d'ouvrir une autre zone. TODO(O1) : source unique
 * `partial_boundaries` (l'id War Room = l'id serveur, mapping supprimé).
 */
const BOUNDARY_ID_TO_PARTIAL: Record<string, string> = {
  pb_republique_koro: 'republique',
};

/** Param `boundary=` résolvable par Course Live pour une frontière, sinon null. */
function partialBoundaryParamFor(boundaryId: string): string | null {
  return BOUNDARY_ID_TO_PARTIAL[boundaryId] ?? null;
}

// ============================================================================
// Primitives compactes (UI EN SCÈNES — lignes posées sur l'espace)
// ============================================================================

/**
 * En-tête de section repliable : icône + libellé + chevron animé par rotation.
 * Anti-scroll : tout ce qui n'est pas priorité vit replié, une seule ouverte
 * suffit à explorer. Aucun cadre — la section se pose sur l'espace.
 */
function SectionToggle({
  icon,
  label,
  open,
  onToggle,
  count,
}: {
  icon: IconName;
  label: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${open ? 'Replier' : 'Déplier'} ${label}`}
      accessibilityState={{ expanded: open }}
      onPress={() => {
        haptics.light();
        onToggle();
      }}
      style={({ pressed }) => [styles.sectionToggle, pressed && styles.pressed]}
    >
      <Icon name={icon} size={15} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
      {count !== undefined ? <Text style={styles.sectionCount}>{count}</Text> : null}
      <View style={styles.sectionSpacer} />
      <View style={[styles.chevron, open && styles.chevronOpen]}>
        <Icon name="chevron" size={16} color={colors.gris} />
      </View>
    </Pressable>
  );
}

/**
 * HERO urgent — LA seule vraie surface (N1) de l'écran, seule à porter un
 * contour (état d'alerte, N3). 1 kicker + 1 titre + 1 gros chiffre + 1 phrase +
 * LE seul gros CTA chartreuse « DÉFENDRE ». Le détail descend au tap sur la card.
 */
function UrgentHero({
  icon,
  kicker,
  title,
  metric,
  phrase,
  cta,
  onPress,
  onCta,
  onLongPressCta,
}: {
  icon: IconName;
  kicker: string;
  title: string;
  metric: string;
  phrase: string;
  cta: string;
  onPress?: () => void;
  onCta: () => void;
  onLongPressCta?: () => void;
}) {
  const accent = gameColors.danger;
  return (
    <View style={styles.hero}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${title} — voir le détail` : undefined}
        disabled={!onPress}
        onPress={
          onPress
            ? () => {
                haptics.light();
                onPress();
              }
            : undefined
        }
        style={({ pressed }) => [styles.heroHead, pressed && onPress && styles.pressed]}
      >
        <View style={styles.heroIcon}>
          <Icon name={icon} size={20} color={accent} />
        </View>
        <View style={styles.heroHeadText}>
          <Text style={[styles.heroKicker, { color: accent }]} numberOfLines={1}>
            {kicker}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={[styles.heroMetric, { color: accent }]} numberOfLines={1}>
          {metric}
        </Text>
      </Pressable>
      <Text style={styles.heroPhrase} numberOfLines={2}>
        {phrase}
      </Text>
      <View style={styles.heroCta}>
        <InlineRunCTA
          label={cta}
          size="md"
          variant="primary"
          onPress={onCta}
          onLongPress={onLongPressCta}
        />
      </View>
    </View>
  );
}

/**
 * Ligne de mission COMPACTE (AMENDEMENT-22) — posée sur l'espace, SANS cadre :
 * icône N2 + kicker/titre + CHIFFRE grand + barre optionnelle + une action
 * LÉGÈRE (label + chevron, pas un bouton plein — le seul gros CTA reste le HERO).
 * Toute la ligne est tappable = agir ; longpress optionnel (assigner/proposer).
 */
function MissionLine({
  icon,
  tint,
  kicker,
  title,
  metric,
  phrase,
  progress,
  action,
  onPress,
  onLongPress,
}: {
  icon: IconName;
  tint: string;
  kicker: string;
  title: string;
  metric: string;
  phrase?: string;
  progress?: number;
  action: string;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${action}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}
    >
      <View style={styles.lineHead}>
        <View style={styles.lineIcon}>
          <Icon name={icon} size={18} color={tint} />
        </View>
        <View style={styles.lineHeadText}>
          <Text style={[styles.lineKicker, { color: tint }]} numberOfLines={1}>
            {kicker}
          </Text>
          <Text style={styles.lineTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={[styles.lineMetric, { color: tint }]} numberOfLines={1}>
          {metric}
        </Text>
      </View>
      {phrase ? (
        <Text style={styles.linePhrase} numberOfLines={1}>
          {phrase}
        </Text>
      ) : null}
      {progress !== undefined ? (
        <View style={styles.lineGauge}>
          <ProgressBar value={progress} height={6} />
        </View>
      ) : null}
      <View style={styles.lineAction}>
        <Text style={[styles.lineActionLabel, { color: tint }]} numberOfLines={1}>
          {action}
        </Text>
        <Icon name="chevron" size={15} color={tint} />
      </View>
    </Pressable>
  );
}

/**
 * RAID WEEKEND (AMENDEMENT-34 §DELTA-CLASH) — LE format Clash « Raid Weekend »
 * rendu GRYD : une offensive collective à fenêtre courte avec une barre de
 * progression PERSISTANTE et PARTAGÉE. « Reprendre les quais · 620 / 1000 zones ·
 * 48 h restantes ». Chacun contribue, la barre reste et monte pour tout le crew.
 *
 * §A : 1 décision (rejoindre le raid) + 1 SEUL CTA plein (« REJOINDRE » — le raid
 * EST une conquête, il mérite le gros CTA de sa card). Liste COURTE de
 * contributeurs (têtes de pont), jamais 50 lignes. Textes non tronqués. Anti
 * pay-to-win : rejoindre ne donne aucun territoire/point — c'est le run normal
 * mis en scène dans le temps (le claim reste serveur).
 */
function RaidWeekendCard({
  raid,
  onJoin,
}: {
  raid: RaidView;
  onJoin: () => void;
}) {
  const window = formatHoursWindow(raid.hoursLeft);
  const done = raid.status === 'complete';
  const expired = raid.status === 'expired';
  // La barre est le héros : titre + « pris / cible zones · fenêtre » sous elle.
  // On montre 3 contributeurs max (têtes de pont) — signal de densité, pas un
  // classement (§C : jamais tous les runners).
  const top = raid.contributors.slice(0, 3);
  // Libellé du CTA : REJOINDRE si je n'ai pas encore couru, COURIR ENCORE si oui
  // (chacun contribue plusieurs fois, la barre reste). Jamais tronqué.
  const ctaLabel = done ? 'RAID GAGNÉ' : raid.joined ? 'COURIR ENCORE' : 'REJOINDRE';
  const statusLine = done
    ? 'Objectif atteint — le crew a repris la zone.'
    : expired
      ? 'Fenêtre close. Prochaine offensive bientôt.'
      : `${formatInt(raid.progress)} / ${formatInt(raid.target)} zones · ${window} restantes`;
  return (
    <View style={styles.raid}>
      <View style={styles.raidHead}>
        <View style={styles.lineIcon}>
          <Icon name="raid" size={18} color={gameColors.crew} />
        </View>
        <View style={styles.lineHeadText}>
          <Text style={styles.lineKicker} numberOfLines={1}>
            RAID WEEKEND · CREW
          </Text>
          <Text style={styles.lineTitle} numberOfLines={1}>
            {raid.title}
          </Text>
        </View>
        <Text style={[styles.raidPct, { color: gameColors.crew }]} numberOfLines={1}>
          {Math.round(raid.pct * 100)} %
        </Text>
      </View>
      {/* Barre COLLECTIVE persistante — le cœur du format Clash. */}
      <View style={styles.raidGauge}>
        <ProgressBar value={raid.pct} height={8} />
      </View>
      <Text style={styles.raidStatus} numberOfLines={1}>
        {statusLine}
      </Text>
      {/* Contributeurs (têtes de pont) — liste courte, jamais tout le crew. */}
      {top.length > 0 ? (
        <View style={styles.raidContribs}>
          {top.map((c) => (
            <Text
              key={c.pseudo}
              style={[styles.raidContrib, c.me && styles.raidContribMe]}
              numberOfLines={1}
            >
              {c.me ? 'Toi' : c.pseudo} {formatInt(c.zones)}
            </Text>
          ))}
        </View>
      ) : null}
      {/* 1 SEUL CTA de la card : rejoindre le raid (désactivé si clos/gagné). */}
      <View style={styles.raidCta}>
        <InlineRunCTA
          label={ctaLabel}
          size="md"
          variant="primary"
          disabled={done || expired}
          onPress={onJoin}
        />
      </View>
    </View>
  );
}

/**
 * MISSION REVANCHE (AMENDEMENT-34 §DELTA-CLASH) — « rendre la pareille ». Un
 * rival a repris ton secteur : mission URGENTE avec compte à rebours 24 h et
 * 1 CTA [REPRENDRE]. Style ALERTE (contour rival), comme le HERO urgent mais
 * pour l'offensive de reprise. §A : 1 décision + 1 CTA. On ne révèle QUE le
 * secteur + le crew rival (jamais la position exacte, §C). Anti pay-to-win : la
 * reprise ne donne que les points NORMAUX de vol (§3.4) — la revanche est un
 * marqueur social/statut, pas un bonus.
 */
function RevancheMissionCard({
  revanche,
  onReprendre,
  onDismiss,
}: {
  revanche: RevancheView;
  onReprendre: () => void;
  onDismiss?: () => void;
}) {
  const window = formatHoursWindow(revanche.hoursLeft);
  const accent = gameColors.rival;
  return (
    <View style={styles.revanche}>
      <View style={styles.revancheHead}>
        <View style={styles.heroIcon}>
          <Icon name="cible" size={20} color={accent} />
        </View>
        <View style={styles.heroHeadText}>
          <Text style={[styles.heroKicker, { color: accent }]} numberOfLines={1}>
            REVANCHE · {window}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {revanche.sector}
          </Text>
        </View>
        <Text style={[styles.heroMetric, { color: accent }]} numberOfLines={1}>
          -{formatInt(revanche.zonesLost)}
        </Text>
      </View>
      <Text style={styles.heroPhrase} numberOfLines={2}>
        {revanche.rivalCrew} a repris {formatInt(revanche.zonesLost)} zones sur{' '}
        {revanche.sector}. Va les reprendre — la fenêtre ferme dans {window}.
      </Text>
      <View style={styles.revancheCta}>
        <View style={styles.revancheCtaMain}>
          <InlineRunCTA
            label="REPRENDRE"
            size="md"
            variant="primary"
            onPress={onReprendre}
          />
        </View>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Laisser filer cette revanche"
            onPress={() => {
              haptics.light();
              onDismiss();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.revancheDismiss, pressed && styles.pressed]}
          >
            <Text style={styles.revancheDismissLabel}>Laisser filer</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Ligne compacte d'une frontière ouverte « À TERMINER » (AMENDEMENT-17 §CH2 +
 * AMENDEMENT-22). « Ouvre une frontière. Ton crew peut la fermer. » On n'affiche
 * QUE l'humain : zone · mètres restants · fenêtre (h mm, décompte live) · ouvreur.
 * Posée sur l'espace, sans cadre. Toute la ligne = agir (terminer) ; l'ouverture
 * de la route reste une action LÉGÈRE au bout (icône + label). Jamais de polyline,
 * de score de géométrie ni de % (§UX-17).
 */
function BoundaryLine({
  boundary,
  onSeeRoute,
  onComplete,
}: {
  boundary: OpenBoundaryDemo;
  onSeeRoute: () => void;
  onComplete: () => void;
}) {
  const window = useBoundaryCountdown(boundary.expiresInMin);
  // Container NON interactif (règle DOM web : pas de bouton dans un bouton) : les
  // deux actions vivent en SIBLINGS au bas de la ligne — « Route » (légère) et
  // « Terminer » (l'action forte de la frontière, label + chevron, pas un bouton
  // plein : le seul gros CTA de l'écran reste le HERO « DÉFENDRE »).
  return (
    <View style={styles.line}>
      <View style={styles.lineHead}>
        <View style={styles.lineIcon}>
          <Icon name="avantposte" size={18} color={gameColors.crew} />
        </View>
        <View style={styles.lineHeadText}>
          <Text style={styles.lineTitle} numberOfLines={1}>
            {boundary.zone}
          </Text>
          <Text style={styles.lineSub} numberOfLines={1}>
            {boundary.opener} · expire {window}
          </Text>
        </View>
        <Text style={[styles.lineMetricSm, { color: gameColors.crew }]} numberOfLines={1}>
          {formatInt(boundary.missingM)} m
        </Text>
      </View>
      <View style={styles.lineAction}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Voir la route de ${boundary.zone}`}
          onPress={() => {
            haptics.light();
            onSeeRoute();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.lineGhost, pressed && styles.pressed]}
        >
          <Icon name="route" size={15} color={colors.gris} />
          <Text style={styles.lineGhostLabel}>Route</Text>
        </Pressable>
        <View style={styles.lineActionSpacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${boundary.zone} — terminer la boucle`}
          onPress={() => {
            haptics.medium();
            onComplete();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.lineActionBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.lineActionLabel, { color: gameColors.crew }]} numberOfLines={1}>
            Terminer
          </Text>
          <Icon name="chevron" size={15} color={gameColors.crew} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * LIGNE « Bonus crew actif » (AMENDEMENT-19 §4 + AMENDEMENT-22) : la War Room
 * montre UN SEUL bonus CREW, le plus pertinent. « GRYD révèle le bon moment » :
 * ligne compacte, glow chartreuse doux (gain, jamais menace) = famille + effet
 * COURT non tronqué (« Coffre +25 % pendant 24 h »), tap = action de la fiche.
 * Reward JAMAIS territoire/points/rang. Aucun bonus → rien (le parent ne monte
 * pas la ligne).
 */
function CrewBonusLine({
  bonus,
  onAct,
}: {
  bonus: SelectedBonusDemo;
  onAct: () => void;
}) {
  const def = bonus.def;
  // « +25 % coffre crew » → phrase courte « Coffre +25 % pendant 24 h ».
  const effect = bonusEffectLabelDemo(def);
  const during = `pendant ${def.durationH} h`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${def.name} — ${def.cta}`}
      onPress={onAct}
      style={({ pressed }) => [styles.bonusLine, pressed && styles.pressed]}
    >
      <View style={styles.lineHead}>
        <View style={styles.lineIcon}>
          <Icon name={BONUS_ICON[def.id]} size={18} color={gameColors.crew} />
        </View>
        <View style={styles.lineHeadText}>
          <Text style={styles.lineKicker} numberOfLines={1}>
            BONUS CREW ACTIF
          </Text>
          <Text style={styles.lineTitle} numberOfLines={1}>
            {def.name}
          </Text>
        </View>
        <Icon name="chevron" size={16} color={gameColors.crew} />
      </View>
      <Text style={styles.linePhrase} numberOfLines={2}>
        {effect} {during}. {def.copy.body}
      </Text>
    </Pressable>
  );
}

/**
 * Événement d'historique avec réactions GRYD togglables localement (démo :
 * l'état vit dans le composant, déterministe au montage depuis demo.ts).
 */
function HistoryEvent({ event }: { event: WarHistoryEventDemo }) {
  const [reactions, setReactions] = useState<readonly WarEventReaction[]>(
    () => event.reactions.map((r) => ({ ...r })),
  );
  const toggle = (icon: IconName) => {
    setReactions((prev) =>
      prev.map((r) =>
        r.icon === icon
          ? { ...r, mine: !r.mine, count: Math.max(0, r.count + (r.mine ? -1 : 1)) }
          : r,
      ),
    );
  };
  return (
    <WarEventCard
      icon={event.icon}
      message={event.message}
      zone={event.zone}
      points={event.points}
      minutesAgo={event.minutesAgo}
      tint={gameColors[event.tint]}
      reactions={reactions}
      onReact={toggle}
    />
  );
}

/** Lien discret « Voir tout » quand une section a plus de 2 lignes. */
function SeeAll({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
    >
      <Text style={styles.seeAllLabel}>{label}</Text>
      <Icon name="chevron" size={14} color={colors.chartreuse} />
    </Pressable>
  );
}

/** Titre de section léger posé sur l'espace (icône + label + compteur), sans cadre. */
function SectionHead({
  icon,
  label,
  tint = colors.gris,
  count,
}: {
  icon: IconName;
  label: string;
  tint?: string;
  count?: number;
}) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={15} color={tint} />
      <Text style={styles.sectionLabel}>{label}</Text>
      {count !== undefined && count > 0 ? (
        <Text style={styles.sectionCount}>{count}</Text>
      ) : null}
    </View>
  );
}

/**
 * RECO PAR SKILL (doc §29) — UNE ligne SOBRE posée sous la mission (pas de card :
 * ni cadre, ni pastille d'icône, ni bouton). « <nom> · <Skill> <roman> [· <reste>] ».
 * Icône filaire de la famille en tête (skillIconName), teinte = celle de la
 * mission portée. Le skill ORIENTE, il ne donne AUCUN pouvoir territorial :
 * aucun point/gain n'est affiché. Un tap = agir (assigner/proposer selon les
 * droits) ; sans handler la ligne est purement informative. Non tronquée.
 */
function SkillRecoLine({
  reco,
  tint,
  trailing,
  onPress,
}: {
  reco: MemberSkillReco;
  tint: string;
  /** Suffixe optionnel non tronqué, ex. « 620 m restants » (reste de la MISSION). */
  trailing?: string;
  onPress?: () => void;
}) {
  const label = `${reco.pseudo} · ${reco.def.name} ${reco.roman}`;
  const content = (
    <>
      <View style={styles.recoIcon}>
        <Icon name={skillIconName(reco.def.id) as IconName} size={15} color={tint} />
      </View>
      {/* 2 lignes MAX : l'info (nom · skill · reste) ne doit JAMAIS être coupée
          (pet peeve « texte tronqué ») — sur écran étroit elle passe à la ligne. */}
      <Text style={styles.recoLabel} numberOfLines={2}>
        <Text style={styles.recoPrefix}>Recommandé </Text>
        {label}
        {trailing ? <Text style={styles.recoTrailing}> · {trailing}</Text> : null}
      </Text>
    </>
  );
  if (!onPress) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`Recommandé pour cette mission : ${label}${trailing ? ` · ${trailing}` : ''}`}
        style={styles.recoRow}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Proposer la mission à ${reco.pseudo} — ${reco.def.name} ${reco.roman}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.recoRow, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

// ============================================================================
// Écran
// ============================================================================

type OpenSection = 'objectifs' | 'routes' | 'scout' | 'historique' | null;

export default function WarRoomScreen() {
  const toast = useToast();
  const {
    defenseMission: liveDefense,
    offensive: liveOffensive,
    openBoundaries: liveBoundaries,
    crewRank: liveCrewRank,
    chest: liveChest,
    loading: warLoading,
  } = useWarRoomLive();
  // Une seule section ouverte à la fois (anti-scroll) — tout replié au montage.
  const [open, setOpen] = useState<OpenSection>(null);
  const toggle = (s: Exclude<OpenSection, null>) =>
    setOpen((cur) => (cur === s ? null : s));

  // Tick minute : rafraîchit le `now` des stores Raid (48 h) et Revanche (24 h)
  // → statut + heures restantes à jour, sans faire clignoter les secondes.
  useMinuteTick();

  // RAID WEEKEND + REVANCHE (AMENDEMENT-34) : stores démo persistants, moteur
  // miroiré. La barre du raid est COLLECTIVE et reste ; la revanche est une
  // mission URGENTE à fenêtre 24 h qui disparaît d'elle-même une fois expirée.
  const { raid } = useCrewRaid();
  const { revanche } = useCrewRevanche();

  useEffect(() => {
    screen('war_room');
  }, []);

  // ACTIF — conquête collective : progression + reste + compte à rebours animé.
  const offensivePct =
    liveOffensive !== null && liveOffensive.objectiveHexes > 0
      ? liveOffensive.hexesTaken / liveOffensive.objectiveHexes
      : 0;
  const offensiveLeft =
    liveOffensive !== null ? liveOffensive.objectiveHexes - liveOffensive.hexesTaken : 0;
  const offensiveTimeLeft = useCountdown(liveOffensive?.remainingS ?? 0);

  // COFFRE — état/palier DÉRIVÉS de chestStateFor (source unique = Crew HQ).
  const chestProgress = liveChest?.progress ?? 0;
  const chestPct = chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chest = chestStateFor(chestPct);
  const nextTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);
  const chestRemaining = Math.max(0, CREW_CHEST_WEEKLY_TARGET - chestProgress);

  // À TERMINER — frontières ouvertes (résumé ; détail au chantier 2).
  const firstBoundary = liveBoundaries[0];

  // RECO PAR SKILL (doc §29) — le bon COÉQUIPIER pour chaque mission, dérivé du
  // catalogue GELÉ. Défense urgente → meilleur Defender ; fermeture de frontière
  // → meilleur Finisher (le « X m restants » est le RESTE DE LA FRONTIÈRE, pas
  // du skill : « KORO recommandé · Finisher II · 620 m restants »). Anti
  // pay-to-win : ORIENTE seulement, aucun gain territorial affiché.
  const defenseReco = useMemo(() => recommendMemberFor('defender'), []);
  const finisherReco = useMemo(() => recommendMemberFor('finisher'), []);

  // Membre à assigner sur la défense (démo : première DISPO correspondante).
  const assignee = useMemo(
    () =>
      liveDefense
        ? MY_CREW.members.find(
            (m) => m.availability === liveDefense.assignedAvailability && !m.me,
          )
        : undefined,
    [liveDefense],
  );

  // Gating visuel par MON rôle démo (matrice §8) — le serveur reste seul juge.
  const myRole = MY_CREW.members.find((m) => m.me)?.role ?? 'runner';
  const canLaunch = roleCan(myRole, 'launchOffensive');
  const canAssign = roleCan(myRole, 'assignDefense');

  const openMap = () => router.push('/(tabs)');

  /**
   * BONUS CREW de la War Room (AMENDEMENT-19 §4) : UN SEUL bonus, le plus
   * pertinent CREW (selectBonus(context, 'war_room') — défense > finisher >
   * coffre). Rien de pertinent → aucune ligne (pas de placeholder). Tap = agir
   * selon le CTA de la fiche. Toast anti-abus : la récompense reste tranchée
   * serveur, ici on route vers l'action.
   */
  const crewBonus = selectMapBonus(MAP_BONUS_CONTEXT, 'war_room');
  const actCrewBonus = (bonus: SelectedBonusDemo) => {
    haptics.medium();
    screen('war_bonus_act', { bonusId: bonus.def.id });
    switch (bonus.def.id) {
      case 'defense_critical':
        toast.show(`Défense lancée — zone ${liveDefense?.zone ?? 'ta zone'}`);
        router.push('/route-planner?type=defense');
        break;
      case 'finisher': {
        const b = liveBoundaries[0];
        const param = b ? partialBoundaryParamFor(b.boundaryId) : null;
        if (b && param) {
          toast.show(`Cap sur ${b.zone} — termine la boucle du crew`);
          router.push(`/course-live?intention=complete&boundary=${param}`);
        } else {
          router.push('/route-planner');
        }
        break;
      }
      default:
        toast.show('Cap sur le coffre — cours pour le remplir');
        openMap();
    }
  };

  return (
    <>
      {/* Header MISSIONS (AMENDEMENT-29) — le TITRE porte le nom de l'écran
          (« Missions », ex-War Room, recadré « choisir une mission »). Le kicker
          reste le HUD de scène (saison · jours · ville · rang crew, doc §7) : il
          situe, sans répéter le mot « Missions » (§A.20). Titre court non tronqué. */}
      <TabScreen
        title="Missions"
        icon="guerre"
        kicker={`${WAR_STATUS.seasonLabel} · J-${WAR_STATUS.daysLeft} · ${WAR_STATUS.city} · CREW #${liveCrewRank ?? '—'}`}
        subtitle="Choisis ta prochaine mission."
      >
        {/* ================= 3 PRIORITÉS + COFFRE (sans scroll) ================= */}

        {/* URGENT — défense critique. LA seule vraie surface + LE seul gros CTA. */}
        {liveDefense ? (
          <UrgentHero
            icon="sablier"
            kicker="URGENT · DÉFENSE"
            title={liveDefense.zone}
            metric={`${liveDefense.expiresInH} h`}
            phrase={`${liveDefense.hexes > 0 ? `${liveDefense.hexes} zones expirent` : 'Des zones expirent'} dans ${liveDefense.expiresInH} h. Une course suffit pour les sauver.`}
            cta="DÉFENDRE"
            onPress={openMap}
            onCta={() => {
              haptics.medium();
              toast.show(`Défense lancée — zone ${liveDefense.zone}`);
              router.push('/route-planner?type=defense');
            }}
            onLongPressCta={
              canAssign
                ? () => {
                    toast.show(
                      assignee
                        ? `Défense proposée à ${assignee.pseudo}`
                        : 'Défense proposée au crew',
                    );
                  }
                : undefined
            }
          />
        ) : warLoading ? (
          <Text style={styles.emptyMission}>Chargement des missions…</Text>
        ) : (
          <Text style={styles.emptyMission}>
            Aucune mission urgente — pars courir ou rejoins ton crew pour lancer une offensive.
          </Text>
        )}

        {/* RECO SKILL de la défense urgente (doc §29) : le meilleur Defender du
            crew, sur UNE ligne sobre sous le HERO. Le skill ORIENTE (aucun gain
            territorial). Tap = proposer la défense à ce membre si j'en ai le droit
            (§8) ; sinon informatif. */}
        {liveDefense && defenseReco ? (
          <SkillRecoLine
            reco={defenseReco}
            tint={gameColors.danger}
            onPress={
              canAssign
                ? () => {
                    toast.show(`Défense proposée à ${defenseReco.pseudo}`);
                  }
                : undefined
            }
          />
        ) : null}

        {/* REVANCHE (AMENDEMENT-34) — un rival a repris ton secteur : mission
            URGENTE à compte à rebours 24 h, style ALERTE (contour rival), 1 CTA
            [REPRENDRE]. Disparaît d'elle-même à l'expiration de la fenêtre (le
            store renvoie null). Reprise = points NORMAUX (§3.4), jamais un bonus
            (anti pay-to-win). Position exacte du rival JAMAIS révélée (§C). */}
        {revanche ? (
          <RevancheMissionCard
            revanche={revanche}
            onReprendre={() => {
              haptics.medium();
              screen('war_revanche_reprendre', { sector: revanche.sector });
              toast.show(`Cap sur ${revanche.sector} — reprends tes zones`);
              router.push('/route-planner?type=raid');
            }}
            onDismiss={() => {
              clearRevanche();
              toast.show('Revanche laissée — la fenêtre se referme');
            }}
          />
        ) : null}

        {/* RAID WEEKEND (AMENDEMENT-34) — offensive collective à fenêtre courte
            avec barre PERSISTANTE et PARTAGÉE (« 620 / 1000 zones · 48 h »).
            Chacun contribue, la barre reste. 1 CTA [REJOINDRE] → route-planner
            mode raid ; la contribution démo fait monter la barre collective (elle
            se souvient au reload). Anti pay-to-win : le run normal mis en scène. */}
        {raid ? (
          <RaidWeekendCard
            raid={raid}
            onJoin={() => {
              haptics.medium();
              screen('war_raid_join', { raidId: raid.id });
              // Démo : ma contribution monte la barre collective persistante.
              contributeToRaid(raid.id);
              toast.show(`Raid rejoint — cap sur ${raid.zone}`);
              router.push('/route-planner?type=raid');
            }}
          />
        ) : null}

        {/* ACTIF — conquête collective (République 496/800). Ligne compacte, action
            légère « Rejoindre » (pas un second gros bouton). Le kicker évite « … » :
            durée + décompte sur la sous-ligne, pas dans le kicker. */}
        {liveOffensive ? (
          <MissionLine
            icon="raid"
            tint={gameColors.crew}
            kicker="ACTIF · CONQUÊTE"
            title={liveOffensive.zone}
            metric={`${formatInt(liveOffensive.hexesTaken)}/${formatInt(liveOffensive.objectiveHexes)}`}
            phrase={`${formatInt(offensiveLeft)} zones · ${liveOffensive.activeMembers}/${liveOffensive.totalMembers} en course · ${OFFENSIVE_DURATION_H} h · ${offensiveTimeLeft}`}
            progress={offensivePct}
            action="Rejoindre"
            onPress={() => {
              haptics.medium();
              toast.show(`Conquête collective rejointe — cap sur ${liveOffensive.zone}`);
              router.push('/route-planner?type=raid');
            }}
          />
        ) : null}

        {/* À TERMINER — frontières ouvertes du crew (AMENDEMENT-17 §CH2, boucle
            crew collaborative). « Ouvre une frontière. Ton crew peut la fermer. »
            §A règle 16 (AUTORITÉ) : 1 SEULE card visible par section — la frontière
            la plus urgente ; le reste part dans « Voir tout ». La ligne mène à
            Course Live mode terminer, la route reste une action légère. */}
        <SectionHead
          icon="avantposte"
          label="À TERMINER · FRONTIÈRES"
          tint={gameColors.crew}
          count={liveBoundaries.length}
        />
        {firstBoundary ? (
          <>
            <BoundaryLine
              boundary={firstBoundary}
              onSeeRoute={() => router.push('/route-planner')}
              onComplete={() => {
                const param = partialBoundaryParamFor(firstBoundary.boundaryId);
                if (!param) {
                  toast.show(`${firstBoundary.zone} — complétion bientôt (O1)`);
                  return;
                }
                toast.show(`Cap sur ${firstBoundary.zone} — termine la boucle du crew`);
                router.push(`/course-live?intention=complete&boundary=${param}`);
              }}
            />
            {/* RECO SKILL de fermeture (doc §29) : le meilleur Finisher du crew
                pour clôturer la 1re frontière — « KORO recommandé · Finisher II ·
                620 m restants ». Les mètres = le RESTE de la frontière (missingM),
                pas le skill. ORIENTE seulement, aucun gain affiché. Tap = proposer
                de la terminer à ce membre. */}
            {finisherReco ? (
              <SkillRecoLine
                reco={finisherReco}
                tint={gameColors.crew}
                trailing={`${formatInt(firstBoundary.missingM)} m restants`}
                onPress={() => {
                  toast.show(
                    `${firstBoundary.zone} proposée à ${finisherReco.pseudo} — à terminer`,
                  );
                }}
              />
            ) : null}
            {liveBoundaries.length > 1 ? (
              <SeeAll
                label={`Voir les ${liveBoundaries.length} frontières`}
                onPress={() => router.navigate('/crew')}
              />
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>
            Boucle un run fermable pour ouvrir une frontière que ton crew pourra
            fermer.
          </Text>
        )}

        {/* COFFRE — jauge hebdo compacte (paliers §39.2 depuis shared). Ligne, pas
            de gros bouton : le tap route vers la carte. */}
        <MissionLine
          icon="coffre"
          tint={gameColors.gold}
          kicker={
            chest.tier ? `COFFRE · ${CHEST_TIER_LABELS[chest.tier].toUpperCase()}` : 'COFFRE CREW'
          }
          title="Coffre du crew"
          metric={`${Math.round(chestPct * 100)} %`}
          phrase={
            nextTier
              ? `Encore ${formatInt(chestRemaining)} pts pour le palier ${CHEST_TIER_LABELS[nextTier]}.`
              : 'Palier max atteint cette semaine. Beau boulot.'
          }
          progress={chestPct}
          action="Remplir"
          onPress={() => {
            toast.show('Cap sur le coffre — cours pour le remplir');
            openMap();
          }}
        />

        {/* BONUS CREW ACTIF (AMENDEMENT-19 §4) : 1 SEUL bonus crew, le plus
            pertinent. « GRYD révèle le bon moment. » Rien de pertinent → rien
            d'affiché (pas de placeholder). Reward coffre/XP/protection/badge —
            jamais territoire/points/rang (tranché serveur). */}
        {crewBonus ? (
          <CrewBonusLine bonus={crewBonus} onAct={() => actCrewBonus(crewBonus)} />
        ) : null}

        {/* DEMANDER AU CREW (AMENDEMENT-18 A.3) : entrée vers le Crew Chat
            actionnable où l'on émet une requête (Défense/Terminer/Route/Scout/
            Sortie). « Demander → quelqu'un aide → le crew progresse. » Aucune
            requête ne donne de territoire ni de point (anti pay-to-win). Ligne
            légère posée sur l'espace, sans cadre. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Demander de l'aide au crew"
          onPress={() => {
            haptics.light();
            router.navigate('/crew');
          }}
          style={({ pressed }) => [styles.askRow, pressed && styles.pressed]}
        >
          <View style={styles.lineIcon}>
            <Icon name="ajoutami" size={16} color={gameColors.crew} />
          </View>
          <View style={styles.askText}>
            <Text style={styles.askTitle}>Demander au crew</Text>
            <Text style={styles.askSub} numberOfLines={1}>
              Défense · Terminer · Route · Scout
            </Text>
          </View>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>

        {/* ================= SOUS LE FOLD : sections repliées ================= */}

        {/* OBJECTIFS — Aujourd'hui / Challenges / Motivation (AMENDEMENT-07) +
            missions « À faire ». Descendu sous le fold, replié par défaut. */}
        <SectionToggle
          icon="mission"
          label="OBJECTIFS"
          open={open === 'objectifs'}
          onToggle={() => toggle('objectifs')}
          count={MISSIONS.length}
        />
        {open === 'objectifs' ? (
          <View style={styles.sectionBody}>
            {/* Rôle + permissions (matrice §8) — gating visuel, ligne sans cadre. */}
            <View style={styles.roleBanner}>
              <Icon name="couronne" size={14} color={colors.blanc} />
              <Text style={styles.roleBannerText} numberOfLines={1}>
                Ton rôle : {CREW_ROLE_LABELS[myRole]}
              </Text>
              <View style={styles.sectionSpacer} />
              <Text style={[styles.rolePerm, canLaunch ? styles.rolePermOk : styles.rolePermNo]}>
                {canLaunch ? 'Peut lancer' : 'Lancer : Co-Cap+'}
              </Text>
              <Text style={[styles.rolePerm, canAssign ? styles.rolePermOk : styles.rolePermNo]}>
                {canAssign ? 'Peut assigner' : 'Assigner : Cap+'}
              </Text>
            </View>

            {/* Accès motivation (AMENDEMENT-07 §8) — actions légères (icône + label),
                pas trois cards : un segmented visuel sur l'espace. */}
            <View style={styles.motivRow}>
              {(
                [
                  { label: "Aujourd'hui", icon: 'aujourdhui', href: '/aujourdhui' },
                  { label: 'Challenges', icon: 'mission', href: '/challenges' },
                  { label: 'Motivation', icon: 'reglages', href: '/settings-motivation' },
                ] as { label: string; icon: IconName; href: string }[]
              ).map((it) => (
                <Pressable
                  key={it.href}
                  accessibilityRole="button"
                  accessibilityLabel={it.label}
                  onPress={() => router.push(it.href)}
                  style={({ pressed }) => [styles.motivChip, pressed && styles.pressed]}
                >
                  <Icon name={it.icon} size={18} color={colors.blanc} />
                  <Text style={styles.motivLabel}>{it.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Missions « À faire » (§7.12) — lignes sur l'espace, max 2 visibles. */}
            {MISSIONS.slice(0, 2).map((m) => {
              const done = m.progress >= m.target;
              return (
                <View key={m.key} style={styles.missionRow}>
                  <View style={styles.lineIcon}>
                    <Icon
                      name={MISSION_ICON[m.kind] ?? 'mission'}
                      size={18}
                      color={done ? gameColors.crew : colors.blanc}
                    />
                  </View>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionLabel} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <View style={styles.missionGauge}>
                      <ProgressBar value={m.progress / m.target} height={6} />
                    </View>
                  </View>
                  <Text style={[styles.missionCount, done && styles.missionCountDone]}>
                    {m.progress}/{m.target}
                  </Text>
                </View>
              );
            })}
            {MISSIONS.length > 2 ? (
              <SeeAll
                label={`Voir les ${MISSIONS.length} objectifs`}
                onPress={() => router.push('/challenges')}
              />
            ) : null}
          </View>
        ) : null}

        {/* ROUTES — lignes sur l'espace, max 2 visibles, « Voir tout » au-delà. */}
        <SectionToggle
          icon="route"
          label="ROUTES"
          open={open === 'routes'}
          onToggle={() => toggle('routes')}
          count={WAR_ROUTES.length}
        />
        {open === 'routes' ? (
          <View style={styles.sectionBody}>
            {WAR_ROUTES.slice(0, 2).map((route) => {
              const isOpen = route.status === 'open';
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Voir la route ${route.label} sur la carte`}
                  onPress={openMap}
                  style={({ pressed }) => [styles.routeRow, pressed && styles.pressed]}
                >
                  <View style={styles.lineIcon}>
                    <Icon
                      name="route"
                      size={16}
                      color={isOpen ? gameColors.crew : gameColors.danger}
                    />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel} numberOfLines={1}>
                      {route.label}
                    </Text>
                    <Text style={styles.routeMeta} numberOfLines={1}>
                      {route.km.toLocaleString('fr-FR')} km
                      {route.expiresInH !== undefined ? ` · expire dans ${route.expiresInH} h` : ''}
                    </Text>
                  </View>
                  <StatePill
                    state={isOpen ? 'active' : 'decay'}
                    label={isOpen ? 'Ouverte' : 'À défendre'}
                  />
                </Pressable>
              );
            })}
            {WAR_ROUTES.length > 2 ? (
              <SeeAll
                label={`Voir les ${WAR_ROUTES.length} routes`}
                onPress={() => router.push('/route-planner')}
              />
            ) : null}
          </View>
        ) : null}

        {/* SCOUT REPORTS — renseignement agrégé, jamais de position live. */}
        <SectionToggle
          icon="scout"
          label="SCOUT REPORTS"
          open={open === 'scout'}
          onToggle={() => toggle('scout')}
          count={SCOUT_REPORTS.length}
        />
        {open === 'scout' ? (
          <View style={styles.sectionBody}>
            {SCOUT_REPORTS.slice(0, 2).map((report) => (
              <WarEventCard
                key={report.key}
                icon={report.icon}
                message={report.message}
                zone={`${report.zone} · scout ${report.scout}`}
                minutesAgo={report.minutesAgo}
                tint={gameColors[report.tint]}
                onPress={openMap}
              />
            ))}
          </View>
        ) : null}

        {/* HISTORIQUE — War Log compressé, max 2 visibles + « Voir tout ». */}
        <SectionToggle
          icon="historique"
          label="HISTORIQUE"
          open={open === 'historique'}
          onToggle={() => toggle('historique')}
          count={WAR_HISTORY.length}
        />
        {open === 'historique' ? (
          <View style={styles.sectionBody}>
            {WAR_HISTORY.slice(0, 2).map((event) => (
              <HistoryEvent key={event.key} event={event} />
            ))}
            {WAR_HISTORY.length > 2 ? (
              <SeeAll label="Voir tout l'historique" onPress={openMap} />
            ) : null}
          </View>
        ) : null}
      </TabScreen>
      <ToastHost state={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },

  // --- HERO urgent : LA seule surface N1, seul contour (état d'alerte) ---
  hero: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.danger,
    padding: 16,
    marginTop: 12,
  },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: elevation.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHeadText: { flex: 1 },
  heroKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800', marginTop: 2 },
  heroMetric: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroPhrase: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18, marginTop: 12 },
  heroCta: { marginTop: 14 },

  // --- RAID WEEKEND (AMENDEMENT-34) : card surface N1 à contour chartreuse doux
  //     (gain collectif), barre partagée en héros. Le SEUL gros CTA de SA card. ---
  raid: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
    padding: 16,
    marginTop: 12,
  },
  raidHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  raidPct: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  raidGauge: { marginTop: 14 },
  raidStatus: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  // Contributeurs : puces compactes qui s'enroulent (jamais tronquées), signal
  // de densité (têtes de pont), pas un classement.
  raidContribs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  raidContrib: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  raidContribMe: { color: colors.blanc },
  raidCta: { marginTop: 16 },

  // --- MISSION REVANCHE (AMENDEMENT-34) : card ALERTE (contour rival), même
  //     grammaire que le HERO urgent mais pour l'offensive de reprise. ---
  revanche: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.rival,
    padding: 16,
    marginTop: 12,
  },
  revancheHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  revancheCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Le CTA prend l'espace disponible ; « Laisser filer » se pose à sa droite.
  revancheCtaMain: { flex: 1 },
  // « Laisser filer » : action ultra-légère (texte gris), jamais un 2e bouton
  // plein — le seul gros CTA de la card reste « REPRENDRE ».
  revancheDismiss: { paddingVertical: 8, paddingHorizontal: 4 },
  revancheDismissLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },

  // --- Lignes de mission compactes (posées sur l'espace, SANS cadre) ---
  line: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Pastille d'icône = N2 relevé, sans contour (contour réservé aux états).
  lineIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: elevation.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineHeadText: { flex: 1 },
  lineKicker: { color: colors.gris, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  lineTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', marginTop: 2 },
  lineSub: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  lineMetric: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Chiffre grand mais compact (unité « m » qui suit) : laisse respirer la
  // sous-ligne (ouvreur + décompte) sans la tronquer (pet peeve #1).
  lineMetricSm: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  linePhrase: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  lineGauge: { marginTop: 10 },
  // Action LÉGÈRE au bout de la ligne (label + chevron), pas un bouton plein.
  lineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  lineActionLabel: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  lineActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineActionSpacer: { flex: 1 },
  // Secondaire ultra-léger (Route) : icône + label gris, sans cadre.
  lineGhost: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineGhostLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },

  // --- Reco par skill (doc §29) : ligne SOBRE sur l'espace, sans cadre ni
  //     pastille — un cran sous la mission qu'elle sert. Icône filaire + texte. ---
  recoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  // Icône alignée optiquement sur la 1re ligne du libellé (line-height 18).
  recoIcon: { marginTop: 1 },
  recoLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600', lineHeight: 18 },
  // Préfixe discret (rôle de la ligne) ; le nom + skill restent en blanc lisible.
  recoPrefix: { color: colors.gris, fontWeight: '700' },
  // Reste de la MISSION (m à fermer) en gris + tabular-nums, non tronqué.
  recoTrailing: { color: colors.gris, fontVariant: ['tabular-nums'] },

  // --- Titre de section léger (sur l'espace) ---
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    paddingVertical: 4,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2, fontWeight: '600' },
  sectionCount: {
    color: colors.gris,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 18,
    textAlign: 'center',
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  // --- État vide (frontières) : texte posé sur l'espace, pas une card ---
  emptyText: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18, marginTop: 10 },
  emptyMission: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20, marginVertical: 12 },

  // --- Bonus crew actif : ligne à glow chartreuse doux (gain, état N3) ---
  bonusLine: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
  },

  // --- Demander au crew (A.3) : ligne légère sur l'espace ---
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  askText: { flex: 1 },
  askTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  askSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },

  // --- Sections repliables ---
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    paddingVertical: 4,
  },
  sectionSpacer: { flex: 1 },
  chevron: { transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  sectionBody: { marginTop: 10, gap: 10 },

  // --- Rôle / permissions (§8) : ligne sur l'espace, sans cadre ---
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  roleBannerText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },
  rolePerm: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  rolePermOk: { color: gameColors.crew },
  rolePermNo: { color: colors.gris },

  // --- Motivation chips (AMENDEMENT-07) : actions légères, remplissent la rangée ---
  motivRow: { flexDirection: 'row', gap: 8 },
  motivChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    paddingHorizontal: 6,
  },
  motivLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },

  // --- Missions : lignes sur l'espace ---
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  missionInfo: { flex: 1 },
  missionLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  missionGauge: { marginTop: 8 },
  missionCount: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  missionCountDone: { color: gameColors.crew },

  // --- Routes : lignes sur l'espace ---
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  routeInfo: { flex: 1 },
  routeLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  routeMeta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, fontVariant: ['tabular-nums'] },

  // --- Voir tout ---
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  seeAllLabel: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },
});
