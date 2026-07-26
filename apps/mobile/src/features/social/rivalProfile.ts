/**
 * GRYD — E26 « Profil rival · vue publique » : LE MOTEUR de la relation, et la
 * porte d'honnêteté du screen. PUR (zéro import RN / réseau) : testable en Deno,
 * et surtout INCAPABLE de fabriquer un rival — il ne fait que dériver des FAITS
 * qu'on lui donne.
 *
 * ══ POURQUOI CE MODULE N'INVENTE JAMAIS « NINA M. » ═══════════════════════════
 * La planche E26 montre un rival concret (Nina M., Saint-Rémy, #2 quartier). Le
 * réflexe fautif serait de coder ces valeurs pour « reproduire la planche ». Or
 * lire le profil et le territoire d'UN AUTRE joueur suppose des lectures
 * cross-utilisateur CONSENTIES (public_profiles + faits territoriaux publics
 * gouvernés par la confidentialité E25). Ce chemin n'est pas encore câblé
 * (point ouvert O1 : identité d'un rival consenti + lecture publique de son
 * territoire). Tant qu'il manque, il n'existe AUCUN rival réel à montrer — et un
 * rival d'illustration serait exactement la donnée fabriquée que la constitution
 * interdit. Ce module ne connaît donc aucun nom : il reçoit des faits ou décide
 * que le profil est INDISPONIBLE.
 *
 * Deux responsabilités, deux fonctions pures :
 *  1. `deriveRivalry` — le DIFFÉRENCIATEUR de la planche : « Votre rivalité »,
 *     c'est-à-dire la relation territoriale entre lui et moi, calculée de faits
 *     PUBLICS (secteurs tenus / contestés / repris, crew commun). Aucune donnée
 *     de course privée, aucune position live.
 *  2. `resolveRivalProfileState` — la porte d'honnêteté : selon ce que les
 *     sources consenties ont réellement rendu, l'écran est `full` / `restricted`
 *     (identité réduite E25) / `unavailable`. Encode les états distincts au lieu
 *     de les confondre.
 *
 * ANTI-FUITE : on ne raisonne que sur des IDENTIFIANTS DE SECTEUR (agrégat façon
 * quartier), jamais sur des hexes de course ni des coordonnées — la planche dit
 * « contours généralisés », pas la trace. Le module n'a d'ailleurs pas de quoi
 * révéler une position : on ne lui passe que des ensembles de secteurs.
 */

/** Identifiant opaque d'un secteur (agrégat de territoire, façon quartier). */
export type SectorId = string;

/**
 * Faits territoriaux PUBLICS d'un joueur — ce qu'une vue publique consentie peut
 * légitimement exposer. Jamais de trace de course, jamais de position live.
 */
export interface PublicTerritoryFacts {
  /** Secteurs qu'il tient publiquement. */
  readonly ownedSectorIds: readonly SectorId[];
  /** Secteurs qu'il tient mais qui sont sous pression (contestés). */
  readonly contestedSectorIds: readonly SectorId[];
}

/** Mes propres faits territoriaux, nécessaires pour situer la relation. */
export interface MyTerritoryContext {
  readonly ownedSectorIds: readonly SectorId[];
  readonly contestedSectorIds: readonly SectorId[];
  /** Secteurs que je TENAIS et ne tiens plus (« mon ancienne zone »). */
  readonly formerSectorIds: readonly SectorId[];
}

/**
 * Nature de la relation. `teammate` : même crew → la planche remplace le bloc
 * « rivalité » par un bloc « coopération ». `none` : aucun historique commun →
 * la planche N'AFFICHE PAS de bloc (« pas de vide »).
 */
export type RivalryKind = 'rivalry' | 'teammate' | 'none';

export interface RivalryRelation {
  readonly kind: RivalryKind;
  /** Mes secteurs qui touchent l'un des siens : la frontière commune. */
  readonly sharedBorderSectorIds: readonly SectorId[];
  /** Secteurs que je tenais et qu'il tient désormais (« votre ancienne zone »). */
  readonly reclaimedFromMeSectorIds: readonly SectorId[];
  /** Secteurs en litige entre nous (contesté chez l'un, tenu chez l'autre). */
  readonly contestedBetweenUsSectorIds: readonly SectorId[];
}

/** Ensemble trié + dédupliqué (sortie stable → copie et tests déterministes). */
function sortedUnique(ids: Iterable<SectorId>): SectorId[] {
  return [...new Set(ids)].sort();
}

/**
 * Calcule la relation territoriale entre MOI et un rival à partir de faits
 * publics. `adjacent(a, b)` est le graphe d'adjacence des secteurs (fourni par
 * l'appelant — H3/voisinage réel), gardé INJECTÉ pour que ce module reste pur et
 * testable sans dépendre d'une lib de géométrie.
 *
 * Règles :
 *  · repris = ce qu'il tient ET que je tenais avant (mes anciens secteurs) ;
 *  · contesté entre nous = un secteur contesté chez l'un et tenu par l'autre ;
 *  · frontière commune = mes secteurs adjacents à au moins un des siens ;
 *  · même crew → `teammate` (jamais « rival ») ; sinon, une relation existe si
 *    l'une des trois listes est non vide, autrement `none` (aucun historique).
 *
 * Un secteur ne peut appartenir qu'à un seul propriétaire à la fois : les
 * intersections « tenu ∩ tenu » n'ont pas de sens et ne sont pas calculées.
 */
export function deriveRivalry(
  mine: MyTerritoryContext,
  theirs: PublicTerritoryFacts,
  opts: { readonly sameCrew: boolean; readonly adjacent: (a: SectorId, b: SectorId) => boolean },
): RivalryRelation {
  const mineOwned = new Set(mine.ownedSectorIds);
  const mineFormer = new Set(mine.formerSectorIds);
  const mineContested = new Set(mine.contestedSectorIds);
  const theirsOwned = new Set(theirs.ownedSectorIds);
  const theirsContested = new Set(theirs.contestedSectorIds);

  // Ce qu'il tient et que je tenais → « il tient votre ancienne zone ».
  const reclaimed = sortedUnique(
    [...theirsOwned].filter((s) => mineFormer.has(s)),
  );

  // Litige de frontière : contesté chez l'un, tenu chez l'autre.
  const contestedBetweenUs = sortedUnique([
    ...[...mineOwned].filter((s) => theirsContested.has(s)),
    ...[...theirsOwned].filter((s) => mineContested.has(s)),
  ]);

  // Frontière commune : mes secteurs adjacents à au moins un des siens.
  const theirsOwnedList = [...theirsOwned];
  const sharedBorder = sortedUnique(
    [...mineOwned].filter((m) => theirsOwnedList.some((tSec) => opts.adjacent(m, tSec))),
  );

  const hasHistory =
    reclaimed.length > 0 || contestedBetweenUs.length > 0 || sharedBorder.length > 0;
  const kind: RivalryKind = opts.sameCrew ? 'teammate' : hasHistory ? 'rivalry' : 'none';

  return {
    kind,
    sharedBorderSectorIds: sharedBorder,
    reclaimedFromMeSectorIds: reclaimed,
    contestedBetweenUsSectorIds: contestedBetweenUs,
  };
}

/**
 * Résumé prêt pour la copie « Votre rivalité ». Discriminé : l'écran choisit le
 * bloc (rivalité / coopération / absent) sans reconstruire la logique.
 * `leadReclaimed` porte le PREMIER secteur repris, pour « votre ancienne zone {X} »
 * sans lister toute la frontière.
 */
export type RivalryHeadline =
  | { readonly kind: 'none' }
  | { readonly kind: 'teammate' }
  | {
      readonly kind: 'rivalry';
      readonly reclaimedCount: number;
      readonly sharedBorderCount: number;
      readonly contestedCount: number;
      readonly leadReclaimed: SectorId | null;
    };

export function rivalryHeadline(rel: RivalryRelation): RivalryHeadline {
  if (rel.kind === 'teammate') return { kind: 'teammate' };
  if (rel.kind === 'none') return { kind: 'none' };
  return {
    kind: 'rivalry',
    reclaimedCount: rel.reclaimedFromMeSectorIds.length,
    sharedBorderCount: rel.sharedBorderSectorIds.length,
    contestedCount: rel.contestedBetweenUsSectorIds.length,
    leadReclaimed: rel.reclaimedFromMeSectorIds[0] ?? null,
  };
}

/**
 * Ce que les sources publiques CONSENTIES ont réellement rendu pour ce rival.
 * `identity` :
 *  · `public`     — public_profiles lisible ET visibilité E25 = public ;
 *  · `restricted` — visibilité E25 réduite (« Un coureur de NIGHT RUNNERS »),
 *                   stats et carte masquées ;
 *  · `none`       — aucune source consentie n'a pu être atteinte (c'est l'état
 *                   d'aujourd'hui : O1 non levé, aucun chemin cross-utilisateur).
 */
export interface RivalSources {
  readonly identity: 'public' | 'restricted' | 'none';
  /** Le territoire public consenti a-t-il pu être lu (contours généralisés) ? */
  readonly territoryAvailable: boolean;
}

/**
 * État d'affichage HONNÊTE du profil rival — quatre mondes distincts, jamais
 * confondus (constitution : pas connecté / réduit / complet / indisponible) :
 *  · `unavailable` — rien de consenti à montrer → « profil indisponible » (pas un
 *    faux profil). C'est ce que renvoie l'écran aujourd'hui (O1).
 *  · `restricted`  — identité réduite E25 : on montre l'appartenance crew, pas
 *    les stats ni la carte précise.
 *  · `full`        — profil public complet consenti.
 */
export type RivalProfileState =
  | { readonly status: 'unavailable' }
  | { readonly status: 'restricted' }
  | { readonly status: 'full' };

export function resolveRivalProfileState(sources: RivalSources): RivalProfileState {
  // Aucune identité consentie atteinte → indisponible. On NE prétend pas à un
  // profil (ni réduit, ni complet) qu'aucune source n'a peuplé.
  if (sources.identity === 'none') return { status: 'unavailable' };
  // Identité réduite E25 : profil restreint, quoi que dise le territoire.
  if (sources.identity === 'restricted') return { status: 'restricted' };
  // Identité publique mais territoire non lu : on ne peut pas afficher le profil
  // COMPLET (carte + rivalité manqueraient) — on reste au profil restreint plutôt
  // que de peindre des blocs vides comme s'ils étaient consentis-mais-absents.
  if (!sources.territoryAvailable) return { status: 'restricted' };
  return { status: 'full' };
}
