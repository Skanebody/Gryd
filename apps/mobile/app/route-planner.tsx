/**
 * GRYD — CONQUÉRIR `/route-planner` : ASSISTANT DE DÉCISION (doc « page
 * Conquérir », AMENDEMENT-10/-12). L'écran ne demande plus de tout paramétrer :
 * GRYD RECOMMANDE une course, le joueur ajuste vite. Compris en < 5 s :
 *   1. header KPI géant = la course recommandée (verbe · zone · km · résumé) ;
 *   2. carte route-first (RoutePlannerMap — la route écrase tout, zéro hex) ;
 *   3. « Pourquoi cette course ? » = 2-3 raisons en chips ;
 *   4. PLANS = 3 choix simples (Recommandée / Rapide / Max points) — tap = la
 *      route s'affiche, KPI + carte + CTA mis à jour ;
 *   5. PRIORITÉ CREW = carte d'alerte défense contextuelle (jamais un onglet au
 *      même niveau) — tap = bascule l'écran en mode DÉFENDRE ;
 *   6. « Ajuster la course » = TOUT l'avancé replié (distance/format/confort +
 *      boucles populaires + partage crew) — ne bloque jamais le lancement ;
 *   7. CTA VERBE contextuel (CONQUÉRIR / DÉFENDRE) + microcopie km·min·pts.
 * Défaut : ouvre sur le plan RECOMMANDÉ (conquête), pas la défense. Entrée War
 * Room `?type=raid|defense` présélectionne la bonne route. Données 100 % démo
 * déterministes (features/route) — le scoring réel utilisateur/crew/territoire
 * est V1. Events : screen() générique (les noms §8 ne changent pas).
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  ROUTE_CONSTRAINTS,
  ROUTE_DISTANCE_OPTIONS,
  ROUTE_OBJECTIVE,
  ROUTE_PLANS,
  distanceOptionFor,
  planForRoute,
  routeDurationMin,
  routeIdForType,
  routeReasons,
  routeShareFeedEntry,
  routeSocialName,
  type RouteDistanceOption,
  type RoutePlanDemo,
} from '../src/features/route/demo';
import {
  POPULAR_ROUTES_DEMO,
  crewsTakenLabel,
  popularRouteTarget,
} from '../src/features/route/popularRoutes';
import {
  OBJECTIVE_BY_ROUTE_TYPE,
  ROUTE_OBJECTIVE_LABELS,
  ROUTE_SHAPE_LABELS,
  type PlannedRouteDemo,
  type RouteObjective,
  type RouteShape,
} from '../src/features/route/types';

/** Hauteur de la carte : la route domine l'écran, les cards restent visibles. */
const MAP_HEIGHT = 250;

/** Km au format FR (« 4,8 »). */
function formatKm(km: number): string {
  return km.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * « +86 zones dont 52 en boucle » (AMENDEMENT-12 §C) : les routes en boucle
 * affichent l'aire estimée de la fermeture — données démo, décidé serveur.
 */
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

/** Microcopie chiffrée juste au-dessus du CTA (doc §14). */
function ctaMicrocopy(route: PlannedRouteDemo): string {
  const head = `${formatKm(route.distanceKm)} km · ${routeDurationMin(route)} min`;
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return `${head} · ${route.streetsToSave} rues à sauver`;
  }
  return `${head} · +${formatInt(route.points)} pts`;
}

/** Objectif d'une route (AMENDEMENT-12 §A — dérivé du sous-type interne). */
function routeObjective(route: PlannedRouteDemo): RouteObjective {
  return OBJECTIVE_BY_ROUTE_TYPE[route.typeKey];
}

/** Micro-titre de section (PLANS / PRIORITÉ CREW…). */
function SectionLabel({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={13} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

/** Chip générique (options/raisons) — sélection chartreuse, régime usage réel. */
function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ type?: string }>();

  // Défaut = plan RECOMMANDÉ (conquête). Une entrée `?type=` (War Room) force la
  // bonne route (raid → B, defense → C) sans changer le défaut global.
  const initialId = useMemo(
    () => (params.type ? routeIdForType(params.type) : RECOMMENDED_PLAN.routeId),
    [params.type],
  );
  const [routeId, setRouteId] = useState(initialId);
  const route = ROUTES_DEMO.find((r) => r.id === routeId) ?? ROUTES_DEMO[0];

  // Options avancées (démo : sélection locale, la génération réelle est V1).
  const [distance, setDistance] = useState<RouteDistanceOption | null>(null);
  const [shape, setShape] = useState<RouteShape | null>(null);
  const [constraints, setConstraints] = useState<readonly string[]>([]);
  const [sharedRouteIds, setSharedRouteIds] = useState<readonly string[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    screen('route_planner', { type: params.type ?? 'direct' });
  }, [params.type]);

  if (!route) return null; // ROUTES_DEMO n'est jamais vide (garde TS).

  const objective = routeObjective(route);
  const isDefense = objective === 'defendre';
  const activePlan = planForRoute(route.id);
  const statusLine = isDefense
    ? 'Ton crew a besoin de toi'
    : (activePlan?.status ?? RECOMMENDED_PLAN.status);
  const effectiveDistance = distance ?? distanceOptionFor(route);
  const effectiveShape = shape ?? route.shape;

  // Route de défense (Priorité crew) = cible de l'alerte.
  const defenseRoute = ROUTES_DEMO.find((r) => r.id === ROUTE_OBJECTIVE.routeId);

  const selectRoute = (id: string) => {
    if (id === routeId) return;
    haptics.light();
    setRouteId(id);
    setDistance(null);
    setShape(null);
    screen('route_planner_route_select', { route: id });
  };

  const selectPlan = (plan: RoutePlanDemo) => {
    selectRoute(plan.routeId);
    screen('route_planner_plan_select', { plan: plan.key });
  };

  const switchToDefense = () => {
    selectRoute(ROUTE_OBJECTIVE.routeId);
    screen('route_planner_objective_select', { objective: 'defendre' });
  };

  const toggleConstraint = (key: string) => {
    haptics.light();
    setConstraints((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const shareRoute = () => {
    haptics.medium();
    toast.show(`${routeSocialName(route)} partagée au crew`);
    setSharedRouteIds((prev) => (prev.includes(route.id) ? prev : [...prev, route.id]));
    screen('route_planner_share', { route: route.id });
  };

  const startRun = () => {
    haptics.medium();
    router.push(`/course-live?mode=conquete&route=${route.id}`);
  };

  return (
    <View style={styles.root}>
      {/* ── Header KPI géant = la course recommandée (verbe · zone · km) ── */}
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
            {ROUTE_OBJECTIVE_LABELS[objective].toUpperCase()} · {route.zone.toUpperCase()}
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
        {/* ── « Pourquoi cette course ? » : 2-3 raisons en chips ── */}
        <SectionLabel icon="cible" label="POURQUOI CETTE COURSE" />
        <View style={styles.reasonRow}>
          {routeReasons(route).map((reason) => (
            <View key={reason} style={styles.reason}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* ── PLANS : 3 choix simples (tap = route + carte + CTA mis à jour) ── */}
        <SectionLabel icon="cible" label="PLANS" />
        <View style={styles.plansRow}>
          {ROUTE_PLANS.map((plan) => {
            const target = ROUTES_DEMO.find((r) => r.id === plan.routeId);
            if (!target) return null;
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
                <Text
                  style={[styles.planLabel, selected && styles.planLabelSelected]}
                  numberOfLines={1}
                >
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

        {/* ── PRIORITÉ CREW : alerte défense contextuelle (jamais un onglet) ── */}
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

        {/* ── « Ajuster la course » : TOUT l'avancé replié (ne bloque jamais) ── */}
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
            <SectionLabel icon="reglages" label="DISTANCE" />
            <View style={styles.chipsRow}>
              {ROUTE_DISTANCE_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  selected={effectiveDistance === d}
                  onPress={() => {
                    haptics.light();
                    setDistance(d);
                  }}
                />
              ))}
            </View>
            <SectionLabel icon="reglages" label="FORMAT & CONFORT" />
            <View style={styles.chipsRow}>
              {(Object.keys(ROUTE_SHAPE_LABELS) as RouteShape[]).map((s) => (
                <Chip
                  key={s}
                  label={ROUTE_SHAPE_LABELS[s]}
                  selected={effectiveShape === s}
                  onPress={() => {
                    haptics.light();
                    setShape(s);
                  }}
                />
              ))}
              {ROUTE_CONSTRAINTS.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  selected={constraints.includes(c.key)}
                  onPress={() => toggleConstraint(c.key)}
                />
              ))}
            </View>

            {/* Boucles populaires (AMENDEMENT-32 §2) — signal SOCIAL, jamais un
                avantage acheté (anti P2W). Rangées ici (secondaire) : tap =
                sélectionne la route (flux planner inchangé). */}
            <SectionLabel icon="crew" label="AUTRES BOUCLES PROCHES" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {POPULAR_ROUTES_DEMO.map((pop) => {
                const target = popularRouteTarget(pop);
                if (!target) return null;
                const selected = target.id === route.id;
                const crews = crewsTakenLabel(pop);
                return (
                  <Pressable
                    key={pop.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Boucle populaire ${pop.name} — ${formatKm(target.distanceKm)} km, ${crews}`}
                    onPress={() => selectRoute(target.id)}
                    style={({ pressed }) => [
                      styles.popularCard,
                      selected && styles.popularCardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.popularName} numberOfLines={1}>
                      {pop.name}
                    </Text>
                    <Text style={styles.popularStats} numberOfLines={1}>
                      {formatKm(target.distanceKm)} km · +{target.zones} zones
                    </Text>
                    <View style={styles.popularCrews}>
                      <Icon name="serie" size={12} color={colors.chartreuse} />
                      <Text style={styles.popularCrewsText} numberOfLines={1}>
                        {crews}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Route = objet social (AMENDEMENT-11 §6) : partage crew démo. */}
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
            {sharedRouteIds.map((id) => {
              const shared = ROUTES_DEMO.find((r) => r.id === id);
              if (!shared) return null;
              return (
                <View key={id} style={styles.feedRow}>
                  <Icon name="feed" size={14} color={colors.chartreuse} />
                  <Text style={styles.feedText} numberOfLines={1}>
                    {routeShareFeedEntry(shared)}
                  </Text>
                  <Text style={styles.feedTime}>à l'instant</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* ── CTA VERBE contextuel + microcopie km·min·pts (doc §14) ── */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.ctaMicro} numberOfLines={1}>
          {ctaMicrocopy(route)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ROUTE_OBJECTIVE_LABELS[objective]} — démarrer, ${formatKm(route.distanceKm)} kilomètres`}
          onPress={startRun}
          style={({ pressed }) => [styles.startBtn, pressed && styles.startPressed]}
        >
          <Text style={styles.startLabel}>{ROUTE_OBJECTIVE_LABELS[objective].toUpperCase()}</Text>
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

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionLabel: { color: colors.gris, fontSize: 10, letterSpacing: 2, fontWeight: '700' },

  // « Pourquoi cette course » — raisons en pills légères (pas de card-in-card).
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

  // 3 plans côte à côte — cards compactes, une seule couche de container.
  // Padding/police calibrés pour que « Recommandée » tienne SANS « … » (§A).
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

  // Priorité crew — carte d'alerte défense (rouge), tap = bascule défense.
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

  // « Ajuster » — en-tête repliable + corps (tout l'avancé).
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

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  chipLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  chipLabelSelected: { color: colors.chartreuse },

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
