/**
 * GRYD — tests du moteur PUR de la cloche du header carte.
 *
 * Ce qu'on verrouille, et pourquoi chaque cas est un mensonge possible :
 *   · zéro événement ⇒ AUCUNE cloche (ni grisée, ni badge « 0 ») ;
 *   · N événements actionnables ⇒ badge = N exactement — pas d'arrondi, pas de
 *     « 9+ » inventé ; le seul plafond est DOCUMENTÉ (`BELL_BADGE_MAX`) et ne
 *     touche que le TEXTE, jamais le compte annoncé à l'accessibilité ;
 *   · une lecture en ÉCHEC (ou en vol, ou hors session) ne produit JAMAIS de
 *     compte : elle ne produit pas de cloche du tout ;
 *   · une URGENCE (zone à défendre) pèse plus qu'un événement de confort (badge
 *     débloqué) : elle seule compte, et elle passe en tête du flux ;
 *   · une fenêtre de défense expirée sort d'elle-même du compte.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { BELL_BADGE_MAX, bellState, nextExpiryMs } from './bell.ts';
import { buildActivityFeed, type ActivityEvent } from './activityFeed.ts';

const NOW = new Date('2026-07-27T12:00:00Z').getTime();
const H = 3600 * 1000;

/** Une contestation à défendre : actionnable + une échéance. */
function defend(id: string, expiresInH: number): ActivityEvent {
  return {
    id,
    group: 'defend',
    createdAtMs: NOW - 2 * H,
    actionable: true,
    expiresAtMs: NOW + expiresInH * H,
  };
}

/** Un badge débloqué : du confort, jamais une urgence. */
function badge(id: string, agoH = 1): ActivityEvent {
  return { id, group: 'progression', createdAtMs: NOW - agoH * H, actionable: false };
}

Deno.test('zero evenement => la cloche N EXISTE PAS (pas de badge « 0 »)', () => {
  assertEquals(bellState({ status: 'ready', events: [], nowMs: NOW }), {
    kind: 'absent',
    reason: 'nothing-actionable',
  });
});

Deno.test('lu, mais QUE du confort => toujours aucune cloche', () => {
  // Trois badges débloqués : rien à décider, donc rien à alerter.
  const state = bellState({
    status: 'ready',
    events: [badge('a'), badge('b'), badge('c')],
    nowMs: NOW,
  });
  assertEquals(state, { kind: 'absent', reason: 'nothing-actionable' });
});

Deno.test('N contestations reelles => badge = N, exactement', () => {
  for (const n of [1, 2, 3, 7, 12]) {
    const events = Array.from({ length: n }, (_, i) => defend(`c${i}`, 6));
    const state = bellState({ status: 'ready', events, nowMs: NOW });
    assertEquals(state.kind, 'visible');
    if (state.kind !== 'visible') return;
    assertEquals(state.count, n);
    // Aucun « 9+ » inventé sous le plafond : le texte EST le nombre.
    assertEquals(state.badgeLabel, String(n));
  }
});

Deno.test('le confort ne gonfle jamais le compte', () => {
  const state = bellState({
    status: 'ready',
    events: [defend('c1', 5), badge('b1'), badge('b2'), badge('b3')],
    nowMs: NOW,
  });
  assertEquals(state.kind, 'visible');
  if (state.kind !== 'visible') return;
  assertEquals(state.count, 1); // 1 urgence, pas 4 lignes
});

Deno.test('plafond DOCUMENTE : le texte minore, le compte reste exact', () => {
  const atMax = Array.from({ length: BELL_BADGE_MAX }, (_, i) => defend(`c${i}`, 6));
  const s1 = bellState({ status: 'ready', events: atMax, nowMs: NOW });
  assertEquals(s1.kind, 'visible');
  if (s1.kind !== 'visible') return;
  assertEquals(s1.badgeLabel, String(BELL_BADGE_MAX)); // pile au plafond : pas de « + »

  const overMax = [...atMax, defend('c-extra', 6)];
  const s2 = bellState({ status: 'ready', events: overMax, nowMs: NOW });
  assertEquals(s2.kind, 'visible');
  if (s2.kind !== 'visible') return;
  // Le TEXTE minore explicitement…
  assertEquals(s2.badgeLabel, `${BELL_BADGE_MAX}+`);
  // …mais le compte annoncé à l'a11y reste le vrai.
  assertEquals(s2.count, BELL_BADGE_MAX + 1);
});

Deno.test('une lecture qui n a PAS abouti ne produit jamais de compte', () => {
  // Les événements passés ici sont volontairement peuplés : même avec une liste
  // non vide en mémoire, un statut non « ready » ne doit RIEN affirmer.
  const events = [defend('c1', 4), defend('c2', 9)];
  for (const status of ['failed', 'loading', 'signed-out'] as const) {
    assertEquals(bellState({ status, events, nowMs: NOW }), {
      kind: 'absent',
      reason: 'not-read',
    });
  }
});

Deno.test('une fenetre de defense EXPIREE sort d elle-meme du compte', () => {
  const events = [defend('vivante', 3), defend('perimee', -1)];
  const state = bellState({ status: 'ready', events, nowMs: NOW });
  assertEquals(state.kind, 'visible');
  if (state.kind !== 'visible') return;
  assertEquals(state.count, 1);

  // Et quand la dernière expire, la cloche DISPARAÎT — elle ne reste pas à 0.
  assertEquals(bellState({ status: 'ready', events, nowMs: NOW + 4 * H }), {
    kind: 'absent',
    reason: 'nothing-actionable',
  });
});

Deno.test('une urgence pese plus qu un evenement de confort (ordre du flux)', () => {
  // Le badge est le PLUS RÉCENT, la contestation la plus ancienne : un tri
  // chronologique enterrerait la zone à défendre sous le badge.
  const feed = buildActivityFeed([badge('b', 0), defend('c', 8)], NOW);
  assertEquals(feed[0].group, 'defend');
  assertEquals(feed[1].group, 'progression');
});

Deno.test('nextExpiryMs : le prochain instant ou le compte peut changer', () => {
  const events = [defend('loin', 10), defend('proche', 2), badge('b')];
  assertEquals(nextExpiryMs(events, NOW), NOW + 2 * H);
  // Une échéance déjà atteinte n'est plus un réveil (sinon : boucle infinie).
  assertEquals(nextExpiryMs(events, NOW + 2 * H), NOW + 10 * H);
  assertEquals(nextExpiryMs(events, NOW + 99 * H), null);
  // Aucun événement à échéance ⇒ rien à réveiller.
  assertEquals(nextExpiryMs([badge('b')], NOW), null);
});
