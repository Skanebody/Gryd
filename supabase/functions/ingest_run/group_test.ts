/**
 * Tests AMENDEMENT-35 — avantages de GROUPE (moteur PUR, anti pay-to-win).
 * Couvre : groupCaptureBonusPct (plancher solo, barème monotone, cap absolu,
 * entrées dégénérées) et crewStreakTier (bornes basses, monotonie, 'none').
 * AUCUN réseau. Importe depuis les copies _shared (re-sync par le vérificateur).
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  CREW_STREAK_THRESHOLDS,
  GROUP_CAPTURE_BONUS_BY_RUNNERS,
  GROUP_CAPTURE_BONUS_MAX_PCT,
} from '../_shared/game-rules.ts';
import { crewStreakTier, groupCaptureBonusPct } from '../_shared/engine/group.ts';

// ─── §1 groupCaptureBonusPct ─────────────────────────────────────────────────

Deno.test('groupCaptureBonusPct : plancher 0 pour le solo (0 et 1 runner)', () => {
  assertEquals(groupCaptureBonusPct(0), 0);
  assertEquals(groupCaptureBonusPct(1), 0);
});

Deno.test('groupCaptureBonusPct : barème exact 2→15 %, 3→25 %, 4→35 %', () => {
  assertEquals(groupCaptureBonusPct(2), 0.15);
  assertEquals(groupCaptureBonusPct(3), 0.25);
  assertEquals(groupCaptureBonusPct(4), 0.35);
});

Deno.test('groupCaptureBonusPct : cap absolu +40 % dès 5, saturé au-delà', () => {
  assertEquals(groupCaptureBonusPct(5), GROUP_CAPTURE_BONUS_MAX_PCT);
  assertEquals(groupCaptureBonusPct(6), GROUP_CAPTURE_BONUS_MAX_PCT);
  assertEquals(groupCaptureBonusPct(100), GROUP_CAPTURE_BONUS_MAX_PCT);
});

Deno.test('groupCaptureBonusPct : jamais au-dessus du cap, jamais sous 0', () => {
  for (let n = -3; n <= 50; n++) {
    const b = groupCaptureBonusPct(n);
    assert(b >= 0, `bonus < 0 pour n=${n}`);
    assert(b <= GROUP_CAPTURE_BONUS_MAX_PCT, `bonus > cap pour n=${n}`);
  }
});

Deno.test('groupCaptureBonusPct : monotone croissant (aucun recul)', () => {
  let prev = -1;
  for (let n = 0; n <= 12; n++) {
    const b = groupCaptureBonusPct(n);
    assert(b >= prev, `recul à n=${n} (${b} < ${prev})`);
    prev = b;
  }
});

Deno.test('groupCaptureBonusPct : entrées dégénérées ramenées au plancher/barème', () => {
  assertEquals(groupCaptureBonusPct(-5), 0); // négatif → solo
  assertEquals(groupCaptureBonusPct(2.9), 0.15); // tronqué vers l'entier bas
  assertEquals(groupCaptureBonusPct(NaN), 0); // non fini → plancher
  assertEquals(groupCaptureBonusPct(Infinity), 0); // non fini → plancher
});

Deno.test('groupCaptureBonusPct : cap = dernière valeur du barème game-rules', () => {
  const last = GROUP_CAPTURE_BONUS_BY_RUNNERS[GROUP_CAPTURE_BONUS_BY_RUNNERS.length - 1];
  assertEquals(last, GROUP_CAPTURE_BONUS_MAX_PCT);
});

// ─── §2 crewStreakTier ───────────────────────────────────────────────────────

Deno.test('crewStreakTier : sous le 1er palier → none', () => {
  assertEquals(crewStreakTier(0), 'none');
  assertEquals(crewStreakTier(-4), 'none');
  assertEquals(crewStreakTier(NaN), 'none');
});

Deno.test('crewStreakTier : chaque borne basse donne le tier exact', () => {
  assertEquals(crewStreakTier(CREW_STREAK_THRESHOLDS.active), 'active');
  assertEquals(crewStreakTier(CREW_STREAK_THRESHOLDS.bonus), 'bonus');
  assertEquals(crewStreakTier(CREW_STREAK_THRESHOLDS.chestPlus), 'chestPlus');
  assertEquals(crewStreakTier(CREW_STREAK_THRESHOLDS.premiumBadge), 'premiumBadge');
});

Deno.test('crewStreakTier : juste sous une borne reste au palier précédent', () => {
  assertEquals(crewStreakTier(2), 'active'); // 3 = bonus
  assertEquals(crewStreakTier(6), 'bonus'); // 7 = chestPlus
  assertEquals(crewStreakTier(29), 'chestPlus'); // 30 = premiumBadge
});

Deno.test('crewStreakTier : sature au dernier palier au-delà de 30 j', () => {
  assertEquals(crewStreakTier(60), 'premiumBadge');
  assertEquals(crewStreakTier(365), 'premiumBadge');
});

Deno.test('crewStreakTier : monotone (rang jamais décroissant)', () => {
  const order = ['none', 'active', 'bonus', 'chestPlus', 'premiumBadge'];
  let prev = -1;
  for (let d = 0; d <= 40; d++) {
    const rank = order.indexOf(crewStreakTier(d));
    assert(rank >= prev, `recul de tier à d=${d}`);
    prev = rank;
  }
});
