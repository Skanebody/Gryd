/**
 * GRYD — ITINÉRAIRES POPULAIRES (AMENDEMENT-32 §2 · emprunt Strava P2).
 * Boucles de conquête « crowd-sourcées » : les tracés que les crews réussissent
 * le mieux, proposés dans le Route Planner pour réduire la friction « où courir ».
 *
 * DÉMO 100 % DÉTERMINISTE : les vraies stats (« X crews l'ont prise », succès)
 * seront un AGRÉGAT SERVEUR en V1 (activités validées par ingest_run). Ici, tout
 * est scripté et figé — aucun appel réseau, aucune source aléatoire.
 *
 * ANTI PAY-TO-WIN (§A, règles non négociables) : la popularité est un signal
 * SOCIAL (combien de crews ont couru ce tracé), JAMAIS un avantage acheté — aucun
 * sponsor, aucun achat ne classe ni ne débloque une boucle. Le tap RÉUTILISE le
 * flux existant : chaque boucle populaire pointe vers une proposition `ROUTES_DEMO`
 * réelle (la carte, le KPI et le CTA du planner ne changent pas de contrat).
 */
import type { PlannedRouteDemo } from './types';
import { ROUTES_DEMO } from './demo';

/**
 * Une boucle populaire = un pointeur vers une proposition démo existante
 * (`routeId`) + les métadonnées SOCIALES crowd-sourcées affichées sur la card.
 * Aucune géométrie propre : le tracé, la distance et les zones restent ceux de
 * la route ciblée (source de vérité unique = `ROUTES_DEMO`).
 */
export interface PopularRouteDemo {
  id: string;
  /** Nom éditorial de la boucle (« Le tour du Canal », « Boucle Bastille »). */
  name: string;
  /** Secteur affiché (cohérent avec la `zone` de la route ciblée). */
  zone: string;
  /** Route démo réutilisée au tap (flux planner inchangé). */
  routeId: string;
  /**
   * Nombre de crews ayant couru ce tracé (démo figée = agrégat serveur V1).
   * Sert le libellé social « X crews l'ont prise ».
   */
  crewsTaken: number;
}

/**
 * Les boucles populaires (démo déterministe, ordre = popularité décroissante).
 * Chaque `routeId` EXISTE dans `ROUTES_DEMO` — vérifié par `popularRouteTarget`.
 * `crewsTaken` est figé (pas de Math.random) : mêmes chiffres à chaque rendu.
 */
export const POPULAR_ROUTES_DEMO: readonly PopularRouteDemo[] = [
  {
    id: 'pop_canal',
    name: 'Le tour du Canal',
    zone: 'Canal',
    routeId: 'route_b_optimisee',
    crewsTaken: 34,
  },
  {
    id: 'pop_bastille',
    name: 'Boucle Bastille',
    zone: 'Bastille',
    routeId: 'route_a_rapide',
    crewsTaken: 21,
  },
  {
    id: 'pop_republique',
    name: 'Rempart République',
    zone: 'République',
    routeId: 'route_c_defense',
    crewsTaken: 17,
  },
];

/** Proposition `ROUTES_DEMO` ciblée par une boucle populaire (undefined = orpheline). */
export function popularRouteTarget(pop: PopularRouteDemo): PlannedRouteDemo | undefined {
  return ROUTES_DEMO.find((r) => r.id === pop.routeId);
}

/**
 * Libellé social « X crews l'ont prise » (accord singulier/pluriel). C'est le
 * signal crowd-sourcé qui réduit la friction « où courir » — jamais un chiffre
 * de points ou un avantage.
 */
export function crewsTakenLabel(pop: PopularRouteDemo): string {
  return pop.crewsTaken > 1
    ? `${pop.crewsTaken} crews l'ont prise`
    : `${pop.crewsTaken} crew l'a prise`;
}
