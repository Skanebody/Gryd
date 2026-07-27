import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CRASH_RECOVERY_MAX_AGE_MS,
  decideCrashRecoveryNavigation,
  type InterruptedRunSnapshot,
  shouldProposeCrashRecovery,
} from './crashRecovery.ts';

const NOW = 1_700_000_000_000;

function snapshot(overrides: Partial<InterruptedRunSnapshot> = {}): InterruptedRunSnapshot {
  return {
    runId: 'run-1',
    startedAt: NOW - 10 * 60 * 1000,
    fixTimestamps: [NOW - 10 * 60 * 1000, NOW - 5 * 60 * 1000, NOW - 60 * 1000],
    ...overrides,
  };
}

// ── Session récente : proposée ──────────────────────────────────────────────
Deno.test('shouldProposeCrashRecovery — session récente avec mouvement réel est proposée', () => {
  assertEquals(shouldProposeCrashRecovery(snapshot(), NOW), true);
});

Deno.test('shouldProposeCrashRecovery — silence juste sous le plafond est encore proposé', () => {
  const s = snapshot({
    startedAt: NOW - CRASH_RECOVERY_MAX_AGE_MS,
    fixTimestamps: [NOW - CRASH_RECOVERY_MAX_AGE_MS, NOW - CRASH_RECOVERY_MAX_AGE_MS + 1_000],
  });
  assertEquals(shouldProposeCrashRecovery(s, NOW), true);
});

// ── Session trop vieille : ignorée ──────────────────────────────────────────
Deno.test('shouldProposeCrashRecovery — session trop vieille (> 24h de silence) n’est pas proposée', () => {
  const oldStart = NOW - CRASH_RECOVERY_MAX_AGE_MS - 60 * 60 * 1000;
  const s = snapshot({
    startedAt: oldStart,
    fixTimestamps: [oldStart, oldStart + 60_000, oldStart + 120_000],
  });
  assertEquals(shouldProposeCrashRecovery(s, NOW), false);
});

Deno.test('shouldProposeCrashRecovery — plusieurs jours de silence ne resurgit jamais', () => {
  const oldStart = NOW - 5 * 24 * 60 * 60 * 1000;
  const s = snapshot({ startedAt: oldStart, fixTimestamps: [oldStart, oldStart + 1_000] });
  assertEquals(shouldProposeCrashRecovery(s, NOW), false);
});

// ── Session déjà envoyée : `runStore.clearActiveRun` retire la clé dès l'envoi
// réussi ou mis en file — côté appelant ça se traduit par `null` (rien à
// charger), jamais par un buffer marqué « envoyé ». C'est le cas `null` qui
// représente ce scénario ici.
Deno.test('shouldProposeCrashRecovery — session déjà envoyée (buffer absent = null) n’est pas proposée', () => {
  assertEquals(shouldProposeCrashRecovery(null, NOW), false);
});

// ── Session vide : ignorée ───────────────────────────────────────────────────
Deno.test('shouldProposeCrashRecovery — session vide (0 fix) est ignorée', () => {
  assertEquals(shouldProposeCrashRecovery(snapshot({ fixTimestamps: [] }), NOW), false);
});

Deno.test('shouldProposeCrashRecovery — session avec un seul point (GO annulé avant le 1er pas) est ignorée', () => {
  assertEquals(
    shouldProposeCrashRecovery(snapshot({ fixTimestamps: [NOW - 60_000] }), NOW),
    false,
  );
});

// ── Défensif : horloge dans le futur / valeurs non finies ───────────────────
Deno.test('shouldProposeCrashRecovery — horodatage dans le futur ne conclut rien (refusé)', () => {
  const s = snapshot({ startedAt: NOW + 60_000, fixTimestamps: [NOW + 60_000, NOW + 120_000] });
  assertEquals(shouldProposeCrashRecovery(s, NOW), false);
});

Deno.test('shouldProposeCrashRecovery — startedAt non fini est refusé sans crash', () => {
  assertEquals(shouldProposeCrashRecovery(snapshot({ startedAt: NaN }), NOW), false);
});

// ── Décision de navigation agrégée (ACTIVE + CURRENT, cf. runStore.ts) ──────
Deno.test('decideCrashRecoveryNavigation — un seul candidat valide suffit à déclencher la navigation', () => {
  const oldStart = NOW - 3 * 24 * 60 * 60 * 1000;
  const stale: InterruptedRunSnapshot = {
    runId: 'old',
    startedAt: oldStart,
    fixTimestamps: [oldStart, oldStart + 1_000],
  };
  const fresh = snapshot({ runId: 'fresh' });
  assertEquals(decideCrashRecoveryNavigation([stale, fresh], NOW), { shouldNavigate: true });
});

Deno.test('decideCrashRecoveryNavigation — aucun candidat valide ne déclenche rien', () => {
  assertEquals(decideCrashRecoveryNavigation([null, snapshot({ fixTimestamps: [] })], NOW), {
    shouldNavigate: false,
  });
});

Deno.test('decideCrashRecoveryNavigation — liste vide ne déclenche rien', () => {
  assertEquals(decideCrashRecoveryNavigation([], NOW), { shouldNavigate: false });
});
