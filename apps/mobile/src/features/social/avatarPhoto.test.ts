/**
 * GRYD — PHOTO DE PROFIL : ce que le client doit savoir AVANT d'envoyer.
 *
 * ─── ÉTAPE 0 : LES DÉFAUTS QUI EXISTAIENT, NOMMÉS ───────────────────────────
 * Chaque bloc ci-dessous cite le défaut RÉEL qu'il aurait fait échouer. Sans
 * cette colonne, rien ne distinguerait ce fichier d'un test qui passe parce
 * qu'il ne demande rien.
 *
 *  D1. `avatarPhoto.ts` affirmait en en-tête que la photo « n'est envoyée à
 *      AUCUN serveur » et listait, comme restant à écrire, une migration
 *      Storage DÉJÀ APPLIQUÉE (0124). Le client ne connaissait donc NULLE PART
 *      la forme de chemin que la policy exige : rien n'empêchait de fabriquer
 *      un `<uid>/avatars/<uuid>.jpeg` refusé par le serveur. Les tests de
 *      chemin lisent la migration SUR LE DISQUE et comparent au miroir JS : si
 *      la policy bouge, le gate tombe.
 *
 *  D2. `app.json` déclarait `cameraPermission: false`, ce qui SUPPRIME
 *      NSCameraUsageDescription de l'Info.plist et bloque `CAMERA` sur Android.
 *      Un bouton « Prendre une photo » posé sans corriger cela n'aurait pas
 *      « échoué » sur iOS : le système TUE l'app au premier `launchCameraAsync`.
 *
 *  D3. L'écran d'édition n'offrait qu'un lien « Choisir une photo », sans
 *      appareil photo, sans état de permission, sans « Ouvrir les Réglages », et
 *      sans jamais supprimer la photo remplacée du bucket. Les règles de couture
 *      lisent le SOURCE de l'écran — pas ses modules — parce que c'est là que
 *      les garanties se reprennent d'une main après avoir été posées de l'autre.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  AVATAR_EXTENSIONS,
  AVATAR_MAX_BYTES,
  AVATAR_PATH_PATTERN_2026,
  IMAGE_PICKER_PLUGIN,
  SOCIAL_MEDIA_PATH_PATTERN_2026,
  avatarPathAccepted,
  avatarStoragePath,
  avatarUploadRefusal,
  cameraAvatarCapability,
} from './avatarPhoto.ts';

const MIGRATION_0124 = await Deno.readTextFile(
  new URL('../../../../../supabase/migrations/0124_refonte_2026_social.sql', import.meta.url),
);
const APP_JSON = JSON.parse(
  await Deno.readTextFile(new URL('../../../app.json', import.meta.url)),
) as { expo: { plugins?: unknown[] } };
const PROFIL_EDIT = await Deno.readTextFile(
  new URL('../../../app/profil-edit.tsx', import.meta.url),
);

/** Le code hors commentaires — citer un défaut dans un commentaire le recrée. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((ligne) => ligne.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}
const CODE_EDIT = codeSeul(PROFIL_EDIT);

const UID = '0f6a1d24-3c8b-4a11-9e77-52d0c4b8a913';
const FILE = 'a1b2c3d4-e5f6-4711-8899-aabbccddeeff';

// ─── D1 · le chemin est celui que la policy accepte, prouvé sur la migration ──

Deno.test('étape 0 — la policy d’écriture de 0124 existe, et voici sa regex', () => {
  const policy = MIGRATION_0124.split('\n').find((line) => line.includes('social_media_insert_2026'));
  assert(policy, 'la policy social_media_insert_2026 a disparu de 0124');
  const found = /name ~ '([^']+)'/.exec(policy);
  assert(found, `la contrainte de nom a disparu de la policy : ${policy}`);
  // Le miroir JS échappe la barre oblique (obligatoire dans un littéral regex) ;
  // c'est la SEULE différence tolérée avec la chaîne SQL.
  assertEquals(SOCIAL_MEDIA_PATH_PATTERN_2026.source.replace(/\\\//g, '/'), found[1]);
  // Et le bucket est bien privé : c'est ce qui impose les URL signées.
  assert(
    /insert into storage\.buckets[\s\S]*?'social-2026'[\s\S]*?,false,/.test(MIGRATION_0124),
    'le bucket social-2026 n’est plus déclaré privé : les URL signées deviendraient inutiles',
  );
  // La policy de SUPPRESSION existe : le ménage de l’ancienne photo est permis.
  assert(
    MIGRATION_0124.includes('social_media_delete_2026'),
    'sans policy DELETE, la photo remplacée resterait dans le bucket',
  );
});

Deno.test('le chemin construit est accepté par la regex de la policy', () => {
  const path = avatarStoragePath(UID, FILE);
  assertEquals(path, `${UID}/avatar/${FILE}.jpg`);
  assert(SOCIAL_MEDIA_PATH_PATTERN_2026.test(path));
  assert(avatarPathAccepted(path));
  // Une capture d’écran iOS est un PNG : l’extension suit les OCTETS.
  assert(avatarPathAccepted(avatarStoragePath(UID, FILE, 'png')));
  assert(avatarPathAccepted(avatarStoragePath(UID, FILE, 'webp')));
});

Deno.test('les chemins que le serveur REFUSERAIT sont refusés ici aussi', () => {
  for (const refuse of [
    `${UID}/avatars/${FILE}.jpg`, // dossier au pluriel : la faute la plus banale
    `${UID}/avatar/${FILE}.jpeg`, // extension hors liste
    `${UID}/avatar/${FILE}.JPG`, // la policy est sensible à la casse
    `${UID}/avatar/photo.jpg`, // nom qui n’est pas un uuid
    `${UID}/post/${FILE}.jpg`, // média de publication, pas un avatar
    `avatar/${FILE}.jpg`, // pas de préfixe de propriétaire
    `${UID}/avatar/${FILE}.jpg/x`, // suffixe : la regex est ancrée
  ]) {
    assertEquals(avatarPathAccepted(refuse), false, refuse);
  }
});

Deno.test('taille et extension : refus NOMMÉ avant tout envoi', () => {
  // Le plafond est celui du bucket (0124), pas un nombre inventé ici.
  assert(/file_size_limit|5242880/.test(MIGRATION_0124));
  assert(MIGRATION_0124.includes(String(AVATAR_MAX_BYTES)), 'le plafond client a divergé du bucket');
  assertEquals(avatarUploadRefusal({ bytes: 1024, extension: 'jpg' }), null);
  assertEquals(avatarUploadRefusal({ bytes: AVATAR_MAX_BYTES, extension: 'jpg' }), null);
  assertEquals(avatarUploadRefusal({ bytes: AVATAR_MAX_BYTES + 1, extension: 'jpg' }), 'media_too_large');
  assertEquals(avatarUploadRefusal({ bytes: 0, extension: 'jpg' }), 'invalid_media');
  assertEquals(avatarUploadRefusal({ bytes: Number.NaN, extension: 'jpg' }), 'invalid_media');
  assertEquals(avatarUploadRefusal({ bytes: 10, extension: 'gif' }), 'invalid_media');
  assertEquals(avatarUploadRefusal({ bytes: 10, extension: 'heic' }), 'invalid_media');
  // Sans extension (ce que l'écran sait au moment du choix), seule la TAILLE est
  // jugée : on ne refuse pas une photo sur une supposition d'extension.
  assertEquals(avatarUploadRefusal({ bytes: 10 }), null);
  assertEquals(avatarUploadRefusal({ bytes: AVATAR_MAX_BYTES + 1 }), 'media_too_large');
  // Les extensions annoncées sont exactement celles du bucket.
  for (const extension of AVATAR_EXTENSIONS) {
    assert(MIGRATION_0124.includes(extension), `le bucket n’accepte plus « ${extension} »`);
  }
  // La regex du dossier « avatar » ne laisse pas passer un média de post.
  assertEquals(AVATAR_PATH_PATTERN_2026.test(`${UID}/post/${FILE}.jpg`), false);
});

// ─── D2 · l’appareil photo : la capacité vient du BUILD, jamais d’un essai ────

Deno.test('étape 0 — app.json déclare bien les DEUX textes iOS, sans tiret long', () => {
  const entry = (APP_JSON.expo.plugins ?? []).find(
    (item) => Array.isArray(item) && item[0] === IMAGE_PICKER_PLUGIN,
  ) as [string, Record<string, unknown>] | undefined;
  assert(entry, 'le plugin expo-image-picker a disparu d’app.json');
  const photos = entry[1].photosPermission;
  const camera = entry[1].cameraPermission;
  // NSPhotoLibraryUsageDescription et NSCameraUsageDescription (withImagePicker.js).
  assert(typeof photos === 'string' && photos.length > 20, 'NSPhotoLibraryUsageDescription absente');
  assert(typeof camera === 'string' && camera.length > 20, 'NSCameraUsageDescription absente : iOS tuerait l’app');
  for (const texte of [photos, camera]) {
    assert(!texte.includes('—') && !texte.includes('–'), `tiret long interdit : ${texte}`);
    assert(!/\$\(PRODUCT_NAME\)/.test(texte), 'texte générique du paquet, pas le nôtre');
  }
  // Le micro reste explicitement refusé : GRYD n’enregistre aucun son.
  assertEquals(entry[1].microphonePermission, false);
});

Deno.test('la capacité caméra suit la config du build, pas une supposition', () => {
  const plugins = APP_JSON.expo.plugins ?? [];
  assertEquals(cameraAvatarCapability('ios', plugins), 'capable');
  assertEquals(cameraAvatarCapability('android', plugins), 'capable');
  assertEquals(cameraAvatarCapability('web', plugins), 'unsupported_platform');
  // Un binaire construit AVANT ce lot porte `cameraPermission: false` : il ne
  // doit pas peindre le bouton. C’est exactement l’état de l’iPhone du fondateur
  // tant qu’il n’a pas rebuildé.
  assertEquals(
    cameraAvatarCapability('ios', [[IMAGE_PICKER_PLUGIN, { cameraPermission: false }]]),
    'not_declared',
  );
  assertEquals(cameraAvatarCapability('ios', [[IMAGE_PICKER_PLUGIN, {}]]), 'not_declared');
  assertEquals(cameraAvatarCapability('ios', ['expo-router']), 'not_declared');
  // Config illisible : verdict NÉGATIF, jamais « peut-être ».
  assertEquals(cameraAvatarCapability('ios', null), 'not_declared');
  assertEquals(cameraAvatarCapability('ios', undefined), 'not_declared');
  assertEquals(cameraAvatarCapability('macos', plugins), 'unsupported_platform');
});

// ─── D3 · couture : ce que l’écran d’édition reprend, ou pas ─────────────────

Deno.test('couture — le bloc « Photo de profil » et ses trois gestes existent', () => {
  assert(CODE_EDIT.includes('Photo de profil'), 'le titre du bloc a disparu de l’écran');
  for (const action of ['Choisir dans la photothèque', 'Prendre une photo', 'Retirer la photo']) {
    assert(CODE_EDIT.includes(action), `l’action « ${action} » a disparu de l’écran`);
  }
});

Deno.test('couture — aucun bouton mort, aucun spinner sans fin, aucun refus muet', () => {
  // L’appareil photo n’est peint QUE si le build le déclare (D2).
  assert(
    /cameraCapability\s*===\s*'capable'/.test(CODE_EDIT),
    'le bouton caméra n’est plus conditionné à la capacité du build',
  );
  assert(CODE_EDIT.includes('cameraAvatarAvailable'), 'la capacité du build n’est plus lue');
  // Un envoi qui n’aboutit pas rend la main : l’indicateur est BORNÉ.
  // Le plafond doit ceindre l’APPEL, pas seulement exister dans le fichier :
  // déclarer `withTimeout` sans en entourer l’envoi ne borne rien du tout.
  assert(
    /withTimeout\(\s*uploadSocialImage2026\(/.test(CODE_EDIT),
    'l’envoi n’est plus borné : spinner sans fin possible',
  );
  assert(
    /UPLOAD_TIMEOUT_MS\s*=\s*[0-9_]+/.test(codeSeul(PROFIL_EDIT)),
    'le plafond d’envoi a disparu',
  );
  // Permission bloquée : la seule porte restante est ouverte pour de vrai.
  assert(CODE_EDIT.includes('Linking.openSettings'), 'plus aucune issue quand la permission est bloquée');
  // Échec : un motif ET un réessai, jamais un silence. Mais le réessai n'est
  // peint QUE s'il y a une photo à renvoyer : un échec venu du sélecteur
  // lui-même n'en laisse aucune, et le bouton serait mort.
  assert(/Réessayer l’envoi/.test(CODE_EDIT), 'plus de réessai après un échec d’envoi');
  assert(
    /const retryUri=state\.kind==='failed'\?state\.retryUri:null/.test(CODE_EDIT)
      && /\{retryUri\?<Pressable/.test(CODE_EDIT),
    'le réessai n’est plus conditionné à l’existence d’une photo à renvoyer',
  );
});

Deno.test('couture — la photo remplacée ne reste pas dans le bucket', () => {
  assert(
    CODE_EDIT.includes('discardAvatarObject2026'),
    'plus aucun ménage : chaque changement de photo laisserait un visage derrière lui',
  );
  // Le chemin déposé est vérifié contre la MÊME regex que la policy.
  assert(CODE_EDIT.includes('avatarPathAccepted'), 'le chemin déposé n’est plus vérifié côté client');
});

Deno.test('couture — la photo trop lourde est refusée AVANT le réseau', () => {
  // Sans cela, une photo de 8 Mo était lue en entier en mémoire puis refusée par
  // `uploadSocialImage2026` — attente inutile, et le motif `media_too_large` se
  // perdait dans un échec d'envoi générique.
  assert(
    /avatarUploadRefusal\(\{bytes\}\)/.test(CODE_EDIT),
    'la règle de taille n’est plus appliquée par l’écran : elle ne protège personne',
  );
  // Et on ne propose pas de « Réessayer » une photo que sa taille condamne.
  assert(
    /if\(refusal\)\{haptics\.error\(\);setState\(\{kind:'failed'[^}]*retryUri:null\}\)/.test(CODE_EDIT),
    'un refus de taille propose un réessai qui ne peut pas aboutir',
  );
});

Deno.test('couture — un échec d’envoi n’accuse jamais la photo à tort', () => {
  // `uploadSocialImage2026` (social2026Data.ts) jette `invalid_media` pour TOUTE
  // panne d'envoi, coupure réseau comprise : supabase-js rend l'erreur de
  // transport, elle n'est pas relue. Traduire ce motif par « cette image ne peut
  // pas être utilisée » ferait chercher une autre photo à quelqu'un dont seul le
  // réseau a lâché. L'écran doit donc l'intercepter avant `socialError2026`.
  assert(
    /raw\.includes\('invalid_media'\)/.test(CODE_EDIT),
    'l’écran retraduit à nouveau une panne d’envoi en « photo invalide »',
  );
  // Et le chapeau ne peut pas annoncer une photo « en place » après un échec.
  assert(
    /state\.kind==='failed'\?copy\('Cette photo n’est pas encore envoyée/.test(CODE_EDIT),
    'le chapeau affirme « en place » alors que l’envoi a échoué',
  );
});

Deno.test('couture — l’envoi n’a lieu QU’UNE fois par photo', () => {
  // `saveProfile` re-téléverse dès que `avatarUri` ne commence pas par https://
  // (profileStore.ts). L’écran doit donc reposer une URI signée après l’envoi,
  // sinon la même photo part deux fois et laisse un orphelin dans le bucket.
  assert(
    CODE_EDIT.includes('signMyAvatarUrl2026'),
    'l’écran ne signe plus l’URI après l’envoi : saveProfile re-téléverserait la photo',
  );
  assert(
    /patch\(\{\s*avatarPath\s*:\s*path\s*,\s*avatarUri\s*:\s*signed/.test(CODE_EDIT),
    'le brouillon ne porte plus le couple (chemin, URI signée) après l’envoi',
  );
});
