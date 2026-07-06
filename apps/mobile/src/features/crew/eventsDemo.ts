/**
 * GRYD — SORTIES de crew, jeu de données DÉMO déterministe (AMENDEMENT-32 §1).
 *
 * Les sorties planifiées « comme les club events Strava », mais rendues GRYD :
 * chaque sortie porte une ZONE CIBLE + un objectif (défense/conquête). Ces
 * entrées démo sont la toile de fond des sorties que MOI je crée et auxquelles
 * je réponds (events.ts, persisté). Elles ne bougent JAMAIS (ordre stable) —
 * l'horaire est un LIBELLÉ figé (« Ce soir · 19:00 ») et non une date calculée,
 * pour rester déterministe entre deux rendus.
 *
 * §A.19 : SOCIAL, pas de monétisation. Aucune sortie ne donne de territoire ni
 * de point — courir ensemble = coordination + densité (le moat). Le claim reste
 * décidé serveur (§3). TODO(O1) : brancher crew_events (0011) via Edge Function.
 */
import type { CrewOutingObjective, DemoCrewOuting } from './events';

/** Auteur démo cohérent avec le reste du crew (CHAT_ME = KORO ailleurs). */
const HOST_LENA = 'LENA_RUN';
const HOST_MEHDI = 'MEHDI93';

/** Sorties démo (les plus proches en tête). Ordre FIGÉ. */
export const DEMO_OUTINGS: readonly DemoCrewOuting[] = [
  {
    id: 'demo_outing_republique',
    title: 'Défense République',
    when: 'Ce soir · 19:00',
    place: 'Métro République, sortie Magenta',
    zone: 'République',
    objective: 'defense' satisfies CrewOutingObjective,
    host: HOST_LENA,
    // Nombre de « Je viens » de départ (démo) — jamais un classement, juste la
    // densité de la sortie. Ma voix s'ajoute par-dessus au tap.
    goingSeed: 6,
  },
  {
    id: 'demo_outing_canal',
    title: 'Conquête Canal',
    when: 'Demain · 07:30',
    place: 'Bassin de la Villette, ponton nord',
    zone: 'Canal Saint-Martin',
    objective: 'conquete' satisfies CrewOutingObjective,
    host: HOST_MEHDI,
    goingSeed: 4,
  },
  {
    id: 'demo_outing_buttes',
    title: 'Sortie longue Buttes',
    when: 'Samedi · 09:00',
    place: 'Parc des Buttes-Chaumont, entrée Botzaris',
    zone: 'Buttes-Chaumont',
    objective: 'conquete' satisfies CrewOutingObjective,
    host: HOST_LENA,
    goingSeed: 9,
  },
];
