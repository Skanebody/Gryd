/**
 * GRYD — LES RÉGLAGES D'AUDIENCE, CÔTÉ SERVEUR. Forme, décodage, verdicts.
 *
 * Module PUR (zéro import React / React Native / Supabase) : testable sous Deno.
 * L'I/O vit dans `./audienceStore.ts`.
 *
 * ═══ LE DÉFAUT QU'IL CORRIGE ════════════════════════════════════════════════
 * `profileVisibility` n'était écrit qu'en AsyncStorage (`./store.ts`), alors que
 * le serveur décidait déjà depuis `user_profiles` :
 *   · `territory_owner_identity_2026` (0126) lit `profile_visibility` ET
 *     `discreet_mode` pour décider si le NOM et le CREW du propriétaire d'un
 *     territoire s'affichent sur la carte d'un autre joueur ;
 *   · `get_ownership_2026` (0126) exige `map_sharing <> 'none'` pour publier le
 *     territoire lui-même.
 * Le réglage de l'écran ne quittait jamais le téléphone : il ne gouvernait rien.
 * Depuis 0135, `my_privacy_settings_2026()` / `save_privacy_settings_2026()`
 * lisent et écrivent EXACTEMENT ces trois colonnes.
 *
 * ═══ `hasProfile`, ET POURQUOI CE N'EST PAS UN DÉTAIL ═══════════════════════
 * Une ligne `user_profiles` n'existe qu'à partir du moment où le joueur a
 * enregistré un profil (handle obligatoire). Tant qu'elle n'existe pas :
 * 0126 fait `coalesce(discreet_mode, true)` → discret, et `get_ownership_2026`
 * exige la ligne → rien n'est publié. L'état « sans profil » est donc le plus
 * FERMÉ qui soit, pas une ignorance. L'écran le dit et conduit à la création du
 * profil au lieu de peindre un interrupteur qui échouerait.
 */

/** Audience du profil — mêmes valeurs que le `check` de `user_profiles`. */
export const PROFILE_VISIBILITY_VALUES = ['public', 'crew', 'friends', 'private'] as const;
export type ProfileVisibilityValue = (typeof PROFILE_VISIBILITY_VALUES)[number];

/** Partage de carte — mêmes valeurs que le `check` de `user_profiles`. */
export const MAP_SHARING_VALUES = ['precise', 'simplified', 'territory_only', 'none'] as const;
export type MapSharingValue = (typeof MAP_SHARING_VALUES)[number];

/** Les trois réglages que le serveur oppose réellement. */
export interface PrivacyAudience {
  readonly profileVisibility: ProfileVisibilityValue;
  readonly mapSharing: MapSharingValue;
  /**
   * `discreet_mode` : quand il est VRAI, 0126 retire le nom ET le crew du
   * propriétaire, même si le profil est public. L'écran l'expose INVERSÉ
   * (« Mes territoires portent mon nom ») — voir `nameOnTerritories`.
   */
  readonly discreetMode: boolean;
  /** Une ligne `user_profiles` existe-t-elle ? (voir docbloc) */
  readonly hasProfile: boolean;
}

/**
 * LES QUATRE ÉTATS, NOMMÉS SÉPARÉMENT — jamais fondus dans un `null` :
 *  · `signed-out` : aucun compte, donc aucun réglage serveur à afficher ;
 *  · `loading`    : lecture en cours, l'écran n'affirme rien ;
 *  · `failed`     : on n'a PAS pu lire — ce n'est pas « tout est fermé » ;
 *  · `ready`      : les valeurs viennent du serveur.
 */
export type PrivacyAudienceRead =
  | { readonly status: 'signed-out' }
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly audience: PrivacyAudience };

/** Verdict d'une écriture. Les quatre issues sont DISTINCTES. */
export type PrivacyAudienceWrite =
  /** Le serveur a acquitté : la valeur rendue est celle qu'il applique. */
  | { readonly kind: 'saved'; readonly audience: PrivacyAudience }
  /** Aucun backend joignable ou aucune session : rien n'a été tenté. */
  | { readonly kind: 'signed-out' }
  /** Aucun profil : le serveur refuse, et l'écran doit conduire à sa création. */
  | { readonly kind: 'profile-required' }
  /** Refus ou réseau : RIEN n'a changé côté serveur, et il faut le dire. */
  | { readonly kind: 'failed' };

const isVisibility = (v: unknown): v is ProfileVisibilityValue =>
  typeof v === 'string' && (PROFILE_VISIBILITY_VALUES as readonly string[]).includes(v);

const isMapSharing = (v: unknown): v is MapSharingValue =>
  typeof v === 'string' && (MAP_SHARING_VALUES as readonly string[]).includes(v);

/**
 * Charge utile de `my_privacy_settings_2026()` → audience typée, ou `null`.
 *
 * STRICTE À DESSEIN : une valeur inconnue rend `null` (donc `failed` côté
 * écran) au lieu de retomber sur un défaut. Sur la page qui gouverne
 * l'exposition d'une géolocalisation, deviner serait affirmer.
 */
export function parsePrivacyAudience(raw: unknown): PrivacyAudience | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isVisibility(o.profileVisibility)) return null;
  if (!isMapSharing(o.mapSharing)) return null;
  if (typeof o.discreetMode !== 'boolean') return null;
  if (typeof o.hasProfile !== 'boolean') return null;
  return {
    profileVisibility: o.profileVisibility,
    mapSharing: o.mapSharing,
    discreetMode: o.discreetMode,
    hasProfile: o.hasProfile,
  };
}

/**
 * L'interrupteur affiché, DÉRIVÉ du serveur : « Mes territoires portent mon
 * nom » est l'inverse de `discreet_mode`. On ne stocke jamais la forme affichée,
 * seulement la colonne — sinon les deux dériveraient.
 */
export function nameOnTerritories(audience: PrivacyAudience): boolean {
  return !audience.discreetMode;
}

/** Le patch à envoyer quand le joueur bascule cet interrupteur. */
export function withNameOnTerritories(
  audience: PrivacyAudience,
  shown: boolean,
): PrivacyAudience {
  return { ...audience, discreetMode: !shown };
}

/** Le patch à envoyer quand le joueur change l'audience du profil. */
export function withProfileVisibility(
  audience: PrivacyAudience,
  visibility: ProfileVisibilityValue,
): PrivacyAudience {
  return { ...audience, profileVisibility: visibility };
}

/**
 * Traduit l'erreur PostgREST/PostgreSQL en verdict. `profile_required` a son
 * cas à lui : c'est le seul refus auquel le joueur peut REMÉDIER, et l'écran
 * doit alors montrer le chemin (créer son profil) plutôt qu'un « échec ».
 */
export function privacyWriteFailure(message: string): PrivacyAudienceWrite {
  return message.includes('profile_required')
    ? { kind: 'profile-required' }
    : { kind: 'failed' };
}
