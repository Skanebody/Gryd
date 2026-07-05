/**
 * Tests zone.ts — STATUTS DE ZONE + DECAY 14 j (AMENDEMENT-23 §D, doc §24/§25).
 * Dérivation du statut nommé + extension d'échéance par la défense. Purs.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  ZONE_DECAY_DAYS,
  ZONE_DEFEND_WINDOW_HOURS,
  ZONE_STABLE_MAX_DAYS,
} from '../_shared/game-rules.ts';
import { extendDecay, initialDecayAt, zoneStatus } from '../_shared/engine/zone.ts';

const NOW = new Date('2026-07-05T12:00:00Z');
const MS_H = 3_600_000;
const MS_D = 86_400_000;
const hAhead = (h: number) => new Date(NOW.getTime() + h * MS_H);
const hAgo = (h: number) => new Date(NOW.getTime() - h * MS_H);
const dAhead = (d: number) => new Date(NOW.getTime() + d * MS_D);
const dAgo = (d: number) => new Date(NOW.getTime() - d * MS_D);

// ─── initialDecayAt : now + 14 j ─────────────────────────────────────────────

Deno.test('initialDecayAt = now + ZONE_DECAY_DAYS (14 j)', () => {
  assertEquals(initialDecayAt(NOW).getTime(), NOW.getTime() + ZONE_DECAY_DAYS * MS_D);
  assertEquals(ZONE_DECAY_DAYS, 14);
});

// ─── zoneStatus : cycle stable/fragile/à défendre/decay ──────────────────────

Deno.test('zone fraîchement capturée (decay +14 j, défense à l’instant) → stable', () => {
  const s = zoneStatus({ now: NOW, decayAt: dAhead(14), lastDefendedAt: NOW });
  assertEquals(s, 'stable');
});

Deno.test('défense il y a < 7 j → stable ; entre 8 et 14 j → fragile', () => {
  assertEquals(
    zoneStatus({ now: NOW, decayAt: dAhead(8), lastDefendedAt: dAgo(6) }),
    'stable',
  );
  // Défendue il y a 10 j, decay encore à +4 j (donc > fenêtre 48 h) → fragile.
  assertEquals(
    zoneStatus({ now: NOW, decayAt: dAhead(4), lastDefendedAt: dAgo(10) }),
    'fragile',
  );
  assertEquals(ZONE_STABLE_MAX_DAYS, 7);
});

Deno.test('échéance de decay dans les 48 h → a_defendre (prioritaire sur stable/fragile)', () => {
  // Défendue récemment (2 j) MAIS decay dans 24 h → à défendre.
  const s = zoneStatus({ now: NOW, decayAt: hAhead(24), lastDefendedAt: dAgo(2) });
  assertEquals(s, 'a_defendre');
  assertEquals(ZONE_DEFEND_WINDOW_HOURS, 48);
});

Deno.test('échéance de decay dépassée → en_decay (prioritaire absolu)', () => {
  assertEquals(
    zoneStatus({ now: NOW, decayAt: hAgo(1), lastDefendedAt: dAgo(1) }),
    'en_decay',
  );
  // en_decay prime même sur un signal contesté/bouclier incohérent.
  assertEquals(
    zoneStatus({ now: NOW, decayAt: hAgo(1), lastDefendedAt: dAgo(1), contested: true }),
    'en_decay',
  );
});

Deno.test('decayAt null (nouveau joueur) → toujours stable (jamais de decay)', () => {
  assertEquals(zoneStatus({ now: NOW, decayAt: null, lastDefendedAt: dAgo(30) }), 'stable');
});

Deno.test('contestée (rival actif) prime sur stable/fragile mais pas sur en_decay', () => {
  assertEquals(
    zoneStatus({ now: NOW, decayAt: dAhead(10), lastDefendedAt: dAgo(1), contested: true }),
    'contestee',
  );
});

Deno.test('protégée (bouclier actif) prime sur le cycle temporel, sous contestée', () => {
  assertEquals(
    zoneStatus({ now: NOW, decayAt: dAhead(10), lastDefendedAt: dAgo(1), shieldedUntil: hAhead(40) }),
    'protegee',
  );
  // Bouclier expiré → retombe sur le cycle (stable ici).
  assertEquals(
    zoneStatus({ now: NOW, decayAt: dAhead(10), lastDefendedAt: dAgo(1), shieldedUntil: hAgo(1) }),
    'stable',
  );
  // Contestée prime sur protégée (rival actif = priorité d'alerte).
  assertEquals(
    zoneStatus({
      now: NOW,
      decayAt: dAhead(10),
      lastDefendedAt: dAgo(1),
      shieldedUntil: hAhead(40),
      contested: true,
    }),
    'contestee',
  );
});

// ─── extendDecay : la défense ÉTEND, ne reset pas ────────────────────────────

Deno.test('extendDecay : repousse l’échéance existante de N heures (pas un reset)', () => {
  // Échéance actuelle à +5 j ; défense « longe » +48 h → +7 j.
  const current = dAhead(5);
  const next = extendDecay(NOW, current, 48);
  assertEquals(next.getTime(), current.getTime() + 48 * MS_H);
});

Deno.test('extendDecay : zone déjà en decay (échéance passée) repart de now + heures', () => {
  const current = hAgo(3); // échéance dépassée
  const next = extendDecay(NOW, current, 24);
  assertEquals(next.getTime(), NOW.getTime() + 24 * MS_H);
});

Deno.test('extendDecay : decayAt null → now + heures', () => {
  assertEquals(extendDecay(NOW, null, 72).getTime(), NOW.getTime() + 72 * MS_H);
});

Deno.test('extendDecay : plafonné à ZONE_DECAY_DAYS (une zone sur-défendue ne devient pas éternelle)', () => {
  // Échéance déjà à +13 j ; +72 h voudrait +16 j mais le plafond borne à +14 j.
  const current = dAhead(13);
  const next = extendDecay(NOW, current, 72); // +3 j → 16 j sans plafond
  assertEquals(next.getTime(), NOW.getTime() + ZONE_DECAY_DAYS * MS_D); // borné à 14 j
});

Deno.test('extendDecay : le plafond ne RACCOURCIT jamais une échéance déjà au-delà', () => {
  // Zone héritée à +20 j (ancien 21 j) : une petite défense ne doit pas la
  // ramener à 14 j. base = +20 j, +24 h = +21 j, plafond = max(14 j, 20 j) = 20 j
  // → l'échéance reste au moins à sa valeur base (jamais raccourcie).
  const current = dAhead(20);
  const next = extendDecay(NOW, current, 24);
  // base(20 j) ≤ next ≤ base (le gain est borné à ne pas dépasser base ici).
  assertEquals(next.getTime(), current.getTime());
});

Deno.test('extendDecay : capDays=0 désactive le plafond', () => {
  const current = dAhead(13);
  const next = extendDecay(NOW, current, 72, 0);
  assertEquals(next.getTime(), current.getTime() + 72 * MS_H); // +16 j, non borné
});

Deno.test('extendDecay 0 h (re-passage en cooldown) : n’avance pas une échéance future, rafraîchit une échéance passée', () => {
  // Cooldown-only (aucune défense fraîche → defenseHours=0) sur une zone encore
  // stable (+3 j) : l'échéance reste inchangée (jamais raccourcie, jamais avancée).
  const future = dAhead(3);
  assertEquals(extendDecay(NOW, future, 0).getTime(), future.getTime());
  // Même re-passage 0 h sur une zone déjà en decay (échéance passée) : rafraîchit
  // au moins à now (le re-parcours repousse le decay, comportement historique).
  const past = hAgo(24);
  assertEquals(extendDecay(NOW, past, 0).getTime(), NOW.getTime());
});
