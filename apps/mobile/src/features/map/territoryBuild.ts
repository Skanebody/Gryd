/**
 * GRYD — P0.2 : cœur PUR de la lecture du territoire réel (hex_claims → géométrie).
 *
 * Séparé de `hexClaims.ts` (qui porte le hook React + le client Supabase) pour être
 * TESTABLE : c'est la règle du projet — logique → fonction pure + tests Deno. Et c'est
 * la seule fonction qui transforme une capture en pixel ; jusqu'ici toute la couche
 * carte n'avait AUCUN test (1 seul test mobile dans le repo, sur le parsing GPX).
 * Zéro import React/Supabase ici : Deno charge ce module tel quel, sans drift.
 */
import { cellArea } from 'h3-js';
import { cellsToTerritory, territoryId, type TerritoryId, type TerritoryState } from './territory';

/** Une capture telle que stockée : h3index est un BIGINT côté Postgres. */
export interface HexClaimRow {
  h3index: string | number;
  owner_user_id: string | null;
  claim_type: string | null;
  decay_at: string | null;
  claimed_at: string | null;
}

/**
 * Contrat de propriétés d'une feature de territoire (contraintes fondateur §6).
 * `displayName` est nullable DÈS MAINTENANT : quand les secteurs/quartiers existeront,
 * on le renseignera par un simple lookup — sans changer le rendu ni le contrat.
 */
export interface TerritoryProperties {
  territoryId: TerritoryId;
  /** Nom métier (« République »). NULL tant qu'aucun secteur n'est câblé → l'UI dit « Zone ». */
  displayName: string | null;
  ownerId: string | null;
  ownerType: 'user' | 'crew' | 'neutral';
  areaM2: number;
  status: TerritoryState;
  capturedAt: string | null;
  updatedAt: string;
}

/** Un territoire réel prêt à rendre : géométrie fusionnée + propriétés du contrat. */
export interface RealTerritory {
  props: TerritoryProperties;
  /** Multi-polygone fusionné/lissé, [lng, lat] (sortie de cellsToTerritory). */
  polygons: [number, number][][][];
  zoneCount: number;
}

/**
 * BIGINT Postgres → cellule H3 hexadécimale.
 * NB : `ingest_run` fait la conversion inverse (index.ts:146-148) mais ce sont des
 * const PRIVÉES d'un fichier Deno, non exportées et absentes de packages/shared → le
 * mobile ne peut pas les importer. On la refait ici, côté client, plutôt que de
 * prétendre réutiliser ce qui n'est pas réutilisable.
 */
export function dbToH3(value: string | number): string {
  return BigInt(value).toString(16);
}

/**
 * État de rendu d'une capture, du point de vue du joueur courant.
 * MVP volontairement minimal : 'crew' (à moi) / 'rival' (à un autre). Le decay et le
 * contesté viendront quand la donnée existera vraiment — on n'invente pas un statut.
 */
export function stateFor(row: HexClaimRow, meId: string | null): TerritoryState {
  return row.owner_user_id !== null && row.owner_user_id === meId ? 'crew' : 'rival';
}

/**
 * Groupe les captures par (PROPRIÉTAIRE × état) puis fusionne CHAQUE groupe en UNE
 * géométrie. Arbitrage fondateur du 15/07 : l'unité de lecture est le TERRITOIRE.
 *
 * POURQUOI PAS PAR ZONE (mon premier essai, mesuré et rejeté) : grouper par cellule
 * parente puis fusionner chaque groupe découpe un territoire à cheval sur deux zones en
 * 2 polygones ADJACENTS de même état. Les couches de trace dessinant un contour PAR
 * polygone, un trait apparaissait sur leur arête commune : une frontière QUI N'EXISTE
 * PAS. Les zones font ~0,66 km² → toute vraie course en traverse plusieurs : c'était la
 * norme, pas un cas limite.
 * Fusionner le seul CONTOUR par état ne réparait rien : smoothRing (territory.ts:254 —
 * simplify 24 m + Chaikin ×2) s'applique PAR ANNEAU et n'est PAS distributif sur l'union
 * (smooth(A∪B) ≠ smooth(A)∪smooth(B)). Mesuré sur 61 hexes / 4 zones : 11,45 m d'écart
 * max entre le contour de l'union et le bord des aplats par zone — on échangeait une
 * frontière inventée contre un contour décollé de son aplat.
 * Ici aplat ET contour sortent de la MÊME courbe : ils coïncident par construction.
 *
 * POURQUOI PAR PROPRIÉTAIRE ET NON PAR ÉTAT SEUL : stateFor écrase TOUS les adversaires
 * en 'rival'. Fusionner par état seul souderait deux crews adverses adjacents en un seul
 * mega-territoire — on effacerait une frontière VRAIE en voulant en supprimer une fausse.
 *
 * Le tap (C1) et le dimming (C3) sont portés par `territoryId`, clé de TERRITOIRE :
 * taper allume la forme entière d'un propriétaire, le reste s'atténue.
 */
export function buildTerritories(
  rows: readonly HexClaimRow[],
  meId: string | null,
  now: () => string = () => new Date().toISOString(),
): RealTerritory[] {
  interface Group {
    ownerId: string | null;
    state: TerritoryState;
    cells: string[];
    capturedAt: string | null;
  }
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const state = stateFor(row, meId);
    // Le propriétaire fait PARTIE de l'identité : deux rivaux distincts = deux territoires.
    const key = `${row.owner_user_id ?? 'neutral'}:${state}`;
    let g = groups.get(key);
    if (!g) {
      g = { ownerId: row.owner_user_id, state, cells: [], capturedAt: null };
      groups.set(key, g);
    }
    g.cells.push(dbToH3(row.h3index));
    // capturedAt = la capture la PLUS RÉCENTE du territoire. Avant, on gardait la ligne
    // du premier hex d'une requête SANS order by : une valeur tirée au sort. Inoffensif
    // tant que personne ne l'affiche, franchement mensonger dès le premier lecteur.
    if (row.claimed_at !== null && (g.capturedAt === null || row.claimed_at > g.capturedAt)) {
      g.capturedAt = row.claimed_at;
    }
  }

  const out: RealTerritory[] = [];
  for (const [key, g] of groups) {
    const territory = cellsToTerritory(g.cells, g.state);
    if (!territory) continue;
    out.push({
      props: {
        // Clé de territoire déterministe : même entrée → même id, à chaque rendu.
        territoryId: territoryId(key),
        // Aucun nom inventé (contrainte fondateur §5) : null → l'UI affiche « Zone ».
        displayName: null,
        ownerId: g.ownerId,
        ownerType: g.ownerId === null ? 'neutral' : 'user',
        // Vraie aire H3 sommée — plus de 0 en dur (une valeur fausse dès le 1er lecteur).
        areaM2: g.cells.reduce((sum, cell) => sum + cellArea(cell, 'm2'), 0),
        status: g.state,
        capturedAt: g.capturedAt,
        updatedAt: now(),
      },
      polygons: territory.polygons as unknown as [number, number][][][],
      zoneCount: territory.zoneCount,
    });
  }
  return out;
}

/**
 * Le texte que la carte affiche sur sa SOURCE de données. Pur et partagé par les DEUX
 * cartes (native + web) : une seule vérité, impossible à faire diverger, et testable.
 *
 * Les trois cas sont distincts et ne doivent JAMAIS être confondus :
 *   • `failed`  — connecté mais la lecture a échoué. Dire « pas encore tes vraies
 *     captures » ici serait un mensonge par omission : le territoire existe peut-être,
 *     on n'a pas su le lire.
 *   • `!isReal` — pas de session/backend : c'est la démo, on l'étiquette.
 *   • vide réel — chargé, zéro capture : on NOMME le vide, sinon il se lit comme un
 *     chargement en panne.
 * Retourne null quand il n'y a rien d'honnête à ajouter (du vrai territoire s'affiche).
 */
export function dataNote(isReal: boolean, failed: boolean, count = 0): string | null {
  if (failed) return 'Territoires indisponibles — on n’a pas pu charger tes captures.';
  if (!isReal) return 'Territoires de démonstration — pas encore tes vraies captures.';
  if (count === 0) {
    return 'Aucun territoire capturé pour l’instant — cours pour prendre ta première zone.';
  }
  return null;
}
