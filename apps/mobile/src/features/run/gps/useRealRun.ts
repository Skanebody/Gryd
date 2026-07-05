/**
 * GRYD — useRealRun (NATIF) : orchestration du tracking réel (AMENDEMENT-15 §2).
 * Variante .web.ts = stub simulation (le preview web reste la démo intacte).
 *
 * GO-first (AMENDEMENT-14) :
 *  - permission foreground demandée AU PREMIER GO (l'arrivée sur cet écran) ;
 *  - refus / localisation coupée → simulation démo + UNE phrase, jamais bloquant ;
 *  - permission background demandée UNIQUEMENT au retour d'une mise en
 *    arrière-plan pendant la course, avec rationale une phrase ;
 *  - background refusé → « Course enregistrée quand l'app est ouverte. »
 *
 * Vie privée : la trace ne quitte l'appareil QUE dans le payload ingest_run de
 * fin de course (session réelle) — zéro position live publique.
 *
 * Reprise après kill : buffer runStore (flush périodique, run_autosave §8) +
 * file background → RestoreRunCard (reprendre / enregistrer), jamais de course
 * perdue en silence. Pendant qu'une reprise ATTEND une décision, la course
 * courante est flushée sous sa clé dédiée (CURRENT) : un 2ᵉ kill ne perd
 * jamais la nouvelle course.
 *
 * Fin de course hors-ligne (AMENDEMENT-15 §2) : l'envoi ingest_run raté met le
 * payload en file (pendingUpload, idempotent par clientRunId) — renvoyé
 * silencieusement au prochain lancement et à la prochaine fin de course.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LocationSubscription } from 'expo-location';
import * as Crypto from 'expo-crypto';
import type { IngestRunRequest } from '@klaim/shared';
import { EVENTS, track } from '../../../lib/analytics';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../../lib/session';
import { queuePendingUpload, retryPendingUpload } from '../../../lib/pendingUpload';
import {
  clearActiveRun,
  clearCurrentRun,
  drainBackgroundFixes,
  loadActiveRun,
  loadCurrentRun,
  saveActiveRun,
  saveCurrentRun,
  type StoredRun,
} from '../../../lib/runStore';
import type { LiveRunMode } from '../simulation';
import {
  checkBackgroundGranted,
  checkForegroundPermission,
  hasLocationServices,
  openLocationSettings,
  requestBackgroundPermission,
  requestForegroundPermission,
  setBackgroundFixListener,
  startBackgroundUpdates,
  stopBackgroundUpdates,
  watchPosition,
} from './provider';
import { RunTracker, type TrackerSnapshot } from './tracker';
import type { RealRunGate } from './gateTypes';

// Cadences de PRÉSENTATION/robustesse (pas des règles de jeu — les règles GPS
// vivent dans game-rules.ts et sont consommées par le moteur/le provider).
/** Rafraîchissement UI du snapshot (ms). */
const UI_TICK_MS = 1_000;
/** Flush du buffer AsyncStorage tous les N ticks (~30 s — run_autosave §8). */
const FLUSH_EVERY_TICKS = 30;
/** Re-vérification de la permission (autorisation coupée en course) tous les N ticks. */
const PERMISSION_CHECK_EVERY_TICKS = 10;

/** Textes FR courts du mode dégradé (une phrase, anti-shame, jamais bloquant). */
const NOTICE_DENIED =
  'GPS non autorisé — course démo, rien n’est enregistré. Active la position dans Réglages pour capturer.';
const NOTICE_SERVICES_OFF =
  'Localisation du téléphone coupée — course démo. Active-la pour capturer tes zones.';

export function useRealRun(mode: LiveRunMode): RealRunGate {
  const { session } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const trackerRef = useRef<RunTracker | null>(null);
  const watchRef = useRef<LocationSubscription | null>(null);
  const finishedRef = useRef(false);
  const bgGrantedRef = useRef(false);
  const bgAskedRef = useRef(false);
  const wentBackgroundRef = useRef(false);
  const pendingStoredRef = useRef<StoredRun | null>(null);

  const [kind, setKind] = useState<'starting' | 'simulation' | 'real'>('starting');
  const [notice, setNotice] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TrackerSnapshot | null>(null);
  const [bgPrompt, setBgPrompt] = useState<'hidden' | 'offer' | 'denied'>('hidden');
  const [restoreDistanceM, setRestoreDistanceM] = useState<number | null>(null);
  const [permissionRevoked, setPermissionRevoked] = useState(false);

  /**
   * Persiste l'état courant. Tant qu'une reprise « Course interrompue
   * retrouvée » attend une décision, la clé ACTIVE appartient à l'ANCIENNE
   * course : la course courante est flushée sous sa clé dédiée (CURRENT) —
   * un 2ᵉ kill ne perd JAMAIS la nouvelle course.
   */
  const flush = useCallback(async () => {
    const t = trackerRef.current;
    if (t === null || finishedRef.current) return;
    const run: StoredRun = {
      runId: t.runId,
      mode: t.mode,
      startedAt: t.startedAt,
      fixes: [...t.rawFixes],
      userPausedMs: t.userPausedMs,
    };
    if (pendingStoredRef.current !== null) await saveCurrentRun(run);
    else await saveActiveRun(run);
  }, []);

  /**
   * Envoi d'un payload de fin de course (AMENDEMENT-15 §2) :
   *  - 'sent'   : ingest_run a répondu sans erreur ;
   *  - 'queued' : hors-ligne/erreur → payload en file (pendingUpload, slot
   *               unique MVP — DISCOVERY), renvoyé silencieusement plus tard ;
   *  - 'lost'   : stockage indisponible (l'appelant garde son dernier filet) ;
   *  - 'none'   : pas de backend/session (flux démo) — aucun envoi attendu.
   */
  const uploadOrQueue = useCallback(
    async (payload: IngestRunRequest): Promise<'sent' | 'queued' | 'lost' | 'none'> => {
      if (supabase === null || sessionRef.current === null) return 'none';
      try {
        const { error } = await supabase.functions.invoke('ingest_run', { body: payload });
        if (!error) return 'sent';
      } catch {
        // Hors-ligne/réseau coupé net → file ci-dessous.
      }
      return (await queuePendingUpload(payload)) ? 'queued' : 'lost';
    },
    [],
  );

  const stopSensors = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setBackgroundFixListener(null);
    void stopBackgroundUpdates();
  }, []);

  /** Branche la source de fixes : tâche background si « Toujours », sinon watch. */
  const startSensors = useCallback(async () => {
    const onFixes = (fixes: Parameters<RunTracker['addFixes']>[0]) =>
      trackerRef.current?.addFixes(fixes);
    if (bgGrantedRef.current) {
      setBackgroundFixListener((fixes) => onFixes(fixes));
      await startBackgroundUpdates();
    } else {
      watchRef.current = await watchPosition((fix) => onFixes([fix]));
    }
  }, []);

  // ─── Démarrage GO-first : permission → restauration → capteurs ────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      let perm = await checkForegroundPermission();
      if (perm.status !== 'granted') {
        perm = await requestForegroundPermission();
        track(EVENTS.permissionLocation, { result: perm.status });
      }
      if (!alive) return;
      if (perm.status !== 'granted') {
        setNotice(NOTICE_DENIED);
        setKind('simulation');
        return;
      }
      if (!(await hasLocationServices())) {
        if (!alive) return;
        setNotice(NOTICE_SERVICES_OFF);
        setKind('simulation');
        return;
      }

      // Course interrompue (kill) : proposée en reprise, la nouvelle course
      // démarre quand même tout de suite (GO-first, choix non bloquant).
      let stored = await loadActiveRun();
      // 2ᵉ kill pendant qu'une reprise attendait : la course la plus récente a
      // été flushée sous la clé CURRENT (jamais perdue). Elle devient LA course
      // proposée en reprise ; l'ancienne — déjà proposée une fois — est
      // clôturée proprement (payload idempotent envoyé ou mis en file, jamais
      // perdue en silence, jamais re-proposée à l'infini).
      const orphan = await loadCurrentRun();
      if (!alive) return;
      if (orphan !== null && orphan.fixes.length > 1) {
        if (stored !== null && stored.fixes.length > 1 && stored.runId !== orphan.runId) {
          const closer = new RunTracker({ ...stored, initialFixes: stored.fixes });
          closer.finish(Date.now());
          await uploadOrQueue(closer.buildPayload());
        }
        stored = orphan;
        await saveActiveRun(orphan); // l'orpheline prend la clé de reprise
        await clearCurrentRun();
        if (!alive) return;
      }
      if (stored !== null && stored.fixes.length > 1) {
        pendingStoredRef.current = stored;
        const probe = new RunTracker({ ...stored, initialFixes: stored.fixes });
        setRestoreDistanceM(probe.snapshot(Date.now()).distanceM);
      }

      const tracker = new RunTracker({
        runId: Crypto.randomUUID(),
        mode,
        startedAt: Date.now(),
      });
      trackerRef.current = tracker;
      // Podomètre (AMENDEMENT-15 §2) : stepCount → motionTrust §3.2 côté
      // serveur. Guardé isAvailableAsync — no-op web/simulateur/sans capteur.
      void tracker.startPedometer();
      track(EVENTS.runStart, { source: 'gps', mode });

      bgGrantedRef.current = await checkBackgroundGranted();
      if (!alive) return;
      try {
        await startSensors();
      } catch {
        // Capteur indisponible (rare) : états honnêtes — signal « lost » à l'écran.
      }
      if (!alive) return;
      setSnapshot(tracker.snapshot(Date.now()));
      setKind('real');
      void flush();
    })();
    return () => {
      alive = false;
      stopSensors();
      trackerRef.current?.stopPedometer();
      // Pas de clearActiveRun ici : quitter l'écran sans terminer laisse le
      // buffer en place → proposé en reprise au prochain GO (jamais perdu).
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- démarrage unique (mode figé au GO)
  }, []);

  // ─── Tick UI + flush périodique + re-check permission ─────────────────────
  useEffect(() => {
    if (kind !== 'real') return;
    let tick = 0;
    const id = setInterval(() => {
      const t = trackerRef.current;
      if (t === null || finishedRef.current) return;
      tick++;
      setSnapshot(t.snapshot(Date.now()));
      if (tick % FLUSH_EVERY_TICKS === 0) {
        void flush().then(() => track(EVENTS.runAutosave, { points: t.rawFixes.length }));
      }
      if (tick % PERMISSION_CHECK_EVERY_TICKS === 0) {
        void checkForegroundPermission().then((p) => {
          setPermissionRevoked(p.status !== 'granted');
        });
      }
    }, UI_TICK_MS);
    return () => clearInterval(id);
  }, [kind, flush]);

  // ─── Passage en arrière-plan : rationale au RETOUR (progressif, GO-first) ─
  useEffect(() => {
    if (kind !== 'real') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (finishedRef.current) return;
      if (state === 'background') {
        wentBackgroundRef.current = true;
        void flush(); // photo avant un éventuel kill OS
      } else if (
        state === 'active' &&
        wentBackgroundRef.current &&
        !bgGrantedRef.current &&
        !bgAskedRef.current
      ) {
        setBgPrompt('offer');
      }
    });
    return () => sub.remove();
  }, [kind, flush]);

  // ─── Actions exposées à l'écran ────────────────────────────────────────────
  const allowBackground = useCallback(() => {
    bgAskedRef.current = true;
    void (async () => {
      const granted = await requestBackgroundPermission();
      track(EVENTS.permissionLocation, {
        result: granted ? 'background_granted' : 'background_denied',
      });
      if (granted) {
        bgGrantedRef.current = true;
        watchRef.current?.remove();
        watchRef.current = null;
        await startSensors();
        setBgPrompt('hidden');
      } else {
        setBgPrompt('denied');
      }
    })();
  }, [startSensors]);

  const dismissBackground = useCallback(() => {
    bgAskedRef.current = true;
    setBgPrompt('hidden');
  }, []);

  const togglePause = useCallback(() => {
    const t = trackerRef.current;
    if (t === null) return;
    const now = Date.now();
    if (t.snapshot(now).phase === 'paused-user') t.resumeUser(now);
    else t.pauseUser(now);
    setSnapshot(t.snapshot(now));
  }, []);

  /** Reprise de la course interrompue : fusion trace stockée + file background + course courante. */
  const resumeStored = useCallback(() => {
    const stored = pendingStoredRef.current;
    const current = trackerRef.current;
    if (stored === null || current === null) return;
    void (async () => {
      const bg = await drainBackgroundFixes();
      current.stopPedometer();
      trackerRef.current = new RunTracker({
        runId: stored.runId, // idempotence : on reste LA même course côté serveur
        mode: stored.mode,
        startedAt: stored.startedAt,
        initialFixes: [...stored.fixes, ...bg, ...current.rawFixes],
        userPausedMs: stored.userPausedMs,
        initialSteps: current.stepCount, // cumul conservé à la fusion
      });
      void trackerRef.current.startPedometer();
      pendingStoredRef.current = null;
      setRestoreDistanceM(null);
      await clearCurrentRun(); // la sauvegarde CURRENT est fusionnée → obsolète
      setSnapshot(trackerRef.current.snapshot(Date.now()));
      await flush();
    })();
  }, [flush]);

  /** Clôture propre de la course interrompue : payload envoyé (ou mis en file) si session réelle. */
  const discardStored = useCallback(() => {
    const stored = pendingStoredRef.current;
    if (stored === null) return;
    void (async () => {
      const bg = await drainBackgroundFixes();
      const closer = new RunTracker({ ...stored, initialFixes: [...stored.fixes, ...bg] });
      closer.finish(Date.now());
      // Hors-ligne : payload en file (idempotent) — la course clôturée
      // n'écrase jamais la course EN COURS et n'est jamais perdue en silence.
      await uploadOrQueue(closer.buildPayload());
      await clearActiveRun();
      pendingStoredRef.current = null;
      setRestoreDistanceM(null);
      await clearCurrentRun(); // la course courante repasse sur la clé ACTIVE
      await flush(); // la course courante reprend la main sur le buffer
    })();
  }, [flush, uploadOrQueue]);

  const finish = useCallback(async (): Promise<{
    distanceM: number;
    durationS: number;
    uploadQueued: boolean;
  }> => {
    const t = trackerRef.current;
    if (t === null || finishedRef.current) {
      return { distanceM: 0, durationS: 0, uploadQueued: false };
    }
    finishedRef.current = true;
    const now = Date.now();
    t.finish(now); // stoppe aussi le podomètre
    stopSensors();
    const snap = t.snapshot(now);
    track(EVENTS.runComplete, {
      distance: Math.round(snap.distanceM),
      duration: Math.round(snap.activeS),
      source: 'gps',
    });
    // Le VRAI payload part vers ingest_run (seul juge) si session réelle —
    // sinon flux démo actuel (aucun envoi). Idempotent par clientRunId.
    // Hors-ligne : le payload est mis en FILE (jamais purgé sans être à
    // l'abri), renvoyé silencieusement au prochain lancement/fin de course.
    const upload = await uploadOrQueue(t.buildPayload());
    if (upload === 'sent') {
      // Une course précédente attend peut-être encore son envoi : on en profite.
      void retryPendingUpload();
    }
    // Purge des clés de CETTE course — sauf si le payload n'est NULLE PART
    // ailleurs ('lost' : stockage KO, le buffer reste le dernier filet).
    if (upload !== 'lost') {
      await clearCurrentRun();
      // Une course interrompue encore en attente de choix garde son buffer :
      // elle sera re-proposée au prochain GO (jamais effacée sans décision).
      if (pendingStoredRef.current === null) await clearActiveRun();
    }
    return {
      distanceM: snap.distanceM,
      durationS: snap.activeS,
      // Message discret « Course enregistrée — envoi dès que possible » —
      // anti-shame, jamais bloquant.
      uploadQueued: upload === 'queued' || upload === 'lost',
    };
  }, [stopSensors, uploadOrQueue]);

  if (kind === 'starting') return { kind: 'starting' };
  if (kind === 'simulation') return { kind: 'simulation', notice };

  const t = trackerRef.current;
  // snapshot/tracker toujours posés quand kind === 'real'
  if (t === null || snapshot === null) return { kind: 'starting' };
  return {
    kind: 'real',
    run: {
      effectiveMode: t.mode,
      snapshot,
      approxLocation: snapshot.approxLocationSuspected,
      permissionRevoked,
      bgPrompt,
      restore:
        restoreDistanceM !== null
          ? { distanceM: restoreDistanceM, resume: resumeStored, discard: discardStored }
          : null,
      openSettings: openLocationSettings,
      allowBackground,
      dismissBackground,
      togglePause,
      finish,
    },
  };
}
