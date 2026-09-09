/**
 * GRYD — état d'avancement de l'onboarding SANS FRICTION (AMENDEMENT-30 §3).
 * Un flag PRÉ-COMPTE persistant : « ce visiteur a déjà vu l'onboarding / a déjà
 * déclaré son âge ». Il vit à part des préférences motivationnelles
 * (motivation/store.ts) car son rôle est justement d'exister AVANT qu'un compte
 * soit créé. Aucune valeur de jeu ici — juste du routage d'affichage.
 *
 * On sépare deux jalons (le funnel A-30 : « activation = 1re capture ») :
 *   firstCaptureDone — une VRAIE première capture a eu lieu.
 *   onboardingDone   — le visiteur est ressorti du flow (compte créé, ou « plus
 *                      tard » assumé). Le gating ne re-pousse plus l'onboarding.
 *
 * ⚠ `firstCaptureDone` (décision fondateur 21/07/2026 — « l'app ne ment jamais ») :
 * l'onboarding ne le pose PLUS. Il le posait à la sortie du flow alors que la
 * capture y était mise en scène : l'app enregistrait comme fait un accomplissement
 * qui n'avait pas eu lieu. Il reste `false` tant qu'aucune course réelle n'a
 * capturé de zone — quiconque le lira un jour lira la vérité.
 *
 * ═══ CE STOCKAGE N'EST PAS UNE AUTORITÉ (21/07/2026) ════════════════════════
 * AsyncStorage peut être ABSENT (navigation privée, localStorage bloqué, données
 * de site purgées, quota plein). Trois conséquences tenues ici, et nulle part
 * ailleurs :
 *
 *  1. UNE LECTURE IMPOSSIBLE N'EST PAS UNE RÉPONSE. `status` distingue les trois
 *     états que l'ancien code confondait en « défauts » : `reading` (on ne sait
 *     pas encore), `ready` (on a lu — valeur présente ou absente, les deux sont
 *     des réponses), `unavailable` (on NE PEUT PAS lire : ni vrai, ni faux).
 *     Un consommateur qui décide sur `ready` décide sur une réponse ; sur
 *     `unavailable` il doit RE-DEMANDER, jamais trancher sur un défaut.
 *
 *  2. UNE ÉCRITURE QUI ÉCHOUE SE DIT. `persistenceFailed` remonte l'échec (et
 *     `STORAGE_UNAVAILABLE_NOTICE` la phrase à afficher) : l'ancien `catch {}`
 *     avalait l'erreur, si bien que le joueur reperdait ses réponses à chaque
 *     lancement sans qu'un mot le lui dise.
 *
 *  3. RIEN NE PEUT SE BLOQUER DESSUS. Lectures ET écritures ont un délai maximum
 *     (STORAGE_TIMEOUT_MS) : un AsyncStorage qui ne répond JAMAIS produit un
 *     `unavailable` (donc une question reposée), pas un écran noir éternel. Et
 *     aucune navigation n'attend une écriture (voir app/onboarding/index.tsx).
 *
 * ⚠ CE QUE CE MODULE NE FAIT PLUS : porter un gate légal par le ROUTAGE. Le
 * gate 16+ est posé au POINT DE CRÉATION DE COMPTE (app/(auth)/sign-in*.tsx,
 * étape `account` de l'onboarding), pas sur l'accès à un écran. `ageConfirmed`
 * reste la mémoire de la déclaration ; ne pas la retransformer en condition
 * d'ACCÈS à /sign-in — c'est ce qui rendait la connexion inatteignable dès que
 * le stockage n'était pas persistant.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '../../i18n/types';
import { rememberOnboardingCompletion2026 } from './sessionCompletion2026';

import { createOnboardingPatchQueue2026, decodeOnboardingState2026, DEFAULT_ONBOARDING_STATE, type OnboardingState, type OnboardingRead2026 } from './onboardingPersistence2026';
export { DEFAULT_ONBOARDING_STATE } from './onboardingPersistence2026';
export type { OnboardingState, OnboardingPath } from './onboardingPersistence2026';

/**
 * Ce que vaut la lecture du stockage local.
 *  · `reading`     — la lecture initiale n'a pas résolu. On ne sait RIEN.
 *  · `ready`       — on a lu. Absence de valeur = réponse (nouveau visiteur).
 *  · `unavailable` — lecture impossible (stockage bloqué, blob corrompu, délai
 *                    dépassé). Les champs de `state` ne valent alors que ce que
 *                    CETTE session y a mis : tout le reste est un défaut, pas
 *                    une réponse.
 */
export type OnboardingStorageStatus = 'reading' | 'ready' | 'unavailable';

const STORAGE_KEY = 'gryd.onboarding.v1';

/**
 * Plafond de patience. Un AsyncStorage qui ne répond jamais (implémentation web
 * qui pend sur un localStorage verrouillé) ne doit pas pouvoir tenir l'app sur
 * un fond noir : passé ce délai, on déclare `unavailable` et on re-demande.
 */
const STORAGE_TIMEOUT_MS = 3000;

/**
 * ⚠ COPY HORS CATALOGUE, ASSUMÉE ET À RECENTRALISER. La règle du projet est
 * « copy 100 % dans src/i18n/catalog/* » ; ce chantier avait un périmètre de
 * fichiers exclusif qui n'incluait aucun catalogue, et taire l'échec de
 * persistance aurait été le vrai défaut (le joueur reperd ses réponses sans un
 * mot). L'Entry est donc posée AU PLUS PRÈS du fait qu'elle énonce — le store
 * est ce qui SAIT que l'écriture a échoué. À déplacer dans
 * `i18n/catalog/onboarding.ts` (clé `storageUnavailable`) à la prochaine passe.
 *
 * Elle n'affirme rien de plus que ce qui est vrai : l'app fonctionne, seule la
 * mémoire locale ne tient pas — donc les questions reviendront.
 */
export const STORAGE_UNAVAILABLE_NOTICE: Entry = {
  fr: 'Cet appareil ne garde pas tes réponses. Tout marche, mais elles te seront redemandées au prochain lancement.',
  en: 'This device isn’t keeping your answers. Everything works, but you’ll be asked again next time.',
  es: 'Este dispositivo no guarda tus respuestas. Todo funciona, pero te las pediremos de nuevo la próxima vez.',
  de: 'Dieses Gerät merkt sich deine Antworten nicht. Alles läuft, aber beim nächsten Start fragen wir erneut.',
  pt: 'Este aparelho não guarda suas respostas. Tudo funciona, mas vamos perguntar de novo na próxima vez.',
};

type Settled<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/**
 * Résout la valeur si la promesse aboutit, `{ ok: false }` si elle échoue OU si
 * elle met trop longtemps. Ne rejette JAMAIS : un appelant ne peut pas se
 * retrouver avec une exception non gérée sur un chemin de persistance.
 */
function settleWithin<T>(start: () => Promise<T>): Promise<Settled<T>> {
  let work: Promise<T>;
  try {
    work = start();
  } catch {
    // Certaines implémentations lèvent SYNCHRONEMENT (localStorage verrouillé).
    return Promise.resolve({ ok: false });
  }
  return new Promise<Settled<T>>((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false }), STORAGE_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve({ ok: true, value });
      },
      () => {
        clearTimeout(timer);
        resolve({ ok: false });
      },
    );
  });
}

/** Unknown/corrupt storage remains unknown; no consent is manufactured. */
async function readState(): Promise<OnboardingRead2026> {
  const read = await settleWithin(() => AsyncStorage.getItem(STORAGE_KEY));
  return read.ok ? decodeOnboardingState2026(read.value) : { ok: false };
}

// Shared across all hook instances. The disk is reread after the preceding
// patch, so a delayed onboarding completion cannot erase a newer age/city choice.
const writePatch = createOnboardingPatchQueue2026(readState, async state => {
  const result = await settleWithin(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)));
  return result.ok;
});

export interface OnboardingStore {
  /**
   * État courant. ⚠ À lire AVEC `status` : sous `unavailable`, les champs que
   * cette session n'a pas posés sont des DÉFAUTS, pas des réponses.
   */
  state: OnboardingState;
  /**
   * ⚠️ PAS de `loading: boolean` ici, volontairement. Un booléen force le
   * lecteur à ranger `unavailable` avec `ready` (« pas en train de charger,
   * donc c'est une réponse ») — c'est exactement la confusion qui a produit un
   * gate légal tranché sur des DÉFAUTS. Trois états, trois branches.
   */
  status: OnboardingStorageStatus;
  /**
   * Une écriture a échoué (ou n'a jamais abouti) : ce que le joueur vient de
   * décider ne survivra pas à la fermeture de l'app. Se DIT — voir
   * STORAGE_UNAVAILABLE_NOTICE.
   */
  persistenceFailed: boolean;
  /** Patch partiel + persistance. La promesse résout après la tentative d'écriture. */
  update: (patch: Partial<OnboardingState>) => Promise<boolean>;
}

/**
 * Hook d'accès à l'avancement d'onboarding. Charge en asynchrone, persiste
 * chaque patch. PURE côté rendu : aucune requête réseau.
 */
export function useOnboardingState(): OnboardingStore {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [status, setStatus] = useState<OnboardingStorageStatus>('reading');
  const [persistenceFailed, setPersistenceFailed] = useState(false);

  // Miroir synchrone de l'état courant : la persistance NE DÉPEND JAMAIS du
  // timing de l'updater setState. Une sortie de flow enchaîne update() puis
  // router.replace() (démontage immédiat) : l'updater fonctionnel serait alors
  // abandonné. La persistance ne reçoit désormais que le patch explicite.
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * ⚠ LA COURSE QUI ANNULAIT LE GATE (corrigée le 21/07/2026). La lecture
   * initiale écrasait `stateRef.current` SANS GARDE. Si le joueur répondait à
   * une question avant que la promesse ne résolve — quelques dizaines de ms, et
   * c'est exactement la fenêtre d'un tap sur un écran déjà peint — la lecture
   * atterrissait APRÈS et remettait la valeur du disque : la réponse était
   * silencieusement annulée, y compris une déclaration d'âge.
   *
   * On mémorise donc ce que CE MONTAGE a décidé. La lecture ne fournit plus que
   * le FOND : les décisions de la session gagnent toujours. La file relit
   * séparément le disque avant chaque patch ; elle n’écrit jamais ces défauts
   * sur un état encore inconnu.
   */
  const decidedRef = useRef<Partial<OnboardingState>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void readState().then((outcome) => {
      if (!mountedRef.current) return;
      if (!outcome.ok) {
        // On ne sait pas lire : on ne fabrique pas de réponse. `state` garde ce
        // que la session a décidé (et rien d'autre), `status` le dit.
        setStatus('unavailable');
        return;
      }
      const decided = decidedRef.current;
      const merged: OnboardingState = { ...outcome.state, ...decided };
      stateRef.current = merged;
      setState(merged);
      setStatus('ready');

    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingState>) => {
    if (typeof patch.onboardingDone === 'boolean') rememberOnboardingCompletion2026(patch.onboardingDone);
    // Décision de session : elle prime sur la lecture, même si celle-ci arrive
    // après (voir decidedRef ci-dessus).
    decidedRef.current = { ...decidedRef.current, ...patch };
    // Fusion synchrone depuis la ref (jamais depuis l'updater async de setState)
    // pour que des update() enchaînés dans le même tick composent bien.
    const next: OnboardingState = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
    const persisted = await writePatch(patch);
    if (mountedRef.current && !persisted) setPersistenceFailed(true);
    return persisted;
  }, []);

  return { state, status, persistenceFailed, update };
}
