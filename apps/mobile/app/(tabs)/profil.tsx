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
 * RETOUR TERRAIN 20/07 (« le bloc du haut, rien n'est aligné » · « trop de
 * scroll, pas assez intuitif » · « le raccourci fait doublon avec Paramètres ») :
 *  1. Le pseudo n'est plus affiché DEUX fois (titre d'écran + card) — le titre
 *     d'écran est le nom de la page (« Moi ») et l'identité vit dans UNE grille :
 *     avatar 72 │ colonne (nom · @handle · titre · niveau/ville), crew en pleine
 *     largeur dessous, puis un bandeau de 3 chiffres à colonnes égales en
 *     tabular-nums (§A r.17 : niveau · rang · zones tenues).
 *  2. SPÉCIALISATIONS (8 familles) est un ACCORDÉON replié par défaut — le
 *     compteur « n/8 » reste visible en surface, le détail est au tap (§A).
 *  3. RACCOURCIS perd ses 4 doublons du bouton Paramètres (Arsenal, Sources,
 *     Support, Paramètres — tous dans /parametres) et ses sous-titres : 10 rows
 *     à 2 étages → 4-6 rows à 1 étage.
 *
 * RETOUR FONDATEUR précédent : « pas trouvé les boutons pour modifier le profil » → la
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
import type { Entry } from '../../src/i18n/types';
import { useT } from '../../src/i18n/store';
import { C } from '../../src/i18n/catalog/profil';
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
  label: Entry;
  icon: IconName;
  href: string;
}

/**
 * RACCOURCIS — destinations de JEU uniquement, une LIGNE chacune.
 *
 * RETOUR TERRAIN 20/07 (« le raccourci créer sous forme de menu déroulant ou
 * complètement le retirer et créer juste un bouton paramètre », « trop de
 * scroll ») : les 4 entrées qui FAISAIENT DOUBLON avec le bouton Paramètres
 * (engrenage, haut-droit) sont RETIRÉES de cette liste — Arsenal, Sources
 * connectées, Support/Aide et Paramètres lui-même sont déjà des lignes de
 * `SETTINGS_GROUPS` dans /parametres, donc toujours atteignables à 2 taps.
 * Le sous-titre descriptif de chaque ligne saute aussi : il doublait la hauteur
 * de la liste sans rien apprendre (« Historique de courses » se comprend seul).
 * 10 lignes à 2 étages → 4 à 6 lignes à 1 étage.
 *
 * « Confidentialité & géoloc » RESTE ici : accès DIRECT à 1 tap (audit
 * confiance — la géoloc ne s'enterre pas sous Paramètres), en plus de sa ligne
 * dans /parametres.
 */
const LINKS: readonly ProfileLink[] = [
  // Sortis de la barre (nav 4 slots) — accès depuis « Moi » (décision fondateur).
  // D8 : hors MVP fermé, Saison/Missions disparaissent de la SURFACE (flags.ts)
  // — les moteurs continuent d'accumuler, rien n'est perdu au flip.
  ...(flags.season
    ? [{ label: C.linkSeason, icon: 'classement', href: '/classement' } as const]
    : []),
  ...(flags.warRoom ? [{ label: C.linkMissions, icon: 'guerre', href: '/warroom' } as const] : []),
  { label: C.linkFriends, icon: 'ami', href: '/amis' },
  { label: C.linkPerformance, icon: 'performance', href: '/performance' },
  { label: C.linkHistory, icon: 'historique', href: '/historique' },
  { label: C.linkPrivacy, icon: 'verrou', href: '/confidentialite' },
];

export default function ProfilScreen() {
  const t = useT();
  const widgetView = useTerritoryWidgetView();
  const { session, configured } = useSession();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [shareOpen, setShareOpen] = useState(false);
  /** Spécialisations : 8 familles = 8 lignes hautes. Repliées PAR DÉFAUT
   *  (retour terrain 20/07 « trop de scroll ») — détails au tap (§A). */
  const [skillsOpen, setSkillsOpen] = useState(false);

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
  // O1 (états vides) : un vrai user (session) n'a pas encore de crew — aucune source
  // crew réelle n'est peuplée (crew_members vide) et l'onglet Crew montre l'EmptyState.
  // Le profil ne doit donc PAS afficher le crew démo « LES FOULÉES 9³ » : ce serait une
  // contradiction directe. De même, pas de faux rang de saison tant que le serveur n'en
  // renvoie pas. Showcase (web/dev sans session) : identité démo complète inchangée.
  const realUser = configured && !!session;
  const showCrew = !realUser;
  const hasRealSeasonRank = economy.source === 'server' && economy.seasonRank != null;
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

  /**
   * Bandeau de 3 chiffres de la player card (§A r.17 : niveau · rang · zones
   * tenues). Colonnes de largeur ÉGALE, valeurs en tabular-nums → les chiffres
   * s'alignent verticalement quel que soit leur nombre de digits.
   *
   * ZÉRO MENSONGE : un vrai user ne voit QUE des chiffres réels — les zones
   * tenues démo (`territory.zonesHeld`, scénario showcase) et le rang de saison
   * non résolu par le serveur ne s'affichent jamais pour lui ; à la place, le
   * compteur de badges (user_badges réel) tient la 3ᵉ colonne.
   */
  const headerStats: readonly { value: string; label: string }[] = realUser
    ? [
        { value: formatInt(runnerLevel), label: t(C.levelWord) },
        ...(hasRealSeasonRank
          ? [{ value: `#${formatInt(seasonRank)}`, label: t(C.statRankShort) }]
          : []),
        { value: formatInt(unlockedCount), label: t(C.statBadgesShort) },
      ]
    : [
        { value: formatInt(runnerLevel), label: t(C.levelWord) },
        { value: `#${formatInt(seasonRank)}`, label: t(C.statRankShort) },
        { value: formatInt(territory.zonesHeld), label: t(C.statZonesHeld) },
      ];

  useEffect(() => {
    screen('profil');
  }, []);

  const openEdit = () => router.push('/profil-edit');

  return (
    <>
      {/* Accès Paramètres — icône réglages en haut à droite, hors du flux compact */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.a11yOpenSettings)}
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
      {/* Titre d'écran = le NOM DE LA PAGE, plus le pseudo : le pseudo était
          affiché DEUX fois (titre 28 px collé à gauche de l'écran, puis dans la
          card, décalé de la largeur de l'avatar) — d'où le « rien n'est aligné ».
          L'identité vit maintenant dans UN seul bloc, la player card. */}
      <TabScreen title={t(C.tabMe)} kicker={t(C.kickerPlayerCard)}>
        {/* ── PLAYER CARD (§A r.17) — UNE grille, trois rangées :
            1. avatar 72 │ colonne texte (pseudo · @handle · titre · niveau/ville)
            2. crew (pleine largeur, sous la grille — plus une 4ᵉ ligne serrée)
            3. bandeau de 3 chiffres à colonnes égales, tabular-nums
            puis les 2 actions légères. Toute la colonne texte partage le MÊME
            bord gauche et un interligne régulier (gap, plus de marginTop
            au cas par cas) : c'est ça, la baseline commune. ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            {/* Avatar + crayon d'édition ÉVIDENT posé dessus (affordance 1/2) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.editMyProfile)}
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
              <Text style={styles.name} numberOfLines={1}>
                {profile.displayName}
              </Text>
              {/* @handle — invariant technique, jamais traduit. Directement sous
                  le nom, même bord gauche : le couple nom/@ se lit d'un bloc. */}
              <Text style={styles.handle} numberOfLines={1}>
                @{profile.handle}
              </Text>
              {/* Titre affiché (cosmétique équipé prioritaire). Chartreuse sur
                  surface N1 SOMBRE (elevation.surface = carbone) — jamais clair. */}
              <Text style={styles.title} numberOfLines={1}>
                {displayedTitle}
              </Text>
              {/* Niveau · ville : descripteur d'identité compact (le tier est lu
                  sur l'anneau d'avatar ; le niveau détaillé vit dans Progression).
                  Wrap sur 2 lignes plutôt que couper au « … » (Règle §A.9). */}
              <Text style={styles.identity} numberOfLines={2}>
                {t(C.identityLine, { n: runnerLevel, city: profile.city })}
              </Text>
            </View>
          </View>
          {showCrew ? (
            <View style={styles.crewRow}>
              <CrewCrest seed={MY_CREW.seed} name={MY_CREW.name} size="s" />
              <Text style={styles.crewName} numberOfLines={1}>
                {profile.crewName}
              </Text>
            </View>
          ) : null}
          {/* Bandeau de chiffres — colonnes de largeur égale, valeurs alignées
              sur une même ligne de base, libellés courts sur une seule ligne. */}
          <View style={styles.statsStrip}>
            {headerStats.map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {s.value}
                </Text>
                {/* §A.9 — jamais de texte tranché en plein mot. `clip` coupait
                    net les libellés longs (pt « Rank temporada », de « Zonen
                    gehalten ») sur un écran 320 pt, SANS signal que du texte
                    manquait. `adjustsFontSizeToFit` rétrécit plutôt que couper —
                    le libellé reste entier dans les 5 langues. */}
                <Text
                  style={styles.statLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
          {/* Actions LÉGÈRES (AMENDEMENT-22 §3) — façon Strava : icône + label, pas
              de gros rectangle. Le seul gros CTA chartreuse de l'écran est l'action
              CONTEXTUELLE du territoire (Défendre / Conquérir), pas l'édition de profil.
              Verbe + objet (« Modifier profil », jamais un verbe seul ni un GO). */}
          <View style={styles.headerActions}>
            <IconAction
              icon="profil"
              label={t(C.actionEditProfile)}
              accessibilityLabel={t(C.editMyProfile)}
              onPress={openEdit}
            />
            <IconAction
              icon="partage"
              label={t(C.actionShare)}
              accessibilityLabel={t(C.a11yShareCard)}
              onPress={() => {
                setShareOpen((v) => !v);
                if (!shareOpen) toast.show(t(C.toastShareReady));
              }}
            />
          </View>
        </View>

        {/* Share card 4:5 (doc §18/§24) — révélée inline au tap sur Partager */}
        {shareOpen ? (
          <View style={styles.shareCardWrap}>
            <ShareCard
              stat={realUser && !hasRealSeasonRank ? `${runnerLevel}` : `#${seasonRank}`}
              statLabel={
                realUser && !hasRealSeasonRank
                  ? t(C.levelWord)
                  : t(C.statSeasonRank, { scope: profile.seasonScope })
              }
              title={showCrew ? `${profile.displayName} · ${profile.crewName}` : profile.displayName}
              subtitle={t(C.shareSubtitle, {
                rank: GRIP_RANK_LABELS[gripRank],
                n: runnerLevel,
                title: displayedTitle,
              })}
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
          <Text style={styles.sectionRowLabel}>{t(C.sectionTerritory)}</Text>
        </View>
        {/* Card = View (pas Pressable) : la CTA est un bouton propre à part
            → évite le <button> dans <button>. Le RÉSUMÉ (statut/stats/carte)
            est lui-même tappable pour ouvrir /territoire, la CTA fait l'action. */}
        {/* Widget « Mon territoire » (spec 17/07) : quand le RÉEL existe, il
            REMPLACE le résumé stratégique démo ci-dessous — jamais deux blocs
            « MON TERRITOIRE », jamais une démo présentée comme le joueur. */}
        {widgetView ? (
          <TerritoryWidgetCard view={widgetView} />
        ) : realUser ? (
          // O1 : un vrai user dont le widget réel n'est pas (encore) résolu
          // (chargement / pas de capture) ne doit PAS voir le résumé DÉMO
          // « Paris 42 · Lille 13 » comme si c'était le sien — rien plutôt qu'un mensonge.
          null
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
              accessibilityLabel={t(C.a11yOpenTerritory)}
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
                {t(C.soloCrewSub)}
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
          <Text style={styles.sectionRowLabel}>{t(C.sectionProgress)}</Text>
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
                  {t(C.levelWord)} {runnerLevel} <Text style={styles.levelArrow}>→</Text>{' '}
                  {Math.min(runnerLevel + 1, PLAYER_LEVEL_MAX)}
                </Text>
                <Text style={styles.levelXp}>
                  {formatInt(xp)} / {formatInt(levelCeil)} XP
                </Text>
              </View>
              <ProgressBar value={levelRatio} height={8} />
            </View>
          </View>
          {/* Zéro-lie : Score Forme et « % du coffre crew » ne sont pas encore
              câblés au réel (O1) — les présenter à côté de la Série RÉELLE (issue
              d'une session) ferait passer de la démo pour du vrai. Sur session
              serveur on n'affiche donc QUE des stats réelles (Série + Niveau +
              badges débloqués) ; en démo, la rangée démo reste cohérente. */}
          <View style={styles.progressStatsRow}>
            {(economy.source === 'server'
              ? [
                  {
                    value: formatMultiplier(streakMultiplier),
                    label: t(C.statStreak, { n: streakWeeks }),
                  },
                  { value: formatInt(unlockedCount), label: t(C.statBadgesUnlocked) },
                ]
              : [
                  { value: `${MY_SOCIAL_PROFILE.formeScore}`, label: t(C.statFormScore) },
                  {
                    value: formatMultiplier(streakMultiplier),
                    label: t(C.statStreak, { n: streakWeeks }),
                  },
                  {
                    value: `${MY_SOCIAL_PROFILE.crewChestContribPct} %`,
                    label: t(C.statCrewChest),
                  },
                ]
            ).map((s) => (
              <View key={s.label} style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{s.value}</Text>
                <Text style={styles.progressStatLabel} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── MODULE 3 · BADGES : 3 équipés + « Voir collection » (pas géant) ── */}
        <View style={styles.sectionRow}>
          <Icon name="badge" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>{t(C.sectionBadges)}</Text>
        </View>
        <View style={styles.badgeRow}>
          {featuredBadges.map((def) => (
            <Pressable
              key={def.id}
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yBadge, { name: def.name })}
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
          accessibilityLabel={t(C.a11ySeeBadgeCollection)}
          onPress={() => router.push('/badges')}
          style={({ pressed }) => [styles.collectionLink, pressed && styles.dim]}
        >
          <Text style={styles.collectionLinkLabel}>
            {t(C.seeCollection, { n: unlockedCount, total: BADGE_TOTAL })}
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
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: skillsOpen }}
          accessibilityLabel={t(C.a11yToggleSection, { section: t(C.sectionSkills) })}
          onPress={() => setSkillsOpen((v) => !v)}
          style={({ pressed }) => [styles.sectionRow, pressed && styles.dim]}
        >
          <Icon name="niveau" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>{t(C.sectionSkills)}</Text>
          <Text style={styles.sectionRowCount}>
            {skillsUnlockedCount}/{SKILLS.length}
          </Text>
          <View style={skillsOpen ? styles.chevronOpen : styles.chevronClosed}>
            <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
          </View>
        </Pressable>
        <View style={styles.skillsBlock}>
          {(skillsOpen ? derivedSkills : []).map((s) => {
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
                        {/* Retour terrain 20/07 : le NOM d'une spécialisation
                            débloquée passe en chartreuse (comme son icône) —
                            fond = espace N0 (colors.noir), donc jamais de
                            chartreuse sur clair. Verrouillé = gris. */}
                        <Text style={styles.skillNameUnlocked}>{s.def.name}</Text>{' '}
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
                      ? t(C.skillStartAt, { n: formatInt(s.def.levels[0].threshold), unit: s.unit })
                      : s.maxed
                        ? t(C.skillMaxed)
                        : t(C.skillRemaining, {
                            n: formatInt(s.remaining),
                            unit: s.unit,
                            name: s.def.name,
                            roman: nextRoman,
                          })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* RACCOURCIS — listes longues déportées en pages dédiées (« PLUS » était
            un label vague, banni des libellés d'action) */}
        <Text style={styles.sectionLabel}>{t(C.sectionShortcuts)}</Text>
        {LINKS.map((link) => (
          <Pressable
            key={link.href}
            accessibilityRole="button"
            accessibilityLabel={t(link.label)}
            onPress={() => router.push(link.href)}
            style={({ pressed }) => [styles.linkRow, pressed && styles.dim]}
          >
            <Icon name={link.icon} size={iconSizes.md} color={colors.blanc} />
            <Text style={styles.linkLabel} numberOfLines={1}>
              {t(link.label)}
            </Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        ))}

        {configured && session ? (
          <View style={styles.signOutWrap}>
            <GhostButton label={t(C.signOut)} onPress={() => void signOut()} />
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
  // Colonne texte : UN seul bord gauche, UN interligne régulier (gap) — plus de
  // marginTop au cas par cas (3 px ici, spacing.xxs là) qui désalignait tout.
  headerInfo: { flex: 1, gap: spacing.xxs },
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
  // Nom affiché — le seul texte « lourd » de la colonne (hiérarchie 1).
  name: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: fontSizes.lg * 1.15,
  },
  // @handle — gris, juste sous le nom, MÊME bord gauche (hiérarchie 2).
  handle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: fontSizes.sm * 1.2,
  },
  // Titre cosmétique — chartreuse sur surface N1 SOMBRE (carbone), jamais clair.
  title: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: fontSizes.xs * 1.25,
  },
  identity: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
    lineHeight: fontSizes.xs * 1.3,
  },
  // Crew : rangée pleine largeur SOUS la grille avatar/texte (plus une 4ᵉ ligne
  // serrée dans la colonne) — le blason s'aligne sur le bord de la card.
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  crewName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  // Bandeau de chiffres — colonnes ÉGALES, filet haut discret, tabular-nums :
  // les valeurs restent alignées quel que soit le nombre de digits.
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingTop: spacing.sm,
  },
  statCell: { flex: 1, gap: 2 },
  statValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },
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
    // Plancher tactile : les en-têtes REPLIABLES (Spécialisations) sont des
    // Pressable. Sans minHeight, leur cible utile valait la hauteur du texte
    // (~20 px) — les marges ne sont PAS tactiles. Le seul moyen d'ouvrir la
    // section était une bande de 20 px.
    minHeight: sizes.touchTarget,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  // Chevron d'accordéon : « > » au repos, « v » ouvert (l'icône `chevron` du set
  // pointe à droite — on la fait pivoter, pas de second tracé à inventer).
  chevronClosed: { marginLeft: spacing.xs },
  chevronOpen: { marginLeft: spacing.xs, transform: [{ rotate: '90deg' }] },

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
  // Nom d'une spécialisation DÉBLOQUÉE : chartreuse, comme son icône (retour
  // terrain 20/07). Fond = espace N0 sombre → contraste conforme.
  skillNameUnlocked: { color: colors.chartreuse, fontWeight: '700' },
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
  // RACCOURCIS = liste de navigation LÉGÈRE (façon Strava) : rows posées sur
  //  l'espace, séparées par un filet neutre, PAS une card par lien. UNE seule
  //  ligne de texte par row (le sous-titre descriptif est supprimé) → cible de
  //  tap toujours ≥ 44 px grâce au minHeight, moitié moins de scroll.
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  linkLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  signOutWrap: { marginTop: 18 },
});
