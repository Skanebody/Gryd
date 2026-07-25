/**
 * GRYD — FILET FATAL + JOURNAL INTERNE des erreurs.
 *
 * ─── CE QUE CE MODULE REMPLACE, ET POURQUOI ─────────────────────────────────
 * `src/lib/bootDiagnostics.ts` posait un handler d'erreurs global qui, sur la
 * PREMIÈRE erreur fatale, affichait `error.name: error.message` suivi de 900
 * caractères de PILE D'APPEL dans une `Alert` — sans aucune garde `__DEV__`.
 * C'était un outil de diagnostic assumé (« TEMPORAIRE », écrit dans son
 * en-tête), posé pour élucider le crash de démarrage iOS des builds 1-3. Ce
 * crash est élucidé depuis : la cause était le TextDecoder utf-16le, et le
 * correctif vit dans `src/lib/textDecoderUtf16`, importé juste après.
 *
 * Ce qui restait, c'était un chemin GARANTI vers un message technique brut
 * affiché au joueur EN PRODUCTION — précisément ce que le fondateur a vu et
 * refuse (« aucun message technique brut ne doit apparaître ; log interne oui,
 * affichage brut non »). Ce module reprend la moitié utile de bootDiagnostics —
 * NE PAS propager l'erreur fatale, parce que propager vaut RCTFatal, donc un
 * crash muet — et remplace sa moitié fautive par une alerte GRYD honnête.
 *
 * ─── POURQUOI SES IMPORTS SONT SI MAIGRES ───────────────────────────────────
 * Ce module est le TOUT PREMIER importé par `app/_layout.tsx` : les imports
 * s'évaluent dans l'ordre, et le handler doit être posé AVANT que quoi que ce
 * soit d'autre puisse casser en se chargeant. Il ne tire donc statiquement que
 * `react-native` et de la logique pure. Le store de langue et l'analytique sont
 * atteints en `require` PARESSEUX, au moment de l'erreur seulement — même
 * patron que `i18n/store` pour expo-localization. Les charger au démarrage
 * ferait porter au filet le risque qu'il est censé couvrir.
 */
import { Alert, Platform } from 'react-native';
import { analyticsErrorName, buildFatalAlertView, classifyAppError } from './appErrorPolicy';
import type { Locale } from '../i18n/types';
import type { EventName, EventProps } from '../lib/analytics';

interface ErrorUtilsLike {
  getGlobalHandler?(): ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?(handler: (error: unknown, isFatal?: boolean) => void): void;
}

/** Langue courante, sans faire porter au démarrage le coût du store. */
function currentLocale(): Locale {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const store = require('../i18n/store') as { getLocale(): Locale };
    return store.getLocale();
  } catch {
    // Store indisponible : même défaut que lui (l'anglais), jamais un plantage
    // DANS le filet d'erreur.
    return 'en';
  }
}

/**
 * JOURNAL INTERNE — la seule chose qui a le droit de voir le détail technique.
 *
 * Deux destinations, toutes deux DÉJÀ dans le repo (aucun service ni
 * dépendance inventés, exigence du chantier) :
 *   1. `console.error` avec le préfixe `[GRYD]`, comme partout ailleurs ;
 *   2. l'event PostHog `crash` — défini dans `packages/shared/src/events.ts`
 *      (§8 « Santé produit ») depuis l'origine et JAMAIS émis jusqu'ici. On ne
 *      crée pas de nom d'event : on branche celui qui attendait.
 *
 * Les props sont un vocabulaire FERMÉ (`kind`, `name`, `fatal`) — le MESSAGE
 * d'erreur ne part jamais en analytique : il peut porter une URL, un jeton ou
 * un identifiant. Même discipline que `deep_link_opened`, qui n'envoie que
 * `kind` et jamais le code d'invitation.
 */
export function logAppError(error: unknown, fatal: boolean): void {
  // Console : détail COMPLET, c'est un journal, pas un écran.
  console.error('[GRYD] erreur applicative', { fatal }, error);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analytics = require('../lib/analytics') as {
      EVENTS: Record<'crash', EventName>;
      track: (event: EventName, props?: EventProps) => void;
    };
    analytics.track(analytics.EVENTS.crash, {
      kind: classifyAppError(error),
      name: analyticsErrorName(error),
      fatal,
    });
  } catch {
    // L'analytique ne doit JAMAIS aggraver un crash (même règle défensive que
    // `makePostHog`). Le `console.error` ci-dessus a déjà tout consigné.
  }
}

let installed = false;
let alreadyAlerted = false;

/**
 * Pose le handler d'erreurs global (natif uniquement — en web la console EST le
 * journal, et le navigateur n'affiche rien par-dessus l'app).
 *
 * Ce filet ne couvre PAS les mêmes erreurs que la frontière React : il attrape
 * ce qui casse HORS rendu — évaluation d'un module, callback natif, tâche de
 * fond — c'est-à-dire les cas où aucun arbre React n'est monté pour rendre
 * l'écran GRYD. D'où l'`Alert` : c'est la seule surface qui existe encore.
 */
export function installFatalErrorGuard(): void {
  if (Platform.OS === 'web' || installed) return;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  const setHandler = errorUtils?.setGlobalHandler;
  if (!errorUtils || typeof setHandler !== 'function') return;
  installed = true;

  const previous = errorUtils.getGlobalHandler?.();

  setHandler.call(errorUtils, (error: unknown, isFatal?: boolean) => {
    if (!isFatal) {
      previous?.(error, isFatal);
      return;
    }
    logAppError(error, true);

    // EN DÉVELOPPEMENT, on rend la main à LogBox : l'écran rouge symbolisé de
    // Metro est un bien meilleur outil qu'une alerte, et c'est là que le détail
    // technique doit vivre. On ne remplace le comportement natif qu'en
    // PRODUCTION, là où il n'y a personne pour lire une pile d'appel.
    if (__DEV__ && previous) {
      previous(error, isFatal);
      return;
    }

    if (alreadyAlerted) return;
    alreadyAlerted = true;
    const view = buildFatalAlertView(error, currentLocale(), __DEV__);
    // setTimeout : laisser le tick JS courant se terminer avant de présenter
    // l'alerte (sinon elle peut être avalée par le démontage en cours).
    setTimeout(() => {
      try {
        Alert.alert(view.title, view.body, [{ text: view.okLabel }]);
      } catch {
        // Même une alerte peut échouer très tôt au démarrage. Le journal a été
        // écrit ; on ne relance pas d'erreur depuis le filet d'erreur.
      }
    }, 0);

    // On ne propage PAS l'erreur fatale : propager vaut RCTFatal, donc un crash
    // MUET — le joueur n'aurait alors aucun message du tout. L'app peut rester
    // sur un écran figé, mais elle aura DIT ce qui se passe et quoi faire.
  });
}
