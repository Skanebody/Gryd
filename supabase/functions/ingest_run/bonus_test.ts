/**
 * Tests AMENDEMENT-19 §2/§5/§6 — Moteur de bonus ciblés (engine/bonus.ts).
 * Purs : selectBonus + isRelevant + eligible + applyBonusReward + libellé.
 * « GRYD ne te donne pas des bonus au hasard. Il révèle les bons moments. »
 *
 * Couvre les cas exigés par la mission :
 *  - Finisher déclenche si frontière ouverte < 800 m (et pas au-delà) ;
 *  - cap +35 % respecté (système 25 % + bonus 25 % → 35 %, jamais 56 %) ;
 *  - priorité (défense urgente gagne face au Finisher) ;
 *  - Retour anti-shame (fenêtre 5-10 j, cooldown 14 j, copy sans menace) ;
 *  - non-cumul (un seul multiplicateur effectif).
 */
import { assert, assertAlmostEquals, assertEquals } from 'jsr:@std/assert@^1';
import {
  BONUS_MAX_TOTAL_PCT,
  BONUS_REWARD_PCT,
  CREW_BOOST_CHEST_MULTIPLIER,
  FINISHER_BONUS_MISSING_MAX_M,
} from '../_shared/game-rules.ts';
import { BONUS_DEFINITIONS, BONUS_LIST } from '../_shared/bonuses.ts';
import {
  applyBonusReward,
  type BonusEligibilityContext,
  type BonusSelectionContext,
  bonusEffectLabel,
  eligible,
  isRelevant,
  selectBonus,
} from '../_shared/engine/bonus.ts';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Contexte de sélection « rien de pertinent » (base à surcharger). */
function emptyContext(): BonusSelectionContext {
  return { player: {}, crew: { hasCrew: true } };
}

/** Éligibilité « tout OK » (run vérifié, même crew, aucun cap atteint). */
function okEligibility(): BonusEligibilityContext {
  return {
    motionTrust: 90,
    sameCrew: true,
    playerClaimsThisWeek: 0,
    crewClaimsToday: 0,
    crewClaimsThisWeek: 0,
  };
}

// ─── 1. Finisher : frontière ouverte < 800 m ─────────────────────────────────

Deno.test('Finisher pertinent si frontière crew ouverte < 800 m', () => {
  const ctx = emptyContext();
  ctx.crew.nearestOpenBoundaryMissingM = 620; // « il manque 620 m »
  assert(isRelevant('finisher', ctx), 'Finisher doit être pertinent à 620 m');
  const sel = selectBonus(ctx, 'map');
  assert(sel !== null, 'un bonus attendu sur la carte');
  assertEquals(sel!.def.id, 'finisher');
});

Deno.test('Finisher NON pertinent au seuil exact (frontière trop loin)', () => {
  const ctx = emptyContext();
  ctx.crew.nearestOpenBoundaryMissingM = FINISHER_BONUS_MISSING_MAX_M + 1; // 801 m
  assert(!isRelevant('finisher', ctx), 'au-delà de 800 m : pas de bonus Finisher');
});

Deno.test('Finisher NON pertinent sans crew (mécanique collaborative)', () => {
  const ctx: BonusSelectionContext = {
    player: {},
    crew: { hasCrew: false, nearestOpenBoundaryMissingM: 300 },
  };
  assert(!isRelevant('finisher', ctx), 'sans crew, aucune frontière crew');
  assertEquals(selectBonus(ctx, 'map'), null);
});

// ─── 2. Priorité : défense urgente gagne ─────────────────────────────────────

Deno.test('priorité : Défense Critique gagne face au Finisher (même écran)', () => {
  // Les deux sont pertinents ET visibles sur la carte : la défense l'emporte.
  const ctx = emptyContext();
  ctx.crew.nearestOpenBoundaryMissingM = 400; // Finisher pertinent
  ctx.crew.soonestZoneDecayH = 6; // Défense Critique pertinente (< 12 h)
  assert(isRelevant('finisher', ctx));
  assert(isRelevant('defense_critical', ctx));
  const sel = selectBonus(ctx, 'map');
  assert(sel !== null);
  assertEquals(sel!.def.id, 'defense_critical', 'la défense urgente prime (doc §4)');
});

Deno.test('priorité : Finisher gagne face au Coffre Crew et à l’Exploration', () => {
  const ctx = emptyContext();
  ctx.crew.nearestOpenBoundaryMissingM = 500; // Finisher
  ctx.crew.chestRatio = 0.9; // Coffre Crew (mais war_room only)
  ctx.player.hasUnexploredSectorNear = true; // Exploration
  // Sur la carte : Finisher (60) vs Exploration (30) → Finisher.
  const onMap = selectBonus(ctx, 'map');
  assertEquals(onMap!.def.id, 'finisher');
  // En War Room : Finisher (60) vs Coffre Crew (50) → Finisher.
  const inWarRoom = selectBonus(ctx, 'war_room');
  assertEquals(inWarRoom!.def.id, 'finisher');
});

Deno.test('un seul bonus principal par écran + respect de la visibilité', () => {
  const ctx = emptyContext();
  ctx.player.cleanLoopClosed = true; // Boucle Propre : post_run only
  ctx.crew.chestRatio = 0.9; // Coffre Crew : war_room/crew_chat, PAS post_run
  // Post-run : seule la Boucle Propre est visible ici.
  const post = selectBonus(ctx, 'post_run');
  assert(post !== null);
  assertEquals(post!.def.id, 'clean_loop');
  // La carte ne voit ni l'une (post_run) ni l'autre (war_room) → rien.
  assertEquals(selectBonus(ctx, 'map'), null);
});

// ─── 3. Retour : anti-shame ──────────────────────────────────────────────────

Deno.test('Retour pertinent dans la fenêtre 5-10 j, pas avant/après', () => {
  const inWindow: BonusSelectionContext = { player: { daysSinceLastRun: 7 }, crew: { hasCrew: false } };
  assert(isRelevant('return', inWindow), '7 j : Retour pertinent');
  const tooSoon: BonusSelectionContext = { player: { daysSinceLastRun: 3 }, crew: { hasCrew: false } };
  assert(!isRelevant('return', tooSoon), '3 j : trop tôt');
  const tooLate: BonusSelectionContext = { player: { daysSinceLastRun: 20 }, crew: { hasCrew: false } };
  assert(!isRelevant('return', tooLate), '20 j : hors fenêtre MVP');
});

Deno.test('Retour : copy anti-shame (jamais de menace sur la série)', () => {
  const r = BONUS_DEFINITIONS.return;
  const all = `${r.copy.title} ${r.copy.body} ${r.copy.button} ${r.cta}`.toLowerCase();
  assert(!all.includes('perdre'), 'jamais « perdre »');
  assert(!all.includes('série'), 'jamais de menace explicite sur la série');
  assert(!all.includes('tu vas'), 'jamais « tu vas … »');
  assertEquals(r.cta, '2 km suffisent', 'CTA doux (doc §6.4)');
});

Deno.test('Retour : cooldown 14 j par joueur (anti-abus)', () => {
  const bonus = BONUS_DEFINITIONS.return;
  const recent: BonusEligibilityContext = { ...okEligibility(), daysSinceLastPlayerClaim: 5 };
  assertEquals(eligible(bonus, recent).reason, 'player_days_cooldown', 'trop récent');
  const old: BonusEligibilityContext = { ...okEligibility(), daysSinceLastPlayerClaim: 15 };
  assert(eligible(bonus, old).eligible, '15 j écoulés : éligible');
});

// ─── 4. Cap +35 % + non-cumul (LE cœur anti-abus) ────────────────────────────

Deno.test('cap +35 % : système 25 % + bonus 25 % → 35 % (jamais 56 %)', () => {
  const bonus = BONUS_DEFINITIONS.finisher; // reward.chestPct = 0.25
  const systemPct = CREW_BOOST_CHEST_MULTIPLIER - 1; // Crew Boost = +0.25
  const applied = applyBonusReward(bonus, { chestBase: 100, xpBase: 0, systemPct });
  // appliedPct = min(0.25 + 0.25, 0.35) = 0.35 — PAS 0.5625 (multiplicatif).
  assertAlmostEquals(applied.appliedPct, BONUS_MAX_TOTAL_PCT, 1e-9);
  // La PART du bonus au-dessus du système = 0.35 − 0.25 = 0.10 → +10 sur base 100.
  assertAlmostEquals(applied.chestDelta, 10, 1e-9);
  // Contrôle « pas 56 % » : le delta multiplicatif naïf serait bien plus grand.
  const naiveMultiplicative = 100 * ((1.25 * 1.25) - 1); // = 56.25
  assert(applied.chestDelta < naiveMultiplicative, 'jamais le cumul multiplicatif');
});

Deno.test('cap +35 % : sans boost système, le bonus applique son plein pourcentage', () => {
  const bonus = BONUS_DEFINITIONS.finisher; // 0.25
  const applied = applyBonusReward(bonus, { chestBase: 200, xpBase: 0 });
  assertAlmostEquals(applied.appliedPct, 0.25, 1e-9);
  assertAlmostEquals(applied.chestDelta, 50, 1e-9); // 200 × 0.25
});

Deno.test('cap +35 % : un bonus qui dépasserait le cap est borné', () => {
  // Bonus fictif à +40 % → borné à 35 % ; part au-dessus d'un système nul = 35 %.
  const fake = { ...BONUS_DEFINITIONS.finisher, reward: { chestPct: 0.4 } };
  const applied = applyBonusReward(fake, { chestBase: 100, xpBase: 0 });
  assertAlmostEquals(applied.appliedPct, BONUS_MAX_TOTAL_PCT, 1e-9);
  assertAlmostEquals(applied.chestDelta, 35, 1e-9);
});

Deno.test('non-cumul : système déjà au cap → le bonus n’ajoute rien de plus', () => {
  const bonus = BONUS_DEFINITIONS.finisher; // 0.25
  // Système déjà à 0.35 (cap) : appliedPct reste 0.35, part bonus = 0.
  const applied = applyBonusReward(bonus, { chestBase: 100, xpBase: 0, systemPct: 0.35 });
  assertAlmostEquals(applied.appliedPct, BONUS_MAX_TOTAL_PCT, 1e-9);
  assertAlmostEquals(applied.chestDelta, 0, 1e-9, 'un seul multiplicateur : rien à ajouter');
});

Deno.test('non-cumul : un bonus XP n’affecte PAS le coffre, et inversement', () => {
  // Retour porte xpPct (pas chestPct) → chestDelta = 0 même avec chestBase > 0.
  const ret = applyBonusReward(BONUS_DEFINITIONS.return, { chestBase: 500, xpBase: 100 });
  assertEquals(ret.chestDelta, 0, 'Retour ne touche jamais le coffre');
  assertAlmostEquals(ret.xpDelta, 100 * BONUS_REWARD_PCT.return_xp, 1e-9);
  // Finisher porte chestPct (pas xpPct) → xpDelta = 0.
  const fin = applyBonusReward(BONUS_DEFINITIONS.finisher, { chestBase: 100, xpBase: 500 });
  assertEquals(fin.xpDelta, 0, 'Finisher ne touche jamais l’XP perso via multiplicateur');
});

// ─── 5. Éligibilité (anti-abus) ──────────────────────────────────────────────

Deno.test('éligibilité : run non vérifié (Motion Trust bas) → refusé', () => {
  const bad: BonusEligibilityContext = { ...okEligibility(), motionTrust: 40 };
  const v = eligible(BONUS_DEFINITIONS.finisher, bad);
  assertEquals(v.eligible, false);
  assertEquals(v.reason, 'not_verified');
});

Deno.test('éligibilité : bonus crew mais run hors crew → refusé', () => {
  const notCrew: BonusEligibilityContext = { ...okEligibility(), sameCrew: false };
  assertEquals(eligible(BONUS_DEFINITIONS.finisher, notCrew).reason, 'not_same_crew');
});

Deno.test('éligibilité : cap Finisher joueur/semaine (3) et crew/jour (5)', () => {
  const bonus = BONUS_DEFINITIONS.finisher;
  const weekFull: BonusEligibilityContext = { ...okEligibility(), playerClaimsThisWeek: 3 };
  assertEquals(eligible(bonus, weekFull).reason, 'player_week_cap');
  const dayFull: BonusEligibilityContext = { ...okEligibility(), crewClaimsToday: 5 };
  assertEquals(eligible(bonus, dayFull).reason, 'crew_day_cap');
  const ok: BonusEligibilityContext = { ...okEligibility(), playerClaimsThisWeek: 2, crewClaimsToday: 4 };
  assert(eligible(bonus, ok).eligible, 'sous les deux caps : éligible');
});

Deno.test('éligibilité : cooldown zone du Finisher (24 h)', () => {
  const bonus = BONUS_DEFINITIONS.finisher;
  const tooSoon: BonusEligibilityContext = { ...okEligibility(), hoursSinceLastZoneClaim: 10 };
  assertEquals(eligible(bonus, tooSoon).reason, 'zone_cooldown');
  const ok: BonusEligibilityContext = { ...okEligibility(), hoursSinceLastZoneClaim: 30 };
  assert(eligible(bonus, ok).eligible, '30 h : cooldown écoulé');
});

Deno.test('éligibilité : Défense Critique cap crew/jour (1)', () => {
  const bonus = BONUS_DEFINITIONS.defense_critical;
  const dayFull: BonusEligibilityContext = { ...okEligibility(), crewClaimsToday: 1 };
  assertEquals(eligible(bonus, dayFull).reason, 'crew_day_cap');
});

Deno.test('éligibilité : Coffre Crew cap crew/semaine (1)', () => {
  const bonus = BONUS_DEFINITIONS.crew_chest;
  const weekFull: BonusEligibilityContext = { ...okEligibility(), crewClaimsThisWeek: 1 };
  assertEquals(eligible(bonus, weekFull).reason, 'crew_week_cap');
});

// ─── 6. Intégrité de la DATA (non pay-to-win) ────────────────────────────────

Deno.test('DATA : aucun bonus ne récompense territoire/points/classement', () => {
  for (const b of BONUS_LIST) {
    const keys = Object.keys(b.reward);
    for (const k of keys) {
      assert(
        ['chestPct', 'xpPct', 'badgeProgress', 'protectionH', 'cosmetic'].includes(k),
        `${b.id} : reward « ${k} » interdit (jamais territoire/points/rang)`,
      );
    }
    assert(keys.length > 0, `${b.id} : au moins une récompense`);
  }
});

Deno.test('DATA : tout pourcentage de reward est ≤ cap +35 %', () => {
  for (const b of BONUS_LIST) {
    if (b.reward.chestPct !== undefined) {
      assert(b.reward.chestPct <= BONUS_MAX_TOTAL_PCT, `${b.id} chestPct ≤ cap`);
    }
    if (b.reward.xpPct !== undefined) {
      assert(b.reward.xpPct <= BONUS_MAX_TOTAL_PCT, `${b.id} xpPct ≤ cap`);
    }
  }
});

Deno.test('DATA : les 6 bonus MVP sont présents et bien typés', () => {
  assertEquals(BONUS_LIST.length, 6, '6 bonus, pas 50 (doc §6)');
  const ids = BONUS_LIST.map((b) => b.id).sort();
  assertEquals(ids, ['clean_loop', 'crew_chest', 'defense_critical', 'exploration', 'finisher', 'return']);
  for (const b of BONUS_LIST) {
    assert(b.visibility.length > 0, `${b.id} : au moins un écran`);
    assert(b.cta.length > 0 && b.cta.length <= 20, `${b.id} : CTA court non tronqué`);
    assert(b.eligibility.includes('run_verified'), `${b.id} : GRYD Verified requis`);
  }
});

Deno.test('libellé d’effet : court, non tronqué, jamais « points »', () => {
  for (const b of BONUS_LIST) {
    const label = bonusEffectLabel(b);
    assert(label.length > 0 && label.length <= 30, `${b.id} : « ${label} » court`);
    assert(!label.toLowerCase().includes('point'), `${b.id} : jamais « points »`);
    assert(!label.toLowerCase().includes('territoire'), `${b.id} : jamais « territoire »`);
  }
  assertEquals(bonusEffectLabel(BONUS_DEFINITIONS.finisher), '+25 % coffre crew');
  assertEquals(bonusEffectLabel(BONUS_DEFINITIONS.return), '+10 % XP');
});
