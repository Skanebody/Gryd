/**
 * GRYD — LES LICENCES EMBARQUÉES, ET LE GARDE-FOU QUI EMPÊCHE LA PAGE DE DÉRIVER.
 *
 * ─── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────
 * L'écran `/legal/licences` est tenu À LA MAIN. Il ne dérive d'aucun
 * `package.json`, donc il vieillit en silence à chaque dépendance ajoutée — et
 * il avait DÉJÀ raté quelque chose de contraignant : les trois familles de
 * caractères embarquées (`@expo-google-fonts/inter`, `inter-tight`,
 * `jetbrains-mono`) sont publiées sous `MIT AND OFL-1.1`, et la SIL Open Font
 * License 1.1 EXIGE la mention de copyright et de licence. L'écran ne connaissait
 * que MIT / BSD-3 / Apache-2.0 : la condition d'usage des fontes n'était pas
 * tenue. C'est l'inverse exact de la discipline de la page Crédits de données,
 * qui LIT ses chiffres dans le fichier qu'elle crédite.
 *
 * ─── CE QUE CE MODULE GARANTIT (et ce qu'il ne garantit pas) ───────────────
 * Il ne génère PAS la page : une page générée depuis `node_modules` au runtime
 * ferait dépendre un document légal d'un système de fichiers absent en
 * production. Il fournit le MINIMUM demandé par le plan : un instantané vérifié,
 * des fonctions PURES de comparaison, et un test de dérive qui devient rouge
 *   · quand une dépendance apparaît ou disparaît de `package.json` ;
 *   · quand une licence réellement installée n'a pas de section dans le document ;
 *   · quand l'instantané ne correspond plus aux paquets installés.
 * Ce qu'il ne voit pas : les dépendances TRANSITIVES. Les mentions MIT/BSD/Apache
 * portent sur ce qui est REDISTRIBUÉ dans le bundle ; la chaîne transitive
 * complète relève d'un outil dédié — inscrit en suspens, pas prétendu ici.
 *
 * ─── PROVENANCE DE L'INSTANTANÉ ────────────────────────────────────────────
 * Champ `license` du `package.json` de chaque paquet INSTALLÉ, relevé le
 * 25/07/2026. Aucune valeur n'est de mémoire : le test `licenses.test.ts`
 * relit les paquets installés et échoue si l'un d'eux dit autre chose.
 */

/** Identifiant SPDX (ou `UNDECLARED`) — sans expression composée. */
export type LicenseId = string;

/**
 * Ce que le paquet ne déclare pas. Ce n'est PAS « pas de licence » : c'est
 * « le paquet publié ne le dit pas », et un document légal doit faire la
 * différence entre les deux.
 */
export const UNDECLARED: LicenseId = 'UNDECLARED';

/**
 * Nos propres paquets d'espace de travail : rien à créditer, ils sont à nous.
 * Les exclure explicitement vaut mieux que les oublier dans l'instantané, où ils
 * ressembleraient à un tiers non crédité.
 */
export const WORKSPACE_PACKAGES: readonly string[] = ['@klaim/shared'];

/**
 * LES FAMILLES DE LICENCE QUE LE DOCUMENT COUVRE — une section par famille dans
 * `i18n/catalog/legal.ts`. Ajouter une dépendance sous une licence absente de
 * cette liste met le gate au rouge : c'est le point de la manœuvre.
 */
export const DECLARED_LICENSE_FAMILIES: readonly LicenseId[] = [
  'MIT', // section « LICENCE MIT »
  'BSD-3-Clause', // section « LICENCE BSD 3-CLAUSES »
  'Apache-2.0', // section « LICENCE APACHE 2.0 »
  'OFL-1.1', // section « SIL OPEN FONT LICENSE 1.1 » (les trois fontes)
  UNDECLARED, // section « LICENCE NON DÉCLARÉE PAR LE PAQUET » (posthog-react-native)
];

/**
 * Instantané `dépendance → expression de licence déclarée par le paquet installé`.
 * Relevé le 25/07/2026 (cf. en-tête). `UNDECLARED` = le `package.json` publié
 * n'a pas de champ `license`.
 */
export const BUNDLED_LICENSES: Readonly<Record<string, string>> = {
  '@expo-google-fonts/inter': 'MIT AND OFL-1.1',
  '@expo-google-fonts/inter-tight': 'MIT AND OFL-1.1',
  '@expo-google-fonts/jetbrains-mono': 'MIT AND OFL-1.1',
  '@expo/metro-runtime': 'MIT',
  '@maplibre/maplibre-react-native': 'MIT',
  '@react-native-async-storage/async-storage': 'MIT',
  '@supabase/supabase-js': 'MIT',
  expo: 'MIT',
  'expo-apple-authentication': 'MIT',
  'expo-auth-session': 'MIT',
  'expo-clipboard': 'MIT',
  'expo-constants': 'MIT',
  'expo-crypto': 'MIT',
  'expo-document-picker': 'MIT',
  'expo-file-system': 'MIT',
  'expo-haptics': 'MIT',
  'expo-image-picker': 'MIT',
  'expo-linking': 'MIT',
  'expo-localization': 'MIT',
  'expo-location': 'MIT',
  // `expo-media-library` retiré des dépendances le 26/07/2026 (aucun appelant ;
  // il liait les frameworks Photos/PhotosUI au binaire iOS sans usage). Son
  // crédit part avec lui : `staleInSnapshot` refuse un crédit fantôme.
  'expo-notifications': 'MIT',
  'expo-router': 'MIT',
  'expo-sensors': 'MIT',
  'expo-sharing': 'MIT',
  'expo-status-bar': 'MIT',
  'expo-task-manager': 'MIT',
  'expo-web-browser': 'MIT',
  'h3-js': 'Apache-2.0',
  'maplibre-gl': 'BSD-3-Clause',
  'posthog-react-native': UNDECLARED,
  react: 'MIT',
  'react-dom': 'MIT',
  'react-native': 'MIT',
  // Ajouté le 27/07/2026 avec le SDK RevenueCat (écran E74 `/premium`). Le
  // crédit accompagne la dépendance dans le MÊME commit : c'est précisément la
  // dérive que ce test existe pour empêcher.
  'react-native-purchases': 'MIT',
  'react-native-qrcode-svg': 'MIT',
  'react-native-safe-area-context': 'MIT',
  'react-native-screens': 'MIT',
  'react-native-svg': 'MIT',
  'react-native-view-shot': 'MIT',
  'react-native-web': 'MIT',
};

/**
 * Éclate une expression SPDX (« MIT AND OFL-1.1 », « (MIT OR Apache-2.0) ») en
 * identifiants. Une expression composée n'est pas une licence : chacune de ses
 * branches impose ses propres conditions, et c'est justement le cas qui a fait
 * rater les fontes.
 */
export function licenseIds(expression: string): readonly LicenseId[] {
  return expression
    .replace(/[()]/g, ' ')
    .split(/\s+(?:AND|OR|WITH)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Les licences réellement embarquées qui n'ont PAS de section dans le document.
 * Vide = l'obligation de mention est tenue pour tout ce qui est redistribué.
 */
export function uncoveredLicenses(
  bundled: Readonly<Record<string, string>> = BUNDLED_LICENSES,
  declared: readonly LicenseId[] = DECLARED_LICENSE_FAMILIES,
): readonly LicenseId[] {
  const missing = new Set<LicenseId>();
  for (const expression of Object.values(bundled)) {
    for (const id of licenseIds(expression)) {
      if (!declared.includes(id)) missing.add(id);
    }
  }
  return [...missing].sort();
}

/** Dépendances de `package.json` absentes de l'instantané (donc non créditées). */
export function missingFromSnapshot(
  dependencyNames: readonly string[],
  bundled: Readonly<Record<string, string>> = BUNDLED_LICENSES,
  workspace: readonly string[] = WORKSPACE_PACKAGES,
): readonly string[] {
  return dependencyNames
    .filter((name) => !workspace.includes(name))
    .filter((name) => !(name in bundled))
    .sort();
}

/** Entrées de l'instantané qui ne sont plus des dépendances (crédit fantôme). */
export function staleInSnapshot(
  dependencyNames: readonly string[],
  bundled: Readonly<Record<string, string>> = BUNDLED_LICENSES,
): readonly string[] {
  return Object.keys(bundled)
    .filter((name) => !dependencyNames.includes(name))
    .sort();
}
