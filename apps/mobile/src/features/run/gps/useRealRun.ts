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
 * perdue en silence.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LocationSubscription } from 'expo-location';
import * as Crypto from 'expo-crypto';
import { EVENTS, track } from '../../../lib/analytics';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../../lib/session';
import {
  clearActiveRun,
  drainBackgroundFixes,
  loadActiveRun,
  saveActiveRun,
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

  /** Persiste l'état courant (jamais tant qu'une reprise est en attente). */
  const flush = useCallback(async () => {
    const t = trackerRef.current;
    if (t === null || pendingStoredRef.current !== null || finishedRef.current) return;
    await saveActiveRun({
      runId: t.runId,
      mode: t.mode,
      startedAt: t.startedAt,
      fixes: [...t.rawFixes],
      userPausedMs: t.userPausedMs,
    });
  }, []);

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
      const stored = await loadActiveRun();
      if (!alive) return;
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
      trackerRef.current = new RunTracker({
        runId: stored.runId, // idempotence : on reste LA même course côté serveur
        mode: stored.mode,
        startedAt: stored.startedAt,
        initialFixes: [...stored.fixes, ...bg, ...current.rawFixes],
        userPausedMs: stored.userPausedMs,
      });
      pendingStoredRef.current = null;
      setRestoreDistanceM(null);
      setSnapshot(trackerRef.current.snapshot(Date.now()));
      await flush();
    })();
  }, [flush]);

  /** Clôture propre de la course interrompue : payload envoyé si session réelle. */
  const discardStored = useCallback(() => {
    const stored = pendingStoredRef.current;
    if (stored === null) return;
    void (async () => {
      const bg = await drainBackgroundFixes();
      const closer = new RunTracker({ ...stored, initialFixes: [...stored.fixes, ...bg] });
      closer.finish(Date.now());
      if (supabase !== null && sessionRef.current !== null) {
        try {
          await supabase.functions.invoke('ingest_run', { body: closer.buildPayload() });
        } catch {
          // Hors-ligne : la course clôturée n'écrase jamais la course EN COURS.
        }
      }
      await clearActiveRun();
      pendingStoredRef.current = null;
      setRestoreDistanceM(null);
      await flush(); // la course courante reprend la main sur le buffer
    })();
  }, [flush]);

  const finish = useCallback(async (): Promise<{ distanceM: number; durationS: number }> => {
    const t = trackerRef.current;
    if (t === null || finishedRef.current) return { distanceM: 0, durationS: 0 };
    finishedRef.current = true;
    const now = Date.now();
    t.finish(now);
    stopSensors();
    const snap = t.snapshot(now);
    track(EVENTS.runComplete, {
      distance: Math.round(snap.distanceM),
      duration: Math.round(snap.activeS),
      source: 'gps',
    });
    // Le VRAI payload part vers ingest_run (seul juge) si session réelle —
    // sinon flux démo actuel (aucun envoi). Idempotent par clientRunId.
    if (supabase !== null && sessionRef.current !== null) {
      try {
        await supabase.functions.invoke('ingest_run', { body: t.buildPayload() });
      } catch {
        // Hors-ligne/erreur : on n'a jamais bloqué une fin de course (TODO O8 :
        // file de retry offline en phase suivante — le runId reste idempotent).
      }
    }
    // Une course interrompue encore en attente de choix garde son buffer :
    // elle sera re-proposée au prochain GO (jamais effacée sans décision).
    if (pendingStoredRef.current === null) await clearActiveRun();
    return { distanceM: snap.distanceM, durationS: snap.activeS };
  }, [stopSensors]);

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
