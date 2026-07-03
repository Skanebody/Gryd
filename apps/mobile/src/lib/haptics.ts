/**
 * GRYD — wrapper haptics (AMENDEMENT-08 §1, doc §25).
 * expo-haptics chargé dynamiquement : no-op sur web ET si le module est absent
 * (dev builds anciens). Grammaire gelée doc §25 :
 *   light  : bouton, capture simple, check, réaction ;
 *   medium : badge Race/Carbon, rank up, achat, zone contrôlée ;
 *   heavy  : Legend unlock, victoire crew, #1 classement, fin de saison ;
 *   success: confirmation (course validée, coffre ouvert).
 * Toujours fire-and-forget : un échec haptique ne casse jamais l'UI.
 * Désactivable (AMENDEMENT-08 §12 « haptics optionnels ») : setHapticsEnabled
 * persiste le choix (AsyncStorage, clé 'gryd.haptics', défaut activé) — la
 * lecture est LAZY au premier fire, les call-sites restent inchangés.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HapticsModule {
  impactAsync(style: unknown): Promise<unknown>;
  notificationAsync(type: unknown): Promise<unknown>;
  ImpactFeedbackStyle: { Light: unknown; Medium: unknown; Heavy: unknown };
  NotificationFeedbackType: { Success: unknown };
}

let mod: HapticsModule | null = null;
if (Platform.OS !== 'web') {
  try {
    // require dynamique : évite le crash au bundle si le module manque.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('expo-haptics') as HapticsModule;
  } catch {
    mod = null;
  }
}

/** Clé de persistance du réglage « Retours haptiques ». */
const HAPTICS_STORAGE_KEY = 'gryd.haptics';

/** Réglage en mémoire — défaut true (les haptics sont un bonus opt-out). */
let enabled = true;
/** Lecture unique et LAZY du réglage persisté (déclenchée au premier fire). */
let loadPromise: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(HAPTICS_STORAGE_KEY)
      .then((raw) => {
        if (raw !== null) enabled = raw !== 'false';
      })
      .catch(() => {
        // Best effort : stockage indisponible → défaut (activé).
      });
  }
  return loadPromise;
}

/** Lit le réglage persisté (écran de réglages) — résout le défaut si absent. */
export async function getHapticsEnabled(): Promise<boolean> {
  await ensureLoaded();
  return enabled;
}

/** Active/désactive tous les retours haptiques, persisté sous 'gryd.haptics'. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  // La valeur en mémoire fait foi désormais — inutile de relire le stockage.
  loadPromise = Promise.resolve();
  void AsyncStorage.setItem(HAPTICS_STORAGE_KEY, String(value)).catch(() => {});
}

function fire(run: (m: HapticsModule) => Promise<unknown>): void {
  if (!mod) return;
  const m = mod;
  try {
    void ensureLoaded()
      .then(() => (enabled ? run(m) : undefined))
      .catch(() => {});
  } catch {
    // no-op — l'haptique est un bonus, jamais un point de défaillance.
  }
}

export const haptics = {
  light: () => fire((m) => m.impactAsync(m.ImpactFeedbackStyle.Light)),
  medium: () => fire((m) => m.impactAsync(m.ImpactFeedbackStyle.Medium)),
  heavy: () => fire((m) => m.impactAsync(m.ImpactFeedbackStyle.Heavy)),
  success: () => fire((m) => m.notificationAsync(m.NotificationFeedbackType.Success)),
} as const;

export type Haptics = typeof haptics;
