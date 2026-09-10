/**
 * GRYD — CE BINAIRE PEUT-IL SCANNER ? (LOT Q4, 11/09/2026)
 *
 * ═══ POURQUOI CETTE QUESTION A UNE RÉPONSE EXACTE ═══════════════════════════
 * `expo-camera` est un module NATIF : il n'est présent que dans un binaire
 * construit APRÈS son ajout. Le build que le fondateur a sur son iPhone
 * (31cdde4e, 11/09/2026) ne l'a pas. Peindre un onglet « Scanner » à l'aveugle
 * donnerait, selon la plateforme, un écran noir ou un crash au premier appel :
 * c'est la définition du bouton mort que la constitution interdit
 * (« l'affichage se dérive de la capacité RÉELLE de la plateforme »).
 *
 * Deux faits, tous deux vérifiables, et il faut les DEUX :
 *   ① la config EMBARQUÉE au build déclare le plugin avec une purpose string
 *     (`Constants.expoConfig.plugins`) — sans elle, iOS TUE l'app à l'ouverture
 *     de la caméra, il ne refuse pas poliment ;
 *   ② le module natif répond au `require` — la config peut être à jour dans le
 *     dépôt sans que le binaire installé, lui, embarque quoi que ce soit.
 * Le second seul ne suffit pas (sur iOS, un module présent sans purpose string
 * crashe), le premier seul non plus (la config voyage avec le JS, pas avec le
 * natif). On exige les deux, et l'écran dit lequel manque.
 *
 * ═══ MÊME PATRON QUE `cameraAvatarCapability` ═══════════════════════════════
 * `features/social/avatarPhoto.ts` a posé la doctrine pour la photo de profil.
 * On ne la réécrit pas : on la reprend, avec un plugin différent et un fait de
 * plus (le module natif). La partie qui DÉCIDE est pure et testée en Deno ; la
 * partie qui MESURE (require, Constants) est minuscule et ne décide de rien.
 */

/** Le plugin qui déclare l'appareil photo POUR LE SCANNER (app.json). */
export const CAMERA_PLUGIN_2026 = 'expo-camera';

export type ScanCapability2026 =
  /** Config déclarée ET module natif présent : l'onglet Scanner est réel. */
  | 'capable'
  /** iOS/Android, mais ce binaire est antérieur au plugin : un build le règle. */
  | 'needs_build'
  /** Web : la carte de scan n'est pas peinte du tout (aucun onglet). */
  | 'unsupported_platform';

/** Forme d'une entrée de `expo.plugins` : `"nom"` ou `["nom", options]`. */
export type ExpoPluginEntry2026 = string | readonly unknown[] | unknown;

function pluginName(entry: ExpoPluginEntry2026): string | null {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
  return null;
}

function pluginOptions(entry: ExpoPluginEntry2026): Record<string, unknown> | null {
  if (!Array.isArray(entry)) return null;
  const options = entry[1];
  return typeof options === 'object' && options !== null
    ? (options as Record<string, unknown>)
    : null;
}

/**
 * Le verdict, PUR. Chaque entrée est un FAIT mesuré ailleurs, jamais une
 * supposition.
 *
 * @param platform      `Platform.OS`.
 * @param plugins       `Constants.expoConfig?.plugins`, TEL QUEL.
 * @param nativeLoaded  le `require('expo-camera')` a-t-il abouti ?
 *
 * Une config illisible (`null`) vaut NON : on ne peut pas PROUVER la capacité,
 * et un « peut-être » se paie ici par un crash système, pas par un message.
 */
export function scanCapability2026(
  platform: string,
  plugins: readonly ExpoPluginEntry2026[] | null | undefined,
  nativeLoaded: boolean,
): ScanCapability2026 {
  if (platform !== 'ios' && platform !== 'android') return 'unsupported_platform';
  if (!nativeLoaded) return 'needs_build';
  if (plugins === null || plugins === undefined) return 'needs_build';
  const entry = plugins.find((item) => pluginName(item) === CAMERA_PLUGIN_2026);
  if (entry === undefined) return 'needs_build';
  const permission = pluginOptions(entry)?.cameraPermission;
  return typeof permission === 'string' && permission.trim().length > 0
    ? 'capable'
    : 'needs_build';
}

// ─── MESURE : trois requires paresseux, aucune décision ─────────────────────

function platformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native') as { Platform: { OS: string } }).Platform.OS;
  } catch {
    return 'unknown';
  }
}

function configPlugins(): readonly ExpoPluginEntry2026[] | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants') as {
      default?: { expoConfig?: { plugins?: unknown[] } | null };
      expoConfig?: { plugins?: unknown[] } | null;
    };
    const config = Constants.default?.expoConfig ?? Constants.expoConfig ?? null;
    return config?.plugins ?? null;
  } catch {
    return null;
  }
}

/**
 * Le module de caméra, ou `null`. Chargé PARESSEUSEMENT : un build sans lui ne
 * doit pas casser au chargement de l'écran, il doit répondre `needs_build`.
 * On vérifie que `CameraView` est bien là — un module présent mais amputé
 * (résolution web partielle, hoist bizarre) n'est pas une caméra.
 */
export function loadCameraModule2026(): { CameraView?: unknown } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-camera') as { CameraView?: unknown };
    return typeof mod?.CameraView === 'undefined' ? null : mod;
  } catch {
    return null;
  }
}

/** Capacité RÉELLE de CE binaire à scanner un QR. */
export function scanAvailable2026(): ScanCapability2026 {
  return scanCapability2026(platformOS(), configPlugins(), loadCameraModule2026() !== null);
}
