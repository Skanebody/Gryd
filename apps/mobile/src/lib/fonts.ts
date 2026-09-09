/**
 * GRYD : Manrope (titres et chiffres), Inter (lecture), JetBrains Mono (repères).
 * Familles distinctes par graisse ; fontes embarquées, aucun appel Google Fonts.
 * Inter Tight reste disponible pour les composants historiques à famille explicite.
 */
import { useFonts } from 'expo-font';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import {
  InterTight_400Regular,
  InterTight_500Medium,
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
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    InterTight_400Regular,
    InterTight_500Medium,
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
