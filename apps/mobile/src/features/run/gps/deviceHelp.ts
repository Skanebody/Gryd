/**
 * GRYD — aide « Courir écran éteint » par constructeur (AMENDEMENT-15 §2,
 * « tous les téléphones »). Les surcouches Android (Samsung/Xiaomi/Huawei/
 * OnePlus…) tuent les services GPS en fond par optimisation de batterie :
 * texte statique court par constructeur (Entries i18n — résolues à l'affichage
 * par le composant), constructeur courant détecté via Platform.constants. Les
 * réglages constructeur ne sont pas adressables par URL publique fiable → le
 * bouton ouvre les réglages de l'app (Linking, géré par
 * provider.openLocationSettings), le texte guide le reste. iOS : section
 * dédiée (« Toujours » + « Position exacte »). Anti-shame : on explique le
 * téléphone, on n'accuse jamais le coureur.
 */
import { Platform } from 'react-native';
import type { Entry } from '../../../i18n/types';
import { C } from '../../../i18n/catalog/runGps';

export interface VendorHelp {
  id: string;
  /** Nom affiché (Entry — marques invariantes, « Autres Android » traduit). */
  vendor: Entry;
  /** Détection sur Platform.constants.Manufacturer/Brand (minuscules). */
  match: RegExp;
  /** Étapes courtes (Entries — résolues par le composant à l'affichage). */
  steps: readonly Entry[];
}

/** Aides Android par constructeur (les tueurs de batterie connus). */
export const VENDOR_HELP: readonly VendorHelp[] = [
  {
    id: 'samsung',
    vendor: C.vendorSamsung,
    match: /samsung/,
    steps: [C.helpSamsung1, C.helpSamsung2, C.helpSamsung3],
  },
  {
    id: 'xiaomi',
    vendor: C.vendorXiaomi,
    match: /xiaomi|redmi|poco/,
    steps: [C.helpXiaomi1, C.helpXiaomi2],
  },
  {
    id: 'huawei',
    vendor: C.vendorHuawei,
    match: /huawei|honor/,
    steps: [C.helpHuawei1, C.helpHuawei2],
  },
  {
    id: 'oneplus',
    vendor: C.vendorOneplus,
    match: /oneplus|oppo|realme/,
    steps: [C.helpOneplus1, C.helpOneplus2],
  },
  {
    id: 'autre',
    vendor: C.vendorOtherAndroid,
    match: /.^/, // jamais auto-détecté — section générique toujours listée
    steps: [C.helpAndroid1, C.helpAndroid2],
  },
] as const;

/** Étapes iOS (précision approximative + arrière-plan). */
export const IOS_HELP_STEPS: readonly Entry[] = [C.helpIos1, C.helpIos2] as const;

/** Id du constructeur courant (Android), null si inconnu/iOS/web. */
export function currentVendorId(): string | null {
  if (Platform.OS !== 'android') return null;
  const c = Platform.constants as { Manufacturer?: string; Brand?: string };
  const name = `${c.Manufacturer ?? ''} ${c.Brand ?? ''}`.toLowerCase();
  const hit = VENDOR_HELP.find((v) => v.match.test(name));
  return hit?.id ?? null;
}
