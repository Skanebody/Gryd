/**
 * GRYD — ÉDITION DE CREW : la logique PURE (aucun React, aucune I/O).
 *
 * ═══ POURQUOI CE FICHIER EXISTE, SÉPARÉ DE L'ÉCRAN ══════════════════════════
 * Même partage que `discovery.ts` / `discoveryData.ts` : ce qui se DÉCIDE se
 * teste sans monter un composant. Ici on décide trois choses, et rien d'autre :
 *   1. lire la réponse du serveur SANS jamais lui prêter une forme qu'elle n'a
 *      pas (un `parse` qui rend `null` plutôt qu'un objet à moitié inventé) ;
 *   2. dire ce qui a CHANGÉ (le diff) — c'est lui qui permet d'envoyer `null`
 *      sur les champs intouchés, donc de ne jamais repayer un renommage parce
 *      qu'on a corrigé une virgule dans la description ;
 *   3. dire si le formulaire est SOUMETTABLE, et sinon POURQUOI — parce qu'un
 *      « Enregistrer » qui échoue à coup sûr est un bouton mort (§A4), et que
 *      la seule façon honnête de l'éviter est de connaître le motif AVANT.
 *
 * ═══ LE SERVEUR RESTE SEUL JUGE ════════════════════════════════════════════
 * Rien ici n'AUTORISE quoi que ce soit. `crew_edit` (migration 0084) revérifie
 * l'appartenance, le rôle (CREW_PERMISSIONS), les bornes, la modération et le
 * solde, quoi que ce module ait pensé. Ces fonctions servent à ne pas PEINDRE
 * une action condamnée — jamais à s'en octroyer une.
 *
 * ═══ LES BORNES ════════════════════════════════════════════════════════════
 * `NAME_MAX` et `DESCRIPTION_MAX` recopient des bornes DDL (0002 pour le nom,
 * `crews_description_check` de 0084 pour la description). Une recopie dérive :
 * le test PGlite `crew_edit_rpc.pglite.test.mjs` RELIT ce fichier et compare les
 * deux nombres au schéma. La dérive casse le gate au lieu de casser un joueur.
 * Le coût du renommage, lui, n'est PAS recopié : il vient du serveur
 * (`renameCostFoulees`), qui le tient de CREW_RENAME_FOULEES.
 */
import {
  CREW_RECRUITMENT_STATUSES,
  CREW_TAG_KEYS,
  type CrewRecruitmentStatus,
  type CrewRole,
  type CrewTag,
} from '@klaim/shared';

/** Borne DDL du nom de crew (0002 : `char_length(name) between 1 and 40`). */
export const NAME_MAX = 40;
/** Borne DDL de la description (0084 : `crews_description_check`, 280). */
export const DESCRIPTION_MAX = 280;

// ─── Ce que `crew_edit_context` (0084) rend, tel quel ────────────────────────

/** Les champs du crew qui SONT éditables. Ni `code`, ni `color`, ni membres. */
export interface EditableCrew {
  id: string;
  name: string;
  /** `null` = aucune description. JAMAIS la chaîne vide (un seul encodage du vide). */
  description: string | null;
  recruitmentStatus: CrewRecruitmentStatus;
  tags: readonly CrewTag[];
}

/**
 * Droits PAR CHAMP, tels que le serveur les a tranchés depuis CREW_PERMISSIONS.
 * Ils ne sont pas dérivés du rôle côté client : le client afficherait alors sa
 * propre idée de la matrice, qui pourrait diverger de celle du serveur. On lit
 * le verdict, on ne le recalcule pas.
 */
export interface EditPermissions {
  /** CREW_PERMISSIONS.changeNameEmblem */
  name: boolean;
  /** CREW_PERMISSIONS.changeSettings */
  description: boolean;
  /** CREW_PERMISSIONS.manageRecruitment (statut + tags) */
  recruitment: boolean;
}

export interface EditContext {
  role: CrewRole;
  crew: EditableCrew;
  can: EditPermissions;
  /** Coût d'un CHANGEMENT de nom, en foulées (CREW_RENAME_FOULEES, côté serveur). */
  renameCostFoulees: number;
  /** Mon solde de foulées au moment de la lecture. */
  myFoulees: number;
  /** Borne serveur de la description — comparée à DESCRIPTION_MAX par le test. */
  descriptionMax: number;
}

/** Motifs de refus que `crew_edit_context` / `crew_edit` savent renvoyer. */
export type EditRefusal =
  | 'signed_out'
  | 'no_crew'
  | 'forbidden'
  | 'bad_name'
  | 'name_unavailable'
  | 'bad_description'
  | 'description_unavailable'
  | 'bad_recruitment_status'
  | 'bad_tags'
  | 'not_enough_foulees';

const REFUSALS: readonly string[] = [
  'signed_out', 'no_crew', 'forbidden', 'bad_name', 'name_unavailable',
  'bad_description', 'description_unavailable', 'bad_recruitment_status',
  'bad_tags', 'not_enough_foulees',
];

/** Motif de refus d'une réponse serveur, ou `null` si ce n'en est pas un. */
export function refusalOf(data: unknown): EditRefusal | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.ok !== false) return null;
  const reason = typeof d.reason === 'string' ? d.reason : null;
  return reason && REFUSALS.includes(reason) ? (reason as EditRefusal) : null;
}

/** Sur `not_enough_foulees`, le serveur dit le prix ET le solde. Les deux ou rien. */
export function shortfallOf(data: unknown): { need: number; have: number } | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.reason !== 'not_enough_foulees') return null;
  if (typeof d.need !== 'number' || typeof d.have !== 'number') return null;
  return { need: d.need, have: d.have };
}

// ─── Lecture DÉFENSIVE : on refuse de deviner ────────────────────────────────

const isStatus = (v: unknown): v is CrewRecruitmentStatus =>
  typeof v === 'string' && (CREW_RECRUITMENT_STATUSES as readonly string[]).includes(v);

const isTag = (v: unknown): v is CrewTag =>
  typeof v === 'string' && (CREW_TAG_KEYS as readonly string[]).includes(v);

/**
 * Un crew éditable, ou `null` si la charge utile n'en est pas un.
 *
 * Les tags INCONNUS sont ÉCARTÉS, pas convertis ni devinés : une clé que ce
 * build ne connaît pas n'a pas de libellé, et afficher sa clé brute (`raid_v2`)
 * serait pire que de ne rien afficher. Elle reste en base — le crew n'est pas
 * amputé ; c'est seulement cette version de l'app qui ne sait pas la nommer.
 */
export function parseEditableCrew(raw: unknown): EditableCrew | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.name !== 'string') return null;
  if (!isStatus(c.recruitmentStatus)) return null;
  const description =
    typeof c.description === 'string' && c.description.length > 0 ? c.description : null;
  const tags = Array.isArray(c.tags) ? c.tags.filter(isTag) : [];
  return {
    id: c.id,
    name: c.name,
    description,
    recruitmentStatus: c.recruitmentStatus,
    tags,
  };
}

/** Le contexte d'édition complet, ou `null` si la réponse n'en est pas un. */
export function parseEditContext(raw: unknown): EditContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.ok !== true) return null;
  const crew = parseEditableCrew(d.crew);
  if (!crew) return null;
  const can = d.can as Record<string, unknown> | undefined;
  if (!can || typeof can !== 'object') return null;
  if (typeof d.role !== 'string') return null;
  if (typeof d.renameCostFoulees !== 'number' || typeof d.myFoulees !== 'number') return null;
  return {
    role: d.role as CrewRole,
    crew,
    can: {
      name: can.name === true,
      description: can.description === true,
      recruitment: can.recruitment === true,
    },
    renameCostFoulees: d.renameCostFoulees,
    myFoulees: d.myFoulees,
    descriptionMax:
      typeof d.descriptionMax === 'number' ? d.descriptionMax : DESCRIPTION_MAX,
  };
}

// ─── Le brouillon, et ce qu'il change vraiment ───────────────────────────────

/** L'état du formulaire. Chaîne vide sur `description` = « efface-la ». */
export interface EditDraft {
  name: string;
  description: string;
  recruitmentStatus: CrewRecruitmentStatus;
  tags: readonly CrewTag[];
}

/** Le brouillon initial d'un crew : exactement ce que le serveur a dit. */
export function draftOf(crew: EditableCrew): EditDraft {
  return {
    name: crew.name,
    description: crew.description ?? '',
    recruitmentStatus: crew.recruitmentStatus,
    tags: [...crew.tags].sort(),
  };
}

/**
 * La charge utile de `crew_edit` : `null` sur tout champ INCHANGÉ.
 *
 * C'est le cœur de l'honnêteté de cet écran. Envoyer le nom à chaque
 * enregistrement serait sans effet côté serveur (il compare avant de facturer),
 * mais ce module ne s'appuie PAS sur cette clémence : il n'envoie que ce qui
 * change, pour que « je n'ai pas touché au nom » soit vrai au niveau du réseau
 * et pas seulement au niveau de la base.
 *
 * Le nom est comparé APRÈS `trim` (ajouter une espace en fin de nom n'est pas un
 * renommage). Les tags sont comparés TRIÉS : réordonner des cases à cocher n'est
 * pas une modification.
 */
export interface EditPayload {
  p_name: string | null;
  p_description: string | null;
  p_recruitment_status: string | null;
  p_tags: string[] | null;
}

export function payloadOf(crew: EditableCrew, draft: EditDraft): EditPayload {
  const name = draft.name.trim();
  const description = draft.description.trim();
  const currentDescription = crew.description ?? '';
  const tags = [...draft.tags].sort();
  const currentTags = [...crew.tags].sort();

  return {
    p_name: name !== crew.name ? name : null,
    p_description: description !== currentDescription ? description : null,
    p_recruitment_status:
      draft.recruitmentStatus !== crew.recruitmentStatus ? draft.recruitmentStatus : null,
    p_tags: tags.join(' ') !== currentTags.join(' ') ? tags : null,
  };
}

/** Le brouillon modifie-t-il quoi que ce soit ? */
export function isDirty(crew: EditableCrew, draft: EditDraft): boolean {
  const p = payloadOf(crew, draft);
  return (
    p.p_name !== null ||
    p.p_description !== null ||
    p.p_recruitment_status !== null ||
    p.p_tags !== null
  );
}

/** Le brouillon renomme-t-il vraiment (donc : facture-t-il) ? */
export function willRename(crew: EditableCrew, draft: EditDraft): boolean {
  return payloadOf(crew, draft).p_name !== null;
}

// ─── Soumettable, ou refusé AVEC son motif ───────────────────────────────────

/**
 * Pourquoi le formulaire n'est pas soumettable. `null` = il l'est.
 *
 * `pristine` n'est pas un défaut : c'est « il n'y a rien à enregistrer ». Il est
 * distingué des vraies erreurs parce qu'un écran ne doit pas crier « nom vide »
 * à quelqu'un qui vient d'ouvrir la page sans rien toucher.
 */
export type BlockReason =
  | 'pristine'
  | 'name_empty'
  | 'name_too_long'
  | 'description_too_long'
  | 'rename_unaffordable'
  | 'forbidden';

/**
 * Le motif qui EMPÊCHE d'enregistrer, ou `null`.
 *
 * `rename_unaffordable` est le cas qui justifie à lui seul l'existence de cette
 * fonction : sans lui, un fondateur à 120 foulées taperait un nouveau nom,
 * appuierait sur un CTA chartreuse parfaitement engageant, et se prendrait un
 * refus serveur. Le CTA aurait été mort — il aurait échoué à tous les coups,
 * pour une raison connue d'avance. Ici on le grise et on DIT le prix.
 *
 * L'ordre des motifs est celui de la lecture humaine : d'abord « tu n'as rien
 * changé », puis les champs de haut en bas, puis le solde.
 */
export function blockReason(
  ctx: EditContext,
  draft: EditDraft,
): BlockReason | null {
  const p = payloadOf(ctx.crew, draft);

  if (p.p_name !== null && !ctx.can.name) return 'forbidden';
  if (p.p_description !== null && !ctx.can.description) return 'forbidden';
  if ((p.p_recruitment_status !== null || p.p_tags !== null) && !ctx.can.recruitment) {
    return 'forbidden';
  }

  if (!isDirty(ctx.crew, draft)) return 'pristine';

  const name = draft.name.trim();
  if (name.length === 0) return 'name_empty';
  if (name.length > NAME_MAX) return 'name_too_long';
  if (draft.description.trim().length > ctx.descriptionMax) return 'description_too_long';

  if (p.p_name !== null && ctx.myFoulees < ctx.renameCostFoulees) return 'rename_unaffordable';

  return null;
}

/** Bascule un tag du brouillon (les cases à cocher de recrutement). */
export function toggleTag(tags: readonly CrewTag[], tag: CrewTag): CrewTag[] {
  return tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag].sort();
}
