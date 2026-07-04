/**
 * GRYD — aide « Courir écran éteint » par constructeur (AMENDEMENT-15 §2,
 * « tous les téléphones »). Les surcouches Android (Samsung/Xiaomi/Huawei/
 * OnePlus…) tuent les services GPS en fond par optimisation de batterie :
 * texte statique FR court par constructeur, constructeur courant détecté via
 * Platform.constants. Les réglages constructeur ne sont pas adressables par
 * URL publique fiable → le bouton ouvre les réglages de l'app (Linking, géré
 * par provider.openLocationSettings), le texte guide le reste. iOS : section
 * dédiée (« Toujours » + « Position exacte »). Anti-shame : on explique le
 * téléphone, on n'accuse jamais le coureur.
 */
import { Platform } from 'react-native';

export interface VendorHelp {
  id: string;
  /** Nom affiché. */
  vendor: string;
  /** Détection sur Platform.constants.Manufacturer/Brand (minuscules). */
  match: RegExp;
  /** Étapes FR courtes. */
  steps: string[];
}

/** Aides Android par constructeur (les tueurs de batterie connus). */
export const VENDOR_HELP: readonly VendorHelp[] = [
  {
    id: 'samsung',
    vendor: 'Samsung',
    match: /samsung/,
    steps: [
      'Paramètres → Batterie → Limites d’utilisation en arrière-plan.',
      'Retire GRYD des « Applis en veille prolongée ».',
      'Paramètres → Applications → GRYD → Batterie → « Non restreinte ».',
    ],
  },
  {
    id: 'xiaomi',
    vendor: 'Xiaomi / Redmi / POCO',
    match: /xiaomi|redmi|poco/,
    steps: [
      'Paramètres → Applications → GRYD → Autorisations → active « Démarrage automatique ».',
      'Paramètres → Batterie → Économiseur → GRYD → « Aucune restriction ».',
    ],
  },
  {
    id: 'huawei',
    vendor: 'Huawei / Honor',
    match: /huawei|honor/,
    steps: [
      'Paramètres → Batterie → Lancement d’applications.',
      'GRYD → « Gérer manuellement » → active les trois options.',
    ],
  },
  {
    id: 'oneplus',
    vendor: 'OnePlus / Oppo / realme',
    match: /oneplus|oppo|realme/,
    steps: [
      'Paramètres → Batterie → Optimisation de la batterie.',
      'GRYD → « Ne pas optimiser ».',
    ],
  },
  {
    id: 'autre',
    vendor: 'Autres Android',
    match: /.^/, // jamais auto-détecté — section générique toujours listée
    steps: [
      'Paramètres → Batterie → Optimisation de la batterie → GRYD → « Ne pas optimiser ».',
      'Autorise la position « Toujours » dans Paramètres → Applications → GRYD.',
    ],
  },
] as const;

/** Étapes iOS (précision approximative + arrière-plan). */
export const IOS_HELP_STEPS: readonly string[] = [
  'Réglages → GRYD → Position → « Toujours ».',
  'Active « Position exacte » (sinon le GPS est volontairement flou).',
] as const;

/** Id du constructeur courant (Android), null si inconnu/iOS/web. */
export function currentVendorId(): string | null {
  if (Platform.OS !== 'android') return null;
  const c = Platform.constants as { Manufacturer?: string; Brand?: string };
  const name = `${c.Manufacturer ?? ''} ${c.Brand ?? ''}`.toLowerCase();
  const hit = VENDOR_HELP.find((v) => v.match.test(name));
  return hit?.id ?? null;
}
