/**
 * GRYD — E77 : ÉCRIRE ET RETIRER UNE ZONE PROTÉGÉE. L'I/O, et rien d'autre.
 *
 * La DÉCISION vit dans `zoneEdit.ts` (pure, testée). Ce module obéit : il
 * convertit, il écrit, il rend un verdict. Aucune règle ne se décide ici.
 *
 * ═══ ÉCRITURE CLIENTE DIRECTE, ET POURQUOI C'EST LÉGITIME ═══════════════════
 * Pas de RPC. `privacy_zones` porte une RLS owner-only sur les QUATRE opérations
 * (`0003_rls.sql:150-163`) : un joueur ne peut lire, insérer, modifier ni
 * supprimer que SES lignes, et le serveur le vérifie à chaque requête. Ajouter
 * une RPC n'ajouterait aucune garantie — elle déplacerait seulement la même
 * vérification ailleurs. Les bornes (rayon 200-500 m, index 0-2) sont des CHECK
 * de `0002_schema.sql:181` : le serveur reste juge, même si l'écran valide déjà.
 *
 * ═══ LE CENTRE EST STOCKÉ GROSSIER, ET C'EST LA PROTECTION ═════════════════
 * On n'écrit JAMAIS le lat/lng exact : `PRIVACY_ZONE_H3_RESOLUTION` (8) réduit
 * le centre à une cellule d'environ 0,7 km². Une base compromise ne livrerait
 * donc pas l'adresse — seulement le quartier. C'est délibéré et c'est écrit dans
 * la colonne elle-même (`center_h3_res8`).
 *
 * ⚠️ CONSÉQUENCE ASSUMÉE : la zone réellement appliquée au masquage est centrée
 * sur le CENTRE DE LA CELLULE, pas sur le point tapé. L'écart peut atteindre
 * quelques centaines de mètres — c'est pourquoi le rayon minimal est 200 m et
 * non 50 m. L'écran doit dire « autour de », jamais « exactement ici ».
 */
import { latLngToCell } from 'h3-js';
import { PRIVACY_ZONE_H3_RESOLUTION } from '@klaim/shared';
import { supabase } from '../../lib/supabase';

/** Verdict d'une écriture. Les trois issues sont DISTINCTES, jamais fondues. */
export type ZoneWriteOutcome =
  /** La base a acquitté : la zone protège désormais. */
  | { readonly kind: 'saved' }
  /** Aucun backend joignable ou aucune session : rien n'a été tenté. */
  | { readonly kind: 'no-account' }
  /** La base a refusé ou n'a pas répondu : RIEN n'est protégé, et on le dit. */
  | { readonly kind: 'failed' };

/**
 * Pose (ou remplace) la zone d'index `index`. `upsert` sur la clé primaire
 * `(user_id, zone_index)` : rejouer le même geste ne crée pas de doublon et ne
 * casse pas — un tap répété sur un réseau lent doit être inoffensif.
 */
export async function saveZone(
  userId: string,
  index: number,
  lat: number,
  lng: number,
  radiusM: number,
): Promise<ZoneWriteOutcome> {
  if (!supabase) return { kind: 'no-account' };
  try {
    // BigInt : la colonne est un `bigint`, et l'index H3 en hexadécimal dépasse
    // la précision d'un Number. Passer par `Number` corromprait silencieusement
    // le centre — la zone protégerait alors un autre endroit.
    const cell = BigInt(`0x${latLngToCell(lat, lng, PRIVACY_ZONE_H3_RESOLUTION)}`).toString();
    const { error } = await supabase
      .from('privacy_zones')
      .upsert(
        { user_id: userId, zone_index: index, center_h3_res8: cell, radius_m: radiusM },
        { onConflict: 'user_id,zone_index' },
      );
    if (error) {
      console.error('[privacy_zones] écriture refusée :', error.message);
      return { kind: 'failed' };
    }
    return { kind: 'saved' };
  } catch (err) {
    console.error('[privacy_zones] écriture échouée :', err);
    return { kind: 'failed' };
  }
}

/**
 * Retire la zone d'index `index`.
 *
 * ⚠️ RETIRER UNE ZONE EST UNE PERTE DE PROTECTION, pas un simple ménage :
 * les courses à venir cesseront d'exclure cet endroit. L'écran DOIT le dire
 * avant, et ne jamais présenter ce geste comme réversible « sans effet ».
 */
export async function removeZone(userId: string, index: number): Promise<ZoneWriteOutcome> {
  if (!supabase) return { kind: 'no-account' };
  try {
    const { error } = await supabase
      .from('privacy_zones')
      .delete()
      .eq('user_id', userId)
      .eq('zone_index', index);
    if (error) {
      console.error('[privacy_zones] suppression refusée :', error.message);
      return { kind: 'failed' };
    }
    return { kind: 'saved' };
  } catch (err) {
    console.error('[privacy_zones] suppression échouée :', err);
    return { kind: 'failed' };
  }
}
