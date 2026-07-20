/**
 * GRYD — DISPONIBILITÉ DU @handle EN DIRECT (demande fondateur : « un vérificateur
 * pour ne pas avoir deux fois le même handle »).
 *
 * Câble la RPC `check_handle_available(p_handle)` posée par la migration 0047.
 * Le contrat serveur est jsonb : {"ok":true} | {"ok":false,"reason":"too_short"|
 * "too_long"|"bad_chars"|"reserved"|"taken"}.
 *
 * TROIS RÈGLES, non négociables :
 *
 *  1. LE SERVEUR RESTE JUGE. Ce hook est un CONFORT d'écriture, pas une
 *     autorisation. Un `free` affiché ici n'accorde rien : à l'enregistrement,
 *     c'est le `unique` + le `check` de 0011 qui tranchent (deux joueurs qui
 *     valident le même handle à la même seconde ne peuvent pas l'obtenir tous
 *     les deux). Le hook n'écrit RIEN et ne réserve RIEN.
 *
 *  2. ON NE BLOQUE JAMAIS LA FRAPPE. La vérification est asynchrone et
 *     debouncée ; l'état `checking` n'empêche ni de taper, ni d'enregistrer.
 *     Au pire on enregistre et le serveur refuse — jamais un champ gelé.
 *
 *  3. ON NE MENT PAS QUAND ON NE SAIT PAS. Pas de session, pas de backend,
 *     réseau tombé → état `unknown`, et l'écran n'affiche alors AUCUN verdict
 *     (ni « libre » ni « pris »). Inventer un « disponible » optimiste serait
 *     exactement la donnée fabriquée que la charte interdit.
 *
 * Anti-course : chaque requête porte un numéro de séquence ; une réponse plus
 * ancienne que la dernière lancée est jetée (sinon le verdict d'un handle
 * abandonné écraserait celui du handle en cours de frappe).
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

/** Motifs de refus renvoyés par la RPC 0047 (contrat figé, miroir SQL). */
export type HandleRefusal = 'too_short' | 'too_long' | 'bad_chars' | 'reserved' | 'taken';

/**
 * État affichable du champ @handle.
 *  - `idle`     : rien à dire (champ vide / inchangé) → on affiche l'aide.
 *  - `checking` : requête en vol → état NEUTRE, aucun verdict.
 *  - `free`     : le serveur dit disponible À CET INSTANT (pas une réservation).
 *  - `refused`  : le serveur refuse, avec un motif exploitable.
 *  - `unknown`  : impossible de savoir (hors ligne / sans backend) → on se tait.
 */
export type HandleCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'free' }
  | { state: 'refused'; reason: HandleRefusal }
  | { state: 'unknown' };

/** Délai de repos avant d'interroger le serveur (ms). Une frappe normale ne
 *  déclenche donc qu'UNE requête, pas une par caractère. */
const DEBOUNCE_MS = 450;

/** Longueur minimale avant même de déranger le serveur (miroir de 0011). */
const MIN_LEN = 3;

const REFUSALS: readonly string[] = ['too_short', 'too_long', 'bad_chars', 'reserved', 'taken'];

/** Réponse RPC brute → état affichable. PURE (testable sans réseau). */
export function parseHandleCheck(data: unknown): HandleCheck {
  if (typeof data !== 'object' || data === null) return { state: 'unknown' };
  const r = data as { ok?: unknown; reason?: unknown };
  if (r.ok === true) return { state: 'free' };
  if (r.ok === false && typeof r.reason === 'string' && REFUSALS.includes(r.reason)) {
    return { state: 'refused', reason: r.reason as HandleRefusal };
  }
  return { state: 'unknown' };
}

/**
 * Vérifie en direct la disponibilité d'un @handle. Rend un état neutre tant que
 * rien n'est su ; ne bloque jamais la saisie ; n'accorde jamais rien.
 *
 * @param handle    valeur courante du champ (déjà normalisée par l'écran).
 * @param unchanged true si `handle` est EXACTEMENT le handle déjà enregistré du
 *                  joueur — on n'interroge alors pas le serveur (rien n'a changé,
 *                  et la RPC répondrait « ok » de toute façon).
 */
export function useHandleAvailability(handle: string, unchanged: boolean): HandleCheck {
  const { session, configured } = useSession();
  const [check, setCheck] = useState<HandleCheck>({ state: 'idle' });
  const seq = useRef(0);

  const ready = configured && session !== null && supabase !== null;

  useEffect(() => {
    const value = handle.trim();

    // Rien à dire : champ vide, ou handle inchangé (c'est déjà le sien).
    if (value.length === 0 || unchanged) {
      setCheck({ state: 'idle' });
      return;
    }

    // Trop court : la RPC répondrait `too_short`, autant l'annoncer sans requête
    // (et sans faire clignoter le champ à chaque première lettre tapée).
    if (value.length < MIN_LEN) {
      setCheck({ state: 'refused', reason: 'too_short' });
      return;
    }

    // Pas de backend / pas de session : on ne SAIT pas. On ne prétend pas savoir.
    if (!ready) {
      setCheck({ state: 'unknown' });
      return;
    }

    const mine = ++seq.current;
    setCheck({ state: 'checking' });

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const client = supabase;
          if (!client) return;
          const { data, error } = await client.rpc('check_handle_available', { p_handle: value });
          if (mine !== seq.current) return; // réponse périmée : la frappe a continué.
          setCheck(error ? { state: 'unknown' } : parseHandleCheck(data));
        } catch {
          if (mine !== seq.current) return;
          setCheck({ state: 'unknown' });
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [handle, unchanged, ready]);

  return check;
}
