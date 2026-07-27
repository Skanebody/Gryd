/**
 * GRYD — RÉSULTAT DE COURSE — recalé sur la planche E09 (25/07/2026).
 *
 * ─── L'ORDRE EST IMMUABLE : TERRITOIRE → PROGRESSION → STATISTIQUES → PARTAGE ─
 * « L'impact territorial AVANT les métriques sportives. » C'est la règle
 * cardinale de la planche, et l'écran ne la tenait pas : le bloc de stats vivait
 * DANS l'accordéon « détails », donc APRÈS le CTA de partage, pendant qu'aucune
 * progression (XP, contribution crew) n'était affichée nulle part alors que les
 * deux sources existent côté serveur.
 *
 *   1. TERRITOIRE   hero carte 44 % + bascule « Avant ⇄ Après » (caméra et zoom
 *                   STRICTEMENT identiques — une seule bbox partagée) · titre ·
 *                   pill GRYD VERIFIED · KPI géant (le gain) · le POURQUOI
 *   2. PROGRESSION  +N XP · contribution crew (nom RÉEL) · la série
 *   3. STATISTIQUES un SEUL bloc à séparateurs (distance | temps | allure)
 *   4. PARTAGE      PARTAGER (primaire) · Défier un rival (secondaire) ·
 *                   Terminer (tertiaire) · puis le technique AU TAP
 *
 * Séquence narrative < 1,8 s, SKIPPABLE au tap (features/run/revealSequence.ts,
 * pure + testée). Reduce motion ⇒ état final direct : aucune information n'est
 * jamais portée par la seule animation.
 *
 * ─── VARIANTE SANS CAPTURE (planche, capitale) ──────────────────────────────
 * L'écran célébrait « TERRITOIRE ÉTENDU · +0 ZONES CAPTURÉES » dès que le
 * serveur jugeait une course à zéro zone : l'objet `zones` était TRUTHY, donc
 * toutes les branches de conquête s'allumaient sur un total nul. C'est
 * exactement le « 0 nu » que la loi du projet interdit, avec en prime un ton de
 * victoire sur un non-événement. Quand le récit dominant est `effort` (moteur
 * partagé avec /partage), le hero bascule sur l'EFFORT : KPI en KM MESURÉS,
 * raison FACTUELLE (mètres manquants + échéance réelle de la frontière), et
 * « l'effort compte, même sans capture » adossé à l'XP réellement créditée.
 * Jamais un hero territorial vide, jamais un ton d'échec.
 *
 * ─── ZÉRO SIMULATION (21/07/2026) ──────────────────────────────────────────
 * Cet écran ne construit PLUS aucune course de démonstration. Il n'affiche que
 * ce que deux sources réelles lui donnent :
 *   1. `getLastRunResult()` — le verdict d'ingest_run (SEUL juge des zones,
 *      points, boucle, badges, série, verified) ;
 *   2. les params `dist`/`dur` — les mètres et secondes MESURÉS par le tracker
 *      GPS, quand la course n'a pas encore pu être jugée (hors-ligne).
 * Ce que ni l'un ni l'autre ne dit n'existe pas ici : `stats.zones` vaut `null`
 * tant que le serveur n'a pas jugé, et tout ce qui parle de conquête (KPI,
 * IMPACT, décomposition du calcul) disparaît alors — plutôt un bloc absent
 * qu'un « 0 » qui se lit comme un verdict.
 *
 * ─── LES SIX RÉSULTATS (spec produit §D, E29 → E34 — 27/07/2026) ────────────
 * La spec décrit SIX écrans, pas un seul avec des variantes cosmétiques :
 *   E29 conquête · E30 reprise · E31 défense · E32 sortie libre ·
 *   E33 contribution crew · E34 partiellement valide.
 * Cet écran en servait deux, et encore : « ZONE DÉFENDUE » se déclenchait sur
 * l'INTENTION déclarée AVANT le départ (`intention === 'defense'`), pas sur ce
 * que le serveur avait jugé. Un joueur parti « défendre » qui capturait du
 * neutre lisait « ZONE DÉFENDUE » ; un joueur parti « conquérir » qui n'avait
 * fait que tenir ses zones lisait « TERRITOIRE ÉTENDU ». L'écran racontait une
 * INTENTION là où il devait rapporter un VERDICT.
 *
 * La variante se décide désormais dans `features/run/resultVariant.ts` — PUR,
 * testé, et bâti SUR l'ordre de dominance du moteur narratif partagé (une seule
 * vérité pour le Résultat et le Partage). Deux arbitrages y sont inscrits :
 *   · une frontière crew REFERMÉE (`boundaryCompleted`) passe DEVANT la
 *     conquête — la zone n'est pas l'œuvre d'une seule sortie (spec E33) ;
 *   · les récits `boucle`/`crew`/`classement`/`record` À ZÉRO ZONE tombent en
 *     E32. Ils allumaient jusqu'ici la branche de conquête et produisaient un
 *     « 0 ZONES CAPTURÉES » de 64 px sous un titre de victoire.
 *
 * CE QUI DEVIENT VRAI ICI, ET D'OÙ ÇA VIENT :
 *   · la SURFACE (E29/E30/E31) vient de `territories.area_m2` (lot 1), LUE
 *     dans la base pour cette course — jamais convertie depuis des hexagones ;
 *   · l'ÉCHÉANCE ÉVITÉE et le NIVEAU DE PROTECTION (E31) viennent de la
 *     contestation que cette sortie a refermée (`territory_contests`, lot 3) ;
 *   · le LIEN D'APPEL (E34) n'est peint que si une revue anti-triche existe
 *     RÉELLEMENT — sinon `/appel` répondrait « aucune vérification », donc
 *     bouton mort.
 * CE QUI RESTE ABSENT, ET POURQUOI : la VARIATION DE RANG (aucune lecture de
 * classement n'alimente cet écran) et l'ANCIEN PROPRIÉTAIRE d'une zone reprise
 * (`territories` ne garde pas d'historique de propriété, et §12 réserve
 * l'identité de l'assaillant aux deux parties). Absents, pas à zéro.
 *
 * ─── L'ÉCRAN NOMME LA DISCIPLINE (E14, vélo réel — 26/07/2026) ──────────────
 * Le préflight montre au joueur, pendant le décompte, la discipline qu'il
 * s'apprête à enregistrer, et la lui laisse corriger d'un tap. L'écran de fin
 * ne la lisait NULLE PART : il servait le vocabulaire de la course à pied à un
 * cycliste, c'est-à-dire qu'il DÉMENTAIT le préflight au moment précis où le
 * joueur regarde son résultat. Elle arrive désormais par l'URL (même nom de
 * paramètre que le départ) et tout ce qui NOMME l'effort passe par
 * `resultCopy(activity)` — porte d'entrée unique, exhaustive par discipline.
 *
 * CE QUI N'EST PAS DUPLIQUÉ, ET POURQUOI : « ZONE DÉFENDUE », « TERRITOIRE
 * ÉTENDU », les KPI, les CTA et le bloc de statistiques sont déjà VRAIS dans
 * les deux mondes. Les décliner créerait deux vérités à maintenir, donc une
 * divergence à venir. Le schéma « la boucle fait la zone » et les paliers
 * `verify` ne portent pas non plus de seuil disciplinaire (les tiers de
 * confiance sont globaux) : rien à décliner là non plus.
 *
 * LA 3ᵉ STATISTIQUE CHANGE DE GRANDEUR (26/07/2026). Elle restait une ALLURE
 * (min/km) pour tout le monde. Ce n'était pas faux à vélo — c'est bien
 * l'allure — mais aucun cycliste ne lit son effort ainsi : il lit une VITESSE.
 * Elle passe donc par `effortRate()` (moteur PUR, testé), qui rend la grandeur
 * de LA discipline. Le chiffre du cycliste est une conversion exacte de celui
 * du coureur (3600 / allure) : une seule mesure, donc aucune divergence
 * possible entre les deux mondes. Et une allure absente ou nulle fait
 * DISPARAÎTRE la case au lieu d'afficher « 0'00/km » — le « 0 » nu que la loi
 * du projet interdit, et qui s'affichait bel et bien jusqu'ici.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fonts,
  fontSizes,
  gameColors,
  iconSizes,
  motion,
  radii,
  // Plancher tactile du projet : il était RECOPIÉ en 44 dans trois styles de cet
  // écran. §A demande le token — un nombre recopié ne suit pas la charte quand
  // elle bouge, et rien ne le relie au gabarit qu'il prétend garantir.
  sizes,
  spacing,
  type Activity,
  type IngestRunResponse,
  type RejectReason,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { C, resultCopy } from '../src/i18n/catalog/result';
// La discipline arrive par l'URL, et son PARSING appartient au domaine du
// départ : on l'importe au lieu de réécrire un `includes(ACTIVITIES)` local, qui
// finirait par diverger en silence de ce que le préflight a montré au joueur.
import {
  START_ACTIVITY_PARAM,
  parseStartActivity,
} from '../src/features/run/gps/runActivity';
import { useT } from '../src/i18n/store';
import { Icon } from '../src/ui/Icon';
import { decimalSeparator, formatInt } from '../src/ui/format';
// La GRANDEUR de la 3ᵉ statistique dépend de la discipline (allure / vitesse) :
// moteur pur, testé, y compris ses cas dégénérés (jamais un « 0 » nu).
import { effortRate, formatSpeedKmh } from '../src/features/run/effortRate';
import {
  BadgeCard,
  StatePill,
  StreakBlock,
  type StreakView,
  useCountUp,
  useReduceMotion,
} from '../src/ui/game';
import {
  BADGE_FAMILIES,
  badgeById,
  badgeColor,
} from '../src/features/badges/catalog';
import { GripMascot } from '../src/features/social/GripMascot';
import { gripRankForLevel, playerLevelForXp } from '../src/features/crew/rules';
import { useMyEconomy } from '../src/features/social/economy';
import { ResultReveal } from '../src/features/run/ResultReveal';
import { ResultHeroMap, type HeroCells } from '../src/features/run/ResultTrace';
import { getFinishedTrace } from '../src/features/run/finishedTrace';
import { pioneerCelebration } from '../src/features/run/pioneerCelebration';
import { rivalChallengeFromResult } from '../src/features/run/rivalChallenge';
import {
  REVEAL_LAST_STEP,
  revealDelaysMs,
  revealReached,
  type RevealStep,
} from '../src/features/run/revealSequence';
import { RendezvousOptIn } from '../src/features/notifications/RendezvousOptIn';
import { useLocalStreak } from '../src/features/social/useLocalStreak';
import { intentionFromParam, summaryHeader } from '../src/features/run/intention';
import { getLastRunResult } from '../src/features/run/runResult';
import { boundaryClock } from '../src/features/run/openBoundaryClock';
import { useRealCrew } from '../src/features/crew/real';
import { setShareRun, shareCardFromResult } from '../src/features/share/shareRun';
import { applySharePrivacy } from '../src/features/share/sharePrivacy';
import {
  UNJUDGED_VERDICT,
  dominantNarrative,
  type NarrativeVerdict,
} from '../src/features/share/narrative';
// LES SIX RÉSULTATS (spec §D, E29→E34) — le choix de la variante et le filtrage
// des données manquantes vivent dans un moteur PUR et testé : cet écran ne fait
// que rendre ce qu'on lui autorise à rendre.
import {
  composeResult,
  formatArea,
  myBoundaryShare,
  type DominantNarrative,
  type ResultFacts,
} from '../src/features/run/resultVariant';
// La SURFACE vient de `territories.area_m2` (lot 1) et l'échéance évitée de
// `territory_contests` (lot 3) : deux lectures réelles, jamais un calcul client.
import { useResultTerritory } from '../src/features/run/useResultTerritory';
// NOTE (21/07/2026) : `buildRunSimulation` / `buildLiveNav` / `buildRunLoop` ne
// sont PLUS importés ici. Seuls les formateurs purs et le parsing de mode
// survivent de simulation.ts — aucune course fabriquée n'entre dans cet écran.
import {
  formatClock,
  formatKm,
  formatPace,
  runModeFromParam,
} from '../src/features/run/simulation';
// AMENDEMENT-23 §B.4 — explicabilité post-run : schéma « la boucle fait la zone »
// (réutilisé, DÉMO surchargée par les vrais totaux du run) + verify en libellé
// dérivé des constantes gelées (jamais de nombre magique).
import { BoucleFaitLaZone } from '../src/features/explain/schemas';
import { verifyTiersLabel } from '../src/features/explain/labels';

// ─── `StepId` + `STEPS_BY_MODE` SUPPRIMÉS (25/07/2026) ──────────────────────
// Deux constantes MORTES : zéro lecture dans tout le fichier. Elles décrivaient
// une séquence de révélation retirée depuis longtemps — l'écran se montait d'un
// bloc tout en gardant la carcasse d'un séquenceur, ce qui laissait croire au
// lecteur que la planche était tenue. La vraie séquence (< 1,8 s, skippable)
// vit désormais dans `features/run/revealSequence.ts`, pure et testée.

// ─── AUCUNE GÉOMÉTRIE FABRIQUÉE (21/07/2026) ────────────────────────────────
// Ici vivaient les mini-cartes AVANT/APRÈS du secteur et de la boucle. Elles
// dessinaient la boucle de la place de la République et le ruban de la rue du
// Faubourg-du-Temple — géométries d'AUTHORING, identiques pour tout le monde —
// au-dessus du titre « ANALYSE · LA BOUCLE FAIT LA ZONE ». Comme cet écran ne
// s'ouvre plus que sur une VRAIE course, un coureur lillois voyait donc l'
// analyse de SA boucle tracée à Paris, sous son nom. Même faute que le
// route-planner qui recentrait sur République.
//
// Le tracé réel de la course n'est PAS disponible dans cet écran : il vit dans
// le RunTracker (features/run/gps/tracker.ts, `smoothTrace(cleanTrace(fixes))`)
// et meurt à la fin de la course — `RealCourseLive.finish()` ne transmet que
// `dist` et `dur`, et `IngestRunResponse` ne renvoie aucune trace. Le rebrancher
// demande un store de trace (comme route/plannedRoute.ts) armé par useRealRun :
// un chantier qui sort de ce lot. En attendant, le bloc est RETIRÉ — un bloc
// absent vaut infiniment mieux qu'un bloc qui dessine Paris sous les pieds d'un
// Lillois. Voir le rapport de lot pour le câblage restant.

/** Param numérique optionnel (dist/dur réels) — null si absent/invalide. */
function numParam(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const n = raw !== undefined ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Verdict de CONQUÊTE de la course — n'existe QUE si ingest_run a jugé. Il n'y
 * a délibérément pas de valeur par défaut : sans verdict, l'objet est `null` et
 * tout ce qui parle de zones disparaît de l'écran. Un `0` par défaut se serait
 * lu « ta course n'a rien pris », ce que personne n'a mesuré.
 */
interface ZonesVerdict {
  /** Zones capturées (claimed + stolen + pioneer) — décidé serveur. */
  total: number;
  /** Zones intérieures, DÉJÀ comptées dans `total` (« dont N »). */
  enclosed: number;
  loopClosed: boolean;
  pointsAwarded: number;
}

/**
 * Ce que l'écran sait VRAIMENT de la course. Aucun socle de simulation : chaque
 * champ vient du serveur (seul juge) ou des mesures du tracker GPS.
 */
interface ResultView {
  /** Mètres MESURÉS (serveur, sinon tracker). */
  distanceM: number;
  /** Secondes MESURÉES (serveur, sinon tracker). */
  durationS: number;
  paceSPerKm: number;
  /** Affirmation du SERVEUR — jamais un défaut de rendu. */
  verified: boolean;
  /** Nom de zone neutre : aucun secteur réel n'est câblé (jamais un faux nom). */
  zoneName: string;
  /** `null` = le serveur n'a pas (encore) jugé la conquête. */
  zones: ZonesVerdict | null;
  /** §11 — le SERVEUR a REFUSÉ la capture (status 'rejected'), à dire honnêtement. */
  rejected: boolean;
  /** §11 — GRYD Verify a SIGNALÉ la course (status 'flagged', trust trop bas) :
   * elle non plus n'a rien crédité (0 hex, 0 stat) — jamais « territoire étendu ». */
  flagged: boolean;
  /** Raison précise du refus (mappée en copy via REJECT_REASON_COPY), sinon null. */
  rejectReason: RejectReason | null;
}

// `BoundaryState` SUPPRIMÉ (25/07/2026) : type mort depuis le retrait des deux
// écrans de frontière crew (21/07/2026). Aucun `open`/`completed` n'est plus
// lu nulle part — la frontière ouverte s'affiche désormais comme une RAISON
// factuelle dans le hero d'effort, à partir du seul `openBoundary` du serveur.

function NoResultScreen({ activity }: { activity: Activity }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  /** Libellés de LA discipline (catalogue `result`, indexé par `Activity`). */
  const A = resultCopy(activity);

  useEffect(() => {
    screen('course_result_empty');
  }, []);

  const back = () => {
    haptics.light();
    router.replace('/(tabs)');
  };

  return (
    <View
      style={[
        styles.noResultRoot,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.noResultBlock}>
        <Icon name="historique" size={28} color={colors.gris} />
        <Text style={styles.noResultTitle}>{t(A.noResultTitle)}</Text>
        <Text style={styles.noResultBody}>{t(A.noResultBody)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.noResultCta)}
        onPress={back}
        style={({ pressed }) => [styles.noResultCta, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.noResultCtaLabel}>{t(C.noResultCta)}</Text>
      </Pressable>
    </View>
  );
}

export default function CourseResultScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    queued?: string;
    /** P0 C1 — distance (m) et durée (s) RÉELLES mesurées par le tracker (chemin GPS). */
    dist?: string;
    dur?: string;
    intention?: string;
    /** AMENDEMENT-17 §CH2 — id de la frontière crew rejouée (démo). */
    boundary?: string;
    /** AMENDEMENT-17 §CH2 — `open` (fermable) ou `completed` (boucle crew fermée). */
    boundary_state?: string;
    /**
     * DISCIPLINE DE LA SORTIE (E14, vélo réel 26/07/2026) — même nom de
     * paramètre que le DÉPART (`START_ACTIVITY_PARAM`), et ce n'est pas un
     * hasard : ce que le préflight a montré au joueur avant le premier mètre
     * doit être ce que le Résultat lui redit à l'arrivée. Un écran de fin qui
     * dit « course » après une sortie déclarée vélo dément le préflight.
     *
     * IL EST ÉMIS DEPUIS LE 26/07/2026, et par une fonction PURE :
     * `features/run/gps/resultHandoff.ts` construit les paramètres de cet écran
     * à partir de la sortie terminée, et son test prouve que la discipline
     * survit à l'aller-retour sérialisation → `parseStartActivity`. Auparavant
     * `RealCourseLive.finish()` composait cet objet à la main SANS la
     * discipline : l'écran retombait alors sur le défaut du jeu (`run`) et
     * disait « COURSE TERMINÉE » à la fin de chaque sortie vélo — les vingt
     * libellés vélo du catalogue existaient déjà, ils étaient simplement
     * inatteignables. Une clé oubliée dans un objet littéral n'est vérifiable
     * par rien : c'est pour ça que le relais est devenu du code testé.
     *
     * La lecture reste DÉFENSIVE : un lien direct sans paramètre continue de
     * rendre exactement le comportement d'avant le vélo.
     */
    activity?: string;
  }>();
  // NOTE (21/07/2026) : `t`, `route` et `planned` ne sont plus lus. Ils
  // pilotaient la simulation (tick rejoué, itinéraire démo, parcours planifié)
  // qui n'entre plus dans cet écran. RealCourseLive continue de passer `t` —
  // c'est sans effet, et volontairement : aucun paramètre d'URL ne doit pouvoir
  // (re)fabriquer un résultat.

  // ─── FUITE COLMATÉE (21/07/2026) : plus de résultat sans course ────────────
  // Cet écran retombait sur `demoStats` (scénario République : +47 zones, badge
  // « Route Opened III », bonus Finisher) dès que ni ingest_run ni le tracker
  // n'avaient parlé. Ouvert par un lien, un retour arrière ou une course non
  // mesurée, il célébrait donc une conquête qui n'a jamais eu lieu — au nom du
  // coureur. Le vrai produit ne fabrique pas un résultat : il dit qu'il n'en a
  // pas. Plus aucune exception, sur aucune plateforme.
  const hasRealRun = getLastRunResult() !== null || numParam(params.dist) !== null;
  // Lecture DÉFENSIVE, par la fonction du domaine du départ : un paramètre
  // répété ou inconnu retombe sur la discipline déclarée par défaut du jeu,
  // jamais sur un blocage — un joueur qui vient de finir doit voir son écran.
  const activity = parseStartActivity(params.activity);
  if (!hasRealRun) return <NoResultScreen activity={activity} />;

  // AMENDEMENT-17 §CH2 — la frontière crew court-circuite la séquence dopamine :
  // un seul écran = une seule action (ouvrir/terminer). Piloté par `boundary` +
  // `boundary_state` (démo) — en prod ces états viennent d'IngestRunResponse
  // (openBoundary / boundaryCompleted). Le serveur reste seul décideur.
  // FRONTIÈRE CREW RETIRÉE (21/07/2026). Ces deux écrans étaient pilotés par les
  // paramètres d'URL `boundary` + `boundary_state` et lisaient une frontière
  // FABRIQUÉE (« République », ouverte par « KORO », contributions Benjamin 79 %
  // / Lena 21 %, 420 points crew). Aucune réponse serveur ne produit ces états :
  // `IngestRunResponse` ne porte NI `openBoundary` NI `boundaryCompleted`. Un
  // joueur atteignant l'URL se voyait donc proposer de refermer la frontière
  // d'un coéquipier qui n'existe pas. Ils reviendront le jour où le serveur les
  // décide vraiment — le client n'invente pas un état de jeu.
  return <ConquestResultScreen params={params} activity={activity} />;
}

function ConquestResultScreen({
  params,
  activity,
}: {
  params: {
    mode?: string;
    queued?: string;
    /** P0 C1 — distance (m) / durée (s) RÉELLES du tracker (chemin GPS). */
    dist?: string;
    dur?: string;
    intention?: string;
  };
  /** Discipline DÉCLARÉE de la sortie — décidée en amont, jamais devinée ici. */
  activity: Activity;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  /**
   * LES MOTS DE CETTE DISCIPLINE — porte d'entrée UNIQUE (catalogue `result`),
   * pas un `activity === 'bike' ? … : …` répété quinze fois : le `Record` est
   * exhaustif, donc une troisième discipline ne pourra pas sortir en silence
   * avec le vocabulaire du coureur.
   *
   * `C` reste utilisé pour tout ce qui est DÉJÀ vrai dans les deux mondes
   * (« ZONE DÉFENDUE », KPI, CTA, stats) : le dupliquer créerait deux vérités
   * à maintenir, donc une divergence à venir.
   */
  const A = resultCopy(activity);
  // ─── LE RANG AFFICHÉ ÉTAIT CELUI D'UN AUTRE (21/07/2026) ──────────────────
  // `gripRankForLevel(playerLevelForXp(MY_SOCIAL_PROFILE.xp))` : l'XP du persona
  // de démo KORO (4 210 → niveau 12 → « Éclaireur »), sans aucune garde, rendu à
  // l'intérieur du ResultReveal héros — donc AUSSI sur la branche vraie course.
  // Un joueur qui finissait sa toute PREMIÈRE course voyait la mascotte au rang
  // Éclaireur au moment dopamine, pendant que l'onglet Profil lui affichait
  // « Rookie » calculé sur son XP réelle : deux rangs contradictoires pour le
  // même joueur, au même instant.
  // Même source que le Profil désormais (useMyEconomy → users.xp). Sans session,
  // lecture vide ou lecture en échec : 0 XP → niveau 1 → `rookie`, le rang de
  // départ, qui est vrai.
  const economy = useMyEconomy();
  const gripRank = gripRankForLevel(playerLevelForXp(economy.xp));
  const mode = runModeFromParam(params.mode);
  // Intention (AMENDEMENT-16 §1) : teinte la SYNTHÈSE multi-résultats + la copy
  // §28 (Conquête/Défense/Run libre) — jamais l'attribution (le serveur décide).
  const intention = intentionFromParam(params.intention);
  // ─── SOURCES RÉELLES UNIQUEMENT (21/07/2026) ──────────────────────────────
  // Ici vivaient `buildRunSimulation` → `buildLiveNav` → `buildRunLoop` →
  // `resultStats`. Cette chaîne produisait la course de démonstration ancrée
  // place de la République (NAV_DEFAULT_ANCHOR = ROUTES_DEMO[0].line[0]) et
  // servait de SOCLE à `stats` : le `...demoStats` répandait, sur une vraie
  // course, tout ce que les branches réelles n'écrasaient pas — le tracé de la
  // boucle, mais aussi les scores GPS/mouvement, le rang de crew, et jusqu'aux
  // identités KORO / LES FOULÉES 9³. Plus de socle : chaque champ est construit,
  // et ce qui n'a pas de source RESTE ABSENT.
  const serverResult = getLastRunResult();
  // Le VRAI tracé mesuré de CETTE course (armé par useRealRun à finish, purgé au
  // départ de la suivante). Figé au montage : il ne change pas pendant l'écran.
  // Vue LOCALE du coureur → tracé complet ici ; tout partage SORTANT le re-trime
  // via applySharePrivacy (départ/arrivée = domicile). Vide → rien ne se dessine.
  const [finishedTrace] = useState(getFinishedTrace);
  // Crew réel 3/3 : roster RÉEL (hook silencieux — vide sans session/crew).
  // Compte des coéquipiers (moi exclu) pour la ligne de conséquence collective,
  // et NOM réel du crew pour la ligne de contribution de la PROGRESSION (E09).
  // `crew` peut être null (sans session, sans crew, ou lecture impossible) :
  // dans ce cas la ligne disparaît — jamais un nom de crew de remplissage.
  const { members: crewMembers, crew } = useRealCrew();
  // Série LOCALE (filet hors-ligne / pré-O1) : n'est utilisée que si le serveur
  // n'a rendu AUCUN verdict — sinon la série serveur (autorité) prime.
  const localStreak = useLocalStreak();
  const crewTeammates = crewMembers.filter((m) => !m.isMe).length;
  const realDistM = numParam(params.dist);
  const realDurS = numParam(params.dur);
  const stats: ResultView = useMemo(() => {
    // 1. Le serveur a jugé : il est SEUL juge, tout vient de lui.
    if (serverResult) {
      return {
        distanceM: serverResult.distanceM,
        durationS: serverResult.durationS,
        paceSPerKm: serverResult.avgPaceSKm,
        verified: serverResult.status === 'valid' || serverResult.status === 'partial',
        // Aucun secteur réel câblé : « Zone », jamais un faux nom (charte).
        zoneName: t(C.zoneFallback),
        zones: {
          total:
            serverResult.hexes.claimed + serverResult.hexes.stolen + serverResult.hexes.pioneer,
          enclosed: serverResult.enclosedZones ?? 0,
          loopClosed: serverResult.loopClosed === true,
          pointsAwarded: serverResult.pointsAwarded,
        },
        rejected: serverResult.status === 'rejected',
        flagged: serverResult.status === 'flagged',
        rejectReason: serverResult.rejectReason ?? null,
      };
    }
    // 2. Mesuré par le tracker, PAS ENCORE jugé (hors-ligne, payload en file) :
    //    les mètres et les secondes sont vrais, la conquête est INCONNUE.
    //    `zones: null` — surtout pas 0, que le joueur lirait « tu n'as rien pris ».
    const distanceM = realDistM ?? 0;
    return {
      distanceM,
      durationS: realDurS ?? 0,
      paceSPerKm: distanceM > 0 && realDurS ? realDurS / (distanceM / 1000) : 0,
      verified: false,
      zoneName: t(C.zoneFallback),
      zones: null,
      // Pas de verdict serveur → ni refus ni signalement ni raison (le rejet 4xx
      // structurel, lui, n'arme même pas de résultat : chantier séparé). Jamais
      // un refus inventé.
      rejected: false,
      flagged: false,
      rejectReason: null,
    };
    // `t` (stable par langue) : le nom de zone neutre suit la bascule de langue.
  }, [serverResult, realDistM, realDurS, t]);
  /** Raccourci de lecture — `null` tant que le serveur n'a pas jugé. */
  const zones = stats.zones;
  /**
   * LA 3ᵉ STATISTIQUE, DANS LA GRANDEUR DE SA DISCIPLINE (moteur pur, testé).
   * Allure (min/km) à pied · VITESSE (km/h) à vélo — le chiffre du cycliste
   * est une conversion EXACTE de l'allure mesurée, pas un second calcul depuis
   * distance/durée qui finirait par diverger. `null` = rien de mesurable : la
   * case disparaît, plutôt qu'un « 0'00/km » qui se lirait comme une mesure.
   */
  const rate = effortRate(activity, stats.paceSPerKm);

  const conquest = mode === 'conquete';
  const isPrivate = mode === 'course_privee';
  // §11 — le serveur n'a PAS crédité la course : REFUSÉE (gameplay invalide) OU
  // SIGNALÉE (GRYD Verify, trust trop bas). Dans les deux cas 0 hex + 0 stat →
  // toute affirmation de conquête de l'écran s'éteint là-dessus (jamais
  // « territoire étendu / +0 zones » sur une course non créditée).
  const notCredited = stats.rejected || stats.flagged;
  // Raison de refus résolue DÉFENSIVEMENT : le serveur se déploie indépendamment
  // du binaire — s'il émet une raison inconnue de cette version (skew), on
  // n'affiche rien plutôt que de crasher tout l'écran (index → undefined).
  const rejectCopy = stats.rejectReason ? A.rejectReason[stats.rejectReason] : undefined;

  // ─── LE VERDICT, PUIS LE RÉCIT (moteur partagé avec /partage) ──────────────
  // Ce que le SERVEUR a jugé, mis en forme pour le moteur pur `narrative.ts`.
  // Les deux écrans lisent le MÊME verdict et appellent la MÊME fonction : il
  // devient impossible que le Résultat célèbre une conquête pendant que le
  // Partage raconte autre chose (ou l'inverse — c'était le cas).
  const verdict: NarrativeVerdict = useMemo(() => {
    if (!serverResult) return UNJUDGED_VERDICT;
    return {
      judged: true,
      credited: !(serverResult.status === 'rejected' || serverResult.status === 'flagged'),
      // `claimed` = neutre ; `pioneer` est un sous-ensemble déjà compté dans
      // claimed/stolen côté serveur — on ne l'additionne pas (double compte).
      zonesClaimed: serverResult.hexes.claimed,
      zonesStolen: serverResult.hexes.stolen,
      zonesDefended: serverResult.hexes.defended,
      loopClosed: serverResult.loopClosed === true,
      enclosedZones: serverResult.enclosedZones ?? 0,
      crewXp: serverResult.crewXp ?? 0,
      // Aucune lecture de `season_scores` n'alimente cet écran : le rang n'est
      // pas connu, et un rang inconnu ne s'invente pas (planche : la ligne
      // « Rang local » de la maquette reste donc ABSENTE, pas vide).
      rankKnown: false,
      // Aucun record personnel n'est mesuré jusqu'ici.
      personalRecord: false,
    };
  }, [serverResult]);
  const narrative = dominantNarrative(verdict);

  // ─── LES SIX RÉSULTATS (spec §D, E29 → E34) ────────────────────────────────
  // L'écran n'en servait que deux, et « ZONE DÉFENDUE » se déclenchait sur
  // l'INTENTION déclarée AVANT le départ : un joueur parti « défendre » qui
  // capturait du neutre lisait « ZONE DÉFENDUE ». La variante se décide
  // désormais sur le VERDICT SERVEUR, dans un moteur pur qui prend l'ordre de
  // dominance du moteur narratif partagé (une seule vérité pour E09 et E10).
  //
  // LES DEUX LECTURES RÉELLES qui donnent leur substance à E29/E30/E31/E34 :
  // la surface (`territories.area_m2`), l'échéance de contestation évitée +
  // le niveau de protection (`territory_contests` + le territoire fortifié), et
  // l'existence d'une revue anti-triche (sans laquelle le lien d'appel serait
  // un bouton mort). Elles ne partent QUE si le verdict les rend pertinentes.
  const territoryRead = useResultTerritory({
    runId: serverResult?.runId ?? null,
    captured: verdict.zonesClaimed > 0 || verdict.zonesStolen > 0,
    defended: verdict.zonesDefended > 0,
    partial: serverResult?.status === 'partial',
    myCrewId: crew?.id ?? null,
  });
  const composition = useMemo(() => {
    // L'affectation force la compatibilité STRUCTURELLE des deux énumérés à la
    // compilation : `resultVariant.ts` duplique `NarrativeId` pour rester sans
    // import (Deno-testable), et c'est ici que la duplication est vérifiée.
    const dominant: DominantNarrative = narrative;
    const boundary = serverResult?.boundaryCompleted;
    const facts: ResultFacts = {
      narrative: dominant,
      judged: verdict.judged,
      credited: verdict.credited && !notCredited,
      partial: serverResult?.status === 'partial',
      boundaryClosed: boundary
        ? {
            name: boundary.name,
            contributors: boundary.contributions.length,
            myShare: myBoundaryShare(boundary.contributions, territoryRead.meId),
            crewPoints: boundary.crewPoints,
          }
        : null,
      openBoundary: serverResult?.openBoundary
        ? {
            name: serverResult.openBoundary.name,
            missingM: serverResult.openBoundary.missingM,
          }
        : null,
      loopRejectedNarrow: serverResult?.loopRejectedReason === 'narrow',
      // La surface de la zone TENUE vient du territoire fortifié (E31) ; celle
      // de la zone PRISE, du territoire que cette sortie a écrit (E29/E30).
      areaM2: territoryRead.defended?.areaM2 ?? territoryRead.own?.areaM2 ?? null,
      /**
       * L'AIRE AFFICHÉE SURESTIME-T-ELLE LE GAIN ? Deux faits, et les deux
       * comptent :
       *  · le serveur signale que l'intérieur de la boucle n'est pas
       *    intégralement devenu la propriété du coureur (`interiorPartial` —
       *    plafond d'aire, plafond quotidien, zone privée ou interdite, cellule
       *    qu'un rival garde). `territories.area_m2` porte alors l'anneau
       *    ENTIER : c'est ce qui a été ENCERCLÉ, pas ce qui a été obtenu ;
       *  · et le nombre affiché vient bien de CETTE sortie
       *    (`territoryRead.own`). Quand la surface vient du territoire DÉFENDU,
       *    elle décrit une boucle ANTÉRIEURE que ce verdict-ci ne juge pas :
       *    la retirer sur ce motif effacerait un fait vrai.
       * La DÉCISION, elle, est prise une seule fois — dans `composeResult`.
       */
      areaOverstated:
        territoryRead.defended?.areaM2 == null &&
        territoryRead.own?.areaM2 != null &&
        serverResult?.interiorPartial === true,
      protectionLevel:
        territoryRead.defended?.protectionLevel ?? territoryRead.own?.protectionLevel ?? null,
      deadlineAvoidedAt: territoryRead.defended?.deadlineAvoidedAt ?? null,
      defendedAt: territoryRead.defended?.defendedAt ?? null,
      // §12 — aucune source ne donne l'ancien propriétaire d'une zone reprise
      // (`territories` ne garde pas d'historique, `attacker_*` est réservé aux
      // deux parties). La reprise se raconte donc sans nommer personne.
      previousOwner: null,
      // Aucune lecture de classement n'alimente cet écran : le rang reste
      // INCONNU, et un rang inconnu ne s'affiche pas (surtout pas « +0 »).
      rankChange: null,
      appealOpen: territoryRead.appealOpen,
    };
    return composeResult(facts);
  }, [narrative, verdict, notCredited, serverResult, territoryRead]);
  /**
   * VARIANTE SANS CAPTURE (planche E09). `zones.total === 0` produisait
   * « TERRITOIRE ÉTENDU · +0 ZONES CAPTURÉES » : l'objet `zones` étant truthy,
   * toutes les branches de conquête s'allumaient sur un total nul. Le hero
   * bascule maintenant sur l'EFFORT dès que le récit dominant est `effort` et
   * que la course reste créditée (un refus/signalement garde, lui, sa propre
   * dé-escalade §11 — ce n'est pas la même histoire).
   *
   * `verdict.judged` est INDISPENSABLE : sans verdict serveur (hors-ligne), la
   * phrase « l'effort compte, même SANS CAPTURE » affirmerait qu'il n'y a pas eu
   * de capture — alors que personne n'a encore jugé. Un état INCONNU n'est pas un
   * état vide : le KPI retombe sur les km mesurés, et l'écran se tait sur les
   * zones (4 états distincts).
   */
  //
  // 27/07/2026 — la condition ne lit plus `narrative === 'effort'` mais la
  // VARIANTE `freeRun`, ce qui étend la variante d'effort aux récits `boucle`,
  // `crew`, `classement` et `record` À ZÉRO ZONE. Ils tombaient jusqu'ici dans
  // la branche de conquête et produisaient un « 0 ZONES CAPTURÉES » géant sous
  // « TERRITOIRE ÉTENDU » — le zéro nu, exactement ce que la variante d'effort
  // existait pour supprimer. Ces récits servent à choisir un STYLE de card au
  // partage ; aucun d'eux n'affirme une prise de territoire.
  const effortHero =
    conquest && !notCredited && verdict.judged && verdict.credited &&
    composition.variant === 'freeRun';

  // LOT 1 — la série APRÈS cette course, telle que le SERVEUR l'a calculée à
  // partir des courses réelles du joueur (jamais reconstruite ici, jamais
  // simulée en démo). `undefined` (course démo, hors-ligne, serveur muet) ⇒
  // aucun bloc : l'app préfère se taire que d'afficher une série inventée.
  const streakView: StreakView | null = useMemo(() => {
    const s = serverResult?.streakAfter;
    if (!s || s.status === 'none') return null;
    return {
      status: s.status,
      weeks: s.weeks,
      multiplier: s.multiplier,
      runsToValidate: s.runsToValidate,
      best: s.best,
    };
  }, [serverResult]);

  // AMENDEMENT-20 §2 — l'écran 1 est ULTRA simple ET actionnable dès l'affichage
  // (aucun temps mort : titre + KPI géant + pourquoi + [Partager]). Le compteur
  // du KPI anime la dopamine, les contrôles ne sont jamais bloqués. Tous les
  // détails techniques (Impact, GRYD Verified, analyse boucle) se déplient AU
  // TAP « Comment j'ai gagné ces zones », pas sur le premier écran.
  const [showDetails, setShowDetails] = useState(false);
  // AMENDEMENT-23 §B.4 — sous-accordéon « Comment est calculé ce résultat ? »
  // (dans « Comment j'ai gagné ces zones », replié par défaut — détail au tap).
  const [showCalc, setShowCalc] = useState(false);

  // ─── SÉQUENCE NARRATIVE < 1,8 s, SKIPPABLE AU TAP (planche E09) ────────────
  // Ordre imposé : hero → zone → chiffre → rang/XP → PARTAGER actif. Les délais
  // viennent du séquenceur PUR (motion.transitionMs comme base — aucun nombre
  // magique) et le budget de 1,8 s est garanti par ses tests, pas par l'œil.
  // Reduce motion : on démarre DIRECTEMENT à l'état final — l'animation ne porte
  // jamais une information à elle seule.
  const reduceMotion = useReduceMotion();
  const [step, setStep] = useState(() => (reduceMotion ? REVEAL_LAST_STEP : 0));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (reduceMotion) {
      setStep(REVEAL_LAST_STEP);
      return;
    }
    const delays = revealDelaysMs(motion.transitionMs);
    timers.current = delays.flatMap((d, i) =>
      i === 0 ? [] : [setTimeout(() => setStep((s) => Math.max(s, i)), d)],
    );
    const armed = timers.current;
    return () => armed.forEach(clearTimeout);
  }, [reduceMotion]);
  /** SKIP : saute à l'état FINAL — exactement celui de reduce motion. */
  const skipReveal = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep(REVEAL_LAST_STEP);
  };
  const shown = (s: RevealStep) => revealReached(step, s);
  const sequenceRunning = step < REVEAL_LAST_STEP;

  // ─── HERO CARTE 44 % + BASCULE « AVANT ⇄ APRÈS » (planche E09) ────────────
  // Les cellules viennent du VERDICT (`results[].h3` + outcome), le tracé de la
  // MESURE (`finishedTrace`). Rien d'autre n'est dessinable honnêtement : le
  // serveur ne renvoie AUCUN état antérieur du territoire (`beforeState: null`),
  // seul l'outcome `defended` prouve qu'une zone était déjà à moi AVANT.
  const heroCells: HeroCells = useMemo(() => {
    const results = serverResult?.results ?? [];
    const held: string[] = [];
    const gained: string[] = [];
    for (const r of results) {
      if (r.outcome === 'defended') held.push(r.h3);
      else if (r.outcome === 'claimed_neutral' || r.outcome === 'stolen') gained.push(r.h3);
      // Tout le reste (blocked_*, co_captured, cooldown) n'a RIEN changé de
      // possession : le dessiner laisserait croire à une prise qui n'a pas eu lieu.
    }
    return { held, gained };
  }, [serverResult]);
  /**
   * La bascule n'existe que s'il y a QUELQUE CHOSE à comparer : un « avant »
   * n'a de sens que si cette course a réellement changé la possession de zones.
   * Sinon — hors-ligne, aucune prise — un seul état est rendu, sans bouton.
   * Jamais un « Avant » inventé pour faire joli.
   */
  const canCompare = heroCells.gained.length > 0;
  const [showBefore, setShowBefore] = useState(false);
  // Hero à 44 % de la hauteur d'écran (planche). Passé en prop plutôt que mesuré :
  // la viewBox doit être connue au premier rendu, sinon la carte saute d'un cran
  // — et un saut de cadrage est exactement ce que la comparaison ne tolère pas.
  const { width: winW, height: winH } = useWindowDimensions();
  const heroMapH = Math.round(winH * 0.44);
  const heroMapW = Math.round(winW - spacing.cardPadding * 2);
  // Le hero carte n'a de matière que sur une course CRÉDITÉE : sur un refus ou
  // un signalement (§11), rien n'a été attribué et tout se dé-escalade.
  const showHeroMap = !notCredited && (finishedTrace.length >= 2 || heroCells.gained.length > 0);

  // ─── PROGRESSION (2ᵉ temps de la planche) : sources RÉELLES seulement ──────
  // XP joueur et XP crew sont décidées SERVEUR (`xpAwarded` / `crewXp`). Le nom
  // du crew est RÉEL (`useRealCrew`). Le RANG LOCAL et le km² de la maquette
  // n'ont AUCUNE source : ils restent absents — pas de barre vide, pas de « — ».
  const xpAwarded = !notCredited ? (serverResult?.xpAwarded ?? 0) : 0;
  const crewXp = !notCredited ? (serverResult?.crewXp ?? 0) : 0;
  const crewName = crew?.name ?? '';
  // Échéance RÉELLE de la frontière laissée ouverte (verdict serveur). Figée au
  // montage : l'écran n'a pas à faire tourner une horloge, et un compte à rebours
  // qui bouge sous les yeux transformerait une info en pression.
  const [nowMs] = useState(() => Date.now());
  const boundaryLeft = boundaryClock(serverResult?.openBoundary?.expiresAt, nowMs);

  // Un badge n'est décerné QUE par ingest_run (service_role). Sans verdict
  // serveur, il n'y a pas de badge à annoncer — un badge « débloqué » que le
  // serveur n'a jamais accordé est une récompense inventée.
  const badgeId = serverResult ? serverResult.newBadges[0] : undefined;
  const badge = badgeId ? badgeById(badgeId) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

  // AMENDEMENT-19 §4/§7 — bonus ciblé appliqué. Vient EXCLUSIVEMENT de
  // IngestRunResponse.bonusApplied : le serveur seul décide d'un bonus.
  const bonusApplied: IngestRunResponse['bonusApplied'] | undefined =
    serverResult?.bonusApplied;

  useEffect(() => {
    // La discipline accompagne la vue, comme sur l'écran live : sans elle, la
    // mesure d'usage du Résultat mélangerait deux mondes que le jeu sépare
    // partout ailleurs (territoires, classements, points de saison).
    screen('course_result', { mode, activity });
    track(EVENTS.celebrationViewed, { mode, activity });
  }, [mode, activity]);

  const goMap = () => router.replace('/(tabs)');
  // E09 — DÉFIER : aller re-courir le secteur repris. La carte est la seule
  // surface RÉELLE aujourd'hui ; le CTA lui-même ne s'affiche que si le serveur
  // a signalé un vrai rival (voir `rival`). TODO(O1) : router vers Missions/
  // Revanche une fois cette surface alimentée serveur et dé-flaguée.
  const goDefy = () => {
    haptics.medium();
    router.push('/(tabs)');
  };
  // Partage VRAI : on arme les stats de LA course affichée (shareRun.ts) avant
  // de pousser /partage — l'aperçu partagé montre CE run, jamais la démo figée.
  const share = () => {
    haptics.medium();
    track(EVENTS.shareCardGenerated);
    // ─── LA SURFACE QUI PART SUR LA CARTE (27/07/2026) ────────────────────────
    // Le chiffre héros de la planche E10 (« +420 000 m² ») avait été INTERDIT
    // faute de source : `IngestRunResponse` ne renvoie que des comptes d'hexagones.
    // Il en a une depuis le lot 1 — `territories.area_m2`, l'aire GÉODÉSIQUE du
    // polygone réellement couru, déjà lue ici par `useResultTerritory` et déjà
    // affichée juste au-dessus. On transmet EXACTEMENT le même nombre, formaté
    // par le même `formatArea` : l'image publiée et l'écran ne peuvent pas
    // diverger, et rien n'est recalculé côté carte.
    //
    // ⚠️ LA GARDE A CHANGÉ DE PLACE, ET C'EST LA CORRECTION DU JOUR. Elle vivait
    // ICI (`serverResult?.capReached !== true`) et NULLE PART AILLEURS : la même
    // aire était jugée indigne d'être exportée en PNG, puis affichée telle quelle
    // en surface héro deux cents lignes plus bas. Deux niveaux d'honnêteté pour
    // un seul nombre, dans un seul fichier.
    // La garde est désormais DANS `composeResult` (moteur pur, testé), sur un
    // signal PLUS LARGE que `capReached` : `interiorPartial` couvre aussi le
    // plafond quotidien, les zones privées, les zones interdites et les cellules
    // qu'un rival garde — tous les cas où `territories.area_m2` décrit l'anneau
    // ENCERCLÉ plutôt que le gain. `composition.areaM2` est donc déjà `null`
    // dans ces situations, et le partage n'a plus rien à re-filtrer : il lit LA
    // décision. Une absence n'est pas un mensonge ; une surface surévaluée en
    // serait un — et la carte retombe alors sur les ZONES, verdict serveur exact.
    const shareArea =
      composition.areaM2 !== null ? formatArea(composition.areaM2, decimalSeparator()) : null;
    setShareRun({
      mode,
      intention,
      // Le VERDICT part avec la card : c'est lui qui décidera le récit côté
      // /partage (moteur pur partagé), pas l'intention du joueur. Sans ce champ,
      // l'écran de partage retombait sur « J'AI PRIS {ZONE} · +0 » dès que la
      // course était lancée en mode conquête — verdict ou pas.
      verdict,
      card: shareCardFromResult({
        // playerName / crewName sont posés PLUS BAS à la chaîne vide : aucune
        // identité de démo (KORO / LES FOULÉES 9³) ne signe jamais un vrai run.
        zoneName: stats.zoneName,
        // SURFACE — voir le bloc `shareArea` juste au-dessus. `null` ⇒ chaînes
        // vides, que la card lit « aucune surface connue » (jamais « 0 m² »).
        surfaceValue: shareArea?.value ?? '',
        surfaceUnit: shareArea?.unit ?? '',
        // Zones/points : le verdict serveur, ou les valeurs NEUTRES de
        // NEUTRAL_SHARE_CARD (0) quand personne n'a jugé. Ce 0-là n'est pas un
        // résultat affiché au joueur : c'est l'absence de chiffre sur la card,
        // que les templates lisent comme « rien à annoncer ».
        zonesGained: zones?.total ?? 0,
        loopBonusZones: zones?.enclosed ?? 0,
        crewPoints: zones?.pointsAwarded ?? 0,
        // Style DÉFENSE : ne JAMAIS laisser passer les valeurs démo (+48 h /
        // 2 zones tenues) comme si c'était CE run. Les zones tenues = zones
        // réellement couvertes par ce run (dérivé) ; la durée de tenue est
        // décidée serveur (indispo côté client) → valeur neutre honnête 0,
        // jamais une défense inventée. TODO(O1) : holdHours réel via ingest_run.
        zonesDefended: zones?.total ?? 0,
        holdHours: 0,
        distanceKm: formatKm(stats.distanceM),
        paceLabel: formatPace(stats.paceSPerKm),
        clockLabel: formatClock(stats.durationS),
        // ─── TRACÉ RÉEL, MASQUÉ (24/07/2026) ────────────────────────────────
        // Historique : ce `trace` valait `[]` car le vrai tracé mourait à la fin
        // de la course (RealCourseLive ne passait que dist+dur). Il est désormais
        // ARMÉ par useRealRun (finishedTrace) et on partage LE parcours réellement
        // couru — jamais une géométrie d'authoring. `applySharePrivacy` retire le
        // départ/arrivée (domicile potentiel) avant tout rendu sortant ; trop
        // court pour masquer honnêtement → `[]`, que ShareMap lit « aucun tracé
        // connu » (aucune géographie fabriquée). Vue LOCALE non trimée : le hero.
        trace: applySharePrivacy(finishedTrace),
        // P1 C8/B3 — course RÉELLE : zéro invention résiduelle sur la card.
        // verified vient du serveur (stats l'est déjà), le rang n'existe pas
        // encore (season_scores) → styles Classement neutralisés plutôt que
        // « #8 Paris Est », l'état AVANT est inconnu → ligne masquée, et les
        // identités démo (KORO / LES FOULÉES 9³) ne signent jamais un vrai run.
        verified: stats.verified,
        rankLabel: null,
        rankZone: null,
        rankDelta: null,
        beforeState: null,
        // Pas d'identité de remplissage : sans pseudo chargé, la card signe par
        // la ZONE (helper who() des templates), jamais par KORO.
        playerName: '',
        crewName: '',
      }),
    });
    // La discipline VOYAGE avec la sortie : /partage titre et raconte lui aussi
    // l'effort (`shareRunTitle`, `reasonCrew`…), et il ne peut pas le nommer
    // s'il ne le reçoit pas. On transporte ce qu'on a plutôt que de laisser
    // l'écran suivant redeviner — c'est exactement la rupture qu'on corrige ici.
    router.push({
      pathname: '/partage',
      params: {
        mode,
        intention: params.intention ?? '',
        [START_ACTIVITY_PARAM]: activity,
      },
    });
  };
  const toggleDetails = () => {
    haptics.light();
    setShowDetails((v) => !v);
  };
  // Le mini-bandeau badge du niveau 1 OUVRE les détails (le BadgeCard y vit).
  const openBadgeDetails = () => {
    haptics.light();
    setShowDetails(true);
  };
  const toggleCalc = () => {
    haptics.light();
    setShowCalc((v) => !v);
  };

  // AMENDEMENT-23 §B.4 — décomposition zones de CE run : le trait capture le
  // passage, la boucle ajoute l'intérieur (mêmes totaux que l'IMPACT). Chiffres
  // du VERDICT SERVEUR uniquement — `zones === null` ⇒ le bloc entier ne rend
  // rien (voir plus bas), plutôt qu'un « +0 / +0 / +0 » qui se lit comme un
  // résultat mesuré alors que rien n'a été jugé.
  const traceZones = zones ? Math.max(0, zones.total - zones.enclosed) : 0;
  const loopGain = zones?.enclosed ?? 0;
  const totalZones = zones?.total ?? 0;
  const verifyTiers = verifyTiersLabel();
  /** Promesse du panneau de détails — jamais plus que ce qu'il contient. */
  // Non crédité : « Voir mes stats », jamais « Comment j'ai gagné ces zones »
  // (rien n'a été gagné) — le détail montre le temps/l'allure, pas un palmarès.
  // `!effortHero` en plus : sur une course JUGÉE qui n'a rien pris, « Comment
  // j'ai gagné ces zones » promettait l'explication de zones qui n'existent pas.
  // Le panneau ne contient alors que des mesures — il s'annonce « Voir mes stats ».
  const detailsLabel =
    conquest && zones && !notCredited && !effortHero ? t(C.howIWon) : t(C.seeMyStats);

  // AMENDEMENT-23 §B.4 / honnêteté §A — décomposition technique du calcul.
  // `defended` est RÉEL dès qu'une vraie course a été jugée par ingest_run
  // (serverResult.hexes.defended, seul juge) ; routes ouvertes / segments exclus
  // ne sont pas encore renvoyés par le serveur → restent un scénario démo,
  // étiqueté « démo » pour ne jamais se confondre avec les vraies valeurs
  // GPS/MOUVEMENT/VALIDÉ (dérivées du run) dans la même grille.
  // TODO(O1) : exposer routesOpened/segmentsExcluded côté ingest_run.
  // `null` = le serveur n'a pas (encore) jugé : la case DISPARAÎT plutôt que
  // d'afficher un chiffre de scénario. Une valeur étiquetée « démo » reste une
  // valeur inventée dans la grille d'un vrai run.
  const zonesDefended: number | null = serverResult ? serverResult.hexes.defended : null;

  // Kicker d'intention (doc §2/§3.1) — i18n depuis le 25/07/2026 : il rendait
  // 'CONQUÊTE' / 'DÉFENSE' / 'RUN LIBRE' en français en dur, sur l'écran de fin
  // de course d'un joueur EN/ES/DE/PT.
  const summary = summaryHeader(intention);
  // Ligne émotionnelle de l'écran 1 (courte, jamais tronquée).
  // Non crédité (refus/signalement) : PAS de ligne de conquête (« kicker · km ») —
  // le titre + le KPI km + la raison suffisent, un kicker de conquête y serait un
  // contresens. La ligne disparaît (voir garde au rendu).
  // §A r.1 — la distance n'est écrite qu'UNE fois par niveau de lecture : quand
  // le KPI héros EST déjà les km (variante effort, ou verdict absent), la ligne
  // se réduit au kicker d'intention. Sinon on lisait « 4,30 » en géant, puis
  // « RUN LIBRE · 4,30 km », puis « 4,30 km DISTANCE » — trois fois le même
  // chiffre sur un écran qui tient en un coup d'œil.
  // `zones.total > 0` (27/07/2026) : sans lui, une course JUGÉE à zéro zone qui
  // n'entrait pas dans la variante d'effort (récit `boucle`/`crew`, ou trace
  // partiellement exclue) affichait un « 0 » de 64 px sous « ZONES CAPTURÉES ».
  // Le KPI ne montre un compte de zones que s'il y a des zones à compter.
  const kpiShowsZones =
    conquest && zones !== null && zones.total > 0 && !notCredited && !effortHero;
  // Variante SANS CAPTURE (planche selection15) : recap SOBRE, sans kicker
  // d'intention (« CONQUÊTE ») — le récit y est porté par la phrase d'effort
  // (« l'effort compte, même sans capture »), pas par une bannière de conquête
  // au-dessus d'un run qui n'a rien pris.
  const heroLine = notCredited || effortHero
    ? ''
    : conquest
      ? kpiShowsZones
        ? `${t(summary.kicker)} · ${formatKm(stats.distanceM)} km`
        : t(summary.kicker)
      : isPrivate
        ? t(A.privateLine)
        : t(C.socialRunLine, { km: formatKm(stats.distanceM) });
  // Titre du moment dopamine : le RÉSULTAT (territoire/zone), jamais un tampon
  // administratif — la validation vit dans la pill GRYD VERIFIED, séparée.
  // « TERRITOIRE ÉTENDU » / « ZONE DÉFENDUE » sont des AFFIRMATIONS de conquête :
  // elles exigent le verdict serveur. Sans lui (hors-ligne), le titre retombe sur
  // « COURSE TERMINÉE » — vrai, lui, et déjà traduit dans les 5 langues.
  // PIONNIER — cette course a OUVERT une commune vierge (verdict serveur, nom
  // réel). La seule récompense qui vaut PLUS quand la ville est vide. Null sauf
  // ouverture réelle ET course créditée (jamais festif sur un refus, §11) : elle
  // n'existe que si le serveur l'a dite. `null` tant qu'O1 n'est pas déployé.
  const pioneer = pioneerCelebration(serverResult, !notCredited);
  // E09 (planche) — DÉFIER UN RIVAL, CTA DORMANT : n'apparaît QUE si le serveur
  // signale une reprise RÉELLE de secteur par un crew rival (rivalReprise), et
  // sur une course créditée. `null` tant qu'O1 ne l'émet pas → le bouton est
  // absent (jamais un rival fabriqué, jamais un bouton mort — même patron que
  // `pioneer`). TODO(O1) : re-cibler vers la vraie surface Missions/Revanche
  // (features/crew/revanche.ts) une fois qu'elle sera alimentée serveur et
  // dé-flaguée ; en attendant, défier = aller re-courir le secteur sur la carte.
  const rival = rivalChallengeFromResult(serverResult, !notCredited);
  const heroTitle = isPrivate
    ? t(A.heroPrivate)
    : pioneer
      ? t(C.heroPioneer, { commune: pioneer.nom }) // REMPLACE « TERRITOIRE ÉTENDU » (§A, une seule affirmation)
      : stats.rejected
        ? t(C.heroRejected) // §11 : capture refusée — jamais « TERRITOIRE ÉTENDU »
        : stats.flagged
          ? t(A.heroFlagged) // §11 : course signalée par GRYD Verify — non créditée
          : // VARIANTE SANS CAPTURE (planche) : jugé, crédité, mais rien de pris.
            // « TERRITOIRE ÉTENDU » y était un contresens — le hero parle d'EFFORT,
            // et « COURSE TERMINÉE » est vrai, sobre, et déjà traduit 5 langues.
            !conquest || !zones || effortHero
            ? // VARIANTE SANS CAPTURE : quand la boucle est RÉELLEMENT restée
              // ouverte (verdict serveur `openBoundary`), le titre le DIT — un
              // fait du run (planche selection15), plus honnête que le générique.
              // Sinon (zéro-zone sans frontière ouverte) « COURSE TERMINÉE ».
              effortHero && serverResult?.openBoundary
              ? t(C.loopNotClosed)
              : t(A.heroDone)
            : // ─── LES SIX RÉSULTATS : LE TITRE VIENT DU VERDICT ────────────
              // Il venait de `intention` — c'est-à-dire de ce que le joueur
              // avait ANNONCÉ vouloir faire avant de partir. Un joueur parti
              // « défendre » qui capturait du neutre lisait « ZONE DÉFENDUE » ;
              // un joueur parti « conquérir » qui n'avait fait que tenir ses
              // zones lisait « TERRITOIRE ÉTENDU ». L'écran racontait une
              // intention là où il devait rapporter un verdict.
              composition.variant === 'crewContribution'
              ? t(C.crewLoopClosed) // E33 — la zone n'est pas l'œuvre d'une seule sortie
              : composition.variant === 'reprise'
                ? t(C.heroReprise) // E30 — célèbre l'ACTION, jamais l'humiliation d'un joueur
                : composition.variant === 'defense'
                  ? t(C.heroDefended) // E31
                  : composition.variant === 'partial'
                    ? t(C.heroPartial) // E34 — rien de pris, et une portion écartée
                    : t(C.heroExtended); // E29

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Barre : kicker seul — l'écran 1 est déjà l'état final, rien à passer. */}
      <View style={styles.bar}>
        <Text style={styles.barKicker}>{t(A.barKicker)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ 1. TERRITOIRE — l'impact AVANT les métriques (planche E09) ═══════
             Hero carte 44 % + bascule Avant/Après · titre · pill VERIFIED.
             Le chiffre, la progression et les stats viennent APRÈS, dans cet
             ordre-là et pas un autre. Le technique reste AU TAP. */}
        <ResultReveal visible={shown('hero')} haptic="success" style={styles.hero}>
          {/* HERO CARTE — le territoire que CETTE course a changé. Rendu
              uniquement s'il y a une géométrie RÉELLE à montrer (tracé mesuré ou
              cellules jugées) : sinon rien, plutôt qu'un cadre vide. */}
          {showHeroMap ? (
            <View style={styles.heroMapWrap}>
              <ResultHeroMap
                points={finishedTrace}
                cells={heroCells}
                loopClosed={zones?.loopClosed === true}
                // La séquence fait ATTERRIR les zones : on part de l'« avant »
                // et le temps « zone » les pose. Même bbox, donc aucun mouvement
                // de caméra — seul le remplissage change.
                showBefore={showBefore || !shown('zone')}
                width={heroMapW}
                height={heroMapH}
                animated={!reduceMotion}
                accessibilityLabel={
                  showBefore ? t(A.a11yHeroMapBefore) : t(A.a11yHeroMapAfter)
                }
              />
              {/* BASCULE « Avant ⇄ Après » — press-and-hold (planche). Rendue
                  UNIQUEMENT si cette course a réellement changé la possession de
                  zones : sans « après » différent de l'« avant », il n'y a rien à
                  comparer, et un bouton qui ne change rien est un bouton mort. */}
              {canCompare ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.beforeAfterA11y)}
                  onPressIn={() => setShowBefore(true)}
                  onPressOut={() => setShowBefore(false)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.beforeToggle, pressed && styles.pressed]}
                >
                  <Text style={styles.beforeToggleLabel} numberOfLines={1}>
                    {showBefore ? t(C.beforeLabel) : t(C.afterLabel)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {/* GRIP — petit, il personnalise, il ne vole pas la vedette au territoire. */}
          <View style={styles.heroGrip}>
            <GripMascot rank={gripRank} size={48} />
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          {/* PIONNIER — le sous-titre du statut rare : « Premier runner de GRYD
              ici ». Un seul par commune, pour toujours (verdict serveur). */}
          {pioneer ? <Text style={styles.heroPioneerSub}>{t(A.heroPioneerSub)}</Text> : null}
          {/* La VALIDATION vit dans sa pill (séparée du titre — jamais « validée »
              en guise de victoire). Jargon banni : « stats only » → français. */}
          {/* Non crédité : ni « GRYD VERIFIED » ni « Compte en stats » — une course
              refusée/signalée n'est PAS comptée en stats ; l'affirmer serait faux
              (le titre + la raison portent déjà l'état). */}
          {!isPrivate && serverResult && !notCredited ? (
            stats.verified ? (
              <StatePill state="verified" label="GRYD VERIFIED" />
            ) : (
              <StatePill state="statsonly" label={t(C.statsOnlyPill)} />
            )
          ) : null}
        </ResultReveal>

        {/* CHIFFRE HÉROS — le GAIN, pas la performance (planche). Trois cas
            STRICTEMENT distincts, jamais confondus :
              · zones jugées > 0     → le nombre de zones (le gain) ;
              · jugé mais RIEN pris  → variante EFFORT : les KM MESURÉS ;
              · pas de verdict / non crédité → les KM MESURÉS aussi.
            Le « +0 ZONES CAPTURÉES » du 2ᵉ cas était le zéro nu que la loi
            interdit — et il s'affichait sous un titre « TERRITOIRE ÉTENDU ».
            LA SURFACE est un bloc SÉPARÉ, juste dessous (elle a sa propre
            source : `territories.area_m2`, cf. son commentaire). Ce qui reste
            interdit ici comme partout : dériver une surface d'un COMPTE d'hexes
            — `IngestRunResponse` n'en porte aucune, et « zones × aire nominale »
            serait un chiffre inventé. */}
        <ResultReveal visible={shown('chiffre')} haptic="none" style={styles.heroSecond}>
          {kpiShowsZones && zones ? (
            <View style={styles.heroKpi}>
              <ZoneCountUp value={zones.total} />
              <Text style={styles.heroKpiLabel}>{t(C.zonesCaptured)}</Text>
            </View>
          ) : effortHero ? null : (
            // VARIANTE SANS CAPTURE (planche selection15) : pas de KM en KPI géant
            // — un « 4,1 » en grand survend la distance d'un run qui n'a rien pris.
            // La distance reste lisible dans la rangée stats ci-dessous (§A r.1 :
            // écrite une seule fois). Le KPI KM reste, lui, sur les cas hors-ligne
            // et non-conquête, où il n'y a rien d'autre à mettre en tête.
            <View style={styles.heroKpi}>
              <Text style={styles.zonesHero}>{formatKm(stats.distanceM)}</Text>
              <Text style={styles.heroKpiLabel}>{t(C.kmLabel)}</Text>
            </View>
          )}

          {/* ═══ LA SURFACE (spec §D : « surface héro » E29/E30, « surface
               conservée » E31) ══════════════════════════════════════════════
               Elle vient de `territories.area_m2` — l'aire GÉODÉSIQUE calculée
               par le moteur et écrite par ingest_run — LUE dans la base pour
               cette course précise. Jamais une somme de cellules H3 : convertir
               des hexagones en km² côté client donnerait un chiffre plausible
               et faux, c'est-à-dire le pire.
               ABSENTE quand la lecture n'a rien rendu (territoire pas encore
               écrit, migration non déployée, lecture en échec) : le bloc
               disparaît, il n'affiche pas « 0 m² ».
               ABSENTE AUSSI quand l'intérieur de la boucle n'est pas
               intégralement devenu la propriété du coureur (verdict serveur
               `interiorPartial` → `composeResult`) : `area_m2` porte alors
               l'anneau ENTIER, et l'annoncer « SURFACE GAGNÉE » afficherait ce
               qui a été ENCERCLÉ pour ce qui a été obtenu. C'est la MÊME
               décision que celle qui gouverne le PNG partagé — un seul endroit
               tranche, l'écran et l'image ne peuvent plus diverger. */}
          {composition.areaM2 !== null ? (
            <View style={styles.surfaceBlock}>
              <Text style={styles.surfaceValue} numberOfLines={1}>
                {formatArea(composition.areaM2, decimalSeparator()).value}
                <Text style={styles.surfaceUnit}>
                  {' '}
                  {formatArea(composition.areaM2, decimalSeparator()).unit}
                </Text>
              </Text>
              <Text style={styles.surfaceLabel} numberOfLines={1}>
                {composition.variant === 'defense'
                  ? t(C.surfaceKept)
                  : composition.variant === 'reprise'
                    ? t(C.surfaceTaken)
                    : t(C.surfaceGained)}
              </Text>
            </View>
          ) : null}

          {/* E30 — L'ANCIEN PROPRIÉTAIRE, et rien de plus. `null` aujourd'hui
              (aucune source ne le donne : `territories` ne garde pas
              d'historique de propriété, et §12 réserve `attacker_*` aux deux
              parties). La ligne est donc ABSENTE, pas vide — et le ton, le jour
              où elle s'allumera, reste « Reprise à X », jamais « tu as écrasé X ». */}
          {composition.previousOwner ? (
            <Text style={styles.heroWhy} numberOfLines={1}>
              {t(C.repriseFrom, { owner: composition.previousOwner })}
            </Text>
          ) : null}

          {/* E31 — CE QUE LA DÉFENSE A ÉVITÉ, puis CE QU'ELLE A OBTENU.
              L'échéance vient de la contestation RÉELLE que cette sortie a
              refermée (`territory_contests.expires_at`), la protection du
              territoire fortifié (`defense_level`). Aucune des deux ne
              s'invente : sans contestation lue, les deux lignes disparaissent. */}
          {composition.deadlineAvoidedHours !== null ? (
            <Text style={styles.heroWhy} numberOfLines={1}>
              {t(C.deadlineAvoided, { h: composition.deadlineAvoidedHours })}
            </Text>
          ) : null}
          {composition.protectionLevel !== null ? (
            <Text style={styles.heroWhySoft} numberOfLines={1}>
              {t(C.protectionLevel, { n: composition.protectionLevel })}
            </Text>
          ) : null}

          {/* E33 — LA FRONTIÈRE COMMUNE. Le nom vient du serveur ; MA part et le
              NOMBRE de contributeurs aussi. On n'affiche PAS la liste des
              contributions : `contributions[].user` est un IDENTIFIANT, pas un
              pseudo — le rendre peindrait un UUID à la place d'un coéquipier. */}
          {composition.crewBoundary ? (
            <>
              <Text style={styles.heroWhy} numberOfLines={2}>
                {t(C.crewBoundaryNamed, { name: composition.crewBoundary.name })}
              </Text>
              {composition.crewBoundary.myShare !== null ? (
                <Text style={styles.heroWhySoft} numberOfLines={1}>
                  {t(C.crewBoundaryShare, {
                    pct: Math.round(composition.crewBoundary.myShare * 100),
                  })}
                </Text>
              ) : null}
              {composition.crewBoundary.contributors > 1 ? (
                <Text style={styles.heroQueued} numberOfLines={1}>
                  {t(C.crewBoundaryContributors, { n: composition.crewBoundary.contributors })}
                </Text>
              ) : null}
              {/* CE QUE LA FERMETURE A RAPPORTÉ AU CREW — `crewPoints`, décidé
                  SERVEUR (`boundaryCompleted.crewPoints`). L'écran le lisait
                  déjà (facts → composition) et ne le montrait nulle part : le
                  seul chiffre RÉEL d'E33 restait invisible, alors que la copie
                  gelée de la spec le cite. Strictement > 0 : `0` ne veut pas
                  dire « le crew a gagné zéro point », il veut dire que le
                  serveur n'a rien attribué — et « +0 pts » est le zéro nu. */}
              {composition.crewBoundary.crewPoints > 0 ? (
                <Text style={styles.heroQueued} numberOfLines={1}>
                  {t(C.crewBoundaryPoints, {
                    n: formatInt(composition.crewBoundary.crewPoints),
                  })}
                </Text>
              ) : null}
            </>
          ) : null}

          {/* §11 — REFUS serveur : la RAISON précise, distincte de « aucune zone »
              (qui, elle, veut dire « boucle non fermée », pas « course invalide »).
              `rejectCopy` est résolu défensivement (skew serveur → rien, pas de crash). */}
          {stats.rejected && rejectCopy ? (
            <Text style={styles.heroWhy} numberOfLines={2}>
              {t(rejectCopy)}
            </Text>
          ) : null}
          {/* §11 — SIGNALEMENT GRYD Verify : dire honnêtement que la course est en
              revue et non créditée (aucune raison de gameplay ici — trust trop bas). */}
          {stats.flagged ? (
            <Text style={styles.heroWhy} numberOfLines={2}>
              {t(A.flaggedWhy)}
            </Text>
          ) : null}

          {/* Le POURQUOI du chiffre, au niveau 1 (verdict serveur crédité uniquement). */}
          {conquest && !notCredited && zones?.loopClosed ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              {t(C.loopClosedBurst, { n: formatInt(zones.enclosed) })}
            </Text>
          ) : null}

          {/* ─── VARIANTE SANS CAPTURE : la RAISON, factuelle, jamais un échec ──
               La planche demande « Il manquait 84 m… la boucle reste
               disponible. » Les mètres viennent du serveur (`missingM`) ;
               l'échéance aussi (`expiresAt`, convertie en heures PLEINES par un
               moteur pur qui se tait plutôt que d'arrondir vers le haut). La
               destination « dans vos Missions » de la maquette n'est PAS reprise :
               aucune surface Missions n'accueille aujourd'hui une frontière
               ouverte — on dit le fait, pas une promesse de navigation. */}
          {conquest && !notCredited && serverResult?.openBoundary ? (
            <>
              <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
                {t(C.almostClosed, { m: formatInt(serverResult.openBoundary.missingM) })}
              </Text>
              {boundaryLeft ? (
                <Text style={styles.heroWhySoft} numberOfLines={1} ellipsizeMode="clip">
                  {boundaryLeft.kind === 'hours'
                    ? t(C.boundaryOpenHours, { h: boundaryLeft.hours })
                    : t(C.boundaryOpenSoon)}
                </Text>
              ) : null}
            </>
          ) : null}
          {/* E32 — la boucle fermée dont l'INTÉRIEUR a été refusé (forme trop
              étroite, A-16 §2). Elle n'apparaissait nulle part : le joueur lisait
              « Aucune zone capturée — ferme une boucle », alors qu'il en AVAIT
              fermé une. Un conseil faux est pire qu'aucun conseil. */}
          {composition.freeRunReason?.kind === 'narrow' ? (
            <Text style={styles.heroWhy} numberOfLines={2}>
              {t(C.notEligible)}
            </Text>
          ) : null}
          {/* Le message générique ne sert plus QUE la sortie libre sans autre
              explication : sous E34 (portion exclue) il conseillait de fermer une
              boucle pour un problème qui n'a rien à voir. */}
          {conquest &&
          !notCredited &&
          composition.freeRunReason?.kind === 'noAction' &&
          zones?.total === 0 ? (
            <Text style={styles.heroWhy} numberOfLines={2}>
              {t(C.noZones)}
            </Text>
          ) : null}
          {/* E32 — LA SUGGESTION CONCRÈTE que la spec demande, adossée à la
              raison RÉELLE. Aucun sentiment d'échec : on dit quoi faire la fois
              d'après, jamais ce qui a raté. Elle ne s'affiche pas sur une course
              non créditée (§11 a sa propre explication) ni hors conquête. */}
          {conquest && !notCredited && composition.freeRunReason ? (
            // 3 lignes : §A interdit qu'un texte soit coupé, et la phrase
            // française tient tout juste sur deux à 375 px.
            <Text style={styles.heroWhySoft} numberOfLines={3}>
              {composition.freeRunReason.kind === 'narrow'
                ? t(C.suggestWiderLoop)
                : t(C.suggestCloseLoop)}
            </Text>
          ) : null}

          {/* ═══ E34 — LA PORTION EXCLUE ════════════════════════════════════
               `status: 'partial'` était fondu dans un unique booléen `verified`
               avec `valid` : une course dont une partie avait été écartée
               affichait exactement le même écran qu'une course intégralement
               retenue. L'exclusion se DIT désormais, y compris sous une conquête
               réussie — et sans chiffre, parce que le serveur n'en renvoie
               aucun (ni longueur ni durée de la portion écartée). */}
          {composition.excluded ? (
            <>
              <Text style={styles.heroWhy} numberOfLines={2}>
                {t(C.partialNotice)}
              </Text>
              <Text style={styles.heroWhySoft} numberOfLines={3}>
                {t(C.partialWhy)}
              </Text>
              {/* LE LIEN D'APPEL — peint UNIQUEMENT si une revue anti-triche
                  existe RÉELLEMENT pour cette course (lecture réelle de
                  `anticheat_reviews`). Sans elle, `/appel` répondrait « aucune
                  vérification » : un lien vers un écran vide est un bouton mort
                  (§A), et la spec dit « lien d'appel SI NÉCESSAIRE. */}
              {composition.appealOpen ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.partialAppeal)}
                  onPress={() => router.push('/appel')}
                  hitSlop={8}
                  style={({ pressed }) => [styles.tertiary, pressed && styles.pressed]}
                >
                  <Text style={styles.tertiaryLabel}>{t(C.partialAppeal)}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {/* « L'effort compte, même sans capture. » — la phrase qui retourne le
              résultat, et le seul ton admissible ici (planche : jamais un ton
              d'échec). Adossée à l'XP RÉELLE quand le serveur en a crédité une ;
              seule sinon — jamais un « +0 XP ». */}
          {effortHero ? (
            <Text style={styles.heroEffort} numberOfLines={2}>
              {xpAwarded > 0
                ? `${t(C.xpAwarded, { n: formatInt(xpAwarded) })} · ${t(C.effortCounts)}`
                : t(C.effortCounts)}
            </Text>
          ) : null}

          {/* 1 ligne émotionnelle, courte, jamais tronquée. Absente sur un refus
              (heroLine vide) : on n'ajoute pas de ligne de conquête à un refus. */}
          {heroLine ? (
            <Text style={styles.heroLine} numberOfLines={1} adjustsFontSizeToFit>
              {heroLine}
            </Text>
          ) : null}

          {/* BADGE DÉBLOQUÉ — hook de rétention VISIBLE au niveau 1, tappable
              (ouvre les détails où vit le BadgeCard complet). */}
          {conquest && badge ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.badgeUnlockedA11y, { name: badge.name })}
              onPress={openBadgeDetails}
              style={({ pressed }) => [styles.heroBadge, pressed && styles.pressed]}
            >
              <Icon name="badge" size={16} color={badgeColor(badge)} />
              <Text style={styles.heroBadgeText} numberOfLines={1} adjustsFontSizeToFit>
                {t(C.badgeUnlockedBanner, { name: badge.name })}
              </Text>
              <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
            </Pressable>
          ) : null}

          {/* Fin hors-ligne (AMENDEMENT-15 §2) : discret, anti-shame, jamais bloquant. */}
          {params.queued === '1' ? (
            <Text style={styles.heroQueued} numberOfLines={1}>
              {t(C.queuedNote)}
            </Text>
          ) : null}

          {/* A-41 (LE RELAIS) : zones co-courues payées 1/rang — le co-coureur
              voit POURQUOI il n'a pas « pris » la zone mais n'est pas reparti
              à zéro. Discret, même gabarit que la note hors-ligne. */}
          {serverResult?.hexes.coCaptured !== undefined && serverResult.hexes.coCaptured > 0 ? (
            <Text style={styles.heroQueued} numberOfLines={2}>
              {t(A.coCapturedNote, { n: serverResult.hexes.coCaptured })}
            </Text>
          ) : null}

          {/* Crew réel 3/3 : la conséquence COLLECTIVE — vraie (union carte 2/3),
              jamais fabriquée : uniquement si le SERVEUR a jugé des captures ET
              que le roster réel a d'autres membres. Même gabarit discret. */}
          {zones !== null && zones.total > 0 && crewTeammates > 0 ? (
            <Text style={styles.heroQueued} numberOfLines={2}>
              {crewTeammates === 1
                ? t(C.crewImpactOne)
                : t(C.crewImpactMany, { n: crewTeammates })}
            </Text>
          ) : null}
        </ResultReveal>

        {/* ═══ 2. PROGRESSION (planche : territoire → PROGRESSION → stats) ══════
             Sources RÉELLES uniquement : `xpAwarded` et `crewXp` sont décidés
             SERVEUR, le nom du crew vient de `useRealCrew`.
             ABSENT FAUTE DE SOURCE, et donc non peint (ni barre vide, ni « — ») :
             le RANG LOCAL de la maquette (« #3 du quartier » — aucune lecture de
             season_scores ici).
             Le km² de la maquette (« +0,42 km² ») N'EST PLUS absent : il a une
             source depuis le lot 1 (`territories.area_m2`) et il est rendu par le
             bloc SURFACE du chiffre héros, plus haut. Il n'a rien à faire en
             double ici — §A.1 : une grandeur, un endroit. */}
        <ResultReveal visible={shown('progression')} haptic="none" style={styles.progressBlock}>
          {xpAwarded > 0 || (crewXp > 0 && crewName) ? (
            <>
              <Text style={styles.stepKicker}>{t(C.progressKicker)}</Text>
              <View style={styles.progressRows}>
                {/* L'XP du joueur — le seul chiffre de progression que le
                    serveur crédite explicitement à CETTE course. En variante
                    effort, il est déjà dit dans le hero : pas deux fois (§A r.1). */}
                {xpAwarded > 0 && !effortHero ? (
                  <View style={styles.progressRow}>
                    <Icon name="niveau" size={iconSizes.sm} color={colors.chartreuse} />
                    <Text style={styles.progressValue}>
                      {t(C.xpAwarded, { n: formatInt(xpAwarded) })}
                    </Text>
                  </View>
                ) : null}
                {/* Contribution crew : NOM RÉEL + XP crew RÉELLE. Sans crew
                    chargé (pas de session, pas de crew, lecture impossible) la
                    ligne DISPARAÎT — jamais « ton crew » en bouche-trou. */}
                {crewXp > 0 && crewName ? (
                  <View style={styles.progressRow}>
                    <Icon name="crew" size={iconSizes.sm} color={colors.chartreuse} />
                    <Text style={styles.progressValue} numberOfLines={1}>
                      {t(C.crewXpLine, { crew: crewName, n: formatInt(crewXp) })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {/* LA SÉRIE (LOT 1 « LA SÉRIE VISIBLE ») — c'est de la progression, sa
              place est ici. Vient EXCLUSIVEMENT du serveur (`streakAfter`,
              dérivé des courses réelles) — absent ⇒ rien affiché, jamais un
              « 0 » ni une série de démo. */}
          {streakView ? (
            <StreakBlock state={streakView} weeksBefore={serverResult?.streakAfter?.weeksBefore} />
          ) : !serverResult && localStreak ? (
            // Aucun verdict serveur (hors-ligne / pré-O1) : la série LOCALE prend
            // le relais. Dès que le serveur juge, la branche ci-dessus (autorité)
            // gagne. `null` si aucune série réelle : jamais un « 0 ».
            <StreakBlock state={localStreak} />
          ) : null}

          {/* ═══ 3. STATISTIQUES — UN bloc à séparateurs, jamais 4 cards ════════
               Il vivait DANS l'accordéon « détails », donc APRÈS le partage :
               l'ordre immuable de la planche était cassé, et la distance d'une
               course réussie n'était visible nulle part au premier niveau.
               DÉNIVELÉ (4ᵉ stat de la maquette) OMIS : l'altitude ne remonte pas
               jusqu'ici — 3 stats mesurées valent mieux qu'une case « — ».
               La 3ᵉ case (allure à pied, VITESSE à vélo) disparaît, séparateur
               compris, quand rien n'a été mesuré : un « 0'00/km » se lirait
               comme une performance nulle alors que c'est une absence. */}
          {stats.durationS > 0 ? (
            <View style={styles.statTriBlock}>
              <View style={styles.statTriItem}>
                {/* Planche E09 : la valeur en gras, l'unité en petit exposant gris
                    à côté (« 4,3 » + « km »), jamais deux textes de même taille. */}
                <Text style={styles.statTriValue} numberOfLines={1}>
                  {formatKm(stats.distanceM)}
                  <Text style={styles.statTriUnit}> km</Text>
                </Text>
                <Text style={styles.statTriLabel}>{t(C.distanceLabel)}</Text>
              </View>
              <View style={styles.statTriSep} />
              <View style={styles.statTriItem}>
                {/* Le temps n'a pas d'unité à exposer (27:12 se lit seul). */}
                <Text style={styles.statTriValue} numberOfLines={1}>
                  {formatClock(stats.durationS)}
                </Text>
                <Text style={styles.statTriLabel}>{t(C.timeLabel)}</Text>
              </View>
              {rate ? (
                <>
                  <View style={styles.statTriSep} />
                  <View style={styles.statTriItem}>
                    <Text style={styles.statTriValue} numberOfLines={1}>
                      {rate.kind === 'speed' ? (
                        <>
                          {formatSpeedKmh(rate.kmh, decimalSeparator())}
                          <Text style={styles.statTriUnit}> km/h</Text>
                        </>
                      ) : (
                        <>
                          {formatPace(rate.sPerKm)}
                          <Text style={styles.statTriUnit}>/km</Text>
                        </>
                      )}
                    </Text>
                    <Text style={styles.statTriLabel}>{t(A.rateLabel)}</Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </ResultReveal>

        {/* ═══ 4. PARTAGE — hiérarchie de CTA de la planche ═══════════════════
             PARTAGER (primaire chartreuse, unique §A4) · DÉFIER UN RIVAL
             (secondaire, dormant tant que le serveur ne signale pas de reprise)
             · Terminer (TERTIAIRE texte). « Voir mon territoire » et « Terminer »
             partageaient le style secondaire : deux secondaires, aucun tertiaire.
             La sortie descend donc en lien texte — le chartreuse reste unique. */}
        <ResultReveal visible={shown('partage')} haptic="none" style={styles.actions}>
          {/* Partage MASQUÉ sur une course non créditée : toutes les cards de
              partage affirment une conquête (« J'AI PRIS ZONE ») — proposer de
              partager un refus produirait exactement le mensonge que cet écran
              retire. Rien à célébrer ⇒ pas de bouton (jamais un CTA menteur, §A). */}
          {/* PRIMAIRE chartreuse — UNIQUE (§A4). Variante SANS CAPTURE
              (effortHero, planche selection15) : le chartreuse pointe la SORTIE
              carte, l'action forte — pas le partage d'un non-événement. Partager
              redescend alors en tertiaire (plus bas). Sinon : PARTAGER. */}
          {effortHero ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.backToMap)}
              onPress={goMap}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="carte" size={iconSizes.md} color={colors.noir} />
              <Text style={styles.shareLabel}>{t(C.backToMap)}</Text>
            </Pressable>
          ) : !isPrivate && !notCredited ? (
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="partage" size={iconSizes.md} color={colors.noir} />
              <Text style={styles.shareLabel}>{t(C.share)}</Text>
            </Pressable>
          ) : null}
          {/* DÉFIER UN RIVAL (E09) — CTA DORMANT : rendu UNIQUEMENT si le serveur
              a signalé une reprise réelle (`rival`). Absent pré-O1 → ni rival
              fabriqué ni bouton mort. Icône cible orange = rôle RIVAL (§C). */}
          {rival ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.defyRival, { crew: rival.rivalCrew })}
              onPress={goDefy}
              style={({ pressed }) => [styles.boundarySecondary, pressed && styles.pressed]}
            >
              <Icon name="cible" size={iconSizes.sm} color={gameColors.rival} />
              <Text style={styles.boundarySecondaryLabel} numberOfLines={1}>
                {t(C.defyRival, { crew: rival.rivalCrew })}
              </Text>
            </Pressable>
          ) : null}
          {/* « VOIR MON TERRITOIRE » RETIRÉ (25/07/2026). Il était rendu en
              SECONDAIRE, à côté de « Défier », et pointait vers `/(tabs)` — donc
              exactement la même destination que la sortie de l'écran. Deux
              boutons de poids différent pour le même endroit : une redondance
              (§A r.1) et une hiérarchie fausse. La planche n'en demande que
              trois — PARTAGER · DÉFIER UN RIVAL · Terminer — et c'est « Terminer »
              (tertiaire, ci-dessous) qui ramène à la carte. */}
          {/* RENDEZ-VOUS local (rétention) — surface SECONDAIRE : le seul
              déclencheur de retour shippable sans backend. S'efface d'elle-même
              sur web / refus de permission (jamais un bouton mort).
              Le rappel HÉRITE de la discipline qu'on vient de terminer : une
              notification qui promet « ta prochaine course » après une sortie
              vélo propose un autre sport que celui que le joueur a choisi — et
              elle, contrairement à cet écran, revient tous les jours. */}
          <RendezvousOptIn activity={activity} />
          {/* Le libellé suit `zones`, pas `conquest` : sans verdict serveur,
              « Comment j'ai gagné ces zones » promettrait l'explication de zones
              que personne n'a encore comptées. Dans ce cas le panneau ne contient
              que des mesures — il s'annonce donc « Voir mes stats ». */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showDetails ? t(C.hideDetails) : detailsLabel
            }
            onPress={toggleDetails}
            style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
          >
            <Text style={styles.detailsToggleLabel}>
              {showDetails ? t(C.hideDetails) : detailsLabel}
            </Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
          {/* TERTIAIRE — lien texte, ne rivalise jamais avec le chartreuse.
              Variante SANS CAPTURE (planche selection15) : c'est PARTAGER qui
              descend ici (le chartreuse est déjà la sortie carte) — Partager
              reste HONNÊTE (course créditée, card d'effort réelle), simplement
              dégradé. Sinon « Terminer » ferme l'écran. */}
          {effortHero ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.share)}
              onPress={share}
              hitSlop={8}
              style={({ pressed }) => [styles.tertiary, pressed && styles.pressed]}
            >
              <Text style={styles.tertiaryLabel}>{t(C.share)}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.finishRun)}
              onPress={goMap}
              hitSlop={8}
              style={({ pressed }) => [styles.tertiary, pressed && styles.pressed]}
            >
              <Text style={styles.tertiaryLabel}>{t(C.finishRun)}</Text>
            </Pressable>
          )}
        </ResultReveal>

        {/* ─── « COMMENT J'AI GAGNÉ CES ZONES » — technique, au tap ────────────
             Impact · GRYD Verified · Analyse « La boucle fait la zone » · calcul
             · frontière · crew · bonus · badge. Replié par défaut : l'écran 1
             reste lisible en 2 s. */}
        {showDetails ? (
          <View style={styles.detailsWrap}>
            {/* IMPACT — total de conquête. Conditionné à `zones` : hors-ligne
                (verdict en attente), ce bloc affichait « TOTAL +0 », un zéro nu
                que le joueur lisait comme « ta course n'a rien pris ». Il
                disparaît jusqu'à ce que le serveur ait jugé — ET, depuis le
                recalage E09, aussi quand le verdict est bien tombé mais à ZÉRO
                zone (`effortHero`) : « TOTAL +0 » y était le même zéro nu, une
                ligne plus bas dans l'écran. */}
            {conquest && zones && !notCredited && !effortHero ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.impactKicker)}</Text>
                <View style={styles.summaryCard}>
                  {/* La boucle de rendu qui vivait ici itérait `summaryLines`,
                      figé à `[]` : du code mort autour d'une donnée vide, dont le
                      seul effet était de faire croire que la synthèse existait
                      encore. Il ne reste que le TOTAL, qui, lui, est le verdict. */}
                  <View style={styles.impactTotalRow}>
                    <Text style={styles.impactTotalLabel}>{t(C.totalLabel)}</Text>
                    <Text style={styles.impactTotalValue}>
                      +{formatInt(zones.total)}
                      {zones.loopClosed ? (
                        <Text style={styles.impactTotalSub}>
                          {'  '}
                          {t(C.ofWhichLoop, { n: formatInt(zones.enclosed) })}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* NOTE DE MODE (social / privé). Le bloc de STATS qui vivait ici est
                REMONTÉ au niveau 1 (§ « 3. STATISTIQUES ») : la planche impose
                territoire → progression → statistiques → partage, et l'enterrer
                sous le CTA cassait cet ordre. Ne reste ici que la note de mode,
                qui est du contexte, pas une mesure.
                privateNote = affirmation de CONFIDENTIALITÉ, vraie quel que soit
                le verdict → toujours affichée en privé. socialNote dit « stats et
                badges comptent » : FAUX sur une course non créditée (refus /
                signalement ignorés par applyRunToStats) → masquée alors. */}
            {!conquest && (isPrivate || !notCredited) ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.detailsKicker)}</Text>
                <View style={styles.statsCard}>
                  <Text style={styles.statsNote}>
                    {isPrivate ? t(A.privateNote) : t(C.socialNote)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* GRYD VERIFIED — la confiance de l'effort (technique). Masqué sur une
                course non créditée : « Stats enregistrées » y serait faux (un refus
                / signalement n'est pas compté en stats). */}
            {!isPrivate && !notCredited ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>GRYD VERIFIED</Text>
                <View style={styles.verifiedCard}>
                  {stats.verified ? (
                    <StatePill state="verified" label="GRYD VERIFIED" />
                  ) : (
                    <StatePill state="statsonly" label={t(C.statsSavedPill)} />
                  )}
                  {/* Scores GPS/mouvement RETIRÉS (21/07/2026) : ils venaient de
                      `resultStats`, c'est-à-dire de la SIMULATION, et le serveur ne
                      les renvoie pas encore (O1). Cet écran ne s'ouvre plus que sur
                      une vraie course : les afficher aurait collé une qualité de
                      signal fabriquée sur le run du joueur. Le statut
                      « GRYD VERIFIED », lui, vient bien du serveur (stats.verified). */}
                </View>
              </View>
            ) : null}

            {/* ─── BLOC « ANALYSE · LA BOUCLE FAIT LA ZONE » RETIRÉ ───────────
                Il montrait deux mini-cartes AVANT/APRÈS construites sur
                `loop.traceGeo`, c'est-à-dire sur les ticks de la SIMULATION
                ancrée place de la République — jamais sur la course du joueur.
                Un Lillois voyait l'analyse de SA boucle dessinée à Paris.
                La pédagogie « la boucle fait la zone » survit sans géométrie
                fabriquée : le schéma abstrait de l'accordéon « Comment est
                calculé ce résultat ? » (BoucleFaitLaZone, juste en dessous)
                explique la règle avec les VRAIS totaux du run, sans prétendre
                dessiner un territoire. Le bloc reviendra le jour où le tracé
                réel remontera jusqu'ici (voir la note en tête de fichier). */}

            {/* COMMENT EST CALCULÉ CE RÉSULTAT ? — explicabilité post-run
                (AMENDEMENT-23 §B.4). Un accordéon replié : au tap, le schéma
                « la boucle fait la zone » (trace / boucle / gain) + la
                décomposition (défense · routes · segments exclus · GPS · Motion
                · verify). Décrit le moteur réel ; seuils verify dérivés des
                constantes gelées (jamais de littéral).
                Conditionné à `zones` : sans verdict serveur, le schéma et la
                décomposition n'auraient que des zéros à montrer, et la ligne
                « validé » affirmerait un échec de vérification que personne n'a
                prononcé. Rien à expliquer tant que rien n'est calculé — et rien
                non plus quand le verdict dit ZÉRO zone (`effortHero`) : la
                décomposition « +0 / +0 / +0 » n'explique aucun gain. */}
            {conquest && zones && !notCredited && !effortHero ? (
              <View style={styles.block}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showCalc ? t(C.calcHideA11y) : t(C.calcQuestion)}
                  onPress={toggleCalc}
                  style={({ pressed }) => [styles.calcHeader, pressed && styles.pressed]}
                >
                  <Icon name="boucle_fermee" size={16} color={colors.chartreuse} />
                  <Text style={styles.calcHeaderLabel}>{t(C.calcQuestion)}</Text>
                  <Icon name="chevron" size={16} color={colors.gris} />
                </Pressable>

                {showCalc ? (
                  <View style={styles.calcBody}>
                    {/* Schéma réutilisé — surchargé par les vrais totaux du run. */}
                    <View style={styles.calcSchema}>
                      <BoucleFaitLaZone
                        traceZones={traceZones}
                        loopZones={totalZones}
                        loopGain={loopGain}
                      />
                    </View>

                    {/* Décomposition en 3 lignes (trace / boucle / gain). */}
                    <View style={styles.calcZonesRows}>
                      <CalcZoneRow label={t(C.traceOnly)} value={`+${formatInt(traceZones)}`} />
                      <CalcZoneRow
                        label={t(C.loopClosedRow)}
                        value={`+${formatInt(totalZones)}`}
                        accent
                      />
                      <CalcZoneRow label={t(C.loopGainRow)} value={`+${formatInt(loopGain)}`} />
                    </View>

                    {/* Grille technique : le reste du calcul, valeurs brutes. */}
                    <View style={styles.calcGrid}>
                      {/* Zones défendues : uniquement le verdict serveur. */}
                      {zonesDefended !== null ? (
                        <View style={styles.calcCell}>
                          <MiniStat
                            label={t(C.defendedLabel)}
                            value={`+${formatInt(zonesDefended)}`}
                          />
                        </View>
                      ) : null}
                      {/* Routes ouvertes / segments exclus : ingest_run ne les
                          renvoie pas encore (TODO O1). Tant qu'aucune source ne
                          les mesure, la grille ne les affiche pas du tout —
                          plutôt une case en moins qu'un chiffre inventé.
                          MÊME RAISON POUR GPS / MOUVEMENT (21/07/2026) : ces deux
                          scores sont produits par `resultStats` (la SIMULATION),
                          pas par le serveur. Cette grille ne s'ouvre plus que sur
                          une vraie course — les y laisser aurait collé une qualité
                          de signal fabriquée sur le run que le joueur vient de
                          faire. Ils reviendront avec le breakdown d'ingest_run. */}
                      <View style={styles.calcCell}>
                        <MiniStat
                          label={t(C.validLabel)}
                          value={
                            composition.verify === 'notCredited'
                              ? `< ${verifyTiers.partial}`
                              : `≥ ${verifyTiers.full}`
                          }
                        />
                      </View>
                    </View>

                    {/* ═══ E34 — LA CONCLUSION, EN TROIS ÉTATS ═══════════════
                         Elle en avait DEUX, décidés par `stats.verified`, qui
                         valait `status === 'valid' || status === 'partial'` —
                         c'est-à-dire exactement « la course est créditée », donc
                         rien du tout. Sur une course `partial`, cet écran
                         affirmait ici « GPS et mouvement fiables : CAPTURE
                         PLEINE » quinze lignes après avoir annoncé « une partie
                         du parcours n'a pas été retenue ». Deux affirmations
                         contradictoires, dont une fausse.
                         `composition.verify` (moteur pur, testé) les sépare :
                         `full` / `partialExcluded` / `notCredited`. La case
                         VALIDÉ ci-dessus lit la MÊME source — sur `partial`, le
                         seuil de confiance EST bien atteint (une confiance
                         insuffisante produirait `flagged`, pas `partial`) : ce
                         qui est partiel, c'est le parcours retenu, pas la
                         vérification, et la copie dit désormais lequel des deux. */}
                    <Text style={styles.calcVerifyNote} numberOfLines={2}>
                      {composition.verify === 'full'
                        ? t(C.verifyOk)
                        : composition.verify === 'partialExcluded'
                          ? t(C.verifyPartial)
                          : t(C.verifyKo)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* SECTEUR + CONTRIBUTION CREW — RETIRÉS (21/07/2026).
                Les deux blocs affichaient un « % de secteur » (avant/après) et une
                montée de crew tirés de `resultStats`, donc de la simulation : aucun
                secteur réel n'est câblé côté serveur. Ils n'étaient rendus que sur
                une course NON réelle — un cas qui n'existe plus depuis que l'écran
                exige une vraie course. Ils reviendront quand ingest_run renverra un
                vrai découpage par secteur. */}

            {/* BONUS APPLIQUÉ (AMENDEMENT-19 §4) — ligne sobre. */}
            {conquest && bonusApplied ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.bonusAppliedKicker)}</Text>
                <View style={styles.bonusCard}>
                  <View style={styles.bonusIcon}>
                    <Icon name="cadeau" size={20} color={gameColors.crew} />
                  </View>
                  <View style={styles.bonusTextWrap}>
                    <Text style={styles.bonusName} numberOfLines={1}>
                      {bonusApplied.name}
                    </Text>
                    <Text style={styles.bonusEffect} numberOfLines={1}>
                      {t(C.bonusAppliedLine, { effect: bonusApplied.effect })}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* BADGE DÉBLOQUÉ — inline (le reveal plein écran n'encombre plus l'écran 1). */}
            {conquest && badge && badgeFamily ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.badgeUnlockedKicker)}</Text>
                <BadgeCard
                  name={badge.name}
                  family={badge.family}
                  familyLabel={badgeFamily.name}
                  familyColor={badgeColor(badge)}
                  tier={badge.tier}
                  state="unlocked"
                  requirement={badge.requirement}
                  reward={t(C.badgeReward)}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* ─── SKIP DE LA SÉQUENCE (planche : « skippable au tap ») ──────────────
           Cible transparente plein écran, présente UNIQUEMENT pendant la séquence
           (< 1,8 s) : elle disparaît d'elle-même et ne peut donc jamais avaler un
           tap destiné à un contrôle. Un tap saute à l'état FINAL — exactement
           celui de reduce motion : la séquence n'est jamais le seul chemin vers
           l'information. */}
      {sequenceRunning ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.skipRevealA11y)}
          onPress={skipReveal}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

/** Compteur « +214 » qui monte dès l'affichage (useCountUp — saut direct si
    reduce motion) : la dopamine vit dans l'animation, jamais dans un blocage. */
function ZoneCountUp({ value }: { value: number }) {
  const display = useCountUp(value);
  return <Text style={styles.zonesHero}>+{formatInt(display)}</Text>;
}

// `SummaryLine` SUPPRIMÉ (25/07/2026) : composant de rendu d'une synthèse
// (`ResultSummaryLine`) qui n'avait plus aucune donnée à rendre — la liste était
// figée à `[]` et la fonction qui la produisait fabriquait quatre affirmations
// de gameplay en français, sans mesure derrière. Le tout est parti ensemble.

/** Une ligne « libellé … valeur » de la décomposition zones post-run (§B.4). */
function CalcZoneRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.calcZoneRow}>
      <Text style={styles.calcZoneLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.calcZoneValue, accent && styles.calcZoneValueAccent]}>{value}</Text>
    </View>
  );
}

/**
 * Une valeur brute de la grille du calcul. La prop `note` (repère « démo »
 * italique) a été RETIRÉE avec elle : plus aucune valeur de scénario n'entre
 * dans cette grille depuis le 21/07/2026, et un marqueur « démo » disponible
 * est une invitation à en réafficher une.
 */
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ─── `BoundaryToast` SUPPRIMÉ (25/07/2026) ──────────────────────────────────
// Composant JAMAIS monté : il datait des deux écrans de frontière crew retirés
// le 21/07/2026 (« Mission envoyée dans la War Room »). Il restait compilé,
// stylé et documenté comme s'il faisait partie de l'écran. La frontière ouverte
// s'affiche désormais comme une RAISON factuelle sous le hero d'effort, dérivée
// du seul `openBoundary` que le serveur renvoie.

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  // ── Aucun résultat à montrer (état vide honnête) ──
  noResultRoot: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  noResultBlock: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  noResultTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  noResultBody: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
  },
  noResultCta: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Chartreuse = fond, texte NOIR (jamais de chartreuse sur clair — charte).
  noResultCtaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '700' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: spacing.xs,
  },
  barKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 2,
  },
  content: { paddingHorizontal: spacing.cardPadding, gap: 18, paddingTop: spacing.xs },
  block: { gap: 10 },
  pressed: { opacity: 0.75 },

  // ── 1. TERRITOIRE — hero carte 44 % + titre (planche E09) ──
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  // 2ᵉ temps : le chiffre héros et ses raisons, détachés du hero par l'espace.
  heroSecond: { alignItems: 'center', gap: spacing.xs },
  heroGrip: { alignItems: 'center' },
  // La carte flotte : aucune card autour (§A — jamais de card-dans-card).
  heroMapWrap: { alignSelf: 'stretch', alignItems: 'center' },
  // Bascule Avant/Après : pastille discrète posée SUR la carte, en bas à droite.
  beforeToggle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  beforeToggleLabel: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  // PIONNIER — le statut rare, en chartreuse (rôle « moi/gain », sur fond sombre).
  heroPioneerSub: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroKpi: { alignItems: 'center', gap: 2 },
  heroKpiLabel: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 4,
  },
  heroLine: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Le POURQUOI du chiffre (« Boucle fermée · +42 zones d'un coup ») — niveau 1.
  heroWhy: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    textAlign: 'center',
  },
  // ── LA SURFACE (E29/E30/E31) ──
  // Un cran SOUS le KPI de zones : c'est la même information vue autrement (la
  // spec la veut « héro », mais deux chiffres de 64 px côte à côte ne font plus
  // de héros du tout). Valeur en display, unité en exposant gris — même
  // grammaire que la rangée de statistiques (§A : une seule façon de lire un
  // nombre dans tout l'écran).
  surfaceBlock: { alignItems: 'center', gap: 2 },
  surfaceValue: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  surfaceUnit: { color: colors.gris, fontSize: fontSizes.sm, fontFamily: fonts.textSemi },
  surfaceLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Complément factuel du POURQUOI (échéance de la frontière) — un cran en
  // dessous : c'est une précision, pas l'information principale.
  heroWhySoft: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },
  // « L'effort compte, même sans capture. » — chartreuse sur fond SOMBRE : c'est
  // un gain (l'XP), pas une consolation grise.
  heroEffort: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── 2. PROGRESSION + 3. STATISTIQUES (ordre immuable de la planche) ──
  progressBlock: { gap: spacing.md },
  progressRows: { gap: spacing.xs },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    flexShrink: 1,
  },
  // Mini-bandeau badge tappable (hook de rétention visible, au plancher tactile).
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    backgroundColor: gameColors.carbon,
    marginTop: 2,
  },
  heroBadgeText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  heroQueued: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },

  // Toggle détails — secondaire discret, sous le CTA principal (plancher tactile).
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
  },
  detailsToggleLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  detailsWrap: { gap: 18, marginTop: 4 },

  // ── Détails : Impact total ──
  impactTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: spacing.sm,
  },
  impactTotalLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 2,
  },
  impactTotalValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  impactTotalSub: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },

  // ── Détails : GRYD Verified ──
  verifiedCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 14,
    alignItems: 'flex-start',
  },

  // ── Explicabilité post-run « Comment est calculé ce résultat ? » (§B.4) ──
  // Accordéon replié : en-tête tappable + corps (schéma + décomposition). Pas
  // de card-dans-card : le corps est séparé par l'espace, contour d'état only.
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    backgroundColor: gameColors.carbon,
  },
  calcHeaderLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
  },
  calcBody: { gap: spacing.md, paddingTop: spacing.xxs },
  calcSchema: { alignItems: 'center' },
  calcZonesRows: { gap: spacing.xs },
  calcZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcZoneLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  calcZoneValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  calcZoneValueAccent: { color: colors.chartreuse },
  calcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: spacing.md,
  },
  // 3 par ligne (33 %) — MiniStat garde son flex:1 dans sa cellule.
  calcCell: { width: '33%', flexDirection: 'row' },
  calcVerifyNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  stepKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 2,
  },

  summaryCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },

  zonesHero: {
    color: colors.chartreuse,
    fontSize: fontSizes.hero,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },

  statsCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  // ── E09 — résumé sportif : UN bloc à séparateurs (jamais 4 cards, planche) ──
  statTriBlock: { flexDirection: 'row', alignItems: 'center' },
  statTriItem: { flex: 1, alignItems: 'center', gap: 3 },
  statTriValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Unité en petit exposant gris à côté de la valeur (planche E09 : « 4,3 » puis
  // « km » plus petit). fontSizes.xs = un tiers de la valeur, teinte discrète.
  statTriUnit: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
  },
  statTriLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Fin séparateur vertical entre les stats (grisLigne — jamais une card interne).
  statTriSep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.grisLigne, marginVertical: 2 },
  miniStat: { flex: 1, gap: 2 },
  miniStatValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniStatLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  // ── Bonus appliqué (AMENDEMENT-19 §4) : ligne sobre, liseré chartreuse ──
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    padding: 14,
  },
  bonusIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone,
  },
  bonusTextWrap: { flex: 1, gap: 2 },
  bonusName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  bonusEffect: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '800' },

  actions: { gap: 10, marginTop: 4 },
  shareButton: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Libellé NOIR sur chartreuse (charte — jamais de chartreuse sur fond clair).
  // CAPITALES : le CTA primaire de la planche (« PARTAGER » / « RETOUR À LA
  // CARTE ») et la convention des CTA GRYD (« COMMENCER LA MISSION »…).
  shareLabel: {
    color: colors.noir,
    fontSize: fontSizes.md,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // SECONDAIRE — contour discret, jamais de fond chartreuse (§A4 : un seul CTA
  // chartreuse par écran, et c'est PARTAGER).
  boundarySecondary: {
    height: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  boundarySecondaryLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  // TERTIAIRE (planche) — « Terminer » : lien texte, au plancher tactile avec le
  // hitSlop. Aucun fond, aucun contour : il ne concurrence pas le chartreuse.
  tertiary: { alignItems: 'center', justifyContent: 'center', minHeight: sizes.touchTarget },
  tertiaryLabel: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '700' },

});
