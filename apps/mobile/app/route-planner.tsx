/**
 * GRYD — `/route-planner` : LE PLANIFICATEUR DE BOUCLE (planche E05, volet
 * « Ajuster »). Une seule décision : quelle boucle je cours, et je pars.
 *
 * ─── ORDRE DE COMPOSITION ──────────────────────────────────────────────────────
 *  1. EN-TÊTE — retour · kicker « OBJECTIF · DISCIPLINE · LIEU » · KPI kilomètres
 *     (le seul grand chiffre de l'écran) · UNE ligne de contexte grise.
 *  2. CARTE — le tracé RÉEL, ou l'état qui dit pourquoi il n'y en a pas.
 *  3. DÉPART — champ d'état (position / recherche / échec) tappable pour relancer.
 *  4. MÉTRIQUES — UN bloc à séparateurs (`SheetMetrics`), zéro contenant.
 *  5. POURQUOI CETTE COURSE — puces de faits + la provenance de la distance.
 *  6. FORMATS — un `Segmented` défilant (3 longueurs), l'objectif ne change pas.
 *  7. AJUSTER — accordéon REPLIÉ : objectif · distance exacte · autres boucles.
 *  8. BARRE BASSE — microcopie + LE bouton unique (§A4), qui porte toujours le
 *     geste utile du moment (localiser / recalculer / partir).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI (25/07/2026) ────────────────────────────
 * · LE RÉSULTAT DE JEU FABRIQUÉ. « +64 zones », « +1 280 pts », « 12 rues à
 *   défendre », « expire dans 48 h », « Modéré » : tous calculés côté CLIENT dans
 *   `liveRouting.ts` à partir de `ZONES_PER_KM = 15.3` et `LOOP_ZONE_RATIO = 0.6`,
 *   deux constantes qui ne venaient pas de `game-rules.ts`. Ils étaient affichés à
 *   TROIS endroits (résumé d'en-tête, microcopie du CTA, cartes de variantes)
 *   pendant que le bloc de métriques du même écran déclarait, en commentaire, que
 *   le gain restait un point ouvert et n'était donc pas affiché. Double violation :
 *   « tout claim est décidé serveur » + « aucun nombre magique ». Supprimé, pas
 *   déplacé — annoncer une récompense avant la course EST une attribution.
 * · L'ALLURE FORFAITAIRE. `EST_PACE_SEC_PER_KM = 350` appliquait 5'50/km à tout le
 *   monde et pilotait TOUTES les durées de l'écran, alors que l'allure réelle du
 *   joueur était déjà mesurée par `computeHabitsProfile`. Les durées viennent
 *   désormais de cette mesure — et quand elle n'existe pas, il n'y a PAS de
 *   minutes (`features/route/estimation.ts`).
 * · « PARTAGER AU CREW » ET SON FEED. Le bouton n'écrivait nulle part : son toast
 *   avouait « (démo) » et empilait une fausse ligne « à l'instant ». Aucune RPC de
 *   partage crew n'existe (O1). Une étiquette « démo » ne rachète pas une action
 *   qui n'a pas lieu (AMENDEMENT-47).
 * · `setPlannedRoute(route)`, commenté « la course suivra EXACTEMENT ce tracé ».
 *   `getPlannedRoute()` n'avait AUCUN lecteur, et `course-live.tsx` documente que
 *   le paramètre `planned` ne pilote plus rien : la capture est décidée sur la
 *   boucle réellement fermée. Le store et le paramètre d'URL sont partis avec.
 * · CINQ `screen()` D'INTERACTION (`route_planner_plan_select`, `_objective_select`,
 *   `_route_select`, `_origin`, `_share`) : des noms d'events inventés hors
 *   `packages/shared/src/events.ts`, envoyés comme des vues d'écran. Il reste le
 *   `screen('route_planner')` de l'écran, et `cta_tapped` (event §8 réel) porté
 *   par le bouton unique.
 * · LE CTA CHARTREUSE DÉSACTIVÉ À 40 %. Un bouton d'accent qui ne répond jamais se
 *   lit cassé ; c'était en plus le SEUL bouton de l'écran. Il porte maintenant le
 *   geste possible du moment (`features/route/plannerCta.ts`, testé).
 * · LES CONTOURS PERMANENTS (champ d'origine, bouton cible, pastille de reprise,
 *   pas de distance, chips, cartes de plan et de variantes) : un contour signale
 *   un ÉTAT, jamais une frontière de bloc. Les groupes de choix passent tous par
 *   `Segmented tone="surface"`, le seul groupe de choix du système.
 * · LA PUCE « SECTEUR À TENIR » : elle affirmait que le joueur tient du territoire
 *   à cet endroit. Cet écran ne lit aucun claim.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE E05 ──────────────────────────────────────────
 * · « +0,42 km² gain potentiel » (3ᵉ métrique de la planche) — ABSENT : aucune
 *   simulation serveur n'existe (O1). Le remplissage d'une boucle est décidé
 *   cellule par cellule par `ingest_run`, APRÈS la course.
 * · « Modérée difficulté » (4ᵉ métrique) — ABSENT : aucun modèle de difficulté
 *   dans le dépôt (ni dénivelé, ni revêtement, ni tables de pentes).
 * · « Cette boucle relie vos deux zones du centre » (phrase de valeur tactique) —
 *   ABSENTE : elle exigerait de lire les `hex_claims` du joueur autour de
 *   l'origine ; aucune lecture territoriale n'a lieu sur cet écran.
 * · La planche décrit une SHEET à 58 % posée sur la carte ; ici l'écran est plein.
 *   E05 renvoie explicitement « Ajuster » vers le planificateur en sheet 90 %, et
 *   la sheet de briefing existe déjà, recalée (`map/MissionBriefingSheet.tsx`).
 * · « Bike absent (feature flag) » — CADUC depuis le 26/07/2026 (cf. § DISCIPLINE
 *   plus bas) : le vélo existe, et il n'y a toujours aucun commutateur ici — la
 *   discipline vient de l'écran appelant, pas d'un réglage local.
 * · Le KPI et la ligne de contexte disparaissent tant qu'aucun tracé n'existe :
 *   la planche montre un écran déjà peuplé, et un « — » en gros chiffre serait la
 *   valeur nulle que la loi 15 interdit.
 *
 * ─── LA DISCIPLINE (E14, 26/07/2026) ──────────────────────────────────────────
 * L'écart « Bike absent (feature flag) » ci-dessus est CLOS : le vélo est une
 * discipline réelle, et cet écran en est un chemin de départ à part entière.
 * Trois conséquences, toutes structurelles :
 *
 *  1. IL NE POSSÈDE PAS DE COMMUTATEUR. Le planificateur n'est pas un onglet :
 *     il n'a pas de lentille à lui. Sa discipline lui est TRANSMISE par l'écran
 *     qui l'ouvre, via le paramètre d'URL contractuel `START_ACTIVITY_PARAM`
 *     (`?activity=bike`), relu ici par `parseStartActivity`. Un chemin muet vaut
 *     course à pied — exactement le comportement d'avant le vélo.
 *  2. TOUTES LES DISTANCES SONT CELLES DE LA DISCIPLINE
 *     (`features/route/activityPlanning.ts`, qui lit `activityRouting()` dans
 *     game-rules). Avant ce chantier, une lentille vélo se voyait proposer une
 *     boucle de 3 km routée au profil PIÉTON : sous le périmètre minimal d'une
 *     boucle vélo (5 000 m), donc structurellement incapturable. L'écran
 *     promettait un effort que le moteur ne pouvait pas récompenser.
 *  3. LE DÉPART DÉCLARE. Le CTA pousse `plannerStartHref(intention, activity)` —
 *     la même déclaration que le GO de la Carte, et le préflight l'AFFICHE
 *     trois secondes avant le premier mètre, corrigeable d'un tap.
 *  4. L'ÉCRAN NE SE CONTREDIT PLUS (correctif du 26/07 au soir). Il affichait
 *     déjà « BIKE » dans son kicker (`ACTIVITY_LABELS[activity]`) et rendait
 *     pourtant, SANS CONDITION, « Pourquoi cette course », « Ajuster la course »
 *     (texte visible ET libellé lu à voix haute) et « Objectif de la course ».
 *     Ces trois-là passent par `features/route/plannerCopy.ts` — une dérivation
 *     PURE et testée, qui les fait basculer ENSEMBLE. Les deux phrases restantes
 *     qui nomment des « courses » (`whyLearned`, `whyDefaultLearning`) ne sont
 *     PAS twinées, et c'est un refus argumenté : sous lentille vélo elles sont
 *     structurellement inatteignables (`useRouteSuggestion` refuse la source
 *     d'habitudes, qui mélange les disciplines) — cf. `catalog/route.ts` et le
 *     test d'atteignabilité de `plannerCopy.test.ts`.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS FONDUS ──────────────────────────────────────────
 * Cet écran ne lit ni compte ni territoire : son 1ᵉʳ état (« pas connecté ») ne
 * s'applique pas — un plan de course se prépare sans session. Ses quatre états
 * sont ceux du CAPTEUR, et ils pilotent tout (`GpsState` ci-dessous) : rien
 * demandé / recherche en cours / position confirmée / échec. La lecture des
 * habitudes (distance et allure proposées) a ses propres états, tous nommés dans
 * `features/route/suggestion.ts` et dits en une ligne sous les puces.
 *
 * ─── LA PERMISSION VIENT D'UN GESTE (21/07/2026, conservé) ────────────────────
 * À l'ouverture : état `unasked`, RIEN n'est demandé. Le joueur déclenche la
 * localisation d'un geste. Exception SANS invite : si l'app a déjà obtenu une
 * position dans cette session (`positionProvenThisSession`), la permission est
 * acquise et l'OS ne rouvre aucune boîte — on enchaîne alors directement.
 *
 * ─── LE BUG D'ORIGINE, RETIRÉ (21/07/2026, conservé) ──────────────────────────
 * Quand `currentPosition()` échouait, un repli posait la place de la République
 * comme origine et calculait un vrai itinéraire parisien étiqueté « Démo · Paris »
 * — pour un joueur qui était à Ouville-la-Rivière. Un échec de géolocalisation n'a
 * qu'une réponse honnête : le DIRE et proposer de réessayer. AUCUNE position de
 * repli, nulle part, sur aucune plateforme.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c, type Activity, type IconName } from '@klaim/shared';
import { ACTIVITY_LABELS } from '../src/ui/activityLens';
import {
  parseStartActivity,
  START_ACTIVITY_PARAM,
} from '../src/features/run/gps/runActivity';
import { ACTIVITY_NAME } from '../src/i18n/catalog/runGps';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { Button } from '../src/ui/Button';
import { GrydIcon } from '../src/ui/gryd';
import { defineCatalog } from '../src/i18n/types';
import { formatKm } from '../src/ui/format';
import { type SheetMetric } from '../src/features/map/SheetMetrics';
import { ToastHost, useToast } from '../src/features/social/Toast';
import { RoutePlannerMap } from '../src/features/route/RoutePlannerMap';
import { PLANNER_INTENTION_LABELS, generatedReasons } from '../src/features/route/generator';
import {
  clampPlannerKm,
  plannerBounds,
  plannerFormatsKm,
} from '../src/features/route/activityPlanning';
import { plannerStartHref } from '../src/features/route/startTargets';
// LES TROIS TEXTES QUI NOMMENT L'EFFORT, choisis par la discipline (pur, testé).
// Ils étaient rendus SANS CONDITION : l'écran affichait « BIKE » dans son kicker
// et « cette course » quatre lignes plus bas.
import { plannerDisciplineCopy } from '../src/features/route/plannerCopy';
import { useRouteSuggestion } from '../src/features/route/useRouteSuggestion';
import { runsBeforeLearning, type RouteSuggestion } from '../src/features/route/suggestion';
import { estimatedMinutes, plannerMetricKeys } from '../src/features/route/estimation';
import { ctaStartsRun, plannerCta, type PlannerCtaKind } from '../src/features/route/plannerCta';
// Deux entrées, deux besoins : `routeLoopOutcome` pour LE tracé de l'écran (le
// bouton unique a besoin de la CAUSE d'un échec pour ne pas proposer un
// recalcul qui ne peut rien changer), `routeLoop` pour la liste « autres
// boucles », qui n'affiche que ce qui a abouti et n'a donc que faire du motif.
import { routeLoop, routeLoopOutcome } from '../src/features/route/liveRouting';
import type { RoutingFailure } from '../src/features/route/routingOutcome';
import { currentPosition, type OriginPoint } from '../src/features/route/origin';
import { resolveSectorName } from '../src/features/map/sectorNaming';
import { PLANNER_INTENTIONS, type PlannedLoop, type PlannerIntention } from '../src/features/route/types';
// `tNow` = résolution hors composant (helpers module) ; le composant utilise
// useT() (réactif — re-rend à la bascule de langue, ce qui rafraîchit aussi
// les helpers appelés pendant le rendu).
import { C } from '../src/i18n/catalog/route';
import { t as tNow, useT } from '../src/i18n/store';

/** Hauteur de la carte — MESURE DE COMPOSITION, pas une règle de jeu. */
const MAP_HEIGHT = 250;

/**
 * Écart (km) en deçà duquel un format est considéré comme « celui en cours ».
 * MESURE DE COMPOSITION : sans tolérance, aucun format n'apparaîtrait jamais
 * sélectionné (le routeur ne rend jamais exactement la distance demandée).
 */
const PLAN_MATCH_TOLERANCE_KM = 0.7;

/**
 * État de la géolocalisation — pilote labels, carte et bouton (jamais de
 * mensonge). QUATRE états, distincts et jamais confondus :
 *   • `unasked`  — on n'a RIEN demandé (état d'ouverture). Ce n'est ni une
 *                  recherche en cours, ni un échec : afficher « Localisation… »
 *                  ferait tourner un compteur sur un GPS éteint, et « Position
 *                  introuvable » accuserait une panne qui n'a pas eu lieu ;
 *   • `locating` — une tentative est EN COURS (déclenchée par un geste) ;
 *   • `ok`       — position confirmée ;
 *   • `error`    — la tentative a échoué (refus, capteur muet, timeout).
 * Aucun état « démo » n'est possible — c'est ce qu'il aurait fallu pour inventer
 * une origine, et l'app ne le fait plus.
 */
type GpsState = 'unasked' | 'locating' | 'ok' | 'error';

/**
 * L'app a-t-elle DÉJÀ obtenu une position depuis le lancement ? Si oui, la
 * permission est accordée et une nouvelle lecture n'ouvre AUCUNE boîte système :
 * on peut enchaîner sans geste. Sinon on ne présume rien.
 *
 * Volontairement au niveau MODULE et non persisté : c'est un fait observé dans
 * CETTE session (le seul dont on soit certain), et il s'oublie au redémarrage —
 * la permission ayant pu être retirée entre-temps dans les réglages système.
 */
let positionProvenThisSession = false;

/**
 * 3 formats (distance) routés autour de l'origine — l'objectif courant est conservé.
 *
 * La « Recommandée » n'est PAS la constante de repli pour tout le monde : c'est la
 * distance issue de `useRouteSuggestion` (réglage manuel, sinon habitudes
 * apprises, sinon défaut assumé, et la phrase affichée dit toujours laquelle).
 * Les deux autres restent des FORMATS fixes — des alternatives explicites, pas
 * des recommandations, donc rien à personnaliser. Ils viennent de la table
 * SOURCÉE de la discipline (`plannerFormatsKm`) et non plus de deux nombres
 * écrits ici : à vélo, « Courte · 2 km » proposait une boucle incapturable.
 */
function planPresets(recommendedKm: number, activity: Activity) {
  const { shortKm, longKm } = plannerFormatsKm(activity);
  return [
    { key: 'recommandee', label: C.planRecommended, km: recommendedKm },
    { key: 'courte', label: C.planShort, km: shortKm },
    { key: 'longue', label: C.planLong, km: longKm },
  ] as const;
}

/** Icône par objectif (la couleur dit un RÔLE, l'icône double toujours le sens). */
const INTENTION_ICON: Record<PlannerIntention, IconName> = {
  conquerir: 'cible',
  defendre: 'bouclier',
};

/**
 * POURQUOI CETTE DISTANCE — une phrase, dérivée de la MÊME `RouteSuggestion` qui
 * a fixé la distance. Écran et décision ne peuvent donc pas diverger : c'est ce
 * découplage qui avait produit « Adaptée à tes habitudes » sur une constante.
 * Les 3 sources (appris / défaut assumé / réglage manuel) sont toutes explicites.
 * `null` si la distance elle-même n'est pas formatable — on ne rend alors aucune
 * ligne plutôt qu'une phrase avec un trou.
 */
function suggestionWhy(s: RouteSuggestion): string | null {
  const km = formatKm(s.km);
  if (km === null) return null;
  if (s.source === 'manual') return tNow(C.whyManual, { km });
  if (s.source === 'learned') return tNow(C.whyLearned, { km, n: s.sampleRuns ?? 0 });
  const remaining = runsBeforeLearning(s);
  if (remaining !== null && remaining > 0) return tNow(C.whyDefaultLearning, { km, n: remaining });
  if (s.cause === 'off') return tNow(C.whyDefaultOff, { km });
  return tNow(C.whyDefaultUnknown, { km });
}

const UI = defineCatalog({ title: { fr: 'Planifier une boucle', en: 'Plan a loop', es: 'Planificar un circuito', de: 'Runde planen', pt: 'Planejar uma volta' } });

function SectionHead({ icon, label, right }: { icon: IconName; label: string; right?: React.ReactNode }) {
  return <View style={styles.sectionHead}><Icon name={icon} size={18} color={c.darkMuted} /><Text style={styles.sectionTitle}>{label}</Text>{right}</View>;
}

/** Same choice callbacks as the former segment group, presented as open rows. */
function PlannerChoices<Id extends string>({ options, value, onChange, accessibilityLabel }: {
  options: readonly { id: Id; label: string; icon?: IconName }[]; value: Id; onChange: (id: Id) => void; accessibilityLabel: string;
}) {
  return <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>{options.map(option => <Pressable key={option.id} accessibilityRole="tab" accessibilityState={{ selected: option.id === value }} accessibilityLabel={option.label} onPress={() => { if (option.id === value) return; haptics.light(); onChange(option.id); }} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>{option.icon ? <Icon name={option.icon} size={18} color={c.darkMuted} /> : null}<Text style={[styles.choiceText, option.id === value && styles.choiceSelected]}>{option.label}</Text><GrydIcon name={option.id === value ? 'check' : 'chevronRight'} size={17} color={option.id === value ? c.darkInk : c.darkMuted} /></Pressable>)}</View>;
}

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT();
  const params = useLocalSearchParams<{ type?: string; activity?: string }>();

  /**
   * DISCIPLINE DE CET ÉCRAN, déclarée par le chemin qui l'a ouvert. Lecture
   * DÉFENSIVE (`parseStartActivity`) : une valeur inconnue ou absente vaut
   * course à pied, donc tout lien existant garde son sens exact. Cet écran ne
   * lit AUCUNE préférence de carte — l'interdit du 25/07 (une préférence
   * d'affichage ne décide jamais en silence de la nature d'un effort) vaut ici
   * autant qu'au départ.
   */
  const activity: Activity = parseStartActivity(params[START_ACTIVITY_PARAM]);
  /**
   * LES TEXTES QUI NOMMENT L'EFFORT, dans la discipline de CET écran. Ils
   * partent ensemble : les dériver séparément permettrait qu'un seul reste en
   * arrière, et l'écran se contredirait à nouveau — c'est exactement ce qui
   * s'est produit (le kicker disait déjà la discipline, ces trois-là non).
   */
  const disciplineCopy = plannerDisciplineCopy(activity);
  /** Bornes de LA DISCIPLINE (game-rules) — plus aucun nombre écrit à la main. */
  const bounds = plannerBounds(activity);
  const clampKm = (km: number) => clampPlannerKm(activity, km);

  // Origine : `null` tant que rien n'est confirmé — aucun tracé fantôme Paris.
  const [origin, setOrigin] = useState<OriginPoint | null>(null);
  // Ouverture : on n'a rien demandé, et on ne prétend pas chercher.
  const [gps, setGps] = useState<GpsState>('unasked');
  const [intention, setIntention] = useState<PlannerIntention>(
    params.type === 'defense' ? 'defendre' : 'conquerir',
  );
  const [targetKm, setTargetKm] = useState(bounds.minKm);
  const [distanceDraft, setDistanceDraft] = useState('');
  const [seed, setSeed] = useState(1);
  const [route, setRoute] = useState<PlannedLoop | null>(null);
  const [routing, setRouting] = useState(false);
  /**
   * Cause OBSERVEE du dernier echec de routage, `null` si la derniere
   * tentative a reussi ou si rien n'a encore ete tente. Elle decide si
   * « Recalculer » a la moindre chance d'aboutir (`sameRequestCanSucceed`).
   */
  const [routeFailure, setRouteFailure] = useState<RoutingFailure | null>(null);
  const [nearby, setNearby] = useState<PlannedLoop[]>([]);
  // Distingue « en cours de calcul » de « aucune variante » : sans ce flag, une
  // liste vide (échec réseau) était indistinguable d'un chargement.
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Distance PROPOSÉE + son allure + leur raison (features/route/suggestion.ts).
  // Une seule source : la phrase affichée ne peut pas contredire le chiffre.
  const { suggestion, loading: suggestionLoading } = useRouteSuggestion(activity);

  // Formats : la « Recommandée » porte la distance PERSONNALISÉE.
  const presets = planPresets(suggestion.km, activity);

  const reqIdRef = useRef(0);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Le premier routage n'a lieu qu'une fois, quand la suggestion est connue. */
  const bootedRef = useRef(false);

  /** Route en LIVE autour d'une origine explicite (garde le tracé courant pendant le calcul). */
  const applyRoute = (o: OriginPoint, km: number, intent: PlannerIntention, sd: number) => {
    const c = clampKm(km);
    setIntention(intent);
    setTargetKm(c);
    setSeed(sd);
    const id = ++reqIdRef.current;
    setRouting(true);
    // La discipline décide le PROFIL de routage : un cycliste routé au profil
    // piéton reçoit un tracé que personne ne peut suivre (escaliers, passages).
    // `routeLoopOutcome` DIT pourquoi quand il échoue, là où `routeLoop` rendait
    // un `null` muet. La cause OBSERVÉE est conservée : sans elle, le bouton
    // proposait « Recalculer le tracé » même quand le routeur avait répondu
    // qu'il n'y a pas de boucle ici — refaire la même demande rendrait la même
    // absence, donc un CTA qui ne peut pas aboutir (§A4, aucun bouton mort).
    void routeLoopOutcome(o.point, o.label, c, intent, sd, activity)
      .then((outcome) => {
        if (id !== reqIdRef.current) return;
        setRouting(false);
        if (outcome.ok) {
          setRouteFailure(null);
          setRoute(outcome.loop);
          setTargetKm(outcome.loop.distanceKm);
          setDistanceDraft(formatKm(outcome.loop.distanceKm) ?? '');
        } else {
          // Jamais de compteur infini : on arrête le chargement, le tracé
          // courant reste, et la CAUSE est retenue pour le libellé du bouton.
          setRouteFailure(outcome.failure);
          toast.show(tNow(C.toastRouteUnavailable));
        }
      })
      .catch(() => {
        // Rejet réseau/serveur : même filet honnête (sans ce catch, setRouting
        // resterait à true → attente sans fin + unhandled rejection). Le routeur
        // n'a PAS parlé : réessayer peut donc réussir.
        if (id !== reqIdRef.current) return;
        setRouting(false);
        setRouteFailure('unreachable');
        toast.show(tNow(C.toastRouteUnavailable));
      });
  };

  const applyDebounced = (o: OriginPoint, km: number, intent: PlannerIntention, sd: number) => {
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    setRouting(true);
    liveTimerRef.current = setTimeout(() => applyRoute(o, km, intent, sd), 450);
  };

  /**
   * Localise (GPS) + nomme + route.
   *
   * Échec (refus, capteur muet, hors couverture, timeout) → état `error`, sur
   * TOUTES les plateformes : origine `null`, aucun tracé, aucune boucle, et le
   * bouton unique bascule sur « Réessayer la localisation ». Un plan de course
   * ne peut pas être calculé depuis un endroit où le joueur n'est pas ; ne rien
   * afficher et le dire est la seule réponse vraie.
   */
  const locateAndRoute = (km: number, intent: PlannerIntention, sd: number) => {
    setGps('locating');
    void currentPosition()
      .then(async (pos) => {
        if (!pos) {
          setGps('error');
          toast.show(tNow(C.toastPositionNotFound));
          return;
        }
        // Position CONFIRMÉE → nom RÉEL du secteur (quartier/village, PARTOUT en
        // Europe) via reverse-geocode + hiérarchie de repli + cache. Clé de cache
        // ~ granularité secteur (coords arrondies) ; « Ma position » ne sert que
        // si aucun nom OSM (réseau HS) — jamais un faux lieu.
        // Une position est arrivée : la permission est donc accordée pour cette
        // session — les prochaines ouvertures n'ouvriront pas de boîte.
        positionProvenThisSession = true;
        // `currentPosition()` rend depuis le 28/07/2026 un `PositionFix`
        // — le point ET sa précision — parce que le planificateur fait de ce
        // point le DÉPART d'une boucle : un fix à 40 m décale ce départ d'une
        // rue. Seules les coordonnées servent ici ; `accuracyM` reste
        // disponible pour l'écran qui voudra la dire.
        const point = pos.point;
        const key = `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`;
        const label = await resolveSectorName(point, key, tNow(C.myPosition));
        const o = { point, label };
        setGps('ok');
        setOrigin(o);
        applyRoute(o, km, intent, sd);
      })
      .catch(() => {
        // Rejet inattendu (permission qui throw, reverse-geocode qui rejette) :
        // sans ce filet l'écran resterait sur « Localisation… » indéfiniment —
        // une attente sans fin est le troisième mensonge (on n'avoue pas l'échec).
        setGps('error');
        toast.show(tNow(C.toastPositionNotFound));
      });
  };

  useEffect(() => {
    screen('route_planner', { type: params.type ?? 'direct' });
    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Premier rendu : on ATTEND la suggestion (réglage manuel / habitudes /
  // défaut) avant de router. Router d'abord sur la constante de repli puis
  // re-router sur la vraie distance ferait clignoter un tracé que personne n'a
  // demandé, et afficherait une seconde une « recommandation » qui n'est celle
  // de personne. `suggestionLoading` retombe TOUJOURS à false (échec inclus →
  // défaut assumé), donc ce garde-fou ne peut pas bloquer l'écran.
  //
  // ⚠ ET SURTOUT : ce démarrage NE DEMANDE PAS la permission (cf. entête). Il
  // n'enchaîne que si l'app a déjà obtenu une position dans cette session —
  // auquel cas aucune boîte système ne s'ouvrira. Sinon on reste en `unasked` :
  // l'écran est complet et lisible (formats, distance recommandée, sa raison),
  // il attend juste le geste qui autorise la localisation.
  useEffect(() => {
    if (suggestionLoading || bootedRef.current) return;
    bootedRef.current = true;
    setTargetKm(clampKm(suggestion.km));
    setDistanceDraft(formatKm(clampKm(suggestion.km)) ?? '');
    if (!positionProvenThisSession) return;
    const intent: PlannerIntention = params.type === 'defense' ? 'defendre' : 'conquerir';
    locateAndRoute(suggestion.km, intent, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionLoading]);

  // Variantes (autres boucles) : 3 boucles routées LIVE autour de l'origine connue.
  useEffect(() => {
    if (!adjustOpen || !origin) return;
    let cancelled = false;
    const spreads = [0.6, 1.35, 1.9];
    setNearbyLoading(true);
    void Promise.all(
      spreads.map((s, i) =>
        routeLoop(
          origin.point,
          origin.label,
          clampKm(targetKm * s),
          intention,
          seed * 10 + i + 2,
          activity,
        ),
      ),
    )
      .then((list) => {
        if (cancelled) return;
        setNearby(list.filter((r): r is PlannedLoop => r !== null));
        setNearbyLoading(false);
      })
      .catch(() => {
        // Rejet réseau/serveur : liste vide + fin de chargement (jamais une
        // attente sans fin). L'état vide affiche un message re-tentable.
        if (cancelled) return;
        setNearby([]);
        setNearbyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adjustOpen, origin, targetKm, intention, seed, activity]);

  const recentrer = () => {
    haptics.light();
    locateAndRoute(targetKm, intention, seed);
  };

  /** Relance le calcul du tracé sur l'origine déjà confirmée (routeur muet). */
  const recomputeRoute = () => {
    if (!origin) return;
    haptics.light();
    applyRoute(origin, targetKm, intention, seed);
  };

  /** Choisir un format change la DISTANCE, jamais l'objectif courant. */
  const selectPreset = (key: string) => {
    const preset = presets.find((p) => p.key === key);
    if (!preset) return;
    if (origin) applyRoute(origin, preset.km, intention, seed);
    else locateAndRoute(preset.km, intention, seed);
  };

  const selectIntention = (intent: PlannerIntention) => {
    if (intent === intention || !origin) return;
    applyRoute(origin, targetKm, intent, seed);
  };

  const stepDistance = (delta: number) => {
    if (!origin) return;
    haptics.light();
    const nk = clampKm(targetKm + delta);
    setDistanceDraft(formatKm(nk) ?? '');
    applyRoute(origin, nk, intention, seed);
  };

  const onDistanceType = (text: string) => {
    setDistanceDraft(text);
    if (!origin) return;
    const parsed = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(parsed)) applyDebounced(origin, parsed, intention, seed);
  };

  const onDistanceBlur = () => {
    if (route) setDistanceDraft(formatKm(route.distanceKm) ?? '');
  };

  const adoptNearby = (id: string) => {
    const loop = nearby.find((l) => l.id === id);
    if (!loop) return;
    setRoute(loop);
    setTargetKm(loop.distanceKm);
    setDistanceDraft(formatKm(loop.distanceKm) ?? '');
  };

  const shuffleNearby = () => {
    haptics.light();
    setNearby([]);
    setNearbyLoading(true); // feedback immédiat : la ligne d'état remplace la liste.
    setSeed((s) => s + 1);
  };

  const startRun = () => {
    if (!route) return;
    haptics.medium();
    // Le tracé n'est PAS transmis à la course : `ingest_run` décide la capture
    // sur la boucle réellement fermée, jamais sur le respect d'un itinéraire
    // conseillé (E07). Passer un « parcours armé » l'aurait laissé croire.
    //
    // La DISCIPLINE, elle, voyage — c'est tout le correctif du 26/07. Ce bouton
    // poussait `/course-live?mode=conquete&intention=…` sans déclaration : une
    // sortie préparée en vélo, sur des distances vélo, partait enregistrée
    // comme une course à pied. `plannerStartHref` porte la même déclaration que
    // le GO de la Carte, et le préflight l'affiche avant le premier mètre.
    router.push(plannerStartHref(intention, activity));
  };

  const intentionLabel = t(PLANNER_INTENTION_LABELS[intention]);
  /** Nom de la discipline en toutes lettres (5 langues) — pour les lecteurs d'écran. */
  const activityName = t(ACTIVITY_NAME[activity]);
  const reasons = route ? generatedReasons(route.distanceKm, activity) : [];

  // Format effectivement en cours = le plus proche du tracé, et lui seul —
  // à condition de rester dans la tolérance (sinon aucun format n'est « choisi »).
  const nearestPlan = route
    ? presets.reduce<{ key: string; d: number }>(
        (best, p) => {
          const d = Math.abs(route.distanceKm - p.km);
          return d < best.d ? { key: p.key, d } : best;
        },
        { key: '', d: Number.POSITIVE_INFINITY },
      )
    : { key: '', d: Number.POSITIVE_INFINITY };
  const selectedPlanKey = nearestPlan.d < PLAN_MATCH_TOLERANCE_KM ? nearestPlan.key : '';

  // Un segment par format, libellé « Recommandée · 4,5 km ». Un format dont la
  // distance ne se formate pas (valeur abîmée) DISPARAÎT plutôt que d'afficher
  // « Recommandée · ».
  const planOptions = presets.flatMap((p) => {
    const km = formatKm(p.km);
    return km === null ? [] : [{ id: p.key, label: t(C.planOption, { label: t(p.label), km }) }];
  });

  const objectiveOptions = PLANNER_INTENTIONS.map((it) => ({
    id: it,
    label: t(PLANNER_INTENTION_LABELS[it]),
    icon: INTENTION_ICON[it],
  }));

  const loopOptions = nearby.flatMap((loop, i) => {
    const km = formatKm(loop.distanceKm);
    return km === null ? [] : [{ id: loop.id, label: t(C.variantOption, { n: i + 1, km }) }];
  });

  // ── DURÉE : l'allure MESURÉE du joueur, ou rien du tout ──────────────────
  const minutes = route ? estimatedMinutes(route.distanceKm, suggestion.paceSKm) : null;
  const routeKm = route ? formatKm(route.distanceKm) : null;
  const metrics: SheetMetric[] = [];
  for (const key of plannerMetricKeys({ distanceKm: route?.distanceKm ?? null, minutes })) {
    if (key === 'distance' && routeKm !== null) {
      metrics.push({ key, value: `${routeKm} km`, label: t(C.estDistance) });
    }
    if (key === 'duration' && minutes !== null) {
      metrics.push({ key, value: `~${minutes} min`, label: t(C.estDuration) });
    }
  }

  // Labels honnêtes par état GPS — quatre états, quatre discours. En `unasked`
  // on n'annonce ni recherche (« Localisation… » ferait tourner un compteur sur
  // un GPS éteint) ni échec : la ligne DÉPART nomme ce que le geste va donner.
  const gpsPending = gps === 'unasked' || gps === 'error';
  // Loi 15 : un segment SANS SOURCE disparaît. Tant qu'aucune position n'est
  // confirmée, il n'y a pas de lieu — le kicker se réduit alors à l'objectif au
  // lieu d'aller chercher un libellé d'état. « CONQUÉRIR · POSITION
  // INTROUVABLE » répétait en sur-titre ce que la ligne de contexte, le champ
  // DÉPART, sa note et le toast disaient déjà : quatre fois la même phrase.
  const placeLabel = route?.zone ?? origin?.label ?? null;
  // La DISCIPLINE est dite ici, TOUJOURS et dans les deux mondes : c'est
  // l'endroit où le joueur lit déjà ce qu'il prépare, et l'écran entier (ses
  // distances, son tracé) en dépend. Le libellé est l'INVARIANT du commutateur
  // de la Carte (RUN / BIKE) — le même mot au même endroit du cerveau, et il ne
  // respire pas différemment selon la langue (§A9). Le nom en toutes lettres,
  // lui, est porté par le libellé d'accessibilité du CTA.
  const kickerText = [intentionLabel, ACTIVITY_LABELS[activity], placeLabel]
    .filter((s): s is string => !!s)
    .join(' · ');
  const originLabel =
    gps === 'locating'
      ? t(C.locating)
      : gps === 'error'
        ? t(C.positionNotFound)
        : gps === 'unasked'
          ? t(C.myPosition)
          : (origin?.label ?? t(C.myPosition));
  const originHint =
    gps === 'ok' ? t(C.hintGpsOk) : gps === 'error' ? t(C.hintGpsError) : t(C.hintGpsLocating);
  // Ligne de contexte : ce qu'il reste de vrai après la purge des zones/points.
  const summaryText = route
    ? minutes !== null
      ? t(C.summaryDuration, { min: minutes })
      : t(C.summaryNoPace)
    : gps === 'error'
      ? t(C.summaryGpsError)
      : t(C.summaryWaitingPosition);
  const whyLine = suggestionLoading ? null : suggestionWhy(suggestion);

  // ── LE BOUTON UNIQUE : toujours un geste possible (jamais un CTA mort) ────
  const cta: PlannerCtaKind = plannerCta({ gps, hasRoute: route !== null, routing, failure: routeFailure });
  const ctaLabel =
    cta === 'start'
      ? intentionLabel
      : cta === 'retryLocation'
        ? t(C.retryLocation)
        : cta === 'retryRoute'
          ? t(C.retryRoute)
          : t(C.myPosition);
  const ctaMicro =
    cta === 'start'
      ? t(C.ctaGpsAfterCountdown)
      : cta === 'routing'
        ? t(C.mapComputing)
        : cta === 'retryRoute'
          ? t(C.toastRouteUnavailable)
          : t(C.ctaPositionRequired);
  const ctaAnalyticsId =
    cta === 'start'
      ? 'route_planner_start'
      : cta === 'retryRoute'
        ? 'route_planner_route_retry'
        : 'route_planner_locate';
  // `ctaStartsRun` plutôt qu'une comparaison littérale : le seul état qui engage
  // le joueur est défini (et testé) à côté de la décision, pas ici.
  const onCtaPress = () => {
    if (ctaStartsRun(cta)) startRun();
    else if (cta === 'retryRoute') recomputeRoute();
    else recentrer();
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t(C.back)} onPress={() => goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><GrydIcon name="chevronLeft" size={20} color={c.darkInk} /></Pressable>
        <Text style={styles.title}>{t(UI.title)}</Text>
        <View style={styles.back}><GrydIcon name={activity} size={20} color={c.darkMuted} accessibilityLabel={activityName} /></View>
      </View>
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>{kickerText}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={gps === 'error' ? t(C.retryLocation) : t(C.a11yRecenter)} onPress={recentrer} style={({ pressed }) => [styles.originRow, pressed && styles.pressed]}>
          <GrydIcon name="location" size={18} color={gps === 'ok' ? c.accent : c.darkMuted} />
          <View style={styles.originCopy}><Text style={styles.originKicker}>{t(C.secStart)}</Text><Text style={styles.originLabel}>{originLabel}</Text></View>
          {gps === 'locating' ? <ActivityIndicator size="small" color={c.darkInk} /> : <GrydIcon name="arrowUpRight" size={18} color={gpsPending ? c.darkMuted : c.darkInk} />}
        </Pressable>
        {gps === 'error' ? <Text style={styles.hint}>{originHint}</Text> : null}
        {route && origin ? <View style={styles.mapWrap}><RoutePlannerMap route={route} origin={origin.point} />{routing ? <View style={styles.routingState}><ActivityIndicator size="small" color={c.darkInk} /><Text style={styles.stateInline}>{t(C.mapComputing)}</Text></View> : null}</View> : <View style={styles.mapEmpty}><GrydIcon name="route" size={24} color={c.darkMuted} /><Text style={styles.emptyTitle}>{gps === 'locating' ? t(C.locating) : routing ? t(C.mapComputing) : t(C.mapPreviewEmpty)}</Text></View>}
        {metrics.length > 0 ? <View style={styles.metricsWrap} testID="planner-metrics">{metrics.map(metric => <View key={metric.key} style={styles.metric}><Text style={styles.metricValue}>{metric.value}</Text><Text style={styles.metricLabel}>{metric.label}</Text></View>)}</View> : null}
        {route ? <Text style={styles.hint}>{summaryText}</Text> : null}

        <SectionHead icon="route" label={t(C.secFormats)} />
        <PlannerChoices options={planOptions} value={selectedPlanKey} onChange={selectPreset} accessibilityLabel={t(C.a11yFormatsGroup)} />
        {whyLine !== null ? <Text style={styles.hint}>{whyLine}</Text> : null}
        {reasons.length > 0 ? <View style={styles.reasonRow}>{reasons.map(reason => <View key={reason.fr} style={styles.reason}><GrydIcon name="check" size={13} color={c.darkMuted} /><Text style={styles.reasonText}>{t(reason)}</Text></View>)}</View> : null}

        {origin ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: adjustOpen }} accessibilityLabel={t(disciplineCopy.adjust)} onPress={() => { haptics.light(); setAdjustOpen(o => !o); }} style={({ pressed }) => [styles.adjustHead, pressed && styles.pressed]}><GrydIcon name="settings" size={18} color={c.darkMuted} /><Text style={styles.adjustLabel}>{t(disciplineCopy.adjust)}</Text><GrydIcon name={adjustOpen ? 'minus' : 'plus'} size={18} color={c.darkMuted} /></Pressable> : null}
        {origin && adjustOpen ? <View style={styles.adjustBody}>
          <SectionHead icon="cible" label={t(C.secObjective)} />
          <PlannerChoices options={objectiveOptions} value={intention} onChange={selectIntention} accessibilityLabel={t(disciplineCopy.objectiveA11y)} />
          <SectionHead icon="reglages" label={t(C.secExactDistance)} />
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(C.a11yDecreaseDistance)} onPress={() => stepDistance(-bounds.stepKm)} style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}><GrydIcon name="minus" size={20} color={c.darkInk} /></Pressable>
            <View style={styles.stepValue}><TextInput value={distanceDraft} onChangeText={onDistanceType} onBlur={onDistanceBlur} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={t(C.a11yDistanceKm)} style={styles.stepInput} placeholderTextColor={c.darkMuted} /><Text style={styles.stepUnit}>km</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={t(C.a11yIncreaseDistance)} onPress={() => stepDistance(bounds.stepKm)} style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}><GrydIcon name="plus" size={20} color={c.darkInk} /></Pressable>
          </View>
          <Text style={styles.hint}>{t(C.distanceRangeHint, { min: formatKm(bounds.minKm) ?? '', max: formatKm(bounds.maxKm) ?? '' })}</Text>
          <SectionHead icon="boucle_fermee" label={t(C.secOtherLoops)} right={<Pressable accessibilityRole="button" accessibilityLabel={t(C.a11yRegenerate)} onPress={shuffleNearby} style={({ pressed }) => [styles.sectionLink, pressed && styles.pressed]}><Text style={styles.sectionLinkLabel}>{t(C.regenerate)}</Text></Pressable>} />
          {nearbyLoading ? <Text style={styles.stateInline}>{t(C.loopsComputing)}</Text> : loopOptions.length === 0 ? <Text style={styles.stateInline}>{t(C.loopsUnavailable)}</Text> : <PlannerChoices options={loopOptions} value={route?.id ?? ''} onChange={adoptNearby} accessibilityLabel={t(C.a11yLoopsGroup)} />}
        </View> : null}
      </ScrollView>
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.ctaMicro}>{ctaMicro}</Text>
        <View style={styles.ctaButton}><Button label={ctaLabel} onPress={onCtaPress} variant="primary" size="md" accessibilityLabel={cta === 'start' ? t(C.a11yStart, { verb: `${intentionLabel} · ${activityName}` }) : ctaLabel} loading={cta === 'routing' || gps === 'locating'} analyticsId={ctaAnalyticsId} /></View>
      </View>
      <ToastHost state={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon }, header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 24, color: c.darkInk }, kicker: { fontFamily: fonts.text, fontSize: 11, lineHeight: 17, color: c.darkMuted, marginBottom: 10 },
  panel: { flex: 1 }, panelContent: { paddingHorizontal: 20, paddingBottom: 24 }, originRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, originCopy: { flex: 1, paddingVertical: 10, gap: 3 }, originKicker: { fontFamily: fonts.text, fontSize: 10, lineHeight: 15, color: c.darkMuted }, originLabel: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.darkInk },
  mapWrap: { height: MAP_HEIGHT, marginHorizontal: -20, marginTop: 16, backgroundColor: c.darkSurface }, mapEmpty: { minHeight: 116, paddingHorizontal: 20, paddingVertical: 26, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, emptyTitle: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.darkMuted }, routingState: { position: 'absolute', left: 16, top: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.carbon, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16 },
  metricsWrap: { flexDirection: 'row', gap: 24, paddingTop: 18 }, metric: { flex: 1, gap: 4 }, metricValue: { fontFamily: fonts.displayRegular, fontSize: 25, lineHeight: 31, fontVariant: ['tabular-nums'], color: c.darkInk }, metricLabel: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 6 }, sectionTitle: { flex: 1, fontFamily: fonts.displayRegular, fontSize: 16, lineHeight: 22, color: c.darkInk }, sectionLink: { minHeight: 44, justifyContent: 'center' }, sectionLinkLabel: { fontFamily: fonts.text, fontSize: 12, color: c.darkInk }, choice: { minHeight: 52, flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, choiceText: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted }, choiceSelected: { fontFamily: fonts.textMedium, color: c.darkInk },
  hint: { fontFamily: fonts.text, fontSize: 12, lineHeight: 19, color: c.darkMuted, marginTop: 10 }, stateInline: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted }, reasonRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 14 }, reason: { flexDirection: 'row', alignItems: 'center', gap: 5 }, reasonText: { fontFamily: fonts.text, fontSize: 11, lineHeight: 17, color: c.darkMuted },
  adjustHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, marginTop: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, adjustLabel: { flex: 1, fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.darkInk }, adjustBody: { paddingBottom: 8 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.darkSurface }, stepValue: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, stepInput: { fontFamily: fonts.displayRegular, fontSize: 23, lineHeight: 30, color: c.darkInk, textAlign: 'right', minWidth: 54, padding: 0 }, stepUnit: { fontFamily: fonts.text, fontSize: 13, color: c.darkMuted },
  ctaButton: { flexShrink: 1, maxWidth: '65%' }, ctaBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, gap: 10, backgroundColor: c.carbon, borderTopWidth: 1, borderColor: c.darkSurfaceMuted }, ctaMicro: { flex: 1, fontFamily: fonts.text, fontSize: 11, lineHeight: 17, color: c.darkMuted }, pressed: { opacity: 0.7 },
});
