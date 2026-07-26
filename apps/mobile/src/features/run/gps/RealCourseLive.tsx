/**
 * GRYD — E07 « LIVE RUN · CONQUÊTE » (planche Vague 1, recalage du 25/07/2026).
 *
 * OBJECTIF DE L'ÉCRAN : courir SANS MANIPULER LE TÉLÉPHONE. Hiérarchie stricte
 * de la planche — 1 tracé · 2 fermeture · 3 distance restante · 4 temps/allure ·
 * 5 pause. La carte est DOMINANTE (plein écran), la position est posée à 62 % de
 * la hauteur (l'espace devant), les trois métriques tiennent en bandeau haut, la
 * fermeture est DESSINÉE sur la carte, et la Pause est le seul geste sous le
 * pouce. Texte court, zéro carrousel, aucune animation complexe en course.
 *
 * ─── POINT DE VÉRITÉ (planche, mot pour mot) ────────────────────────────────
 * « L'itinéraire conseillé est purement indicatif : la capture est calculée sur
 *   la boucle réellement fermée, jamais sur le respect du tracé. En course
 *   libre, aucun pointillé n'est affiché. »
 * C'est la raison pour laquelle GRYD n'affiche AUCUN itinéraire conseillé ici,
 * et donc AUCUNE alerte « hors tracé » : depuis le 21/07/2026 (A-47) il n'existe
 * plus d'itinéraire dans l'app — sans référent, « hors tracé » n'aurait aucun
 * sens, et une flèche « rejoignez le tracé » serait un contrôle mort.
 * Même raisonnement pour l'alerte RIVAL de la planche : GRYD ne publie AUCUNE
 * position live d'autrui, et le seul rival réel connu arrive dans la réponse
 * d'`ingest_run`, donc APRÈS la course. La peindre exigerait de fabriquer une
 * présence — elle est omise, et vit en E09 où elle est vraie.
 *
 * ─── LA CARTE EST REVENUE, ET ELLE EST HONNÊTE ──────────────────────────────
 * L'écran n'avait plus de fond de carte depuis A-47, pour une raison qui a
 * cessé d'être vraie : la seule carte de course qui ait existé était bâtie sur
 * les polylignes d'authoring du planner, pas sur le tracé MESURÉ. Ce n'est plus
 * le cas — `snapshot.traceSegments` EST la trace mesurée, coupée aux trous de
 * signal. Ce qui a été mesuré se peint plein (§B casing/glow/core) ; ce qui
 * relie deux tronçons n'a jamais été parcouru sous mesure et se peint en
 * pointillé (planche : « GPS faible → tracé incertain pointillé »).
 *
 * Ce que l'écran ne fait toujours PAS, et le dit :
 *  - pas de son (aucune dépendance audio dans l'app : un bouton son serait mort) ;
 *  - pas de Motion Trust (podomètre) — jamais une fausse jauge ;
 *  - la jauge GPS TRUST et la pill GRYD VERIFIED ont quitté la course : elles
 *    faisaient doublon avec l'antenne de signal et n'étaient actionnables par
 *    personne en courant (§A « comprendre l'écran en < 3 s »). Le GPS Trust
 *    reste MESURÉ et part au serveur — il n'est simplement plus peint ici.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  type Activity,
  GPS_SIGNAL_LOST_AFTER_S,
  colors,
  fonts,
  fontSizes,
  gameColors,
  iconSizes,
  motion,
  radii,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { ACTIVITY_NAME, C, RUN_GPS_COPY } from '../../../i18n/catalog/runGps';
import { useT } from '../../../i18n/store';
import type { Entry } from '../../../i18n/types';
import { screen } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
// Table de LIBELLÉS invariants (RUN / BIKE), la même que le commutateur de la
// Carte : le joueur retrouve ici le mot exact qu'il a validé au préflight.
// Aucune préférence n'est lue (garde-fou de `runActivity.test.ts`).
import { ACTIVITY_LABELS } from '../../../ui/activityLens';
import { Icon } from '../../../ui/Icon';
import { ProgressBar } from '../../../ui/ProgressBar';
import { SignalBars } from '../../../ui/SignalBars';
import { signalLevel } from '../../../ui/signalLevel';
import { decimalSeparator, formatInt } from '../../../ui/format';
import { RealMap, type RealMapGeoJSONLayer, type RealMapMarker } from '../../../ui/game/RealMap';
import { TRACE_DASH, TRACE_WIDTH_STOPS, runTraceLayers, traceStyle } from '../../map/mapStyle';
import { RUN_MODE_LABEL, formatClock, formatKm, type LiveRunMode } from '../simulation';
// La 3ᵉ métrique du bandeau est DÉRIVÉE (grandeur de la discipline + absence de
// mesure), donc pure et testée — jamais un `formatPace` appliqué à un zéro.
import { liveRateDisplay } from './liveRate';
import type { RealRunApi } from './gateTypes';
// Le passage de relais vers le Résultat est PUR et TESTÉ (aller-retour de
// sérialisation prouvé) : c'est le seul moyen qu'une clé oubliée dans l'objet
// `params` — la discipline, en l'occurrence — échoue quelque part.
import { courseResultParams } from './resultHandoff';
import { LoopClosureSequence } from './LoopClosureSequence';
import { roundLoopM } from './engine/loopHint';
import {
  INITIAL_LOOP_CLOSURE,
  loopClosurePhase,
  loopClosureProgress,
  loopMissingM,
  progressPercent,
  stepLoopClosure,
  type LoopClosureMemory,
  type LoopClosurePhase,
} from './engine/loopClosure';
import {
  isHighSpeed,
  liveCameraCenter,
  uncertainLinks,
  type LatLng,
  type LiveCamera,
  type ScreenBox,
} from './engine/liveView';
import { selectLiveNotice } from './liveNotice';
import {
  BackgroundHelpSheet,
  BackgroundRationaleCard,
  GpsSignalPill,
  PreciseLocationBanner,
  RestoreRunCard,
} from './GpsStatusUI';

/**
 * Zoom de la carte live (présentation, pas une règle) : niveau RUE — c'est
 * l'échelle où la trace-héros a sa pleine largeur (§B) et où « l'espace devant »
 * représente vraiment les prochaines minutes de course.
 */
const LIVE_ZOOM = 16.4;
/** Planche E07 : la position du coureur est posée à 62 % de la hauteur. */
const LIVE_ANCHOR_RATIO = 0.62;
/** Diamètre du bouton PAUSE (planche : cercle 60) — l'unique chartreuse d'action. */
const PAUSE_SIZE = 60;
/** Diamètre des contrôles secondaires (verrou, aide, terminer). */
const SMALL_CONTROL_SIZE = 48;

/**
 * Libellé de la pill principale selon la phase réelle (toujours visible).
 *
 * E14 — deux états DÉPENDENT de la discipline, et ce n'est pas cosmétique :
 * afficher « EN COURSE » / « RUNNING » pendant une sortie vélo est faux au sens
 * littéral, et un écran qui nomme mal ce qu'il enregistre ment discrètement.
 * Les états neutres (EN PAUSE, PAUSE AUTO, RECHERCHE GPS) restent partagés :
 * les décliner par discipline ajouterait dix chaînes pour zéro information.
 */
function statusLabel(run: RealRunApi): Entry {
  const s = run.snapshot;
  const copy = RUN_GPS_COPY[run.activity];
  if (s.phase === 'paused-user') return C.statusPaused;
  // Retour terrain 20/07 : « EN PAUSE AUTO » seul se lisait comme un problème
  // GPS. On dit POURQUOI (l'arrêt) et COMMENT reprendre — pas un bug, un état.
  if (s.phase === 'paused-auto') return C.statusPausedAuto;
  if (s.phase === 'finished') return copy.statusFinished;
  if (s.totalFixes === 0) return C.statusSearchingGps;
  return copy.status;
}

/** FeatureCollection de lignes (les couches de carte n'acceptent que du GeoJSON). */
function lineCollection(lines: readonly (readonly LatLng[])[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines
      .filter((line) => line.length >= 2)
      .map((line) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: line.map((p) => [p.lng, p.lat]),
        },
      })),
  };
}

/** Ce que la séquence E08 a besoin de savoir, figé au moment de la fermeture. */
interface ClosureShow {
  loop: readonly LatLng[];
  closurePoint: LatLng;
  camera: LiveCamera;
  box: ScreenBox;
  zonesEstimated: number;
  reduced: boolean;
}

export function RealCourseLive({ run }: { run: RealRunApi }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [helpVisible, setHelpVisible] = useState(false);
  const [locked, setLocked] = useState(false);
  const [box, setBox] = useState<ScreenBox | null>(null);
  const [closure, setClosure] = useState<ClosureShow | null>(null);
  const finishedRef = useRef(false);
  const s = run.snapshot;
  const mode = run.effectiveMode;
  /**
   * `null` = la plateforme n'a pas de réglages système à ouvrir (navigateur).
   * On ne rend alors NI le bouton Aide GPS NI la feuille d'aide : les deux
   * finissent sur « ouvrir les réglages de GRYD », qui n'existe pas dans un
   * onglet. Un bouton qui ne mène nulle part est un mensonge d'interface.
   */
  const openSettings = run.openSettings;
  /**
   * DISCIPLINE RÉELLEMENT ENREGISTRÉE. Elle pilote trois choses distinctes :
   * le mot affiché (pill permanente + libellé d'état), les SEUILS de fermeture
   * de boucle (1 km à pied, 5 km à vélo — sans elle, E08 promettrait au
   * cycliste une capture que le serveur refuserait), et la possibilité même de
   * fusionner une sortie interrompue.
   */
  const activity = run.activity;
  /**
   * TOUT ce que cet écran dit de l'effort, dans la langue de la discipline —
   * état, limites d'enregistrement, aide arrière-plan, libellés lus à voix
   * haute, grandeur de la 3ᵉ métrique. Une table plutôt que des ternaires
   * dispersés : c'est ce qui rend une surface oubliée VISIBLE (cf.
   * `RUN_GPS_COPY`, dont le Record exhaustif casse la compilation le jour où
   * une discipline arrive sans ses phrases).
   */
  const copy = RUN_GPS_COPY[activity];
  const conquest = mode === 'conquete';
  const paused = s.phase === 'paused-user';
  /**
   * LECTURE EN COURS ≠ ÉCHEC. Aucune position n'est encore arrivée : « signal
   * perdu » serait faux (on n'a rien perdu — on n'a jamais rien eu). Passé le
   * délai moteur (GPS_SIGNAL_LOST_AFTER_S, jamais un nombre en dur), on cesse
   * d'attendre en silence et on dit que rien n'arrive.
   */
  const awaitingFirstFix = s.totalFixes === 0;
  const firstFixOverdue = awaitingFirstFix && s.activeS > GPS_SIGNAL_LOST_AFTER_S;

  const start = s.tracePoints[0] ?? null;
  const here = s.tracePoints[s.tracePoints.length - 1] ?? null;

  // ── Fermeture de boucle : état PERMANENT (moteur pur, seuils SERVEUR) ──────
  const phase = loopClosurePhase({ conquest, activity, distanceM: s.distanceM, gapM: s.loopGapM });
  const progress = loopClosureProgress({
    activity,
    distanceM: s.distanceM,
    gapM: s.loopGapM,
    farthestGapM: s.farthestGapM,
  });

  /**
   * 3ᵉ MÉTRIQUE : la grandeur de la discipline (allure à pied, vitesse à vélo)
   * ET l'absence de mesure, décidées par un moteur pur. Tant que le tracker n'a
   * pas de kilomètre, `paceSPerKm` vaut 0 : ce zéro n'est pas une allure, c'est
   * « on ne sait pas encore » — il ne franchit jamais cette ligne (`liveRate`).
   */
  const rate = liveRateDisplay(activity, s.paceSPerKm, decimalSeparator());

  // §10 — UN SEUL avis temporaire à la fois (sûreté d'abord). La pill d'ÉTAT, la
  // pill de MODE et la pill de FERMETURE restent en contexte permanent ; tout le
  // reste (signal, reprise, permission, précision) passe par cette priorité unique.
  const notice = selectLiveNotice({
    pausedByUser: paused,
    permissionRevoked: run.permissionRevoked,
    awaitingFirstFix,
    firstFixOverdue,
    signal: s.signal,
    hasRestore: run.restore !== null,
    bgPrompt: run.bgPrompt,
    approxLocation: run.approxLocation,
    foregroundOnlyPlatform: run.foregroundOnlyPlatform,
  });

  useEffect(() => {
    // La discipline accompagne la vue : sans elle, la mesure d'usage de l'écran
    // live mélangerait deux mondes que le jeu sépare partout ailleurs.
    screen('course_live', { mode, gps: 'real', activity });
  }, [mode, activity]);

  // « Aucun run perdu » (analyse stratégique 21/07 — la fiabilité EST le
  // produit) : le signal GPS perdu n'était que VISUEL (pill), or un coureur
  // regarde la route, pas son écran. Transition →'lost' pendant le tracking =
  // haptique FORTE (avertissement immédiat, sans son — on ne coupe pas la
  // musique) ; récupération 'lost'→ok = haptique légère (rassure sans regarder).
  // La trace, elle, est déjà protégée (autosave 30 s + reprise après kill).
  const prevSignalRef = useRef(s.signal);
  useEffect(() => {
    const prev = prevSignalRef.current;
    prevSignalRef.current = s.signal;
    if (s.phase !== 'tracking') return; // en pause volontaire : pas d'alarme
    if (prev !== 'lost' && s.signal === 'lost') haptics.error();
    else if (prev === 'lost' && s.signal !== 'lost') haptics.light();
  }, [s.signal, s.phase]);

  // ── Caméra : suit le coureur, ancrée à 62 % (espace devant) ────────────────
  // Elle est GELÉE le temps d'E08 : sans cela l'encre projetée dériverait d'un
  // tick à l'autre et ne recouvrirait plus la boucle qu'elle prétend remplir.
  const liveCamera = useMemo<LiveCamera | null>(() => {
    if (here === null || box === null) return null;
    const center = liveCameraCenter(here, LIVE_ZOOM, box, LIVE_ANCHOR_RATIO);
    return { ...center, zoom: LIVE_ZOOM };
  }, [here?.lat, here?.lng, box?.width, box?.height]);
  const camera = closure?.camera ?? liveCamera;

  // ── E08 : déclenchement à la TRANSITION, avec anti-rebond (moteur pur) ─────
  const closureMemory = useRef<LoopClosureMemory>(INITIAL_LOOP_CLOSURE);
  const closureCtx = useRef<{
    phase: LoopClosurePhase;
    camera: LiveCamera | null;
    box: ScreenBox | null;
    loop: readonly LatLng[];
    start: LatLng | null;
    zones: number;
    speed: number | null;
  }>({ phase, camera: liveCamera, box, loop: s.tracePoints, start, zones: s.zonesEstimated, speed: s.recentSpeedMps });
  closureCtx.current = {
    phase,
    camera: liveCamera,
    box,
    loop: s.tracePoints,
    start,
    zones: s.zonesEstimated,
    speed: s.recentSpeedMps,
  };
  useEffect(() => {
    const ctx = closureCtx.current;
    const step = stepLoopClosure(closureMemory.current, ctx.phase);
    closureMemory.current = step.memory;
    if (!step.celebrate) return;
    // Rien à dessiner (carte pas encore mesurée) : on ne joue pas une séquence
    // sur du vide — la pill d'en-tête dit déjà que la boucle est fermée.
    if (ctx.camera === null || ctx.box === null || ctx.start === null) return;
    setClosure({
      loop: ctx.loop,
      closurePoint: ctx.start,
      camera: ctx.camera,
      box: ctx.box,
      zonesEstimated: ctx.zones,
      reduced: isHighSpeed(ctx.speed),
    });
  }, [phase]);

  // ── Couches de carte ──────────────────────────────────────────────────────
  const layers = useMemo<RealMapGeoJSONLayer[]>(() => {
    const out: RealMapGeoJSONLayer[] = [];
    const segments = s.traceSegments;
    if (segments.length > 0) {
      // §B — trace HÉROS : casing sombre + liseré fin + core chartreuse plein,
      // largeur interpolée par zoom. Aucune largeur en dur ici.
      out.push(...runTraceLayers('live-trace', lineCollection(segments)));
    }
    const links = uncertainLinks(segments);
    if (links.length > 0) {
      out.push({
        id: 'live-uncertain',
        data: lineCollection(links),
        // Toujours MA trace (rôle chartreuse), mais diluée et pointillée : elle
        // n'a pas été mesurée, elle ne peut pas se donner l'air de l'avoir été.
        lineColor: withAlpha(traceStyle.core, 0.45),
        // §B — même LARGEUR PAR ZOOM que le reste de la trace (gabarit « exclu »,
        // le plus fin). Sans ces paliers, le lien restait figé à 3 px : à
        // l'échelle rue de la course (z16.4) il devenait un fil sous un core
        // héros de ~22 px, et un « 3 » en dur est justement le nombre magique de
        // style que la charte interdit. Le scalaire reste un repli (fork SVG).
        lineWidthStops: TRACE_WIDTH_STOPS.excludedCore,
        lineWidth: 11,
        lineDash: TRACE_DASH.excluded,
      });
    }
    // La FERMETURE, dessinée : ce qui sépare encore la position du départ. La
    // planche E07 la veut EXPLICITE — donc au gabarit « segment manquant » (§B,
    // même largeur que la route restante), pas un filet : à l'échelle rue elle
    // doit se lire d'un coup d'œil à côté du core héros, jamais s'y perdre.
    if (phase !== 'idle' && start !== null && here !== null) {
      out.push({
        id: 'live-closure',
        data: lineCollection([[here, start]]),
        // Ambre FACTUEL quand on est revenu à portée sans fermer (nearMiss) ;
        // sinon la teinte dédiée du segment manquant (chartreuse pleine « appelle
        // à fermer », token traceStyle.missing — plus explicite que l'ex-0,85).
        lineColor: phase === 'nearMiss' ? gameColors.warn : traceStyle.missing,
        lineWidthStops: TRACE_WIDTH_STOPS.missingCore,
        lineWidth: 16,
        lineDash: TRACE_DASH.missing,
      });
    }
    return out;
  }, [s.traceSegments, phase, start?.lat, start?.lng, here?.lat, here?.lng]);

  const markers = useMemo<RealMapMarker[]>(() => {
    const out: RealMapMarker[] = [];
    if (start !== null && phase !== 'idle') {
      out.push({
        id: 'loop-start',
        lng: start.lng,
        lat: start.lat,
        children: <View style={styles.startDot} />,
      });
    }
    if (here !== null) {
      out.push({
        id: 'me',
        lng: here.lng,
        lat: here.lat,
        children: (
          <View style={styles.meHalo}>
            <View style={styles.meDot} />
          </View>
        ),
      });
    }
    return out;
  }, [start?.lat, start?.lng, here?.lat, here?.lng, phase]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.success();
    void run.finish().then(({ distanceM, durationS, uploadQueued }) => {
      // Ce qui part est exclusivement MESURÉ ou DÉCLARÉ : la distance et la
      // durée du tracker, et LA DISCIPLINE de la sortie. AUCUNE valeur estimée
      // mi-course (zones, fermeture, progression) ne franchit cette frontière —
      // le Résultat lit le verdict SERVEUR.
      //
      // LA DISCIPLINE MANQUAIT ICI, et c'était toute la fuite : sans elle, le
      // Résultat retombait sur la discipline par défaut du jeu et disait
      // « COURSE TERMINÉE » à la fin de CHAQUE sortie vélo — en démentant le
      // préflight, qui venait de montrer « sortie vélo » au même joueur. Le
      // passage de relais est désormais une fonction PURE et TESTÉE
      // (`resultHandoff.ts`) plutôt qu'un objet littéral : une clé oubliée dans
      // un littéral n'est vérifiable par rien, et c'est exactement comme ça
      // qu'un chantier entier de libellés vélo est resté inatteignable.
      // Fin hors-ligne : ligne discrète « envoi dès que possible » (anti-shame).
      router.replace({
        pathname: '/course-result',
        params: courseResultParams({ mode, activity, distanceM, durationS, uploadQueued }),
      });
    });
  };

  const modeLabel = RUN_MODE_LABEL[mode as LiveRunMode] ?? t(C.modeConquete);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) =>
      prev !== null && prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      {/* ── 1. LE TRACÉ : carte dominante, position à 62 %, nav masquée ────── */}
      {camera !== null ? (
        <View style={StyleSheet.absoluteFill} accessibilityLabel={t(copy.a11yLiveMap)}>
          <RealMap
            style={StyleSheet.absoluteFill}
            camera={camera}
            geojsonLayers={layers}
            markers={markers}
            // Carte SILENCIEUSE : les labels de quartier reculent, la trace domine.
            silent
            attributionCompact
          />
        </View>
      ) : null}

      {/* ── 2/3/4. En-tête : état · 3 métriques tabulaires · fermeture ─────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.statusRow}>
          <View style={styles.topPill}>
            <View
              style={[
                styles.liveDot,
                (paused || s.phase === 'paused-auto' || awaitingFirstFix) && styles.liveDotPaused,
              ]}
            />
            <Text style={styles.topPillText}>{t(statusLabel(run))}</Text>
            {/* Antenne de signal GPS — subtile, ambiante, façon barres de téléphone.
                Niveau + tonalité RÉELS (GPS Trust + état du tracker) : ambre si
                faible (normal en intérieur, jamais rouge/anxiogène), neutre sinon. */}
            <SignalBars {...signalLevel(s.gpsTrust, s.signal, awaitingFirstFix)} />
          </View>

          {/* ── CE QUI EST ENREGISTRÉ — contexte PERMANENT (E14) ─────────────
              Personne ne doit découvrir APRÈS coup que sa sortie est partie
              dans l'autre monde, dans un sens comme dans l'autre. Le libellé
              d'état ne suffit pas : en pause ou en recherche GPS il ne nomme
              plus la discipline. Cette pill, elle, ne bouge jamais.
              Elle n'est PAS un contrôle : la discipline se fige au départ (une
              sortie ne change pas de monde en chemin) — un commutateur ici
              serait un bouton mort. Le mot est l'invariant du commutateur de la
              Carte, l'a11y le dit en toutes lettres. */}
          <View
            style={styles.modePill}
            accessibilityLabel={t(C.a11yLiveActivity, { name: t(ACTIVITY_NAME[activity]) })}
          >
            <Text style={styles.activityText} numberOfLines={1}>
              {ACTIVITY_LABELS[activity]}
            </Text>
          </View>

          {/* Mode (social/privé) — CONTEXTE PERMANENT, pas un avis temporaire (§10). */}
          {!conquest ? (
            <View style={styles.modePill}>
              <Icon
                name={mode === 'course_privee' ? 'discret' : 'feed'}
                size={iconSizes.xs}
                color={colors.gris}
              />
              <Text style={styles.modeText} numberOfLines={1}>
                {t(C.statsOnlyMode, { mode: modeLabel })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Trois métriques ÉGALES, tabulaires, lisibles d'un coup d'œil.
            La 3ᵉ (allure à pied, VITESSE à vélo) garde sa PLACE même quand rien
            n'a encore été mesuré : elle affiche alors un tiret, jamais « 0'00 »
            — un zéro nu se lirait comme une performance nulle, et faire
            disparaître la case réorganiserait le bandeau au premier kilomètre,
            en pleine course. Décision et cas dégénérés : `liveRate.ts`. */}
        <View style={styles.metrics}>
          <Metric value={formatClock(s.activeS)} label={t(C.timeLabel)} />
          <View style={styles.metricDivider} />
          <Metric value={formatKm(s.distanceM)} unit="KM" label={t(C.kickerDistance)} />
          <View style={styles.metricDivider} />
          <Metric
            value={rate.value}
            unit={rate.unit ?? undefined}
            label={t(copy.rateLabel)}
            // Un tiret ne se lit pas à voix haute : sans cela, un joueur non
            // voyant entendrait le libellé sans jamais savoir qu'il n'y a pas
            // encore de mesure — un silence qui se confond avec un bug.
            valueA11y={rate.measured ? undefined : t(C.rateNotMeasured)}
          />
        </View>

        {/* La FERMETURE en toutes lettres — le pendant du segment sur la carte. */}
        {phase !== 'idle' && s.loopGapM !== null ? (
          <ClosurePill
            phase={phase}
            activity={activity}
            gapM={s.loopGapM}
            progress={progress}
          />
        ) : null}

        {/* §10 — L'UNIQUE avis temporaire, choisi par priorité (pur + testé). */}
        {notice === 'signal_critical' || notice === 'signal_weak' ? (
          <GpsSignalPill
            signal={s.signal}
            permissionRevoked={run.permissionRevoked}
            awaitingFirstFix={awaitingFirstFix}
            firstFixOverdue={firstFixOverdue}
          />
        ) : notice === 'restore' && run.restore !== null ? (
          <RestoreRunCard
            distanceLabel={t(C.restoreKmFound, { km: formatKm(run.restore.distanceM) })}
            // Discipline de la sortie RETROUVÉE (pas de celle en cours) : quand
            // les deux diffèrent, « Reprendre » n'existe pas et la carte doit
            // DIRE pourquoi — un bouton qui disparaît sans raison se lit comme
            // un bug (cf. `canResumeInterrupted`). C'est elle, aussi, qui nomme
            // l'effort dans le titre et dans les libellés lus à voix haute :
            // une course retrouvée est une course, une sortie vélo une sortie.
            activity={run.restore.activity}
            onResume={run.restore.resume}
            onDiscard={run.restore.discard}
          />
        ) : notice === 'bg_offer' ? (
          <BackgroundRationaleCard
            activity={activity}
            onAllow={run.allowBackground}
            onLater={run.dismissBackground}
          />
        ) : notice === 'precise' ? (
          <PreciseLocationBanner onOpenSettings={run.openSettings} />
        ) : notice === 'foreground' ? (
          // Navigateur, ou permission « Toujours » refusée : « enregistré app ouverte ».
          // La phrase du navigateur est déjà neutre (« garde cet onglet au
          // premier plan ») et n'a donc pas de twin ; celle de la permission
          // nommait l'effort, et suit la discipline.
          <View style={styles.modePill}>
            <Icon name="gps" size={iconSizes.xs} color={colors.gris} />
            <Text style={styles.modeText}>
              {t(run.foregroundOnlyPlatform ? C.browserForegroundOnly : copy.foregroundOnly)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── 5. PAUSE : le seul geste de la course. « Terminer » vit DEDANS. ── */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 18 }]} pointerEvents="box-none">
        {locked ? (
          // Verrou RÉEL : plus aucun contrôle n'est atteignable tant qu'on n'a
          // pas maintenu. Il n'est peint que parce qu'il agit vraiment.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.a11yUnlockControls)}
            onLongPress={() => {
              haptics.success();
              setLocked(false);
            }}
            delayLongPress={motion.holdToStopMs}
            // Appui court : on ne déverrouille pas par accident — on guide.
            onPress={() => haptics.light()}
            style={({ pressed }) => [styles.lockedBar, pressed && styles.pressed]}
          >
            <Icon name="verrou" size={iconSizes.md} color={colors.blanc} />
            <View style={styles.lockedTexts}>
              <Text style={styles.lockedTitle} numberOfLines={1}>
                {t(C.lockedTitle)}
              </Text>
              <Text style={styles.lockedHint} numberOfLines={1}>
                {t(C.lockedHint)}
              </Text>
            </View>
          </Pressable>
        ) : (
          <>
            {/* En PAUSE seulement : les gestes rares. En course, ils ne sont pas
                sous le pouce — « Terminer » en particulier (planche E07). */}
            {paused ? (
              <View style={styles.pausedRow}>
                <SmallControl
                  label={t(C.ctrlFinish)}
                  accessibilityLabel={t(copy.a11yFinishRun)}
                  onLongPress={finish}
                  danger
                >
                  <View style={styles.stopSquare} />
                </SmallControl>
                {openSettings === null ? null : (
                  <SmallControl
                    label={t(C.ctrlGpsHelp)}
                    accessibilityLabel={t(copy.a11yGpsHelp)}
                    onPress={() => setHelpVisible(true)}
                  >
                    <Icon name="gps" size={20} color={colors.blanc} />
                  </SmallControl>
                )}
              </View>
            ) : null}

            <View style={styles.controlRow}>
              <SmallControl
                label={t(C.ctrlLock)}
                accessibilityLabel={t(C.a11yLockControls)}
                onPress={() => setLocked(true)}
              >
                <Icon name="verrou" size={20} color={colors.blanc} />
              </SmallControl>

              {/* L'UNIQUE chartreuse d'action de l'écran (§A4). */}
              <View style={styles.pauseWrap}>
                <Pressable
                  accessibilityRole="button"
                  // Le libellé VISIBLE (« PAUSE » / « REPRENDRE ») est neutre :
                  // seule cette version lue nommait la course. §A : c'est le
                  // pire cas, personne d'autre ne pouvait s'en apercevoir.
                  accessibilityLabel={paused ? t(copy.a11yResumeRun) : t(copy.a11yPauseRun)}
                  accessibilityState={{ selected: paused }}
                  onPress={() => {
                    haptics.light();
                    run.togglePause();
                  }}
                  style={({ pressed }) => [styles.pauseDisc, pressed && styles.pressed]}
                >
                  <PausePlayGlyph paused={paused} size={24} />
                </Pressable>
                <Text style={styles.smallLabel} numberOfLines={1}>
                  {paused ? t(C.ctrlResume) : t(C.ctrlPause)}
                </Text>
              </View>

              {/* La planche pose un bouton « son » ici. GRYD n'embarque aucune
                  dépendance audio : il n'aurait rien à couper. Il est OMIS —
                  l'espace reste vide plutôt que d'accueillir un bouton mort. */}
              <View style={styles.controlSpacer} />
            </View>
          </>
        )}
      </View>

      {/* ── E08 : fermeture & capture, par-dessus la carte réelle ──────────── */}
      {closure !== null ? (
        <LoopClosureSequence
          loop={closure.loop}
          closurePoint={closure.closurePoint}
          camera={closure.camera}
          box={closure.box}
          zonesEstimated={closure.zonesEstimated}
          reduced={closure.reduced}
          // Le badge « BOUCLE FERMÉE » est neutre ; sa version LUE ne l'était
          // pas (« pendant cette course »). La discipline est figée au départ :
          // pas besoin de la geler avec la caméra.
          activity={activity}
          onDone={() => setClosure(null)}
        />
      ) : null}

      {openSettings === null ? null : (
        <BackgroundHelpSheet
          visible={helpVisible}
          activity={activity}
          onClose={() => setHelpVisible(false)}
          onOpenSettings={openSettings}
        />
      )}
    </View>
  );
}

/** Une des trois métriques d'en-tête (≥ 24 pt, chiffres tabulaires). */
function Metric({
  value,
  unit,
  label,
  valueA11y,
}: {
  value: string;
  unit?: string;
  label: string;
  /** Ce qui est LU à la place du chiffre — utile quand il n'y en a pas (tiret). */
  valueA11y?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text
        style={styles.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={valueA11y}
      >
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Pill de fermeture — la SEULE information qui change de ton pendant la course.
 * Ambre quand la boucle n'est pas fermée alors qu'on est revenu à portée : c'est
 * l'instant où le coureur croit avoir bouclé. On dit pourquoi ça ne compte pas,
 * factuellement, jamais en rouge, et la course continue.
 */
function ClosurePill({
  phase,
  activity,
  gapM,
  progress,
}: {
  phase: LoopClosurePhase;
  /** Les mètres manquants se comptent à la tolérance DE LA DISCIPLINE. */
  activity: Activity;
  gapM: number;
  progress: number | null;
}) {
  const t = useT();
  const missing = formatInt(roundLoopM(loopMissingM(gapM, activity)));
  const closed = phase === 'closed';
  const warn = phase === 'nearMiss';
  const tone = closed ? colors.chartreuse : warn ? gameColors.warn : colors.blanc;
  const label = closed
    ? t(C.loopClosedPill)
    : warn
      ? t(C.loopNotClosedPill, { m: missing })
      : t(C.loopOpenPill, { m: missing });
  const pct = progress === null ? null : progressPercent(progress);

  return (
    <View style={styles.closureWrap}>
      <View style={[styles.closurePill, warn && styles.closurePillWarn]}>
        <Icon
          name={closed ? 'boucle_fermee' : 'boucle_ouverte'}
          size={iconSizes.xs}
          color={tone}
        />
        <Text style={[styles.closureText, { color: tone }]} numberOfLines={1}>
          {label}
        </Text>
        {pct !== null && !closed ? (
          <Text style={[styles.closurePct, { color: tone }]} numberOfLines={1}>
            {t(C.loopProgress, { n: String(pct) })}
          </Text>
        ) : null}
      </View>
      {pct !== null && !closed ? (
        <View
          accessibilityLabel={t(C.a11yLoopProgress, { n: String(pct) })}
          style={styles.closureBar}
        >
          <ProgressBar value={progress ?? 0} height={3} fill={tone} />
        </View>
      ) : null}
    </View>
  );
}

/** Glyphe pause/lecture local. */
function PausePlayGlyph({ paused, size }: { paused: boolean; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {paused ? (
        <Path d="M7 4.5 L15.5 10 L7 15.5 Z" fill={colors.noir} />
      ) : (
        <>
          <Path d="M7 4.5v11" stroke={colors.noir} strokeWidth={3} strokeLinecap="round" />
          <Path d="M13 4.5v11" stroke={colors.noir} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/**
 * Contrôle secondaire (48). `onLongPress` seul = geste PROTÉGÉ (§G) : un appui
 * court ne termine jamais une course, il guide par une haptique.
 */
function SmallControl({
  label,
  accessibilityLabel,
  onPress,
  onLongPress,
  danger = false,
  children,
}: {
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
  onLongPress?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.smallWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          haptics.light();
          onPress?.();
        }}
        onLongPress={onLongPress}
        delayLongPress={motion.holdToStopMs}
        style={({ pressed }) => [
          styles.smallDisc,
          danger && styles.smallDiscStop,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
      <Text style={styles.smallLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },

  // ── En-tête ───────────────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 2,
  },
  statusRow: { alignItems: 'center', gap: spacing.xxs },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
  },
  topPillText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.chartreuse },
  liveDotPaused: { backgroundColor: colors.gris },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: spacing.xxs,
  },
  modeText: { color: colors.gris, fontSize: fontSizes.xs },
  // Discipline : même pill que le mode (contexte permanent, jamais un CTA), en
  // capitales espacées comme le commutateur E14. Gris — la chartreuse dit
  // « à moi / gagné » (§C), pas « voici ce que j'enregistre ».
  activityText: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // Bandeau des 3 métriques : un VOILE sur la carte, pas une card (§A : jamais
  // de card dans card — la carte est la scène, le bandeau la survole).
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    backgroundColor: colors.scrim,
    borderRadius: radii.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.xl,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: { color: colors.gris, fontFamily: fonts.display, fontSize: fontSizes.sm, fontWeight: '800' },
  metricLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  metricDivider: { width: 1, height: 26, backgroundColor: colors.grisLigne },

  // ── Pill de fermeture + progression ───────────────────────────────────────
  closureWrap: { alignItems: 'center', gap: 5, alignSelf: 'stretch' },
  closurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: spacing.xxs,
    maxWidth: '100%',
  },
  closurePillWarn: { borderColor: withAlpha(gameColors.warn, 0.55) },
  closureText: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  closurePct: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  closureBar: { width: 180 },

  // ── Marqueurs de carte ────────────────────────────────────────────────────
  meHalo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.chartreuse14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.noir,
  },
  startDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.chartreuse,
    backgroundColor: colors.noir,
  },

  // ── Contrôles bas ─────────────────────────────────────────────────────────
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 2,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  controlSpacer: { width: SMALL_CONTROL_SIZE },
  pauseWrap: { alignItems: 'center', gap: 6 },
  pausedRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xxl },
  pauseDisc: {
    width: PAUSE_SIZE,
    height: PAUSE_SIZE,
    borderRadius: PAUSE_SIZE / 2,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallWrap: { alignItems: 'center', gap: 6, width: SMALL_CONTROL_SIZE },
  smallDisc: {
    width: SMALL_CONTROL_SIZE,
    height: SMALL_CONTROL_SIZE,
    borderRadius: SMALL_CONTROL_SIZE / 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDiscStop: { backgroundColor: colors.carbone2, borderColor: colors.blanc35 },
  smallLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stopSquare: { width: 16, height: 16, borderRadius: 3.5, backgroundColor: colors.blanc },

  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lockedTexts: { flex: 1, gap: 2 },
  lockedTitle: {
    color: colors.blanc,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  lockedHint: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xs },
});
