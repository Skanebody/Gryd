/**
 * GRYD — chargement des fontes NIGHT PRINT (refonte Vague 1).
 *
 * Inter Tight (titres, chiffres) · Inter (interface) · JetBrains Mono (labels).
 * @expo-google-fonts charge chaque GRAISSE sous un nom de famille distinct
 * (`Inter_500Medium`…) : en React Native une famille à graisse nommée IGNORE
 * `fontWeight` — c'est la FAMILLE qui porte la graisse. Les tokens `fonts.*`
 * (design-tokens) exposent donc une famille par graisse utile, et chaque style
 * choisit la bonne (jamais un `fontWeight` sur ces familles).
 *
 * On ne charge QUE les graisses réellement employées par l'échelle Night Print
 * (8 fichiers) — inutile d'embarquer 100→900.
 */
import { useFonts } from 'expo-font';
import {
  InterTight_600SemiBold,
  InterTight_700Bold,
  InterTight_800ExtraBold,
} from '@expo-google-fonts/inter-tight';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

/**
 * Charge les fontes de l'app. `true` quand prêtes (ou en cas d'échec — on ne
 * bloque JAMAIS le démarrage sur une fonte : le système prend le relais).
 * L'appelant (root layout) attend ce booléen avant de rendre l'UI.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    InterTight_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
  });
  // Un échec de police ne doit pas geler l'app : on rend quand même (fallback système).
  return loaded || error !== null;
}
