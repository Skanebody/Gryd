/**
 * GRYD — E16 « MISSION RECOMMANDÉE » (`/map/missions/:missionId`, spec produit
 * UI/UX l.1009).
 *
 * Layout de la spec : carte · objectif · RAISON · métriques · difficulté · CTA
 * `PRÉPARER LA SORTIE`. Ce qui est rendu ici, et ce qui ne l'est pas, se justifie
 * ligne à ligne ci-dessous — parce que l'écart avec la planche est délibéré.
 *
 * ─── LA RAISON EST LE CŒUR DE CET ÉCRAN ─────────────────────────────────────
 * Une mission « recommandée » sans fait derrière est pire qu'une donnée
 * fabriquée : elle prétend EXPLIQUER. Les raisons possibles sont donc dérivées,
 * pures et testées (`features/mission/recommendedMission.ts`) de deux sources
 * RÉELLES et de rien d'autre : mes `hex_claims` (dont `decay_at`, tranché
 * serveur) et mon fix GPS. Quand aucun fait ne permet de recommander — base
 * neuve, joueur sans territoire — l'écran ne recommande RIEN et le DIT
 * (`recoEmpty*`). Il ne tire jamais une mission au hasard pour paraître vivant.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS ─────────────────────────────────────
 * pas connecté · lecture EN COURS · échec de lecture · vide. Ils viennent du
 * `status` publié par `useRealMissionCore` (élargi le 27/07/2026 pour cet
 * écran : la ligne mission de la Carte, elle, n'a que le droit de se taire —
 * un ÉCRAN, non). Sans backend (O1), l'échec ne propose PAS « Réessayer » :
 * un bouton qui échouerait toujours est un bouton mort.
 *
 * ─── CE QUE LA PLANCHE DEMANDE ET QUI N'EST PAS PEINT ────────────────────────
 * · DURÉE — supposerait une allure fixe. On ne connaît pas l'allure du jour.
 * · SURFACE POTENTIELLE — c'est le SERVEUR qui tranche, APRÈS la course
 *   (constitution §4). L'annoncer avant serait une promesse qu'il est seul à
 *   pouvoir tenir.
 * · DIFFICULTÉ — n'existerait que par des seuils de kilomètres inventés.
 * Ces trois absences reprennent une décision DÉJÀ prise et testée pour E05
 * (`features/map/zoneDecision.ts`, `briefMetricKeys`) : trois métriques
 * maximum, toutes sourcées. Ce qui est peint à la place a une source :
 * la distance MESURÉE par le routeur, les heures restantes de `decay_at`, et
 * l'aire RÉELLE de la zone menacée.
 *
 * ─── L'IDENTITÉ DE LA MISSION NE VOYAGE PAS EN CLAIR ────────────────────────
 * `missionId` est un digest opaque (`missionKey`) : §12 interdit qu'une adresse
 * — affichée, historisée, recopiable — porte une position, même la mienne.
 */
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, sizes, spacing, typography } from '@klaim/shared';
import type { LatLngPoint } from '../../../src/features/map/realAnchors';
import { StackScreen } from '../../../src/ui/StackScreen';
import { Button } from '../../../src/ui/Button';
import { SheetMetrics, type SheetMetric } from '../../../src/features/map/SheetMetrics';
import { areaStatParts, distanceStatParts, BRIEF_PREVIEW_H } from '../../../src/features/map/zoneDecision';
import { useMapActivity } from '../../../src/features/map/mapPref';
import { useRouteSuggestion } from '../../../src/features/route/useRouteSuggestion';
import {
  MissionLoopPreview,
  useMissionLoop,
} from '../../../src/features/mission/MissionLoopPreview';
import { useRealMission } from '../../../src/features/mission/useRealMission';
import {
  missionKey,
  parseMissionKey,
  recommendedMissionView,
  type MissionDropReason,
  type MissionReason,
  type RecommendedMissionView,
} from '../../../src/features/mission/recommendedMission';
import { C as M } from '../../../src/i18n/catalog/mission';
import { C as P } from '../../../src/i18n/catalog/prepare';
import { C as MAP } from '../../../src/i18n/catalog/map';
import { useLocale, useT } from '../../../src/i18n/store';
import { EVENTS, screen, track } from '../../../src/lib/analytics';
import { haptics } from '../../../src/lib/haptics';

/** Marges horizontales de `StackScreen.content` — la mini-carte occupe le reste. */
const SCREEN_H_PADDING = spacing.cardPadding;

/**
 * E17. Constante plutôt qu'un littéral de gabarit construit à la volée : c'est
 * ce que `scripts/audit-routes.mjs` sait reconnaître comme un LIEN, et donc ce
 * qui empêche l'écran de préparation d'être compté orphelin (un écran orphelin
 * est un écran mort dont le typecheck reste vert).
 */
const PREPARE_HREF = '/map/prepare';

export default function RecommendedMissionRoute() {
  const t = useT();
  const params = useLocalSearchParams<{ missionId?: string }>();
  const { activity } = useMapActivity();
  // La mission est RE-DÉRIVÉE ici, jamais transportée : c'est ce qui permet de
  // constater qu'elle s'est éteinte pendant qu'on la regardait.
  const { mission, status, mine, ego, reload } = useRealMission(activity);

  const opened = useMemo(() => parseMissionKey(params.missionId), [params.missionId]);

  const view = useMemo(
    () =>
      recommendedMissionView({
        status,
        mission,
        opened,
        now: new Date(),
        ego,
        mine,
      }),
    [status, mission, opened, ego, mine],
  );

  useEffect(() => {
    screen('map_mission_reco');
  }, []);

  /**
   * §18 — `mission_dropped` : le KPI inconfortable voulu par `events.ts`
   * (« combien de fois GRYD propose une mission qu'il retire ensuite »). UNE
   * fois par motif : un re-rendu ne doit pas gonfler le compteur, sinon le
   * chiffre le plus important de cet écran devient faux.
   */
  const droppedSentRef = useRef<MissionDropReason | null>(null);
  useEffect(() => {
    if (view.kind !== 'dropped') return;
    if (droppedSentRef.current === view.reason) return;
    droppedSentRef.current = view.reason;
    track(EVENTS.missionDropped, { reason: view.reason });
  }, [view]);

  return (
    <StackScreen title={t(M.screenTitle)} backHref="/(tabs)">
      <MissionBody view={view} onRetry={reload} ego={ego} />
    </StackScreen>
  );
}

function MissionBody({
  view,
  onRetry,
  ego,
}: {
  view: RecommendedMissionView;
  onRetry: () => void;
  /** Position RÉELLE de la dernière lecture — origine du tracé, `null` si aucune. */
  ego: LatLngPoint | null;
}) {
  const t = useT();
  switch (view.kind) {
    case 'signed-out':
      return <StateBlock body={t(M.recoSignedOut)} />;
    case 'loading':
      // Un chargement n'affirme RIEN sur le joueur : ni « aucune mission », ni
      // l'inverse. Il dit qu'il lit, et il est borné par le hook.
      return <StateBlock body={t(M.recoLoading)} busy />;
    case 'failed':
      return (
        <StateBlock
          title={t(M.recoFailedTitle)}
          body={t(M.recoFailedBody)}
          // Sans backend, « Réessayer » échouerait TOUJOURS : on ne le peint pas.
          action={view.retryable ? { label: t(M.recoRetry), onPress: onRetry } : undefined}
        />
      );
    case 'empty':
      return <StateBlock title={t(M.recoEmptyTitle)} body={t(M.recoEmptyBody)} />;
    case 'dropped':
      return <DroppedBlock reason={view.reason} />;
    case 'mission':
      return <LiveMission view={view} ego={ego} />;
  }
}

/** Spec l.1009 : « Une mission devenue impossible disparaît proprement AVEC
 *  EXPLICATION. » Le motif est celui que les faits ont prouvé — jamais un motif
 *  de remplacement. Aucun CTA : il n'y a plus rien à préparer ici. */
function DroppedBlock({ reason }: { reason: MissionDropReason }) {
  const t = useT();
  const BODY: Record<MissionDropReason, string> = {
    taken: t(M.droppedTaken),
    expired: t(M.droppedExpired),
    out_of_range: t(M.droppedOutOfRange),
    no_position: t(M.droppedNoPosition),
  };
  return (
    <View style={styles.block}>
      <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit>
        {t(M.droppedKicker)}
      </Text>
      <Text style={styles.body}>{BODY[reason]}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(M.droppedBackToMap)}
        hitSlop={8}
        onPress={() => {
          haptics.light();
          router.replace('/(tabs)');
        }}
        style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
      >
        <Text style={styles.link} numberOfLines={1}>
          {t(M.droppedBackToMap)}
        </Text>
      </Pressable>
    </View>
  );
}

/** États de lecture — une PHRASE, jamais un écran blanc ni un spinner nu. */
function StateBlock({
  title,
  body,
  busy,
  action,
}: {
  title?: string;
  body: string;
  busy?: boolean;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.block}>
      {title ? <Text style={styles.stateTitle}>{title}</Text> : null}
      <View style={styles.stateRow}>
        {busy ? <ActivityIndicator size="small" color={colors.gris} /> : null}
        <Text style={[styles.body, styles.stateBody]}>{body}</Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          onPress={action.onPress}
          style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
        >
          <Text style={styles.link} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** LA mission : carte réelle, objectif, raison dérivée, métriques sourcées, CTA. */
function LiveMission({
  view,
  ego,
}: {
  view: Extract<RecommendedMissionView, { kind: 'mission' }>;
  ego: LatLngPoint | null;
}) {
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { activity } = useMapActivity();
  const { suggestion } = useRouteSuggestion(activity);
  const { mission, reason } = view;
  const defend = mission.kind === 'defend_expiring' ? mission : null;

  const key = missionKey(mission) ?? 'mission';
  /**
   * L'ORIGINE DU TRACÉ EST LA POSITION DU JOUEUR, pas la cible. Une boucle
   * dessinée autour du territoire visé serait plus flatteuse et fausse : la
   * sortie démarre là où l'on est. Sans fix, on ne route rien et on le DIT
   * (état `no-position`) — jamais une boucle « d'illustration ».
   */
  const loop = useMissionLoop({
    ego,
    label: t(MAP.zoneFallback),
    targetKm: suggestion.km,
    intention: defend ? 'defendre' : 'conquerir',
    seedKey: key,
    activity,
  });

  const previewW = Math.max(120, winW - SCREEN_H_PADDING * 2);

  const REASON: Record<MissionReason, string> = {
    expiring: defend ? t(M.recoReasonExpiring, { h: defend.hoursLeft }) : t(M.recoReasonAdjacent),
    closest: t(M.recoReasonClosest),
    adjacent: t(M.recoReasonAdjacent),
  };

  // ── Métriques : trois AU PLUS, toutes sourcées, aucune cellule vide ────────
  const metrics: SheetMetric[] = [];
  if (loop.state === 'ready' && loop.km !== null) {
    const { value, unit } = distanceStatParts(loop.km, locale);
    metrics.push({ key: 'distance', value, unit, label: t(M.briefMetricDistance) });
  }
  if (defend) {
    metrics.push({
      key: 'hours',
      value: String(defend.hoursLeft),
      unit: 'h', // invariant du catalogue (unité compacte), jamais traduit
      label: t(M.recoMetricTimeLeft),
    });
    const area = areaStatParts(defend.areaM2 / 1_000_000, locale);
    metrics.push({
      key: 'area',
      value: area.value,
      unit: area.unit,
      label: t(M.recoMetricAtRisk),
    });
  }

  return (
    <View style={styles.block}>
      <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit>
        {t(M.recoKicker)}
      </Text>
      {/* OBJECTIF — le même vocabulaire que E17, pour que le joueur reconnaisse
          la même phrase d'un écran à l'autre (catalogue `prepare`). */}
      <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
        {defend ? t(P.objectiveDefendUnnamed) : t(P.objectiveConquerNearby)}
      </Text>
      {/* LA RAISON — dérivée de faits, jamais générique. */}
      <Text style={styles.reason}>{REASON[reason]}</Text>

      {/* CARTE — le VRAI tracé, ou l'état qui dit pourquoi il n'y en a pas. */}
      {loop.state === 'ready' && loop.line ? (
        <View
          accessibilityRole="image"
          accessibilityLabel={t(M.briefRouteA11y, {
            km: `${distanceStatParts(loop.km ?? 0, locale).value} km`,
          })}
        >
          <MissionLoopPreview line={loop.line} width={previewW} height={BRIEF_PREVIEW_H} />
        </View>
      ) : (
        <View style={styles.stateRow}>
          {loop.state === 'loading' ? <ActivityIndicator size="small" color={colors.gris} /> : null}
          <Text style={[styles.body, styles.stateBody]} numberOfLines={2}>
            {t(
              loop.state === 'no-position'
                ? M.briefRouteNoPosition
                : loop.state === 'loading'
                  ? M.briefRouteLoading
                  : M.briefRouteFailed,
            )}
          </Text>
        </View>
      )}
      {/* Relance MANUELLE du calcul (jamais un retry automatique) — un LIEN,
          jamais un second bouton plein (§A4 : le seul CTA reste chartreuse). */}
      {loop.state === 'failed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(M.briefRetry)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            loop.retry();
          }}
          style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
        >
          <Text style={styles.link} numberOfLines={1}>
            {t(M.briefRetry)}
          </Text>
        </Pressable>
      ) : null}

      <SheetMetrics metrics={metrics} />

      {/* CTA UNIQUE (§A4). Il ne LANCE rien : il ouvre E17. Le libellé de la
          spec le dit — « PRÉPARER LA SORTIE », pas « démarrer ». */}
      <View style={[styles.cta, { marginBottom: insets.bottom }]}>
        <Button
          label={t(M.recoPrepareCta)}
          accessibilityLabel={t(M.recoPrepareA11y)}
          analyticsId="mission_prepare"
          onPress={() =>
            router.push(
              `${PREPARE_HREF}?objective=${defend ? 'defend' : 'conquer'}&activity=${activity}`,
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Contenu posé DIRECTEMENT sur l'écran : aucune sous-card (§A « jamais de
  // card dans une card »).
  block: { gap: spacing.sm, paddingTop: spacing.sm },
  kicker: {
    ...typography.kicker,
    color: gameColors.crew,
  },
  title: { ...typography.title, color: colors.blanc },
  reason: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  stateTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
  },
  body: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  stateBody: { flex: 1 },
  linkHit: { minHeight: sizes.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.blanc, fontSize: fontSizes.sm, textDecorationLine: 'underline' },
  cta: { marginTop: spacing.md },
});
