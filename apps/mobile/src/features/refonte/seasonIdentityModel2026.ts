export const SEASON_IDENTITY_RENDERS_2026 = ['profile_frame', 'title', 'personal_emblem'] as const;
export function canRenderSeasonIdentity2026(rewardId: string): boolean {
  return SEASON_IDENTITY_RENDERS_2026.some(id => id === rewardId);
}
export function equippedSeasonIdentity2026<T extends { rewardId: string; equipped: boolean }>(rewards: readonly T[]) {
  const find = (id: string) => rewards.find(reward => reward.rewardId === id && reward.equipped) ?? null;
  return { frame: find('profile_frame'), title: find('title'), emblem: find('personal_emblem') };
}
/** §7.2 — les objets de niveau qui occupent un emplacement du profil. Les deux
 * cadres (Ligne L3, Ligne de crête L20) partagent l'emplacement `frame` : c'est
 * 0144 qui garantit qu'un seul y tient, la clé primaire (user_id,slot). */
export const LEVEL_IDENTITY_SLOTS_2026: Readonly<Record<string, 'frame' | 'title'>> = {
  line_frame: 'frame', ridge_merit: 'frame', cartographer: 'title',
};
export function canRenderLevelIdentity2026(rewardId: string): boolean {
  return Object.hasOwn(LEVEL_IDENTITY_SLOTS_2026, rewardId);
}
export function equippedLevelIdentity2026<T extends { rewardId: string; equipped: boolean }>(rewards: readonly T[]) {
  const equipped = (slot: 'frame' | 'title') =>
    rewards.find(reward => reward.equipped && LEVEL_IDENTITY_SLOTS_2026[reward.rewardId] === slot) ?? null;
  return { frame: equipped('frame'), title: equipped('title') };
}
