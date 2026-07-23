/**
 * GRYD — OUVRIR UNE VILLE : l'appel. La décision reste au serveur.
 *
 * Ce hook est la SEULE porte du client vers l'Edge Function `open_city`. Elle
 * existait depuis la migration 0066 et n'avait aucun appelant : le référentiel
 * proposait 7 870 villes, le jeu en avait 2, et rien ne reliait les deux.
 *
 * ─── CE QU'IL NE FAIT PAS ──────────────────────────────────────────────────
 * · Il n'écrit RIEN lui-même : `city_zones` est en écriture révoquée pour tous
 *   les rôles clients (0003_rls.sql). C'est la fonction, en service-role, qui
 *   provisionne — et c'est elle qui relit la ligne écrite.
 * · Il ne déclare JAMAIS une ville ouverte de sa propre autorité. Ce que
 *   l'appelant reçoit, c'est la réponse du serveur ; et le catalogue est relu
 *   derrière (`useCityCatalog().reload`) pour que la liste affichée vienne, elle
 *   aussi, d'une lecture.
 *
 * ─── QUATRE ÉTATS, JAMAIS TROIS ────────────────────────────────────────────
 * `idle` (rien demandé) · `opening` (en cours — n'affirme rien) · `failed` (on a
 * essayé, ça n'a pas abouti, et on dit pourquoi) · `opened` (le serveur a
 * répondu). Un échec ne se confond ni avec « pas encore ouverte », ni avec un
 * succès silencieux.
 *
 * ─── AUCUN BOUTON MORT ─────────────────────────────────────────────────────
 * `canOpen` est false sans backend configuré et sans session : ouvrir une ville
 * est une écriture, le serveur exige un JWT (`missing_authorization`, 401).
 * L'écran ne peint donc pas une action qui échouerait toujours (CLAUDE.md) —
 * son absence n'est pas un mensonge, un bouton qui échoue toujours en est un.
 */
import { useCallback, useState } from 'react';
import type { Entry } from '../../i18n/types';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  openCityFailureEntry,
  openCityFailureIsFinal,
  readOpenCityResponse,
  type OpenCityOutcome,
  type OpenCitySuccess,
} from './openCity';

export type OpenCityState = 'idle' | 'opening' | 'failed' | 'opened';

export interface OpenCityController {
  readonly state: OpenCityState;
  /** L'action est-elle réellement possible ici et maintenant ? */
  readonly canOpen: boolean;
  /** Ce que le serveur a répondu — seulement quand `state === 'opened'`. */
  readonly result: OpenCitySuccess | null;
  /** Phrase de l'échec — seulement quand `state === 'failed'`. */
  readonly failure: Entry | null;
  /** L'échec est-il DÉFINITIF pour cette ville ? (alors : pas de « Réessayer ») */
  readonly failureIsFinal: boolean;
  /** Lance l'ouverture. Rend le verdict du serveur, pour que l'appelant enchaîne. */
  readonly open: (cityId: string) => Promise<OpenCityOutcome>;
  /** Remet à `idle` (changement de ville sélectionnée). */
  readonly reset: () => void;
}

/**
 * Extrait le motif NOMMÉ d'un refus. supabase-js n'expose pas le corps d'une
 * réponse 4xx dans `error.message` (« Edge Function returned a non-2xx status
 * code ») : il le laisse dans `error.context`, la `Response` brute. Sans cette
 * lecture, « cette ville n'existe pas » et « le réseau est tombé » deviendraient
 * la même phrase — deux gestes différents, une seule explication, donc une
 * explication fausse pour l'un des deux.
 */
async function reasonFromError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof (context as Response).json !== 'function') return 'network_or_unknown';
  try {
    const body: unknown = await (context as Response).json();
    if (typeof body === 'object' && body !== null) {
      const named = (body as Record<string, unknown>).error;
      if (typeof named === 'string' && named.length > 0) return named;
    }
  } catch {
    // Corps illisible : on ne devine pas un motif, on le dit inconnu.
  }
  return 'network_or_unknown';
}

export function useOpenCity(): OpenCityController {
  const { session, configured } = useSession();
  const [state, setState] = useState<OpenCityState>('idle');
  const [result, setResult] = useState<OpenCitySuccess | null>(null);
  const [failure, setFailure] = useState<Entry | null>(null);
  const [failureIsFinal, setFailureIsFinal] = useState(false);

  const canOpen = configured && !!session && supabase !== null;

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setFailure(null);
    setFailureIsFinal(false);
  }, []);

  /** Un seul chemin d'échec : la phrase et le caractère définitif ne peuvent pas diverger. */
  const fail = useCallback((reason: string) => {
    setFailure(openCityFailureEntry(reason));
    setFailureIsFinal(openCityFailureIsFinal(reason));
    setState('failed');
  }, []);

  const open = useCallback(
    async (cityId: string): Promise<OpenCityOutcome> => {
      const client = supabase;
      if (!client || !session) {
        // Le cas est déjà couvert par `canOpen` côté écran ; s'il arrive quand
        // même (session tombée entre l'affichage et le tap), il se DIT.
        const outcome: OpenCityOutcome = { ok: false, reason: 'missing_authorization' };
        setResult(null);
        fail(outcome.reason);
        return outcome;
      }

      setState('opening');
      setFailure(null);
      setResult(null);
      try {
        const { data, error } = await client.functions.invoke('open_city', {
          body: { cityId },
        });
        const outcome: OpenCityOutcome = error
          ? { ok: false, reason: await reasonFromError(error) }
          : readOpenCityResponse(data);
        if (outcome.ok) {
          setResult(outcome.value);
          setState('opened');
        } else {
          fail(outcome.reason);
        }
        return outcome;
      } catch {
        const outcome: OpenCityOutcome = { ok: false, reason: 'network_or_unknown' };
        fail(outcome.reason);
        return outcome;
      }
    },
    [session, fail],
  );

  return { state, canOpen, result, failure, failureIsFinal, open, reset };
}
