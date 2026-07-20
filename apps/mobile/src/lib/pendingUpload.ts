/**
 * GRYD — envoi différé de fin de course (AMENDEMENT-15 §2, hors-ligne).
 * Une fin de course dont l'invoke `ingest_run` échoue n'est JAMAIS perdue :
 * son payload complet (idempotent par clientRunId — D14, un double envoi est
 * neutre côté serveur) est persisté sous `gryd.pendingUpload.v1`, puis renvoyé
 * SILENCIEUSEMENT au prochain lancement de l'app (_layout) et à la prochaine
 * fin de course (useRealRun). Anti-shame : message discret « Course
 * enregistrée — envoi dès que possible », jamais bloquant, jamais d'alerte.
 *
 * MVP : UNE seule course en attente (une nouvelle fin hors-ligne remplace la
 * précédente dans le slot). La file complète multi-courses (FIFO, backoff,
 * déclencheur connectivité) est documentée V1 dans DISCOVERY.md.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { IngestRunRequest } from '@klaim/shared';
import { EVENTS, track } from './analytics';
import { supabase } from './supabase';

const PENDING_UPLOAD_KEY = 'gryd.pendingUpload.v1';

/**
 * P0 C2 (MVP_CHANGESET) — un REJET DÉFINITIF du serveur n'est pas une panne réseau.
 * Avant : `if (error) return` avalait un 403 unknown_user ou un 400 invalid_payload
 * exactement comme un hors-ligne → la course « partait » en boucle à vie sans jamais
 * arriver, indistinguable d'une file saine. Ici : 4xx (hors 429, rate limit → on
 * retentera passé la fenêtre) = le serveur A JUGÉ ; l'idempotence (clientRunId)
 * garantit qu'un renvoi rendrait le MÊME verdict — retenter est inutile.
 */
export function isPermanentRejection(error: unknown): boolean {
  if (!(error instanceof FunctionsHttpError)) return false; // réseau/relay → réessayable
  const status = (error.context as { status?: number } | undefined)?.status;
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429;
}

/**
 * Marque une course « à renvoyer ». Retourne false si le stockage lui-même est
 * indisponible — dans ce cas l'appelant garde son buffer runStore (dernier filet).
 */
export async function queuePendingUpload(payload: IngestRunRequest): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Y a-t-il une course en attente d'envoi ? Lecture UI (« où est mon run » —
 * fiabilité 21/07) : le slot était invisible, un coureur crashé/hors-ligne ne
 * savait pas si sa course existait encore. Corrompu/illisible → false (le
 * prochain retry purgera : on n'affiche jamais une promesse inenvoyable).
 */
export async function hasPendingUpload(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
    if (raw === null) return false;
    const payload = JSON.parse(raw) as { clientRunId?: unknown };
    return typeof payload.clientRunId === 'string';
  } catch {
    return false;
  }
}

/**
 * Retente l'envoi en attente. Silencieux et jamais bloquant : no-op sans
 * backend (O1), sans session ou sans course en attente ; toujours hors-ligne →
 * le payload RESTE en place (idempotent, on retentera). La clé n'est purgée
 * QUE lorsque le serveur a répondu sans erreur.
 */
export async function retryPendingUpload(): Promise<void> {
  if (supabase === null) return;
  let payload: IngestRunRequest | null = null;
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
    if (raw === null) return;
    payload = JSON.parse(raw) as IngestRunRequest;
  } catch {
    return; // stockage illisible : on n'insiste pas (jamais de crash)
  }
  if (typeof payload?.clientRunId !== 'string') {
    // JSON corrompu : purge (inenvoyable — mieux vaut un slot propre).
    try {
      await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    } catch {
      // no-op
    }
    return;
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session === null) return; // pas de session : on retentera connecté
    const { error } = await supabase.functions.invoke('ingest_run', { body: payload });
    if (error) {
      if (isPermanentRejection(error)) {
        // Jugé et refusé : sortir de la file (sinon retry infini silencieux) et
        // le DIRE — au moins à la mesure (claim_result est l'event d'issue de
        // capture) et au log. Le payload reste idempotent : rien n'est perdu
        // côté serveur, il a déjà statué.
        const status = (error.context as { status?: number } | undefined)?.status;
        console.warn('[pendingUpload] course rejetée définitivement par le serveur :', status);
        track(EVENTS.claimResult, {
          outcome: 'rejected_permanent',
          http: status ?? 0,
          source: 'pending_retry',
        });
        await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
      }
      return; // hors-ligne/5xx/429 : le slot reste, on retentera
    }
    await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
  } catch {
    // Réseau coupé net : silencieux, le slot reste pour la prochaine tentative.
  }
}
