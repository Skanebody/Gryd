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
 * ⚠️ CORRIGÉ LE 10/09/2026. Ce docbloc affirmait qu'une ligne `user_profiles`
 * « n'existe qu'à partir du moment où le joueur a enregistré un profil ». C'est
 * FAUX depuis la migration `0154` : `handle_new_user()` provisionne la ligne de
 * profil À L'INSCRIPTION, avec les défauts de 0011 (`profile_visibility='crew'`,
 * `map_sharing='simplified'`, `discreet_mode=false`), et 0154 rattrape même les
 * comptes créés avant elle. Un compte normal a donc TOUJOURS `hasProfile`.
 * Le cas `false` n'a pas disparu pour autant, et c'est pourquoi il reste nommé :
 * il reste possible si la ligne a été supprimée à la main, ou si le trigger n'a
 * pas tourné. Dans cet état, 0126 fait `coalesce(discreet_mode, true)` → discret,
 * et `get_ownership_2026` exige la ligne → rien n'est publié : l'état « sans
 * profil » est le plus FERMÉ qui soit, pas une ignorance. L'écran le dit et
 * conduit à la création du profil au lieu de peindre un interrupteur qui
 * échouerait (`profile_required` côté 0135).
 */

import { parseTraceRetention, type TraceRetentionChoice2026 } from './traceRetention';

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
  /**
   * `trace_retention_2026` (0195) : ce que GRYD garde des tracés de tes
   * sorties — `keep` (défaut : rien n'est jamais effacé), `days_90`,
   * `days_365`. Ce réglage ne gouverne PAS une exposition : il gouverne ce que
   * TU gardes.
   *
   * ⚠️ `null` N'EST PAS UN DÉFAUT, C'EST UNE IGNORANCE : le serveur n'a pas dit
   * ce qu'il applique (clé absente d'un serveur antérieur à 0195, ou valeur
   * inconnue). L'écran affiche alors « on n'a pas pu lire ta préférence » et
   * ne peint aucun choix sélectionné. Voir `./traceRetention.ts`.
   */
  readonly traceRetention: TraceRetentionChoice2026 | null;
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
 *
 * ═══ L'ASYMÉTRIE DE `traceRetention`, ET POURQUOI ELLE EST JUSTE ════════════
 * Les trois premiers réglages gouvernent CE QUE LES AUTRES VOIENT : les lire de
 * travers ferait afficher « tu es masqué » à quelqu'un qui ne l'est pas, donc
 * toute la lecture bascule en `failed`. `traceRetention` (0195) gouverne CE QUE
 * TU GARDES : personne n'est exposé si on ne sait pas le lire. On DÉGRADE donc
 * le champ (`null` → « on n'a pas pu lire ta préférence », dans son seul bloc)
 * au lieu de faire tomber la page entière — ce qui garde les trois réglages
 * d'exposition utilisables sur un serveur antérieur à 0195. Ce qui n'est
 * jamais fait, dans aucun des deux cas : afficher une valeur que le serveur
 * n'a pas donnée.
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
    traceRetention: parseTraceRetention(o.traceRetention),
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

/**
 * ═══ LE CLASSEMENT DE COMMUNE EXISTE DEPUIS LE 10/09/2026 ═══════════════════
 *
 * L'écran de confidentialité portait, jusqu'au 10/09, une ligne « Apparaître
 * dans les classements » sans effet ; elle a été RETIRÉE le matin même au motif
 * — vrai à cet instant — qu'aucun classement n'existait. Les migrations 0160 à
 * 0164 (lot L, ADR-013 §2.1) en ont publié un le jour même : « Ta commune,
 * cette semaine ».
 *
 * Ce classement lit EXACTEMENT les colonnes que cet écran gouverne déjà :
 *   · `board_eligible_events_2026` (0161) exige `map_sharing <> 'none'` et
 *     `not coalesce(discreet_mode, true)` — un profil discret est exclu
 *     ENTIÈREMENT du tableau, pas seulement de son nom ;
 *   · `read_leaderboard_2026` (0164) nomme les lignes avec
 *     `territory_owner_identity_2026` (0126), donc via `profile_visibility` :
 *     c'est le MÊME arbitre que la carte.
 *
 * D'où cette fonction, et surtout ce qu'elle N'EST PAS : un onzième réglage.
 * La présence au classement n'est pas une décision de plus à prendre, c'est la
 * CONSÉQUENCE de deux réglages déjà pris. On la DÉRIVE et on l'affiche comme un
 * fait ; un interrupteur séparé serait soit un doublon, soit une contradiction.
 *
 * ORDRE DES MOTIFS, ET IL EST DÉLIBÉRÉ : `map_sharing = 'none'` d'abord, parce
 * que c'est l'exclusion la plus large (rien de toi n'est sur la carte, donc
 * rien n'est classé) et que cet écran ne l'expose PAS — la taire ferait croire
 * que l'interrupteur du nom suffit à revenir dans le tableau.
 */
export type CommuneBoardPresence =
  /** Classable : la ligne peut exister, nommée selon `profileVisibility`. */
  | { readonly kind: 'listed'; readonly namedFor: ProfileVisibilityValue }
  /** `map_sharing = 'none'` : rien n'est publié, donc rien n'est classé. */
  | { readonly kind: 'hidden-by-map' }
  /** `discreet_mode` : le tableau ne compte pas la personne du tout. */
  | { readonly kind: 'hidden-by-discretion' }
  /** Aucune ligne de profil : le serveur n'a rien à lire (fail-closed 0161). */
  | { readonly kind: 'hidden-by-no-profile' };

/** Suis-je classable dans « Ta commune, cette semaine » ? (dérivé, jamais réglé) */
export function communeBoardPresence(audience: PrivacyAudience): CommuneBoardPresence {
  if (!audience.hasProfile) return { kind: 'hidden-by-no-profile' };
  if (audience.mapSharing === 'none') return { kind: 'hidden-by-map' };
  if (audience.discreetMode) return { kind: 'hidden-by-discretion' };
  return { kind: 'listed', namedFor: audience.profileVisibility };
}
