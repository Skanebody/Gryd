import type { ImageSourcePropType } from 'react-native';

/** Original GRYD photographs supplied by the founder, reused without recolouring. */
export const brandImagery = {
  movement: {
    source: require('../../../assets/onboarding/e01-crew.jpg') as ImageSourcePropType,
    fr: 'Visuel GRYD : coureurs et cycliste en ville, détails chartreuse',
    en: 'GRYD brand image: urban runners and cyclist with chartreuse details',
  },
  community: {
    source: require('../../../assets/auth/sign-in-crew.jpg') as ImageSourcePropType,
    fr: 'Visuel GRYD : un groupe après une sortie, vêtements noirs et détails chartreuse',
    en: 'GRYD brand image: a group after an outing, black kit and chartreuse details',
  },
} as const;
