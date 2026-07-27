/**
 * GRYD — E22 : tests de la SÉLECTION de la zone défendue.
 *
 * Le risque de cet écran n'est pas d'être moche : c'est d'afficher `DÉFENSE`
 * sur une sortie qui ne défend rien, ou de dessiner un contour faux. Chaque test
 * ci-dessous ferme un de ces chemins.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  LIVE_DEFENSE_REACH_M,
  defenseDeadlineDisplay,
  pickLiveDefenseTarget,
  pointInRing,
  polygonOuterRing,
  type LiveContestRow,
  type LiveTerritoryRow,
} from './liveDefense.ts';

const NOW = Date.parse('2026-07-27T10:00:00.000Z');
const IN_SIX_HOURS = new Date(NOW + 6 * 3_600_000).toISOString();
const ME = 'user-1';
const MY_CREW = 'crew-1';

/** Carré ~200 m près de Paris, en GeoJSON [lng, lat] comme la base le stocke. */
const SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [2.36, 48.87],
      [2.3627, 48.87],
      [2.3627, 48.8718],
      [2.36, 48.8718],
      [2.36, 48.87],
    ],
  ],
};

const INSIDE = { lat: 48.8709, lng: 2.3613 };
const FAR_AWAY = { lat: 45.75, lng: 4.85 }; // Lyon

function territory(over: Partial<LiveTerritoryRow> = {}): LiveTerritoryRow {
  return {
    id: 'zone-1',
    owner_type: 'user',
    owner_id: ME,
    geometry: SQUARE,
    ...over,
  };
}

function contest(over: Partial<LiveContestRow> = {}): LiveContestRow {
  return {
    id: 'contest-1',
    territory_id: 'zone-1',
    status: 'active',
    expires_at: IN_SIX_HOURS,
    ...over,
  };
}

function pick(
  contests: LiveContestRow[],
  territories: LiveTerritoryRow[],
  here: { lat: number; lng: number } | null = INSIDE,
) {
  return pickLiveDefenseTarget({
    contests,
    territories,
    meId: ME,
    myCrewId: MY_CREW,
    here,
    nowMs: NOW,
  });
}

// ── Géométrie ───────────────────────────────────────────────────────────────

Deno.test('un GeoJSON Polygon valide rend son anneau en {lat, lng}', () => {
  const ring = polygonOuterRing(SQUARE);
  assert(ring !== null);
  assertEquals(ring.length, 5);
  assertEquals(ring[0], { lat: 48.87, lng: 2.36 });
});

Deno.test('toute géométrie douteuse rend null — jamais un contour approximatif', () => {
  assertEquals(polygonOuterRing(null), null);
  assertEquals(polygonOuterRing(undefined), null);
  assertEquals(polygonOuterRing('Polygon'), null);
  assertEquals(polygonOuterRing({ type: 'LineString', coordinates: [] }), null);
  assertEquals(polygonOuterRing({ type: 'Polygon', coordinates: [] }), null);
  // Anneau de 2 sommets : pas un polygone.
  assertEquals(
    polygonOuterRing({ type: 'Polygon', coordinates: [[[2, 48], [2.1, 48]]] }),
    null,
  );
  // Couple non numérique / hors bornes.
  assertEquals(
    polygonOuterRing({ type: 'Polygon', coordinates: [[[2, 48], [2.1, 48], ['x', 48]]] }),
    null,
  );
  assertEquals(
    polygonOuterRing({ type: 'Polygon', coordinates: [[[2, 48], [2.1, 48], [2, 999]]] }),
    null,
  );
});

Deno.test('point dans / hors de l’anneau', () => {
  const ring = polygonOuterRing(SQUARE)!;
  assert(pointInRing(INSIDE, ring));
  assert(!pointInRing(FAR_AWAY, ring));
});

// ── Sélection ───────────────────────────────────────────────────────────────

Deno.test('une contestation ACTIVE sur MA zone, à portée, produit une cible', () => {
  const target = pick([contest()], [territory()]);
  assert(target !== null);
  assertEquals(target.contestId, 'contest-1');
  assertEquals(target.territoryId, 'zone-1');
  assertEquals(target.distanceM, 0); // à l'intérieur
  assertEquals(target.expiresAtMs, Date.parse(IN_SIX_HOURS));
});

Deno.test('aucune contestation ⇒ aucune variante (la spec l’exige)', () => {
  assertEquals(pick([], [territory()]), null);
});

Deno.test('une contestation CLOSE ne se défend pas', () => {
  for (const status of ['defended', 'transferred', 'cancelled', null]) {
    assertEquals(pick([contest({ status })], [territory()]), null, `statut ${status}`);
  }
});

Deno.test('une contestation que J’AI LANCÉE (zone d’un autre) n’est pas une défense', () => {
  const autrui = territory({ owner_id: 'user-2' });
  assertEquals(pick([contest()], [autrui]), null);
});

Deno.test('la zone de MON CREW se défend, celle d’un autre crew non', () => {
  const mienne = territory({ owner_type: 'crew', owner_id: MY_CREW });
  assert(pick([contest()], [mienne]) !== null);
  const autre = territory({ owner_type: 'crew', owner_id: 'crew-9' });
  assertEquals(pick([contest()], [autre]), null);
});

Deno.test('une échéance illisible ou déjà passée écarte la contestation', () => {
  assertEquals(pick([contest({ expires_at: null })], [territory()]), null);
  assertEquals(pick([contest({ expires_at: 'pas-une-date' })], [territory()]), null);
  const passee = new Date(NOW - 1000).toISOString();
  assertEquals(pick([contest({ expires_at: passee })], [territory()]), null);
});

Deno.test('une géométrie illisible écarte la contestation (aucun contour inventé)', () => {
  assertEquals(pick([contest()], [territory({ geometry: { type: 'Point' } })]), null);
});

Deno.test('une zone hors de portée ne transforme pas la sortie en défense', () => {
  assertEquals(pick([contest()], [territory()], FAR_AWAY), null);
});

Deno.test('sans position mesurée, aucune variante (on n’affirme rien)', () => {
  assertEquals(pick([contest()], [territory()], null), null);
});

Deno.test('entre deux zones à portée, la PLUS PROCHE gagne', () => {
  // Deuxième carré décalé de ~1 km à l'est : à portée, mais plus loin.
  const loinMaisAPortee = {
    type: 'Polygon',
    coordinates: [
      [
        [2.375, 48.87],
        [2.3777, 48.87],
        [2.3777, 48.8718],
        [2.375, 48.8718],
        [2.375, 48.87],
      ],
    ],
  };
  const target = pick(
    [contest({ id: 'c-loin', territory_id: 'zone-2' }), contest()],
    [territory(), territory({ id: 'zone-2', geometry: loinMaisAPortee })],
  );
  assert(target !== null);
  assertEquals(target.territoryId, 'zone-1');
});

Deno.test('la portée d’affichage reste une constante déclarée, pas un nombre épars', () => {
  assert(LIVE_DEFENSE_REACH_M > 0);
});

// ── Échéance ────────────────────────────────────────────────────────────────

Deno.test('les quatre formes d’échéance ne se confondent jamais', () => {
  assertEquals(defenseDeadlineDisplay(NOW + 6 * 3_600_000, NOW), { kind: 'in', hours: 6 });
  // 5 h 30 → on annonce 6 h (arrondi au supérieur), jamais 5.
  assertEquals(defenseDeadlineDisplay(NOW + 5.5 * 3_600_000, NOW), { kind: 'in', hours: 6 });
  assertEquals(defenseDeadlineDisplay(NOW + 40 * 60_000, NOW), { kind: 'soon', hours: null });
  assertEquals(defenseDeadlineDisplay(NOW - 1, NOW), { kind: 'passed', hours: null });
  assertEquals(defenseDeadlineDisplay(null, NOW), { kind: 'unknown', hours: null });
  assertEquals(defenseDeadlineDisplay(Number.NaN, NOW), { kind: 'unknown', hours: null });
});
