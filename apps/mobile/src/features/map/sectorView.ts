/**
 * GRYD — SECTEURS §C : la ligne de `sector_snapshot` → l'objet que la carte peint.
 *
 * ── POURQUOI CE MODULE EXISTE ────────────────────────────────────────────────
 * `sector_snapshot` (0037 + 0061) est calculé SERVEUR par le job `recompute_sectors`
 * (moteur PUR `engine/sectorSnapshot`) : propriétaire, rival principal, parts,
 * `pressure_score`, `status_level`, `contested`. Tout cela est VIEWER-INDÉPENDANT.
 * Ce qui ne PEUT PAS être pré-calculé, c'est le RÔLE : « mine / ally / rival /
 * neutral » n'existe que dans le contexte d'UN joueur (§C — « la couleur lit le
 * rôle dans MON contexte, jamais l'identité universelle d'un crew »). C'est
 * exactement, et uniquement, ce que ce module ajoute côté client.
 *
 * On NE RECALCULE RIEN d'autre : ni la pression, ni le statut, ni le plancher de
 * domination. Recalculer côté client ouvrirait la porte à deux vérités qui
 * divergent — le serveur reste seul juge (« tout claim est décidé serveur »).
 *
 * ── POURQUOI PAS `@klaim/engine` DIRECTEMENT ────────────────────────────────
 * Metro ne résout pas les imports Deno `.ts` de `@klaim/engine`, et l'importer
 * tirerait h3-js + tout le moteur dans le bundle (même constat que
 * `features/crew/rules.ts`, `features/daily/zoneFit.ts`, `features/route/walkability.ts`).
 * On réimplémente donc ICI la SEULE fonction dont le rendu a besoin —
 * `resolveRole` — et on importe les niveaux de statut depuis `@klaim/shared`
 * (source unique gelée). Aucun nombre magique de JEU n'est introduit.
 *
 * ── GÉOMÉTRIE ───────────────────────────────────────────────────────────────
 * `sectors.geojson` est NULL en base (discover_sectors n'écrit que
 * name/type/center_h3_res7/total_hexes). Le polygone est donc DÉRIVÉ du centre
 * H3 res 7 par `cellToBoundary` — h3-js est déjà une dépendance mobile, et le
 * contour d'une cellule H3 est une donnée EXACTE, pas une approximation
 * inventée : c'est littéralement le secteur. On ne demande aucun geojson au
 * serveur, et on ne fabrique aucune forme de repli.
 *
 * 100 % PUR et déterministe (aucun React, aucun réseau) → testable en Deno.
 */
import { cellToBoundary, cellToLatLng, getResolution, isValidCell } from 'h3-js';
import { SECTOR_H3_RESOLUTION, SECTOR_STATUS_LEVELS, type SectorStatusKey } from '@klaim/shared';
import type { LatLngPoint } from './basemap';
import { dbToH3 } from './territoryBuild';

// ═══════════════════════════════════════════════════════════════════════════
// IDENTITÉ D'UN DÉTENTEUR (crew OU joueur sans crew)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nature du détenteur d'un secteur (miroir de `sector_snapshot.owner_kind`,
 * colonne GÉNÉRÉE en base — jamais écrite à la main).
 *
 * `'user'` existe parce qu'un joueur SANS CREW tient de vrais hexes : avant
 * 0061 la matview `sector_control` le faisait disparaître (jointure sur les
 * membres de crew), et la carte déclarait « neutre » un secteur réellement
 * tenu. C'était un mensonge par effacement.
 */
export type SectorHolderKind = 'crew' | 'user';

/**
 * Rôle d'un détenteur DANS LE CONTEXTE du joueur — §C, couleur par RÔLE :
 * `mine` chartreuse · `ally` chartreuse secondaire · `rival` orange ·
 * `neutral` = aucun détenteur. Jamais une couleur par crew.
 */
export type SectorRole = 'mine' | 'ally' | 'rival' | 'neutral';

/**
 * Clé d'identité INTERNE d'un détenteur (`crew:<uuid>` / `user:<uuid>`), la
 * même convention que le moteur serveur. Elle n'est ni persistée ni affichée :
 * elle sert uniquement à comparer « est-ce moi ? » sans confondre un crew et un
 * joueur qui porteraient le même uuid.
 *
 * Retourne `null` dès qu'il manque le type OU l'identifiant — jamais une clé
 * bâtarde du genre `crew:null`, qui rendrait deux inconnus ÉGAUX (et ferait
 * peindre « c'est à toi » sur le territoire d'un autre).
 */
export function holderKey(
  kind: SectorHolderKind | null | undefined,
  id: string | null | undefined,
): string | null {
  if (!kind) return null;
  if (typeof id !== 'string' || id.length === 0) return null;
  return `${kind}:${id}`;
}

/**
 * Le joueur qui REGARDE la carte. `crewId` null = joueur sans crew : c'est un
 * état parfaitement normal (l'immense majorité des comptes aujourd'hui), pas
 * une donnée manquante.
 *
 * `resolved` dit si l'identité est CONNUE. Tant que la lecture du crew est en
 * vol ou a échoué, on ne sait pas si tel secteur est le mien : peindre
 * quand même reviendrait à afficher MON secteur en orange rival (ou l'inverse)
 * — une couleur fausse est un mensonge au même titre qu'un chiffre faux. Dans
 * ce cas `sectorViewsFor` ne rend RIEN plutôt que du faux.
 */
export interface SectorViewer {
  userId: string | null;
  crewId: string | null;
  resolved: boolean;
}

/**
 * Résout le rôle d'un détenteur pour un joueur donné. PURE.
 *
 *   holder null/absent                → neutral (aucun propriétaire retenu)
 *   holder === une de MES identités   → mine
 *   holder ∈ alliés                   → ally
 *   sinon                             → rival
 *
 * ⚠️ PALETTE « SANS VIEWER » (le piège que ce module ferme). Si le joueur n'a
 * ni crew ni identité connue, ses clés valent `null` : une comparaison naïve
 * `holder === mine` avec deux `null` renverrait `true` et la carte dirait
 * « c'est à toi » d'un secteur qui ne l'est pas. Les clés nulles sont donc
 * écartées AVANT toute comparaison — un visiteur sans crew n'hérite JAMAIS du
 * rôle du propriétaire ; il voit `rival` (le secteur appartient à quelqu'un
 * d'autre), ce qui est la vérité.
 */
export function resolveSectorRole(
  holder: string | null,
  viewerKeys: readonly (string | null)[],
  allyKeys: readonly string[] = [],
): SectorRole {
  if (!holder) return 'neutral';
  for (const key of viewerKeys) {
    if (key !== null && key === holder) return 'mine';
  }
  if (allyKeys.includes(holder)) return 'ally';
  return 'rival';
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUT (0-4) — lecture, jamais recalcul
// ═══════════════════════════════════════════════════════════════════════════

/** Niveau numérique → clé de statut §C. Table INVERSE de SECTOR_STATUS_LEVELS. */
const LEVEL_TO_KEY: ReadonlyMap<number, SectorStatusKey> = new Map(
  (Object.entries(SECTOR_STATUS_LEVELS) as [SectorStatusKey, number][]).map(
    ([key, level]) => [level, key],
  ),
);

/**
 * `status_level` (smallint 0-4, écrit par le serveur) → clé §C.
 * Un niveau hors plage (contrat cassé, colonne future) retombe sur `stable` :
 * le niveau le plus MUET. On ne devine pas une urgence à partir d'un nombre
 * qu'on ne comprend pas — inventer une alerte serait pire que n'en montrer aucune.
 */
export function statusKeyFromLevel(level: number): SectorStatusKey {
  return LEVEL_TO_KEY.get(Math.trunc(level)) ?? 'stable';
}

// ═══════════════════════════════════════════════════════════════════════════
// LIGNE BRUTE (miroir exact de la table) → VUE DE RENDU
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Une ligne de `sector_snapshot` jointe à son `sectors` — telle que la lit le
 * hook, déjà normalisée (nombres en fraction 0-1, H3 en hexadécimal).
 * Volontairement PLATE : pas de forme PostgREST imbriquée ici, pour que ce
 * module reste testable sans mimer le client Supabase.
 */
export interface SectorSnapshotRow {
  sectorId: string;
  /** Nom RÉEL du secteur (géocodage inverse serveur) — jamais inventé ici. */
  name: string;
  /** Cellule H3 res 7 (hexadécimal) : le centre ET la forme du secteur. */
  centerH3: string;
  ownerKind: SectorHolderKind | null;
  ownerCrewId: string | null;
  ownerUserId: string | null;
  ownerPercent: number;
  rivalKind: SectorHolderKind | null;
  rivalCrewId: string | null;
  rivalUserId: string | null;
  rivalPercent: number;
  neutralPercent: number;
  pressure: number;
  statusLevel: number;
  contested: boolean;
}

/**
 * Secteur PRÊT À PEINDRE. Miroir de `SectorView` (engine/sectors) + ce que le
 * rendu réclame en plus : la géométrie et le fait qu'un détenteur existe.
 */
export interface RealSectorView {
  id: string;
  /** Nom réel du secteur — porté pour le tap/l'accessibilité, jamais peint au dézoom (§9). */
  name: string;
  center: LatLngPoint;
  /** Contour EXACT de la cellule H3 res 7, format GeoJSON [lng, lat], anneau fermé. */
  ring: readonly (readonly [number, number])[];
  ownerRole: SectorRole;
  rivalRole: SectorRole;
  /**
   * Part du PROPRIÉTAIRE (0-1) — quel qu'il soit. Distinct de `minePercent` :
   * c'est le chiffre qui répond « ce secteur est tenu à combien ? ».
   */
  ownerPercent: number;
  /** Ma part : celle du propriétaire SI c'est moi, sinon 0 (§C deriveSectorView). */
  minePercent: number;
  rivalPercent: number;
  neutralPercent: number;
  pressure: number;
  contested: boolean;
  status: { level: number; key: SectorStatusKey };
  /**
   * Un détenteur RÉEL existe au-dessus du plancher de domination
   * (`SECTOR_CONTROL_THRESHOLDS.implantation`, appliqué SERVEUR par le moteur).
   * `false` = secteur NEUTRE — un état réel et attendu, pas une panne.
   */
  held: boolean;
}

/** Borne une fraction dans [0;1] (primitive numérique — pas une règle de jeu). */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Contour d'un secteur depuis sa cellule H3 res 7, ou `null` si la cellule
 * n'est pas exploitable.
 *
 * TROIS refus explicites, tous des refus de MENTIR :
 *  · cellule invalide → aucune forme (typiquement une perte de précision : un
 *    index H3 res 7 dépasse 2^53, donc un bigint rendu en JSON *nombre* serait
 *    ARRONDI — il faut le lire en texte. Un index arrondi désigne une AUTRE
 *    cellule, c'est-à-dire un secteur peint au mauvais endroit) ;
 *  · résolution ≠ SECTOR_H3_RESOLUTION → ce n'est pas un secteur ;
 *  · contour dégénéré (< 3 sommets) → rien à peindre.
 * Dans les trois cas le secteur est simplement OMIS de la carte.
 */
export function sectorRing(centerH3: string): readonly (readonly [number, number])[] | null {
  if (typeof centerH3 !== 'string' || centerH3.length === 0) return null;
  if (!isValidCell(centerH3)) return null;
  if (getResolution(centerH3) !== SECTOR_H3_RESOLUTION) return null;
  // cellToBoundary(_, true) → format GeoJSON [lng, lat], boucle fermée.
  const boundary = cellToBoundary(centerH3, true) as [number, number][];
  if (boundary.length < 3) return null;
  const first = boundary[0];
  const last = boundary[boundary.length - 1];
  if (!first || !last) return null;
  // Défensif : on ne suppose pas la fermeture, on la garantit.
  if (first[0] !== last[0] || first[1] !== last[1]) return [...boundary, first];
  return boundary;
}

/**
 * `SectorSnapshotRow` → `RealSectorView` pour UN joueur, ou `null` si le
 * secteur n'a pas de géométrie exploitable (cf. `sectorRing`).
 */
export function sectorViewFor(
  row: SectorSnapshotRow,
  viewer: SectorViewer,
  allyKeys: readonly string[] = [],
): RealSectorView | null {
  const ring = sectorRing(row.centerH3);
  if (!ring) return null;

  const viewerKeys = [
    holderKey('crew', viewer.crewId),
    holderKey('user', viewer.userId),
  ];
  const owner = holderKey(row.ownerKind, row.ownerKind === 'crew' ? row.ownerCrewId : row.ownerUserId);
  const rival = holderKey(row.rivalKind, row.rivalKind === 'crew' ? row.rivalCrewId : row.rivalUserId);

  const ownerRole = resolveSectorRole(owner, viewerKeys, allyKeys);
  const rivalRole = resolveSectorRole(rival, viewerKeys, allyKeys);

  const ownerPercent = clamp01(row.ownerPercent);
  const [lat, lng] = cellToLatLng(row.centerH3);

  return {
    id: row.sectorId,
    name: row.name,
    center: { lat, lng },
    ring,
    ownerRole,
    rivalRole,
    ownerPercent,
    // §C deriveSectorView : « ma part » n'est la part du propriétaire que si je
    // SUIS ce propriétaire. Un allié qui tient le secteur ne me le fait pas tenir.
    minePercent: ownerRole === 'mine' ? ownerPercent : 0,
    rivalPercent: rivalRole === 'rival' ? clamp01(row.rivalPercent) : 0,
    neutralPercent: clamp01(row.neutralPercent),
    pressure: Number.isFinite(row.pressure) ? row.pressure : 0,
    contested: row.contested === true,
    status: {
      level: Math.trunc(row.statusLevel),
      key: statusKeyFromLevel(row.statusLevel),
    },
    // Un secteur est TENU dès qu'un propriétaire a passé le plancher serveur —
    // que ce soit un crew OU un joueur solo (0061). Plus jamais « neutre » pour
    // cause d'absence de crew.
    held: owner !== null,
  };
}

/**
 * Toutes les vues à peindre, dans un ORDRE DÉTERMINISTE (statut décroissant
 * puis id) : le secteur le plus chaud est peint en dernier, donc AU-DESSUS
 * (priorité d'alerte §C), et deux rendus successifs des mêmes données donnent
 * exactement la même carte.
 *
 * Deux filtres, tous deux au service de « la carte ne dit que ce qu'elle sait » :
 *  · viewer NON RÉSOLU → tableau VIDE. On ne peint pas des rôles qu'on ne
 *    connaît pas encore ; l'appelant traite ce cas comme une lecture EN COURS.
 *  · secteur NEUTRE ET STABLE → omis. Rien à en dire : aucun détenteur, aucune
 *    pression. Le peindre serait dessiner du vide (et, à 0 capture, couvrir la
 *    ville entière d'hexagones gris qui n'annoncent RIEN).
 */
export function sectorViewsFor(
  rows: readonly SectorSnapshotRow[],
  viewer: SectorViewer,
  allyKeys: readonly string[] = [],
): RealSectorView[] {
  if (!viewer.resolved) return [];
  const out: RealSectorView[] = [];
  for (const row of rows) {
    const view = sectorViewFor(row, viewer, allyKeys);
    if (!view) continue;
    if (!view.held && view.status.level <= SECTOR_STATUS_LEVELS.stable) continue;
    out.push(view);
  }
  out.sort((a, b) =>
    a.status.level !== b.status.level
      ? a.status.level - b.status.level
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0,
  );
  return out;
}

/**
 * Rôle qui porte la COULEUR d'un secteur (§C — chartreuse=moi, orange=rival,
 * violet=contesté). Le contesté PRIME : c'est l'information la plus actionnable
 * (« ça bascule ici »), et elle ne dépend d'aucune identité de crew.
 */
export function sectorPaintRole(view: RealSectorView): SectorRole | 'contested' {
  if (view.contested || view.status.level >= SECTOR_STATUS_LEVELS.contestee) return 'contested';
  return view.ownerRole;
}

// ═══════════════════════════════════════════════════════════════════════════
// LECTURE BRUTE (PostgREST) → LIGNE NORMALISÉE
// La frontière EXACTE entre « ce que la base a dit » et « ce que la carte
// peint ». PURE et vivant ICI (et non dans le hook) pour la même raison que
// `territoryBuild` vit hors de `hexClaims` : le hook porte le réseau et l'état
// React, la logique se teste en Deno sans mocker Supabase.
// ═══════════════════════════════════════════════════════════════════════════

/** Lecture défensive d'une fraction 0-1 (numeric PostgREST → number | string). */
function toFraction(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Lecture défensive d'un entier (smallint). Hors contrat → 0 (le niveau le plus muet). */
function toInt(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** `owner_kind` / `top_rival_kind` (colonnes générées) → union typée, ou null. */
function toKind(raw: unknown): SectorHolderKind | null {
  return raw === 'crew' || raw === 'user' ? raw : null;
}

export function toId(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/**
 * Deux lignes brutes (snapshot + secteur) → `SectorSnapshotRow`, ou `null` si
 * l'appariement est impossible. PURE et exportée pour les tests : c'est la
 * frontière exacte entre « ce que la base a dit » et « ce que la carte peint ».
 */
export function parseSectorRow(
  snapshot: Record<string, unknown>,
  place: { name: unknown; centerH3: unknown } | undefined,
): SectorSnapshotRow | null {
  const sectorId = toId(snapshot.sector_id);
  if (!sectorId || !place) return null;
  // Sans nom NI centre H3, il n'y a ni géométrie ni étiquette : on n'invente
  // aucune des deux, le secteur est simplement omis.
  const name = typeof place.name === 'string' ? place.name : null;
  const rawH3 = place.centerH3;
  if (name === null || (typeof rawH3 !== 'string' && typeof rawH3 !== 'number')) return null;
  let centerH3: string;
  try {
    centerH3 = dbToH3(rawH3);
  } catch {
    return null;
  }

  return {
    sectorId,
    name,
    centerH3,
    ownerKind: toKind(snapshot.owner_kind),
    ownerCrewId: toId(snapshot.owner_crew_id),
    ownerUserId: toId(snapshot.owner_user_id),
    ownerPercent: toFraction(snapshot.owner_percent),
    rivalKind: toKind(snapshot.top_rival_kind),
    rivalCrewId: toId(snapshot.top_rival_crew_id),
    rivalUserId: toId(snapshot.top_rival_user_id),
    rivalPercent: toFraction(snapshot.top_rival_percent),
    neutralPercent: toFraction(snapshot.neutral_percent),
    pressure: toInt(snapshot.pressure_score),
    statusLevel: toInt(snapshot.status_level),
    contested: snapshot.contested === true,
  };
}

/**
 * Apparie les lignes de `sector_snapshot` avec leurs `sectors`. PURE, exportée
 * pour les tests. Un snapshot orphelin (secteur illisible/supprimé) est OMIS :
 * on ne peint pas un secteur dont on ignore la position.
 */
export function joinSectorRows(
  snapshots: readonly Record<string, unknown>[],
  places: readonly Record<string, unknown>[],
): SectorSnapshotRow[] {
  const byId = new Map<string, { name: unknown; centerH3: unknown }>();
  for (const p of places) {
    const id = toId(p.id);
    if (id) byId.set(id, { name: p.name, centerH3: p.center_h3 });
  }
  const out: SectorSnapshotRow[] = [];
  for (const s of snapshots) {
    const parsed = parseSectorRow(s, byId.get(toId(s.sector_id) ?? ''));
    if (parsed) out.push(parsed);
  }
  return out;
}
