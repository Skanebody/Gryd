/**
 * GRYD — PHOTO DE PROFIL : choisir une image, ou choisir de ne pas en avoir.
 *
 * DEMANDE FONDATEUR : « il faut pouvoir ajouter une photo de profil pour rendre
 * plus humain OU garder l'anonymat derrière un pseudo ». Les deux branches sont
 * des chemins de PREMIÈRE CLASSE. L'avatar généré (initiales + couleur de la
 * charte) n'est pas un pis-aller affiché faute de mieux : c'est l'identité
 * visuelle GRYD, choisissable explicitement, et rien dans l'UI ne pousse vers la
 * photo (pas de « complète ton profil », pas de badge « incomplet »).
 *
 * ── PORTÉE DE CE LOT : LOCAL, ET DIT COMME TEL ───────────────────────────────
 * La photo choisie est copiée dans le sandbox de l'app puis référencée par son
 * URI dans le profil persisté (AsyncStorage). Elle n'est envoyée à AUCUN
 * serveur : personne d'autre ne la voit. L'écran d'édition l'affirme en toutes
 * lettres (`C.photoLocalOnly`) — « l'app ne ment jamais » : on n'écrit nulle
 * part que la photo est publiée, visible par le crew ou par les rivaux.
 *
 * ── CE QUI RESTE À CÂBLER POUR LA RENDRE PUBLIQUE (non fait ici) ─────────────
 *  1. MIGRATION Storage : créer le bucket `avatars` (public en lecture) et ses
 *     policies RLS sur `storage.objects` — INSERT/UPDATE/DELETE autorisés
 *     UNIQUEMENT si `bucket_id = 'avatars'` ET
 *     `(storage.foldername(name))[1] = auth.uid()::text`, c'est-à-dire un
 *     utilisateur n'écrit QUE sous son propre préfixe `avatars/<uid>/…`.
 *     Non fait dans ce lot : le harnais de vérification PGlite ne fournit pas le
 *     schéma `storage`, donc une telle migration partirait NON TESTÉE — ce que
 *     la discipline du repo interdit. À écrire quand un harnais Supabase local
 *     (Docker) est disponible.
 *  2. UPLOAD : redimensionner (côté client, carré ≤ 512 px) puis
 *     `supabase.storage.from('avatars').upload(path, blob, { upsert: true })`,
 *     avec le chemin `${session.user.id}/avatar.jpg`.
 *  3. PERSISTANCE : `user_profiles.avatar_url` (colonne à ajouter) écrite via la
 *     même Edge Function que le reste du profil — jamais en écriture client
 *     directe sur une table de jeu.
 *  4. MODÉRATION UGC (AMENDEMENT-33) : une photo est du contenu utilisateur
 *     public ; il faut le chemin de signalement + retrait avant publication.
 *  5. ÉTAT D'UPLOAD dans l'UI : tant que 1-4 n'existent pas, l'écran ne doit
 *     JAMAIS afficher « publiée » — c'est la raison d'être de `C.photoLocalOnly`.
 */
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/** Résultat d'un choix de photo. `canceled` couvre aussi le refus de permission. */
export type PickAvatarResult =
  | { kind: 'picked'; uri: string }
  | { kind: 'canceled' }
  | { kind: 'denied' };

/** Nom de fichier stable : une seule photo d'avatar conservée à la fois. */
const AVATAR_FILE = 'gryd-avatar.jpg';

/**
 * Copie l'image choisie dans le sandbox de l'app. Sans cela, l'URI renvoyée par
 * le sélecteur pointe vers un cache système que le téléphone peut purger — la
 * photo disparaîtrait toute seule au bout de quelques jours.
 * Sur le web `documentDirectory` est nul : on garde l'URI telle quelle.
 */
async function persistLocally(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return sourceUri;
  try {
    const target = `${dir}${AVATAR_FILE}`;
    // Un fichier de même nom existe déjà (photo précédente) → on le remplace.
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.copyAsync({ from: sourceUri, to: target });
    // Suffixe anti-cache : l'URI change à chaque choix, sinon <Image> réaffiche
    // l'ancienne photo (même chemin = même clé de cache).
    return `${target}?v=${Date.now()}`;
  } catch {
    // Copie impossible (stockage plein, sandbox verrouillé) : mieux vaut l'URI
    // temporaire que rien — l'aperçu reste correct pour la session en cours.
    return sourceUri;
  }
}

/**
 * Ouvre la photothèque et renvoie l'URI locale de la photo choisie. Recadrage
 * CARRÉ imposé (`aspect [1,1]`) : l'avatar est clippé en hexagone, donc laisser
 * une image 16:9 reviendrait à rogner le visage sans prévenir.
 */
export async function pickAvatarPhoto(): Promise<PickAvatarResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    // On ne lit QUE l'image retenue : ni EXIF, ni métadonnées de position.
    exif: false,
  });
  if (result.canceled) return { kind: 'canceled' };

  const asset = result.assets[0];
  if (!asset) return { kind: 'canceled' };
  return { kind: 'picked', uri: await persistLocally(asset.uri) };
}

/** Supprime la copie locale — retour assumé à l'avatar généré. */
export async function clearAvatarPhoto(): Promise<void> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  try {
    await FileSystem.deleteAsync(`${dir}${AVATAR_FILE}`, { idempotent: true });
  } catch {
    // Le fichier n'existait pas / est déjà parti : rien à réparer.
  }
}
