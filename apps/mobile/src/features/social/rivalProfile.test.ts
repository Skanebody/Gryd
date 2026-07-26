/**
 * GRYD — E26 : la relation de rivalité se calcule de faits PUBLICS, et l'écran
 * ne prétend JAMAIS à un profil qu'aucune source consentie n'a peuplé.
 *
 * Ces tests gardent deux invariants de la constitution :
 *  · aucun rival fabriqué : `resolveRivalProfileState` renvoie « indisponible »
 *    dès que l'identité consentie manque (l'état d'aujourd'hui, O1 non levé) ;
 *  · « Votre rivalité » est une DÉRIVATION vérifiable (secteurs repris /
 *    frontière / litige), pas une phrase inventée.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  deriveRivalry,
  resolveRivalProfileState,
  rivalryHeadline,
  type MyTerritoryContext,
  type PublicTerritoryFacts,
} from './rivalProfile.ts';

// Adjacence de test : secteurs nommés « x-y » sur une grille, voisins si |Δ| = 1.
const gridAdjacent = (a: string, b: string): boolean => {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  if (pa.length !== 2 || pb.length !== 2) return false;
  const dx = Math.abs(pa[0] - pb[0]);
  const dy = Math.abs(pa[1] - pb[1]);
  return dx + dy === 1;
};

const noAdjacency = () => false;

const emptyMine: MyTerritoryContext = {
  ownedSectorIds: [],
  contestedSectorIds: [],
  formerSectorIds: [],
};
const emptyTheirs: PublicTerritoryFacts = { ownedSectorIds: [], contestedSectorIds: [] };

// ─── deriveRivalry ───────────────────────────────────────────────────────────

Deno.test('rivalité : il tient une zone que je tenais → repris (« votre ancienne zone »)', () => {
  const mine: MyTerritoryContext = {
    ownedSectorIds: ['0-0'],
    contestedSectorIds: [],
    formerSectorIds: ['saint-remy'],
  };
  const theirs: PublicTerritoryFacts = { ownedSectorIds: ['saint-remy'], contestedSectorIds: [] };
  const rel = deriveRivalry(mine, theirs, { sameCrew: false, adjacent: noAdjacency });
  assertEquals(rel.kind, 'rivalry');
  assertEquals(rel.reclaimedFromMeSectorIds, ['saint-remy']);
  assertEquals(rel.sharedBorderSectorIds, []);
  assertEquals(rel.contestedBetweenUsSectorIds, []);
});

Deno.test('frontière commune : mes secteurs adjacents à un des siens', () => {
  const mine: MyTerritoryContext = {
    ownedSectorIds: ['0-0', '5-5'], // 0-0 touche 0-1, 5-5 ne touche rien à lui
    contestedSectorIds: [],
    formerSectorIds: [],
  };
  const theirs: PublicTerritoryFacts = { ownedSectorIds: ['0-1'], contestedSectorIds: [] };
  const rel = deriveRivalry(mine, theirs, { sameCrew: false, adjacent: gridAdjacent });
  assertEquals(rel.sharedBorderSectorIds, ['0-0']);
  assertEquals(rel.kind, 'rivalry');
});

Deno.test('litige : contesté chez l’un et tenu par l’autre, dans les deux sens', () => {
  const mine: MyTerritoryContext = {
    ownedSectorIds: ['a'], // que le rival conteste
    contestedSectorIds: ['b'], // que le rival tient
    formerSectorIds: [],
  };
  const theirs: PublicTerritoryFacts = {
    ownedSectorIds: ['b'],
    contestedSectorIds: ['a'],
  };
  const rel = deriveRivalry(mine, theirs, { sameCrew: false, adjacent: noAdjacency });
  assertEquals(rel.contestedBetweenUsSectorIds, ['a', 'b']); // trié + dédupliqué
  assertEquals(rel.kind, 'rivalry');
});

Deno.test('même crew → teammate (jamais « rival »), même avec frontière commune', () => {
  const mine: MyTerritoryContext = {
    ownedSectorIds: ['0-0'],
    contestedSectorIds: [],
    formerSectorIds: [],
  };
  const theirs: PublicTerritoryFacts = { ownedSectorIds: ['0-1'], contestedSectorIds: [] };
  const rel = deriveRivalry(mine, theirs, { sameCrew: true, adjacent: gridAdjacent });
  assertEquals(rel.kind, 'teammate');
  // La frontière reste calculée (utile au bloc coopération), seul le KIND change.
  assertEquals(rel.sharedBorderSectorIds, ['0-0']);
});

Deno.test('aucun historique commun → none (la planche n’affiche alors AUCUN bloc)', () => {
  const mine: MyTerritoryContext = {
    ownedSectorIds: ['9-9'],
    contestedSectorIds: [],
    formerSectorIds: ['x'],
  };
  const theirs: PublicTerritoryFacts = { ownedSectorIds: ['1-1'], contestedSectorIds: [] };
  const rel = deriveRivalry(mine, theirs, { sameCrew: false, adjacent: gridAdjacent });
  assertEquals(rel.kind, 'none');
  assertEquals(rel.reclaimedFromMeSectorIds, []);
  assertEquals(rel.sharedBorderSectorIds, []);
  assertEquals(rel.contestedBetweenUsSectorIds, []);
});

Deno.test('deux joueurs sans aucun territoire → none (rien à dériver, rien inventé)', () => {
  const rel = deriveRivalry(emptyMine, emptyTheirs, { sameCrew: false, adjacent: gridAdjacent });
  assertEquals(rel.kind, 'none');
});

Deno.test('sortie déterministe : les listes sont triées et dédupliquées', () => {
  const mine: MyTerritoryContext = {
    ownedSectorIds: [],
    contestedSectorIds: [],
    formerSectorIds: ['c', 'a', 'b', 'a'], // doublon + désordre
  };
  const theirs: PublicTerritoryFacts = {
    ownedSectorIds: ['b', 'c', 'a', 'b'],
    contestedSectorIds: [],
  };
  const rel = deriveRivalry(mine, theirs, { sameCrew: false, adjacent: noAdjacency });
  assertEquals(rel.reclaimedFromMeSectorIds, ['a', 'b', 'c']);
});

// ─── rivalryHeadline ─────────────────────────────────────────────────────────

Deno.test('headline : rivalité résume les compteurs et le 1er secteur repris', () => {
  const rel = deriveRivalry(
    { ownedSectorIds: ['0-0'], contestedSectorIds: [], formerSectorIds: ['saint-remy'] },
    { ownedSectorIds: ['saint-remy', '0-1'], contestedSectorIds: [] },
    { sameCrew: false, adjacent: gridAdjacent },
  );
  assertEquals(rivalryHeadline(rel), {
    kind: 'rivalry',
    reclaimedCount: 1,
    sharedBorderCount: 1,
    contestedCount: 0,
    leadReclaimed: 'saint-remy',
  });
});

Deno.test('headline : teammate et none sont des variantes distinctes sans compteurs', () => {
  assertEquals(rivalryHeadline({ kind: 'teammate', sharedBorderSectorIds: [], reclaimedFromMeSectorIds: [], contestedBetweenUsSectorIds: [] }), { kind: 'teammate' });
  assertEquals(rivalryHeadline({ kind: 'none', sharedBorderSectorIds: [], reclaimedFromMeSectorIds: [], contestedBetweenUsSectorIds: [] }), { kind: 'none' });
});

// ─── resolveRivalProfileState : la porte d'honnêteté ─────────────────────────

Deno.test('AUJOURD’HUI (O1) : aucune identité consentie → indisponible, jamais un faux profil', () => {
  assertEquals(
    resolveRivalProfileState({ identity: 'none', territoryAvailable: false }),
    { status: 'unavailable' },
  );
  // Même si un territoire était lisible : sans identité consentie, indisponible.
  assertEquals(
    resolveRivalProfileState({ identity: 'none', territoryAvailable: true }),
    { status: 'unavailable' },
  );
});

Deno.test('identité réduite E25 → restricted (crew visible, stats/carte masquées)', () => {
  assertEquals(
    resolveRivalProfileState({ identity: 'restricted', territoryAvailable: true }),
    { status: 'restricted' },
  );
});

Deno.test('identité publique mais territoire non lu → restricted (pas de blocs vides prétendus)', () => {
  assertEquals(
    resolveRivalProfileState({ identity: 'public', territoryAvailable: false }),
    { status: 'restricted' },
  );
});

Deno.test('identité publique + territoire consenti lu → profil complet', () => {
  assertEquals(
    resolveRivalProfileState({ identity: 'public', territoryAvailable: true }),
    { status: 'full' },
  );
});
