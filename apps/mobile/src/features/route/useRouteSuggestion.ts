/**
 * GRYD — câblage React de la proposition personnalisée (demande fondateur 21/07).
 *
 * Un hook, une sortie : la distance à proposer ET la raison de cette distance
 * (`RouteSuggestion`). L'écran n'a aucune décision à reprendre — s'il pouvait
 * choisir sa phrase indépendamment de la distance, les deux pourraient diverger,
 * et c'est précisément comme ça qu'on obtient « Adaptée à tes habitudes » sur une
 * constante partagée par tout le monde.
 *
 * RÈGLE ZÉRO-MENSONGE APPLIQUÉE À L'ÉCHEC. Une lecture ratée ne devient JAMAIS
 * « pas encore assez de courses » (ce serait affirmer un fait sur le joueur qu'on
 * n'a pas vérifié) : elle devient `unavailable`, donc une distance par défaut
 * annoncée comme telle, sans explication inventée.
 *
 * DÉSACTIVATION = ARRÊT DE LA LECTURE. Si l'apprentissage n'est pas
 * explicitement autorisé, la RPC n'est pas appelée du tout. Désactiver
 * l'apprentissage doit signifier que rien n'est lu, pas seulement que le
 * résultat est jeté — et tant qu'on ne SAIT pas ce que le joueur a choisi, on
 * ne lit pas davantage.
 *
 * FRAÎCHEUR. La garde « adapté à tes habitudes » était structurelle dans le TYPE
 * mais pas dans le TEMPS : ce hook lisait les réglages une fois, au montage.
 * Couper l'apprentissage depuis l'écran de réglages (ou depuis un AUTRE
 * appareil) laissait donc un écran déjà monté afficher la phrase indéfiniment —
 * le type n'était jamais violé, c'est l'ENTRÉE qui était périmée. Deux relectures
 * ferment le trou : `revision` (le store a lu des réglages différents, y compris
 * après une écriture faite ailleurs dans l'app) et le retour sur l'écran.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
// Store SERVEUR (features/routePrefs/store.ts), pas le doublon local :
// deux magasins homonymes coexistaient, le planificateur lisait l'AsyncStorage
// pendant que l'écran de réglages écrivait en base — les réglages ne
// pilotaient donc RIEN. Le serveur gagne : le fondateur veut que les
// réglages survivent à un changement de téléphone.
import {
  useRoutePrefs,
  type RoutePrefs,
  type RoutePrefsStatus,
} from '../routePrefs/store';
import {
  resolveRouteSuggestion,
  routeDistancePrefsFrom,
  type HabitProfile,
  type RoutePrefsRead,
  type RouteSuggestion,
  type SuggestionBounds,
} from './suggestion';
import { GEN_DEFAULT_KM, GEN_MAX_KM, GEN_MIN_KM, GEN_STEP_KM } from './generator';
import {
  computeHabitsProfile,
  HABITS_HISTORY_DAYS,
  HABITS_MAX_RUNS,
  HABITS_MIN_RUNS,
  type HabitRunFact,
} from '@klaim/shared';

/** Bornes du planificateur — source unique, jamais recopiées. */
const BOUNDS: SuggestionBounds = {
  minKm: GEN_MIN_KM,
  maxKm: GEN_MAX_KM,
  stepKm: GEN_STEP_KM,
  fallbackKm: GEN_DEFAULT_KM,
};

/** Forme normalisée que ce module produit à partir de `habits_inputs`. */
interface HabitPayload {
  ok?: boolean;
  kind?: string;
  typicalKm?: number;
  sampleRuns?: number;
  requiredRuns?: number;
}

/** Payload → profil typé. Tout ce qui n'est pas explicitement reconnu = inconnu. */
function parseProfile(payload: HabitPayload | null): HabitProfile {
  if (!payload || payload.ok !== true) return { kind: 'unavailable' };
  if (payload.kind === 'known' && typeof payload.typicalKm === 'number') {
    return {
      kind: 'known',
      typicalKm: payload.typicalKm,
      sampleRuns: typeof payload.sampleRuns === 'number' ? payload.sampleRuns : 0,
    };
  }
  if (payload.kind === 'learning') {
    return {
      kind: 'learning',
      sampleRuns: typeof payload.sampleRuns === 'number' ? payload.sampleRuns : 0,
      requiredRuns: typeof payload.requiredRuns === 'number' ? payload.requiredRuns : 0,
    };
  }
  if (payload.kind === 'off') return { kind: 'off' };
  return { kind: 'unavailable' };
}

export interface UseRouteSuggestionResult {
  /** Toujours défini : il y a toujours une distance courable à proposer. */
  suggestion: RouteSuggestion;
  /** True tant que prefs ou profil n'ont pas résolu. */
  loading: boolean;
}


/**
 * jsonb de `habits_inputs` → profil consommable par le planificateur.
 * DÉFENSIF : toute forme inattendue retombe sur `unavailable` (« on ne sait
 * pas »), jamais sur « pas encore assez de courses » — confondre les deux
 * ferait promettre une personnalisation qui n'arrivera pas.
 */
function profileFromInputs(raw: unknown): HabitProfile {
  if (!raw || typeof raw !== 'object') return { kind: 'unavailable' };
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return { kind: 'unavailable' };
  // `learning: false` = l'utilisateur a coupé l'apprentissage côté serveur.
  if (root.learning === false) return { kind: 'off' };
  if (!Array.isArray(root.runs)) return { kind: 'unavailable' };

  const runs: HabitRunFact[] = [];
  for (const entry of root.runs) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;
    const startedAt = typeof r.startedAt === 'string' ? new Date(r.startedAt) : null;
    const distanceM = typeof r.distanceM === 'number' ? r.distanceM : null;
    const durationS = typeof r.durationS === 'number' ? r.durationS : null;
    const status = typeof r.status === 'string' ? r.status : null;
    if (!startedAt || !Number.isFinite(startedAt.getTime())) continue;
    if (distanceM === null || durationS === null || status === null) continue;
    runs.push({
      startedAt,
      distanceM,
      durationS,
      avgPaceSKm: typeof r.avgPaceSKm === 'number' ? r.avgPaceSKm : null,
      status: status as HabitRunFact['status'],
    });
  }

  const profile = computeHabitsProfile({
    runs,
    now: new Date(),
    // Le créneau doit vouloir dire « le mardi soir DE LA PERSONNE ».
    timeZoneOffsetMinutes: -new Date().getTimezoneOffset(),
  });
  // `distanceM` est une MESURE robuste (médiane + dispersion), pas un scalaire :
  // on prend la médiane. Null = profil non concluant → on ne prétend rien.
  if (profile.status !== 'known' || profile.distanceM === null) {
    return { kind: 'learning', sampleRuns: profile.sampleSize, requiredRuns: HABITS_MIN_RUNS };
  }
  return {
    kind: 'known',
    typicalKm: profile.distanceM.median / 1000,
    sampleRuns: profile.sampleSize,
  };
}

/**
 * Sortie du store → entrée du résolveur pur. `status === 'ready'` garantit un
 * `prefs` non nul (le store ne pose ce statut qu'avec une réponse parsée) ; si
 * la garantie tombait un jour, un `prefs` manquant est traité comme un ÉCHEC de
 * lecture — jamais comme un réglage par défaut, jamais comme « désactivé ».
 */
function prefsRead(status: RoutePrefsStatus, prefs: RoutePrefs | null): RoutePrefsRead {
  if (status === 'ready') {
    return prefs
      ? {
          status: 'ready',
          learningEnabled: prefs.learningEnabled,
          targetDistanceM: prefs.targetDistanceM,
        }
      : { status: 'error' };
  }
  return { status };
}

export function useRouteSuggestion(): UseRouteSuggestionResult {
  const { session } = useSession();
  const { prefs, status, revision } = useRoutePrefs();
  const [profile, setProfile] = useState<HabitProfile>({ kind: 'unavailable' });
  const [profileLoading, setProfileLoading] = useState(true);
  /** Retour sur l'écran ⇒ relecture du profil (une course a pu être ajoutée). */
  const [focusTick, setFocusTick] = useState(0);

  /**
   * LA CONVERSION QUI PORTAIT LE BUG, désormais pure et testée.
   *
   * L'ancien `prefs?.learningEnabled ?? false` faisait dire à un `null` — donc
   * à une lecture EN COURS ou RATÉE — « l'utilisateur a coupé l'apprentissage ».
   * Un échec de `route_prefs_get` s'affichait alors comme un choix du joueur.
   * `routeDistancePrefsFrom` refuse cette confusion : hors de `ready`,
   * l'apprentissage est `'unknown'`, et rien n'est affirmé sur ses réglages.
   */
  const read: RoutePrefsRead = prefsRead(status, prefs);
  const distancePrefs = routeDistancePrefsFrom(read);
  const learning = distancePrefs.learning;

  useEffect(() => {
    // Apprentissage coupé OU réglages non lus OU hors session : aucune
    // lecture. `'unknown'` ne donne PAS le droit de lire les courses — on ne
    // sait pas encore si on en a la permission.
    if (learning !== 'on' || !supabase || !session) {
      // Le profil n'est plus utilisé du tout dans ces cas (le résolveur tranche
      // sur `learning`) : on le remet à « on ne sait pas » plutôt que de
      // laisser traîner un profil appris sous un réglage qui a changé.
      setProfile({ kind: 'unavailable' });
      setProfileLoading(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setProfileLoading(true);

    void (async () => {
      try {
        // Le serveur (0055) expose
        // `habits_inputs` — les FAITS bruts de l'appelant — et le calcul vit
        // dans la fonction PURE `computeHabitsProfile` (@klaim/shared, testée).
        // C'est la meilleure architecture des deux : une seule implémentation de
        // l'algorithme, testable hors base, jamais dupliquée en SQL.
        const res = await client.rpc('habits_inputs', {
          p_window_days: HABITS_HISTORY_DAYS,
          p_max_runs: HABITS_MAX_RUNS,
        });
        if (cancelled) return;
        setProfile(res.error ? { kind: 'unavailable' } : profileFromInputs(res.data));
      } catch {
        if (!cancelled) setProfile({ kind: 'unavailable' });
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `revision` : le store a lu des réglages DIFFÉRENTS (autre écran, autre
    // appareil, « oublier »). Sans lui, couper l'apprentissage ailleurs laissait
    // ce profil-ci intact — le type n'était jamais violé, c'est l'ENTRÉE qui
    // était périmée, et l'écran continuait de dire « adapté à tes habitudes ».
  }, [session, learning, revision, focusTick]);

  /**
   * Relecture au retour sur l'écran. Deux raisons, toutes deux réelles :
   *   · une course vient d'être enregistrée — le profil a pu passer de
   *     « pas encore assez de courses » à « appris » ;
   *   · les réglages ont pu changer AILLEURS (autre appareil). Le store relit
   *     lui aussi au focus ; si sa lecture diffère, `revision` avance et ce
   *     profil est refait sur la bonne autorisation.
   * Le premier focus est sauté : la lecture au montage suffit.
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

  return {
    suggestion: resolveRouteSuggestion(profile, distancePrefs, BOUNDS),
    // `status === 'loading'` couvre la lecture des réglages : tant qu'on ne
    // sait pas si on a le droit d'apprendre, l'écran n'a rien de définitif à
    // dire. Une lecture RATÉE, elle, est une réponse : on ne charge plus.
    loading: status === 'loading' || profileLoading,
  };
}
