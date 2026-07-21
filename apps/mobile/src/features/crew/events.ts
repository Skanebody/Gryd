/**
 * GRYD — SORTIES de crew (AMENDEMENT-32 §1, emprunt « club events » Strava rendu
 * GRYD). Planifier une sortie = titre + heure + lieu de RDV + ZONE CIBLE avec un
 * objectif (défense/conquête). Liste des sorties à venir dans le Crew HQ, RSVP
 * « Je viens », et création d'une sortie via un form court.
 *
 * Ce store PERSISTE (AsyncStorage, calque requests.ts / reactions.ts : lecture
 * lazy, écriture fire-and-forget best-effort, useSyncExternalStore natif React)
 * DEUX choses :
 *   1. Les sorties que J'AI créées (form « Créer une sortie »).
 *   2. Mon RSVP par sortie : « Je viens » / « Peut-être » / « Indispo ». Mon
 *      RSVP se SOUVIENT (reload → mon choix reste).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 21/07/2026 (AMENDEMENT-47) ──────────────────────
 * `eventsDemo.ts` et ses trois SORTIES FABRIQUÉES (« Défense République · Ce
 * soir 19:00 », hébergées par « LENA_RUN » et « MEHDI93 », avec un compteur de
 * participants de départ : 6, 4 et 9 personnes). Elles étaient présentées comme
 * l'agenda du crew : des inconnus donnaient rendez-vous à une heure et un lieu
 * précis — « Métro République, sortie Magenta » — où personne ne serait venu.
 * C'est la donnée fabriquée la plus coûteuse du lot : celle qui fait SORTIR
 * quelqu'un de chez lui.
 *
 * `useCrewOutings` ne renvoie donc plus que MES sorties. Aucun écran ne le
 * consomme aujourd'hui (le Crew HQ réel ne montre pas encore les sorties) : la
 * liste vide est le seul état honnête tant que `crew_events` n'est pas lu.
 *
 * §A.19 : SOCIAL, PAS DE MONÉTISATION. Une sortie ne donne JAMAIS de territoire,
 * de point ni de rang — courir ensemble = coordination + densité (le moat). Le
 * compteur « X viennent » est un signal de densité, pas un classement. Le claim
 * reste décidé serveur (§3). Tout est LOCAL. TODO(O1) : brancher
 * crew_events / crew_event_rsvps (0011) via Edge Function — écriture client
 * interdite côté DB (RLS).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/crew';
import { CHAT_ME } from './chatStore';

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
 * Vue d'une sortie affichable, résolue avec MON RSVP et le total « viennent ».
 * C'est ce que l'écran consomme.
 */
export interface OutingView {
  id: string;
  title: string;
  when: string;
  place: string;
  zone: string;
  objective: CrewOutingObjective;
  host: string;
  /** Est-ce une sortie que j'ai créée moi-même ? */
  mine: boolean;
  /** Mon RSVP courant, ou null si je n'ai pas encore répondu. */
  myRsvp: OutingRsvp | null;
  /**
   * Total « Je viens » — aujourd'hui MA seule voix (1 si je viens, sinon 0).
   * Les RSVP des autres membres sont dans `crew_event_rsvps`, que le client ne
   * lit pas encore : on compte ce qu'on sait, jamais un total supposé.
   */
  going: number;
}

/** Libellé humain de l'objectif (non tronqué, court) — Entry résolue par t(). */
export function objectiveLabel(objective: CrewOutingObjective): Entry {
  return objective === 'defense' ? C.objectiveDefense : C.objectiveConquete;
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
    // Une sortie démarre à 0 — ma voix « Je viens » est la seule que le client
    // connaisse tant que les RSVP des autres ne sont pas lus au serveur.
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
  /** MES sorties à venir, les plus récentes d'abord. Vide tant que je n'en crée pas. */
  outings: readonly OutingView[];
  /**
   * La lecture AsyncStorage est terminée. Un écran doit attendre `loaded` avant
   * de conclure « aucune sortie » : sinon il affirme le vide pendant le
   * chargement, ce qui est faux pour qui vient d'en créer une.
   */
  loaded: boolean;
}

/**
 * Hook des sorties de crew. Abonne l'écran au store (re-render à chaque création
 * / RSVP) et expose MES sorties résolues avec mon RSVP.
 */
export function useCrewOutings(): CrewOutingsStore {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { outings: outings.map(resolveSent), loaded };
}
