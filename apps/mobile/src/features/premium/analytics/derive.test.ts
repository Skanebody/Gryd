/**
 * GRYD — E66 : ce que le CALCUL des analytics territoriales doit tenir SEUL.
 *
 *  1. la durée de contrôle se mesure depuis `controlled_since`, jamais devinée ;
 *  2. la fenêtre de 90 jours a des bornes EXACTES et INCLUSES des deux côtés ;
 *  3. la « zone la plus défendue » n'existe pas sans défense — jamais un
 *     vainqueur par défaut ;
 *  4. ZÉRO territoire rend un état VIDE : ni NaN, ni superlatif inventé, ni
 *     chaleur fabriquée (c'est le cas RÉEL aujourd'hui, la base est vide) ;
 *  5. §12 — aucun calcul ne consomme de donnée d'autrui : une contestation qui
 *     ne vise pas MES territoires est ignorée, et rien de ce qui identifie un
 *     rival ne peut ressortir ;
 *  6. les pertes par transfert ne sont PAS dérivables et ne sont donc jamais
 *     rendues comme un « 0 ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  TERRITORY_ANALYTICS_WINDOW_DAYS,
  centerLatitudeOf,
  deriveTerritoryAnalytics,
  heatRings,
  metersPerDegreeLng,
  type OwnContestRow,
  type OwnedTerritoryRow,
} from './derive.ts';

const NOW = Date.parse('2026-07-27T12:00:00.000Z');
const DAY = 86_400_000;

/** Carré ~ 100 m de côté autour d'un point — une géométrie LISIBLE, pas une donnée de jeu. */
function square(lng: number, lat: number): unknown {
  const d = 0.001;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - d, lat - d],
        [lng + d, lat - d],
        [lng + d, lat + d],
        [lng - d, lat + d],
        [lng - d, lat - d],
      ],
    ],
  };
}

function territory(over: Partial<OwnedTerritoryRow> & { id: string }): OwnedTerritoryRow {
  return {
    area_m2: 10_000,
    state: 'owned_personal',
    defense_level: 0,
    controlled_since: new Date(NOW - 10 * DAY).toISOString(),
    geometry: square(2.36, 48.86),
    ...over,
  };
}

function contest(over: Partial<OwnContestRow> & { territory_id: string }): OwnContestRow {
  return {
    status: 'defended',
    resolved_at: new Date(NOW - DAY).toISOString(),
    expires_at: new Date(NOW + DAY).toISOString(),
    ...over,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. L'ÉTAT VIDE — le seul que le fondateur verra tant que la base est vide
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('ZÉRO territoire : état vide honnête — aucun NaN, aucun superlatif', () => {
  const a = deriveTerritoryAnalytics({ territories: [], contests: [], nowMs: NOW });
  assertEquals(a.isEmpty, true);
  assertEquals(a.zones.length, 0);
  assertEquals(a.heldZones, 0);
  assertEquals(a.heldAreaM2, 0);
  assertEquals(a.deadZones, 0);
  assertEquals(a.maxControlMs, null);
  assertEquals(a.longestHeld, null);
  assertEquals(a.mostDefended, null);
  assertEquals(a.watchlist.length, 0);
  assertEquals(a.window.gainedZones, 0);
  assertEquals(a.window.gainedAreaM2, 0);
  assertEquals(a.window.defensesWon, 0);
  // Aucune valeur numérique de la sortie ne doit être NaN.
  for (const v of [a.heldAreaM2, a.window.gainedAreaM2, a.window.fromMs, a.window.toMs]) {
    assert(Number.isFinite(v), `valeur non finie : ${v}`);
  }
});

Deno.test('ZÉRO territoire : la fenêtre garde des bornes réelles, pas des zéros', () => {
  const a = deriveTerritoryAnalytics({ territories: [], contests: [], nowMs: NOW });
  assertEquals(a.window.days, TERRITORY_ANALYTICS_WINDOW_DAYS);
  assertEquals(a.window.toMs, NOW);
  assertEquals(a.window.fromMs, NOW - TERRITORY_ANALYTICS_WINDOW_DAYS * DAY);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. DURÉE DE CONTRÔLE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('durée de contrôle : mesurée depuis controlled_since, jours PLEINS', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'z1', controlled_since: new Date(NOW - 3 * DAY - 3600_000).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  const z = a.zones[0]!;
  assertEquals(z.controlMs, 3 * DAY + 3600_000);
  assertEquals(z.controlDays, 3); // 3 j et 1 h → 3 jours pleins, jamais 4
});

Deno.test('controlled_since ABSENT ou illisible : null, jamais 0 jour', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'z1', controlled_since: null }),
      territory({ id: 'z2', controlled_since: 'pas-une-date' }),
    ],
    contests: [],
    nowMs: NOW,
  });
  for (const z of a.zones) {
    assertEquals(z.controlledSinceMs, null);
    assertEquals(z.controlMs, null);
    assertEquals(z.controlDays, null);
    assertEquals(z.heat, null);
  }
  assertEquals(a.longestHeld, null);
  assertEquals(a.maxControlMs, null);
});

Deno.test('controlled_since dans le FUTUR : durée plancher 0, jamais négative', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'z1', controlled_since: new Date(NOW + 5 * DAY).toISOString() })],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.zones[0]!.controlMs, 0);
  assertEquals(a.zones[0]!.controlDays, 0);
});

Deno.test('zone la plus ANCIENNEMENT tenue : la tête du classement', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'jeune', controlled_since: new Date(NOW - 2 * DAY).toISOString() }),
      territory({ id: 'vieille', controlled_since: new Date(NOW - 40 * DAY).toISOString() }),
      territory({ id: 'moyenne', controlled_since: new Date(NOW - 10 * DAY).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.longestHeld?.id, 'vieille');
  assertEquals(
    a.zones.map((z) => z.id),
    ['vieille', 'moyenne', 'jeune'],
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA CHALEUR — relative, réelle, ou absente
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('chaleur : rapport RÉEL à la zone tenue le plus longtemps', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'a', controlled_since: new Date(NOW - 40 * DAY).toISOString() }),
      territory({ id: 'b', controlled_since: new Date(NOW - 10 * DAY).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.maxControlMs, 40 * DAY);
  assertEquals(a.zones.find((z) => z.id === 'a')?.heat, 1);
  assertEquals(a.zones.find((z) => z.id === 'b')?.heat, 0.25);
});

Deno.test('chaleur : dénominateur nul (tout vient d’être pris) → null, pas NaN', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'a', controlled_since: new Date(NOW).toISOString() }),
      territory({ id: 'b', controlled_since: new Date(NOW).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.maxControlMs, 0);
  for (const z of a.zones) assertEquals(z.heat, null);
});

Deno.test('chaleur : une zone ÉTEINTE n’est pas coloriée et ne fixe pas l’échelle', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({
        id: 'morte',
        state: 'expired',
        controlled_since: new Date(NOW - 200 * DAY).toISOString(),
      }),
      territory({ id: 'vive', controlled_since: new Date(NOW - 10 * DAY).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.maxControlMs, 10 * DAY); // la morte ne tire pas l'échelle
  assertEquals(a.zones.find((z) => z.id === 'morte')?.heat, null);
  assertEquals(a.zones.find((z) => z.id === 'vive')?.heat, 1);
  assertEquals(a.heldZones, 1);
  assertEquals(a.deadZones, 1);
  // La surface TENUE n'inclut pas la zone éteinte.
  assertEquals(a.heldAreaM2, 10_000);
});

Deno.test('géométrie illisible : aucun anneau, jamais une forme inventée', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'z1', geometry: null }),
      territory({ id: 'z2', geometry: { type: 'LineString', coordinates: [] } }),
    ],
    contests: [],
    nowMs: NOW,
  });
  for (const z of a.zones) assertEquals(z.rings.length, 0);
  assertEquals(heatRings(a.zones).length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA FENÊTRE DE 90 JOURS — BORNES EXACTES
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('fenêtre : la borne basse est INCLUSE, la milliseconde d’avant est DEHORS', () => {
  const from = NOW - TERRITORY_ANALYTICS_WINDOW_DAYS * DAY;
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'pile', area_m2: 500, controlled_since: new Date(from).toISOString() }),
      territory({ id: 'juste-avant', area_m2: 700, controlled_since: new Date(from - 1).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.window.gainedZones, 1);
  assertEquals(a.window.gainedAreaM2, 500);
});

Deno.test('fenêtre : la borne haute est INCLUSE, une prise FUTURE est DEHORS', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'pile', area_m2: 500, controlled_since: new Date(NOW).toISOString() }),
      territory({ id: 'futur', area_m2: 700, controlled_since: new Date(NOW + 1).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.window.gainedZones, 1);
  assertEquals(a.window.gainedAreaM2, 500);
});

Deno.test('fenêtre : une zone ÉTEINTE ne compte pas comme un gain', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'morte', state: 'invalidated', controlled_since: new Date(NOW - DAY).toISOString() }),
    ],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.window.gainedZones, 0);
  assertEquals(a.window.gainedAreaM2, 0);
});

Deno.test('fenêtre : les défenses gagnées sont comptées sur resolved_at, bornes incluses', () => {
  const from = NOW - TERRITORY_ANALYTICS_WINDOW_DAYS * DAY;
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'z1' })],
    contests: [
      contest({ territory_id: 'z1', resolved_at: new Date(from).toISOString() }), // pile → dedans
      contest({ territory_id: 'z1', resolved_at: new Date(from - 1).toISOString() }), // dehors
      contest({ territory_id: 'z1', resolved_at: new Date(NOW).toISOString() }), // pile → dedans
      contest({ territory_id: 'z1', resolved_at: new Date(NOW + 1).toISOString() }), // dehors
      contest({ territory_id: 'z1', resolved_at: null }), // non datée → dehors
    ],
    nowMs: NOW,
  });
  assertEquals(a.window.defensesWon, 2);
  // Le TOTAL par zone, lui, ne dépend pas de la fenêtre : 5 défenses gagnées.
  assertEquals(a.zones[0]!.defensesWon, 5);
});

Deno.test('les pertes ne sont PAS dérivables — et ne valent jamais 0', () => {
  const a = deriveTerritoryAnalytics({ territories: [], contests: [], nowMs: NOW });
  assertEquals(a.window.lossesDerivable, false);
  assertEquals('lostZones' in a.window, false);
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. ZONE LA PLUS DÉFENDUE — jamais un vainqueur par défaut
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('aucune défense : « zone la plus défendue » vaut null', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'z1' }), territory({ id: 'z2', defense_level: 3 })],
    contests: [],
    nowMs: NOW,
  });
  assertEquals(a.mostDefended, null);
});

Deno.test('zone la plus défendue : le nombre de défenses prime, puis la fortification', () => {
  const a = deriveTerritoryAnalytics({
    territories: [
      territory({ id: 'z1', defense_level: 3 }),
      territory({ id: 'z2', defense_level: 0 }),
      territory({ id: 'z3', defense_level: 2 }),
    ],
    contests: [
      contest({ territory_id: 'z1' }),
      contest({ territory_id: 'z2' }),
      contest({ territory_id: 'z2' }),
      contest({ territory_id: 'z3' }),
      contest({ territory_id: 'z3' }),
    ],
    nowMs: NOW,
  });
  // z2 et z3 ont 2 défenses ; z3 est mieux fortifiée → elle l'emporte.
  assertEquals(a.mostDefended?.id, 'z3');
  assertEquals(a.mostDefended?.defensesWon, 2);
});

Deno.test('une zone ÉTEINTE ne peut pas être la plus défendue', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'morte', state: 'expired' })],
    contests: [contest({ territory_id: 'morte' }), contest({ territory_id: 'morte' })],
    nowMs: NOW,
  });
  assertEquals(a.mostDefended, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. FRONTIÈRES À SURVEILLER
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('frontières à surveiller : contestations en cours, la plus urgente d’abord', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'z1' }), territory({ id: 'z2' }), territory({ id: 'z3' })],
    contests: [
      contest({ territory_id: 'z1', status: 'active', resolved_at: null, expires_at: new Date(NOW + 5 * 3600_000).toISOString() }),
      contest({ territory_id: 'z2', status: 'active', resolved_at: null, expires_at: new Date(NOW + 3600_000).toISOString() }),
    ],
    nowMs: NOW,
  });
  assertEquals(
    a.watchlist.map((z) => z.id),
    ['z2', 'z1'],
  );
  assertEquals(a.zones.find((z) => z.id === 'z3')?.underAttackUntilMs, null);
});

Deno.test('une zone ÉTEINTE ne porte jamais de compte à rebours de défense', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'morte', state: 'expired' })],
    contests: [
      contest({ territory_id: 'morte', status: 'active', resolved_at: null, expires_at: new Date(NOW + 3600_000).toISOString() }),
    ],
    nowMs: NOW,
  });
  assertEquals(a.zones[0]!.underAttackUntilMs, null);
  assertEquals(a.watchlist.length, 0);
});

Deno.test('contestation active sans échéance lisible : aucune urgence inventée', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'z1' })],
    contests: [contest({ territory_id: 'z1', status: 'active', resolved_at: null, expires_at: null })],
    nowMs: NOW,
  });
  assertEquals(a.watchlist.length, 0);
  assertEquals(a.zones[0]!.underAttackUntilMs, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. §12 — AUCUN CALCUL NE CONSOMME DE DONNÉE D'AUTRUI
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('§12 : une contestation qui ne vise AUCUN de mes territoires est ignorée', () => {
  // Cas réel : la policy 0078 me montre AUSSI les contestations où J'ATTAQUE.
  // Elles visent le territoire d'un autre — elles n'ont rien à faire ici.
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'a-moi' })],
    contests: [
      contest({ territory_id: 'a-moi' }),
      contest({ territory_id: 'a-quelquun-dautre' }),
      contest({ territory_id: 'a-quelquun-dautre' }),
      contest({
        territory_id: 'a-quelquun-dautre',
        status: 'active',
        resolved_at: null,
        expires_at: new Date(NOW + 3600_000).toISOString(),
      }),
    ],
    nowMs: NOW,
  });
  assertEquals(a.zones[0]!.defensesWon, 1);
  assertEquals(a.window.defensesWon, 1);
  assertEquals(a.watchlist.length, 0);
});

Deno.test('§12 : rien d’identifiant ne peut ressortir du calcul', () => {
  // On injecte des champs d'autrui dans les lignes brutes (ils EXISTENT en base :
  // `owner_id` sur territories, `attacker_id` sur territory_contests). Le module
  // ne les déclare pas — et la sortie ne doit en porter aucune trace.
  const SENTINEL = 'IDENTITE-RIVALE-NE-DOIT-PAS-SORTIR';
  const rows = [
    { ...territory({ id: 'z1' }), owner_id: SENTINEL, owner_type: 'user', source_run_id: SENTINEL },
  ] as unknown as OwnedTerritoryRow[];
  const cts = [
    { ...contest({ territory_id: 'z1' }), attacker_id: SENTINEL, attacker_type: 'user' },
  ] as unknown as OwnContestRow[];

  const a = deriveTerritoryAnalytics({ territories: rows, contests: cts, nowMs: NOW });
  assertEquals(JSON.stringify(a).includes(SENTINEL), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. CADRAGE DE LA CARTE DE CHALEUR
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('metersPerDegreeLng : suit la LATITUDE, pas un ancrage parisien figé', () => {
  const equator = metersPerDegreeLng(0, 111_320);
  const paris = metersPerDegreeLng(48.86, 111_320);
  const lille = metersPerDegreeLng(50.63, 111_320);
  assertEquals(Math.round(equator), 111_320);
  assert(paris < equator, 'Paris doit être plus resserré que l’équateur');
  assert(lille < paris, 'Lille doit être plus resserré que Paris');
  // Symétrie hémisphérique : la contraction ne dépend que de |lat|.
  assertEquals(metersPerDegreeLng(-48.86, 111_320), paris);
});

Deno.test('metersPerDegreeLng : au pôle, plancher numérique — jamais 0 (division)', () => {
  assert(metersPerDegreeLng(90, 111_320) > 0);
});

Deno.test('centerLatitudeOf : milieu de l’étendue, null si rien à cadrer', () => {
  assertEquals(centerLatitudeOf([]), null);
  const mid = centerLatitudeOf([
    [
      [2.3, 48.8],
      [2.4, 48.9],
    ],
  ]);
  assert(mid !== null && Math.abs(mid - 48.85) < 1e-9, `milieu attendu 48,85 — reçu ${mid}`);
});

Deno.test('heatRings : concatène les anneaux RÉELS, sans en fabriquer', () => {
  const a = deriveTerritoryAnalytics({
    territories: [territory({ id: 'z1' }), territory({ id: 'z2', geometry: null })],
    contests: [],
    nowMs: NOW,
  });
  const rings = heatRings(a.zones);
  assertEquals(rings.length, 1); // z2 n'apporte rien plutôt qu'un carré inventé
  assertEquals(rings[0]!.length, 4); // l'anneau est RÉOUVERT (5 sommets → 4)
});
