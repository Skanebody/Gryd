/**
 * GRYD — SORTIES de crew (AMENDEMENT-32 §1, emprunt « club events » Strava rendu
 * GRYD). Planifier une sortie = titre + heure + lieu de RDV + ZONE CIBLE avec un
 * objectif (défense/conquête). Liste des sorties à venir dans le Crew HQ, RSVP
 * « Je viens », et création d'une sortie via un form court.
 *
 * Ce store PERSISTE (AsyncStorage, calque requests.ts / reactions.ts : lecture
 * lazy, écriture fire-and-forget best-effort, useSyncExternalStore natif React)
 * DEUX choses, par-dessus les sorties démo statiques (eventsDemo.ts) :
 *   1. Les sorties que J'AI créées (form « Créer une sortie »).
 *   2. Mon RSVP par sortie (démo comme réelle) : « Je viens » / « Peut-être » /
 *      « Indispo ». Mon RSVP se SOUVIENT (reload → mon choix reste).
 *
 * §A.19 : SOCIAL, PAS DE MONÉTISATION. Une sortie ne donne JAMAIS de territoire,
 * de point ni de rang — courir ensemble = coordination + densité (le moat). Le
 * compteur « X viennent » est un signal de densité, pas un classement. Le claim
 * reste décidé serveur (§3). Tout est LOCAL (démo). TODO(O1) : brancher
 * crew_events / crew_event_rsvps (0011) via Edge Function — écriture client
 * interdite côté DB (RLS).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAT_ME } from './chatStore';
import { DEMO_OUTINGS } from './eventsDemo';

/** Clés de persistance (versionnées, isolées comme chatStore / requests). */
const OUTINGS_STORAGE_KEY = 'gryd.crew.outings.v1';
const RSVP_STORAGE_KEY = 'gryd.crew.outingRsvp.v1';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Objectif d'une sortie sur sa zone cible (cohérent avec les 2 intentions de jeu
 * AMENDEMENT-12 : Défendre / Conquérir). C'est un CADRE social — la sortie ne
 * décide rien, le serveur reste seul juge du claim (§3).
 */
export type CrewOutingObjective = 'defense' | 'conquete';

/** Les 3 réponses possibles à une sortie (RSVP « club events » Strava). */
export const OUTING_RSVP_OPTIONS = ['Je viens', 'Peut-être', 'Indispo'] as const;
export type OutingRsvp = (typeof OUTING_RSVP_OPTIONS)[number];

/**
 * Une sortie démo (eventsDemo.ts). `when`/`place` sont des LIBELLÉS figés (pas de
 * date calculée) pour rester déterministe. `goingSeed` = nombre de « Je viens »
 * de départ (densité, jamais un classement).
 */
export interface DemoCrewOuting {
  id: string;
  title: string;
  when: string;
  place: string;
  zone: string;
  objective: CrewOutingObjective;
  host: string;
  goingSeed: number;
}

/**
 * Une sortie que J'AI créée (form court). Même forme d'affichage qu'une sortie
 * démo, mais sans seed (elle démarre à 0 « Je viens » — ma propre voix s'ajoute
 * si je réponds « Je viens »). `createdAt` sert l'ordre + un id stable.
 */
export interface SentCrewOuting {
  id: string;
  title: string;
  when: string;
  place: string;
  zone: string;
  objective: CrewOutingObjective;
  host: string;
  createdAt: number;
}

/**
 * Vue unifiée d'une sortie affichable (démo OU créée), résolue avec MON RSVP et
 * le total « viennent » (seed + ma voix). C'est ce que l'écran consomme.
 */
export interface OutingView {
  id: string;
  title: string;
  when: string;
  place: string;
  zone: string;
  objective: CrewOutingObjective;
  host: string;
  /** Est-ce une sortie que j'ai créée moi-même (démo) ? */
  mine: boolean;
  /** Mon RSVP courant, ou null si je n'ai pas encore répondu. */
  myRsvp: OutingRsvp | null;
  /** Total « Je viens » (seed démo + 1 si je viens). Signal de densité. */
  going: number;
}

/** Libellé humain de l'objectif (non tronqué, court). PURE. */
export function objectiveLabel(objective: CrewOutingObjective): string {
  return objective === 'defense' ? 'Défense' : 'Conquête';
}

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

let outings: SentCrewOuting[] = [];
/** Mon RSVP persisté : outingId → 'Je viens' | 'Peut-être' | 'Indispo'. */
let rsvp: Record<string, OutingRsvp> = {};
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Version bump : getSnapshot pur (pas de nouvelle ref à chaque rendu). */
let version = 0;

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      AsyncStorage.getItem(OUTINGS_STORAGE_KEY),
      AsyncStorage.getItem(RSVP_STORAGE_KEY),
    ])
      .then(([rawOutings, rawRsvp]) => {
        if (rawOutings) {
          try {
            const parsed = JSON.parse(rawOutings) as SentCrewOuting[];
            if (Array.isArray(parsed)) {
              outings = parsed.filter((o) => o && typeof o.id === 'string');
            }
          } catch {
            // corpus corrompu → on repart propre (best effort).
          }
        }
        if (rawRsvp) {
          try {
            const parsed = JSON.parse(rawRsvp) as Record<string, OutingRsvp>;
            if (parsed && typeof parsed === 'object') rsvp = parsed;
          } catch {
            // idem.
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

function persistOutings() {
  void AsyncStorage.setItem(OUTINGS_STORAGE_KEY, JSON.stringify(outings)).catch(() => {});
}

function persistRsvp() {
  void AsyncStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(rsvp)).catch(() => {});
}

// ─── Écritures (créer une sortie, répondre) ───────────────────────────────────

/**
 * Crée une sortie de crew (form court « Créer une sortie »). Textes déjà
 * nettoyés (trim) côté écran. Retourne la sortie créée. ZÉRO effet de jeu : une
 * sortie ne donne ni territoire ni point (§A.19).
 */
export function createOuting(input: {
  title: string;
  when: string;
  place: string;
  zone: string;
  objective: CrewOutingObjective;
}): SentCrewOuting {
  const now = Date.now();
  const outing: SentCrewOuting = {
    id: `outing_${now}`,
    title: input.title,
    when: input.when,
    place: input.place,
    zone: input.zone,
    objective: input.objective,
    host: CHAT_ME,
    createdAt: now,
  };
  outings = [outing, ...outings];
  persistOutings();
  emit();
  return outing;
}

/**
 * Répond à une sortie (RSVP). Toggle : re-taper la MÊME réponse la retire (je
 * change d'avis). Sinon on remplace ma réponse. Persisté. Retourne mon RSVP
 * résolu (null si retiré).
 */
export function setOutingRsvp(outingId: string, choice: OutingRsvp): OutingRsvp | null {
  const current = rsvp[outingId];
  const next = { ...rsvp };
  if (current === choice) {
    delete next[outingId];
    rsvp = next;
    persistRsvp();
    emit();
    return null;
  }
  next[outingId] = choice;
  rsvp = next;
  persistRsvp();
  emit();
  return choice;
}

/** RAZ (utilitaire démo / tests). */
export function resetOutings(): void {
  outings = [];
  rsvp = {};
  persistOutings();
  persistRsvp();
  emit();
}

// ─── Résolution des vues (démo + créées, avec mon RSVP + densité) ─────────────

/** Résout une sortie démo en vue affichable (seed + ma voix). PURE-ish (lit rsvp). */
function resolveDemo(o: DemoCrewOuting): OutingView {
  const myRsvp = rsvp[o.id] ?? null;
  return {
    id: o.id,
    title: o.title,
    when: o.when,
    place: o.place,
    zone: o.zone,
    objective: o.objective,
    host: o.host,
    mine: false,
    myRsvp,
    going: o.goingSeed + (myRsvp === 'Je viens' ? 1 : 0),
  };
}

/** Résout une sortie que j'ai créée en vue affichable. */
function resolveSent(o: SentCrewOuting): OutingView {
  const myRsvp = rsvp[o.id] ?? null;
  return {
    id: o.id,
    title: o.title,
    when: o.when,
    place: o.place,
    zone: o.zone,
    objective: o.objective,
    host: o.host,
    mine: true,
    myRsvp,
    // Une sortie que j'ai créée démarre à 0 (pas de seed) — ma voix « Je viens »
    // compte comme pour les autres.
    going: myRsvp === 'Je viens' ? 1 : 0,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return version;
}

export interface CrewOutingsStore {
  /** Sorties à venir résolues : les MIENNES d'abord (plus récentes), puis démo. */
  outings: readonly OutingView[];
  loaded: boolean;
}

/**
 * Hook des sorties de crew. Abonne l'écran au store (re-render à chaque création
 * / RSVP) et expose la liste résolue à afficher (démo + créées, mon RSVP fusionné).
 */
export function useCrewOutings(): CrewOutingsStore {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const mine = outings.map(resolveSent);
  const demo = DEMO_OUTINGS.map(resolveDemo);
  return { outings: [...mine, ...demo], loaded };
}
