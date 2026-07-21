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
 * DÉSACTIVATION = ARRÊT DE LA LECTURE. Si `learningEnabled` est faux, la RPC
 * n'est pas appelée du tout. Désactiver l'apprentissage doit signifier que rien
 * n'est lu, pas seulement que le résultat est jeté.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isShowcasePlatform } from '../../lib/flags';
// Store SERVEUR (features/routePrefs/store.ts), pas le doublon local :
// deux magasins homonymes coexistaient, le planificateur lisait l'AsyncStorage
// pendant que l'écran de réglages écrivait en base — les réglages ne
// pilotaient donc RIEN. Le serveur gagne : le fondateur veut que les
// réglages survivent à un changement de téléphone.
import { useRoutePrefs } from '../routePrefs/store';
import {
  resolveRouteSuggestion,
  type HabitProfile,
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

export function useRouteSuggestion(): UseRouteSuggestionResult {
  const { session } = useSession();
  const { prefs, loading: prefsLoading } = useRoutePrefs();
  const [profile, setProfile] = useState<HabitProfile>({ kind: 'unavailable' });
  const [profileLoading, setProfileLoading] = useState(true);

  // `prefs` est null tant que le store serveur n'a pas répondu : on ne
  // présume PAS que l'apprentissage est actif (ce serait lire les courses
  // de quelqu'un qui l'a peut-être coupé). Chargement → aucune lecture.
  const learningEnabled = prefs?.learningEnabled ?? false;

  useEffect(() => {
    // Apprentissage coupé, vitrine web, hors session : aucune lecture.
    if (!learningEnabled || isShowcasePlatform || !supabase || !session) {
      setProfile(learningEnabled ? { kind: 'unavailable' } : { kind: 'off' });
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
  }, [session, learningEnabled]);

  return {
    // Adaptation du contrat SERVEUR (`targetDistanceM`, mètres, null = auto)
    // vers celui du résolveur (`manualKm`, kilomètres). Le store serveur est la
    // source unique depuis l'unification des deux magasins homonymes ; cette
    // conversion est le seul endroit où les deux vocabulaires se croisent.
    suggestion: resolveRouteSuggestion(
      profile,
      {
        manualKm:
          prefs?.targetDistanceM != null && Number.isFinite(prefs.targetDistanceM)
            ? prefs.targetDistanceM / 1000
            : null,
        learningEnabled,
      },
      BOUNDS,
    ),
    loading: prefsLoading || profileLoading,
  };
}
