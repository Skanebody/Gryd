/**
 * GRYD — LECTURE ET ÉCRITURE SERVEUR des réglages d'audience. L'I/O, et rien
 * d'autre : la forme et les verdicts vivent dans `./audience.ts` (pur, testé).
 *
 * ÉCRITURE PAR RPC, PAS EN DIRECT : `user_profiles` n'accorde ses colonnes
 * qu'à travers une policy `update_self` (0011) — mais `save_privacy_settings_2026`
 * (0135) est la SEULE porte qui valide les trois domaines, refuse proprement
 * l'absence de profil et rend l'état effectivement appliqué. Le client obéit à
 * ce verdict au lieu de recopier ce qu'il croit avoir écrit.
 *
 * AUCUN REPLI INVENTÉ : `signed-out`, `loading`, `failed` et `ready` sont quatre
 * phrases différentes. Un échec de lecture n'affiche jamais « tout est fermé ».
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import {
  parsePrivacyAudience,
  privacyWriteFailure,
  type PrivacyAudience,
  type PrivacyAudienceRead,
  type PrivacyAudienceWrite,
} from './audience';
import {
  traceRetentionWriteFailure,
  type TraceRetentionChoice2026,
  type TraceRetentionWrite,
} from './traceRetention';

export interface PrivacyAudienceStore {
  readonly read: PrivacyAudienceRead;
  /** Rejoue la lecture (bouton « Réessayer » de l'état `failed`). */
  readonly reload: () => void;
  /** True pendant une écriture : l'écran désactive les contrôles concernés. */
  readonly saving: boolean;
  /** Écrit les trois réglages et rend le verdict SERVEUR. */
  readonly save: (next: PrivacyAudience) => Promise<PrivacyAudienceWrite>;
  /**
   * Écrit la CONSERVATION DES TRACÉS (0195) et rend le verdict SERVEUR.
   *
   * RPC SÉPARÉE, pas un quatrième paramètre de `save_privacy_settings_2026` :
   * les trois réglages d'audience gouvernent ce que les AUTRES voient, celui-ci
   * ce que TU gardes. Deux décisions, deux portes — et la signature de 0135
   * reste intacte pour les clients déjà déployés.
   */
  readonly saveTraceRetention: (
    choice: TraceRetentionChoice2026,
  ) => Promise<TraceRetentionWrite>;
}

export function usePrivacyAudience(): PrivacyAudienceStore {
  const { session, loading: sessionLoading, configured } = useSession();
  const userId = session?.user?.id ?? null;
  const [read, setRead] = useState<PrivacyAudienceRead>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(0);
  /** Le compte pour lequel l'état courant a été lu : une bascule de session ne
   *  doit jamais laisser les réglages de l'ancien compte à l'écran. */
  const owner = useRef<string | null>(null);
  owner.current = userId;

  useEffect(() => {
    if (sessionLoading) {
      setRead({ status: 'loading' });
      return;
    }
    if (!configured || !supabase || userId === null) {
      setRead({ status: 'signed-out' });
      return;
    }
    let cancelled = false;
    setRead({ status: 'loading' });
    supabase
      .rpc('my_privacy_settings_2026')
      .then(({ data, error }) => {
        if (cancelled || owner.current !== userId) return;
        const audience = error ? null : parsePrivacyAudience(data);
        setRead(audience === null ? { status: 'failed' } : { status: 'ready', audience });
      })
      .then(undefined, () => {
        if (!cancelled && owner.current === userId) setRead({ status: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [configured, sessionLoading, userId, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  const save = useCallback(
    async (next: PrivacyAudience): Promise<PrivacyAudienceWrite> => {
      if (!configured || !supabase || userId === null) return { kind: 'signed-out' };
      setSaving(true);
      try {
        const { data, error } = await supabase.rpc('save_privacy_settings_2026', {
          p_profile_visibility: next.profileVisibility,
          p_map_sharing: next.mapSharing,
          p_discreet_mode: next.discreetMode,
        });
        if (owner.current !== userId) return { kind: 'signed-out' };
        if (error) return privacyWriteFailure(error.message);
        const audience = parsePrivacyAudience(data);
        if (audience === null) return { kind: 'failed' };
        // L'écran affiche ce que le SERVEUR dit appliquer, pas le patch envoyé.
        setRead({ status: 'ready', audience });
        return { kind: 'saved', audience };
      } catch (e) {
        return privacyWriteFailure(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [configured, userId],
  );

  const saveTraceRetention = useCallback(
    async (choice: TraceRetentionChoice2026): Promise<TraceRetentionWrite> => {
      if (!configured || !supabase || userId === null) return { kind: 'signed-out' };
      setSaving(true);
      try {
        const { data, error } = await supabase.rpc('set_trace_retention_2026', {
          p_choice: choice,
        });
        if (owner.current !== userId) return { kind: 'signed-out' };
        if (error) return traceRetentionWriteFailure(error.message);
        // Le serveur rend l'état COMPLET des réglages : on le prend en entier
        // plutôt que de recopier le patch envoyé. Une charge utile illisible
        // n'écrase donc rien à l'écran — et ne prétend pas non plus avoir écrit.
        const audience = parsePrivacyAudience(data);
        if (audience === null || audience.traceRetention === null) return { kind: 'failed' };
        setRead({ status: 'ready', audience });
        return { kind: 'saved', choice: audience.traceRetention };
      } catch (e) {
        return traceRetentionWriteFailure(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [configured, userId],
  );

  return { read, reload, saving, save, saveTraceRetention };
}
