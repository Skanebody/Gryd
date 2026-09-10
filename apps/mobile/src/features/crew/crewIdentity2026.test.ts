/**
 * GRYD — L'IDENTITÉ D'UN CREW NE SE DEVINE PAS (LOT K, 11/09/2026).
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ══════════════════════════════════════════
 * Avant 0182, `crew_overview()` ne rendait NI `city_name` NI `access` : les
 * deux premiers tests rejouent cette forme (la ligne de crew d'avant 0182) et
 * exigent que l'écran n'en tire AUCUNE phrase. Sans eux, ce fichier pourrait
 * être vert parce qu'il ne demande rien.
 *
 * ═══ CE QU'IL VERROUILLE ═══════════════════════════════════════════════════
 *  · un statut d'accueil INCONNU ne devient jamais « Ouvert à tous » ;
 *  · un identifiant de ville ne devient jamais un nom de ville ;
 *  · un échec de lecture ne devient jamais « personne ne tient de terrain » ;
 *  · un crew qui tient du terrain ne se voit jamais attribuer une SURFACE.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  crewAccessLabel2026,
  crewDisciplinesLabel2026,
  crewIdentityLine2026,
  crewTerrainState2026,
  isCrewAccess2026,
} from './crewIdentity2026.ts';

// ═══ ÉTAPE 0 — la forme d'AVANT 0182 ════════════════════════════════════════

Deno.test('ÉTAPE 0 — la ligne de crew d’avant 0182 ne produit AUCUNE phrase', () => {
  // `crew_overview()` (0152) rendait exactement : id, name, color, city_id.
  const before = { cityName: null, access: undefined };
  assertEquals(crewIdentityLine2026(before, true), null);
  assertEquals(crewIdentityLine2026(before, false), null);
});

Deno.test('ÉTAPE 0 — un identifiant de ville n’est PAS un nom de ville', () => {
  // Ce que l'écran aurait pu peindre s'il s'était rabattu sur `city_id`.
  assertEquals(crewIdentityLine2026({ cityName: null, access: 'open' }, true), 'Ouvert à tous');
});

// ═══ L'ACCUEIL ══════════════════════════════════════════════════════════════

Deno.test('les trois accueils de 0097 sont nommés, en français et en anglais', () => {
  assertEquals(crewAccessLabel2026('open', true), 'Ouvert à tous');
  assertEquals(crewAccessLabel2026('on_request', true), 'Sur demande');
  assertEquals(crewAccessLabel2026('invite_only', true), 'Sur invitation');
  assertEquals(crewAccessLabel2026('open', false), 'Open to all');
  assertEquals(crewAccessLabel2026('on_request', false), 'On request');
  assertEquals(crewAccessLabel2026('invite_only', false), 'Invite only');
});

Deno.test('un statut INCONNU de ce build ne devient jamais « Ouvert à tous »', () => {
  for (const value of ['closed', 'OPEN', '', null, undefined, 3, {}]) {
    assertEquals(isCrewAccess2026(value), false, `${String(value)} n’est pas un accueil connu`);
    assertEquals(crewAccessLabel2026(value, true), null, `${String(value)} ne se peint pas`);
  }
});

Deno.test('la ligne d’identité joint ville et accueil par un point médian, jamais un tiret', () => {
  const line = crewIdentityLine2026({ cityName: 'Rouen', access: 'on_request' }, true);
  assertEquals(line, 'Rouen · Sur demande');
  assertEquals(line?.includes('—'), false);
  assertEquals(line?.includes('–'), false);
});

Deno.test('une ville seule, un accueil seul : la ligne reste juste', () => {
  assertEquals(crewIdentityLine2026({ cityName: 'Rouen', access: 'inconnu' }, true), 'Rouen');
  assertEquals(crewIdentityLine2026({ cityName: '   ', access: 'open' }, true), 'Ouvert à tous');
});

// ═══ LE TERRAIN DU CREW : quatre états, jamais trois ═══════════════════════

Deno.test('lecture en cours : l’écran n’affirme rien sur le crew', () => {
  assertEquals(
    crewTerrainState2026({ loading: true, failed: false, territory: null }).kind,
    'loading',
  );
});

Deno.test('ÉCHEC de lecture ≠ « personne ne tient de terrain »', () => {
  assertEquals(
    crewTerrainState2026({ loading: false, failed: true, territory: null }).kind,
    'unavailable',
  );
  // Agrégat NON LU (null) sans drapeau d'échec : même verdict. C'est le cas
  // exact d'un `useRealCrew({ withOverview: false })` ou d'un contrat inattendu.
  assertEquals(
    crewTerrainState2026({ loading: false, failed: false, territory: null }).kind,
    'unavailable',
  );
  // Et l'échec l'emporte même si un agrégat périmé traîne encore en mémoire.
  assertEquals(
    crewTerrainState2026({
      loading: false,
      failed: true,
      territory: { membersHolding: 4, holdsRun: true, holdsBike: false, lastCaptureAt: null },
    }).kind,
    'unavailable',
  );
});

Deno.test('lu et vide : c’est un fait sur le monde, et il se dit', () => {
  assertEquals(
    crewTerrainState2026({
      loading: false,
      failed: false,
      territory: { membersHolding: 0, holdsRun: false, holdsBike: false, lastCaptureAt: null },
    }).kind,
    'empty',
  );
});

Deno.test('lu et tenu : des PERSONNES, jamais une surface ni un rang (0126)', () => {
  const state = crewTerrainState2026({
    loading: false,
    failed: false,
    territory: { membersHolding: 3, holdsRun: true, holdsBike: true, lastCaptureAt: '2026-09-10T07:00:00Z' },
  });
  assertEquals(state.kind, 'held');
  assertEquals(
    Object.keys(state).sort(),
    ['holdsBike', 'holdsRun', 'kind', 'lastCaptureAt', 'membersHolding'],
  );
});

Deno.test('les disciplines sont deux booléens, jamais une somme', () => {
  assertEquals(crewDisciplinesLabel2026({ holdsRun: true, holdsBike: true }, true), 'Course et vélo');
  assertEquals(crewDisciplinesLabel2026({ holdsRun: true, holdsBike: false }, true), 'Course');
  assertEquals(crewDisciplinesLabel2026({ holdsRun: false, holdsBike: true }, true), 'Vélo');
  // Aucune discipline connue : on se tait, on n'écrit pas « aucune ».
  assertEquals(crewDisciplinesLabel2026({ holdsRun: false, holdsBike: false }, true), null);
});
