/**
 * GRYD — adaptateur « Import GPX » (AMENDEMENT-15 §3), RÉEL depuis le
 * PÉRIMÈTRE 5 (21/07/2026). L'alternative GRATUITE aux intégrations qui exigent
 * des clés ou un programme partenaire : n'importe quelle montre / app de course
 * exporte un fichier .gpx, et ce fichier EST la trace → trust ÉLEVÉ (catalog.ts).
 *
 * Chaîne complète, sans aucune donnée fabriquée :
 *   expo-document-picker (choix du fichier par l'utilisateur)
 *     → expo-file-system (lecture locale, le fichier ne transite nulle part)
 *     → parseGpx (gpx-parse.ts, PUR et testé) → RunPoint[]
 *     → ingest_run (Edge Function, service-role) → SEUL JUGE du claim (§3.2).
 * Le client n'attribue JAMAIS un hex et n'annonce jamais une capture : il
 * rapporte le nombre de points envoyés et le verdict RENVOYÉ par le serveur.
 *
 * AVANT (à ne pas réintroduire) : `connect()` rejouait un échantillon GPX
 * embarqué et affichait « Connecté · Démo ». C'était une démonstration de
 * parseur présentée dans un écran d'état — retiré.
 *
 * Sémantique d'ÉTAT : un import est une action PONCTUELLE et répétable, pas une
 * liaison. L'adaptateur reste donc toujours `disconnected` (= « action possible
 * maintenant », CTA « Importer » actif) et porte le résultat du dernier import
 * dans `detailEntry`. Il ne prétend jamais être « connecté ».
 *
 * Robustesse : les modules natifs sont chargés PARESSEUSEMENT sous try/catch
 * (même précaution que registerBackgroundTask.ts). Un build antérieur à l'ajout
 * de expo-document-picker doit dégrader proprement, jamais crasher. Aucune
 * exception ne remonte à l'UI (garantie AMENDEMENT-15 §3).
 */
import type { IngestRunRequest, IngestRunResponse, RunPoint } from '@klaim/shared';
import * as Crypto from 'expo-crypto';
import { C } from '../../../i18n/catalog/auth';
import type { Entry } from '../../../i18n/types';
import { supabase } from '../../../lib/supabase';
import { parseGpx } from './gpx-parse';
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

/** Extensions/MIME acceptés par le sélecteur — un .gpx est du XML. */
const GPX_MIME = ['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream'];

/** Un import demande au moins 2 points horodatés (une trace, pas un point). */
const MIN_POINTS = 2;

/** État de repos : l'action est faisable maintenant (CTA « Importer » actif). */
const READY: SourceAdapterSnapshot = {
  status: 'disconnected',
  lastSync: null,
  detailEntry: C.gpxReady,
};

/** État de repos + une phrase de résultat (rien n'a été enregistré). */
function ready(detailEntry: Entry, detailVars?: Record<string, string | number>): SourceAdapterSnapshot {
  return {
    status: 'disconnected',
    lastSync: null,
    detailEntry,
    ...(detailVars ? { detailVars } : {}),
  };
}

/** Import ABOUTI : on horodate, et la phrase dit ce que le SERVEUR a répondu. */
function done(detailEntry: Entry, detailVars?: Record<string, string | number>): SourceAdapterSnapshot {
  return {
    status: 'disconnected',
    lastSync: new Date().toISOString(),
    detailEntry,
    ...(detailVars ? { detailVars } : {}),
  };
}

// ─── Modules natifs (chargement paresseux et défensif) ───────────────────────

type DocumentPickerModule = typeof import('expo-document-picker');
type FileSystemModule = typeof import('expo-file-system');

/** null = module absent du build (dégradation propre, jamais un crash). */
function loadNativeModules(): { picker: DocumentPickerModule; fs: FileSystemModule } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker = require('expo-document-picker') as DocumentPickerModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system') as FileSystemModule;
    return { picker, fs };
  } catch (e) {
    console.warn('[GRYD] import GPX indisponible (module natif absent)', e);
    return null;
  }
}

// ─── Envoi vers ingest_run (le serveur est seul juge) ────────────────────────

/**
 * Envoie les points parsés à ingest_run et traduit le VERDICT du serveur.
 * `source: 'gpx'` : la provenance est déclarée telle quelle et persistée telle
 * quelle (migration 0045) — jamais ré-étiquetée en capture directe.
 *
 * Aucun `gpsTrust` client n'est envoyé : un GPX ne porte pas d'accuracy
 * horizontale, donc le client n'a rien de fiable à avancer. Le serveur calcule
 * le sien (le champ est optionnel, son absence est neutre).
 */
async function sendToServer(points: RunPoint[]): Promise<SourceAdapterSnapshot> {
  if (supabase === null) return ready(C.gpxNeedsAccount);

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return ready(C.gpxNeedsAccount);

  const first = points[0];
  if (first === undefined) return ready(C.gpxNoPoints);

  const payload: IngestRunRequest = {
    // UUID neuf : l'idempotence FORTE de ce flux est assurée côté serveur par le
    // polylineHash (§4) — ré-importer le même fichier renvoie « duplicate »
    // plutôt que de créer une seconde course.
    clientRunId: Crypto.randomUUID(),
    source: 'gpx',
    startedAt: new Date(first.t).toISOString(),
    points,
    runMode: 'conquete',
  };

  const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
  if (error) return ready(C.gpxSendFailed);

  // `status` est élargi à string : ingest_run répond aussi 'duplicate' sur la
  // branche de dédup (§4), une valeur HORS de RunStatus (elle ne décrit pas une
  // course enregistrée mais un envoi absorbé). On lit donc la réponse brute.
  const result = (data ?? null) as (Omit<Partial<IngestRunResponse>, 'status'> & {
    status?: string;
  }) | null;
  if (result === null) return ready(C.gpxSendFailed);
  if (result.status === 'duplicate') return done(C.gpxDuplicate);
  if (result.status === 'rejected') return done(C.gpxRejected);
  return done(C.gpxSent, { n: points.length });
}

// ─── Action d'import ─────────────────────────────────────────────────────────

async function runImport(): Promise<SourceAdapterSnapshot> {
  const native = loadNativeModules();
  if (native === null) return ready(C.gpxPickerUnavailable);

  const picked = await native.picker.getDocumentAsync({
    type: GPX_MIME,
    copyToCacheDirectory: true, // lecture locale garantie, hors du fournisseur
    multiple: false,
  });
  // Annulation = choix de l'utilisateur, jamais un échec : retour au repos sans
  // message d'erreur (anti-shame, GO-first).
  if (picked.canceled) return READY;

  const file = picked.assets[0];
  if (file === undefined) return READY;

  const xml = await native.fs.readAsStringAsync(file.uri);
  const { points } = parseGpx(xml);
  if (points.length < MIN_POINTS) return ready(C.gpxNoPoints);

  return sendToServer(points);
}

export const gpxAdapter: SourceAdapter = {
  id: 'gpx',
  trustLevel: 'high', // le fichier .gpx est la source directe (catalog §6)
  status: () => Promise.resolve(READY),
  connect: () =>
    // Filet ultime : fichier illisible, URI expirée, réseau coupé net… → état
    // honnête et action re-tentable, jamais d'exception vers l'UI.
    runImport().catch((e: unknown) => {
      console.warn('[GRYD] import GPX échoué', e);
      return ready(C.gpxUnreadable);
    }),
  // Rien à délier : un import ne crée aucune liaison persistante.
  disconnect: () => Promise.resolve(READY),
};
