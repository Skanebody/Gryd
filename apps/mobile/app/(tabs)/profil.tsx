/**
 * GRYD — onglet Profil, RECALÉ SUR LA PLANCHE E15 « Profil joueur » (25/07/2026).
 *
 * ─── CE QUE LA PLANCHE CHANGE ───────────────────────────────────────────────
 * Le Profil n'est plus un TABLEAU DE STATISTIQUES, c'est une CARTE DE VISITE
 * TERRITORIALE. L'œil descend : identité → preuve → carte → progression, puis
 * des previews scannables vers les pages de collection. Composition imposée,
 * de haut en bas :
 *   1. HÉROS 210 pt (photo ou avatar généré) + pilule « Modifier » en haut-droite ;
 *   2. identité posée sur le bas du héros : avatar + pastille NIV., nom, @handle,
 *      ligne « CREW · ville · #rang », pastille de VISIBILITÉ (→ Confidentialité) ;
 *   3. QUATRE métriques MAX en UN bloc à séparateurs (jamais 4 cards), dont UNE
 *      seule mise en avant : la surface contrôlée ;
 *   4. card CARTE SIGNATURE 164 pt — la preuve territoriale personnelle ;
 *   5. progression en UNE ligne (GRIP · niveau · rang · XP · jauge) ;
 *   6. previews en LIGNES (activité récente · PROCHAINE MISSION · badges ·
 *      historique) — les collections complètes vivent dans leurs pages.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 *  · La player card compacte (avatar 72 + grille d'alignement optique) : le
 *    héros la remplace. Les trois passes d'alignement qu'elle documentait
 *    portaient sur une composition qui n'existe plus.
 *  · Le bandeau « Niveau · #Rang · Badges » : remplacé par les 4 métriques de la
 *    planche, qui disent le TERRITOIRE (la matière du jeu) au lieu du méta.
 *  · TerritoryWidgetCard : le widget portait le seul gros CTA chartreuse de
 *    l'écran. La planche E15 n'en a AUCUN — un profil ne se joue pas, il se lit.
 *    L'action contextuelle vit sur la Carte, où elle est utile. SEULE exception :
 *    le compte NEUF, dont les métriques sont remplacées par la PREMIÈRE MISSION
 *    (jamais quatre zéros alignés), qui porte alors l'unique CTA de l'écran.
 *  · La ligne « #N à {ville} · {delta} pts » : le rang local remonte dans la
 *    ligne d'identité (planche), il n'est plus répété plus bas.
 *  · La rangée « série ×mult · badges débloqués » de la card Progression : la
 *    série RÉELLE reste rendue par StreakBlock sur /aujourdhui et au post-run,
 *    les badges par la preview dédiée. Rien n'est perdu, rien n'est dupliqué.
 *
 * ─── CE QUI EST REVENU (décision fondateur, 25/07/2026) ─────────────────────
 * « PROCHAINE MISSION ». Le recalage l'avait retirée avec le widget, au motif
 * qu'elle est absente de la planche — mais c'était le SEUL rappel de mission
 * hors de la Carte : le Profil est l'écran qu'on ouvre pour se regarder, et il
 * ne disait plus jamais quoi faire ensuite. Elle revient en PREVIEW SCANNABLE
 * (une ligne, un chevron, le tap mène à la Carte où l'action existe), PAS en
 * CTA : l'unique CTA chartreuse de l'écran reste la PREMIÈRE MISSION du compte
 * neuf (§A.4 — et GO est déjà chartreuse en permanence dans la nav). Ses états
 * honnêtes sont ceux de `useRealMission`, dépliés par une fonction PURE testée
 * (features/social/nextMissionRow.ts) : aucune mission n'est fabriquée, et un
 * échec n'est annoncé qu'après une lecture réellement partie.
 *
 * ─── CE QUI N'A PAS ÉTÉ CONSTRUIT (déclaré, pas maquillé) ───────────────────
 *  · VARIANTE « PROFIL PUBLIC » : inconstructible aujourd'hui. Aucune route de
 *    profil d'autrui, aucune lecture du profil d'un tiers (profileStore est un
 *    AsyncStorage LOCAL), aucun moteur de « confrontations », aucune vue serveur
 *    de badges publics ; DÉFIER n'existe qu'au post-run et Suivre n'existe pas.
 *    La bâtir reviendrait à peindre un écran entier de faux + 4 boutons morts.
 *  · COMMUTATEUR RUN/BIKE : toujours pas ici, mais PLUS POUR LA RAISON ÉCRITE
 *    JUSQU'AU 26/07/2026. Ce paragraphe disait « contrôle mort absolu : le
 *    moteur de validation GPS REJETTE le pédalage, l'onglet Bike n'aurait
 *    jamais aucune donnée ». C'était vrai la veille ; le vélo est depuis une
 *    discipline RÉELLE (bornes par discipline, `runs.activity` et `hex_claims
 *    (h3index, activity)` en production). Le garder aurait été le mensonge
 *    symétrique — une doc qui NIE ce que le code tient.
 *    La planche E14 pose le commutateur sur QUATRE surfaces : Carte,
 *    Classement, Historique, Statistiques. Le Profil n'en est pas une : c'est
 *    une carte de visite, pas un monde qu'on arbitre. Il ne choisit pas pour
 *    autant en silence — il montre le monde que le joueur POSSÈDE et le NOMME,
 *    et les DEUX quand il en possède deux (jamais additionnés, E14).
 *  · « +18 % » / « 24,6 km cette semaine » : aucune source de tendance ni
 *    d'agrégat hebdomadaire n'existe sur cet écran. Non peints.
 *
 * ─── ZÉRO MENSONGE (inchangé, renforcé) ─────────────────────────────────────
 * Quatre états distincts, jamais confondus : pas de compte / connecté mais vide /
 * échec de lecture / lecture EN COURS. Un chargement n'affirme rien : le nom,
 * la pastille de niveau et la pastille de visibilité ne s'affichent QU'UNE FOIS
 * LUS (leurs stores ont des défauts — « Coureur », « Public » — qui mentiraient
 * pendant la fenêtre d'hydratation).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatKm2 } from '../../src/features/widget/territoryWidget';
import {
  BADGE_TIER_RANK,
  PLAYER_LEVEL_MAX,
  SKILLS,
  SKILL_ROMAN,
  badgeKeyByName,
  borderState,
  colors,
  fonts,
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
import {
  GRIP_RANK_LABELS,
  gripRankForLevel,
  playerLevelForXp,
  playerLevelXpTable,
  playerTierForLevel,
} from '../../src/features/crew/rules';
import {
  useMyWorlds,
  useRealTerritoriesByActivity,
} from '../../src/features/map/hexClaims';
import {
  illustratedWorlds,
  isNewPlayerAcrossActivities,
  profileTerritoryView,
} from '../../src/features/territory/profileTerritory';
import { useRealMission } from '../../src/features/mission/useRealMission';
import { nextMissionRow } from '../../src/features/social/nextMissionRow';
import { useRealCrew } from '../../src/features/crew/real';
import { GripMascot } from '../../src/features/social/GripMascot';
import { ProfileHero } from '../../src/features/social/ProfileHero';
import { SignatureMapCard } from '../../src/features/social/SignatureMapCard';
import { useMyLastActivity } from '../../src/features/social/lastActivity';
import { effectiveInitials, useMyProfile } from '../../src/features/social/profileStore';
import { useMyEconomy } from '../../src/features/social/economy';
import { useSeasonLeaderboard } from '../../src/features/social/leagueBoard';
import { seasonRankProgress } from '../../src/features/social/league';
import { usePrivacyPrefs } from '../../src/features/privacy/store';
import { useArsenalInventory, itemByKey, isTitleItem } from '../../src/features/arsenal';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { flags } from '../../src/lib/flags';
import type { Entry } from '../../src/i18n/types';
import { useLocale, useT } from '../../src/i18n/store';
import {
  C,
  METRICS_SCOPE,
  PREVIEW_ACTIVITY_PLAIN,
  SCOPE_LABEL,
  SECTION_SIGNATURE_MAP,
  SECTION_TERRITORY,
} from '../../src/i18n/catalog/profil';
import { C as M } from '../../src/i18n/catalog/mission';
import { screen } from '../../src/lib/analytics';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { decimalSeparator, formatInt } from '../../src/ui/format';
import { ShareCard } from '../../src/ui/game';

/** Bornes XP par niveau (courbe §43.1) — table pure. Niveau/tier/jauge DÉRIVÉS
 *  de l'XP RÉELLE dans le composant (O1 : useMyEconomy), jamais au module. */
const XP_TABLE = playerLevelXpTable();

/** Un jour en ms — unité de calendrier, pas une constante de JEU (game-rules). */
const MS_PER_DAY = 86_400_000;

/** Distance en km depuis des MÈTRES (la stat serveur est en m). */
function formatKm(meters: number): string {
  return (meters / 1000).toFixed(1).replace('.', decimalSeparator());
}

/**
 * Écart en JOURS CALENDAIRES (pas en 24 h glissantes) : une course de 23 h hier
 * soir doit se lire « Hier », pas « Aujourd'hui ». PURE.
 */
function calendarDaysAgo(startedAtMs: number, nowMs: number): number {
  const startOfDay = (ms: number): number => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.max(0, Math.round((startOfDay(nowMs) - startOfDay(startedAtMs)) / MS_PER_DAY));
}

type BadgeDefT = NonNullable<ReturnType<typeof badgeById>>;

/**
 * Badges affichables = débloqués, non-legacy, triés du plus rare au moins rare
 * (BADGE_TIER_RANK). DÉRIVÉ des débloqués RÉELS (O1 : useMyBadges).
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
 * des badges réellement débloqués → jamais un slot vide/verrouillé.
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
 * État dérivé d'UNE famille de skill (miroir du contrat `DerivedSkill` de
 * packages/engine/src/skills.ts). La dérivation est PURE et ré-implémentée ICI
 * car Metro ne résout pas les imports Deno `.ts` de `@klaim/engine` : le
 * catalogue + les seuils GELÉS viennent de `@klaim/shared` (`SKILLS`), aucun
 * nombre magique local. Les STATS réutilisent la MÊME source que les badges
 * (`useMyBadges().stat` — user_stats réel) — pas de barème parallèle.
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
  const unit = def.levels[0].requirement.replace(/^[\d\s .,]+/, '').trim();
  return { def, value, level: rank, maxed, nextThreshold, progress, remaining, unit };
}

interface ProfileLink {
  label: Entry;
  icon: IconName;
  href: string;
}

/**
 * RACCOURCIS — destinations de JEU uniquement, une LIGNE chacune. Les entrées
 * qui faisaient doublon avec le bouton Paramètres (Arsenal, Sources, Support,
 * Paramètres) vivent dans /parametres, toujours à 2 taps.
 * « Confidentialité & géoloc » RESTE ici : accès DIRECT à 1 tap (audit confiance).
 *
 * « Mon code QR » (planche E16) est une LIGNE discrète, pas un second CTA : le
 * QR de profil sert à se faire suivre/défier, il n'est pas l'action de l'écran.
 */
const LINKS: readonly ProfileLink[] = [
  // D8 : hors MVP fermé, Saison/Missions disparaissent de la SURFACE (flags.ts)
  // — les moteurs continuent d'accumuler, rien n'est perdu au flip.
  ...(flags.season
    ? [{ label: C.linkSeason, icon: 'classement', href: '/classement' } as const]
    : []),
  ...(flags.warRoom ? [{ label: C.linkMissions, icon: 'guerre', href: '/warroom' } as const] : []),
  { label: C.linkFriends, icon: 'ami', href: '/amis' },
  { label: C.linkMyQr, icon: 'qr', href: '/qr' },
  { label: C.linkPerformance, icon: 'performance', href: '/performance' },
  { label: C.linkHistory, icon: 'historique', href: '/historique' },
  { label: C.linkPrivacy, icon: 'verrou', href: '/confidentialite' },
];

/**
 * PREVIEW — une ligne scannable : visuel à gauche, libellé, chevron. Posée sur
 * l'espace (pas une card par ligne : card-dans-card interdit). Le libellé n'est
 * jamais tronqué (§A : pas de « … » sur un texte d'action).
 */
function PreviewRow({
  icon,
  visual,
  label,
  a11yLabel,
  onPress,
}: {
  icon?: IconName;
  visual?: ReactNode;
  label: string;
  a11yLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.previewRow, pressed && styles.dim]}
    >
      {visual ?? (icon ? <Icon name={icon} size={iconSizes.md} color={colors.blanc} /> : null)}
      <Text style={styles.previewLabel}>{label}</Text>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

export default function ProfilScreen() {
  const t = useT();
  const locale = useLocale();
  const { session, configured, loading: sessionLoading } = useSession();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [shareOpen, setShareOpen] = useState(false);
  /** Spécialisations : 8 familles = 8 lignes hautes. Repliées PAR DÉFAUT
   *  (retour terrain 20/07 « trop de scroll ») — détails au tap (§A). */
  const [skillsOpen, setSkillsOpen] = useState(false);

  /** Profil ÉDITABLE persisté — l'édition depuis /profil-edit se reflète ici. */
  const { profile, loading: profileLoading } = useMyProfile();
  /**
   * VISIBILITÉ — source UNIQUE : le réglage vit dans Confidentialité. On le
   * REFLÈTE (lecture seule) et on y renvoie ; jamais un second interrupteur.
   * `loading` est OBLIGATOIRE : le défaut du store est 'public' et la lecture
   * est asynchrone — afficher avant lecture annoncerait « Public » à un joueur
   * réglé sur « Moi seul » pendant la fenêtre d'hydratation.
   */
  const { prefs: privacyPrefs, loading: privacyLoading } = usePrivacyPrefs();
  const visibilityLabel = t(
    { public: C.visPublic, crew: C.visCrew, friends: C.visFriends, private: C.visPrivate }[
      privacyPrefs.profileVisibility
    ],
  );

  // O1 : chiffres RÉELS (users.xp/série + season_scores). Niveau/tier/GRIP/jauge
  // DÉRIVÉS de l'XP effective via la courbe partagée — jamais un nombre magique.
  const economy = useMyEconomy();
  const xp = economy.xp;
  const runnerLevel = playerLevelForXp(xp);
  const runnerTier = playerTierForLevel(runnerLevel);
  const gripRank = gripRankForLevel(runnerLevel);
  const levelFloor = XP_TABLE[runnerLevel - 1] ?? 0;
  const levelCeil =
    runnerLevel < PLAYER_LEVEL_MAX ? (XP_TABLE[runnerLevel] ?? levelFloor) : levelFloor;
  const levelRatio = levelCeil > levelFloor ? (xp - levelFloor) / (levelCeil - levelFloor) : 1;

  // ── DONNÉES RÉELLES §12.2/§15.3 : crew · place locale ───────────────────────
  const realCrew = useRealCrew();
  const season = useSeasonLeaderboard();
  const rankProgress =
    season.status === 'ready' ? seasonRankProgress(season.joueursBoard.rows) : null;

  // ── LES QUATRE ÉTATS DE CET ÉCRAN ──────────────────────────────────────────
  /** Compte relié → on lit et on affiche du réel (y compris « rien encore »). */
  const signedIn = configured && !!session;
  /**
   * La session n'a pas fini de s'hydrater (lecture AsyncStorage/localStorage au
   * démarrage à froid) : `session` vaut null SANS que ça veuille dire « pas de
   * compte ». Un CHARGEMENT n'est pas un VIDE.
   */
  const sessionPending = configured && sessionLoading && !session;
  /** Pas de compte : aucune donnée de jeu ne peut être vraie. */
  const signedOut = !signedIn && !sessionPending;
  /**
   * Y a-t-il seulement un écran de connexion qui MARCHE ? Sans backend,
   * `/sign-in` redirige immédiatement vers la carte : proposer « Se connecter »
   * y enverrait le joueur dans un cul-de-sac (bouton mort).
   */
  const canSignIn = configured && !session && !sessionLoading;
  const seasonRank = economy.seasonRank ?? profile.seasonRank;
  const hasSeasonRank = seasonRank != null;
  /**
   * Cosmétiques ÉQUIPÉS — frame autour de l'avatar + titre affiché, MAIS
   * seulement s'ils sont réellement POSSÉDÉS (23/07/2026) : un anneau « Founder »
   * ou un titre jamais gagné est un statut affiché à tort.
   */
  const { equipped, ownedKeys, source: inventorySource } = useArsenalInventory();
  const equippedProfileKey =
    inventorySource === 'server' && equipped.profile !== undefined && ownedKeys.has(equipped.profile)
      ? equipped.profile
      : undefined;

  /** Titre affiché : un TITRE cosmétique équipé prime sur le titre éditorial. */
  const equippedTitleItem = equippedProfileKey ? itemByKey(equippedProfileKey) : undefined;
  const displayedTitle =
    equippedTitleItem && isTitleItem(equippedTitleItem)
      ? equippedTitleItem.name.replace(/^Titre\s*«\s*/, '').replace(/\s*»$/, '')
      : profile.title;

  /** Initiales + couleur d'avatar issues du profil éditable. */
  const initials = effectiveInitials(profile);

  // Débloqués + progression RÉELS (user_badges/user_stats) dès qu'une session
  // existe ; collection VIDE sinon.
  const { unlockedIds, stat, failed: badgesFailed, reload: reloadBadges } = useMyBadges();
  /**
   * ─── LA LECTURE D'AFFICHAGE DE `hex_claims`, FAITE UNE SEULE FOIS ──────────
   * Le profil en déclenchait DEUX au montage pour AFFICHER (drapeaux + widget).
   * On lit UNE fois ici, et la CARTE SIGNATURE reçoit les territoires DÉJÀ LUS
   * en prop plutôt que de monter un composant qui relirait la table (c'est la
   * raison pour laquelle `SignatureMapCard` dessine la silhouette au lieu de
   * monter `TerritoryFranceMap preview`, cf. son bloc de tête).
   *
   * EXCEPTION ASSUMÉE (25/07/2026) : `useRealMission` porte SA propre lecture de
   * `hex_claims` (colonnes h3index + decay_at seulement, et un fix GPS), parce
   * que c'est la MÊME requête que la Carte — la partager depuis ici forcerait
   * l'un des deux écrans à dépendre de l'autre. Deux lectures étroites plutôt
   * qu'un couplage : on paie une requête, pas une divergence de vérité.
   */
  /**
   * ─── LES DEUX MONDES, ET POURQUOI LE PROFIL LES LIT TOUS LES DEUX ─────────
   * Cette lecture appelait `useRealTerritories()` SANS discipline, donc dans le
   * monde par défaut. Depuis que le vélo enregistre (26/07/2026), c'était un
   * mensonge net : un joueur qui ne roule qu'à vélo tombait dans `isNewPlayer`,
   * ses quatre métriques disparaissaient et l'écran lui servait « PREMIÈRE
   * MISSION » — l'app lui disait qu'il n'avait jamais rien pris alors qu'il
   * tient du territoire.
   *
   * Le Profil n'a PAS de commutateur E14 (la planche le pose sur la Carte, le
   * Classement, l'Historique et les Statistiques ; le Profil est une carte de
   * visite, pas un monde). Il n'a donc que deux réponses honnêtes : montrer les
   * deux mondes côte à côte, ou DIRE lequel il montre. IL FAIT LES DEUX, selon
   * ce que le joueur possède réellement — décision PURE et testée
   * (`features/territory/profileTerritory.ts`) :
   *   · un seul monde peuplé → ce monde, NOMMÉ (« Territoire à vélo ») ;
   *   · les deux             → les deux, côte à côte, JAMAIS additionnés ;
   *   · aucun                → PREMIÈRE MISSION, qui a alors raison.
   *
   * Une SEULE requête (pas de `.eq('activity')`, la colonne est demandée et la
   * séparation se fait en pur) : le coût réseau ne bouge pas.
   */
  const {
    worlds,
    failed: territoryFailed,
    loading: territoryLoading,
    reload: reloadTerritory,
  } = useRealTerritoriesByActivity();
  /** MES zones et mes mesures, PAR MONDE. `null` = pas encore lu — jamais « zéro ». */
  const myWorlds = useMyWorlds(worlds);

  /** Une lecture a échoué → on l'annonce et on propose de réessayer (jamais un 0 nu). */
  const loadFailed = economy.failed || badgesFailed || territoryFailed;
  /**
   * Connecté, mais le serveur n'a pas encore tout répondu. Rendre les modules
   * maintenant afficherait « Niveau 1 · 0,00 km² » avant de sauter aux vrais
   * chiffres — un mensonge d'une demi-seconde, que l'œil enregistre quand même.
   * La rangée de métriques exige les DEUX lectures (économie ET territoire) :
   * une moitié de vérité alignée à côté d'un trou n'est pas plus honnête.
   */
  const loadingReal =
    sessionPending || (signedIn && !loadFailed && (economy.source !== 'server' || territoryLoading));
  const retryAll = () => {
    economy.reload();
    reloadBadges();
    reloadTerritory();
  };
  /** Modules de jeu : rendus UNIQUEMENT sur un compte lu avec succès. */
  const gameReady = !signedOut && !loadFailed && !loadingReal;
  /**
   * CE QUE LE BLOC TERRITORIAL RACONTE — décision PURE, testée sous Deno.
   * `null` tant que la lecture n'a pas abouti : on ne conclut rien.
   */
  const territoryView = useMemo(
    () =>
      myWorlds === null
        ? null
        : profileTerritoryView({
            run: { areaM2: myWorlds.run.areaM2, zones: myWorlds.run.zones },
            bike: { areaM2: myWorlds.bike.areaM2, zones: myWorlds.bike.zones },
          }),
    [myWorlds],
  );
  /**
   * Compte NEUF : lu, et il ne tient réellement aucune zone — DANS AUCUNE DES
   * DEUX DISCIPLINES. La planche remplace alors les métriques par la PREMIÈRE
   * MISSION — quatre zéros alignés se liraient « tu as échoué », alors qu'il
   * n'a simplement pas encore couru.
   *
   * La question se posait auparavant sur le seul monde de la course à pied :
   * un cycliste recevait donc l'écran de bienvenue à chaque ouverture de son
   * Profil, indéfiniment. C'est le défaut central corrigé le 26/07/2026.
   */
  const isNewPlayer =
    gameReady && territoryView !== null && isNewPlayerAcrossActivities(territoryView);

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

  /** Dernière course RÉELLE (1 ligne de `runs`) — la preview « activité récente ». */
  const lastActivity = useMyLastActivity();

  // ── PROCHAINE MISSION (remise le 25/07/2026, décision fondateur) ────────────
  /**
   * La planche E15 n'a pas de ligne mission, et le recalage l'avait donc retirée
   * — mais c'était le SEUL rappel de mission hors de la Carte. Elle revient en
   * PREVIEW (même famille que « Badges · N › »), jamais en CTA : le Profil n'en
   * porte qu'un, la PREMIÈRE MISSION du compte neuf (§A.4), et GO est déjà
   * chartreuse en permanence dans la barre de nav.
   */
  const { mission: realMission, loading: missionLoading } = useRealMission();
  /**
   * Témoin « une lecture est réellement partie ». `useRealMission` démarre à
   * `{ mission: null, loading: false }` et ne passe à `loading` qu'à son premier
   * effet : sans ce témoin, le tout premier rendu annoncerait « lecture
   * impossible » alors que RIEN n'a encore été tenté — un échec inventé est un
   * mensonge au même titre qu'une donnée inventée.
   */
  const [missionReadStarted, setMissionReadStarted] = useState(false);
  useEffect(() => {
    if (missionLoading) setMissionReadStarted(true);
  }, [missionLoading]);
  /** Décision d'affichage PURE et testée (features/social/nextMissionRow.ts). */
  const missionRow = nextMissionRow({
    gameReady,
    firstMissionShown: isNewPlayer,
    loading: missionLoading,
    readStarted: missionReadStarted,
    mission: realMission,
  });
  /**
   * Libellé : EXACTEMENT les textes du catalogue `mission`, ceux de la Carte —
   * une même mission ne peut donc pas se lire différemment selon l'écran. La
   * distance n'apparaît QUE s'il y a un fix GPS (variantes « Far ») ; sans fix,
   * la phrase courte, jamais une distance approchée.
   */
  let missionLabel: string | null = null;
  if (missionRow.kind === 'loading') {
    missionLabel = t(C.previewMissionLoading);
  } else if (missionRow.kind === 'unavailable') {
    missionLabel = t(C.previewMissionUnavailable);
  } else if (missionRow.kind === 'defend') {
    const km = missionRow.distanceM === null ? null : `${formatKm(missionRow.distanceM)} km`;
    missionLabel =
      km === null
        ? t(M.missionDefend, { h: missionRow.hoursLeft })
        : t(M.missionDefendFar, { km, h: missionRow.hoursLeft });
  } else if (missionRow.kind === 'expand') {
    const km = missionRow.distanceM === null ? null : `${formatKm(missionRow.distanceM)} km`;
    missionLabel = km === null ? t(M.missionExpand) : t(M.missionExpandFar, { km });
  }

  // ── LIGNE D'IDENTITÉ « CREW · ville · #rang » ──────────────────────────────
  /**
   * Chaque segment n'est rendu QUE s'il est vrai — jamais un « · » orphelin ni
   * un « #— ». Et surtout : on ne MÉLANGE PAS les deux sources de ville.
   *  · `season.cityName` vient du SERVEUR (users.city_id, déduit d'un fait GPS) —
   *    c'est la ville qui décide du classement : elle accompagne le rang ;
   *  · `profile.city` est une préférence d'affichage LOCALE, éditée à la main,
   *    qui ne décide d'aucun classement : elle ne sert QUE d'identité, seule.
   * Les écrire dans la même phrase laisserait croire qu'une ville tapée au
   * clavier détermine un rang.
   */
  const crewName = realCrew.crew && !realCrew.loadFailed ? realCrew.crew.name : null;
  /** On ne propose « Trouver un crew » qu'une fois SÛR qu'il n'y en a pas. */
  const noCrewConfirmed =
    realCrew.ready && !realCrew.loading && !realCrew.loadFailed && realCrew.crew === null;
  const identitySegments = useMemo(() => {
    const segments: string[] = [];
    if (crewName) segments.push(crewName);
    if (rankProgress && season.cityName) {
      segments.push(season.cityName);
      segments.push(`#${formatInt(rankProgress.rank)}`);
    } else if (profile.city.trim().length > 0) {
      segments.push(profile.city.trim());
    }
    return segments;
  }, [crewName, rankProgress, season.cityName, profile.city]);

  useEffect(() => {
    screen('profil');
  }, []);

  const openEdit = () => router.push('/profil-edit');

  // ── Libellé de l'activité récente ──────────────────────────────────────────
  /**
   * « Hier · +3 zones à vélo ». Le NOM de zone de la planche (« Saint-Rémy »)
   * n'a aucune source (displayName est NULL en base) et « +0,42 km² » non plus
   * (le serveur renvoie des COMPTES d'hexagones, pas une aire). Impact inconnu →
   * « dernière course », jamais « +0 zone ».
   *
   * ─── LA DISCIPLINE EST DITE (E14, 26/07/2026) ─────────────────────────────
   * La lecture est TOUTES DISCIPLINES et c'est juste — c'est un datage, pas une
   * somme. Mais la ligne ne disait pas de quel monde elle parlait, juste
   * au-dessus d'un bloc de métriques titré, lui, « Territoire à vélo » : un
   * cycliste lisait « dernière course ». On la nomme donc, à partir de
   * `runs.activity` réellement lue.
   *
   * Quand la discipline est INCONNUE (`activity === null` : colonne illisible),
   * on retombe sur les libellés neutres. On ne nomme jamais un monde qu'on
   * ignore — inventer « à pied » ici serait la faute qu'on vient de corriger.
   */
  const activityLabel = useMemo(() => {
    const a = lastActivity.activity;
    if (!a) return null;
    const days = calendarDaysAgo(a.startedAtMs, Date.now());
    const when =
      days === 0 ? t(C.timeAgoToday) : days === 1 ? t(C.timeAgoYesterday) : t(C.timeAgoDays, { n: days });
    const sport = a.activity === null ? null : t(SCOPE_LABEL[a.activity]);
    if (a.captured !== null && a.captured > 0) {
      const n = formatInt(a.captured);
      return sport === null
        ? t(C.previewActivityCaptured, { when, n })
        : t(C.previewActivityCapturedIn, { when, n, sport });
    }
    if (a.defended !== null && a.defended > 0) {
      const n = formatInt(a.defended);
      return sport === null
        ? t(C.previewActivityDefended, { when, n })
        : t(C.previewActivityDefendedIn, { when, n, sport });
    }
    return a.activity === null
      ? t(C.previewActivityPlain, { when })
      : t(PREVIEW_ACTIVITY_PLAIN[a.activity], { when });
  }, [lastActivity.activity, t]);

  return (
    <>
      {/* Accès Paramètres — icône réglages en haut à droite de l'ÉCRAN, hors du
          flux. La pilule « Modifier » de la planche vit DANS le héros (~90 pt
          plus bas) : les deux ne se recouvrent jamais. */}
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

      <TabScreen title={t(C.tabMe)} kicker={t(C.kickerPlayerCard)}>
        {/* ══ 1+2 · HÉROS 210 pt + IDENTITÉ ═══════════════════════════════════
            Pleine largeur : TabScreen impose `paddingHorizontal` à TOUS les
            onglets et n'est PAS modifié ici (il est hors périmètre, et il sert
            les autres écrans) — on compense localement par une marge négative. */}
        <View style={styles.heroBleed}>
          <ProfileHero
            /* Photo si le joueur en a choisi une ; sinon l'avatar généré, qui
               reste un choix pleinement valable (anonymat assumé). */
            photoUri={profile.avatarUri || undefined}
            initials={initials}
            avatarColor={profile.avatarColor}
            tier={runnerTier}
            equippedFrameKey={equippedProfileKey}
            /* Identité : RIEN tant qu'elle n'est pas lue — le défaut du store
               est « Coureur », et un joueur nommé Léa ne doit pas le lire. */
            identity={
              profileLoading ? null : { displayName: profile.displayName, handle: profile.handle }
            }
            /* Pastille NIV. : dérivée de l'XP SERVEUR — absente hors compte lu. */
            levelBadge={gameReady ? t(C.levelBadgeShort, { n: formatInt(runnerLevel) }) : null}
            equippedTitle={displayedTitle.length > 0 ? displayedTitle : undefined}
            contextSegments={identitySegments}
            /* ─── 27/07/2026 : CE COMMENTAIRE MENTAIT, ET LE CODE AVEC ──────
               Il affirmait que `/crew-discovery` « n'est plus qu'une REDIRECTION
               vers /crew » et qu'« aucun annuaire de crews n'existe : ni
               recherche, ni recrutement, ni modération serveur ». Les trois
               affirmations sont FAUSSES depuis la migration 0083 :
               `app/crew-discovery.tsx` est un écran complet (recherche, filtres,
               états distincts) servi par six RPC SECURITY DEFINER dont la
               recherche et le recrutement.
               Conséquence concrète du lien : le joueur SANS crew — exactement la
               cible d'E39 — était envoyé au HQ Crew au lieu de la Découverte.
               Une doc (ou un écran) qui NIE ce que le code tient est la même
               faute qu'une doc qui promet au-delà de lui : `warroom.tsx` le dit
               lui-même en toutes lettres. */
            findCrew={
              noCrewConfirmed
                ? { label: t(C.linkFindCrew), onPress: () => router.push('/crew-discovery') }
                : undefined
            }
            /* Visibilité : absente tant que le store privacy n'a pas répondu. */
            visibility={
              privacyLoading
                ? null
                : {
                    label: visibilityLabel,
                    a11y: t(C.a11yVisibility, { value: visibilityLabel }),
                    onPress: () => router.push('/confidentialite'),
                  }
            }
            edit={{
              label: t(C.actionEditProfile),
              a11y: t(C.editMyProfile),
              onPress: openEdit,
            }}
          />
        </View>

        {/* ═══ ÉTAT VIDE N°1 · PAS DE COMPTE ════════════════════════════════════
            Un profil déconnecté n'a ni territoire, ni progression, ni badges —
            et aucune de ces trois choses ne peut être devinée. UN bloc dit ce
            qui manque et porte l'unique CTA de l'écran (§A : 1 décision).
            Le héros reste au-dessus : le nom, le @ et l'avatar sont réels et
            modifiables même sans compte (ils vivent sur ce téléphone). */}
        {signedOut ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {canSignIn ? t(C.signedOutTitle) : t(C.noBackendTitle)}
            </Text>
            <Text style={styles.stateBody}>
              {canSignIn ? t(C.signedOutBody) : t(C.noBackendBody)}
            </Text>
            {/* Pas de CTA quand se connecter est impossible : un bouton qui ne
                mène nulle part vaut moins qu'une phrase qui dit pourquoi. */}
            {canSignIn ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.signIn)}
                onPress={() => router.push('/sign-in')}
                style={({ pressed }) => [styles.stateCta, pressed && styles.dim]}
              >
                <Text style={styles.stateCtaLabel} numberOfLines={1}>
                  {t(C.signIn)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ═══ ÉTAT VIDE N°2 · LECTURE EN ÉCHEC ═════════════════════════════════
            Le pire scénario du zéro-mensonge : un joueur RÉEL, hors réseau. Ses
            zones, son XP et ses badges existent — on ne sait juste pas les lire.
            « 0 zone · 0 badge » lui dirait qu'il n'a rien fait. */}
        {loadFailed ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{t(C.loadFailedTitle)}</Text>
            <Text style={styles.stateBody}>{t(C.loadFailedBody)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.retry)}
              onPress={retryAll}
              style={({ pressed }) => [styles.stateCta, pressed && styles.dim]}
            >
              <Text style={styles.stateCtaLabel} numberOfLines={1}>
                {t(C.retry)}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ═══ ÉTAT TRANSITOIRE · ON CHARGE ═════════════════════════════════════
            Une ligne, pas un spinner plein écran : le joueur voit déjà son
            identité, il lui manque ses chiffres. Cet état est BORNÉ (la lecture
            aboutit ou lève `failed`) — jamais un chargement sans fin. */}
        {loadingReal ? <Text style={styles.stateInline}>{t(C.loadingNumbers)}</Text> : null}

        {/* ══ 3 · LES MÉTRIQUES, ET LE MONDE DONT ELLES PARLENT ════════════════
            Une seule mise en avant : la surface contrôlée (la matière du jeu).
            Les valeurs sont MESURÉES : aires et hexagones viennent de
            `hex_claims`, défenses et km de saison de `user_stats` (déjà lus par
            useMyBadges — aucune requête de plus). Un « 0 » y est un FAIT pour un
            compte qui a couru sans rien prendre ; pour un compte qui n'a jamais
            couru, c'est la PREMIÈRE MISSION qui prend la place (bloc suivant).

            ─── CE QUI CHANGE LE 26/07/2026, ET POURQUOI ─────────────────────
            Le bloc lisait le monde par DÉFAUT sans le dire. Il DIT désormais de
            quelle discipline il parle, et il n'en choisit aucune : c'est le
            territoire réel du joueur qui décide (`profileTerritoryView`).

            MONO-DISCIPLINE — la composition de la planche E15 est INTACTE :
            quatre métriques, un seul bloc à séparateurs, une seule mise en
            avant. S'y ajoute UNE ligne de portée, et elle n'est pas décorative :
            défenses et km viennent de `user_stats`, qui n'est PAS disciplinée
            (0070 « ce qui reste en suspens » §2). Les laisser sous un titre
            « à vélo » serait la somme que la planche E14 interdit.

            HYBRIDE — écart ASSUMÉ à E15 : deux blocs de deux métriques au lieu
            d'un de quatre. E14 est catégorique (« deux métriques côte à côte,
            JAMAIS sommées ») et un même hexagone peut être tenu dans les deux
            mondes : un total compterait deux fois la même parcelle de ville.
            Défenses et km sortent alors du cadre territorial et vivent sur leur
            propre ligne, explicitement « toutes disciplines ». */}
        {gameReady && !isNewPlayer && territoryView !== null && territoryView.kind === 'single' ? (
          <>
            <View style={styles.metrics}>
              <View style={[styles.metricCell, styles.metricLead]}>
                <Text
                  style={styles.metricLeadValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatKm2(territoryView.world.areaM2, locale)}
                </Text>
                {/* §A.9 — on rétrécit/enroule, on ne tranche jamais un libellé. */}
                <Text style={styles.metricLabel} numberOfLines={2}>
                  {t(C.statSurfaceControlled)}
                </Text>
              </View>
              {[
                { value: formatInt(territoryView.world.zones), label: t(C.statZonesHeld) },
                { value: formatInt(stat('defends')), label: t(C.statDefenses) },
                { value: formatKm(stat('seasonDistanceM')), label: t(C.statSeasonKm) },
              ].map((m) => (
                <View key={m.label} style={[styles.metricCell, styles.metricDivided]}>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {m.value}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
            {/* La phrase qui empêche le bloc de choisir en silence. Pleine
                largeur : elle enroule, elle ne peut donc pas être tronquée. */}
            <Text style={styles.metricsScope}>{t(METRICS_SCOPE[territoryView.world.activity])}</Text>
          </>
        ) : null}

        {/* ══ 3ter · HYBRIDE : LES DEUX MONDES, CÔTE À CÔTE, JAMAIS SOMMÉS ═════ */}
        {gameReady && !isNewPlayer && territoryView !== null && territoryView.kind === 'both' ? (
          <>
            {territoryView.worlds.map((world) => (
              <View key={world.activity}>
                <View style={styles.sectionRow}>
                  <Icon name="carte" size={iconSizes.sm} color={colors.gris} />
                  <Text style={styles.sectionRowLabel}>{t(SECTION_TERRITORY[world.activity])}</Text>
                </View>
                <View style={styles.metrics}>
                  <View style={[styles.metricCell, styles.metricLead]}>
                    <Text
                      style={styles.metricLeadValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {formatKm2(world.areaM2, locale)}
                    </Text>
                    <Text style={styles.metricLabel} numberOfLines={2}>
                      {t(C.statSurfaceControlled)}
                    </Text>
                  </View>
                  <View style={[styles.metricCell, styles.metricDivided]}>
                    <Text
                      style={styles.metricValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {formatInt(world.zones)}
                    </Text>
                    <Text style={styles.metricLabel} numberOfLines={2}>
                      {t(C.statZonesHeld)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            <Text style={styles.metricsScope}>{t(C.metricsScopeBoth)}</Text>
            {/* Les deux chiffres NON disciplinés, à part et nommés comme tels :
                les répéter sous chaque monde les ferait lire « à vélo ». */}
            <View style={styles.metrics}>
              {[
                { value: formatInt(stat('defends')), label: t(C.statDefenses) },
                { value: formatKm(stat('seasonDistanceM')), label: t(C.statSeasonKm) },
              ].map((m, i) => (
                <View
                  key={m.label}
                  style={[styles.metricCell, i > 0 ? styles.metricDivided : null]}
                >
                  <Text
                    style={styles.metricValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {m.value}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.metricsScope}>{t(C.metricsScopeAll)}</Text>
          </>
        ) : null}

        {/* ══ 3bis · NOUVEAU JOUEUR : LA PREMIÈRE MISSION ══════════════════════
            Il n'a encore aucune zone : les métriques n'ont rien à dire de vrai
            sur lui. On lui donne une marche, pas un bilan à zéro. C'est le SEUL
            état de cet écran qui porte un CTA chartreuse (§A : 1 CTA max), et il
            mène là où l'action existe vraiment — la Carte, où vit le GO. */}
        {isNewPlayer ? (
          <View style={styles.stateCard}>
            <Text style={styles.sectionKicker}>{t(C.sectionFirstMission)}</Text>
            <Text style={styles.stateTitle}>{t(C.territoryEmptyTitle)}</Text>
            <Text style={styles.stateBody}>{t(C.territoryEmptyBody)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.territoryEmptyCta)}
              onPress={() => router.push('/')}
              style={({ pressed }) => [styles.stateCta, pressed && styles.dim]}
            >
              <Text style={styles.stateCtaLabel} numberOfLines={1}>
                {t(C.territoryEmptyCta)}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ══ 4 · CARTE SIGNATURE (la preuve territoriale personnelle) ═════════
            Rendue UNIQUEMENT s'il y a quelque chose à montrer : une vignette
            vide ne serait pas une signature, ce serait un trou. Aucun label de
            zone (aucune source — cf. SignatureMapCard).

            UNE SILHOUETTE PAR MONDE, et jamais une seule pour les deux : la
            couleur y dit le RÔLE (« moi »), pas la discipline — superposer les
            deux mondes rendrait deux territoires distincts indiscernables, et
            un hexagone tenu des deux côtés serait dessiné deux fois. Chaque
            carte porte donc le nom de son monde. Pour un joueur mono-discipline,
            c'est exactement une carte, comme avant. */}
        {gameReady && territoryView !== null && myWorlds !== null
          ? illustratedWorlds(territoryView).map((world) => (
              <View key={world.activity}>
                <View style={styles.sectionRow}>
                  <Icon name="pin" size={iconSizes.sm} color={colors.gris} />
                  <Text style={styles.sectionRowLabel}>
                    {t(SECTION_SIGNATURE_MAP[world.activity])}
                  </Text>
                </View>
                <SignatureMapCard
                  mine={myWorlds[world.activity].mine}
                  linkLabel={t(C.seeMyMap)}
                  a11yLabel={t(C.a11yOpenTerritory)}
                  onPress={() => router.push('/territoire')}
                />
              </View>
            ))
          : null}

        {/* ══ 5 · PROGRESSION EN UNE LIGNE ═════════════════════════════════════
            GRIP (le personnage à son rang — la progression a un visage, pose
            DÉRIVÉE du niveau, jamais achetée : anti pay-to-win) · niveau · rang
            GRIP RÉEL · XP · jauge. Un compte neuf y lit « Niveau 1 · 0 / N XP » :
            ce n'est pas un trou, c'est son point de départ et sa marche suivante.
            « Saison › » n'apparaît que si la surface Saison est ouverte
            (flags.season) — sinon ce serait un lien vers une route masquée. */}
        {gameReady ? (
          <>
            <View style={styles.sectionRow}>
              <Icon name="niveau" size={iconSizes.sm} color={colors.gris} />
              <Text style={styles.sectionRowLabel}>{t(C.sectionProgress)}</Text>
              {flags.season ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.linkSeason)}
                  onPress={() => router.push('/classement')}
                  hitSlop={8}
                  style={({ pressed }) => [styles.sectionLink, pressed && styles.dim]}
                >
                  <Text style={styles.sectionLinkLabel}>{t(C.linkSeason)}</Text>
                  <Icon name="chevron" size={16} color={colors.gris} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.progressRow}>
              <GripMascot rank={gripRank} size={48} />
              <View style={styles.progressInfo}>
                <View style={styles.levelRow}>
                  {/* Rang GRIP RÉEL (Recrue → Légende). L'échelle « Argent II »
                      de la planche n'existe pas dans le jeu : la reproduire
                      afficherait un statut que personne n'a gagné. */}
                  <Text style={styles.levelLabel} numberOfLines={1}>
                    {t(C.levelTierLine, {
                      n: formatInt(runnerLevel),
                      rank: t(GRIP_RANK_LABELS[gripRank]),
                    })}
                  </Text>
                  <Text style={styles.levelXp} numberOfLines={1}>
                    {formatInt(xp)} / {formatInt(levelCeil)} XP
                  </Text>
                </View>
                <ProgressBar value={levelRatio} height={8} />
              </View>
            </View>
          </>
        ) : null}

        {/* ══ 6 · PREVIEWS SCANNABLES ══════════════════════════════════════════
            Des lignes, pas des murs : les collections COMPLÈTES vivent dans leurs
            pages. Chaque ligne n'existe que si son chiffre est vrai. L'ordre suit
            le temps — ce que j'ai fait, ce qui vient, ce que j'ai accumulé. */}
        {gameReady ? (
          <>
            {/* Activité récente — rendue seulement quand la dernière course est
                LUE (`ready`). En chargement ou en échec, la ligne disparaît : on
                ne dit rien plutôt que d'affirmer « aucune course ». */}
            {activityLabel ? (
              <PreviewRow
                icon="basket"
                label={activityLabel}
                a11yLabel={t(C.a11yRecentActivity)}
                onPress={() => router.push('/historique')}
              />
            ) : null}

            {/* PROCHAINE MISSION — remise ici le 25/07/2026 (décision fondateur) :
                c'était le SEUL rappel de mission hors de la Carte. Placée juste
                après l'activité récente, la colonne se lit dans le temps : ce que
                j'ai fait (hier) → ce qui vient (maintenant) → mes collections.
                Une LIGNE, un chevron, et le tap va LÀ OÙ L'ACTION EXISTE (la
                Carte, qui porte GO et le Route Planner) — jamais un 2ᵉ CTA
                chartreuse (§A.4). Couleur par RÔLE (§C) sur l'icône, qui ne porte
                jamais le sens seule : le texte dit déjà défendre vs agrandir.
                Les deux états dégradés (lecture / échec) sont des LIGNES D'ÉTAT
                grises, non tapables : il n'y a alors rien de vrai à ouvrir. */}
            {missionLabel === null ? null : missionRow.kind === 'defend' ||
              missionRow.kind === 'expand' ? (
              <PreviewRow
                visual={
                  <Icon
                    name={missionRow.kind === 'defend' ? 'bouclier' : 'cible'}
                    size={iconSizes.md}
                    color={missionRow.kind === 'defend' ? gameColors.danger : colors.chartreuse}
                  />
                }
                label={missionLabel}
                a11yLabel={t(C.a11yNextMission, { mission: missionLabel })}
                onPress={() => router.push('/')}
              />
            ) : (
              <Text style={styles.stateInline}>{missionLabel}</Text>
            )}

            {/* Badges — les 3 équipés en miniature + le compteur. Collection vide
                → une ligne qui dit comment en ouvrir un (jamais trois hexagones
                grisés, qui se liraient « tu as raté ça »). */}
            {featuredBadges.length > 0 ? (
              <PreviewRow
                visual={
                  <View style={styles.badgeMinis}>
                    {featuredBadges.map((def) => (
                      <BadgeHex
                        key={def.id}
                        family={def.family}
                        familyColor={badgeColor(def)}
                        state="unlocked"
                        tier={def.tier}
                        size="xs"
                        secret={def.secret}
                        slug={badgeKeyByName(def.name)}
                      />
                    ))}
                  </View>
                }
                label={t(C.previewBadges, { n: formatInt(unlockedCount) })}
                a11yLabel={t(C.seeCollection, { n: unlockedCount, total: BADGE_TOTAL })}
                onPress={() => router.push('/badges')}
              />
            ) : (
              <Text style={styles.stateInline}>
                {badgesFailed ? t(C.badgesFailedLine) : t(C.badgesEmptyLine)}
              </Text>
            )}

            {/* ══ HISTORIQUE — LE COMPTEUR QUI SOMMAIT LES DEUX MONDES ═══════
                Cette ligne portait « Historique des courses · {n} » avec
                n = `stat('runsValid')`. Le commentaire disait « compteur
                GRATUIT » et c'était vrai — mais gratuit ne veut pas dire juste.

                `runs_valid` vit dans `user_stats`, que la migration 0070 déclare
                NON disciplinée (§ « ce qui reste en suspens »), et que
                `applyRunToStats` incrémente pour toute sortie valide, vélo
                compris (`awardBadges` n'a aucun filtre d'activité). La
                destination, elle, est disciplinée : `useMyRunHistory` borne sa
                lecture par `.eq('activity', …)`. Le Profil annonçait 12, le tap
                en montrait 8.

                LA CAUSE RACINE (un seul pot de stats pour deux mondes) se
                corrige en base, pas ici : ce serait une migration + une reprise
                d'`ingest_run`. Ce qui se décide ICI, c'est CE QUE L'ÉCRAN
                AFFIRME — et un nombre qui mélange les mondes, sous une
                navigation qui les sépare, affirme faux.

                On ne l'étiquette pas « toutes disciplines » : la discipline
                n'est qu'un des TROIS écarts avec la liste (statut et plafond
                à 200 en sont deux autres, cf. le bloc de `catalog/profil.ts`).
                Une étiquette n'en réparerait qu'un. On retire donc le nombre :
                la ligne redevient une navigation, et le compte se lit là où la
                liste vit, sous sa propre lentille. Le libellé et l'a11y sont la
                MÊME entrée — une seule vérité à maintenir. */}
            <PreviewRow
              icon="historique"
              label={t(C.linkHistory)}
              a11yLabel={t(C.linkHistory)}
              onPress={() => router.push('/historique')}
            />

            {/* Partage — la ShareCard 4:5 se déplie inline. Elle vivait sur une
                action de la player card, qui n'existe plus : elle devient une
                ligne, jamais un second bouton plein (§A). */}
            <PreviewRow
              icon="partage"
              label={t(C.previewShare)}
              a11yLabel={t(C.a11yShareCard)}
              onPress={() => {
                setShareOpen((v) => !v);
                if (!shareOpen) toast.show(t(C.toastShareReady));
              }}
            />
            {shareOpen ? (
              <View style={styles.shareCardWrap}>
                <ShareCard
                  stat={hasSeasonRank ? `#${seasonRank}` : `${runnerLevel}`}
                  statLabel={
                    hasSeasonRank
                      ? t(C.statSeasonRank, { scope: profile.seasonScope })
                      : t(C.levelWord)
                  }
                  title={profile.displayName}
                  /* Sans titre équipé, le gabarit « {rank} · niv. {n} · {title} »
                     laisserait un « · » orphelin : on tombe alors sur les deux
                     seules infos vraies (rang GRIP + niveau). */
                  subtitle={
                    displayedTitle.length > 0
                      ? t(C.shareSubtitle, {
                          rank: t(GRIP_RANK_LABELS[gripRank]),
                          n: runnerLevel,
                          title: displayedTitle,
                        })
                      : `${t(GRIP_RANK_LABELS[gripRank])} · ${t(C.identityLevelOnly, { n: runnerLevel })}`
                  }
                >
                  {/* Carte identité character-forward : GRIP porte la signature GRYD. */}
                  <GripMascot rank={gripRank} size={72} />
                </ShareCard>
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── SPÉCIALISATIONS : gagnées par comportement (AMENDEMENT-23 §C) ──
            Absentes de la planche E15, CONSERVÉES ici : elles n'ont aucune page
            de destination, les retirer les rendrait inatteignables. Accordéon
            REPLIÉ par défaut → un tap, zéro scroll ajouté (§A : détails au tap).
            Gardé par `gameReady` comme ses voisins : « 0/8 » sans compte serait
            un bilan de comportement pour un joueur qui n'existe pas. */}
        {gameReady ? (
          <>
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
                            {/* Nom d'une spécialisation DÉBLOQUÉE en chartreuse
                                (comme son icône) — fond = espace N0, donc jamais
                                de chartreuse sur clair. Verrouillé = gris. */}
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
                          ? t(C.skillStartAt, {
                              n: formatInt(s.def.levels[0].threshold),
                              unit: s.unit,
                            })
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
          </>
        ) : null}

        {/* RACCOURCIS — listes longues déportées en pages dédiées. */}
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
            {/* §A « textes jamais coupés » : pas de numberOfLines → le libellé
                s'enroule (flex:1) au lieu d'être tronqué par « … ». */}
            <Text style={styles.linkLabel}>{t(link.label)}</Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        ))}

        {configured && session ? (
          <View style={styles.signOutWrap}>
            <Button variant="ghost" size="md" label={t(C.signOut)} onPress={() => void signOut()} />
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

  // ── Héros pleine largeur : TabScreen (hors périmètre) impose son
  //    paddingHorizontal à tous les onglets, on le compense ici. ──
  heroBleed: {
    marginHorizontal: -spacing.cardPadding,
    marginTop: spacing.md,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
    overflow: 'hidden',
  },

  // ── Rangée de 4 métriques : UN bloc N1, colonnes séparées par un filet —
  //    jamais quatre cards (card-dans-card interdit, et 4 cadres tuent la
  //    hiérarchie). La 1ʳᵉ colonne est plus large : c'est LA mise en avant. ──
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  metricCell: { flex: 1, gap: 3, paddingHorizontal: spacing.xs, justifyContent: 'center' },
  metricLead: { flex: 1.45, paddingLeft: spacing.md },
  metricDivided: { borderLeftWidth: 1, borderLeftColor: borderState.hairline },
  // Chartreuse sur surface N1 SOMBRE (carbone) — jamais sur clair (charte).
  metricLeadValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.15,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  metricValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.2,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.3,
    letterSpacing: 0.2,
  },
  /**
   * Ligne de PORTÉE sous un bloc de métriques (« Territoire à vélo. Défenses et
   * km : toutes disciplines. »). Pleine largeur et sans `numberOfLines` : elle
   * enroule, donc elle ne peut pas être tronquée dans les cinq langues (§A.9).
   * Gris secondaire : elle qualifie les chiffres, elle ne rivalise pas avec eux.
   */
  metricsScope: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    marginTop: spacing.xs,
  },

  // ── En-têtes de section ──
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    // Plancher tactile : les en-têtes REPLIABLES (Spécialisations) sont des
    // Pressable, et les marges ne sont PAS tactiles.
    minHeight: sizes.touchTarget,
  },
  sectionRowLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  sectionKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: spacing.xxs,
  },
  // Lien de section (« Saison › ») — texte, jamais un bouton plein.
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  sectionLinkLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Chevron d'accordéon : « > » au repos, « v » ouvert (l'icône `chevron` du set
  // pointe à droite — on la fait pivoter, pas de second tracé à inventer).
  chevronClosed: { marginLeft: spacing.xs },
  chevronOpen: { marginLeft: spacing.xs, transform: [{ rotate: '90deg' }] },

  // ── États vides / erreurs (§A : dire ce qui manque + UNE suite) ──
  // Surface N1 comme les autres blocs, jamais de card dans card.
  stateCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  stateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  stateCta: {
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  // Texte NOIR sur fond chartreuse (jamais de chartreuse sur clair, charte).
  stateCtaLabel: {
    color: colors.noir,
    fontSize: fontSizes.sm,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  /** Ligne d'état posée sur l'espace (pas de card) — badges vides, chargement. */
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.xs,
  },

  // ── MODULE Progression (UNE ligne) ──
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressInfo: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  levelLabel: {
    flexShrink: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
  },
  levelXp: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },

  // ── PREVIEWS : rows LÉGÈRES posées sur l'espace, filet neutre entre elles
  //    (façon liste Strava) — pas une card par ligne. ──
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    marginTop: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  previewLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Les 3 badges équipés en miniature, serrés : ils se lisent comme UNE
  // collection, pas comme trois objets distincts à comparer. (Yoga refuse un
  // `gap` négatif — le chevauchement se ferait à la marge, pas ici.)
  badgeMinis: { flexDirection: 'row', gap: 2 },
  shareCardWrap: { marginTop: spacing.md },

  // ── MODULE Skills — lignes LÉGÈRES posées sur l'espace (pas de card-dans-card ;
  //    le skill n'a pas de cadre propre, il est séparé du suivant par un filet). ──
  sectionRowCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
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
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  skillNameUnlocked: { color: colors.chartreuse, fontWeight: '700' },
  skillRoman: { color: colors.chartreuse, fontWeight: '800' },
  skillMeta: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
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

  // ── RACCOURCIS ──
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: spacing.sm,
  },
  // Liste de navigation LÉGÈRE : rows posées sur l'espace, séparées par un filet
  // neutre. UNE seule ligne de texte par row → cible de tap toujours ≥ 44 px.
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
