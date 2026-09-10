/**
 * GRYD — PHOTO DE PROFIL : la choisir, ou choisir de ne pas en avoir.
 *
 * DEMANDE FONDATEUR (retour iPhone, 10/09/2026) : « dans les paramètres du
 * profil, il faut pouvoir mettre sa photo de profil ». La branche « pas de
 * photo » reste un chemin de PREMIÈRE CLASSE : l'avatar généré (initiales +
 * couleur de la charte) est l'identité visuelle GRYD, pas un pis-aller. Rien
 * dans l'UI ne pousse vers la photo (aucun « complète ton profil »).
 *
 * ─── CE QUI A CHANGÉ ICI, ET POURQUOI L'EN-TÊTE PRÉCÉDENT ÉTAIT FAUX ────────
 * L'en-tête de ce fichier affirmait, en toutes lettres, que la photo « n'est
 * envoyée à AUCUN serveur » et listait la migration Storage « restant à
 * écrire ». Les deux étaient FAUX depuis la migration 0124 :
 *   · le bucket `social-2026` EXISTE (0124:96) — privé, 5 Mio, jpeg/png/webp ;
 *   · les policies EXISTENT (0124:97-99) : insert, select, delete ;
 *   · `profileStore.saveProfile` ENVOIE la photo (`uploadSocialImage2026`) et
 *     `save_my_social_profile_2026` écrit `user_profiles.avatar_path_2026`.
 * Un commentaire qui ment coûte plus cher qu'un commentaire absent : celui-là
 * aurait fait recoder une migration déjà appliquée en production.
 *
 * ─── L'ÉTAT RÉEL DU SERVEUR, VÉRIFIÉ DANS LES MIGRATIONS ────────────────────
 *  · bucket    `social-2026`, `public = false` → AUCUNE URL publique n'existe.
 *              La lecture passe par une URL SIGNÉE (cf. `myAvatar.ts`).
 *  · INSERT    autorisé si le 1er segment du chemin est mon `auth.uid()` ET si
 *              le chemin colle à la regex reprise ci-dessous.
 *  · SELECT    `social_media_readable_2026` : mon propre média, ou l'avatar
 *              d'un profil que j'ai le droit de voir, ou le média d'un post
 *              visible.
 *  · DELETE    autorisé sur mon propre préfixe → on PEUT effacer l'ancienne
 *              photo, et on le fait (cf. `discardAvatarObject2026`).
 *  · UPDATE    AUCUNE policy. Donc pas d'`upsert` : chaque photo est un objet
 *              NEUF (uuid), et l'ancien est supprimé après coup. Ce n'est pas
 *              un détail de style — un `upsert: true` échouerait en silence.
 * Aucune migration n'est requise pour ce lot : rien ne manque côté serveur.
 *
 * ─── POURQUOI CE MODULE N'IMPORTE RIEN EN HAUT DE FICHIER ───────────────────
 * Les règles ci-dessous (chemin, taille, extension, capacité appareil photo)
 * décident de ce que l'écran PEINT et de ce que le serveur ACCEPTERA. Elles
 * n'ont de valeur que PROUVÉES, et un test Deno ne peut pas importer un module
 * qui charge `expo-image-picker` (les .ts de node_modules ne sont pas
 * strippables). Les modules natifs sont donc chargés PARESSEUSEMENT, dans la
 * fonction qui s'en sert — même patron que `lib/haptics.ts` et `i18n/store.ts`.
 * Effet de bord bienvenu : un build sans `expo-image-picker` ne plante pas au
 * chargement de l'écran, il répond `unavailable` et l'UI le dit.
 */

/** Le dossier imposé par la policy d'écriture (0124) pour une photo de profil. */
export const AVATAR_KIND = 'avatar' as const;

/**
 * Plafond d'octets — MIROIR de `storage.buckets.file_size_limit` (0124:96) et
 * du garde-fou client de `uploadSocialImage2026`. Dépasser = refus serveur.
 */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Côté le plus long de l'image ENVOYÉE, en pixels.
 *
 * ─── CE NOMBRE EST APPLIQUÉ DEPUIS LE 10/09/2026 (lot 9) ────────────────────
 * Il ne l'était pas. L'en-tête précédent l'annonçait honnêtement comme « un
 * BUDGET, pas une garantie » : `expo-image-picker` ne sait pas redimensionner
 * (aucune option de taille dans `ImagePickerOptions`, ~16.0.6) et
 * `expo-image-manipulator` n'était pas une dépendance. Une photo d'iPhone
 * partait donc en 3024 × 3024 pour être affichée dans un hexagone de 48 pt.
 * `expo-image-manipulator@~13.0.6` (compatible SDK 52, aucun config plugin,
 * aucune permission) est maintenant au dépôt, et `prepareAvatarForUpload2026`
 * l'applique AVANT l'envoi.
 *
 * ⚠️ LA CAPACITÉ SE DÉRIVE DU BINAIRE, comme pour l'appareil photo. Le module
 * est NATIF : il est absent du build que le fondateur a déjà sur son iPhone.
 * Dans ce cas on n'invente rien et on ne casse rien — la photo part telle
 * quelle, et le plafond de `AVATAR_MAX_BYTES` reste la garde qui refuse, avec
 * un motif nommé, tout ce qui dépasse. Le redimensionnement arrivera avec le
 * prochain build EAS ; d'ici là le comportement est EXACTEMENT celui d'avant.
 *
 * Ce qui est appliqué dans les deux cas : recadrage CARRÉ (`allowsEditing` +
 * `aspect [1,1]`, l'avatar est clippé en hexagone et une image 16:9 rognerait
 * le visage sans prévenir) et refus NOMMÉ au-delà de `AVATAR_MAX_BYTES`.
 */
export const AVATAR_MAX_EDGE_PX = 1024;

/**
 * Compression JPEG (0 = petit, 1 = maximum). Une seule valeur pour les DEUX
 * étages : ce que le sélecteur produit (`quality`) et ce que le
 * redimensionneur ré-encode (`compress`). Deux nombres différents ici
 * signifieraient qu'une photo est compressée deux fois à deux niveaux.
 */
export const AVATAR_JPEG_QUALITY = 0.7;

/** Format d'envoi. Le bucket accepte jpg/png/webp ; on n'en sert qu'un. */
export const AVATAR_SAVE_FORMAT = 'jpeg' as const;

/**
 * Ce qu'on demande au redimensionneur, ou `null` quand il n'y a RIEN à faire.
 *
 * On contraint le côté le PLUS LONG et on laisse l'autre suivre le ratio : le
 * sélecteur impose déjà un carré, mais `allowsEditing` peut être contourné
 * selon la plateforme, et contraindre la largeur d'une image portrait ne
 * plafonnerait pas sa hauteur.
 */
export type AvatarResizeTarget2026 = { readonly width: number } | { readonly height: number } | null;

/**
 * Verdict PUR : faut-il redimensionner, et sur quel côté ?
 *
 * DEUX REFUS DE REDIMENSIONNER, tous deux volontaires :
 *  · l'image tient déjà sous le plafond → on ne la ré-échantillonne pas pour
 *    rien (chaque passe coûte de la netteté) ;
 *  · ses dimensions sont inconnues → on ne peut pas savoir quel côté est le
 *    plus long, et demander `{ width: 1024 }` à l'aveugle AGRANDIRAIT une
 *    petite photo. Le plafond d'octets reste la garde dans ce cas.
 */
export function avatarResizeTarget2026(
  width: number | null | undefined,
  height: number | null | undefined,
  maxEdge: number = AVATAR_MAX_EDGE_PX,
): AvatarResizeTarget2026 {
  const w = typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null;
  const h = typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : null;
  if (w === null || h === null) return null;
  if (Math.max(w, h) <= maxEdge) return null;
  return w >= h ? { width: maxEdge } : { height: maxEdge };
}

/**
 * MIROIR EXACT de la policy `social_media_insert_2026` (0124:97) :
 *   name ~ '^[0-9a-f-]{36}/(avatar|post)/[0-9a-f-]{36}\.(jpg|png|webp)$'
 * Le test `avatarPhoto.test.ts` relit la migration sur le disque et compare :
 * si quelqu'un change la policy sans changer cette ligne, le gate tombe.
 */
export const SOCIAL_MEDIA_PATH_PATTERN_2026 =
  /^[0-9a-f-]{36}\/(avatar|post)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Le même verdict, restreint aux photos de PROFIL. */
export const AVATAR_PATH_PATTERN_2026 =
  /^[0-9a-f-]{36}\/avatar\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Extensions que le bucket accepte (0124 : `allowed_mime_types`). */
export const AVATAR_EXTENSIONS = ['jpg', 'png', 'webp'] as const;
export type AvatarExtension = (typeof AVATAR_EXTENSIONS)[number];

/**
 * Chemin de dépôt d'une photo de profil : `<uid>/avatar/<uuid>.<ext>`.
 *
 * L'extension est un PARAMÈTRE parce qu'elle se déduit des OCTETS, pas d'un
 * souhait : `stripSocialImageMetadata2026` renvoie `jpg` pour un JPEG et `png`
 * pour un PNG (une capture d'écran iOS est un PNG). Écrire `.jpg` sur un PNG
 * mentirait au bucket, dont le `mimetype` est vérifié côté serveur par
 * `social_validate_media_2026`.
 */
export function avatarStoragePath(
  ownerId: string,
  fileId: string,
  extension: AvatarExtension = 'jpg',
): string {
  return `${ownerId}/${AVATAR_KIND}/${fileId}.${extension}`;
}

/** Ce chemin passerait-il la policy d'écriture de 0124 ? Verdict PUR. */
export function avatarPathAccepted(path: string): boolean {
  return AVATAR_PATH_PATTERN_2026.test(path);
}

/**
 * Motif de refus AVANT tout envoi, nommé avec les mêmes clés que le serveur
 * (`socialError2026` sait déjà les traduire). `null` = rien ne s'oppose.
 */
export type AvatarRefusal = 'media_too_large' | 'invalid_media' | null;

/**
 * Une image est-elle envoyable ? On refuse TÔT et avec un motif, plutôt que de
 * laisser le bucket répondre par un 4xx que l'écran traduirait en « l'action
 * n'a pas abouti » — la phrase qui n'apprend rien.
 *
 * `extension` est OPTIONNELLE parce que l'écran ne la connaît pas au moment où
 * il pose la question : le sélecteur rend une taille (`fileSize`) et une URI,
 * l'extension réelle se déduit des OCTETS plus tard
 * (`stripSocialImageMetadata2026`). Absente, on ne juge que la taille — on ne
 * refuse jamais sur une supposition.
 */
export function avatarUploadRefusal(file: { bytes: number; extension?: string }): AvatarRefusal {
  if (!Number.isFinite(file.bytes) || file.bytes <= 0) return 'invalid_media';
  if (file.bytes > AVATAR_MAX_BYTES) return 'media_too_large';
  if (file.extension === undefined) return null;
  return (AVATAR_EXTENSIONS as readonly string[]).includes(file.extension) ? null : 'invalid_media';
}

// ─── APPAREIL PHOTO : la capacité se DÉRIVE du build, jamais d'un essai ──────
//
// Sur iOS, appeler l'appareil photo sans `NSCameraUsageDescription` dans
// l'Info.plist ne « échoue » pas : le système TUE l'app. Il est donc hors de
// question de sonder par try/catch. Le plugin `expo-image-picker` écrit cette
// clé à partir de son option `cameraPermission` (withImagePicker.js) : quand
// elle vaut `false`, `applyPermissions` SUPPRIME la clé et Android bloque
// `CAMERA`. La question « ce binaire peut-il ouvrir l'appareil photo ? » a donc
// une réponse EXACTE, lisible dans la config embarquée au build
// (`Constants.expoConfig`). Même patron que `remotePushCapability.ts`.

/** Nom du plugin qui déclare (ou non) l'appareil photo. */
export const IMAGE_PICKER_PLUGIN = 'expo-image-picker';

export type CameraAvatarCapability =
  /** Le binaire déclare `NSCameraUsageDescription` : on peut ouvrir la caméra. */
  | 'capable'
  /** Le build a été fait avec `cameraPermission: false` (ou sans le plugin). */
  | 'not_declared'
  /** Web : pas d'appareil photo GRYD à proposer ici. */
  | 'unsupported_platform';

/** Forme d'une entrée de `expo.plugins` : `"nom"` ou `["nom", options]`. */
export type ExpoPluginEntry = string | readonly unknown[] | unknown;

/** Le nom d'un plugin, quelle que soit sa forme. `null` = entrée illisible. */
function pluginName(entry: ExpoPluginEntry): string | null {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
  return null;
}

/** Les options d'un plugin, quand il en a. */
function pluginOptions(entry: ExpoPluginEntry): Record<string, unknown> | null {
  if (!Array.isArray(entry)) return null;
  const options = entry[1];
  return typeof options === 'object' && options !== null ? (options as Record<string, unknown>) : null;
}

/**
 * Ce build peut-il ouvrir l'appareil photo ? Fonction PURE, testée.
 *
 * @param platform `Platform.OS` — passé, jamais lu ici.
 * @param plugins  `Constants.expoConfig?.plugins`, TEL QUEL. Illisible (`null`)
 *   ⇒ verdict NÉGATIF : on ne peut pas PROUVER la capacité, et un « peut-être »
 *   se paierait ici par un crash système, pas par un message d'erreur.
 */
export function cameraAvatarCapability(
  platform: string,
  plugins: readonly ExpoPluginEntry[] | null | undefined,
): CameraAvatarCapability {
  if (platform === 'web') return 'unsupported_platform';
  if (platform !== 'ios' && platform !== 'android') return 'unsupported_platform';
  if (plugins === null || plugins === undefined) return 'not_declared';
  const entry = plugins.find((item) => pluginName(item) === IMAGE_PICKER_PLUGIN);
  if (entry === undefined) return 'not_declared';
  const permission = pluginOptions(entry)?.cameraPermission;
  return typeof permission === 'string' && permission.trim().length > 0 ? 'capable' : 'not_declared';
}

// ─── I/O : modules natifs chargés paresseusement ─────────────────────────────

interface PickerAsset {
  uri: string;
  fileSize?: number | null;
  width?: number;
  height?: number;
}
interface PickerResult {
  canceled: boolean;
  assets: PickerAsset[] | null;
}
interface PickerPermission {
  granted: boolean;
  canAskAgain: boolean;
}
interface PickerModule {
  requestMediaLibraryPermissionsAsync(): Promise<PickerPermission>;
  requestCameraPermissionsAsync(): Promise<PickerPermission>;
  launchImageLibraryAsync(options: Record<string, unknown>): Promise<PickerResult>;
  launchCameraAsync(options: Record<string, unknown>): Promise<PickerResult>;
}

function loadPicker(): PickerModule | null {
  try {
    // require paresseux : un build sans le module natif répond `unavailable`
    // au lieu de casser le bundle au chargement de l'écran.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as PickerModule;
  } catch {
    return null;
  }
}

function platformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native') as { Platform: { OS: string } }).Platform.OS;
  } catch {
    return 'unknown';
  }
}

function configPlugins(): readonly ExpoPluginEntry[] | null {
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
 * Capacité RÉELLE de CE binaire à ouvrir l'appareil photo. C'est ce que l'écran
 * consulte pour décider s'il PEINT le bouton « Prendre une photo » — un bouton
 * qui ouvrirait une caméra non déclarée serait un bouton mort (et, sur iOS, un
 * crash). Le fondateur ne verra donc « Prendre une photo » qu'après un build
 * postérieur à la déclaration de `cameraPermission` dans app.json.
 */
export function cameraAvatarAvailable(): CameraAvatarCapability {
  return cameraAvatarCapability(platformOS(), configPlugins());
}

/** Résultat d'un choix de photo — chaque branche est un état d'écran distinct. */
export type PickAvatarResult =
  | { kind: 'picked'; uri: string; bytes: number | null }
  /** Geste annulé par le joueur : ce n'est pas une erreur, on n'affiche rien. */
  | { kind: 'canceled' }
  /** Refus de permission. `canAskAgain: false` ⇒ seul le panneau Réglages ouvre. */
  | { kind: 'denied'; canAskAgain: boolean }
  /** Ni photothèque ni appareil photo sur ce build/plateforme. */
  | { kind: 'unavailable' };

/** Options communes : carré imposé, compression, aucune métadonnée lue. */
function pickerOptions(): Record<string, unknown> {
  return {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: AVATAR_JPEG_QUALITY,
    // On ne lit QUE l'image retenue : ni EXIF, ni métadonnées de position.
    // (`stripSocialImageMetadata2026` retire de toute façon les blocs APPn
    // avant l'envoi — ceci évite simplement de les faire transiter.)
    exif: false,
  };
}

// ─── REDIMENSIONNEMENT : module natif, chargé paresseusement ────────────────

/** La part de `expo-image-manipulator` qu'on utilise, et rien de plus. */
interface ManipulatorSaved {
  uri: string;
}
interface ManipulatorImage {
  saveAsync(options: { compress?: number; format?: string }): Promise<ManipulatorSaved>;
}
interface ManipulatorContext {
  resize(size: { width?: number | null; height?: number | null }): ManipulatorContext;
  renderAsync(): Promise<ManipulatorImage>;
}
interface ManipulatorModule {
  ImageManipulator: { manipulate(uri: string): ManipulatorContext };
}

function loadManipulator(): ManipulatorModule | null {
  try {
    // require paresseux, MÊME PATRON que `loadPicker` : le module est natif, et
    // un binaire construit avant son arrivée au dépôt (celui que le fondateur a
    // sur son iPhone) ne l'a pas. `requireNativeModule` jette alors ici, au
    // moment du geste, au lieu de casser le bundle au chargement de l'écran.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-manipulator') as ManipulatorModule;
  } catch {
    return null;
  }
}

/** Taille RÉELLE du fichier produit, ou `null` si on ne peut pas la lire. */
async function fileBytes(uri: string): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      getInfoAsync(uri: string, options?: { size?: boolean }): Promise<{ exists: boolean; size?: number }>;
    };
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && typeof info.size === 'number' && info.size > 0 ? info.size : null;
  } catch {
    return null;
  }
}

/**
 * Ce qui sort de la préparation. `resized: false` n'est PAS un échec : c'est
 * soit une image déjà sous le plafond, soit un binaire sans le module natif.
 */
export interface AvatarPrepared2026 {
  readonly uri: string;
  readonly bytes: number | null;
  readonly resized: boolean;
}

/**
 * Redimensionne à `AVATAR_MAX_EDGE_PX` sur le côté le plus long et ré-encode en
 * JPEG à `AVATAR_JPEG_QUALITY`, AVANT tout envoi.
 *
 * ⚠️ `bytes` EST RELU SUR LE FICHIER PRODUIT. La taille rendue par le sélecteur
 * décrit l'ORIGINAL ; la garder après un ré-encodage ferait refuser (ou passer)
 * une photo sur la taille d'une autre. Illisible ⇒ `null`, et l'écran laisse
 * alors le bucket trancher plutôt que d'inventer un verdict.
 *
 * Aucune branche ne jette : un module absent, une URI que le natif refuse ou un
 * système de fichiers verrouillé rendent l'original tel quel. Le plafond de
 * `AVATAR_MAX_BYTES` reste la garde dans tous ces cas.
 */
export async function prepareAvatarForUpload2026(asset: {
  uri: string;
  bytes: number | null;
  width?: number | null;
  height?: number | null;
}): Promise<AvatarPrepared2026> {
  const target = avatarResizeTarget2026(asset.width, asset.height);
  const manipulator = loadManipulator();
  if (!manipulator) return { uri: asset.uri, bytes: asset.bytes, resized: false };
  try {
    const context = manipulator.ImageManipulator.manipulate(asset.uri);
    const rendered = await (target === null ? context : context.resize(target)).renderAsync();
    const saved = await rendered.saveAsync({
      compress: AVATAR_JPEG_QUALITY,
      format: AVATAR_SAVE_FORMAT,
    });
    return { uri: saved.uri, bytes: await fileBytes(saved.uri), resized: target !== null };
  } catch {
    return { uri: asset.uri, bytes: asset.bytes, resized: false };
  }
}

async function firstAsset(result: PickerResult): Promise<PickAvatarResult> {
  if (result.canceled) return { kind: 'canceled' };
  const asset = result.assets?.[0];
  if (!asset || typeof asset.uri !== 'string' || asset.uri.length === 0) return { kind: 'canceled' };
  const bytes = typeof asset.fileSize === 'number' && asset.fileSize > 0 ? asset.fileSize : null;
  const prepared = await prepareAvatarForUpload2026({
    uri: asset.uri,
    bytes,
    width: asset.width,
    height: asset.height,
  });
  return { kind: 'picked', uri: prepared.uri, bytes: prepared.bytes };
}

/**
 * Ouvre la PHOTOTHÈQUE. La permission est demandée ICI, au moment du geste —
 * jamais au montage de l'écran (règle E10 : « chaque permission est demandée au
 * moment de son bénéfice »).
 */
export async function pickAvatarPhoto(): Promise<PickAvatarResult> {
  const picker = loadPicker();
  if (!picker) return { kind: 'unavailable' };
  const permission = await picker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'denied', canAskAgain: permission.canAskAgain };
  return await firstAsset(await picker.launchImageLibraryAsync(pickerOptions()));
}

/**
 * Ouvre l'APPAREIL PHOTO. Deux gardes AVANT toute API native :
 *  1. la capacité du build (sans `NSCameraUsageDescription`, iOS tue l'app) ;
 *  2. la permission, demandée au geste.
 */
export async function captureAvatarPhoto(): Promise<PickAvatarResult> {
  if (cameraAvatarAvailable() !== 'capable') return { kind: 'unavailable' };
  const picker = loadPicker();
  if (!picker) return { kind: 'unavailable' };
  const permission = await picker.requestCameraPermissionsAsync();
  if (!permission.granted) return { kind: 'denied', canAskAgain: permission.canAskAgain };
  return await firstAsset(await picker.launchCameraAsync(pickerOptions()));
}

/**
 * Efface la copie locale `gryd-avatar.jpg` laissée par les builds d'AVANT
 * l'envoi serveur (quand la photo ne vivait que dans le sandbox de l'app).
 *
 * L'export est CONSERVÉ — d'autres lots s'y réfèrent — mais son rôle a changé :
 * ce n'est plus « retirer sa photo » (c'est le serveur qui fait foi désormais),
 * c'est un nettoyage de vestige. Best effort : l'absence du fichier est le cas
 * normal, pas une erreur.
 */
export async function clearAvatarPhoto(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      documentDirectory: string | null;
      deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
    };
    const dir = FileSystem.documentDirectory;
    if (!dir) return;
    await FileSystem.deleteAsync(`${dir}gryd-avatar.jpg`, { idempotent: true });
  } catch {
    // Module absent, sandbox verrouillé, fichier déjà parti : rien à réparer.
  }
}
