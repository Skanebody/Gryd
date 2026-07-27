/**
 * GRYD — E27 « ANALYSE ET SYNCHRONISATION » (/course/analyse).
 * Spec : docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md l.1254-1268.
 *
 * L'écran qui tient entre la fin de l'activité (E26) et le Résultat (E29-E34) :
 * la trace de la sortie, les trois étapes de la synchronisation, et un message
 * franc si l'envoi est différé. La règle de la spec, reprise mot pour mot :
 * « L'utilisateur peut quitter. […] Ne jamais bloquer plusieurs minutes sur un
 * faux spinner. »
 *
 * ═══ C'EST L'ÉCRAN LE PLUS FACILE À TRUQUER DU JEU ══════════════════════════
 * Le joueur vient de courir, il attend, et il ne peut RIEN vérifier. Une barre
 * qui se remplit toute seule passerait inaperçue — et serait exactement le
 * mensonge que la constitution interdit. D'où la construction :
 *
 *  · CET ÉCRAN N'A AUCUNE HORLOGE. Pas un `setTimeout`, pas un `setInterval`,
 *    pas une `Animated` de progression, pas un pourcentage. Cherchez-en un : il
 *    n'y en a pas, et il n'a pas le droit d'en apparaître un.
 *  · IL NE DÉCIDE RIEN. Tout l'état vient de `analysisMachine.ts` (pur, testé
 *    Deno), qui ne bouge que sur un `SyncFact`. Les faits viennent de
 *    `observeSync.ts`, qui les LIT sur des sources réelles (file d'envoi
 *    différé, verdict serveur capturé, trace mesurée, présence d'un backend).
 *  · SI RIEN NE SE PASSE, RIEN NE BOUGE. C'est la propriété recherchée.
 *
 * ═══ LES QUATRE ÉTATS DE LA CONSTITUTION, TOUS DISTINCTS ════════════════════
 *  · lecture EN COURS  → `reading` local (avant la première observation) : on
 *    n'affirme RIEN du joueur, pas même « sécurisation en cours » ;
 *  · connecté mais vide → phase `no_run` (aucune sortie à analyser) ;
 *  · échec de chargement → phase `unreadable` (l'issue existe, on ne la lit pas) ;
 *  · pas de serveur     → phase `no_backend` (rien ne sera envoyé, et on le dit).
 * Et les trois échecs de synchronisation par-dessus, jamais confondus :
 * `deferred` (gardée, repartira) · `unstored` (pas même en file) · `server_error`
 * (panne) · `rejected` (le serveur a jugé).
 *
 * ═══ AUCUN BOUTON MORT ══════════════════════════════════════════════════════
 * « Réessayer » n'est peint QUE si une reprise peut changer quelque chose
 * (`canRetry`) — jamais sur un refus définitif (l'idempotence `clientRunId`
 * rendrait le même verdict), jamais sans backend. Et la reprise fait un VRAI
 * travail : elle draine la file (`retryPendingUpload`) et n'affiche que ce que
 * le rapport de drain prouve.
 *
 * ═══ QUITTER : DEUX PHRASES, PARCE QU'IL Y A DEUX RÉALITÉS ══════════════════
 * « on te prévient » n'est servi que si un token push est RÉELLEMENT enregistré
 * pour cet appareil (`storedPushToken()`, lecture locale, aucun réseau, aucune
 * demande de permission). Sinon : « le résultat t'attendra dans ton
 * historique » — ce que l'app tient sans personne.
 *
 * ═══ LE RELAIS TRAVERSE, IL NE SE RECONSTRUIT PAS ═══════════════════════════
 * `RealCourseLive` pose ici les paramètres de `courseResultParams`
 * (gps/resultHandoff.ts) et attend que E27 les remette à `/course-result`. Ils
 * sont transmis TELS QUELS via `analysisHandoff.ts` (pur, testé) : la
 * discipline vélo s'est déjà perdue une fois dans un objet littéral recopié à
 * la main, et intercaler un écran de plus rouvrait exactement cette porte.
 * Le drapeau `queued` sert AUSSI de fait : croisé avec la profondeur de la
 * file, il sépare enfin « en file » (repartira) de « pas même en file » — deux
 * situations que `finish()` réduit à un seul booléen (useRealRunCore.ts:506).
 *
 * ═══ ÉCARTS ASSUMÉS, ÉCRITS PLUTÔT QUE MASQUÉS ══════════════════════════════
 *  · SUR LE CHEMIN NOMINAL, L'ENVOI EST DÉJÀ FINI QUAND CET ÉCRAN S'OUVRE.
 *    `useRealRunCore.finish()` attend `uploadOrQueue` avant de rendre la main
 *    (useRealRunCore.ts:487) : E27 lit donc une issue DÉJÀ tranchée et ne verra
 *    pas la requête en vol. C'est un état honnête — l'écran montre le résultat
 *    réel au lieu de mimer une attente — mais les phases `uploading` /
 *    `analysing` ne s'observeront vraiment que le jour où la fin de course
 *    naviguera AVANT d'attendre le serveur. Rien ici ne simule cette attente.
 *  · L'ÉTAPE 3 N'EST JAMAIS VUE « ACTIVE » sur ce chemin : avec un seul
 *    aller-retour HTTP, le client n'a aucun accusé de réception intermédiaire,
 *    donc `upload` et `analyse` basculent ensemble à la réponse. Le fait
 *    `server_ack` existe pour un vrai accusé futur ; personne n'a le droit de
 *    l'émettre « pour faire joli » (cf. analysisMachine.ts).
 *  · AUCUNE NOTIFICATION NE PART ENCORE quand le joueur quitte : le rail push
 *    attend ses credentials (features/notifications/push.ts, statut
 *    `unavailable`). C'est précisément pourquoi la phrase de sortie est
 *    conditionnée à un token RÉELLEMENT enregistré.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Polyline } from 'react-native-svg';
import {
  colors,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { StackScreen } from '../../src/ui/StackScreen';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { useT } from '../../src/i18n/store';
import { C } from '../../src/i18n/catalog/analyse';
import { screen } from '../../src/lib/analytics';
import { storedPushToken } from '../../src/features/notifications/push';
import { getFinishedTrace } from '../../src/features/run/finishedTrace';
import { fitTracesToBox } from '../../src/features/map/projectTrace';
import { traceStyle } from '../../src/features/map/mapStyle';
import {
  ANALYSIS_STEPS,
  type AnalysisPhase,
  type AnalysisState,
  type AnalysisStepId,
  INITIAL_ANALYSIS_STATE,
  QUEUE_DEPTH_UNKNOWN,
  type StepStatus,
  canRetry,
  doneStepCount,
  isWorking,
  reduceAnalysisAll,
  stepStatuses,
  visibleSteps,
} from '../../src/features/run/analysis/analysisMachine';
import {
  type FinishHandoffHints,
  observeSync,
  runRealRetry,
} from '../../src/features/run/analysis/observeSync';
import {
  cameFromFinish,
  forwardableParams,
  queuedHintOf,
} from '../../src/features/run/analysis/analysisHandoff';
import { MIN_TRACE_POINTS } from '../../src/features/run/analysis/syncFacts';

// ─── Mesures de COMPOSITION (aucune règle de jeu : celles-ci vivent dans
//     game-rules.ts). Nommées plutôt que semées en littéraux dans le JSX. ────
/** Hauteur du bloc de trace. Assez grand pour reconnaître SA boucle d'un coup d'œil. */
const TRACE_H = 200;
/** Marge intérieure du cadrage : la boucle ne touche jamais le bord. */
const TRACE_PAD = 18;
/** Trait de la trace — casing sombre dessous, cœur chartreuse dessus (§B). */
const TRACE_CASING_W = 7;
const TRACE_CORE_W = 3.5;
/** Largeur de la viewBox SVG de la trace (le rendu, lui, fait 100 % de large). */
const TRACE_VIEWBOX_W = 320;
/** Diamètre de la pastille d'état d'une étape. */
const DOT = 12;

/** L'état de lecture LOCAL à l'écran — distinct de toute phase de la machine. */
type ReadState = 'reading' | 'read';

// ═══ PASTILLE D'ÉTAT D'UNE ÉTAPE ════════════════════════════════════════════
// Une couleur seule ne dit rien à un lecteur d'écran, et rien du tout à qui ne
// distingue pas le vert du gris : chaque étape porte AUSSI son état en toutes
// lettres (voir `stateLabelOf`). La pastille n'est que le repère visuel.

const DOT_COLOR: Readonly<Record<StepStatus, string>> = {
  pending: colors.grisLigne,
  active: colors.chartreuse,
  done: colors.chartreuse,
  waiting: gameColors.gold, // attendre n'est pas échouer : ambre, pas rouge
  failed: gameColors.danger,
  unavailable: colors.grisLigne,
  unknown: colors.gris,
};

function StepDot({ status }: { status: StepStatus }) {
  // `done` est PLEIN, `active` est un anneau : la différence se voit sans
  // couleur. Aucune animation — un point qui pulse suggérerait un travail.
  const filled = status === 'done' || status === 'waiting' || status === 'failed';
  return (
    <View
      style={[
        styles.dot,
        { borderColor: DOT_COLOR[status] },
        filled && { backgroundColor: DOT_COLOR[status] },
      ]}
    />
  );
}

// ═══ L'ÉCRAN ════════════════════════════════════════════════════════════════

export default function AnalyseScreen() {
  const t = useT();

  /**
   * LE RELAIS DE E26, TRANSMIS TEL QUEL. `RealCourseLive` pose ici les
   * paramètres de `courseResultParams` (gps/resultHandoff.ts) et compte sur cet
   * écran pour les faire suivre au Résultat. On ne les RECONSTRUIT pas : la
   * discipline vélo s'est déjà perdue une fois dans un objet littéral recopié à
   * la main, et c'est précisément pour ça que `resultHandoff.ts` existe. Ici,
   * pass-through intégral — cet écran n'a rien à dire sur la distance ni sur la
   * durée, il ne les affiche même pas.
   */
  const params = useLocalSearchParams();
  // Mémorisés sur la SÉRIALISATION des params, pas sur l'objet : `expo-router`
  // en rend un neuf à chaque rendu, et une dépendance dessus relancerait
  // l'observation en boucle — c'est-à-dire un écran qui « travaille » sans
  // qu'aucun travail n'ait lieu, exactement ce qu'on interdit ici.
  const paramsKey = JSON.stringify(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const forward = useMemo(() => forwardableParams(params), [paramsKey]);
  const hints = useMemo<FinishHandoffHints>(
    () => ({ fromFinish: cameFromFinish(params), queuedHint: queuedHintOf(params) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey],
  );

  const [read, setRead] = useState<ReadState>('reading');
  const [state, setState] = useState<AnalysisState>(INITIAL_ANALYSIS_STATE);
  const [retrying, setRetrying] = useState(false);
  /** Un token push est-il RÉELLEMENT enregistré ? `null` = pas encore lu. */
  const [canNotify, setCanNotify] = useState<boolean | null>(null);
  /** L'écran est-il encore monté ? (aucun setState après démontage.) */
  const alive = useRef(true);

  /** La trace MESURÉE. Lue une fois : elle ne change plus après la fin. */
  const [trace] = useState(() => getFinishedTrace());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ── PREMIÈRE OBSERVATION. Tant qu'elle n'a pas rendu, l'écran n'affirme
  //    RIEN : ni « sécurisation en cours », ni « aucune sortie ». Un chargement
  //    ne dit rien du joueur (constitution).
  useEffect(() => {
    void (async () => {
      const facts = await observeSync(hints);
      if (!alive.current) return;
      setState((prev) => reduceAnalysisAll(prev, facts));
      setRead('read');
    })();
  }, [hints]);

  // ── Capacité RÉELLE de notification (lecture locale, aucun réseau, aucune
  //    demande de permission — on ne profite pas d'un écran d'attente pour
  //    réclamer un accès système).
  useEffect(() => {
    void storedPushToken().then((token) => {
      if (alive.current) setCanNotify(token !== null);
    });
  }, []);

  // §18 — l'écran se déclare avec la phase RÉELLEMENT atteinte, pas avec son
  // ouverture : le funnel doit pouvoir compter les sorties parties en file.
  const settledPhase = read === 'read' ? state.phase : null;
  useEffect(() => {
    if (settledPhase !== null) screen('run_analysis', { phase: settledPhase });
  }, [settledPhase]);

  const onRetry = useCallback(() => {
    if (retrying) return;
    setRetrying(true);
    // La reprise fait un VRAI travail : elle draine la file. Les faits rendus
    // viennent du rapport de drain, jamais d'un compteur.
    void runRealRetry(hints)
      .then((facts) => {
        if (!alive.current) return;
        setState((prev) => reduceAnalysisAll(prev, facts));
      })
      .finally(() => {
        if (alive.current) setRetrying(false);
      });
  }, [retrying, hints]);

  const phase = state.phase;
  const steps = visibleSteps(phase);
  const drawable = trace.length >= MIN_TRACE_POINTS;

  return (
    <StackScreen title={t(C.title)} icon="gps" backHref="/(tabs)">
      {/* ── La trace de la sortie qui vient de finir. Rien si aucune géométrie
             réelle : jamais un cadre vide, jamais un tracé d'authoring. ─── */}
      {drawable && read === 'read' && phase !== 'no_run' ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t(C.a11yTrace)}
          style={styles.traceBox}
        >
          <FinishedTraceSvg points={trace} />
        </View>
      ) : null}

      {/* ── ÉTAT DE LECTURE : un chargement n'affirme rien sur le joueur. ─── */}
      {read === 'reading' ? (
        <Text style={styles.reading}>{t(C.reading)}</Text>
      ) : (
        <>
          {/* ── LES TROIS ÉTAPES. Chacune reflète un FAIT. ────────────────── */}
          {steps !== null ? (
            <View style={styles.steps}>
              {steps.map((id, i) => (
                <StepRow
                  key={id}
                  id={id}
                  index={i}
                  total={steps.length}
                  status={stepStatuses(phase)[id]}
                />
              ))}
            </View>
          ) : null}

          {/* ── LA SITUATION, EN UNE PHRASE. Une seule, jamais deux. ──────── */}
          <SituationBlock phase={phase} queueDepth={state.queueDepth} />

          {/* ── L'UNIQUE CTA CHARTREUSE (§A r.4) + une sortie discrète. ───── */}
          {phase === 'complete' ? (
            <Button
              label={t(C.seeResult)}
              onPress={() => router.replace({ pathname: '/course-result', params: forward })}
              analyticsId="analysis_see_result"
            />
          ) : canRetry(phase) ? (
            <>
              <Button
                label={t(retrying ? C.retryRunning : C.retry)}
                loading={retrying}
                onPress={onRetry}
                analyticsId="analysis_retry"
              />
              <Button
                label={t(C.leaveCta)}
                variant="ghost"
                onPress={() => router.replace('/(tabs)')}
              />
            </>
          ) : (
            <Button
              label={t(C.leaveCta)}
              onPress={() => router.replace('/(tabs)')}
              analyticsId="analysis_leave"
            />
          )}

          {/* ── LA PROMESSE DE SORTIE : celle que l'app tient VRAIMENT. ───── */}
          {isWorking(phase) || phase === 'deferred' ? (
            <Text style={styles.leaveNote}>
              {/* `null` = capacité pas encore lue : on ne promet rien du tout. */}
              {canNotify === null ? '' : t(canNotify ? C.leaveNotified : C.leaveSilent)}
            </Text>
          ) : null}

          {/* a11y : le compte d'étapes réellement faites, jamais un %. */}
          <Text
            accessibilityRole="text"
            style={styles.a11yCount}
          >
            {t(C.a11yStep, {
              n: doneStepCount(phase),
              total: ANALYSIS_STEPS.length,
              label: t(C.stateDone),
            })}
          </Text>
        </>
      )}
    </StackScreen>
  );
}

// ═══ UNE LIGNE D'ÉTAPE ══════════════════════════════════════════════════════

const STEP_LABEL: Readonly<
  Record<AnalysisStepId, { pending: typeof C.step1Pending; active: typeof C.step1Pending; done: typeof C.step1Pending }>
> = {
  secure: { pending: C.step1Pending, active: C.step1Active, done: C.step1Done },
  upload: { pending: C.step2Pending, active: C.step2Active, done: C.step2Done },
  analyse: { pending: C.step3Pending, active: C.step3Active, done: C.step3Done },
};

const STATE_LABEL: Readonly<Record<StepStatus, typeof C.statePending>> = {
  pending: C.statePending,
  active: C.stateActive,
  done: C.stateDone,
  waiting: C.stateWaiting,
  failed: C.stateFailed,
  unavailable: C.stateUnavailable,
  unknown: C.stateUnknown,
};

function StepRow({
  id,
  index,
  total,
  status,
}: {
  id: AnalysisStepId;
  index: number;
  total: number;
  status: StepStatus;
}) {
  const t = useT();
  // Le libellé long ne s'affiche que pour les deux états qui en ont un vrai :
  // « en cours » et « fait ». Tout le reste porte le nom COURT de l'étape, plus
  // son état en toutes lettres — jamais une phrase d'action qui n'a pas lieu.
  const entry = STEP_LABEL[id];
  const label = t(status === 'active' ? entry.active : status === 'done' ? entry.done : entry.pending);
  const stateWord = t(STATE_LABEL[status]);
  const muted = status === 'pending' || status === 'unavailable';
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t(C.a11yStep, { n: index + 1, total, label: `${label}, ${stateWord}` })}
      style={styles.stepRow}
    >
      <StepDot status={status} />
      <Text style={[styles.stepLabel, muted && styles.stepLabelMuted]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.stepState}>{stateWord}</Text>
    </View>
  );
}

// ═══ LA SITUATION EN UNE PHRASE ═════════════════════════════════════════════
// Une phase = un couple titre/corps, et un seul. Aucune phase ne partage sa
// copie avec une autre : c'est le pendant textuel de l'invariant « chaque phase
// a une signature d'étapes UNIQUE » verrouillé côté machine.

function SituationBlock({ phase, queueDepth }: { phase: AnalysisPhase; queueDepth: number }) {
  const t = useT();
  const copy = SITUATION[phase];
  if (copy === null) return null;
  return (
    <View style={styles.situation}>
      <View style={styles.situationHead}>
        <Icon name={copy.icon} size={16} color={copy.tone} />
        <Text style={[styles.situationTitle, { color: copy.tone }]}>{t(copy.title)}</Text>
      </View>
      <Text style={styles.situationBody}>{t(copy.body)}</Text>
      {/* La profondeur de file n'est affichée que si elle a été LUE. */}
      {phase === 'deferred' && queueDepth > 0 && queueDepth !== QUEUE_DEPTH_UNKNOWN ? (
        <Text style={styles.situationMeta}>{t(C.queuedDepth, { n: queueDepth })}</Text>
      ) : null}
    </View>
  );
}

interface SituationCopy {
  readonly title: typeof C.queuedTitle;
  readonly body: typeof C.queuedBody;
  readonly icon: 'sablier' | 'alerte' | 'info' | 'gps';
  readonly tone: string;
}

/**
 * `null` = les étapes suffisent, il n'y a rien à ajouter. Les phases EN VOL
 * n'ont volontairement pas de bloc : la ligne d'étape « en cours » dit déjà
 * tout, et une deuxième phrase au même endroit ferait dire deux fois la même
 * chose (§A r.1).
 */
const SITUATION: Readonly<Record<AnalysisPhase, SituationCopy | null>> = {
  securing: null,
  secured: null,
  uploading: null,
  analysing: null,
  complete: null,
  deferred: { title: C.queuedTitle, body: C.queuedBody, icon: 'sablier', tone: gameColors.gold },
  unstored: {
    title: C.unstoredTitle,
    body: C.unstoredBody,
    icon: 'alerte',
    tone: gameColors.danger,
  },
  server_error: {
    title: C.failedTitle,
    body: C.failedBody,
    icon: 'alerte',
    tone: gameColors.danger,
  },
  rejected: { title: C.rejectedTitle, body: C.rejectedBody, icon: 'info', tone: colors.gris },
  no_backend: {
    title: C.noBackendTitle,
    body: C.noBackendBody,
    icon: 'info',
    tone: colors.gris,
  },
  no_run: { title: C.noRunTitle, body: C.noRunBody, icon: 'info', tone: colors.gris },
  unreadable: {
    title: C.unreadableTitle,
    body: C.unreadableBody,
    icon: 'alerte',
    tone: gameColors.gold,
  },
};

// ═══ LA TRACE MESURÉE ═══════════════════════════════════════════════════════
// SVG statique. AUCUNE animation de dessin ici, volontairement : sur cet écran
// une plume qui avance serait lue comme « ça progresse », alors qu'elle ne
// mesurerait que le temps. Le dessin progressif appartient au Résultat (E29+),
// où il célèbre un fait déjà acquis.

function FinishedTraceSvg({ points }: { points: readonly { lat: number; lng: number }[] }) {
  const proj = fitTracesToBox([points], TRACE_VIEWBOX_W, TRACE_H, TRACE_PAD);
  const line = proj.points(points);
  const start = proj.project(points[0] as { lat: number; lng: number });
  const end = proj.project(points[points.length - 1] as { lat: number; lng: number });
  return (
    <Svg width="100%" height={TRACE_H} viewBox={`0 0 ${TRACE_VIEWBOX_W} ${TRACE_H}`}>
      <Polyline
        points={line}
        fill="none"
        stroke={traceStyle.casing}
        strokeWidth={TRACE_CASING_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={line}
        fill="none"
        stroke={traceStyle.core}
        strokeWidth={TRACE_CORE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Départ et arrivée : sur une boucle fermée, ils se superposent — la
          fermeture SE VOIT, sans qu'aucun texte ne l'affirme. */}
      <Circle cx={start.x} cy={start.y} r={4} fill={colors.noir} stroke={traceStyle.core} strokeWidth={2} />
      <Circle cx={end.x} cy={end.y} r={4} fill={traceStyle.core} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  traceBox: {
    height: TRACE_H,
    borderRadius: radii.card,
    backgroundColor: colors.carbone,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  reading: {
    ...typography.body,
    color: colors.gris,
    paddingVertical: spacing.lg,
  },
  steps: {
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // Plancher tactile RÉEL même si la ligne n'est pas tappable : la liste doit
    // rester lisible et aérée, et le gabarit ne change pas si elle le devient.
    minHeight: sizes.touchTarget,
    gap: spacing.md,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
  },
  stepLabel: {
    ...typography.body,
    color: colors.blanc,
    flex: 1,
  },
  stepLabelMuted: {
    color: colors.gris,
  },
  stepState: {
    ...typography.meta,
    color: colors.gris,
  },
  situation: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  situationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  situationTitle: {
    ...typography.cardTitle,
  },
  situationBody: {
    ...typography.body,
    color: colors.gris,
  },
  situationMeta: {
    ...typography.meta,
    color: colors.grisFaible,
  },
  leaveNote: {
    ...typography.meta,
    color: colors.gris,
    marginTop: spacing.md,
  },
  a11yCount: {
    ...typography.meta,
    color: colors.grisFaible,
    marginTop: spacing.md,
    fontSize: fontSizes.xs,
  },
});
