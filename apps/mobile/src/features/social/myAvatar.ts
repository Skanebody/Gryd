/**
 * GRYD — MA PHOTO DE PROFIL, telle qu'un autre écran peut l'afficher.
 *
 * Écrit pour le marqueur de position sur la carte (lot 2), qui a besoin d'UNE
 * chose : « ai-je une photo, et sous quelle URL ? ». Le reste du profil ne le
 * regarde pas.
 *
 * ─── POURQUOI UNE URL SIGNÉE, ET PAS UNE URL PUBLIQUE ───────────────────────
 * Le bucket `social-2026` est créé avec `public = false` (0124:96). Il n'existe
 * donc AUCUNE URL publique : `getPublicUrl` renverrait une adresse qui répond
 * 400. La seule lecture possible est une URL SIGNÉE, délivrée au lecteur
 * authentifié et bornée dans le temps — ce que fait déjà `profileStore`
 * (`createSignedUrl(path, 120)`), avec un rafraîchissement toutes les 90 s.
 *
 * ─── POURQUOI CE MODULE NE SIGNE RIEN LUI-MÊME ──────────────────────────────
 * Une seconde chaîne de signature, ce serait une seconde vérité : deux TTL, deux
 * horloges, et le jour où l'une expire l'écran A montre un visage que l'écran B
 * a perdu. `useMyAvatarUri` LIT donc `useMyProfile()` — la source qui connaît
 * déjà `avatarPath`, la session et l'époque de propriétaire.
 *
 * ─── LE CACHE MÉMOIRE, ET CE QU'IL PROTÈGE EXACTEMENT ───────────────────────
 * `useMyProfile` repasse par `loading: true` à chaque rechargement (toutes les
 * 90 s, et à chaque retour d'écran). Sans mémoire, le marqueur de la carte
 * CLIGNOTERAIT : photo → repli initiale → photo. Le cache retient donc la
 * DERNIÈRE URL connue, et il est :
 *   · scopé au PROPRIÉTAIRE et à l'ÉPOQUE (`resultOwner2026`) — un changement de
 *     compte le vide, sinon on afficherait le visage de quelqu'un d'autre ;
 *   · vidé dès que le profil dit « plus de photo » (retrait explicite) ;
 *   · en MÉMOIRE seulement : rien n'est écrit sur le disque, une URL signée est
 *     un jeton d'accès et n'a rien à faire dans un stockage persistant.
 * Il ne fabrique jamais une photo : sans compte, ou avant toute lecture réussie,
 * la valeur est `null` — l'appelant peint alors son repli (initiale), pas un
 * rond gris qui ferait croire à un chargement sans fin.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../run/resultOwner2026';
import { useMyProfile } from './profileStore';

/**
 * Durée de validité d'une URL signée, en secondes. MÊME valeur que celle que
 * `profileStore` et `useSocialMedia2026` demandent déjà (120 s) : une seule
 * durée pour une seule photo, sinon deux écrans expirent à deux moments.
 */
const SIGNED_URL_TTL_S = 120;

/** Dernière URL connue, strictement scopée au couple (propriétaire, époque). */
let remembered: { owner: string; epoch: number; url: string } | null = null;

/** Vide la mémoire — appelé au changement de compte et au retrait de la photo. */
export function forgetMyAvatarUri(): void {
  remembered = null;
}

/**
 * L'URL (signée) de MA photo de profil, ou `null` si je n'en ai pas / si rien
 * n'a encore été lu. Aucun état intermédiaire n'est exposé : un appelant qui
 * reçoit `null` affiche son repli, il n'attend pas.
 */
export function useMyAvatarUri(): string | null {
  const { session } = useSession();
  const owner = session?.user.id ?? null;
  const epoch = resultOwnerEpoch2026();
  const { profile, loading, failed } = useMyProfile();

  const fresh = !loading && !failed && owner !== null ? profile.avatarUri.trim() : '';

  // Le compte a changé : la mémoire de l'ancien n'a plus le droit d'exister.
  if (remembered && (remembered.owner !== owner || remembered.epoch !== epoch)) remembered = null;

  if (owner !== null && !loading && !failed) {
    // Lecture ABOUTIE : elle fait foi, y compris quand elle dit « aucune photo ».
    remembered = fresh.length > 0 ? { owner, epoch, url: fresh } : null;
  }

  return remembered && remembered.owner === owner && remembered.epoch === epoch
    ? remembered.url
    : null;
}

/**
 * Signe une lecture de MA photo fraîchement déposée, pour l'aperçu et pour le
 * patch de profil.
 *
 * POURQUOI L'ÉCRAN D'ÉDITION EN A BESOIN : `saveProfile` (profileStore) décide
 * de RE-téléverser à partir d'une seule chose — `patch.avatarUri` ne commence
 * pas par `https://`. En laissant l'URI LOCALE dans le brouillon après un envoi
 * déjà fait, on enverrait la même photo DEUX fois et on laisserait un objet
 * orphelin de plus dans le bucket. Poser ici l'URL signée est donc ce qui rend
 * l'envoi idempotent, sans toucher à `saveProfile`.
 *
 * `null` si la signature échoue : le brouillon garde alors une URI vide, ce qui
 * est le second chemin sûr (aucun re-téléversement, `avatarPath` fait foi).
 */
export async function signMyAvatarUrl2026(path: string): Promise<string | null> {
  if (!supabase || path.length === 0) return null;
  try {
    const signed = await supabase.storage.from('social-2026').createSignedUrl(path, SIGNED_URL_TTL_S);
    return signed.error ? null : signed.data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Supprime un objet du bucket `social-2026`.
 *
 * Appelé pour la photo REMPLACÉE ou RETIRÉE : sans cela, chaque nouvelle photo
 * laisserait l'ancienne dans le bucket, indéfiniment lisible par son
 * propriétaire — un visage qu'on croyait effacé. La policy
 * `social_media_delete_2026` (0124:99) autorise exactement ce geste : tout objet
 * dont le premier segment de chemin est mon `auth.uid()`.
 *
 * Best effort ASSUMÉ : si l'effacement échoue (hors ligne, jeton expiré), on ne
 * bloque pas le joueur et on ne lui affiche pas un échec pour un ménage qui ne
 * change rien à ce qu'il voit. Le filet reste la purge de compte (0136), qui
 * emporte tout le préfixe. Renvoie `true` seulement si l'objet est bien parti.
 */
export async function discardAvatarObject2026(ownerId: string, path: string): Promise<boolean> {
  if (!supabase || path.length === 0) return false;
  // On n'efface QUE sous son propre préfixe. La policy le redit côté serveur ;
  // le vérifier ici évite d'envoyer une requête qu'on sait refusée.
  if (path.split('/')[0] !== ownerId) return false;
  const epoch = resultOwnerEpoch2026();
  if (!isResultOwnerCurrent2026(ownerId, epoch)) return false;
  try {
    const result = await supabase.storage.from('social-2026').remove([path]);
    return !result.error;
  } catch {
    return false;
  }
}

/**
 * Retient un chemin d'objet à effacer QUAND l'écran se démonte sans l'avoir
 * confirmé. Sert au cas exact suivant : le joueur choisit une photo (envoyée),
 * puis quitte l'édition sans enregistrer — l'objet est dans le bucket, le profil
 * ne le référence pas. Le laisser serait un fichier orphelin de plus à chaque
 * hésitation.
 */
export function useDiscardOnUnmount(ownerId: string | null): {
  arm: (path: string | null) => void;
  disarm: () => void;
} {
  const armed = useRef<string | null>(null);
  const owner = useRef<string | null>(ownerId);
  owner.current = ownerId;
  useEffect(() => {
    return () => {
      const path = armed.current;
      const uid = owner.current;
      if (path && uid) void discardAvatarObject2026(uid, path);
    };
  }, []);
  return {
    arm: (path: string | null) => {
      armed.current = path;
    },
    disarm: () => {
      armed.current = null;
    },
  };
}
