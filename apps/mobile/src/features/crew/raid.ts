/**
 * GRYD — RAID WEEKEND crew (AMENDEMENT-34 §DELTA-CLASH, emprunt Clash of Clans
 * « Raid Weekend » rendu GRYD). Le SEL du format Clash : une OFFENSIVE COLLECTIVE
 * à fenêtre courte (RAID_DURATION_HOURS) dont la barre de progression est
 * PERSISTANTE et PARTAGÉE — chacun contribue, la jauge reste et monte pour tout
 * le crew (« Reprendre les quais · 620 / 1000 zones · 48 h restantes »).
 *
 * Ce store PERSISTE (AsyncStorage, calque events.ts / requests.ts : lecture lazy,
 * écriture fire-and-forget best-effort, useSyncExternalStore natif) MA
 * contribution démo au raid, par-dessus un raid démo statique (seed collectif).
 * Rejoindre puis « contribuer » (démo : le retour de course) fait monter la barre
 * COLLECTIVE et s'en souvient (reload → la barre reste). C'est la persistance de
 * la jauge qui fait le format, pas ma seule voix.
 *
 * MOTEUR MIROIRÉ (comme crew/rules.ts, motivation/rules.ts, run/loop.ts) : Metro
 * ne résout pas les imports Deno `.ts` de `@klaim/engine` ; on RÉ-IMPLÉMENTE ICI
 * `raidStatus` / `raidProgressPct` à l'identique de packages/engine/src/raid.ts.
 * Toute divergence serait un bug. Les seuils (durée, cible) viennent de
 * `@klaim/shared` (RAID_DURATION_HOURS / RAID_DEMO_TARGET_ZONES) — zéro nombre
 * magique.
 *
 * ANTI PAY-TO-WIN STRICT (§A.19) : un raid ne DONNE ni territoire bonus, ni
 * point, ni vitesse, ni protection. Il met EN SCÈNE, dans le temps, la conquête
 * que le crew fait de toute façon (le claim reste tranché serveur, §3). La barre
 * est un signal collectif de densité, jamais un classement de payeurs.
 *
 * Tout est LOCAL (démo). TODO(O1) : brancher un vrai `crew_raids` +
 * `crew_raid_contributions` via Edge Function — écriture client interdite (RLS).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RAID_DEMO_TARGET_ZONES,
  RAID_DURATION_HOURS,
} from '@klaim/shared';
import { CHAT_ME } from './chatStore';

/** Clé de persistance (versionnée, isolée comme events / requests). */
const RAID_STORAGE_KEY = 'gryd.crew.raid.v1';

// ─── Moteur MIROIRÉ (identique à packages/engine/src/raid.ts) ─────────────────

/** Statut nommé d'un raid crew (miroir engine — union stable pour l'UI). */
export type RaidStatus = 'active' | 'complete' | 'expired';

/** État d'un raid à évaluer (miroir RaidState engine, `now` fourni par l'appelant). */
export interface RaidState {
  now: Date;
  endsAt: Date;
  progress: number;
  target: number;
}

/**
 * Statut d'un raid (miroir `raidStatus`, PURE) : `complete` dès progress ≥ target
 * (cible > 0, prime sur l'échéance) ; sinon `active` avant endsAt ; sinon
 * `expired`. Cible ≤ 0 jamais « complete ».
 */
export function raidStatus(state: RaidState): RaidStatus {
  const { now, endsAt, progress, target } = state;
  if (target > 0 && progress >= target) return 'complete';
  return now.getTime() < endsAt.getTime() ? 'active' : 'expired';
}

/**
 * Progression d'un raid en fraction [0, 1] (miroir `raidProgressPct`, PURE).
 * Bornée : < 0 → 0, > 1 → 1 (la jauge sature). Cible ≤ 0 → 0.
 */
export function raidProgressPct(progress: number, target: number): number {
  if (target <= 0) return 0;
  const pct = progress / target;
  if (pct < 0) return 0;
  if (pct > 1) return 1;
  return pct;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * UN contributeur au raid (signal de densité, jamais un classement de payeurs).
 * `zones` = zones prises pendant la fenêtre — un compteur d'entraide, pas un
 * score de saison. `me` marque ma propre ligne une fois que j'ai contribué.
 */
export interface RaidContributor {
  pseudo: string;
  zones: number;
  me?: boolean;
}

/**
 * Un raid démo (statique). `title` = l'objectif narratif (« Reprendre les
 * quais »), `zone` = la zone cible. `startedAt` fige le départ de la fenêtre
 * (déterministe) ; l'échéance se dérive de RAID_DURATION_HOURS. `progressSeed`
 * = zones DÉJÀ prises collectivement (le crew a commencé sans moi). `target` =
 * cible de zones (RAID_DEMO_TARGET_ZONES en démo). `contributorsSeed` = têtes de
 * pont du crew (hors moi).
 */
export interface DemoRaid {
  id: string;
  title: string;
  zone: string;
  startedAt: number;
  progressSeed: number;
  target: number;
  contributorsSeed: readonly RaidContributor[];
}

/**
 * Vue d'un raid RÉSOLUE avec MA contribution persistée : barre collective
 * (seed + ma part), statut moteur, temps restant, liste courte de contributeurs.
 * C'est ce que l'écran Missions consomme.
 */
export interface RaidView {
  id: string;
  title: string;
  zone: string;
  /** Zones prises au total (seed collectif + ma contribution). Barre PARTAGÉE. */
  progress: number;
  target: number;
  /** Fraction [0,1] bornée (moteur miroiré). */
  pct: number;
  /** Statut moteur (active / complete / expired). */
  status: RaidStatus;
  /** Heures restantes AVANT l'échéance, planché à 0 (fractionnaire → l'UI arrondit). */
  hoursLeft: number;
  /** Ai-je déjà rejoint (contribué) ? Pilote le libellé du CTA (REJOINDRE / COURIR). */
  joined: boolean;
  /** Liste courte de contributeurs (seed + moi si j'ai contribué), plus actifs d'abord. */
  contributors: readonly RaidContributor[];
}

// ─── Raid démo (statique, déterministe) ───────────────────────────────────────

/**
 * Fenêtre du raid démo figée relative à l'ouverture de session (déterministe au
 * sein d'une session sans dépendre du mur d'horloge absolu) : démarré il y a
 * 4 h → il reste ~44 h sur les RAID_DURATION_HOURS. Un multiplicateur d'unité
 * (ms/h), pas une constante de jeu.
 */
const MS_PER_HOUR = 3_600_000;
const RAID_STARTED_HOURS_AGO = 4;

/**
 * LE raid démo du crew (un seul à la fois en démo). progressSeed 620 /
 * RAID_DEMO_TARGET_ZONES (1000) → barre à 62 % avant même que je rejoigne : le
 * crew a déjà bien avancé, ma contribution s'ajoute par-dessus. Contributeurs =
 * têtes de pont (hors moi), triés par zones décroissantes.
 */
export const DEMO_RAID: DemoRaid = {
  id: 'raid_quais_s0',
  title: 'Reprendre les quais',
  zone: 'Quais de Seine',
  startedAt: Date.now() - RAID_STARTED_HOURS_AGO * MS_PER_HOUR,
  progressSeed: 620,
  target: RAID_DEMO_TARGET_ZONES,
  contributorsSeed: [
    { pseudo: 'LENA_RUN', zones: 184 },
    { pseudo: 'MOLOKAÏ', zones: 152 },
    { pseudo: 'JOG.PARMENTIER', zones: 118 },
    { pseudo: 'PACER·20E', zones: 96 },
    { pseudo: 'TOUTDROIT', zones: 70 },
  ],
};

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

/** Ma contribution persistée au raid : raidId → zones prises par MOI. */
let myZones: Record<string, number> = {};
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
    loadPromise = AsyncStorage.getItem(RAID_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, number>;
            if (parsed && typeof parsed === 'object') {
              // On ne garde que les entrées numériques ≥ 0 (best effort).
              const clean: Record<string, number> = {};
              for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === 'number' && v > 0) clean[k] = v;
              }
              myZones = clean;
            }
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
  void AsyncStorage.setItem(RAID_STORAGE_KEY, JSON.stringify(myZones)).catch(() => {});
}

// ─── Écritures (rejoindre / contribuer) ───────────────────────────────────────

/**
 * Zones que J'AJOUTE quand je « contribue » au raid (démo : le retour d'une
 * course qui a pris des zones). Valeur de démo — l'unité de la jauge, pas une
 * règle de jeu (le vrai delta viendra d'un run réel côté serveur).
 */
const DEMO_CONTRIBUTION_ZONES = 8;

/**
 * Rejoindre / contribuer au raid : ajoute ma part à la barre COLLECTIVE (elle
 * monte pour tout le crew) et persiste. Idempotent-cumulatif : re-contribuer
 * ajoute encore (chacun contribue, la barre reste). ZÉRO effet de jeu : ne donne
 * ni territoire ni point (§A.19) — c'est une mise en scène du run normal.
 */
export function contributeToRaid(
  raidId: string,
  zones: number = DEMO_CONTRIBUTION_ZONES,
): void {
  const add = Math.max(0, Math.floor(zones));
  if (add <= 0) return;
  myZones = { ...myZones, [raidId]: (myZones[raidId] ?? 0) + add };
  persist();
  emit();
}

/** RAZ (utilitaire démo / tests). */
export function resetRaid(): void {
  myZones = {};
  persist();
  emit();
}

// ─── Résolution de la vue (seed collectif + ma contribution + moteur) ─────────

/** Résout le raid démo en vue affichable (barre partagée + statut moteur). PURE-ish. */
function resolve(raid: DemoRaid, now: Date): RaidView {
  const mine = myZones[raid.id] ?? 0;
  const progress = raid.progressSeed + mine;
  const endsAt = new Date(raid.startedAt + RAID_DURATION_HOURS * MS_PER_HOUR);
  const status = raidStatus({ now, endsAt, progress, target: raid.target });
  const leftMs = endsAt.getTime() - now.getTime();
  const hoursLeft = leftMs <= 0 ? 0 : leftMs / MS_PER_HOUR;
  // Contributeurs : le seed + MOI si j'ai contribué, triés zones décroissantes.
  const withMe: RaidContributor[] = mine > 0
    ? [...raid.contributorsSeed, { pseudo: CHAT_ME, zones: mine, me: true }]
    : [...raid.contributorsSeed];
  withMe.sort((a, b) => b.zones - a.zones);
  return {
    id: raid.id,
    title: raid.title,
    zone: raid.zone,
    progress,
    target: raid.target,
    pct: raidProgressPct(progress, raid.target),
    status,
    hoursLeft,
    joined: mine > 0,
    contributors: withMe,
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

export interface CrewRaidStore {
  /** Le raid actif résolu (barre partagée + ma contribution), ou null si aucun. */
  raid: RaidView | null;
  loaded: boolean;
}

/**
 * Hook du raid crew. Abonne l'écran au store (re-render à chaque contribution) et
 * expose le raid résolu à afficher. `now` est capturé au rendu — l'écran peut
 * re-render (ex. tick de countdown) pour rafraîchir le statut/temps restant.
 */
export function useCrewRaid(): CrewRaidStore {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const raid = resolve(DEMO_RAID, new Date());
  return { raid, loaded };
}
