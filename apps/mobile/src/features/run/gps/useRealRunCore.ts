/**
 * GRYD — CŒUR de la course réelle (AMENDEMENT-15 §2), commun à toutes les
 * plateformes. Extrait de `useRealRun.ts` le 21/07/2026 : la seule chose qui
 * changeait entre iPhone et navigateur était la SOURCE DE POSITION, pas
 * l'orchestration. Elle vit désormais derrière `RunLocationAdapter` — le reste
 * (permission, tracker, autosave, reprise après kill, ingest_run, hors-ligne)
 * est écrit UNE fois et se comporte à l'identique partout.
 *
 * Conséquence directe : sur localhost, la boucle GO → course-live →
 * course-result → /partage se déroule pour de vrai, avec de VRAIES positions
 * (`navigator.geolocation`). Rien n'est simulé ; quand le capteur ne donne
 * rien, l'écran le dit et n'enregistre rien.
 *
 * GO-first (AMENDEMENT-14) :
 *  - permission foreground demandée AU PREMIER GO (l'arrivée sur cet écran) ;
 *  - refus / localisation coupée / capteur muet → AUCUNE course : l'écran nomme
 *    la raison (RunUnavailableReason), jamais un run fabriqué ;
 *  - permission background demandée UNIQUEMENT au retour d'une mise en
 *    arrière-plan pendant la course, et SEULEMENT là où l'arrière-plan existe ;
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
import * as Crypto from 'expo-crypto';
import type { IngestRunRequest, IngestRunResponse } from '@klaim/shared';
import { EVENTS, track } from '../../../lib/analytics';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../../lib/session';
import { isPermanentRejection, queuePendingUpload, retryPendingUpload } from '../../../lib/pendingUpload';
import {
  clearActiveRun,
  clearCurrentRun,
  loadActiveRun,
  loadCurrentRun,
  saveActiveRun,
  saveCurrentRun,
  type StoredRun,
} from '../../../lib/runStore';
import type { LiveRunMode } from '../simulation';
import { setLastRunResult } from '../runResult';
import { RunTracker, type TrackerSnapshot } from './tracker';
import type { RealRunGate } from './gateTypes';
import type { RunLocationAdapter, RunUnavailableReason, RunWatchHandle } from './locationAdapter';

// Cadences de PRÉSENTATION/robustesse (pas des règles de jeu — les règles GPS
// vivent dans game-rules.ts et sont consommées par le moteur/le provider).
/** Rafraîchissement UI du snapshot (ms). */
const UI_TICK_MS = 1_000;
/** Flush du buffer AsyncStorage tous les N ticks (~30 s — run_autosave §8). */
const FLUSH_EVERY_TICKS = 30;
/** Re-vérification de la permission (autorisation coupée en course) tous les N ticks. */
const PERMISSION_CHECK_EVERY_TICKS = 10;

export function useRealRunCore(mode: LiveRunMode, adapter: RunLocationAdapter): RealRunGate {
  const { session } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const trackerRef = useRef<RunTracker | null>(null);
  const watchRef = useRef<RunWatchHandle | null>(null);
  const finishedRef = useRef(false);
  const bgGrantedRef = useRef(false);
  const bgAskedRef = useRef(false);
  const wentBackgroundRef = useRef(false);
  const pendingStoredRef = useRef<StoredRun | null>(null);

  const [kind, setKind] = useState<'starting' | 'unavailable' | 'real'>('starting');
  const [reason, setReason] = useState<RunUnavailableReason>('position-unavailable');
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
   *  - 'sent'     : ingest_run a répondu sans erreur ;
   *  - 'rejected' : le serveur a JUGÉ et refusé (4xx hors 429) — pas de file
   *                 (l'idempotence rendrait le même verdict), pas de message
   *                 « envoi dès que possible » (ce serait faux) ;
   *  - 'queued' : hors-ligne/5xx/429 → payload en file (pendingUpload, slot
   *               unique MVP — DISCOVERY), renvoyé silencieusement plus tard ;
   *  - 'lost'   : stockage indisponible (l'appelant garde son dernier filet) ;
   *  - 'none'   : pas de backend/session (aucun envoi attendu).
   */
  const uploadOrQueue = useCallback(
    async (payload: IngestRunRequest): Promise<'sent' | 'rejected' | 'queued' | 'lost' | 'none'> => {
      if (supabase === null) return 'none'; // aucun backend configuré
      if (sessionRef.current === null) {
        // P0 C3 — session tombée EN COURS de course : on ne purge JAMAIS une vraie
        // course sans l'avoir mise à l'abri. En file : retryPendingUpload exige une
        // session (il attendra la reconnexion), le payload est idempotent.
        return (await queuePendingUpload(payload)) ? 'queued' : 'lost';
      }
      try {
        const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
        if (!error) {
          // O1 Pass 3 : la réponse du serveur (seul juge) n'est plus jetée — elle
          // est armée pour que course-result affiche les VRAIS points/zones/badges.
          const result = (data ?? null) as IngestRunResponse | null;
          setLastRunResult(result);
          if (result) {
            // P0 D2 — l'ACTIVATION se mesure sur la capture PERSISTÉE (la réponse
            // du seul juge), jamais sur un bouton. claim_result était défini
            // (§8) mais jamais émis : le funnel du pilote était aveugle.
            track(EVENTS.claimResult, {
              new: result.hexes.claimed,
              stolen: result.hexes.stolen,
              defended: result.hexes.defended,
              pioneer: result.hexes.pioneer,
              status: result.status,
              rejected_reason: result.rejectReason ?? null,
            });
            if (result.loopClosed === true) {
              track(EVENTS.loopClosed, { enclosed_zones: result.enclosedZones ?? 0 });
            }
            if (result.openBoundary) {
              // Signal d'activation RATÉE : le « il manquait N m » du funnel.
              track(EVENTS.loopAlmostClosed, { missing_m: result.openBoundary.missingM });
            }
          }
          return 'sent';
        }
        if (isPermanentRejection(error)) {
          // P0 C2 — le serveur A JUGÉ (4xx hors 429) : mettre en file serait un
          // retry infini vers le même verdict (idempotence). Pas de « envoi dès
          // que possible » (ce serait faux) ; l'issue part à la mesure.
          const status = (error.context as { status?: number } | undefined)?.status;
          console.warn('[useRealRun] course rejetée définitivement :', status);
          track(EVENTS.claimResult, {
            outcome: 'rejected_permanent',
            http: status ?? 0,
            source: 'finish',
          });
          return 'rejected';
        }
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
    const bg = adapter.background;
    if (bg !== null) {
      bg.setFixListener(null);
      void bg.stop();
    }
  }, [adapter]);

  /** Branche la source de fixes : tâche background si « Toujours », sinon watch. */
  const startSensors = useCallback(async () => {
    const onFixes = (fixes: Parameters<RunTracker['addFixes']>[0]) =>
      trackerRef.current?.addFixes(fixes);
    const bg = adapter.background;
    if (bg !== null && bgGrantedRef.current) {
      bg.setFixListener((fixes) => onFixes(fixes));
      await bg.start();
    } else {
      watchRef.current = await adapter.watchPosition((fix) => onFixes([fix]));
    }
  }, [adapter]);

  /** Fixes mis en file par la tâche background — vide là où elle n'existe pas. */
  const drainBackground = useCallback(async () => {
    return (await adapter.background?.drainQueuedFixes()) ?? [];
  }, [adapter]);

  // ─── Démarrage GO-first : permission → restauration → capteurs ────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      // La SOURCE DE POSITION répond « accordé » ou la RAISON exacte du refus.
      // Aucune branche ne fabrique de course : sans position, il n'y a pas de
      // course, et l'écran nomme ce qui manque.
      const acquired = await adapter.acquire();
      if (!alive) return;
      if (!acquired.ok) {
        setReason(acquired.reason);
        setKind('unavailable');
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
      track(EVENTS.runStart, { source: 'gps', mode, platform: adapter.platform });

      bgGrantedRef.current = (await adapter.background?.checkGranted()) ?? false;
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
        // `isStillGranted` ne renvoie false que quand la plateforme l'AFFIRME :
        // un « je ne sais pas » (Safari n'expose pas l'état geolocation) ne doit
        // jamais afficher « autorisation coupée » à quelqu'un qui court.
        void adapter.isStillGranted().then((ok) => setPermissionRevoked(!ok));
      }
    }, UI_TICK_MS);
    return () => clearInterval(id);
  }, [kind, flush, adapter]);

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
        // Là où l'arrière-plan n'existe pas (navigateur), on ne propose JAMAIS
        // une permission introuvable : la limite est annoncée d'emblée à la place.
        adapter.background !== null &&
        !bgGrantedRef.current &&
        !bgAskedRef.current
      ) {
        setBgPrompt('offer');
      }
    });
    return () => sub.remove();
  }, [kind, flush, adapter]);

  // ─── Actions exposées à l'écran ────────────────────────────────────────────
  const allowBackground = useCallback(() => {
    const bg = adapter.background;
    if (bg === null) return;
    bgAskedRef.current = true;
    void (async () => {
      const granted = await bg.request();
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
  }, [adapter, startSensors]);

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
      const bg = await drainBackground();
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
  }, [drainBackground, flush]);

  /** Clôture propre de la course interrompue : payload envoyé (ou mis en file) si session réelle. */
  const discardStored = useCallback(() => {
    const stored = pendingStoredRef.current;
    if (stored === null) return;
    void (async () => {
      const bg = await drainBackground();
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
  }, [drainBackground, flush, uploadOrQueue]);

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
    // Le VRAI payload part vers ingest_run (seul juge) si session réelle.
    // Idempotent par clientRunId. Hors-ligne : le payload est mis en FILE
    // (jamais purgé sans être à l'abri), renvoyé silencieusement au prochain
    // lancement/fin de course.
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
  if (kind === 'unavailable') return { kind: 'unavailable', reason };

  const t = trackerRef.current;
  // snapshot/tracker toujours posés quand kind === 'real'
  if (t === null || snapshot === null) return { kind: 'starting' };
  return {
    kind: 'real',
    run: {
      effectiveMode: t.mode,
      snapshot,
      platform: adapter.platform,
      approxLocation: snapshot.approxLocationSuspected,
      permissionRevoked,
      bgPrompt,
      foregroundOnlyPlatform: adapter.background === null,
      restore:
        restoreDistanceM !== null
          ? { distanceM: restoreDistanceM, resume: resumeStored, discard: discardStored }
          : null,
      openSettings: adapter.openSettings,
      allowBackground,
      dismissBackground,
      togglePause,
      finish,
    },
  };
}
