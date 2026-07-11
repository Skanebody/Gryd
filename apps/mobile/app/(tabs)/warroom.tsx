/**
 * GRYD — onglet MISSIONS (AMENDEMENT-29 : ex-War Room recadrée « choisir une
 * mission »). Zéro friction : l'écran RÉPOND « voici TA prochaine course » au
 * lieu de présenter un tableau de bord. Structure à 3 niveaux stricts :
 *  1. HUD minimal (ville · saison · J-x) — sans rang crew.
 *  2. UNE mission n°1 en pleine card — l'échéance la plus proche — avec objet,
 *     distance approx, enjeu, gain estimé et LE SEUL CTA chartreuse plein de
 *     l'écran. « URGENT » + rouge sont RÉSERVÉS aux fenêtres < 12 h.
 *  3. « Autres missions » : TOUTES les autres en LIGNES compactes triées par
 *     temps restant (source unique : UNE horloge minute pour tout l'écran),
 *     chacune avec distance + gain et une action inline légère (label +
 *     chevron) — JAMAIS un 2ᵉ bouton plein.
 * Sous le fold : coffre, bonus crew, « Demander au crew », puis sections
 * REPLIÉES (Objectifs / Routes / Rapports scout / Historique), une seule
 * ouverte à la fois. Rien n'est câblé : données démo DÉTERMINISTES
 * (features/warroom/demo + stores raid/revanche). Aucun nombre magique de jeu :
 * seuils/paliers/points depuis @klaim/shared ; les gains affichés sont des
 * ESTIMATIONS (« ≈ ») dérivées de la formule §23, jamais promises.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  ACTION_COEFF,
  CONTEXT_COEFF,
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  POINTS_BASE_PER_ZONE,
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
import { contributeToRaid, useCrewRaid } from '../../src/features/crew/raid';
import { useCrewRevanche } from '../../src/features/crew/revanche';
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
  type WarHistoryEventDemo,
} from '../../src/features/warroom/demo';
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
 * L'écran RECOMMANDE un membre du crew pour la mission n°1 d'après son SKILL
 * dominant (doc §29). Le skill ORIENTE seulement — il ne donne JAMAIS de
 * territoire/point/victoire (anti pay-to-win §C) : c'est un signal de
 * reconnaissance, la décision reste humaine (et serveur pour tout claim).
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

// ============================================================================
// HORLOGE UNIQUE + FORMAT UNIQUE DU TEMPS RESTANT
// ============================================================================

/** Conversion d'unité (ms/min) — pas une constante de jeu. */
const MS_PER_MIN = 60_000;

/**
 * SEUIL D'AFFICHAGE de l'urgence : « URGENT » + rouge sont RÉSERVÉS aux
 * fenêtres < 12 h. Règle de PRÉSENTATION UI (tri/alerte à l'écran), pas une
 * constante de jeu — aucun effet moteur/serveur.
 */
const URGENT_WINDOW_MIN = 12 * 60;

/**
 * LE format du temps restant, unique pour tout l'écran (une seule sémantique) :
 * « 48 h » / « 4 h 21 » / « 41 min » / « Fenêtre close » à 0. À la MINUTE,
 * JAMAIS de seconde (inutile et anxiogène sur des fenêtres en heures).
 */
function formatWindow(totalMin: number): string {
  const clamped = Math.max(0, Math.round(totalMin));
  if (clamped <= 0) return 'Fenêtre close';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

/**
 * L'HORLOGE de l'écran : un `now` (ms epoch) rafraîchi chaque minute
 * (60 000 ms = unité de temps, pas une constante de jeu). TOUS les temps
 * restants en dérivent — une seule source, zéro compteur concurrent. Actif
 * même en reduce motion (info temporelle, pas décoratif).
 */
function useNowMinute(): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return nowMs;
}

// ============================================================================
// DONNÉES DÉRIVÉES DES DÉMOS (distances, gains estimés)
// ============================================================================

/**
 * Distances approx (km, à vol d'oiseau depuis la base du crew) — DONNÉES DÉMO
 * DÉTERMINISTES locales : `features/warroom/demo` (hors périmètre de ce
 * chantier) ne porte pas de distance, et l'axe « atteignable à pied » est
 * indispensable à la décision. Toujours affichées avec « ~ » (approximation,
 * jamais présentées comme mesurées). TODO(O1) : dériver de la vraie position.
 */
const ZONE_DISTANCE_KM_DEMO: Record<string, number> = {
  Canal: 2.3,
  République: 1.2,
  'Buttes-Chaumont': 1.8,
  'Quais de Seine': 3.4,
  Jaurès: 2.1,
  Belleville: 1.5,
};

/** « ~2,3 km » pour une zone connue, null sinon (jamais de distance inventée). */
function distanceLabel(zone: string): string | null {
  const km = ZONE_DISTANCE_KM_DEMO[zone];
  if (km === undefined) return null;
  return `~${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

/**
 * GAINS ESTIMÉS (« ≈ ») dérivés de la formule de points §23 (@klaim/shared) —
 * zéro nombre magique. Estimations basses (sans coeff de contexte ni verify),
 * toujours préfixées « ≈ » : l'app n'affirme jamais un gain que le serveur n'a
 * pas tranché.
 */
const DEFENSE_PTS_EST = Math.round(
  DEFENSE_MISSION.hexes * POINTS_BASE_PER_ZONE * ACTION_COEFF.defense,
);
/** Conquête en mission crew : base × contexte crew_mission (§23). */
const CONQUEST_PTS_PER_ZONE = Math.round(
  POINTS_BASE_PER_ZONE * CONTEXT_COEFF.crew_mission,
);
/** Reprise (raid/revanche) : base × coeff steal (§23). */
const STEAL_PTS_PER_ZONE = Math.round(POINTS_BASE_PER_ZONE * ACTION_COEFF.steal);

/**
 * Pont d'identifiants frontière (démo) — AMENDEMENT-17 §CH2. L'écran liste ses
 * frontières ouvertes avec des ids `pb_*` (OPEN_BOUNDARIES), mais Course Live
 * résout la frontière à terminer via `partialBoundaryById(param)` qui ne connaît
 * QUE les ids `PARTIAL_BOUNDARIES_DEMO` (`republique` | `canal`). Sans mapping,
 * tout `pb_*` retombe silencieusement sur la 1re frontière (République) → l'écran
 * de complétion ouvrirait la MAUVAISE zone. Les frontières sans jumelle serveur
 * en démo (Jaurès, Belleville) renvoient `null` → leur action devient « Voir la
 * route » (honnête), jamais un « Terminer » mort. TODO(O1) : source unique
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
// MODÈLE DE MISSION UNIFIÉ (une sémantique, un tri)
// ============================================================================

/**
 * UNE mission affichable, quelle que soit sa nature (défense, revanche, raid,
 * conquête, frontière). Le chiffre-clé est UNIQUE : `minutesLeft` (temps
 * restant), qui sert aussi de clé de tri — l'échéance la plus proche d'abord.
 */
interface MissionEntry {
  key: string;
  icon: IconName;
  /** Nature de la mission, pour le kicker du hero (« DÉFENSE », « RAID CREW »…). */
  kindLabel: string;
  /** Objet de la mission (zone / boucle) — le titre. */
  title: string;
  /** SEUL chiffre-clé de l'écran : minutes restantes avant la fin de fenêtre. */
  minutesLeft: number;
  /** Sous-ligne compacte : distance approx + gain estimé. Jamais tronquée. */
  meta: string;
  /** Phrase du hero : objet + distance + enjeu + gain (brief mission n°1). */
  phrase: string;
  /** Verbe du SEUL CTA plein (si cette mission est n°1). */
  cta: string;
  /** Verbe précis de l'action inline (ligne compacte). */
  action: string;
  /** Famille de skill pour recommander un coéquipier (hero uniquement). */
  skillFamily: SkillFamilyId;
  onStart: () => void;
  /** Détail au tap de l'en-tête du hero (jamais imposé). */
  onDetail?: () => void;
}

// ============================================================================
// Primitives compactes (UI EN SCÈNES — lignes posées sur l'espace)
// ============================================================================

/**
 * En-tête de section repliable : icône + libellé + chevron animé par rotation.
 * Anti-scroll : tout ce qui n'est pas priorité vit replié, une seule ouverte
 * suffit à explorer. Aucun cadre — la section se pose sur l'espace. Zone de
 * tap ≥ 44 px.
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
 * MISSION n°1 — LA seule vraie surface (N1) de l'écran et LE seul CTA
 * chartreuse plein. Kicker + titre + temps restant (grand, avec la mention
 * « restant » : jamais un chiffre porté par la seule position) + phrase
 * complète (objet · distance · enjeu · gain, JAMAIS tronquée) + CTA.
 * « URGENT » + contour rouge réservés aux fenêtres < 12 h ; sinon badge neutre
 * « PRIORITÉ 1 » et contour discret. Le détail descend au tap sur l'en-tête.
 */
function MissionHero({
  entry,
  urgent,
  timeLabel,
}: {
  entry: MissionEntry;
  urgent: boolean;
  timeLabel: string;
}) {
  const accent = urgent ? gameColors.danger : colors.blanc;
  const kicker = urgent
    ? `URGENT · ${entry.kindLabel}`
    : `${entry.kindLabel} · PRIORITÉ 1`;
  return (
    <View
      style={[
        styles.hero,
        { borderColor: urgent ? gameColors.danger : borderState.hairline },
      ]}
    >
      <Pressable
        accessibilityRole={entry.onDetail ? 'button' : undefined}
        accessibilityLabel={
          entry.onDetail ? `${entry.title} — voir le détail sur la carte` : undefined
        }
        disabled={!entry.onDetail}
        onPress={
          entry.onDetail
            ? () => {
                haptics.light();
                entry.onDetail?.();
              }
            : undefined
        }
        style={({ pressed }) => [styles.heroHead, pressed && entry.onDetail && styles.pressed]}
      >
        <View style={styles.heroIcon}>
          <Icon name={entry.icon} size={20} color={accent} />
        </View>
        <View style={styles.heroHeadText}>
          <Text
            style={[styles.heroKicker, { color: urgent ? gameColors.danger : colors.gris }]}
            numberOfLines={1}
          >
            {kicker}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {entry.title}
          </Text>
        </View>
        <View style={styles.heroMetricWrap}>
          <Text style={[styles.heroMetric, { color: accent }]} numberOfLines={1}>
            {timeLabel}
          </Text>
          {entry.minutesLeft > 0 ? (
            <Text style={styles.heroMetricCaption}>restant</Text>
          ) : null}
        </View>
      </Pressable>
      {/* Phrase de mission complète — jamais clampée (« textes jamais coupés »). */}
      <Text style={styles.heroPhrase}>{entry.phrase}</Text>
      <View style={styles.heroCta}>
        <InlineRunCTA label={entry.cta} size="md" variant="primary" onPress={entry.onStart} />
      </View>
    </View>
  );
}

/**
 * Ligne de mission COMPACTE (« Autres missions ») — posée sur l'espace :
 * icône + titre + temps restant (« reste 4 h 21 », même sémantique que le
 * hero) puis distance + gain à gauche et l'action inline (verbe précis +
 * chevron, JAMAIS un bouton plein) à droite. Toute la ligne est tappable ;
 * hauteur ≥ 44 px ; aucun texte tronqué (le meta passe à la ligne au besoin).
 */
function MissionRow({
  entry,
  urgent,
  timeLabel,
}: {
  entry: MissionEntry;
  urgent: boolean;
  timeLabel: string;
}) {
  const timeText = entry.minutesLeft > 0 ? `reste ${timeLabel}` : timeLabel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.title} — ${entry.action}. ${entry.meta}. ${timeText}.`}
      onPress={() => {
        haptics.light();
        entry.onStart();
      }}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}
    >
      <View style={styles.lineHead}>
        <View style={styles.lineIcon}>
          <Icon name={entry.icon} size={18} color={urgent ? gameColors.danger : colors.blanc} />
        </View>
        <Text style={styles.lineTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text
          style={[styles.lineTime, urgent && styles.lineTimeUrgent]}
          numberOfLines={1}
        >
          {timeText}
        </Text>
      </View>
      <View style={styles.lineFoot}>
        <Text style={styles.lineMeta}>{entry.meta}</Text>
        <View style={styles.lineActionWrap}>
          <Text style={styles.lineActionLabel} numberOfLines={1}>
            {entry.action}
          </Text>
          <Icon name="chevron" size={15} color={colors.blanc} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * LIGNE « Bonus crew actif » (AMENDEMENT-19 §4 + AMENDEMENT-22) : UN SEUL bonus
 * CREW, le plus pertinent. Ligne compacte à contour chartreuse doux (gain,
 * jamais menace) = famille + effet COURT non tronqué, tap = action de la fiche.
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
        <View style={styles.bonusText}>
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

/** Lien discret « Voir tout » quand une section a plus de 2 lignes (tap ≥ 44 px). */
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
 * RECO PAR SKILL (doc §29) — UNE ligne sous la mission n°1. Quand je peux
 * proposer (droits §8), la ligne est un vrai bouton AFFORDANT : « Proposer à
 * <nom> — <Skill> <roman> » + chevron, zone de tap ≥ 44 px. Sinon elle est
 * purement informative (« Recommandé : … », sans chevron). Le skill ORIENTE,
 * il ne donne AUCUN pouvoir territorial : aucun point/gain n'est affiché.
 * Texte jamais tronqué (passe à la ligne au besoin).
 */
function SkillRecoLine({
  reco,
  onPress,
}: {
  reco: MemberSkillReco;
  onPress?: () => void;
}) {
  const skill = `${reco.def.name} ${reco.roman}`;
  if (!onPress) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`Recommandé pour cette mission : ${reco.pseudo} · ${skill}`}
        style={styles.recoRow}
      >
        <View style={styles.recoIcon}>
          <Icon name={skillIconName(reco.def.id) as IconName} size={15} color={colors.gris} />
        </View>
        <Text style={styles.recoLabel} numberOfLines={2}>
          <Text style={styles.recoPrefix}>Recommandé : </Text>
          {reco.pseudo} · {skill}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Proposer la mission à ${reco.pseudo} — ${skill}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.recoRow, pressed && styles.pressed]}
    >
      <View style={styles.recoIcon}>
        <Icon name={skillIconName(reco.def.id) as IconName} size={15} color={colors.gris} />
      </View>
      <Text style={styles.recoLabel} numberOfLines={2}>
        <Text style={styles.recoPrefix}>Proposer à </Text>
        {reco.pseudo}
        <Text style={styles.recoTrailing}> — {skill}</Text>
      </Text>
      <Icon name="chevron" size={15} color={colors.blanc} />
    </Pressable>
  );
}

// ============================================================================
// Écran
// ============================================================================

type OpenSection = 'objectifs' | 'routes' | 'scout' | 'historique' | null;

export default function WarRoomScreen() {
  const toast = useToast();
  // Une seule section ouverte à la fois (anti-scroll) — tout replié au montage.
  const [open, setOpen] = useState<OpenSection>(null);
  const toggle = (s: Exclude<OpenSection, null>) =>
    setOpen((cur) => (cur === s ? null : s));

  // L'HORLOGE unique de l'écran (minute) — tous les temps restants en dérivent.
  const nowMs = useNowMinute();

  // RAID WEEKEND + REVANCHE (AMENDEMENT-34) : stores démo persistants, moteur
  // miroiré. Résolus à chaque rendu (le tick minute rafraîchit statut + fenêtre).
  const { raid } = useCrewRaid();
  const { revanche } = useCrewRevanche();

  useEffect(() => {
    screen('war_room');
  }, []);

  /**
   * Ancres d'échéance FIGÉES AU MONTAGE : les données démo donnent des durées
   * relatives (h/min/s restantes) — on les convertit une fois en instants
   * absolus, puis chaque temps restant se DÉRIVE de la même horloge minute.
   * Une seule source de temps, zéro compteur qui vit sa vie.
   */
  const anchors = useMemo(() => {
    const t = Date.now();
    return {
      defenseEndsAt: t + DEFENSE_MISSION.expiresInH * 60 * MS_PER_MIN,
      offensiveEndsAt: t + OFFENSIVE.remainingS * 1000,
      boundaryEndsAt: Object.fromEntries(
        OPEN_BOUNDARIES.map((b) => [b.key, t + b.expiresInMin * MS_PER_MIN]),
      ) as Record<string, number>,
    };
  }, []);
  const minutesUntil = (endsAt: number) =>
    Math.max(0, Math.round((endsAt - nowMs) / MS_PER_MIN));

  const openMap = () => router.push('/(tabs)');

  // ── TOUTES les missions, un seul modèle, un seul tri (échéance la plus
  //    proche d'abord). La n°1 devient le hero, le reste des lignes compactes. ──
  const entries: MissionEntry[] = [];

  // DÉFENSE (Canal) — §38.3. Gain estimé : zones × base × coeff défense (§23).
  {
    const min = minutesUntil(anchors.defenseEndsAt);
    const dist = distanceLabel(DEFENSE_MISSION.zone);
    entries.push({
      key: 'defense',
      icon: 'bouclier',
      kindLabel: 'DÉFENSE',
      title: DEFENSE_MISSION.zone,
      minutesLeft: min,
      meta: [dist, `≈ +${formatInt(DEFENSE_PTS_EST)} pts`].filter(Boolean).join(' · '),
      phrase: `${DEFENSE_MISSION.zone}${dist ? ` · ${dist}` : ''}. ${DEFENSE_MISSION.hexes} zones tombent dans ${formatWindow(min)} — une boucle les sauve (≈ +${formatInt(DEFENSE_PTS_EST)} pts crew).`,
      cta: 'DÉFENDRE',
      action: 'Défendre',
      skillFamily: 'defender',
      onStart: () => {
        toast.show(`Défense lancée — zone ${DEFENSE_MISSION.zone}`);
        router.push('/route-planner?type=defense');
      },
      onDetail: openMap,
    });
  }

  // REVANCHE (AMENDEMENT-34) — un rival a repris ton secteur. Fenêtre 24 h,
  // disparaît d'elle-même à l'expiration (le store renvoie null). Reprise =
  // points NORMAUX de vol §3.4 (anti pay-to-win) ; position exacte JAMAIS
  // révélée (§C) — seulement le secteur + le crew rival.
  if (revanche) {
    const min = Math.max(0, Math.round(revanche.hoursLeft * 60));
    const dist = distanceLabel(revanche.sector);
    const pts = Math.round(revanche.zonesLost * POINTS_BASE_PER_ZONE * ACTION_COEFF.steal);
    entries.push({
      key: 'revanche',
      icon: 'cible',
      kindLabel: 'REVANCHE',
      title: revanche.sector,
      minutesLeft: min,
      meta: [dist, `≈ +${formatInt(pts)} pts`].filter(Boolean).join(' · '),
      phrase: `${revanche.sector}${dist ? ` · ${dist}` : ''}. ${revanche.rivalCrew} t'a pris ${formatInt(revanche.zonesLost)} zones — reprends-les avant la fin de fenêtre (≈ +${formatInt(pts)} pts).`,
      cta: 'REPRENDRE',
      action: 'Reprendre',
      skillFamily: 'conqueror',
      onStart: () => {
        screen('war_revanche_reprendre', { sector: revanche.sector });
        toast.show(`Cap sur ${revanche.sector} — reprends tes zones`);
        router.push('/route-planner?type=raid');
      },
    });
  }

  // RAID WEEKEND (AMENDEMENT-34) — offensive collective à fenêtre courte, barre
  // PARTAGÉE. Seul un raid ACTIF est une décision (gagné/expiré n'appelle plus
  // d'action). Anti pay-to-win : le run normal mis en scène, claim serveur.
  if (raid && raid.status === 'active') {
    const min = Math.max(0, Math.round(raid.hoursLeft * 60));
    const dist = distanceLabel(raid.zone);
    const zonesLeft = Math.max(0, raid.target - raid.progress);
    entries.push({
      key: 'raid',
      icon: 'raid',
      kindLabel: 'RAID CREW',
      title: raid.zone,
      minutesLeft: min,
      meta: [dist, `${formatInt(zonesLeft)} zones à reprendre`].filter(Boolean).join(' · '),
      phrase: `${raid.zone}${dist ? ` · ${dist}` : ''}. « ${raid.title} » : reste ${formatInt(zonesLeft)} zones à reprendre avec le crew (≈ +${STEAL_PTS_PER_ZONE} pts par zone).`,
      cta: raid.joined ? 'COURIR ENCORE' : 'REJOINDRE LE RAID',
      action: raid.joined ? 'Courir encore' : 'Rejoindre le raid',
      skillFamily: 'conqueror',
      onStart: () => {
        screen('war_raid_join', { raidId: raid.id });
        // Démo : ma contribution monte la barre collective persistante.
        contributeToRaid(raid.id);
        toast.show(`Raid rejoint — cap sur ${raid.zone}`);
        router.push('/route-planner?type=raid');
      },
    });
  }

  // CONQUÊTE COLLECTIVE (République, §38.2) — l'offensive crew en cours.
  {
    const min = minutesUntil(anchors.offensiveEndsAt);
    const dist = distanceLabel(OFFENSIVE.zone);
    const zonesLeft = OFFENSIVE.objectiveHexes - OFFENSIVE.hexesTaken;
    entries.push({
      key: 'conquest',
      icon: 'guerre',
      kindLabel: 'CONQUÊTE CREW',
      title: OFFENSIVE.zone,
      minutesLeft: min,
      meta: [dist, `${formatInt(zonesLeft)} zones à prendre`].filter(Boolean).join(' · '),
      phrase: `${OFFENSIVE.zone}${dist ? ` · ${dist}` : ''}. ${formatInt(zonesLeft)} zones à prendre, ${OFFENSIVE.activeMembers} coéquipiers sur ${OFFENSIVE.totalMembers} déjà en course (≈ +${CONQUEST_PTS_PER_ZONE} pts par zone).`,
      cta: 'CONQUÉRIR',
      action: 'Conquérir',
      skillFamily: 'conqueror',
      onStart: () => {
        toast.show(`Conquête collective rejointe — cap sur ${OFFENSIVE.zone}`);
        router.push('/route-planner?type=raid');
      },
      onDetail: openMap,
    });
  }

  // FRONTIÈRES À TERMINER (AMENDEMENT-17 §CH2) — chaque frontière ouverte est
  // une mission datée (TTL). Action HONNÊTE : « Terminer » seulement si Course
  // Live sait résoudre la frontière ; sinon « Voir la route » (jamais de bouton
  // mort). Le « reste X m » est la boucle à courir, distinct de la distance.
  for (const b of OPEN_BOUNDARIES) {
    const min = minutesUntil(anchors.boundaryEndsAt[b.key] ?? nowMs);
    const dist = distanceLabel(b.zone);
    const param = partialBoundaryParamFor(b.boundaryId);
    entries.push({
      key: b.key,
      icon: 'avantposte',
      kindLabel: 'BOUCLE À TERMINER',
      title: `Boucle ${b.zone}`,
      minutesLeft: min,
      meta: [dist, `reste ${formatInt(b.missingM)} m à courir`].filter(Boolean).join(' · '),
      phrase: `${b.zone}${dist ? ` · ${dist}` : ''}. Il reste ${formatInt(b.missingM)} m pour fermer la boucle ouverte par ${b.opener} avant la fin de fenêtre.`,
      cta: param ? 'TERMINER LA BOUCLE' : 'VOIR LA ROUTE',
      action: param ? 'Terminer' : 'Voir la route',
      skillFamily: 'finisher',
      onStart: () => {
        if (param) {
          toast.show(`Cap sur ${b.zone} — termine la boucle du crew`);
          router.push(`/course-live?intention=complete&boundary=${param}`);
        } else {
          router.push('/route-planner');
        }
      },
    });
  }

  // TRI RÉEL par temps restant : l'échéance la plus proche d'abord. La n°1 est
  // LA décision de l'écran ; toutes les autres attendent en lignes compactes.
  entries.sort((a, b) => a.minutesLeft - b.minutesLeft);
  const hero = entries[0];
  const others = entries.slice(1);
  const heroUrgent = hero !== undefined && hero.minutesLeft < URGENT_WINDOW_MIN;

  // RECO PAR SKILL (doc §29) — le bon COÉQUIPIER pour la mission n°1, dérivé du
  // catalogue GELÉ selon la famille de la mission (défense → Defender, boucle →
  // Finisher, offensive → Conqueror). ORIENTE seulement, aucun gain affiché.
  const heroFamily = hero?.skillFamily ?? 'defender';
  const heroReco = useMemo(() => recommendMemberFor(heroFamily), [heroFamily]);

  // COFFRE — état/palier DÉRIVÉS de chestStateFor (source unique = Crew HQ).
  const chestPct = MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chest = chestStateFor(chestPct);
  const nextTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);
  const chestRemaining = Math.max(0, CREW_CHEST_WEEKLY_TARGET - MY_CREW.chestProgress);
  const chestPhrase = nextTier
    ? `${Math.round(chestPct * 100)} % — encore ${formatInt(chestRemaining)} pts pour le palier ${CHEST_TIER_LABELS[nextTier]}.`
    : `${Math.round(chestPct * 100)} % — palier ${chest.tier ? CHEST_TIER_LABELS[chest.tier] : 'max'} atteint cette semaine.`;

  // Gating visuel par MON rôle démo (matrice §8) — le serveur reste seul juge.
  const myRole = MY_CREW.members.find((m) => m.me)?.role ?? 'runner';
  const canLaunch = roleCan(myRole, 'launchOffensive');
  const canAssign = roleCan(myRole, 'assignDefense');

  /**
   * BONUS CREW (AMENDEMENT-19 §4) : UN SEUL bonus, le plus pertinent CREW
   * (selectBonus(context, 'war_room') — défense > finisher > coffre). Rien de
   * pertinent → aucune ligne (pas de placeholder). Tap = agir selon le CTA de
   * la fiche. La récompense reste tranchée serveur, ici on route vers l'action.
   */
  const crewBonus = selectMapBonus(MAP_BONUS_CONTEXT, 'war_room');
  const actCrewBonus = (bonus: SelectedBonusDemo) => {
    haptics.medium();
    screen('war_bonus_act', { bonusId: bonus.def.id });
    switch (bonus.def.id) {
      case 'defense_critical':
        toast.show(`Défense lancée — zone ${DEFENSE_MISSION.zone}`);
        router.push('/route-planner?type=defense');
        break;
      case 'finisher': {
        const b = OPEN_BOUNDARIES[0];
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
      {/* Header MISSIONS (AMENDEMENT-29) — le TITRE porte le nom de l'écran.
          Kicker HUD minimal : ville · saison · jours restants (le rang crew vit
          dans Crew/Saison, pas dans le kicker de décision). Titre non tronqué. */}
      <TabScreen
        title="Missions"
        icon="guerre"
        kicker={`${WAR_STATUS.city} · ${WAR_STATUS.seasonLabel} · J-${WAR_STATUS.daysLeft}`}
        subtitle="Ta prochaine mission, triée par urgence."
      >
        {/* ============ MISSION n°1 — LA décision + LE seul CTA plein ============ */}
        {hero ? (
          <>
            <MissionHero
              entry={hero}
              urgent={heroUrgent}
              timeLabel={formatWindow(hero.minutesLeft)}
            />
            {/* Le bon coéquipier pour la mission n°1 (doc §29) : bouton
                « Proposer à X › » si j'ai le droit (§8), sinon informatif. */}
            {heroReco ? (
              <SkillRecoLine
                reco={heroReco}
                onPress={
                  canAssign
                    ? () => {
                        toast.show(`${hero.title} proposée à ${heroReco.pseudo}`);
                      }
                    : undefined
                }
              />
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>
            Aucune mission en cours — cours pour ouvrir le terrain, le crew suivra.
          </Text>
        )}

        {/* ============ AUTRES MISSIONS — lignes compactes, même horloge ============ */}
        {others.length > 0 ? (
          <>
            <SectionHead icon="mission" label="AUTRES MISSIONS" count={others.length} />
            {others.map((entry) => (
              <MissionRow
                key={entry.key}
                entry={entry}
                urgent={entry.minutesLeft < URGENT_WINDOW_MIN}
                timeLabel={formatWindow(entry.minutesLeft)}
              />
            ))}
          </>
        ) : null}

        {/* COFFRE — jauge hebdo compacte (paliers §39.2 depuis shared). Pas une
            mission datée : pas de temps restant, pas de chiffre concurrent. Le
            tap dit la vérité : on VOIT le coffre sur la carte (on le remplit en
            courant, pas en tapant). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Coffre du crew — ${chestPhrase} Voir le coffre.`}
          onPress={() => {
            haptics.light();
            toast.show('Cap sur le coffre — cours pour le remplir');
            openMap();
          }}
          style={({ pressed }) => [styles.line, pressed && styles.pressed]}
        >
          <View style={styles.lineHead}>
            <View style={styles.lineIcon}>
              <Icon name="coffre" size={18} color={gameColors.gold} />
            </View>
            <Text style={styles.lineTitle} numberOfLines={1}>
              Coffre du crew
            </Text>
          </View>
          <View style={styles.lineGauge}>
            <ProgressBar value={chestPct} height={6} />
          </View>
          <View style={styles.lineFoot}>
            <Text style={styles.lineMeta}>{chestPhrase}</Text>
            <View style={styles.lineActionWrap}>
              <Text style={styles.lineActionLabel} numberOfLines={1}>
                Voir le coffre
              </Text>
              <Icon name="chevron" size={15} color={colors.blanc} />
            </View>
          </View>
        </Pressable>

        {/* BONUS CREW ACTIF (AMENDEMENT-19 §4) : 1 SEUL bonus crew, le plus
            pertinent. Rien de pertinent → rien d'affiché (pas de placeholder).
            Reward coffre/XP/protection/badge — jamais territoire/points/rang. */}
        {crewBonus ? (
          <CrewBonusLine bonus={crewBonus} onAct={() => actCrewBonus(crewBonus)} />
        ) : null}

        {/* DEMANDER AU CREW (AMENDEMENT-18 A.3) : entrée vers le Crew Chat
            actionnable où l'on émet une requête (Défense/Terminer/Route/Scout/
            Sortie). Aucune requête ne donne de territoire ni de point (anti
            pay-to-win). Ligne légère posée sur l'espace, sans cadre. */}
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

        {/* RAPPORTS SCOUT — renseignement agrégé, jamais de position live. */}
        <SectionToggle
          icon="scout"
          label="RAPPORTS SCOUT"
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

/** Icône par type de mission « À faire » (§7.12) — section Objectifs. */
const MISSION_ICON: Record<string, IconName> = {
  quotidienne: 'mission',
  hebdomadaire: 'serie',
  crew: 'crew',
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },

  // --- MISSION n°1 : LA seule surface N1. Contour rouge SEULEMENT si urgent
  //     (< 12 h) ; sinon hairline discret — le rouge ne crie plus au loup. ---
  hero: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
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
  heroKicker: { fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800', marginTop: 2 },
  heroMetricWrap: { alignItems: 'flex-end' },
  heroMetric: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // La mention « restant » colle au chiffre : le temps n'est jamais porté par
  // la seule position/couleur.
  heroMetricCaption: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  heroPhrase: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },
  heroCta: { marginTop: 14 },

  // --- Lignes compactes (« Autres missions » + coffre), posées sur l'espace ---
  line: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
    minHeight: 44,
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
  lineTitle: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  // Temps restant de la ligne — MÊME sémantique que le hero (« reste 4 h 21 »).
  lineTime: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lineTimeUrgent: { color: gameColors.danger },
  // Pied de ligne : distance + gain à gauche, action inline à droite.
  lineFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  lineMeta: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  lineActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // Action inline (verbe + chevron) en blanc : le SEUL élément chartreuse plein
  // de l'écran reste le CTA du hero.
  lineActionLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  lineGauge: { marginTop: 10 },
  lineKicker: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 0.8 },
  linePhrase: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },

  // --- Reco par skill (doc §29) : ligne sous le hero, zone de tap ≥ 44 px,
  //     chevron quand elle est actionnable (jamais d'action invisible). ---
  recoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 2,
  },
  recoIcon: { marginTop: 1 },
  recoLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600', lineHeight: 18 },
  // Préfixe discret (rôle de la ligne) ; le nom reste en blanc lisible.
  recoPrefix: { color: colors.gris, fontWeight: '700' },
  recoTrailing: { color: colors.gris },

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
    fontSize: fontSizes.xs,
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

  // --- État vide : texte posé sur l'espace, pas une card ---
  emptyText: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18, marginTop: 10 },

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
  bonusText: { flex: 1 },

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

  // --- Sections repliables (zone de tap ≥ 44 px) ---
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    minHeight: 44,
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
  rolePerm: { fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.3 },
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

  // --- Missions « À faire » : lignes sur l'espace ---
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

  // --- Voir tout (zone de tap ≥ 44 px) ---
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 8,
  },
  seeAllLabel: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },
});
