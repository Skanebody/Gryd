/** Original graphic editions. Numbers identify drawings, never athletic results or entitlements. */
export const REWARD_VARIANTS = ['origin', 'orbit', 'contour', 'relay', 'summit', 'prism', 'stride', 'horizon'] as const;
export type RewardVariant = typeof REWARD_VARIANTS[number];
export interface EmblemArtwork {
  label: string;
  edition: string;
  paper: 'dark' | 'light';
  /** Main engraving, optically strengthened in compact presentations. */
  route: string;
  /** Fine companion engraving, omitted below 96 px. */
  detail: string;
  terminal: readonly [number, number];
}

/** Exhaustive visual family mapping for every family published by the badge catalogue. */
export const BADGE_FAMILY_EMBLEM = {
  onboarding: 'origin',
  distance: 'stride',
  territoire: 'contour',
  attaque: 'orbit',
  defense: 'prism',
  exploration: 'horizon',
  routes: 'contour',
  crew: 'relay',
  performance: 'summit',
  healthy: 'stride',
  saison: 'orbit',
  verified: 'origin',
  secret: 'prism',
} as const satisfies Readonly<Record<string, RewardVariant>>;

/** Unknown server values degrade to Origin; a catalogue ID can never crash the album. */
export function rewardVariantForBadgeFamily(family: string, concealed = false): RewardVariant {
  if (concealed) return 'origin';
  return Object.hasOwn(BADGE_FAMILY_EMBLEM, family)
    ? BADGE_FAMILY_EMBLEM[family as keyof typeof BADGE_FAMILY_EMBLEM]
    : 'origin';
}

/** A family of running labels: route, loop, contour, relay, relief, block, stride and horizon. */
export const EMBLEM_ARTWORK: Record<RewardVariant, EmblemArtwork> = {
  origin: {
    label: 'Première trace', edition: '01', paper: 'dark',
    route: 'M22 78h23c12 0 15-24 32-24h32c19 0 29 11 29 26s-12 23-31 23H86c-12 0-20-8-20-17 0-10 8-17 20-17h24',
    detail: 'M22 85h23c14 0 18-24 32-24h32c14 0 22 8 22 19s-9 16-24 16H86c-7 0-13-4-13-10s5-10 13-10h24',
    terminal: [110, 69],
  },
  orbit: {
    label: 'Boucle', edition: '02', paper: 'dark',
    route: 'M122 64c-8-18-34-25-59-16-26 9-42 32-32 48 9 16 38 16 63 4 15-7 25-16 29-26H88',
    detail: 'M116 59c-12-12-30-15-51-7-23 8-36 27-27 39 8 12 30 12 53 1 8-4 16-10 21-15',
    terminal: [88, 74],
  },
  contour: {
    label: 'Détour', edition: '03', paper: 'light',
    route: 'M41 108C12 84 35 46 68 42c31-4 58 6 60 23 3 18-24 16-39 32-10 11-8 23-23 24-10 0-18-6-25-13Z M52 99c-16-15-1-37 20-39 19-2 36 2 35 11-1 8-17 9-27 19-7 8-9 17-17 16-4 0-8-3-11-7Z',
    detail: 'M63 93c-7-5 0-16 12-18 7-1 12-1 12 2-1 4-8 5-12 10-4 5-8 9-12 6Z',
    terminal: [69, 42],
  },
  relay: {
    label: 'Ensemble', edition: '04', paper: 'dark',
    route: 'M21 79h27l17-28h22l24 44h27M21 92h33l17-28h8l24 44h35',
    detail: 'M21 85h30l17-28h15l24 44h31',
    terminal: [21, 79],
  },
  summit: {
    label: 'Relief', edition: '05', paper: 'light',
    route: 'M23 111 45 83l17 12 26-48 24 30 25-18M23 120l24-28 17 12 26-46 22 28 25-18',
    detail: 'M27 115 46 88l17 12 26-48 23 29 25-18',
    terminal: [88, 47],
  },
  prism: {
    label: 'Quartier', edition: '06', paper: 'dark',
    route: 'M27 51h45v24H49v31h35V51h47v56h-24V87H72',
    detail: 'M34 58h31v10H42v45h49V58h33v42h-10V80H65',
    terminal: [72, 87],
  },
  stride: {
    label: 'Foulée', edition: '07', paper: 'light',
    route: 'M26 104 71 49M48 111l45-55M72 118l45-55M96 119l38-47',
    detail: 'M29 110 74 55M51 117l45-55M75 124l45-55M99 125l38-47',
    terminal: [71, 49],
  },
  horizon: {
    label: 'Horizon', edition: '08', paper: 'dark',
    route: 'M23 94c22 0 25-40 48-40s24 40 48 40h19M23 109h115',
    detail: 'M23 100c22 0 26-38 48-38s25 38 48 38h19M23 118h115',
    terminal: [71, 54],
  },
};

/** Uses a real rank/serial when supplied; generic medals carry their family monogram. */
export function rewardEmblemMark(variant: RewardVariant, level?: number, serial?: string): string {
  if (level !== undefined) return String(level);
  const explicitSerial = serial?.replace(/[^A-Za-z0-9]/g, '').slice(-2).toUpperCase();
  return explicitSerial || EMBLEM_ARTWORK[variant].label.slice(0, 2).toUpperCase();
}
