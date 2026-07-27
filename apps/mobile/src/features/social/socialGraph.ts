/**
 * GRYD — E57 (suivis et amis) + E58 (défi) : la logique PURE. Zéro React,
 * zéro I/O, zéro `supabase`. Le câblage vit dans `socialGraphData.ts`.
 *
 * ═══ CE QUI SE DÉCIDE ICI, ET RIEN D'AUTRE ══════════════════════════════════
 *  1. LIRE la réponse du serveur sans jamais lui prêter une forme qu'elle n'a
 *     pas : `parseSocialGraph` / `parseDuelInbox` rendent `null` plutôt qu'un
 *     objet à moitié inventé. Un demi-objet ferait afficher « 0 ami » à
 *     quelqu'un qui en a douze mais dont la réponse a mal transité — c'est
 *     exactement le « 0 nu » que la constitution interdit.
 *  2. NOMMER le refus. Le serveur répond `{ok:false, reason}` ; l'écran a
 *     besoin d'un motif FERMÉ pour choisir sa phrase, jamais d'un texte brut.
 *  3. DIRE SI UNE ACTION EST POSSIBLE AVANT DE LA PEINDRE (§A4, « aucun bouton
 *     mort ») : `canChallenge` reproduit la règle de lien du serveur, et
 *     `duelDraftIssue` valide le brouillon avant l'envoi.
 *
 * ═══ CE QUI NE SE DÉCIDE PAS ICI ════════════════════════════════════════════
 * Rien n'autorise quoi que ce soit. `duel_create` (migration 0088) revérifie
 * l'identité, le lien, les bornes, l'unicité, le cooldown et le plafond, quoi
 * que ce module ait pensé. `canChallenge` sert à ne pas peindre une action
 * condamnée — jamais à s'en octroyer une. Si les deux divergent, c'est le
 * serveur qui a raison et l'écran qui affiche son motif.
 *
 * ═══ LA BASE EST VIDE, ET CE MODULE NE LA REMPLIT PAS ══════════════════════
 * Aucune fonction ici ne fabrique de personne, de suggestion ou de compteur.
 * `suggestionsSource` / `importedFriendsSource` sont LUS depuis le serveur et
 * valent `'none'` : ce n'est pas « aucune suggestion aujourd'hui », c'est
 * « aucune source de suggestions » (game-rules
 * `SOCIAL_SUGGESTIONS_SOURCE_EXISTS = false`). Les deux se disent
 * différemment, et l'écran doit pouvoir faire la différence.
 */
import {
  DUEL_KINDS,
  DUEL_PERIOD_DAYS_MAX,
  DUEL_PERIOD_DAYS_MIN,
  type DuelKind,
} from '@klaim/shared';
// Module PUR (aucun import React/RN) : la garde de vie privée d'un libellé de
// lieu est la MÊME pour un rendez-vous de crew et pour un défi de zone. La
// dupliquer garantirait qu'elle dérive au premier cas ajouté d'un seul côté.
import { meetingPointRefusal } from '../crew/crewOuting';

// ═══════════════════════════════════════════════════════════════════════════
// 1. CE QUE LE SERVEUR REND
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Une personne, réduite au STRICT nécessaire — c'est tout ce que
 * `social_person()` (0088) accepte de rendre. Pas de ville, pas d'activité, pas
 * de surface : un écran d'amis n'est pas un écran d'espionnage (§12).
 *
 * `handle` peut être `null` : un compte provisionné sans profil complété existe
 * réellement. L'écran doit alors ne rien afficher plutôt qu'un pseudo inventé.
 */
export interface Person {
  readonly handle: string | null;
  readonly displayName: string | null;
}

/** Une demande d'ami REÇUE — la seule qui porte un id, car la seule décidable. */
export interface IncomingRequest extends Person {
  readonly id: string;
}

export interface SocialGraph {
  readonly me: Person;
  readonly following: readonly Person[];
  readonly followingTotal: number;
  readonly followers: readonly Person[];
  readonly followersTotal: number;
  readonly friends: readonly Person[];
  readonly friendsTotal: number;
  readonly requestsIn: readonly IncomingRequest[];
  readonly requestsInTotal: number;
  readonly requestsOut: readonly Person[];
  readonly requestsOutTotal: number;
  /** Borne de section (SOCIAL_LIST_ROWS_LIMIT) : au-delà, la liste est tronquée. */
  readonly rowsLimit: number;
  /** `'none'` = il n'existe AUCUNE source, pas « aucun résultat ». */
  readonly suggestionsSource: 'none';
  readonly importedFriendsSource: 'none';
}

export interface IncomingDuel {
  readonly id: string;
  readonly kind: DuelKind;
  readonly activity: 'run' | 'bike';
  readonly periodDays: number;
  readonly target: number | null;
  readonly zoneLabel: string | null;
  readonly expiresAt: string;
  readonly from: Person;
}

export interface OutgoingDuel {
  readonly id: string;
  readonly kind: DuelKind;
  readonly activity: 'run' | 'bike';
  readonly periodDays: number;
  readonly target: number | null;
  readonly zoneLabel: string | null;
  readonly expiresAt: string;
  readonly to: Person;
}

export interface ActiveDuel {
  readonly id: string;
  readonly kind: DuelKind;
  readonly activity: 'run' | 'bike';
  readonly periodDays: number;
  readonly target: number | null;
  readonly zoneLabel: string | null;
  readonly with: Person;
  readonly iChallenged: boolean;
}

export interface DuelInbox {
  readonly incoming: readonly IncomingDuel[];
  readonly outgoing: readonly OutgoingDuel[];
  readonly active: readonly ActiveDuel[];
  readonly expiryHours: number;
  readonly maxPendingSent: number;
  /**
   * `false` aujourd'hui : AUCUN moteur ne mesure un défi ni ne désigne un
   * vainqueur (0088 §16). L'écran DOIT le lire pour ne pas peindre un score —
   * une clé absente aurait pu être prise pour « 0 ».
   */
  readonly scoringExists: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LECTURE DÉFENSIVE — un demi-objet vaut moins que rien
// ═══════════════════════════════════════════════════════════════════════════

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/** Un entier positif ou nul, ou `null`. JAMAIS un `NaN` déguisé en 0. */
const count = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
};

/** Un nombre décimal strictement positif (cible de défi), ou `null`. */
const positive = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

function parsePerson(raw: unknown): Person | null {
  if (!isRecord(raw)) return null;
  // `handle` NULL est légitime (compte sans profil) : on ne rejette pas la
  // ligne, on rend une personne sans nom affichable — l'écran saura la taire.
  return { handle: str(raw.handle), displayName: str(raw.displayName) };
}

function parsePeople(raw: unknown): readonly Person[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Person[] = [];
  for (const item of raw) {
    const p = parsePerson(item);
    if (!p) return null; // une ligne illisible invalide la LISTE, pas ses voisines
    out.push(p);
  }
  return out;
}

function parseIncomingRequests(raw: unknown): readonly IncomingRequest[] | null {
  if (!Array.isArray(raw)) return null;
  const out: IncomingRequest[] = [];
  for (const item of raw) {
    const p = parsePerson(item);
    const id = isRecord(item) ? str(item.id) : null;
    // SANS id, la demande n'est pas décidable : l'afficher peindrait deux
    // boutons morts (accepter / refuser). On refuse la liste entière.
    if (!p || !id) return null;
    out.push({ ...p, id });
  }
  return out;
}

/**
 * Lit `social_graph()`. Rend `null` si la réponse n'est pas un graphe —
 * y compris quand c'est un REFUS explicite (`{ok:false}`), que l'appelant lit
 * alors avec `socialRefusalOf`.
 */
export function parseSocialGraph(raw: unknown): SocialGraph | null {
  if (!isRecord(raw) || raw.ok !== true) return null;
  const me = parsePerson(raw.me);
  const following = parsePeople(raw.following);
  const followers = parsePeople(raw.followers);
  const friends = parsePeople(raw.friends);
  const requestsIn = parseIncomingRequests(raw.requestsIn);
  const requestsOut = parsePeople(raw.requestsOut);
  if (!me || !following || !followers || !friends || !requestsIn || !requestsOut) return null;

  const followingTotal = count(raw.followingTotal);
  const followersTotal = count(raw.followersTotal);
  const friendsTotal = count(raw.friendsTotal);
  const requestsInTotal = count(raw.requestsInTotal);
  const requestsOutTotal = count(raw.requestsOutTotal);
  const rowsLimit = count(raw.rowsLimit);
  // UN TOTAL MANQUANT N'EST PAS UN ZÉRO. Sans lui on ne saurait pas si la liste
  // est complète ou tronquée : on préfère ne rien affirmer.
  if (
    followingTotal === null || followersTotal === null || friendsTotal === null ||
    requestsInTotal === null || requestsOutTotal === null || rowsLimit === null
  ) {
    return null;
  }
  // Les deux clés de source doivent être LUES, pas supposées : si un futur
  // serveur se met à proposer des suggestions, l'écran doit s'en apercevoir
  // plutôt que de continuer à dire « il n'y a pas de source ».
  if (raw.suggestionsSource !== 'none' || raw.importedFriendsSource !== 'none') return null;

  return {
    me,
    following, followingTotal,
    followers, followersTotal,
    friends, friendsTotal,
    requestsIn, requestsInTotal,
    requestsOut, requestsOutTotal,
    rowsLimit,
    suggestionsSource: 'none',
    importedFriendsSource: 'none',
  };
}

const isKind = (v: unknown): v is DuelKind =>
  typeof v === 'string' && (DUEL_KINDS as readonly string[]).includes(v);
const isActivity = (v: unknown): v is 'run' | 'bike' => v === 'run' || v === 'bike';

/** Le tronc commun d'un défi, quel que soit son sens. */
function parseDuelCore(raw: unknown): {
  id: string; kind: DuelKind; activity: 'run' | 'bike'; periodDays: number;
  target: number | null; zoneLabel: string | null;
} | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const periodDays = count(raw.periodDays);
  if (!id || !isKind(raw.kind) || !isActivity(raw.activity) || periodDays === null) return null;
  return {
    id,
    kind: raw.kind,
    activity: raw.activity,
    periodDays,
    target: positive(raw.target),
    zoneLabel: str(raw.zoneLabel),
  };
}

export function parseDuelInbox(raw: unknown): DuelInbox | null {
  if (!isRecord(raw) || raw.ok !== true) return null;
  if (!Array.isArray(raw.incoming) || !Array.isArray(raw.outgoing) || !Array.isArray(raw.active)) {
    return null;
  }
  const expiryHours = count(raw.expiryHours);
  const maxPendingSent = count(raw.maxPendingSent);
  if (expiryHours === null || maxPendingSent === null) return null;
  if (typeof raw.scoringExists !== 'boolean') return null;

  const incoming: IncomingDuel[] = [];
  for (const item of raw.incoming) {
    const core = parseDuelCore(item);
    const from = isRecord(item) ? parsePerson(item.from) : null;
    const expiresAt = isRecord(item) ? str(item.expiresAt) : null;
    if (!core || !from || !expiresAt) return null;
    incoming.push({ ...core, from, expiresAt });
  }
  const outgoing: OutgoingDuel[] = [];
  for (const item of raw.outgoing) {
    const core = parseDuelCore(item);
    const to = isRecord(item) ? parsePerson(item.to) : null;
    const expiresAt = isRecord(item) ? str(item.expiresAt) : null;
    if (!core || !to || !expiresAt) return null;
    outgoing.push({ ...core, to, expiresAt });
  }
  const active: ActiveDuel[] = [];
  for (const item of raw.active) {
    const core = parseDuelCore(item);
    const other = isRecord(item) ? parsePerson(item.with) : null;
    if (!core || !other || !isRecord(item) || typeof item.iChallenged !== 'boolean') return null;
    active.push({ ...core, with: other, iChallenged: item.iChallenged });
  }
  return { incoming, outgoing, active, expiryHours, maxPendingSent, scoringExists: raw.scoringExists };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES REFUS — fermés, nommés, jamais bruts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les motifs que les RPC de 0088 savent rendre. `unknown` couvre une réponse
 * que ce client ne connaît pas : elle se DIT (« je n'ai pas compris la
 * réponse »), elle ne se tait pas et ne se travestit pas en « rien ».
 */
export const SOCIAL_REFUSALS = [
  'signed_out',
  'not_found',
  'self',
  'bad_handle',
  'rate_limited',
  'cooldown',
  'too_many_pending',
  'no_relation',
  'already_pending',
  'not_pending',
  'expired',
  'bad_kind',
  'bad_activity',
  'bad_period',
  'bad_target',
  'bad_zone',
  // ── Vie privée / modération du libellé de zone (0088 §12, 27/07/2026) ─────
  // `zone_looks_like_address` porte un sous-motif (`kind`) que l'écran DOIT
  // dire : la personne n'essaie pas de contourner, elle essaie d'être utile.
  // `zone_unavailable` reste OPAQUE (doctrine 0050) : détailler un verdict de
  // modération en ferait un mode d'emploi du contournement.
  'zone_looks_like_address',
  'zone_unavailable',
  'unknown',
] as const;
export type SocialRefusal = (typeof SOCIAL_REFUSALS)[number];

/** Lit le motif d'un `{ok:false, reason}`. `null` si la réponse était un succès. */
export function socialRefusalOf(raw: unknown): SocialRefusal | null {
  if (!isRecord(raw)) return 'unknown';
  if (raw.ok === true) return null;
  const reason = raw.reason;
  if (typeof reason !== 'string') return 'unknown';
  return (SOCIAL_REFUSALS as readonly string[]).includes(reason)
    ? (reason as SocialRefusal)
    : 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. NE PAS PEINDRE UNE ACTION CONDAMNÉE (§A4)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les @handles que JE PEUX défier : mes amis, plus les personnes en suivi
 * RÉCIPROQUE. C'est le miroir exact de la règle `no_relation` de `duel_create`
 * (0088 §12), et il n'existe QUE pour éviter un bouton « Défier » qui échouerait
 * à coup sûr. Un suivi unilatéral n'y donne PAS droit : suivre quelqu'un ne
 * s'autorise pas à le solliciter.
 *
 * Les personnes sans handle sont exclues : on ne peut pas les adresser, la RPC
 * prenant un @handle.
 */
export function challengeableHandles(graph: SocialGraph): ReadonlySet<string> {
  const out = new Set<string>();
  for (const p of graph.friends) if (p.handle) out.add(p.handle);
  const followers = new Set(graph.followers.map((p) => p.handle).filter((h): h is string => !!h));
  for (const p of graph.following) if (p.handle && followers.has(p.handle)) out.add(p.handle);
  return out;
}

/** `true` si le bouton « Défier » peut être peint pour cette personne. */
export function canChallenge(graph: SocialGraph, handle: string | null): boolean {
  return handle !== null && challengeableHandles(graph).has(handle);
}

/** Un brouillon de défi, tel que l'écran E58 le compose. */
export interface DuelDraft {
  readonly kind: DuelKind;
  readonly activity: 'run' | 'bike';
  readonly periodDays: number;
  /** Cible chiffrée (km, boucles, surface). `null` pour `defend_zone`. */
  readonly target: number | null;
  /** Libellé PUBLIC de la zone. `null` sauf pour `defend_zone`. */
  readonly zoneLabel: string | null;
}

/**
 * Ce qui manque au brouillon, ou `null` s'il est envoyable. Miroir des refus de
 * forme de `duel_create` — pour que l'unique CTA chartreuse de E58 ne soit
 * jamais peint sur un envoi condamné.
 */
export type DuelDraftIssue =
  | 'kind'
  | 'period'
  | 'target'
  | 'zone'
  | 'zone_street_address'
  | 'zone_door_detail';

export function duelDraftIssue(draft: DuelDraft): DuelDraftIssue | null {
  if (!isKind(draft.kind)) return 'kind';
  if (
    !Number.isInteger(draft.periodDays) ||
    draft.periodDays < DUEL_PERIOD_DAYS_MIN ||
    draft.periodDays > DUEL_PERIOD_DAYS_MAX
  ) {
    return 'period';
  }
  if (draft.kind === 'defend_zone') {
    if (draft.zoneLabel === null || draft.zoneLabel.trim().length === 0) return 'zone';
    // ── VIE PRIVÉE (constitution §7) — MIROIR DE LA GARDE SERVEUR ──────────
    // `duel_create` appelle `crew_outing_place_refusal` (0085) sur ce libellé
    // depuis le 27/07/2026 : il part chez une autre personne, une adresse n'a
    // rien à y faire. On rejoue ICI la MÊME fonction pure que le point de
    // rendez-vous crew (`meetingPointRefusal`), pour ne pas peindre un CTA
    // chartreuse que le serveur refusera — et pour DIRE le motif tout de suite,
    // pendant que la personne a encore le doigt sur le champ.
    // Ce n'est pas la protection : la protection est serveur. C'est la
    // courtoisie qui évite un aller-retour, et l'application de §A4.
    const place = meetingPointRefusal(draft.zoneLabel);
    if (place === 'street_address') return 'zone_street_address';
    if (place === 'door_detail') return 'zone_door_detail';
    // Une cible chiffrée sur un défi de zone serait un champ qui ment (le
    // serveur le refuse aussi : `bad_target`).
    if (draft.target !== null) return 'target';
    return null;
  }
  if (draft.target === null || !Number.isFinite(draft.target) || draft.target <= 0) return 'target';
  return null;
}

/**
 * La charge envoyée à `duel_create`. Normalise ce que le serveur normaliserait
 * de toute façon (trim du libellé, cible nulle sur `defend_zone`) — pour que
 * ce qui a été relu à l'écran soit exactement ce qui part.
 */
export interface DuelPayload {
  readonly p_handle: string;
  readonly p_kind: DuelKind;
  readonly p_period_days: number;
  readonly p_activity: 'run' | 'bike';
  readonly p_target: number | null;
  readonly p_zone_label: string | null;
}

export function duelPayload(handle: string, draft: DuelDraft): DuelPayload {
  const zone = draft.kind === 'defend_zone' ? (draft.zoneLabel ?? '').trim() : '';
  return {
    p_handle: handle,
    p_kind: draft.kind,
    p_period_days: draft.periodDays,
    p_activity: draft.activity,
    p_target: draft.kind === 'defend_zone' ? null : draft.target,
    p_zone_label: zone.length > 0 ? zone : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LES SECTIONS DE E57 — ce que l'écran a le droit de MONTRER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les clés de section de E57. La spec en liste quatre ; DEUX ONT UNE SOURCE.
 * Les deux autres (`importedFriends`, `suggestions`) n'en ont aucune et sont
 * rendues ici comme un FAIT — l'écran écrit une phrase, pas une liste vide.
 */
export type SocialSectionKey = 'requestsIn' | 'friends' | 'following' | 'followers';

export interface SocialSection {
  readonly key: SocialSectionKey;
  readonly people: readonly Person[];
  /** Total RÉEL côté serveur — peut dépasser `people.length` (liste bornée). */
  readonly total: number;
  /** `true` quand `total > people.length` : la liste montrée est incomplète. */
  readonly truncated: boolean;
}

/**
 * Ordonne les sections par ce qu'elles DEMANDENT du joueur : d'abord ce qui
 * attend une décision (demandes reçues), puis les liens établis. Une section
 * VIDE n'est pas rendue : un titre suivi de rien est un trou, et empiler quatre
 * trous serait la définition d'un écran qui ne se comprend pas en 3 s (§A).
 * Quand TOUT est vide, `sections()` rend un tableau vide et l'écran affiche son
 * état vide de première classe — pas quatre en-têtes fantômes.
 */
export function sections(graph: SocialGraph): readonly SocialSection[] {
  const all: readonly SocialSection[] = [
    mk('requestsIn', graph.requestsIn, graph.requestsInTotal),
    mk('friends', graph.friends, graph.friendsTotal),
    mk('following', graph.following, graph.followingTotal),
    mk('followers', graph.followers, graph.followersTotal),
  ];
  return all.filter((s) => s.people.length > 0);
}

function mk(key: SocialSectionKey, people: readonly Person[], total: number): SocialSection {
  return { key, people, total, truncated: total > people.length };
}

/** `true` quand le graphe ne contient RIEN — l'état vide de première classe. */
export function isEmptyGraph(graph: SocialGraph): boolean {
  return sections(graph).length === 0 && graph.requestsOut.length === 0;
}
