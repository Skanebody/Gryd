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
  HEX_LOCK_HOURS,
} from '../_shared/game-rules.ts';
import {
  crewStreakTier,
  groupCaptureBonusPct,
  retroactiveLockUntil,
} from '../_shared/engine/group.ts';

const MS_PER_HOUR = 3_600_000;
const CLAIMED = new Date('2026-07-20T10:00:00.000Z');
/** Borne attendue = claimedAt + HEX_LOCK_HOURS × (1 + bonus(rang)). */
const expectedLock = (rank: number) =>
  new Date(CLAIMED.getTime() + HEX_LOCK_HOURS * (1 + groupCaptureBonusPct(rank)) * MS_PER_HOUR);

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

// ─── §3 retroactiveLockUntil (LE RELAIS, A-41 §4 « Ensemble ça tient ») ───────

Deno.test('retroactiveLockUntil : rang 1 (solo) → null, aucune protection', () => {
  assertEquals(
    retroactiveLockUntil({ claimedAt: CLAIMED, currentLockedUntil: null, runnersTotal: 1 }),
    null,
  );
});

Deno.test('retroactiveLockUntil : rang 2 → claimedAt + 27,6 h (24 × 1,15)', () => {
  const got = retroactiveLockUntil({
    claimedAt: CLAIMED,
    currentLockedUntil: null,
    runnersTotal: 2,
  });
  assertEquals(got, expectedLock(2));
  assertEquals(got!.getTime() - CLAIMED.getTime(), 27.6 * MS_PER_HOUR);
});

Deno.test('retroactiveLockUntil : rang 3 → claimedAt + 30 h (24 × 1,25)', () => {
  const got = retroactiveLockUntil({
    claimedAt: CLAIMED,
    currentLockedUntil: null,
    runnersTotal: 3,
  });
  assertEquals(got, expectedLock(3));
  assertEquals(got!.getTime() - CLAIMED.getTime(), 30 * MS_PER_HOUR);
});

Deno.test('retroactiveLockUntil : rang ≥ 6 capé à claimedAt + 33,6 h (24 × 1,40)', () => {
  for (const rank of [6, 7, 12, 100]) {
    const got = retroactiveLockUntil({
      claimedAt: CLAIMED,
      currentLockedUntil: null,
      runnersTotal: rank,
    });
    assertEquals(got!.getTime() - CLAIMED.getTime(), 33.6 * MS_PER_HOUR, `rang=${rank}`);
    // Le cap dérive bien du barème game-rules (+40 %), pas d'un nombre magique :
    // même formule que la fonction ⇒ même borne (arrondi ms identique).
    assertEquals(got, expectedLock(rank), `cap game-rules rang=${rank}`);
    assertEquals(groupCaptureBonusPct(rank), GROUP_CAPTURE_BONUS_MAX_PCT, `cap barème rang=${rank}`);
  }
});

Deno.test('retroactiveLockUntil : JAMAIS de raccourcissement (lock courant plus loin → null)', () => {
  // Le propriétaire a déjà un lock à +48 h ; le calcul (+30 h) ne l'allonge pas.
  const farLock = new Date(CLAIMED.getTime() + 48 * MS_PER_HOUR);
  assertEquals(
    retroactiveLockUntil({ claimedAt: CLAIMED, currentLockedUntil: farLock, runnersTotal: 3 }),
    null,
  );
  // Borne courante EXACTEMENT égale au calcul → pas d'allongement strict → null.
  assertEquals(
    retroactiveLockUntil({
      claimedAt: CLAIMED,
      currentLockedUntil: expectedLock(2),
      runnersTotal: 2,
    }),
    null,
  );
});

Deno.test('retroactiveLockUntil : allonge quand le calcul dépasse le lock courant', () => {
  // Lock courant à +26 h (< 27,6 h) → on étend au calcul.
  const near = new Date(CLAIMED.getTime() + 26 * MS_PER_HOUR);
  const got = retroactiveLockUntil({
    claimedAt: CLAIMED,
    currentLockedUntil: near,
    runnersTotal: 2,
  });
  assertEquals(got, expectedLock(2));
  assert(got!.getTime() > near.getTime(), 'doit rallonger strictement');
});

Deno.test('retroactiveLockUntil : claimedAt invalide (NaN) → null', () => {
  assertEquals(
    retroactiveLockUntil({
      claimedAt: new Date('pas-une-date'),
      currentLockedUntil: null,
      runnersTotal: 3,
    }),
    null,
  );
});

Deno.test('retroactiveLockUntil : currentLockedUntil null → extension dès le rang 2', () => {
  const got = retroactiveLockUntil({
    claimedAt: CLAIMED,
    currentLockedUntil: null,
    runnersTotal: 2,
  });
  assert(got !== null, 'null current ⇒ toujours étendre');
  assertEquals(got, expectedLock(2));
});

Deno.test('retroactiveLockUntil : monotonie (rang croissant → lock jamais plus court)', () => {
  let prevMs = -1;
  for (let rank = 2; rank <= 12; rank++) {
    const got = retroactiveLockUntil({
      claimedAt: CLAIMED,
      currentLockedUntil: null,
      runnersTotal: rank,
    });
    assert(got !== null, `rang=${rank} devrait étendre`);
    assert(got!.getTime() >= prevMs, `recul de lock à rang=${rank}`);
    prevMs = got!.getTime();
  }
});

Deno.test('retroactiveLockUntil : rang non fini (NaN, Infinity) → null (jamais sur garbage)', () => {
  assertEquals(
    retroactiveLockUntil({ claimedAt: CLAIMED, currentLockedUntil: null, runnersTotal: NaN }),
    null,
  );
  assertEquals(
    retroactiveLockUntil({ claimedAt: CLAIMED, currentLockedUntil: null, runnersTotal: Infinity }),
    null,
  );
});
