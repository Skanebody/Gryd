/**
 * GRYD — CREW RÉEL (variante NATIVE). Câblage React des RPC crew arbitrées
 * SERVEUR (create_crew / join_crew_by_code / leave_crew / my_crew_code), même
 * doctrine que `useRealMission` : un crew est RÉEL ou VIDE, JAMAIS fabriqué
 * (« l'app ne ment jamais »). Le HQ démo Supercell qui vivait dans crew.tsx a
 * été SUPPRIMÉ avec le mode vitrine (21/07/2026) : ce hook est désormais la
 * seule source de crew de l'app.
 *
 * Règle zéro-crash : tout échec — pas de session, lecture ratée,
 * rejet réseau — retombe SILENCIEUSEMENT sur `crew: null` (l'écran affiche
 * alors l'état « fonde ou rejoins », honnête). AUCUNE écriture client directe :
 * chaque mutation passe par une RPC service-role (le client n'attribue jamais
 * une adhésion). Le CODE d'un crew n'est JAMAIS lu depuis la table (colonne
 * secrète depuis 0036) — il vient de `my_crew_code()` à la demande.
 *
 * ⚠ Pré-vol `crewCreateDecision`/`crewJoinDecision` : miroir logique mobile de
 * `packages/engine/src/crew.ts` (même raison que rules.ts / raid.ts — Metro ne
 * résout pas les imports Deno `.ts` de @klaim/engine, et l'importer tirerait
 * h3-js dans le bundle). Constantes RÉELLES depuis @klaim/shared, aucun nombre
 * magique de jeu ; le serveur reste seul juge (le pré-vol évite juste un
 * aller-retour perdu quand l'entrée est manifestement invalide).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  CREW_CODE_LENGTH,
  CREW_COLORS_COUNT,
  CREW_MAX_MEMBERS,
  CREW_RECRUITMENT_AT_CREATION,
  type CrewRecruitmentStatus,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  chooseCrewMission,
  CREW_MISSION_WINDOWS,
  type CrewLoopState,
  type CrewMission,
  type CrewSectorState,
} from './engine/crewMission';

// ─── Contrat RPC (jsonb) — typé sur les réponses des fonctions serveur ───────

/** Colonnes PUBLIQUES d'un crew (jamais `code` : secret, via my_crew_code). */
export interface RealCrew {
  id: string;
  name: string;
  color: number;
  cityId: string;
}

/** Membre actif du crew (public_profiles = pseudo seulement). */
export interface RealCrewMember {
  userId: string;
  pseudo: string;
  joinedAt: string;
  isMe: boolean;
}

/**
 * Territoire du crew, calculé FRAIS par `crew_overview()` (migration 0044).
 *
 * ⚠ AUCUNE AIRE : la RPC n'émet volontairement PAS de clé `areaM2` (aucune aire
 * réelle n'existe en base — cf. choix n°1 de 0044). Ne jamais en fabriquer une
 * côté client à partir de `hexesHeld` : ce serait un chiffre inventé à l'écran.
 *
 * ⚠ CETTE RPC RESTE LA SOURCE DU HQ CREW — et la consigne a changé de RAISON le
 * 27/07/2026, il faut donc la relire au lieu de la recopier.
 *
 * AVANT (constat 0044) : « ne jamais lire `crew_leaderboard` », parce que cette
 * vue matérialisée n'était rafraîchie par AUCUN job du dépôt — figée à zéro,
 * elle aurait affiché « 0 zone » à vie. Ce motif est MORT : la migration 0086 la
 * rafraîchit pour de vrai (`refresh_crew_leaderboard()`, appelée par
 * `recompute_sectors`) et horodate chaque passage.
 *
 * MAINTENANT : on continue de lire `crew_overview()` ici, pour une raison
 * différente et plus solide — la matview est un INSTANTANÉ (jusqu'à 15 min de
 * retard) tandis que le HQ crew montre MON crew, tout de suite après MA course.
 * Un joueur qui vient de capturer doit voir sa zone, pas l'état d'avant. La
 * matview sert le CLASSEMENT (`crew_board()`, E54), où un instantané daté est le
 * bon objet ; elle n'est d'ailleurs plus lisible par les clients (0086).
 */
export interface CrewTerritory {
  /** Hexes tenus par les membres ACTIFS, non expirés. 0 = le crew ne tient rien. */
  hexesHeld: number;
  /** Dernière capture du crew, ou null s'il n'a jamais rien pris. */
  lastCaptureAt: string | null;
  /** Rang dans la ville du crew (ex aequo partagés), null si non calculable. */
  cityRank: number | null;
  /** Nombre de crews dans la ville (contexte du rang), null si non calculable. */
  crewsInCity: number | null;
}

/** Part d'un membre dans le territoire du crew (maillon 4 de la boucle §0). */
export interface CrewContribution {
  userId: string;
  pseudo: string;
  /** Rôle serveur (`CrewRole` attendu ; typé large : la DB reste souveraine). */
  role: string;
  hexesHeld: number;
  /** Part ENTIÈRE (plancher) — 0 partout quand le crew ne tient rien. */
  contributionPct: number;
}

/**
 * TRAJECTOIRE DU CREW — niveau gagné en COURANT (migration 0108).
 *
 * ⚠ `memberCount` n'est pas décoratif. Depuis la migration `0107` le barème de
 * niveau est NORMALISÉ par la taille du crew : sans lui, la marche suivante ne
 * peut pas être calculée, et une jauge tracée sur le barème BRUT se remplirait
 * plus vite que le niveau n'arrive — elle promettrait une marche qui ne tombe
 * pas. C'est pourquoi ce bloc est `null` DÈS QU'UNE des trois valeurs manque :
 * un niveau sans sa taille est un chiffre qu'on ne sait pas situer.
 */
export interface CrewProgress {
  level: number;
  xp: number;
  /** Membres ACTIFS (le serveur exclut ceux qui sont partis). */
  memberCount: number;
}

/** Retour utile de `crew_overview()` (les refus retombent sur `null`). */
export interface CrewOverview {
  territory: CrewTerritory;
  /** Mon rôle dans le crew, ou null si le serveur ne le renseigne pas. */
  myRole: string | null;
  contributions: CrewContribution[];
  /**
   * `null` = le serveur n'a pas (encore) rendu la trajectoire — backend
   * antérieur à 0108, ou payload amputé. L'écran n'affiche alors AUCUN bloc de
   * progression, plutôt qu'un « niveau 1 » inventé.
   */
  progress: CrewProgress | null;
}

/** Motifs de refus renvoyés par les RPC (contrat figé). */
export type CrewRefusal =
  | 'signed_out'
  | 'already_in_crew'
  | 'cooldown'
  | 'bad_name'
  // Modération SERVEUR du nom (0050) : insulte, marque, terme officiel GRYD,
  // caractère trompeur. Motif VOLONTAIREMENT UNIQUE — le serveur ne dit jamais
  // quelle règle a mordu ni quel mot il a reconnu, sinon le refus devient un
  // mode d'emploi du contournement. Le détail reste en base, pour la revue.
  | 'name_unavailable'
  | 'bad_color'
  | 'bad_city'
  // L'accès envoyé ne fait pas partie du sous-ensemble proposable à la création
  // (0097). En pratique l'écran ne peut pas le produire — les segments sont
  // construits DEPUIS `CREW_RECRUITMENT_AT_CREATION` — mais un contrat de refus
  // qu'on ne saurait pas traduire redeviendrait un « réessaie » opaque.
  | 'bad_recruitment_status'
  | 'bad_code'
  | 'full'
  | 'no_crew'
  /**
   * Le DERNIER CHEF ne quitte pas un crew peuplé — par `leave_crew` (0093), par
   * `join_crew_by_code` ou par `redeem_crew_invite` (0098). Le refus porte aussi
   * `membersLeftBehind`, et il NOMME le geste manquant (transférer la
   * direction), qui existe : `crew_transfer_lead`.
   */
  | 'must_transfer_lead'
  /** Le crew visé n'a plus aucun membre actif (0093) : il n'est plus joignable. */
  | 'dead_crew'
  /**
   * LE SERVEUR NE CONNAÎT PAS LA FONCTION appelée, ou pas avec ces arguments —
   * PostgREST `PGRST202`, Postgres `42883`. C'est un fait sur le SERVEUR (base
   * en retard d'une migration), pas sur le joueur, et réessayer n'y changera
   * rien. Sans ce motif, l'appel écrasait TOUTE erreur en `signed_out`, que
   * l'écran rendait en « Action impossible pour le moment » — un « réessaie »
   * opaque devant un mur permanent. Même distinction que `crewActivityData.ts`
   * et `memberRolesData.ts`, qui la faisaient déjà.
   */
  | 'unsupported_server';

/**
 * Charge utile de `create_crew`, aux clés EXACTES du jsonb serveur.
 *
 * ⚠ `city_id` / `recruitment_status` sont en snake_case parce que la RPC les
 * émet ainsi (0097). Le type disait auparavant `RealCrew & { code }`, donc
 * `cityId` — une clé qui n'a jamais existé dans cette réponse. Personne ne l'a
 * vu parce que l'écran ne lit que `name` ; un type qui décrit une donnée
 * inexistante reste un piège posé pour le prochain lecteur.
 */
export interface CreatedCrewPayload {
  id: string;
  name: string;
  color: number;
  city_id: string;
  code: string;
  /**
   * L'accès RÉELLEMENT écrit par le serveur (0097). L'écran confirme CELUI-CI,
   * jamais celui que le joueur croit avoir tapé.
   */
  recruitment_status: CrewRecruitmentStatus;
}

export type CreateResult =
  | { ok: true; crew: CreatedCrewPayload }
  | { ok: false; reason: CrewRefusal; daysLeft?: number };

export type JoinResult =
  | { ok: true; crew: RealCrew }
  | { ok: false; reason: CrewRefusal; daysLeft?: number };

export type LeaveResult = { ok: true } | { ok: false; reason: CrewRefusal };

export type CodeResult = { ok: true; code: string } | { ok: false; reason: CrewRefusal };

// ─── Pré-vol PUR (miroir engine/crew.ts) ─────────────────────────────────────

/** Bornes du nom crew = contrainte DB (0002_schema.sql : char_length 1..40). */
const CREW_NAME_MAX_LENGTH = 40;

export type PreflightDecision =
  | { ok: true }
  | { ok: false; reason: 'bad_name' | 'bad_color' | 'bad_city' | 'bad_recruitment_status' };

/** Le nom crew nettoyé (trim) pour l'envoi — jamais d'espaces parasites en DB. */
export function normalizeCrewName(raw: string): string {
  return raw.trim().slice(0, CREW_NAME_MAX_LENGTH);
}

/**
 * Pré-vol création : nom non vide (≤40) + couleur 0..CREW_COLORS_COUNT-1 +
 * ville + ACCÈS proposable à la création (0097).
 *
 * `recruitment` accepte `null` = « le joueur ne s'est pas prononcé » : la RPC
 * omet alors le paramètre et le serveur applique le défaut de la colonne.
 * MIROIR de `isCrewRecruitmentAtCreation` (packages/engine/src/crewJoin.ts, où
 * il est testé) — la liste n'est jamais recopiée, elle est LUE dans
 * `CREW_RECRUITMENT_AT_CREATION`.
 */
export function crewCreateDecision(
  name: string,
  color: number,
  cityId: string,
  recruitment: CrewRecruitmentStatus | null = null,
): PreflightDecision {
  const clean = normalizeCrewName(name);
  if (clean.length < 1) return { ok: false, reason: 'bad_name' };
  if (!Number.isInteger(color) || color < 0 || color >= CREW_COLORS_COUNT) {
    return { ok: false, reason: 'bad_color' };
  }
  if (cityId.trim().length < 1) return { ok: false, reason: 'bad_city' };
  if (
    recruitment !== null &&
    !(CREW_RECRUITMENT_AT_CREATION as readonly string[]).includes(recruitment)
  ) {
    return { ok: false, reason: 'bad_recruitment_status' };
  }
  return { ok: true };
}

/** Normalise un code saisi : majuscules, sans espaces (l'UI l'affiche « propre »). */
export function normalizeCrewCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CREW_CODE_LENGTH);
}

export type JoinPreflight = { ok: true } | { ok: false; reason: 'bad_code' };

/** Pré-vol adhésion : exactement CREW_CODE_LENGTH caractères A-Z0-9. */
export function crewJoinDecision(code: string): JoinPreflight {
  const clean = normalizeCrewCode(code);
  if (clean.length !== CREW_CODE_LENGTH) return { ok: false, reason: 'bad_code' };
  return { ok: true };
}

// ─── Lecture DÉFENSIVE du jsonb crew_overview (PUR, testable) ────────────────

function asFiniteInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;
}

function asText(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * jsonb → CrewOverview, ou `null` si la forme n'est pas celle attendue (refus
 * `{ok:false}`, erreur réseau, contrat futur inconnu). `null` = l'écran
 * n'affiche AUCUN bloc territoire : mieux vaut ne rien dire que dire « 0 ».
 */
export function parseCrewOverview(raw: unknown): CrewOverview | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return null;

  const terr = root.territory;
  if (!terr || typeof terr !== 'object') return null;
  const t = terr as Record<string, unknown>;
  const hexesHeld = asFiniteInt(t.hexesHeld);
  // Sans compte fiable il n'y a pas de territoire à montrer : on se tait.
  if (hexesHeld === null || hexesHeld < 0) return null;

  const contributions: CrewContribution[] = [];
  if (Array.isArray(root.members)) {
    for (const entry of root.members) {
      if (!entry || typeof entry !== 'object') continue;
      const m = entry as Record<string, unknown>;
      const userId = asText(m.userId);
      const held = asFiniteInt(m.hexesHeld);
      const pct = asFiniteInt(m.contributionPct);
      if (!userId || held === null || pct === null) continue;
      contributions.push({
        userId,
        pseudo: asText(m.pseudo) ?? '—',
        role: asText(m.role) ?? '',
        hexesHeld: Math.max(0, held),
        // Bornage client : un pourcentage hors [0,100] serait un bug serveur,
        // il ne doit jamais atteindre l'écran.
        contributionPct: Math.min(100, Math.max(0, pct)),
      });
    }
  }

  return {
    territory: {
      hexesHeld,
      lastCaptureAt: asText(t.lastCaptureAt),
      cityRank: asFiniteInt(t.cityRank),
      crewsInCity: asFiniteInt(t.crewsInCity),
    },
    myRole: asText(root.role),
    contributions,
    progress: parseCrewProgress(root),
  };
}

/**
 * Trajectoire, ou `null` — jamais un repli. Les trois valeurs sont exigées
 * ENSEMBLE : un niveau sans sa taille de crew ne peut pas être situé sur le
 * barème normalisé (0107), donc l'afficher seul reviendrait à promettre une
 * marche qu'on ne sait pas calculer.
 *
 * `xp` peut arriver en chaîne : `crews.xp` est un `bigint`, et PostgREST rend
 * les bigints en JSON sous forme de texte pour ne pas perdre de précision.
 */
function parseCrewProgress(root: Record<string, unknown>): CrewProgress | null {
  const level = asFiniteInt(root.level);
  const memberCount = asFiniteInt(root.memberCount);
  // `Number('')` vaut 0 : une chaîne vide passerait donc pour « 0 XP » alors
  // qu'elle veut dire « je n'ai rien reçu ». On l'écarte avant la conversion.
  const rawXp =
    typeof root.xp === 'string' ? (root.xp.trim().length > 0 ? Number(root.xp) : null) : root.xp;
  const xp = asFiniteInt(rawXp);
  if (level === null || xp === null || memberCount === null) return null;
  if (level < 1 || xp < 0 || memberCount < 0) return null;
  return { level, xp, memberCount };
}

// ─── Mission prioritaire du crew (A-43 §0 maillon 3) — lecture + dérivation ──

/** Timestamp ISO serveur → ms, ou `null` si absent/illisible. */
function asMs(v: unknown): number | null {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Nombre fini, sinon `null` (0 serait une affirmation, `null` est un aveu). */
function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * jsonb `crew_mission_inputs` → entrées du moteur, ou `null` si la forme n'est
 * pas celle attendue (refus `{ok:false}`, réseau, contrat futur). `null` ⇒
 * AUCUN bloc mission à l'écran : on ne dit pas « aucune mission » alors qu'on
 * n'a simplement pas réussi à lire. Ne rien savoir et savoir qu'il n'y a rien
 * sont deux choses différentes, et une seule des deux se raconte au joueur.
 */
export function parseCrewMissionInputs(
  raw: unknown,
): { sectors: CrewSectorState[]; loops: CrewLoopState[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return null;

  const sectors: CrewSectorState[] = [];
  if (Array.isArray(root.sectors)) {
    for (const entry of root.sectors) {
      if (!entry || typeof entry !== 'object') continue;
      const s = entry as Record<string, unknown>;
      sectors.push({
        sectorId: asText(s.sectorId),
        sectorName: asText(s.sectorName),
        heldTotal: asNum(s.heldTotal) ?? 0,
        expiringSoon: asNum(s.expiringSoon) ?? 0,
        earliestDecayAt: asMs(s.earliestDecayAt),
        lostRecently: asNum(s.lostRecently) ?? 0,
        lastLostAt: asMs(s.lastLostAt),
        // `null` PRÉSERVÉ : « inconnu » ne doit jamais devenir « 0 libre »,
        // sinon un secteur non rattaché se ferait passer pour saturé.
        freeHexes: asNum(s.freeHexes),
      });
    }
  }

  const loops: CrewLoopState[] = [];
  if (Array.isArray(root.loops)) {
    for (const entry of root.loops) {
      if (!entry || typeof entry !== 'object') continue;
      const l = entry as Record<string, unknown>;
      const id = asText(l.id);
      const missingM = asNum(l.missingM);
      if (!id || missingM === null) continue;
      loops.push({
        id,
        name: asText(l.name) ?? '',
        missingM,
        expiresAt: asMs(l.expiresAt),
      });
    }
  }

  return { sectors, loops };
}

/** Couleur d'identité auto (0..CREW_COLORS_COUNT-1) — pas de picker à la création. */
/**
 * Le serveur ne connaît pas cette RPC, ou pas avec CES arguments.
 *
 * ⚠ POURQUOI « ces arguments » COMPTE : PostgREST résout une fonction par
 * l'ENSEMBLE EXACT des noms d'arguments fournis. Contre une base qui ne connaît
 * que `create_crew(text, smallint, text)`, un appel à QUATRE arguments nommés ne
 * trouve aucune surcharge et rend `PGRST202` — pas une erreur de session, pas
 * une panne réseau. Au 28/07/2026, 0097 n'est PAS appliquée en production : ce
 * cas n'est pas théorique.
 *
 * On teste les deux codes plutôt que de deviner lequel remonte (ils dépendent
 * de la version du proxy), plus le message en dernier recours. Patron repris tel
 * quel de `crewActivityData.ts` et `memberRolesData.ts`.
 */
export function isUnsupportedRpc(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = error.message ?? '';
  return /does not exist|could not find|no function matches/i.test(msg);
}

export function randomCrewColor(): number {
  return Math.floor(Math.random() * CREW_COLORS_COUNT);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseRealCrewResult {
  /** false = déconnecté / sans backend : l'écran invite à se connecter. */
  ready: boolean;
  /** true tant que la 1re lecture réelle n'a pas abouti. */
  loading: boolean;
  /**
   * La lecture d'adhésion a ÉCHOUÉ (réseau, RLS, contrat) — on ne SAIT PAS si
   * l'utilisateur a un crew.
   *
   * Distinction vitale (doctrine « l'app ne ment jamais ») : `crew === null`
   * est ambigu à lui seul. Avant ce drapeau, un échec réseau était rendu
   * exactement comme une absence de crew, et l'écran affirmait « Tu n'as pas
   * encore de crew » puis invitait à en FONDER un — à un utilisateur qui en a
   * un. Affirmer un fait qu'on n'a pas pu lire est un mensonge, et proposer de
   * créer un doublon en est la conséquence coûteuse.
   *
   *  · `false` + `crew === null` → lu, et il n'y a réellement pas de crew.
   *  · `true`                    → pas pu lire : l'écran dit l'échec et propose
   *                                de réessayer. Il ne propose RIEN d'autre.
   */
  loadFailed: boolean;
  /** Mon crew actif, ou null (fonde ou rejoins). */
  crew: RealCrew | null;
  /** Membres actifs (moi inclus), triés par ancienneté. */
  members: RealCrewMember[];
  /**
   * Territoire + contributions (crew_overview, 0044), ou null : pas de crew,
   * lecture ratée, ou contrat inattendu. null ⇒ l'écran n'affiche pas le bloc
   * territoire (jamais un zéro fabriqué).
   */
  overview: CrewOverview | null;
  /** true pendant la 1re lecture du territoire (le roster, lui, est déjà là). */
  overviewLoading: boolean;
  /**
   * ─── AJOUTÉ LE 27/07/2026 : `overview === null` NE SUFFISAIT PAS ───────────
   * Ce hook repliait DEUX faits opposés sur `overview: null` — « la RPC a
   * répondu, il n'y a rien » et « la RPC a échoué ». Les blocs CHIFFRÉS d'E50
   * s'en sortaient (`zones === null` ⇒ « source indisponible »), mais le bloc
   * TOP CONTRIBUTEURS, lui, lisait `(overview?.contributions ?? []).length === 0`
   * et écrivait « Personne n'a encore capturé pour ce crew » — une affirmation
   * sur les HUMAINS du crew, produite par un timeout. Un échec de lecture
   * effaçait le travail de tout le monde.
   *
   * `false` ne veut PAS dire « lu » : il veut dire « aucune lecture n'a
   * échoué ». C'est `overviewLoading` qui porte l'attente.
   */
  overviewFailed: boolean;
  /**
   * LA mission prioritaire du crew (A-43 §0 maillon 3), dérivée par le moteur
   * PUR `chooseCrewMission` à partir des faits de `crew_mission_inputs` (0049).
   *
   * Trois valeurs, trois écrans différents — la distinction est le cœur de la
   * doctrine « l'app ne ment jamais » :
   *  · `null`             → on n'a PAS PU lire (chargement, échec, pas de crew).
   *                          L'écran n'affiche AUCUN bloc.
   *  · `{kind:'none'}`    → on a lu, et il n'y a réellement rien à faire.
   *                          L'écran le DIT.
   *  · une mission        → un fait mesuré, avec son manque chiffré.
   */
  mission: CrewMission | null;
  /**
   * Les FAITS par secteur derrière la mission (crew_mission_inputs, 0049), tels
   * quels. Exposés — et non re-fetchés — parce que le PING DE ZONE (A-44 A5) a
   * besoin exactement de cette liste pour savoir quelles zones sont RÉELLEMENT
   * celles du crew (`pingableSectors`). Une 2ᵉ lecture serveur dirait la même
   * chose, avec le risque qu'elle dise autre chose entre-temps.
   *
   * `[]` signifie « lu, et il n'y a rien » ; `mission === null` signale, lui,
   * qu'on n'a pas pu lire. Les deux ne se confondent pas.
   */
  missionSectors: CrewSectorState[];
  /** Effectif actif (X de X/CREW_MAX_MEMBERS). */
  memberCount: number;
  /** Plafond d'affichage (CREW_MAX_MEMBERS). */
  maxMembers: number;
  /** Recharge (après une mutation ou au retour d'onglet). */
  reload: () => void;
  createCrew: (
    name: string,
    color: number,
    cityId: string,
    /** Accès choisi (E41/0097) ; `null` = laisser le serveur appliquer son défaut. */
    recruitment?: CrewRecruitmentStatus | null,
  ) => Promise<CreateResult>;
  joinByCode: (code: string) => Promise<JoinResult>;
  leaveCrew: () => Promise<LeaveResult>;
  fetchMyCode: () => Promise<CodeResult>;
}

/** Colonnes publiques du crew embarqué. */
interface CrewCols {
  id: string;
  name: string;
  color: number;
  city_id: string;
}

/**
 * Ligne d'adhésion active + crew embarqué (FK crew_members.crew_id → crews.id).
 * Sans types DB générés, PostgREST typé l'embed to-one comme un tableau : on
 * accepte les deux formes et on normalise à la lecture.
 */
interface MyMembershipRow {
  crew_id: string;
  crews: CrewCols | CrewCols[] | null;
}

export interface UseRealCrewOptions {
  /**
   * Charger AUSSI le territoire + les contributions (`crew_overview`, 0044) ?
   *
   * Défaut FALSE, volontairement. `crew_overview` est un AGRÉGAT serveur (scan
   * des hex_claims des membres + classement de tous les crews de la ville) et
   * le hook refetch à chaque prise de focus. Or deux consommateurs sur trois
   * n'ont besoin que du roster : MapScreen (teinte des zones du crew) et
   * course-result (« N coéquipiers en bénéficient »). Sans ce drapeau, le
   * simple fait de revenir sur l'onglet Carte payait l'agrégat pour une donnée
   * jamais affichée. Seul l'écran Crew le demande.
   */
  withOverview?: boolean;
}

export function useRealCrew(options: UseRealCrewOptions = {}): UseRealCrewResult {
  const { withOverview = false } = options;
  const { session } = useSession();
  const [crew, setCrew] = useState<RealCrew | null>(null);
  const [members, setMembers] = useState<RealCrewMember[]>([]);
  const [overview, setOverview] = useState<CrewOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const [mission, setMission] = useState<CrewMission | null>(null);
  const [missionSectors, setMissionSectors] = useState<CrewSectorState[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const ready = !!supabase && !!session;
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Pas de session / pas de backend → aucun crew réel (état vide).
    if (!ready || !supabase || !session) {
      setCrew(null);
      setMembers([]);
      setOverview(null);
      setMission(null);
      setMissionSectors([]);
      setOverviewLoading(false);
      setOverviewFailed(false);
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    const client = supabase;
    const myId = session.user.id;
    let cancelled = false;
    setLoading(true);
    setOverviewLoading(true);
    // Une nouvelle tentative efface le verdict d'échec de la précédente : sans
    // ça, un « Réessayer » réussi laisserait l'écran dire « je n'ai pas pu lire ».
    setOverviewFailed(false);
    // `loadFailed` n'est VOLONTAIREMENT pas remis à false ici. Toutes les
    // sorties ci-dessous le fixent explicitement, donc l'état reste exact ; le
    // garder pendant le vol évite qu'un « Réessayer » fasse clignoter l'écran
    // « pas de crew » (une affirmation fausse) entre deux tentatives. On garde
    // l'écran d'échec, avec le bouton en cours de chargement, jusqu'à ce qu'on
    // sache vraiment.
    /**
     * Sortie « pas de crew » : aucune donnée fabriquée, aucun bloc territoire.
     * `failed` sépare les DEUX raisons de n'avoir aucun crew à montrer — savoir
     * qu'il n'y en a pas, ou ne pas avoir pu regarder. L'écran ne les rend pas
     * de la même façon, et c'est tout l'enjeu.
     */
    const clearAll = (failed = false) => {
      setCrew(null);
      setMembers([]);
      setOverview(null);
      setMission(null);
      setMissionSectors([]);
      setOverviewLoading(false);
      // Un échec GLOBAL (roster illisible) emporte l'agrégat : on n'a rien lu.
      setOverviewFailed(failed);
      setLoading(false);
      setLoadFailed(failed);
    };
    void (async () => {
      try {
        // MON adhésion active + le crew (colonnes publiques via l'embed FK).
        const mine = await client
          .from('crew_members')
          .select('crew_id, crews(id, name, color, city_id)')
          .eq('user_id', myId)
          .is('left_at', null)
          .maybeSingle();
        if (cancelled) return;
        // ÉCHEC de lecture ≠ absence de crew. `maybeSingle()` renvoie
        // `data: null` SANS erreur quand il n'y a réellement aucune adhésion ;
        // une `error` signifie qu'on n'a pas pu savoir. Les deux menaient au
        // même écran « fonde ton crew » — le premier est vrai, le second
        // ment à quelqu'un qui a déjà un crew et l'invite à en créer un second.
        if (mine.error) {
          clearAll(true);
          return;
        }
        if (!mine.data) {
          // Lu, et il n'y a réellement pas de crew : état vide honnête.
          clearAll();
          return;
        }
        const row = mine.data as unknown as MyMembershipRow;
        const c = Array.isArray(row.crews) ? (row.crews[0] ?? null) : row.crews;
        if (!c) {
          // Adhésion lue mais crew introuvable derrière la FK : contrat
          // inattendu, pas une absence d'adhésion. On ne dit pas « pas de crew ».
          clearAll(true);
          return;
        }
        const myCrew: RealCrew = { id: c.id, name: c.name, color: c.color, cityId: c.city_id };

        // Membres actifs du crew, puis leurs pseudos (public_profiles = vue :
        // pas d'embed FK fiable → 2e requête `in(...)`, patron du repo).
        const roster = await client
          .from('crew_members')
          .select('user_id, joined_at')
          .eq('crew_id', myCrew.id)
          .is('left_at', null)
          .order('joined_at', { ascending: true });
        if (cancelled) return;
        // Roster illisible ⇒ échec, pas un crew vide. Je suis forcément membre
        // de mon propre crew : afficher « 0 sur {max} » et un roster vide serait
        // faux dans les deux sens (l'effectif ET ma propre présence).
        if (roster.error) {
          clearAll(true);
          return;
        }
        const rosterRows = (roster.data ?? []) as { user_id: string; joined_at: string }[];
        const ids = rosterRows.map((r) => r.user_id);
        const profiles = ids.length
          ? await client.from('public_profiles').select('id, pseudo').in('id', ids)
          : { data: [] as { id: string; pseudo: string }[], error: null };
        if (cancelled) return;
        const pseudoById = new Map<string, string>();
        for (const p of (profiles.data ?? []) as { id: string; pseudo: string }[]) {
          pseudoById.set(p.id, p.pseudo);
        }
        const list: RealCrewMember[] = rosterRows.map((r) => ({
          userId: r.user_id,
          pseudo: pseudoById.get(r.user_id) ?? '—',
          joinedAt: r.joined_at,
          isMe: r.user_id === myId,
        }));

        setCrew(myCrew);
        setMembers(list);
        setLoading(false);
        setLoadFailed(false);

        // ── Territoire + contributions (0044) ────────────────────────────────
        // Lecture SÉPARÉE et POSTÉRIEURE : le roster s'affiche sans attendre
        // l'agrégat, et un échec ici ne fait pas disparaître le crew (le bloc
        // territoire reste simplement absent — jamais un « 0 zone » inventé).
        // OPT-IN (withOverview) : seul l'écran Crew paie cet agrégat.
        if (!withOverview) {
          setOverviewLoading(false);
          return;
        }
        try {
          const { data, error } = await client.rpc('crew_overview');
          if (cancelled) return;
          // `parseCrewOverview` rend `null` sur un contrat inattendu : c'est un
          // échec de lecture au même titre qu'une erreur réseau — on n'a rien
          // établi, donc on n'affirmera rien (surtout pas « personne n'a couru »).
          const parsed = error ? null : parseCrewOverview(data);
          setOverview(parsed);
          setOverviewFailed(parsed === null);
        } catch {
          if (cancelled) return;
          setOverview(null);
          setOverviewFailed(true);
        }

        // ── LA mission prioritaire (0049 + moteur pur) ───────────────────────
        // Les DEUX fenêtres sont envoyées depuis game-rules : le SQL n'écrit
        // aucun seuil de jeu en dur (il refuse même une fenêtre absente plutôt
        // que d'en inventer une). Échec de lecture ⇒ `mission = null` ⇒ AUCUN
        // bloc : « je n'ai pas pu lire » ne se dit pas « aucune mission ».
        try {
          const { data, error } = await client.rpc('crew_mission_inputs', {
            p_defend_window_h: CREW_MISSION_WINDOWS.defendWindowH,
            p_reclaim_window_h: CREW_MISSION_WINDOWS.reclaimWindowH,
          });
          if (cancelled) return;
          const facts = error ? null : parseCrewMissionInputs(data);
          setMissionSectors(facts?.sectors ?? []);
          setMission(
            facts === null
              ? null
              : chooseCrewMission({ nowMs: Date.now(), sectors: facts.sectors, loops: facts.loops }),
          );
        } catch {
          if (cancelled) return;
          setMission(null);
          setMissionSectors([]);
        }
        setOverviewLoading(false);
      } catch {
        if (cancelled) return;
        // Exception (réseau coupé, JSON illisible) : on n'a rien pu établir.
        clearAll(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `withOverview` est un BOOLÉEN (destructuré des options) et non l'objet
    // `options` — dont l'identité change à chaque rendu de l'appelant et
    // relancerait le fetch en boucle.
  }, [ready, session, tick, withOverview]);

  // Refetch au retour sur l'onglet Crew (patron useRealMission) : on saute le
  // 1er focus (le fetch au montage suffit), les suivants rafraîchissent après
  // une création / adhésion / départ faits ailleurs.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  // ── Actions (chacune décidée serveur ; le pré-vol évite un aller-retour) ────

  const createCrew = useCallback(
    async (
      name: string,
      color: number,
      cityId: string,
      recruitment: CrewRecruitmentStatus | null = null,
    ): Promise<CreateResult> => {
      if (!ready || !supabase) return { ok: false, reason: 'signed_out' };
      const pre = crewCreateDecision(name, color, cityId, recruitment);
      if (!pre.ok) return { ok: false, reason: pre.reason };
      try {
        // ⚠ `p_recruitment_status` N'EST ENVOYÉ QUE S'IL EST CHOISI (correctif
        // 28/07/2026). PostgREST résout une RPC par l'ENSEMBLE EXACT des noms
        // d'arguments : envoyer la clé « même à null » faisait chercher une
        // surcharge à QUATRE arguments, absente de toute base sans 0097 — et
        // 0097 n'est pas appliquée en production. Résultat : `PGRST202` sur la
        // création de crew la plus banale, celle où l'on ne choisit rien.
        // Omettre la clé laisse la RPC appliquer son défaut serveur, ce qui est
        // exactement ce que `null` demandait, et fonctionne des DEUX côtés de la
        // migration. Le paramètre n'est envoyé que quand il porte une décision
        // réelle — auquel cas un serveur sans 0097 le dit, ci-dessous.
        const args: Record<string, unknown> = {
          p_name: normalizeCrewName(name),
          p_color: color,
          p_city_id: cityId,
        };
        if (recruitment !== null) args.p_recruitment_status = recruitment;

        const { data, error } = await supabase.rpc('create_crew', args);
        if (error) {
          // « Ce serveur ne connaît pas cette option » n'est NI une session
          // expirée NI une panne : réessayer n'y changera rien, et le dire est
          // la seule façon que l'écran ne peigne pas un « réessaie » devant un
          // mur permanent.
          return {
            ok: false,
            reason: isUnsupportedRpc(error) ? 'unsupported_server' : 'signed_out',
          };
        }
        return data as CreateResult;
      } catch {
        return { ok: false, reason: 'signed_out' };
      }
    },
    [ready],
  );

  const joinByCode = useCallback(
    async (code: string): Promise<JoinResult> => {
      if (!ready || !supabase) return { ok: false, reason: 'signed_out' };
      const pre = crewJoinDecision(code);
      if (!pre.ok) return { ok: false, reason: pre.reason };
      try {
        const { data, error } = await supabase.rpc('join_crew_by_code', {
          p_code: normalizeCrewCode(code),
        });
        if (error) return { ok: false, reason: 'signed_out' };
        return data as JoinResult;
      } catch {
        return { ok: false, reason: 'signed_out' };
      }
    },
    [ready],
  );

  const leaveCrew = useCallback(async (): Promise<LeaveResult> => {
    if (!ready || !supabase) return { ok: false, reason: 'no_crew' };
    try {
      const { data, error } = await supabase.rpc('leave_crew');
      if (error) return { ok: false, reason: 'no_crew' };
      return data as LeaveResult;
    } catch {
      return { ok: false, reason: 'no_crew' };
    }
  }, [ready]);

  const fetchMyCode = useCallback(async (): Promise<CodeResult> => {
    if (!ready || !supabase) return { ok: false, reason: 'no_crew' };
    try {
      const { data, error } = await supabase.rpc('my_crew_code');
      if (error) return { ok: false, reason: 'no_crew' };
      return data as CodeResult;
    } catch {
      return { ok: false, reason: 'no_crew' };
    }
  }, [ready]);

  /*
   * `listCities` A ÉTÉ RETIRÉ (23/07/2026).
   *
   * Il faisait un `select('city_id, name')` SANS AUCUNE LIMITE sur `city_zones`,
   * et son unique appelant en rendait UNE PILL PAR VILLE. Tenable à 2 villes ;
   * une requête non bornée et un écran illisible dès qu'une dizaine de villes
   * s'ouvrent, et impossible à l'échelle du référentiel européen. La lecture
   * vit maintenant dans `features/city/useCityCatalog` : bornée, avec ses
   * quatre états distincts et un drapeau de troncature.
   */

  return {
    ready,
    loading,
    loadFailed,
    crew,
    members,
    overview,
    overviewLoading,
    overviewFailed,
    mission,
    missionSectors,
    memberCount: members.length,
    maxMembers: CREW_MAX_MEMBERS,
    reload,
    createCrew,
    joinByCode,
    leaveCrew,
    fetchMyCode,
  };
}
