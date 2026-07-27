/**
 * GRYD — E39 · DÉCOUVERTE DES CREWS : la PERTINENCE, pure et testée.
 *
 * ═══ POURQUOI CE FICHIER EXISTE, ET PAS UN `order by` EN SQL ════════════════
 * §E39 fixe un ordre de pertinence explicite :
 *     ville > amis ou contacts > activité récente > capacité disponible >
 *     compatibilité Run/Bike.
 * Le pondérer côté serveur aurait enterré des constantes de jeu dans le schéma
 * (interdit, CLAUDE.md). La RPC `crew_discovery` (0083) ne renvoie donc que des
 * FAITS ; la décision d'ordre vit ici, sans I/O, sans horloge implicite, et se
 * teste ligne à ligne.
 *
 * ═══ L'ORDRE EST LEXICOGRAPHIQUE, PAS PONDÉRÉ — ET C'EST LE POINT ══════════
 * Un score `0.4 * amis + 0.3 * activité + …` aurait introduit cinq nombres que
 * personne ne peut justifier, et qui n'existent dans AUCUNE spec. Une
 * comparaison lexicographique exprime EXACTEMENT ce que §E39 écrit — « d'abord
 * la ville, puis les amis, puis… » — et n'a besoin d'aucune constante. Zéro
 * nombre magique, par construction et non par vigilance.
 *
 * ═══ CE QUI N'EST PAS UN CRITÈRE, MAIS UNE PARTITION ═══════════════════════
 * La JOIGNABILITÉ n'est pas dans la liste de §E39, et pourtant elle passe avant
 * tout : les crews qu'on ne peut pas rejoindre (fermés, sur invitation, pleins)
 * sont rendus APRÈS le bloc des crews joignables. Motif : cet écran existe pour
 * entrer dans un crew ; poser en tête un crew dont le bouton n'existera pas
 * serait un leurre — la même faute qu'un bouton mort (§A4), déplacée dans
 * l'ordre de la liste. Ils restent VISIBLES (leur existence est une vraie
 * information sur le quartier), simplement pas en tête.
 *
 * ═══ CE QU'ON NE SAIT PAS, ON LE DIT ═══════════════════════════════════════
 * §E39 cite « amis OU CONTACTS ». Les AMIS sont réels (`friendships` acceptées,
 * 0011) et comptés par la RPC. Les CONTACTS (carnet d'adresses) ne sont
 * collectés NULLE PART dans le dépôt : aucun import, aucune permission, aucune
 * table. Le critère est donc servi À MOITIÉ, et c'est écrit ici plutôt que
 * laissé croire — même discipline que les signaux non collectés de
 * `packages/engine/src/anticheat.ts`.
 *
 * Aucun import React, aucun accès réseau : ce module est PUR (testé en Deno).
 */
import { CREW_MAX_MEMBERS, type CrewRecruitmentStatus } from '@klaim/shared';

// ─── Ce que la RPC `crew_discovery` (0083) rend, tel quel ────────────────────

/** Discipline dominante d'un crew, DÉRIVÉE de son emprise réelle. */
export type CrewActivityProfile = 'run' | 'bike' | 'mixed' | 'unknown';

/**
 * Un crew tel que la découverte le connaît. Aucune identité de membre : la RPC
 * n'en renvoie pas (§12 — on ne voit pas les autres avant d'entrer).
 */
export interface DiscoveryCrew {
  id: string;
  name: string;
  /** Abréviation optionnelle : `crews.tag` est nullable, aucun crew n'en a par défaut. */
  tag: string | null;
  color: number;
  cityId: string;
  recruitmentStatus: CrewRecruitmentStatus;
  memberCount: number;
  /** Emprise VIVANTE (hexagones DISTINCTS tenus par les membres actifs). */
  hexesHeld: number;
  hexesRun: number;
  hexesBike: number;
  /** Dernière capture du crew en ms epoch, ou null s'il n'a jamais rien pris. */
  lastCaptureAtMs: number | null;
  /** Mes amis DÉJÀ dans ce crew (un entier, jamais des noms). */
  friendsInside: number;
  /** Ma candidature est-elle en cours sur ce crew ? */
  myRequestPending: boolean;
}

export interface DiscoveryPage {
  cityId: string;
  /** Nom lisible de la ville (city_zones), ou null si la zone n'en donne pas. */
  cityName: string | null;
  /** Le joueur est-il DÉJÀ dans un crew ? (change ce que l'écran propose.) */
  viewerInCrew: boolean;
  crews: readonly DiscoveryCrew[];
}

/** Motifs de refus, vocabulaire commun à `join_crew_by_code` (0043) et 0083. */
export type DiscoveryRefusal =
  | 'signed_out'
  | 'no_city'
  | 'not_found'
  | 'already_in_crew'
  | 'cooldown'
  | 'closed'
  | 'full';

// ─── Lecture DÉFENSIVE du jsonb (le serveur reste souverain) ─────────────────

const asText = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const asInt = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const asMs = (v: unknown): number | null => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

const RECRUITMENT: readonly string[] = ['open', 'on_request', 'invite_only', 'closed'];

/**
 * Un statut de recrutement INCONNU est ramené à 'closed', jamais à 'open'.
 * Le défaut le plus fermé est le seul qui ne peut pas peindre un bouton mort :
 * au pire on cache une action qui aurait marché, au mieux on n'en promet pas
 * une qui échoue. L'inverse serait un mensonge à l'écran.
 */
const asRecruitment = (v: unknown): CrewRecruitmentStatus =>
  (typeof v === 'string' && RECRUITMENT.includes(v)
    ? v
    : 'closed') as CrewRecruitmentStatus;

/** Parse UN crew. Rend `null` si l'identité manque — on ne rend pas un crew sans nom. */
export function parseDiscoveryCrew(raw: unknown): DiscoveryCrew | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const id = asText(o.id);
  const name = asText(o.name);
  const cityId = asText(o.cityId);
  if (!id || !name || !cityId) return null;
  return {
    id,
    name,
    tag: asText(o.tag),
    color: asInt(o.color),
    cityId,
    recruitmentStatus: asRecruitment(o.recruitmentStatus),
    memberCount: Math.max(0, asInt(o.memberCount)),
    hexesHeld: Math.max(0, asInt(o.hexesHeld)),
    hexesRun: Math.max(0, asInt(o.hexesRun)),
    hexesBike: Math.max(0, asInt(o.hexesBike)),
    lastCaptureAtMs: asMs(o.lastCaptureAt),
    friendsInside: Math.max(0, asInt(o.friendsInside)),
    myRequestPending: o.myRequestPending === true,
  };
}

/**
 * Parse la réponse complète. `null` = « je n'ai pas lu une page valide » —
 * l'écran doit alors afficher l'échec, JAMAIS une liste vide (une liste vide
 * dit « aucun crew ici », ce qui est une affirmation, pas une absence de
 * réponse). Les deux états sont distincts et le restent.
 */
export function parseDiscoveryPage(raw: unknown): DiscoveryPage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true) return null;
  const cityId = asText(o.cityId);
  if (!cityId) return null;
  const list = Array.isArray(o.crews) ? o.crews : [];
  const crews: DiscoveryCrew[] = [];
  for (const item of list) {
    const c = parseDiscoveryCrew(item);
    if (c) crews.push(c);
  }
  return {
    cityId,
    cityName: asText(o.cityName),
    viewerInCrew: o.viewerInCrew === true,
    crews,
  };
}

/** Motif de refus d'une réponse `{ok:false}`, ou `null` si la réponse est un succès. */
export function refusalOf(raw: unknown): DiscoveryRefusal | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== false) return null;
  const r = asText(o.reason);
  return (r ?? 'not_found') as DiscoveryRefusal;
}

/**
 * ─── CE QU'UN ÉCRAN DE LECTURE A LE DROIT DE PEINDRE FACE À UN REFUS ────────
 * (27/07/2026)
 *
 * LE BUG. E39 ne rendait QUE `no_city` ; E40 ne rendait QUE `not_found`. Or les
 * deux RPC de 0083 refusent AUSSI avec `signed_out` (l.267, l.385) — jeton
 * expiré côté serveur alors que la session locale existe encore — et `refusalOf`
 * rabat en outre tout motif inconnu sur `not_found`. Dans ces cas, `loading` et
 * `failed` valent `false` et la page vaut `null` : E40 tournait un
 * `ActivityIndicator` POUR TOUJOURS (« jamais de spinner infini »), et E39
 * rendait un champ de recherche au-dessus de RIEN — une liste muette qui se lit
 * « il n'y a aucun crew ». Ironie mesurée par l'audit : l'event §8 de E39
 * distinguait déjà ces états, l'analytics était plus honnête que l'écran.
 *
 * D'où cette fonction : le vocabulaire de refus est FERMÉ ici, une fois, et le
 * compilateur force chaque écran à traiter les quatre sorties. Il n'existe plus
 * de branche « aucune des conditions n'est vraie ».
 */
export type RefusalView =
  /** Ville inconnue : on la DEMANDE (jamais « près de chez toi »). */
  | 'no_city'
  /**
   * Le SERVEUR dit « pas connecté » alors que l'app tient une session : le
   * jeton a expiré. Distinct de `!session` (jamais connecté) — dans un cas
   * l'écran invite à se connecter, dans l'autre il explique que la session est
   * tombée. Le geste est le même, la phrase ne l'est pas.
   */
  | 'session_expired'
  /** Le crew (ou la ressource) n'existe pas / n'est plus visible. */
  | 'not_found'
  /**
   * Le serveur a refusé avec un motif qui n'a AUCUN sens en lecture
   * (`already_in_crew`, `cooldown`, `closed`, `full` appartiennent à
   * l'adhésion). On ne traduit pas au hasard : on dit qu'on n'a pas pu lire.
   * C'est le seul état de cette liste qui mérite « Réessayer ».
   */
  | 'unreadable';

/** Motif serveur → ce que l'écran peint. `null` (succès) reste `null`. */
export function refusalView(refusal: DiscoveryRefusal | null): RefusalView | null {
  switch (refusal) {
    case null:
      return null;
    case 'no_city':
      return 'no_city';
    case 'signed_out':
      return 'session_expired';
    case 'not_found':
      return 'not_found';
    // Vocabulaire d'ADHÉSION reçu sur une LECTURE : incohérent côté serveur.
    case 'already_in_crew':
    case 'cooldown':
    case 'closed':
    case 'full':
      return 'unreadable';
    default:
      // `refusalOf` caste une chaîne serveur inconnue dans le type : un motif
      // futur ne doit pas tomber dans un trou d'affichage.
      return 'unreadable';
  }
}

// ─── Dérivations pures ───────────────────────────────────────────────────────

/**
 * Places restantes. `CREW_MAX_MEMBERS` vient de game-rules (jamais un 50 écrit
 * ici) ; le `max(0, …)` protège d'un effectif au-dessus du plafond, cas
 * impossible en théorie mais qui afficherait un nombre négatif à l'écran.
 */
export function seatsLeft(crew: DiscoveryCrew): number {
  return Math.max(0, CREW_MAX_MEMBERS - crew.memberCount);
}

/**
 * Discipline dominante, DÉRIVÉE de l'emprise réelle — jamais déclarée par le
 * crew. Un crew sans aucune emprise est 'unknown' : il n'a rien montré, et lui
 * prêter une discipline serait inventer son identité (E14 : Run et Bike ne se
 * mélangent pas, donc on ne les moyenne pas non plus).
 */
export function crewActivityProfile(crew: DiscoveryCrew): CrewActivityProfile {
  if (crew.hexesRun === 0 && crew.hexesBike === 0) return 'unknown';
  if (crew.hexesBike === 0) return 'run';
  if (crew.hexesRun === 0) return 'bike';
  return 'mixed';
}

/**
 * Ce que l'écran a le DROIT de peindre comme action, d'après l'état RÉEL.
 * `none` n'est pas un échec : c'est l'absence de bouton, qui vaut toujours
 * mieux qu'un bouton qui échouera (§A4, « aucun bouton mort »).
 *
 * ⚠ Le serveur reste seul juge (`crew_join_intent`, 0083) : ceci décide de
 * l'AFFICHAGE, pas de l'effet. Un statut changé entre la lecture et le tap est
 * arbitré par la RPC, jamais par cet écran.
 */
export type JoinAffordance = 'join' | 'request' | 'pending' | 'none';

export function joinAffordance(
  crew: DiscoveryCrew,
  opts: { viewerInCrew: boolean },
): JoinAffordance {
  // Déjà dans un crew : aucune action d'adhésion n'aboutirait
  // (`already_in_crew`). Quitter est une décision qui se prend sur l'écran
  // Crew, pas un effet de bord d'un tap sur une fiche.
  if (opts.viewerInCrew) return 'none';
  if (crew.myRequestPending) return 'pending';
  if (crew.recruitmentStatus === 'closed' || crew.recruitmentStatus === 'invite_only') return 'none';
  if (seatsLeft(crew) <= 0) return 'none';
  return crew.recruitmentStatus === 'open' ? 'join' : 'request';
}

/** Un crew est « joignable » si une action d'adhésion existe vraiment pour moi. */
export function isJoinable(crew: DiscoveryCrew, opts: { viewerInCrew: boolean }): boolean {
  const a = joinAffordance(crew, opts);
  return a === 'join' || a === 'request';
}

// ─── LE CLASSEMENT DE PERTINENCE (§E39) ──────────────────────────────────────

export interface RelevanceContext {
  /** Ville du JOUEUR (pas celle de la recherche) — critère 1. */
  viewerCityId: string | null;
  /** Le joueur est-il déjà dans un crew ? (décide de la partition joignable.) */
  viewerInCrew: boolean;
  /**
   * Discipline du joueur — critère 5. `null` quand elle n'est pas connue :
   * le critère devient alors NEUTRE pour tout le monde, il ne départage plus.
   * On ne devine pas une discipline pour pouvoir trier.
   */
  viewerActivity: 'run' | 'bike' | null;
}

/**
 * Compatibilité Run/Bike, en trois valeurs ordonnées : 2 = le crew joue MA
 * discipline, 1 = indéterminé (crew mixte, crew sans emprise, ou discipline du
 * joueur inconnue), 0 = le crew joue EXCLUSIVEMENT l'autre discipline.
 * L'indéterminé se range ENTRE les deux : ne pas savoir n'est pas un défaut.
 */
export function activityFit(crew: DiscoveryCrew, viewerActivity: 'run' | 'bike' | null): 0 | 1 | 2 {
  if (viewerActivity === null) return 1;
  const profile = crewActivityProfile(crew);
  if (profile === 'unknown' || profile === 'mixed') return 1;
  return profile === viewerActivity ? 2 : 0;
}

/**
 * Comparateur §E39. Lit comme la spec, dans l'ordre de la spec.
 * Retour < 0 : `a` passe avant `b`.
 */
export function compareCrewRelevance(
  a: DiscoveryCrew,
  b: DiscoveryCrew,
  ctx: RelevanceContext,
): number {
  // PARTITION (avant tout critère) : joignable d'abord. Cf. docblock.
  const ja = isJoinable(a, { viewerInCrew: ctx.viewerInCrew }) ? 1 : 0;
  const jb = isJoinable(b, { viewerInCrew: ctx.viewerInCrew }) ? 1 : 0;
  if (ja !== jb) return jb - ja;

  // 1. VILLE — le crew de MA ville d'abord.
  const ca = ctx.viewerCityId !== null && a.cityId === ctx.viewerCityId ? 1 : 0;
  const cb = ctx.viewerCityId !== null && b.cityId === ctx.viewerCityId ? 1 : 0;
  if (ca !== cb) return cb - ca;

  // 2. AMIS (les « contacts » de §E39 ne sont collectés nulle part — docblock).
  if (a.friendsInside !== b.friendsInside) return b.friendsInside - a.friendsInside;

  // 3. ACTIVITÉ RÉCENTE — la dernière capture, la plus fraîche d'abord. Un crew
  //    qui n'a JAMAIS capturé n'est pas « ancien » : il est sans activité, donc
  //    il passe après tous ceux qui en ont une, quelle qu'elle soit.
  const la = a.lastCaptureAtMs;
  const lb = b.lastCaptureAtMs;
  if (la !== lb) {
    if (la === null) return 1;
    if (lb === null) return -1;
    return lb - la;
  }

  // 4. CAPACITÉ DISPONIBLE — plus de places restantes d'abord. (Les crews sans
  //    aucune place sont déjà sortis par la partition ci-dessus dès lors qu'ils
  //    sont pleins ; ce critère départage ceux qui ont de la marge.)
  const sa = seatsLeft(a);
  const sb = seatsLeft(b);
  if (sa !== sb) return sb - sa;

  // 5. COMPATIBILITÉ RUN/BIKE.
  const fa = activityFit(a, ctx.viewerActivity);
  const fb = activityFit(b, ctx.viewerActivity);
  if (fa !== fb) return fb - fa;

  // DÉPARTAGE FINAL — déterministe et stable, jamais aléatoire : deux lectures
  // de suite doivent rendre le MÊME ordre, sinon la liste bouge sous le doigt.
  const byName = a.name.localeCompare(b.name);
  return byName !== 0 ? byName : a.id.localeCompare(b.id);
}

/** Applique §E39 sans muter l'entrée (la source reste la réponse serveur). */
export function rankCrews(
  crews: readonly DiscoveryCrew[],
  ctx: RelevanceContext,
): readonly DiscoveryCrew[] {
  return [...crews].sort((a, b) => compareCrewRelevance(a, b, ctx));
}

// ─── E39 : les filtres minimaux de la spec ───────────────────────────────────

/**
 * §E39 demande trois filtres : proches / amis / ouverts. « Proches » est déjà
 * l'ÉTAT PAR DÉFAUT (la RPC ne sort pas de la ville) : en faire une case à
 * cocher laisserait croire qu'on peut la décocher pour voir le monde entier,
 * ce qui est faux. Restent donc deux filtres RÉELS, et `all` pour les lever.
 */
export type DiscoveryFilter = 'all' | 'friends' | 'open';

export function applyFilter(
  crews: readonly DiscoveryCrew[],
  filter: DiscoveryFilter,
  ctx: { viewerInCrew: boolean },
): readonly DiscoveryCrew[] {
  if (filter === 'friends') return crews.filter((c) => c.friendsInside > 0);
  if (filter === 'open') return crews.filter((c) => isJoinable(c, ctx));
  return crews;
}
