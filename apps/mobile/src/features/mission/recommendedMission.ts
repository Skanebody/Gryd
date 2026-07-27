/**
 * GRYD — E16 « MISSION RECOMMANDÉE » (`/map/missions/:missionId`, spec produit
 * l.1009) : tout ce que l'écran a le DROIT d'affirmer, en PUR.
 *
 * Zéro import React, zéro réseau, zéro horloge interne (`now` est injecté) →
 * testé en Deno. L'écran ne fait que peindre ce que ce module décide.
 *
 * ─── LE POINT CRITIQUE : « LA RAISON » ──────────────────────────────────────
 * La spec exige que la mission dise POURQUOI elle est recommandée. Une raison
 * sans fait derrière serait un mensonge de plus haut niveau qu'un chiffre
 * fabriqué : elle prétend expliquer. Les trois seules raisons émises ici sont
 * donc DÉRIVÉES de faits que le dépôt possède réellement :
 *   · `expiring` — `hex_claims.decay_at` d'UNE DE MES zones tombe dans la
 *      fenêtre `MISSION_DEFEND_WINDOW_H` (fait serveur, lu tel quel) ;
 *   · `closest`  — j'ai PLUSIEURS zones et un fix GPS réel : le moteur
 *      (`deriveRealMission`) a choisi la plus proche, c'est littéralement la
 *      raison du choix ;
 *   · `adjacent` — la cible borde ce que je tiens déjà (l'ancre EST une de mes
 *      zones), vrai même sans position.
 * Il n'y a délibérément AUCUNE raison du genre « un rival s'approche » ou
 * « cette zone est libre » : rien dans le dépôt ne lit les claims des autres
 * pour cet écran. Quand aucun fait ne permet de recommander (base vide, joueur
 * neuf, `first_capture`), la vue vaut `empty` : E16 ne tire JAMAIS une mission
 * au hasard pour avoir l'air vivant.
 *
 * ─── POURQUOI UN DIGEST, ET PAS DES COORDONNÉES, DANS L'URL ─────────────────
 * `missionId` doit identifier LA mission ouverte pour pouvoir dire, plus tard,
 * qu'elle est devenue impossible. La tentation était d'y écrire l'ancre
 * (`defend.48.86712.2.36410`). Refusé : §12 (confidentialité géospatiale) et la
 * règle « jamais de donnée sensible dans une URL » s'appliquent à une adresse
 * que le navigateur affiche, que l'historique garde et qu'un partage recopie —
 * même quand la position est celle de MA propre zone. La clé est donc un DIGEST
 * opaque (`missionDigest`), et la reconnaissance se fait dans l'autre sens : on
 * re-dérive mes zones et on cherche celle dont le digest correspond. Aucune
 * coordonnée ne quitte la mémoire de l'app.
 */
import { MISSION_DEFEND_WINDOW_H, RUN_MAX_DISTANCE_M } from '@klaim/shared';
import {
  haversineDistanceM,
  territoryCentroid,
  type MissionPoint,
  type MissionTerritoryInput,
  type RealMission,
} from './deriveMission';

const MS_PER_HOUR = 3_600_000;

/**
 * PORTÉE d'une mission : au-delà, la cible n'est plus atteignable dans UNE
 * sortie, donc la recommandation ne parle plus de l'endroit où l'on est.
 *
 * DÉRIVÉE, jamais choisie : la moitié de la distance maximale qu'une sortie
 * peut avoir (`RUN_MAX_DISTANCE_M`, game-rules). Une boucle qui va toucher la
 * cible et revient parcourt au moins deux fois cette distance — au-delà, aucune
 * sortie valide ne peut l'atteindre. Aucun nombre magique n'est introduit ici.
 */
export const MISSION_REACH_M = RUN_MAX_DISTANCE_M / 2;

/** Les deux missions qui ont une CIBLE (donc une identité d'URL). */
export type MissionKind = 'defend' | 'expand';

/** La mission telle que l'URL la porte : un genre + un digest opaque. */
export interface OpenedMission {
  kind: MissionKind;
  digest: string;
}

/**
 * Digest d'IDENTITÉ d'une ancre (FNV-1a 32 bits sur l'ancre arrondie à 5
 * décimales, rendu en base 36). Ce n'est PAS une empreinte cryptographique et
 * ça ne prétend pas l'être : son seul rôle est de reconnaître « la même zone »
 * d'un écran à l'autre sans écrire de coordonnées nulle part. Déterministe et
 * stable entre deux lancements — c'est ce qui permet à un lien profond rouvert
 * à froid de retrouver sa cible.
 *
 * L'arrondi à 5 décimales (~1,1 m) est celui de la chaîne hachée, pas une
 * tolérance : deux ancres distinctes de plus d'un mètre donnent deux digests
 * différents. Les centres de cellules H3 res 10 sont espacés d'une centaine de
 * mètres — aucune collision de voisinage possible.
 */
export function missionDigest(anchor: MissionPoint): string {
  const s = `${anchor.lat.toFixed(5)},${anchor.lng.toFixed(5)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    // FNV-1a : multiplication par 16777619 en arithmétique 32 bits non signée.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * L'identité d'URL d'une mission. `null` pour `first_capture` : elle n'a AUCUNE
 * cible (c'est « prends ta première zone, ici »), donc rien à identifier — et
 * lui fabriquer un id ferait croire à une cible qui n'existe pas.
 */
export function missionKey(mission: RealMission): string | null {
  if (mission.kind === 'first_capture') return null;
  const kind: MissionKind = mission.kind === 'defend_expiring' ? 'defend' : 'expand';
  return `${kind}-${missionDigest(mission.anchor)}`;
}

/** Lecture DÉFENSIVE d'un `missionId` d'URL. Tout ce qui n'est pas exactement
 *  `defend-<digest>` / `expand-<digest>` rend `null` — l'écran se comporte alors
 *  comme s'il avait été ouvert sans id (il montre la mission courante). */
export function parseMissionKey(raw: string | string[] | undefined | null): OpenedMission | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const dash = value.indexOf('-');
  if (dash <= 0) return null;
  const kind = value.slice(0, dash);
  const digest = value.slice(dash + 1);
  if (digest.length === 0) return null;
  if (kind !== 'defend' && kind !== 'expand') return null;
  return { kind, digest };
}

/** Les SEULES raisons que le dépôt sait prouver (cf. en-tête). */
export type MissionReason = 'expiring' | 'closest' | 'adjacent';

/**
 * POURQUOI cette mission-ci. `mineCount` = nombre de MES zones réellement lues :
 * il fait la différence entre « la plus proche » (un choix a eu lieu entre
 * plusieurs, sur une distance mesurée) et « elle borde ce que tu tiens » (il n'y
 * avait rien à départager). Dire « la plus proche » avec une seule zone serait
 * une raison vide de sens.
 *
 * `null` = aucune raison prouvable ⇒ aucune recommandation (`first_capture`).
 */
export function missionReason(mission: RealMission, mineCount: number): MissionReason | null {
  if (mission.kind === 'defend_expiring') return 'expiring';
  if (mission.kind === 'expand') {
    return mineCount > 1 && mission.distanceM !== null ? 'closest' : 'adjacent';
  }
  return null;
}

/**
 * Motifs d'extinction — vocabulaire FERMÉ, identique à `EVENTS.missionDropped`
 * (`packages/shared/src/events.ts`). Aucun motif ne s'émet sans preuve.
 */
export type MissionDropReason = 'taken' | 'expired' | 'out_of_range' | 'no_position';

export interface MissionDropContext {
  now: Date;
  /** Position RÉELLE au moment du recalcul (`null` = aucun fix). */
  ego: MissionPoint | null;
  /** MES zones fraîchement relues (la même source que le moteur de mission). */
  mine: readonly MissionTerritoryInput[];
}

/**
 * La mission ouverte est-elle devenue IMPOSSIBLE, et pourquoi ? `null` = elle
 * tient toujours (ou rien ne permet d'affirmer le contraire).
 *
 * Spec l.1009, mot pour mot : « Une mission devenue impossible disparaît
 * proprement avec explication. » Ce module produit l'explication ; il refuse
 * d'en produire une quand il n'a pas le fait.
 *
 * CE QU'IL NE DIT JAMAIS, ET C'EST LE POINT DÉLICAT : une zone qu'on vient de
 * REPARCOURIR voit son `decay_at` repoussé loin devant. La mission de défense
 * n'a plus lieu d'être — mais elle a été ACCOMPLIE, pas rendue impossible.
 * Aucun des quatre motifs ne dit ça, et en choisir un (« la fenêtre est passée,
 * ta zone s'est effacée ») serait annoncer une perte sur une réussite. On rend
 * donc `null` : l'écran affiche alors la mission COURANTE, qui est vraie.
 */
export function missionDropReason(
  opened: OpenedMission,
  ctx: MissionDropContext,
): MissionDropReason | null {
  const { now, ego, mine } = ctx;

  // La cible est cherchée PAR SON DIGEST parmi mes zones actuelles.
  let anchor: MissionPoint | null = null;
  let decayAt: Date | null = null;
  for (const t of mine) {
    const centroid = territoryCentroid(t.cells);
    if (centroid === null) continue;
    if (missionDigest(centroid) !== opened.digest) continue;
    anchor = centroid;
    decayAt = t.decayAt;
    break;
  }

  // Plus dans MES claims : la zone a changé de mains (ou s'est effacée puis a
  // été reprise). On ne prétend pas savoir laquelle des deux — `taken` dit le
  // seul fait observé : elle n'est plus à moi.
  if (anchor === null) return 'taken';

  if (opened.kind === 'defend') {
    // `decay_at` absent (zone protégée / valeur non servie) ou DÉJÀ échu : il
    // n'y a plus de fenêtre de défense à tenir.
    if (decayAt === null || decayAt.getTime() <= now.getTime()) return 'expired';
  }

  // Trop loin pour qu'UNE sortie touche la cible : la mission ne parle plus de
  // l'endroit où l'on est. Sans fix, on ne mesure rien, donc on n'affirme rien.
  if (ego !== null && haversineDistanceM(ego, anchor) > MISSION_REACH_M) return 'out_of_range';

  // La recommandation « la plus proche » reposait sur une position ET sur un
  // choix entre plusieurs zones. Position perdue + plusieurs zones = le fait qui
  // fondait CE choix n'existe plus. Avec une seule zone il n'y avait rien à
  // départager : la mission tient, et on ne fabrique pas une extinction.
  if (opened.kind === 'expand' && ego === null && mine.length > 1) return 'no_position';

  return null;
}

/** Où en est la LECTURE de la mission (les quatre états constitutionnels + le
 *  cas « pas de backend », qui n'est ni un vide ni un refus de connexion). */
export type MissionReadStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'failed'
  | 'signed-out'
  | 'unconfigured';

/** La mission telle que E16 la rend : jamais `first_capture` (aucune cible). */
export type TargetedMission = Extract<RealMission, { kind: 'defend_expiring' | 'expand' }>;

/** Ce que l'écran E16 a le droit de peindre — rien d'autre. */
export type RecommendedMissionView =
  | { kind: 'signed-out' }
  | { kind: 'loading' }
  /** `retryable: false` = aucune lecture n'est possible (backend absent) : on ne
   *  peint alors PAS de « Réessayer », qui échouerait toujours (bouton mort). */
  | { kind: 'failed'; retryable: boolean }
  | { kind: 'empty' }
  | { kind: 'dropped'; reason: MissionDropReason }
  | { kind: 'mission'; mission: TargetedMission; reason: MissionReason };

export interface RecommendedMissionInput extends MissionDropContext {
  status: MissionReadStatus;
  /** La mission RE-DÉRIVÉE maintenant (jamais celle de l'ouverture). */
  mission: RealMission | null;
  /** La mission portée par l'URL, ou `null` (écran ouvert sans id). */
  opened: OpenedMission | null;
}

/**
 * LA machine à états de E16 — une seule sortie, aucun état implicite.
 *
 * L'ORDRE EST LA GARANTIE. Les quatre états de la constitution (pas connecté /
 * lecture en cours / échec / vide) sont testés AVANT toute question de mission :
 * un `mission === null` pendant une lecture ne doit jamais se lire « aucune
 * mission », et un échec ne doit jamais se déguiser en vide. C'est exactement la
 * confusion que `nextMissionRow` (Profil) a dû défaire une fois déjà.
 */
export function recommendedMissionView(
  input: RecommendedMissionInput,
): RecommendedMissionView {
  const { status, mission, opened, now, ego, mine } = input;

  if (status === 'signed-out') return { kind: 'signed-out' };
  if (status === 'unconfigured') return { kind: 'failed', retryable: false };
  if (status === 'idle' || status === 'loading') return { kind: 'loading' };
  if (status === 'failed') return { kind: 'failed', retryable: true };

  // Lecture ABOUTIE. La mission ouverte s'est-elle éteinte ?
  if (opened !== null) {
    const dropped = missionDropReason(opened, { now, ego, mine });
    if (dropped !== null) return { kind: 'dropped', reason: dropped };
  }

  if (mission === null || mission.kind === 'first_capture') return { kind: 'empty' };

  const reason = missionReason(mission, mine.length);
  // Défensif : `missionReason` ne rend `null` que pour `first_capture`, déjà
  // écarté. Si ça changeait, on préfère l'état VIDE à une raison inventée.
  if (reason === null) return { kind: 'empty' };
  return { kind: 'mission', mission, reason };
}

/**
 * Heures restantes avant l'échéance de defense, telles que l'écran les affiche.
 * Exposé ici (plutôt que recalculé dans le rendu) pour que la fenêtre de
 * référence reste `MISSION_DEFEND_WINDOW_H` et rien d'autre.
 */
export function defendWindowHours(): number {
  return MISSION_DEFEND_WINDOW_H;
}

/** Millisecondes → heures pleines restantes (≥ 1), même arrondi que le moteur. */
export function hoursLeftFrom(decayAt: Date, now: Date): number {
  return Math.max(1, Math.ceil((decayAt.getTime() - now.getTime()) / MS_PER_HOUR));
}
