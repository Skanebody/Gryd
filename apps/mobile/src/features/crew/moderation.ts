/**
 * GRYD — MODÉRATION du contenu communautaire (AMENDEMENT-33 §1, App Store
 * Guideline 1.2 — la cause n°1 de rejet). Toute app avec du contenu généré par
 * les utilisateurs (chat crew, pseudos) DOIT fournir : SIGNALER, BLOQUER, un
 * FILTRAGE de mots + un accès au code de conduite. Ce store porte les 2 états
 * persistés localement (démo) façon chatStore.ts / reactions.ts : lecture lazy,
 * écriture fire-and-forget best-effort.
 *
 *  - `reports`  : signalements émis (message ou membre) + motif + horodatage.
 *  - `blocked`  : pseudos bloqués — leurs messages sont MASQUÉS à l'affichage.
 *
 * O1 (migration 0029_moderation) : HYBRIDE — si une session existe, blocages et
 * signalements sont écrits dans `user_blocks` / `content_reports` (RLS : on n'agit
 * que pour soi, blocker_id/reporter_id = auth.uid()) ET hydratés au chargement ;
 * sinon — ou si la migration n'est pas encore poussée (table absente = erreur
 * avalée) — on reste 100 % LOCAL. L'API reste SYNCHRONE : l'écriture Supabase est
 * fire-and-forget best-effort, l'état local mis à jour optimistiquement.
 * Les signalements réels sont traités par une personne sous 24 h (process
 * documenté dans GRYD_APPSTORE_CHECKLIST) via le dashboard admin (service-role).
 * Anti-shame : bloquer est SILENCIEUX (l'autre n'est jamais notifié), aucun
 * compteur public de signalements.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

/** Motifs de signalement — courts, non tronqués (§A.9), ordre stable. */
export type ReportReason = 'spam' | 'haine' | 'harcelement' | 'autre';

export interface ReportReasonDef {
  key: ReportReason;
  label: string;
  /** Aide courte affichée sous le motif dans la feuille (1 ligne). */
  hint: string;
}

export const REPORT_REASONS: readonly ReportReasonDef[] = [
  { key: 'spam', label: 'Spam', hint: 'Pub, arnaque, message répété.' },
  { key: 'haine', label: 'Haine', hint: 'Racisme, insulte, contenu haineux.' },
  { key: 'harcelement', label: 'Harcèlement', hint: 'Intimidation, menaces, acharnement.' },
  { key: 'autre', label: 'Autre', hint: 'Un autre problème à examiner.' },
];

/** Cible d'un signalement : un message précis, ou un membre entier. */
export type ReportTargetKind = 'message' | 'member';

/** Signalement émis (démo) — `at` = epoch ms réel pour un horodatage vivant. */
export interface ContentReport {
  id: string;
  kind: ReportTargetKind;
  /** id du message signalé (kind=message) ou pseudo (kind=member). */
  targetId: string;
  /** Pseudo de l'auteur visé (affichage / regroupement). */
  author: string;
  reason: ReportReason;
  at: number;
}

/** Délai de traitement affiché à l'utilisateur (heures) — §1 : sous 24 h. */
export const REPORT_REVIEW_HOURS = 24;

/**
 * Filtre de mots objectionnables (liste COURTE, démo). Un message qui en
 * contient un est MASQUÉ à l'affichage (remplacé par « Message masqué »), sans
 * bloquer son auteur. Volontairement minimal — le vrai filtrage vit côté
 * serveur (Edge Function) ; ici on démontre la mécanique exigée par la 1.2.
 * On teste sur des RACINES (inclusion, insensible à la casse/accents) pour
 * couvrir quelques déclinaisons sans lister d'insultes en clair partout.
 */
const BLOCKED_WORD_ROOTS: readonly string[] = [
  'connard',
  'salope',
  'encule',
  'ferme ta gueule',
  'ta gueule',
  'sale race',
  'pd',
  'pute',
];

/** Normalise pour le test de mots (minuscules + accents retirés). */
function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * true si le texte contient un mot objectionnable de la liste courte. `pd` est
 * testé en MOT ENTIER (bordures) pour éviter les faux positifs (« rapide »,
 * « speed »…) ; les autres racines sont testées par inclusion.
 */
export function containsBlockedWord(text: string): boolean {
  const t = normalizeForFilter(text);
  return BLOCKED_WORD_ROOTS.some((root) => {
    if (root === 'pd') return /\bpd\b/.test(t);
    return t.includes(root);
  });
}

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

interface ModerationState {
  reports: ContentReport[];
  /** Pseudos bloqués (démo). L'ordre n'importe pas — on teste l'appartenance. */
  blocked: string[];
}

let state: ModerationState = { reports: [], blocked: [] };
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Snapshot stable : recomposé UNIQUEMENT quand `state` change (getSnapshot pur). */
let snapshot: ModerationState = state;

const STORAGE_KEY = 'gryd.crew.moderation';

function emit() {
  snapshot = { reports: [...state.reports], blocked: [...state.blocked] };
  for (const l of listeners) l();
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<ModerationState>;
            const reports = Array.isArray(parsed.reports)
              ? parsed.reports.filter(
                  (r): r is ContentReport =>
                    !!r && typeof r.id === 'string' && typeof r.targetId === 'string',
                )
              : [];
            const blocked = Array.isArray(parsed.blocked)
              ? parsed.blocked.filter((p): p is string => typeof p === 'string')
              : [];
            state = { reports, blocked };
          } catch {
            // corpus corrompu → on repart propre (best effort).
          }
        }
        loaded = true;
        emit();
        // Fusion des données réelles (Supabase) si session — best-effort.
        void hydrateRemote();
      })
      .catch(() => {
        loaded = true;
        void hydrateRemote();
      });
  }
  return loadPromise;
}

function persist() {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

// ─── Pont Supabase (O1) : best-effort, ne casse JAMAIS le chemin local ────────

/** Motifs valides — garde de parse pour l'hydratation distante. */
const VALID_REASONS: readonly ReportReason[] = ['spam', 'haine', 'harcelement', 'autre'];

/** id de l'utilisateur connecté, ou null (mode dev / hors session / pas de client). */
async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Fusionne les blocages/signalements RÉELS de l'utilisateur (Supabase) dans
 * l'état local — best-effort : session absente, table non poussée (migration
 * 0029) ou erreur réseau laisse l'état LOCAL intact. Union dédupliquée : le local
 * optimiste n'est jamais perdu.
 */
async function hydrateRemote(): Promise<void> {
  const uid = await currentUserId();
  if (!uid || !supabase) return;
  try {
    const [blocksRes, reportsRes] = await Promise.all([
      supabase.from('user_blocks').select('blocked_pseudo').eq('blocker_id', uid),
      supabase
        .from('content_reports')
        .select('id, kind, target_id, author, reason, created_at')
        .eq('reporter_id', uid),
    ]);
    if (blocksRes.error || reportsRes.error) return; // table absente / RLS → garder local
    const remoteBlocked = (blocksRes.data ?? [])
      .map((r) => (r as { blocked_pseudo?: unknown }).blocked_pseudo)
      .filter((p): p is string => typeof p === 'string');
    const remoteReports: ContentReport[] = (reportsRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const reason = VALID_REASONS.includes(row.reason as ReportReason)
        ? (row.reason as ReportReason)
        : 'autre';
      const at = typeof row.created_at === 'string' ? Date.parse(row.created_at) : NaN;
      return {
        id: String(row.id),
        kind: row.kind === 'member' ? 'member' : 'message',
        targetId: String(row.target_id),
        author: String(row.author),
        reason,
        at: Number.isFinite(at) ? at : Date.now(),
      };
    });
    const blocked = [...new Set<string>([...state.blocked, ...remoteBlocked])];
    const byId = new Map<string, ContentReport>();
    for (const rep of [...state.reports, ...remoteReports]) byId.set(rep.id, rep);
    state = { reports: [...byId.values()], blocked };
    persist();
    emit();
  } catch {
    // best-effort : on garde l'état local.
  }
}

/**
 * Enregistre un signalement (message ou membre) avec son motif. Retourne le
 * signalement créé. Un même contenu peut être re-signalé sans erreur — le
 * traitement (dédup, action) reste côté humain/serveur (démo).
 */
export function reportContent(input: {
  kind: ReportTargetKind;
  targetId: string;
  author: string;
  reason: ReportReason;
}): ContentReport {
  const report: ContentReport = {
    id: `rep_${Date.now()}`,
    kind: input.kind,
    targetId: input.targetId,
    author: input.author,
    reason: input.reason,
    at: Date.now(),
  };
  state = { ...state, reports: [...state.reports, report] };
  persist();
  emit();
  // Enregistrement serveur (RLS reporter_id = moi) si session — fire-and-forget.
  void currentUserId().then((uid) => {
    if (uid && supabase) {
      void supabase
        .from('content_reports')
        .insert({
          reporter_id: uid,
          kind: input.kind,
          target_id: input.targetId,
          author: input.author,
          reason: input.reason,
        })
        .then(() => {}, () => {});
    }
  });
  return report;
}

/** Bloque un membre (masque ses messages). Idempotent : pas de doublon. */
export function blockMember(pseudo: string): void {
  if (state.blocked.includes(pseudo)) return;
  state = { ...state, blocked: [...state.blocked, pseudo] };
  persist();
  emit();
  void currentUserId().then((uid) => {
    if (uid && supabase) {
      void supabase
        .from('user_blocks')
        .insert({ blocker_id: uid, blocked_pseudo: pseudo })
        .then(() => {}, () => {});
    }
  });
}

/** Débloque un membre (ses messages réapparaissent). */
export function unblockMember(pseudo: string): void {
  if (!state.blocked.includes(pseudo)) return;
  state = { ...state, blocked: state.blocked.filter((p) => p !== pseudo) };
  persist();
  emit();
  void currentUserId().then((uid) => {
    if (uid && supabase) {
      void supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', uid)
        .eq('blocked_pseudo', pseudo)
        .then(() => {}, () => {});
    }
  });
}

/** true si ce pseudo est actuellement bloqué (filtre d'affichage du chat). */
export function isBlocked(pseudo: string): boolean {
  return snapshot.blocked.includes(pseudo);
}

/** true si ce message précis a été signalé par moi (masquage local optionnel). */
export function isReportedMessage(messageId: string): boolean {
  return snapshot.reports.some((r) => r.kind === 'message' && r.targetId === messageId);
}

/** RAZ (utilitaire démo / tests). */
export function resetModeration(): void {
  state = { reports: [], blocked: [] };
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => listeners.delete(listener);
}

function getSnapshot(): ModerationState {
  return snapshot;
}

/** État exposé au hook : liste des bloqués + signalements + drapeau de charge. */
export interface Moderation {
  blocked: readonly string[];
  reports: readonly ContentReport[];
  loaded: boolean;
}

/**
 * Hook de modération. ABONNE le composant au store (re-render à chaque
 * signalement / blocage) et expose l'état courant. L'écran lit ensuite via
 * `isBlocked` / `isReportedMessage` ou directement `blocked`.
 */
export function useModeration(): Moderation {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { blocked: snap.blocked, reports: snap.reports, loaded };
}
