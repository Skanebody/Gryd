/**
 * GRYD — LA VOIX : l'I/O, et rien d'autre.
 *
 * ─── CE MODULE NE DÉCIDE RIEN ───────────────────────────────────────────────
 * Quand parler et quoi dire vivent dans `feedback.ts`, PURS et testés
 * (`startVoice`, `gaugeVoice`). Ici on ne fait que porter une phrase jusqu'au
 * haut-parleur. Si une règle apparaît dans ce fichier, elle est au mauvais
 * endroit : elle sera invérifiable, parce qu'aucun test ne peut écouter.
 *
 * ─── ON PARLE UNE `Entry`, JAMAIS UNE `string` ──────────────────────────────
 * `say` prend une entrée du catalogue, pas du texte. C'est L18 rendue
 * STRUCTURELLE : écrire « Boucle fermée » en dur ici serait une erreur de type,
 * pas une revue de code à faire. La langue est relue à l'instant où l'on parle
 * (`getLocale()`) — pas capturée au montage de l'écran, sinon une bascule de
 * langue en pleine course ferait parler l'ancienne.
 *
 * ─── DEUX PHRASES QUI SE CHEVAUCHENT : ON COUPE, ON N'EMPILE PAS ────────────
 * `Speech.speak` EMPILE par défaut (« adds an utterance to queue »,
 * `Speech.d.ts`) — c'est `AVSpeechSynthesizer` en dessous. Or nos trois moments
 * peuvent tomber à une seconde d'écart : la jauge est recalculée à chaque
 * relevé, et le dernier virage fait passer `almost` puis `closed` en deux
 * points GPS. Empiler ferait entendre « Boucle presque fermée » APRÈS que la
 * boucle soit fermée, puis la vérité avec une seconde et demie de retard : une
 * phrase fausse au moment où elle est dite. On coupe donc l'utterance en cours
 * (`stop()`) avant chaque phrase — la nouvelle est toujours la plus vraie, et
 * la voix ne peut jamais accumuler de retard.
 *
 * ─── CE QUI RESTE HORS DE PORTÉE SANS CODE NATIF ────────────────────────────
 * `expo-speech@13` ne touche JAMAIS à l'`AVAudioSession` (aucune occurrence
 * dans `ios/SpeechModule.swift`) et son `SpeechOptions` natif n'expose que
 * `language`, `pitch`, `rate`, `voice`. Il n'offre donc :
 *   · AUCUN ducking — on ne peut pas baisser Spotify le temps d'une phrase.
 *     Ce n'est pas promis ailleurs dans le produit, et ça ne le sera pas tant
 *     que ça demande un module natif ;
 *   · AUCUN contrôle du commutateur silencieux ni de la lecture écran
 *     verrouillé : la session reste celle par défaut d'iOS, et l'app ne
 *     déclare pas le mode d'arrière-plan `audio` (`app.json` n'a que
 *     `location`).
 * Rien de tout ça n'est simulé ici : un réglage inventé serait un réglage qui
 * ment.
 *
 * `rate` et `pitch` ne sont volontairement PAS passés : toute valeur serait un
 * nombre magique, et le défaut du système est déjà celui que l'utilisateur a
 * réglé pour toutes ses autres apps.
 */
import { Platform } from 'react-native';
import { getLocale } from '../../i18n/store';
import { resolve, type Entry, type Locale } from '../../i18n/types';

/** La part d'`expo-speech` qu'on utilise — le reste n'a pas à être typé ici. */
interface SpeechModule {
  speak(text: string, options: { language: string }): void;
  stop(): Promise<void>;
}

/**
 * BCP 47 par langue de l'app. Nos codes à deux lettres n'en sont pas : iOS
 * construit la voix par `AVSpeechSynthesisVoice(language:)`, et un « fr » nu ne
 * garantit aucune région. On nomme donc la région la plus large de chaque
 * langue — `pt-BR` plutôt que `pt-PT` parce que le catalogue vise São Paulo
 * autant que Lisbonne (`i18n/types.ts`).
 */
const BCP47: Readonly<Record<Locale, string>> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  pt: 'pt-BR',
};

/**
 * Chargement DÉFENSIF, comme `lib/haptics.ts` : `expo-speech` vient d'être
 * ajouté, donc AUCUN build déjà installé sur un appareil n'a son module natif —
 * et `requireNativeModule('ExpoSpeech')` jette au chargement quand il manque.
 * Un import statique ferait tomber l'écran de COURSE sur ces builds : la voix
 * est un bonus, elle ne peut pas coûter une course.
 */
let mod: SpeechModule | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('expo-speech') as SpeechModule;
  } catch {
    mod = null;
  }
}

/** Dit une phrase du catalogue, dans la langue courante. Fire-and-forget. */
export function say(entry: Entry): void {
  const m = mod;
  if (m === null) return;
  const locale = getLocale();
  try {
    void m
      .stop()
      // Un `stop` en échec ne doit pas rendre la voix muette pour le reste de
      // la course : au pire on empile une phrase, ce qui reste moins grave que
      // de ne plus rien dire du tout.
      .catch(() => undefined)
      .then(() => {
        m.speak(resolve(entry, locale), { language: BCP47[locale] });
      })
      .catch(() => undefined);
  } catch {
    // Module natif parti en cours de route : on se tait, on ne casse rien.
  }
}

/**
 * Coupe la voix. Appelé au DÉMONTAGE de l'écran de course : une phrase encore
 * en cours parlerait par-dessus l'écran de résultat, en décrivant une course
 * qui est déjà finie.
 */
export function stopSpeaking(): void {
  const m = mod;
  if (m === null) return;
  try {
    void m.stop().catch(() => undefined);
  } catch {
    // Idem : jamais un point de défaillance.
  }
}
