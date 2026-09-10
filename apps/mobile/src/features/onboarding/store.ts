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
import { useCallback, useSyncExternalStore } from 'react';
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
  state: OnboardingState;
  status: OnboardingStorageStatus;
  persistenceFailed: boolean;
  update: (patch: Partial<OnboardingState>) => Promise<boolean>;
}

/**
 * ─── UN SEUL ÉTAT, PARTAGÉ PAR TOUTES LES INSTANCES (11/09/2026) ─────────────
 *
 * Jusqu'ici chaque appel de `useOnboardingState()` portait SON instantané :
 * lu une fois au montage, jamais relu, jamais prévenu des décisions prises
 * ailleurs. La conséquence, prouvée par le harnais E2E (S2 « le gate 16+ ne se
 * redemande PAS ») : la porte de compte écrivait `ageConfirmed: true` puis
 * poussait `/email` dans le même tick ; l'écran e-mail montait, LISAIT le
 * disque avant que la file d'écriture n'ait atterri, et redemandait l'âge.
 * Déterministe sur une machine chargée, invisible sur une machine rapide —
 * exactement le genre de défaut qu'une preuve manuelle ne voit jamais.
 *
 * Désormais l'état vit au niveau du module : une lecture unique par processus,
 * des décisions de session qui priment toujours sur le disque, et chaque
 * instance abonnée par `useSyncExternalStore`. Un `update()` est visible par
 * l'écran suivant AVANT sa persistance, qui reste asynchrone et dite
 * (`persistenceFailed`). `refreshOnboardingState()` relit le disque pour les
 * rares chemins qui l'écrivent sans passer par ici.
 */
interface Snapshot {
  readonly state: OnboardingState;
  readonly status: OnboardingStorageStatus;
  readonly persistenceFailed: boolean;
}

let snapshot: Snapshot = { state: DEFAULT_ONBOARDING_STATE, status: 'reading', persistenceFailed: false };
let decided: Partial<OnboardingState> = {};
let reading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

function startReading(): Promise<void> {
  if (reading) return reading;
  reading = readState().then((outcome) => {
    if (!outcome.ok) {
      // On ne sait pas lire : on ne fabrique pas de réponse. L'état garde ce que
      // la session a décidé (et rien d'autre), `status` le dit.
      publish({ status: 'unavailable' });
      return;
    }
    // La lecture ne fournit que le FOND : les décisions de la session gagnent.
    publish({ state: { ...outcome.state, ...decided }, status: 'ready' });
  });
  return reading;
}

/** Relit le disque (après une écriture faite hors de ce magasin). */
export async function refreshOnboardingState(): Promise<void> {
  reading = null;
  await startReading();
}

/** Applique un patch : visible immédiatement partout, persisté ensuite. */
export async function updateOnboardingState(patch: Partial<OnboardingState>): Promise<boolean> {
  if (typeof patch.onboardingDone === 'boolean') rememberOnboardingCompletion2026(patch.onboardingDone);
  decided = { ...decided, ...patch };
  publish({ state: { ...snapshot.state, ...patch } });
  const persisted = await writePatch(patch);
  if (!persisted) publish({ persistenceFailed: true });
  return persisted;
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  void startReading();
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = (): Snapshot => snapshot;

/**
 * Hook d'accès à l'avancement d'onboarding. Charge en asynchrone (une fois par
 * processus), persiste chaque patch. PURE côté rendu : aucune requête réseau.
 */
export function useOnboardingState(): OnboardingStore {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const update = useCallback(updateOnboardingState, []);
  return { state: current.state, status: current.status, persistenceFailed: current.persistenceFailed, update };
}
