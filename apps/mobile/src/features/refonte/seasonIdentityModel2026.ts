export const SEASON_IDENTITY_RENDERS_2026 = ['profile_frame', 'title', 'personal_emblem'] as const;
export function canRenderSeasonIdentity2026(rewardId: string): boolean {
  return SEASON_IDENTITY_RENDERS_2026.some(id => id === rewardId);
}
export function equippedSeasonIdentity2026<T extends { rewardId: string; equipped: boolean }>(rewards: readonly T[]) {
  const find = (id: string) => rewards.find(reward => reward.rewardId === id && reward.equipped) ?? null;
  return { frame: find('profile_frame'), title: find('title'), emblem: find('personal_emblem') };
}
