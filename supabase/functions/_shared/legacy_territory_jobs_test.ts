/**
 * GRYD — les trois crons du jeu territorial d'avant refusent de tourner.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────
 * Les deux premiers tests ne testent pas la garde, ils fixent ce qu'elle
 * empêche : `decay_job` lisait `hex_claims` (gelée pour toute activité 2026 par
 * le trigger de la migration 0118) et `steal_push_job` drainait sa file pour
 * pousser l'alarme de reprise que §14.2 interdit en toutes lettres. Sans ces
 * deux constats, un « ok » vert ne distinguerait pas une garde d'un no-op.
 *
 * ─── CE QUE LE TEST VÉRIFIE VRAIMENT ────────────────────────────────────────
 * La garde est une fonction pure — mais une fonction pure jamais appelée ne
 * protège rien. Le troisième test lit le SOURCE de chaque `index.ts` et vérifie
 * la POSITION de l'appel : avant la première I/O du handler. C'est la seule
 * chose qui distingue « désactivé » de « désactivé après avoir tout fait ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { NOTIFICATION_RULES_2026 } from './game-rules.ts';
import {
  decayJobDisabled,
  digestJobDisabled,
  stealPushJobDisabled,
} from './legacy_territory_jobs.ts';

const read = (path: string) => Deno.readTextFileSync(new URL(path, import.meta.url));

Deno.test('étape 0 — 0118 GÈLE bien la table que ces jobs lisent', () => {
  const m0118 = read('../../migrations/0118_refonte_2026_polygon_authority.sql');
  assert(m0118.includes('create trigger prevent_legacy_hex_capture_2026'));
  assert(m0118.includes("raise exception 'legacy_capture_forbidden_for_2026_activity'"));
  // …et c'est bien `hex_claims` que decay_job lit.
  assert(read('../decay_job/index.ts').includes(".from('hex_claims')"));
});

Deno.test('étape 0 — le cahier interdit les deux messages que ces jobs poussaient', () => {
  assertEquals(NOTIFICATION_RULES_2026.territoryDecayPush, false);
  assertEquals(NOTIFICATION_RULES_2026.immediateTerritoryLossPush, false);
});

Deno.test('les trois gardes disent NON, avec leur raison', () => {
  for (const [name, halted] of [
    ['decay_job', decayJobDisabled()],
    ['steal_push_job', stealPushJobDisabled()],
    ['digest_job', digestJobDisabled()],
  ] as const) {
    assert(halted !== null, `${name} devrait être désactivé`);
    assertEquals(halted.disabled, true);
    assertEquals(halted.frozenBy, '0118');
    assert(halted.reason.length > 0, `${name} doit dire POURQUOI`);
  }
  // Trois raisons DISTINCTES : trois motifs différents, trois messages de log
  // différents. Une raison partagée cacherait laquelle des règles s'applique.
  const reasons = [decayJobDisabled(), stealPushJobDisabled(), digestJobDisabled()]
    .map((h) => h?.reason);
  assertEquals(new Set(reasons).size, 3);
});

Deno.test('la garde est appelée AVANT la première I/O de chaque handler', () => {
  const cases: readonly { file: string; guard: string; firstIo: string }[] = [
    { file: '../decay_job/index.ts', guard: 'decayJobDisabled()', firstIo: "supabase\n      .from('hex_claims')" },
    { file: '../steal_push_job/index.ts', guard: 'stealPushJobDisabled()', firstIo: "supabase.rpc('claim_steal_push_batch'" },
    { file: '../digest_job/index.ts', guard: 'digestJobDisabled()', firstIo: 'await expireCrewBoosts(now)' },
  ];
  for (const c of cases) {
    const src = read(c.file);
    const guardAt = src.indexOf(`const halted = ${c.guard}`);
    const ioAt = src.indexOf(c.firstIo);
    assert(guardAt > 0, `${c.file} : la garde a disparu`);
    assert(ioAt > 0, `${c.file} : la première I/O attendue a changé — relire ce test`);
    assert(
      guardAt < ioAt,
      `${c.file} : la garde est posée APRÈS la première I/O — le job agirait quand même`,
    );
    // Et le retour est immédiat : une garde qui ne rend pas la main ne garde rien.
    assert(src.includes('if (halted) return json(halted, 200);'), `${c.file} : la garde ne rend pas la main`);
  }
});
