/**
 * GRYD — engine/sectorSnapshot.ts : PRÉ-CALCUL par SECTEUR (§C, AMENDEMENT-41 §2).
 *
 * La source d'agrégation (vue `sector_holdings`, 0061) donne, par (secteur,
 * détenteur), le % d'hexes tenus. Ce module ROULE ces lignes en UN snapshot par
 * secteur, VIEWER-INDÉPENDANT : propriétaire majoritaire + rival principal +
 * parts + `pressure_score` + statut 5 niveaux. Le serveur stocke ce snapshot ; le
 * CLIENT y applique ensuite son rôle (moi/rival) via `deriveSectorView` avec les
 * mêmes % — un seul moteur, deux bouts.
 *
 * PURE + déterministe (testable Deno). Réutilise `deriveSectorView` (pression /
 * contesté / statut déjà gelés §C) en prenant le PROPRIÉTAIRE comme « moi » : la
 * tension owner↔rival ne dépend pas de qui regarde.
 *
 * ─── DEUX RÈGLES D'HONNÊTETÉ, GRAVÉES ICI ───────────────────────────────────
 * 1. PLANCHER DE DOMINATION. Un secteur res-7 vaut ~343 hexes res-10 ; une
 *    course de 10 km en couvre une poignée. Déclarer « détenu par X » à 1 hex
 *    sur 343 serait une domination FABRIQUÉE. On ne retient donc un
 *    propriétaire (et un rival) que sur `SECTOR_CONTROL_THRESHOLDS.implantation`
 *    — le premier palier de contrôle DÉJÀ gelé en game-rules, aucune constante
 *    inventée ici. Sous ce plancher, la part bascule en NEUTRE : le secteur se
 *    déclare libre, ce qui est la vérité à l'échelle du secteur (les hexes,
 *    eux, restent visibles et attribués à leur échelle).
 * 2. LE JOUEUR SANS CREW EXISTE. Historiquement l'agrégat ne joignait que les
 *    membres de crew : un solo qui tenait un secteur produisait owner = null /
 *    neutre = 100 %, et la carte annonçait « neutre » d'un secteur RÉELLEMENT
 *    tenu. Un détenteur est donc désormais un crew OU un joueur (`ownerKind`).
 */
import { SECTOR_CONTROL_THRESHOLDS } from '@klaim/shared/game-rules';
import { deriveSectorView, type AggregatedSector } from './sectors.ts';

/**
 * Nature d'un détenteur de secteur : un crew, ou un joueur SANS crew (qui tient
 * son terrain en son nom propre — il n'est pas « du neutre »).
 */
export type SectorHolderKind = 'crew' | 'user';

/**
 * Une ligne d'agrégat de contrôle : UN détenteur et sa part du secteur (0-1).
 * `crewId` renseigné → détenteur de type crew ; sinon `userId` → joueur solo.
 * Une ligne sans aucun identifiant est IGNORÉE (jamais un owner fantôme).
 */
export interface SectorControlRow {
  /** Crew détenteur, ou null/absent si le détenteur est un joueur sans crew. */
  crewId?: string | null;
  /** Joueur détenteur SANS crew (`crew_id is null` dans la source). */
  userId?: string | null;
  /** control_percent (fraction 0-1). */
  controlPercent: number;
}

/** Signaux d'activité récente d'un secteur (0 si non encore câblés — honnête). */
export interface SectorActivity {
  rivalActivityRecent?: number;
  zonesLostRecent?: number;
  rivalReclaimed24h?: number;
  decayFraction?: number;
  lastAttackAt?: Date | null;
}

/** Roulé owner / rival / neutre d'un secteur (parts 0-1). */
export interface SectorRollup {
  /** 'crew' | 'user' | null (secteur sans propriétaire retenu). */
  ownerKind: SectorHolderKind | null;
  /** Identifiant du propriétaire, quel que soit son type (null si aucun). */
  ownerId: string | null;
  /** Crew propriétaire — null si le propriétaire est un joueur solo. */
  ownerCrewId: string | null;
  /** Joueur propriétaire sans crew — null si le propriétaire est un crew. */
  ownerUserId: string | null;
  ownerPercent: number;
  topRivalKind: SectorHolderKind | null;
  topRivalId: string | null;
  topRivalCrewId: string | null;
  topRivalUserId: string | null;
  topRivalPercent: number;
  neutralPercent: number;
}

/** Snapshot §C complet d'un secteur (viewer-indépendant), prêt à stocker. */
export interface SectorSnapshot extends SectorRollup {
  /** 0-100. */
  pressureScore: number;
  /** 0 stable · 1 pression · 2 contestée · 3 attaque · 4 urgence. */
  statusLevel: number;
  statusKey: string;
  contested: boolean;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Plancher de domination : part minimale pour être DÉCLARÉ propriétaire (ou
 * rival) d'un secteur. C'est le premier palier de contrôle de game-rules
 * (`implantation`) — pas une constante locale. En dessous, on ne tient pas un
 * secteur : on y a juste couru.
 */
const OWNER_MIN_SHARE = SECTOR_CONTROL_THRESHOLDS.implantation;

/** Détenteur normalisé (type + identité + part), interne au rollup. */
interface Holder {
  kind: SectorHolderKind;
  id: string;
  percent: number;
}

/** Normalise une ligne d'agrégat ; null si elle ne désigne aucun détenteur. */
function toHolder(row: SectorControlRow): Holder | null {
  const percent = clamp01(row.controlPercent);
  if (row.crewId) return { kind: 'crew', id: row.crewId, percent };
  if (row.userId) return { kind: 'user', id: row.userId, percent };
  return null;
}

/**
 * Roule les lignes (détenteur, control%) d'UN secteur en propriétaire
 * majoritaire + rival principal + neutre.
 *
 *   • Seules les parts ≥ plancher de domination sont RETENUES : sous le
 *     plancher, la part rejoint le NEUTRE (pas de domination fabriquée).
 *   • Le neutre = 1 − Σ des parts retenues (borné [0;1]).
 *   • À égalité de part, l'ordre est tranché par identifiant : le propriétaire
 *     d'un secteur parfaitement partagé ne doit pas CHANGER à chaque passage du
 *     job (une carte qui clignote sans qu'aucune course n'ait eu lieu ment).
 * PURE.
 */
export function rollupSectorControl(rows: readonly SectorControlRow[]): SectorRollup {
  const held = rows
    .map(toHolder)
    .filter((h): h is Holder => h !== null && h.percent >= OWNER_MIN_SHARE)
    .sort((a, b) => b.percent - a.percent || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const owner = held[0];
  const rival = held[1];
  const totalHeld = held.reduce((s, h) => s + h.percent, 0);
  return {
    ownerKind: owner?.kind ?? null,
    ownerId: owner?.id ?? null,
    ownerCrewId: owner?.kind === 'crew' ? owner.id : null,
    ownerUserId: owner?.kind === 'user' ? owner.id : null,
    ownerPercent: owner?.percent ?? 0,
    topRivalKind: rival?.kind ?? null,
    topRivalId: rival?.id ?? null,
    topRivalCrewId: rival?.kind === 'crew' ? rival.id : null,
    topRivalUserId: rival?.kind === 'user' ? rival.id : null,
    topRivalPercent: rival?.percent ?? 0,
    neutralPercent: clamp01(1 - Math.min(1, totalHeld)),
  };
}

/**
 * Clé d'identité d'un détenteur, tous types confondus. Sert UNIQUEMENT à faire
 * tourner le moteur §C (qui compare des identités opaques) sur des détenteurs
 * hétérogènes : sans elle, un secteur tenu par un solo repasserait « neutre »
 * dans le calcul de pression. Jamais persistée, jamais affichée.
 */
function holderKey(kind: SectorHolderKind | null, id: string | null): string | null {
  return kind && id ? `${kind}:${id}` : null;
}

/**
 * Snapshot §C d'un secteur à partir de ses lignes d'agrégat + activité.
 * On calcule la pression / le contesté / le statut « du point de vue du
 * PROPRIÉTAIRE » (owner = « moi ») → chiffres viewer-indépendants que le client
 * réinterprète ensuite selon SON crew. PURE.
 */
export function computeSectorSnapshot(
  rows: readonly SectorControlRow[],
  activity: SectorActivity = {},
  now: Date = new Date(),
): SectorSnapshot {
  const rollup = rollupSectorControl(rows);
  const ownerKey = holderKey(rollup.ownerKind, rollup.ownerId);
  const agg: AggregatedSector = {
    id: '',
    ownerCrewId: ownerKey,
    topRivalCrewId: holderKey(rollup.topRivalKind, rollup.topRivalId),
    ownerPercent: rollup.ownerPercent,
    topRivalPercent: rollup.topRivalPercent,
    neutralPercent: rollup.neutralPercent,
    rivalActivityRecent: activity.rivalActivityRecent ?? 0,
    zonesLostRecent: activity.zonesLostRecent ?? 0,
    rivalReclaimed24h: activity.rivalReclaimed24h ?? 0,
    decayFraction: activity.decayFraction ?? 0,
    lastAttackAt: activity.lastAttackAt ?? null,
  };
  // owner = « moi » → pression/statut mesurent la tension owner↔rival, pas un viewer.
  const view = deriveSectorView(agg, ownerKey, [], now);
  return {
    ...rollup,
    pressureScore: view.pressure,
    statusLevel: view.status.level,
    statusKey: view.status.key,
    contested: view.contested,
  };
}
