/**
 * GRYD — LOT 3 : câblage React de la RAISON QUOTIDIENNE (A-45 §3, actions 3-4).
 *
 * Un seul hook pour les deux mécaniques, et c'est délibéré : §A impose « 1 écran
 * = 1 décision ». Empiler un bloc « Zone du Jour » ET un bloc « Premiers pas »
 * sur l'écran Aujourd'hui remplacerait un écran clair par une liste de devoirs.
 * Le hook ARBITRE donc, et l'écran n'affiche jamais qu'UNE chose :
 *
 *   1. le DÉFI D'ACCUEIL tant qu'il n'est pas terminé — un joueur qui n'a pas
 *      encore capturé sa première zone n'a rien à faire d'une zone du jour, il a
 *      besoin qu'on lui montre la mécanique ;
 *   2. la ZONE DU JOUR ensuite — c'est la raison de revenir une fois que la
 *      boucle est comprise.
 *
 * DÉCISION SERVEUR. Le hook ne fait qu'AFFICHER : le tirage passe par la
 * dérivation pure `chooseDailyZone`, alimentée par les FAITS de la RPC
 * `daily_zone_inputs` (0052). Aucun claim, aucune distinction n'est décidée ici —
 * la distinction est attribuée serveur, après capture, et relue telle quelle.
 *
 * RÈGLE ZÉRO-CRASH ET ZÉRO-MENSONGE : tout échec — pas de session, showcase web,
 * lecture ratée, rejet réseau — retombe SILENCIEUSEMENT sur `focus: null`, et le
 * bloc disparaît. Jamais une zone de démonstration : une zone inventée serait un
 * mensonge sur le monde réel, et l'écran a d'autres choses à dire.
 *
 * ⚠️ Variante WEB : `useDailyFocus.web.ts` renvoie l'état vide (la vitrine n'a ni
 * session ni base) — même patron que useRealMission.web.ts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  DAILY_ZONE_DISTINCTION_H,
  DAILY_ZONE_FRAGILE_WINDOW_H,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isShowcasePlatform } from '../../lib/flags';
import {
  chooseDailyZone,
  dayKeyOf,
  isDistinctionActive,
  type DailyZone,
  type DailyZoneCandidate,
} from './engine/dailyZone';
import {
  deriveWelcomeChallenge,
  type WelcomeChallenge,
  type WelcomeFacts,
} from './engine/welcomeChallenge';

/** Ce que l'écran Aujourd'hui affiche — AU PLUS une chose. */
export type DailyFocus =
  | { kind: 'welcome'; challenge: WelcomeChallenge }
  | {
      kind: 'daily_zone';
      zone: DailyZone;
      /** La distinction du jour est-elle déjà acquise et encore active ? */
      distinctionActive: boolean;
    };

export interface UseDailyFocusResult {
  /** `null` = rien d'honnête à afficher (pas de session, showcase, échec). */
  focus: DailyFocus | null;
  loading: boolean;
}

/** Charge utile de `daily_zone_inputs` (0052). */
interface ZoneInputsPayload {
  ok?: boolean;
  cityId?: string | null;
  candidates?: DailyZoneCandidate[];
  award?: { dayKey?: string; sectorId?: string; awardedAt?: string } | null;
}

/** Charge utile de `welcome_challenge_facts` (0052). */
interface WelcomePayload {
  ok?: boolean;
  challengeId?: string | null;
  facts?: WelcomeFacts;
}

export function useDailyFocus(): UseDailyFocusResult {
  const { session } = useSession();
  const [focus, setFocus] = useState<DailyFocus | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (isShowcasePlatform || !supabase || !session) {
      setFocus(null);
      setLoading(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        // Les deux lectures en parallèle : l'arbitrage a besoin de savoir si le
        // parcours d'accueil est terminé AVANT de décider quoi montrer.
        const [welcomeRes, zoneRes] = await Promise.all([
          client.rpc('welcome_challenge_facts'),
          client.rpc('daily_zone_inputs', {
            // La fenêtre vient de game-rules et de nulle part ailleurs. La RPC
            // REFUSE une fenêtre absente : aucun défaut n'est inventé côté SQL.
            p_fragile_window_h: DAILY_ZONE_FRAGILE_WINDOW_H,
          }),
        ]);
        if (cancelled) return;

        // ── 1. Le parcours d'accueil d'abord ─────────────────────────────────
        if (!welcomeRes.error) {
          const payload = (welcomeRes.data ?? {}) as WelcomePayload;
          if (payload.ok === true) {
            const challenge = deriveWelcomeChallenge(payload.facts ?? null);
            if (challenge.kind === 'in_progress') {
              setFocus({ kind: 'welcome', challenge });
              setLoading(false);
              return;
            }
          }
        }

        // ── 2. Sinon, la Zone du Jour ────────────────────────────────────────
        if (zoneRes.error) {
          // Lecture ratée : on n'affiche PAS une zone fausse, et on ne prétend
          // pas non plus qu'il n'y en a aucune. Le bloc disparaît, point.
          setFocus(null);
          setLoading(false);
          return;
        }
        const zonePayload = (zoneRes.data ?? {}) as ZoneInputsPayload;
        if (zonePayload.ok !== true) {
          setFocus(null);
          setLoading(false);
          return;
        }

        const now = Date.now();
        // Le jour VÉCU par le coureur (fuseau de l'appareil), pas le jour UTC.
        // getTimezoneOffset() compte les minutes à RETRANCHER de l'heure locale
        // pour obtenir l'UTC : l'offset à ajouter est donc son opposé.
        const dayKey = dayKeyOf(now, -new Date(now).getTimezoneOffset());
        const zone = chooseDailyZone({
          dayKey: dayKey ?? '',
          cityId: zonePayload.cityId ?? null,
          candidates: zonePayload.candidates ?? [],
        });

        // Distinction : acquise CE jour, sur LA zone tirée, et pas encore
        // éteinte. Les trois conditions sont nécessaires — sans la comparaison
        // de secteur, une distinction d'hier s'afficherait sur la zone du jour.
        const award = zonePayload.award ?? null;
        const awardedAt = award?.awardedAt ? Date.parse(award.awardedAt) : null;
        const distinctionActive =
          zone.kind === 'zone' &&
          award?.dayKey === zone.dayKey &&
          award?.sectorId === zone.sectorId &&
          isDistinctionActive(
            awardedAt !== null && Number.isFinite(awardedAt) ? awardedAt : null,
            now,
            DAILY_ZONE_DISTINCTION_H,
          );

        setFocus({ kind: 'daily_zone', zone, distinctionActive });
        setLoading(false);
      } catch {
        if (cancelled) return;
        setFocus(null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, tick]);

  // Refetch au retour sur l'écran : après une course, la zone du jour a pu être
  // capturée et un palier d'accueil franchi. Le 1er focus est sauté (le fetch au
  // montage suffit) — même patron que useRealMission.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  return { focus, loading };
}
