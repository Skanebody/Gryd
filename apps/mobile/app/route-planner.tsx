/**
 * GRYD — ROUTE PLANNER `/route-planner` (AMENDEMENT-10 §2 priorité 1,
 * AMENDEMENT-11 §3/§6, AMENDEMENT-12 §A). GRYD dit « COURS ICI pour prendre
 * ce territoire » : un écran = UNE décision — démarrer cette route. Régime
 * USAGE RÉEL : fond plein, contraste max, zéro glass, textes courts, CTA
 * évident. Le joueur ne voit que 2 OBJECTIFS :
 *   • 2 onglets CONQUÉRIR (routes rapide/optimisée/exploration) / DÉFENDRE
 *     (routes défense) — les 8 types AMENDEMENT-10 sont des sous-types
 *     internes, plus jamais exposés comme objectifs ;
 *   • Header KPI géant : DÉFENDRE · RÉPUBLIQUE — 4,8 KM · 28 min ·
 *     +86 zones · 12 rues à défendre · Boucle · retour départ ;
 *   • carte route-first (RoutePlannerMap : la route ÉCRASE tout, zéro
 *     hexagone — moteur H3 invisible via territory.ts) ;
 *   • propositions démo de l'onglet (A Rapide / B Optimisée · C Défense) —
 *     tap = la route s'affiche + résumé mis à jour ;
 *   • options en chips (3/5/10/libre · boucle/aller · priorité alignée sous
 *     l'objectif actif · sécurité · dénivelé) ;
 *   • bloc objectif (Défendre République — 12 rues à sauver · 48 h) ;
 *   • route = objet social (AMENDEMENT-11 §6) : Partager au crew (démo :
 *     toast + entrée feed locale) ;
 *   • CTA DÉMARRER → /course-live?mode=conquete&route=<id>.
 * Entrées : War Room `?type=raid|defense` (Voir la route), Battle Map, Today.
 * Données 100 % démo déterministes (features/route/demo) — génération réelle
 * d'itinéraires V1. Events : screen() générique (les noms §8 ne changent pas).
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
  PRIORITY_BY_ROUTE_ID,
  ROUTES_DEMO,
  ROUTE_CONSTRAINTS,
  ROUTE_DISTANCE_OPTIONS,
  ROUTE_ID_BY_OBJECTIVE,
  ROUTE_ID_BY_PRIORITY,
  ROUTE_OBJECTIVE,
  distanceOptionFor,
  routeDurationMin,
  routeIdForType,
  routeShareFeedEntry,
  routeSocialName,
  type RouteDistanceOption,
} from '../src/features/route/demo';
import {
  OBJECTIVE_BY_ROUTE_TYPE,
  PRIORITIES_BY_OBJECTIVE,
  ROUTE_OBJECTIVE_LABELS,
  ROUTE_OBJECTIVE_ORDER,
  ROUTE_PRIORITY_LABELS,
  ROUTE_SHAPE_LABELS,
  type PlannedRouteDemo,
  type RouteObjective,
  type RoutePriority,
  type RouteShape,
} from '../src/features/route/types';

/** Hauteur de la carte : la route domine l'écran, les cards restent visibles. */
const MAP_HEIGHT = 290;

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
  const shape =
    route.shape === 'boucle' ? 'Boucle · retour départ' : 'Aller simple';
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return `${dur} · ${zonesLabel(route)} · ${route.streetsToSave} rues à défendre · ${shape}`;
  }
  return `${dur} · ${zonesLabel(route)} · +${formatInt(route.points)} pts · ${shape}`;
}

/** Ligne de stats d'une card de proposition (courte — cards de 1/3 d'écran). */
function cardStats(route: PlannedRouteDemo): string {
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return `${formatKm(route.distanceKm)} km · ${route.streetsToSave} rues · ${route.expiresInH} h`;
  }
  return `${formatKm(route.distanceKm)} km · +${route.zones} zones`;
}

/** Objectif d'une route (AMENDEMENT-12 §A — dérivé du sous-type interne). */
function routeObjective(route: PlannedRouteDemo): RouteObjective {
  return OBJECTIVE_BY_ROUTE_TYPE[route.typeKey];
}

/** Étiquette COURTE des cards : l'OBJECTIF (« CONQUÉRIR » / « DÉFENDRE »). */
function cardTypeLabel(route: PlannedRouteDemo): string {
  return ROUTE_OBJECTIVE_LABELS[routeObjective(route)].toUpperCase();
}

/** Chip générique (options/catalogue) — sélection chartreuse, régime usage réel. */
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
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Micro-titre de section (OPTIONS / CATALOGUE / OBJECTIF…). */
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

  // Route sélectionnée : l'entrée `?type=` (War Room) présélectionne la bonne.
  const initialId = useMemo(() => routeIdForType(params.type), [params.type]);
  const [routeId, setRouteId] = useState(initialId);
  const route =
    ROUTES_DEMO.find((r) => r.id === routeId) ?? ROUTES_DEMO[ROUTES_DEMO.length - 1];

  // Options (démo : sélection locale, la génération réelle est V1).
  const [distance, setDistance] = useState<RouteDistanceOption | null>(null);
  const [shape, setShape] = useState<RouteShape | null>(null);
  const [constraints, setConstraints] = useState<readonly string[]>([]);
  const [sharedRouteIds, setSharedRouteIds] = useState<readonly string[]>([]);

  useEffect(() => {
    screen('route_planner', { type: params.type ?? 'direct' });
  }, [params.type]);

  if (!route) return null; // ROUTES_DEMO n'est jamais vide (garde TS).

  // Valeurs effectives des chips : suivent la route tant que rien n'est forcé.
  const effectiveDistance = distance ?? distanceOptionFor(route);
  const effectiveShape = shape ?? route.shape;
  const priority: RoutePriority = PRIORITY_BY_ROUTE_ID[route.id] ?? 'capture';
  // Objectif actif (AMENDEMENT-12 §A) : DÉRIVÉ de la route sélectionnée.
  const objective = routeObjective(route);

  const selectRoute = (id: string) => {
    if (id === routeId) return;
    haptics.light();
    setRouteId(id);
    setDistance(null);
    setShape(null);
    screen('route_planner_route_select', { route: id });
  };

  const selectPriority = (p: RoutePriority) => {
    selectRoute(ROUTE_ID_BY_PRIORITY[p]);
  };

  // Onglet objectif : présélectionne la route du verbe (Conquérir → A, Défendre → C).
  const selectObjective = (o: RouteObjective) => {
    if (o === objective) return;
    selectRoute(ROUTE_ID_BY_OBJECTIVE[o]);
    screen('route_planner_objective_select', { objective: o });
  };

  const toggleConstraint = (key: string) => {
    haptics.light();
    setConstraints((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Route = objet social (AMENDEMENT-11 §6) : partage crew démo.
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

  /** Points possibles de l'objectif = ceux de la route de défense (règles §3). */
  const objectiveRoute = ROUTES_DEMO.find((r) => r.id === ROUTE_OBJECTIVE.routeId);
  /** Routes de l'onglet actif (Conquérir : A/B — Défendre : C). */
  const tabRoutes = ROUTES_DEMO.filter((r) => routeObjective(r) === objective);

  return (
    <View style={styles.root}>
      {/* ── Header KPI géant (un écran = une décision : démarrer CETTE route) ── */}
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
        {/* ── 2 onglets objectif (AMENDEMENT-12 §A) : la seule question de
            l'écran — Conquérir ou Défendre ── */}
        <View style={styles.objectiveTabs} accessibilityRole="tablist">
          {ROUTE_OBJECTIVE_ORDER.map((o) => {
            const active = o === objective;
            return (
              <Pressable
                key={o}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Objectif ${ROUTE_OBJECTIVE_LABELS[o]}`}
                onPress={() => selectObjective(o)}
                style={({ pressed }) => [
                  styles.objectiveTab,
                  active && styles.objectiveTabActive,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  name={o === 'defendre' ? 'bouclier' : 'cible'}
                  size={15}
                  color={active ? colors.chartreuse : colors.gris}
                />
                <Text
                  style={[styles.objectiveTabLabel, active && styles.objectiveTabLabelActive]}
                >
                  {ROUTE_OBJECTIVE_LABELS[o]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Propositions de l'onglet : tap = la route s'affiche + résumé maj ── */}
        <View style={styles.cardsRow}>
          {tabRoutes.map((r) => {
            const selected = r.id === route.id;
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Route ${r.letter} ${r.name} — ${cardStats(r)}`}
                onPress={() => selectRoute(r.id)}
                style={({ pressed }) => [
                  styles.card,
                  selected && styles.cardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={[styles.letterBadge, selected && styles.letterBadgeSelected]}>
                    <Text style={[styles.letter, selected && styles.letterSelected]}>
                      {r.letter}
                    </Text>
                  </View>
                  <Text style={[styles.cardType, selected && styles.cardTypeSelected]} numberOfLines={1}>
                    {cardTypeLabel(r)}
                  </Text>
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.cardStats} numberOfLines={2}>
                  {cardStats(r)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Bloc objectif : le War Room pointe ici (vocabulaire rues/zones) ── */}
        <SectionLabel icon="bouclier" label="OBJECTIF CREW" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ROUTE_OBJECTIVE.title} — voir la route de défense`}
          onPress={() => selectRoute(ROUTE_OBJECTIVE.routeId)}
          style={({ pressed }) => [styles.objective, pressed && styles.pressed]}
        >
          <View style={styles.objectiveIcon}>
            <Icon name="sablier" size={18} color={gameColors.danger} />
          </View>
          <View style={styles.objectiveBody}>
            <Text style={styles.objectiveTitle} numberOfLines={1}>
              {ROUTE_OBJECTIVE.title}
            </Text>
            <Text style={styles.objectiveMeta} numberOfLines={1}>
              {ROUTE_OBJECTIVE.streetsToSave} rues à sauver ·{' '}
              <Text style={styles.objectiveUrgent}>{ROUTE_OBJECTIVE.expiresInH} h restantes</Text>
            </Text>
          </View>
          <Text style={styles.objectivePoints}>
            +{formatInt(objectiveRoute?.points ?? 0)} pts
          </Text>
        </Pressable>

        {/* ── Options en chips (génération réelle = V1, sélection démo) ── */}
        <SectionLabel icon="reglages" label="OPTIONS" />
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
        {/* Priorités ALIGNÉES sous l'objectif actif (AMENDEMENT-12 §A) :
            capture/performance/exploration sous Conquérir, défense sous
            Défendre — plus de catalogue de types (sous-types internes). */}
        <View style={styles.chipsRow}>
          {PRIORITIES_BY_OBJECTIVE[objective].map((p) => (
            <Chip
              key={p}
              label={ROUTE_PRIORITY_LABELS[p]}
              selected={priority === p}
              onPress={() => selectPriority(p)}
              accessibilityLabel={`Priorité ${ROUTE_PRIORITY_LABELS[p]}`}
            />
          ))}
        </View>

        {/* ── Route sociale : partage crew (démo — toast + entrée feed) ── */}
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
      </ScrollView>

      {/* ── CTA évident : VERBE contextuel (AMENDEMENT-29 — « GO » retiré ; le
          libellé = l'objectif de la route sélectionnée, CONQUÉRIR/DÉFENDRE). ── */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ROUTE_OBJECTIVE_LABELS[objective]} — démarrer la route ${route.letter}, ${formatKm(route.distanceKm)} kilomètres`}
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
  panelContent: {
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 14,
    paddingBottom: 16,
  },
  // Onglets objectif (AMENDEMENT-12 §A) — 2 réponses à « que puis-je faire ? ».
  objectiveTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  objectiveTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  objectiveTabActive: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  objectiveTabLabel: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  objectiveTabLabelActive: { color: colors.chartreuse },
  cardsRow: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    backgroundColor: colors.carbone,
    borderRadius: radii.card - 6,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    padding: 10,
    gap: 6,
  },
  cardSelected: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  letterBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeSelected: { backgroundColor: colors.chartreuse, borderColor: colors.chartreuse },
  letter: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '800' },
  letterSelected: { color: colors.noir },
  cardType: { flex: 1, color: colors.gris, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  cardTypeSelected: { color: colors.chartreuse },
  cardName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  cardStats: { color: colors.gris, fontSize: 11, lineHeight: 15, fontVariant: ['tabular-nums'] },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionLabel: { color: colors.gris, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
  objective: {
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
  objectiveIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: gameColors.danger,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectiveBody: { flex: 1, gap: 2 },
  objectiveTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  objectiveMeta: { color: colors.gris, fontSize: fontSizes.xs },
  objectiveUrgent: { color: gameColors.danger, fontWeight: '700' },
  objectivePoints: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
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
