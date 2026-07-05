/**
 * Tests Crew Boost (AMENDEMENT-16 §4, doc §13.1/§21) — moteur PUR.
 * Couvre : fenêtre active (statut + bornes), 1 seul effet (jamais de cumul :
 * max, pas somme), borne dure CREW_BOOST_CHEST_MULTIPLIER, blackout des
 * BOOST_BLACKOUT_END_OF_SEASON_H dernières heures de saison, progression de
 * coffre boostée (floor, jamais négative, coffre UNIQUEMENT). AUCUN réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  BOOST_BLACKOUT_END_OF_SEASON_H,
  CREW_BOOST_CHEST_MULTIPLIER,
  CREW_BOOST_MAX_ACTIVE,
} from '../_shared/game-rules.ts';
import {
  boostChestMultiplier,
  boostedChestProgress,
  chestProgressDelta,
  crewBoostActive,
  type CrewBoostWindow,
} from '../_shared/engine/crew.ts';
import { CREW_CHEST_WEIGHTS } from '../_shared/game-rules.ts';

const HOUR_MS = 3_600_000;
const NOW = 1_750_000_000_000; // epoch ms arbitraire

function boost(over: Partial<CrewBoostWindow> = {}): CrewBoostWindow {
  return {
    startsAtMs: NOW - HOUR_MS,
    endsAtMs: NOW + 23 * HOUR_MS,
    multiplier: CREW_BOOST_CHEST_MULTIPLIER,
    status: 'active',
    ...over,
  };
}

// ─── crewBoostActive : statut + fenêtre ──────────────────────────────────────

Deno.test('crewBoostActive : actif dans la fenêtre, statut active', () => {
  assertEquals(crewBoostActive(boost(), NOW), true);
});

Deno.test('crewBoostActive : borne de départ incluse, borne de fin exclue', () => {
  const b = boost({ startsAtMs: NOW, endsAtMs: NOW + HOUR_MS });
  assertEquals(crewBoostActive(b, NOW), true, 'starts_at inclus');
  assertEquals(crewBoostActive(b, NOW + HOUR_MS), false, 'ends_at exclu');
  assertEquals(crewBoostActive(b, NOW - 1), false, 'avant la fenêtre');
});

Deno.test('crewBoostActive : un boost enchaîné (fenêtre future) est SANS effet', () => {
  const queued = boost({ startsAtMs: NOW + HOUR_MS, endsAtMs: NOW + 25 * HOUR_MS });
  assertEquals(crewBoostActive(queued, NOW), false);
});

Deno.test('crewBoostActive : expired/cancelled jamais actifs, même dans la fenêtre', () => {
  assertEquals(crewBoostActive(boost({ status: 'expired' }), NOW), false);
  assertEquals(crewBoostActive(boost({ status: 'cancelled' }), NOW), false);
});

// ─── boostChestMultiplier : cap, non-cumul, blackout ─────────────────────────

Deno.test('boostChestMultiplier : sans boost → 1', () => {
  assertEquals(boostChestMultiplier([], NOW, null), 1);
});

Deno.test('boostChestMultiplier : boost actif → CREW_BOOST_CHEST_MULTIPLIER', () => {
  assertEquals(boostChestMultiplier([boost()], NOW, null), CREW_BOOST_CHEST_MULTIPLIER);
});

Deno.test('boostChestMultiplier : PAS DE CUMUL — deux boosts actifs = max, jamais somme/produit', () => {
  const m = boostChestMultiplier([boost(), boost()], NOW, null);
  assertEquals(m, CREW_BOOST_CHEST_MULTIPLIER);
  // Garde-fou : la règle « 1 boost actif » est bien une constante gelée.
  assertEquals(CREW_BOOST_MAX_ACTIVE, 1);
});

Deno.test('boostChestMultiplier : multiplicateur anormal en base → borné à la constante', () => {
  const rogue = boost({ multiplier: 3 });
  assertEquals(boostChestMultiplier([rogue], NOW, null), CREW_BOOST_CHEST_MULTIPLIER);
});

Deno.test('boostChestMultiplier : multiplicateur < 1 en base → jamais sous 1', () => {
  const weird = boost({ multiplier: 0.5 });
  assertEquals(boostChestMultiplier([weird], NOW, null), 1);
});

Deno.test('boostChestMultiplier : blackout — les 48 dernières h de saison annulent tout effet', () => {
  const seasonEnd = NOW + BOOST_BLACKOUT_END_OF_SEASON_H * HOUR_MS; // pile à la borne
  assertEquals(boostChestMultiplier([boost()], NOW, seasonEnd), 1, 'borne du blackout incluse');
  const seasonEndLater = NOW + (BOOST_BLACKOUT_END_OF_SEASON_H + 1) * HOUR_MS;
  assertEquals(
    boostChestMultiplier([boost()], NOW, seasonEndLater),
    CREW_BOOST_CHEST_MULTIPLIER,
    'hors blackout : effet normal',
  );
});

Deno.test('boostChestMultiplier : saison déjà finie → 1 (le blackout couvre aussi l’après)', () => {
  assertEquals(boostChestMultiplier([boost()], NOW, NOW - HOUR_MS), 1);
});

// ─── boostedChestProgress : coffre uniquement, floor, jamais négatif ─────────

Deno.test('boostedChestProgress : sans boost, delta inchangé', () => {
  assertEquals(boostedChestProgress(100, [], NOW, null), 100);
});

Deno.test('boostedChestProgress : +25 % arrondi bas', () => {
  assertEquals(boostedChestProgress(100, [boost()], NOW, null), 125);
  assertEquals(boostedChestProgress(10, [boost()], NOW, null), 12); // 12.5 → floor
  assertEquals(boostedChestProgress(1, [boost()], NOW, null), 1); // 1.25 → floor
});

Deno.test('boostedChestProgress : delta négatif → 0 (le coffre ne recule jamais)', () => {
  assertEquals(boostedChestProgress(-50, [boost()], NOW, null), 0);
});

Deno.test('boostedChestProgress : en blackout, delta de base sans bonus', () => {
  const seasonEnd = NOW + HOUR_MS; // à 1 h de la fin de saison
  assertEquals(boostedChestProgress(100, [boost()], NOW, seasonEnd), 100);
});

// ─── Chemin appelant ingest_run (processCrew) : la composition exacte ────────
// MIROIR de la ligne serveur `boostedChestProgress(chestProgressDelta(input),
// boosts, now, seasonEnd)` — garde-fou contre une régression qui recâblerait le
// delta BRUT (bug d'origine : le boost payant restait inerte côté serveur).

Deno.test('processCrew (composition) : boost actif → +25 % sur le delta de coffre pondéré', () => {
  // Un lot de contribution : 10 hexes capturés + course vérifiée.
  const chestInput = { hexCaptured: 10, verifiedRun: 1 };
  const base = chestProgressDelta(chestInput);
  // Sanity : le delta pondéré est bien > 0 (sinon le coffre n'avance jamais).
  assertEquals(base, 10 * CREW_CHEST_WEIGHTS.hexCaptured + CREW_CHEST_WEIGHTS.verifiedRun);
  assertEquals(base > 0, true);
  // Sans boost : le serveur écrit le delta brut.
  assertEquals(boostedChestProgress(base, [], NOW, null), base);
  // Avec boost actif : le serveur écrit le delta boosté (floor(base × mult)).
  const boosted = boostedChestProgress(base, [boost()], NOW, null);
  assertEquals(boosted, Math.floor(base * CREW_BOOST_CHEST_MULTIPLIER));
  assertEquals(boosted > base, true, 'le boost payant accélère RÉELLEMENT le coffre');
});

Deno.test('processCrew (composition) : blackout de fin de saison → coffre au delta brut', () => {
  const chestInput = { hexCaptured: 10, verifiedRun: 1 };
  const base = chestProgressDelta(chestInput);
  const seasonEnd = NOW + HOUR_MS; // dans les 48 dernières heures
  assertEquals(boostedChestProgress(base, [boost()], NOW, seasonEnd), base);
});
