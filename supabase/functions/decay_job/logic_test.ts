/**
 * Tests decay_job/logic.ts — SPEC §3.3 (decay 21 j, notif J-3),
 * GRYD_notifications_logic.md §6 (grouping par joueur).
 * Purs : lignes construites en mémoire, aucun réseau.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { DECAY_WARNING_DAYS_BEFORE, DEFAULT_ACTIVITY } from '../_shared/game-rules.ts';
import {
  buildDecayWarningBody,
  type DecayHexRow,
  groupKeysByActivity,
  partitionDecay,
} from './logic.ts';

const NOW = new Date('2026-07-03T10:00:00Z');
const MS_D = 86_400_000;
const MS_MIN = 60_000;
const daysAhead = (d: number) => new Date(NOW.getTime() + d * MS_D);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * MS_D);

const ALICE = 'user-alice';
const BOB = 'user-bob';

function hex(id: string, over: Partial<DecayHexRow> = {}): DecayHexRow {
  return {
    id,
    activity: DEFAULT_ACTIVITY,
    ownerUserId: ALICE,
    decayAt: daysAhead(10),
    decayWarnedAt: null,
    ...over,
  };
}

// ─── Neutralisation (decay_at < now, strict — SPEC §6.3) ─────────────────────

Deno.test('decay échu → toNeutralize, pas de warning', () => {
  const r = partitionDecay([hex('h1', { decayAt: daysAgo(1) })], NOW);
  assertEquals(r.toNeutralize.map((h) => h.id), ['h1']);
  assertEquals(r.toWarn, []);
  assertEquals(r.warnings, []);
});

Deno.test('decay_at exactement = now → PAS neutralisé (strict), mais averti', () => {
  const r = partitionDecay([hex('h1', { decayAt: NOW })], NOW);
  assertEquals(r.toNeutralize, []);
  assertEquals(r.toWarn.map((h) => h.id), ['h1']); // dans la fenêtre J-3, échéance imminente
});

Deno.test('decay_at null (protection nouveau joueur §3.3) → exempt de tout', () => {
  const r = partitionDecay([hex('h1', { decayAt: null })], NOW);
  assertEquals(r.toNeutralize, []);
  assertEquals(r.toWarn, []);
});

Deno.test('hex déjà neutre (owner null) échu → neutralisé sans warning', () => {
  const r = partitionDecay(
    [hex('h1', { ownerUserId: null, decayAt: daysAgo(2) })],
    NOW,
  );
  assertEquals(r.toNeutralize.map((h) => h.id), ['h1']);
  assertEquals(r.warnings, []);
});

// ─── Fenêtre d'avertissement J-3 (bornes) ────────────────────────────────────

Deno.test('decay exactement à J-3 → averti (borne inclusive : contrat « notif à J-3 »)', () => {
  const r = partitionDecay(
    [hex('h1', { decayAt: daysAhead(DECAY_WARNING_DAYS_BEFORE) })],
    NOW,
  );
  assertEquals(r.toWarn.map((h) => h.id), ['h1']);
  assertEquals(r.warnings.length, 1);
});

Deno.test('decay à J-3 + 1 min → trop tôt, pas de warning', () => {
  const decayAt = new Date(NOW.getTime() + DECAY_WARNING_DAYS_BEFORE * MS_D + MS_MIN);
  const r = partitionDecay([hex('h1', { decayAt })], NOW);
  assertEquals(r.toWarn, []);
  assertEquals(r.toNeutralize, []);
});

Deno.test('déjà averti pour ce cycle → pas de re-warning', () => {
  const r = partitionDecay(
    [hex('h1', { decayAt: daysAhead(2), decayWarnedAt: daysAgo(1) })],
    NOW,
  );
  assertEquals(r.toWarn, []);
});

Deno.test('warning caduc (défense a repoussé decay_at depuis) → re-averti au nouveau cycle', () => {
  // Averti il y a 20 j, puis hex défendu (decay_at repoussé) : le vieux warning
  // est antérieur au début de la fenêtre courante (J-3) → il ne compte plus.
  const r = partitionDecay(
    [hex('h1', { decayAt: daysAhead(1), decayWarnedAt: daysAgo(20) })],
    NOW,
  );
  assertEquals(r.toWarn.map((h) => h.id), ['h1']);
});

// ─── Grouping par joueur (1 notif « ton quartier s'efface » par user) ────────

Deno.test('3 hexes menacés d’un même joueur → 1 seul warning groupé', () => {
  const r = partitionDecay(
    [
      hex('h1', { decayAt: daysAhead(2) }),
      hex('h2', { decayAt: daysAhead(1) }),
      hex('h3', { decayAt: daysAhead(3) }),
    ],
    NOW,
  );
  assertEquals(r.warnings.length, 1);
  assertEquals(r.warnings[0].userId, ALICE);
  assertEquals(r.warnings[0].perActivity, [
    { activity: 'run', hexCount: 3, earliestDecayAt: daysAhead(1) },
  ]);
  assertEquals(r.warnings[0].earliestDecayAt, daysAhead(1)); // échéance la plus proche
  assertEquals(r.warnings[0].hexKeys.map((k) => k.id).sort(), ['h1', 'h2', 'h3']);
});

// ─── E14 : la clé d'une ligne est (hexagone, discipline), plus l'hexagone seul ─

Deno.test('un même hexagone tenu à pied ET à vélo : DEUX comptes, jamais leur somme', () => {
  const r = partitionDecay(
    [
      hex('h1', { decayAt: daysAhead(2) }),
      hex('h1', { activity: 'bike', decayAt: daysAhead(2) }),
    ],
    NOW,
  );
  // Une seule notification (l'unité d'ENVOI est le JOUEUR) mais deux comptes :
  // 1 à pied, 1 à vélo. Le « 2 » d'avant additionnait deux mondes séparés et
  // comptait deux fois un hexagone que la carte n'affiche qu'une fois.
  assertEquals(r.warnings.length, 1);
  assertEquals(r.warnings[0].perActivity, [
    { activity: 'run', hexCount: 1, earliestDecayAt: daysAhead(2) },
    { activity: 'bike', hexCount: 1, earliestDecayAt: daysAhead(2) },
  ]);
  // Les DEUX lignes restent à marquer : chacune a son avertissement à porter.
  assertEquals(r.warnings[0].hexKeys, [
    { id: 'h1', activity: 'run' },
    { id: 'h1', activity: 'bike' },
  ]);
});

Deno.test('7 à pied + 5 à vélo → deux comptes ordonnés, aucun « 12 » nulle part', () => {
  const rows: DecayHexRow[] = [];
  for (let i = 0; i < 7; i++) rows.push(hex(`r${i}`, { decayAt: daysAhead(2) }));
  for (let i = 0; i < 5; i++) {
    rows.push(hex(`b${i}`, { activity: 'bike', decayAt: daysAhead(1) }));
  }
  const w = partitionDecay(rows, NOW).warnings[0];
  // Ordre stable = ordre de ACTIVITIES (course puis vélo), pas ordre de lecture.
  assertEquals(w.perActivity.map((p) => [p.activity, p.hexCount]), [['run', 7], ['bike', 5]]);
  // L'échéance de chaque monde est la sienne ; le global est le plus proche.
  assertEquals(w.perActivity[0].earliestDecayAt, daysAhead(2));
  assertEquals(w.perActivity[1].earliestDecayAt, daysAhead(1));
  assertEquals(w.earliestDecayAt, daysAhead(1));
  assertEquals(w.hexKeys.length, 12); // les 12 LIGNES restent à marquer
  const body = buildDecayWarningBody(w, NOW);
  assert(!/\b12\b/.test(body), `la somme des deux mondes ne doit apparaître nulle part : « ${body} »`);
  assert(body.includes('7 zones à pied'), body);
  assert(body.includes('5 à vélo'), body);
});

// ─── La copie : le monde est nommé, l'action est celle qui SAUVE ─────────────

Deno.test('copie course : le monde est nommé et le délai est CALCULÉ, pas écrit en dur', () => {
  const w = partitionDecay([hex('h1', { decayAt: daysAhead(1) })], NOW).warnings[0];
  const body = buildDecayWarningBody(w, NOW);
  assertEquals(body, '1 zone à pied redevient neutre dans 1 j. Une course dessus la garde.');
});

Deno.test('copie vélo : jamais « une course » pour une zone qui se défend à vélo', () => {
  const w = partitionDecay(
    [
      hex('h1', { activity: 'bike', decayAt: daysAhead(3) }),
      hex('h2', { activity: 'bike', decayAt: daysAhead(3) }),
    ],
    NOW,
  ).warnings[0];
  const body = buildDecayWarningBody(w, NOW);
  assertEquals(body, '2 zones à vélo redeviennent neutres dans 3 j. Une sortie vélo dessus les garde.');
  assert(!/course/i.test(body), 'prescrire une course ne sauverait PAS une zone vélo.');
});

Deno.test('copie deux mondes : « au plus tôt » — on n’affirme pas que tout part ensemble', () => {
  const w = partitionDecay(
    [
      hex('h1', { decayAt: daysAhead(3) }),
      hex('h2', { activity: 'bike', decayAt: daysAhead(1) }),
    ],
    NOW,
  ).warnings[0];
  assertEquals(
    buildDecayWarningBody(w, NOW),
    '1 zone à pied et 1 à vélo redeviennent neutres dans 1 j au plus tôt. ' +
      'Chaque monde se défend dans sa discipline.',
  );
});

Deno.test('groupKeysByActivity range les écritures par monde (une passe chacun)', () => {
  const grouped = groupKeysByActivity([
    { id: 'h1', activity: 'run' },
    { id: 'h1', activity: 'bike' },
    { id: 'h2', activity: 'run' },
  ]);
  assertEquals(grouped.get('run'), ['h1', 'h2']);
  assertEquals(grouped.get('bike'), ['h1']);
});

Deno.test('groupKeysByActivity n’invente pas de passe vide (pas d’appel réseau inutile)', () => {
  const grouped = groupKeysByActivity([{ id: 'h1', activity: 'run' }]);
  assertEquals([...grouped.keys()], ['run']);
  assertEquals(grouped.has('bike'), false);
});

Deno.test('groupKeysByActivity sans clé → aucune passe', () => {
  assertEquals(groupKeysByActivity([]).size, 0);
});

Deno.test('2 joueurs menacés → 2 warnings, un par joueur', () => {
  const r = partitionDecay(
    [
      hex('h1', { decayAt: daysAhead(2) }),
      hex('h2', { ownerUserId: BOB, decayAt: daysAhead(2) }),
    ],
    NOW,
  );
  assertEquals(r.warnings.length, 2);
  assertEquals(new Set(r.warnings.map((w) => w.userId)), new Set([ALICE, BOB]));
});

Deno.test('mix échu + menacé + lointain → chaque hex dans la bonne partition', () => {
  const r = partitionDecay(
    [
      hex('expired', { decayAt: daysAgo(1) }),
      hex('soon', { decayAt: daysAhead(2) }),
      hex('far', { decayAt: daysAhead(15) }),
    ],
    NOW,
  );
  assertEquals(r.toNeutralize.map((h) => h.id), ['expired']);
  assertEquals(r.toWarn.map((h) => h.id), ['soon']);
});
