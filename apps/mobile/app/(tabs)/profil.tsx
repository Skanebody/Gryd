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
import { router } from 'expo-router';
import { TerritoryWidgetCard } from '../../src/features/widget/TerritoryWidgetCard';
import { buildRealWidgetView } from '../../src/features/widget/territoryWidget';
import { getLastRunResult } from '../../src/features/run/runResult';
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
import {
  GRIP_RANK_LABELS,
  gripRankForLevel,
  playerLevelForXp,
  playerLevelXpTable,
  playerTierForLevel,
} from '../../src/features/crew/rules';
import { useRealTerritories } from '../../src/features/map/hexClaims';
import { GripMascot } from '../../src/features/social/GripMascot';
import { PlayerCardAvatar } from '../../src/features/social/PlayerCardAvatar';
import { effectiveInitials, useMyProfile } from '../../src/features/social/profileStore';
import { useMyEconomy } from '../../src/features/social/economy';
import { useEquippedCosmetics, itemByKey, isTitleItem } from '../../src/features/arsenal';
import { ToastHost, useToast } from '../../src/features/social/Toast';
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
import { IconAction, ShareCard } from '../../src/ui/game';
import {
  BODY_R,
  BODY_STROKE,
  HEX_ASPECT,
  hexAvatarWidth,
} from '../../src/ui/game/hexAvatar';

/**
 * ─── VITRINE vs VRAI PRODUIT SUR CET ÉCRAN (21/07/2026) ──────────────────────
 *
 * Cet écran était gouverné par `realUser = configured && !!session` : « pas de
 * session ⇒ montre la démo ». Sur un iPhone fraîchement installé, ou dans un
 * build où Supabase n'est pas configuré, l'utilisateur atterrissait donc sur un
 * profil ENTIÈREMENT fabriqué — crew « LES FOULÉES 9³», rang #8 de saison,
 * 168 km parcourus, 20 badges, un territoire « Paris 42 · Lille 13 ». Tout est
 * faux, et rien ne le disait.
 *
 * La règle est maintenant celle du reste de l'app, et le mode vitrine est
 * ABANDONNÉ (décision fondateur 21/07/2026) : partout — app installée comme
 * localhost — on affiche du RÉEL, ou un état vide qui DIT ce qui manque et
 * propose une suite. Il n'existe plus de branche « démo » sur cet écran.
 *
 * Les trois absences restent distinctes : pas de compte (invite à se connecter),
 * compte sans donnée (invite à courir), lecture en échec (le dit + réessayer).
 */

/**
 * ── GRILLE EXPLICITE DE L'EN-TÊTE (2ᵉ passe, retour fondateur : « le bloc du
 *    haut n'est toujours pas aligné ») ─────────────────────────────────────────
 *
 * La 1ʳᵉ passe avait unifié le bord GAUCHE de la colonne texte. Ce qui restait
 * cassé, mesuré à 375 pt :
 *
 *  A. L'AVATAR FLOTTAIT VERTICALEMENT. `headerTop` était en `alignItems:'center'`
 *     et la colonne texte est PLUS HAUTE que l'avatar : 23 (nom) + 4 + 17
 *     (@handle) + 4 + 15 (titre) + 4 + 16 (niveau·ville) ≈ 83 px contre 72.
 *     L'avatar était donc redescendu de (83−72)/2 ≈ 5,5 px — et, dès que
 *     « Niveau 12 · Paris » passait sur DEUX lignes (allemand, portugais), la
 *     colonne montait à ~98 px et l'avatar redescendait à ~13 px. Autrement dit
 *     la position verticale de l'avatar dépendait de la LANGUE. Aucun repère
 *     commun ne pouvait tenir.
 *     → `flex-start` : l'avatar et la 1ʳᵉ ligne de texte partagent UNE ligne
 *       haute, invariante par langue et par nombre de lignes.
 *
 *  B. L'AVATAR PARAISSAIT RENTRÉ. Sa boîte était carrée (72×72) pour une encre
 *     hexagonale de 56,6 px de large : ~7,7 px de vide fantôme à gauche, donc un
 *     hexagone décalé vers la droite par rapport au blason crew et au bandeau de
 *     chiffres, qui s'alignent eux sur le padding de la card. Corrigé à la
 *     source dans `ui/game/hexAvatar` ; ici on réserve la largeur RÉELLE.
 *
 *  C. LE CRAYON D'ÉDITION FLOTTAIT. Posé en `right:-4 / bottom:-4` de la boîte
 *     CARRÉE, il atterrissait à ~12 px de l'arête de l'hexagone, dans le vide.
 *     → Il est maintenant posé sur le MILIEU de l'arête inférieure droite,
 *       calculé depuis la géométrie (apothème), donc toujours au contact.
 */
const AVATAR_PX = 72;
/** Largeur réelle de l'hexagone (√3/2 × hauteur) — la boîte n'est pas carrée. */
const AVATAR_W = hexAvatarWidth(AVATAR_PX);
/** Côté de la pastille crayon. */
const PENCIL_PX = 24;
/** Rayon du bord extérieur du corps hexagonal, en px. */
const AVATAR_BODY_R_PX = ((BODY_R + BODY_STROKE / 2) / 50) * (AVATAR_PX / 2);
/** Apothème = distance centre → milieu d'arête. */
const AVATAR_APOTHEM_PX = AVATAR_BODY_R_PX * HEX_ASPECT;
/** Coin haut-gauche du crayon, centré sur le milieu de l'arête inférieure droite. */
const PENCIL_LEFT = AVATAR_W / 2 + AVATAR_APOTHEM_PX * Math.cos(Math.PI / 3) - PENCIL_PX / 2;
const PENCIL_TOP = AVATAR_PX / 2 + AVATAR_APOTHEM_PX * Math.sin(Math.PI / 3) - PENCIL_PX / 2;

/** Bornes XP par niveau (courbe §43.1) — table pure. Le niveau/tier/jauge sont
 *  DÉRIVÉS de l'XP RÉELLE dans le composant (O1 : useMyEconomy), plus au module. */
const XP_TABLE = playerLevelXpTable();

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
  const { session, configured, loading: sessionLoading } = useSession();
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
  const streakWeeks = economy.streakWeeks;
  const streakMultiplier = Math.min(
    1 + streakWeeks * STREAK_MULTIPLIER_STEP,
    STREAK_MULTIPLIER_CAP,
  );

  // ── LES TROIS ÉTATS DE CET ÉCRAN ───────────────────────────────────────────
  /** Compte relié → on lit et on affiche du réel (y compris « rien encore »). */
  const signedIn = configured && !!session;
  /**
   * La session n'a pas fini de s'hydrater (lecture AsyncStorage/localStorage au
   * démarrage à froid) : `session` vaut null SANS que ça veuille dire « pas de
   * compte ». Traiter cette fenêtre comme un état vide ferait clignoter
   * « Connecte-toi » sur l'écran d'un joueur connecté — un mensonge court, mais
   * l'œil l'enregistre. Un CHARGEMENT n'est pas un VIDE.
   */
  const sessionPending = configured && sessionLoading && !session;
  /** Pas de compte : aucune donnée de jeu ne peut être vraie. */
  const signedOut = !signedIn && !sessionPending;
  /**
   * Y a-t-il seulement un écran de connexion qui MARCHE ? Sans backend
   * (`configured === false` : aperçu web, build de dev), `/sign-in` redirige
   * immédiatement vers la carte. Proposer « Se connecter » y enverrait le joueur
   * dans un cul-de-sac — un bouton qui ment sur ce qu'il fait. On ne l'affiche
   * que quand la connexion est réellement possible.
   */
  const canSignIn = configured && !session && !sessionLoading;
  /**
   * AUCUNE source crew réelle n'alimente encore le profil (le vrai roster vit
   * dans l'onglet Crew). La ligne crew de l'en-tête a donc été RETIRÉE plutôt
   * que rendue conditionnelle : afficher un crew, c'est soit le vrai, soit rien.
   * Elle reviendra quand `useRealCrew` sera lu ici — pas avant.
   */
  const seasonRank = economy.seasonRank ?? profile.seasonRank;
  const hasSeasonRank = seasonRank != null;
  /** Cosmétiques ÉQUIPÉS persistés — frame autour de l'avatar + titre affiché. */
  const { equipped } = useEquippedCosmetics();

  /** Titre affiché : un TITRE cosmétique équipé prime sur le titre éditorial. */
  const equippedTitleItem = equipped.profile ? itemByKey(equipped.profile) : undefined;
  const displayedTitle =
    equippedTitleItem && isTitleItem(equippedTitleItem)
      ? equippedTitleItem.name.replace(/^Titre\s*«\s*/, '').replace(/\s*»$/, '')
      : profile.title;

  /** Initiales + couleur d'avatar issues du profil éditable. */
  const initials = effectiveInitials(profile);

  // Débloqués + progression RÉELS (user_badges/user_stats) dès qu'une session
  // existe ; collection VIDE sinon. La démo n'apparaît que sur la vitrine.
  const { unlockedIds, stat, failed: badgesFailed, reload: reloadBadges } = useMyBadges();
  /**
   * ─── UNE SEULE LECTURE DE `hex_claims` SUR CET ÉCRAN (21/07/2026) ──────────
   *
   * Le profil en déclenchait DEUX en parallèle au montage : `useRealTerritories()`
   * pour les drapeaux, et `useTerritoryWidgetView()` qui appelle le MÊME hook en
   * interne. Deux `select` complets de la table, sans filtre ni cache, pour
   * afficher une seule card — et une troisième arrive de la Battle Map, restée
   * montée dans l'onglet voisin. Chaque hook garde son propre état : la
   * duplication était invisible à l'écran et ne coûtait que de la batterie et du
   * réseau, exactement là où le joueur est en déplacement.
   *
   * On lit donc UNE fois, et on construit la vue du widget ici avec le même
   * moteur PUR que le hook (`buildRealWidgetView`, partagé avec la Carte) — la
   * logique reste unique, seul l'accès réseau cesse d'être dupliqué.
   *
   * (La 3ᵉ lecture, celle de la Carte, se règle par un cache partagé dans
   * `hexClaims.ts` — hors du périmètre de cet écran.)
   */
  const {
    territories,
    isReal: territoryIsReal,
    failed: territoryFailed,
    loading: territoryLoading,
    reload: reloadTerritory,
  } = useRealTerritories();
  /**
   * Le widget RÉEL, ou null (pas de données) — le fallback est choisi plus bas.
   * Il couvre DÉJÀ le cas « connecté mais zéro zone » : `buildRealWidgetView`
   * tombe sur l'état `first_capture` (« prends ta première zone » + GO).
   */
  const widgetView = useMemo(() => {
    if (!territoryIsReal || territories === null) return null;
    const lastResult = getLastRunResult();
    const ob = lastResult?.openBoundary;
    return buildRealWidgetView({
      mineAreasM2: territories
        .filter((x) => x.props.status === 'crew')
        .map((x) => x.props.areaM2),
      openBoundary: ob ? { name: ob.name, missingM: ob.missingM } : null,
      capturedInLastRun: lastResult
        ? lastResult.hexes.claimed + lastResult.hexes.stolen + lastResult.hexes.pioneer > 0
        : false,
    });
  }, [territoryIsReal, territories]);
  /** Une lecture a échoué → on l'annonce et on propose de réessayer (jamais un 0 nu). */
  const loadFailed = economy.failed || badgesFailed || territoryFailed;
  /**
   * Connecté, mais Supabase n'a pas encore répondu : l'économie vaut zéro par
   * défaut. Rendre les modules maintenant afficherait « Niveau 1 · 0 badges »
   * avant de sauter aux vrais chiffres — un mensonge d'une demi-seconde, que
   * l'œil enregistre quand même. On attend, en le disant.
   */
  const loadingReal = sessionPending || (signedIn && !loadFailed && economy.source !== 'server');
  const retryAll = () => {
    economy.reload();
    reloadBadges();
    reloadTerritory();
  };
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
   * ZÉRO MENSONGE : le bandeau ne porte que du mesuré — niveau (dérivé de l'XP
   * serveur), rang de saison s'il existe vraiment, badges effectivement
   * débloqués. Aucun compteur de zones ici : le widget territoire dit déjà la
   * vérité sur ce point, et il la lit dans `hex_claims`.
   *
   * Déconnecté (ou lecture en cours / en échec), le bandeau DISPARAÎT :
   * « Niveau 1 · 0 badges » n'est pas la vérité de ce joueur, c'est l'absence de
   * joueur. Le bloc juste dessous dit pourquoi il n'y a rien — un chiffre nu ne
   * le dirait pas.
   */
  const headerStats: readonly { value: string; label: string }[] =
    signedOut || loadFailed || loadingReal
      ? []
      : [
          { value: formatInt(runnerLevel), label: t(C.levelWord) },
          ...(hasSeasonRank
            ? [{ value: `#${formatInt(seasonRank)}`, label: t(C.statRankShort) }]
            : []),
          { value: formatInt(unlockedCount), label: t(C.statBadgesShort) },
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
                size={AVATAR_PX}
                isMe
                /* Photo si le joueur en a choisi une ; sinon l'avatar généré,
                   qui reste un choix pleinement valable (anonymat assumé). */
                imageUri={profile.avatarUri || undefined}
              />
              <View style={styles.editPencil}>
                <Icon name="profil" size={iconSizes.xs} color={colors.chartreuse} />
              </View>
            </Pressable>
            <View style={styles.headerInfo}>
              {/* Groupe 1 — IDENTITÉ : nom + @handle serrés (ils se lisent comme
                  UNE unité). Même bord gauche, interligne interne minimal. */}
              <View style={styles.headerIdentity}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.displayName}
                </Text>
                {/* @handle — invariant technique, jamais traduit. */}
                <Text style={styles.handle} numberOfLines={1}>
                  @{profile.handle}
                </Text>
              </View>
              {/* Groupe 2 — QUALIFICATIFS : titre équipé + niveau/ville. Séparé du
                  groupe 1 par UN espace plus grand : deux groupes lisibles valent
                  mieux que quatre lignes équidistantes qui se disputent l'œil. */}
              {/* Titre affiché (cosmétique équipé prioritaire). Chartreuse sur
                  surface N1 SOMBRE (elevation.surface = carbone) — jamais clair. */}
              {/* Aucun titre par défaut hors vitrine : la ligne disparaît plutôt
                  que d'afficher le titre d'un persona (« Tenace du 19ᵉ ») ou un
                  vide qui ouvrirait un trou dans la grille. */}
              {displayedTitle.length > 0 ? (
                <Text style={styles.title} numberOfLines={1}>
                  {displayedTitle}
                </Text>
              ) : null}
              {/* Niveau · ville : descripteur d'identité compact (le tier est lu
                  sur l'anneau d'avatar ; le niveau détaillé vit dans Progression).
                  Wrap sur 2 lignes plutôt que couper au « … » (Règle §A.9).
                  Sans ville renseignée, on écrit « Niveau 3 » tout court — pas
                  « Niveau 3 · » avec un séparateur pendu dans le vide. */}
              <Text style={styles.identity} numberOfLines={2}>
                {profile.city.length > 0
                  ? t(C.identityLine, { n: runnerLevel, city: profile.city })
                  : t(C.identityLevelOnly, { n: runnerLevel })}
              </Text>
            </View>
          </View>
          {/* Bandeau de chiffres — colonnes de largeur égale, valeurs alignées
              sur une même ligne de base, libellés courts sur une seule ligne.
              Vide (déconnecté / lecture en échec) → le bandeau ne s'affiche pas :
              un « 0 » sans explication vaudrait un mensonge de plus. */}
          {headerStats.length > 0 ? (
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
          ) : null}
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
              stat={hasSeasonRank ? `#${seasonRank}` : `${runnerLevel}`}
              statLabel={
                hasSeasonRank
                  ? t(C.statSeasonRank, { scope: profile.seasonScope })
                  : t(C.levelWord)
              }
              title={profile.displayName}
              /* Sans titre équipé, le gabarit « {rank} · niv. {n} · {title} »
                 laisserait un « · » orphelin en fin de ligne : on tombe alors sur
                 les deux seules infos vraies (rang GRIP + niveau). */
              subtitle={
                displayedTitle.length > 0
                  ? t(C.shareSubtitle, {
                      rank: GRIP_RANK_LABELS[gripRank],
                      n: runnerLevel,
                      title: displayedTitle,
                    })
                  : `${GRIP_RANK_LABELS[gripRank]} · ${t(C.identityLevelOnly, { n: runnerLevel })}`
              }
            >
              {/* Carte identité character-forward : GRIP porte la signature GRYD. */}
              <GripMascot rank={gripRank} size={72} />
            </ShareCard>
          </View>
        ) : null}

        {/* ═══ ÉTAT VIDE N°1 · PAS DE COMPTE ════════════════════════════════════
            Un profil déconnecté n'a ni territoire, ni progression, ni badges —
            et aucune de ces trois choses ne peut être devinée. Plutôt que trois
            cartes vides empilées, UN bloc dit ce qui manque et porte l'unique
            CTA chartreuse de l'écran (§A : 1 écran = 1 décision).
            La player card reste au-dessus : le nom, le @ et l'avatar sont réels
            et modifiables même sans compte (ils vivent sur ce téléphone). */}
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
            Afficher « 0 zone · 0 badge » lui dirait qu'il n'a rien fait. On
            avoue la panne, et on offre le seul geste utile : réessayer. */}
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
            Une ligne, pas un spinner plein écran : le joueur voit déjà sa player
            card, il lui manque juste ses chiffres. Cet état est BORNÉ (la lecture
            aboutit ou lève `failed`) — jamais un chargement qui tourne sans fin. */}
        {loadingReal ? <Text style={styles.stateInline}>{t(C.loadingNumbers)}</Text> : null}

        {/* ── MODULE 1 · TERRITOIRE = RÉSUMÉ STRATÉGIQUE (AMENDEMENT-18 Partie B) ──
            Ce que je contrôle · ce qui est menacé · ma PROCHAINE action. Card
            compacte ≤ 260 px, 60 % stats / 40 % mini-carte, CTA CONTEXTUEL.
            Masqué quand il n'y a ni compte ni lecture réussie : les blocs
            ci-dessus ont déjà expliqué pourquoi. */}
        {signedOut || loadFailed || loadingReal ? null : (
        <>
        <View style={styles.sectionRow}>
          <Icon name="pin" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>{t(C.sectionTerritory)}</Text>
        </View>
        {/* Widget « Mon territoire » — la SEULE source de ce bloc est `hex_claims`.
            Il couvre DÉJÀ le cas « connecté mais zéro zone » : `buildRealWidgetView`
            tombe alors sur l'état `first_capture` (« prends ta première zone » + GO),
            qui est exactement l'état vide attendu — utile, pas culpabilisant. */}
        {widgetView ? (
          <TerritoryWidgetCard view={widgetView} />
        ) : (
          // Connecté, lecture ni finie ni en échec → on patiente en le disant.
          // Un écran muet laisserait croire que le joueur n'a rien.
          <Text style={styles.stateInline}>
            {territoryLoading ? t(C.territoryLoading) : t(C.territoryEmptyTitle)}
          </Text>
        )}
        </>
        )}

        {/* ── MODULE 2 · PROGRESSION : Niveau N → N+1, jauge XP réelle ──
            Un compte neuf voit « Niveau 1 · 0 / N XP » : ce n'est pas un trou,
            c'est son point de départ réel, et la jauge lui montre la marche
            suivante. Déconnecté ou lecture en panne, en revanche, ces chiffres
            n'appartiennent à personne → module masqué. */}
        {signedOut || loadFailed || loadingReal ? null : (
        <>
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
          {/* Zéro-lie : le Score Forme et le « % du coffre crew » ne sont câblés à
              AUCUNE source réelle. Les afficher à côté de la série RÉELLE ferait
              passer de l'inventé pour du mesuré, et c'est justement ce qu'un
              joueur ne peut pas distinguer à l'œil. La rangée ne porte donc que
              du mesuré : série + badges. */}
          <View style={styles.progressStatsRow}>
            {[
              {
                value: formatMultiplier(streakMultiplier),
                label: t(C.statStreak, { n: streakWeeks }),
              },
              { value: formatInt(unlockedCount), label: t(C.statBadgesUnlocked) },
            ].map((s) => (
              <View key={s.label} style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{s.value}</Text>
                <Text style={styles.progressStatLabel} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        </>
        )}

        {/* ── MODULE 3 · BADGES : 3 équipés + « Voir collection » (pas géant) ──
            Un badge est une preuve d'effort : on n'en montre aucun qui n'ait été
            gagné. Collection vide → une ligne qui dit comment en ouvrir un
            (jamais trois hexagones grisés, qui se liraient « tu as raté ça »). */}
        {signedOut || loadFailed || loadingReal ? null : (
        <>
        <View style={styles.sectionRow}>
          <Icon name="badge" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionRowLabel}>{t(C.sectionBadges)}</Text>
        </View>
        {featuredBadges.length > 0 ? (
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
        ) : (
          <Text style={styles.stateInline}>
            {badgesFailed ? t(C.badgesFailedLine) : t(C.badgesEmptyLine)}
          </Text>
        )}
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
        </>
        )}

        {/* ── MODULE 4 · SKILLS : spécialisations gagnées par comportement ──
            (AMENDEMENT-23 §C, doc §28-§29). DISTINCT des badges : rôle /
            reco mission, pas une récompense de collection. Une LIGNE légère
            par famille posée sur l'espace (pas de card-dans-card AMENDEMENT-22) :
            icône + « <name> <roman> · <value> <unité> » + jauge de progression.
            Verrouillé (niveau 0) → « commence à <seuil I> ». Anti pay-to-win :
            AUCUN gain de territoire/points affiché (Supporter = entraide only).

            GARDE (21/07/2026) : ce module était le SEUL de l'écran à survivre
            aux trois états non-nominaux — ses quatre voisins (bandeau de
            chiffres, territoire, progression, badges) sont gardés depuis, lui
            non. Résultat : un visiteur SANS COMPTE lisait « Spécialisations
            0/6 » et, en dépliant, six jauges à zéro assorties de « commence à
            18 routes » — un bilan de comportement pour un joueur qui n'existe
            pas. Même chose pendant un chargement (les stats valent 0 tant que
            `user_stats` n'a pas répondu : « 0/6 » puis saut aux vrais niveaux)
            et après un échec de lecture (« 0/6 » se lisant « tu n'as rien
            gagné » au lieu de « je n'ai pas pu lire »). Les skills dérivent de
            `stat()` (useMyBadges), qui vaut 0 dans ces trois cas : la valeur
            n'est pas fausse, c'est l'AFFIRMATION qu'elle porte qui l'est.
            Aligné sur les voisins — les blocs d'état au-dessus disent déjà
            pourquoi il n'y a rien. */}
        {signedOut || loadFailed || loadingReal ? null : (
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
        </>
        )}

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
    gap: spacing.md,
  },
  // UNE ligne haute partagée par l'avatar et la 1ʳᵉ ligne de texte (`flex-start`).
  // `center` faisait dépendre la position verticale de l'avatar de la hauteur de
  // la colonne texte — donc de la LANGUE (cf. diagnostic A en tête de fichier).
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  // Colonne texte : UN seul bord gauche, deux GROUPES (identité / qualificatifs)
  // séparés par un espace franc — plus de marginTop au cas par cas.
  headerInfo: { flex: 1, gap: spacing.xs },
  // Nom + @handle : une unité, donc l'espace le plus serré de la colonne.
  headerIdentity: { gap: 2 },
  // Avatar pressable + pastille crayon (édition évidente sur la card). Variante
  //  SURFACE/contour chartreuse (pas un disque plein) : le SEUL chartreuse plein
  //  de la scène reste le gros CTA territoire (charte : un seul accent plein).
  //  LARGEUR RÉELLE de l'hexagone (√3/2 × hauteur) : une boîte carrée réservait
  //  ~8 px de vide de chaque côté et poussait l'avatar hors de l'axe de la card.
  avatarPress: { width: AVATAR_W, height: AVATAR_PX },
  editPencil: {
    position: 'absolute',
    // Centré sur le MILIEU de l'arête inférieure droite (calculé, pas au jugé) :
    // la pastille touche l'hexagone au lieu de flotter dans un coin vide.
    left: PENCIL_LEFT,
    top: PENCIL_TOP,
    width: PENCIL_PX,
    height: PENCIL_PX,
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
  // `lineHeight` EXPLICITE des deux étages : sans lui, la hauteur de ligne
  // dépend de la police système et les trois colonnes du bandeau ne partagent
  // aucune ligne de base commune. `tabular-nums` fige en plus la largeur des
  // chiffres, donc « 12 » et « #7 » s'empilent sur la même grille.
  statValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.2,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  // `adjustsFontSizeToFit` (§A.9 : rétrécir plutôt que couper) rend les corps
  // INÉGAUX d'une colonne à l'autre ; une hauteur de ligne fixe garantit malgré
  // tout un même bord haut et un même bord bas pour les trois libellés.
  statLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.35,
    letterSpacing: 0.2,
  },
  // Actions légères (IconAction) — rangée répartie, sans gros rectangle.
  headerActions: { flexDirection: 'row', justifyContent: 'flex-start', gap: spacing.xl },
  shareCardWrap: { marginTop: spacing.md },

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
  // ── États vides / erreurs (§A : dire ce qui manque + UNE suite) ──
  // Surface N1 comme les autres cards, jamais de card dans card. Le CTA est le
  // SEUL bouton chartreuse de l'écran dans ces états (les modules de jeu, qui
  // portent d'habitude cette CTA, sont masqués).
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
