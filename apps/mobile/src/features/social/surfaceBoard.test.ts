/**
 * GRYD — E53 : ce que le classement de SURFACE doit tenir (spec §10.2).
 *
 * Ces tests verrouillent les faits sur lesquels le rang d'un joueur repose :
 *  1. l'ORDRE est celui de §10.2 — surface, puis défenses, puis conquête ;
 *  2. le 4ᵉ critère n'existant pas (aucun snapshot n'est pris), une égalité
 *     parfaite RESTE une égalité : `compareSurfaceEntries` rend 0, et jamais un
 *     départage inventé ;
 *  3. la CLÉ D'ÉGALITÉ distingue « même surface » de « vraiment ex æquo » —
 *     sans elle l'écran afficherait « ex æquo » à deux joueurs que leurs
 *     défenses séparent ;
 *  4. l'UNITÉ est unique pour tout le tableau et ne fait JAMAIS disparaître une
 *     surface réelle derrière un « 0 » ;
 *  5. un joueur ACTIF mais sans surface (0 m²) est classé DERNIER, pas effacé.
 *
 * PUR : aucun React, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  compareSurfaceEntries,
  formatSurface,
  sortSurfaceEntries,
  surfaceTieKey,
  surfaceUnitFor,
  surfaceUnitLabel,
  type SurfaceEntry,
} from './surfaceBoard.ts';

function entry(over: Partial<SurfaceEntry> & { userId: string }): SurfaceEntry {
  return {
    pseudo: over.userId,
    controlledAreaM2: 0,
    successfulDefenses: 0,
    conqueredAreaM2: 0,
    ...over,
  };
}

Deno.test('§10.2 critère 1 — la SURFACE prime sur tout le reste', () => {
  const petit = entry({ userId: 'petit', controlledAreaM2: 10, successfulDefenses: 99, conqueredAreaM2: 999 });
  const grand = entry({ userId: 'grand', controlledAreaM2: 11 });
  assertEquals(sortSurfaceEntries([petit, grand]).map((e) => e.userId), ['grand', 'petit']);
});

Deno.test('§10.2 critère 2 — à surface égale, les DÉFENSES départagent', () => {
  const a = entry({ userId: 'a', controlledAreaM2: 100, successfulDefenses: 1, conqueredAreaM2: 500 });
  const b = entry({ userId: 'b', controlledAreaM2: 100, successfulDefenses: 2 });
  assertEquals(sortSurfaceEntries([a, b]).map((e) => e.userId), ['b', 'a']);
});

Deno.test('§10.2 critère 3 — puis la CONQUÊTE de la période', () => {
  const a = entry({ userId: 'a', controlledAreaM2: 100, successfulDefenses: 2, conqueredAreaM2: 10 });
  const b = entry({ userId: 'b', controlledAreaM2: 100, successfulDefenses: 2, conqueredAreaM2: 40 });
  assertEquals(sortSurfaceEntries([a, b]).map((e) => e.userId), ['b', 'a']);
});

Deno.test('le 4ᵉ critère de §10.2 n’est PAS inventé : égalité parfaite = 0', () => {
  const a = entry({ userId: 'a', controlledAreaM2: 100, successfulDefenses: 2, conqueredAreaM2: 40 });
  const b = entry({ userId: 'b', controlledAreaM2: 100, successfulDefenses: 2, conqueredAreaM2: 40 });
  assertEquals(compareSurfaceEntries(a, b), 0);
  // Et le tri ne les réordonne pas : l'ordre d'arrivée est conservé (tri stable).
  assertEquals(sortSurfaceEntries([a, b]).map((e) => e.userId), ['a', 'b']);
  assertEquals(sortSurfaceEntries([b, a]).map((e) => e.userId), ['b', 'a']);
});

Deno.test('la clé d’égalité sépare « même surface » de « vraiment ex æquo »', () => {
  const a = entry({ userId: 'a', controlledAreaM2: 100, successfulDefenses: 1 });
  const b = entry({ userId: 'b', controlledAreaM2: 100, successfulDefenses: 2 });
  const c = entry({ userId: 'c', controlledAreaM2: 100, successfulDefenses: 1 });
  assert(surfaceTieKey(a) !== surfaceTieKey(b), 'surfaces égales mais défenses différentes ≠ ex æquo');
  assertEquals(surfaceTieKey(a), surfaceTieKey(c));
});

Deno.test('un joueur ACTIF sans surface est classé DERNIER, jamais effacé', () => {
  const tient = entry({ userId: 'tient', controlledAreaM2: 5 });
  const perdu = entry({ userId: 'perdu', controlledAreaM2: 0, successfulDefenses: 3, conqueredAreaM2: 900 });
  const ordre = sortSurfaceEntries([perdu, tient]);
  assertEquals(ordre.map((e) => e.userId), ['tient', 'perdu']);
  assertEquals(ordre.length, 2);
});

Deno.test('l’unité est UNIQUE pour tout le tableau, choisie sur la plus grande valeur', () => {
  assertEquals(surfaceUnitFor([]), 'm2');
  assertEquals(surfaceUnitFor([entry({ userId: 'a', controlledAreaM2: 40_000 })]), 'm2');
  assertEquals(
    surfaceUnitFor([entry({ userId: 'a', controlledAreaM2: 40_000 }), entry({ userId: 'b', controlledAreaM2: 2_000_000 })]),
    'km2',
  );
  assertEquals(surfaceUnitLabel('m2'), 'm²');
  assertEquals(surfaceUnitLabel('km2'), 'km²');
});

Deno.test('une surface réelle ne disparaît JAMAIS derrière un « 0 »', () => {
  // 40 000 m² en m² : lisible, entier.
  assertEquals(formatSurface(40_000, 'm2', 'en-US'), '40,000');
  // Le même joueur dans un tableau basculé en km² : 0,04 — pas « 0 ».
  assertEquals(formatSurface(40_000, 'km2', 'en-US'), '0.04');
  assert(!/^0$/.test(formatSurface(40_000, 'km2', 'fr-FR')), 'jamais un zéro nu pour une surface réelle');
  // Séparateur décimal LOCALISÉ (le module ne devine aucune langue).
  assertEquals(formatSurface(1_500_000, 'km2', 'en-US'), '1.50');
  assertEquals(formatSurface(1_500_000, 'km2', 'fr-FR').replace(/ | /g, ' '), '1,50');
});

Deno.test('valeurs aberrantes : jamais NaN ni négatif à l’écran', () => {
  assertEquals(formatSurface(Number.NaN, 'm2', 'en-US'), '0');
  assertEquals(formatSurface(-12, 'm2', 'en-US'), '0');
  assertEquals(formatSurface(Number.POSITIVE_INFINITY, 'km2', 'en-US'), '0.00');
});

// ─── LE RÉGIME QUE CES TESTS NE COUVRAIENT PAS (28/07/2026) ─────────────────
// Le test « une surface réelle ne disparaît JAMAIS derrière un 0 » ne vérifiait
// QUE 40 000 m². Sous 5 000 m², deux décimales rendaient pourtant « 0,00 » : un
// joueur qui tient du terrain lisait qu'il n'en tient aucun. Trois docblocks
// (surfaceBoard.ts, league.ts, classement.tsx) ET le titre de ce test
// affirmaient la garantie ; le code ne la tenait pas. Ces deux blocs la tiennent
// et l'exercent précisément là où elle manquait.

Deno.test('km² : sous le seuil affichable, on écrit « < 0,01 » — jamais « 0,00 »', () => {
  // Le cas se produit DÈS QU'UN joueur du tableau passe 100 000 m²
  // (`surfaceUnitFor`) : tout le tableau bascule en km², petites lignes comprises.
  assertEquals(formatSurface(3_000, 'km2', 'en-US'), '< 0.01');
  assertEquals(formatSurface(4_999, 'km2', 'en-US'), '< 0.01');
  assertEquals(formatSurface(120, 'km2', 'en-US'), '< 0.01');
  assertEquals(formatSurface(1, 'km2', 'fr-FR'), '< 0,01');
  // Juste AU-DESSUS du seuil d'effacement (0,005 km² = 5 000 m²) : l'arrondi
  // normal donne déjà « 0,01 » — honnête, on ne le remplace pas par un plancher.
  assertEquals(formatSurface(5_000, 'km2', 'en-US'), '0.01');
  assertEquals(formatSurface(10_000, 'km2', 'en-US'), '0.01');
});

Deno.test('km² : un ZÉRO RÉEL reste « 0,00 » — le plancher ne le maquille pas', () => {
  // Le classement peut légitimement porter une ligne à 0 m² (un joueur actif
  // qui ne tient plus rien). Lui écrire « < 0,01 » suggérerait un terrain
  // minuscule là où il n'y en a aucun : l'erreur symétrique.
  assertEquals(formatSurface(0, 'km2', 'en-US'), '0.00');
  assertEquals(formatSurface(-5, 'km2', 'en-US'), '0.00');
  assertEquals(formatSurface(Number.NaN, 'km2', 'en-US'), '0.00');
});
