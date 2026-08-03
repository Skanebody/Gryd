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
      // LE TRACÉ : la géométrie EXACTE des boucles courues, point par point.
      // `territories.geometry` (et non `geometry_generalized`) : le généralisé
      // existe pour ne pas livrer le parcours d'AUTRUI — sur le mien, il me
      // montrerait une ligne que je n'ai pas courue.
      trace: aire.collection,
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

/**
 * Les zones des AUTRES joueurs. La seconde I/O de l'accueil.
 *
 * ─── POURQUOI ELLES SONT NÉCESSAIRES ────────────────────────────────────────
 * Sans elles, la carte ne montre qu'une moitié du jeu : on voit sa propre
 * surface rétrécir sans jamais voir QUI l'a mordue. La prise partielle
 * (ADR-010) devient alors une disparition inexpliquée.
 *
 * ─── CE QU'ELLE LIT, ET POURQUOI PAS AUTRE CHOSE ────────────────────────────
 * La vue `public_territories`, JAMAIS la table. Elle n'expose que
 * `geometry_generalized` — la géométrie floutée — et filtre côté SERVEUR selon
 * `map_sharing` (RLS, vérifiée en réel : 11/11). Autrement dit : je ne peux pas
 * voir le parcours exact de quelqu'un d'autre, même en le demandant.
 *
 * ⚠️ C'est aussi pourquoi on ne dessine PAS de tracé pour un rival. Ma trace
 * suit mes rues point par point parce qu'elle est à moi ; la sienne ne m'est
 * livrée que floutée, et la peindre comme une ligne de course laisserait croire
 * qu'on sait où il est passé. On montre la surface qu'il tient, pas son chemin.
 */
const COLONNES_PUBLIQUES = 'id, geometry_generalized, area_m2';

/** Plafond de lecture — la carte d'un quartier, pas l'annuaire d'une ville. */
const MAX_RIVAUX = 200;

export async function readRivalTerritories(userId: string): Promise<TerritoryGeoResult> {
  if (supabase === null) return { kind: 'failed', unreadable: 0 };
  try {
    const { data, error } = await supabase
      .from('public_territories')
      .select(COLONNES_PUBLIQUES)
      .neq('owner_id', userId)
      .limit(MAX_RIVAUX);
    if (error !== null || data === null) return { kind: 'failed', unreadable: 0 };
    // `geometry_generalized` est renommée `geometry` pour que le parseur commun
    // s'applique : la VÉRIFICATION de ce qui est lisible doit être la même pour
    // les rivaux que pour moi — un polygone illisible ne devient pas acceptable
    // parce qu'il appartient à quelqu'un d'autre.
    const lignes = (data as unknown as { id: string; geometry_generalized: unknown; area_m2: number }[]).map(
      (r) => ({ id: r.id, geometry: r.geometry_generalized, area_m2: r.area_m2 }),
    );
    return toTerritoryGeo(lignes);
  } catch {
    return { kind: 'failed', unreadable: 0 };
  }
}
