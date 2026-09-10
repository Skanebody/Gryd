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
  /**
   * QUAND. Horodatage ISO du DÉPART, tel que l'archive locale l'a écrit
   * (`LocalActivity2026.startedAt`). Absent ou illisible ⇒ aucune date sur
   * l'affiche : une sortie sans date connue n'en reçoit pas une inventée.
   * Seuls le JOUR, le MOIS et l'ANNÉE en sortent — jamais l'heure. Publier
   * « 07:12 » à côté d'un tracé, c'est publier une habitude, et une habitude se
   * suit aussi bien qu'une adresse.
   */
  startedAt?: string | null;
  /**
   * OÙ, AU GROS GRAIN. Nom de commune, et UNIQUEMENT s'il est déjà connu de
   * l'app sans nouvel appel : ce champ ne doit jamais déclencher un géocodage
   * inverse du point de départ. Aucun appelant ne le remplit au 10/09/2026 (la
   * commune n'est pas attachée à une sortie) — voir docs/product/
   * GRYD_PARTAGE_2026_09.md. Le champ existe pour que le jour où elle l'est,
   * ce soit une ligne d'appelant et pas une refonte.
   */
  place?: string | null;
  /**
   * DÉNIVELÉ POSITIF (m), MESURÉ — jamais estimé, jamais dérivé de la distance.
   * Il vient de `elevationFrom` (features/journal/metrics.ts), qui rend
   * `available: false` tant que la trace ne porte pas d'altitude et applique
   * une hystérésis anti-bruit : le GPS d'un téléphone oscille de plusieurs
   * mètres à l'arrêt, et sans ce seuil une sortie plate afficherait un relief
   * imaginaire. `RunPoint.alt` n'existe que depuis le 10/09/2026 (commit
   * 43ea6dc) : les sorties ARCHIVÉES avant cette date n'en portent pas, et leur
   * affiche n'a donc pas de ligne « dénivelé » — c'est le comportement voulu,
   * un zéro y ferait passer une côte pour du plat.
   */
  elevationGainM?: number | null;
  territory2026?: {
    /**
     * Le vocabulaire du serveur s'enrichit (`rejected` est arrivé avec
     * l'admission de capture). Ce type reste donc OUVERT : seuls `published` et
     * `scheduled` produisent un gain ci-dessous, et tout le reste — connu ou
     * non — n'en produit aucun. Fermer l'union ferait échouer la compilation à
     * chaque mot nouveau, sans jamais rendre une carte de partage plus vraie.
     */
    status: 'private' | 'pending' | 'scheduled' | 'published' | 'no_loop' | 'rejected' | (string & {});
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
  // JOUR / MOIS / ANNÉE, sans heure (voir `startedAt`). Une date illisible ne
  // produit rien : `Date.parse` d'une chaîne vide vaut NaN, et on s'arrête là.
  const parsed = input.startedAt ? Date.parse(input.startedAt) : NaN;
  const date = Number.isFinite(parsed)
    ? new Intl.DateTimeFormat(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(parsed))
    : null;
  const place = input.place?.trim() || null;
  // Le dénivelé n'est une ligne que s'il est MESURÉ et non nul. Un `0` ici
  // signifie « la trace ne monte pas d'après une altitude qu'on n'a pas » : on
  // se tait plutôt que d'annoncer une sortie plate qu'on n'a pas mesurée.
  const climb = input.elevationGainM;
  const elevation = typeof climb === 'number' && Number.isFinite(climb) && climb > 0
    ? `${new Intl.NumberFormat(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }).format(climb)} m`
    : null;
  return {
    sport, headline, distance, duration, rate, rateLabel, gain, gainLabel, date, place, elevation,
    /** Ligne discrète de contexte : « Rouen · 10 sept. 2026 ». Vide = absente. */
    context: [place, date].filter((value): value is string => value !== null).join(' · ') || null,
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
