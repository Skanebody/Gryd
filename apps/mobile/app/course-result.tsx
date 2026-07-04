/**
 * GRYD — RÉSULTAT DE COURSE (AMENDEMENT-08 §5 reformulé AMENDEMENT-11 §5) :
 * LE moment dopamine, SANS hexagone visible. Séquence animée en étapes
 * (reveal + haptic par étape, doc §25) : 1 COURSE VALIDÉE + GRYD VERIFIED →
 * 2 +214 ZONES CAPTURÉES (KPI géant) → 3 SECTEUR MODIFIÉ / Frontière
 * repoussée (avant/après ORGANIQUE : la frontière chartreuse avance sur
 * l'orange — territory.ts, jamais de cellules) → 4 contribution crew (KPI
 * géant + rang gagné conservé) → 5 bonus performance → 6 BADGE DÉBLOQUÉ
 * (reveal plein écran, glow par tier) → 7 share card virale (mini carte
 * organique + route brillante + gros chiffre). « Passer » saute à la fin ;
 * reduce motion = fondus simples (useReveal/useCountUp).
 * Hors conquête, la séquence s'adapte (AMENDEMENT-07) : social_run = stats +
 * partage sans capture ; course_privee = stats seules, aucun partage.
 * Les stats sont REJOUÉES depuis la simulation déterministe (params mode + t).
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { GhostButton } from '../src/ui/GhostButton';
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
import Svg, { Path, Polyline } from 'react-native-svg';
import { cellToLatLng, gridDisk, latLngToCell } from 'h3-js';
import {
  cellsToTerritory,
  territoryPath,
  type ProjectPoint,
  type Territory,
} from '../src/features/map/territory';
import { territoryStyle } from '../src/features/map/mapStyle';
import { M_PER_DEG_LAT, M_PER_DEG_LNG } from '../src/features/map/basemap';
import { ResultReveal } from '../src/features/run/ResultReveal';
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

/** Cadence de la séquence (présentation) — raccourcie si reduce motion. */
const STEP_MS = 1_500;
const STEP_REDUCED_MS = 650;

/**
 * Badge débloqué du SCÉNARIO démo (doc §10 : « Badge Route Opened débloqué »).
 * Mise en scène : cette course ouvre la 10ᵉ route → Route Opened III (tier race).
 * TODO(O1) : brancher la réponse `newBadges` d'ingest_run.
 */
const DEMO_UNLOCKED_BADGE_ID = 'route_opened_3';

type StepId = 'validated' | 'zones' | 'sector' | 'crew' | 'perf' | 'badge' | 'share' | 'stats';

const STEPS_BY_MODE: Record<LiveRunMode, readonly StepId[]> = {
  conquete: ['validated', 'zones', 'sector', 'crew', 'perf', 'badge', 'share'],
  social_run: ['validated', 'stats', 'share'],
  course_privee: ['validated', 'stats'],
};

// ─── Mini-cartes ORGANIQUES du secteur (AMENDEMENT-11 §5) ────────────────────
// Cellules H3 DÉMO côté RENDU uniquement (le serveur reste seul décideur du
// territoire) : un disque res 10 sur Paris Est, trié ouest→est ; le % de
// contrôle coupe le disque en deux territoires organiques (cellsToTerritory) —
// la frontière chartreuse AVANCE sur l'orange entre AVANT et APRÈS. Jamais de
// cellules dessinées : uniquement des aplats lissés et leurs frontières.

/** Centre du secteur démo (Paris Est) — donnée de mise en scène, pas de jeu. */
const SECTOR_CENTER = { lat: 48.8672, lng: 2.3819 } as const;
const SECTOR_RES = 10;
const SECTOR_RING = 3;
/** ViewBox carrée des mini-cartes. */
const SECTOR_VB = 100;
const SECTOR_PAD = 6;
/** Frontières : mêmes proportions que la Battle Map (crew fin, rival marqué). */
const SECTOR_BORDER_W = 1.4;
const SECTOR_RIVAL_BORDER_W = 2;
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

/** Longitude du centre d'une cellule (h3 renvoie [lat, lng]). */
function cellLng(cell: string): number {
  return cellToLatLng(cell)[1] ?? 0;
}

function cellLat(cell: string): number {
  return cellToLatLng(cell)[0] ?? 0;
}

/** Deux territoires organiques (crew | rival) pour un % de contrôle donné. */
function buildSectorGeometry(pctBefore: number, pctAfter: number): SectorGeometry {
  const disk = gridDisk(
    latLngToCell(SECTOR_CENTER.lat, SECTOR_CENTER.lng, SECTOR_RES),
    SECTOR_RING,
  );
  // Ouest → est : la frontière du crew avance vers l'est.
  const sorted = [...disk].sort((a, b) => cellLng(a) - cellLng(b));
  const count = (pct: number) =>
    Math.min(sorted.length - 1, Math.max(1, Math.round((sorted.length * pct) / 100)));
  const nBefore = count(pctBefore);
  // L'avance reste LISIBLE même pour un petit gain (au moins 2 zones de bande).
  const nAfter = Math.min(sorted.length - 1, Math.max(count(pctAfter), nBefore + 2));

  const territories = [
    cellsToTerritory(sorted.slice(0, nBefore), 'crew'),
    cellsToTerritory(sorted.slice(nBefore), 'rival'),
    cellsToTerritory(sorted.slice(0, nAfter), 'crew'),
    cellsToTerritory(sorted.slice(nAfter), 'rival'),
  ];

  // Projection commune (mètres, aspect conservé) sur la viewBox carrée.
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const t of territories) {
    if (!t) continue;
    for (const poly of t.polygons) {
      for (const ring of poly) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }
  const spanX = Math.max(1, (maxLng - minLng) * M_PER_DEG_LNG);
  const spanY = Math.max(1, (maxLat - minLat) * M_PER_DEG_LAT);
  const k = (SECTOR_VB - SECTOR_PAD * 2) / Math.max(spanX, spanY);
  const ox = (SECTOR_VB - spanX * k) / 2;
  const oy = (SECTOR_VB - spanY * k) / 2;
  const project: ProjectPoint = (lng, lat) => ({
    x: ox + (lng - minLng) * M_PER_DEG_LNG * k,
    y: oy + (maxLat - lat) * M_PER_DEG_LAT * k,
  });

  const path = (t: Territory | null) => (t ? territoryPath(t, project) : '');

  // Route brillante : la course longe la bande gagnée (nord → sud).
  const routePoints = sorted
    .slice(Math.max(0, nBefore - 1), nAfter)
    .sort((a, b) => cellLat(b) - cellLat(a))
    .map((cell) => {
      const { x, y } = project(cellLng(cell), cellLat(cell));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return {
    before: { crewPath: path(territories[0] ?? null), rivalPath: path(territories[1] ?? null) },
    after: { crewPath: path(territories[2] ?? null), rivalPath: path(territories[3] ?? null) },
    routePoints,
  };
}

// ─── Mini-cartes AVANT/APRÈS de la boucle (AMENDEMENT-12 §C — post-run) ─────
// Le remplissage RÉEL de la course : couloir organique seul (AVANT) → couloir
// + intérieur fusionnés (APRÈS), avec la trace de la boucle par-dessus. Rendu
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
  /** Couloir organique seul (AVANT). */
  beforePath: string;
  /** Couloir + intérieur fusionnés (APRÈS — le remplissage). */
  afterPath: string;
  /** Polyline de la trace (la boucle elle-même). */
  routePoints: string;
}

/** Projette couloir/boucle dans une viewBox à l'aspect de la course. */
function buildLoopGeometry(loop: RunLoop, corridorCells: readonly string[]): LoopGeometry | null {
  const before = cellsToTerritory(corridorCells, 'crew');
  const after = cellsToTerritory([...corridorCells, ...loop.interiorCells], 'crew');
  if (!before || !after) return null;

  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const poly of after.polygons) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  const spanX = Math.max(1, (maxLng - minLng) * M_PER_DEG_LNG);
  const spanY = Math.max(1, (maxLat - minLat) * M_PER_DEG_LAT);
  const k = (LOOP_VB_MAX - LOOP_VB_PAD * 2) / Math.max(spanX, spanY);
  const vbW = spanX * k + LOOP_VB_PAD * 2;
  const vbH = spanY * k + LOOP_VB_PAD * 2;
  const project: ProjectPoint = (lng, lat) => ({
    x: LOOP_VB_PAD + (lng - minLng) * M_PER_DEG_LNG * k,
    y: LOOP_VB_PAD + (maxLat - lat) * M_PER_DEG_LAT * k,
  });

  const routePoints = loop.traceGeo
    .map((p) => {
      const { x, y } = project(p.lng, p.lat);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return {
    vbW,
    vbH,
    beforePath: territoryPath(before, project),
    afterPath: territoryPath(after, project),
    routePoints,
  };
}

/** Un côté AVANT/APRÈS de la boucle (zone crew organique + trace). */
function LoopMiniMap({ d, route, vbW, vbH }: { d: string; route?: string; vbW: number; vbH: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}`}>
      <Path d={d} fill={colors.noir} fillRule="evenodd" />
      <Path
        d={d}
        fill={territoryStyle.crewFill}
        stroke={territoryStyle.crewStroke}
        strokeWidth={SECTOR_BORDER_W}
        fillRule="evenodd"
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

/** Rendu SVG d'un côté (aplat rival dessous, crew dessus, route optionnelle). */
function SectorMiniMap({ side, route }: { side: SectorSide; route?: string }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SECTOR_VB} ${SECTOR_VB}`}>
      {side.rivalPath ? (
        <Path
          d={side.rivalPath}
          fill={territoryStyle.rivalFill}
          stroke={territoryStyle.rivalStroke}
          strokeWidth={SECTOR_RIVAL_BORDER_W}
          fillRule="evenodd"
        />
      ) : null}
      {side.crewPath ? (
        <>
          {/* Sous-couche opaque : la chartreuse RECOUVRE l'orange à la
              frontière (la zone de recouvrement ne devient jamais boueuse). */}
          <Path d={side.crewPath} fill={colors.noir} fillRule="evenodd" />
          <Path
            d={side.crewPath}
            fill={territoryStyle.crewFill}
            stroke={territoryStyle.crewStroke}
            strokeWidth={SECTOR_BORDER_W}
            fillRule="evenodd"
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

/** Avant/après ORGANIQUE du secteur — la frontière bouge, pas des cellules. */
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

export default function CourseResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; t?: string }>();
  const mode = runModeFromParam(params.mode);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  const tickIndex = tickParam(params.t, sim.ticks.length - 1);
  // Boucle (AMENDEMENT-12) : rejouée depuis la même démo déterministe — les
  // zones intérieures entrent dans les totaux AVANT points/bonus.
  const nav = useMemo(() => buildLiveNav(sim), [sim]);
  const loop = useMemo(() => buildRunLoop(sim, nav), [sim, nav]);
  const stats = useMemo(
    () => resultStats(sim, tickIndex, loopSummaryAt(loop, tickIndex)),
    [sim, tickIndex, loop],
  );
  const reduce = useReduceMotion();

  const steps = STEPS_BY_MODE[mode];
  const lastStep = steps.length - 1;
  const badgeIdx = steps.indexOf('badge');
  const [step, setStep] = useState(0);

  const badge = mode === 'conquete' ? badgeById(DEMO_UNLOCKED_BADGE_ID) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

  // Mini-cartes organiques (avant/après + share card) — conquête uniquement.
  const sectorGeo = useMemo(
    () =>
      mode === 'conquete'
        ? buildSectorGeometry(stats.zonePctBefore, stats.zonePctAfter)
        : null,
    [mode, stats.zonePctBefore, stats.zonePctAfter],
  );
  // AVANT/APRÈS du remplissage de boucle — seulement si la boucle est fermée.
  const loopGeo = useMemo(() => {
    if (!stats.loopClosed || !loop) return null;
    const corridor = nav.ticks[Math.min(tickIndex, nav.ticks.length - 1)]?.litCount ?? 0;
    return buildLoopGeometry(loop, nav.litCells.slice(0, corridor));
  }, [stats.loopClosed, loop, nav, tickIndex]);

  useEffect(() => {
    screen('course_result', { mode });
    track(EVENTS.celebrationViewed, { mode });
  }, [mode]);

  // Avance automatique — PAUSE sur le badge plein écran (le joueur savoure).
  useEffect(() => {
    if (step >= lastStep) return;
    if (badgeIdx >= 0 && step === badgeIdx) return;
    const id = setTimeout(
      () => setStep((s) => Math.min(s + 1, lastStep)),
      reduce ? STEP_REDUCED_MS : STEP_MS,
    );
    return () => clearTimeout(id);
  }, [step, lastStep, badgeIdx, reduce]);

  const reached = (id: StepId) => {
    const i = steps.indexOf(id);
    return i >= 0 && step >= i;
  };
  const skip = () => {
    haptics.light();
    setStep(lastStep);
  };
  const goMap = () => router.replace('/(tabs)');
  const share = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated);
  };

  const conquest = mode === 'conquete';
  const isPrivate = mode === 'course_privee';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Barre : kicker + Passer (visible tant que la séquence n'est pas finie). */}
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
        {step < lastStep ? (
          <Pressable accessibilityRole="button" onPress={skip} hitSlop={10} style={styles.skip}>
            <Text style={styles.skipLabel}>Passer</Text>
          </Pressable>
        ) : (
          <View style={styles.skip} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1 — Course validée + GRYD VERIFIED. */}
        <ResultReveal visible={reached('validated')} haptic="success" style={styles.block}>
          <View style={styles.validated}>
            <Text style={styles.validatedTitle}>
              {isPrivate ? 'COURSE ENREGISTRÉE' : 'COURSE VALIDÉE'}
            </Text>
            {isPrivate ? (
              <StatePill state="statsonly" label="Course privée" />
            ) : stats.verified ? (
              <StatePill state="verified" label="GRYD VERIFIED" />
            ) : (
              <StatePill state="statsonly" label="Stats enregistrées" />
            )}
            <Text style={styles.validatedSub}>
              {isPrivate
                ? 'Visible par toi seul. Aucune capture, aucun partage.'
                : `Effort vérifié — GPS ${stats.gpsTrust} · Motion ${stats.motionTrust}.`}
            </Text>
          </View>
        </ResultReveal>

        {/* 2 — +214 ZONES CAPTURÉES (KPI géant, compteur qui monte). */}
        {conquest ? (
          <ResultReveal visible={reached('zones')} style={styles.block}>
            <View style={styles.zonesBlock}>
              <ZoneCountUp value={stats.hexes} />
              <Text style={styles.zonesLabel}>ZONES CAPTURÉES</Text>
              {/* « dont N en boucle fermée » (AMENDEMENT-12 §C). */}
              {stats.loopClosed ? (
                <Text style={styles.zonesLoop}>
                  dont {formatInt(stats.enclosedZones)} en boucle fermée
                </Text>
              ) : null}
              <Text style={styles.zonesSub}>
                ≈ {formatInt(stats.basePoints)} pts estimés — confirmés par le serveur.
              </Text>
            </View>
            {/* Le remplissage : trait (couloir) → boucle (zone entière). */}
            {loopGeo ? (
              <LoopBeforeAfter
                geometry={loopGeo}
                corridorZones={stats.hexes - stats.enclosedZones}
                totalZones={stats.hexes}
              />
            ) : null}
          </ResultReveal>
        ) : null}

        {/* Stats (social / privé) — la distance domine. */}
        {!conquest ? (
          <ResultReveal visible={reached('stats')} style={styles.block}>
            <View style={styles.statsCard}>
              <Text style={styles.statsHero}>
                {formatKm(stats.distanceM)}
                <Text style={styles.statsHeroUnit}> km</Text>
              </Text>
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
          </ResultReveal>
        ) : null}

        {/* 3 — SECTEUR MODIFIÉ : avant/après ORGANIQUE (la frontière bouge). */}
        {conquest && sectorGeo ? (
          <ResultReveal visible={reached('sector')} style={styles.block}>
            <Text style={styles.stepKicker}>SECTEUR MODIFIÉ</Text>
            <SectorBeforeAfter
              zoneName={stats.zoneName}
              pctBefore={stats.zonePctBefore}
              pctAfter={stats.zonePctAfter}
              geometry={sectorGeo}
            />
          </ResultReveal>
        ) : null}

        {/* 4 — Contribution crew : la zone monte ; rang gagné SEULEMENT si la
            course couvre assez du scénario (stats.rankGained — démo écourtée
            = contribution de zone seule, sans RankUpCard). */}
        {conquest ? (
          <ResultReveal visible={reached('crew')} style={styles.block}>
            <Text style={styles.stepKicker}>CONTRIBUTION CREW</Text>
            {/* KPI géant : « Paris Est +5 % » (AMENDEMENT-11 §5). */}
            <View style={styles.crewKpiBlock}>
              <Text style={styles.crewKpi}>
                +{stats.zonePctAfter - stats.zonePctBefore} %
              </Text>
              <Text style={styles.crewKpiLabel} numberOfLines={1}>
                {stats.zoneName.toUpperCase()} · {stats.crewName}
              </Text>
            </View>
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
          </ResultReveal>
        ) : null}

        {/* 5 — Bonus performance (borné par les règles §3). */}
        {conquest ? (
          <ResultReveal visible={reached('perf')} style={styles.block}>
            <View style={styles.perfCard}>
              <Icon name="performance" size={22} color={gameColors.crew} />
              <View style={styles.perfTextWrap}>
                <Text style={styles.perfTitle}>+{stats.bonusPct} % bonus performance</Text>
                <Text style={styles.perfSub}>
                  {formatInt(stats.basePoints)} → {formatInt(stats.totalPoints)} pts — ton allure
                  progresse.
                </Text>
              </View>
            </View>
          </ResultReveal>
        ) : null}

        {/* 6 — Badge (version inline une fois le plein écran passé). */}
        {conquest && badge && badgeFamily && badgeIdx >= 0 && step > badgeIdx ? (
          <ResultReveal visible haptic="none" style={styles.block}>
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
          </ResultReveal>
        ) : null}

        {/* 7 — Share card + actions. */}
        {!isPrivate ? (
          <ResultReveal visible={reached('share')} style={styles.block}>
            <Text style={styles.stepKicker}>PARTAGE</Text>
            <ShareCard
              stat={conquest ? `+${formatInt(stats.hexes)}` : `${formatKm(stats.distanceM)} km`}
              statLabel={conquest ? 'ZONES CAPTURÉES' : 'SOCIAL RUN'}
              title={`${stats.playerName} · ${stats.crewName}`}
              subtitle={
                conquest
                  ? `${stats.zoneName} passe à ${stats.zonePctAfter} % · frontière repoussée`
                  : `${formatClock(stats.durationS)} · ${formatPace(stats.paceSPerKm)}/km`
              }
            >
              {conquest && sectorGeo ? (
                /* Mini carte virale : zone chartreuse, frontière orange
                   repoussée, route brillante (AMENDEMENT-11 §5). */
                <View style={styles.shareMap}>
                  <SectorMiniMap side={sectorGeo.after} route={sectorGeo.routePoints} />
                </View>
              ) : (
                <CrewCrest seed={stats.crewName} name={stats.crewName} size="m" />
              )}
            </ShareCard>
          </ResultReveal>
        ) : null}

        {/* Actions finales. */}
        <ResultReveal visible={step >= lastStep} haptic="none" style={styles.actions}>
          {!isPrivate ? (
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="partage" size={18} color={colors.noir} />
              <Text style={styles.shareLabel}>
                {conquest ? 'Partager la conquête' : 'Partager la sortie'}
              </Text>
            </Pressable>
          ) : null}
          <GhostButton label="Voir la carte" icon="carte" onPress={goMap} />
        </ResultReveal>
      </ScrollView>

      {/* 6 — BADGE DÉBLOQUÉ plein écran (pause : Continuer pour la suite). */}
      {conquest && badge && badgeFamily && badgeIdx >= 0 && step === badgeIdx ? (
        <BadgeOverlay
          badge={badge}
          familyLabel={badgeFamily.name}
          familyColor={badgeColor(badge)}
          onContinue={() => {
            haptics.light();
            setStep(badgeIdx + 1);
          }}
        />
      ) : null}
    </View>
  );
}

/** Compteur « +214 » qui monte (useCountUp — saut direct si reduce motion). */
function ZoneCountUp({ value }: { value: number }) {
  const display = useCountUp(value);
  return <Text style={styles.zonesHero}>+{formatInt(display)}</Text>;
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

  stepKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },

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
});
