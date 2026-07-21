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
 * RÈGLE ZÉRO-CRASH ET ZÉRO-MENSONGE : tout échec — pas de session, pas de backend,
 * lecture ratée, rejet réseau — retombe SILENCIEUSEMENT sur `focus: null`, et le
 * bloc disparaît. Jamais une zone de démonstration : une zone inventée serait un
 * mensonge sur le monde réel, et l'écran a d'autres choses à dire.
 *
 * ⚠️ PLUS DE VARIANTE `.web.ts`. Elle renvoyait l'état vide EN DUR sur web, donc
 * `npx expo start --web` ne pouvait pas montrer ce que montre l'iPhone — alors
 * que c'est le seul instrument de contrôle du fondateur. Le hook est le même
 * sur les deux surfaces, et il ne connaît plus qu'une seule condition de
 * lecture : un backend et une session (la garde vitrine a disparu avec le mode
 * vitrine, 21/07/2026).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  DAILY_ZONE_DISTINCTION_H,
  DAILY_ZONE_FRAGILE_WINDOW_H,
  ZONE_CENTER_SPACING_M,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { useRouteSuggestion } from '../route/useRouteSuggestion';
import { runsBeforeLearning } from '../route/suggestion';
import {
  chooseDailyZone,
  dayKeyOf,
  isDistinctionActive,
  type DailyZone,
  type DailyZoneCandidate,
} from './engine/dailyZone';
import {
  resolveDailyZoneEffort,
  type DailyZoneEffort,
  type DailyZoneGround,
} from './zoneFit';
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
      /**
       * A-46 branché ici : la distance que cette personne court VRAIMENT, sa
       * provenance, et le verdict de terrain. La zone, elle, ne change pas —
       * cf. zoneFit.ts (elle doit rester le même fait pour toute la ville, et
       * le serveur rejoue le tirage).
       */
      effort: DailyZoneEffort;
    };

/** L'état brut posé par la lecture — l'effort est dérivé au rendu, pas ici. */
type DailyFocusCore =
  | { kind: 'welcome'; challenge: WelcomeChallenge }
  | { kind: 'daily_zone'; zone: DailyZone; distinctionActive: boolean };

export interface UseDailyFocusResult {
  /** `null` = rien d'honnête à afficher (pas de session, pas de backend, échec). */
  focus: DailyFocus | null;
  loading: boolean;
}

/** Charge utile de `daily_zone_inputs` (0052, réécrite par 0053). */
interface ZoneInputsPayload {
  ok?: boolean;
  cityId?: string | null;
  candidates?: unknown;
  award?: { dayKey?: string; sectorId?: string; awardedAt?: string } | null;
}

/**
 * NORMALISATION DU PAYLOAD — corrige un mensonge silencieux.
 *
 * 0052 renvoyait `sectorName` et `fragileHexes` (un compte) ; 0053, qui a
 * réécrit la fonction, renvoie `name` et `fragile` (un BOOLÉEN). Le moteur, lui,
 * lit toujours les clés de 0052 : sur la base réelle, `sectorName` était donc
 * toujours `undefined` (jamais un seul nom de quartier affiché — toujours « une
 * zone de ta ville ») et `fragileHexes` toujours `0`, ce qui rendait le rôle
 * `fragile` STRICTEMENT INATTEIGNABLE. Une moitié de la mécanique était morte
 * sans qu'aucun écran ne le dise.
 *
 * On accepte les DEUX formes plutôt que d'en choisir une : la SQL n'est pas dans
 * ce périmètre, et un correctif SQL futur ne doit pas re-casser le client.
 * `fragile: true` devient `1` — « au moins une », ce qui est exactement ce que le
 * booléen affirme et exactement ce dont le moteur a besoin (`>= 1`). Ce compte
 * n'est jamais AFFICHÉ comme un nombre : ce serait inventer la précision que le
 * serveur n'a pas donnée (cf. `judgeFit`, qui refuse tout verdict sur `fragile`).
 */
function toCandidate(raw: unknown): DailyZoneCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.sectorId !== 'string') return null;

  const name = typeof r.sectorName === 'string' ? r.sectorName : typeof r.name === 'string' ? r.name : null;
  const fragileCount =
    typeof r.fragileHexes === 'number' ? r.fragileHexes : r.fragile === true ? 1 : 0;

  return {
    sectorId: r.sectorId,
    sectorName: name,
    // `null` reste `null` : total inconnu n'est pas « 0 libre » (le moteur
    // écarte alors le secteur de la branche neutre au lieu de le dire plein).
    freeHexes: typeof r.freeHexes === 'number' ? r.freeHexes : null,
    fragileHexes: fragileCount,
  };
}

function toCandidates(raw: unknown): DailyZoneCandidate[] {
  if (!Array.isArray(raw)) return [];
  const out: DailyZoneCandidate[] = [];
  for (const entry of raw) {
    const c = toCandidate(entry);
    if (c !== null) out.push(c);
  }
  return out;
}

/**
 * Le terrain RÉEL du secteur tiré, réduit à ce que le verdict a le droit de
 * lire. `none` → `null` : sans zone, il n'y a rien à comparer.
 */
function groundOf(zone: DailyZone): DailyZoneGround | null {
  if (zone.kind !== 'zone') return null;
  return { role: zone.role, freeZones: zone.freeHexes };
}

/** Charge utile de `welcome_challenge_facts` (0052). */
interface WelcomePayload {
  ok?: boolean;
  challengeId?: string | null;
  facts?: WelcomeFacts;
}

export function useDailyFocus(): UseDailyFocusResult {
  const { session } = useSession();
  // A-46. Ce hook respecte déjà la règle « désactivation = arrêt de la
  // lecture » : apprentissage coupé ⇒ aucune RPC `habits_inputs` n'est appelée.
  // On ne la ré-implémente donc pas ici, on la consomme.
  const { suggestion, loading: suggestionLoading } = useRouteSuggestion();
  const [core, setCore] = useState<DailyFocusCore | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!supabase || !session) {
      setCore(null);
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
              setCore({ kind: 'welcome', challenge });
              setLoading(false);
              return;
            }
          }
        }

        // ── 2. Sinon, la Zone du Jour ────────────────────────────────────────
        if (zoneRes.error) {
          // Lecture ratée : on n'affiche PAS une zone fausse, et on ne prétend
          // pas non plus qu'il n'y en a aucune. Le bloc disparaît, point.
          setCore(null);
          setLoading(false);
          return;
        }
        const zonePayload = (zoneRes.data ?? {}) as ZoneInputsPayload;
        if (zonePayload.ok !== true) {
          setCore(null);
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
          candidates: toCandidates(zonePayload.candidates),
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

        setCore({ kind: 'daily_zone', zone, distinctionActive });
        setLoading(false);
      } catch {
        if (cancelled) return;
        setCore(null);
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

  /**
   * L'EFFORT EST DÉRIVÉ AU RENDU, pas figé dans l'effet — la lecture des
   * habitudes (`useRouteSuggestion`) et celle de la zone sont indépendantes et
   * n'arrivent pas en même temps. Le figer donnerait, pendant quelques
   * centaines de millisecondes, un « pas encore assez de courses » à quelqu'un
   * dont le profil était en train d'être lu : un mensonge court, mais un
   * mensonge quand même. Ici, dès que la suggestion change, la phrase change.
   *
   * La ZONE, elle, n'est jamais recalculée en fonction des habitudes (cf.
   * zoneFit.ts) : elle reste le même fait pour toute la ville.
   */
  const focus = useMemo<DailyFocus | null>(() => {
    if (core === null) return null;
    if (core.kind === 'welcome') return core;
    return {
      ...core,
      effort: resolveDailyZoneEffort(
        groundOf(core.zone),
        // TANT QUE LA LECTURE N'A PAS RÉPONDU : aucune distance transmise, donc
        // `unknown`, donc SILENCE. `resolveRouteSuggestion` est total — il rend
        // toujours une distance, y compris pendant le chargement (« pas encore
        // assez de courses », par défaut). L'afficher à ce moment-là serait
        // affirmer un fait sur le joueur qu'on n'a pas encore vérifié, et le
        // voir se corriger tout seul une seconde plus tard.
        suggestionLoading
          ? null
          : {
              km: suggestion.km,
              source: suggestion.source,
              cause: suggestion.cause,
              // Seuil calculé par la fonction testée d'A-46, jamais redéfini ici.
              runsLeft: runsBeforeLearning(suggestion),
            },
        ZONE_CENTER_SPACING_M,
      ),
    };
  }, [core, suggestion, suggestionLoading]);

  return { focus, loading: loading || suggestionLoading };
}
