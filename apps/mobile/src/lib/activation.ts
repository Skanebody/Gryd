/**
 * GRYD — le funnel d'ACTIVATION (§26) : t0 = inscription, activation = 1re capture.
 *
 * Deux faits persistés, et rien d'autre :
 *   · t0 (`gryd.activation.t0.v1`) — l'instant du 1er `signup_completed`. La
 *     PREMIÈRE inscription gagne : se déconnecter puis se reconnecter ne réarme
 *     pas t0 (sinon `time_to_first_capture` mesurerait la mauvaise origine).
 *   · ttfc envoyé (`gryd.activation.ttfc.v1`) — garde d'unicité : l'event ne part
 *     qu'UNE fois, à la 1re capture serveur-jugée, même sur plusieurs sessions.
 *
 * DÉFENSIF comme le wrapper analytics : AsyncStorage peut être absent ou lever
 * (localStorage verrouillé, quota) — la mesure ne doit JAMAIS pouvoir gêner
 * l'app. Toute erreur est avalée en silence (au pire, un event de moins).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngestRunResponse } from '@klaim/shared';
import { EVENTS, track } from './analytics';

const T0_KEY = 'gryd.activation.t0.v1';
const TTFC_SENT_KEY = 'gryd.activation.ttfc.v1';

/**
 * Pose t0 au 1er `signup_completed`, et seulement s'il n'existe pas déjà (la 1re
 * inscription est l'origine). Idempotent, silencieux en cas d'échec de stockage.
 */
export async function markSignupT0(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(T0_KEY);
    if (existing !== null) return; // t0 déjà posé — la 1re inscription gagne
    await AsyncStorage.setItem(T0_KEY, String(Date.now()));
  } catch {
    // stockage indisponible : au pire, pas de time_to_first_capture — jamais un crash
  }
}

/**
 * Émet `time_to_first_capture` UNE seule fois — à appeler au site d'une capture
 * RÉELLE (zone claimed/stolen/pioneer > 0, jugée par le serveur). No-op si t0
 * absent (capture sans inscription connue, ne rien inventer) ou déjà émis.
 */
export async function emitTimeToFirstCaptureOnce(): Promise<void> {
  try {
    const [t0Raw, sent] = await Promise.all([
      AsyncStorage.getItem(T0_KEY),
      AsyncStorage.getItem(TTFC_SENT_KEY),
    ]);
    if (sent !== null) return; // déjà mesuré
    if (t0Raw === null) return; // pas d'origine connue — on n'invente pas de délai
    const t0 = Number(t0Raw);
    if (!Number.isFinite(t0)) return;
    // Marque AVANT d'émettre : si l'émission déclenche un re-render/retry, l'event
    // ne peut pas partir deux fois (la garde est la source de vérité).
    await AsyncStorage.setItem(TTFC_SENT_KEY, '1');
    const seconds = Math.max(0, Math.round((Date.now() - t0) / 1000)); // clamp anti-dérive d'horloge
    track(EVENTS.timeToFirstCapture, { seconds });
  } catch {
    // stockage indisponible : la mesure saute, l'app continue
  }
}

/**
 * Émet les events du VERDICT de course (§8/§26) à partir de la réponse serveur :
 * claim_result, loop_closed / loop_almost_closed, time_to_first_capture (garde
 * d'unicité), et city_opened quand la course a ouvert une commune (pionnier).
 *
 * SOURCE UNIQUE, partagée par le chemin LIVE (useRealRun.uploadOrQueue) ET le
 * chemin de RENVOI en file (pendingUpload.retryPendingUpload). Sans ça, une
 * capture faite HORS-LIGNE — là où précisément les communes sont vierges — resend
 * plus tard et le serveur la crédite, mais le funnel n'en voyait RIEN. `source`
 * distingue les deux (live vs pending_retry). Un run part par UN seul chemin
 * (succès live ⇒ jamais mis en file), donc aucun double-comptage.
 *
 * NE REND RIEN : c'est de la mesure. L'affichage du résultat (setLastRunResult)
 * reste au chemin live — la célébration ne se rejoue pas à un renvoi tardif.
 */
export function emitRunResultAnalytics(
  result: IngestRunResponse,
  source: 'live' | 'pending_retry',
): void {
  track(EVENTS.claimResult, {
    new: result.hexes.claimed,
    stolen: result.hexes.stolen,
    defended: result.hexes.defended,
    pioneer: result.hexes.pioneer,
    status: result.status,
    rejected_reason: result.rejectReason ?? null,
    source,
  });
  if (result.loopClosed === true) {
    track(EVENTS.loopClosed, { enclosed_zones: result.enclosedZones ?? 0 });
  }
  if (result.openBoundary) {
    track(EVENTS.loopAlmostClosed, { missing_m: result.openBoundary.missingM });
  }
  if (result.hexes.claimed > 0 || result.hexes.stolen > 0 || result.hexes.pioneer > 0) {
    void emitTimeToFirstCaptureOnce();
  }
  if (result.communeOpened) {
    track(EVENTS.cityOpened, { created: true, source: 'run' });
  }
}
