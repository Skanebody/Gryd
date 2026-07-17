/**
 * GRYD — RÉSULTAT DE COURSE (AMENDEMENT-20 §2, épuré zéro-friction) :
 * LE moment dopamine en UN SEUL état final, actionnable immédiatement (aucun
 * temps mort) : titre selon l'intention (TERRITOIRE ÉTENDU / ZONE DÉFENDUE) +
 * pill GRYD VERIFIED (la validation vit dans le badge, pas dans le titre) +
 * KPI géant (compteur useCountUp) + le POURQUOI au niveau 1 (« Boucle fermée ·
 * +N zones d'un coup ») + mini-bandeau tappable si un badge est débloqué.
 * CTA unique [Partager] (arme les VRAIES stats du run via share/shareRun.ts
 * avant de pousser /partage) ; secondaire « Voir mon territoire » ; le
 * technique (impact, GPS/Motion, analyse boucle, calcul, frontière, crew,
 * bonus, badge) se déplie au tap « Comment j'ai gagné ces zones ».
 * Hors conquête (AMENDEMENT-07) : social_run = stats + partage sans capture ;
 * course_privee = stats seules, aucun partage.
 * Les stats sont REJOUÉES depuis la simulation déterministe (params mode + t) ;
 * si ingest_run a répondu (runResult.ts), le serveur reste seul juge.
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
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
  StatePill,
  useCountUp,
  useReveal,
} from '../src/ui/game';
import {
  BADGE_FAMILIES,
  badgeById,
  badgeColor,
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
import { getPlannedRoute } from '../src/features/route/plannedRoute';
import { getLastRunResult } from '../src/features/run/runResult';
import { setShareRun, shareCardFromResult } from '../src/features/share/shareRun';
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

/** Param numérique optionnel (dist/dur réels) — null si absent/invalide. */
function numParam(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const n = raw !== undefined ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
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
    /** P0 C1 — distance (m) et durée (s) RÉELLES mesurées par le tracker (chemin GPS). */
    dist?: string;
    dur?: string;
    route?: string;
    intention?: string;
    /** AMENDEMENT-17 §CH2 — id de la frontière crew rejouée (démo). */
    boundary?: string;
    /** AMENDEMENT-17 §CH2 — `open` (fermable) ou `completed` (boucle crew fermée). */
    boundary_state?: string;
    /** Parcours PLANIFIÉ (Route Planner) → rejoue SA géométrie (store). */
    planned?: string;
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
    /** P0 C1 — distance (m) / durée (s) RÉELLES du tracker (chemin GPS). */
    dist?: string;
    dur?: string;
    route?: string;
    intention?: string;
    /** Parcours PLANIFIÉ (Route Planner) → rejoue SA géométrie (store). */
    planned?: string;
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
  // Parcours planifié : rejoue EXACTEMENT le tracé couru (store), sinon `route=`.
  const plannedLine = params.planned ? getPlannedRoute()?.line : undefined;
  const nav = useMemo(
    () => buildLiveNav(sim, params.route, plannedLine),
    [sim, params.route, plannedLine],
  );
  const loop = useMemo(() => buildRunLoop(sim, nav), [sim, nav]);
  const demoStats = useMemo(
    () => resultStats(sim, tickIndex, loopSummaryAt(loop, tickIndex)),
    [sim, tickIndex, loop],
  );
  // P0 C1 (MVP_CHANGESET) — l'écran ne MENT plus : quand une vraie course a été
  // jugée par ingest_run, TOUS les KPI viennent de sa réponse (distance, durée,
  // allure, zones, boucle, verified) — plus jamais de la simulation démo. Le
  // clamp 8,2 km disparaît de fait : rien de réel ne passe plus par la démo.
  // Hors-ligne (payload en file) : distance/durée RÉELLES via params dist/dur,
  // zones inconnues tant que le serveur n'a pas jugé — on ne les invente pas.
  const serverResult = getLastRunResult();
  const realDistM = numParam(params.dist);
  const realDurS = numParam(params.dur);
  /** Course réelle (GPS) — même si le verdict serveur n'est pas encore arrivé. */
  const isRealRun = serverResult !== null || realDistM !== null;
  const stats = useMemo(() => {
    if (serverResult) {
      const hexes =
        serverResult.hexes.claimed + serverResult.hexes.stolen + serverResult.hexes.pioneer;
      return {
        ...demoStats,
        distanceM: serverResult.distanceM,
        durationS: serverResult.durationS,
        paceSPerKm: serverResult.avgPaceSKm,
        hexes,
        loopClosed: serverResult.loopClosed === true,
        enclosedZones: serverResult.enclosedZones ?? 0,
        basePoints: serverResult.pointsAwarded,
        bonusPct: 0,
        totalPoints: serverResult.pointsAwarded,
        verified: serverResult.status === 'valid' || serverResult.status === 'partial',
        // Aucun secteur réel câblé : « Zone », jamais un faux nom (charte).
        zoneName: 'Zone',
        zonePctBefore: 0,
        zonePctAfter: 0,
        rankGained: false,
      };
    }
    if (realDistM !== null) {
      // Réel mais pas encore jugé (hors-ligne) : vraies mesures, zéro invention.
      return {
        ...demoStats,
        distanceM: realDistM,
        durationS: realDurS ?? 0,
        paceSPerKm: realDistM > 0 && realDurS ? realDurS / (realDistM / 1000) : 0,
        hexes: 0,
        loopClosed: false,
        enclosedZones: 0,
        verified: false,
        zoneName: 'Zone',
        zonePctBefore: 0,
        zonePctAfter: 0,
        rankGained: false,
      };
    }
    return demoStats;
  }, [demoStats, serverResult, realDistM, realDurS]);

  const conquest = mode === 'conquete';
  const isPrivate = mode === 'course_privee';

  // AMENDEMENT-20 §2 — l'écran 1 est ULTRA simple ET actionnable dès l'affichage
  // (aucun temps mort : titre + KPI géant + pourquoi + [Partager]). Le compteur
  // du KPI anime la dopamine, les contrôles ne sont jamais bloqués. Tous les
  // détails techniques (Impact, GRYD Verified, analyse boucle) se déplient AU
  // TAP « Comment j'ai gagné ces zones », pas sur le premier écran.
  const [showDetails, setShowDetails] = useState(false);
  // AMENDEMENT-23 §B.4 — sous-accordéon « Comment est calculé ce résultat ? »
  // (dans « Comment j'ai gagné ces zones », replié par défaut — détail au tap).
  const [showCalc, setShowCalc] = useState(false);

  // O1 Pass 3 : quand une VRAIE course a été envoyée à ingest_run (seul juge), on
  // affiche EXACTEMENT ce que le serveur a décidé (badge/bonus, ou aucun) ; sinon
  // (course web / hors session) fallback sur le scénario démo. serverResult=null
  // ⇒ comportement démo strictement inchangé.
  const badgeId = serverResult
    ? serverResult.newBadges[0]
    : mode === 'conquete' && !isRealRun
      ? DEMO_UNLOCKED_BADGE_ID
      : undefined;
  const badge = badgeId ? badgeById(badgeId) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

  // AMENDEMENT-19 §4/§7 — bonus ciblé appliqué (conquête, démo). En prod =
  // IngestRunResponse.bonusApplied. UN seul bonus principal, libellé court.
  const bonusApplied = serverResult
    ? serverResult.bonusApplied
    : mode === 'conquete'
      ? DEMO_BONUS_APPLIED
      : undefined;

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

  const goMap = () => router.replace('/(tabs)');
  // Partage VRAI : on arme les stats de LA course affichée (shareRun.ts) avant
  // de pousser /partage — l'aperçu partagé montre CE run, jamais la démo figée.
  const share = () => {
    haptics.medium();
    track(EVENTS.shareCardGenerated);
    setShareRun({
      mode,
      intention,
      card: shareCardFromResult({
        playerName: stats.playerName,
        crewName: stats.crewName,
        zoneName: stats.zoneName,
        zonesGained: stats.hexes,
        loopBonusZones: stats.enclosedZones,
        crewPoints: stats.totalPoints,
        // Style DÉFENSE : ne JAMAIS laisser passer les valeurs démo (+48 h /
        // 2 zones tenues) comme si c'était CE run. Les zones tenues = zones
        // réellement couvertes par ce run (dérivé) ; la durée de tenue est
        // décidée serveur (indispo côté client démo) → valeur neutre honnête 0,
        // jamais une défense inventée. TODO(O1) : holdHours réel via ingest_run.
        zonesDefended: stats.hexes,
        holdHours: 0,
        distanceKm: formatKm(stats.distanceM),
        paceLabel: formatPace(stats.paceSPerKm),
        clockLabel: formatClock(stats.durationS),
        // VRAI tracé de CETTE course (même géométrie que les mini-cartes du
        // Résultat) — le partage anime le parcours réellement couru, pas la démo.
        // Fallback démo seulement si le tracé est absent/dégénéré (< 3 points).
        ...(loop && loop.traceGeo.length >= 3 ? { trace: loop.traceGeo } : {}),
        // P1 C8/B3 — course RÉELLE : zéro invention résiduelle sur la card.
        // verified vient du serveur (stats l'est déjà), le rang n'existe pas
        // encore (season_scores) → styles Classement neutralisés plutôt que
        // « #8 Paris Est », l'état AVANT est inconnu → ligne masquée, et les
        // identités démo (KORO / LES FOULÉES 9³) ne signent jamais un vrai run.
        ...(isRealRun
          ? {
              verified: stats.verified,
              rankLabel: null,
              rankZone: null,
              rankDelta: null,
              beforeState: null,
              // Pas d'identité de remplissage : sans pseudo chargé, la card
              // signe par la ZONE (helper who() des templates), jamais par KORO.
              playerName: '',
              crewName: '',
            }
          : {}),
      }),
    });
    router.push({ pathname: '/partage', params: { mode, intention: params.intention ?? '' } });
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
  // passage, la boucle ajoute l'intérieur (mêmes totaux que l'IMPACT). Les
  // valeurs viennent des stats du run (démo) — le schéma les affiche.
  const traceZones = Math.max(0, stats.hexes - stats.enclosedZones);
  const loopGain = stats.enclosedZones;
  const totalZones = stats.hexes;
  const verifyTiers = verifyTiersLabel();

  // AMENDEMENT-23 §B.4 / honnêteté §A — décomposition technique du calcul.
  // `defended` est RÉEL dès qu'une vraie course a été jugée par ingest_run
  // (serverResult.hexes.defended, seul juge) ; routes ouvertes / segments exclus
  // ne sont pas encore renvoyés par le serveur → restent un scénario démo,
  // étiqueté « démo » pour ne jamais se confondre avec les vraies valeurs
  // GPS/MOUVEMENT/VALIDÉ (dérivées du run) dans la même grille.
  // TODO(O1) : exposer routesOpened/segmentsExcluded côté ingest_run.
  const zonesDefended = serverResult
    ? serverResult.hexes.defended
    : DEMO_CALC_BREAKDOWN.zonesDefended;
  const defendedNote = serverResult ? undefined : 'démo';

  // Synthèse multi-résultats (doc §2/§3.1) — conquête seulement (les modes
  // social/privé gardent leur bilan stats). L'intention teinte l'accent + la
  // copy §28 ; le tracé (démo) produit tous les effets listés.
  const summary = summaryHeader(intention);
  // §A r.1/r.20 — l'IMPACT ne répète pas le % de zone : la ligne `crew`
  // (« {zone} +X % ») est déjà portée par la section CONTRIBUTION CREW plus bas
  // ET par la heroLine de l'écran 1. On la retire ici pour tenir la card à 3
  // idées (conquête · défense · route) et supprimer la redondance.
  // Réel : pas de % de secteur (aucun secteur câblé) — on ne fabrique rien.
  const summaryLines = conquest && !isRealRun
    ? resultSummaryLines(intention, stats.zoneName, stats.zonePctAfter - stats.zonePctBefore).filter(
        (line) => line.icon !== 'crew',
      )
    : [];
  // Ligne émotionnelle de l'écran 1 (courte, jamais tronquée) :
  // « République défendue · Paris Est +5 % ».
  const heroLine = conquest
    ? isRealRun
      ? `${summary.kicker} · ${formatKm(stats.distanceM)} km`
      : `${summary.kicker} · ${stats.zoneName} +${stats.zonePctAfter - stats.zonePctBefore} %`
    : isPrivate
      ? 'Course privée · visible par toi seul'
      : `Social Run · ${formatKm(stats.distanceM)} km`;
  // Titre du moment dopamine : le RÉSULTAT (territoire/zone), jamais un tampon
  // administratif — la validation vit dans la pill GRYD VERIFIED, séparée.
  const heroTitle = isPrivate
    ? 'COURSE ENREGISTRÉE'
    : !conquest
      ? 'COURSE TERMINÉE'
      : intention === 'defense'
        ? 'ZONE DÉFENDUE'
        : 'TERRITOIRE ÉTENDU';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Barre : kicker seul — l'écran 1 est déjà l'état final, rien à passer. */}
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── ÉCRAN 1 — émotionnel d'abord, lisible en 2 s (AMENDEMENT-20 §2) ───
             Titre résultat + pill VERIFIED + KPI GÉANT + le POURQUOI + badge.
             Le technique (GPS/Motion, impact, analyse boucle) reste AU TAP. */}
        <ResultReveal visible haptic="success" style={styles.hero}>
          {/* GRIP célèbre — petit, au-dessus du KPI (il personnalise, il ne vole pas la vedette). */}
          <View style={styles.heroGrip}>
            <GripMascot rank={gripRank} size={64} />
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          {/* La VALIDATION vit dans sa pill (séparée du titre — jamais « validée »
              en guise de victoire). Jargon banni : « stats only » → français. */}
          {!isPrivate && !(isRealRun && !serverResult) ? (
            stats.verified ? (
              <StatePill state="verified" label="GRYD VERIFIED" />
            ) : (
              <StatePill state="statsonly" label="Compte en stats" />
            )
          ) : null}

          {/* KPI géant — le chiffre qui se comprend en 2 s. */}
          {conquest && !(isRealRun && !serverResult) ? (
            <View style={styles.heroKpi}>
              <ZoneCountUp value={stats.hexes} />
              <Text style={styles.heroKpiLabel}>ZONES CAPTURÉES</Text>
            </View>
          ) : (
            <View style={styles.heroKpi}>
              <Text style={styles.zonesHero}>{formatKm(stats.distanceM)}</Text>
              <Text style={styles.heroKpiLabel}>KM</Text>
            </View>
          )}

          {/* Le POURQUOI du chiffre, au niveau 1 (données déjà calculées). */}
          {conquest && stats.loopClosed ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              Boucle fermée · +{formatInt(stats.enclosedZones)} zones d'un coup
            </Text>
          ) : null}

          {/* P0 C1 — l'échec est EXPLIQUÉ, jamais un simple « 0 » sec (copy gelée §CH2). */}
          {conquest && serverResult?.openBoundary ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              Boucle presque fermée · Il manque {formatInt(serverResult.openBoundary.missingM)} m
            </Text>
          ) : null}
          {conquest && serverResult && stats.hexes === 0 && !serverResult.openBoundary ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              Aucune zone capturée — ferme une boucle pour prendre la zone.
            </Text>
          ) : null}

          {/* 1 ligne émotionnelle, courte, jamais tronquée. */}
          <Text style={styles.heroLine} numberOfLines={1} adjustsFontSizeToFit>
            {heroLine}
          </Text>

          {/* BADGE DÉBLOQUÉ — hook de rétention VISIBLE au niveau 1, tappable
              (ouvre les détails où vit le BadgeCard complet). */}
          {conquest && badge ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Badge débloqué : ${badge.name}. Voir le badge`}
              onPress={openBadgeDetails}
              style={({ pressed }) => [styles.heroBadge, pressed && styles.pressed]}
            >
              <Icon name="badge" size={16} color={badgeColor(badge)} />
              <Text style={styles.heroBadgeText} numberOfLines={1} adjustsFontSizeToFit>
                Badge débloqué · {badge.name}
              </Text>
              <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
            </Pressable>
          ) : null}

          {/* Fin hors-ligne (AMENDEMENT-15 §2) : discret, anti-shame, jamais bloquant. */}
          {params.queued === '1' ? (
            <Text style={styles.heroQueued} numberOfLines={1}>
              Envoi dès que possible.
            </Text>
          ) : null}
        </ResultReveal>

        {/* CTA — [Partager] IMMÉDIAT (façon Strava), « Voir mon territoire » en
             vraie action secondaire (la récompense), puis le toggle détails.
             Actionnable dès l'affichage — aucun temps mort. */}
        <ResultReveal visible haptic="none" style={styles.actions}>
          {!isPrivate ? (
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="partage" size={iconSizes.md} color={colors.noir} />
              <Text style={styles.shareLabel}>Partager</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mon territoire"
            onPress={goMap}
            style={({ pressed }) => [styles.boundarySecondary, pressed && styles.pressed]}
          >
            <Icon name="carte" size={iconSizes.sm} color={colors.blanc} />
            <Text style={styles.boundarySecondaryLabel}>Voir mon territoire</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showDetails
                ? 'Masquer les détails'
                : conquest
                  ? 'Comment j\'ai gagné ces zones'
                  : 'Voir mes stats'
            }
            onPress={toggleDetails}
            style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
          >
            <Text style={styles.detailsToggleLabel}>
              {showDetails
                ? 'Masquer les détails'
                : conquest
                  ? 'Comment j\'ai gagné ces zones'
                  : 'Voir mes stats'}
            </Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        </ResultReveal>

        {/* ─── « COMMENT J'AI GAGNÉ CES ZONES » — technique, au tap ────────────
             Impact · GRYD Verified · Analyse « La boucle fait la zone » · calcul
             · frontière · crew · bonus · badge. Replié par défaut : l'écran 1
             reste lisible en 2 s. */}
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
                    <MiniStat label="MOUVEMENT" value={String(stats.motionTrust)} />
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
                          value={`+${formatInt(zonesDefended)}`}
                          note={defendedNote}
                        />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="ROUTES OUVERTES"
                          value={formatInt(DEMO_CALC_BREAKDOWN.routesOpened)}
                          note="démo"
                        />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="SEGMENTS EXCLUS"
                          value={formatInt(DEMO_CALC_BREAKDOWN.segmentsExcluded)}
                          note="démo"
                        />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat label="GPS" value={String(stats.gpsTrust)} />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat label="MOUVEMENT" value={String(stats.motionTrust)} />
                      </View>
                      <View style={styles.calcCell}>
                        <MiniStat
                          label="VALIDÉ"
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
            {conquest && !isRealRun && sectorGeo ? (
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

            {/* CONTRIBUTION CREW — la zone monte (démo : % de secteur fabriqués). */}
            {conquest && !isRealRun ? (
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
                  reward="Cadre de profil Routes"
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Compteur « +214 » qui monte dès l'affichage (useCountUp — saut direct si
    reduce motion) : la dopamine vit dans l'animation, jamais dans un blocage. */
function ZoneCountUp({ value }: { value: number }) {
  const display = useCountUp(value);
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

function MiniStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
      {note ? (
        <Text style={styles.miniStatNote} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
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
              <Icon name="verrou" size={iconSizes.xs} color={colors.gris} />
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
          <Icon name="route" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.shareLabel}>Terminer maintenant</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={askCrew}
          style={({ pressed }) => [styles.boundarySecondary, pressed && styles.pressed]}
        >
          <Icon name="crew" size={iconSizes.sm} color={colors.blanc} />
          <Text style={styles.boundarySecondaryLabel}>Demander au crew</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir mon territoire"
          onPress={goMap}
          hitSlop={8}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkLabel}>Voir mon territoire</Text>
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
    // Partage VRAI : la card montre CETTE zone crew (nom + points), pas la démo.
    setShareRun({
      mode: 'conquete',
      intention: 'conquest',
      card: shareCardFromResult({
        zoneName: boundary.zone,
        crewPoints: boundary.crewPoints,
      }),
    });
    router.push({
      pathname: '/partage',
      params: { mode: 'conquete', intention: 'conquest', template: 'crew' },
    });
  };
  const goMap = () => router.replace('/(tabs)');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
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
              <Icon name="coffre" size={iconSizes.sm} color={gameColors.gold} />
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
          <Icon name="partage" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.shareLabel}>Partager la conquête</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir mon territoire"
          onPress={goMap}
          hitSlop={8}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkLabel}>Voir mon territoire</Text>
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
    paddingBottom: spacing.xs,
  },
  barKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  content: { paddingHorizontal: spacing.cardPadding, gap: 18, paddingTop: spacing.xs },
  block: { gap: 10 },
  pressed: { opacity: 0.75 },

  // ── ÉCRAN 1 — émotionnel d'abord (AMENDEMENT-20 §2) ──
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.xs },
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
  // Le POURQUOI du chiffre (« Boucle fermée · +42 zones d'un coup ») — niveau 1.
  heroWhy: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Mini-bandeau badge tappable (hook de rétention visible, ≥ 44 px).
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    backgroundColor: gameColors.carbon,
    marginTop: 2,
  },
  heroBadgeText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  heroQueued: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },

  // Toggle détails — secondaire discret, sous le CTA principal (cible ≥ 44 px).
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
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
  verifiedTrust: { flexDirection: 'row', gap: spacing.xl, alignSelf: 'stretch' },

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
    gap: spacing.sm,
  },
  summaryHead: { gap: 4 },
  summaryKicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryCopy: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 18 },
  summaryLines: { gap: spacing.xs },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryLineText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryLineAccent: { color: colors.chartreuse, fontWeight: '800' },

  validated: { alignItems: 'center', gap: 10, paddingVertical: spacing.xs },
  validatedTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  validatedSub: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },

  zonesBlock: { alignItems: 'center', gap: spacing.xxs, paddingVertical: 6 },
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
    gap: spacing.sm,
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

  statsCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  statsHero: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statsHeroUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
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
  // Repère « démo » discret : distingue une valeur de scénario d'une vraie mesure
  // (honnêteté §A) — jamais mêlée sans distinction aux vraies stats GPS/MOUVEMENT.
  miniStatNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 1,
  },
  statsNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  crewLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  shareLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  // « Voir mon territoire » (écrans frontière) — lien discret sous 2 boutons
  // (cible ≥ 44 px avec le hitSlop).
  mapLink: { alignItems: 'center', paddingVertical: 12 },
  mapLinkLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },

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
    gap: spacing.sm,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: 340,
  },
  toastText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
});
