/**
 * GRYD — E48 · ACTIVITÉ ET ANNONCES CREW : la logique PURE (zéro React, zéro I/O).
 *
 * ═══ CE QUE E48 DEMANDE, ET CE QUE LE DÉPÔT AVAIT DÉJÀ ═════════════════════
 * La spéc (l.1698) range l'écran en QUATRE sections. Audit du 28/07/2026, par
 * grep, avant d'écrire une ligne :
 *
 *   1. ANNONCES ÉPINGLÉES — n'existaient PAS. Ni table, ni RPC, ni écran.
 *      `CREW_PERMISSIONS.pinMessage` décrivait un droit sur un objet absent —
 *      constat déjà écrit dans `packages/shared/src/events.ts` (bloc « E48 »).
 *      La migration 0096 crée `crew_announcements` et ses trois RPC.
 *   2. PROPOSITIONS DE SORTIE — EXISTAIENT (0019 + 0085 + écran E49). Rien
 *      n'est refait : ce module relit `CrewOuting`, le type de `crewOuting.ts`.
 *   3. CAPTURES ET DÉFENSES — `crew_feed_events` (0011) existe et est ÉCRITE
 *      par `ingest_run`, mais AUCUN client ne la lisait
 *      (`features/crew/feed.ts:13` le disait). E48 est son premier lecteur.
 *   4. DEMANDES D'AIDE — `crew_requests` (0019) existe SANS chemin d'écriture.
 *      La demande d'aide qui existe VRAIMENT est le PING DE ZONE (`crew_pings`,
 *      0051), déjà lu par `crew_pings_feed`. C'est celle-là qu'on rend.
 *
 * ═══ UN SEUL FIL, PAS DEUX ═════════════════════════════════════════════════
 * Ce module ne réimplémente NI `crew_pings_feed` NI `crew_outing_context` : il
 * consomme leurs types (`CrewPing`, `CrewOuting`). Il n'est pas non plus une
 * copie de `features/notifications/activityFeed.ts` — celui-ci ordonne le flux
 * PERSONNEL d'E23 (à défendre / rivalité / crew / progression, priorité fixe et
 * badge de cloche) ; celui-ci ordonne le flux D'UN CREW (quatre sections de la
 * spéc E48). Deux écrans, deux grammaires, zéro donnée partagée : les fusionner
 * aurait fait d'un badge de cloche personnel le compteur d'un mur collectif.
 *
 * ═══ CE QUI SE DÉCIDE ICI, ET RIEN D'AUTRE ═════════════════════════════════
 *   1. L'ORDRE des sections (constante, jamais un tri) et le tri INTERNE de
 *      chacune — qui n'est PAS le même partout (§3).
 *   2. Le refus de VIE PRIVÉE du corps d'une annonce (§2) — miroir SQL.
 *   3. Ce qui EMPÊCHE de publier, pour que le CTA chartreuse ne soit jamais un
 *      bouton mort (§A4).
 *   4. La lecture de la réponse serveur, sans jamais lui prêter une forme
 *      qu'elle n'a pas (`parse*` rend `null` plutôt qu'un objet à moitié
 *      inventé).
 *
 * ═══ LE SERVEUR RESTE SEUL JUGE ════════════════════════════════════════════
 * Rien ici n'AUTORISE. `crew_announcement_post` (0096) revérifie appartenance,
 * rôle, bornes, vie privée, modération et plafond, quoi que ce module ait pensé.
 */
import {
  CREW_ANNOUNCEMENT_BODY_MAX,
  CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW,
} from '@klaim/shared';
import { meetingPointRefusal, type CrewOuting, type MeetingPointRefusal } from './crewOuting';
import type { CrewPing } from './engine/crewSignals';

// ─── 1. Les quatre sections, dans l'ordre de la spéc ─────────────────────────

/**
 * Les QUATRE sections d'E48, dans l'ordre où la spéc les énumère :
 * annonces épinglées · propositions de sortie · captures et défenses ·
 * demandes d'aide.
 *
 * C'EST UNE CONSTANTE, PAS UN TRI. L'ordre encode une priorité éditoriale : une
 * annonce épinglée est ce que la direction du crew a voulu mettre en tête, et
 * un tri chronologique global l'enterrerait sous la dernière capture. Même
 * raison que `ACTIVITY_GROUP_ORDER` (E23) : renverser l'ordre changerait ce que
 * l'écran dit, pas seulement à quoi il ressemble.
 */
export type CrewActivitySection = 'announcement' | 'outing' | 'conquest' | 'help';

export const CREW_ACTIVITY_SECTION_ORDER: readonly CrewActivitySection[] = [
  'announcement',
  'outing',
  'conquest',
  'help',
];

// ─── 2. La garde de VIE PRIVÉE du corps d'une annonce ────────────────────────

/**
 * Motifs de refus d'une annonce qui désigne un LIEU PRÉCIS.
 *
 * Deux des trois sont DÉLÉGUÉS à `meetingPointRefusal` (E49) : un point de
 * rendez-vous et une annonce posent exactement le même risque — publier le
 * domicile de quelqu'un à vingt personnes — et deux listes de types de voie
 * auraient divergé au premier ajout d'un seul côté.
 */
export type AnnouncementPrivacyRefusal = 'coordinates' | MeetingPointRefusal;

/**
 * Couple de décimaux « latitude , longitude », dans les bornes du monde, avec
 * AU MOINS TROIS décimales de chaque côté.
 *
 * POURQUOI CE MOTIF N'EXISTE PAS DANS E49 : un point de rendez-vous est un
 * LIBELLÉ (« devant la fontaine ») ; personne n'y colle un couple décimal. Une
 * annonce est un champ libre où l'on colle ce qu'on a — et « 48.8566, 2.3522 »
 * est une position EXACTE, précisément ce que la constitution §7 interdit de
 * faire circuler.
 *
 * TROIS DÉCIMALES ET PAS UNE : à trois, on est à ~100 m — c'est une position.
 * À une ou deux, on attraperait « 3,5 km en 18,2 min », qui n'a rien à voir.
 * La virgule décimale est acceptée : l'Europe écrit « 48,8566 ; 2,3522 », et
 * c'est tout aussi précis.
 *
 * ⚠️ HEURISTIQUE DE FORME, comme celle d'E49. « 48.85 2.35 » (sans séparateur,
 * deux décimales) passe. Elle réduit la faute la plus courante — coller un
 * point GPS — elle ne rend pas un champ de texte sûr. La vraie protection reste
 * le périmètre de lecture (membres actifs du crew, policy 0096) et le retrait.
 *
 * MIROIR EXACT de `crew_announcement_refusal` (0096 §3) : le test PGlite relit
 * `ANNOUNCEMENT_PRIVACY_FIXTURES` ci-dessous et exige le même verdict des deux
 * côtés — sans quoi l'écran promettrait un refus que le serveur ignore (fuite
 * silencieuse) ou peindrait un CTA que le serveur refuse (bouton mort).
 */
const COORDINATE_PAIR = new RegExp(
  '(^|[^0-9.,-])' +
    '[+-]?([0-8]?[0-9][.,][0-9]{3,}|90[.,]0+)' +
    '\\s*[,;]\\s*' +
    '[+-]?(1[0-7][0-9]|[0-9]{1,2})[.,][0-9]{3,}' +
    '([^0-9.,]|$)',
);

/**
 * Le corps d'une annonce désigne-t-il un lieu précis ? `null` = il passe.
 *
 * PUR et sans horloge. L'ordre des tests suit celui du SQL : les coordonnées
 * d'abord (le motif propre à ce champ), puis l'adresse déléguée.
 */
export function announcementPrivacyRefusal(body: string): AnnouncementPrivacyRefusal | null {
  if (body.trim() === '') return null; // vide : c'est « champ obligatoire », pas un refus
  if (COORDINATE_PAIR.test(body)) return 'coordinates';
  return meetingPointRefusal(body);
}

/**
 * CAS DE RÉFÉRENCE PARTAGÉS AVEC LE SERVEUR — ne pas les déplacer.
 *
 * Même dispositif que `MEETING_POINT_FIXTURES` (E49) : cette liste est LUE PAR
 * DEUX TESTS qui ne tournent pas dans le même monde —
 *   · `crewActivity.test.ts` (Deno) la passe dans `announcementPrivacyRefusal` ;
 *   · `supabase/tests/crew_announcements.pglite.test.mjs` RELIT CE FICHIER,
 *     extrait la liste, et la passe dans `crew_announcement_refusal` (SQL).
 * Les deux exigent le même verdict.
 *
 * Elle ne rejoue PAS les cas d'adresse d'E49 (ils sont déjà couverts par
 * `MEETING_POINT_FIXTURES`, et la délégation est prouvée par les deux dernières
 * lignes) : elle couvre ce qui est PROPRE à ce champ — les coordonnées, et les
 * phrases de crew qui contiennent des nombres et doivent PASSER.
 */
export const ANNOUNCEMENT_PRIVACY_FIXTURES: readonly (readonly [
  string,
  AnnouncementPrivacyRefusal | null,
])[] = [
  // ── Ce qui PASSE : de vraies annonces de crew ────────────────────────────
  ['On se retrouve au parc dimanche matin.', null],
  ['Objectif de la semaine : tenir République.', null],
  ['Sortie longue 12,5 km — rythme tranquille.', null],
  ['Rendez-vous 18h30 devant la fontaine.', null],
  ['Bienvenue aux 3 nouveaux !', null],
  ['Record du crew : 42,195 km cumulés hier.', null],
  // Deux décimales : c'est une distance, pas une position (~1 km de précision).
  ['On vise 48,85 de moyenne, allez.', null],
  // ── Ce qui est REFUSÉ : un couple de coordonnées ─────────────────────────
  ['Point de départ 48.8566, 2.3522', 'coordinates'],
  ['48,8566 ; 2,3522', 'coordinates'],
  ['RDV ici : -22.9068, -43.1729 à 8h', 'coordinates'],
  ['52.5200,13.4050', 'coordinates'],
  // ── La délégation à E49 fonctionne (adresse + porte) ─────────────────────
  ['On part de 12 rue de la Paix', 'street_address'],
  ['Chez moi, digicode 45A12', 'door_detail'],
];

// ─── 3. Ce qui EMPÊCHE de publier (§A4 : jamais un CTA condamné) ─────────────

/**
 * Ce qui bloque la publication d'une annonce. `null` = elle peut partir.
 *
 * L'ORDRE COMPTE, et il n'est pas le même que celui du serveur. Le serveur
 * teste le rôle AVANT la forme (il refuse un intrus au plus tôt) ; l'écran
 * teste le rôle AUSSI en premier, mais pour une autre raison : sans le droit
 * d'épingler, le champ de saisie n'est même pas peint. Les autres suivent
 * l'ordre de ce que la personne vient de faire — trop court, trop long, lieu
 * précis — puis le plafond, seul motif qui ne dépend pas de ce qu'elle a écrit.
 *
 * ⚠️ CE N'EST PAS UNE AUTORISATION. `crew_announcement_post` (0096) retranche
 * tout, y compris la MODÉRATION de langage — que ce module ne reproduit
 * délibérément PAS : le filtre de prose vit dans `crew_description_refusal`
 * (0084, SQL) et le recopier côté client en donnerait la liste, c'est-à-dire le
 * mode d'emploi de son contournement. Une annonce peut donc être refusée pour
 * un motif que l'écran n'avait pas anticipé : c'est assumé, et l'écran dit ce
 * refus-là sans le détailler (doctrine 0050/0084).
 */
export type AnnouncementBlock =
  | 'forbidden'
  | 'empty'
  | 'too_long'
  | 'privacy'
  | 'too_many';

export interface AnnouncementDraftContext {
  /** CREW_PERMISSIONS.pinMessage, tranché SERVEUR — jamais dérivé ici. */
  canPost: boolean;
  /** Annonces VIVANTES déjà publiées dans le crew. */
  activeCount: number;
  /** Plafond SERVEUR (rendu par la RPC), jamais la constante locale. */
  maxActive: number;
}

export function announcementBlockReason(
  body: string,
  ctx: AnnouncementDraftContext,
): AnnouncementBlock | null {
  if (!ctx.canPost) return 'forbidden';
  const trimmed = body.trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.length > CREW_ANNOUNCEMENT_BODY_MAX) return 'too_long';
  if (announcementPrivacyRefusal(trimmed) !== null) return 'privacy';
  if (ctx.activeCount >= ctx.maxActive) return 'too_many';
  return null;
}

/**
 * Caractères restants avant la borne. NÉGATIF quand on l'a dépassée — c'est
 * volontaire : l'écran doit pouvoir dire « 12 de trop », pas s'arrêter à 0. Un
 * compteur bloqué à zéro ne dit pas de combien il faut couper.
 *
 * Compté sur le corps DÉTOURÉ, comme le CHECK SQL : « 280 espaces » n'est pas
 * une annonce, et un compteur qui compterait les espaces de bord annoncerait un
 * refus que le serveur ne fera pas (ou l'inverse).
 */
export function announcementRemaining(body: string): number {
  return CREW_ANNOUNCEMENT_BODY_MAX - body.trim().length;
}

/**
 * AI-JE LE DROIT DE RETIRER CETTE ANNONCE ? Miroir EXACT de la garde serveur
 * (`crew_announcement_remove`, 0096 §7) :
 *
 *     if v_author <> v_uid and v_role not in ('co_captain','founder')
 *       then return … 'forbidden';
 *
 * ⚠ CE N'EST PAS UNE PERMISSION, C'EST UN AFFICHAGE. Le serveur reste seul juge
 * — cette fonction ne décide de rien, elle décide seulement s'il faut PEINDRE
 * le bouton. Le 28/07/2026 il était peint sur CHAQUE ligne, sans condition : un
 * rookie voyait « Retirer » sur l'annonce de son capitaine, et le geste
 * échouait TOUJOURS (constitution §2, aucun bouton mort). La donnée manquante
 * était pourtant déjà à l'écran.
 *
 * `canPost` EST le prédicat de direction : le serveur le calcule avec la MÊME
 * expression `v_role in ('co_captain','founder')` (0096:405). On le réutilise
 * plutôt que de re-dériver la matrice côté client — deux copies d'une règle de
 * rôle finissent toujours par diverger, et c'est celle du serveur qui gagne.
 *
 * `myUserId === null` (session non lue) ⇒ on ne peint que si la direction est
 * établie : sans identité, « c'est la mienne » n'est pas vérifiable, et le plus
 * prudent est de ne rien promettre.
 */
export function canRemoveAnnouncement(input: {
  /** `author_id` rendu par le serveur (jamais affiché, cf. `CrewAnnouncement`). */
  authorId: string;
  /** Mon id de session, ou `null` si elle n'est pas (encore) lue. */
  myUserId: string | null;
  /** `ctx.canPost` — la direction, TRANCHÉE SERVEUR. */
  canPost: boolean;
}): boolean {
  if (input.canPost) return true;
  if (input.myUserId === null || input.myUserId === '') return false;
  return input.authorId === input.myUserId;
}

// ─── 4. Les objets du fil, et leur lecture ───────────────────────────────────

/** Une annonce épinglée, telle que `crew_announcement_row` (0096 §4) la rend. */
export interface CrewAnnouncement {
  id: string;
  body: string;
  /**
   * Auteur. Sort du serveur pour DEUX gestes et pour eux seuls : savoir si
   * l'annonce est la mienne (donc si je peux la retirer), et la masquer si son
   * auteur est bloqué. Jamais affiché.
   */
  authorId: string;
  /** `null` si le profil public n'existe plus (compte supprimé). */
  authorPseudo: string | null;
  createdAtMs: number;
}

/**
 * Un FAIT du crew, lu de `crew_feed_events`.
 *
 * ⚠️ DEUX TYPES, PAS DIX. Le CHECK de 0011/0015 en autorise dix ; `ingest_run`
 * n'en écrit que deux (grep du 28/07/2026, deux `insert`). Les huit autres
 * ('capture', 'defense', 'badge', 'rank_up', 'chest', 'group_run', 'join',
 * 'offensive') NE SONT ÉCRITS PAR RIEN. Les déclarer ici ferait croire à un
 * affichage qui n'aura jamais de ligne.
 *
 * ⚠️ 'contested' EST INSÉRÉ POUR LES DEUX CREWS avec le MÊME payload
 * (ingest_run:1915-1918) : rien dedans ne dit de quel côté on est. L'écran rend
 * donc un fait NEUTRE. Prétendre « vous avez repris » serait faux une fois sur
 * deux, et « vous avez perdu » violerait l'anti-shame (§11).
 *
 * ⚠️ CORRECTION DU 28/07/2026 : le payload était neutre, PAS la ligne rendue.
 * `crew_activity_feed` y ajoutait `actorPseudo` — l'id inséré étant celui de
 * L'ATTAQUANT dans les deux flux, le fil de la VICTIME nommait un joueur du crew
 * rival. `actorPseudo` est désormais forcé à `null` pour ce type (voir
 * `parseCrewConquest`), et la migration 0099 le coupe aussi côté serveur.
 */
export type CrewConquestKind = 'boundary_completed' | 'contested';

export interface CrewConquest {
  id: string;
  kind: CrewConquestKind;
  /**
   * Nom RÉEL de la frontière fermée (`payload.name`, ingest_run:2145). `null`
   * pour 'contested', qui n'en porte pas — et jamais un nom de repli inventé.
   */
  name: string | null;
  /** `null` si l'acteur n'a plus de profil public. */
  actorPseudo: string | null;
  /**
   * Instant TRONQUÉ À L'HEURE par le serveur (PUBLIC_TIMESTAMP_TRUNC) et déjà
   * DIFFÉRÉ de TERRITORY_PUBLISH_DELAY_MINUTES. L'écran n'a donc jamais accès à
   * la minute exacte d'une course — et ne doit pas prétendre le contraire en
   * affichant une horloge.
   */
  createdAtMs: number;
}

/** Ce que `crew_activity_feed()` rend quand la lecture aboutit. */
export interface CrewActivityContext {
  role: string;
  /** CREW_PERMISSIONS.pinMessage, tranché SERVEUR. */
  canPost: boolean;
  announcements: readonly CrewAnnouncement[];
  conquests: readonly CrewConquest[];
  maxAnnouncements: number;
  bodyMax: number;
}

/** Refus RENDUS par les RPC d'E48, plus les cas de transport. Aucun n'est muet. */
export type CrewActivityRefusal =
  | 'signed_out'
  | 'no_crew'
  | 'forbidden'
  | 'bad_body'
  | 'body_looks_like_place'
  | 'body_unavailable'
  | 'too_many_active'
  | 'not_found';

const REFUSALS: readonly CrewActivityRefusal[] = [
  'signed_out',
  'no_crew',
  'forbidden',
  'bad_body',
  'body_looks_like_place',
  'body_unavailable',
  'too_many_active',
  'not_found',
];

/** Motif de refus d'une réponse jsonb, ou `null` si ce n'en est pas une. */
export function activityRefusalOf(data: unknown): CrewActivityRefusal | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.ok !== false) return null;
  const reason = o.reason;
  return typeof reason === 'string' && (REFUSALS as readonly string[]).includes(reason)
    ? (reason as CrewActivityRefusal)
    : null;
}

/**
 * Sous-motif d'un refus de vie privée (`kind`), pour que l'écran dise LA bonne
 * phrase sans deviner laquelle a mordu. `null` si le serveur n'en donne pas.
 */
export function activityRefusalKindOf(data: unknown): AnnouncementPrivacyRefusal | null {
  if (!data || typeof data !== 'object') return null;
  const kind = (data as Record<string, unknown>).kind;
  return kind === 'coordinates' || kind === 'street_address' || kind === 'door_detail'
    ? kind
    : null;
}

const asText = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

/** Instant serveur → ms epoch, ou `null`. Jamais `Date.now()` en repli : une
 *  ligne sans date lisible ne peut pas être datée, donc elle ne s'affiche pas. */
const asMs = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * jsonb → annonce, ou `null` si la forme n'est pas celle attendue.
 *
 * Une ligne incomplète est ÉCARTÉE, jamais complétée : une annonce sans corps,
 * sans auteur ou sans date ne peut pas produire un affichage vrai — et un
 * affichage à trous (« — a écrit  » ) est pire qu'une annonce manquante.
 * Même doctrine que `parseCrewPingsFeed` (pings.ts).
 */
export function parseCrewAnnouncement(raw: unknown): CrewAnnouncement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = asText(o.id);
  const body = typeof o.body === 'string' ? o.body.trim() : '';
  const authorId = asText(o.authorId);
  const createdAtMs = asMs(o.createdAt);
  if (!id || body === '' || !authorId || createdAtMs === null) return null;
  return { id, body, authorId, authorPseudo: asText(o.authorPseudo), createdAtMs };
}

/**
 * jsonb → fait du crew, ou `null`. Un `kind` inconnu de ce build tombe : on
 * n'affiche jamais une clé technique, et on n'invente pas de libellé.
 *
 * ⚠ 'contested' N'EST JAMAIS ATTRIBUÉ À QUELQU'UN, ET C'EST UNE RÈGLE DE VIE
 * PRIVÉE (constitution §7). `ingest_run` insère ce fait DANS LES DEUX FLUX —
 * attaquant ET victime — avec l'id de L'ATTAQUANT (index.ts:1915-1918). Le fil
 * du crew attaqué nommait donc un joueur du crew RIVAL, avec l'heure de sa
 * sortie. La migration 0099 coupe la fuite côté serveur ; ce filtre la coupe
 * AUSSI côté client, et ce n'est pas une redondance décorative :
 *   · 0096 et 0099 ne sont PAS appliquées en production au 28/07/2026 — jusqu'à
 *     ce qu'elles le soient, ce parseur est la SEULE protection en vigueur ;
 *   · un client à jour peut parler à une base en retard (une seule des deux
 *     migrations appliquée) : la garde doit tenir des deux côtés.
 * On perd au passage l'attribution du fait 'contested' dans le fil de
 * l'ATTAQUANT, où elle serait légitime. C'est assumé : le client ne peut pas
 * distinguer les deux flux (le payload est identique par construction), et
 * refuser un nom qu'on aurait pu montrer coûte moins qu'en montrer un qu'on
 * n'avait pas le droit d'exposer.
 */
export function parseCrewConquest(raw: unknown): CrewConquest | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = asText(o.id);
  const kind = o.kind;
  const createdAtMs = asMs(o.createdAt);
  if (!id || createdAtMs === null) return null;
  if (kind !== 'boundary_completed' && kind !== 'contested') return null;
  return {
    id,
    kind,
    name: asText(o.name),
    actorPseudo: kind === 'contested' ? null : asText(o.actorPseudo),
    createdAtMs,
  };
}

/** jsonb `crew_activity_feed` → contexte, ou `null` (refus, réseau, contrat futur). */
export function parseCrewActivityContext(raw: unknown): CrewActivityContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true) return null;
  const role = asText(o.role);
  if (!role) return null;
  const announcements = Array.isArray(o.announcements)
    ? o.announcements.map(parseCrewAnnouncement).filter((a): a is CrewAnnouncement => a !== null)
    : [];
  const conquests = Array.isArray(o.conquests)
    ? o.conquests.map(parseCrewConquest).filter((c): c is CrewConquest => c !== null)
    : [];
  // Le plafond vient du SERVEUR. La constante locale n'est qu'un repli quand un
  // serveur plus ancien ne le rend pas — jamais la source, sinon un client
  // périmé afficherait « 3 max » là où le serveur en accepte 5.
  const maxAnnouncements =
    typeof o.maxAnnouncements === 'number' && Number.isFinite(o.maxAnnouncements)
      ? o.maxAnnouncements
      : CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW;
  const bodyMax =
    typeof o.bodyMax === 'number' && Number.isFinite(o.bodyMax)
      ? o.bodyMax
      : CREW_ANNOUNCEMENT_BODY_MAX;
  return {
    role,
    canPost: o.canPost === true,
    announcements,
    conquests,
    maxAnnouncements,
    bodyMax,
  };
}

// ─── 5. Le fil : quatre sections, quatre tris ────────────────────────────────

/**
 * Une ligne du fil. Union DISCRIMINÉE plutôt qu'un objet à champs optionnels :
 * une sortie et une annonce n'ont rien en commun à l'écran, et un
 * `{ body?, title?, name? }` aurait rendu possible une ligne à trois nulls.
 */
export type CrewActivityItem =
  | { section: 'announcement'; sortKey: number; announcement: CrewAnnouncement }
  | { section: 'outing'; sortKey: number; outing: CrewOuting }
  | { section: 'conquest'; sortKey: number; conquest: CrewConquest }
  | { section: 'help'; sortKey: number; ping: CrewPing };

export interface CrewActivityGroup {
  section: CrewActivitySection;
  items: CrewActivityItem[];
}

export interface CrewActivityInputs {
  announcements: readonly CrewAnnouncement[];
  /** Sorties À VENIR, telles que `crew_outing_context()` les rend. */
  outings: readonly CrewOuting[];
  conquests: readonly CrewConquest[];
  /** Pings encore VIVANTS, tels que `visibleCrewPings` les rend. */
  pings: readonly CrewPing[];
  /**
   * Auteurs MASQUÉS (pseudos bloqués, `features/crew/blocklist.ts`). Le blocage
   * est une obligation Apple 1.2 ET une promesse faite au joueur : un fil qui
   * afficherait quand même le texte d'un bloqué la romprait.
   *
   * Les annonces se filtrent sur l'AUTEUR, les pings aussi. Les faits du crew
   * (conquêtes) NE SE FILTRENT PAS : ce ne sont pas des paroles, ce sont des
   * mesures — masquer une capture parce qu'on a bloqué son auteur ferait
   * DISPARAÎTRE un fait de territoire, c'est-à-dire mentir sur le jeu. Le
   * pseudo, lui, est déjà masqué à l'affichage par `displayedPseudo`.
   */
  isBlocked: (pseudo: string | null) => boolean;
}

/**
 * LE TRI N'EST PAS LE MÊME DANS TOUTES LES SECTIONS, et c'est le cœur de ce
 * module :
 *   · annonces, faits et demandes d'aide regardent le PASSÉ → plus RÉCENT
 *     d'abord (`-createdAt`) ;
 *   · les propositions de sortie regardent l'AVENIR → plus PROCHE d'abord
 *     (`+startsAt`). Les trier par récence de publication mettrait en tête le
 *     rendez-vous annoncé hier pour dans trois mois, et enterrerait celui de ce
 *     soir. C'est exactement le genre de faute qu'un tri unique « par date »
 *     produit sans que personne ne la voie.
 *
 * `sortKey` porte l'instant utilisé, pour que le tri reste lisible et testable.
 * Une sortie SANS `startsAt` (ligne héritée de 0019, avant que 0085 n'existe)
 * n'a pas d'instant : elle passe EN DERNIER de sa section plutôt que d'être
 * écartée — elle est réelle, seulement mal datée.
 */
const NO_DATE_SORT_KEY = Number.MAX_SAFE_INTEGER;

export function buildCrewActivity(inputs: CrewActivityInputs): CrewActivityGroup[] {
  const announcements: CrewActivityItem[] = inputs.announcements
    .filter((a) => !inputs.isBlocked(a.authorPseudo))
    .map((a) => ({ section: 'announcement' as const, sortKey: a.createdAtMs, announcement: a }))
    .sort((x, y) => y.sortKey - x.sortKey);

  const outings: CrewActivityItem[] = inputs.outings
    .map((o) => ({
      section: 'outing' as const,
      sortKey: o.startsAt ? (Date.parse(o.startsAt) || NO_DATE_SORT_KEY) : NO_DATE_SORT_KEY,
      outing: o,
    }))
    .sort((x, y) => x.sortKey - y.sortKey);

  const conquests: CrewActivityItem[] = inputs.conquests
    .map((c) => ({ section: 'conquest' as const, sortKey: c.createdAtMs, conquest: c }))
    .sort((x, y) => y.sortKey - x.sortKey);

  const help: CrewActivityItem[] = inputs.pings
    .filter((p) => !inputs.isBlocked(p.authorPseudo))
    .map((p) => ({ section: 'help' as const, sortKey: p.createdAt, ping: p }))
    .sort((x, y) => y.sortKey - x.sortKey);

  const bySection: Record<CrewActivitySection, CrewActivityItem[]> = {
    announcement: announcements,
    outing: outings,
    conquest: conquests,
    help,
  };

  // Les sections VIDES sont OMISES — jamais un en-tête au-dessus du néant.
  // Même règle que `buildActivityFeed` (E23) : « pas d'événement → section
  // absente ». Le cas « TOUTES vides » n'est PAS traité ici : c'est l'état vide
  // de l'écran, et c'est lui qui doit le dire dignement — un moteur qui rend
  // une liste vide n'affirme rien, ni « rien ne s'est passé » ni « échec ».
  return CREW_ACTIVITY_SECTION_ORDER.map((section) => ({
    section,
    items: bySection[section],
  })).filter((g) => g.items.length > 0);
}

/**
 * Le fil est-il RÉELLEMENT vide ? (au sens : lu, et sans une seule ligne).
 *
 * Fonction séparée parce que l'écran doit distinguer QUATRE états et que
 * `buildCrewActivity` ne peut en distinguer qu'un : `[]` sort aussi bien d'un
 * crew calme que d'un filtrage complet par blocage. Ici, on répond à la seule
 * question que l'état vide pose — « y a-t-il quelque chose à montrer ? » — et
 * jamais à « pourquoi ? », qui appartient à l'appelant.
 */
export function isCrewActivityEmpty(groups: readonly CrewActivityGroup[]): boolean {
  return groups.length === 0;
}
