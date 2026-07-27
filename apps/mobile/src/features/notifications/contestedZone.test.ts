/**
 * GRYD — tests du moteur PUR E70 « Zone attaquée ».
 *
 * Chaque cas ci-dessous nomme une manière précise de MENTIR au joueur :
 *   · titrer « ta zone est contestée » à quelqu'un qui MÈNE l'attaque ;
 *   · peindre un compte à rebours sur une contestation déjà tranchée ;
 *   · afficher « 0 h 0 » (ou un rebours négatif) quand la fenêtre est close ;
 *   · rendre « NaN » sur une échéance illisible ;
 *   · afficher « 0 % de couverture » quand le recouvrement est illisible ;
 *   · confondre « je n'ai rien lu » avec « rien ne t'attaque ».
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  contestedZoneAnalyticsState,
  overlapPercent,
  remainingWindow,
  resolveContestedZone,
  type ContestRow,
  type ContestedTerritory,
  type ContestedZoneRead,
} from './contestedZone.ts';

const NOW = new Date('2026-07-27T12:00:00Z').getTime();
const H = 3_600_000;
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

function contest(over: Partial<ContestRow> = {}): ContestRow {
  return {
    id: 'contest-1',
    territory_id: 'terr-1',
    status: 'active',
    started_at: iso(NOW - 2 * H),
    expires_at: iso(NOW + 5 * H),
    overlap_ratio: 0.78,
    attacker_type: 'user',
    attacker_id: 'rival-1',
    ...over,
  };
}

function territory(over: Partial<ContestedTerritory> = {}): ContestedTerritory {
  return {
    id: 'terr-1',
    mineAsUser: true,
    areaM2: 412_000,
    rings: [
      [
        [2.35, 48.86],
        [2.36, 48.86],
        [2.36, 48.87],
        [2.35, 48.86],
      ],
    ],
    ...over,
  };
}

function loaded(
  c: ContestRow = contest(),
  t: ContestedTerritory | null = territory(),
  rivalName: string | null = null,
): ContestedZoneRead {
  return { kind: 'loaded', contest: c, territory: t, rivalName };
}

// ═══════════════════════════════════════════════════════════════════════════
// Le temps restant
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('remainingWindow décompose en heures + minutes entières', () => {
  assertEquals(remainingWindow(NOW + 5 * H + 42 * MIN, NOW), { hours: 5, minutes: 42 });
  assertEquals(remainingWindow(NOW + 59 * MIN, NOW), { hours: 0, minutes: 59 });
});

Deno.test('remainingWindow MINORE (troncature) : 2 h 55 ne devient jamais 3 h', () => {
  const r = remainingWindow(NOW + 2 * H + 55 * MIN + 59_000, NOW);
  assertEquals(r, { hours: 2, minutes: 55 });
});

Deno.test('remainingWindow ne rend JAMAIS zéro ni négatif — la fenêtre close est un null', () => {
  // Un `{h:0,m:0}` laisserait croire qu'il reste des secondes à courir.
  assertEquals(remainingWindow(NOW, NOW), null);
  assertEquals(remainingWindow(NOW - 1, NOW), null);
  assertEquals(remainingWindow(NOW - 10 * H, NOW), null);
});

Deno.test('remainingWindow refuse une date illisible plutôt que de rendre NaN', () => {
  assertEquals(remainingWindow(Number.NaN, NOW), null);
  assertEquals(remainingWindow(NOW + H, Number.NaN), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// Le recouvrement mesuré
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('overlapPercent rend un entier, bornes incluses', () => {
  assertEquals(overlapPercent(0.78), 78);
  assertEquals(overlapPercent(0), 0);
  assertEquals(overlapPercent(1), 100);
});

Deno.test('overlapPercent refuse l’illisible et le hors-bornes (jamais un 0 % faux)', () => {
  assertEquals(overlapPercent(null), null);
  assertEquals(overlapPercent(Number.NaN), null);
  assertEquals(overlapPercent(-0.1), null);
  assertEquals(overlapPercent(1.2), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// Les états d'absence — aucun n'est le repli d'un autre
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('les quatre états de lecture traversent tels quels, sans devenir « calme »', () => {
  for (const kind of ['loading', 'signed_out', 'failed', 'not_found'] as const) {
    assertEquals(resolveContestedZone({ kind }, NOW), { status: kind });
  }
});

Deno.test('une attaque que JE mène n’est jamais titrée « ta zone est contestée »', () => {
  // La policy 0078 m'ouvre les DEUX camps : sans ce test, l'assaillant verrait
  // une alerte de défense sur sa propre offensive.
  const view = resolveContestedZone(loaded(contest(), territory({ mineAsUser: false })), NOW);
  assertEquals(view.status, 'not_defender');
});

Deno.test('sans territoire lisible, rien ne prouve que je défends', () => {
  assertEquals(resolveContestedZone(loaded(contest(), null), NOW).status, 'not_defender');
});

// ═══════════════════════════════════════════════════════════════════════════
// Le statut et l'échéance
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('une contestation tranchée ne porte plus de rebours — elle porte son issue', () => {
  for (const s of ['defended', 'transferred', 'cancelled'] as const) {
    assertEquals(resolveContestedZone(loaded(contest({ status: s })), NOW), {
      status: 'closed',
      outcome: s,
    });
  }
});

Deno.test('un statut inconnu de cette version reste « closed », jamais « attaquée »', () => {
  // Une valeur ajoutée par une migration future ne doit pas réveiller l'alarme.
  assertEquals(resolveContestedZone(loaded(contest({ status: 'appealed' })), NOW), {
    status: 'closed',
    outcome: 'unknown',
  });
});

Deno.test('active mais échue = fenêtre fermée (le cron 0080 n’est pas encore passé)', () => {
  const view = resolveContestedZone(loaded(contest({ expires_at: iso(NOW - MIN) })), NOW);
  assertEquals(view.status, 'window_closed');
});

Deno.test('échéance illisible ⇒ fenêtre fermée, jamais un rebours NaN', () => {
  assertEquals(resolveContestedZone(loaded(contest({ expires_at: null })), NOW).status, 'window_closed');
  assertEquals(
    resolveContestedZone(loaded(contest({ expires_at: 'pas-une-date' })), NOW).status,
    'window_closed',
  );
});

Deno.test('le camp est testé AVANT le statut : l’assaillant ne lit pas l’issue en « closed »', () => {
  const view = resolveContestedZone(
    loaded(contest({ status: 'transferred' }), territory({ mineAsUser: false })),
    NOW,
  );
  assertEquals(view.status, 'not_defender');
});

// ═══════════════════════════════════════════════════════════════════════════
// Le seul état qui alarme
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('under_attack ne naît que de trois faits serveur simultanés', () => {
  const view = resolveContestedZone(loaded(contest(), territory(), 'NINA'), NOW);
  assertEquals(view.status, 'under_attack');
  if (view.status !== 'under_attack') return;
  assertEquals(view.facts.remaining, { hours: 5, minutes: 0 });
  assertEquals(view.facts.areaM2, 412_000);
  assertEquals(view.facts.overlapPercent, 78);
  assertEquals(view.facts.rivalName, 'NINA');
  assertEquals(view.facts.rings?.length, 1);
});

Deno.test('un rival non consentant reste ANONYME — aucun nom n’est fabriqué', () => {
  const view = resolveContestedZone(loaded(contest(), territory(), null), NOW);
  if (view.status !== 'under_attack') throw new Error('attendu under_attack');
  assertEquals(view.facts.rivalName, null);
});

Deno.test('une géométrie absente fait DISPARAÎTRE la carte, sans repli inventé', () => {
  const view = resolveContestedZone(loaded(contest(), territory({ rings: null })), NOW);
  if (view.status !== 'under_attack') throw new Error('attendu under_attack');
  assertEquals(view.facts.rings, null);
});

Deno.test('une surface absente reste absente — jamais un « 0 km² »', () => {
  const view = resolveContestedZone(loaded(contest(), territory({ areaM2: null })), NOW);
  if (view.status !== 'under_attack') throw new Error('attendu under_attack');
  assertEquals(view.facts.areaM2, null);
});

Deno.test('la bascule under_attack → window_closed est exacte À LA MILLISECONDE', () => {
  const expires = NOW + 3 * H;
  const row = loaded(contest({ expires_at: iso(expires) }));
  assertEquals(resolveContestedZone(row, expires - 1).status, 'under_attack');
  assertEquals(resolveContestedZone(row, expires).status, 'window_closed');
});

// ═══════════════════════════════════════════════════════════════════════════
// Analytics — on ne compte que ce qui a été rendu
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('zone_detail_viewed n’est armé QUE sur une zone réellement rendue contestée', () => {
  assertEquals(
    contestedZoneAnalyticsState(resolveContestedZone(loaded(), NOW)),
    'contested',
  );
  for (const kind of ['loading', 'signed_out', 'failed', 'not_found'] as const) {
    assertEquals(contestedZoneAnalyticsState(resolveContestedZone({ kind }, NOW)), null);
  }
  assertEquals(
    contestedZoneAnalyticsState(resolveContestedZone(loaded(contest({ status: 'defended' })), NOW)),
    null,
  );
  assertEquals(
    contestedZoneAnalyticsState(
      resolveContestedZone(loaded(contest({ expires_at: iso(NOW - MIN) })), NOW),
    ),
    null,
  );
});
