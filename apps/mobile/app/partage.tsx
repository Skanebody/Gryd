/**
 * GRYD — PARTAGE DE LA COURSE AFFICHÉE (AMENDEMENT-22 §7, UI en scènes) :
 *
 *   ← Résultat
 *   Partager ta conquête / ta défense / ta course   ← titre selon l'intention
 *      [ preview story qui FLOTTE — la story EST le container ]
 *      🔒 Protégé · Départ et arrivée masqués       ← badge PERMANENT (E10)
 *   Format  [ Story | Portrait | Carré | Carte seule ]  ← segmented (surface)
 *   Style   [ Auto | Carte | Conquête | Défense ]   ← rangée de modes narratifs
 *   Pourquoi ce style ? Tu as repris une zone…      ← la raison, MÊME moteur
 *   [ Partager en story ]                           ← UN SEUL gros CTA chartreuse
 *      ○ Sticker   ○ Rejouer   ○ Autre app          ← actions légères, zéro card
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, elevation, fontSizes, motion, radii, type Activity } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { goBack } from '../src/lib/nav';
import { useSession } from '../src/lib/session';
import { Icon } from '../src/ui/Icon';
import { IconAction, Segmented, ShareCard, type ShareCardRatio } from '../src/ui/game';
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
  SHARE_TEMPLATES,
  SHARE_TEMPLATES_BY_ID,
  type ShareDemoData,
  type ShareTemplateId,
  type ShareView,
} from '../src/features/share/templates';
import { applySharePrivacy } from '../src/features/share/sharePrivacy';
import { buildShareLink, defaultShareTarget } from '../src/features/share/shareDeepLink';
import {
  openShareSheet,
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
  icon: 'partage' | 'carte';
}[] = [
  // Libellés courts (les ratios 9:16/4:5/1:1 étaient décoratifs — « Story »
  // implique 9:16, « Portrait » 4:5, « Carré » 1:1). Entries i18n résolues au
  // rendu (t) — parité 5 langues forcée par le type. Strip défilant : aucun
  // libellé n'est jamais tronqué même à 4 options (§A.9).
  { id: 'story', label: C.formatStory, icon: 'partage' },
  // 4:5 — imposé par la planche E10 (9:16 · 4:5 · 1:1). L'aspect existait déjà
  // (SHARE_CARD_ASPECT.feed) et n'était simplement pas proposé.
  { id: 'feed', label: C.formatFeed, icon: 'partage' },
  { id: 'square', label: C.formatSquare, icon: 'carte' },
  { id: 'mapOnly', label: C.formatMapOnly, icon: 'carte' },
];

/**
 * Rangée de modes narratifs (planche E10 : « Auto · Impact · Photo · Avant/Après
 * · Plus »). AUTO est en tête : c'est le choix du MOTEUR, et c'est le défaut.
 *
 * « Photo » est délibérément ABSENT : `expo-image-picker` est bien installé,
 * mais `NSPhotoLibraryUsageDescription` (app.json) déclare EXPLICITEMENT au
 * système un usage « photo de profil » uniquement. Peindre un mode Photo sans
 * élargir cette chaîne serait un bouton incohérent avec la promesse faite à
 * l'utilisateur au moment de la permission — et app.json est hors périmètre.
 */
const STYLE_AUTO = 'auto' as const;
type StyleChoice = typeof STYLE_AUTO | ShareTemplateId;

/** Styles proposés d'emblée ; « Plus de styles » déplie les restants. */
const STYLE_MAIN: readonly ShareTemplateId[] = ['simple', 'conquete', 'defense'];
const STYLE_EXTRA: readonly ShareTemplateId[] = [
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
  /** Cible de l'export PNG (D6) : le conteneur EXACT de la ShareCard. */
  const cardShotRef = useRef<View | null>(null);
  /** Cible de l'export du STICKER PNG transparent (monté hors écran). */
  const stickerShotRef = useRef<View | null>(null);
  // « +3 styles » ouvre le choix complet (déplié aussi si on arrive sur un extra).
  const [stylesExpanded, setStylesExpanded] = useState<boolean>(
    isTemplateId(params.template) ? STYLE_EXTRA.includes(params.template) : false,
  );
  // Rejouer l'animation de la preview (doc §4.8 « Replay Conquête » — free =
  // replay animé in-app, honnête : la trace se redessine et la zone se remplit).
  // `fullReplay` : l'ENTRÉE de l'aperçu joue la partition comprimée (l'écran est
  // actionnable tout de suite) ; le bouton Rejouer joue les 7,5 s de la planche.
  const [replayKey, setReplayKey] = useState(0);
  const [fullReplay, setFullReplay] = useState(false);

  // MASQUAGE PRIVACY (doc §9) : par défaut on retire départ/arrivée du tracé
  // PARTAGÉ. La zone conquise reste entière (territoire public, pas la position).
  const { prefs } = usePrivacyPrefs();
  const maskEndpoints = prefs.maskEndpoints;
  const safeTrace = useMemo(
    () => (maskEndpoints ? applySharePrivacy(runCard.trace) : runCard.trace),
    [maskEndpoints, runCard.trace],
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
  const selected: ShareTemplateId = useMemo(() => {
    if (choice !== STYLE_AUTO && canRender(choice)) return choice;
    return canRender(autoStyle) ? autoStyle : 'simple';
  }, [choice, canRender, autoStyle]);
  const ratio: ShareCardRatio = !hasKnownRoute && ratioRaw === 'mapOnly' ? 'story' : ratioRaw;

  useEffect(() => {
    // Preview auto-générée (doc §12 : share_preview_generated). Émis ICI et pas
    // dans l'aiguilleur : sans course armée, aucune card n'est générée.
    track(EVENTS.shareCardGenerated, { template: selected });
  }, []);

  const template = useMemo(
    () => SHARE_TEMPLATES.find((t) => t.id === selected) ?? SHARE_TEMPLATES_BY_ID.conquete,
    [selected],
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

  // Le badge « Protégé · départ et arrivée masqués » n'est HONNÊTE que sur une
  // carte qui rend RÉELLEMENT la trace tronquée (les templates SVG animables,
  // hors « Carte seule »). La Carte 3D / mapOnly rend une boucle FERMÉE
  // (départ = arrivée) et ne peut pas refléter le masquage → pas de badge
  // menteur là-dessus. Cette garde EXISTAIT et reste intacte : le recalage rend
  // le badge PERMANENT (planche E10) sur tous les styles qui le méritent, il ne
  // l'étend pas à ceux qui ne le méritent pas.
  const traceShown = hasKnownRoute && ANIMATABLE_STYLES.includes(selected) && ratio !== 'mapOnly';

  const cardProps = useMemo(() => {
    // La card projette les VRAIES valeurs du run (runCard). `privacyNote` =
    // badge de confiance §9, seulement là où la trace tronquée est visible.
    const built = {
      ...template.build(runCard, view),
      privacyNote: traceShown ? privacyNote : undefined,
    };
    // « Carte seule » (AMENDEMENT-24) : la carte EN GRAND quel que soit le
    // style — si le template n'a pas déjà son propre fond carte (les 5 SVG),
    // on injecte une carte plein cadre. Le style choisi ne règle alors QUE le
    // KPI/la ligne (chrome minimale). Toujours la carte SVG du tracé réellement
    // couru : la 3D (`ShareMap3D`) est une géométrie de démo FIGÉE (République)
    // et n'a plus d'aperçu d'exemple où s'afficher. « Carte seule » n'est de
    // toute façon pas proposé quand le tracé est inconnu (voir `formatOptions`).
    if (ratio === 'mapOnly' && built.mapBackground === undefined) {
      return {
        ...built,
        mapBackground: (
          <View style={styles.previewMapFill}>
            <ShareMap
              style={styles.previewMapSquare}
              animated={view.animated}
              replayKey={view.replayKey}
              trace={view.trace ?? []}
              captured={view.captured}
              fullReplay={view.fullReplay}
            />
          </View>
        ),
      };
    }
    return built;
    // `t` (stable par langue) force la re-construction des cards à la bascule.
  }, [template, ratio, runCard, view, privacyNote, traceShown, t]);

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

  // ─── RANGÉE DE MODES NARRATIFS (planche E10) ───────────────────────────────
  // « Auto » en TÊTE (le choix du moteur, réversible), puis les styles qui
  // peuvent être TENUS par cette course (`canRender` : verdict + géométrie +
  // boucle). Un style qui affirmerait une conquête non jugée n'apparaît pas du
  // tout — plutôt une option en moins qu'une image qui ment.
  const styleOptions = useMemo(() => {
    const shown = stylesExpanded ? [...STYLE_MAIN, ...STYLE_EXTRA] : STYLE_MAIN;
    return [
      { id: STYLE_AUTO as StyleChoice, label: t(C.styleAuto) },
      ...shown
        .filter(canRender)
        .map((id) => ({ id: id as StyleChoice, label: t(STYLE_LABEL[id]) })),
    ];
  }, [stylesExpanded, canRender, t]);

  /**
   * Reste-t-il des styles à déplier ? Sans cette garde, « +3 styles » pouvait
   * n'ouvrir sur RIEN (tous les extras filtrés par le verdict) — un bouton qui
   * ne fait rien est un bouton mort (§A).
   */
  const hasHiddenStyles = useMemo(
    () => !stylesExpanded && STYLE_EXTRA.some(canRender),
    [stylesExpanded, canRender],
  );

  /**
   * Y a-t-il vraiment un CHOIX ? Quand un seul style est tenable (typiquement
   * « Carte », le repli honnête d'une course que le serveur n'a pas jugée), la
   * rangée n'offre que « Auto » et lui — deux boutons qui produisent la MÊME
   * image. C'est un contrôle sans conséquence, donc un contrôle mort (§A r.1) :
   * on le retire, et la phrase « Pourquoi ce style ? » reste pour dire POURQUOI
   * il n'y a rien à choisir. Un écran = une décision.
   */
  const styleChoiceMatters = useMemo(
    () => [...STYLE_MAIN, ...STYLE_EXTRA].filter(canRender).length >= 2,
    [canRender],
  );

  // Formats : « Carte seule » (la carte EN GRAND) n'a aucun sens — et serait un
  // cadre vide — quand le tracé de cette course est inconnu. On ne le propose pas.
  const formatOptions = useMemo(
    () =>
      FORMATS.filter((f) => f.id !== 'mapOnly' || hasKnownRoute).map((f) => ({
        id: f.id,
        label: t(f.label),
        icon: f.icon,
      })),
    [hasKnownRoute, t],
  );

  const pickStyle = (id: StyleChoice) => {
    setChoice(id);
    // On trace le style RÉELLEMENT rendu (« auto » n'est pas un template) :
    // l'analytics doit refléter l'image vue, pas l'étiquette du bouton.
    track(EVENTS.shareTemplateChanged, {
      template: id === STYLE_AUTO ? autoStyle : id,
    });
  };
  const expandStyles = () => {
    haptics.light();
    setStylesExpanded(true);
  };

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

        <Text style={styles.title}>{title}</Text>

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
        {/* ─── BADGE « PROTÉGÉ » PERMANENT (planche E10, non négociable) ───────
             Il n'apparaissait qu'en mode héros (`heroTitle && privacyNote`) :
             sur tous les autres styles la note était rendue DANS l'image, donc
             invisible au moment où le partageur en a besoin — juste avant de
             publier. Il vit maintenant au MÊME endroit pour tous les styles qui
             montrent réellement une trace tronquée (`traceShown`).
             Ce qu'il promet est borné à ce que le pipeline tient VRAIMENT :
             départ/arrivée masqués (SHARE_TRIM_M) et aucune heure exacte sur la
             card. L'exclusion des zones privées et la simplification de trace ne
             sont PAS implémentées — le badge ne les revendique donc pas. */}
        {traceShown && privacyNote ? (
          <View style={styles.privacyBadge}>
            <Icon name="verrou" size={12} color={colors.gris} />
            <Text style={styles.privacyCaption} numberOfLines={1} ellipsizeMode="clip">
              {t(C.protectedBadge)} · {privacyNote}
            </Text>
          </View>
        ) : null}
        {/* Tracé inconnu : la card le dit déjà à la place de la carte ; ici on
            explique POURQUOI, et que les chiffres, eux, sont bien ceux de cette
            course (état vide qui parle, jamais un carré nu). */}
        {!hasKnownRoute ? (
          <Text style={styles.noRouteNote}>{t(A.traceUnavailableNote)}</Text>
        ) : null}

        {/* Format — UN segmented (accent chartreuse). */}
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, styles.controlLabelSolo]}>{t(C.formatLabel)}</Text>
          <Segmented
            accessibilityLabel={t(C.formatA11y)}
            options={formatOptions}
            value={ratio}
            onChange={(id) => setRatio(id)}
            // surface (pas accent) : un seul focus chartreuse fort par scène est
            // la CTA « Partager » (§A). Un segment actif chartreuse plein ferait
            // un 2e bloc chartreuse concurrent.
            tone="surface"
            // 3 formats aux libellés complets (Story · Carré · Carte seule) →
            // strip défilant : AUCUN label n'est jamais tronqué (§7).
            scrollable
          />
        </View>

        {/* Style — rangée de MODES NARRATIFS, « Auto » en tête (planche E10).
            Masquée en social_run : une course sans capture n'a qu'un visuel
            honnête, la carte de stats — il n'y a rien à choisir. */}
        {!statsOnlyShare ? (
          <View style={styles.controlRow}>
            {styleChoiceMatters ? (
              <>
                <View style={styles.controlHead}>
                  <Text style={styles.controlLabel}>{t(C.styleLabel)}</Text>
                  {hasHiddenStyles ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(C.moreStylesA11y)}
                      onPress={expandStyles}
                      hitSlop={14}
                      style={({ pressed }) => [styles.moreLink, pressed && styles.pressed]}
                    >
                      <Text style={styles.moreLinkText}>{t(C.moreStyles)}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Segmented
                  accessibilityLabel={t(C.styleA11y)}
                  options={styleOptions}
                  value={choice}
                  onChange={pickStyle}
                  tone="surface"
                  // Toujours défilant : « Auto » ajoute un segment, et §A.9 interdit
                  // qu'un libellé soit tronqué à 375 px.
                  scrollable
                />
              </>
            ) : null}
            {/* « Pourquoi ce style ? » — la raison vient du MÊME moteur que le
                style Auto, donc elle ne peut pas décrire une autre histoire que
                celle de la card. Elle reste affichée quand l'utilisateur change
                de style (le RÉCIT, lui, n'a pas changé) ET quand il n'y a rien à
                choisir (elle dit alors pourquoi). */}
            <Text style={styles.whyStyle}>
              {t(C.whyThisStyle, { reason: t(narrativeReasons(A)[narrative]) })}
            </Text>
          </View>
        ) : null}

        {/* UN SEUL gros CTA chartreuse (suit le format, verbe précis). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryCta.label}
          onPress={() =>
            runAction(
              shareAsImage(cardShotRef.current, shareMessage),
              (via) => (via === 'image' ? t(C.storyExported) : t(C.storyReady)),
              primaryCta.channel,
              (via) => {
                // P1 D6 — share_exported = une IMAGE a réellement été produite
                // (≠ share_card_generated, la preview React ; ≠ share_completed,
                // qui compte aussi le filet texte).
                if (via === 'image')
                  track(EVENTS.shareExported, {
                    ratio,
                    channel: primaryCta.channel,
                  });
              },
            )
          }
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.ctaLabel}>{primaryCta.label}</Text>
        </Pressable>

        {/* Actions LÉGÈRES (doc §7.2 : Sticker · Rejouer · Plus), zéro grosse card. */}
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
          <IconAction
            icon="partage"
            label={t(C.otherApp)}
            accessibilityLabel={t(C.otherAppA11y)}
            onPress={() => runAction(openShareSheet(shareMessage), t(C.storyReady), 'native')}
          />
        </View>
      </ScrollView>

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
  // Badge « Protégé » : une ligne discrète sous l'aperçu, jamais une card (§A).
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  privacyCaption: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    flexShrink: 1,
  },
  // « Pourquoi ce style ? » — explication, pas une action : ton discret.
  whyStyle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 10,
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
  // Carte 3D injectée en « Carte seule » : remplit le slot plein cadre.
  previewMap: { flex: 1 },
  // Carte SVG en « Carte seule » (vraie course) : centrée dans le slot 3:4 —
  // elle reste carrée (aspect du tracé conservé, jamais étirée).
  previewMapFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewMapSquare: { width: '100%' },

  // Un bloc « label + segmented » séparé du suivant par l'ESPACE, pas par une boîte.
  controlRow: { marginTop: 18 },
  controlHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  // Le label du bloc Style vit DANS controlHead (déjà espacé) → pas de marge propre.
  controlLabel: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Le label Format est un enfant direct de controlRow → il porte son propre espace.
  controlLabelSolo: { marginBottom: 10 },
  moreLink: { paddingVertical: 2 },
  moreLinkText: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },

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
