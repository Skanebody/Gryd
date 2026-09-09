/**
 * GRYD — « ON NE POSE LA QUESTION QU'UNE FOIS » (permission d'arrière-plan).
 *
 * L'enregistrement écran verrouillé demande la permission de localisation
 * « Toujours ». Jusqu'ici, GRYD ne la proposait qu'AU RETOUR d'un passage en
 * arrière-plan — c'est-à-dire après avoir déjà perdu des points, sur un écran
 * où le joueur court. Le cahier (G07) veut la question au moment où elle est
 * utile : à l'amorce, avant le premier départ.
 *
 * Poser une question au bon moment n'autorise pas à la reposer à chaque sortie :
 * un refus est une réponse. Cette mémoire est LOCALE (aucun compte, aucun
 * réseau) et ne retient qu'un fait — « on a demandé » — jamais la réponse : la
 * plateforme reste seule à savoir ce qui est accordé, et c'est elle qu'on relit
 * (`RunBackgroundSupport.checkGranted`).
 *
 * Un stockage illisible vaut « jamais demandé » : au pire la question revient
 * une fois, jamais une permission n'est supposée accordée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_OFFER_KEY = 'gryd.run.backgroundOffer.v1';

/** La proposition a-t-elle DÉJÀ été faite sur cet appareil ? */
export async function backgroundOfferSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(BACKGROUND_OFFER_KEY)) !== null;
  } catch {
    return false;
  }
}

/** Retient qu'on a posé la question — quelle que soit la réponse. */
export async function markBackgroundOfferSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKGROUND_OFFER_KEY, '1');
  } catch {
    // Stockage indisponible : la question pourra revenir. Jamais bloquant.
  }
}
