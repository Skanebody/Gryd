/**
 * GRYD — P0.2 : cœur PUR de la lecture du territoire réel (hex_claims → géométrie).
 *
 * Séparé de `hexClaims.ts` (qui porte le hook React + le client Supabase) pour être
 * TESTABLE : c'est la règle du projet — logique → fonction pure + tests Deno. Et c'est
 * la seule fonction qui transforme une capture en pixel ; jusqu'ici toute la couche
 * carte n'avait AUCUN test (1 seul test mobile dans le repo, sur le parsing GPX).
 * Zéro import React/Supabase ici : Deno charge ce module tel quel, sans drift.
 */
import { cellArea, cellToParent } from 'h3-js';
import { SECTOR_H3_RESOLUTION } from '@klaim/shared';
import { cellsToTerritory, territoryId, type TerritoryId, type TerritoryState } from './territory';
// Le centroïde d'un paquet de cellules existe DÉJÀ, pur et testé, du côté
// mission : on l'importe plutôt que d'en écrire un second (deux centroïdes
// finiraient par diverger, et la caméra cadrerait ailleurs que la mission).
import { territoryCentroid, type MissionPoint } from '../mission/deriveMission';
import { C } from '../../i18n/catalog/map';
import { resolve, type Locale } from '../../i18n/types';

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
  /**
   * Centroïde des cellules possédées (planche E04 — la caméra cadre la zone
   * tapée AU-DESSUS de la sheet). `null` si aucune cellule n'est lisible : on ne
   * vole alors nulle part plutôt que vers un point inventé.
   */
  center: MissionPoint | null;
}

/** Un territoire réel prêt à rendre : géométrie fusionnée + propriétés du contrat. */
export interface RealTerritory {
  props: TerritoryProperties;
  /** Multi-polygone fusionné/lissé, [lng, lat] (sortie de cellsToTerritory). */
  polygons: [number, number][][][];
  zoneCount: number;
  /**
   * SECTEURS (H3 res 7) réellement couverts par ce territoire, triés — un
   * territoire peut chevaucher plusieurs secteurs, et le rattacher au seul
   * secteur de son centroïde le placerait parfois dans le mauvais. Sert à lire
   * l'état RÉEL `sector_snapshot.contested` sans nouvelle requête (E04).
   */
  sectorIds: readonly string[];
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
 * MVP volontairement minimal : 'crew' (à moi OU à un membre de MON crew — §C :
 * « moi/mon crew = chartreuse », la couleur suit le RÔLE, pas l'identité) /
 * 'rival' (à un autre). Le decay et le contesté viendront quand la donnée
 * existera vraiment — on n'invente pas un statut.
 *
 * `crewIds` = ids des membres ACTIFS de mon crew (crew réel 2/3, A-41/backlog).
 * Absent ou vide = joueur sans crew : comportement inchangé. Le regroupement de
 * buildTerritories reste PAR PROPRIÉTAIRE : les zones de deux membres adjacents
 * restent deux territoires (le tap dit QUI tient quoi), seule la COULEUR est
 * partagée — l'union visuelle sans souder les frontières vraies.
 */
export function stateFor(
  row: HexClaimRow,
  meId: string | null,
  crewIds?: ReadonlySet<string> | null,
): TerritoryState {
  if (row.owner_user_id === null) return 'rival';
  if (row.owner_user_id === meId) return 'crew';
  return crewIds?.has(row.owner_user_id) ? 'crew' : 'rival';
}

/**
 * Secteurs (H3 res 7) couverts par un paquet de cellules — dédoublonnés et
 * TRIÉS pour que deux rendus des mêmes données donnent exactement la même liste.
 * Une cellule illisible est ignorée (défensif) : un secteur manquant fait juste
 * disparaître un état, il n'en invente jamais un.
 */
export function sectorsOf(cells: readonly string[]): readonly string[] {
  const out = new Set<string>();
  for (const cell of cells) {
    try {
      out.add(cellToParent(cell, SECTOR_H3_RESOLUTION));
    } catch {
      // Cellule invalide : aucun secteur déduit — jamais un secteur approximé.
    }
  }
  return [...out].sort();
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
  crewIds?: ReadonlySet<string> | null,
): RealTerritory[] {
  interface Group {
    ownerId: string | null;
    state: TerritoryState;
    /**
     * ─── UN SET, ET PAS UN TABLEAU (correctif de la dimension DISCIPLINE) ─────
     * `h3index` n'est PLUS une clé primaire à lui seul : la migration
     * 0070_activity_dimension la fait passer à `(h3index, activity)` pour que les
     * mondes Run et Bike ne se volent pas leurs zones. Conséquence directe ici :
     * un joueur qui tient le MÊME hexagone dans les deux disciplines produit DEUX
     * lignes, de même propriétaire et de même état, donc rangées dans le MÊME
     * groupe — et la cellule était poussée deux fois.
     *
     * La suite était brutale et sans filet : `cellsToMultiPolygon` LÈVE sur des
     * cellules dupliquées (« Duplicate input »), personne n'attrape, et le
     * `.catch()` de hexClaims.ts basculait la lecture en ÉCHEC. La couche
     * territoire disparaissait alors des SEPT écrans qui la consomment — les deux
     * mondes, pas seulement le vélo — remplacée par « on n'a pas pu charger ».
     *
     * Le repo avait DÉJÀ nommé et testé cet invariant (captureToPixel.test.ts,
     * « toute nouvelle source DOIT dédupliquer avant d'appeler buildTerritories ») :
     * on le tient ici, au seul endroit qui agrège, plutôt que de l'exiger de
     * chaque appelant. Dédupliquer est de toute façon JUSTE : une cellule tenue
     * deux fois reste UNE cellule sur la carte.
     */
    cells: Set<string>;
    capturedAt: string | null;
  }
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const state = stateFor(row, meId, crewIds);
    // Le propriétaire fait PARTIE de l'identité : deux rivaux distincts = deux territoires.
    const key = `${row.owner_user_id ?? 'neutral'}:${state}`;
    let g = groups.get(key);
    if (!g) {
      g = { ownerId: row.owner_user_id, state, cells: new Set(), capturedAt: null };
      groups.set(key, g);
    }
    g.cells.add(dbToH3(row.h3index));
    // capturedAt = la capture la PLUS RÉCENTE du territoire. Avant, on gardait la ligne
    // du premier hex d'une requête SANS order by : une valeur tirée au sort. Inoffensif
    // tant que personne ne l'affiche, franchement mensonger dès le premier lecteur.
    if (row.claimed_at !== null && (g.capturedAt === null || row.claimed_at > g.capturedAt)) {
      g.capturedAt = row.claimed_at;
    }
  }

  const out: RealTerritory[] = [];
  for (const [key, g] of groups) {
    // Matérialisé UNE fois : les consommateurs en aval (géométrie, aire, centroïde,
    // secteurs) travaillent sur une liste, et l'unicité est déjà garantie par le Set.
    const cells = [...g.cells];
    const territory = cellsToTerritory(cells, g.state);
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
        areaM2: cells.reduce((sum, cell) => sum + cellArea(cell, 'm2'), 0),
        status: g.state,
        capturedAt: g.capturedAt,
        updatedAt: now(),
        center: territoryCentroid(cells),
      },
      polygons: territory.polygons as unknown as [number, number][][][],
      zoneCount: territory.zoneCount,
      sectorIds: sectorsOf(cells),
    });
  }
  return out;
}

/**
 * Le texte que la carte affiche sur sa SOURCE de données. Pur et partagé par les DEUX
 * cartes (native + web) : une seule vérité, impossible à faire diverger, et testable.
 *
 * Trois cas distincts, qui ne doivent JAMAIS être confondus :
 *   • `failed`  — connecté mais la lecture a échoué. Dire « aucun territoire » ici
 *     serait un mensonge par omission : le territoire existe peut-être, on n'a pas su
 *     le lire. On dit donc que la LECTURE a échoué, pas que le joueur n'a rien pris.
 *   • `!isReal` — pas de session (ou backend absent) : la carte est vide de tout.
 *     Le vrai état est « pas connecté ».
 *   • vide réel — chargé, zéro capture : on donne l'ACTION (« prends ta première
 *     zone »), qui dit le vide sans le nommer et sans laisser croire à une panne.
 *
 * ⚠️ IL N'Y A PLUS DE CAS « DÉMONSTRATION ». Le paramètre `demoPainted` et la copie
 * `dataNoteDemo` (« Territoires de démonstration ») ont disparu avec le mode vitrine
 * (21/07/2026) : plus AUCUNE surface ne peint de démo, donc l'étiqueter n'a plus
 * d'objet — et l'écrire au-dessus d'une carte nue serait un mensonge de l'autre bord
 * (le joueur chercherait des territoires fictifs et conclurait à une panne).
 * ⚠️ CE QUE CETTE FONCTION NE SAIT PAS : distinguer « pas de session » de « lecture
 * en cours » — `isReal` est faux dans les deux cas. L'appelant DOIT donc se taire
 * tant que `useRealTerritories().loading` est vrai, sinon la note affiche
 * « Connecte-toi pour capturer » à un joueur connecté pendant la restauration de sa
 * session. Les deux MapScreen le font ; tout nouvel appelant doit le faire aussi.
 *
 * Copie volontairement COURTE (§A, retour terrain « le bloc est trop large ») : une
 * seule proposition, jamais deux — le bandeau tient sur une ligne en 375 px dans les
 * cinq langues. Toute rallonge future doit repasser ce test.
 * Retourne null quand il n'y a rien d'honnête à ajouter (du vrai territoire s'affiche).
 *
 * `locale` traduit la note (module PUR : résolution i18n directe via le
 * catalogue, jamais d'import du store) — défaut 'fr', les écrans passent
 * useLocale().
 */
export function dataNote(
  isReal: boolean,
  failed: boolean,
  count = 0,
  locale: Locale = 'fr',
): string | null {
  if (failed) return resolve(C.dataNoteFailed, locale);
  if (!isReal) return resolve(C.dataNoteSignedOut, locale);
  if (count === 0) return resolve(C.dataNoteEmpty, locale);
  return null;
}
