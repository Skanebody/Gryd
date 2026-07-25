/**
 * GRYD — verrouillage de la ligne « Prochaine mission » du Profil (25/07/2026).
 *
 * POURQUOI CE TEST EXISTE. `useRealMission` REPLIE trois situations très
 * différentes sur la même valeur `mission: null` — pas de session, échec de
 * lecture, et « l'effet n'a pas encore tourné ». Toutes les pannes de ce
 * dépliage seraient SILENCIEUSES : la ligne annoncerait calmement un échec qui
 * n'a pas eu lieu, ou se tairait sur une mission réelle. Chacun des quatre états
 * honnêtes doit donc se lire DIFFÉREMMENT, et rien ne doit être fabriqué.
 *
 * Deno, zéro réseau, zéro horloge : la fonction est pure, tout entre par l'input.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { nextMissionRow, type NextMissionRowInput } from './nextMissionRow.ts';

/** Compte lu, sans bloc PREMIÈRE MISSION, lecture terminée — le cas nominal. */
const base: NextMissionRowInput = {
  gameReady: true,
  firstMissionShown: false,
  loading: false,
  readStarted: true,
  mission: null,
};

/** Ancre RÉELLE (Paris) — la ligne n'en fait rien, mais le type l'exige. */
const anchor = { lat: 48.8566, lng: 2.3522 };

Deno.test('pas de compte / chiffres non lus (gameReady faux) → la ligne n’existe pas', () => {
  // Même avec une mission en main : l'écran affiche déjà « pas de compte »,
  // « échec de lecture » ou « on charge » — une 2ᵉ voix brouillerait l'état.
  assertEquals(
    nextMissionRow({ ...base, gameReady: false, mission: { kind: 'expand', anchor, distanceM: 400 } }),
    { kind: 'hidden' },
  );
  assertEquals(nextMissionRow({ ...base, gameReady: false, loading: true }), { kind: 'hidden' });
});

Deno.test('lecture EN COURS → état « loading » distinct (jamais un vide)', () => {
  assertEquals(nextMissionRow({ ...base, loading: true, readStarted: true }), { kind: 'loading' });
  // Même avant que `readStarted` bascule : `loading` prime, c'est un fait.
  assertEquals(nextMissionRow({ ...base, loading: true, readStarted: false }), { kind: 'loading' });
});

Deno.test('tout premier rendu (rien tenté) → RIEN, surtout pas un échec inventé', () => {
  // `useRealMission` démarre à { mission: null, loading: false } AVANT son effet.
  assertEquals(nextMissionRow({ ...base, readStarted: false, mission: null }), { kind: 'hidden' });
});

Deno.test('lecture tentée et revenue vide → « unavailable », distinct du vide', () => {
  assertEquals(nextMissionRow({ ...base, readStarted: true, mission: null }), {
    kind: 'unavailable',
  });
});

Deno.test('aucune zone (first_capture) → RIEN : le bloc PREMIÈRE MISSION le dit déjà', () => {
  assertEquals(nextMissionRow({ ...base, mission: { kind: 'first_capture' } }), { kind: 'hidden' });
});

Deno.test('bloc PREMIÈRE MISSION affiché → la ligne se tait, jamais deux vérités', () => {
  // Divergence possible entre les deux lectures de hex_claims (une zone expirée
  // n'est plus « à moi » pour la carte, mais reste une ancre d'extension).
  assertEquals(
    nextMissionRow({
      ...base,
      firstMissionShown: true,
      mission: { kind: 'expand', anchor, distanceM: 120 },
    }),
    { kind: 'hidden' },
  );
});

Deno.test('défense urgente → heures restantes + distance REPORTÉES telles quelles', () => {
  assertEquals(
    nextMissionRow({
      ...base,
      mission: { kind: 'defend_expiring', anchor, hoursLeft: 5, distanceM: 1234, areaM2: 90_000 },
    }),
    { kind: 'defend', hoursLeft: 5, distanceM: 1234 },
  );
});

Deno.test('défense sans fix GPS → distance null (jamais une distance inventée)', () => {
  assertEquals(
    nextMissionRow({
      ...base,
      mission: { kind: 'defend_expiring', anchor, hoursLeft: 2, distanceM: null, areaM2: 1 },
    }),
    { kind: 'defend', hoursLeft: 2, distanceM: null },
  );
});

Deno.test('extension → distance reportée, ou null sans fix', () => {
  assertEquals(nextMissionRow({ ...base, mission: { kind: 'expand', anchor, distanceM: 800 } }), {
    kind: 'expand',
    distanceM: 800,
  });
  assertEquals(nextMissionRow({ ...base, mission: { kind: 'expand', anchor, distanceM: null } }), {
    kind: 'expand',
    distanceM: null,
  });
});
