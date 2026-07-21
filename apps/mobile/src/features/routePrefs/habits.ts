/**
 * GRYD — LECTURE du profil d'habitudes DÉDUIT, pour l'écran « Mes parcours »
 * (demande fondateur 21/07 : « se baser sur les habitudes des utilisateurs »).
 *
 * ═══ CE FICHIER NE CALCULE RIEN ═════════════════════════════════════════════
 * Il branche deux pièces qui existent déjà, et n'en réimplémente aucune :
 *   · `public.habits_inputs(p_window_days, p_max_runs)` (migration 0055) — les
 *     FAITS bruts des courses de l'appelant seul, sans aucune coordonnée ;
 *   · `computeHabitsProfile` (packages/shared/src/habits.ts) — le moteur PUR
 *     (médiane + MAD) qui en tire la distance, l'allure et le créneau habituels.
 *
 * Une deuxième dérivation côté écran finirait par diverger de celle du Route
 * Planner : l'écran de réglages afficherait « 6,2 km » pendant que la
 * proposition partirait sur autre chose. Une seule implémentation, partagée.
 *
 * ═══ TRANSPARENCE ═══════════════════════════════════════════════════════════
 * C'est la raison d'être de ce module : on ne profile pas quelqu'un sans lui
 * montrer ce qu'on a déduit de lui. Il ne sert QUE l'affichage de son propre
 * profil à son propriétaire.
 *
 * ═══ QUATRE ÉTATS, PARCE QU'IL Y A QUATRE PHRASES VRAIES ════════════════════
 * `unknown` (« pas assez de courses ») est une AFFIRMATION sur le joueur : elle
 * n'est légitime que si le serveur a réellement répondu. Une lecture ratée
 * devient `unavailable`, jamais `unknown` — affirmer une raison qu'on ignore
 * est exactement le mensonge d'écran que ce chantier corrige (`demo.ts`
 * affichait « Adaptée à tes habitudes » sans que rien n'apprenne).
 *
 * ═══ VIE PRIVÉE ════════════════════════════════════════════════════════════
 * Rien de géographique ne transite ici : `habits_inputs` ne renvoie ni trace,
 * ni hex, ni secteur, ni coordonnée. « Tu cours le soir » ne dit pas OÙ — le
 * domicile flouté à 500 m (§7) ne peut pas être ré-exposé par ce chemin.
 * L'interrupteur fait autorité côté SERVEUR (`route_preferences.learning_enabled`,
 * lu par 0055) : un client qui l'ignorerait n'obtiendrait rien quand même.
 */
import { useEffect, useState } from 'react';
import {
  HABITS_HISTORY_DAYS,
  HABITS_MAX_RUNS,
  computeHabitsProfile,
  type HabitRunFact,
  type HabitRunStatus,
  type HabitSlotKey,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isShowcasePlatform } from '../../lib/flags';

/**
 * Ce que l'écran a le droit d'affirmer. Quatre états DISTINCTS parce qu'ils
 * appellent quatre phrases différentes — les confondre, c'est mentir :
 *  · `loading`     : on ne sait pas encore, on n'affirme rien ;
 *  · `off`         : l'apprentissage est coupé (dit par le serveur) ;
 *  · `unknown`     : le serveur a répondu, il n'y a pas assez de courses ;
 *  · `unavailable` : on n'a pas pu lire (réseau, hors session, vitrine).
 */
export type RouteHabits =
  | { state: 'loading' }
  | { state: 'off' }
  | { state: 'unknown' }
  | { state: 'unavailable' }
  | {
      state: 'known';
      /** Distance habituelle (m) — la MÉDIANE, insensible au semi improvisé. */
      distanceM: number;
      paceSKm: number | null;
      slot: HabitSlotKey | null;
      /** Courses ayant réellement alimenté le profil (dit sous la fiche). */
      runs: number;
    };

const COUNTED: readonly string[] = ['valid', 'partial'];

/** Une entrée `runs` de `habits_inputs` → fait typé, ou `null` si inexploitable. */
function parseFact(entry: unknown): HabitRunFact | null {
  if (!entry || typeof entry !== 'object') return null;
  const r = entry as Record<string, unknown>;
  const ms = typeof r.startedAt === 'string' ? Date.parse(r.startedAt) : Number.NaN;
  if (!Number.isFinite(ms)) return null;
  if (typeof r.distanceM !== 'number' || !Number.isFinite(r.distanceM)) return null;
  if (typeof r.durationS !== 'number' || !Number.isFinite(r.durationS)) return null;
  if (typeof r.status !== 'string' || !COUNTED.includes(r.status)) return null;
  return {
    startedAt: new Date(ms),
    distanceM: r.distanceM,
    durationS: r.durationS,
    avgPaceSKm:
      typeof r.avgPaceSKm === 'number' && Number.isFinite(r.avgPaceSKm) ? r.avgPaceSKm : null,
    status: r.status as HabitRunStatus,
  };
}

/**
 * jsonb de `habits_inputs` → RouteHabits, via le moteur partagé. `now` et le
 * décalage horaire sont injectés (le moteur est pur, il n'a pas d'horloge) :
 * « le soir » doit vouloir dire le soir DE LA PERSONNE.
 */
export function parseRouteHabits(raw: unknown, now: Date = new Date()): RouteHabits {
  if (!raw || typeof raw !== 'object') return { state: 'unavailable' };
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return { state: 'unavailable' };
  // Le serveur a coupé l'apprentissage : il n'a renvoyé aucune course, et c'est
  // LUI qui le dit — l'écran n'a pas à le déduire de son état local.
  if (root.learning === false) return { state: 'off' };
  if (!Array.isArray(root.runs)) return { state: 'unavailable' };

  const runs: HabitRunFact[] = [];
  for (const entry of root.runs) {
    const fact = parseFact(entry);
    if (fact) runs.push(fact);
  }

  const profile = computeHabitsProfile({
    runs,
    now,
    timeZoneOffsetMinutes: -now.getTimezoneOffset(),
    learningEnabled: true,
  });

  if (profile.status === 'disabled') return { state: 'off' };
  // `unknown` OU un profil « connu » sans mesure de distance : dans les deux cas
  // il n'y a rien de vrai à afficher, et le serveur a bien répondu.
  if (profile.status !== 'known' || profile.distanceM === null) return { state: 'unknown' };

  return {
    state: 'known',
    distanceM: Math.round(profile.distanceM.median),
    paceSKm: profile.paceSKm ? Math.round(profile.paceSKm.median) : null,
    // Le créneau DOMINANT seulement. Le moteur ne retient un motif qu'au-delà
    // de HABITS_PATTERN_MIN_SHARE : une liste vide veut dire « rien ne ressort »,
    // et on n'affiche alors pas de ligne « Créneau » plutôt qu'un créneau tiède.
    slot: profile.slots[0]?.key ?? null,
    runs: profile.sampleSize,
  };
}

/**
 * Lit et dérive le profil. `learningEnabled === false` court-circuite l'appel :
 * couper l'apprentissage doit signifier que RIEN n'est lu, pas seulement que le
 * résultat est jeté (le serveur refuserait de toute façon — double sécurité).
 * `revision` force la relecture après un changement de réglage.
 */
export function useRouteHabits(
  learningEnabled: boolean | null,
  revision: number,
): RouteHabits {
  const { session } = useSession();
  const [habits, setHabits] = useState<RouteHabits>({ state: 'loading' });
  const ready = !isShowcasePlatform && !!supabase && !!session;

  useEffect(() => {
    if (learningEnabled === false) {
      setHabits({ state: 'off' });
      return;
    }
    if (learningEnabled === null) {
      setHabits({ state: 'loading' });
      return;
    }
    if (!ready || !supabase) {
      setHabits({ state: 'unavailable' });
      return;
    }
    const client = supabase;
    let cancelled = false;
    setHabits({ state: 'loading' });
    void (async () => {
      try {
        const { data, error } = await client.rpc('habits_inputs', {
          // Fenêtre et plafond sont des RÈGLES : ils partent de game-rules, ils
          // ne sont pas écrits en dur côté SQL (patron des fenêtres de 0049).
          p_window_days: HABITS_HISTORY_DAYS,
          p_max_runs: HABITS_MAX_RUNS,
        });
        if (cancelled) return;
        setHabits(error ? { state: 'unavailable' } : parseRouteHabits(data));
      } catch {
        if (!cancelled) setHabits({ state: 'unavailable' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, learningEnabled, revision]);

  return habits;
}
