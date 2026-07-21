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
import {
  ROUTE_SHAPES,
  ROUTE_TARGET_DISTANCE_MAX_M,
  ROUTE_TARGET_DISTANCE_MIN_M,
  type RouteShape,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isShowcasePlatform } from '../../lib/flags';

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

export interface UseRoutePrefsResult {
  /** false = vitrine / sans backend / déconnecté : aucun réglage possible. */
  ready: boolean;
  /** `null` = pas encore lu, ou lecture impossible. Jamais un défaut inventé. */
  prefs: RoutePrefs | null;
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

export function useRoutePrefs(): UseRoutePrefsResult {
  const { session } = useSession();
  const [prefs, setPrefs] = useState<RoutePrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  /** Miroir SYNCHRONE : le patch part d'ici, jamais d'un état React stale
   *  (même leçon que privacy/store.ts avec React 18 batché). */
  const prefsRef = useRef<RoutePrefs | null>(null);

  const ready = !isShowcasePlatform && !!supabase && !!session;

  useEffect(() => {
    if (!ready || !supabase) {
      prefsRef.current = null;
      setPrefs(null);
      setLoading(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await client.rpc('route_prefs_get');
        if (cancelled) return;
        const parsed = error ? null : parseRoutePrefs(data);
        prefsRef.current = parsed;
        setPrefs(parsed);
      } catch {
        if (cancelled) return;
        prefsRef.current = null;
        setPrefs(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  const save = useCallback(
    async (patch: Partial<Omit<RoutePrefs, 'learnFrom'>>): Promise<boolean> => {
      const before = prefsRef.current;
      if (!ready || !supabase || !before) return false;
      const next: RoutePrefs = { ...before, ...patch };
      // Optimiste : l'écran répond au tap tout de suite.
      prefsRef.current = next;
      setPrefs(next);
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
          prefsRef.current = before;
          setPrefs(before);
          return false;
        }
        // On affiche ce que le SERVEUR a écrit, pas ce qu'on lui a demandé.
        prefsRef.current = confirmed;
        setPrefs(confirmed);
        setRevision((r) => r + 1);
        return true;
      } catch {
        prefsRef.current = before;
        setPrefs(before);
        return false;
      }
    },
    [ready],
  );

  const forget = useCallback(async (): Promise<boolean> => {
    if (!ready || !supabase || !prefsRef.current) return false;
    try {
      const { data, error } = await supabase.rpc('route_prefs_forget');
      const confirmed = error ? null : parseRoutePrefs(data);
      if (!confirmed) return false;
      prefsRef.current = confirmed;
      setPrefs(confirmed);
      setRevision((r) => r + 1);
      return true;
    } catch {
      return false;
    }
  }, [ready]);

  return { ready, prefs, loading, save, forget, revision };
}
