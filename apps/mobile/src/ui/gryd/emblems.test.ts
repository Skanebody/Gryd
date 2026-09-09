import { BADGES } from '@klaim/shared';
import {
  BADGE_FAMILY_EMBLEM,
  EMBLEM_ARTWORK,
  rewardEmblemMark,
  rewardVariantForBadgeFamily,
} from './emblems.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('chaque badge publié résout un artwork GRYD complet', () => {
  for (const badge of BADGES) {
    assert(
      Object.hasOwn(BADGE_FAMILY_EMBLEM, badge.family),
      `${badge.key}: famille visuelle absente (${badge.family})`,
    );
    for (const concealed of [false, true]) {
      const variant = rewardVariantForBadgeFamily(badge.family, concealed);
      const artwork = EMBLEM_ARTWORK[variant];
      assert(artwork !== undefined, `${badge.key}: artwork absent (${variant})`);
      assert(artwork.edition.length > 0, `${badge.key}: numéro d’édition absent`);
      assert(artwork.route.length > 0, `${badge.key}: gravure absente`);
    }
  }
});

Deno.test('une famille serveur inconnue garde un emblème sûr', () => {
  const variant = rewardVariantForBadgeFamily('future_family');
  assert(variant === 'origin', 'le repli doit rester Origin');
  assert(EMBLEM_ARTWORK[variant] !== undefined, 'le repli doit avoir un artwork');
});

Deno.test('un emblème sans niveau ne fabrique pas un niveau 01', () => {
  assert(rewardEmblemMark('origin') === 'PR', 'le monogramme de famille doit remplacer le faux niveau');
  assert(rewardEmblemMark('origin', 1) === '1', 'un vrai niveau doit rester visible');
  assert(rewardEmblemMark('origin', undefined, 'S-07') === '07', 'un numéro de série explicite doit rester visible');
});
