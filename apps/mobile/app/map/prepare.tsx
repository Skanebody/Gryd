/**
 * GRYD — E17 « PRÉPARATION D'ACTIVITÉ » (`/map/prepare`, spec produit UI/UX
 * l.1028). Objectif de la spec, mot pour mot : « passer de l'intention à
 * l'activité en UN SEUL écran ».
 *
 * Layout de la planche, tenu ici : header (retour + discipline verrouillable) ·
 * grande ligne d'objectif recommandé · mini-carte de la cible · TROIS états
 * techniques · options repliées · CTA sticky `DÉMARRER`.
 *
 * ─── LES TROIS ÉTATS TECHNIQUES SONT DES MESURES, PAS DES DÉCORS ────────────
 * C'est le point où cet écran pouvait devenir un mensonge confortable : trois
 * pastilles vertes rassurent, et personne ne vérifie. Chaque ligne est donc
 * branchée sur une lecture RÉELLE, et sait dire qu'elle ne sait pas :
 *   · GPS      → `subscribePreflightAccuracy` (le MÊME capteur et les MÊMES
 *                seuils qu'E19 : deux écrans qui parlent du même signal à trente
 *                secondes d'intervalle ne peuvent pas en dire deux choses) ;
 *   · BATTERIE → `readBattery()` : `navigator.getBattery()` dans le navigateur,
 *                et « inconnu » sur l'appareil, où AUCUNE dépendance ne publie
 *                le niveau (pas d'`expo-battery` au 27/07/2026). L'ignorance est
 *                écrite, pas comblée ;
 *   · SYNCHRO  → `pendingUploadStatus()` : la profondeur de la file d'envoi
 *                RÉELLE. File illisible ⇒ « état inconnu », jamais « à jour ».
 * Toute la traduction mesure → ligne est PURE et testée
 * (`features/mission/prepareState.ts`).
 *
 * ─── CE QUE LA PLANCHE REPLIE ET QUI N'EXISTE PAS ───────────────────────────
 * Les options repliées de la spec sont trois : audio, partage temporaire crew,
 * plan de route. Une seule existe dans le dépôt (`/route-planner`) — les deux
 * autres n'ont ni module, ni table, ni dépendance. Peindre un contrôle qui
 * échoue toujours est un bouton mort (constitution §2) ; son absence, elle, ne
 * ment pas.
 *
 * ─── FRICTION ────────────────────────────────────────────────────────────────
 * Le CTA n'enregistre rien : il ouvre `/course-live`, qui acquiert le signal
 * puis décompte 3-2-1 avant le vrai départ (`RunPreflight`). La micro-ligne le
 * dit, parce que c'est ce qui va réellement se passer.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACTIVITIES,
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
  type Activity,
} from '@klaim/shared';
import { StackScreen } from '../../src/ui/StackScreen';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { ACTIVITY_LABELS, parseActivity } from '../../src/ui/activityLens';
import { useMapActivity } from '../../src/features/map/mapPref';
import { BRIEF_PREVIEW_H } from '../../src/features/map/zoneDecision';
import type { LatLngPoint } from '../../src/features/map/realAnchors';
import { plannerHref, plannerStartHref } from '../../src/features/route/startTargets';
import { useRouteSuggestion } from '../../src/features/route/useRouteSuggestion';
import { subscribePreflightAccuracy } from '../../src/features/run/gps/preflightProbe';
import type { PreflightSignal } from '../../src/features/run/gps/preflightSignal';
import {
  MissionLoopPreview,
  useMissionLoop,
} from '../../src/features/mission/MissionLoopPreview';
import { readBattery } from '../../src/features/mission/battery';
import { useRealMission } from '../../src/features/mission/useRealMission';
import {
  BATTERY_TONE,
  GPS_TONE,
  SYNC_TONE,
  batteryRowKey,
  defendAvailable,
  effectiveObjective,
  gpsRowKey,
  objectiveReasonKey,
  recommendedObjective,
  syncRow,
  type BatteryReading,
  type PrepareObjective,
  type QueueReading,
  type TechTone,
} from '../../src/features/mission/prepareState';
import { pendingUploadStatus } from '../../src/lib/pendingUpload';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { C as P } from '../../src/i18n/catalog/prepare';
import { C as M } from '../../src/i18n/catalog/mission';
import { C as MAP } from '../../src/i18n/catalog/map';
import { ACTIVITY_NAME } from '../../src/i18n/catalog/runGps';
import { useT } from '../../src/i18n/store';
import { EVENTS, screen, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';

const SCREEN_H_PADDING = spacing.cardPadding;

/** Couleur d'une ligne technique — par RÔLE (§C), et jamais seule porteuse de
 *  sens : chaque ligne écrit son état en toutes lettres à côté. */
const TONE_COLOR: Record<TechTone, string> = {
  ok: colors.chartreuse,
  warn: gameColors.warn,
  blocked: gameColors.danger,
  unknown: colors.gris,
};

export default function PrepareActivityRoute() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const params = useLocalSearchParams<{ objective?: string; activity?: string }>();
  const { session } = useSession();

  // ── Discipline : la lentille de la Carte est le POINT DE DÉPART, l'écran
  //    d'où l'on vient peut la déclarer, et le joueur tranche ici. ───────────
  const { activity: lensActivity } = useMapActivity();
  const declared = parseActivity(
    Array.isArray(params.activity) ? params.activity[0] : params.activity,
  );
  const [activity, setActivity] = useState<Activity>(declared ?? lensActivity);
  const [locked, setLocked] = useState(false);

  // ── La mission RÉELLE : elle fonde l'objectif recommandé et l'origine du
  //    tracé. Jamais un objectif par défaut arbitraire. ────────────────────────
  //
  // `status` EST LU (27/07/2026). Il ne l'était pas, et c'était le bug : sans
  // lui, l'écran ne peut pas distinguer « lecture aboutie et rien d'urgent » de
  // « je n'ai rien pu lire », qui arrivent tous deux avec `mission === null`.
  // La grande ligne d'OBJECTIF, elle, reste une PROPOSITION d'action (« va
  // prendre du terrain ») et non une affirmation sur le territoire : elle tient
  // dans les quatre états. C'est la RAISON en dessous qui affirmait, et c'est
  // elle qui passe désormais par `objectiveReasonKey`.
  const { mission, status: missionStatus, ego } = useRealMission(activity);
  const canDefend = defendAvailable(mission);
  const [chosen, setChosen] = useState<PrepareObjective | null>(
    params.objective === 'defend' || params.objective === 'conquer' ? params.objective : null,
  );
  const objective = effectiveObjective(chosen, mission);
  const recommended = recommendedObjective(mission);
  const reasonKey = objectiveReasonKey({ status: missionStatus, mission, objective });
  const [changeOpen, setChangeOpen] = useState(false);

  // ── Mini-carte de la cible : le VRAI tracé depuis MA position ─────────────
  const { suggestion } = useRouteSuggestion(activity);
  const loop = useMissionLoop({
    ego: ego as LatLngPoint | null,
    label: t(MAP.zoneFallback),
    targetKm: suggestion.km,
    intention: objective === 'defend' ? 'defendre' : 'conquerir',
    seedKey: `prepare-${objective}-${activity}`,
    activity,
  });

  // ── État technique 1/3 : GPS (capteur RÉEL, coupé au démontage) ───────────
  const [signal, setSignal] = useState<PreflightSignal>({ kind: 'idle' });
  useEffect(() => {
    setSignal({ kind: 'probing' });
    // Aucune INVITE système n'est ouverte par cet abonnement : sans permission
    // il échoue et rend `unavailable` (cf. `preflightProbe`). La boîte de
    // dialogue naît d'un geste, jamais de l'ouverture d'un écran.
    const stop = subscribePreflightAccuracy({
      onAccuracy: (accuracyM) => setSignal({ kind: 'measured', accuracyM }),
      onUnavailable: () => setSignal({ kind: 'unavailable' }),
    });
    return stop;
  }, []);

  // ── État technique 2/3 : batterie (mesure de plateforme, ou « inconnu ») ──
  const [battery, setBattery] = useState<BatteryReading>({ kind: 'unknown' });
  useEffect(() => {
    let cancelled = false;
    void readBattery().then((r) => {
      if (!cancelled) setBattery(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── État technique 3/3 : file d'envoi RÉELLE ─────────────────────────────
  const [queue, setQueue] = useState<QueueReading | null>(null);
  useEffect(() => {
    let cancelled = false;
    void pendingUploadStatus(null).then((status) => {
      if (cancelled) return;
      setQueue(status.readable ? { readable: true, depth: status.depth } : { readable: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [optionsOpen, setOptionsOpen] = useState(false);

  // §18 — l'écran s'est composé AVEC l'objectif qu'il recommande. Aucun nom de
  // zone ne part : « Défendre Saint-Rémy » se réduit ici à 'defend'.
  useEffect(() => {
    screen('activity_prepare');
    track(EVENTS.activityPrepareViewed, { objective: recommended });
    // Volontairement au MONTAGE seulement : cet event mesure l'ouverture, pas
    // les changements (que `activity_objective_changed` porte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeObjective = useCallback((next: PrepareObjective) => {
    haptics.light();
    setChosen(next);
    track(EVENTS.activityObjectiveChanged, { objective: next });
  }, []);

  const gpsKey = gpsRowKey(signal);
  const batteryKey = batteryRowKey(battery);
  const sync = syncRow({ backend: supabase !== null, signedIn: session !== null, queue });

  const previewW = Math.max(120, winW - SCREEN_H_PADDING * 2);

  const GPS_TEXT: Record<typeof gpsKey, string> = {
    ready: t(P.gpsReady),
    approximate: t(P.gpsApproximate),
    poor: t(P.gpsPoor),
    searching: t(P.gpsSearching),
    unavailable: t(P.gpsUnavailable),
  };
  const BATTERY_TEXT: Record<typeof batteryKey, string> = {
    unknown: t(P.batteryUnknown),
    ok: battery.kind === 'measured' ? t(P.batteryOk, { p: battery.percent }) : t(P.batteryUnknown),
    low: battery.kind === 'measured' ? t(P.batteryLow, { p: battery.percent }) : t(P.batteryUnknown),
    charging:
      battery.kind === 'measured'
        ? t(P.batteryCharging, { p: battery.percent })
        : t(P.batteryUnknown),
  };
  const SYNC_TEXT: Record<typeof sync.key, string> = {
    ready: t(P.syncReady),
    pending: t(P.syncPending, { n: sync.pending }),
    unknown: t(P.syncUnknown),
    'signed-out': t(P.syncSignedOut),
  };

  return (
    <StackScreen
      title={t(P.screenTitle)}
      backHref="/(tabs)"
      floating={
        /* CTA STICKY (spec l.1028) : hors du ScrollView, donc toujours sous le
           pouce. UNIQUE chartreuse de l'écran (§A4). */
        <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            label={t(P.startCta)}
            accessibilityLabel={`${t(P.startA11y)} — ${t(ACTIVITY_NAME[activity])}`}
            analyticsId="activity_start"
            /* L'OBJECTIF VOYAGE AVEC LE DÉPART, la discipline aussi
               (`plannerStartHref`, pur et testé) : c'est le même contrat que le
               planificateur et que le GO de la Carte. Écrire l'URL à la main ici
               serait la quatrième copie de la règle — celle qui diverge. */
            onPress={() =>
              router.push(
                plannerStartHref(objective === 'defend' ? 'defendre' : 'conquerir', activity),
              )
            }
          />
          {/* Microtexte FACTUEL : ce que le tap déclenche vraiment. */}
          <Text style={styles.micro} numberOfLines={2}>
            {t(P.startMicroCountdown)}
          </Text>
        </View>
      }
    >
      <View style={styles.body}>
        {/* ── Discipline verrouillable ─────────────────────────────────────── */}
        <View style={styles.disciplineRow}>
          <View style={styles.capsule}>
            {ACTIVITIES.map((a) => {
              const selected = a === activity;
              const label = (
                <Text
                  style={[styles.segLabel, selected && styles.segLabelOn]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {ACTIVITY_LABELS[a]}
                </Text>
              );
              const box = [styles.seg, selected && styles.segOn];
              // VERROUILLÉ : le contrôle reste AFFICHÉ (c'est l'information « ce
              // qui va être enregistré ») mais cesse d'être tappable — plutôt
              // qu'un bouton qui refuserait silencieusement.
              return locked ? (
                <View key={a} style={box}>
                  {label}
                </View>
              ) : (
                <Pressable
                  key={a}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(ACTIVITY_NAME[a])}
                  onPress={() => {
                    haptics.light();
                    setActivity(a);
                  }}
                  style={({ pressed }) => [...box, pressed && styles.pressed]}
                >
                  {label}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: locked }}
            accessibilityLabel={t(P.activityLockA11y)}
            hitSlop={8}
            onPress={() => {
              haptics.light();
              setLocked((l) => !l);
            }}
            style={({ pressed }) => [styles.lock, locked && styles.lockOn, pressed && styles.pressed]}
          >
            {/* `verrou` : l'icône de verrou de la charte (jamais un emoji ni un
                glyphe local). Noir sur chartreuse quand il est ACTIF — jamais
                l'inverse (charte : aucune chartreuse sur fond clair). */}
            <Icon name="verrou" size={iconSizes.sm} color={locked ? colors.noir : colors.gris} />
          </Pressable>
        </View>
        {locked ? (
          <Text style={styles.note} numberOfLines={2}>
            {t(P.activityLocked)}
          </Text>
        ) : null}

        {/* ── LA grande ligne d'objectif ───────────────────────────────────── */}
        <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit>
          {t(P.objectiveKicker)}
        </Text>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          {objective === 'defend' ? t(P.objectiveDefendUnnamed) : t(P.objectiveConquerNearby)}
        </Text>
        {/* POURQUOI — DÉRIVÉ d'un fait lu, une phrase, jamais un pavé. La
            branche vit dans `objectiveReasonKey` (pure, testée) : l'écran ne
            fait plus que choisir la clé. Aucune raison n'est écrite tant que la
            lecture des zones n'a pas abouti — cf. la clé `unknown`. */}
        <Text style={styles.reason} numberOfLines={2}>
          {reasonKey === 'expiring' && mission?.kind === 'defend_expiring'
            ? t(P.objectiveReasonExpiring, { h: mission.hoursLeft })
            : reasonKey === 'expand'
              ? t(P.objectiveReasonExpand)
              : reasonKey === 'first'
                ? t(P.objectiveReasonFirst)
                : t(P.objectiveReasonUnknown)}
        </Text>

        {/* « Changer » — un LIEN, jamais un second bouton plein (§A4). */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: changeOpen }}
          accessibilityLabel={t(P.changeA11y)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            setChangeOpen((o) => !o);
          }}
          style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
        >
          <Text style={styles.link} numberOfLines={1}>
            {t(P.change)}
          </Text>
        </Pressable>

        {changeOpen ? (
          <View style={styles.objectiveSwitch}>
            <ObjectiveSegment
              label={t(P.segConquer)}
              selected={objective === 'conquer'}
              recommendedLabel={recommended === 'conquer' ? t(P.recommendedBadge) : null}
              onPress={() => changeObjective('conquer')}
            />
            <ObjectiveSegment
              label={t(P.segDefend)}
              selected={objective === 'defend'}
              recommendedLabel={recommended === 'defend' ? t(P.recommendedBadge) : null}
              // Rien à défendre ⇒ le segment est AFFICHÉ mais pas tappable, et la
              // raison est écrite juste dessous. Un contrôle qui échouerait
              // toujours serait un bouton mort (constitution §2).
              onPress={canDefend ? () => changeObjective('defend') : null}
            />
          </View>
        ) : null}
        {changeOpen && !canDefend ? (
          <Text style={styles.note} numberOfLines={2}>
            {t(P.segDefendUnavailable)}
          </Text>
        ) : null}

        {/* ── Mini-carte de la cible ───────────────────────────────────────── */}
        {loop.state === 'ready' && loop.line ? (
          <MissionLoopPreview line={loop.line} width={previewW} height={BRIEF_PREVIEW_H} />
        ) : (
          <View style={styles.stateRow}>
            {loop.state === 'loading' ? (
              <ActivityIndicator size="small" color={colors.gris} />
            ) : null}
            <Text style={[styles.note, styles.stateBody]} numberOfLines={2}>
              {t(
                loop.state === 'no-position'
                  ? P.mapNoPosition
                  : loop.state === 'loading'
                    ? P.mapLoading
                    : P.mapFailed,
              )}
            </Text>
          </View>
        )}

        {/* ── LES TROIS ÉTATS TECHNIQUES ───────────────────────────────────── */}
        <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit>
          {t(P.techKicker)}
        </Text>
        <TechRow label={t(P.gpsLabel)} value={GPS_TEXT[gpsKey]} tone={GPS_TONE[gpsKey]} />
        {/* Ouvrir les réglages n'existe QUE sur l'appareil : sur le web, ce lien
            n'aurait aucune cible — on ne le peint donc pas. */}
        {gpsKey === 'unavailable' && Platform.OS !== 'web' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(P.gpsOpenSettings)}
            hitSlop={8}
            onPress={() => {
              haptics.light();
              void Linking.openSettings();
            }}
            style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
          >
            <Text style={styles.link} numberOfLines={1}>
              {t(P.gpsOpenSettings)}
            </Text>
          </Pressable>
        ) : null}
        <TechRow
          label={t(P.batteryLabel)}
          value={BATTERY_TEXT[batteryKey]}
          tone={BATTERY_TONE[batteryKey]}
        />
        <TechRow
          label={t(P.syncLabel)}
          value={SYNC_TEXT[sync.key]}
          tone={SYNC_TONE[sync.key]}
        />

        {/* ── Options REPLIÉES (une seule existe — cf. en-tête) ────────────── */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: optionsOpen }}
          accessibilityLabel={t(P.optionsToggleA11y)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            setOptionsOpen((o) => !o);
          }}
          style={({ pressed }) => [styles.optionsToggle, pressed && styles.pressed]}
        >
          <Text style={styles.link} numberOfLines={1}>
            {t(P.optionsToggle)}
          </Text>
          <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
        </Pressable>
        {optionsOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t(P.optionRoutePlan)} — ${t(M.missionPlanA11y)}`}
            onPress={() => {
              haptics.light();
              router.push(plannerHref(activity));
            }}
            style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
          >
            <View style={styles.optionText}>
              <Text style={styles.optionTitle} numberOfLines={1}>
                {t(P.optionRoutePlan)}
              </Text>
              <Text style={styles.note} numberOfLines={2}>
                {t(P.optionRoutePlanSub)}
              </Text>
            </View>
            <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
          </Pressable>
        ) : null}
      </View>
    </StackScreen>
  );
}

/** Un segment d'objectif. `onPress === null` ⇒ affiché, non tappable (la raison
 *  est écrite à côté) : jamais un contrôle qui échoue toujours. */
function ObjectiveSegment({
  label,
  selected,
  recommendedLabel,
  onPress,
}: {
  label: string;
  selected: boolean;
  recommendedLabel: string | null;
  onPress: (() => void) | null;
}) {
  const content = (
    <>
      <Text
        style={[styles.segLabel, selected && styles.segLabelOn]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
      {/* La recommandation reste VISIBLE après un changement (spec l.1028). */}
      {recommendedLabel ? (
        <Text style={styles.recoBadge} numberOfLines={1}>
          {recommendedLabel}
        </Text>
      ) : null}
    </>
  );
  const box = [styles.objectiveSeg, selected && styles.segOn, onPress === null && styles.segMuted];
  return onPress === null ? (
    <View style={box}>{content}</View>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [...box, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/** Une ligne technique : un libellé, un état EN TOUTES LETTRES, une pastille de
 *  rôle qui redouble le texte sans jamais le remplacer (§C). */
function TechRow({ label, value, tone }: { label: string; value: string; tone: TechTone }) {
  return (
    <View style={styles.techRow} accessibilityLabel={`${label} : ${value}`}>
      <View style={[styles.dot, { backgroundColor: TONE_COLOR[tone] }]} />
      <Text style={styles.techLabel} numberOfLines={1}>
        {label}
      </Text>
      {/* §A9 — l'état ne se tronque jamais : il tient sur deux lignes s'il faut. */}
      <Text style={styles.techValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Contenu posé DIRECTEMENT sur l'écran : aucune sous-card (§A).
  body: { gap: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.xxl },

  disciplineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  capsule: {
    flexDirection: 'row',
    backgroundColor: colors.carbone,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 3,
  },
  seg: {
    minHeight: sizes.touchTarget, // plancher tactile RÉEL (§A / a11y)
    minWidth: 84,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: {
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.blanc22,
  },
  segMuted: { opacity: 0.5 },
  segLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 1.2 },
  segLabelOn: { color: colors.blanc },
  lock: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  lockOn: { backgroundColor: colors.chartreuse, borderColor: colors.chartreuse },

  kicker: { ...typography.kicker, color: colors.gris, marginTop: spacing.sm },
  title: { ...typography.title, color: colors.blanc },
  reason: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },
  note: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.6 },

  linkHit: { minHeight: sizes.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.blanc, fontSize: fontSizes.sm, textDecorationLine: 'underline' },

  objectiveSwitch: { flexDirection: 'row', gap: spacing.xs },
  objectiveSeg: {
    flex: 1,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  recoBadge: {
    color: gameColors.crew,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },

  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
  },
  stateBody: { flex: 1 },

  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  techLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700', minWidth: 96 },
  techValue: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5 },

  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    marginTop: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.xs,
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },

  sticky: {
    position: 'absolute',
    left: SCREEN_H_PADDING,
    right: SCREEN_H_PADDING,
    bottom: 0,
    gap: spacing.xxs,
  },
  micro: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },
});
