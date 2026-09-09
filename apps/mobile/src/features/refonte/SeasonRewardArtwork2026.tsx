import { View } from 'react-native';
import type { RewardVariant } from '../../ui/gryd';
import { RewardEmblem } from '../../ui/gryd';
import { StudioObjectArtwork2026 } from '../share/StudioObjectArtwork2026';
import type { StudioObject2026 } from '../share/studioObjects2026';
import { SeasonEmblemArtwork2026, SeasonFrameArtwork2026, SeasonTitleArtwork2026 } from './SeasonalIdentity2026';

export function rewardVariant2026(id: string): RewardVariant {
  const variants: Record<string, RewardVariant> = {
    first_trace: 'origin', line_frame: 'orbit', chalk: 'stride', atlas: 'horizon', contour_animation: 'contour', ridge_merit: 'summit', cartographer: 'prism', horizon: 'horizon',
    season_poster: 'origin', participation_badge: 'relay', trace_pattern: 'stride', profile_frame: 'orbit', sticker: 'prism', title: 'summit', photo_composition: 'contour', personal_emblem: 'relay', short_animation: 'stride', recap: 'prism', final_poster: 'horizon', season_memory: 'summit',
  };
  return variants[id] ?? 'origin';
}

/** Canonical season-object renderer for catalogue tiles, details and progression. */
export function SeasonRewardArtwork2026({ object, rewardId, tier, size, state, locale }: {
  object: StudioObject2026;
  rewardId: string;
  tier: number;
  size: number;
  state: 'preview' | 'locked' | 'earned';
  locale: 'fr' | 'en';
}) {
  const opacity = state === 'locked' ? .5 : 1;
  if (rewardId === 'participation_badge') {
    return <RewardEmblem variant={rewardVariant2026(rewardId)} size={size} level={tier} serial={String(tier).padStart(2, '0')} tone="neutral" state={state} />;
  }
  if (rewardId === 'personal_emblem') {
    return <View style={{ opacity }}><SeasonEmblemArtwork2026 size={size} premium={object.premium} tier={tier} tone="light" state={state} /></View>;
  }
  if (rewardId === 'profile_frame') {
    return <View style={{ opacity }}><SeasonFrameArtwork2026 size={size} premium={object.premium} tone="light" /></View>;
  }
  if (rewardId === 'title') {
    return <View style={{ opacity }}><SeasonTitleArtwork2026 label={object.edition} premium={object.premium} tone="light" size={size} /></View>;
  }
  return <View style={{ width: size, height: size, overflow: 'hidden', borderRadius: 3, opacity }}>
    <StudioObjectArtwork2026 theme="light" object={object} facts={null} width={size} locale={locale} />
  </View>;
}
