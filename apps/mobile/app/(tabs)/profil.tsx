/**
 * GRYD — onglet Profil COMPACT (AMENDEMENT-17 §1.3). Un écran = une identité :
 * la carte de joueur (nom · titre · niveau · ville · crew — ≤ 3 infos en
 * surface) porte deux actions sobres — [Partager] / [Modifier profil],
 * JAMAIS un GO, jamais « Ajouter » sur SON propre profil. Puis les modules,
 * ordre AMENDEMENT-17 : Territoire (résumé stratégique — il porte le SEUL CTA
 * chartreuse de l'écran, contextuel Défendre/Conquérir) → Progression → Badges
 * (3 équipés + « Voir collection ») → Spécialisations. Les listes longues
 * descendent en liens vers des pages dédiées ; « Confidentialité & géoloc » y
 * est un accès DIRECT à 1 tap (confiance visible, distinct de Paramètres).
 * Niveau/tier/rang DÉRIVÉS des règles réelles (features/crew/rules) — aucun
 * nombre magique local. Zéro position live.
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
import { router, useLocalSearchParams } from 'expo-router';
import {
  TerritoryWidgetCard,
  useTerritoryWidgetView,
} from '../../src/features/widget/TerritoryWidgetCard';
import {
  BADGE_TIER_RANK,
  PLAYER_LEVEL_MAX,
  SKILLS,
  SKILL_ROMAN,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
  badgeKeyByName,
  borderState,
  colors,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  type IconName,
  type SkillDef,
} from '@klaim/shared';
import {
  badgeById,
  badgeColor,
  BADGE_TOTAL,
} from '../../src/features/badges/catalog';
import { BadgeHex } from '../../src/features/badges/BadgeHex';
import { useMyBadges } from '../../src/features/badges/myBadges';
import { MY_CREW } from '../../src/features/crew/demo';
import {
  GRIP_RANK_LABELS,
  gripRankForLevel,
  playerLevelForXp,
  playerLevelXpTable,
  playerTierForLevel,
} from '../../src/features/crew/rules';
import { MY_SOCIAL_PROFILE } from '../../src/features/social/demo';
import { GripMascot } from '../../src/features/social/GripMascot';
import { PlayerCardAvatar } from '../../src/features/social/PlayerCardAvatar';
import { effectiveInitials, useMyProfile } from '../../src/features/social/profileStore';
import { useMyEconomy } from '../../src/features/social/economy';
import { useEquippedCosmetics, itemByKey, isTitleItem } from '../../src/features/arsenal';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { TerritoryFranceMap } from '../../src/features/territory/TerritoryFranceMap';
import {
  TERRITORY_DEMO_FLAGS,
  TERRITORY_STATUS_META,
  territorySummary,
  type StatusTone,
  type NextActionIntent,
  type TerritoryDemoFlag,
} from '../../src/features/territory/territoryStatus';
import { flags } from '../../src/lib/flags';
import { screen } from '../../src/lib/analytics';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt, formatMultiplier } from '../../src/ui/format';
import { CrewCrest, IconAction, ShareCard } from '../../src/ui/game';

const STREAK_WEEKS = 3;

/** Bornes XP par niveau (courbe §43.1) — table pure. Le niveau/tier/jauge sont
 *  DÉRIVÉS de l'XP RÉELLE dans le composant (O1 : useMyEconomy), plus au module. */
const XP_TABLE = playerLevelXpTable();

/**
 * Résout un flag démo territoire depuis le paramètre de route `?territory=…`
 * (itération visuelle des états sans rebuild). Défaut = `crew_multi` (cas
 * nominal Saison 0). Un flag inconnu retombe sur le défaut — jamais de crash.
 */
function resolveTerritoryFlag(raw: string | string[] | undefined): TerritoryDemoFlag {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (TERRITORY_DEMO_FLAGS as readonly string[]).includes(value ?? '')
    ? (value as TerritoryDemoFlag)
    : 'crew_multi';
}

/** Couleur d'accent d'un statut (badge STATUT) — tokens de jeu uniquement. */
const STATUS_TONE_COLOR: Readonly<Record<StatusTone, string>> = {
  crew: gameColors.crew,
  contested: gameColors.contested,
  rival: gameColors.rival,
  neutral: colors.gris,
};

/**
 * Un CTA d'urgence (défense sous attaque) doit être ROUGE plein pour crier
 * l'action ; les autres restent chartreuse (l'action forte standard). On passe
 * par la couleur de fond du bouton, texte toujours foncé (charte contraste).
 */
function ctaTone(intent: NextActionIntent, urgent: boolean): { bg: string; fg: string } {
  if (urgent || intent === 'defend') {
    return urgent
      ? { bg: gameColors.rival, fg: colors.noir }
      : { bg: gameColors.crew, fg: colors.noir };
  }
  return { bg: gameColors.crew, fg: colors.noir };
}

type BadgeDefT = NonNullable<ReturnType<typeof badgeById>>;

/**
 * Badges affichables = débloqués, non-legacy, triés du plus rare au moins rare
 * (BADGE_TIER_RANK). DÉRIVÉ des débloqués RÉELS (O1 : useMyBadges) dans le
 * composant — plus au niveau module (jamais codé en dur).
 */
function displayableBadgesFrom(unlockedIds: ReadonlySet<string>): readonly BadgeDefT[] {
  return [...unlockedIds]
    .map((id) => badgeById(id))
    .filter((def): def is BadgeDefT => def !== undefined && !def.legacy)
    .sort((a, b) => BADGE_TIER_RANK[b.tier] - BADGE_TIER_RANK[a.tier]);
}

/**
 * Badges mis en avant EFFECTIFS : le choix manuel du joueur (featuredBadgeIds)
 * s'il est renseigné et valide, sinon le défaut (3 plus rares). On ne garde que
 * des badges réellement débloqués → jamais un slot vide/verrouillé sur la card.
 */
function resolveFeaturedBadges(
  chosenIds: readonly string[],
  displayable: readonly BadgeDefT[],
): readonly BadgeDefT[] {
  const chosen = chosenIds
    .map((id) => displayable.find((b) => b.id === id))
    .filter((def): def is BadgeDefT => def !== undefined);
  return chosen.length > 0 ? chosen.slice(0, 3) : displayable.slice(0, 3);
}

// ─── SKILLS (AMENDEMENT-23 §C, doc §28-§29) ──────────────────────────────────
/**
 * État dérivé d'UNE famille de skill pour l'affichage Profil (miroir du contrat
 * `DerivedSkill` de packages/engine/src/skills.ts). La dérivation est PURE et
 * ré-implémentée ICI car Metro ne résout pas les imports Deno `.ts` de
 * `@klaim/engine` (même contrainte que le catalogue de badges client) : le
 * catalogue + les seuils GELÉS viennent de `@klaim/shared` (`SKILLS`), aucun
 * nombre magique local. Les STATS réutilisent la MÊME source que les badges
 * (O1 : `useMyBadges().stat` — user_stats réel si session, sinon démo) — pas de
 * barème parallèle. `deriveSkill(def, statValue)` reste PURE (reçoit la valeur).
 */
interface DerivedSkill {
  def: SkillDef;
  /** Valeur courante du compteur (clé LifetimeStats via useMyBadges().stat). */
  value: number;
  /** Niveau atteint : 0 = verrouillé … 3 = III. */
  level: 0 | 1 | 2 | 3;
  /** true si le niveau max (III) est atteint. */
  maxed: boolean;
  /** Seuil du prochain niveau (null si maxé). */
  nextThreshold: number | null;
  /** Progression [0..1] à l'intérieur du niveau courant. */
  progress: number;
  /** Reste vers le prochain seuil (0 si maxé). */
  remaining: number;
  /** Libellé d'unité de la famille (« zones défendues »…), dérivé du seuil. */
  unit: string;
}

/**
 * Dérive une famille : niveau = nombre de seuils franchis ; progression
 * linéaire entre le seuil courant et le suivant. PURE, mêmes règles que
 * l'engine (bornes strictement croissantes garanties par le catalogue).
 */
function deriveSkill(def: SkillDef, statValue: number): DerivedSkill {
  const value = Math.max(0, statValue);
  const thresholds = def.levels.map((l) => l.threshold);
  let level = 0;
  for (const t of thresholds) if (value >= t) level += 1;
  const rank = Math.min(level, 3) as 0 | 1 | 2 | 3;
  const maxed = rank >= 3;
  const currentThreshold = rank > 0 ? thresholds[rank - 1]! : 0;
  const nextThreshold = maxed ? null : thresholds[rank]!;
  let progress = 1;
  let remaining = 0;
  if (nextThreshold !== null) {
    const span = nextThreshold - currentThreshold;
    remaining = Math.max(0, nextThreshold - value);
    progress = span > 0 ? Math.min(1, Math.max(0, (value - currentThreshold) / span)) : 0;
  }
  // Unité = requirement d'un niveau sans son nombre (« 50 zones défendues » →
  // « zones défendues »). Dérivée du catalogue, jamais codée en dur.
  const unit = def.levels[0].requirement.replace(/^[\d\s .,]+/, '').trim();
  return { def, value, level: rank, maxed, nextThreshold, progress, remaining, unit };
}

interface ProfileLink {
  label: string;
  detail: string;
  icon: IconName;
  href?: string;
}

/**
 * RACCOURCIS — toutes les listes longues descendent en liens vers des pages
 * dédiées (AMENDEMENT-17 : « Listes longues → pages dédiées »). Aucun contenu
 * déroulé dans le profil lui-même. « Confidentialité & géoloc » est un accès
 * DIRECT à 1 tap (audit confiance : la géoloc ne s'enterre pas sous
 * Paramètres), placé AVANT la boutique.
 */
const LINKS: readonly ProfileLink[] = [
  // Sortis de la barre (nav 4 slots) — accès depuis « Moi » (décision fondateur).
  // D8 : hors MVP fermé, Saison/Missions/Arsenal disparaissent de la SURFACE
  // (flags.ts) — les moteurs continuent d'accumuler, rien n'est perdu au flip.
  ...(flags.season
    ? [{ label: 'Saison', detail: 'Classement, rang, récompenses de fin', icon: 'classement', href: '/classement' } as const]
    : []),
  ...(flags.warRoom
    ? [{ label: 'Missions', detail: 'Défense, conquête, coffre du crew', icon: 'guerre', href: '/warroom' } as const]
    : []),
  { label: 'Mes amis', detail: 'Amis, demandes, suggestions, QR', icon: 'ami', href: '/amis' },
  { label: 'Performance', detail: 'Score Forme, records, impact GRYD', icon: 'performance', href: '/performance' },
  { label: 'Historique de courses', detail: 'Toutes tes conquêtes', icon: 'historique', href: '/historique' },
  {
    label: 'Confidentialité & géoloc',
    detail: 'Qui voit quoi, masquer départ/arrivée, couper le live',
    icon: 'verrou',
    href: '/confidentialite',
  },
  ...(flags.arsenal
    ? [{ label: 'Arsenal', detail: 'Skins, objets capés, GRYD Club', icon: 'boutique', href: '/arsenal' } as const]
    : []),
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
    label: 'Paramètres',
    detail: 'Notifications, compte, carte, crew',
    icon: 'reglages',
    href: '/parametres',
  },
];

export default function ProfilScreen() {
  const widgetView = useTerritoryWidgetView();
  const { session, configured } = useSession();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [shareOpen, setShareOpen] = useState(false);

  /** Profil ÉDITABLE persisté — l'édition depuis /profil-edit se reflète ici. */
  const { profile } = useMyProfile();
  // O1 Pass 2 : chiffres RÉELS (users.xp/foulées/série + season_scores) quand une
  // session Supabase existe, sinon fallback démo. Niveau/tier/GRIP/jauge DÉRIVÉS
  // de l'XP effective via la courbe partagée — jamais un nombre magique.
  const economy = useMyEconomy();
  const xp = economy.xp;
  const runnerLevel = playerLevelForXp(xp);
  const runnerTier = playerTierForLevel(runnerLevel);
  const gripRank = gripRankForLevel(runnerLevel);
  const levelFloor = XP_TABLE[runnerLevel - 1] ?? 0;
  const levelCeil =
    runnerLevel < PLAYER_LEVEL_MAX ? (XP_TABLE[runnerLevel] ?? levelFloor) : levelFloor;
  const levelRatio = levelCeil > levelFloor ? (xp - levelFloor) / (levelCeil - levelFloor) : 1;
  const streakWeeks = economy.source === 'server' ? economy.streakWeeks : STREAK_WEEKS;
  const streakMultiplier = Math.min(
    1 + streakWeeks * STREAK_MULTIPLIER_STEP,
    STREAK_MULTIPLIER_CAP,
  );
  const seasonRank =
    economy.source === 'server' ? (economy.seasonRank ?? profile.seasonRank) : profile.seasonRank;
  /** Cosmétiques ÉQUIPÉS persistés — frame autour de l'avatar + titre affiché. */
  const { equipped } = useEquippedCosmetics();

  /**
   * Résumé stratégique « Mon territoire » (AMENDEMENT-18 Partie B + A.5). Le
   * scénario démo se bascule via `?territory=<flag>` pour itérer visuellement
   * (crew_multi · crew_mono · beginner · under_attack · solo).
   */
  const { territory: territoryParam } = useLocalSearchParams<{ territory?: string }>();
  const territoryFlag = resolveTerritoryFlag(territoryParam);
  const territory = useMemo(() => territorySummary(territoryFlag), [territoryFlag]);
  const statusMeta = TERRITORY_STATUS_META[territory.status];
  const statusColor = STATUS_TONE_COLOR[statusMeta.tone];
  const cta = ctaTone(territory.next.intent, territory.next.urgent ?? false);

  /** Titre affiché : un TITRE cosmétique équipé prime sur le titre éditorial. */
  const equippedTitleItem = equipped.profile ? itemByKey(equipped.profile) : undefined;
  const displayedTitle =
    equippedTitleItem && isTitleItem(equippedTitleItem)
      ? equippedTitleItem.name.replace(/^Titre\s*«\s*/, '').replace(/\s*»$/, '')
      : profile.title;

  /** Initiales + couleur d'avatar issues du profil éditable. */
  const initials = effectiveInitials(profile);

  // O1 : débloqués + progression RÉELS (user_badges/user_stats) si session, sinon démo.
  const { unlockedIds, stat } = useMyBadges();
  const displayableBadges = useMemo(() => displayableBadgesFrom(unlockedIds), [unlockedIds]);
  const unlockedCount = unlockedIds.size;
  /** Badges mis en avant : choix du joueur, sinon les 3 plus rares. */
  const featuredBadges = useMemo(
    () => resolveFeaturedBadges(profile.featuredBadgeIds, displayableBadges),
    [profile.featuredBadgeIds, displayableBadges],
  );
  /** Skills dérivés des stats RÉELLES (mêmes seuils gelés que l'engine). */
  const derivedSkills = useMemo<readonly DerivedSkill[]>(
    () => SKILLS.map((d) => deriveSkill(d, stat(d.metric))),
    [stat],
  );
  const skillsUnlockedCount = derivedSkills.filter((s) => s.level > 0).length;

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
        <Icon name="reglages" size={iconSizes.lg} color={colors.blanc} />
      </Pressable>
      <TabScreen title={profile.displayName} kicker="CARTE DE JOUEUR">
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
                <Icon name="profil" size={iconSizes.xs} color={colors.chartreuse} />
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
              {/* Niveau · ville : descripteur d'identité compact (le tier est lu
                  sur l'anneau d'avatar ; le niveau détaillé vit dans Progression).
                  Wrap sur 2 lignes plutôt que couper au « … » (Règle §A.9). */}
              <Text style={styles.identity} numberOfLines={2}>
                Niveau {runnerLevel} · {profile.city}
              </Text>
              <View style={styles.crewRow}>
                <CrewCrest seed={MY_CREW.seed} name={MY_CREW.name} size="s" />
                <Text style={styles.crewName} numberOfLines={1}>
                  {profile.crewName}
                </Text>
              </View>
            </View>
          </View>
          {/* Bio + stats (zones tenues, rang ville) SORTIES de la surface pour tenir
              ≤ 3 infos (§A) : les zones tenues sont le héros du module « Mon
              territoire » juste dessous, le rang vit dans Saison, la bio s'édite via
              « Modifier profil ». La card ne garde que l'IDENTITÉ. */}
          {/* Actions LÉGÈRES (AMENDEMENT-22 §3) — façon Strava : icône + label, pas
              de gros rectangle. Le seul gros CTA chartreuse de l'écran est l'action
              CONTEXTUELLE du territoire (Défendre / Conquérir), pas l'édition de profil.
              Verbe + objet (« Modifier profil », jamais un verbe seul ni un GO). */}
          <View style={styles.headerActions}>
            <IconAction
              icon="profil"
              label="Modifier profil"
              accessibilityLabel="Modifier mon profil"
              onPress={openEdit}
            />
            <IconAction
              icon="partage"
              label="Partager"
              accessibilityLabel="Partager ma carte de joueur"
              onPress={() => {
                setShareOpen((v) => !v);
                if (!shareOpen) toast.show('Carte de partage prête — capture-la pour la partager');
              }}
            />
          </View>
        </View>

        {/* Share card 4:5 (doc §18/§24) — révélée inline au tap sur Partager */}
        {shareOpen ? (
          <View style={styles.shareCardWrap}>
            <ShareCard
              stat={`#${seasonRank}`}
              statLabel={`Rang saison · ${profile.seasonScope}`}
              title={`${profile.displayName} · ${profile.crewName}`}
              subtitle={`${GRIP_RANK_LABELS[gripRank]} · niv. ${runnerLevel} · ${displayedTitle}`}
            >
              {/* Carte identité character-forward : GRIP porte la signature GRYD. */}
              <GripMascot rank={gripRank} size={72} />
            </ShareCard>
          </View>
        ) : null}

        {/* ── MODULE 1 · TERRITOIRE = RÉSUMÉ STRATÉGIQUE (AMENDEMENT-18 Partie B) ──
            Ce que je contrôle · ce qui est menacé · ma PROCHAINE action. Card
            compacte ≤ 260 px, 60 % stats / 40 % mini-carte, CTA CONTEXTUEL. */}
        <View style={styles.sectionRow}>
          <Icon name="pin" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>MON TERRITOIRE</Text>
        </View>
        {/* Card = View (pas Pressable) : la CTA est un bouton propre à part
            → évite le <button> dans <button>. Le RÉSUMÉ (statut/stats/carte)
            est lui-même tappable pour ouvrir /territoire, la CTA fait l'action. */}
        {/* Widget « Mon territoire » (spec 17/07) : quand le RÉEL existe, il
            REMPLACE le résumé stratégique démo ci-dessous — jamais deux blocs
            « MON TERRITOIRE », jamais une démo présentée comme le joueur. */}
        {widgetView ? (
          <TerritoryWidgetCard view={widgetView} />
        ) : (
        <View style={styles.territoryCard}>
            {/* Bannière de crise (SOUS ATTAQUE) — ton rival, au-dessus du reste */}
            {territory.alert ? (
              <View style={styles.territoryAlert}>
                <Icon name="alerte" size={iconSizes.xs} color={colors.noir} />
                <Text style={styles.territoryAlertText} numberOfLines={1}>
                  {territory.alert}
                </Text>
              </View>
            ) : null}
  
            {/* Résumé tappable → détail /territoire */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le détail de mon territoire"
              onPress={() => router.push('/territoire')}
              style={({ pressed }) => [styles.territoryBody, pressed && styles.dim]}
            >
              {/* ── 60 % STATS ── */}
              <View style={styles.territoryStats}>
                {/* Ligne statut : badge coloré (Stable / Contesté / Sous attaque…).
                    Masquée quand la bannière de crise est là : elle porte déjà le
                    statut → pas de doublon, on gagne la hauteur (≤ 260 px). */}
                {territory.alert ? null : (
                  <View style={styles.territoryStatusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusLabel, { color: statusColor }]} numberOfLines={1}>
                      {statusMeta.label}
                    </Text>
                  </View>
                )}
  
                {/* Gros chiffre : zones tenues + unité, puis portée sur toute la
                    largeur (quartier « Paris Est » ou villes « Paris 42 · Lille 13 »
                    — jamais tronqué : c'est une donnée, pas un pseudo). */}
                <View style={styles.territoryHero}>
                  <Text style={styles.territoryHeroNum}>{formatInt(territory.zonesHeld)}</Text>
                  <Text style={styles.territoryHeroUnit} numberOfLines={2}>
                    {territory.zonesUnit}
                  </Text>
                </View>
                <Text style={styles.territoryHeroScope} numberOfLines={1}>
                  {territory.scopeLabel}
                </Text>
                {/* Faits stratégiques (frontières · routes · zone à défendre) déportés
                    au détail /territoire — le résumé garde statut + héros + action (§A). */}
              </View>
  
              {/* ── 40 % MINI-CARTE (aperçu statique, non-interactif) ── */}
              <View style={styles.territoryMini}>
                <TerritoryFranceMap preview />
              </View>
            </Pressable>
  
            {/* ── PROCHAINE ACTION + CTA CONTEXTUEL (jamais « Explorer » vague) ── */}
            <View style={styles.territoryNextRow}>
              <Text
                style={styles.territoryNext}
                numberOfLines={territory.next.allowLongHeadline ? 3 : 2}
              >
                {territory.next.headline}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={territory.next.cta}
                onPress={() => router.push(territory.next.route)}
                style={({ pressed }) => [
                  styles.territoryCta,
                  { backgroundColor: cta.bg },
                  pressed && styles.dim,
                ]}
              >
                <Text
                  style={[styles.territoryCtaLabel, { color: cta.fg }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {territory.next.cta}
                </Text>
              </Pressable>
            </View>
            {/* Micro-badges territoire déportés au détail /territoire (le résumé
                reste à ≤ 3 infos : statut · héros zones · prochaine action). */}
          </View>
        )}

        {/* ── SOLO (A.5) : l'app ne semble jamais vide — crews près de toi ── */}
        {territory.soloCrewHint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={territory.soloCrewHint.headline}
            onPress={() => router.push(territory.soloCrewHint!.route)}
            style={({ pressed }) => [styles.soloCrewCard, pressed && styles.dim]}
          >
            <Icon name="crew" size={iconSizes.md} color={colors.chartreuse} />
            <View style={styles.soloCrewInfo}>
              <Text style={styles.soloCrewHeadline} numberOfLines={1}>
                {territory.soloCrewHint.headline}
              </Text>
              <Text style={styles.soloCrewSub} numberOfLines={1}>
                Cours et défends avec eux
              </Text>
            </View>
            <Text style={styles.soloCrewCta} numberOfLines={1} ellipsizeMode="clip">
              {territory.soloCrewHint.cta}
            </Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        ) : null}

        {/* ── MODULE 2 · PROGRESSION : Niveau N → N+1, jauge XP réelle ── */}
        <View style={styles.sectionRow}>
          <Icon name="niveau" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>PROGRESSION</Text>
        </View>
        <View style={styles.progressCard}>
          {/* GRIP — le personnage à son rang (§43.3) : la progression a un visage,
              façon Waze. Pose DÉRIVÉE du niveau, jamais achetée (anti pay-to-win). */}
          <View style={styles.gripRow}>
            <GripMascot rank={gripRank} size={72} />
            <View style={styles.gripInfo}>
              <Text style={styles.gripRankName} numberOfLines={1}>
                {GRIP_RANK_LABELS[gripRank]}
              </Text>
              <View style={styles.levelRow}>
                <Text style={styles.levelLabel}>
                  Niveau {runnerLevel} <Text style={styles.levelArrow}>→</Text>{' '}
                  {Math.min(runnerLevel + 1, PLAYER_LEVEL_MAX)}
                </Text>
                <Text style={styles.levelXp}>
                  {formatInt(xp)} / {formatInt(levelCeil)} XP
                </Text>
              </View>
              <ProgressBar value={levelRatio} height={8} />
            </View>
          </View>
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>{MY_SOCIAL_PROFILE.formeScore}</Text>
              <Text style={styles.progressStatLabel}>Score Forme</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>
                {formatMultiplier(streakMultiplier)}
              </Text>
              {/* Même source que le multiplicateur (serveur si session, sinon
                  démo) — le libellé ne peut pas contredire le chiffre. */}
              <Text style={styles.progressStatLabel}>Série · {streakWeeks} sem</Text>
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
          <Icon name="badge" size={iconSizes.sm} color={colors.gris} />
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
            Voir la collection ({unlockedCount}/{BADGE_TOTAL})
          </Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>

        {/* ── MODULE 4 · SKILLS : spécialisations gagnées par comportement ──
            (AMENDEMENT-23 §C, doc §28-§29). DISTINCT des badges : rôle /
            reco mission, pas une récompense de collection. Une LIGNE légère
            par famille posée sur l'espace (pas de card-dans-card AMENDEMENT-22) :
            icône + « <name> <roman> · <value> <unité> » + jauge de progression.
            Verrouillé (niveau 0) → « commence à <seuil I> ». Anti pay-to-win :
            AUCUN gain de territoire/points affiché (Supporter = entraide only). */}
        <View style={styles.sectionRow}>
          <Icon name="niveau" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>SPÉCIALISATIONS</Text>
          <Text style={styles.sectionRowCount}>{skillsUnlockedCount}/{SKILLS.length}</Text>
        </View>
        <View style={styles.skillsBlock}>
          {derivedSkills.map((s) => {
            const locked = s.level === 0;
            const roman = s.level > 0 ? SKILL_ROMAN[s.level - 1] : null;
            // Roman du PROCHAIN niveau (défini seulement si non maxé → index ≤ 2).
            const nextRoman = (SKILL_ROMAN as readonly string[])[s.level] ?? '';
            return (
              <View key={s.def.id} style={styles.skillRow}>
                <Icon
                  name={s.def.icon as IconName}
                  size={iconSizes.lg}
                  color={locked ? colors.gris : colors.chartreuse}
                />
                <View style={styles.skillInfo}>
                  {/* Titre : « Route Maker III · 18 routes ouvertes » (jamais tronqué) */}
                  <Text style={styles.skillTitle}>
                    {locked ? (
                      <Text style={styles.skillLocked}>{s.def.name}</Text>
                    ) : (
                      <>
                        {s.def.name}{' '}
                        <Text style={styles.skillRoman}>{roman}</Text>
                      </>
                    )}
                    {locked ? null : (
                      <Text style={styles.skillMeta}>
                        {'  ·  '}
                        {formatInt(s.value)} {s.unit}
                      </Text>
                    )}
                  </Text>
                  {/* Jauge = progression dans le niveau courant (ou pleine si maxé) */}
                  <View style={styles.skillGauge}>
                    <ProgressBar
                      value={s.progress}
                      height={5}
                      fill={locked ? colors.gris : colors.chartreuse}
                    />
                  </View>
                  {/* Sous-ligne : reste vers le prochain niveau, palier max, ou
                      amorçage si verrouillé. Toujours une donnée, non tronquée. */}
                  <Text style={styles.skillSub}>
                    {locked
                      ? `Commence à ${formatInt(s.def.levels[0].threshold)} ${s.unit}`
                      : s.maxed
                        ? 'Niveau max atteint'
                        : `${formatInt(s.remaining)} ${s.unit} avant ${s.def.name} ${nextRoman}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* RACCOURCIS — listes longues déportées en pages dédiées (« PLUS » était
            un label vague, banni des libellés d'action) */}
        <Text style={styles.sectionLabel}>RACCOURCIS</Text>
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

  // ── Bouton Paramètres (overlay coin haut-droit, au-dessus du scroll) —
  //    cible de tap ≥ 44 px (+ hitSlop). ──
  settingsBtn: {
    position: 'absolute',
    right: spacing.cardPadding - 6,
    zIndex: 10,
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Player Card compacte : la SEULE surface N1 de l'identité (AMENDEMENT-22).
  //    Pas de contour (80/20 : un cadre de card n'est pas un état) — elle se
  //    détache du fond par sa surface + l'espace, pas par une bordure. ──
  headerCard: {
    marginTop: spacing.md,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 14,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerInfo: { flex: 1 },
  // Avatar pressable + pastille crayon (édition évidente sur la card). Variante
  //  SURFACE/contour chartreuse (pas un disque plein) : le SEUL chartreuse plein
  //  de la scène reste le gros CTA territoire (charte : un seul accent plein).
  avatarPress: { width: 72, height: 72 },
  editPencil: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone,
    borderWidth: 1.5,
    borderColor: colors.chartreuse,
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
  identity: { color: colors.gris, fontSize: fontSizes.xs, marginTop: spacing.xxs, letterSpacing: 0.3 },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  crewName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  // Actions légères (IconAction) — rangée répartie, sans gros rectangle.
  headerActions: { flexDirection: 'row', justifyContent: 'flex-start', gap: 28 },
  shareCardWrap: { marginTop: 14 },

  // ── En-têtes de section ──
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },

  // ── MODULE Territoire = résumé stratégique (AMENDEMENT-18 Partie B).
  //    Surface N1 unique, sans contour (80/20) — sa CTA contextuelle porte le
  //    seul gros accent de l'écran. ──
  territoryCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  // Bannière de crise (SOUS ATTAQUE) — pleine, ton rival, texte foncé (contraste)
  territoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.rival,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  territoryAlertText: {
    flex: 1,
    color: colors.noir,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Corps 60/40 : stats à gauche, mini-carte à droite
  territoryBody: { flexDirection: 'row', gap: spacing.sm },
  territoryStats: { flex: 3, justifyContent: 'space-between', gap: 5 },
  territoryStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 0.8 },
  // Gros chiffre héros + unité à droite, portée en dessous (pleine largeur)
  territoryHero: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  territoryHeroNum: {
    color: colors.chartreuse,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  territoryHeroUnit: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.3,
    letterSpacing: 0.2,
    paddingBottom: spacing.xxs,
  },
  territoryHeroScope: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  // Mini-carte (aperçu statique, ~40 %) — VRAIE preview de contenu (la carte EST
  //  le container) : pas de cadre, elle flotte sur la surface, fond = espace N0.
  territoryMini: {
    flex: 2,
    minHeight: 92,
    borderRadius: radii.control,
    overflow: 'hidden',
    backgroundColor: elevation.base,
  },
  // Prochaine action : contexte à gauche + CTA plein à droite (jamais tronqué)
  territoryNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingTop: spacing.xs,
  },
  territoryNext: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    lineHeight: fontSizes.sm * 1.28,
  },
  // CTA contextuel — cible de tap ≥ 44 px.
  territoryCta: {
    borderRadius: radii.pill,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  territoryCtaLabel: { fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.6 },

  // ── Bloc SOLO : crews près de toi (A.5 — jamais de vide en solo) ──
  // Bloc SOLO = invitation (prompt) → l'un des 20 % avec contour : filet chartreuse
  //  DOUX (borderState.activeSoft) qui signale un état d'appel, pas un cadre décoratif.
  soloCrewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginTop: spacing.sm,
  },
  soloCrewInfo: { flex: 1 },
  soloCrewHeadline: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  soloCrewSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  soloCrewCta: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 0.4 },

  // ── MODULE Progression ──
  progressCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 10,
  },
  gripRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gripInfo: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  gripRankName: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
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
  progressStatsRow: { flexDirection: 'row', marginTop: spacing.xxs },
  progressStat: { flex: 1, gap: 2 },
  progressStatValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressStatLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },

  // ── MODULE Badges — les 3 hexes POSÉS sur l'espace (pas de mini-card par badge :
  //    card-dans-card interdit). Le badge lui-même EST l'objet, il n'a pas besoin
  //    d'un cadre. ──
  badgeRow: { flexDirection: 'row', gap: 10 },
  badgeCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  badgeName: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  // Lien « Voir la collection » = row LÉGÈRE posée sur l'espace (pas une card) :
  //  un simple filet haut la sépare des hexes, façon liste Strava.
  collectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xxs,
    marginTop: spacing.xs,
  },
  collectionLinkLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ── MODULE Skills — lignes LÉGÈRES posées sur l'espace (AMENDEMENT-22 : pas de
  //    card-dans-card ; le skill n'a pas de cadre propre, il est séparé du suivant
  //    par un filet neutre). Icône à gauche, texte non tronqué, jauge fine. ──
  sectionRowCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    marginLeft: 'auto',
  },
  skillsBlock: { gap: 2 },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  skillInfo: { flex: 1, gap: 6 },
  // Titre = nom + niveau + valeur sur une seule chaîne (wrap si besoin, jamais « … »).
  skillTitle: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  skillRoman: { color: colors.chartreuse, fontWeight: '800' },
  skillMeta: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  skillLocked: { color: colors.gris, fontWeight: '700' },
  skillGauge: { marginRight: 2 },
  skillSub: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },

  // ── PLUS ──
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: spacing.sm,
  },
  // PLUS = liste de navigation LÉGÈRE (façon Strava) : rows posées sur l'espace,
  //  séparées par un filet neutre (borderState.hairline), PAS une card par lien.
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  linkInfo: { flex: 1 },
  linkLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  linkDetail: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3 },
  signOutWrap: { marginTop: 18 },
});
