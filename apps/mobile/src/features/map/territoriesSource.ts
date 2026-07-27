/**
 * GRYD — LOT 1, ÉTAPE 4 sur 4 : **LE RENDU LIT LE POLYGONE** (spec §1.4 « aucun
 * hexagone », §12.3 géométrie publique dérivée).
 *
 * ═══ CE QUE CE MODULE FAIT ══════════════════════════════════════════════════
 * Il transforme une LIGNE de `public.territories` (migration 0074) en la même
 * structure de rendu que la carte consomme déjà (`RealTerritory`), pour que
 * `mapStyle` / `allTerritories` / le tap / le dimming continuent de marcher SANS
 * ÊTRE TOUCHÉS. La seule chose qui change, c'est la GÉOMÉTRIE : ce n'est plus un
 * contour d'hexagones adouci au Chaikin, c'est le POLYGONE DE LA TRACE RÉELLE,
 * tel que le moteur pur l'a produit et tel que la base le stocke.
 *
 * Et l'AIRE : `props.areaM2` vaut désormais `territories.area_m2` — l'aire
 * géodésique DU POLYGONE, calculée une fois par le moteur — et non plus la somme
 * des `cellArea` H3. C'est précisément la confusion que le lot 1 supprime : la
 * surface annoncée au joueur est celle de la forme qu'il voit.
 *
 * ═══ CE QU'IL NE FAIT PAS ═══════════════════════════════════════════════════
 * Aucune I/O, aucun React, aucun Supabase, aucune horloge implicite (`now` est
 * INJECTÉ). Aucun recalcul de géométrie : la base est autoritaire, on ne
 * « corrige » pas un polygone qu'on n'a pas produit. Aucune donnée fabriquée :
 * une ligne qu'on ne sait pas lire honnêtement est ÉCARTÉE et COMPTÉE, jamais
 * remplacée par une forme approchée.
 *
 * ═══ POURQUOI PAS `@klaim/engine` ═══════════════════════════════════════════
 * Metro ne résout pas les imports Deno `.ts` de `@klaim/engine` (constat déjà
 * inscrit dans sectorView.ts, walkability.ts, cityMatch.ts…). Le seul calcul
 * géométrique nécessaire ici est un POINT-DANS-ANNEAU de 12 lignes ; il est
 * réécrit plus bas plutôt que d'aliaser un paquet qui ne se bundle pas.
 */
import { cellToLatLng, latLngToCell } from 'h3-js';
import {
  ACTIVITIES,
  SECTOR_H3_RESOLUTION,
  type Activity,
} from '@klaim/shared';
import { territoryId, type TerritoryId, type TerritoryState } from './territory';
import {
  buildTerritories,
  dbToH3,
  sectorsOf,
  type HexClaimRow,
  type RealTerritory,
} from './territoryBuild';
import type { MissionPoint } from '../mission/deriveMission';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA LIGNE TELLE QU'ELLE EST LUE
// ═══════════════════════════════════════════════════════════════════════════

/** Les 9 états de `territories.state` (§5.3, migration 0074). */
export type TerritoryDbState =
  | 'unowned'
  | 'owned_personal'
  | 'owned_crew'
  | 'contested'
  | 'defended'
  | 'transfer_pending'
  | 'protected_by_privacy'
  | 'expired'
  | 'invalidated';

export type TerritoryOwnerType = 'user' | 'crew';

/**
 * Une ligne de `public.territories`, telle que PostgREST la rend.
 *
 * `geometry` / `geometry_generalized` sont typés `unknown` À DESSEIN : ce sont
 * des colonnes `jsonb` dont la base ne vérifie que l'enveloppe (0074 le dit
 * noir sur blanc : « la base stocke, elle ne calcule pas » — ni anneau fermé, ni
 * cohérence avec `area_m2`). Les déclarer `GeoJsonPolygon` ici serait affirmer
 * une garantie que personne ne tient. `parsePolygonRings` fait la vérification,
 * et ce qui ne passe pas n'est PAS rendu.
 */
export interface TerritoryRow {
  id: string;
  activity: string;
  owner_type: TerritoryOwnerType | null;
  owner_id: string | null;
  geometry: unknown;
  geometry_generalized: unknown;
  area_m2: number;
  state: TerritoryDbState;
  defense_level: number;
  controlled_since: string | null;
  publish_after: string;
  source_run_id: string | null;
}

/**
 * Les colonnes à demander — SOURCE UNIQUE, pour que deux appelants ne puissent
 * pas diverger (l'un oubliant `geometry_generalized` et servant sans le savoir
 * la trace exacte d'un rival, par exemple).
 *
 * `publish_after` EST demandée bien que la RLS filtre déjà les lignes non
 * publiées : elle sert au diagnostic, et une colonne absente du `select` est un
 * champ `undefined` silencieux au premier lecteur qui la voudra.
 */
export const TERRITORY_SELECT_COLUMNS =
  'id, activity, owner_type, owner_id, geometry, geometry_generalized, area_m2, state, defense_level, controlled_since, publish_after, source_run_id';

// ═══════════════════════════════════════════════════════════════════════════
// 2. GÉOMÉTRIE : LIRE, OU NE PAS RENDRE
// ═══════════════════════════════════════════════════════════════════════════

/** Anneau OUVERT (dernier point ≠ premier) de positions [lng, lat]. */
export type PolygonRing = [number, number][];

/**
 * `jsonb` → anneaux OUVERTS, ou `null` si ce n'est pas un GeoJSON Polygon
 * exploitable.
 *
 * OUVERTS, ET C'EST CRITIQUE : `allTerritories.closeRing` (allTerritories.ts:253)
 * réappose le premier point SANS VÉRIFIER qu'il n'y est pas déjà. Rendre un
 * anneau déjà fermé y produirait un sommet dupliqué en fin d'anneau — un
 * segment de longueur nulle que MapLibre peut refuser de trianguler. Le GeoJSON
 * de la base est fermé (c'est la norme, et `toGeoJsonPolygon` le fait) : on
 * l'OUVRE ici, une fois, au seul endroit qui lit la base.
 *
 * TOUS les anneaux sont conservés, trous compris : un territoire peut
 * légitimement en avoir, et en perdre un peindrait comme sien un morceau qui ne
 * l'est pas.
 *
 * `null` plutôt qu'un repli : une géométrie qu'on ne sait pas lire ne donne
 * AUCUNE forme. On n'approxime pas la propriété de quelqu'un.
 */
export function parsePolygonRings(value: unknown): PolygonRing[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const obj = value as { type?: unknown; coordinates?: unknown };
  if (obj.type !== 'Polygon') return null;
  if (!Array.isArray(obj.coordinates)) return null;
  const rings: PolygonRing[] = [];
  for (const rawRing of obj.coordinates) {
    if (!Array.isArray(rawRing)) return null;
    const ring: PolygonRing = [];
    for (const rawPt of rawRing) {
      if (!Array.isArray(rawPt)) return null;
      const lng = rawPt[0];
      const lat = rawPt[1];
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      ring.push([lng, lat]);
    }
    // Réouverture : on retire le point de fermeture s'il existe.
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (ring.length > 1 && first && last && first[0] === last[0] && first[1] === last[1]) {
      ring.pop();
    }
    // Sous 3 sommets distincts, ce n'est pas une surface — l'anneau est ignoré
    // (un trou dégénéré ne doit pas faire tomber le polygone extérieur).
    if (ring.length >= 3) rings.push(ring);
  }
  return rings.length === 0 ? null : rings;
}

/** Quelle version de la géométrie a été rendue — jamais devinée par le lecteur. */
export type GeometryPrecision = 'exact' | 'generalized';

export interface PickedGeometry {
  rings: PolygonRing[];
  precision: GeometryPrecision;
}

/**
 * LA RÈGLE DE §12.3, appliquée au seul endroit qui lit la base.
 *
 *   • MES PROPRES territoires (`owner_type = 'user'` et `owner_id = moi`) :
 *     `geometry`, la géométrie AUTORITAIRE. Le délai de publication protège le
 *     joueur des rivaux, il ne lui cache pas ce qu'il vient de faire — et la
 *     forme exacte de sa propre trace est déjà la sienne.
 *   • TOUS LES AUTRES (rival, crew, inconnu) : `geometry_generalized` UNIQUEMENT.
 *     « Un territoire public est une géométrie DÉRIVÉE. Il ne doit pas permettre
 *     de reconstruire le trajet privé exact. »
 *
 * ⚠️ ET S'IL N'Y A PAS DE VERSION GÉNÉRALISÉE ? On ne rend RIEN (`null`). Pas de
 * repli sur `geometry` : ce serait servir la trace exacte d'autrui sous un nom
 * qui promet l'inverse, exactement ce que 0074 interdit. Le territoire n'est pas
 * perdu pour autant — ses CELLULES `hex_claims` restent lisibles et peintes par
 * le repli hexagonal (voir §5) ; il s'affiche donc en hexagones plutôt qu'en
 * polygone, ce qui est moins beau mais parfaitement vrai.
 *
 * Un membre du crew propriétaire est traité comme le public : il voit la ligne
 * (la RLS le lui permet), il n'a pas besoin du tracé exact d'un coéquipier.
 */
export function pickRenderGeometry(row: TerritoryRow, meId: string | null): PickedGeometry | null {
  const isMine = row.owner_type === 'user' && row.owner_id !== null && row.owner_id === meId;
  if (isMine) {
    const exact = parsePolygonRings(row.geometry);
    if (exact) return { rings: exact, precision: 'exact' };
    // Ma géométrie exacte est illisible : la version publique de MON territoire
    // reste MOI. Se rabattre dessus ne divulgue rien de plus que ce que tout le
    // monde voit déjà.
    const fallback = parsePolygonRings(row.geometry_generalized);
    return fallback ? { rings: fallback, precision: 'generalized' } : null;
  }
  const generalized = parsePolygonRings(row.geometry_generalized);
  return generalized ? { rings: generalized, precision: 'generalized' } : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ÉTAT DE BASE → RÔLE DE COULEUR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les états qui décrivent une propriété ACTIVE, donc peignable.
 *
 * Sont volontairement ABSENTS :
 *   • `unowned` — « le neutre n'existe pas : c'est la basemap » (territory.ts).
 *     Lui donner une couleur de rôle serait inventer un propriétaire.
 *   • `expired` / `invalidated` — de l'HISTORIQUE conservé (§9.4). Les peindre
 *     affirmerait qu'ils sont tenus ; ils ne le sont plus.
 */
const PAINTABLE_STATES: ReadonlySet<TerritoryDbState> = new Set<TerritoryDbState>([
  'owned_personal',
  'owned_crew',
  'contested',
  'defended',
  'transfer_pending',
  'protected_by_privacy',
]);

/**
 * §C de la constitution (`GRYD_REGLES_NON_NEGOCIABLES.md`) — LA COULEUR SUIT LE
 * RÔLE, PAS L'IDENTITÉ : chartreuse = moi/mon crew, orange = rival, violet =
 * contesté. Cette règle PRIME sur §3.9 de la spec produit, qui parlait d'une
 * « couleur de crew » (le registre d'autorité met la constitution au-dessus des
 * specs produit, et 200 k joueurs ne tiennent pas dans une palette d'identités).
 *
 * `contested` gagne sur la propriété : une zone disputée se lit comme disputée,
 * quel qu'en soit le tenant — c'est l'information qui déclenche l'action.
 *
 * `null` = rien à peindre pour cette ligne.
 */
export function territoryRole(
  row: TerritoryRow,
  meId: string | null,
  crewIds?: ReadonlySet<string> | null,
): TerritoryState | null {
  if (!PAINTABLE_STATES.has(row.state)) return null;
  if (row.state === 'contested') return 'contested';
  if (row.owner_id === null) return null;
  if (row.owner_type === 'user' && row.owner_id === meId) return 'crew';
  // Un territoire possédé PAR MON CREW porte le rôle « moi/mon crew », que le
  // propriétaire soit le crew lui-même ou l'un de ses membres.
  if (crewIds?.has(row.owner_id)) return 'crew';
  return 'rival';
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LIGNE → TERRITOIRE RENDU
// ═══════════════════════════════════════════════════════════════════════════

/** Pourquoi une ligne LUE n'a pas été peinte. Compté, jamais tu. */
export type TerritorySkipReason =
  /** État non peignable (`unowned`, `expired`, `invalidated`). */
  | 'state'
  /** Aucune géométrie servable (pas de version publique, ou jsonb illisible). */
  | 'geometry';

/** Centroïde d'un anneau (moyenne des sommets) — suffisant pour cadrer/étiqueter. */
function ringCentroid(ring: PolygonRing): MissionPoint | null {
  if (ring.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const p of ring) {
    lng += p[0];
    lat += p[1];
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}

/**
 * Secteurs (H3 res 7) TOUCHÉS par le polygone, déduits de ses SOMMETS et de son
 * centroïde. Sert à lire l'état réel `sector_snapshot.contested` sans requête
 * supplémentaire (E04), exactement comme `sectorsOf` le fait pour les cellules.
 *
 * SOUS-DÉCLARATION ASSUMÉE ET DITE : un secteur entièrement contenu à
 * l'intérieur du polygone, sans qu'aucun sommet ne l'atteigne, n'est pas
 * détecté. C'est le seul biais acceptable ici — sous-déclarer fait manquer un
 * état, sur-déclarer en inventerait un.
 */
function sectorsOfRing(ring: PolygonRing, center: MissionPoint | null): readonly string[] {
  const out = new Set<string>();
  const push = (lat: number, lng: number): void => {
    try {
      out.add(latLngToCell(lat, lng, SECTOR_H3_RESOLUTION));
    } catch {
      // Coordonnée impossible : aucun secteur déduit — jamais un secteur approximé.
    }
  };
  for (const [lng, lat] of ring) push(lat, lng);
  if (center) push(center.lat, center.lng);
  return [...out].sort();
}

/** Ce qu'une ligne devient — ou pourquoi elle ne devient rien. */
export type RowToTerritory =
  | { ok: true; territory: PolygonTerritory }
  | { ok: false; reason: TerritorySkipReason };

/**
 * Un `RealTerritory` d'origine POLYGONALE, augmenté de ce que seule la table
 * `territories` sait dire. Le supertype reste `RealTerritory` : la carte, le tap
 * et le dimming ne voient aucune différence.
 */
export interface PolygonTerritory extends RealTerritory {
  geometrySource: 'polygon';
  /** Quelle version a été peinte (§12.3) — pour que l'UI ne le devine jamais. */
  precision: GeometryPrecision;
  /** §9.2, niveaux 0-3. Recopié tel quel : la base est autoritaire. */
  defenseLevel: number;
  /** `runs.id` d'origine — clé du complément hexagonal (voir §5). */
  sourceRunId: string | null;
}

/**
 * UNE ligne `territories` → UN territoire rendu.
 *
 * `now` est INJECTÉ (module pur, jamais d'horloge implicite) et n'alimente que
 * `props.updatedAt` — l'instant de LECTURE, pas un fait de jeu.
 *
 * CE QUI N'EST PAS INVENTÉ ICI, et qui manquera donc tant que la table ne le
 * portera pas :
 *   • `displayName` reste `null` (aucun nom de zone fabriqué — l'UI dit « Zone »).
 *   • `earliestDecayAt` reste `null` : `territories` N'A PAS de colonne de decay.
 *     La date est réintroduite au moment du merge, à partir des cellules
 *     `hex_claims` que le polygone recouvre (voir §5) — donnée RÉELLE, pas
 *     déduite d'un `controlled_since` + une durée devinée.
 *   • `zoneCount` vaut 1 : dans le modèle polygonal, UN territoire EST une zone.
 *     Ce n'est PAS un compte d'hexagones, et il ne doit jamais être comparé à
 *     celui d'un territoire hexagonal — d'où `geometrySource`, qui rend les deux
 *     mondes distinguables au lieu de laisser un lecteur les additionner à
 *     l'aveugle.
 */
export function rowToTerritory(
  row: TerritoryRow,
  meId: string | null,
  now: string,
  crewIds?: ReadonlySet<string> | null,
): RowToTerritory {
  const role = territoryRole(row, meId, crewIds);
  if (role === null) return { ok: false, reason: 'state' };
  const picked = pickRenderGeometry(row, meId);
  if (picked === null) return { ok: false, reason: 'geometry' };

  const outer = picked.rings[0];
  const center = outer ? ringCentroid(outer) : null;

  return {
    ok: true,
    territory: {
      props: {
        // L'`id` de la LIGNE : stable pour la vie du territoire, donc
        // deep-linkable, et unique sans hachage. C'est la clé du tap (C1) et du
        // dimming (C3), exactement comme la cellule parente l'était.
        territoryId: territoryId(row.id) as TerritoryId,
        displayName: null,
        ownerId: row.owner_id,
        ownerType: row.owner_type ?? 'neutral',
        // ─── L'AIRE VIENT DE LA TABLE, POINT ─────────────────────────────────
        // C'est l'aire GÉODÉSIQUE du polygone, calculée une seule fois par le
        // moteur pur (`polygonAreaM2`) au moment de l'écriture. On ne la
        // recalcule pas côté client : deux formules pour une même surface
        // finiraient par afficher deux nombres, et le joueur en croirait un.
        areaM2: row.area_m2,
        status: role,
        capturedAt: row.controlled_since,
        earliestDecayAt: null,
        updatedAt: now,
        center,
      },
      polygons: [picked.rings],
      zoneCount: 1,
      sectorIds: outer ? sectorsOfRing(outer, center) : [],
      geometrySource: 'polygon',
      precision: picked.precision,
      defenseLevel: row.defense_level,
      sourceRunId: row.source_run_id,
    },
  };
}

export interface BuiltPolygonTerritories {
  territories: PolygonTerritory[];
  /** Lignes LUES mais non peintes, par raison. Aucun silence. */
  skipped: Readonly<Record<TerritorySkipReason, number>>;
}

/** Toutes les lignes d'une lecture → les territoires polygonaux à peindre. */
export function buildPolygonTerritories(
  rows: readonly TerritoryRow[],
  meId: string | null,
  now: string,
  crewIds?: ReadonlySet<string> | null,
): BuiltPolygonTerritories {
  const territories: PolygonTerritory[] = [];
  const skipped: Record<TerritorySkipReason, number> = { state: 0, geometry: 0 };
  for (const row of rows) {
    const res = rowToTerritory(row, meId, now, crewIds);
    if (res.ok) territories.push(res.territory);
    else skipped[res.reason] += 1;
  }
  return { territories, skipped };
}

/**
 * Sépare les lignes par DISCIPLINE, pour les surfaces sans lentille (Profil,
 * /territoire, widget). Jumeau de `splitClaimsByActivity` — mêmes règles : les
 * deux mondes sont TOUJOURS présents (éventuellement vides), et une discipline
 * inconnue n'est rangée nulle part plutôt que versée d'office dans la course.
 */
export function splitTerritoryRowsByActivity(rows: readonly TerritoryRow[]): {
  rows: Readonly<Record<Activity, TerritoryRow[]>>;
  unknownCount: number;
} {
  const out = {} as Record<Activity, TerritoryRow[]>;
  for (const a of ACTIVITIES) out[a] = [];
  let unknownCount = 0;
  for (const row of rows) {
    const a = ACTIVITIES.find((x) => x === row.activity);
    if (a === undefined) {
      unknownCount += 1;
      continue;
    }
    out[a].push(row);
  }
  return { rows: out, unknownCount };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LA TRANSITION — CE QUI RESTE HEXAGONAL, ET POURQUOI ON LE DIT
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ─── LA DÉCISION, ÉCRITE UNE FOIS POUR TOUTES ────────────────────────────────
 *
 * LE FAIT : `territories` ne contient une ligne que pour les captures qui ont
 * FERMÉ UNE BOUCLE depuis la double écriture (étape 3). Tout le reste — les
 * captures antérieures, et les courses « couloir » qui prennent des cellules
 * sans rien enclore (porte 1 de `buildTerritoryRow`) — n'existe QU'EN CELLULES
 * dans `hex_claims`. Un backfill tourne en parallèle ; ce module NE PRÉSUME PAS
 * de son résultat et se comporte pareil qu'il ait eu lieu ou non.
 *
 * L'OPTION REJETÉE — « polygones seuls, pas de repli » : elle ferait DISPARAÎTRE
 * de la carte du territoire réellement possédé. L'app dirait à un joueur qu'il
 * ne tient rien là où il tient quelque chose. Sous-déclarer est un mensonge par
 * omission, de la même famille exacte que confondre « échec de lecture » et
 * « aucune capture » — la faute que ce dépôt corrige partout ailleurs.
 *
 * L'OPTION REJETÉE — « tout peindre, polygones ET cellules » : rien n'est caché,
 * mais le contour hexagonal d'une capture reste dessiné PAR-DESSUS son propre
 * polygone. §1.4 ne deviendrait vrai nulle part, et la même surface serait
 * encrée deux fois.
 *
 * LA VOIE RETENUE — LE COMPLÉMENT GÉOMÉTRIQUE. Une cellule `hex_claims` est
 * ÉCARTÉE si et seulement si son CENTRE tombe à l'intérieur d'un polygone DU
 * MÊME PROPRIÉTAIRE : elle est alors déjà peinte, exactement, par ce polygone.
 * Toutes les autres cellules restent peintes, en hexagones.
 *   ⇒ RIEN N'EST CACHÉ : une cellule sans polygone garde son contour.
 *   ⇒ RIEN N'EST DOUBLÉ : une cellule sous un polygone n'est pas repeinte.
 *   ⇒ §1.4 EST VRAI LÀ OÙ LE POLYGONE EXISTE, et faux ailleurs — et « ailleurs »
 *      est COMPTÉ (`hexFallbackCount`) plutôt que passé sous silence.
 *
 * CE QUI RESTE DONC HEXAGONAL À L'ÉCRAN, EN TOUTES LETTRES :
 *   1. toute capture antérieure à la double écriture, tant que le backfill n'a
 *      pas écrit sa ligne `territories` ;
 *   2. les cellules de COULOIR d'une course qui a bouclé : le polygone ne décrit
 *      que l'intérieur de la boucle, le couloir parcouru pour y arriver est
 *      capturé mais n'a pas de surface à décrire. Une frange hexagonale autour
 *      d'un polygone est donc NORMALE et VRAIE ;
 *   3. le territoire d'autrui dont `geometry_generalized` n'a pas été calculée :
 *      on refuse de servir sa trace exacte (§12.3), ses hexagones le
 *      représentent en attendant.
 * Aucun de ces trois cas ne disparaîtra par magie : ils s'éteindront quand le
 * backfill et les lots suivants auront produit les polygones correspondants.
 */

/**
 * POINT DANS ANNEAU (ray casting), en degrés. Réécrit ici plutôt qu'importé de
 * `@klaim/engine` (Metro ne résout pas ses imports Deno `.ts` — même raison
 * qu'en sectorView.ts). Aux échelles en jeu (une cellule res 10 ≈ 65 m), la
 * distorsion du plan lng/lat est très inférieure au rayon d'une cellule : elle
 * ne peut pas retourner la réponse.
 */
function pointInRing(lng: number, lat: number, ring: PolygonRing): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const crosses = a[1] > lat !== b[1] > lat;
    if (!crosses) continue;
    const x = a[0] + ((lat - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
    if (lng < x) inside = !inside;
  }
  return inside;
}

/**
 * Le point est-il DANS le multi-polygone (extérieur oui, trous non) ?
 * Un trou est un morceau que le propriétaire ne tient PAS : une cellule qui y
 * tombe n'est pas couverte, et doit donc rester peinte si elle est possédée.
 */
function pointInPolygon(lng: number, lat: number, rings: readonly PolygonRing[]): boolean {
  const outer = rings[0];
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  for (let i = 1; i < rings.length; i += 1) {
    const hole = rings[i];
    if (hole && pointInRing(lng, lat, hole)) return false;
  }
  return true;
}

/** Résultat du complément : ce qui reste hexagonal, et ce qui a été absorbé. */
export interface ClaimComplement {
  /** Les captures qui n'ont AUCUN polygone pour les décrire — à peindre en hexagones. */
  remaining: HexClaimRow[];
  /**
   * Pour chaque `territoryId` polygonal, l'échéance de decay la PLUS PROCHE
   * parmi les cellules qu'il recouvre, ou `null`. Donnée RÉELLE reprise de
   * `hex_claims` : sans elle, basculer au polygone éteindrait le compte à
   * rebours de défense (E22) — on remplacerait un contour hexagonal par un
   * silence sur le danger, ce qui est bien pire.
   */
  earliestDecayByTerritory: ReadonlyMap<string, string>;
  /** Cellules recouvertes, par `territoryId` — sert à compléter les secteurs. */
  coveredCellsByTerritory: ReadonlyMap<string, string[]>;
}

/**
 * Retire des captures celles qu'un polygone DU MÊME PROPRIÉTAIRE décrit déjà.
 *
 * « DU MÊME PROPRIÉTAIRE » n'est pas un détail : si le polygone d'un rival
 * recouvrait une de MES cellules (chevauchement, aucune contrainte de
 * non-recouvrement n'existe en base — 0074, suspens n° 5), l'écarter effacerait
 * ma possession de la carte au profit de la sienne.
 */
export function complementClaims(
  claims: readonly HexClaimRow[],
  polygons: readonly PolygonTerritory[],
): ClaimComplement {
  const remaining: HexClaimRow[] = [];
  const earliest = new Map<string, string>();
  const covered = new Map<string, string[]>();
  for (const claim of claims) {
    let cell: string;
    let lat: number;
    let lng: number;
    try {
      cell = dbToH3(claim.h3index);
      [lat, lng] = cellToLatLng(cell);
    } catch {
      // Cellule illisible : on la garde côté hexagonal plutôt que de la perdre.
      remaining.push(claim);
      continue;
    }
    let host: PolygonTerritory | null = null;
    for (const t of polygons) {
      if (t.props.ownerId === null || t.props.ownerId !== claim.owner_user_id) continue;
      const rings = t.polygons[0];
      if (rings && pointInPolygon(lng, lat, rings as PolygonRing[])) {
        host = t;
        break;
      }
    }
    if (host === null) {
      remaining.push(claim);
      continue;
    }
    const key = host.props.territoryId as string;
    const cells = covered.get(key);
    if (cells) cells.push(cell);
    else covered.set(key, [cell]);
    // Minimum des `decay_at` : la PREMIÈRE fissure de la zone, jamais la moyenne.
    // Les ISO UTC se comparent lexicographiquement (même longueur, même zone).
    if (claim.decay_at !== null) {
      const cur = earliest.get(key);
      if (cur === undefined || claim.decay_at < cur) earliest.set(key, claim.decay_at);
    }
  }
  return {
    remaining,
    earliestDecayByTerritory: earliest,
    coveredCellsByTerritory: covered,
  };
}

export interface MergedTerritories {
  /** Ce que la carte peint. Polygones d'abord, repli hexagonal ensuite. */
  territories: RealTerritory[];
  /** Combien de territoires sont peints comme POLYGONES (§1.4 tenu). */
  polygonCount: number;
  /** Combien restent HEXAGONAUX. > 0 ⇒ des contours d'hexagones sont à l'écran. */
  hexFallbackCount: number;
  /** Lignes `territories` lues mais non peintes, par raison. */
  skipped: Readonly<Record<TerritorySkipReason, number>>;
}

/**
 * LA FONCTION QUE LE CÂBLAGE APPELLE : deux lectures RÉELLES → une liste à
 * peindre. Pure, déterministe, `now` injecté.
 *
 * ORDRE DE SORTIE : polygones d'abord. Les couches de `mapStyle` regroupent par
 * ÉTAT, donc l'ordre n'a pas d'effet visuel ; il est fixé pour que deux rendus
 * des mêmes données donnent exactement la même liste (diff et tests stables).
 */
export function mergeTerritorySources(input: {
  readonly territoryRows: readonly TerritoryRow[];
  readonly claimRows: readonly HexClaimRow[];
  readonly meId: string | null;
  readonly now: string;
  readonly crewIds?: ReadonlySet<string> | null;
}): MergedTerritories {
  const { territories: polygons, skipped } = buildPolygonTerritories(
    input.territoryRows,
    input.meId,
    input.now,
    input.crewIds,
  );
  const complement = complementClaims(input.claimRows, polygons);

  const enriched: RealTerritory[] = polygons.map((t) => {
    const key = t.props.territoryId as string;
    const decay = complement.earliestDecayByTerritory.get(key) ?? null;
    const cells = complement.coveredCellsByTerritory.get(key) ?? [];
    // Les secteurs des cellules RECOUVERTES complètent ceux déduits des sommets :
    // c'est de la donnée réelle, elle ne peut que réduire la sous-déclaration.
    const sectorIds =
      cells.length === 0
        ? t.sectorIds
        : [...new Set([...t.sectorIds, ...sectorsOf(cells)])].sort();
    return decay === null && sectorIds === t.sectorIds
      ? t
      : { ...t, props: { ...t.props, earliestDecayAt: decay }, sectorIds };
  });

  const hexagonal = buildTerritories(
    complement.remaining,
    input.meId,
    () => input.now,
    input.crewIds,
  );

  return {
    territories: [...enriched, ...hexagonal],
    polygonCount: enriched.length,
    hexFallbackCount: hexagonal.length,
    skipped,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. LES QUATRE ÉTATS HONNÊTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LES QUATRE ÉTATS, ET IL N'Y EN A PAS D'AUTRE (CLAUDE.md) :
 *   `signedOut` — pas de session (ou backend absent). La carte est vide parce
 *                 qu'il n'y a personne, pas parce que le joueur n'a rien pris.
 *   `loading`   — on ne SAIT pas encore. N'AFFIRME RIEN sur le joueur : ni
 *                 « pas connecté », ni « aucune zone ». C'est le piège que ce
 *                 type existe pour rendre impossible.
 *   `failed`    — connecté, lecture ratée. Le territoire existe peut-être ; on
 *                 n'a pas su le lire. Jamais « aucune zone ».
 *   `empty`     — lu, et RÉELLEMENT vide. Le seul état qui autorise à dire au
 *                 joueur qu'il n'a rien capturé.
 *   `ready`     — lu, et non vide.
 */
export type TerritoryReadPhase = 'signedOut' | 'loading' | 'failed' | 'empty' | 'ready';

/**
 * Décide la phase à partir des FAITS, pas des apparences. Pure et partagée pour
 * qu'aucun écran n'en réinvente une variante subtilement fausse.
 *
 * L'ORDRE DES TESTS EST LA RÈGLE :
 *   1. `signedOut` d'abord — mais il n'est jamais vrai tant que la session est
 *      en cours de restauration (l'appelant passe alors `sessionLoading`).
 *   2. `sessionLoading` ⇒ `loading`, avant tout le reste.
 *   3. `failed` avant le vide : une lecture ratée n'est PAS un vide.
 *   4. `rows === null` ⇒ `loading` : rien n'est encore su.
 *   5. et seulement là, `empty` vs `ready`.
 *
 * ⚠️ « ÉCHEC PARTIEL » N'EXISTE PAS. Deux lectures alimentent la carte (les
 * polygones et les cellules) ; si l'UNE échoue, la phase est `failed`. Peindre
 * la moitié qui a répondu montrerait moins de territoire qu'il n'y en a — une
 * sous-déclaration silencieuse, c'est-à-dire un mensonge. L'appelant OU les
 * deux, jamais l'un sans l'autre.
 */
export function territoryReadPhase(input: {
  readonly sessionLoading: boolean;
  readonly signedOut: boolean;
  readonly failed: boolean;
  readonly rows: readonly unknown[] | null;
}): TerritoryReadPhase {
  if (input.sessionLoading) return 'loading';
  if (input.signedOut) return 'signedOut';
  if (input.failed) return 'failed';
  if (input.rows === null) return 'loading';
  return input.rows.length === 0 ? 'empty' : 'ready';
}
