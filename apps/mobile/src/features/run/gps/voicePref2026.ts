/**
 * GRYD — LES ANNONCES VOCALES SONT UN RÉGLAGE (LOT R, 11/09/2026).
 *
 * ─── CE QUI EXISTAIT, ET CE QUI MANQUAIT ────────────────────────────────────
 * La sortie parlait déjà TROIS fois (départ, boucle presque fermée, boucle
 * fermée — `mvp/run/feedback.ts`, règles pures et testées). Ce lot ajoute la
 * seule annonce qui se RÉPÈTE : le kilomètre, avec son allure. C'est celle que
 * tout le monde attend d'une app de course, et c'est aussi la seule qui puisse
 * devenir du harcèlement si on ne peut pas la couper.
 *
 * D'où cet interrupteur, dans « Pendant la sortie » (`/parametres/course`),
 * à côté des haptiques. Il gouverne TOUTE la voix, pas seulement le kilomètre :
 * quelqu'un qui coupe les annonces ne demande pas « moins d'annonces ».
 *
 * ─── LE DÉFAUT EST « ACTIVÉ », ET C'EST UN CHOIX ────────────────────────────
 * Les trois phrases historiques étaient dites sans réglage. Livrer
 * l'interrupteur par défaut à « désactivé » aurait rendu MUETTE une sortie qui
 * parlait la veille, sans que personne ne l'ait demandé. Un réglage neuf ne
 * retire jamais en silence ce qui existait.
 *
 * Un stockage illisible rend le DÉFAUT, jamais une valeur au hasard : ne pas
 * savoir ce que le joueur préfère n'autorise pas à décider à sa place. (Même
 * doctrine, même forme, que `autoPausePref.ts` — dont ce module est le jumeau
 * volontaire. Ils ne sont pas fusionnés parce que la pause automatique est une
 * préférence PAR DISCIPLINE, et pas la voix : couper le son ne dépend pas de ce
 * qu'on pratique.)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gryd.run.voice.v1';

/** La voix est ACTIVÉE tant que personne n'a dit le contraire (voir l'en-tête). */
export const VOICE_DEFAULT_2026 = true;

/** Préférence enregistrée, ou le défaut. Jamais un `null` qui ferait attendre. */
export async function loadVoicePref2026(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return VOICE_DEFAULT_2026;
  } catch {
    return VOICE_DEFAULT_2026;
  }
}

/** Enregistre le choix. `false` : l'écriture a échoué, l'appelant le sait. */
export async function saveVoicePref2026(value: boolean): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, value ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
