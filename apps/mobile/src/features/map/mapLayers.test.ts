/**
 * GRYD — E12 « Couches et filtres » : ce que les tests VERROUILLENT.
 *
 *   1. les sept clés de la spec survivent à un stockage corrompu — et retombent
 *      sur le DÉFAUT de chaque clé, jamais sur `false` (une préférence illisible
 *      ne doit pas faire disparaître du territoire réel) ;
 *   2. la persistance est PAR DISCIPLINE : deux clés distinctes, jamais une
 *      seule partagée (spec l.922, `ACTIVITY_SCOPE.mapLayers`) ;
 *   3. `mine` et `crew` sont deux couches DISTINCTES alors que le rendu les
 *      peint de la même couleur (§C) — c'est ce qui rend les deux interrupteurs
 *      de la spec honorables plutôt que morts ;
 *   4. `contested` gagne sur la propriété, comme dans `territoryRole` ;
 *   5. L'EXCEPTION D'URGENCE (spec l.922) : une zone À MOI qui expire sous
 *      `MAP_URGENT_DEFENSE_WINDOW_H` survit à son filtre — SOUS FORME DE
 *      MARQUEUR, jamais en rallumant le calque ; une zone RIVALE urgente, elle,
 *      ne survit pas (« concernant l'utilisateur » est une condition) ;
 *   6. une échéance DÉPASSÉE n'est plus une menace : elle ne rallume rien.
 *
 * Plus les deux dérivations d'analytics d'E11 (`mapAnalytics.ts`), dont la
 * seule règle non négociable est : ne rien affirmer qu'on ne sache.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';
import {
  MAP_LAYER_KEYS,
  MAP_URGENT_DEFENSE_WINDOW_H,
  type MapLayerKey,
} from '@klaim/shared';
import {
  DEFAULT_MAP_LAYERS,
  WIRED_MAP_LAYERS,
  allLayersVisible,
  filterTerritoriesByLayers,
  isUrgentUserThreat,
  mapLayersStorageKey,
  mapModeStorageKey,
  parseMapLayers,
  serializeMapLayers,
  territoryLayerKey,
  withLayer,
  type LayerTerritoryFacts,
  type LayerViewer,
} from './mapLayers.ts';
import { mapRecommendationKind, mapViewState, zoneTapRole } from './mapAnalytics.ts';

const ME = 'user-me';
const MATE = 'user-mate';
const CREW = 'crew-1';
const RIVAL = 'user-rival';

const viewer: LayerViewer = {
  meId: ME,
  crewIds: new Set([ME, MATE, CREW]),
};

function facts(over: Partial<LayerTerritoryFacts> = {}): LayerTerritoryFacts {
  return {
    status: 'crew',
    ownerId: ME,
    ownerType: 'user',
    earliestDecayAt: null,
    ...over,
  };
}

// ─── 1. Stockage tolérant ────────────────────────────────────────────────────

Deno.test('parseMapLayers — JSON invalide ou absent ⇒ null (l\'appelant garde le défaut)', () => {
  assertEquals(parseMapLayers(null), null);
  assertEquals(parseMapLayers('pas du json'), null);
  assertEquals(parseMapLayers('[]'), null);
  assertEquals(parseMapLayers('"mine"'), null);
});

Deno.test('parseMapLayers — clé manquante ou d\'un type inattendu ⇒ DÉFAUT de la clé', () => {
  const parsed = parseMapLayers('{"mine":false,"crew":"oui"}');
  assert(parsed !== null);
  // Explicitement éteinte : respectée.
  assertFalse(parsed.mine);
  // Type inattendu ⇒ défaut (true), surtout PAS false.
  assert(parsed.crew);
  // Absentes ⇒ défaut.
  for (const key of MAP_LAYER_KEYS) {
    if (key === 'mine') continue;
    assertEquals(parsed[key], DEFAULT_MAP_LAYERS[key]);
  }
});

Deno.test('serializeMapLayers — écrit TOUJOURS les sept clés', () => {
  const round = parseMapLayers(serializeMapLayers(withLayer(DEFAULT_MAP_LAYERS, 'rivals', false)));
  assert(round !== null);
  assertEquals(Object.keys(JSON.parse(serializeMapLayers(DEFAULT_MAP_LAYERS))).length, 7);
  assertFalse(round.rivals);
  assert(round.mine);
});

Deno.test('withLayer — objet inchangé si la valeur ne bouge pas (pas de re-render inutile)', () => {
  assert(withLayer(DEFAULT_MAP_LAYERS, 'mine', true) === DEFAULT_MAP_LAYERS);
  assert(withLayer(DEFAULT_MAP_LAYERS, 'mine', false) !== DEFAULT_MAP_LAYERS);
});

Deno.test('allLayersVisible — vrai au défaut, faux dès qu\'un filtre est posé', () => {
  assert(allLayersVisible(DEFAULT_MAP_LAYERS));
  assertFalse(allLayersVisible(withLayer(DEFAULT_MAP_LAYERS, 'labels', false)));
});

// ─── 2. Une clé PAR DISCIPLINE (spec l.922) ─────────────────────────────────

Deno.test('les réglages persistent PAR ACTIVITÉ — deux clés distinctes', () => {
  assert(mapLayersStorageKey('run') !== mapLayersStorageKey('bike'));
  assert(mapModeStorageKey('run') !== mapModeStorageKey('bike'));
  // La lentille et les filtres ne se marchent pas dessus non plus.
  assert(mapLayersStorageKey('run') !== mapModeStorageKey('run'));
});

Deno.test('WIRED_MAP_LAYERS — sous-ensemble STRICT des clés de la spec', () => {
  for (const key of WIRED_MAP_LAYERS) {
    assert((MAP_LAYER_KEYS as readonly string[]).includes(key));
  }
  // Les deux couches sans rendu ne sont pas proposées (constitution §2 : aucun
  // bouton mort) — mais elles restent dans le type et le stockage.
  assertFalse(WIRED_MAP_LAYERS.includes('missions' as MapLayerKey));
  assertFalse(WIRED_MAP_LAYERS.includes('private_zones' as MapLayerKey));
});

// ─── 3/4. À quelle couche appartient un territoire ──────────────────────────

Deno.test('territoryLayerKey — mine / crew / rivals sont trois couches distinctes', () => {
  assertEquals(territoryLayerKey(facts({ ownerId: ME, ownerType: 'user' }), viewer), 'mine');
  assertEquals(territoryLayerKey(facts({ ownerId: CREW, ownerType: 'crew' }), viewer), 'crew');
  // Un COÉQUIPIER (ligne `owned_personal` d'un membre) reste « mon crew ».
  assertEquals(territoryLayerKey(facts({ ownerId: MATE, ownerType: 'user' }), viewer), 'mine');
  assertEquals(
    territoryLayerKey(facts({ ownerId: RIVAL, ownerType: 'user', status: 'rival' }), viewer),
    'rivals',
  );
});

Deno.test('territoryLayerKey — contested gagne sur la propriété', () => {
  assertEquals(territoryLayerKey(facts({ status: 'contested' }), viewer), 'contested');
  assertEquals(
    territoryLayerKey(facts({ status: 'contested', ownerId: RIVAL }), viewer),
    'contested',
  );
});

Deno.test('territoryLayerKey — un uuid de crew qui vaudrait le mien ne devient pas « mine »', () => {
  const solo: LayerViewer = { meId: ME, crewIds: null };
  assertEquals(territoryLayerKey(facts({ ownerId: ME, ownerType: 'crew' }), solo), 'rivals');
});

// ─── 5/6. L'exception d'urgence ─────────────────────────────────────────────

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const inHours = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

Deno.test('isUrgentUserThreat — MA zone qui expire sous la fenêtre est une menace', () => {
  assert(
    isUrgentUserThreat(facts({ earliestDecayAt: inHours(MAP_URGENT_DEFENSE_WINDOW_H - 1) }), viewer, NOW),
  );
  assertFalse(
    isUrgentUserThreat(facts({ earliestDecayAt: inHours(MAP_URGENT_DEFENSE_WINDOW_H + 1) }), viewer, NOW),
  );
});

Deno.test('isUrgentUserThreat — une échéance DÉPASSÉE n\'est plus une menace', () => {
  assertFalse(isUrgentUserThreat(facts({ earliestDecayAt: inHours(-1) }), viewer, NOW));
});

Deno.test('isUrgentUserThreat — une zone RIVALE ne menace personne, même contestée', () => {
  assertFalse(
    isUrgentUserThreat(
      facts({ status: 'contested', ownerId: RIVAL, earliestDecayAt: inHours(1) }),
      viewer,
      NOW,
    ),
  );
});

Deno.test('isUrgentUserThreat — une date illisible n\'invente pas d\'urgence', () => {
  assertFalse(isUrgentUserThreat(facts({ earliestDecayAt: 'jamais' }), viewer, NOW));
});

Deno.test(
  'filterTerritoriesByLayers — filtre éteint : la menace urgente survit en MARQUEUR, pas en calque',
  () => {
    const urgent = facts({ earliestDecayAt: inHours(1) });
    const calme = facts({ ownerId: MATE, earliestDecayAt: null });
    const rival = facts({ ownerId: RIVAL, status: 'rival' });
    const items = [urgent, calme, rival];
    const hidden = {
      ...DEFAULT_MAP_LAYERS,
      mine: false,
      rivals: false,
    };
    const out = filterTerritoriesByLayers(items, (f) => f, hidden, viewer, NOW);
    // Rien de peint : les deux couches concernées sont éteintes.
    assertEquals(out.painted.length, 0);
    // SEULE la menace urgente revient — en marqueur.
    assertEquals(out.urgentMarkers.length, 1);
    assert(out.urgentMarkers[0] === urgent);
  },
);

Deno.test('filterTerritoriesByLayers — rien de filtré ⇒ tout est peint, aucun marqueur', () => {
  const items = [facts(), facts({ ownerId: RIVAL, status: 'rival' })];
  const out = filterTerritoriesByLayers(items, (f) => f, DEFAULT_MAP_LAYERS, viewer, NOW);
  assertEquals(out.painted.length, 2);
  assertEquals(out.urgentMarkers.length, 0);
});

Deno.test('filterTerritoriesByLayers — une couche HORS override reste masquée même « urgente »', () => {
  // `rivals` n'est pas dans MAP_LAYERS_URGENCY_OVERRIDE : rien ne le rallume.
  const out = filterTerritoriesByLayers(
    [facts({ ownerId: RIVAL, status: 'rival', earliestDecayAt: inHours(1) })],
    (f) => f,
    { ...DEFAULT_MAP_LAYERS, rivals: false },
    viewer,
    NOW,
  );
  assertEquals(out.painted.length, 0);
  assertEquals(out.urgentMarkers.length, 0);
});

// ─── E11 — les dérivations d'analytics ──────────────────────────────────────

Deno.test('mapViewState — l\'ordre de priorité de l\'écran, pas un autre', () => {
  const base = {
    signedOut: false,
    loading: false,
    failed: false,
    hasLocation: true,
    territoryCount: 3,
  };
  assertEquals(mapViewState({ ...base, signedOut: true, failed: true }), 'signed_out');
  assertEquals(mapViewState({ ...base, failed: true, loading: true }), 'failed');
  assertEquals(mapViewState({ ...base, loading: true }), 'locating');
  // Lecture non aboutie SANS `loading` : on n'invente pas un vide.
  assertEquals(mapViewState({ ...base, territoryCount: null }), 'locating');
  assertEquals(mapViewState({ ...base, hasLocation: false }), 'no_location');
  assertEquals(mapViewState({ ...base, territoryCount: 0 }), 'empty');
  assertEquals(mapViewState(base), 'ready');
});

Deno.test('zoneTapRole — propriété INDÉTERMINÉE ⇒ null ⇒ aucun event émis', () => {
  assertEquals(zoneTapRole('crew', 'unknown'), null);
  assertEquals(zoneTapRole(null, null), null);
});

Deno.test('zoneTapRole — le rôle, jamais l\'identité', () => {
  assertEquals(zoneTapRole('contested', 'personal'), 'contested');
  assertEquals(zoneTapRole('crew', 'personal'), 'mine');
  assertEquals(zoneTapRole('crew', 'crew'), 'crew');
  assertEquals(zoneTapRole('rival', 'rival'), 'rival');
});

Deno.test('mapRecommendationKind — « aucun fait » se dit « none », jamais une conquête inventée', () => {
  assertEquals(mapRecommendationKind('defend_expiring'), 'defense_urgent');
  assertEquals(mapRecommendationKind('expand'), 'free_conquest');
  assertEquals(mapRecommendationKind('first_capture'), 'none');
  assertEquals(mapRecommendationKind(null), 'none');
});
