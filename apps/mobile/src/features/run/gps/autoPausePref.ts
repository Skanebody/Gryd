/**
 * GRYD — LA PAUSE AUTOMATIQUE EST UN RÉGLAGE, PAS UNE FATALITÉ (cahier §8.2).
 *
 * « Course à pied : désactivée par défaut, réglage personnel. Vélo : proposée
 * pour arrêts. » Elle était appliquée à tout le monde, sans réglage : un coureur
 * voyait son chrono se figer au feu rouge sans l'avoir demandé — et son temps
 * cessait d'être celui de sa montre.
 *
 * UNE PRÉFÉRENCE PAR DISCIPLINE. Les deux mondes ne partagent ni le même besoin
 * (un cycliste s'arrête pour de vrai à chaque carrefour) ni le même défaut.
 *
 * Un stockage illisible rend le DÉFAUT DU CAHIER, jamais une valeur au hasard :
 * ne pas savoir ce que le joueur préfère n'autorise pas à décider à sa place.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Activity } from '@klaim/shared';
import { autoPauseDefault2026 } from './runPipeline';

const key = (activity: Activity) => `gryd.run.autoPause.${activity}.v1`;

/** Préférence enregistrée, ou le défaut du cahier pour cette discipline. */
export async function loadAutoPause2026(activity: Activity): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key(activity));
    if (raw === '1') return true;
    if (raw === '0') return false;
    return autoPauseDefault2026(activity);
  } catch {
    return autoPauseDefault2026(activity);
  }
}

/** Enregistre le choix. `false` : l'écriture a échoué, l'appelant le sait. */
export async function saveAutoPause2026(activity: Activity, value: boolean): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key(activity), value ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
