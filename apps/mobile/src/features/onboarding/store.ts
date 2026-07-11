/**
 * GRYD — état d'avancement de l'onboarding SANS FRICTION (AMENDEMENT-30 §3).
 * Un flag PRÉ-COMPTE persistant : « ce visiteur a déjà vu l'onboarding / a fait
 * sa 1re capture démo ». Il vit à part des préférences motivationnelles
 * (motivation/store.ts) car son rôle est justement d'exister AVANT qu'un compte
 * soit créé : le gating (tabs)/_layout s'en sert pour ne pousser l'onboarding
 * qu'à un NOUVEAU visiteur, alors que `onboardingSeen` des prefs restait couplé
 * à la session réelle (§8 historique). Aucune valeur de jeu ici — juste du
 * routage d'affichage. AsyncStorage best-effort (jamais bloquant : défauts
 * affichés immédiatement, comme motivation/store — web privé toléré).
 *
 * On sépare deux jalons (le funnel A-30 : « activation = 1re capture ») :
 *   firstCaptureDone — la valeur a été donnée (étape 5 atteinte). Débloque la
 *                      proposition compte/crew/notifs SANS jamais les imposer.
 *   onboardingDone   — le visiteur est ressorti du flow (compte créé, ou « plus
 *                      tard » assumé). Le gating ne re-pousse plus l'onboarding.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Chemin d'activation choisi à l'étape 4 (funnel : sync vs run — §4). */
export type OnboardingPath = 'sync' | 'run' | null;

export interface OnboardingState {
  /** L'onboarding a été mené jusqu'au bout (compte fait ou différé assumé). */
  onboardingDone: boolean;
  /** La 1re capture démo a eu lieu (la valeur est donnée). */
  firstCaptureDone: boolean;
  /** Age-gate 16+ franchi (Apple 5.1.1 / mineurs) — persiste l'auto-déclaration. */
  ageConfirmed: boolean;
  /** Chemin d'activation retenu (analytics/reprise). */
  path: OnboardingPath;
}

/** Défaut : rien vu, rien capturé — un pur nouveau visiteur. */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  onboardingDone: false,
  firstCaptureDone: false,
  ageConfirmed: false,
  path: null,
};

const STORAGE_KEY = 'gryd.onboarding.v1';

/** Fusionne le JSON stocké avec les défauts (tolérant clés manquantes/futures). */
function hydrate(raw: string | null): OnboardingState {
  if (!raw) return DEFAULT_ONBOARDING_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return { ...DEFAULT_ONBOARDING_STATE, ...parsed };
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

async function readState(): Promise<OnboardingState> {
  try {
    return hydrate(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

async function writeState(state: OnboardingState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne casse jamais le flow.
  }
}

export interface OnboardingStore {
  state: OnboardingState;
  /** True tant que la lecture initiale n'a pas résolu (défauts affichés pendant). */
  loading: boolean;
  /** Patch partiel + persistance. Retourne la promesse d'écriture. */
  update: (patch: Partial<OnboardingState>) => Promise<void>;
}

/**
 * Hook d'accès à l'avancement d'onboarding. Charge en asynchrone (défauts
 * affichés immédiatement → jamais de flash de blocage sur web/preview), persiste
 * chaque patch. PURE côté rendu : aucune requête réseau.
 */
export function useOnboardingState(): OnboardingStore {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [loading, setLoading] = useState(true);
  // Miroir synchrone de l'état courant : la persistance NE DÉPEND JAMAIS du timing
  // de l'updater setState. `finish()` enchaîne update() puis router.replace()
  // (démontage immédiat) : l'updater fonctionnel serait alors abandonné et
  // writeState persisterait les défauts, écrasant le bon état. En calculant `next`
  // depuis stateRef.current (mis à jour à chaque commit ET tout de suite ci-dessous),
  // writeState reçoit toujours l'état fusionné complet, même sur ce chemin.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    void readState().then((s) => {
      if (alive) {
        stateRef.current = s;
        setState(s);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingState>) => {
    // Fusion synchrone depuis la ref (jamais depuis l'updater async de setState).
    // On met à jour la ref tout de suite pour que des update() enchaînés dans le
    // même tick composent bien (le 2e lit le patch du 1er sans attendre un render).
    const next: OnboardingState = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
    await writeState(next);
  }, []);

  return { state, loading, update };
}
