/**
 * GRYD — LA SEULE I/O DE L'ACCUEIL : lire ce que JE TIENS (M3, revu ADR-010).
 *
 * ─── POURQUOI CE FICHIER EST SI MINCE ───────────────────────────────────────
 * Tout ce qui DÉCIDE vit ailleurs et sans réseau : `territoryGeo` juge ce qui
 * est lisible, `homeState` juge ce que l'écran a le droit d'affirmer. Ici, il
 * ne reste que le transport — et c'est voulu : la partie qu'on ne peut pas
 * tester en local doit être celle qui contient le moins de jugement possible.
 *
 * ─── POURQUOI ÇA NE LIT PLUS `territories` (ADR-010) ────────────────────────
 * Ce module lisait les POLYGONES DE BOUCLE. Or aucun `ST_Difference` n'existe
 * dans le dépôt : un polygone n'est jamais découpé quand un rival lui prend des
 * cellules. Et un coureur ne prend presque jamais une zone entière — il en
 * prend une part, souvent une part de plusieurs à la fois.
 *
 * Conséquence de l'ancienne lecture : deux joueurs voyaient chacun leur boucle
 * ENTIÈRE sur un terrain qui n'appartenait qu'à l'un d'eux. La carte affirmait
 * une propriété que la base contredisait — alors que les points, les classements
 * et le decay suivaient déjà les cellules.
 *
 * Désormais : les CELLULES sont la propriété, la forme se dérive d'elles
 * (`heldShape.ts`). Perdre une part, c'est perdre des cellules ; la forme
 * rétrécit toute seule.
 *
 * ─── L'AIRE VIENT ENCORE DES POLYGONES, ET C'EST VOULU ──────────────────────
 * Le chiffre héros reste `territories.area_m2` — l'aire géodésique calculée UNE
 * FOIS par le moteur. La recalculer sur les anneaux de cellules produirait un
 * SECOND chiffre, qui finirait par contredire celui de l'écran de résultat sans
 * que personne ne sache lequel croire.
 *
 * ⚠️ Les deux lectures doivent donc RÉUSSIR ENSEMBLE : un échec partiel n'existe
 * pas (contrat de `homeState`). Une forme sans aire, ou une aire sans forme,
 * décrirait une possession que l'autre moitié dément.
 */
import { supabase } from '../../lib/supabase';
import { toTerritoryGeo, type TerritoryGeoResult, type TerritoryRow } from './territoryGeo';
import { heldCollection, type HeldCell } from './heldShape';

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
 * Les cellules que je tiens. `hex_claims` est la VÉRITÉ de la propriété
 * (ADR-010) : c'est elle qui décide déjà les points, les classements et le decay.
 */
const COLONNES_CELLULES = 'h3index';

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
    // Les DEUX lectures en parallèle, et il faut les deux (voir l'en-tête).
    const [polys, cellules] = await Promise.all([
      supabase
        .from('territories')
        .select(COLONNES)
        .eq('owner_type', 'user')
        .eq('owner_id', userId)
        .in('state', ETATS_TENUS),
      supabase.from('hex_claims').select(COLONNES_CELLULES).eq('owner_user_id', userId),
    ]);
    if (polys.error !== null || polys.data === null) return { kind: 'failed', unreadable: 0 };
    if (cellules.error !== null || cellules.data === null) return { kind: 'failed', unreadable: 0 };

    // L'AIRE : depuis les polygones, source unique du chiffre héros.
    const aire = toTerritoryGeo(polys.data as unknown as TerritoryRow[]);
    if (aire.kind === 'failed') return aire;

    // LA FORME : depuis les cellules tenues.
    const forme = heldCollection(cellules.data as unknown as HeldCell[]);
    if (forme === null) return { kind: 'failed', unreadable: 1 };

    return {
      kind: 'ok',
      collection: forme.collection,
      // `ownedCount` compte ce qui est POSSÉDÉ, donc les cellules : c'est lui
      // qui décide `empty` vs `owned` sur l'accueil. Compter les polygones
      // laisserait « possédé » quelqu'un qui a tout perdu mais dont les traces
      // de course restent en base.
      ownedCount: forme.cellCount,
      areaM2: aire.areaM2,
    };
  } catch {
    return { kind: 'failed', unreadable: 0 };
  }
}
