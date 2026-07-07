/**
 * GRYD — CONQUÉRIR `/route-planner` : planificateur d'itinéraire LIVE, PARTOUT EN
 * FRANCE. Plus aucun point de départ figé (fini le mode démo République) :
 *   • DÉPART = TOUJOURS ta position actuelle (GPS de l'appareil), nommée par
 *     reverse-geocoding ; touche le champ pour recentrer ;
 *   • header KPI = la boucle active (verbe · lieu · km + résumé) ;
 *   • carte route-first (RoutePlannerMap) centrée sur l'origine ;
 *   • « Pourquoi cette course ? » = 2-3 raisons ;
 *   • PLANS = 3 formats (Recommandée / Rapide / Max points) routés autour de toi ;
 *   • « Ajuster » : OBJECTIF (Conquérir/Attaquer/Défendre) + DISTANCE EXACTE
 *     (1,5–50 km, saisie libre) + AUTRES BOUCLES (variantes) — tout est ROUTÉ EN
 *     DIRECT rue par rue (OSRM foot) autour de l'origine ;
 *   • CTA VERBE contextuel + microcopie.
 * Tous les tracés SUIVENT LES RUES et se calculent via l'internet de l'utilisateur
 * (serveur foot gratuit, sans clé). Le tracé courant reste affiché pendant le
 * recalcul. Events screen().
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing, type IconName } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import { ToastHost, useToast } from '../src/features/social/Toast';
import { RoutePlannerMap } from '../src/features/route/RoutePlannerMap';
import {
  GEN_MAX_KM,
  GEN_MIN_KM,
  GEN_STEP_KM,
  PLANNER_INTENTION_LABELS,
  PLANNER_INTENTION_ORDER,
  PLANNER_INTENTION_STATUS,
  generatedReasons,
  type PlannerIntention,
} from '../src/features/route/generator';
import { routeLoop } from '../src/features/route/liveRouting';
import { setPlannedRoute } from '../src/features/route/plannedRoute';
import { currentPosition, reverseGeocode, type OriginPoint } from '../src/features/route/origin';
import { EGO_REPUBLIQUE } from '../src/features/map/realAnchors';
import type { PlannedRouteDemo } from '../src/features/route/types';

/** Hauteur de la carte. */
const MAP_HEIGHT = 250;

/** Origine par défaut au premier rendu (remplacée par le GPS si dispo). */
const DEFAULT_ORIGIN: OriginPoint = { point: EGO_REPUBLIQUE, label: 'Ma position' };

/** 3 formats recommandés (distance + objectif) routés autour de l'origine. */
const PLAN_PRESETS = [
  { key: 'recommandee', label: 'Recommandée', km: 3.4, status: 'Meilleur équilibre' },
  { key: 'rapide', label: 'Rapide', km: 2, status: 'Simple et proche' },
  { key: 'max', label: 'Max points', km: 5, status: 'Plus de zones' },
] as const;

/** Icône par intention. */
const INTENTION_ICON: Record<PlannerIntention, IconName> = {
  conquerir: 'cible',
  attaquer: 'guerre',
  defendre: 'bouclier',
};

function formatKm(km: number): string {
  return km.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function estMinutes(km: number): number {
  return Math.round((km * 1000 * 350) / 1000 / 60); // ~5'50/km (étiquette)
}

function zonesLabel(route: PlannedRouteDemo): string {
  const base = `+${route.zones} zones`;
  return route.loopZones !== undefined ? `${base} dont ${route.loopZones} en boucle` : base;
}

function routeSummary(route: PlannedRouteDemo): string {
  const dur = `${estMinutes(route.distanceKm)} min`;
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return `${dur} · ${zonesLabel(route)} · ${route.streetsToSave} rues à défendre · Boucle`;
  }
  return `${dur} · ${zonesLabel(route)} · +${formatInt(route.points)} pts · Boucle`;
}

function ctaMicrocopy(route: PlannedRouteDemo): string {
  return `${formatKm(route.distanceKm)} km · ${estMinutes(route.distanceKm)} min · +${formatInt(route.points)} pts`;
}

function SectionLabel({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={13} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

const clampKm = (km: number) => Math.min(GEN_MAX_KM, Math.max(GEN_MIN_KM, km));

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ type?: string }>();

  const [origin, setOrigin] = useState<OriginPoint>(DEFAULT_ORIGIN);
  const [intention, setIntention] = useState<PlannerIntention>(
    params.type === 'defense' ? 'defendre' : 'conquerir',
  );
  const [targetKm, setTargetKm] = useState(3.4);
  const [distanceDraft, setDistanceDraft] = useState(formatKm(3.4));
  const [seed, setSeed] = useState(1);
  const [route, setRoute] = useState<PlannedRouteDemo | null>(null);
  const [routing, setRouting] = useState(false);
  const [nearby, setNearby] = useState<PlannedRouteDemo[]>([]);
  const [locating, setLocating] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sharedFeed, setSharedFeed] = useState<readonly { id: string; text: string }[]>([]);

  const reqIdRef = useRef(0);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Route en LIVE autour d'une origine explicite (garde le tracé courant pendant le calcul). */
  const applyRoute = (o: OriginPoint, km: number, intent: PlannerIntention, sd: number) => {
    const c = clampKm(km);
    setIntention(intent);
    setTargetKm(c);
    setSeed(sd);
    const id = ++reqIdRef.current;
    setRouting(true);
    void routeLoop(o.point, o.label, c, intent, sd).then((r) => {
      if (id !== reqIdRef.current) return;
      setRouting(false);
      if (r) {
        setRoute(r);
        setTargetKm(r.distanceKm);
        setDistanceDraft(formatKm(r.distanceKm));
      }
    });
  };

  const applyDebounced = (o: OriginPoint, km: number, intent: PlannerIntention, sd: number) => {
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    setRouting(true);
    liveTimerRef.current = setTimeout(() => applyRoute(o, km, intent, sd), 450);
  };

  /** DÉPART = TOUJOURS la position actuelle : localise (GPS) + nomme + route. */
  const locateAndRoute = (km: number, intent: PlannerIntention, sd: number) => {
    setLocating(true);
    void currentPosition().then(async (pos) => {
      if (!pos) {
        setLocating(false);
        toast.show('Position indisponible — active la localisation');
        return;
      }
      const label = (await reverseGeocode(pos)) ?? 'Ma position';
      const o = { point: pos, label };
      setLocating(false);
      setOrigin(o);
      applyRoute(o, km, intent, sd);
    });
  };

  // Premier rendu : route un preset (affichage immédiat), puis localise et re-route.
  useEffect(() => {
    screen('route_planner', { type: params.type ?? 'direct' });
    const intent: PlannerIntention = params.type === 'defense' ? 'defendre' : 'conquerir';
    applyRoute(DEFAULT_ORIGIN, 3.4, intent, 1);
    locateAndRoute(3.4, intent, 1);
    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Variantes (autres boucles) : 3 boucles routées LIVE autour de l'origine.
  useEffect(() => {
    if (!adjustOpen) return;
    let cancelled = false;
    const spreads = [0.6, 1.35, 1.9];
    void Promise.all(
      spreads.map((s, i) =>
        routeLoop(origin.point, origin.label, clampKm(targetKm * s), intention, seed * 10 + i + 2),
      ),
    ).then((list) => {
      if (!cancelled) setNearby(list.filter((r): r is PlannedRouteDemo => r !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [adjustOpen, origin, targetKm, intention, seed]);

  const recentrer = () => {
    haptics.light();
    locateAndRoute(targetKm, intention, seed);
    screen('route_planner_origin', { source: 'gps' });
  };

  const selectPreset = (km: number, key: string) => {
    haptics.light();
    applyRoute(origin, km, 'conquerir', seed);
    screen('route_planner_plan_select', { plan: key });
  };

  const selectIntention = (intent: PlannerIntention) => {
    if (intent === intention) return;
    haptics.light();
    applyRoute(origin, targetKm, intent, seed);
    screen('route_planner_objective_select', { objective: intent });
  };

  const stepDistance = (delta: number) => {
    haptics.light();
    const nk = clampKm(targetKm + delta);
    setDistanceDraft(formatKm(nk));
    applyRoute(origin, nk, intention, seed);
  };

  const onDistanceType = (text: string) => {
    setDistanceDraft(text);
    const parsed = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(parsed)) applyDebounced(origin, parsed, intention, seed);
  };

  const onDistanceBlur = () => {
    if (route) setDistanceDraft(formatKm(route.distanceKm));
  };

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
    if (!route) return;
    haptics.medium();
    const text = `Boucle ${formatKm(route.distanceKm)} km autour de ${origin.label} partagée au crew`;
    toast.show(text);
    setSharedFeed((prev) =>
      prev.some((f) => f.id === route.id) ? prev : [...prev, { id: route.id, text }],
    );
    screen('route_planner_share', { route: route.id });
  };

  const startRun = () => {
    if (!route) return;
    haptics.medium();
    // Arme le parcours PLANIFIÉ : la course suivra EXACTEMENT ce tracé (store).
    setPlannedRoute(route);
    const intent = intention === 'defendre' ? 'defense' : 'conquest';
    router.push(`/course-live?mode=conquete&intention=${intent}&planned=1`);
  };

  const intentionLabel = PLANNER_INTENTION_LABELS[intention];
  const reasons = route ? generatedReasons(route, intention) : [];

  return (
    <View style={styles.root}>
      {/* ── Header KPI = la boucle active (verbe · lieu · km) ── */}
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
            {intentionLabel.toUpperCase()} · {(route?.zone ?? origin.label).toUpperCase()}
          </Text>
          <View style={styles.back} />
        </View>
        <Text style={styles.status} numberOfLines={1}>
          {routing ? 'Calcul de l’itinéraire…' : PLANNER_INTENTION_STATUS[intention]}
        </Text>
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>
            {route ? formatKm(route.distanceKm) : '—'} <Text style={styles.kpiUnit}>KM</Text>
          </Text>
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {route ? routeSummary(route) : 'Choisis ton départ et ta distance.'}
        </Text>
      </View>

      {/* ── Carte centrée sur l'origine ── */}
      <View style={styles.mapWrap}>
        {route ? (
          <RoutePlannerMap route={route} origin={origin.point} />
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.chartreuse} />
            <Text style={styles.mapLoadingText}>Calcul de l&apos;itinéraire…</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── DÉPART = TOUJOURS ta position actuelle (recentre au tap) ── */}
        <SectionLabel icon="carte" label="DÉPART" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recentrer sur ma position"
          onPress={recentrer}
          style={({ pressed }) => [styles.originRow, pressed && styles.pressed]}
        >
          <View style={styles.originField}>
            <Icon name="carte" size={15} color={colors.chartreuse} />
            <Text style={styles.originLabel} numberOfLines={1}>
              {locating ? 'Localisation…' : origin.label}
            </Text>
          </View>
          <View style={styles.gpsBtn}>
            {locating ? (
              <ActivityIndicator color={colors.chartreuse} size="small" />
            ) : (
              <Icon name="cible" size={18} color={colors.chartreuse} />
            )}
          </View>
        </Pressable>
        <Text style={styles.hint}>Départ = ta position actuelle (touche pour recentrer).</Text>

        {/* ── « Pourquoi cette course ? » ── */}
        {reasons.length > 0 ? (
          <>
            <SectionLabel icon="cible" label="POURQUOI CETTE COURSE" />
            <View style={styles.reasonRow}>
              {reasons.map((reason) => (
                <View key={reason} style={styles.reason}>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── PLANS : 3 formats routés autour de toi ── */}
        <SectionLabel icon="cible" label="PLANS" />
        <View style={styles.plansRow}>
          {PLAN_PRESETS.map((plan) => {
            const selected =
              !!route && intention === 'conquerir' && Math.abs(route.distanceKm - plan.km) < 0.7;
            return (
              <Pressable
                key={plan.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Plan ${plan.label}, ${plan.km} kilomètres`}
                onPress={() => selectPreset(plan.km, plan.key)}
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
                  ~{formatKm(plan.km)} km · {estMinutes(plan.km)} min
                </Text>
                <Text style={styles.planReason} numberOfLines={1}>
                  {plan.status}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── « Ajuster » : objectif + distance exacte + variantes (tout LIVE) ── */}
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
                    <Icon name={INTENTION_ICON[it]} size={15} color={active ? colors.chartreuse : colors.gris} />
                    <Text style={[styles.intentionLabel, active && styles.intentionLabelActive]} numberOfLines={1}>
                      {PLANNER_INTENTION_LABELS[it]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
              Du footing au trail ({formatKm(GEN_MIN_KM)}–{GEN_MAX_KM} km) — routé en direct, suit les rues.
            </Text>

            <View style={styles.nearbyHead}>
              <Icon name="crew" size={13} color={colors.gris} />
              <Text style={styles.sectionLabel}>AUTRES BOUCLES</Text>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
              {nearby.length === 0 ? (
                <View style={styles.nearbyLoading}>
                  <ActivityIndicator color={colors.chartreuse} size="small" />
                </View>
              ) : (
                nearby.map((loop, i) => {
                  const selected = !!route && loop.id === route.id;
                  return (
                    <Pressable
                      key={`${loop.id}-${i}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Variante ${i + 1}, ${formatKm(loop.distanceKm)} km`}
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
                          {estMinutes(loop.distanceKm)} min · +{formatInt(loop.points)} pts
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

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
                <Text style={styles.feedTime}>à l&apos;instant</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* ── CTA VERBE contextuel + microcopie ── */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.ctaMicro} numberOfLines={1}>
          {route ? ctaMicrocopy(route) : '—'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${intentionLabel} — démarrer`}
          onPress={startRun}
          disabled={!route}
          style={({ pressed }) => [styles.startBtn, pressed && styles.startPressed, !route && styles.startDisabled]}
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
  mapWrap: { height: MAP_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.grisLigne },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.noir },
  mapLoadingText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  panel: { flex: 1 },
  panelContent: { paddingHorizontal: spacing.cardPadding, paddingTop: 12, paddingBottom: 16 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, marginBottom: 8 },
  sectionLabel: { color: colors.gris, fontSize: 10, letterSpacing: 2, fontWeight: '700' },

  // Départ : champ de recherche + bouton position.
  originRow: { flexDirection: 'row', gap: 8 },
  originField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: radii.card - 8,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  originLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  gpsBtn: {
    width: 46,
    height: 46,
    borderRadius: radii.card - 8,
    borderWidth: 1.5,
    borderColor: colors.chartreuse,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  planReason: { color: colors.gris, fontSize: 10, marginTop: 2 },

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

  hint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 17, marginBottom: 6, marginTop: 2 },

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
  nearbyLoading: { width: 120, height: 74, alignItems: 'center', justifyContent: 'center' },

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
    backgroundColor: colors.carbone,
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
  startDisabled: { opacity: 0.4 },
  startLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800', letterSpacing: 1.5 },
  pressed: { opacity: 0.7 },
});
