/**
 * GRYD — `/route-planner` : planificateur d'itinéraire LIVE, partout en France.
 * HONNÊTETÉ GPS (audit zéro-friction P0) :
 *   • DÉPART = la position réelle (GPS) uniquement — tant qu'elle n'est pas
 *     confirmée, le CTA de départ est DÉSACTIVÉ ; états explicites
 *     « Localisation… » puis « Position introuvable » + « Réessayer la
 *     localisation » sur échec ;
 *   • le point démo Paris n'est JAMAIS étiqueté « Ma position » : sur web sans
 *     géoloc, fallback EXPLICITE « Démo · Paris » (CTA actif, contexte assumé) ;
 *   • header épuré (3 blocs) : verbe · lieu / KPI km / résumé ≤ 3 infos
 *     (~min · zones · pts) — les minutes sont TOUJOURS une estimation (~) ;
 *   • PLANS = 3 formats (Recommandée / Rapide / Max points) — changer de plan
 *     ne change JAMAIS l'objectif courant ;
 *   • « Ajuster » (replié, dispo une fois l'origine connue) : OBJECTIF 2 verbes
 *     (Conquérir / Défendre — AMENDEMENT-12 §A) + DISTANCE EXACTE (1,5–50 km)
 *     + AUTRES BOUCLES (variantes) + partage crew ;
 *   • CTA VERBE contextuel, actif seulement position confirmée OU démo explicite.
 * Tous les tracés SUIVENT LES RUES (OSRM foot, sans clé) ; le tracé courant
 * reste affiché pendant un recalcul (spinner discret près du KPI). Events screen().
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, iconSizes, radii, spacing, type IconName } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import { ToastHost, useToast } from '../src/features/social/Toast';
import { RoutePlannerMap } from '../src/features/route/RoutePlannerMap';
import {
  GEN_DEFAULT_KM,
  GEN_MAX_KM,
  GEN_MIN_KM,
  GEN_STEP_KM,
  PLANNER_INTENTION_LABELS,
  generatedReasons,
  type PlannerIntention,
} from '../src/features/route/generator';
import { useRouteSuggestion } from '../src/features/route/useRouteSuggestion';
import { runsBeforeLearning, type RouteSuggestion } from '../src/features/route/suggestion';
import { routeLoop } from '../src/features/route/liveRouting';
import { setPlannedRoute } from '../src/features/route/plannedRoute';
import { currentPosition, type OriginPoint } from '../src/features/route/origin';
import { resolveSectorName } from '../src/features/map/sectorNaming';
import { EGO_REPUBLIQUE } from '../src/features/map/realAnchors';
import type { PlannedRouteDemo } from '../src/features/route/types';
// `tNow` = résolution hors composant (helpers module) ; le composant utilise
// useT() (réactif — re-rend à la bascule de langue, ce qui rafraîchit aussi
// les helpers appelés pendant le rendu).
import { C } from '../src/i18n/catalog/route';
import { t as tNow, useT } from '../src/i18n/store';

/** Hauteur de la carte. */
const MAP_HEIGHT = 250;

/** État de la géolocalisation — pilote labels, carte et CTA (jamais de mensonge). */
type GpsState = 'locating' | 'ok' | 'demo' | 'error';

/** Fallback web SANS géoloc : point démo EXPLICITE (jamais « Ma position »). */
function demoOrigin(): OriginPoint {
  return { point: EGO_REPUBLIQUE, label: tNow(C.demoOriginLabel) };
}

/**
 * 3 formats (distance) routés autour de l'origine — l'objectif courant est conservé.
 * Labels/status = Entries i18n, résolus à l'affichage.
 *
 * La « Recommandée » n'est PLUS la constante `GEN_DEFAULT_KM` pour tout le
 * monde : c'est la distance issue de `useRouteSuggestion` (réglage manuel, sinon
 * habitudes apprises, sinon défaut assumé). Les deux autres formats restent des
 * FORMATS fixes (court / plus long) — ce sont des alternatives explicites, pas
 * des recommandations, donc rien à personnaliser.
 */
function planPresets(recommendedKm: number) {
  return [
    { key: 'recommandee', label: C.planRecommended, km: recommendedKm, status: C.planStatusBalance },
    { key: 'rapide', label: C.planFast, km: 2, status: C.planStatusSimple },
    { key: 'max', label: C.planMaxPoints, km: 5, status: C.planStatusZones },
  ] as const;
}

/** 2 verbes joueur (AMENDEMENT-12 §A) — « attaquer » n'est plus proposé ici. */
const INTENTION_CHOICES: readonly PlannerIntention[] = ['conquerir', 'defendre'];

/** Icône par intention. */
const INTENTION_ICON: Record<PlannerIntention, IconName> = {
  conquerir: 'cible',
  attaquer: 'guerre',
  defendre: 'bouclier',
};

function formatKm(km: number): string {
  return km.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Allure d'ESTIMATION des durées (~5'50/km) — étiquette UI, pas une règle de jeu. */
const EST_PACE_SEC_PER_KM = 350;

function estMinutes(km: number): number {
  return Math.round((km * EST_PACE_SEC_PER_KM) / 60);
}

/** Résumé header : max 3 infos, minutes toujours estimées (~). Résolu langue courante
 *  (le composant re-rend au changement de langue via useT). */
function routeSummary(route: PlannedRouteDemo): string {
  const dur = `~${estMinutes(route.distanceKm)} min`;
  if (route.typeKey === 'defense' && route.streetsToSave !== undefined) {
    return tNow(C.summaryDefense, { dur, zones: route.zones, streets: route.streetsToSave });
  }
  return tNow(C.summaryConquest, { dur, zones: route.zones, pts: formatInt(route.points) });
}

function ctaMicrocopy(route: PlannedRouteDemo): string {
  return tNow(C.ctaMicro, {
    km: formatKm(route.distanceKm),
    min: estMinutes(route.distanceKm),
    pts: formatInt(route.points),
  });
}

/**
 * POURQUOI CETTE DISTANCE — une phrase, dérivée de la MÊME `RouteSuggestion` qui
 * a fixé la distance. Écran et décision ne peuvent donc pas diverger : c'est ce
 * découplage qui avait produit « Adaptée à tes habitudes » sur une constante.
 * Les 3 états (appris / défaut assumé / réglage manuel) sont tous explicites.
 */
function suggestionWhy(s: RouteSuggestion): string {
  const km = formatKm(s.km);
  if (s.source === 'manual') return tNow(C.whyManual, { km });
  if (s.source === 'learned') return tNow(C.whyLearned, { km, n: s.sampleRuns ?? 0 });
  const remaining = runsBeforeLearning(s);
  if (remaining !== null && remaining > 0) return tNow(C.whyDefaultLearning, { km, n: remaining });
  if (s.cause === 'off') return tNow(C.whyDefaultOff, { km });
  return tNow(C.whyDefaultUnknown, { km });
}

function SectionLabel({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={iconSizes.xs} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

const clampKm = (km: number) => Math.min(GEN_MAX_KM, Math.max(GEN_MIN_KM, km));

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT();
  const params = useLocalSearchParams<{ type?: string }>();

  // Origine : `null` tant que rien n'est confirmé — aucun tracé fantôme Paris.
  const [origin, setOrigin] = useState<OriginPoint | null>(null);
  const [gps, setGps] = useState<GpsState>('locating');
  const [intention, setIntention] = useState<PlannerIntention>(
    params.type === 'defense' ? 'defendre' : 'conquerir',
  );
  const [targetKm, setTargetKm] = useState(GEN_DEFAULT_KM);
  const [distanceDraft, setDistanceDraft] = useState(formatKm(GEN_DEFAULT_KM));
  const [seed, setSeed] = useState(1);
  const [route, setRoute] = useState<PlannedRouteDemo | null>(null);
  const [routing, setRouting] = useState(false);
  const [nearby, setNearby] = useState<PlannedRouteDemo[]>([]);
  // Distingue « en cours de calcul » de « aucune variante » : sans ce flag, une
  // liste vide (échec réseau) était indistinguable d'un chargement → spinner infini.
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sharedFeed, setSharedFeed] = useState<readonly { id: string; text: string }[]>([]);

  // Distance PROPOSÉE + sa raison (features/route/suggestion.ts). Une seule
  // source pour les deux : la phrase affichée ne peut pas contredire le chiffre.
  const { suggestion, loading: suggestionLoading } = useRouteSuggestion();

  const reqIdRef = useRef(0);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Le premier routage n'a lieu qu'une fois, quand la suggestion est connue. */
  const bootedRef = useRef(false);

  /** Route en LIVE autour d'une origine explicite (garde le tracé courant pendant le calcul). */
  const applyRoute = (o: OriginPoint, km: number, intent: PlannerIntention, sd: number) => {
    const c = clampKm(km);
    setIntention(intent);
    setTargetKm(c);
    setSeed(sd);
    const id = ++reqIdRef.current;
    setRouting(true);
    void routeLoop(o.point, o.label, c, intent, sd)
      .then((r) => {
        if (id !== reqIdRef.current) return;
        setRouting(false);
        if (r) {
          setRoute(r);
          setTargetKm(r.distanceKm);
          setDistanceDraft(formatKm(r.distanceKm));
        } else {
          // Routage indisponible (OSRM null) : jamais de spinner infini — on
          // arrête le chargement, le tracé courant reste, message re-tentable.
          toast.show(tNow(C.toastRouteUnavailable));
        }
      })
      .catch(() => {
        // Rejet réseau/serveur : même filet honnête (sans ce catch, setRouting
        // resterait à true → spinner infini + unhandled rejection).
        if (id !== reqIdRef.current) return;
        setRouting(false);
        toast.show(tNow(C.toastRouteUnavailable));
      });
  };

  const applyDebounced = (o: OriginPoint, km: number, intent: PlannerIntention, sd: number) => {
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    setRouting(true);
    liveTimerRef.current = setTimeout(() => applyRoute(o, km, intent, sd), 450);
  };

  /**
   * Localise (GPS) + nomme + route. Échec :
   *   web    → fallback démo EXPLICITE (« Démo · Paris »), CTA actif ;
   *   natif  → état `error` (CTA désactivé + « Réessayer la localisation »).
   */
  const locateAndRoute = (km: number, intent: PlannerIntention, sd: number) => {
    setGps('locating');
    void currentPosition().then(async (pos) => {
      if (!pos) {
        if (Platform.OS === 'web') {
          const demo = demoOrigin();
          setGps('demo');
          setOrigin(demo);
          applyRoute(demo, km, intent, sd);
        } else {
          setGps('error');
          toast.show(tNow(C.toastPositionNotFound));
        }
        return;
      }
      // Position CONFIRMÉE → nom RÉEL du secteur (quartier/village, PARTOUT en
      // Europe) via reverse-geocode + hiérarchie de repli + cache (resolveSectorName).
      // Clé de cache ~ granularité secteur (coords arrondies) ; « Ma position » ne
      // sert que si aucun nom OSM (réseau HS) — jamais un faux lieu.
      const key = `${pos.lat.toFixed(2)},${pos.lng.toFixed(2)}`;
      const label = await resolveSectorName(pos, key, tNow(C.myPosition));
      const o = { point: pos, label };
      setGps('ok');
      setOrigin(o);
      applyRoute(o, km, intent, sd);
    });
  };

  // Premier rendu : localisation d'abord — aucun tracé tant que l'origine est inconnue.
  //
  // On ATTEND la suggestion (réglage manuel / habitudes / défaut) avant de router :
  // router d'abord sur `GEN_DEFAULT_KM` puis re-router sur la vraie distance
  // ferait clignoter un tracé que personne n'a demandé, et afficherait pendant une
  // seconde une proposition « recommandée » qui n'est celle de personne.
  // `suggestionLoading` retombe TOUJOURS à false (échec inclus → défaut assumé),
  // donc ce garde-fou ne peut pas bloquer l'écran.
  useEffect(() => {
    screen('route_planner', { type: params.type ?? 'direct' });
    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (suggestionLoading || bootedRef.current) return;
    bootedRef.current = true;
    const intent: PlannerIntention = params.type === 'defense' ? 'defendre' : 'conquerir';
    locateAndRoute(suggestion.km, intent, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionLoading]);

  // Variantes (autres boucles) : 3 boucles routées LIVE autour de l'origine connue.
  useEffect(() => {
    if (!adjustOpen || !origin) return;
    let cancelled = false;
    const spreads = [0.6, 1.35, 1.9];
    setNearbyLoading(true);
    void Promise.all(
      spreads.map((s, i) =>
        routeLoop(origin.point, origin.label, clampKm(targetKm * s), intention, seed * 10 + i + 2),
      ),
    )
      .then((list) => {
        if (cancelled) return;
        setNearby(list.filter((r): r is PlannedRouteDemo => r !== null));
        setNearbyLoading(false);
      })
      .catch(() => {
        // Rejet réseau/serveur : liste vide + fin de chargement (jamais de
        // spinner infini). L'état vide affiche un message re-tentable.
        if (cancelled) return;
        setNearby([]);
        setNearbyLoading(false);
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

  /** Choisir un plan change la DISTANCE, jamais l'objectif courant. */
  const selectPreset = (km: number, key: string) => {
    haptics.light();
    if (origin) applyRoute(origin, km, intention, seed);
    else locateAndRoute(km, intention, seed);
    screen('route_planner_plan_select', { plan: key });
  };

  const selectIntention = (intent: PlannerIntention) => {
    if (intent === intention || !origin) return;
    haptics.light();
    applyRoute(origin, targetKm, intent, seed);
    screen('route_planner_objective_select', { objective: intent });
  };

  const stepDistance = (delta: number) => {
    if (!origin) return;
    haptics.light();
    const nk = clampKm(targetKm + delta);
    setDistanceDraft(formatKm(nk));
    applyRoute(origin, nk, intention, seed);
  };

  const onDistanceType = (text: string) => {
    setDistanceDraft(text);
    if (!origin) return;
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
    setNearby([]);
    setNearbyLoading(true); // feedback immédiat : le spinner remplace la liste pendant le recalcul.
    setSeed((s) => s + 1);
  };

  const shareRoute = () => {
    if (!route || !origin) return;
    haptics.medium();
    const text = t(C.shareToastText, { km: formatKm(route.distanceKm), place: origin.label });
    toast.show(text);
    setSharedFeed((prev) =>
      prev.some((f) => f.id === route.id) ? prev : [...prev, { id: route.id, text }],
    );
    screen('route_planner_share', { route: route.id });
  };

  // Départ possible UNIQUEMENT position confirmée OU mode démo explicite.
  const startDisabled = !route || gps === 'locating' || gps === 'error';

  const startRun = () => {
    if (!route || startDisabled) return;
    haptics.medium();
    // Arme le parcours PLANIFIÉ : la course suivra EXACTEMENT ce tracé (store).
    setPlannedRoute(route);
    const intent = intention === 'defendre' ? 'defense' : 'conquest';
    router.push(`/course-live?mode=conquete&intention=${intent}&planned=1`);
  };

  const intentionLabel = t(PLANNER_INTENTION_LABELS[intention]);
  const reasons = route ? generatedReasons(route, intention) : [];

  // Formats : la « Recommandée » porte la distance PERSONNALISÉE.
  const presets = planPresets(suggestion.km);
  // Format effectivement en cours = le plus proche du tracé, et lui seul —
  // à condition de rester dans la tolérance (sinon aucun format n'est « choisi »).
  const nearestPlanKey = route
    ? presets.reduce<{ key: string; d: number }>(
        (best, p) => {
          const d = Math.abs(route.distanceKm - p.km);
          return d < best.d ? { key: p.key, d } : best;
        },
        { key: '', d: Number.POSITIVE_INFINITY },
      )
    : { key: '', d: Number.POSITIVE_INFINITY };
  const nearestPlanKeyResolved = nearestPlanKey.d < 0.7 ? nearestPlanKey.key : '';

  // Labels honnêtes par état GPS — jamais « Ma position » sans position confirmée.
  const placeLabel =
    route?.zone ?? origin?.label ?? (gps === 'error' ? t(C.positionNotFound) : t(C.locating));
  const originLabel =
    gps === 'locating' ? t(C.locating) : gps === 'error' ? t(C.positionNotFound) : (origin?.label ?? '—');
  const originHint =
    gps === 'ok'
      ? t(C.hintGpsOk)
      : gps === 'demo'
        ? t(C.hintGpsDemo)
        : gps === 'error'
          ? t(C.hintGpsError)
          : t(C.hintGpsLocating);
  const summaryText = route
    ? routeSummary(route)
    : gps === 'error'
      ? t(C.summaryGpsError)
      : gps === 'demo'
        ? t(C.summaryDemoComputing)
        : t(C.summaryWaitingPosition);

  return (
    <View style={styles.root}>
      {/* ── Header épuré : verbe · lieu / KPI km / résumé ≤ 3 infos ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.back)}
            hitSlop={12}
            onPress={() => goBack()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <View style={styles.mirror}>
              <Icon name="chevron" size={iconSizes.lg} color={colors.blanc} />
            </View>
          </Pressable>
          <Text style={styles.kicker} numberOfLines={1}>
            {intentionLabel.toUpperCase()} · {placeLabel.toUpperCase()}
          </Text>
          <View style={styles.back} />
        </View>
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>
            {route ? formatKm(route.distanceKm) : '—'} <Text style={styles.kpiUnit}>KM</Text>
          </Text>
          {routing && route ? (
            <ActivityIndicator size="small" color={colors.chartreuse} style={styles.kpiSpin} />
          ) : null}
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {summaryText}
        </Text>
      </View>

      {/* ── Carte : tracé réel uniquement — sinon état localisation/calcul explicite ── */}
      <View style={styles.mapWrap}>
        {route && origin ? (
          <RoutePlannerMap route={route} origin={origin.point} />
        ) : (
          <View style={styles.mapLoading}>
            {gps === 'error' ? (
              <Icon name="carte" size={iconSizes.lg} color={colors.gris} />
            ) : (
              <ActivityIndicator color={colors.chartreuse} />
            )}
            <Text style={styles.mapLoadingText}>
              {gps === 'error' ? t(C.positionNotFound) : gps === 'locating' ? t(C.locating) : t(C.mapComputing)}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── DÉPART : label honnête par état (position / démo / introuvable) ── */}
        <SectionLabel icon="carte" label={t(C.secStart)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gps === 'error' ? t(C.retryLocation) : t(C.a11yRecenter)}
          onPress={recentrer}
          style={({ pressed }) => [styles.originRow, pressed && styles.pressed]}
        >
          <View style={styles.originField}>
            <Icon
              name="carte"
              size={iconSizes.sm}
              color={gps === 'error' ? colors.gris : colors.chartreuse}
            />
            <Text style={styles.originLabel} numberOfLines={1} adjustsFontSizeToFit>
              {originLabel}
            </Text>
          </View>
          <View style={styles.gpsBtn}>
            {gps === 'locating' ? (
              <ActivityIndicator color={colors.chartreuse} size="small" />
            ) : (
              <Icon name="cible" size={iconSizes.md} color={colors.chartreuse} />
            )}
          </View>
        </Pressable>
        <Text style={styles.hint}>{originHint}</Text>
        {gps === 'error' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.retryLocation)}
            onPress={recentrer}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          >
            <Icon name="cible" size={16} color={colors.blanc} />
            <Text style={styles.retryLabel}>{t(C.retryLocation)}</Text>
          </Pressable>
        ) : null}

        {/* ── « Pourquoi cette course ? » — puces + D'OÙ VIENT LA DISTANCE ──
             Pas de section nouvelle (§A : 1 écran = 1 décision) : la provenance
             tient en UNE ligne sous les puces existantes. Elle est affichée dès
             que la suggestion a résolu, même sans tracé — c'est une propriété de
             la proposition, pas du routage. */}
        {reasons.length > 0 ? (
          <>
            <SectionLabel icon="cible" label={t(C.secWhy)} />
            <View style={styles.reasonRow}>
              {reasons.map((reason) => (
                <View key={reason.fr} style={styles.reason}>
                  <Text style={styles.reasonText}>{t(reason)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {!suggestionLoading ? (
          <Text style={styles.hint} numberOfLines={2}>
            {suggestionWhy(suggestion)}
          </Text>
        ) : null}

        {/* ── PLANS : 3 formats — la distance change, l'objectif reste ── */}
        <SectionLabel icon="cible" label={t(C.secPlans)} />
        <View style={styles.plansRow}>
          {presets.map((plan) => {
            // Un SEUL format sélectionné : si la distance recommandée tombe près
            // d'un format fixe (2 ou 5 km), le seuil de 0,7 km en marquait deux.
            const selected = !!route && plan.key === nearestPlanKeyResolved;
            return (
              <Pressable
                key={plan.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(C.a11yPlan, { label: t(plan.label), km: plan.km })}
                onPress={() => selectPreset(plan.km, plan.key)}
                style={({ pressed }) => [
                  styles.plan,
                  selected && styles.planSelected,
                  pressed && styles.pressed,
                ]}
              >
                {/* §A « aucun texte coupé » : à 3 chips sur 375px et au plancher
                    a11y 12px, ces lignes débordaient (« ✓ Recommandée », « …~20 mi »).
                    La coche est retirée (la sélection reste lisible : couleur
                    chartreuse + fond sélectionné + ligne « Choisi » + a11y state) ;
                    distance et statut passent sur 2 lignes au lieu d'être rognés. */}
                <Text
                  style={[styles.planLabel, selected && styles.planLabelSelected]}
                  numberOfLines={1}
                >
                  {t(plan.label)}
                </Text>
                <Text style={styles.planDist} numberOfLines={2}>
                  {`~${formatKm(plan.km)} km · ~${estMinutes(plan.km)} min`}
                </Text>
                <Text style={styles.planReason} numberOfLines={2}>
                  {selected ? t(C.planChosen) : t(plan.status)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── « Ajuster » (dispo une fois l'origine connue) : objectif + distance + variantes ── */}
        {origin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: adjustOpen }}
            accessibilityLabel={t(C.adjustRun)}
            onPress={() => {
              haptics.light();
              setAdjustOpen((o) => !o);
            }}
            style={({ pressed }) => [styles.adjustHead, pressed && styles.pressed]}
          >
            <Icon name="reglages" size={16} color={colors.blanc} />
            <Text style={styles.adjustLabel}>{t(C.adjustRun)}</Text>
            <View style={adjustOpen ? styles.chevUp : styles.chevDown}>
              <Icon name="chevron" size={16} color={colors.gris} />
            </View>
          </Pressable>
        ) : null}

        {origin && adjustOpen ? (
          <View style={styles.adjustBody}>
            <SectionLabel icon="cible" label={t(C.secObjective)} />
            <View style={styles.intentionRow}>
              {INTENTION_CHOICES.map((it) => {
                const active = it === intention;
                const itLabel = t(PLANNER_INTENTION_LABELS[it]);
                return (
                  <Pressable
                    key={it}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(C.a11yObjective, { label: itLabel })}
                    onPress={() => selectIntention(it)}
                    style={({ pressed }) => [
                      styles.intentionChip,
                      active && styles.intentionChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon name={INTENTION_ICON[it]} size={iconSizes.sm} color={active ? colors.chartreuse : colors.gris} />
                    <Text
                      style={[styles.intentionLabel, active && styles.intentionLabelActive]}
                      numberOfLines={1}
                      ellipsizeMode="clip"
                    >
                      {active ? `✓ ${itLabel}` : itLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionLabel icon="reglages" label={t(C.secExactDistance)} />
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.a11yDecreaseDistance)}
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
                  accessibilityLabel={t(C.a11yDistanceKm)}
                  style={styles.stepInput}
                  placeholderTextColor={colors.gris}
                />
                <Text style={styles.stepUnit}>km</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.a11yIncreaseDistance)}
                onPress={() => stepDistance(GEN_STEP_KM)}
                style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
              >
                <Text style={styles.stepSign}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {t(C.distanceRangeHint, { min: formatKm(GEN_MIN_KM), max: GEN_MAX_KM })}
            </Text>

            <View style={styles.nearbyHead}>
              <Icon name="crew" size={iconSizes.xs} color={colors.gris} />
              <Text style={styles.sectionLabel}>{t(C.secOtherLoops)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.a11yRegenerate)}
                hitSlop={8}
                onPress={shuffleNearby}
                style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
              >
                <Icon name="reglages" size={iconSizes.xs} color={colors.chartreuse} />
                <Text style={styles.shuffleText}>{t(C.regenerate)}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
              {nearbyLoading ? (
                <View style={styles.nearbyLoading}>
                  <ActivityIndicator color={colors.chartreuse} size="small" />
                </View>
              ) : nearby.length === 0 ? (
                <View style={styles.nearbyLoading}>
                  <Text style={styles.mapLoadingText}>{t(C.loopsUnavailable)}</Text>
                </View>
              ) : (
                nearby.map((loop, i) => {
                  const selected = !!route && loop.id === route.id;
                  const variantLabel = t(C.variantN, { n: i + 1 });
                  return (
                    <Pressable
                      key={`${loop.id}-${i}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(C.a11yVariant, { n: i + 1, km: formatKm(loop.distanceKm) })}
                      onPress={() => adoptNearby(loop)}
                      style={({ pressed }) => [
                        styles.popularCard,
                        selected && styles.popularCardSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.popularName} numberOfLines={1} ellipsizeMode="clip">
                        {selected ? `✓ ${variantLabel}` : variantLabel}
                      </Text>
                      <Text style={styles.popularStats} numberOfLines={1} ellipsizeMode="clip">
                        {t(C.variantStats, { km: formatKm(loop.distanceKm), zones: loop.zones })}
                      </Text>
                      <View style={styles.popularCrews}>
                        <Icon name="serie" size={12} color={colors.chartreuse} />
                        <Text style={styles.popularCrewsText} numberOfLines={1} ellipsizeMode="clip">
                          {t(C.variantMeta, { min: estMinutes(loop.distanceKm), pts: formatInt(loop.points) })}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {/* « CREW » : invariant produit (concept Crew) — jamais traduit. */}
            <SectionLabel icon="crew" label="CREW" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yShareCrew)}
              onPress={shareRoute}
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
            >
              <Icon name="partage" size={16} color={colors.blanc} />
              <Text style={styles.shareLabel}>{t(C.shareToCrew)}</Text>
            </Pressable>
            {sharedFeed.map((f) => (
              <View key={f.id} style={styles.feedRow}>
                <Icon name="feed" size={iconSizes.sm} color={colors.chartreuse} />
                <Text style={styles.feedText} numberOfLines={1}>
                  {f.text}
                </Text>
                <Text style={styles.feedTime}>{t(C.justNow)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* ── CTA VERBE contextuel — désactivé tant que la position n'est pas confirmée ── */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.ctaMicro} numberOfLines={1}>
          {route ? ctaMicrocopy(route) : gps === 'error' ? t(C.ctaPositionRequired) : '—'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yStart, { verb: intentionLabel })}
          accessibilityState={{ disabled: startDisabled }}
          onPress={startRun}
          disabled={startDisabled}
          style={({ pressed }) => [
            styles.startBtn,
            pressed && !startDisabled && styles.startPressed,
            startDisabled && styles.startDisabled,
          ]}
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
  kpiRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  kpi: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  kpiUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '700' },
  kpiSpin: { marginLeft: 10, marginBottom: 8 },
  summary: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 4, lineHeight: 17 },
  mapWrap: { height: MAP_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.grisLigne },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.noir },
  mapLoadingText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  panel: { flex: 1 },
  panelContent: { paddingHorizontal: spacing.cardPadding, paddingTop: 12, paddingBottom: 16 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, marginBottom: 8 },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2, fontWeight: '700' },

  // Départ : champ d'état + bouton position.
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    marginTop: 4,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  retryLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },

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
    paddingHorizontal: 6,
    gap: 3,
  },
  planSelected: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },
  planLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: -0.2 },
  planLabelSelected: { color: colors.chartreuse },
  planDist: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  planReason: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },

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
    height: 44,
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
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  shuffleText: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },
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
  popularStats: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  popularCrews: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  popularCrewsText: {
    flex: 1,
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
    backgroundColor: colors.carbone,
    borderRadius: radii.card - 8,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  feedText: { flex: 1, color: colors.blanc, fontSize: fontSizes.xs },
  feedTime: { color: colors.gris, fontSize: fontSizes.xs },

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
