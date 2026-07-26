/**
 * GRYD — ADN VISUEL DU TERRITOIRE (planches Vague 1) : tests PURS du mapping
 * RÔLE → style (`territoryPaint`, shared) et de la géométrie du LISERÉ INTERNE
 * (`ringSignedArea` / `toCcwRing` / `territoryLisereLines`, allTerritories).
 *
 * Ces fonctions PORTENT la signature mesurée sur -selection8 (PORT OUEST = MOI,
 * K.RUNNER = rival) : contour à la teinte de rôle, LISERÉ INTERNE présent UNIQUEMENT
 * sur la possession, fill faible de la même teinte. On verrouille ici :
 *   1. le contour/liseré/fill de chaque rôle DÉRIVENT bien des tokens de charte ;
 *   2. le liseré est un privilège de `mine` (absent du rival/protégé — fidélité à
 *      la planche, où seule MA zone porte le 2ᵉ trait) ;
 *   3. la normalisation de winding est DÉTERMINISTE (le line-offset du liseré
 *      pointera toujours dedans, jamais un halo §0), sans altérer la forme.
 * Deno, aucun réseau, on importe DIRECTEMENT les modules de prod → zéro drift.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { colors, gameColors, territoryLisere, territoryPaint, withAlpha } from '@klaim/shared';
// Géométrie du liseré importée du module PUR (pas d'allTerritories → pas de barrel RN).
import {
  ringSignedArea,
  territoryLisereLines,
  toCcwRing,
} from './ringWinding.ts';

// ── 1. territoryPaint : la SIGNATURE possession (liseré) est réservée à `mine` ──

Deno.test('territoryPaint(mine) : contour chartreuse + fill chartreuse + LISERÉ (signature)', () => {
  const p = territoryPaint('mine');
  // Contour = chartreuse. On vérifie la DÉRIVATION du token, JAMAIS un hex en dur :
  // ce test verrouillait « 201,255,56 » (#C9FF38) et est devenu faux le 26/07 au
  // passage à #C2FF23 (spec §3.2 / D-19). Un test de palette ne doit casser que si
  // la RÈGLE change (le rôle « moi » est chartreuse), pas si la teinte change.
  assertEquals(p.stroke, withAlpha(colors.chartreuse, 0.9));
  // Fill = le token mesuré chartreuse14 (~0,15).
  assertEquals(p.fill, colors.chartreuse14);
  // Nom écrit dedans = chartreuse plein.
  assertEquals(p.label, colors.chartreuse);
  // LISERÉ INTERNE présent = le trait « à moi » de la planche (token chartreuse40).
  assertEquals(p.lisere, colors.chartreuse40);
});

Deno.test('territoryPaint(rival) : contour + fill orange, mais AUCUN liseré (planche)', () => {
  const p = territoryPaint('rival');
  // Contour/fill DÉRIVENT du token de rôle rival — jamais un hex en dur (même
  // raison que pour `mine` ci-dessus : #FF7043 → #FF643C le 26/07, spec §3.2).
  assertEquals(p.stroke, withAlpha(gameColors.rival, 0.85));
  assertEquals(p.fill, withAlpha(gameColors.rival, 0.1));
  assertEquals(p.label, gameColors.rival);
  // Fidélité planche : le rival n'a PAS de 2ᵉ trait interne (fill uni).
  assertEquals(p.lisere, null);
});

Deno.test('territoryPaint : SEUL `mine` porte le liseré (possession) ; tous les autres = null', () => {
  const withLisere = (['mine', 'ally', 'rival', 'contested', 'protected', 'neutral', 'decay', 'bonus'] as const)
    .filter((r) => territoryPaint(r).lisere !== null);
  assertEquals(withLisere, ['mine']);
});

Deno.test('territoryPaint : chaque rôle rend un style COMPLET (jamais de champ vide)', () => {
  for (const r of ['mine', 'ally', 'rival', 'contested', 'protected', 'neutral', 'decay', 'bonus'] as const) {
    const p = territoryPaint(r);
    assert(p.stroke.length > 0, `${r}: stroke vide`);
    assert(p.fill.length > 0, `${r}: fill vide`);
    assert(p.label.length > 0, `${r}: label vide`);
  }
});

Deno.test('territoryLisere : spec chiffrée saine (retrait + filet fin, tokens)', () => {
  assert(territoryLisere.insetPt > 0, 'le liseré doit être en retrait vers l’intérieur');
  assert(territoryLisere.widthPt > 0 && territoryLisere.widthPt < 3, 'un filet, pas un 2ᵉ contour épais');
});

// ── 2. Géométrie du liseré : winding DÉTERMINISTE, forme intacte ──────────────

// Carré unité, sommets en sens ANTIHORAIRE (CCW), anneau fermé.
const SQUARE_CCW: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];
const SQUARE_CW: [number, number][] = [...SQUARE_CCW].reverse();

Deno.test('ringSignedArea : signe = sens de parcours (CCW > 0, CW < 0)', () => {
  assert(ringSignedArea(SQUARE_CCW) > 0);
  assert(ringSignedArea(SQUARE_CW) < 0);
});

Deno.test('toCcwRing : normalise TOUJOURS en CCW, quel que soit le winding d’entrée', () => {
  assert(ringSignedArea(toCcwRing(SQUARE_CCW)) > 0);
  assert(ringSignedArea(toCcwRing(SQUARE_CW)) > 0);
});

Deno.test('toCcwRing : ne change pas la FORME (même ensemble de sommets, anneau fermé)', () => {
  const out = toCcwRing(SQUARE_CW);
  // Toujours fermé (premier = dernier).
  assertEquals(out[0], out[out.length - 1]);
  // Même multiset de points (une simple inversion, aucun point perdu/ajouté).
  const key = (r: [number, number][]) => [...r].map((p) => p.join(',')).sort().join('|');
  assertEquals(key(out), key(SQUARE_CW));
});

Deno.test('toCcwRing : n’altère JAMAIS l’entrée (copie défensive)', () => {
  const input: [number, number][] = [...SQUARE_CW];
  const snapshot = JSON.stringify(input);
  toCcwRing(input);
  assertEquals(JSON.stringify(input), snapshot);
});

Deno.test('territoryLisereLines : un Polygon → une LineString CCW, properties préservées', () => {
  const data = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [SQUARE_CW] },
        properties: { state: 'crew', zoneId: 'z-1' },
      },
    ],
  };
  const out = territoryLisereLines(data);
  assertEquals(out.features.length, 1);
  const f = out.features[0]!;
  assertEquals(f.geometry.type, 'LineString');
  // Normalisé CCW (le line-offset négatif pointera dedans).
  assert(ringSignedArea(f.geometry.coordinates as [number, number][]) > 0);
  // Contrat C1 : zoneId/state suivent la zone (dimming + tap).
  assertEquals(f.properties?.zoneId, 'z-1');
  assertEquals(f.properties?.state, 'crew');
});

Deno.test('territoryLisereLines : une MultiPolygon → un liseré par polygone (contour extérieur)', () => {
  const data = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'MultiPolygon' as const,
          coordinates: [[SQUARE_CW], [SQUARE_CCW]],
        },
        properties: { state: 'crew', zoneId: 'z-2' },
      },
    ],
  };
  const out = territoryLisereLines(data);
  assertEquals(out.features.length, 2);
  for (const f of out.features) {
    assertEquals(f.geometry.type, 'LineString');
    assert(ringSignedArea(f.geometry.coordinates as [number, number][]) > 0);
  }
});

Deno.test('territoryLisereLines : les couloirs LineString n’ont PAS de liseré (ignorés)', () => {
  const data = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] },
        properties: { state: 'crew', zoneId: 'corridor' },
      },
    ],
  };
  assertEquals(territoryLisereLines(data).features.length, 0);
});
