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
  resolveRivalProfileScreen,
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

// ─── resolveRivalProfileScreen (E56 : ce que la lecture PUBLIQUE autorise) ────
//
// Ces tests gardent la frontière la plus coûteuse de l'écran : E56 PUBLIE de
// l'information sur AUTRUI. Chaque cas ci-dessous vérifie qu'un état de lecture
// ne devient jamais une affirmation plus forte que lui.

Deno.test('lecture en cours → aucun profil affirmé (un chargement ne dit rien du joueur)', () => {
  assertEquals(resolveRivalProfileScreen({ status: 'loading' }), { status: 'loading' });
});

Deno.test('hors session → état propre, jamais un profil vide', () => {
  assertEquals(resolveRivalProfileScreen({ status: 'signed_out' }), { status: 'signed_out' });
});

Deno.test('échec de lecture ≠ profil inexistant', () => {
  assertEquals(resolveRivalProfileScreen({ status: 'failed' }), { status: 'failed' });
});

Deno.test('profil non rendu (inexistant OU non visible) → indisponible, sans distinguer les deux', () => {
  assertEquals(resolveRivalProfileScreen({ status: 'not_found' }), { status: 'unavailable' });
});

Deno.test('carte refusée par son propriétaire → profil restreint, aucun chiffre, aucun CTA', () => {
  const screen = resolveRivalProfileScreen({ status: 'hidden' });
  assertEquals(screen, {
    status: 'profile',
    identity: { status: 'restricted' },
    territory: { kind: 'hidden' },
    canOpenZones: false,
  });
});

Deno.test('aucune zone publiée ≠ carte masquée (deux mondes distincts)', () => {
  const screen = resolveRivalProfileScreen({ status: 'empty' });
  assertEquals(screen, {
    status: 'profile',
    identity: { status: 'restricted' },
    territory: { kind: 'empty' },
    canOpenZones: false,
  });
});

Deno.test('des lignes illisibles ne se disent JAMAIS « il ne tient rien »', () => {
  const screen = resolveRivalProfileScreen({ status: 'unreadable', count: 3 });
  assertEquals(screen, {
    status: 'profile',
    identity: { status: 'restricted' },
    territory: { kind: 'unreadable', count: 3 },
    canOpenZones: false,
  });
});

Deno.test('territoire public lu → profil complet, faits MESURÉS, CTA autorisé', () => {
  const screen = resolveRivalProfileScreen({
    status: 'ready',
    zones: [],
    facts: { zoneCount: 4, totalAreaM2: 250_000, oldestHeldFor: { unit: 'd', value: 3 } },
    unreadable: 0,
  });
  assertEquals(screen, {
    status: 'profile',
    identity: { status: 'full' },
    territory: { kind: 'facts', zoneCount: 4, totalAreaM2: 250_000 },
    canOpenZones: true,
  });
});

Deno.test('zéro zone dessinable → aucun CTA « voir ses zones » (jamais de bouton mort)', () => {
  const screen = resolveRivalProfileScreen({
    status: 'ready',
    zones: [],
    facts: { zoneCount: 0, totalAreaM2: 0, oldestHeldFor: null },
    unreadable: 0,
  });
  assertEquals(screen.status, 'profile');
  if (screen.status === 'profile') assertEquals(screen.canOpenZones, false);
});

Deno.test('aucun horaire ni contour ne traverse le moteur d’écran', () => {
  // La sortie `facts` ne porte QUE deux nombres agrégés : ni géométrie, ni
  // instant. Ce test fige cette surface — l'élargir demanderait de le casser.
  const screen = resolveRivalProfileScreen({
    status: 'ready',
    zones: [],
    facts: { zoneCount: 1, totalAreaM2: 10, oldestHeldFor: { unit: 'h', value: 5 } },
    unreadable: 0,
  });
  if (screen.status !== 'profile' || screen.territory.kind !== 'facts') throw new Error('état inattendu');
  assertEquals(Object.keys(screen.territory).sort(), ['kind', 'totalAreaM2', 'zoneCount']);
});
