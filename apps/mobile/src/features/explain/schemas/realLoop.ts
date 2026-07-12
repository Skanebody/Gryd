/**
 * GRYD — VRAIE boucle projetée pour les schémas explicatifs (§31). Plus de lobe
 * 'C' fabriqué à la main : les diagrammes « ligne vs boucle », « la boucle fait
 * la zone » et « boucle collective » dessinent la VRAIE boucle République
 * (realAnchors), cohérente avec l'onboarding et le partage — « de vrais tracés
 * partout ». PUR/déterministe : projette dans une box locale (w×h), à poser dans
 * le SVG du schéma via un <G transform="translate(x y)">.
 */
import { fitTracesToBox } from '../../map/projectTrace';
import { BOUCLE_REPUBLIQUE } from '../../map/realAnchors';

/** Part de la frontière tracée par l'OUVREUR (le finisher referme le reste). */
const OPENER_SHARE = 0.62;

export interface RealLoopSchema {
  /** Path fermé (M…L…Z) de la boucle dans la box — remplissage ZONE. */
  path: string;
  /** Polyligne de l'ouvreur (majeure partie de la frontière). */
  openerPoints: string;
  /** Polyligne du finisher (segment manquant qui referme, jusqu'au départ). */
  finisherPoints: string;
  /** Point de fermeture (départ = arrivée). */
  start: { x: number; y: number };
  /** Point de jonction ouvreur ↔ finisher. */
  join: { x: number; y: number };
}

/**
 * Projette la boucle République dans une box (w×h) avec padding. Renvoie le path
 * fermé (zone), les deux demi-tracés (ouvreur/finisher) et les points remarquables.
 */
export function realLoopSchema(w: number, h: number, pad = 8): RealLoopSchema {
  const proj = fitTracesToBox([BOUCLE_REPUBLIQUE], w, h, pad);
  const n = BOUCLE_REPUBLIQUE.length;
  const mid = Math.max(2, Math.min(n - 1, Math.ceil(n * OPENER_SHARE)));
  const opener = BOUCLE_REPUBLIQUE.slice(0, mid);
  // Le finisher part de la jonction, referme, et rejoint visiblement le départ.
  const finisher = [...BOUCLE_REPUBLIQUE.slice(mid - 1), BOUCLE_REPUBLIQUE[0]!];
  return {
    path: proj.path(BOUCLE_REPUBLIQUE, true),
    openerPoints: proj.points(opener),
    finisherPoints: proj.points(finisher),
    start: proj.project(BOUCLE_REPUBLIQUE[0]!),
    join: proj.project(BOUCLE_REPUBLIQUE[mid - 1]!),
  };
}
