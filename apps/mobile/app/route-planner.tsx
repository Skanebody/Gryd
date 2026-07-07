/**
 * GRYD — CONQUÉRIR `/route-planner` : ASSISTANT DE DÉCISION + CALCUL LIVE.
 * GRYD recommande une course, puis on AJUSTE façon Waze :
 *   1. header KPI = la course active (verbe d'intention · zone · km + résumé) ;
 *   2. carte route-first (RoutePlannerMap — le tracé écrase tout) ;
 *   3. « Pourquoi cette course ? » = 2-3 raisons ;
 *   4. PLANS = 3 recommandations (Recommandée / Rapide / Max points) — tracés
 *      réels curatés, tap = itinéraire + KPI + CTA mis à jour ;
 *   5. PRIORITÉ CREW = alerte défense contextuelle (bascule l'intention) ;
 *   6. « Ajuster » (façon Waze, tout recalcule EN LIVE) :
 *        • OBJECTIF : Conquérir / Attaquer / Défendre (change la boucle) ;
 *        • DISTANCE EXACTE : stepper + saisie libre — la boucle est GÉNÉRÉE à la
 *          distance demandée (features/route/generator) ;
 *        • AUTRES BOUCLES : variantes générées DISTINCTES des plans, régénérables ;
 *        • partage crew ;
 *   7. CTA VERBE contextuel (CONQUÉRIR / ATTAQUER / DÉFENDRE) + microcopie.
 * Les boucles générées sont un PLACEHOLDER live client (déterministe, hors ligne).
 * Le vrai calcul rue-par-rue (snap réseau piéton, évitement d'axes) = V1 backend ;
 * le garde-fou walkability valide déjà chaque tracé. Data démo — events screen().
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import { ToastHost, useToast } from '../src/features/social/Toast';
import { RoutePlannerMap } from '../src/features/route/RoutePlannerMap';
import {
  RECOMMENDED_PLAN,
  ROUTES_DEMO,
  ROUTE_OBJECTIVE,
  ROUTE_PLANS,
  planForRoute,
  routeDurationMin,
  routeIdForType,
  routeReasons,
  routeSocialName,
  type RoutePlanDemo,
} from '../src/features/route/demo';
import {
  GEN_DEFAULT_KM,
  GEN_MAX_KM,
  GEN_MIN_KM,
  GEN_STEP_KM,
  PLANNER_INTENTION_LABELS,
  PLANNER_INTENTION_ORDER,
  PLANNER_INTENTION_STATUS,
  generateLoop,
  generateNearbyLoops,
  generatedReasons,
  type PlannerIntention,
} from '../src/features/route/generator';
import { isRouteWalkable } from '../src/features/route/walkability';
import type { PlannedRouteDemo } from '../src/features/route/types';

/** Hauteur de la carte : la route domine l'écran, les cards restent visibles. */
const MAP_HEIGHT = 250;

/** Icône par intention (couleurs par rôle — jamais une couleur par crew). */
const INTENTION_ICON: Record<PlannerIntention, IconName> = {
  conquerir: 'cible',
  attaquer: 'guerre',
  defendre: 'bouclier',
};

/** Km au format FR (« 4,8 »). */
function formatKm(km: number): string {
  return km.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** « +86 zones dont 52 en boucle » (routes en boucle uniquement). */
function zonesLabel(route: PlannedRouteDemo): string {
  const base = `+${route.zones} zones`;
  return route.shape === 'boucle' && route.loopZones !== undefined
    ? `${base} dont ${route.loopZones} en boucle`
    : base;
}

/** Résumé une ligne sous le KPI (vocabulaire zones/rues — jamais « hex »). */
function routeSummary(route: PlannedRouteDemo): string {
  const dur = `${routeDurationMin(route)} min`;
  const shape = route.shape === 'boucle' ? 'Boucle · retour départ' : 'Aller simple';
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return `${dur} · ${zonesLabel(route)} · ${route.streetsToSave} rues à défendre · ${shape}`;
  }
  return `${dur} · ${zonesLabel(route)} · +${formatInt(route.points)} pts · ${shape}`;
}

/** Microcopie chiffrée juste au-dessus du CTA. */
function ctaMicrocopy(route: PlannedRouteDemo): string {
  const head = `${formatKm(route.distanceKm)} km · ${routeDurationMin(route)} min`;
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return `${head} · ${route.streetsToSave} rues à sauver`;
  }
  return `${head} · +${formatInt(route.points)} pts`;
}

/** Est-ce une boucle GÉNÉRÉE (vs une route curatée) ? */
function isGenerated(route: PlannedRouteDemo): boolean {
  return route.id.startsWith('gen_');
}

/** Route curatée la plus proche en distance (pour lancer une vraie course live). */
function nearestCuratedId(km: number): string {
  let best = ROUTES_DEMO[0]!;
  let bestDelta = Infinity;
  for (const r of ROUTES_DEMO) {
    const d = Math.abs(r.distanceKm - km);
    if (d < bestDelta) {
      bestDelta = d;
      best = r;
    }
  }
  return best.id;
}

/** Micro-titre de section. */
function SectionLabel({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={13} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ type?: string }>();

  // Défaut = plan RECOMMANDÉ (tracé réel curaté). `?type=` (War Room) présélectionne.
  const initial = useMemo(() => {
    const id = params.type ? routeIdForType(params.type) : RECOMMENDED_PLAN.routeId;
    return ROUTES_DEMO.find((r) => r.id === id) ?? ROUTES_DEMO[0]!;
  }, [params.type]);

  const [route, setRoute] = useState<PlannedRouteDemo>(initial);
  const [intention, setIntention] = useState<PlannerIntention>(
    params.type === 'defense' ? 'defendre' : 'conquerir',
  );
  const [targetKm, setTargetKm] = useState(initial.distanceKm);
  const [distanceDraft, setDistanceDraft] = useState(formatKm(initial.distanceKm));
  const [seed, setSeed] = useState(1);
  const [sharedFeed, setSharedFeed] = useState<readonly { id: string; text: string }[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    screen('route_planner', { type: params.type ?? 'direct' });
  }, [params.type]);

  const isDefense = intention === 'defendre';
  const activePlan = planForRoute(route.id);
  const statusLine = activePlan?.status ?? PLANNER_INTENTION_STATUS[intention];
  const reasons = isGenerated(route) ? generatedReasons(route, intention) : routeReasons(route);
  const defenseRoute = ROUTES_DEMO.find((r) => r.id === ROUTE_OBJECTIVE.routeId);

  /** Boucles alternatives GÉNÉRÉES (distinctes des plans), recalculées en live. */
  const nearbyLoops = useMemo(
    () => generateNearbyLoops(targetKm, intention, 3, seed * 10 + 1),
    [targetKm, intention, seed],
  );

  const clampKm = (km: number) => Math.min(GEN_MAX_KM, Math.max(GEN_MIN_KM, km));

  /** Recalcule une boucle GÉNÉRÉE (le cœur « live façon Waze »). */
  const regen = (km: number, intent: PlannerIntention, sd: number) => {
    const c = clampKm(km);
    setTargetKm(c);
    setIntention(intent);
    setSeed(sd);
    setRoute(generateLoop(c, intent, sd));
  };

  /** Adopte une route CURATÉE (plans / priorité crew) — pas de génération. */
  const adoptCurated = (r: PlannedRouteDemo, intent: PlannerIntention) => {
    haptics.light();
    setRoute(r);
    setIntention(intent);
    setTargetKm(r.distanceKm);
    setDistanceDraft(formatKm(r.distanceKm));
  };

  const selectPlan = (plan: RoutePlanDemo) => {
    const target = ROUTES_DEMO.find((r) => r.id === plan.routeId);
    if (!target) return;
    adoptCurated(target, 'conquerir');
    screen('route_planner_plan_select', { plan: plan.key });
  };

  const switchToDefense = () => {
    if (defenseRoute) adoptCurated(defenseRoute, 'defendre');
    else regen(targetKm, 'defendre', seed);
    screen('route_planner_objective_select', { objective: 'defendre' });
  };

  const selectIntention = (intent: PlannerIntention) => {
    if (intent === intention) return;
    haptics.light();
    regen(targetKm, intent, seed);
    setDistanceDraft(formatKm(clampKm(targetKm)));
    screen('route_planner_objective_select', { objective: intent });
  };

  const stepDistance = (delta: number) => {
    haptics.light();
    const nk = clampKm(targetKm + delta);
    regen(nk, intention, seed);
    setDistanceDraft(formatKm(nk));
  };

  const onDistanceType = (text: string) => {
    setDistanceDraft(text);
    const parsed = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(parsed)) regen(parsed, intention, seed);
  };

  const onDistanceBlur = () => setDistanceDraft(formatKm(clampKm(targetKm)));

  const adoptNearby = (loop: PlannedRouteDemo) => {
    haptics.light();
    setRoute(loop);
    setTargetKm(loop.distanceKm);
    setDistanceDraft(formatKm(loop.distanceKm));
    screen('route_planner_route_select', { route: loop.id });
  };

  const shuffleNearby = () => {
    haptics.light();
    setSeed((s) => s + 1);
  };

  const shareRoute = () => {
    haptics.medium();
    const text = `${routeSocialName(route)} partagée au crew`;
    toast.show(text);
    setSharedFeed((prev) =>
      prev.some((f) => f.id === route.id) ? prev : [...prev, { id: route.id, text }],
    );
    screen('route_planner_share', { route: route.id });
  };

  const startRun = () => {
    haptics.medium();
    const runId = isGenerated(route) ? nearestCuratedId(route.distanceKm) : route.id;
    router.push(`/course-live?mode=conquete&route=${runId}`);
  };

  const intentionLabel = PLANNER_INTENTION_LABELS[intention];

  return (
    <View style={styles.root}>
      {/* ── Header KPI géant = la course active (verbe · zone · km) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <View style={styles.mirror}>
              <Icon name="chevron" size={22} color={colors.blanc} />
            </View>
          </Pressable>
          <Text style={styles.kicker} numberOfLines={1}>
            {intentionLabel.toUpperCase()} · {route.zone.toUpperCase()}
          </Text>
          <View style={styles.back} />
        </View>
        <Text style={styles.status} numberOfLines={1}>
          {statusLine}
        </Text>
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>
            {formatKm(route.distanceKm)} <Text style={styles.kpiUnit}>KM</Text>
          </Text>
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {routeSummary(route)}
        </Text>
      </View>

      {/* ── Carte usage réel : la route écrase tout (RoutePlannerMap) ── */}
      <View style={styles.mapWrap}>
        <RoutePlannerMap route={route} />
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── « Pourquoi cette course ? » ── */}
        <SectionLabel icon="cible" label="POURQUOI CETTE COURSE" />
        <View style={styles.reasonRow}>
          {reasons.map((reason) => (
            <View key={reason} style={styles.reason}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* ── PLANS : 3 recommandations curatées ── */}
        <SectionLabel icon="cible" label="PLANS" />
        <View style={styles.plansRow}>
          {ROUTE_PLANS.map((plan) => {
            const target = ROUTES_DEMO.find((r) => r.id === plan.routeId);
            if (!target || !isRouteWalkable({ points: target.line })) return null;
            const selected = target.id === route.id;
            return (
              <Pressable
                key={plan.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Plan ${plan.label} — ${formatKm(target.distanceKm)} kilomètres, +${formatInt(target.points)} points`}
                onPress={() => selectPlan(plan)}
                style={({ pressed }) => [
                  styles.plan,
                  selected && styles.planSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.planLabel, selected && styles.planLabelSelected]} numberOfLines={1}>
                  {plan.label}
                </Text>
                <Text style={styles.planDist} numberOfLines={1}>
                  {formatKm(target.distanceKm)} km · {routeDurationMin(target)} min
                </Text>
                <Text style={styles.planPts} numberOfLines={1}>
                  +{formatInt(target.points)} pts
                </Text>
                <Text style={styles.planReason} numberOfLines={1}>
                  {plan.reason}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── PRIORITÉ CREW : alerte défense contextuelle ── */}
        <SectionLabel icon="bouclier" label="PRIORITÉ CREW" />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isDefense }}
          accessibilityLabel={`${ROUTE_OBJECTIVE.title} — basculer en défense`}
          onPress={switchToDefense}
          style={({ pressed }) => [
            styles.crewCard,
            isDefense && styles.crewCardActive,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.crewIcon}>
            <Icon name="sablier" size={18} color={gameColors.danger} />
          </View>
          <View style={styles.crewBody}>
            <Text style={styles.crewTitle} numberOfLines={1}>
              {ROUTE_OBJECTIVE.title}
            </Text>
            <Text style={styles.crewMeta} numberOfLines={1}>
              {ROUTE_OBJECTIVE.streetsToSave} rues à sauver ·{' '}
              <Text style={styles.crewUrgent}>{ROUTE_OBJECTIVE.expiresInH} h restantes</Text>
            </Text>
          </View>
          <View style={styles.crewRight}>
            <Text style={styles.crewPoints}>+{formatInt(defenseRoute?.points ?? 0)} pts</Text>
            <Text style={[styles.crewSwitch, isDefense && styles.crewSwitchActive]}>
              {isDefense ? 'Actif' : 'Basculer'}
            </Text>
          </View>
        </Pressable>

        {/* ── « Ajuster » : recalcul LIVE (objectif + distance exacte + variantes) ── */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: adjustOpen }}
          accessibilityLabel="Ajuster la course"
          onPress={() => {
            haptics.light();
            setAdjustOpen((o) => !o);
          }}
          style={({ pressed }) => [styles.adjustHead, pressed && styles.pressed]}
        >
          <Icon name="reglages" size={16} color={colors.blanc} />
          <Text style={styles.adjustLabel}>Ajuster la course</Text>
          <View style={adjustOpen ? styles.chevUp : styles.chevDown}>
            <Icon name="chevron" size={16} color={colors.gris} />
          </View>
        </Pressable>

        {adjustOpen ? (
          <View style={styles.adjustBody}>
            {/* OBJECTIF : Conquérir / Attaquer / Défendre (change la boucle). */}
            <SectionLabel icon="cible" label="OBJECTIF" />
            <View style={styles.intentionRow}>
              {PLANNER_INTENTION_ORDER.map((it) => {
                const active = it === intention;
                return (
                  <Pressable
                    key={it}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Objectif ${PLANNER_INTENTION_LABELS[it]}`}
                    onPress={() => selectIntention(it)}
                    style={({ pressed }) => [
                      styles.intentionChip,
                      active && styles.intentionChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon
                      name={INTENTION_ICON[it]}
                      size={15}
                      color={active ? colors.chartreuse : colors.gris}
                    />
                    <Text
                      style={[styles.intentionLabel, active && styles.intentionLabelActive]}
                      numberOfLines={1}
                    >
                      {PLANNER_INTENTION_LABELS[it]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* DISTANCE EXACTE : stepper + saisie libre → boucle générée en live. */}
            <SectionLabel icon="reglages" label="DISTANCE EXACTE" />
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Diminuer la distance"
                onPress={() => stepDistance(-GEN_STEP_KM)}
                style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
              >
                <Text style={styles.stepSign}>−</Text>
              </Pressable>
              <View style={styles.stepValue}>
                <TextInput
                  value={distanceDraft}
                  onChangeText={onDistanceType}
                  onBlur={onDistanceBlur}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel="Distance en kilomètres"
                  style={styles.stepInput}
                  placeholderTextColor={colors.gris}
                />
                <Text style={styles.stepUnit}>km</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Augmenter la distance"
                onPress={() => stepDistance(GEN_STEP_KM)}
                style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
              >
                <Text style={styles.stepSign}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Tape la distance voulue ({GEN_MIN_KM}–{GEN_MAX_KM} km) — la boucle se recalcule.
            </Text>
            <View style={styles.safeRow}>
              <Icon name="bouclier" size={14} color={colors.chartreuse} />
              <Text style={styles.safeText}>
                Toujours une boucle fermée, vérifiée accessible à pied.
              </Text>
            </View>

            {/* AUTRES BOUCLES : variantes générées DISTINCTES des plans. */}
            <View style={styles.nearbyHead}>
              <Icon name="crew" size={13} color={colors.gris} />
              <Text style={styles.sectionLabel}>AUTRES BOUCLES PROCHES</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Régénérer d'autres boucles"
                hitSlop={8}
                onPress={shuffleNearby}
                style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
              >
                <Icon name="reglages" size={13} color={colors.chartreuse} />
                <Text style={styles.shuffleText}>Autres</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {nearbyLoops.map((loop, i) => {
                const selected = loop.id === route.id;
                return (
                  <Pressable
                    key={loop.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Variante ${i + 1} — ${formatKm(loop.distanceKm)} km, ${loop.zones} zones`}
                    onPress={() => adoptNearby(loop)}
                    style={({ pressed }) => [
                      styles.popularCard,
                      selected && styles.popularCardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.popularName} numberOfLines={1}>
                      Variante {i + 1}
                    </Text>
                    <Text style={styles.popularStats} numberOfLines={1}>
                      {formatKm(loop.distanceKm)} km · +{loop.zones} zones
                    </Text>
                    <View style={styles.popularCrews}>
                      <Icon name="serie" size={12} color={colors.chartreuse} />
                      <Text style={styles.popularCrewsText} numberOfLines={1}>
                        {routeDurationMin(loop)} min · +{formatInt(loop.points)} pts
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Route sociale : partage crew (démo). */}
            <SectionLabel icon="crew" label="CREW" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Partager cette route au crew"
              onPress={shareRoute}
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
            >
              <Icon name="partage" size={16} color={colors.blanc} />
              <Text style={styles.shareLabel}>Partager au crew</Text>
            </Pressable>
            {sharedFeed.map((f) => (
              <View key={f.id} style={styles.feedRow}>
                <Icon name="feed" size={14} color={colors.chartreuse} />
                <Text style={styles.feedText} numberOfLines={1}>
                  {f.text}
                </Text>
                <Text style={styles.feedTime}>à l'instant</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* ── CTA VERBE contextuel + microcopie ── */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.ctaMicro} numberOfLines={1}>
          {ctaMicrocopy(route)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${intentionLabel} — démarrer, ${formatKm(route.distanceKm)} kilomètres`}
          onPress={startRun}
          style={({ pressed }) => [styles.startBtn, pressed && styles.startPressed]}
        >
          <Text style={styles.startLabel}>{intentionLabel.toUpperCase()}</Text>
        </Pressable>
      </View>

      <ToastHost state={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  header: { paddingHorizontal: spacing.cardPadding, paddingBottom: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mirror: { transform: [{ scaleX: -1 }] },
  kicker: {
    flex: 1,
    textAlign: 'center',
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  status: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700', marginTop: 6 },
  kpiRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  kpi: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  kpiUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '700' },
  summary: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 4, lineHeight: 17 },
  mapWrap: {
    height: MAP_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.grisLigne,
  },
  panel: { flex: 1 },
  panelContent: { paddingHorizontal: spacing.cardPadding, paddingTop: 12, paddingBottom: 16 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, marginBottom: 8 },
  sectionLabel: { color: colors.gris, fontSize: 10, letterSpacing: 2, fontWeight: '700' },

  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },

  plansRow: { flexDirection: 'row', gap: 7 },
  plan: {
    flex: 1,
    backgroundColor: colors.carbone,
    borderRadius: radii.card - 6,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 3,
  },
  planSelected: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  planLabel: { color: colors.blanc, fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  planLabelSelected: { color: colors.chartreuse },
  planDist: { color: colors.gris, fontSize: 10.5, fontVariant: ['tabular-nums'] },
  planPts: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  planReason: { color: colors.gris, fontSize: 10, marginTop: 2 },

  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card - 6,
    borderWidth: 1,
    borderColor: gameColors.danger,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  crewCardActive: { backgroundColor: colors.carbone2 },
  crewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: gameColors.danger,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewBody: { flex: 1, gap: 2 },
  crewTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  crewMeta: { color: colors.gris, fontSize: fontSizes.xs },
  crewUrgent: { color: gameColors.danger, fontWeight: '700' },
  crewRight: { alignItems: 'flex-end', gap: 4 },
  crewPoints: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  crewSwitch: { color: colors.gris, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  crewSwitchActive: { color: colors.chartreuse },

  adjustHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  adjustLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  chevDown: { transform: [{ rotate: '-90deg' }] },
  chevUp: { transform: [{ rotate: '90deg' }] },
  adjustBody: { marginTop: 2 },

  // Objectif : 3 chips pleine largeur (comme des onglets).
  intentionRow: { flexDirection: 'row', gap: 7 },
  intentionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  intentionChipActive: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  intentionLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700' },
  intentionLabelActive: { color: colors.chartreuse },

  // Distance exacte : stepper − [valeur] +.
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: radii.card - 8,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { color: colors.chartreuse, fontSize: 24, fontWeight: '800', lineHeight: 26 },
  stepValue: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.card - 8,
    borderWidth: 1.5,
    borderColor: colors.chartreuse,
    backgroundColor: colors.carbone2,
  },
  stepInput: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    textAlign: 'right',
    minWidth: 54,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  stepUnit: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },

  hint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 17, marginBottom: 6 },
  safeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  safeText: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: 17 },

  nearbyHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, marginBottom: 8 },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  shuffleText: { color: colors.chartreuse, fontSize: 11, fontWeight: '700' },

  popularRow: { gap: 8, paddingRight: 4 },
  popularCard: {
    width: 168,
    backgroundColor: colors.carbone,
    borderRadius: radii.card - 6,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    padding: 12,
    gap: 6,
  },
  popularCardSelected: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  popularName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  popularStats: { color: colors.gris, fontSize: 11, fontVariant: ['tabular-nums'] },
  popularCrews: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  popularCrewsText: {
    flex: 1,
    color: colors.chartreuse,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  shareLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card - 8,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  feedText: { flex: 1, color: colors.blanc, fontSize: fontSizes.xs },
  feedTime: { color: colors.gris, fontSize: 10 },

  ctaBar: {
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
    backgroundColor: colors.noir,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  ctaMicro: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  startBtn: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPressed: { opacity: 0.85 },
  startLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800', letterSpacing: 1.5 },
  pressed: { opacity: 0.7 },
});
