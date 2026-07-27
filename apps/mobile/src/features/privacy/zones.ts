/**
 * GRYD — ZONES FLOUTÉES DU JOUEUR : la forme, le décodage, le verdict. PUR.
 *
 * ═══ D'OÙ VIENNENT CES ZONES (une seule source, pas un miroir) ══════════════
 * De la table `public.privacy_zones` (migration `0002_schema.sql:181`, RLS
 * owner-only `0003_rls.sql:150`) — la MÊME que le serveur consulte déjà pour
 * refuser de capturer un hexagone qui tombe dedans
 * (`supabase/functions/ingest_run/index.ts:445`, `loadPrivacyHexes`). Il n'y a
 * donc pas de « réglage client » à honorer : le partage lit ce que le serveur
 * lit, et une zone posée protège les DEUX surfaces ou aucune.
 *
 * ⚠️ CE QUI N'EXISTE PAS ENCORE, ET QU'IL FAUT DIRE : rien dans l'app n'écrit
 * dans cette table. Aucun écran ne permet de déclarer une adresse,
 * `EVENTS.privacyZoneSet` (`packages/shared/src/events.ts:21`) n'est émis nulle
 * part. La lecture ci-dessous est donc RÉELLE mais rend zéro zone pour tout le
 * monde aujourd'hui. Ce module ne fabrique aucune zone de démonstration : une
 * fausse zone donnerait à croire qu'on protège une adresse qu'on n'a jamais
 * reçue — exactement le mensonge que la constitution interdit.
 *
 * ═══ POURQUOI LE CENTRE EST GROSSIER ════════════════════════════════════════
 * La base stocke un index H3 de résolution 8 (`PRIVACY_ZONE_H3_RESOLUTION`,
 * ~460 m de diamètre), JAMAIS un lat/lng exact : même une fuite de la table ne
 * rendrait pas l'adresse. Le décodage ci-dessous rend donc le CENTRE DE LA
 * CELLULE, pas le domicile — et c'est pour ça que le rayon minimal
 * (`PRIVACY_ZONE_RADIUS_MIN_M` = 200 m) est du même ordre : il absorbe l'écart
 * entre le centre de cellule et le vrai point.
 */
import {
  PRIVACY_ZONES_MAX,
  PRIVACY_ZONE_RADIUS_MAX_M,
  PRIVACY_ZONE_RADIUS_MIN_M,
} from '@klaim/shared';
import { cellToLatLng } from 'h3-js';
import type { PrivacyZone } from '../share/sharePrivacy';

/**
 * Ligne brute de `privacy_zones` telle que PostgREST la rend. `bigint` sort en
 * `string` (au-delà de 2^53 un `number` mentirait) — on accepte les deux formes
 * plutôt que de supposer.
 */
export interface PrivacyZoneRow {
  center_h3_res8: string | number | null;
  radius_m: number | null;
}

/** Colonnes lues — exportées pour que le test puisse vérifier la requête. */
export const PRIVACY_ZONE_COLUMNS = 'center_h3_res8, radius_m';

/**
 * `bigint` de la base → index H3 hexadécimal. Symétrique EXACT du `dbToH3` de
 * l'Edge Function (`ingest_run/index.ts:192`) : si les deux divergeaient, le
 * partage et le serveur ne protégeraient pas la même zone.
 */
export function dbToH3(value: string | number): string | null {
  try {
    const n = BigInt(value);
    return n > 0n ? n.toString(16) : null;
  } catch {
    return null;
  }
}

/**
 * Lignes de la base → zones géométriques utilisables par `applySharePrivacy`.
 *
 * DÉFENSIVE, et jamais silencieusement permissive : une ligne illisible (index
 * H3 invalide, rayon absent) est ÉCARTÉE — elle ne devient pas une zone de
 * rayon 0, qui ne masquerait rien tout en gonflant le compte. Le rayon est
 * borné aux valeurs que la contrainte SQL admet (200-500 m) : une ligne
 * corrompue ne peut donc ni sur-masquer, ni sous-masquer.
 *
 * Le nombre de zones est plafonné à `PRIVACY_ZONES_MAX` comme en base
 * (`zone_index between 0 and 2`) — le plafond est une règle, pas une limite de
 * requête.
 */
export function rowsToPrivacyZones(
  rows: readonly PrivacyZoneRow[],
): readonly PrivacyZone[] {
  const zones: PrivacyZone[] = [];
  for (const row of rows) {
    if (zones.length >= PRIVACY_ZONES_MAX) break;
    if (row.center_h3_res8 === null || row.radius_m === null) continue;
    const h3 = dbToH3(row.center_h3_res8);
    if (h3 === null) continue;
    let center: [number, number];
    try {
      center = cellToLatLng(h3);
    } catch {
      continue;
    }
    const [lat, lng] = center;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!Number.isFinite(row.radius_m)) continue;
    const radiusM = Math.min(
      PRIVACY_ZONE_RADIUS_MAX_M,
      Math.max(PRIVACY_ZONE_RADIUS_MIN_M, row.radius_m),
    );
    zones.push({ center: { lat, lng }, radiusM });
  }
  return zones;
}

/**
 * LES QUATRE ÉTATS, jamais confondus (constitution) — appliqués à la lecture
 * des zones :
 *  · `no-account` : pas de backend configuré ou pas de session. Ce n'est PAS de
 *    l'ignorance : les zones sont stockées par compte, donc sans compte il n'en
 *    existe aucune à honorer. On peut publier.
 *  · `loading`    : lecture EN COURS. On ne sait pas encore — un chargement
 *    n'affirme rien sur le joueur.
 *  · `ready`      : lecture ABOUTIE. `zones` peut être vide, et « vide » est une
 *    réponse, pas une absence de réponse.
 *  · `error`      : lecture ÉCHOUÉE. On ne sait pas, et on ne devinera pas.
 */
export type PrivacyZonesRead =
  | { status: 'no-account' }
  | { status: 'loading' }
  | { status: 'ready'; zones: readonly PrivacyZone[] }
  | { status: 'error' };

/**
 * Peut-on publier une trace maintenant, et avec quelles zones ?
 *
 * LA RÈGLE QUI COMPTE : tant que les zones sont INCONNUES (`loading`, `error`),
 * on ne publie PAS. Publier « en attendant » reviendrait à parier que le joueur
 * n'a déclaré aucune zone — et le jour où il en a une, ce pari expose sa porte
 * d'entrée sur une image qui, elle, ne se rattrape pas. §1.5 est catégorique :
 * les zones « prévalent sur tout rendu social ».
 *
 * L'appelant DOIT distinguer les deux refus (`loading` ≠ `error`) : l'un dit
 * « une seconde », l'autre dit « réessaie ». Les confondre est précisément
 * l'écueil que la constitution nomme.
 */
export type ZonePublication =
  | { ready: true; zones: readonly PrivacyZone[] }
  | { ready: false; reason: 'loading' | 'error' };

export function zonesForPublication(read: PrivacyZonesRead): ZonePublication {
  switch (read.status) {
    case 'ready':
      return { ready: true, zones: read.zones };
    case 'no-account':
      return { ready: true, zones: [] };
    case 'loading':
      return { ready: false, reason: 'loading' };
    case 'error':
      return { ready: false, reason: 'error' };
  }
}
