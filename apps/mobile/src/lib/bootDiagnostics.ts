/**
 * GRYD — diagnostic de démarrage (TEMPORAIRE, à retirer une fois le crash iOS
 * élucidé). Le 1ᵉʳ build natif crashe après le splash sans AUCUN message : en
 * release, une erreur JS fatale part dans RCTFatal → abort, et le .ips ne
 * contient pas le message JS. Ce module s'importe EN PREMIER dans app/_layout
 * et intercepte le handler d'erreurs global : la première erreur FATALE est
 * AFFICHÉE À L'ÉCRAN (Alert) au lieu de tuer le process — le fondateur peut
 * la lire et la rapporter, sans Mac ni Console.app.
 *
 * Les erreurs non fatales continuent vers le handler d'origine. Web : no-op
 * (le preview web a déjà la console).
 */
import { Alert, Platform } from 'react-native';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsLike {
  getGlobalHandler(): GlobalErrorHandler | undefined;
  setGlobalHandler(handler: GlobalErrorHandler): void;
}

const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

let alreadyShown = false;

if (Platform.OS !== 'web' && errorUtils) {
  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal && !alreadyShown) {
      alreadyShown = true;
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}\n\n${(error.stack ?? '').slice(0, 900)}`
          : String(error);
      // setTimeout : laisse le tick JS se terminer avant de présenter l'alerte.
      setTimeout(() => {
        Alert.alert('GRYD — erreur au démarrage', message, [{ text: 'OK' }]);
      }, 0);
      // On ne propage PAS : propager = RCTFatal = crash muet. L'app peut rester
      // sur un écran vide, mais l'erreur est LISIBLE — c'est le but.
      return;
    }
    previous?.(error, isFatal);
  });
}

export {};
