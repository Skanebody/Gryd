/**
 * GRYD — E05 « BRIEFING DE MISSION ». Transformer une INTENTION (« reprendre
 * cette zone », décidée en E04) en objectif concret SANS formulaire : kicker +
 * titre + ✕, aperçu du tracé recommandé + « Ajuster », UN SEUL bloc de
 * métriques à séparateurs, une phrase de valeur tactique, puis le CTA.
 *
 * Son unique porte d'entrée est le CTA « Reprendre » de la sheet de zone : la
 * ligne mission du haut vit dans app/(tabs)/index.tsx (composition figée) et
 * garde sa propre entrée vers le planificateur.
 *
 * ─── CE QUE CET ÉCRAN NE FAIT PAS, ET POURQUOI ─────────────────────────────
 * 1. IL N'OUVRE JAMAIS L'INVITE DE LOCALISATION. On consomme la position que la
 *    carte possède DÉJÀ (`egoPos`, acquise par un geste : Recentrer ou le
 *    premier GO). Sans elle, on le DIT et on renvoie vers le planificateur, où
 *    la demande naît d'un geste. Ouvrir la boîte système à l'ouverture d'une
 *    sheet réintroduirait exactement le défaut corrigé le 21/07 sur
 *    /route-planner (cf. son en-tête).
 * 2. IL NE PEINT AUCUNE POLYLIGNE DÉCORATIVE. La mini-carte n'affiche que le
 *    VRAI tracé OSRM, rue par rue. Les trois autres états (position inconnue /
 *    calcul en cours / échec réseau) ont chacun leur phrase, distincte — un
 *    joueur hors ligne ne doit jamais voir une boucle qui n'a pas été calculée.
 * 3. IL NE PROMET RIEN QUE L'ÉCRAN SUIVANT NE TIENNE. `/course-live` ignore
 *    volontairement tout paramètre d'objectif : la course qui démarre est une
 *    course LIBRE dont le serveur classera la capture APRÈS coup. La phrase de
 *    valeur tactique le dit mot pour mot plutôt que de laisser croire à un
 *    guidage sur le tracé.
 *
 * MÉTRIQUES : la planche en montre quatre. Une seule a une source — la distance
 * MESURÉE par OSRM. Durée (allure fixe), gain de surface (le serveur tranche
 * après la course) et difficulté (trois seuils de km non traduits) sont
 * supprimées : cf. `briefMetricKeys` et ses tests.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { C as M } from '../../i18n/catalog/mission';
import { C } from '../../i18n/catalog/map';
import { useLocale, useT } from '../../i18n/store';
import type { Locale } from '../../i18n/types';
import { screen } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { routeLoop } from '../route/liveRouting';
import { useRouteSuggestion } from '../route/useRouteSuggestion';
import type { LatLngPoint } from './realAnchors';
import { fitTracesToBox } from './projectTrace';
import { SheetMetrics, type SheetMetric } from './SheetMetrics';
import {
  BRIEF_PREVIEW_H,
  briefMetricKeys,
  briefRouteState,
  type BriefRouteState,
} from './zoneDecision';

/** Marge interne de la mini-carte (le tracé ne colle jamais au bord). */
const PREVIEW_PAD = 14;
/** Marges horizontales de `styles.info` — la mini-carte occupe le reste. */
const SHEET_H_PADDING = 16;

/** « 4,2 km » — virgule décimale sauf en anglais (même règle que le reste). */
function formatKm(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

export interface MissionBriefingSheetProps {
  /** Territoire visé (clé de territoire) — sert de graine déterministe au tracé. */
  zoneId: string;
  /** Nom RÉEL du quartier si le géocodage inverse en a rendu un, sinon null. */
  zoneName: string | null;
  /**
   * Position du joueur telle que la CARTE la connaît déjà. `null` = inconnue :
   * on ne route pas, et on ne demande rien à l'OS (cf. en-tête).
   */
  egoPos: LatLngPoint | null;
  /** ✕ — revient à la sheet de zone (E04), pas à la carte nue : le briefing est
   *  une étape DANS la décision de zone, ✕ recule d'un cran. */
  onClose: () => void;
  /** « Ajuster » / repli sans position → planificateur d'itinéraire réel. */
  onOpenPlanner: () => void;
  /** CTA — démarre la course de conquête. */
  onStart: () => void;
  /**
   * État du tracé remonté au parent : c'est lui qui dimensionne la sheet, et il
   * ne peut pas le deviner (le routage vit ici). Appelé à chaque transition,
   * jamais par frame.
   */
  onStateChange?: (state: BriefRouteState) => void;
}

export function MissionBriefingSheet({
  zoneId,
  zoneName,
  egoPos,
  onClose,
  onOpenPlanner,
  onStart,
  onStateChange,
}: MissionBriefingSheetProps) {
  const t = useT();
  const locale = useLocale();
  const { width: winW } = useWindowDimensions();
  /** Distance à proposer + provenance : la MÊME source que le planificateur. */
  const { suggestion } = useRouteSuggestion();
  const [route, setRoute] = useState<{ line: readonly LatLngPoint[]; km: number } | null>(null);
  const [loading, setLoading] = useState(false);
  /** Relance manuelle après un échec réseau (jamais un retry automatique). */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    screen('map_mission_brief', { zone: zoneId });
  }, [zoneId]);

  // Graine DÉTERMINISTE dérivée du territoire : rouvrir le briefing de la même
  // zone propose la même boucle, pas une nouvelle à chaque tap.
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < zoneId.length; i += 1) h = (h * 31 + zoneId.charCodeAt(i)) % 100_000;
    return h;
  }, [zoneId]);

  const originLat = egoPos?.lat ?? null;
  const originLng = egoPos?.lng ?? null;
  const targetKm = suggestion.km;
  const label = zoneName ?? t(C.zoneFallback);

  useEffect(() => {
    // Pas de position ⇒ AUCUN appel, et surtout aucune demande de permission.
    if (originLat === null || originLng === null) {
      setRoute(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const planned = await routeLoop(
        { lat: originLat, lng: originLng },
        label,
        targetKm,
        'conquerir',
        seed,
        controller.signal,
      ).catch(() => null);
      if (cancelled) return;
      setLoading(false);
      // `null` = réseau/OSRM muet : on n'invente pas de boucle, l'état « échec »
      // le dira (et il est distinct de « pas de position »).
      setRoute(planned ? { line: planned.line, km: planned.distanceKm } : null);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [originLat, originLng, targetKm, seed, label, attempt]);

  const state = briefRouteState({
    hasPosition: egoPos !== null,
    loading,
    distanceKm: route?.km ?? null,
  });

  // Remontée de l'état au parent (dimensionnement de la sheet). Callback lue par
  // ref : le parent peut la redéfinir à chaque rendu sans relancer l'effet.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.(state);
  }, [state]);

  const metrics: readonly SheetMetric[] = briefMetricKeys(state).map((key) => ({
    key,
    value: formatKm(route?.km ?? 0, locale),
    label: t(M.briefMetricDistance),
  }));

  const previewW = Math.max(120, winW - SHEET_H_PADDING * 2);

  return (
    <View style={styles.info}>
      {/* ── Kicker + titre + ✕ (planche E05) ── */}
      <View style={styles.head}>
        <View style={styles.pastille} />
        <Text style={styles.kicker} numberOfLines={1}>
          {t(M.briefKicker)}
        </Text>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(M.briefCloseA11y)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            onClose();
          }}
          style={({ pressed }) => [styles.closeHit, pressed && styles.pressed]}
          testID="brief-close"
        >
          <Text style={styles.closeText}>{t(C.closeLabel)}</Text>
        </Pressable>
      </View>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        {zoneName ? t(M.briefTitleNamed, { zone: zoneName }) : t(M.briefTitle)}
      </Text>

      {/* ── Aperçu du tracé : le VRAI tracé, ou l'état qui dit pourquoi il n'y
          en a pas. Jamais de boucle décorative. ── */}
      {state === 'ready' && route ? (
        <View
          style={[styles.preview, { width: previewW }]}
          accessibilityRole="image"
          accessibilityLabel={t(M.briefRouteA11y, { km: formatKm(route.km, locale) })}
          testID="brief-route-preview"
        >
          <RoutePreview line={route.line} width={previewW} height={BRIEF_PREVIEW_H} />
        </View>
      ) : (
        <View style={styles.stateBlock} testID={`brief-route-${state}`}>
          {state === 'loading' ? (
            <ActivityIndicator size="small" color={colors.gris} />
          ) : null}
          <Text style={styles.stateText} numberOfLines={2}>
            {t(
              state === 'no-position'
                ? M.briefRouteNoPosition
                : state === 'loading'
                  ? M.briefRouteLoading
                  : M.briefRouteFailed,
            )}
          </Text>
        </View>
      )}

      {/* Action du bloc d'aperçu — UN LIEN, jamais un 2ᵉ bouton plein (§A.4), et
          il nomme la sortie qui débloque RÉELLEMENT l'état courant :
            · tracé prêt      → « Ajuster » (le planificateur reprend la main) ;
            · échec réseau    → « Réessayer » (on relance le calcul, ici même) ;
            · position inconnue → « Planifier ce parcours » : il n'y a rien à
              ajuster, il y a une position à obtenir — et c'est le planificateur
              qui la demande, SUR UN GESTE.
          Rien pendant le calcul : un lien qui changerait d'objet en cours de
          route serait un piège sous le pouce. */}
      {state === 'loading' ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            state === 'failed'
              ? t(M.briefRetry)
              : state === 'no-position'
                ? t(M.missionPlanA11y)
                : t(M.briefAdjustA11y)
          }
          hitSlop={8}
          onPress={() => {
            haptics.light();
            if (state === 'failed') {
              setAttempt((a) => a + 1);
              return;
            }
            onOpenPlanner();
          }}
          style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
          testID="brief-adjust"
        >
          <Text style={styles.link} numberOfLines={1}>
            {state === 'failed'
              ? t(M.briefRetry)
              : state === 'no-position'
                ? t(M.missionPlan)
                : t(M.briefAdjust)}
          </Text>
        </Pressable>
      )}

      {/* ── UN SEUL bloc de métriques à séparateurs (jamais 4 cards) ── */}
      <SheetMetrics metrics={metrics} testID="brief-metrics" />

      {/* ── Phrase de valeur tactique : neutre, non dramatisée, et VRAIE ── */}
      <Text style={styles.tactical} numberOfLines={3}>
        {t(M.briefTactical)}
      </Text>

      {/* ── CTA unique (GO reste retiré tant que ce sheet est ouvert) ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(M.briefStartA11y)}
        onPress={() => {
          haptics.medium();
          onStart();
        }}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        testID="brief-start"
      >
        <Text style={styles.ctaLabel} numberOfLines={1} adjustsFontSizeToFit>
          {t(M.briefStart)}
        </Text>
      </Pressable>
      {/* Microtexte FACTUEL : la position est acquise AVANT le préflight, c'est
          l'enregistrement qui part au dernier palier du décompte. */}
      <Text style={styles.micro} numberOfLines={1} adjustsFontSizeToFit>
        {t(M.briefStartMicro)}
      </Text>
    </View>
  );
}

/**
 * Mini-carte du tracé : projection PURE partagée avec le post-run et le partage
 * (`fitTracesToBox`) — la même forme réelle, jamais un dessin d'illustration.
 * Casing sombre + cœur chartreuse, la grammaire §B de la trace héros.
 */
function RoutePreview({
  line,
  width,
  height,
}: {
  line: readonly LatLngPoint[];
  width: number;
  height: number;
}) {
  const d = useMemo(
    () => fitTracesToBox([line], width, height, PREVIEW_PAD).path(line),
    [line, width, height],
  );
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={colors.noir} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path
        d={d}
        stroke={gameColors.crew}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Contenu posé DIRECTEMENT sur la sheet : aucune sous-card (§A).
  info: { paddingHorizontal: SHEET_H_PADDING, paddingBottom: 12, gap: 6 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Pastille chartreuse : c'est MA mission (rôle §C), pas la zone rivale.
  pastille: { width: 10, height: 10, borderRadius: 5, backgroundColor: gameColors.crew },
  kicker: {
    color: gameColors.crew,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  spacer: { flex: 1 },
  closeHit: { minHeight: 32, paddingHorizontal: 6, justifyContent: 'center' },
  closeText: { color: colors.gris, fontSize: 13, fontWeight: '600' },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.1,
    marginTop: 4,
  },

  preview: {
    height: BRIEF_PREVIEW_H,
    borderRadius: radii.control,
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
  // État d'absence : une PHRASE, pas une carte vide qui se lirait comme un bug.
  stateBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  stateText: { flex: 1, color: colors.gris, fontSize: 12.5, fontWeight: '600' },

  linkHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.gris, fontSize: 13, textDecorationLine: 'underline' },

  tactical: { color: colors.blanc, fontSize: 12.5, fontWeight: '600', marginTop: 2 },

  cta: {
    marginTop: 12,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Libellé NOIR sur chartreuse — jamais de chartreuse sur fond clair (charte).
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  micro: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
});
