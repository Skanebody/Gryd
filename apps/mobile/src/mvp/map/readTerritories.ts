/**
 * GRYD — LA SEULE I/O DE L'ACCUEIL : lire MES territoires (lot M3).
 *
 * ─── POURQUOI CE FICHIER EST SI MINCE ───────────────────────────────────────
 * Tout ce qui DÉCIDE vit ailleurs et sans réseau : `territoryGeo` juge ce qui
 * est lisible, `homeState` juge ce que l'écran a le droit d'affirmer. Ici, il
 * ne reste que le transport — et c'est voulu : la partie qu'on ne peut pas
 * tester en local doit être celle qui contient le moins de jugement possible.
 *
 * ─── CE QU'IL LIT, ET CE QU'IL NE LIT PAS ───────────────────────────────────
 * Mes territoires À MOI, et rien d'autre. Le MVP ne peint ni les rivaux ni le
 * neutre : le neutre n'existe pas (c'est le fond de carte), et un rival sur
 * l'accueil du premier jour est une information dont personne n'a l'usage.
 *
 * `geometry` (exacte) et non `geometry_generalized` : la géométrie généralisée
 * existe pour ne pas livrer la trace d'AUTRUI. Sur ma propre zone, la flouter
 * n'apporte aucune protection et me montrerait une forme qui n'est pas la
 * mienne — c'est-à-dire, à l'écran, une donnée fausse.
 */
import { supabase } from '../../lib/supabase';
import { toTerritoryGeo, type TerritoryGeoResult, type TerritoryRow } from './territoryGeo';

/**
 * Les états qui signifient « je le tiens ».
 *
 * Reprend la liste déjà arbitrée côté legacy (`PAINTABLE_STATES`,
 * `features/map/territoriesSource.ts:214`) — recopiée, pas importée (ADR-001).
 * Sont volontairement absents `expired` et `invalidated` : c'est de
 * l'HISTORIQUE conservé, et le peindre affirmerait que ces zones sont encore
 * tenues. `unowned` non plus : le neutre n'est pas une possession, c'est le fond.
 */
const ETATS_TENUS = [
  'owned_personal',
  'owned_crew',
  'contested',
  'defended',
  'transfer_pending',
  'protected_by_privacy',
] as const;

/** Colonnes demandées — SOURCE UNIQUE, pour qu'aucun appelant n'en oublie une. */
const COLONNES = 'id, geometry, area_m2';

/**
 * Lit mes territoires. La SEULE fonction de ce module.
 *
 * Renvoie `failed` sur toute anomalie — réseau, PostgREST, ligne illisible —
 * SANS jamais renvoyer un `ok` partiel : c'est le contrat que `homeState`
 * suppose et que `territoryGeo` fait respecter côté données.
 *
 * ⚠️ Un `catch` qui renverrait une liste vide ferait dire à l'écran « ta ville
 * est vierge » à quelqu'un dont la connexion a juste sauté. C'est la forme la
 * plus banale du mensonge par repli, et elle est interdite ici par construction :
 * ce type n'a pas de valeur « vide par défaut ».
 */
export async function readMyTerritories(userId: string): Promise<TerritoryGeoResult> {
  if (supabase === null) return { kind: 'failed', unreadable: 0 };
  try {
    const { data, error } = await supabase
      .from('territories')
      .select(COLONNES)
      .eq('owner_type', 'user')
      .eq('owner_id', userId)
      .in('state', ETATS_TENUS);
    if (error !== null || data === null) return { kind: 'failed', unreadable: 0 };
    return toTerritoryGeo(data as unknown as TerritoryRow[]);
  } catch {
    return { kind: 'failed', unreadable: 0 };
  }
}
