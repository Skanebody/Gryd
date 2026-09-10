/**
 * GRYD — MISSION REVANCHE crew (AMENDEMENT-34 §DELTA-CLASH, emprunt Clash of
 * Clans « rendre la pareille » rendu GRYD). Quand un rival a repris TON secteur,
 * une fenêtre de REVANCHE de REVANCHE_WINDOW_HOURS s'ouvre : une mission URGENTE
 * avec compte à rebours 24 h qui invite à re-courir la zone. Passé le délai, la
 * mission se ferme d'elle-même — pas de rancune permanente.
 *
 * Ce store PERSISTE (AsyncStorage, calque events.ts / requests.ts : lecture lazy,
 * écriture fire-and-forget best-effort, useSyncExternalStore natif) l'INSTANT de
 * déclenchement de la revanche.
 * Le timestamp persiste → le compte à rebours reste cohérent au reload (il ne se
 * remet pas à 24 h à chaque ouverture d'app). Marquer la revanche « faite » la
 * retire (je suis allé reprendre, ou j'ai laissé filer).
 *
 * MOTEUR MIROIRÉ (comme crew/rules.ts, motivation/rules.ts, run/loop.ts) : Metro
 * ne résout pas les imports Deno `.ts` de `@klaim/engine` ; on RÉ-IMPLÉMENTE ICI
 * `revancheActive` / `revancheHoursLeft` / `revancheExpiry` à l'identique de
 * packages/engine/src/revanche.ts. Toute divergence serait un bug. La fenêtre
 * (REVANCHE_WINDOW_HOURS) vient de `@klaim/shared` — zéro nombre magique.
 *
 * ANTI PAY-TO-WIN STRICT (§A.19) : la revanche ne donne NI point, NI territoire
 * supplémentaire, NI protection, NI vitesse. C'est un MARQUEUR temporel (statut
 * / signal social « prends ta revanche ») — le gain éventuel reste celui des
 * règles NORMALES de reprise/vol (§3.4), tranché serveur. On ne révèle JAMAIS la
 * position exacte du rival, seulement le SECTEUR concerné.
 *
 * Tout est LOCAL, et VIDE : plus aucun déclencheur n'est fabriqué (10/09/2026 —
 * un rival « MEUTE 20 » et « 14 zones perdues » étaient posés au premier
 * lancement). Reste à brancher un vrai `revanche_windows` alimenté par les
 * événements de vol/reprise via Edge Function — écriture client interdite (RLS).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REVANCHE_WINDOW_HOURS } from '@klaim/shared';

/** Clé de persistance (versionnée, isolée comme events / requests / raid). */
const REVANCHE_STORAGE_KEY = 'gryd.crew.revanche.v1';

// Conversion d'unités — pas une règle de jeu.
const MS_PER_HOUR = 3_600_000;

// ─── Moteur MIROIRÉ (identique à packages/engine/src/revanche.ts) ─────────────

/** Instant d'expiration de la fenêtre (miroir `revancheExpiry`, PURE). */
export function revancheExpiry(
  triggeredAt: Date,
  windowH: number = REVANCHE_WINDOW_HOURS,
): Date {
  return new Date(triggeredAt.getTime() + windowH * MS_PER_HOUR);
}

/**
 * La fenêtre est-elle OUVERTE à `now` (miroir `revancheActive`, PURE) ? Ouverte
 * sur [triggeredAt, triggeredAt + windowH). `now` antérieur au déclenchement →
 * false.
 */
export function revancheActive(
  triggeredAt: Date,
  now: Date,
  windowH: number = REVANCHE_WINDOW_HOURS,
): boolean {
  const t = triggeredAt.getTime();
  const n = now.getTime();
  return n >= t && n < revancheExpiry(triggeredAt, windowH).getTime();
}

/**
 * Heures restantes avant expiration (miroir `revancheHoursLeft`, PURE). Borné à
 * 0. Valeur fractionnaire (l'appelant arrondit pour l'affichage).
 */
export function revancheHoursLeft(
  triggeredAt: Date,
  now: Date,
  windowH: number = REVANCHE_WINDOW_HOURS,
): number {
  const leftMs = revancheExpiry(triggeredAt, windowH).getTime() - now.getTime();
  return leftMs <= 0 ? 0 : leftMs / MS_PER_HOUR;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Une revanche déclenchée : un rival a repris MON secteur. On ne stocke QUE le
 * secteur + le crew rival + un compteur de zones perdues + l'instant de
 * déclenchement. JAMAIS de position exacte du rival (§C, anti-traque).
 */
export interface RevancheTrigger {
  /** Secteur concerné (zone reprise), jamais une position GPS. */
  sector: string;
  /** Nom du crew rival qui a repris (signal social, pas une cible sur carte). */
  rivalCrew: string;
  /** Nombre de zones que le rival m'a reprises (ampleur, pas un score). */
  zonesLost: number;
  /** Instant de déclenchement (ms epoch) — ancre le compte à rebours 24 h. */
  triggeredAt: number;
}

/**
 * Vue d'une revanche RÉSOLUE : le déclencheur + le statut de fenêtre calculé au
 * moteur (active ?), heures restantes. C'est ce que l'écran Missions consomme.
 * `null` (côté store) si aucune revanche en cours OU si la fenêtre est expirée.
 */
export interface RevancheView {
  sector: string;
  rivalCrew: string;
  zonesLost: number;
  triggeredAt: number;
  /** Heures restantes avant expiration, planché à 0 (l'UI arrondit). */
  hoursLeft: number;
}

// ─── AUCUN DÉCLENCHEUR FABRIQUÉ ──────────────────────────────────────────────
//
// RETIRÉ LE 10/09/2026. Ce fichier posait au premier lancement une revanche
// INVENTÉE — secteur « Buttes-Chaumont », rival « MEUTE 20 », « 14 zones
// perdues » — et la PERSISTAIT dans AsyncStorage. C'était de la donnée factice
// vivante : un crew rival qui n'existe pas, un quartier qui n'est pas celui du
// joueur, et un compte à rebours sur un vol qui n'a jamais eu lieu. Le dépôt
// s'interdit ça sans exception (« zéro donnée factice », CLAUDE.md).
//
// Le store reste donc VIDE tant que rien de réel ne l'alimente, et c'est un
// état honnête : `useCrewRevanche()` rend `null`, aucun écran ne peint de
// mission. `triggerRevanche()` existe toujours pour le jour où un événement
// serveur de reprise (Edge Function, écriture client interdite par la RLS)
// aura une porte — il n'en a aucune aujourd'hui, et ce fichier ne prétend
// plus le contraire.

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

/** La revanche courante persistée (null = aucune / marquée faite). */
let trigger: RevancheTrigger | null = null;
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
    loadPromise = AsyncStorage.getItem(REVANCHE_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            // `seeded` a existé dans ce payload jusqu'au 10/09/2026 (il armait
            // le déclencheur fabriqué). Une clé en trop est ignorée, aucune
            // migration de stockage n'est nécessaire.
            const parsed = JSON.parse(raw) as { trigger: RevancheTrigger | null };
            if (parsed && typeof parsed === 'object') trigger = parsed.trigger ?? null;
          } catch {
            // corpus corrompu → on repart propre (best effort).
          }
        }
        // Rien n'est posé au premier lancement : sans événement réel, il n'y a
        // pas de revanche, et une absence n'a pas besoin d'être remplie.
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
  void AsyncStorage.setItem(
    REVANCHE_STORAGE_KEY,
    JSON.stringify({ trigger }),
  ).catch(() => {});
}

// ─── Écritures (déclencher / marquer fait) ────────────────────────────────────

/**
 * Déclenche une revanche à partir d'un fait RÉEL (un rival vient de reprendre
 * un secteur). Ancre le compte à rebours à maintenant. ZÉRO effet de jeu : ne
 * donne ni territoire ni point (§A.19).
 *
 * ⚠ AUCUN APPELANT AUJOURD'HUI, et c'est dit plutôt que masqué : la source
 * serait un événement serveur de vol/reprise, qui n'existe pas encore. Cette
 * fonction n'est PAS une porte de démonstration — lui passer des noms inventés
 * remettrait exactement la donnée factice qu'on vient de retirer.
 */
export function triggerRevanche(input: {
  sector: string;
  rivalCrew: string;
  zonesLost: number;
}): void {
  trigger = {
    sector: input.sector,
    rivalCrew: input.rivalCrew,
    zonesLost: Math.max(0, Math.floor(input.zonesLost)),
    triggeredAt: Date.now(),
  };
  persist();
  emit();
}

/**
 * Marque la revanche « faite » (je suis allé reprendre, ou je laisse filer) :
 * ferme la mission. Rien ne la ré-arme.
 */
export function clearRevanche(): void {
  trigger = null;
  persist();
  emit();
}

/** RAZ complète (tests) : le store repart vide, et le reste. */
export function resetRevanche(): void {
  trigger = null;
  persist();
  emit();
}

// ─── Résolution de la vue (moteur : fenêtre ouverte ?) ────────────────────────

/**
 * Résout la revanche courante en vue affichable, ou null si aucune / EXPIRÉE.
 * La fenêtre est vérifiée au moteur miroiré (`revancheActive`) : une revanche
 * dont les 24 h sont passées ne s'affiche plus (elle est logiquement close même
 * si le trigger reste en mémoire jusqu'à la prochaine écriture). PURE-ish.
 */
function resolve(now: Date): RevancheView | null {
  if (!trigger) return null;
  const at = new Date(trigger.triggeredAt);
  if (!revancheActive(at, now)) return null;
  return {
    sector: trigger.sector,
    rivalCrew: trigger.rivalCrew,
    zonesLost: trigger.zonesLost,
    triggeredAt: trigger.triggeredAt,
    hoursLeft: revancheHoursLeft(at, now),
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

export interface CrewRevancheStore {
  /** La revanche active résolue (fenêtre ouverte), ou null. */
  revanche: RevancheView | null;
  loaded: boolean;
}

/**
 * Hook de la mission revanche. Abonne l'écran au store et expose la revanche
 * résolue (null si aucune / expirée). `now` capturé au rendu — l'écran peut
 * re-render (tick de countdown) pour rafraîchir les heures restantes et faire
 * disparaître la mission à l'expiration.
 */
export function useCrewRevanche(): CrewRevancheStore {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const revanche = resolve(new Date());
  return { revanche, loaded };
}
