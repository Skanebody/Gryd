/**
 * Tests claims.ts — SPEC §3.3/§3.4, AMENDEMENT-02 §2/§3, §6.4, formule §23
 * MULTIPLICATIVE (AMENDEMENT-23 §D). Purs : états et contexte en mémoire.
 *   points_zone = POINTS_BASE_PER_ZONE × action × contexte (+ pionnier additif).
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  ACTION_COEFF,
  CONTEXT_COEFF,
  type ContextCoeffKey,
  FRESH_CAPTURE_PROTECT_HOURS,
  HEX_LOCK_HOURS,
  MAX_CLAIMS_PER_DAY,
  POINTS_BASE_PER_ZONE,
  POINTS_PIONEER_BONUS_BY_DENSITY,
  ZONE_DECAY_DAYS,
  type ZoneDensity,
} from '../_shared/game-rules.ts';
import {
  decideClaims,
  type DecideClaimsContext,
  deriveContextByHex,
  type HexState,
} from '../_shared/engine/claims.ts';

const NOW = new Date('2026-07-03T10:00:00Z');
const ME = 'user-me';
const FOE = 'user-foe';
const HEX = '8a1fb46622dffff';
const HEX2 = '8a1fb46622e7fff';

const MS_H = 3_600_000;
const MS_D = 86_400_000;
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * MS_H);
const hoursAhead = (h: number) => new Date(NOW.getTime() + h * MS_H);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * MS_D);

// Valeurs de base attendues de la formule §23 (floor(10 × coeff)).
const CONQUEST = POINTS_BASE_PER_ZONE; // 10 × 1,0 = 10
const STEAL = Math.floor(POINTS_BASE_PER_ZONE * ACTION_COEFF.steal); // 13
const DEFENSE = Math.floor(POINTS_BASE_PER_ZONE * ACTION_COEFF.defense); // 12
const CLEAN_LOOP = Math.floor(POINTS_BASE_PER_ZONE * ACTION_COEFF.clean_loop); // 11
const ROUTE = Math.floor(POINTS_BASE_PER_ZONE * ACTION_COEFF.route); // 5

function ctx(over: Partial<DecideClaimsContext> = {}): DecideClaimsContext {
  return {
    userId: ME,
    userCreatedAt: daysAgo(60),
    now: NOW,
    ownersCreatedAt: new Map([[FOE, daysAgo(90)]]),
    privacyHexes: new Set(),
    noCaptureHexes: new Set(),
    zoneDensity: 'active',
    claimsToday: 0,
    ...over,
  };
}

function foeHex(over: Partial<HexState> = {}): HexState {
  return {
    ownerUserId: FOE,
    lockedUntil: null,
    shieldedUntil: null,
    decayAt: hoursAhead(24 * 10), // decay loin dans le futur
    lastDefendedAt: hoursAgo(48),
    everOwned: true,
    ...over,
  };
}

function one(hexes: string[], states: Map<string, HexState>, context: DecideClaimsContext) {
  return decideClaims({ hexes, states, context });
}

// ─── Neutre + pionnier par densité (formule §23 : conquête ×1 + pionnier) ─────

Deno.test('hex jamais possédé → claimed_neutral (conquête ×1) + bonus pionnier par densité', () => {
  const cases: Array<[ZoneDensity, number]> = [
    ['active', CONQUEST + POINTS_PIONEER_BONUS_BY_DENSITY.active], // 10 + 5
    ['emerging', CONQUEST + POINTS_PIONEER_BONUS_BY_DENSITY.emerging], // 10 + 8
    ['pioneer', CONQUEST + POINTS_PIONEER_BONUS_BY_DENSITY.pioneer], // 10 + 10
  ];
  assertEquals(POINTS_PIONEER_BONUS_BY_DENSITY.active, 5);
  assertEquals(POINTS_PIONEER_BONUS_BY_DENSITY.emerging, 8);
  assertEquals(POINTS_PIONEER_BONUS_BY_DENSITY.pioneer, 10);
  for (const [density, expected] of cases) {
    const r = one([HEX], new Map(), ctx({ zoneDensity: density }));
    assertEquals(r.results, [
      { h3: HEX, outcome: 'claimed_neutral', points: expected, pioneer: true },
    ]);
    assertEquals(r.totals.claimed, 1);
    assertEquals(r.totals.pioneer, 1);
    assertEquals(r.totals.points, expected);
  }
});

Deno.test('densité par hex (Map) + hex inconnu → défaut wild', () => {
  const r = one(
    [HEX, HEX2],
    new Map(),
    ctx({ zoneDensity: new Map([[HEX, 'active' as ZoneDensity]]) }),
  );
  assertEquals(r.results[0].points, CONQUEST + POINTS_PIONEER_BONUS_BY_DENSITY.active);
  assertEquals(r.results[1].points, CONQUEST + POINTS_PIONEER_BONUS_BY_DENSITY.wild);
});

Deno.test('hex neutre déjà possédé (decayé) → conquête ×1 (10) sans bonus pionnier', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: null })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'claimed_neutral', points: CONQUEST, pioneer: false },
  ]);
});

Deno.test('hex adverse au decay échu → neutre (pas un vol)', () => {
  const states = new Map([[HEX, foeHex({ decayAt: hoursAgo(1) })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.results[0].points, CONQUEST);
  assertEquals(r.results[0].pioneer, false);
});

// ─── Formule §23 : action clean_loop (intérieur boucle) + route (couloir) ─────

Deno.test('cellule intérieure de boucle → action clean_loop ×1,1 (11)', () => {
  // Hex neutre déjà possédé, marqué intérieur → 10 × 1,1 = 11, pas de pionnier.
  const states = new Map([[HEX, foeHex({ ownerUserId: null })]]);
  const r = one([HEX], states, ctx({ interiorHexes: new Set([HEX]) }));
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.results[0].points, CLEAN_LOOP);
  assertEquals(ACTION_COEFF.clean_loop, 1.1);
});

Deno.test('cellule intérieure pionnière → clean_loop ×1,1 + pionnier additif', () => {
  const r = one([HEX], new Map(), ctx({ interiorHexes: new Set([HEX]) }));
  assertEquals(r.results[0].points, CLEAN_LOOP + POINTS_PIONEER_BONUS_BY_DENSITY.active); // 11 + 5
  assertEquals(r.results[0].pioneer, true);
});

Deno.test('corridorAction=route → couloir neutre à ×0,5 (5), sans toucher l’intérieur', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: null })]]);
  // Couloir route (déjà possédé, pas pionnier) → 10 × 0,5 = 5.
  const r = one([HEX], states, ctx({ corridorAction: 'route' }));
  assertEquals(r.results[0].points, ROUTE);
  // Défaut sans corridorAction : conquête ×1 = 10.
  const rDefault = one([HEX], states, ctx());
  assertEquals(rDefault.results[0].points, CONQUEST);
});

// ─── Formule §23 : coefficient de contexte (contested/crew_mission/zone_bonus) ─

Deno.test('contexte contestée → conquête ×1,2 (12) ; le plus fort contexte s’applique', () => {
  const contexts = new Map<string, readonly ContextCoeffKey[]>([[HEX, ['contested']]]);
  const states = new Map([[HEX, foeHex({ ownerUserId: null })]]);
  const r = one([HEX], states, ctx({ contextByHex: contexts }));
  assertEquals(r.results[0].points, Math.floor(POINTS_BASE_PER_ZONE * CONTEXT_COEFF.contested)); // 12
});

Deno.test('contexte sur un vol : reprise contestée = floor(10 × 1,3 × 1,2) = 15', () => {
  const contexts = new Map<string, readonly ContextCoeffKey[]>([[HEX, ['contested', 'crew_mission']]]);
  const r = one([HEX], new Map([[HEX, foeHex()]]), ctx({ contextByHex: contexts }));
  assertEquals(r.results[0].outcome, 'stolen');
  // max(1,2 ; 1,1) = 1,2 ; floor(10 × 1,3 × 1,2) = floor(15,6) = 15.
  assertEquals(r.results[0].points, 15);
});

// ─── deriveContextByHex : coeff_contexte §23 décidé serveur (AMENDEMENT-23 §D) ─
// Régression du finding « coeff_contexte inerte » : le contexte doit sortir du
// wiring, pas rester à 1,0. On teste la DÉCISION pure (rival/mission), puis son
// EFFET réel sur les points via decideClaims — bout en bout.

const MY_CREW = 'crew-mine';
const RIVAL_CREW = 'crew-rival';

Deno.test('deriveContextByHex : hex tenu par un crew RIVAL → contested (rival gagne le contexte)', () => {
  const states = new Map([[HEX, foeHex()]]); // FOE, non-decayé
  const out = deriveContextByHex({
    hexes: [HEX],
    states,
    userId: ME,
    crewId: MY_CREW,
    ownerCrewByUser: new Map([[FOE, RIVAL_CREW]]),
    now: NOW,
  });
  assertEquals(out.get(HEX), ['contested']);
  // Effet réel sur les points : vol contesté = floor(10 × 1,3 × 1,2) = 15 (≠ 13).
  const r = one([HEX], states, ctx({ contextByHex: out }));
  assertEquals(r.results[0].outcome, 'stolen');
  assertEquals(r.results[0].points, 15);
  assert(r.results[0].points > STEAL, 'le contexte doit MAJORER, jamais laisser 13');
});

Deno.test('deriveContextByHex : propriétaire SOLO adverse (sans crew) → contested aussi', () => {
  const states = new Map([[HEX, foeHex()]]);
  const out = deriveContextByHex({
    hexes: [HEX],
    states,
    userId: ME,
    crewId: MY_CREW,
    ownerCrewByUser: new Map(), // FOE n'a pas de crew
    now: NOW,
  });
  assertEquals(out.get(HEX), ['contested']);
});

Deno.test('deriveContextByHex : hex de mon PROPRE crew → PAS contested (on ne se dispute pas)', () => {
  const states = new Map([[HEX, foeHex()]]); // possédé par un coéquipier (FOE)
  const out = deriveContextByHex({
    hexes: [HEX],
    states,
    userId: ME,
    crewId: MY_CREW,
    ownerCrewByUser: new Map([[FOE, MY_CREW]]), // même crew que moi
    now: NOW,
  });
  assertEquals(out.size, 0);
});

Deno.test('deriveContextByHex : hex à MOI ou neutre/decayé → aucun contexte', () => {
  const mine = foeHex({ ownerUserId: ME });
  const neutral = foeHex({ ownerUserId: null });
  const decayed = foeHex({ decayAt: hoursAgo(1) }); // decay échu → neutre
  const states = new Map([
    [HEX, mine],
    [HEX2, neutral],
    ['8a1fb46622c7fff', decayed],
  ]);
  const out = deriveContextByHex({
    hexes: [HEX, HEX2, '8a1fb46622c7fff'],
    states,
    userId: ME,
    crewId: MY_CREW,
    ownerCrewByUser: new Map([[FOE, RIVAL_CREW]]),
    now: NOW,
  });
  assertEquals(out.size, 0);
});

Deno.test('deriveContextByHex : hex dans une offensive crew active → crew_mission (×1,1)', () => {
  const out = deriveContextByHex({
    hexes: [HEX],
    states: new Map(), // hex neutre jamais possédé
    userId: ME,
    crewId: MY_CREW,
    ownerCrewByUser: new Map(),
    crewMissionHexes: new Set([HEX]),
    now: NOW,
  });
  assertEquals(out.get(HEX), ['crew_mission']);
  // Effet réel : conquête neutre en mission = floor(10 × 1,0 × 1,1) = 11 (≠ 10).
  const r = one([HEX], new Map([[HEX, foeHex({ ownerUserId: null })]]), ctx({ contextByHex: out }));
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.results[0].points, Math.floor(POINTS_BASE_PER_ZONE * CONTEXT_COEFF.crew_mission));
});

Deno.test('deriveContextByHex : rival EN mission → contested + crew_mission ; le plus fort (1,2) gagne', () => {
  const states = new Map([[HEX, foeHex()]]);
  const out = deriveContextByHex({
    hexes: [HEX],
    states,
    userId: ME,
    crewId: MY_CREW,
    ownerCrewByUser: new Map([[FOE, RIVAL_CREW]]),
    crewMissionHexes: new Set([HEX]),
    now: NOW,
  });
  const keys = out.get(HEX) ?? [];
  assertEquals(keys.includes('contested'), true);
  assertEquals(keys.includes('crew_mission'), true);
  // contextCoeff = max(1,2 ; 1,1) = 1,2 (jamais de cumul) → vol = floor(10 × 1,3 × 1,2) = 15.
  const r = one([HEX], states, ctx({ contextByHex: out }));
  assertEquals(r.results[0].points, 15);
});

Deno.test('deriveContextByHex : sans crew ET aucun rival → map vide (coeff_contexte = 1,0)', () => {
  const out = deriveContextByHex({
    hexes: [HEX, HEX2],
    states: new Map(), // tout neutre
    userId: ME,
    crewId: null,
    ownerCrewByUser: new Map(),
    now: NOW,
  });
  assertEquals(out.size, 0);
});

// ─── Vol et protections (§3.3) — vol = ×1,3 (13) ─────────────────────────────

Deno.test('hex adverse sans protection → stolen ×1,3 (13)', () => {
  const r = one([HEX], new Map([[HEX, foeHex()]]), ctx());
  assertEquals(r.results, [{ h3: HEX, outcome: 'stolen', points: STEAL, pioneer: false }]);
  assertEquals(STEAL, 13);
  assertEquals(r.totals.stolen, 1);
});

Deno.test('lock 24 h actif → blocked_lock, 0 pt', () => {
  const r = one([HEX], new Map([[HEX, foeHex({ lockedUntil: hoursAhead(2) })]]), ctx());
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_lock', points: 0, pioneer: false }]);
  assertEquals(r.totals.blocked, 1);
  assertEquals(r.totals.points, 0);
});

Deno.test('lock expiré → vol possible', () => {
  const r = one([HEX], new Map([[HEX, foeHex({ lockedUntil: hoursAgo(1) })]]), ctx());
  assertEquals(r.results[0].outcome, 'stolen');
});

Deno.test('bouclier actif → blocked_shield', () => {
  const r = one([HEX], new Map([[HEX, foeHex({ shieldedUntil: hoursAhead(40) })]]), ctx());
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_shield', points: 0, pioneer: false }]);
});

Deno.test('propriétaire < 14 j → blocked_new_player', () => {
  const r = one(
    [HEX],
    new Map([[HEX, foeHex()]]),
    ctx({ ownersCreatedAt: new Map([[FOE, daysAgo(5)]]) }),
  );
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_new_player', points: 0, pioneer: false }]);
});

Deno.test('propriétaire à exactement 14 j → volable', () => {
  const r = one(
    [HEX],
    new Map([[HEX, foeHex()]]),
    ctx({ ownersCreatedAt: new Map([[FOE, daysAgo(14)]]) }),
  );
  assertEquals(r.results[0].outcome, 'stolen');
});

// ─── Défense (§3.4) — défense = ×1,2 (12) ────────────────────────────────────

Deno.test('mon hex, dernière défense > 24 h → defended ×1,2 (12)', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: ME, lastDefendedAt: hoursAgo(30) })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'defended', points: DEFENSE, pioneer: false },
  ]);
  assertEquals(DEFENSE, 12);
  assertEquals(r.totals.defended, 1);
});

Deno.test('mon hex, défendu il y a < 24 h → already_owned_cooldown, 0 pt', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: ME, lastDefendedAt: hoursAgo(2) })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'already_owned_cooldown', points: 0, pioneer: false },
  ]);
  assertEquals(r.totals.defended, 1);
  assertEquals(r.totals.points, 0);
});

// ─── Zones interdites et plafond (§6.4, §7, AMENDEMENT-02 §2) ────────────────

Deno.test('zone privée → blocked_privacy, prioritaire sur le vol', () => {
  const r = one([HEX], new Map([[HEX, foeHex()]]), ctx({ privacyHexes: new Set([HEX]) }));
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_privacy', points: 0, pioneer: false }]);
});

Deno.test('zone non capturable → blocked_no_capture_zone, prioritaire sur tout', () => {
  const r = one(
    [HEX],
    new Map(),
    ctx({ noCaptureHexes: new Set([HEX]), privacyHexes: new Set([HEX]) }),
  );
  assertEquals(r.results, [
    { h3: HEX, outcome: 'blocked_no_capture_zone', points: 0, pioneer: false },
  ]);
});

Deno.test('plafond quotidien : le 1 200e hex passe, le suivant est bloqué', () => {
  const r = one([HEX, HEX2], new Map(), ctx({ claimsToday: MAX_CLAIMS_PER_DAY - 1 }));
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.results[1].outcome, 'blocked_daily_cap');
  assertEquals(r.results[1].points, 0);
  assertEquals(r.totals.blocked, 1);
});

Deno.test('plafond déjà atteint → tout est bloqué', () => {
  const r = one([HEX, HEX2], new Map(), ctx({ claimsToday: MAX_CLAIMS_PER_DAY }));
  assertEquals(r.results.map((x) => x.outcome), ['blocked_daily_cap', 'blocked_daily_cap']);
});

// ─── Sorties globales — decay 14 j (ZONE_DECAY_DAYS) ─────────────────────────

Deno.test('lockedUntil = now + HEX_LOCK_HOURS, decayAt = now + ZONE_DECAY_DAYS (14 j)', () => {
  const r = one([HEX], new Map(), ctx());
  assertEquals(r.lockedUntil.getTime(), NOW.getTime() + HEX_LOCK_HOURS * MS_H);
  assertEquals(r.decayAt.getTime(), NOW.getTime() + ZONE_DECAY_DAYS * MS_D);
  assertEquals(ZONE_DECAY_DAYS, 14);
  assertEquals(r.decayExempt, false);
});

Deno.test('coureur < 14 j → decayExempt (territoire sans decay, §3.3)', () => {
  const r = one([HEX], new Map(), ctx({ userCreatedAt: daysAgo(3) }));
  assertEquals(r.decayExempt, true);
});

Deno.test('hexes dupliqués en entrée → décidés une seule fois', () => {
  const r = one([HEX, HEX, HEX], new Map(), ctx());
  assertEquals(r.results.length, 1);
});

Deno.test('totaux cohérents sur une course mixte (formule §23)', () => {
  const states = new Map<string, HexState>([
    ['a', foeHex()], // stolen ×1,3 = 13
    ['b', foeHex({ ownerUserId: ME, lastDefendedAt: hoursAgo(48) })], // defended ×1,2 = 12
    ['c', foeHex({ lockedUntil: hoursAhead(3) })], // blocked_lock
  ]);
  const r = one(['a', 'b', 'c', 'd'], states, ctx()); // d = pionnier neutre (10 + 5)
  assertEquals(r.totals.stolen, 1);
  assertEquals(r.totals.defended, 1);
  assertEquals(r.totals.blocked, 1);
  assertEquals(r.totals.claimed, 1);
  assertEquals(r.totals.pioneer, 1);
  assertEquals(
    r.totals.points,
    STEAL + DEFENSE + CONQUEST + POINTS_PIONEER_BONUS_BY_DENSITY.active, // 13 + 12 + 10 + 5 = 40
  );
  assert(r.results.every((x) => x.points >= 0));
});

// ─── Protection anti-harcèlement d'une capture fraîche (FRESH_CAPTURE_PROTECT_HOURS) ─
// Doc « Clash » §4 : une zone d'AUTRUI fraîchement capturée (< la fenêtre) ne peut
// pas être re-volée ce run → blocked_fresh_protection (0 pt). Dérive de
// lastCapturedAt (= claimed_at). Automatique + temporelle → jamais achetable.

Deno.test('hex adverse fraîchement capturé (< fenêtre) → blocked_fresh_protection, 0 pt', () => {
  const states = new Map([[
    HEX,
    foeHex({ lastCapturedAt: hoursAgo(FRESH_CAPTURE_PROTECT_HOURS - 1) }),
  ]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'blocked_fresh_protection', points: 0, pioneer: false },
  ]);
  assertEquals(r.totals.blocked, 1);
  assertEquals(r.totals.stolen, 0);
  assertEquals(r.totals.points, 0);
  assertEquals(FRESH_CAPTURE_PROTECT_HOURS, 6);
});

Deno.test('hex adverse capturé il y a longtemps (≥ fenêtre) → stolen (protection fraîche expirée)', () => {
  const states = new Map([[
    HEX,
    foeHex({ lastCapturedAt: hoursAgo(FRESH_CAPTURE_PROTECT_HOURS + 1) }),
  ]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'stolen');
  assertEquals(r.results[0].points, STEAL);
});

Deno.test('capture fraîche pile à la borne (= fenêtre) → volable (borne stricte <)', () => {
  // now - lastCaptured == FRESH_CAPTURE_PROTECT_HOURS exactement → NON protégé.
  const states = new Map([[
    HEX,
    foeHex({ lastCapturedAt: hoursAgo(FRESH_CAPTURE_PROTECT_HOURS) }),
  ]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'stolen');
});

Deno.test('MA propre zone fraîchement (re)capturée → NON affectée (défense/cooldown, jamais bloquée)', () => {
  // owner = ME, capture fraîche : la protection anti-harcèlement ne vise QUE les
  // hexes d'autrui. Ici lastDefended ancien → défense normale (pas de blocked).
  const states = new Map([[
    HEX,
    foeHex({
      ownerUserId: ME,
      lastCapturedAt: hoursAgo(1),
      lastDefendedAt: hoursAgo(48),
    }),
  ]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'defended');
  assertEquals(r.results[0].points, DEFENSE);
  assertEquals(r.totals.blocked, 0);
});

Deno.test('capture fraîche prime sur le lock (les deux actifs → blocked_fresh_protection)', () => {
  // Une capture fraîche pose AUSSI un lock 24 h : l'attribution explicable doit
  // être la fraîcheur (priorité §6.0), pas le lock générique.
  const states = new Map([[
    HEX,
    foeHex({
      lastCapturedAt: hoursAgo(1),
      lockedUntil: hoursAhead(HEX_LOCK_HOURS - 1),
    }),
  ]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'blocked_fresh_protection');
});

Deno.test('lastCapturedAt absent (rétro-compat) → pas de protection fraîche → stolen', () => {
  // foeHex() ne pose pas lastCapturedAt : une ligne sans info de fraîcheur reste
  // volable selon les autres règles (aucune régression sur les vols existants).
  const st = foeHex();
  assertEquals(st.lastCapturedAt, undefined);
  const r = one([HEX], new Map([[HEX, st]]), ctx());
  assertEquals(r.results[0].outcome, 'stolen');
});

Deno.test('capture fraîche mais decay échu → neutre (decay prime, pas de faux blocage)', () => {
  // Un hex au decay échu est neutre AVANT la branche adverse : une capture fraîche
  // sur une ligne périmée ne doit pas la « protéger » à tort.
  const states = new Map([[
    HEX,
    foeHex({ lastCapturedAt: hoursAgo(1), decayAt: hoursAgo(1) }),
  ]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'claimed_neutral');
});

Deno.test('neutralOnly : hex adverse → blocked_onboarding_neutral_only (pas de vol)', () => {
  const states = new Map([[HEX, foeHex()]]);
  const r = one([HEX], states, ctx({ neutralOnly: true }));
  assertEquals(r.results[0].outcome, 'blocked_onboarding_neutral_only');
  assertEquals(r.totals.stolen, 0);
});

Deno.test('neutralOnly : hex neutre → claimed_neutral inchangé', () => {
  const r = one([HEX], new Map(), ctx({ neutralOnly: true }));
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.totals.claimed, 1);
});
