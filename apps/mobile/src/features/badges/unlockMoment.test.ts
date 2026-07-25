/**
 * GRYD — E19 : ce que le moment « BADGE RARE DÉBLOQUÉ » n'a PAS le droit de faire.
 *
 * Un écran bloquant qui se trompe coûte deux fois : il vole une seconde ET il
 * ment. Ces tests verrouillent, dans l'ordre de gravité :
 *   1. un badge COURANT n'obtient JAMAIS l'écran dédié (planche : carte au
 *      résultat de course, jamais un arrêt) ;
 *   2. une clé inconnue du catalogue ne produit AUCUN contenu (jamais un nom ni
 *      une condition inventés parce que le serveur a envoyé autre chose) ;
 *   3. la condition et la date viennent du badge RÉELLEMENT décerné, et une date
 *      absente reste absente (jamais « aujourd'hui » par défaut) ;
 *   4. un badge n'est jamais célébré DEUX FOIS, et la première lecture d'un
 *      compte ne rejoue pas l'historique ;
 *   5. plusieurs paliers d'une même famille tombés d'un coup = UN seul arrêt ;
 *   6. la séquence tient sous le plafond de 1,4 s et ses temps sont ordonnés ;
 *   7. « AJOUTER AU PROFIL » a trois issues explicites — dont « plein », qui ne
 *      doit jamais se confondre avec un succès.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { badgeById, isRareBadge } from './catalog.ts';
import {
  UNLOCK_BUDGET_MS,
  UNLOCK_LAST_STEP,
  UNLOCK_STEPS,
  addToFeatured,
  materialLine,
  selectUnlockMoments,
  unlockDelaysMs,
  unlockMomentContent,
  unlockReached,
  unlockStepAt,
  unlockTotalMs,
} from './unlockMoment.ts';

// ─── 1-3 · Ce que l'écran a le droit d'écrire ────────────────────────────────

Deno.test('badge COURANT (road/tempo) → aucun écran dédié', () => {
  assertEquals(unlockMomentContent('hex_hunter_1', '12 juin 2026'), null); // road
  assertEquals(unlockMomentContent('hex_hunter_2', '12 juin 2026'), null); // tempo
  assertEquals(unlockMomentContent('premiers_pas', '12 juin 2026'), null);
});

Deno.test('badge RARE (tier ≥ race) → écran dédié', () => {
  const c = unlockMomentContent('hex_hunter_3', '12 juin 2026');
  assert(c !== null);
  assertEquals(c.key, 'hex_hunter_3');
});

Deno.test('un SECRET est rare quel que soit son matériau (tempo inclus)', () => {
  const def = badgeById('secret_la_boucle');
  assert(def !== undefined);
  assertEquals(def.tier, 'tempo'); // matériau bas…
  assert(isRareBadge(def)); // …mais secret ⇒ rare
  assert(unlockMomentContent('secret_la_boucle', '3 juillet 2026') !== null);
});

Deno.test('clé inconnue du catalogue → aucun contenu (jamais un badge inventé)', () => {
  assertEquals(unlockMomentContent('badge_qui_nexiste_pas', '12 juin 2026'), null);
  assertEquals(unlockMomentContent('', '12 juin 2026'), null);
});

Deno.test('la condition affichée est celle du badge RÉELLEMENT décerné', () => {
  const c = unlockMomentContent('hex_hunter_3', '12 juin 2026');
  assert(c !== null);
  assertEquals(c.requirement, badgeById('hex_hunter_3')!.requirement);
  // …et elle est PROPRE à ce badge : deux badges rares ne partagent pas une
  // phrase générique du type « Tu as débloqué un badge rare ».
  const other = unlockMomentContent('saison_0', '12 juin 2026');
  assert(other !== null);
  assert(other.requirement !== c.requirement);
  assert(c.requirement.length > 0 && other.requirement.length > 0);
});

Deno.test('date absente ou vide → dateLabel null (jamais une date fabriquée)', () => {
  assertEquals(unlockMomentContent('hex_hunter_3', null)!.dateLabel, null);
  assertEquals(unlockMomentContent('hex_hunter_3', '   ')!.dateLabel, null);
  assertEquals(unlockMomentContent('hex_hunter_3', '12 juin 2026')!.dateLabel, '12 juin 2026');
});

Deno.test('ligne de rareté = matériau + position dans l’échelle (fait de catalogue)', () => {
  const m = materialLine(badgeById('hex_hunter_3')!);
  assertEquals(m, { tierLabel: 'Race', position: 3, total: 6 });
  assertEquals(materialLine(badgeById('hex_hunter_legend')!).position, 6);
});

// ─── 4-5 · Anti-double-célébration et absorption des paliers ─────────────────

Deno.test('première lecture d’un compte → rien de célébré, tout mémorisé', () => {
  const sel = selectUnlockMoments({
    unlocked: ['hex_hunter_legend', 'saison_0', 'premiers_pas'],
    known: [],
    baselineDone: false,
  });
  assertEquals(sel.celebrate, []);
  assertEquals(sel.remember.length, 3);
});

Deno.test('badge rare NOUVEAU après la base → un moment ; le courant est mémorisé', () => {
  const sel = selectUnlockMoments({
    unlocked: ['premiers_pas', 'hex_hunter_1', 'saison_0'],
    known: ['premiers_pas', 'hex_hunter_1'],
    baselineDone: true,
  });
  assertEquals(sel.celebrate, ['saison_0']);
  assertEquals(sel.remember, []);
});

Deno.test('badge courant nouveau → JAMAIS d’écran bloquant, mémorisé direct', () => {
  const sel = selectUnlockMoments({
    unlocked: ['hex_hunter_1', 'hex_hunter_2'],
    known: ['hex_hunter_1'],
    baselineDone: true,
  });
  assertEquals(sel.celebrate, []);
  assertEquals(sel.remember, ['hex_hunter_2']);
});

Deno.test('un badge déjà connu n’est jamais recélébré', () => {
  const sel = selectUnlockMoments({
    unlocked: ['saison_0'],
    known: ['saison_0'],
    baselineDone: true,
  });
  assertEquals(sel.celebrate, []);
  assertEquals(sel.remember, []);
});

Deno.test('clé inconnue du catalogue → jamais célébrée, mais mémorisée (pas de boucle)', () => {
  const sel = selectUnlockMoments({
    unlocked: ['badge_du_futur'],
    known: [],
    baselineDone: true,
  });
  assertEquals(sel.celebrate, []);
  assertEquals(sel.remember, ['badge_du_futur']);
});

Deno.test('paliers d’une MÊME famille tombés d’un coup → un seul arrêt, le plus haut', () => {
  const sel = selectUnlockMoments({
    unlocked: ['hex_hunter_3', 'hex_hunter_4', 'hex_hunter_5'],
    known: [],
    baselineDone: true,
  });
  assertEquals(sel.celebrate, ['hex_hunter_5']);
  // Les paliers absorbés ne disparaissent pas : ils entrent en mémoire.
  assertEquals(sel.remember.sort(), ['hex_hunter_3', 'hex_hunter_4']);
});

Deno.test('ordre déterministe : matériau décroissant, puis clé', () => {
  const sel = selectUnlockMoments({
    unlocked: ['saison_0', 'fondateur', 'hex_hunter_legend'],
    known: [],
    baselineDone: true,
  });
  // legend (6) > carbon (4) > race (3)
  assertEquals(sel.celebrate, ['hex_hunter_legend', 'fondateur', 'saison_0']);
});

// ─── 6 · La séquence de la planche ───────────────────────────────────────────

Deno.test('la séquence entière tient sous 1,4 s, même avec une base absurde', () => {
  for (const base of [1, 50, 225, 400, 10_000, Number.NaN, -3]) {
    assert(
      unlockTotalMs(base) < UNLOCK_BUDGET_MS,
      `base ${base} → ${unlockTotalMs(base)} ms`,
    );
  }
});

Deno.test('les temps sont dans l’ordre de la planche et strictement croissants', () => {
  const d = unlockDelaysMs(225);
  assertEquals(d.length, UNLOCK_STEPS.length);
  for (let i = 1; i < d.length; i += 1) assert(d[i]! > d[i - 1]!);
  assertEquals(UNLOCK_STEPS[0], 'badge');
  assertEquals(UNLOCK_STEPS[UNLOCK_LAST_STEP], 'actions');
});

Deno.test('le skip (dernier temps) montre TOUT — aucune info portée par la seule anim', () => {
  for (const step of UNLOCK_STEPS) assert(unlockReached(UNLOCK_LAST_STEP, step));
  // et à t=0 seul le badge est là
  assertEquals(unlockStepAt(0, 225), 0);
  assert(unlockReached(unlockStepAt(0, 225), 'badge'));
  assert(!unlockReached(unlockStepAt(0, 225), 'actions'));
});

Deno.test('à la fin du budget, tous les temps sont atteints', () => {
  assertEquals(unlockStepAt(UNLOCK_BUDGET_MS, 225), UNLOCK_LAST_STEP);
});

// ─── 7 · « AJOUTER AU PROFIL » agit vraiment ─────────────────────────────────

Deno.test('vitrine avec de la place → le badge est ajouté à la fin', () => {
  assertEquals(addToFeatured(['a'], 'saison_0', 3), {
    kind: 'added',
    next: ['a', 'saison_0'],
  });
});

Deno.test('badge déjà en vitrine → « déjà là », jamais un faux succès', () => {
  assertEquals(addToFeatured(['a', 'saison_0'], 'saison_0', 3), { kind: 'already' });
});

Deno.test('vitrine pleine → « plein » avec le cap, jamais un échec silencieux', () => {
  assertEquals(addToFeatured(['a', 'b', 'c'], 'saison_0', 3), { kind: 'full', max: 3 });
});

Deno.test('le cap n’est jamais dépassé, quel que soit l’état d’entrée', () => {
  const out = addToFeatured(['a', 'b'], 'saison_0', 3);
  assert(out.kind === 'added');
  assert(out.next.length <= 3);
});
