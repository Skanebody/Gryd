/**
 * GRYD — E46 « Membres et rôles » + E47 « Actions sur un membre », côté RÈGLE.
 *
 * ─── CE QUE CE MODULE EST, ET SURTOUT CE QU'IL N'EST PAS ─────────────────────
 * Il ne DÉCIDE rien. Le serveur seul décide (`crew_set_member_role`,
 * `crew_remove_member`, `crew_transfer_lead` — migration 0093), et il rejuge
 * intégralement chaque appel : ce fichier ne fait que refuser de PEINDRE un
 * bouton dont on sait d'avance qu'il serait refusé. C'est la constitution §2
 * (« aucun bouton mort ») appliquée à la seule feuille de l'app qui donne du
 * pouvoir sur d'autres personnes.
 *
 * La distinction n'est pas rhétorique : si ce module se trompait en étant trop
 * PERMISSIF, on aurait un bouton qui échoue — une faute d'interface, visible.
 * S'il se trompait en étant trop RESTRICTIF, on aurait une action introuvable —
 * une faute d'interface, visible aussi. Dans aucun des deux cas la sécurité ne
 * dépend de lui. Les bornes qui protègent réellement (auto-promotion,
 * exclusion du propriétaire, périmètre du co_captain) sont en PL/pgSQL, testées
 * en PGlite (`supabase/tests/crew_member_roles.pglite.test.mjs`).
 *
 * ─── POURQUOI IL EXISTE MALGRÉ TOUT ──────────────────────────────────────────
 * Parce que sans lui, chaque surface réinventerait la frontière officier/membre
 * et le périmètre du co_captain — et deux écrans finiraient par ne pas appeler
 * « officier » les mêmes personnes. Tout vient de `@klaim/shared` :
 * `CREW_ROLE_GROUPS` (les trois groupes de la spéc), `CREW_PERMISSIONS` (qui
 * peut quoi), `CO_CAPTAIN_*` (les deux limites non exprimables en liste plate).
 * AUCUN rôle n'est écrit en dur ici.
 *
 * ─── PUR : AUCUN REACT, AUCUN RÉSEAU ─────────────────────────────────────────
 * Règle projet — logique = fonction pure + tests Deno. Le fichier ne connaît ni
 * `useState`, ni supabase-js, ni un pseudo : il manipule des rôles et des
 * identifiants. Les appels vivent dans `memberRolesData.ts`, l'écran dans
 * `CrewRoster.tsx`.
 *
 * ⚠ MIROIR À TENIR. Chaque règle ci-dessous existe DEUX FOIS : ici, et dans
 * 0093. Les tests Deno de ce fichier et le test PGlite de la migration
 * vérifient la même table de vérité — si l'un des deux dérive, l'autre le dit.
 */
import {
  CO_CAPTAIN_KICKABLE_ROLES,
  CO_CAPTAIN_PROMOTE_MAX_ROLE,
  CREW_PERMISSIONS,
  CREW_ROLES,
  CREW_ROLE_GROUPS,
  CREW_ROLE_GROUP_ORDER,
  type CrewMemberAction,
  type CrewPermissionAction,
  type CrewRole,
  type CrewRoleGroup,
} from '@klaim/shared';

// ─── Rôles : lecture, jamais réécriture ──────────────────────────────────────

/**
 * `role` est-il un des sept rôles connus ? Le serveur reste souverain sur la
 * valeur (`crew_overview` la rend en `text`) : un rôle inconnu doit pouvoir
 * traverser l'écran sans le casser, et sans qu'on lui invente des droits.
 */
export function isCrewRole(role: string): role is CrewRole {
  return (CREW_ROLES as readonly string[]).includes(role);
}

/**
 * Rang hiérarchique (rookie=0 … founder=6), ou -1 si le rôle est inconnu.
 * MIROIR EXACT de `public.crew_role_rank` (0093) et de `crewRoleRank`
 * (packages/engine/src/crew.ts). -1 place l'inconnu SOUS tout le monde : il ne
 * peut donc rien faire à personne, jamais l'inverse.
 */
export function roleRank(role: string): number {
  return (CREW_ROLES as readonly string[]).indexOf(role);
}

/** Le rôle a-t-il la permission `action` (matrice §8) ? Rôle inconnu → non. */
export function roleHas(role: string, action: CrewPermissionAction): boolean {
  return isCrewRole(role) && (CREW_PERMISSIONS[action] as readonly CrewRole[]).includes(role);
}

/**
 * Groupe d'affichage E46 d'un rôle (chef / officiers / membres), ou `null` si
 * le rôle est inconnu — auquel cas la ligne n'est PAS inventée dans un groupe :
 * elle rejoint « membres » par décision explicite de l'appelant, ou nulle part.
 */
export function groupOf(role: string): CrewRoleGroup | null {
  for (const g of CREW_ROLE_GROUP_ORDER) {
    if ((CREW_ROLE_GROUPS[g] as readonly string[]).includes(role)) return g;
  }
  return null;
}

// ─── E46 : le roster rangé en trois groupes ──────────────────────────────────

/** Le strict nécessaire pour ranger une ligne. L'appelant garde le reste. */
export interface RosterEntry {
  userId: string;
  role: string;
}

/** Un groupe rendu à l'écran, avec ses lignes DANS L'ORDRE reçu. */
export interface RosterGroup<T extends RosterEntry> {
  group: CrewRoleGroup;
  members: T[];
}

/**
 * Range un roster en trois groupes E46, dans l'ordre d'affichage de la spéc
 * (chef, officiers, membres).
 *
 * DEUX CHOIX QUI SE VOIENT À L'ÉCRAN :
 *  · les groupes VIDES sont conservés (`members: []`). Un crew neuf n'a aucun
 *    officier : masquer le groupe ferait paraître la hiérarchie cassée, alors
 *    que « personne, pour l'instant » est un fait, et un fait lisible.
 *  · À L'INTÉRIEUR d'un groupe, l'ordre reçu est PRÉSERVÉ tel quel. Le roster
 *    arrive trié par ancienneté (`real.ts`, `order('joined_at')`) et l'écran ne
 *    doit pas sauter sous le doigt quand `crew_overview` enrichit les rôles.
 *    Un rôle inconnu du serveur atterrit dans « membres » : il n'ouvre aucun
 *    droit (cf. `roleHas`), il occupe juste sa place — jamais un groupe inventé.
 */
export function groupRoster<T extends RosterEntry>(members: readonly T[]): RosterGroup<T>[] {
  const byGroup = new Map<CrewRoleGroup, T[]>();
  for (const g of CREW_ROLE_GROUP_ORDER) byGroup.set(g, []);
  for (const m of members) {
    const g = groupOf(m.role) ?? 'members';
    byGroup.get(g)!.push(m);
  }
  return CREW_ROLE_GROUP_ORDER.map((group) => ({ group, members: byGroup.get(group)! }));
}

// ─── E47 : ce que je peux réellement faire sur CETTE personne ────────────────

/** Ce que l'écran sait au moment d'ouvrir la feuille sur une ligne. */
export interface MemberActionContext {
  /** MON rôle, lu en base (`crew_overview.role`), jamais choisi par le client. */
  actorRole: string;
  /** Le rôle de la personne visée, tel que le serveur l'a rendu. */
  targetRole: string;
  /** Est-ce MA propre ligne ? */
  isMe: boolean;
}

/**
 * Les quatre actions de RÔLE réellement exerçables sur cette personne.
 *
 * `report` et `block` n'y sont PAS : ce sont des droits de personne, pas de
 * rôle (Guideline App Store 1.2 — ils restent ouverts à tout le monde), et leur
 * éligibilité est déjà dérivée par `moderationActionsFor` (blocklist.ts), qui
 * connaît la session et la liste des bloqués. Les mélanger ici obligerait ce
 * module pur à connaître l'état de session — et ferait de la modération un
 * privilège, ce qu'elle ne doit jamais devenir.
 *
 * MIROIR DE 0093, borne pour borne :
 *   · jamais sur soi-même (`CREW_MEMBER_ACTIONS[].onSelf === false`) ;
 *   · la permission `promote` / `demote` / `kick` / `transferFoundership` ;
 *   · JAMAIS sur quelqu'un de rang ≥ au sien — ce qui rend le `founder`
 *     intouchable, y compris par un autre founder (il n'y en a jamais deux) ;
 *   · périmètre du co_captain : `CO_CAPTAIN_KICKABLE_ROLES` pour l'exclusion,
 *     `CO_CAPTAIN_PROMOTE_MAX_ROLE` pour la promotion et la rétrogradation ;
 *   · `promote` n'apparaît que s'il existe un rôle AU-DESSUS qui reste dans mon
 *     périmètre, `demote` que s'il en existe un EN DESSOUS. Peindre « promouvoir »
 *     sur quelqu'un déjà au plafond de mon périmètre serait un bouton mort — la
 *     feuille n'aurait aucun rôle à proposer.
 */
export function roleActionsFor(ctx: MemberActionContext): CrewMemberAction[] {
  const { actorRole, targetRole, isMe } = ctx;
  if (isMe) return [];
  if (!isCrewRole(actorRole) || !isCrewRole(targetRole)) return [];

  const actorRank = roleRank(actorRole);
  const targetRank = roleRank(targetRole);
  // Rang ≥ au mien : je ne peux rien. Le founder (rang max) est ainsi hors
  // d'atteinte de tout le monde — le transfert est le SEUL chemin.
  if (targetRank >= actorRank) return [];

  const out: CrewMemberAction[] = [];
  const assignable = assignableRolesFor(actorRole, targetRole);
  if (assignable.some((r) => roleRank(r) > targetRank)) out.push('promote');
  if (assignable.some((r) => roleRank(r) < targetRank)) out.push('demote');

  if (roleHas(actorRole, 'kick')) {
    const inScope =
      actorRole === 'founder' ||
      (CO_CAPTAIN_KICKABLE_ROLES as readonly string[]).includes(targetRole);
    if (inScope) out.push('remove');
  }

  // Le transfert ne se propose qu'au founder, et seulement vers un membre —
  // c'est-à-dire n'importe qui d'autre, puisque personne n'est à son rang.
  if (roleHas(actorRole, 'transferFoundership')) out.push('transfer_lead');

  return out;
}

/**
 * Les rôles que je peux ATTRIBUER à cette personne (hors son rôle actuel).
 *
 * C'est ce que la feuille propose une fois « promouvoir » ou « rétrograder »
 * choisi : une liste FERMÉE, jamais un champ libre. `founder` en est
 * structurellement absent — il ne s'attribue pas, il se transmet
 * (`crew_transfer_lead`), et 0093 refuse `bad_role` si on essayait quand même.
 *
 * Deux plafonds se cumulent, et ils ne disent pas la même chose :
 *  · MON rang : je n'attribue jamais mon propre niveau ni au-dessus (sinon un
 *    co_captain fabriquerait des co_captains, donc des pairs qu'il ne pourrait
 *    plus gérer, et l'escalade serait ouverte) ;
 *  · CO_CAPTAIN_PROMOTE_MAX_ROLE (§8.2), plus bas encore pour un co_captain, et
 *    qui borne AUSSI la cible : on ne rétrograde pas quelqu'un qu'on n'aurait
 *    pas pu nommer.
 */
export function assignableRolesFor(actorRole: string, targetRole: string): CrewRole[] {
  if (!isCrewRole(actorRole) || !isCrewRole(targetRole)) return [];
  if (!roleHas(actorRole, 'promote') && !roleHas(actorRole, 'demote')) return [];

  const actorRank = roleRank(actorRole);
  if (roleRank(targetRole) >= actorRank) return [];

  const cap =
    actorRole === 'co_captain'
      ? Math.min(actorRank - 1, roleRank(CO_CAPTAIN_PROMOTE_MAX_ROLE))
      : actorRank - 1;

  // Le co_captain ne touche pas non plus une CIBLE au-dessus de son plafond.
  if (actorRole === 'co_captain' && roleRank(targetRole) > roleRank(CO_CAPTAIN_PROMOTE_MAX_ROLE)) {
    return [];
  }

  return CREW_ROLES.filter((r) => r !== targetRole && roleRank(r) <= cap && r !== 'founder');
}

/**
 * Le prochain rôle VERS LE HAUT que je peux attribuer, ou `null`.
 * La feuille E47 propose un geste d'un tap (« promouvoir » = +1 cran), pas un
 * sélecteur à sept entrées : §A1, « 1 écran = 1 décision ».
 */
export function nextRoleUp(actorRole: string, targetRole: string): CrewRole | null {
  const up = assignableRolesFor(actorRole, targetRole)
    .filter((r) => roleRank(r) > roleRank(targetRole))
    .sort((a, b) => roleRank(a) - roleRank(b));
  return up[0] ?? null;
}

/** Le prochain rôle VERS LE BAS que je peux attribuer, ou `null`. */
export function nextRoleDown(actorRole: string, targetRole: string): CrewRole | null {
  const down = assignableRolesFor(actorRole, targetRole)
    .filter((r) => roleRank(r) < roleRank(targetRole))
    .sort((a, b) => roleRank(b) - roleRank(a));
  return down[0] ?? null;
}

// ─── Le départ : la règle que le serveur applique, dite avant le tap ─────────

/**
 * Puis-je quitter mon crew ? MIROIR de `leave_crew` (0093) et de `canLeaveCrew`
 * (packages/engine/src/crew.ts:424).
 *
 * `'must_transfer_lead'` n'est PAS un refus sec : c'est le seul cas où l'écran
 * doit ouvrir un chemin (« transmets d'abord ») au lieu de griser un bouton.
 * Un crew sans chef est un état définitivement cassé — plus aucune RPC
 * rôle-gatée n'y fonctionne — et le serveur refuse désormais de le fabriquer.
 *
 * `activeMembers` compte MA ligne comprise (c'est l'effectif que l'écran
 * affiche). Un founder seul (`activeMembers <= 1`) part librement : il
 * n'abandonne personne.
 */
export type LeaveVerdict = 'can_leave' | 'must_transfer_lead';
export function leaveVerdict(myRole: string, activeMembers: number): LeaveVerdict {
  if (myRole !== 'founder') return 'can_leave';
  return activeMembers > 1 ? 'must_transfer_lead' : 'can_leave';
}
