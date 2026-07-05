/**
 * Tests sectors.ts — MODÈLE DE SECTEUR (RÈGLES NON NÉGOCIABLES §C) :
 * rôle relatif au joueur, pressure_score 0-100, règle « contesté », statut à 5
 * niveaux. Fonctions PURES — chaque seuil / borne de bande / ex-aequo / zéro est
 * couvert, et les constantes gelées §C sont vérifiées (garde-fou anti-drift des
 * valeurs). Import de la copie générée _shared/engine (drift testé ailleurs).
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  SECTOR_ACTIVE_ATTACK_MAX_H,
  SECTOR_CONTESTED_RULE,
  SECTOR_PRESSURE_BANDS,
  SECTOR_PRESSURE_MAX,
  SECTOR_PRESSURE_WEIGHTS,
  SECTOR_RIVAL_ACTIVITY_SATURATION,
  SECTOR_STATUS_LEVELS,
  SECTOR_ZONES_LOST_SATURATION,
} from '../_shared/game-rules.ts';
import {
  type AggregatedSector,
  deriveSectorView,
  isContested,
  pressureBreakdown,
  pressureScore,
  resolveRole,
  sectorStatus,
} from '../_shared/engine/sectors.ts';

const NOW = new Date('2026-07-05T12:00:00Z');
const MS_H = 3_600_000;
const hAgo = (h: number) => new Date(NOW.getTime() - h * MS_H);
const hAhead = (h: number) => new Date(NOW.getTime() + h * MS_H);

// Secteur « au repos » : aucune pression, tout neutre. Base des overrides.
const calmInput = {
  minePercent: 0,
  rivalPercent: 0,
  rivalActivityRecent: 0,
  zonesLostRecent: 0,
  decayFraction: 0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Constantes GELÉES §C — garde-fou (une modif non voulue casse le test)
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('§C — bandes de pression gelées (0-30 / 31-60 / 61-80 / 81-100)', () => {
  assertEquals(SECTOR_PRESSURE_BANDS.stable, 0);
  assertEquals(SECTOR_PRESSURE_BANDS.pression, 31);
  assertEquals(SECTOR_PRESSURE_BANDS.contestee, 61);
  assertEquals(SECTOR_PRESSURE_BANDS.urgence, 81);
  assertEquals(SECTOR_PRESSURE_MAX, 100);
});

Deno.test('§C — niveaux de statut gelés (stable0 pression1 contestee2 attaque3 urgence4)', () => {
  assertEquals(SECTOR_STATUS_LEVELS.stable, 0);
  assertEquals(SECTOR_STATUS_LEVELS.pression, 1);
  assertEquals(SECTOR_STATUS_LEVELS.contestee, 2);
  assertEquals(SECTOR_STATUS_LEVELS.attaque, 3);
  assertEquals(SECTOR_STATUS_LEVELS.urgence, 4);
});

Deno.test('§C — règle contesté gelée (rival ≥ 0.25 ET mine ≤ 0.60 ; écart < 0.15 ; > 8 zones/24h)', () => {
  assertEquals(SECTOR_CONTESTED_RULE.rivalMinShare, 0.25);
  assertEquals(SECTOR_CONTESTED_RULE.mineMaxShare, 0.6);
  assertEquals(SECTOR_CONTESTED_RULE.closeGapMax, 0.15);
  assertEquals(SECTOR_CONTESTED_RULE.reclaimZones24h, 8);
  assertEquals(SECTOR_ACTIVE_ATTACK_MAX_H, 6);
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveRole — mine / ally / rival / neutral (couleur PAR RÔLE)
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('resolveRole : mon crew → mine', () => {
  assertEquals(resolveRole('c1', 'c1'), 'mine');
});

Deno.test('resolveRole : crew dans la liste alliés → ally', () => {
  assertEquals(resolveRole('c2', 'c1', ['c2', 'c3']), 'ally');
});

Deno.test('resolveRole : autre crew → rival', () => {
  assertEquals(resolveRole('cX', 'c1', ['c2']), 'rival');
});

Deno.test('resolveRole : pas de propriétaire (null/undefined/vide) → neutral', () => {
  assertEquals(resolveRole(null, 'c1'), 'neutral');
  assertEquals(resolveRole(undefined, 'c1'), 'neutral');
  assertEquals(resolveRole('', 'c1'), 'neutral');
});

Deno.test('resolveRole : joueur sans crew → tout possédant est rival, vide reste neutral', () => {
  assertEquals(resolveRole('cX', null), 'rival');
  assertEquals(resolveRole('cX', undefined), 'rival');
  assertEquals(resolveRole(null, null), 'neutral');
});

Deno.test('resolveRole : mine prime sur ally si mon crew figure aussi dans allyCrewIds', () => {
  // Cas dégénéré (mon crew listé comme allié) — mine doit gagner.
  assertEquals(resolveRole('c1', 'c1', ['c1']), 'mine');
});

// ═══════════════════════════════════════════════════════════════════════════
// pressureBreakdown — sous-scores 0-1 (saturation, proximité de bascule)
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('pressureBreakdown : secteur au repos → tous les sous-scores à 0', () => {
  const b = pressureBreakdown(calmInput);
  assertEquals(b, { rivalActivity: 0, zonesLost: 0, flipProximity: 0, decay: 0 });
});

Deno.test('pressureBreakdown : activité rival sature à SATURATION (au-delà → 1)', () => {
  assertEquals(
    pressureBreakdown({ ...calmInput, rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION })
      .rivalActivity,
    1,
  );
  assertEquals(
    pressureBreakdown({ ...calmInput, rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION * 10 })
      .rivalActivity,
    1,
  );
  // Moitié de la saturation → 0.5.
  assertEquals(
    pressureBreakdown({ ...calmInput, rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION / 2 })
      .rivalActivity,
    0.5,
  );
});

Deno.test('pressureBreakdown : zones perdues saturent à SATURATION', () => {
  assertEquals(
    pressureBreakdown({ ...calmInput, zonesLostRecent: SECTOR_ZONES_LOST_SATURATION }).zonesLost,
    1,
  );
});

Deno.test('pressureBreakdown : proximité de bascule nulle si rival < seuil de présence', () => {
  // Rival juste sous rivalMinShare (0.25) → pas de bascule, même si mine proche.
  const b = pressureBreakdown({ ...calmInput, minePercent: 0.24, rivalPercent: 0.24 });
  assertEquals(b.flipProximity, 0);
});

Deno.test('pressureBreakdown : proximité de bascule maximale si mine == rival (rival présent)', () => {
  const b = pressureBreakdown({ ...calmInput, minePercent: 0.5, rivalPercent: 0.5 });
  assertEquals(b.flipProximity, 1); // 1 - |0.5 - 0.5|
});

Deno.test('pressureBreakdown : proximité décroît avec l’écart (mine 0.7 vs rival 0.3 → 0.6)', () => {
  const b = pressureBreakdown({ ...calmInput, minePercent: 0.7, rivalPercent: 0.3 });
  assert(Math.abs(b.flipProximity - 0.6) < 1e-9);
});

Deno.test('pressureBreakdown : entrées négatives/hors bornes clampées', () => {
  const b = pressureBreakdown({
    minePercent: -1,
    rivalPercent: 5,
    rivalActivityRecent: -10,
    zonesLostRecent: -3,
    decayFraction: 9,
  });
  assertEquals(b.rivalActivity, 0);
  assertEquals(b.zonesLost, 0);
  assertEquals(b.decay, 1); // clampé à 1
  // rival clampé à 1, mine clampé à 0 → écart 1 → proximité 0.
  assertEquals(b.flipProximity, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// pressureScore — 0-100, pondération, saturation
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('pressureScore : secteur au repos → 0', () => {
  assertEquals(pressureScore(calmInput), 0);
});

Deno.test('pressureScore : activité rival saturée seule = poids rivalActivity', () => {
  const s = pressureScore({ ...calmInput, rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION });
  assertEquals(s, SECTOR_PRESSURE_WEIGHTS.rivalActivity);
});

Deno.test('pressureScore : decay plein seul = poids decay', () => {
  assertEquals(pressureScore({ ...calmInput, decayFraction: 1 }), SECTOR_PRESSURE_WEIGHTS.decay);
});

Deno.test('pressureScore : tous signaux au max → saturé à 100 (somme des poids > 100)', () => {
  const sumWeights =
    SECTOR_PRESSURE_WEIGHTS.rivalActivity +
    SECTOR_PRESSURE_WEIGHTS.zonesLost +
    SECTOR_PRESSURE_WEIGHTS.flipProximity +
    SECTOR_PRESSURE_WEIGHTS.decay;
  assert(sumWeights > 100, 'les poids doivent sur-saturer (design §C)');
  const s = pressureScore({
    minePercent: 0.5,
    rivalPercent: 0.5,
    rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION,
    zonesLostRecent: SECTOR_ZONES_LOST_SATURATION,
    decayFraction: 1,
  });
  assertEquals(s, 100);
});

Deno.test('pressureScore : composition rivalActivity+flip (coude-à-coude, saturés) = 45+30=75', () => {
  const s = pressureScore({
    minePercent: 0.5,
    rivalPercent: 0.5,
    rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION, // rivalActivity=1 → 45
    zonesLostRecent: 0,
    decayFraction: 0,
  }); // flipProximity=1 → 30
  assertEquals(s, SECTOR_PRESSURE_WEIGHTS.rivalActivity + SECTOR_PRESSURE_WEIGHTS.flipProximity);
});

Deno.test('pressureScore : résultat toujours entier', () => {
  const s = pressureScore({ ...calmInput, rivalActivityRecent: 7, minePercent: 0.4, rivalPercent: 0.3 });
  assertEquals(s, Math.round(s));
});

// ═══════════════════════════════════════════════════════════════════════════
// isContested — règle §C (a / b / c) + ex-aequo aux bornes
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('isContested (a) : rival = 0.25 (borne incluse) ET mine = 0.60 (borne incluse) → contesté', () => {
  assert(isContested({ minePercent: 0.6, rivalPercent: 0.25, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (a) : rival juste sous 0.25 → PAS contesté par (a)', () => {
  assertFalse(isContested({ minePercent: 0.3, rivalPercent: 0.24, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (a) : mine juste au-dessus de 0.60 (tenu) → PAS contesté par (a) seul', () => {
  // rival 0.30 (présent) mais mine 0.61 → (a) faux ; écart 0.31 ≥ 0.15 → (b) faux.
  assertFalse(isContested({ minePercent: 0.61, rivalPercent: 0.3, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (b) : coude-à-coude (mine 0.55 vs rival 0.52, écart 0.03 < 0.15) → contesté', () => {
  assert(isContested({ minePercent: 0.55, rivalPercent: 0.52, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (b) : écart ≥ closeGapMax (0.20) → NON (borne stricte, hors coude-à-coude)', () => {
  // mine 0.80, rival 0.60 → écart 0.20 ≥ 0.15 → (b) faux ; (a) : mine 0.80 > 0.60 → faux. Doit être NON.
  assertFalse(isContested({ minePercent: 0.8, rivalPercent: 0.6, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (b) : écart juste sous la borne (mine 0.66 vs rival 0.55, ≈0.11 < 0.15) → contesté', () => {
  // Coté « inclus » de la borne : écart ~0.11 < 0.15 ET rival ≥ 0.25 → contesté (b).
  assert(isContested({ minePercent: 0.66, rivalPercent: 0.55, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (b) : rival absent ne crée pas de coude-à-coude (mine 0.10 vs rival 0.05)', () => {
  // écart 0.05 < 0.15 MAIS rival 0.05 < 0.25 (absent) → pas contesté.
  assertFalse(isContested({ minePercent: 0.1, rivalPercent: 0.05, rivalReclaimed24h: 0 }));
});

Deno.test('isContested (c) : > 8 zones reprises/24h force le contesté même si je domine', () => {
  // Je domine largement (mine 0.9, rival 0) mais poussée récente de 9 zones.
  assert(isContested({ minePercent: 0.9, rivalPercent: 0, rivalReclaimed24h: 9 }));
});

Deno.test('isContested (c) : EXACTEMENT 8 zones → NON (strictement >)', () => {
  assertFalse(isContested({ minePercent: 0.9, rivalPercent: 0, rivalReclaimed24h: 8 }));
});

Deno.test('isContested : secteur au repos (0/0/0) → NON', () => {
  assertFalse(isContested({ minePercent: 0, rivalPercent: 0, rivalReclaimed24h: 0 }));
});

// ═══════════════════════════════════════════════════════════════════════════
// sectorStatus — 5 niveaux + bornes de bande + attaque active + ex-aequo
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('sectorStatus : pression 0 → stable (niveau 0)', () => {
  const s = sectorStatus({ pressure: 0, contested: false, now: NOW });
  assertEquals(s, { level: 0, key: 'stable' });
});

Deno.test('sectorStatus : borne haute de stable (30) → stable ; 31 → pression', () => {
  assertEquals(sectorStatus({ pressure: 30, contested: false, now: NOW }).key, 'stable');
  assertEquals(sectorStatus({ pressure: 31, contested: false, now: NOW }).key, 'pression');
});

Deno.test('sectorStatus : borne basse contestée (61) → contestée ; 60 → pression', () => {
  assertEquals(sectorStatus({ pressure: 60, contested: false, now: NOW }).key, 'pression');
  const c = sectorStatus({ pressure: 61, contested: false, now: NOW });
  assertEquals(c, { level: 2, key: 'contestee' });
});

Deno.test('sectorStatus : borne basse urgence (81) → urgence ; 80 → contestée', () => {
  assertEquals(sectorStatus({ pressure: 80, contested: false, now: NOW }).key, 'contestee');
  const u = sectorStatus({ pressure: 81, contested: false, now: NOW });
  assertEquals(u, { level: 4, key: 'urgence' });
});

Deno.test('sectorStatus : pression 100 → urgence', () => {
  assertEquals(sectorStatus({ pressure: 100, contested: false, now: NOW }).key, 'urgence');
});

Deno.test('sectorStatus : drapeau contesté remonte une bande PRESSION à contestée', () => {
  // Score 40 (bande pression) mais règle métier « contesté » vraie → contestée.
  const s = sectorStatus({ pressure: 40, contested: true, now: NOW });
  assertEquals(s, { level: 2, key: 'contestee' });
});

Deno.test('sectorStatus : drapeau contesté ne remonte PAS un stable si aucune attaque', () => {
  // Score 10 (stable) + contesté → contestée (le contesté prime sur stable).
  const s = sectorStatus({ pressure: 10, contested: true, now: NOW });
  assertEquals(s.key, 'contestee');
});

Deno.test('sectorStatus : attaque active sur secteur déjà en pression → attaque (niveau 3)', () => {
  const s = sectorStatus({ pressure: 45, contested: false, lastAttackAt: hAgo(1), now: NOW });
  assertEquals(s, { level: 3, key: 'attaque' });
});

Deno.test('sectorStatus : attaque active sur secteur STABLE (calme) → reste pression seulement si bande, sinon stable', () => {
  // Attaque récente MAIS score stable (10) et non contesté → le sur-signal
  // « attaque » ne se déclenche pas sur du calme total → stable.
  const s = sectorStatus({ pressure: 10, contested: false, lastAttackAt: hAgo(1), now: NOW });
  assertEquals(s.key, 'stable');
});

Deno.test('sectorStatus : attaque active + contesté (score bas) → attaque (alreadyHot via contested)', () => {
  const s = sectorStatus({ pressure: 10, contested: true, lastAttackAt: hAgo(1), now: NOW });
  assertEquals(s, { level: 3, key: 'attaque' });
});

Deno.test('sectorStatus : attaque REFROIDIE (au-delà de la fenêtre) → retombe sur la bande', () => {
  // Dernier assaut il y a 7 h (> 6 h) → plus « active » → bande contestée (70).
  const s = sectorStatus({
    pressure: 70,
    contested: false,
    lastAttackAt: hAgo(SECTOR_ACTIVE_ATTACK_MAX_H + 1),
    now: NOW,
  });
  assertEquals(s.key, 'contestee');
});

Deno.test('sectorStatus : attaque à la borne EXACTE de la fenêtre (6 h) → encore active', () => {
  const s = sectorStatus({
    pressure: 50,
    contested: false,
    lastAttackAt: hAgo(SECTOR_ACTIVE_ATTACK_MAX_H),
    now: NOW,
  });
  assertEquals(s.key, 'attaque');
});

Deno.test('sectorStatus : lastAttackAt dans le FUTUR (âge négatif) → non active', () => {
  const s = sectorStatus({ pressure: 45, contested: false, lastAttackAt: hAhead(2), now: NOW });
  assertEquals(s.key, 'pression');
});

Deno.test('sectorStatus : urgence PRIME sur attaque active', () => {
  // Score 90 (urgence) + attaque en cours → urgence gagne (signal le plus fort).
  const s = sectorStatus({ pressure: 90, contested: true, lastAttackAt: hAgo(1), now: NOW });
  assertEquals(s, { level: 4, key: 'urgence' });
});

Deno.test('sectorStatus : lastAttackAt null / absent → jamais attaque', () => {
  assertEquals(sectorStatus({ pressure: 50, contested: false, lastAttackAt: null, now: NOW }).key, 'pression');
  assertEquals(sectorStatus({ pressure: 50, contested: false, now: NOW }).key, 'pression');
});

// ═══════════════════════════════════════════════════════════════════════════
// deriveSectorView — composition complète (rôles → pression → statut)
// ═══════════════════════════════════════════════════════════════════════════

const baseSector: AggregatedSector = {
  id: 's1',
  ownerCrewId: 'me',
  topRivalCrewId: 'rivalCrew',
  ownerPercent: 0.5,
  topRivalPercent: 0.4,
  neutralPercent: 0.1,
  rivalActivityRecent: 0,
  zonesLostRecent: 0,
  rivalReclaimed24h: 0,
  decayFraction: 0,
  lastAttackAt: null,
};

Deno.test('deriveSectorView : je possède + rival hostile → rôles mine/rival, parts recopiées', () => {
  const v = deriveSectorView(baseSector, 'me', [], NOW);
  assertEquals(v.ownerRole, 'mine');
  assertEquals(v.rivalRole, 'rival');
  assertEquals(v.minePercent, 0.5);
  assertEquals(v.rivalPercent, 0.4);
  assertEquals(v.neutralPercent, 0.1);
  // mine 0.5 vs rival 0.4 : (a) rival≥0.25 ET mine≤0.60 → contesté.
  assert(v.contested);
  assertEquals(v.status.key, 'contestee');
});

Deno.test('deriveSectorView : secteur d’un rival (je ne possède pas) → minePercent 0', () => {
  const v = deriveSectorView({ ...baseSector, ownerCrewId: 'rivalCrew' }, 'me', [], NOW);
  assertEquals(v.ownerRole, 'rival');
  assertEquals(v.minePercent, 0); // je ne possède pas → 0
});

Deno.test('deriveSectorView : « top rival » qui est en réalité un ALLIÉ → n’exerce pas de pression', () => {
  const v = deriveSectorView(
    { ...baseSector, topRivalCrewId: 'friend', rivalReclaimed24h: 0 },
    'me',
    ['friend'],
    NOW,
  );
  assertEquals(v.rivalRole, 'ally');
  assertEquals(v.rivalPercent, 0); // allié → part rivale neutralisée
  assertFalse(v.contested); // plus d'adversaire → pas contesté
  assertEquals(v.status.key, 'stable');
});

Deno.test('deriveSectorView : secteur neutre (aucun owner) → ownerRole neutral, mine 0', () => {
  const v = deriveSectorView(
    { ...baseSector, ownerCrewId: null, ownerPercent: 0, topRivalCrewId: null, topRivalPercent: 0, neutralPercent: 1 },
    'me',
    [],
    NOW,
  );
  assertEquals(v.ownerRole, 'neutral');
  assertEquals(v.rivalRole, 'neutral');
  assertEquals(v.minePercent, 0);
  assertEquals(v.rivalPercent, 0);
  assertEquals(v.pressure, 0);
  assertEquals(v.status.key, 'stable');
});

Deno.test('deriveSectorView : urgence sous assaut (activité + decay + attaque) → niveau 4', () => {
  const v = deriveSectorView(
    {
      ...baseSector,
      ownerPercent: 0.45,
      topRivalPercent: 0.45,
      neutralPercent: 0.1,
      rivalActivityRecent: SECTOR_RIVAL_ACTIVITY_SATURATION,
      zonesLostRecent: SECTOR_ZONES_LOST_SATURATION,
      decayFraction: 1,
      rivalReclaimed24h: 12,
      lastAttackAt: hAgo(1),
    },
    'me',
    [],
    NOW,
  );
  assertEquals(v.pressure, 100);
  assert(v.contested);
  assertEquals(v.status, { level: 4, key: 'urgence' });
});

Deno.test('deriveSectorView : déterministe (même entrée, même now → même sortie)', () => {
  const a = deriveSectorView(baseSector, 'me', [], NOW);
  const b = deriveSectorView(baseSector, 'me', [], NOW);
  assertEquals(a, b);
});
