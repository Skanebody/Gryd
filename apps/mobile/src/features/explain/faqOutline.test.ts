/**
 * GRYD — verrou du sommaire de la FAQ et de son état d'accordéon.
 *
 * POURQUOI CE TEST EXISTE. Les deux bugs visés sont INVISIBLES sur une capture
 * d'écran : une question qui ressuscite dépliée quand on rouvre son groupe, et
 * une question « Avancé » qui survit au passage en « Simple ». Ils ne se voient
 * que sur un parcours — donc ils se testent, ou ils reviennent.
 *
 * Deno, zéro réseau, zéro horloge : tout entre par l'input.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  ACCORDION_ALL_CLOSED,
  buildFaqOutline,
  resolveAccordion,
  toggleGroup,
  toggleItem,
} from './faqOutline.ts';

type Cat = 'zones' | 'defense' | 'crew';

/** Jeu minimal : une catégorie sans item avancé, une avec, une vide. */
const ITEMS = [
  { id: 'a', category: 'zones' as Cat },
  { id: 'b', category: 'zones' as Cat },
  { id: 'c', category: 'defense' as Cat, advanced: true },
  { id: 'd', category: 'defense' as Cat },
] as const;

const ORDER: readonly Cat[] = ['zones', 'defense', 'crew'];

Deno.test('mode Simple : les items avancés sont retirés, l’ordre demandé est tenu', () => {
  const groups = buildFaqOutline(ITEMS, ORDER, false);
  assertEquals(
    groups.map((g) => g.id),
    ['zones', 'defense'],
  );
  assertEquals(groups[0].items.map((i) => i.id), ['a', 'b']);
  // 'c' est advanced : il ne compte pas, et le compteur affiché suit.
  assertEquals(groups[1].items.map((i) => i.id), ['d']);
});

Deno.test('mode Avancé : les items techniques rejoignent leur groupe', () => {
  const groups = buildFaqOutline(ITEMS, ORDER, true);
  assertEquals(groups[1].items.map((i) => i.id), ['c', 'd']);
});

Deno.test('un groupe sans question visible DISPARAÎT (jamais un en-tête vide)', () => {
  // 'crew' n'a aucun item ; et en Simple, une catégorie 100 % avancée non plus.
  const onlyAdvanced = [{ id: 'x', category: 'crew' as Cat, advanced: true }] as const;
  assertEquals(buildFaqOutline(onlyAdvanced, ORDER, false).length, 0);
  assertEquals(buildFaqOutline(onlyAdvanced, ORDER, true).length, 1);
});

Deno.test('l’écran s’ouvre tout replié — le sommaire, rien d’autre', () => {
  assertEquals(ACCORDION_ALL_CLOSED, { group: null, item: null });
});

Deno.test('ouvrir un 2ᵉ groupe ferme le 1ᵉʳ ET sa question (1 décision à la fois)', () => {
  const opened = toggleItem(toggleGroup(ACCORDION_ALL_CLOSED, 'zones'), 'a');
  assertEquals(opened, { group: 'zones', item: 'a' });
  assertEquals(toggleGroup(opened, 'defense'), { group: 'defense', item: null });
});

Deno.test('refermer un groupe referme la question qu’il contenait', () => {
  const opened = toggleItem(toggleGroup(ACCORDION_ALL_CLOSED, 'zones'), 'a');
  // Sans cette remise à zéro, 'a' ressortirait dépliée au prochain tap sur zones.
  assertEquals(toggleGroup(opened, 'zones'), ACCORDION_ALL_CLOSED);
});

Deno.test('taper deux fois la même question la referme, le groupe reste ouvert', () => {
  const opened = toggleItem(toggleGroup(ACCORDION_ALL_CLOSED, 'zones'), 'a');
  assertEquals(toggleItem(opened, 'a'), { group: 'zones', item: null });
  assertEquals(toggleItem(opened, 'b'), { group: 'zones', item: 'b' });
});

Deno.test('bascule Avancé → Simple : la question technique ouverte se referme', () => {
  const opened = toggleItem(toggleGroup(ACCORDION_ALL_CLOSED, 'defense'), 'c');
  const simple = buildFaqOutline(ITEMS, ORDER, false);
  // Le groupe existe encore (il lui reste 'd'), mais 'c' n'est plus affichée.
  assertEquals(resolveAccordion(opened, simple), { group: 'defense', item: null });
  // …et en Avancé elle reste ouverte : on ne referme que ce qui a disparu.
  assertEquals(resolveAccordion(opened, buildFaqOutline(ITEMS, ORDER, true)), {
    group: 'defense',
    item: 'c',
  });
});

Deno.test('un groupe entièrement disparu referme TOUT', () => {
  const opened = toggleItem(toggleGroup(ACCORDION_ALL_CLOSED, 'crew'), 'x');
  assertEquals(resolveAccordion(opened, buildFaqOutline(ITEMS, ORDER, false)), ACCORDION_ALL_CLOSED);
});

Deno.test('resolveAccordion accepte des groupes hétérogènes (Saisons, post-run)', () => {
  const mixed = [
    { id: 'season', items: [{ id: 'season_how' }, { id: 'season_end' }] },
    { id: 'postrun', items: [{ id: 'post_zones' }] },
  ];
  const opened = { group: 'season', item: 'season_end' };
  assertEquals(resolveAccordion(opened, mixed), opened);
  assertEquals(resolveAccordion({ group: 'season', item: 'post_zones' }, mixed), {
    group: 'season',
    item: null,
  });
});
