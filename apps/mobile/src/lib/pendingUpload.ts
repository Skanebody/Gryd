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
import type { IngestRunRequest } from '@klaim/shared';
import { supabase } from './supabase';

const PENDING_UPLOAD_KEY = 'gryd.pendingUpload.v1';

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
    if (error) return; // toujours hors-ligne/en erreur : le slot reste, on retentera
    await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
  } catch {
    // Réseau coupé net : silencieux, le slot reste pour la prochaine tentative.
  }
}
