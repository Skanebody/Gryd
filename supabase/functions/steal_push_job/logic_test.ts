/**
 * Tests des règles de drain de `steal_push_queue` (VOL SUBI).
 *
 * ═══ CE QUI A CHANGÉ, ET POURQUOI CES TESTS ONT ÉTÉ RÉÉCRITS ════════════════
 * La version précédente testait `selectConsumedIds(rows, plan, pushedUserIds)`,
 * dont un test affirmait : « envoi PRÉVU mais transport échoué : rien consommé
 * — le prochain drain réessaie ». C'était la sémantique « AU MOINS une fois »,
 * et elle était le défaut lui-même : un échec de transport rendait le lot au
 * drain suivant, toutes les 5 min, pendant 24 h — un mécanisme anti-spam qui
 * spammait. Ces tests verrouillaient donc le bug.
 *
 * La règle est maintenant « AU PLUS une fois » : la consommation précède
 * l'envoi. Un test ne peut plus exiger un renvoi ; il exige l'inverse.
 *
 * ═══ CE QUE CES TESTS PROTÈGENT ═════════════════════════════════════════════
 *   · une perte sous le seuil ne DISPARAÎT pas — elle est reportée, et son
 *     report l'endort jusqu'à péremption au lieu de saturer le lot (FAMINE) ;
 *   · un joueur en quiet hours / cooldown / plafond est prévenu PLUS TARD,
 *     jamais oublié, et sa ligne cesse d'occuper une place entre-temps ;
 *   · un joueur sans appareil ou canal coupé ne fait pas boucler le drain ;
 *   · un push PRÉVU consomme sa ligne AVANT l'envoi — aucune erreur en aval ne
 *     peut provoquer un renvoi ;
 *   · `okTokens: []` après une panne réseau ne se confond pas avec un refus ;
 *   · un vol trop vieux ne ressurgit pas 24 h après.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  STEAL_PUSH_COOLDOWN_MINUTES,
  STEAL_QUEUE_DEFER_MINUTES,
  STEAL_QUEUE_MAX_AGE_HOURS,
} from '../_shared/game-rules.ts';
import type { PushMessage, PushPlan, SuppressReason } from '../_shared/push.ts';
import {
  classifyDelivery,
  deliveredUserIds,
  deliveryTally,
  isTimingSuppression,
  nextAttemptAt,
  partitionStealQueue,
  planDrainOutcome,
  type StealQueueRow,
} from './logic.ts';

const NOW = new Date('2026-07-21T12:00:00Z');
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

function row(id: number, victim: string, agoHours = 0): StealQueueRow {
  return {
    id,
    victimUserId: victim,
    thiefUserId: `thief-${id}`,
    hexId: `8a1fb46622d7ff${id}`,
    stolenAt: new Date(NOW.getTime() - agoHours * MS_PER_HOUR),
  };
}

const msg = (to: string): PushMessage => ({
  to,
  title: 't',
  body: 'b',
  data: {},
  priority: 'default',
});

const plan = (
  sends: (string | [string, string[]])[],
  suppressed: [string, SuppressReason][] = [],
): PushPlan => ({
  sends: sends.map((s) =>
    typeof s === 'string'
      ? { userId: s, messages: [] }
      : { userId: s[0], messages: s[1].map(msg) }
  ),
  suppressed: suppressed.map(([userId, reason]) => ({ userId, reason })),
});

/** Ids consommés, triés — l'ordre d'itération n'est pas une garantie. */
const consumedIds = (d: { consumed: { id: number }[] }) =>
  d.consumed.map((c) => c.id).sort((a, b) => a - b);
const deferredIds = (d: { deferred: { id: number }[] }) =>
  d.deferred.map((c) => c.id).sort((a, b) => a - b);
const outcomeOf = (d: { consumed: { id: number; outcome: string }[] }, id: number) =>
  d.consumed.find((c) => c.id === id)?.outcome;

const NO_PUSHES = new Map<string, Date>();

// ─── Péremption ──────────────────────────────────────────────────────────────

Deno.test('partitionStealQueue — un vol récent reste annonçable', () => {
  const { fresh, stale } = partitionStealQueue([row(1, 'v', 3)], NOW);
  assertEquals(fresh.length, 1);
  assertEquals(stale, []);
});

Deno.test('partitionStealQueue — au-delà de la fenêtre, le vol est périmé', () => {
  const { fresh, stale } = partitionStealQueue(
    [row(1, 'v', STEAL_QUEUE_MAX_AGE_HOURS + 1)],
    NOW,
  );
  assertEquals(fresh, []);
  assertEquals(stale.map((r) => r.id), [1]);
});

Deno.test('partitionStealQueue — la borne exacte est encore annonçable', () => {
  const { fresh, stale } = partitionStealQueue(
    [row(1, 'v', STEAL_QUEUE_MAX_AGE_HOURS)],
    NOW,
  );
  assertEquals(fresh.length, 1);
  assertEquals(stale, []);
});

Deno.test('partitionStealQueue — une date future ne périme jamais (horloge incohérente)', () => {
  const { fresh, stale } = partitionStealQueue([row(1, 'v', -48)], NOW);
  assertEquals(fresh.length, 1);
  assertEquals(stale, []);
});

Deno.test('partitionStealQueue — file vide : rien à faire', () => {
  const { fresh, stale } = partitionStealQueue([], NOW);
  assertEquals(fresh, []);
  assertEquals(stale, []);
});

// ─── Momentané vs définitif ──────────────────────────────────────────────────

Deno.test('isTimingSuppression — le MOMENT reporte, le DESTINATAIRE consomme', () => {
  for (const r of ['below_threshold', 'too_soon', 'quiet_hours', 'daily_cap'] as const) {
    assert(isTimingSuppression(r), `${r} devrait reporter l'événement`);
  }
  for (const r of ['no_device', 'channel_off'] as const) {
    assert(!isTimingSuppression(r), `${r} devrait consommer l'événement`);
  }
});

// ─── Consommation : AVANT l'envoi, jamais conditionnée à sa réussite ─────────

Deno.test('planDrainOutcome — push PRÉVU : consommé « pushed » AVANT tout envoi', () => {
  // Le cœur du correctif. La fonction ne reçoit AUCUNE information de livraison
  // — elle ne peut structurellement pas conditionner la consommation au succès.
  const d = planDrainOutcome([row(1, 'v'), row(2, 'v')], plan(['v']), NO_PUSHES, NOW);
  assertEquals(consumedIds(d), [1, 2]);
  assertEquals(outcomeOf(d, 1), 'pushed');
  assertEquals(deferredIds(d), []);
});

Deno.test('planDrainOutcome — la signature ne peut PAS porter un résultat de livraison', () => {
  // Régression du défaut : deux appels identiques donnent le même sort, quel
  // que soit ce qui arrive ensuite chez Expo. Aucun renvoi n'est exprimable.
  const rows = [row(1, 'v')];
  const a = planDrainOutcome(rows, plan(['v']), NO_PUSHES, NOW);
  const b = planDrainOutcome(rows, plan(['v']), NO_PUSHES, NOW);
  assertEquals(consumedIds(a), consumedIds(b));
  assertEquals(outcomeOf(a, 1), outcomeOf(b, 1));
});

Deno.test('planDrainOutcome — aucun appareil : consommé « undeliverable »', () => {
  const d = planDrainOutcome([row(1, 'v')], plan([], [['v', 'no_device']]), NO_PUSHES, NOW);
  assertEquals(consumedIds(d), [1]);
  assertEquals(outcomeOf(d, 1), 'undeliverable');
});

Deno.test('planDrainOutcome — canal competition coupé : consommé « undeliverable »', () => {
  const d = planDrainOutcome([row(1, 'v')], plan([], [['v', 'channel_off']]), NO_PUSHES, NOW);
  assertEquals(consumedIds(d), [1]);
  assertEquals(outcomeOf(d, 1), 'undeliverable');
});

Deno.test('planDrainOutcome — victime absente du plan (événement invalide) : consommé', () => {
  // aggregateStealEvents écarte le vol de soi-même : sans cette branche, la
  // ligne serait relue toutes les 5 minutes pendant 24 h pour rien.
  const d = planDrainOutcome([row(1, 'moi')], plan([]), NO_PUSHES, NOW);
  assertEquals(consumedIds(d), [1]);
  assertEquals(outcomeOf(d, 1), 'invalid');
});

Deno.test('planDrainOutcome — file vide : aucune décision', () => {
  const d = planDrainOutcome([], plan(['v']), NO_PUSHES, NOW);
  assertEquals(d.consumed, []);
  assertEquals(d.deferred, []);
});

// ─── Report : l'information est décalée, jamais détruite ────────────────────

Deno.test('planDrainOutcome — sous le seuil : reporté, la perte s’accumule', () => {
  const d = planDrainOutcome(
    [row(1, 'v'), row(2, 'v')],
    plan([], [['v', 'below_threshold']]),
    NO_PUSHES,
    NOW,
  );
  assertEquals(consumedIds(d), []);
  assertEquals(deferredIds(d), [1, 2]);
});

Deno.test('planDrainOutcome — quiet hours : prévenu au réveil, pas oublié', () => {
  const d = planDrainOutcome([row(1, 'v')], plan([], [['v', 'quiet_hours']]), NO_PUSHES, NOW);
  assertEquals(deferredIds(d), [1]);
});

Deno.test('planDrainOutcome — cooldown de vol : le prochain message portera le vrai total', () => {
  const d = planDrainOutcome([row(1, 'v')], plan([], [['v', 'too_soon']]), NO_PUSHES, NOW);
  assertEquals(deferredIds(d), [1]);
});

Deno.test('planDrainOutcome — plafond journalier : reporté, pas perdu', () => {
  const d = planDrainOutcome([row(1, 'v')], plan([], [['v', 'daily_cap']]), NO_PUSHES, NOW);
  assertEquals(deferredIds(d), [1]);
});

Deno.test('planDrainOutcome — victimes mêlées : chacune son sort, sans contamination', () => {
  const rows = [
    row(1, 'poussé'),
    row(2, 'poussé'),
    row(3, 'attend'), // below_threshold → reporté
    row(4, 'muet'), // channel_off → consommé
    row(5, 'inconnu'), // absent du plan → invalide
  ];
  const p = plan(['poussé'], [
    ['attend', 'below_threshold'],
    ['muet', 'channel_off'],
  ]);
  const d = planDrainOutcome(rows, p, NO_PUSHES, NOW);
  assertEquals(consumedIds(d), [1, 2, 4, 5]);
  assertEquals(deferredIds(d), [3]);
  assertEquals(outcomeOf(d, 4), 'undeliverable');
  assertEquals(outcomeOf(d, 5), 'invalid');
});

// ─── FAMINE : un report doit VRAIMENT libérer la place ──────────────────────

Deno.test('nextAttemptAt — sous le seuil : endormi jusqu’à SA péremption, pas 15 min', () => {
  // Le cas dominant en volume. Une perte sous le seuil ne devient annonçable
  // que si d'AUTRES vols s'ajoutent — jamais par le temps qui passe. La relire
  // toutes les 15 min, c'est 96 places prises dans le lot pour rien : c'est
  // exactement la famine qui empêchait les vols RÉCENTS d'être lus.
  const r = row(1, 'v', 2); // volé il y a 2 h
  const at = nextAttemptAt('below_threshold', r, undefined, NOW);
  assertEquals(at.getTime(), r.stolenAt.getTime() + STEAL_QUEUE_MAX_AGE_HOURS * MS_PER_HOUR);
  assert(at.getTime() > NOW.getTime() + STEAL_QUEUE_DEFER_MINUTES * MS_PER_MINUTE);
});

Deno.test('nextAttemptAt — cooldown : date EXACTE de fin, pas un forfait', () => {
  const last = new Date(NOW.getTime() - 60 * MS_PER_MINUTE); // il y a 1 h
  const at = nextAttemptAt('too_soon', row(1, 'v'), last, NOW);
  assertEquals(at.getTime(), last.getTime() + STEAL_PUSH_COOLDOWN_MINUTES * MS_PER_MINUTE);
  assert(at.getTime() > NOW.getTime(), 'la fin du cooldown est dans le futur');
});

Deno.test('nextAttemptAt — cooldown sans dernier push connu : forfait, pas de date fabriquée', () => {
  const at = nextAttemptAt('too_soon', row(1, 'v'), undefined, NOW);
  assertEquals(at.getTime(), NOW.getTime() + STEAL_QUEUE_DEFER_MINUTES * MS_PER_MINUTE);
});

Deno.test('nextAttemptAt — cooldown déjà expiré (horloge incohérente) : jamais dans le passé', () => {
  // Une date passée rendrait la ligne due immédiatement → relecture en boucle
  // au drain suivant, soit la famine reconstituée par une horloge de travers.
  const ancient = new Date(NOW.getTime() - 10 * STEAL_PUSH_COOLDOWN_MINUTES * MS_PER_MINUTE);
  const at = nextAttemptAt('too_soon', row(1, 'v'), ancient, NOW);
  assert(at.getTime() > NOW.getTime(), 'la prochaine tentative doit être future');
  assertEquals(at.getTime(), NOW.getTime() + STEAL_QUEUE_DEFER_MINUTES * MS_PER_MINUTE);
});

Deno.test('nextAttemptAt — quiet hours / plafond : report forfaitaire borné', () => {
  for (const reason of ['quiet_hours', 'daily_cap'] as const) {
    const at = nextAttemptAt(reason, row(1, 'v'), undefined, NOW);
    assertEquals(at.getTime(), NOW.getTime() + STEAL_QUEUE_DEFER_MINUTES * MS_PER_MINUTE);
  }
});

Deno.test('planDrainOutcome — le report porte une date FUTURE, sinon il ne reporte rien', () => {
  // Un report sans date (ou daté dans le passé) laisse la ligne due au drain
  // suivant : elle réoccupe sa place et affame les vols récents.
  const rows = [row(1, 'a'), row(2, 'b'), row(3, 'c'), row(4, 'd')];
  const p = plan([], [
    ['a', 'below_threshold'],
    ['b', 'too_soon'],
    ['c', 'quiet_hours'],
    ['d', 'daily_cap'],
  ]);
  const d = planDrainOutcome(rows, p, NO_PUSHES, NOW);
  assertEquals(d.deferred.length, 4);
  for (const item of d.deferred) {
    assert(
      item.nextAttemptAt.getTime() > NOW.getTime(),
      `la ligne ${item.id} redeviendrait due immédiatement`,
    );
  }
});

Deno.test('planDrainOutcome — le cooldown connu date le report à la fin exacte', () => {
  const last = new Date(NOW.getTime() - 30 * MS_PER_MINUTE);
  const d = planDrainOutcome(
    [row(1, 'v')],
    plan([], [['v', 'too_soon']]),
    new Map([['v', last]]),
    NOW,
  );
  assertEquals(
    d.deferred[0].nextAttemptAt.getTime(),
    last.getTime() + STEAL_PUSH_COOLDOWN_MINUTES * MS_PER_MINUTE,
  );
});

// ─── Transport : « je ne sais pas » n'est pas « refusé » ────────────────────

Deno.test('classifyDelivery — token accepté : delivered', () => {
  const p = plan([['v', ['tok-a']]]);
  const byUser = classifyDelivery(p, new Set(['tok-a']), false);
  assertEquals(byUser.get('v'), 'delivered');
  assertEquals(deliveredUserIds(byUser), ['v']);
});

Deno.test('classifyDelivery — Expo a répondu et refusé : rejected (on SAIT)', () => {
  const p = plan([['v', ['tok-a']]]);
  const byUser = classifyDelivery(p, new Set(), false);
  assertEquals(byUser.get('v'), 'rejected');
  assertEquals(deliveredUserIds(byUser), []);
});

Deno.test('classifyDelivery — panne de transport : unknown, JAMAIS rejected', () => {
  // Le piège fermé : `okTokens: []` après une coupure réseau ne prouve pas que
  // rien n'est parti. Le confondre avec un refus, c'est affirmer un fait qu'on
  // n'a pas — et c'est ce qui rouvrait la boucle de renvoi.
  const p = plan([['v', ['tok-a']]]);
  const byUser = classifyDelivery(p, new Set(), true);
  assertEquals(byUser.get('v'), 'unknown');
  assertEquals(deliveredUserIds(byUser), [], 'un unknown n’entre jamais dans push_log');
});

Deno.test('classifyDelivery — un seul appareil accepté suffit à livrer le joueur', () => {
  const p = plan([['v', ['mort', 'vivant']]]);
  const byUser = classifyDelivery(p, new Set(['vivant']), false);
  assertEquals(byUser.get('v'), 'delivered');
});

Deno.test('classifyDelivery — panne partielle : l’accepté reste delivered, l’autre unknown', () => {
  const p = plan([['a', ['tok-a']], ['b', ['tok-b']]]);
  const byUser = classifyDelivery(p, new Set(['tok-a']), true);
  assertEquals(byUser.get('a'), 'delivered');
  assertEquals(byUser.get('b'), 'unknown');
  assertEquals(deliveredUserIds(byUser), ['a']);
});

Deno.test('deliveryTally — une panne Expo est VISIBLE, pas un drain calme', () => {
  const p = plan([['a', ['tok-a']], ['b', ['tok-b']], ['c', ['tok-c']]]);
  const tally = deliveryTally(classifyDelivery(p, new Set(['tok-a']), true));
  assertEquals(tally, { delivered: 1, rejected: 0, unknown: 2 });
});

Deno.test('deliveryTally — plan vide : tout à zéro', () => {
  assertEquals(deliveryTally(classifyDelivery(plan([]), new Set(), false)), {
    delivered: 0,
    rejected: 0,
    unknown: 0,
  });
});

// ─── Anti pay-to-win (§22, AMENDEMENT-45 C1) ─────────────────────────────────

Deno.test('aucune règle de drain ne dépend d’un statut payant', () => {
  // Deux joueurs, même perte, même instant, même plan : même sort. Rien dans
  // les signatures ne peut porter un abonnement, un pass ou un niveau.
  const gratuit = [row(1, 'a'), row(2, 'a')];
  const payant = [row(3, 'b'), row(4, 'b')];
  const p = plan(['a', 'b']);
  const da = planDrainOutcome(gratuit, p, NO_PUSHES, NOW);
  const db = planDrainOutcome(payant, p, NO_PUSHES, NOW);
  assertEquals(da.consumed.length, db.consumed.length);
  assertEquals(da.deferred.length, db.deferred.length);
  assertEquals(outcomeOf(da, 1), outcomeOf(db, 3));

  // Le report non plus : même motif, même délai, à l'identique.
  const ra = nextAttemptAt('quiet_hours', row(1, 'a'), undefined, NOW);
  const rb = nextAttemptAt('quiet_hours', row(3, 'b'), undefined, NOW);
  assertEquals(ra.getTime(), rb.getTime());

  const a = partitionStealQueue(gratuit, NOW);
  const b = partitionStealQueue(payant, NOW);
  assertEquals(a.fresh.length, b.fresh.length);
  assertEquals(a.stale.length, b.stale.length);
});

// ─── Ce que le périmé garde, et ce que la purge ne doit pas effacer ──────────

Deno.test('partitionStealQueue rend des LIGNES périmées, pas des ids — l’inbox en dépend', () => {
  // Un id seul ne permet ni de nommer la victime, ni de compter ses zones :
  // l'appelant ne pouvait alors QUE consommer, et la victime d'un vol périmé
  // n'apprenait jamais sa perte. Le périmé perd le PUSH, pas le RÉCIT.
  const { stale } = partitionStealQueue(
    [row(7, 'victime', STEAL_QUEUE_MAX_AGE_HOURS + 2)],
    NOW,
  );
  assertEquals(stale.length, 1);
  assertEquals(stale[0].victimUserId, 'victime');
  assert(stale[0].hexId.length > 0, 'le hex volé doit rester connu pour l’agrégat d’inbox');
  assert(stale[0].stolenAt instanceof Date, 'la date de l’événement date l’entrée d’inbox');
});

Deno.test('la rétention de la file couvre le cooldown de vol (0058)', () => {
  // Depuis 0058, l'horloge du cooldown EST `steal_push_queue.processed_at` des
  // lignes consommées `pushed` — et cette table est purgée à
  // STEAL_QUEUE_MAX_AGE_HOURS. Descendre la rétention sous le cooldown
  // effacerait la garde anti-renvoi en même temps que les lignes, sans qu'aucun
  // autre test ne s'en aperçoive.
  assert(
    STEAL_QUEUE_MAX_AGE_HOURS * 60 >= STEAL_PUSH_COOLDOWN_MINUTES,
    `rétention ${STEAL_QUEUE_MAX_AGE_HOURS} h < cooldown ${STEAL_PUSH_COOLDOWN_MINUTES} min : ` +
      `le cooldown de vol serait purgé avant d'avoir expiré`,
  );
});
