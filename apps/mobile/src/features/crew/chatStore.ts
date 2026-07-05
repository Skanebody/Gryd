/**
 * GRYD — store du CHAT crew (retour fondateur : « je n'ai pas su envoyer un
 * message »). Le fil de discussion = messages DÉMO déterministes (feed.ts) +
 * messages que MOI (KORO, démo) j'envoie, PERSISTÉS AsyncStorage façon
 * lib/haptics.ts (lecture lazy, écriture fire-and-forget best-effort).
 *
 * Un vrai chat = un fil qui grandit et se souvient : je tape, j'envoie, mon
 * message reste après un reload. Ici tout est LOCAL (démo) — TODO(O1) brancher
 * crew_messages (0011) via Edge Function (écriture client interdite côté DB).
 *
 * `useCrewChat()` expose le fil trié (plus ANCIEN → plus RÉCENT, sens naturel
 * d'un chat) et `send(text)`. Le hook re-render sur envoi via un store-notifier
 * minimal (pas de dépendance hors stack : useSyncExternalStore natif React).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAT_TIMELINE, type ChatMessageAction, type CrewMessageDemo } from './feed';

/** Pseudo de l'utilisateur démo (cohérent avec MY_CREW : KORO = founder). */
export const CHAT_ME = 'KORO';

/** Clé de persistance des messages que J'AI envoyés (démo locale). */
const CHAT_STORAGE_KEY = 'gryd.crew.chat';

/**
 * Message envoyé par l'utilisateur (démo). `sentAt` = epoch ms réel → permet un
 * horodatage vivant (« à l'instant », « 2 min ») sans nombre magique.
 */
export interface SentChatMessage {
  id: string;
  text: string;
  sentAt: number;
}

/**
 * Élément de fil unifié rendu par l'onglet Chat : soit un message démo
 * (feed.ts, ancré par `minutesAgo`), soit un message que j'ai envoyé (ancré par
 * `sentAt`). On normalise sur un timestamp epoch pour un tri chronologique
 * unique et un horodatage cohérent.
 */
export interface ChatThreadMessage {
  id: string;
  author: string;
  text: string;
  me: boolean;
  /** Epoch ms (dérivé de minutesAgo pour la démo, réel pour mes envois). */
  at: number;
  /**
   * Action rapide portée par un message démo (RSVP sortie défense, ping zone →
   * carte). Absente sur mes envois (démo : je poste juste du texte).
   */
  action?: ChatMessageAction;
  /** Réactions déjà posées (démo) — mes envois n'en portent pas encore. */
  reactions?: CrewMessageDemo['reactions'];
}

// ─── Store minimal (notifier + snapshot mémoïsé pour useSyncExternalStore) ────

let sent: SentChatMessage[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Snapshot stable : recalculé UNIQUEMENT quand `sent` change (getSnapshot pur). */
let snapshot: readonly SentChatMessage[] = sent;

function emit() {
  snapshot = [...sent];
  for (const l of listeners) l();
}

/** Lecture lazy et unique du fil persisté (déclenchée au 1ᵉʳ montage). */
function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(CHAT_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as SentChatMessage[];
            if (Array.isArray(parsed)) sent = parsed.filter((m) => m && typeof m.text === 'string');
          } catch {
            // corpus corrompu → on repart propre (best effort).
          }
        }
        loaded = true;
        emit();
      })
      .catch(() => {
        loaded = true;
      });
  }
  return loadPromise;
}

function persist() {
  void AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sent)).catch(() => {});
}

/**
 * Ajoute MON message au fil (démo). Retourne le message créé, ou null si le
 * texte est vide/blanc (le bouton Envoyer est déjà gardé, ceinture + bretelles).
 */
export function sendChatMessage(text: string): SentChatMessage | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const msg: SentChatMessage = {
    id: `me_${Date.now()}`,
    text: trimmed,
    sentAt: Date.now(),
  };
  sent = [...sent, msg];
  persist();
  emit();
  return msg;
}

/** RAZ du fil persisté (utilitaire démo / tests). */
export function resetChat(): void {
  sent = [];
  persist();
  emit();
}

// ─── Fil unifié démo + envois ────────────────────────────────────────────────

/**
 * Messages DÉMO du chat, extraits de la timeline fusionnée (feed.ts) en gardant
 * l'ordre et l'ancrage `minutesAgo`. Les ÉVÉNEMENTS (War Log) restent dans
 * l'onglet War Log, séparés — le chat ne doit ressembler qu'à un chat.
 */
export const DEMO_CHAT_MESSAGES: readonly CrewMessageDemo[] = CHAT_TIMELINE.filter(
  (i): i is CrewMessageDemo => i.kind === 'message',
);

/**
 * Construit le fil de discussion ordonné du plus ANCIEN au plus RÉCENT (sens
 * naturel d'un chat : on lit vers le bas, l'input est en bas). `now` sert de
 * base pour convertir `minutesAgo` des messages démo en epoch.
 */
function buildThread(now: number): ChatThreadMessage[] {
  const demo: ChatThreadMessage[] = DEMO_CHAT_MESSAGES.map((m) => ({
    id: m.id,
    author: m.author,
    text: m.text,
    me: m.me === true,
    at: now - m.minutesAgo * 60_000,
    action: m.action,
    reactions: m.reactions,
  }));
  const mine: ChatThreadMessage[] = sent.map((m) => ({
    id: m.id,
    author: CHAT_ME,
    text: m.text,
    me: true,
    at: m.sentAt,
  }));
  return [...demo, ...mine].sort((a, b) => a.at - b.at);
}

/** État exposé au hook : fil chronologique + drapeau de chargement + envoi. */
export interface CrewChat {
  messages: ChatThreadMessage[];
  loaded: boolean;
  send: (text: string) => SentChatMessage | null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => listeners.delete(listener);
}

function getSnapshot(): readonly SentChatMessage[] {
  return snapshot;
}

/**
 * Hook de l'onglet Chat. `nowBase` (epoch figé au montage de l'écran) garantit
 * un ordre stable des messages démo entre deux rendus — passe `Date.now()` une
 * seule fois côté écran (mémoïsé).
 */
export function useCrewChat(nowBase: number): CrewChat {
  // On s'abonne au store d'envois ; getSnapshot renvoie une ref stable.
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    messages: buildThread(nowBase),
    loaded,
    send: sendChatMessage,
  };
}
