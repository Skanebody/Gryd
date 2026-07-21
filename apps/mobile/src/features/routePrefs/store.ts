/**
 * GRYD — PRÉFÉRENCES DE PARCOURS (demande fondateur 21/07). Câblage React des
 * RPC `route_prefs_get` / `route_prefs_set` / `route_prefs_forget`
 * (migration 0054).
 *
 * ═══ POURQUOI CE STORE N'EST PAS COMME privacy/store.ts ═════════════════════
 * `privacy/store.ts` et `motivation/store.ts` persistent en AsyncStorage : ils
 * pilotent un FILTRAGE D'AFFICHAGE côté client, donc le téléphone est l'endroit
 * légitime pour les garder. Ici, deux raisons rendent le local insuffisant :
 *
 *   1. La demande fondateur est explicite sur la durée de vie — ces réglages
 *      doivent survivre à un changement de téléphone. AsyncStorage meurt avec
 *      l'appareil.
 *   2. La proposition de parcours est calculée SERVEUR. Un serveur ne peut pas
 *      respecter une préférence qui ne quitte jamais le téléphone. C'est la même
 *      leçon que `push_devices` (0048) : sans miroir serveur, « notifications
 *      off » ne coupait rien. Ici, « apprentissage off » ne couperait rien.
 *
 * Donc : le SERVEUR est la source de vérité, il n'y a AUCUN cache local. Un
 * cache introduirait la seule chose que la doctrine interdit — un écran qui
 * affiche « apprentissage désactivé » pendant que le serveur continue
 * d'apprendre. Sans session ni backend : `prefs === null`, l'écran le DIT et
 * ne propose aucun réglage (plutôt qu'un réglage qui n'irait nulle part).
 *
 * Écriture OPTIMISTE mais jamais menteuse : on affiche la valeur tapée
 * immédiatement, et si le serveur refuse ou si le réseau tombe, on REVIENT à la
 * valeur précédente et l'appelant affiche l'échec. Un interrupteur qui reste
 * visuellement basculé après un échec d'écriture est un mensonge d'écran.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ROUTE_SHAPES,
  ROUTE_TARGET_DISTANCE_MAX_M,
  ROUTE_TARGET_DISTANCE_MIN_M,
  type RouteShape,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

/** L'état complet réglé par l'utilisateur (miroir exact de `route_preferences`). */
export interface RoutePrefs {
  /** L'interrupteur d'apprentissage. Défaut serveur : true. */
  learningEnabled: boolean;
  /** Distance visée fixée à la main (m), ou `null` = « Auto ». */
  targetDistanceM: number | null;
  routeShape: RouteShape;
  avoidHills: boolean;
  /**
   * Depuis quand GRYD a le droit d'apprendre (ms epoch), `null` = tout
   * l'historique. Posé par « oublier ». Lecture seule côté écran.
   */
  learnFrom: number | null;
}

/**
 * Les défauts sont DITS PAR LE SERVEUR (`route_prefs_get` d'un compte sans
 * ligne). Cette constante n'existe que comme forme de repli du parsing — elle
 * ne doit jamais être affichée à la place d'une lecture ratée (on affiche
 * l'échec, pas un défaut inventé).
 */
export const ROUTE_PREFS_FALLBACK: RoutePrefs = {
  learningEnabled: true,
  targetDistanceM: null,
  routeShape: 'any',
  avoidHills: false,
  learnFrom: null,
};

function asMs(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * jsonb → RoutePrefs, ou `null` si la forme n'est pas celle attendue (refus,
 * réseau, contrat futur). On ne « répare » jamais une réponse partielle : un
 * réglage à moitié lu affiché comme complet serait faux.
 */
export function parseRoutePrefs(raw: unknown): RoutePrefs | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return null;
  if (typeof root.learningEnabled !== 'boolean') return null;
  if (typeof root.avoidHills !== 'boolean') return null;
  const shape = root.routeShape;
  if (typeof shape !== 'string' || !(ROUTE_SHAPES as readonly string[]).includes(shape)) {
    return null;
  }
  let target: number | null = null;
  if (root.targetDistanceM !== null && root.targetDistanceM !== undefined) {
    const n = root.targetDistanceM;
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    // Une valeur hors bornes ne peut pas venir du serveur (contrainte SQL) :
    // si elle arrive, la réponse n'est pas celle qu'on croit → on écarte tout.
    if (n < ROUTE_TARGET_DISTANCE_MIN_M || n > ROUTE_TARGET_DISTANCE_MAX_M) return null;
    target = Math.round(n);
  }
  return {
    learningEnabled: root.learningEnabled,
    targetDistanceM: target,
    routeShape: shape as RouteShape,
    avoidHills: root.avoidHills,
    learnFrom: asMs(root.learnFrom),
  };
}

/**
 * L'ISSUE de la lecture — quatre valeurs, parce qu'il y a quatre situations et
 * qu'elles n'appellent pas la même phrase.
 *
 * `prefs === null` ne suffisait pas : il valait `null` pendant la lecture, après
 * un échec, ET hors session. Les appelants n'avaient donc aucun moyen de
 * distinguer « on ne sait pas encore » de « on n'a pas pu lire » — et l'un
 * d'eux traduisait ce `null` en « l'utilisateur a coupé l'apprentissage »
 * (`?? false`), c'est-à-dire une affirmation sur un réglage jamais lu.
 * Le statut existe pour que cette confusion soit impossible à réécrire.
 */
export type RoutePrefsStatus =
  /** Aucune réponse encore. On n'affirme rien. */
  | 'loading'
  /** Rien à lire : pas de backend, ou déconnecté. */
  | 'unavailable'
  /** La lecture a échoué (réseau, refus, contrat). PAS un choix du joueur. */
  | 'error'
  /** Le serveur a répondu : `prefs` est renseigné et fait foi. */
  | 'ready';

export interface UseRoutePrefsResult {
  /** false = sans backend / déconnecté : aucun réglage possible. */
  ready: boolean;
  /** `null` = pas encore lu, ou lecture impossible. Jamais un défaut inventé. */
  prefs: RoutePrefs | null;
  /** Pourquoi `prefs` vaut ce qu'il vaut. Non nul EXACTEMENT quand `status === 'ready'`. */
  status: RoutePrefsStatus;
  /** True tant que la première lecture n'a pas répondu. */
  loading: boolean;
  /**
   * Applique un patch et l'enregistre. Retourne `false` si le serveur a refusé
   * ou si le réseau a lâché — l'état affiché est alors REVENU en arrière, et
   * l'appelant doit le dire.
   */
  save: (patch: Partial<Omit<RoutePrefs, 'learnFrom'>>) => Promise<boolean>;
  /** « Oublier ce que GRYD a appris ». Ne supprime aucune course. */
  forget: () => Promise<boolean>;
  /** Numéro de révision : change à chaque écriture réussie (re-lecture des
   *  habitudes déduites, qui dépendent de l'apprentissage). */
  revision: number;
}

/**
 * ═══ INVALIDATION PARTAGÉE — POURQUOI CE MODULE A UN ÉTAT GLOBAL ════════════
 * `useRoutePrefs` est un hook : chaque écran qui l'appelle obtient SA copie de
 * l'état, lue une fois au montage. L'écran de réglages et le planificateur en
 * avaient donc deux, sans aucun lien entre elles. Couper l'apprentissage dans
 * « Mes parcours » n'informait rien : le planificateur déjà monté gardait sa
 * lecture d'avant et continuait d'afficher « adapté à tes habitudes ». Le type
 * n'était jamais violé — c'était l'ENTRÉE qui était périmée.
 *
 * Ce compteur est le lien manquant. Toute écriture ACCEPTÉE par le serveur le
 * fait avancer, et TOUTES les instances montées relisent. Il n'y a pas de cache
 * partagé (le serveur reste la seule vérité, cf. l'en-tête) : on partage
 * uniquement le signal « ce que tu as lu est périmé ».
 */
let writeEpoch = 0;
const epochListeners = new Set<(e: number) => void>();

/** Une écriture a été confirmée : toutes les instances doivent relire. */
function bumpWriteEpoch(): void {
  writeEpoch += 1;
  for (const notify of epochListeners) notify(writeEpoch);
}

/** Égalité de CONTENU — sert à ne pas faire avancer `revision` pour rien. */
function samePrefs(a: RoutePrefs | null, b: RoutePrefs | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.learningEnabled === b.learningEnabled &&
    a.targetDistanceM === b.targetDistanceM &&
    a.routeShape === b.routeShape &&
    a.avoidHills === b.avoidHills &&
    a.learnFrom === b.learnFrom
  );
}

export function useRoutePrefs(): UseRoutePrefsResult {
  const { session } = useSession();
  const [prefs, setPrefs] = useState<RoutePrefs | null>(null);
  const [status, setStatus] = useState<RoutePrefsStatus>('loading');
  const [revision, setRevision] = useState(0);
  /** Dernière écriture connue de l'app (toutes instances confondues). */
  const [epoch, setEpoch] = useState(writeEpoch);
  /** Avance à chaque retour sur l'écran : force une relecture (multi-appareils). */
  const [focusTick, setFocusTick] = useState(0);
  /** Miroir SYNCHRONE : le patch part d'ici, jamais d'un état React stale
   *  (même leçon que privacy/store.ts avec React 18 batché). */
  const prefsRef = useRef<RoutePrefs | null>(null);

  const ready = !!supabase && !!session;

  /**
   * Pose le résultat d'une lecture ou d'une écriture. `revision` n'avance que si
   * le CONTENU a changé : c'est le signal que les dérivés (profil d'habitudes)
   * doivent être relus, et une relecture identique n'a rien à leur apprendre.
   */
  const applyPrefs = useCallback((next: RoutePrefs | null, nextStatus: RoutePrefsStatus) => {
    const changed = !samePrefs(prefsRef.current, next);
    prefsRef.current = next;
    setPrefs(next);
    setStatus(nextStatus);
    if (changed) setRevision((r) => r + 1);
  }, []);

  // Abonnement au signal d'écriture : une autre instance a modifié les
  // réglages ⇒ ce que cette instance affiche est périmé, elle relit.
  useEffect(() => {
    const notify = (e: number) => setEpoch(e);
    epochListeners.add(notify);
    return () => {
      epochListeners.delete(notify);
    };
  }, []);

  useEffect(() => {
    if (!ready || !supabase) {
      applyPrefs(null, 'unavailable');
      return;
    }
    const client = supabase;
    let cancelled = false;
    // Une RELECTURE ne repasse pas en `loading` : l'écran garde ce qu'il
    // affichait (qui est encore la dernière chose vraie qu'on ait lue) au lieu
    // de clignoter en spinner à chaque retour sur l'onglet.
    if (prefsRef.current === null) setStatus('loading');
    void (async () => {
      try {
        const { data, error } = await client.rpc('route_prefs_get');
        if (cancelled) return;
        const parsed = error ? null : parseRoutePrefs(data);
        // Réponse illisible ou refusée : `error`, JAMAIS `unavailable` et
        // surtout jamais un défaut — l'appelant doit pouvoir dire « on n'a pas
        // pu lire » sans le confondre avec « tu as coupé l'apprentissage ».
        applyPrefs(parsed, parsed === null ? 'error' : 'ready');
      } catch {
        if (cancelled) return;
        applyPrefs(null, 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, epoch, focusTick, applyPrefs]);

  /**
   * Retour sur l'écran ⇒ relecture. Le premier focus est sauté (la lecture au
   * montage suffit — même patron que useDailyFocus). C'est ce qui rend le cas
   * MULTI-APPAREILS honnête : l'apprentissage coupé depuis un autre téléphone
   * n'a laissé aucune trace locale, seule une relecture peut l'apprendre.
   */
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      setFocusTick((t) => t + 1);
    }, []),
  );

  const save = useCallback(
    async (patch: Partial<Omit<RoutePrefs, 'learnFrom'>>): Promise<boolean> => {
      const before = prefsRef.current;
      if (!ready || !supabase || !before) return false;
      const next: RoutePrefs = { ...before, ...patch };
      // Optimiste : l'écran répond au tap tout de suite.
      applyPrefs(next, 'ready');
      try {
        // État COMPLET, jamais un patch : `null` sur la distance veut dire
        // « Auto », il ne peut donc pas vouloir dire aussi « ne change pas ».
        const { data, error } = await supabase.rpc('route_prefs_set', {
          p_learning_enabled: next.learningEnabled,
          p_target_distance_m: next.targetDistanceM,
          p_route_shape: next.routeShape,
          p_avoid_hills: next.avoidHills,
        });
        const confirmed = error ? null : parseRoutePrefs(data);
        if (!confirmed) {
          // Refus serveur (bornes, session) ou transport : on REVIENT.
          applyPrefs(before, 'ready');
          return false;
        }
        // On affiche ce que le SERVEUR a écrit, pas ce qu'on lui a demandé.
        applyPrefs(confirmed, 'ready');
        // Les AUTRES écrans montés affichent encore les réglages d'avant :
        // sans ce signal, couper l'apprentissage ici laisserait le
        // planificateur dire « adapté à tes habitudes » jusqu'à son remontage.
        bumpWriteEpoch();
        return true;
      } catch {
        applyPrefs(before, 'ready');
        return false;
      }
    },
    [ready, applyPrefs],
  );

  const forget = useCallback(async (): Promise<boolean> => {
    if (!ready || !supabase || !prefsRef.current) return false;
    try {
      const { data, error } = await supabase.rpc('route_prefs_forget');
      const confirmed = error ? null : parseRoutePrefs(data);
      if (!confirmed) return false;
      applyPrefs(confirmed, 'ready');
      // « Oublier » ne change PAS `learningEnabled` — seulement `learnFrom`.
      // Sans ce signal, la distance proposée ailleurs resterait celle déduite
      // de courses que le joueur vient de demander d'oublier.
      bumpWriteEpoch();
      return true;
    } catch {
      return false;
    }
  }, [ready, applyPrefs]);

  return { ready, prefs, status, loading: status === 'loading', save, forget, revision };
}
