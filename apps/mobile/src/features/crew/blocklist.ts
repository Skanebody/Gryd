/**
 * GRYD — CE QUE « BLOQUER » FAIT VRAIMENT, et à qui l'on peut proposer quoi.
 *
 * App Store Review Guideline 1.2 (« User-Generated Content ») exige deux choses
 * distinctes, chacune couverte ici :
 *   · 2ᵉ puce — « a mechanism for users to flag objectionable content » : d'où
 *     `moderationActionsFor`, qui dit si la ligne d'un joueur mérite une action
 *     et LESQUELLES, et `memberReportInput`, qui PRÉ-REMPLIT le signalement avec
 *     le joueur de cette ligne (plus aucun identifiant machine à retaper) ;
 *   · 3ᵉ puce — « the ability to block abusive users from the service » : d'où
 *     `blockedPseudoSet` / `isPseudoBlocked`, le prédicat que les DEUX surfaces
 *     qui affichent le pseudo d'un tiers (roster de crew, classement de saison)
 *     consomment réellement.
 *
 * ─── LE DÉFAUT CORRIGÉ (audit App Store, 26/07/2026 — B3) ────────────────────
 * `blockMember()` écrivait bien la ligne locale ET `user_blocks`, mais le
 * prédicat `isBlocked()` de `moderation.ts` n'avait AUCUN appelant : bloquer ne
 * faisait disparaître personne, alors que la copie promettait l'inverse en cinq
 * langues. Un bouton qui n'agit pas est le même mensonge qu'une donnée
 * fabriquée.
 *
 * ─── POURQUOI UN LIBELLÉ, ET NON UNE DISPARITION ─────────────────────────────
 * Retirer la ligne d'un joueur bloqué d'un CLASSEMENT fabriquerait deux
 * mensonges : les rangs affichés ne seraient plus ceux du serveur (tout le monde
 * remonterait d'un cran, cf. `rangsApresRetrait` dans les tests), et le joueur
 * croirait à un bug plutôt qu'à sa propre décision. La ligne reste donc à SA
 * place, avec SA valeur, et c'est l'IDENTITÉ qui est masquée — le seul élément
 * que bloquer doit faire disparaître. Même règle sur le roster : l'effectif du
 * crew est un fait serveur, il ne bouge pas parce que j'ai bloqué quelqu'un.
 *
 * ─── AUCUN REACT, AUCUN RÉSEAU ICI ───────────────────────────────────────────
 * Ce module est PUR (règle projet : logique = fonction pure + tests Deno). Le
 * type du motif reste générique (`R extends string`) plutôt qu'importé de
 * `moderation.ts` : ce fichier-là tire React, AsyncStorage et supabase-js, que
 * Deno n'a pas à résoudre pour vérifier une règle de filtrage. Le typage réel
 * est vérifié au point d'appel par `tsc` (l'objet rendu doit satisfaire la
 * signature de `reportContent`).
 */

/**
 * Pseudo de REPLI rendu par les deux lectures quand la base n'a pas donné de
 * nom : `real.ts` (roster) et `leagueBoard.ts` (classement) écrivent tous deux
 * `'—'`. Ce n'est l'identité de personne : on ne signale pas un tiret, et le
 * bloquer masquerait toutes les lignes anonymes d'un coup.
 */
export const UNKNOWN_PSEUDO = '—';

/**
 * Forme de comparaison d'un pseudo. Le blocage saisi À LA MAIN dans
 * Confidentialité ne portait aucune normalisation : « k.runner75 » ne bloquait
 * pas « K.Runner75 », et le joueur croyait avoir agi. On compare donc sans
 * casse ni espaces de bord — même doctrine que la normalisation anti-
 * contournement des handles réservés côté serveur (0047).
 *
 * ⚠ Cette forme sert UNIQUEMENT à comparer. La liste stockée garde le pseudo
 * TEL QUEL, pour que « Joueurs bloqués » (Confidentialité) montre ce que le
 * joueur a réellement bloqué et que `unblockMember` retrouve sa ligne.
 */
export function normalizePseudo(pseudo: string): string {
  return pseudo.trim().toLowerCase();
}

/** true si ce pseudo désigne quelqu'un (ni vide, ni le repli `'—'`). */
export function isNamedPlayer(pseudo: string): boolean {
  const n = pseudo.trim();
  return n.length > 0 && n !== UNKNOWN_PSEUDO;
}

/**
 * Index de comparaison des pseudos bloqués. Construit UNE fois par écran (les
 * deux surfaces le mémoïsent) : un `includes` par ligne serait quadratique sur
 * un classement de 50 lignes rendu à chaque frame de scroll.
 */
export function blockedPseudoSet(blocked: readonly string[]): ReadonlySet<string> {
  const set = new Set<string>();
  for (const p of blocked) {
    const n = normalizePseudo(p);
    // Un pseudo vide bloquerait toutes les lignes sans nom : jamais indexé.
    if (n.length > 0) set.add(n);
  }
  return set;
}

/** LE prédicat que les surfaces consomment. */
export function isPseudoBlocked(blocked: ReadonlySet<string>, pseudo: string): boolean {
  return blocked.has(normalizePseudo(pseudo));
}

/**
 * Nom À AFFICHER sur une ligne : le pseudo réel, ou le libellé de blocage
 * (« Joueur bloqué », résolu par l'écran — cette fonction ne connaît aucune
 * langue). La ligne, elle, n'est jamais retirée : voir l'en-tête.
 */
export function displayedPseudo(
  blocked: ReadonlySet<string>,
  pseudo: string,
  blockedLabel: string,
): string {
  return isPseudoBlocked(blocked, pseudo) ? blockedLabel : pseudo;
}

/** Les gestes de modération proposables sur la ligne d'un joueur. */
export type PlayerModerationAction = 'report' | 'block' | 'unblock';

export interface ModerationEligibility {
  /** Pseudo tel que la surface l'a reçu du serveur. */
  pseudo: string;
  /** MA ligne : on ne se signale ni ne se bloque soi-même. */
  isMe: boolean;
  /**
   * Le signalement PART-il vraiment ? `reportContent` n'écrit dans
   * `content_reports` que sous session ; hors session il resterait local et
   * l'alerte « examiné sous 24 h » serait un mensonge. On ne peint alors pas
   * l'action (« aucun bouton mort »). Bloquer, lui, agit toujours : le filtrage
   * d'affichage est local.
   */
  canReport: boolean;
  blocked: ReadonlySet<string>;
}

/**
 * Actions ÉLIGIBLES pour cette ligne, dans l'ordre d'affichage de la feuille.
 * Liste vide = aucune affordance « … » n'est peinte sur la ligne.
 */
export function moderationActionsFor(input: ModerationEligibility): readonly PlayerModerationAction[] {
  const { pseudo, isMe, canReport, blocked } = input;
  // Ma propre ligne : me bloquer me ferait disparaître de mon propre classement.
  if (isMe) return [];
  // Ligne sans identité lisible (repli `'—'`) : il n'y a personne à viser.
  if (!isNamedPlayer(pseudo)) return [];
  const actions: PlayerModerationAction[] = [];
  if (canReport) actions.push('report');
  // Déjà bloqué : proposer « Bloquer » une deuxième fois serait un geste sans
  // effet. C'est « Débloquer » qui devient l'action utile, sur place.
  actions.push(isPseudoBlocked(blocked, pseudo) ? 'unblock' : 'block');
  return actions;
}

/** Raccourci de rendu : faut-il peindre l'affordance « … » sur cette ligne ? */
export function canModeratePlayer(input: ModerationEligibility): boolean {
  return moderationActionsFor(input).length > 0;
}

/**
 * Charge utile EXACTE passée à `reportContent` — c'est ici que se joue le
 * pré-remplissage : `targetId` et `author` viennent de la LIGNE, jamais d'un
 * champ de saisie. `null` quand la ligne ne désigne personne.
 */
export interface MemberReportInput<R extends string> {
  kind: 'member';
  targetId: string;
  author: string;
  reason: R;
}

export function memberReportInput<R extends string>(
  pseudo: string,
  reason: R,
): MemberReportInput<R> | null {
  const target = pseudo.trim();
  if (!isNamedPlayer(target)) return null;
  return { kind: 'member', targetId: target, author: target, reason };
}

/**
 * Pseudo à passer à `blockMember` / `unblockMember` : trimé, mais SANS
 * changement de casse — la liste « Joueurs bloqués » de Confidentialité doit
 * afficher le pseudo tel qu'il existe, et le déblocage retrouver sa ligne.
 */
export function blockTargetFor(pseudo: string): string | null {
  const target = pseudo.trim();
  return isNamedPlayer(target) ? target : null;
}
