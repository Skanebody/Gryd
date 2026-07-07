/**
 * GRYD — RÉSULTAT DE COURSE (AMENDEMENT-08 §5 reformulé AMENDEMENT-11 §5) :
 * LE moment dopamine, SANS hexagone visible. Séquence animée en étapes
 * (reveal + haptic par étape, doc §25) : 1 COURSE VALIDÉE + GRYD VERIFIED →
 * 2 +214 ZONES CAPTURÉES (KPI géant) → 3 SECTEUR MODIFIÉ / Frontière
 * repoussée (avant/après en TRAITS NETS, AMENDEMENT-13 §4ter : la frontière
 * rivale puis TA BOUCLE ROUTÉE qui l'a repoussée — géométries allTerritories,
 * jamais de cellules ni de blob) → 4 contribution crew (KPI géant + rang
 * gagné conservé) → 5 bonus performance → 6 BADGE DÉBLOQUÉ (reveal plein
 * écran, glow par tier) → 7 share card virale (mini carte aux frontières
 * nettes + route brillante + gros chiffre). « Passer » saute à la fin ;
 * reduce motion = fondus simples (useReveal/useCountUp).
 * Hors conquête, la séquence s'adapte (AMENDEMENT-07) : social_run = stats +
 * partage sans capture ; course_privee = stats seules, aucun partage.
 * Les stats sont REJOUÉES depuis la simulation déterministe (params mode + t).
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type IngestRunResponse,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import {
  BadgeCard,
  CrewCrest,
  RankUpCard,
  ShareCard,
  StatePill,
  useCountUp,
  useReduceMotion,
  useReveal,
} from '../src/ui/game';
import {
  BADGE_FAMILIES,
  BADGE_TIER_STYLE,
  badgeById,
  badgeColor,
  type BadgeDef,
} from '../src/features/badges/catalog';
import { GripMascot } from '../src/features/social/GripMascot';
import { gripRankForLevel, playerLevelForXp } from '../src/features/crew/rules';
import { MY_SOCIAL_PROFILE } from '../src/features/social/demo';
import Svg, { Path, Polyline } from 'react-native-svg';
import {
  CORRIDOR_HALF_WIDTH_M,
  loopRing,
  ribbonRing,
} from '../src/features/map/allTerritories';
import {
  BOUCLE_REPUBLIQUE,
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  RUE_FAUBOURG_DU_TEMPLE,
  type LatLngPoint,
} from '../src/features/map/realAnchors';
import { territoryStyle } from '../src/features/map/mapStyle';
import { ResultReveal } from '../src/features/run/ResultReveal';
import {
  boundaryExpiryLabel,
  contributionPct,
  intentionFromParam,
  partialBoundaryById,
  resultSummaryLines,
  summaryHeader,
  tracedKmLabel,
  type PartialBoundaryDemo,
  type ResultSummaryLine,
} from '../src/features/run/intention';
import { buildLiveNav } from '../src/features/run/liveNav';
import { buildRunLoop, loopSummaryAt, type RunLoop } from '../src/features/run/loop';
import {
  buildRunSimulation,
  formatClock,
  formatKm,
  formatPace,
  resultStats,
  runModeFromParam,
  type LiveRunMode,
} from '../src/features/run/simulation';
// AMENDEMENT-23 §B.4 — explicabilité post-run : schéma « la boucle fait la zone »
// (réutilisé, DÉMO surchargée par les vrais totaux du run) + verify en libellé
// dérivé des constantes gelées (jamais de nombre magique).
import { BoucleFaitLaZone } from '../src/features/explain/schemas';
import { verifyTiersLabel } from '../src/features/explain/labels';

/** Cadence de la séquence (présentation) — raccourcie si reduce motion. */
const STEP_MS = 1_500;
const STEP_REDUCED_MS = 650;

/**
 * Badge débloqué du SCÉNARIO démo (doc §10 : « Badge Route Opened débloqué »).
 * Mise en scène : cette course ouvre la 10ᵉ route → Route Opened III (tier race).
 * TODO(O1) : brancher la réponse `newBadges` d'ingest_run.
 */
const DEMO_UNLOCKED_BADGE_ID = 'route_opened_3';

/**
 * AMENDEMENT-19 §4/§7 — bonus ciblé APPLIQUÉ par cette course (démo). En prod,
 * cet objet vient d'IngestRunResponse.bonusApplied (le serveur reste seul juge :
 * active_bonus éligible, cap +35 %, un seul multiplicateur). `effect` est un
 * libellé COURT prêt à afficher — jamais points/territoire/rang. Ici la course
 * de conquête ferme la frontière crew République → Bonus Finisher, +25 % coffre.
 * TODO(O1) : remplacer par la vraie réponse d'ingest_run.
 */
const DEMO_BONUS_APPLIED: IngestRunResponse['bonusApplied'] = {
  bonusId: 'finisher',
  name: 'Bonus Finisher',
  effect: '+25 % coffre crew',
};

/**
 * AMENDEMENT-23 §B.4 — décomposition du calcul de CE run (démo). Les 3 nombres
 * de zones (trace seule / boucle / gain) sont DÉRIVÉS des vrais totaux du run
 * (stats.hexes / stats.enclosedZones) ; ceux-ci sont des SCÉNARIOS démo comme
 * le reste des fichiers demo.ts — en prod = IngestRunResponse. `zonesDefended` /
 * `routesOpened` / `segmentsExcluded` ne sont pas simulés côté moteur d'affichage :
 * scénario démo « une conquête propre, une frontière défendue, aucun segment jeté ».
 * TODO(O1) : remplacer par la réponse d'ingest_run (breakdown du serveur, seul juge).
 */
const DEMO_CALC_BREAKDOWN = {
  zonesDefended: 12,
  routesOpened: 1,
  segmentsExcluded: 0,
} as const;

type StepId =
  | 'validated'
  | 'zones'
  | 'sector'
  | 'crew'
  | 'perf'
  | 'bonus'
  | 'badge'
  | 'share'
  | 'stats';

const STEPS_BY_MODE: Record<LiveRunMode, readonly StepId[]> = {
  conquete: ['validated', 'zones', 'sector', 'crew', 'perf', 'bonus', 'badge', 'share'],
  social_run: ['validated', 'stats', 'share'],
  course_privee: ['validated', 'stats'],
};

// ─── Mini-cartes du secteur en TRAITS NETS (AMENDEMENT-13 §4ter) ─────────────
// « La frontière EST le tracé du coureur » : plus aucun disque H3 lissé —
// AVANT montre la frontière RIVALE (ruban net rue du Faubourg-du-Temple),
// APRÈS y ajoute TA BOUCLE ROUTÉE (grande boucle République, trait continu +
// remplissage faible) qui a repoussé cette frontière. Géométries d'authoring
// d'allTerritories/realAnchors (une seule source pour toutes les surfaces).
// Pur rendu — les % affichés viennent des stats, le serveur reste décideur.

/** ViewBox carrée des mini-cartes. */
const SECTOR_VB = 100;
const SECTOR_PAD = 8;
/** Frontières §4ter (trait continu 2-2,5 px — proportions Battle Map). */
const SECTOR_BORDER_W = 2;
const SECTOR_RIVAL_BORDER_W = 2.4;
const SECTOR_ROUTE_W = 2.6;

interface SectorSide {
  crewPath: string;
  rivalPath: string;
}

interface SectorGeometry {
  before: SectorSide;
  after: SectorSide;
  /** Polyline (points SVG) de la course qui a repoussé la frontière. */
  routePoints: string;
}

/** Projection écran locale (lng/lat → px de viewBox). */
type Project = (lng: number, lat: number) => { x: number; y: number };

/** Projection à aspect conservé d'une bbox géo vers une viewBox paddée. */
function fitProjection(
  rings: readonly (readonly [number, number][])[],
  vbMax: number,
  pad: number,
): { project: Project; vbW: number; vbH: number } {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  const spanX = Math.max(1, (maxLng - minLng) * REAL_M_PER_DEG_LNG);
  const spanY = Math.max(1, (maxLat - minLat) * REAL_M_PER_DEG_LAT);
  const k = (vbMax - pad * 2) / Math.max(spanX, spanY);
  return {
    vbW: spanX * k + pad * 2,
    vbH: spanY * k + pad * 2,
    project: (lng, lat) => ({
      x: pad + (lng - minLng) * REAL_M_PER_DEG_LNG * k,
      y: pad + (maxLat - lat) * REAL_M_PER_DEG_LAT * k,
    }),
  };
}

/** Anneau [lng, lat] → path SVG fermé. */
function ringPath(ring: readonly [number, number][], project: Project): string {
  let d = '';
  ring.forEach(([lng, lat], i) => {
    const { x, y } = project(lng, lat);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${d} Z`;
}

/** Tracé lat/lng → points de Polyline SVG. */
function tracePoints(trace: readonly LatLngPoint[], project: Project): string {
  return trace
    .map((p) => {
      const { x, y } = project(p.lng, p.lat);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** AVANT (frontière rivale) / APRÈS (ta boucle routée) — traits nets §4ter. */
function buildSectorGeometry(): SectorGeometry {
  const rivalRing = ribbonRing(RUE_FAUBOURG_DU_TEMPLE, CORRIDOR_HALF_WIDTH_M);
  const crewRing = loopRing(BOUCLE_REPUBLIQUE);
  // Projection COMMUNE aux deux côtés (la frontière ne « saute » pas).
  const { project } = fitProjection([rivalRing, crewRing], SECTOR_VB, SECTOR_PAD);
  const rivalPath = ringPath(rivalRing, project);
  return {
    before: { crewPath: '', rivalPath },
    after: { crewPath: ringPath(crewRing, project), rivalPath },
    // La route brillante EST le tracé de la boucle (refermée sur le départ).
    routePoints: tracePoints(
      [...BOUCLE_REPUBLIQUE, BOUCLE_REPUBLIQUE[0] ?? { lat: 0, lng: 0 }],
      project,
    ),
  };
}

// ─── Mini-cartes AVANT/APRÈS de la boucle (AMENDEMENT-12 §C, §4ter) ─────────
// Le remplissage RÉEL de la course, en TRAITS NETS : ruban net le long de la
// trace parcourue (AVANT — le trait/couloir) → polygone de la boucle rempli
// (APRÈS — le tracé EST la frontière), avec la trace par-dessus. Rendu
// uniquement — les zones affichées sont les estimations dérivées du moteur.

/** Padding de la viewBox des mini-cartes boucle. */
const LOOP_VB_PAD = 6;
/** Grand côté de la viewBox — le petit suit l'aspect réel de la course. */
const LOOP_VB_MAX = 100;
/** Largeur de la trace de course sur la mini-carte. */
const LOOP_ROUTE_W = 2.2;

interface LoopGeometry {
  vbW: number;
  vbH: number;
  /** Ruban NET le long de la trace (AVANT — le couloir §4ter). */
  beforePath: string;
  /** Polygone de la boucle — le tracé refermé (APRÈS — le remplissage). */
  afterPath: string;
  /** Polyline de la trace (la boucle elle-même). */
  routePoints: string;
}

/** Projette couloir/boucle §4ter dans une viewBox à l'aspect de la course. */
function buildLoopGeometry(loop: RunLoop): LoopGeometry | null {
  if (loop.traceGeo.length < 3) return null;
  const corridorRing = ribbonRing(loop.traceGeo, CORRIDOR_HALF_WIDTH_M);
  const loopPolyRing = loopRing(loop.traceGeo);
  if (corridorRing.length === 0) return null;
  // Cadrage sur le RUBAN (léger débord du trait — l'après tient dedans).
  const { project, vbW, vbH } = fitProjection([corridorRing], LOOP_VB_MAX, LOOP_VB_PAD);
  return {
    vbW,
    vbH,
    beforePath: ringPath(corridorRing, project),
    afterPath: ringPath(loopPolyRing, project),
    routePoints: tracePoints(loop.traceGeo, project),
  };
}

/** Un côté AVANT/APRÈS de la boucle (trait net §4ter + trace — fill nonzero :
    le ruban d'une course refermée se recouvre au départ sans se trouer). */
function LoopMiniMap({ d, route, vbW, vbH }: { d: string; route?: string; vbW: number; vbH: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}`}>
      <Path d={d} fill={colors.noir} />
      <Path
        d={d}
        fill={territoryStyle.crewFill}
        stroke={territoryStyle.crewStroke}
        strokeWidth={SECTOR_BORDER_W}
        strokeLinejoin="round"
      />
      {route ? (
        <Polyline
          points={route}
          fill="none"
          stroke={territoryStyle.routeStroke}
          strokeWidth={LOOP_ROUTE_W}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

/** AVANT/APRÈS organique du remplissage (« Ferme la boucle, tu prends la zone »). */
function LoopBeforeAfter({
  geometry,
  corridorZones,
  totalZones,
}: {
  geometry: LoopGeometry;
  corridorZones: number;
  totalZones: number;
}) {
  const aspect = geometry.vbW / geometry.vbH;
  return (
    <View style={styles.sectorCard}>
      <Text style={styles.sectorTitle} numberOfLines={1}>
        LA BOUCLE FAIT LA ZONE
      </Text>
      <View style={styles.sectorRow}>
        <View style={styles.sectorSide}>
          <View style={[styles.loopMap, { aspectRatio: aspect }]}>
            <LoopMiniMap d={geometry.beforePath} route={geometry.routePoints} vbW={geometry.vbW} vbH={geometry.vbH} />
          </View>
          <Text style={styles.sectorSideLabel}>LE TRAIT</Text>
          <Text style={styles.sectorPct}>+{formatInt(corridorZones)}</Text>
        </View>
        <Icon name="chevron" size={20} color={colors.gris} />
        <View style={styles.sectorSide}>
          <View style={[styles.loopMap, { aspectRatio: aspect }]}>
            <LoopMiniMap d={geometry.afterPath} route={geometry.routePoints} vbW={geometry.vbW} vbH={geometry.vbH} />
          </View>
          <Text style={styles.sectorSideLabel}>LA BOUCLE</Text>
          <Text style={[styles.sectorPct, styles.sectorPctAfter]}>+{formatInt(totalZones)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Rendu SVG d'un côté (§4ter : ruban frontière rivale dessous, boucle crew
    nette dessus — traits continus, remplissages faibles, route optionnelle). */
function SectorMiniMap({ side, route }: { side: SectorSide; route?: string }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SECTOR_VB} ${SECTOR_VB}`}>
      {side.rivalPath ? (
        <Path
          d={side.rivalPath}
          fill={territoryStyle.rivalFill}
          stroke={territoryStyle.rivalStroke}
          strokeWidth={SECTOR_RIVAL_BORDER_W}
          strokeLinejoin="round"
        />
      ) : null}
      {side.crewPath ? (
        <>
          {/* Sous-couche opaque : la chartreuse RECOUVRE l'orange à la
              frontière (la zone de recouvrement ne devient jamais boueuse). */}
          <Path d={side.crewPath} fill={colors.noir} />
          <Path
            d={side.crewPath}
            fill={territoryStyle.crewFill}
            stroke={territoryStyle.crewStroke}
            strokeWidth={SECTOR_BORDER_W}
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {route ? (
        <>
          <Polyline
            points={route}
            fill="none"
            stroke={territoryStyle.routeStroke}
            strokeWidth={SECTOR_ROUTE_W}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={route}
            fill="none"
            stroke={colors.blanc}
            strokeWidth={0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        </>
      ) : null}
    </Svg>
  );
}

/** Avant/après §4ter du secteur — la frontière EST le tracé, pas des cellules. */
function SectorBeforeAfter({
  zoneName,
  pctBefore,
  pctAfter,
  geometry,
}: {
  zoneName: string;
  pctBefore: number;
  pctAfter: number;
  geometry: SectorGeometry;
}) {
  return (
    <View style={styles.sectorCard}>
      <Text style={styles.sectorTitle} numberOfLines={1}>
        {zoneName.toUpperCase()} · FRONTIÈRE REPOUSSÉE
      </Text>
      <View style={styles.sectorRow}>
        <View style={styles.sectorSide}>
          <View style={styles.sectorMap}>
            <SectorMiniMap side={geometry.before} />
          </View>
          <Text style={styles.sectorSideLabel}>AVANT</Text>
          <Text style={styles.sectorPct}>{pctBefore} %</Text>
        </View>
        <Icon name="chevron" size={20} color={colors.gris} />
        <View style={styles.sectorSide}>
          <View style={styles.sectorMap}>
            <SectorMiniMap side={geometry.after} route={geometry.routePoints} />
          </View>
          <Text style={styles.sectorSideLabel}>APRÈS</Text>
          <Text style={[styles.sectorPct, styles.sectorPctAfter]}>{pctAfter} %</Text>
        </View>
      </View>
    </View>
  );
}

function tickParam(param: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const n = raw !== undefined ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** État de frontière crew à afficher au résultat (chantier 2, param démo). */
type BoundaryState = 'open' | 'completed';

/** Parse le param `boundary_state` — sinon null (séquence dopamine normale). */
function boundaryStateFromParam(
  param: string | string[] | undefined,
): BoundaryState | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'open' || value === 'completed') return value;
  return null;
}

export default function CourseResultScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    t?: string;
    queued?: string;
    route?: string;
    intention?: string;
    /** AMENDEMENT-17 §CH2 — id de la frontière crew rejouée (démo). */
    boundary?: string;
    /** AMENDEMENT-17 §CH2 — `open` (fermable) ou `completed` (boucle crew fermée). */
    boundary_state?: string;
  }>();

  // AMENDEMENT-17 §CH2 — la frontière crew court-circuite la séquence dopamine :
  // un seul écran = une seule action (ouvrir/terminer). Piloté par `boundary` +
  // `boundary_state` (démo) — en prod ces états viennent d'IngestRunResponse
  // (openBoundary / boundaryCompleted). Le serveur reste seul décideur.
  const boundaryState = boundaryStateFromParam(params.boundary_state);
  if (boundaryState !== null) {
    const boundary = partialBoundaryById(params.boundary);
    return boundaryState === 'open' ? (
      <OpenBoundaryResult boundary={boundary} />
    ) : (
      <CompletedBoundaryResult boundary={boundary} />
    );
  }

  return <ConquestResultScreen params={params} />;
}

function ConquestResultScreen({
  params,
}: {
  params: {
    mode?: string;
    t?: string;
    queued?: string;
    route?: string;
    intention?: string;
  };
}) {
  const insets = useSafeAreaInsets();
  // Signature du joueur au moment dopamine : GRIP à son rang (dérivé de l'XP permanent).
  const gripRank = gripRankForLevel(playerLevelForXp(MY_SOCIAL_PROFILE.xp));
  const mode = runModeFromParam(params.mode);
  // Intention (AMENDEMENT-16 §1) : teinte la SYNTHÈSE multi-résultats + la copy
  // §28 (Conquête/Défense/Run libre) — jamais l'attribution (le serveur décide).
  const intention = intentionFromParam(params.intention);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  const tickIndex = tickParam(params.t, sim.ticks.length - 1);
  // Boucle (AMENDEMENT-12) : rejouée depuis la même démo déterministe — même
  // itinéraire routé que la course si `route=<id>` (AMENDEMENT-13 §4ter) ; les
  // zones intérieures entrent dans les totaux AVANT points/bonus.
  const nav = useMemo(() => buildLiveNav(sim, params.route), [sim, params.route]);
  const loop = useMemo(() => buildRunLoop(sim, nav), [sim, nav]);
  const stats = useMemo(
    () => resultStats(sim, tickIndex, loopSummaryAt(loop, tickIndex)),
    [sim, tickIndex, loop],
  );
  const reduce = useReduceMotion();

  const conquest = mode === 'conquete';
  const isPrivate = mode === 'course_privee';

  // AMENDEMENT-20 §2 — Résultat en 3 temps. L'écran 1 est ULTRA simple
  // (titre + KPI géant + 1 ligne émotionnelle + [Partager]). Tous les détails
  // techniques (Impact, GRYD Verified, analyse boucle) se déplient AU TAP, pas
  // sur le premier écran. Plus de séquence dopamine qui étale tout : on garde
  // le reveal de l'écran 1, l'état final = 1 résultat clair + détails repliés.
  const [showDetails, setShowDetails] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // AMENDEMENT-23 §B.4 — sous-accordéon « Comment est calculé ce résultat ? »
  // (dans « Voir détails », replié par défaut — détail au tap, zéro flou).
  const [showCalc, setShowCalc] = useState(false);

  const badge = mode === 'conquete' ? badgeById(DEMO_UNLOCKED_BADGE_ID) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

  // AMENDEMENT-19 §4/§7 — bonus ciblé appliqué (conquête, démo). En prod =
  // IngestRunResponse.bonusApplied. UN seul bonus principal, libellé court.
  const bonusApplied = mode === 'conquete' ? DEMO_BONUS_APPLIED : undefined;

  // Mini-cartes en traits nets §4ter (avant/après + share card) — conquête.
  const sectorGeo = useMemo(
    () => (mode === 'conquete' ? buildSectorGeometry() : null),
    [mode],
  );
  // AVANT/APRÈS du remplissage de boucle — seulement si la boucle est fermée.
  const loopGeo = useMemo(
    () => (stats.loopClosed && loop ? buildLoopGeometry(loop) : null),
    [stats.loopClosed, loop],
  );

  useEffect(() => {
    screen('course_result', { mode });
    track(EVENTS.celebrationViewed, { mode });
  }, [mode]);

  // Reveal de l'écran 1 : un seul temps (émotionnel d'abord). Le KPI apparaît,
  // haptic success — puis c'est stable. Reduce motion = quasi instantané.
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), reduce ? STEP_REDUCED_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [reduce]);

  const goMap = () => router.replace('/(tabs)');
  const share = () => {
    haptics.medium();
    track(EVENTS.shareCardGenerated);
    router.push({ pathname: '/partage', params: { mode, intention: params.intention ?? '' } });
  };
  const toggleDetails = () => {
    haptics.light();
    setShowDetails((v) => !v);
  };
  const toggleCalc = () => {
    haptics.light();
    setShowCalc((v) => !v);
  };

  // AMENDEMENT-23 §B.4 — décomposition zones de CE run : le trait capture le
  // passage, la boucle ajoute l'intérieur (mêmes totaux que l'IMPACT). Les
  // valeurs viennent des stats du run (démo) — le schéma les affiche.
  const traceZones = Math.max(0, stats.hexes - stats.enclosedZones);
  const loopGain = stats.enclosedZones;
  const totalZones = stats.hexes;
  const verifyTiers = verifyTiersLabel();

  // Synthèse multi-résultats (doc §2/§3.1) — conquête seulement (les modes
  // social/privé gardent leur bilan stats). L'intention teinte l'accent + la
  // copy §28 ; le tracé (démo) produit tous les effets listés.
  const summary = summaryHeader(intention);
  // §A r.1/r.20 — l'IMPACT ne répète pas le % de zone : la ligne `crew`
  // (« {zone} +X % ») est déjà portée par la section CONTRIBUTION CREW plus bas
  // ET par la heroLine de l'écran 1. On la retire ici pour tenir la card à 3
  // idées (conquête · défense · route) et supprimer la redondance.
  const summaryLines = conquest
    ? resultSummaryLines(intention, stats.zoneName, stats.zonePctAfter - stats.zonePctBefore).filter(
        (line) => line.icon !== 'crew',
      )
    : [];
  // Ligne émotionnelle de l'écran 1 (courte, jamais tronquée) :
  // « République défendue · Paris Est +5 % ».
  const heroLine = conquest
    ? `${summary.kicker} · ${stats.zoneName} +${stats.zonePctAfter - stats.zonePctBefore} %`
    : isPrivate
      ? 'Course privée · visible par toi seul'
      : `Social Run · ${formatKm(stats.distanceM)} km`;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Barre : kicker seul (plus de « Passer » — l'écran 1 est déjà l'état final). */}
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
        <View style={styles.skip} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── ÉCRAN 1 — émotionnel d'abord, lisible en 2 s (AMENDEMENT-20 §2) ───
             Titre + KPI GÉANT + 1 ligne + CTA. RIEN d'autre : la validation
             GPS/Motion, l'impact détaillé et l'analyse boucle sont AU TAP. */}
        <ResultReveal visible haptic="success" style={styles.hero}>
          {/* GRIP célèbre — petit, au-dessus du KPI (il personnalise, il ne vole pas la vedette). */}
          <View style={styles.heroGrip}>
            <GripMascot rank={gripRank} size={64} />
          </View>
          <Text style={styles.heroTitle}>
            {isPrivate ? 'COURSE ENREGISTRÉE' : 'COURSE VALIDÉE'}
          </Text>

          {/* KPI géant — le chiffre qui se comprend en 2 s. */}
          {conquest ? (
            <View style={styles.heroKpi}>
              <ZoneCountUp value={stats.hexes} run={revealed} />
              <Text style={styles.heroKpiLabel}>ZONES</Text>
            </View>
          ) : (
            <View style={styles.heroKpi}>
              <Text style={styles.zonesHero}>{formatKm(stats.distanceM)}</Text>
              <Text style={styles.heroKpiLabel}>KM</Text>
            </View>
          )}

          {/* 1 ligne émotionnelle, courte, jamais tronquée. */}
          <Text style={styles.heroLine} numberOfLines={1}>
            {heroLine}
          </Text>
          {/* Fin hors-ligne (AMENDEMENT-15 §2) : discret, anti-shame, jamais bloquant. */}
          {params.queued === '1' ? (
            <Text style={styles.heroQueued} numberOfLines={1}>
              Envoi dès que possible.
            </Text>
          ) : null}
        </ResultReveal>

        {/* CTA — [Partager] IMMÉDIAT (façon Strava) + [Voir détails] secondaire. */}
        <ResultReveal visible={revealed} haptic="none" style={styles.actions}>
          {!isPrivate ? (
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="partage" size={18} color={colors.noir} />
              <Text style={styles.shareLabel}>Partager</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showDetails ? 'Masquer les détails' : 'Voir les détails'}
            onPress={toggleDetails}
            style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
          >
            <Text style={styles.detailsToggleLabel}>
              {showDetails ? 'Masquer les détails' : 'Voir détails'}
            </Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir la carte"
            onPress={goMap}
            hitSlop={8}
            style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
          >
            <Text style={styles.mapLinkLabel}>Voir la carte</Text>
          </Pressable>
        </ResultReveal>

        {/* ─── VOIR DÉTAILS — 3ᵉ temps (technique, au tap) ─────────────────────
             Impact · GRYD Verified · Analyse « La boucle fait la zone ». Replié
             par défaut : l'écran 1 reste lisible en 2 s. */}
        {showDetails ? (
          <View style={styles.detailsWrap}>
            {/* IMPACT — synthèse multi-résultats + total. */}
            {conquest ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>IMPACT</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryLines}>
                    {summaryLines.map((line) => (
                      <SummaryLine key={line.icon} line={line} />
                    ))}
                  </View>
                  <View style={styles.impactTotalRow}>
                    <Text style={styles.impactTotalLabel}>TOTAL</Text>
                    <Text style={styles.impactTotalValue}>
                      +{formatInt(stats.hexes)}
                      {stats.loopClosed ? (
                        <Text style={styles.impactTotalSub}>
                          {'  '}dont {formatInt(stats.enclosedZones)} en boucle
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Stats (social / privé) — la distance domine. */}
            {!conquest ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>DÉTAILS</Text>
                <View style={styles.statsCard}>
                  <View style={styles.statsRow}>
                    <MiniStat label="TEMPS" value={formatClock(stats.durationS)} />
                    <MiniStat label="ALLURE" value={`${formatPace(stats.paceSPerKm)}/km`} />
                  </View>
                  <Text style={styles.statsNote}>
                    {isPrivate
                      ? 'Course privée — rien n\'apparaît sur la carte ni dans le feed.'
                      : 'Social Run — stats et badges comptent, aucune capture.'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* GRYD VERIFIED — la confiance de l'effort (technique). */}
            {!isPrivate ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>GRYD VERIFIED</Text>
                <View style={styles.verifiedCard}>
                  {stats.verified ? (
                    <StatePill state="verified" label="GRYD VERIFIED" />
                  ) : (
                    <StatePill state="statsonly" label="Stats enregistrées" />
                  )}
                  <View style={styles.verifiedTrust}>
                    <MiniStat label="GPS" value={String(stats.gpsTrust)} />
                    <MiniStat label="MOTION" value={String(stats.motionTrust)} />
                  </View>
                </View>
              </View>
            ) : null}

            {/* ANALYSE « La boucle fait la zone » — pédagogie + anim avant/après
                EXISTANTE, déplacée ICI (pas sur l'écran 1). */}
            {conquest && loopGeo ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>ANALYSE</Text>
                <LoopBeforeAfter
                  geometry={loopGeo}
                  corridorZones={stats.hexes - stats.enclosedZones}
                  totalZones={stats.hexes}
                />
                <Text style={styles.analyseSub}>
                  Boucle fermée : +{formatInt(stats.enclosedZones)} zones gagnées.
                </Text>
              </View>
            ) : null}

            {/* COMMENT EST CALCULÉ CE RÉSULTAT ? — explicabilité post-run
                (AMENDEMENT-23 §B.4). Un accordéon replié : au tap, le schéma
                « la boucle fait la zone » (trace / boucle / gain) + la
                décomposition (défense · routes · segments exclus · GPS · Motion
                · verify). Décrit le moteur réel ; seuils verify dérivés des
                constantes gelées (jamais de littéral). */}
            {conquest ? (
              <View style={styles.block}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showCalc
                      ? 'Masquer le calcul du résultat'
                      : 'Comment est calculé ce résultat ?'
                  }
                  onPress={toggleCalc}
                  style={({ pressed }) => [styles.calcHeader, pressed && styles.pressed]}
                >
                  <Icon name="boucle_fermee" size={16} color={colors.chartreuse} />
                  <Text style={styles.calcHeaderLabel}>
                    Comment est calculé ce résultat ?
                  </Text>
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
                      <CalcZoneRow label="Trace seule" value={`+${formatInt(traceZones)}`} />
                      <CalcZoneRow
                        label="Boucle fermée"
                        value={`+${formatInt(totalZones)}`}
                        accent
                      />
                      <CalcZoneRow label="Gain de boucle" value={`+${formatInt(loopGain)}`} />
                    </View>

                    {/* Grille technique : le reste du calcul, valeurs brutes. */}
                    <View style={styles.calcGrid}>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="DÉFENDUES"
                          value={`+${formatInt(DEMO_CALC_BREAKDOWN.zonesDefended)}`}
                        />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="ROUTES"
                          value={formatInt(DEMO_CALC_BREAKDOWN.routesOpened)}
                        />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="EXCLUS"
                          value={formatInt(DEMO_CALC_BREAKDOWN.segmentsExcluded)}
                        />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat label="GPS" value={String(stats.gpsTrust)} />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat label="MOTION" value={String(stats.motionTrust)} />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="VERIFY"
                          value={
                            stats.verified ? `≥ ${verifyTiers.full}` : `< ${verifyTiers.partial}`
                          }
                        />
                      </View>
                    </View>

                    {/* Statut verify — la conclusion, en une ligne. */}
                    <Text style={styles.calcVerifyNote} numberOfLines={2}>
                      {stats.verified
                        ? 'GPS et mouvement fiables : capture pleine.'
                        : 'GPS ou mouvement insuffisants : stats enregistrées, pas de capture.'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* SECTEUR — frontière repoussée (avant/après §4ter). */}
            {conquest && sectorGeo ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>FRONTIÈRE</Text>
                <SectorBeforeAfter
                  zoneName={stats.zoneName}
                  pctBefore={stats.zonePctBefore}
                  pctAfter={stats.zonePctAfter}
                  geometry={sectorGeo}
                />
              </View>
            ) : null}

            {/* CONTRIBUTION CREW — la zone monte. */}
            {conquest ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>CONTRIBUTION CREW</Text>
                <View style={styles.crewLine}>
                  <CrewCrest seed={stats.crewName} name={stats.crewName} size="s" />
                  <Text style={styles.crewText}>
                    {stats.zoneName} passe à{' '}
                    <Text style={styles.crewPct}>{stats.zonePctAfter} %</Text>
                    {stats.rankGained
                      ? ` — ${stats.crewName} gagne 1 rang.`
                      : ` — chaque zone compte pour ${stats.crewName}.`}
                  </Text>
                </View>
                {stats.rankGained ? (
                  <RankUpCard
                    fromRank={stats.crewRankBefore}
                    toRank={stats.crewRankAfter}
                    leagueLabel="PARIS LEAGUE · CREWS"
                    points={stats.totalPoints}
                    celebrate={false}
                  />
                ) : null}
              </View>
            ) : null}

            {/* BONUS APPLIQUÉ (AMENDEMENT-19 §4) — ligne sobre. */}
            {conquest && bonusApplied ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>BONUS APPLIQUÉ</Text>
                <View style={styles.bonusCard}>
                  <View style={styles.bonusIcon}>
                    <Icon name="cadeau" size={20} color={gameColors.crew} />
                  </View>
                  <View style={styles.bonusTextWrap}>
                    <Text style={styles.bonusName} numberOfLines={1}>
                      {bonusApplied.name}
                    </Text>
                    <Text style={styles.bonusEffect} numberOfLines={1}>
                      Bonus appliqué · {bonusApplied.effect}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* BADGE DÉBLOQUÉ — inline (le reveal plein écran n'encombre plus l'écran 1). */}
            {conquest && badge && badgeFamily ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>BADGE DÉBLOQUÉ</Text>
                <BadgeCard
                  name={badge.name}
                  family={badge.family}
                  familyLabel={badgeFamily.name}
                  familyColor={badgeColor(badge)}
                  tier={badge.tier}
                  state="unlocked"
                  requirement={badge.requirement}
                  reward="Frame de profil Routes"
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Compteur « +214 » qui monte (useCountUp — saut direct si reduce motion).
    `run` déclenche la montée quand l'écran 1 est révélé (émotionnel d'abord). */
function ZoneCountUp({ value, run = true }: { value: number; run?: boolean }) {
  const display = useCountUp(run ? value : 0);
  return <Text style={styles.zonesHero}>+{formatInt(display)}</Text>;
}

/** Une ligne de la synthèse multi-résultats (icône + texte, accent chartreuse). */
function SummaryLine({ line }: { line: ResultSummaryLine }) {
  return (
    <View style={styles.summaryLine}>
      <Icon name={line.icon} size={16} color={line.accent ? colors.chartreuse : colors.gris} />
      <Text style={[styles.summaryLineText, line.accent && styles.summaryLineAccent]} numberOfLines={1}>
        {line.text}
      </Text>
    </View>
  );
}

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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Reveal plein écran du badge — glow par tier (BADGE_TIER_STYLE), haptic medium. */
function BadgeOverlay({
  badge,
  familyLabel,
  familyColor,
  onContinue,
}: {
  badge: BadgeDef;
  familyLabel: string;
  familyColor: string;
  onContinue: () => void;
}) {
  const { opacity, scale } = useReveal(true);
  const tier = BADGE_TIER_STYLE[badge.tier];
  const glow = tier.glow ?? tier.ring;
  useEffect(() => {
    // Grammaire §25 : badge Race/Carbon = medium (Legend serait heavy).
    if (badge.tier === 'legend') haptics.heavy();
    else haptics.medium();
  }, [badge.tier]);
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.overlayInner, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.overlayKicker}>BADGE DÉBLOQUÉ</Text>
        <View
          style={[
            styles.badgeGlow,
            { borderColor: tier.ring, shadowColor: glow, shadowOpacity: tier.glow ? 0.8 : 0.4 },
          ]}
        >
          <BadgeCard
            name={badge.name}
            family={badge.family}
            familyLabel={familyLabel}
            familyColor={familyColor}
            tier={badge.tier}
            state="unlocked"
            requirement={badge.requirement}
            reward="Frame de profil Routes"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
        >
          <Text style={styles.continueLabel}>Continuer</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── AMENDEMENT-17 §CH2 — Résultat FRONTIÈRE OUVERTE (fermable non fermée) ───
// « Ouvre une frontière. Ton crew peut la fermer. » Un run VALIDE, long, NON
// bouclé mais FERMABLE : au lieu de jeter la course, on propose de la fermer
// (soi-même maintenant) OU de la confier au crew. UX simple, vocabulaire
// frontière/zone, jamais de polyline/cellule/% de géométrie : « Il manque
// 620 m. Expire dans 23 h. » Un écran = une action (les deux CTA cadrent la
// même décision : refermer la boucle).

function OpenBoundaryResult({ boundary }: { boundary: PartialBoundaryDemo }) {
  const insets = useSafeAreaInsets();
  const [askedToast, setAskedToast] = useState(false);

  useEffect(() => {
    screen('course_result', { mode: 'conquete', boundary: 'open' });
    track(EVENTS.celebrationViewed, { mode: 'conquete' });
    // Haptic d'ouverture : une frontière est née — success léger, jamais de shame.
    haptics.success();
  }, []);

  // « Demander au crew » (démo) : la mission part dans la War Room. Toast
  // éphémère (auto-dismiss) — pas de vraie notif ici (V1 : notif crew serveur).
  useEffect(() => {
    if (!askedToast) return;
    const id = setTimeout(() => setAskedToast(false), 2_600);
    return () => clearTimeout(id);
  }, [askedToast]);

  const finishNow = () => {
    haptics.medium();
    // Reprend la course en mode « terminer » : le live couvre le segment manquant.
    router.replace({
      pathname: '/course-live',
      params: { mode: 'conquete', intention: 'complete', boundary: boundary.id },
    });
  };
  const askCrew = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated);
    setAskedToast(true);
  };
  const goMap = () => router.replace('/(tabs)');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
        <View style={styles.skip} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Course validée + GRYD VERIFIED (le run compte — anti-shame). */}
        <ResultReveal visible haptic="none" style={styles.block}>
          <View style={styles.validated}>
            <Text style={styles.validatedTitle}>COURSE VALIDÉE</Text>
            <StatePill state="verified" label="GRYD VERIFIED" />
          </View>
        </ResultReveal>

        {/* FRONTIÈRE OUVERTE : le KPI = mètres manquants, pas un % de géométrie. */}
        <ResultReveal visible haptic="none" style={styles.block}>
          <View style={styles.boundaryCard}>
            <View style={styles.boundaryHead}>
              <Icon name="route" size={16} color={colors.chartreuse} />
              <Text style={styles.boundaryKicker}>FRONTIÈRE OUVERTE</Text>
            </View>
            <Text style={styles.boundaryLead}>
              Tu as tracé <Text style={styles.boundaryLeadAccent}>{tracedKmLabel(boundary)}</Text>{' '}
              autour de {boundary.zone}.
            </Text>
            <Text style={styles.boundaryMissing}>
              Il manque{' '}
              <Text style={styles.boundaryMissingAccent}>{formatInt(boundary.missingM)} m</Text>{' '}
              pour fermer la zone.
            </Text>
            <View style={styles.boundaryMetaRow}>
              <Icon name="verrou" size={13} color={colors.gris} />
              <Text style={styles.boundaryMeta}>{boundaryExpiryLabel(boundary)}</Text>
            </View>
          </View>
        </ResultReveal>
      </ScrollView>

      {/* Actions : Terminer maintenant (principal) · Demander au crew (secondaire). */}
      <View style={[styles.boundaryActions, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={finishNow}
          style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
        >
          <Icon name="route" size={18} color={colors.noir} />
          <Text style={styles.shareLabel}>Terminer maintenant</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={askCrew}
          style={({ pressed }) => [styles.boundarySecondary, pressed && styles.pressed]}
        >
          <Icon name="crew" size={17} color={colors.blanc} />
          <Text style={styles.boundarySecondaryLabel}>Demander au crew</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir la carte"
          onPress={goMap}
          hitSlop={8}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkLabel}>Voir la carte</Text>
        </Pressable>
      </View>

      {/* Toast « Mission envoyée dans la War Room. » (démo — auto-dismiss). */}
      {askedToast ? (
        <BoundaryToast
          bottom={insets.bottom + 96}
          text="Mission envoyée dans la War Room."
        />
      ) : null}
    </View>
  );
}

// ─── AMENDEMENT-17 §CH2 — Résultat BOUCLE CREW FERMÉE (complétion) ───────────
// Un membre a couru le segment manquant : la boucle se referme, la zone est
// CREW, les contributions se répartissent au prorata de la longueur validée.
// Copy gelée : « Boucle crew fermée · République capturée · Benjamin 79 % ·
// Lena 21 % · Crew +420 pts. » Simple, jamais de détail technique.

function CompletedBoundaryResult({ boundary }: { boundary: PartialBoundaryDemo }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    screen('course_result', { mode: 'conquete', boundary: 'completed' });
    track(EVENTS.celebrationViewed, { mode: 'conquete' });
    // La zone crew tombe : célébration franche (heavy) — le geste signature.
    haptics.heavy();
  }, []);

  const share = () => {
    haptics.medium();
    track(EVENTS.shareCardGenerated);
    router.push({ pathname: '/partage', params: { mode: 'conquete', intention: 'complete' } });
  };
  const goMap = () => router.replace('/(tabs)');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
        <View style={styles.skip} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Le titre = le geste : la boucle crew est fermée, la zone capturée. */}
        <ResultReveal visible haptic="success" style={styles.block}>
          <View style={styles.validated}>
            <Text style={styles.validatedTitle}>BOUCLE CREW FERMÉE</Text>
            <StatePill state="verified" label="GRYD VERIFIED" />
          </View>
        </ResultReveal>

        {/* KPI géant : la zone capturée (chartreuse). */}
        <ResultReveal visible style={styles.block}>
          <View style={styles.zonesBlock}>
            <Text style={styles.boundaryZoneHero} numberOfLines={1}>
              {boundary.zone}
            </Text>
            <Text style={styles.zonesLabel}>ZONE CAPTURÉE</Text>
          </View>
        </ResultReveal>

        {/* Contributions crew au prorata (moteur) — simple, sans géométrie. */}
        <ResultReveal visible style={styles.block}>
          <Text style={styles.stepKicker}>CONTRIBUTION CREW</Text>
          <View style={styles.contribCard}>
            {boundary.contributions.map((c) => (
              <View key={c.name} style={styles.contribRow}>
                <View style={styles.contribAvatar}>
                  <Text style={styles.contribAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.contribName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.contribPct}>{contributionPct(c.share)} %</Text>
              </View>
            ))}
            <View style={styles.contribDivider} />
            <View style={styles.contribRow}>
              <Icon name="coffre" size={17} color={gameColors.gold} />
              <Text style={styles.contribName}>Crew</Text>
              <Text style={[styles.contribPct, styles.contribCrewPts]}>
                +{formatInt(boundary.crewPoints)} pts
              </Text>
            </View>
          </View>
        </ResultReveal>
      </ScrollView>

      <View style={[styles.boundaryActions, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={share}
          style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.shareLabel}>Partager la conquête</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir la carte"
          onPress={goMap}
          hitSlop={8}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkLabel}>Voir la carte</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Toast bas éphémère (démo « Demander au crew ») — fondu simple, anti-bruit. */
function BoundaryToast({ bottom, text }: { bottom: number; text: string }) {
  const { opacity, scale } = useReveal(true);
  return (
    <Animated.View
      style={[styles.toastWrap, { bottom, opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <Icon name="crew" size={16} color={colors.chartreuse} />
        <Text style={styles.toastText} numberOfLines={1}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: 8,
  },
  barKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  skip: { minWidth: 56, alignItems: 'flex-end' },
  skipLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  content: { paddingHorizontal: spacing.cardPadding, gap: 18, paddingTop: 8 },
  block: { gap: 10 },
  pressed: { opacity: 0.75 },

  // ── ÉCRAN 1 — émotionnel d'abord (AMENDEMENT-20 §2) ──
  hero: { alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 8 },
  heroGrip: { alignItems: 'center' },
  heroTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  heroKpi: { alignItems: 'center', gap: 2 },
  heroKpiLabel: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 4,
  },
  heroLine: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroQueued: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },

  // « Voir détails » — secondaire discret, sous le CTA principal.
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
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
    paddingTop: 12,
  },
  impactTotalLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  impactTotalValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  impactTotalSub: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },

  // ── Détails : GRYD Verified ──
  verifiedCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 14,
    alignItems: 'flex-start',
  },
  verifiedTrust: { flexDirection: 'row', gap: 24, alignSelf: 'stretch' },

  // Analyse boucle — sous-titre pédagogique court.
  analyseSub: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },

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
    fontWeight: '700',
  },
  calcBody: { gap: 16, paddingTop: 4 },
  calcSchema: { alignItems: 'center' },
  calcZonesRows: { gap: 8 },
  calcZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcZoneLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  calcZoneValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  calcZoneValueAccent: { color: colors.chartreuse },
  calcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: 16,
  },
  // 3 par ligne (33 %) — MiniStat garde son flex:1 dans sa cellule.
  calcCell: { width: '33%', flexDirection: 'row' },
  calcVerifyNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  stepKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ── Synthèse multi-résultats (AMENDEMENT-16 §1) ──
  summaryCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 12,
  },
  summaryHead: { gap: 4 },
  summaryKicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryCopy: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 18 },
  summaryLines: { gap: 8 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryLineText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryLineAccent: { color: colors.chartreuse, fontWeight: '800' },

  validated: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  validatedTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  validatedSub: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },

  zonesBlock: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  zonesHero: {
    color: colors.chartreuse,
    fontSize: fontSizes.hero,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  zonesLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  zonesSub: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },
  /** « dont N en boucle fermée » — le geste signature, en chartreuse. */
  zonesLoop: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  /** Mini-carte boucle : hauteur bornée, largeur à l'aspect réel de la course. */
  loopMap: { maxHeight: 150, maxWidth: '84%', height: 150 },

  // ── Secteur modifié : avant/après organique (AMENDEMENT-11 §5) ──
  sectorCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
    gap: 12,
  },
  sectorTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  sectorSide: { flex: 1, alignItems: 'center', gap: 4 },
  sectorMap: { width: '84%', aspectRatio: 1 },
  sectorSideLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  sectorPct: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectorPctAfter: { color: colors.chartreuse },

  // ── Contribution crew : KPI géant ──
  crewKpiBlock: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  crewKpi: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  crewKpiLabel: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── Share card : mini carte organique ──
  shareMap: { width: 128, aspectRatio: 1 },

  statsCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 12,
  },
  statsHero: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statsHeroUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12 },
  miniStat: { flex: 1, gap: 2 },
  miniStatValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniStatLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  crewLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crewText: { color: colors.blanc, fontSize: fontSizes.sm, flex: 1, lineHeight: 20 },
  crewPct: { color: colors.chartreuse, fontWeight: '800' },

  perfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
  },
  perfTextWrap: { flex: 1, gap: 2 },
  perfTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  perfSub: { color: colors.gris, fontSize: fontSizes.xs },

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
    borderRadius: 12,
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
  shareLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  // « Voir la carte » — secondaire DISCRET (A-14 §4 : un seul CTA principal).
  mapLink: { alignItems: 'center', paddingVertical: 12 },
  mapLinkLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.cardPadding,
  },
  overlayInner: { alignSelf: 'stretch', alignItems: 'center', gap: 18 },
  overlayKicker: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 3,
  },
  badgeGlow: {
    alignSelf: 'stretch',
    borderRadius: radii.card,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 28,
    elevation: 12,
  },
  continueButton: {
    height: 48,
    minWidth: 180,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  continueLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  // ── AMENDEMENT-17 §CH2 — Frontière crew (ouverte / fermée) ──
  boundaryCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    padding: spacing.cardPadding,
    gap: 10,
  },
  boundaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boundaryKicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  boundaryLead: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600', lineHeight: 24 },
  boundaryLeadAccent: { color: colors.chartreuse, fontWeight: '800' },
  boundaryMissing: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', lineHeight: 26 },
  boundaryMissingAccent: {
    color: colors.chartreuse,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  boundaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  boundaryMeta: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Actions ancrées bas (pas dans le ScrollView — un écran = une action).
  boundaryActions: {
    paddingHorizontal: spacing.cardPadding,
    gap: 10,
    paddingTop: 6,
  },
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

  // Boucle crew fermée : hero de zone + contributions.
  boundaryZoneHero: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  contribCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 12,
  },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contribAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contribAvatarText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '800' },
  contribName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', flex: 1 },
  contribPct: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  contribDivider: { height: 1, backgroundColor: colors.grisLigne },
  contribCrewPts: { color: gameColors.gold },

  // Toast bas éphémère (« Mission envoyée dans la War Room. »).
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 340,
  },
  toastText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
});
