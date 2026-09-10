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
 * Côté maximal visé pour l'image envoyée.
 *
 * ⚠️ CE QUE CE NOMBRE EST, ET CE QU'IL N'EST PAS. C'est un BUDGET, pas une
 * garantie : `expo-image-picker` ne sait pas redimensionner (aucune option de
 * taille dans `ImagePickerOptions`, vérifié dans le paquet installé ~16.0.6),
 * et `expo-image-manipulator` n'est PAS une dépendance de ce dépôt. L'ajouter
 * serait un module natif de plus, absent du binaire que le fondateur a sur son
 * iPhone : le bouton marcherait ici et pas chez lui. On ne promet donc pas un
 * redimensionnement qu'on ne fait pas. Ce qui est RÉELLEMENT appliqué :
 *   · recadrage CARRÉ (`allowsEditing` + `aspect [1,1]`) — l'avatar est clippé
 *     en hexagone, une image 16:9 rognerait le visage sans prévenir ;
 *   · compression JPEG (`quality`) par le sélecteur lui-même ;
 *   · refus NOMMÉ au-delà de `AVATAR_MAX_BYTES`, jamais un échec muet.
 * Le jour où un redimensionnement natif entre au dépôt, c'est cette constante
 * qu'il lira. En attendant elle sert de repère documenté, et rien d'autre.
 */
export const AVATAR_MAX_EDGE_PX = 1024;

/** Compression demandée au sélecteur (0 = petit, 1 = maximum). */
export const AVATAR_JPEG_QUALITY = 0.7;

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
 */
export function avatarUploadRefusal(file: { bytes: number; extension: string }): AvatarRefusal {
  if (!Number.isFinite(file.bytes) || file.bytes <= 0) return 'invalid_media';
  if (file.bytes > AVATAR_MAX_BYTES) return 'media_too_large';
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

function firstAsset(result: PickerResult): PickAvatarResult {
  if (result.canceled) return { kind: 'canceled' };
  const asset = result.assets?.[0];
  if (!asset || typeof asset.uri !== 'string' || asset.uri.length === 0) return { kind: 'canceled' };
  const bytes = typeof asset.fileSize === 'number' && asset.fileSize > 0 ? asset.fileSize : null;
  return { kind: 'picked', uri: asset.uri, bytes };
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
  return firstAsset(await picker.launchImageLibraryAsync(pickerOptions()));
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
  return firstAsset(await picker.launchCameraAsync(pickerOptions()));
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
