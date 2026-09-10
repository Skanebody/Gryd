/**
 * GRYD — L'EMBLÈME D'UN CREW : la valeur envoyée est celle qui sera rendue.
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT. `CrewHomeScreen.tsx` (9d1b9e7) créait un crew
 * avec `crew.createCrew(name, randomCrewColor(), cityId, access)` : un entier
 * TIRÉ AU SORT dans une colonne (`crews.color`) qu'AUCUNE surface du dépôt ne
 * relisait. Le fondateur ne choisissait rien, et n'aurait rien vu de son choix.
 * L'en-tête de la migration 0097 le disait déjà — « aucune surface du dépôt ne
 * la rend » — et en tirait la seule conclusion possible à l'époque : ne pas
 * peindre de sélecteur.
 *
 * Ces tests verrouillent l'autre moitié du contrat : la graine du blason ne
 * dépend QUE de l'emblème, sans quoi l'aperçu de création (fait avant que le
 * crew ait un identifiant) montrerait un blason différent de celui d'après.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_COLORS_COUNT } from '../../../../../packages/shared/src/game-rules.ts';
import {
  CREW_EMBLEMS,
  CREW_EMBLEM_DEFAULT,
  crewEmblemSeed,
  isCrewEmblem,
} from './crewEmblem.ts';

Deno.test('emblèmes : exactement les valeurs que create_crew accepte', () => {
  // 0097 : `if p_color is null or p_color < 0 or p_color >= 12` → refus
  // `bad_color`. La grille ne doit donc proposer QUE 0..CREW_COLORS_COUNT-1.
  assertEquals(CREW_EMBLEMS.length, CREW_COLORS_COUNT);
  assertEquals(CREW_EMBLEMS[0], 0);
  assertEquals(CREW_EMBLEMS[CREW_EMBLEMS.length - 1], CREW_COLORS_COUNT - 1);
  for (const value of CREW_EMBLEMS) assert(isCrewEmblem(value), `${value} refusé par sa propre garde`);
});

Deno.test('emblèmes : le défaut est proposable, donc jamais refusé par le serveur', () => {
  assert(isCrewEmblem(CREW_EMBLEM_DEFAULT));
  assert(CREW_EMBLEMS.includes(CREW_EMBLEM_DEFAULT));
});

Deno.test('isCrewEmblem : rien hors bornes, et surtout rien de « corrigé » en silence', () => {
  for (const value of [-1, CREW_COLORS_COUNT, 1.5, NaN, Infinity, null, undefined, '3', {}]) {
    assertEquals(isCrewEmblem(value), false, `valeur acceptée à tort : ${String(value)}`);
  }
});

Deno.test('crewEmblemSeed : DÉTERMINISTE, et sans dépendance à l’identifiant du crew', () => {
  // Le même emblème rend TOUJOURS la même graine : c'est ce qui fait que
  // l'aperçu de création et la page du crew montrent le même blason.
  for (const value of CREW_EMBLEMS) {
    assertEquals(crewEmblemSeed(value), crewEmblemSeed(value));
  }
  // Deux emblèmes différents ne partagent JAMAIS une graine — sinon la grille
  // proposerait douze cases dont certaines seraient le même dessin.
  const graines = new Set(CREW_EMBLEMS.map(crewEmblemSeed));
  assertEquals(graines.size, CREW_EMBLEMS.length, 'deux emblèmes partagent une graine');
});
