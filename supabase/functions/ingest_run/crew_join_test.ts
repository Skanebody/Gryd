/**
 * Tests — crewJoin.ts : pré-vol UX des RPC crew (create / join / switch), moteur
 * PUR, aucune horloge implicite (`now` injecté), aucun réseau. Rejoue la MÊME
 * décision que les RPC serveur pour griser le bouton avant l'aller-retour.
 * Couvre chaque branche + les bornes du contrat (exactement 7 j, 49 vs 50
 * membres, left_at null, switch direct). Importe les copies _shared (re-sync par
 * le vérificateur).
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  CREW_MAX_MEMBERS,
  CREW_SWITCH_COOLDOWN_DAYS,
} from '../_shared/game-rules.ts';
import {
  crewCreateDecision,
  crewJoinDecision,
  type CrewCreateContext,
  type CrewJoinContext,
} from '../_shared/engine/crewJoin.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-20T12:00:00.000Z');
/** left_at situé `days` jours AVANT NOW (fraction admise). */
const leftDaysAgo = (days: number) => new Date(NOW.getTime() - days * MS_PER_DAY);

// ─── join / switch ───────────────────────────────────────────────────────────

Deno.test('crewJoin : sans crew ni cooldown, crew cible non pleine → ok', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: null,
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: true });
});

Deno.test('crewJoin : déjà membre actif du MÊME crew → already_member', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: 'crew-A',
    lastLeftAt: null,
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: false, reason: 'already_member' });
});

Deno.test('crewJoin : switch DIRECT depuis un autre crew, pas de left_at récent → ok', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: 'crew-A',
    lastLeftAt: null,
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-B'), { ok: true });
});

Deno.test('crewJoin : left_at récent (2 j) → cooldown, daysLeft = 5', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: leftDaysAgo(2),
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), {
    ok: false,
    reason: 'cooldown',
    daysLeft: CREW_SWITCH_COOLDOWN_DAYS - 2,
  });
});

Deno.test('crewJoin : cooldown bloque aussi un switch (autre crew) → cooldown', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: 'crew-A',
    lastLeftAt: leftDaysAgo(1),
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-B'), {
    ok: false,
    reason: 'cooldown',
    daysLeft: CREW_SWITCH_COOLDOWN_DAYS - 1,
  });
});

Deno.test('crewJoin : daysLeft arrondi au SUPÉRIEUR (6,5 j écoulés → 1 j restant)', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: leftDaysAgo(6.5),
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: false, reason: 'cooldown', daysLeft: 1 });
});

Deno.test('crewJoin : borne — EXACTEMENT 7 j écoulés → plus de cooldown → ok', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: leftDaysAgo(CREW_SWITCH_COOLDOWN_DAYS),
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: true });
});

Deno.test('crewJoin : borne — 6,999 j → encore cooldown (daysLeft = 1)', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: leftDaysAgo(CREW_SWITCH_COOLDOWN_DAYS - 0.001),
    targetMemberCount: 10,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: false, reason: 'cooldown', daysLeft: 1 });
});

Deno.test('crewJoin : borne membres — 49 → ok, 50 → full', () => {
  const base = { now: NOW, activeCrewId: null, lastLeftAt: null } as const;
  assertEquals(
    crewJoinDecision({ ...base, targetMemberCount: CREW_MAX_MEMBERS - 1 }, 'crew-A'),
    { ok: true },
  );
  assertEquals(
    crewJoinDecision({ ...base, targetMemberCount: CREW_MAX_MEMBERS }, 'crew-A'),
    { ok: false, reason: 'full' },
  );
});

Deno.test('crewJoin : au-delà du plafond (51) → full', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: null,
    targetMemberCount: CREW_MAX_MEMBERS + 1,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: false, reason: 'full' });
});

Deno.test('crewJoin : cooldown PRIME full (crew pleine + left_at récent) → cooldown', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: leftDaysAgo(3),
    targetMemberCount: CREW_MAX_MEMBERS,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), {
    ok: false,
    reason: 'cooldown',
    daysLeft: CREW_SWITCH_COOLDOWN_DAYS - 3,
  });
});

Deno.test('crewJoin : already_member PRIME tout (même crew + cooldown + plein)', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: 'crew-A',
    lastLeftAt: leftDaysAgo(1),
    targetMemberCount: CREW_MAX_MEMBERS,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: false, reason: 'already_member' });
});

// ─── create ──────────────────────────────────────────────────────────────────

Deno.test('crewCreate : sans crew ni cooldown → ok', () => {
  const ctx: CrewCreateContext = { now: NOW, activeCrewId: null, lastLeftAt: null };
  assertEquals(crewCreateDecision(ctx), { ok: true });
});

Deno.test('crewCreate : déjà membre actif → already_in_crew (quitter d\'abord)', () => {
  const ctx: CrewCreateContext = { now: NOW, activeCrewId: 'crew-A', lastLeftAt: null };
  assertEquals(crewCreateDecision(ctx), { ok: false, reason: 'already_in_crew' });
});

Deno.test('crewCreate : already_in_crew PRIME cooldown (membre actif + left_at récent)', () => {
  const ctx: CrewCreateContext = { now: NOW, activeCrewId: 'crew-A', lastLeftAt: leftDaysAgo(2) };
  assertEquals(crewCreateDecision(ctx), { ok: false, reason: 'already_in_crew' });
});

Deno.test('crewCreate : sans crew mais left_at récent (4 j) → cooldown, daysLeft = 3', () => {
  const ctx: CrewCreateContext = { now: NOW, activeCrewId: null, lastLeftAt: leftDaysAgo(4) };
  assertEquals(crewCreateDecision(ctx), {
    ok: false,
    reason: 'cooldown',
    daysLeft: CREW_SWITCH_COOLDOWN_DAYS - 4,
  });
});

Deno.test('crewCreate : borne — EXACTEMENT 7 j écoulés → ok', () => {
  const ctx: CrewCreateContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: leftDaysAgo(CREW_SWITCH_COOLDOWN_DAYS),
  };
  assertEquals(crewCreateDecision(ctx), { ok: true });
});

// ─── cooldown : entrées dégénérées (défensif) ────────────────────────────────

Deno.test('cooldown : left_at null → jamais de cooldown (join ok)', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: null,
    targetMemberCount: 0,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: true });
});

Deno.test('cooldown : left_at Invalid Date → 0 (pas de cooldown fantôme)', () => {
  const ctx: CrewJoinContext = {
    now: NOW,
    activeCrewId: null,
    lastLeftAt: new Date(NaN),
    targetMemberCount: 0,
  };
  assertEquals(crewJoinDecision(ctx, 'crew-A'), { ok: true });
});
