/**
 * GRYD — COURSE LIVE (AMENDEMENT-10 §3 + AMENDEMENT-11) : DEUX modes, Nike
 * d'abord, ZÉRO hexagone visible.
 *   - MODE STATS (défaut) : écran minimal type Nike — fond noir PLEIN, zéro
 *     glass, zéro décor. Distance GÉANTE (fontSizes.heroMax), « +N ZONES »
 *     chartreuse, allure, temps, pill GRYD VERIFIED. Contrôles bas gros,
 *     une main : [Pause] [Carte] [Terminer (appui maintenu)] — labels
 *     d'action ≥ 12 px (lisibles en courant).
 *   - MODE CARTE : la navigation type Uber (LiveNavMap) sur les VRAIES tuiles
 *     (RealMap — AMENDEMENT-16 §0) : la route à suivre + le ruban chartreuse
 *     NET qui S'ÉTEND derrière le coureur le long des vraies rues. Chiffres
 *     dans la MapBottomSheet (anti-bruit). Le FAB Pause est le SEUL disque
 *     PLEIN (blanc, chartreuse en pause) de la colonne — repérable d'un
 *     coup d'œil parmi les FABs carbone.
 * UNE seule lecture de la boucle (audit zéro-friction) : le bandeau mission
 * du haut porte l'ÉTAT (« BOUCLE · 72 % · 320 m »), la card live basse porte
 * l'ACTION (« FERME TA BOUCLE · Retour 320 m »). Aucune ligne intermédiaire.
 * Le slot droit du bandeau n'affiche une ETA (« 9 min ») QUE s'il existe une
 * destination (mission/défense/conquête) ; en RUN LIBRE il dit « EN COURS »
 * — l'app ne ment jamais sur une arrivée qui n'existe pas.
 * Anti-bruit : au plus UNE alerte temporaire à la fois (le toast s'efface
 * pendant une mini-anim N3). Terminer = appui MAINTENU (motion.holdToStopMs,
 * stop protégé §G) → /course-result. Le client n'attribue jamais une zone :
 * tout est « estimé », le serveur (ingest_run) reste seul décideur.
 *
 * AMENDEMENT-15 §2 — sélecteur réel/simulation : sur NATIF avec permission,
 * useRealRun branche le vrai tracker GPS (RealCourseLive) ; sur web ou sans
 * permission, la simulation démo ci-dessous reste INCHANGÉE (une phrase de
 * mode dégradé s'empile en haut si le GPS a été refusé — jamais bloquant).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  LOOP_MIN_PERIMETER_M,
  VERIFIED_MIN_TRUST,
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  motion,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { formatInt } from '../src/ui/format';
import {
  FloatingMapButton,
  MAP_SHEET_COMPACT_HEIGHT,
  Map3DToggle,
  MapBottomSheet,
  usePulse,
  useReduceMotion,
  useSlideIn,
} from '../src/ui/game';
import { useMap3d } from '../src/features/map/mapPref';
import { LiveNavMap, type LiveNavMapHandle } from '../src/features/run/LiveNavMap';
import { buildRunLoop, loopStatusAt } from '../src/features/run/loop';
import {
  NAV_MAP_METERS_PER_PIXEL,
  NAV_SCALE_BAR_METERS,
  buildLiveNav,
  etaSecondsAt,
  nextCheckpointAt,
  progressPctAt,
  type NavToast,
} from '../src/features/run/liveNav';
import {
  SIM_SECONDS_PER_TICK,
  SIM_TICK_MS,
  buildRunSimulation,
  crewZonePctAt,
  formatClock,
  formatKm,
  formatPace,
  resultStats,
  runModeFromParam,
  type LiveRunMode,
} from '../src/features/run/simulation';
import { useRealRun } from '../src/features/run/gps/useRealRun';
import { RealCourseLive } from '../src/features/run/gps/RealCourseLive';
import { getPlannedRoute } from '../src/features/route/plannedRoute';
import type { LatLngPoint } from '../src/features/map/realAnchors';
import {
  completeMissionLabel,
  conquestMissionLabel,
  defenseMissionLabel,
  defenseCoveragePct,
  defenseZoneForRoute,
  freeRunMissionLabel,
  intentionFromParam,
  isCompleteParam,
  partialBoundaryById,
  type PartialBoundaryDemo,
  type RunIntention,
} from '../src/features/run/intention';
import {
  INDICATION_HAPTIC,
  QUICK_PINGS,
  buildIndicationScript,
  completeLiveCard,
  defenseLiveCard,
  freeRunLiveCard,
  loopLiveCard,
  type LiveCard,
  type LiveIndication,
  type QuickPing,
} from '../src/features/run/indications';
import {
  liveMatesAt,
  rivalSectorAt,
  rivalSectorLine,
  shouldShowMates,
  type LiveMate,
  type RivalSector,
} from '../src/features/run/livemates';

/** Marge entre la sheet compacte et l'UI flottante (boutons, échelle). */
const ABOVE_SHEET_GAP = 12;
/** Diamètre du bouton Terminer (appui maintenu) dans la sheet compacte. */
const STOP_BUTTON_SIZE = 48;
/** Diamètre des GROS contrôles une-main du mode Stats (Nike). */
const BIG_CONTROL_SIZE = 68;
/** Distance au checkpoint arrondie à 10 m (lecture nav, pas de fausse précision). */
const CHECKPOINT_ROUND_M = 10;
/** Durée de la mini-anim N3 (§C.3) : ~2 s, ne masque jamais la route longtemps. */
const N3_DURATION_MS = 2_000;
/**
 * AMENDEMENT-20 §1 — les événements live sont des TOASTS TEMPORAIRES (2 s, jamais
 * permanents). Fenêtre courte façon Strava : le toast passe, la carte reste
 * silencieuse. (Le token partagé motion.toastDismissMs = 2,5 s sert d'autres
 * écrans ; ici on impose la discipline 2 s du live.)
 */
const LIVE_TOAST_MS = 2_000;

/** Les deux modes d'affichage du live (AMENDEMENT-10 §3 — Nike d'abord). */
type LiveView = 'stats' | 'carte';

/**
 * Saut « +N zones » à la fermeture de boucle (AMENDEMENT-12 §C) : one-shot,
 * scale up puis retour en ressort. Reduce motion → aucun mouvement.
 */
function useZoneJump(active: boolean): Animated.Value {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || reduce) {
      scale.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.28,
        duration: motion.transitionMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [active, reduce, scale]);
  return scale;
}

export default function CourseLiveScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    route?: string;
    intention?: string;
    /** AMENDEMENT-17 §CH2 — id de la frontière crew à terminer (mode complete). */
    boundary?: string;
    /** AMENDEMENT-18 §C.4 — course lancée comme mission crew rejointe (alliés opt-in). */
    mission?: string;
    /** Parcours PLANIFIÉ (Route Planner) → la course suit sa géométrie (store). */
    planned?: string;
  }>();
  // AMENDEMENT-17 §CH2 — mode « terminer » : un membre reprend une frontière
  // ouverte par son crew pour la refermer. C'est une course de conquête (le
  // finisher couvre le segment manquant → boucle fermée) ; l'intention client
  // `complete` ne teinte QUE le bandeau (le serveur reste seul décideur).
  const completing = isCompleteParam(params.intention);
  const mode = completing ? 'conquete' : runModeFromParam(params.mode);
  const completeBoundary = completing ? partialBoundaryById(params.boundary) : null;
  // Intention (AMENDEMENT-16 §1) : Conquérir/Défendre teintent les bandeaux
  // live — 100 % CLIENT, jamais lue par le serveur (le tracé décide).
  const intention = intentionFromParam(params.intention);
  // GPS réel (AMENDEMENT-15 §2) : natif + permission → vrai tracker ; web ou
  // refus → simulation démo INCHANGÉE (variante useRealRun.web.ts = stub).
  // AMENDEMENT-18 §C.4 — mission crew rejointe : les alliés opt-in ne s'affichent
  // QUE dans ce cadre. Le mode « terminer » est toujours une mission (on referme
  // une frontière crew ensemble) ; sinon `?mission=1` le déclare explicitement.
  const missionParam = Array.isArray(params.mission) ? params.mission[0] : params.mission;
  const mission = missionParam === '1' || missionParam === 'true';
  const gate = useRealRun(mode);
  if (gate.kind === 'starting') {
    // Permission en cours de résolution (natif, quelques instants) : fond noir
    // plein sous la boîte de dialogue système — jamais de démo fantôme derrière.
    return <View style={styles.root} />;
  }
  if (gate.kind === 'real') return <RealCourseLive run={gate.run} />;
  // Parcours PLANIFIÉ (Route Planner) : la course suit SA géométrie (store).
  const plannedLine = params.planned ? getPlannedRoute()?.line : undefined;
  return (
    <DemoCourseLive
      mode={mode}
      routeParam={params.route}
      intention={intention}
      completeBoundary={completeBoundary}
      mission={mission}
      notice={gate.notice}
      plannedLine={plannedLine}
    />
  );
}

/** Simulation démo (flux historique, INCHANGÉ hors pill de mode dégradé). */
function DemoCourseLive({
  mode,
  routeParam,
  intention,
  completeBoundary,
  mission,
  notice,
  plannedLine,
}: {
  mode: LiveRunMode;
  routeParam: string | string[] | undefined;
  /** Intention live (client only) — teinte le bandeau, jamais le résultat. */
  intention: RunIntention | null;
  /** AMENDEMENT-17 §CH2 — frontière crew à terminer (mode « terminer »), sinon null. */
  completeBoundary: PartialBoundaryDemo | null;
  /** AMENDEMENT-18 §C.4 — mission crew rejointe : alliés live opt-in autorisés. */
  mission: boolean;
  notice: string | null;
  /** Géométrie du parcours PLANIFIÉ à suivre (Route Planner) — sinon undefined. */
  plannedLine?: readonly LatLngPoint[];
}) {
  const insets = useSafeAreaInsets();
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  // §4ter : la course SUIT la géométrie du parcours — planifié (plannedLine) OU
  // proposition démo (`route=`), sinon le scénario par défaut.
  const nav = useMemo(
    () => buildLiveNav(sim, routeParam, plannedLine),
    [sim, routeParam, plannedLine],
  );
  /** Boucle démo (AMENDEMENT-12 §C) — null hors conquête (aucune capture). */
  const loop = useMemo(() => buildRunLoop(sim, nav), [sim, nav]);
  const lastIndex = sim.ticks.length - 1;

  // AMENDEMENT-18 §C.2 — défaut par mode : Stats (Nike) en course LIBRE ; Carte
  // (guidage) en mission / défense / terminer (là où la route et la boucle
  // priment). La bascule reste évidente (bouton Carte/Stats).
  const defaultView: LiveView =
    completeBoundary || intention === 'defense' || (mode === 'conquete' && mission)
      ? 'carte'
      : 'stats';
  const [view, setView] = useState<LiveView>(defaultView);
  // AMENDEMENT-26 — VUE 3D partagée (pref `gryd.map3d`) : le run en perspective.
  // Défaut 2D. Pur confort visuel — zéro impact gameplay (le serveur décide).
  const { map3d, setMap3d } = useMap3d();
  const [tickIndex, setTickIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [following, setFollowing] = useState(true);
  const mapRef = useRef<LiveNavMapHandle>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    screen('course_live', { mode });
  }, [mode]);

  // Horloge de simulation : temps réel accéléré, gelée en pause et à l'arrivée.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setTickIndex((t) => (t >= lastIndex ? t : t + 1));
    }, SIM_TICK_MS);
    return () => clearInterval(id);
  }, [lastIndex, paused]);

  const tick = sim.ticks[Math.min(tickIndex, lastIndex)] ?? sim.ticks[0]!;
  const simDone = tickIndex >= lastIndex;
  const conquest = mode === 'conquete';
  const elapsedS = (Math.min(tickIndex, lastIndex) + 1) * SIM_SECONDS_PER_TICK;
  const paceSPerKm = tick.distanceM > 0 ? elapsedS / (tick.distanceM / 1000) : 0;
  const zonePct = crewZonePctAt(sim, tickIndex);
  const etaS = etaSecondsAt(sim, tickIndex);
  const pct = progressPctAt(sim, tickIndex);
  const checkpoint = nextCheckpointAt(nav, tickIndex);
  /** GRYD Verify : confiance instantanée ≥ seuil réel (jamais décoratif). */
  const verified = Math.min(tick.gpsTrust, tick.motionTrust) >= VERIFIED_MIN_TRUST;

  // ── Boucle (AMENDEMENT-12 §C) : phase au tick + compteur qui saute ────────
  const loopStatus = loopStatusAt(loop, sim, tickIndex);
  const loopClosed = loopStatus.phase === 'closed';
  const enclosedZones = loopClosed && loop ? loop.enclosedZones : 0;
  /** Zones estimées AFFICHÉES : couloir + intérieur dès la fermeture. */
  const zonesTotal = conquest ? tick.hexes + enclosedZones : 0;
  const zoneJump = useZoneJump(loopClosed);
  /** « Retour N m » (card d'action boucle) — même arrondi 10 m que la nav. */
  const loopDistLabel = formatInt(
    Math.max(CHECKPOINT_ROUND_M, Math.round(loopStatus.distM / CHECKPOINT_ROUND_M) * CHECKPOINT_ROUND_M),
  );

  // ── Bandeau d'INTENTION (AMENDEMENT-16 §1) : l'intention guide le live, le
  //    tracé décide du résultat. Conquérir → progression de fermeture de boucle
  //    (seuils/états loop EXISTANTS) ; Défendre → % de frontière couverte (démo :
  //    cellules propres traversées ≈ progression du parcours). Aucune de ces
  //    métriques ne part au serveur — pur affichage. Rien sans intention (run libre).
  // Mode « terminer » (chantier 2) : « Terminer République · 420 m restants ·
  // Frontière couverte : 68 % ». Progression démo = avancée du run (le finisher
  // couvre le segment manquant) ; à la fermeture de boucle, la frontière est
  // couverte. Métriques d'affichage — rien ne part au serveur.
  const completeProgress = (Math.min(tickIndex, lastIndex) + 1) / (lastIndex + 1);
  const completeCoveredPct = loopClosed
    ? 100
    : defenseCoveragePct(Math.min(tickIndex, lastIndex) + 1, lastIndex + 1);
  const completeRemainingM = completeBoundary
    ? loopClosed
      ? 0
      : Math.round(completeBoundary.missingM * (1 - completeProgress))
    : 0;

  // ── AMENDEMENT-20 §1 — BANDEAU MISSION unique (fusion ETA + intention) ──────
  // « Strava partage une conquête. » UN SEUL bandeau en haut : la mission courte
  // (DÉFENSE · République · 80 % / BOUCLE · 72 % · 320 m / RUN LIBRE · 4,2 km ·
  // 5’38/km) + l'ETA à droite (« 9 min »). Plus de pile de 4 pills. 100 % client.
  // Priorité (l'intention guide, le tracé décide) : terminer une frontière crew →
  // DÉFENSE (intention explicite) → BOUCLE (mode conquête) → RUN LIBRE. L'intention
  // « défendre » prime sur le mode conquête par défaut (parité bandeau A-16 §1).
  const missionLabel = (() => {
    if (completeBoundary) {
      return completeMissionLabel(completeBoundary.zone, completeRemainingM);
    }
    if (intention === 'defense') {
      const zone = defenseZoneForRoute(routeParam);
      const covered = defenseCoveragePct(Math.min(tickIndex, lastIndex) + 1, lastIndex + 1);
      return defenseMissionLabel(zone, covered);
    }
    if (conquest) {
      const label = conquestMissionLabel(loopStatus.phase, loopStatus.distM, tick.distanceM);
      // Le client n'attribue jamais une zone (ingest_run seul décideur) : à la
      // fermeture, on nuance « zone prise » → « zone prise (à valider) » plutôt
      // que d'affirmer un claim serveur.
      return loopClosed ? label.replace('zone prise', 'zone prise (à valider)') : label;
    }
    // Run libre : la mission = les chiffres de la course (Strava discipline).
    return freeRunMissionLabel(formatKm(tick.distanceM), formatPace(paceSPerKm));
  })();
  /** Icône du bandeau mission selon l'objectif (chartreuse, jamais criard). */
  const missionIcon: IconName = completeBoundary
    ? 'route'
    : intention === 'defense'
      ? 'bouclier'
      : conquest
        ? 'cible'
        : 'performance';
  /** Run LIBRE : aucune destination → aucune ETA (l'app ne ment jamais). */
  const freeRun = !completeBoundary && intention !== 'defense' && !conquest;
  /**
   * Slot droit du bandeau : « PAUSE » / « EN COURS » (run libre, la course
   * reste ouverte tant qu'on ne maintient pas Terminer) / « Arrivée » /
   * « 9 min » (ETA — SEULEMENT quand une destination réelle existe).
   */
  const etaLabel = paused
    ? 'PAUSE'
    : freeRun
      ? 'EN COURS'
      : simDone
        ? 'Arrivée'
        : `${Math.max(1, Math.ceil(etaS / 60))} min`;
  /**
   * UNE seule horloge visible à la fois : l'ETA « N min » (compte à rebours) et
   * le chrono TEMPS de la sheet compacte sont deux lectures du temps. En mode
   * Carte, la sheet porte déjà TEMPS → on masque l'ETA chiffré du bandeau (les
   * états PAUSE / EN COURS / Arrivée, eux, ne sont pas des horloges → conservés).
   */
  const etaIsCountdown = !paused && !freeRun && !simDone;

  // ── Feedback temps réel scripté : toast + haptic (anti-bruit : 1 à la fois) ─
  const [toast, setToast] = useState<{ key: number; toast: NavToast } | null>(null);
  const toastKeyRef = useRef(0);
  const showToast = (t: NavToast) => {
    toastKeyRef.current += 1;
    // App FR, zéro jargon anglais : « Checkpoint — X » (copy nav partagée,
    // liveNav.ts hors périmètre de cet écran) s'affiche « Repère — X ».
    setToast({
      key: toastKeyRef.current,
      toast: { ...t, text: t.text.replace(/^Checkpoint — /, 'Repère — ') },
    });
  };
  useEffect(() => {
    const scripted = nav.toasts.get(tickIndex);
    if (!scripted) return;
    // La fermeture de boucle EST l'arrivée de la démo : son burst prime,
    // « Destination atteinte » ne le recouvre jamais (anti-bruit).
    if (loopClosed && (scripted.kind === 'arrivee' || tickIndex === loop?.closeTick)) return;
    haptics[scripted.haptic]();
    showToast(scripted);
  }, [tickIndex, nav.toasts, loopClosed, loop]);
  // La fermeture de boucle est désormais un ÉVÉNEMENT N3 (mini-anim + haptique
  // forte courte) — voir la section « INDICATIONS GUIDÉES » plus bas (§C.3).
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), LIVE_TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  // ── AMENDEMENT-18 §C.3 — INDICATIONS GUIDÉES à 3 NIVEAUX ──────────────────
  // La simulation joue un script d'indications dans l'ordre LOGIQUE (boucle
  // possible → il reste 300 m → presque fermé → BOUCLE FERMÉE → ZONE CONQUISE).
  // Le niveau décide de la présentation : N1 = toast discret (pipeline existant),
  // N2 = card basse persistante, N3 = mini-anim 2 s. Jamais de modale bloquante.
  const indicationScript = useMemo(
    () => buildIndicationScript({ mode, completing: completeBoundary !== null, intention }),
    [mode, completeBoundary, intention],
  );
  /** N2 courante (card basse « action ») — remplacée par la suivante, effacée à l'arrivée. */
  const [n2, setN2] = useState<LiveIndication | null>(null);
  /** N3 événement (mini-anim 2 s) — one-shot, ne masque jamais la route longtemps. */
  const [n3, setN3] = useState<{ key: number; ind: LiveIndication } | null>(null);
  const n3KeyRef = useRef(0);
  const fireN3 = (ind: LiveIndication) => {
    n3KeyRef.current += 1;
    setN3({ key: n3KeyRef.current, ind });
  };
  useEffect(() => {
    const ind = indicationScript.get(tickIndex);
    if (!ind) return;
    // La fermeture de boucle a son propre burst N3 (ci-dessous) : le script ne
    // double jamais l'événement de fermeture.
    if (loopClosed && ind.level === 'n3' && tickIndex >= (loop?.closeTick ?? Infinity)) return;
    haptics[INDICATION_HAPTIC[ind.level]]();
    if (ind.level === 'n1') {
      showToast({ kind: 'checkpoint', text: ind.text, icon: ind.icon, tint: ind.tint, haptic: 'light' });
    } else if (ind.level === 'n2') {
      setN2(ind);
    } else {
      fireN3(ind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par le tick
  }, [tickIndex, indicationScript]);
  // La card N2 « action » s'efface une fois la course terminée (plus d'action).
  useEffect(() => {
    if (simDone) setN2(null);
  }, [simDone]);
  // Burst N3 « BOUCLE FERMÉE · +N zones estimées » à la fermeture (conquête/terminer) :
  // remplace le toast texte par la mini-anim événement (haptique forte, courte).
  // « BOUCLE (CREW) FERMÉE » = fait géométrique du tracé client ; le nombre de
  // zones est « estimé » (le serveur ingest_run reste seul décideur du claim).
  useEffect(() => {
    if (!loopClosed || enclosedZones === 0) return;
    fireN3({
      level: 'n3',
      text: completeBoundary ? 'BOUCLE CREW FERMÉE' : 'BOUCLE FERMÉE',
      sub: `+${formatInt(enclosedZones)} zones estimées`,
      icon: 'carte',
      tint: colors.chartreuse,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transition unique
  }, [loopClosed]);
  // La mini-anim N3 se retire après ~2 s (ne masque jamais la route longtemps).
  useEffect(() => {
    if (!n3) return;
    const id = setTimeout(() => setN3(null), N3_DURATION_MS);
    return () => clearTimeout(id);
  }, [n3]);

  // ── AMENDEMENT-18 §C.2 — CARD LIVE BASSE selon le mode ────────────────────
  // Résumé PERMANENT de l'objectif (distinct des indications événementielles) :
  // Boucle en cours / Défense / Terminer / Run libre. Une card = 3 infos max.
  // Audit zéro-friction : le bandeau mission porte déjà l'ÉTAT chiffré → la
  // card porte l'ACTION (jamais deux lectures de la même progression). Les
  // libellés partagés (indications.ts, hors périmètre) sont ajustés ICI.
  const liveCard: LiveCard = useMemo(() => {
    if (completeBoundary) {
      const card = completeLiveCard({
        zone: completeBoundary.zone,
        remainingM: completeRemainingM,
        coveredPct: completeCoveredPct,
      });
      // « Connexion 2 rues » (copy partagée) est cryptique en effort → verbe.
      return card.detail === 'Connexion 2 rues' ? { ...card, detail: 'Relie 2 rues' } : card;
    }
    if (intention === 'defense') {
      return defenseLiveCard({
        zone: defenseZoneForRoute(routeParam),
        coveredPct: defenseCoveragePct(Math.min(tickIndex, lastIndex) + 1, lastIndex + 1),
        streetsSaved: Math.min(2, Math.floor((Math.min(tickIndex, lastIndex) + 1) / 40)),
      });
    }
    if (conquest) {
      const card = loopLiveCard({
        closed: loopClosed,
        pct: pct,
        distToCloseM: loopStatus.distM,
        enclosedZones,
      });
      // Boucle ouverte : le bandeau dit « BOUCLE · 72 % · 320 m » (état) — la
      // card dit QUOI FAIRE : « FERME TA BOUCLE · Retour 320 m » + barre.
      return loopClosed
        ? card
        : { ...card, kicker: 'FERME TA BOUCLE', value: `Retour ${loopDistLabel} m`, detail: undefined };
    }
    const loopPossible = tick.distanceM >= LOOP_MIN_PERIMETER_M;
    const card = freeRunLiveCard({ loopPossible });
    // « GRYD analyse ton tracé » (copy partagée) ne demande rien au coureur :
    // avant le seuil de boucle, la card reste à 2 infos — pas de ligne morte.
    return loopPossible ? card : { ...card, detail: undefined };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dérivé du tick
  }, [
    completeBoundary,
    completeRemainingM,
    completeCoveredPct,
    intention,
    routeParam,
    conquest,
    loopClosed,
    loopDistLabel,
    pct,
    loopStatus.distM,
    enclosedZones,
    tickIndex,
  ]);

  // ── AMENDEMENT-18 §C.4 — ALLIÉS opt-in (mission SEULEMENT) + RIVAL secteur ──
  // Alliés : uniquement si la course est une mission crew rejointe (consentement
  // opt-in) et on ne montre QUE les personnes utiles. Rival : jamais localisé
  // précisément — activité par SECTEUR, retardée.
  const matesOn = shouldShowMates({ mode, completing: completeBoundary !== null, mission });
  // AMENDEMENT-20 §1 — les alliés vivent UNIQUEMENT sur la carte (points +
  // prénom) : plus de pill allié dans le haut (max 1 mission + 1 toast).
  const mates: LiveMate[] = useMemo(
    () => (matesOn ? liveMatesAt(nav, tickIndex) : []),
    [matesOn, nav, tickIndex],
  );
  const rival: RivalSector | null = useMemo(
    () => rivalSectorAt(nav, tickIndex, { mode, completing: completeBoundary !== null, intention }),
    [nav, tickIndex, mode, completeBoundary, intention],
  );
  // AMENDEMENT-20 §1 — RIVAL épuré : plus de bandeau permanent. Le halo orange
  // vit sur la CARTE (LiveNavMap, prop `rival`) ; ici on émet UN toast court
  // « Canal actif » (2 s) à sa première détection. One-shot (anti-bruit).
  const rivalToastFiredRef = useRef(false);
  useEffect(() => {
    if (!rival || rivalToastFiredRef.current) return;
    rivalToastFiredRef.current = true;
    haptics.medium();
    showToast({
      kind: 'checkpoint',
      text: rivalSectorLine(rival),
      icon: rival.icon,
      tint: rival.tint,
      haptic: 'medium',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché à la 1re détection
  }, [rival]);

  // ── AMENDEMENT-18 §C.4 — QUICK PINGS (pas de clavier en courant) ───────────
  const [pingsOpen, setPingsOpen] = useState(false);
  const sendPing = (ping: QuickPing) => {
    haptics.medium();
    setPingsOpen(false);
    showToast({ kind: 'checkpoint', text: `Ping · ${pingLabel(ping)}`, icon: ping.icon, tint: colors.chartreuse, haptic: 'medium' });
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.success();
    const stats = resultStats(sim, tickIndex);
    track(EVENTS.runComplete, {
      distance: Math.round(stats.distanceM),
      duration: stats.durationS,
      source: 'gps',
    });
    // Le résultat rejoue la MÊME course : le parcours routé suit (§4ter).
    // L'intention accompagne le résultat pour teinter la SYNTHÈSE multi-résultats
    // (Conquête/Défense/Run libre, doc §2) — jamais l'attribution serveur.
    // AMENDEMENT-17 §CH2 — mode « terminer » : la fermeture referme la frontière
    // crew → résultat BOUCLE CREW FERMÉE (contributions du moteur). Le serveur
    // reste seul décideur (canComplete / contributionSplit) ; ici on rejoue
    // l'écran de complétion démo.
    if (completeBoundary) {
      router.replace({
        pathname: '/course-result',
        params: { boundary: completeBoundary.id, boundary_state: 'completed' },
      });
      return;
    }
    const routeId = Array.isArray(routeParam) ? routeParam[0] : routeParam;
    router.replace({
      pathname: '/course-result',
      params: {
        mode,
        t: String(tickIndex),
        ...(routeId ? { route: routeId } : {}),
        ...(intention ? { intention } : {}),
        // Parcours planifié : le résultat relit le store pour rejouer le MÊME tracé.
        ...(plannedLine ? { planned: '1' } : {}),
      },
    });
  };

  const onStopShortPress = () => {
    // Stop protégé §G : un appui court ne termine jamais — on guide.
    track(EVENTS.runCancelAttempt);
    showToast({
      kind: 'checkpoint',
      text: 'Maintiens pour terminer',
      icon: 'verrou',
      tint: colors.blanc,
      haptic: 'light',
    });
  };

  const togglePause = () => {
    setPaused((p) => !p);
  };

  /**
   * QUITTER (retour fondateur : « pas de bouton pour sortir »). Le ✕ en haut à
   * gauche met en PAUSE et demande confirmation — quitter ABANDONNE la course
   * (rien enregistré), distinct de « Terminer » (maintenir → enregistre le
   * résultat). Anti-sortie accidentelle : une confirmation, jamais direct.
   */
  const [quitOpen, setQuitOpen] = useState(false);
  const askQuit = () => {
    haptics.light();
    setPaused(true);
    setQuitOpen(true);
  };
  const confirmQuit = () => {
    track(EVENTS.runCancelAttempt);
    router.replace('/');
  };

  const switchView = (next: LiveView) => {
    haptics.light();
    setView(next);
    screen('live_view_mode', { view: next });
  };

  const donePulse = usePulse(simDone, 1.06, 1_600);
  const floatingBottom = insets.bottom + MAP_SHEET_COMPACT_HEIGHT + ABOVE_SHEET_GAP;
  // AMENDEMENT-20 §1 — « SEGMENT EXCLU » rétrogradé : info technique → micro-chip
  // discret (petite icône + libellé bref « GPS faible »), JAMAIS un bandeau plein.
  // Le détail va au RÉSULTAT (autre agent). On ne montre que les événements
  // techniques utiles au coureur (GPS/segment), jamais un StatePill empilé.
  const techNotice = (() => {
    // Mode dégradé GPS (AMENDEMENT-15 §2 : permission refusée…) : prioritaire,
    // reste discret — jamais bloquant. Une phrase brève.
    if (notice !== null) return notice;
    if (tick.event === 'gps_faible') return 'GPS faible';
    if (tick.event === 'segment_exclu') return 'GPS faible';
    if (tick.event === 'zone_privee') return 'Zone privée';
    return null;
  })();
  /**
   * AMENDEMENT-20 §1 — pile du haut réduite au MAXIMUM : 1 bandeau mission
   * (toujours) + 1 micro-chip technique optionnel. Le toast se place dessous.
   * Fini la pile de 4+ pills (route/intention/événement/boucle/allié/rival).
   */
  const topStackOffset = 48 + (techNotice ? 28 : 0);

  return (
    <View style={styles.root}>
      {/* ✕ QUITTER (haut gauche) : sortir la course sans l'enregistrer — distinct
          de « Terminer » (maintenir). Toujours visible dans les 2 vues. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter la course"
        onPress={askQuit}
        hitSlop={10}
        style={({ pressed }) => [styles.quitButton, { top: insets.top + 10 }, pressed && styles.pressed]}
      >
        <Icon name="fermer" size={20} color={colors.blanc} />
      </Pressable>
      {view === 'carte' ? (
        <>
          {/* ── LA CARTE = l'écran (caméra qui suit, route, territoire qui s'étend) ── */}
          <LiveNavMap
            ref={mapRef}
            nav={nav}
            sim={sim}
            tickIndex={tickIndex}
            capturing={conquest}
            contested={tick.event === 'conteste'}
            loop={loop}
            loopPhase={loopStatus.phase}
            mates={mates}
            rival={rival}
            mode3d={map3d}
            onFollowChange={setFollowing}
          />

          {/* ── Boutons flottants : pause · recentrer · ping · stats ── */}
          <View style={[styles.floatColumn, { bottom: floatingBottom }]}>
            <PausePlayButton paused={paused} onPress={togglePause} />
            <FloatingMapButton
              icon="gps"
              accessibilityLabel={following ? 'Carte centrée sur toi' : 'Recentrer la carte sur toi'}
              active={following}
              onPress={() => mapRef.current?.recenter()}
            />
            {/* PING crew : uniquement en mission crew rejointe (comme les alliés) —
                pas d'affordance crew hors contexte crew (§C.4). */}
            {matesOn ? (
              <FloatingMapButton
                icon="cloche"
                accessibilityLabel="Envoyer un ping au crew"
                active={pingsOpen}
                onPress={() => setPingsOpen((o) => !o)}
              />
            ) : null}
            <FloatingMapButton
              icon="performance"
              accessibilityLabel="Revenir aux stats"
              onPress={() => switchView('stats')}
            />
          </View>

          {/* ── Échelle graphique discrète (parité échelle coureur) +
               attribution tuiles réelles (AMENDEMENT-16 §0 — obligation
               légale, relogée au-dessus de la sheet comme sur la Battle Map) ── */}
          <View style={[styles.scaleBar, { bottom: floatingBottom }]} pointerEvents="none">
            <View style={[styles.scaleLine, { width: NAV_SCALE_BAR_METERS / NAV_MAP_METERS_PER_PIXEL }]} />
            <Text style={styles.scaleLabel}>{NAV_SCALE_BAR_METERS} m</Text>
            <Text style={styles.attribution}>© OpenStreetMap © CARTO</Text>
          </View>

          {/* ── AMENDEMENT-26 — bascule 2D/3D : contrôle d'apparence DISCRET (pas
               un FAB permanent — AMENDEMENT-22). Posé en haut à droite, en face du
               ✕, hors de la colonne de boutons. Mémorisé (pref `gryd.map3d`) et
               partagé avec les autres cartes. Confort visuel pur. ── */}
          <View style={[styles.map3dToggle, { top: insets.top + 10 }]}>
            <Map3DToggle
              value={map3d}
              onChange={setMap3d}
              accessibilityLabel="Vue de la carte du run"
              testID="course-live-toggle-3d"
            />
          </View>

          {/* ── N2 action (§C.3) au-dessus de la sheet : card courte, jamais
               bloquante — « Presque fermé · 180 m », « Il reste 300 m ». ── */}
          {n2 ? (
            <View style={[styles.n2Floating, { bottom: floatingBottom + 4 }]} pointerEvents="none">
              <N2ActionCard ind={n2} />
            </View>
          ) : null}

          {/* ── Bottom sheet : TOUS les chiffres vivent ici ─────────────────── */}
          <MapBottomSheet
            compactSlot={
              <View style={styles.compactRow}>
                <Stat label="DISTANCE" value={formatKm(tick.distanceM)} unit="km" mono />
                <Stat label="TEMPS" value={formatClock(elapsedS)} mono />
                <Stat label="ALLURE" value={formatPace(paceSPerKm)} mono />
                {/* Le compteur SAUTE de +N à la fermeture de boucle (§12 C). */}
                <Animated.View style={[styles.zoneStatWrap, { transform: [{ scale: zoneJump }] }]}>
                  <Stat
                    label="ZONES"
                    value={conquest ? formatInt(zonesTotal) : '—'}
                    accent={conquest}
                  />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: donePulse }] }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Terminer la course (maintenir)"
                    onLongPress={finish}
                    delayLongPress={motion.holdToStopMs}
                    onPress={onStopShortPress}
                    style={({ pressed }) => [
                      styles.stopButton,
                      simDone && styles.stopButtonDone,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.stopSquare, simDone && styles.stopSquareDone]} />
                  </Pressable>
                </Animated.View>
              </View>
            }
            semiSlot={
              <View style={styles.semiSlot}>
                {/* AMENDEMENT-20 §1 + RÈGLE §A-11 : le live reste ULTRA-minimal
                    (1 objectif + 1 progression). La sheet ne dashboarde pas —
                    on garde ce qui aide à AGIR MAINTENANT : le prochain repère
                    de nav + l'objectif crew (l'UNIQUE progression). Récompense
                    estimée, splits et log d'états = data/stats avancées → au
                    RÉSULTAT (post-run niveau 2, §A-12/14/15), jamais ici. */}
                {/* Prochain repère de nav : virage + distance (« à 200 m ») */}
                <View style={styles.rowCard}>
                  <Icon name="virage" size={iconSizes.md} color={colors.blanc} />
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowKicker}>PROCHAIN REPÈRE</Text>
                    <Text style={styles.rowValue} numberOfLines={1} adjustsFontSizeToFit>
                      {checkpoint.label}
                    </Text>
                  </View>
                  <Text style={styles.rowRight}>
                    à {formatInt(Math.max(CHECKPOINT_ROUND_M, Math.round(checkpoint.distanceM / CHECKPOINT_ROUND_M) * CHECKPOINT_ROUND_M))} m
                  </Text>
                </View>

                {/* Objectif crew (conquête) — l'UNIQUE progression de la sheet. */}
                {conquest ? (
                  <View style={styles.objectiveCard}>
                    <View style={styles.objectiveHead}>
                      <Icon name="cible" size={16} color={gameColors.crew} />
                      <Text style={styles.rowKicker}>OBJECTIF CREW</Text>
                      <Text style={styles.objectivePct}>{zonePct} %</Text>
                    </View>
                    <Text style={styles.objectiveText}>{sim.crew.objective}</Text>
                    <ProgressBar value={zonePct / 100} height={5} />
                  </View>
                ) : null}
              </View>
            }
          />
        </>
      ) : (
        /* ── MODE STATS (défaut) : Nike épuré, fond noir plein, zéro décor ── */
        <View style={[styles.statsBody, { paddingTop: insets.top + topStackOffset + 26 }]}>
          <View style={styles.statsCenter}>
            <Text style={styles.heroKicker}>DISTANCE</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatKm(tick.distanceM)}
              <Text style={styles.heroUnit}> KM</Text>
            </Text>

            {conquest ? (
              <Animated.Text
                style={[styles.zonesValue, { transform: [{ scale: zoneJump }] }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                +{formatInt(zonesTotal)} ZONES
              </Animated.Text>
            ) : null}

            {/* La boucle se lit UNE fois : bandeau mission = état, card live
                basse = action. Aucune ligne intermédiaire ici (audit P1). */}
            <View style={styles.secondaryRow}>
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{formatPace(paceSPerKm)}</Text>
                <Text style={styles.secondaryLabel}>ALLURE /KM</Text>
              </View>
              <View style={styles.secondaryDivider} />
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{formatClock(elapsedS)}</Text>
                <Text style={styles.secondaryLabel}>TEMPS</Text>
              </View>
            </View>

            {verified ? (
              <View style={styles.verifiedPill}>
                <Icon name="bouclier" size={iconSizes.xs} color={gameColors.verify} />
                <Text style={styles.verifiedText}>GRYD VERIFIED</Text>
              </View>
            ) : null}
          </View>

          {/* ── Guidage bas (§C.2) : card live objectif + N2 action ── */}
          <GuidedBottomStack card={liveCard} n2={n2} />

          {/* ── Contrôles bas GROS, une main : [Pause] [Carte] [Ping] [Terminer] ── */}
          <View style={[styles.statsControls, { paddingBottom: insets.bottom + 18 }]}>
            <BigControl
              label={paused ? 'REPRENDRE' : 'PAUSE'}
              accessibilityLabel={paused ? 'Reprendre la course' : 'Mettre la course en pause'}
              active={paused}
              onPress={togglePause}
            >
              <PausePlayGlyph paused={paused} size={24} />
            </BigControl>
            <BigControl
              label="CARTE"
              accessibilityLabel="Afficher la carte de navigation"
              onPress={() => switchView('carte')}
            >
              <Icon name="carte" size={24} color={colors.blanc} />
            </BigControl>
            {matesOn ? (
              <BigControl
                label="PING"
                accessibilityLabel="Envoyer un ping au crew"
                active={pingsOpen}
                onPress={() => setPingsOpen((o) => !o)}
              >
                <Icon name="cloche" size={iconSizes.lg} color={colors.blanc} />
              </BigControl>
            ) : null}
            <View style={styles.bigControlWrap}>
              <Animated.View style={{ transform: [{ scale: donePulse }] }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Terminer la course (maintenir)"
                  onLongPress={finish}
                  delayLongPress={motion.holdToStopMs}
                  onPress={onStopShortPress}
                  style={({ pressed }) => [
                    styles.bigDisc,
                    styles.bigStopDisc,
                    simDone && styles.stopButtonDone,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.bigStopSquare, simDone && styles.stopSquareDone]} />
                </Pressable>
              </Animated.View>
              <Text style={styles.bigLabel}>TERMINER</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── AMENDEMENT-20 §1 — UN SEUL BANDEAU MISSION (fusion ETA + intention).
           « Strava partage une conquête. » Mission courte à gauche + ETA à
           droite. Sous lui, au plus 1 micro-chip technique (GPS/segment). Fini la
           pile de 4+ pills : route, boucle, allié, rival, stats-only ont quitté
           le haut (la carte + les toasts portent le reste). MAX 2 éléments avec
           le toast. ── */}
      <View style={[styles.topArea, { top: insets.top + 10 }]} pointerEvents="none">
        <View style={styles.missionBanner}>
          <View style={[styles.liveDot, paused && styles.liveDotPaused]} />
          <Icon name={missionIcon} size={iconSizes.xs} color={colors.chartreuse} />
          <Text style={styles.missionText} numberOfLines={1} adjustsFontSizeToFit>
            {missionLabel}
          </Text>
          {view === 'carte' && etaIsCountdown ? null : (
            <Text style={styles.missionEta} numberOfLines={1} ellipsizeMode="clip">
              {etaLabel}
            </Text>
          )}
        </View>
        {/* SEGMENT EXCLU / GPS rétrogradé (§1) : micro-chip discret « GPS faible »,
             jamais un bandeau plein. Le détail technique va au résultat. */}
        {techNotice ? (
          <View style={styles.techChip}>
            <Icon name="gps" size={11} color={colors.gris} />
            <Text style={styles.techChipText} numberOfLines={1}>
              {techNotice}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Toast de feedback scripté (1 seul, remplacé par le suivant). UNE
           alerte temporaire à la fois : il s'efface pendant une mini-anim N3. ── */}
      {toast && !n3 ? (
        <View style={[styles.toastArea, { top: insets.top + topStackOffset }]} pointerEvents="none">
          <FeedbackToast key={toast.key} toast={toast.toast} />
        </View>
      ) : null}

      {/* ── N3 ÉVÉNEMENT (§C.3) : mini-anim 2 s centrée, haptique forte COURTE.
           « ZONE CONQUISE · +18 », « Canal repoussé », « Zone défendue · +48 h ».
           Ne masque jamais la route longtemps (auto-dismiss). ── */}
      {n3 ? <N3Event key={n3.key} ind={n3.ind} /> : null}

      {/* ── QUICK PINGS (§C.4) : menu prédéfini, pas de clavier en courant.
           Toast + haptic (démo). Fermé par défaut ; bouton [Ping] le bascule. ── */}
      {pingsOpen ? (
        <PingsMenu
          bottom={insets.bottom + 18}
          onSend={sendPing}
          onClose={() => setPingsOpen(false)}
        />
      ) : null}
      {/* Confirmation de sortie (✕) — abandonner ≠ Terminer. */}
      {quitOpen ? (
        <View style={styles.quitOverlay}>
          <View style={styles.quitCard}>
            <Text style={styles.quitTitle}>Quitter la course ?</Text>
            <Text style={styles.quitBody}>Elle ne sera pas enregistrée.</Text>
            <View style={styles.quitActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reprendre la course"
                onPress={() => {
                  haptics.light();
                  setQuitOpen(false);
                  setPaused(false);
                }}
                style={({ pressed }) => [styles.quitResume, pressed && styles.pressed]}
              >
                <Text style={styles.quitResumeText}>Reprendre</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quitter sans enregistrer"
                onPress={confirmQuit}
                style={({ pressed }) => [styles.quitConfirm, pressed && styles.pressed]}
              >
                <Text style={styles.quitConfirmText}>Quitter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Guidage bas (mode Stats) : la CARD LIVE d'objectif (§C.2) surmontée de la N2
 * action courante (§C.3) quand elle existe. Vit au-dessus des contrôles.
 */
function GuidedBottomStack({ card, n2 }: { card: LiveCard; n2: LiveIndication | null }) {
  return (
    <View style={styles.guidedStack}>
      {n2 ? <N2ActionCard ind={n2} /> : null}
      <LiveCardView card={card} />
    </View>
  );
}

/** Card live d'objectif permanent (§C.2) : kicker + valeur + détail + barre. */
function LiveCardView({ card }: { card: LiveCard }) {
  return (
    <View style={styles.liveCard}>
      <View style={styles.liveCardHead}>
        <Icon name={card.icon} size={iconSizes.sm} color={colors.chartreuse} />
        <Text style={styles.liveCardKicker} numberOfLines={1} adjustsFontSizeToFit>
          {card.kicker}
        </Text>
        <Text style={styles.liveCardValue} numberOfLines={1} adjustsFontSizeToFit>
          {card.value}
        </Text>
      </View>
      {card.detail ? (
        <Text style={styles.liveCardDetail} numberOfLines={1} ellipsizeMode="clip">
          {card.detail}
        </Text>
      ) : null}
      {card.progress !== undefined ? (
        <ProgressBar value={card.progress} height={5} />
      ) : null}
    </View>
  );
}

/** N2 action (§C.3) : card COURTE — « Presque fermé · 180 m », « Il reste 300 m ». */
function N2ActionCard({ ind }: { ind: LiveIndication }) {
  return (
    <View style={styles.n2Card}>
      <Icon name={ind.icon as IconName} size={iconSizes.sm} color={ind.tint} />
      <Text style={[styles.n2Text, { color: ind.tint }]} numberOfLines={1} ellipsizeMode="clip">
        {ind.text}
      </Text>
    </View>
  );
}

/** N3 événement (§C.3) : mini-anim 2 s centrée (scale-in + fondu), haptique forte. */
function N3Event({ ind }: { ind: LiveIndication }) {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(reduce ? 1 : 0.7)).current;
  const opacity = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: motion.transitionMs, useNativeDriver: true }),
    ]).start();
  }, [reduce, scale, opacity]);
  return (
    <View style={styles.n3Overlay} pointerEvents="none">
      <Animated.View style={[styles.n3Card, { opacity, transform: [{ scale }] }]}>
        <View style={styles.n3IconRing}>
          <Icon name={ind.icon as IconName} size={iconSizes.lg} color={colors.chartreuse} />
        </View>
        <Text style={styles.n3Title} numberOfLines={1}>
          {ind.text}
        </Text>
        {ind.sub ? (
          <Text style={styles.n3Sub} numberOfLines={1}>
            {ind.sub}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

/**
 * Libellé FR d'un ping affiché sur cet écran : « Je suis out » (copy partagée
 * QUICK_PINGS, hors périmètre) est un anglicisme → « Je m'arrête ».
 */
function pingLabel(ping: QuickPing): string {
  return ping.id === 'out' ? 'Je m’arrête' : ping.label;
}

/**
 * Quick Pings (§C.4) : menu prédéfini (pas de clavier en courant), gros boutons
 * une-main. Un tap = envoi (démo : toast + haptic) + fermeture. Backdrop pour
 * refermer sans envoyer.
 */
function PingsMenu({
  bottom,
  onSend,
  onClose,
}: {
  bottom: number;
  onSend: (ping: QuickPing) => void;
  onClose: () => void;
}) {
  const { opacity, translateY } = useSlideIn(14);
  return (
    <>
      <Pressable
        style={styles.pingsBackdrop}
        accessibilityLabel="Fermer les pings"
        onPress={onClose}
      />
      <Animated.View
        style={[styles.pingsSheet, { paddingBottom: bottom, opacity, transform: [{ translateY }] }]}
      >
        {/* Pas de poignée de drag : la feuille se ferme par tap du backdrop, pas
            par glissement — aucune fausse affordance de geste inexistant. */}
        <Text style={styles.pingsKicker}>PING RAPIDE AU CREW</Text>
        <View style={styles.pingsGrid}>
          {QUICK_PINGS.map((ping) => (
            <Pressable
              key={ping.id}
              accessibilityRole="button"
              accessibilityLabel={`Ping : ${pingLabel(ping)}`}
              onPress={() => onSend(ping)}
              style={({ pressed }) => [styles.pingChip, pressed && styles.pressed]}
            >
              <Icon name={ping.icon} size={16} color={colors.chartreuse} />
              <Text style={styles.pingChipText} numberOfLines={1} ellipsizeMode="clip">
                {pingLabel(ping)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

/** Compteur net de la sheet compacte (distance/temps/allure/zones). */
function Stat({
  label,
  value,
  unit,
  accent = false,
  mono = false,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={[styles.statValue, accent && styles.statValueAccent, mono && styles.statValueMono]}
        numberOfLines={1}
      >
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Toast de feedback live (slide-in, teinte fonctionnelle, auto-dismiss). */
function FeedbackToast({ toast }: { toast: NavToast }) {
  const { opacity, translateY } = useSlideIn(-8);
  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Icon name={toast.icon as IconName} size={16} color={toast.tint} />
      <Text style={[styles.toastText, { color: toast.tint }]} numberOfLines={1}>
        {toast.text}
      </Text>
    </Animated.View>
  );
}

/**
 * Glyphe pause/lecture local (icônes shared sans pictogramme lecteur).
 * `color` force une teinte unique (glyphe noir sur les disques pleins clairs —
 * jamais de chartreuse sur fond clair) ; défaut : lecture chartreuse / pause
 * blanche sur les surfaces sombres.
 */
function PausePlayGlyph({ paused, size, color }: { paused: boolean; size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {paused ? (
        <Path d="M7 4.5 L15.5 10 L7 15.5 Z" fill={color ?? colors.chartreuse} />
      ) : (
        <>
          <Path d="M7 4.5v11" stroke={color ?? colors.blanc} strokeWidth={3} strokeLinecap="round" />
          <Path d="M13 4.5v11" stroke={color ?? colors.blanc} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/** GROS contrôle une-main du mode Stats (disque 68 px + label court). */
function BigControl({
  label,
  accessibilityLabel,
  active = false,
  onPress,
  children,
}: {
  label: string;
  accessibilityLabel: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.bigControlWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: active }}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        style={({ pressed }) => [
          styles.bigDisc,
          active && styles.bigDiscActive,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

/**
 * Pause/reprendre du mode Carte — même gabarit 44 px que FloatingMapButton,
 * mais SEUL disque PLEIN de la colonne (blanc · chartreuse en pause) : la
 * pause se repère d'un coup d'œil parmi les FABs carbone, sans chercher.
 * Glyphe NOIR (jamais de chartreuse sur fond clair) ; l'état pause est aussi
 * porté par le texte « PAUSE » du bandeau mission (jamais la seule couleur).
 */
function PausePlayButton({ paused, onPress }: { paused: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Reprendre la course' : 'Mettre la course en pause'}
      accessibilityState={{ selected: paused }}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pauseDisc,
        paused && styles.pauseDiscActive,
        pressed && styles.pressed,
      ]}
    >
      <PausePlayGlyph paused={paused} size={20} color={colors.noir} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  // ✕ Quitter (haut gauche, cible ≥ 44 px) + overlay de confirmation.
  quitButton: {
    position: 'absolute',
    left: 14,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.blanc14,
  },
  quitOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  quitCard: {
    width: '100%',
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.blanc12,
    padding: 20,
    gap: 6,
  },
  quitTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800' },
  quitBody: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  quitActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quitResume: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.blanc22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitResumeText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800' },
  quitConfirm: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: gameColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitConfirmText: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },

  topArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  // ── AMENDEMENT-20 §1 — BANDEAU MISSION unique (fusion ETA + intention) ──────
  // Un seul bandeau : dot live + icône + mission courte (13-14 px) + ETA à droite.
  // Fond carbone discret, filet chartreuse léger (la mission guide, ne crie pas).
  missionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    maxWidth: 360,
  },
  missionText: {
    color: colors.blanc,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  missionEta: {
    color: colors.chartreuse,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
    marginLeft: 4,
  },
  // Micro-chip technique (§1) : « GPS faible » discret, jamais un bandeau plein.
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: 4,
    opacity: 0.9,
  },
  techChipText: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.chartreuse,
  },
  liveDotPaused: { backgroundColor: colors.gris },
  /** Le Stat ZONES garde sa part de rangée quand il saute (scale). */
  zoneStatWrap: { flex: 1 },

  // ── Guidage bas Stats (§C.2/§C.3) : card objectif + N2 action ──
  guidedStack: {
    paddingHorizontal: spacing.cardPadding,
    gap: 8,
    marginBottom: 14,
  },
  liveCard: {
    backgroundColor: colors.carbone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  liveCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveCardKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
  },
  liveCardValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  liveCardDetail: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', marginTop: -2 },
  n2Card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  n2Text: { fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.3 },
  n2Floating: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  // ── N3 événement (§C.3) : mini-anim centrée, 2 s, ne masque pas la route ──
  n3Overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  n3Card: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 22,
  },
  n3IconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  n3Title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  n3Sub: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // ── Quick pings (§C.4) : feuille basse, gros chips une-main ──
  pingsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  pingsSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
    gap: 12,
  },
  pingsKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  pingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  pingChipText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800' },

  toastArea: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 320,
  },
  toastText: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.3 },

  // ── MODE STATS (Nike) : fond noir plein, KPI géants, contrôles gros ──
  statsBody: { flex: 1, backgroundColor: colors.noir },
  statsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.cardPadding,
    gap: 4,
  },
  heroKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  heroValue: {
    color: colors.blanc,
    fontSize: fontSizes.heroMax,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    color: colors.gris,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: 0,
  },
  zonesValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 18,
  },
  secondaryStat: { alignItems: 'center', gap: 2 },
  secondaryValue: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // ≥ 12 px : les labels d'unité restent lisibles en mouvement (audit P1).
  secondaryLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  secondaryDivider: { width: 1, height: 30, backgroundColor: colors.grisLigne },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.verify,
    paddingHorizontal: 12,
    paddingVertical: spacing.xxs,
    marginTop: 16,
  },
  verifiedText: {
    color: gameColors.verify,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  statsControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  bigControlWrap: { alignItems: 'center', gap: spacing.xs },
  bigDisc: {
    width: BIG_CONTROL_SIZE,
    height: BIG_CONTROL_SIZE,
    borderRadius: BIG_CONTROL_SIZE / 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigDiscActive: {
    backgroundColor: colors.chartreuse14,
    borderColor: colors.chartreuse40,
  },
  bigStopDisc: {
    backgroundColor: colors.carbone2,
    borderWidth: 1.5,
    borderColor: colors.blanc35,
  },
  bigStopSquare: { width: 18, height: 18, borderRadius: 3.5, backgroundColor: colors.blanc },
  // ≥ 12 px : TERMINER/PAUSE/CARTE se lisent en courant (audit P1 — le label
  // de l'action la plus critique ne peut pas être le plus petit texte).
  bigLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  floatColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'center' },
  // AMENDEMENT-26 — toggle 2D/3D discret : ancré en haut à droite (en face du ✕),
  // au-dessus de la carte, jamais dans la colonne de FABs (anti-cockpit A-22).
  map3dToggle: { position: 'absolute', right: 14, zIndex: 20, alignItems: 'flex-end' },
  // FAB Pause = SEUL disque PLEIN de la colonne carte (blanc / chartreuse en
  // pause, glyphe noir) : différencié des FABs carbone d'un coup d'œil.
  pauseDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blanc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseDiscActive: {
    backgroundColor: colors.chartreuse,
  },

  scaleBar: { position: 'absolute', left: 14 },
  scaleLine: {
    height: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.gris,
    opacity: 0.7,
  },
  // ≥ 12 px même pour l'échelle/attribution (aucun texte illisible en course).
  scaleLabel: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3, fontVariant: ['tabular-nums'] },
  attribution: { color: colors.gris, opacity: 0.7, fontSize: fontSizes.xs, marginTop: 2 },

  // ── Sheet compacte : 4 chiffres nets + Terminer (appui maintenu) ──
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 2,
  },
  stat: { flex: 1, gap: 1 },
  statValue: { color: colors.blanc, fontSize: 17, fontWeight: '800' },
  statValueAccent: { color: colors.chartreuse },
  statValueMono: { fontVariant: ['tabular-nums'] },
  statUnit: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  statLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.8 },
  stopButton: {
    width: STOP_BUTTON_SIZE,
    height: STOP_BUTTON_SIZE,
    borderRadius: STOP_BUTTON_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.blanc35,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonDone: { borderColor: colors.chartreuse40 },
  pressed: { opacity: 0.7 },
  stopSquare: { width: 13, height: 13, borderRadius: 2.5, backgroundColor: colors.blanc },
  stopSquareDone: { backgroundColor: colors.chartreuse },

  // ── Sheet semi : contexte de jeu ──
  semiSlot: { paddingHorizontal: spacing.cardPadding, paddingTop: 14, gap: 8 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.carbone,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: spacing.xs,
  },
  rowTextWrap: { flex: 1, gap: 1 },
  rowKicker: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 1.2 },
  rowValue: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  rowRight: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  objectiveCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: spacing.xs,
    gap: 6,
  },
  objectiveHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objectivePct: {
    color: gameColors.crew,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  objectiveText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
});
