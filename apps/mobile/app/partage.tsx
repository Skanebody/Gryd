/**
 * GRYD — PARTAGE DE LA COURSE AFFICHÉE (AMENDEMENT-22 §7, UI en scènes) :
 *
 *   ← Résultat
 *   Partager ta conquête …            [ 🔒 Protégé ]  ← badge PERMANENT, détail au tap
 *      [ preview story qui FLOTTE — la story EST le container ]
 *   Pourquoi ce style ? Tu as repris…   Personnaliser ← la raison (MÊME moteur) + E36
 *   [ Partager en story ]                           ← UN SEUL gros CTA chartreuse
 *      Instagram · TikTok · WhatsApp · Plus         ← destinations RÉELLEMENT joignables
 *      ○ Sticker   ○ Rejouer                        ← actions légères, zéro card
 *
 * ─── RECALAGE E10/E35/E36 (27/07/2026) ──────────────────────────────────────
 * Trois choses ont bougé, et aucune n'est cosmétique :
 *  1. FORMAT et STYLE ne sont plus deux segmenteds à plat : ils ont DÉMÉNAGÉ
 *     dans le sheet « Personnaliser » (features/share/CustomizeSheet.tsx), une
 *     section à la fois, avec Donnée / Texte / Confidentialité. Ils n'y sont pas
 *     dupliqués — l'écran garde UNE décision et un seul CTA (§A).
 *  2. La rangée « Sticker · Rejouer · Autre app » devient la rangée de
 *     DESTINATIONS de la planche. « Autre app » ≡ « Plus » (la feuille système),
 *     donc il disparaît d'ici. Sticker et Rejouer restent en actions légères :
 *     ce ne sont pas des réglages de carte, ce sont des actions.
 *     Ce qui est peint est décidé par `resolveShareTargets` (pur, testé) : tant
 *     qu'aucun pont natif n'existe, Instagram et TikTok ne sont PAS peints —
 *     ouvrir Instagram sans lui remettre l'image serait un bouton mort (§2).
 *  3. Le badge « Protégé » est PERMANENT, en haut à droite, et son DÉTAIL
 *     s'ouvre au tap (`ProtectedBadge` + `protectionLines`). Un badge permanent
 *     ne peut plus porter une promesse figée : ce qui est protégé dépend de
 *     l'état réel du pipeline, jusqu'à « aucun tracé n'est publié ».
 *
 * ─── LE MOTEUR CHOISIT LE RÉCIT, L'UTILISATEUR CHANGE LE STYLE (planche E10) ─
 * Le style par défaut ne vient PLUS de l'intention du joueur (ce qu'il voulait
 * faire) mais du VERDICT serveur (ce qui s'est passé) : `dominantNarrative()`
 * dans features/share/narrative.ts, moteur PUR et TESTÉ, partagé avec l'écran
 * Résultat pour que les deux racontent la même histoire du même run. « Auto » =
 * ce choix-là, réversible ; les autres modes changent la FORME, jamais le fond —
 * et la phrase « Pourquoi ce style ? » vient du même moteur, donc ne peut pas
 * diverger de la card affichée.
 *
 * Conséquence directe : tant que le serveur n'a attribué AUCUNE zone, les styles
 * qui AFFIRMENT une conquête (Conquête, Avant/Après, Carte 3D) ne sont pas
 * proposés du tout. Ils rendaient « J'AI PRIS {ZONE} · +0 · PRENDS-LA-MOI », et
 * cette image est la cible EXACTE de l'export PNG : le mensonge sortait de l'app.
 *
 * PARTAGE VRAI : la preview est alimentée par les stats de LA course affichée
 * au Résultat (share/shareRun.ts, armé avant router.push) — zones, zone, boucle,
 * distance/allure/durée, points. En social_run (aucune capture), seul le style
 * « Carte » (stats) est proposé — aucun visuel qui prétendrait un secteur pris.
 *
 * ─── AUCUNE COURSE ARMÉE = AUCUNE CARTE (décision fondateur 21/07/2026) ──────
 * Cet écran faisait `shareRun?.card ?? demoCard` : ouvert sans course (deep
 * link, ou simplement le widget territoire et la Carte, qui poussent /partage
 * SANS `setShareRun`), il fabriquait une carte de partage COMPLÈTE — distance,
 * allure, zones, tracé, rang — et l'affichait prête à exporter. Une ligne de
 * texte « Exemple » était la seule protection ; elle ne rachète rien : « le
 * bandeau n'y change rien, c'est un run fabriqué à la place du sien ». Et ce
 * mensonge SORTAIT de l'app : la card est la cible exacte de l'export PNG.
 *
 * Il n'y a donc plus de mode exemple. Sans course armée, l'écran ne rend AUCUNE
 * card et affiche l'un des trois états vides (`SHARE_COPY.empty*`) :
 *   · pas connecté      → invite à se connecter ;
 *   · connecté, rien    → invite à courir (le partage part du Résultat) ;
 *   · session en cours de restauration → « Chargement… », aucune affirmation.
 *
 * Le RANG GRIP de la mascotte suivait la même pente : il était dérivé de
 * `MY_SOCIAL_PROFILE.xp` (persona de démo), en constante de module, sans la
 * moindre garde — donc gravé dans le PNG partagé de n'importe quel joueur, y
 * compris un compte neuf. Il vient désormais de l'XP RÉELLE (`useMyEconomy`) et
 * la mascotte DISPARAÎT quand cette XP est inconnue (pas de session, ou lecture
 * serveur impossible) : un rang inconnu ne s'invente pas.
 *
 * ─── L'ÉCRAN QUI SORT DE L'APP NOMME LA DISCIPLINE (E14, 26/07/2026) ────────
 * Cet écran servait « Partager ta course », « Ta course a fait gagner ton
 * crew », « on partage la course, pas un territoire » à TOUT LE MONDE, alors
 * que le Résultat lui transmettait déjà la discipline dans l'URL (même
 * paramètre contractuel que le départ, `START_ACTIVITY_PARAM`) — il ne la
 * LISAIT simplement pas, et les jumeaux vélo du catalogue restaient du code
 * mort. C'est le pire endroit où laisser ce défaut : une carte de partage est
 * ce qui SORT de l'app. Un cycliste qui publie « course » à son crew diffuse le
 * mensonge hors de l'écran où on pourrait encore le corriger, image et message
 * texte compris.
 *
 * Tout ce qui NOMME l'effort passe donc par `resultCopy(activity)` — la même
 * porte d'entrée unique et exhaustive que le Résultat, pour que les deux
 * écrans ne puissent pas nommer différemment la même sortie.
 *
 * ─── ET L'IMAGE, PAS SEULEMENT L'ÉCRAN (26/07/2026) ─────────────────────────
 * Cette passe-là s'arrêtait au CHROME : le titre, la raison, le message texte.
 * La CARTE, elle, continuait d'imprimer « COURSE ENREGISTRÉE » et « COURU POUR
 * {crew} » sous le tracé d'un cycliste, parce que `ShareDemoData` ne portait
 * aucune discipline — les templates ne pouvaient pas savoir ce qu'ils
 * décrivaient. C'est le défaut le plus grave de la série : le PNG quitte l'app,
 * et sa victime n'est pas le joueur (qui peut encore changer d'écran) mais SON
 * CREW, qui le lit sans aucun moyen de le corriger. La discipline est désormais
 * JOINTE à la card (voir `runCard`), et les trois titres qui nomment l'effort
 * viennent de `resultCopy` comme le reste.
 *
 * Profondeur : N0 fond (colors.noir) · N1 la preview (unique surface) · N2
 * segments/actifs · N3 rare (chartreuse). Jamais de card-dans-card. Actions
 * CÂBLÉES ; en web/démo, capture & Share natives indisponibles → toasts. En
 * prod : ViewShot + Share + expo-media-library (O1).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fonts,
  elevation,
  fontSizes,
  motion,
  radii,
  sizes,
  spacing,
  type Activity,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { goBack } from '../src/lib/nav';
import { useSession } from '../src/lib/session';
import { Icon } from '../src/ui/Icon';
// `Segmented` a quitté cet écran avec les rangées Format/Style : il vit
// désormais dans les sections du sheet (features/share/CustomizeSheet.tsx).
import { IconAction, SHARE_CARD_ASPECT, ShareCard, type ShareCardRatio } from '../src/ui/game';
import { C, resultCopy, type ResultActivityCopy } from '../src/i18n/catalog/result';
// La discipline arrive par l'URL, et son PARSING appartient au domaine du
// DÉPART : on l'importe au lieu de réécrire une reconnaissance locale, qui
// finirait par diverger en silence de ce que le préflight a montré au joueur.
import {
  START_ACTIVITY_PARAM,
  parseStartActivity,
} from '../src/features/run/gps/runActivity';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { ShareMap } from '../src/features/share/ShareMap';
import { SHARE_COPY } from '../src/features/share/copy';
import { getShareRun, type ShareRunData } from '../src/features/share/shareRun';
import {
  SHARE_TEMPLATES_BY_ID,
  UNIT_KM,
  factsOf,
  heroLabel,
  type ShareDemoData,
  type ShareTemplateId,
  type ShareView,
} from '../src/features/share/templates';
import {
  HERO_METRICS,
  contextParts,
  heroMetricAvailable,
  heroValueFor,
  type HeroMetricId,
} from '../src/features/share/cardModel';
import {
  applySharePrivacy,
  SHARE_SIMPLIFY_EPSILON_M,
  SHARE_TRIM_M,
} from '../src/features/share/sharePrivacy';
import {
  CUSTOMIZE_SECTIONS,
  changedSections,
  protectionLines,
  type ComposerDraft,
} from '../src/features/share/composerModel';
import { CustomizeSheet } from '../src/features/share/CustomizeSheet';
import { ShareDestinations } from '../src/features/share/ShareDestinations';
import { ProtectedBadge } from '../src/features/share/ProtectedBadge';
import {
  pillDestinations,
  resolveShareTargets,
  type ResolvedShareTarget,
  type ShareMediaKind,
  type SharePlatform,
} from '../src/features/share/shareTargets';
import { buildShareLink, defaultShareTarget } from '../src/features/share/shareDeepLink';
import {
  shareAsImage,
  shareStickerImage,
  stickerText,
  type ShareActionResult,
} from '../src/features/share/shareActions';
import {
  dominantNarrative,
  styleAllowed,
  styleForNarrative,
  type NarrativeId,
  type NarrativeStyleId,
} from '../src/features/share/narrative';
import { StickerCard } from '../src/features/share/StickerCard';
import { usePrivacyPrefs } from '../src/features/privacy/store';
import { zonesForPublication } from '../src/features/privacy/zones';
import { usePrivacyZones } from '../src/features/privacy/zonesStore';
import { type RunIntention } from '../src/features/run/intention';
import { GripMascot } from '../src/features/social/GripMascot';
import { useMyEconomy } from '../src/features/social/economy';
import { gripRankForLevel, playerLevelForXp } from '../src/features/crew/rules';

/**
 * Formats d'export (Story / Carré / Carte seule) — options du segmented
 * « Format ». « Carte seule » (AMENDEMENT-24) = la carte 3D en grand, chrome
 * minimal (trace + zone + 1 ligne).
 */
const FORMATS: readonly {
  id: ShareCardRatio;
  label: Entry;
}[] = [
  // Libellés courts (les ratios 9:16/4:5/1:1 étaient décoratifs — « Story »
  // implique 9:16, « Portrait » 4:5, « Carré » 1:1). Entries i18n résolues au
  // rendu (t) — parité 5 langues forcée par le type. Strip défilant : aucun
  // libellé n'est jamais tronqué même à 4 options (§A.9).
  // Plus d'ICÔNE depuis que le choix vit dans le sheet : deux formats la
  // partageaient (« partage » pour story ET feed), donc elle ne distinguait
  // rien — un pictogramme qui ne discrimine pas est du bruit (§A).
  { id: 'story', label: C.formatStory },
  // 4:5 — imposé par la planche E10 (9:16 · 4:5 · 1:1). L'aspect existait déjà
  // (SHARE_CARD_ASPECT.feed) et n'était simplement pas proposé.
  { id: 'feed', label: C.formatFeed },
  { id: 'square', label: C.formatSquare },
  { id: 'mapOnly', label: C.formatMapOnly },
];

/**
 * Modes narratifs (planche E10 : « Auto · Impact · Photo · Avant/Après · Plus »).
 * AUTO est en tête : c'est le choix du MOTEUR, et c'est le défaut.
 *
 * ⚠️ « PHOTO » EST DÉLIBÉRÉMENT ABSENT — ICI ET DANS LE SHEET (E36).
 * `expo-image-picker` est bien installé, mais `apps/mobile/app.json` déclare
 * `NSPhotoLibraryUsageDescription` pour un usage PHOTO DE PROFIL uniquement.
 * Peindre un mode Photo ferait servir à un autre usage une permission demandée
 * pour celui-là : l'app dirait une chose au système et en ferait une autre.
 * Élargir cette chaîne est une décision de FONDATION (app.json + revue App
 * Store), pas un choix d'écran — c'est écrit ici et dans `composerModel.ts`,
 * à l'endroit exact où la section serait ajoutée.
 *
 * Depuis le recalage E10/E35 (27/07/2026), cette rangée ne vit plus À PLAT sur
 * l'écran : Format et Style ont DÉMÉNAGÉ dans le sheet « Personnaliser » (une
 * section à la fois), ils n'y sont pas dupliqués. L'écran garde une seule
 * décision (partager) et un seul CTA chartreuse.
 */
const STYLE_AUTO = 'auto' as const;
type StyleChoice = typeof STYLE_AUTO | ShareTemplateId;

/** Même convention pour le chiffre héros : `auto` = celui que le template choisit. */
const HERO_AUTO = 'auto' as const;
type HeroChoice = typeof HERO_AUTO | HeroMetricId;

/**
 * L'état que le sheet « Personnaliser » modifie. C'est le `ComposerDraft` PUR
 * (composerModel.ts, testable en Deno) RENARROWÉ sur les types de l'écran : le
 * modèle ne connaît ni les formats de card ni les templates — les connaître
 * l'obligerait à importer l'UI et il cesserait d'être testable hors React.
 */
interface ComposerState extends ComposerDraft {
  readonly ratio: ShareCardRatio;
  readonly style: StyleChoice;
  readonly hero: HeroChoice;
}

/**
 * Ordre des styles dans la section « Style ». Un seul tableau depuis que le
 * choix vit dans un sheet défilant : le dépliage « +3 styles » (et son bouton
 * qui pouvait n'ouvrir sur rien quand le verdict filtrait tous les extras) n'a
 * plus de raison d'être.
 */
const STYLE_ORDER: readonly ShareTemplateId[] = [
  'simple',
  'conquete',
  'defense',
  'boucle',
  'crew',
  'classement',
  'avantApres',
  'carte3d',
];

/**
 * Raison affichée sous la rangée — une par récit, du MÊME moteur que le style.
 *
 * TROIS de ces phrases NOMMENT l'effort et viennent donc de `resultCopy` :
 * « ta course a fait gagner ton crew », « ta course te fait bouger au
 * classement », « on partage la course, pas un territoire ». Les autres
 * décrivent le TERRITOIRE (capture, reprise, défense, boucle) ou un record :
 * elles sont déjà vraies dans les deux disciplines, et les dupliquer créerait
 * deux vérités à maintenir.
 *
 * Le classement mérite une note : `reasonRankingBike` dit « au classement
 * VÉLO », parce que les points de saison sont séparés par discipline
 * (`season_scores` clé `(season_id, user_id, activity)`). Une sortie vélo ne
 * bouge jamais le classement des coureurs — la phrase générique le laissait
 * croire.
 */
function narrativeReasons(A: ResultActivityCopy): Record<NarrativeId, Entry> {
  return {
    capture: C.reasonCapture,
    reprise: C.reasonReprise,
    defense: C.reasonDefense,
    boucle: C.reasonLoop,
    crew: A.reasonCrew,
    classement: A.reasonRanking,
    record: C.reasonRecord,
    effort: A.reasonEffort,
  };
}

/** Libellé COURT par style (jamais tronqué, résolu au rendu). Distinct du `chip` legacy. */
const STYLE_LABEL: Record<ShareTemplateId, Entry> = {
  simple: C.styleMap,
  conquete: C.styleConquest,
  defense: C.styleDefense,
  boucle: C.styleLoop,
  crew: C.styleCrew,
  classement: C.styleRanking,
  avantApres: C.styleBeforeAfter,
  carte3d: C.styleMap3d,
};

/**
 * Libellé de CHIP de la section « Donnée » (planche E10) — un par grandeur du
 * chiffre héros. Cinq réutilisent le libellé que la CARTE imprime déjà
 * (`C.zonesStatLabel`, `heroLabelHeld/Bonus/Crew/Rank`) : le chip et l'image
 * doivent nommer la même grandeur du même mot. Trois n'en avaient pas, parce
 * que sur la carte elles portent une unité (« km », « m² ») ou rien du tout
 * (une durée se lit seule) — un chip, lui, doit être nommé.
 */
const HERO_PICK_LABEL: Record<HeroMetricId, Entry> = {
  surface: SHARE_COPY.heroPickSurface,
  zones: C.zonesStatLabel,
  defended: C.heroLabelHeld,
  loop: C.heroLabelBonus,
  crew: C.heroLabelCrew,
  rank: C.heroLabelRank,
  distance: SHARE_COPY.heroPickDistance,
  duration: SHARE_COPY.heroPickDuration,
};

/** Styles dont la carte porte un VRAI tracé animable (bouton Rejouer pertinent). */
const ANIMATABLE_STYLES: readonly ShareTemplateId[] = [
  'simple',
  'conquete',
  'boucle',
  'classement',
  'avantApres',
];

/** Largeur de preview par format (la hauteur suit l'aspect de la card). */
const PREVIEW_WIDTH: Record<ShareCardRatio, number> = {
  story: 232,
  square: 300,
  feed: 280,
  mapOnly: 264,
};

/**
 * Largeur du MINI-aperçu du sheet (E36 : « aperçu ; onglet actif ; 3 à 6 choix
 * maximum ; CTA APPLIQUER »). Volontairement petit : il est là pour montrer que
 * le brouillon CHANGE quelque chose, pas pour relire la carte — celle-ci est en
 * grand derrière, et le sheet se ferme. Même largeur pour tous les ratios : la
 * hauteur suit l'aspect, donc la vignette reste une vignette.
 */
const MINI_PREVIEW_WIDTH = 116;

/**
 * Aiguillage : une course est armée → l'aperçu réel ; sinon → l'état vide qui
 * correspond à la situation. Aucune donnée fabriquée d'un côté ni de l'autre.
 * Les hooks de l'aperçu vivent dans `SharePreview` : ce composant-ci n'appelle
 * QUE des hooks inconditionnels avant son unique branchement de rendu.
 */
export default function PartageScreen() {
  const { session, loading: sessionLoading, configured } = useSession();
  // Singleton module armé par le Résultat (shareRun.ts). Lu au rendu : /partage
  // n'est jamais monté avant `setShareRun` sur le chemin légitime.
  const run = getShareRun();

  useEffect(() => {
    screen('partage', { armed: run !== null });
  }, []);

  if (run) return <SharePreview run={run} />;
  return (
    <ShareEmptyState
      // Tant que la session se restaure, on ne sait pas qui est là : on n'affirme
      // ni « connecte-toi » ni « tu n'as rien couru ».
      loading={sessionLoading}
      needsAccount={configured && !session}
    />
  );
}

function SharePreview({ run }: { run: ShareRunData }) {
  const insets = useSafeAreaInsets();
  const toast = useShareToast();
  const t = useT();
  // Le mode et l'intention viennent de la course ARMÉE (autoritaire), plus d'un
  // paramètre d'URL qu'un deep link peut inventer. Restent `template` (un choix
  // de forme, borné par les mêmes gardes que le reste) et la DISCIPLINE, que le
  // Résultat transmet par le paramètre contractuel du départ.
  const params = useLocalSearchParams<{ template?: string; activity?: string }>();
  /**
   * DISCIPLINE DE LA SORTIE PARTAGÉE. Lecture DÉFENSIVE : une valeur absente ou
   * inconnue retombe sur la discipline déclarée par défaut du jeu, c'est-à-dire
   * exactement le comportement d'avant le vélo — jamais un écran bloqué.
   *
   * SUSPENS ASSUMÉ : la source vraiment autoritaire serait la course armée
   * (`ShareRunData`), qui ne porte pas encore la discipline — ce champ vit dans
   * `features/share/shareRun.ts`, hors du périmètre de ce correctif. En
   * pratique cet écran n'est atteignable avec une course armée QUE depuis le
   * Résultat (le singleton n'est rempli nulle part ailleurs), et c'est lui qui
   * écrit ce paramètre : un deep link forgé n'a aucune course à décrire et tombe
   * sur l'état vide. C'est écrit ici plutôt que tenu pour acquis.
   */
  const activity: Activity = parseStartActivity(params[START_ACTIVITY_PARAM]);
  /** Les mots de CETTE discipline — même porte d'entrée unique que le Résultat. */
  const A = resultCopy(activity);

  /**
   * PARTAGE VRAI : les stats de la sortie affichée au Résultat (shareRun.ts),
   * AUXQUELLES ON JOINT LA DISCIPLINE (26/07/2026).
   *
   * C'est la dernière marche du correctif, et la plus importante : la carte
   * n'est pas un écran, c'est un PNG qui sort de l'app. Tant que `ShareDemoData`
   * ne portait pas la discipline, tous les templates imprimaient les mots du
   * coureur — « COURSE ENREGISTRÉE », « COURU POUR {crew} » — sous le tracé d'un
   * cycliste, et le crew les lisait hors de toute surface où on aurait pu les
   * corriger. On JOINT ici plutôt qu'on ne devine plus loin : le template n'a
   * aucun moyen d'aller chercher un paramètre d'URL, et il ne doit pas en avoir.
   *
   * SUSPENS ASSUMÉ, INCHANGÉ : la source vraiment autoritaire serait la sortie
   * armée (`ShareRunData`), que seul le Résultat remplit — et il vit hors du
   * périmètre de ce correctif. Il écrit déjà la discipline dans l'URL au même
   * `router.push` que `setShareRun`, donc les deux viennent du même écran et du
   * même run ; et sans sortie armée, cet aiguillage n'est même pas monté.
   */
  const runCard = useMemo(() => ({ ...run.card, activity }), [run.card, activity]);
  const intention = run.intention;
  const verdict = run.verdict;
  // Social Run = stats seules, aucune capture : on ne propose JAMAIS un visuel
  // « secteur pris » pour une course qui n'a rien capturé.
  const statsOnlyShare = run.mode === 'social_run';

  // ─── LE MOTEUR CHOISIT LE RÉCIT (planche E10) ──────────────────────────────
  // Ce que la course A FAIT, d'après le seul juge — pas ce que le joueur voulait
  // faire. Même appel que l'écran Résultat : les deux écrans ne peuvent pas
  // raconter deux histoires du même run.
  const narrative = useMemo(() => dominantNarrative(verdict), [verdict]);
  const engineStyle: ShareTemplateId = styleForNarrative(narrative);
  // Stats seules (social_run) : aucune capture n'est possible par construction —
  // le moteur retombe déjà sur `simple`, on le verrouille par défense en profondeur.
  const autoStyle: ShareTemplateId = statsOnlyShare ? 'simple' : engineStyle;

  /**
   * Choix de l'utilisateur : `auto` (= le moteur, réversible) ou un style précis.
   * Un deep link `?template=` reste prioritaire — mais il passe par les MÊMES
   * gardes que le reste (voir `selected`) : une URL ne peut pas ressusciter un
   * style que le verdict n'autorise pas.
   */
  const [choice, setChoice] = useState<StyleChoice>(
    !statsOnlyShare && isTemplateId(params.template) ? params.template : STYLE_AUTO,
  );
  const [ratioRaw, setRatio] = useState<ShareCardRatio>('story');
  /**
   * CHIFFRE HÉROS choisi par l'utilisateur (section « Donnée », planche E10) :
   * `auto` = celui du template. Toute autre valeur passe par la MÊME garde que
   * le reste (`heroMetricAvailable`, cardModel.ts) — un chiffre indisponible ne
   * peut pas être sélectionné, donc jamais rendu.
   */
  const [heroChoice, setHeroChoice] = useState<HeroChoice>(HERO_AUTO);
  /** Section « Texte » : imprimer ou non les deux textes OPTIONNELS de la carte. */
  const [showChallenge, setShowChallenge] = useState(true);
  const [showContext, setShowContext] = useState(true);
  /** Le sheet « Personnaliser » (E36) est-il ouvert ? */
  const [customizing, setCustomizing] = useState(false);
  /** Cible de l'export PNG (D6) : le conteneur EXACT de la ShareCard. */
  const cardShotRef = useRef<View | null>(null);
  /** Cible de l'export du STICKER PNG transparent (monté hors écran). */
  const stickerShotRef = useRef<View | null>(null);
  // Rejouer l'animation de la preview (doc §4.8 « Replay Conquête » — free =
  // replay animé in-app, honnête : la trace se redessine et la zone se remplit).
  // `fullReplay` : l'ENTRÉE de l'aperçu joue la partition comprimée (l'écran est
  // actionnable tout de suite) ; le bouton Rejouer joue les 7,5 s de la planche.
  const [replayKey, setReplayKey] = useState(0);
  const [fullReplay, setFullReplay] = useState(false);

  // ═══ MASQUAGE PRIVACY (§12.1) — TROIS ÉTAPES, PAS UNE ══════════════════════
  // 1. coupe des extrémités (SHARE_TRIM_M), RÉGLABLE par le joueur ;
  // 2. exclusion de ses zones floutées, lues en base (`usePrivacyZones`) ;
  // 3. simplification de la trace, NON réglable — c'est une règle du produit.
  // La zone conquise reste entière (territoire public, pas la position).
  //
  // `maskEndpoints` désactivé ne rend PLUS la trace brute : il passe `trimM = 0`
  // dans le pipeline, qui applique quand même zones et simplification. Le
  // réglage gouverne les 250 m, pas la §12.1 entière.
  // `update` : le sheet « Personnaliser » peut rebasculer `maskEndpoints`, qui
  // est le MÊME réglage persistant que l'écran Confidentialité (il le dit).
  const { prefs, update: updatePrivacy } = usePrivacyPrefs();
  const maskEndpoints = prefs.maskEndpoints;
  // Les zones floutées PRÉVALENT sur tout rendu social (§1.5) : tant qu'on ne
  // les connaît pas, on ne dessine RIEN — publier « en attendant » parierait
  // que le joueur n'en a déclaré aucune, et une image publiée ne se rattrape pas.
  const zonesRead = usePrivacyZones();
  const zonePublication = useMemo(() => zonesForPublication(zonesRead), [zonesRead]);
  const safeTrace = useMemo(
    () =>
      zonePublication.ready
        ? applySharePrivacy(
            runCard.trace,
            maskEndpoints ? SHARE_TRIM_M : 0,
            zonePublication.zones,
          )
        : [],
    [maskEndpoints, runCard.trace, zonePublication],
  );
  // Le tracé de CETTE course est-il connu ? (le Résultat arme `trace: []` pour
  // une vraie course : ingest_run ne renvoie pas encore la géométrie). Tout ce
  // qui est CARTOGRAPHIQUE en dépend — on ne PROPOSE pas ce qu'on ne peut pas
  // tenir : ni le format « Carte seule », ni le style « Carte 3D », ni le badge
  // « départ/arrivée masqués » (rien n'est masqué s'il n'y a rien à montrer).
  const hasKnownRoute = safeTrace.length >= 3;
  const privacyNote = maskEndpoints ? t(C.privacyMasked) : undefined;

  /**
   * Le style peut-il être TENU par cette course ? Deux gardes cumulées :
   *   1. le VERDICT (moteur pur, testé) — un style ne s'ouvre que sur la
   *      grandeur qu'il affiche en géant : pas de « +0 » ni de « — » exporté ;
   *   2. la GÉOMÉTRIE — « Carte 3D » a besoin d'un tracé connu, sinon il
   *      étiquetterait « Carte 3D » un repli silencieux vers un autre rendu.
   * `crewPoints` double la garde crew du moteur (`crewXp`) : ce sont deux
   * champs serveur distincts, et c'est `crewPoints` que la card imprime.
   * Une seule fonction : le filtrage des OPTIONS et la normalisation du CHOIX
   * (deep link inclus) ne peuvent pas diverger.
   */
  const canRender = useMemo(
    () =>
      (id: ShareTemplateId): boolean =>
        styleAllowed(id, verdict) &&
        (id !== 'carte3d' || hasKnownRoute) &&
        (id !== 'crew' || runCard.crewPoints > 0),
    [verdict, hasKnownRoute, runCard.crewPoints],
  );

  // Normalisation : un choix intenable (deep link `?template=conquete` sur une
  // course sans capture, masquage qui vient de raboter la trace…) retombe sur le
  // choix du MOTEUR — jamais sur une affirmation que le serveur n'a pas faite.
  const normalizeStyle = useCallback(
    (c: StyleChoice): ShareTemplateId => {
      if (c !== STYLE_AUTO && canRender(c)) return c;
      return canRender(autoStyle) ? autoStyle : 'simple';
    },
    [canRender, autoStyle],
  );
  const normalizeRatio = useCallback(
    (r: ShareCardRatio): ShareCardRatio => (!hasKnownRoute && r === 'mapOnly' ? 'story' : r),
    [hasKnownRoute],
  );
  const selected: ShareTemplateId = normalizeStyle(choice);
  const ratio: ShareCardRatio = normalizeRatio(ratioRaw);

  useEffect(() => {
    // Preview auto-générée (doc §12 : share_preview_generated). Émis ICI et pas
    // dans l'aiguilleur : sans course armée, aucune card n'est générée.
    track(EVENTS.shareCardGenerated, { template: selected });
  }, []);

  /**
   * LES FAITS de cette course, projetés une seule fois pour tout l'écran
   * (`factsOf`, templates.tsx — la MÊME projection que les cards). C'est lui qui
   * décide quelles grandeurs la section « Donnée » a le droit de proposer : une
   * grandeur indisponible n'est pas grisée, elle n'est pas peinte (§2).
   */
  const facts = useMemo(() => factsOf(runCard), [runCard]);
  const normalizeHero = useCallback(
    (h: HeroChoice): HeroMetricId | null =>
      h !== HERO_AUTO && heroMetricAvailable(h, facts) ? h : null,
    [facts],
  );

  // État de RENDU injecté dans chaque carte : anime + rejoue + fournit le tracé
  // DÉJÀ masqué (privacy). La preview est animée d'entrée (story auto, doc §7.2).
  // captured=false en social_run : aucune capture → la zone ne se remplit pas.
  const view: ShareView = useMemo(
    () => ({
      animated: true,
      replayKey,
      trace: safeTrace,
      captured: !statsOnlyShare,
      fullReplay,
    }),
    [replayKey, safeTrace, statsOnlyShare, fullReplay],
  );

  /**
   * LA CARTE, POUR UN ÉTAT DONNÉ. Une seule fabrique, appelée deux fois : par
   * l'aperçu de l'écran (état COMMITÉ) et par le mini-aperçu du sheet (état
   * BROUILLON). Deux fabriques auraient fini par diverger, et le sheet aurait
   * montré une image que le partage n'aurait pas produite — dans un écran dont
   * toute la promesse est « la preview EST le média exporté » (planche E10).
   */
  const buildCard = useCallback(
    (s: ComposerState, v: ShareView) => {
      const templateId = normalizeStyle(s.style);
      const r = normalizeRatio(s.ratio);
      // Le badge « départ et arrivée masqués » DANS l'image n'est honnête que
      // sur une carte qui rend RÉELLEMENT la trace tronquée (templates SVG
      // animables, hors « Carte seule » : mapOnly rend une boucle fermée et ne
      // peut pas refléter le masquage).
      const shows = hasKnownRoute && ANIMATABLE_STYLES.includes(templateId) && r !== 'mapOnly';
      let built = {
        ...SHARE_TEMPLATES_BY_ID[templateId].build(runCard, v),
        privacyNote: shows ? privacyNote : undefined,
      };

      // ─── CHIFFRE HÉROS CHOISI (section « Donnée ») ────────────────────────
      // On ne recalcule RIEN : `heroValueFor` et `heroLabel` sont exactement les
      // fonctions que la card utilise, et `contextParts` retire du contexte la
      // grandeur passée en géant — sinon la même mesure serait affirmée deux
      // fois sur la même image.
      const hero = normalizeHero(s.hero);
      if (hero !== null) {
        const value = heroValueFor(hero, facts);
        if (value !== null) {
          const ctx = contextParts(facts, hero, UNIT_KM).join(' · ');
          built = {
            ...built,
            stat: value,
            statLabel: heroLabel(hero, facts),
            title: ctx === '' ? undefined : ctx,
          };
        }
      }

      // ─── SECTION « TEXTE » : on RETIRE, on n'ajoute jamais ────────────────
      // Masquer un texte vrai n'est pas un mensonge ; en inventer un le serait.
      if (!s.showChallenge) built = { ...built, challenge: undefined };
      if (!s.showContext) built = { ...built, title: undefined };

      // « Carte seule » (AMENDEMENT-24) : la carte EN GRAND quel que soit le
      // style — si le template n'a pas déjà son propre fond carte (les 5 SVG),
      // on injecte une carte plein cadre. Le style choisi ne règle alors QUE le
      // KPI/la ligne (chrome minimale). Toujours la carte SVG du tracé réellement
      // couru : la 3D (`ShareMap3D`) est une géométrie de démo FIGÉE (République)
      // et n'a plus d'aperçu d'exemple où s'afficher. « Carte seule » n'est de
      // toute façon pas proposé quand le tracé est inconnu (voir `formatOptions`).
      if (r === 'mapOnly' && built.mapBackground === undefined) {
        built = {
          ...built,
          mapBackground: (
            <View style={styles.previewMapFill}>
              <ShareMap
                style={styles.previewMapSquare}
                animated={v.animated}
                replayKey={v.replayKey}
                trace={v.trace ?? []}
                captured={v.captured}
                fullReplay={v.fullReplay}
              />
            </View>
          ),
        };
      }
      return { props: built, ratio: r, templateId, traceShown: shows };
    },
    // `t` (stable par langue) force la re-construction des cards à la bascule.
    [normalizeStyle, normalizeRatio, normalizeHero, runCard, privacyNote, hasKnownRoute, facts, t],
  );

  /** L'état COMMITÉ — celui que l'écran rend et que le partage exporte. */
  const committed: ComposerState = useMemo(
    () => ({
      ratio: ratioRaw,
      style: choice,
      hero: heroChoice,
      showChallenge,
      showContext,
      maskEndpoints,
    }),
    [ratioRaw, choice, heroChoice, showChallenge, showContext, maskEndpoints],
  );

  const card = useMemo(() => buildCard(committed, view), [buildCard, committed, view]);
  const cardProps = card.props;
  const traceShown = card.traceShown;

  // DEEP LINK de la story (doc §6.4) : UN lien par partage, dérivé de
  // l'intention/zone/crew + du style choisi. Attaché à tous les partages.
  const deepLink = useMemo(
    () =>
      buildShareLink(
        defaultShareTarget({
          intention,
          zoneName: runCard.zoneName,
          crewName: runCard.crewName,
          templateId: selected,
        }),
      ),
    [intention, runCard.zoneName, runCard.crewName, selected],
  );

  // ─── LES OPTIONS DU SHEET « PERSONNALISER » (E36) ──────────────────────────
  // Toutes suivent la même règle : on ne propose QUE ce que cette course peut
  // tenir. Une option en moins vaut mieux qu'une image qui ment (§2).

  /**
   * STYLES. « Auto » en tête (le choix du moteur, réversible), puis les styles
   * TENABLES (`canRender` : verdict + géométrie + crew).
   *
   * LISTE VIDE quand il n'y a rien à choisir : en social_run (aucune capture
   * possible, un seul visuel honnête) ou quand un seul style est tenable —
   * « Auto » et lui produiraient alors la MÊME image, donc deux boutons sans
   * conséquence (§A r.1). La section le DIT au lieu de peindre un faux choix.
   */
  const styleOptions = useMemo(() => {
    const tenable = STYLE_ORDER.filter(canRender);
    if (statsOnlyShare || tenable.length < 2) return [];
    return [
      { id: STYLE_AUTO as StyleChoice, label: t(C.styleAuto) },
      ...tenable.map((id) => ({ id: id as StyleChoice, label: t(STYLE_LABEL[id]) })),
    ];
  }, [canRender, statsOnlyShare, t]);

  // Formats : « Carte seule » (la carte EN GRAND) n'a aucun sens — et serait un
  // cadre vide — quand le tracé de cette course est inconnu. On ne le propose pas.
  const formatOptions = useMemo(
    () => FORMATS.filter((f) => f.id !== 'mapOnly' || hasKnownRoute).map((f) => ({
        id: f.id as ShareCardRatio,
        label: t(f.label),
      })),
    [hasKnownRoute, t],
  );

  /**
   * DONNÉE (planche E10). « Auto » + les grandeurs RÉELLEMENT disponibles dans
   * les faits de cette course (`heroMetricAvailable`) : la surface n'apparaît
   * que si `territories.area_m2` a été lue, le rang que si une saison en fournit
   * un, la durée que si elle a été mesurée. Une grandeur absente n'est pas
   * grisée — elle n'est pas peinte.
   *
   * Moins de 2 grandeurs ⇒ liste VIDE : « Auto » et l'unique grandeur donneraient
   * la même image.
   */
  const heroOptions = useMemo(() => {
    const available = HERO_METRICS.filter((m) => heroMetricAvailable(m, facts));
    if (available.length < 2) return [];
    return [
      { id: HERO_AUTO as HeroChoice, label: t(C.styleAuto) },
      ...available.map((m) => ({ id: m as HeroChoice, label: t(HERO_PICK_LABEL[m]) })),
    ];
  }, [facts, t]);

  /**
   * TEXTE. On ne propose un interrupteur que pour un texte que la carte porte
   * RÉELLEMENT : la capsule de défi n'existe pas sur tous les récits, et la
   * ligne de contexte est vide quand ni crew, ni rang, ni mesure ne sont connus.
   * Un interrupteur sur un texte absent serait un contrôle sans effet.
   */
  const textParts = useMemo(() => {
    const bare = buildCard({ ...committed, showChallenge: true, showContext: true }, view);
    return {
      challenge: bare.props.challenge !== undefined,
      context: bare.props.title !== undefined,
    };
  }, [buildCard, committed, view]);

  // Le style courant porte-t-il un vrai tracé animable (bouton Rejouer utile) ?
  const canReplay = ANIMATABLE_STYLES.includes(selected);

  // Message narratif prêt à coller (doc §6.1 « partager une conséquence ») +
  // le deep link. UN seul lien par story (§6.3). Le repli « distance seule »
  // nomme la DISCIPLINE : c'est du texte qui part dans le fil du crew.
  const shareMessage = `${buildShareHeadline(t, intention, runCard, statsOnlyShare, narrative, A.headlineStats)}\n${deepLink}`;

  // Action de partage RÉELLE (fire-and-forget) : ne confirme que si ça a marché
  // (honnêteté — un « annulé » reste silencieux). `msg` peut dépendre du canal
  // réel (`via`) pour ne jamais mentir (« copié » vs « prêt à partager »).
  // `onOk` émet les events qui exigent un succès réel (jamais au tap).
  const runAction = (
    p: Promise<ShareActionResult>,
    msg: string | ((via: 'clipboard' | 'share' | 'webshare' | 'image') => string),
    channel: string,
    onOk?: (via: 'clipboard' | 'share' | 'webshare' | 'image') => void,
  ) => {
    haptics.light();
    void p.then((r) => {
      if (r.ok) {
        track(EVENTS.shareCompleted, { channel });
        onOk?.(r.via);
        toast.show(typeof msg === 'function' ? msg(r.via) : msg);
      } else if (r.reason === 'unavailable') {
        toast.show(t(C.shareUnavailable));
      }
      // 'dismissed' → silencieux (l'utilisateur a fermé la feuille de partage).
    });
  };

  /**
   * En-tête du sticker. Une conquête ne s'y annonce QUE si le moteur a retenu un
   * récit territorial — sinon c'est la distance MESURÉE. Même garde que le
   * message texte : le sticker est un média sortant comme un autre.
   */
  const stickerHead =
    narrative === 'effort' || statsOnlyShare
      ? t(C.stickerHeadDistance, { km: runCard.distanceKm })
      : t(C.stickerHeadZones, {
          n: runCard.zonesGained,
          zone: runCard.zoneName,
        });
  const stickerMetrics = [runCard.distanceKm ? `${runCard.distanceKm} km` : '', runCard.clockLabel]
    .filter(Boolean)
    .join(' · ');

  /**
   * STICKER (planche E10 : « sticker PNG transparent »). Sur natif, on rasterise
   * la vue `StickerCard` (montée hors écran) en PNG à canal alpha ; sur web —
   * où `captureRef` n'existe pas — le filet TEXTE reste, et le toast le dit
   * autrement : « PNG » n'est annoncé QUE si une image a réellement été produite.
   */
  const shareSticker = () => {
    runAction(
      shareStickerImage(stickerShotRef.current, stickerText(runCard, stickerHead, deepLink)),
      (via) =>
        via === 'image'
          ? t(C.stickerPngReady)
          : via === 'clipboard'
            ? t(C.stickerCopied)
            : t(C.stickerReady),
      'sticker',
      (via) => {
        if (via === 'clipboard') track(EVENTS.stickerCopied, { template: selected });
      },
    );
  };

  // Replay Conquête (planche E10) : rejoue la partition COMPLÈTE (7,5 s) — c'est
  // le seul endroit où elle se joue en entier, l'entrée de l'aperçu restant
  // comprimée pour ne pas retarder l'action.
  const replay = () => {
    haptics.light();
    track(EVENTS.replayPlayed, { template: selected });
    setFullReplay(true);
    setReplayKey((k) => k + 1);
  };

  // Titre = ce que la course a fait (jamais « conquête » pour une défense).
  // Les deux premiers parlent de TERRITOIRE (vrais dans les deux disciplines) ;
  // le troisième NOMME l'effort et suit donc la discipline : « Partager ta
  // course » / « Partager ta sortie ».
  const title =
    intention === 'defense'
      ? t(C.shareDefenseTitle)
      : intention === 'conquest'
        ? t(C.shareConquestTitle)
        : t(A.shareRunTitle);

  // SIGNATURE GRIP : rang dérivé de l'XP RÉELLE du joueur. `source === 'none'`
  // = on ne sait pas (pas de session, ou lecture serveur impossible) → aucune
  // mascotte plutôt qu'un rang emprunté, y compris dans le PNG exporté.
  const economy = useMyEconomy();
  const gripRank =
    economy.source === 'server' ? gripRankForLevel(playerLevelForXp(economy.xp)) : null;

  // CTA primaire aligné sur le format choisi — toujours un verbe précis.
  const primaryCta =
    ratio === 'square'
      ? { label: t(C.shareSquareCta), channel: 'instagram_feed' as const }
      : ratio === 'feed'
        ? { label: t(C.shareFeedCta), channel: 'instagram_feed' as const }
        : ratio === 'mapOnly'
          ? { label: t(C.shareMapCta), channel: 'instagram_feed' as const }
          : { label: t(C.shareStoryCta), channel: 'instagram_story' as const };

  /** Export de la card (feuille système) — la même action que la CTA primaire. */
  const shareCurrentCard = (channel: string) =>
    runAction(
      shareAsImage(cardShotRef.current, shareMessage),
      (via) => (via === 'image' ? t(C.storyExported) : t(C.storyReady)),
      channel,
      (via) => {
        // P1 D6 — share_exported = une IMAGE a réellement été produite
        // (≠ share_card_generated, la preview React ; ≠ share_completed, qui
        // compte aussi le filet texte).
        if (via === 'image') track(EVENTS.shareExported, { ratio, channel });
      },
    );

  // ═══ DESTINATIONS NOMMÉES (planche E10 : Instagram · TikTok · WhatsApp · Plus)
  /**
   * CE QU'ON A VRAIMENT DANS LES MAINS, et c'est ça qui décide la rangée.
   * Sur natif, la CTA rasterise la card : le média est une IMAGE (story pour le
   * 9:16, post pour les autres formats). Sur le web, `captureRef` n'existe pas —
   * `shareAsImage` retombe sur `openShareSheet`, donc le média est un TEXTE, et
   * le prétendre autrement peindrait des destinations qui ne recevraient jamais
   * l'image (constitution §2 : l'affichage se dérive de la capacité RÉELLE).
   */
  const sharePlatform: SharePlatform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const shareMedia: ShareMediaKind =
    Platform.OS === 'web' ? 'text' : ratio === 'story' ? 'story_image' : 'post_image';
  /**
   * Aucune sonde (`probes`) n'est passée, et ce n'est pas un oubli :
   * `DECLARED_QUERIES` est VIDE des deux côtés (app.json ne déclare aucun
   * `LSApplicationQueriesSchemes`, et Android exige un config plugin). Une sonde
   * `canOpenURL` sur un schéma non déclaré répond `false` par construction — la
   * mesure n'aurait pas lieu, elle coûterait un avertissement iOS pour une
   * réponse inutilisable. Aucun `bridges` non plus : aucun pont n'est embarqué
   * (voir shareTargets.ts). Conséquence VISIBLE et assumée : Instagram et TikTok
   * ne sont pas peints aujourd'hui.
   */
  const destinations = useMemo(
    () =>
      resolveShareTargets({
        platform: sharePlatform,
        media: shareMedia,
        text: shareMessage,
      }),
    [sharePlatform, shareMedia, shareMessage],
  );
  /**
   * LA RANGÉE NE REFAIT PAS LE GESTE DU CTA (§A). La pastille « Plus » ouvre la
   * feuille système — exactement ce que fait le CTA chartreuse quinze lignes
   * plus bas (`shareCurrentCard` → `shareAsImage` → feuille de partage). Deux
   * contrôles pour une seule action sont un contrôle de trop, et ce fichier se
   * l'interdisait déjà pour « Autre app » : le doublon avait juste changé de
   * côté. `pillDestinations` (pur, testé) retire la feuille système ; sur natif
   * il ne reste alors RIEN et la rangée disparaît, sur le web WhatsApp survit
   * (destination réellement distincte) avec sa note d'absence.
   */
  const destinationPills = useMemo(
    () => pillDestinations(destinations.targets),
    [destinations.targets],
  );

  const pickDestination = (target: ResolvedShareTarget) => {
    // INTENTION, pas partage : l'event le dit lui-même (events.ts). La remise
    // réelle se mesure avec `share_exported` / `share_completed`.
    track(EVENTS.shareChannelTapped, { channel: target.id });
    // `os_share_sheet` n'arrive plus ici : `pillDestinations` l'a retiré parce
    // que c'est le CTA chartreuse lui-même. La branche reste, et c'est délibéré
    // — elle est le FILET si la rangée reprend un jour la feuille système, et
    // sans elle un tap tomberait dans le message d'échec ci-dessous, c'est-à-dire
    // mentirait sur une action qui, elle, marche.
    if (target.open.via === 'os_share_sheet') {
      shareCurrentCard(target.id);
      return;
    }
    if (target.open.via === 'url') {
      const url = target.open.url;
      haptics.light();
      // Aucun `share_completed` ici, volontairement : `openURL` ne dit que
      // « l'OS a pris l'URL », jamais que le joueur a envoyé son message. Le
      // compter comme un partage abouti gonflerait le KPI d'un pas qui n'a
      // peut-être pas eu lieu.
      void Linking.openURL(url).catch(() => toast.show(t(SHARE_COPY.channelHandoffFailed)));
      return;
    }
    // `native_sdk` / `android_intent` exigent un PONT que ce build n'embarque
    // pas — `resolveShareTargets` ne peut donc pas les rendre aujourd'hui. Si
    // ça arrivait quand même, on le DIT plutôt que de ne rien faire en silence.
    toast.show(t(SHARE_COPY.channelHandoffFailed));
  };

  // ═══ SHEET « PERSONNALISER » (E36) ═════════════════════════════════════════
  const applyCustomize = (next: ComposerState) => {
    const changed = changedSections(committed, next);
    setRatio(next.ratio);
    setChoice(next.style);
    setHeroChoice(next.hero);
    setShowChallenge(next.showChallenge);
    setShowContext(next.showContext);
    if (next.maskEndpoints !== maskEndpoints) {
      // Réglage PERSISTANT (le même que l'écran Confidentialité) — pas un état
      // d'écran. Le sheet le dit à l'utilisateur (`privacyEndpointsGlobal`).
      void updatePrivacy({ maskEndpoints: next.maskEndpoints });
    }
    // Un `APPLIQUER` qui ne change rien n'émet RIEN : l'analytics ne doit pas
    // compter des réglages fantômes.
    for (const section of CUSTOMIZE_SECTIONS) {
      if (changed.includes(section)) track(EVENTS.shareCustomizeApplied, { tab: section });
    }
    if (changed.includes('style')) {
      // On trace le style RÉELLEMENT rendu (« auto » n'est pas un template) :
      // l'analytics doit refléter l'image vue, pas l'étiquette du bouton.
      track(EVENTS.shareTemplateChanged, { template: normalizeStyle(next.style) });
    }
    setCustomizing(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Retour (chevron inversé, charte §F). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.backToResultA11y)}
          onPress={() => goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>{t(C.backToResult)}</Text>
        </Pressable>

        {/* ─── EN-TÊTE : titre + BADGE « PROTÉGÉ » (planche E10 : « header
             `Partager` + badge `🛡 Protégé` », E35 : « badge Protégé en haut
             droite ») ────────────────────────────────────────────────────────
             TROIS DÉFAUTS CORRIGÉS D'UN COUP (27/07/2026) :
              · il était rendu en `View`, donc AUCUN détail au tap — la planche
                l'exige (« Badge 🛡 Protégé permanent, détail au tap ») ;
              · il vivait SOUS l'aperçu et centré, pas en haut à droite ;
              · il était conditionné à `traceShown && privacyNote`, donc
                intermittent — la planche le veut PERMANENT.
             Permanent oblige à ne plus figer sa promesse dans son libellé : le
             badge ne dit QUE « Protégé », et le détail (ProtectedBadge +
             `protectionLines`, pur et testé) énumère ce qui est protégé DANS
             CETTE SITUATION — jusqu'à « aucun tracé n'est publié » quand il n'y
             a rien à masquer. Le libellé « départ et arrivée masqués » reste,
             lui, DANS l'image (`privacyNote`) là où la trace tronquée est
             réellement visible.
             POSITION : haut-droite du BLOC d'aperçu, sur la ligne du titre —
             et non posé PAR-DESSUS la card. La card, elle, est la cible exacte
             de l'export : tout ce qui la recouvre est soit capturé dans le PNG
             (et alors ce n'est plus un badge d'écran), soit un chrome qui
             recouvre son sceau « ✓ Verified », déjà en haut à droite. */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <ProtectedBadge
            lines={protectionLines({
              routePublished: traceShown,
              maskEndpoints,
              declaredZones: zonePublication.ready ? zonePublication.zones.length : 0,
            })}
            trimM={SHARE_TRIM_M}
            simplifyM={SHARE_SIMPLIFY_EPSILON_M}
            zoneCount={zonePublication.ready ? zonePublication.zones.length : 0}
          />
        </View>

        {/* PREVIEW qui FLOTTE : la story EST le container (pas de card noire autour).
            `cardShotRef` + collapsable=false : la cible EXACTE de l'export PNG (D6). */}
        <View ref={cardShotRef} collapsable={false} style={styles.previewWrap}>
          <ShareCard
            {...cardProps}
            ratio={ratio}
            width={PREVIEW_WIDTH[ratio]}
            mascot={gripRank ? <GripMascot rank={gripRank} size={36} /> : undefined}
          />
        </View>
        {/* PAS DE TRACÉ À L'ÉCRAN : trois raisons DIFFÉRENTES, trois phrases
            différentes — les confondre serait exactement le mensonge que la
            constitution nomme (« lecture EN COURS » n'affirme rien sur le
            joueur, et « échec de chargement » n'est pas « rien à montrer ») :
              · zones floutées en cours de lecture → on attend, on le dit ;
              · lecture des zones échouée → on ne publie pas, on le dit ;
              · sinon, le tracé de la course est réellement inconnu (le Résultat
                arme `trace: []` — ingest_run ne renvoie pas la géométrie).
            Dans les trois cas les CHIFFRES restent ceux de cette course. */}
        {!zonePublication.ready ? (
          <Text style={styles.noRouteNote}>
            {t(zonePublication.reason === 'loading' ? C.privacyZonesLoading : C.privacyZonesError)}
          </Text>
        ) : !hasKnownRoute ? (
          <Text style={styles.noRouteNote}>{t(A.traceUnavailableNote)}</Text>
        ) : null}

        {/* ─── « Pourquoi ce style ? » + « Personnaliser » (planche E10) ──────
             Format et Style ne sont PLUS à plat ici : ils ont déménagé dans le
             sheet (une section à la fois), ils n'y sont pas dupliqués. L'écran
             garde UNE décision — partager — et la phrase du moteur qui explique
             l'image qu'il propose. La raison vient du MÊME moteur que le style
             Auto : elle ne peut pas raconter une autre histoire que la card. */}
        <View style={styles.reasonRow}>
          <Text style={styles.whyStyle}>
            {t(C.whyThisStyle, { reason: t(narrativeReasons(A)[narrative]) })}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(SHARE_COPY.customizeLink)}
            onPress={() => {
              haptics.light();
              setCustomizing(true);
            }}
            style={({ pressed }) => [styles.customizeLink, pressed && styles.pressed]}
          >
            <Text style={styles.customizeLinkText}>{t(SHARE_COPY.customizeLink)}</Text>
          </Pressable>
        </View>

        {/* UN SEUL gros CTA chartreuse (suit le format, verbe précis). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryCta.label}
          onPress={() => shareCurrentCard(primaryCta.channel)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.ctaLabel}>{primaryCta.label}</Text>
        </Pressable>

        {/* ─── DESTINATIONS NOMMÉES (planche E10) ────────────────────────────
             « Instagram · TikTok · WhatsApp · Plus », mais UNIQUEMENT celles que
             `resolveShareTargets` déclare atteignables ICI, MAINTENANT, pour CE
             média, ET qui ne sont pas déjà le CTA ci-dessus (`pillDestinations`).
             Tant qu'aucun pont natif n'est embarqué, Instagram et TikTok
             ne sont pas peints : un raccourci qui ouvrirait l'app SANS l'image
             est exactement le bouton mort que la constitution §2 interdit.
             Conséquence AUJOURD'HUI sur iOS/Android : il ne reste aucune
             pastille, et le composant ne rend rien du tout. */}
        <ShareDestinations
          targets={destinationPills}
          omitted={destinations.omitted}
          onPick={pickDestination}
        />

        {/* ─── ACTIONS LÉGÈRES : Sticker · Rejouer ───────────────────────────
             « Autre app » a DISPARU d'ici : c'est exactement « Plus » de la
             rangée de destinations ci-dessus (la feuille système), et deux
             contrôles pour la même action sont un contrôle de trop.
             Sticker et Rejouer restent, en `IconAction` : cercle N2, icône
             blanche, label gris — aucun chartreuse, donc aucun second CTA (§A).
             Ils ne peuvent pas vivre dans le sheet « Personnaliser » : ce ne
             sont pas des réglages de la carte, ce sont des ACTIONS (l'une
             exporte un autre média, l'autre rejoue l'animation). */}
        <View style={styles.actionRow}>
          <IconAction
            icon="copier"
            label={t(C.stickerAction)}
            accessibilityLabel={t(C.stickerA11y)}
            onPress={shareSticker}
          />
          {canReplay ? (
            <IconAction
              icon="route"
              label={t(C.replayAction)}
              accessibilityLabel={t(C.replayA11y)}
              onPress={replay}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* ─── SHEET « PERSONNALISER » (E36) ───────────────────────────────────
           Format · Style · Donnée · Texte · Confidentialité — une section à la
           fois, et PAS de section Photo (voir le docblock de STYLE_AUTO plus
           haut : app.json ne déclare la photothèque que pour la photo de
           profil). Le mini-aperçu est construit par la MÊME fabrique que
           l'aperçu de l'écran (`buildCard`), sur le BROUILLON : ce que le sheet
           montre est exactement ce qu'`APPLIQUER` produira. */}
      <CustomizeSheet
        visible={customizing}
        committed={committed}
        onClose={() => setCustomizing(false)}
        onApply={applyCustomize}
        onOpened={(section) => track(EVENTS.shareCustomizeOpened, { tab: section })}
        formatOptions={formatOptions}
        styleOptions={styleOptions}
        heroOptions={heroOptions}
        textParts={textParts}
        renderPreview={(d) => {
          const mini = buildCard(d, { ...view, animated: false, fullReplay: false });
          // ─── LA VIGNETTE EST LA CARTE, RÉDUITE — PAS UNE CARTE ÉTROITE ─────
          // Monter la ShareCard à 116 pt la casserait : ses textes ont des
          // `numberOfLines`, donc le titre héros, la ligne de contexte et la
          // capsule de défi sortiraient TRONQUÉS (« J'AI P… », « PREN… ») dans
          // le sheet — exactement ce que §A.9 interdit, et une fausse promesse
          // en prime, puisque l'export ne ressemblerait pas à l'aperçu.
          // On monte donc la carte à SA largeur d'écran et on la RÉDUIT par
          // transform : la mise en page reste celle du média exporté, seule la
          // taille de rendu change.
          const full = PREVIEW_WIDTH[mini.ratio];
          const scale = MINI_PREVIEW_WIDTH / full;
          const height = full / SHARE_CARD_ASPECT[mini.ratio];
          return (
            <View
              style={[styles.miniPreview, { width: full * scale, height: height * scale }]}
              // Vignette DÉCORATIVE : l'aperçu qui compte est celui de l'écran,
              // et VoiceOver n'a rien à lire dans une carte réduite de moitié.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View style={{ transform: [{ scale }] }}>
                <ShareCard
                  {...mini.props}
                  ratio={mini.ratio}
                  width={full}
                  mascot={gripRank ? <GripMascot rank={gripRank} size={36} /> : undefined}
                />
              </View>
            </View>
          );
        }}
      />

      {/* STICKER PNG — monté HORS ÉCRAN (jamais visible, jamais tappable) : c'est
          la cible de `captureRef`, pas un élément d'interface. Son fond est
          transparent, ce qui est tout l'intérêt du PNG (planche E10). */}
      <View
        ref={stickerShotRef}
        collapsable={false}
        pointerEvents="none"
        style={styles.stickerOffscreen}
      >
        <StickerCard headline={stickerHead} metrics={stickerMetrics} verified={runCard.verified} />
      </View>

      <ShareToast opacity={toast.opacity} message={toast.message} />
    </View>
  );
}

/**
 * ÉTAT VIDE de /partage — aucune course armée. Trois situations, trois copies
 * DISTINCTES (jamais un écran blanc, jamais un « 0 » nu, jamais une carte
 * fabriquée en repli) :
 *   · `loading`      → la session se restaure : on n'affirme RIEN sur le joueur ;
 *   · `needsAccount` → pas connecté : on invite à se connecter ;
 *   · sinon          → connecté mais rien à montrer : on invite à l'action.
 * Un seul CTA chartreuse (§A), et jamais deux (le cas « chargement » n'en a
 * aucun : proposer une action serait déjà affirmer quelque chose).
 */
function ShareEmptyState({ loading, needsAccount }: { loading: boolean; needsAccount: boolean }) {
  const insets = useSafeAreaInsets();
  const t = useT();

  const body = loading
    ? t(SHARE_COPY.emptyLoading)
    : needsAccount
      ? t(SHARE_COPY.emptySignedOutBody)
      : t(SHARE_COPY.emptySignedInBody);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.content,
          styles.emptyContent,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(SHARE_COPY.emptyBackA11y)}
          onPress={() => goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, styles.emptyBack, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>{t(SHARE_COPY.emptyBack)}</Text>
        </Pressable>

        <View style={styles.emptyBody}>
          <Text style={styles.title}>{t(SHARE_COPY.emptyTitle)}</Text>
          <Text style={styles.emptyText}>{body}</Text>
        </View>

        {loading ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              needsAccount ? t(SHARE_COPY.emptySignedOutCta) : t(SHARE_COPY.emptySignedInCta)
            }
            onPress={() => {
              haptics.light();
              // `replace` : /partage n'a rien à garder dans la pile — et sur un
              // deep link il n'y a de toute façon aucun écran derrière.
              router.replace(needsAccount ? '/sign-in' : '/');
            }}
            style={({ pressed }) => [styles.cta, styles.emptyCta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaLabel}>
              {needsAccount ? t(SHARE_COPY.emptySignedOutCta) : t(SHARE_COPY.emptySignedInCta)}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Toast local (démo) : bandeau flottant, fondu + auto-dismiss (motion.toastDismissMs).
 * Piloté par un compteur pour re-jouer même si le message est identique. Aucune couleur hors
 * tokens. Volontairement minimal — les confirms de partage ne s'empilent pas.
 */
function useShareToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const show = (m: string) => {
    setMessage(m);
    setNonce((n) => n + 1);
  };

  useEffect(() => {
    if (nonce === 0) return;
    opacity.stopAnimation();
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.transitionMs,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.transitionMs,
        useNativeDriver: true,
      }).start();
    }, motion.toastDismissMs);
    return () => clearTimeout(t);
  }, [nonce, opacity]);

  return { opacity, message, show };
}

function ShareToast({ opacity, message }: { opacity: Animated.Value; message: string | null }) {
  if (message === null) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
      <Icon name="badge" size={16} color={colors.chartreuse} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

/**
 * Garde de compilation : le moteur narratif (features/share/narrative.ts) doit
 * rester SANS IMPORT pour être testable en Deno, il redéclare donc les ids de
 * style. Cette double affectation casse la compilation si les deux unions
 * divergent — un style ajouté d'un côté et pas de l'autre ne peut pas passer.
 */
type StyleIdsOnlyInEngine = Exclude<NarrativeStyleId, ShareTemplateId>;
type StyleIdsOnlyInTemplates = Exclude<ShareTemplateId, NarrativeStyleId>;
const _styleIdsAligned: [StyleIdsOnlyInEngine, StyleIdsOnlyInTemplates] extends [never, never]
  ? true
  : never = true;
void _styleIdsAligned;

function isTemplateId(v: string | undefined): v is ShareTemplateId {
  return (
    v === 'simple' ||
    v === 'conquete' ||
    v === 'defense' ||
    v === 'boucle' ||
    v === 'crew' ||
    v === 'classement' ||
    v === 'avantApres' ||
    v === 'carte3d'
  );
}

/**
 * Message narratif prêt à coller (doc §6.1 : « partager une conséquence, pas une
 * performance »). Court, une seule histoire. Le lien est ajouté par l'appelant.
 * Jamais de position rival ni de départ/arrivée (doc §8) : que le résultat.
 * `t` vient du composant (useT) — le message suit la langue courante.
 */
function buildShareHeadline(
  t: ReturnType<typeof useT>,
  intention: RunIntention | null,
  d: ShareDemoData,
  statsOnly: boolean,
  narrative: NarrativeId,
  /** Repli « distance seule », dans la discipline de la sortie (`resultCopy`). */
  headlineStats: Entry,
): string {
  if (statsOnly) return t(headlineStats, { km: d.distanceKm });
  /* LE SERVEUR N'A PAS ENCORE JUGÉ. Sans garde, le gabarit se lisait
     « I TOOK ZONE » — le mot ZONE passe pour un nom de lieu — sous un héros
     « +0 ZONES ». On annonçait une conquête vide sur une VRAIE course, et ça
     partait sur Instagram.
     La garde s'appuie désormais sur le MÊME moteur que l'image (`narrative`) au
     lieu d'une heuristique locale sur `zoneName`/`zonesGained` : quand le texte
     et l'image décidaient séparément, ils pouvaient se contredire — texte
     prudent, image conquérante. Un seul juge, une seule histoire. */
  if (narrative === 'effort') return t(headlineStats, { km: d.distanceKm });
  if (intention === 'defense') {
    return t(C.headlineDefense, { zone: d.zoneName, n: d.zonesDefended });
  }
  if (intention === 'conquest') {
    return t(C.headlineConquest, { zone: d.zoneName, n: d.zonesGained });
  }
  return t(C.headlineDefault, { n: d.zonesGained, zone: d.zoneName });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: 20 },
  pressed: { opacity: 0.6 },

  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  backChevron: { transform: [{ scaleX: -1 }] },
  backText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.4 },

  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // En-tête : le titre PREND la place, le badge garde la sienne à droite. Le
  // titre n'a AUCUN `numberOfLines` — il passe à la ligne plutôt que d'être
  // coupé (§A.9), et le badge ne se comprime jamais sous sa cible de 44 pt.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // « Pourquoi ce style ? » + « Personnaliser » sur une ligne (planche E10).
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  // « Pourquoi ce style ? » — explication, pas une action : ton discret.
  whyStyle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    flex: 1,
  },
  // Lien « Personnaliser » : action SECONDAIRE (blanc, pas de fond plein), avec
  // une cible tactile RÉELLE de 44 pt — pas un hitSlop qui simule.
  customizeLink: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  customizeLinkText: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  // Hors écran : présent dans l'arbre (donc capturable) mais jamais visible.
  stickerOffscreen: { position: 'absolute', left: -10_000, top: 0 },

  // ── État vide (aucune course armée) : une phrase, un CTA, beaucoup d'air ──
  emptyContent: { flex: 1 },
  emptyBack: { marginBottom: 0 },
  emptyBody: { flex: 1, justifyContent: 'center' },
  emptyText: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: 12,
  },
  emptyCta: { marginTop: 0 },
  // Explication du tracé manquant : sous l'aperçu, jamais dans l'image exportée.
  noRouteNote: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    textAlign: 'center',
    marginTop: 4,
  },

  // La preview flotte librement dans l'espace (pas de container autour).
  previewWrap: { alignItems: 'center', marginTop: 22, marginBottom: 26 },
  // Vignette du sheet : la carte à taille RÉELLE, réduite par transform (voir
  // `renderPreview`). Le cadre fait la taille réduite et centre la carte, dont
  // l'échelle se fait autour de son centre.
  miniPreview: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Carte SVG en « Carte seule » (vraie course) : centrée dans le slot 3:4 —
  // elle reste carrée (aspect du tracé conservé, jamais étirée).
  previewMapFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewMapSquare: { width: '100%' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.card,
    paddingVertical: 16,
    marginTop: 26,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 44,
    marginTop: 22,
  },

  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  toastText: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
