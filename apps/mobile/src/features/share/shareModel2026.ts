/** Export facts, independent of React, source records or commercial rights. */
export const SHARE_FAMILIES_2026 = ['map', 'photo', 'sticker', 'film'] as const;
export type ShareFamily2026 = typeof SHARE_FAMILIES_2026[number];
export const SHARE_EXPORT_FORMATS_2026 = {
  story: { width: 1080, height: 1920 },
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
} as const;
export type ShareFormat2026 = keyof typeof SHARE_EXPORT_FORMATS_2026;
export type ShareTheme2026 = 'dark' | 'light';

interface ShareFactsInput2026 {
  card: { activity: 'run' | 'bike'; distanceKm: string; clockLabel: string; paceLabel: string };
  territory2026?: {
    status: 'private' | 'pending' | 'scheduled' | 'published' | 'no_loop';
    newTerrainM2: number | null;
    loopAreaM2: number;
  };
}

export function buildShareFacts2026(input: ShareFactsInput2026, locale: 'fr' | 'en') {
  const fr = locale === 'fr';
  const territory = input.territory2026;
  const net = territory && (territory.status === 'published' || territory.status === 'scheduled') &&
    territory.newTerrainM2 !== null && Number.isFinite(territory.newTerrainM2) && territory.newTerrainM2 > 0
    ? territory.newTerrainM2 : null;
  const number = new Intl.NumberFormat(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: net !== null && net >= 10_000 ? 2 : 0 });
  const gain = net === null ? null : net >= 10_000 ? `${number.format(net / 1_000_000)} km²` : `${number.format(net)} m²`;
  // Derive the sport-specific rate from distance and elapsed time. The historical
  // paceLabel field is s/km for both sports and must never be relabelled km/h.
  const km = Number(input.card.distanceKm.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
  const timeParts = input.card.clockLabel.split(':').map(Number);
  const validClock = /^\d+(?::[0-5]\d){1,2}$/.test(input.card.clockLabel);
  const seconds = validClock ? timeParts.reduce((total, part) => total * 60 + part, 0) : 0;
  const validRate = Number.isFinite(km) && km > 0 && seconds > 0;
  const bike = input.card.activity === 'bike';
  const pace = validRate ? Math.round(seconds / km) : 0;
  const rate = !validRate ? null : bike
    ? `${new Intl.NumberFormat(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }).format(km * 3600 / seconds)} km/h`
    : `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')} /km`;
  const rateLabel = bike ? (fr ? 'VITESSE' : 'SPEED') : (fr ? 'ALLURE' : 'PACE');
  const sport = input.card.activity === 'bike' ? (fr ? 'SORTIE VÉLO' : 'BIKE RIDE') : (fr ? 'COURSE À PIED' : 'RUN');
  const headline = fr ? 'Un peu dehors.\nBeaucoup pour soi.' : 'Time outside.\nTime for yourself.';
  const distance = input.card.distanceKm ? `${input.card.distanceKm} km` : null;
  const duration = input.card.clockLabel || null;
  const metrics = [distance, duration, rate].filter((value): value is string => value !== null);
  const gainLabel = gain === null ? null : `+${gain} ${fr ? 'de terrain' : 'of terrain'}`;
  return {
    sport, headline, distance, duration, rate, rateLabel, gain, gainLabel,
    caption: [sport, ...metrics, gainLabel, 'GRYD'].filter(Boolean).join(' · '),
  };
}

/** No MP4 is promised while the native encoder is absent. */
export function shareFamilyCapability2026(family: ShareFamily2026, photoSelected: boolean, filmAvailable = false) {
  if (family === 'film' && !filmAvailable) return 'film_not_available' as const;
  if (family === 'photo' && !photoSelected) return 'choose_photo' as const;
  return 'ready' as const;
}

export function exportLayout2026(format: ShareFormat2026, pixelRatio: number) {
  const dimensions = SHARE_EXPORT_FORMATS_2026[format];
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  return { widthPt: dimensions.width / density, heightPt: dimensions.height / density, ...dimensions };
}
