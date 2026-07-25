/**
 * GRYD — ce qu'une ligne du Verify Hub a le droit d'AFFIRMER. Module PUR (aucun
 * import React / React Native), donc testable sous Deno.
 *
 * La décision est subtile pour deux raisons, et c'est pour ça qu'elle sort de
 * l'écran :
 *
 *  1. UN IMPORT EXIGE UN COMPTE, et l'écran ne le savait pas. `gpx.ts` ouvre le
 *     sélecteur de fichier natif, lit le GPX, le parse — PUIS découvre qu'il n'y
 *     a pas de session et renvoie « il faut un compte ». Le coût (choisir un
 *     fichier, attendre) était payé AVANT le message. La ligne doit le dire
 *     avant, donc la condition « pas de compte » PRIME sur tout le reste.
 *  2. UN STATUT PAS ENCORE LU N'EST PAS UN STATUT. Tant que `status()` n'a pas
 *     répondu, le snapshot est `undefined` : la ligne affichait alors « … », un
 *     caractère seul qui n'affirme rien et qui viole la règle « aucun texte
 *     coupé par une ellipse ». C'est un état à part entière : « lecture ».
 */
import type { SourceAdapterStatus } from './adapters/types';

/** Ce que la ligne montre à droite, une fois la décision prise. */
export type SourceRowKind =
  /** Source native, toujours active (GRYD Live GPS) — aucune action. */
  | 'active'
  /** Le statut n'a pas encore répondu : on ne prétend rien. */
  | 'reading'
  /** Action impossible sans compte : on le dit AVANT le sélecteur de fichier. */
  | 'needsAccount'
  /** Action en cours (import / connexion / déconnexion). */
  | 'busy'
  /** Liaison durable active — l'action est de la couper. */
  | 'connected'
  /** Action ponctuelle et répétable (import de fichier). */
  | 'import'
  /** Liaison durable à établir. */
  | 'connect'
  /** L'action existe, mais pas ici (aperçu web, clés absentes, dev build…). */
  | 'blocked';

export interface SourceRowInput {
  /** `native` = toujours active ; `connectable` = porte un CTA. */
  availability: 'native' | 'connectable';
  /** Nature du CTA d'une source connectable. */
  action?: 'connect' | 'import';
  /** Statut lu de l'adaptateur — `undefined` tant qu'il n'a pas répondu. */
  status: SourceAdapterStatus | undefined;
  /** Une action est en vol sur CETTE source. */
  busy: boolean;
  /** Session réelle (compte + backend). */
  signedIn: boolean;
}

/**
 * L'ordre des tests EST la logique, du fait le plus établi au plus incertain :
 *
 *   1. native      → toujours actif, aucun compte requis (capture locale) ;
 *   2. pas lu      → on ne sait rien, on le dit ;
 *   3. pas de compte → l'action échouerait à coup sûr : on ne la peint pas ;
 *   4. occupé      → une action est en vol ;
 *   5. connecté    → liaison établie ;
 *   6. bloqué      → l'action existe ailleurs, pas ici ;
 *   7. sinon       → importer ou connecter.
 */
export function sourceRowKind(input: SourceRowInput): SourceRowKind {
  if (input.availability === 'native') return 'active';
  if (input.status === undefined) return 'reading';
  if (!input.signedIn) return 'needsAccount';
  if (input.busy) return 'busy';
  if (input.status === 'connected') return 'connected';
  if (input.status !== 'disconnected') return 'blocked';
  return input.action === 'import' ? 'import' : 'connect';
}

/**
 * Ligne de contexte d'une source : « Trust élevé · Capture directe · 412 points
 * importés ». Chaque segment est adossé à une SOURCE nommée, et un segment sans
 * source DISPARAÎT — jamais de « · » orphelin ni de « — » (règle 15).
 */
export function sourceContextLine(parts: readonly (string | undefined | null)[]): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p.length > 0)
    .join(' · ');
}
