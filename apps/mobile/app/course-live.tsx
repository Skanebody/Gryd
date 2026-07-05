/**
 * GRYD — COURSE LIVE (AMENDEMENT-10 §3 + AMENDEMENT-11) : DEUX modes, Nike
 * d'abord, ZÉRO hexagone visible.
 *   - MODE STATS (défaut) : écran minimal type Nike — fond noir PLEIN, zéro
 *     glass, zéro décor. Distance GÉANTE (fontSizes.heroMax), « +N ZONES »
 *     chartreuse, allure, temps, pill GRYD VERIFIED. Contrôles bas gros,
 *     une main : [Pause] [Carte] [Terminer (appui maintenu)].
 *   - MODE CARTE : la navigation type Uber (LiveNavMap) sur les VRAIES tuiles
 *     (RealMap — AMENDEMENT-16 §0) : la route à suivre + le ruban chartreuse
 *     NET qui S'ÉTEND derrière le coureur le long des vraies rues (zones H3
 *     invisibles — jamais une grille, zéro halo), virage suivant,
 *     destination. Chiffres dans la MapBottomSheet (anti-bruit).
 * La pill ARRIVÉE X MIN · Y % / EN PAUSE reste TOUJOURS visible : un événement
 * (zone privée, GPS faible, contesté…) s'EMPILE dessous — il enrichit la
 * lecture, il ne remplace jamais l'ETA ni l'état pause. Toasts vocabulaire
 * territoire (« Secteur pris · +N zones ») dans les DEUX modes. `?route=<id>`
 * → nom de la route démo en tête. Terminer = appui MAINTENU
 * (motion.holdToStopMs, stop protégé §G) → /course-result (inchangé).
 * Le client n'attribue jamais une zone : tout est « estimé », le serveur
 * (ingest_run) reste seul décideur.
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
  VERIFIED_MIN_TRUST,
  colors,
  fontSizes,
  gameColors,
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
  MapBottomSheet,
  StatePill,
  usePulse,
  useReduceMotion,
  useSlideIn,
} from '../src/ui/game';
import { LiveNavMap, type LiveNavMapHandle } from '../src/features/run/LiveNavMap';
import { buildRunLoop, loopStatusAt } from '../src/features/run/loop';
import {
  NAV_MAP_METERS_PER_PIXEL,
  NAV_SCALE_BAR_METERS,
  buildLiveNav,
  etaSecondsAt,
  nextCheckpointAt,
  progressPctAt,
  routeInfoFromParam,
  splitsAt,
  type NavToast,
} from '../src/features/run/liveNav';
import {
  LIVE_EVENT_META,
  RUN_MODE_LABEL,
  SIM_SECONDS_PER_TICK,
  SIM_TICK_MS,
  buildRunSimulation,
  crewZonePctAt,
  formatClock,
  formatKm,
  formatPace,
  liveEventLogAt,
  resultStats,
  runModeFromParam,
  type LiveRunMode,
} from '../src/features/run/simulation';
import { useRealRun } from '../src/features/run/gps/useRealRun';
import { RealCourseLive } from '../src/features/run/gps/RealCourseLive';
import {
  completeBannerLabel,
  conquestBannerLabel,
  defenseBannerLabel,
  defenseCoveragePct,
  defenseZoneForRoute,
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
  primaryMateLine,
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
  return (
    <DemoCourseLive
      mode={mode}
      routeParam={params.route}
      intention={intention}
      completeBoundary={completeBoundary}
      mission={mission}
      notice={gate.notice}
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
}) {
  const insets = useSafeAreaInsets();
  const routeInfo = useMemo(() => routeInfoFromParam(routeParam), [routeParam]);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  // §4ter : la simulation SUIT l'itinéraire ROUTÉ du parcours choisi (`route=`).
  const nav = useMemo(() => buildLiveNav(sim, routeParam), [sim, routeParam]);
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
  /** « départ à ~N m » — même arrondi 10 m que la lecture nav. */
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

  const intentionBanner = (() => {
    if (completeBoundary) {
      return completeBannerLabel(completeBoundary.zone, completeRemainingM, completeCoveredPct);
    }
    if (intention === 'conquest') {
      return conquestBannerLabel(loopStatus.phase, loopStatus.distM, tick.distanceM);
    }
    if (intention === 'defense') {
      const zone = defenseZoneForRoute(routeParam);
      const covered = defenseCoveragePct(Math.min(tickIndex, lastIndex) + 1, lastIndex + 1);
      return defenseBannerLabel(zone, covered);
    }
    return null;
  })();

  // ── Feedback temps réel scripté : toast + haptic (anti-bruit : 1 à la fois) ─
  const [toast, setToast] = useState<{ key: number; toast: NavToast } | null>(null);
  const toastKeyRef = useRef(0);
  const showToast = (t: NavToast) => {
    toastKeyRef.current += 1;
    setToast({ key: toastKeyRef.current, toast: t });
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
    const id = setTimeout(() => setToast(null), motion.toastDismissMs);
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
  // Burst N3 « ZONE CONQUISE · +N » à la fermeture de boucle (conquête/terminer) :
  // remplace le toast texte par la mini-anim événement (haptique forte, courte).
  useEffect(() => {
    if (!loopClosed || enclosedZones === 0) return;
    fireN3({
      level: 'n3',
      text: completeBoundary ? 'BOUCLE CREW FERMÉE' : 'ZONE CONQUISE',
      sub: `+${formatInt(enclosedZones)} zones`,
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
  const liveCard: LiveCard = useMemo(() => {
    if (completeBoundary) {
      return completeLiveCard({
        zone: completeBoundary.zone,
        remainingM: completeRemainingM,
        coveredPct: completeCoveredPct,
      });
    }
    if (intention === 'defense') {
      return defenseLiveCard({
        zone: defenseZoneForRoute(routeParam),
        coveredPct: defenseCoveragePct(Math.min(tickIndex, lastIndex) + 1, lastIndex + 1),
        streetsSaved: Math.min(2, Math.floor((Math.min(tickIndex, lastIndex) + 1) / 40)),
      });
    }
    if (conquest) {
      return loopLiveCard({
        closed: loopClosed,
        pct: pct,
        distToCloseM: loopStatus.distM,
        enclosedZones,
      });
    }
    return freeRunLiveCard({ loopPossible: tick.distanceM >= 2000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dérivé du tick
  }, [
    completeBoundary,
    completeRemainingM,
    completeCoveredPct,
    intention,
    routeParam,
    conquest,
    loopClosed,
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
  const mates: LiveMate[] = useMemo(
    () => (matesOn ? liveMatesAt(nav, tickIndex) : []),
    [matesOn, nav, tickIndex],
  );
  const mateLine = matesOn ? primaryMateLine(mates) : null;
  const rival: RivalSector | null = useMemo(
    () => rivalSectorAt(nav, tickIndex, { mode, completing: completeBoundary !== null, intention }),
    [nav, tickIndex, mode, completeBoundary, intention],
  );

  // ── AMENDEMENT-18 §C.4 — QUICK PINGS (pas de clavier en courant) ───────────
  const [pingsOpen, setPingsOpen] = useState(false);
  const sendPing = (ping: QuickPing) => {
    haptics.medium();
    setPingsOpen(false);
    showToast({ kind: 'checkpoint', text: `Ping · ${ping.sent}`, icon: ping.icon, tint: colors.chartreuse, haptic: 'medium' });
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

  const switchView = (next: LiveView) => {
    haptics.light();
    setView(next);
    screen('live_view_mode', { view: next });
  };

  const donePulse = usePulse(simDone, 1.06, 1_600);
  const floatingBottom = insets.bottom + MAP_SHEET_COMPACT_HEIGHT + ABOVE_SHEET_GAP;
  /** Pill boucle du mode Carte (aperçu « Ferme ta boucle » / état fermé) —
      masquée en mode « terminer » : le bandeau « Terminer {zone} » porte déjà
      la même info (anti-double-message). */
  const loopPillVisible =
    view === 'carte' &&
    conquest &&
    !completeBoundary &&
    (loopStatus.phase === 'approach' || loopClosed);
  /**
   * Hauteur de la pile de pills du haut (le toast se place STRICTEMENT dessous —
   * fondateur : « les notifications se grimpent les unes sur les autres »).
   * DOIT compter CHAQUE pill qui peut apparaître, dans l'ordre de rendu, sinon le
   * toast retombe sur une pill (ex. allié / rival, oubliés jusqu'ici).
   */
  const topStackOffset =
    56 +
    (routeInfo ? 30 : 0) +
    (intentionBanner ? 30 : 0) +
    (tick.event !== null ? 38 : 0) +
    (loopPillVisible ? 30 : 0) +
    (mateLine ? 30 : 0) +
    (rival ? 30 : 0) +
    (!conquest ? 28 : 0);

  return (
    <View style={styles.root}>
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
                {/* Prochain checkpoint : virage + distance (« à 200 m ») */}
                <View style={styles.rowCard}>
                  <Icon name="virage" size={18} color={colors.blanc} />
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowKicker}>PROCHAIN CHECKPOINT</Text>
                    <Text style={styles.rowValue} numberOfLines={1}>
                      {checkpoint.label}
                    </Text>
                  </View>
                  <Text style={styles.rowRight}>
                    à {formatInt(Math.max(CHECKPOINT_ROUND_M, Math.round(checkpoint.distanceM / CHECKPOINT_ROUND_M) * CHECKPOINT_ROUND_M))} m
                  </Text>
                </View>

                {/* Récompense potentielle (points estimés — le serveur décide) */}
                <View style={styles.rowCard}>
                  <Icon name="coffre" size={18} color={conquest ? gameColors.gold : colors.gris} />
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowKicker}>RÉCOMPENSE POTENTIELLE</Text>
                    <Text style={styles.rowValue} numberOfLines={1}>
                      {conquest ? `+${formatInt(tick.points)} pts estimés` : 'Aucune (stats uniquement)'}
                    </Text>
                  </View>
                </View>

                {/* Objectif crew (conquête) */}
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

                {/* GRYD Verify : jauges de confiance */}
                <View style={styles.trustRow}>
                  <TrustGauge icon="gps" label="GPS TRUST" value={tick.gpsTrust} />
                  <TrustGauge icon="radar" label="MOTION TRUST" value={tick.motionTrust} />
                </View>
              </View>
            }
            openSlot={
              <View style={styles.openSlot}>
                <Text style={styles.sectionKicker}>SPLITS</Text>
                <View style={styles.splitsGrid}>
                  {splitsAt(sim, tickIndex).map((s) => (
                    <View key={s.km} style={styles.splitCell}>
                      <Text style={styles.splitKm}>KM {s.km}</Text>
                      <Text style={styles.splitPace}>{formatPace(s.paceS)}</Text>
                    </View>
                  ))}
                  {tick.distanceM < 1000 ? (
                    <Text style={styles.splitEmpty}>Premier kilomètre en cours…</Text>
                  ) : null}
                </View>

                <Text style={styles.sectionKicker}>ÉTATS DU RUN</Text>
                <View style={styles.eventLog}>
                  {liveEventLogAt(tickIndex).map((e) => (
                    <View key={e.kind} style={styles.eventRow}>
                      <StatePill state={LIVE_EVENT_META[e.kind].state} label={LIVE_EVENT_META[e.kind].label} />
                      <Text style={styles.eventTime}>{formatClock(e.atS)}</Text>
                    </View>
                  ))}
                  {liveEventLogAt(tickIndex).length === 0 ? (
                    <Text style={styles.splitEmpty}>Aucun événement pour l'instant.</Text>
                  ) : null}
                </View>
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
              >
                +{formatInt(zonesTotal)} ZONES
              </Animated.Text>
            ) : null}

            {/* Boucle en texte (mode Stats, §12 C : même info sans carte). */}
            {conquest && loopStatus.phase !== 'none' ? (
              <Text
                style={[styles.loopLine, loopStatus.phase !== 'open' && styles.loopLineAccent]}
                numberOfLines={1}
              >
                {loopClosed
                  ? `BOUCLE FERMÉE · +${formatInt(enclosedZones)} ZONES`
                  : loopStatus.phase === 'approach'
                    ? `FERME TA BOUCLE · DÉPART À ~${loopDistLabel} M`
                    : `BOUCLE OUVERTE · DÉPART À ~${loopDistLabel} M`}
              </Text>
            ) : null}

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
                <Icon name="bouclier" size={13} color={gameColors.verify} />
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
                <Icon name="cloche" size={22} color={colors.blanc} />
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

      {/* ── Pile du haut (2 modes) : route → ETA/pause (TOUJOURS visible) →
           événement (s'empile, ne remplace JAMAIS) → stats only ── */}
      <View style={[styles.topArea, { top: insets.top + 10 }]} pointerEvents="none">
        {routeInfo ? (
          <View style={styles.routePill}>
            <Icon name="route" size={13} color={colors.gris} />
            <Text style={styles.routePillText} numberOfLines={1}>
              {routeInfo.name.toUpperCase()}
              {routeInfo.summary ? `  ·  ${routeInfo.summary}` : ''}
            </Text>
          </View>
        ) : null}
        <View style={styles.topPill}>
          <View style={[styles.liveDot, paused && styles.liveDotPaused]} />
          <Text style={styles.topPillText}>
            {paused
              ? 'EN PAUSE'
              : simDone
                ? 'DESTINATION ATTEINTE'
                : `ARRIVÉE ${Math.max(1, Math.ceil(etaS / 60))} MIN · ${pct} %`}
          </Text>
        </View>
        {/* Bandeau d'intention (AMENDEMENT-16 §1) : Conquérir → fermeture de
             boucle ; Défendre → frontière couverte. S'empile sous l'ETA, ne la
             remplace jamais. Rien sans intention (run libre). */}
        {intentionBanner ? (
          <View style={styles.intentionPill}>
            <Icon
              name={completeBoundary ? 'route' : intention === 'defense' ? 'bouclier' : 'cible'}
              size={13}
              color={colors.chartreuse}
            />
            <Text style={styles.intentionPillText} numberOfLines={1}>
              {intentionBanner}
            </Text>
          </View>
        ) : null}
        {tick.event !== null ? (
          <View style={styles.eventPillWrap}>
            <StatePill
              state={LIVE_EVENT_META[tick.event].state}
              label={LIVE_EVENT_META[tick.event].label}
            />
          </View>
        ) : null}
        {/* Boucle (mode Carte) : « Ferme ta boucle » à l'approche, état fermé ensuite. */}
        {loopPillVisible ? (
          <View style={styles.loopPill}>
            <Icon name="route" size={13} color={colors.chartreuse} />
            <Text style={styles.loopPillText} numberOfLines={1}>
              {loopClosed
                ? `BOUCLE FERMÉE · +${formatInt(enclosedZones)} ZONES`
                : `FERME TA BOUCLE · À ~${loopDistLabel} M`}
            </Text>
          </View>
        ) : null}
        {/* Allié live UTILE (§C.4) : opt-in, mission SEULEMENT — filtré en amont.
             Un seul allié mis en avant (anti-bruit) ; la carte porte les points. */}
        {mateLine ? (
          <View style={styles.matePill}>
            <View style={styles.mateDotSmall} />
            <Text style={styles.matePillText} numberOfLines={1}>
              {mateLine}
            </Text>
          </View>
        ) : null}
        {/* Rival PAR SECTEUR (§C.4) : activité détectée, RETARDÉE — jamais une
             position exacte. Halo orange sur la carte, texte au passé ici. */}
        {rival ? (
          <View style={styles.rivalPill}>
            <Icon name="cible" size={12} color={gameColors.rival} />
            <Text style={styles.rivalPillText} numberOfLines={1}>
              {rivalSectorLine(rival)}
            </Text>
          </View>
        ) : null}
        {!conquest ? (
          <View style={styles.statsOnlyPill}>
            <Icon name={mode === 'course_privee' ? 'discret' : 'feed'} size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText}>
              {RUN_MODE_LABEL[mode]} — stats uniquement, aucune capture
            </Text>
          </View>
        ) : null}
        {/* Mode dégradé GPS (AMENDEMENT-15 §2) : UNE phrase, jamais bloquant. */}
        {notice !== null ? (
          <View style={styles.statsOnlyPill}>
            <Icon name="gps" size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText} numberOfLines={2}>
              {notice}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Toast de feedback scripté (1 seul, remplacé par le suivant) ── */}
      {toast ? (
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
        <Icon name={card.icon} size={15} color={colors.chartreuse} />
        <Text style={styles.liveCardKicker} numberOfLines={1}>
          {card.kicker}
        </Text>
        <Text style={styles.liveCardValue} numberOfLines={1}>
          {card.value}
        </Text>
      </View>
      {card.detail ? (
        <Text style={styles.liveCardDetail} numberOfLines={1}>
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
      <Icon name={ind.icon as IconName} size={15} color={ind.tint} />
      <Text style={[styles.n2Text, { color: ind.tint }]} numberOfLines={1}>
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
          <Icon name={ind.icon as IconName} size={26} color={colors.chartreuse} />
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
        <View style={styles.pingsHandle} />
        <Text style={styles.pingsKicker}>PING RAPIDE AU CREW</Text>
        <View style={styles.pingsGrid}>
          {QUICK_PINGS.map((ping) => (
            <Pressable
              key={ping.id}
              accessibilityRole="button"
              accessibilityLabel={`Ping : ${ping.label}`}
              onPress={() => onSend(ping)}
              style={({ pressed }) => [styles.pingChip, pressed && styles.pressed]}
            >
              <Icon name={ping.icon} size={16} color={colors.chartreuse} />
              <Text style={styles.pingChipText} numberOfLines={1}>
                {ping.label}
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

/** Jauge de confiance GRYD Verify — bleu verify OK, rouge éteint si dégradé. */
function TrustGauge({ icon, label, value }: { icon: 'gps' | 'radar'; label: string; value: number }) {
  const ok = value >= VERIFIED_MIN_TRUST;
  const tint = ok ? gameColors.verify : gameColors.danger;
  return (
    <View style={styles.trustGauge}>
      <View style={styles.trustHead}>
        <Icon name={icon} size={14} color={tint} />
        <Text style={styles.trustLabel}>{label}</Text>
        <Text style={[styles.trustValue, { color: tint }]}>{value}</Text>
      </View>
      <ProgressBar value={value / 100} height={4} fill={tint} />
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

/** Glyphe pause/lecture local (icônes shared sans pictogramme lecteur). */
function PausePlayGlyph({ paused, size }: { paused: boolean; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {paused ? (
        <Path d="M7 4.5 L15.5 10 L7 15.5 Z" fill={colors.chartreuse} />
      ) : (
        <>
          <Path d="M7 4.5v11" stroke={colors.blanc} strokeWidth={3} strokeLinecap="round" />
          <Path d="M13 4.5v11" stroke={colors.blanc} strokeWidth={3} strokeLinecap="round" />
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
 * Pause/reprendre — même gabarit que FloatingMapButton (44 px, carbone),
 * glyphe pause/lecture local (mode Carte).
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
      <PausePlayGlyph paused={paused} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  topArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 340,
  },
  routePillText: {
    color: colors.gris,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  topPillText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.chartreuse,
  },
  liveDotPaused: { backgroundColor: colors.gris },
  // ── Boucle (AMENDEMENT-12 §C) : pill carte + ligne texte du mode Stats ──
  loopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 340,
  },
  loopPillText: {
    color: colors.chartreuse,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  loopLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
    marginTop: 6,
  },
  loopLineAccent: { color: colors.chartreuse },
  // ── Bandeau d'intention (AMENDEMENT-16 §1) : filet chartreuse discret, même
  //    gabarit que la pill boucle (l'intention guide, ne crie pas). ──
  intentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 340,
  },
  intentionPillText: {
    color: colors.blanc,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  /** Le Stat ZONES garde sa part de rangée quand il saute (scale). */
  zoneStatWrap: { flex: 1 },
  /** Neutralise l'alignSelf flex-start du StatePill (pill centrée en haut). */
  eventPillWrap: { flexDirection: 'row', justifyContent: 'center' },
  statsOnlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statsOnlyText: { color: colors.gris, fontSize: 11 },
  // ── Allié live (§C.4) : pill chartreuse discret, un seul mis en avant ──
  matePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 344,
  },
  mateDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.chartreuse,
  },
  matePillText: {
    color: colors.blanc,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  // ── Rival PAR SECTEUR (§C.4) : pill orange, texte au passé (retardé) ──
  rivalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,92,51,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 344,
  },
  rivalPillText: {
    color: gameColors.rival,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

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
    paddingVertical: 11,
    gap: 8,
  },
  liveCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveCardKicker: {
    color: colors.gris,
    fontSize: 11,
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
  liveCardDetail: { color: colors.gris, fontSize: 12, fontWeight: '600', marginTop: -2 },
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
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 30,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pingsSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.carbone,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
    gap: 12,
  },
  pingsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.grisLigne,
    alignSelf: 'center',
  },
  pingsKicker: {
    color: colors.gris,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  pingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  secondaryLabel: {
    color: colors.gris,
    fontSize: 9.5,
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
    paddingVertical: 5,
    marginTop: 16,
  },
  verifiedText: {
    color: gameColors.verify,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  statsControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 26,
  },
  bigControlWrap: { alignItems: 'center', gap: 7 },
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
    borderColor: 'rgba(250,250,247,0.35)',
  },
  bigStopSquare: { width: 18, height: 18, borderRadius: 3.5, backgroundColor: colors.blanc },
  bigLabel: {
    color: colors.gris,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  floatColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'center' },
  pauseDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseDiscActive: {
    backgroundColor: colors.chartreuse14,
    borderColor: colors.chartreuse40,
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
  scaleLabel: { color: colors.gris, fontSize: 9, marginTop: 3, fontVariant: ['tabular-nums'] },
  attribution: { color: colors.gris, opacity: 0.7, fontSize: 9, marginTop: 2 },

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
  statLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8 },
  stopButton: {
    width: STOP_BUTTON_SIZE,
    height: STOP_BUTTON_SIZE,
    borderRadius: STOP_BUTTON_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(250,250,247,0.35)',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rowTextWrap: { flex: 1, gap: 1 },
  rowKicker: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2 },
  rowValue: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  rowRight: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  objectiveCard: {
    backgroundColor: colors.carbone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  trustRow: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  trustGauge: { flex: 1, gap: 5 },
  trustHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  trustValue: { fontSize: fontSizes.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // ── Sheet ouverte : splits + états ──
  openSlot: { paddingHorizontal: spacing.cardPadding, paddingTop: 16, gap: 8 },
  sectionKicker: { color: colors.gris, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  splitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 },
  splitCell: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  splitKm: { color: colors.gris, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  splitPace: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  splitEmpty: { color: colors.gris, fontSize: fontSizes.xs },
  eventLog: { gap: 6 },
  eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTime: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
});
