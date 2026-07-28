/**
 * GRYD — E47 : le CÂBLAGE des quatre gestes de pouvoir. Aucune règle de jeu.
 *
 * Séparé de `memberRoles.ts` pour la même raison que `crewOutingData.ts` l'est
 * de `crewOuting.ts` : les décisions sont pures et testées, ce fichier ne fait
 * qu'appeler. Les trois RPC viennent de la migration 0093 — jamais une écriture
 * de table : `insert`/`update` sur `crew_members` est révoqué depuis 0042, et
 * `crew_members.role` n'a AUCUNE autre voie d'écriture ouverte au client.
 *
 * ─── LE CLIENT NE DÉCIDE RIEN, IL DEMANDE ────────────────────────────────────
 * Chaque appel est intégralement rejugé serveur : rôle de l'appelant lu EN
 * BASE (jamais reçu du client), périmètre du co_captain, interdiction de
 * s'auto-promouvoir, intouchabilité du propriétaire. Le gating d'écran
 * (`roleActionsFor`) n'est qu'une politesse — s'il se trompait, le serveur
 * refuserait, et ce fichier rendrait son motif tel quel.
 *
 * ─── QUATRE ISSUES DISTINCTES, JAMAIS CONFONDUES ─────────────────────────────
 *   · `ok`          → le serveur a fait le geste (avec son `effect` : promu,
 *                     rétrogradé, exclu, transféré — ou « déjà fait ») ;
 *   · `refusal`     → le serveur a RÉPONDU non, avec son motif. Ce n'est pas
 *                     une panne : `forbidden` est une information ;
 *   · `unsupported` → j'ai JOINT le serveur et il ne connaît pas la fonction :
 *                     cet environnement n'a pas reçu 0093. Un fait sur le
 *                     SERVEUR, pas sur le joueur — et surtout pas « réessaie »,
 *                     qui ferait tourner quelqu'un en rond indéfiniment ;
 *   · `failed`      → je n'ai pas pu joindre le serveur. On ne sait rien.
 * Rien n'est jamais supposé réussi : l'écran RELIT le roster après un `ok`,
 * il ne réécrit pas la ligne de son côté.
 */
import { supabase } from '../../lib/supabase';
import type { CrewRole } from '@klaim/shared';

/** Motifs de refus rendus par 0093 — contrat FIGÉ, miroir des `reason` du SQL. */
export type MemberActionRefusal =
  | 'signed_out'
  | 'no_crew'
  /** L'appelant n'a pas la permission (matrice §8). */
  | 'forbidden'
  /** Le geste ne s'applique pas à soi-même. */
  | 'self'
  /** La cible n'est pas membre actif de mon crew — même motif qu'un inconnu. */
  | 'not_member'
  /** Le propriétaire ne s'exclut ni ne se rétrograde : le transfert existe. */
  | 'cannot_target_lead'
  /** Rôle demandé inconnu, ou `founder` (qui se transmet, ne s'attribue pas). */
  | 'bad_role'
  /** Hors du périmètre de mon rôle (rang, ou limites §8.2 du co_captain). */
  | 'out_of_scope'
  /** Le contrat du serveur n'est pas celui attendu — on n'invente pas mieux. */
  | 'unknown';

/** Ce que le serveur dit avoir FAIT. `unchanged`/`already_removed` = idempotence. */
export type MemberActionEffect =
  | 'promoted'
  | 'demoted'
  | 'unchanged'
  | 'removed'
  | 'already_removed'
  | 'transferred';

export type MemberActionOutcome =
  | { kind: 'ok'; effect: MemberActionEffect; role: CrewRole | null }
  | { kind: 'refusal'; reason: MemberActionRefusal }
  | { kind: 'unsupported' }
  | { kind: 'failed' };

const REFUSALS: readonly string[] = [
  'signed_out',
  'no_crew',
  'forbidden',
  'self',
  'not_member',
  'cannot_target_lead',
  'bad_role',
  'out_of_scope',
];
const EFFECTS: readonly string[] = [
  'promoted',
  'demoted',
  'unchanged',
  'removed',
  'already_removed',
  'transferred',
];

/**
 * Le serveur ne connaît pas la fonction : PostgREST rend `PGRST202` (absente du
 * cache de schéma) et Postgres `42883` (undefined_function). On teste les deux
 * plutôt que de deviner lequel remonte — ils dépendent de la version du proxy.
 * Même détection que `crewOutingData.ts`.
 */
function isUnsupported(error: { code?: string | null; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = error.message ?? '';
  return /crew_(set_member_role|remove_member|transfer_lead)/.test(msg)
    && /does not exist|not find/i.test(msg);
}

/** jsonb → issue typée. Un contrat inattendu devient `unknown`, jamais un succès. */
export function parseMemberActionResult(raw: unknown): MemberActionOutcome {
  if (!raw || typeof raw !== 'object') return { kind: 'refusal', reason: 'unknown' };
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) {
    const reason = typeof root.reason === 'string' ? root.reason : '';
    return {
      kind: 'refusal',
      reason: REFUSALS.includes(reason) ? (reason as MemberActionRefusal) : 'unknown',
    };
  }
  const effect = typeof root.effect === 'string' && EFFECTS.includes(root.effect)
    ? (root.effect as MemberActionEffect)
    : null;
  // `ok:true` sans effet reconnu : le geste a peut-être abouti, mais on ne sait
  // pas lequel. On ne le raconte pas — l'écran relira le roster.
  if (effect === null) return { kind: 'refusal', reason: 'unknown' };
  return {
    kind: 'ok',
    effect,
    role: typeof root.role === 'string' ? (root.role as CrewRole) : null,
  };
}

async function call(fn: string, args: Record<string, unknown>): Promise<MemberActionOutcome> {
  // Pas de client configuré = pas de backend : ce n'est pas un refus du serveur.
  if (!supabase) return { kind: 'failed' };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return isUnsupported(error) ? { kind: 'unsupported' } : { kind: 'failed' };
    return parseMemberActionResult(data);
  } catch {
    return { kind: 'failed' };
  }
}

/** Promouvoir OU rétrograder : la MÊME RPC, sous les mêmes bornes (0093 §3). */
export function setMemberRole(userId: string, role: CrewRole): Promise<MemberActionOutcome> {
  return call('crew_set_member_role', { p_user_id: userId, p_role: role });
}

/** Exclure. Le serveur inscrit son auteur (`removed_by`) : l'exclu n'est pas puni. */
export function removeMember(userId: string): Promise<MemberActionOutcome> {
  return call('crew_remove_member', { p_user_id: userId });
}

/** Transférer le rôle de chef. ÉCHANGE atomique — irréversible par l'appelant. */
export function transferLead(userId: string): Promise<MemberActionOutcome> {
  return call('crew_transfer_lead', { p_user_id: userId });
}
