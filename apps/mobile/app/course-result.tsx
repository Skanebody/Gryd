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
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
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
  intentionFromParam,
  resultSummaryLines,
  summaryHeader,
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

export default function CourseResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode?: string;
    t?: string;
    queued?: string;
    route?: string;
    intention?: string;
  }>();
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

  const steps = STEPS_BY_MODE[mode];
  const lastStep = steps.length - 1;
  const badgeIdx = steps.indexOf('badge');
  const [step, setStep] = useState(0);

  const badge = mode === 'conquete' ? badgeById(DEMO_UNLOCKED_BADGE_ID) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

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

  // Synthèse multi-résultats (doc §2/§3.1) — conquête seulement (les modes
  // social/privé gardent leur bilan stats). L'intention teinte l'accent + la
  // copy §28 ; le tracé (démo) produit tous les effets listés.
  const summary = summaryHeader(intention);
  const summaryLines = conquest
    ? resultSummaryLines(intention, stats.zoneName, stats.zonePctAfter - stats.zonePctBefore)
    : [];

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
            {/* Fin hors-ligne (AMENDEMENT-15 §2) : discret, anti-shame, jamais bloquant. */}
            {params.queued === '1' ? (
              <Text style={styles.validatedSub}>
                Course enregistrée — envoi dès que possible.
              </Text>
            ) : null}
          </View>
        </ResultReveal>

        {/* 1bis — SYNTHÈSE multi-résultats (AMENDEMENT-16 §1, doc §2/§3.1) :
             « l'intention guide, le tracé décide » — la course produit plusieurs
             effets (conquis · défendus · route ouverte · zone crew), quelle que
             soit l'intention. La copy §28 rappelle l'esprit du mode choisi. */}
        {conquest ? (
          <ResultReveal visible={reached('validated')} haptic="none" style={styles.block}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHead}>
                <Text style={styles.summaryKicker}>{summary.kicker}</Text>
                <Text style={styles.summaryCopy} numberOfLines={2}>
                  {summary.copy}
                </Text>
              </View>
              <View style={styles.summaryLines}>
                {summaryLines.map((line) => (
                  <SummaryLine key={line.icon} line={line} />
                ))}
              </View>
            </View>
          </ResultReveal>
        ) : null}

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

        {/* Actions finales (AMENDEMENT-14 §4) : UN CTA principal — Partager la
            conquête ; « Voir la carte » = secondaire discret (dismiss = carte). */}
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
});
