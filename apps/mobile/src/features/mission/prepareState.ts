/**
 * GRYD — E17 « PRÉPARATION D'ACTIVITÉ » (`/map/prepare`, spec produit l.1028) :
 * les trois ÉTATS TECHNIQUES et l'objectif recommandé, en PUR.
 *
 * Zéro import React, zéro capteur, zéro I/O → testé en Deno. Les lectures
 * réelles (capteur GPS, API batterie de la plateforme, file d'envoi) vivent dans
 * l'écran et dans `battery.ts` ; ce module ne fait que traduire une MESURE en ce
 * que l'écran a le droit d'écrire.
 *
 * ─── « INCONNU » EST UN ÉTAT DE PREMIÈRE CLASSE ─────────────────────────────
 * Les trois lignes (GPS, batterie, synchronisation) portent chacune un état
 * `unknown` distinct de « tout va bien ». C'est la règle constitutionnelle
 * appliquée à un détail qu'on serait tenté d'arrondir : une pastille verte
 * « batterie OK » sur un appareil qui ne publie pas son niveau serait une donnée
 * fabriquée, et une pastille verte « à jour » sur une file d'envoi illisible
 * serait une promesse que personne n'a vérifiée. Là où rien n'est mesurable,
 * la ligne le DIT.
 *
 * Le catalogue `i18n/catalog/prepare.ts` documentait le 27/07/2026 l'inverse
 * pour la batterie (« deux lignes vraies valent mieux que trois dont une ment »,
 * donc aucune clé de batterie). L'argument était juste sur le mensonge et faux
 * sur la conclusion : la troisième ligne ne ment pas si elle dit « inconnu ». La
 * spec en demande trois, la constitution en demande l'honnêteté — les deux
 * tiennent ensemble, à condition de nommer l'ignorance.
 */
import { preflightReadiness, type PreflightSignal } from '../run/gps/preflightSignal';
import type { RealMission } from './deriveMission';
import type { MissionReadStatus } from './recommendedMission';

// ─── OBJECTIF RECOMMANDÉ (spec l.1028 : « Conquérir autour de vous » /
//     « Défendre Saint-Rémy ») ───────────────────────────────────────────────

/** Les deux branches du mini-segment de la spec. Vocabulaire FERMÉ, identique à
 *  celui des events `activity_prepare_viewed` / `activity_objective_changed`. */
export type PrepareObjective = 'conquer' | 'defend';

/**
 * Y a-t-il quelque chose à DÉFENDRE ? Uniquement quand le moteur de mission a
 * trouvé une de MES zones dont l'échéance tombe dans la fenêtre de défense. Sans
 * ça, le segment « Défendre » n'a pas de cible : l'écran le dit au lieu de
 * peindre un choix qui n'aboutirait à rien (constitution §2).
 */
export function defendAvailable(mission: RealMission | null): boolean {
  return mission !== null && mission.kind === 'defend_expiring';
}

/**
 * L'objectif RECOMMANDÉ — dérivé de la mission réelle, jamais d'un défaut
 * arbitraire. Défendre l'emporte quand une zone à moi s'efface : c'est la même
 * priorité que `deriveRealMission`, et deux priorités concurrentes finiraient
 * par se contredire à l'écran.
 */
export function recommendedObjective(mission: RealMission | null): PrepareObjective {
  return defendAvailable(mission) ? 'defend' : 'conquer';
}

/**
 * L'objectif RÉELLEMENT actif : le choix du joueur s'il en a fait un, sinon la
 * recommandation. Un choix « défendre » devenu impossible (la zone est tombée
 * pendant qu'il préparait sa sortie) retombe sur la recommandation — l'écran ne
 * garde jamais un objectif sans cible.
 */
export function effectiveObjective(
  chosen: PrepareObjective | null,
  mission: RealMission | null,
): PrepareObjective {
  if (chosen === 'defend' && !defendAvailable(mission)) return recommendedObjective(mission);
  return chosen ?? recommendedObjective(mission);
}

// ─── POURQUOI CETTE RECOMMANDATION — ET SEULEMENT SI ON LE SAIT ──────────────

/**
 * La RAISON affichée sous la grande ligne d'objectif. Vocabulaire FERMÉ, une
 * clé i18n par branche.
 *
 * ─── LE BUG QUE CE TYPE SUPPRIME (27/07/2026) ────────────────────────────────
 * L'écran écrivait, en dur : `mission?.kind === 'defend_expiring' ? {expiring}
 * : {expand}`. Autrement dit, tout ce qui n'était pas une défense recevait
 * « Rien ne presse ailleurs : c'est le moment d'agrandir. » Or `mission` vaut
 * `null` dans QUATRE situations qui n'ont rien à voir entre elles — pas de
 * backend, pas de session, échec de lecture, lecture en cours — et l'écran
 * IGNORAIT `status`, que `useRealMissionCore` publie précisément pour les
 * distinguer.
 *
 * Conséquence : une AFFIRMATION sur le territoire du joueur (« rien ne presse
 * AILLEURS » suppose qu'on a regardé ailleurs) était peinte alors qu'aucune
 * zone n'avait été lue. Avec la base vide, c'était le cas de 100 % des
 * ouvertures. E16, sur exactement la même donnée, refusait de recommander
 * (`recommendedMissionView` → `{kind:'empty'}`) : deux écrans qui se
 * contredisaient sur le même fait.
 *
 * `unknown` n'est pas un repli : c'est le résultat honnête d'une lecture qui
 * n'a pas abouti. `first` non plus : un joueur SANS aucune zone ne peut pas
 * « agrandir », il prend sa première — `deriveRealMission` le dit déjà
 * (`first_capture`), l'écran cessait simplement de l'écouter.
 */
export type ObjectiveReasonKey = 'expiring' | 'expand' | 'first' | 'unknown';

export interface ObjectiveReasonInput {
  /** Où en est la lecture des zones. C'EST le paramètre qui manquait. */
  status: MissionReadStatus;
  /** La mission re-dérivée, ou `null` (les quatre causes confondues). */
  mission: RealMission | null;
  /** L'objectif RÉELLEMENT actif (choix du joueur inclus). */
  objective: PrepareObjective;
}

/**
 * Objectif + état de lecture → la raison qu'on a le DROIT d'écrire.
 *
 * L'ordre est la garantie, comme dans `recommendedMissionView` : l'état de la
 * lecture est tranché AVANT toute question de mission. Un `mission === null`
 * pendant un chargement ne doit jamais se lire « rien ne presse ailleurs ».
 */
export function objectiveReasonKey({
  status,
  mission,
  objective,
}: ObjectiveReasonInput): ObjectiveReasonKey {
  // Une défense ne s'affiche que sur une mission de défense RÉELLE (l'échéance
  // vient des données) — `effectiveObjective` le garantit déjà, on ne s'y fie
  // pas seul : c'est la mission qui porte `hoursLeft`.
  if (objective === 'defend' && mission?.kind === 'defend_expiring') return 'expiring';
  // Lecture non aboutie ⇒ AUCUNE affirmation sur le territoire du joueur.
  if (status !== 'ready') return 'unknown';
  // Lecture aboutie : le moteur a tranché. Pas une seule zone ⇒ première prise.
  if (mission === null || mission.kind === 'first_capture') return 'first';
  return 'expand';
}

// ─── ÉTAT TECHNIQUE 1/3 — GPS ────────────────────────────────────────────────

/** Ce que la ligne GPS écrit. `unavailable` = aucune mesure possible ici (refus
 *  de localisation, capteur muet) — ce n'est ni « bon » ni « mauvais signal ». */
export type GpsRowKey = 'searching' | 'ready' | 'approximate' | 'poor' | 'unavailable';

/**
 * Sondage → ligne. On passe par `preflightReadiness` (E19) plutôt que de relire
 * les seuils : les deux écrans qui parlent du même signal à trente secondes
 * d'intervalle doivent en dire EXACTEMENT la même chose, sinon l'un des deux
 * ment. Un seul énoncé de la règle, une seule occasion de se tromper.
 */
export function gpsRowKey(signal: PreflightSignal): GpsRowKey {
  const ring = preflightReadiness(signal).ring;
  if (ring === 'none') return 'unavailable';
  if (ring === 'usable') return 'approximate';
  return ring; // 'searching' | 'ready' | 'poor'
}

// ─── ÉTAT TECHNIQUE 2/3 — BATTERIE ───────────────────────────────────────────

/**
 * Ce que la plateforme a RÉELLEMENT rendu. `unknown` n'est pas une valeur de
 * repli : c'est le résultat honnête d'un appareil qui ne publie pas son niveau
 * (aucune dépendance batterie native au 27/07/2026, cf. `battery.ts`).
 */
export type BatteryReading =
  | { kind: 'unknown' }
  | { kind: 'measured'; percent: number; charging: boolean };

/**
 * Seuil sous lequel on PRÉVIENT avant une sortie. Constante de PRÉSENTATION —
 * elle ne décide d'aucun territoire, d'aucun point, d'aucun claim, et ne quitte
 * jamais cet écran (même statut que `PREFLIGHT_PROBE_HINT_MS` dans
 * `preflightSignal.ts`). Elle n'a donc rien à faire dans `game-rules.ts`, qui
 * est la source unique des constantes de JEU.
 *
 * 20 % : le palier auquel iOS et Android déclenchent eux-mêmes leur mode
 * économie d'énergie — c'est-à-dire l'instant où le système commence à brider
 * ce dont l'enregistrement GPS dépend.
 */
export const BATTERY_LOW_PERCENT = 20;

export type BatteryRowKey = 'unknown' | 'ok' | 'low' | 'charging';

/** Mesure → ligne. En charge, le niveau ne prédit plus rien d'inquiétant : on
 *  le dit plutôt que d'alarmer sur un téléphone branché. */
export function batteryRowKey(reading: BatteryReading): BatteryRowKey {
  if (reading.kind === 'unknown') return 'unknown';
  if (reading.charging) return 'charging';
  return reading.percent <= BATTERY_LOW_PERCENT ? 'low' : 'ok';
}

// ─── ÉTAT TECHNIQUE 3/3 — SYNCHRONISATION ────────────────────────────────────

/**
 * Lecture de la file d'envoi locale, réduite à ce que l'écran consomme. Type
 * STRUCTUREL et local (et non `PendingUploadStatus` importé de
 * `lib/pendingUpload`) pour une raison mécanique : ce module doit rester
 * chargeable par Deno, et `pendingUpload` tire AsyncStorage.
 */
export type QueueReading = { readable: false } | { readable: true; depth: number };

export type SyncRowKey = 'signed-out' | 'unknown' | 'pending' | 'ready';

export interface SyncRowInput {
  /** Backend configuré (O1) — sans lui aucune sortie ne peut partir. */
  backend: boolean;
  signedIn: boolean;
  /** `null` = la file n'a pas encore été lue (état transitoire, pas un verdict). */
  queue: QueueReading | null;
}

export interface SyncRow {
  key: SyncRowKey;
  /** Nombre de sorties en attente — seulement quand `key === 'pending'`. */
  pending: number;
}

/**
 * État de synchronisation, dans l'ordre de ce qui BLOQUE le plus.
 *
 * Ce que cette ligne NE dit PAS : « hors ligne ». Rien dans le dépôt ne mesure
 * la connectivité (aucune dépendance réseau installée, et `navigator.onLine`
 * n'existe que dans le navigateur). Une ligne « hors ligne » serait donc une
 * supposition — la profondeur de file, elle, est un fait, et elle porte la même
 * information utile : des sorties attendent, rien n'est perdu.
 */
export function syncRow({ backend, signedIn, queue }: SyncRowInput): SyncRow {
  if (!backend || !signedIn) return { key: 'signed-out', pending: 0 };
  if (queue === null || !queue.readable) return { key: 'unknown', pending: 0 };
  if (queue.depth > 0) return { key: 'pending', pending: queue.depth };
  return { key: 'ready', pending: 0 };
}

// ─── TONALITÉ COMMUNE AUX TROIS LIGNES ───────────────────────────────────────

/**
 * La tonalité d'une ligne technique. Elle REDOUBLE le texte, elle ne le remplace
 * jamais (§C : jamais une couleur seule porteuse de sens) — chaque ligne écrit
 * son état en toutes lettres, la couleur ne fait que le hiérarchiser.
 */
export type TechTone = 'ok' | 'warn' | 'blocked' | 'unknown';

export const GPS_TONE: Readonly<Record<GpsRowKey, TechTone>> = {
  ready: 'ok',
  approximate: 'warn',
  poor: 'warn',
  searching: 'unknown',
  unavailable: 'blocked',
};

export const BATTERY_TONE: Readonly<Record<BatteryRowKey, TechTone>> = {
  ok: 'ok',
  charging: 'ok',
  low: 'warn',
  unknown: 'unknown',
};

export const SYNC_TONE: Readonly<Record<SyncRowKey, TechTone>> = {
  ready: 'ok',
  pending: 'warn',
  unknown: 'unknown',
  'signed-out': 'warn',
};
