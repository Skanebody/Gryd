import { assertEquals } from 'jsr:@std/assert@^1';
import { canRenderSeasonIdentity2026, equippedSeasonIdentity2026 } from './seasonIdentityModel2026.ts';
const reward = (rewardId: string, equipped: boolean, variant: 'standard' | 'premium' = 'standard') => ({ id: `s:${rewardId}:${variant}`, collectionId: 's', rewardId, tier: 4, label: rewardId, earnedAt: '2026-09-09T12:00:00Z', variant, equipped });
Deno.test('season identity: ownership alone never equips an object', () => {
  assertEquals(equippedSeasonIdentity2026([reward('profile_frame', false)]), { frame: null, title: null, emblem: null });
});
Deno.test('season identity: only implemented frame/title/emblem renders can be equipped', () => {
  for (const id of ['profile_frame', 'title', 'personal_emblem']) assertEquals(canRenderSeasonIdentity2026(id), true);
  for (const id of ['season_poster', 'recap', 'short_animation', 'unknown']) assertEquals(canRenderSeasonIdentity2026(id), false);
});
Deno.test('season identity: earned premium variants remain rendered without a current subscription input', () => {
  const frame = reward('profile_frame', true, 'premium');
  const emblem = reward('personal_emblem', true);
  const identity = equippedSeasonIdentity2026([frame, reward('title', false), emblem, reward('recap', true)]);
  assertEquals(identity.frame, frame); assertEquals(identity.title, null); assertEquals(identity.emblem, emblem);
});
